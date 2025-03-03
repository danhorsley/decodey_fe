import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import "./Mobile.css";
import Settings from "./Settings";
import { useAppContext } from "./AppContext";
import useSound from "./SoundManager";
import useKeyboardInput from "./KeyboardController";
import { createStructuralMatch } from "./utils";
import { formatAlternatingLines, preventWordBreaks } from "./utils";
import SaveButton from "./SaveButton";
import WinCelebration from "./WinCelebration";
import About from "./About";
import MobileLayout from "./MobileLayout";
import config from "./config";
import apiService from "./apiService";

// Debug flag for logging
const DEBUG = true;

function App() {
  // ==== CONTEXT AND APP SETTINGS ====
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
    // Mobile-related properties
    isMobile,
    isLandscape,
    useMobileMode,
  } = useAppContext();

  // ==== STATE DECLARATIONS ====
  const [encrypted, setEncrypted] = useState("");
  const [display, setDisplay] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [correctlyGuessed, setCorrectlyGuessed] = useState([]);
  const [selectedEncrypted, setSelectedEncrypted] = useState(null);
  const [lastCorrectGuess, setLastCorrectGuess] = useState(null);
  const [letterFrequency, setLetterFrequency] = useState({});
  const [guessedMappings, setGuessedMappings] = useState({});
  const [originalLetters, setOriginalLetters] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [completionTime, setCompletionTime] = useState(null);

  // ==== DERIVED VALUES AND CALCULATIONS ====
  // Get unique encrypted letters that actually appear in the encrypted text - memoized
  const encryptedLetters = React.useMemo(() => {
    return [...new Set(encrypted.match(/[A-Z]/g) || [])];
  }, [encrypted]);

  // Store the unique letter count in a ref to avoid re-renders
  const uniqueEncryptedLettersRef = useRef(0);

  // Sort the encrypted letters based on the setting
  const sortedEncryptedLetters = React.useMemo(() => {
    if (settings.gridSorting === "alphabetical") {
      return [...encryptedLetters].sort();
    }
    return encryptedLetters;
  }, [encryptedLetters, settings.gridSorting]);

  // Get used letters for display
  const usedGuessLetters = Object.values(guessedMappings);

  // ==== UTILITY FUNCTIONS ====
  // Initialize sound manager
  const { playSound } = useSound();

  // ==== GAME FUNCTIONS ====
  const startGame = () => {
    if (DEBUG) console.log("Starting new game...");

    fetch(`${config.apiUrl}/start`, {
      credentials: "include", // Critical for session cookies
      mode: "cors",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`HTTP error! Status: ${res.status}`);
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        if (DEBUG)
          console.log(
            "Response headers:",
            Object.fromEntries([...res.headers]),
          );
        return res.json();
      })
      .then((data) => {
        if (DEBUG) console.log("Game data received:", data);

        // Save game ID to localStorage
        if (data.game_id) {
          localStorage.setItem("uncrypt-game-id", data.game_id);
          console.log("Saved game ID to localStorage:", data.game_id);
        } else {
          console.warn("No game ID received from server");
        }

        // Apply hardcore mode if enabled
        let encryptedText = data.encrypted_paragraph;
        let displayText = data.display;

        if (settings.hardcoreMode) {
          encryptedText = encryptedText.replace(/[^A-Z]/g, "");
          displayText = displayText.replace(/[^A-Z█]/g, ""); // Keep block characters in regex
        }
        const calculatedFrequency = {};
        for (const char of encryptedText) {
          if (/[A-Z]/.test(char)) {
            calculatedFrequency[char] = (calculatedFrequency[char] || 0) + 1;
          }
        }

        // Fill in zeros for unused letters to ensure complete A-Z coverage
        for (let i = 0; i < 26; i++) {
          const letter = String.fromCharCode(65 + i); // A-Z
          if (!calculatedFrequency[letter]) {
            calculatedFrequency[letter] = 0;
          }
        }

        setEncrypted(encryptedText);
        setDisplay(displayText);
        setMistakes(data.mistakes);
        setCorrectlyGuessed([]);
        //setLetterFrequency(data.letter_frequency);
        setLetterFrequency(calculatedFrequency);
        setSelectedEncrypted(null);
        setLastCorrectGuess(null);
        setGuessedMappings({});
        setOriginalLetters(data.original_letters);
        setStartTime(Date.now());
        setCompletionTime(null);
        //playSound('keyclick');
      })
      .catch((err) => {
        console.error("Error starting game:", err);
        alert("Error starting game. Please check console for details.");
      });
  };

  const handleEncryptedClick = (letter) => {
    if (!correctlyGuessed.includes(letter)) {
      setSelectedEncrypted(letter);
      playSound("keyclick");
    }
  };

  const handleGuessClick = (guessedLetter) => {
    if (selectedEncrypted) {
      submitGuess(guessedLetter);
    }
  };

  // Enhanced debugging for submitGuess
  // Enhanced submitGuess function that works with your current backend
  const submitGuess = (guessedLetter) => {
    // Get the game_id from localStorage
    const gameId = localStorage.getItem("uncrypt-game-id");

    console.log(`Submitting guess: ${guessedLetter} for ${selectedEncrypted}`);
    console.log(`Using game_id: ${gameId}`);

    // Prepare the request body
    const requestBody = {
      encrypted_letter: selectedEncrypted,
      guessed_letter: guessedLetter.toUpperCase(),
    };

    // Add game_id if available
    if (gameId) {
      requestBody.game_id = gameId;
    }

    console.log("Full request body:", JSON.stringify(requestBody));

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
        if (!res.ok) {
          console.error(`HTTP error! Status: ${res.status}`);
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        console.log("Response headers:", Object.fromEntries([...res.headers]));
        return res.json();
      })
      .then((data) => {
        console.log("Guess response:", data);

        // Check if there's an error message about session expiration
        if (data.error && data.error.includes("Session expired")) {
          console.warn("Session expired. A new game was started.");

          // If a new game_id is provided, save it
          if (data.game_id) {
            localStorage.setItem("uncrypt-game-id", data.game_id);
            console.log("New game ID saved:", data.game_id);
          }

          // Start a new game
          startGame();
          return;
        }

        // Process display text for hardcore mode if enabled
        let displayText = data.display;
        if (settings.hardcoreMode) {
          displayText = displayText.replace(/[^A-Z█]/g, ""); // Keep block characters in regex
        }

        setDisplay(displayText);
        setMistakes(data.mistakes);

        // Make sure correctly_guessed exists in the response
        if (data.correctly_guessed) {
          setCorrectlyGuessed(data.correctly_guessed);

          if (
            data.correctly_guessed.includes(selectedEncrypted) &&
            !correctlyGuessed.includes(selectedEncrypted)
          ) {
            playSound("correct");
            setLastCorrectGuess(selectedEncrypted);
            setGuessedMappings((prev) => ({
              ...prev,
              [selectedEncrypted]: guessedLetter.toUpperCase(),
            }));
            setTimeout(() => setLastCorrectGuess(null), 500);
          } else if (data.mistakes > mistakes) {
            playSound("incorrect");
          }
        } else {
          console.error("Response missing correctly_guessed array:", data);
        }

        setSelectedEncrypted(null);
      })
      .catch((err) => {
        console.error("Error guessing:", err);

        // Handle connection errors gracefully
        if (err.message.includes("Failed to fetch")) {
          alert(
            "Connection to the server failed. Please check your internet connection and try again.",
          );
        }
      });
  };

  const handleHint = () => {
    console.log("=== HINT REQUEST DEBUGGING ===");
    console.log("Requesting hint...");

    // Get the game_id from localStorage
    const gameId = localStorage.getItem("uncrypt-game-id");
    console.log("Game ID from localStorage:", gameId);

    // Prepare the request body
    const requestBody = {};

    // Add game_id if available
    if (gameId) {
      requestBody.game_id = gameId;
      console.log("Added game_id to request body:", gameId);
    } else {
      console.warn("No game_id available to send!");
    }

    console.log("Complete request body:", JSON.stringify(requestBody));

    fetch(`${config.apiUrl}/hint`, {
      method: "POST",
      credentials: "include", // Critical for session cookies
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    })
      .then((res) => {
        console.log("Response status:", res.status);
        console.log("Response headers:", Object.fromEntries([...res.headers]));

        if (!res.ok) {
          console.error(`HTTP error! Status: ${res.status}`);
          throw new Error(`HTTP error! Status: ${res.status}`);
        }

        return res.json();
      })
      .then((data) => {
        console.log("Hint response data:", data);

        // Check if there's an error message about session expiration
        if (data.error && data.error.includes("Session expired")) {
          console.warn("Session expired error detected!");

          // If a new game_id is provided, save it
          if (data.game_id) {
            localStorage.setItem("uncrypt-game-id", data.game_id);
            console.log("New game ID saved:", data.game_id);
          } else {
            console.warn("No new game_id provided in response");
          }

          // Automatically restart the game
          console.log("Restarting game due to expired session");
          startGame();
          return;
        }

        console.log("Processing valid hint response");

        // Store old state for comparison
        const oldCorrectlyGuessed = [...correctlyGuessed];
        console.log("Previous correctly guessed:", oldCorrectlyGuessed);

        // Process display text for hardcore mode if enabled
        let displayText = data.display;
        if (settings.hardcoreMode) {
          displayText = displayText.replace(/[^A-Z█]/g, ""); // Keep block characters in regex
        }

        // Update state with server response
        setDisplay(displayText);
        setMistakes(data.mistakes);

        if (data.correctly_guessed) {
          console.log("New correctly guessed:", data.correctly_guessed);

          // Find which letter is newly added (the hint)
          const newGuessedLetters = data.correctly_guessed.filter(
            (letter) => !oldCorrectlyGuessed.includes(letter),
          );
          console.log("Newly guessed letters:", newGuessedLetters);

          // For each newly guessed letter, update the mapping
          newGuessedLetters.forEach((encryptedLetter) => {
            // Find this letter in the encrypted text and get the corresponding character in display
            for (let i = 0; i < encrypted.length; i++) {
              if (encrypted[i] === encryptedLetter && data.display[i] !== "?") {
                // Add to guessedMappings
                setGuessedMappings((prev) => ({
                  ...prev,
                  [encryptedLetter]: data.display[i],
                }));
                console.log(
                  `Updated mapping: ${encryptedLetter} -> ${data.display[i]}`,
                );
                break;
              }
            }
          });

          // Update correctlyGuessed state
          setCorrectlyGuessed(data.correctly_guessed);

          // Play hint sound
          playSound("hint");
        } else {
          console.error("Response missing correctly_guessed array:", data);
        }
      })
      .catch((err) => {
        console.error("Error getting hint:", err);

        // Handle connection errors gracefully
        if (err.message.includes("Failed to fetch")) {
          alert(
            "Connection to the server failed. Please check your internet connection and try again.",
          );
        }
      });
  };

  // ==== KEYBOARD INPUT HANDLERS ====
  const handleEncryptedSelect = (letter) => {
    setSelectedEncrypted(letter);
    if (letter) {
      playSound("keyclick");
    }
  };

  const handleGuessSubmit = (guessedLetter) => {
    if (selectedEncrypted) {
      submitGuess(guessedLetter);
    }
  };

  // ==== EFFECTS ====
  // Initialize game on component mount
  useEffect(() => {
    startGame();
  }, []);

  // Keyboard input handling
  useKeyboardInput({
    enabled: !completionTime && mistakes < maxMistakes, // Disable when game is over
    speedMode: settings.speedMode,
    encryptedLetters: encryptedLetters,
    originalLetters: originalLetters,
    selectedEncrypted: selectedEncrypted,
    onEncryptedSelect: handleEncryptedSelect,
    onGuessSubmit: handleGuessSubmit,
    playSound: playSound,
  });

  // Win check effect - using completionTime as source of truth
  useEffect(() => {
    // Only run this effect when the encrypted text or correctly guessed letters change
    if (encrypted) {
      // Store the count in the ref
      uniqueEncryptedLettersRef.current = encryptedLetters.length;

      // Only check for win if we have unique letters and some guesses
      if (encryptedLetters.length > 0 && correctlyGuessed.length > 0) {
        // Compare the current state
        const winCondition = correctlyGuessed.length >= encryptedLetters.length;

        // Only set completion time once when the game is won
        if (winCondition && !completionTime) {
          setCompletionTime(Date.now());
          playSound("win");
          console.log("GAME WON!", {
            uniqueLetters: encryptedLetters.length,
            correctlyGuessedLength: correctlyGuessed.length,
            hasWon: winCondition,
          });
        }
      }
    }
  }, [
    encrypted,
    correctlyGuessed,
    encryptedLetters,
    completionTime,
    playSound,
  ]);

  // Apply theme effect - this runs for both game and settings views
  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark-theme");
      document.body.classList.add("dark-theme");
    } else {
      document.documentElement.classList.remove("dark-theme");
      document.body.classList.remove("dark-theme");
    }
  }, [settings.theme]);

  // ==== SETTINGS HANDLERS ====
  // Handle settings update
  const handleSaveSettings = (newSettings) => {
    updateSettings(newSettings);
    showGame();
  };

  // ==== CONDITIONAL RENDERING ====
  // When in settings view
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

  // Mobile Game View
  // This is a snippet to modify in your App.js file

  // Find the Mobile Game View section and update it to this:

  // Mobile Game View
  if (useMobileMode) {
    return (
      <div className="App-container">
        {isAboutOpen && <About isOpen={isAboutOpen} onClose={closeAbout} />}
        <MobileLayout isLandscape={isLandscape}>
          <div className="game-header">
            <button
              className="about-icon"
              onClick={openAbout}
              aria-label="About"
            >
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
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </button>
            <h1 className="game-title">uncrypt</h1>
            <button
              className="settings-icon"
              onClick={showSettings}
              aria-label="Settings"
            >
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
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </div>

          {/* Text container - will be positioned between grids by MobileLayout */}
          <div
            className={`text-container ${settings.hardcoreMode ? "hardcore-mode" : ""}`}
          >
            {/* For mobile, prevent word breaks across lines */}
            <div
              className="alternating-text"
              dangerouslySetInnerHTML={formatAlternatingLines(
                useMobileMode ? preventWordBreaks(encrypted) : encrypted,
                useMobileMode ? preventWordBreaks(display) : display,
              )}
            ></div>
            {settings.hardcoreMode && (
              <div className="hardcore-badge">HARDCORE MODE</div>
            )}
          </div>

          {/* Grids - these will be positioned on the left and right sides by MobileLayout */}
          <div className="grids">
            <div className="encrypted-grid">
              {sortedEncryptedLetters.map((letter) => (
                <div
                  key={letter}
                  className={`letter-cell ${selectedEncrypted === letter ? "selected" : ""} ${
                    correctlyGuessed.includes(letter) ? "guessed" : ""
                  } ${lastCorrectGuess === letter ? "flash" : ""}`}
                  onClick={() => handleEncryptedClick(letter)}
                >
                  {letter}
                  <span className="frequency-indicator">
                    {letterFrequency[letter] || 0}
                  </span>
                </div>
              ))}
            </div>

            <div className="guess-grid">
              {originalLetters.map((letter) => (
                <div
                  key={letter}
                  className={`letter-cell ${usedGuessLetters.includes(letter) ? "guessed" : ""}`}
                  onClick={() => handleGuessClick(letter)}
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>

          {/* Controls now directly within the layout */}
          <div className="controls">
            <p>
              Mistakes: {mistakes}/{maxMistakes}
            </p>
            <button
              onClick={handleHint}
              disabled={mistakes >= maxMistakes - 1}
              className="hint-button"
            >
              Hint
            </button>
          </div>

          {completionTime ? (
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
            <div className="game-message">
              <p>Game Over! Too many mistakes.</p>
              <button onClick={startGame}>Try Again</button>
            </div>
          ) : null}
        </MobileLayout>
      </div>
    );
  }

  // Default Desktop Game View
  return (
    <div
      className={`App-container ${settings.theme === "dark" ? "dark-theme" : ""}`}
    >
      {isAboutOpen && <About isOpen={isAboutOpen} onClose={closeAbout} />}
      <div
        className={`App ${settings.theme === "dark" ? "dark-theme" : ""} text-${settings.textColor} placeholder-${settings.placeholderStyle}`}
      >
        <div className="game-header">
          <button className="about-icon" onClick={openAbout} aria-label="About">
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
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
          <h1 className="game-title">uncrypt</h1>
          <button
            className="settings-icon"
            onClick={showSettings}
            aria-label="Settings"
          >
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
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>

        <div
          className={`text-container ${settings.hardcoreMode ? "hardcore-mode" : ""}`}
        >
          {/* For mobile, prevent word breaks across lines */}
          <div
            className="alternating-text"
            dangerouslySetInnerHTML={formatAlternatingLines(
              useMobileMode ? preventWordBreaks(encrypted) : encrypted,
              useMobileMode ? preventWordBreaks(display) : display,
            )}
          ></div>
          {settings.hardcoreMode && (
            <div className="hardcore-badge">HARDCORE MODE</div>
          )}
        </div>

        <div className="grids">
          {/* // Desktop view encrypted grid */}
          <div className="encrypted-grid">
            {sortedEncryptedLetters.map((letter) => (
              <div
                key={letter}
                className={`letter-cell ${selectedEncrypted === letter ? "selected" : ""} ${
                  correctlyGuessed.includes(letter) ? "guessed" : ""
                } ${lastCorrectGuess === letter ? "flash" : ""}`}
                onClick={() => handleEncryptedClick(letter)}
              >
                {letter}
                <span className="frequency-indicator">
                  {letterFrequency[letter] || 0}
                </span>
              </div>
            ))}
          </div>
          <div className="guess-grid">
            {originalLetters.map((letter) => (
              <div
                key={letter}
                className={`letter-cell ${usedGuessLetters.includes(letter) ? "guessed" : ""}`}
                onClick={() => handleGuessClick(letter)}
              >
                {letter}
              </div>
            ))}
          </div>
        </div>

        <div className="controls">
          <p>
            Mistakes: {mistakes}/{maxMistakes}
          </p>
          <button
            onClick={handleHint}
            disabled={mistakes >= maxMistakes - 1}
            className="hint-button"
          >
            Hint (Costs 1 Mistake)
          </button>
        </div>

        {settings.speedMode && (
          <div className="keyboard-hint">
            <p>
              Keyboard Speed Mode:
              {!selectedEncrypted
                ? "Press a letter key to select from the encrypted grid."
                : `Selected ${selectedEncrypted} - Press a letter key to make a guess or ESC to cancel.`}
            </p>
          </div>
        )}

        {completionTime ? (
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
          <div className="game-message">
            <p>Game Over! Too many mistakes.</p>
            <button onClick={startGame}>Try Again</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default App;
