/**
 * Evolution types and trait definitions
 */
export const evolutionTypes = {
  strong: {
    name: 'Strong and Fast',
    description: 'High energy consumption but excels at quick movement and overcoming obstacles.',
    baseTraits: {
      speed: 2.0,
      energyCost: 1.5,
      resourceGain: 1.0,
      size: 1.2
    },
    color: 0xff5500 // Orange-red
  },
  
  meek: {
    name: 'Meek but Cooperative',
    description: 'Weaker individually but gains bonuses from helping others.',
    baseTraits: {
      speed: 1.0,
      energyCost: 0.8,
      resourceGain: 1.2,
      coopBonus: 2.0,
      size: 0.8
    },
    color: 0x22cc88 // Teal
  },
  
  allRounder: {
    name: 'All-Rounder',
    description: 'Balanced stats, adaptable but lacking specialization.',
    baseTraits: {
      speed: 1.5,
      energyCost: 1.0,
      resourceGain: 1.0,
      adaptability: 1.5,
      size: 1.0
    },
    color: 0x3388ff // Blue
  }
};

/**
 * Trait modifications for each stage
 */
export const stageModifiers = {
  primordial: {
    // Base stage - no modifiers
  },
  
  prehistoric: {
    strong: {
      speed: 1.2, // Faster in prehistoric
      size: 1.3  // Larger
    },
    meek: {
      resourceGain: 1.5, // Better at finding materials
      coopBonus: 2.5    // Better cooperation in more complex environment
    },
    allRounder: {
      adaptability: 2.0, // Adaptability increases in new environment
      energyCost: 0.9   // More efficient
    }
  },
  
  ordered: {
    strong: {
      resourceGain: 1.3, // Better at gathering supplies
      villageInfluence: 1.2 // Stronger influence on villages
    },
    meek: {
      villageInfluence: 2.0, // Much stronger influence on villages
      energyCost: 0.7      // Most efficient
    },
    allRounder: {
      speed: 1.8,         // Speed increases significantly
      villageInfluence: 1.5 // Good village influence
    },
    
    // All types gain consciousness in ordered stage
    consciousness: true
  }
};

/**
 * Achievement/title definitions based on traits and playstyle
 */
export const achievements = {
  // Speed-related
  speedDemon: {
    name: 'Speed Demon',
    description: 'Your entity moves with extraordinary speed',
    requirement: (traits) => traits.speed >= 2.5
  },
  
  // Resource collection
  resourceHoarder: {
    name: 'Resource Hoarder',
    description: 'Collect over 200 resources in a single stage',
    requirement: (resources) => resources >= 200
  },
  
  // Survival-based
  floodSurvivor: {
    name: 'Flood Survivor',
    description: 'Survive all three stages without restarting',
    requirement: (state) => state.restarts === 0
  },
  
  // Evolution-based
  perfectEvolution: {
    name: 'Perfect Evolution',
    description: 'Reach the ordered world with all traits above average',
    requirement: (traits) => {
      const values = Object.values(traits);
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      return values.every(val => val >= average);
    }
  }
};

/**
 * Evolves entity traits based on type and stage
 * @param {string} type - Evolution type (strong, meek, allRounder)
 * @param {string} stage - Current game stage
 * @param {Object} currentTraits - Current entity traits (from previous stage)
 * @returns {Object} - Updated traits object
 */
export function evolveEntity(type, stage, currentTraits = null) {
  // Start with base traits if not evolving from existing
  const baseTraits = currentTraits || { ...evolutionTypes[type].baseTraits };
  
  // Apply stage-specific modifiers
  if (stage !== 'primordial') {
    const mods = stageModifiers[stage];
    
    // Apply general modifiers for the stage
    Object.entries(mods).forEach(([key, value]) => {
      if (key !== 'strong' && key !== 'meek' && key !== 'allRounder') {
        baseTraits[key] = value;
      }
    });
    
    // Apply type-specific modifiers
    if (mods[type]) {
      Object.entries(mods[type]).forEach(([key, value]) => {
        if (baseTraits[key]) {
          baseTraits[key] *= value; // Multiply existing traits
        } else {
          baseTraits[key] = value; // Add new traits
        }
      });
    }
  }
  
  return baseTraits;
}

/**
 * Get visual parameters for an entity based on type and traits
 * @param {string} type - Evolution type
 * @param {Object} traits - Entity traits
 * @returns {Object} - Visual parameters (color, size, etc.)
 */
export function getEntityVisuals(type, traits) {
  const baseColor = evolutionTypes[type].color;
  const size = traits.size || 1.0;
  
  // Calculate color variations based on traits
  let colorVariation = {
    r: 0,
    g: 0,
    b: 0
  };
  
  // Speed affects red component
  if (traits.speed > 1.5) {
    colorVariation.r = Math.min(50, (traits.speed - 1.5) * 50);
  }
  
  // Energy efficiency affects green component
  if (traits.energyCost < 1.0) {
    colorVariation.g = Math.min(50, (1.0 - traits.energyCost) * 100);
  }
  
  // Convert base color to RGB components
  const r = ((baseColor >> 16) & 255) + colorVariation.r;
  const g = ((baseColor >> 8) & 255) + colorVariation.g;
  const b = (baseColor & 255) + colorVariation.b;
  
  // Clamp values to valid range
  const finalColor = (
    (Math.min(255, Math.max(0, r)) << 16) +
    (Math.min(255, Math.max(0, g)) << 8) +
    Math.min(255, Math.max(0, b))
  );
  
  return {
    color: finalColor,
    size: size,
    emissive: traits.consciousness ? 0x334455 : 0x000000, // Glow if conscious
    roughness: traits.stage === 'primordial' ? 0.9 : 0.5 // More defined in later stages
  };
}

/**
 * Retrieves roguelike bonuses after flood restart
 * @param {string} type - Evolution type
 * @param {number} restarts - Number of game restarts
 * @param {string} previousStage - Stage player reached before restart
 * @returns {Object} - Bonus traits and amounts
 */
export function getRestartBonuses(type, restarts, previousStage) {
  const bonuses = {};
  
  // Base restart bonus (small)
  bonuses.resourceGain = 1.0 + (restarts * 0.05); // +5% resource gain per restart
  
  // Type-specific bonuses
  switch(type) {
    case 'strong':
      bonuses.speed = 1.0 + (restarts * 0.02); // Slight speed boost
      break;
      
    case 'meek':
      bonuses.coopBonus = 1.0 + (restarts * 0.1); // Significant coop boost
      break;
      
    case 'allRounder':
      bonuses.adaptability = 1.0 + (restarts * 0.05); // Adaptability boost
      break;
  }
  
  // Extra bonuses based on previous progress
  if (previousStage === 'prehistoric') {
    bonuses.evolutionMemory = true; // Slight hint of next stage
    bonuses.startingResources = 5;
  }
  
  if (previousStage === 'ordered') {
    bonuses.evolutionMemory = true;
    bonuses.startingResources = 10;
    bonuses.floodWarning = true; // More time to prepare for flood
  }
  
  return bonuses;
} 