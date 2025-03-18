import * as THREE from 'three';

/**
 * Manages a third-person camera that follows the player entity
 */
export default class CameraController {
  /**
   * Initialize the camera controller
   * @param {THREE.PerspectiveCamera} camera - The Three.js camera
   * @param {Object} targetObject - The object to follow (typically player)
   * @param {Object} options - Configuration options
   */
  constructor(camera, targetObject, options = {}) {
    this.camera = camera;
    this.target = targetObject;
    
    // Default configuration
    this.config = {
      distance: options.distance || 5, // Distance behind target
      height: options.height || 2,     // Height above target
      lerp: options.lerp || 0.1,       // Smoothness of camera movement (0-1)
      minDistance: options.minDistance || 2,
      maxDistance: options.maxDistance || 10
    };
    
    // Set initial offset
    this.offset = new THREE.Vector3(
      0,
      this.config.height,
      this.config.distance
    );
    
    // Create a dummy object to track position slightly ahead of target
    this.lookAtTarget = new THREE.Object3D();
  }
  
  /**
   * Updates camera position based on target movement
   */
  update() {
    if (!this.target || !this.target.position) return;
    
    // Position lookAt point slightly ahead of target
    this.lookAtTarget.position.copy(this.target.position);
    this.lookAtTarget.position.y += this.config.height * 0.5;
    
    // Calculate ideal camera position
    const idealPosition = new THREE.Vector3();
    idealPosition.copy(this.target.position);
    idealPosition.add(this.offset);
    
    // Smoothly interpolate current camera position toward ideal position
    this.camera.position.lerp(idealPosition, this.config.lerp);
    
    // Make camera look at target
    this.camera.lookAt(this.lookAtTarget.position);
  }
  
  /**
   * Adjust camera distance (zoom)
   * @param {number} delta - Amount to change distance
   */
  zoom(delta) {
    this.config.distance = THREE.MathUtils.clamp(
      this.config.distance + delta,
      this.config.minDistance,
      this.config.maxDistance
    );
    
    this.offset.z = this.config.distance;
  }
  
  /**
   * Set the stage-specific camera parameters
   * @param {string} stage - Current game stage
   */
  configureForStage(stage) {
    switch(stage) {
      case 'primordial':
        // Close camera, limited visibility
        this.config.distance = 3;
        this.config.height = 1.5;
        this.config.maxDistance = 5;
        break;
        
      case 'prehistoric':
        // Medium distance, better visibility
        this.config.distance = 5;
        this.config.height = 3;
        this.config.maxDistance = 8;
        break;
        
      case 'ordered':
        // Far view to show village environment
        this.config.distance = 7;
        this.config.height = 4;
        this.config.maxDistance = 12;
        break;
    }
    
    this.offset.y = this.config.height;
    this.offset.z = this.config.distance;
  }
} 