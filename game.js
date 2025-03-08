import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Debug flag - turn this on to help troubleshoot
const DEBUG = true;

// Array to store objects that should have collision detection
const collisionObjects = [];

// Global arrays
const bulletProjectiles = [];
const enemies = [];
const bulletPickups = [];
const machineGunPickups = [];
const pistolPickups = [];
const sniperRiflePickups = [];
const healthPickups = [];
const shotgunPickups = [];
const rocketLauncherPickups = []; // Add rocket launcher pickups array

// Game state
const gameState = {
    health: 100,
    ammo: 10,
    maxAmmo: 10,
    score: 0,
    level: 1,
    gameOver: false,
    isReloading: false,
    isMouseDown: false,
    currentGunType: 'pistol',
    currentRecoil: { x: 0, y: 0 },
    recoilActive: false,
    recoilRecovery: 0,
    cameraOriginalY: null,
    isZoomed: false,
    originalFOV: 75, // Store original FOV for zoom
    lastPickupHintTime: 0, // Track when the last pickup hint was shown
    nearbyPickup: null, // Track the type of nearby pickup
    foundMachineGun: false,
    foundSniperRifle: false,
    foundShotgun: false,
    foundRocketLauncher: false,
    menuOpen: false, // Track if the menu is open
    soundEnabled: true // Track if sound is enabled
};

// DOM elements
const healthEl = document.getElementById('health');
const ammoEl = document.getElementById('ammo');
const bulletsEl = document.getElementById('bullets');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const finalLevelEl = document.getElementById('finalLevel');
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
let weapon;
let machineGun;
let sniperRifle;
let shotgun;
let rocketLauncher; // Add rocket launcher variable

scene.add(camera);

// Add classic Mickey-style environment
createEnvironment();

// Physics settings
const gravity = 9.8;
let prevTime = performance.now();
let lastShootTime = 0; // Track when the last shot was fired

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

// Audio setup
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

// Sound effects
const soundEffects = {
    shoot: new THREE.Audio(audioListener),
    reload: new THREE.Audio(audioListener),
    enemyHit: new THREE.Audio(audioListener),
    enemyDeath: new THREE.Audio(audioListener),
    pickupBullets: new THREE.Audio(audioListener),
    pickupHealth: new THREE.Audio(audioListener), // Add this line for health pickup sound
    playerHurt: new THREE.Audio(audioListener), // New sound for player getting hit
    sniperShoot: new THREE.Audio(audioListener), // New sound for sniper rifle
    explosion: new THREE.Audio(audioListener), // New sound for explosions
    shotgunBlast: new THREE.Audio(audioListener), // New sound for shotgun
    rocketLaunch: new THREE.Audio(audioListener) // New sound for rocket launcher
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
    
    audioLoader.load('https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3', function(buffer) {
        soundEffects.enemyHit.setBuffer(buffer);
        soundEffects.enemyHit.setVolume(0.5);
    });
    
    audioLoader.load('https://assets.mixkit.co/active_storage/sfx/561/561-preview.mp3', function(buffer) {
        soundEffects.enemyDeath.setBuffer(buffer);
        soundEffects.enemyDeath.setVolume(0.5);
    });
    
    audioLoader.load('https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3', function(buffer) {
        soundEffects.pickupHealth.setBuffer(buffer);
        soundEffects.pickupHealth.setVolume(0.5);
    });
    
    // Player hurt sound - cartoon grunt/yelp
    audioLoader.load('https://assets.mixkit.co/active_storage/sfx/1143/1143-preview.mp3', function(buffer) {
        soundEffects.playerHurt.setBuffer(buffer);
        soundEffects.playerHurt.setVolume(0.7);
    });
    
    // Sniper rifle sound effect
    audioLoader.load('https://assets.mixkit.co/active_storage/sfx/1144/1144-preview.mp3', function(buffer) {
        soundEffects.sniperShoot.setBuffer(buffer);
        soundEffects.sniperShoot.setVolume(0.5);
    });
    
    // Shotgun blast sound effect
    audioLoader.load('https://cdn.freesound.org/previews/573/573269_4056087-lq.mp3', function(buffer) {
        soundEffects.shotgunBlast.setBuffer(buffer);
        soundEffects.shotgunBlast.setVolume(0.6);
    });
    
    // Rocket launch sound effect
    audioLoader.load('https://cdn.freesound.org/previews/574/574269_4056087-lq.mp3', function(buffer) {
        soundEffects.rocketLaunch.setBuffer(buffer);
        soundEffects.rocketLaunch.setVolume(0.5);
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
    // Only handle left mouse button and when menu is not open
    if (event.button === 0 && !gameState.menuOpen) {
        if (controls.isLocked) {
            gameState.isMouseDown = true;
            shoot();
        } else {
            controls.lock();
        }
    }
});

document.addEventListener('mouseup', (event) => {
    // Only handle left mouse button
    if (event.button === 0) {
        gameState.isMouseDown = false;
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
    if (gameState.gameOver) return;
    
    // Always allow ESC key to toggle menu
    if (event.code === 'Escape') {
        toggleMenu();
        return;
    }
    
    // Skip other keys if menu is open
    if (gameState.menuOpen) return;
    
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
                velocity.y = 5.0; // Jump velocity
                canJump = false;
            }
            break;
        case 'KeyR':
            reload();
            break;
        case 'KeyE':
            interactWithPickups();
            break;
        case 'Digit1':
            // Switch to pistol if available
            switchToWeapon('pistol');
            break;
        case 'Digit2':
            // Switch to machine gun if available
            switchToWeapon('machineGun');
            break;
        case 'Digit3':
            // Switch to sniper rifle if available
            switchToWeapon('sniperRifle');
            break;
        case 'Digit4':
            // Switch to shotgun if available
            switchToWeapon('shotgun');
            break;
        case 'Digit5':
            // Switch to rocket launcher if available
            switchToWeapon('rocketLauncher');
            break;
    }
});

document.addEventListener('keyup', (event) => {
    // Skip if menu is open
    if (gameState.menuOpen) return;
    
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

// Also add mousedown event for right-click to ensure it works across all browsers
document.addEventListener('mousedown', (event) => {
    // Check for right mouse button (button 2 in most browsers, sometimes button 1)
    if (event.button === 2 || event.button === 1) {
        debugLog(`Right mouse button clicked (button: ${event.button})`);
        event.preventDefault();
        if (controls.isLocked && !gameState.gameOver) {
            debugLog('Controls locked');
            // Toggle zoom if using sniper rifle
            if (gameState.currentGunType === 'sniperRifle') {
                toggleZoom();
            }
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

// Create machine gun weapon
function createMachineGun() {
    debugLog('Creating machine gun');
    // Create a cartoon-style machine gun
    const weaponGroup = new THREE.Group();
    
    // Gun body (larger than regular gun)
    const gunGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.4);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 }); // Darker color
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    
    // Barrel (longer than regular gun)
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8);
    const barrel = new THREE.Mesh(barrelGeometry, gunMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.3;
    
    // Add magazine
    const magazineGeometry = new THREE.BoxGeometry(0.08, 0.2, 0.1);
    const magazineMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const magazine = new THREE.Mesh(magazineGeometry, magazineMaterial);
    magazine.position.y = -0.15;
    
    // Add handle
    const handleGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.1);
    const handle = new THREE.Mesh(handleGeometry, magazineMaterial);
    handle.position.y = -0.1;
    handle.position.z = 0.1;
    handle.rotation.x = 0.3;
    
    weaponGroup.add(gun);
    weaponGroup.add(barrel);
    weaponGroup.add(magazine);
    weaponGroup.add(handle);
    
    // Position the weapon
    weaponGroup.position.set(0.3, -0.3, -0.5);
    weaponGroup.visible = false; // Hide initially
    
    return weaponGroup;
}

// Create a sniper rifle weapon
function createSniperRifle() {
    debugLog('Creating sniper rifle');
    // Create a cartoon-style sniper rifle
    const weaponGroup = new THREE.Group();
    
    // Gun body (longer than machine gun)
    const gunGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.7);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 }); // Dark gray color
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    
    // Barrel (longer than machine gun)
    const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8);
    const barrel = new THREE.Mesh(barrelGeometry, gunMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.4;
    
    // Add scope
    const scopeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8);
    const scopeMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const scope = new THREE.Mesh(scopeGeometry, scopeMaterial);
    scope.rotation.x = Math.PI / 2;
    scope.position.y = 0.1;
    scope.position.z = -0.1;
    
    // Add scope lens
    const lensGeometry = new THREE.CircleGeometry(0.03, 16);
    const lensMaterial = new THREE.MeshBasicMaterial({ color: 0x88ccff });
    const lens = new THREE.Mesh(lensGeometry, lensMaterial);
    lens.position.z = 0.1;
    lens.rotation.y = Math.PI;
    scope.add(lens);
    
    // Add handle
    const handleGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.1);
    const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.1;
    handle.position.z = 0.1;
    handle.rotation.x = 0.3;
    
    // Add stock
    const stockGeometry = new THREE.BoxGeometry(0.06, 0.1, 0.3);
    const stock = new THREE.Mesh(stockGeometry, handleMaterial);
    stock.position.z = 0.3;
    
    weaponGroup.add(gun);
    weaponGroup.add(barrel);
    weaponGroup.add(scope);
    weaponGroup.add(handle);
    weaponGroup.add(stock);
    
    // Position the weapon
    weaponGroup.position.set(0.3, -0.3, -0.5);
    weaponGroup.visible = false; // Hide initially
    
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
    
    // Map dimensions - 4x larger than before
    const mapWidth = 100; // Was 50
    const mapDepth = 100; // Was 50
    
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(mapWidth, mapDepth, 10, 10);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
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
}

// Create boundary walls around the map
function createBoundaryWalls(mapWidth, mapDepth) {
    const wallHeight = 10;
    const wallThickness = 1;
    const wallColor = 0x888888;
    const wallMaterial = new THREE.MeshBasicMaterial({ color: wallColor });
    
    // North wall
    const northWallGeometry = new THREE.BoxGeometry(mapWidth + wallThickness*2, wallHeight, wallThickness);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
    northWall.position.set(0, wallHeight/2, -mapDepth/2 - wallThickness/2);
    scene.add(northWall);
    collisionObjects.push(northWall);
    
    // South wall
    const southWallGeometry = new THREE.BoxGeometry(mapWidth + wallThickness*2, wallHeight, wallThickness);
    const southWall = new THREE.Mesh(southWallGeometry, wallMaterial);
    southWall.position.set(0, wallHeight/2, mapDepth/2 + wallThickness/2);
    scene.add(southWall);
    collisionObjects.push(southWall);
    
    // East wall
    const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, mapDepth + wallThickness*2);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(mapWidth/2 + wallThickness/2, wallHeight/2, 0);
    scene.add(eastWall);
    collisionObjects.push(eastWall);
    
    // West wall
    const westWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, mapDepth + wallThickness*2);
    const westWall = new THREE.Mesh(westWallGeometry, wallMaterial);
    westWall.position.set(-mapWidth/2 - wallThickness/2, wallHeight/2, 0);
    scene.add(westWall);
    collisionObjects.push(westWall);
    
    debugLog('Created boundary walls');
}

function spawnEnemies() {
    debugLog('Spawning enemies');
    
    // Only show wave notification if it exists
    if (roundNotification) {
        showRoundNotification(gameState.level);
    }
    
    // Calculate number of enemies based on wave level
    // Start with 10 enemies on wave 1, then add 5 more for each wave
    const enemyCount = 10 + ((gameState.level - 1) * 5);
    
    // Calculate number of spider enemies (only appear after wave 1)
    // Start with 0 spiders in wave 1, then 2 in wave 2, and increase by 3 each wave
    const spiderCount = gameState.level > 1 ? 2 + (gameState.level - 2) * 3 : 0;
    
    // Calculate number of flying enemies (only appear after wave 2)
    // Start with 0 flyers in waves 1-2, then 1 in wave 3, and increase by 2 each wave
    const flyingCount = gameState.level > 2 ? 1 + (gameState.level - 3) * 2 : 0;
    
    // Calculate regular enemy count (total minus special types)
    const regularEnemyCount = enemyCount - spiderCount - flyingCount;
    
    debugLog(`Spawning ${regularEnemyCount} regular enemies, ${spiderCount} spider enemies, and ${flyingCount} flying enemies`);
    
    // Spawn regular enemies
    for (let i = 0; i < regularEnemyCount; i++) {
        spawnEnemy('regular');
    }
    
    // Spawn spider enemies (after wave 1)
    for (let i = 0; i < spiderCount; i++) {
        spawnEnemy('spider');
    }
    
    // Spawn flying enemies (after wave 2)
    for (let i = 0; i < flyingCount; i++) {
        spawnEnemy('flying');
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

// Function to shoot
function shoot() {
    // Check if we're reloading or menu is open
    if (gameState.isReloading || gameState.menuOpen) return;
    
    // Check if we have ammo for the current weapon
    if (gameState.ammo <= 0) {
        // Auto reload if out of ammo and player is still trying to shoot
        if (gameState.isMouseDown) {
            reload();
        }
        return;
    }
    
    // Update last shoot time
    lastShootTime = performance.now();
    
    // Decrease ammo
    gameState.ammo--;
    
    updateUI();
    
    // Play shoot sound
    if (gameState.currentGunType === 'sniperRifle') {
        playSound('sniperShoot');
    } else if (gameState.currentGunType === 'shotgun') {
        playSound('shotgunBlast');
    } else if (gameState.currentGunType === 'rocketLauncher') {
        playSound('rocketLaunch');
    } else {
        playSound('shoot');
    }
    
    // Apply recoil effect
    applyRecoil();
    
    // Get bullet starting position
    let bulletStartPosition;
    
    // When zoomed in with sniper rifle, bullet comes from center of screen
    if (gameState.currentGunType === 'sniperRifle' && gameState.isZoomed) {
        // Get camera position and direction
        bulletStartPosition = new THREE.Vector3();
        camera.getWorldPosition(bulletStartPosition);
        
        // Move bullet starting position slightly forward from camera
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.multiplyScalar(0.5); // Move 0.5 units forward
        bulletStartPosition.add(forward);
    } else {
        // Normal gun barrel position for non-zoomed weapons
        bulletStartPosition = new THREE.Vector3(0, 0, -0.5);
        if (gameState.currentGunType === 'pistol') {
            weapon.localToWorld(bulletStartPosition);
        } else if (gameState.currentGunType === 'machineGun') {
            machineGun.localToWorld(bulletStartPosition);
        } else if (gameState.currentGunType === 'sniperRifle') {
            sniperRifle.localToWorld(bulletStartPosition);
        } else if (gameState.currentGunType === 'shotgun') {
            shotgun.localToWorld(bulletStartPosition);
        } else if (gameState.currentGunType === 'rocketLauncher') {
            rocketLauncher.localToWorld(bulletStartPosition);
        }
    }
    
    // Get shooting direction from camera
    const shootDirection = new THREE.Vector3(0, 0, -1);
    shootDirection.applyQuaternion(camera.quaternion);
    
    // Apply recoil effect to bullet trajectory
    if (gameState.currentRecoil) {
        // Add recoil-based spread to the bullet direction
        // Sniper rifle has much less spread when zoomed in
        const spreadFactor = (gameState.currentGunType === 'sniperRifle' && gameState.isZoomed) ? 0.1 : 1.0;
        shootDirection.x += gameState.currentRecoil.x * spreadFactor;
        shootDirection.y += gameState.currentRecoil.y * spreadFactor;
        
        // Normalize to maintain consistent bullet speed
        shootDirection.normalize();
    }
    
    // Create projectile based on weapon type
    let projectile;

    if (gameState.currentGunType === 'shotgun') {
        // Shotgun fires multiple pellets in a spread pattern
        const pelletCount = 8; // Number of pellets per shot
        
        // Create muzzle flash
        createMuzzleFlash(bulletStartPosition);
        
        // Create multiple pellets with spread
        for (let i = 0; i < pelletCount; i++) {
            // Create a slightly randomized direction for each pellet
            const spreadDirection = shootDirection.clone();
            
            // Add random spread (more horizontal than vertical)
            spreadDirection.x += (Math.random() - 0.5) * 0.1;
            spreadDirection.y += (Math.random() - 0.5) * 0.05;
            spreadDirection.z += (Math.random() - 0.5) * 0.02;
            
            // Normalize to maintain consistent speed
            spreadDirection.normalize();
            
            // Create pellet projectile
            const pellet = createBulletProjectile(bulletStartPosition, spreadDirection);
            
            // Pellets do less damage individually but combined they do more
            pellet.damage = 25; // Each pellet does 25 damage, potentially 200 total at point blank
            pellet.isShotgunPellet = true; // Mark as shotgun pellet
            
            // Pellets have shorter range
            pellet.maxDistance = 20;
            
            // Add to projectiles array
            bulletProjectiles.push(pellet);
        }
        
        // No need to add a projectile at the end since we've already added all pellets
        return;
    } else if (gameState.currentGunType === 'rocketLauncher') {
        // Create rocket projectile
        projectile = createRocketProjectile(bulletStartPosition, shootDirection);
        
        // Create muzzle flash
        createMuzzleFlash(bulletStartPosition);
        
        // Add to projectiles array
        bulletProjectiles.push(projectile);
        return;
    } else {
        // Create bullet projectile
        projectile = createBulletProjectile(bulletStartPosition, shootDirection);
        
        // Set bullet damage based on weapon type
        if (gameState.currentGunType === 'machineGun') {
            projectile.damage = 30; // Machine gun does less damage per bullet
        } else if (gameState.currentGunType === 'sniperRifle') {
            projectile.damage = 200; // Sniper rifle does massive damage
            projectile.speed = 30; // Faster bullet
            
            // Create a tracer effect for sniper rifle
            const tracerGeometry = new THREE.CylinderGeometry(0.01, 0.01, 100, 8);
            const tracerMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                transparent: true,
                opacity: 0.3
            });
            const tracer = new THREE.Mesh(tracerGeometry, tracerMaterial);
            tracer.rotation.x = Math.PI / 2;
            tracer.position.z = -50; // Position behind the bullet
            projectile.mesh.add(tracer);
            
            // Flash effect
            createMuzzleFlash(bulletStartPosition);
        }
    }

    bulletProjectiles.push(projectile);
}

// Create muzzle flash effect
function createMuzzleFlash(position) {
    const flashGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    
    // If zoomed with sniper, make flash smaller and more transparent
    if (gameState.currentGunType === 'sniperRifle' && gameState.isZoomed) {
        flash.scale.set(0.5, 0.5, 0.5);
        flashMaterial.opacity = 0.4;
    }
    
    flash.position.copy(position);
    scene.add(flash);
    
    // Animate the flash
    let scale = 1.0;
    const animateFlash = () => {
        scale -= 0.1;
        if (scale <= 0) {
            scene.remove(flash);
            return;
        }
        
        // If not zoomed, normal animation
        if (!(gameState.currentGunType === 'sniperRifle' && gameState.isZoomed)) {
            flash.scale.set(scale, scale, scale);
            flash.material.opacity = scale * 0.8;
        } else {
            // If zoomed, smaller and more subtle animation
            flash.scale.set(scale * 0.5, scale * 0.5, scale * 0.5);
            flash.material.opacity = scale * 0.4;
        }
        
        requestAnimationFrame(animateFlash);
    };
    
    animateFlash();
}

// Apply recoil effect to the weapon and camera
function applyRecoil() {
    // Set recoil as active
    gameState.recoilActive = true;
    gameState.recoilRecovery = 0;
    
    // Visual recoil on the weapon - different for each weapon type
    if (gameState.currentGunType === 'pistol') {
        weapon.position.z += 0.15;
        weapon.position.y += 0.05;
        weapon.rotation.x -= 0.2; // Rotate up
    } else if (gameState.currentGunType === 'machineGun') {
        machineGun.position.z += 0.15;
        machineGun.position.y += 0.05;
        machineGun.rotation.x -= 0.2;
    } else if (gameState.currentGunType === 'sniperRifle') {
        // Sniper rifle has more recoil
        sniperRifle.position.z += 0.3;
        sniperRifle.position.y += 0.1;
        sniperRifle.rotation.x -= 0.4;
    } else if (gameState.currentGunType === 'shotgun') {
        // Shotgun has strong recoil
        shotgun.position.z += 0.25;
        shotgun.position.y += 0.1;
        shotgun.rotation.x -= 0.3;
    }
    
    // Add vertical camera movement for effect (without rotation)
    // Store the original camera position to recover from
    if (!gameState.cameraOriginalY) {
        gameState.cameraOriginalY = camera.position.y;
    }
    
    // Move camera up slightly - different amounts based on weapon
    let cameraRecoil = 0.05; // Default
    
    if (gameState.currentGunType === 'sniperRifle') {
        cameraRecoil = 0.1;
    } else if (gameState.currentGunType === 'shotgun') {
        cameraRecoil = 0.12;
    }
    
    camera.position.y += cameraRecoil;
    
    // Store recoil amount for bullet trajectory
    let recoilX = (Math.random() - 0.5) * 0.05; // Default
    let recoilY = 0.05; // Default
    
    if (gameState.currentGunType === 'sniperRifle') {
        recoilX = (Math.random() - 0.5) * 0.08;
        recoilY = 0.08;
    } else if (gameState.currentGunType === 'shotgun') {
        // Shotgun has more horizontal spread in recoil
        recoilX = (Math.random() - 0.5) * 0.12;
        recoilY = 0.07;
    }
    
    gameState.currentRecoil = {
        x: recoilX,
        y: recoilY
    };
}

// Process recoil recovery in the animation loop
function processRecoilRecovery(delta) {
    if (!gameState.recoilActive) return;
    
    // Increase recovery progress
    gameState.recoilRecovery += delta * 2; // Recover over 0.5 seconds
    
    // Calculate recovery factor (0 to 1)
    const recovery = Math.min(gameState.recoilRecovery, 1);
    
    // Smoothly interpolate weapon back to original position
    if (gameState.currentGunType === 'pistol') {
        if (weapon.position.z > 0.3) {
            weapon.position.z = 0.3 + (0.15 * (1 - recovery));
        }
        
        if (weapon.position.y > -0.3) {
            weapon.position.y = -0.3 + (0.05 * (1 - recovery));
        }
        
        if (weapon.rotation.x < 0) {
            weapon.rotation.x = -0.2 * (1 - recovery);
        }
    } else if (gameState.currentGunType === 'machineGun') {
        if (machineGun.position.z > 0.3) {
            machineGun.position.z = 0.3 + (0.15 * (1 - recovery));
        }
        
        if (machineGun.position.y > -0.3) {
            machineGun.position.y = -0.3 + (0.05 * (1 - recovery));
        }
        
        if (machineGun.rotation.x < 0) {
            machineGun.rotation.x = -0.2 * (1 - recovery);
        }
    } else if (gameState.currentGunType === 'sniperRifle') {
        if (sniperRifle.position.z > 0.3) {
            sniperRifle.position.z = 0.3 + (0.3 * (1 - recovery));
        }
        
        if (sniperRifle.position.y > -0.3) {
            sniperRifle.position.y = -0.3 + (0.1 * (1 - recovery));
        }
        
        if (sniperRifle.rotation.x < 0) {
            sniperRifle.rotation.x = -0.4 * (1 - recovery);
        }
    } else if (gameState.currentGunType === 'shotgun') {
        if (shotgun.position.z > 0.3) {
            shotgun.position.z = 0.3 + (0.25 * (1 - recovery));
        }
        
        if (shotgun.position.y > -0.3) {
            shotgun.position.y = -0.3 + (0.1 * (1 - recovery));
        }
        
        if (shotgun.rotation.x < 0) {
            shotgun.rotation.x = -0.3 * (1 - recovery);
        }
    }
    
    // Recover camera position
    if (gameState.cameraOriginalY && camera.position.y > gameState.cameraOriginalY) {
        let cameraRecoil = 0.05; // Default
        
        if (gameState.currentGunType === 'sniperRifle') {
            cameraRecoil = 0.1;
        } else if (gameState.currentGunType === 'shotgun') {
            cameraRecoil = 0.12;
        }
        
        camera.position.y = gameState.cameraOriginalY + (cameraRecoil * (1 - recovery));
    }
    
    // Gradually reduce recoil effect on bullets
    if (gameState.currentRecoil) {
        gameState.currentRecoil.x *= (1 - recovery);
        gameState.currentRecoil.y *= (1 - recovery);
    }
    
    // If recovery complete, reset recoil state
    if (recovery >= 1) {
        gameState.recoilActive = false;
        
        // Ensure weapon is back to exact original position
        weapon.position.set(0.3, -0.3, -0.5);
        weapon.rotation.set(0, 0, 0);
        
        // Reset machine gun position too
        machineGun.position.set(0.3, -0.3, -0.5);
        machineGun.rotation.set(0, 0, 0);
        
        // Reset sniper rifle position
        sniperRifle.position.set(0.3, -0.3, -0.5);
        sniperRifle.rotation.set(0, 0, 0);
        
        // Reset shotgun position
        shotgun.position.set(0.3, -0.3, -0.5);
        shotgun.rotation.set(0, 0, 0);
        
        // Reset camera position
        if (gameState.cameraOriginalY) {
            camera.position.y = gameState.cameraOriginalY;
        }
        
        // Reset recoil effect on bullets
        gameState.currentRecoil = { x: 0, y: 0 };
    }
}

// Function to update UI
function updateUI() {
    healthEl.textContent = `❤️ ${gameState.health}`;
    
    // Show ammo and reload status
    if (gameState.isReloading) {
        ammoEl.textContent = `🔄 Reloading...`;
    } else {
        ammoEl.textContent = `🔫 ${gameState.ammo}/${gameState.maxAmmo}`;
    }
    
    // Hide bullets counter since we have unlimited ammo
    bulletsEl.style.display = 'none';
    
    // Update score display
    if (scoreDisplay) {
        scoreDisplay.textContent = `Score: ${gameState.score}`;
    }
    
    // If menu is open, update menu stats
    if (gameState.menuOpen) {
        updateMenuStats();
    }
}

// Function to interact with pickups
function interactWithPickups() {
    if (gameState.gameOver) return;
    
    const playerPosition = new THREE.Vector3();
    camera.getWorldPosition(playerPosition);
    
    // Helper function to handle weapon pickup
    function handleWeaponPickup(pickupArray, pickupType, ammoAmount, pickupName) {
        for (let i = pickupArray.length - 1; i >= 0; i--) {
            const pickup = pickupArray[i];
            const distance = playerPosition.distanceTo(pickup.mesh.position);
            
            if (distance < 2) { // Interaction range
                // Drop current gun and create a pickup for it
                const dropPosition = playerPosition.clone();
                dropPosition.y = 0.5; // Slightly above ground
                
                // Create pickup for current weapon
                if (gameState.currentGunType === 'pistol') {
                    pistolPickups.push(createPistolPickup(dropPosition));
                } else if (gameState.currentGunType === 'machineGun') {
                    machineGunPickups.push(createMachineGunPickup(dropPosition));
                } else if (gameState.currentGunType === 'sniperRifle') {
                    sniperRiflePickups.push(createSniperRiflePickup(dropPosition));
                } else if (gameState.currentGunType === 'shotgun') {
                    shotgunPickups.push(createShotgunPickup(dropPosition));
                } else if (gameState.currentGunType === 'rocketLauncher') {
                    rocketLauncherPickups.push(createRocketLauncherPickup(dropPosition));
                }
                
                // Pick up new weapon
                gameState.currentGunType = pickupType;
                gameState.ammo = gameState.maxAmmo = ammoAmount;
                
                // Update weapon visibility
                weapon.visible = pickupType === 'pistol';
                machineGun.visible = pickupType === 'machineGun';
                sniperRifle.visible = pickupType === 'sniperRifle';
                shotgun.visible = pickupType === 'shotgun';
                rocketLauncher.visible = pickupType === 'rocketLauncher';
                
                // Reset zoom if coming from sniper rifle
                if (gameState.isZoomed) {
                    toggleZoom();
                }
                
                // Mark pickup as inactive before removing it
                pickup.isActive = false;
                
                // Remove pickup
                scene.remove(pickup.mesh);
                pickupArray.splice(i, 1);
                
                // Play pickup sound
                playSound('pickupHealth');
                
                // Show notification
                showNotification(`${pickupName} acquired!`);
                
                updateUI();
                return true; // Indicate pickup was successful
            }
        }
        return false; // No pickup occurred
    }
    
    // Check all weapon pickups in order of priority
    if (handleWeaponPickup(machineGunPickups, 'machineGun', 30, 'Machine Gun')) return;
    if (handleWeaponPickup(sniperRiflePickups, 'sniperRifle', 5, 'Sniper Rifle')) return;
    if (handleWeaponPickup(shotgunPickups, 'shotgun', 8, 'Shotgun')) return;
    if (handleWeaponPickup(rocketLauncherPickups, 'rocketLauncher', 5, 'Rocket Launcher')) return;
    if (handleWeaponPickup(pistolPickups, 'pistol', 10, 'Pistol')) return;
}

// Function to restart game
function restartGame() {
    // Reset game state
    gameState.health = 100;
    gameState.ammo = 10;
    gameState.maxAmmo = 10;
    gameState.score = 0;
    gameState.level = 1;
    gameState.gameOver = false;
    gameState.isReloading = false;
    gameState.isMouseDown = false;
    gameState.currentGunType = 'pistol';
    gameState.currentRecoil = { x: 0, y: 0 };
    gameState.recoilActive = false;
    gameState.recoilRecovery = 0;
    gameState.cameraOriginalY = null;
    gameState.isZoomed = false;
    gameState.originalFOV = 75; // Reset original FOV
    gameState.lastPickupHintTime = 0; // Reset when the last pickup hint was shown
    gameState.nearbyPickup = null; // Reset the type of nearby pickup
    gameState.foundMachineGun = false;
    gameState.foundSniperRifle = false;
    gameState.foundShotgun = false;
    gameState.foundRocketLauncher = false;
    gameState.menuOpen = false; // Reset menu state
    
    // Hide menu if it's open
    document.getElementById('menuScreen').style.display = 'none';
    
    // Reset camera position
    camera.position.set(0, 1.6, 0);
    camera.rotation.set(0, 0, 0);
    
    // Reset velocity
    velocity.set(0, 0, 0);
    
    // Reset weapon visibility
    weapon.visible = true;
    machineGun.visible = false;
    sniperRifle.visible = false;
    shotgun.visible = false;
    rocketLauncher.visible = false;
    
    // Reset enemy arrays
    for (const enemy of enemies) {
        scene.remove(enemy.mesh);
    }
    enemies.length = 0;
    
    // Reset bullet projectiles
    for (const bullet of bulletProjectiles) {
        scene.remove(bullet.mesh);
    }
    bulletProjectiles.length = 0;
    
    // Remove all health pickups
    for (const pickup of healthPickups) {
        pickup.isActive = false; // Mark as inactive to stop animations
        scene.remove(pickup.mesh);
    }
    healthPickups.length = 0;
    
    // Remove all bullet pickups
    for (const pickup of bulletPickups) {
        pickup.isActive = false; // Mark as inactive to stop animations
        scene.remove(pickup.mesh);
    }
    bulletPickups.length = 0;
    
    // Remove all machine gun pickups
    for (const pickup of machineGunPickups) {
        pickup.isActive = false; // Mark as inactive to stop animations
        scene.remove(pickup.mesh);
    }
    
    machineGunPickups.length = 0;
    
    // Remove all pistol pickups
    for (const pickup of pistolPickups) {
        pickup.isActive = false; // Mark as inactive to stop animations
        scene.remove(pickup.mesh);
    }
    pistolPickups.length = 0;
    
    // Remove all sniper rifle pickups
    for (const pickup of sniperRiflePickups) {
        pickup.isActive = false; // Mark as inactive to stop animations
        scene.remove(pickup.mesh);
    }
    sniperRiflePickups.length = 0;
    
    // Spawn new enemies and pickups
    spawnEnemies();
    
    // Update UI
    updateUI();
    gameOverEl.style.display = 'none';
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

// Reload function
function reload() {
    if (gameState.ammo === gameState.maxAmmo || gameState.isReloading) return;
    
    // Set reloading state
    gameState.isReloading = true;
    
    // Animation for reloading
    if (gameState.currentGunType === 'pistol') {
        weapon.rotation.x = 0.5;
        setTimeout(() => {
            weapon.rotation.x = 0;
        }, 300);
    } else {
        machineGun.rotation.x = 0.5;
        setTimeout(() => {
            machineGun.rotation.x = 0;
        }, 300);
    }
    
    // Play reload sound
    playSound('reload');
    
    // Reload time depends on gun type
    const reloadTime = gameState.currentGunType === 'pistol' ? 1000 : 2000;
    
    // After reload time, refill ammo
    setTimeout(() => {
        gameState.ammo = gameState.maxAmmo;
        gameState.isReloading = false;
        updateUI();
    }, reloadTime);
    
    updateUI();
}

// Toggle inventory display
function toggleInventory() {
    // This function has been removed as inventory is now part of the menu
}

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
    
    // Create weapons
    weapon = createWeapon();
    machineGun = createMachineGun();
    sniperRifle = createSniperRifle();
    shotgun = createShotgun();
    rocketLauncher = createRocketLauncher();
    camera.add(weapon);
    camera.add(machineGun);
    camera.add(sniperRifle);
    camera.add(shotgun);
    camera.add(rocketLauncher);
    
    // Set up menu button event listeners
    document.getElementById('resumeButton').addEventListener('click', toggleMenu);
    document.getElementById('restartMenuButton').addEventListener('click', () => {
        toggleMenu(); // Close menu
        restartGame(); // Restart game
    });
    
    // Update UI after elements are initialized
    updateUI();
    
    // Spawn initial enemies
    spawnEnemies();
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
    
    // Create pickup object
    const pickup = {
        mesh: health,
        type: 'health',
        health: 25, // Each pickup gives 25 health
        timeCreated: performance.now(),
        isActive: true // Flag to track if pickup is still active
    };
    
    // Add floating animation
    const floatAnimation = () => {
        if (!pickup.isActive) return; // Stop animation if pickup is no longer active
        
        health.position.y = 0.5 + Math.sin(performance.now() * 0.002) * 0.1;
        health.rotation.y += 0.01;
        
        requestAnimationFrame(floatAnimation);
    };
    
    // Start the animation
    floatAnimation();
    
    return pickup;
}

// Create a bullet projectile
function createBulletProjectile(position, direction) {
    // Create bullet geometry and material
    const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 }); // Bright yellow bullet
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Set initial position (at gun barrel)
    bullet.position.copy(position);
    
    // Add to scene
    scene.add(bullet);
    
    // Add trail effect
    const trailGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFFF00,
        transparent: true,
        opacity: 0.7
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.rotation.x = Math.PI / 2;
    trail.position.z = 0.1; // Position behind the bullet
    bullet.add(trail);
    
    // Return bullet object with metadata
    return {
        mesh: bullet,
        direction: direction.clone(),
        speed: 20, // Units per second
        distance: 0,
        maxDistance: 100, // Maximum travel distance
        damage: 50,
        timeCreated: performance.now()
    };
}

// Update bullet projectiles
function updateBulletProjectiles(delta) {
    // Update each bullet
    for (let i = bulletProjectiles.length - 1; i >= 0; i--) {
        const bullet = bulletProjectiles[i];
        const bulletPosition = bullet.mesh.position;
        
        // Move bullet forward
        const moveDistance = bullet.speed * delta;
        bullet.distance += moveDistance;
        bulletPosition.add(bullet.direction.clone().multiplyScalar(moveDistance));
        
        // Flag to track if bullet hit an enemy
        let hitEnemy = false;
        
        // Check for collisions with enemies
        for (let j = 0; j < enemies.length; j++) {
            const enemy = enemies[j];
            const distance = bulletPosition.distanceTo(enemy.mesh.position);
            
            // If bullet hits enemy (using a simple distance check)
            if (distance < 0.8) { // Enemy hit radius
                hitEnemy = true;
                
                // Special handling for rockets - create explosion and don't continue with normal hit logic
                if (bullet.isRocket) {
                    // Create explosion at impact point
                    createExplosion(bulletPosition.clone());
                    
                    // Remove rocket
                    scene.remove(bullet.mesh);
                    bulletProjectiles.splice(i, 1);
                    break;
                }
                
                // Damage enemy
                enemy.health -= bullet.damage;
                
                // Play enemy hit sound
                playSound('enemyHit');
                
                // Visual feedback for hit
                enemy.mesh.children.forEach(part => {
                    if (part.material) {
                        part.material.color.set(0xff0000);
                        setTimeout(() => {
                            if (part.material) {
                                part.material.color.set(0x000000);
                            }
                        }, 100);
                    }
                });
                
                // Check if enemy is defeated
                if (enemy.health <= 0) {
                    // Store enemy position
                    const enemyPosition = enemy.mesh.position.clone();
                    
                    // Remove from array (must be done before handleEnemyDefeat)
                    enemies.splice(j, 1);
                    j--; // Adjust index after removal
                    
                    // Handle enemy defeat
                    handleEnemyDefeat(enemy, enemyPosition);
                }
                
                // Remove bullet after hitting enemy
                scene.remove(bullet.mesh);
                bulletProjectiles.splice(i, 1);
                break;
            }
        }
        
        // Skip further checks if bullet already hit an enemy
        if (hitEnemy) continue;
        
        // Check for collisions with environment
        const raycaster = new THREE.Raycaster(
            bulletPosition.clone().sub(bullet.direction.clone().multiplyScalar(0.1)), // Start slightly behind current position
            bullet.direction.clone(),
            0,
            bullet.isRocket ? 0.5 : 0.2 // Check further ahead for rockets
        );
        
        const intersects = raycaster.intersectObjects(collisionObjects);
        
        // Check if bullet hit the ground (y position near 0)
        const hitGround = bulletPosition.y <= 0.1;
        
        if (intersects.length > 0 || hitGround) {
            // Bullet hit environment or ground
            
            // Special handling for rockets - create explosion
            if (bullet.isRocket) {
                // Get the exact impact point
                const impactPoint = intersects.length > 0 ? 
                    intersects[0].point.clone() : 
                    bulletPosition.clone().setY(0); // Set to ground level if hitting ground
                
                createExplosion(impactPoint);
                playSound('explosion');
            } else {
                // Create impact effect for regular bullets
                createBulletImpact(bulletPosition, bullet.direction);
            }
            
            // Remove bullet
            scene.remove(bullet.mesh);
            bulletProjectiles.splice(i, 1);
            continue;
        }
        
        // Remove bullet if it's traveled too far or existed too long (5 seconds)
        if (bullet.distance > bullet.maxDistance || performance.now() - bullet.timeCreated > 5000) {
            scene.remove(bullet.mesh);
            bulletProjectiles.splice(i, 1);
        }
    }
}

// Create bullet impact effect
function createBulletImpact(position, direction) {
    // Create impact particles
    const particleCount = 5;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.02, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.8
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position at impact point
        particle.position.copy(position);
        
        // Random direction away from impact
        const particleDir = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );
        particleDir.normalize();
        
        // Add to scene
        scene.add(particle);
        
        particles.push({
            mesh: particle,
            direction: particleDir,
            speed: Math.random() * 2 + 1,
            timeCreated: performance.now()
        });
    }
    
    // Remove particles after a short time
    setTimeout(() => {
        particles.forEach(particle => {
            scene.remove(particle.mesh);
        });
    }, 300);
}

// Create a spider enemy (faster enemy type)
function createSpiderEnemy() {
    // Create a spider-like enemy group
    const enemyGroup = new THREE.Group();
    
    // Body - smaller and darker than regular enemies
    const bodyGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 }); // Darker color
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Head - small bump on top
    const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.3;
    head.position.z = 0.2;
    
    // Eyes - red glowing eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.35, 0.35);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.35, 0.35);
    
    // Legs - 8 spider legs
    const legGeometry = new THREE.CylinderGeometry(0.03, 0.01, 0.5, 8);
    const legMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    
    // Create 8 legs in a circular pattern
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const legPivot = new THREE.Group();
        
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.rotation.x = Math.PI / 2;
        leg.position.y = -0.25; // Position at bottom of leg
        
        legPivot.add(leg);
        legPivot.position.set(
            Math.sin(angle) * 0.3, // X position
            -0.1,                  // Y position (slightly below body)
            Math.cos(angle) * 0.3  // Z position
        );
        
        // Rotate leg outward
        legPivot.rotation.y = angle;
        legPivot.rotation.x = Math.PI / 4; // Angle legs downward
        
        enemyGroup.add(legPivot);
    }
    
    enemyGroup.add(body);
    enemyGroup.add(head);
    enemyGroup.add(leftEye);
    enemyGroup.add(rightEye);
    
    return enemyGroup;
}

// Create a flying enemy (ghost/bird type)
function createFlyingEnemy() {
    // Create a flying ghost/bird enemy group
    const enemyGroup = new THREE.Group();
    
    // Body - ghost-like shape
    const bodyGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    // Stretch the bottom to create a ghost-like tail
    for (let i = 0; i < bodyGeometry.attributes.position.count; i++) {
        const y = bodyGeometry.attributes.position.getY(i);
        if (y < 0) {
            // Stretch points below the center downward
            bodyGeometry.attributes.position.setY(
                i, 
                y * (1.0 - y * 0.8) // Stretch more as we go down
            );
        }
    }
    bodyGeometry.computeVertexNormals(); // Recalculate normals
    
    // Ghost-like white material
    const bodyMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Eyes - classic cartoon eyes
    const eyeGeometry = new THREE.CircleGeometry(0.08, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 0.1, 0.35);
    leftEye.rotation.y = Math.PI;
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 0.1, 0.35);
    rightEye.rotation.y = Math.PI;
    
    // Add cartoon mouth - simple curved line
    const mouthGeometry = new THREE.TorusGeometry(0.1, 0.02, 8, 8, Math.PI);
    const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -0.05, 0.35);
    mouth.rotation.x = Math.PI / 2;
    
    // Add ghostly arms/wings
    const wingGeometry = new THREE.SphereGeometry(0.25, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    wingGeometry.scale(1, 0.5, 1);
    const wingMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    
    // Left wing
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.4, 0, 0);
    leftWing.rotation.z = Math.PI / 4;
    leftWing.rotation.y = -Math.PI / 4;
    
    // Right wing
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.4, 0, 0);
    rightWing.rotation.z = -Math.PI / 4;
    rightWing.rotation.y = Math.PI / 4;
    
    // Add all parts to the group
    enemyGroup.add(body);
    enemyGroup.add(leftEye);
    enemyGroup.add(rightEye);
    enemyGroup.add(mouth);
    enemyGroup.add(leftWing);
    enemyGroup.add(rightWing);
    
    // Store wing references for animation
    enemyGroup.userData = {
        wings: [leftWing, rightWing],
        wingPhase: Math.random() * Math.PI * 2, // Random starting phase
        floatPhase: Math.random() * Math.PI * 2 // For floating motion
    };
    
    return enemyGroup;
}

// Helper function to spawn a single enemy of specified type
function spawnEnemy(type) {
    // Create enemy based on type
    let enemy;
    switch (type) {
        case 'spider':
            enemy = createSpiderEnemy();
            break;
        case 'flying':
            enemy = createFlyingEnemy();
            break;
        default:
            enemy = createEnemy();
            break;
    }
    
    // Generate random position
    let validPosition = false;
    let position = new THREE.Vector3();
    
    // Keep trying until we find a valid position outside all buildings
    let attempts = 0;
    while (!validPosition && attempts < 50) {
        attempts++;
        position.x = Math.random() * 90 - 45; // Expanded from 30-15 to 90-45
        position.z = Math.random() * 90 - 45; // Expanded from 30-15 to 90-45
        
        // Flying enemies start higher up
        position.y = type === 'flying' ? 3 + Math.random() * 2 : 0.8;
        
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
        debugLog(`Could not find valid position for ${type} enemy after 50 attempts`);
        return; // Skip this enemy if we can't find a valid position
    }
    
    enemy.position.copy(position);
    scene.add(enemy);
    
    // Set enemy properties based on type
    let baseSpeed, health, bounceAmount, flyHeight;
    
    switch (type) {
        case 'spider':
            baseSpeed = 0.025; // Spiders are faster
            health = 75; // Spiders have less health
            bounceAmount = 0.05; // Spiders bounce less
            flyHeight = 0; // Spiders don't fly
            break;
        case 'flying':
            baseSpeed = 0.03; // Flying enemies are fast but slightly slower than before
            health = 60; // Flying enemies have less health but more than before
            bounceAmount = 0.1; // Less bounce for smoother ghost movement
            flyHeight = 2.5 + Math.random(); // Flying enemies stay in the air but lower
            break;
        default: // Regular enemies
            baseSpeed = 0.02;
            health = 100;
            bounceAmount = 0.1;
            flyHeight = 0;
            break;
    }
    
    enemies.push({
        mesh: enemy,
        health: health,
        speed: baseSpeed,
        bounceOffset: Math.random() * Math.PI * 2,
        lastPosition: position.clone(), // Track last position to detect if stuck
        stuckTime: 0, // Track how long the enemy has been stuck
        pathfindingOffset: new THREE.Vector3(0, 0, 0), // Offset for pathfinding
        lastPathChange: 0, // When the path was last changed
        type: type, // Store enemy type
        bounceAmount: bounceAmount, // Store bounce amount
        flyHeight: flyHeight, // Store flying height
        wingPhase: Math.random() * Math.PI * 2, // For wing animation
        floatPhase: Math.random() * Math.PI * 2 // For floating motion
    });
    
    debugLog(`Added ${type} enemy at ${position.x}, ${position.y}, ${position.z} with speed ${baseSpeed}`);
}

// Create a machine gun pickup
function createMachineGunPickup(position) {
    const gunGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.5);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
    const gunMesh = new THREE.Mesh(gunGeometry, gunMaterial);
    
    // Add magazine to make it look like a machine gun
    const magazineGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.1);
    const magazineMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const magazine = new THREE.Mesh(magazineGeometry, magazineMaterial);
    magazine.position.y = -0.15;
    gunMesh.add(magazine);
    
    // Position at the enemy's location
    gunMesh.position.copy(position);
    gunMesh.position.y = 0.5; // Slightly above ground
    
    // Add to scene
    scene.add(gunMesh);
    
    // Create pickup object
    const pickup = {
        mesh: gunMesh,
        type: 'machineGun',
        timeCreated: performance.now(),
        isActive: true // Flag to track if pickup is still active
    };
    
    // Add floating animation
    const floatAnimation = () => {
        if (!pickup.isActive) return; // Stop animation if pickup is no longer active
        
        gunMesh.position.y = 0.5 + Math.sin(performance.now() * 0.002) * 0.1;
        gunMesh.rotation.y += 0.01;
        
        requestAnimationFrame(floatAnimation);
    };
    
    // Start the animation
    floatAnimation();
    
    return pickup;
}

// Show notification function
function showNotification(message) {
    // Create notification element if it doesn't exist
    let notificationEl = document.getElementById('notification');
    if (!notificationEl) {
        notificationEl = document.createElement('div');
        notificationEl.id = 'notification';
        notificationEl.style.position = 'absolute';
        notificationEl.style.top = '20%';
        notificationEl.style.left = '50%';
        notificationEl.style.transform = 'translate(-50%, -50%)';
        notificationEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        notificationEl.style.color = 'white';
        notificationEl.style.padding = '10px 20px';
        notificationEl.style.borderRadius = '5px';
        notificationEl.style.fontFamily = 'Arial, sans-serif';
        notificationEl.style.fontSize = '18px';
        notificationEl.style.textAlign = 'center';
        notificationEl.style.zIndex = '1000';
        notificationEl.style.display = 'none';
        document.body.appendChild(notificationEl);
    }
    
    // Set message and show notification
    notificationEl.textContent = message;
    notificationEl.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        notificationEl.style.display = 'none';
    }, 3000);
}

// Create a pistol pickup
function createPistolPickup(position) {
    const gunGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const gunMesh = new THREE.Mesh(gunGeometry, gunMaterial);
    
    // Add barrel to make it look like a pistol
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
    const barrelMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.2;
    gunMesh.add(barrel);
    
    // Position at the specified location
    gunMesh.position.copy(position);
    gunMesh.position.y = 0.5; // Slightly above ground
    
    // Add to scene
    scene.add(gunMesh);
    
    // Create pickup object
    const pickup = {
        mesh: gunMesh,
        type: 'pistol',
        timeCreated: performance.now(),
        isActive: true // Flag to track if pickup is still active
    };
    
    // Add floating animation
    const floatAnimation = () => {
        if (!pickup.isActive) return; // Stop animation if pickup is no longer active
        
        gunMesh.position.y = 0.5 + Math.sin(performance.now() * 0.002) * 0.1;
        gunMesh.rotation.y += 0.01;
        
        requestAnimationFrame(floatAnimation);
    };
    
    // Start the animation
    floatAnimation();
    
    // Add to pistol pickups array
    pistolPickups.push(pickup);
    
    return pickup;
}

// Check if game is over
function checkGameOver() {
    if (gameState.health <= 0 && !gameState.gameOver) {
        gameState.gameOver = true;
        
        // Show game over screen
        finalScoreEl.textContent = gameState.score;
        finalLevelEl.textContent = gameState.level;
        
        gameOverEl.style.display = 'block';
        controls.unlock();
        
        // Hide pickup hint
        hidePickupHint();
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Calculate delta time
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    prevTime = time;
    
    // Skip game logic if game is over, menu is open, or controls are not locked
    if (!gameState.gameOver && !gameState.menuOpen && controls.isLocked) {
        // Process recoil recovery
        processRecoilRecovery(delta);
        
        // Update bullet projectiles
        updateBulletProjectiles(delta);
        
        // Check if player is holding mouse button and needs to auto-reload
        if (gameState.isMouseDown && gameState.ammo <= 0 && !gameState.isReloading) {
            reload();
        }
        
        // If using machine gun and holding mouse button, continue shooting
        if (gameState.currentGunType === 'machineGun' && gameState.isMouseDown && 
            gameState.ammo > 0 && !gameState.isReloading && time - lastShootTime > 100) {
            shoot();
            lastShootTime = time;
        }
        
        // Check for nearby pickups and show hints
        checkForNearbyPickups();
        
        // Check for health pickups that the player touches
        checkForHealthPickups();
        
        // Check for expired pickups (items that have been around too long)
        checkForExpiredPickups(time);
        
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
        
        // Check for bullet pickup collisions (health pickups only now)
        const playerPosition = new THREE.Vector3();
        camera.getWorldPosition(playerPosition);
        
        for (let i = bulletPickups.length - 1; i >= 0; i--) {
            const pickup = bulletPickups[i];
            const distance = playerPosition.distanceTo(pickup.mesh.position);
            
            // Timeout handling is now done in checkForExpiredPickups
            
            if (distance < 1.5) { // Pickup range
                // Handle different pickup types
                if (pickup.type === 'health') {
                    gameState.health = Math.min(100, gameState.health + pickup.health);
                    playSound('pickupHealth'); // Reuse bullet pickup sound for now
                    
                    scene.remove(pickup.mesh);
                    bulletPickups.splice(i, 1);
                    updateUI();
                }
            }
        }
        
        // Update enemies
        for (const enemy of enemies) {
            // Calculate direction to player
            const directionToPlayer = new THREE.Vector3();
            directionToPlayer.subVectors(camera.position, enemy.mesh.position).normalize();
            
            // Store original position for collision detection
            const originalEnemyPosition = enemy.mesh.position.clone();
            
            // Check if enemy is stuck by comparing current position to last position
            const movementAmount = enemy.mesh.position.distanceTo(enemy.lastPosition);
            if (movementAmount < 0.01) {
                enemy.stuckTime += delta;
                
                // If enemy has been stuck for too long (5 seconds), teleport it to a new position
                if (enemy.stuckTime > 5) {
                    debugLog('Enemy stuck for too long, teleporting to new position');
                    
                    // Find a new position around the player
                    const playerPosition = new THREE.Vector3();
                    camera.getWorldPosition(playerPosition);
                    
                    // Try to find a valid position outside buildings
                    let validPosition = false;
                    let newPosition = new THREE.Vector3();
                    let attempts = 0;
                    
                    while (!validPosition && attempts < 20) {
                        attempts++;
                        
                        // Random angle and distance from player (between 10-15 units away)
                        const randomAngle = Math.random() * Math.PI * 2;
                        const randomDistance = 10 + Math.random() * 5;
                        
                        // Calculate new position
                        newPosition.x = playerPosition.x + Math.sin(randomAngle) * randomDistance;
                        newPosition.y = enemy.mesh.position.y; // Keep same height
                        newPosition.z = playerPosition.z + Math.cos(randomAngle) * randomDistance;
                        
                        // Check if position is inside any building
                        let insideAnyBuilding = false;
                        
                        if (gameState.allBuildingBounds) {
                            for (const bounds of gameState.allBuildingBounds) {
                                if (bounds.containsPoint(newPosition)) {
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
                        debugLog('Could not find valid teleport position, using fallback');
                        // Fallback: just move the enemy closer to the player but not too close
                        newPosition.copy(playerPosition);
                        const directionFromPlayer = new THREE.Vector3().subVectors(enemy.mesh.position, playerPosition).normalize();
                        newPosition.add(directionFromPlayer.multiplyScalar(8)); // 8 units away from player
                    }
                    
                    // Set new position
                    enemy.mesh.position.copy(newPosition);
                    
                    // Reset stuck time and pathfinding
                    enemy.stuckTime = 0;
                    enemy.pathfindingOffset = new THREE.Vector3(0, 0, 0);
                    enemy.lastPathChange = time;
                    enemy.lastPosition.copy(enemy.mesh.position);
                    
                    // Add a teleport effect
                    createTeleportEffect(enemy.mesh.position.clone());
                    
                    // Skip the rest of the movement logic for this frame
                    continue;
                }
            } else {
                enemy.stuckTime = 0;
                // Only update last position if we've moved significantly
                if (movementAmount > 0.05) {
                    enemy.lastPosition.copy(enemy.mesh.position);
                }
            }
            
            // Check if there's an obstacle in the direct path to the player
            const distanceToPlayer = enemy.mesh.position.distanceTo(camera.position);
            const rayDirection = directionToPlayer.clone();
            
            // Create a raycaster to check for obstacles
            const raycaster = new THREE.Raycaster(
                enemy.mesh.position.clone(),
                rayDirection,
                0,
                Math.min(distanceToPlayer, 5) // Only check up to 5 units or distance to player
            );
            
            // Check for intersections with obstacles
            const intersections = raycaster.intersectObjects(collisionObjects);
            const pathBlocked = intersections.length > 0;
            
            // Early obstacle detection - check if we're getting too close to an obstacle
            let approachingObstacle = false;
            let obstacleDirection = null;
            
            // Check in multiple directions around the enemy for nearby obstacles
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                const checkDirection = new THREE.Vector3(
                    Math.sin(angle),
                    0,
                    Math.cos(angle)
                );
                
                // Create a raycaster to check for nearby obstacles
                const proximityRaycaster = new THREE.Raycaster(
                    enemy.mesh.position.clone(),
                    checkDirection,
                    0,
                    1.5 // Check 1.5 units ahead in all directions
                );
                
                // Check for intersections with obstacles
                const proximityIntersections = proximityRaycaster.intersectObjects(collisionObjects);
                
                if (proximityIntersections.length > 0) {
                    // Found a nearby obstacle
                    approachingObstacle = true;
                    
                    // Store the direction to the obstacle
                    obstacleDirection = checkDirection;
                    
                    // If we're very close to an obstacle, increase stuck time to trigger pathfinding
                    if (proximityIntersections[0].distance < 0.8) {
                        enemy.stuckTime += delta * 0.5; // Increase stuck time but not as much as when fully stuck
                    }
                    
                    break;
                }
            }
            
            // Determine if we need to change path
            const needsNewPath = (pathBlocked || approachingObstacle || enemy.stuckTime > 0.5) && 
                                (time - enemy.lastPathChange > 1000);
            
            if (needsNewPath) {
                // Try to find a better path around obstacles
                const possibleDirections = [];
                
                // Try 16 different directions around the circle (more directions for better pathfinding)
                for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                    const testDirection = new THREE.Vector3(
                        Math.sin(angle),
                        0,
                        Math.cos(angle)
                    );
                    
                    // Create a test raycaster
                    const testRaycaster = new THREE.Raycaster(
                        enemy.mesh.position.clone(),
                        testDirection,
                        0,
                        3 // Check 3 units ahead (increased from 2)
                    );
                    
                    // Check if this direction is clear
                    const testIntersections = testRaycaster.intersectObjects(collisionObjects);
                    
                    if (testIntersections.length === 0) {
                        // This direction is clear, score it based on how close it is to the player direction
                        // and how far it is from any obstacle direction
                        let score = testDirection.dot(directionToPlayer);
                        
                        // If we're approaching an obstacle, reduce the score of directions toward the obstacle
                        if (approachingObstacle && obstacleDirection) {
                            const obstacleAvoidance = 1 - Math.max(0, testDirection.dot(obstacleDirection));
                            score += obstacleAvoidance * 0.5; // Weight obstacle avoidance
                        }
                        
                        possibleDirections.push({
                            direction: testDirection,
                            score: score
                        });
                    }
                }
                
                // Sort directions by score (highest first)
                possibleDirections.sort((a, b) => b.score - a.score);
                
                if (possibleDirections.length > 0) {
                    // Choose the best direction (closest to player that's not blocked)
                    enemy.pathfindingOffset = possibleDirections[0].direction.clone();
                    enemy.pathfindingOffset.sub(directionToPlayer);
                    
                    // Make the offset stronger if we're approaching an obstacle
                    if (approachingObstacle) {
                        enemy.pathfindingOffset.multiplyScalar(1.5);
                    }
                    
                    enemy.lastPathChange = time;
                    debugLog('Enemy found new path around obstacle');
                } else {
                    // All directions are blocked, try a random direction
                    const randomAngle = Math.random() * Math.PI * 2;
                    const randomDirection = new THREE.Vector3(
                        Math.sin(randomAngle),
                        0,
                        Math.cos(randomAngle)
                    );
                    
                    enemy.pathfindingOffset = randomDirection.clone();
                    enemy.pathfindingOffset.sub(directionToPlayer);
                    enemy.pathfindingOffset.multiplyScalar(2); // Stronger offset for desperate situations
                    enemy.lastPathChange = time;
                    debugLog('Enemy trying random direction - all paths blocked');
                }
            }
            
            // Gradually reduce pathfinding offset over time if we're not stuck
            if (enemy.stuckTime < 0.1 && time - enemy.lastPathChange > 2000) {
                enemy.pathfindingOffset.multiplyScalar(0.95);
            }
            
            // Calculate final movement direction with pathfinding offset
            const finalDirection = new THREE.Vector3()
                .addVectors(directionToPlayer, enemy.pathfindingOffset)
                .normalize();
            
            // Move enemy towards player with pathfinding
            const newPosition = enemy.mesh.position.clone();
            
            // Adjust speed based on proximity to obstacles
            let adjustedSpeed = enemy.speed;
            
            // If we're approaching an obstacle, slow down to give more time to change direction
            if (approachingObstacle) {
                adjustedSpeed *= 0.7; // Reduce speed to 70% when near obstacles
            }
            
            // Apply movement with adjusted speed
            newPosition.x += finalDirection.x * adjustedSpeed;
            newPosition.z += finalDirection.z * adjustedSpeed;
            
            // Check for collisions with buildings
            let enemyCollision = false;
            const enemyRadius = 0.5; // Enemy collision radius
            
            // Before moving, check if the new position would cause a collision
            const preCheckPosition = enemy.mesh.position.clone();
            
            // Create a raycaster to check the path to the new position
            const moveDirection = new THREE.Vector3()
                .subVectors(newPosition, enemy.mesh.position)
                .normalize();
            
            const moveDistance = enemy.mesh.position.distanceTo(newPosition);
            
            const moveRaycaster = new THREE.Raycaster(
                enemy.mesh.position.clone(),
                moveDirection,
                0,
                moveDistance + 0.1 // Check slightly beyond the move distance
            );
            
            // Check for intersections with obstacles
            const moveIntersections = moveRaycaster.intersectObjects(collisionObjects);
            
            if (moveIntersections.length > 0) {
                // There's an obstacle in the way, try to slide along it
                const hitPoint = moveIntersections[0].point;
                const hitNormal = moveIntersections[0].face.normal;
                
                // Calculate a slide direction along the obstacle surface
                const slideDirection = new THREE.Vector3()
                    .copy(moveDirection)
                    .sub(hitNormal.multiplyScalar(moveDirection.dot(hitNormal)))
                    .normalize();
                
                // Try to move in the slide direction instead
                newPosition.copy(enemy.mesh.position);
                newPosition.x += slideDirection.x * adjustedSpeed * 0.5; // Move slower when sliding
                newPosition.z += slideDirection.z * adjustedSpeed * 0.5;
                
                // Increase pathfinding offset in the slide direction
                enemy.pathfindingOffset.add(slideDirection.multiplyScalar(0.2));
                
                // Mark that we're approaching an obstacle
                approachingObstacle = true;
            }
            
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
                
                // Increase stuck time when collision occurs
                enemy.stuckTime += delta * 2; // Double the stuck time on collision
                
                // Immediately try to find a new path
                enemy.lastPathChange = time - 1500; // Make it eligible for path change soon
                
                // Add a small random offset to help break out of stuck situations
                const randomOffset = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.2,
                    0,
                    (Math.random() - 0.5) * 0.2
                );
                enemy.pathfindingOffset.add(randomOffset);
            }
            
            // Special handling for flying enemies
            if (enemy.type === 'flying') {
                // Ghost/bird floating animation
                const floatSpeed = 2; // Floating speed
                const floatAmount = 0.3; // How much it floats up and down
                
                // Calculate floating height offset
                const floatOffset = Math.sin(time * 0.001 * floatSpeed + enemy.floatPhase) * floatAmount;
                
                // Apply wing animation if the enemy has wings
                if (enemy.mesh.userData && enemy.mesh.userData.wings) {
                    const wings = enemy.mesh.userData.wings;
                    const wingSpeed = 3; // Slower, ghostly wing movement
                    const wingAngle = Math.sin(time * 0.001 * wingSpeed + enemy.wingPhase) * 0.2;
                    
                    // Animate wings
                    if (wings[0]) wings[0].rotation.z = Math.PI / 4 + wingAngle;
                    if (wings[1]) wings[1].rotation.z = -Math.PI / 4 - wingAngle;
                }
                
                // Flying enemies maintain height with floating motion
                const targetHeight = enemy.flyHeight + floatOffset;
                if (enemy.mesh.position.y < targetHeight - 0.1) {
                    enemy.mesh.position.y += Math.min(0.05, targetHeight - enemy.mesh.position.y);
                } else if (enemy.mesh.position.y > targetHeight + 0.1) {
                    enemy.mesh.position.y -= Math.min(0.05, enemy.mesh.position.y - targetHeight);
                }
                
                // Add ghostly rotation
                enemy.mesh.rotation.y += Math.sin(time * 0.001) * 0.01;
            }
            
            // Bouncy cartoon animation - use enemy-specific bounce amount
            const bounceAmount = enemy.bounceAmount || 0.1; // Default to 0.1 if not specified
            
            // For flying enemies, make the bounce affect their height
            if (enemy.type === 'flying') {
                enemy.mesh.position.y += Math.sin(time * 0.005 + enemy.bounceOffset) * bounceAmount;
            } else {
                enemy.mesh.position.y = 0.8 + Math.sin(time * 0.005 + enemy.bounceOffset) * bounceAmount;
            }
            
            // Rotate enemy to face player
            enemy.mesh.lookAt(camera.position);
            
            // Check if enemy is close to player
            if (distanceToPlayer < 1.5) {
                // Use the damage function to apply damage to player
                playerTakeDamage(2, enemy.mesh.position);
            }
        }
    }
    
    renderer.render(scene, camera);
    checkGameOver();
}

// Create a sniper rifle pickup
function createSniperRiflePickup(position) {
    // Create a visual representation of the sniper rifle
    const gunGroup = new THREE.Group();
    
    // Gun body
    const gunGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.7);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const gunMesh = new THREE.Mesh(gunGeometry, gunMaterial);
    
    // Add barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8);
    const barrelMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.4;
    gunMesh.add(barrel);
    
    // Add scope
    const scopeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8);
    const scopeMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const scope = new THREE.Mesh(scopeGeometry, scopeMaterial);
    scope.rotation.x = Math.PI / 2;
    scope.position.y = 0.1;
    scope.position.z = -0.1;
    gunMesh.add(scope);
    
    // Position at the specified location
    gunMesh.position.copy(position);
    gunMesh.position.y = 0.5; // Slightly above ground
    
    // Add to scene
    scene.add(gunMesh);
    
    // Create pickup object
    const pickup = {
        mesh: gunMesh,
        type: 'sniperRifle',
        timeCreated: performance.now(),
        isActive: true // Flag to track if pickup is still active
    };
    
    // Add floating animation
    const floatAnimation = () => {
        if (!pickup.isActive) return; // Stop animation if pickup is no longer active
        
        gunMesh.position.y = 0.5 + Math.sin(performance.now() * 0.002) * 0.1;
        gunMesh.rotation.y += 0.01;
        
        requestAnimationFrame(floatAnimation);
    };
    
    // Start the animation
    floatAnimation();
    
    return pickup;
}

// Function to toggle zoom for sniper rifle
function toggleZoom() {
    if (gameState.currentGunType !== 'sniperRifle') return;
    
    gameState.isZoomed = !gameState.isZoomed;
    
    if (gameState.isZoomed) {
        // Store original FOV
        gameState.originalFOV = camera.fov;
        
        // Zoom in
        camera.fov = 20; // Narrower FOV for zoom
        camera.updateProjectionMatrix();
        
        // Add scope overlay
        createScopeOverlay();
        
        // Hide weapon model when zoomed
        sniperRifle.visible = false;
    } else {
        // Restore original FOV
        camera.fov = gameState.originalFOV || 75;
        camera.updateProjectionMatrix();
        
        // Remove scope overlay
        removeScopeOverlay();
        
        // Show weapon model when not zoomed
        sniperRifle.visible = true;
    }
}

// Create scope overlay
function createScopeOverlay() {
    // Create scope overlay if it doesn't exist
    if (!document.getElementById('scopeOverlay')) {
        const scopeOverlay = document.createElement('div');
        scopeOverlay.id = 'scopeOverlay';
        scopeOverlay.style.position = 'absolute';
        scopeOverlay.style.top = '0';
        scopeOverlay.style.left = '0';
        scopeOverlay.style.width = '100%';
        scopeOverlay.style.height = '100%';
        scopeOverlay.style.pointerEvents = 'none';
        
        // Create scope circle
        const scopeCircle = document.createElement('div');
        scopeCircle.style.position = 'absolute';
        scopeCircle.style.top = '50%';
        scopeCircle.style.left = '50%';
        scopeCircle.style.transform = 'translate(-50%, -50%)';
        scopeCircle.style.width = '80vh';
        scopeCircle.style.height = '80vh';
        scopeCircle.style.borderRadius = '50%';
        scopeCircle.style.border = '2px solid black';
        scopeCircle.style.boxShadow = '0 0 0 2000px rgba(0, 0, 0, 0.8)';
        
        // Create crosshair
        const crosshairH = document.createElement('div');
        crosshairH.style.position = 'absolute';
        crosshairH.style.top = '50%';
        crosshairH.style.left = '50%';
        crosshairH.style.transform = 'translate(-50%, -50%)';
        crosshairH.style.width = '40px';
        crosshairH.style.height = '2px';
        crosshairH.style.backgroundColor = 'red';
        
        const crosshairV = document.createElement('div');
        crosshairV.style.position = 'absolute';
        crosshairV.style.top = '50%';
        crosshairV.style.left = '50%';
        crosshairV.style.transform = 'translate(-50%, -50%)';
        crosshairV.style.width = '2px';
        crosshairV.style.height = '40px';
        crosshairV.style.backgroundColor = 'red';
        
        scopeOverlay.appendChild(scopeCircle);
        scopeOverlay.appendChild(crosshairH);
        scopeOverlay.appendChild(crosshairV);
        
        document.body.appendChild(scopeOverlay);
    }
}

// Remove scope overlay
function removeScopeOverlay() {
    const scopeOverlay = document.getElementById('scopeOverlay');
    if (scopeOverlay) {
        document.body.removeChild(scopeOverlay);
    }
}

// Show pickup hint when player is near a gun
function showPickupHint(gunType) {
    // Create hint element if it doesn't exist
    let hintEl = document.getElementById('pickupHint');
    if (!hintEl) {
        hintEl = document.createElement('div');
        hintEl.id = 'pickupHint';
        hintEl.style.position = 'absolute';
        hintEl.style.bottom = '20%';
        hintEl.style.left = '50%';
        hintEl.style.transform = 'translate(-50%, 0)';
        hintEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        hintEl.style.color = 'white';
        hintEl.style.padding = '10px 20px';
        hintEl.style.borderRadius = '5px';
        hintEl.style.fontFamily = 'Arial, sans-serif';
        hintEl.style.fontSize = '16px';
        hintEl.style.textAlign = 'center';
        hintEl.style.zIndex = '1000';
        document.body.appendChild(hintEl);
    }
    
    // Set the message based on gun type
    let gunName = "gun";
    switch(gunType) {
        case 'pistol':
            gunName = "Pistol";
            break;
        case 'machineGun':
            gunName = "Machine Gun";
            break;
        case 'sniperRifle':
            gunName = "Sniper Rifle";
            break;
        case 'shotgun':
            gunName = "Shotgun";
            break;
        case 'rocketLauncher':
            gunName = "Rocket Launcher";
            break;
        default: gunName = "Unknown Weapon";
    }
    
    hintEl.textContent = `Press E to pick up ${gunName}`;
    hintEl.style.display = 'block';
    
    // Store the current time to hide the hint if no pickups are nearby
    gameState.lastPickupHintTime = performance.now();
}

// Hide pickup hint
function hidePickupHint() {
    const hintEl = document.getElementById('pickupHint');
    if (hintEl) {
        hintEl.style.display = 'none';
    }
}

// Check for nearby pickups and show hints
function checkForNearbyPickups() {
    if (gameState.gameOver) return;
    
    const playerPosition = new THREE.Vector3();
    camera.getWorldPosition(playerPosition);
    
    // Reset nearby pickup flag
    let foundNearbyPickup = false;
    let nearestPickupType = null;
    let nearestDistance = Infinity;
    
    // Check for machine gun pickups
    for (const pickup of machineGunPickups) {
        const distance = playerPosition.distanceTo(pickup.mesh.position);
        
        if (distance < 3 && distance < nearestDistance) { // Show hint within 3 units
            nearestDistance = distance;
            nearestPickupType = 'machineGun';
            foundNearbyPickup = true;
        }
    }
    
    // Check for pistol pickups
    for (const pickup of pistolPickups) {
        const distance = playerPosition.distanceTo(pickup.mesh.position);
        
        if (distance < 3 && distance < nearestDistance) { // Show hint within 3 units
            nearestDistance = distance;
            nearestPickupType = 'pistol';
            foundNearbyPickup = true;
        }
    }
    
    // Check for sniper rifle pickups
    for (const pickup of sniperRiflePickups) {
        const distance = playerPosition.distanceTo(pickup.mesh.position);
        
        if (distance < 3 && distance < nearestDistance) { // Show hint within 3 units
            nearestDistance = distance;
            nearestPickupType = 'sniperRifle';
            foundNearbyPickup = true;
        }
    }
    
    // Check for shotgun pickups
    for (const pickup of shotgunPickups) {
        const distance = playerPosition.distanceTo(pickup.mesh.position);
        
        if (distance < 3 && distance < nearestDistance) { // Show hint within 3 units
            nearestDistance = distance;
            nearestPickupType = 'shotgun';
            foundNearbyPickup = true;
        }
    }
    
    // Show or hide hint based on nearby pickups
    if (foundNearbyPickup) {
        // Only show hint if pickup type changed or it's been more than 5 seconds
        if (nearestPickupType !== gameState.nearbyPickup || 
            performance.now() - gameState.lastPickupHintTime > 5000) {
            showPickupHint(nearestPickupType);
            gameState.nearbyPickup = nearestPickupType;
        }
    } else {
        // Hide hint if no pickups are nearby
        hidePickupHint();
        gameState.nearbyPickup = null;
    }
}

// Check for health pickups that the player touches
function checkForHealthPickups() {
    if (gameState.gameOver || gameState.health >= 100) return; // Skip if at max health
    
    const playerPosition = new THREE.Vector3();
    camera.getWorldPosition(playerPosition);
    
    // Check for health pickups
    for (let i = healthPickups.length - 1; i >= 0; i--) {
        const pickup = healthPickups[i];
        const distance = playerPosition.distanceTo(pickup.mesh.position);
        
        if (distance < 1.5) { // Closer range for automatic pickup
            // Add health to player
            gameState.health = Math.min(gameState.health + pickup.health, 100);
            
            // Mark pickup as inactive before removing it
            pickup.isActive = false;
            
            // Remove pickup
            scene.remove(pickup.mesh);
            healthPickups.splice(i, 1);
            
            // Play pickup sound
            playSound('pickupHealth');
            
            // Show notification
            showNotification(`+${pickup.health} Health!`);
            
            updateUI();
            return; // Exit after picking up
        }
    }
}

// Check for expired pickups (items that have been around too long)
function checkForExpiredPickups(currentTime) {
    const HEALTH_TIMEOUT = 15000; // 15 seconds for health pickups
    const WEAPON_TIMEOUT = 30000; // 30 seconds for weapon pickups
    const FADE_START = 3000; // Start fading 3 seconds before disappearing
    
    // Check for expired health pickups
    for (let i = healthPickups.length - 1; i >= 0; i--) {
        const pickup = healthPickups[i];
        const age = currentTime - pickup.timeCreated;
        
        if (age > HEALTH_TIMEOUT) {
            // Remove pickup
            pickup.isActive = false;
            scene.remove(pickup.mesh);
            healthPickups.splice(i, 1);
        } else if (age > HEALTH_TIMEOUT - FADE_START) {
            // Fade out pickup
            const opacity = 1 - ((age - (HEALTH_TIMEOUT - FADE_START)) / FADE_START);
            if (pickup.mesh.material.opacity !== opacity) {
                pickup.mesh.material.transparent = true;
                pickup.mesh.material.opacity = opacity;
            }
        }
    }
    
    // Check for expired bullet pickups
    for (let i = bulletPickups.length - 1; i >= 0; i--) {
        const pickup = bulletPickups[i];
        const age = currentTime - pickup.timeCreated;
        
        if (age > HEALTH_TIMEOUT) {
            // Remove pickup
            pickup.isActive = false;
            scene.remove(pickup.mesh);
            bulletPickups.splice(i, 1);
        } else if (age > HEALTH_TIMEOUT - FADE_START) {
            // Fade out pickup
            const opacity = 1 - ((age - (HEALTH_TIMEOUT - FADE_START)) / FADE_START);
            if (pickup.mesh.material.opacity !== opacity) {
                pickup.mesh.material.transparent = true;
                pickup.mesh.material.opacity = opacity;
            }
        }
    }
    
    // Check for expired machine gun pickups
    for (let i = machineGunPickups.length - 1; i >= 0; i--) {
        const pickup = machineGunPickups[i];
        const age = currentTime - pickup.timeCreated;
        
        if (age > WEAPON_TIMEOUT) {
            // Remove pickup
            pickup.isActive = false;
            scene.remove(pickup.mesh);
            machineGunPickups.splice(i, 1);
        } else if (age > WEAPON_TIMEOUT - FADE_START) {
            // Fade out pickup
            const opacity = 1 - ((age - (WEAPON_TIMEOUT - FADE_START)) / FADE_START);
            fadePickupMesh(pickup.mesh, opacity);
        }
    }
    
    // Check for expired pistol pickups
    for (let i = pistolPickups.length - 1; i >= 0; i--) {
        const pickup = pistolPickups[i];
        const age = currentTime - pickup.timeCreated;
        
        if (age > WEAPON_TIMEOUT) {
            // Remove pickup
            pickup.isActive = false;
            scene.remove(pickup.mesh);
            pistolPickups.splice(i, 1);
        } else if (age > WEAPON_TIMEOUT - FADE_START) {
            // Fade out pickup
            const opacity = 1 - ((age - (WEAPON_TIMEOUT - FADE_START)) / FADE_START);
            fadePickupMesh(pickup.mesh, opacity);
        }
    }
    
    // Check for expired sniper rifle pickups
    for (let i = sniperRiflePickups.length - 1; i >= 0; i--) {
        const pickup = sniperRiflePickups[i];
        const age = currentTime - pickup.timeCreated;
        
        if (age > WEAPON_TIMEOUT) {
            // Remove pickup
            pickup.isActive = false;
            scene.remove(pickup.mesh);
            sniperRiflePickups.splice(i, 1);
        } else if (age > WEAPON_TIMEOUT - FADE_START) {
            // Fade out pickup
            const opacity = 1 - ((age - (WEAPON_TIMEOUT - FADE_START)) / FADE_START);
            fadePickupMesh(pickup.mesh, opacity);
        }
    }
    
    // Check for expired shotgun pickups
    for (let i = shotgunPickups.length - 1; i >= 0; i--) {
        const pickup = shotgunPickups[i];
        const age = currentTime - pickup.timeCreated;
        
        if (age > WEAPON_TIMEOUT) {
            // Remove pickup
            pickup.isActive = false;
            scene.remove(pickup.mesh);
            shotgunPickups.splice(i, 1);
        } else if (age > WEAPON_TIMEOUT - FADE_START) {
            // Fade out pickup
            const opacity = 1 - ((age - (WEAPON_TIMEOUT - FADE_START)) / FADE_START);
            fadePickupMesh(pickup.mesh, opacity);
        }
    }
}

// Helper function to fade out a pickup mesh (which might have child meshes)
function fadePickupMesh(mesh, opacity) {
    // Make sure the material is transparent
    if (mesh.material) {
        mesh.material.transparent = true;
        mesh.material.opacity = opacity;
    }
    
    // Apply to all children recursively
    if (mesh.children && mesh.children.length > 0) {
        for (const child of mesh.children) {
            fadePickupMesh(child, opacity);
        }
    }
}

// Create a shotgun weapon
function createShotgun() {
    debugLog('Creating shotgun');
    // Create a cartoon-style shotgun
    const weaponGroup = new THREE.Group();
    
    // Main barrel - shorter and wider than other guns
    const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
    const barrelMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.z = Math.PI / 2; // Rotate to horizontal position
    
    // Second barrel below the first
    const barrel2 = barrel.clone();
    barrel2.position.y = -0.06;
    
    // Stock - wooden look
    const stockGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.08);
    const stockMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown for wood
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.x = -0.2;
    
    // Pump handle
    const pumpGeometry = new THREE.BoxGeometry(0.15, 0.06, 0.1);
    const pumpMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
    const pump = new THREE.Mesh(pumpGeometry, pumpMaterial);
    pump.position.x = 0.1;
    pump.position.y = -0.1;
    
    // Trigger guard
    const guardGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.04);
    const guardMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.x = -0.05;
    guard.position.y = -0.1;
    
    // Add all parts to the weapon group
    weaponGroup.add(barrel);
    weaponGroup.add(barrel2);
    weaponGroup.add(stock);
    weaponGroup.add(pump);
    weaponGroup.add(guard);
    
    // Position the weapon
    weaponGroup.position.set(0.3, -0.3, -0.5);
    weaponGroup.visible = false; // Hide initially
    
    return weaponGroup;
}

// Create a shotgun pickup
function createShotgunPickup(position) {
    // Create a visual representation of the shotgun
    const gunGroup = new THREE.Group();
    
    // Main barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
    const barrelMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.z = Math.PI / 2; // Rotate to horizontal position
    
    // Second barrel below the first
    const barrel2 = barrel.clone();
    barrel2.position.y = -0.06;
    barrel.add(barrel2);
    
    // Stock - wooden look
    const stockGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.08);
    const stockMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown for wood
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.x = -0.2;
    barrel.add(stock);
    
    // Position at the specified location
    barrel.position.copy(position);
    barrel.position.y = 0.5; // Slightly above ground
    
    // Add to scene
    scene.add(barrel);
    
    // Create pickup object
    const pickup = {
        mesh: barrel,
        type: 'shotgun',
        timeCreated: performance.now(),
        isActive: true // Flag to track if pickup is still active
    };
    
    // Add floating animation
    const floatAnimation = () => {
        if (!pickup.isActive) return; // Stop animation if pickup is no longer active
        
        barrel.position.y = 0.5 + Math.sin(performance.now() * 0.002) * 0.1;
        barrel.rotation.y += 0.01;
        
        requestAnimationFrame(floatAnimation);
    };
    
    // Start the animation
    floatAnimation();
    
    return pickup;
}

// Create a rocket launcher
function createRocketLauncher() {
    debugLog('Creating rocket launcher');
    // Create a cartoon-style rocket launcher
    const weaponGroup = new THREE.Group();
    
    // Main tube
    const tubeGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16);
    const tubeMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tube.rotation.z = Math.PI / 2; // Rotate to horizontal position
    
    // End cap with opening
    const capGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16);
    const capMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = 0.35;
    
    // Inner tube (darker color)
    const innerGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.72, 16);
    const innerMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const innerTube = new THREE.Mesh(innerGeometry, innerMaterial);
    innerTube.rotation.z = Math.PI / 2;
    innerTube.position.z = 0.01; // Slightly in front
    
    // Handle
    const handleGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.04);
    const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.x = -0.2;
    handle.position.y = -0.15;
    
    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.04);
    const gripMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.x = -0.1;
    grip.position.y = -0.25;
    
    // Sight on top
    const sightGeometry = new THREE.BoxGeometry(0.3, 0.03, 0.03);
    const sightMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const sight = new THREE.Mesh(sightGeometry, sightMaterial);
    sight.position.y = 0.1;
    
    // Add all parts to the weapon group
    weaponGroup.add(tube);
    weaponGroup.add(cap);
    weaponGroup.add(innerTube);
    weaponGroup.add(handle);
    weaponGroup.add(grip);
    weaponGroup.add(sight);
    
    // Position the weapon
    weaponGroup.position.set(0.3, -0.3, -0.5);
    weaponGroup.visible = false; // Hide initially
    
    return weaponGroup;
}

// Create a rocket projectile
function createRocketProjectile(position, direction) {
    // Create rocket geometry and material
    const rocketGroup = new THREE.Group();
    
    // Rocket body
    const bodyGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x777777 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2; // Orient along z-axis
    rocketGroup.add(body);
    
    // Rocket nose cone
    const noseGeometry = new THREE.ConeGeometry(0.05, 0.1, 8);
    const noseMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.rotation.x = Math.PI / 2; // Orient along z-axis
    nose.position.z = -0.2; // Position at front of rocket
    rocketGroup.add(nose);
    
    // Rocket fins
    const finGeometry = new THREE.BoxGeometry(0.1, 0.02, 0.05);
    const finMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
    
    // Add 4 fins around the rocket
    for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(finGeometry, finMaterial);
        fin.position.z = 0.1; // Position at back of rocket
        fin.rotation.z = (Math.PI / 2) * i; // Rotate around rocket body
        fin.position.x = Math.sin((Math.PI / 2) * i) * 0.06; // Position away from center
        fin.position.y = Math.cos((Math.PI / 2) * i) * 0.06;
        rocketGroup.add(fin);
    }
    
    // Set initial position (at gun barrel)
    rocketGroup.position.copy(position);
    
    // Add to scene
    scene.add(rocketGroup);
    
    // Add rocket trail effect (particle system)
    const trailGeometry = new THREE.CylinderGeometry(0.03, 0.01, 0.5, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF6600,
        transparent: true,
        opacity: 0.7
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.rotation.x = Math.PI / 2;
    trail.position.z = 0.3; // Position behind the rocket
    rocketGroup.add(trail);
    
    // Add flame effect
    const flameGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const flameMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF4500,
        transparent: true,
        opacity: 0.9
    });
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.position.z = 0.2; // Position at back of rocket
    flame.scale.z = 1.5; // Elongate the flame
    rocketGroup.add(flame);
    
    // Add smoke particles
    const smokeParticles = [];
    const smokeCount = 3;
    
    for (let i = 0; i < smokeCount; i++) {
        const smokeGeometry = new THREE.SphereGeometry(0.03, 6, 6);
        const smokeMaterial = new THREE.MeshBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.5
        });
        const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
        smoke.position.z = 0.3 + (i * 0.1); // Position behind the rocket
        smoke.userData.offset = i * 0.1; // Store offset for animation
        smoke.userData.randomFactor = Math.random() * 0.02; // Random movement factor
        rocketGroup.add(smoke);
        smokeParticles.push(smoke);
    }
    
    // Animate the flame and smoke
    const animateRocket = () => {
        if (!rocketGroup.parent) return; // Stop animation if rocket is removed
        
        // Flicker the flame
        flame.scale.x = 0.8 + Math.random() * 0.4;
        flame.scale.y = 0.8 + Math.random() * 0.4;
        
        // Animate smoke particles
        smokeParticles.forEach(smoke => {
            // Move smoke backward
            smoke.position.z += 0.01;
            
            // Add some random movement
            smoke.position.x += (Math.random() - 0.5) * smoke.userData.randomFactor;
            smoke.position.y += (Math.random() - 0.5) * smoke.userData.randomFactor;
            
            // Fade out as it moves back
            smoke.material.opacity = Math.max(0, 0.5 - (smoke.position.z - 0.3) * 0.5);
            
            // Reset smoke when it's too far back or faded out
            if (smoke.position.z > 0.8 || smoke.material.opacity <= 0) {
                smoke.position.z = 0.3;
                smoke.position.x = 0;
                smoke.position.y = 0;
                smoke.material.opacity = 0.5;
            }
        });
        
        requestAnimationFrame(animateRocket);
    };
    
    // Start animation
    animateRocket();
    
    // Return rocket object with metadata
    return {
        mesh: rocketGroup,
        direction: direction.clone(),
        speed: 15, // Slower than bullets
        distance: 0,
        maxDistance: 100,
        damage: 0, // Damage is done by explosion, not direct hit
        isRocket: true, // Flag as rocket for special handling
        timeCreated: performance.now()
    };
}

// Create an explosion effect
function createExplosion(position) {
    // Create explosion group
    const explosionGroup = new THREE.Group();
    explosionGroup.position.copy(position);
    
    // Create main explosion sphere
    const explosionGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF6600,
        transparent: true,
        opacity: 0.8
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosionGroup.add(explosion);
    
    // Create outer explosion sphere
    const outerGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const outerMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF9900,
        transparent: true,
        opacity: 0.5
    });
    const outer = new THREE.Mesh(outerGeometry, outerMaterial);
    explosionGroup.add(outer);
    
    // Add to scene
    scene.add(explosionGroup);
    
    // Play explosion sound
    playSound('explosion');
    
    // Animate explosion
    const startTime = performance.now();
    const duration = 500; // 500ms explosion duration
    const maxRadius = 5; // Maximum explosion radius
    
    // Damage enemies within explosion radius
    const explosionDamage = 200; // High damage
    const explosionRadius = 5; // Large radius
    
    // Check for enemies in explosion radius
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const distance = enemy.mesh.position.distanceTo(position);
        
        if (distance <= explosionRadius) {
            // Calculate damage based on distance (more damage closer to explosion)
            const damageMultiplier = 1 - (distance / explosionRadius);
            const damage = Math.floor(explosionDamage * damageMultiplier);
            
            // Apply damage to enemy
            enemy.health -= damage;
            
            // Apply force to push enemy away from explosion
            const pushDirection = new THREE.Vector3()
                .subVectors(enemy.mesh.position, position)
                .normalize();
            
            // Push distance based on proximity to explosion
            const pushStrength = 2 * (1 - (distance / explosionRadius));
            enemy.mesh.position.add(pushDirection.multiplyScalar(pushStrength));
            
            // Check if enemy is defeated
            if (enemy.health <= 0) {
                // Store enemy position
                const enemyPosition = enemy.mesh.position.clone();
                
                // Remove from array (must be done before handleEnemyDefeat)
                enemies.splice(i, 1);
                i--; // Adjust index after removal
                
                // Handle enemy defeat
                handleEnemyDefeat(enemy, enemyPosition);
            }
        }
    }
    
    // Check if player is in explosion radius - but don't damage them
    // We'll still apply screen shake for feedback
    const playerPosition = new THREE.Vector3();
    camera.getWorldPosition(playerPosition);
    const playerDistance = playerPosition.distanceTo(position);
    
    if (playerDistance <= explosionRadius) {
        // Apply screen shake based on proximity
        const shakeIntensity = 0.2 * (1 - (playerDistance / explosionRadius));
        gameState.currentRecoil = {
            x: (Math.random() - 0.5) * shakeIntensity,
            y: (Math.random() - 0.5) * shakeIntensity
        };
        
        // Add a visual effect to indicate the player is in the blast radius
        // but not taking damage
        const damageOverlay = document.getElementById('damageOverlay');
        if (damageOverlay) {
            damageOverlay.style.backgroundColor = 'rgba(255, 165, 0, 0.2)'; // Orange tint
            damageOverlay.style.opacity = 0.5 * (1 - (playerDistance / explosionRadius));
            
            // Fade out the overlay
            setTimeout(() => {
                damageOverlay.style.opacity = 0;
                damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)'; // Reset to red for normal damage
            }, 300);
        }
    }
    
    // Animation function
    const animateExplosion = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Scale explosion over time
        const currentRadius = maxRadius * progress;
        explosion.scale.set(currentRadius, currentRadius, currentRadius);
        outer.scale.set(currentRadius * 1.2, currentRadius * 1.2, currentRadius * 1.2);
        
        // Fade out explosion
        explosionMaterial.opacity = 0.8 * (1 - progress);
        outerMaterial.opacity = 0.5 * (1 - progress);
        
        // Continue animation until complete
        if (progress < 1) {
            requestAnimationFrame(animateExplosion);
        } else {
            // Remove explosion from scene
            scene.remove(explosionGroup);
        }
    };
    
    // Start animation
    animateExplosion();
}

// Create a rocket launcher pickup
function createRocketLauncherPickup(position) {
    // Create a visual representation of the rocket launcher
    const gunGroup = new THREE.Group();
    
    // Main tube
    const tubeGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16);
    const tubeMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tube.rotation.z = Math.PI / 2; // Rotate to horizontal position
    gunGroup.add(tube);
    
    // End cap with opening
    const capGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16);
    const capMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = 0.35;
    gunGroup.add(cap);
    
    // Handle
    const handleGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.04);
    const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.x = -0.2;
    handle.position.y = -0.15;
    gunGroup.add(handle);
    
    // Set position
    gunGroup.position.copy(position);
    
    // Add floating animation
    const floatAnimation = () => {
        if (!pickup.isActive) return; // Stop animation if pickup is no longer active
        
        const time = performance.now() * 0.001; // Convert to seconds
        gunGroup.position.y = position.y + Math.sin(time * 2) * 0.1; // Float up and down
        gunGroup.rotation.y += 0.01; // Slowly rotate
        
        requestAnimationFrame(floatAnimation);
    };
    
    // Create pickup object
    const pickup = {
        mesh: gunGroup,
        type: 'rocketLauncher',
        isActive: true,
        timeCreated: performance.now()
    };
    
    // Add to scene
    scene.add(gunGroup);
    
    // Start animation
    floatAnimation();
    
    return pickup;
}

// Create a teleport effect at the given position
function createTeleportEffect(position) {
    // Create a group for the teleport effect
    const teleportGroup = new THREE.Group();
    teleportGroup.position.copy(position);
    
    // Create a ring effect
    const ringGeometry = new THREE.RingGeometry(0.5, 0.7, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2; // Lay flat
    teleportGroup.add(ring);
    
    // Create particles
    const particleCount = 20;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff,
            transparent: true,
            opacity: 0.7
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Random position within a sphere
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.2 + Math.random() * 0.5;
        particle.position.set(
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * 1.5,
            Math.sin(angle) * radius
        );
        
        teleportGroup.add(particle);
        particles.push(particle);
    }
    
    // Add to scene
    scene.add(teleportGroup);
    
    // Play a teleport sound
    playSound('pickupHealth'); // Reuse existing sound for now
    
    // Animate the teleport effect
    const startTime = performance.now();
    const duration = 1000; // 1 second duration
    
    const animateTeleport = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Scale the ring
        ring.scale.set(1 + progress * 2, 1 + progress * 2, 1);
        
        // Fade out the ring
        ringMaterial.opacity = 0.8 * (1 - progress);
        
        // Animate particles
        particles.forEach(particle => {
            // Move particles outward
            particle.position.multiplyScalar(1 + 0.05 * progress);
            
            // Fade out particles
            particle.material.opacity = 0.7 * (1 - progress);
        });
        
        // Continue animation until complete
        if (progress < 1) {
            requestAnimationFrame(animateTeleport);
        } else {
            // Remove teleport effect from scene
            scene.remove(teleportGroup);
        }
    };
    
    // Start animation
    animateTeleport();
}

// Helper function to handle enemy defeat
function handleEnemyDefeat(enemy, position) {
    // Play enemy death sound
    playSound('enemyDeath');
    
    // Remove enemy from scene
    scene.remove(enemy.mesh);
    
    // Update score
    gameState.score += 100;
    updateUI();
    
    // Random drop chance
    const dropRoll = Math.random();
    if (dropRoll < 0.05) {
        // 5% chance to drop health
        healthPickups.push(createHealthPickup(position.clone()));
        debugLog('Enemy dropped health');
    } else if (dropRoll < 0.1) {
        // 5% chance to drop machine gun
        machineGunPickups.push(createMachineGunPickup(position.clone()));
        debugLog('Enemy dropped machine gun');
    } else if (dropRoll < 0.15) {
        // 5% chance to drop sniper rifle (rare)
        sniperRiflePickups.push(createSniperRiflePickup(position.clone()));
        debugLog('Enemy dropped sniper rifle');
    } else if (dropRoll < 0.2) {
        // 5% chance to drop shotgun
        shotgunPickups.push(createShotgunPickup(position.clone()));
        debugLog('Enemy dropped shotgun');
    } else if (dropRoll < 0.25) {
        // 5% chance to drop rocket launcher (very rare)
        rocketLauncherPickups.push(createRocketLauncherPickup(position.clone()));
        debugLog('Enemy dropped rocket launcher');
    } else {
        // 75% chance to drop nothing
        debugLog('Enemy dropped nothing');
    }
    
    // Check if all enemies are defeated
    if (enemies.length === 0) {
        gameState.level++;
        gameState.ammo += 5;
        
        // Show notification for new wave
        showRoundNotification(gameState.level);
        
        // Delay spawning new enemies to give player a moment to breathe
        setTimeout(() => {
            spawnEnemies();
        }, 2000);
    }
}

// Function to toggle the menu
function toggleMenu() {
    const menuScreen = document.getElementById('menuScreen');
    
    // Toggle menu state
    gameState.menuOpen = !gameState.menuOpen;
    
    if (gameState.menuOpen) {
        // Update menu stats
        updateMenuStats();
        
        // Show menu
        menuScreen.style.display = 'block';
        
        // Unlock pointer to allow interaction with menu
        controls.unlock();
        
        // Reset movement keys to prevent movement when menu is closed
        moveForward = false;
        moveBackward = false;
        moveLeft = false;
        moveRight = false;
    } else {
        // Hide menu
        menuScreen.style.display = 'none';
        
        // Lock pointer to resume game
        controls.lock();
    }
}

// Function to update menu stats
function updateMenuStats() {
    // Get weapon name based on current gun type
    let weaponName;
    switch (gameState.currentGunType) {
        case 'pistol': weaponName = "Pistol"; break;
        case 'machineGun': weaponName = "Machine Gun"; break;
        case 'sniperRifle': weaponName = "Sniper Rifle"; break;
        case 'shotgun': weaponName = "Shotgun"; break;
        case 'rocketLauncher': weaponName = "Rocket Launcher"; break;
        default: weaponName = "Unknown Weapon";
    }
    
    // Safely update menu stats
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    };
    
    // Update menu stats
    updateElement('menu-weapon', weaponName);
    updateElement('menu-ammo', `${gameState.ammo}/${gameState.maxAmmo}`);
    updateElement('menu-health', gameState.health);
    updateElement('menu-score', gameState.score);
    updateElement('menu-level', gameState.level);
}