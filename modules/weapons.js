import * as THREE from 'three';
import { scene, camera } from '../game.js';
import { gameState, bulletProjectiles, collisionObjects, enemies, setLastShootTime, pistolPickups } from './state.js';
import { playSound } from '../game.js';
import { handleEnemyDefeat } from './enemies.js';
import { isMobileDevice, debugLog } from './utils.js';
import { updateUI } from './ui.js';

// Weapon setup
export const weapon = createWeapon();
export const machineGun = createMachineGun();
export const sniperRifle = createSniperRifle();
export const shotgun = createShotgun();
export const rocketLauncher = createRocketLauncher();
export const gatlingGun = createGatlingGun();

// Create a machine gun pickup
export function createMachineGunPickup(position) {
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

// Create a sniper rifle pickup
export function createSniperRiflePickup(position) {
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

// Create a shotgun weapon
function createShotgunModel() {
    const modelGroup = new THREE.Group();
    
    // Main barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
    const barrelMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);  
    barrel.rotation.x = Math.PI / 2;
    
    // Second barrel below the first
    const barrel2 = barrel.clone();
    barrel2.position.y = -0.06;
    
    // Stock - wooden look
    const stockGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.08);
    const stockMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown for wood
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.z = 0.2;
    stock.rotation.y = Math.PI / 2;
    
    // Pump handle
    const pumpGeometry = new THREE.BoxGeometry(0.15, 0.06, 0.1);
    const pumpMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
    const pump = new THREE.Mesh(pumpGeometry, pumpMaterial);
    pump.position.y = -0.1;
    pump.rotation.y = Math.PI / 2;
    
    // Trigger guard
    const guardGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.04);
    const guardMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.y = -0.1;
    guard.position.z = 0.2;
    guard.rotation.y = Math.PI / 2;
    
    // Add all parts to the weapon group
    modelGroup.add(barrel);
    modelGroup.add(barrel2);
    modelGroup.add(stock);
    modelGroup.add(pump);
    modelGroup.add(guard);
    
    return modelGroup;
}

// Create a shotgun pickup
export function createShotgunPickup(position) {
    const gunGroup = createShotgunModel();
    
    // Set position
    gunGroup.position.copy(position);
    
    // Add floating animation
    const floatAnimation = () => {
        if (!pickup.isActive) return; // Stop animation if pickup is no longer active
        
        gunGroup.position.y = 0.5 + Math.sin(performance.now() * 0.002) * 0.1;
        gunGroup.rotation.y += 0.01;
        
        requestAnimationFrame(floatAnimation);
    };
    
    // Create pickup object
    const pickup = {
        mesh: gunGroup,
        type: 'shotgun',
        timeCreated: performance.now(),
        isActive: true // Flag to track if pickup is still active
    };

    scene.add(gunGroup);

    // Start the animation
    floatAnimation();
    
    return pickup;
}

// Create a shotgun weapon
function createShotgun() {
    debugLog('Creating shotgun');
    // Create a cartoon-style shotgun
    const weaponGroup = createShotgunModel();
    
    // Position the weapon
    weaponGroup.position.set(0.3, -0.3, -0.5);
    weaponGroup.visible = false; // Hide initially
    
    return weaponGroup;
}

// Base function to create rocket launcher model
function createRocketLauncherModel() {
    const modelGroup = new THREE.Group();
    
    // Main tube
    const tubeGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16);
    const tubeMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tube.rotation.z = Math.PI / 2; // Rotate to horizontal position
    modelGroup.add(tube);
    
    // End cap with opening
    const capGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16);
    const capMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = 0.35;
    modelGroup.add(cap);
        
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
    modelGroup.add(tube);
    modelGroup.add(cap);
    modelGroup.add(innerTube);
    modelGroup.add(handle);
    modelGroup.add(grip);
    modelGroup.add(sight);
    
    return modelGroup;
}

// Create a rocket launcher pickup
export function createRocketLauncherPickup(position) {
    const gunGroup = createRocketLauncherModel();
    
    // Set position
    gunGroup.position.copy(position);
    
    // Add floating animation
    const floatAnimation = () => {
        if (!pickup.isActive) return; // Stop animation if pickup is no longer active
        
        const time = performance.now() * 0.001; // Convert to seconds
        gunGroup.position.y = position.y + Math.sin(time * 2) * 0.1; // Float up and down
        gunGroup.rotation.y += 0.01; // Slowly rotate
        
        // Spin barrels slowly for pickup effect
        if (gunGroup.userData.barrelAssembly) {
            gunGroup.userData.barrelAssembly.rotation.x += 0.02;
        }
        
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

// Create the weapon for player use
function createRocketLauncher() {
    const weaponGroup = createRocketLauncherModel();
    
    // Apply weapon-specific positioning and properties
    weaponGroup.position.set(0.3, -0.3, -0.5);
    weaponGroup.rotation.y = Math.PI / 2;
    weaponGroup.visible = false; // Hide initially
    
    return weaponGroup;
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

// Create a pistol pickup
export function createPistolPickup(position) {
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

// Create a Gatling gun model
function createGatlingGunModel() {
    const modelGroup = new THREE.Group();

    // Main body
    const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 12);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444,
        metalness: 0.7,
        roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    modelGroup.add(body);

    // Rotating barrel assembly - FIXED VERSION
    const barrelAssembly = new THREE.Group();
    const barrelCount = 6;
    const barrelRadius = 0.08; // Distance from center
    
    for (let i = 0; i < barrelCount; i++) {
        const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8);
        const barrelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        
        // Position barrels in a circle around the center
        const angle = (i / barrelCount) * Math.PI * 2;
        
        // Rotate each barrel to point outward from the center
        barrel.rotation.z = Math.PI/2;
        
        // Position at the correct angle around the circle
        barrel.position.y = Math.sin(angle) * barrelRadius;
        barrel.position.z = Math.cos(angle) * barrelRadius;
        
        barrelAssembly.add(barrel);
    }
    
    // Rotate the entire assembly so barrels are pointing forward
    barrelAssembly.position.x = 0.4; // Position in front of body
    modelGroup.add(barrelAssembly);

    // Add front housing
    const frontHousingGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12);
    const frontHousingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x555555,
        metalness: 0.6,
        roughness: 0.4
    });
    const frontHousing = new THREE.Mesh(frontHousingGeometry, frontHousingMaterial);
    frontHousing.rotation.z = Math.PI / 2;
    frontHousing.position.x = 0.8;
    modelGroup.add(frontHousing);

    // Add ammo belt container
    const beltContainerGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.2);
    const beltContainerMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x666666,
        metalness: 0.5,
        roughness: 0.5
    });
    const beltContainer = new THREE.Mesh(beltContainerGeometry, beltContainerMaterial);
    beltContainer.position.set(-0.2, -0.3, 0);
    modelGroup.add(beltContainer);

    // Add handles
    const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222,
        metalness: 0.3,
        roughness: 0.7
    });
    
    const frontHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    frontHandle.rotation.x = Math.PI / 2;
    frontHandle.position.set(0.3, -0.2, 0);
    modelGroup.add(frontHandle);

    const rearHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    rearHandle.rotation.x = Math.PI / 2;
    rearHandle.position.set(-0.2, -0.2, 0);
    modelGroup.add(rearHandle);

    // Store the barrel assembly for rotation animation
    modelGroup.userData.barrelAssembly = barrelAssembly;
    modelGroup.userData.isSpinning = false;
    modelGroup.userData.spinSpeed = 0;
    modelGroup.userData.maxSpinSpeed = 2; // Maximum rotation speed

    return modelGroup;
}

// Create a Gatling gun pickup
export function createGatlingGunPickup(position) {
    const gunGroup = createGatlingGunModel();
    
    // Set position
    gunGroup.position.copy(position);
    gunGroup.position.y = 0.5; // Slightly above ground
    
    // Add floating animation
    const floatAnimation = () => {
        if (!pickup.isActive) return; // Stop animation if pickup is no longer active
        
        const time = performance.now() * 0.001; // Convert to seconds
        gunGroup.position.y = position.y + Math.sin(time * 2) * 0.1; // Float up and down
        gunGroup.rotation.y += 0.01; // Slowly rotate
        
        // Spin barrels slowly for pickup effect
        if (gunGroup.userData.barrelAssembly) {
            gunGroup.userData.barrelAssembly.rotation.x += 0.02;
        }
        
        requestAnimationFrame(floatAnimation);
    };
    
    // Create pickup object
    const pickup = {
        mesh: gunGroup,
        type: 'gatlingGun',
        isActive: true,
        timeCreated: performance.now()
    };
    
    // Add to scene
    scene.add(gunGroup);
    
    // Start animation
    floatAnimation();
    
    return pickup;
}

// Create the Gatling gun weapon for player use
function createGatlingGun() {
    const weaponGroup = createGatlingGunModel();
    
    // Position for player view
    weaponGroup.position.set(0.3, -0.3, 0);
    weaponGroup.rotation.y = Math.PI / 2;
    weaponGroup.visible = false; // Hide initially
    
    return weaponGroup;
}

// Function to shoot
export function shoot() {
    // Check if we're reloading or menu is open
    if (gameState.isReloading || gameState.menuOpen) return;
    
    // For mobile devices, auto-reload when ammo is low (1 or 0)
    if (isMobileDevice() && gameState.ammo <= 1) {
        reload();
        return;
    }
    
    // Check if we have ammo for the current weapon
    if (gameState.ammo <= 0) {
        // Auto reload if out of ammo and player is still trying to shoot
        if (gameState.isMouseDown) {
            reload();
        }
        return;
    }
    
    // Update last shoot time
    setLastShootTime(performance.now());
    
    // Decrease ammo
    gameState.ammo--;
    
    // Increment the weapon stats counter for current gun type
    gameState.weaponStats[gameState.currentGunType]++;
    
    updateUI();
    
    // Play shoot sound
    if (gameState.currentGunType === 'sniperRifle') {
        playSound('sniperShoot');
    } else if (gameState.currentGunType === 'shotgun') {
        playSound('shotgunBlast');
    } else if (gameState.currentGunType === 'rocketLauncher') {
        playSound('rocketLaunch');
    } else if (gameState.currentGunType === 'gatlingGun') {
        playSound('shoot', 0.7);
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
            bulletStartPosition = new THREE.Vector3(0, 0, 0);
            rocketLauncher.localToWorld(bulletStartPosition);
        } else if (gameState.currentGunType === 'gatlingGun') {
            bulletStartPosition = new THREE.Vector3(1, 0, 0);
            gatlingGun.localToWorld(bulletStartPosition);
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
    } else if (gameState.currentGunType === 'gatlingGun') {
        // Create bullet projectile with slight spread for gatling gun
        const spreadDirection = shootDirection.clone();
        
        // Add random spread (more than machine gun but less than shotgun)
        spreadDirection.x += (Math.random() - 0.5) * 0.06;
        spreadDirection.y += (Math.random() - 0.5) * 0.06;
        
        // Normalize to maintain consistent speed
        spreadDirection.normalize();
        
        // Create bullet projectile
        projectile = createBulletProjectile(bulletStartPosition, spreadDirection);
        
        // Gatling gun bullets do moderate damage but fire rapidly
        projectile.damage = 35;
        
        // Create muzzle flash
        createMuzzleFlash(bulletStartPosition);
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

// Reload function
export function reload() {
    if (gameState.ammo === gameState.maxAmmo || gameState.isReloading) return;
    
    // Set reloading state
    gameState.isReloading = true;
    
    // Play reload sound
    playSound('reload');
    
    // Determine reload time based on weapon type
    let reloadTime = 2000; // Default reload time (2 seconds)

    if (gameState.currentGunType === 'pistol') {
        reloadTime = 1000; 
    } else if (gameState.currentGunType === 'gatlingGun') {
        reloadTime = 5000; // Much slower reload for gatling gun (5 seconds)
    } else if (gameState.currentGunType === 'sniperRifle') {
        reloadTime = 3000; // Sniper takes longer to reload (3 seconds)
    } else if (gameState.currentGunType === 'shotgun') {
        reloadTime = 2500; // Shotgun takes a bit longer (2.5 seconds)
    }
    
    // Animation for reloading - set rotation for all weapons and keep until reload is complete
    switch (gameState.currentGunType) {
        case 'pistol':
            weapon.rotation.x = 0.5;
            break;
        case 'machineGun':
            machineGun.rotation.x = 0.5;
            break;
        case 'sniperRifle':
            sniperRifle.rotation.x = 0.5;
            break;
        case 'shotgun':
            shotgun.rotation.x = 0.5;
            break;
        case 'rocketLauncher':
            rocketLauncher.rotation.x = 0.5;
            break;
        case 'gatlingGun':
            gatlingGun.rotation.x = 0.5;
            break;
    }
    
    // After reload time, refill ammo and reset weapon position
    setTimeout(() => {
        gameState.ammo = gameState.maxAmmo;
        gameState.isReloading = false;
        
        // Reset weapon rotation
        switch (gameState.currentGunType) {
            case 'pistol':
                weapon.rotation.x = 0;
                break;
            case 'machineGun':
                machineGun.rotation.x = 0;
                break;
            case 'sniperRifle':
                sniperRifle.rotation.x = 0;
                break;
            case 'shotgun':
                shotgun.rotation.x = 0;
                break;
            case 'rocketLauncher':
                rocketLauncher.rotation.x = 0;
                break;
            case 'gatlingGun':
                gatlingGun.rotation.x = 0;
                break;
        }
        
        updateUI();
    }, reloadTime);
    
    updateUI();
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
    // Store the current camera position to recover from, preserving jumps
    gameState.cameraOriginalY = camera.position.y;
    
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

// Create a bullet projectile
function createBulletProjectile(position, direction) {
    // Create a group for the bullet and trail
    const bulletGroup = new THREE.Group();
    
    // Create bullet geometry and material
    const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 }); // Bright yellow bullet
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bulletGroup.add(bullet);
    
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
    bulletGroup.add(trail);
    
    // Set initial position
    bulletGroup.position.copy(position);
    
    // Orient the bullet group to face in the direction of travel
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction.clone().normalize());
    bulletGroup.quaternion.copy(quaternion);
    
    // Add to scene
    scene.add(bulletGroup);
    
    // Return bullet object with metadata
    return {
        mesh: bulletGroup,
        direction: direction.clone(),
        speed: 20, // Units per second
        distance: 0,
        maxDistance: 100, // Maximum travel distance
        damage: 50,
        timeCreated: performance.now()
    };
}

// Create a rocket projectile
function createRocketProjectile(position, direction) {
    // Create rocket geometry and material
    const rocketGroup = new THREE.Group();
    
    // Rocket body
    const bodyGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x777777 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    // Rotate to align with Z-axis (forward direction in Three.js)
    body.rotation.x = Math.PI / 2;
    rocketGroup.add(body);
    
    // Rocket nose cone
    const noseGeometry = new THREE.ConeGeometry(0.05, 0.1, 8);
    const noseMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    // Rotate to align with Z-axis
    nose.rotation.x = Math.PI / 2;
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
    
    // Orient the rocket to face in the direction of travel
    // Create a quaternion from the direction vector
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction.clone().normalize());
    rocketGroup.quaternion.copy(quaternion);
    
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

// Update bullet projectiles
export function updateBulletProjectiles(delta) {
    // Update each bullet
    for (let i = bulletProjectiles.length - 1; i >= 0; i--) {
        const bullet = bulletProjectiles[i];
        const bulletPosition = bullet.mesh.position;
        
        // Move bullet forward
        const moveDistance = bullet.speed * delta;
        bullet.distance += moveDistance;
        bulletPosition.add(bullet.direction.clone().multiplyScalar(moveDistance));
        
        // Update projectile orientation to match its travel direction
        // Create a quaternion from the direction vector
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), bullet.direction.clone().normalize());
        bullet.mesh.quaternion.copy(quaternion);
        
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