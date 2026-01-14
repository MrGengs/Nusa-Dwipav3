import { Component, For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { avatarsBaseUrl } from './ui';
import { avatarLoading, avatarSrc, setAvatarSrc } from './avatarSignals';

// Add styles for horizontal scrollable avatar container
if (typeof document !== 'undefined') {
  const styleId = 'avatar-scroll-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .avatar-scroll-container::-webkit-scrollbar {
        height: 8px;
      }
      .avatar-scroll-container::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 4px;
      }
      .avatar-scroll-container::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }
      .avatar-scroll-container::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `;
    document.head.appendChild(style);
  }
}

export interface Avatar {
  text: string;
  image: string;
  model: string;
  ethnicity: string;
  gender: string;
  num: string;
  outfit: string;
}

interface Props {
  avatars: Avatar[];
  outfits?: string[];
}

export const [gender, setGender] = createSignal('F');
export const [outfit, setOutfit] = createSignal('Casual');
export const defaultOutfits = ['Casual', 'Busi', 'Medi', 'Milit', 'Util'];

export const AvatarSelect: Component<Props> = (props) => {
  const outfits = props.outfits ?? defaultOutfits;
  
  if (outfits.length === 1) {
    setOutfit(outfits[0]);
  }

  createEffect(() => {
    if (avatarSrc()) {
      const idx = props.avatars.findIndex((avatar) => avatarSrc().endsWith(avatar.model));
      if (idx === -1) return;
      const id = `avatar-${idx}`;

      queueMicrotask(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
          });
        }
      });
    }
  });

  return (
    <div class="flex flex-col gap-2">
      <label class="font-bold">Your avatar</label>

      <label>Gender</label>
      <div class="flex w-full flex-wrap gap-x-6">
        <label class="flex w-20 items-center gap-2">
          <input
            class="form-radio"
            type="radio"
            checked={gender() === 'F'}
            name="gender"
            value="F"
            onClick={() => setGender('F')}
          />
          <span>Female</span>
        </label>
        <label class="flex w-20 items-center gap-2">
          <input
            class="form-radio"
            type="radio"
            checked={gender() === 'M'}
            name="gender"
            value="M"
            onClick={() => setGender('M')}
          />
          <span>Male</span>
        </label>
      </div>

      <Show when={outfits.length > 1}>
        <label>Outfit</label>
        <div class="flex w-full flex-wrap gap-x-6">
          <Show when={outfits.includes('Casual')}>
            <label class="flex w-20 items-center gap-2">
              <input
                class="form-radio"
                type="radio"
                checked={outfit() === 'Casual'}
                name="outfit"
                value="Casual"
                onClick={() => setOutfit('Casual')}
              />
              <span>Casual</span>
            </label>
          </Show>
          <Show when={outfits.includes('Busi')}>
            <label class="flex w-20 items-center gap-2">
              <input
                class="form-radio"
                type="radio"
                checked={outfit() === 'Busi'}
                name="outfit"
                value="Busi"
                onClick={() => setOutfit('Busi')}
              />
              <span>Business</span>
            </label>
          </Show>
          <Show when={outfits.includes('Medi')}>
            <label class="flex w-20 items-center gap-2">
              <input
                class="form-radio"
                type="radio"
                checked={outfit() === 'Medi'}
                name="outfit"
                value="Medi"
                onClick={() => setOutfit('Medi')}
              />
              <span>Medical</span>
            </label>
          </Show>
          <Show when={outfits.includes('Milit')}>
            <label class="flex w-20 items-center gap-2">
              <input
                class="form-radio"
                type="radio"
                checked={outfit() === 'Milit'}
                name="outfit"
                value="Milit"
                onClick={() => setOutfit('Milit')}
              />
              <span>Military</span>
            </label>
          </Show>
          <Show when={outfits.includes('Util')}>
            <label class="flex w-20 items-center gap-2">
              <input
                class="form-radio"
                type="radio"
                checked={outfit() === 'Util'}
                name="outfit"
                value="Util"
                onClick={() => setOutfit('Util')}
              />
              <span>Utility</span>
            </label>
          </Show>
        </div>
      </Show>

      <div class="w-full border border-gray-200 rounded-lg bg-gray-50 p-6 mb-6">
        <div class="avatar-scroll-container flex flex-row gap-4 overflow-x-auto pb-2 -mx-6 px-6" style="scrollbar-width: thin; scrollbar-color: #cbd5e1 #f1f5f9; -webkit-overflow-scrolling: touch;">
          <For each={props.avatars}>
            {(avatar, idx) => (
              <Show when={avatar.gender === gender() && avatar.outfit === outfit()}>
                <button
                  id={`avatar-${idx()}`}
                  class="relative aspect-square w-24 sm:w-28 md:w-32 flex-shrink-0 cursor-pointer rounded-lg border-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-all duration-200 group"
                  disabled={avatarLoading()}
                  onClick={() => {
                    setAvatarSrc(avatarsBaseUrl + avatar.model);
                  }}
                >
                  <img
                    class="absolute inset-0 w-full h-full rounded-lg object-cover"
                    alt={`avatar ${avatar.text}`}
                    loading="lazy"
                    src={avatarsBaseUrl + avatar.image}
                  />
                  <div
                    class="absolute inset-0 bg-white/30 backdrop-brightness-125 rounded-lg transition-opacity duration-200"
                    classList={{ 
                      hidden: avatarSrc().endsWith(avatar.model),
                      'group-hover:opacity-75': !avatarSrc().endsWith(avatar.model)
                    }}
                  ></div>
                  <div
                    class="absolute inset-0 ring-4 ring-blue-500 rounded-lg"
                    classList={{ hidden: !avatarSrc().endsWith(avatar.model) }}
                  ></div>
                  {/* Avatar name label */}
                  <div class="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {avatar.text}
                  </div>
                </button>
              </Show>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};
