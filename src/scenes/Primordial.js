import * as THREE from 'three';
import { createResourceForStage } from '../entities/Resource.js';

/**
 * First stage: Primordial Soup scene
 */
export default class Primordial {
  /**
   * Initialize primordial soup scene
   * @param {Object} game - Game instance
   * @param {Object} config - Stage configuration
   */
  constructor(game, config) {
    this.game = game;
    this.config = config;
    this.resources = [];
    this.willToLiveObj = null;
    this.floodWarningActive = false;
    
    this.scene = new THREE.Scene();
    
    // Start with a dark, desaturated background before will-to-live
    this.scene.background = new THREE.Color(0x111824);
    
    // Limited visibility with dense fog - more oppressive before will-to-live
    this.scene.fog = new THREE.FogExp2(0x111824, config.fogDensity * 1.5);
    
    this._setupLights();
    this._setupEnvironment();
    this._spawnResources();
    this._createWillToLive();
    
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
    // Ambient light (very dim for pre-will-to-live primordial)
    const ambient = new THREE.AmbientLight(0x334455, 0.5);
    this.scene.add(ambient);
    
    // Directional light (dim light source before will-to-live)
    const directional = new THREE.DirectionalLight(0x445566, 0.6);
    directional.position.set(1, 5, 2);
    directional.castShadow = true;
    
    // Shadow settings for mobile optimization
    directional.shadow.mapSize.width = 1024;
    directional.shadow.mapSize.height = 1024;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 50;
    directional.shadow.camera.left = -10;
    directional.shadow.camera.right = 10;
    directional.shadow.camera.top = 10;
    directional.shadow.camera.bottom = -10;
    
    this.scene.add(directional);
    
    // Additional point lights for atmosphere
    const blueLight = new THREE.PointLight(0x0044ff, 0.5, 20);
    blueLight.position.set(-5, 3, -5);
    this.scene.add(blueLight);
    
    const greenLight = new THREE.PointLight(0x00ff88, 0.3, 15);
    greenLight.position.set(8, 2, 8);
    this.scene.add(greenLight);
  }
  
  /**
   * Set up ground and environment
   * @private
   */
  _setupEnvironment() {
    // Ground plane - wavy primordial soup
    const groundGeometry = new THREE.PlaneGeometry(50, 50, 32, 32);
    
    // Create subtle waves in the primordial soup
    const positionAttribute = groundGeometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      
      // Skip the edges to maintain a flat border
      if (Math.abs(vertex.x) < 24 && Math.abs(vertex.y) < 24) {
        const distance = vertex.length();
        // Increase wave height by 2x for more noticeable terrain variation
        const waveHeight = 0.4 * Math.sin(distance * 0.5) + 
                          0.2 * Math.sin(vertex.x * 0.3) * Math.sin(vertex.y * 0.4);
        vertex.z = waveHeight;
      }
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    // Update normals for correct lighting
    groundGeometry.computeVertexNormals();
    
    // Dark, desaturated material for the primordial soup before will-to-live
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x222233,
      roughness: 0.7,
      metalness: 0.3,
      side: THREE.DoubleSide
    });
    
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    
    // Add particles for atmosphere
    this._createParticles();
    
    // Add boundary to prevent player from leaving area
    this._createBoundary();
  }
  
  /**
   * Create particles for atmospheric effect
   * @private
   */
  _createParticles() {
    // Create particles in the air
    const particleCount = 500;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Random position within a cylinder
      const radius = 20 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      positions[i3] = radius * Math.cos(theta);
      positions[i3 + 1] = Math.random() * 5; // Height
      positions[i3 + 2] = radius * Math.sin(theta);
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Small, faint points
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x445566,
      size: 0.03,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(particles, particleMaterial);
    this.scene.add(this.particles);
  }
  
  /**
   * Create boundary walls to contain player
   * @private
   */
  _createBoundary() {
    // Invisible collision boundary
    const boundarySize = 25;
    const boundaryHeight = 5;
    
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
   * Spawn energy resources around the scene
   * @private
   */
  _spawnResources() {
    // Initial resources
    const initialResourceCount = 15;
    
    for (let i = 0; i < initialResourceCount; i++) {
      const position = {
        x: (Math.random() - 0.5) * 40,
        y: 0.3 + Math.random() * 0.3, // Slightly above ground
        z: (Math.random() - 0.5) * 40
      };
      
      const resource = createResourceForStage('primordial', position);
      this.resources.push(resource);
      this.scene.add(resource.mesh);
    }
  }
  
  /**
   * Create the "will to live" special object
   * @private
   */
  _createWillToLive() {
    // Only create if player doesn't have it yet
    if (this.game.state.player && !this.game.state.player.willToLive) {
      // Create a special glowing orb
      const geometry = new THREE.SphereGeometry(0.6, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x88ccff,
        emissiveIntensity: 2,
        roughness: 0.1,
        metalness: 0.8
      });
      
      this.willToLiveObj = new THREE.Mesh(geometry, material);
      
      // Set a safe distance that's always within boundaries
      // Game boundary is at ±25 units, so keep it well within those limits
      const maxDistance = 20; // Keep at least 5 units from boundaries
      const minDistance = 10; // Not too close to start point
      
      // Calculate distance within safe range
      const distance = minDistance + (Math.random() * (maxDistance - minDistance));
      const angle = Math.random() * Math.PI * 2;
      
      // Calculate position
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      // Validate position is within boundaries
      const boundarySize = 24; // Slightly inside the actual boundary of 25
      const safeX = Math.max(-boundarySize, Math.min(boundarySize, x));
      const safeZ = Math.max(-boundarySize, Math.min(boundarySize, z));
      
      // Set position with validated coordinates
      this.willToLiveObj.position.set(safeX, 0.8, safeZ);
      
      // Add a point light to make it glow
      const light = new THREE.PointLight(0x88ccff, 4, 8);
      this.willToLiveObj.add(light);
      
      // Add to scene
      this.scene.add(this.willToLiveObj);
      
      // Set user data for identification
      this.willToLiveObj.userData.type = 'willToLive';
    }
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
    
    // Animate will to live object
    if (this.willToLiveObj) {
      // Gentle floating and rotation
      this.willToLiveObj.position.y = 0.5 + Math.sin(Date.now() * 0.001) * 0.2;
      this.willToLiveObj.rotation.y += 0.01;
      
      // Pulse the light
      if (this.willToLiveObj.children[0]) {
        this.willToLiveObj.children[0].intensity = 1.5 + Math.sin(Date.now() * 0.002) * 0.5;
      }
    }
    
    // Make the ground "waves" move
    if (this.ground) {
      const positionAttribute = this.ground.geometry.getAttribute('position');
      const vertex = new THREE.Vector3();
      
      for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);
        
        // Skip the edges to maintain a flat border
        if (Math.abs(vertex.x) < 24 && Math.abs(vertex.y) < 24) {
          const distance = vertex.length();
          const time = Date.now() * 0.0005;
          const waveHeight = 0.2 * Math.sin(distance * 0.5 + time) + 
                            0.1 * Math.sin(vertex.x * 0.3 + time) * Math.sin(vertex.y * 0.4 + time);
          vertex.z = waveHeight;
        }
        
        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
      
      positionAttribute.needsUpdate = true;
    }
    
    // Animate particles
    if (this.particles) {
      const positions = this.particles.geometry.getAttribute('position');
      const time = Date.now() * 0.00025;
      
      for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3;
        const x = positions.array[i3];
        const y = positions.array[i3 + 1];
        const z = positions.array[i3 + 2];
        
        // Subtle movement for floating particles
        positions.array[i3] = x + Math.sin(time + i * 0.1) * 0.01;
        positions.array[i3 + 1] = y + Math.cos(time + i * 0.05) * 0.01;
        positions.array[i3 + 2] = z + Math.sin(time + i * 0.07) * 0.01;
      }
      
      positions.needsUpdate = true;
    }
    
    // Check for collision with boundaries
    this._checkBoundaryCollision();
    
    // Update flood warning effects
    if (this.floodWarningActive) {
      this._updateFloodWarning();
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
    if (Math.abs(playerPos.x) > 24) {
      playerPos.x = Math.sign(playerPos.x) * 24;
    }
    
    if (Math.abs(playerPos.z) > 24) {
      playerPos.z = Math.sign(playerPos.z) * 24;
    }
  }
  
  /**
   * Handle when player finds will to live
   */
  onWillToLiveFound() {
    // Remove the object from scene
    if (this.willToLiveObj) {
      // Play sound effect using Web Audio API (no external files needed)
      this._playAwakeningSoundEffect();
      
      // Create a ripple effect that changes the world
      const transformationRipple = () => {
        // Initial flash at orb position
        const flash = new THREE.PointLight(0xffffff, 8, 15);
        flash.position.copy(this.willToLiveObj.position);
        this.scene.add(flash);
        
        // Expanding ring of color
        const ringGeometry = new THREE.RingGeometry(0.1, 0.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x88ccff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(this.willToLiveObj.position);
        ring.rotation.x = Math.PI / 2; // Flat on the ground
        this.scene.add(ring);
        
        // Starting time for animation
        const startTime = Date.now();
        
        // Animation duration
        const duration = 3000; // 3 seconds
        
        // Original scene properties
        const originalFogColor = this.scene.fog.color.clone();
        const originalFogDensity = this.scene.fog.density;
        const originalBackground = this.scene.background.clone();
        
        // Target scene properties - more vibrant world
        const targetFogColor = new THREE.Color(0x3399cc); // Brighter blue
        const targetFogDensity = originalFogDensity * 0.3; // Much clearer
        const targetBackground = new THREE.Color(0x225588); // Brighter background
        
        // Store original light colors and intensities
        const lights = this.scene.children.filter(child => 
          child instanceof THREE.AmbientLight || 
          child instanceof THREE.DirectionalLight ||
          child instanceof THREE.PointLight
        );
        
        const originalLightData = lights.map(light => ({
          light,
          color: light.color.clone(),
          intensity: light.intensity
        }));
        
        // Animation function
        const animateTransformation = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Non-linear easing for more dramatic effect
          const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          
          // Expand ring
          const maxRingSize = 50;
          const ringSize = 0.5 + (maxRingSize * eased);
          ring.geometry.dispose();
          ring.geometry = new THREE.RingGeometry(ringSize - 0.5, ringSize, 32);
          
          // Update ring opacity
          ringMaterial.opacity = Math.max(0, 0.8 - eased * 0.8);
          
          // Transform fog
          this.scene.fog.color.lerpColors(originalFogColor, targetFogColor, eased);
          this.scene.fog.density = originalFogDensity - ((originalFogDensity - targetFogDensity) * eased);
          
          // Transform background
          this.scene.background.lerpColors(originalBackground, targetBackground, eased);
          
          // Transform lights - make them more vibrant
          originalLightData.forEach(({ light, color, intensity }) => {
            // Increase intensity
            light.intensity = intensity + (intensity * eased * 0.5);
            
            // Make colors more vibrant
            if (light instanceof THREE.PointLight) {
              const targetColor = new THREE.Color(light instanceof THREE.PointLight ? 0x55aaff : 0xffffff);
              light.color.lerpColors(color, targetColor, eased);
            }
          });
          
          // Flash fades out
          if (elapsed < 1500) {
            flash.intensity = 8 * (1 - elapsed / 1500);
          } else if (flash.parent) {
            this.scene.remove(flash);
          }
          
          // Continue animation if not complete
          if (progress < 1) {
            requestAnimationFrame(animateTransformation);
          } else {
            // Clean up when complete
            this.scene.remove(ring);
            ringGeometry.dispose();
            ringMaterial.dispose();
            
            // Add ambient particles to indicate the new vibrant world
            this._enhanceParticles();
            
            // Create interactive event triggers after transformation
            if (this.game.eventSystem) {
              setTimeout(() => {
                this.game.eventSystem.createInteractiveTriggers('primordial');
              }, 5000); // Wait 5 seconds after transformation completes
            }
          }
        };
        
        // Start animation
        animateTransformation();
      };
      
      // Start the transformation
      transformationRipple();
      
      // Remove will to live object
      this.scene.remove(this.willToLiveObj);
      this.willToLiveObj = null;
      
      // Spawn more resources
      this._spawnAdditionalResources();
    }
  }
  
  /**
   * Enhance particles to create a more vibrant atmosphere
   * @private
   */
  _enhanceParticles() {
    // Remove existing particles
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      this.particles.material.dispose();
    }
    
    // Create new, more vibrant particles
    const particleCount = 800;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const colorOptions = [
      new THREE.Color(0x88ccff), // Light blue
      new THREE.Color(0x00ffaa), // Cyan
      new THREE.Color(0xaaddff), // Sky blue
      new THREE.Color(0x66bbff), // Blue
      new THREE.Color(0x99eeff)  // Light cyan
    ];
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Random position within a cylinder
      const radius = 20 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      positions[i3] = radius * Math.cos(theta);
      positions[i3 + 1] = Math.random() * 5; // Height
      positions[i3 + 2] = radius * Math.sin(theta);
      
      // Random color from options
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Larger, more visible points
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.08,
      transparent: true,
      opacity: 0.7,
      vertexColors: true,
      blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(particles, particleMaterial);
    this.scene.add(this.particles);
  }
  
  /**
   * Spawn additional resources after finding will to live
   * @private
   */
  _spawnAdditionalResources() {
    const additionalCount = 10;
    
    for (let i = 0; i < additionalCount; i++) {
      const position = {
        x: (Math.random() - 0.5) * 40,
        y: 0.3 + Math.random() * 0.3,
        z: (Math.random() - 0.5) * 40
      };
      
      const resource = createResourceForStage('primordial', position);
      this.resources.push(resource);
      this.scene.add(resource.mesh);
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
    // Spawn at a random location, biased towards the player
    const playerPos = this.game.state.player.mesh.position;
    
    // Random angle but within a reasonable distance from player
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 15;
    
    const position = {
      x: playerPos.x + Math.cos(angle) * distance,
      y: 0.3 + Math.random() * 0.3,
      z: playerPos.z + Math.sin(angle) * distance
    };
    
    // Clamp to boundaries
    position.x = Math.max(-24, Math.min(24, position.x));
    position.z = Math.max(-24, Math.min(24, position.z));
    
    const resource = createResourceForStage('primordial', position);
    this.resources.push(resource);
    this.scene.add(resource.mesh);
  }
  
  /**
   * Get the will to live object
   * @returns {THREE.Object3D} Will to live object or null
   */
  getWillToLiveObject() {
    return this.willToLiveObj;
  }
  
  /**
   * Handle environment interaction (like resource collection)
   * @param {THREE.Vector3} position - Player position
   * @param {Object} traits - Player traits
   * @param {Object} philosophicalTraits - Player philosophical traits
   * @returns {boolean} Whether interaction occurred
   */
  playerInteractWithEnvironment(position, traits, philosophicalTraits) {
    // In primordial stage, environment interactions are minimal
    // This would be expanded in later stages
    return false;
  }
  
  /**
   * Show warning when flood is approaching
   */
  showFloodWarning() {
    if (this.floodWarningActive) return;
    
    this.floodWarningActive = true;
    
    // Change fog color to indicate flood
    const originalFogColor = this.scene.fog.color.clone();
    const warningFogColor = new THREE.Color(0x000066);
    
    // Store for animation
    this.floodWarningData = {
      originalFogColor,
      warningFogColor,
      progress: 0
    };
  }
  
  /**
   * Update flood warning visual effects
   * @private
   */
  _updateFloodWarning() {
    // Gradually change fog color
    if (this.floodWarningData) {
      this.floodWarningData.progress = Math.min(
        this.floodWarningData.progress + 0.005, 
        1
      );
      
      // Pulse between original and warning color
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.001);
      const lerpAmount = this.floodWarningData.progress * pulse;
      
      this.scene.fog.color.lerpColors(
        this.floodWarningData.originalFogColor,
        this.floodWarningData.warningFogColor,
        lerpAmount
      );
      
      // Add rising water effect as flood approaches
      if (this.floodWarningData.progress > 0.5) {
        this._updateRisingWater();
      }
    }
  }
  
  /**
   * Create and update rising water effect
   * @private
   */
  _updateRisingWater() {
    // Create water plane if it doesn't exist
    if (!this.floodWater) {
      const waterGeometry = new THREE.PlaneGeometry(100, 100, 32, 32);
      
      // Add ripple effect to water
      const positionAttribute = waterGeometry.getAttribute('position');
      const vertex = new THREE.Vector3();
      
      // Store original positions for animation
      this.waterPositions = new Float32Array(positionAttribute.array.length);
      for (let i = 0; i < positionAttribute.array.length; i++) {
        this.waterPositions[i] = positionAttribute.array[i];
      }
      
      // More visible and dramatic water material
      const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x0055aa,
        emissive: 0x003366,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.8
      });
      
      this.floodWater = new THREE.Mesh(waterGeometry, waterMaterial);
      this.floodWater.rotation.x = -Math.PI / 2;
      this.floodWater.position.y = -5; // Start below the ground
      this.scene.add(this.floodWater);
      
      // Add an ambient light to the water to make it glow
      const waterLight = new THREE.PointLight(0x0088ff, 1.5, 20);
      waterLight.position.y = 2;
      this.floodWater.add(waterLight);
    }
    
    // Gradually raise the water level
    const timeLeft = this.game.state.timer;
    const maxHeight = 2.0; // Increased max height for more dramatic effect
    
    if (timeLeft < 15) {
      const progress = (15 - timeLeft) / 15;
      this.floodWater.position.y = -5 + (progress * (maxHeight + 5));
      
      // Make the water more opaque as it rises
      this.floodWater.material.opacity = 0.7 + (progress * 0.3);
      
      // Add ripple animation to water
      const positionAttribute = this.floodWater.geometry.getAttribute('position');
      const time = Date.now() * 0.001;
      const vertex = new THREE.Vector3();
      
      for (let i = 0; i < positionAttribute.count; i++) {
        const i3 = i * 3;
        // Get original position
        const x = this.waterPositions[i3];
        const y = this.waterPositions[i3 + 1];
        const z = this.waterPositions[i3 + 2];
        
        // Add ripple effect - more intense as timer gets lower
        const distance = Math.sqrt(x * x + y * y);
        const intensity = Math.min(1, (15 - timeLeft) / 10);
        const ripple = Math.sin(distance * 1.5 - time * 2) * 0.15 * intensity;
        
        // Apply ripple
        positionAttribute.setZ(i, z + ripple);
      }
      
      positionAttribute.needsUpdate = true;
      
      // Increase fog density as water rises
      this.scene.fog.density = this.config.fogDensity * (1 + progress * 0.5);
      
      // Add splash particles if not already added
      if (!this.splashParticles && timeLeft < 8) {
        this._createSplashParticles();
      }
    }
  }
  
  /**
   * Create water splash particle effects
   * @private
   */
  _createSplashParticles() {
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // Create particles at water level
    const waterY = this.floodWater.position.y;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = 20 * Math.random();
      const angle = Math.random() * Math.PI * 2;
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = waterY + Math.random() * 0.5;
      positions[i3 + 2] = Math.sin(angle) * radius;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    this.splashParticles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.splashParticles);
  }
  
  /**
   * Show survival animation when player has enough resources
   */
  showFloodSurvival() {
    // Create bright flash of light
    const flash = new THREE.PointLight(0xffffff, 10, 100);
    flash.position.set(0, 10, 0);
    this.scene.add(flash);
    
    // Fade out the flood
    if (this.floodWater) {
      const startTime = Date.now();
      const startOpacity = this.floodWater.material.opacity;
      
      const animateWaterFade = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < 2000) {
          this.floodWater.material.opacity = startOpacity * (1 - elapsed / 2000);
          requestAnimationFrame(animateWaterFade);
        } else {
          this.scene.remove(this.floodWater);
        }
      };
      
      animateWaterFade();
    }
    
    // Fade out the flash
    const startTime = Date.now();
    
    const animateFlash = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 3000) {
        flash.intensity = 10 * (1 - elapsed / 3000);
        requestAnimationFrame(animateFlash);
      } else {
        this.scene.remove(flash);
      }
    };
    
    animateFlash();
  }
  
  /**
   * Show failure animation when player doesn't have enough resources
   */
  showFloodFailure() {
    // Raise water rapidly
    if (!this.floodWater) {
      const waterGeometry = new THREE.PlaneGeometry(100, 100);
      const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x001133,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      
      this.floodWater = new THREE.Mesh(waterGeometry, waterMaterial);
      this.floodWater.rotation.x = -Math.PI / 2;
      this.floodWater.position.y = -2;
      this.scene.add(this.floodWater);
    }
    
    // Rapidly raise water
    const startTime = Date.now();
    const startY = this.floodWater.position.y;
    const targetY = 10; // Well above player
    
    const animateFlood = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 4000) {
        this.floodWater.position.y = startY + (targetY - startY) * (elapsed / 4000);
        requestAnimationFrame(animateFlood);
      }
    };
    
    animateFlood();
    
    // Darken scene
    const originalFogColor = this.scene.fog.color.clone();
    const darkFogColor = new THREE.Color(0x000011);
    const originalFogDensity = this.scene.fog.density;
    
    const animateFog = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 4000) {
        const t = elapsed / 4000;
        this.scene.fog.color.lerpColors(originalFogColor, darkFogColor, t);
        this.scene.fog.density = originalFogDensity + t * 0.2;
        requestAnimationFrame(animateFog);
      }
    };
    
    animateFog();
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
    if (this.ground) {
      this.ground.geometry.dispose();
      this.ground.material.dispose();
    }
    
    if (this.particles) {
      this.particles.geometry.dispose();
      this.particles.material.dispose();
    }
    
    if (this.willToLiveObj) {
      this.willToLiveObj.geometry.dispose();
      this.willToLiveObj.material.dispose();
    }
    
    if (this.floodWater) {
      this.floodWater.geometry.dispose();
      this.floodWater.material.dispose();
    }
    
    if (this.splashParticles) {
      this.splashParticles.geometry.dispose();
      this.splashParticles.material.dispose();
    }
    
    this.boundaries.forEach(boundary => {
      boundary.geometry.dispose();
      boundary.material.dispose();
    });
  }
  
  /**
   * Gets interactive environment elements near the player
   * @param {THREE.Vector3} position - Player position
   * @param {number} radius - Detection radius
   * @returns {Object|null} Environment object to interact with or null if none found
   */
  getEnvironmentInteractable(position, radius) {
    // No specific environment interactions in primordial stage yet
    // Will be expanded in future updates
    return null;
  }
  
  /**
   * Gets any nearby villages (not used in primordial stage)
   * @param {THREE.Vector3} position - Player position
   * @param {number} radius - Detection radius
   * @returns {Object|null} Village object or null if none found
   */
  getNearbyVillage(position, radius) {
    // No villages in primordial stage
    return null;
  }
  
  /**
   * Create an ethereal sound effect for awakening consciousness
   * @private
   */
  _playAwakeningSoundEffect() {
    try {
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const audioCtx = new AudioContext();
      
      // Create oscillators for chord
      const oscillators = [];
      const gainNodes = [];
      
      // Create frequencies for an ethereal chord
      const frequencies = [196.0, 293.7, 392.0, 493.9]; // G, D, G, B - an open G chord
      
      // Create oscillators and connect them
      frequencies.forEach((freq, i) => {
        // Create oscillator
        const oscillator = audioCtx.createOscillator();
        oscillator.type = i % 2 === 0 ? 'sine' : 'triangle';
        oscillator.frequency.value = freq;
        
        // Create gain node for envelope
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0;
        
        // Connect oscillator to gain node
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // Store for later use
        oscillators.push(oscillator);
        gainNodes.push(gainNode);
        
        // Start oscillator
        oscillator.start();
        
        // Fade in
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.5 + (i * 0.2));
        
        // Fade out after delay
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 2.5 + (i * 0.3));
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 4 + (i * 0.5));
        
        // Schedule stop
        setTimeout(() => {
          oscillator.stop();
        }, 6000);
      });
      
      // Add a gentle frequency sweep for mystical effect
      const sweepOsc = audioCtx.createOscillator();
      sweepOsc.type = 'sine';
      sweepOsc.frequency.value = 600;
      
      // Create filter for sweep
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      filter.Q.value = 10;
      
      // Connect sweep through filter
      const sweepGain = audioCtx.createGain();
      sweepGain.gain.value = 0;
      
      sweepOsc.connect(filter);
      filter.connect(sweepGain);
      sweepGain.connect(audioCtx.destination);
      
      // Sweep the frequency
      sweepOsc.frequency.setValueAtTime(600, audioCtx.currentTime);
      sweepOsc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 3);
      
      // Fade in and out
      sweepGain.gain.setValueAtTime(0, audioCtx.currentTime);
      sweepGain.gain.linearRampToValueAtTime(0.03, audioCtx.currentTime + 0.3);
      sweepGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3);
      
      // Start and stop sweep
      sweepOsc.start();
      setTimeout(() => {
        sweepOsc.stop();
      }, 3500);
    } catch (error) {
      console.warn('Could not create awakening sound effect:', error);
    }
  }
}