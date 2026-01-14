/* global AFRAME, THREE */

/**
 * Component untuk memastikan player selalu di ground (tidak terbang)
 * Memaksa player position ke ground level menggunakan raycaster
 */
AFRAME.registerComponent('ground-constraint', {
  schema: {
    groundDistance: { type: 'number', default: 1.6 }, // Tinggi player dari ground
    groundOffset: { type: 'number', default: 0 }, // Offset tambahan
    updateInterval: { type: 'number', default: 100 } // Interval update dalam ms
  },

  init: function () {
    this.raycaster = new THREE.Raycaster();
    this.groundEntities = null;
    this.lastUpdate = 0;
    
    // Tunggu scene loaded
    this.el.sceneEl.addEventListener('loaded', () => {
      this.setupGroundEntities();
    });
    
    // Setup ground entities immediately if scene already loaded
    if (this.el.sceneEl.hasLoaded) {
      this.setupGroundEntities();
    }
  },

  setupGroundEntities: function () {
    // Cari semua ground entities
    this.groundEntities = this.el.sceneEl.querySelectorAll('.environmentGround, .environmentDressing');
    console.log('[GroundConstraint] Found ground entities:', this.groundEntities.length);
    
    // Jika tidak ada ground entities, coba lagi setelah delay (ground mungkin belum loaded)
    if (this.groundEntities.length === 0) {
      setTimeout(() => {
        this.groundEntities = this.el.sceneEl.querySelectorAll('.environmentGround, .environmentDressing');
        console.log('[GroundConstraint] Retry - Found ground entities:', this.groundEntities.length);
      }, 1000);
    }
  },

  tick: function (time, timeDelta) {
    // Update setiap beberapa ms untuk performa
    if (time - this.lastUpdate < this.data.updateInterval) {
      return;
    }
    this.lastUpdate = time;

    // Skip jika tidak ada ground entities
    if (!this.groundEntities || this.groundEntities.length === 0) {
      return;
    }

    const el = this.el;
    const currentPos = el.object3D.position;
    
    // Raycast ke bawah untuk cari ground
    // Start raycast dari posisi player (bukan dari atas) untuk menghindari deteksi atap rumah
    const rayStartY = currentPos.y + 1; // Start sedikit di atas player position
    const rayStart = new THREE.Vector3(currentPos.x, rayStartY, currentPos.z);
    const rayDirection = new THREE.Vector3(0, -1, 0);
    
    this.raycaster.set(rayStart, rayDirection);
    this.raycaster.far = 10; // Hanya cari ground dalam 10 unit ke bawah (tidak perlu terlalu jauh)
    
    let closestDistance = Infinity;
    let groundY = null;
    
    // Check semua ground entities
    this.groundEntities.forEach((groundEl) => {
      if (groundEl.object3D && groundEl.object3D.visible !== false) {
        try {
          const intersects = this.raycaster.intersectObject(groundEl.object3D, true);
          intersects.forEach(intersect => {
            // Hanya ambil ground yang benar-benar di bawah player (bukan atap rumah di atas)
            // Intersect point harus di bawah current position player
            const intersectY = rayStart.y - intersect.distance;
            // Hanya ambil jika intersect point di bawah player (bukan di atas)
            // Dan tidak terlalu jauh di bawah (max 5 unit)
            if (intersect.distance < closestDistance && 
                intersectY < currentPos.y && 
                intersectY > currentPos.y - 5) {
              closestDistance = intersect.distance;
              groundY = intersectY + this.data.groundDistance + this.data.groundOffset;
            }
          });
        } catch (e) {
          // Ignore errors
        }
      }
    });
    
    // Update position jika ground ditemukan
    if (groundY !== null && Math.abs(currentPos.y - groundY) > 0.1) {
      const targetY = groundY;
      const currentY = currentPos.y;
      const diff = Math.abs(currentY - targetY);
      
      // VALIDASI: Jangan pindahkan player jika targetY lebih tinggi dari currentY (player akan terlempar ke atas)
      // Hanya pindahkan jika targetY di bawah atau sama dengan currentY
      if (targetY > currentY + 0.5) {
        // Jangan pindahkan player ke posisi yang lebih tinggi (mencegah terlempar ke atap)
        return;
      }
      
      // VALIDASI: Jangan pindahkan jika perbedaan terlalu besar ke atas (mencegah terlempar ke atap)
      if (targetY > currentY && diff > 0.5) {
        // Jangan snap ke posisi yang lebih tinggi jika perbedaannya besar
        return;
      }
      
      // Jika player melayang tinggi (> 1 unit), langsung snap ke ground
      // Jika perbedaannya kecil, gunakan smooth interpolation
      let newY;
      if (diff > 1 && targetY < currentY) {
        // Snap langsung ke ground jika melayang tinggi DAN target di bawah
        newY = targetY;
        console.log('[GroundConstraint] Player floating detected, snapping to ground:', currentY, '->', newY);
      } else if (targetY < currentY) {
        // Smooth transition untuk perbedaan kecil, hanya jika target di bawah
        newY = currentY + (targetY - currentY) * 0.5; // Smooth interpolation
      } else {
        // Jika target di atas, jangan pindahkan (mencegah terlempar ke atap)
        return;
      }
      
      el.object3D.position.y = newY;
      
      // Log jika perbedaan besar (debugging)
      if (diff > 0.5) {
        console.log('[GroundConstraint] Fixed player Y position:', currentY, '->', newY);
      }
    }
  }
});

console.log('[GroundConstraint] Component registered');

