import { CONFIG } from './config.js';
import * as THREE from 'three';

export class Grid {
    constructor(scene) {
        this.scene = scene;
        this.gridLines = new THREE.Group();
        this.createGrid();
    }

    createGrid() {
        const size = CONFIG.GRID.SIZE;
        const divisions = size;
        
        // Create grid helper for reference
        const gridHelper = new THREE.GridHelper(size, divisions);
        gridHelper.position.y = 0;
        this.gridLines.add(gridHelper);

        // Create border walls
        const wallGeometry = new THREE.BoxGeometry(size + 2, 1, 1);
        const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });

        // Top wall
        const topWall = new THREE.Mesh(wallGeometry, wallMaterial);
        topWall.position.z = -size/2 - 0.5;
        this.gridLines.add(topWall);

        // Bottom wall
        const bottomWall = new THREE.Mesh(wallGeometry, wallMaterial);
        bottomWall.position.z = size/2 + 0.5;
        this.gridLines.add(bottomWall);

        // Left wall
        const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.x = -size/2 - 0.5;
        this.gridLines.add(leftWall);

        // Right wall
        const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
        rightWall.rotation.y = Math.PI / 2;
        rightWall.position.x = size/2 + 0.5;
        this.gridLines.add(rightWall);

        this.scene.add(this.gridLines);
    }

    remove() {
        this.scene.remove(this.gridLines);
    }
}
