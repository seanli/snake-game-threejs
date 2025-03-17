# Snake Game with Three.js

A modern 3D Snake game built with Three.js, featuring dynamic wave motion, bullet shooting, and particle effects.

## Features

- 3D graphics with Three.js
- Dynamic wave motion for snake segments
- Bullet shooting mechanics
- Particle effects for explosions
- Responsive design that works on all screen sizes
- Score tracking

## Project Structure

```
src/
├── config.js       # Game configuration and constants
├── Snake.js        # Snake class with movement and wave motion
├── Food.js         # Food spawning and collision detection
├── Grid.js         # Game grid and border walls
├── BulletSystem.js # Bullet mechanics and explosions
└── Game.js         # Main game logic and Three.js setup
```

## Controls

- Arrow keys to change direction
- R to restart after game over

## Setup

1. Clone the repository
2. Serve the files using a local web server
3. Open in your browser

## Implementation Details

- Snake segments feature a dynamic wave motion that creates a lively, organic movement
- Each segment moves independently with customizable bounce height and frequency
- Bullet system allows snake segments to shoot projectiles
- Collision detection for walls, self, food, and bullets
- Responsive camera that adjusts to viewport size

A 3D Snake game built with Three.js where the snake's body segments randomly shoot bullets that can also hit the food.

## Features

- 3D snake movement on a grid
- Snake body segments randomly shoot bullets
- Bullets can hit food to score points
- Score tracking
- Game over detection and restart functionality

## Controls

- Arrow keys or WASD to control the snake's direction
- Click the Restart button to play again after game over

## How to Play

1. Open `index.html` in a web browser
2. Use arrow keys or WASD to control the snake
3. Collect the red food spheres to grow longer and increase your score
4. Avoid hitting the walls or your own body
5. Watch as your snake's body segments randomly shoot yellow bullets that can also hit the food

## Technical Details

The game is built using:
- Three.js for 3D rendering
- Vanilla JavaScript for game logic
- HTML/CSS for UI elements

No additional dependencies or build steps required!
