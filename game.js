// Game constants
const GRID_SIZE = 16; // Must be even number
const CELL_SIZE = 1;
const MOVE_INTERVAL = 120; // milliseconds - decreased for faster movement
const BULLET_SPEED = 0.15;
const BULLET_LIFETIME = 3000; // milliseconds
const BULLET_CHANCE = 0.1; // 10% chance for a body segment to shoot a bullet
const INPUT_BUFFER_TIME = 50; // milliseconds to buffer input before next movement

// GridCell class for robust grid positioning
class GridCell {
    constructor(x, z) {
        this.x = Math.round(x);
        this.z = Math.round(z);
    }
    
    // Check if this cell is within grid boundaries
    // We need to ensure the snake stays within the playable area
    isValid() {
        return this.x >= 0 && this.x < GRID_SIZE && 
               this.z >= 0 && this.z < GRID_SIZE;
    }
    
    // Check if this cell equals another cell
    equals(otherCell) {
        return this.x === otherCell.x && this.z === otherCell.z;
    }
    
    // Get a new cell by adding a direction
    add(direction) {
        return new GridCell(
            this.x + direction.x,
            this.z + direction.z
        );
    }
    
    // Create a random cell within the grid (away from walls)
    static random() {
        return new GridCell(
            Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
            Math.floor(Math.random() * (GRID_SIZE - 2)) + 1
        );
    }
    
    // Apply position to a THREE.js object
    // Position at cell center (x+0.5, z+0.5) to place in middle of grid cell
    applyToObject(object) {
        object.position.set(this.x + 0.5, 0, this.z + 0.5);
    }
    
    // Create a GridCell from a THREE.js object position
    // Subtract 0.5 to convert from center-of-cell to grid coordinates
    static fromObject(object) {
        return new GridCell(
            Math.round(object.position.x - 0.5),
            Math.round(object.position.z - 0.5)
        );
    }
}

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

    // Create camera with centered view
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(GRID_SIZE/2, GRID_SIZE * 0.8, GRID_SIZE * 1.2);
    camera.lookAt(GRID_SIZE/2, 0, GRID_SIZE/2);

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
    directionalLight.position.set(GRID_SIZE/2, 20, GRID_SIZE/2);
    scene.add(directionalLight);
    
    // Add a secondary fill light from the opposite direction
    const fillLight = new THREE.DirectionalLight(0xffffcc, 0.4);
    fillLight.position.set(GRID_SIZE/2, 10, GRID_SIZE/2);
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

// Create a wall mesh and add it to the scene
function createWall(isHorizontal, position, material) {
    // Create geometry based on wall orientation
    // Make walls slightly thicker (1.01) to avoid z-fighting with grid lines
    // For horizontal walls, width = GRID_SIZE + 1 to account for the offset walls
    const geometry = new THREE.BoxGeometry(GRID_SIZE + 1, 1, 1.01);
    const wall = new THREE.Mesh(geometry, material);
    
    // Rotate vertical walls
    if (!isHorizontal) {
        wall.rotation.y = Math.PI / 2;
    }
    
    // Set position
    wall.position.set(position.x, position.y, position.z);
    scene.add(wall);
    return wall;
}

// Create a corner block and add it to the scene
function createCorner(position, material) {
    // Make corners slightly larger (1.01) to avoid gaps with walls
    const geometry = new THREE.BoxGeometry(1.01, 1, 1.01);
    const corner = new THREE.Mesh(geometry, material);
    corner.position.set(position.x, position.y, position.z);
    scene.add(corner);
    return corner;
}

// Create a reference grid
function createGrid() {
    // Create a custom grid that aligns with cell centers
    // We'll create our own grid lines to ensure perfect alignment
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
    const gridGroup = new THREE.Group();
    
    // Create vertical grid lines (along z-axis)
    // Start at 0 and end at GRID_SIZE to create GRID_SIZE cells
    for (let x = 0; x <= GRID_SIZE; x++) {
        const points = [
            new THREE.Vector3(x, -0.5, 0),
            new THREE.Vector3(x, -0.5, GRID_SIZE)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, gridMaterial);
        gridGroup.add(line);
    }
    
    // Create horizontal grid lines (along x-axis)
    // Start at 0 and end at GRID_SIZE to create GRID_SIZE cells
    for (let z = 0; z <= GRID_SIZE; z++) {
        const points = [
            new THREE.Vector3(0, -0.5, z),
            new THREE.Vector3(GRID_SIZE, -0.5, z)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, gridMaterial);
        gridGroup.add(line);
    }
    
    scene.add(gridGroup);

    // Create wall material
    const wallMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x888888,
        specular: 0xaaaaaa,
        shininess: 50,
        flatShading: false
    });
    
    // Define wall positions to create a border around the playable area
    // Walls should be positioned at -0.5 and GRID_SIZE-0.5 to create a perfect border
    // This ensures the playable area is exactly GRID_SIZE x GRID_SIZE
    const wallPositions = {
        // Position walls at the grid boundaries
        // For horizontal walls, we center them at x = GRID_SIZE/2
        // For vertical walls, we center them at z = GRID_SIZE/2
        // We offset by 0.5 to place walls exactly at the grid boundary
        bottom: { x: GRID_SIZE/2, y: 0, z: GRID_SIZE + 0.5 },
        top: { x: GRID_SIZE/2, y: 0, z: -0.5 },
        left: { x: -0.5, y: 0, z: GRID_SIZE/2 },
        right: { x: GRID_SIZE + 0.5, y: 0, z: GRID_SIZE/2 },
        // Position corners at the exact grid corners
        topLeft: { x: -0.5, y: 0, z: -0.5 },
        topRight: { x: GRID_SIZE + 0.5, y: 0, z: -0.5 },
        bottomLeft: { x: -0.5, y: 0, z: GRID_SIZE + 0.5 },
        bottomRight: { x: GRID_SIZE + 0.5, y: 0, z: GRID_SIZE + 0.5 }
    };
    
    // Create walls using helper function
    createWall(true, wallPositions.bottom, wallMaterial); // Bottom wall (horizontal)
    createWall(true, wallPositions.top, wallMaterial);    // Top wall (horizontal)
    createWall(false, wallPositions.left, wallMaterial);  // Left wall (vertical)
    createWall(false, wallPositions.right, wallMaterial); // Right wall (vertical)
    
    // Create corners using helper function
    createCorner(wallPositions.topLeft, wallMaterial);
    createCorner(wallPositions.topRight, wallMaterial);
    createCorner(wallPositions.bottomLeft, wallMaterial);
    createCorner(wallPositions.bottomRight, wallMaterial);
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
    
    // Position the head at the middle of the grid
    const startX = Math.floor(GRID_SIZE / 2);
    const startZ = Math.floor(GRID_SIZE / 2);
    const headCell = new GridCell(startX, startZ);
    headCell.applyToObject(head);
    scene.add(head);
    snake.push(head);

    // Add initial tail segments
    for (let i = 1; i < 3; i++) {
        const segmentCell = new GridCell(startX - i, startZ);
        addSnakeSegment(segmentCell);
    }
}

// Add a new segment to the snake
function addSnakeSegment(cell) {
    const segmentGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE, 2, 2, 2);
    const segmentMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00cc00,
        specular: 0x99ff99,
        shininess: 30
    });
    const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
    cell.applyToObject(segment);
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
    
    // Generate random position on grid cells
    let foodCell;
    do {
        foodCell = GridCell.random();
    } while (isPositionOccupied(foodCell));
    
    // Position food exactly on grid cell
    foodCell.applyToObject(food);
    scene.add(food);
}

// Check if a grid position is occupied by the snake
function isPositionOccupied(cell) {
    return snake.some(segment => {
        const segmentCell = GridCell.fromObject(segment);
        return segmentCell.equals(cell);
    });
}

// Create a bullet
function createBullet(position, direction) {
    // Create a slightly larger bullet for better visibility
    const bulletGeometry = new THREE.SphereGeometry(CELL_SIZE / 3, 16, 16);
    const bulletMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffff00,
        specular: 0xffffaa,
        shininess: 80,
        emissive: 0xaaaa00,
        emissiveIntensity: 0.5
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Set bullet position at the center of the cell
    // Make a copy to avoid modifying the original position
    const bulletPosition = position.clone();
    
    // Offset the bullet position slightly in the direction it will travel
    // This prevents bullets from immediately colliding with the snake segment
    bulletPosition.x += direction.x * 0.6;
    bulletPosition.z += direction.z * 0.6;
    
    bullet.position.copy(bulletPosition);
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
    camera.updateProjectionMatrix();
    
    // Resize renderer to match new window dimensions
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
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

    // Get the current head position as a GridCell
    const head = snake[0];
    const currentCell = GridCell.fromObject(head);
    
    // Calculate new grid position
    const nextCell = currentCell.add(direction);

    // Check for collision with walls
    if (!nextCell.isValid()) {
        gameOver();
        return;
    }

    // Check for collision with self
    for (let i = 1; i < snake.length; i++) {
        const segmentCell = GridCell.fromObject(snake[i]);
        if (nextCell.equals(segmentCell)) {
            gameOver();
            return;
        }
    }

    // Move the body (follow the head)
    for (let i = snake.length - 1; i > 0; i--) {
        snake[i].position.copy(snake[i - 1].position);
        // Wave motion is now applied in the animation loop for continuous movement
    }

    // Move the head to exact grid position
    nextCell.applyToObject(head);

    // Check for food collision
    const foodCell = GridCell.fromObject(food);
    if (nextCell.equals(foodCell)) {
        // Eat food
        eatFood();
    }

    // More consistent bullet firing system
    // Only fire bullets from specific segments to make it more predictable
    // Use a time-based approach to ensure consistent firing rate
    const currentTime = Date.now();
    
    // Store the last firing time for each segment
    if (!snake.lastFired) {
        snake.lastFired = new Array(snake.length).fill(0);
    }
    
    // Ensure the lastFired array is the same length as the snake
    while (snake.lastFired.length < snake.length) {
        snake.lastFired.push(0);
    }
    
    // Only fire from body segments (not the head)
    for (let i = 1; i < snake.length; i++) {
        // Minimum time between shots for each segment (ms)
        const firingInterval = 2000 + (i * 500); // Different intervals for each segment
        
        // Check if enough time has passed since last firing
        if (currentTime - snake.lastFired[i] > firingInterval) {
            // Add some randomness to avoid all segments firing at once
            if (Math.random() < BULLET_CHANCE * 2) { // Doubled chance but less frequent checks
                // Generate a random direction for the bullet
                const randomDirection = getRandomDirection();
                createBullet(snake[i].position.clone(), randomDirection);
                
                // Update last firing time for this segment
                snake.lastFired[i] = currentTime;
            }
        }
    }
}

// Apply wave motion to a snake segment
function applyWaveMotion(segment, index) {
    // Much higher bounce height for very visible jumps
    // Use a constant high value for all segments to make waves more visible
    const bounceHeight = 0.8;
    
    // Use different frequencies for a more organic wave-like motion
    // Each segment will have a different frequency to create individual movement
    const baseFrequency = 4;
    const individualFrequency = baseFrequency + (index * 0.15);
    
    // Use continuous time-based animation even when snake isn't moving
    // This ensures blocks are constantly moving individually
    const now = Date.now() / 1000; // Current time in seconds for smooth animation
    const timeOffset = index * 0.4; // Larger offset for more distinct movement between segments
    
    // Create a sharper, more pronounced wave pattern
    // Using a combination of sine waves with different phases
    const primaryWave = Math.sin(individualFrequency * now - timeOffset);
    
    // Apply the bounce with higher amplitude and a sharper curve
    // Use Math.pow to create a more pronounced effect
    const bounce = bounceHeight * Math.pow(0.5 + 0.5 * primaryWave, 2);
    
    // Apply the bounce to the segment's vertical position (y-axis)
    segment.position.y = bounce;
    
    // Add a more pronounced horizontal wobble for more dynamic movement
    // This creates a snake-like slithering effect combined with the jumping
    const wobbleAmount = 0.15;
    segment.position.x += wobbleAmount * Math.sin(individualFrequency * 0.8 * now - timeOffset * 1.5);
    segment.position.z += wobbleAmount * Math.cos(individualFrequency * 0.6 * now - timeOffset * 1.2);
}

// Get a random direction for bullets
function getRandomDirection() {
    // Define all possible directions
    const directions = [
        // Cardinal directions (more weight to these for more predictable patterns)
        { x: 1, y: 0, z: 0 },   // Right
        { x: -1, y: 0, z: 0 },  // Left
        { x: 0, y: 0, z: 1 },   // Down
        { x: 0, y: 0, z: -1 },  // Up
        { x: 1, y: 0, z: 0 },   // Right (duplicate to increase probability)
        { x: -1, y: 0, z: 0 },  // Left (duplicate to increase probability)
        { x: 0, y: 0, z: 1 },   // Down (duplicate to increase probability)
        { x: 0, y: 0, z: -1 },  // Up (duplicate to increase probability)
        
        // Diagonal directions (less common)
        { x: 1, y: 0, z: 1 },   // Down-Right
        { x: 1, y: 0, z: -1 },  // Up-Right
        { x: -1, y: 0, z: 1 },  // Down-Left
        { x: -1, y: 0, z: -1 }  // Up-Left
    ];
    
    // Get a random direction from the weighted list
    const randomDir = { ...directions[Math.floor(Math.random() * directions.length)] };
    
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
        
        // Move the bullet with consistent speed
        bullet.position.x += bulletDirection.x * BULLET_SPEED;
        bullet.position.z += bulletDirection.z * BULLET_SPEED;
        
        // Check for collision with food - improved collision detection
        const distanceToFood = Math.sqrt(
            Math.pow(bullet.position.x - food.position.x, 2) + 
            Math.pow(bullet.position.z - food.position.z, 2)
        );
        
        if (distanceToFood < CELL_SIZE * 0.6) {
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
        
        // Check for collision with walls - updated for new wall positions
        if (
            bullet.position.x < 0 || 
            bullet.position.x > GRID_SIZE || 
            bullet.position.z < 0 || 
            bullet.position.z > GRID_SIZE
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
    const tailCell = GridCell.fromObject(tail);
    addSnakeSegment(tailCell);
    
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
    
    // Apply wave motion to snake segments every frame for continuous animation
    if (snake.length > 1) {
        for (let i = 1; i < snake.length; i++) {
            // Store original position before applying wave
            const originalX = snake[i].position.x;
            const originalZ = snake[i].position.z;
            
            // Reset Y position (will be set by wave motion)
            snake[i].position.y = 0;
            
            // Apply wave motion to this segment
            applyWaveMotion(snake[i], i);
            
            // Restore original X and Z positions (wave motion adds offsets)
            snake[i].position.x = originalX;
            snake[i].position.z = originalZ;
        }
    }
    
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

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    init();
});
