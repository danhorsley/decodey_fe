// src/pages/Game.js - Complete Rewrite
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy } from "react-icons/fa";
// Direct context imports
import useSettingsStore from "../stores/settingsStore";
import useGameStore from "../stores/gameStore";
import useAuthStore from "../stores/authStore";
import useUIStore from "../stores/uiStore";
// Utility imports
import useSound from "../services/WebAudioSoundManager";
import useKeyboardInput from "../hooks/KeyboardController";
import { formatAlternatingLines } from "../utils/utils";
// Component imports
import HeaderControls from "../components/HeaderControls";
import MobileLayout from "../components/layout/MobileLayout";
import WinCelebration from "../components/modals/WinCelebration";
import MatrixRain from "../components/effects/MatrixRain";
import MatrixRainLoading from "../components/effects/MatrixRainLoading";
import useGameSession from "../hooks/useGameSession";
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
  // Initialize navigate
  const navigate = useNavigate();
  const { subscribeToEvents, events } = useGameSession();
  // Get settings safely
  const settings = useSettingsStore((state) => state.settings) || {
    theme: "light",
    difficulty: "easy",
    longText: false,
    hardcoreMode: false,
  };

  // Get auth state safely
  const isAuthenticated =
    useAuthStore((state) => state.isAuthenticated) || false;
  const waitForAuthReady = useAuthStore((state) => state.waitForAuthReady);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Get game state from context
  const {
    encrypted = "",
    display = "",
    mistakes = 0,
    correctlyGuessed = [],
    selectedEncrypted = null,
    lastCorrectGuess = null,
    letterFrequency = {},
    guessedMappings = {},
    originalLetters = [],
    startTime = null,
    completionTime = null,
    startGame = async () => false,
    handleEncryptedSelect = () => {},
    isLocalWinDetected = false,
    isResetting = false,
    hasWon,
    hasLost,
    winData,
    difficulty,
    maxMistakes,
    continueSavedGame,
    resetGame,
    abandonGame,
    resetAndStartNewGame,
    getHint,
    submitGuess,
  } = useGameStore();

  // Get UI context safely
  const useMobileMode = useUIStore((state) => state.useMobileMode) || false;
  const isLandscape = useUIStore((state) => state.isLandscape) || true;

  // Get modal context safely
  const isLoginOpen = useUIStore((state) => state.isLoginOpen) || false;
  const isSignupOpen = useUIStore((state) => state.isSignupOpen) || false;
  const isSettingsOpen = useUIStore((state) => state.isSettingsOpen) || false;
  const isAboutOpen = useUIStore((state) => state.isAboutOpen) || false;
  //Game Session management
  const { initialize, isInitializing, lastError } = useGameSession();
  // Local state
  const [loadingState, setLoadingState] = useState({
    isLoading: false, // Start as false, only set to true when needed
    hasTimedOut: false,
    attemptCount: 0,
    errorMessage: null,
    lastAttemptTime: Date.now(),
  });

  const [gameLoaded, setGameLoaded] = useState(false);
  const [showMatrixTransition, setShowMatrixTransition] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);

  // Get sound handlers safely
  const soundContext = useSound();
  const {
    playSound = () => {},
    loadSounds = () => {},
    unlockAudioContext = () => {},
    soundEnabled = true,
  } = soundContext || {};

  // Debug logging
  useEffect(() => {
    console.log("Game state:", {
      encrypted:
        typeof encrypted === "string"
          ? encrypted.substring(0, 20) + "..."
          : encrypted,
      display:
        typeof display === "string"
          ? display.substring(0, 20) + "..."
          : display,
      mistakes,
      correctlyGuessed,
      selectedEncrypted,
      difficulty,
      maxMistakes,
    });
  }, [
    encrypted,
    display,
    mistakes,
    correctlyGuessed,
    selectedEncrypted,
    difficulty,
    maxMistakes,
  ]);
  //listen for game loaded
  useEffect(() => {
    const handleGameLoaded = (data) => {
      console.log("Game loaded event received:", data);
      setLoadingState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: null,
      }));
      setGameLoaded(true);
    };

    // Register the listener
    const unsubscribe = subscribeToEvents(events.GAME_LOADED, handleGameLoaded);

    return () => {
      // Clean up
      unsubscribe();
    };
  }, [subscribeToEvents, events]);
  const initializationAttemptedRef = useRef(false);
  const authReadyCheckedRef = useRef(false);

  // Enhanced initialization effect with better auth handling and game restoration
  // Add a more robust initialization tracking mechanism
  const initializationInProgressRef = useRef(false);
  const successfullyInitializedRef = useRef(false);

  // Game Initiailization
  useEffect(() => {
    // Skip if we already have game content or have successfully initialized
    if (encrypted || successfullyInitializedRef.current) {
      console.log(
        "Game already initialized or has content - skipping initialization",
      );
      setLoadingState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: null,
      }));
      setGameLoaded(true);
      return;
    }

    // Skip if initialization is already in progress using our ref
    if (initializationInProgressRef.current || isInitializing) {
      console.log("Game initialization already in progress (ref check)");
      return;
    }

    // Set our ref BEFORE any async operations
    initializationInProgressRef.current = true;

    console.log(
      "Starting game initialization - setting initializationInProgressRef",
    );

    // Update loading state
    setLoadingState((prev) => ({
      isLoading: true,
      hasTimedOut: false,
      attemptCount: prev.attemptCount + 1,
      errorMessage: null,
      lastAttemptTime: Date.now(),
    }));

    // Initialize the game with our hook
    initialize()
      .then((result) => {
        console.log("Game initialization completed with result:", result);

        // Mark initialization as complete regardless of result
        initializationInProgressRef.current = false;

        if (result.success) {
          // Mark as successfully initialized
          successfullyInitializedRef.current = true;
          setGameLoaded(true);
          setLoadingState((prev) => ({
            ...prev,
            isLoading: false,
            errorMessage: null,
          }));
        } else {
          console.warn(
            "Game initialization failed:",
            result.error || "Unknown error",
          );
          setLoadingState((prev) => ({
            ...prev,
            isLoading: false,
            errorMessage:
              result.error?.message ||
              "Failed to start game. Please try again.",
          }));
        }
      })
      .catch((error) => {
        // Reset initialization flag on error
        initializationInProgressRef.current = false;

        console.error("Error in game initialization:", error);
        setLoadingState((prev) => ({
          ...prev,
          isLoading: false,
          errorMessage: `Error starting game: ${error.message || "Unknown error"}`,
        }));
      });
  }, [encrypted, isInitializing, initialize]); // Keep dependencies minimal

  // Add this new effect to listen for game:loaded events
  useEffect(() => {
    // Skip if the game is already loaded
    if (gameLoaded || encrypted) {
      return;
    }

    const handleGameLoaded = (data) => {
      console.log("Game loaded event received:", data);
      setLoadingState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: null,
      }));
      setGameLoaded(true);
    };

    // Check if we have the functions from the hook
    if (subscribeToEvents && events && events.GAME_LOADED) {
      // Register the listener
      const unsubscribe = subscribeToEvents(
        events.GAME_LOADED,
        handleGameLoaded,
      );

      return () => {
        // Clean up
        unsubscribe();
      };
    }
  }, [subscribeToEvents, events, gameLoaded, encrypted]);

  // Add this effect to reduce perceived loading time
  useEffect(() => {
    // Only start timeout if we're actually loading
    if (!loadingState.isLoading) return;

    const timeoutId = setTimeout(
      () => {
        console.log("Loading timed out - determining course of action");

        // Use a shorter timeout for anonymous users
        const isAnonymous = !isAuthenticated;
        setLoadingState((prev) => ({
          ...prev,
          hasTimedOut: true,
        }));

        // For anonymous users, directly try starting a new game
        if (isAnonymous) {
          console.log(
            "Anonymous user - attempting to start new game automatically",
          );

          const longTextSetting = settings?.longText === true;
          const hardcoreModeSetting = settings?.hardcoreMode === true;

          startGame(longTextSetting, hardcoreModeSetting)
            .then((result) => {
              if (result) {
                console.log("Successfully started new game for anonymous user");
                setGameLoaded(true);
                setLoadingState((prev) => ({
                  ...prev,
                  isLoading: false,
                  hasTimedOut: false,
                  errorMessage: null,
                }));
              } else {
                console.log("Failed to auto-start game, showing retry option");
                setLoadingState((prev) => ({
                  ...prev,
                  isLoading: false,
                  errorMessage:
                    "Could not start game automatically. Please try again.",
                }));
              }
            })
            .catch((err) => {
              console.error("Error starting game for anonymous user:", err);
              setLoadingState((prev) => ({
                ...prev,
                isLoading: false,
                errorMessage: "Error starting game. Please try again.",
              }));
            });
        } else {
          // Authenticated user logic - can try to continue saved game
          // [Your existing authenticated user logic]
        }
      },
      isAuthenticated ? 3000 : 1500,
    ); // Shorter timeout for anonymous users

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    loadingState.isLoading,
    isAuthenticated,
    startGame,
    settings?.longText,
    settings?.hardcoreMode,
  ]);

  // Handle start new game action - simplified with our service
  const handleStartNewGame = useCallback(async () => {
    try {
      setLoadingState((prev) => ({
        isLoading: true,
        hasTimedOut: false,
        attemptCount: prev.attemptCount + 1,
        errorMessage: null,
        lastAttemptTime: Date.now(),
      }));

      // Force a new game initialization
      const result = await initialize(true);

      if (result.success) {
        console.log("New game started successfully");
        setGameLoaded(true);
        setLoadingState((prev) => ({
          ...prev,
          isLoading: false,
          errorMessage: null,
        }));
      } else {
        console.warn(
          "Failed to start new game:",
          result.error || "Unknown error",
        );
        setLoadingState((prev) => ({
          ...prev,
          isLoading: false,
          errorMessage:
            result.error?.message ||
            "Failed to start new game. Please try again.",
        }));
      }
    } catch (error) {
      console.error("Error starting new game:", error);
      setLoadingState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: `Error starting game: ${error.message || "Unknown error"}`,
      }));
    }
  }, [initialize]);
  // Watch for local win detection
  useEffect(() => {
    try {
      // If local win is detected but full win celebration isn't shown yet
      if (isLocalWinDetected === true && hasWon !== true) {
        console.log("Local win detected, starting Matrix rain transition");
        // Start Matrix rain animation
        setShowMatrixTransition(true);

        // Play win sound
        if (typeof playSound === "function") {
          playSound("win");
        }
      }

      // When full win is confirmed, hide the transition
      if (hasWon === true) {
        setShowMatrixTransition(false);
      }
    } catch (error) {
      console.error("Error in win detection effect:", error);
    }
  }, [isLocalWinDetected, hasWon, playSound]);
  //effect to detect when the game state has been reset and we need a new game
  useEffect(() => {
    // If we have the game state reset but no encrypted text, start a new game
    if (
      !encrypted &&
      isResetting === true &&
      !initializationAttemptedRef.current
    ) {
      console.log(
        "Game reset detected without encrypted text - initializing new game",
      );

      // Mark initialization as attempted to prevent loops
      initializationAttemptedRef.current = true;

      const longTextSetting = settings?.longText === true;
      const hardcoreModeSetting = settings?.hardcoreMode === true;

      // Short delay to ensure state is properly reset
      setTimeout(() => {
        startGame(longTextSetting, hardcoreModeSetting);
      }, 20);
    }
  }, [encrypted, isResetting]);

  // Add this at the top level of the component to track rerender causes
  useEffect(() => {
    console.log(
      "Game component rendered with encrypted:",
      encrypted ? "exists" : "none",
    );
  }, [encrypted]);
  // In Game.js, modify the useEffect that manages the loading timeout
  // In Game.js, modify the useEffect that manages the loading timeout
  useEffect(() => {
    let timeoutId = null;

    if (loadingState.isLoading) {
      console.log("Setting up loading timeout");

      timeoutId = setTimeout(() => {
        console.log("Loading timed out - determining course of action");

        // Different handling for anonymous vs authenticated users
        if (isAuthenticated && typeof continueSavedGame === "function") {
          console.log("Authenticated user - attempting to continue saved game");
          // Same continuation logic as before
          continueSavedGame()
            .then((result) => {
              // continuation logic...
            })
            .catch((err) => {
              // error handling...
            });
        } else {
          // For anonymous users, directly try starting a new game
          console.log(
            "Anonymous user - attempting to start new game automatically",
          );

          const longTextSetting = settings?.longText === true;
          const hardcoreModeSetting = settings?.hardcoreMode === true;

          startGame(longTextSetting, hardcoreModeSetting)
            .then((result) => {
              if (result) {
                console.log("Successfully started new game for anonymous user");
                setGameLoaded(true);
                setLoadingState((prev) => ({
                  ...prev,
                  isLoading: false,
                  hasTimedOut: false,
                  errorMessage: null,
                }));
              } else {
                console.log(
                  "Failed to auto-start game for anonymous user, showing retry option",
                );
                setLoadingState((prev) => ({
                  ...prev,
                  isLoading: false,
                  errorMessage:
                    "Could not start game automatically. Please try again.",
                }));
              }
            })
            .catch((err) => {
              console.error("Error starting game for anonymous user:", err);
              setLoadingState((prev) => ({
                ...prev,
                isLoading: false,
                errorMessage: "Error starting game. Please try again.",
              }));
            });
        }
      }, 3000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    loadingState.isLoading,
    loadingState.lastAttemptTime,
    isAuthenticated,
    continueSavedGame,
    startGame,
    settings?.longText,
    settings?.hardcoreMode,
  ]);

  // Apply theme to body
  useEffect(() => {
    try {
      const className = "dark-theme";
      const isDarkTheme = settings?.theme === "dark";

      if (isDarkTheme) {
        document.documentElement.classList.add(className);
        document.body.classList.add(className);
      } else {
        document.documentElement.classList.remove(className);
        document.body.classList.remove(className);
      }
    } catch (error) {
      console.error("Error applying theme:", error);
    }
  }, [settings?.theme]);

  // Start a new game manually

  // In Game.js, update the handleStartNewGame function

  //**SUBMIT GUESS **//
  const handleSubmitGuess = useCallback(
    async (guessedLetter) => {
      try {
        if (!selectedEncrypted) {
          console.warn("Cannot submit guess: No encrypted letter selected");
          return;
        }

        if (typeof guessedLetter !== "string" || guessedLetter.length !== 1) {
          console.warn("Invalid guessed letter:", guessedLetter);
          return;
        }

        console.log(
          `Submitting guess: ${selectedEncrypted} → ${guessedLetter}`,
        );
        console.log("Current state:", {
          mistakes,
          maxMistakes,
          difficulty,
        });

        if (typeof submitGuess !== "function") {
          console.error("submitGuess is not a function");
          return;
        }

        // Use the submitGuess function from context
        const result = await submitGuess(selectedEncrypted, guessedLetter);
        console.log("Guess result:", result);

        // Play sound based on result
        if (result.success === true) {
          if (result.isCorrect === true) {
            if (typeof playSound === "function") {
              playSound("correct");
            }
          } else {
            if (typeof playSound === "function") {
              playSound("incorrect");
            }
          }
        }

        // Reset selected letter regardless of result
        handleEncryptedSelect(null);
      } catch (error) {
        console.error("Error submitting guess:", error);

        // Reset selected letter on error
        handleEncryptedSelect(null);
      }
    },
    [
      selectedEncrypted,
      submitGuess,
      handleEncryptedSelect,
      playSound,
      mistakes,
      maxMistakes,
      difficulty,
    ],
  );
  // Handle encrypted grid click
  const onEncryptedClick = useCallback(
    (letter) => {
      try {
        if (typeof letter !== "string" || letter.length !== 1) {
          console.warn("Invalid letter:", letter);
          return;
        }

        handleEncryptedSelect(letter);

        if (typeof playSound === "function") {
          playSound("keyclick");
        }
      } catch (error) {
        console.error("Error in encrypted click handler:", error);
      }
    },
    [handleEncryptedSelect, playSound],
  );

  // Handle guess grid click
  const onGuessClick = useCallback(
    (guessedLetter) => {
      try {
        if (typeof guessedLetter !== "string" || guessedLetter.length !== 1) {
          console.warn("Invalid guessed letter:", guessedLetter);
          return;
        }

        if (selectedEncrypted && typeof handleSubmitGuess === "function") {
          handleSubmitGuess(guessedLetter);
        } else {
          console.log(
            "No encrypted letter selected or handleSubmitGuess not available",
          );
        }
      } catch (error) {
        console.error("Error in guess click handler:", error);
      }
    },
    [selectedEncrypted, handleSubmitGuess],
  );

  // Handle hint button click
  const onHintClick = useCallback(async () => {
    try {
      console.log("Hint button clicked");
      console.log("Current game state:", {
        mistakes,
        maxMistakes,
        isGameActive: isGameActiveComputed,
        difficulty,
        encrypted: typeof encrypted === "string",
      });

      // Safety check
      if (typeof getHint !== "function") {
        console.error("getHint is not a function");
        return;
      }

      // Use the getHint function provided by useGameState
      const result = await getHint();
      console.log("Hint result from context:", result);

      // Play sound if successful
      if (result.success === true && typeof playSound === "function") {
        playSound("hint");
      }
    } catch (error) {
      console.error("Error in hint button handler:", error);
    }
  }, [getHint, playSound, mistakes, maxMistakes, difficulty, encrypted]);

  // Memoized computed values
  const encryptedLetters = useMemo(() => {
    try {
      if (typeof encrypted !== "string" || encrypted.length === 0) return [];

      const matches = encrypted.match(/[A-Z]/g);
      return matches ? [...new Set(matches)] : [];
    } catch (error) {
      console.error("Error computing encrypted letters:", error);
      return [];
    }
  }, [encrypted]);

  const sortedEncryptedLetters = useMemo(() => {
    try {
      if (!Array.isArray(encryptedLetters)) return [];

      const gridSorting = settings?.gridSorting;

      return gridSorting === "alphabetical"
        ? [...encryptedLetters].sort()
        : encryptedLetters;
    } catch (error) {
      console.error("Error sorting encrypted letters:", error);
      return [];
    }
  }, [encryptedLetters, settings?.gridSorting]);

  const usedGuessLetters = useMemo(() => {
    try {
      if (typeof guessedMappings !== "object" || guessedMappings === null) {
        return [];
      }

      return Object.values(guessedMappings);
    } catch (error) {
      console.error("Error computing used guess letters:", error);
      return [];
    }
  }, [guessedMappings]);

  // Format text for display
  const formattedText = useMemo(() => {
    try {
      if (typeof encrypted !== "string" || typeof display !== "string") {
        return { __html: "" };
      }

      if (encrypted.length === 0 || display.length === 0) {
        return { __html: "" };
      }

      if (typeof formatAlternatingLines !== "function") {
        console.error("formatAlternatingLines is not a function");
        return { __html: "" };
      }

      return formatAlternatingLines(encrypted, display, true);
    } catch (error) {
      console.error("Error formatting text:", error);
      return { __html: "" };
    }
  }, [encrypted, display]);

  // Determine if game is active with robust checks
  let isGameActiveComputed = false;
  try {
    const hasEncrypted = typeof encrypted === "string" && encrypted.length > 0;
    const isCompleted = !!completionTime;
    const currentMistakes = typeof mistakes === "number" ? mistakes : 0;
    const effectiveMaxMistakes =
      typeof maxMistakes === "number" ? maxMistakes : 8;
    const mistakesWithinLimit = currentMistakes < effectiveMaxMistakes;

    isGameActiveComputed = hasEncrypted && !isCompleted && mistakesWithinLimit;
  } catch (error) {
    console.error("Error calculating game active status:", error);
    isGameActiveComputed = false;
  }

  // Any modal open check
  const anyModalOpen =
    isLoginOpen || isSignupOpen || isSettingsOpen || isAboutOpen;

  // Keyboard input setup
  const keyboardEnabled = isGameActiveComputed && !anyModalOpen;

  const { isActive } = useKeyboardInput({
    enabled: keyboardEnabled,
    speedMode: true,
    encryptedLetters: Array.isArray(encryptedLetters) ? encryptedLetters : [],
    originalLetters: Array.isArray(originalLetters) ? originalLetters : [],
    selectedEncrypted,
    onEncryptedSelect: handleEncryptedSelect,
    onGuessSubmit: handleSubmitGuess,
    playSound: typeof playSound === "function" ? playSound : undefined,
  });

  // If loading, show simple loading screen
  // If loading, show simple loading screen
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
            {loadingState.hasTimedOut ? "Still working on it" : "Loading game"}
            <span className="loading-dots"></span>
          </h2>

          {/* Matrix Rain loading animation */}
          <div className="loading-animation">
            <MatrixRainLoading
              active={true}
              color={settings?.theme === "dark" ? "#4cc9f0" : "#00ff41"}
              message={
                loadingState.hasTimedOut
                  ? "Still decrypting..."
                  : "Decrypting data..."
              }
              width="100%"
              height="100%"
              density={40} /* Higher density for more visual impact */
            />
          </div>

          {/* Show a try again button if loading has timed out */}
          {loadingState.hasTimedOut && (
            <div
              className={`loading-retry ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
            >
              <p>This is taking longer than expected.</p>
              {loadingState.errorMessage && (
                <p className="loading-error">{loadingState.errorMessage}</p>
              )}
              <button onClick={handleStartNewGame} className="retry-button">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If the game hasn't loaded properly, show error and retry button
  if (!encrypted && !loadingState.isLoading) {
    return (
      <div
        className={`App-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
      >
        <HeaderControls title="uncrypt" />

        {/* Small MatrixRain background for error screen */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0.15,
            zIndex: 0,
          }}
        >
          <MatrixRain
            active={true}
            color={settings?.theme === "dark" ? "#4cc9f0" : "#00ff41"}
            density={20}
            fadeSpeed={0.1}
            speedFactor={0.5}
          />
        </div>

        <div
          className={`error-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
        >
          <h2 className="error-title">Game Failed to Load</h2>

          {loadingState.errorMessage ? (
            <p className="error-message">{loadingState.errorMessage}</p>
          ) : (
            <p className="error-message">
              There was a problem loading the game data.
            </p>
          )}

          <button onClick={handleStartNewGame} className="try-again-button">
            Try Again
          </button>

          {loadingState.attemptCount > 1 && (
            <p className="help-text">
              Having trouble? Check your internet connection or try refreshing
              the page.
            </p>
          )}
        </div>
      </div>
    );
  }
  // Render UI Components
  const renderGameHeader = () => <HeaderControls title="decodey" />;

  const renderTextContainer = () => (
    <div
      className={`text-container ${settings?.hardcoreMode === true ? "hardcore-mode" : ""}`}
    >
      <div
        className="alternating-text"
        dangerouslySetInnerHTML={formattedText}
      />
      {settings?.hardcoreMode === true && (
        <div className="hardcore-badge">HARDCORE MODE</div>
      )}
    </div>
  );

  const renderGrids = () => {
    // Safety check that arrays are arrays
    const safeEncryptedLetters = Array.isArray(sortedEncryptedLetters)
      ? sortedEncryptedLetters
      : [];

    const safeOriginalLetters = Array.isArray(originalLetters)
      ? originalLetters
      : [];

    const safeCorrectlyGuessed = Array.isArray(correctlyGuessed)
      ? correctlyGuessed
      : [];

    return (
      <div className="grids">
        <div className="encrypted-grid">
          {safeEncryptedLetters.map((letter) => (
            <LetterCell
              key={letter}
              letter={letter}
              isSelected={selectedEncrypted === letter}
              isGuessed={safeCorrectlyGuessed.includes(letter)}
              isFlashing={lastCorrectGuess === letter}
              frequency={
                typeof letterFrequency === "object" && letterFrequency !== null
                  ? letterFrequency[letter] || 0
                  : 0
              }
              onClick={() => {
                console.log(`Clicking encrypted letter: ${letter}`);
                onEncryptedClick(letter);
              }}
              disabled={!isGameActiveComputed}
            />
          ))}
        </div>
        <div className="guess-grid">
          {safeOriginalLetters.map((letter) => (
            <LetterCell
              key={letter}
              letter={letter}
              isGuessed={
                Array.isArray(usedGuessLetters) &&
                usedGuessLetters.includes(letter)
              }
              onClick={() => {
                console.log(
                  `Clicking guess letter: ${letter}, selectedEncrypted: ${selectedEncrypted}`,
                );
                onGuessClick(letter);
              }}
              disabled={!isGameActiveComputed || !selectedEncrypted}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderControls = () => {
    // Ensure maxMistakes has a valid value
    const effectiveMaxMistakes =
      typeof maxMistakes === "number" ? maxMistakes : 8;
    const currentMistakes = typeof mistakes === "number" ? mistakes : 0;

    return (
      <div className="controls">
        <div className="controls-main">
          <p>
            Mistakes: {currentMistakes}/{effectiveMaxMistakes}{" "}
          </p>
          <button
            onClick={() => {
              console.log("Hint clicked");
              console.log("Button state:", {
                isDisabled:
                  currentMistakes >= effectiveMaxMistakes - 1 ||
                  !isGameActiveComputed,
                mistakes: currentMistakes,
                maxMistakes: effectiveMaxMistakes,
                isGameActive: isGameActiveComputed,
              });
              onHintClick();
            }}
            disabled={
              currentMistakes >= effectiveMaxMistakes - 1 ||
              !isGameActiveComputed
            }
            className="hint-button"
          >
            Hint (Costs 1 Mistake)
          </button>
        </div>
      </div>
    );
  };

  const renderLeaderboardButton = () => (
    <button
      className="leaderboard-button-fixed"
      onClick={() => navigate("/leaderboard")}
      aria-label="Leaderboard"
    >
      <FaTrophy size={16} />
    </button>
  );

  const renderMatrixTransition = () => {
    if (!showMatrixTransition) return null;

    let matrixColor = "#00ff41"; // Default green

    if (settings?.textColor === "scifi-blue") {
      matrixColor = "#4cc9f0";
    } else if (settings?.textColor === "retro-green") {
      matrixColor = "#00ff41";
    }

    return (
      <MatrixRain
        active={true}
        color={matrixColor}
        density={70}
        fadeSpeed={0.05}
        speedFactor={1}
        includeKatakana={true}
      />
    );
  };

  const renderGameOver = () => {
    if (hasWon === true) {
      const safeFn =
        typeof startGame === "function" ? handleStartNewGame : () => {};
      const safePlaySound =
        typeof playSound === "function" ? playSound : () => {};

      const safeTheme = settings?.theme || "light";
      const safeTextColor = settings?.textColor || "default";

      return (
        <WinCelebration
          startGame={safeFn}
          playSound={safePlaySound}
          theme={safeTheme}
          textColor={safeTextColor}
          winData={winData || {}} // Ensure it's not null
        />
      );
    }

    // Show Matrix transition if a local win is detected
    if (showMatrixTransition === true && hasWon !== true) {
      return (
        <div className="win-transition">
          {renderMatrixTransition()}
          <p
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1100,
              color: settings?.theme === "dark" ? "#4cc9f0" : "#007bff",
              fontSize: "1.5rem",
              textAlign: "center",
              fontWeight: "bold",
              textShadow: "0 0 10px rgba(76, 201, 240, 0.7)",
              animation: "pulse 1.5s infinite ease-in-out",
            }}
          >
            Calculating Score...
          </p>
        </div>
      );
    }

    if (hasLost === true) {
      return (
        <div
          className="game-message"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1100,
            backgroundColor: settings?.theme === "dark" ? "#333" : "#f0f8ff",
            color: settings?.theme === "dark" ? "#f8f9fa" : "#212529",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
            textAlign: "center",
            maxWidth: "280px",
            width: "85%",
            margin: "0 auto",
          }}
        >
          <p
            style={{
              fontSize: "1.2rem",
              marginBottom: "20px",
              fontWeight: "bold",
            }}
          >
            Game Over! Too many mistakes.
          </p>
          <button
            onClick={() => {
              console.log("Starting new game from game over modal");

              // Use the combined reset and start function from context if available
              if (typeof resetAndStartNewGame === "function") {
                const longTextSetting = settings?.longText === true;
                const hardcoreModeSetting = settings?.hardcoreMode === true;

                console.log("Using resetAndStartNewGame with settings:", {
                  longText: longTextSetting,
                  hardcoreMode: hardcoreModeSetting,
                });

                resetAndStartNewGame(longTextSetting, hardcoreModeSetting);
              } else {
                // Fallback to the current approach with a longer delay
                console.log(
                  "resetAndStartNewGame not available, using fallback approach",
                );
                if (typeof resetGame === "function") {
                  resetGame();
                }
                setTimeout(() => {
                  handleStartNewGame();

                  // Add a final fallback in case handleStartNewGame fails
                  setTimeout(() => {
                    if (!encrypted && typeof startGame === "function") {
                      console.log("FINAL FALLBACK: Direct startGame call");
                      startGame(
                        settings?.longText === true,
                        settings?.hardcoreMode === true,
                      );
                    }
                  }, 300);
                }, 200); // Increased delay
              }
            }}
            style={{
              margin: "15px auto 0",
              padding: "12px 20px",
              fontSize: "1.1rem",
              display: "block",
              width: "90%",
              maxWidth: "160px",
              textAlign: "center",
              fontWeight: "bold",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              position: "relative",
              zIndex: 1010,
              borderRadius: "8px",
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return null;
  };
  // Use mobile layout if needed
  if (useMobileMode === true) {
    return (
      <div className="App-container">
        <MobileLayout isLandscape={!!isLandscape}>
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

      {/* Debug button at the bottom of the screen */}
      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <button onClick={handleStartNewGame}>Start New Game</button>
      </div>
    </div>
  );
}

export default Game;
