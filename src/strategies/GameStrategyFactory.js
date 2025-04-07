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
  getStrategy(options = {}) {
    const isAuthenticated = this._isUserAuthenticated();
    const isDaily = options.daily === true;

    // Simple check for active daily game when getting strategy
    const activeGameId = localStorage.getItem("uncrypt-game-id");
    const isActiveDailyGame = activeGameId && activeGameId.includes("-daily-");

    // If we're continuing an active daily and not specifically requesting a custom game,
    // return the daily strategy
    if (isActiveDailyGame && !options.customGameRequested) {
      return isAuthenticated
        ? this.strategies.dailyAuthenticated
        : this.strategies.dailyAnonymous;
    }

    // Otherwise use normal strategy selection
    if (!isAuthenticated && !options.customGameRequested) {
      return this.strategies.dailyAnonymous;
    }

    if (isDaily) {
      return isAuthenticated
        ? this.strategies.dailyAuthenticated
        : this.strategies.dailyAnonymous;
    } else {
      return isAuthenticated
        ? this.strategies.authenticated
        : this.strategies.anonymous;
    }
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
