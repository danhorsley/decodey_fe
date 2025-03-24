// src/errors/GameErrors.js
/**
 * Custom error classes for better error handling in the game
 */

/**
 * Base error class for all game-related errors
 */
export class GameError extends Error {
  constructor(message, code = "GAME_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

/**
 * Error thrown when a game initialization fails
 */
export class GameInitializationError extends GameError {
  constructor(message, originalError = null) {
    super(message, "GAME_INIT_ERROR");
    this.originalError = originalError;
  }
}

/**
 * Error thrown when a game operation is attempted for an anonymous user
 * but requires authentication
 */
export class AnonymousOperationError extends GameError {
  constructor(operation = "perform this operation") {
    super(`Anonymous users cannot ${operation}`, "ANONYMOUS_OPERATION");
    this.requiredAuth = true;
  }
}

/**
 * Error thrown when authentication fails or is required
 */
export class AuthenticationError extends GameError {
  constructor(message = "Authentication required") {
    super(message, "AUTH_REQUIRED");
    this.authRequired = true;
  }
}

/**
 * Error thrown when a session has expired
 */
export class SessionExpiredError extends AuthenticationError {
  constructor() {
    super("Session expired, please log in again");
    this.code = "SESSION_EXPIRED";
  }
}

/**
 * Error thrown when API calls fail
 */
export class ApiError extends GameError {
  constructor(message, status = null, data = null) {
    super(message, "API_ERROR");
    this.status = status;
    this.data = data;
  }
}

/**
 * Error thrown when game is already in progress
 */
export class GameInProgressError extends GameError {
  constructor(gameId = null) {
    super("A game is already in progress", "GAME_IN_PROGRESS");
    this.gameId = gameId;
  }
}

/**
 * Error thrown when no active game exists
 */
export class NoActiveGameError extends GameError {
  constructor() {
    super("No active game found", "NO_ACTIVE_GAME");
  }
}

/**
 * Error utility functions
 */
export const GameErrors = {
  /**
   * Create appropriate error from API response
   * @param {Object} response API response object
   * @returns {GameError} Appropriate error instance
   */
  fromApiResponse(response) {
    const status = response?.status;
    const data = response?.data;

    // Handle different status codes
    if (status === 401) {
      return new AuthenticationError();
    } else if (status === 404 && data?.error?.includes("No active game")) {
      return new NoActiveGameError();
    } else {
      return new ApiError(data?.error || "Unknown API error", status, data);
    }
  },

  /**
   * Wrap an error to include more context
   * @param {Error} error Original error
   * @param {string} context Context message
   * @returns {GameError} Wrapped error
   */
  wrap(error, context) {
    if (error instanceof GameError) {
      return error;
    }

    return new GameError(`${context}: ${error.message}`, "WRAPPED_ERROR");
  },
};
