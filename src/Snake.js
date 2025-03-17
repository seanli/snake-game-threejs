import { CONFIG } from './config.js';
import * as THREE from 'three';

export class Snake {
    constructor(scene) {
        this.scene = scene;
        this.segments = [];
        this.direction = { x: 1, y: 0, z: 0 };
        this.nextDirection = { x: 1, y: 0, z: 0 };
        this.inputBuffer = null;
    }

    create() {
        // Create initial snake head
        const geometry = new THREE.BoxGeometry(CONFIG.GRID.CELL_SIZE, CONFIG.GRID.CELL_SIZE, CONFIG.GRID.CELL_SIZE);
        const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        const head = new THREE.Mesh(geometry, material);
        head.position.set(0, 0, 0);
        
        this.segments = [head];
        this.scene.add(head);
        
        // Add initial tail segment
        this.addSegment(-1, 0, 0);
    }

    addSegment(x, y, z) {
        const geometry = new THREE.BoxGeometry(CONFIG.GRID.CELL_SIZE, CONFIG.GRID.CELL_SIZE, CONFIG.GRID.CELL_SIZE);
        const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        const segment = new THREE.Mesh(geometry, material);
        
        const lastSegment = this.segments[this.segments.length - 1];
        segment.position.copy(lastSegment.position);
        segment.position.x = x !== undefined ? x : lastSegment.position.x;
        segment.position.y = y !== undefined ? y : lastSegment.position.y;
        segment.position.z = z !== undefined ? z : lastSegment.position.z;
        
        this.segments.push(segment);
        this.scene.add(segment);
    }

    move() {
        // Apply buffered input
        if (this.inputBuffer) {
            this.nextDirection = { ...this.inputBuffer };
            this.inputBuffer = null;
        }

        // Update direction
        this.direction = { ...this.nextDirection };

        // Get the current head position
        const head = this.segments[0];
        const newHeadPosition = {
            x: head.position.x + this.direction.x,
            y: head.position.y + this.direction.y,
            z: head.position.z + this.direction.z
        };

        // Move the body (follow the head)
        for (let i = this.segments.length - 1; i > 0; i--) {
            this.segments[i].position.copy(this.segments[i - 1].position);
        }

        // Move the head
        head.position.set(newHeadPosition.x, newHeadPosition.y, newHeadPosition.z);
    }

    applyWaveMotion() {
        if (this.segments.length <= 1) return;

        for (let i = 1; i < this.segments.length; i++) {
            const segment = this.segments[i];
            
            // Store original position before applying wave
            const originalX = segment.position.x;
            const originalZ = segment.position.z;
            
            // Reset Y position (will be set by wave motion)
            segment.position.y = 0;
            
            // Calculate wave motion
            const now = Date.now() / 1000;
            const timeOffset = i * 0.4;
            const individualFrequency = CONFIG.ANIMATION.WAVE.BASE_FREQUENCY + (i * 0.15);
            
            // Calculate bounce
            const primaryWave = Math.sin(individualFrequency * now - timeOffset);
            const bounce = CONFIG.ANIMATION.WAVE.BOUNCE_HEIGHT * Math.pow(0.5 + 0.5 * primaryWave, 2);
            
            // Apply motion
            segment.position.y = bounce;
            
            // Add wobble effect
            const wobbleX = CONFIG.ANIMATION.WAVE.WOBBLE_AMOUNT * 
                Math.sin(individualFrequency * 0.8 * now - timeOffset * 1.5);
            const wobbleZ = CONFIG.ANIMATION.WAVE.WOBBLE_AMOUNT * 
                Math.cos(individualFrequency * 0.6 * now - timeOffset * 1.2);
            
            // Restore original position with wobble
            segment.position.x = originalX + wobbleX;
            segment.position.z = originalZ + wobbleZ;
        }
    }

    handleInput(key) {
        const newDirection = { ...this.direction };

        switch (key) {
            case 'ArrowUp':
                if (this.direction.z !== 1) {
                    newDirection.x = 0;
                    newDirection.z = -1;
                }
                break;
            case 'ArrowDown':
                if (this.direction.z !== -1) {
                    newDirection.x = 0;
                    newDirection.z = 1;
                }
                break;
            case 'ArrowLeft':
                if (this.direction.x !== 1) {
                    newDirection.x = -1;
                    newDirection.z = 0;
                }
                break;
            case 'ArrowRight':
                if (this.direction.x !== -1) {
                    newDirection.x = 1;
                    newDirection.z = 0;
                }
                break;
        }

        this.inputBuffer = newDirection;
    }

    checkCollisionWithWalls() {
        const head = this.segments[0];
        return (
            head.position.x < -CONFIG.GRID.SIZE / 2 + 0.5 || 
            head.position.x > CONFIG.GRID.SIZE / 2 - 0.5 || 
            head.position.z < -CONFIG.GRID.SIZE / 2 + 0.5 || 
            head.position.z > CONFIG.GRID.SIZE / 2 - 0.5
        );
    }

    checkSelfCollision() {
        const head = this.segments[0];
        for (let i = 1; i < this.segments.length; i++) {
            const segment = this.segments[i];
            if (
                head.position.x === segment.position.x && 
                head.position.z === segment.position.z
            ) {
                return true;
            }
        }
        return false;
    }

    reset() {
        // Remove all segments from scene
        for (const segment of this.segments) {
            this.scene.remove(segment);
        }
        this.segments = [];
        this.direction = { x: 1, y: 0, z: 0 };
        this.nextDirection = { x: 1, y: 0, z: 0 };
        this.inputBuffer = null;
        
        // Create new snake
        this.create();
    }

    getHead() {
        return this.segments[0];
    }

    getSegments() {
        return this.segments;
    }
}
