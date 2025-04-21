// src/pages/Game.js - Game state update fix
import React, { useState, useEffect, useRef, useCallback } from "react";
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

  // Function to update the game state with API data
  const updateGameState = useCallback((gameData) => {
    if (!gameData) return;

    const gameStore = useGameStore.getState();

    // Check if we need to actually update the state
    // Only update if we have valid game data
    if (gameData.encrypted_paragraph && gameData.display) {
      console.log("Updating game state with API data");

      // Call continueGame directly on the gameStore to update the state
      if (typeof gameStore.continueSavedGame === "function") {
        gameStore.continueSavedGame(gameData);
      }

      // Mark game data as loaded
      setGameDataLoaded(true);
    }
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

  // Get initialization status and events from our new gameService hook
  const {
    isInitializing,
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
      await getHint();
    } finally {
      setIsHintInProgress(false);
      setPendingHints(0);
    }
  }, [isGameActive, isHintInProgress, getHint]);

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

  const initializedRef = useRef(false);
  // Auto-initialize on first render
  useEffect(() => {
    // Create ref to prevent multiple initializations

    const performInitialization = async () => {
      // Only initialize once
      if (initializedRef.current) {
        console.log("Game already initialized, skipping");
        return;
      }

      // Set flag immediately to prevent multiple initialization attempts
      initializedRef.current = true;
      console.log("Starting game initialization in Game.js useEffect");

      try {
        setIsLoading(true);

        // Clear any existing game ID for anonymous users to ensure we always get a new daily challenge
        const isAuthenticated = !!localStorage.getItem("uncrypt-token");
        if (!isAuthenticated) {
          console.log("Anonymous user - clearing any existing game ID");
          localStorage.removeItem("uncrypt-game-id");
        }

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
        console.log("Initializing with standard flow");
        await initializeGame();

      } catch (err) {
        console.error("Game initialization failed:", err);
      }
    };

    performInitialization();

    // Listen for game initialized events
    const unsubscribe = onEvent(events.GAME_INITIALIZED, (data) => {
      console.log("Game initialized event received:", data);

      // Update game state with the received data
      if (data && data.gameData) {
        updateGameState(data.gameData);
      }

      // Set loading to false after a short delay
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    });

    return () => {
      unsubscribe();
    };
  }, [
    initializeGame,
    startDailyChallenge,
    dailyCompleted,
    isDailyFromRoute,
    onEvent,
    events,
    updateGameState,
  ]);

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
  if (isLoading || isInitializing || !hasValidGameData) {
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

      {hasWon && winData && (
        <WinCelebration playSound={playSound} winData={winData} />
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
