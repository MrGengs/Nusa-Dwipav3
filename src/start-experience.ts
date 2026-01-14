declare global {
  interface Window {
  startBackgroundMusic?: () => void;
  testOndelNPC?: () => void;
  gameProgress?: {
    ensureTimerRunning?: () => void;
  };
  }
}

window.addEventListener('nusa:start-experience', () => {
  if (window.startBackgroundMusic) {
    window.startBackgroundMusic();
  }
  if (window.testOndelNPC) {
    window.testOndelNPC();
  }
  
  // Activate joystick for mobile devices
  const joystickContainer = document.getElementById('joystick-container');
  if (joystickContainer) {
    joystickContainer.dataset.active = 'true';
    joystickContainer.style.display = 'block';
    joystickContainer.style.visibility = 'visible';
    joystickContainer.style.opacity = '1';
    joystickContainer.style.pointerEvents = 'auto';
    requestAnimationFrame(() => {
      joystickContainer.style.transition = 'opacity 0.4s ease';
      joystickContainer.style.opacity = '1';
    });
    console.log('[Joystick] ✅ Joystick activated for mobile');
  }
  
  // Timer sekarang di-start dari room.startedAt saat status in-progress
  // Tidak perlu start timer di sini lagi
});

export {};

