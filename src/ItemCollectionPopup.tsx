import { Component, createSignal, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { IoClose, IoCheckmarkCircle } from 'solid-icons/io';

// Interface untuk item yang dikumpulkan
interface CollectedItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: 'costume' | 'artifact' | 'souvenir' | 'other';
}

// Signal untuk menampilkan popup
export const [showItemPopup, setShowItemPopup] = createSignal(false);
export const [collectedItem, setCollectedItem] = createSignal<CollectedItem | null>(null);

// Fungsi untuk menampilkan popup collection
export const showItemCollection = (item: CollectedItem) => {
  setCollectedItem(item);
  setShowItemPopup(true);
  
  console.log('Showing collection popup for:', item.name);
  
  // Auto close setelah 8 detik
  setTimeout(() => {
    setShowItemPopup(false);
  }, 8000);
};

// Expose fungsi ke window untuk diakses dari A-Frame components
if (typeof window !== 'undefined') {
  (window as any).showItemCollection = showItemCollection;
}

// Component Popup
export const ItemCollectionPopup: Component = () => {
  const item = collectedItem();
  
  if (!item) return null;
  
  return (
    <Portal>
      <Show when={showItemPopup()}>
        <div 
          class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fadeIn"
          style="overflow-y: auto; -webkit-overflow-scrolling: touch; touch-action: pan-y;"
        >
          <div class="min-h-full flex items-start justify-center p-0 sm:p-4">
            <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn mt-auto sm:my-auto sm:mt-4 mb-0 sm:mb-4 flex flex-col">
              {/* Header dengan icon success - Sticky di atas */}
              <div class="bg-gradient-to-r from-green-500 to-green-600 p-4 sm:p-6 text-center relative flex-shrink-0 sticky top-0 z-10">
                <button
                  type="button"
                  class="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors z-10"
                  onClick={() => setShowItemPopup(false)}
                >
                  <IoClose size={24} />
                </button>
                
                <div class="flex justify-center mb-2 sm:mb-3">
                  <IoCheckmarkCircle size={48} class="text-white animate-bounce sm:w-16 sm:h-16" />
                </div>
                
                <h2 class="text-xl sm:text-2xl font-bold text-white mb-1">
                  Item Ditemukan! 🎉
                </h2>
                <p class="text-green-100 text-xs sm:text-sm">
                  Item berhasil ditambahkan ke backpack Anda
                </p>
              </div>
              
              {/* Content dengan gambar item */}
              <div class="p-4 sm:p-6">
              {/* Gambar item */}
              <div class="mb-4 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  class="w-full h-48 sm:h-64 object-contain p-4"
                />
              </div>
              
              {/* Info item */}
              <div class="text-center mb-4">
                <h3 class="text-lg sm:text-xl font-bold text-gray-800 mb-2">
                  {item.name}
                </h3>
                <span class="inline-block px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  {item.category === 'costume' ? '👘 Pakaian Adat' : 
                   item.category === 'artifact' ? 'Artefak' :
                   item.category === 'souvenir' ? 'Suvenir' : 'Lainnya'}
                </span>
              </div>
              
              {/* Deskripsi */}
              <div class="bg-gray-50 rounded-lg p-4 mb-4">
                <p class="text-sm text-gray-700 leading-relaxed text-justify">
                  {item.description}
                </p>
              </div>
              
              {/* Button close */}
              <button
                type="button"
                class="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 active:scale-95"
                onClick={() => setShowItemPopup(false)}
              >
                Tutup
              </button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </Portal>
  );
};

