import { gameState } from './state.js';
import { restartGame, controls, camera, velocity } from '../game.js';
import { safeExitPointerLock } from './utils.js';
import { playSound } from '../game.js';
import { updateUI } from './ui.js';
import { damageOverlay } from './ui.js';
import * as THREE from 'three';

// Check if game is over
export function checkGameOver() {
    if (gameState.health <= 0 && !gameState.gameOver) {
        gameState.gameOver = true;
        gameState.clickedGameOverButton = false; // Reset the flag
        
        // Update final score and level in the game over screen
        document.getElementById('finalScore').textContent = gameState.score;
        document.getElementById('finalLevel').textContent = gameState.level;
        
        // Pre-fill player name input if available and auto-submit score
        import('../leaderboard.js').then(module => {
            const playerName = module.getPlayerName();
            const playerNameInput = document.getElementById('playerNameInput');
            const score = gameState.score;
            const wave = gameState.level;
            const statusElement = document.getElementById('scoreSubmitStatus');
            const submitButton = document.getElementById('submitScoreButton');
            
            // Always auto-submit if we have a player name
            if (playerName && playerName.trim() !== '') {
                // Set the hidden input value
                if (playerNameInput) {
                    playerNameInput.value = playerName;
                }
                
                // Show loading state
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = 'SUBMITTING...';
                    submitButton.style.backgroundColor = '#666';
                }
                
                // Submit the score
                module.submitScore(playerName, score, wave, getMostUsedGun()).then(result => {
                    if (result.success) {
                        if (statusElement) {
                            statusElement.textContent = 'Score submitted successfully!';
                            statusElement.style.color = '#4CAF50';
                            statusElement.style.display = 'block';
                        }
                        
                        // Keep submit button hidden on success
                        if (submitButton) {
                            submitButton.style.display = 'none';
                        }
                    } else {
                        if (statusElement) {
                            statusElement.textContent = `Error: ${result.error}. Try submitting manually.`;
                            statusElement.style.color = '#ff3a3a';
                            statusElement.style.display = 'block';
                        }
                        
                        // Show and re-enable the submit button on failure
                        if (submitButton) {
                            submitButton.style.display = 'block';
                            submitButton.disabled = false;
                            submitButton.textContent = 'SUBMIT SCORE';
                            submitButton.style.backgroundColor = '#3a86ff';
                        }
                    }
                }).catch(error => {
                    // Handle any unexpected errors
                    console.error('Error submitting score:', error);
                    
                    if (statusElement) {
                        statusElement.textContent = 'An unexpected error occurred. Please try submitting manually.';
                        statusElement.style.color = '#ff3a3a';
                        statusElement.style.display = 'block';
                    }
                    
                    // Show and re-enable the submit button on error
                    if (submitButton) {
                        submitButton.style.display = 'block';
                        submitButton.disabled = false;
                        submitButton.textContent = 'SUBMIT SCORE';
                        submitButton.style.backgroundColor = '#3a86ff';
                    }
                });
            }
        });
        
        // Show game over screen
        const gameOverScreen = document.getElementById('gameOver');
        gameOverScreen.style.display = 'block';
        
        // Completely disable pointer lock controls
        controls.enabled = false;
        safeExitPointerLock();
        
        // Add a click event listener to the entire document to prevent pointer lock
        const preventLock = (e) => {
            // Only prevent if game is over and not clicking on a button or input
            if (gameState.gameOver && 
                e.target.id !== 'restartButton' && 
                e.target.id !== 'submitScoreButton' && 
                e.target.id !== 'viewLeaderboardButton' &&
                e.target.id !== 'playerNameInput') {
                e.stopPropagation();
                safeExitPointerLock();
            }
        };
        
        // Remove any existing listener first
        document.removeEventListener('click', preventLock);
        document.addEventListener('click', preventLock);
        
        // Clear any existing event listeners from the buttons by cloning them
        const setupGameOverButton = (id, callback) => {
            const button = document.getElementById(id);
            if (button) {
                // Save the current display style
                const currentDisplay = button.style.display;
                
                // Clone the button to remove any existing event listeners
                const newButton = button.cloneNode(true);
                
                // Restore the display style
                newButton.style.display = currentDisplay;
                
                button.parentNode.replaceChild(newButton, button);
                
                // Add the new event listener
                newButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    gameState.clickedGameOverButton = true;
                    callback(e);
                });
            }
        };
        
        // Set up the restart button
        setupGameOverButton('restartButton', () => {
            restartGame();
            controls.lock();
        });
        
        // Set up the submit score button
        setupGameOverButton('submitScoreButton', () => {
            // Check if the button is already disabled (score already submitted)
            const submitButton = document.getElementById('submitScoreButton');
            if (submitButton && submitButton.disabled) {
                return; // Score already submitted
            }
            
            // Import the necessary functions from leaderboard.js
            import('../leaderboard.js').then(module => {
                // Get player name from input or stored value
                const playerNameInput = document.getElementById('playerNameInput');
                let playerName = '';
                
                if (playerNameInput && playerNameInput.value.trim() !== '') {
                    playerName = playerNameInput.value.trim();
                } else {
                    // If input is empty or hidden, use stored player name
                    playerName = module.getPlayerName() || '';
                }
                
                const score = parseInt(document.getElementById('finalScore').textContent, 10) || 0;
                const wave = parseInt(document.getElementById('finalLevel').textContent, 10) || 1;
                const statusElement = document.getElementById('scoreSubmitStatus');
                
                if (!playerName) {
                    if (statusElement) {
                        statusElement.textContent = 'No player name found';
                        statusElement.style.color = '#ff3a3a';
                        statusElement.style.display = 'block';
                    }
                    return;
                }
                
                // Save the player name
                module.savePlayerName(playerName);
                
                // Show loading state
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = 'SUBMITTING...';
                    submitButton.style.backgroundColor = '#666';
                }
                
                // Submit the score
                module.submitScore(playerName, score, wave, getMostUsedGun()).then(result => {
                    if (result.success) {
                        if (statusElement) {
                            statusElement.textContent = 'Score submitted successfully! Redirecting to leaderboard...';
                            statusElement.style.color = '#4CAF50';
                            statusElement.style.display = 'block';
                        }
                        
                        // Update the submit button text
                        if (submitButton) {
                            submitButton.textContent = 'SUBMITTED';
                        }
                        
                        // Redirect to the leaderboard page after a short delay
                        setTimeout(() => {
                            window.location.href = 'leaderboard.html';
                        }, 1500); // 1.5 second delay to show the success message
                    } else {
                        if (statusElement) {
                            statusElement.textContent = `Error: ${result.error}`;
                            statusElement.style.color = '#ff3a3a';
                            statusElement.style.display = 'block';
                        }
                        
                        // Re-enable the submit button
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.textContent = 'SUBMIT SCORE';
                            submitButton.style.backgroundColor = '#3a86ff';
                        }
                    }
                }).catch(error => {
                    // Handle any unexpected errors
                    console.error('Error submitting score:', error);
                    
                    if (statusElement) {
                        statusElement.textContent = 'An unexpected error occurred. Please try again.';
                        statusElement.style.color = '#ff3a3a';
                        statusElement.style.display = 'block';
                    }
                    
                    // Re-enable the submit button
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = 'SUBMIT SCORE';
                        submitButton.style.backgroundColor = '#3a86ff';
                    }
                });
            });
        });
        
        // Set up the view leaderboard button
        setupGameOverButton('viewLeaderboardButton', () => {
            window.location.href = 'leaderboard.html';
        });
    }
}

// Function to get the most used gun
function getMostUsedGun() {
    // Find the gun with the highest count
    let mostUsedGun = 'Unknown';
    let highestCount = 0;
    
    for (const [gunType, count] of Object.entries(gameState.weaponStats)) {
        if (count > highestCount) {
            highestCount = count;
            mostUsedGun = gunType;
        }
    }
    
    // If no guns were used, return Unknown
    return highestCount > 0 ? mostUsedGun : 'Unknown';
}

// Function to handle player damage
export function playerTakeDamage(amount, enemyPosition) {
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