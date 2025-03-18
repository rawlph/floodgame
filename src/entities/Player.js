import * as THREE from 'three';
import { evolveEntity, getEntityVisuals, getRestartBonuses } from '../core/Evolution.js';
import showDebugMessage from '../utils/DebugHelper.js';

/**
 * Player entity with traits and movement
 */
export default class Player {
  /**
   * Initialize player entity
   * @param {string} evolutionType - Type of evolution (strong, meek, allRounder)
   * @param {Object} game - Reference to main game instance
   * @param {Object} restartData - Optional data for roguelike restart bonuses
   */
  constructor(evolutionType, game, restartData = null) {
    this.game = game;
    this.evolutionType = evolutionType;
    this.traits = evolveEntity(evolutionType, 'primordial');
    this.mesh = null;
    this.willToLive = false; // Initially false until found in primordial stage
    this.currentAction = null;
    
    // Philosophical traits that can evolve through choices
    this.philosophicalTraits = {
      compassion: 0.5,
      curiosity: 0.5,
      consciousness: 0,
      cooperation: 0.5
    };
    
    // Apply restart bonuses if provided
    if (restartData) {
      this.applyRestartBonuses(restartData);
    }
    
    this.createMesh();
  }
  
  /**
   * Creates the 3D mesh for the player entity
   */
  createMesh() {
    // Get visual properties based on traits
    const visuals = getEntityVisuals(this.evolutionType, this.traits);
    
    // Create geometry based on evolution type and stage
    let geometry;
    let material;
    
    if (!this.willToLive) {
      // Initially basic and small (primordial pre-will-to-live)
      geometry = new THREE.SphereGeometry(0.3, 8, 8);
      
      // Grey, dull material before finding will to live
      material = new THREE.MeshStandardMaterial({
        color: 0x555566,
        roughness: 0.9,
        metalness: 0.2,
        emissive: 0x222233,
        emissiveIntensity: 0.1
      });
    } else if (this.game.state.stage === 'primordial') {
      // After finding will to live, more defined shape
      geometry = new THREE.SphereGeometry(visuals.size * 0.4, 16, 16);
      
      // Add glow to the player after finding will to live
      material = new THREE.MeshStandardMaterial({
        color: visuals.color,
        roughness: 0.3,
        metalness: 0.7,
        emissive: visuals.color,
        emissiveIntensity: 0.3
      });
    } else if (this.game.state.stage === 'prehistoric') {
      // More complex, showing traces of appendages (prehistoric)
      geometry = new THREE.IcosahedronGeometry(visuals.size * 0.6, 1);
      
      // Create material with visual properties
      material = new THREE.MeshStandardMaterial({
        color: visuals.color,
        emissive: visuals.emissive || new THREE.Color(visuals.color).multiplyScalar(0.3),
        emissiveIntensity: 0.2,
        roughness: 0.5,
        metalness: 0.3
      });
    } else {
      // Fully developed form (ordered world)
      geometry = new THREE.DodecahedronGeometry(visuals.size * 0.7, 2);
      
      // Create material with visual properties
      material = new THREE.MeshStandardMaterial({
        color: visuals.color,
        emissive: visuals.emissive || new THREE.Color(visuals.color).multiplyScalar(0.4),
        emissiveIntensity: 0.3,
        roughness: 0.4,
        metalness: 0.4
      });
    }
    
    // Create or update mesh
    if (this.mesh === null) {
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
      
      // Add a point light to make the entity glow slightly
      const light = new THREE.PointLight(visuals.color, 0.5, 3);
      light.intensity = this.willToLive ? 0.7 : 0.2;
      this.mesh.add(light);
    } else {
      // Update existing mesh
      this.mesh.geometry.dispose();
      this.mesh.geometry = geometry;
      
      this.mesh.material.dispose();
      this.mesh.material = material;
      
      // Update light
      if (this.mesh.children.length > 0 && this.mesh.children[0].isLight) {
        this.mesh.children[0].color.set(visuals.color);
        this.mesh.children[0].intensity = this.willToLive ? 0.7 : 0.2;
      }
    }
    
    // Set initial position
    this.mesh.position.set(0, 0.5, 0);
  }
  
  /**
   * Updates player movement based on controls
   * @param {Object} direction - Direction vector from controls
   * @param {number} intensity - Movement intensity (0-1)
   */
  updateMovement(direction, intensity) {
    if (!this.mesh) return;
    
    // Calculate base speed based on traits and intensity
    const speed = this.traits.speed * intensity * 0.02;
    
    // Apply energy cost based on movement
    if (intensity > 0.1) {
      this.consumeEnergy(intensity);
    }
    
    // Update position
    const moveX = direction.x * speed;
    const moveZ = direction.y * speed;
    
    this.mesh.position.x += moveX;
    this.mesh.position.z += moveZ;
    
    // Maintain proper height based on stage
    // Set a higher base height to ensure player is always visible above terrain
    const baseHeight = 0.5;
    if (this.game.state.stage === 'primordial') {
      // In primordial, add subtle floating based on animation
      if (this.willToLive) {
        // After finding will to live, animate height slightly
        this.mesh.position.y = baseHeight + (0.05 * Math.sin(Date.now() * 0.002));
      } else {
        // Before finding will to live, maintain a consistent height
        this.mesh.position.y = baseHeight;
      }
    } else if (this.game.state.stage === 'prehistoric') {
      // In prehistoric, maintain higher position above terrain
      this.mesh.position.y = baseHeight + 0.1;
    } else {
      // In ordered stage, maintain even higher position
      this.mesh.position.y = baseHeight + 0.2;
    }
    
    // Update rotation to face movement direction
    if (Math.abs(moveX) > 0.001 || Math.abs(moveZ) > 0.001) {
      const targetRotation = Math.atan2(moveX, moveZ);
      
      // Smoothly rotate towards movement direction
      const rotationSpeed = 0.1;
      let currentRotation = this.mesh.rotation.y;
      
      // Find shortest path to target rotation
      let deltaRotation = targetRotation - currentRotation;
      if (deltaRotation > Math.PI) deltaRotation -= Math.PI * 2;
      if (deltaRotation < -Math.PI) deltaRotation += Math.PI * 2;
      
      // Apply smooth rotation
      this.mesh.rotation.y += deltaRotation * rotationSpeed;
    }
  }
  
  /**
   * Consumes energy based on movement intensity and trait efficiency
   * @param {number} intensity - Movement intensity
   */
  consumeEnergy(intensity) {
    // Higher energy cost for more intense movement, modified by trait
    const energyCost = intensity * 0.001 * this.traits.energyCost;
    
    // No actual resource reduction for now, but could be implemented
    // this.game.state.resources -= energyCost;
  }
  
  /**
   * Find what the player can interact with in the current context
   * @returns {Object|null} Object containing interaction type and target, or null if nothing found
   * @private
   */
  _getInteractable() {
    if (!this.game.stageManager || !this.game.stageManager.currentScene) {
      return null;
    }
    
    const scene = this.game.stageManager.currentScene;
    const position = this.mesh.position;
    const interactionRadius = 2.5; // Standard interaction radius
    
    // Check for "will to live" if not found yet
    if (this.game.state.stage === 'primordial' && !this.willToLive) {
      const willToLiveObj = scene.getWillToLiveObject();
      if (willToLiveObj && position.distanceTo(willToLiveObj.position) < interactionRadius) {
        return { type: 'willToLive', target: willToLiveObj };
      }
    }
    
    // Check for event triggers
    if (this.game.eventSystem) {
      const eventTrigger = this.game.eventSystem.getNearbyEventTrigger(position, interactionRadius);
      if (eventTrigger) {
        return { type: 'eventTrigger', target: eventTrigger };
      }
    }
    
    // Check for resources
    const resources = scene.getNearbyResources(position, interactionRadius);
    if (resources && resources.length > 0) {
      return { type: 'resource', target: resources[0] };
    }
    
    // Check for environment interaction points (specific to each stage)
    const environmentInteraction = scene.getEnvironmentInteractable(position, interactionRadius);
    if (environmentInteraction) {
      return { type: 'environment', target: environmentInteraction };
    }
    
    // Check for villages in ordered stage
    if (this.game.state.stage === 'ordered') {
      const village = scene.getNearbyVillage(position, interactionRadius);
      if (village) {
        return { type: 'village', target: village };
      }
    }
    
    return null;
  }
  
  /**
   * Perform action based on current context
   */
  performAction() {
    // Only check for stageManager and its currentScene property
    if (!this.game.stageManager || !this.game.stageManager.currentScene) {
      // Set a timestamp to prevent showing this message too frequently
      const now = Date.now();
      if (!this._lastSceneErrorTime || now - this._lastSceneErrorTime > 3000) {
        showDebugMessage.critical("Scene not ready yet");
        this._lastSceneErrorTime = now;
      }
      return;
    }
    
    // Reset error timestamp when scene is ready
    this._lastSceneErrorTime = null;
    
    // Find what we can interact with
    const interactable = this._getInteractable();
    const stage = this.game.state.stage;
    
    // No nearby interactable objects
    if (!interactable) {
      // Only show this message if player pressed the action button
      // and there hasn't been a recent "nothing nearby" message
      const now = Date.now();
      if (!this._lastNothingNearbyTime || now - this._lastNothingNearbyTime > 5000) {
        showDebugMessage.info("Nothing to interact with nearby");
        this._lastNothingNearbyTime = now;
      }
      return;
    }
    
    // Handle interaction based on type
    switch (interactable.type) {
      case 'willToLive':
        this.willToLive = true;
        this.game.stageManager.currentScene.onWillToLiveFound();
        this.createMesh();
        this.game.hud.showEvolutionNotification('Will to Live', 'Your perception sharpens and purpose emerges.');
        showDebugMessage.achievement("Found will to live!", { position: 'center' });
        break;
        
      case 'eventTrigger':
        // Trigger a philosophical event from this object
        if (this.game.eventSystem && this.game.eventSystem.triggerEventFromObject(interactable.target)) {
          showDebugMessage.interaction("Philosophical insight discovered", { position: 'center' });
        } else {
          // Don't show a message - the object is quietly depleted
          // This reduces message spam when trying to interact with depleted objects
        }
        break;
        
      case 'resource':
        const resource = interactable.target;
        const amount = this.game.stageManager.currentScene.collectResource(resource);
        const finalAmount = Math.round(amount * this.traits.resourceGain);
        
        this.game.state.resources += finalAmount;
        this._showResourceCollectionFeedback(finalAmount, resource.mesh.position.clone());
        
        // Track resource collection for event system
        if (this.game.eventSystem) {
          this.game.eventSystem.onResourceCollected();
        }
        
        // Only show message for significant resources (reducing spam)
        if (finalAmount > 1) {
          // Show collection message based on stage
          let resourceName = 'energy';
          if (stage === 'prehistoric') resourceName = 'materials';
          if (stage === 'ordered') resourceName = 'supplies';
          
          showDebugMessage.resource(`Collected ${finalAmount} ${resourceName}`);
        }
        break;
        
      case 'environment':
        const environmentResult = this.interactWithEnvironment();
        if (environmentResult) {
          showDebugMessage.interaction("Environment interaction successful");
        } else {
          // Only show failure message if there was a legitimate attempt
          if (environmentResult !== null) {
            showDebugMessage.info("Could not interact with environment");
          }
        }
        break;
        
      case 'village':
        const villageResult = this.interactWithVillage();
        if (villageResult) {
          showDebugMessage.interaction("Village interaction successful");
        } else {
          showDebugMessage.info("Village not ready for interaction");
        }
        break;
    }
  }
  
  /**
   * Show feedback when collecting a resource
   * @param {number} amount - Amount collected
   * @param {THREE.Vector3} position - Position where resource was collected
   * @private
   */
  _showResourceCollectionFeedback(amount, position) {
    // Create floating text element for feedback
    const feedbackEl = document.createElement('div');
    feedbackEl.textContent = `+${amount}`;
    feedbackEl.style.position = 'absolute';
    feedbackEl.style.color = '#00ffaa';
    feedbackEl.style.fontWeight = 'bold';
    feedbackEl.style.fontSize = '16px';
    feedbackEl.style.textShadow = '0 0 3px rgba(0,0,0,0.8)';
    feedbackEl.style.zIndex = '1000';
    feedbackEl.style.transition = 'transform 1s, opacity 1s';
    feedbackEl.style.pointerEvents = 'none';
    document.body.appendChild(feedbackEl);
    
    // Convert 3D position to screen position
    const canvas = this.game.renderer.domElement;
    const vector = position.clone();
    vector.project(this.game.camera);
    const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (-(vector.y * 0.5) + 0.5) * canvas.clientHeight;
    
    // Position and animate
    feedbackEl.style.left = `${x}px`;
    feedbackEl.style.top = `${y}px`;
    feedbackEl.style.opacity = '1';
    feedbackEl.style.transform = 'translateY(0)';
    
    // Animate upward and fade out
    setTimeout(() => {
      feedbackEl.style.transform = 'translateY(-30px)';
      feedbackEl.style.opacity = '0';
    }, 50);
    
    // Remove after animation
    setTimeout(() => {
      document.body.removeChild(feedbackEl);
    }, 1100);
  }
  
  /**
   * Interact with the environment based on stage and player position
   * @returns {boolean} Whether interaction occurred
   */
  interactWithEnvironment() {
    return this.game.stageManager.currentScene.playerInteractWithEnvironment(
      this.mesh.position,
      this.traits,
      this.philosophicalTraits
    );
  }
  
  /**
   * Interact with villages (ordered world stage)
   * @returns {boolean} Whether interaction occurred
   */
  interactWithVillage() {
    if (this.game.state.stage !== 'ordered') return false;
    
    return this.game.stageManager.currentScene.playerInteractWithVillage(
      this.mesh.position,
      this.traits,
      this.philosophicalTraits
    );
  }
  
  /**
   * Apply restart bonuses from previous runs
   * @param {Object} restartData - Data from previous run
   */
  applyRestartBonuses(restartData) {
    const bonuses = getRestartBonuses(
      this.evolutionType,
      restartData.restarts,
      restartData.previousStage
    );
    
    // Apply bonuses to traits
    Object.entries(bonuses).forEach(([key, value]) => {
      if (key === 'startingResources') {
        this.game.state.resources = value;
      } else if (key === 'floodWarning') {
        // Will be handled by stage manager
      } else if (key === 'evolutionMemory') {
        // Could give hints about next stage
      } else if (typeof value === 'number') {
        // Apply numerical trait bonuses
        if (this.traits[key]) {
          this.traits[key] *= value;
        }
      }
    });
    
    // Notify player of bonuses if significant
    if (restartData.restarts > 1) {
      setTimeout(() => {
        this.game.hud.showEvolutionNotification(
          'Evolutionary Memory',
          `Previous ${restartData.restarts} attempts have strengthened your adaptability.`
        );
      }, 3000);
    }
  }
  
  /**
   * Evolve player to the next stage
   * @param {string} nextStage - Stage to evolve to
   */
  evolve(nextStage) {
    // Evolve traits based on current traits and next stage
    this.traits = evolveEntity(this.evolutionType, nextStage, this.traits);
    
    // Create new mesh for evolved form
    this.createMesh();
    
    // Show notification
    let evolutionMessage = '';
    if (nextStage === 'prehistoric') {
      evolutionMessage = 'Your form becomes more defined as you adapt to the coastal environment.';
    } else if (nextStage === 'ordered') {
      evolutionMessage = 'Consciousness emerges as you evolve into the ordered world.';
    }
    
    setTimeout(() => {
      this.game.hud.showEvolutionNotification('Evolution', evolutionMessage);
    }, 5000); // Show after stage transition
  }
  
  /**
   * Modify a philosophical trait
   * @param {string} trait - Trait to modify
   * @param {number} amount - Amount to modify by
   */
  modifyTrait(trait, amount) {
    // Check if this is a philosophical trait
    if (this.philosophicalTraits.hasOwnProperty(trait)) {
      this.philosophicalTraits[trait] += amount;
      
      // Clamp values between 0 and 2
      this.philosophicalTraits[trait] = Math.max(0, Math.min(2, this.philosophicalTraits[trait]));
      
      // Apply effects of philosophical traits to gameplay traits
      this.applyPhilosophicalEffects();
    } else if (this.traits.hasOwnProperty(trait)) {
      // Modify gameplay trait directly
      this.traits[trait] += amount;
      
      // Recreate mesh to reflect trait changes
      if (trait === 'size' || trait === 'consciousness') {
        this.createMesh();
      }
    }
  }
  
  /**
   * Apply effects of philosophical traits to gameplay
   */
  applyPhilosophicalEffects() {
    // Compassion affects coopBonus
    if (this.traits.coopBonus) {
      this.traits.coopBonus = this.traits.coopBonus * (0.8 + (this.philosophicalTraits.compassion * 0.2));
    }
    
    // Curiosity affects adaptability
    if (this.traits.adaptability) {
      this.traits.adaptability = this.traits.adaptability * (0.8 + (this.philosophicalTraits.curiosity * 0.2));
    }
    
    // Consciousness affects all traits subtly
    if (this.philosophicalTraits.consciousness > 0) {
      const consciousnessBonus = 1 + (this.philosophicalTraits.consciousness * 0.05);
      this.traits.speed *= consciousnessBonus;
      this.traits.resourceGain *= consciousnessBonus;
    }
    
    // Higher cooperation helps in village interactions
    if (this.traits.villageInfluence && this.philosophicalTraits.cooperation > 0.7) {
      this.traits.villageInfluence *= (0.8 + (this.philosophicalTraits.cooperation * 0.3));
    }
  }
  
  /**
   * Configure player for stage
   * @param {string} stage - Current game stage
   */
  configureForStage(stage) {
    // Position player appropriately for each stage
    if (stage === 'primordial') {
      this.mesh.position.set(0, 0.5, 0);
      
      // In primordial stage, start without will to live
      if (this.game.state.newGame) {
        this.willToLive = false;
        this.createMesh();
      } else {
        // If continuing or restarting, keep will to live
        this.willToLive = true;
      }
    } else if (stage === 'prehistoric') {
      this.mesh.position.set(0, 0.5, 0);
      this.willToLive = true; // Always have will to live after primordial
    } else if (stage === 'ordered') {
      this.mesh.position.set(0, 0.5, 0);
      this.willToLive = true;
    }
  }
  
  /**
   * Update player each frame
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Animation or effects based on stage and traits
    if (this.mesh) {
      if (!this.willToLive) {
        // Pre-will-to-live pulsing effect
        const pulseScale = 0.9 + (0.1 * Math.sin(Date.now() * 0.003));
        this.mesh.scale.set(pulseScale, pulseScale, pulseScale);
        
        // Ensure player is at correct base height
        this.mesh.position.y = 0.5;
      } else {
        // For stages other than primordial, height is managed in updateMovement
        // We don't want to override that logic here
        
        // Slightly more active movement in prehistoric
        if (this.game.state.stage === 'prehistoric') {
          const rotateSpeed = 0.0005 * this.traits.speed;
          this.mesh.rotation.y += rotateSpeed * deltaTime;
        }
      }
      
      // Consciousness effect (if applicable)
      if (this.philosophicalTraits.consciousness > 0.5) {
        const intensity = this.philosophicalTraits.consciousness * 0.7;
        if (this.mesh.children[0] && this.mesh.children[0].isLight) {
          this.mesh.children[0].intensity = 0.2 + (intensity * Math.sin(Date.now() * 0.001));
        }
      }
    }
  }
} 