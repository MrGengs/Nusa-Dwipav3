/* global AFRAME THREE */

/**
 * SATPAM GUARD COMPONENT
 * Component untuk membuat NPC satpam di depan rumah adat
 * Player bisa mendekati satpam untuk mendengarkan cerita sejarah rumah adat
 * 
 * Fitur:
 * - Dialog box dengan multiple pages
 * - Next/previous navigation
 * - Close dialog
 * - Icon indikator di atas kepala satpam
 */

import { houseData } from './house-data.js';

AFRAME.registerComponent('satpam-guard', {
  schema: {
    houseId: { type: 'string' },
    dialogDistance: { type: 'number', default: 4 },
  },

  init: function () {
    this.guardData = houseData[this.data.houseId];

    if (!this.guardData || !this.guardData.quiz) {
      console.error('🏛️ Satpam Guard: Data tidak ditemukan untuk houseId:', this.data.houseId);
      this.guardData = {
        guardName: 'Satpam',
        houseName: 'Rumah Adat',
        quiz: {
          intro: 'Informasi belum tersedia.',
          questions: [],
        },
      };
    }

    console.log('🏛️ Satpam Guard: Initializing guard for:', this.guardData.houseName);

    this.rig = null;
    this.playerPosition = new THREE.Vector3();
    this.guardPosition = new THREE.Vector3();

    this.isQuizOpen = false;
    this.isNearby = false;
    this.poseSet = false;

    this.createIndicatorIcon();
    this.setupClickHandler();
    this.setupModelPose();

    if (window.gameProgress && typeof window.gameProgress.registerGuard === 'function') {
      window.gameProgress.registerGuard(
        this.data.houseId,
        this.guardData.quiz.questions.length
      );
    }
  },

  update: function () {
  },

  createIndicatorIcon: function () {
    // Buat icon chat bubble di samping kepala satpam
    // Positioned relative to satpam's head (di atas kepala dan sedikit ke kanan)
    // Disesuaikan untuk model police dengan scale 0.5
    const icon = document.createElement('a-entity');
    icon.setAttribute('position', '0.7 3.5 0'); // Disesuaikan untuk scale 0.5
    icon.setAttribute('geometry', 'primitive: plane; width: 0.4; height: 0.4'); // Sedikit lebih besar agar terlihat
    
    // Create improved chat bubble SVG with better design
    const chatSVG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <!-- Dark grey circular background with 10% opacity -->
        <circle cx="32" cy="32" r="32" fill="#333333" fill-opacity="0.1"/>
        <!-- Clean white chat bubble with rounded corners -->
        <path d="M16 20c0-2.2 1.8-4 4-4h24c2.2 0 4 1.8 4 4v16c0 2.2-1.8 4-4 4H26l-6 6V20z"
              fill="none"
              stroke="#ffffff"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))"/>
        <!-- Three clean white dots ellipsis -->
        <circle cx="28" cy="32" r="3" fill="#ffffff"/>
        <circle cx="36" cy="32" r="3" fill="#ffffff"/>
        <circle cx="44" cy="32" r="3" fill="#ffffff"/>
      </svg>
    `);
    
    icon.setAttribute('material', {
      src: chatSVG,
      transparent: true,
      alphaTest: 0.5,
      shader: 'flat'
    });
    icon.setAttribute('billboard', 'lockX: true; lockY: true; lockZ: false');
    
    // Animasi pulse untuk menarik perhatian
    icon.setAttribute('animation', {
      property: 'scale',
      from: '1 1 1',
      to: '1.2 1.2 1.2',
      dur: 1500,
      dir: 'alternate',
      easing: 'easeInOutSine',
      loop: true
    });
    
    // Tambahkan ke satpam entity
    this.el.appendChild(icon);
    
    // Simpan referensi untuk toggle visibility
    this.indicatorIcon = icon;
  },

  setupClickHandler: function () {
    this.el.addEventListener('click', () => {
      if (this.isNearby && !this.isQuizOpen) {
        this.openQuiz();
      }
    });

    this.el.addEventListener('mouseenter', () => {
      if (this.isNearby) {
        this.el.setAttribute('animation', {
          property: 'scale',
          to: '1.05 1.05 1.05',
          dur: 200,
        });
      }
    });

    this.el.addEventListener('mouseleave', () => {
      this.el.setAttribute('animation', {
        property: 'scale',
        to: '1 1 1',
        dur: 200,
      });
    });
  },

  setupModelPose: function () {
    // Listen untuk event saat model selesai dimuat
    this.el.addEventListener('model-loaded', () => {
      console.log('🏛️ Satpam Guard: Model loaded, setting up pose');
      
      // Disable animation mixer dulu untuk mencegah override rotasi
      const mixer = this.el.components['animation-mixer'];
      if (mixer) {
        console.log('🏛️ Satpam Guard: Disabling animation mixer to set pose');
        // Stop semua action
        if (mixer.mixer) {
          mixer.mixer.stopAllAction();
        }
        // Remove animation-mixer component untuk mencegah override
        this.el.removeAttribute('animation-mixer');
        console.log('🏛️ Satpam Guard: Animation mixer removed');
      }
      
      // Set pose setelah model loaded
      setTimeout(() => {
        this.setReadyPose();
      }, 100);
    });
    
    // Juga coba set pose setelah sedikit delay untuk memastikan model sudah fully loaded
    setTimeout(() => {
      if (!this.poseSet) {
        console.log('🏛️ Satpam Guard: Retrying pose setup after delay');
        this.setReadyPose();
      }
    }, 1000);
    
    // Retry lagi setelah 2 detik
    setTimeout(() => {
      if (!this.poseSet) {
        console.log('🏛️ Satpam Guard: Final retry pose setup');
        this.setReadyPose();
      }
    }, 2000);
  },

  setReadyPose: function () {
    // Biarkan model dalam pose default-nya
    // Hanya memastikan animation mixer sudah di-disable
    console.log('🏛️ Satpam Guard: Model ready - using default pose');
    
    // Mark pose sudah di-set
    this.poseSet = true;
  },

  maintainPose: function () {
    // Fungsi ini tidak perlu melakukan apa-apa
    // Biarkan model dalam pose default-nya
    // Animation mixer sudah di-disable di setupModelPose
  },

  tick: function (time) {
    if (!this.poseSet && time > 1000) {
      this.setReadyPose();
    }

    if (this.isQuizOpen) {
      return;
    }

    if (!this.rig) {
      this.rig = document.getElementById('rig');
      if (!this.rig) return;
    }

    this.rig.object3D.getWorldPosition(this.playerPosition);
    this.el.object3D.getWorldPosition(this.guardPosition);

    const distance = this.playerPosition.distanceTo(this.guardPosition);
    const wasNearby = this.isNearby;
    this.isNearby = distance < this.data.dialogDistance;

    if (!wasNearby && this.isNearby) {
      this.openQuiz();
    }

    if (this.indicatorIcon) {
      const guardCompleted =
        window.gameProgress &&
        typeof window.gameProgress.isGuardCompleted === 'function' &&
        window.gameProgress.isGuardCompleted(this.data.houseId);
      this.indicatorIcon.setAttribute('visible', !(this.isQuizOpen || guardCompleted));
    }
  },

  openQuiz: function () {
    if (this.isQuizOpen) {
      return;
    }

    if (
      window.gameProgress &&
      typeof window.gameProgress.isGuardCompleted === 'function' &&
      window.gameProgress.isGuardCompleted(this.data.houseId)
    ) {
      if (window.showSimpleNotification) {
        const houseLabel = this.guardData?.houseName || 'Rumah Adat';
        const rawGuardName = this.guardData?.guardName || 'Penjaga';
        const regionName = rawGuardName.replace(/^Penjaga\s+/i, '').trim();
        const guardDisplayTitle =
          regionName && regionName.length > 0 ? `Penjaga ${regionName}` : rawGuardName;
        window.showSimpleNotification({
          id: `${this.data.houseId}-completed`,
          title: guardDisplayTitle,
          description: `Anda sudah menjawab quiz penjaga rumah ${houseLabel}.`,
          imageUrl: '',
          category: 'quiz',
        });
      }
      return;
    }

    this.isQuizOpen = true;
    console.log('🏛️ Satpam Guard: Opening quiz for', this.guardData.guardName);

    if (window.showSatpamDialog) {
      const nextIndex =
        window.gameProgress && typeof window.gameProgress.getNextQuestionIndex === 'function'
          ? window.gameProgress.getNextQuestionIndex(this.data.houseId)
          : 0;

      window.showSatpamDialog({
        guardId: this.data.houseId,
        guardName: this.guardData.guardName,
        houseName: this.guardData.houseName,
        intro: this.guardData.quiz.intro,
        questions: this.guardData.quiz.questions,
        startIndex: nextIndex,
        onClose: () => {
          this.closeQuiz();
        },
      });
    } else {
      console.error('🏛️ Satpam Guard: showSatpamDialog function not found!');
      this.isQuizOpen = false;
    }
  },

  closeQuiz: function () {
    this.isQuizOpen = false;
  },

  remove: function () {
    this.rig = null;
    if (this.indicatorIcon && this.indicatorIcon.parentNode) {
      this.indicatorIcon.parentNode.removeChild(this.indicatorIcon);
    }
  },
});

