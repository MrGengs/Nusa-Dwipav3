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
      
      const mesh = collidableEl.getObject3D('mesh');
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

    // Cast rays in all directions
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
  }
});
