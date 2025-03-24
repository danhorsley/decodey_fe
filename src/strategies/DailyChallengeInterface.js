// src/strategies/DailyChallengeInterface.js

/**
 * Interface for daily challenge operations
 * This defines methods specific to daily challenges that
 * can be implemented by concrete strategies
 */
class DailyChallengeInterface {
  /**
   * Check if today's daily challenge has been completed
   * @returns {Promise<Object>} Result with isCompleted flag and stats if available
   */
  async checkDailyCompletion() {
    throw new Error(
      "checkDailyCompletion must be implemented by concrete classes",
    );
  }

  /**
   * Start today's daily challenge
   * @returns {Promise<Object>} Result with success flag and game data
   */
  async startDailyChallenge() {
    throw new Error(
      "startDailyChallenge must be implemented by concrete classes",
    );
  }

  /**
   * Get daily challenge stats for the user
   * Includes current streak, best streak, completion rate, etc.
   * @returns {Promise<Object>} Daily challenge stats
   */
  async getDailyStats() {
    throw new Error("getDailyStats must be implemented by concrete classes");
  }

  /**
   * Generate a date string for today in the format expected by the API
   * @returns {string} Today's date in YYYY-MM-DD format
   */
  getTodayDateString() {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  }
}

export default DailyChallengeInterface;
