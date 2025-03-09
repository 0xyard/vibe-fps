import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Replace with your Supabase project URL and anon key
const SUPABASE_URL = 'https://efxquilvabdsopguulja.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeHF1aWx2YWJkc29wZ3V1bGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1NTAwMjMsImV4cCI6MjA1NzEyNjAyM30.IploiJ7RS_0RCUlNdUCF8O-i4vV0TdxKw7dmFI-NMb0';

// Export the Supabase client so it can be used in other files
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if player has a stored name
export function getPlayerName() {
    return localStorage.getItem('playerName');
}

// Save player name to localStorage
export function savePlayerName(name) {
    localStorage.setItem('playerName', name);
}

// Submit score to Supabase
export async function submitScore(playerName, score, wave) {
    try {
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
        
        const { data, error } = await supabase
            .from('leaderboard')
            .insert([
                { 
                    player_name: sanitizedName,
                    score: Math.floor(score),
                    wave: Math.floor(wave)
                }
            ]);
        
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
        submitScoreButton.addEventListener('click', () => {
            const score = parseInt(document.getElementById('finalScore').textContent, 10) || 0;
            const wave = parseInt(document.getElementById('finalLevel').textContent, 10) || 1;
            
            showScoreSubmissionDialog(score, wave, (success) => {
                if (success) {
                    // Optionally disable the submit button after successful submission
                    submitScoreButton.disabled = true;
                    submitScoreButton.textContent = 'Score Submitted';
                    submitScoreButton.style.backgroundColor = '#666';
                }
            });
        });
    }
    
    if (viewLeaderboardButton) {
        viewLeaderboardButton.addEventListener('click', () => {
            window.location.href = 'leaderboard.html';
        });
    }
} 