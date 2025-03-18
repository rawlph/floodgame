import * as THREE from 'three';

/**
 * Heads-up display for game information (timer, resources, etc.)
 */
export default class Hud {
  /**
   * Initialize the HUD
   * @param {Object} game - Reference to main game instance
   */
  constructor(game) {
    this.game = game;
    this.elements = {};
    
    this._createHudContainer();
    this._createTimerDisplay();
    this._createResourceDisplay();
    this._createStageDisplay();
    this._createEvolutionDisplay();
  }
  
  /**
   * Creates the main HUD container
   * @private
   */
  _createHudContainer() {
    // Create HUD container if it doesn't exist
    if (!document.getElementById('hud-container')) {
      const hudContainer = document.createElement('div');
      hudContainer.id = 'hud-container';
      hudContainer.style.position = 'absolute';
      hudContainer.style.top = '20px';
      hudContainer.style.left = '20px';
      hudContainer.style.right = '20px';
      hudContainer.style.zIndex = '100';
      hudContainer.style.color = 'white';
      hudContainer.style.fontFamily = 'Arial, sans-serif';
      hudContainer.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.8)';
      hudContainer.style.pointerEvents = 'none'; // Allow clicks to pass through
      document.body.appendChild(hudContainer);
      
      this.elements.container = hudContainer;
      
      // Create objective indicator container
      const objectiveContainer = document.createElement('div');
      objectiveContainer.id = 'objective-indicator';
      objectiveContainer.style.position = 'absolute';
      objectiveContainer.style.left = '50%';
      objectiveContainer.style.top = '60px';
      objectiveContainer.style.transform = 'translateX(-50%)';
      objectiveContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      objectiveContainer.style.padding = '10px 15px';
      objectiveContainer.style.borderRadius = '5px';
      objectiveContainer.style.fontSize = '16px';
      objectiveContainer.style.textAlign = 'center';
      objectiveContainer.style.transition = 'opacity 0.5s';
      objectiveContainer.style.opacity = '0';
      objectiveContainer.style.pointerEvents = 'none';
      document.body.appendChild(objectiveContainer);
      
      this.elements.objective = objectiveContainer;
      
      // Create interaction indicator (appears when player is near interactable objects)
      const interactionIndicator = document.createElement('div');
      interactionIndicator.id = 'interaction-indicator';
      interactionIndicator.style.position = 'absolute';
      interactionIndicator.style.left = '50%';
      interactionIndicator.style.bottom = '100px';
      interactionIndicator.style.transform = 'translateX(-50%)';
      interactionIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      interactionIndicator.style.padding = '8px 15px';
      interactionIndicator.style.borderRadius = '20px';
      interactionIndicator.style.fontSize = '14px';
      interactionIndicator.style.textAlign = 'center';
      interactionIndicator.style.transition = 'opacity 0.3s';
      interactionIndicator.style.opacity = '0';
      interactionIndicator.style.pointerEvents = 'none';
      document.body.appendChild(interactionIndicator);
      
      this.elements.interaction = interactionIndicator;
    }
  }
  
  /**
   * Creates timer/flood display
   * @private
   */
  _createTimerDisplay() {
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer-display';
    timerDisplay.style.fontSize = '24px';
    timerDisplay.style.marginBottom = '10px';
    timerDisplay.style.textAlign = 'center';
    this.elements.container.appendChild(timerDisplay);
    
    this.elements.timer = timerDisplay;
  }
  
  /**
   * Creates resource counter display
   * @private
   */
  _createResourceDisplay() {
    const resourceDisplay = document.createElement('div');
    resourceDisplay.id = 'resource-display';
    resourceDisplay.style.fontSize = '18px';
    resourceDisplay.style.position = 'absolute';
    resourceDisplay.style.top = '0';
    resourceDisplay.style.right = '0';
    resourceDisplay.style.padding = '5px 10px';
    resourceDisplay.style.borderRadius = '5px';
    resourceDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    this.elements.container.appendChild(resourceDisplay);
    
    this.elements.resources = resourceDisplay;
  }
  
  /**
   * Creates stage name display
   * @private
   */
  _createStageDisplay() {
    const stageDisplay = document.createElement('div');
    stageDisplay.id = 'stage-display';
    stageDisplay.style.fontSize = '16px';
    stageDisplay.style.position = 'absolute';
    stageDisplay.style.top = '0';
    stageDisplay.style.left = '0';
    stageDisplay.style.padding = '5px 10px';
    stageDisplay.style.borderRadius = '5px';
    stageDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    this.elements.container.appendChild(stageDisplay);
    
    this.elements.stage = stageDisplay;
  }
  
  /**
   * Creates evolution type display
   * @private
   */
  _createEvolutionDisplay() {
    const evolutionDisplay = document.createElement('div');
    evolutionDisplay.id = 'evolution-display';
    evolutionDisplay.style.position = 'absolute';
    evolutionDisplay.style.bottom = '20px';
    evolutionDisplay.style.left = '50%';
    evolutionDisplay.style.transform = 'translateX(-50%)';
    evolutionDisplay.style.padding = '8px 15px';
    evolutionDisplay.style.borderRadius = '20px';
    evolutionDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    evolutionDisplay.style.fontSize = '14px';
    evolutionDisplay.style.transition = 'opacity 0.5s';
    evolutionDisplay.style.opacity = '0';
    this.elements.container.appendChild(evolutionDisplay);
    
    this.elements.evolution = evolutionDisplay;
  }
  
  /**
   * Updates HUD based on current game state
   */
  update() {
    this._updateTimer();
    this._updateResources();
    this._updateStage();
    this._updateObjectives();
    this._updateInteractionIndicator();
  }
  
  /**
   * Updates flood timer display
   * @private
   */
  _updateTimer() {
    const minutes = Math.floor(this.game.state.timer / 60);
    const seconds = this.game.state.timer % 60;
    const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    
    // Change color based on urgency
    let timerColor = 'white';
    if (this.game.state.timer < 30) timerColor = '#ffcc00';
    if (this.game.state.timer < 10) timerColor = '#ff3300';
    
    this.elements.timer.innerHTML = `Flood in ${formattedTime}`;
    this.elements.timer.style.color = timerColor;
  }
  
  /**
   * Updates resource counter display
   * @private
   */
  _updateResources() {
    // Different resource names per stage
    let resourceName = 'Energy';
    if (this.game.state.stage === 'prehistoric') resourceName = 'Materials';
    if (this.game.state.stage === 'ordered') resourceName = 'Supplies';
    
    const current = this.game.state.resources;
    const goal = this.game.state.resourceGoal;
    const percentage = Math.min(100, Math.round((current / goal) * 100));
    
    // Progress bar HTML
    const progressBar = `
      <div style="background-color: rgba(0, 0, 0, 0.4); height: 6px; border-radius: 3px; margin-top: 4px; width: 100%;">
        <div style="background-color: ${percentage >= 100 ? '#00ff88' : '#88ccff'}; height: 100%; width: ${percentage}%; border-radius: 3px;"></div>
      </div>
    `;
    
    this.elements.resources.innerHTML = `
      ${resourceName}: ${current}/${goal} 
      ${progressBar}
    `;
  }
  
  /**
   * Updates stage name display
   * @private
   */
  _updateStage() {
    // Pretty stage names
    let stageName = 'Primordial Soup';
    if (this.game.state.stage === 'prehistoric') stageName = 'Coastal Emergence';
    if (this.game.state.stage === 'ordered') stageName = 'Ordered World';
    
    this.elements.stage.innerHTML = stageName;
  }
  
  /**
   * Shows/configures HUD for specific game stage
   * @param {string} stage - Current game stage 
   */
  configureForStage(stage) {
    // Set stage-specific styles
    switch(stage) {
      case 'primordial':
        // Dark, murky look
        this.elements.container.style.opacity = '0.8';
        this.elements.timer.style.color = '#8adbff';
        break;
        
      case 'prehistoric':
        // Brighter, more defined
        this.elements.container.style.opacity = '0.9';
        this.elements.timer.style.color = '#ffffff';
        break;
        
      case 'ordered':
        // Clear, vibrant
        this.elements.container.style.opacity = '1';
        this.elements.timer.style.color = '#ffffff';
        break;
    }
    
    // Update displays
    this._updateStage();
    this._updateResources();
  }
  
  /**
   * Shows a notification when traits evolve
   * @param {string} traitName - Name of the evolved trait
   * @param {string} description - Description of the evolution effect
   */
  showEvolutionNotification(traitName, description) {
    this.elements.evolution.innerHTML = `<strong>${traitName}</strong>: ${description}`;
    this.elements.evolution.style.opacity = '1';
    
    // Hide after delay
    setTimeout(() => {
      this.elements.evolution.style.opacity = '0';
    }, 5000);
  }
  
  /**
   * Shows notification for flood timer
   * @param {boolean} isNearFlood - Whether flood is imminent 
   */
  showFloodWarning(isNearFlood) {
    if (isNearFlood) {
      this.elements.timer.style.animation = 'pulse 1s infinite';
    } else {
      this.elements.timer.style.animation = 'none';
    }
  }
  
  /**
   * Update objectives based on game state
   * @private
   */
  _updateObjectives() {
    const player = this.game.state.player;
    const stage = this.game.state.stage;
    
    if (stage === 'primordial' && player && !player.willToLive) {
      // Show objective to find will to live - simplified text
      this.showObjective('Find Life');
      
      // Update directional indicator if will-to-live exists
      this._updateWillToLiveIndicator();
    } else if (this.game.state.resources < this.game.state.resourceGoal) {
      // Show objective to collect resources
      const resourceName = stage === 'primordial' ? 'Energy' : 
                          (stage === 'prehistoric' ? 'Materials' : 'Supplies');
      this.showObjective(`Collect ${this.game.state.resourceGoal} ${resourceName} before the flood`);
    } else {
      // Goal achieved, hide objective
      this.hideObjective();
    }
  }
  
  /**
   * Updates will-to-live directional indicator
   * @private
   */
  _updateWillToLiveIndicator() {
    // Check for stageManager readiness
    if (!this.game.stageManager || !this.game.stageManager.currentScene) return;
    
    const willToLiveObj = this.game.stageManager.currentScene.getWillToLiveObject();
    if (!willToLiveObj || !this.game.state.player || !this.game.state.player.mesh) return;
    
    // If player already has willToLive, hide the indicator completely
    if (this.game.state.player.willToLive) {
      this.hideObjective();
      return;
    }
    
    // Calculate direction to will-to-live
    const playerPos = this.game.state.player.mesh.position;
    const targetPos = willToLiveObj.position;
    
    // Instead of using complex world->screen space conversions, 
    // let's use a simple fixed-direction approach for each orientation
    
    // Calculate direction vector (normalized)
    const dirVector = new THREE.Vector3().subVectors(targetPos, playerPos).normalize();
    
    // Check which general direction the orb is from the player's perspective
    // We'll use a simple 8-direction indicator
    
    // Forward:   -Z (negative z-axis in THREE.js)
    // Backward:  +Z (positive z-axis in THREE.js)
    // Left:      -X (negative x-axis in THREE.js)
    // Right:     +X (positive x-axis in THREE.js)

    // Get the primary direction based on where the orb is
    let primaryDirection;
    let arrowAngle;

    // Note: dirVector has x and z components that represent the direction
    
    // Check if orb is more along x-axis or z-axis
    if (Math.abs(dirVector.x) > Math.abs(dirVector.z)) {
      // More along x-axis (left/right)
      if (dirVector.x > 0) {
        // Orb is to the right
        primaryDirection = 'right';
        arrowAngle = 90;
      } else {
        // Orb is to the left
        primaryDirection = 'left';
        arrowAngle = 270;
      }
    } else {
      // More along z-axis (forward/backward)
      if (dirVector.z > 0) {
        // Orb is behind (positive z)
        primaryDirection = 'backward';
        arrowAngle = 180;
      } else {
        // Orb is ahead (negative z)
        primaryDirection = 'forward';
        arrowAngle = 0;
      }
    }
    
    // Diagonal directions
    if (Math.abs(dirVector.x) > 0.4 && Math.abs(dirVector.z) > 0.4) {
      if (dirVector.x > 0 && dirVector.z < 0) {
        // Forward-right
        primaryDirection = 'forward-right';
        arrowAngle = 45;
      } else if (dirVector.x < 0 && dirVector.z < 0) {
        // Forward-left
        primaryDirection = 'forward-left';
        arrowAngle = 315;
      } else if (dirVector.x > 0 && dirVector.z > 0) {
        // Backward-right
        primaryDirection = 'backward-right';
        arrowAngle = 135;
      } else if (dirVector.x < 0 && dirVector.z > 0) {
        // Backward-left
        primaryDirection = 'backward-left';
        arrowAngle = 225;
      }
    }
    
    // Create or update arrow element
    let arrowElement = this.elements.objective.querySelector('.direction-arrow');
    
    if (!arrowElement) {
      arrowElement = document.createElement('div');
      arrowElement.className = 'direction-arrow';
      arrowElement.textContent = '↑';
      arrowElement.style.display = 'block';
      arrowElement.style.fontSize = '24px';
      arrowElement.style.marginTop = '10px';
      arrowElement.style.textAlign = 'center';
    }
    
    // Update arrow rotation
    arrowElement.style.transform = `rotate(${arrowAngle}deg)`;
    
    // Update objective with arrow
    // First, ensure we don't append multiple arrows
    const existingArrow = this.elements.objective.querySelector('.direction-arrow');
    if (existingArrow) {
      this.elements.objective.removeChild(existingArrow);
    }
    
    this.elements.objective.appendChild(arrowElement);
    
    // Add distance indicator
    const distance = Math.round(playerPos.distanceTo(targetPos));
    let distanceElement = this.elements.objective.querySelector('.distance-indicator');
    
    if (!distanceElement) {
      distanceElement = document.createElement('div');
      distanceElement.className = 'distance-indicator';
      distanceElement.style.fontSize = '14px';
      distanceElement.style.opacity = '0.8';
      distanceElement.style.marginTop = '5px';
    }
    
    distanceElement.textContent = `Distance: ${distance} units`;
    
    // Add or update distance element
    const existingDistance = this.elements.objective.querySelector('.distance-indicator');
    if (existingDistance) {
      this.elements.objective.removeChild(existingDistance);
    }
    
    this.elements.objective.appendChild(distanceElement);
  }
  
  /**
   * Shows objective text
   * @param {string} text - Objective description
   */
  showObjective(text) {
    // First preserve any existing direction arrow or distance indicator
    const existingArrow = this.elements.objective.querySelector('.direction-arrow');
    const existingDistance = this.elements.objective.querySelector('.distance-indicator');
    
    // Clear the objective element while preserving class and style
    const style = this.elements.objective.style.cssText;
    this.elements.objective.innerHTML = '';
    this.elements.objective.style.cssText = style;
    
    // Create a text span for the objective text
    const textSpan = document.createElement('div');
    textSpan.className = 'objective-text';
    textSpan.textContent = text;
    this.elements.objective.appendChild(textSpan);
    
    // Re-add the direction arrow if it existed
    if (existingArrow) {
      this.elements.objective.appendChild(existingArrow);
    }
    
    // Re-add the distance indicator if it existed
    if (existingDistance) {
      this.elements.objective.appendChild(existingDistance);
    }
    
    // Make the objective visible
    this.elements.objective.style.opacity = '1';
  }
  
  /**
   * Hides objective display
   */
  hideObjective() {
    this.elements.objective.style.opacity = '0';
  }
  
  /**
   * Updates the interaction indicator based on nearby interactable objects
   * @private
   */
  _updateInteractionIndicator() {
    if (!this.game.state.player) return;
    
    // Check if player has something to interact with
    const interactable = this.game.state.player._getInteractable?.();
    
    if (interactable) {
      // Show appropriate prompt based on interaction type
      let actionText = 'Interact';
      let color = '#ffffff';
      
      switch(interactable.type) {
        case 'willToLive':
          actionText = 'Awaken Consciousness';
          color = '#00ffff';
          break;
        case 'eventTrigger':
          actionText = 'Explore Philosophical Insight';
          color = '#88ccff';
          break;
        case 'resource':
          actionText = this.game.state.stage === 'primordial' ? 'Collect Energy' :
                      this.game.state.stage === 'prehistoric' ? 'Collect Materials' : 
                      'Collect Supplies';
          color = '#00ff88';
          break;
        case 'environment':
          actionText = 'Interact with Environment';
          color = '#ffcc00';
          break;
        case 'village':
          actionText = 'Interact with Village';
          color = '#ff9900';
          break;
      }
      
      // Update indicator
      this.elements.interaction.textContent = `Press SPACE or click Action to ${actionText}`;
      this.elements.interaction.style.color = color;
      this.elements.interaction.style.opacity = '1';
    } else {
      // Hide indicator when nothing to interact with
      this.elements.interaction.style.opacity = '0';
    }
  }
} 