import { setupRenderer } from './utils/Renderer.js';
import Game from './core/Game.js';
import showDebugMessage from './utils/DebugHelper.js';
import './style.css';

/**
 * Initialize the game
 */
function init() {
  // Set up renderer
  const renderer = setupRenderer();
  
  // Create game instance
  const game = new Game(renderer);
  
  // Initialize game
  game.init();
  
  // Handle window resize
  window.addEventListener('resize', () => {
    game.handleResize();
  });
  
  // Prevent context menu on right-click (common in games)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
  
  // Handle visibility change (pause when tab/window not visible)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.pause();
    } else {
      game.resume();
    }
  });
  
  // Add keyboard controls for desktop use
  setupKeyboardControls(game);
  
  // Return game instance (useful for debugging)
  return game;
}

/**
 * Setup keyboard controls for desktop use
 * @param {Game} game - Game instance
 */
function setupKeyboardControls(game) {
  // Map for tracking currently pressed keys
  const keysPressed = {};
  
  // Key down event
  document.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
    
    // Update player movement direction based on WASD or arrow keys
    updatePlayerMovement(game, keysPressed);
    
    // Action key (Space or Enter)
    if (e.key === ' ' || e.key === 'Enter') {
      if (game.controls) {
        game.controls.action = true;
        
        // Throttle debug messages for action attempts
        const now = Date.now();
        if (!game._lastKeyActionTime || now - game._lastKeyActionTime > 1000) {
          showDebugMessage(`Action key pressed: ${e.key}`, "#00ffaa");
          game._lastKeyActionTime = now;
        }
        
        // Directly perform action for better keyboard responsiveness
        if (game.state && 
            game.state.player && 
            game.state.player.performAction && 
            game.stageManager && 
            game.stageManager.currentScene) {
          try {
            game.state.player.performAction();
          } catch (err) {
            console.error("Error performing action:", err);
            showDebugMessage("Action failed", "#ff5555");
          }
        }
      }
    }
  });
  
  // Key up event
  document.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
    
    // Update player movement direction based on WASD or arrow keys
    updatePlayerMovement(game, keysPressed);
    
    // Release action
    if (e.key === ' ' || e.key === 'Enter') {
      if (game.controls) {
        game.controls.action = false;
      }
    }
  });
}

/**
 * Update player movement direction based on keyboard input
 * @param {Game} game - Game instance
 * @param {Object} keysPressed - Map of pressed keys
 */
function updatePlayerMovement(game, keysPressed) {
  if (!game.controls) return;
  
  // Get direction from keys
  const direction = { x: 0, y: 0 };
  
  // WASD or Arrow keys
  if (keysPressed['w'] || keysPressed['W'] || keysPressed['ArrowUp']) {
    direction.y = -1;
  }
  
  if (keysPressed['s'] || keysPressed['S'] || keysPressed['ArrowDown']) {
    direction.y = 1;
  }
  
  if (keysPressed['a'] || keysPressed['A'] || keysPressed['ArrowLeft']) {
    direction.x = -1;
  }
  
  if (keysPressed['d'] || keysPressed['D'] || keysPressed['ArrowRight']) {
    direction.x = 1;
  }
  
  // Normalize for diagonal movement (maintain consistent speed)
  if (direction.x !== 0 && direction.y !== 0) {
    const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    direction.x /= length;
    direction.y /= length;
  }
  
  // Set movement direction
  game.controls.direction = direction;
  
  // Set movement intensity based on whether moving or not
  game.controls.intensity = (direction.x !== 0 || direction.y !== 0) ? 1.0 : 0.0;
}

// Start game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Show loading screen
  showLoadingScreen();
  
  // Global game instance (for debugging)
  window.game = init();
});

/**
 * Show a loading screen while assets are prepared
 */
function showLoadingScreen() {
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'loading-overlay';
  
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  
  loadingOverlay.appendChild(spinner);
  document.body.appendChild(loadingOverlay);
  
  // Hide loading screen after a delay (or could be triggered by a game event)
  setTimeout(() => {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(loadingOverlay);
    }, 1000);
  }, 2000);
}
