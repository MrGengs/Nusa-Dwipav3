import { Component, createSignal, Show, For, onMount, createEffect } from 'solid-js';
import { Portal } from 'solid-js/web';
import { IoClose, IoTrashOutline } from 'solid-icons/io';
import { BsPlus } from 'solid-icons/bs';

// Custom Backpack Icon Component - Lucide Style
const BackpackIcon = (props: { size?: number; class?: string }) => {
  const size = props.size || 24;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      class={props.class}
    >
      <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
      <path d="M8 10h8"/>
      <path d="M8 18h8"/>
      <path d="M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6"/>
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
    </svg>
  );
};

// State untuk show/hide backpack panel
export const [showBackpackPanel, setShowBackpackPanel] = createSignal(false);

// Interface untuk item di backpack
interface BackpackItem {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji atau image URL
  quantity: number;
  category: 'costume' | 'other';
}

// State untuk menyimpan items di backpack
// Mulai dengan backpack kosong
const [backpackItems, setBackpackItems] = createSignal<BackpackItem[]>([]);
const [itemsLoaded, setItemsLoaded] = createSignal(false);
const [lastRefreshTime, setLastRefreshTime] = createSignal(0);

// Mapping dari itemId ke item data
const itemDataMap: Record<string, Omit<BackpackItem, 'quantity'>> = {
  'baju-koteka-papua': {
    id: 'baju-koteka-papua',
    name: 'Pakaian Koteka dari Papua',
    description: 'Pakaian Adat Koteka dan Rok Rumbai adalah busana tradisional yang identik dengan masyarakat adat di wilayah Pegunungan Tengah Papua (seperti Suku Dani, Lani, dan Yali), terkenal karena kesederhanaan bahan alamnya dan sarat akan makna status sosial.',
    icon: '/assets/baju_adat/bapapua.png',
    category: 'costume',
  },
  'baju-ulee-balang-aceh': {
    id: 'baju-ulee-balang-aceh',
    name: 'Pakaian Ulee Balang dari Aceh',
    description: 'Pakaian Adat Ulee Balang adalah busana tradisional khas Aceh yang melambangkan kebesaran, kemuliaan, dan status sosial tinggi, yang pada masa kesultanan hanya dikenakan oleh golongan bangsawan (Ulee Balang). Kini, pakaian ini populer sebagai busana pernikahan adat.',
    icon: '/assets/baju_adat/baaceh.png',
    category: 'costume',
  },
  'baju-pepadun-lampung': {
    id: 'baju-pepadun-lampung',
    name: 'Pakaian Pepadun dari Sumatra',
    description: 'Pakaian Adat Pepadun adalah busana kebesaran dari masyarakat Lampung yang menganut sistem adat Pepadun (dataran tinggi/pedalaman). Pakaian ini secara umum berwarna putih dan emas, melambangkan kesucian dan kemuliaan, serta sering dikenakan sebagai busana pengantin.',
    icon: '/assets/baju_adat/basumatra.png',
    category: 'costume',
  },
  'baju-dayak-kalimantan': {
    id: 'baju-dayak-kalimantan',
    name: 'Pakaian Sapei Sapaq dari Kalimantan',
    description: 'Pakaian Sapei Sapaq dan Ta\'a adalah pasangan busana adat tradisional dari Suku Dayak, khususnya sub-Suku Dayak Kenyah yang mendiami wilayah Kalimantan Timur. Pakaian ini merupakan busana kebesaran yang dikenakan untuk upacara adat penting atau tarian penyambutan.',
    icon: '/assets/baju_adat/badayak.png',
    category: 'costume',
  },
  'baju-bundo-kanduang-sumbar': {
    id: 'baju-bundo-kanduang-sumbar',
    name: 'Baju Bundo Kanduang dari Sumatra Barat',
    description: 'Baju adat Bundo Kanduang adalah pakaian kebesaran perempuan Minangkabau yang melambangkan kewibawaan pemimpin adat dengan suntiang tinggi dan kain songket penuh filosofi.',
    icon: '/assets/baju_adat/basumbar.png',
    category: 'costume',
  },
  'baju-ulos-batak-sumut': {
    id: 'baju-ulos-batak-sumut',
    name: 'Pakaian Ulos Batak Sumatra Utara',
    description: 'Busana adat Batak dipadukan dengan kain Ulos sebagai simbol restu dan kehangatan yang wajib ada di setiap upacara adat penting masyarakat Sumatra Utara.',
    icon: '/assets/baju_adat/babatak.png',
    category: 'costume',
  },
  'baju-nggoli-sulteng': {
    id: 'baju-nggoli-sulteng',
    name: 'Pakaian Ngata Tolitoli - Sulawesi Tengah',
    description: 'Busana adat Ngata Tolitoli dikenakan oleh bangsawan Sulawesi Tengah dengan perpaduan warna cerah dan aksen sulam emas yang menonjolkan status sosial.',
    icon: '/assets/baju_adat/batolitoli.png',
    category: 'costume',
  },
  'baju-payas-agung-bali': {
    id: 'baju-payas-agung-bali',
    name: 'Payas Agung Bali',
    description: 'Payas Agung adalah busana adat kebesaran Bali yang dipakai dalam upacara sakral dan pernikahan dengan dominasi warna emas dan hiasan ukiran rumit.',
    icon: '/assets/baju_adat/babali.png',
    category: 'costume',
  },
  'baju-beskap-jawa': {
    id: 'baju-beskap-jawa',
    name: 'Pakaian Beskap dari Jawa',
    description: 'Beskap adalah baju adat pria Jawa (terutama dari wilayah Solo dan Yogyakarta) yang merupakan atasan resmi dan elegan, sering disamakan dengan jas tutup. Pakaian ini sarat akan filosofi dan umumnya dikenakan dalam acara-acara penting, seperti pernikahan, upacara adat, dan pertemuan resmi.',
    icon: '/assets/baju_adat/bajawa.png',
    category: 'costume',
  },
  'baju-bodo-sulsel': {
    id: 'baju-bodo-sulsel',
    name: 'Pakaian Bodo dari Sulawesi Selatan',
    description: 'Pakaian Bodo adalah pakaian adat wanita suku Bugis-Makassar (Sulawesi Selatan) yang berbentuk blus longgar, segi empat, berlengan sangat pendek (bodo). Terbuat dari kain tipis transparan, Baju Bodo dipadukan dengan sarung sutra dan memiliki keunikan pada warna yang melambangkan status dan usia pemakainya (misalnya, hijau untuk bangsawan). Busana ini mewah, kaya perhiasan emas, dan digunakan dalam upacara adat.',
    icon: '/assets/baju_adat/basulsel.png',
    category: 'costume',
  },
};

// Fungsi untuk memuat collected items dari Firestore
const loadCollectedItemsFromFirestore = async () => {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.log('🎒 Backpack: No user ID, skipping load from Firestore');
      return;
    }

    // Wait a bit for Firebase functions to be available
    if (window.getUserDataFromFirestore) {
      console.log('🎒 Backpack: Loading collected items from Firestore...');
      const userData = await window.getUserDataFromFirestore(userId);
      
      if (userData && userData.collectedItems && Array.isArray(userData.collectedItems)) {
        console.log('🎒 Backpack: Found', userData.collectedItems.length, 'collected items');
        
        // Convert collected item IDs to BackpackItem objects
        const items: BackpackItem[] = userData.collectedItems
          .map((itemId: string) => {
            const itemData = itemDataMap[itemId];
            if (itemData) {
              return {
                ...itemData,
                quantity: 1,
              };
            } else {
              console.warn('🎒 Backpack: Unknown item ID:', itemId);
              return null;
            }
          })
          .filter((item: BackpackItem | null): item is BackpackItem => item !== null);
        
        // Set items to backpack
        setBackpackItems(items);
        setItemsLoaded(true);
        setLastRefreshTime(Date.now());
        console.log('🎒 Backpack: Loaded', items.length, 'items from Firestore');
      } else {
        console.log('🎒 Backpack: No collected items found in Firestore');
        setItemsLoaded(true);
      }
    } else {
      console.log('🎒 Backpack: getUserDataFromFirestore not available yet, will retry');
      // Retry after a delay
      setTimeout(() => loadCollectedItemsFromFirestore(), 2000);
    }
  } catch (error) {
    console.error('🎒 Backpack: Error loading collected items from Firestore:', error);
    setItemsLoaded(true);
  }
};

// Fungsi untuk menambahkan item ke backpack
export const addItemToBackpack = (item: BackpackItem) => {
  const existingItem = backpackItems().find((i) => i.id === item.id);
  
  if (existingItem) {
    // Jika item sudah ada, tambahkan quantity
    setBackpackItems((items) =>
      items.map((i) =>
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      )
    );
  } else {
    // Jika item baru, tambahkan ke backpack
    setBackpackItems((items) => [...items, item]);
  }
  
  console.log('Item added to backpack:', item.name);
  
  // Refresh from Firestore after a delay to ensure sync
  // This ensures that if item was saved to Firestore, it will be loaded
  setTimeout(() => {
    loadCollectedItemsFromFirestore();
  }, 2000); // Wait 2 seconds for Firestore to update
};

// Fungsi untuk refresh backpack dari Firestore
export const refreshBackpackFromFirestore = () => {
  loadCollectedItemsFromFirestore();
};

// Expose fungsi ke window untuk diakses dari A-Frame components
// Akan di-set di onMount untuk memastikan window tersedia

// Fungsi untuk menghapus item dari backpack
const removeItemFromBackpack = (id: string) => {
  setBackpackItems((items) => items.filter((item) => item.id !== id));
};

// Fungsi untuk mengurangi quantity item
const decreaseItemQuantity = (id: string) => {
  setBackpackItems((items) =>
    items.map((item) => {
      if (item.id === id) {
        const newQuantity = item.quantity - 1;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter((item) => item.quantity > 0)
  );
};

// Fungsi untuk mendapatkan label kategori yang sesuai
const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'costume':
      return 'Pakaian Adat';
    default:
      return 'Lainnya';
  }
};

// State untuk modal detail item
const [selectedItem, setSelectedItem] = createSignal<BackpackItem | null>(null);

// Component untuk modal detail item
const ItemDetailModal: Component<{ item: BackpackItem }> = (props) => {
  const isImageUrl = () => {
    return props.item.icon.startsWith('http') || props.item.icon.startsWith('/');
  };
  
  return (
    <Portal>
      {/* Backdrop - overlay gelap di belakang modal */}
      <div 
        class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
        onClick={() => setSelectedItem(null)}
      >
        {/* Modal content */}
        <div 
          class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header modal dengan gambar besar */}
          <div class="relative">
            <button
              type="button"
              class="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors z-10"
              onClick={() => setSelectedItem(null)}
            >
              <IoClose size={24} class="text-gray-700" />
            </button>
            
            {/* Gambar item besar */}
            <div class="bg-transparent p-8 flex items-center justify-center min-h-[200px]">
              {isImageUrl() ? (
                <img 
                  src={props.item.icon} 
                  alt={props.item.name}
                  class="max-w-full max-h-[300px] object-contain rounded-lg"
                />
              ) : (
                <span class="text-8xl">{props.item.icon}</span>
              )}
            </div>
          </div>
          
          {/* Content modal */}
          <div class="p-6">
            {/* Badge kategori */}
            <span class="inline-block mb-3 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full font-medium">
              {getCategoryLabel(props.item.category)}
            </span>
            
            {/* Nama item */}
            <h2 class="text-2xl font-bold text-gray-800 mb-4">
              {props.item.name}
            </h2>
            
            {/* Deskripsi lengkap */}
            <div class="prose max-w-none">
              <p class="text-gray-600 leading-relaxed whitespace-pre-line">
                {props.item.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

// Component untuk menampilkan satu item
const BackpackItemComponent: Component<{ item: BackpackItem }> = (props) => {
  // Check jika icon adalah URL atau emoji
  const isImageUrl = () => {
    return props.item.icon.startsWith('http') || props.item.icon.startsWith('/');
  };
  
  return (
    <div 
      class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
      onClick={() => setSelectedItem(props.item)}
    >
      {/* Icon item - bisa emoji atau gambar */}
      <div class="flex-shrink-0">
        {isImageUrl() ? (
          <img 
            src={props.item.icon} 
            alt={props.item.name}
            class="w-16 h-16 object-contain rounded"
          />
        ) : (
          <span class="text-4xl">{props.item.icon}</span>
        )}
      </div>
      
      {/* Info item */}
      <div class="flex-grow min-w-0">
        <h3 class="font-semibold text-gray-800 truncate">{props.item.name}</h3>
        <p class="text-sm text-gray-500 truncate">{props.item.description}</p>
        <span class="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
          {getCategoryLabel(props.item.category)}
        </span>
      </div>
    </div>
  );
};

// Panel Backpack
const BackpackPanel = () => {
  const categories = ['all', 'costume', 'other'] as const;
  const [selectedCategory, setSelectedCategory] = createSignal<typeof categories[number]>('all');
  
  const filteredItems = () => {
    const category = selectedCategory();
    if (category === 'all') return backpackItems();
    return backpackItems().filter((item) => item.category === category);
  };
  
  const categoryLabels = {
    all: 'Semua',
    costume: 'Pakaian',
    other: 'Lainnya',
  };
  
  return (
    <div class="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div class="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-blue-600/30 bg-gradient-to-r from-blue-500 to-blue-600">
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white shadow-inner">
            <BackpackIcon size={22} class="text-white" />
          </div>
          <div class="min-w-0">
            <p class="text-xs uppercase tracking-[0.35em] text-white/60">Inventori</p>
            <h2 class="text-2xl font-bold text-white leading-tight truncate">Backpack</h2>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-3 py-1 text-xs font-semibold text-white bg-white/25 rounded-full">
            {backpackItems().length} item{backpackItems().length !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            class="p-2 text-white/90 hover:bg-white/20 rounded-lg transition-colors"
            onClick={() => setShowBackpackPanel(false)}
          >
            <IoClose size={22} />
          </button>
        </div>
      </div>
      
      {/* Category Filter */}
      <div class="sticky top-[72px] z-20 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-100 shadow-sm">
        <div class="flex gap-2 p-3 overflow-x-auto items-center">
          <For each={categories}>
            {(category) => (
              <button
                type="button"
                class={`relative h-10 px-4 text-sm font-semibold rounded-full whitespace-nowrap transition-colors border overflow-hidden ${
                  selectedCategory() === category
                    ? 'text-white border-blue-500 shadow-sm'
                    : 'text-gray-600 border-transparent hover:bg-gray-100'
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {selectedCategory() === category && (
                  <span class="absolute inset-0 bg-blue-500" aria-hidden="true"></span>
                )}
                <span class="relative">{categoryLabels[category]}</span>
              </button>
            )}
          </For>
        </div>
      </div>
      
      <div class="flex-grow overflow-y-auto px-4 pb-4 pt-6">
        <Show
          when={filteredItems().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-full text-center p-8">
              <BackpackIcon size={64} class="text-gray-300 mb-4" />
              <p class="text-gray-500 font-medium">Backpack kosong</p>
              <p class="text-sm text-gray-400 mt-2">
                Kumpulkan item saat menjelajahi Nusantara Quest!
              </p>
            </div>
          }
        >
          <div class="space-y-3">
            <For each={filteredItems()}>
              {(item) => <BackpackItemComponent item={item} />}
            </For>
          </div>
        </Show>
      </div>
      
      {/* Footer dengan stats */}
      <div class="p-4 border-t border-gray-200 bg-gray-50">
        <div class="flex justify-around text-center">
          <div>
            <p class="text-2xl font-bold text-blue-600">
              {backpackItems().reduce((sum, item) => sum + item.quantity, 0)}
            </p>
            <p class="text-xs text-gray-500">Total Items</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-green-600">
              {backpackItems().filter((i) => i.category === 'costume').length}
            </p>
            <p class="text-xs text-gray-500">Pakaian Adat</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Button Backpack untuk di UI
export const BackpackButton = () => {
  const itemCount = () => backpackItems().reduce((sum, item) => sum + item.quantity, 0);
  
  // Load collected items from Firestore on mount
  onMount(() => {
    (window as any).addItemToBackpack = addItemToBackpack;
    (window as any).refreshBackpackFromFirestore = refreshBackpackFromFirestore;
    console.log('🎒 Backpack: addItemToBackpack exposed to window');
    
    // Load collected items from Firestore
    loadCollectedItemsFromFirestore();
  });
  
  // Reload items when backpack panel is opened (refresh if not loaded or if last refresh was more than 5 seconds ago)
  createEffect(() => {
    if (showBackpackPanel()) {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime();
      // Refresh if not loaded yet, or if last refresh was more than 5 seconds ago
      if (!itemsLoaded() || timeSinceLastRefresh > 5000) {
        loadCollectedItemsFromFirestore();
        setLastRefreshTime(now);
      }
    }
  });
  
  return (
    <>
      <button
        type="button"
        class="btn-secondary btn-rounded relative"
        classList={{ active: showBackpackPanel() }}
        onClick={() => {
          setShowBackpackPanel((v) => !v);
        }}
        title="Backpack - Inventori"
      >
        <BackpackIcon size={24} />
        <Show when={itemCount() > 0}>
          <span class="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold bg-blue-500 text-white rounded-full border-2 border-white">
            {itemCount()}
          </span>
        </Show>
      </button>

      <Portal>
        <Show when={showBackpackPanel()}>
          <BackpackPanel />
        </Show>
      </Portal>
      
      {/* Modal untuk detail item */}
      <Show when={selectedItem()}>
        {(item) => <ItemDetailModal item={item()} />}
      </Show>
    </>
  );
};

