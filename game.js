import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { initLeaderboardButtons } from './leaderboard.js';
import { checkGameOver, playerTakeDamage } from './modules/gameLogic.js';
import { safeExitPointerLock, debugLog, DEBUG } from './modules/utils.js';
import { gameState, bulletProjectiles, collisionObjects, enemies, bulletPickups, machineGunPickups, pistolPickups, sniperRiflePickups, healthPickups, shotgunPickups,rocketLauncherPickups, gatlingGunPickups, fireballs, setLastShootTime, getLastShootTime } from './modules/state.js';
import { updateUI, soundToggleEl, showPickupHint, hidePickupHint, showNotification, updateMenuStats, gameOverEl } from './modules/ui.js';
import { createSun, createEnvironment } from './modules/environment.js';
import { spawnEnemies, createTeleportEffect } from './modules/enemies.js';
import { weapon, machineGun, sniperRifle, shotgun, rocketLauncher, gatlingGun, shoot, reload, updateBulletProjectiles } from './modules/weapons.js';
import { checkForHealthPickups } from './modules/powerups.js';
import { interactWithPickups, toggleZoom } from './modules/input.js';


// Renderer setup
// Scene setup
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Create the sun
const sun = createSun();

// Camera setup
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.6; // Eye level
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
renderer.outputColorSpace = THREE.SRGBColorSpace; // Better color rendering
document.body.appendChild(renderer.domElement);

// Controls setup
export const controls = new PointerLockControls(camera, document.body);
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
export let canJump = false;
export let velocity = new THREE.Vector3();

// Joystick variables
let joystick = null;
let joystickMovement = { x: 0, y: 0 };
let isJoystickActive = false;
let joystickIntensity = 0; // Track joystick force for variable movement speed

// Touch sensitivity for mobile controls
let touchSensitivity = 2.0; // Increased for better responsiveness

// Variables for touch-based aiming
let lastTouchX = 0;
let lastTouchY = 0;
let isTouchAiming = false;

scene.add(camera);

// Add classic Mickey-style environment
createEnvironment();

// Physics settings
const gravity = 9.8;
let prevTime = performance.now();

// Lighting - IMPORTANT for visibility
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Increased intensity
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increased intensity
dirLight.position.set(20, 30, 20); // Position higher and further away for better shadow angles
dirLight.castShadow = true;

// Configure shadow properties
dirLight.shadow.mapSize.width = 2048;  // Higher resolution shadows
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
dirLight.shadow.bias = -0.0005; // Reduce shadow acne

// Create a visual target for the light to look at
const lightTarget = new THREE.Object3D();
lightTarget.position.set(0, 0, 0);
scene.add(lightTarget);
dirLight.target = lightTarget;

// Add shadow camera helper for debugging
if (DEBUG) {
    const shadowHelper = new THREE.CameraHelper(dirLight.shadow.camera);
    scene.add(shadowHelper);
}

scene.add(dirLight);

// Add a hemisphere light for better overall lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
scene.add(hemiLight);

// Audio setup
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

// Get the audio context from the listener for later use
const audioContext = audioListener.context;

// Sound effects
const soundEffects = {
    shoot: new THREE.Audio(audioListener),
    reload: new THREE.Audio(audioListener),
    enemyDeath: new THREE.Audio(audioListener),
    pickupHealth: new THREE.Audio(audioListener),
    playerHurt: new THREE.Audio(audioListener),
    sniperShoot: new THREE.Audio(audioListener),
    shotgunBlast: new THREE.Audio(audioListener),
    rocketLaunch: new THREE.Audio(audioListener),
    teleport: new THREE.Audio(audioListener),
    thud: new THREE.Audio(audioListener),
    waveStart: new THREE.Audio(audioListener),
    fireball: new THREE.Audio(audioListener)
};

// Audio loader
const audioLoader = new THREE.AudioLoader();

// Load sound effects with retry mechanism
function loadSoundEffects() {
    const soundUrls = {
        shoot: 'https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3',
        reload: 'https://assets.mixkit.co/active_storage/sfx/1666/1666-preview.mp3',
        enemyDeath: 'https://assets.mixkit.co/active_storage/sfx/3168/3168-preview.mp3',
        pickupHealth: 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3',
        playerHurt: 'https://assets.mixkit.co/active_storage/sfx/2155/2155-preview.mp3',
        sniperShoot: 'https://assets.mixkit.co/active_storage/sfx/1670/1670-preview.mp3',
        shotgunBlast: 'https://assets.mixkit.co/active_storage/sfx/1678/1678-preview.mp3',
        rocketLaunch: 'https://assets.mixkit.co/active_storage/sfx/1184/1184-preview.mp3',
        teleport: 'https://assets.mixkit.co/active_storage/sfx/1489/1489-preview.mp3',
        thud: 'https://assets.mixkit.co/active_storage/sfx/3046/3046-preview.mp3',
        waveStart: 'https://assets.mixkit.co/active_storage/sfx/2780/2780-preview.mp3',
        fireball: 'https://assets.mixkit.co/active_storage/sfx/2656/2656-preview.mp3'
    };
    
    // Function to load a single sound with retry
    function loadSound(soundName, url, retryCount = 0) {
        const maxRetries = 3;
        
        audioLoader.load(
            url,
            // Success callback
            (buffer) => {
                if (soundEffects[soundName]) {
                    soundEffects[soundName].setBuffer(buffer);
                    soundEffects[soundName].setVolume(0.5);
                    if (DEBUG) {
                        console.log(`Sound loaded successfully: ${soundName}`);
                    }
                }
            },
            // Progress callback
            (xhr) => {
                if (DEBUG) {
                    console.log(`${soundName} ${(xhr.loaded / xhr.total * 100)}% loaded`);
                }
            },
            // Error callback
            (error) => {
                console.error(`Error loading sound ${soundName}:`, error);
                
                // Retry if not exceeded max retries
                if (retryCount < maxRetries) {
                    console.log(`Retrying ${soundName} (${retryCount + 1}/${maxRetries})...`);
                    setTimeout(() => {
                        loadSound(soundName, url, retryCount + 1);
                    }, 1000); // Wait 1 second before retrying
                }
            }
        );
    }
    
    // Load all sounds
    for (const [soundName, url] of Object.entries(soundUrls)) {
        loadSound(soundName, url);
    }
}

// Play sound effect if enabled
export function playSound(sound, volume) {
    if (DEBUG) {
        console.log(`Attempting to play sound: ${sound}, Sound enabled: ${gameState.soundEnabled}, Sound exists: ${!!soundEffects[sound]}, Has buffer: ${soundEffects[sound] ? !!soundEffects[sound].buffer : false}`);
    }
    
    if (gameState.soundEnabled && soundEffects[sound] && soundEffects[sound].buffer) {
        if (soundEffects[sound].isPlaying) {
            soundEffects[sound].stop();
        }
        if (volume !== undefined) {
            soundEffects[sound].setVolume(volume);
        }
        soundEffects[sound].play();
        
        if (DEBUG) {
            console.log(`Playing sound: ${sound}`);
        }
    } else if (DEBUG) {
        if (!gameState.soundEnabled) {
            console.log(`Sound not played: Sound is disabled`);
        } else if (!soundEffects[sound]) {
            console.log(`Sound not played: Sound "${sound}" does not exist`);
        } else if (!soundEffects[sound].buffer) {
            console.log(`Sound not played: Sound "${sound}" has no buffer (not loaded yet)`);
        }
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
    // Only restart the game if game over and not clicking on buttons
    // This prevents the game from restarting when clicking on the game over screen buttons
    if (gameState.gameOver && !gameState.clickedGameOverButton) {
        // If game is over, immediately exit pointer lock to prevent accidental restart
        safeExitPointerLock();
        return;
    }
    
    // Don't automatically start the game when controls are locked
    // The game should only start when the startGame function is called
});

// Function to toggle the menu
function toggleMenu() {
    // Don't toggle menu if on title screen or game not started
    if (!gameState.gameStarted) return;
    
    const menuScreen = document.getElementById('menuScreen');
    menuScreen.style.willChange = 'opacity';  // Hint browser to optimize
    
    // Toggle menu state
    gameState.menuOpen = !gameState.menuOpen;
    
    if (gameState.menuOpen) {
        // Update menu stats
        updateMenuStats();
        
        // Show menu using opacity instead of display
        menuScreen.style.opacity = '1';
        menuScreen.style.pointerEvents = 'auto';
        
        // Unlock pointer to allow interaction with menu
        controls.unlock();
        
        // Reset movement keys to prevent movement when menu is closed
        moveForward = false;
        moveBackward = false;
        moveLeft = false;
        moveRight = false;
    } else {
        // Hide menu
        menuScreen.style.opacity = '0';
        menuScreen.style.pointerEvents = 'none';
        
        // Lock controls to resume game
        controls.lock();
    }
}

// Add a new unlock event listener that only handles game over
controls.addEventListener('unlock', () => {
    if (gameState.gameStarted && !gameState.gameOver && !gameState.menuOpen) {
        // Only open menu if game is running and menu isn't already open
        toggleMenu();
    }
});

document.addEventListener('keydown', (event) => {
    if (gameState.gameOver) return;
    
    // Don't process keyboard events if on title screen
    if (!gameState.gameStarted && event.code !== 'Escape') return;
    
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
                // Prevent jumping if holding a gatling gun
                if (gameState.currentGunType === 'gatlingGun') {
                    // Maybe play a sound or show a notification to indicate it's too heavy to jump
                    showNotification("Too heavy to jump!");
                    playSound('thud', 0.3);
                } else {
                    velocity.y = 5.0; // Jump velocity
                    canJump = false;
                }
            }
            break;
        case 'KeyR':
            reload();
            break;
        case 'KeyE':
            interactWithPickups();
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

// This event listener is now handled in the checkGameOver function
// restartButton.addEventListener('click', () => {
//     restartGame();
//     controls.lock();
// });

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

// Touch event handlers for mobile devices
if (isMobileDevice()) {
    // Variables to track touch movement for aiming
    let lastTouchX = 0;
    let lastTouchY = 0;
    // touchSensitivity is now defined globally
    
    // Variables for long press detection (for pickup/interact)
    let touchStartTime = 0;
    let longPressTimer = null;
    const longPressDuration = 500; // milliseconds
    
    // Handle touch start (equivalent to mousedown)
    renderer.domElement.addEventListener('touchstart', function(e) {
        e.preventDefault();
        
        // Resume audio context on user interaction
        if (audioContext && audioContext.state === "suspended") {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
            });
        }
        
        // Store the initial touch position
        if (e.touches.length > 0) {
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }
        
        // Check if touching joystick or shoot button
        const joystickArea = document.getElementById('joystick-container');
        const shootArea = document.getElementById('shoot-button');
        if (!joystickArea || !shootArea) return;
        
        const joystickRect = joystickArea.getBoundingClientRect();
        const shootRect = shootArea.getBoundingClientRect();
        
        // Check if touch is in joystick or shoot button area
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            if ((touch.clientX >= joystickRect.left && 
                touch.clientX <= joystickRect.right && 
                touch.clientY >= joystickRect.top && 
                touch.clientY <= joystickRect.bottom) ||
               (touch.clientX >= shootRect.left && 
                touch.clientX <= shootRect.right && 
                touch.clientY >= shootRect.top && 
                touch.clientY <= shootRect.bottom)) {
                return; // Don't start shooting if touching control areas
            }
        }
        
        // If game is active, trigger shoot
        if (controls.isLocked && !gameState.gameOver && !gameState.menuOpen) {
            // Don't trigger shoot if tapping on pickup hint
            if (e.target && e.target.id === 'pickupHint') {
                return;
            }
            
            gameState.isMouseDown = true;
            shoot();
        } else if (!controls.isLocked && !gameState.gameOver) {
            // Lock controls if not already locked
            controls.lock();
        }
    }, { passive: false });
    
    // Handle touch move (for aiming)
    renderer.domElement.addEventListener('touchmove', function(e) {
        e.preventDefault();
        
        if (e.touches.length > 0 && controls.isLocked) {
            // Calculate touch movement delta
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            const deltaX = touchX - lastTouchX;
            const deltaY = touchY - lastTouchY;
            
            // Detect swipe up for jump
            if (deltaY < -50 && Math.abs(deltaX) < Math.abs(deltaY)) {
                // Swipe up detected - trigger jump
                if (canJump === true) {
                    velocity.y += 350;
                    canJump = false;
                }
            }
            
            // We no longer update camera rotation here since we're using the aiming joystick
            // Just update the last touch position for jump detection
            lastTouchX = touchX;
            lastTouchY = touchY;
        }
    }, { passive: false });
    
    // Handle touch end (equivalent to mouseup)
    renderer.domElement.addEventListener('touchend', function(e) {
        e.preventDefault();
        
        // Stop shooting when touch ends
        gameState.isMouseDown = false;
        
        // If using audio context, resume it on first interaction
        if (audioContext && audioContext.state === "suspended") {
            audioContext.resume();
        }
    }, { passive: false });
    
    // Handle multi-touch for special actions
    renderer.domElement.addEventListener('touchstart', function(e) {
        // If we have two or more touches, treat as right-click (for zoom with sniper)
        if (e.touches.length >= 2 && controls.isLocked && !gameState.gameOver) {
            if (gameState.currentGunType === 'sniperRifle') {
                toggleZoom();
            }
        }
    }, { passive: false });
}

// Sound toggle
if (soundToggleEl) {
    soundToggleEl.addEventListener('click', () => {
        gameState.soundEnabled = !gameState.soundEnabled;
        soundToggleEl.textContent = gameState.soundEnabled ? '🔊' : '🔇';
    });
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
    
    // Recover camera position - only adjust by the recoil amount, preserving any jump height
    if (gameState.cameraOriginalY) {
        let cameraRecoil = 0.05; // Default
        
        if (gameState.currentGunType === 'sniperRifle') {
            cameraRecoil = 0.1;
        } else if (gameState.currentGunType === 'shotgun') {
            cameraRecoil = 0.12;
        }
        
        // Only adjust the recoil portion, not the entire Y position
        camera.position.y = camera.position.y - (cameraRecoil * recovery);
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
        
        // Reset recoil effect on bullets
        gameState.currentRecoil = { x: 0, y: 0 };
    }
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

// Restart game function
// Function to restart game
export function restartGame() {
    // Remove the document click handler that prevents pointer lock
    const gameOverScreen = document.getElementById('gameOver');
    gameOverScreen.style.display = 'none';
    
    // Reset the submit button and status message
    const submitButton = document.getElementById('submitScoreButton');
    if (submitButton) {
        // Create a new button to remove all event listeners
        const newSubmitButton = submitButton.cloneNode(true);
        newSubmitButton.disabled = false;
        newSubmitButton.textContent = 'SUBMIT SCORE';
        newSubmitButton.style.backgroundColor = '#3a86ff';
        newSubmitButton.style.display = 'block'; // Reset display to visible
        submitButton.parentNode.replaceChild(newSubmitButton, submitButton);
    }
    
    const statusElement = document.getElementById('scoreSubmitStatus');
    if (statusElement) {
        statusElement.style.display = 'none';
    }
    
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
    gameState.foundGatlingGun = false; // Reset Gatling gun flag
    gameState.menuOpen = false; // Reset menu state
    gameState.clickedGameOverButton = false; // Reset button click flag
    
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
    gatlingGun.visible = false;
    
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
    
    // Reset fireballs
    for (const fireball of fireballs) {
        scene.remove(fireball.mesh);
    }
    fireballs.length = 0;
    
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

// Function to check and resume audio context
function resumeAudioContext() {
    if (audioContext && audioContext.state === "suspended") {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
        }).catch(error => {
            console.error('Error resuming AudioContext:', error);
        });
    }
}

// Initialize the game
function init() {
    if (!checkWebGLSupport()) {
        document.getElementById('webgl-error').style.display = 'block';
        return;
    }
    
    // Check if this is the first visit
    checkFirstVisit();
    
    // Try to resume audio context
    resumeAudioContext();
    
    // Initialize virtual joystick for mobile
    if (isMobileDevice()) {
        initJoystick();
        // Apply mobile-specific optimizations
        setupMobileOptimizations();
        // Reduce shadow quality for better performance
        reduceShadowQualityForMobile();
    }
    
    // Create weapons
    camera.add(weapon);
    camera.add(machineGun);
    camera.add(sniperRifle);
    camera.add(shotgun);
    camera.add(rocketLauncher);
    camera.add(gatlingGun);
    
    // Set up menu button event listeners
    document.getElementById('resumeButton').addEventListener('click', toggleMenu);
    document.getElementById('restartMenuButton').addEventListener('click', () => {
        toggleMenu(); // Close menu
        restartGame(); // Restart game
    });
    
    // Set up title screen start button
    document.getElementById('startGameButton').addEventListener('click', startGame);
    
    // Set initial sound toggle state
    if (soundToggleEl) {
        soundToggleEl.textContent = gameState.soundEnabled ? '🔊' : '🔇';
    }
    
    // Update UI after elements are initialized
    updateUI();
    
    // Only spawn enemies if game has started
    if (gameState.gameStarted) {
        spawnEnemies();
    }
    
    // Initialize leaderboard buttons
    initLeaderboardButtons();
}

// Initialize the game
init();

// Check if this is the first visit and show title screen if needed
function checkFirstVisit() {
    // Always show the title screen
    gameState.firstVisit = true;
    gameState.gameStarted = false;
    showTitleScreen();
    
    // Note: We're keeping the localStorage functionality for other features
    // that might use the first visit flag, but not using it to determine
    // whether to show the title screen
    if (!localStorage.getItem('hasVisitedBefore')) {
        localStorage.setItem('hasVisitedBefore', 'true');
    }
}

// Generate a random funny username
function generateRandomUsername() {
    const adjectives = [
        "Epic", "Sneaky", "Mighty", "Sleepy", "Jumpy", "Grumpy", "Dizzy", "Sparkly", 
        "Wobbly", "Fluffy", "Bouncy", "Speedy", "Zesty", "Quirky", "Sassy", "Fuzzy",
        "Glitchy", "Wiggly", "Zippy", "Wacky", "Jazzy", "Snazzy", "Peppy", "Loopy"
    ];
    
    const nouns = [
        "Potato", "Ninja", "Panda", "Zombie", "Unicorn", "Llama", "Penguin", "Taco", 
        "Pickle", "Waffle", "Banana", "Raccoon", "Sloth", "Narwhal", "Donut", "Koala",
        "Wizard", "Robot", "Pirate", "Dino", "Gamer", "Goose", "Muffin", "Yeti"
    ];
    
    const numbers = Math.floor(Math.random() * 100);
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${randomAdjective}${randomNoun}${numbers}`;
}

// Show the title screen
function showTitleScreen() {
    document.getElementById('titleScreen').style.display = 'flex';
    
    // Pause game functionality
    gameState.gameStarted = false;
    
    // Lock controls
    controls.lock = function() {
        // Override to prevent locking while on title screen
        return false;
    };
    
    // Set a random username if one doesn't exist
    import('./leaderboard.js').then(module => {
        const playerName = module.getPlayerName();
        const playerNameInput = document.getElementById('titlePlayerNameInput');
        
        if (!playerName) {
            const randomUsername = generateRandomUsername();
            playerNameInput.value = randomUsername;
            // Don't save it yet, let the user confirm by starting the game
        } else {
            playerNameInput.value = playerName;
        }
    });
}

// Hide the title screen and start the game
function hideTitleScreen() {
    document.getElementById('titleScreen').style.display = 'none';
    
    // Restore controls
    controls.lock = PointerLockControls.prototype.lock;
    
    // Override lock method to check for mobile devices
    const originalLock = controls.lock;
    controls.lock = function() {
        if (isMobileDevice()) {
            // For mobile devices, just set isLocked to true without requesting pointer lock
            this.isLocked = true;
            this.dispatchEvent({ type: 'lock' });
            return true;
        } else {
            // For desktop, use the original lock method
            return originalLock.apply(this, arguments);
        }
    };
}

// Start the game from title screen
function startGame() {
    // Save player name from title screen input
    const playerNameInput = document.getElementById('titlePlayerNameInput');
    if (playerNameInput && playerNameInput.value.trim() !== '') {
        import('./leaderboard.js').then(module => {
            module.savePlayerName(playerNameInput.value.trim());
        });
    }
    
    // Hide title screen
    hideTitleScreen();
    
    // Try to resume audio context on game start
    resumeAudioContext();
    
    gameState.gameStarted = true;
    
    // Lock controls to start the game
    controls.lock();
    
    // Spawn initial enemies
    spawnEnemies();
}

// Animation loop
function animate() {
    // Only run game logic if game has started
    if (!gameState.gameStarted) {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
        return;
    }
    
    requestAnimationFrame(animate);
    
    // Calculate delta time
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    prevTime = time;
    
    // Update sun position to match directional light
    if (sun) {
        sun.position.copy(dirLight.position);
    }
    
    // Skip game logic if game is over, menu is open, or controls are not locked
    if (!gameState.gameOver && !gameState.menuOpen && controls.isLocked) {
        // Process recoil recovery
        processRecoilRecovery(delta);
        
        // Update bullet projectiles
        updateBulletProjectiles(delta);

        // Update Gatling gun barrel rotation
        if (gameState.currentGunType === 'gatlingGun' && gatlingGun) {
            const barrelAssembly = gatlingGun.userData.barrelAssembly;
            if (barrelAssembly) {
                if (gameState.isMouseDown && gameState.ammo > 0 && !gameState.isReloading) {
                    // Spin up the barrels
                    gameState.gatlingGunSpinSpeed = Math.min(
                        gameState.gatlingGunSpinSpeed + delta * 4,
                        gatlingGun.userData.maxSpinSpeed
                    );
                } else {
                    // Spin down the barrels
                    gameState.gatlingGunSpinSpeed = Math.max(
                        gameState.gatlingGunSpinSpeed - delta * 2,
                        0
                    );
                }
                
                // Apply rotation
                barrelAssembly.rotation.x += gameState.gatlingGunSpinSpeed;
            }
        }

        // Adjust movement speed based on weapon type
        if (gameState.currentGunType === 'gatlingGun') {
            gameState.movementSpeed = 0.6; // 40% movement penalty with Gatling gun
        } else {
            gameState.movementSpeed = 1.0; // Normal movement speed with other weapons
        }

        // Update fireballs
        for (let i = fireballs.length - 1; i >= 0; i--) {
            const fireball = fireballs[i];
            
            // Check if fireball has expired
            const currentTime = performance.now();
            if (currentTime - fireball.creationTime > fireball.lifetime) {
                scene.remove(fireball.mesh);
                fireballs.splice(i, 1);
                continue;
            }
            
            // Move fireball
            fireball.mesh.position.add(
                fireball.direction.clone().multiplyScalar(fireball.speed)
            );
            
            // Check for collisions with player
            const playerPosition = new THREE.Vector3();
            camera.getWorldPosition(playerPosition);
            const distanceToPlayer = fireball.mesh.position.distanceTo(playerPosition);
            
            if (distanceToPlayer < 1) {
                // Hit player
                playerTakeDamage(fireball.damage, fireball.mesh.position);
                
                // Create explosion effect
                createFireballExplosion(fireball.mesh.position);
                
                // Remove fireball
                scene.remove(fireball.mesh);
                fireballs.splice(i, 1);
                continue;
            }
            
            // Check for collisions with environment
            const rayDirection = fireball.direction.clone();
            const raycaster = new THREE.Raycaster(
                fireball.mesh.position.clone(),
                rayDirection,
                0,
                fireball.speed * 2
            );
            
            const intersects = raycaster.intersectObjects(collisionObjects);
            
            if (intersects.length > 0) {
                // Hit environment
                createFireballExplosion(fireball.mesh.position);
                
                // Remove fireball
                scene.remove(fireball.mesh);
                fireballs.splice(i, 1);
                continue;
            }
        }
        
        // Check if player is holding mouse button and needs to auto-reload
        if (gameState.isMouseDown && gameState.ammo <= 0 && !gameState.isReloading) {
            reload();
            
            // Add haptic feedback for auto-reload on mobile
            if (isMobileDevice() && navigator.vibrate && gameState.vibrationEnabled) {
                navigator.vibrate([20, 50, 20]);
            }
        }
        
        // Handle continuous firing for all weapons on mobile or machine gun on any device
        if (gameState.isMouseDown && gameState.ammo > 0 && !gameState.isReloading) {
            const currentTime = performance.now();
            let fireRate = 0;
            
            // Set fire rate based on weapon type
            if (gameState.currentGunType === 'machineGun') {
                fireRate = 100; // Fast fire rate for machine gun
            } else if (gameState.currentGunType === 'gatlingGun') {
                fireRate = 40; // Very fast fire rate for gatling gun (faster than machine gun)
            } else if (isMobileDevice()) {
                // On mobile, enable continuous firing for all weapons with appropriate rates
                switch (gameState.currentGunType) {
                    case 'pistol':
                        fireRate = 300; // Slower fire rate for pistol
                        break;
                    case 'sniperRifle':
                        fireRate = 800; // Very slow fire rate for sniper
                        break;
                    case 'shotgun':
                        fireRate = 600; // Slow fire rate for shotgun
                        break;
                    case 'rocketLauncher':
                        fireRate = 1000; // Slowest fire rate for rocket launcher
                        break;
                    default:
                        fireRate = 400; // Default fire rate
                }
            }
            
            // Fire weapon if enough time has passed since last shot
            if (fireRate > 0 && currentTime - getLastShootTime() > fireRate) {
                shoot();
                setLastShootTime(currentTime);
            }
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
        
        if (isJoystickActive && isMobileDevice()) {
            // Use joystick values for mobile
            direction.z = joystickMovement.y; // Positive Y is backward, negative Y is forward
            direction.x = joystickMovement.x;
        } else {
            // Use keyboard for desktop
            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
        }
        
        direction.normalize();
        
        // Set velocity based on direction
        if (isJoystickActive && isMobileDevice()) {
            // Smoother movement with joystick - use the actual values for variable speed
            // Use joystickIntensity to control movement speed based on how far the joystick is pushed
            const speedMultiplier = 5.0 * joystickIntensity * gameState.movementSpeed;
            velocity.z = direction.z * speedMultiplier;
            velocity.x = direction.x * speedMultiplier;
        } else {
            // Keyboard movement (binary on/off)
            if (moveForward || moveBackward) velocity.z = direction.z * 5.0 * gameState.movementSpeed;
            else velocity.z = 0;
            
            if (moveLeft || moveRight) velocity.x = direction.x * 5.0 * gameState.movementSpeed;
            else velocity.x = 0;
        }
        
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
            
            // Special handling for ninja enemies - teleportation
            if (enemy.type === 'ninja') {
                const currentTime = performance.now();
                const timeSinceLastTeleport = currentTime - enemy.mesh.userData.lastTeleportTime;
                
                // Check if it's time to prepare for teleportation
                if (!enemy.mesh.userData.teleportReady && 
                    timeSinceLastTeleport > enemy.mesh.userData.teleportCooldown) {
                    
                    // Start teleport effect - make particles visible
                    enemy.mesh.userData.teleportReady = true;
                    enemy.mesh.userData.particles.forEach(particle => {
                        particle.material.opacity = 0.8;
                    });
                    
                    // Schedule actual teleport in 1 second
                    setTimeout(() => {
                        if (!enemy.mesh.parent) return; // Enemy might be dead
                        
                        // Find a new position to teleport to
                        const playerPos = new THREE.Vector3();
                        camera.getWorldPosition(playerPos);
                        
                        // Random angle and distance from player (between 5-10 units away)
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 5 + Math.random() * 5;
                        
                        // Calculate new position
                        const newX = playerPos.x + Math.sin(angle) * distance;
                        const newZ = playerPos.z + Math.cos(angle) * distance;
                        
                        // Create teleport effect at old position
                        createTeleportEffect(enemy.mesh.position.clone());
                        
                        // Teleport
                        enemy.mesh.position.set(newX, enemy.mesh.position.y, newZ);
                        
                        // Create teleport effect at new position
                        createTeleportEffect(enemy.mesh.position.clone());
                        
                        // Reset teleport state
                        enemy.mesh.userData.teleportReady = false;
                        enemy.mesh.userData.lastTeleportTime = currentTime;
                        enemy.mesh.userData.teleportCooldown = 3000 + Math.random() * 2000; // 3-5 seconds
                        
                        // Hide particles
                        enemy.mesh.userData.particles.forEach(particle => {
                            particle.material.opacity = 0;
                        });
                        
                        // Update last position to prevent stuck detection
                        enemy.lastPosition.copy(enemy.mesh.position);
                        enemy.stuckTime = 0;
                    }, 1000);
                }
                
                // Animate particles if teleport is preparing
                if (enemy.mesh.userData.teleportReady) {
                    enemy.mesh.userData.particles.forEach(particle => {
                        // Orbit around the ninja
                        const time = performance.now() * 0.003;
                        const radius = 0.5;
                        particle.position.x = Math.sin(time + particle.position.y * 5) * radius;
                        particle.position.z = Math.cos(time + particle.position.y * 5) * radius;
                    });
                }
                
                // Handle katana slashing animation
                const timeSinceLastSlash = currentTime - enemy.mesh.userData.lastSlashTime;
                
                // Check if ninja is close enough to player to slash
                const distanceToPlayer = enemy.mesh.position.distanceTo(camera.position);
                
                // If not currently slashing, check if it's time to slash
                if (!enemy.mesh.userData.isSlashing) {
                    // Slash when close to player and cooldown has passed
                    if (distanceToPlayer < 3 && timeSinceLastSlash > enemy.mesh.userData.slashCooldown) {
                        // Start slash animation
                        enemy.mesh.userData.isSlashing = true;
                        enemy.mesh.userData.slashStartTime = currentTime;
                        
                        // Play slash sound
                        playSound('teleport', 0.3); // Reuse teleport sound for now
                        
                        // Create slash effect
                        createSlashEffect(enemy.mesh.position.clone(), directionToPlayer);
                        
                        // Deal damage to player if very close
                        if (distanceToPlayer < 2) {
                            playerTakeDamage(10, enemy.mesh.position);
                        }
                    }
                } else {
                    // Currently slashing, animate the katana
                    const slashProgress = (currentTime - enemy.mesh.userData.slashStartTime) / enemy.mesh.userData.slashDuration;
                    
                    if (slashProgress >= 1) {
                        // Slash animation complete
                        enemy.mesh.userData.isSlashing = false;
                        enemy.mesh.userData.lastSlashTime = currentTime;
                        
                        // Reset katana to base rotation
                        if (enemy.mesh.userData.katana) {
                            enemy.mesh.userData.katana.rotation.copy(enemy.mesh.userData.katanaBaseRotation);
                        }
                    } else {
                        // Animate the slash
                        if (enemy.mesh.userData.katana) {
                            // Swing the katana in an arc
                            const swingAngle = Math.PI * 1.5 * Math.sin(slashProgress * Math.PI);
                            enemy.mesh.userData.katana.rotation.z = enemy.mesh.userData.katanaBaseRotation.z + swingAngle;
                            
                            // Also rotate slightly on other axes for a more dynamic slash
                            enemy.mesh.userData.katana.rotation.x = Math.sin(slashProgress * Math.PI * 2) * 0.5;
                            enemy.mesh.userData.katana.rotation.y = Math.cos(slashProgress * Math.PI) * 0.3;
                        }
                    }
                }
                
                // Always face the player
                enemy.mesh.lookAt(camera.position);
            }
            
            // Special handling for cyclops enemies - club swing attack
            if (enemy.type === 'cyclops') {
                const currentTime = performance.now();
                
                // Handle club swinging animation
                const timeSinceLastSwing = currentTime - enemy.mesh.userData.lastSwingTime;
                
                // Check if cyclops is close enough to player to swing club
                const distanceToPlayer = enemy.mesh.position.distanceTo(camera.position);
                
                // If not currently swinging, check if it's time to swing
                if (!enemy.mesh.userData.isSwinging) {
                    // Swing when close to player and cooldown has passed
                    if (distanceToPlayer < 5 && timeSinceLastSwing > enemy.mesh.userData.swingCooldown) {
                        // Start swing animation
                        enemy.mesh.userData.isSwinging = true;
                        enemy.mesh.userData.swingStartTime = currentTime;
                        
                        // Create club swing effect
                        createClubSwingEffect(enemy.mesh.position.clone(), directionToPlayer);
                        
                        // Deal heavy damage to player if close enough
                        if (distanceToPlayer < 4) {
                            playerTakeDamage(25, enemy.mesh.position);
                            
                            // Add screen shake for impact
                            cameraShake = 0.3;
                            
                            // Add knockback effect to player
                            const knockbackForce = directionToPlayer.clone().normalize().multiplyScalar(5);
                            velocity.add(knockbackForce);
                        }
                    }
                } else {
                    // Currently swinging, animate the club
                    const swingProgress = (currentTime - enemy.mesh.userData.swingStartTime) / enemy.mesh.userData.swingDuration;
                    
                    if (swingProgress >= 1) {
                        // Swing animation complete
                        enemy.mesh.userData.isSwinging = false;
                        enemy.mesh.userData.lastSwingTime = currentTime;
                        
                        // Reset club to base rotation
                        if (enemy.mesh.userData.club) {
                            enemy.mesh.userData.club.rotation.copy(enemy.mesh.userData.clubBaseRotation);
                        }
                    } else {
                        // Animate club swing
                        if (enemy.mesh.userData.club) {
                            // Swing the club in an arc
                            const swingAngle = Math.PI * 1.2 * Math.sin(swingProgress * Math.PI);
                            enemy.mesh.userData.club.rotation.z = enemy.mesh.userData.clubBaseRotation.z + swingAngle;
                            
                            // Also rotate the cyclops body slightly for more impact
                            enemy.mesh.rotation.y = Math.sin(swingProgress * Math.PI) * 0.5;
                        }
                    }
                }
                
                // Always face the player
                enemy.mesh.lookAt(camera.position);
            }
            
            // Special handling for fireball enemies
            if (enemy.type === 'fireball') {
                const currentTime = performance.now();
                
                // Animate fire particles
                if (enemy.mesh.userData.particles) {
                    enemy.mesh.userData.particles.forEach(particle => {
                        const time = currentTime * 0.001;
                        
                        // Oscillate particles
                        particle.mesh.position.x = particle.basePosition.x + Math.sin(time * 5 + particle.phase) * 0.1;
                        particle.mesh.position.y = particle.basePosition.y + Math.cos(time * 5 + particle.phase) * 0.1;
                        particle.mesh.position.z = particle.basePosition.z + Math.sin(time * 5 + particle.phase + Math.PI/2) * 0.1;
                    });
                }
                
                // Get distance to player
                const distanceToPlayer = enemy.mesh.position.distanceTo(camera.position);
                
                // Check if enemy has line of sight to player
                const raycaster = new THREE.Raycaster(
                    enemy.mesh.position.clone(),
                    directionToPlayer,
                    0,
                    distanceToPlayer
                );
                
                const intersects = raycaster.intersectObjects(collisionObjects);
                const hasLineOfSight = intersects.length === 0;
                
                // Store line of sight status
                enemy.mesh.userData.hasLineOfSight = hasLineOfSight;
                
                // If enemy has line of sight and cooldown has passed, shoot fireball
                const timeSinceLastFireball = currentTime - enemy.mesh.userData.lastFireballTime;
                
                if (hasLineOfSight && timeSinceLastFireball > enemy.mesh.userData.fireballCooldown && distanceToPlayer < 20) {
                    // Start charging fireball
                    if (!enemy.mesh.userData.isCharging) {
                        enemy.mesh.userData.isCharging = true;
                        enemy.mesh.userData.chargeStartTime = currentTime;
                        
                        // Make mouth glow brighter during charging
                        const mouth = enemy.mesh.children.find(child => 
                            child.position.z > 0.4 && child.position.y < 0);
                        
                        if (mouth) {
                            mouth.material.emissiveIntensity = 1.0;
                            mouth.scale.set(1.5, 1.5, 1.5);
                        }
                    } else {
                        // Check if charging is complete
                        const chargeTime = currentTime - enemy.mesh.userData.chargeStartTime;
                        
                        if (chargeTime >= enemy.mesh.userData.chargeDuration) {
                            // Reset charging state
                            enemy.mesh.userData.isCharging = false;
                            enemy.mesh.userData.lastFireballTime = currentTime;
                            
                            // Reset mouth appearance
                            const mouth = enemy.mesh.children.find(child => 
                                child.position.z > 0.4 && child.position.y < 0);
                            
                            if (mouth) {
                                mouth.material.emissiveIntensity = 0.5;
                                mouth.scale.set(1, 1, 1);
                            }
                            
                            // Create fireball
                            const fireballPosition = enemy.mesh.position.clone();
                            fireballPosition.y += 0.1; // Adjust height
                            fireballPosition.add(directionToPlayer.clone().multiplyScalar(0.7)); // Start in front of mouth
                            
                            createFireball(fireballPosition, directionToPlayer);
                        } else {
                            // Animate charging
                            const chargeProgress = chargeTime / enemy.mesh.userData.chargeDuration;
                            
                            // Pulse mouth during charging
                            const mouth = enemy.mesh.children.find(child => 
                                child.position.z > 0.4 && child.position.y < 0);
                            
                            if (mouth) {
                                const pulseScale = 1.5 + Math.sin(chargeProgress * Math.PI * 10) * 0.3;
                                mouth.scale.set(pulseScale, pulseScale, pulseScale);
                            }
                        }
                    }
                }
                
                // Movement behavior - maintain distance from player if has line of sight
                if (hasLineOfSight) {
                    // If too close to player, move away
                    if (distanceToPlayer < enemy.mesh.userData.preferredDistance) {
                        // Move away from player
                        const moveDirection = directionToPlayer.clone().negate();
                        enemy.mesh.position.add(moveDirection.multiplyScalar(enemy.speed));
                    } else if (distanceToPlayer > enemy.mesh.userData.preferredDistance + 5) {
                        // If too far, move closer
                        enemy.mesh.position.add(directionToPlayer.clone().multiplyScalar(enemy.speed * 0.5));
                    } else {
                        // At good distance, strafe sideways
                        const strafeDirection = new THREE.Vector3(-directionToPlayer.z, 0, directionToPlayer.x);
                        const strafeAmount = Math.sin(currentTime * 0.001) * enemy.speed * 0.5;
                        enemy.mesh.position.add(strafeDirection.multiplyScalar(strafeAmount));
                    }
                } else {
                    // No line of sight, try to get closer to player
                    enemy.mesh.position.add(directionToPlayer.clone().multiplyScalar(enemy.speed * 0.7));
                }
                
                // Always face the player
                enemy.mesh.lookAt(camera.position);
            }
            
            // Check if enemy is stuck by comparing current position to last position
            const movementAmount = enemy.mesh.position.distanceTo(enemy.lastPosition);
            if (movementAmount < 0.01) {
                enemy.stuckTime += delta;
                
                // If enemy has been stuck for too long (3 seconds), teleport it to a new position
                if (enemy.stuckTime > 3) {
                    debugLog('Enemy stuck for too long, teleporting to new position');
                    
                    // Find a new position around the player
                    const playerPosition = new THREE.Vector3();
                    camera.getWorldPosition(playerPosition);
                    
                    // Try to find a valid position outside buildings
                    let validPosition = false;
                    let newPosition = new THREE.Vector3();
                    let attempts = 0;
                    
                    // Try to find a position with line of sight to the player
                    while (!validPosition && attempts < 20) {
                        attempts++;
                        
                        // Random angle but biased towards player's direction
                        const randomAngle = Math.random() * Math.PI * 2;
                        // Distance between 8 and 15 units from player
                        const distance = 8 + Math.random() * 7;
                        
                        newPosition.x = playerPosition.x + Math.sin(randomAngle) * distance;
                        newPosition.z = playerPosition.z + Math.cos(randomAngle) * distance;
                        newPosition.y = enemy.mesh.position.y; // Keep the same height
                        
                        // Check if position is inside any building
                        let insideAnyBuilding = false;
                        
                        // Create a proper point for collision detection
                        const checkPoint = new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z);
                        
                        if (gameState.allBuildingBounds) {
                            for (const bounds of gameState.allBuildingBounds) {
                                if (bounds.containsPoint(checkPoint)) {
                                    // Position is inside a building, try again
                                    insideAnyBuilding = true;
                                    break;
                                }
                            }
                        }
                        
                        // Check if there's line of sight to the player from this position
                        let hasLineOfSight = false;
                        if (!insideAnyBuilding) {
                            const dirToPlayer = new THREE.Vector3().subVectors(playerPosition, newPosition).normalize();
                            const distToPlayer = newPosition.distanceTo(playerPosition);
                            
                            const raycaster = new THREE.Raycaster(
                                newPosition,
                                dirToPlayer,
                                0,
                                distToPlayer
                            );
                            
                            const intersections = raycaster.intersectObjects(collisionObjects);
                            hasLineOfSight = intersections.length === 0;
                            
                            // If we have line of sight, this is a valid position
                            if (hasLineOfSight) {
                                validPosition = true;
                            }
                        }
                    }
                    
                    if (!validPosition) {
                        debugLog('Could not find valid teleport position with line of sight, using fallback');
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
            let minObstacleDistance = Infinity;
            
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
                    2.5 // Check 2.5 units ahead in all directions (increased from 1.5)
                );
                
                // Check for intersections with obstacles
                const proximityIntersections = proximityRaycaster.intersectObjects(collisionObjects);
                
                if (proximityIntersections.length > 0) {
                    // Found a nearby obstacle
                    approachingObstacle = true;
                    
                    // Store the direction to the obstacle and its distance
                    if (proximityIntersections[0].distance < minObstacleDistance) {
                        minObstacleDistance = proximityIntersections[0].distance;
                        obstacleDirection = checkDirection;
                    }
                    
                    // If we're very close to an obstacle, increase stuck time to trigger pathfinding
                    if (proximityIntersections[0].distance < 1.0) {
                        enemy.stuckTime += delta * 0.8; // Increase stuck time faster when very close to obstacles
                    }
                }
            }
            
            // Determine if we need to change path
            const needsNewPath = (pathBlocked || approachingObstacle || enemy.stuckTime > 0.5) && 
                                (time - enemy.lastPathChange > 800); // Reduced from 1000ms to 800ms for more responsive pathfinding
            
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
                        4 // Check 4 units ahead (increased from 3)
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
                            score += obstacleAvoidance * 0.8; // Increased weight for obstacle avoidance from 0.5 to 0.8
                        }
                        
                        // Bonus for directions that might lead to line of sight with player
                        const potentialPosition = new THREE.Vector3().copy(enemy.mesh.position).add(
                            testDirection.clone().multiplyScalar(3)
                        );
                        const dirToPlayerFromPotential = new THREE.Vector3().subVectors(camera.position, potentialPosition).normalize();
                        const losRaycaster = new THREE.Raycaster(
                            potentialPosition,
                            dirToPlayerFromPotential,
                            0,
                            potentialPosition.distanceTo(camera.position)
                        );
                        const losIntersections = losRaycaster.intersectObjects(collisionObjects);
                        
                        if (losIntersections.length === 0) {
                            // This direction might lead to line of sight with player
                            score += 0.5; // Bonus for potential line of sight
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
                        const obstacleProximityFactor = 1.5 + (1.0 - Math.min(minObstacleDistance, 1.0));
                        enemy.pathfindingOffset.multiplyScalar(obstacleProximityFactor);
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
                    enemy.pathfindingOffset.multiplyScalar(2.5); // Stronger offset for desperate situations (increased from 2.0)
                    enemy.lastPathChange = time;
                    debugLog('Enemy trying random direction - all paths blocked');
                }
            }
            
            // Gradually reduce pathfinding offset over time if we're not stuck
            if (enemy.stuckTime < 0.1 && time - enemy.lastPathChange > 1500) {
                enemy.pathfindingOffset.multiplyScalar(0.92); // Faster reduction (from 0.95)
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
    if (gameState.currentGunType !== 'machineGun') {
        for (const pickup of machineGunPickups) {
            const distance = playerPosition.distanceTo(pickup.mesh.position);
            
            if (distance < 3 && distance < nearestDistance) { // Show hint within 3 units
                nearestDistance = distance;
                nearestPickupType = 'machineGun';
                foundNearbyPickup = true;
            }
        }
    }
    
    // Check for pistol pickups
    if (gameState.currentGunType !== 'pistol') {
        for (const pickup of pistolPickups) {
            const distance = playerPosition.distanceTo(pickup.mesh.position);
            
            if (distance < 3 && distance < nearestDistance) { // Show hint within 3 units
                nearestDistance = distance;
                nearestPickupType = 'pistol';
                foundNearbyPickup = true;
            }
        }
    }
    
    // Check for sniper rifle pickups
    if (gameState.currentGunType !== 'sniperRifle') {
        for (const pickup of sniperRiflePickups) {
            const distance = playerPosition.distanceTo(pickup.mesh.position);
            
            if (distance < 3 && distance < nearestDistance) { // Show hint within 3 units
                nearestDistance = distance;
                nearestPickupType = 'sniperRifle';
                foundNearbyPickup = true;
            }
        }
    }
    
    // Check for shotgun pickups
    if (gameState.currentGunType !== 'shotgun') {
        for (const pickup of shotgunPickups) {
            const distance = playerPosition.distanceTo(pickup.mesh.position);
            
            if (distance < 3 && distance < nearestDistance) { // Show hint within 3 units
                nearestDistance = distance;
                nearestPickupType = 'shotgun';
                foundNearbyPickup = true;
            }
        }
    }
    
    // Check for rocket launcher pickups
    if (gameState.currentGunType !== 'rocketLauncher') {
        for (const pickup of rocketLauncherPickups) {
            const distance = playerPosition.distanceTo(pickup.mesh.position);
            
            if (distance < 3 && distance < nearestDistance) { // Show hint within 3 units
                nearestDistance = distance;
                nearestPickupType = 'rocketLauncher';
                foundNearbyPickup = true;
            }
        }
    }
    
    // Check for gatling gun pickups
    if (gameState.currentGunType !== 'gatlingGun') {
        for (const pickup of gatlingGunPickups) {
            const distance = playerPosition.distanceTo(pickup.mesh.position);
            
            if (distance < 3 && distance < nearestDistance) { // Show hint within 3 units
                nearestDistance = distance;
                nearestPickupType = 'gatlingGun';
                foundNearbyPickup = true;
            }
        }
    }
    
    // Show or hide pickup hint
    if (foundNearbyPickup && nearestPickupType) {
        showPickupHint(nearestPickupType);
        gameState.nearbyPickup = nearestPickupType;
    } else {
        // Hide hint if no pickups are nearby
        hidePickupHint();
        gameState.nearbyPickup = null;
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
    
    // Check for expired rocket launcher pickups
    for (let i = rocketLauncherPickups.length - 1; i >= 0; i--) {
        const pickup = rocketLauncherPickups[i];
        const age = currentTime - pickup.timeCreated;
        
        if (age > WEAPON_TIMEOUT) {
            // Remove pickup
            pickup.isActive = false;
            scene.remove(pickup.mesh);
            rocketLauncherPickups.splice(i, 1);
        } else if (age > WEAPON_TIMEOUT - FADE_START) {
            // Fade out pickup
            const opacity = 1 - ((age - (WEAPON_TIMEOUT - FADE_START)) / FADE_START);
            fadePickupMesh(pickup.mesh, opacity);
        }
    }
    
    // Check for expired gatling gun pickups
    for (let i = gatlingGunPickups.length - 1; i >= 0; i--) {
        const pickup = gatlingGunPickups[i];
        const age = currentTime - pickup.timeCreated;
        
        if (age > WEAPON_TIMEOUT) {
            // Remove pickup
            pickup.isActive = false;
            scene.remove(pickup.mesh);
            gatlingGunPickups.splice(i, 1);
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

// Create a visual slash effect
function createSlashEffect(position, direction) {
    // Create a group for the slash effect
    const slashGroup = new THREE.Group();
    slashGroup.position.copy(position);
    
    // Make the slash face the direction
    slashGroup.lookAt(position.clone().add(direction));
    
    // Create the slash trail
    const slashGeometry = new THREE.PlaneGeometry(1.5, 0.3);
    const slashMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const slash = new THREE.Mesh(slashGeometry, slashMaterial);
    slash.position.set(0, 0, 0.5); // Position slightly in front
    slashGroup.add(slash);
    
    // Add a glow effect
    const glowGeometry = new THREE.PlaneGeometry(1.8, 0.5);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x9900FF, // Purple glow
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 0, 0.45); // Slightly behind the slash
    slashGroup.add(glow);
    
    // Add to scene
    scene.add(slashGroup);
    
    // Animate the slash effect
    const startTime = performance.now();
    const duration = 300; // 0.3 seconds
    
    function animateSlash() {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            // Remove slash effect
            scene.remove(slashGroup);
            return;
        }
        
        // Fade out
        slashMaterial.opacity = 0.7 * (1 - progress);
        glowMaterial.opacity = 0.5 * (1 - progress);
        
        // Stretch and move the slash as it progresses
        const stretchFactor = 1 + progress * 0.5;
        slash.scale.set(stretchFactor, 1, 1);
        glow.scale.set(stretchFactor, 1 + progress * 0.5, 1);
        
        // Rotate slightly for a more dynamic effect
        slashGroup.rotation.z += 0.05;
        
        requestAnimationFrame(animateSlash);
    }
    
    animateSlash();
}

// Create a visual club swing effect
function createClubSwingEffect(position, direction) {
    // Create a group for the club swing effect
    const swingGroup = new THREE.Group();
    
    // Create a shockwave-like effect
    const shockwaveGeometry = new THREE.RingGeometry(0.5, 2.5, 32);
    const shockwaveMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffcc00, 
        transparent: true, 
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
    
    // Orient the shockwave to face the direction
    shockwave.lookAt(direction);
    shockwave.position.copy(position);
    
    // Add some dust particles
    const particleCount = 15;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.2, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xbbbbbb, // Gray dust
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position particles in a cone shape in front of the club
        const angle = Math.random() * Math.PI / 2 - Math.PI / 4;
        const radius = 1 + Math.random() * 2;
        
        // Calculate position relative to the direction
        const particleDir = direction.clone();
        particleDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        particleDir.multiplyScalar(radius);
        
        particle.position.copy(position).add(particleDir);
        particle.position.y += Math.random() * 1 - 0.5; // Vary height
        
        particles.push({
            mesh: particle,
            velocity: particleDir.clone().normalize().multiplyScalar(0.05 + Math.random() * 0.1),
            gravity: 0.002 + Math.random() * 0.002
        });
        
        swingGroup.add(particle);
    }
    
    // Add impact marks
    const impactGeometry = new THREE.CircleGeometry(0.3 + Math.random() * 0.2, 8);
    const impactMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    
    const impact = new THREE.Mesh(impactGeometry, impactMaterial);
    impact.position.copy(position).add(direction.clone().multiplyScalar(2));
    impact.lookAt(position);
    impact.position.y = 0.05; // Just above ground
    swingGroup.add(impact);
    
    scene.add(swingGroup);
    
    // Animate the club swing effect
    function animateSwing() {
        const elapsed = (performance.now() - startTime) / 1000;
        
        if (elapsed > 1.0) {
            // Remove the effect after 1 second
            scene.remove(swingGroup);
            return;
        }
        
        // Fade out the shockwave and expand it
        const scale = 1 + elapsed * 2;
        shockwave.scale.set(scale, scale, scale);
        shockwave.material.opacity = 0.7 * (1 - elapsed);
        
        // Animate particles
        for (const particle of particles) {
            // Apply gravity
            particle.velocity.y -= particle.gravity;
            
            // Move particle
            particle.mesh.position.add(particle.velocity);
            
            // Fade out particle
            particle.mesh.material.opacity = 0.7 * (1 - elapsed);
            
            // Shrink particle
            const particleScale = 1 - elapsed * 0.5;
            particle.mesh.scale.set(particleScale, particleScale, particleScale);
        }
        
        // Fade out impact mark
        impact.material.opacity = 0.8 * (1 - elapsed);
        
        requestAnimationFrame(animateSwing);
    }
    
    const startTime = performance.now();
    animateSwing();
    
    // Play club swing sound
    playSound('thud', 0.5);
    
    return swingGroup;
}

// Create a fireball projectile
function createFireball(position, direction) {
    // Create a group for the fireball
    const fireballGroup = new THREE.Group();
    fireballGroup.position.copy(position);
    
    // Main fireball sphere
    const fireballGeometry = new THREE.SphereGeometry(0.3, 12, 12);
    const fireballMaterial = new THREE.MeshStandardMaterial({
        color: 0xff5500,
        emissive: 0xff3000,
        emissiveIntensity: 0.8,
        roughness: 0.3,
        metalness: 0.5
    });
    const fireball = new THREE.Mesh(fireballGeometry, fireballMaterial);
    fireballGroup.add(fireball);
    
    // Add fire particles
    const particleCount = 12;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 8, 8);
        const particleMaterial = new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? 0xff7700 : 0xff0000,
            emissive: Math.random() > 0.5 ? 0xff5500 : 0xff0000,
            emissiveIntensity: 0.7,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Random position around the fireball
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4
        );
        particle.position.copy(offset);
        
        particles.push({
            mesh: particle,
            basePosition: particle.position.clone(),
            phase: Math.random() * Math.PI * 2,
            speed: 0.03 + Math.random() * 0.03
        });
        
        fireballGroup.add(particle);
    }
    
    // Add a point light to make the fireball glow
    const light = new THREE.PointLight(0xff5500, 1, 3);
    light.position.set(0, 0, 0);
    fireballGroup.add(light);
    
    // Add to scene
    scene.add(fireballGroup);
    
    // Store fireball properties
    const fireballData = {
        mesh: fireballGroup,
        direction: direction.clone().normalize(),
        speed: 0.06, // Fireball speed
        damage: 15, // Damage to player
        particles: particles,
        light: light,
        creationTime: performance.now(),
        lifetime: 8000 // Increased from 5000 to 8000 ms to compensate for slower speed
    };
    
    // Add to fireballs array
    fireballs.push(fireballData);
    
    // Play fireball sound
    playSound('fireball', 0.5);
    
    // Animate the fireball
    animateFireball(fireballData);
    
    return fireballData;
}

// Animate a fireball
function animateFireball(fireballData) {
    const startTime = performance.now();
    
    function animate() {
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;
        const totalElapsed = currentTime - fireballData.creationTime;
        
        // Check if fireball has expired
        if (totalElapsed > fireballData.lifetime) {
            // Remove fireball
            scene.remove(fireballData.mesh);
            const index = fireballs.indexOf(fireballData);
            if (index !== -1) {
                fireballs.splice(index, 1);
            }
            return;
        }
        
        // Move fireball
        fireballData.mesh.position.add(
            fireballData.direction.clone().multiplyScalar(fireballData.speed)
        );
        
        // Animate particles
        fireballData.particles.forEach(particle => {
            const time = currentTime * 0.001;
            
            // Oscillate particles
            particle.mesh.position.x = particle.basePosition.x + Math.sin(time * 5 + particle.phase) * 0.1;
            particle.mesh.position.y = particle.basePosition.y + Math.cos(time * 5 + particle.phase) * 0.1;
            particle.mesh.position.z = particle.basePosition.z + Math.sin(time * 5 + particle.phase + Math.PI/2) * 0.1;
            
            // Pulse size
            const scale = 0.8 + Math.sin(time * 10 + particle.phase) * 0.2;
            particle.mesh.scale.set(scale, scale, scale);
        });
        
        // Pulse light intensity
        const time = currentTime * 0.001;
        fireballData.light.intensity = 1 + Math.sin(time * 10) * 0.3;
        
        // Check for collisions with player
        const playerPosition = new THREE.Vector3();
        camera.getWorldPosition(playerPosition);
        const distanceToPlayer = fireballData.mesh.position.distanceTo(playerPosition);
        
        if (distanceToPlayer < 1) {
            // Hit player
            playerTakeDamage(fireballData.damage, fireballData.mesh.position);
            
            // Create explosion effect
            createFireballExplosion(fireballData.mesh.position);
            
            // Remove fireball
            scene.remove(fireballData.mesh);
            const index = fireballs.indexOf(fireballData);
            if (index !== -1) {
                fireballs.splice(index, 1);
            }
            return;
        }
        
        // Check for collisions with environment
        const rayDirection = fireballData.direction.clone();
        const raycaster = new THREE.Raycaster(
            fireballData.mesh.position.clone(),
            rayDirection,
            0,
            fireballData.speed * 2
        );
        
        const intersects = raycaster.intersectObjects(collisionObjects);
        
        if (intersects.length > 0) {
            // Hit environment
            createFireballExplosion(fireballData.mesh.position);
            
            // Remove fireball
            scene.remove(fireballData.mesh);
            const index = fireballs.indexOf(fireballData);
            if (index !== -1) {
                fireballs.splice(index, 1);
            }
            return;
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Create a fireball explosion effect
function createFireballExplosion(position) {
    // Create a group for the explosion
    const explosionGroup = new THREE.Group();
    explosionGroup.position.copy(position);
    scene.add(explosionGroup);
    
    // Add explosion particles
    const particleCount = 20;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.2, 8, 8);
        const particleMaterial = new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? 0xff7700 : 0xff0000,
            emissive: Math.random() > 0.5 ? 0xff5500 : 0xff0000,
            emissiveIntensity: 0.7,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Random position
        particle.position.set(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        );
        
        // Random velocity
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1 + 0.05,
            (Math.random() - 0.5) * 0.1
        );
        
        particles.push({
            mesh: particle,
            velocity: velocity,
            gravity: 0.001 + Math.random() * 0.002
        });
        
        explosionGroup.add(particle);
    }
    
    // Add a flash effect
    const flashGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 1
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    explosionGroup.add(flash);
    
    // Add a point light
    const light = new THREE.PointLight(0xff5500, 2, 5);
    light.position.set(0, 0, 0);
    explosionGroup.add(light);
    
    // Play explosion sound
    playSound('explosion', 0.6);
    
    // Animate the explosion
    const startTime = performance.now();
    const duration = 1000; // 1 second
    
    function animateExplosion() {
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress >= 1) {
            // Remove explosion
            scene.remove(explosionGroup);
            return;
        }
        
        // Update particles
        particles.forEach(particle => {
            // Apply gravity
            particle.velocity.y -= particle.gravity;
            
            // Move particle
            particle.mesh.position.add(particle.velocity);
            
            // Fade out
            particle.mesh.material.opacity = 0.8 * (1 - progress);
            
            // Shrink
            const scale = 1 - progress * 0.5;
            particle.mesh.scale.set(scale, scale, scale);
        });
        
        // Flash effect
        if (progress < 0.2) {
            // Expand flash
            const flashScale = 1 + progress * 10;
            flash.scale.set(flashScale, flashScale, flashScale);
            flash.material.opacity = 1 - progress * 5;
        } else {
            flash.visible = false;
        }
        
        // Light effect
        light.intensity = 2 * (1 - progress);
        
        requestAnimationFrame(animateExplosion);
    }
    
    animateExplosion();
}

// Add a global document click handler to prevent pointer lock when game is over
document.body.addEventListener('click', (e) => {
    if (gameState.gameOver) {
        // If clicking outside the game over screen buttons, prevent pointer lock
        if (e.target.id !== 'restartButton' && 
            e.target.id !== 'submitScoreButton' && 
            e.target.id !== 'viewLeaderboardButton') {
            e.stopPropagation();
            safeExitPointerLock();
        }
    }
});

// Function to check if sounds are loaded properly
function checkSoundsLoaded() {
    let loadedCount = 0;
    let totalCount = 0;
    
    for (const sound in soundEffects) {
        totalCount++;
        if (soundEffects[sound].bulletffer) {
            loadedCount++;
        }
    }
    
    console.log(`Sound loading status: ${loadedCount}/${totalCount} sounds loaded`);
    
    if (loadedCount < totalCount) {
        console.log('Some sounds failed to load. This might be due to network issues or CORS restrictions.');
        
        // List unloaded sounds
        for (const sound in soundEffects) {
            if (!soundEffects[sound].buffer) {
                console.log(`Sound not loaded: ${sound}`);
            }
        }
    }
    
    return loadedCount === totalCount;
}

// Call this function after a delay to check if sounds are loaded
setTimeout(checkSoundsLoaded, 5000); // Check after 5 seconds

// Add mobile device detection utility
function isMobileDevice() {    // Check if device is actually mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    
    // Also check screen width for landscape tablet/mobile view
    const isSmallScreen = window.innerWidth <= 1024;
    
    return isMobile || isSmallScreen;
}

// Add this new function to handle orientation changes
function handleOrientationChange() {
    const isLandscape = window.innerWidth > window.innerHeight;
    debugLog('isLandscape: ' + isLandscape);
    
    // Get control elements
    const joystickContainer = document.getElementById('joystick-container');
    const shootButton = document.getElementById('shoot-button');
    
    // Use the existing isMobileDevice function which already checks screen size
    if (isMobileDevice()) {
        debugLog('Mobile device or small screen detected');
        // Always show movement joystick and shoot button on mobile devices
        if (joystickContainer) joystickContainer.style.display = 'block';
        if (shootButton) shootButton.style.display = 'block';

        // Adjust position for landscape mode if needed
        if (isLandscape) {
            if (joystickContainer) joystickContainer.style.bottom = '50px';
            if (shootButton) shootButton.style.bottom = '50px';
        } else {
            // Reset positions for portrait mode
            if (joystickContainer) joystickContainer.style.bottom = '100px';
            if (shootButton) shootButton.style.bottom = '100px';
        }
    } else {
        // Hide controls on non-mobile devices
        if (joystickContainer) joystickContainer.style.display = 'none';
        if (shootButton) shootButton.style.display = 'none';
    }
}

// Initialize and handle the virtual joystick
function initJoystick() {
    // Create movement joystick with nipplejs
    joystick = nipplejs.create({
        zone: document.getElementById('joystick-container'),
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'white',
        size: 150, // Increased from 120 for better touch area
        dynamicPage: true,
        fadeTime: 100,
        restOpacity: 0.8, // Increased opacity for better visibility
        lockX: false,
        lockY: false
    });
    
    // Handle movement joystick events
    joystick.on('start', function() {
        isJoystickActive = true;
        
        // Hide the move icon when joystick is active
        const moveIcon = document.getElementById('move-icon');
        if (moveIcon) moveIcon.style.display = 'none';
        
        // Resume audio context on joystick interaction
        if (audioContext && audioContext.state === "suspended") {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed by joystick interaction');
            });
        }
        
        // Add haptic feedback for devices that support it
        if (navigator.vibrate && gameState.vibrationEnabled) {
            navigator.vibrate(15); // Short vibration on joystick start
        }
    });
    
    joystick.on('end', function() {
        isJoystickActive = false;
        joystickMovement = { x: 0, y: 0 };
        // Reset movement flags when joystick is released
        moveForward = false;
        moveBackward = false;
        moveLeft = false;
        moveRight = false;
        
        // Show the move icon again when joystick is released
        const moveIcon = document.getElementById('move-icon');
        if (moveIcon) moveIcon.style.display = 'block';
    });
    
    joystick.on('move', function(evt, data) {
        // Get joystick movement data
        const force = Math.min(data.force, 1); // Normalize force between 0 and 1
        const angle = data.angle.radian;
        
        // Calculate x and y components
        joystickMovement.x = Math.cos(angle) * force;
        joystickMovement.y = Math.sin(angle) * force;
        
        // Set movement flags based on joystick position
        // Note: In joystick, up (negative Y) means forward, down (positive Y) means backward
        moveForward = joystickMovement.y < -0.3;  // Up direction (negative Y)
        moveBackward = joystickMovement.y > 0.3;  // Down direction (positive Y)
        moveLeft = joystickMovement.x < -0.3;     // Left direction
        moveRight = joystickMovement.x > 0.3;     // Right direction
        
        // Adjust movement speed based on joystick force for more precise control
        if (moveForward || moveBackward || moveLeft || moveRight) {
            joystickIntensity = force;
        } else {
            joystickIntensity = 0;
        }
    });

    // Add orientation change detection
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    // Initial check
    handleOrientationChange();
}

// Add mobile-specific optimizations
function setupMobileOptimizations() {
    if (!isMobileDevice()) return;
    
    // Handle shoot button
    const shootButton = document.getElementById('shoot-button');
    if (shootButton) {
        shootButton.addEventListener('touchstart', function(e) {
            e.preventDefault(); // Prevent default touch behavior
            
            // Don't shoot if game is paused or over
            if (gameState.menuOpen || gameState.gameOver || !controls.isLocked) return;
            
            // Start shooting
            gameState.isMouseDown = true;
            
            // Add haptic feedback for shooting
            if (navigator.vibrate && gameState.vibrationEnabled) {
                navigator.vibrate(25);
            }
        });
        
        shootButton.addEventListener('touchend', function(e) {
            e.preventDefault(); // Prevent default touch behavior
            
            // Stop shooting
            gameState.isMouseDown = false;
        });
    }
    
    // Add touch event for aiming (but not shooting)
    document.addEventListener('touchstart', function(e) {
        // Track the touch identifier for aiming
        let aimTouchId = null;
        
        // Don't process if game is paused or over
        if (gameState.menuOpen || gameState.gameOver || !controls.isLocked) return;
        
        // Check all touches to find one that's not on a control
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            
            // Get joystick and shoot button areas
            const joystickArea = document.getElementById('joystick-container');
            const shootArea = document.getElementById('shoot-button');
            const joystickRect = joystickArea.getBoundingClientRect();
            const shootRect = shootArea.getBoundingClientRect();
            
            // Check if this touch is NOT in joystick or shoot button area
            const touchingJoystick = (touch.clientX >= joystickRect.left && 
                                      touch.clientX <= joystickRect.right && 
                                      touch.clientY >= joystickRect.top && 
                                      touch.clientY <= joystickRect.bottom);
                                      
            const touchingShoot = (touch.clientX >= shootRect.left && 
                                   touch.clientX <= shootRect.right && 
                                   touch.clientY >= shootRect.top && 
                                   touch.clientY <= shootRect.bottom);
            
            // If touch is not on a control, use it for aiming
            if (!touchingJoystick && !touchingShoot) {
                // Start aiming with this touch
                isTouchAiming = true;
                aimTouchId = touch.identifier;
                
                // Store the initial touch position for aiming
                lastTouchX = touch.clientX;
                lastTouchY = touch.clientY;
                break;
            }
        }
        
        // // ADDED: Also trigger shooting when tapping outside control areas
        // gameState.isMouseDown = true;
        // shoot();
        
        // // Add haptic feedback for shooting
        // if (navigator.vibrate && gameState.vibrationEnabled) {
        //     navigator.vibrate(25);
        // }
    });
    
    document.addEventListener('touchmove', function(e) {
        // Don't process if game is paused/over
        if (gameState.menuOpen || gameState.gameOver || !controls.isLocked) return;
        
        // Handle aiming for all touches that aren't on joystick
        if (isTouchAiming) {
            // Find the touch being used for aiming
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                
                // Skip touches that are likely being used for joystick/shoot
                const joystickArea = document.getElementById('joystick-container');
                const shootArea = document.getElementById('shoot-button');
                const joystickRect = joystickArea.getBoundingClientRect();
                const shootRect = shootArea.getBoundingClientRect();
                
                const touchingJoystick = (touch.clientX >= joystickRect.left && 
                                          touch.clientX <= joystickRect.right && 
                                          touch.clientY >= joystickRect.top && 
                                          touch.clientY <= joystickRect.bottom);
                                          
                const touchingShoot = (touch.clientX >= shootRect.left && 
                                       touch.clientX <= shootRect.right && 
                                       touch.clientY >= shootRect.top && 
                                       touch.clientY <= shootRect.bottom);
                
                if (!touchingJoystick && !touchingShoot) {
                    // Calculate movement delta
                    const deltaX = touch.clientX - lastTouchX;
                    const deltaY = touch.clientY - lastTouchY;
                    
                    // Store new position
                    lastTouchX = touch.clientX;
                    lastTouchY = touch.clientY;
                    
                    // Apply movement to camera
                    if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
                        // Create and dispatch a synthetic mouse event for camera rotation
                        const mouseEvent = new MouseEvent('mousemove', {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            movementX: deltaX * touchSensitivity,
                            movementY: deltaY * touchSensitivity
                        });
                        
                        document.dispatchEvent(mouseEvent);
                    }
                    break;
                }
            }
        }
    });
    
    document.addEventListener('touchend', function(e) {
        // Check if all non-control touches are gone
        let hasNonControlTouch = false;
        
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            
            // Get control areas
            const joystickArea = document.getElementById('joystick-container');
            const shootArea = document.getElementById('shoot-button');
            const joystickRect = joystickArea.getBoundingClientRect();
            const shootRect = shootArea.getBoundingClientRect();
            
            const touchingJoystick = (touch.clientX >= joystickRect.left && 
                                      touch.clientX <= joystickRect.right && 
                                      touch.clientY >= joystickRect.top && 
                                      touch.clientY <= joystickRect.bottom);
                                      
            const touchingShoot = (touch.clientX >= shootRect.left && 
                                   touch.clientX <= shootRect.right && 
                                   touch.clientY >= shootRect.top && 
                                   touch.clientY <= shootRect.bottom);
            
            // If we found a touch that's not on a control, we're still aiming
            if (!touchingJoystick && !touchingShoot) {
                hasNonControlTouch = true;
                break;
            }
        }
        
        // If no non-control touches left, stop aiming
        if (!hasNonControlTouch) {
            isTouchAiming = false;
        }
        
        // If no touches left at all, stop shooting too
        if (e.touches.length === 0) {
            gameState.isMouseDown = false;
        }
    });
    
    // Add setting for vibration
    gameState.vibrationEnabled = true;
    
    // Add performance optimizations for mobile
    // Safely check if scene and scene.fog exist before modifying
    if (scene) {
        // Create fog if it doesn't exist
        if (!scene.fog) {
            scene.fog = new THREE.Fog(0x000000, 20, 80);
        } else {
            // Modify existing fog
            scene.fog.near = 20; // Reduce fog distance for better performance
            scene.fog.far = 80;
        }
    }
    
    // Note: We can't access dirLight here as it's not in scope
    // Mobile shadow quality is handled elsewhere
    
    // Listen for vibration toggle event
    document.addEventListener('toggleVibration', function(e) {
        gameState.vibrationEnabled = e.detail.enabled;
        console.log('Vibration ' + (gameState.vibrationEnabled ? 'enabled' : 'disabled'));
    });
}

// Listen for the custom enableAudio event
document.addEventListener('enableAudio', function() {
    // Resume audio context when the user explicitly enables audio
    resumeAudioContext();
    
    // Ensure sound is enabled in game state
    gameState.soundEnabled = true;
    
    console.log('Audio explicitly enabled by user');
});

// Function to reduce shadow quality for mobile devices
function reduceShadowQualityForMobile() {
    if (!isMobileDevice()) return;
    
    // Reduce shadow map size for better performance
    if (dirLight && dirLight.shadow) {
        dirLight.shadow.mapSize.width = 1024;  // Reduced from 2048
        dirLight.shadow.mapSize.height = 1024; // Reduced from 2048
    }
}