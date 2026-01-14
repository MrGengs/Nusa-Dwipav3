/* global AFRAME */

/**
 * Component to create a ground-level collision box only at the base of assets.
 * This creates a thin invisible collision platform at the bottom to prevent players from walking under assets.
 */
AFRAME.registerComponent('house-collision', {
  schema: {
    width: { type: 'number', default: 10 },
    height: { type: 'number', default: 0.05 }, // Very thin - only ground level
    depth: { type: 'number', default: 10 },
    offsetX: { type: 'number', default: 0 },
    offsetY: { type: 'number', default: 0 }, // At ground level (0)
    offsetZ: { type: 'number', default: 0 }
  },

  init: function () {
    // Create an invisible thin box entity for ground-level collision only
    const collisionBox = document.createElement('a-box');
    
    // Small padding to make collision less tight
    const padding = 0.2;
    
    // Set dimensions - very thin height, only at ground level
    collisionBox.setAttribute('width', Math.max(0.5, this.data.width - padding));
    collisionBox.setAttribute('height', 0.05); // Very thin - only ground platform (reduced to 0.05)
    collisionBox.setAttribute('depth', Math.max(0.5, this.data.depth - padding));
    
    // Get the entity's position to place collision at ground level
    const entityPos = this.el.getAttribute('position') || { x: 0, y: 0, z: 0 };
    
    // Set position offset - place at ground level relative to entity (slightly below ground)
    collisionBox.setAttribute('position', {
      x: this.data.offsetX,
      y: this.data.offsetY - 0.05, // Slightly below ground to prevent pushing player up
      z: this.data.offsetZ
    });
    
    // Make it completely invisible and non-interactive
    collisionBox.setAttribute('visible', false);
    collisionBox.setAttribute('material', 'opacity: 0; transparent: true');
    
    // DON'T add OBB collider - it causes issues with teleport
    // collisionBox.setAttribute('obb-collider', '');
    
    // DON'T add collidable class - it causes simple-collider to push player up
    // collisionBox.classList.add('collidable');
    
    // Only use static-body for ground collision, not for player collision
    collisionBox.setAttribute('static-body', 'shape: box; mass: 0');
    
    // Set an ID for debugging if needed
    collisionBox.id = this.el.id ? `${this.el.id}-ground-collision` : 'ground-collision-box';
    
    // Append to parent entity
    this.el.appendChild(collisionBox);
    
    // Store reference for cleanup
    this.collisionBox = collisionBox;
  },

  update: function (oldData) {
    // Update collision box if schema changes
    if (this.collisionBox) {
      const padding = 0.2;
      this.collisionBox.setAttribute('width', Math.max(0.5, this.data.width - padding));
      this.collisionBox.setAttribute('height', 0.05); // Always very thin
      this.collisionBox.setAttribute('depth', Math.max(0.5, this.data.depth - padding));
      this.collisionBox.setAttribute('position', {
        x: this.data.offsetX,
        y: this.data.offsetY - 0.05, // Slightly below ground
        z: this.data.offsetZ
      });
    }
  },

  remove: function () {
    // Clean up collision box when component is removed
    if (this.collisionBox && this.collisionBox.parentNode) {
      this.collisionBox.parentNode.removeChild(this.collisionBox);
    }
  }
});

