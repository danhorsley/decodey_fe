// src/hooks/useGameSession.js - Updated to work with strategy pattern
import { useCallback } from "react";
import useSettingsStore from "../stores/settingsStore";
import {
  initializeGameSession,
  continueSavedGame,
  handleLogin,
  loginAndStartGame,
  handleLogout,
  abandonAndStartNew,
  onGameSessionEvent,
  GameSessionEvents,
  useGameSessionStore,

  // Import new daily challenge functions
  initializeDailyChallenge,
  checkDailyCompletion,
  getDailyStats,
} from "../services/gameSessionManager";

/**
 * Hook to interact with the game session manager
 * Acts as a clean API for components to use game session functionality
 */
const useGameSession = () => {
  // Access settings store for game options
  const settings = useSettingsStore((state) => state.settings);

  // Get session store state (already managed by gameSessionManager)
  const { isInitializing, initError: lastError } = useGameSessionStore();

  /**
   * Initialize or reset game with current settings
   * @param {boolean} forceNew Force a new game even if one exists
   * @returns {Promise<Object>} Initialization result
   */
  const initializeGame = useCallback(
    async (forceNew = false) => {
      try {
        // If forcing new game, use abandonAndStartNew
        if (forceNew) {
          return await abandonAndStartNew({
            longText: settings?.longText,
            hardcoreMode: settings?.hardcoreMode,
          });
        }

        // Normal initialization via the central manager
        return await initializeGameSession({
          longText: settings?.longText,
          hardcoreMode: settings?.hardcoreMode,
        });
      } catch (error) {
        console.error("Error in useGameSession.initializeGame:", error);
        return { success: false, error };
      }
    },
    [settings?.longText, settings?.hardcoreMode],
  );

  /**
   * Continue a saved game
   * @returns {Promise<Object>} Continue result
   */
  const continueGame = useCallback(async () => {
    try {
      return await continueSavedGame();
    } catch (error) {
      console.error("Error in useGameSession.continueGame:", error);
      return { success: false, error };
    }
  }, []);

  /**
   * Handle user login
   * @param {Object} credentials User credentials
   * @returns {Promise<Object>} Login result
   */
  const userLogin = useCallback(async (credentials) => {
    try {
      return await handleLogin(credentials);
    } catch (error) {
      console.error("Error in useGameSession.userLogin:", error);
      return { success: false, error };
    }
  }, []);

  /**
   * Login and start a new game if no active game exists
   * @param {Object} credentials User credentials
   * @returns {Promise<Object>} Combined login and game result
   */
  const loginAndInitGame = useCallback(
    async (credentials) => {
      try {
        // Pass current settings to ensure consistent game experience
        return await loginAndStartGame(credentials, {
          longText: settings?.longText,
          hardcoreMode: settings?.hardcoreMode,
        });
      } catch (error) {
        console.error("Error in useGameSession.loginAndInitGame:", error);
        return { success: false, error };
      }
    },
    [settings?.longText, settings?.hardcoreMode],
  );

  /**
   * Handle user logout
   * @param {boolean} startNewGame Whether to start a new game after logout
   * @returns {Promise<Object>} Logout result
   */
  const userLogout = useCallback(
    async (startNewGame = true) => {
      try {
        return await handleLogout({
          startAnonymousGame: startNewGame,
          gameOptions: {
            longText: settings?.longText,
            hardcoreMode: settings?.hardcoreMode,
          },
        });
      } catch (error) {
        console.error("Error in useGameSession.userLogout:", error);
        return { success: false, error };
      }
    },
    [settings?.longText, settings?.hardcoreMode],
  );

  /**
   * Start a new game after abandoning current
   * @returns {Promise<Object>} Result
   */
  const startNewGame = useCallback(async () => {
    try {
      return await abandonAndStartNew({
        longText: settings?.longText,
        hardcoreMode: settings?.hardcoreMode,
      });
    } catch (error) {
      console.error("Error in useGameSession.startNewGame:", error);
      return { success: false, error };
    }
  }, [settings?.longText, settings?.hardcoreMode]);

  /**
   * Initialize a daily challenge
   * @returns {Promise<Object>} Result
   */
  const startDailyChallenge = useCallback(async () => {
    try {
      return await initializeDailyChallenge();
    } catch (error) {
      console.error("Error in useGameSession.startDailyChallenge:", error);
      return { success: false, error };
    }
  }, []);

  /**
   * Check if today's daily challenge has been completed
   * @returns {Promise<Object>} Result with isCompleted flag
   */
  const isDailyCompleted = useCallback(async () => {
    try {
      return await checkDailyCompletion();
    } catch (error) {
      console.error("Error in useGameSession.isDailyCompleted:", error);
      return { isCompleted: false, error };
    }
  }, []);

  /**
   * Get daily challenge statistics
   * @returns {Promise<Object>} Daily stats
   */
  const getDailyChallengeStats = useCallback(async () => {
    try {
      return await getDailyStats();
    } catch (error) {
      console.error("Error in useGameSession.getDailyChallengeStats:", error);
      return { success: false, error };
    }
  }, []);

  // Return a simplified API
  return {
    // Status
    isInitializing,
    lastError,

    // Core functions - simplified naming
    initializeGame,
    continueGame,
    userLogin,
    loginAndInitGame,
    userLogout,
    startNewGame,

    // Daily challenge functions
    startDailyChallenge,
    isDailyCompleted,
    getDailyChallengeStats,

    // Events support
    subscribeToEvents: onGameSessionEvent,
    events: GameSessionEvents,
  };
};

export default useGameSession;
