// src/apiService.js

import config from './config';

/**
 * Centralized API service to handle all API calls consistently
 */
class ApiService {
  /**
   * Make a fetch request with consistent error handling and headers
   * 
   * @param {string} endpoint - API endpoint (without the base URL)
   * @param {Object} options - Fetch options
   * @returns {Promise} - Promise that resolves to the response data
   */
  async fetchApi(endpoint, options = {}) {
    const { apiUrl, DEBUG } = config;
    
    // Get game ID from localStorage
    const gameId = localStorage.getItem('uncrypt-game-id');
    
    // Default headers
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    
    // Add game ID to headers if available
    if (gameId) {
      headers['X-Game-Id'] = gameId;
    }
    
    // Default options
    const fetchOptions = {
      ...options,
      headers,
      credentials: 'include', // Always include credentials
      mode: 'cors'
    };
    
    // Handle request body if it exists
    if (options.body && typeof options.body === 'object') {
      // Add game_id to the body for endpoints that need it
      const body = { ...options.body };
      if (gameId && !body.game_id) {
        body.game_id = gameId;
      }
      fetchOptions.body = JSON.stringify(body);
    }
    
    // Log request for debugging
    if (DEBUG) {
      console.log(`[API] ${options.method || 'GET'} ${endpoint}`, {
        headers: fetchOptions.headers,
        body: fetchOptions.body
      });
    }
    
    try {
      // Make the request
      const response = await fetch(`${apiUrl}${endpoint}`, fetchOptions);
      
      // Log response headers for debugging
      if (DEBUG) {
        console.log(`[API] Response status:`, response.status);
        console.log(`[API] Response headers:`, Object.fromEntries([...response.headers]));
      }
      
      // Check if the response is ok (status 200-299)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Parse the response as JSON
      const data = await response.json();
      
      // Log response data for debugging
      if (DEBUG) {
        console.log(`[API] Response data:`, data);
      }
      
      // Save game ID from response if available
      if (data.game_id) {
        localStorage.setItem('uncrypt-game-id', data.game_id);
        if (DEBUG) {
          console.log(`[API] Saved game ID to localStorage:`, data.game_id);
        }
      }
      
      return data;
    } catch (error) {
      // Log errors for debugging
      console.error(`[API] Error in ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Start a new game
   * 
   * @returns {Promise} - Promise that resolves to the game data
   */
  startGame() {
    return this.fetchApi('/start', {
      method: 'GET'
    });
  }
  
  /**
   * Submit a guess
   * 
   * @param {string} encryptedLetter - The encrypted letter
   * @param {string} guessedLetter - The guessed letter
   * @returns {Promise} - Promise that resolves to the guess response
   */
  submitGuess(encryptedLetter, guessedLetter) {
    return this.fetchApi('/guess', {
      method: 'POST',
      body: {
        encrypted_letter: encryptedLetter,
        guessed_letter: guessedLetter.toUpperCase()
      }
    });
  }
  
  /**
   * Get a hint
   * 
   * @returns {Promise} - Promise that resolves to the hint response
   */
  getHint() {
    return this.fetchApi('/hint', {
      method: 'POST',
      body: {}  // Empty body but needed for consistency
    });
  }
  
  /**
   * Get quote attribution
   * 
   * @returns {Promise} - Promise that resolves to the attribution data
   */
  /**
   * Get quote attribution
   * 
   * @returns {Promise} - Promise that resolves to the attribution data
   */
  getAttribution() {
    // Get game ID from localStorage
    const gameId = localStorage.getItem('uncrypt-game-id');
    
    // Construct URL with game_id as a query parameter if available
    const endpoint = gameId 
      ? `/get_attribution?game_id=${encodeURIComponent(gameId)}`
      : '/get_attribution';
      
    return this.fetchApi(endpoint, {
      method: 'GET'
    }).catch(error => {
      console.error('Error fetching attribution:', error);
      // Return a default value on error to avoid breaking the UI
      return {
        major_attribution: '',
        minor_attribution: ''
      };
    });
  }
  
  /**
   * Save a quote to the curated list
   * 
   * @returns {Promise} - Promise that resolves to the save response
   */
  saveQuote() {
    return this.fetchApi('/save_quote', {
      method: 'POST',
      body: {}  // Empty body but needed for consistency
    });
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;