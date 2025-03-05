import React, { useReducer, useEffect, useCallback, useMemo } from "react";
import "./App.css";
import "./Mobile.css";
import Settings from "./Settings";
import { useAppContext } from "./AppContext";
import useSound from "./SoundManager";
import useKeyboardInput from "./KeyboardController";
import { formatAlternatingLines, preventWordBreaks } from "./utils";
import SaveButton from "./SaveButton"; // Unused in original; kept for completeness
import WinCelebration from "./WinCelebration";
import About from "./About";
import MobileLayout from "./MobileLayout";
import config from "./config";
import apiService from "./apiService";

// Debug flag
const DEBUG = true;

// Constants for SVGs to avoid repetition
const ABOUT_ICON_SVG = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const SETTINGS_ICON_SVG = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

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

function App() {
  // Context and settings
  const {
    settings,
    updateSettings,
    currentView,
    showSettings,
    showGame,
    maxMistakes,
    isAboutOpen,
    openAbout,
    closeAbout,
    isMobile,
    isLandscape,
    useMobileMode,
  } = useAppContext();

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
  const { playSound } = useSound();
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

  // Memoized event handlers
  const startGame = useCallback(() => {
    if (DEBUG) console.log("Starting new game...");
    // Use longstart endpoint if longText setting is enabled
    const endpoint = settings.longText ? '/longstart' : '/start';
    fetch(`${config.apiUrl}${endpoint}`, {
      credentials: "include",
      mode: "cors",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (DEBUG) console.log("Game data received:", data);
        if (data.game_id) localStorage.setItem("uncrypt-game-id", data.game_id);

        let encryptedText = data.encrypted_paragraph;
        let displayText = data.display;
        if (settings.hardcoreMode) {
          encryptedText = encryptedText.replace(/[^A-Z]/g, "");
          displayText = displayText.replace(/[^A-Z█]/g, "");
        }
        const calculatedFrequency = {};
        for (const char of encryptedText) {
          if (/[A-Z]/.test(char))
            calculatedFrequency[char] = (calculatedFrequency[char] || 0) + 1;
        }
        for (let i = 0; i < 26; i++) {
          const letter = String.fromCharCode(65 + i);
          calculatedFrequency[letter] = calculatedFrequency[letter] || 0;
        }

        dispatch({
          type: "START_GAME",
          payload: {
            encrypted: encryptedText,
            display: displayText,
            mistakes: data.mistakes,
            correctlyGuessed: [],
            selectedEncrypted: null,
            lastCorrectGuess: null,
            letterFrequency: calculatedFrequency,
            guessedMappings: {},
            originalLetters: data.original_letters,
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
  }, [settings.hardcoreMode]);

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

  const handleGuessClick = useCallback(
    (guessedLetter) => {
      if (selectedEncrypted) submitGuess(guessedLetter);
    },
    [selectedEncrypted],
  );

  const submitGuess = useCallback(
    (guessedLetter) => {
      const gameId = localStorage.getItem("uncrypt-game-id");
      const requestBody = {
        encrypted_letter: selectedEncrypted,
        guessed_letter: guessedLetter.toUpperCase(),
      };
      if (gameId) requestBody.game_id = gameId;

      fetch(`${config.apiUrl}/guess`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (data.error && data.error.includes("Session expired")) {
            if (data.game_id)
              localStorage.setItem("uncrypt-game-id", data.game_id);
            startGame();
            return;
          }

          let displayText = data.display;
          if (settings.hardcoreMode)
            displayText = displayText.replace(/[^A-Z█]/g, "");

          const payload = {
            display: displayText,
            mistakes: data.mistakes,
            selectedEncrypted: null,
          };
          if (data.correctly_guessed) {
            payload.correctlyGuessed = data.correctly_guessed;
            if (
              data.correctly_guessed.includes(selectedEncrypted) &&
              !correctlyGuessed.includes(selectedEncrypted)
            ) {
              payload.lastCorrectGuess = selectedEncrypted;
              payload.guessedMappings = {
                ...guessedMappings,
                [selectedEncrypted]: guessedLetter.toUpperCase(),
              };
              playSound("correct");
              setTimeout(
                () =>
                  dispatch({
                    type: "SUBMIT_GUESS",
                    payload: { lastCorrectGuess: null },
                  }),
                500,
              );
            } else if (data.mistakes > mistakes) {
              playSound("incorrect");
            }
          }
          dispatch({ type: "SUBMIT_GUESS", payload });
        })
        .catch((err) => {
          console.error("Error guessing:", err);
          alert("Failed to submit guess. Check your connection.");
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
    ],
  );

  const handleHint = useCallback(() => {
    const gameId = localStorage.getItem("uncrypt-game-id");
    const requestBody = gameId ? { game_id: gameId } : {};

    fetch(`${config.apiUrl}/hint`, {
      method: "POST",
      credentials: "include",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.error && data.error.includes("Session expired")) {
          if (data.game_id)
            localStorage.setItem("uncrypt-game-id", data.game_id);
          startGame();
          return;
        }

        let displayText = data.display;
        if (settings.hardcoreMode)
          displayText = displayText.replace(/[^A-Z█]/g, "");
        const newCorrectlyGuessed = data.correctly_guessed || correctlyGuessed;
        const newMappings = { ...guessedMappings };
        newCorrectlyGuessed
          .filter((letter) => !correctlyGuessed.includes(letter))
          .forEach((encryptedLetter) => {
            for (let i = 0; i < encrypted.length; i++) {
              if (encrypted[i] === encryptedLetter && data.display[i] !== "?") {
                newMappings[encryptedLetter] = data.display[i];
                break;
              }
            }
          });

        dispatch({
          type: "SET_HINT",
          payload: {
            display: displayText,
            mistakes: data.mistakes,
            correctlyGuessed: newCorrectlyGuessed,
            guessedMappings: newMappings,
          },
        });
        playSound("hint");
      })
      .catch((err) => {
        console.error("Error getting hint:", err);
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

  // Effects
  useEffect(() => startGame(), [startGame]);
  useThemeEffect(settings.theme);

  useKeyboardInput({
    enabled: isGameActive,
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

  // Settings handler
  const handleSaveSettings = useCallback(
    (newSettings) => {
      updateSettings(newSettings);
      showGame();
    },
    [updateSettings, showGame],
  );

  // Render logic
  const renderGameHeader = () => (
    <div className="game-header">
      <button className="about-icon" onClick={openAbout} aria-label="About">
        {ABOUT_ICON_SVG}
      </button>
      <h1 className="retro-title">uncrypt</h1>
      <button
        className="settings-icon"
        onClick={showSettings}
        aria-label="Settings"
      >
        {SETTINGS_ICON_SVG}
      </button>
    </div>
  );

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
        <Settings
          currentSettings={settings}
          onSave={handleSaveSettings}
          onCancel={showGame}
        />
      </div>
    );
  }

  if (useMobileMode) {
    return (
      <div className="App-container">
        {isAboutOpen && <About isOpen={isAboutOpen} onClose={closeAbout} />}
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
      {isAboutOpen && <About isOpen={isAboutOpen} onClose={closeAbout} />}

      {renderGameHeader()}
      {renderTextContainer()}
      {renderGrids()}
      {renderControls()}
      {renderGameOverCelebration()}
    </div>
  );
}

export default App;
