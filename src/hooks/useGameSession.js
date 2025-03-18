// src/hooks/useGameSession.js
import { useState, useEffect, useCallback } from "react";
import useSettingsStore from "../stores/settingsStore";
import useGameStore from "../stores/gameStore";
import useAuthStore from "../stores/authStore";
import useUIStore from "../stores/uiStore";
import {
  initializeGameSession,
  continueSavedGame,
  handleLogin,
  handleLogout,
  abandonAndStartNew,
  onGameSessionEvent,
  GameSessionEvents,
  useGameSessionStore,
} from "../services/gameSessionManager";

/**
 * Custom hook to interact with the game session manager
 * Provides a convenient interface for components to initialize games,
 * handle auth transitions, and manage game state
 */
const useGameSession = () => {
  // Access various stores
  const settings = useSettingsStore((state) => state.settings);
  const {
    startGame,
    continueSavedGame: storeGameContinue,
    resetAndStartNewGame,
  } = useGameStore();
  const { isAuthenticated, login, logout } = useAuthStore();
  const { openContinueGamePrompt } = useUIStore();

  // Local state for status tracking
  const [isInitializing, setIsInitializing] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Get session store state
  const sessionState = useGameSessionStore();

  // Initialize game session with current settings
  const initialize = useCallback(
    async (forceNew = false) => {
      try {
        setIsInitializing(true);
        setLastError(null);

        console.log("Initializing game session with settings:", {
          longText: settings?.longText,
          hardcoreMode: settings?.hardcoreMode,
        });

        // If forcing new game, use abandonAndStartNew
        if (forceNew) {
          const result = await abandonAndStartNew({
            longText: settings?.longText,
            hardcoreMode: settings?.hardcoreMode,
          });

          setIsInitializing(false);
          return result;
        }

        // Normal initialization
        const result = await initializeGameSession({
          longText: settings?.longText,
          hardcoreMode: settings?.hardcoreMode,
        });

        setIsInitializing(false);
        return result;
      } catch (error) {
        console.error("Error in useGameSession.initialize:", error);
        setLastError(error);
        setIsInitializing(false);
        return { success: false, error };
      }
    },
    [settings?.longText, settings?.hardcoreMode],
  );

  // Continue a saved game
  const continueGame = useCallback(async () => {
    try {
      setIsInitializing(true);
      setLastError(null);

      console.log("Attempting to continue saved game via hook");

      // Call the continue function from the service
      const result = await continueSavedGame();

      // If the continue was successful, update the game store
      if (result.success && result.gameData) {
        // If we have a game store function, use it
        if (typeof storeGameContinue === "function") {
          await storeGameContinue(result.gameData);
        }
      }

      setIsInitializing(false);
      return result;
    } catch (error) {
      console.error("Error continuing saved game:", error);
      setLastError(error);
      setIsInitializing(false);
      return { success: false, error };
    }
  }, [storeGameContinue]);

  // Handle user login
  const handleUserLogin = useCallback(
    async (credentials) => {
      try {
        setIsInitializing(true);
        setLastError(null);

        console.log("Handling user login via hook");

        // Call the login function from the service
        const result = await handleLogin(credentials);

        // If successful login but auth store needs to be updated
        if (result.success && typeof login === "function") {
          // Update auth store if needed
          await login(credentials);
        }

        // If game state has an active game, handle appropriately
        if (result.success && result.gameState?.hasActiveGame) {
          // If the UI has a function to show continue dialog, use it
          if (typeof openContinueGamePrompt === "function") {
            openContinueGamePrompt(result.gameState.gameStats);
          }
        }

        setIsInitializing(false);
        return result;
      } catch (error) {
        console.error("Error handling user login:", error);
        setLastError(error);
        setIsInitializing(false);
        return { success: false, error };
      }
    },
    [login, openContinueGamePrompt],
  );

  // Handle user logout
  const handleUserLogout = useCallback(
    async (startNewGame = true) => {
      try {
        setIsInitializing(true);
        setLastError(null);

        console.log("Handling user logout via hook");

        // Call the logout function from the service
        const result = await handleLogout({
          startAnonymousGame: startNewGame,
          gameOptions: {
            longText: settings?.longText,
            hardcoreMode: settings?.hardcoreMode,
          },
        });

        // If auth store has a logout function, use it
        if (typeof logout === "function") {
          await logout();
        }

        setIsInitializing(false);
        return result;
      } catch (error) {
        console.error("Error handling user logout:", error);
        setLastError(error);
        setIsInitializing(false);

        // Still try to clear auth state
        if (typeof logout === "function") {
          await logout();
        }

        return { success: false, error };
      }
    },
    [logout, settings?.longText, settings?.hardcoreMode],
  );

  // Abandon current game and start new
  const abandonCurrentAndStartNew = useCallback(async () => {
    try {
      setIsInitializing(true);
      setLastError(null);

      console.log("Abandoning current game and starting new via hook");

      // Call the function from the service
      const result = await abandonAndStartNew({
        longText: settings?.longText,
        hardcoreMode: settings?.hardcoreMode,
      });

      // If game store has a reset function, use it
      if (typeof resetAndStartNewGame === "function") {
        await resetAndStartNewGame(settings?.longText, settings?.hardcoreMode);
      }

      setIsInitializing(false);
      return result;
    } catch (error) {
      console.error("Error abandoning current game:", error);
      setLastError(error);
      setIsInitializing(false);
      return { success: false, error };
    }
  }, [resetAndStartNewGame, settings?.longText, settings?.hardcoreMode]);

  // Set up event listeners for game session events
  useEffect(() => {
    // Handle active game found event
    const activeGameHandler = (data) => {
      console.log("Active game found event in hook:", data);

      // If we have a function to show continue dialog, use it
      if (typeof openContinueGamePrompt === "function") {
        openContinueGamePrompt(data.gameStats);
      }
    };

    // Register for events
    const unsubscribeActiveGame = onGameSessionEvent(
      GameSessionEvents.ACTIVE_GAME_FOUND,
      activeGameHandler,
    );

    return () => {
      // Clean up subscriptions
      unsubscribeActiveGame();
    };
  }, [openContinueGamePrompt]);

  // Return the API for components to use
  return {
    // Status
    isInitializing: isInitializing || sessionState.isInitializing,
    lastError: lastError || sessionState.initError,
    isAuthenticated,

    // Core functions
    initialize,
    continueGame,
    handleUserLogin,
    handleUserLogout,
    abandonCurrentAndStartNew,

    // Utility properties/methods
    subscribeToEvents: onGameSessionEvent,
    events: GameSessionEvents,
  };
};

export default useGameSession;
