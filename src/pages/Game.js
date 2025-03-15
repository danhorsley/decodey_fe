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
import { useSettings } from "../context/SettingsContext";
import { useGameState } from "../context/GameStateContext";
import { useAuth } from "../context/AuthContext";
import { useModalContext } from "../components/modals/ModalManager";
import { useUI } from "../context/UIContext";
// Utility imports
import useSound from "../services/WebAudioSoundManager";
import useKeyboardInput from "../hooks/KeyboardController";
import { formatAlternatingLines } from "../utils/utils";
// Component imports
import HeaderControls from "../components/HeaderControls";
import MobileLayout from "../components/layout/MobileLayout";
import WinCelebration from "../components/modals/WinCelebration";
import MatrixRain from "../components/effects/MatrixRain";

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

  // Get settings safely
  const settingsContext = useSettings();
  const settings = settingsContext?.settings || {
    theme: "light",
    difficulty: "easy",
    longText: false,
    hardcoreMode: false,
  };

  // Get auth state safely
  const authContext = useAuth();
  const isAuthenticated = authContext?.isAuthenticated || false;
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Get game state safely
  const gameStateContext = useGameState();
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
    handleEncryptedSelect: contextHandleEncryptedSelect = () => {},
    getHint = async () => ({ success: false }),
    submitGuess = async () => ({ success: false }),
    hasWon = false,
    isLocalWinDetected = false,
    hasLost = false,
    winData = null,
    difficulty = "easy",
    maxMistakes = 8,
    continueSavedGame = async () => false,
  } = gameStateContext || {};

  // Get UI context safely
  const uiContext = useUI();
  const useMobileMode = uiContext?.useMobileMode || false;
  const isLandscape = uiContext?.isLandscape || true;

  // Get modal context safely
  const modalContext = useModalContext();
  const {
    isLoginOpen = false,
    isSignupOpen = false,
    isSettingsOpen = false,
    isAboutOpen = false,
  } = modalContext || {};

  // Local state
  const [loading, setLoading] = useState(true);
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

  // In Game.js, modify the initialization useEffect
  const initializationAttemptedRef = useRef(false);

  // Then modify the useEffect
  useEffect(() => {
    console.log(
      "Game mount effect with encrypted:",
      !!encrypted,
      "initAttempted:",
      initializationAttemptedRef.current,
    );

    // If we already have encrypted text, just mark the game as loaded and exit
    if (encrypted) {
      console.log("Game already exists - skipping initialization");
      setLoading(false);
      setGameLoaded(true);
      return;
    }

    // If we've already attempted initialization, don't try again
    if (initializationAttemptedRef.current) {
      console.log("Initialization already attempted - not trying again");
      setLoading(false);
      return;
    }

    // Mark that we're attempting initialization
    initializationAttemptedRef.current = true;

    let mounted = true;

    const initializeGame = async () => {
      setLoading(true);

      try {
        await authContext.waitForAuthReady();

        // First try to continue saved game if authenticated
        const storedGameId = localStorage.getItem("uncrypt-game-id");
        if (storedGameId && authContext.isAuthenticated) {
          console.log("Attempting to continue stored game:", storedGameId);

          if (typeof continueSavedGame === "function") {
            const result = await continueSavedGame();
            if (result && mounted) {
              console.log("Successfully continued saved game");
              setGameLoaded(true);
              setLoading(false);
              return;
            }
          }
        }

        // Start a new game
        console.log("Starting new game (first initialization)");
        if (typeof startGame !== "function") {
          throw new Error("startGame is not a function");
        }

        const longTextSetting = settings?.longText === true;
        const hardcoreModeSetting = settings?.hardcoreMode === true;

        const result = await startGame(longTextSetting, hardcoreModeSetting);

        if (mounted) {
          if (result) {
            console.log("Game initialized successfully");
            setGameLoaded(true);
          } else {
            console.warn("Game initialization returned false");
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error initializing game:", err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Start initialization process
    initializeGame();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run once on mount
  useEffect(() => {
    // If we have the game state reset but no encrypted text, start a new game
    if (
      !encrypted &&
      gameStateContext.isResetting === true &&
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
  }, [encrypted, gameStateContext.isResetting]);
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

  // Add this at the top level of the component to track rerender causes
  useEffect(() => {
    console.log(
      "Game component rendered with encrypted:",
      encrypted ? "exists" : "none",
    );
  }, [encrypted]);
  // Add a useEffect to manage the loading timeout
  useEffect(() => {
    let timeoutId = null;

    // If we're in a loading state, set a timeout to show the error message
    if (loading) {
      // Reset the timed out flag when loading starts
      setLoadingTimedOut(false);

      // Set a timeout to show the error message after a reasonable time
      timeoutId = setTimeout(() => {
        setLoadingTimedOut(true);
      }, 5000); // 5 seconds is usually reasonable
    }

    // Clean up timeout if component unmounts or loading state changes
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loading]);
  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up win transition if component unmounts
      setShowMatrixTransition(false);
    };
  }, []);

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
  const handleStartNewGame = useCallback(() => {
    try {
      console.log("Starting new game manually");

      if (typeof startGame !== "function") {
        console.error("startGame is not a function");
        return;
      }

      const longTextSetting = settings?.longText === true;
      const hardcoreModeSetting = settings?.hardcoreMode === true;

      startGame(longTextSetting, hardcoreModeSetting);
    } catch (error) {
      console.error("Error starting new game:", error);
    }
  }, [startGame, settings?.longText, settings?.hardcoreMode]);

  // Handle submit guess wrapper function
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
        if (typeof contextHandleEncryptedSelect === "function") {
          contextHandleEncryptedSelect(null);
        }
      } catch (error) {
        console.error("Error submitting guess:", error);

        // Reset selected letter on error
        if (typeof contextHandleEncryptedSelect === "function") {
          contextHandleEncryptedSelect(null);
        }
      }
    },
    [
      selectedEncrypted,
      submitGuess,
      contextHandleEncryptedSelect,
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

        if (typeof contextHandleEncryptedSelect === "function") {
          contextHandleEncryptedSelect(letter);
        } else {
          console.error("contextHandleEncryptedSelect is not a function");
          return;
        }

        if (typeof playSound === "function") {
          playSound("keyclick");
        }
      } catch (error) {
        console.error("Error in encrypted click handler:", error);
      }
    },
    [contextHandleEncryptedSelect, playSound],
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
    onEncryptedSelect:
      typeof contextHandleEncryptedSelect === "function"
        ? contextHandleEncryptedSelect
        : () => {},
    onGuessSubmit:
      typeof handleSubmitGuess === "function" ? handleSubmitGuess : () => {},
    playSound: typeof playSound === "function" ? playSound : undefined,
  });

  // If loading, show simple loading screen
  // If loading, show simple loading screen
  if (loading) {
    return (
      <div
        className={`App-container ${settings?.theme === "dark" ? "dark-theme" : ""}`}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "80vh",
          }}
        >
          <h2>Loading game...</h2>

          {/* Show a try again button if loading has timed out */}
          {loadingTimedOut && (
            <div style={{ marginTop: "20px" }}>
              <p>This is taking longer than expected.</p>
              <button
                onClick={handleStartNewGame}
                style={{ marginTop: "10px", padding: "8px 16px" }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If the game hasn't loaded properly, show error and retry button
  if (!encrypted && !loading) {
    return (
      <div
        className={`App-container ${settings?.theme === "dark" ? "dark-theme" : ""}`}
      >
        <HeaderControls title="uncrypt" />
        <div
          style={{
            textAlign: "center",
            margin: "50px auto",
            maxWidth: "400px",
            padding: "20px",
            backgroundColor: settings?.theme === "dark" ? "#333" : "#f0f8ff",
            borderRadius: "8px",
          }}
        >
          <h2>Game failed to load</h2>
          <p>There was a problem loading the game data.</p>
          <button
            onClick={handleStartNewGame}
            style={{ marginTop: "20px", padding: "10px 20px" }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  // Render UI Components
  const renderGameHeader = () => <HeaderControls title="uncrypt" />;

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
            onClick={handleStartNewGame}
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
