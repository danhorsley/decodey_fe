// src/strategies/GameStrategy.js
/**
 * Game Strategy Interface
 *
 * This defines the contract that all game strategies must implement.
 * Each strategy handles game initialization, continuation, and abandonment
 * for different user types (anonymous, authenticated) or game modes (daily, custom).
 */

/**
 * Base class representing a game initialization strategy
 * All concrete strategies should implement these methods
 */
class GameStrategy {
  /**
   * Initialize a new game
   * @param {Object} options Game options like difficulty, hardcore mode, etc.
   * @returns {Promise<Object>} Result object with success flag and game data
   */
  async initializeGame(options = {}) {
    throw new Error(
      "initializeGame must be implemented by concrete strategies",
    );
  }

  /**
   * Continue an existing game
   * @returns {Promise<Object>} Result object with success flag and game data
   */
  async continueGame() {
    throw new Error("continueGame must be implemented by concrete strategies");
  }

  /**
   * Abandon the current game
   * @returns {Promise<Object>} Result with success flag
   */
  async abandonGame() {
    throw new Error("abandonGame must be implemented by concrete strategies");
  }

  /**
   * Check if a user has an active game
   * @returns {Promise<Object>} Result with hasActiveGame flag and game stats if available
   */
  async checkActiveGame() {
    throw new Error(
      "checkActiveGame must be implemented by concrete strategies",
    );
  }

  /**
   * Determine if this strategy is applicable for the current user/context
   * @returns {boolean} True if this strategy should be used
   */
  isApplicable() {
    throw new Error("isApplicable must be implemented by concrete strategies");
  }
}

export default GameStrategy;
