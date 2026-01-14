import { Component, createSignal, createEffect, onMount, Show } from 'solid-js';

// Global music state management
const [musicEnabled, setMusicEnabled] = createSignal(true);
const [currentVolume, setCurrentVolume] = createSignal(30);
const [isMusicPlaying, setIsMusicPlaying] = createSignal(false);

// Expose music control functions to window for use in game.html
const startBackgroundMusic = () => {
  console.log('[Audio] Starting background music...');
  
  const musicEntity = document.getElementById('background-music-entity');
  const audioElement = document.getElementById('background-music') as HTMLAudioElement;
  
  if (musicEntity && audioElement) {
    audioElement.volume = currentVolume() / 100;
    
    if (musicEnabled()) {
      audioElement.play().then(() => {
        console.log('[Audio] ✅ Background music started successfully');
        setIsMusicPlaying(true);
      }).catch((error: any) => {
        console.warn('[Audio] ❌ Failed to play background music:', error);
        setIsMusicPlaying(false);
      });
    } else {
      console.log('[Audio] 🔇 Music disabled in settings');
      setIsMusicPlaying(false);
    }
  } else {
    console.warn('[Audio] ❌ Background music elements not found');
  }
};

const toggleMusic = () => {
  const audioElement = document.getElementById('background-music') as HTMLAudioElement;
  
  if (!audioElement) {
    console.warn('[Audio] ❌ Audio element not found');
    return;
  }
  
  setMusicEnabled(!musicEnabled());
  
  if (musicEnabled()) {
    audioElement.volume = currentVolume() / 100;
    audioElement.play().then(() => {
      setIsMusicPlaying(true);
      console.log('[Audio] 🔊 Music enabled and playing');
    }).catch((error) => {
      console.warn('[Audio] ❌ Failed to play music:', error);
      setIsMusicPlaying(false);
    });
  } else {
    audioElement.pause();
    setIsMusicPlaying(false);
    console.log('[Audio] 🔇 Music disabled');
  }
};

const updateVolume = (volume: number) => {
  const audioElement = document.getElementById('background-music') as HTMLAudioElement;
  
  if (!audioElement) {
    console.warn('[Audio] ❌ Audio element not found');
    return;
  }
  
  setCurrentVolume(volume);
  audioElement.volume = volume / 100;
  console.log(`[Audio] Volume set to ${volume}%`);
};

// Expose functions to window
onMount(() => {
  (window as any).startBackgroundMusic = startBackgroundMusic;
  (window as any).toggleMusic = toggleMusic;
  (window as any).updateVolume = updateVolume;
  (window as any).musicEnabled = musicEnabled;
  (window as any).currentVolume = currentVolume;
  (window as any).isMusicPlaying = isMusicPlaying;
  
  // Test function untuk debugging
  (window as any).testMusicControl = () => {
    console.log('🎵 MusicControl Test:');
    console.log('- musicEnabled:', musicEnabled());
    console.log('- currentVolume:', currentVolume());
    console.log('- isMusicPlaying:', isMusicPlaying());
  };
});

export const MusicControl: Component = () => {
  return (
    <div class="flex flex-col gap-6 p-4 w-full">
      {/* Music Toggle Button - Center */}
      <div class="flex justify-center">
        <button 
          onClick={toggleMusic}
          class="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 hover:scale-105"
          style={{
            background: musicEnabled() 
              ? 'linear-gradient(135deg, #10b981, #059669)' 
              : 'linear-gradient(135deg, #ef4444, #dc2626)',
            'box-shadow': musicEnabled() 
              ? '0 4px 12px rgba(16, 185, 129, 0.4)' 
              : '0 4px 12px rgba(239, 68, 68, 0.4)'
          }}
          title={musicEnabled() ? 'Matikan Musik' : 'Nyalakan Musik'}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            style="color: white;"
          >
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
            <Show when={!musicEnabled()}>
              <line x1="2" y1="2" x2="22" y2="22" stroke="white" stroke-width="3"/>
            </Show>
          </svg>
        </button>
      </div>

      {/* Volume Control Section - Left Aligned */}
      <div class="flex flex-col gap-2 w-full">
        <span class="text-sm font-medium text-gray-700">Volume</span>
        <div class="flex items-center gap-3 w-full">
          {/* Volume Down Button */}
          <button
            onClick={() => updateVolume(Math.max(0, currentVolume() - 10))}
            class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200 font-bold"
            title="Kurangi Volume"
          >
            -
          </button>

          {/* Volume Slider */}
          <div class="flex-1 relative">
            <div class="w-full h-2 bg-gray-200 rounded-lg relative">
              <div 
                class="h-2 bg-green-500 rounded-lg absolute top-0 left-0"
                style={`width: ${currentVolume()}%`}
              ></div>
              {/* Thumb (bulat) untuk mengatur volume */}
              <div 
                class="absolute top-1/2 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg cursor-pointer transform -translate-y-1/2"
                style={`left: calc(${currentVolume()}% - 8px)`}
                onMouseDown={(e) => {
                  const slider = e.currentTarget.parentElement?.querySelector('input[type="range"]') as HTMLInputElement;
                  if (slider) {
                    slider.focus();
                  }
                }}
              ></div>
              <input
                type="range"
                min="0"
                max="100"
                value={currentVolume()}
                onInput={(e) => updateVolume(parseInt(e.currentTarget.value))}
                class="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Volume Up Button */}
          <button
            onClick={() => updateVolume(Math.min(100, currentVolume() + 10))}
            class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200 font-bold"
            title="Tambah Volume"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

// Export music state and functions for use in other components
export { musicEnabled, currentVolume, isMusicPlaying, startBackgroundMusic, toggleMusic, updateVolume };
