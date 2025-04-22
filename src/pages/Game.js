// src/pages/Game.js - Improved with proper state management
import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

// Import UI components
import SlideMenu from "../components/SlideMenu";
import CompactHeader from "../components/CompactHeader";
import GameDashboard from "../components/GameDashboard";

// Import stores and hooks
import useGameStore from "../stores/gameStore";
import useGameService from "../hooks/useGameService";
import useSettingsStore from "../stores/settingsStore";
import useUIStore from "../stores/uiStore";
import useSound from "../services/WebAudioSoundManager";
import useKeyboardInput from "../hooks/KeyboardController";
import MobileLayout from "../components/layout/MobileLayout";
import WinCelebration from "../components/modals/WinCelebration";
import MatrixRainLoading from "../components/effects/MatrixRainLoading";
import TuneableTextDisplay from "../components/TuneableTextDisplay";
import TutorialOverlay from "../components/TutorialOverlay";

// Game component - the main gameplay screen
const Game = () => {
  // React Router location for checking route params
  const location = useLocation();

  // Get game state from store - use specific selectors to avoid unnecessary rerenders
  // Get game state from store - use specific selectors to avoid unnecessary rerenders
  const encrypted = useGameStore((state) => state.encrypted);
  const display = useGameStore((state) => state.display);
  const mistakes = useGameStore((state) => state.mistakes);
  const maxMistakes = useGameStore((state) => state.maxMistakes);
  const letterFrequency = useGameStore((state) => state.letterFrequency);
  const correctlyGuessed = useGameStore(
    (state) => state.correctlyGuessed || [],
  );
  const selectedEncrypted = useGameStore((state) => state.selectedEncrypted);
  const lastCorrectGuess = useGameStore((state) => state.lastCorrectGuess);
  const guessedMappings = useGameStore((state) => state.guessedMappings || {});
  const originalLetters = useGameStore((state) => state.originalLetters || []);
  const incorrectGuesses = useGameStore(
    (state) => state.incorrectGuesses || {},
  );
  const hasWon = useGameStore((state) => state.hasWon);
  const hasLost = useGameStore((state) => state.hasLost);
  const winData = useGameStore((state) => state.winData);
  const hardcoreMode = useGameStore((state) => state.hardcoreMode);
  const isResetting = useGameStore((state) => state.isResetting);
  const isDailyChallenge = useGameStore((state) => state.isDailyChallenge);

  // Use our own loading state instead of relying on hasGameStarted
  const [gameDataLoaded, setGameDataLoaded] = useState(false);

  // Get game actions from store - must use useCallback to prevent infinite loops
  const handleEncryptedSelect = useCallback((letter) => {
    useGameStore.getState().handleEncryptedSelect(letter);
  }, []);

  const handleSubmitGuess = useCallback((encryptedLetter, guessedLetter) => {
    useGameStore.getState().submitGuess(encryptedLetter, guessedLetter);
  }, []);

  const getHint = useCallback(() => {
    return useGameStore.getState().getHint();
  }, []);

  const resetAndStartNewGame = useCallback(() => {
    useGameStore.getState().resetAndStartNewGame();
  }, []);

  // Get mobile detection state
  const useMobileMode = useUIStore((state) => state.useMobileMode);

  // Get UI state
  const [menuOpen, setMenuOpen] = useState(false);

  // Get settings from store
  const settings = useSettingsStore((state) => state.settings);

  // State for controlling tutorial
  const [showTutorial, setShowTutorial] = useState(false);

  // State for controlling loading spinner
  const [isLoading, setIsLoading] = useState(true);

  // State for pending hint
  const [pendingHints, setPendingHints] = useState(0);
  const [isHintInProgress, setIsHintInProgress] = useState(false);

  // Get initialization status and events from our gameService hook
  const {
    isInitializing: isServiceInitializing,
    initializeGame,
    startDailyChallenge,
    onEvent,
    events,
  } = useGameService();

  // Check if this is a daily challenge or an already completed daily challenge
  const isDailyFromRoute = location.state?.dailyChallenge === true;
  const dailyCompleted = location.state?.dailyCompleted === true;
  const dailyCompletionData = location.state?.completionData;

  // State for showing daily completion notification
  const [showDailyCompletionNotice, setShowDailyCompletionNotice] =
    useState(dailyCompleted);

  // Sound effects
  const { playSound } = useSound();

  // Check if the game is active (not won or lost)
  const isGameActive = !hasWon && !hasLost && !isResetting;

  // Toggle side menu - use useCallback to prevent unnecessary rerenders
  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  // Handle encrypted letter click - use useCallback for stability
  const handleEncryptedClick = useCallback(
    (letter) => {
      if (!isGameActive || correctlyGuessed.includes(letter)) return;

      handleEncryptedSelect(letter);
      playSound && playSound("keyclick");
    },
    [isGameActive, correctlyGuessed, handleEncryptedSelect, playSound],
  );

  // Handle guess click - use useCallback for stability
  const handleGuessClick = useCallback(
    (guessedLetter) => {
      if (!isGameActive || !selectedEncrypted) return;

      // Check if this guess was already tried
      if (incorrectGuesses[selectedEncrypted]?.includes(guessedLetter)) {
        playSound && playSound("keyclick");
        return;
      }

      handleSubmitGuess(selectedEncrypted, guessedLetter);
    },
    [
      isGameActive,
      selectedEncrypted,
      incorrectGuesses,
      handleSubmitGuess,
      playSound,
    ],
  );

  // Handle hint request - use useCallback for stability
  const handleHintClick = useCallback(async () => {
    if (!isGameActive || isHintInProgress) return;

    setIsHintInProgress(true);
    setPendingHints((prev) => prev + 1);

    try {
      // Play click sound when button is pressed
      playSound && playSound("keyclick");

      // Get hint
      const result = await getHint();

      // Add this line to play hint sound when successful
      if (result && result.success) {
        playSound && playSound("hint");
      }
    } finally {
      setIsHintInProgress(false);
      setPendingHints(0);
    }
  }, [isGameActive, isHintInProgress, getHint, playSound]);

  // Get all letters from encrypted text, sorted by setting preference
  const sortedEncryptedLetters = React.useMemo(() => {
    if (!encrypted) return [];

    const uniqueLetters = [...new Set(encrypted.match(/[A-Z]/g) || [])];

    // Default order - as they appear in the text
    if (!settings || settings.gridSorting === "default") {
      return uniqueLetters;
    }

    // Alphabetical order
    return [...uniqueLetters].sort();
  }, [encrypted, settings?.gridSorting]);

  const [hasInitialized, setHasInitialized] = useState(false);

  //cleanup routine that runs when Game.js mounts
  useEffect(() => {
    // Check for any stuck transition flags and clean them up
    if (localStorage.getItem("force-daily-challenge") === "true") {
      console.log("Found stuck force-daily-challenge flag, cleaning up");
      localStorage.removeItem("force-daily-challenge");
    }
  }, []);
  
  useEffect(() => {
    // Only run initialization once to prevent loops
    if (hasInitialized) return;

    const performInitialization = async () => {
      console.log("Starting game initialization in Game.js useEffect");
      setIsLoading(true);
      setHasInitialized(true); // Mark as initialized immediately

      try {
        // Check specific cases for initialization
        if (dailyCompleted) {
          console.log(
            "Daily challenge already completed - initializing standard game",
          );
          await initializeGame({ skipDailyCheck: true });
        } else if (isDailyFromRoute) {
          console.log("Explicitly requested daily challenge - initializing");
          await startDailyChallenge();
        } else {
          console.log("Initializing with standard flow");
          await initializeGame();
        }
      } catch (err) {
        console.error("Game initialization failed:", err);
        setIsLoading(false);
      }
    };

    performInitialization();
  }, []);

  // Listen for game initialized events from the service
  useEffect(() => {
    // Simple event handlers without any setState inside useEffect dependencies
    const handleGameInitialized = () => {
      setIsLoading(false);
      setGameDataLoaded(true);
    };

    const handleStateChanged = () => {
      setIsLoading(false);
      setGameDataLoaded(true);
    };

    // Subscribe to events
    const unsubscribe = onEvent(events.GAME_INITIALIZED, handleGameInitialized);
    const unsubscribeStateChanged = onEvent(
      events.STATE_CHANGED,
      handleStateChanged,
    );

    return () => {
      unsubscribe();
      unsubscribeStateChanged();
    };
  }, [onEvent, events]);

  // Effect to handle daily completion notification
  useEffect(() => {
    if (dailyCompleted && dailyCompletionData) {
      setShowDailyCompletionNotice(true);
    }
  }, [dailyCompleted, dailyCompletionData]);

  // Effect to detect tutorial settings on mount
  useEffect(() => {
    // Check local storage to see if tutorial has been shown
    const tutorialCompleted =
      localStorage.getItem("tutorial-completed") === "true";
    const tutorialStarted = localStorage.getItem("tutorial-started") === "true";

    if (!tutorialCompleted && !tutorialStarted) {
      // Set local storage to indicate tutorial has been started
      localStorage.setItem("tutorial-started", "true");
      setShowTutorial(true);
    }
  }, []);

  // Handle when user completes the tutorial
  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem("tutorial-completed", "true");
  }, []);

  // Check if we have valid game data
  const hasValidGameData =
    encrypted && display && originalLetters && originalLetters.length > 0;

  // ========================
  // Keyboard input handling
  // ========================

  // Use the keyboard controller hook to handle input with stable config
  const keyboardConfig = React.useMemo(
    () => ({
      enabled: isGameActive,
      speedMode: settings?.speedMode !== undefined ? settings.speedMode : true,
      encryptedLetters: sortedEncryptedLetters || [],
      originalLetters: originalLetters || [],
      selectedEncrypted,
      onEncryptedSelect: handleEncryptedClick,
      onGuessSubmit: handleGuessClick,
      playSound,
    }),
    [
      isGameActive,
      settings?.speedMode,
      sortedEncryptedLetters,
      originalLetters,
      selectedEncrypted,
      handleEncryptedClick,
      handleGuessClick,
      playSound,
    ],
  );

  useKeyboardInput(keyboardConfig);

  // ========================
  // Rendering of components
  // ========================

  // Handle loading state - check for actual game data rather than just flags
  if (isLoading || isServiceInitializing || !hasValidGameData) {
    return (
      <div className="loading-overlay">
        <MatrixRainLoading
          active={true}
          color={settings?.theme === "dark" ? "#4cc9f0" : "#00ff41"}
          message="Decrypting puzzle..."
        />
      </div>
    );
  }

  // Common content to render in both mobile and desktop layouts
  const gameContent = (
    <>
      <CompactHeader
        title="decodey"
        toggleMenu={toggleMenu}
        isDailyChallenge={isDailyChallenge}
        hardcoreMode={hardcoreMode}
      />

      <SlideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <TuneableTextDisplay
        encrypted={encrypted}
        display={display}
        hardcoreMode={hardcoreMode}
      />

      <GameDashboard
        mistakes={mistakes}
        maxMistakes={maxMistakes}
        pendingHints={pendingHints}
        onHintClick={handleHintClick}
        disableHint={!isGameActive || isHintInProgress}
        isHintInProgress={isHintInProgress}
        sortedEncryptedLetters={sortedEncryptedLetters}
        selectedEncrypted={selectedEncrypted}
        correctlyGuessed={correctlyGuessed}
        incorrectGuesses={incorrectGuesses}
        lastCorrectGuess={lastCorrectGuess}
        letterFrequency={letterFrequency}
        onEncryptedClick={handleEncryptedClick}
        isGameActive={isGameActive}
        originalLetters={originalLetters}
        guessedMappings={guessedMappings}
        onGuessClick={handleGuessClick}
        hasLost={hasLost}
        onStartNewGame={resetAndStartNewGame}
      />

      {(hasWon || hasLost) && (
        <WinCelebration
          playSound={playSound}
          winData={{
            ...(winData || {}), // Use empty object as fallback if winData is null
            hasLost, // Explicitly pass hasLost flag
            hasWon, // Explicitly pass hasWon flag
            encrypted,
            display,
            correctlyGuessed,
            mistakes,
            maxMistakes,
            gameTimeSeconds: hasWon
              ? winData?.gameTimeSeconds || 0
              : Math.floor(
                  (Date.now() -
                    (useGameStore.getState().startTime || Date.now())) /
                    1000,
                ),
            attribution: winData?.attribution || {},
            onPlayAgain: resetAndStartNewGame, // Add the callback for the Play Again button
          }}
        />
      )}

      {showDailyCompletionNotice && dailyCompletionData && (
        <div className="daily-completion-notice">
          <div className="notice-content">
            <h3>Today's Daily Challenge</h3>
            <p>You've already completed today's challenge!</p>
            <button onClick={() => setShowDailyCompletionNotice(false)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}
    </>
  );

  // Determine if we should use mobile layout
  if (useMobileMode) {
    return (
      <div className="App-container mobile-mode">
        <MobileLayout>{gameContent}</MobileLayout>
      </div>
    );
  }

  // Standard desktop layout
  return (
    <div
      className={`App-container ${settings?.theme === "dark" ? "dark-theme" : ""}`}
    >
      {gameContent}
    </div>
  );
};

export default Game;
