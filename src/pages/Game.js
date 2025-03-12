// src/pages/Game.js
import React, {
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext"; // Direct import for settings
import { useUI } from "../context/UIContext"; // Direct import for UI state
import { useGameState } from "../context/GameStateContext"; // Direct import for game state
import { useAuth } from "../context/AuthContext"; // Direct import for auth
import { useModalContext } from "../components/modals/ModalManager"; // Import for modal state
// import useSound from "../services/SoundManager";
import useSound from "../services/WebAudioSoundManager";
import useKeyboardInput from "../hooks/KeyboardController";
import { formatAlternatingLines, preventWordBreaks } from "../utils/utils";
import WinCelebration from "../components/modals/WinCelebration";
import MobileLayout from "../components/layout/MobileLayout";
import apiService from "../services/apiService";
import { FaTrophy } from "react-icons/fa";
import HeaderControls from "../components/HeaderControls";
import scoreService from "../services/scoreService";
import { getDifficultyFromMaxMistakes } from "../utils/utils";

// Debug flag
const DEBUG = true;

// Memoized LetterCell component
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
      className={`letter-cell ${isSelected ? "selected" : ""} ${
        isGuessed ? "guessed" : ""
      } ${isFlashing ? "flash" : ""}`}
      onClick={!disabled ? onClick : undefined}
    >
      {letter}
      {frequency !== undefined && (
        <span className="frequency-indicator">{frequency || 0}</span>
      )}
    </div>
  ),
);

// Custom hook for theme management
const useThemeEffect = (theme) => {
  useEffect(() => {
    const className = "dark-theme";
    if (theme === "dark") {
      document.documentElement.classList.add(className);
      document.body.classList.add(className);
    } else {
      document.documentElement.classList.remove(className);
      document.body.classList.remove(className);
    }
  }, [theme]);
};

// Reducer for state management
const initialState = {
  encrypted: "",
  display: "",
  mistakes: 0,
  correctlyGuessed: [],
  selectedEncrypted: null,
  lastCorrectGuess: null,
  letterFrequency: {},
  guessedMappings: {},
  originalLetters: [],
  startTime: null,
  completionTime: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "START_GAME":
      return { ...initialState, ...action.payload };
    case "SUBMIT_GUESS":
      return { ...state, ...action.payload };
    case "SET_HINT":
      return { ...state, ...action.payload };
    case "SET_COMPLETION":
      return { ...state, completionTime: action.payload };
    default:
      return state;
  }
};

// Main Game component
function Game() {
  // Get settings directly from context
  const { settings, maxMistakes } = useSettings();
  const { toggleSounds, soundEnabled } = useSound();

  // Get UI state directly from context
  const {
    currentView,
    showSettings,
    showGame,
    isAboutOpen: uiAboutOpen, // Rename to avoid potential conflicts
    isLandscape,
    useMobileMode,
  } = useUI();

  // Get auth state
  const { isAuthenticated, authLoading, user } = useAuth();
  const recordLossScore = useCallback(async () => {
    // Only record if we have the necessary game data and haven't already recorded
    if (
      !encrypted ||
      !startTime ||
      localStorage.getItem("game-loss-recorded")
    ) {
      return;
    }

    // Mark that we've recorded this loss to prevent duplicate recordings
    localStorage.setItem("game-loss-recorded", "true");

    // Calculate time played before loss
    const gameTimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    // Prepare the score data - similar to win recording
    const gameData = {
      score: 0, // No points for losses
      mistakes: mistakes,
      timeTaken: gameTimeSeconds,
      difficulty: getDifficultyFromMaxMistakes(maxMistakes),
      timestamp: Date.now(),
      completed: false, // This is the key difference - mark as incomplete
    };

    if (DEBUG) {
      console.log("Recording loss with data:", gameData);
    }

    try {
      // Use isAuthenticated from component scope
      const result = await scoreService.submitScore(gameData, isAuthenticated);

      if (DEBUG) {
        console.log("Loss recording result:", result);
      }
    } catch (error) {
      console.error("Error recording loss:", error);
    }
  }, [encrypted, startTime, mistakes, maxMistakes, isAuthenticated]);

  // Add effect to trigger loss recording when game is lost
  useEffect(() => {
    // Check if the game is lost (too many mistakes)
    if (mistakes >= maxMistakes && encrypted) {
      // Clear the loss recorded flag when starting a new game
      localStorage.removeItem("game-loss-recorded");
      // Record the loss
      recordLossScore();
    }
  }, [mistakes, maxMistakes, encrypted, recordLossScore]);
  // Log auth state for debugging
  useEffect(() => {
    console.log("Game component auth state:", {
      isAuthenticated,
      authLoading,
      userId: user?.id,
    });
  }, [isAuthenticated, authLoading, user]);

  useEffect(() => {
    // Check if current sound state matches settings
    if (settings.soundEnabled !== soundEnabled) {
      toggleSounds(); // Toggle sounds to match settings
    }
  }, [settings.soundEnabled, soundEnabled, toggleSounds]);

  // Modal context access - safely retrieve with defensive coding
  const modalContext = useModalContext();

  // Extract modal states safely with fallbacks to prevent errors
  const isLoginOpen = modalContext?.isLoginOpen || false;
  const isSignupOpen = modalContext?.isSignupOpen || false;
  const isSettingsOpen = modalContext?.isSettingsOpen || false;
  const isAboutOpen = modalContext?.isAboutOpen || false;

  // Log modal states for debugging
  useEffect(() => {
    console.log("Modal states in Game component:", {
      isLoginOpen,
      isSignupOpen,
      isSettingsOpen,
      isAboutOpen,
      modalContextExists: !!modalContext,
    });
  }, [isLoginOpen, isSignupOpen, isSettingsOpen, isAboutOpen, modalContext]);

  const navigate = useNavigate();
  const [attributionData, setAttributionData] = useState(null);

  // State management with reducer
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    encrypted,
    display,
    mistakes,
    correctlyGuessed,
    selectedEncrypted,
    lastCorrectGuess,
    letterFrequency,
    guessedMappings,
    originalLetters,
    startTime,
    completionTime,
  } = state;

  // Sound and keyboard hooks
  const { playSound, loadSounds, unlockAudioContext } = useSound();
  const isGameActive = !completionTime && mistakes < maxMistakes;

  // Memoized computed values
  const encryptedLetters = useMemo(
    () => [...new Set(encrypted.match(/[A-Z]/g) || [])],
    [encrypted],
  );

  const sortedEncryptedLetters = useMemo(
    () =>
      settings.gridSorting === "alphabetical"
        ? [...encryptedLetters].sort()
        : encryptedLetters,
    [encryptedLetters, settings.gridSorting],
  );

  const usedGuessLetters = useMemo(
    () => Object.values(guessedMappings),
    [guessedMappings],
  );

  const gameOverStyle = useMemo(
    () => ({
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 1100,
      backgroundColor: settings.theme === "dark" ? "#333" : "#f0f8ff",
      color: settings.theme === "dark" ? "#f8f9fa" : "#212529",
      padding: "25px",
      borderRadius: "12px",
      boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
      textAlign: "center",
      maxWidth: "280px",
      width: "85%",
      margin: "0 auto",
      boxSizing: "border-box",
    }),
    [settings.theme],
  );

  const formattedText = useMemo(() => {
    const enc = useMobileMode ? preventWordBreaks(encrypted) : encrypted;
    const disp = useMobileMode ? preventWordBreaks(display) : display;
    return formatAlternatingLines(enc, disp, true);
  }, [encrypted, display, useMobileMode]);

  // Start Game function - initiates a new game
  const startGame = useCallback(() => {
    if (DEBUG) console.log("Starting new game with settings:", settings);

    // Clear any existing game state from localStorage to avoid conflicts
    localStorage.removeItem("uncrypt-game-id");
    localStorage.removeItem("game-loss-recorded");
    apiService
      .startGame(settings.longText)
      .then((data) => {
        if (DEBUG) console.log("Game data received:", data);

        // Store the game ID in localStorage
        if (data.game_id) {
          localStorage.setItem("uncrypt-game-id", data.game_id);
          if (DEBUG) console.log("Game ID stored:", data.game_id);
        }

        // Process the encrypted text
        let encryptedText = data.encrypted_paragraph;
        let displayText = data.display;

        // Apply hardcore mode filtering if needed
        if (settings.hardcoreMode) {
          encryptedText = encryptedText.replace(/[^A-Z]/g, "");
          displayText = displayText.replace(/[^A-Z█]/g, "");
        }

        // Calculate letter frequencies
        const calculatedFrequency = {};
        for (const char of encryptedText) {
          if (/[A-Z]/.test(char))
            calculatedFrequency[char] = (calculatedFrequency[char] || 0) + 1;
        }

        // Ensure all letters have a frequency value (even if 0)
        for (let i = 0; i < 26; i++) {
          const letter = String.fromCharCode(65 + i);
          calculatedFrequency[letter] = calculatedFrequency[letter] || 0;
        }

        // Update game state
        dispatch({
          type: "START_GAME",
          payload: {
            encrypted: encryptedText,
            display: displayText,
            mistakes: data.mistakes || 0,
            correctlyGuessed: [],
            selectedEncrypted: null,
            lastCorrectGuess: null,
            letterFrequency: calculatedFrequency,
            guessedMappings: {},
            originalLetters: data.original_letters || [],
            startTime: Date.now(),
          },
        });
      })
      .catch((err) => {
        console.error("Error starting game:", err);
        alert(
          "Failed to start game. Check your connection or console for details.",
        );
      });
  }, [settings.hardcoreMode, settings.longText]);

  // Handle clicking on encrypted letters
  const handleEncryptedClick = useCallback(
    (letter) => {
      if (!correctlyGuessed.includes(letter)) {
        dispatch({
          type: "SUBMIT_GUESS",
          payload: { selectedEncrypted: letter },
        });
        playSound("keyclick");
      }
    },
    [correctlyGuessed, playSound],
  );

  // Submit a guess for letter mapping
  const submitGuess = useCallback(
    (guessedLetter) => {
      // Safety check - if no letter is selected, don't proceed
      if (!selectedEncrypted || !guessedLetter) {
        console.warn(
          "Cannot submit guess: No encrypted letter selected or no guess provided",
        );
        return;
      }

      // Get the current game ID
      const gameId = localStorage.getItem("uncrypt-game-id");

      if (DEBUG) {
        console.log(
          `Submitting guess: ${selectedEncrypted} → ${guessedLetter}`,
        );
        console.log(`Current game ID: ${gameId || "None"}`);
      }

      // Show some visual feedback that something is happening
      // You could add a small loading state here if you want

      apiService
        .submitGuess(gameId, selectedEncrypted, guessedLetter)
        .then((data) => {
          // Safety check for data
          if (!data) {
            console.error("Received empty response from submitGuess");
            return;
          }

          // Check for session expired error
          if (data.error && data.error.includes("Session expired")) {
            console.warn("Session expired, starting new game");

            // Store the new game ID if returned
            if (data.game_id) {
              localStorage.setItem("uncrypt-game-id", data.game_id);
            }

            // Restart the game
            startGame();
            return;
          }

          // Process display text for hardcore mode if needed
          let displayText = data.display;
          if (settings.hardcoreMode && displayText) {
            displayText = displayText.replace(/[^A-Z█]/g, "");
          }

          // Prepare state update payload with safe fallbacks
          const payload = {
            display: displayText || display, // Fall back to current display if none returned
            mistakes:
              typeof data.mistakes === "number" ? data.mistakes : mistakes, // Keep current if not returned
            selectedEncrypted: null, // Reset selected letter
          };

          // Handle correctly guessed letters with safety check
          if (Array.isArray(data.correctly_guessed)) {
            payload.correctlyGuessed = data.correctly_guessed;

            // Check if this guess was correct (not previously guessed)
            if (
              data.correctly_guessed.includes(selectedEncrypted) &&
              !correctlyGuessed.includes(selectedEncrypted)
            ) {
              // This was a new correct guess
              payload.lastCorrectGuess = selectedEncrypted;
              payload.guessedMappings = {
                ...guessedMappings,
                [selectedEncrypted]: guessedLetter.toUpperCase(),
              };

              // Play correct sound
              playSound("correct");

              // Clear the correct guess highlight after a delay
              setTimeout(
                () =>
                  dispatch({
                    type: "SUBMIT_GUESS",
                    payload: { lastCorrectGuess: null },
                  }),
                500,
              );
            } else if (data.mistakes > mistakes) {
              // This was an incorrect guess
              playSound("incorrect");
            }
          }

          // Update the game state
          dispatch({ type: "SUBMIT_GUESS", payload });
        })
        .catch((err) => {
          console.error("Error submitting guess:", err);
          // Don't alert - just log to console and continue
          // This prevents the game from breaking on network errors
        });
    },
    [
      selectedEncrypted,
      correctlyGuessed,
      guessedMappings,
      settings.hardcoreMode,
      startGame,
      playSound,
      mistakes,
      display, // Added for fallback
    ],
  );

  // Handle clicking on guess letters
  const handleGuessClick = useCallback(
    (guessedLetter) => {
      if (selectedEncrypted) submitGuess(guessedLetter);
    },
    [selectedEncrypted, submitGuess],
  );

  // Handle getting a hint
  const handleHint = useCallback(() => {
    console.log("Hint button clicked, preparing to make API call");

    apiService
      .getHint()
      .then((data) => {
        console.log("Hint API response received:", data);

        if (data.error && data.error.includes("Session expired")) {
          console.log("Session expired, starting new game");
          if (data.game_id)
            localStorage.setItem("uncrypt-game-id", data.game_id);
          startGame();
          return;
        }

        let displayText = data.display;
        console.log("Display text before processing:", displayText);

        if (settings.hardcoreMode) {
          displayText = displayText.replace(/[^A-Z█]/g, "");
          console.log(
            "Display text after hardcore mode processing:",
            displayText,
          );
        }

        const newCorrectlyGuessed = data.correctly_guessed || correctlyGuessed;
        console.log("New correctly guessed letters:", newCorrectlyGuessed);

        const newMappings = { ...guessedMappings };
        console.log("Previous mappings:", guessedMappings);

        // Track which new letters were added
        const newlyAddedLetters = [];

        newCorrectlyGuessed
          .filter((letter) => !correctlyGuessed.includes(letter))
          .forEach((encryptedLetter) => {
            newlyAddedLetters.push(encryptedLetter);
            for (let i = 0; i < encrypted.length; i++) {
              if (encrypted[i] === encryptedLetter && data.display[i] !== "?") {
                newMappings[encryptedLetter] = data.display[i];
                break;
              }
            }
          });

        console.log("Newly added letters:", newlyAddedLetters);
        console.log("Updated mappings:", newMappings);

        // Create the payload before dispatching
        const payload = {
          display: displayText,
          mistakes: data.mistakes,
          correctlyGuessed: newCorrectlyGuessed,
          guessedMappings: newMappings,
        };
        console.log("Dispatching hint payload:", payload);

        dispatch({
          type: "SET_HINT",
          payload,
        });

        console.log("Hint state updated, playing sound");
        playSound("hint");
      })
      .catch((err) => {
        console.error("Error getting hint - full details:", err);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        alert("Failed to get hint. Check your connection.");
      });
  }, [
    correctlyGuessed,
    guessedMappings,
    settings.hardcoreMode,
    startGame,
    encrypted,
    playSound,
  ]);

  // Keyboard handlers
  const handleEncryptedSelect = useCallback(
    (letter) => {
      dispatch({
        type: "SUBMIT_GUESS",
        payload: { selectedEncrypted: letter },
      });
      if (letter) playSound("keyclick");
    },
    [playSound],
  );

  const handleGuessSubmit = useCallback(
    (guessedLetter) => {
      if (selectedEncrypted) submitGuess(guessedLetter);
    },
    [selectedEncrypted, submitGuess],
  );
  useEffect(() => {
    // Initialize sounds on component mount
    console.log("Game component mounted - initializing sounds");
    loadSounds();

    // Create interaction handlers to unlock audio
    const handleInteraction = () => {
      console.log("User interaction detected - unlocking audio");
      unlockAudioContext();
      loadSounds();
    };

    // Add event listeners for user interactions
    const events = ["mousedown", "touchstart", "keydown"];
    events.forEach((event) => {
      document.addEventListener(event, handleInteraction, { once: true });
    });

    return () => {
      // Clean up event listeners
      events.forEach((event) => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [loadSounds, unlockAudioContext]);
  // Effects
  useEffect(() => {
    // Check if there's an existing game in progress
    const gameId = localStorage.getItem("uncrypt-game-id");
    const gameInProgress =
      Boolean(gameId) &&
      // Check if we have any game data to prevent unnecessarily starting a new game
      (encrypted || localStorage.getItem("uncrypt-game-data"));

    if (DEBUG) {
      console.log("Game component mounted with:", {
        existingGameId: gameId,
        hasEncryptedData: Boolean(encrypted),
        gameInProgress,
        currentSettings: settings,
      });
    }

    // Only start a new game if there isn't one in progress
    if (!gameInProgress) {
      console.log("No game in progress, starting a new game...");
      startGame();
    } else {
      console.log("Existing game found, not starting a new one");

      // Try to restore game state if we have encrypted data but no display data
      // This handles cases where we have a game ID but the state was partially lost
      if (gameId && !encrypted) {
        try {
          // Attempt to restore from localStorage
          const savedGameData = localStorage.getItem("uncrypt-game-data");
          if (savedGameData) {
            const gameData = JSON.parse(savedGameData);
            console.log("Restoring game data from localStorage");

            // Restore game state
            dispatch({
              type: "START_GAME",
              payload: gameData,
            });
          } else {
            // If we can't restore, start a new game
            console.log("Could not restore game data, starting new game");
            startGame();
          }
        } catch (error) {
          console.error("Error restoring game:", error);
          startGame();
        }
      }
    }
  }, [startGame, settings, encrypted]);

  useThemeEffect(settings.theme);

  // Add this useEffect to Game.js
  useEffect(() => {
    // Only save if we have actual game data
    if (encrypted && display) {
      const gameState = {
        encrypted,
        display,
        mistakes,
        correctlyGuessed,
        letterFrequency,
        guessedMappings,
        originalLetters,
        startTime,
      };

      // Save game state to localStorage
      localStorage.setItem("uncrypt-game-data", JSON.stringify(gameState));

      if (DEBUG) {
        console.log("Saved game state to localStorage");
      }
    }
  }, [
    encrypted,
    display,
    mistakes,
    correctlyGuessed,
    letterFrequency,
    guessedMappings,
    originalLetters,
    startTime,
  ]);

  useEffect(() => {
    // Pre-load sounds as soon as component mounts to ensure they're ready
    loadSounds();

    const handleFirstInteraction = () => {
      // Unlock audio context and ensure sounds are loaded on first interaction
      unlockAudioContext();
      loadSounds();

      // Play a silent sound to fully initialize audio context
      const silent = new Audio();
      silent
        .play()
        .then(() => {
          console.log("Silent sound played successfully");
        })
        .catch((err) => {
          console.warn("Failed to play silent sound:", err);
        });

      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [loadSounds, unlockAudioContext]);
  useEffect(() => {
    window.testSound = (soundName = "keyclick") => {
      console.log(`Testing sound: ${soundName}`);
      unlockAudioContext();
      setTimeout(() => {
        playSound(soundName);
        console.log(`Sound ${soundName} playback initiated`);
      }, 100);
    };

    return () => {
      delete window.testSound;
    };
  }, [playSound, unlockAudioContext]);
  // Determine if we should enable keyboard input
  const keyboardEnabled = useMemo(() => {
    const anyModalOpen =
      isLoginOpen || isSignupOpen || isSettingsOpen || isAboutOpen;
    const result = isGameActive && !anyModalOpen;

    console.log("Keyboard input enabled:", result, {
      isGameActive,
      anyModalOpen,
      modals: { isLoginOpen, isSignupOpen, isSettingsOpen, isAboutOpen },
    });

    return result;
  }, [isGameActive, isLoginOpen, isSignupOpen, isSettingsOpen, isAboutOpen]);

  // Updated keyboard input hook to disable when any modal is open
  useKeyboardInput({
    enabled: keyboardEnabled,
    speedMode: settings.speedMode,
    encryptedLetters,
    originalLetters,
    selectedEncrypted,
    onEncryptedSelect: handleEncryptedSelect,
    onGuessSubmit: handleGuessSubmit,
    playSound,
  });

  useEffect(() => {
    if (
      encrypted &&
      encryptedLetters.length > 0 &&
      correctlyGuessed.length >= encryptedLetters.length &&
      !completionTime
    ) {
      dispatch({ type: "SET_COMPLETION", payload: Date.now() });
      playSound("win");
    }
  }, [
    encrypted,
    encryptedLetters,
    correctlyGuessed,
    completionTime,
    playSound,
  ]);

  useEffect(() => {
    if (completionTime && !attributionData) {
      // Game is won, fetch attribution data
      apiService
        .getAttribution()
        .then((data) => {
          console.log("Attribution data fetched:", data);
          setAttributionData(data);
        })
        .catch((error) => {
          console.error("Error fetching attribution:", error);
        });
    }
  }, [completionTime, attributionData]);

  // Render logic
  const renderGameHeader = () => <HeaderControls title="uncrypt" />;

  const renderTextContainer = () => (
    <div
      className={`text-container ${settings.hardcoreMode ? "hardcore-mode" : ""}`}
    >
      <div
        className="alternating-text"
        dangerouslySetInnerHTML={formattedText}
      />
      {settings.hardcoreMode && (
        <div className="hardcore-badge">HARDCORE MODE</div>
      )}
    </div>
  );

  const renderGrids = () => (
    <div className="grids">
      <div className="encrypted-grid">
        {sortedEncryptedLetters.map((letter) => (
          <LetterCell
            key={letter}
            letter={letter}
            isSelected={selectedEncrypted === letter}
            isGuessed={correctlyGuessed.includes(letter)}
            isFlashing={lastCorrectGuess === letter}
            frequency={letterFrequency[letter]}
            onClick={() => handleEncryptedClick(letter)}
            disabled={!isGameActive}
          />
        ))}
      </div>
      <div className="guess-grid">
        {originalLetters.map((letter) => (
          <LetterCell
            key={letter}
            letter={letter}
            isGuessed={usedGuessLetters.includes(letter)}
            onClick={() => handleGuessClick(letter)}
            disabled={!isGameActive || !selectedEncrypted}
          />
        ))}
      </div>
    </div>
  );

  const renderControls = () => (
    <div className="controls">
      <div className="controls-main">
        <p>
          Mistakes: {mistakes}/{maxMistakes}
        </p>
        <button
          onClick={handleHint}
          disabled={mistakes >= maxMistakes - 1 || !isGameActive}
          className="hint-button"
        >
          Hint (Costs 1 Mistake)
        </button>
      </div>
    </div>
  );

  const renderLeaderboardButton = () => (
    <button
      className="leaderboard-button-fixed"
      onClick={() => navigate("/leaderboard")}
      aria-label="Leaderboard"
    >
      <FaTrophy size={16} />
    </button>
  );

  const renderGameOverCelebration = () =>
    completionTime ? (
      <WinCelebration
        startGame={startGame}
        playSound={playSound}
        mistakes={mistakes}
        maxMistakes={maxMistakes}
        startTime={startTime}
        completionTime={completionTime}
        theme={settings.theme}
        textColor={settings.textColor}
        encrypted={encrypted}
        display={display}
        correctlyGuessed={correctlyGuessed}
        guessedMappings={guessedMappings}
        attribution={attributionData}
        hasWon={true}
      />
    ) : mistakes >= maxMistakes ? (
      <div className="game-message" style={gameOverStyle}>
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
          onClick={startGame}
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
    ) : null;

  if (currentView === "settings") {
    return (
      <div
        className={`App-container ${settings.theme === "dark" ? "dark-theme" : ""}`}
      >
        {/* Settings handled by ModalManager now */}
      </div>
    );
  }

  if (useMobileMode) {
    return (
      <div className="App-container">
        <MobileLayout isLandscape={isLandscape}>
          {renderGameHeader()}
          {renderTextContainer()}
          {renderGrids()}
          {renderControls()}
          {renderGameOverCelebration()}
        </MobileLayout>
      </div>
    );
  }

  return (
    <div
      className={`App-container ${settings.theme === "dark" ? "dark-theme" : ""}`}
    >
      {renderGameHeader()}
      {renderTextContainer()}
      {renderGrids()}
      {renderControls()}
      {renderGameOverCelebration()}
      {renderLeaderboardButton()}

      {/* Debug display */}
      {DEBUG && (
        <div
          style={{
            position: "fixed",
            bottom: 10,
            left: 10,
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: 10,
            borderRadius: 5,
            fontSize: 12,
            zIndex: 9999,
            maxWidth: 250,
            maxHeight: 150,
            overflow: "auto",
          }}
        >
          <p>Debug Info:</p>
          <pre style={{ fontSize: 10 }}>
            {JSON.stringify(
              {
                theme: settings.theme,
                sound: settings.soundEnabled,
                difficulty: settings.difficulty,
                gridSorting: settings.gridSorting,
                hardcoreMode: settings.hardcoreMode,
                maxMistakes,
                modalsOpen: {
                  isLoginOpen,
                  isSignupOpen,
                  isSettingsOpen,
                  isAboutOpen,
                  contextAvailable: !!modalContext,
                },
                keyboardEnabled,
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

export default Game;
