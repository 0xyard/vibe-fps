// Helper functions for the game

// Debug flag - turn this on to help troubleshoot
export const DEBUG = false;

// Debug helper function
export function debugLog(message) {
    if (DEBUG) {
        console.log(message);
    }
}

// Check if device is mobile
export function isMobileDevice() {
    // Check if device is actually mobile
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.matchMedia && window.matchMedia('(max-width: 767px)').matches);
}

// Handle orientation change for mobile devices
export function handleOrientationChange() {
    const gameContainer = document.getElementById('gameContainer');
    
    if (window.matchMedia("(orientation: portrait)").matches) {
        // Portrait mode
        if (gameContainer) {
            gameContainer.classList.add('portrait-mode');
        }
        document.getElementById('rotate-device').style.display = 'flex';
    } else {
        // Landscape mode
        if (gameContainer) {
            gameContainer.classList.remove('portrait-mode');
        }
        document.getElementById('rotate-device').style.display = 'none';
    }
}

// Custom function to handle exiting pointer lock for both mobile and desktop
export function safeExitPointerLock() {
    if (!isMobileDevice() && document.pointerLockElement) {
        document.exitPointerLock();
    }
    
    // For mobile devices, we need to manually update the controls state
    if (isMobileDevice() && controls && controls.isLocked) {
        controls.isLocked = false;
        controls.dispatchEvent({ type: 'unlock' });
    }
}