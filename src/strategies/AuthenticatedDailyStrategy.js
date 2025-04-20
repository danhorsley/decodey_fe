// src/strategies/AuthenticatedDailyStrategy.js
import DailyChallengeInterface from "./DailyChallengeInterface";
import apiService from "../services/apiService";
import { ApiError, AuthenticationError } from "../errors/GameErrors";
import AuthenticatedGameStrategy from "./AuthenticatedGameStrategy";

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
      console.log("AuthenticatedDailyStrategy: Checking daily completion before starting");

      // First check if user has already completed today's challenge
      const completionCheck = await this.checkDailyCompletion();

      if (completionCheck.isCompleted) {
        console.log("AuthenticatedDailyStrategy: User already completed today's challenge");

        // Emit event to notify UI about already completed daily
        if (this.events) {
          this.events.emit("daily:already-completed", {
            completionData: completionCheck.completionData,
          });
        }

        // IMPORTANT FIX: Check for active game to ensure we don't fail loading
        // Instead of just returning early, check if there's any active game we can continue
        try {
          // We can borrow the check from AuthenticatedGameStrategy
          const strategy = new AuthenticatedGameStrategy(this.events);
          const activeGameCheck = await strategy.checkActiveGame();

          if (activeGameCheck.hasActiveGame) {
            console.log("AuthenticatedDailyStrategy: Found active game to continue");

            // Emit event to notify UI about active game
            if (this.events) {
              this.events.emit("game:active-game-found", {
                gameStats: activeGameCheck.gameStats,
              });
            }

            // Return a consistent response that won't cause loading failures
            return {
              success: true,
              alreadyCompleted: true,
              hasActiveGame: true,
              gameStats: activeGameCheck.gameStats,
              completionData: completionCheck.completionData,
              daily: true,
            };
          }
        } catch (activeGameError) {
          console.warn("Error checking for active game when daily already completed:", activeGameError);
          // Continue normal flow - we still need to return something valid
        }

        // FALLBACK: If there's no active game, return a response that indicates success
        // but with special flags so UI knows daily is completed but no game is active
        return {
          success: true,
          alreadyCompleted: true,
          hasActiveGame: false,
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
      console.error("AuthenticatedDailyStrategy: Error starting daily challenge:", error);

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
