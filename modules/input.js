import * as THREE from 'three';
import { camera, scene } from '../game.js';
import { createScopeOverlay, removeScopeOverlay , showNotification, updateUI } from './ui.js';
import { weapon, machineGun, sniperRifle, shotgun, rocketLauncher, gatlingGun } from './weapons.js';
import { playSound } from '../game.js';
import { gameState, machineGunPickups, pistolPickups, sniperRiflePickups, shotgunPickups,rocketLauncherPickups, gatlingGunPickups } from './state.js';

// Function to toggle zoom for sniper rifle
export function toggleZoom() {
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

// Function to interact with pickups
export function interactWithPickups() {
    if (gameState.gameOver) return;
    
    const playerPosition = new THREE.Vector3();
    camera.getWorldPosition(playerPosition);
    
    // Helper function to handle weapon pickup
    function handleWeaponPickup(pickupArray, pickupType, ammoAmount, pickupName) {
        // Skip if this is the player's current weapon type
        if (gameState.currentGunType === pickupType) return false;
        
        for (let i = pickupArray.length - 1; i >= 0; i--) {
            const pickup = pickupArray[i];
            const distance = playerPosition.distanceTo(pickup.mesh.position);
            
            if (distance < 2) { // Interaction range
                // Remove current weapon from scene (don't create a pickup for it)
                // Just update the weapon visibility
                
                // Pick up new weapon
                gameState.currentGunType = pickupType;
                gameState.ammo = gameState.maxAmmo = ammoAmount;
                
                // Update weapon visibility
                weapon.visible = pickupType === 'pistol';
                machineGun.visible = pickupType === 'machineGun';
                sniperRifle.visible = pickupType === 'sniperRifle';
                shotgun.visible = pickupType === 'shotgun';
                rocketLauncher.visible = pickupType === 'rocketLauncher';
                gatlingGun.visible = pickupType === 'gatlingGun';
                
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
    if (handleWeaponPickup(gatlingGunPickups, 'gatlingGun', 200, 'Gatling Gun')) return;
    if (handleWeaponPickup(pistolPickups, 'pistol', 10, 'Pistol')) return;
}