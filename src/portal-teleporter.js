/* global AFRAME, THREE */

/**
 * A component to teleport the player to a different scene when they collide with the portal.
 */
AFRAME.registerComponent('portal-teleporter', {
  schema: {
    url: {type: 'string'},
    debug: {type: 'boolean', default: false}
  },

  init: function () {
    this.teleport = this.teleport.bind(this);
    this.el.addEventListener('obbcollisionstarted', this.teleport);

    if (this.data.debug) {
      console.log('Portal Teleporter initialized for URL:', this.data.url);
    }
  },

  teleport: function (evt) {
    const collidingEntity = evt.detail.withEl;
    if (this.data.debug) {
      console.log('Collision detected with:', collidingEntity.id);
      console.log('Colliding entity has player-collider:', collidingEntity.hasAttribute('player-collider'));
    }

    // Check if the colliding entity has the player-collider attribute
    if (collidingEntity.hasAttribute('player-collider')) {
      if (this.data.debug) {
        console.log('Teleporting to:', this.data.url);
      }
      window.location.href = this.data.url;
    } else if (this.data.debug) {
      console.log('Colliding entity is not the player.');
    }
  },

  remove: function () {
    this.el.removeEventListener('obbcollisionstarted', this.teleport);
  }
});
