import { useReducer, useCallback, useEffect, useState } from 'react';
import apiService from '../services/apiService';
import { useAppContext } from '../context/AppContext';
import useSound from './useSound';

// Initial state for the game
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

// Reducer for state management
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

const useGame = () => {
  const { settings, maxMistakes } = useAppContext();
  const { playSound } = useSound();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isStartingGame, setIsStartingGame] = useState(false); // Added state for request lock

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

  const isGameActive = !completionTime && mistakes < maxMistakes;

  // Start a new game
  const startGame = useCallback(() => {
    if (isStartingGame) {
      console.log("Game start already in progress, skipping request");
      return;
    }

    setIsStartingGame(true);
    console.log("Starting new game...");
    apiService
      .startGame(settings.useLongQuotes)
      .then((data) => {
        console.log("Game data received:", data);
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
        setIsStartingGame(false); // Release the lock after successful game start
      })
      .catch((err) => {
        console.error("Error starting game:", err);
        alert(
          "Failed to start game. Check your connection or console for details."
        );
        setIsStartingGame(false); // Release the lock even on error
      });
  }, [settings.hardcoreMode, settings.useLongQuotes]);

  // Handle letter selection
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
    [correctlyGuessed, playSound]
  );

  // Handle guess click
  const handleGuessClick = useCallback(
    (guessedLetter) => {
      if (selectedEncrypted) {
        submitGuess(guessedLetter);
      }
    },
    [selectedEncrypted]
  );

  // Submit a guess
  const submitGuess = useCallback(
    (guessedLetter) => {
      const gameId = localStorage.getItem("uncrypt-game-id");
      const requestBody = {
        encrypted_letter: selectedEncrypted,
        guessed_letter: guessedLetter.toUpperCase(),
      };
      if (gameId) requestBody.game_id = gameId;

      apiService.submitGuess(requestBody)
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
                500
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
    ]
  );

  // Request a hint
  const handleHint = useCallback(() => {
    const gameId = localStorage.getItem("uncrypt-game-id");
    const requestBody = gameId ? { game_id: gameId } : {};

    apiService.getHint(requestBody)
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

  // Check for game completion
  useEffect(() => {
    const encryptedLetters = [...new Set(encrypted.match(/[A-Z]/g) || [])];

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
    correctlyGuessed,
    completionTime,
    playSound,
  ]);

  return {
    state,
    startGame,
    handleEncryptedClick,
    handleGuessClick,
    handleHint,
    isGameActive
  };
};

export default useGame;