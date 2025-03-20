# Vibe FPS Game

A browser-based first-person shooter game built with JavaScript and Three.js, featuring a modular architecture.

## Project Structure

The game uses a modular architecture with the following components:

### Core Modules

- **core.js**: The main game engine that initializes the game and runs the game loop
- **state.js**: Manages global game state and provides helper functions
- **environment.js**: Creates the 3D environment including terrain, walls and objects
- **utils.js**: General utility functions used throughout the game

### Gameplay Modules

- **weapons.js**: Manages player weapons, firing mechanics and effects
- **enemies.js**: Handles enemy creation, AI behavior and combat
- **powerups.js**: Implements power-ups like health, armor, ammo and special abilities
- **gameLogic.js**: Contains game logic for managing game over conditions and level progression

### User Interface Modules

- **ui.js**: Manages UI elements, HUD and menus
- **input.js**: Handles player input from keyboard, mouse and touch
- **mobile.js**: Mobile-specific optimizations and touch controls
- **leaderboard.js**: Manages leaderboard functionality with Supabase backend

### Media Modules

- **audio.js**: Handles sound effects and music playback

## Getting Started

1. Clone the repository
2. Open the project in a web server
3. Launch index.html in a modern browser
4. Enjoy the game!

## Controls

- **WASD**: Movement
- **Mouse**: Look around
- **Left Click**: Shoot
- **R**: Reload
- **1-5**: Switch weapons
- **ESC**: Menu

## Mobile Controls

On mobile devices:
- Left joystick: Movement
- Right joystick: Look around
- On-screen buttons for shooting and weapon switching

## Features

- Multiple weapon types with unique behaviors
- Different enemy types with varied AI
- Power-up system
- Level progression
- Leaderboard system
- Mobile support
- Dynamic lighting and shadows
- Sound effects

## Technical Details

- Built with vanilla JavaScript and Three.js
- ES modules for code organization
- Supabase backend for leaderboard functionality
- Responsive design that works on desktop and mobile

## License

MIT