/**
 * Event system for philosophical choices and events
 */
import * as THREE from 'three';

export default class EventSystem {
  /**
   * Initialize event system
   * @param {Object} game - Reference to main game instance
   */
  constructor(game) {
    this.game = game;
    this.activeEvent = null;
    this.eventHistory = [];
    this.eventCooldown = 0;
    this.stageEvents = this.loadEvents();
    
    // Minimum exploration time before events can trigger (in milliseconds)
    this.explorationTime = 60000; // 60 seconds of gameplay before events can occur
    this.gameStartTime = Date.now();
    
    // Track number of resources collected to gauge player activity
    this.resourcesCollected = 0;
    
    // Track interactive objects that can trigger events
    this.interactiveObjects = [];
    
    // Track the current active event trigger for removal after event completion
    this.activeEventTrigger = null;
  }
  
  /**
   * Define all possible events by stage
   * @returns {Object} Events organized by stage
   */
  loadEvents() {
    return {
      primordial: [
        {
          id: 'struggling_entity',
          title: 'Struggling Entity',
          description: 'You encounter a smaller entity struggling to survive. Consuming it would provide immediate energy.',
          choices: [
            {
              text: 'Consume it for energy',
              outcome: 'You gained energy but lost something less tangible.',
              effect: (game) => {
                game.state.resources += 3;
                game.state.player.modifyTrait('compassion', -0.2);
                return 'You gained 3 energy but your capacity for compassion decreased.';
              }
            },
            {
              text: 'Leave it alone',
              outcome: 'You passed up easy energy, but feel a strange sense of connection.',
              effect: (game) => {
                game.state.player.modifyTrait('compassion', 0.3);
                return 'Your capacity for compassion increased.';
              }
            }
          ]
        },
        {
          id: 'glowing_substance',
          title: 'Glowing Substance',
          description: 'A strange glowing substance pulses nearby. It seems potentially valuable but unpredictable.',
          choices: [
            {
              text: 'Absorb it directly',
              outcome: 'The substance merges with you, creating an unusual reaction.',
              effect: (game) => {
                const random = Math.random();
                if (random > 0.7) {
                  game.state.player.modifyTrait('speed', 0.2);
                  return 'You feel faster and more agile!';
                } else if (random > 0.4) {
                  game.state.resources += 5;
                  return 'The substance converts to 5 energy!';
                } else {
                  game.state.timer -= 10;
                  return 'You feel disoriented, losing precious time before the flood.';
                }
              }
            },
            {
              text: 'Study it carefully first',
              outcome: 'Patient observation reveals the substance\'s nature.',
              effect: (game) => {
                game.state.player.modifyTrait('curiosity', 0.2);
                game.state.resources += 2;
                return 'You gained insights and 2 energy from careful study.';
              }
            }
          ]
        }
      ],
      
      prehistoric: [
        {
          id: 'trapped_creature',
          title: 'Trapped Creature',
          description: 'You find a creature trapped under fallen debris. Helping would cost time and energy.',
          choices: [
            {
              text: 'Help free the creature',
              outcome: 'The creature is grateful and follows you briefly.',
              effect: (game) => {
                game.state.timer -= 5;
                game.state.resources -= 1;
                if (game.state.player.traits.compassion > 0.5) {
                  game.state.resources += 4;
                  return 'The grateful creature leads you to a hidden cache of materials, yielding 4 resources!';
                } else {
                  game.state.resources += 2;
                  return 'The creature shares 2 resources with you before departing.';
                }
              }
            },
            {
              text: 'Continue on your path',
              outcome: 'You leave the creature to its fate, focusing on your own survival.',
              effect: (game) => {
                game.state.player.modifyTrait('compassion', -0.2);
                game.state.player.modifyTrait('efficiency', 0.1);
                return 'Your efficiency increased, but your capacity for compassion decreased.';
              }
            }
          ]
        },
        {
          id: 'ancient_knowledge',
          title: 'Ancient Markings',
          description: 'Strange patterns are carved into a rock face. They seem to contain knowledge.',
          choices: [
            {
              text: 'Take time to decipher them',
              outcome: 'The patterns reveal insights about the coming meteor.',
              effect: (game) => {
                game.state.timer -= 8;
                game.state.player.modifyTrait('adaptability', 0.3);
                game.state.floodTimer = game.state.floodTimer + 20;
                return 'You gained advance warning about the meteor, adding 20 seconds to prepare!';
              }
            },
            {
              text: 'Make a quick sketch and move on',
              outcome: 'You capture the basic pattern but miss deeper meaning.',
              effect: (game) => {
                game.state.player.modifyTrait('curiosity', 0.1);
                return 'Your curiosity increased slightly. Perhaps the patterns will make sense later.';
              }
            }
          ]
        }
      ],
      
      ordered: [
        {
          id: 'village_dispute',
          title: 'Village Dispute',
          description: 'Two villages argue over limited building materials as flood warnings intensify.',
          choices: [
            {
              text: 'Help them cooperate on a shared defense',
              outcome: 'Cooperation proves challenging but rewarding.',
              effect: (game) => {
                if (game.state.player.traits.villageInfluence > 1.2) {
                  game.state.resources += 8;
                  game.state.player.modifyTrait('cooperation', 0.3);
                  return 'Your exceptional influence helps forge an alliance! You gain 8 supplies and increased cooperative ability.';
                } else {
                  game.state.timer -= 10;
                  game.state.resources += 3;
                  game.state.player.modifyTrait('cooperation', 0.1);
                  return 'After some time, you convince them to work together. You gain 3 supplies.';
                }
              }
            },
            {
              text: 'Choose one village to support',
              outcome: 'Strategic alliance focuses resources but creates division.',
              effect: (game) => {
                game.state.resources += 5;
                game.state.player.modifyTrait('influence', 0.2);
                game.state.player.modifyTrait('cooperation', -0.2);
                return 'The chosen village provides 5 supplies, but others view you with suspicion.';
              }
            }
          ]
        },
        {
          id: 'philosophy_stone',
          title: 'The Consciousness Stone',
          description: 'A peculiar stone emanates awareness. It seems to offer profound knowledge at a price.',
          choices: [
            {
              text: 'Bond with the stone completely',
              outcome: 'The stone\'s consciousness merges with yours.',
              effect: (game) => {
                game.state.player.modifyTrait('consciousness', 0.5);
                game.state.timer -= 15;
                return 'Your consciousness expands dramatically, but the deep connection cost valuable time.';
              }
            },
            {
              text: 'Learn from it but maintain separation',
              outcome: 'You gain insights while preserving your identity.',
              effect: (game) => {
                game.state.player.modifyTrait('consciousness', 0.2);
                game.state.resources += 3;
                return 'Your consciousness expands moderately, and you convert some insights into 3 supplies.';
              }
            }
          ]
        }
      ]
    };
  }
  
  /**
   * Create interactive event triggers in the scene
   * @param {string} stage - Current game stage
   * @param {THREE.Scene} scene - Current scene to add triggers to
   */
  createInteractiveTriggers(stage) {
    // Ensure we don't create duplicate triggers if this method is called multiple times
    // by checking if we already have interactive objects for this stage
    const existingTriggers = this.interactiveObjects.filter(obj => 
      obj && obj.userData && obj.userData.stage === stage
    );
    
    // If we already have triggers for this stage, don't create more
    if (existingTriggers.length > 0) {
      return;
    }
    
    // Clear existing interactive objects that don't match the current stage
    this.interactiveObjects = this.interactiveObjects.filter(obj => 
      !obj || !obj.userData || obj.userData.stage !== stage
    );
    
    if (!this.game.stageManager || !this.game.stageManager.currentScene) {
      return;
    }
    
    const scene = this.game.stageManager.currentScene;
    
    // Limit insights to a consistent number based on available events
    const availableEvents = this.stageEvents[stage];
    if (!availableEvents || availableEvents.length === 0) {
      return;
    }
    
    // Create max 1 philosophical insight per available event type, with a max of 2
    const count = Math.min(availableEvents.length, 2);
    
    // Store angles to prevent duplicate spawns in similar locations
    const usedAngles = [];
    // Track positions to double-check for duplicates
    const usedPositions = [];
    
    for (let i = 0; i < count; i++) {
      // Create a distinct looking interactive object with guaranteed unique position
      this.createInteractiveObject(scene, stage, i, usedAngles, usedPositions);
    }
  }
  
  /**
   * Create a single interactive object that can trigger events
   * @param {Object} scene - Current scene
   * @param {string} stage - Current game stage
   * @param {number} index - Object index for positioning
   * @param {Array} usedAngles - Array of angles already used for positioning
   * @param {Array} usedPositions - Array of positions already used for positioning
   */
  createInteractiveObject(scene, stage, index, usedAngles, usedPositions) {
    // In primordial stage, event objects only appear after finding the will-to-live
    if (stage === 'primordial' && this.game.state.player && !this.game.state.player.willToLive) {
      return;
    }
    
    // Don't create if we don't have events for this stage
    const availableEvents = this.stageEvents[stage];
    if (!availableEvents || availableEvents.length === 0) {
      return;
    }
    
    // Create different objects based on stage
    let mesh;
    
    if (stage === 'primordial') {
      // Create a pulsing, unusual formation
      const geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.1, 0.2, 0.1),
          new THREE.Vector3(-0.1, 0.4, -0.1),
          new THREE.Vector3(0, 0.6, 0)
        ]),
        12, 0.15, 8, false
      );
      
      const material = new THREE.MeshStandardMaterial({
        color: 0x006699,
        emissive: 0x002244,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.7
      });
      
      mesh = new THREE.Mesh(geometry, material);
      
      // Add subtle point light
      const light = new THREE.PointLight(0x00aaff, 0.8, 3);
      mesh.add(light);
      
    } else if (stage === 'prehistoric') {
      // Create a mysterious artifact or fossil
      const geometry = new THREE.DodecahedronGeometry(0.3, 0);
      const material = new THREE.MeshStandardMaterial({
        color: 0x884422,
        emissive: 0x441100,
        emissiveIntensity: 0.3,
        roughness: 0.7,
        metalness: 0.4
      });
      
      mesh = new THREE.Mesh(geometry, material);
      
      // Add subtle point light
      const light = new THREE.PointLight(0xffaa44, 0.6, 2);
      mesh.add(light);
      
    } else {
      // Ordered world - create a floating crystal or monument
      const geometry = new THREE.OctahedronGeometry(0.35, 1);
      const material = new THREE.MeshStandardMaterial({
        color: 0xaabbdd,
        emissive: 0x334455,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.8
      });
      
      mesh = new THREE.Mesh(geometry, material);
      
      // Add subtle point light
      const light = new THREE.PointLight(0x88aaff, 0.7, 3);
      mesh.add(light);
    }
    
    // Position the object somewhere in the scene but not too close to start
    // Use a wider spacing for consecutive objects
    const minDistance = 12 + (index * 8); 
    const maxDistance = minDistance + 8;
    
    // Map boundary constraints - ensure objects stay well within playable area
    // Assume the map boundary is at +/- 25 units (from general game setup)
    const mapBoundary = 25;
    const safetyMargin = 6; // Keep objects at least 6 units from map edge
    const maxAllowedDistance = mapBoundary - safetyMargin;
    
    // Calculate actual distance constraints
    const effectiveMaxDistance = Math.min(maxDistance, maxAllowedDistance);
    const effectiveMinDistance = Math.min(minDistance, maxAllowedDistance - 5);
    
    // Generate a unique position for this object
    let position = new THREE.Vector3();
    let angle;
    let distance;
    let attempts = 0;
    const minAngleDifference = Math.PI / 2; // At least 90 degrees apart
    const maxAttempts = 30; // Increase max attempts to find good positions
    
    // Keep trying until we find a suitable position or reach max attempts
    do {
      angle = Math.random() * Math.PI * 2;
      distance = effectiveMinDistance + (Math.random() * (effectiveMaxDistance - effectiveMinDistance));
      
      // Calculate potential position
      position = new THREE.Vector3(
        Math.cos(angle) * distance,
        0.5 + (Math.random() * 0.5),
        Math.sin(angle) * distance
      );
      
      // Explicitly check map boundaries
      const isSafeFromBoundary = 
        Math.abs(position.x) < (mapBoundary - safetyMargin) && 
        Math.abs(position.z) < (mapBoundary - safetyMargin);
      
      // Check angle uniqueness
      const isAngleUnique = !usedAngles.some(usedAngle => {
        const angleDiff = Math.abs(angle - usedAngle);
        return angleDiff < minAngleDifference && (Math.PI * 2 - angleDiff) < minAngleDifference;
      });
      
      // Check position uniqueness (minimum distance of 8 units from other objects)
      const isPositionUnique = !usedPositions.some(usedPos => {
        return position.distanceTo(usedPos) < 8;
      });
      
      attempts++;
      
      // Break after max attempts or if we found a unique position that's safe from boundaries
      if (attempts >= maxAttempts || (isAngleUnique && isPositionUnique && isSafeFromBoundary)) {
        // If we've tried many times but still can't find a good spot, enforce boundary safety
        if (attempts >= maxAttempts && !isSafeFromBoundary) {
          // Force position to be safe
          position.x = Math.sign(position.x) * Math.min(Math.abs(position.x), mapBoundary - safetyMargin);
          position.z = Math.sign(position.z) * Math.min(Math.abs(position.z), mapBoundary - safetyMargin);
        }
        break;
      }
    } while (true);
    
    // Store the angle and position for future uniqueness checks
    usedAngles.push(angle);
    
    // Set the position
    mesh.position.copy(position);
    
    // Set user data for identification
    mesh.userData.type = 'eventTrigger';
    mesh.userData.eventTriggerId = `trigger_${Date.now()}_${index}`;
    mesh.userData.stage = stage;
    mesh.userData.isActive = true; // Flag to track if this trigger is still active/available
    
    // Store a subset of events this trigger can activate
    if (availableEvents.length > 0) {
      // Assign 1 event to this trigger
      // This ensures each insight has a unique event
      const eventIndex = index % availableEvents.length;
      mesh.userData.eventPool = [availableEvents[eventIndex]];
    }
    
    // Add the mesh to the scene
    scene.scene.add(mesh);
    
    // Store reference
    this.interactiveObjects.push(mesh);
    
    // Track position
    usedPositions.push(position);
    
    return mesh;
  }
  
  /**
   * Updates the event system, potentially triggering new events
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // If there's an active event, don't process further
    if (this.activeEvent) return;
    
    // Reduce cooldown
    if (this.eventCooldown > 0) {
      this.eventCooldown -= deltaTime;
      return;
    }
    
    // Animate interactive objects if they exist
    this.updateInteractiveObjects(deltaTime);
    
    // We're disabling random event triggering - events should only come from interacting with objects
    // Random event triggering code is commented out below for reference
    
    /*
    // Only allow random events to trigger occasionally after sufficient exploration
    // and after finding will-to-live in primordial stage
    const timeElapsed = Date.now() - this.gameStartTime;
    
    if (timeElapsed < this.explorationTime) {
      return;
    }
    
    // In primordial stage, require will-to-live first
    if (this.game.state.stage === 'primordial' && 
        this.game.state.player && 
        !this.game.state.player.willToLive) {
      return;
    }
    
    // Less frequent random events than before - mostly relying on interaction
    const eventChance = Math.random();
    const currentStage = this.game.state.stage;
    
    // Higher chance of events as flood approaches, but much lower base chance
    const floodProgress = 1 - (this.game.state.timer / this.game.stageManager.stageConfig[currentStage].timerDuration);
    const threshold = 0.005 + (floodProgress * 0.03); // 0.5-3.5% chance per update
    
    if (eventChance < threshold && this.resourcesCollected >= 3) {
      this.triggerRandomEvent();
    }
    */
  }
  
  /**
   * Animate and update interactive event trigger objects
   * @param {number} deltaTime - Time since last update
   */
  updateInteractiveObjects(deltaTime) {
    this.interactiveObjects.forEach(obj => {
      if (!obj) return;
      
      // Gentle floating motion
      obj.position.y = obj.userData.baseY || obj.position.y;
      obj.position.y += Math.sin(Date.now() * 0.001) * 0.05;
      
      if (!obj.userData.baseY) {
        obj.userData.baseY = obj.position.y;
      }
      
      // Slow rotation
      obj.rotation.y += 0.001 * deltaTime;
      
      // Pulsing light if present
      if (obj.children[0] && obj.children[0].isLight) {
        obj.children[0].intensity = 0.6 + (Math.sin(Date.now() * 0.002) * 0.2);
      }
    });
  }
  
  /**
   * Check if player is near an interactive object and can trigger an event
   * @param {THREE.Vector3} playerPosition - Current player position
   * @param {number} interactionRadius - Radius within which interaction is possible
   * @returns {Object|null} Interactive object if in range, null otherwise
   */
  getNearbyEventTrigger(playerPosition, interactionRadius) {
    // Filter to find only active objects with valid event pools that are within range
    return this.interactiveObjects.find(obj => {
      if (!obj || !obj.userData || !obj.userData.isActive) return false;
      if (!obj.userData.eventPool || obj.userData.eventPool.length === 0) return false;
      
      const distance = playerPosition.distanceTo(obj.position);
      return distance < interactionRadius;
    });
  }
  
  /**
   * Trigger an event from a specific interactive object
   * @param {Object} triggerObject - The object that triggered the event
   * @returns {boolean} Whether an event was successfully triggered
   */
  triggerEventFromObject(triggerObject) {
    // If no trigger pool or already triggered all its events, return
    if (!triggerObject.userData.eventPool || 
        triggerObject.userData.eventPool.length === 0) {
      // Mark as inactive so it will be ignored in future interactions
      if (triggerObject.userData) {
        triggerObject.userData.isActive = false;
      }
      return false;
    }
    
    // Get a random event from this trigger's pool
    const eventIndex = Math.floor(Math.random() * triggerObject.userData.eventPool.length);
    const selectedEvent = { ...triggerObject.userData.eventPool[eventIndex] };
    
    // Remove the event from the pool so it doesn't trigger again from this object
    triggerObject.userData.eventPool.splice(eventIndex, 1);
    
    // If no more events left, mark as inactive
    if (triggerObject.userData.eventPool.length === 0) {
      triggerObject.userData.isActive = false;
    }
    
    // Set as active event
    this.activeEvent = selectedEvent;
    
    // Add some particles/effects at the trigger location
    this.showTriggerEffect(triggerObject);
    
    // Pause game (stop flood timer)
    this.game.pause();
    
    // Display event UI
    this.displayEventUI(selectedEvent);
    
    // Set cooldown
    this.eventCooldown = 20000; // 20 seconds before another event can trigger
    
    // Add to history
    this.eventHistory.push(selectedEvent);
    
    // Store reference to the trigger object and current scene for removal after event resolution
    this.activeEventTrigger = {
      object: triggerObject,
      scene: this.game.stageManager.currentScene.scene
    };
    
    return true;
  }
  
  /**
   * Show visual effect when an event trigger is activated
   * @param {Object} triggerObject - The object that triggered the event
   */
  showTriggerEffect(triggerObject) {
    // Create a flash of light
    const position = triggerObject.position.clone();
    const scene = this.game.stageManager.currentScene.scene;
    
    // Add a bright flash
    const flash = new THREE.PointLight(0xffffff, 3, 10);
    flash.position.copy(position);
    scene.add(flash);
    
    // Fade out the flash
    const startTime = Date.now();
    const fadeFlash = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 1000) {
        flash.intensity = 3 * (1 - elapsed / 1000);
        requestAnimationFrame(fadeFlash);
      } else {
        scene.remove(flash);
      }
    };
    
    fadeFlash();
  }
  
  /**
   * Track resource collection for event triggering
   */
  onResourceCollected() {
    this.resourcesCollected++;
    
    // After collecting several resources, ensure interactive objects are created
    // But only if we don't already have active triggers for this stage
    if (this.resourcesCollected === 3) {
      const currentStage = this.game.state.stage;
      
      // Check if we already have triggers for this stage
      const stageTriggersExist = this.interactiveObjects.some(obj =>
        obj && obj.userData && obj.userData.stage === currentStage
      );
      
      // Only create if no triggers exist for this stage
      if (!stageTriggersExist) {
        this.createInteractiveTriggers(currentStage);
      }
    }
  }
  
  /**
   * Triggers a random event appropriate for the current stage
   */
  triggerRandomEvent() {
    const currentStage = this.game.state.stage;
    const availableEvents = this.stageEvents[currentStage];
    
    if (!availableEvents || availableEvents.length === 0) return;
    
    // Filter out recently triggered events
    const recentEventIds = this.eventHistory
      .slice(-3)
      .map(event => event.id);
    
    const eligibleEvents = availableEvents.filter(
      event => !recentEventIds.includes(event.id)
    );
    
    // If no eligible events, reset history and try again
    if (eligibleEvents.length === 0) {
      this.eventHistory = [];
      this.triggerRandomEvent();
      return;
    }
    
    // Select random event
    const randomIndex = Math.floor(Math.random() * eligibleEvents.length);
    const selectedEvent = { ...eligibleEvents[randomIndex] };
    
    // Set as active event
    this.activeEvent = selectedEvent;
    
    // Pause game (stop flood timer)
    this.game.pause();
    
    // Display event UI
    this.displayEventUI(selectedEvent);
    
    // Add to history
    this.eventHistory.push(selectedEvent);
    
    // Set cooldown
    this.eventCooldown = 20000; // 20 seconds before another event
  }
  
  /**
   * Display the event UI with choices
   * @param {Object} event - Event to display
   */
  displayEventUI(event) {
    // Create event modal container
    const modalContainer = document.createElement('div');
    modalContainer.id = 'event-modal';
    modalContainer.style.position = 'absolute';
    modalContainer.style.top = '0';
    modalContainer.style.left = '0';
    modalContainer.style.width = '100%';
    modalContainer.style.height = '100%';
    modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modalContainer.style.display = 'flex';
    modalContainer.style.justifyContent = 'center';
    modalContainer.style.alignItems = 'center';
    modalContainer.style.zIndex = '500';
    document.body.appendChild(modalContainer);
    
    // Create event card
    const eventCard = document.createElement('div');
    eventCard.style.width = '80%';
    eventCard.style.maxWidth = '500px';
    eventCard.style.backgroundColor = '#1a1a2e';
    eventCard.style.borderRadius = '10px';
    eventCard.style.padding = '20px';
    eventCard.style.color = 'white';
    eventCard.style.fontFamily = 'Arial, sans-serif';
    eventCard.style.boxShadow = '0 0 20px rgba(0, 100, 200, 0.5)';
    modalContainer.appendChild(eventCard);
    
    // Event title
    const title = document.createElement('h2');
    title.textContent = event.title;
    title.style.marginTop = '0';
    title.style.color = '#88ccff';
    eventCard.appendChild(title);
    
    // Event description
    const description = document.createElement('p');
    description.textContent = event.description;
    description.style.fontSize = '16px';
    description.style.lineHeight = '1.5';
    eventCard.appendChild(description);
    
    // Choice container
    const choicesContainer = document.createElement('div');
    choicesContainer.style.marginTop = '20px';
    eventCard.appendChild(choicesContainer);
    
    // Add choice buttons
    event.choices.forEach((choice, index) => {
      const choiceButton = document.createElement('button');
      choiceButton.textContent = choice.text;
      choiceButton.style.display = 'block';
      choiceButton.style.width = '100%';
      choiceButton.style.padding = '12px';
      choiceButton.style.margin = '10px 0';
      choiceButton.style.backgroundColor = '#16213e';
      choiceButton.style.color = 'white';
      choiceButton.style.border = '1px solid #304d6d';
      choiceButton.style.borderRadius = '5px';
      choiceButton.style.fontSize = '16px';
      choiceButton.style.cursor = 'pointer';
      
      choiceButton.addEventListener('mouseover', () => {
        choiceButton.style.backgroundColor = '#304d6d';
      });
      
      choiceButton.addEventListener('mouseout', () => {
        choiceButton.style.backgroundColor = '#16213e';
      });
      
      choiceButton.addEventListener('click', () => {
        this.resolveEvent(event, choice);
      });
      
      choicesContainer.appendChild(choiceButton);
    });
  }
  
  /**
   * Remove an event trigger object from the scene and internal tracking
   * @param {Object} triggerObject - The event trigger object to remove
   * @param {THREE.Scene} scene - The current scene
   */
  removeEventTrigger(triggerObject, scene) {
    // Verify object still exists in the scene
    if (!triggerObject) return;
    
    // Store the event trigger ID for finding it in our array later
    const triggerID = triggerObject.userData?.eventTriggerId;
    
    // Remove light children first if they exist
    if (triggerObject.children && triggerObject.children.length > 0) {
      const children = [...triggerObject.children];
      children.forEach(child => {
        triggerObject.remove(child);
        if (child.isLight) {
          // Dispose of any light resources
          child.dispose();
        }
      });
    }
    
    // Remove from scene
    scene.remove(triggerObject);
    
    // Dispose of materials and geometries
    if (triggerObject.geometry) triggerObject.geometry.dispose();
    if (triggerObject.material) {
      if (Array.isArray(triggerObject.material)) {
        triggerObject.material.forEach(mat => mat.dispose());
      } else {
        triggerObject.material.dispose();
      }
    }
    
    // Clear reference to prevent memory leaks
    triggerObject.userData = null;
    
    // Remove from our internal tracking array
    if (triggerID) {
      const index = this.interactiveObjects.findIndex(obj => 
        obj && obj.userData && obj.userData.eventTriggerId === triggerID
      );
      
      if (index !== -1) {
        // Replace with null instead of splicing to avoid shifting indices
        this.interactiveObjects[index] = null;
      }
    }
    
    // Periodically clean up null entries in the array to prevent buildup
    if (Math.random() < 0.2) { // 20% chance on each removal
      this.interactiveObjects = this.interactiveObjects.filter(obj => obj !== null);
    }
  }
  
  /**
   * Resolve an event after player makes a choice
   * @param {Object} event - Current event
   * @param {Object} choice - Player's chosen option
   */
  resolveEvent(event, choice) {
    // Get outcome message from effect
    const outcomeMessage = choice.effect(this.game);
    
    // Add to event history
    this.eventHistory.push({
      id: event.id,
      choice: choice.text,
      timestamp: Date.now()
    });
    
    // Show outcome UI
    this.showOutcomeUI(choice.outcome, outcomeMessage);
    
    // Set cooldown before next event
    this.eventCooldown = 30000; // 30 seconds in milliseconds
    
    // Remove the event trigger object from the scene if it exists
    if (this.activeEventTrigger && this.activeEventTrigger.object && this.activeEventTrigger.scene) {
      // Keep a reference before removing
      const triggerToRemove = this.activeEventTrigger.object;
      const scene = this.activeEventTrigger.scene;
      
      // Clear reference first to avoid circular issues
      this.activeEventTrigger = null;
      
      // Then remove the object
      this.removeEventTrigger(triggerToRemove, scene);
    }
    
    // Clear active event
    this.activeEvent = null;
  }
  
  /**
   * Display the outcome of an event choice
   * @param {string} outcome - Main outcome text
   * @param {string} details - Detailed effect description
   */
  showOutcomeUI(outcome, details) {
    // Get modal container
    const modalContainer = document.getElementById('event-modal');
    if (!modalContainer) return;
    
    // Clear previous content
    modalContainer.innerHTML = '';
    
    // Create outcome card
    const outcomeCard = document.createElement('div');
    outcomeCard.style.width = '80%';
    outcomeCard.style.maxWidth = '500px';
    outcomeCard.style.backgroundColor = '#1a1a2e';
    outcomeCard.style.borderRadius = '10px';
    outcomeCard.style.padding = '20px';
    outcomeCard.style.color = 'white';
    outcomeCard.style.fontFamily = 'Arial, sans-serif';
    outcomeCard.style.boxShadow = '0 0 20px rgba(0, 100, 200, 0.5)';
    modalContainer.appendChild(outcomeCard);
    
    // Outcome title
    const title = document.createElement('h2');
    title.textContent = 'Outcome';
    title.style.marginTop = '0';
    title.style.color = '#88ccff';
    outcomeCard.appendChild(title);
    
    // Main outcome
    const outcomeText = document.createElement('p');
    outcomeText.textContent = outcome;
    outcomeText.style.fontSize = '18px';
    outcomeText.style.lineHeight = '1.5';
    outcomeCard.appendChild(outcomeText);
    
    // Detailed effect
    const detailsText = document.createElement('p');
    detailsText.textContent = details;
    detailsText.style.fontSize = '16px';
    detailsText.style.color = '#aaccff';
    detailsText.style.marginTop = '15px';
    outcomeCard.appendChild(detailsText);
    
    // Continue button
    const continueButton = document.createElement('button');
    continueButton.textContent = 'Continue';
    continueButton.style.display = 'block';
    continueButton.style.width = '100%';
    continueButton.style.padding = '12px';
    continueButton.style.margin = '20px 0 0 0';
    continueButton.style.backgroundColor = '#304d6d';
    continueButton.style.color = 'white';
    continueButton.style.border = 'none';
    continueButton.style.borderRadius = '5px';
    continueButton.style.fontSize = '16px';
    continueButton.style.cursor = 'pointer';
    
    continueButton.addEventListener('click', () => {
      document.body.removeChild(modalContainer);
      this.game.resume(); // Resume game and flood timer
    });
    
    outcomeCard.appendChild(continueButton);
  }
  
  /**
   * Gets summary of player's philosophical choices
   * @returns {Object} Summary of player choices
   */
  getChoicesSummary() {
    // Count choices by category
    const summary = {
      compassion: 0,
      curiosity: 0,
      cooperation: 0,
      efficiency: 0
    };
    
    this.eventHistory.forEach(event => {
      if (event.choice.includes('Help') || event.choice.includes('leave it alone')) {
        summary.compassion++;
      }
      
      if (event.choice.includes('Study') || event.choice.includes('decipher')) {
        summary.curiosity++;
      }
      
      if (event.choice.includes('cooperate') || event.choice.includes('together')) {
        summary.cooperation++;
      }
      
      if (event.choice.includes('Consume') || event.choice.includes('quickly')) {
        summary.efficiency++;
      }
    });
    
    // Determine philosophical tendency
    let dominantTrait = 'balanced';
    let maxValue = 0;
    
    Object.entries(summary).forEach(([trait, value]) => {
      if (value > maxValue) {
        maxValue = value;
        dominantTrait = trait;
      }
    });
    
    return {
      counts: summary,
      dominantTrait: dominantTrait,
      eventCount: this.eventHistory.length
    };
  }
  
  /**
   * Clean up all event triggers from the scene for a specific stage
   * @param {string} stage - Stage to clean up triggers for
   */
  cleanupTriggers(stage) {
    // If no scene manager, we can't do anything
    if (!this.game.stageManager || !this.game.stageManager.currentScene) {
      return;
    }
    
    const scene = this.game.stageManager.currentScene.scene;
    
    // Find all triggers for this stage
    const stageTriggers = this.interactiveObjects.filter(obj => 
      obj && obj.userData && obj.userData.stage === stage
    );
    
    // Remove each trigger
    stageTriggers.forEach(trigger => {
      this.removeEventTrigger(trigger, scene);
    });
    
    // Clean up the array
    this.interactiveObjects = this.interactiveObjects.filter(obj => obj !== null);
  }
} 