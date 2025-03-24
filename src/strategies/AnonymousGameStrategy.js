// src/strategies/AnonymousGameStrategy.js
import GameStrategy from "./GameStrategy";
import apiService from "../services/apiService";
import config from "../config";

/**
 * Game strategy for anonymous users
 * Handles game initialization, continuation, and abandonment for users who are not logged in
 */
class AnonymousGameStrategy extends GameStrategy {
  /**
   * Initialize a new game for anonymous user
   * @param {Object} options Game options
   * @returns {Promise<Object>} Result object with success flag and game data
   */
  async initializeGame(options = {}) {
    try {
      console.log(
        "AnonymousGameStrategy: Starting new game with options:",
        options,
      );

      // Clear any existing game ID first
      localStorage.removeItem("uncrypt-game-id");

      // Start game via API Service
      const gameData = await apiService.startGame(options);

      // Store game ID if available
      if (gameData?.game_id) {
        localStorage.setItem("uncrypt-game-id", gameData.game_id);
      }

      return {
        success: true,
        gameData,
        anonymous: true,
      };
    } catch (error) {
      console.error("AnonymousGameStrategy: Error starting game:", error);
      return {
        success: false,
        error,
        anonymous: true,
      };
    }
  }

  /**
   * Anonymous users can't continue games between sessions
   * This always returns false with appropriate message
   */
  async continueGame() {
    console.log(
      "AnonymousGameStrategy: Anonymous users cannot continue games between sessions",
    );
    return {
      success: false,
      reason: "anonymous-user",
      message: "Anonymous users cannot continue games between sessions",
    };
  }

  /**
   * Abandon the current game - for anonymous users this just clears local storage
   */
  async abandonGame() {
    console.log(
      "AnonymousGameStrategy: Abandoning anonymous game (clearing local storage)",
    );
    localStorage.removeItem("uncrypt-game-id");
    return { success: true };
  }

  /**
   * Check if anonymous user has an active game
   * Always returns false since we don't track anonymous games between sessions
   */
  async checkActiveGame() {
    return {
      hasActiveGame: false,
      anonymous: true,
    };
  }

  /**
   * Determine if this strategy applies to the current user
   * @returns {boolean} True if user is anonymous
   */
  isApplicable() {
    // User is anonymous if there's no auth token
    const token = config.session.getAuthToken();
    return !token;
  }
}

export default AnonymousGameStrategy;
