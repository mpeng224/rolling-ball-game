/**
 * Game controls for both desktop and mobile
 */

class GameControls {
    constructor(game) {
        this.game = game;
        this.keys = {};
        this.tiltControls = { x: 0, y: 0 };
        this.controlActive = false;
        
        // Camera control properties
        this.cameraDrag = {
            active: false,
            startX: 0,
            startY: 0,
            moveX: 0,
            moveY: 0
        };
        this.cameraOffset = {
            theta: 0,      // Horizontal angle offset (in radians)
            phi: 0,        // Vertical angle offset (in radians)
            distance: 0    // Distance offset
        };
        this.isDraggingCamera = false;
        
        // Initialize controls based on device
        this.init();
    }
    
    init() {
        // Keyboard controls for desktop
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Device orientation controls for mobile
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => this.handleOrientation(e));
        }
        
        // Touch controls as fallback for mobile
        this.touchControls = { active: false, startX: 0, startY: 0, moveX: 0, moveY: 0 };
        window.addEventListener('touchstart', (e) => this.onTouchStart(e));
        window.addEventListener('touchmove', (e) => this.onTouchMove(e));
        window.addEventListener('touchend', () => this.onTouchEnd());
        
        // Add mouse drag controls for camera
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());
        
        // Add mouse wheel control for camera zoom
        window.addEventListener('wheel', (e) => this.onMouseWheel(e));
    }
    
    onKeyDown(event) {
        this.keys[event.key.toLowerCase()] = true;
        this.controlActive = true;
    }
    
    onKeyUp(event) {
        this.keys[event.key.toLowerCase()] = false;
        
        // Check if any movement keys are still pressed
        if (!this.keys['w'] && !this.keys['a'] && !this.keys['s'] && !this.keys['d'] && 
            !this.keys['arrowup'] && !this.keys['arrowleft'] && !this.keys['arrowdown'] && !this.keys['arrowright']) {
            this.controlActive = false;
        }
    }
    
    handleOrientation(event) {
        if (!event.gamma || !event.beta) return;
        
        // Adjust controls based on screen orientation
        if (window.innerHeight > window.innerWidth) {
            // Portrait
            this.tiltControls.x = event.gamma / 15; // Left/Right tilt
            this.tiltControls.y = event.beta / 15;  // Front/Back tilt
        } else {
            // Landscape
            this.tiltControls.x = event.beta / 15;  // Left/Right becomes Front/Back
            this.tiltControls.y = -event.gamma / 15; // Front/Back becomes Right/Left (inverted)
        }
        
        // Clamp values
        this.tiltControls.x = clamp(this.tiltControls.x, -1, 1);
        this.tiltControls.y = clamp(this.tiltControls.y, -1, 1);
        
        this.controlActive = true;
    }
    
    onTouchStart(event) {
        // Check if this is a multi-touch event (two or more fingers)
        if (event.touches.length >= 2) {
            // Camera control with two fingers
            event.preventDefault();
            const touch = event.touches[0];
            this.cameraDrag.active = true;
            this.cameraDrag.startX = touch.clientX;
            this.cameraDrag.startY = touch.clientY;
            this.isDraggingCamera = true;
            return;
        }
        
        // Single touch for ball control
        event.preventDefault();
        const touch = event.touches[0];
        this.touchControls.active = true;
        this.touchControls.startX = touch.clientX;
        this.touchControls.startY = touch.clientY;
    }
    
    onTouchMove(event) {
        if (this.cameraDrag.active && event.touches.length >= 2) {
            // Camera dragging with two fingers
            event.preventDefault();
            const touch = event.touches[0];
            
            // Calculate movement
            const deltaX = touch.clientX - this.cameraDrag.startX;
            const deltaY = touch.clientY - this.cameraDrag.startY;
            
            // Update camera angles
            this.cameraOffset.theta -= deltaX * 0.01;
            this.cameraOffset.phi -= deltaY * 0.01;
            
            // Clamp phi to avoid flipping
            this.cameraOffset.phi = clamp(this.cameraOffset.phi, -Math.PI / 3, Math.PI / 3);
            
            // Update start position for next move
            this.cameraDrag.startX = touch.clientX;
            this.cameraDrag.startY = touch.clientY;
            return;
        }
        
        if (!this.touchControls.active) return;
        event.preventDefault();
        
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.touchControls.startX;
        const deltaY = touch.clientY - this.touchControls.startY;
        
        this.touchControls.moveX = deltaX / 50;
        this.touchControls.moveY = deltaY / 50;
        
        // Clamp values
        this.touchControls.moveX = clamp(this.touchControls.moveX, -1, 1);
        this.touchControls.moveY = clamp(this.touchControls.moveY, -1, 1);
        
        this.controlActive = true;
    }
    
    onTouchEnd() {
        if (this.cameraDrag.active) {
            this.cameraDrag.active = false;
            this.isDraggingCamera = false;
            return;
        }
        
        this.touchControls.active = false;
        this.touchControls.moveX = 0;
        this.touchControls.moveY = 0;
        this.controlActive = false;
    }
    
    onMouseDown(event) {
        // Right mouse button or ctrl+left button for camera control
        if (event.button === 2 || (event.button === 0 && event.ctrlKey)) {
            event.preventDefault();
            this.cameraDrag.active = true;
            this.cameraDrag.startX = event.clientX;
            this.cameraDrag.startY = event.clientY;
            this.isDraggingCamera = true;
        }
    }
    
    onMouseMove(event) {
        if (!this.cameraDrag.active) return;
        
        // Calculate movement
        const deltaX = event.clientX - this.cameraDrag.startX;
        const deltaY = event.clientY - this.cameraDrag.startY;
        
        // Update camera angles
        this.cameraOffset.theta -= deltaX * 0.01;
        this.cameraOffset.phi -= deltaY * 0.01;
        
        // Clamp phi to avoid flipping
        this.cameraOffset.phi = clamp(this.cameraOffset.phi, -Math.PI / 3, Math.PI / 3);
        
        // Update start position for next move
        this.cameraDrag.startX = event.clientX;
        this.cameraDrag.startY = event.clientY;
    }
    
    onMouseUp() {
        this.cameraDrag.active = false;
        this.isDraggingCamera = false;
    }
    
    onMouseWheel(event) {
        // Zoom in/out with mouse wheel
        event.preventDefault();
        const zoomSpeed = 0.5;
        this.cameraOffset.distance += event.deltaY * 0.01 * zoomSpeed;
        
        // Clamp distance
        this.cameraOffset.distance = clamp(this.cameraOffset.distance, -10, 15);
    }
    
    getForce() {
        let forceX = 0;
        let forceZ = 0;
        
        // Get raw input values
        let rawForward = 0;
        let rawRight = 0;
        
        // Desktop controls (keyboard)
        if (this.keys['arrowup'] || this.keys['w']) rawForward = -1;
        if (this.keys['arrowdown'] || this.keys['s']) rawForward = 1;
        if (this.keys['arrowleft'] || this.keys['a']) rawRight = -1;
        if (this.keys['arrowright'] || this.keys['d']) rawRight = 1;
        
        // Mobile controls (device orientation or touch)
        if (isMobile()) {
            if (window.DeviceOrientationEvent && this.tiltControls.x !== 0 && this.tiltControls.y !== 0) {
                rawRight = this.tiltControls.x;
                rawForward = this.tiltControls.y;
            } else if (this.touchControls.active) {
                rawRight = this.touchControls.moveX;
                rawForward = this.touchControls.moveY;
            }
        }
        
        // If we have input, adjust for camera angle
        if (rawForward !== 0 || rawRight !== 0) {
            // Get camera angle (theta from cameraOffset)
            const theta = this.cameraOffset.theta;
            
            // Rotate the input based on camera angle
            forceX = Math.sin(theta) * rawForward + Math.cos(theta) * rawRight;
            forceZ = Math.cos(theta) * rawForward - Math.sin(theta) * rawRight;
        }
        
        return { x: forceX, z: forceZ };
    }
    
    getCameraOffsets() {
        return this.cameraOffset;
    }
    
    isCameraDragging() {
        return this.isDraggingCamera;
    }
    
    isActive() {
        return this.controlActive;
    }
    
    reset() {
        this.keys = {};
        this.tiltControls = { x: 0, y: 0 };
        this.touchControls = { active: false, startX: 0, startY: 0, moveX: 0, moveY: 0 };
        this.cameraDrag = { active: false, startX: 0, startY: 0, moveX: 0, moveY: 0 };
        this.cameraOffset = { theta: 0, phi: 0, distance: 0 };
        this.controlActive = false;
        this.isDraggingCamera = false;
    }
} 