# Rolling Ball Game

A simple 3D web game where you control a rolling ball to collect items while avoiding obstacles. Built with Three.js for rendering and Cannon.js for physics.

## Features

- 3D physics-based ball movement
- Responsive design that works on both desktop and mobile
- Multiple control methods:
  - Desktop: Arrow keys or WASD
  - Mobile: Device tilt or touch controls
- Perspective-based controls that adjust to camera angle
- Interactive camera controls:
  - Desktop: Right-click and drag to adjust view, mouse wheel to zoom
  - Mobile: Two-finger drag to adjust view
- Collectible items
- Obstacles to avoid
- Time-based gameplay
- Score tracking

## How to Play

1. **Setup**:
   - Clone or download this repository
   - Open the `index.html` file in a modern web browser
   - For best experience on mobile, host the game on a web server that supports HTTPS (required for device orientation controls)

2. **Ball Controls**:
   - **Desktop**: Use Arrow keys or WASD to control the ball
   - **Mobile**: Tilt your device to control the ball, or use touch swipe as fallback
   - Controls automatically adjust to match your camera perspective (pressing "forward" moves the ball in the direction the camera is facing)

3. **Camera Controls**:
   - **Desktop**: Right-click and drag to rotate the camera view, scroll wheel to zoom in/out
   - **Mobile**: Use two-finger drag to rotate the camera view

4. **Objective**:
   - Collect all golden spheres to gain points
   - Avoid falling off the platform
   - Complete the level before the timer runs out

## Browser Compatibility

The game works best on modern browsers:
- Chrome (desktop and mobile)
- Firefox (desktop and mobile)
- Safari (desktop and mobile)
- Edge (desktop)

For device orientation controls on iOS, the user needs to grant permission for motion sensors.

## Dependencies

- [Three.js](https://threejs.org/) - 3D graphics library
- [Cannon.js](https://schteppe.github.io/cannon.js/) - Physics engine

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

Created as a demonstration of a simple web 3D game using Three.js and Cannon.js. 