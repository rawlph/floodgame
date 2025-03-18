import * as THREE from 'three';
import { createResourceForStage } from '../entities/Resource.js';

/**
 * Second stage: Prehistoric/Coastal scene
 */
export default class Prehistoric {
  /**
   * Initialize prehistoric coastal scene
   * @param {Object} game - Game instance
   * @param {Object} config - Stage configuration
   */
  constructor(game, config) {
    this.game = game;
    this.config = config;
    this.resources = [];
    this.creatures = [];
    this.meteorWarningActive = false;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x224466);
    
    // Moderate visibility with lighter fog
    this.scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
    
    this._setupLights();
    this._setupEnvironment();
    this._spawnResources();
    this._setupMeteorTracking();
    
    // Add player to scene
    if (this.game.state.player && this.game.state.player.mesh) {
      this.scene.add(this.game.state.player.mesh);
    }
  }
  
  /**
   * Set up scene lighting
   * @private
   */
  _setupLights() {
    // Ambient light (brighter for prehistoric)
    const ambient = new THREE.AmbientLight(this.config.ambientLight, 0.6);
    this.scene.add(ambient);
    
    // Main directional light (sun)
    const directional = new THREE.DirectionalLight(this.config.directionalLight, 0.8);
    directional.position.set(2, 10, 3);
    directional.castShadow = true;
    
    // Shadow settings for mobile optimization
    directional.shadow.mapSize.width = 1024;
    directional.shadow.mapSize.height = 1024;
    directional.shadow.camera.near = 1;
    directional.shadow.camera.far = 50;
    directional.shadow.camera.left = -15;
    directional.shadow.camera.right = 15;
    directional.shadow.camera.top = 15;
    directional.shadow.camera.bottom = -15;
    
    this.scene.add(directional);
    
    // Additional point lights for atmosphere
    const blueLight = new THREE.PointLight(0x0077bb, 0.3, 20);
    blueLight.position.set(-10, 2, -15);
    this.scene.add(blueLight);
    
    const orangeLight = new THREE.PointLight(0xff7700, 0.2, 30);
    orangeLight.position.set(15, 1, 15);
    this.scene.add(orangeLight);
  }
  
  /**
   * Set up ground and environment
   * @private
   */
  _setupEnvironment() {
    // Create terrain with shore and water
    this._createTerrain();
    this._createWater();
    this._createRocks();
    this._createPlants();
    
    // Add boundary to prevent player from leaving area
    this._createBoundary();
  }
  
  /**
   * Create terrain with shore
   * @private
   */
  _createTerrain() {
    // Ground plane
    const terrainGeometry = new THREE.PlaneGeometry(70, 70, 32, 32);
    
    // Create height variations for terrain
    const positionAttribute = terrainGeometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      
      // Create elevated land and shore effect
      const distance = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y);
      
      // Land height variations
      const noise = Math.sin(vertex.x * 0.2) * Math.sin(vertex.y * 0.2) * 0.5;
      
      if (distance < 25) {
        // Land area
        vertex.z = 0.5 + noise;
      } else if (distance < 30) {
        // Shore area, sloping down
        const t = (distance - 25) / 5;
        vertex.z = 0.5 + noise * (1 - t) - t * 0.5;
      } else {
        // Water area, slightly below sea level
        vertex.z = -0.5;
      }
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    // Update normals for correct lighting
    terrainGeometry.computeVertexNormals();
    
    // Prehistoric terrain texture
    const terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0x99aa77,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    
    this.terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }
  
  /**
   * Create water surrounding the shore
   * @private
   */
  _createWater() {
    const waterGeometry = new THREE.PlaneGeometry(100, 100, 16, 16);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x1188dd,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      metalness: 0.6,
      roughness: 0.2
    });
    
    this.water = new THREE.Mesh(waterGeometry, waterMaterial);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = -0.3; // Just below shore level
    this.scene.add(this.water);
  }
  
  /**
   * Create rock formations
   * @private
   */
  _createRocks() {
    // Create various sized rocks
    const rockPositions = [
      { x: -8, y: 0.5, z: -12, scale: 1.2 },
      { x: 12, y: 0.7, z: 8, scale: 0.9 },
      { x: -15, y: 0.4, z: 5, scale: 1.4 },
      { x: 5, y: 0.5, z: -15, scale: 1.0 },
      { x: 18, y: 0.3, z: -10, scale: 1.2 },
      { x: -20, y: 0.3, z: 15, scale: 1.5 }
    ];
    
    this.rocks = [];
    
    rockPositions.forEach(pos => {
      // Create a rock with random shapes
      const rockGeometry = new THREE.DodecahedronGeometry(pos.scale, 0);
      const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.9,
        metalness: 0.2
      });
      
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(pos.x, pos.y, pos.z);
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rock.scale.set(
        pos.scale * (0.8 + Math.random() * 0.4),
        pos.scale * (0.8 + Math.random() * 0.4),
        pos.scale * (0.8 + Math.random() * 0.4)
      );
      
      rock.castShadow = true;
      rock.receiveShadow = true;
      
      this.rocks.push(rock);
      this.scene.add(rock);
    });
  }
  
  /**
   * Create simple plants
   * @private
   */
  _createPlants() {
    // Create simple plants across the terrain
    const plantCount = 30;
    this.plants = [];
    
    for (let i = 0; i < plantCount; i++) {
      // Create random position on land (not in water)
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 22; // Keep within land area
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      // Create plant
      const height = 0.3 + Math.random() * 0.7;
      const plantGeometry = new THREE.CylinderGeometry(0.05, 0.1, height, 5);
      const plantMaterial = new THREE.MeshStandardMaterial({
        color: 0x226633,
        roughness: 0.8
      });
      
      const plant = new THREE.Mesh(plantGeometry, plantMaterial);
      plant.position.set(x, height / 2, z);
      
      // Add small variations to plant orientation
      plant.rotation.set(
        Math.random() * 0.2 - 0.1,
        Math.random() * Math.PI * 2,
        Math.random() * 0.2 - 0.1
      );
      
      plant.castShadow = true;
      
      this.plants.push(plant);
      this.scene.add(plant);
    }
  }
  
  /**
   * Create boundary to prevent player from leaving area
   * @private
   */
  _createBoundary() {
    // Invisible collision boundary
    const boundarySize = 30;
    const boundaryHeight = 10;
    
    // Create invisible walls
    const wallGeometry = new THREE.BoxGeometry(1, boundaryHeight, boundarySize * 2);
    const wallMaterial = new THREE.MeshBasicMaterial({ 
      transparent: true, 
      opacity: 0.0 
    });
    
    // North wall
    const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
    northWall.position.set(0, boundaryHeight / 2, -boundarySize);
    northWall.rotation.y = Math.PI / 2;
    this.scene.add(northWall);
    
    // South wall
    const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
    southWall.position.set(0, boundaryHeight / 2, boundarySize);
    southWall.rotation.y = Math.PI / 2;
    this.scene.add(southWall);
    
    // East wall
    const eastWall = new THREE.Mesh(wallGeometry, wallMaterial);
    eastWall.position.set(boundarySize, boundaryHeight / 2, 0);
    this.scene.add(eastWall);
    
    // West wall
    const westWall = new THREE.Mesh(wallGeometry, wallMaterial);
    westWall.position.set(-boundarySize, boundaryHeight / 2, 0);
    this.scene.add(westWall);
    
    // Store for collision detection
    this.boundaries = [northWall, southWall, eastWall, westWall];
  }
  
  /**
   * Spawn material resources around the scene
   * @private
   */
  _spawnResources() {
    // Initial resources
    const initialResourceCount = 20;
    
    for (let i = 0; i < initialResourceCount; i++) {
      // Create random position, biased towards land (not in water)
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 25; // Keep within land area
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const position = {
        x: x,
        y: 0.3 + Math.random() * 0.5, // Above ground
        z: z
      };
      
      const resource = createResourceForStage('prehistoric', position);
      this.resources.push(resource);
      this.scene.add(resource.mesh);
    }
  }
  
  /**
   * Setup meteor tracking system
   * @private
   */
  _setupMeteorTracking() {
    // Create a placeholder for the meteor (will only be visible during warning)
    const meteorGeometry = new THREE.SphereGeometry(2, 16, 16);
    const meteorMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0x771100,
      roughness: 0.7,
      metalness: 0.6
    });
    
    this.meteor = new THREE.Mesh(meteorGeometry, meteorMaterial);
    
    // Start meteor far away and not visible
    this.meteor.position.set(0, 500, 0);
    this.meteor.visible = false;
    
    // Add meteor trail effect
    const trailGeometry = new THREE.ConeGeometry(1, 10, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.6
    });
    
    this.meteorTrail = new THREE.Mesh(trailGeometry, trailMaterial);
    this.meteorTrail.visible = false;
    
    this.scene.add(this.meteor);
    this.scene.add(this.meteorTrail);
  }
  
  /**
   * Update scene each frame
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update resources
    this.resources.forEach(resource => {
      resource.update(deltaTime);
    });
    
    // Animate water
    if (this.water) {
      const time = Date.now() * 0.0005;
      this.water.position.y = -0.3 + Math.sin(time) * 0.05;
    }
    
    // Animate plants
    this.plants.forEach((plant, index) => {
      const time = Date.now() * 0.001;
      const offset = index * 0.2;
      
      // Gentle swaying motion
      plant.rotation.x = Math.sin(time + offset) * 0.05;
      plant.rotation.z = Math.cos(time + offset) * 0.05;
    });
    
    // Check for collision with boundaries
    this._checkBoundaryCollision();
    
    // Update meteor warning effects
    if (this.meteorWarningActive) {
      this._updateMeteorWarning(deltaTime);
    }
  }
  
  /**
   * Check and handle collision with boundaries
   * @private
   */
  _checkBoundaryCollision() {
    if (!this.game.state.player || !this.game.state.player.mesh) return;
    
    const playerPos = this.game.state.player.mesh.position;
    
    // Simple boundary check
    if (Math.abs(playerPos.x) > 29) {
      playerPos.x = Math.sign(playerPos.x) * 29;
    }
    
    if (Math.abs(playerPos.z) > 29) {
      playerPos.z = Math.sign(playerPos.z) * 29;
    }
    
    // Check for water
    if (playerPos.x * playerPos.x + playerPos.z * playerPos.z > 25 * 25) {
      // Player is in water, slow them down and adjust y position
      playerPos.y = -0.1; // Slightly below water surface
    } else {
      playerPos.y = 0.5; // Normal height on land
    }
  }
  
  /**
   * Get nearby resources for collection
   * @param {THREE.Vector3} position - Position to check from
   * @param {number} radius - Collection radius
   * @returns {Array} - Array of nearby resources
   */
  getNearbyResources(position, radius) {
    // Filter resources by distance
    return this.resources.filter(resource => {
      if (resource.collected || !resource.mesh) return false;
      
      const distance = position.distanceTo(resource.mesh.position);
      return distance < radius;
    }).sort((a, b) => {
      // Sort by closest first
      const distA = position.distanceTo(a.mesh.position);
      const distB = position.distanceTo(b.mesh.position);
      return distA - distB;
    });
  }
  
  /**
   * Collect a resource
   * @param {Object} resource - Resource to collect
   * @returns {number} - Value of collected resource
   */
  collectResource(resource) {
    const value = resource.collect();
    
    // Remove from managed resources after animation completes
    setTimeout(() => {
      const index = this.resources.indexOf(resource);
      if (index !== -1) {
        this.resources.splice(index, 1);
      }
      
      // Spawn a new resource to replace it
      if (Math.random() < 0.7) {
        this._spawnReplacementResource();
      }
    }, 1000);
    
    return value;
  }
  
  /**
   * Spawn a replacement resource
   * @private
   */
  _spawnReplacementResource() {
    // Spawn at a random location, biased towards player
    const playerPos = this.game.state.player.mesh.position;
    
    // Random angle but within a reasonable distance from player
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 15;
    
    // Calculate position, but keep within land area
    let x = playerPos.x + Math.cos(angle) * distance;
    let z = playerPos.z + Math.sin(angle) * distance;
    
    // Ensure within boundaries
    x = Math.max(-29, Math.min(29, x));
    z = Math.max(-29, Math.min(29, z));
    
    // Ensure on land if possible
    const distFromCenter = Math.sqrt(x * x + z * z);
    if (distFromCenter > 25) {
      // Adjust to be on land
      const adjustScale = 25 / distFromCenter;
      x *= adjustScale;
      z *= adjustScale;
    }
    
    const position = {
      x: x,
      y: 0.3 + Math.random() * 0.5,
      z: z
    };
    
    const resource = createResourceForStage('prehistoric', position);
    this.resources.push(resource);
    this.scene.add(resource.mesh);
  }
  
  /**
   * Handle environment interaction
   * @param {THREE.Vector3} position - Player position
   * @param {Object} traits - Player traits
   * @param {Object} philosophicalTraits - Player philosophical traits
   * @returns {boolean} Whether interaction occurred
   */
  playerInteractWithEnvironment(position, traits, philosophicalTraits) {
    // Check for interaction with rocks (could contain resources or knowledge)
    for (let i = 0; i < this.rocks.length; i++) {
      const rock = this.rocks[i];
      const distance = position.distanceTo(rock.position);
      
      if (distance < 2) {
        if (Math.random() < 0.3) {
          // 30% chance of finding a hidden resource
          const resourcePos = {
            x: rock.position.x + (Math.random() - 0.5),
            y: rock.position.y + 0.5,
            z: rock.position.z + (Math.random() - 0.5)
          };
          
          const resource = createResourceForStage('prehistoric', resourcePos, {
            value: 2 // Higher value hidden resource
          });
          
          this.resources.push(resource);
          this.scene.add(resource.mesh);
          
          return true;
        } else if (Math.random() < 0.2) {
          // 20% chance of finding ancient knowledge (boost traits)
          if (philosophicalTraits.curiosity > 0.5) {
            // Higher curiosity increases adaptation bonus
            traits.adaptability += 0.1 * philosophicalTraits.curiosity;
            
            // Show notification
            this.game.hud.showEvolutionNotification(
              'Ancient Knowledge',
              'Your curiosity helped you discover ancient patterns'
            );
            
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * Show warning when meteor is approaching
   */
  showFloodWarning() {
    if (this.meteorWarningActive) return;
    
    this.meteorWarningActive = true;
    
    // Position meteor far above in the sky
    const targetPosition = new THREE.Vector3(
      (Math.random() - 0.5) * 20, // Random target on land
      0,
      (Math.random() - 0.5) * 20
    );
    
    // Start position high in the sky at an angle
    const startPosition = new THREE.Vector3(
      targetPosition.x - 100,
      200,
      targetPosition.z - 100
    );
    
    this.meteor.position.copy(startPosition);
    this.meteor.visible = true;
    
    // Store meteor animation data
    this.meteorData = {
      startPosition: startPosition.clone(),
      targetPosition: targetPosition.clone(),
      progress: 0,
      impactScale: 0
    };
    
    // Change ambient light to indicate warning
    this.scene.fog.color.set(0x332211);
    
    // Add rumble effect (using camera shake)
    this.rumbleIntensity = 0.01;
  }
  
  /**
   * Update meteor warning visual effects
   * @param {number} deltaTime - Time since last update
   * @private
   */
  _updateMeteorWarning(deltaTime) {
    if (!this.meteorData) return;
    
    // Progress meteor path as time runs out
    const timeLeft = this.game.state.timer;
    
    if (timeLeft < 30) {
      // Scale progress based on remaining time
      this.meteorData.progress = (30 - timeLeft) / 30;
      
      // Meteor position along path
      const t = Math.min(this.meteorData.progress * 2, 1); // Double speed for movement
      
      this.meteor.position.lerpVectors(
        this.meteorData.startPosition,
        this.meteorData.targetPosition,
        t
      );
      
      // Update meteor trail
      if (this.meteorTrail) {
        this.meteorTrail.position.copy(this.meteor.position);
        this.meteorTrail.lookAt(this.meteorData.targetPosition);
        this.meteorTrail.visible = true;
        
        // Scale trail based on speed
        const trailScale = 1 + (4 * t);
        this.meteorTrail.scale.set(trailScale, trailScale, trailScale);
        
        // Make trail more visible as it approaches
        this.meteorTrail.material.opacity = 0.3 + (0.7 * t);
      }
      
      // Increase rumble intensity as meteor approaches
      this.rumbleIntensity = 0.01 + (t * 0.1);
      
      // Apply camera shake
      if (this.game.cameraController && this.game.cameraController.camera) {
        const camera = this.game.cameraController.camera;
        camera.position.x += (Math.random() - 0.5) * this.rumbleIntensity;
        camera.position.y += (Math.random() - 0.5) * this.rumbleIntensity;
        camera.position.z += (Math.random() - 0.5) * this.rumbleIntensity;
      }
      
      // If meteor has reached target, show impact scale
      if (t >= 1 && timeLeft < 10) {
        this.meteorData.impactScale = (10 - timeLeft) / 10;
        this._showMeteorImpact();
      }
    }
  }
  
  /**
   * Show meteor impact effect
   * @private
   */
  _showMeteorImpact() {
    // Create impact light and shockwave
    if (!this.impactLight) {
      this.impactLight = new THREE.PointLight(0xff5500, 2, 50);
      this.impactLight.position.copy(this.meteorData.targetPosition);
      this.scene.add(this.impactLight);
      
      // Create shockwave ring
      const shockwaveGeometry = new THREE.RingGeometry(0.1, 0.5, 32);
      const shockwaveMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      
      this.shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
      this.shockwave.position.copy(this.meteorData.targetPosition);
      this.shockwave.position.y = 0.1;
      this.shockwave.rotation.x = -Math.PI / 2;
      this.scene.add(this.shockwave);
    }
    
    // Scale the impact effects
    if (this.impactLight) {
      this.impactLight.intensity = 2 + (this.meteorData.impactScale * 8);
    }
    
    if (this.shockwave) {
      const scale = 0.1 + (this.meteorData.impactScale * 15);
      this.shockwave.scale.set(scale, scale, 1);
      this.shockwave.material.opacity = 0.7 * (1 - this.meteorData.impactScale);
    }
    
    // Increase rumble even more
    this.rumbleIntensity = 0.1 + (this.meteorData.impactScale * 0.2);
  }
  
  /**
   * Show survival animation when player has enough resources
   */
  showFloodSurvival() {
    // Hide meteor
    if (this.meteor) {
      this.meteor.visible = false;
    }
    
    if (this.meteorTrail) {
      this.meteorTrail.visible = false;
    }
    
    // Create bright shield effect
    const shieldGeometry = new THREE.SphereGeometry(15, 32, 32);
    const shieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.copy(this.game.state.player.mesh.position);
    shield.scale.set(0.1, 0.1, 0.1);
    this.scene.add(shield);
    
    // Animate shield expansion
    const startTime = Date.now();
    
    const animateShield = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 3000) {
        const progress = elapsed / 3000;
        shield.scale.set(progress, progress, progress);
        shield.material.opacity = 0.7 * (1 - progress / 2);
        requestAnimationFrame(animateShield);
      } else {
        this.scene.remove(shield);
      }
    };
    
    animateShield();
    
    // Reset fog and lighting
    this.scene.fog.color.set(this.config.fogColor);
    
    // Remove impact effects
    if (this.impactLight) {
      this.scene.remove(this.impactLight);
      this.impactLight = null;
    }
    
    if (this.shockwave) {
      this.scene.remove(this.shockwave);
      this.shockwave = null;
    }
  }
  
  /**
   * Show failure animation when player doesn't have enough resources
   */
  showFloodFailure() {
    // Make meteor hit directly at player
    if (this.meteor && this.game.state.player && this.game.state.player.mesh) {
      this.meteor.visible = true;
      
      // Start position high in the sky
      const startPosition = new THREE.Vector3(0, 100, 0);
      const targetPosition = this.game.state.player.mesh.position.clone();
      
      this.meteor.position.copy(startPosition);
      
      // Animate meteor striking player
      const startTime = Date.now();
      
      const animateMeteorImpact = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < 3000) {
          const progress = elapsed / 3000;
          this.meteor.position.lerpVectors(startPosition, targetPosition, progress);
          
          // Scale meteor as it approaches
          const scale = 1 + progress * 5;
          this.meteor.scale.set(scale, scale, scale);
          
          // Increase rumble
          this.rumbleIntensity = 0.1 + (progress * 0.5);
          
          // Apply intense camera shake
          if (this.game.cameraController && this.game.cameraController.camera) {
            const camera = this.game.cameraController.camera;
            camera.position.x += (Math.random() - 0.5) * this.rumbleIntensity;
            camera.position.y += (Math.random() - 0.5) * this.rumbleIntensity;
            camera.position.z += (Math.random() - 0.5) * this.rumbleIntensity;
          }
          
          requestAnimationFrame(animateMeteorImpact);
        } else {
          // Final impact - create explosion
          this._createMeteorExplosion(targetPosition);
          this.scene.remove(this.meteor);
        }
      };
      
      animateMeteorImpact();
    }
  }
  
  /**
   * Create meteor explosion effect
   * @param {THREE.Vector3} position - Impact position
   * @private
   */
  _createMeteorExplosion(position) {
    // Create explosion light
    const explosionLight = new THREE.PointLight(0xff5500, 10, 50);
    explosionLight.position.copy(position);
    this.scene.add(explosionLight);
    
    // Create explosion sphere
    const explosionGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 1
    });
    
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(position);
    this.scene.add(explosion);
    
    // Animate explosion
    const startTime = Date.now();
    
    const animateExplosion = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 4000) {
        const progress = elapsed / 4000;
        
        // Expand explosion
        const scale = 20 * progress;
        explosion.scale.set(scale, scale, scale);
        
        // Fade out
        explosion.material.opacity = 1 - progress;
        
        // Decrease light intensity
        explosionLight.intensity = 10 * (1 - progress);
        
        requestAnimationFrame(animateExplosion);
      } else {
        this.scene.remove(explosion);
        this.scene.remove(explosionLight);
      }
    };
    
    animateExplosion();
    
    // Darken scene
    this.scene.fog.color.set(0x000000);
    this.scene.fog.density = this.config.fogDensity * 5;
  }
  
  /**
   * Clean up resources when scene is no longer needed
   */
  dispose() {
    // Clean up resources
    this.resources.forEach(resource => {
      resource.dispose();
    });
    
    // Clean up geometries and materials
    if (this.terrain) {
      this.terrain.geometry.dispose();
      this.terrain.material.dispose();
    }
    
    if (this.water) {
      this.water.geometry.dispose();
      this.water.material.dispose();
    }
    
    this.rocks.forEach(rock => {
      rock.geometry.dispose();
      rock.material.dispose();
    });
    
    this.plants.forEach(plant => {
      plant.geometry.dispose();
      plant.material.dispose();
    });
    
    this.boundaries.forEach(boundary => {
      boundary.geometry.dispose();
      boundary.material.dispose();
    });
    
    if (this.meteor) {
      this.meteor.geometry.dispose();
      this.meteor.material.dispose();
    }
    
    if (this.meteorTrail) {
      this.meteorTrail.geometry.dispose();
      this.meteorTrail.material.dispose();
    }
  }
  
  /**
   * Gets interactive environment elements near the player
   * @param {THREE.Vector3} position - Player position
   * @param {number} radius - Detection radius
   * @returns {Object|null} Environment object to interact with or null if none found
   */
  getEnvironmentInteractable(position, radius) {
    // Check for rock interactions - could reveal shelter or resources in prehistoric stage
    for (const rock of this.rocks) {
      const distance = position.distanceTo(rock.position);
      if (distance < radius) {
        return {
          type: 'rock',
          object: rock,
          position: rock.position.clone()
        };
      }
    }
    
    return null;
  }
  
  /**
   * Gets any nearby villages (not used in prehistoric stage)
   * @param {THREE.Vector3} position - Player position
   * @param {number} radius - Detection radius
   * @returns {Object|null} Village object or null if none found
   */
  getNearbyVillage(position, radius) {
    // No villages in prehistoric stage
    return null;
  }
  
  /**
   * Get the will to live object (not used in prehistoric stage)
   * @returns {THREE.Object3D|null} Always returns null in prehistoric stage
   */
  getWillToLiveObject() {
    // No will to live object in prehistoric stage (already found in primordial)
    return null;
  }
  
  /**
   * Handle when player finds will to live (not used in prehistoric stage)
   * This is implemented for API compatibility with Primordial stage
   */
  onWillToLiveFound() {
    // No action needed - will-to-live is already found in prehistoric stage
    return;
  }
} 