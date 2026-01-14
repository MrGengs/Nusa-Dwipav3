/* global AFRAME */
import './game-progress';
import './player-info';
import './change-room';
import './car-pusher';
import './follow-entity';
import './collectible-item';
import './satpam-guard';
import './house-portal';
import './ondel-npc';
// import './house-collision'; // Disabled - collision removed
import './ground-constraint';

// Component untuk spawn player di posisi acak dalam lingkaran
AFRAME.registerComponent('spawn-in-circle', {
  schema: {
    radius: { type: 'number', default: 1 },
  },

  init: function () {
    const el = this.el;
    const center = el.getAttribute('position');

    const angleRad = this.getRandomAngleInRadians();
    const circlePoint = this.randomPointOnCircle(this.data.radius, angleRad);
    const worldPoint = { x: circlePoint.x + center.x, y: center.y, z: circlePoint.y + center.z };
    el.setAttribute('position', worldPoint);

    // const angleDeg = (angleRad * 180) / Math.PI;
    // const angleToCenter = -1 * angleDeg + 90;
    // angleRad = THREE.MathUtils.degToRad(angleToCenter);
    // el.object3D.rotation.set(0, angleRad, 0);
  },

  getRandomAngleInRadians: function () {
    return Math.PI * 2 * (Math.floor(Math.random() * 8) / 8.0);
  },

  randomPointOnCircle: function (radius, angleRad) {
    const x = Math.cos(angleRad) * radius;
    const y = Math.sin(angleRad) * radius;
    return { x: x, y: y };
  },
});

// Component untuk membuat player bisa jump (lompat)
// Tekan spacebar untuk melompat
AFRAME.registerComponent('jump-ability', {
  schema: {
    // Kekuatan lompatan (semakin tinggi nilai, semakin tinggi lompatannya)
    jumpVelocity: { type: 'number', default: 5 },
    // Jarak raycast ke bawah untuk cek apakah player di tanah
    groundDistance: { type: 'number', default: 0.5 },
    // Cooldown antar jump dalam ms untuk mencegah double jump
    jumpCooldown: { type: 'number', default: 500 }
  },

  init: function () {
    this.onGround = true; // Default true agar bisa jump saat start
    this.lastJumpTime = 0; // Track waktu jump terakhir
    this.isJumping = false; // Track apakah sedang jump
    this.jumpVelocity = 0; // Current jump velocity
    this.jumpStartY = 0; // Starting Y position for jump
    this.gravity = 2.0; // Gravity force - cukup kuat
    this.maxJumpHeight = 1.5; // Maksimal tinggi jump - 1.5 meter
    
    // Bind keyboard event untuk spacebar
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    
    console.log('Jump ability initialized - Press SPACE to jump');
  },

  onKeyDown: function (event) {
    // Spacebar key code adalah 32 atau ' ' atau 'Space'
    if (event.code === 'Space' || event.keyCode === 32 || event.key === ' ') {
      // Prevent default behavior (scroll page)
      event.preventDefault();
      this.jump();
    }
  },

  onKeyUp: function (event) {
    // Detect spacebar release
    if (event.code === 'Space' || event.keyCode === 32 || event.key === ' ') {
      event.preventDefault();
    }
  },

  jump: function () {
    const currentTime = Date.now();
    
    // Check cooldown untuk mencegah spam jump
    if (currentTime - this.lastJumpTime < this.data.jumpCooldown) {
      return;
    }
    
    // Hanya bisa jump jika player ada di tanah
    if (this.onGround) {
      // Apply jump dengan gravity simulation
      const currentPos = this.el.object3D.position;
      this.jumpStartY = currentPos.y;
      // Set jump velocity - cukup kuat untuk naik
      this.jumpVelocity = this.data.jumpVelocity * 2.0;
      this.isJumping = true;
      this.gravity = 2.0; // Gravity yang cukup kuat
      
      // Update status
      this.onGround = false;
      this.lastJumpTime = currentTime;
    }
  },

  tick: function (t, dt) {
    // JUMP PHYSICS - Simple & Working
    if (this.isJumping) {
      const currentY = this.el.object3D.position.y;
      const maxHeight = this.jumpStartY + this.maxJumpHeight;
      
      // GRAVITY: Reduce velocity by gravity each frame
      this.jumpVelocity -= this.gravity * dt * 0.01;
      
      // MOVEMENT: Move player based on velocity
      const verticalMovement = this.jumpVelocity * dt * 0.01;
      let newY = currentY + verticalMovement;
      
      // CAP MAX HEIGHT
      if (newY > maxHeight) {
        newY = maxHeight;
        this.jumpVelocity = 0;
      }
      
      // UPDATE POSITION
      this.el.object3D.position.y = newY;
      
      // CHECK GROUND COLLISION
      const raycaster = new THREE.Raycaster();
      raycaster.set(
        new THREE.Vector3(
          this.el.object3D.position.x,
          this.el.object3D.position.y,
          this.el.object3D.position.z
        ),
        new THREE.Vector3(0, -1, 0)
      );
      raycaster.far = 5;
      
      const groundEls = document.querySelectorAll('.environmentGround, .environmentDressing');
      let closestDistance = Infinity;
      let foundGround = false;
      let groundY = 0;
      
      // Find nearest ground
      groundEls.forEach((groundEl) => {
        if (groundEl.object3D) {
          const intersects = raycaster.intersectObject(groundEl.object3D, true);
          intersects.forEach(intersect => {
            if (intersect.distance < closestDistance) {
              closestDistance = intersect.distance;
              groundY = this.el.object3D.position.y - intersect.distance + this.data.groundDistance;
              foundGround = true;
            }
          });
        }
      });
      
      // LANDING: Only if falling (velocity <= 0) and close to ground
      if (foundGround && this.jumpVelocity <= 0 && closestDistance <= 1.2) {
        this.el.object3D.position.y = groundY;
        this.isJumping = false;
        this.jumpVelocity = 0;
        this.onGround = true;
        return;
      }
    } else {
      // Check if player is on ground when not jumping
      // DON'T auto-adjust position to prevent glitching when standing on 3D objects
      const el = this.el;
      const position = new THREE.Vector3(
        el.object3D.position.x,
        el.object3D.position.y,
        el.object3D.position.z
      );
      
      const raycaster = new THREE.Raycaster();
      const direction = new THREE.Vector3(0, -1, 0);
      raycaster.set(position, direction);
      raycaster.far = this.data.groundDistance * 3; // Check further
      
      const groundElements = document.querySelectorAll('.environmentGround, .environmentDressing');
      const intersections = [];
      
      groundElements.forEach((groundEl) => {
        if (groundEl.object3D) {
          const intersects = raycaster.intersectObject(groundEl.object3D, true);
          intersections.push(...intersects);
        }
      });
      
      intersections.sort((a, b) => a.distance - b.distance);
      
      // Update ground status only - DON'T auto-adjust position
      this.onGround = intersections.length > 0 && intersections[0].distance < this.data.groundDistance * 1.5;
      
      // Only adjust if player is falling through ground significantly (emergency only)
      if (!this.onGround && intersections.length > 0) {
        const distance = intersections[0].distance;
        const groundY = position.y - distance + this.data.groundDistance;
        const currentY = el.object3D.position.y;
        const diff = groundY - currentY;
        
        // Only snap to ground if player is way below ground (falling through)
        if (diff > 0.5) {
          el.object3D.position.y = groundY;
          this.onGround = true;
        }
      }
    }
  },

  remove: function () {
    // Cleanup event listeners saat component dihapus
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  },
});

// ===== CHECKPOINT SYSTEM =====
// Component untuk menyimpan dan merespawn player ke checkpoint
const CHECKPOINT_POSITION = { x: 0, y: 0, z: 0 }; // Default spawn position
let checkpointReady = false;
const LOBBY_SPAWN_POSITION = { x: 120, y: 0, z: 120 };
const LOBBY_ROTATION_Y = 180;
const GAME_SPAWN_POSITION = { x: 0, y: 0, z: 0 }; // Default spawn point di map asli
let lastKnownPosition = null;
let lastKnownRotation = null;

// Save checkpoint function
function saveCheckpoint(position) {
  CHECKPOINT_POSITION.x = position.x;
  CHECKPOINT_POSITION.y = position.y;
  CHECKPOINT_POSITION.z = position.z;
  checkpointReady = true;
  console.log('✅ Checkpoint saved at:', CHECKPOINT_POSITION);
}

// Respawn player to checkpoint
function respawnToCheckpoint() {
  const rig = document.getElementById('rig');
  if (rig && checkpointReady) {
    rig.setAttribute('position', 
      CHECKPOINT_POSITION.x + ' ' + 
      (CHECKPOINT_POSITION.y + 1.6) + ' ' + 
      CHECKPOINT_POSITION.z
    );
    console.log('📍 Respawned to checkpoint:', CHECKPOINT_POSITION);
  }
}

// Make functions globally available
window.saveCheckpoint = saveCheckpoint;
window.respawnToCheckpoint = respawnToCheckpoint;

// Hide/show game environment (rumah adat, koridor, dll)
function hideGameEnvironment() {
  const scene = document.getElementById('scene');
  if (!scene) return;
  
  // Hide semua entity dengan class environmentGround kecuali lobby
  const allEnv = scene.querySelectorAll('.environmentGround');
  allEnv.forEach((el) => {
    if (!el.classList.contains('lobby-area')) {
      el.setAttribute('visible', false);
    }
  });
  
  // Hide semua rumah adat, satpam, collectible items, dll
  const houses = scene.querySelectorAll('[id^="satpam-"], [collectible-item], .collidable');
  houses.forEach((el) => {
    if (!el.classList.contains('lobby-area') && !el.classList.contains('lobby-boundary')) {
      el.setAttribute('visible', false);
    }
  });
  
  // Show lobby boundary
  const boundaries = scene.querySelectorAll('.lobby-boundary');
  boundaries.forEach((el) => {
    el.setAttribute('visible', true);
  });
  
  console.log('[Lobby] Game environment hidden');
}

function showGameEnvironment() {
  const scene = document.getElementById('scene');
  if (!scene) return;
  
  // Show semua environment
  const allEnv = scene.querySelectorAll('.environmentGround');
  allEnv.forEach((el) => {
    el.setAttribute('visible', true);
  });
  
  // Show semua rumah adat, satpam, collectible items, dll
  const houses = scene.querySelectorAll('[id^="satpam-"], [collectible-item], .collidable');
  houses.forEach((el) => {
    if (!el.classList.contains('lobby-boundary')) {
      el.setAttribute('visible', true);
    }
  });
  
  // Hide lobby boundary
  const boundaries = scene.querySelectorAll('.lobby-boundary');
  boundaries.forEach((el) => {
    el.setAttribute('visible', false);
  });
  
  console.log('[Lobby] Game environment shown');
}

function enterLobbyArea() {
  const rig = document.getElementById('rig');
  if (!rig) return;

  // Simpan posisi saat ini jika belum ada
  if (!lastKnownPosition) {
    const currentPos = rig.getAttribute('position') || { x: 0, y: 0, z: 0 };
    const currentRot = rig.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
    lastKnownPosition = { ...currentPos };
    lastKnownRotation = { ...currentRot };
  }

  // Hide game environment
  hideGameEnvironment();

  // Teleport ke lobby
  rig.setAttribute(
    'position',
    `${LOBBY_SPAWN_POSITION.x} ${LOBBY_SPAWN_POSITION.y + 1.6} ${LOBBY_SPAWN_POSITION.z}`,
  );
  rig.setAttribute('rotation', `0 ${LOBBY_ROTATION_Y} 0`);
  
  console.log('[Lobby] Player entered lobby area');
}

function exitLobbyArea() {
  const rig = document.getElementById('rig');
  if (!rig) return;

  // Show game environment
  showGameEnvironment();

  // Teleport ke spawn point di map asli (default spawn)
  rig.setAttribute(
    'position',
    `${GAME_SPAWN_POSITION.x} ${GAME_SPAWN_POSITION.y + 1.6} ${GAME_SPAWN_POSITION.z}`,
  );
  rig.setAttribute('rotation', '0 0 0');
  
  // Reset saved position
  lastKnownPosition = null;
  lastKnownRotation = null;
  
  console.log('[Lobby] Player exited lobby, spawned to game map');
}

window.enterLobbyArea = enterLobbyArea;
window.exitLobbyArea = exitLobbyArea;
window.hideGameEnvironment = hideGameEnvironment;
window.showGameEnvironment = showGameEnvironment;
