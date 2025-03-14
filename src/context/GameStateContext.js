// src/context/GameStateContext.js
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import apiService from "../services/apiService";
import { useSettings } from "./SettingsContext";

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
  isLocalWinDetected: false,
  isWinVerificationInProgress: false,
  difficulty: "easy",
  showContinueGamePrompt: false,
  activeGameData: null,
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
      return {
        ...state,
        display: action.payload.display ?? state.display,
        mistakes: action.payload.mistakes ?? state.mistakes,
        correctlyGuessed:
          action.payload.correctlyGuessed ?? state.correctlyGuessed,
        guessedMappings:
          action.payload.guessedMappings ?? state.guessedMappings,
      };

    case "SET_LOCAL_WIN_DETECTED":
      return {
        ...state,
        isLocalWinDetected: action.payload.isLocalWinDetected,
        isWinVerificationInProgress: action.payload.isWinVerificationInProgress,
      };

    case "SET_GAME_WON":
      return {
        ...state,
        hasWon: true,
        isLocalWinDetected: false,
        isWinVerificationInProgress: false,
        completionTime: action.payload.completionTime || Date.now(),
        winData: action.payload,
      };

    case "SET_GAME_LOST":
      return { ...state, hasLost: true };

    case "RESET_GAME":
      return initialState;

    case "SET_ACTIVE_GAME_DATA":
      return {
        ...state,
        activeGameData: action.payload,
        showContinueGamePrompt: true,
      };

    case "CONTINUE_ACTIVE_GAME":
      return {
        ...initialState,
        ...action.payload.gameState,
        hasGameStarted: true,
      };

    case "DISMISS_CONTINUE_PROMPT":
      return {
        ...state,
        showContinueGamePrompt: false,
        activeGameData: null,
      };

    default:
      return state;
  }
};

// Create context
const GameStateContext = createContext();

export const GameStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { settings } = useSettings();

  // Start game function
  const startGame = useCallback(
    async (useLongText = false, hardcoreMode = false) => {
      try {
        // Clear any existing game state from localStorage to avoid conflicts
        localStorage.removeItem("uncrypt-game-id");
        const difficulty = settings?.difficulty || "easy";

        // Get maxMistakes based on difficulty
        let maxMistakes = 8; // Default to easy
        switch (difficulty) {
          case "hard":
            maxMistakes = 3;
            break;
          case "normal":
            maxMistakes = 5;
            break;
          case "easy":
          default:
            maxMistakes = 8;
            break;
        }

        console.log(`Making API call with difficulty=${difficulty}`);
        const data = await apiService.startGame({
          longText: useLongText,
          difficulty: difficulty,
        });

        // Log the response to see what we got back
        console.log("API response:", data);
        // Pass difficulty to the API

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
            difficulty: difficulty,
            maxMistakes:
              data.max_mistakes !== undefined ? data.max_mistakes : maxMistakes,
          },
        });
        return true;
      } catch (error) {
        console.error("Error starting game:", error);
        return false;
      }
    },
    [settings?.difficulty],
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
  // Checks if all encrypted letters have been correctly guessed
  const checkForLocalWin = (display) => {
    if (!display) {
      return false;
    }

    // Simply check if there are any placeholder characters left
    // If there are no '█' characters, all letters have been guessed
    const hasPlaceholders = display.includes("█");

    if (!hasPlaceholders) {
      console.log(
        "Local win detected! No placeholder characters remain in display.",
      );
      return true;
    }

    return false;
  };
  // Performs a one-time check with the server to verify win and get win data
  const checkWinWithServer = async (state, dispatch) => {
    console.log("Verifying win with server...");

    try {
      // Check if we have auth token before making the request
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No auth token, skipping win verification");
        return false;
      }

      const data = await apiService.getGameStatus();
      console.log("Win verification response:", data);

      // Skip processing if there was an error or no active game
      if (data.error || !data.hasActiveGame) {
        return false;
      }

      // Check if game is won
      if (data.hasWon && data.winData) {
        console.log("Win confirmed by server!", data.winData);

        // Update game state with win data
        dispatch({
          type: "SET_GAME_WON",
          payload: {
            completionTime: Date.now(),
            score: data.winData.score,
            mistakes: data.winData.mistakes,
            maxMistakes: data.winData.maxMistakes,
            gameTimeSeconds: data.winData.gameTimeSeconds,
            rating: data.winData.rating,
            encrypted: state.encrypted,
            display: state.display,
            attribution: data.winData.attribution,
            scoreStatus: {
              recorded: true,
              message: "Score recorded successfully!",
            },
          },
        });
        return true;
      }

      // Game is not actually won
      return false;
    } catch (error) {
      console.error("Error checking win status:", error);
      return false;
    }
  };
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
        let isCorrectGuess = false;
        if (Array.isArray(data.correctly_guessed)) {
          payload.correctlyGuessed = data.correctly_guessed;

          // Check if this guess was correct (not previously guessed)
          if (
            data.correctly_guessed.includes(encryptedLetter) &&
            !state.correctlyGuessed.includes(encryptedLetter)
          ) {
            // This was a new correct guess
            isCorrectGuess = true;
            payload.lastCorrectGuess = encryptedLetter;
            payload.guessedMappings = {
              ...state.guessedMappings,
              [encryptedLetter]: guessedLetter.toUpperCase(),
            };
          }
        }

        // Update game state
        dispatch({ type: "SUBMIT_GUESS", payload });

        // After updating state, check if this guess resulted in a win
        // Only do this if the guess was correct and we're not already in win verification
        if (isCorrectGuess && !state.isWinVerificationInProgress) {
          // Get the updated display text
          const updatedDisplay = payload.display || state.display;

          // Check for local win using the simplified approach
          const isLocalWin = checkForLocalWin(updatedDisplay);

          if (isLocalWin) {
            console.log(
              "Local win detected from display text! Starting verification...",
            );

            // Update state to indicate local win detection
            dispatch({
              type: "SET_LOCAL_WIN_DETECTED",
              payload: {
                isLocalWinDetected: true,
                isWinVerificationInProgress: true,
              },
            });

            // Verify the win with the server
            setTimeout(() => {
              checkWinWithServer(
                {
                  ...state,
                  correctlyGuessed:
                    payload.correctlyGuessed || state.correctlyGuessed,
                  display: updatedDisplay,
                },
                dispatch,
              );
            }, 500); // Short delay to allow UI updates before API call
          }
        }

        return {
          success: true,
          isCorrect: isCorrectGuess,
        };
      } catch (error) {
        console.error("Error submitting guess:", error);
        return { success: false, error: error.message };
      }
    },
    [state, dispatch],
  );
  // Get hint function
  const getHint = useCallback(async () => {
    try {
      const data = await apiService.getHint();
      console.log("Hint response in context:", data);

      // Handle authentication required
      if (data.authRequired) {
        console.warn("Authentication required for hint");
        return { success: false, authRequired: true };
      }

      // Handle errors
      if (data.error) {
        console.error("Error in hint response:", data.error);
        return { success: false, error: data.error };
      }

      // Process display text and update state
      let displayText = data.display;
      if (state.hardcoreMode && displayText) {
        displayText = displayText.replace(/[^A-Z█]/g, "");
      }

      // Update mappings and correctlyGuessed
      const newCorrectlyGuessed = data.correctly_guessed || [];
      const newMappings = { ...state.guessedMappings };

      // For each letter in correctly_guessed that isn't already in our state
      newCorrectlyGuessed.forEach((letter) => {
        if (!state.correctlyGuessed.includes(letter)) {
          // Find the corresponding original letter in the display
          for (let i = 0; i < state.encrypted.length; i++) {
            if (state.encrypted[i] === letter && displayText[i] !== "█") {
              newMappings[letter] = displayText[i];
              console.log(`Added mapping: ${letter} → ${displayText[i]}`);
              break;
            }
          }
        }
      });

      // Create update payload
      const payload = {
        display: displayText,
        mistakes: data.mistakes,
        correctlyGuessed: newCorrectlyGuessed,
        guessedMappings: newMappings,
      };

      // Update game state
      dispatch({ type: "SET_HINT", payload });

      // After updating state, check if the hint resulted in a win
      // Only do this if we're not already in win verification
      if (!state.isWinVerificationInProgress) {
        // Check for local win using the simplified approach - just check the display text
        const isLocalWin = checkForLocalWin(displayText);

        if (isLocalWin) {
          console.log(
            "Local win detected after hint! Starting verification...",
          );

          // Update state to indicate local win detection
          dispatch({
            type: "SET_LOCAL_WIN_DETECTED",
            payload: {
              isLocalWinDetected: true,
              isWinVerificationInProgress: true,
            },
          });

          // Verify the win with the server
          setTimeout(() => {
            checkWinWithServer(
              {
                ...state,
                correctlyGuessed: newCorrectlyGuessed,
                display: displayText,
              },
              dispatch,
            );
          }, 500); // Short delay to allow UI updates before API call
        }
      }

      // Play hint sound
      return { success: true };
    } catch (error) {
      console.error("Error getting hint:", error);
      return { success: false, error: error.message };
    }
  }, [state, dispatch]);

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

  const checkForActiveGame = useCallback(async () => {
    // Only check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      console.log("Checking for active game from server...");
      const response = await apiService.api.get("/check-active-game");

      if (response.data.has_active_game) {
        console.log("Active game found:", response.data.game_stats);
        dispatch({
          type: "SET_ACTIVE_GAME_DATA",
          payload: response.data.game_stats,
        });
      }
    } catch (error) {
      console.error("Error checking for active game:", error);
    }
  }, []);
  const continueActiveGame = useCallback(async () => {
    try {
      console.log("Loading active game from server...");
      const response = await apiService.api.get("/continue-game");

      if (response.data) {
        console.log("Active game data loaded:", response.data);

        // Process the encrypted text
        let encryptedText = response.data.encrypted_paragraph;
        let displayText = response.data.display;

        // Apply hardcore mode filtering if needed
        if (response.data.hardcoreMode) {
          encryptedText = encryptedText.replace(/[^A-Z]/g, "");
          displayText = displayText.replace(/[^A-Z█]/g, "");
        }

        // Dispatch action to load the game
        dispatch({
          type: "CONTINUE_ACTIVE_GAME",
          payload: {
            gameState: {
              encrypted: encryptedText,
              display: displayText,
              mistakes: response.data.mistakes || 0,
              correctlyGuessed: response.data.correctly_guessed || [],
              letterFrequency: response.data.letter_frequency || {},
              guessedMappings: response.data.guessedMappings || {},
              originalLetters: response.data.original_letters || [],
              startTime: Date.now(),
              gameId: response.data.game_id,
              hardcoreMode: response.data.hardcoreMode || false,
              difficulty: response.data.difficulty || "easy",
              maxMistakes: response.data.max_mistakes || 8,
            },
          },
        });

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error continuing active game:", error);
      return false;
    }
  }, [dispatch]);

  // Add this function to dismiss the continue prompt
  const dismissContinuePrompt = useCallback(() => {
    dispatch({ type: "DISMISS_CONTINUE_PROMPT" });
  }, [dispatch]);

  useEffect(() => {
    // Check for active game on mount
    const checkOnMount = async () => {
      // Only check if we don't already have a game loaded
      if (!state.encrypted && !state.hasGameStarted) {
        await checkForActiveGame();
      }
    };

    checkOnMount();
  }, [checkForActiveGame, state.encrypted, state.hasGameStarted]);
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
    state.maxMistakes,
    state.difficulty,
    state.hardcoreMode, // Added the missing dependency
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
        //Local win actions
        isLocalWinDetected: state.isLocalWinDetected,
        isWinVerificationInProgress: state.isWinVerificationInProgress,

        // Important: Add maxMistakes to the context
        maxMistakes: state.maxMistakes,

        // Game actions
        startGame,
        difficulty: state.difficulty,
        handleEncryptedSelect,
        submitGuess,
        getHint,
        //continue prior game
        showContinueGamePrompt: state.showContinueGamePrompt,
        activeGameData: state.activeGameData,
        continueActiveGame,
        dismissContinuePrompt,

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
