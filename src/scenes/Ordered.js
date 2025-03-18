import * as THREE from 'three';
import { createResourceForStage } from '../entities/Resource.js';

/**
 * Third stage: Ordered World scene
 */
export default class Ordered {
  /**
   * Initialize ordered world scene
   * @param {Object} game - Game instance
   * @param {Object} config - Stage configuration
   */
  constructor(game, config) {
    this.game = game;
    this.config = config;
    this.resources = [];
    this.villages = [];
    this.floodWarningActive = false;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x5588cc);
    
    // Clear visibility with minimal fog
    this.scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
    
    this._setupLights();
    this._setupEnvironment();
    this._spawnResources();
    this._createVillages();
    
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
    // Bright ambient light for ordered world
    const ambient = new THREE.AmbientLight(this.config.ambientLight, 0.7);
    this.scene.add(ambient);
    
    // Main directional light (sun)
    const directional = new THREE.DirectionalLight(this.config.directionalLight, 1.0);
    directional.position.set(3, 12, 4);
    directional.castShadow = true;
    
    // Shadow settings for mobile optimization
    directional.shadow.mapSize.width = 1024;
    directional.shadow.mapSize.height = 1024;
    directional.shadow.camera.near = 1;
    directional.shadow.camera.far = 50;
    directional.shadow.camera.left = -20;
    directional.shadow.camera.right = 20;
    directional.shadow.camera.top = 20;
    directional.shadow.camera.bottom = -20;
    
    this.scene.add(directional);
    
    // Hemisphere light for better environmental lighting
    const hemisphere = new THREE.HemisphereLight(0x88bbff, 0x556644, 0.4);
    this.scene.add(hemisphere);
  }
  
  /**
   * Set up ground and environment
   * @private
   */
  _setupEnvironment() {
    this._createTerrain();
    this._createTrees();
    this._createRiver();
    this._createPaths();
    
    // Add boundary to prevent player from leaving area
    this._createBoundary();
  }
  
  /**
   * Create terrain with varied elevations
   * @private
   */
  _createTerrain() {
    // Ground plane
    const terrainGeometry = new THREE.PlaneGeometry(100, 100, 64, 64);
    
    // Create height variations for terrain
    const positionAttribute = terrainGeometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    
    // Create a heightmap with rolling hills and flat village areas
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      
      // Base noise for natural terrain
      const nx = Math.sin(vertex.x * 0.1);
      const ny = Math.sin(vertex.y * 0.1);
      const noise = nx * ny * 0.5;
      
      // Make specific flat areas for villages
      const villageLocations = [
        { x: -20, z: -15, radius: 8 },
        { x: 15, z: 10, radius: 10 },
        { x: 0, z: -25, radius: 7 }
      ];
      
      // Check if point is in a village area
      let inVillage = false;
      let villageBlend = 1.0;
      
      for (const village of villageLocations) {
        const dx = vertex.x - village.x;
        const dy = vertex.y - village.z;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < village.radius * village.radius) {
          // Inside village - make flat
          inVillage = true;
          // Smooth transition at edges
          const dist = Math.sqrt(distSq);
          const edgeDist = village.radius - dist;
          const blendFactor = Math.min(1.0, edgeDist / 2.0);
          villageBlend = Math.min(villageBlend, 1.0 - blendFactor);
        }
      }
      
      // Calculate final height
      if (inVillage) {
        vertex.z = 0.1 + (noise * villageBlend * 0.3);
      } else {
        // Add medium hills for non-village areas
        vertex.z = 0.5 + noise;
      }
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    // Update normals for correct lighting
    terrainGeometry.computeVertexNormals();
    
    // Terrain material with grass texture
    const terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0x669944,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    
    this.terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
    
    // Store village locations for later use
    this.villageLocations = [
      { x: -20, z: -15, radius: 8 },
      { x: 15, z: 10, radius: 10 },
      { x: 0, z: -25, radius: 7 }
    ];
  }
  
  /**
   * Create trees and vegetation
   * @private
   */
  _createTrees() {
    // Add various trees around the landscape (avoiding villages)
    const treeCount = 40;
    this.trees = [];
    
    for (let i = 0; i < treeCount; i++) {
      // Create random position
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      
      // Skip if inside a village area
      let inVillage = false;
      for (const village of this.villageLocations) {
        const dx = x - village.x;
        const dz = z - village.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < (village.radius + 2) * (village.radius + 2)) {
          inVillage = true;
          break;
        }
      }
      
      if (inVillage) {
        continue;
      }
      
      // Create tree
      const tree = this._createTree(x, z);
      this.trees.push(tree);
      this.scene.add(tree);
    }
  }
  
  /**
   * Create a single tree
   * @private
   * @param {number} x - X position
   * @param {number} z - Z position
   * @returns {THREE.Group} - Tree object
   */
  _createTree(x, z) {
    const tree = new THREE.Group();
    
    // Trunk
    const trunkHeight = 1.0 + Math.random() * 0.5;
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Brown
      roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);
    
    // Foliage (cone for simplicity)
    const foliageHeight = 2.0 + Math.random() * 1.0;
    const foliageGeometry = new THREE.ConeGeometry(1.0, foliageHeight, 8);
    const foliageMaterial = new THREE.MeshStandardMaterial({
      color: 0x228833,
      roughness: 0.8
    });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = trunkHeight + foliageHeight / 2 - 0.2;
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    tree.add(foliage);
    
    // Position the tree
    tree.position.set(x, 0, z);
    
    return tree;
  }
  
  /**
   * Create river flowing through the scene
   * @private
   */
  _createRiver() {
    // Create a winding river across the terrain
    const riverWidth = 5;
    const riverDepth = 0.3;
    
    // River path points
    const riverPoints = [
      new THREE.Vector3(-50, -0.2, -40),
      new THREE.Vector3(-30, -0.2, -20),
      new THREE.Vector3(-10, -0.2, -10),
      new THREE.Vector3(10, -0.2, 0),
      new THREE.Vector3(30, -0.2, 15),
      new THREE.Vector3(50, -0.2, 30)
    ];
    
    const riverCurve = new THREE.CatmullRomCurve3(riverPoints);
    const riverGeometry = new THREE.TubeGeometry(riverCurve, 64, riverWidth, 8, false);
    
    const riverMaterial = new THREE.MeshStandardMaterial({
      color: 0x3399ff,
      transparent: true,
      opacity: 0.8,
      metalness: 0.7,
      roughness: 0.2
    });
    
    this.river = new THREE.Mesh(riverGeometry, riverMaterial);
    this.river.receiveShadow = true;
    this.scene.add(this.river);
  }
  
  /**
   * Create paths connecting villages
   * @private
   */
  _createPaths() {
    // Create paths between villages
    this.paths = new THREE.Group();
    
    // For each pair of villages, create a path
    for (let i = 0; i < this.villageLocations.length; i++) {
      for (let j = i + 1; j < this.villageLocations.length; j++) {
        const village1 = this.villageLocations[i];
        const village2 = this.villageLocations[j];
        
        const start = new THREE.Vector3(village1.x, 0.11, village1.z);
        const end = new THREE.Vector3(village2.x, 0.11, village2.z);
        
        // Create a path curve
        const midPoint = new THREE.Vector3()
          .addVectors(start, end)
          .divideScalar(2);
        
        // Add slight curve to path
        const control = midPoint.clone();
        control.x += (Math.random() - 0.5) * 10;
        control.z += (Math.random() - 0.5) * 10;
        
        const pathPoints = [
          start,
          control,
          end
        ];
        
        const pathCurve = new THREE.QuadraticBezierCurve3(start, control, end);
        const pathGeometry = new THREE.TubeGeometry(pathCurve, 32, 0.8, 8, false);
        
        const pathMaterial = new THREE.MeshStandardMaterial({
          color: 0xddbb88,
          roughness: 1.0,
          metalness: 0.0
        });
        
        const path = new THREE.Mesh(pathGeometry, pathMaterial);
        path.receiveShadow = true;
        this.paths.add(path);
      }
    }
    
    this.scene.add(this.paths);
  }
  
  /**
   * Create boundary to prevent player from leaving area
   * @private
   */
  _createBoundary() {
    // Invisible collision boundary
    const boundarySize = 45;
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
   * Create villages in predetermined locations
   * @private
   */
  _createVillages() {
    // Create visual representation for each village
    this.villageData = this.villageLocations.map((location, index) => {
      const village = this._createVillageStructures(location.x, location.z, location.radius, index);
      this.scene.add(village.group);
      
      return {
        ...location,
        group: village.group,
        houses: village.houses,
        cooperation: 0.5, // Initial cooperation level
        resources: 5 + index * 2, // Starting resources
        defense: 0, // Defense against flood
        consciousness: index === 2 ? 0.8 : 0.5, // Last village has higher consciousness
        id: index
      };
    });
  }
  
  /**
   * Create visual structures for a village
   * @private
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {number} radius - Village radius
   * @param {number} index - Village index for variation
   * @returns {Object} - Village structures
   */
  _createVillageStructures(x, z, radius, index) {
    const villageGroup = new THREE.Group();
    villageGroup.position.set(x, 0, z);
    
    const houses = [];
    const houseCount = 6 + Math.floor(radius * 0.8);
    
    // Create circle of houses
    for (let i = 0; i < houseCount; i++) {
      const angle = (i / houseCount) * Math.PI * 2;
      const houseRadius = radius * 0.7;
      const houseX = Math.cos(angle) * houseRadius;
      const houseZ = Math.sin(angle) * houseRadius;
      
      // Create a simple house
      const house = new THREE.Group();
      
      // Different house colors based on village type
      const houseColors = [
        0xaa8866, // Village 0: Brown
        0xddaa77, // Village 1: Tan
        0xbbccdd  // Village 2: Bluish
      ];
      
      const roofColors = [
        0x774422, // Village 0: Dark brown
        0xaa6633, // Village 1: Red-brown
        0x445566  // Village 2: Dark blue
      ];
      
      // Base/Walls
      const width = 1.0 + Math.random() * 0.5;
      const depth = 1.0 + Math.random() * 0.5;
      const height = 0.8 + Math.random() * 0.4;
      
      const baseGeometry = new THREE.BoxGeometry(width, height, depth);
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: houseColors[index],
        roughness: 0.8
      });
      
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = height / 2;
      base.castShadow = true;
      base.receiveShadow = true;
      house.add(base);
      
      // Roof
      const roofHeight = 0.6;
      const overhang = 0.2;
      
      const roofGeometry = new THREE.ConeGeometry(
        Math.sqrt(Math.pow(width + overhang, 2) + Math.pow(depth + overhang, 2)) / 2,
        roofHeight,
        4
      );
      
      const roofMaterial = new THREE.MeshStandardMaterial({
        color: roofColors[index],
        roughness: 0.9
      });
      
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = height + roofHeight / 2;
      roof.rotation.y = Math.PI / 4; // Orient the pyramid roof
      roof.castShadow = true;
      house.add(roof);
      
      // Position house
      house.position.set(houseX, 0, houseZ);
      
      // Random rotation
      house.rotation.y = Math.random() * Math.PI * 2;
      
      houses.push(house);
      villageGroup.add(house);
    }
    
    // Create central structure - simple placeholder
    const centerGeometry = new THREE.CylinderGeometry(1.5, 1.5, 2, 8);
    const centerMaterial = new THREE.MeshStandardMaterial({
      color: 0x999999
    });
    
    const centerStructure = new THREE.Mesh(centerGeometry, centerMaterial);
    centerStructure.position.y = 1;
    centerStructure.castShadow = true;
    centerStructure.receiveShadow = true;
    villageGroup.add(centerStructure);
    
    return { group: villageGroup, houses };
  }
  
  /**
   * Spawn supply resources around the scene
   * @private
   */
  _spawnResources() {
    // Initial resources
    const initialResourceCount = 25;
    
    for (let i = 0; i < initialResourceCount; i++) {
      // Create random position, avoiding villages and river
      let x, z;
      let validPosition = false;
      
      while (!validPosition) {
        x = (Math.random() - 0.5) * 90;
        z = (Math.random() - 0.5) * 90;
        
        // Check if inside a village
        let inVillage = false;
        for (const village of this.villageLocations || []) {
          if (!village) continue;
          const dx = x - village.x;
          const dz = z - village.z;
          const distSq = dx * dx + dz * dz;
          if (distSq < village.radius * village.radius) {
            inVillage = true;
            break;
          }
        }
        
        // If not in a village, position is valid
        if (!inVillage) {
          validPosition = true;
        }
      }
      
      const position = {
        x: x,
        y: 0.3 + Math.random() * 0.5, // Above ground
        z: z
      };
      
      const resource = createResourceForStage('ordered', position);
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
      if (Math.random() < 0.6) {
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
    // Spawn at a random location, avoiding villages
    let x, z;
    let validPosition = false;
    
    while (!validPosition) {
      x = (Math.random() - 0.5) * 90;
      z = (Math.random() - 0.5) * 90;
      
      // Check if inside a village
      let inVillage = false;
      for (const village of this.villageLocations) {
        const dx = x - village.x;
        const dz = z - village.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < village.radius * village.radius) {
          inVillage = true;
          break;
        }
      }
      
      // If not in a village, position is valid
      if (!inVillage) {
        validPosition = true;
      }
    }
    
    const position = {
      x: x,
      y: 0.3 + Math.random() * 0.5,
      z: z
    };
    
    const resource = createResourceForStage('ordered', position);
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
    return false;
  }
  
  /**
   * Handle village interaction
   * @param {THREE.Vector3} position - Player position
   * @param {Object} traits - Player traits
   * @param {Object} philosophicalTraits - Player philosophical traits
   * @returns {boolean} Whether interaction occurred
   */
  playerInteractWithVillage(position, traits, philosophicalTraits) {
    // Check if player is in a village
    const village = this._getVillageAtPosition(position);
    
    if (village) {
      // Simple interaction - contribute resources to village defense
      if (this.game.state.resources > 0) {
        // Apply cooperation trait and philosophical traits
        const cooperationBonus = traits.villageInfluence || 1.0;
        const compassionBonus = philosophicalTraits.compassion || 0.5;
        
        // Calculate total bonus
        const totalBonus = 1.0 + (cooperationBonus - 1.0) + (compassionBonus - 0.5);
        
        // Transfer resources (player loses 1, village gains more based on traits)
        this.game.state.resources -= 1;
        village.defense += 1 * totalBonus;
        
        // Show notification
        this.game.hud.showEvolutionNotification(
          'Village Cooperation',
          `Shared resources with Village ${village.id + 1}. Defense now ${Math.floor(village.defense)}`
        );
        
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if player is in a village
   * @param {THREE.Vector3} position - Player position
   * @returns {Object|null} - Village data or null if not in a village
   */
  _getVillageAtPosition(position) {
    for (const village of this.villageData || []) {
      if (!village) continue;
      const dx = position.x - village.x;
      const dz = position.z - village.z;
      const distSq = dx * dx + dz * dz;
      
      if (distSq < village.radius * village.radius) {
        return village;
      }
    }
    
    return null;
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
    
    // Check for collision with boundaries
    this._checkBoundaryCollision();
  }
  
  /**
   * Check and handle collision with boundaries
   * @private
   */
  _checkBoundaryCollision() {
    if (!this.game.state.player || !this.game.state.player.mesh) return;
    
    const playerPos = this.game.state.player.mesh.position;
    
    // Simple boundary check
    if (Math.abs(playerPos.x) > 44) {
      playerPos.x = Math.sign(playerPos.x) * 44;
    }
    
    if (Math.abs(playerPos.z) > 44) {
      playerPos.z = Math.sign(playerPos.z) * 44;
    }
  }
  
  /**
   * Show warning when flood is approaching
   */
  showFloodWarning() {
    if (this.floodWarningActive) return;
    
    this.floodWarningActive = true;
    
    // Begin water level rise
    this._createFloodWater();
  }
  
  /**
   * Create flood water
   * @private
   */
  _createFloodWater() {
    // Create water plane
    const waterGeometry = new THREE.PlaneGeometry(200, 200);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x3399ff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      metalness: 0.6,
      roughness: 0.2
    });
    
    this.floodWater = new THREE.Mesh(waterGeometry, waterMaterial);
    this.floodWater.rotation.x = -Math.PI / 2;
    this.floodWater.position.y = -10; // Start below ground
    this.scene.add(this.floodWater);
  }
  
  /**
   * Show survival animation when player has enough resources
   */
  showFloodSurvival() {
    // Create a visualization of village defenses holding back the flood
    this.villageData.forEach(village => {
      // Create defense barrier around each village
      const barrierGeometry = new THREE.CylinderGeometry(
        village.radius + 0.5, 
        village.radius + 0.5, 
        village.defense * 0.5,
        32
      );
      
      const barrierMaterial = new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        emissive: 0x2255aa,
        emissiveIntensity: 0.3
      });
      
      const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
      barrier.position.set(village.x, village.defense * 0.25, village.z);
      this.scene.add(barrier);
      
      // Animate barrier
      const startTime = Date.now();
      const duration = 5000;
      
      const animateBarrier = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) {
          const progress = elapsed / duration;
          
          // Pulse emission
          barrier.material.emissiveIntensity = 0.3 + (Math.sin(progress * Math.PI * 10) * 0.2);
          
          requestAnimationFrame(animateBarrier);
        }
      };
      
      animateBarrier();
    });
  }
  
  /**
   * Show failure animation when player doesn't have enough resources
   */
  showFloodFailure() {
    if (this.floodWater) {
      // Rapidly raise water
      const startTime = Date.now();
      const duration = 4000;
      const startY = this.floodWater.position.y;
      const targetY = 5; // Flood level
      
      const animateFlood = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) {
          const progress = elapsed / duration;
          this.floodWater.position.y = startY + (targetY - startY) * progress;
          
          // Make water more opaque as it rises
          this.floodWater.material.opacity = 0.7 + (progress * 0.3);
          
          requestAnimationFrame(animateFlood);
        }
      };
      
      animateFlood();
    }
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
    
    if (this.river) {
      this.river.geometry.dispose();
      this.river.material.dispose();
    }
    
    this.trees.forEach(tree => {
      // Dispose of all tree components
      tree.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    });
    
    this.villageData.forEach(village => {
      // Dispose of all village components
      if (village.group) {
        village.group.traverse(child => {
          if (child.isMesh) {
            child.geometry.dispose();
            child.material.dispose();
          }
        });
      }
    });
    
    this.boundaries.forEach(boundary => {
      boundary.geometry.dispose();
      boundary.material.dispose();
    });
    
    if (this.floodWater) {
      this.floodWater.geometry.dispose();
      this.floodWater.material.dispose();
    }
  }
  
  /**
   * Gets interactive environment elements near the player
   * @param {THREE.Vector3} position - Player position
   * @param {number} radius - Detection radius
   * @returns {Object|null} Environment object to interact with or null if none found
   */
  getEnvironmentInteractable(position, radius) {
    // Check for tree interactions
    for (const tree of this.trees) {
      const treePos = tree.position;
      const distance = position.distanceTo(treePos);
      if (distance < radius) {
        return {
          type: 'tree',
          object: tree,
          position: treePos.clone()
        };
      }
    }
    
    return null;
  }
  
  /**
   * Gets any nearby village for interaction
   * @param {THREE.Vector3} position - Player position
   * @param {number} radius - Detection radius
   * @returns {Object|null} Village object or null if none found
   */
  getNearbyVillage(position, radius) {
    const village = this._getVillageAtPosition(position);
    if (village) {
      return {
        type: 'village',
        data: village,
        position: new THREE.Vector3(village.x, 0, village.z)
      };
    }
    return null;
  }

  /**
   * Get the will to live object (not used in ordered stage)
   * @returns {THREE.Object3D|null} Always returns null in ordered stage
   */
  getWillToLiveObject() {
    // No will to live object in ordered stage (already found in primordial)
    return null;
  }
  
  /**
   * Handle when player finds will to live (not used in ordered stage)
   * This is implemented for API compatibility with Primordial stage
   */
  onWillToLiveFound() {
    // No action needed - will-to-live is already found in ordered stage
    return;
  }
} 