// src/components/modals/ModalManager.js - Improved with better state management
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import About from "./About";
import Settings from "./Settings";
import Login from "../../pages/Login";
import Signup from "../../pages/Signup";
import ContinueGamePrompt from "./ContinueGamePrompt";
import useGameService from "../../hooks/useGameService"; // Updated to use gameService hook
import useUIStore from "../../stores/uiStore";
import config from "../../config";
import useGameStore from "../../stores/gameStore";

/**
 * ModalManager component - handles rendering of all application modals
 * Updated to use gameService through hook instead of direct store manipulation
 */
const ModalManager = ({ children }) => {
  const navigate = useNavigate();

  // State to track daily challenge completion
  const [isDailyCompleted, setIsDailyCompleted] = useState(true);

  // Get UI state using individual selectors to reduce re-renders
  const isAboutOpen = useUIStore((state) => state.isAboutOpen);
  const isLoginOpen = useUIStore((state) => state.isLoginOpen);
  const isSignupOpen = useUIStore((state) => state.isSignupOpen);
  const isSettingsOpen = useUIStore((state) => state.isSettingsOpen);
  const isContinueGameOpen = useUIStore((state) => state.isContinueGameOpen);
  const [activeGameStats, setActiveGameStats] = useState(null);
  const [activeDailyStats, setActiveDailyStats] = useState(null);
  const [hasActiveDailyGame, setHasActiveDailyGame] = useState(false);
  const showDailyButton = !isDailyCompleted || hasActiveDailyGame;

  // Get UI actions
  const closeAbout = useUIStore((state) => state.closeAbout);
  const closeLogin = useUIStore((state) => state.closeLogin);
  const closeSignup = useUIStore((state) => state.closeSignup);
  const closeSettings = useUIStore((state) => state.closeSettings);

  const closeContinueGamePrompt = useUIStore(
    (state) => state.closeContinueGamePrompt,
  );
  const openContinueGamePrompt = useUIStore(
    (state) => state.openContinueGamePrompt,
  );

  // Get game service functions and events
  const {
    continueGame,
    startNewGame,
    isDailyCompleted: checkDailyCompletion,
    startDailyChallenge,
    onEvent,
    events,
  } = useGameService();

  // Check daily challenge completion status when continue game prompt opens
  useEffect(() => {
    const checkDailyStatus = async () => {
      if (isContinueGameOpen) {
        try {
          const result = await checkDailyCompletion();
          setIsDailyCompleted(result.isCompleted || false);
        } catch (error) {
          console.warn("Error checking daily completion:", error);
          // Default to completed (don't show button) on error
          setIsDailyCompleted(true);
        }
      }
    };

    // Only check for authenticated users
    if (isContinueGameOpen && config.session.getAuthToken()) {
      checkDailyStatus();
    }
  }, [isContinueGameOpen, checkDailyCompletion]);

  // Listen for active game notifications from gameService
  useEffect(() => {
    // Subscribe to the active game found event
    const unsubscribe = onEvent(events.ACTIVE_GAME_FOUND, (data) => {
      // Only show continue game prompt for authenticated users
      const isAuthenticated = !!config.session.getAuthToken();

      if (isAuthenticated) {
        // Store both regular and daily game stats if available
        const regularGameStats = data.gameStats || null;
        const dailyGameStats = data.dailyStats || null;
        const hasActiveDailyGame = data.hasActiveDailyGame || false;

        // Update state with both game types
        setActiveGameStats(regularGameStats);
        setActiveDailyStats(dailyGameStats);
        setHasActiveDailyGame(hasActiveDailyGame);

        // Open the continue game prompt if we have any active game
        if (regularGameStats || (hasActiveDailyGame && dailyGameStats)) {
          openContinueGamePrompt(regularGameStats);
        }
      } else {
        console.log(
          "Active game found but user is not authenticated - bypassing continue prompt",
        );
        // For anonymous users, we don't show the modal at all
      }
    });

    return unsubscribe;
  }, [onEvent, events, openContinueGamePrompt]);

  // Simple handlers that delegate to game service
  const handleContinueGame = async (isDaily = false) => {
    try {
      // Use the isDaily flag to determine which game to continue
      const result = await continueGame({ isDaily });
      closeContinueGamePrompt();
      return result;
    } catch (error) {
      console.error(
        `Error continuing ${isDaily ? "daily" : "regular"} game:`,
        error,
      );
      closeContinueGamePrompt();
      return { success: false, error };
    }
  };

  // Listen for game state changes
  useEffect(() => {
    // Subscribe to game state changes
    const unsubscribe = onEvent(events.ACTIVE_GAME_FOUND, (data) => {
      // Only show continue game prompt for authenticated users
      const isAuthenticated = !!config.session.getAuthToken();

      if (isAuthenticated) {
        // Store both regular and daily game stats if available
        const regularGameStats = data.gameStats || null;
        const dailyGameStats = data.dailyStats || null;
        const hasActiveDailyGame = data.hasActiveDailyGame || false;

        // Update state with both game types
        setActiveGameStats(regularGameStats);
        setActiveDailyStats(dailyGameStats);
        setHasActiveDailyGame(hasActiveDailyGame);

        // Open the continue game prompt if we have ANY active game type
        // Now correctly passing both game stats and hasActiveDailyGame flag
        if (regularGameStats || (hasActiveDailyGame && dailyGameStats)) {
          console.log('Opening continue prompt with hasActiveDailyGame:', hasActiveDailyGame);
          openContinueGamePrompt(regularGameStats || {}, {
            hasActiveDailyGame,
            dailyGameStats
          });
        }
      } else {
        console.log(
          "Active game found but user is not authenticated - bypassing continue prompt",
        );
        // For anonymous users, we don't show the modal at all
      }
    });

    return unsubscribe;
  }, [isContinueGameOpen, closeContinueGamePrompt, onEvent, events]);

  // Handler for custom game
  const handleNewGame = async () => {
    try {
      console.log("Custom Game button clicked - abandoning regular game only");

      // Delegate to startNewGame through gameService
      // No need to specify isDaily anymore - always abandons regular games only
      const result = await startNewGame({
        customGameRequested: true, // This tells the system to start a custom game
      });

      // Close the modal
      closeContinueGamePrompt();

      return result;
    } catch (error) {
      console.error("Error starting new game:", error);
      closeContinueGamePrompt();
      return { success: false, error };
    }
  };

  // Handler for daily challenge button - now directly starts the challengee
  const handleDailyChallenge = async (hasActiveDaily = false) => {
    // Close the modal first for better UX
    closeContinueGamePrompt();

    try {
      console.log(
        `Handling daily challenge button click, hasActiveDaily=${hasActiveDaily}`,
      );

      // If we have an active daily game, continue it
      if (hasActiveDaily) {
        console.log("Continuing existing daily challenge");
        return await continueGame({ isDaily: true });
      }

      // Otherwise, follow standard daily challenge flow
      console.log("Starting new daily challenge from modal");

      // 1. IMPORTANT: Clear the existing game ID from localStorage
      //    This prevents the continue game logic from triggering
      localStorage.removeItem("uncrypt-game-id");

      // 2. Reset the game state in the store to avoid any lingering state
      //    This ensures we have a clean slate for the daily challenge
      //    - Using the resetGame method from gameStore if available
      try {
        const gameStore = useGameStore.getState();
        if (typeof gameStore.resetGame === "function") {
          gameStore.resetGame();
        }
      } catch (resetError) {
        console.warn("Non-critical error resetting game state:", resetError);
        // Continue anyway as localStorage clear is the most important part
      }

      // 3. Now start daily challenge with the cleaned state
      const isAuthenticated = !!config.session.getAuthToken();
      const hasActiveGame = activeGameStats !== null;

      if (isAuthenticated && hasActiveGame) {
        console.log(
          "Authenticated user with active game - explicit game ID reset performed",
        );
        console.log("Starting fresh daily challenge with clean state");

        // Set a flag to prevent continue game from triggering
        localStorage.setItem("force-daily-challenge", "true");

        const result = await startDailyChallenge({
          skipCompletionCheck: true,
          forceNew: true, // Add this flag to signal we want a fresh start
        });

        // Remove the flag once daily challenge is started
        localStorage.removeItem("force-daily-challenge");

        if (result.success) {
          console.log("Daily challenge started successfully");
          return result;
        } else if (result.alreadyCompleted) {
          console.log("Daily challenge already completed");
          navigate("/", {
            state: {
              dailyCompleted: true,
              completionData: result.completionData,
            },
          });
          return result;
        }
      } else {
        // Normal flow for users without active game
        const result = await startDailyChallenge();

        if (result.success) {
          console.log("Daily challenge started successfully");
          return result;
        } else if (result.alreadyCompleted) {
          console.log("Daily challenge already completed");
          navigate("/", {
            state: {
              dailyCompleted: true,
              completionData: result.completionData,
            },
          });
          return result;
        }
      }

      // Handle error for normal flow
      console.error("Error starting daily challenge - unhandled case");
      return {
        success: false,
        error: "Unhandled case in daily challenge start",
      };
    } catch (error) {
      console.error("Error handling daily challenge:", error);
      return { success: false, error };
    }
  };

  return (
    <>
      {/* Only render modals when their state is true */}
      {isAboutOpen && <About isOpen={true} onClose={closeAbout} />}

      {isLoginOpen && <Login onClose={closeLogin} />}

      {isSignupOpen && <Signup onClose={closeSignup} />}

      {isSettingsOpen && <Settings onCancel={closeSettings} />}

      {isContinueGameOpen && (
        <ContinueGamePrompt
          isOpen={true}
          onClose={closeContinueGamePrompt}
          gameStats={activeGameStats || {}}
          dailyGameStats={activeDailyStats || null}
          onContinue={handleContinueGame}
          onNewGame={handleNewGame}
          dailyCompleted={isDailyCompleted}
          onDailyChallenge={handleDailyChallenge}
          hasActiveDailyGame={hasActiveDailyGame}
        />
      )}

      {/* Render children */}
      {children}
    </>
  );
};

export default ModalManager;
