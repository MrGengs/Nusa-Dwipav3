/* global AFRAME, THREE */

/**
 * Component untuk teleport player ke posisi tertentu saat mereka mendekat ke portal
 * Digunakan untuk masuk/keluar dari rumah adat
 */
AFRAME.registerComponent('teleport-portal', {
  schema: {
    // Posisi target teleport dalam format "x y z"
    targetPosition: { type: 'string', default: '0 0 0' },
    // Jarak trigger untuk teleport (dalam meter)
    triggerDistance: { type: 'number', default: 2 },
    // Tipe portal: "entrance" atau "exit"
    portalType: { type: 'string', default: 'entrance' },
    // Debug mode untuk logging
    debug: { type: 'boolean', default: false }
  },

  init: function () {
    this.rig = null;
    this.playerPosition = new THREE.Vector3();
    this.portalPosition = new THREE.Vector3();
    this.targetPos = new THREE.Vector3();
    
    // Parse target position
    const posArray = this.data.targetPosition.trim().split(/\s+/);
    if (posArray.length >= 3) {
      this.targetPos.set(
        parseFloat(posArray[0]),
        parseFloat(posArray[1]),
        parseFloat(posArray[2])
      );
    }
    
    // Flag untuk mencegah teleport berulang-ulang
    this.isTeleporting = false;
    this.cooldownTime = 1000; // 1 detik cooldown
    this.lastTeleportTime = 0;
    
    if (this.data.debug) {
      console.log('[TeleportPortal] Initialized:', {
        targetPosition: this.targetPos,
        triggerDistance: this.data.triggerDistance,
        portalType: this.data.portalType
      });
    }
    
    // Buat visual indicator segitiga kuning untuk portal
    this.createTriangleIndicator();
  },

  createTriangleIndicator: function () {
    // Buat entity untuk container segitiga
    const triangleContainer = document.createElement('a-entity');
    triangleContainer.setAttribute('position', '0 0.8 0');
    triangleContainer.setAttribute('visible', 'true');
    
    // Buat custom triangle geometry 2D menggunakan THREE.js
    const createTriangleGeometry = () => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.6); // Puncak atas
      shape.lineTo(-0.6, -0.6); // Sudut kiri bawah
      shape.lineTo(0.6, -0.6); // Sudut kanan bawah
      shape.lineTo(0, 0.6); // Tutup segitiga
      return new THREE.ShapeGeometry(shape);
    };
    
    // Buat mesh segitiga 2D dengan material kuning emas
    const triangleMesh = new THREE.Mesh(
      createTriangleGeometry(),
      new THREE.MeshStandardMaterial({
        color: '#FFD700',
        emissive: '#FFD700',
        emissiveIntensity: 1.0,
        side: THREE.DoubleSide,
        transparent: false
      })
    );
    
    // Buat entity untuk segitiga
    const triangleEntity = document.createElement('a-entity');
    triangleEntity.setObject3D('mesh', triangleMesh);
    triangleEntity.setAttribute('rotation', '0 0 180');
    triangleEntity.setAttribute('visible', 'true');
    
    // Tambahkan animasi floating (naik turun) pada container
    triangleContainer.setAttribute('animation__float', {
      property: 'position',
      to: '0 1.2 0',
      from: '0 0.8 0',
      dur: 2000,
      loop: 'true',
      easing: 'easeInOutSine',
      dir: 'alternate'
    });
    
    // Tambahkan segitiga ke container
    triangleContainer.appendChild(triangleEntity);
    
    // Simpan reference
    this.triangleIndicator = triangleContainer;
    
    // Append ke entity utama
    this.el.appendChild(triangleContainer);
    
    // Force update untuk memastikan visible
    setTimeout(() => {
      triangleContainer.setAttribute('visible', 'true');
      triangleEntity.setAttribute('visible', 'true');
    }, 100);
  },

  tick: function () {
    // Skip jika sedang dalam cooldown
    const currentTime = Date.now();
    if (currentTime - this.lastTeleportTime < this.cooldownTime) {
      return;
    }
    
    // Get rig reference jika belum ada
    if (!this.rig) {
      this.rig = document.getElementById('rig');
      if (!this.rig) {
        return; // Rig belum tersedia, tunggu frame berikutnya
      }
    }
    
    // Skip jika sedang teleport
    if (this.isTeleporting) {
      return;
    }
    
    // Pastikan rig dan el memiliki object3D
    if (!this.rig.object3D || !this.el.object3D) {
      return;
    }
    
    // Get current positions menggunakan world position untuk akurasi
    try {
      this.rig.object3D.getWorldPosition(this.playerPosition);
      this.el.object3D.getWorldPosition(this.portalPosition);
    } catch (e) {
      if (this.data.debug) {
        console.warn('[TeleportPortal] Error getting positions:', e);
      }
      return;
    }
    
    // Calculate distance (hanya di horizontal plane untuk menghindari masalah dengan Y axis)
    const dx = this.playerPosition.x - this.portalPosition.x;
    const dz = this.playerPosition.z - this.portalPosition.z;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    
    // Juga hitung full 3D distance untuk referensi
    const fullDistance = this.playerPosition.distanceTo(this.portalPosition);
    
    // Gunakan horizontal distance untuk trigger (lebih akurat untuk portal)
    const triggerDistance = horizontalDistance <= this.data.triggerDistance;
    
    if (this.data.debug && Math.floor(currentTime / 1000) % 2 === 0) {
      console.log('[TeleportPortal]', {
        horizontalDistance: horizontalDistance.toFixed(2),
        fullDistance: fullDistance.toFixed(2),
        triggerDistance: this.data.triggerDistance,
        portalType: this.data.portalType
      });
    }
    
    // Check if player is within trigger distance
    if (triggerDistance) {
      this.teleport();
    }
  },

  teleport: function () {
    // Prevent multiple teleports
    if (this.isTeleporting) {
      return;
    }
    
    this.isTeleporting = true;
    this.lastTeleportTime = Date.now();
    
    // Get current position
    const currentPos = this.rig.getAttribute('position');
    const currentPosObj = typeof currentPos === 'string' 
      ? this.parsePosition(currentPos)
      : (currentPos || { x: 0, y: 0, z: 0 });
    
    if (this.data.debug) {
      console.log('[TeleportPortal] Teleporting player:', {
        from: currentPosObj,
        to: this.targetPos,
        portalType: this.data.portalType
      });
    }
    
    // Calculate new position - use target Y directly (dalam rumah biasanya lebih tinggi)
    // Atau bisa ditambahkan offset jika diperlukan
    const yOffset = this.data.portalType === 'entrance' ? 0 : 0; // Biasanya masuk rumah lebih tinggi
    const newPosition = {
      x: this.targetPos.x,
      y: this.targetPos.y + yOffset,
      z: this.targetPos.z
    };
    
    // Buat efek fade in/out black
    this.createFadeEffect(newPosition);
  },

  createFadeEffect: function (newPosition) {
    // Simpan posisi sebelum teleport
    const currentPos = this.rig.getAttribute('position');
    const fromPosition = typeof currentPos === 'string' 
      ? this.parsePosition(currentPos)
      : (currentPos || { x: 0, y: 0, z: 0 });
    
    // Cek apakah overlay sudah ada
    let fadeOverlay = document.getElementById('teleport-fade-overlay');
    
    if (!fadeOverlay) {
      // Buat overlay hitam
      fadeOverlay = document.createElement('div');
      fadeOverlay.id = 'teleport-fade-overlay';
      fadeOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: black;
        z-index: 999999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(fadeOverlay);
    }
    
    // Reset overlay ke awal
    fadeOverlay.style.opacity = '0';
    fadeOverlay.style.display = 'block';
    
    // Fade in (hitam muncul) - 300ms
    setTimeout(() => {
      fadeOverlay.style.transition = 'opacity 0.3s ease';
      fadeOverlay.style.opacity = '1';
      
      // Setelah fade in selesai, teleport player
      setTimeout(() => {
        // Set position saat layar hitam penuh
        // Untuk rumah yang tinggi, pastikan player berada tepat di atas collision floor
        // Collision floor biasanya berada di Y spawn - 0.1, jadi player harus di Y spawn
        this.rig.setAttribute('position', {
          x: newPosition.x,
          y: newPosition.y,
          z: newPosition.z
        });
        
        // Force update untuk memastikan position berubah
        this.rig.object3D.position.set(newPosition.x, newPosition.y, newPosition.z);
        
        // Force update ground-constraint dan navmesh-constraint untuk mencegah player terpental
        const groundConstraint = this.rig.components['ground-constraint'];
        if (groundConstraint && groundConstraint.setupGroundEntities) {
          groundConstraint.setupGroundEntities();
        }
        
        const navmeshConstraint = this.rig.components['simple-navmesh-constraint'];
        if (navmeshConstraint) {
          // Force update navmesh constraint
          this.rig.setAttribute('simple-navmesh-constraint', this.rig.getAttribute('simple-navmesh-constraint'));
        }
        
        // Tambahkan delay untuk memastikan collision floor sudah terdeteksi
        setTimeout(() => {
          // Double-check position dan pastikan player tidak jatuh
          const currentPos = this.rig.getAttribute('position');
          const currentY = typeof currentPos === 'string' 
            ? parseFloat(currentPos.split(/\s+/)[1]) 
            : (currentPos?.y || newPosition.y);
          
          // Jika player jatuh terlalu rendah (lebih dari 0.3 dari target), reset ke target
          if (currentY < newPosition.y - 0.3) {
            this.rig.setAttribute('position', {
              x: newPosition.x,
              y: newPosition.y,
              z: newPosition.z
            });
            this.rig.object3D.position.set(newPosition.x, newPosition.y, newPosition.z);
            if (this.data.debug) {
              console.log('[TeleportPortal] ⚠️ Corrected player position (prevented fall)');
            }
          }
        }, 100);
        
        // Dispatch custom event untuk logging/analytics
        const event = new CustomEvent('portal-teleport', {
          detail: {
            portalType: this.data.portalType,
            from: fromPosition,
            to: newPosition
          }
        });
        document.dispatchEvent(event);
        
        if (this.data.debug) {
          console.log('[TeleportPortal] ✅ Teleport completed to:', newPosition);
        }
        
        // Fade out (hitam hilang) setelah sedikit delay - 300ms
        setTimeout(() => {
          fadeOverlay.style.transition = 'opacity 0.3s ease';
          fadeOverlay.style.opacity = '0';
          
          // Double-check position setelah fade out untuk memastikan player tidak terpental
          setTimeout(() => {
            const currentPos = this.rig.getAttribute('position');
            const currentY = typeof currentPos === 'string' 
              ? parseFloat(currentPos.split(/\s+/)[1]) 
              : (currentPos?.y || newPosition.y);
            
            // Jika player terpental terlalu tinggi (lebih dari 0.5 dari target), reset ke target
            if (Math.abs(currentY - newPosition.y) > 0.5) {
              this.rig.setAttribute('position', {
                x: newPosition.x,
                y: newPosition.y,
                z: newPosition.z
              });
              this.rig.object3D.position.set(newPosition.x, newPosition.y, newPosition.z);
              if (this.data.debug) {
                console.log('[TeleportPortal] ⚠️ Corrected player position after teleport');
              }
            }
            
            this.isTeleporting = false;
            fadeOverlay.style.display = 'none';
          }, 300); // Tunggu fade out selesai
        }, 100); // Delay kecil sebelum fade out
      }, 300); // Tunggu fade in selesai
    }, 10); // Delay kecil untuk memastikan overlay siap
  },

  parsePosition: function (positionStr) {
    if (typeof positionStr !== 'string') {
      return { x: 0, y: 0, z: 0 };
    }
    const parts = positionStr.trim().split(/\s+/);
    return {
      x: parseFloat(parts[0]) || 0,
      y: parseFloat(parts[1]) || 0,
      z: parseFloat(parts[2]) || 0
    };
  },

  remove: function () {
    // Cleanup jika perlu
    this.rig = null;
  }
});

