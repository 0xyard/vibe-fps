// Import the Supabase client from leaderboard.js to reuse the same connection
import { supabase } from './leaderboard.js';

// Current user state
let currentUser = null;

// Initialize auth state listener
export function initAuth() {
    console.log("Initializing Twitter auth...");
    
    // Set up auth state change listener
    supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth state changed:", event, session ? "Session exists" : "No session");
        
        if (event === 'SIGNED_IN' && session) {
            // User is signed in
            currentUser = session.user;
            console.log("User signed in:", currentUser.user_metadata?.full_name);
            
            // Check if there's already a player name in the input field
            const titlePlayerNameInput = document.getElementById('titlePlayerNameInput');
            const existingName = titlePlayerNameInput?.value?.trim();
            
            // Only save and update UI with Twitter name if there's no existing name
            // or if the existing name is the same as the Twitter name (from a previous login)
            if (currentUser.user_metadata?.full_name && 
                (!existingName || existingName === currentUser.user_metadata.full_name)) {
                
                import('./leaderboard.js').then(module => {
                    // Only save the Twitter name if there's no existing name in localStorage
                    module.getPlayerName().then(storedName => {
                        if (!storedName) {
                            module.savePlayerName(currentUser.user_metadata.full_name);
                        }
                        
                        // Update UI elements with the Twitter name
                        updateUIWithTwitterName(
                            currentUser.user_metadata.full_name, 
                            currentUser.user_metadata?.avatar_url
                        );
                    });
                });
            } else {
                // Just update the Twitter profile display without changing the name
                updateTwitterProfileDisplay(
                    currentUser.user_metadata?.full_name,
                    currentUser.user_metadata?.avatar_url
                );
            }
            
            // Dispatch event for components to react to login
            document.dispatchEvent(new CustomEvent('twitterLogin', { 
                detail: { user: currentUser } 
            }));
        } else if (event === 'SIGNED_OUT') {
            // User is signed out
            currentUser = null;
            console.log("User signed out");
            
            // Reset UI elements
            resetTwitterUI();
            
            // Dispatch event for components to react to logout
            document.dispatchEvent(new CustomEvent('twitterLogout'));
        } else if (event === 'TOKEN_REFRESHED') {
            // JWT token was refreshed, update the current user
            if (session) {
                currentUser = session.user;
                console.log("Token refreshed for user:", currentUser.user_metadata?.full_name);
            }
        }
    });
    
    // Check for existing session
    checkExistingSession();
}

// Reset UI elements when user signs out
function resetTwitterUI() {
    // Show title screen input if it exists
    const titlePlayerNameInput = document.getElementById('titlePlayerNameInput');
    if (titlePlayerNameInput) {
        titlePlayerNameInput.style.display = ''; // Show the input again
        
        // Remove the Twitter name message if it exists
        const parentContainer = titlePlayerNameInput.closest('.submit-container');
        if (parentContainer) {
            const twitterNameMessage = parentContainer.querySelector('.twitter-name-message');
            if (twitterNameMessage) {
                parentContainer.removeChild(twitterNameMessage);
            }
        }
    }
    
    // Show game over screen input if it exists
    const playerNameInput = document.getElementById('playerNameInput');
    if (playerNameInput) {
        playerNameInput.style.display = ''; // Show the input again
        
        // Remove the Twitter name message if it exists
        const parentContainer = playerNameInput.closest('.submit-container');
        if (parentContainer) {
            const twitterNameMessage = parentContainer.querySelector('.twitter-name-message');
            if (twitterNameMessage) {
                parentContainer.removeChild(twitterNameMessage);
            }
        }
    }
    
    // Hide Twitter profile elements
    const twitterProfileElements = document.querySelectorAll('.twitter-profile');
    twitterProfileElements.forEach(element => {
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Show login buttons
    const twitterLoginButtons = document.querySelectorAll('.social-login-button');
    twitterLoginButtons.forEach(button => {
        if (button) {
            button.style.display = 'flex';
        }
    });
}

// Check for existing session on page load
async function checkExistingSession() {
    console.log("Checking for existing session...");
    try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error("Error getting session:", error);
            return;
        }
        
        if (data?.session) {
            currentUser = data.session.user;
            console.log("Existing session found for:", currentUser.user_metadata?.full_name);
            
            // Check if there's already a player name in the input field
            const titlePlayerNameInput = document.getElementById('titlePlayerNameInput');
            const existingName = titlePlayerNameInput?.value?.trim();
            
            // Only update UI with Twitter name if there's no existing name
            // or if the existing name is the same as the Twitter name (from a previous login)
            if (currentUser.user_metadata?.full_name && 
                (!existingName || existingName === currentUser.user_metadata.full_name)) {
                
                updateUIWithTwitterName(
                    currentUser.user_metadata.full_name, 
                    currentUser.user_metadata?.avatar_url
                );
            } else {
                // Just update the Twitter profile display without changing the name
                updateTwitterProfileDisplay(
                    currentUser.user_metadata?.full_name,
                    currentUser.user_metadata?.avatar_url
                );
            }
            
            // Dispatch login event
            document.dispatchEvent(new CustomEvent('twitterLogin', { 
                detail: { user: currentUser } 
            }));
        } else {
            console.log("No existing session found");
        }
    } catch (err) {
        console.error("Error checking session:", err);
    }
}

// Sign in with Twitter
export async function signInWithTwitter() {
    try {
        console.log("Attempting Twitter sign in...");
        
        // Specify the callback URL to a dedicated auth callback page
        const redirectTo = `${window.location.origin}/auth-callback.html`;
        console.log("Redirect URL:", redirectTo);
        
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'twitter',
            options: {
                redirectTo: redirectTo,
                // Specify scopes if needed
                scopes: 'tweet.read users.read',
            }
        });
        
        if (error) {
            console.error("Supabase Twitter auth error:", error);
            throw error;
        }
        
        console.log("Twitter sign in initiated:", data);
        return { success: true, data };
    } catch (error) {
        console.error("Error signing in with Twitter:", error);
        return { 
            success: false, 
            error: error.message,
            errorCode: error.code
        };
    }
}

// Sign out
export async function signOutUser() {
    try {
        console.log("Signing out user...");
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error("Error signing out:", error);
            throw error;
        }
        
        console.log("User signed out successfully");
        return { success: true };
    } catch (error) {
        console.error("Error signing out:", error);
        return { success: false, error: error.message };
    }
}

// Get current user
export function getCurrentUser() {
    return currentUser;
}

// Check if user is signed in
export function isUserSignedIn() {
    return !!currentUser;
}

// Get Twitter username from user metadata
export function getTwitterUsername() {
    if (!currentUser || !currentUser.user_metadata) return null;
    return currentUser.user_metadata.preferred_username || 
           currentUser.user_metadata.full_name || 
           null;
}

// Get Twitter ID from user metadata
export function getTwitterId() {
    if (!currentUser) return null;
    return currentUser.id || null;
}

// Update UI elements with Twitter name and profile picture
function updateUIWithTwitterName(displayName, photoURL) {
    // Update title screen input - hide it completely when signed in with Twitter
    const titlePlayerNameInput = document.getElementById('titlePlayerNameInput');
    if (titlePlayerNameInput) {
        titlePlayerNameInput.value = displayName;
        titlePlayerNameInput.style.display = 'none'; // Hide the input completely
    }
    
    // Update game over screen input - hide it completely when signed in with Twitter
    const playerNameInput = document.getElementById('playerNameInput');
    if (playerNameInput) {
        playerNameInput.value = displayName;
        playerNameInput.style.display = 'none'; // Hide the input completely
    }
    
    // Update Twitter profile elements if they exist
    const twitterProfileElements = document.querySelectorAll('.twitter-profile');
    twitterProfileElements.forEach(element => {
        if (element) {
            element.style.display = 'flex';
            
            const profileImg = element.querySelector('.twitter-profile-img');
            if (profileImg && photoURL) {
                profileImg.src = photoURL;
            }
            
            const profileName = element.querySelector('.twitter-profile-name');
            if (profileName) {
                profileName.textContent = displayName;
            }
        }
    });
    
    // Hide login buttons
    const twitterLoginButtons = document.querySelectorAll('.social-login-button');
    twitterLoginButtons.forEach(button => {
        if (button) {
            button.style.display = 'none';
        }
    });
}

// Update just the Twitter profile display without changing input fields
function updateTwitterProfileDisplay(displayName, photoURL) {
    // Hide the title screen input field when signed in with Twitter
    const titlePlayerNameInput = document.getElementById('titlePlayerNameInput');
    if (titlePlayerNameInput) {
        titlePlayerNameInput.style.display = 'none'; // Hide the input completely
    }
    
    // Hide the game over screen input field when signed in with Twitter
    const playerNameInput = document.getElementById('playerNameInput');
    if (playerNameInput) {
        playerNameInput.style.display = 'none'; // Hide the input completely
    }
    
    // Update Twitter profile elements if they exist
    const twitterProfileElements = document.querySelectorAll('.twitter-profile');
    twitterProfileElements.forEach(element => {
        if (element) {
            element.style.display = 'flex';
            
            const profileImg = element.querySelector('.twitter-profile-img');
            if (profileImg && photoURL) {
                profileImg.src = photoURL;
            }
            
            const profileName = element.querySelector('.twitter-profile-name');
            if (profileName) {
                profileName.textContent = displayName;
            }
        }
    });
    
    // Hide login buttons
    const twitterLoginButtons = document.querySelectorAll('.social-login-button');
    twitterLoginButtons.forEach(button => {
        if (button) {
            button.style.display = 'none';
        }
    });
}

// Initialize auth on module load
initAuth(); 