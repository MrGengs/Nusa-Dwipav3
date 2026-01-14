/* global AFRAME, THREE */

/**
 * A component to prevent the entity from passing through other entities with the 'collidable' class.
 * It works by casting rays in multiple directions and pushing the entity back if a collision is detected.
 */
AFRAME.registerComponent('simple-collider', {
  schema: {
    // The distance of the rays cast to check for collisions.
    distance: {type: 'number', default: 0.5},
    // Whether to show the debug rays.
    debug: {type: 'boolean', default: false}
  },

  init: function () {
    this.raycaster = new THREE.Raycaster();
    this.directions = [
      new THREE.Vector3(0, 0, -1), // Forward
      new THREE.Vector3(0, 0, 1),  // Backward
      new THREE.Vector3(-1, 0, 0), // Left
      new THREE.Vector3(1, 0, 0),   // Right
      new THREE.Vector3(-0.7, 0, -0.7).normalize(), // Forward-Left
      new THREE.Vector3(0.7, 0, -0.7).normalize(),  // Forward-Right
      new THREE.Vector3(-0.7, 0, 0.7).normalize(),  // Backward-Left
      new THREE.Vector3(0.7, 0, 0.7).normalize()   // Backward-Right
    ];
    
    // Raycast ke bawah untuk mendeteksi lantai
    this.floorRaycaster = new THREE.Raycaster();
    this.floorDirection = new THREE.Vector3(0, -1, 0); // Ke bawah
    
    // Flag untuk mencegah getaran - hanya koreksi jika benar-benar perlu
    this.lastCorrectedY = null;
    this.correctionCooldown = 0;

    // Cache collidable meshes for better performance
    this.collidableMeshes = [];
    this.needsUpdate = true;

    if (this.data.debug) {
      this.lines = {};
      for (let i = 0; i < this.directions.length; i++) {
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(6); // 2 points * 3 coordinates
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const line = new THREE.Line(geometry, material);
        this.el.sceneEl.object3D.add(line);
        this.lines[i] = line;
      }
    }

    // Listen for scene changes to update collidable meshes
    this.el.sceneEl.addEventListener('child-attached', () => {
      this.needsUpdate = true;
    });
    this.el.sceneEl.addEventListener('child-detached', () => {
      this.needsUpdate = true;
    });
  },

  updateCollidableMeshes: function () {
    const collidableEls = this.el.sceneEl.querySelectorAll('.collidable');
    this.collidableMeshes = [];
    collidableEls.forEach(collidableEl => {
      // Skip self collision
      if (collidableEl === this.el) return;
      
      // Try to get mesh from 'mesh' key (for primitives)
      let mesh = collidableEl.getObject3D('mesh');
      
      // If no mesh found, use object3D directly (for GLB models loaded with gltf-model)
      if (!mesh) {
        mesh = collidableEl.object3D;
      }
      
      if (mesh) {
        this.collidableMeshes.push(mesh);
      }
    });
    this.needsUpdate = false;
  },

  tick: function () {
    const el = this.el;
    const center = new THREE.Vector3();
    el.object3D.getWorldPosition(center);

    // Update collidable meshes cache if needed
    if (this.needsUpdate) {
      this.updateCollidableMeshes();
    }

    if (this.collidableMeshes.length === 0) return;

    // First, check for floor collision (raycast ke bawah)
    // Cast ray ke bawah dari posisi player untuk mendeteksi lantai
    const floorCheckHeight = 5.0; // Check sampai 5 meter ke bawah (untuk rumah tinggi)
    this.floorRaycaster.set(center, this.floorDirection);
    this.floorRaycaster.far = floorCheckHeight;
    
    const floorIntersects = this.floorRaycaster.intersectObjects(this.collidableMeshes, true);
    
    if (floorIntersects.length > 0) {
      const floorDistance = floorIntersects[0].distance;
      const floorPoint = floorIntersects[0].point;
      const currentY = center.y;
      const floorY = floorPoint.y;
      
      // Player tinggi sekitar 1.6 (camera), jadi rig harus di floorY + 0.1
      const minHeightAboveFloor = 0.1; // Minimum height above floor
      const expectedY = floorY + minHeightAboveFloor;
      
      // Update cooldown
      if (this.correctionCooldown > 0) {
        this.correctionCooldown--;
      }
      
      const currentPos = el.getAttribute('position');
      const currentPosObj = typeof currentPos === 'string' 
        ? this.parsePosition(currentPos)
        : (currentPos || { x: 0, y: 0, z: 0 });
      
      const yDifference = currentY - expectedY;
      
      // Selalu pertahankan posisi player di atas lantai, bahkan saat tidak bergerak atau mulai bergerak
      // Jika player jatuh atau terlalu rendah, langsung perbaiki
      if (currentY < floorY - 0.1 || currentY < expectedY - 0.1) {
        // Player jatuh atau terlalu rendah, posisikan di atas lantai dengan force
        // Tidak perlu cooldown untuk kasus ini karena ini emergency correction
        el.setAttribute('position', {
          x: currentPosObj.x,
          y: expectedY,
          z: currentPosObj.z
        });
        el.object3D.position.set(currentPosObj.x, expectedY, currentPosObj.z);
        
        this.lastCorrectedY = expectedY;
        this.correctionCooldown = 0; // Reset cooldown karena ini emergency
        
        // Dispatch event untuk script lain
        const event = new CustomEvent('player-on-floor', {
          detail: { floorY: floorY, expectedY: expectedY, currentY: currentY }
        });
        el.sceneEl.dispatchEvent(event);
      } else {
        // Player berada di posisi yang benar, lakukan continuous correction untuk menjaga stabilitas
        // Lakukan koreksi setiap frame untuk mencegah player jatuh saat berhenti atau mulai bergerak
        // Tidak ada cooldown - selalu pertahankan posisi
        if (Math.abs(yDifference) > 0.01) {
          // Smooth correction - interpolate perlahan ke expectedY
          // Gunakan correction speed yang lebih tinggi untuk respons lebih cepat
          const correctionSpeed = 0.5; // 50% per frame untuk respons cepat
          const newY = currentY + (expectedY - currentY) * correctionSpeed;
          
          el.setAttribute('position', {
            x: currentPosObj.x,
            y: newY,
            z: currentPosObj.z
          });
          el.object3D.position.set(currentPosObj.x, newY, currentPosObj.z);
          
          this.lastCorrectedY = newY;
        } else {
          // Jika sudah sangat dekat dengan expectedY, lock ke expectedY
          if (Math.abs(yDifference) > 0.005) {
            el.setAttribute('position', {
              x: currentPosObj.x,
              y: expectedY,
              z: currentPosObj.z
            });
            el.object3D.position.set(currentPosObj.x, expectedY, currentPosObj.z);
            this.lastCorrectedY = expectedY;
          }
        }
      }
    }

    // Cast rays in all horizontal directions for wall collision
    for (let i = 0; i < this.directions.length; i++) {
      const direction = this.directions[i].clone().applyQuaternion(el.object3D.quaternion);
      this.raycaster.set(center, direction);
      this.raycaster.far = this.data.distance;

      const intersects = this.raycaster.intersectObjects(this.collidableMeshes, true);

      if (intersects.length > 0) {
        const distance = intersects[0].distance;
        if (distance < this.data.distance) {
          // If a collision is detected, push the entity back.
          const overlap = this.data.distance - distance;
          const pushback = direction.clone().negate().multiplyScalar(overlap);
          el.object3D.position.add(pushback);
          break; // Only handle one collision at a time to prevent weird behavior
        }
      }
      
      if (this.data.debug) {
        const start = center.clone();
        const end = center.clone().add(direction.multiplyScalar(this.data.distance));
        const positions = this.lines[i].geometry.attributes.position.array;
        positions[0] = start.x; positions[1] = start.y; positions[2] = start.z;
        positions[3] = end.x; positions[4] = end.y; positions[5] = end.z;
        this.lines[i].geometry.attributes.position.needsUpdate = true;
      }
    }
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
  }
});
