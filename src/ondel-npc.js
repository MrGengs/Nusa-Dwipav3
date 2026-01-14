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
    
    // Parse startPosition - A-Frame should parse vec3 automatically, but handle both formats
    let startPos;
    if (typeof this.data.startPosition === 'string') {
      // Parse string format "x y z"
      const parts = this.data.startPosition.trim().split(/\s+/);
      startPos = {
        x: parseFloat(parts[0]) || 0,
        y: parseFloat(parts[1]) || 0,
        z: parseFloat(parts[2]) || 0
      };
    } else if (this.data.startPosition && typeof this.data.startPosition === 'object') {
      // Already parsed by A-Frame as vec3
      startPos = {
        x: this.data.startPosition.x || 0,
        y: this.data.startPosition.y || 0,
        z: this.data.startPosition.z || 0
      };
    } else {
      // Fallback to current position or default
      const currentPos = this.el.getAttribute('position');
      if (currentPos && typeof currentPos === 'object') {
        startPos = { x: currentPos.x || 0, y: currentPos.y || 0, z: currentPos.z || 0 };
      } else {
        startPos = { x: 0, y: 0, z: 0 };
      }
    }
    
    this.currentPosition = {
      x: startPos.x,
      y: startPos.y,
      z: startPos.z
    };
    
    // Calculate end positions based on start position and corridor length
    this.startX = this.currentPosition.x;
    this.endXForward = this.startX + (this.data.corridorLength / 2);
    this.endXBackward = this.startX - (this.data.corridorLength / 2);
    
    this.isMoving = true;
    this.isPaused = false;
    this.pauseStartTime = 0;
    this.animationFrame = 0;
    this.lastPlayerDistance = Infinity;
    this.experienceActive = false;
    
    // Set initial position
    this.el.setAttribute('position', this.currentPosition);
    
    // Set initial rotation based on direction
    this.updateRotation();
    
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
    
    console.log(`[Ondel-NPC] ✅ Ondel-ondel initialized:`, {
      id: this.el.id || 'unknown',
      position: this.currentPosition,
      direction: this.data.direction,
      startX: this.startX,
      endXForward: this.endXForward,
      endXBackward: this.endXBackward,
      corridorLength: this.data.corridorLength,
      speed: this.data.speed,
      isMoving: this.isMoving
    });
    
    // Force start movement after a short delay to ensure everything is ready
    setTimeout(() => {
      this.isMoving = true;
      console.log(`[Ondel-NPC] ✅ Movement started for ${this.el.id || 'ondel'}`);
    }, 500);
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
    // Check experience active status (for convert.html, allow movement always)
    // Convert.html is single-player, so always allow movement
    const isConvertPage = window.__isConvertPage === true;
    
    // For convert.html or if scene is loaded, allow movement
    if (isConvertPage) {
      // For convert.html, always allow movement
      this.experienceActive = true;
    } else {
      // For other pages, check experience status
      this.experienceActive = this.isExperienceActive();
      // Also allow movement if scene is loaded (for early start)
      if (!this.experienceActive) {
        const scene = document.querySelector('a-scene');
        if (scene && scene.hasLoaded) {
          this.experienceActive = true;
        } else {
          return;
        }
      }
    }

    // Handle pause at corridor ends
    if (this.isPaused) {
      const currentTime = performance.now();
      if (currentTime - this.pauseStartTime >= this.data.pauseTime) {
        // Pause selesai, lanjutkan pergerakan dengan arah baru
        this.isPaused = false;
        console.log(`[Ondel-NPC] Pause ended, continuing movement in ${this.data.direction} direction`);
      }
      return;
    }

    if (!this.isMoving) {
      return;
    }

    // Check player distance for realistic behavior
    const playerDistance = this.getPlayerDistance();
    const isPlayerNearby = playerDistance < 10; // Within 10 units

    // Adjust speed based on player proximity
    let currentSpeed = this.data.speed;
    if (isPlayerNearby) {
      currentSpeed *= 0.5; // Slow down when player is nearby
    }

    // Calculate movement along X-axis (corridor direction)
    const moveDistance = (currentSpeed * timeDelta) / 1000; // Convert to units per second
    
    if (this.data.direction === 'forward') {
      this.currentPosition.x += moveDistance;
      
      // Check if reached the end of corridor (forward end)
      if (this.currentPosition.x >= this.endXForward) {
        this.currentPosition.x = this.endXForward; // Clamp to end position
        this.startPause(); // Start pause before reversing
        return;
      }
    } else {
      // direction === 'backward'
      this.currentPosition.x -= moveDistance;
      
      // Check if reached the beginning of corridor (backward end)
      if (this.currentPosition.x <= this.endXBackward) {
        this.currentPosition.x = this.endXBackward; // Clamp to end position
        this.startPause(); // Start pause before reversing
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
    this.updateRotation();

    // Log movement occasionally for debugging
    if (Math.floor(time / 10000) !== Math.floor((time - timeDelta) / 10000)) {
      console.log(`[Ondel-NPC] Moving ${this.data.direction} at position: ${this.currentPosition.x.toFixed(1)}`);
    }
  },

  updateRotation: function () {
    // Get current rotation
    const currentRot = this.el.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
    const currentY = currentRot.y || 0;
    
    // Update rotation to face movement direction
    let targetRotationY;
    
    if (this.data.direction === 'forward') {
      // Forward direction - menghadap ke kanan (90 derajat)
      targetRotationY = 90;
    } else {
      // Backward direction - menghadap ke kiri (-90 atau 270 derajat)
      targetRotationY = -90;
    }
    
    // Set rotation
    this.el.setAttribute('rotation', {
      x: currentRot.x || 0,
      y: targetRotationY,
      z: currentRot.z || 0
    });
  },

  startPause: function () {
    this.isPaused = true;
    this.pauseStartTime = performance.now();
    
    // Reverse direction immediately when reaching end
    this.data.direction = this.data.direction === 'forward' ? 'backward' : 'forward';
    
    // Rotate 180 degrees to face the opposite direction
    this.updateRotation();
    
    console.log(`[Ondel-NPC] Reached end, pausing for ${this.data.pauseTime}ms. New direction: ${this.data.direction}, position: ${this.currentPosition.x.toFixed(2)}`);
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
    // Remove static-body to allow movement
    // Static-body prevents movement, so we don't want it for moving NPCs
    // Instead, we can add kinematic body if physics is needed
    // For now, we'll skip collision setup to allow free movement
    
    // Optional: Add collision detection without static-body
    // this.el.addEventListener('collide', (event) => {
    //   const otherEntity = event.detail.body.el;
    //   if (otherEntity.id === 'rig' || otherEntity.classList.contains('camera')) {
    //     console.log('[Ondel-NPC] Collision with player detected!');
    //     this.tempPauseMovement();
    //   }
    // });
  },

  setupVisualEffects: function () {
    // Visual effects optional - commented out to avoid conflicts
    // Uncomment if needed:
    // this.el.setAttribute('material', 'emissive: #ffaa00; emissiveIntensity: 0.1');
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
  },

  isExperienceActive: function () {
    if (typeof window === 'undefined') {
      return false;
    }
    if (typeof window.experienceStarted === 'function') {
      try {
        return Boolean(window.experienceStarted());
      } catch (error) {
        console.warn('[Ondel-NPC] Unable to read experience status:', error);
        return false;
      }
    }
    return false;
  }
});

console.log('[Ondel-NPC] Component registered successfully');

