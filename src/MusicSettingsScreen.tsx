import { Component } from 'solid-js';
import { MusicControl } from './MusicControl';

export const MusicSettingsScreen: Component = () => {
  return (
    <div class="naf-centered-fullscreen scrollable" style="z-index: 100020;">
      <div class="flex w-full max-w-2xl flex-col gap-4 p-4 pb-8">
        {/* Music Control Section Only */}
        <MusicControl />
      </div>
      
      <div class="sticky bottom-0 bg-white/95 backdrop-blur-sm w-full flex justify-center py-4 border-t border-gray-200">
        <button
          type="button"
          id="closeMusicSettingsButton"
          class="btn min-w-[100px]"
          onClick={() => {
            // This will be handled by the parent component
            const event = new CustomEvent('closeMusicSettings');
            window.dispatchEvent(event);
          }}
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
