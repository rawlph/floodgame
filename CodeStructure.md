using ES6, ThreeJS, and NippleJS, and aiming for clean, single-source-of-truth code that runs smoothly on mobile web, we’ll structure it to be modular, maintainable, and performant. Here’s a high-level abstract of how the final project might look, balancing our evolutionary game concept with the contest’s technical constraints.
Guiding Principles
Modularity: Break the game into reusable, independent components (e.g., scenes, entities, controls).

Single Source of Truth: Centralize game state (e.g., player stats, resources, stage) in one place to avoid duplication and bugs.

Performance: Leverage ES6 modules, ThreeJS optimizations, and minimal dependencies for fast mobile web execution.

Simplicity: Keep the structure lean to meet the 7-day deadline while leaving room for polish.

Code Structure Abstract
Below is an envisioned directory and module breakdown, followed by a brief explanation of each part.
Directory Structure

src/
├── assets/                  # Static assets (textures, sounds if any)
│   ├── textures/           # Compressed textures for ThreeJS
│   └── data/               # JSON or config files (e.g., stage definitions)
├── core/                    # Core game logic and utilities
│   ├── Game.js             # Main game loop and state management
│   ├── StageManager.js     # Handles stage transitions and flood timers
│   └── Evolution.js        # Entity creation and evolution mechanics
├── entities/                # Game objects (player, resources, etc.)
│   ├── Player.js           # Player entity with traits and controls
│   ├── Resource.js         # Collectible items (e.g., nutrients, shells)
│   └── Npc.js              # Villages or creatures for late game
├── scenes/                  # ThreeJS scene definitions per stage
│   ├── PrimordialSoup.js   # Early game scene
│   ├── Prehistoric.js      # Mid game scene
│   └── OrderedWorld.js     # Late game scene
├── ui/                      # UI and controls
│   ├── Controls.js         # NippleJS touch controls
│   └── Hud.js              # Minimal HUD (timer, resources)
├── utils/                   # Helper functions
│   ├── Renderer.js         # ThreeJS renderer setup
│   ├── Camera.js           # Third-person camera logic
│   └── Procedural.js       # Procedural generation helpers
├── main.js                  # Entry point to initialize everything
└── index.html               # Simple HTML file to load the game

Key Modules and Their Roles
main.js
Purpose: Entry point that sets up ThreeJS, imports core modules, and starts the game.

Structure:
javascript

import Game from './core/Game.js';
import { setupRenderer } from './utils/Renderer.js';

const renderer = setupRenderer();
const game = new Game(renderer);
game.init();

Notes: Keeps initialization lightweight and delegates to Game.js.

core/Game.js
Purpose: Central hub for game state and the main animation loop.

Single Source of Truth: Stores player stats, current stage, resources, and timer.

Structure:
javascript

import StageManager from './StageManager.js';
import Player from '../entities/Player.js';
import Controls from '../ui/Controls.js';

export default class Game {
  constructor(renderer) {
    this.renderer = renderer;
    this.state = {
      stage: 'primordial',
      resources: 0,
      timer: 60, // seconds until flood
      player: null,
    };
    this.stageManager = new StageManager(this);
    this.controls = new Controls(this);
  }

  init() {
    this.state.player = new Player(this.state.evolutionType);
    this.stageManager.loadStage(this.state.stage);
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.stageManager.update();
    this.controls.update();
    this.renderer.render(this.stageManager.currentScene, this.stageManager.camera);
  }
}

Notes: Manages the game loop and coordinates updates, ensuring smooth performance.

core/StageManager.js
Purpose: Handles stage transitions, flood timers, and scene switching.

Structure:
javascript

import PrimordialSoup from '../scenes/PrimordialSoup.js';
import Prehistoric from '../scenes/Prehistoric.js';
import OrderedWorld from '../scenes/OrderedWorld.js';

export default class StageManager {
  constructor(game) {
    this.game = game;
    this.stages = {
      primordial: PrimordialSoup,
      prehistoric: Prehistoric,
      ordered: OrderedWorld,
    };
    this.currentScene = null;
  }

  loadStage(stageName) {
    this.currentScene = new this.stages[stageName](this.game);
    this.startFloodTimer();
  }

  startFloodTimer() {
    setInterval(() => {
      this.game.state.timer--;
      if (this.game.state.timer <= 0) this.handleFlood();
    }, 1000);
  }

  handleFlood() {
    if (this.game.state.resources >= this.currentScene.goal) {
      this.game.state.stage = this.nextStage();
      this.loadStage(this.game.state.stage);
    } else {
      this.game.init(); // Restart with rogue-like bonuses
    }
  }
}

Notes: Encapsulates stage logic and flood mechanics, keeping Game.js clean.

core/Evolution.js
Purpose: Defines entity creation and evolution rules.

Structure:
javascript

export const evolutionTypes = {
  strong: { speed: 2, energyCost: 1.5 },
  meek: { speed: 1, coopBonus: 2 },
  allRounder: { speed: 1.5, energyCost: 1 },
};

export function evolveEntity(currentType, stage) {
  const baseTraits = evolutionTypes[currentType];
  return { ...baseTraits, stageBonus: stage === 'ordered' ? { consciousness: true } : {} };
}

Notes: Simple, data-driven evolution system for clean trait management.

entities/Player.js
Purpose: Represents the player entity with traits and movement.

Structure:
javascript

import * as THREE from 'three';
import { evolveEntity } from '../core/Evolution.js';

export default class Player {
  constructor(evolutionType) {
    this.traits = evolveEntity(evolutionType, 'primordial');
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16), // Low-poly for performance
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
  }

  update(controls) {
    const { x, y } = controls.direction;
    this.mesh.position.x += x * this.traits.speed;
    this.mesh.position.z += y * this.traits.speed;
  }
}

Notes: Lightweight ThreeJS object tied to NippleJS controls.

scenes/PrimordialSoup.js (and other scenes)
Purpose: Defines a stage’s environment and goals.

Structure:
javascript

import * as THREE from 'three';
import Resource from '../entities/Resource.js';

export default class PrimordialSoup {
  constructor(game) {
    this.game = game;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.scene.add(this.game.state.player.mesh);
    this.addResources();
    this.goal = 10; // Resources needed to survive flood
  }

  addResources() {
    for (let i = 0; i < 5; i++) {
      const resource = new Resource();
      this.scene.add(resource.mesh);
    }
  }

  update() {
    // Collision detection, resource collection, etc.
  }
}

Notes: Each scene is self-contained but shares the same game state.

ui/Controls.js
Purpose: Integrates NippleJS for mobile touch controls.

Structure:
javascript

import nipplejs from 'nipplejs';

export default class Controls {
  constructor(game) {
    this.game = game;
    this.manager = nipplejs.create({
      zone: document.body,
      mode: 'static',
      position: { left: '50%', bottom: '20%' },
    });
    this.direction = { x: 0, y: 0 };
    this.manager.on('move', (evt, data) => {
      this.direction.x = data.vector.x;
      this.direction.y = data.vector.y;
    });
    this.manager.on('end', () => {
      this.direction = { x: 0, y: 0 };
    });
  }

  update() {
    this.game.state.player.update(this);
  }
}

Notes: Simple, effective touch input for mobile web.

utils/Renderer.js
Purpose: Sets up the ThreeJS renderer with mobile optimizations.

Structure:
javascript

import * as THREE from 'three';

export function setupRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimize for mobile
  document.body.appendChild(renderer.domElement);
  return renderer;
}

Notes: Ensures smooth rendering across devices.

How It Fits Together
main.js initializes the game and renderer.

Game.js owns the state and runs the loop, delegating to StageManager.js for scenes and Controls.js for input.

Evolution.js and Player.js handle entity logic, while scenes/ defines each stage’s world.

ES6 modules keep everything importable and organized, and Vite bundles it for fast web deployment.

Why This Works
Clean: Each module has a single responsibility, reducing bugs and overlap.

Single Truth: Game.js centralizes state, making it easy to track and debug.

Smooth: ThreeJS is optimized with low-poly assets, and NippleJS ensures mobile-friendly controls.

Contest-Ready: No heavy downloads, instant play, and works on iPhone/Android web browsers.

Potential Enhancements
Add a Config.js in utils/ for tweaking timers, goals, or traits without touching core code.

Use a lightweight event system (e.g., a simple pub/sub) for philosophical choices if they grow complex.

Inline procedural generation in Procedural.js to keep scenes dynamic and asset-light.

