import { CONFIG } from './config.js';
import * as THREE from 'three';

export class Food {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.createMesh();
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(CONFIG.GRID.CELL_SIZE / 2, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
    }

    moveToRandomPosition(snake) {
        let newPosition;
        do {
            newPosition = {
                x: Math.floor(Math.random() * CONFIG.GRID.SIZE - CONFIG.GRID.SIZE / 2),
                z: Math.floor(Math.random() * CONFIG.GRID.SIZE - CONFIG.GRID.SIZE / 2)
            };
        } while (this.isPositionOccupied(newPosition, snake));

        this.mesh.position.set(newPosition.x, 0, newPosition.z);
    }

    isPositionOccupied(position, snake) {
        return snake.getSegments().some(segment => 
            segment.position.x === position.x && 
            segment.position.z === position.z
        );
    }

    getPosition() {
        return this.mesh.position;
    }

    remove() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
    }
}
