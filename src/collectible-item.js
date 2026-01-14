/* global AFRAME */

// Component untuk membuat object dapat dikumpulkan
// Ketika player mendekati, item akan dikumpulkan dan masuk ke backpack
AFRAME.registerComponent('collectible-item', {
  schema: {
    // ID unik untuk item
    itemId: { type: 'string', default: '' },
    // Nama item
    itemName: { type: 'string', default: 'Item' },
    // Deskripsi item
    itemDescription: { type: 'string', default: '' },
    // URL gambar item untuk ditampilkan di popup
    itemImage: { type: 'string', default: '' },
    // Kategori item
    itemCategory: { type: 'string', default: 'other', oneOf: ['costume', 'artifact', 'souvenir', 'other'] },
    // Jarak untuk collect (dalam meter)
    collectDistance: { type: 'number', default: 3 },
    // Apakah sudah dikumpulkan
    collected: { type: 'boolean', default: false },
  },

  init: function () {
    // Referensi ke player rig
    this.rig = null;
    this.playerPosition = new THREE.Vector3();
    this.itemPosition = new THREE.Vector3();
    
    // Flag untuk mencegah double collection
    this.isCollecting = false;
    
    // Animasi floating untuk item (naik turun)
    this.floatingTime = Math.random() * Math.PI * 2; // Random starting point
    this.floatingSpeed = 1.5;
    this.floatingHeight = 0.2;
    this.initialY = this.el.object3D.position.y;
    
    console.log('🎒 Collectible: Item initialized');
    console.log('🎒 Collectible: Data from HTML:', this.data);
    console.log('🎒 Collectible: itemId:', this.data.itemId);
    console.log('🎒 Collectible: itemName:', this.data.itemName);
    console.log('🎒 Collectible: itemDescription:', this.data.itemDescription);
    console.log('🎒 Collectible: itemImage:', this.data.itemImage);
    console.log('🎒 Collectible: itemCategory:', this.data.itemCategory);
    
    if (window.gameProgress && typeof window.gameProgress.registerCollectible === 'function') {
      window.gameProgress.registerCollectible(this.data.itemId);
    }
    
    // Check if item is already collected from Firestore
    this.checkIfCollected();
  },
  
  checkIfCollected: async function (retryCount = 0) {
    // Check if user is authenticated
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.log('🎒 Collectible: No user ID, skipping collected check');
      return;
    }
    
    // Maximum retry attempts
    const maxRetries = 5;
    
    // Wait a bit for window functions to be available
    setTimeout(async () => {
      try {
        if (window.getUserDataFromFirestore) {
          console.log('🎒 Collectible: Checking if item already collected:', this.data.itemId);
          const userData = await window.getUserDataFromFirestore(userId);
          
          if (userData && userData.collectedItems && Array.isArray(userData.collectedItems)) {
            const isCollected = userData.collectedItems.includes(this.data.itemId);
            
            if (isCollected) {
              console.log('🎒 Collectible: Item already collected, hiding:', this.data.itemId);
              // Mark as collected
              this.el.setAttribute('collectible-item', 'collected', true);
              // Hide the item
              this.el.setAttribute('visible', false);
              // Remove from scene
              if (this.el.parentNode) {
                this.el.parentNode.removeChild(this.el);
              }
              if (window.gameProgress && typeof window.gameProgress.recordItemCollected === 'function') {
                window.gameProgress.recordItemCollected(this.data.itemId, { awardPoints: false });
              }
            } else {
              console.log('🎒 Collectible: Item not collected yet:', this.data.itemId);
            }
          } else {
            console.log('🎒 Collectible: User data not found or invalid');
          }
        } else {
          if (retryCount < maxRetries) {
            console.log(`🎒 Collectible: getUserDataFromFirestore not available yet, retrying (${retryCount + 1}/${maxRetries})`);
            // Retry after a longer delay
            setTimeout(() => this.checkIfCollected(retryCount + 1), 2000);
          } else {
            console.warn('🎒 Collectible: Max retries reached, giving up on collected check');
          }
        }
      } catch (error) {
        console.error('🎒 Collectible: Error checking if collected:', error);
        // Retry on error if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          setTimeout(() => this.checkIfCollected(retryCount + 1), 2000);
        }
      }
    }, 1000); // Wait 1 second for window functions to be available
  },

  tick: function (time, deltaTime) {
    // Skip jika sudah dikumpulkan
    if (this.data.collected || this.isCollecting) {
      return;
    }
    
    // Dapatkan referensi rig jika belum ada
    if (!this.rig) {
      this.rig = document.getElementById('rig');
      if (!this.rig) return;
    }
    
    // Animasi floating (naik turun)
    this.floatingTime += (deltaTime / 1000) * this.floatingSpeed;
    const floatOffset = Math.sin(this.floatingTime) * this.floatingHeight;
    this.el.object3D.position.y = this.initialY + floatOffset;
    
    // Rotasi perlahan untuk efek visual
    this.el.object3D.rotation.y += (deltaTime / 1000) * 0.5; // 0.5 rad/sec
    
    // Hitung jarak ke player
    this.rig.object3D.getWorldPosition(this.playerPosition);
    this.el.object3D.getWorldPosition(this.itemPosition);
    
    const distance = this.playerPosition.distanceTo(this.itemPosition);
    
    // Jika player cukup dekat, collect item
    if (distance < this.data.collectDistance) {
      this.collectItem();
    }
  },

  collectItem: function () {
    // Cegah double collection
    if (this.isCollecting || this.data.collected) {
      return;
    }
    
    this.isCollecting = true;
    
    console.log('Collecting item:', this.data.itemName);
    
    // Buat data item untuk backpack
    // Gunakan itemImage sebagai icon (bukan emoji)
    const itemData = {
      id: this.data.itemId,
      name: this.data.itemName,
      description: this.data.itemDescription,
      icon: this.data.itemImage, // Gunakan path gambar, bukan emoji
      quantity: 1,
      category: this.data.itemCategory,
    };
    
    // Buat data untuk popup (sesuai interface NotificationItem)
    const popupData = {
      id: this.data.itemId,
      title: this.data.itemName,  // Gunakan 'title' bukan 'name'
      description: this.data.itemDescription,
      imageUrl: this.data.itemImage,
      category: this.data.itemCategory,
    };
    
    console.log('🎒 Collectible: Item data for backpack:', itemData);
    console.log('🎒 Collectible: Popup data for notification:', popupData);
    
    // Animasi collection (scale down dan fade out)
    this.animateCollection();
    
    // Tunggu sebentar untuk animasi, lalu add ke backpack dan show notification
    setTimeout(() => {
      console.log('🎒 Collectible: Checking window functions...');
      console.log('🎒 Collectible: window.addItemToBackpack exists:', typeof window.addItemToBackpack);
      console.log('🎒 Collectible: window.showSimpleNotification exists:', typeof window.showSimpleNotification);
      
      // Import fungsi dari module (akan diakses via window)
      if (window.addItemToBackpack && window.showSimpleNotification) {
        console.log('🎒 Collectible: Adding to backpack and showing notification');
        window.addItemToBackpack(itemData);
        window.showSimpleNotification(popupData);
        
        // Save to Firestore if user is authenticated
        if (window.saveCollectedItemToFirestore) {
          console.log('🎒 Collectible: Saving to Firestore:', this.data.itemId);
          const userId = localStorage.getItem('userId');
          if (userId) {
            window.saveCollectedItemToFirestore(userId, this.data.itemId)
              .then(() => {
                console.log('🎒 Collectible: Successfully saved to Firestore:', this.data.itemId);
              })
              .catch((error) => {
                console.error('🎒 Collectible: Error saving to Firestore:', error);
                // Even if save fails, we still remove the item to prevent double collection
                // The item will reappear on next load if save failed
              });
          } else {
            console.warn('🎒 Collectible: No user ID, cannot save to Firestore');
          }
        } else {
          console.warn('🎒 Collectible: saveCollectedItemToFirestore function not available');
        }
      } else {
        console.error('🎒 Collectible: Missing window functions!');
        console.error('🎒 Collectible: addItemToBackpack:', typeof window.addItemToBackpack);
        console.error('🎒 Collectible: showSimpleNotification:', typeof window.showSimpleNotification);
      }
      
      // Tandai sebagai collected
      this.el.setAttribute('collectible-item', 'collected', true);
      
      // Hapus entity dari scene
      this.el.parentNode.removeChild(this.el);
      
      console.log('🎒 Collectible: Item collected and added to backpack!');
      
      // Update mission progress and scoring for squad
      if (this.data.itemCategory === 'costume') {
        // Get current user's squad ID and update points
        (async () => {
          try {
            const squadId = await window.getCurrentSquadId();
            if (squadId) {
              // Update collectibles count
              if (window.updateMissionProgress) {
                await window.updateMissionProgress(squadId, 'collectible');
              }
              
              // Update squad points: +15 for collecting costume
              if (window.updateSquadPoints) {
                await window.updateSquadPoints(squadId, 15, `Collected costume: ${this.data.itemName}`);
              }
            }
          } catch (error) {
            console.error('[Collectible] Error updating squad points:', error);
          }
        })();
      }
      
      if (window.gameProgress && typeof window.gameProgress.recordItemCollected === 'function') {
        window.gameProgress.recordItemCollected(this.data.itemId);
      }
    }, 500); // Delay 500ms untuk animasi
  },

  animateCollection: function () {
    // Animasi scale down dan move up dengan Three.js
    const duration = 500; // 500ms
    const startTime = performance.now();
    const startScale = this.el.object3D.scale.clone();
    const startY = this.el.object3D.position.y;
    const endScale = new THREE.Vector3(0.1, 0.1, 0.1);
    const endY = startY + 2;
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease out)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate scale
      this.el.object3D.scale.lerpVectors(startScale, endScale, eased);
      
      // Interpolate position Y
      this.el.object3D.position.y = startY + (endY - startY) * eased;
      
      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  },

  getIconForCategory: function (category) {
    // Return emoji berdasarkan kategori
    switch (category) {
      case 'costume':
        return '👘';
      case 'artifact':
        return '🏺';
      case 'souvenir':
        return '🎁';
      default:
        return '📦';
    }
  },

  remove: function () {
    // Cleanup saat component dihapus
    this.rig = null;
  },
});

