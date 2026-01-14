/**
 * Ondel-Ondel NPC Movement Component
 * Makes ondel-ondel figures move along the corridor as NPCs
 */

AFRAME.registerComponent('ondel-npc', {
  schema: {
    speed: { type: 'number', default: 1.0 },
    direction: { type: 'string', default: 'forward' }, // 'forward' or 'backward'
    startPosition: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
    corridorLength: { type: 'number', default: 120 }, // Length of the corridor
    pauseTime: { type: 'number', default: 2000 }, // Pause time at each end (ms)
    animationSpeed: { type: 'number', default: 1.0 } // Animation speed multiplier
  },

  init: function () {
    console.log('[Ondel-NPC] Initializing ondel-ondel NPC...');
    console.log('[Ondel-NPC] Component data:', this.data);
    
    this.currentPosition = this.data.startPosition;
    this.isMoving = true;
    this.isPaused = false;
    this.pauseStartTime = 0;
    this.animationFrame = 0;
    this.lastPlayerDistance = Infinity;
    
    // Set initial position
    this.el.setAttribute('position', this.currentPosition);
    
    // Wait for model to load before setting up other features
    this.el.addEventListener('model-loaded', () => {
      console.log('[Ondel-NPC] Model loaded, setting up features...');
      this.setupAnimation();
      this.setupCollision();
      this.setupVisualEffects();
    });
    
    // If model is already loaded, set up features immediately
    setTimeout(() => {
      if (this.el.getObject3D('mesh')) {
        console.log('[Ondel-NPC] Model already loaded, setting up features...');
        this.setupAnimation();
        this.setupCollision();
        this.setupVisualEffects();
      }
    }, 100);
    
    console.log(`[Ondel-NPC] Ondel-ondel initialized at position:`, this.currentPosition);
  },

  setupAnimation: function () {
    // Try to find and play walking animation
    const model = this.el.getObject3D('mesh');
    if (model && model.animations && model.animations.length > 0) {
      console.log('[Ondel-NPC] Found animations:', model.animations.length);
      
      // Look for walking animation
      const walkingAnim = model.animations.find(anim => 
        anim.name.toLowerCase().includes('walk') || 
        anim.name.toLowerCase().includes('move') ||
        anim.name.toLowerCase().includes('idle')
      );
      
      if (walkingAnim) {
        console.log('[Ondel-NPC] Playing animation:', walkingAnim.name);
        this.el.setAttribute('animation-mixer', {
          clip: walkingAnim.name,
          loop: 'repeat',
          repetitions: Infinity,
          timeScale: this.data.animationSpeed
        });
      }
    }
  },

  tick: function (time, timeDelta) {
    // Debug logging every 5 seconds
    if (Math.floor(time / 5000) !== Math.floor((time - timeDelta) / 5000)) {
      console.log(`[Ondel-NPC] Tick - isMoving: ${this.isMoving}, isPaused: ${this.isPaused}, position: ${this.currentPosition.x.toFixed(1)}`);
    }
    
    if (!this.isMoving || this.isPaused) {
      return;
    }

    // Check player distance for realistic behavior
    const playerDistance = this.getPlayerDistance();
    const isPlayerNearby = playerDistance < 10; // Within 10 units
    
    // Handle pause at corridor ends
    if (this.isPaused) {
      if (time - this.pauseStartTime >= this.data.pauseTime) {
        this.isPaused = false;
        this.data.direction = this.data.direction === 'forward' ? 'backward' : 'forward';
        console.log(`[Ondel-NPC] Resuming movement in ${this.data.direction} direction`);
      }
      return;
    }

    // Adjust speed based on player proximity
    let currentSpeed = this.data.speed;
    if (isPlayerNearby) {
      currentSpeed *= 0.5; // Slow down when player is nearby
    }

    // Calculate movement along X-axis (corridor direction)
    const moveDistance = (currentSpeed * timeDelta) / 1000; // Convert to units per second
    
    if (this.data.direction === 'forward') {
      this.currentPosition.x += moveDistance;
      
      // Check if reached the end of corridor (right side)
      if (this.currentPosition.x >= 60) {
        this.currentPosition.x = 60;
        this.startPause();
        return;
      }
    } else {
      this.currentPosition.x -= moveDistance;
      
      // Check if reached the beginning of corridor (left side)
      if (this.currentPosition.x <= -60) {
        this.currentPosition.x = -60;
        this.startPause();
        return;
      }
    }

    // Update position with bobbing animation
    this.animationFrame += timeDelta * 0.003;
    const bobOffset = Math.sin(this.animationFrame) * 0.05;
    
    this.el.setAttribute('position', {
      x: this.currentPosition.x,
      y: this.currentPosition.y + bobOffset,
      z: this.currentPosition.z
    });

    // Update rotation to face movement direction
    const targetRotation = this.data.direction === 'forward' ? 90 : -90;
    this.el.setAttribute('rotation', {
      x: 0,
      y: targetRotation,
      z: 0
    });

    // Log movement occasionally for debugging
    if (Math.floor(time / 5000) !== Math.floor((time - timeDelta) / 5000)) {
      console.log(`[Ondel-NPC] Moving ${this.data.direction} at position: ${this.currentPosition.x.toFixed(1)}`);
    }
  },

  startPause: function () {
    this.isPaused = true;
    this.pauseStartTime = performance.now();
    console.log(`[Ondel-NPC] Pausing at corridor end for ${this.data.pauseTime}ms`);
  },

  // Method to change direction manually
  changeDirection: function () {
    this.data.direction = this.data.direction === 'forward' ? 'backward' : 'forward';
    console.log(`[Ondel-NPC] Direction changed to: ${this.data.direction}`);
  },

  // Method to pause/resume movement
  toggleMovement: function () {
    this.isMoving = !this.isMoving;
    console.log(`[Ondel-NPC] Movement ${this.isMoving ? 'resumed' : 'paused'}`);
  },

  setupCollision: function () {
    // Add a collision box for the ondel-ondel
    this.el.setAttribute('static-body', 'shape: box; mass: 0');
    
    // Add collision event listeners
    this.el.addEventListener('collide', (event) => {
      const otherEntity = event.detail.body.el;
      
      // Check if colliding with player
      if (otherEntity.id === 'rig' || otherEntity.classList.contains('camera')) {
        console.log('[Ondel-NPC] Collision with player detected!');
        
        // Temporarily pause movement when player is too close
        this.tempPauseMovement();
      }
    });
  },

  setupVisualEffects: function () {
    // Add a subtle glow effect
    this.el.setAttribute('material', 'emissive: #ffaa00; emissiveIntensity: 0.1');
    
    // Add a name tag above the ondel-ondel
    const nameTag = document.createElement('a-text');
    nameTag.setAttribute('value', 'Ondel-Ondel');
    nameTag.setAttribute('position', '0 3 0');
    nameTag.setAttribute('scale', '0.5 0.5 0.5');
    nameTag.setAttribute('align', 'center');
    nameTag.setAttribute('color', '#ffaa00');
    nameTag.setAttribute('opacity', '0.8');
    this.el.appendChild(nameTag);
    
    // Add a trail effect (optional)
    this.el.setAttribute('particle-system', {
      preset: 'dust',
      particleCount: 10,
      color: '#ffaa00',
      opacity: 0.3,
      size: 0.1,
      velocityValue: '0 0.1 0'
    });
  },

  tempPauseMovement: function () {
    // Temporarily slow down when player is nearby
    const originalSpeed = this.data.speed;
    this.data.speed = originalSpeed * 0.3;
    
    setTimeout(() => {
      this.data.speed = originalSpeed;
    }, 2000);
  },

  // Method to get distance to player
  getPlayerDistance: function () {
    const player = document.getElementById('rig');
    if (!player) return Infinity;
    
    const playerPos = player.getAttribute('position');
    const ondelPos = this.el.getAttribute('position');
    
    if (!playerPos || !ondelPos) return Infinity;
    
    const dx = playerPos.x - ondelPos.x;
    const dz = playerPos.z - ondelPos.z;
    
    return Math.sqrt(dx * dx + dz * dz);
  }
});

console.log('[Ondel-NPC] Component registered successfully');

// Test function to verify component is working
window.testOndelNPC = function() {
  console.log('[Ondel-NPC] Testing component registration...');
  const ondelEntities = document.querySelectorAll('[ondel-npc]');
  console.log(`[Ondel-NPC] Found ${ondelEntities.length} ondel-npc entities`);
  
  ondelEntities.forEach((entity, index) => {
    const position = entity.getAttribute('position');
    const component = entity.components['ondel-npc'];
    console.log(`[Ondel-NPC] Entity ${index + 1}: position=${position}, component=${component ? 'loaded' : 'missing'}`);
  });
};