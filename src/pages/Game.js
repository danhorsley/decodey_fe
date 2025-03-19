// src/pages/Game.js - Simplified with initialization delegation
import React, { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy } from "react-icons/fa";

// Simplified imports
import useGameStore from "../stores/gameStore";
import useGameSession from "../hooks/useGameSession";
import useSettingsStore from "../stores/settingsStore";
import useUIStore from "../stores/uiStore";
import useSound from "../services/WebAudioSoundManager";
import useKeyboardInput from "../hooks/KeyboardController";
import { formatAlternatingLines } from "../utils/utils";

// Component imports
import HeaderControls from "../components/HeaderControls";
import MobileLayout from "../components/layout/MobileLayout";
import WinCelebration from "../components/modals/WinCelebration";
import MatrixRainLoading from "../components/effects/MatrixRainLoading";

// Letter cell component using memo to reduce re-renders
const LetterCell = React.memo(
  ({
    letter,
    isSelected,
    isGuessed,
    isFlashing,
    frequency,
    onClick,
    disabled,
  }) => (
    <div
      className={`letter-cell ${isSelected ? "selected" : ""} ${isGuessed ? "guessed" : ""} ${isFlashing ? "flash" : ""}`}
      onClick={!disabled ? onClick : undefined}
    >
      {letter}
      {typeof frequency !== "undefined" && (
        <span className="frequency-indicator">{frequency}</span>
      )}
    </div>
  ),
);

function Game() {
  // Navigation hook
  const navigate = useNavigate();

  // Get initialization status from gameSession hook
  const { isInitializing, initializeGame, lastError } = useGameSession();
  // Get isResetting from gameStore to properly handle transitions
  const isResetting = useGameStore((state) => state.isResetting);

  // Settings
  const settings = useSettingsStore((state) => state.settings);

  // UI state for mobile/responsive
  const useMobileMode = useUIStore((state) => state.useMobileMode);
  const isLandscape = useUIStore((state) => state.isLandscape);

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
  // Auto-initialize on first render - the component calls initializeGame
  // once on mount via React.useEffect()
  React.useEffect(() => {
    // Immediately invoke the initialization, assuming the hook takes care of
    // preventing duplicate initializations
    initializeGame();
  }, [initializeGame]);

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
        submitGuess(selectedEncrypted, guessedLetter);
      }
    },
    [selectedEncrypted, submitGuess],
  );

  // Handle hint button click
  const onHintClick = useCallback(() => {
    if (typeof getHint === "function") {
      getHint().then((result) => {
        // Add any user feedback for hint failures if needed
        if (!result.success) {
          if (result.reason === "would-exceed-max-mistakes") {
            console.log("Hint would exceed max mistakes");
            // Could show a toast or flash the mistakes counter
          }
        }
      });
    }
  }, [getHint]);

  // Handle retry/restart game
  const handleStartNewGame = useCallback(() => {
    // Force a new game initialization
    initializeGame(true);
  }, [initializeGame]);

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
        submitGuess(selectedEncrypted, guessedLetter);
      }
    },
    playSound,
  });

  // Format the display text
  const formattedText = React.useMemo(() => {
    if (!encrypted || !display) return { __html: "" };
    return formatAlternatingLines(encrypted, display, true);
  }, [encrypted, display]);

  // ===== RENDER HELPERS =====
  // If loading, show loading screen
  if (isInitializing || isResetting) {
    return (
      <div
        className={`App-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
      >
        <HeaderControls title="uncrypt" />
        <div
          className={`loading-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
        >
          <h2 className="loading-title">
            {isResetting ? "Starting new game" : "Loading game"}
            <span className="loading-dots"></span>
          </h2>

          {/* Matrix Rain loading animation */}
          <div className="loading-animation">
            <MatrixRainLoading
              active={true}
              color={settings?.theme === "dark" ? "#4cc9f0" : "#00ff41"}
              message={
                isResetting
                  ? "Initializing new cipher..."
                  : "Decrypting data..."
              }
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
        <HeaderControls title="uncrypt" />
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
  const renderGameHeader = () => <HeaderControls title="uncrypt" />;

  // Text container component
  const renderTextContainer = () => (
    <div
      className={`text-container ${settings?.hardcoreMode ? "hardcore-mode" : ""}`}
    >
      <div
        className="alternating-text"
        dangerouslySetInnerHTML={formattedText}
      />
      {settings?.hardcoreMode && (
        <div className="hardcore-badge">HARDCORE MODE</div>
      )}
    </div>
  );

  // Grid components
  const renderGrids = () => (
    <div className="grids">
      {/* Encrypted grid */}
      <div className="encrypted-grid">
        {sortedEncryptedLetters.map((letter) => (
          <LetterCell
            key={letter}
            letter={letter}
            isSelected={selectedEncrypted === letter}
            isGuessed={correctlyGuessed.includes(letter)}
            isFlashing={lastCorrectGuess === letter}
            frequency={letterFrequency?.[letter] || 0}
            onClick={() => onEncryptedClick(letter)}
            disabled={!isGameActive}
          />
        ))}
      </div>

      {/* Guess grid */}
      <div className="guess-grid">
        {originalLetters.map((letter) => (
          <LetterCell
            key={letter}
            letter={letter}
            isGuessed={Object.values(guessedMappings || {}).includes(letter)}
            onClick={() => onGuessClick(letter)}
            disabled={!isGameActive || !selectedEncrypted}
          />
        ))}
      </div>
    </div>
  );

  // Controls component
  const renderControls = () => {
    return (
      <div className="controls">
        <div className="controls-main">
          <p>
            Mistakes: {mistakes}/{maxMistakes}
            {pendingHints > 0 && (
              <span className="pending-hint-indicator">
                {" "}
                (+{pendingHints} pending)
              </span>
            )}
          </p>
          <button
            onClick={onHintClick}
            disabled={disableHint}
            className={`hint-button ${isHintInProgress ? "processing" : ""}`}
          >
            {isHintInProgress ? "Getting Hint..." : "Hint (Costs 1 Mistake)"}
          </button>
        </div>
      </div>
    );
  };

  // Win/lose states
  const renderGameOver = () => {
    // Check for loss first, then win. This ensures that if somehow both flags are true,
    // loss takes precedence (logical since you can't win after losing)
    if (hasLost) {
      return (
        <div className="game-message">
          <p>Game Over! Too many mistakes.</p>
          <button onClick={handleStartNewGame}>Try Again</button>
        </div>
      );
    }

    if (hasWon) {
      return <WinCelebration playSound={playSound} winData={winData || {}} />;
    }

    return null;
  };

  // Leaderboard button
  const renderLeaderboardButton = () => (
    <button
      className="leaderboard-button-fixed"
      onClick={() => navigate("/leaderboard")}
      aria-label="Leaderboard"
    >
      <FaTrophy size={16} />
    </button>
  );

  // ===== MAIN RENDER =====
  // Use mobile layout if needed
  if (useMobileMode) {
    return (
      <div className="App-container">
        <MobileLayout isLandscape={isLandscape}>
          {renderGameHeader()}
          {renderTextContainer()}
          {renderGrids()}
          {renderControls()}
          {renderGameOver()}
        </MobileLayout>
      </div>
    );
  }

  // Standard desktop layout
  return (
    <div
      className={`App-container ${settings?.theme === "dark" ? "dark-theme" : ""}`}
    >
      {renderGameHeader()}
      {renderTextContainer()}
      {renderGrids()}
      {renderControls()}
      {renderGameOver()}
      {renderLeaderboardButton()}
    </div>
  );
}

export default Game;
