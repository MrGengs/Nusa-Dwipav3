/* global NAF */
import { createStore } from 'solid-js/store';

export interface Presence {
  id: string;
  muted: boolean;
  name: string;
  squadId?: string | null;
}

export const [presences, setPresences] = createStore<Presence[]>([]);

export const getNameFromClientId = (clientId: string) => {
  const p = presences.find((p) => p.id === clientId);
  if (!p) {
    return 'Unknown';
  }
  return p.name;
};

document.body.addEventListener('clientDisconnected', (evt) => {
  // @ts-ignore
  const clientId = evt.detail.clientId;
  setPresences(presences.filter((p) => p.id !== clientId));
});

document.addEventListener('DOMContentLoaded', () => {
  const sceneEl = document.querySelector('a-scene');
  if (!sceneEl) return;

  // @ts-ignore
  const listener = (evt) => {
    const { el, data, oldData } = evt.detail;
    
    // Check if el and components exist
    if (!el || !el.components || !el.components['player-info']) {
      console.warn('[Presence] Invalid element or missing player-info component', el);
      return;
    }
    
    const clientId = el.components?.networked?.data?.owner;
    
    // Use a unique ID for each player: clientId or 'local' for local player
    const playerId = clientId || 'local';
    
    // @ts-ignore
    if (!el.components['player-info'].presenceAdded) {
      // Add this player to presences
      const existingIndex = presences.findIndex((p) => p.id === playerId);
      if (existingIndex === -1) {
        setPresences([
          ...presences,
          { id: playerId, muted: data.muted, name: data.name, squadId: data.squadId || null },
        ]);
      }
      // @ts-ignore
      el.components['player-info'].presenceAdded = true;
    } else if (oldData) {
      const index = presences.findIndex((p) => p.id === playerId);
      if (index !== -1) {
        const updatedPresences = [...presences];
        let changed = false;
        if (oldData.muted !== data.muted) {
          updatedPresences[index] = { ...updatedPresences[index], muted: data.muted };
          changed = true;
        }

        if (oldData.name !== data.name) {
          updatedPresences[index] = { ...updatedPresences[index], name: data.name };
          changed = true;
        }

        if (oldData.squadId !== data.squadId) {
          updatedPresences[index] = { ...updatedPresences[index], squadId: data.squadId || null };
          changed = true;
        }

        if (changed) {
          setPresences(updatedPresences);
        }
      }
    }
  };

  sceneEl.addEventListener('player-info-updated', listener);

  const me = document.querySelector('[player-info]');
  const listenerConnected = async () => {
    // Clear the store
    setPresences([]);
    
    if (!me) {
      console.warn('[Presence] No player-info element found');
      return;
    }
    
    // @ts-ignore
    if (me.components && me.components['player-info']) {
      // @ts-ignore
      me.components['player-info'].presenceAdded = false;
    }
    
    await NAF.utils.getNetworkedEntity(me); // to be sure me.components?.networked?.data?.owner is set
    
    // @ts-ignore
    if (me.components && me.components['player-info']) {
      // @ts-ignore
      listener({ detail: { el: me, data: me.components['player-info'].data }, oldData: {} });
    }
  };
  document.body.addEventListener('connected', listenerConnected);
});

export const getClientsInSquad = (squadId: string | null) => {
  if (!squadId) return [];
  return presences
    .filter((presence) => presence.squadId === squadId)
    .map((presence) => {
      if (presence.id === 'local') {
        return NAF.clientId;
      }
      return presence.id;
    })
    .filter((clientId): clientId is string => Boolean(clientId));
};
