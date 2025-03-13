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
  hasWon: false,
  winData: null,
  hasLost: false,
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
        hasWon: false,
        winData: null,
        hasLost: false,
      };

    case "SUBMIT_GUESS":
      return { ...state, ...action.payload };

    case "SET_HINT":
      return { ...state, ...action.payload };

    case "SET_GAME_WON":
      return {
        ...state,
        hasWon: true,
        completionTime: action.payload.completionTime || Date.now(),
        winData: action.payload,
      };

    case "SET_GAME_LOST":
      return { ...state, hasLost: true };

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
      console.log("startGame triggered in GameStateContext");
      try {
        // Clear any existing game state from localStorage to avoid conflicts
        localStorage.removeItem("uncrypt-game-id");

        const data = await apiService.startGame(useLongText);
        console.log("startGame response", data);
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
        console.log("State updated in GameStateContext:", {
          encryptedText,
          displayTextLength: displayText?.length,
          originalLettersCount: data.original_letters?.length || 0,
        });
        return true;
      } catch (error) {
        console.error("Error starting game:", error);
        return false;
      }
    },
    [],
  );

  // Handle encrypted letter selection
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

  // Submit guess function
  const submitGuess = useCallback(
    async (encryptedLetter, guessedLetter) => {
      if (!encryptedLetter || !guessedLetter) {
        return { success: false, error: "Invalid input" };
      }

      try {
        const gameId = localStorage.getItem("uncrypt-game-id");
        const data = await apiService.submitGuess(
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

        // Check if game is won (determined by backend)
        if (data.game_won) {
          dispatch({
            type: "SET_GAME_WON",
            payload: {
              completionTime: Date.now(),
              score: data.score,
              mistakes: data.mistakes,
              maxMistakes: data.max_mistakes,
              gameTimeSeconds: data.game_time_seconds,
              rating: data.rating,
              encrypted: state.encrypted,
              display: displayText || state.display,
              attribution: data.attribution,
              scoreStatus: data.score_status,
            },
          });

          return {
            success: true,
            isCorrect: true,
            gameWon: true,
          };
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

      // Check if game is won (determined by backend)
      if (data.game_won) {
        dispatch({
          type: "SET_GAME_WON",
          payload: {
            completionTime: Date.now(),
            score: data.score,
            mistakes: data.mistakes,
            maxMistakes: data.max_mistakes,
            gameTimeSeconds: data.game_time_seconds,
            rating: data.rating,
            encrypted: state.encrypted,
            display: displayText,
            attribution: data.attribution,
            scoreStatus: data.score_status,
          },
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error getting hint:", error);
      return { success: false, error: error.message };
    }
  }, [state]);

  // Listen for server-sent events about game state changes
  useEffect(() => {
    // Subscribe to game win events from server
    const winSubscription = apiService.on("game:win", (data) => {
      console.log("Win event received from server:", data);

      dispatch({
        type: "SET_GAME_WON",
        payload: {
          completionTime: Date.now(),
          ...data,
        },
      });
    });

    // Subscribe to game loss events
    const lossSubscription = apiService.on("game:loss", () => {
      dispatch({ type: "SET_GAME_LOST" });
    });

    return () => {
      winSubscription();
      lossSubscription();
    };
  }, []);

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
  }, [
    state.encrypted,
    state.display,
    state.mistakes,
    state.correctlyGuessed,
    state.letterFrequency,
    state.guessedMappings,
    state.originalLetters,
    state.startTime,
  ]);

  // Determine if game is active
  const isGameActive =
    Boolean(state.encrypted) && !state.hasWon && !state.hasLost;

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
        isGameActive,
        hardcoreMode: state.hardcoreMode,
        hasWon: state.hasWon,
        winData: state.winData,
        hasLost: state.hasLost,

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
