/**
 * Main game class
 */

class Game {
    constructor() {
        // Game state
        this.state = {
            running: false,
            score: 0,
            timer: 60, // Game duration in seconds
            gameOver: false,
            playerDied: false
        };
        
        // Initialize game
        this.init();
        this.setupEventListeners();
    }
    
    init() {
        // Initialize Three.js
        this.initThree();
        
        // Initialize Cannon.js
        this.initCannon();
        
        // Create the player ball
        this.createPlayer();
        
        // Initialize level
        this.level = new Level(this);
        
        // Initialize controls
        this.controls = new GameControls(this);
        
        // Start animation loop
        this.animate();
    }
    
    initThree() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x88ccff);
        
        // Add fog for depth
        this.scene.fog = new THREE.Fog(0x88ccff, 0, 50);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        
        // Add lights
        this.addLights();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    addLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        this.directionalLight.position.set(10, 20, 10);
        this.directionalLight.castShadow = true;
        
        // Set shadow properties
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 50;
        this.directionalLight.shadow.camera.left = -20;
        this.directionalLight.shadow.camera.right = 20;
        this.directionalLight.shadow.camera.top = 20;
        this.directionalLight.shadow.camera.bottom = -20;
        
        this.scene.add(this.directionalLight);
        
        // Add point light that follows the ball for better visibility
        this.ballLight = new THREE.PointLight(0xffffff, 0.5, 10);
        this.scene.add(this.ballLight);
    }
    
    initCannon() {
        // Create physics world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // Earth gravity
        
        // Set up collision detection
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        
        // For checking ball contacts
        this.ballContactMaterial = new CANNON.ContactMaterial(
            new CANNON.Material('ball'),
            new CANNON.Material('ground'),
            {
                friction: 0.3,
                restitution: 0.5
            }
        );
        this.world.addContactMaterial(this.ballContactMaterial);
    }
    
    createPlayer() {
        // Ball parameters
        const radius = 0.5;
        
        // Three.js ball
        const ballGeometry = new THREE.SphereGeometry(radius, 32, 32);
        const ballMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00aaff,
            roughness: 0.2,
            metalness: 0.5
        });
        this.ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ballMesh.castShadow = true;
        this.ballMesh.receiveShadow = true;
        this.scene.add(this.ballMesh);
        
        // Cannon.js ball body
        const ballShape = new CANNON.Sphere(radius);
        this.ballBody = new CANNON.Body({ 
            mass: 1,
            shape: ballShape,
            material: new CANNON.Material('ball')
        });
        this.ballBody.linearDamping = 0.3; // Add damping to prevent infinite rolling
        this.ballBody.position.set(0, radius, 0);
        this.world.addBody(this.ballBody);
        
        // Add a contact event listener for collision sounds and death detection
        // Add a flag to enable collision detection only after a short delay
        this.collisionDetectionEnabled = false;
        
        // Enable collision detection after a short delay
        setTimeout(() => {
            this.collisionDetectionEnabled = true;
        }, 500); // 500ms delay
        
        this.ballBody.addEventListener('collide', (e) => {
            // Skip collision detection if not enabled yet
            if (!this.collisionDetectionEnabled) return;
            
            // Get the body that the ball collided with
            const collidedBody = e.body;
            
            // Check if it's a wall or obstacle (not the ground)
            if (collidedBody !== this.level.groundBody) {
                // Check if it's a non-collectible (walls or obstacles)
                const isCollectible = this.level.collectibles.some(c => c.body === collidedBody);
                
                if (!isCollectible) {
                    // Player hit a wall or obstacle
                    this.playerDie();
                }
            }
        });
    }
    
    playerDie() {
        if (this.state.playerDied || !this.state.running) return; // Prevent multiple deaths
        
        this.state.playerDied = true;
        
        // Visual effect for death - turn the ball red
        const originalColor = this.ballMesh.material.color.clone();
        this.ballMesh.material.color.set(0xff0000); // Red
        this.ballMesh.material.emissive.set(0xff0000); // Glowing red
        
        // Create a dramatic camera shake effect
        this.shakeDuration = 1.0; // seconds
        this.shakeIntensity = 1.0;
        this.originalCameraPos = this.camera.position.clone();
        
        // Apply impulse to the ball (bounce effect)
        const upVector = new CANNON.Vec3(0, 5, 0);
        this.ballBody.applyImpulse(upVector, this.ballBody.position);
        
        // Create a shockwave ripple on the ground
        this.createGroundRipple(this.ballMesh.position);
        
        // Explosion effect
        this.createExplosionEffect(this.ballMesh.position);
        
        // Wait a moment then end the game
        setTimeout(() => {
            // Reset ball color (in case we restart)
            this.ballMesh.material.color.copy(originalColor);
            this.ballMesh.material.emissive.set(0x000000);
            
            // End the game
            this.endGame("You crashed!");
        }, 1500); // Longer delay for better effect
    }
    
    createExplosionEffect(position) {
        // Create explosion particles
        const particleCount = 100; // More particles for better effect
        const particleGeometry = new THREE.SphereGeometry(0.08, 8, 8); // Larger particles
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff3300,
            emissive: 0xff0000,
            emissiveIntensity: 1.0
        });
        
        this.explosionParticles = [];
        
        // Add some light to enhance the explosion effect
        const explosionLight = new THREE.PointLight(0xff5500, 3, 10);
        explosionLight.position.copy(position);
        this.scene.add(explosionLight);
        this.explosionLight = explosionLight;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            // Random velocity - faster movement
            const speed = 5 + Math.random() * 10;
            const direction = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize();
            
            particle.velocity = direction.multiplyScalar(speed);
            
            // Random size
            const scale = 0.5 + Math.random() * 1.5;
            particle.scale.set(scale, scale, scale);
            
            // Random rotation and spin
            particle.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            
            particle.rotationSpeed = {
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2,
                z: (Math.random() - 0.5) * 2
            };
            
            // Add to scene and array
            this.scene.add(particle);
            this.explosionParticles.push(particle);
        }
        
        // Create a shockwave ring
        const ringGeometry = new THREE.RingGeometry(0.2, 0.4, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff8800, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0
        });
        
        this.explosionRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.explosionRing.position.copy(position);
        this.explosionRing.rotation.x = Math.PI / 2; // Flat ring
        this.explosionRing.scale.set(1, 1, 1);
        this.scene.add(this.explosionRing);
        
        // Sound effect for explosion (if you want to add it later)
        // this.playExplosionSound();
    }
    
    createGroundRipple(position) {
        // Create ripple effect on the ground
        const rippleCount = 3;
        this.ripples = [];
        
        for (let i = 0; i < rippleCount; i++) {
            const size = 0.5 + i * 1.0; // Increasing sizes
            const ringGeo = new THREE.RingGeometry(size, size + 0.2, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.7
            });
            
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(position.x, 0.01, position.z); // Just above ground
            ring.rotation.x = Math.PI / 2; // Flat on ground
            ring.scale.set(0.1, 0.1, 0.1); // Start small
            ring.expansionRate = 5.0 + i * 2; // Different expansion rates
            ring.delay = i * 0.2; // Staggered start
            ring.delayTimer = ring.delay;
            
            this.scene.add(ring);
            this.ripples.push(ring);
        }
    }
    
    updateRipples(deltaTime) {
        if (!this.ripples) return;
        
        let allDone = true;
        
        for (let i = 0; i < this.ripples.length; i++) {
            const ring = this.ripples[i];
            
            // Handle delay
            if (ring.delayTimer > 0) {
                ring.delayTimer -= deltaTime;
                allDone = false;
                continue;
            }
            
            // Expand the ring
            ring.scale.x += ring.expansionRate * deltaTime;
            ring.scale.y += ring.expansionRate * deltaTime;
            ring.scale.z += ring.expansionRate * deltaTime;
            
            // Fade out
            if (ring.material.opacity > 0) {
                ring.material.opacity -= 1.5 * deltaTime;
                allDone = false;
            }
            
            // Remove faded rings
            if (ring.material.opacity <= 0) {
                this.scene.remove(ring);
                this.ripples.splice(i, 1);
                i--;
            }
        }
        
        // Clean up when all rings are gone
        if (allDone && this.ripples.length === 0) {
            this.ripples = null;
        }
    }
    
    updateExplosion(deltaTime) {
        if (!this.explosionParticles) return;
        
        // Update particles
        for (let i = 0; i < this.explosionParticles.length; i++) {
            const particle = this.explosionParticles[i];
            
            // Update position based on velocity
            particle.position.x += particle.velocity.x * deltaTime;
            particle.position.y += particle.velocity.y * deltaTime;
            particle.position.z += particle.velocity.z * deltaTime;
            
            // Apply rotation based on rotation speed
            particle.rotation.x += particle.rotationSpeed.x * deltaTime;
            particle.rotation.y += particle.rotationSpeed.y * deltaTime;
            particle.rotation.z += particle.rotationSpeed.z * deltaTime;
            
            // Add gravity and drag
            particle.velocity.y -= 9.8 * deltaTime;
            particle.velocity.multiplyScalar(0.95); // Air resistance
            
            // Fade out particles
            if (particle.material.opacity > 0) {
                particle.material.opacity -= 1.0 * deltaTime;
            }
            
            // Remove tiny or faded particles
            if (particle.scale.x < 0.01 || particle.material.opacity <= 0) {
                this.scene.remove(particle);
                this.explosionParticles.splice(i, 1);
                i--;
            }
        }
        
        // Update explosion ring
        if (this.explosionRing) {
            // Expand the ring
            this.explosionRing.scale.x += 8 * deltaTime;
            this.explosionRing.scale.y += 8 * deltaTime;
            this.explosionRing.scale.z += 8 * deltaTime;
            
            // Fade out the ring
            if (this.explosionRing.material.opacity > 0) {
                this.explosionRing.material.opacity -= 2.0 * deltaTime;
            }
            
            // Remove the ring when it's faded out
            if (this.explosionRing.material.opacity <= 0) {
                this.scene.remove(this.explosionRing);
                this.explosionRing = null;
            }
        }
        
        // Update explosion light
        if (this.explosionLight) {
            // Reduce intensity over time
            this.explosionLight.intensity -= 5 * deltaTime;
            
            // Remove light when it's faded
            if (this.explosionLight.intensity <= 0) {
                this.scene.remove(this.explosionLight);
                this.explosionLight = null;
            }
        }
        
        // Clean up when all explosion elements are done
        if (this.explosionParticles.length === 0 && !this.explosionRing && !this.explosionLight) {
            this.explosionParticles = null;
        }
    }
    
    resetPlayer() {
        // Reset ball position - increase the Y value to ensure it starts above obstacles
        const ballRadius = 0.5; // Match the radius defined in createPlayer
        this.ballBody.position.set(0, ballRadius * 3, 0); // Position it higher off the ground
        this.ballBody.velocity.set(0, 0, 0);
        this.ballBody.angularVelocity.set(0, 0, 0);
        syncBodyToMesh(this.ballBody, this.ballMesh);
    }
    
    setupEventListeners() {
        // Start button
        document.getElementById('start-button').addEventListener('click', () => {
            this.startGame();
        });
        
        // Restart button
        document.getElementById('restart-button').addEventListener('click', () => {
            this.restartGame();
        });
    }
    
    startGame() {
        // Hide instructions and show game
        hideElement('instructions');
        
        // Reset game state
        this.state.running = true;
        this.state.score = 0;
        this.state.timer = 60;
        this.state.gameOver = false;
        this.state.playerDied = false;
        
        // Reset collision detection
        this.collisionDetectionEnabled = false;
        setTimeout(() => {
            this.collisionDetectionEnabled = true;
        }, 500); // 500ms delay before enabling collision detection
        
        // Reset player position
        this.resetPlayer();
        
        // Reset level
        this.level.reset();
        
        // Update UI
        updateScore(0);
        updateTimer(60);
    }
    
    restartGame() {
        // Hide game over screen
        hideElement('game-over');
        
        // Reset game
        this.startGame();
    }
    
    endGame(reason) {
        this.state.running = false;
        this.state.gameOver = true;
        
        // Show game over screen
        showElement('game-over');
        
        // Show reason for game over if provided
        if (reason) {
            document.getElementById('game-over-reason').textContent = reason;
        } else {
            // Default messages based on state
            if (this.state.playerDied) {
                document.getElementById('game-over-reason').textContent = "You crashed!";
            } else if (this.state.timer <= 0) {
                document.getElementById('game-over-reason').textContent = "Time's up!";
            } else if (this.level.getRemainingCollectibles() === 0) {
                document.getElementById('game-over-reason').textContent = "You win! All collectibles gathered!";
            } else {
                document.getElementById('game-over-reason').textContent = "Game Over!";
            }
        }
        
        document.getElementById('final-score').textContent = this.state.score;
    }
    
    updateGameState(deltaTime) {
        if (!this.state.running) return;
        
        // Update timer
        this.state.timer -= deltaTime;
        updateTimer(this.state.timer);
        
        // Check game over conditions
        if (this.state.timer <= 0) {
            this.endGame("Time's up!");
            return;
        }
        
        // Check if ball fell off the board
        if (this.ballBody.position.y < -5) {
            this.endGame("You fell off the board!");
            return;
        }
        
        // Check collectibles
        const points = this.level.checkCollectibleCollisions(
            this.ballMesh.position,
            this.ballMesh.geometry.parameters.radius
        );
        
        if (points > 0) {
            this.state.score += points;
            updateScore(this.state.score);
        }
        
        // Check if all collectibles are collected
        if (this.level.getRemainingCollectibles() === 0) {
            this.endGame("You win! All collectibles gathered!");
            return;
        }
        
        // Update visual effects
        this.updateExplosion(deltaTime);
        this.updateRipples(deltaTime);
        this.updateCameraShake(deltaTime);
    }
    
    updatePhysics(deltaTime) {
        if (!this.state.running) return;
        
        // Apply force to the ball based on controls
        const force = this.controls.getForce();
        if (this.controls.isActive()) {
            const forceMagnitude = 10;
            this.ballBody.applyForce(
                new CANNON.Vec3(force.x * forceMagnitude, 0, force.z * forceMagnitude),
                this.ballBody.position
            );
        }
        
        // Step the physics world
        this.world.step(deltaTime);
        
        // Update mesh positions from physics bodies
        syncBodyToMesh(this.ballBody, this.ballMesh);
        
        // Position the ball light to follow the ball
        this.ballLight.position.copy(this.ballMesh.position);
        this.ballLight.position.y += 1;
    }
    
    updateCamera() {
        // Get camera offsets from controls
        const cameraOffsets = this.controls.getCameraOffsets();
        
        // Base position calculation
        const baseDistance = 15;
        const baseHeight = 10;
        const distance = baseDistance + cameraOffsets.distance;
        
        // Calculate camera position based on ball position and angle offsets
        const ballPosition = this.ballMesh.position.clone();
        
        // Apply rotation based on theta (horizontal) and phi (vertical) angles
        const theta = cameraOffsets.theta;
        const phi = cameraOffsets.phi;
        
        // Calculate camera position using spherical coordinates
        const cameraPositionX = ballPosition.x + distance * Math.sin(theta) * Math.cos(phi);
        const cameraPositionY = ballPosition.y + baseHeight + distance * Math.sin(phi);
        const cameraPositionZ = ballPosition.z + distance * Math.cos(theta) * Math.cos(phi);
        
        // Create target position
        const cameraTargetPosition = new THREE.Vector3(
            cameraPositionX,
            cameraPositionY,
            cameraPositionZ
        );
        
        // Check if camera is being dragged
        if (this.controls.isCameraDragging()) {
            // If actively dragging, update immediately
            this.camera.position.copy(cameraTargetPosition);
        } else {
            // Otherwise, smooth transition
            this.camera.position.lerp(cameraTargetPosition, 0.05);
        }
        
        // Always look at the ball
        this.camera.lookAt(ballPosition);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Calculate delta time
        const time = performance.now() / 1000; // Convert to seconds
        if (!this.prevTime) this.prevTime = time;
        const deltaTime = Math.min(time - this.prevTime, 0.1); // Cap to 0.1 seconds
        this.prevTime = time;
        
        // Update game state
        this.updateGameState(deltaTime);
        
        // Update physics
        this.updatePhysics(deltaTime);
        
        // Update camera
        this.updateCamera();
        
        // Update level
        this.level.update();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    updateCameraShake(deltaTime) {
        if (this.shakeDuration > 0) {
            // Reduce shake duration
            this.shakeDuration -= deltaTime;
            
            // Apply shake
            const intensity = this.shakeIntensity * (this.shakeDuration > 0 ? this.shakeDuration : 0);
            const shakeX = (Math.random() - 0.5) * 2 * intensity;
            const shakeY = (Math.random() - 0.5) * 2 * intensity;
            const shakeZ = (Math.random() - 0.5) * 2 * intensity;
            
            if (this.originalCameraPos) {
                this.camera.position.set(
                    this.originalCameraPos.x + shakeX,
                    this.originalCameraPos.y + shakeY,
                    this.originalCameraPos.z + shakeZ
                );
            }
            
            // Reset camera when done
            if (this.shakeDuration <= 0) {
                this.shakeDuration = 0;
                if (this.originalCameraPos) {
                    this.camera.position.copy(this.originalCameraPos);
                    this.originalCameraPos = null;
                }
            }
        }
    }
}

// Create and initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
}); 