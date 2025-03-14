// src/pages/Game.js - Simplified
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useContext,
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
import apiService from "../services/apiService";
import { formatAlternatingLines } from "../utils/utils";
// Component imports
import HeaderControls from "../components/HeaderControls";
import MobileLayout from "../components/layout/MobileLayout";
import WinCelebration from "../components/modals/WinCelebration";

// Click handlers
// import {
//   handleEncryptedClick,
//   handleGuessClick,
//   submitGuess,
//   handleHint,
// } from "../utils/ClickHandlers";

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
      {frequency !== undefined && (
        <span className="frequency-indicator">{frequency || 0}</span>
      )}
    </div>
  ),
);

function Game() {
  console.log("Game component rendering");

  const navigate = useNavigate();

  // Get all context data
  const { settings, maxMistakes } = useSettings();
  const { isAuthenticated } = useAuth();
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
    startGame,
    handleEncryptedSelect: contextHandleEncryptedSelect,
    getHint,
    submitGuess,
    hasWon,
    hasLost,
    winData,
  } = useGameState();
  // UI context for mobile detection
  const { useMobileMode, isLandscape } = useUI();
  // const { dispatch } = useContext(GameStateContext);
  // Modal context for checking open modals
  const modalContext = useModalContext();

  // Local state
  const [loading, setLoading] = useState(true);
  const [gameLoaded, setGameLoaded] = useState(false);
  const [attributionData, setAttributionData] = useState(null);

  // Sound handling
  const { playSound, loadSounds, unlockAudioContext, soundEnabled } =
    useSound();
  useEffect(() => {
    console.log("Game state changed - display:", display);
    console.log("Correctly guessed letters:", correctlyGuessed);
    console.log("Guessed mappings:", guessedMappings);
  }, [display, correctlyGuessed, guessedMappings]);
  // Initialize game when component mounts
  useEffect(() => {
    console.log("Game mount effect - initializing game");

    const initializeGame = async () => {
      setLoading(true);
      try {
        console.log("Starting new game...");
        await startGame(settings.longText, settings.hardcoreMode);
        console.log("Game started successfully");
        setGameLoaded(true);
      } catch (err) {
        console.error("Error starting game:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!encrypted || !gameLoaded) {
      initializeGame();
    } else {
      setLoading(false);
      console.log("Game already loaded:", {
        encryptedLength: encrypted?.length || 0,
        displayLength: display?.length || 0,
      });
    }

    // Initialize audio
    loadSounds();
    const handleFirstInteraction = () => {
      unlockAudioContext();
      loadSounds();
    };

    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [startGame, settings.longText, settings.hardcoreMode]);

  // Ensure theme is applied to body and document
  useEffect(() => {
    const className = "dark-theme";
    if (settings.theme === "dark") {
      document.documentElement.classList.add(className);
      document.body.classList.add(className);
    } else {
      document.documentElement.classList.remove(className);
      document.body.classList.remove(className);
    }
  }, [settings.theme]);
  useEffect(() => {
    const authRequiredSubscription = apiService.on("auth:required", () => {
      // Show a message to the user
      alert("You need to log in again to continue.");
      // Optionally open the login modal
    });

    return () => {
      authRequiredSubscription(); // Clean up the subscription
    };
  }, []);
  // Start a new game manually
  const handleStartNewGame = useCallback(() => {
    console.log("Starting new game manually");
    startGame(settings.longText, settings.hardcoreMode);
  }, [startGame, settings.longText, settings.hardcoreMode]);

  // Handle submit guess wrapper function
  // Update handleSubmitGuess in Game.js
  const handleSubmitGuess = useCallback(
    async (guessedLetter) => {
      if (!selectedEncrypted) {
        console.warn("Cannot submit guess: No encrypted letter selected");
        return;
      }

      console.log(`Submitting guess: ${selectedEncrypted} → ${guessedLetter}`);

      try {
        // Use the submitGuess function from context (defined in GameStateContext.js)
        const result = await submitGuess(selectedEncrypted, guessedLetter);
        console.log("Guess result:", result);

        // Play sound based on result
        if (result.success) {
          if (result.isCorrect) {
            playSound("correct");
          } else {
            playSound("incorrect");
          }
        }

        // Reset selected letter regardless of result
        contextHandleEncryptedSelect(null);
      } catch (error) {
        console.error("Error submitting guess:", error);
        contextHandleEncryptedSelect(null);
      }
    },
    [
      selectedEncrypted,
      submitGuess, // The submitGuess function from GameStateContext
      contextHandleEncryptedSelect,
      playSound,
    ],
  );

  // Handle encrypted grid click
  const onEncryptedClick = useCallback(
    (letter) => {
      contextHandleEncryptedSelect(letter);
      playSound("keyclick");
    },
    [contextHandleEncryptedSelect, playSound],
  );

  // Handle guess grid click
  const onGuessClick = useCallback(
    (guessedLetter) => {
      if (selectedEncrypted) {
        handleSubmitGuess(guessedLetter);
      }
    },
    [selectedEncrypted, handleSubmitGuess],
  );

  // Handle hint button click
  const onHintClick = useCallback(async () => {
    console.log("Hint button clicked");

    try {
      // Use the getHint function provided by useGameState
      const result = await getHint();
      console.log("Hint result from context:", result);

      // Play sound if successful
      if (result.success) {
        playSound && playSound("hint");
      }
    } catch (error) {
      console.error("Error in hint button handler:", error);
    }
  }, [getHint, playSound]);

  // Add this state for forcing updates
  const [forceUpdate, setForceUpdate] = useState(false);

  // Memoized computed values
  const encryptedLetters = useMemo(() => {
    if (!encrypted) return [];
    const matches = encrypted.match(/[A-Z]/g);
    return matches ? [...new Set(matches)] : [];
  }, [encrypted]);

  const sortedEncryptedLetters = useMemo(() => {
    return settings.gridSorting === "alphabetical"
      ? [...encryptedLetters].sort()
      : encryptedLetters;
  }, [encryptedLetters, settings.gridSorting]);

  const usedGuessLetters = useMemo(() => {
    return Object.values(guessedMappings);
  }, [guessedMappings]);

  // Format text for display
  const formattedText = useMemo(() => {
    if (!encrypted || !display) return { __html: "" };
    return formatAlternatingLines(encrypted, display, true);
  }, [encrypted, display]);

  // Determine if game is active
  const isGameActive = !!encrypted && !completionTime && mistakes < maxMistakes;

  // Get modal states to disable keyboard when modals are open
  const { isLoginOpen, isSignupOpen, isSettingsOpen, isAboutOpen } =
    useModalContext();

  // Determine if we should enable keyboard input
  const keyboardEnabled = useMemo(() => {
    // Disable keyboard when any modal is open
    const anyModalOpen =
      isLoginOpen || isSignupOpen || isSettingsOpen || isAboutOpen;

    // Keyboard should only be active when game is active AND no modals are open
    const enabled = isGameActive && !anyModalOpen;

    console.log("Keyboard input enabled:", enabled, {
      isGameActive,
      modalStates: { isLoginOpen, isSignupOpen, isSettingsOpen, isAboutOpen },
    });

    return enabled;
  }, [isGameActive, isLoginOpen, isSignupOpen, isSettingsOpen, isAboutOpen]);

  // Set up keyboard input with explicit modal awareness
  const { isActive } = useKeyboardInput({
    enabled: keyboardEnabled,
    speedMode: true,
    encryptedLetters,
    originalLetters,
    selectedEncrypted,
    onEncryptedSelect: contextHandleEncryptedSelect,
    onGuessSubmit: handleSubmitGuess,
    playSound,
  });

  // If loading, show simple loading screen
  if (loading) {
    return (
      <div
        className={`App-container ${settings.theme === "dark" ? "dark-theme" : ""}`}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "80vh",
          }}
        >
          <h2>Loading game...</h2>
        </div>
      </div>
    );
  }

  // If the game hasn't loaded properly, show error and retry button
  if (!encrypted && !loading) {
    return (
      <div
        className={`App-container ${settings.theme === "dark" ? "dark-theme" : ""}`}
      >
        <HeaderControls title="uncrypt" />
        <div
          style={{
            textAlign: "center",
            margin: "50px auto",
            maxWidth: "400px",
            padding: "20px",
            backgroundColor: settings.theme === "dark" ? "#333" : "#f0f8ff",
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
            onClick={() => {
              console.log(`Clicking encrypted letter: ${letter}`);
              onEncryptedClick(letter);
            }}
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
            onClick={() => {
              console.log(
                `Clicking guess letter: ${letter}, selectedEncrypted: ${selectedEncrypted}`,
              );
              onGuessClick(letter);
            }}
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
          onClick={onHintClick}
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

  const renderGameOver = () => {
    if (hasWon) {
      return (
        <WinCelebration
          startGame={handleStartNewGame}
          playSound={playSound}
          theme={settings.theme}
          textColor={settings.textColor}
          winData={winData} // Pass the win data from context
        />
      );
    }

    if (hasLost) {
      return (
        <div
          className="game-message"
          style={{
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
      className={`App-container ${settings.theme === "dark" ? "dark-theme" : ""}`}
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
