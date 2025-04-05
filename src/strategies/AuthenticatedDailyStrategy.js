// src/strategies/AuthenticatedDailyStrategy.js
import DailyChallengeInterface from "./DailyChallengeInterface";
import apiService from "../services/apiService";
import { ApiError, AuthenticationError } from "../errors/GameErrors";

/**
 * Daily challenge strategy for authenticated users
 * Implements daily challenge operations for logged-in users
 */
class AuthenticatedDailyStrategy extends DailyChallengeInterface {
  constructor(events) {
    super();
    this.events = events; // Event emitter for notifications
  }

  /**
   * Start today's daily challenge for authenticated user
   * @returns {Promise<Object>} Result object with success flag and game data
   */
  async startDailyChallenge() {
    try {
      console.log(
        "AuthenticatedDailyStrategy: Checking daily completion before starting",
      );

      // First check if user has already completed today's challenge
      const completionCheck = await this.checkDailyCompletion();

      if (completionCheck.isCompleted) {
        console.log(
          "AuthenticatedDailyStrategy: User already completed today's challenge",
        );

        // Check for active game to continue
        const activeGame = await apiService.checkActiveGame();
        if (activeGame.has_active_game) {
          console.log("AuthenticatedDailyStrategy: Found active game to continue");
          const continueResult = await apiService.continueGame();
          return {
            success: true,
            gameData: continueResult,
            daily: true,
            continued: true
          };
        }

        // Emit event to notify UI about already completed daily
        if (this.events) {
          this.events.emit("daily:already-completed", {
            completionData: completionCheck.completionData,
          });
        }

        return {
          success: true,
          alreadyCompleted: true,
          completionData: completionCheck.completionData,
          daily: true,
        };
      }

      // Not completed yet, start the daily challenge
      console.log("AuthenticatedDailyStrategy: Starting daily challenge");

      // Clear any existing game ID
      localStorage.removeItem("uncrypt-game-id");

      // Get today's date string
      const dateString = this.getTodayDateString();

      // Start daily game via API Service
      const gameData = await apiService.startDailyChallenge(dateString);

      // Store game ID if available
      if (gameData?.game_id) {
        localStorage.setItem("uncrypt-game-id", gameData.game_id);
      }

      return {
        success: true,
        gameData,
        daily: true,
      };
    } catch (error) {
      console.error(
        "AuthenticatedDailyStrategy: Error starting daily challenge:",
        error,
      );

      // Special handling for auth errors
      if (error.response?.status === 401) {
        throw new AuthenticationError();
      }

      return {
        success: false,
        error,
        daily: true,
      };
    }
  }

  /**
   * Check if authenticated user has completed today's challenge
   * @returns {Promise<Object>} Result with isCompleted flag and completion data
   */
  async checkDailyCompletion() {
    try {
      console.log(
        "AuthenticatedDailyStrategy: Checking daily completion status",
      );

      // Get today's date string
      const dateString = this.getTodayDateString();

      // Call API to check completion
      const response = await apiService.api.get("/api/daily-completion", {
        params: { date: dateString },
      });

      return {
        isCompleted: response.data.is_completed || false,
        completionData: response.data.completion_data || null,
        daily: true,
      };
    } catch (error) {
      console.error(
        "AuthenticatedDailyStrategy: Error checking daily completion:",
        error,
      );

      // For auth errors, throw proper error
      if (error.response?.status === 401) {
        throw new AuthenticationError();
      }

      // For other errors, assume not completed
      return {
        isCompleted: false,
        error: new ApiError(
          "Error checking daily completion",
          error.response?.status,
          error.response?.data,
        ),
        daily: true,
      };
    }
  }

  /**
   * Get daily challenge stats for the authenticated user
   * @returns {Promise<Object>} Daily challenge stats
   */
  async getDailyStats() {
    try {
      console.log("AuthenticatedDailyStrategy: Getting daily stats");

      // Call API to get daily stats
      const response = await apiService.api.get("/api/daily-stats");

      return {
        dailyStats: response.data,
        success: true,
      };
    } catch (error) {
      console.error(
        "AuthenticatedDailyStrategy: Error getting daily stats:",
        error,
      );

      // For auth errors, throw proper error
      if (error.response?.status === 401) {
        throw new AuthenticationError();
      }

      // For other errors, return error info
      return {
        success: false,
        error: new ApiError(
          "Error retrieving daily stats",
          error.response?.status,
          error.response?.data,
        ),
      };
    }
  }
}

export default AuthenticatedDailyStrategy;
