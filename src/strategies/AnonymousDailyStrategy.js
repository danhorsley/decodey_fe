// src/strategies/AnonymousDailyStrategy.js
import DailyChallengeInterface from "./DailyChallengeInterface";
import apiService from "../services/apiService";
import { AnonymousOperationError } from "../errors/GameErrors";

/**
 * Daily challenge strategy for anonymous users
 * Implements daily challenge operations for users who are not logged in
 */
class AnonymousDailyStrategy extends DailyChallengeInterface {
  /**
   * Start today's daily challenge for anonymous user
   * @returns {Promise<Object>} Result object with success flag and game data
   */
  async startDailyChallenge() {
    try {
      console.log("AnonymousDailyStrategy: Starting daily challenge");

      // Check if there's already a daily challenge active
      const existingGameId = localStorage.getItem("uncrypt-game-id");
      const isExistingDailyGame = existingGameId && existingGameId.includes("-daily-");

      if (isExistingDailyGame) {
        console.log(`AnonymousDailyStrategy: Found existing daily game: ${existingGameId}`);
        // Instead of starting a new one, return the existing one's data
        try {
          // Try to get state of the existing game
          console.log("Fetching current state of existing daily game");
          const gameData = await apiService.api.get("/api/game-status");
          return {
            success: true,
            gameData: gameData.data,
            anonymous: true,
            daily: true,
            existingDailyGame: true
          };
        } catch (err) {
          console.warn("Error getting existing daily game, will start a new one:", err);
          // Continue to start a new daily if we couldn't get the existing one
        }
      }

      // Clear any existing game ID first (only if not already a daily)
      if (!isExistingDailyGame) {
        localStorage.removeItem("uncrypt-game-id");
      }

      // Get today's date string
      const dateString = this.getTodayDateString();
      console.log(`Starting daily challenge for date: ${dateString}`);

      // Start daily game via API Service
      const gameData = await apiService.startDailyChallenge(dateString);
      console.log("Received game data from API:", gameData ? "success" : "failure");

      // Store game ID if available
      if (gameData?.game_id) {
        localStorage.setItem("uncrypt-game-id", gameData.game_id);
        console.log(`Daily challenge started with ID: ${gameData.game_id}`);
      }

      return {
        success: true,
        gameData,
        anonymous: true,
        daily: true,
      };
    } catch (error) {
      console.error(
        "AnonymousDailyStrategy: Error starting daily challenge:",
        error,
      );
      return {
        success: false,
        error,
        anonymous: true,
        daily: true,
      };
    }
  }

  /**
   * Anonymous users can't have daily completion status between sessions
   * This always returns not completed
   */
  async checkDailyCompletion() {
    console.log(
      "AnonymousDailyStrategy: Anonymous users have no completion history",
    );
    return {
      isCompleted: false,
      anonymous: true,
      message: "Anonymous users do not have persistent daily completion status",
    };
  }

  /**
   * Anonymous users can't access daily stats
   */
  async getDailyStats() {
    console.log(
      "AnonymousDailyStrategy: Anonymous users cannot access daily stats",
    );
    throw new AnonymousOperationError("access daily stats");
  }
}

export default AnonymousDailyStrategy;
