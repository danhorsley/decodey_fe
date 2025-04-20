// src/strategies/GameStrategyFactory.js
import AnonymousGameStrategy from "./AnonymousGameStrategy";
import AuthenticatedGameStrategy from "./AuthenticatedGameStrategy";
import AnonymousDailyStrategy from "./AnonymousDailyStrategy";
import AuthenticatedDailyStrategy from "./AuthenticatedDailyStrategy";

/**
 * Factory class for creating appropriate game strategy instances
 * This centralizes the logic for determining which strategy to use based on user state
 */
class GameStrategyFactory {
  constructor(events) {
    this.events = events;

    // Initialize regular game strategies
    this.strategies = {
      // Standard game strategies
      anonymous: new AnonymousGameStrategy(),
      authenticated: new AuthenticatedGameStrategy(events),

      // Daily challenge strategies
      dailyAnonymous: new AnonymousDailyStrategy(),
      dailyAuthenticated: new AuthenticatedDailyStrategy(events),
    };
  }

  /**
   * Get the appropriate strategy for the current user state
   * @param {Object} options Options to determine strategy
   * @param {boolean} options.daily Whether to get daily challenge strategy
   * @returns {GameStrategy} The selected strategy
   */


  /**
   * Get the appropriate strategy for the current user state
   * @param {Object} options Options to determine strategy
   * @param {boolean} options.daily Whether to get daily challenge strategy
   * @returns {GameStrategy} The selected strategy
   */
  getStrategy(options = {}) {
    const isAuthenticated = this._isUserAuthenticated();
    const isDaily = options.daily === true;
    const customGameRequested = options.customGameRequested === true;

    // Anonymous users NEVER have state persistence - they only get:
    // 1. Daily challenges (default) 
    // 2. Custom games (only when explicitly requested)
    if (!isAuthenticated) {
      // For anonymous users, always clear any existing game ID to ensure fresh state
      localStorage.removeItem("uncrypt-game-id");

      // For anonymous users, respect the explicit daily flag first
      if (daily) {
        console.log("Anonymous user with daily flag - using daily anonymous strategy");
        return this.strategies.dailyAnonymous;
      }
      
      // Otherwise use anonymous strategy (prevents unintended daily defaulting)
      console.log("Anonymous user - using standard anonymous strategy");
      return this.strategies.anonymous;
    }

    // For authenticated users, follow normal flow

    // If custom game is explicitly requested, use authenticated strategy
    if (customGameRequested) {
      console.log("Authenticated user with custom game request - using authenticated strategy");
      return this.strategies.authenticated;
    }

    // Check for active daily game
    const activeGameId = localStorage.getItem("uncrypt-game-id");
    const isActiveDailyGame = activeGameId && activeGameId.includes("-daily-");

    // For daily games or active daily games (authenticated users only)
    if (isDaily || isActiveDailyGame) {
      console.log("Authenticated user with daily game request or active daily game");
      return this.strategies.dailyAuthenticated;
    }

    // For standard authenticated games
    console.log("Authenticated user with standard game request");
    return this.strategies.authenticated;
  }

  /**
   * Get a specific strategy by type
   * @param {string} type The strategy type ('anonymous', 'authenticated', 'dailyAnonymous', 'dailyAuthenticated')
   * @returns {GameStrategy} The requested strategy
   */
  getStrategyByType(type) {
    if (this.strategies[type]) {
      return this.strategies[type];
    }

    // Default to standard strategy based on auth state
    return this.getStrategy();
  }

  /**
   * Get appropriate daily challenge strategy
   * @returns {DailyChallengeInterface} The daily challenge strategy
   */
  getDailyStrategy() {
    const isAuthenticated = this._isUserAuthenticated();
    return isAuthenticated
      ? this.strategies.dailyAuthenticated
      : this.strategies.dailyAnonymous;
  }

  /**
   * Helper method to check if user is authenticated
   * @returns {boolean} True if user is authenticated
   * @private
   */
  _isUserAuthenticated() {
    // Check for auth token in localStorage or sessionStorage
    const token =
      localStorage.getItem("uncrypt-token") ||
      sessionStorage.getItem("uncrypt-token");
    return !!token;
  }
}

export default GameStrategyFactory;
