import * as THREE from 'three';

/**
 * Sets up the ThreeJS renderer with optimizations for mobile devices
 * @returns {THREE.WebGLRenderer} Configured WebGL renderer
 */
export function setupRenderer() {
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: 'high-performance',
    precision: 'mediump'
  });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limits pixel ratio for performance
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
  
  document.body.appendChild(renderer.domElement);
  
  // Handle window resize
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  return renderer;
}

/**
 * Creates a responsive camera that adjusts to window size
 * @param {number} fov Field of view
 * @returns {THREE.PerspectiveCamera} Configured camera
 */
export function createCamera(fov = 75) {
  const camera = new THREE.PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  
  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
  
  return camera;
} 