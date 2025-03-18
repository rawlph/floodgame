// Feedback message system for the game
// Message categorization and handling

// Message categories with display properties
const MESSAGE_CATEGORIES = {
  CRITICAL: { color: '#ff5555', duration: 3000, fontSize: '22px', priority: 0 },
  ACHIEVEMENT: { color: '#ffdd00', duration: 3000, fontSize: '22px', priority: 1 },
  INTERACTION: { color: '#00ffaa', duration: 2000, fontSize: '18px', priority: 2 },
  RESOURCE: { color: '#00ff88', duration: 1500, fontSize: '16px', priority: 3 },
  INFO: { color: '#88aacc', duration: 2000, fontSize: '16px', priority: 4 }
};

// Message queue for prioritized display
const messageQueue = [];

// Track if currently showing a message
let isShowingMessage = false;

// Track recent messages to prevent duplicates
const recentMessages = new Map();
const MESSAGE_THROTTLE_TIME = 3000; // Only show similar messages once every 3 seconds

/**
 * Show a feedback message to the player
 * @param {string} message - Message text to display
 * @param {string} colorOrCategory - Color code or predefined category
 * @param {Object} options - Additional options (position, duration, etc)
 */
const showDebugMessage = (message, colorOrCategory = 'INFO', options = {}) => {
  // Get current timestamp
  const now = Date.now();
  
  // Determine message category and properties
  let category, color, duration, fontSize, priority;
  
  if (MESSAGE_CATEGORIES[colorOrCategory]) {
    // Use predefined category
    ({ color, duration, fontSize, priority } = MESSAGE_CATEGORIES[colorOrCategory]);
    category = colorOrCategory;
  } else {
    // Use custom color and default settings
    color = colorOrCategory;
    duration = options.duration || 2000;
    fontSize = options.fontSize || '18px';
    priority = options.priority || 5; // Lower priority than predefined categories
    category = 'CUSTOM';
  }
  
  // Check if this is a duplicate message or similar to recent ones
  const similarKey = `${category}:${message}`;
  if (recentMessages.has(similarKey)) {
    const lastShown = recentMessages.get(similarKey);
    if (now - lastShown < MESSAGE_THROTTLE_TIME) {
      // Skip duplicate message that was shown recently
      return;
    }
  }
  
  // Update the timestamp for this message
  recentMessages.set(similarKey, now);
  
  // Clean up old messages from tracking
  for (const [key, timestamp] of recentMessages.entries()) {
    if (now - timestamp > MESSAGE_THROTTLE_TIME * 2) {
      recentMessages.delete(key);
    }
  }
  
  // Add message to queue with priority
  messageQueue.push({
    message,
    color,
    duration,
    fontSize,
    priority,
    options,
    timestamp: now
  });
  
  // Sort queue by priority (lower numbers first)
  messageQueue.sort((a, b) => a.priority - b.priority);
  
  // If not already showing a message, show this one
  if (!isShowingMessage) {
    processMessageQueue();
  }
};

/**
 * Process messages in queue, respecting priority
 */
const processMessageQueue = () => {
  if (messageQueue.length === 0) {
    isShowingMessage = false;
    return;
  }
  
  isShowingMessage = true;
  
  // Get highest priority message (already sorted by priority)
  const { message, color, duration, fontSize, options, timestamp } = messageQueue.shift();
  
  // Message age - don't show messages that have been queued too long
  const now = Date.now();
  const messageAge = now - timestamp;
  if (messageAge > 3000) {
    // Skip old messages and process next
    processMessageQueue();
    return;
  }
  
  // Create message element with improved styling
  const messageEl = document.createElement('div');
  messageEl.textContent = message;
  
  // Set base styles
  messageEl.style.position = 'absolute';
  messageEl.style.color = color;
  messageEl.style.fontWeight = 'bold';
  messageEl.style.fontSize = fontSize;
  messageEl.style.textShadow = '0 0 3px rgba(0,0,0,0.9)';
  messageEl.style.zIndex = '1000';
  messageEl.style.opacity = '0';
  messageEl.style.transition = 'all 0.3s ease-in-out';
  messageEl.style.backgroundColor = 'rgba(0,0,0,0.5)';
  messageEl.style.padding = '8px 16px';
  messageEl.style.borderRadius = '5px';
  messageEl.style.pointerEvents = 'none';
  messageEl.style.width = 'auto';
  messageEl.style.maxWidth = '80%';
  messageEl.style.boxSizing = 'border-box';
  messageEl.style.whiteSpace = 'pre-wrap';
  messageEl.style.textAlign = 'center';
  
  // Position message based on category or options
  const position = options.position || 'bottom';
  
  switch (position) {
    case 'top':
      messageEl.style.top = '15%';
      messageEl.style.left = '50%';
      messageEl.style.transform = 'translate(-50%, 0)';
      break;
    case 'bottom':
      messageEl.style.bottom = '15%';
      messageEl.style.left = '50%';
      messageEl.style.transform = 'translate(-50%, 0)';
      break;
    case 'center':
      messageEl.style.top = '50%';
      messageEl.style.left = '50%';
      messageEl.style.transform = 'translate(-50%, -50%)';
      break;
    default:
      messageEl.style.bottom = '15%';
      messageEl.style.left = '50%';
      messageEl.style.transform = 'translate(-50%, 0)';
  }
  
  // Add to DOM
  document.body.appendChild(messageEl);
  
  // Fade in
  setTimeout(() => {
    messageEl.style.opacity = '1';
  }, 10);
  
  // Fade out after specified duration
  setTimeout(() => {
    messageEl.style.opacity = '0';
    messageEl.style.transform += ' translateY(-20px)';
  }, duration);
  
  // Remove after animation and process next message
  setTimeout(() => {
    if (messageEl.parentNode) {
      document.body.removeChild(messageEl);
    }
    processMessageQueue(); // Process next message in queue
  }, duration + 300);
};

/**
 * Convenience methods for common message types
 */
showDebugMessage.critical = (message, options = {}) => showDebugMessage(message, 'CRITICAL', options);
showDebugMessage.achievement = (message, options = {}) => showDebugMessage(message, 'ACHIEVEMENT', options);
showDebugMessage.interaction = (message, options = {}) => showDebugMessage(message, 'INTERACTION', options);
showDebugMessage.resource = (message, options = {}) => showDebugMessage(message, 'RESOURCE', options);
showDebugMessage.info = (message, options = {}) => showDebugMessage(message, 'INFO', options);

export default showDebugMessage; 