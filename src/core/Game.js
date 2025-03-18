import * as THREE from 'three';
import StageManager from './StageManager.js';
import EventSystem from './Events.js';
import Player from '../entities/Player.js';
import Controls from '../ui/Controls.js';
import Hud from '../ui/Hud.js';
import CameraController from '../utils/Camera.js';
import { createCamera } from '../utils/Renderer.js';

/**
 * Main game class that manages game state and coordinates components
 */
export default class Game {
  /**
   * Initialize game
   * @param {THREE.WebGLRenderer} renderer - ThreeJS renderer
   */
  constructor(renderer) {
    this.renderer = renderer;
    this.clock = new THREE.Clock();
    this.paused = false;
    
    // Game state - single source of truth
    this.state = {
      stage: 'primordial',  // Always start at primordial stage
      resources: 0,
      resourceGoal: 0,
      timer: 0,
      player: null,
      evolutionType: null,
      restarts: 0,
      highestResources: 0,
      achievements: [],
      newGame: true
    };
    
    // Core systems
    this.stageManager = null;
    this.eventSystem = null;
    this.controls = null;
    this.hud = null;
    this.camera = null;
    this.cameraController = null;
    
    // Clear any saved stage data to ensure we always start at primordial
    try {
      localStorage.removeItem('floodGameProgress');
    } catch (e) {
      console.warn('Could not clear localStorage', e);
    }
  }
  
  /**
   * Initialize the game and start it
   * @param {boolean} isRestart - Whether this is a restart after failure
   */
  async init(isRestart = false) {
    // Load saved data if available
    if (!isRestart) {
      this.loadSavedData();
    }
    
    // Set up systems
    this.setupSystems();
    
    // Start entity creation if it's a new game
    if (this.state.newGame || isRestart) {
      this.showEvolutionTypeSelection();
    } else {
      // Resume existing game
      await this.startGame();
    }
  }
  
  /**
   * Set up core game systems
   */
  setupSystems() {
    // Create camera
    this.camera = createCamera();
    this.camera.position.set(0, 3, 5);
    
    // Initialize other systems
    this.stageManager = new StageManager(this);
    this.eventSystem = new EventSystem(this);
    this.controls = new Controls(this);
    this.hud = new Hud(this);
  }
  
  /**
   * Show evolution type selection screen
   */
  showEvolutionTypeSelection() {
    // Create selection UI
    const selectionContainer = document.createElement('div');
    selectionContainer.id = 'evolution-selection';
    selectionContainer.style.position = 'absolute';
    selectionContainer.style.top = '0';
    selectionContainer.style.left = '0';
    selectionContainer.style.width = '100%';
    selectionContainer.style.height = '100%';
    selectionContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    selectionContainer.style.display = 'flex';
    selectionContainer.style.flexDirection = 'column';
    selectionContainer.style.justifyContent = 'center';
    selectionContainer.style.alignItems = 'center';
    selectionContainer.style.color = 'white';
    selectionContainer.style.fontFamily = 'Arial, sans-serif';
    selectionContainer.style.zIndex = '1000';
    document.body.appendChild(selectionContainer);
    
    // Title
    const title = document.createElement('h1');
    title.textContent = 'Choose Your Evolution Path';
    title.style.marginBottom = '40px';
    title.style.color = '#88ccff';
    title.style.textAlign = 'center';
    selectionContainer.appendChild(title);
    
    // Options container
    const optionsContainer = document.createElement('div');
    optionsContainer.style.display = 'flex';
    optionsContainer.style.justifyContent = 'center';
    optionsContainer.style.flexWrap = 'wrap';
    optionsContainer.style.gap = '20px';
    optionsContainer.style.width = '100%';
    optionsContainer.style.maxWidth = '900px';
    selectionContainer.appendChild(optionsContainer);
    
    // Evolution options
    const types = [
      {
        id: 'strong',
        name: 'Strong and Fast',
        description: 'High energy consumption but excels at quick movement and overcoming obstacles.',
        color: '#ff5500'
      },
      {
        id: 'meek',
        name: 'Meek but Cooperative',
        description: 'Weaker individually but gains bonuses from helping others.',
        color: '#22cc88'
      },
      {
        id: 'allRounder',
        name: 'All-Rounder',
        description: 'Balanced stats, adaptable but lacking specialization.',
        color: '#3388ff'
      }
    ];
    
    // Create option cards
    types.forEach(type => {
      const card = document.createElement('div');
      card.style.width = '250px';
      card.style.height = '300px';
      card.style.backgroundColor = '#112233';
      card.style.border = `2px solid ${type.color}`;
      card.style.borderRadius = '10px';
      card.style.padding = '20px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.alignItems = 'center';
      card.style.cursor = 'pointer';
      card.style.transition = 'transform 0.2s, box-shadow 0.2s';
      
      // Hover effect
      card.addEventListener('mouseover', () => {
        card.style.transform = 'scale(1.05)';
        card.style.boxShadow = `0 0 20px ${type.color}`;
      });
      
      card.addEventListener('mouseout', () => {
        card.style.transform = 'scale(1)';
        card.style.boxShadow = 'none';
      });
      
      // Selection
      card.addEventListener('click', () => {
        this.state.evolutionType = type.id;
        document.body.removeChild(selectionContainer);
        this.startGame();
      });
      
      // Type name
      const name = document.createElement('h2');
      name.textContent = type.name;
      name.style.color = type.color;
      name.style.margin = '0 0 10px 0';
      card.appendChild(name);
      
      // Type visual representation (circle)
      const visual = document.createElement('div');
      visual.style.width = '100px';
      visual.style.height = '100px';
      visual.style.borderRadius = '50%';
      visual.style.backgroundColor = type.color;
      visual.style.margin = '20px 0';
      visual.style.boxShadow = `0 0 10px ${type.color}`;
      card.appendChild(visual);
      
      // Type description
      const description = document.createElement('p');
      description.textContent = type.description;
      description.style.textAlign = 'center';
      description.style.fontSize = '14px';
      description.style.lineHeight = '1.4';
      card.appendChild(description);
      
      optionsContainer.appendChild(card);
    });
  }
  
  /**
   * Start the game after evolution type selection
   */
  async startGame() {
    // Create player with selected evolution type
    this.state.player = new Player(
      this.state.evolutionType, 
      this,
      this.state.restarts > 0 ? { 
        restarts: this.state.restarts,
        previousStage: this.state.stage
      } : null
    );
    
    // Set up camera controller to follow player
    this.cameraController = new CameraController(this.camera, this.state.player.mesh);
    
    // Load starting stage
    await this.stageManager.loadStage(this.state.stage);
    
    // Start animation loop
    this.state.newGame = false;
    this.animate();
  }
  
  /**
   * Main animation loop
   */
  animate() {
    if (this.disposed) return;
    
    requestAnimationFrame(() => this.animate());
    
    if (this.paused) return;
    
    // Calculate delta time in milliseconds
    const rawDeltaTime = this.clock.getDelta() * 1000; // ms
    
    // Global time scale to easily adjust game speed (lower = slower)
    const timeScale = 0.5; // Half speed
    
    // Cap deltaTime to prevent the game from running too fast on high refresh rate screens
    // or if there's a lag spike - now capped at ~20fps equivalent for slower gameplay
    const maxDeltaTime = 50; // Cap at ~20fps equivalent (50ms)
    
    // Apply both the cap and the time scale
    const deltaTime = Math.min(rawDeltaTime, maxDeltaTime) * timeScale;
    
    // Update game components
    this.update(deltaTime);
    
    // Render scene
    if (this.stageManager.currentScene) {
      this.renderer.render(this.stageManager.currentScene.scene, this.camera);
    }
  }
  
  /**
   * Update game state and components
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update systems
    this.controls.update();
    this.stageManager.update(deltaTime);
    this.eventSystem.update(deltaTime);
    
    // Update player
    if (this.state.player) {
      this.state.player.update(deltaTime);
    }
    
    // Update camera
    if (this.cameraController) {
      this.cameraController.update();
    }
    
    // Update HUD
    this.hud.update();
  }
  
  /**
   * Pause the game (for events or menus)
   */
  pause() {
    this.paused = true;
  }
  
  /**
   * Resume game after pause
   */
  resume() {
    this.paused = false;
  }
  
  /**
   * Show game completion screen with achievements
   * @param {Array} achievements - List of earned achievements
   */
  showGameCompletionScreen(achievements) {
    this.pause();
    
    // Save achievements
    this.state.achievements = achievements;
    
    // Create completion UI
    const completionContainer = document.createElement('div');
    completionContainer.id = 'completion-screen';
    completionContainer.style.position = 'absolute';
    completionContainer.style.top = '0';
    completionContainer.style.left = '0';
    completionContainer.style.width = '100%';
    completionContainer.style.height = '100%';
    completionContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    completionContainer.style.display = 'flex';
    completionContainer.style.flexDirection = 'column';
    completionContainer.style.justifyContent = 'center';
    completionContainer.style.alignItems = 'center';
    completionContainer.style.color = 'white';
    completionContainer.style.fontFamily = 'Arial, sans-serif';
    completionContainer.style.zIndex = '1000';
    document.body.appendChild(completionContainer);
    
    // Title
    const title = document.createElement('h1');
    title.textContent = 'Evolution Complete';
    title.style.marginBottom = '20px';
    title.style.color = '#88ccff';
    completionContainer.appendChild(title);
    
    // Evolution Journey
    const journey = document.createElement('p');
    journey.textContent = `Your ${this.state.evolutionType} entity survived all stages of evolution!`;
    journey.style.fontSize = '18px';
    journey.style.marginBottom = '40px';
    completionContainer.appendChild(journey);
    
    // Philosophical tendencies
    const philosophy = this.eventSystem.getChoicesSummary();
    const philosophyText = document.createElement('p');
    philosophyText.textContent = `Your philosophical tendency: ${philosophy.dominantTrait.toUpperCase()}`;
    philosophyText.style.fontSize = '20px';
    philosophyText.style.marginBottom = '20px';
    philosophyText.style.color = '#aaccff';
    completionContainer.appendChild(philosophyText);
    
    // Stats
    const stats = document.createElement('div');
    stats.style.marginBottom = '30px';
    stats.style.textAlign = 'center';
    stats.innerHTML = `
      <p>Resources Gathered: ${this.state.resources}</p>
      <p>Restarts: ${this.state.restarts}</p>
      <p>Events Experienced: ${philosophy.eventCount}</p>
    `;
    completionContainer.appendChild(stats);
    
    // Achievements
    if (achievements.length > 0) {
      const achievementsTitle = document.createElement('h2');
      achievementsTitle.textContent = 'Achievements Earned';
      achievementsTitle.style.marginBottom = '10px';
      achievementsTitle.style.color = '#ffcc44';
      completionContainer.appendChild(achievementsTitle);
      
      const achievementsList = document.createElement('ul');
      achievementsList.style.listStyleType = 'none';
      achievementsList.style.padding = '0';
      achievementsList.style.textAlign = 'center';
      
      achievements.forEach(achievement => {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${achievement.name}</strong>: ${achievement.description}`;
        item.style.margin = '10px 0';
        achievementsList.appendChild(item);
      });
      
      completionContainer.appendChild(achievementsList);
    }
    
    // Play again button
    const playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = 'Begin New Evolution';
    playAgainBtn.style.marginTop = '40px';
    playAgainBtn.style.padding = '15px 30px';
    playAgainBtn.style.fontSize = '18px';
    playAgainBtn.style.backgroundColor = '#3366cc';
    playAgainBtn.style.color = 'white';
    playAgainBtn.style.border = 'none';
    playAgainBtn.style.borderRadius = '5px';
    playAgainBtn.style.cursor = 'pointer';
    
    playAgainBtn.addEventListener('click', () => {
      document.body.removeChild(completionContainer);
      this.restartGame(true);
    });
    
    completionContainer.appendChild(playAgainBtn);
  }
  
  /**
   * Restart the game
   * @param {boolean} newEvolution - Whether to start completely fresh
   */
  restartGame(newEvolution = false) {
    // Clean up old objects
    if (this.stageManager.currentScene) {
      // Clean up scene
    }
    
    if (newEvolution) {
      // Complete reset
      this.state = {
        stage: 'primordial',
        resources: 0,
        resourceGoal: 0,
        timer: 0,
        player: null,
        evolutionType: null,
        restarts: 0,
        highestResources: this.state.highestResources, // Keep this record
        achievements: [],
        newGame: true
      };
    } else {
      // Keep restart count and other progress
      this.state.resources = 0;
      this.state.stage = 'primordial';
      this.state.timer = 0;
      this.state.player = null;
      this.state.newGame = false;
    }
    
    // Re-initialize
    this.init(true);
  }
  
  /**
   * Load saved game data from localStorage
   */
  loadSavedData() {
    try {
      const savedProgress = localStorage.getItem('floodGameProgress');
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        
        // Apply saved values but always ensure stage is primordial
        this.state.stage = 'primordial'; // Force primordial stage
        this.state.evolutionType = progress.evolutionType;
        this.state.restarts = progress.restarts || 0;
        this.state.highestResources = progress.highestResources || 0;
        this.state.newGame = !progress.evolutionType;
      }
    } catch (e) {
      console.warn('Could not load saved data:', e);
    }
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    if (this.camera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
    
    if (this.renderer) {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    this.disposed = true;
    
    // Clean up event listeners
    window.removeEventListener('resize', this.handleResize);
    
    // Clean up scenes and objects
    if (this.stageManager && this.stageManager.currentScene) {
      // Scene cleanup
    }
  }
} 