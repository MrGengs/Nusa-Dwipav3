import './assets/style.css';
import { render } from 'solid-js/web';
import { Show, createEffect, createResource, createSignal, onMount } from 'solid-js';
import { IoSettingsOutline } from 'solid-icons/io';
import { BsClipboardCheck } from 'solid-icons/bs';
import { Avatar, AvatarSelect, defaultOutfits, setGender, setOutfit } from './AvatarSelect';
import { MicButton, nafAdapter } from './MicButton';
import { UsernameInput } from './UsernameInput';
import { ChatButton } from './Chat';
import { UsersButton } from './UsersButton';
import { VideoThumbnails } from './VideoThumbnails';
import { ShareCameraButton, ShareScreenButton } from './ShareScreenButton';
import { BackpackButton } from './Backpack';
import { ItemCollectionPopup } from './ItemCollectionPopup';
import { SimpleNotification, showSimpleNotification } from './SimpleNotification';
import { MusicControl } from './MusicControl';
import { MusicSettingsScreen } from './MusicSettingsScreen';
import { SatpamDialog } from './SatpamDialog';
import { QuizStatusPanel } from './QuizStatusPanel';
import './systems/video';
import { uiSettings } from './config';
import { addCollectedItem, initializeUserData, getUserData, waitForAuth, auth, updateQuizStats } from './firebaseService';
import { GameHUD } from './GameHUD';
import './start-experience';
import { experienceStarted, setExperienceStarted, setExperiencePhase } from './gameSignals';
import { avatarSrc, setAvatarSrc, avatarLoading, setAvatarLoading } from './avatarSignals';
import { RoomFlow } from './RoomFlow';

const DEVELOPER_UID = 'ocN7zKKbicS1TRVLeKtNIuPYqet2';

const [showSettings, setShowSettings] = createSignal(false);
const [showMusicSettings, setShowMusicSettings] = createSignal(false);
const [showQuizSummary, setShowQuizSummary] = createSignal(false);
const [entered, setEntered] = createSignal(false);
const [sceneLoaded, setSceneLoaded] = createSignal(false);
const [gameStarted, setGameStarted] = createSignal(false);
const [isDeveloper, setIsDeveloper] = createSignal(false);

export const avatarsBaseUrl = 'https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/';
const fetchAvatars = async () => {
  const response = await fetch(avatarsBaseUrl + 'avatars.json');
  if (!response.ok) {
    return [];
  }
  const results = await response.json();
  return results;
};

const [avatars] = createResource<Avatar[]>(fetchAvatars);

const setRandomAvatar = () => {
  const outfits = uiSettings.outfits ?? defaultOutfits;
  const allAvatars = avatars();
  if (!allAvatars) return;
  const filteredAvatars = allAvatars.filter((avatar) => outfits.includes(avatar.outfit));
  const idx = Math.floor(Math.random() * filteredAvatars.length);
  const avatar = filteredAvatars[idx];
  setAvatarSrc(avatarsBaseUrl + avatar.model);
  setOutfit(avatar.outfit);
  setGender(avatar.gender);
};

const UserForm = (props: { showEnterButton?: boolean; onEnterClick?: () => void }) => {
  // Check if user is authenticated
  const isAuthenticated = () => {
    return localStorage.getItem('userUsername') !== null;
  };

  return (
    <div class="flex w-full max-w-5xl flex-col gap-4 p-4 pb-8">
      <Show when={!isAuthenticated()}>
        <div class="flex flex-col gap-2 mb-4">
          <label class="font-bold" for="username">
            Your name
          </label>
          <UsernameInput entity="#rig" enableColorPicker={false} />
        </div>
      </Show>
      <Show when={isAuthenticated()}>
        <div class="flex flex-col gap-2 mb-4">
          <label class="font-bold" for="username">
            {localStorage.getItem('userUsername')}
          </label>
        </div>
      </Show>
      <AvatarSelect avatars={avatars() ?? []} outfits={uiSettings.outfits} />
      <Show when={props.showEnterButton}>
        <div class="flex justify-center mt-6 mb-4">
          <button
            type="button"
            id="playButton"
            class="btn min-w-[120px] px-6 py-3 text-base font-semibold"
            onClick={props.onEnterClick}
          >
            Enter
          </button>
        </div>
      </Show>
    </div>
  );
};

const SettingsScreen = () => {
  return (
    <div class="naf-centered-fullscreen scrollable">
      <UserForm />
      <div class="sticky bottom-0 bg-white/95 backdrop-blur-sm w-full flex justify-center py-4 border-t border-gray-200">
        <button
          type="button"
          id="saveSettingsButton"
          class="btn min-w-[100px]"
          onClick={() => {
            setShowSettings(false);
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const startDeveloperExperience = () => {
  console.log('[Developer] Starting game directly without RoomFlow.');
  setExperiencePhase('in-game');
  setExperienceStarted(true);
  window.startExperience?.();
};

const EnterScreen = () => {
  // Check if we're in convert.html or game.html (both are solo mode)
  const isConvertPage = () => {
    if (typeof window === 'undefined') return false;
    try {
      const pathname = window.location.pathname;
      // game.html is also treated as convert page (solo mode)
      return pathname.includes('convert.html') || pathname.endsWith('/convert') || 
             pathname.includes('game.html') || pathname.endsWith('/game') ||
             (window as any).__isConvertPage === true;
    } catch {
      return false;
    }
  };

  const handleEnterClick = () => {
    if (!avatarSrc()) {
      setRandomAvatar();
    }

    setEntered(true);
    const sceneEl = document.querySelector('a-scene');
    
    // Check if we're in convert.html
    const isConvert = isConvertPage();
    
    // emit connect when the scene has loaded
    const sceneLoadedCallback = () => {
      setSceneLoaded(true);
      
      if (isConvert) {
        // For convert.html, call window.enterGame() to show scene and start experience
        console.log('[UI] Convert page detected, calling window.enterGame()...');
        // Start timer when Enter is clicked (convert.html is solo mode)
        // Wait a bit for gameProgress to be available
        setTimeout(() => {
          if ((window as any).gameProgress && typeof (window as any).gameProgress.startSoloTimer === 'function') {
            (window as any).gameProgress.startSoloTimer();
            console.log('[UI] ✅ Solo timer started when Enter clicked (convert page)');
          } else {
            console.warn('[UI] ⚠️ gameProgress.startSoloTimer not available yet, will retry...');
            // Retry after a delay
            setTimeout(() => {
              if ((window as any).gameProgress && typeof (window as any).gameProgress.startSoloTimer === 'function') {
                (window as any).gameProgress.startSoloTimer();
                console.log('[UI] ✅ Solo timer started (retry)');
              }
            }, 1000);
          }
        }, 100);
        setTimeout(() => {
          if ((window as any).enterGame) {
            (window as any).enterGame();
          } else {
            // Fallback: start experience directly
            setExperiencePhase('in-game');
            setExperienceStarted(true);
            (window as any).startExperience?.();
          }
        }, 500);
      } else if (isDeveloper()) {
        // Developer mode - skip room selection
        setExperienceStarted(false);
        setTimeout(() => {
          startDeveloperExperience();
        }, 500);
      } else {
        // Check if solo mode
        // game.html is always solo mode (no room/squad system)
        const pathname = window.location.pathname;
        const isSolo = pathname.includes('game.html') || pathname.endsWith('/game') || (window as any).__soloMode === true;
        if (isSolo) {
          // Solo mode - directly start experience
          console.log('[UI] Solo mode detected, starting experience directly...');
          // Start timer when Enter is clicked
          // Wait a bit for gameProgress to be available
          setTimeout(() => {
            if ((window as any).gameProgress && typeof (window as any).gameProgress.startSoloTimer === 'function') {
              (window as any).gameProgress.startSoloTimer();
              console.log('[UI] ✅ Solo timer started when Enter clicked (solo mode)');
            } else {
              console.warn('[UI] ⚠️ gameProgress.startSoloTimer not available yet, will retry...');
              // Retry after a delay
              setTimeout(() => {
                if ((window as any).gameProgress && typeof (window as any).gameProgress.startSoloTimer === 'function') {
                  (window as any).gameProgress.startSoloTimer();
                  console.log('[UI] ✅ Solo timer started (retry)');
                }
              }, 1000);
            }
          }, 100);
          setExperienceStarted(false);
          setTimeout(() => {
            setExperiencePhase('in-game');
            setExperienceStarted(true);
            (window as any).startExperience?.();
          }, 500);
        } else {
          setExperienceStarted(false);
          setExperiencePhase('room-selection');
        }
      }
      // @ts-ignore
      sceneEl?.emit('connect');
    };

    // @ts-ignore
    if (sceneEl && sceneEl.hasLoaded) {
      sceneLoadedCallback();
    } else if (sceneEl) {
      // @ts-ignore
      sceneEl.addEventListener('loaded', sceneLoadedCallback);
    } else {
      // Scene not found, but still proceed for convert.html
      if (isConvert) {
        console.log('[UI] Scene not found, but proceeding for convert.html...');
        setTimeout(() => {
          if ((window as any).enterGame) {
            (window as any).enterGame();
          }
        }, 500);
      }
    }
  };

  return (
    <div class="naf-centered-fullscreen scrollable">
      <UserForm showEnterButton={true} onEnterClick={handleEnterClick} />
    </div>
  );
};

const TopBarRight = () => {
  console.log('[TopBarRight] Rendering TopBarRight component');
  // Use onMount to verify element is in DOM and ensure it's visible
  onMount(() => {
    setTimeout(() => {
      const el = document.querySelector('.naf-top-bar-right') as HTMLElement;
      if (el) {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        console.log('[TopBarRight] ✅ Element found in DOM:', el);
        console.log('[TopBarRight] Position:', { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height });
        console.log('[TopBarRight] Z-index:', styles.zIndex);
        console.log('[TopBarRight] Visibility:', styles.visibility);
        console.log('[TopBarRight] Opacity:', styles.opacity);
        console.log('[TopBarRight] Display:', styles.display);
        console.log('[TopBarRight] Position CSS:', styles.position);
        console.log('[TopBarRight] Top:', styles.top, 'Right:', styles.right);
        
        // Check if element is in viewport
        const isInViewport = rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
        console.log('[TopBarRight] Is in viewport:', isInViewport);
        
        // Check parent elements
        let parent = el.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
          const parentStyles = window.getComputedStyle(parent);
          console.log(`[TopBarRight] Parent ${depth}:`, parent.tagName, parent.className, 'display:', parentStyles.display, 'visibility:', parentStyles.visibility, 'opacity:', parentStyles.opacity, 'z-index:', parentStyles.zIndex);
          parent = parent.parentElement;
          depth++;
        }
        
        // Force element to be visible and move to body if needed
        if (el.parentElement && el.parentElement !== document.body) {
          console.log('[TopBarRight] ⚠️ Element is not direct child of body, moving to body...');
          document.body.appendChild(el);
        }
        
        // Force element to be visible
        el.style.setProperty('top', '24px', 'important');
        el.style.setProperty('right', '24px', 'important');
        el.style.setProperty('z-index', '99999', 'important');
        el.style.setProperty('position', 'fixed', 'important');
        el.style.setProperty('visibility', 'visible', 'important');
        el.style.setProperty('opacity', '1', 'important');
        el.style.setProperty('display', 'flex', 'important');
        // Background removed - no longer needed
        console.log('[TopBarRight] ✅ Forced styles applied');
      } else {
        console.error('[TopBarRight] ❌ Element NOT found in DOM!');
      }
    }, 100);
  });
  return (
    <div 
      class="naf-top-bar-right" 
      style="z-index: 9999 !important; position: fixed !important; visibility: visible !important; opacity: 1 !important; pointer-events: auto !important; display: flex !important;"
    >
      <button
        type="button"
        class="btn text-sm"
        onClick={() => {
          // Keluar dari room dan kembali ke pemilihan room
          if ((window as any).leaveRoomAndReturnToSelection) {
            (window as any).leaveRoomAndReturnToSelection();
          } else {
            // Fallback ke logout function
            window.logout?.();
          }
        }}
      >
        Keluar Room
      </button>
      <Show when={uiSettings.showDieButton}>
        <button
          type="button"
          class="btn text-sm"
          onClick={() => {
            // Respawn to checkpoint when die
            // @ts-ignore
            window.respawnToCheckpoint();
          }}
        >
          Die
        </button>
      </Show>
    </div>
  );
};

const BottomBarCenter = () => {
  console.log('[BottomBarCenter] Rendering BottomBarCenter component');
  // Use onMount to verify element is in DOM and ensure it's visible
  onMount(() => {
    setTimeout(() => {
      const el = document.querySelector('.naf-bottom-bar-center') as HTMLElement;
      if (el) {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        console.log('[BottomBarCenter] ✅ Element found in DOM:', el);
        console.log('[BottomBarCenter] Position:', { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height });
        console.log('[BottomBarCenter] Z-index:', styles.zIndex);
        console.log('[BottomBarCenter] Visibility:', styles.visibility);
        console.log('[BottomBarCenter] Opacity:', styles.opacity);
        console.log('[BottomBarCenter] Display:', styles.display);
        console.log('[BottomBarCenter] Position CSS:', styles.position);
        console.log('[BottomBarCenter] Bottom:', styles.bottom);
        
        // Check if element is in viewport
        const isInViewport = rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
        console.log('[BottomBarCenter] Is in viewport:', isInViewport);
        
        // Check parent elements
        let parent = el.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
          const parentStyles = window.getComputedStyle(parent);
          console.log(`[BottomBarCenter] Parent ${depth}:`, parent.tagName, parent.className, 'display:', parentStyles.display, 'visibility:', parentStyles.visibility, 'opacity:', parentStyles.opacity, 'z-index:', parentStyles.zIndex);
          parent = parent.parentElement;
          depth++;
        }
        
        // Force element to be visible and move to body if needed
        if (el.parentElement && el.parentElement !== document.body) {
          console.log('[BottomBarCenter] ⚠️ Element is not direct child of body, moving to body...');
          document.body.appendChild(el);
        }
        
        // Force element to be visible
        el.style.setProperty('bottom', '24px', 'important');
        el.style.setProperty('left', '50%', 'important');
        el.style.setProperty('transform', 'translateX(-50%)', 'important');
        el.style.setProperty('z-index', '99999', 'important');
        el.style.setProperty('position', 'fixed', 'important');
        el.style.setProperty('visibility', 'visible', 'important');
        el.style.setProperty('opacity', '1', 'important');
        el.style.setProperty('display', 'flex', 'important');
        // Background removed - no longer needed
        console.log('[BottomBarCenter] ✅ Forced styles applied');
      } else {
        console.error('[BottomBarCenter] ❌ Element NOT found in DOM!');
      }
    }, 100);
  });
  return (
    <div 
      class="naf-bottom-bar-center" 
      style="z-index: 9999 !important; position: fixed !important; visibility: visible !important; opacity: 1 !important; pointer-events: auto !important; display: flex !important;"
    >
      <button
        type="button"
        id="settingsButton"
        class="btn-secondary btn-rounded"
        onClick={() => {
          setShowMusicSettings(true);
        }}
        title="Music Settings"
      >
        <IoSettingsOutline size={24} />
      </button>
      <button
        type="button"
        class="btn-secondary btn-rounded"
        onClick={() => setShowQuizSummary(true)}
        title="Ringkasan Kuis Rumah Adat"
      >
        <BsClipboardCheck size={22} />
      </button>
      <BackpackButton />
      <MicButton entity="#rig" />
      <Show when={nafAdapter() === 'janus'}>
        <ShareCameraButton />
        <ShareScreenButton />
      </Show>
      <UsersButton />
      <ChatButton />
    </div>
  );
};

const App = () => {
  onMount(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId === DEVELOPER_UID) {
      setIsDeveloper(true);
      console.log('[Developer] Developer mode enabled for this session.');
    }

    const rig = document.getElementById('rig');
    rig?.addEventListener('model-loaded', () => {
      setAvatarLoading(false);
    });
    
    // Listen for close music settings event
    window.addEventListener('closeMusicSettings', () => {
      setShowMusicSettings(false);
    });
    
    // Set authenticated username for player-info if user is authenticated
    const authUsername = localStorage.getItem('userUsername');
    if (authUsername) {
      console.log('[Auth] Setting authenticated username for player-info:', authUsername);
      const info = {
        name: authUsername,
        color: localStorage.getItem('color') || '#ffffff',
      };
      // @ts-ignore
      document.querySelector('#player')?.setAttribute('player-info', info);
    }
    
    // Expose fungsi ke window setelah component mount
    // Create a wrapper that accepts both formats: (item: NotificationItem) or (message: string, type?: 'success' | 'error' | 'info' | 'warning')
    (window as any).showSimpleNotification = (itemOrMessage: any, type?: 'success' | 'error' | 'info' | 'warning') => {
      // If first argument is a string, convert it to NotificationItem format
      if (typeof itemOrMessage === 'string') {
        const message = itemOrMessage;
        const notificationType = type || 'info';
        
        // Map type to appropriate emoji and category
        const typeConfig = {
          success: { emoji: '✅', category: 'info', title: 'Berhasil' },
          error: { emoji: '❌', category: 'info', title: 'Error' },
          info: { emoji: 'ℹ️', category: 'info', title: 'Informasi' },
          warning: { emoji: '⚠️', category: 'info', title: 'Peringatan' }
        };
        
        const config = typeConfig[notificationType] || typeConfig.info;
        
        // Create NotificationItem from string message
        const notificationItem = {
          id: `notification-${Date.now()}`,
          title: `${config.emoji} ${config.title}`,
          description: message,
          imageUrl: '', // No image for simple notifications
          category: config.category
        };
        
        showSimpleNotification(notificationItem);
      } else {
        // If first argument is already a NotificationItem, use it directly
        showSimpleNotification(itemOrMessage);
      }
    };
    console.log('🔔 UI: showSimpleNotification exposed to window (with string/type support)');
    
    // Expose Firebase functions
    (window as any).saveCollectedItemToFirestore = async (userId: string, itemId: string) => {
      try {
        await addCollectedItem(userId, itemId);
        console.log('[UI] Item saved to Firestore:', itemId);
      } catch (error) {
        console.error('[UI] Error saving item to Firestore:', error);
        throw error;
      }
    };
    
    // Expose getUserData function for checking collected items
    (window as any).getUserDataFromFirestore = async (userId: string) => {
      try {
        const userData = await getUserData(userId);
        return userData;
      } catch (error) {
        console.error('[UI] Error getting user data from Firestore:', error);
        return null;
      }
    };
    
    console.log('🔥 UI: Firebase functions exposed to window');
    
    (window as any).startExperience = () => {
      if (gameStarted()) return;
      setGameStarted(true);
      // Ensure entered and sceneLoaded are true when starting experience
      setEntered(true);
      setSceneLoaded(true);
      window.dispatchEvent(new CustomEvent('nusa:start-experience'));
    };
    
    // Expose functions to set entered and sceneLoaded for RoomFlow
    (window as any).setEntered = (value: boolean) => {
      console.log('[UI] Setting entered to:', value);
      setEntered(value);
    };
    
    (window as any).setSceneLoaded = (value: boolean) => {
      console.log('[UI] Setting sceneLoaded to:', value);
      setSceneLoaded(value);
    };
    
    (window as any).isEntered = () => {
      return entered();
    };
    
    (window as any).updateQuizStatsToFirestore = async (userId: string, stats: any) => {
      try {
        await updateQuizStats(userId, stats);
      } catch (error) {
        console.error('[UI] Error updating quiz stats to Firestore:', error);
      }
    };
    
    // Wait for auth state and initialize user data if authenticated
    const initializeUserDataWithAuth = async () => {
      try {
        // Wait for auth state to be ready (with 10 second timeout)
        const user = await waitForAuth(10000);
        const userId = user.uid || localStorage.getItem('userId');
        const username = localStorage.getItem('userUsername');
        const email = localStorage.getItem('userEmail') || user.email || '';
        
        // Check if user is actually authenticated with Firebase Auth
        const currentUser = auth.currentUser;
        if (!currentUser && user.uid) {
          console.warn('[UI] User not authenticated with Firebase Auth, but has userId in localStorage');
          console.warn('[UI] This may cause Firestore permission errors. User should login again.');
        }
        
        if (userId && username) {
          console.log('[UI] Auth state ready, initializing user data in Firestore');
          console.log('[UI] Current auth user:', currentUser?.uid || 'null');
          console.log('[UI] Using userId:', userId);
          await initializeUserData(userId, username, email);
          console.log('[UI] User data initialized successfully');

          const latestUserData = await getUserData(userId);
          if (latestUserData) {
            const restoreArgs = {
              stats: latestUserData.quizStats,
              collectedItems: latestUserData.collectedItems ?? [],
            };
            if ((window as any).gameProgress && typeof (window as any).gameProgress.restoreFromFirestore === 'function') {
              (window as any).gameProgress.restoreFromFirestore(restoreArgs.stats, restoreArgs.collectedItems);
            } else {
              (window as any).pendingGameProgressRestore = restoreArgs;
            }
          }
        } else {
          console.warn('[UI] Missing userId or username, skipping user data initialization');
        }
      } catch (error) {
        console.error('[UI] Error waiting for auth or initializing user data:', error);
        // Don't use fallback with localStorage if auth fails - it will cause permission errors
        console.warn('[UI] Cannot initialize user data without Firebase Auth. User should login again.');
      }
    };
    
    // Initialize user data after auth state is ready
    initializeUserDataWithAuth();
    
    // Don't auto-enter for game.html - wait for user to click Enter button
    // This ensures loading and UI are fully ready before starting
    
    // Test function
    (window as any).testNotification = () => {
      console.log('🧪 Testing notification from UI...');
      showSimpleNotification({
        id: 'baju-beskap-jawa',
        title: 'Baju Beskap dari Jawa',
        description: 'Beskap adalah baju adat pria Jawa (terutama dari wilayah Solo dan Yogyakarta) yang merupakan atasan resmi dan elegan, sering disamakan dengan jas tutup. Pakaian ini sarat akan filosofi dan umumnya dikenakan dalam acara-acara penting, seperti pernikahan, upacara adat, dan pertemuan resmi.',
        imageUrl: '/assets/baju_adat/bajawa.png',
        category: 'costume'
      });
    };
  });

  createEffect(() => {
    if (avatarSrc()) {
      setAvatarLoading(true);
      const rig = document.getElementById('rig');
      // @ts-ignore
      rig.setAttribute('player-info', {
        avatarSrc: avatarSrc(),
      });
    }
  });

  // Effect to ensure authenticated username is set for player-info
  createEffect(() => {
    const authUsername = localStorage.getItem('userUsername');
    if (authUsername && entered()) {
      console.log('[Auth] Updating player-info with authenticated username:', authUsername);
      const info = {
        name: authUsername,
        color: localStorage.getItem('color') || '#ffffff',
      };
      // @ts-ignore
      document.querySelector('#player')?.setAttribute('player-info', info);
      
      // Also update the rig element to ensure it's properly set
      const rig = document.querySelector('#rig');
      if (rig) {
        // @ts-ignore
        rig.setAttribute('player-info', info);
      }
    }
  });

  createEffect(() => {
    if (!experienceStarted()) {
      setGameStarted(false);
    }
  });

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

  // Check if we're in convert.html (single-player experience with its own avatar selection)
  const isConvertPage = () => {
    if (typeof window === 'undefined') return false;
    try {
      const pathname = window.location.pathname;
      return pathname.includes('convert.html') || pathname.endsWith('/convert') || (window as any).__isConvertPage === true;
    } catch {
      return false;
    }
  };

  return (
    <>
      <Show when={!entered()}>
        <EnterScreen />
      </Show>
      <Show when={showSettings()}>
        <SettingsScreen />
      </Show>
      <Show when={showMusicSettings()}>
        <MusicSettingsScreen />
      </Show>
      <Show when={entered() && !isDeveloper() && !isSoloMode() && !isConvertPage()}>
        <RoomFlow />
      </Show>
      <Show when={entered() && sceneLoaded() && !showSettings() && !showMusicSettings() && experienceStarted()}>
        <VideoThumbnails />
        <TopBarRight />
        <BottomBarCenter />
      </Show>
      {/* Debug: Log when buttons should appear */}
      {(() => {
        const shouldShow = entered() && sceneLoaded() && !showSettings() && !showMusicSettings() && experienceStarted();
        if (shouldShow) {
          console.log('[UI] ✅ TopBar and BottomBar should be visible - entered:', entered(), 'sceneLoaded:', sceneLoaded(), 'experienceStarted:', experienceStarted());
        } else {
          console.log('[UI] ⚠️ TopBar and BottomBar hidden - entered:', entered(), 'sceneLoaded:', sceneLoaded(), 'showSettings:', showSettings(), 'showMusicSettings:', showMusicSettings(), 'experienceStarted:', experienceStarted());
        }
        return null;
      })()}
      <QuizStatusPanel open={showQuizSummary()} onClose={() => setShowQuizSummary(false)} />
      {/* GameHUD tetap terlihat meskipun settings dibuka - timer tidak boleh berhenti */}
      <Show when={entered() && sceneLoaded() && experienceStarted()}>
        {(() => {
          const isVisible = entered() && sceneLoaded() && experienceStarted();
          if (isVisible) {
            console.log('[UI] ✅ GameHUD should be visible - entered:', entered(), 'sceneLoaded:', sceneLoaded(), 'experienceStarted:', experienceStarted(), 'showMusicSettings:', showMusicSettings());
          }
          return <GameHUD visible={isVisible} />;
        })()}
      </Show>
      <ItemCollectionPopup />
      {/* SimpleNotification selalu render untuk memastikan bisa dipanggil */}
      <SimpleNotification />
      {/* SatpamDialog selalu render untuk memastikan bisa dipanggil */}
      <SatpamDialog />
    </>
  );
};

const root = document.createElement('div');
root.style.cssText = 'position: relative; z-index: 1;';
document.body.appendChild(root);
render(() => <App />, root);
