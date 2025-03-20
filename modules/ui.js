import { gameState, enemies } from './state.js';
import { isMobileDevice } from './utils.js';
import { playSound } from '../game.js';
import { interactWithPickups } from './input.js';

// DOM elements
const healthEl = document.getElementById('health');
const ammoEl = document.getElementById('ammo');
const bulletsEl = document.getElementById('bullets');
const enemiesEl = document.getElementById('enemies');
export const gameOverEl = document.getElementById('gameOver');
export const soundToggleEl = document.getElementById('soundToggle');

// Initialize damage overlay
export const damageOverlay = createDamageOverlay();

// Initialize UI elements - moved to the top level
export let roundNotification = createRoundNotification();
export let scoreDisplay = createScoreDisplay();

// Function to update UI
export function updateUI() {
  healthEl.textContent = `❤️ ${gameState.health}`;
  
  // Show ammo and reload status
  if (gameState.isReloading) {
      ammoEl.textContent = `🔄 Reload...`;
  } else {
      ammoEl.textContent = `🔫 ${gameState.ammo}/${gameState.maxAmmo}`;
  }
  
  // Hide bullets counter since we have unlimited ammo
  bulletsEl.style.display = 'none';
  
  // Update enemies remaining counter
  enemiesEl.textContent = `👾 ${enemies.length}`;
  
  // Update score display
  if (scoreDisplay) {
      scoreDisplay.textContent = `Score: ${gameState.score}`;
  }
  
  // If menu is open, update menu stats
  if (gameState.menuOpen) {
      updateMenuStats();
  }
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

// Create a round notification display
export function createRoundNotification() {
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
export function createScoreDisplay() {
    const scoreEl = document.createElement('div');
    scoreEl.id = 'scoreDisplay';
    scoreEl.style.position = 'absolute';
    
    // Position differently based on device type
    if (isMobileDevice()) {
        // For mobile: upper left corner
        scoreEl.style.top = '20px';
        scoreEl.style.left = '20px';
        scoreEl.style.transform = 'none';
    } else {
        // For desktop: centered at top
        scoreEl.style.top = '20px';
        scoreEl.style.left = '50%';
        scoreEl.style.transform = 'translateX(-50%)';
    }
    
    scoreEl.style.fontSize = '24px';
    scoreEl.style.color = 'white';
    scoreEl.style.textShadow = '1px 1px 2px #000000';
    scoreEl.style.pointerEvents = 'none';
    
    document.getElementById('ui').appendChild(scoreEl);
    return scoreEl;
}

// Show wave notification
export function showRoundNotification(round) {
  if (!roundNotification || gameState.showingRoundMessage) return;
  
  // Play wave start sound
  playSound('waveStart', 0.7);
  
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

// Create scope overlay
export function createScopeOverlay() {
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
export function removeScopeOverlay() {
    const scopeOverlay = document.getElementById('scopeOverlay');
    if (scopeOverlay) {
        document.body.removeChild(scopeOverlay);
    }
}

// Show pickup hint when player is near a gun
export function showPickupHint(gunType) {
    // Create hint element if it doesn't exist
    let hintEl = document.getElementById('pickupHint');
    if (!hintEl) {
        hintEl = document.createElement('div');
        hintEl.id = 'pickupHint';
        hintEl.style.position = 'absolute';
        
        // Position differently based on device type
        if (isMobileDevice()) {
            // For mobile: center of screen
            hintEl.style.top = '50%';
            hintEl.style.left = '50%';
            hintEl.style.transform = 'translate(-50%, -50%)';
        } else {
            // For desktop: near bottom
            hintEl.style.bottom = '20%';
            hintEl.style.left = '50%';
            hintEl.style.transform = 'translate(-50%, 0)';
        }
        
        hintEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        hintEl.style.color = 'white';
        hintEl.style.padding = '10px 20px';
        hintEl.style.borderRadius = '5px';
        hintEl.style.fontFamily = 'Arial, sans-serif';
        hintEl.style.fontSize = '16px';
        hintEl.style.textAlign = 'center';
        hintEl.style.zIndex = '1000';
        
        // Make it tappable on mobile
        if (isMobileDevice()) {
            hintEl.style.pointerEvents = 'auto';
            hintEl.style.cursor = 'pointer';
            hintEl.style.backgroundColor = 'rgba(58, 134, 255, 0.7)';
            hintEl.style.border = '2px solid white';
            hintEl.style.boxShadow = '0 0 15px rgba(58, 134, 255, 0.5)';
            hintEl.style.padding = '15px 25px';
            hintEl.style.fontSize = '20px';
            hintEl.style.fontWeight = 'bold';
            
            // Add click event listener for mobile
            hintEl.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Call interact function
                interactWithPickups();
                
                // Visual feedback
                this.style.backgroundColor = 'rgba(0, 255, 0, 0.7)';
                setTimeout(() => {
                    this.style.backgroundColor = 'rgba(58, 134, 255, 0.7)';
                }, 200);
            });
        }
        
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
        case 'gatlingGun':
            gunName = "Gatling Gun";
            break;
        default: gunName = "Unknown Weapon";
    }
    
    // Different text for mobile vs desktop
    if (isMobileDevice()) {
        hintEl.innerHTML = `<strong>TAP HERE</strong><br>to pick up ${gunName}`;
    } else {
        hintEl.textContent = `Press E to pick up ${gunName}`;
    }
    
    hintEl.style.display = 'block';
    
    // Store the current time to hide the hint if no pickups are nearby
    gameState.lastPickupHintTime = performance.now();
}

// Hide pickup hint
export function hidePickupHint() {
    const hintEl = document.getElementById('pickupHint');
    if (hintEl) {
        hintEl.style.display = 'none';
    }
}

// Show notification function
export function showNotification(message) {
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

// Function to update menu stats
export function updateMenuStats() {
  // Get weapon name based on current gun type
  let weaponName;
  switch (gameState.currentGunType) {
      case 'pistol': weaponName = "Pistol"; break;
      case 'machineGun': weaponName = "Machine Gun"; break;
      case 'sniperRifle': weaponName = "Sniper Rifle"; break;
      case 'shotgun': weaponName = "Shotgun"; break;
      case 'rocketLauncher': weaponName = "Rocket Launcher"; break;
      case 'gatlingGun': weaponName = "Gatling Gun"; break;
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
  updateElement('menu-enemies', enemies.length);
}