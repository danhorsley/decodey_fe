// src/context/GameStateContext.js
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import apiService from "../services/apiService";
import { useSettings, getMaxMistakes } from "./SettingsContext";

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
  // Start game function with optimizations for anonymous users
  const startGame = useCallback(
    async (useLongText = false, hardcoreMode = false, forceNewGame = false) => {
      try {
        // Quick check if user is anonymous
        const isAnonymousUser =
          !localStorage.getItem("uncrypt-token") &&
          !sessionStorage.getItem("uncrypt-token");

        // Clear any existing game state from localStorage
        localStorage.removeItem("uncrypt-game-id");

        // Always get the latest difficulty from settings
        const currentDifficulty = settings?.difficulty || "easy";

        // Calculate maxMistakes based on current difficulty
        const maxMistakesValue = getMaxMistakes(currentDifficulty);

        console.log("Starting new game with settings:", {
          longText: useLongText,
          hardcoreMode,
          difficulty: currentDifficulty,
          maxMistakes: maxMistakesValue,
          forceNewGame,
          isAnonymous: isAnonymousUser,
        });

        // Start performance measurement
        const startTime = performance.now();

        const data = await apiService.startGame({
          longText: useLongText,
          difficulty: currentDifficulty, // Use current difficulty from settings
        });

        // End performance measurement
        const endTime = performance.now();
        console.log(`Game start API call took ${endTime - startTime}ms`);

        console.log("Game start response:", data);

        // Skip active game check for anonymous users (they don't have active games)
        // and if we're forcing a new game
        if (
          !isAnonymousUser &&
          !forceNewGame &&
          data.active_game_info &&
          data.active_game_info.has_active_game &&
          !state.isResetting
        ) {
          // Handle active game detection here...
          console.log("Active game detected - aborting new game creation");
          return false;
        }

        // Store the game ID in localStorage
        if (data.game_id) {
          localStorage.setItem("uncrypt-game-id", data.game_id);
          console.log("Game ID stored in localStorage:", data.game_id);
        }

        // Process the encrypted text
        const encryptedText = data.encrypted_paragraph || "";
        let processedEncrypted = encryptedText;
        let processedDisplay = data.display || "";

        if (hardcoreMode) {
          processedEncrypted = encryptedText.replace(/[^A-Z]/g, "");
          processedDisplay = processedDisplay.replace(/[^A-Z█]/g, "");
        }

        // Always use the current settings for difficulty and maxMistakes
        // But preserve API response values if provided
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
          maxMistakes: maxMistakesValue,
          difficulty: currentDifficulty,
          isAnonymous: data.is_anonymous || isAnonymousUser,
          tempId: data.temp_id,
        };

        console.log("Updating game state with new payload:", payload);

        // For anonymous users, skip the RESET_GAME and setTimeout to speed up initialization
        if (isAnonymousUser) {
          console.log(
            "Fast path: directly updating game state for anonymous user",
          );
          dispatch({
            type: "START_GAME",
            payload,
          });
        } else {
          // For authenticated users, use the more cautious approach with reset
          dispatch({ type: "RESET_GAME" });

          // Small delay to ensure state is reset before setting new data
          setTimeout(() => {
            dispatch({
              type: "START_GAME",
              payload,
            });
            console.log("Game state updated successfully with delay");
          }, 10);
        }

        return true;
      } catch (error) {
        console.error("Error starting game:", error);
        return false;
      }
    },
    [settings, getMaxMistakes, state.isResetting, dispatch],
  );
  //abandons game
  const abandonGame = useCallback(async () => {
    try {
      console.log("Explicitly abandoning current game");

      // First, remove game ID from localStorage
      localStorage.removeItem("uncrypt-game-id");

      // Call the backend to abandon the game
      try {
        await apiService.api.delete("/api/abandon-game");
        console.log("Successfully abandoned game on server");
      } catch (err) {
        console.warn(
          "Server abandon failed, continuing with local reset:",
          err,
        );
      }

      // Reset the state
      dispatch({ type: "RESET_GAME" });

      // Return success
      return true;
    } catch (error) {
      console.error("Error abandoning game:", error);
      return false;
    }
  }, [dispatch]);
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
  // In GameStateContext.js - Update the checkWinWithServer function
  const checkWinWithServer = async (state, dispatch) => {
    console.log("Verifying win with server...");

    try {
      // Check if we have game ID (required for both auth and anon users)
      const gameId = localStorage.getItem("uncrypt-game-id");
      if (!gameId) {
        console.log("No game ID found, cannot verify win");
        return false;
      }

      // Get game status from API - this should work for both auth and anon users
      const data = await apiService.getGameStatus(gameId);
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
              recorded: data.winData.isAnonymous ? false : true,
              message: data.winData.isAnonymous
                ? "Score not recorded - anonymous game"
                : "Score recorded successfully!",
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
        if (
          typeof data.mistakes === "number" &&
          typeof state.maxMistakes === "number" &&
          data.mistakes >= state.maxMistakes
        ) {
          console.log("Game lost detected: mistakes reached maximum");
          dispatch({ type: "SET_GAME_LOST" });
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
  const resetAndStartNewGame = useCallback(
    async (useLongText = false, hardcoreMode = false) => {
      try {
        console.log("Resetting and starting new game");

        // 1. First abandon any existing games on the server
        try {
          await apiService.api.delete("/api/abandon-game");
          console.log("Successfully abandoned existing game");
        } catch (err) {
          console.warn("Error abandoning game, continuing with reset:", err);
        }

        // 2. Remove game ID from localStorage
        localStorage.removeItem("uncrypt-game-id");

        // 3. Reset state completely
        dispatch({ type: "RESET_GAME" });

        // 4. Wait a moment for state to stabilize
        await new Promise((resolve) => setTimeout(resolve, 50));

        // 5. Start a completely new game
        // Always use the latest settings
        const currentDifficulty = settings?.difficulty || "easy";
        const maxMistakesValue = getMaxMistakes(currentDifficulty);

        console.log("Using current settings for new game:", {
          maxMistakes: getMaxMistakes(currentDifficulty),
          difficulty: currentDifficulty,
          longText: useLongText,
          hardcoreMode: hardcoreMode,
        });

        const data = await apiService.startGame({
          longText: useLongText,
          difficulty: currentDifficulty,
        });

        if (!data) {
          throw new Error("Failed to get game data");
        }

        // 6. Store the new game ID
        if (data.game_id) {
          localStorage.setItem("uncrypt-game-id", data.game_id);
        }

        // 7. Process the data and update state
        const encryptedText = data.encrypted_paragraph || "";
        let processedEncrypted = encryptedText;
        let processedDisplay = data.display || "";

        if (hardcoreMode) {
          processedEncrypted = encryptedText.replace(/[^A-Z]/g, "");
          processedDisplay = processedDisplay.replace(/[^A-Z█]/g, "");
        }

        // 8. Create new game payload with current settings
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
          maxMistakes: maxMistakesValue,
          difficulty: currentDifficulty,
          isAnonymous: data.is_anonymous || false,
        };

        // 9. Directly update to the new game state
        dispatch({
          type: "START_GAME",
          payload,
        });

        return true;
      } catch (error) {
        console.error("Error in resetAndStartNewGame:", error);
        return false;
      }
    },
    [settings, getMaxMistakes, dispatch],
  );
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
  //continues game if one found in be storage and user selects continue
  const continueSavedGame = useCallback(async () => {
    console.log("Attempting to continue saved game");

    try {
      // Validate token first - this ensures we're actually authenticated
      const token =
        localStorage.getItem("uncrypt-token") ||
        sessionStorage.getItem("uncrypt-token");

      if (!token) {
        console.warn("Cannot continue saved game - no auth token found");
        return false;
      }

      // Get current settings for difficulty
      const currentDifficulty = settings?.difficulty || "easy";
      const maxMistakesValue = getMaxMistakes(currentDifficulty);

      // Make sure API headers are properly set
      apiService.api.defaults.headers.common["Authorization"] =
        `Bearer ${token}`;

      // Call API to get the full game state
      console.log("Making API call to continue-game endpoint");
      const response = await apiService.api.get("/api/continue-game");
      console.log("Continue game response:", response.data);

      // Full validation of response
      if (!response.data) {
        console.warn("Empty response from continue-game endpoint");
        return false;
      }

      if (response.data.error || response.data.msg === "No active game found") {
        console.warn(
          "No active game found to continue:",
          response.data.error || response.data.msg,
        );
        return false;
      }

      if (!response.data.encrypted_paragraph || !response.data.display) {
        console.warn("Incomplete game data returned:", response.data);
        return false;
      }

      // Store the game ID in localStorage
      if (response.data.game_id) {
        console.log("Storing game ID in localStorage:", response.data.game_id);
        localStorage.setItem("uncrypt-game-id", response.data.game_id);
      } else {
        console.warn("No game ID in response");
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
      const hardcoreMode = game.hardcore_mode === true;

      // Validate essential game data
      if (encryptedText.length === 0) {
        console.warn("Empty encrypted text in response");
        return false;
      }

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
      console.log("Dispatching CONTINUE_GAME action with restored game state");
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
          difficulty: currentDifficulty,
          maxMistakes: maxMistakesValue,
        },
      });

      console.log("Successfully continued saved game");
      return true;
    } catch (error) {
      console.error("Error continuing saved game:", error);

      // Add specific error handling for common failures
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);

        // Handle unauthorized errors
        if (error.response.status === 401) {
          console.warn(
            "Authentication error when continuing game - token may be expired",
          );
          // Don't remove the game ID here - auth context should handle token refresh
          return false;
        }
      }

      // Only clear the game ID if this wasn't an auth error
      // This ensures we can retry after auth is refreshed
      if (error.response && error.response.status !== 401) {
        localStorage.removeItem("uncrypt-game-id");
      }

      return false;
    }
  }, [dispatch, settings?.difficulty, getMaxMistakes]);
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
        abandonGame,
        resetAndStartNewGame,

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
