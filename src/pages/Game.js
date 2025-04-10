import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Import our new UI components
import SlideMenu from "../components/SlideMenu";
import CompactHeader from "../components/CompactHeader";
import GameDashboard from "../components/GameDashboard";

// Import stores and hooks
import useGameStore from "../stores/gameStore";
import useGameSession from "../hooks/useGameSession";
import useSettingsStore from "../stores/settingsStore";
import useAuthStore from "../stores/authStore";
import useUIStore from "../stores/uiStore";
import useSound from "../services/WebAudioSoundManager";
import useKeyboardInput from "../hooks/KeyboardController";
import { formatAlternatingLines } from "../utils/utils";
import config from "../config";
import MobileLayout from "../components/layout/MobileLayout";
import WinCelebration from "../components/modals/WinCelebration";
import MatrixRainLoading from "../components/effects/MatrixRainLoading";

// Format the display text

function Game() {
  // Navigation hook
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  // Location hook to get state from routing
  const location = useLocation();

  // Slide menu state - NEW
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);

  // Check if this is a daily challenge (passed from DailyChallenge component)
  const isDailyFromRoute = location.state?.dailyChallenge === true;

  // Get initialization status and events from gameSession hook
  const {
    isInitializing,
    initializeGame,
    startDailyChallenge,
    lastError,
    subscribeToEvents,
  } = useGameSession();

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

  // Handle logout transition
  useEffect(() => {
    const unsubscribe = subscribeToEvents("auth:logout-transition", () => {
      // Reset any authenticated-user specific state
      console.log("auth:logout-transition event received in Game.js");
      const gameStore = useGameStore.getState();
      if (typeof gameStore.resetGame === "function") {
        gameStore.resetGame();
      }
    });

    // Handle anonymous transition
    const unsubscribeAnon = subscribeToEvents(
      "game:anonymous-transition",
      (result) => {
        console.log(
          "game:anonymous-transition event received in Game.js",
          result,
        );
        if (result && result.success && result.gameData) {
          // Start new anonymous game with the received data
          const gameStore = useGameStore.getState();
          console.log("Starting anonymous game after logout");
          gameStore.startGame(
            false, // longText
            false, // hardcoreMode
            true, // forceNew
            false, // isDaily
          );
        }
      },
    );

    return () => {
      unsubscribe();
      unsubscribeAnon();
    };
  }, [subscribeToEvents]);
  // Get isResetting from gameStore to properly handle transitions
  const isResetting = useGameStore((state) => state.isResetting);

  // Settings
  const settings = useSettingsStore((state) => state.settings);

  // UI state for mobile/responsive
  const useMobileMode = useUIStore((state) => state.useMobileMode);

  // Modal states
  const isLoginOpen = useUIStore((state) => state.isLoginOpen);
  const isSignupOpen = useUIStore((state) => state.isSignupOpen);
  const isSettingsOpen = useUIStore((state) => state.isSettingsOpen);
  const isAboutOpen = useUIStore((state) => state.isAboutOpen);
  const isContinueGameOpen = useUIStore((state) => state.isContinueGameOpen);

  // Sound
  const { playSound } = useSound();

  // Game state - read only what we need
  const {
    encrypted,
    display,
    mistakes,
    maxMistakes,
    correctlyGuessed,
    selectedEncrypted,
    lastCorrectGuess,
    letterFrequency,
    originalLetters,
    guessedMappings,
    hasWon,
    hasLost,
    winData,

    // Actions
    submitGuess,
    handleEncryptedSelect,
    getHint,
  } = useGameStore();

  // Hint-specific state - moved to top level
  const isHintInProgress = useGameStore((state) => state.isHintInProgress);
  const pendingHints = useGameStore((state) => state.pendingHints);

  // Game flag states
  const hardcoreMode = useGameStore((state) => state.hardcoreMode);
  const isDailyChallenge = useGameStore((state) => state.isDailyChallenge);

  // Auto-initialize on first render - the component calls initializeGame
  // once on mount via React.useEffect()
  useEffect(() => {
    // Check if this is a daily challenge from route state or anonymous user
    const isAnonymous = !config.session.getAuthToken();

    if (isDailyFromRoute || isAnonymous) {
      console.log("Initializing daily challenge");
      startDailyChallenge();
    } else {
      // Standard game initialization for authenticated users
      console.log("Initializing standard game");
      initializeGame();
    }
  }, [initializeGame, startDailyChallenge, isDailyFromRoute]);

  // ===== GAME INTERACTION HANDLERS =====
  // Handle encrypted letter selection
  const onEncryptedClick = useCallback(
    (letter) => {
      if (typeof handleEncryptedSelect === "function") {
        handleEncryptedSelect(letter);
        playSound?.("keyclick");
      }
    },
    [handleEncryptedSelect, playSound],
  );

  // Handle guess letter selection
  const onGuessClick = useCallback(
    (guessedLetter) => {
      if (selectedEncrypted && typeof submitGuess === "function") {
        submitGuess(selectedEncrypted, guessedLetter).then((result) => {
          if (result.success) {
            console.log("guess result : ", result);
            if (result.isCorrect) {
              playSound?.("correct");
            } else if (result.isIncorrect) {
              playSound?.("incorrect");
            }

            if (result.hasLost) {
              playSound?.("lose");
            }
          }
        });
      }
    },
    [selectedEncrypted, submitGuess, playSound],
  );

  // Handle hint button click
  const onHintClick = useCallback(() => {
    if (typeof getHint === "function") {
      getHint().then((result) => {
        if (result.success) {
          playSound?.("hint");
        }

        // Add any user feedback for hint failures if needed
        if (!result.success) {
          if (result.reason === "would-exceed-max-mistakes") {
            console.log("Hint would exceed max mistakes");
            // Could show a toast or flash the mistakes counter
          }
        }
      });
    }
  }, [getHint, playSound]);

  // Handle retry/restart game
  const handleStartNewGame = useCallback(() => {
    // Use the more comprehensive reset and start function from gameStore
    const resetAndStart = useGameStore.getState().resetAndStartNewGame;
    if (typeof resetAndStart === "function") {
      // Use settings from the store
      const settingsStore = useSettingsStore.getState();

      // Set isResetting flag before the reset
      useGameStore.getState().resetGame();

      // Force a UI refresh by setting state
      // setForceRefresh((prevState) => !prevState); // Add this state variable if needed

      resetAndStart(
        settingsStore.settings?.longText || false,
        settingsStore.settings?.hardcoreMode || false,
        {
          forceRender: true, // Add a flag we can check for forcing updates
          customGameRequested: true, // Ensure we get a custom game
        },
      );
    }
  }, []);

  // ===== DERIVED STATE =====
  // Determine if game is active - computed value
  const isGameActive =
    !!encrypted && !hasWon && !hasLost && mistakes < maxMistakes;

  // Any modal open check for keyboard handling
  const anyModalOpen =
    isLoginOpen ||
    isSignupOpen ||
    isSettingsOpen ||
    isAboutOpen ||
    isContinueGameOpen ||
    hasWon ||
    hasLost;

  // Enable keyboard input only when appropriate - a game is active, no modals are open, and we're not initializing
  const keyboardEnabled = isGameActive && !anyModalOpen && !isInitializing;

  // Get sorted encrypted letters for display
  const sortedEncryptedLetters = React.useMemo(() => {
    if (!encrypted) return [];

    // Extract unique letters from encrypted text
    const encryptedLetters = [...new Set(encrypted.match(/[A-Z]/g) || [])];

    // Sort if needed based on settings
    return settings?.gridSorting === "alphabetical"
      ? [...encryptedLetters].sort()
      : encryptedLetters;
  }, [encrypted, settings?.gridSorting]);

  const effectiveMistakes = mistakes + pendingHints;
  const remainingMistakes = maxMistakes - effectiveMistakes;

  const disableHint =
    !isGameActive || isHintInProgress || remainingMistakes <= 1;

  // Setup keyboard input with more explicit callbacks
  useKeyboardInput({
    enabled: keyboardEnabled,
    speedMode: true,
    encryptedLetters: Array.isArray(sortedEncryptedLetters)
      ? sortedEncryptedLetters
      : [],
    originalLetters: Array.isArray(originalLetters) ? originalLetters : [],
    selectedEncrypted,
    onEncryptedSelect: (letter) => {
      if (keyboardEnabled && typeof handleEncryptedSelect === "function") {
        handleEncryptedSelect(letter);
        playSound?.("keyclick");
      }
    },
    onGuessSubmit: (guessedLetter) => {
      if (
        keyboardEnabled &&
        selectedEncrypted &&
        typeof submitGuess === "function"
      ) {
        submitGuess(selectedEncrypted, guessedLetter).then((result) => {
          if (result.success) {
            if (result.isCorrect) {
              playSound?.("correct");
            } else if (result.isIncorrect) {
              playSound?.("incorrect");
            }

            if (result.hasLost) {
              playSound?.("lose");
            }
          }
        });
      }
    },
    playSound,
  });

  const formattedText = React.useMemo(() => {
    if (!encrypted || !display) return { __html: "" };
    return formatAlternatingLines(encrypted, display, true);
  }, [encrypted, display]);

  // Determine quote length class for responsive text sizing
  const quoteClasses = React.useMemo(() => {
    if (!encrypted) return "";

    // Count visible characters in the encrypted text (ignoring spaces and punctuation)
    const visibleCharCount = encrypted.length;

    if (visibleCharCount > 70) return "quote-very-long";
    if (visibleCharCount > 60) return "quote-long";
    if (visibleCharCount > 50) return "quote-medium";
    return "";
  }, [encrypted]);

  // ===== RENDER HELPERS =====
  // If loading, show loading screen
  if (isInitializing || isResetting) {
    return (
      <div
        className={`App-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
      >
        <CompactHeader
          title="decodey"
          toggleMenu={toggleMenu}
          isDailyChallenge={isDailyChallenge}
        />
        <SlideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <div
          className={`loading-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
        >
          {/* Matrix Rain loading animation */}
          <div className="loading-animation">
            <MatrixRainLoading
              active={true}
              color={settings?.theme === "dark" ? "#4cc9f0" : "#00ff41"}
              message={isResetting ? "Starting new game..." : "Loading game..."}
              width="100%"
              height="100%"
              density={40}
            />
          </div>
        </div>
      </div>
    );
  }

  // If error or no game loaded, show error screen
  if (!encrypted && !isInitializing) {
    return (
      <div
        className={`App-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
      >
        <CompactHeader
          title="decodey"
          toggleMenu={toggleMenu}
          isDailyChallenge={isDailyChallenge}
        />
        <SlideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <div
          className={`error-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
        >
          <h2 className="error-title">Game Failed to Load</h2>

          <p className="error-message">
            {lastError?.message || "There was a problem loading the game data."}
          </p>

          <button onClick={handleStartNewGame} className="try-again-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ===== UI COMPONENTS =====
  // Game header component
  const renderGameHeader = () => (
    <>
      {/* Updated CompactHeader with both isDailyChallenge and hardcoreMode props */}
      <CompactHeader
        title="decodey"
        toggleMenu={toggleMenu}
        isDailyChallenge={isDailyChallenge}
        hardcoreMode={hardcoreMode}
      />

      {/* Slide menu */}
      <SlideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );

  // Text container component - simplified for better mobile display
  const renderTextContainer = () => (
    <div
      className={`text-container ${hardcoreMode ? "hardcore-mode" : ""} ${quoteClasses}`}
    >
      <div
        className="alternating-text"
        dangerouslySetInnerHTML={formattedText}
      />
    </div>
  );

  // Grid components - simplified for both mobile and desktop
  const renderControls = () => (
    <GameDashboard
      mistakes={mistakes}
      maxMistakes={maxMistakes}
      pendingHints={pendingHints}
      onHintClick={onHintClick}
      disableHint={disableHint}
      isHintInProgress={isHintInProgress}
      sortedEncryptedLetters={sortedEncryptedLetters}
      selectedEncrypted={selectedEncrypted}
      correctlyGuessed={correctlyGuessed}
      lastCorrectGuess={lastCorrectGuess}
      letterFrequency={letterFrequency}
      onEncryptedClick={onEncryptedClick}
      isGameActive={isGameActive}
      originalLetters={originalLetters}
      guessedMappings={guessedMappings}
      onGuessClick={onGuessClick}
      hasLost={hasLost}
      onStartNewGame={handleStartNewGame}
    />
  );

  // Win/lose states
  const renderGameOver = () => {
    // Handle both win and loss scenarios with the same component
    if (hasWon || hasLost) {
      // Create win data object with necessary props for both states
      const gameOverData = {
        ...winData,
        hasLost: hasLost,
        // Make sure we include important data needed for either state
        score: winData?.score || 0,
        mistakes: mistakes,
        maxMistakes: maxMistakes,
        gameTimeSeconds: winData?.gameTimeSeconds || 0,
        encrypted: encrypted,
        display: display,
        correctlyGuessed: correctlyGuessed, // Add correctly guessed letters for percentage calculation
        hardcoreMode: hardcoreMode,
        // Add callback for Play Again button
        onPlayAgain: handleStartNewGame,
      };

      return <WinCelebration playSound={playSound} winData={gameOverData} />;
    }
    return null;
  };

  // ===== MAIN RENDER =====
  // Determine if we should use mobile layout - UPDATED VERSION
  if (useMobileMode) {
    console.log("Rendering mobile layout"); // Debug log
    return (
      <div className="App-container mobile-mode">
        <MobileLayout>
          {renderGameHeader()}
          {renderTextContainer()}
          {renderControls()}
          {renderGameOver()}
        </MobileLayout>
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
    </div>
  );
}

export default Game;
