// src/pages/Game.js - Complete Rewrite with Clean Architecture
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy } from "react-icons/fa";

// Simplified imports - only what we need
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
import MatrixRain from "../components/effects/MatrixRain";
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

  // Core game session management - single source of truth for game initialization
  const { initialize, isInitializing, lastError } = useGameSession();

  // UI state
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    errorMessage: null,
    attemptCount: 0,
  });

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
    isLocalWinDetected,

    // Actions
    submitGuess,
    handleEncryptedSelect,
    getHint,
  } = useGameStore();

  // ===== INITIALIZATION =====
  // Simple initialization effect - delegate all complexity to gameSession
  useEffect(() => {
    // Only initialize if we don't have game content and aren't already initializing
    if (!encrypted && !isInitializing && !loadingState.isLoading) {
      console.log("Game component triggering initialization");

      // Show loading state - create a new state object for proper immutability
      setLoadingState((prevState) => ({
        ...prevState,
        isLoading: true,
        errorMessage: null,
        attemptCount: prevState.attemptCount + 1,
      }));

      // Initialize via gameSession - the single source of truth for game init
      initialize()
        .then((result) => {
          console.log("Game initialization completed with result:", result);

          if (result.success) {
            setLoadingState((prevState) => ({
              ...prevState,
              isLoading: false,
              errorMessage: null,
            }));
          } else {
            console.warn(
              "Game initialization failed:",
              result.error || "Unknown error",
            );
            setLoadingState((prevState) => ({
              ...prevState,
              isLoading: false,
              errorMessage:
                result.error?.message ||
                "Failed to start game. Please try again.",
            }));
          }
        })
        .catch((error) => {
          console.error("Error in game initialization:", error);
          setLoadingState((prevState) => ({
            ...prevState,
            isLoading: false,
            errorMessage: `Error starting game: ${error.message || "Unknown error"}`,
          }));
        });
    }
  }, [
    encrypted,
    isInitializing,
    loadingState.isLoading,
    loadingState.attemptCount,
    initialize,
  ]);

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
      getHint();
    }
  }, [getHint]);

  // Handle retry/restart game
  const handleStartNewGame = useCallback(() => {
    setLoadingState({
      isLoading: true,
      errorMessage: null,
      attemptCount: loadingState.attemptCount + 1,
    });

    // Force a new game initialization
    initialize(true)
      .then((result) => {
        setLoadingState((prev) => ({
          ...prev,
          isLoading: false,
          errorMessage: result.success ? null : "Failed to start new game",
        }));
      })
      .catch((error) => {
        console.error("Error starting new game:", error);
        setLoadingState((prev) => ({
          ...prev,
          isLoading: false,
          errorMessage: `Error starting game: ${error.message}`,
        }));
      });
  }, [initialize, loadingState.attemptCount]);

  // ===== DERIVED STATE =====
  // Determine if game is active - computed value
  const isGameActive =
    !!encrypted && !hasWon && !hasLost && mistakes < maxMistakes;

  // Any modal open check for keyboard handling
  const anyModalOpen =
    isLoginOpen || isSignupOpen || isSettingsOpen || isAboutOpen;

  // Enable keyboard input only when appropriate
  const keyboardEnabled = isGameActive && !anyModalOpen;

  // Setup keyboard input
  useKeyboardInput({
    enabled: keyboardEnabled,
    speedMode: true,
    encryptedLetters: Array.isArray(correctlyGuessed) ? correctlyGuessed : [],
    originalLetters: Array.isArray(originalLetters) ? originalLetters : [],
    selectedEncrypted,
    onEncryptedSelect: handleEncryptedSelect,
    onGuessSubmit: onGuessClick,
    playSound,
  });

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

  // Format the display text
  const formattedText = React.useMemo(() => {
    if (!encrypted || !display) return { __html: "" };
    return formatAlternatingLines(encrypted, display, true);
  }, [encrypted, display]);

  // ===== RENDER HELPERS =====
  // If loading, show loading screen
  if (loadingState.isLoading) {
    return (
      <div
        className={`App-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
      >
        <HeaderControls title="uncrypt" />
        <div
          className={`loading-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
        >
          <h2 className="loading-title">
            Loading game<span className="loading-dots"></span>
          </h2>

          {/* Matrix Rain loading animation */}
          <div className="loading-animation">
            <MatrixRainLoading
              active={true}
              color={settings?.theme === "dark" ? "#4cc9f0" : "#00ff41"}
              message="Decrypting data..."
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
  if (!encrypted && !loadingState.isLoading) {
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
            {loadingState.errorMessage ||
              "There was a problem loading the game data."}
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
  const renderControls = () => (
    <div className="controls">
      <div className="controls-main">
        <p>
          Mistakes: {mistakes}/{maxMistakes}
        </p>
        <button
          onClick={onHintClick}
          disabled={mistakes >= maxMistakes - 1 || !isGameActive}
          className="hint-button"
        >
          Hint (Costs 1 Mistake)
        </button>
      </div>
    </div>
  );

  // Win/lose states
  const renderGameOver = () => {
    if (hasWon) {
      return <WinCelebration playSound={playSound} winData={winData || {}} />;
    }

    if (hasLost) {
      return (
        <div className="game-message">
          <p>Game Over! Too many mistakes.</p>
          <button onClick={handleStartNewGame}>Try Again</button>
        </div>
      );
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
