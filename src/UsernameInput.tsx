/* global THREE */
import { Component, Show, createEffect, createSignal, onMount } from 'solid-js';

const randomColor = () => {
  // @ts-ignore
  return '#' + new THREE.Color(Math.random(), Math.random(), Math.random()).getHexString();
};

export const [username, setUsername] = createSignal('user-' + Math.round(Math.random() * 10000));
export const [color, setColor] = createSignal(randomColor());

const [domContentLoaded, setDomContentLoaded] = createSignal(false);

document.addEventListener('DOMContentLoaded', () => {
  setDomContentLoaded(true);
});

interface Props {
  enableColorPicker?: boolean;
  entity?: string;
}

export const UsernameInput: Component<Props> = (props) => {
  onMount(() => {
    // Check if user is authenticated (has username from auth system)
    const authUsername = localStorage.getItem('userUsername');
    if (authUsername) {
      // User is authenticated, use their username from auth system
      setUsername(authUsername);
      console.log('[Auth] Using authenticated username:', authUsername);
    } else {
      // Fallback to old system for non-authenticated users
      const savedName = localStorage.getItem('username');
      if (savedName) {
        setUsername(savedName);
      }
    }

    const savedColor = localStorage.getItem('color');
    if (savedColor) {
      setColor(savedColor);
    }
  });

  createEffect(() => {
    localStorage.setItem('username', username());
    localStorage.setItem('color', color());
    if (!domContentLoaded()) return;
    
    // Always use authenticated username if available, otherwise use the input username
    const authUsername = localStorage.getItem('userUsername');
    const displayName = authUsername || username();
    
    console.log('[UsernameInput] Setting display name:', displayName);
    
    const info = {
      name: displayName,
      color: color(),
    };
    // @ts-ignore
    const entity = document.querySelector(props.entity ?? '#player');
    if (entity) {
      // @ts-ignore
      entity.setAttribute('player-info', info);
      console.log('[UsernameInput] Updated player-info with name:', displayName);
    } else {
      console.warn('[UsernameInput] Entity not found:', props.entity ?? '#player');
    }
  });

  return (
    <div class="flex flex-row items-center">
      <input
        id="username"
        type="text"
        class="form-input h-7 px-1"
        value={username()}
        oninput={(e: any) => {
          setUsername(e.target.value);
        }}
      />
      <Show when={props.enableColorPicker ?? true}>
        <input
          id="avatarcolor"
          type="color"
          title="Pick a color for your avatar"
          class="h-7 w-7"
          value={color()}
          onchange={(e: any) => {
            setColor(e.target.value);
          }}
        />
      </Show>
    </div>
  );
};
