// Game configuration constants
export const CONFIG = {
    GRID: {
        SIZE: 20,
        CELL_SIZE: 1
    },
    GAME: {
        MOVE_INTERVAL: 120,  // milliseconds
        INPUT_BUFFER_TIME: 50  // milliseconds
    },
    BULLETS: {
        SPEED: 0.15,
        LIFETIME: 3000,  // milliseconds
        SPAWN_CHANCE: 0.1  // 10% chance for a body segment to shoot
    },
    ANIMATION: {
        WAVE: {
            BASE_FREQUENCY: 4,
            BOUNCE_HEIGHT: 0.8,
            WOBBLE_AMOUNT: 0.15
        }
    }
};
