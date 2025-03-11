// src/context/GameStateContext.js
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import apiService from "../services/apiService";

// Initial game state
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
  gameId: null,
  hasGameStarted: false,
  attributionData: null,
  hardcoreMode: false,
};

// Reducer for state management
const gameReducer = (state, action) => {
  switch (action.type) {
    case "START_GAME":
      return {
        ...initialState,
        ...action.payload,
        hasGameStarted: true,
      };
    case "SUBMIT_GUESS":
      return { ...state, ...action.payload };
    case "SET_HINT":
      return { ...state, ...action.payload };
    case "SET_COMPLETION":
      return { ...state, completionTime: action.payload };
    case "SET_ATTRIBUTION":
      return { ...state, attributionData: action.payload };
    case "RESET_GAME":
      return initialState;
    default:
      return state;
  }
};

// Create context
const GameStateContext = createContext();

export const GameStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Start game function
  const startGame = useCallback(
    async (useLongText = false, hardcoreMode = false) => {
      try {
        // Clear any existing game state from localStorage to avoid conflicts
        localStorage.removeItem("uncrypt-game-id");

        const data = await apiService.startGame(useLongText);

        // Store the game ID in localStorage
        if (data.game_id) {
          localStorage.setItem("uncrypt-game-id", data.game_id);
        }

        // Process the encrypted text
        let encryptedText = data.encrypted_paragraph;
        let displayText = data.display;

        // Apply hardcore mode filtering if needed
        if (hardcoreMode) {
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

        // Dispatch action to start the game
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
            gameId: data.game_id,
            hardcoreMode: hardcoreMode,
          },
        });

        return true;
      } catch (error) {
        console.error("Error starting game:", error);
        return false;
      }
    },
    [],
  );

  // Handle click on encrypted letter
  const handleEncryptedSelect = useCallback(
    (letter) => {
      if (letter === null || !state.correctlyGuessed.includes(letter)) {
        dispatch({
          type: "SUBMIT_GUESS",
          payload: { selectedEncrypted: letter },
        });
        return true;
      }
      return false;
    },
    [state.correctlyGuessed],
  );

  // Submit guess for a letter mapping
  const submitGuess = useCallback(
    async (encryptedLetter, guessedLetter) => {
      if (!encryptedLetter || !guessedLetter) {
        return { success: false, error: "Invalid input" };
      }

      try {
        const gameId = localStorage.getItem("uncrypt-game-id");
        const data = await apiService.submitGuess(
          gameId,
          encryptedLetter,
          guessedLetter,
        );

        // Handle session expiration
        if (data.error && data.error.includes("Session expired")) {
          // Store the new game ID if returned
          if (data.game_id) {
            localStorage.setItem("uncrypt-game-id", data.game_id);
          }

          // Signal that we need to restart the game
          return {
            success: false,
            sessionExpired: true,
            newGameId: data.game_id,
          };
        }

        // Apply hardcore mode filtering if needed
        let displayText = data.display;
        if (displayText && state.hardcoreMode) {
          displayText = displayText.replace(/[^A-Z█]/g, "");
        }

        // Create update payload
        const payload = {
          display: displayText || state.display,
          mistakes:
            typeof data.mistakes === "number" ? data.mistakes : state.mistakes,
          selectedEncrypted: null,
        };

        // Handle correctly guessed letters
        if (Array.isArray(data.correctly_guessed)) {
          payload.correctlyGuessed = data.correctly_guessed;

          // Check if this guess was correct (not previously guessed)
          if (
            data.correctly_guessed.includes(encryptedLetter) &&
            !state.correctlyGuessed.includes(encryptedLetter)
          ) {
            // This was a new correct guess
            payload.lastCorrectGuess = encryptedLetter;
            payload.guessedMappings = {
              ...state.guessedMappings,
              [encryptedLetter]: guessedLetter.toUpperCase(),
            };
          }
        }

        // Update the game state
        dispatch({ type: "SUBMIT_GUESS", payload });

        return {
          success: true,
          isCorrect: data.correctly_guessed?.includes(encryptedLetter),
        };
      } catch (error) {
        console.error("Error submitting guess:", error);
        return { success: false, error: error.message };
      }
    },
    [state],
  );

  // Get hint function
  const getHint = useCallback(async () => {
    try {
      const data = await apiService.getHint();

      // Handle session expiration
      if (data.error && data.error.includes("Session expired")) {
        // Store the new game ID if returned
        if (data.game_id) {
          localStorage.setItem("uncrypt-game-id", data.game_id);
        }

        return { success: false, sessionExpired: true };
      }

      // Process display text
      let displayText = data.display;
      if (state.hardcoreMode && displayText) {
        displayText = displayText.replace(/[^A-Z█]/g, "");
      }

      const newCorrectlyGuessed =
        data.correctly_guessed || state.correctlyGuessed;
      const newMappings = { ...state.guessedMappings };

      // Update mappings for newly guessed letters
      newCorrectlyGuessed
        .filter((letter) => !state.correctlyGuessed.includes(letter))
        .forEach((encryptedLetter) => {
          for (let i = 0; i < state.encrypted.length; i++) {
            if (
              state.encrypted[i] === encryptedLetter &&
              data.display[i] !== "?"
            ) {
              newMappings[encryptedLetter] = data.display[i];
              break;
            }
          }
        });

      // Dispatch hint update
      dispatch({
        type: "SET_HINT",
        payload: {
          display: displayText,
          mistakes: data.mistakes,
          correctlyGuessed: newCorrectlyGuessed,
          guessedMappings: newMappings,
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Error getting hint:", error);
      return { success: false, error: error.message };
    }
  }, [state]);

  // Clear last correct guess after a delay
  useEffect(() => {
    if (state.lastCorrectGuess) {
      const timer = setTimeout(() => {
        dispatch({
          type: "SUBMIT_GUESS",
          payload: { lastCorrectGuess: null },
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [state.lastCorrectGuess]);

  // Check for game completion
  useEffect(() => {
    if (
      state.encrypted &&
      state.correctlyGuessed.length > 0 &&
      new Set(state.encrypted.match(/[A-Z]/g)).size <=
        state.correctlyGuessed.length &&
      !state.completionTime
    ) {
      dispatch({ type: "SET_COMPLETION", payload: Date.now() });

      // Fetch attribution data
      apiService
        .getAttribution()
        .then((data) => {
          dispatch({ type: "SET_ATTRIBUTION", payload: data });
        })
        .catch((error) => {
          console.error("Error fetching attribution:", error);
        });
    }
  }, [state.encrypted, state.correctlyGuessed, state.completionTime]);

  // Save game state to localStorage
  useEffect(() => {
    if (state.encrypted && state.display) {
      const gameState = {
        encrypted: state.encrypted,
        display: state.display,
        mistakes: state.mistakes,
        correctlyGuessed: state.correctlyGuessed,
        letterFrequency: state.letterFrequency,
        guessedMappings: state.guessedMappings,
        originalLetters: state.originalLetters,
        startTime: state.startTime,
        hardcoreMode: state.hardcoreMode,
      };

      // Save game state to localStorage
      localStorage.setItem("uncrypt-game-data", JSON.stringify(gameState));
    }
  }, [state]);

  // Determine if game is active
  const isGameActive =
    Boolean(state.encrypted) && !state.completionTime && state.mistakes < 8; // Default to max 8 mistakes

  return (
    <GameStateContext.Provider
      value={{
        // Game state
        encrypted: state.encrypted,
        display: state.display,
        mistakes: state.mistakes,
        correctlyGuessed: state.correctlyGuessed,
        selectedEncrypted: state.selectedEncrypted,
        lastCorrectGuess: state.lastCorrectGuess,
        letterFrequency: state.letterFrequency,
        guessedMappings: state.guessedMappings,
        originalLetters: state.originalLetters,
        startTime: state.startTime,
        completionTime: state.completionTime,
        gameId: state.gameId,
        hasGameStarted: state.hasGameStarted,
        attributionData: state.attributionData,
        isGameActive,
        hardcoreMode: state.hardcoreMode,

        // Game actions
        startGame,
        handleEncryptedSelect,
        submitGuess,
        getHint,

        // Reset function
        resetGame: useCallback(() => {
          dispatch({ type: "RESET_GAME" });
        }, []),
      }}
    >
      {children}
    </GameStateContext.Provider>
  );
};

// Custom hook to use the game state context
export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error("useGameState must be used within a GameStateProvider");
  }
  return context;
};
