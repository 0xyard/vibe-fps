import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Replace with your Supabase project URL and anon key
const SUPABASE_URL = 'https://efxquilvabdsopguulja.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeHF1aWx2YWJkc29wZ3V1bGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1NTAwMjMsImV4cCI6MjA1NzEyNjAyM30.IploiJ7RS_0RCUlNdUCF8O-i4vV0TdxKw7dmFI-NMb0';

// Export the Supabase client so it can be used in other files
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if player has a stored name
export function getPlayerName() {
    return new Promise((resolve) => {
        // First check if there's a locally stored name (user's preference)
        const storedName = localStorage.getItem('playerName');
        
        // If user has explicitly set a name, use that regardless of Twitter login
        if (storedName) {
            resolve(storedName);
            return;
        }
        
        // If no stored name, check if user is logged in with Twitter
        import('./twitter-auth.js').then(module => {
            if (module.isUserSignedIn()) {
                const user = module.getCurrentUser();
                if (user && user.user_metadata?.full_name) {
                    resolve(user.user_metadata.full_name);
                    return;
                }
            }
            
            // If no Twitter name either, return null
            resolve(null);
        }).catch(() => {
            // If Twitter auth module fails to load, fall back to null
            resolve(null);
        });
    });
}

// Save player name to localStorage
export function savePlayerName(name) {
    localStorage.setItem('playerName', name);
}

// Submit score to Supabase
export async function submitScore(playerName, score, wave) {
    try {
        // Check if user is logged in with Twitter first
        let twitterId = null;
        let twitterUsername = null;
        let twitterDisplayName = null;
        let userId = null;
        
        try {
            const twitterAuth = await import('./twitter-auth.js');
            if (twitterAuth.isUserSignedIn()) {
                const user = twitterAuth.getCurrentUser();
                if (user) {
                    twitterId = twitterAuth.getTwitterId();
                    twitterUsername = twitterAuth.getTwitterUsername();
                    twitterDisplayName = user.user_metadata?.full_name;
                    userId = user.id;
                    
                    // If logged in with Twitter, use the Twitter display name
                    // This overrides any provided playerName
                    if (twitterDisplayName) {
                        console.log(`Using Twitter name for score submission: ${twitterDisplayName}`);
                        playerName = twitterDisplayName;
                    }
                }
            }
        } catch (err) {
            console.warn('Could not check Twitter auth status:', err);
        }
        
        // Validate inputs
        if (!playerName || playerName.trim() === '') {
            throw new Error('Player name is required');
        }
        
        if (typeof score !== 'number' || score < 0) {
            throw new Error('Invalid score value');
        }
        
        if (typeof wave !== 'number' || wave < 1) {
            throw new Error('Invalid wave value');
        }
        
        // Sanitize player name (basic sanitization)
        const sanitizedName = playerName.trim().substring(0, 30);
        
        // Get current user session for authenticated submissions
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        
        // Create score object
        const scoreData = { 
            player_name: sanitizedName,
            score: Math.floor(score),
            wave: Math.floor(wave),
            twitter_id: twitterId,
            twitter_username: twitterUsername
        };
        
        // If user is authenticated, add user_id to link score to user account
        if (userId || (session?.user && session.user.id)) {
            scoreData.user_id = userId || session.user.id;
        }
        
        console.log("Submitting score with data:", scoreData);
        
        const { data, error } = await supabase
            .from('leaderboard')
            .insert([scoreData]);
        
        if (error) throw error;
        
        return { success: true, data };
    } catch (err) {
        console.error('Error submitting score:', err);
        return { success: false, error: err.message };
    }
}

// Initialize leaderboard buttons
export function initLeaderboardButtons(gameState) {
    // Title screen leaderboard button
    const leaderboardButton = document.getElementById('leaderboardButton');
    if (leaderboardButton) {
        leaderboardButton.addEventListener('click', () => {
            window.location.href = 'leaderboard.html';
        });
    }
    
    // Game over screen buttons
    const submitScoreButton = document.getElementById('submitScoreButton');
    const viewLeaderboardButton = document.getElementById('viewLeaderboardButton');
    
    if (submitScoreButton) {
        submitScoreButton.addEventListener('click', async () => {
            const score = parseInt(document.getElementById('finalScore').textContent, 10) || 0;
            const wave = parseInt(document.getElementById('finalLevel').textContent, 10) || 1;
            
            // Check if user is logged in with Twitter first
            let isTwitterLoggedIn = false;
            let twitterDisplayName = null;
            
            try {
                const twitterAuth = await import('./twitter-auth.js');
                if (twitterAuth.isUserSignedIn()) {
                    const user = twitterAuth.getCurrentUser();
                    if (user && user.user_metadata?.full_name) {
                        isTwitterLoggedIn = true;
                        twitterDisplayName = user.user_metadata.full_name;
                    }
                }
            } catch (err) {
                console.warn('Could not check Twitter auth status:', err);
            }
            
            // Get player name based on login status
            let playerName;
            
            if (isTwitterLoggedIn && twitterDisplayName) {
                // If logged in with Twitter, use Twitter name
                playerName = twitterDisplayName;
                console.log(`Using Twitter name for score submission: ${playerName}`);
            } else {
                // Otherwise, get from input or stored name
                const playerNameInput = document.getElementById('playerNameInput');
                if (playerNameInput && playerNameInput.value.trim() !== '') {
                    playerName = playerNameInput.value.trim();
                    // Save this name for future use
                    savePlayerName(playerName);
                } else {
                    // Try to get stored name
                    playerName = await getPlayerName();
                }
            }
            
            if (!playerName) {
                const statusElement = document.getElementById('scoreSubmitStatus');
                if (statusElement) {
                    statusElement.textContent = 'Please enter your name or login with Twitter';
                    statusElement.style.color = '#ff3a3a';
                    statusElement.style.display = 'block';
                }
                return;
            }
            
            // Show loading state
            submitScoreButton.disabled = true;
            submitScoreButton.textContent = 'SUBMITTING...';
            submitScoreButton.style.backgroundColor = '#666';
            
            // Submit score
            const result = await submitScore(playerName, score, wave);
            
            const statusElement = document.getElementById('scoreSubmitStatus');
            if (statusElement) {
                if (result.success) {
                    statusElement.textContent = 'Score submitted successfully!';
                    statusElement.style.color = '#4CAF50';
                    
                    // Disable submit button after successful submission
                    submitScoreButton.disabled = true;
                    submitScoreButton.textContent = 'Score Submitted';
                    submitScoreButton.style.backgroundColor = '#666';
                    
                    // Redirect to leaderboard after a short delay
                    setTimeout(() => {
                        window.location.href = 'leaderboard.html';
                    }, 1500);
                } else {
                    statusElement.textContent = `Error: ${result.error}`;
                    statusElement.style.color = '#ff3a3a';
                    
                    // Re-enable submit button
                    submitScoreButton.disabled = false;
                    submitScoreButton.textContent = 'SUBMIT SCORE';
                    submitScoreButton.style.backgroundColor = '#3a86ff';
                }
                statusElement.style.display = 'block';
            }
        });
    }
    
    if (viewLeaderboardButton) {
        viewLeaderboardButton.addEventListener('click', () => {
            window.location.href = 'leaderboard.html';
        });
    }
}