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
        this.ballBody.addEventListener('collide', (e) => {
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
        
        // Explosion effect
        this.createExplosionEffect(this.ballMesh.position);
        
        // Wait a moment then end the game
        setTimeout(() => {
            // Reset ball color (in case we restart)
            this.ballMesh.material.color.copy(originalColor);
            this.ballMesh.material.emissive.set(0x000000);
            
            // End the game
            this.endGame("You crashed!");
        }, 1000);
    }
    
    createExplosionEffect(position) {
        // Create explosion particles
        const particleCount = 50;
        const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xff5500 });
        
        this.explosionParticles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            // Random velocity
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
            
            this.scene.add(particle);
            this.explosionParticles.push(particle);
        }
    }
    
    updateExplosion(deltaTime) {
        if (!this.explosionParticles) return;
        
        for (let i = 0; i < this.explosionParticles.length; i++) {
            const particle = this.explosionParticles[i];
            
            // Update position based on velocity
            particle.position.x += particle.velocity.x * deltaTime;
            particle.position.y += particle.velocity.y * deltaTime;
            particle.position.z += particle.velocity.z * deltaTime;
            
            // Add gravity
            particle.velocity.y -= 9.8 * deltaTime;
            
            // Fade out particles
            particle.scale.multiplyScalar(0.95);
            
            // Remove tiny particles
            if (particle.scale.x < 0.01) {
                this.scene.remove(particle);
                this.explosionParticles.splice(i, 1);
                i--;
            }
        }
    }
    
    resetPlayer() {
        // Reset ball position
        this.ballBody.position.set(0, 0.5, 0);
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
        
        // Update explosion effect if active
        this.updateExplosion(deltaTime);
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
}

// Create and initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
}); 