import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Debug flag - turn this on to help troubleshoot
const DEBUG = true;

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
    soundEnabled: true
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
scene.add(camera);

// Add classic Mickey-style environment
createEnvironment();

// Add enemies
const enemies = [];
spawnEnemies();

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
    pickupBullets: new THREE.Audio(audioListener)
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

// Event listeners
document.addEventListener('click', () => {
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

function createEnvironment() {
    debugLog('Creating environment');
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50, 10, 10);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, side: THREE.DoubleSide }); // Changed to BasicMaterial
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
    
    // Add some cartoon-style obstacles and decorations
    for (let i = 0; i < 10; i++) {
        // Generate random buildings
        const height = Math.random() * 3 + 1;
        const width = Math.random() * 2 + 1;
        const depth = Math.random() * 2 + 1;
        
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshBasicMaterial({ // Changed to BasicMaterial
            color: Math.random() > 0.5 ? 0x333333 : 0x666666,
        });
        
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.x = Math.random() * 40 - 20;
        building.position.z = Math.random() * 40 - 20;
        building.position.y = height / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        
        scene.add(building);
        debugLog(`Added building at ${building.position.x}, ${building.position.y}, ${building.position.z}`);
    }
}

function spawnEnemies() {
    debugLog('Spawning enemies');
    // Create cartoon-style enemies inspired by old Mickey cartoons
    for (let i = 0; i < 5; i++) {
        const enemy = createEnemy();
        enemy.position.x = Math.random() * 30 - 15;
        enemy.position.z = Math.random() * 30 - 15;
        enemy.position.y = 0.8;
        scene.add(enemy);
        enemies.push({
            mesh: enemy,
            health: 100,
            speed: 0.03 + Math.random() * 0.02,
            bounceOffset: Math.random() * Math.PI * 2 // For bouncy animation
        });
        debugLog(`Added enemy at ${enemy.position.x}, ${enemy.position.y}, ${enemy.position.z}`);
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
        // Find which enemy was hit
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
                    
                    scene.remove(enemies[i].mesh);
                    enemies.splice(i, 1);
                    gameState.score += 100;
                    
                    // Check if all enemies are defeated
                    if (enemies.length === 0) {
                        gameState.level++;
                        gameState.ammo += 5;
                        spawnEnemies();
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
        soundEnabled: true
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
        
        // Update controls
        controls.moveRight(velocity.x * delta);
        controls.moveForward(velocity.z * delta);
        
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
            
            if (distance < 1.5) { // Pickup range
                gameState.bullets += pickup.bullets;
                scene.remove(pickup.mesh);
                bulletPickups.splice(i, 1);
                
                // Play pickup sound
                playSound('pickupBullets');
                
                updateUI();
            }
        }
        
        // Update enemies
        for (const enemy of enemies) {
            // Calculate direction to player
            const direction = new THREE.Vector3();
            direction.subVectors(camera.position, enemy.mesh.position).normalize();
            
            // Move enemy towards player
            enemy.mesh.position.x += direction.x * enemy.speed;
            enemy.mesh.position.z += direction.z * enemy.speed;
            
            // Bouncy cartoon animation
            enemy.mesh.position.y = 0.8 + Math.sin(time * 0.005 + enemy.bounceOffset) * 0.1;
            
            // Rotate enemy to face player
            enemy.mesh.lookAt(camera.position);
            
            // Check for collision with player
            const distance = enemy.mesh.position.distanceTo(camera.position);
            if (distance < 1.0) {
                gameState.health -= 1;
                updateUI();
                checkGameOver();
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
    updateUI();
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
        bullets: 10 // Each pickup gives 10 bullets
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

// Melee attack function
function meleeAttack() {
    // Animate the weapon for melee
    weapon.position.z += 0.3;
    weapon.rotation.x = 0.3;
    setTimeout(() => {
        weapon.position.z -= 0.3;
        weapon.rotation.x = 0;
    }, 200);
    
    // Play melee sound
    playSound('melee');
    
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