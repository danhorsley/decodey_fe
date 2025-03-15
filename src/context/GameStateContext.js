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
        isResetting: false,
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
      return {
        ...initialState,
        isResetting: true,
      };

    case "RESET_COMPLETE":
      return {
        ...state,
        isResetting: false,
      };

    case "CONTINUE_GAME":
      console.log("Handling CONTINUE_GAME action:", action.payload);
      return {
        ...initialState,
        ...action.payload,
        hasGameStarted: true,
        hasWon: false,
        winData: null,
        hasLost: false,
        isResetting: false,
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
        // Clear any existing game state from localStorage
        localStorage.removeItem("uncrypt-game-id");
        const difficulty = settings?.difficulty || "easy";

        const data = await apiService.startGame({
          longText: useLongText,
          difficulty: difficulty,
        });

        // Skip active game check if we're coming from a reset
        if (
          data.active_game_info &&
          data.active_game_info.has_active_game &&
          !state.isResetting
        ) {
          // Handle active game detection here...
          return false;
        }

        // Store the game ID in localStorage
        if (data.game_id) {
          localStorage.setItem("uncrypt-game-id", data.game_id);
        }

        // Process the encrypted text
        const encryptedText = data.encrypted_paragraph || "";
        let processedEncrypted = encryptedText;
        let processedDisplay = data.display || "";

        if (hardcoreMode) {
          processedEncrypted = encryptedText.replace(/[^A-Z]/g, "");
          processedDisplay = processedDisplay.replace(/[^A-Z█]/g, "");
        }

        // Create a clean, fresh state with the new game data
        const payload = {
          encrypted: processedEncrypted,
          display: processedDisplay,
          mistakes: data.mistakes || 0,
          correctlyGuessed: data.correctly_guessed || [],
          selectedEncrypted: null,
          lastCorrectGuess: null,
          letterFrequency: data.letter_frequency || {},
          guessedMappings: {},
          originalLetters: data.original_letters || [],
          startTime: Date.now(),
          gameId: data.game_id,
          hardcoreMode,
          maxMistakes: data.max_mistakes || getMaxMistakes(difficulty),
          difficulty: data.difficulty || difficulty,
        };

        // Use a more aggressive approach to updating the state
        dispatch({ type: "RESET_GAME" });

        // Small delay to ensure state is reset before setting new data
        setTimeout(() => {
          dispatch({
            type: "START_GAME",
            payload,
          });
        }, 10);

        return true;
      } catch (error) {
        console.error("Error starting game:", error);
        return false;
      }
    },
    [settings?.difficulty, state.isResetting, dispatch],
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
      const token =
        localStorage.getItem("uncrypt-token") ||
        sessionStorage.getItem("uncrypt-token");
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

  //continues game if one found in be storage and user selects continue
  // In continueSavedGame function in GameStateContext.js
  const continueSavedGame = useCallback(async () => {
    try {
      console.log("Attempting to continue saved game");

      // Call API to get the full game state
      const response = await apiService.api.get("/api/continue-game");
      console.log("Continue game response:", response.data);

      if (!response.data || response.data.msg === "No active game found") {
        console.warn("No active game found to continue");
        return false;
      }

      // Store the game ID in localStorage
      if (response.data.game_id) {
        localStorage.setItem("uncrypt-game-id", response.data.game_id);
      }

      // Extract data from response with safe defaults
      const game = response.data;
      const encryptedText = game.encrypted_paragraph || "";
      const displayText = game.display || "";
      const mistakes = typeof game.mistakes === "number" ? game.mistakes : 0;
      const correctlyGuessed = Array.isArray(game.correctly_guessed)
        ? game.correctly_guessed
        : [];
      const letterFrequency = game.letter_frequency || {};
      const originalLetters = Array.isArray(game.original_letters)
        ? game.original_letters
        : [];
      const difficulty = game.difficulty || "easy";
      const maxMistakes =
        typeof game.max_mistakes === "number" ? game.max_mistakes : 8;
      const hardcoreMode = game.hardcore_mode === true;

      // IMPORTANT: Correctly reconstruct guessedMappings
      const guessedMappings = {};

      // For each correctly guessed letter, find its mapping
      if (game.reverse_mapping && correctlyGuessed.length > 0) {
        correctlyGuessed.forEach((encryptedLetter) => {
          if (encryptedLetter in game.reverse_mapping) {
            guessedMappings[encryptedLetter] =
              game.reverse_mapping[encryptedLetter];
          }
        });
      }

      console.log("Reconstructed guessedMappings:", guessedMappings);
      console.log("Correctly guessed letters:", correctlyGuessed);

      // Apply hardcore mode filtering if needed
      let processedEncrypted = encryptedText;
      let processedDisplay = displayText;

      if (hardcoreMode || settings?.hardcoreMode) {
        console.log("Applying hardcore mode filtering to continued game");
        processedEncrypted = encryptedText.replace(/[^A-Z]/g, "");
        processedDisplay = displayText.replace(/[^A-Z█]/g, "");
      }

      // Update state with game data
      dispatch({
        type: "CONTINUE_GAME",
        payload: {
          encrypted: processedEncrypted,
          display: processedDisplay,
          mistakes,
          correctlyGuessed,
          selectedEncrypted: null,
          lastCorrectGuess: null,
          letterFrequency,
          guessedMappings,
          originalLetters,
          startTime: Date.now() - (game.time_spent || 0) * 1000,
          gameId: game.game_id,
          hasGameStarted: true,
          hardcoreMode,
          difficulty,
          maxMistakes,
        },
      });

      // Force a UI update
      setTimeout(() => {
        console.log("Forcing UI update after game continuation");
        // You could use a state update here to force re-render if needed
      }, 100);

      console.log("Successfully continued saved game");
      return true;
    } catch (error) {
      console.error("Error continuing saved game:", error);
      // Clear the stored game ID to prevent repeated attempts
      localStorage.removeItem("uncrypt-game-id");
      return false;
    }
  }, [dispatch, settings?.hardcoreMode]);
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
        isResetting: state.isResetting,

        // Important: Add maxMistakes to the context
        maxMistakes: state.maxMistakes,

        // Game actions
        startGame,
        difficulty: state.difficulty,
        handleEncryptedSelect,
        submitGuess,
        getHint,
        continueSavedGame,

        // Reset function
        resetGame: useCallback(() => {
          dispatch({ type: "RESET_GAME" });
        }, []),
        resetComplete: useCallback(() => {
          dispatch({ type: "RESET_COMPLETE" });
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
