# Surviber FPS

A first-person shooter endless horde game.

## Features

- First-person shooter gameplay
- Progression through increasingly difficult levels

## Controls

- **WASD/Arrow Keys**: Move
- **Mouse**: Look around
- **Click**: Shoot
- **Space**: Jump
- **ESC**: Pause/Release mouse

## How to Play

1. Click on the game window to lock your mouse and start playing
2. Defeat all enemies to advance to the next level
3. Collect ammo and avoid taking damage
4. If you die, click to restart the game

## Technical Details

This game uses:
- Three.js for 3D rendering
- PointerLockControls for FPS controls
- Basic physics with raycasting for shooting

## Running the Game

Simply open `index.html` in a web browser that supports WebGL.

## Next Steps for Development

- Add a leaderboard 
- Implement more enemy types with different behaviors
- Add power-ups and special weapons

# Vibe FPS - Twitter Authentication

This README explains how Twitter authentication is implemented in Vibe FPS using Supabase.

## Overview

The game allows players to optionally log in with their Twitter accounts to:
- Automatically use their Twitter display name for the leaderboard
- Link their scores to their Twitter identity
- Provide a seamless authentication experience

Players can also:
- Use a custom username by editing the pre-filled random name
- Keep the automatically generated random username
- Continue using their chosen name even if they later log in with Twitter

## Implementation Details

### Authentication Flow

1. Player can optionally click the "Login with Twitter" button
2. Supabase Auth redirects to Twitter for authentication
3. After successful authentication, Twitter redirects back to Supabase
4. Supabase redirects to our auth-callback.html page with a code
5. The auth-callback.html page exchanges the code for a session
6. The player is redirected back to the game with an active session
7. The game UI updates to show the player's Twitter profile

### Username Priority

1. A random username is automatically generated and pre-filled when the game loads
2. If a player edits this name, their custom name is always used
3. If a player logs in with Twitter but hasn't edited the name, their Twitter name is used
4. The player's chosen name is saved and persists between sessions

### Files and Components

- **twitter-auth.js**: Handles Twitter authentication using Supabase Auth
- **leaderboard.js**: Integrates Twitter user data with score submissions
- **game.js**: Contains UI logic for Twitter login buttons and profile display
- **index.html**: Contains the Twitter login UI elements
- **auth-callback.html**: Handles the OAuth callback and code exchange
- **TWITTER_AUTH_SETUP.md**: Detailed setup instructions
- **TWITTER_AUTH_SETUP_LOCAL.md**: Setup instructions for local development

### Database Integration

When a player submits a score, the following data is stored:
- Player's display name (custom, Twitter, or random)
- Score and wave number
- Twitter ID and username (if logged in with Twitter)
- Supabase user ID (if logged in with Twitter)

## Setup Instructions

For detailed setup instructions, see:
- [TWITTER_AUTH_SETUP.md](TWITTER_AUTH_SETUP.md) - General setup instructions
- [TWITTER_AUTH_SETUP_LOCAL.md](TWITTER_AUTH_SETUP_LOCAL.md) - Local development setup

## Security Considerations

- Row Level Security (RLS) is implemented to protect user data
- Players can only submit scores under their own user account when authenticated
- Public leaderboard data remains accessible to all users

## Benefits of Using Supabase

- Simplified authentication flow
- Built-in security features
- Seamless integration with existing leaderboard functionality
- No need for separate authentication service
- Persistent sessions across page reloads

## User Experience

- Players get a random username automatically generated for them
- Players can edit this name if they want a custom username
- Twitter login is completely optional
- Twitter profile picture and name are displayed when logged in
- Players can log out at any time