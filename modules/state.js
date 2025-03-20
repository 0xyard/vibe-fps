// Global game state
export const gameState = {
    health: 100,
    maxHealth: 100,
    ammo: 10,
    maxAmmo: 10,
    // bullets: 30,
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
    originalFOV: 75,
    lastPickupHintTime: 0,
    nearbyPickup: null,
    foundMachineGun: false,
    foundSniperRifle: false,
    foundShotgun: false,
    foundRocketLauncher: false,
    foundGatlingGun: false, // Add Gatling gun flag
    gameStarted: false,
    menuOpen: false,
    soundEnabled: true,
    clickedGameOverButton: false,
    vibrationEnabled: true,
    gatlingGunSpinning: false, // Add Gatling gun spinning state
    gatlingGunSpinSpeed: 0, // Add Gatling gun spin speed
    movementSpeed: 1.0, // Base movement speed multiplier
    weaponStats: {
        pistol: 0,
        machineGun: 0,
        sniperRifle: 0,
        shotgun: 0,
        rocketLauncher: 0,
        gatlingGun: 0
    }
};

// Global arrays
export const collisionObjects = [];
export const bulletProjectiles = [];
export const enemies = [];
export const bulletPickups = [];
export const machineGunPickups = [];
export const pistolPickups = [];
export const sniperRiflePickups = [];
export const healthPickups = [];
export const shotgunPickups = [];
export const rocketLauncherPickups = [];
export const gatlingGunPickups = [];
export const fireballs = [];

let lastShootTime = 0; // Track when the last shot was fired
export const getLastShootTime = () => lastShootTime;
export const setLastShootTime = (value) => lastShootTime = value;