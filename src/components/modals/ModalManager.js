// src/components/modals/ModalManager.js
import React, { useCallback, useEffect } from "react";
import About from "./About";
import Settings from "./Settings";
import Login from "../../pages/Login";
import Signup from "../../pages/Signup";
import ContinueGamePrompt from "./ContinueGamePrompt";
import useGameSession from "../../hooks/useGameSession";
import useGameStore from "../../stores/gameStore";
import useUIStore from "../../stores/uiStore";
import useSettingsStore from "../../stores/settingsStore";

/**
 * ModalManager component - handles rendering of all application modals
 * Now using our centralized gameSessionManager service
 */
const ModalManager = ({ children }) => {
  // Use individual selectors instead of destructuring to reduce re-renders
  const isAboutOpen = useUIStore((state) => state.isAboutOpen);
  const isLoginOpen = useUIStore((state) => state.isLoginOpen);
  const isSignupOpen = useUIStore((state) => state.isSignupOpen);
  const isSettingsOpen = useUIStore((state) => state.isSettingsOpen);
  const isContinueGameOpen = useUIStore((state) => state.isContinueGameOpen);
  const activeGameStats = useUIStore((state) => state.activeGameStats);

  // Get modal actions
  const closeContinueGamePrompt = useUIStore(
    (state) => state.closeContinueGamePrompt,
  );
  const closeAbout = useUIStore((state) => state.closeAbout);
  const closeLogin = useUIStore((state) => state.closeLogin);
  const closeSignup = useUIStore((state) => state.closeSignup);
  const closeSettings = useUIStore((state) => state.closeSettings);

  // Get settings for game handling
  const settings = useSettingsStore((state) => state.settings);

  // Get game session functions from our new hook
  const { continueGame, abandonCurrentAndStartNew, events, subscribeToEvents } =
    useGameSession();

  // Handle continue game action - now using our centralized service
  const handleContinueGame = useCallback(async () => {
    console.log("Continue game clicked");

    try {
      // Use our centralized service function
      const result = await continueGame();

      if (result.success) {
        console.log("Game continued successfully");
      } else {
        console.warn(
          "Failed to continue game:",
          result.reason || "Unknown reason",
        );
      }

      // Always close the modal
      if (typeof closeContinueGamePrompt === "function") {
        closeContinueGamePrompt();
      }
    } catch (error) {
      console.error("Error continuing game:", error);
      // Still close the modal on error
      if (typeof closeContinueGamePrompt === "function") {
        closeContinueGamePrompt();
      }
    }
  }, [continueGame, closeContinueGamePrompt]);

  // Handle new game action - now using our centralized service
  const handleNewGame = useCallback(async () => {
    console.log("New game clicked");

    try {
      // Use our centralized service function
      const result = await abandonCurrentAndStartNew();

      if (result.success) {
        console.log(
          "Started new game successfully after abandoning current one",
        );
      } else {
        console.warn(
          "Failed to start new game:",
          result.error || "Unknown error",
        );
      }

      // Always close the modal
      if (typeof closeContinueGamePrompt === "function") {
        closeContinueGamePrompt();
      }
    } catch (error) {
      console.error("Error starting new game:", error);
      // Still close the modal on error
      if (typeof closeContinueGamePrompt === "function") {
        closeContinueGamePrompt();
      }
    }
  }, [abandonCurrentAndStartNew, closeContinueGamePrompt]);

  // Set up event listeners from game session manager
  useEffect(() => {
    // Subscribe to active game found events
    const unsubscribeActiveGame = subscribeToEvents(
      events.ACTIVE_GAME_FOUND,
      (data) => {
        console.log("Active game found event received in ModalManager:", data);

        // Use UI store to show dialog (directly or through a helper function)
        const openContinueGamePrompt =
          useUIStore.getState().openContinueGamePrompt;
        if (typeof openContinueGamePrompt === "function") {
          openContinueGamePrompt(data.gameStats);
        }
      },
    );

    return () => {
      // Clean up subscriptions
      unsubscribeActiveGame();
    };
  }, [events, subscribeToEvents]);

  return (
    <>
      {/* Only render modals when their state is true and we have a close function */}
      {isAboutOpen && typeof closeAbout === "function" && (
        <About isOpen={true} onClose={closeAbout} />
      )}

      {isLoginOpen && typeof closeLogin === "function" && (
        <Login onClose={closeLogin} />
      )}

      {isSignupOpen && typeof closeSignup === "function" && (
        <Signup onClose={closeSignup} />
      )}

      {isSettingsOpen && typeof closeSettings === "function" && (
        <Settings onCancel={closeSettings} />
      )}

      {isContinueGameOpen && typeof closeContinueGamePrompt === "function" && (
        <ContinueGamePrompt
          isOpen={true}
          onClose={closeContinueGamePrompt}
          gameStats={activeGameStats || {}}
          onContinue={handleContinueGame}
          onNewGame={handleNewGame}
        />
      )}

      {/* Render children */}
      {children}
    </>
  );
};

export default ModalManager;
