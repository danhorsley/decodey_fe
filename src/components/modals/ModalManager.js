// src/components/modals/ModalManager.js - Updated to support Daily Challenge button
import React, { useEffect, useState } from "react";
import About from "./About";
import Settings from "./Settings";
import Login from "../../pages/Login";
import Signup from "../../pages/Signup";
import ContinueGamePrompt from "./ContinueGamePrompt";
import useGameSession from "../../hooks/useGameSession";
import useUIStore from "../../stores/uiStore";
import { useNavigate } from "react-router-dom";
import config from "../../config";

/**
 * ModalManager component - handles rendering of all application modals
 * Updated to check daily challenge completion status
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
  const closeContinueGamePrompt = useUIStore(
    (state) => state.closeContinueGamePrompt,
  );
  const openContinueGamePrompt = useUIStore(
    (state) => state.openContinueGamePrompt,
  );

  // Get game session functions - simplified API
  const {
    continueGame,
    startNewGame,
    events,
    subscribeToEvents,
    isDailyCompleted: checkDailyCompletion, // Add the daily completion check function
    startDailyChallenge, // Add the function to start daily challenge
  } = useGameSession();

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

  // Listen for active game notifications
  useEffect(() => {
    // Subscribe to the active game found event
    const unsubscribe = subscribeToEvents(events.ACTIVE_GAME_FOUND, (data) => {
      // Only show continue game prompt for authenticated users
      const isAuthenticated = !!config.session.getAuthToken();

      if (isAuthenticated && data && data.gameStats) {
        openContinueGamePrompt(data.gameStats);
      } else {
        console.log(
          "Active game found but user is not authenticated - bypassing continue prompt",
        );
        // For anonymous users, we don't show the modal at all
      }
    });

    return unsubscribe;
  }, [events, subscribeToEvents, openContinueGamePrompt]);

  // Simple handlers that delegate to game session
  const handleContinueGame = async () => {
    await continueGame();
    closeContinueGamePrompt();
  };

  const handleNewGame = async () => {
    await startNewGame();
    closeContinueGamePrompt();
  };

  // New handler for daily challenge button
  const handleDailyChallenge = async () => {
    closeContinueGamePrompt();
    // Navigate to daily challenge page
    navigate("/daily");
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
