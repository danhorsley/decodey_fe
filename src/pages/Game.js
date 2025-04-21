// src/pages/Game.js
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// Import our new UI components
import SlideMenu from "../components/SlideMenu";
import CompactHeader from "../components/CompactHeader";
import GameDashboard from "../components/GameDashboard";

// Import stores and hooks
import useGameStore from "../stores/gameStore";
import useGameService from "../hooks/useGameService"; // New simplified game service hook
import useSettingsStore from "../stores/settingsStore";
import useUIStore from "../stores/uiStore";
import useSound from "../services/WebAudioSoundManager";
import useKeyboardInput from "../hooks/KeyboardController";
import config from "../config";
import MobileLayout from "../components/layout/MobileLayout";
import WinCelebration from "../components/modals/WinCelebration";
import MatrixRainLoading from "../components/effects/MatrixRainLoading";
import TuneableTextDisplay from "../components/TuneableTextDisplay";
import TutorialOverlay from "../components/TutorialOverlay";

// Game component - the main gameplay screen
const Game = () => {
  // React Router location for checking route params
  const location = useLocation();

  // Get game state from store
  const {
    game,
    text,
    keyPairs,
    solved,
    mistakesLeft,
    gameOver,
    showWin,
    symbols,
    secondsElapsed,
    hintUsed,
    difficulty,
    hasGameLoaded,
    loading: gameStateLoading,
  } = useGameStore((state) => state);

  // Get mobile detection state
  const useMobileMode = useUIStore((state) => state.useMobileMode);

  // Get UI state
  const {
    showSideMenu,
    toggleSideMenu,
    showGameOver,
    showResetConfirmation,
    openResetConfirmation,
    openSettings,
  } = useUIStore((state) => state);

  // Get settings from store
  const settings = useSettingsStore((state) => state.settings);

  // State for controlling tutorial
  const [showTutorial, setShowTutorial] = useState(false);

  // State for controlling loading spinner
  const [isLoading, setIsLoading] = useState(true);

  // Get initialization status and events from our new gameService hook
  const {
    isInitializing,
    error: lastError,
    initializeGame,
    startDailyChallenge,
    onEvent,
    events
  } = useGameService();

  // Check if this is a daily challenge or an already completed daily challenge
  const isDailyFromRoute = location.state?.dailyChallenge === true;
  const dailyCompleted = location.state?.dailyCompleted === true;
  const dailyCompletionData = location.state?.completionData;

  // State for showing daily completion notification
  const [showDailyCompletionNotice, setShowDailyCompletionNotice] = useState(dailyCompleted);

  // Effect to handle daily completion notification
  useEffect(() => {
    if (dailyCompleted && dailyCompletionData) {
      setShowDailyCompletionNotice(true);

      // Hide after 5 seconds
      const timer = setTimeout(() => {
        setShowDailyCompletionNotice(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [dailyCompleted, dailyCompletionData]);

  useEffect(() => {
    const handleOrientationChange = () => {
      // Force a re-render by updating a local state
      // This is only needed if you notice components not updating properly
      console.log("Game component detected orientation change");
    };

    // Listen to both native and custom orientation change events
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("app:orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener(
        "app:orientationchange",
        handleOrientationChange,
      );
    };
  }, []);

  // Handle logout transition with our simplified event system
  useEffect(() => {
    // Listen for logout events
    const unsubscribeLogout = onEvent(events.LOGOUT_TRANSITION, () => {
      // Reset any authenticated-user specific state
      console.log("Logout transition event received in Game.js");
      const gameStore = useGameStore.getState();
      if (typeof gameStore.resetGame === "function") {
        gameStore.resetGame();
      }
    });

    // Listen for game state changes (includes anonymous transitions)
    const unsubscribeStateChange = onEvent(events.STATE_CHANGED, (data) => {
      console.log("Game state changed event received in Game.js", data);
      if (data && data.source === "logout-transition") {
        // A new game was started after logout
        const gameStore = useGameStore.getState();
        console.log("Starting anonymous game after logout");
        gameStore.startGame(
          false, // longText
          false, // hardcoreMode
          true,  // forceNew
          false, // isDaily
        );
      }
    });

    return () => {
      unsubscribeLogout();
      unsubscribeStateChange();
    };
  }, [onEvent, events]);
  const initializedRef = useRef(false);
  // Auto-initialize on first render with our simplified approach
  useEffect(() => {
    // Create ref to prevent multiple initializations

    const performInitialization = async () => {
      // Only initialize once
      if (initializedRef.current) {
        console.log("Game already initialized, skipping");
        return;
      }

      // Set flag immediately
      initializedRef.current = true;
      console.log("Starting game initialization in Game.js useEffect");

      try {
        // Check if we're dealing with daily completion notification
        if (dailyCompleted) {
          console.log("Daily challenge already completed - initializing standard game");
          await initializeGame({ skipDailyCheck: true });
          return;
        }

        // Handle explicit daily challenge requests
        if (isDailyFromRoute) {
          console.log("Explicitly requested daily challenge - initializing");
          await startDailyChallenge();
          return;
        }

        // For everything else, let the service handle the logic
        await initializeGame();
      } catch (err) {
        console.error("Game initialization failed:", err);
      }
    };

    performInitialization();
  }, []);

  // Detect tutorial settings on mount
  useEffect(() => {
    // Check local storage to see if tutorial has been shown
    const tutorialCompleted = localStorage.getItem("tutorial-completed") === "true";
    const tutorialStarted = localStorage.getItem("tutorial-started") === "true";

    if (!tutorialCompleted && !tutorialStarted) {
      // Set local storage to indicate tutorial has been started
      localStorage.setItem("tutorial-started", "true");
      setShowTutorial(true);
    }
  }, []);

  // Sound effects
  const { playSound } = useSound();

  // Clear loading state when game is loaded
  useEffect(() => {
    if (hasGameLoaded) {
      // Add a slight delay to ensure all components have updated
      const timer = setTimeout(() => {
        setIsLoading(false);
        playSound("gameStart");
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [hasGameLoaded, playSound]);

  // ========================
  // Keyboard input handling
  // ========================

  // Use the keyboard controller hook to handle input
  const { handleKeyPress } = useKeyboardInput();

  // =======================
  // Game actions and utils
  // =======================

  // Handle when user completes the tutorial
  const handleTutorialComplete = () => {
    setShowTutorial(false);
    localStorage.setItem("tutorial-completed", "true");
  };

  // ========================
  // Rendering of components
  // ========================

  // Handle loading state
  if (isLoading || !hasGameLoaded) {
    return (
      <div className="loading-overlay">
        <MatrixRainLoading />
      </div>
    );
  }

  // Game over screen
  const renderGameOver = () => {
    if (showGameOver) {
      return (
        <div className="game-over-screen">
          <h2>GAME OVER</h2>
          <p>The code remains unbroken.</p>
          <p>Your progress: {Math.floor((solved.length / symbols.length) * 100)}%</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      );
    }

    if (showWin) {
      return <WinCelebration />;
    }

    return null;
  };

  // Render the game header (top bar)
  const renderGameHeader = () => {
    return (
      <CompactHeader
        toggleSideMenu={toggleSideMenu}
        openSettings={openSettings}
        openResetConfirmation={openResetConfirmation}
        time={secondsElapsed}
        mistakesLeft={mistakesLeft}
        difficulty={difficulty}
        openModal={() => {}}
        hintUsed={hintUsed}
      />
    );
  };

  // Render the controls panel (bottom section)
  const renderControls = () => {
    return (
      <GameDashboard
        keyPairs={keyPairs}
        solved={solved}
        mistakesLeft={mistakesLeft}
        onKeyPress={handleKeyPress}
        gameOver={gameOver}
      />
    );
  };

  // Render the text container
  const renderTextContainer = () => {
    // Use TuneableTextDisplay for the main text area
    return (
      <TuneableTextDisplay
        text={text}
        keyPairs={keyPairs}
        solved={solved}
        settings={settings}
      />
    );
  };

  // Daily challenge completion notice
  const renderDailyCompletionNotice = () => {
    if (!showDailyCompletionNotice || !dailyCompletionData) return null;

    // Format time for display
    const formatTime = (seconds) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    };

    return (
      <div className="daily-completion-notice">
        <div className="notice-content">
          <h3>Today's Daily Challenge</h3>
          <p>You've already completed today's challenge!</p>
          {dailyCompletionData && (
            <div className="completion-stats">
              <p>Score: <strong>{dailyCompletionData.score}</strong></p>
              <p>Time: {formatTime(dailyCompletionData.time_taken)}</p>
            </div>
          )}
          <button onClick={() => setShowDailyCompletionNotice(false)}>
            Dismiss
          </button>
        </div>
      </div>
    );
  };

  // ===== MAIN RENDER =====
  // Determine if we should use mobile layout - UPDATED VERSION
  if (useMobileMode) {
    // console.log("Rendering mobile layout"); // Debug log
    return (
      <div className="App-container mobile-mode">
        <MobileLayout>
          {renderGameHeader()}
          {renderTextContainer()}
          {renderControls()}
          {renderGameOver()}
          {renderDailyCompletionNotice()}
        </MobileLayout>
        {showTutorial && (
          <TutorialOverlay onComplete={handleTutorialComplete} />
        )}
      </div>
    );
  }

  // Standard desktop layout - also using new components
  return (
    <div
      className={`App-container ${settings?.theme === "dark" ? "dark-theme" : ""}`}
    >
      {renderGameHeader()}
      {renderTextContainer()}
      {renderControls()}
      {renderGameOver()}
      {renderDailyCompletionNotice()}
      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}
    </div>
  );
};

export default Game;