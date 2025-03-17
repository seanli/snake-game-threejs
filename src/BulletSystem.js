import { CONFIG } from './config.js';
import * as THREE from 'three';

export class BulletSystem {
    constructor(scene) {
        this.scene = scene;
        this.bullets = [];
        this.explosions = [];
    }

    createBullet(position, direction) {
        const geometry = new THREE.SphereGeometry(CONFIG.GRID.CELL_SIZE / 4, 8, 8);
        const material = new THREE.MeshPhongMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(geometry, material);
        
        bullet.position.copy(position);
        bullet.direction = direction;
        bullet.creationTime = Date.now();
        
        this.bullets.push(bullet);
        this.scene.add(bullet);
    }

    createExplosion(position) {
        const particleCount = 20;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(CONFIG.GRID.CELL_SIZE / 8, 4, 4);
            const material = new THREE.MeshPhongMaterial({ 
                color: Math.random() < 0.5 ? 0xff0000 : 0xffff00 
            });
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.copy(position);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            particles.add(particle);
        }
        
        particles.creationTime = Date.now();
        this.explosions.push(particles);
        this.scene.add(particles);
    }

    update(snake) {
        this.updateBullets(snake);
        this.updateExplosions();
    }

    updateBullets(snake) {
        const currentTime = Date.now();
        
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // Move bullet
            bullet.position.x += bullet.direction.x * CONFIG.BULLETS.SPEED;
            bullet.position.z += bullet.direction.z * CONFIG.BULLETS.SPEED;
            
            // Check lifetime
            if (currentTime - bullet.creationTime > CONFIG.BULLETS.LIFETIME) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
                continue;
            }
            
            // Check collision with snake
            for (const segment of snake.getSegments()) {
                if (this.checkBulletCollision(bullet, segment)) {
                    this.createExplosion(bullet.position);
                    this.scene.remove(bullet);
                    this.bullets.splice(i, 1);
                    return true; // Collision detected
                }
            }
        }
        return false; // No collisions
    }

    updateExplosions() {
        const currentTime = Date.now();
        
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            
            if (currentTime - explosion.creationTime > 1000) {
                this.scene.remove(explosion);
                this.explosions.splice(i, 1);
                continue;
            }
            
            explosion.children.forEach(particle => {
                particle.position.add(particle.velocity);
                particle.velocity.y -= 0.01; // Gravity
            });
        }
    }

    checkBulletCollision(bullet, segment) {
        const distance = bullet.position.distanceTo(segment.position);
        return distance < CONFIG.GRID.CELL_SIZE;
    }

    shootFromSegments(snake) {
        const segments = snake.getSegments();
        for (let i = 1; i < segments.length; i++) {
            if (Math.random() < CONFIG.BULLETS.SPAWN_CHANCE) {
                const direction = this.getRandomDirection();
                this.createBullet(segments[i].position.clone(), direction);
            }
        }
    }

    getRandomDirection() {
        const directions = [
            { x: 1, z: 0 },
            { x: -1, z: 0 },
            { x: 0, z: 1 },
            { x: 0, z: -1 }
        ];
        return directions[Math.floor(Math.random() * directions.length)];
    }

    clear() {
        // Remove all bullets
        for (const bullet of this.bullets) {
            this.scene.remove(bullet);
        }
        this.bullets = [];

        // Remove all explosions
        for (const explosion of this.explosions) {
            this.scene.remove(explosion);
        }
        this.explosions = [];
    }
}
