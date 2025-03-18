# FloodGame Technical Documentation

This document provides a comprehensive overview of the FloodGame codebase, including its architecture, game concepts, optimization strategies, and implementation details. It's designed to help LLM agents understand the project structure and continue development with a consistent approach.

## 1. Game Concept Overview

FloodGame is a 3D, third-person philosophical evolution game that unfolds across three distinct stages:

1. **Primordial Soup**: Dark, murky beginnings with limited visibility
2. **Prehistoric/Coastal**: More structured world with shore elements and meteor threat
3. **Ordered World with Villages**: Advanced environment with social interactions

Each stage represents a step in evolutionary and philosophical progression, with a "flood" (literal or metaphorical) serving as a looming deadline. Players create an entity, evolve it through choices and resource accumulation, and navigate challenges that blend arcade-style gameplay with philosophical depth.

### Key Game Mechanics

- **Evolution System**: Players choose one of three evolutionary types (Strong and Fast, Meek but Cooperative, All-Rounder)
- **Flood Mechanic**: Each stage ends with a timed catastrophic event (water, meteor, water again)
- **Resource Collection**: Gathering resources to evolve and progress
- **Philosophical Choices**: Decisions that shape gameplay and outcomes
- **Rogue-like Elements**: Retaining traits when restarting after failure

## 2. Code Architecture

The project follows a modular architecture with ES6 modules, emphasizing clean separation of concerns and a single source of truth for game state.

### Directory Structure

```
src/
├── assets/                  # Static assets (textures, sounds)
│   ├── textures/           # Compressed textures for ThreeJS
│   └── data/               # JSON or config files
├── core/                    # Core game logic
│   ├── Game.js             # Main game loop and state management
│   ├── StageManager.js     # Stage transitions and flood timers
│   └── Evolution.js        # Entity evolution mechanics
├── entities/                # Game objects
│   ├── Player.js           # Player entity with traits
│   ├── Resource.js         # Collectible resources
│   └── Npc.js              # Villages or creatures
├── scenes/                  # Three.js scene definitions
│   ├── Primordial.js       # Early game scene
│   ├── Prehistoric.js      # Mid game scene
│   └── Ordered.js          # Late game scene
├── ui/                      # UI and controls
│   ├── Controls.js         # NippleJS touch controls
│   └── Hud.js              # Game interface elements
├── utils/                   # Helper functions
│   ├── Renderer.js         # Three.js renderer setup
│   └── Camera.js           # Third-person camera logic
└── main.js                  # Entry point
```

### Core Systems

#### Game.js

The central hub for game state and the main animation loop. This is the single source of truth for:
- Current stage
- Player stats and evolution
- Resources
- Timer for flood events
- Game pause/resume logic

#### StageManager.js

Handles stage transitions, flood timers, and scene switching:
- Loads appropriate scene based on game stage
- Manages the flood countdown
- Handles success/failure conditions

#### Evolution System

Defines entity types and their characteristics:
- Strong and Fast: Higher speed but greater energy consumption
- Meek but Cooperative: Gains bonuses from helping others
- All-Rounder: Balanced stats without specialization

## 3. Technical Implementation

### Rendering and Graphics (Three.js)

The game uses Three.js for 3D rendering with specific optimizations for mobile performance:

```javascript
// Renderer optimizations
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  powerPreference: 'high-performance',
  precision: 'mediump'  // Medium precision for better mobile performance
});

// Limit pixel ratio for performance
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

#### Shadow Optimizations

Shadows are optimized for mobile performance:

```javascript
// Shadow settings for mobile optimization
directional.shadow.mapSize.width = 1024;
directional.shadow.mapSize.height = 1024;
```

#### Low-Poly Models

All 3D models use low-poly geometry to ensure smooth performance:

```javascript
// Low-poly geometry for performance
geometry = new THREE.SphereGeometry(0.3, 8, 8);
```

### Mobile Controls (NippleJS)

The game uses NippleJS for touch controls, making it mobile-friendly:

```javascript
// Virtual joystick setup
this.joystick = nipplejs.create({
  zone: document.getElementById('joystick-zone') || document.body,
  mode: 'static',
  position: { left: '50%', bottom: '20%' },
  color: 'white',
  size: 120
});

// Action button for interactions
const actionButton = document.createElement('div');
actionButton.id = 'action-button';
```

### Responsive Design

The game adapts to different screen sizes and orientations:

```javascript
// Handle window resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
```

### Cross-Platform Input

The game handles both touch (mobile) and keyboard (desktop) input:

```javascript
// Keyboard controls for desktop
function setupKeyboardControls(game) {
  document.addEventListener('keydown', (e) => {
    // WASD or Arrow keys for movement
    // Space/Enter for action
  });
}

// Touch controls for mobile via NippleJS
```

## 4. Mobile Performance Optimization

### Critical Performance Considerations

1. **Renderer Settings**: Using `mediump` precision and optimized pixel ratio
2. **Asset Optimization**: Low-poly models and minimal textures
3. **Shadow Optimization**: Limited shadow map size (1024x1024)
4. **Efficient Animation Loop**: Pausing when tab inactive
5. **Touch Input Optimization**: Preventing default behaviors that cause lag

### Mobile-Specific CSS

```css
html, body {
  touch-action: none;  /* Prevent browser gestures */
  user-select: none;   /* Prevent text selection */
  -webkit-user-select: none;
}

/* Optimized touch targets */
.touch-button {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}
```

### Device Testing

The game should be tested on:
- Mid to high-end iPhones (Safari)
- Mid to high-end Android devices (Chrome)
- Older devices should maintain at least 30fps

## 5. Game Flow and State Management

### Game Initialization

1. Load renderer and assets
2. Show evolution type selection screen
3. Initialize game with chosen evolution type
4. Start in primordial stage

### Stage Progression

1. **Primordial Soup**:
   - Find "will to live" object
   - Collect resources before flood timer expires
   - Evolve to proceed to prehistoric stage

2. **Prehistoric/Coastal**:
   - Navigate terrain with shore elements
   - Prepare for meteor impact
   - Evolve to proceed to ordered world

3. **Ordered World**:
   - Interact with villages
   - Prepare flood defenses
   - Make philosophical choices
   - Complete final evolution

### State Handling

Game state is centralized in `Game.js`:

```javascript
this.state = {
  stage: 'primordial',
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
```

## 6. Coding Style and Conventions

### Modularity

Each component has a single responsibility, following a modular design pattern:
- `Game.js` manages state
- `Controls.js` handles input
- `Player.js` manages entity behavior
- `Scene` classes manage environments

### Documentation

All methods and classes include JSDoc comments:

```javascript
/**
 * Updates camera position based on target movement
 */
update() {
  // Implementation
}
```

### Performance Patterns

- Using object pooling for frequently created objects
- Limiting shadow-casting lights
- Careful use of animations and particles
- Throttling update frequency for non-critical elements

## 7. Development Guidelines

When extending or modifying the game:

1. **Mobile First**: Always test changes on mobile devices
2. **Performance**: Monitor framerate impact of new features
3. **Consistency**: Follow existing patterns and naming conventions
4. **Single Source of Truth**: Update state in Game.js, not in scattered locations
5. **Progressive Enhancement**: Add features that scale with device capability
6. **Semantic Organization**: Keep related functionality in appropriate modules

## 8. Asset Management

The game uses minimal assets to ensure fast loading:
- Procedurally generated terrains
- Simple geometries for entities
- Limited use of textures
- Dynamic lighting for atmosphere

## 9. Philosophy Implementation

The game's philosophical elements are implemented through:
- Event choices that affect gameplay
- Different outcomes based on player behavior
- Visual and narrative feedback
- Stage-specific philosophical challenges

## 10. Testing Recommendations

For thorough testing:
1. Check performance on target mobile devices (iPhone, Android)
2. Verify touch controls work smoothly
3. Test stage transitions and evolution mechanics
4. Ensure philosophical choices have meaningful impact
5. Verify resource collection and flood mechanics function properly

This documentation should serve as a comprehensive guide for LLM agents to understand and extend the FloodGame project while maintaining its vision, performance goals, and code quality standards. 