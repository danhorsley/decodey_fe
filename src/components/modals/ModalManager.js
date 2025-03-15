// src/components/modals/ModalManager.js
import React, { useState, useCallback, useContext, useEffect } from "react";
import About from "./About";
import Settings from "./Settings";
import Login from "../../pages/Login";
import Signup from "../../pages/Signup";
import ContinueGamePrompt from "./ContinueGamePrompt";
import apiService from "../../services/apiService";
import { useGameState } from "../../context/GameStateContext";
import { useSettings } from "../../context/SettingsContext";

// Create a modal context
const ModalContext = React.createContext({
  openAbout: () => {},
  closeAbout: () => {},
  openLogin: () => {},
  closeLogin: () => {},
  openSignup: () => {},
  closeSignup: () => {},
  openSettings: () => {},
  closeSettings: () => {},
  openContinueGamePrompt: () => {},
  closeContinueGamePrompt: () => {},
  isAboutOpen: false,
  isLoginOpen: false,
  isSignupOpen: false,
  isSettingsOpen: false,
  isContinueGameOpen: false,
});

// Export hook to use modal context
export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    console.warn("useModalContext must be used within a ModalProvider!");
    // Return a default object to prevent app crashes
    return {
      openAbout: () => console.warn("Modal context not available"),
      closeAbout: () => console.warn("Modal context not available"),
      openLogin: () => console.warn("Modal context not available"),
      closeLogin: () => console.warn("Modal context not available"),
      openSignup: () => console.warn("Modal context not available"),
      closeSignup: () => console.warn("Modal context not available"),
      openSettings: () => console.warn("Modal context not available"),
      closeSettings: () => console.warn("Modal context not available"),
      openContinueGamePrompt: () => console.warn("Modal context not available"),
      closeContinueGamePrompt: () =>
        console.warn("Modal context not available"),
      isAboutOpen: false,
      isLoginOpen: false,
      isSignupOpen: false,
      isSettingsOpen: false,
      isContinueGameOpen: false,
    };
  }
  return context;
};

// Modal manager component
const ModalManager = ({ children }) => {
  // Modal states
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isContinueGameOpen, setIsContinueGameOpen] = useState(false);
  const [activeGameStats, setActiveGameStats] = useState(null);

  // Get required functions from contexts
  const { settings } = useSettings();
  const { startGame, continueSavedGame } = useGameState();

  // Modal functions
  const openAbout = useCallback(() => {
    setIsAboutOpen(true);
  }, []);

  const closeAbout = useCallback(() => {
    setIsAboutOpen(false);
  }, []);

  const openLogin = useCallback(() => {
    setIsSignupOpen(false); // Close signup if open
    setIsLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setIsLoginOpen(false);
  }, []);

  const openSignup = useCallback(() => {
    setIsLoginOpen(false); // Close login if open
    setIsSignupOpen(true);
  }, []);

  const closeSignup = useCallback(() => {
    setIsSignupOpen(false);
  }, []);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // Continue game modal functions
  const openContinueGamePrompt = useCallback((gameStats) => {
    console.log("Opening continue game prompt with stats:", gameStats);
    setActiveGameStats(gameStats);
    setIsContinueGameOpen(true);
  }, []);

  const closeContinueGamePrompt = useCallback(() => {
    setIsContinueGameOpen(false);
    setActiveGameStats(null);
  }, []);

  // Game action handlers
  const handleContinueGame = useCallback(() => {
    if (typeof continueSavedGame === "function") {
      console.log("Continuing saved game...");
      continueSavedGame();
    } else {
      console.error("continueSavedGame is not a function");
    }
    closeContinueGamePrompt();
  }, [continueSavedGame, closeContinueGamePrompt]);

  const handleNewGame = useCallback(() => {
    // First, abandon the current active game
    const abandonActiveGame = async () => {
      try {
        console.log("Abandoning current active game...");
        // Call the abandon-game endpoint
        await apiService.api.delete("/api/abandon-game");
        console.log("Active game abandoned successfully");

        // Then start a new game
        if (typeof startGame === "function") {
          console.log("Starting new game...");
          // Get current settings
          const longText = settings?.longText === true;
          const hardcoreMode = settings?.hardcoreMode === true;

          // Start a new game
          startGame(longText, hardcoreMode);
        } else {
          console.error("startGame is not a function");
        }
      } catch (error) {
        console.error("Error abandoning active game:", error);
        // Even if abandoning fails, try to start a new game
        if (typeof startGame === "function") {
          startGame(
            settings?.longText === true,
            settings?.hardcoreMode === true,
          );
        }
      }

      // Close the modal regardless
      closeContinueGamePrompt();
    };

    // Call the function
    abandonActiveGame();
  }, [startGame, closeContinueGamePrompt, settings]);

  // Listen for active game detected events
  useEffect(() => {
    const activeGameSubscription = apiService.on(
      "auth:active-game-detected",
      (data) => {
        console.log("Active game detected event received:", data);
        if (data.hasActiveGame) {
          openContinueGamePrompt(data.activeGameStats);
        }
      },
    );

    return () => {
      activeGameSubscription();
    };
  }, [openContinueGamePrompt]);
  //debug for active game
  useEffect(() => {
    const checkActiveGameSubscription = apiService.on(
      "auth:active-game-check-needed",
      async () => {
        try {
          console.log(
            "🔍 ModalManager: Active game check needed event received",
          );

          // FIX: Use the correct API path - it should match the backend route
          // Change from: "/check-active-game" to "/api/check-active-game"
          console.log("Making API call to /api/check-active-game");
          const response = await apiService.api.get("/api/check-active-game");

          console.log("✅ API response received:", response.data);

          if (response.data && response.data.has_active_game) {
            console.log(
              "📣 Emitting active-game-detected event with stats:",
              response.data.game_stats,
            );
            apiService.events.emit("auth:active-game-detected", {
              hasActiveGame: true,
              activeGameStats: response.data.game_stats,
            });
          } else {
            console.log("❌ No active game found in response:", response.data);
          }
        } catch (error) {
          console.error("🔥 Error checking for active game:", error);
        }
      },
    );

    const activeGameSubscription = apiService.on(
      "auth:active-game-detected",
      (data) => {
        console.log(
          "🎮 ModalManager: Active game detected event received:",
          data,
        );
        if (data.hasActiveGame) {
          console.log(
            "🔔 Opening continue game prompt with stats:",
            data.activeGameStats,
          );
          openContinueGamePrompt(data.activeGameStats);
        }
      },
    );

    return () => {
      console.log("Cleaning up ModalManager event listeners");
      checkActiveGameSubscription();
      activeGameSubscription();
    };
  }, [openContinueGamePrompt]);
  // Check for active game when needed (separate from login)
  useEffect(() => {
    const checkActiveGameSubscription = apiService.on(
      "auth:active-game-check-needed",
      async () => {
        try {
          console.log("Checking for active game details...");
          const response = await apiService.api.get("/check-active-game");

          if (response.data && response.data.has_active_game) {
            console.log(
              "Active game found with stats:",
              response.data.game_stats,
            );
            apiService.events.emit("auth:active-game-detected", {
              hasActiveGame: true,
              activeGameStats: response.data.game_stats,
            });
          } else {
            console.log(
              "No active game found or incomplete response:",
              response.data,
            );
          }
        } catch (error) {
          console.error("Error checking for active game:", error);
        }
      },
    );

    return () => {
      checkActiveGameSubscription();
    };
  }, []);

  // Context value - include state flags for checking in components
  const contextValue = {
    // Functions
    openAbout,
    closeAbout,
    openLogin,
    closeLogin,
    openSignup,
    closeSignup,
    openSettings,
    closeSettings,
    openContinueGamePrompt,
    closeContinueGamePrompt,

    // State flags
    isAboutOpen,
    isLoginOpen,
    isSignupOpen,
    isSettingsOpen,
    isContinueGameOpen,

    // Also add these aliases to support both naming conventions
    showAbout: openAbout,
    showLogin: openLogin,
    showSignup: openSignup,
    showSettings: openSettings,
    showContinueGamePrompt: openContinueGamePrompt,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {/* Only render each modal when its state is true */}
      {isAboutOpen && <About isOpen={true} onClose={closeAbout} />}
      {isLoginOpen && <Login onClose={closeLogin} />}
      {isSignupOpen && <Signup onClose={closeSignup} />}
      {isSettingsOpen && <Settings onCancel={closeSettings} />}
      {isContinueGameOpen && (
        <ContinueGamePrompt
          isOpen={true}
          onClose={closeContinueGamePrompt}
          gameStats={activeGameStats}
          onContinue={handleContinueGame}
          onNewGame={handleNewGame}
        />
      )}

      {/* Render children */}
      {children}
    </ModalContext.Provider>
  );
};

export default ModalManager;
