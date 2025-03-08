import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Debug flag - turn this on to help troubleshoot
const DEBUG = true;

// Array to store objects that should have collision detection
const collisionObjects = [];

// Game state
let gameState = {
    health: 100,
    ammo: 10,
    maxAmmo: 10,
    bullets: 30, // Total bullets in inventory
    level: 1,
    score: 0,
    gameOver: false,
    showInventory: false,
    soundEnabled: true,
    brokenWindows: [], // Track which windows are broken
    lastHitTime: 0, // Track when player was last hit
    showingRoundMessage: false // Track if wave message is showing
};

// DOM elements
const healthEl = document.getElementById('health');
const ammoEl = document.getElementById('ammo');
const gameOverEl = document.getElementById('gameOver');
const restartButton = document.getElementById('restartButton');
const inventoryEl = document.getElementById('inventory');
const bulletsEl = document.getElementById('bullets');
const soundToggleEl = document.getElementById('soundToggle');

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0); // Light background for cartoon look

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.6; // Eye level

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Controls setup
const controls = new PointerLockControls(camera, document.body);
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let velocity = new THREE.Vector3();

// Weapon setup
const weapon = createWeapon();
camera.add(weapon);

// Create fist for melee attack
const fist = createFist();
fist.visible = false; // Hide initially
camera.add(fist);

scene.add(camera);

// Add classic Mickey-style environment
createEnvironment();

// Add enemies
const enemies = [];

// Physics settings
const gravity = 9.8;
let prevTime = performance.now();

// Lighting - IMPORTANT for visibility
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Increased intensity
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increased intensity
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
scene.add(dirLight);

// Add a hemisphere light for better overall lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
scene.add(hemiLight);

// Add bullet pickups
const bulletPickups = [];

// Audio setup
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

// Sound effects
const soundEffects = {
    shoot: new THREE.Audio(audioListener),
    reload: new THREE.Audio(audioListener),
    melee: new THREE.Audio(audioListener),
    enemyHit: new THREE.Audio(audioListener),
    enemyDeath: new THREE.Audio(audioListener),
    pickupBullets: new THREE.Audio(audioListener),
    playerHurt: new THREE.Audio(audioListener) // New sound for player getting hit
};

// Audio loader
const audioLoader = new THREE.AudioLoader();

// Load sound effects
function loadSoundEffects() {
    // Cartoon-style sound effects
    audioLoader.load('https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3', function(buffer) {
        soundEffects.shoot.setBuffer(buffer);
        soundEffects.shoot.setVolume(0.5);
    });
    
    audioLoader.load('https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3', function(buffer) {
        soundEffects.reload.setBuffer(buffer);
        soundEffects.reload.setVolume(0.5);
    });
    
    audioLoader.load('https://assets.mixkit.co/active_storage/sfx/931/931-preview.mp3', function(buffer) {
        soundEffects.melee.setBuffer(buffer);
        soundEffects.melee.setVolume(0.5);
    });
    
    audioLoader.load('https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3', function(buffer) {
        soundEffects.enemyHit.setBuffer(buffer);
        soundEffects.enemyHit.setVolume(0.5);
    });
    
    audioLoader.load('https://assets.mixkit.co/active_storage/sfx/561/561-preview.mp3', function(buffer) {
        soundEffects.enemyDeath.setBuffer(buffer);
        soundEffects.enemyDeath.setVolume(0.5);
    });
    
    audioLoader.load('https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3', function(buffer) {
        soundEffects.pickupBullets.setBuffer(buffer);
        soundEffects.pickupBullets.setVolume(0.5);
    });
    
    // Player hurt sound - cartoon grunt/yelp
    audioLoader.load('https://assets.mixkit.co/active_storage/sfx/1143/1143-preview.mp3', function(buffer) {
        soundEffects.playerHurt.setBuffer(buffer);
        soundEffects.playerHurt.setVolume(0.7);
    });
}

// Play sound effect if enabled
function playSound(sound) {
    if (gameState.soundEnabled && soundEffects[sound].buffer) {
        if (soundEffects[sound].isPlaying) {
            soundEffects[sound].stop();
        }
        soundEffects[sound].play();
    }
}

// Load sounds
loadSoundEffects();

// Disable context menu completely for the game
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
}, false);

// Event listeners
document.addEventListener('mousedown', (event) => {
    // Only handle left mouse button clicks (button 0)
    if (event.button !== 0) return;
    
    if (!controls.isLocked) {
        controls.lock();
    } else if (!gameState.gameOver) {
        shoot();
    }
});

controls.addEventListener('lock', () => {
    if (gameState.gameOver) {
        restartGame();
    }
});

controls.addEventListener('unlock', () => {
    // Player unlocked controls
});

document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
        case 'Space':
            if (canJump) {
                velocity.y += 10;
                canJump = false;
            }
            break;
        case 'KeyR':
            reload();
            break;
        case 'KeyI':
            toggleInventory();
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
    }
});

restartButton.addEventListener('click', () => {
    restartGame();
    controls.lock();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Add right-click event for melee attack
document.addEventListener('contextmenu', (event) => {
    event.preventDefault(); // Prevent context menu from appearing
    if (controls.isLocked && !gameState.gameOver) {
        meleeAttack();
    }
});

// Also add mousedown event for right-click to ensure it works across all browsers
document.addEventListener('mousedown', (event) => {
    // Check for right mouse button (button 2 in most browsers, sometimes button 1)
    if (event.button === 2 || event.button === 1) {
        debugLog(`Right mouse button clicked (button: ${event.button})`);
        event.preventDefault();
        if (controls.isLocked && !gameState.gameOver) {
            debugLog('Controls locked, triggering melee attack');
            meleeAttack();
        } else {
            debugLog(`Controls locked: ${controls.isLocked}, Game over: ${gameState.gameOver}`);
        }
    }
});

// Sound toggle
soundToggleEl.addEventListener('click', () => {
    gameState.soundEnabled = !gameState.soundEnabled;
    soundToggleEl.textContent = gameState.soundEnabled ? '🔊' : '🔇';
});

// Debug helper function
function debugLog(message) {
    if (DEBUG) {
        console.log(message);
    }
}

// Game functions
function createWeapon() {
    debugLog('Creating weapon');
    // Create a cartoon-style weapon
    const weaponGroup = new THREE.Group();
    
    // Gun body
    const gunGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 }); // Changed to BasicMaterial
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    
    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
    const barrel = new THREE.Mesh(barrelGeometry, gunMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.2;
    
    weaponGroup.add(gun);
    weaponGroup.add(barrel);
    
    // Position the weapon
    weaponGroup.position.set(0.3, -0.3, -0.5);
    
    return weaponGroup;
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
        const blockMaterial = new THREE.MeshBasicMaterial({ color: color });
        
        const block = new THREE.Mesh(blockGeometry, blockMaterial);
        
        // Random position
        let validPosition = false;
        let position = new THREE.Vector3();
        let attempts = 0;
        
        while (!validPosition && attempts < 50) {
            attempts++;
            position.x = Math.random() * 40 - 20;
            position.z = Math.random() * 40 - 20;
            
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

function createEnvironment() {
    debugLog('Creating environment');
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50, 10, 10);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Add a coordinate axis helper for debugging
    if (DEBUG) {
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);
    }
    
    // Create random blocks instead of a central building
    const blockBounds = createRandomBlocks(15);
    
    // Store all building bounds for enemy spawn checking
    gameState.allBuildingBounds = blockBounds.map(b => b.box);
}

function spawnEnemies() {
    debugLog('Spawning enemies');
    
    // Only show wave notification if it exists
    if (roundNotification) {
        showRoundNotification(gameState.level);
    }
    
    // Calculate number of enemies based on wave level
    // Start with 3 enemies on wave 1, then add 2 more for each wave
    const enemyCount = 3 + ((gameState.level - 1) * 2);
    
    // Create cartoon-style enemies inspired by old Mickey cartoons
    for (let i = 0; i < enemyCount; i++) {
        const enemy = createEnemy();
        
        // Generate random position
        let validPosition = false;
        let position = new THREE.Vector3();
        
        // Keep trying until we find a valid position outside all buildings
        let attempts = 0;
        while (!validPosition && attempts < 50) {
            attempts++;
            position.x = Math.random() * 30 - 15;
            position.z = Math.random() * 30 - 15;
            position.y = 0.8;
            
            // Check if position is inside any building
            let insideAnyBuilding = false;
            
            if (gameState.allBuildingBounds) {
                for (const bounds of gameState.allBuildingBounds) {
                    if (bounds.containsPoint(position)) {
                        // Position is inside a building, try again
                        insideAnyBuilding = true;
                        break;
                    }
                }
            }
            
            if (!insideAnyBuilding) {
                // Position is valid
                validPosition = true;
            }
        }
        
        if (!validPosition) {
            debugLog('Could not find valid position for enemy after 50 attempts');
            continue; // Skip this enemy if we can't find a valid position
        }
        
        enemy.position.copy(position);
        scene.add(enemy);
        
        // Make enemies slower than player (player speed is 5.0)
        // Keep speed constant across all waves
        const enemySpeed = 0.015 + (Math.random() * 0.005);
        
        enemies.push({
            mesh: enemy,
            health: 100,
            speed: enemySpeed,
            bounceOffset: Math.random() * Math.PI * 2
        });
        debugLog(`Added enemy at ${enemy.position.x}, ${enemy.position.y}, ${enemy.position.z} with speed ${enemySpeed}`);
    }
}

function createEnemy() {
    // Create a classic cartoon-style enemy group
    const enemyGroup = new THREE.Group();
    
    // Body - classic "rubber hose" round body
    const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Changed to BasicMaterial
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Changed to BasicMaterial
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.5;
    
    // Ears - circular ears like in old cartoons
    const earGeometry = new THREE.CircleGeometry(0.2, 16);
    const earMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }); // Changed to BasicMaterial
    
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.2, 0.7, 0);
    leftEar.rotation.y = Math.PI / 2;
    
    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.2, 0.7, 0);
    rightEar.rotation.y = -Math.PI / 2;
    
    // Eyes - classic pie-cut eyes
    const eyeGeometry = new THREE.CircleGeometry(0.05, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.55, 0.3);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.55, 0.3);
    
    enemyGroup.add(body);
    enemyGroup.add(head);
    enemyGroup.add(leftEar);
    enemyGroup.add(rightEar);
    enemyGroup.add(leftEye);
    enemyGroup.add(rightEye);
    
    return enemyGroup;
}

function shoot() {
    if (gameState.ammo <= 0) return;
    
    gameState.ammo--;
    updateUI();
    
    // Play shoot sound
    playSound('shoot');
    
    // Animate the weapon
    weapon.position.z += 0.1;
    setTimeout(() => {
        weapon.position.z -= 0.1;
    }, 100);
    
    // Ray casting for shooting
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(), camera);
    
    // Check for enemy hits
    const enemyMeshes = enemies.map(e => e.mesh);
    const intersects = raycaster.intersectObjects(enemyMeshes, true);
    
    if (intersects.length > 0) {
        const hitObject = intersects[0].object;
        
        // Check if we hit an enemy
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i].mesh.children.includes(hitObject) || enemies[i].mesh === hitObject) {
                enemies[i].health -= 50;
                
                // Play enemy hit sound
                playSound('enemyHit');
                
                // Visual feedback for hit
                hitObject.material.color.set(0xff0000);
                setTimeout(() => {
                    if (hitObject.material) {
                        hitObject.material.color.set(0x000000);
                    }
                }, 100);
                
                // Check if enemy is defeated
                if (enemies[i].health <= 0) {
                    // Play enemy death sound
                    playSound('enemyDeath');
                    
                    // Store enemy position before removing it
                    const enemyPosition = enemies[i].mesh.position.clone();
                    
                    // Remove enemy from scene
                    scene.remove(enemies[i].mesh);
                    enemies.splice(i, 1);
                    gameState.score += 100;
                    updateUI();
                    
                    // Random drop chance
                    const dropRoll = Math.random();
                    if (dropRoll < 0.3) {
                        // 30% chance to drop health
                        bulletPickups.push(createHealthPickup(enemyPosition));
                        debugLog('Enemy dropped health');
                    } else if (dropRoll < 0.6) {
                        // 30% chance to drop bullets
                        bulletPickups.push(createBulletDropPickup(enemyPosition));
                        debugLog('Enemy dropped bullets');
                    } else {
                        // 40% chance to drop nothing
                        debugLog('Enemy dropped nothing');
                    }
                    
                    // Check if all enemies are defeated
                    if (enemies.length === 0) {
                        gameState.level++;
                        gameState.ammo += 5;
                        
                        // Delay spawning new enemies to give player a moment to breathe
                        setTimeout(() => {
                            spawnEnemies();
                        }, 2000);
                    }
                }
                break;
            }
        }
    }
}

function updateUI() {
    healthEl.textContent = `❤️ ${gameState.health}`;
    ammoEl.textContent = `🔫 ${gameState.ammo}/${gameState.maxAmmo}`;
    bulletsEl.textContent = `🔹 Bullets: ${gameState.bullets}`;
    
    // Update score display
    if (scoreDisplay) {
        scoreDisplay.textContent = `Score: ${gameState.score}`;
    }
    
    // Update inventory UI
    document.getElementById('inv-bullets').textContent = gameState.bullets;
    document.getElementById('inv-health').textContent = gameState.health;
    document.getElementById('inv-score').textContent = gameState.score;
    document.getElementById('inv-level').textContent = gameState.level;
}

function restartGame() {
    gameState = {
        health: 100,
        ammo: 10,
        maxAmmo: 10,
        bullets: 30,
        level: 1,
        score: 0,
        gameOver: false,
        showInventory: false,
        soundEnabled: gameState.soundEnabled, // Preserve sound setting
        brokenWindows: [], // Reset broken windows
        lastHitTime: 0, // Reset last hit time
        showingRoundMessage: false // Reset round message tracking
    };
    
    // Remove all enemies
    for (const enemy of enemies) {
        scene.remove(enemy.mesh);
    }
    enemies.length = 0;
    
    // Remove all bullet pickups
    for (const pickup of bulletPickups) {
        scene.remove(pickup.mesh);
    }
    bulletPickups.length = 0;
    
    // Reset player position
    camera.position.set(0, 1.6, 0);
    velocity.set(0, 0, 0);
    
    // Spawn new enemies and pickups
    spawnEnemies();
    spawnBulletPickups();
    
    // Update UI
    updateUI();
    gameOverEl.style.display = 'none';
    inventoryEl.style.display = 'none';
}

function checkGameOver() {
    if (gameState.health <= 0 && !gameState.gameOver) {
        gameState.gameOver = true;
        
        // Update game over screen with score and level
        const gameOverEl = document.getElementById('gameOver');
        const scoreEl = document.getElementById('finalScore');
        const levelEl = document.getElementById('finalLevel');
        
        if (scoreEl) scoreEl.textContent = gameState.score;
        if (levelEl) levelEl.textContent = gameState.level;
        
        gameOverEl.style.display = 'block';
        controls.unlock();
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (controls.isLocked && !gameState.gameOver && !gameState.showInventory) {
        const time = performance.now();
        const delta = (time - prevTime) / 1000;
        
        // Apply gravity
        velocity.y -= gravity * delta;
        
        // Handle movement
        const direction = new THREE.Vector3();
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();
        
        if (moveForward || moveBackward) velocity.z = direction.z * 5.0;
        else velocity.z = 0;
        
        if (moveLeft || moveRight) velocity.x = direction.x * 5.0;
        else velocity.x = 0;
        
        // Store original position for collision detection
        const originalPosition = camera.position.clone();
        
        // Update controls
        controls.moveRight(velocity.x * delta);
        controls.moveForward(velocity.z * delta);
        
        // Check for collisions with buildings
        const playerRadius = 0.5; // Player collision radius
        let collision = false;
        
        for (const object of collisionObjects) {
            // Create a bounding box for the object
            const objectBox = new THREE.Box3().setFromObject(object);
            
            // Create a sphere for the player
            const playerSphere = new THREE.Sphere(camera.position, playerRadius);
            
            // Check for collision
            if (objectBox.intersectsSphere(playerSphere)) {
                collision = true;
                break;
            }
        }
        
        // If collision detected, revert to original position
        if (collision) {
            camera.position.copy(originalPosition);
        }
        
        // Simple collision detection with ground
        if (camera.position.y < 1.6) {
            velocity.y = 0;
            camera.position.y = 1.6;
            canJump = true;
        } else {
            camera.position.y += velocity.y * delta;
        }
        
        // Check for bullet pickup collisions
        const playerPosition = new THREE.Vector3();
        camera.getWorldPosition(playerPosition);
        
        for (let i = bulletPickups.length - 1; i >= 0; i--) {
            const pickup = bulletPickups[i];
            const distance = playerPosition.distanceTo(pickup.mesh.position);
            
            // Remove pickups that have been around for more than 20 seconds
            if (time - pickup.timeCreated > 20000) {
                scene.remove(pickup.mesh);
                bulletPickups.splice(i, 1);
                continue;
            }
            
            if (distance < 1.5) { // Pickup range
                // Handle different pickup types
                if (pickup.type === 'bullets') {
                    gameState.bullets += pickup.bullets;
                    playSound('pickupBullets');
                } else if (pickup.type === 'health') {
                    gameState.health = Math.min(100, gameState.health + pickup.health);
                    playSound('pickupBullets'); // Reuse bullet pickup sound for now
                }
                
                scene.remove(pickup.mesh);
                bulletPickups.splice(i, 1);
                updateUI();
            }
        }
        
        // Update enemies
        for (const enemy of enemies) {
            // Calculate direction to player
            const direction = new THREE.Vector3();
            direction.subVectors(camera.position, enemy.mesh.position).normalize();
            
            // Store original position for collision detection
            const originalEnemyPosition = enemy.mesh.position.clone();
            
            // Move enemy towards player
            const newPosition = enemy.mesh.position.clone();
            newPosition.x += direction.x * enemy.speed;
            newPosition.z += direction.z * enemy.speed;
            
            // Check for collisions with buildings
            let enemyCollision = false;
            const enemyRadius = 0.5; // Enemy collision radius
            
            // Temporarily update position to check collision
            enemy.mesh.position.copy(newPosition);
            
            for (const object of collisionObjects) {
                // Create a bounding box for the object
                const objectBox = new THREE.Box3().setFromObject(object);
                
                // Create a sphere for the enemy
                const enemySphere = new THREE.Sphere(enemy.mesh.position, enemyRadius);
                
                // Check for collision
                if (objectBox.intersectsSphere(enemySphere)) {
                    enemyCollision = true;
                    break;
                }
            }
            
            // If collision detected, revert to original position
            if (enemyCollision) {
                enemy.mesh.position.copy(originalEnemyPosition);
            }
            
            // Bouncy cartoon animation
            enemy.mesh.position.y = 0.8 + Math.sin(time * 0.005 + enemy.bounceOffset) * 0.1;
            
            // Rotate enemy to face player
            enemy.mesh.lookAt(camera.position);
            
            // Check if enemy is close to player
            const distanceToPlayer = enemy.mesh.position.distanceTo(camera.position);
            if (distanceToPlayer < 1.5) {
                // Use the new damage function instead of directly modifying health
                playerTakeDamage(1, enemy.mesh.position);
            }
        }
        
        prevTime = time;
    }
    
    renderer.render(scene, camera);
    checkGameOver();
}

// Check for WebGL support - improved detection
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            return {
                supported: false,
                reason: "Your browser doesn't seem to support WebGL"
            };
        }
        
        return {
            supported: true
        };
    } catch (e) {
        return {
            supported: false,
            reason: "Error detecting WebGL support: " + e.message
        };
    }
}

// Check WebGL support before initializing the game
const webGLStatus = checkWebGLSupport();
if (!webGLStatus.supported) {
    document.body.innerHTML = `
        <div style="color: white; text-align: center; padding: 20px; font-family: Arial, sans-serif;">
            <h2>WebGL Not Available</h2>
            <p>${webGLStatus.reason}</p>
            <h3>Troubleshooting Steps:</h3>
            <ol style="text-align: left; max-width: 600px; margin: 0 auto;">
                <li>Make sure you're using a modern browser (Chrome, Firefox, Edge, Safari)</li>
                <li>Update your browser to the latest version</li>
                <li>Check if WebGL is enabled in your browser:
                    <ul>
                        <li>Chrome: Type "chrome://gpu" in address bar</li>
                        <li>Firefox: Type "about:config" and search for "webgl.disabled" (should be false)</li>
                    </ul>
                </li>
                <li>Update your graphics drivers</li>
                <li>Try a different browser</li>
                <li>If on mobile, try a desktop browser</li>
            </ol>
            <p style="margin-top: 20px;">You can check your WebGL status at: <a href="https://get.webgl.org/" style="color: lightblue;">https://get.webgl.org/</a></p>
        </div>
    `;
} else {
    debugLog('WebGL is supported and working.');
    
    // Add some text to help debug
    if (DEBUG) {
        const debugInfo = document.createElement('div');
        debugInfo.style.position = 'absolute';
        debugInfo.style.top = '10px';
        debugInfo.style.left = '10px';
        debugInfo.style.color = 'red';
        debugInfo.style.fontWeight = 'bold';
        // debugInfo.textContent = 'DEBUG MODE: Check Console (F12) for logs';
        document.body.appendChild(debugInfo);
    }
    
    // Start the game
    animate();
    
    // Log successful setup
    debugLog('Game initialized successfully!');
}

// Create bullet pickup
function createBulletPickup() {
    const bulletGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.5);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Random position
    const x = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 20;
    bullet.position.set(x, 1, z);
    
    // Add to scene
    scene.add(bullet);
    
    return {
        mesh: bullet,
        type: 'bullets',
        bullets: 10, // Each pickup gives 10 bullets
        timeCreated: performance.now()
    };
}

// Spawn bullet pickups
function spawnBulletPickups(count = 5) {
    for (let i = 0; i < count; i++) {
        bulletPickups.push(createBulletPickup());
    }
}

// Reload function
function reload() {
    if (gameState.ammo < gameState.maxAmmo && gameState.bullets > 0) {
        const bulletsNeeded = gameState.maxAmmo - gameState.ammo;
        const bulletsToLoad = Math.min(bulletsNeeded, gameState.bullets);
        
        gameState.ammo += bulletsToLoad;
        gameState.bullets -= bulletsToLoad;
        
        // Animation for reloading
        weapon.rotation.x = 0.5;
        setTimeout(() => {
            weapon.rotation.x = 0;
        }, 300);
        
        // Play reload sound
        playSound('reload');
        
        updateUI();
    }
}

// Create fist for melee attack
function createFist() {
    debugLog('Creating fist for melee attack');
    
    // Create a cartoon-style fist
    const fistGroup = new THREE.Group();
    
    // Main fist - white glove like in classic cartoons
    const fistGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const fistMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const fistMesh = new THREE.Mesh(fistGeometry, fistMaterial);
    
    // Black outline for cartoon effect
    const outlineGeometry = new THREE.SphereGeometry(0.21, 16, 16);
    const outlineMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        side: THREE.BackSide 
    });
    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
    fistMesh.add(outline);
    
    // Add details to make it look like a cartoon glove
    const knuckleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const knuckleMaterial = new THREE.MeshBasicMaterial({ color: 0xdddddd });
    
    // Add knuckles
    for (let i = 0; i < 3; i++) {
        const knuckle = new THREE.Mesh(knuckleGeometry, knuckleMaterial);
        knuckle.position.set(0.1, 0.1 - (i * 0.1), 0.15);
        fistGroup.add(knuckle);
    }
    
    // Add wrist/cuff
    const cuffGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.1, 16);
    const cuffMaterial = new THREE.MeshBasicMaterial({ color: 0xdddddd });
    const cuff = new THREE.Mesh(cuffGeometry, cuffMaterial);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.set(0, 0, -0.2);
    
    // Black outline for cuff
    const cuffOutlineGeometry = new THREE.CylinderGeometry(0.16, 0.21, 0.11, 16);
    const cuffOutlineMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        side: THREE.BackSide 
    });
    const cuffOutline = new THREE.Mesh(cuffOutlineGeometry, cuffOutlineMaterial);
    cuffOutline.rotation.x = Math.PI / 2;
    cuffOutline.position.copy(cuff.position);
    
    // Add all parts to the group
    fistGroup.add(fistMesh);
    fistGroup.add(cuff);
    fistGroup.add(cuffOutline);
    
    // Add classic cartoon lines on the glove
    const lineGeometry = new THREE.BoxGeometry(0.01, 0.15, 0.01);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    // Horizontal lines on the back of the glove
    for (let i = 0; i < 2; i++) {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.z = Math.PI / 2;
        line.position.set(0, 0.05 - (i * 0.1), 0.18);
        fistGroup.add(line);
    }
    
    // Position the fist off-screen to the left
    fistGroup.position.set(-0.8, -0.3, -0.5);
    
    return fistGroup;
}

// Melee attack function
function meleeAttack() {
    debugLog('Melee attack triggered');
    
    // Don't allow melee attack if already in progress
    if (fist.visible) {
        debugLog('Melee attack already in progress, ignoring');
        return;
    }
    
    debugLog('Executing melee attack');
    
    // Play melee sound
    playSound('melee');
    
    // Show the fist
    fist.visible = true;
    
    // Animate the fist punching forward
    const startPosition = new THREE.Vector3(-0.8, -0.3, -0.5);
    const punchPosition = new THREE.Vector3(0, -0.3, -1.2);
    
    // Starting rotation and scale
    const startRotation = new THREE.Euler(0, 0, 0);
    const punchRotation = new THREE.Euler(0, 0, -Math.PI * 0.25); // Rotate for impact
    const startScale = new THREE.Vector3(1, 1, 1);
    const impactScale = new THREE.Vector3(1.2, 1.2, 0.8); // Squash on impact
    
    // Reset fist to starting position
    fist.position.copy(startPosition);
    fist.rotation.set(startRotation.x, startRotation.y, startRotation.z);
    fist.scale.copy(startScale);
    
    // Punch animation
    const punchDuration = 300; // milliseconds
    const startTime = performance.now();
    
    function animatePunch() {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / punchDuration, 1);
        
        if (progress < 0.4) {
            // Wind up - move slightly back and rotate
            const t = progress / 0.4; // 0 to 1 during wind up
            const windupPosition = new THREE.Vector3(-1.0, -0.3, -0.5); // Further left
            fist.position.lerpVectors(startPosition, windupPosition, t);
            fist.rotation.z = -Math.PI * 0.1 * t; // Slight rotation back
        } else if (progress < 0.7) {
            // Punch forward
            const t = (progress - 0.4) / 0.3; // 0 to 1 during punch
            const windupPosition = new THREE.Vector3(-1.0, -0.3, -0.5);
            fist.position.lerpVectors(windupPosition, punchPosition, t);
            
            // Rotate during punch
            fist.rotation.z = -Math.PI * 0.1 * (1 - t) - Math.PI * 0.25 * t;
            
            // Scale for impact at the end of the punch
            if (t > 0.8) {
                const scaleT = (t - 0.8) / 0.2;
                fist.scale.lerpVectors(startScale, impactScale, scaleT);
            }
        } else {
            // Retract
            const t = (progress - 0.7) / 0.3; // 0 to 1 during retraction
            fist.position.lerpVectors(punchPosition, startPosition, t);
            
            // Rotate back to normal
            fist.rotation.z = -Math.PI * 0.25 * (1 - t);
            
            // Scale back to normal
            fist.scale.lerpVectors(impactScale, startScale, t);
        }
        
        if (progress < 1) {
            requestAnimationFrame(animatePunch);
        } else {
            // Animation complete, hide the fist
            fist.visible = false;
            fist.position.copy(startPosition);
            fist.rotation.set(0, 0, 0);
            fist.scale.set(1, 1, 1);
        }
    }
    
    // Start the animation
    animatePunch();
    
    // Ray casting for melee attack
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(), camera);
    
    // Check for enemy hits - shorter range than shooting
    const enemyMeshes = enemies.map(e => e.mesh);
    const intersects = raycaster.intersectObjects(enemyMeshes, true);
    
    if (intersects.length > 0 && intersects[0].distance < 3) { // Melee range is 3 units
        const hitObject = intersects[0].object;
        // Find which enemy was hit
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i].mesh.children.includes(hitObject) || enemies[i].mesh === hitObject) {
                enemies[i].health -= 25; // Melee does less damage than shooting
                
                // Play enemy hit sound
                playSound('enemyHit');
                
                // Visual feedback for hit - more dramatic for melee
                hitObject.material.color.set(0xff0000);
                
                // Add impact effect - make the enemy move back slightly
                const playerPosition = new THREE.Vector3();
                camera.getWorldPosition(playerPosition);
                const direction = new THREE.Vector3();
                direction.subVectors(enemies[i].mesh.position, playerPosition).normalize();
                
                // Push enemy back
                enemies[i].mesh.position.add(direction.multiplyScalar(0.5));
                
                setTimeout(() => {
                    if (hitObject.material) {
                        hitObject.material.color.set(0x000000);
                    }
                }, 100);
                
                // Check if enemy is defeated
                if (enemies[i].health <= 0) {
                    // Play enemy death sound
                    playSound('enemyDeath');
                    
                    scene.remove(enemies[i].mesh);
                    enemies.splice(i, 1);
                    gameState.score += 100;
                    
                    // Check if all enemies are defeated
                    if (enemies.length === 0) {
                        gameState.level++;
                        spawnEnemies();
                        spawnBulletPickups(3); // Spawn some bullet pickups for the next level
                    }
                }
                break;
            }
        }
    }
}

// Toggle inventory display
function toggleInventory() {
    gameState.showInventory = !gameState.showInventory;
    inventoryEl.style.display = gameState.showInventory ? 'block' : 'none';
    
    // If showing inventory, pause the game by unlocking controls
    if (gameState.showInventory) {
        controls.unlock();
    } else if (!gameState.gameOver) {
        controls.lock();
    }
}

// Initialize bullet pickups
spawnBulletPickups();

// Add a general mousedown debug logger
document.addEventListener('mousedown', (event) => {
    debugLog(`Mouse button pressed: ${event.button}`);
}, true); // Use capture phase to ensure this runs first

// Create a red halo effect for player damage
function createDamageOverlay() {
    const overlayEl = document.createElement('div');
    overlayEl.id = 'damageOverlay';
    overlayEl.style.position = 'absolute';
    overlayEl.style.top = '0';
    overlayEl.style.left = '0';
    overlayEl.style.width = '100%';
    overlayEl.style.height = '100%';
    overlayEl.style.backgroundColor = 'rgba(255, 0, 0, 0)';
    overlayEl.style.pointerEvents = 'none';
    overlayEl.style.transition = 'background-color 0.1s ease-in, background-color 0.5s ease-out';
    overlayEl.style.zIndex = '1000';
    
    document.getElementById('ui').appendChild(overlayEl);
    return overlayEl;
}

// Initialize damage overlay
const damageOverlay = createDamageOverlay();

// Function to handle player damage
function playerTakeDamage(amount, enemyPosition) {
    // Only process damage if it's been at least 500ms since last hit
    const now = performance.now();
    if (now - gameState.lastHitTime < 500) return;
    
    gameState.lastHitTime = now;
    // Increase damage from 1 to 5
    gameState.health -= amount * 5;
    
    // Play hurt sound
    playSound('playerHurt');
    
    // Show damage overlay
    damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
    setTimeout(() => {
        damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
    }, 500);
    
    // Push player away from enemy
    if (enemyPosition) {
        const pushDirection = new THREE.Vector3();
        const playerPosition = new THREE.Vector3();
        camera.getWorldPosition(playerPosition);
        
        // Calculate direction from enemy to player (to push player away)
        pushDirection.subVectors(playerPosition, enemyPosition).normalize();
        
        // Increase push force from 5.0 to 8.0 for more noticeable knockback
        const pushStrength = 8.0;
        velocity.x += pushDirection.x * pushStrength;
        velocity.z += pushDirection.z * pushStrength;
        
        // Add a stronger upward push for a more dramatic "knock-back" effect
        velocity.y += 2.0;
    }
    
    // Update UI
    updateUI();
    
    // Check if player is dead
    checkGameOver();
}

// Create a round notification display
function createRoundNotification() {
    const roundEl = document.createElement('div');
    roundEl.id = 'roundNotification';
    roundEl.style.position = 'absolute';
    roundEl.style.top = '50%';
    roundEl.style.left = '50%';
    roundEl.style.transform = 'translate(-50%, -50%)';
    roundEl.style.fontSize = '48px';
    roundEl.style.fontWeight = 'bold';
    roundEl.style.color = 'white';
    roundEl.style.textShadow = '2px 2px 4px #000000';
    roundEl.style.textAlign = 'center';
    roundEl.style.opacity = '0';
    roundEl.style.transition = 'opacity 0.5s ease-in-out';
    roundEl.style.pointerEvents = 'none';
    roundEl.style.zIndex = '1001';
    
    document.getElementById('ui').appendChild(roundEl);
    return roundEl;
}

// Create a score display
function createScoreDisplay() {
    const scoreEl = document.createElement('div');
    scoreEl.id = 'scoreDisplay';
    scoreEl.style.position = 'absolute';
    scoreEl.style.top = '20px';
    scoreEl.style.left = '50%';
    scoreEl.style.transform = 'translateX(-50%)';
    scoreEl.style.fontSize = '24px';
    scoreEl.style.color = 'white';
    scoreEl.style.textShadow = '1px 1px 2px #000000';
    scoreEl.style.pointerEvents = 'none';
    
    document.getElementById('ui').appendChild(scoreEl);
    return scoreEl;
}

// Initialize UI elements - moved to the top level
let roundNotification;
let scoreDisplay;

// Show wave notification
function showRoundNotification(round) {
    if (!roundNotification || gameState.showingRoundMessage) return;
    
    gameState.showingRoundMessage = true;
    roundNotification.textContent = `WAVE ${round}`;
    roundNotification.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
        roundNotification.style.opacity = '0';
        setTimeout(() => {
            gameState.showingRoundMessage = false;
        }, 500);
    }, 3000);
}

// Initialize the game
function init() {
    if (!checkWebGLSupport()) {
        document.getElementById('webgl-error').style.display = 'block';
        return;
    }
    
    // Initialize UI elements
    roundNotification = createRoundNotification();
    scoreDisplay = createScoreDisplay();
    
    // Update UI after elements are initialized
    updateUI();
    
    // Spawn initial enemies
    spawnEnemies();
    
    // Initialize the game
    animate();
    
    debugLog('Game initialized successfully!');
}

// Initialize the game
init();

// Create a health pickup
function createHealthPickup(position) {
    const healthGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const healthMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const health = new THREE.Mesh(healthGeometry, healthMaterial);
    
    // Position at the enemy's location
    health.position.copy(position);
    health.position.y = 0.5; // Slightly above ground
    
    // Add to scene
    scene.add(health);
    
    return {
        mesh: health,
        type: 'health',
        health: 25, // Each pickup gives 25 health
        timeCreated: performance.now()
    };
}

// Create a bullet pickup from enemy drop
function createBulletDropPickup(position) {
    const bulletGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.5);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Position at the enemy's location
    bullet.position.copy(position);
    bullet.position.y = 0.5; // Slightly above ground
    
    // Add to scene
    scene.add(bullet);
    
    return {
        mesh: bullet,
        type: 'bullets',
        bullets: 5, // Each enemy drop gives 5 bullets
        timeCreated: performance.now()
    };
}