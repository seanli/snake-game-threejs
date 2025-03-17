import { CONFIG } from './config.js';
import { Snake } from './Snake.js';
import { Food } from './Food.js';
import { Grid } from './Grid.js';
import { BulletSystem } from './BulletSystem.js';
import * as THREE from 'three';

export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.snake = null;
        this.food = null;
        this.grid = null;
        this.bulletSystem = null;
        this.score = 0;
        this.gameRunning = true;
        this.lastMoveTime = 0;
        this.lastInputTime = 0;

        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            50,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);

        // Create game objects
        this.grid = new Grid(this.scene);
        this.snake = new Snake(this.scene);
        this.food = new Food(this.scene);
        this.bulletSystem = new BulletSystem(this.scene);

        // Initialize game state
        this.snake.create();
        this.food.moveToRandomPosition(this.snake);
        this.updateCameraForViewport();

        // Add event listeners
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));

        // Start animation loop
        this.animate(0);
    }

    handleKeyDown(event) {
        if (!this.gameRunning) {
            if (event.key === 'r' || event.key === 'R') {
                this.restart();
            }
            return;
        }

        // Handle movement input
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
            const now = Date.now();
            if (now - this.lastInputTime > CONFIG.GAME.INPUT_BUFFER_TIME) {
                this.snake.handleInput(event.key);
                this.lastInputTime = now;
            }
        }
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.updateCameraForViewport();
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    updateCameraForViewport() {
        const aspect = window.innerWidth / window.innerHeight;
        const effectiveSize = CONFIG.GRID.SIZE + 2;
        
        let cameraHeight, cameraZ;
        if (aspect >= 1) {
            cameraHeight = effectiveSize * 1.2;
            cameraZ = effectiveSize * 0.8;
        } else {
            cameraHeight = effectiveSize * 1.4;
            cameraZ = effectiveSize * 0.6;
        }
        
        this.camera.position.set(0, cameraHeight, cameraZ);
        this.camera.lookAt(0, -1, 0);
    }

    checkCollisions() {
        if (this.snake.checkCollisionWithWalls() || this.snake.checkSelfCollision()) {
            this.gameOver();
            return true;
        }

        const head = this.snake.getHead();
        const foodPos = this.food.getPosition();
        
        if (Math.abs(head.position.x - foodPos.x) < CONFIG.GRID.CELL_SIZE / 2 && 
            Math.abs(head.position.z - foodPos.z) < CONFIG.GRID.CELL_SIZE / 2) {
            this.eatFood();
            return true;
        }

        return false;
    }

    eatFood() {
        this.score += 10;
        document.getElementById('score').textContent = this.score;
        this.snake.addSegment();
        this.food.moveToRandomPosition(this.snake);
    }

    gameOver() {
        this.gameRunning = false;
        document.getElementById('gameOver').style.display = 'block';
        document.getElementById('finalScore').textContent = this.score;
    }

    restart() {
        this.gameRunning = true;
        this.score = 0;
        document.getElementById('score').textContent = '0';
        document.getElementById('gameOver').style.display = 'none';
        
        this.snake.reset();
        this.food.moveToRandomPosition(this.snake);
        this.bulletSystem.clear();
    }

    animate(currentTime) {
        if (!this.gameRunning && 
            document.getElementById('gameOver').style.display !== 'block') {
            return;
        }
        
        requestAnimationFrame(this.animate.bind(this));

        // Apply continuous wave motion
        this.snake.applyWaveMotion();

        // Move snake at fixed intervals
        if (this.gameRunning && currentTime - this.lastMoveTime > CONFIG.GAME.MOVE_INTERVAL) {
            this.snake.move();
            this.checkCollisions();
            this.bulletSystem.shootFromSegments(this.snake);
            this.lastMoveTime = currentTime;
        }

        // Update bullets and explosions
        if (this.bulletSystem.update(this.snake)) {
            this.gameOver();
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}
