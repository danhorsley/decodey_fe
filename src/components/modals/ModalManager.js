// src/components/modals/ModalManager.js
import React, { useState, useCallback, useEffect } from "react";
import About from "./About";
import Settings from "./Settings";
import Login from "../../pages/Login";
import Signup from "../../pages/Signup";
import ContinueGamePrompt from "./ContinueGamePrompt";
import apiService from "../../services/apiService";
import useGameStore from "../../stores/gameStore";
import useUIStore from "../../stores/uiStore";
import useSettingsStore from "../../stores/settingsStore";

/**
 * ModalManager component - handles rendering of all application modals
 * Now using Zustand with improved error handling
 */
const ModalManager = ({ children }) => {
  // Use individual selectors instead of destructuring to reduce re-renders
  // and make it easier to debug which property might be causing issues
  const isAboutOpen = useUIStore((state) => state.isAboutOpen);
  const isLoginOpen = useUIStore((state) => state.isLoginOpen);
  const isSignupOpen = useUIStore((state) => state.isSignupOpen);
  const isSettingsOpen = useUIStore((state) => state.isSettingsOpen);
  const isContinueGameOpen = useUIStore((state) => state.isContinueGameOpen);
  const activeGameStats = useUIStore((state) => state.activeGameStats);

  // Get modal actions
  const openContinueGamePrompt = useUIStore(
    (state) => state.openContinueGamePrompt,
  );
  const closeContinueGamePrompt = useUIStore(
    (state) => state.closeContinueGamePrompt,
  );
  const closeAbout = useUIStore((state) => state.closeAbout);
  const closeLogin = useUIStore((state) => state.closeLogin);
  const closeSignup = useUIStore((state) => state.closeSignup);
  const closeSettings = useUIStore((state) => state.closeSettings);

  // Get settings for game handling
  const settings = useSettingsStore((state) => state.settings);

  // Get game functions
  const continueSavedGame = useGameStore((state) => state.continueSavedGame);
  const resetAndStartNewGame = useGameStore(
    (state) => state.resetAndStartNewGame,
  );

  // Handle continue game action
  const handleContinueGame = useCallback(() => {
    console.log("Continue game clicked");

    try {
      if (typeof continueSavedGame === "function") {
        console.log("Continuing saved game...");
        continueSavedGame();
      } else {
        console.error("continueSavedGame is not a function", continueSavedGame);
      }

      // Always close the modal whether or not the action succeeded
      if (typeof closeContinueGamePrompt === "function") {
        closeContinueGamePrompt();
      }
    } catch (error) {
      console.error("Error in handleContinueGame:", error);
      // Still close the modal on error
      if (typeof closeContinueGamePrompt === "function") {
        closeContinueGamePrompt();
      }
    }
  }, [continueSavedGame, closeContinueGamePrompt]);

  // Handle new game action
  const handleNewGame = useCallback(() => {
    console.log("New game clicked");

    const startNewGame = async () => {
      try {
        console.log("Abandoning current game and starting new game...");

        // First try to abandon any existing game
        try {
          await apiService.api.delete("/api/abandon-game");
          console.log("Active game abandoned successfully");
        } catch (err) {
          console.warn("Error abandoning game, continuing with new game:", err);
        }

        // Start a new game
        if (typeof resetAndStartNewGame === "function") {
          console.log("Starting new game...");

          // Safely get settings
          const longText = settings?.longText === true;
          const hardcoreMode = settings?.hardcoreMode === true;

          // Start the new game
          resetAndStartNewGame(longText, hardcoreMode);
        } else {
          console.error(
            "resetAndStartNewGame is not a function",
            resetAndStartNewGame,
          );
        }
      } catch (error) {
        console.error("Error starting new game:", error);
      } finally {
        // Always close the modal
        if (typeof closeContinueGamePrompt === "function") {
          closeContinueGamePrompt();
        }
      }
    };

    // Call the function
    startNewGame();
  }, [resetAndStartNewGame, settings, closeContinueGamePrompt]);

  // Listen for active game detected events
  useEffect(() => {
    let activeGameSubscription;

    try {
      if (typeof openContinueGamePrompt === "function") {
        activeGameSubscription = apiService.on(
          "auth:active-game-detected",
          (data) => {
            console.log("Active game detected event received:", data);
            if (data && data.hasActiveGame) {
              openContinueGamePrompt(data.activeGameStats);
            }
          },
        );
      }
    } catch (error) {
      console.error("Error setting up active game subscription:", error);
    }

    return () => {
      if (activeGameSubscription) {
        activeGameSubscription();
      }
    };
  }, [openContinueGamePrompt]);

  // Check for active game when needed
  useEffect(() => {
    let checkActiveGameSubscription;

    try {
      checkActiveGameSubscription = apiService.on(
        "auth:active-game-check-needed",
        async () => {
          try {
            console.log("Checking for active game details...");
            const response = await apiService.api.get("/api/check-active-game");

            if (response && response.data && response.data.has_active_game) {
              console.log(
                "Active game found with stats:",
                response.data.game_stats,
              );
              apiService.events.emit("auth:active-game-detected", {
                hasActiveGame: true,
                activeGameStats: response.data.game_stats,
              });
            } else {
              console.log("No active game found or incomplete response");
            }
          } catch (error) {
            console.error("Error checking for active game:", error);
          }
        },
      );
    } catch (error) {
      console.error("Error setting up active game check subscription:", error);
    }

    return () => {
      if (checkActiveGameSubscription) {
        checkActiveGameSubscription();
      }
    };
  }, []);

  // Logging to help troubleshoot
  useEffect(() => {
    console.log("ModalManager rendered with state:", {
      isAboutOpen,
      isLoginOpen,
      isSignupOpen,
      isSettingsOpen,
      isContinueGameOpen,
    });
  }, [
    isAboutOpen,
    isLoginOpen,
    isSignupOpen,
    isSettingsOpen,
    isContinueGameOpen,
  ]);

  // Defensively render modals only when we have both the state and the close function
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
