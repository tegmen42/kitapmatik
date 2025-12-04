// Badges module - placeholder file
// Global function for script tag usage (no export needed)
// This file provides getBadges() function that returns the badges array
// The badges array is defined in the HTML file, so we just provide access to it
(function() {
  'use strict';
  
  // Global getBadges function
  // Returns the badges array if it exists, otherwise returns empty array
  window.getBadges = function() {
    // Check if badges is already defined in the global scope (from HTML)
    if (typeof badges !== 'undefined' && Array.isArray(badges)) {
      return badges;
    }
    
    // Fallback: return empty array if badges is not defined
    return [];
  };
})();

