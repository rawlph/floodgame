import * as THREE from 'three';

/**
 * Resource entity that can be collected by the player
 */
export default class Resource {
  /**
   * Initialize a resource
   * @param {string} type - Resource type (energy, material, supply)
   * @param {Object} position - Position {x, y, z} to place resource
   * @param {Object} options - Additional options (size, value, color)
   */
  constructor(type, position, options = {}) {
    this.type = type || 'energy'; // Default to energy
    this.value = options.value || 1;
    this.collected = false;
    this.mesh = null;
    this.createMesh(position, options);
  }
  
  /**
   * Creates the 3D mesh for the resource
   * @param {Object} position - Position to place resource
   * @param {Object} options - Visual options
   */
  createMesh(position, options = {}) {
    let geometry, material;
    const size = options.size || 0.2;
    
    // Different visuals based on resource type
    switch(this.type) {
      case 'energy': // Primordial stage resource
        geometry = new THREE.IcosahedronGeometry(size, 0);
        material = new THREE.MeshStandardMaterial({
          color: options.color || 0x00ffaa,
          emissive: 0x003322,
          roughness: 0.4,
          metalness: 0.3
        });
        break;
        
      case 'material': // Prehistoric stage resource
        geometry = new THREE.OctahedronGeometry(size, 0);
        material = new THREE.MeshStandardMaterial({
          color: options.color || 0xcc8855,
          emissive: 0x221100,
          roughness: 0.7,
          metalness: 0.1
        });
        break;
        
      case 'supply': // Ordered world stage resource
        geometry = new THREE.BoxGeometry(size, size, size);
        material = new THREE.MeshStandardMaterial({
          color: options.color || 0x5588ff,
          emissive: 0x112233,
          roughness: 0.3,
          metalness: 0.5
        });
        break;
    }
    
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Set position
    if (position) {
      this.mesh.position.set(
        position.x || 0,
        position.y || 0.3,
        position.z || 0
      );
    }
    
    // Add small point light for glow effect
    const light = new THREE.PointLight(material.color, 0.6, 1.5);
    light.intensity = 0.6;
    this.mesh.add(light);
    
    // Add identifier for raycasting
    this.mesh.userData.type = 'resource';
    this.mesh.userData.resourceId = this.id;
  }
  
  /**
   * Handle resource collection
   * @returns {number} Value of the collected resource
   */
  collect() {
    if (this.collected) return 0;
    
    this.collected = true;
    
    // Animation for collection
    this.playCollectionAnimation();
    
    return this.value;
  }
  
  /**
   * Play collection animation
   */
  playCollectionAnimation() {
    // Scale down
    const duration = 0.5; // seconds
    const startTime = Date.now();
    const initialScale = this.mesh.scale.clone();
    
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      
      // Scale down and fade out
      const scale = 1 - progress;
      this.mesh.scale.set(
        initialScale.x * scale,
        initialScale.y * scale,
        initialScale.z * scale
      );
      
      // Make it glow brighter as it disappears
      if (this.mesh.children[0] && this.mesh.children[0].isLight) {
        this.mesh.children[0].intensity = 0.6 + (progress * 1.4);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Remove from scene after animation
        if (this.mesh.parent) {
          this.mesh.parent.remove(this.mesh);
        }
        
        // Dispose geometries and materials
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
      }
    };
    
    animate();
  }
  
  /**
   * Updates the resource each frame
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (this.collected || !this.mesh) return;
    
    // Floating animation
    this.mesh.position.y = this.mesh.position.y + (Math.sin(Date.now() * 0.003) * 0.0015);
    
    // Slow rotation
    this.mesh.rotation.y += 0.01 * deltaTime;
    
    // Type-specific effects
    switch(this.type) {
      case 'energy':
        // Pulse light intensity
        if (this.mesh.children[0] && this.mesh.children[0].isLight) {
          this.mesh.children[0].intensity = 0.6 + (Math.sin(Date.now() * 0.005) * 0.2);
        }
        break;
        
      case 'material':
        // Slight bobbing
        this.mesh.position.y = this.mesh.position.y + (Math.sin(Date.now() * 0.001) * 0.001);
        break;
        
      case 'supply':
        // Organized rotation
        this.mesh.rotation.x += 0.005 * deltaTime;
        break;
    }
  }
  
  /**
   * Dispose of resource when no longer needed
   */
  dispose() {
    if (this.mesh) {
      if (this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
      
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      
      if (this.mesh.material) {
        this.mesh.material.dispose();
      }
    }
  }
}

/**
 * Factory method to create a resource appropriate for the stage
 * @param {string} stage - Current game stage
 * @param {Object} position - Position for the resource
 * @param {Object} options - Additional options
 * @returns {Resource} - Appropriate resource for stage
 */
export function createResourceForStage(stage, position, options = {}) {
  switch(stage) {
    case 'primordial':
      return new Resource('energy', position, {
        color: 0x00ffaa,
        size: 0.15 + (Math.random() * 0.1),
        value: 1,
        ...options
      });
      
    case 'prehistoric':
      return new Resource('material', position, {
        color: 0xcc8855,
        size: 0.2 + (Math.random() * 0.15),
        value: 1,
        ...options
      });
      
    case 'ordered':
      return new Resource('supply', position, {
        color: 0x5588ff,
        size: 0.25 + (Math.random() * 0.15),
        value: 1,
        ...options
      });
      
    default:
      return new Resource('energy', position, options);
  }
} 