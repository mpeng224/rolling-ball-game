/**
 * Level generation and management
 */

class Level {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.world = game.world;
        this.objects = [];
        this.collectibles = [];
        this.obstacles = [];
        this.initialized = false;
    }
    
    init() {
        // Create the ground plane
        this.createGround();
        
        // Create walls/boundaries
        this.createWalls();
        
        // Add collectibles
        this.addCollectibles(15);
        
        // Add obstacles
        this.addObstacles(10);
        
        this.initialized = true;
    }
    
    createGround() {
        // Three.js ground
        const groundGeometry = new THREE.PlaneGeometry(30, 30);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x44aa88,
            roughness: 0.5,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        this.groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.receiveShadow = true;
        this.scene.add(this.groundMesh);
        
        // Add grid for visual reference
        const grid = new THREE.GridHelper(30, 30, 0x000000, 0x111111);
        this.scene.add(grid);
        
        // Cannon.js ground body
        const groundShape = new CANNON.Plane();
        this.groundBody = new CANNON.Body({ 
            mass: 0,
            shape: groundShape
        });
        this.groundBody.quaternion.setFromAxisAngle(
            new CANNON.Vec3(1, 0, 0),
            -Math.PI / 2
        );
        this.world.addBody(this.groundBody);
        
        this.objects.push({ mesh: this.groundMesh, body: this.groundBody });
    }
    
    createWalls() {
        const wallSize = 1;
        const wallHeight = 1;
        const boardSize = 15;
        
        // Create four walls
        const createWall = (posX, posZ, width, depth) => {
            // Three.js wall
            const wallGeometry = new THREE.BoxGeometry(width, wallHeight, depth);
            const wallMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xaa4444,
                roughness: 0.7,
                metalness: 0.1
            });
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            wallMesh.position.set(posX, wallHeight / 2, posZ);
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            this.scene.add(wallMesh);
            
            // Cannon.js wall body
            const wallShape = new CANNON.Box(new CANNON.Vec3(width / 2, wallHeight / 2, depth / 2));
            const wallBody = new CANNON.Body({ 
                mass: 0,
                shape: wallShape
            });
            wallBody.position.set(posX, wallHeight / 2, posZ);
            this.world.addBody(wallBody);
            
            this.objects.push({ mesh: wallMesh, body: wallBody });
        };
        
        // Create the four walls
        createWall(0, -boardSize, boardSize * 2, wallSize);  // North
        createWall(0, boardSize, boardSize * 2, wallSize);   // South
        createWall(-boardSize, 0, wallSize, boardSize * 2);  // West
        createWall(boardSize, 0, wallSize, boardSize * 2);   // East
    }
    
    addCollectibles(count) {
        const boardSize = 14;
        
        for (let i = 0; i < count; i++) {
            // Generate random position
            const posX = randomInRange(-boardSize, boardSize);
            const posZ = randomInRange(-boardSize, boardSize);
            
            // Create collectible
            const size = 0.5;
            
            // Three.js collectible
            const geometry = new THREE.SphereGeometry(size, 16, 16);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0xffaa00,
                roughness: 0.3,
                metalness: 0.8,
                emissive: 0x996600,
                emissiveIntensity: 0.3
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(posX, size, posZ);
            mesh.castShadow = true;
            this.scene.add(mesh);
            
            // Cannon.js collectible body
            const shape = new CANNON.Sphere(size);
            const body = new CANNON.Body({ 
                mass: 0,
                shape: shape,
                isTrigger: true // Make it a trigger for collision detection without physics
            });
            body.position.set(posX, size, posZ);
            body.collisionResponse = false; // Don't physically respond to collisions
            this.world.addBody(body);
            
            // Add to collectibles array
            this.collectibles.push({ 
                mesh: mesh, 
                body: body,
                collected: false,
                value: 10
            });
        }
    }
    
    addObstacles(count) {
        const boardSize = 14;
        
        for (let i = 0; i < count; i++) {
            // Generate random position
            const posX = randomInRange(-boardSize, boardSize);
            const posZ = randomInRange(-boardSize, boardSize);
            
            // Create obstacle
            const width = randomInRange(1, 3);
            const height = randomInRange(1, 3);
            const depth = randomInRange(1, 3);
            
            // Three.js obstacle
            const geometry = new THREE.BoxGeometry(width, height, depth);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x8844aa,
                roughness: 0.5,
                metalness: 0.2
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(posX, height / 2, posZ);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            
            // Cannon.js obstacle body
            const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
            const body = new CANNON.Body({ 
                mass: 0,
                shape: shape
            });
            body.position.set(posX, height / 2, posZ);
            this.world.addBody(body);
            
            // Add to obstacles array
            this.obstacles.push({ 
                mesh: mesh, 
                body: body
            });
        }
    }
    
    reset() {
        // Clear scene and physics world of existing objects
        if (this.initialized) {
            // Remove collectibles
            this.collectibles.forEach(collectible => {
                this.scene.remove(collectible.mesh);
                this.world.removeBody(collectible.body);
            });
            
            // Remove obstacles
            this.obstacles.forEach(obstacle => {
                this.scene.remove(obstacle.mesh);
                this.world.removeBody(obstacle.body);
            });
            
            this.collectibles = [];
            this.obstacles = [];
        }
        
        // Reinitialize level
        this.init();
    }
    
    update() {
        // Animate collectibles (simple rotation and hover)
        this.collectibles.forEach(collectible => {
            if (!collectible.collected) {
                collectible.mesh.rotation.y += 0.01;
                
                // Simple hover animation
                const time = Date.now() * 0.001;
                const hoverHeight = 0.5 + Math.sin(time * 2) * 0.1;
                collectible.mesh.position.y = hoverHeight;
                collectible.body.position.y = hoverHeight;
            }
        });
    }
    
    checkCollectibleCollisions(ballPosition, radius) {
        let collectedPoints = 0;
        
        this.collectibles.forEach(collectible => {
            if (!collectible.collected) {
                const distance = new THREE.Vector3(
                    collectible.mesh.position.x,
                    collectible.mesh.position.y,
                    collectible.mesh.position.z
                ).distanceTo(ballPosition);
                
                if (distance < radius + 0.5) {
                    // Collect!
                    collectible.collected = true;
                    collectible.mesh.visible = false;
                    collectedPoints += collectible.value;
                }
            }
        });
        
        return collectedPoints;
    }
    
    getRemainingCollectibles() {
        return this.collectibles.filter(c => !c.collected).length;
    }
} 