// src/components/modals/ModalManager.js - Updated daily challenge handling
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import About from "./About";
import Settings from "./Settings";
import Login from "../../pages/Login";
import Signup from "../../pages/Signup";
import ContinueGamePrompt from "./ContinueGamePrompt";
import useGameService from "../../hooks/useGameService"; // Updated to use gameService
import useUIStore from "../../stores/uiStore";
import useSettingsStore from "../../stores/settingsStore";
import config from "../../config";

/**
 * ModalManager component - handles rendering of all application modals
 * Updated to directly start daily challenge instead of navigating
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
  const activeGameStats = useUIStore((state) => state.activeGameStats);

  // Get UI actions
  const closeAbout = useUIStore((state) => state.closeAbout);
  const closeLogin = useUIStore((state) => state.closeLogin);
  const closeSignup = useUIStore((state) => state.closeSignup);
  const closeSettings = useUIStore((state) => state.closeSettings);
  const closeContinueGamePrompt = useUIStore((state) => state.closeContinueGamePrompt);
  const openContinueGamePrompt = useUIStore((state) => state.openContinueGamePrompt);

  // Get game service functions and events
  const {
    continueGame,
    startNewGame,
    isDailyCompleted: checkDailyCompletion,
    startDailyChallenge,
    onEvent,
    events
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

      if (isAuthenticated && data && data.gameStats) {
        openContinueGamePrompt(data.gameStats);
      } else {
        console.log(
          "Active game found but user is not authenticated - bypassing continue prompt"
        );
        // For anonymous users, we don't show the modal at all
      }
    });

    return unsubscribe;
  }, [onEvent, events, openContinueGamePrompt]);

  // Simple handlers that delegate to game service
  const handleContinueGame = async () => {
    try {
      const result = await continueGame();
      closeContinueGamePrompt();
      return result;
    } catch (error) {
      console.error("Error continuing game:", error);
      closeContinueGamePrompt();
      return { success: false, error };
    }
  };

  // Listen for game state changes
  useEffect(() => {
    // Subscribe to game state changes
    const unsubscribe = onEvent(events.STATE_CHANGED, () => {
      console.log(
        "Game state changed detected - closing continue prompt if open"
      );
      // Close the continue prompt if it's open
      if (isContinueGameOpen) {
        closeContinueGamePrompt();
      }
    });

    return unsubscribe;
  }, [isContinueGameOpen, closeContinueGamePrompt, onEvent, events]);

  // Updated handler for custom game
  const handleNewGame = async () => {
    // Get settings with complete properties
    const settingsStore = useSettingsStore.getState();
    const options = {
      longText: settingsStore?.settings?.longText || false,
      hardcoreMode: settingsStore?.settings?.hardcoreMode || false,
      difficulty: settingsStore?.settings?.difficulty || "medium",
      customGameRequested: true, // This tells the system to start a custom game
      preserveExistingGame: false, // This explicitly says to abandon the current game
    };

    console.log("Starting new game with settings:", options);

    // Start new game using the service
    const result = await startNewGame(options);

    // Close the modal
    closeContinueGamePrompt();

    return result;
  };

  // Updated handler for daily challenge button - now directly starts the challenge
  // instead of navigating to a separate route
  const handleDailyChallenge = async () => {
    // Close the modal first for better UX
    closeContinueGamePrompt();

    try {
      console.log("Starting daily challenge directly");
      const result = await startDailyChallenge();

      if (result.success) {
        console.log("Daily challenge started successfully");
        // Stay on the current page - the game has been initialized with daily challenge
        return result;
      } else if (result.alreadyCompleted) {
        console.log("Daily challenge already completed");
        // For already completed daily, update the route state to show notification
        navigate("/", { 
          state: { 
            dailyCompleted: true,
            completionData: result.completionData 
          }
        });
        return result;
      } else {
        console.error("Error starting daily challenge:", result.error);
        return result;
      }
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
          onContinue={handleContinueGame}
          onNewGame={handleNewGame}
          dailyCompleted={isDailyCompleted}
          onDailyChallenge={handleDailyChallenge}
        />
      )}

      {/* Render children */}
      {children}
    </>
  );
};

export default ModalManager;