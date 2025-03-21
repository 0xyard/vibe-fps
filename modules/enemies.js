import * as THREE from 'three';
import { scene } from '../game.js';
import { gameState, enemies, rocketLauncherPickups, shotgunPickups, machineGunPickups, pistolPickups, gatlingGunPickups, healthPickups, sniperRiflePickups } from './state.js';
import { showRoundNotification, updateUI, roundNotification } from './ui.js';
import { playSound } from '../game.js';
import { createHealthPickup } from './powerups.js';
import { createMachineGunPickup, createSniperRiflePickup, createShotgunPickup, createPistolPickup, createGatlingGunPickup, createRocketLauncherPickup } from './weapons.js';
import { debugLog, DEBUG } from './utils.js';

function createEnemy() {
    // Create a classic cartoon-style enemy group
    const enemyGroup = new THREE.Group();
    
    // Body - classic "rubber hose" round body
    const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x000000,
        roughness: 0.7,
        metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x000000,
        roughness: 0.7,
        metalness: 0.3
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.5;
    head.castShadow = true;
    head.receiveShadow = true;
    
    // Ears - circular ears like in old cartoons
    const earGeometry = new THREE.CircleGeometry(0.2, 16);
    const earMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x000000, 
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.3
    });
    
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.2, 0.7, 0);
    leftEar.rotation.y = Math.PI / 2;
    leftEar.castShadow = true;
    
    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.2, 0.7, 0);
    rightEar.rotation.y = -Math.PI / 2;
    rightEar.castShadow = true;
    
    // Eyes - classic pie-cut eyes
    const eyeGeometry = new THREE.CircleGeometry(0.05, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        side: THREE.DoubleSide,
        roughness: 0.5,
        metalness: 0.2,
        emissive: 0x333333
    });
    
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

// Create a teleport effect at the given position
export function createTeleportEffect(position) {
    // Create particles for the teleport effect
    const particleCount = 20;
    const particles = new THREE.Group();
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0x9900ff,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Random position within a sphere
        const radius = 0.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        particle.position.set(
            position.x + radius * Math.sin(phi) * Math.cos(theta),
            position.y + radius * Math.sin(phi) * Math.sin(theta),
            position.z + radius * Math.cos(phi)
        );
        
        // Random velocity
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );
        
        particles.add(particle);
    }
    
    scene.add(particles);
    
    // Play teleport sound
    playSound('teleport', 0.5);
    
    // Animate and remove after 1 second
    const startTime = performance.now();
    const duration = 1000;
    
    function animateParticles() {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            // Remove particles
            scene.remove(particles);
            return;
        }
        
        // Update particles
        for (let i = 0; i < particles.children.length; i++) {
            const particle = particles.children[i];
            
            // Move particle
            particle.position.add(particle.userData.velocity);
            
            // Fade out
            particle.material.opacity = 0.8 * (1 - progress);
            
            // Scale down
            const scale = 1 - progress * 0.5;
            particle.scale.set(scale, scale, scale);
        }
        
        requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
}

// Helper function to spawn child spiders
function spawnChildSpiders(position, count, health, speed, isChild, isGrandchild) {
    for (let i = 0; i < count; i++) {
        // Create a slight offset for each child spider
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 2, // X offset (-1 to 1)
            0,                          // Y offset (keep on ground)
            (Math.random() - 0.5) * 2   // Z offset (-1 to 1)
        );
        
        // Create position for child spider
        const childPosition = position.clone().add(offset);
        
        // Spawn a child spider at this position
        const childEnemy = createSpiderEnemy();
        childEnemy.position.copy(childPosition);
        scene.add(childEnemy);
        
        // Add to enemies array with appropriate flags
        enemies.push({
            mesh: childEnemy,
            health: health, // Decreasing health for each generation
            speed: speed, // Increasing speed for each generation
            bounceOffset: Math.random() * Math.PI * 2,
            lastPosition: childPosition.clone(),
            stuckTime: 0,
            pathfindingOffset: new THREE.Vector3(0, 0, 0),
            lastPathChange: 0,
            type: 'spider',
            bounceAmount: 0.05,
            flyHeight: 0,
            isChildSpider: isChild, // Mark as child spider
            isGrandchildSpider: isGrandchild // Mark as grandchild spider
        });
        
        // Create teleport effect at spawn location
        createTeleportEffect(childPosition);
    }
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

// Create a ninja enemy (fast and teleporting)
function createNinjaEnemy() {
    // Create the ninja body
    const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x222222, // Dark color for ninja
        shininess: 30,
        specular: 0x333333
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Create ninja head
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x222222,
        shininess: 30,
        specular: 0x333333
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0.5, 0);
    body.add(head);
    
    // Create ninja mask
    const maskGeometry = new THREE.BoxGeometry(0.35, 0.1, 0.35);
    const maskMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x990000, // Red mask
        shininess: 30
    });
    const mask = new THREE.Mesh(maskGeometry, maskMaterial);
    mask.position.set(0, 0.05, 0.15);
    head.add(mask);
    
    // Create ninja eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.1, 0.25);
    head.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.1, 0.25);
    head.add(rightEye);
    
    // Create ninja limbs
    const limbGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8);
    const limbMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x222222,
        shininess: 30,
        specular: 0x333333
    });
    
    // Arms
    const leftArm = new THREE.Mesh(limbGeometry, limbMaterial);
    leftArm.position.set(-0.6, 0, 0);
    leftArm.rotation.z = Math.PI / 2;
    body.add(leftArm);
    
    const rightArm = new THREE.Mesh(limbGeometry, limbMaterial);
    rightArm.position.set(0.6, 0, 0);
    rightArm.rotation.z = -Math.PI / 2;
    body.add(rightArm);
    
    // Create katana
    const katanaGroup = new THREE.Group();
    
    // Katana handle
    const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
    const handleMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513, // Brown handle
        shininess: 30
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    katanaGroup.add(handle);
    
    // Katana blade
    const bladeGeometry = new THREE.BoxGeometry(0.03, 0.8, 0.05);
    const bladeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xCCCCCC, // Silver blade
        shininess: 100,
        specular: 0xFFFFFF
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.55, 0);
    katanaGroup.add(blade);
    
    // Katana guard (tsuba)
    const guardGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8);
    const guardMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x111111, // Dark guard
        shininess: 30
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.set(0, 0.15, 0);
    katanaGroup.add(guard);
    
    // Position katana in right hand
    katanaGroup.position.set(0.7, 0, 0.2);
    katanaGroup.rotation.set(0, 0, -Math.PI / 2);
    body.add(katanaGroup);
    
    // Store katana reference for animation
    body.userData.katana = katanaGroup;
    body.userData.katanaBaseRotation = katanaGroup.rotation.clone();
    body.userData.isSlashing = false;
    body.userData.slashStartTime = 0;
    body.userData.slashDuration = 500; // 0.5 seconds for slash animation
    
    // Legs
    const leftLeg = new THREE.Mesh(limbGeometry, limbMaterial);
    leftLeg.position.set(-0.2, -0.6, 0);
    body.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(limbGeometry, limbMaterial);
    rightLeg.position.set(0.2, -0.6, 0);
    body.add(rightLeg);
    
    // Create teleportation particles (initially invisible)
    const particles = [];
    for (let i = 0; i < 8; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0x9900ff,
            transparent: true,
            opacity: 0
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position around the ninja
        const angle = (i / 8) * Math.PI * 2;
        const radius = 0.5;
        particle.position.set(
            Math.sin(angle) * radius,
            0.2 + (i % 2) * 0.4, // Alternate heights
            Math.cos(angle) * radius
        );
        
        body.add(particle);
        particles.push(particle);
    }
    
    // Store particles in userData for animation
    body.userData.particles = particles;
    
    // Initialize teleportation properties
    body.userData.teleportReady = false;
    body.userData.lastTeleportTime = performance.now();
    body.userData.teleportCooldown = 5000 + Math.random() * 2000; // 5-7 seconds initially
    
    // Initialize slash attack properties
    body.userData.lastSlashTime = performance.now();
    body.userData.slashCooldown = 2000 + Math.random() * 1000; // 2-3 seconds between slashes
    
    return body;
}

// Create a giant cyclops enemy with a club
function createCyclopsEnemy() {
    // Create the cyclops group
    const cyclopsGroup = new THREE.Group();
    
    // Body - large and bulky
    const bodyGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513, // Brown body
        shininess: 10,
        specular: 0x333333
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(1, 1.2, 0.8); // Make body oval-shaped
    cyclopsGroup.add(body);
    
    // Head - large with single eye
    const headGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const headMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513, // Same color as body
        shininess: 10,
        specular: 0x333333
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.1, 0);
    cyclopsGroup.add(head);
    
    // Single eye - large and menacing
    const eyeGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff9900 }); // Orange eye
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(0, 1.2, 0.4);
    cyclopsGroup.add(eye);
    
    // Pupil
    const pupilGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    pupil.position.set(0, 0, 0.15);
    eye.add(pupil);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.2, 0.15, 1.2, 8);
    const armMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        shininess: 10,
        specular: 0x333333
    });
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.9, 0.4, 0);
    leftArm.rotation.z = Math.PI / 6; // Angle slightly outward
    cyclopsGroup.add(leftArm);
    
    // Right arm (holds club)
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.9, 0.4, 0);
    rightArm.rotation.z = -Math.PI / 6; // Angle slightly outward
    cyclopsGroup.add(rightArm);
    
    // Club weapon
    const clubGroup = new THREE.Group();
    
    // Club handle
    const handleGeometry = new THREE.CylinderGeometry(0.08, 0.1, 1.5, 8);
    const handleMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4d2600, // Dark brown handle
        shininess: 5
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    clubGroup.add(handle);
    
    // Club head
    const clubHeadGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const clubHeadMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x666666, // Gray club head
        shininess: 20,
        specular: 0x999999
    });
    const clubHead = new THREE.Mesh(clubHeadGeometry, clubHeadMaterial);
    clubHead.position.set(0, 0.8, 0);
    clubHead.scale.set(1, 1, 1);
    clubGroup.add(clubHead);
    
    // Add spikes to club
    for (let i = 0; i < 8; i++) {
        const spikeGeometry = new THREE.ConeGeometry(0.06, 0.2, 4);
        const spikeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x999999, // Light gray spikes
            shininess: 30,
            specular: 0xCCCCCC
        });
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        
        // Position spikes around the club head
        const angle = (i / 8) * Math.PI * 2;
        const radius = 0.3;
        spike.position.set(
            Math.sin(angle) * radius,
            0.8,
            Math.cos(angle) * radius
        );
        
        // Point spikes outward
        spike.rotation.x = Math.PI / 2;
        spike.rotation.y = -angle;
        
        clubGroup.add(spike);
    }
    
    // Position club in right hand
    clubGroup.position.set(1.3, 0.4, 0.2);
    clubGroup.rotation.set(0, 0, -Math.PI / 4);
    cyclopsGroup.add(clubGroup);
    
    // Store club reference for animation
    cyclopsGroup.userData.club = clubGroup;
    cyclopsGroup.userData.clubBaseRotation = clubGroup.rotation.clone();
    cyclopsGroup.userData.isSwinging = false;
    cyclopsGroup.userData.swingStartTime = 0;
    cyclopsGroup.userData.swingDuration = 800; // 0.8 seconds for swing animation
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.25, 0.2, 1.0, 8);
    const legMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        shininess: 10,
        specular: 0x333333
    });
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.4, -1.0, 0);
    cyclopsGroup.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.4, -1.0, 0);
    cyclopsGroup.add(rightLeg);
    
    // Initialize club swing attack properties
    cyclopsGroup.userData.lastSwingTime = performance.now();
    cyclopsGroup.userData.swingCooldown = 3000 + Math.random() * 1000; // 3-4 seconds between swings
    
    // Initialize charge attack properties
    cyclopsGroup.userData.isCharging = false;
    cyclopsGroup.userData.isPreparingCharge = false;
    cyclopsGroup.userData.chargeStartTime = 0;
    cyclopsGroup.userData.chargeDuration = 2000; // 2 seconds of charging
    cyclopsGroup.userData.chargeSpeed = 0.18; // Increased speed during charge (from 0.15)
    cyclopsGroup.userData.chargeDirection = new THREE.Vector3();
    cyclopsGroup.userData.lastChargeTime = performance.now();
    cyclopsGroup.userData.chargeCooldown = 8000 + Math.random() * 2000; // 8-10 seconds between charges
    cyclopsGroup.userData.chargePreparationDuration = 1500; // 1.5 seconds of preparation before charging
    cyclopsGroup.userData.chargePreparationStartTime = 0;
    
    // Make cyclops larger than other enemies
    cyclopsGroup.scale.set(1.5, 1.5, 1.5);
    
    return cyclopsGroup;
}

// Create a fireball-shooting enemy
function createFireballEnemy() {
    // Create a group for the enemy
    const enemyGroup = new THREE.Group();
    
    // Body - fiery red/orange sphere
    const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff4500, // Orange-red
        emissive: 0xff2000,
        emissiveIntensity: 0.3,
        roughness: 0.7,
        metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    enemyGroup.add(body);
    
    // Eyes - glowing yellow
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.8,
        roughness: 0.3,
        metalness: 0.8
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 0.15, 0.4);
    enemyGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 0.15, 0.4);
    enemyGroup.add(rightEye);
    
    // Mouth - for shooting fireballs
    const mouthGeometry = new THREE.SphereGeometry(0.15, 16, 8);
    // Cut the sphere in half to make a mouth shape
    for (let i = 0; i < mouthGeometry.attributes.position.count; i++) {
        const y = mouthGeometry.attributes.position.getY(i);
        if (y < 0) {
            mouthGeometry.attributes.position.setY(i, y * 0.5);
        }
    }
    mouthGeometry.computeVertexNormals();
    
    const mouthMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8
    });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -0.1, 0.45);
    mouth.rotation.x = Math.PI / 2;
    enemyGroup.add(mouth);
    
    // Add fire particles around the body
    const particleCount = 8;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 8, 8);
        const particleMaterial = new THREE.MeshStandardMaterial({
            color: 0xff7700,
            emissive: 0xff5500,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position particles around the body
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = 0.6;
        particle.position.set(
            Math.sin(angle) * radius,
            0.1 + Math.random() * 0.3,
            Math.cos(angle) * radius
        );
        
        particles.push({
            mesh: particle,
            basePosition: particle.position.clone(),
            phase: Math.random() * Math.PI * 2,
            speed: 0.02 + Math.random() * 0.02
        });
        
        enemyGroup.add(particle);
    }
    
    // Store particles and other animation properties in userData
    enemyGroup.userData = {
        particles: particles,
        lastFireballTime: 0,
        fireballCooldown: 3000, // 3 seconds between fireballs
        isCharging: false,
        chargeStartTime: 0,
        chargeDuration: 1000, // 1 second to charge fireball
        preferredDistance: 10, // Preferred distance from player
        hasLineOfSight: false
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
        case 'ninja':
            enemy = createNinjaEnemy();
            break;
        case 'cyclops':
            enemy = createCyclopsEnemy();
            break;
        case 'fireball':
            enemy = createFireballEnemy();
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
        
        // Create a proper point for collision detection
        // We need to check at the enemy's center, not just at ground level
        const checkPoint = new THREE.Vector3(position.x, position.y, position.z);
        
        if (gameState.allBuildingBounds) {
            for (const bounds of gameState.allBuildingBounds) {
                if (bounds.containsPoint(checkPoint)) {
                    // Position is inside a building, try again
                    insideAnyBuilding = true;
                    break;
                }
            }
        }
        
        // Also check if the enemy would be too close to a building
        // This prevents enemies from partially clipping into buildings
        if (!insideAnyBuilding && gameState.allBuildingBounds) {
            // Get enemy radius (approximate based on type)
            let enemyRadius = 0.5; // Default radius
            if (type === 'cyclops') enemyRadius = 1.0; // Cyclops is larger
            
            for (const bounds of gameState.allBuildingBounds) {
                // Calculate distance to the closest point on the box
                const closestPoint = new THREE.Vector3();
                bounds.clampPoint(checkPoint, closestPoint);
                const distance = checkPoint.distanceTo(closestPoint);
                
                if (distance < enemyRadius) {
                    // Too close to a building, try again
                    insideAnyBuilding = true;
                    break;
                }
            }
        }
        
        // Also check if the enemy would be too close to the player's starting position
        const distanceToCenter = Math.sqrt(position.x * position.x + position.z * position.z);
        if (distanceToCenter < 10) { // Keep enemies at least 10 units away from center
            insideAnyBuilding = true;
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
    
    debugLog(`Successfully spawned ${type} enemy at position (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
    
    // Add a visual helper in debug mode to show spawn points
    if (DEBUG) {
        const spawnMarker = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        );
        spawnMarker.position.copy(position);
        scene.add(spawnMarker);
        
        // Remove the marker after 5 seconds
        setTimeout(() => {
            scene.remove(spawnMarker);
        }, 5000);
    }
    
    // Set enemy properties based on type
    let baseSpeed, health, bounceAmount, flyHeight;
    
    switch (type) {
        case 'spider':
            baseSpeed = 0.028; // Spiders are faster
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
        case 'ninja':
            baseSpeed = 0.035; // Ninjas are the fastest
            health = 80; // Ninjas have medium health
            bounceAmount = 0.05; // Ninjas bounce very little
            flyHeight = 0; // Ninjas don't fly
            break;
        case 'cyclops':
            baseSpeed = 0.012; // Cyclops are slow but powerful (decreased from 0.015 to account for charging attack)
            health = 3000; // Cyclops have higher health (increased from 2000 to make them tougher)
            bounceAmount = 0.03; // Cyclops barely bounce
            flyHeight = 0; // Cyclops don't fly
            break;
        case 'fireball':
            baseSpeed = 0.02; // Fireball enemies are medium speed
            health = 90; // Fireball enemies have medium-high health
            bounceAmount = 0.08; // Moderate bounce
            flyHeight = 1.5; // Hover slightly above ground
            break;
        default: // Regular enemies
            baseSpeed = 0.022;
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

export function spawnEnemies() {
    debugLog('Spawning enemies');
    
    // Only show wave notification if it exists
    if (roundNotification) {
        showRoundNotification(gameState.level);
    }
    
    // Calculate number of enemies based on wave level
    // Start with 10 enemies on wave 1, then add 5 more for each wave
    const enemyCount = 10 + ((gameState.level - 1) * 5);
    
    // Calculate number of spider enemies (only appear after wave 1)
    // Start with 0 spiders in wave 1, then 5 in wave 2, and increase by 3 each wave
    const spiderCount = gameState.level > 1 ? 5 + (gameState.level - 2) * 3 : 0;
    
    // Calculate number of flying enemies (only appear after wave 2)
    // Start with 0 flyers in waves 1-2, then 2 in wave 3, and increase by 2 each wave
    const flyingCount = gameState.level > 2 ? 2 + (gameState.level - 3) * 2 : 0;
    
    // Calculate number of ninja enemies (only appear after wave 3)
    // Start with 0 ninjas in waves 1-3, then 2 in wave 4, and increase by 2 each wave
    const ninjaCount = gameState.level > 3 ? 2 + (gameState.level - 4) * 2 : 0;
    
    // Calculate number of cyclops enemies (only appear after wave 4)
    // Start with 0 cyclops in waves 1-4, then 1 in wave 5, and increase by 1 each wave
    const cyclopsCount = gameState.level > 4 ? 1 + (gameState.level - 5) : 0;
    
    // Calculate number of fireball enemies (only appear after wave 2)
    // Start with 0 fireball enemies in waves 1-5, then 2 in wave 6, and increase by 2 each wave
    const fireballCount = gameState.level > 5 ? 2 + (gameState.level - 6) * 2 : 0;
    
    // Calculate regular enemy count (total minus special types)
    const regularEnemyCount = enemyCount - spiderCount - flyingCount - ninjaCount - cyclopsCount - fireballCount;
    
    debugLog(`Spawning ${regularEnemyCount} regular enemies, ${spiderCount} spider enemies, ${flyingCount} flying enemies, ${ninjaCount} ninja enemies, ${cyclopsCount} cyclops enemies, and ${fireballCount} fireball enemies`);
    
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
    
    // Spawn ninja enemies (after wave 3)
    for (let i = 0; i < ninjaCount; i++) {
        spawnEnemy('ninja');
    }
    
    // Spawn cyclops enemies (after wave 4)
    for (let i = 0; i < cyclopsCount; i++) {
        spawnEnemy('cyclops');
    }
    
    // Spawn fireball enemies (after wave 2)
    for (let i = 0; i < fireballCount; i++) {
        spawnEnemy('fireball');
    }
}

// Create death animation for enemies
function createDeathAnimation(enemy, position) {
    // Create a group to hold all the death animation parts
    const deathGroup = new THREE.Group();
    deathGroup.position.copy(position);
    scene.add(deathGroup);
    
    // Determine enemy type for appropriate death animation
    const enemyType = enemy.type || 'regular';

    playSound('enemyDeath', 0.5);
    
    // Create fragments based on enemy type
    const fragments = [];
    const fragmentCount = 12; // Number of fragments
    
    // Different fragment colors and shapes based on enemy type
    let fragmentColor, fragmentSize, fragmentShape;
    
    switch (enemyType) {
        case 'spider':
            fragmentColor = 0x222222;
            fragmentSize = 0.15;
            fragmentShape = 'sphere';
            break;
        case 'flying':
            fragmentColor = 0xFFFFFF;
            fragmentSize = 0.2;
            fragmentShape = 'ghost';
            break;
        case 'ninja':
            fragmentColor = 0x222222;
            fragmentSize = 0.18;
            fragmentShape = 'cube';
            break;
        case 'cyclops':
            fragmentColor = 0x8B4513;
            fragmentSize = 0.25;
            fragmentShape = 'chunk';
            break;
        default:
            fragmentColor = 0x000000;
            fragmentSize = 0.15;
            fragmentShape = 'sphere';
    }
    
    // Create fragments
    for (let i = 0; i < fragmentCount; i++) {
        let fragmentGeometry;
        
        // Create different shaped fragments based on enemy type
        if (fragmentShape === 'sphere') {
            fragmentGeometry = new THREE.SphereGeometry(fragmentSize * (0.5 + Math.random() * 0.5), 8, 8);
        } else if (fragmentShape === 'ghost') {
            fragmentGeometry = new THREE.SphereGeometry(fragmentSize * (0.5 + Math.random() * 0.5), 8, 8);
            // Stretch the bottom to create a ghost-like tail
            for (let j = 0; j < fragmentGeometry.attributes.position.count; j++) {
                const y = fragmentGeometry.attributes.position.getY(j);
                if (y < 0) {
                    fragmentGeometry.attributes.position.setY(
                        j, 
                        y * (1.0 - y * 0.8)
                    );
                }
            }
            fragmentGeometry.computeVertexNormals();
        } else if (fragmentShape === 'cube') {
            fragmentGeometry = new THREE.BoxGeometry(
                fragmentSize * (0.5 + Math.random() * 0.5),
                fragmentSize * (0.5 + Math.random() * 0.5),
                fragmentSize * (0.5 + Math.random() * 0.5)
            );
        } else if (fragmentShape === 'chunk') {
            // Create irregular chunk shapes for cyclops
            fragmentGeometry = new THREE.SphereGeometry(fragmentSize * (0.5 + Math.random() * 0.5), 8, 8);
            // Deform the sphere randomly to make it look like a chunk
            for (let j = 0; j < fragmentGeometry.attributes.position.count; j++) {
                const x = fragmentGeometry.attributes.position.getX(j);
                const y = fragmentGeometry.attributes.position.getY(j);
                const z = fragmentGeometry.attributes.position.getZ(j);
                
                fragmentGeometry.attributes.position.setX(j, x * (0.8 + Math.random() * 0.4));
                fragmentGeometry.attributes.position.setY(j, y * (0.8 + Math.random() * 0.4));
                fragmentGeometry.attributes.position.setZ(j, z * (0.8 + Math.random() * 0.4));
            }
            fragmentGeometry.computeVertexNormals();
        }
        
        // Create fragment material
        const fragmentMaterial = new THREE.MeshStandardMaterial({
            color: fragmentColor,
            roughness: 0.7,
            metalness: 0.3
        });
        
        // For flying enemies, make fragments transparent
        if (enemyType === 'flying') {
            fragmentMaterial.transparent = true;
            fragmentMaterial.opacity = 0.8;
        }
        
        // Create fragment mesh
        const fragment = new THREE.Mesh(fragmentGeometry, fragmentMaterial);
        fragment.castShadow = true;
        
        // Random position offset
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
        );
        fragment.position.copy(offset);
        
        // Random rotation
        fragment.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        
        // Random velocity
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            Math.random() * 0.15,
            (Math.random() - 0.5) * 0.1
        );
        
        // Random rotation velocity
        const rotationVelocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        );
        
        // Add to fragments array with properties
        fragments.push({
            mesh: fragment,
            velocity: velocity,
            rotationVelocity: rotationVelocity,
            gravity: 0.005 + Math.random() * 0.005
        });
        
        deathGroup.add(fragment);
    }
    
    // Add a flash effect at the center
    const flashGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 1
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    deathGroup.add(flash);
    
    // Animate the death effect
    const startTime = performance.now();
    const duration = 1500; // 1.5 seconds
    
    function animateDeath() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress >= 1) {
            // Remove the death effect when animation is complete
            scene.remove(deathGroup);
            return;
        }
        
        // Update fragments
        fragments.forEach(fragment => {
            // Apply gravity
            fragment.velocity.y -= fragment.gravity;
            
            // Move fragment
            fragment.mesh.position.x += fragment.velocity.x;
            fragment.mesh.position.y += fragment.velocity.y;
            fragment.mesh.position.z += fragment.velocity.z;
            
            // Rotate fragment
            fragment.mesh.rotation.x += fragment.rotationVelocity.x;
            fragment.mesh.rotation.y += fragment.rotationVelocity.y;
            fragment.mesh.rotation.z += fragment.rotationVelocity.z;
            
            // Fade out fragment
            if (fragment.mesh.material.opacity) {
                fragment.mesh.material.opacity = Math.max(0, 1 - progress * 1.5);
            }
            
            // Shrink fragment slightly
            const scale = Math.max(0.1, 1 - progress * 0.5);
            fragment.mesh.scale.set(scale, scale, scale);
        });
        
        // Flash effect
        if (progress < 0.2) {
            // Expand flash
            const flashScale = 1 + progress * 5;
            flash.scale.set(flashScale, flashScale, flashScale);
            flash.material.opacity = 1 - progress * 5; // Fade out quickly
        } else {
            flash.visible = false;
        }
        
        requestAnimationFrame(animateDeath);
    }
    
    animateDeath();
}

// Helper function to handle enemy defeat
export function handleEnemyDefeat(enemy, position) {
    // Create death animation (which now plays the appropriate death sound)
    createDeathAnimation(enemy, position);
    
    // Spider enemy special behavior - spawn more spiders based on generation
    if (enemy.type === 'spider') {
        const grandchildSpiderWave = 5;
        // First generation spiders spawn second generation
        if (!enemy.isChildSpider) {
            debugLog('First generation spider defeated - spawning two child spiders');
            spawnChildSpiders(position, 2, 50, 0.03, true, false);
        } 
        // Second generation spiders spawn third generation after wave 2
        else if (enemy.isChildSpider && !enemy.isGrandchildSpider && gameState.level > grandchildSpiderWave) {
            debugLog('Second generation spider defeated - spawning third generation spiders');
            spawnChildSpiders(position, 3, 30, 0.035, true, true);
        }
    }
    
    // Remove enemy from scene
    scene.remove(enemy.mesh);
    
    // Update score
    gameState.score += 100;
    updateUI();
    
    // Random drop chance
    const dropRoll = Math.random();
    
    // Determine which weapons can be dropped (exclude current weapon)
    const availableWeapons = [];
    
    if (gameState.currentGunType !== 'machineGun') {
        availableWeapons.push('machineGun');
    }
    
    if (gameState.currentGunType !== 'sniperRifle') {
        availableWeapons.push('sniperRifle');
    }
    
    if (gameState.currentGunType !== 'shotgun') {
        availableWeapons.push('shotgun');
    }
    
    if (gameState.currentGunType !== 'rocketLauncher') {
        availableWeapons.push('rocketLauncher');
    }
    
    if (gameState.currentGunType !== 'pistol') {
        availableWeapons.push('pistol');
    }
    
    if (gameState.currentGunType !== 'gatlingGun') {
        availableWeapons.push('gatlingGun');
    }
    
    if (dropRoll < 0.03) {
        // 3% chance to drop health
        healthPickups.push(createHealthPickup(position.clone()));
        debugLog('Enemy dropped health');
    } else if (dropRoll < 0.18 && availableWeapons.length > 0) {
        // 15% chance to drop a weapon (if there are available weapons)
        const randomWeaponIndex = Math.floor(Math.random() * availableWeapons.length);
        const weaponToDrop = availableWeapons[randomWeaponIndex];
        
        switch (weaponToDrop) {
            case 'machineGun':
                machineGunPickups.push(createMachineGunPickup(position.clone()));
                debugLog('Enemy dropped machine gun');
                break;
            case 'sniperRifle':
                sniperRiflePickups.push(createSniperRiflePickup(position.clone()));
                debugLog('Enemy dropped sniper rifle');
                break;
            case 'shotgun':
                shotgunPickups.push(createShotgunPickup(position.clone()));
                debugLog('Enemy dropped shotgun');
                break;
            case 'rocketLauncher':
                rocketLauncherPickups.push(createRocketLauncherPickup(position.clone()));
                debugLog('Enemy dropped rocket launcher');
                break;
            case 'pistol':
                pistolPickups.push(createPistolPickup(position.clone()));
                debugLog('Enemy dropped pistol');
                break;
            case 'gatlingGun':
                gatlingGunPickups.push(createGatlingGunPickup(position.clone()));
                debugLog('Enemy dropped gatling gun');
                break;
        }
    } else {
        // 80% chance to drop nothing
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