import nipplejs from 'nipplejs';
import showDebugMessage from '../utils/DebugHelper.js';

/**
 * Touch controls for mobile devices using NippleJS
 */
export default class Controls {
  /**
   * Initialize controls
   * @param {Object} game - Reference to main game instance
   */
  constructor(game) {
    this.game = game;
    this.direction = { x: 0, y: 0 };
    this.intensity = 0; // Movement intensity (0-1)
    this.action = false; // Action button state
    this.actionHandled = false; // Flag to track if action has been handled
    
    this._setupJoystick();
    this._setupActionButton();
  }
  
  /**
   * Sets up the virtual joystick
   * @private
   */
  _setupJoystick() {
    const options = {
      zone: document.getElementById('joystick-zone') || document.body,
      mode: 'static',
      position: { left: '50%', bottom: '20%' },
      color: 'white',
      size: 120,
      lockX: false,
      lockY: false
    };
    
    // Create joystick container if it doesn't exist
    if (!document.getElementById('joystick-zone')) {
      const joystickZone = document.createElement('div');
      joystickZone.id = 'joystick-zone';
      joystickZone.style.position = 'absolute';
      joystickZone.style.bottom = '100px';
      joystickZone.style.left = '50%';
      joystickZone.style.transform = 'translateX(-50%)';
      joystickZone.style.width = '120px';
      joystickZone.style.height = '120px';
      joystickZone.style.zIndex = '100';
      document.body.appendChild(joystickZone);
      options.zone = joystickZone;
    }
    
    // Initialize joystick
    this.joystick = nipplejs.create(options);
    
    // Setup event listeners
    this.joystick.on('move', (event, data) => {
      // Get direction vector
      this.direction.x = data.vector.x;
      this.direction.y = data.vector.y;
      
      // Get intensity
      this.intensity = Math.min(data.distance / options.size, 1);
    });
    
    this.joystick.on('end', () => {
      this.direction = { x: 0, y: 0 };
      this.intensity = 0;
    });
  }
  
  /**
   * Sets up action button for interactions
   * @private
   */
  _setupActionButton() {
    // Create action button if it doesn't exist
    if (!document.getElementById('action-button')) {
      const actionButton = document.createElement('div');
      actionButton.id = 'action-button';
      actionButton.style.position = 'absolute';
      actionButton.style.bottom = '150px';
      actionButton.style.right = '80px';
      actionButton.style.width = '80px';
      actionButton.style.height = '80px';
      actionButton.style.borderRadius = '50%';
      actionButton.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
      actionButton.style.zIndex = '100';
      actionButton.style.display = 'flex';
      actionButton.style.justifyContent = 'center';
      actionButton.style.alignItems = 'center';
      actionButton.style.fontSize = '18px';
      actionButton.style.color = '#333';
      actionButton.style.userSelect = 'none';
      actionButton.style.cursor = 'pointer'; // Add cursor pointer for desktop users
      actionButton.innerText = 'Action';
      document.body.appendChild(actionButton);
      
      // Add event listeners for both touch and mouse
      // Touch events for mobile
      actionButton.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent default to avoid issues on mobile
        this.action = true;
        showDebugMessage("Action button pressed", "#00ffaa");
        actionButton.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
      });
      
      actionButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.action = false;
        actionButton.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
      });

      // Mouse events for desktop
      actionButton.addEventListener('mousedown', () => {
        this.action = true;
        showDebugMessage("Action button clicked", "#00ffaa");
        actionButton.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
      });
      
      actionButton.addEventListener('mouseup', () => {
        this.action = false;
        actionButton.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
      });

      // Prevent default behavior for touch events
      actionButton.addEventListener('touchmove', (e) => e.preventDefault());
    }
  }
  
  /**
   * Updates player based on control inputs
   */
  update() {
    if (!this.game || !this.game.state || !this.game.state.player) {
      return; // Safety check - game or player not ready
    }
    
    // Update player movement
    this.game.state.player.updateMovement(this.direction, this.intensity);
    
    // Handle action button press - only when action flag changes
    if (this.action && !this.actionHandled && this.game.state.player.performAction) {
      this.actionHandled = true; // Mark that we've handled this press
      showDebugMessage("Performing action", "#ffcc00");
      try {
        this.game.state.player.performAction();
      } catch (err) {
        console.error("Error performing action:", err);
        showDebugMessage("Action failed", "#ff5555");
      }
      // Don't reset action flag here, let it be controlled by the button release events
    } else if (!this.action && this.actionHandled) {
      // Reset the handled flag when button is released
      this.actionHandled = false;
    }
  }
  
  /**
   * Shows/hides controls based on stage
   * @param {string} stage - Current game stage
   */
  configureForStage(stage) {
    // Always show basic movement controls
    document.getElementById('joystick-zone').style.display = 'block';
    
    // Action button visibility depends on stage
    const actionButton = document.getElementById('action-button');
    if (actionButton) {
      if (stage === 'primordial') {
        // Limited actions in primordial stage
        actionButton.innerText = 'Collect';
      } else if (stage === 'prehistoric') {
        // More actions in prehistoric
        actionButton.innerText = 'Interact';
      } else if (stage === 'ordered') {
        // Complex interactions in ordered world
        actionButton.innerText = 'Interact';
      }
    }
  }
} 