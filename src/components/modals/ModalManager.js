// src/components/modals/ModalManager.js - Simplified to focus on UI responsibilities
import React, { useEffect } from "react";
import About from "./About";
import Settings from "./Settings";
import Login from "../../pages/Login";
import Signup from "../../pages/Signup";
import ContinueGamePrompt from "./ContinueGamePrompt";
import useGameSession from "../../hooks/useGameSession";
import useUIStore from "../../stores/uiStore";

/**
 * ModalManager component - handles rendering of all application modals
 * Reduced to focus purely on UI responsibilities
 */
const ModalManager = ({ children }) => {
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
  const { continueGame, startNewGame, events, subscribeToEvents } =
    useGameSession();

  // Listen for active game notifications
  useEffect(() => {
    // Subscribe to the active game found event
    const unsubscribe = subscribeToEvents(events.ACTIVE_GAME_FOUND, (data) => {
      if (data && data.gameStats) {
        openContinueGamePrompt(data.gameStats);
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
        />
      )}

      {/* Render children */}
      {children}
    </>
  );
};

export default ModalManager;
