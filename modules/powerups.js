import * as THREE from 'three';
import { scene, camera } from '../game.js';
import { gameState, healthPickups } from './state.js';
import { playSound } from '../game.js';
import { showNotification, updateUI } from './ui.js';

// Create a health pickup
export function createHealthPickup(position) {
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

// Check for health pickups that the player touches
export function checkForHealthPickups() {
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