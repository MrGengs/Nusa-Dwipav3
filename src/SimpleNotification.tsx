import { Component, createMemo, createSignal, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { IoCheckmarkCircle } from 'solid-icons/io';

// Interface untuk Achievement Item
interface NotificationItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
}

// Signal global untuk menampilkan achievement modal
export const [showNotification, setShowNotification] = createSignal(false);
export const [notificationItem, setNotificationItem] = createSignal<NotificationItem | null>(null);

// Queue untuk multiple notifications (jika user dapat banyak item sekaligus)
const [notificationQueue, setNotificationQueue] = createSignal<NotificationItem[]>([]);

// Fungsi utama untuk menampilkan Achievement Modal
export const showSimpleNotification = (item: NotificationItem) => {
  console.log('🏆 Achievement Modal: Received item:', item);
  console.log('🏆 Achievement Modal: Item title:', item?.title);
  
  // Validasi data - pastikan item memiliki data yang lengkap
  if (!item || !item.title) {
    console.error('🏆 Achievement Modal: Invalid item data received!');
    return;
  }
  
  // Jika sudah ada modal yang sedang ditampilkan, tambahkan ke queue
  if (showNotification()) {
    console.log('🏆 Achievement Modal: Adding to queue');
    setNotificationQueue(prev => [...prev, item]);
    return;
  }
  
  // Tampilkan modal
  console.log('🏆 Achievement Modal: Showing achievement modal');
  setNotificationItem(item);
  setShowNotification(true);
  
  // Modal akan tetap terbuka sampai user klik "OK, Mengerti!"
  // Tidak ada auto-close agar user sempat membaca informasi
};

// Fungsi untuk menutup achievement modal
const closeNotification = () => {
  console.log('🏆 Achievement Modal: Closing');
  setShowNotification(false);
  setNotificationItem(null);
  
  // Jika ada item di queue, tampilkan yang berikutnya
  const queue = notificationQueue();
  if (queue.length > 0) {
    const nextItem = queue[0];
    setNotificationQueue(prev => prev.slice(1));
    setTimeout(() => {
      showSimpleNotification(nextItem);
    }, 500); // Delay 500ms antar achievement
  }
};

// Component Achievement Modal
export const SimpleNotification: Component = () => {
  const notification = createMemo(() => notificationItem());
  const isQuizNotification = createMemo(() => notification()?.category === 'quiz');
  const headerTitle = createMemo(() =>
    isQuizNotification()
      ? notification()?.title || 'Penjaga Rumah Adat'
      : '🎉 Selamat! 🎉'
  );
  const headerSubtitle = createMemo(() =>
    isQuizNotification()
      ? notification()?.description || 'Anda sudah menjawab quiz penjaga rumah adat.'
      : 'Anda mendapatkan item baru!'
  );
  const headerGradient = createMemo(() =>
    isQuizNotification()
      ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
  );
  return (
    <Portal>
      <Show when={showNotification() && notification()}>
        {/* Full screen overlay dengan background gelap blur - Scrollable */}
        <div class="notification-overlay">
          {/* Achievement Modal Container */}
          <div class="notification-modal">
            {/* Header dengan gradient hijau untuk achievement - Sticky di atas */}
            <div 
              class="p-3 sm:p-4 text-center relative flex-shrink-0 sticky top-0 z-10"
              style={{
                background: headerGradient()
              }}
            >
              <IoCheckmarkCircle 
                size={40} 
                class="mx-auto mb-2"
                style={{ color: 'white' }}
              />
              <h2 
                class="font-bold text-lg sm:text-xl mb-1"
                style={{ color: 'white' }}
              >
                {headerTitle()}
              </h2>
              <p 
                class="text-xs sm:text-sm"
                style={{ color: 'rgba(255, 255, 255, 0.9)' }}
              >
                {headerSubtitle()}
              </p>
            </div>
            
            {/* Content area - Scrollable */}
            <div class="flex-1 overflow-y-auto min-h-0" style={{ '-webkit-overflow-scrolling': 'touch', 'touch-action': 'pan-y' }}>
              <Show when={!isQuizNotification()}>
                <div 
                  class="p-4 sm:p-6"
                  style={{ background: 'white' }}
                >
                  <div 
                    class="mb-4 rounded-lg overflow-hidden"
                    style={{
                      border: '2px solid #e5e7eb',
                      background: '#f9fafb'
                    }}
                  >
                    <img 
                        src={notification()?.imageUrl || ''} 
                        alt={notification()?.title || ''}
                      style={{
                        width: '100%',
                        height: '200px',
                        'object-fit': 'contain',
                        padding: '1rem'
                      }}
                      onError={(e) => {
                        console.log('🏆 Image load error:', notificationItem()?.imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  <div class="text-center mb-4">
                    <h3 
                      class="font-bold text-xl mb-2"
                      style={{ color: '#1f2937' }}
                    >
                        {notification()?.title}
                    </h3>
                    <span 
                      class="inline-block px-3 py-1 text-xs font-medium rounded-full"
                      style={{
                        background: '#dbeafe',
                        color: '#1e40af'
                      }}
                    >
                        {notification()?.category === 'costume'
                          ? '👘 Pakaian Adat'
                          : notification()?.category === 'artifact'
                          ? '🏺 Artefak'
                          : notification()?.category === 'souvenir'
                          ? '🎁 Suvenir'
                          : notification()?.category === 'quiz'
                          ? '🛡️ Quiz Penjaga'
                          : '📦 Lainnya'}
                    </span>
                  </div>
                  
                  <div 
                    class="rounded-lg p-4 mb-4"
                    style={{ background: '#f9fafb' }}
                  >
                    <p 
                      class="text-sm leading-relaxed"
                      style={{ 
                        color: '#374151',
                        'text-align': 'justify'
                      }}
                    >
                        {notification()?.description}
                    </p>
                  </div>
                </div>
              </Show>
            </div>
            
            {/* Button close - Fixed di bawah modal */}
            <div class="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200" style={{ background: 'white' }}>
              <button
                type="button"
                class="w-full py-3 font-semibold rounded-lg transition-all"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white'
                }}
                onClick={closeNotification}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                OK, Mengerti!
              </button>
            </div>
          </div>
        </div>
      </Show>
    </Portal>
  );
};

// Fungsi ini akan di-expose ke window dari ui.tsx saat onMount
