/**
 * JoyStick
 * A simple JoyStick for web application, use HTML5, Canvas and JavaScript
 * @autor Roberto D'Autilia
 * @version 2.0.0
 * @license MIT
 * @example
 *  // Create JoyStick object into the DIV 'joyDiv'
 *  var joy = new JoyStick('joyDiv');
 *  // or
 *  var joy = new JoyStick('joyDiv', {}, function(stickData) {
 *    // stickData contains all the JoyStick properties
 *    // stickData.x, stickData.y, stickData.xPosition, stickData.yPosition, stickData.cardinalDirection
 *  });
 */

function JoyStick(container, parameters, callback) {
    // Merge parameters with defaults
    this.parameters = parameters || {};
    this.title = this.parameters.title || "joystick";
    this.width = this.parameters.width || 0;
    this.height = this.parameters.height || 0;
    this.internalFillColor = this.parameters.internalFillColor || "#00AA00";
    this.internalLineWidth = this.parameters.internalLineWidth || 2;
    this.internalStrokeColor = this.parameters.internalStrokeColor || "#003300";
    this.externalLineWidth = this.parameters.externalLineWidth || 2;
    this.externalStrokeColor = this.parameters.externalStrokeColor || "#008000";
    this.autoReturnToCenter = (this.parameters.autoReturnToCenter !== undefined) ? this.parameters.autoReturnToCenter : true;
    this.context = null;
    this.circle = {x: 0, y: 0};
    this.joy = {x: 0, y: 0};
    this.dragging = false;
    this.touchId = null;
    this.callback = callback || function() {};
    
    // Canvas and container
    this.container = document.getElementById(container);
    if (!this.container) {
        throw new Error("Container element not found");
    }
    
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = this.title;
    this.container.appendChild(this.canvas);
    
    // Set canvas size
    this.canvas.width = this.width || this.container.offsetWidth;
    this.canvas.height = this.height || this.container.offsetHeight;
    
    // Set canvas style
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    
    // Get context
    this.context = this.canvas.getContext('2d');
    
    // Calculate center
    this.circle.x = this.canvas.width / 2;
    this.circle.y = this.canvas.height / 2;
    this.joy.x = this.circle.x;
    this.joy.y = this.circle.y;
    
    // Draw the joystick
    this.draw();
    
    // Event listeners
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Touch events
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), false);
    document.addEventListener('touchmove', this.onTouchMove.bind(this), false);
    document.addEventListener('touchend', this.onTouchEnd.bind(this), false);
}

JoyStick.prototype.draw = function() {
    // Clear canvas
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw external circle
    this.context.beginPath();
    this.context.strokeStyle = this.externalStrokeColor;
    this.context.lineWidth = this.externalLineWidth;
    this.context.arc(this.circle.x, this.circle.y, this.canvas.width / 3, 0, Math.PI * 2, true);
    this.context.stroke();
    
    // Draw internal circle
    this.context.beginPath();
    this.context.strokeStyle = this.internalStrokeColor;
    this.context.fillStyle = this.internalFillColor;
    this.context.lineWidth = this.internalLineWidth;
    this.context.arc(this.joy.x, this.joy.y, this.canvas.width / 6, 0, Math.PI * 2, true);
    this.context.fill();
    this.context.stroke();
};

JoyStick.prototype.onMouseDown = function(event) {
    this.dragging = true;
    this.move(event.clientX, event.clientY);
};

JoyStick.prototype.onMouseMove = function(event) {
    if (this.dragging) {
        this.move(event.clientX, event.clientY);
    }
};

JoyStick.prototype.onMouseUp = function() {
    if (this.dragging) {
        this.dragging = false;
        if (this.autoReturnToCenter) {
            this.returnToCenter();
        }
    }
};

JoyStick.prototype.onTouchStart = function(event) {
    event.preventDefault();
    const touch = event.touches[0];
    this.touchId = touch.identifier;
    this.dragging = true;
    this.move(touch.clientX, touch.clientY);
};

JoyStick.prototype.onTouchMove = function(event) {
    if (this.dragging) {
        for (let i = 0; i < event.changedTouches.length; i++) {
            if (event.changedTouches[i].identifier === this.touchId) {
                this.move(event.changedTouches[i].clientX, event.changedTouches[i].clientY);
                break;
            }
        }
    }
};

JoyStick.prototype.onTouchEnd = function(event) {
    if (this.dragging) {
        for (let i = 0; i < event.changedTouches.length; i++) {
            if (event.changedTouches[i].identifier === this.touchId) {
                this.dragging = false;
                if (this.autoReturnToCenter) {
                    this.returnToCenter();
                }
                break;
            }
        }
    }
};

JoyStick.prototype.move = function(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    const touchX = x - rect.left;
    const touchY = y - rect.top;
    
    // Calculate distance from center
    const dx = touchX - this.circle.x;
    const dy = touchY - this.circle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Limit to circle radius
    const radius = this.canvas.width / 3;
    if (distance < radius) {
        this.joy.x = touchX;
        this.joy.y = touchY;
    } else {
        // Point is outside the circle, find intersection with circle
        const angle = Math.atan2(dy, dx);
        this.joy.x = this.circle.x + Math.cos(angle) * radius;
        this.joy.y = this.circle.y + Math.sin(angle) * radius;
    }
    
    // Redraw
    this.draw();
    
    // Callback with joystick data
    this.triggerCallback();
};

JoyStick.prototype.returnToCenter = function() {
    this.joy.x = this.circle.x;
    this.joy.y = this.circle.y;
    this.draw();
    this.triggerCallback();
};

JoyStick.prototype.triggerCallback = function() {
    // Calculate position relative to center (-1 to 1)
    const x = (this.joy.x - this.circle.x) / (this.canvas.width / 3);
    const y = (this.joy.y - this.circle.y) / (this.canvas.height / 3);
    
    // Calculate cardinal direction
    let direction = "C";
    const angle = Math.atan2(y, x) * 180 / Math.PI;
    
    if (angle >= -22.5 && angle < 22.5) direction = "E";
    else if (angle >= 22.5 && angle < 67.5) direction = "SE";
    else if (angle >= 67.5 && angle < 112.5) direction = "S";
    else if (angle >= 112.5 && angle < 157.5) direction = "SW";
    else if (angle >= 157.5 || angle < -157.5) direction = "W";
    else if (angle >= -157.5 && angle < -112.5) direction = "NW";
    else if (angle >= -112.5 && angle < -67.5) direction = "N";
    else if (angle >= -67.5 && angle < -22.5) direction = "NE";
    
    // Call callback with joystick data
    this.callback({
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        xPosition: this.joy.x,
        yPosition: this.joy.y,
        cardinalDirection: direction
    });
};

// Helper methods for backward compatibility
JoyStick.prototype.GetX = function() {
    return Math.round(((this.joy.x - this.circle.x) / (this.canvas.width / 3)) * 100);
};

JoyStick.prototype.GetY = function() {
    return Math.round(((this.joy.y - this.circle.y) / (this.canvas.height / 3)) * 100);
};

JoyStick.prototype.GetPosX = function() {
    return this.joy.x;
};

JoyStick.prototype.GetPosY = function() {
    return this.joy.y;
};

JoyStick.prototype.GetDir = function() {
    const x = this.GetX() / 100;
    const y = this.GetY() / 100;
    let direction = "C";
    const angle = Math.atan2(y, x) * 180 / Math.PI;
    
    if (angle >= -22.5 && angle < 22.5) direction = "E";
    else if (angle >= 22.5 && angle < 67.5) direction = "SE";
    else if (angle >= 67.5 && angle < 112.5) direction = "S";
    else if (angle >= 112.5 && angle < 157.5) direction = "SW";
    else if (angle >= 157.5 || angle < -157.5) direction = "W";
    else if (angle >= -157.5 && angle < -112.5) direction = "NW";
    else if (angle >= -112.5 && angle < -67.5) direction = "N";
    else if (angle >= -67.5 && angle < -22.5) direction = "NE";
    
    return direction;
};
