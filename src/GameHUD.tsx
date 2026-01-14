import { Component, Show, createEffect, createSignal, createMemo, onCleanup, onMount } from 'solid-js';
import { subscribeToRoom, type Room } from './roomService';

type GameHUDProps = {
  visible: boolean;
};

export const GameHUD: Component<GameHUDProps> = (props) => {
  const [squadScore, setSquadScore] = createSignal<number>(0);
  const [formattedTime, setFormattedTime] = createSignal<string>('00:00:00');
  const [roomData, setRoomData] = createSignal<Room | null>(null);
  const [isInProgress, setIsInProgress] = createSignal<boolean>(false);
  let timeIntervalId: number | null = null;
  let checkRoomCodeInterval: number | null = null;
  let roomUnsubscribe: (() => void) | null = null;
  let soloModeStartTime: number | null = null;
  let soloModeTimerId: number | null = null;

  const userId = () => localStorage.getItem('userId') ?? '';

  // Check if solo mode
  // game.html is always solo mode (no room/squad system)
  const isSoloMode = () => {
    if (typeof window === 'undefined') return false;
    try {
      const pathname = window.location.pathname;
      // game.html is always solo mode
      if (pathname.includes('game.html') || pathname.endsWith('/game')) {
        return true;
      }
      // Also check for explicit solo mode flag
      return (window as any).__soloMode === true;
    } catch {
      return false;
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}.${minutes.toString().padStart(2, '0')}.${secs.toString().padStart(2, '0')}`;
  };
  
  // Also use gameProgress formatTime if available (for consistency)
  const formatTimeFromMs = (ms: number): string => {
    if ((window as any).gameProgress && typeof (window as any).gameProgress.formatElapsed === 'function') {
      const formatted = (window as any).gameProgress.formatElapsed(ms);
      // Convert from HH:MM:SS to HH.MM.SS format
      return formatted.replace(/:/g, '.');
    }
    const seconds = Math.floor(ms / 1000);
    return formatTime(seconds);
  };

  const updateTime = (room: Room) => {
    if (room.status === 'in-progress' && room.startedAt) {
      const elapsedSeconds = Math.floor((Date.now() - room.startedAt) / 1000);
      const formatted = formatTime(elapsedSeconds);
      setFormattedTime(formatted);
      console.log('[GameHUD] ⏱️ Time updated:', formatted, 'elapsedSeconds:', elapsedSeconds, 'startedAt:', room.startedAt);
    } else {
      setFormattedTime('00.00.00');
      console.log('[GameHUD] ⏱️ Time reset - status:', room.status, 'startedAt:', room.startedAt);
    }
  };

  const updateSquadScore = (room: Room) => {
    const currentUserId = userId();
    console.log('[GameHUD] 🎯 Updating squad score - userId:', currentUserId);
    console.log('[GameHUD] 🎯 Room players:', room.players);
    console.log('[GameHUD] 🎯 Room squads:', room.squads);
    
    const player = room.players?.[currentUserId];
    console.log('[GameHUD] 🎯 Player found:', player);
    
    if (player && player.squadId) {
      console.log('[GameHUD] 🎯 Player squadId:', player.squadId);
      const squad = room.squads?.[player.squadId];
      console.log('[GameHUD] 🎯 Squad found:', squad);
      
      if (squad) {
        // Read 'points' from Firebase (we update 'points' not 'score')
        const score = squad.points || squad.score || 0;
        setSquadScore(score);
        console.log('[GameHUD] ✅ Squad score updated:', score, '(from points:', squad.points, ', score:', squad.score, ')');
      } else {
        setSquadScore(0);
        console.log('[GameHUD] ⚠️ Squad not found, score set to 0');
      }
    } else {
      setSquadScore(0);
      console.log('[GameHUD] ⚠️ Player not found or no squadId, score set to 0');
    }
  };

  // Expose function to force GameHUD visible
  onMount(() => {
    (window as any).forceGameHUDVisible = () => {
      console.log('[GameHUD] 🔄 Force visibility called');
      const el = document.querySelector('[data-gamehud]') as HTMLElement;
      if (el) {
        el.style.setProperty('display', 'flex', 'important');
        el.style.setProperty('visibility', 'visible', 'important');
        el.style.setProperty('opacity', '1', 'important');
        el.style.setProperty('z-index', '100021', 'important');
        el.style.setProperty('position', 'fixed', 'important');
        el.style.setProperty('pointer-events', 'auto', 'important');
        
        // Force update text content
        const textElements = el.querySelectorAll('p');
        if (textElements.length >= 4) {
          const scoreEl = textElements[1] as HTMLElement;
          const timeEl = textElements[3] as HTMLElement;
          if (scoreEl) {
            scoreEl.textContent = String(squadScore() ?? 0);
            scoreEl.style.setProperty('display', 'block', 'important');
            scoreEl.style.setProperty('visibility', 'visible', 'important');
            scoreEl.style.setProperty('opacity', '1', 'important');
          }
          if (timeEl) {
            timeEl.textContent = formattedTime() || '00.00.00';
            timeEl.style.setProperty('display', 'block', 'important');
            timeEl.style.setProperty('visibility', 'visible', 'important');
            timeEl.style.setProperty('opacity', '1', 'important');
          }
        }
        console.log('[GameHUD] ✅ Forced visible via window function');
      }
    };
    
    // Function to subscribe to room
    const subscribeToActiveRoom = () => {
      // Clean up previous subscription
      if (roomUnsubscribe) {
        roomUnsubscribe();
        roomUnsubscribe = null;
      }

      const activeRoomCode = localStorage.getItem('activeRoomCode');
      if (activeRoomCode) {
        console.log('[GameHUD] 📡 Subscribing to room:', activeRoomCode);
        roomUnsubscribe = subscribeToRoom(activeRoomCode, (room) => {
          if (room) {
            console.log('[GameHUD] 📥 Room data received, status:', room.status, 'startedAt:', room.startedAt, 'squads:', room.squads, 'players:', room.players);
            setRoomData(room);
            setIsInProgress(room.status === 'in-progress');
            updateSquadScore(room);
            updateTime(room);
            
            // Force update display after data update
            setTimeout(() => {
              if (shouldShow()) {
                forceVisibility();
              }
            }, 100);
          } else {
            setRoomData(null);
            setIsInProgress(false);
            setSquadScore(0);
            setFormattedTime('00.00.00');
          }
        });
      } else {
        console.log('[GameHUD] ⚠️ No active room code found');
      }
    };

    // In solo mode, skip room subscription
    if (isSoloMode()) {
      console.log('[GameHUD] ✅ Solo mode detected, skipping room subscription');
    } else {
      // Subscribe immediately (only in multiplayer mode)
      subscribeToActiveRoom();

      // Also listen for room code changes
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'activeRoomCode') {
          console.log('[GameHUD] 🔄 Room code changed, re-subscribing...');
          subscribeToActiveRoom();
        }
      };
      window.addEventListener('storage', handleStorageChange);

      // Also listen for custom event when room code changes
      const handleRoomCodeChange = () => {
        console.log('[GameHUD] 🔄 Room code changed via event, re-subscribing...');
        subscribeToActiveRoom();
      };
      window.addEventListener('room:code-changed', handleRoomCodeChange);
      
      // Also listen for room:created event
      const handleRoomCreated = (e: Event) => {
        const event = e as CustomEvent;
        if (event.detail?.roomCode) {
          console.log('[GameHUD] 🔄 Room created event received, re-subscribing...');
          subscribeToActiveRoom();
        }
      };
      window.addEventListener('room:created', handleRoomCreated);
      
      // Also check periodically for room code changes (in case localStorage changes without event)
      checkRoomCodeInterval = window.setInterval(() => {
        const currentCode = localStorage.getItem('activeRoomCode');
        const lastCode = (window as any).__lastGameHUDRoomCode;
        if (currentCode !== lastCode) {
          (window as any).__lastGameHUDRoomCode = currentCode;
          console.log('[GameHUD] 🔄 Room code changed (polling), re-subscribing...');
          subscribeToActiveRoom();
        }
      }, 2000);
    }

    // Set up timer interval to update time every second when game is in progress
    // In solo mode, this is handled by soloModeTimerId, so skip here
    if (!isSoloMode()) {
      timeIntervalId = window.setInterval(() => {
        const room = roomData();
        if (room && room.status === 'in-progress' && room.startedAt) {
          updateTime(room);
          // Force update text content directly every second
          const el = document.querySelector('[data-gamehud]') as HTMLElement;
          if (el) {
            const textElements = el.querySelectorAll('p');
            if (textElements.length >= 4) {
              const scoreEl = textElements[1] as HTMLElement;
              const timeEl = textElements[3] as HTMLElement;
              if (scoreEl) {
                scoreEl.textContent = String(squadScore() ?? 0);
                scoreEl.style.setProperty('display', 'block', 'important');
                scoreEl.style.setProperty('visibility', 'visible', 'important');
                scoreEl.style.setProperty('opacity', '1', 'important');
              }
              if (timeEl) {
                timeEl.textContent = formattedTime() || '00.00.00';
                timeEl.style.setProperty('display', 'block', 'important');
                timeEl.style.setProperty('visibility', 'visible', 'important');
                timeEl.style.setProperty('opacity', '1', 'important');
              }
            }
          }
        }
      }, 1000);
    } else {
      console.log('[GameHUD] ✅ Solo mode detected, skipping multiplayer timer interval');
    }

    // Solo mode timer and score - runs independently
    // Check solo mode and start timer when experience starts
    const checkAndStartSoloMode = () => {
      if (isSoloMode() && props.visible) {
        console.log('[GameHUD] 🎮 Solo mode detected, starting solo timer and score tracking...');
        
        // Start timer in gameProgress if available
        if ((window as any).gameProgress && typeof (window as any).gameProgress.startSoloTimer === 'function') {
          (window as any).gameProgress.startSoloTimer();
          console.log('[GameHUD] ✅ Solo timer started via gameProgress');
        }
        
        // Fallback: start local timer
        if (soloModeStartTime === null) {
          soloModeStartTime = Date.now();
          console.log('[GameHUD] ✅ Solo timer started locally');
        }
      }
    };
    
    // Check immediately and also when visible changes
    checkAndStartSoloMode();
    
    if (isSoloMode()) {
      const updateSoloStats = () => {
        // Get time from gameProgress if available, otherwise use local timer
        let elapsedMs = 0;
        if ((window as any).gameProgress && typeof (window as any).gameProgress.getState === 'function') {
          const state = (window as any).gameProgress.getState();
          if (state && typeof state.elapsedMs === 'number') {
            elapsedMs = state.elapsedMs;
            const elapsedSeconds = Math.floor(elapsedMs / 1000);
            const formatted = formatTimeFromMs(elapsedMs);
            setFormattedTime(formatted);
            console.log('[GameHUD] ⏱️ Updating time:', formatted, 'elapsedMs:', elapsedMs, 'elapsedSeconds:', elapsedSeconds);
          }
          if (state && typeof state.score === 'number') {
            setSquadScore(state.score);
          }
        } else if (soloModeStartTime !== null) {
          elapsedMs = Date.now() - soloModeStartTime;
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          setFormattedTime(formatTime(elapsedSeconds));
        }
        
        // Force update text content directly every second
        const el = document.querySelector('[data-gamehud]') as HTMLElement;
        if (el) {
          const textElements = el.querySelectorAll('p');
          if (textElements.length >= 4) {
            const scoreEl = textElements[1] as HTMLElement;
            const timeEl = textElements[3] as HTMLElement;
            if (scoreEl) {
              const currentScore = squadScore();
              scoreEl.textContent = String(currentScore ?? 0);
              scoreEl.style.setProperty('display', 'block', 'important');
              scoreEl.style.setProperty('visibility', 'visible', 'important');
              scoreEl.style.setProperty('opacity', '1', 'important');
            }
            if (timeEl) {
              timeEl.textContent = formattedTime() || '00.00.00';
              timeEl.style.setProperty('display', 'block', 'important');
              timeEl.style.setProperty('visibility', 'visible', 'important');
              timeEl.style.setProperty('opacity', '1', 'important');
            }
          }
        }
      };
      
      // Listen to gameProgress updates
      const handleGameProgressUpdate = (e: CustomEvent) => {
        if (e.detail) {
          if (typeof e.detail.score === 'number') {
            setSquadScore(e.detail.score);
          }
          if (e.detail.elapsedMs) {
            const elapsedSeconds = Math.floor(e.detail.elapsedMs / 1000);
            setFormattedTime(formatTime(elapsedSeconds));
          }
        }
      };
      window.addEventListener('gameProgress:update', handleGameProgressUpdate as EventListener);
      
      // Start timer in gameProgress if available
      if ((window as any).gameProgress && typeof (window as any).gameProgress.startSoloTimer === 'function') {
        (window as any).gameProgress.startSoloTimer();
        console.log('[GameHUD] ✅ Solo timer started via gameProgress');
      }
      
      // Fallback: start local timer if gameProgress not available
      if (soloModeStartTime === null) {
        soloModeStartTime = Date.now();
        console.log('[GameHUD] ✅ Solo timer started locally');
      }
      
      // Update immediately
      updateSoloStats();
      
      // Update every second - use shorter interval for smoother updates
      // CRITICAL: Timer TIDAK BOLEH berhenti meskipun settings dibuka
      soloModeTimerId = window.setInterval(() => {
        updateSoloStats();
        // Also force update display - SELALU update meskipun props.visible false (karena settings mungkin dibuka)
        const el = document.querySelector('[data-gamehud]') as HTMLElement;
        if (el) {
          // FORCE SHOW GameHUD di solo mode - jangan pernah sembunyikan
          el.style.setProperty('display', 'flex', 'important');
          el.style.setProperty('visibility', 'visible', 'important');
          el.style.setProperty('opacity', '1', 'important');
          el.style.setProperty('z-index', '100021', 'important');
          el.style.setProperty('position', 'fixed', 'important');
          el.style.setProperty('top', '20px', 'important');
          el.style.setProperty('left', '20px', 'important');
          el.style.setProperty('transform', 'none', 'important');
          el.style.setProperty('will-change', 'auto', 'important');
          el.style.setProperty('pointer-events', 'auto', 'important');
          
          const textElements = el.querySelectorAll('p');
          if (textElements.length >= 4) {
            const scoreEl = textElements[1] as HTMLElement;
            const timeEl = textElements[3] as HTMLElement;
            if (scoreEl) {
              scoreEl.textContent = String(squadScore() ?? 0);
              scoreEl.style.setProperty('display', 'block', 'important');
              scoreEl.style.setProperty('visibility', 'visible', 'important');
              scoreEl.style.setProperty('opacity', '1', 'important');
            }
            if (timeEl) {
              timeEl.textContent = formattedTime() || '00.00.00';
              timeEl.style.setProperty('display', 'block', 'important');
              timeEl.style.setProperty('visibility', 'visible', 'important');
              timeEl.style.setProperty('opacity', '1', 'important');
            }
          }
        }
      }, 100); // Update every 100ms for smoother display
      console.log('[GameHUD] ✅ Solo mode timer and score tracking started - timer will NOT stop when settings opens');
    }
    
    // Also check when visible changes to start timer
    // CRITICAL: Di solo mode, selalu start timer meskipun visible false (karena settings mungkin dibuka)
    createEffect(() => {
      if (isSoloMode()) {
        // Start timer di solo mode - selalu start meskipun visible false
        if ((window as any).gameProgress && typeof (window as any).gameProgress.startSoloTimer === 'function') {
          (window as any).gameProgress.startSoloTimer();
          console.log('[GameHUD] ✅ Solo timer started when visible changed (settings may be open)');
        }
        if (soloModeStartTime === null) {
          soloModeStartTime = Date.now();
          console.log('[GameHUD] ✅ Solo timer started locally when visible changed');
        }
      }
    });

    // Check if element is in DOM after a short delay and ensure it's visible
    const checkAndFix = () => {
      // CRITICAL: Di solo mode, selalu force visibility meskipun props.visible false
      // karena GameHUD harus tetap terlihat meskipun settings dibuka
      if (!props.visible && !isSoloMode()) {
        // If not visible, hide the element (hanya di multiplayer mode)
        const element = document.querySelector('[data-gamehud]') as HTMLElement;
        if (element) {
          element.style.setProperty('display', 'none', 'important');
          element.style.setProperty('visibility', 'hidden', 'important');
          element.style.setProperty('opacity', '0', 'important');
        }
        return;
      }
      
      // Di solo mode, selalu force show meskipun props.visible false
      if (isSoloMode() && !props.visible) {
        const element = document.querySelector('[data-gamehud]') as HTMLElement;
        if (element) {
          element.style.setProperty('display', 'flex', 'important');
          element.style.setProperty('visibility', 'visible', 'important');
          element.style.setProperty('opacity', '1', 'important');
          element.style.setProperty('z-index', '100021', 'important');
          element.style.setProperty('position', 'fixed', 'important');
          element.style.setProperty('top', '20px', 'important');
          element.style.setProperty('left', '20px', 'important');
          element.style.setProperty('pointer-events', 'auto', 'important');
        }
        return;
      }
      
      const element = document.querySelector('[data-gamehud]') as HTMLElement;
      if (element) {
        // Move to body if not already there
        if (element.parentElement && element.parentElement !== document.body) {
          console.log('[GameHUD] ⚠️ Element is not direct child of body, moving to body...');
          document.body.appendChild(element);
          console.log('[GameHUD] ✅ Moved to body');
        }
        
        // Force styles with !important using setProperty - only when visible
        element.style.setProperty('z-index', '100021', 'important');
        element.style.setProperty('visibility', 'visible', 'important');
        element.style.setProperty('opacity', '1', 'important');
        element.style.setProperty('pointer-events', 'auto', 'important');
        element.style.setProperty('position', 'fixed', 'important');
        element.style.setProperty('display', 'flex', 'important');
          element.style.setProperty('left', '20px', 'important');
          element.style.setProperty('top', '20px', 'important');
          element.style.setProperty('transform', 'none', 'important');
        element.style.setProperty('width', 'auto', 'important');
        element.style.setProperty('height', 'auto', 'important');
        element.style.removeProperty('transform');
        
        // Log element position and visibility
        const rect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);
        const innerDiv = element.querySelector('div') as HTMLElement;
        const innerRect = innerDiv?.getBoundingClientRect();
        const innerStyles = innerDiv ? window.getComputedStyle(innerDiv) : null;
        console.log('[GameHUD] 🔍 Element check:', {
          inDOM: !!element,
          parent: element.parentElement?.tagName,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          zIndex: styles.zIndex,
          visibility: styles.visibility,
          opacity: styles.opacity,
          display: styles.display,
          position: styles.position,
          inViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
          innerDiv: {
            exists: !!innerDiv,
            rect: innerRect ? { top: innerRect.top, left: innerRect.left, width: innerRect.width, height: innerRect.height } : null,
            display: innerStyles?.display,
            visibility: innerStyles?.visibility,
            opacity: innerStyles?.opacity,
            backgroundColor: innerStyles?.backgroundColor,
          },
          textContent: element.textContent?.substring(0, 50)
        });
        
        // Also ensure inner div is visible (innerDiv already declared above)
        if (innerDiv) {
          innerDiv.style.setProperty('background', 'rgba(255, 255, 255, 0.98)', 'important');
          innerDiv.style.setProperty('border', '2px solid rgb(37, 99, 235)', 'important');
          innerDiv.style.setProperty('box-shadow', '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 'important');
          innerDiv.style.setProperty('display', 'block', 'important');
          innerDiv.style.setProperty('visibility', 'visible', 'important');
          innerDiv.style.setProperty('opacity', '1', 'important');
          innerDiv.style.setProperty('width', '100%', 'important');
          innerDiv.style.setProperty('height', 'auto', 'important');
          innerDiv.style.setProperty('min-width', '200px', 'important');
          innerDiv.style.setProperty('padding', '12px 16px', 'important');
          
          // Ensure all text elements are visible
          const textElements = innerDiv.querySelectorAll('p');
          console.log('[GameHUD] 🔍 Found text elements:', textElements.length);
          textElements.forEach((p, index) => {
            const pEl = p as HTMLElement;
            pEl.style.setProperty('visibility', 'visible', 'important');
            pEl.style.setProperty('opacity', '1', 'important');
            pEl.style.setProperty('display', 'block', 'important');
            pEl.style.setProperty('margin', '0', 'important');
            pEl.style.setProperty('padding', '0', 'important');
            pEl.style.setProperty('line-height', '1.2', 'important');
            const color = index % 2 === 0 ? 'rgb(71, 85, 105)' : (index === 1 ? 'rgb(37, 99, 235)' : 'rgb(15, 23, 42)');
            pEl.style.setProperty('color', color, 'important');
            const textContent = pEl.textContent || '';
            console.log(`[GameHUD] ✅ Text element ${index} styles applied:`, textContent.substring(0, 30), 'color:', color);
            
            // Log computed styles
            const pStyles = window.getComputedStyle(pEl);
            console.log(`[GameHUD] 🔍 Text element ${index} computed styles:`, {
              display: pStyles.display,
              visibility: pStyles.visibility,
              opacity: pStyles.opacity,
              color: pStyles.color,
              fontSize: pStyles.fontSize,
              textContent: textContent.substring(0, 30)
            });
          });
        } else {
          console.warn('[GameHUD] ⚠️ Inner div not found!');
        }
      } else {
        console.warn('[GameHUD] ⚠️ Element not found in DOM!');
      }
    };
    
    // Check immediately and after delays - only when visible
    const scheduleChecks = () => {
      if (!props.visible) {
        // If not visible, just hide it once
        checkAndFix();
        return;
      }
      setTimeout(checkAndFix, 50);
      setTimeout(checkAndFix, 100);
      setTimeout(checkAndFix, 200);
      setTimeout(checkAndFix, 500);
      setTimeout(checkAndFix, 1000);
      setTimeout(checkAndFix, 2000);
      setTimeout(checkAndFix, 3000);
      setTimeout(checkAndFix, 5000);
    };
    
    // CRITICAL: Di solo mode, selalu schedule checks meskipun visible false
    // karena GameHUD harus tetap terlihat meskipun settings dibuka
    if (props.visible || isSoloMode()) {
      scheduleChecks();
    } else {
      // If not visible, hide it immediately (hanya di multiplayer mode)
      if (!isSoloMode()) {
        checkAndFix();
      }
    }

    onCleanup(() => {
      if (timeIntervalId !== null) {
        clearInterval(timeIntervalId);
      }
      if (checkRoomCodeInterval !== null) {
        clearInterval(checkRoomCodeInterval);
      }
      if (visibilityCheckInterval !== null) {
        clearInterval(visibilityCheckInterval);
      }
      // CRITICAL: Di solo mode, jangan cleanup soloModeTimerId karena timer tidak boleh berhenti
      // Hanya cleanup jika bukan solo mode
      if (soloModeTimerId !== null && !isSoloMode()) {
        clearInterval(soloModeTimerId);
      }
      if (roomUnsubscribe) {
        roomUnsubscribe();
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('room:code-changed', handleRoomCodeChange);
      window.removeEventListener('room:created', handleRoomCreated);
    });
  });

  createEffect(() => {
    const room = roomData();
    const score = squadScore();
    const time = formattedTime();
    const soloMode = isSoloMode();
    
    console.log('[GameHUD] 🔄 createEffect triggered, room:', room ? 'exists' : 'null', 'status:', room?.status, 'score:', score, 'time:', time, 'soloMode:', soloMode);
    
    // In solo mode, don't reset score/time when no room data
    if (soloMode) {
      // Solo mode: use gameProgress state, don't reset
      if ((window as any).gameProgress && typeof (window as any).gameProgress.getState === 'function') {
        const state = (window as any).gameProgress.getState();
        if (state) {
          if (state.elapsedMs !== undefined) {
            const elapsedSeconds = Math.floor(state.elapsedMs / 1000);
            setFormattedTime(formatTime(elapsedSeconds));
          }
          if (typeof state.score === 'number') {
            setSquadScore(state.score);
          }
        }
      }
      setIsInProgress(true); // Solo mode is always in progress when visible
      
      // Force visibility update in solo mode
      setTimeout(() => {
        forceVisibility();
        // Also force update text content directly
        const el = document.querySelector('[data-gamehud]') as HTMLElement;
        if (el) {
          const textElements = el.querySelectorAll('p');
          if (textElements.length >= 4) {
            const scoreEl = textElements[1] as HTMLElement;
            const timeEl = textElements[3] as HTMLElement;
            if (scoreEl) {
              const currentScore = squadScore();
              scoreEl.textContent = String(currentScore ?? 0);
              scoreEl.style.setProperty('display', 'block', 'important');
              scoreEl.style.setProperty('visibility', 'visible', 'important');
              scoreEl.style.setProperty('opacity', '1', 'important');
            }
            if (timeEl) {
              timeEl.textContent = formattedTime() || '00.00.00';
              timeEl.style.setProperty('display', 'block', 'important');
              timeEl.style.setProperty('visibility', 'visible', 'important');
              timeEl.style.setProperty('opacity', '1', 'important');
            }
          }
        }
      }, 0);
      setTimeout(() => forceVisibility(), 100);
      setTimeout(() => forceVisibility(), 300);
      setTimeout(() => forceVisibility(), 500);
    } else if (room) {
      // Multiplayer mode: use room data
      setIsInProgress(room.status === 'in-progress');
      console.log('[GameHUD] 🔄 Updating score and time from createEffect, isInProgress:', room.status === 'in-progress');
      updateSquadScore(room);
      updateTime(room);
      
      // Force visibility update when room status changes
      if (room.status === 'in-progress') {
        setTimeout(() => {
          forceVisibility();
          // Also force update text content directly
          const el = document.querySelector('[data-gamehud]') as HTMLElement;
          if (el) {
            const textElements = el.querySelectorAll('p');
            if (textElements.length >= 4) {
              const scoreEl = textElements[1] as HTMLElement;
              const timeEl = textElements[3] as HTMLElement;
              if (scoreEl) {
                scoreEl.textContent = String(squadScore() ?? 0);
                scoreEl.style.setProperty('display', 'block', 'important');
                scoreEl.style.setProperty('visibility', 'visible', 'important');
                scoreEl.style.setProperty('opacity', '1', 'important');
              }
              if (timeEl) {
                timeEl.textContent = formattedTime() || '00.00.00';
                timeEl.style.setProperty('display', 'block', 'important');
                timeEl.style.setProperty('visibility', 'visible', 'important');
                timeEl.style.setProperty('opacity', '1', 'important');
              }
            }
          }
        }, 0);
        setTimeout(() => forceVisibility(), 100);
        setTimeout(() => forceVisibility(), 300);
        setTimeout(() => forceVisibility(), 500);
      }
    } else {
      // No room and not solo mode: reset
      setIsInProgress(false);
      console.log('[GameHUD] 🔄 No room data and not solo mode, resetting score and time');
      setSquadScore(0);
      setFormattedTime('00.00.00');
    }
  });

  createEffect(() => {
    if (props.visible) {
      console.log('[GameHUD] ✅ Visible changed to true, triggering checkAndFix...');
      // Re-check and fix when visible changes - multiple times
      const fixWhenVisible = () => {
        setTimeout(() => {
          checkAndFix();
        }, 0);
        setTimeout(() => {
          checkAndFix();
        }, 50);
        setTimeout(() => {
          checkAndFix();
        }, 100);
        setTimeout(() => {
          checkAndFix();
        }, 200);
        setTimeout(() => {
          checkAndFix();
        }, 500);
      };
      fixWhenVisible();
    } else {
      // CRITICAL: Di solo mode, jangan sembunyikan GameHUD meskipun visible false
      // karena timer harus tetap berjalan
      if (isSoloMode()) {
        console.log('[GameHUD] ⚠️ Visible changed to false in solo mode, but keeping GameHUD visible for timer');
        // Tetap tampilkan GameHUD di solo mode
        const element = document.querySelector('[data-gamehud]') as HTMLElement;
        if (element) {
          element.style.setProperty('display', 'flex', 'important');
          element.style.setProperty('visibility', 'visible', 'important');
          element.style.setProperty('opacity', '1', 'important');
          element.style.setProperty('z-index', '100021', 'important');
          element.style.setProperty('pointer-events', 'auto', 'important');
        }
      } else {
        console.log('[GameHUD] ❌ Visible changed to false, hiding GameHUD...');
        // Hide GameHUD when visible is false (only in multiplayer mode)
        const element = document.querySelector('[data-gamehud]') as HTMLElement;
        if (element) {
          element.style.setProperty('display', 'none', 'important');
          element.style.setProperty('visibility', 'hidden', 'important');
          element.style.setProperty('opacity', '0', 'important');
          element.style.setProperty('pointer-events', 'none', 'important');
        }
      }
    }
  });

  createEffect(() => {
    if (props.visible) {
      // Re-check and fix when visible changes - multiple times
      const fixWhenVisible = () => {
        setTimeout(() => {
          const element = document.querySelector('[data-gamehud]') as HTMLElement;
          if (element) {
            console.log('[GameHUD] ✅ Found element when visible changed, applying styles...');
            element.style.setProperty('z-index', '100021', 'important');
            element.style.setProperty('visibility', 'visible', 'important');
            element.style.setProperty('opacity', '1', 'important');
            element.style.setProperty('display', 'flex', 'important');
            element.style.setProperty('position', 'fixed', 'important');
            element.style.setProperty('left', '20px', 'important');
            element.style.setProperty('top', '20px', 'important');
            element.style.setProperty('transform', 'none', 'important');
            element.style.setProperty('width', 'auto', 'important');
            element.style.setProperty('height', 'auto', 'important');
            
            const innerDiv = element.querySelector('div') as HTMLElement;
            if (innerDiv) {
              innerDiv.style.setProperty('display', 'block', 'important');
              innerDiv.style.setProperty('visibility', 'visible', 'important');
              innerDiv.style.setProperty('opacity', '1', 'important');
              innerDiv.style.setProperty('background', 'rgba(255, 255, 255, 0.98)', 'important');
              innerDiv.style.setProperty('padding', '12px 16px', 'important');
              
              const textElements = innerDiv.querySelectorAll('p');
              console.log('[GameHUD] ✅ Found', textElements.length, 'text elements');
              textElements.forEach((p, index) => {
                const pEl = p as HTMLElement;
                pEl.style.setProperty('display', 'block', 'important');
                pEl.style.setProperty('visibility', 'visible', 'important');
                pEl.style.setProperty('opacity', '1', 'important');
                pEl.style.setProperty('margin', '0', 'important');
                pEl.style.setProperty('padding', '0', 'important');
                console.log(`[GameHUD] ✅ Text element ${index} fixed:`, pEl.textContent?.substring(0, 30));
              });
            } else {
              console.warn('[GameHUD] ⚠️ Inner div not found when visible changed');
            }
          } else {
            console.warn('[GameHUD] ⚠️ Element not found when visible changed');
          }
        }, 50);
      };
      forceVisibility();
      setTimeout(() => forceVisibility(), 0);
      setTimeout(() => forceVisibility(), 50);
      setTimeout(() => forceVisibility(), 100);
      setTimeout(() => forceVisibility(), 200);
      setTimeout(() => forceVisibility(), 500);
      setTimeout(() => forceVisibility(), 1000);
    }
  });

  // GameHUD harus tetap terlihat meskipun settings dibuka - timer tidak boleh berhenti
  const shouldShow = createMemo(() => {
    // Di solo mode, selalu show jika visible (meskipun settings dibuka)
    if (isSoloMode()) {
      return props.visible;
    }
    // Di multiplayer mode, show jika visible dan in progress
    return props.visible && isInProgress();
  });
  
  // Pastikan timer tidak berhenti meskipun settings dibuka
  createEffect(() => {
    if (isSoloMode() && props.visible) {
      // Pastikan timer tetap berjalan
      if ((window as any).gameProgress && typeof (window as any).gameProgress.startSoloTimer === 'function') {
        (window as any).gameProgress.startSoloTimer();
        console.log('[GameHUD] ✅ Ensuring timer keeps running (settings may be open)');
      }
    }
  });
  
  // Aggressive visibility checker - runs continuously when visible
  let visibilityCheckInterval: number | null = null;
  
  // Force visibility function - called from multiple places
  const forceVisibility = () => {
    const el = document.querySelector('[data-gamehud]') as HTMLElement;
    if (!el) {
      console.log('[GameHUD] ⚠️ Element not found in DOM');
      return;
    }
    
    const show = shouldShow();
    const visible = props.visible;
    const inProgress = isInProgress();
    
    // CRITICAL: Di solo mode, selalu show jika props.visible true (meskipun settings dibuka)
    const shouldForceShow = isSoloMode() ? props.visible : show;
    
    if (shouldForceShow) {
      // FORCE VISIBLE - use cssText to override everything
      // z-index harus lebih tinggi dari settings screen (100020) agar tetap terlihat
      // CRITICAL: Gunakan posisi yang konsisten (20px, 20px) untuk mencegah getaran
      el.style.cssText = 'z-index: 100021 !important; position: fixed !important; left: 20px !important; top: 20px !important; width: auto !important; height: auto !important; display: flex !important; visibility: visible !important; opacity: 1 !important; pointer-events: auto !important; transform: none !important;';
      
      // Remove data-hidden-by attribute if exists
      el.removeAttribute('data-hidden-by');
      
      // Move to body if needed
      if (el.parentElement !== document.body) {
        console.log('[GameHUD] 🔄 Moving element to body');
        document.body.appendChild(el);
      }
      
      // Force inner div visible
      const innerDiv = el.querySelector('div') as HTMLElement;
      if (innerDiv) {
        innerDiv.style.cssText = 'background: rgba(255, 255, 255, 1) !important; border: 3px solid rgb(37, 99, 235) !important; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important; min-width: 250px !important; min-height: 80px !important; padding: 16px 20px !important; display: block !important; visibility: visible !important; opacity: 1 !important;';
        // Remove data-hidden-by attribute if exists
        innerDiv.removeAttribute('data-hidden-by');
      }
      
      // Force flex container visible
      const flexContainer = el.querySelector('.flex.items-center.justify-between') as HTMLElement;
      if (flexContainer) {
        flexContainer.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; gap: 24px !important; align-items: center !important;';
        flexContainer.removeAttribute('data-hidden-by');
      }
      
      // Force all text elements visible with explicit colors and remove data-hidden-by
      const textElements = el.querySelectorAll('p');
      console.log('[GameHUD] 🔍 Found text elements:', textElements.length);
      textElements.forEach((p, idx) => {
        const pEl = p as HTMLElement;
        pEl.removeAttribute('data-hidden-by');
        
        // Force text content to be visible
        const currentText = pEl.textContent || pEl.innerText;
        console.log(`[GameHUD] 📝 Text element ${idx}: "${currentText}"`);
        
        if (idx === 0) {
          // "Skor" label
          pEl.textContent = 'Skor';
          pEl.style.cssText = 'color: #475569 !important; margin: 0 0 6px 0 !important; padding: 0 !important; display: block !important; visibility: visible !important; opacity: 1 !important; font-size: 11px !important; line-height: 1.2 !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-family: system-ui, -apple-system, sans-serif !important;';
        } else if (idx === 1) {
          // Score value - force update with current score
          const score = squadScore() ?? 0;
          pEl.textContent = String(score);
          pEl.style.cssText = 'color: #2563eb !important; line-height: 1.2 !important; display: block !important; visibility: visible !important; opacity: 1 !important; font-size: 32px !important; font-weight: 900 !important; margin: 0 !important; padding: 0 !important; font-family: system-ui, -apple-system, sans-serif !important; text-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; min-height: 38px !important;';
        } else if (idx === 2) {
          // "Waktu" label
          pEl.textContent = 'Waktu';
          pEl.style.cssText = 'color: #475569 !important; margin: 0 0 6px 0 !important; padding: 0 !important; display: block !important; visibility: visible !important; opacity: 1 !important; font-size: 11px !important; line-height: 1.2 !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-family: system-ui, -apple-system, sans-serif !important;';
        } else if (idx === 3) {
          // Time value - force update with current time
          const time = formattedTime() || '00.00.00';
          pEl.textContent = time;
          pEl.style.cssText = 'color: #0f172a !important; line-height: 1.2 !important; display: block !important; visibility: visible !important; opacity: 1 !important; font-size: 24px !important; font-weight: 900 !important; font-family: "Courier New", monospace !important; margin: 0 !important; padding: 0 !important; text-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; min-height: 28px !important; min-width: 80px !important;';
        }
        
        // Double check - force all properties again
        pEl.style.setProperty('display', 'block', 'important');
        pEl.style.setProperty('visibility', 'visible', 'important');
        pEl.style.setProperty('opacity', '1', 'important');
        pEl.style.setProperty('color', pEl.style.color || '#000000', 'important');
        
        // Force text to be visible by setting innerHTML as well
        if (idx === 0 && !pEl.textContent) {
          pEl.innerHTML = 'Skor';
        } else if (idx === 1) {
          pEl.innerHTML = String(squadScore() ?? 0);
        } else if (idx === 2 && !pEl.textContent) {
          pEl.innerHTML = 'Waktu';
        } else if (idx === 3) {
          pEl.innerHTML = formattedTime() || '00.00.00';
        }
      });
      
      console.log('[GameHUD] ✅ FORCED VISIBLE - shouldShow:', show, 'visible:', visible, 'isInProgress:', inProgress, 'textElements:', textElements.length, 'score:', squadScore(), 'time:', formattedTime());
    } else {
      // CRITICAL: Di solo mode, jangan pernah sembunyikan GameHUD
      // karena timer harus tetap berjalan dan terlihat meskipun settings dibuka
      if (isSoloMode()) {
        console.log('[GameHUD] ⚠️ shouldShow false in solo mode, but keeping visible for timer');
        // Tetap tampilkan GameHUD
        el.style.setProperty('display', 'flex', 'important');
        el.style.setProperty('visibility', 'visible', 'important');
        el.style.setProperty('opacity', '1', 'important');
        el.style.setProperty('z-index', '100021', 'important');
      } else {
        // HIDE (hanya di multiplayer mode)
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
      }
    }
  };
  
  createEffect(() => {
    const show = shouldShow();
    const visible = props.visible;
    const inProgress = isInProgress();
    const score = squadScore();
    const time = formattedTime();
    
    // CRITICAL: Di solo mode, selalu force show meskipun show false (karena settings mungkin dibuka)
    const shouldForceShow = isSoloMode() ? props.visible : show;
    
    // Immediate update
    forceVisibility();
    
    // Also force update text content immediately
    setTimeout(() => {
      const el = document.querySelector('[data-gamehud]') as HTMLElement;
      if (el && shouldForceShow) {
        const textElements = el.querySelectorAll('p');
        if (textElements.length >= 4) {
          const scoreEl = textElements[1] as HTMLElement;
          const timeEl = textElements[3] as HTMLElement;
          if (scoreEl) {
            scoreEl.textContent = String(score ?? 0);
            scoreEl.style.setProperty('display', 'block', 'important');
            scoreEl.style.setProperty('visibility', 'visible', 'important');
            scoreEl.style.setProperty('opacity', '1', 'important');
            scoreEl.style.setProperty('color', '#2563eb', 'important');
          }
          if (timeEl) {
            timeEl.textContent = time || '00.00.00';
            timeEl.style.setProperty('display', 'block', 'important');
            timeEl.style.setProperty('visibility', 'visible', 'important');
            timeEl.style.setProperty('opacity', '1', 'important');
            timeEl.style.setProperty('color', '#0f172a', 'important');
          }
        }
      }
    }, 0);
    
    // Continuous checking when should be visible - check every 50ms
    // CRITICAL: Di solo mode, selalu check meskipun show false
    if (shouldForceShow) {
      if (visibilityCheckInterval) {
        clearInterval(visibilityCheckInterval);
      }
      visibilityCheckInterval = setInterval(() => {
        forceVisibility();
        // Also update text content continuously
        const el = document.querySelector('[data-gamehud]') as HTMLElement;
        if (el) {
          // CRITICAL: Pastikan posisi tetap stabil - jangan ubah posisi setiap kali
          // Hanya update posisi jika benar-benar berbeda untuk mencegah getaran
          const computedStyle = window.getComputedStyle(el);
          const currentLeft = computedStyle.left;
          const currentTop = computedStyle.top;
          if (currentLeft !== '20px' || currentTop !== '20px') {
            el.style.setProperty('left', '20px', 'important');
            el.style.setProperty('top', '20px', 'important');
            el.style.setProperty('transform', 'none', 'important');
            el.style.setProperty('will-change', 'auto', 'important');
          }
          
          const textElements = el.querySelectorAll('p');
          if (textElements.length >= 4) {
            const scoreEl = textElements[1] as HTMLElement;
            const timeEl = textElements[3] as HTMLElement;
            if (scoreEl) {
              scoreEl.textContent = String(squadScore() ?? 0);
            }
            if (timeEl) {
              timeEl.textContent = formattedTime() || '00.00.00';
            }
          }
        }
      }, 50) as unknown as number;
    } else {
      // CRITICAL: Di solo mode, jangan stop interval meskipun show false
      if (!isSoloMode()) {
        if (visibilityCheckInterval) {
          clearInterval(visibilityCheckInterval);
          visibilityCheckInterval = null;
        }
      }
    }
    
    // Cleanup
    return () => {
      // CRITICAL: Di solo mode, jangan cleanup interval
      if (!isSoloMode() && visibilityCheckInterval) {
        clearInterval(visibilityCheckInterval);
        visibilityCheckInterval = null;
      }
    };
  });
  
  // Create reactive style
  const containerStyle = createMemo(() => {
    const show = shouldShow();
    // z-index harus lebih tinggi dari settings screen (100020) agar tetap terlihat
    // CRITICAL: Gunakan posisi yang konsisten (20px, 20px) untuk mencegah getaran
    return `z-index: 100021 !important; position: fixed !important; left: 20px !important; top: 20px !important; width: auto !important; height: auto !important; display: ${show ? 'flex' : 'none'} !important; visibility: ${show ? 'visible' : 'hidden'} !important; opacity: ${show ? '1' : '0'} !important; pointer-events: ${show ? 'auto' : 'none'} !important; transform: none !important;`;
  });
  
  return (
    <div 
      data-gamehud
      class="fixed left-5 top-5 z-[100021]"
      style="z-index: 100021 !important; position: fixed !important; left: 20px !important; top: 20px !important; transform: none !important;"
      role="status"
      aria-live="polite"
      ref={(el) => {
        if (el) {
          console.log('[GameHUD] 🎨 Element ref callback - element mounted, visible:', props.visible, 'isInProgress:', isInProgress());
          
          // Move to body immediately
          if (el.parentElement !== document.body) {
            document.body.appendChild(el);
          }
          
          // Force visibility immediately
          forceVisibility();
          
          // Also force after delays
          setTimeout(() => forceVisibility(), 0);
          setTimeout(() => forceVisibility(), 50);
          setTimeout(() => forceVisibility(), 100);
          setTimeout(() => forceVisibility(), 200);
          setTimeout(() => forceVisibility(), 500);
          
          setTimeout(() => {
              const rect = el.getBoundingClientRect();
              const styles = window.getComputedStyle(el);
              const innerDiv = el.querySelector('div') as HTMLElement;
              const innerRect = innerDiv?.getBoundingClientRect();
              const innerStyles = innerDiv ? window.getComputedStyle(innerDiv) : null;
              const textElements = el.querySelectorAll('p');
              console.log('[GameHUD] 🔍 Element ref check:', {
                inDOM: !!el,
                visible: props.visible,
                isInProgress: isInProgress(),
                shouldShow: shouldShow(),
                rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                zIndex: styles.zIndex,
                visibility: styles.visibility,
                opacity: styles.opacity,
                display: styles.display,
                position: styles.position,
                innerDiv: {
                  exists: !!innerDiv,
                  rect: innerRect ? { top: innerRect.top, left: innerRect.left, width: innerRect.width, height: innerRect.height } : null,
                  display: innerStyles?.display,
                  visibility: innerStyles?.visibility,
                  opacity: innerStyles?.opacity,
                  backgroundColor: innerStyles?.backgroundColor,
                },
                textElementsCount: textElements.length,
                textContent: el.textContent?.substring(0, 100),
                inViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
              });
              
              // Force update styles again after a delay
              const showNow = shouldShow();
              el.style.setProperty('display', showNow ? 'flex' : 'none', 'important');
              el.style.setProperty('visibility', showNow ? 'visible' : 'hidden', 'important');
              el.style.setProperty('opacity', showNow ? '1' : '0', 'important');
            }, 100);
          }
        }}
    >
        <div 
          class="rounded-2xl border-2 border-blue-600 bg-white/98 px-4 py-3 shadow-2xl backdrop-blur-md"
          style="background: rgba(255, 255, 255, 1) !important; border: 3px solid rgb(37, 99, 235) !important; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important; min-width: 250px !important; min-height: 80px !important; padding: 16px 20px !important; display: block !important; visibility: visible !important; opacity: 1 !important;"
        >
          <div class="flex items-center justify-between gap-6" style="display: flex !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; gap: 24px !important; align-items: center !important;">
            <div style="display: flex !important; flex-direction: column !important; visibility: visible !important; opacity: 1 !important; flex: 1 !important;">
              <p style="color: #475569 !important; margin: 0 0 6px 0 !important; padding: 0 !important; display: block !important; visibility: visible !important; opacity: 1 !important; font-size: 11px !important; line-height: 1.2 !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-family: system-ui, -apple-system, sans-serif !important;">
                Skor
              </p>
              <p style="color: #2563eb !important; line-height: 1.2 !important; display: block !important; visibility: visible !important; opacity: 1 !important; font-size: 32px !important; font-weight: 900 !important; margin: 0 !important; padding: 0 !important; font-family: system-ui, -apple-system, sans-serif !important; text-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; min-height: 38px !important;">
                {squadScore() ?? 0}
              </p>
            </div>
            <div class="flex flex-col items-end" style="display: flex !important; visibility: visible !important; opacity: 1 !important; flex-direction: column !important; align-items: flex-end !important;">
              <p style="color: #475569 !important; margin: 0 0 6px 0 !important; padding: 0 !important; display: block !important; visibility: visible !important; opacity: 1 !important; font-size: 11px !important; line-height: 1.2 !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-family: system-ui, -apple-system, sans-serif !important;">
                Waktu
              </p>
              <p style="color: #0f172a !important; line-height: 1.2 !important; display: block !important; visibility: visible !important; opacity: 1 !important; font-size: 24px !important; font-weight: 900 !important; font-family: 'Courier New', monospace !important; margin: 0 !important; padding: 0 !important; text-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; min-height: 28px !important; min-width: 80px !important;">
                {formattedTime() || '00.00.00'}
              </p>
            </div>
          </div>
        </div>
      </div>
  );
};
