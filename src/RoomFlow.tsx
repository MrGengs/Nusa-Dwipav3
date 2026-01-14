import { Component, Show, For, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { experiencePhase, experienceStarted, setExperiencePhase, setExperienceStarted } from './gameSignals';
import { avatarSrc } from './avatarSignals';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  movePlayerToSquad,
  startGameCountdown,
  markPlayerLobbyReady,
  subscribeToRoom,
  updateSquadName,
  beginGame,
  recordCollectible,
  recordQuizResult,
  markSquadCompleted,
  resetRoomToLobby,
  updateGameTime,
  type Room,
  type RoomPlayer,
  type RoomSquad,
  type LeaderboardEntry,
} from './roomService';
import { waitForAuth } from './firebaseService';

// Augment global Window for safely accessed helpers injected elsewhere
declare global {
  interface Window {
    enterLobbyArea?: () => void;
    exitLobbyArea?: () => void;
    showGameEnvironment?: () => void;
    startExperience?: () => void;
    respawnToCheckpoint?: () => void;
    leaveRoomAndReturnToSelection?: () => void;
    updateGameTime?: typeof updateGameTime;
  }
}

type LobbyMode = 'options' | 'create' | 'join';

type Feedback = {
  type: 'success' | 'error' | 'info';
  message: string;
};

const initialSquadNames: [string, string, string] = ['Squad Merdeka', 'Squad Bahari', 'Squad Cendrawasih'];

const formatDuration = (seconds?: number) => {
  if (!seconds && seconds !== 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const calculateSlotUsage = (squad: RoomSquad | undefined) => {
  if (!squad) return { used: 0, capacity: 0 };
  const used = squad.members ? Object.keys(squad.members).length : 0;
  return { used, capacity: squad.capacity };
};

const dispatchSquadChange = (squadId: string | null) => {
  window.dispatchEvent(
    new CustomEvent('room:squad-changed', {
      detail: { squadId },
    }),
  );
};

export const RoomFlow: Component = () => {
  const [mode, setMode] = createSignal<LobbyMode>('options');
  const [feedback, setFeedback] = createSignal<Feedback | null>(null);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [currentRoomCode, setCurrentRoomCode] = createSignal<string>('');
  const [room, setRoom] = createSignal<Room | null>(null);
  const [countdownRemainingMs, setCountdownRemainingMs] = createSignal<number>(0);
  const [countdownTimerId, setCountdownTimerId] = createSignal<number | null>(null);
  const [hostCountdownTimeout, setHostCountdownTimeout] = createSignal<number | null>(null);

  const [createRoomName, setCreateRoomName] = createSignal('Petualangan Nusantara');
  const [createSquadNames, setCreateSquadNames] = createSignal<[string, string, string]>(initialSquadNames);
  const [joinCode, setJoinCode] = createSignal('');

  const userId = () => localStorage.getItem('userId') ?? '';
  const userName = () => localStorage.getItem('userUsername') ?? 'Explorer';

  const userPlayer = createMemo<RoomPlayer | undefined>(() => {
    const current = room();
    if (!current) return undefined;
    if (!userId()) return undefined;
    return current.players?.[userId()];
  });

  const userSquad = createMemo<RoomSquad | undefined>(() => {
    const current = room();
    const player = userPlayer();
    if (!current || !player) return undefined;
    return current.squads?.[player.squadId];
  });

  const isHost = createMemo(() => !!userPlayer()?.isHost);

  const leaderboard = createMemo<LeaderboardEntry[] | undefined>(() => room()?.leaderboard);

  const sortedSquads = createMemo(() => {
    const current = room();
    if (!current) return [];
    const squadsObj = current.squads || {};
    return ['squad1', 'squad2', 'squad3']
      .map((id) => squadsObj[id])
      .filter((squad): squad is RoomSquad => Boolean(squad));
  });

  let lastLobbySignature: string | null = null;
  let lastAnnouncedSquadId: string | null = null;
  let isInLobbyPhase = false;

  const announceSquadContext = (squadId: string | null) => {
    if (typeof window === 'undefined') return;
    (window as any).__activeSquadId = squadId;
    window.dispatchEvent(new CustomEvent('nusa:squad-context-changed', { detail: { squadId } }));
  };

  const patchPlayerInfo = (partial: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    const rig = document.getElementById('rig');
    if (rig) {
      const current = (rig as any).getAttribute?.('player-info') || {};
      (rig as any).setAttribute?.('player-info', { ...current, ...partial });
    }
    const playerCamera = document.getElementById('player');
    if (playerCamera) {
      const current = (playerCamera as any).getAttribute?.('player-info') || {};
      (playerCamera as any).setAttribute?.('player-info', { ...current, ...partial });
    }
  };

  const resetFeedback = () => setFeedback(null);

  const clearCountdownTimer = () => {
    const timer = countdownTimerId();
    if (timer) {
      clearInterval(timer);
      setCountdownTimerId(null);
    }
  };

  const clearHostTimeout = () => {
    const timeoutId = hostCountdownTimeout();
    if (timeoutId) {
      clearTimeout(timeoutId);
      setHostCountdownTimeout(null);
    }
  };

  const cleanupRoomSession = () => {
    delete (window as any).roomSession;
    setCurrentRoomCode('');
    if (!experienceStarted()) {
      setExperiencePhase('room-selection');
    }
    dispatchSquadChange(null);
    lastNotifiedSquadId = null;
    lastAnnouncedSquadId = null;
    announceSquadContext(null);
    lastLobbySignature = null;
    if (isInLobbyPhase) {
      window.exitLobbyArea?.();
      isInLobbyPhase = false;
    }
  };

  let lastNotifiedSquadId: string | null = null;

  const cameFromLobby = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('fromLobby') === 'true';
    } catch {}
    return false;
  };

  // Guard untuk mencegah infinite loop di updateRoomSession
  let lastUpdateRoomSessionKey = '';
  
  const updateRoomSession = (roomData: Room | null) => {
    // Guard: skip jika sudah dipanggil dengan data yang sama
    const updateKey = roomData ? `${roomData.roomCode}:${roomData.status}:${roomData.lastUpdatedAt || 0}` : 'null';
    if (updateKey === lastUpdateRoomSessionKey) {
      return; // Skip jika sudah dipanggil dengan data yang sama
    }
    lastUpdateRoomSessionKey = updateKey;
    
    const currentUserId = userId();
    const player = userPlayer();
    
    if (!roomData) {
      cleanupRoomSession();
      return;
    }
    if (!player) {
      // Don't cleanup immediately - might be a timing issue
      // Instead, try to join the room if we're the host
      if (roomData.hostId === currentUserId) {
        // Continue to show room - host should be added automatically
      } else {
        cleanupRoomSession();
        setRoom(null);
        setMode('options');
        setCurrentRoomCode('');
        localStorage.removeItem('activeRoomCode');
        setFeedback({
          type: 'error',
          message: 'Anda dikeluarkan dari ruangan karena tidak hadir di lobby.',
        });
        return;
      }
    }

    // Only set roomSession if player exists
    if (player) {
      (window as any).roomSession = {
        roomCode: roomData.roomCode,
        squadId: player.squadId,
        userId: player.userId,
        playerName: player.name,
        roomStartedAt: roomData.startedAt || null, // Simpan waktu mulai game
        recordCollectible: async (itemId: string, points: number) => {
          try {
            await recordCollectible({
              roomCode: roomData.roomCode,
              squadId: player.squadId,
              playerId: player.userId,
              playerName: player.name,
              itemId,
              points,
              avatarSrc: avatarSrc(),
            });
          } catch (error) {
            console.error('[RoomFlow] recordCollectible failed', error);
          }
        },
        recordQuiz: async (guardId: string, questionId: string, isCorrect: boolean, points: number) => {
          try {
            await recordQuizResult({
              roomCode: roomData.roomCode,
              squadId: player.squadId,
              playerId: player.userId,
              playerName: player.name,
              guardId,
              questionId,
              isCorrect,
              points,
              avatarSrc: avatarSrc(),
            });
          } catch (error) {
            console.error('[RoomFlow] recordQuiz failed', error);
          }
        },
        markSquadCompleted: async (durationSeconds: number) => {
          try {
            await markSquadCompleted({
              roomCode: roomData.roomCode,
              squadId: player.squadId,
              durationSeconds,
            });
          } catch (error) {
            console.error('[RoomFlow] markSquadCompleted failed', error);
          }
        },
      };

      const newSquadId = player.squadId ?? null;
      if (newSquadId !== lastNotifiedSquadId) {
        lastNotifiedSquadId = newSquadId;
        dispatchSquadChange(newSquadId);
      }
    } else {
      // Player not found but we're host - room will still be shown
      console.log('[RoomFlow] ℹ️ Player not found but continuing (host case)');
    }
  };

  const handleLobbySubscription = (code: string) => {
    console.log('[RoomFlow] 🔍 Subscribing to room:', code);
    
    // Cleanup previous subscription if exists
    const existingUnsubscribe = (window as any).__roomUnsubscribe;
    if (existingUnsubscribe) {
      console.log('[RoomFlow] 🧹 Cleaning up previous subscription');
      existingUnsubscribe();
    }
    
    const unsubscribe = subscribeToRoom(code, (roomData) => {
      console.log('[RoomFlow] 📥 Room data received:', roomData);
      console.log('[RoomFlow] 📥 Room data keys:', roomData ? Object.keys(roomData) : 'null');
      console.log('[RoomFlow] 📥 Room name:', roomData?.roomName);
      console.log('[RoomFlow] 📥 Room status:', roomData?.status);
      console.log('[RoomFlow] 📥 Room players:', roomData?.players);
      console.log('[RoomFlow] 📥 Current userId:', userId());
      
      // Treat missing room or missing roomName as closed room
      if (!roomData || !roomData.roomName) {
        console.warn('[RoomFlow] ⚠️ Room data invalid or missing roomName:', roomData);
        console.warn('[RoomFlow] ⚠️ Room data type:', typeof roomData);
        console.warn('[RoomFlow] ⚠️ Room data value:', roomData);
        
        // If room was just created, wait a bit and retry (might be permission delay)
        if (code === currentRoomCode()) {
          const retryCount = (window as any).__roomRetryCount || 0;
          if (retryCount < 3) {
            (window as any).__roomRetryCount = retryCount + 1;
            console.log(`[RoomFlow] ⏳ Room just created, waiting 1000ms and retrying subscription... (attempt ${retryCount + 1}/3)`);
            setTimeout(() => {
              handleLobbySubscription(code);
            }, 1000);
            return;
          } else {
            console.error('[RoomFlow] ❌ Max retries reached, room data still not available');
            (window as any).__roomRetryCount = 0;
          }
        }
        
        setRoom(null);
        setFeedback({ type: 'error', message: 'Ruangan ditutup oleh host atau tidak dapat diakses.' });
        setExperiencePhase('room-selection');
        cleanupRoomSession();
        localStorage.removeItem('activeRoomCode');
        setCurrentRoomCode('');
        return;
      }
      
      // Reset retry count on success
      (window as any).__roomRetryCount = 0;
      
      // Set room FIRST so it's available for rendering
      console.log('[RoomFlow] ✅ Room data valid, setting room');
      setRoom(roomData);
      
      // Then update session (this might fail if player not found, but room will still be shown)
      console.log('[RoomFlow] ✅ Updating session');
      updateRoomSession(roomData);
    });
    
    // Store unsubscribe function
    (window as any).__roomUnsubscribe = unsubscribe;

    onCleanup(() => {
      if (unsubscribe) {
        unsubscribe();
      }
      (window as any).__roomUnsubscribe = null;
    });
  };

  onMount(() => {
    // Check if coming from lobby.html
    const urlParams = new URLSearchParams(window.location.search);
    const fromLobby = urlParams.get('fromLobby') === 'true';
    const roomParam = urlParams.get('room') || '';
    if (roomParam && roomParam.length === 6) {
      setCurrentRoomCode(roomParam);
    }
    // Jangan paksa kembali ke room-selection saat kembali dari lobby
    if (fromLobby) {
      setExperiencePhase('in-game');
      setExperienceStarted(true);
    } else {
      setExperiencePhase('room-selection');
    }
    
    // Listen for room:created event from game.html's createRoomDirectly
    const handleRoomCreated = (event: CustomEvent) => {
      const roomCode = event.detail?.roomCode;
      const roomName = event.detail?.roomName;
      const hostName = event.detail?.hostName;
      const squadNames = event.detail?.squadNames || ['Squad 1', 'Squad 2', 'Squad 3'];
      
      console.log('[RoomFlow] 📨 Room created event received:', { roomCode, roomName, hostName, squadNames });
      
      if (roomCode && roomCode.length === 6) {
        console.log('[RoomFlow] ✅ Valid room code, setting up room...');
        setCurrentRoomCode(roomCode);
        localStorage.setItem('activeRoomCode', roomCode);
        // Reset mode to show room UI (bukan lobby, langsung room)
        setMode('options');
        // Set experience phase ke room-lobby agar UI room muncul
        setExperiencePhase('room-lobby');
        
        // Force subscription immediately (don't wait for createEffect)
        console.log('[RoomFlow] 🔄 Force subscribing to room immediately...');
        handleLobbySubscription(roomCode);
        
        // Set room data sementara dari event untuk UI langsung muncul
        // Ini akan di-overwrite oleh subscription ketika data ter-load
        if (roomName && hostName) {
          const tempRoomData: Room = {
            roomCode: roomCode,
            roomName: roomName,
            hostName: hostName,
            hostId: userId() || '',
            hostSquadId: 'squad1', // Host selalu di squad1 saat room dibuat
            status: 'waiting' as const,
            players: {},
            squads: {
              squad1: { id: 'squad1', name: squadNames[0] || 'Squad 1', capacity: 3, score: 0, status: 'waiting' as const, members: {}, collectedItems: {}, answeredQuestions: {} },
              squad2: { id: 'squad2', name: squadNames[1] || 'Squad 2', capacity: 3, score: 0, status: 'waiting' as const, members: {}, collectedItems: {}, answeredQuestions: {} },
              squad3: { id: 'squad3', name: squadNames[2] || 'Squad 3', capacity: 3, score: 0, status: 'waiting' as const, members: {}, collectedItems: {}, answeredQuestions: {} }
            },
            createdAt: Date.now(),
            lastUpdatedAt: Date.now(),
            startedAt: 0,
            finishedAt: 0
          };
          console.log('[RoomFlow] 📝 Setting temporary room data for immediate UI display with squad names:', squadNames);
          setRoom(tempRoomData);
        }
      } else {
        console.warn('[RoomFlow] ⚠️ Invalid room code in event:', roomCode);
      }
    };
    
    window.addEventListener('room:created', handleRoomCreated as EventListener);
    
    // Expose function for game.html to call directly
    (window as any).setCurrentRoomCode = (code: string) => {
      if (code && code.length === 6) {
        console.log('[RoomFlow] 🔧 setCurrentRoomCode called directly:', code);
        setCurrentRoomCode(code);
        localStorage.setItem('activeRoomCode', code);
        setMode('options');
        setExperiencePhase('room-lobby');
        handleLobbySubscription(code);
      }
    };
    
    // Expose setMode and setExperiencePhase for game.html
    (window as any).setMode = (mode: string) => {
      console.log('[RoomFlow] 🔧 setMode called directly:', mode);
      setMode(mode as any);
    };
    
    (window as any).setExperiencePhase = (phase: string) => {
      console.log('[RoomFlow] 🔧 setExperiencePhase called directly:', phase);
      setExperiencePhase(phase as any);
    };
    
    // Cleanup
    return () => {
      window.removeEventListener('room:created', handleRoomCreated as EventListener);
    };
  });

  createEffect(() => {
    const code = currentRoomCode();
    console.log('[RoomFlow] 🔄 currentRoomCode changed:', code);
    if (!code) {
      console.log('[RoomFlow] ⚠️ No room code, skipping subscription');
      return;
    }
    console.log('[RoomFlow] ✅ Room code exists, starting subscription');
    handleLobbySubscription(code);
  });

  createEffect(() => {
    // Jangan paksa kembali ke room-selection jika datang dari lobby (flag persisten) atau ada room parameter
    if (!room() && !experienceStarted()) {
      // Honor hard flag from game.html to keep in-game
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const forceInGame = typeof window !== 'undefined' && (window as any).__forceInGame;
      if (forceInGame || cameFromLobby() || hasRoomParam()) {
        setExperiencePhase('in-game');
        setExperienceStarted(true);
        return;
      }
      setExperiencePhase('room-selection');
    }
  });

  createEffect(() => {
    const player = userPlayer();
    const squadIdValue = player?.squadId ?? null;
    if (squadIdValue === lastAnnouncedSquadId) return;
    lastAnnouncedSquadId = squadIdValue;
    announceSquadContext(squadIdValue);
    patchPlayerInfo({ squadId: squadIdValue ?? '' });
  });

  createEffect(() => {
    const current = room();
    const status = current?.status;
    // Tidak perlu teleport ke lobby area 3D - countdown cukup di UI room
    if (!current || status !== 'countdown') {
      if (isInLobbyPhase) {
        window.exitLobbyArea?.();
        isInLobbyPhase = false;
      }
      if (status !== 'countdown') {
        lastLobbySignature = null;
      }
      return;
    }

    const countdownStart = current.countdown?.startedAt;
    if (!countdownStart) return;

    // REMOVED: Tidak perlu enterLobbyArea - countdown cukup di UI room
    // if (!isInLobbyPhase) {
    //   window.enterLobbyArea?.();
    //   isInLobbyPhase = true;
    // }

    const signature = `${current.roomCode}:${countdownStart}`;
    if (signature === lastLobbySignature) return;
    lastLobbySignature = signature;
    const id = userId();
    if (!id) return;
    markPlayerLobbyReady(current.roomCode, id).catch((error) => {
      console.error('[RoomFlow] markPlayerLobbyReady error', error);
    });
  });

  // Guard untuk mencegah multiple timer starts
  let lastTimerStartKey = '';
  createEffect(() => {
    const roomData = room();
    if (!roomData) {
      setCountdownRemainingMs(0);
      clearCountdownTimer();
      clearHostTimeout();
      lastTimerStartKey = '';
      return;
    }

    const status = roomData.status;
    if (status === 'waiting') {
      setExperiencePhase('room-lobby');
      setExperienceStarted(false);
      setCountdownRemainingMs(0);
      clearCountdownTimer();
      clearHostTimeout();
      lastTimerStartKey = '';
    } else if (status === 'countdown' && roomData.countdown) {
      // Countdown ditampilkan di UI room - tidak perlu teleport ke lobby area 3D
      setExperiencePhase('countdown');
      
      // Guard untuk mencegah multiple countdown setups
      const countdownKey = `${roomData.roomCode}:countdown:${roomData.countdown.startedAt}`;
      if (countdownKey === lastTimerStartKey) {
        // Already set up, just update countdown display
        const remaining = Math.max(0, roomData.countdown.endsAt - Date.now());
        setCountdownRemainingMs(remaining);
        return;
      }
      lastTimerStartKey = countdownKey;
      
      const updateCountdown = () => {
        const remaining = Math.max(0, roomData.countdown!.endsAt - Date.now());
        setCountdownRemainingMs(remaining);
        
        // If countdown finished and we're host, trigger beginGame
        if (remaining <= 0 && isHost()) {
          console.log('[RoomFlow] ⏰ Countdown reached 0, triggering beginGame...');
          clearCountdownTimer();
          (async () => {
            try {
              // Get hostId with fallback (same as handleStartCountdown)
              let hostId = (window as any).__authUid || userId() || '';
              if (!hostId) {
                try {
                  const authUser = await waitForAuth(2000, { strict: false });
                  hostId = authUser?.uid || '';
                } catch (authError) {
                  console.warn('[RoomFlow] waitForAuth failed in beginGame:', authError);
                }
              }
              
              if (!hostId) {
                console.error('[RoomFlow] Cannot begin game: no hostId available');
                return;
              }
              
              console.log('[RoomFlow] 🚀 Countdown finished, starting game with hostId:', hostId);
              await beginGame(roomData.roomCode, hostId);
              console.log('[RoomFlow] ✅ Game started successfully, status should be in-progress now');
            } catch (error) {
              console.error('[RoomFlow] beginGame failed', error);
            }
          })();
        }
      };
      updateCountdown();
      clearCountdownTimer();
      const timerId = window.setInterval(updateCountdown, 250);
      setCountdownTimerId(timerId);

      // Also set up host timeout as backup
      if (isHost()) {
        clearHostTimeout();
        const remainingMs = Math.max(0, roomData.countdown.endsAt - Date.now());
        const timeout = window.setTimeout(async () => {
          try {
            // Get hostId with fallback (same as handleStartCountdown)
            let hostId = (window as any).__authUid || userId() || '';
            if (!hostId) {
              try {
                const authUser = await waitForAuth(2000, { strict: false });
                hostId = authUser?.uid || '';
              } catch (authError) {
                console.warn('[RoomFlow] waitForAuth failed in beginGame timeout:', authError);
              }
            }
            
            if (!hostId) {
              console.error('[RoomFlow] Cannot begin game: no hostId available');
              return;
            }
            
            console.log('[RoomFlow] 🚀 Countdown timeout triggered, starting game with hostId:', hostId);
            await beginGame(roomData.roomCode, hostId);
            console.log('[RoomFlow] ✅ Game started successfully, status should be in-progress now');
          } catch (error) {
            console.error('[RoomFlow] beginGame failed', error);
          }
        }, remainingMs + 500);
        setHostCountdownTimeout(timeout);
      }
    } else if (status === 'in-progress') {
      clearCountdownTimer();
      clearHostTimeout();
      // Langsung spawn ke map asli (tidak perlu exit lobby karena tidak pernah masuk)
      if (isInLobbyPhase) {
        window.exitLobbyArea?.();
        isInLobbyPhase = false;
      }
      setExperiencePhase('in-game');
      
      // Guard untuk mencegah multiple timer starts
      const roomStartedAt = roomData.startedAt;
      const statusKey = `${roomData.roomCode}:${status}:${roomStartedAt}`;
      
      // Skip jika sudah di-process dengan key yang sama
      if (statusKey === lastTimerStartKey) {
        // Jangan panggil updateRoomSession di sini untuk mencegah infinite loop
        return;
      }
      
      lastTimerStartKey = statusKey;
      
      // Set experience started and spawn all players to in-game
      if (!experienceStarted()) {
        setExperienceStarted(true);
      }
      
      // Start timer dari room startedAt saat game dimulai
      if (roomStartedAt && (window as any).gameProgress?.startTimerFromRoomStartedAt) {
        // Gunakan setTimeout untuk mencegah blocking
        window.setTimeout(() => {
          (window as any).gameProgress.startTimerFromRoomStartedAt(roomStartedAt);
        }, 0);
      } else if ((window as any).gameProgress?.ensureTimerRunning) {
        // Fallback jika startedAt belum ada
        const ensure = (window as any).gameProgress?.ensureTimerRunning;
        if (ensure) {
          window.setTimeout(() => {
            ensure();
          }, 0);
        }
      }
      
      // Spawn all players to in-game world (baju adat, rumah adat, etc.)
      console.log('[RoomFlow] 🎮 Spawning to in-game world...');
      
      // Ensure entered and sceneLoaded are true so TopBar and BottomBar appear
      // Check if scene is already loaded
      const sceneEl = document.querySelector('a-scene');
      const isSceneLoaded = sceneEl && (sceneEl as any).hasLoaded;
      
      if ((window as any).setEntered) {
        (window as any).setEntered(true);
        console.log('[RoomFlow] ✅ Set entered to true');
      }
      if ((window as any).setSceneLoaded) {
        (window as any).setSceneLoaded(isSceneLoaded || true); // Set to true if scene already loaded, otherwise true anyway
        console.log('[RoomFlow] ✅ Set sceneLoaded to:', isSceneLoaded || true);
      }
      
      if (window.startExperience) {
        window.startExperience();
      } else {
        console.warn('[RoomFlow] ⚠️ window.startExperience is not available');
      }
      
      // If already started but reconnecting, restore timer from room startedAt
      if (experienceStarted() && roomStartedAt && (window as any).gameProgress?.startTimerFromRoomStartedAt) {
        const currentStartedAt = (window as any).gameProgress?.getState?.()?.timerStartedAt;
        if (currentStartedAt !== roomStartedAt) {
          window.setTimeout(() => {
            (window as any).gameProgress.startTimerFromRoomStartedAt(roomStartedAt);
          }, 0);
        }
      }
      
      // Update room session after spawning to in-game
      updateRoomSession(roomData);
    } else if (status === 'completed') {
      clearCountdownTimer();
      clearHostTimeout();
      setExperienceStarted(false);
      setExperiencePhase('leaderboard');
      lastTimerStartKey = '';
      updateRoomSession(roomData);
    } else {
      // Untuk status 'waiting' dan 'countdown', panggil updateRoomSession
      // Guard di dalam updateRoomSession akan mencegah infinite loop
      updateRoomSession(roomData);
    }
  });

  // Guard untuk mencegah infinite loop
  let lastSquadCompletedCheck = '';
  createEffect(() => {
    const current = room();
    if (!current) return;
    const squad = userSquad();
    
    // Jika squad selesai, redirect ke leaderboard (bukan waiting)
    if (current.status === 'in-progress' && squad?.status === 'completed') {
      const checkKey = `${current.roomCode}:${squad.id}:${squad.status}`;
      // Skip jika sudah di-check sebelumnya
      if (checkKey === lastSquadCompletedCheck) return;
      lastSquadCompletedCheck = checkKey;
      
      // Tampilkan leaderboard jika sudah ada squad yang selesai
      if (current.leaderboard && current.leaderboard.length > 0) {
        setExperiencePhase('leaderboard');
        setExperienceStarted(false);
      } else {
        // Fallback ke waiting jika leaderboard belum ada
        setExperiencePhase('waiting');
        setExperienceStarted(false);
      }
    } else {
      // Reset check key jika status berubah
      lastSquadCompletedCheck = '';
    }
  });
  
  // Expose updateGameTime ke window
  if (typeof window !== 'undefined') {
    (window as any).updateGameTime = updateGameTime;
  }

  onCleanup(() => {
    clearCountdownTimer();
    clearHostTimeout();
    cleanupRoomSession();
  });

  const handleCreateRoom = async () => {
    resetFeedback();
    try {
      setIsSubmitting(true);
      // Pastikan Auth siap dan gunakan uid autentik sebagai hostId
      const authUser = await waitForAuth(8000, { strict: true });
      const hostUid = authUser?.uid || userId();
      if (!hostUid) {
        setFeedback({ type: 'error', message: 'Tidak dapat menentukan akun. Silakan login dahulu.' });
        setIsSubmitting(false);
        return;
      }
      try { localStorage.setItem('userId', hostUid); } catch {}
      const squadNames = createSquadNames();
      const roomData = await createRoom({
        roomName: createRoomName(),
        hostId: hostUid,
        hostName: userName(),
        hostAvatar: avatarSrc(),
        squadNames,
      });
      setRoom(roomData);
      setCurrentRoomCode(roomData.roomCode);
      localStorage.setItem('activeRoomCode', roomData.roomCode);
      setExperiencePhase('room-lobby');
      // Don't show feedback message - room lobby UI will show the code
      setMode('options'); // Reset mode to show room lobby UIw
    } catch (error: any) {
      console.error('[RoomFlow] createRoom error', error);
      setFeedback({
        type: 'error',
        message: error?.message ?? 'Gagal membuat ruangan. Coba lagi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = async () => {
    resetFeedback();
    const code = joinCode().trim().toUpperCase();
    if (!code) {
      setFeedback({ type: 'error', message: 'Masukkan kode ruangan.' });
      return;
    }
    if (!userId()) {
      setFeedback({ type: 'error', message: 'Silakan login terlebih dahulu sebelum bergabung.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const roomData = await joinRoom({
        roomCode: code,
        userId: userId(),
        name: userName(),
        avatarSrc: avatarSrc(),
      });
      if (!roomData) {
        setFeedback({ type: 'error', message: 'Ruangan tidak ditemukan atau penuh.' });
        setIsSubmitting(false);
        return;
      }
      console.log('[RoomFlow] ✅ Successfully joined room:', roomData.roomCode);
      setCurrentRoomCode(code);
      localStorage.setItem('activeRoomCode', code);
      setRoom(roomData);
      setExperiencePhase('room-lobby');
      setFeedback({ type: 'success', message: `Berhasil bergabung ke ruangan ${roomData.roomName}.` });
      setMode('options');
      
      // Force subscription to ensure room data is updated
      console.log('[RoomFlow] 🔄 Force subscribing to joined room...');
      handleLobbySubscription(code);
    } catch (error: any) {
      console.error('[RoomFlow] joinRoom error', error);
      setFeedback({
        type: 'error',
        message: error?.message ?? 'Gagal bergabung ke ruangan.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenameSquad = async (squadId: string, name: string) => {
    if (!room()) return;
    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Nama squad tidak boleh kosong.' });
      return;
    }
    try {
      await updateSquadName(room()!.roomCode, squadId, name);
      setFeedback({ type: 'success', message: 'Nama squad diperbarui.' });
    } catch (error) {
      console.error('[RoomFlow] updateSquadName error', error);
      setFeedback({ type: 'error', message: 'Gagal memperbarui nama squad.' });
    }
  };

  const handleChangeSquad = async (targetSquadId: string) => {
    const current = room();
    if (!current || !userPlayer()) return;
    if (userPlayer()!.squadId === targetSquadId) {
      setFeedback({ type: 'info', message: 'Anda sudah berada di squad ini.' });
      return;
    }
    try {
      await movePlayerToSquad(current.roomCode, userId(), targetSquadId);
      setFeedback({ type: 'success', message: 'Berhasil pindah squad.' });
    } catch (error) {
      console.error('[RoomFlow] movePlayerToSquad error', error);
      setFeedback({ type: 'error', message: 'Tidak dapat pindah squad. Pastikan slot masih tersedia.' });
    }
  };

  const handleStartCountdown = async () => {
    const current = room();
    if (!current) return;
    try {
      // Get callerId with multiple fallbacks
      // Priority: window.__authUid > userId() > waitForAuth
      let callerId = (window as any).__authUid || userId() || '';
      
      // Try to get from waitForAuth if callerId is still empty, but don't fail if it errors
      if (!callerId) {
        try {
          const authUser = await waitForAuth(2000, { strict: false });
          callerId = authUser?.uid || '';
        } catch (authError) {
          console.warn('[RoomFlow] waitForAuth failed, using existing callerId:', authError);
        }
      }
      
      if (!callerId) {
        setFeedback({ type: 'error', message: 'Tidak dapat menentukan akun. Silakan login dahulu.' });
        return;
      }
      
      if (current.hostId !== callerId) {
        setFeedback({ type: 'error', message: 'Hanya host yang dapat memulai permainan.' });
        return;
      }
      
      console.log('[RoomFlow] Starting countdown with callerId:', callerId);
      await startGameCountdown(current.roomCode, callerId, 10000);
      setFeedback({ type: 'info', message: 'Hitung mundur dimulai. Permainan akan dimulai dalam 10 detik!' });
    } catch (error) {
      console.error('[RoomFlow] startGameCountdown error', error);
      setFeedback({ type: 'error', message: 'Tidak dapat memulai hitung mundur.' });
    }
  };

  const handleAwaitingReset = async () => {
    const current = room();
    if (!current) return;
    try {
      await resetRoomToLobby(current.roomCode);
      setFeedback({ type: 'success', message: 'Ruang direset ke lobby.' });
      (window as any).gameProgress?.reset?.();
    } catch (error) {
      console.error('[RoomFlow] resetRoomToLobby error', error);
      setFeedback({ type: 'error', message: 'Gagal mereset ruang.' });
    }
  };

  const handleFinish = async () => {
    const current = room();
    if (current && userId()) {
      try {
        await leaveRoom(current.roomCode, userId());
      } catch (error) {
        console.error('[RoomFlow] leaveRoom error', error);
      }
    }
    
    // Exit lobby jika sedang di lobby
    if (isInLobbyPhase) {
      window.exitLobbyArea?.();
      isInLobbyPhase = false;
    }
    
    // Show game environment kembali
    window.showGameEnvironment?.();
    
    setRoom(null);
    setCurrentRoomCode('');
    cleanupRoomSession();
    localStorage.removeItem('activeRoomCode');
    setExperienceStarted(false);
    setExperiencePhase('room-selection');
    setMode('options');
    (window as any).gameProgress?.reset?.();
    lastNotifiedSquadId = null;
  };

  // Expose function untuk logout button
  if (typeof window !== 'undefined') {
    (window as any).leaveRoomAndReturnToSelection = handleFinish;
  }

  const renderInstructions = () => (
    <div class="rounded-2xl border border-blue-200 bg-white/90 p-4 text-slate-700 shadow-md backdrop-blur-sm">
      <h2 class="mb-3 text-lg font-semibold text-blue-700">Panduan Singkat</h2>
      <ol class="list-decimal space-y-2 pl-5 text-sm leading-relaxed sm:text-base">
        <li>Bersiap dengan membaca instruksi permainan dan pilih karakter favoritmu.</li>
        <li>Masuk ke ruangan dengan membuat ruangan baru atau bergabung menggunakan kode.</li>
        <li>Pilih salah satu dari 3 squad. Tiap squad berisi 2-3 pemain dan dapat diganti sebelum permainan dimulai.</li>
        <li>Host akan memulai permainan, seluruh pemain berkumpul di lobby selama 10 detik.</li>
        <li>Bekerja sama mencari baju adat tersembunyi dan menjawab kuis penjaga untuk menambah poin squad.</li>
        <li>Jawaban salah akan mengurangi poin. Setiap item dan kuis hanya dapat dikerjakan satu kali per squad.</li>
        <li>Ketika semua squad selesai, leaderboard akan menampilkan peringkat dan kontributor terbaik.</li>
      </ol>
    </div>
  );

  const renderModeButtons = () => (
    <div class="grid gap-4 sm:grid-cols-2">
      <button
        type="button"
        class="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-left text-white shadow-lg transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-blue-400 sm:p-6"
        onClick={() => {
          setFeedback(null);
          setMode('create');
        }}
      >
        <h3 class="text-xl font-semibold">Buat Ruangan</h3>
        <p class="mt-2 text-sm text-blue-100 sm:text-base">
          Jadilah host, beri nama squad, dan pimpin petualangan budaya bersama temanmu.
        </p>
      </button>
      <button
        type="button"
        class="rounded-2xl border border-blue-200 bg-white p-4 text-left text-blue-700 shadow-lg transition hover:border-blue-400 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 sm:p-6"
        onClick={() => {
          setFeedback(null);
          setMode('join');
        }}
      >
        <h3 class="text-xl font-semibold">Gabung Ruangan</h3>
        <p class="mt-2 text-sm text-slate-600 sm:text-base">
          Masukkan kode ruangan dari host dan pilih squad dengan slot kosong.
        </p>
      </button>
    </div>
  );

  const renderCreateForm = () => (
    <div class="space-y-4 rounded-2xl border border-blue-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm sm:p-6">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold text-blue-700 sm:text-xl">Buat Ruangan Baru</h3>
          <p class="text-sm text-slate-600">Atur nama ruangan dan squad untuk timmu.</p>
        </div>
        <button
          type="button"
          class="rounded-full border border-transparent bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
          onClick={() => {
            setFeedback(null);
            setMode('options');
          }}
        >
          Kembali
        </button>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-700" for="roomName">
          Nama Ruangan
        </label>
        <input
          id="roomName"
          type="text"
          value={createRoomName()}
          onInput={(evt) => setCreateRoomName(evt.currentTarget.value)}
          class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:text-base"
          placeholder="Misal: Jelajah Nusantara"
          maxlength={50}
        />
      </div>

      <div class="space-y-3">
        <p class="text-sm font-medium text-slate-700">Nama Squad</p>
        <For each={[0, 1, 2]}>
          {(index) => (
            <div class="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:flex-row sm:items-center sm:gap-3">
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
                Squad {index + 1}
              </label>
              <input
                type="text"
                value={createSquadNames()[index]}
                onInput={(evt) => {
                  const names = [...createSquadNames()] as [string, string, string];
                  names[index] = evt.currentTarget.value;
                  setCreateSquadNames(names);
                }}
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:text-base"
                maxlength={40}
              />
            </div>
          )}
        </For>
      </div>

      <button
        type="button"
        class="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 sm:text-base"
        disabled={isSubmitting()}
        onClick={handleCreateRoom}
      >
        {isSubmitting() ? 'Membuat Ruangan...' : 'Buat Ruangan'}
      </button>
    </div>
  );

  const renderJoinForm = () => (
    <div class="space-y-4 rounded-2xl border border-blue-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm sm:p-6">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold text-blue-700 sm:text-xl">Gabung Ruangan</h3>
          <p class="text-sm text-slate-600">Masukkan kode ruangan dari host dan bergabung dengan squad.</p>
        </div>
        <button
          type="button"
          class="rounded-full border border-transparent bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
          onClick={() => {
            setFeedback(null);
            setMode('options');
          }}
        >
          Kembali
        </button>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-700" for="roomCode">
          Kode Ruangan
        </label>
        <input
          id="roomCode"
          type="text"
          value={joinCode()}
          onInput={(evt) => setJoinCode(evt.currentTarget.value.toUpperCase())}
          class="w-full rounded-xl border border-slate-200 px-3 py-3 text-center text-lg font-semibold tracking-[0.3em] text-blue-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="ABC123"
          maxlength={6}
        />
      </div>

      <button
        type="button"
        class="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 sm:text-base"
        disabled={isSubmitting()}
        onClick={handleJoinRoom}
      >
        {isSubmitting() ? 'Menghubungkan...' : 'Gabung Sekarang'}
      </button>
    </div>
  );

  const renderSquadCard = (squad: RoomSquad) => {
    const { used, capacity } = calculateSlotUsage(squad);
    const members = Object.values(squad.members ?? {}).sort((a, b) => a.joinedAt - b.joinedAt);
    const isUserSquad = userPlayer()?.squadId === squad.id;
    const canJoin = used < capacity && !isUserSquad;

    const topCollector = members.reduce(
      (acc, member) => {
        const collected = member.contributions?.items ?? 0;
        if (collected > acc.count) {
          return { name: member.name, count: collected };
        }
        return acc;
      },
      { name: '-', count: 0 },
    );

    const topQuizzer = members.reduce(
      (acc, member) => {
        const quizzes = member.contributions?.quizzes ?? 0;
        if (quizzes > acc.count) {
          return { name: member.name, count: quizzes };
        }
        return acc;
      },
      { name: '-', count: 0 },
    );

    return (
      <div
        class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg transition hover:border-blue-200 hover:shadow-xl sm:p-6"
        classList={{ 'ring-2 ring-blue-400': isUserSquad }}
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Show
            when={isHost()}
            fallback={
              <h3 class="text-lg font-semibold text-blue-700 sm:text-xl">
                {squad.name} <span class="text-xs font-medium text-slate-500">({used}/{capacity} pemain)</span>
              </h3>
            }
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <input
                type="text"
                value={squad.name}
                onChange={(evt) => handleRenameSquad(squad.id, evt.currentTarget.value)}
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:text-base"
                maxlength={40}
              />
              <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {used}/{capacity} pemain
              </span>
            </div>
          </Show>
        </div>

        <div class="space-y-2">
          <For each={members}>
            {(member) => (
              <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-800">{member.name}</p>
                  <p class="text-xs text-slate-500">
                    Koleksi: {member.contributions?.items ?? 0} · Kuis: {member.contributions?.quizzes ?? 0} · Poin:{' '}
                    {member.contributions?.score ?? 0}
                  </p>
                </div>
                <Show when={member.isHost}>
                  <span class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Host</span>
                </Show>
              </div>
            )}
          </For>
          <Show when={members.length < squad.capacity}>
            <div class="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-center text-sm text-slate-400">
              Slot kosong ({squad.capacity - members.length}) – Ajak teman bergabung
            </div>
          </Show>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Kontributor Squad</p>
            <p class="text-xs text-slate-500">
              Baju Adat: <span class="font-semibold text-slate-700">{topCollector.name}</span> ({topCollector.count})
            </p>
            <p class="text-xs text-slate-500">
              Penjawab Kuis: <span class="font-semibold text-slate-700">{topQuizzer.name}</span> ({topQuizzer.count})
            </p>
          </div>
          <Show when={canJoin}>
            <button
              type="button"
              class="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:text-sm"
              onClick={() => handleChangeSquad(squad.id)}
            >
              Gabung Squad Ini
            </button>
          </Show>
          <Show when={isUserSquad}>
            <span class="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white sm:text-sm">
              Squad Kamu
            </span>
          </Show>
        </div>
      </div>
    );
  };

  const renderRoomLobby = () => {
    const current = room();
    if (!current) return null;
    const countdownSeconds = Math.ceil(countdownRemainingMs() / 1000);

    return (
      <div class="space-y-5 rounded-3xl border border-blue-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md sm:p-6 lg:p-8">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.4em] text-blue-400">Ruang Budaya</p>
            <h2 class="text-2xl font-bold text-blue-700 sm:text-3xl">{current.roomName}</h2>
            <p class="text-sm text-slate-500">
              Host:{' '}
              <span class="font-semibold text-slate-700">
                {current.hostName} {current.hostId === userId() ? '(Anda)' : ''}
              </span>
            </p>
          </div>
          <div class="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <div class="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-center shadow-sm">
              <p class="text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-500">Kode Ruangan</p>
              <p class="text-xl font-bold tracking-[0.2em] text-blue-700">{current.roomCode}</p>
            </div>
            <button
              type="button"
              class="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:text-sm"
              onClick={() => {
                navigator.clipboard.writeText(current.roomCode);
                setFeedback({ type: 'info', message: 'Kode ruangan disalin ke clipboard.' });
              }}
            >
              Salin Kode
            </button>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <For each={sortedSquads()}>{(squad) => renderSquadCard(squad)}</For>
        </div>

        <Show when={current.status === 'countdown'}>
          <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center shadow-inner">
            <p class="text-xs font-semibold uppercase tracking-[0.4em] text-amber-500">Hitung Mundur</p>
            <p class="mt-2 text-5xl font-bold text-amber-600 sm:text-6xl">{countdownSeconds}</p>
            <p class="mt-2 text-sm text-amber-600">Permainan akan dimulai otomatis setelah hitung mundur selesai.</p>
          </div>
        </Show>

        <Show when={current.status === 'waiting'}>
          <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-slate-700">
                Tips: pastikan tiap squad memiliki anggota maksimal 3 orang sebelum permainan dimulai.
              </p>
              <p class="text-xs text-slate-500">
                Host dapat memulai permainan kapan saja. Pemain masih bisa berpindah squad selama slot tersedia.
              </p>
            </div>
            <Show when={isHost()}>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
                  onClick={handleStartCountdown}
                >
                  Mulai Permainan
                </button>
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  onClick={handleAwaitingReset}
                >
                  Reset Lobby
                </button>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    );
  };

  const renderWaitingOverlay = () => (
    <div class="fixed inset-0 z-[90] flex items-center justify-center bg-white/95 px-4 backdrop-blur-md">
      <div class="max-w-lg space-y-4 rounded-3xl border border-blue-200 bg-white p-6 text-center shadow-2xl">
        <h2 class="text-2xl font-bold text-blue-700">Squad Kamu Sudah Selesai!</h2>
        <p class="text-sm text-slate-600">
          Kembali ke area lobby dan dukung squad lainnya. Leaderboard akan tampil ketika seluruh squad menyelesaikan
          tugas.
        </p>
        <button
          type="button"
          class="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
          onClick={() => {
            window.respawnToCheckpoint?.();
          }}
        >
          Teleport ke Lobby
        </button>
      </div>
    </div>
  );

  const renderLeaderboard = () => {
    const current = room();
    if (!current) return null;
    const board = leaderboard() ?? [];
    const allCompleted = current.status === 'completed';
    const completedSquads = Object.values(current.squads || {}).filter((s) => s.status === 'completed');
    const totalSquads = Object.keys(current.squads || {}).length;

    return (
      <div class="fixed inset-0 z-[95] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-6">
        <div class="w-full max-w-4xl space-y-6 rounded-3xl border border-blue-200 bg-white/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div class="flex flex-col items-center gap-3 text-center">
            <p class="text-sm font-semibold uppercase tracking-[0.5em] text-blue-400">Leaderboard Nusantara</p>
            <h2 class="text-3xl font-bold text-blue-700 sm:text-4xl">Perolehan Poin Squad</h2>
            <Show
              when={allCompleted}
              fallback={
                <p class="text-sm text-slate-600">
                  Squad kamu sudah selesai! Menunggu squad lain menyelesaikan misi... ({completedSquads.length}/{totalSquads} squad selesai)
                </p>
              }
            >
              <p class="text-sm text-slate-600">
                Selamat! Semua squad telah menyelesaikan misi. Berikut klasemen akhir dan kontributor terbaik.
              </p>
            </Show>
          </div>

          <div class="space-y-4">
            <For each={board}>
              {(entry) => (
                (() => {
                  const squad = current.squads[entry.squadId];
                  if (!squad) return null;
                  const topMembers = Object.values(squad.members ?? {}).sort(
                    (a, b) => (b.contributions?.score ?? 0) - (a.contributions?.score ?? 0),
                  );
                  return (
                    <div
                  class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-6"
                  classList={{
                    'border-amber-300 bg-amber-50/80 shadow-amber-100': entry.placement === 1,
                    'border-slate-300 bg-slate-50/80': entry.placement !== 1,
                  }}
                >
                  <div class="flex items-center gap-4">
                    <div class="flex size-14 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white shadow-md">
                      {entry.placement}
                    </div>
                    <div>
                      <p class="text-lg font-semibold text-blue-700 sm:text-xl">{entry.squadName}</p>
                      <p class="text-sm text-slate-500">
                        Waktu: {formatDuration(entry.durationSeconds)} · Poin akhir: {entry.score}
                      </p>
                    </div>
                  </div>
                  <div class="flex flex-col gap-1 text-sm text-slate-600">
                      <For each={topMembers}>
                      {(member, index) => (
                        <Show when={index() < 3}>
                          <div class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2">
                            <span class="truncate font-semibold text-slate-700">{member.name}</span>
                            <span class="text-xs text-slate-500">
                              Koleksi: {member.contributions?.items ?? 0} · Kuis: {member.contributions?.quizzes ?? 0}
                            </span>
                          </div>
                        </Show>
                      )}
                    </For>
                  </div>
                </div>
                  );
                })()
              )}
            </For>
          </div>

          <button
            type="button"
            class="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 sm:text-base"
            onClick={handleFinish}
          >
            Selesai
          </button>
        </div>
      </div>
    );
  };

  const activePhase = () => experiencePhase();
  
  // Debug logging
  createEffect(() => {
    const currentRoom = room();
    const currentPhase = activePhase();
    console.log('[RoomFlow] 🎨 Render state - room:', !!currentRoom, 'phase:', currentPhase, 'started:', experienceStarted());
    if (currentRoom) {
      console.log('[RoomFlow] 🎨 Room details - name:', currentRoom.roomName, 'code:', currentRoom.roomCode, 'status:', currentRoom.status);
    }
  });

  // Check if room parameter exists in URL
  const hasRoomParam = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      return !!(roomParam && roomParam.length >= 4);
    } catch {
      return false;
    }
  };

  return (
    <>
      {/* Hide room lobby UI when game is in progress or showing leaderboard */}
      {/* TopBar and BottomBar (z-10) should still be visible in-game */}
      <Show when={activePhase() !== 'in-game' && activePhase() !== 'leaderboard'}>
        <div class="pointer-events-auto fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black px-3 py-6 scrollbar-hidden sm:py-8">
          <div class="w-full max-w-5xl">
            {/* Don't render create/join room UI if room parameter exists in URL */}
            <Show when={!room() && !hasRoomParam()}>
              <div class="space-y-5">
                {renderInstructions()}
                <Show when={feedback()}>
                  <div
                    class="rounded-2xl border px-4 py-3 text-sm shadow-lg"
                    classList={{
                      'border-green-200 bg-green-50 text-green-700': feedback()?.type === 'success',
                      'border-red-200 bg-red-50 text-red-600': feedback()?.type === 'error',
                      'border-blue-100 bg-blue-50 text-blue-600': feedback()?.type === 'info',
                    }}
                  >
                    {feedback()?.message}
                  </div>
                </Show>
                <Show when={mode() === 'options'} fallback={<Show when={mode() === 'create'}>{renderCreateForm()}</Show>}>
                  <Show when={mode() === 'options'}>{renderModeButtons()}</Show>
                </Show>
                <Show when={mode() === 'join'}>{renderJoinForm()}</Show>
              </div>
            </Show>

            <Show when={room()}>
              <div class="space-y-5">
                <Show when={feedback()}>
                  <div
                    class="rounded-2xl border px-4 py-3 text-sm shadow-lg"
                    classList={{
                      'border-green-200 bg-green-50 text-green-700': feedback()?.type === 'success',
                      'border-red-200 bg-red-50 text-red-600': feedback()?.type === 'error',
                      'border-blue-100 bg-blue-50 text-blue-600': feedback()?.type === 'info',
                    }}
                  >
                    {feedback()?.message}
                  </div>
                </Show>
                {renderRoomLobby()}
              </div>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={activePhase() === 'waiting'}>{renderWaitingOverlay()}</Show>
      <Show when={activePhase() === 'leaderboard'}>{renderLeaderboard()}</Show>
    </>
  );
};

