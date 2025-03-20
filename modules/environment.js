import * as THREE from 'three';
import { scene } from '../game.js';
import { gameState, collisionObjects } from './state.js';
import { debugLog, DEBUG } from './utils.js';

// Create the game environment
export function createEnvironment() {
    debugLog('Creating environment');
    
    // Map dimensions - 4x larger than before
    const mapWidth = 100; // Was 50
    const mapDepth = 100; // Was 50
    
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(mapWidth, mapDepth, 10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc, 
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Create boundary walls to prevent player from leaving the map
    createBoundaryWalls(mapWidth, mapDepth);

    // Add a coordinate axis helper for debugging
    if (DEBUG) {
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);
    }
    
    // Create random blocks instead of a central building - more blocks for larger map
    const blockBounds = createRandomBlocks(40); // Increased from 15 to 40
    
    // Store all building bounds for enemy spawn checking
    gameState.allBuildingBounds = blockBounds.map(b => b.box);
    
    // Visualize building bounds in debug mode
    if (DEBUG) {
        visualizeBuildingBounds();
    }
}

// Create boundary walls around the map
function createBoundaryWalls(mapWidth, mapDepth) {
    const wallHeight = 10;
    const wallThickness = 1;
    const wallColor = 0x888888;
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: wallColor,
        roughness: 0.8,
        metalness: 0.2
    });
    
    // North wall
    const northWallGeometry = new THREE.BoxGeometry(mapWidth + wallThickness*2, wallHeight, wallThickness);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
    northWall.position.set(0, wallHeight/2, -mapDepth/2 - wallThickness/2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    scene.add(northWall);
    collisionObjects.push(northWall);
    
    // South wall
    const southWallGeometry = new THREE.BoxGeometry(mapWidth + wallThickness*2, wallHeight, wallThickness);
    const southWall = new THREE.Mesh(southWallGeometry, wallMaterial);
    southWall.position.set(0, wallHeight/2, mapDepth/2 + wallThickness/2);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    scene.add(southWall);
    collisionObjects.push(southWall);
    
    // East wall
    const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, mapDepth + wallThickness*2);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(mapWidth/2 + wallThickness/2, wallHeight/2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    scene.add(eastWall);
    collisionObjects.push(eastWall);
    
    // West wall
    const westWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, mapDepth + wallThickness*2);
    const westWall = new THREE.Mesh(westWallGeometry, wallMaterial);
    westWall.position.set(-mapWidth/2 - wallThickness/2, wallHeight/2, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    scene.add(westWall);
    collisionObjects.push(westWall);
    
    debugLog('Created boundary walls');
}

// Remove the createCentralBuilding function and replace with createRandomBlocks
function createRandomBlocks(count = 15) {
    debugLog('Creating random blocks');
    
    const blockBounds = [];
    
    for (let i = 0; i < count; i++) {
        // Generate random dimensions
        const height = Math.random() * 4 + 1;
        const width = Math.random() * 3 + 1;
        const depth = Math.random() * 3 + 1;
        
        // Random cartoon-style colors
        const colors = [0x333333, 0x666666, 0x999999, 0xDDDDDD, 0xAA3333, 0x3333AA, 0x33AA33];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const blockGeometry = new THREE.BoxGeometry(width, height, depth);
        const blockMaterial = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const block = new THREE.Mesh(blockGeometry, blockMaterial);
        
        // Enable shadows
        block.castShadow = true;
        block.receiveShadow = true;
        
        // Random position - expanded for larger map
        let validPosition = false;
        let position = new THREE.Vector3();
        let attempts = 0;
        
        while (!validPosition && attempts < 50) {
            attempts++;
            position.x = Math.random() * 90 - 45; // Expanded from 40-20 to 90-45
            position.z = Math.random() * 90 - 45; // Expanded from 40-20 to 90-45
            
            // Keep blocks away from the center spawn area
            if (Math.abs(position.x) < 5 && Math.abs(position.z) < 5) {
                continue;
            }
            
            // Check if this position overlaps with existing blocks
            let overlaps = false;
            for (const bound of blockBounds) {
                // Simple distance check for overlap
                const distance = Math.sqrt(
                    Math.pow(position.x - bound.x, 2) + 
                    Math.pow(position.z - bound.z, 2)
                );
                
                if (distance < (width/2 + bound.width/2 + 1)) {
                    overlaps = true;
                    break;
                }
            }
            
            if (!overlaps) {
                validPosition = true;
            }
        }
        
        if (!validPosition) {
            debugLog(`Could not find valid position for block ${i} after 50 attempts`);
            continue;
        }
        
        block.position.set(position.x, height/2, position.z);
        
        // Add to scene and collision objects
        scene.add(block);
        collisionObjects.push(block);
        
        // For blocks that are short enough to jump on (less than 4 units high)
        // Add invisible collision walls that extend higher
        if (height < 4) {
            // Create invisible collision walls that extend up to prevent jumping in
            const wallHeight = 8; // Height that player definitely can't jump over
            const wallMaterial = new THREE.MeshBasicMaterial({ 
                visible: false // Make the walls invisible
            });
            
            // Create collision walls for each side of the block
            const wallGeometries = [
                new THREE.BoxGeometry(0.1, wallHeight, depth), // Left wall
                new THREE.BoxGeometry(0.1, wallHeight, depth), // Right wall
                new THREE.BoxGeometry(width, wallHeight, 0.1), // Front wall
                new THREE.BoxGeometry(width, wallHeight, 0.1)  // Back wall
            ];
            
            const wallPositions = [
                [-width/2, wallHeight/2, 0], // Left wall
                [width/2, wallHeight/2, 0],  // Right wall
                [0, wallHeight/2, -depth/2], // Front wall
                [0, wallHeight/2, depth/2]   // Back wall
            ];
            
            wallGeometries.forEach((geometry, index) => {
                const wall = new THREE.Mesh(geometry, wallMaterial);
                wall.position.set(
                    position.x + wallPositions[index][0],
                    wallPositions[index][1],
                    position.z + wallPositions[index][2]
                );
                scene.add(wall);
                collisionObjects.push(wall);
            });
        }
        
        // Store bounds for enemy spawn checking
        blockBounds.push({
            x: position.x,
            z: position.z,
            width: width,
            depth: depth,
            box: new THREE.Box3().setFromObject(block)
        });
        
        debugLog(`Added block at ${position.x}, ${position.y}, ${position.z}`);
    }
    
    // Store all block bounds for enemy spawn checking
    gameState.allBuildingBounds = blockBounds.map(b => b.box);
    
    return blockBounds;
}

// Function to visualize building bounds in debug mode
function visualizeBuildingBounds() {
    if (!DEBUG || !gameState.allBuildingBounds) return;
    
    debugLog('Visualizing building bounds');
    
    // Create a group to hold all the visualizers
    const boundsGroup = new THREE.Group();
    scene.add(boundsGroup);
    
    // Create a helper for each building bound
    gameState.allBuildingBounds.forEach((bounds, index) => {
        const helper = new THREE.Box3Helper(bounds, 0x00ff00);
        boundsGroup.add(helper);
        
        // Add a label with the index
        const center = new THREE.Vector3();
        bounds.getCenter(center);
        
        // Create a sprite for the text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 64;
        context.fillStyle = 'white';
        context.font = '48px Arial';
        context.fillText(index.toString(), 20, 44);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(center);
        sprite.position.y += 2; // Position above the box
        sprite.scale.set(2, 2, 1);
        
        boundsGroup.add(sprite);
    });
    
    // Store the group for later removal if needed
    gameState.boundVisualizerGroup = boundsGroup;
}

// Add a sun sphere to represent the light source
export function createSun() {
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sunMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1,
        shininess: 100
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    
    // Position the sun at the same position as the directional light
    sun.position.set(20, 30, 20);
    scene.add(sun);
    
    return sun;
}