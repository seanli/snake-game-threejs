// Game constants
const GRID_SIZE = 20;
const CELL_SIZE = 1;
const MOVE_INTERVAL = 120; // milliseconds - decreased for faster movement
const BULLET_SPEED = 0.15;
const BULLET_LIFETIME = 3000; // milliseconds
const BULLET_CHANCE = 0.1; // 10% chance for a body segment to shoot a bullet
const INPUT_BUFFER_TIME = 50; // milliseconds to buffer input before next movement

// Game variables
let scene, camera, renderer;
let snake = [];
let food;
let direction = { x: 1, y: 0, z: 0 };
let nextDirection = { x: 1, y: 0, z: 0 };
let lastMoveTime = 0;
let lastInputTime = 0;
let inputBuffer = null;
let score = 0;
let gameRunning = true;
let bullets = [];
let waveTime = 0; // Time counter for the wave animation
let explosions = [];

// Clean up the scene and remove all objects
function cleanupScene() {
    // Remove all objects from the scene
    if (scene) {
        while(scene.children.length > 0) { 
            scene.remove(scene.children[0]); 
        }
    }
    
    // Remove the renderer's DOM element if it exists
    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    
    // Clear arrays
    snake = [];
    bullets = [];
}

// Initialize the game
function init() {
    // Clean up previous game if it exists
    cleanupScene();
    
    // Reset game state
    direction = { x: 1, y: 0, z: 0 };
    nextDirection = { x: 1, y: 0, z: 0 };
    score = 0;
    gameRunning = true;
    document.getElementById('score').textContent = 'Score: 0';
    document.getElementById('gameOver').style.display = 'none';

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    // Create camera with maximized view
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Calculate optimal camera position based on viewport size
    updateCameraForViewport();
    // Note: lookAt is now handled in updateCameraForViewport

    // Create renderer with enhanced quality
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: 'high-performance',
        precision: 'highp'
    });
    // Get the game container element
    const gameContainer = document.getElementById('game-container');
    
    // Set renderer size to fit the container
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Use device pixel ratio for sharper rendering
    
    // Clear any existing canvas before adding a new one
    while (gameContainer.querySelector('canvas')) {
        gameContainer.removeChild(gameContainer.querySelector('canvas'));
    }
    
    // Add the renderer to the game container
    gameContainer.appendChild(renderer.domElement);

    // Create grid for reference
    createGrid();

    // Create initial snake
    createSnake();

    // Create food
    createFood();

    // Add enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);
    
    // Add a secondary fill light from the opposite direction
    const fillLight = new THREE.DirectionalLight(0xffffcc, 0.4);
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    document.getElementById('restartButton').addEventListener('click', restartGame);

    // Start game loop
    lastMoveTime = 0;
    animate(0);
}

// Restart the game
function restartGame() {
    init();
}

// Create a reference grid
function createGrid() {
    const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Create walls
    const wallMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x888888,
    specular: 0xaaaaaa,
    shininess: 50,
    flatShading: false
});
    
    // Horizontal walls (top and bottom)
    const horizontalWallGeometry = new THREE.BoxGeometry(GRID_SIZE + 2, 1, 1);
    
    // Bottom wall
    const bottomWall = new THREE.Mesh(horizontalWallGeometry, wallMaterial);
    bottomWall.position.set(0, -0.5, GRID_SIZE / 2 + 0.5);
    scene.add(bottomWall);

    // Top wall
    const topWall = new THREE.Mesh(horizontalWallGeometry, wallMaterial);
    topWall.position.set(0, -0.5, -GRID_SIZE / 2 - 0.5);
    scene.add(topWall);

    // Vertical walls (left and right)
    const verticalWallGeometry = new THREE.BoxGeometry(GRID_SIZE + 2, 1, 1);
    
    // Left wall
    const leftWall = new THREE.Mesh(verticalWallGeometry, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-GRID_SIZE / 2 - 0.5, -0.5, 0);
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(verticalWallGeometry, wallMaterial);
    rightWall.rotation.y = Math.PI / 2;
    rightWall.position.set(GRID_SIZE / 2 + 0.5, -0.5, 0);
    scene.add(rightWall);
    
    // Add corner blocks
    const cornerGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Top-left corner
    const topLeftCorner = new THREE.Mesh(cornerGeometry, wallMaterial);
    topLeftCorner.position.set(-GRID_SIZE / 2 - 0.5, -0.5, -GRID_SIZE / 2 - 0.5);
    scene.add(topLeftCorner);
    
    // Top-right corner
    const topRightCorner = new THREE.Mesh(cornerGeometry, wallMaterial);
    topRightCorner.position.set(GRID_SIZE / 2 + 0.5, -0.5, -GRID_SIZE / 2 - 0.5);
    scene.add(topRightCorner);
    
    // Bottom-left corner
    const bottomLeftCorner = new THREE.Mesh(cornerGeometry, wallMaterial);
    bottomLeftCorner.position.set(-GRID_SIZE / 2 - 0.5, -0.5, GRID_SIZE / 2 + 0.5);
    scene.add(bottomLeftCorner);
    
    // Bottom-right corner
    const bottomRightCorner = new THREE.Mesh(cornerGeometry, wallMaterial);
    bottomRightCorner.position.set(GRID_SIZE / 2 + 0.5, -0.5, GRID_SIZE / 2 + 0.5);
    scene.add(bottomRightCorner);
}

// Create the initial snake
function createSnake() {
    const headGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE, 2, 2, 2);
    const headMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00ff00,
        specular: 0x99ff99,
        shininess: 30
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    
    // Position the head at a grid cell center (0.5, 0, 0.5) instead of at the origin
    head.position.set(0.5, 0, 0.5);
    scene.add(head);
    snake.push(head);

    // Add initial tail segments
    for (let i = 1; i < 3; i++) {
        addSnakeSegment(0.5 - i, 0, 0.5);
    }
}

// Add a new segment to the snake
function addSnakeSegment(x, y, z) {
    const segmentGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE, 2, 2, 2);
    const segmentMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00cc00,
        specular: 0x99ff99,
        shininess: 30
    });
    const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
    segment.position.set(x, y, z);
    scene.add(segment);
    snake.push(segment);
}

// Create food at a random position
function createFood() {
    if (food) {
        scene.remove(food);
    }

    const foodGeometry = new THREE.SphereGeometry(CELL_SIZE / 2, 32, 32);
    const foodMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff0000,
        specular: 0xff9999,
        shininess: 100
    });
    food = new THREE.Mesh(foodGeometry, foodMaterial);
    
    // Generate random position
    let foodPosition;
    do {
        // Generate a random integer position within the grid
        const gridX = Math.floor(Math.random() * GRID_SIZE);
        const gridZ = Math.floor(Math.random() * GRID_SIZE);
        
        // Convert to world coordinates (centered on grid cells)
        foodPosition = {
            x: gridX - Math.floor(GRID_SIZE / 2) + 0.5,
            y: 0,
            z: gridZ - Math.floor(GRID_SIZE / 2) + 0.5
        };
    } while (isPositionOccupied(foodPosition));
    
    food.position.set(foodPosition.x, foodPosition.y, foodPosition.z);
    scene.add(food);
}

// Check if a position is occupied by the snake
function isPositionOccupied(position) {
    return snake.some(segment => 
        segment.position.x === position.x && 
        segment.position.z === position.z
    );
}

// Create a bullet
function createBullet(position, direction) {
    const bulletGeometry = new THREE.SphereGeometry(CELL_SIZE / 4, 16, 16);
    const bulletMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffff00,
        specular: 0xffffaa,
        shininess: 80,
        emissive: 0xaaaa00,
        emissiveIntensity: 0.5
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Set bullet position slightly offset from the snake segment
    bullet.position.copy(position);
    bullet.userData = {
        direction: { ...direction },
        createdAt: Date.now()
    };
    
    scene.add(bullet);
    bullets.push(bullet);
}

// Handle keyboard input
function handleKeyDown(event) {
    const currentTime = Date.now();
    let newDirection;
    
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
            if (direction.z !== 1) { // Not moving down
                newDirection = { x: 0, y: 0, z: -1 };
            }
            break;
        case 'ArrowDown':
        case 's':
            if (direction.z !== -1) { // Not moving up
                newDirection = { x: 0, y: 0, z: 1 };
            }
            break;
        case 'ArrowLeft':
        case 'a':
            if (direction.x !== 1) { // Not moving right
                newDirection = { x: -1, y: 0, z: 0 };
            }
            break;
        case 'ArrowRight':
        case 'd':
            if (direction.x !== -1) { // Not moving left
                newDirection = { x: 1, y: 0, z: 0 };
            }
            break;
        default:
            return;
    }
    
    if (!newDirection) return;
    
    // If we're close to the next movement time, buffer this input
    if (currentTime - lastMoveTime > MOVE_INTERVAL - INPUT_BUFFER_TIME) {
        inputBuffer = newDirection;
        lastInputTime = currentTime;
    } else {
        // Otherwise set it as the next direction immediately
        nextDirection = newDirection;
    }
    
    // Prevent default behavior for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
    }
}

// Calculate optimal camera position based on viewport dimensions
function updateCameraForViewport() {
    // Get the aspect ratio of the viewport
    const aspect = window.innerWidth / window.innerHeight;
    
    // The effective width and height of the game area including borders
    const effectiveWidth = GRID_SIZE + 2; // Add 2 for the borders (1 on each side)
    const effectiveHeight = GRID_SIZE + 2;
    
    // Calculate camera distance needed to view the entire board
    let cameraHeight, cameraZ;
    
    // Position the camera higher and further back to see all borders
    if (aspect >= 1) { // Landscape or square
        cameraHeight = effectiveHeight * 1.2; // Higher position
        cameraZ = effectiveHeight * 0.8;      // Further back
    } else { // Portrait
        cameraHeight = effectiveHeight * 1.4; // Even higher for portrait
        cameraZ = effectiveHeight * 0.6;     // Adjusted back position
    }
    
    // Set the camera position
    camera.position.set(0, cameraHeight, cameraZ);
    
    // Tilt the camera to look slightly downward at the board
    // This helps to see the borders closest to the viewer
    camera.lookAt(0, -1, 0); // Look slightly below the center of the board
    
    // Calculate the distance from camera to the center of the board
    const distanceFromCenter = Math.sqrt(cameraHeight * cameraHeight + cameraZ * cameraZ);
    
    // Calculate the FOV needed to see the largest dimension with extra margin
    const requiredFovHeight = 2 * Math.atan(effectiveHeight / (2 * distanceFromCenter)) * (180 / Math.PI);
    const requiredFovWidth = 2 * Math.atan((effectiveWidth / aspect) / (2 * distanceFromCenter)) * (180 / Math.PI);
    
    // Use a larger margin (1.2) to ensure all borders are visible
    camera.fov = Math.max(requiredFovHeight, requiredFovWidth) * 1.2;
}

// Handle window resize
function handleResize() {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    
    // Recalculate camera position for new viewport size
    // This will also update the camera.lookAt direction
    updateCameraForViewport();
    
    // Update projection matrix after changing camera properties
    camera.updateProjectionMatrix();
    
    // Resize renderer to match new window dimensions
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Maintain pixel ratio on resize
}

// Move the snake
function moveSnake() {
    if (!gameRunning) return;
    
    // Check if we have a buffered input to apply
    if (inputBuffer) {
        nextDirection = inputBuffer;
        inputBuffer = null;
    }

    // Update direction
    direction = { ...nextDirection };

    // Get the current head position
    const head = snake[0];
    const newHeadPosition = {
        x: head.position.x + direction.x,
        y: head.position.y + direction.y,
        z: head.position.z + direction.z
    };

    // Check for collision with walls
    if (
        newHeadPosition.x < -GRID_SIZE / 2 + 0.5 || 
        newHeadPosition.x > GRID_SIZE / 2 - 0.5 || 
        newHeadPosition.z < -GRID_SIZE / 2 + 0.5 || 
        newHeadPosition.z > GRID_SIZE / 2 - 0.5
    ) {
        gameOver();
        return;
    }

    // Check for collision with self
    for (let i = 1; i < snake.length; i++) {
        const segment = snake[i];
        if (
            newHeadPosition.x === segment.position.x && 
            newHeadPosition.z === segment.position.z
        ) {
            gameOver();
            return;
        }
    }

    // Move the body (follow the head)
    for (let i = snake.length - 1; i > 0; i--) {
        snake[i].position.copy(snake[i - 1].position);
        
        // Apply wave motion to each segment
        applyWaveMotion(snake[i], i);
    }

    // Move the head
    head.position.set(newHeadPosition.x, newHeadPosition.y, newHeadPosition.z);

    // Increment the wave time counter
    waveTime += 0.1;

    // Check for food collision
    if (
        Math.abs(head.position.x - food.position.x) < CELL_SIZE / 2 && 
        Math.abs(head.position.z - food.position.z) < CELL_SIZE / 2
    ) {
        // Eat food
        eatFood();
    }

    // Randomly shoot bullets from body segments
    for (let i = 1; i < snake.length; i++) {
        if (Math.random() < BULLET_CHANCE) {
            // Generate a random direction for the bullet
            const randomDirection = getRandomDirection();
            createBullet(snake[i].position.clone(), randomDirection);
        }
    }
}

// Apply wave motion to a snake segment
function applyWaveMotion(segment, index) {
    // Calculate wave amplitude based on segment position
    // Further segments have more pronounced waves
    const amplitude = 0.15 * Math.min(index / 5, 0.5);
    
    // Calculate wave frequency - different for horizontal and vertical movement
    const frequency = 1.5;
    
    // Calculate phase based on segment index and time
    // This creates a traveling wave effect along the snake's body
    const phase = waveTime - (index * 0.2);
    
    // Calculate the wave offset
    let xOffset = 0;
    let zOffset = 0;
    
    // Apply wave perpendicular to movement direction
    if (direction.x !== 0) {
        // Moving horizontally, wave moves vertically (z-axis)
        zOffset = amplitude * Math.sin(frequency * phase);
    } else if (direction.z !== 0) {
        // Moving vertically, wave moves horizontally (x-axis)
        xOffset = amplitude * Math.sin(frequency * phase);
    }
    
    // Apply the wave offset to the segment's position
    segment.position.x += xOffset;
    segment.position.z += zOffset;
}

// Get a random direction for bullets
function getRandomDirection() {
    const directions = [
        // Cardinal directions
        { x: 1, y: 0, z: 0 },   // Right
        { x: -1, y: 0, z: 0 },  // Left
        { x: 0, y: 0, z: 1 },   // Down
        { x: 0, y: 0, z: -1 },  // Up
        
        // Diagonal directions
        { x: 1, y: 0, z: 1 },   // Down-Right
        { x: 1, y: 0, z: -1 },  // Up-Right
        { x: -1, y: 0, z: 1 },  // Down-Left
        { x: -1, y: 0, z: -1 }  // Up-Left
    ];
    
    // Get a random direction
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    
    // Normalize diagonal directions to maintain consistent speed
    if (randomDir.x !== 0 && randomDir.z !== 0) {
        // For diagonal movement, multiply by 1/sqrt(2) ≈ 0.7071
        // This ensures diagonal bullets move at the same speed as cardinal directions
        randomDir.x *= 0.7071;
        randomDir.z *= 0.7071;
    }
    
    return randomDir;
}

// Update bullet positions and check for collisions
function updateBullets() {
    const currentTime = Date.now();
    
    // Update each bullet
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const bulletDirection = bullet.userData.direction;
        
        // Move the bullet
        bullet.position.x += bulletDirection.x * BULLET_SPEED;
        bullet.position.z += bulletDirection.z * BULLET_SPEED;
        
        // Check for collision with food
        if (
            Math.abs(bullet.position.x - food.position.x) < CELL_SIZE / 2 && 
            Math.abs(bullet.position.z - food.position.z) < CELL_SIZE / 2
        ) {
            // Create explosion at the position of the food
            createExplosion(food.position.clone());
            
            // Bullet hit food - just move the food, don't grow the snake
            moveFood();
            
            // Remove the bullet
            scene.remove(bullet);
            bullets.splice(i, 1);
            continue;
        }
        
        // Check for bullet lifetime
        if (currentTime - bullet.userData.createdAt > BULLET_LIFETIME) {
            scene.remove(bullet);
            bullets.splice(i, 1);
            continue;
        }
        
        // Check for collision with walls
        if (
            bullet.position.x < -GRID_SIZE / 2 + 0.5 || 
            bullet.position.x > GRID_SIZE / 2 - 0.5 || 
            bullet.position.z < -GRID_SIZE / 2 + 0.5 || 
            bullet.position.z > GRID_SIZE / 2 - 0.5
        ) {
            scene.remove(bullet);
            bullets.splice(i, 1);
            continue;
        }
    }
}

// Move food to a new position without growing the snake
function moveFood() {
    // Create new food at a random position
    createFood();
}

// Handle eating food
function eatFood() {
    // Increase score
    score++;
    document.getElementById('score').textContent = `Score: ${score}`;
    
    // Add new segment to snake
    const tail = snake[snake.length - 1];
    addSnakeSegment(tail.position.x, tail.position.y, tail.position.z);
    
    // Create new food
    createFood();
}

// Game over
function gameOver() {
    gameRunning = false;
    document.getElementById('gameOver').style.display = 'block';
}

// Create an explosion effect at the given position
function createExplosion(position) {
    const particleCount = 15;
    const explosionGroup = new THREE.Group();
    const colors = [0xffff00, 0xff6600, 0xff3300]; // Yellow, orange, red
    
    for (let i = 0; i < particleCount; i++) {
        const size = Math.random() * 0.2 + 0.1;
        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: colors[Math.floor(Math.random() * colors.length)],
            transparent: true,
            opacity: 1
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Random position offset from center
        const offset = 0.2;
        particle.position.set(
            position.x + (Math.random() * offset * 2 - offset),
            position.y + (Math.random() * offset * 2 - offset),
            position.z + (Math.random() * offset * 2 - offset)
        );
        
        // Random velocity
        const speed = 0.05;
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * speed,
                (Math.random() - 0.5) * speed,
                (Math.random() - 0.5) * speed
            ),
            createdAt: Date.now()
        };
        
        explosionGroup.add(particle);
    }
    
    scene.add(explosionGroup);
    explosions.push({
        group: explosionGroup,
        createdAt: Date.now(),
        duration: 500 // milliseconds
    });
}

// Update explosions
function updateExplosions() {
    const currentTime = Date.now();
    
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        const group = explosion.group;
        const age = currentTime - explosion.createdAt;
        const progress = age / explosion.duration; // 0 to 1
        
        if (progress >= 1) {
            // Remove explosion if it's finished
            scene.remove(group);
            explosions.splice(i, 1);
            continue;
        }
        
        // Update each particle in the explosion
        group.children.forEach(particle => {
            // Move particle according to its velocity
            particle.position.add(particle.userData.velocity);
            
            // Fade out particle
            particle.material.opacity = 1 - progress;
            
            // Scale particle down slightly
            const scale = 1 - (progress * 0.5);
            particle.scale.set(scale, scale, scale);
        });
    }
}

// Animation loop
function animate(currentTime) {
    if (!gameRunning && !document.getElementById('gameOver').style.display === 'block') {
        return; // Stop animation if game is over and not showing game over screen
    }
    
    requestAnimationFrame(animate);
    
    // Move snake at fixed intervals
    if (gameRunning && currentTime - lastMoveTime > MOVE_INTERVAL) {
        moveSnake();
        lastMoveTime = currentTime;
    }
    
    // Update bullets every frame
    updateBullets();
    
    // Update explosions every frame
    updateExplosions();
    
    // Render scene
    if (scene && renderer) {
        renderer.render(scene, camera);
    }
}

// Start the game
init();
