// src/hooks/useGameService.js - Improved with better state management
import { useState, useCallback, useEffect } from "react";
import gameService from "../services/gameService";

/**
 * Custom hook to interact with the game service
 * Provides a clean interface for components to interact with the game service
 * without directly manipulating store state
 *
 * @returns {Object} Game service functions and state
 */
const useGameService = () => {
  // Local state for UI feedback
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);

  // Clear errors when component using the hook unmounts
  useEffect(() => {
    return () => setError(null);
  }, []);

  /**
   * Initialize or reset game with current settings
   * @param {Object} options - Game options
   * @returns {Promise<Object>} Initialization result
   */
  const initializeGame = useCallback(async (options = {}) => {
    try {
      setIsInitializing(true);
      setError(null);
      
      const result = await gameService.initializeGame(options);

      if (!result.success) {
        setError(result.error || new Error(result.reason || "Unknown error"));
      }

      return result;
    } catch (err) {
      console.error("Error in game initialization:", err);
      setError(err);
      return { success: false, error: err };
    } finally {
      setIsInitializing(false);
    }
  }, []);

  /**
   * Start a daily challenge
   * @returns {Promise<Object>} Daily challenge result
   */
  const startDailyChallenge = useCallback(async () => {
    try {
      setIsInitializing(true);
      setError(null);

      const result = await gameService.startDailyChallenge();

      if (!result.success && !result.alreadyCompleted) {
        setError(result.error || new Error("Failed to start daily challenge"));
      }

      return result;
    } catch (err) {
      console.error("Error starting daily challenge:", err);
      setError(err);
      return { success: false, error: err };
    } finally {
      setIsInitializing(false);
    }
  }, []);

  /**
   * Continue a saved game
   * @returns {Promise<Object>} Continue result
   */
  const continueGame = useCallback(async (options = {}) => {
    try {
      setIsInitializing(true);
      setError(null);

      // Fix: Pass the options to the service's continueGame function
      const result = await gameService.continueGame(options);

      if (!result.success) {
        setError(
          result.error || new Error(result.reason || "Failed to continue game"),
        );
      }

      return result;
    } catch (err) {
      console.error("Error continuing game:", err);
      setError(err);
      return { success: false, error: err };
    } finally {
      setIsInitializing(false);
    }
  }, []);

  /**
   * Abandon current game and start a new one
   * @param {Object} options - Game options
   * @returns {Promise<Object>} Result
   */
  const startNewGame = useCallback(async (options = {}) => {
    try {
      setIsInitializing(true);
      setError(null);

      const result = await gameService.abandonAndStartNew(options);

      if (!result.success) {
        setError(result.error || new Error("Failed to start new game"));
      }

      return result;
    } catch (err) {
      console.error("Error starting new game:", err);
      setError(err);
      return { success: false, error: err };
    } finally {
      setIsInitializing(false);
    }
  }, []);

  /**
   * Check if daily challenge is completed
   * @returns {Promise<Object>} Check result
   */
  const isDailyCompleted = useCallback(async () => {
    try {
      const result = await gameService.checkDailyCompletion();
      return result;
    } catch (err) {
      console.error("Error checking daily completion:", err);
      return { isCompleted: false, error: err };
    }
  }, []);

  /**
   * Login user
   * @param {Object} credentials - User credentials
   * @returns {Promise<Object>} Login result
   */
  const login = useCallback(async (credentials) => {
    try {
      const result = await gameService.login(credentials);
      return result;
    } catch (err) {
      console.error("Error logging in:", err);
      return { success: false, error: err };
    }
  }, []);

  /**
   * Logout user
   * @param {boolean} startAnonymousGame - Whether to start a new game after logout
   * @returns {Promise<Object>} Logout result
   */
  const logout = useCallback(async (startAnonymousGame = true) => {
    try {
      const result = await gameService.logout(startAnonymousGame);
      return result;
    } catch (err) {
      console.error("Error logging out:", err);
      return { success: false, error: err };
    }
  }, []);

  /**
   * Subscribe to game events
   * @param {string} event - Event name from gameService.events
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  const onEvent = useCallback((event, callback) => {
    return gameService.onEvent(event, callback);
  }, []);

  return {
    // State
    isInitializing,
    error,

    // Game functions
    initializeGame,
    startDailyChallenge,
    continueGame,
    startNewGame,
    isDailyCompleted,

    // Auth functions
    login,
    logout,

    // Events
    onEvent,
    events: gameService.events,
  };
};

export default useGameService;
