/**
 * Handles stage transitions, flood timers, and scene management
 */
import * as Evolution from './Evolution.js';

export default class StageManager {
  /**
   * Initialize stage manager
   * @param {Object} game - Reference to main game instance
   */
  constructor(game) {
    this.game = game;
    this.currentScene = null;
    this.currentStage = null;
    this.camera = null;
    this.floodTimerInterval = null;
    
    // Stage configuration
    this.stageConfig = {
      primordial: {
        timerDuration: 120, // 2 minutes
        resourceGoal: 15,
        floodType: 'water',
        fogColor: 0x002233,
        fogDensity: 0.08,
        ambientLight: 0x112233,
        directionalLight: 0x334455
      },
      
      prehistoric: {
        timerDuration: 180, // 3 minutes
        resourceGoal: 25,
        floodType: 'meteor',
        fogColor: 0x223344,
        fogDensity: 0.05,
        ambientLight: 0x445566,
        directionalLight: 0x8899aa
      },
      
      ordered: {
        timerDuration: 240, // 4 minutes
        resourceGoal: 40,
        floodType: 'water',
        fogColor: 0x445566,
        fogDensity: 0.02,
        ambientLight: 0x667788,
        directionalLight: 0xaabbcc
      }
    };
  }
  
  /**
   * Loads a stage and its corresponding scene
   * @param {string} stageName - Stage to load (primordial, prehistoric, ordered)
   */
  async loadStage(stageName) {
    // Clear any existing timer
    if (this.floodTimerInterval) {
      clearInterval(this.floodTimerInterval);
    }
    
    this.currentStage = stageName;
    const config = this.stageConfig[stageName];
    
    // Import the scene class dynamically
    try {
      // Convert stage name to proper case for import
      const sceneName = stageName.charAt(0).toUpperCase() + stageName.slice(1);
      const SceneModule = await import(`../scenes/${sceneName}.js`);
      const SceneClass = SceneModule.default;
      
      // Initialize the new scene
      this.currentScene = new SceneClass(this.game, config);
      
      // Set timer
      this.game.state.timer = config.timerDuration;
      this.game.state.resourceGoal = config.resourceGoal;
      
      // Configure other game components for this stage
      this.game.controls.configureForStage(stageName);
      this.game.hud.configureForStage(stageName);
      this.game.state.player.configureForStage(stageName);
      
      // Start flood timer
      this.startFloodTimer();
      
      // Show transition effect
      this.showStageTransition(stageName);
      
      // Reset event system for new stage
      if (this.game.eventSystem) {
        // Wait until player finds will-to-live in primordial stage
        if (stageName !== 'primordial' || 
            (this.game.state.player && this.game.state.player.willToLive)) {
          // Create interactive event triggers with a slight delay
          setTimeout(() => {
            this.game.eventSystem.createInteractiveTriggers(stageName);
          }, 5000); // 5 second delay before creating interactive objects
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to load stage ${stageName}:`, error);
      return false;
    }
  }
  
  /**
   * Starts the countdown timer for the flood
   */
  startFloodTimer() {
    this.floodTimerInterval = setInterval(() => {
      this.game.state.timer--;
      
      // Check for flood warning
      if (this.game.state.timer <= 30) {
        this.game.hud.showFloodWarning(true);
        this.currentScene.showFloodWarning();
      }
      
      // Check if timer has run out
      if (this.game.state.timer <= 0) {
        clearInterval(this.floodTimerInterval);
        this.handleFlood();
      }
    }, 1000);
  }
  
  /**
   * Handles what happens when the flood timer runs out
   */
  handleFlood() {
    // Check if player has collected enough resources
    if (this.game.state.resources >= this.game.state.resourceGoal) {
      this.handleStageSuccess();
    } else {
      this.handleStageFailure();
    }
  }
  
  /**
   * Handles successful stage completion
   */
  handleStageSuccess() {
    // Show success animation
    this.currentScene.showFloodSurvival();
    
    // Determine next stage
    let nextStage = 'prehistoric';
    if (this.currentStage === 'prehistoric') {
      nextStage = 'ordered';
    } else if (this.currentStage === 'ordered') {
      this.handleGameCompletion();
      return;
    }
    
    // Evolve player's entity
    this.game.state.player.evolve(nextStage);
    
    // Save progress
    this.saveProgress();
    
    // Load next stage after delay
    setTimeout(() => {
      this.loadStage(nextStage);
    }, 5000);
  }
  
  /**
   * Handles stage failure (restart with rogue-like bonuses)
   */
  handleStageFailure() {
    // Show failure animation
    this.currentScene.showFloodFailure();
    
    // Increase restart counter
    this.game.state.restarts++;
    
    // Save progress for rogue-like bonuses
    this.saveProgress();
    
    // Restart game after delay
    setTimeout(() => {
      this.game.init(true); // Pass true to indicate restart with bonuses
    }, 5000);
  }
  
  /**
   * Handles completing the entire game
   */
  handleGameCompletion() {
    // Show game completion screen
    const achievements = this.calculateAchievements();
    this.game.showGameCompletionScreen(achievements);
    
    // Save completion data
    this.saveCompletion(achievements);
  }
  
  /**
   * Calculate achievements based on gameplay
   * @returns {Array} - List of earned achievements
   */
  calculateAchievements() {
    const achievements = [];
    const player = this.game.state.player;
    
    // Use imported achievements definition
    const achievementDefs = Evolution.achievements;
    
    // Check each achievement
    Object.entries(achievementDefs).forEach(([key, achievement]) => {
      if (key === 'speedDemon' && achievement.requirement(player.traits)) {
        achievements.push(achievement);
      } else if (key === 'resourceHoarder' && achievement.requirement(this.game.state.resources)) {
        achievements.push(achievement);
      } else if (key === 'floodSurvivor' && achievement.requirement(this.game.state)) {
        achievements.push(achievement);
      } else if (key === 'perfectEvolution' && achievement.requirement(player.traits)) {
        achievements.push(achievement);
      }
    });
    
    return achievements;
  }
  
  /**
   * Shows visual transition effect between stages
   * @param {string} stageName - New stage name
   */
  showStageTransition(stageName) {
    // Create transition overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = '#000';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity.1.5s';
    overlay.style.zIndex = '1000';
    document.body.appendChild(overlay);
    
    // Set stage-specific title text
    let stageTitle = 'Primordial Soup';
    if (stageName === 'prehistoric') stageTitle = 'Coastal Emergence';
    if (stageName === 'ordered') stageTitle = 'Ordered World';
    
    const title = document.createElement('div');
    title.textContent = stageTitle;
    title.style.position = 'absolute';
    title.style.top = '50%';
    title.style.left = '50%';
    title.style.transform = 'translate(-50%, -50%)';
    title.style.color = 'white';
    title.style.fontSize = '32px';
    title.style.fontFamily = 'Arial, sans-serif';
    title.style.opacity = '0';
    title.style.transition = 'opacity 1.5s';
    overlay.appendChild(title);
    
    // Fade in
    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
      title.style.opacity = '1';
    }, 1000);
    
    // Fade out
    setTimeout(() => {
      title.style.opacity = '0';
      overlay.style.opacity = '0';
    }, 4000);
    
    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 5500);
  }
  
  /**
   * Save game progress for restarts/persistence
   */
  saveProgress() {
    const progressData = {
      stage: this.currentStage,
      evolutionType: this.game.state.player.evolutionType,
      restarts: this.game.state.restarts,
      highestResources: this.game.state.resources > (this.game.state.highestResources || 0) 
        ? this.game.state.resources 
        : (this.game.state.highestResources || 0)
    };
    
    try {
      localStorage.setItem('floodGameProgress', JSON.stringify(progressData));
    } catch (e) {
      console.warn('Could not save progress to localStorage:', e);
    }
  }
  
  /**
   * Save game completion data
   * @param {Array} achievements - Earned achievements
   */
  saveCompletion(achievements) {
    const completionData = {
      completedAt: new Date().toISOString(),
      evolutionType: this.game.state.player.evolutionType,
      restarts: this.game.state.restarts,
      finalResources: this.game.state.resources,
      achievements: achievements.map(a => a.name)
    };
    
    try {
      // Save current completion
      localStorage.setItem('floodGameCompletion', JSON.stringify(completionData));
      
      // Save to completion history
      const history = JSON.parse(localStorage.getItem('floodGameCompletionHistory') || '[]');
      history.push(completionData);
      localStorage.setItem('floodGameCompletionHistory', JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save completion data to localStorage:', e);
    }
  }
  
  /**
   * Load saved progress if available
   * @returns {Object|null} - Saved progress or null if none exists
   */
  loadProgress() {
    try {
      const progressData = localStorage.getItem('floodGameProgress');
      return progressData ? JSON.parse(progressData) : null;
    } catch (e) {
      console.warn('Could not load progress from localStorage:', e);
      return null;
    }
  }
  
  /**
   * Updates the current scene
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(deltaTime);
    }
  }
} 