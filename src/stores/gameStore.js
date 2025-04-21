import { create } from "zustand";
import { immer } from "zustand/middleware/immer"; // Import immer middleware
import apiService from "../services/apiService";
import config from "../config";
import useSettingsStore from "./settingsStore";

// Define max mistakes map using same terminology as backend
const MAX_MISTAKES_MAP = {
  easy: 8,
  medium: 5, // Using 'medium' instead of 'normal' to match backend
  hard: 3,
};

const initialState = {
  encrypted: "",
  display: "",
  mistakes: 0,
  correctlyGuessed: [],
  incorrectGuesses: {},
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
  difficulty: "easy", // Default, will be updated from settings
  maxMistakes: 8, // Default, will be updated from settings
  isResetting: false,
  isHintInProgress: false,
  pendingHints: 0,
  settingsInitialized: false, // Flag to track if settings have been applied

  // Add daily challenge flags
  isDailyChallenge: false,
  dailyDate: null, // Will store YYYY-MM-DD string for daily challenge
};

// Create the store with immer middleware
const useGameStore = create(
  immer((set, get) => ({
    ...initialState,

    // Called once during app initialization to sync with settings
    initializeFromSettings: () => {
      // Get current settings
      const settings = useSettingsStore.getState().settings || {};

      // Ensure difficulty is a valid value
      const difficulty = ["easy", "medium", "hard"].includes(settings.difficulty)
        ? settings.difficulty
        : "medium";

      // Update game state with settings
      set(state => {
        state.difficulty = difficulty;
        state.maxMistakes = MAX_MISTAKES_MAP[difficulty] || 5;
        state.hardcoreMode = settings.hardcoreMode || false;
        state.settingsInitialized = true;
      });

      // Set up subscription to settings changes - difficulty
      const unsubscribe = useSettingsStore.subscribe(
        (state) => state.settings?.difficulty, // Select difficulty from settings
        (newDifficulty, previousDifficulty) => {
          // Safety check for valid difficulty
          if (
            !newDifficulty ||
            !["easy", "medium", "hard"].includes(newDifficulty)
          ) {
            console.warn(
              `Invalid difficulty in settings: ${newDifficulty}, ignoring`,
            );
            return;
          }

          // Only update if difficulty actually changed
          if (newDifficulty !== previousDifficulty) {
            console.log(
              `Settings difficulty changed from ${previousDifficulty} to ${newDifficulty}`,
            );

            // Update game state with new difficulty and corresponding maxMistakes
            set(state => {
              state.difficulty = newDifficulty;
              state.maxMistakes = MAX_MISTAKES_MAP[newDifficulty] || 5;
            });

            console.log(
              `Updated game store: difficulty=${newDifficulty}, maxMistakes=${MAX_MISTAKES_MAP[newDifficulty] || 5}`,
            );
          }
        },
      );

      // Set up subscription to hardcore mode changes
      const unsubscribeHardcore = useSettingsStore.subscribe(
        (state) => state.settings?.hardcoreMode,
        (newHardcoreMode, previousHardcoreMode) => {
          // Only update if hardcore setting actually changed
          if (newHardcoreMode !== previousHardcoreMode) {
            console.log(
              `Settings hardcoreMode changed from ${previousHardcoreMode} to ${newHardcoreMode}`,
            );

            // Update game state with new hardcore mode setting
            set(state => {
              state.hardcoreMode = newHardcoreMode;
            });
          }
        },
      );

      // We don't need to unsubscribe since this store lives for the app's lifetime
      // But if needed, we could return this function
      return () => {
        unsubscribe();
        unsubscribeHardcore();
      };
    },

    /**
     * Start a new game with configured settings
     */
    startGame: async (
      longText = false,
      hardcoreMode = false,
      forceNew = false,
      isDaily = false
    ) => {
      try {
        const state = get();
        const isAuthenticated = !!config.session.getAuthToken();

        // Only try to abandon existing game if:
        // 1. We're forcing a new game
        // 2. AND there's an actual game in progress
        // 3. AND we're authenticated (anonymous games don't need abandoning)
        if (forceNew && state.gameInProgress && isAuthenticated) {
          console.log("Forcing new game, abandoning current game first");
          try {
            // Add a delay to prevent race condition with server
            await new Promise(resolve => setTimeout(resolve, 500));
            await get().abandonGame();

            // Add another delay after abandoning to let the server process
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (abandonError) {
            console.warn("Error abandoning game, continuing anyway:", abandonError);
            // Continue with new game regardless of abandon result
          }
        }

        // Reset local game state
        set(state => {
          // Instead of spreading initialState, set each property individually
          // This ensures all properties are reset while preserving the structure
          Object.keys(initialState).forEach(key => {
            state[key] = initialState[key];
          });

          // Set specific values that should differ from initialState
          state.isInitializing = true;
          state.hardcoreMode = hardcoreMode;
          state.isDailyChallenge = isDaily;
        });

        // IMPORTANT: Use settings explicitly passed to this function
        const settingsToUse = {
          longText,
          hardcoreMode,
          difficulty: useSettingsStore.getState().settings?.difficulty || "medium",
          maxMistakes: 5, // Default, will be overridden by server
          isDailyChallenge: isDaily,
        };

        console.log("Starting new game with settings:", settingsToUse);

        // Hard-coded max mistakes based on difficulty
        // (These are also set server-side but we set here for UI consistency)
        const maxMistakesByDifficulty = {
          easy: 8,
          medium: 5,
          hard: 3,
        };

        const result = await apiService.startGame(
          settingsToUse.longText,
          settingsToUse.difficulty,
          settingsToUse.hardcoreMode
        );

        // Handle error response
        if (result.error) {
          console.error("Error starting game:", result.error);
          return { success: false, error: result.error };
        }

        console.log("Game start response received");

        // Extract difficulty from game_id
        let difficulty = "medium"; // Default
        if (result.game_id && result.game_id.includes("-")) {
          const parts = result.game_id.split("-");
          if (["easy", "medium", "hard"].includes(parts[0])) {
            difficulty = parts[0];
          }
        }

        // Log the difficulty extracted from the game id
        console.log(
          `Game returned with difficulty: ${difficulty}, type: ${
            result.game_id ? result.game_id.split("-")[1].substring(0, 8) : "unknown"
          }`
        );

        // Set state with game data
        set(state => {
          state.gameInProgress = true;
          state.isAnonymous = result.is_anonymous;
          state.display = result.display;
          state.encrypted = result.encrypted_paragraph;
          state.letterFrequency = result.letter_frequency;
          state.errors = 0;
          state.hasLost = false;
          state.hasWon = false;
          state.gameId = result.game_id;
          state.originalLetters = result.original_letters;
          state.incorrectGuesses = {}; // Reset incorrect guesses
          state.isInitializing = false; // Explicitly mark as not initializing

          // Override with server values when available
          state.difficulty = result.difficulty || difficulty;
          state.maxMistakes = result.max_mistakes || 
                           maxMistakesByDifficulty[state.difficulty] || 
                           maxMistakesByDifficulty.medium;
          state.mistakes = result.mistakes || 0;
        });

        return {
          success: true,
          gameId: result.game_id,
          difficulty: get().difficulty,
        };
      } catch (error) {
        console.error("Error in startGame:", error);
        set(state => {
          state.isInitializing = false;
          state.hasError = true;
          state.errorMessage = error.message;
        });
        return { success: false, error: error.message };
      }
    },

    // Start daily challenge with clean state
    startDailyChallenge: async (gameData) => {
      if (!gameData) return false;

      console.log("Starting daily challenge with clean state");

      // First reset the state to clear any existing game
      set(state => {
        // Reset all properties to initial values
        Object.keys(initialState).forEach(key => {
          state[key] = initialState[key];
        });

        // Set specific values for daily challenge
        state.isResetting = false;
        state.difficulty = "easy";
        state.maxMistakes = MAX_MISTAKES_MAP["easy"] || 8;
        state.hardcoreMode = false; // Daily challenges are never hardcore
        state.settingsInitialized = get().settingsInitialized;
      });

      // Now apply the daily challenge data
      let processedEncrypted = gameData.encrypted_paragraph || "";
      let processedDisplay = gameData.display || "";

      // Set up daily challenge state
      set(state => {
        state.encrypted = processedEncrypted;
        state.display = processedDisplay;
        state.mistakes = gameData.mistakes || 0;
        state.correctlyGuessed = Array.isArray(gameData.correctly_guessed) 
          ? [...gameData.correctly_guessed] 
          : [];
        state.letterFrequency = gameData.letter_frequency || {};
        state.originalLetters = Array.isArray(gameData.original_letters)
          ? [...gameData.original_letters]
          : [];
        state.gameId = gameData.game_id;
        state.startTime = Date.now();
        state.hasGameStarted = true;
        state.isDailyChallenge = true;
        state.dailyDate = gameData.daily_date || new Date().toISOString().split('T')[0];
      });

      console.log("Daily challenge state initialized");
      return true;
    },

    // Continue a saved game
    continueSavedGame: async (gameData) => {
      try {
        console.log("Attempting to continue saved game in store");

        // Check if this is a direct call with game data already provided
        if (!gameData) {
          // Check for auth token
          const token = config.session.getAuthToken();
          if (!token) {
            console.warn("Cannot continue saved game - no auth token found");
            return false;
          }

          // Get game state from API
          const response = await apiService.api.get("/api/continue-game");
          console.log("Continue game API response:", response.data);

          if (!response.data || response.data.error) {
            console.warn("Error or empty response from continue-game endpoint");
            return false;
          }

          gameData = response.data;
        }

        // Check if this is a daily challenge
        let isDailyChallenge = false; // Default to false
        let dailyDate = null;

        // Parse game_id to check if it's a daily challenge
        if (gameData.game_id) {
          const currentStoredId = localStorage.getItem("uncrypt-game-id");
          const newId = gameData.game_id;
          const parts = gameData.game_id.split("-");
          console.log(`Current stored game ID: ${currentStoredId}`);
          console.log(`New game ID from continueSavedGame: ${newId}`);
          if (currentStoredId && currentStoredId !== newId) {
            console.warn(
              `Game ID mismatch - replacing ${currentStoredId} with ${newId}`,
            );
          }

          localStorage.setItem("uncrypt-game-id", newId);
          if (parts.length >= 3 && parts[1] === "daily") {
            console.log("Continuing a daily challenge game");
            isDailyChallenge = true;

            // Try to extract date from game data if available
            if (gameData.daily_date) {
              const gameId = gameData.game_id;
              localStorage.setItem("uncrypt-game-id", gameId);
              console.log(`Setting game ID in continueSavedGame: ${gameId}`);
              dailyDate = gameData.daily_date;
            } else {
              // Otherwise use today's date as fallback
              dailyDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
            }
          }
        }

        // Process game data for hardcore mode if needed
        const gameHardcoreMode = gameData.game_id
          ? gameData.game_id.includes("-hardcore-")
          : false;
        let processedEncrypted = gameData.encrypted_paragraph || "";
        let processedDisplay = gameData.display || "";

        if (gameHardcoreMode) {
          processedEncrypted = processedEncrypted.replace(/[^A-Z]/g, "");
          processedDisplay = processedDisplay.replace(/[^A-Z█]/g, "");
        }

        // Validate encrypted/display data
        if (!processedEncrypted || !processedDisplay) {
          console.error("Invalid game data - missing encrypted or display text");
          return false;
        }

        // Validate that lengths match - critical for proper display
        if (processedEncrypted.length !== processedDisplay.length) {
          console.error(
            "Data integrity error: Encrypted and display text lengths don't match!",
            {
              encryptedLength: processedEncrypted.length,
              displayLength: processedDisplay.length,
            },
          );

          // Try to fix if possible
          if (gameData.encrypted_paragraph && gameData.display) {
            console.log("Attempting to fix length mismatch");
            // Re-process from original data
            processedEncrypted = gameHardcoreMode
              ? gameData.encrypted_paragraph.replace(/[^A-Z]/g, "")
              : gameData.encrypted_paragraph;

            processedDisplay = gameHardcoreMode
              ? gameData.display.replace(/[^A-Z█]/g, "")
              : gameData.display;
          }

          // Verify fix worked
          if (processedEncrypted.length !== processedDisplay.length) {
            console.error("Failed to fix length mismatch, returning failure");
            return false;
          }
        }

        // Construct proper guessedMappings with immutability
        const correctlyGuessed = Array.isArray(gameData.correctly_guessed)
          ? [...gameData.correctly_guessed]
          : [];

        const guessedMappings = {};

        // If game has guessedMappings, use that
        if (
          gameData.guessedMappings &&
          typeof gameData.guessedMappings === "object"
        ) {
          // Create a fresh copy for immutability
          Object.entries(gameData.guessedMappings).forEach(([key, value]) => {
            guessedMappings[key] = value;
          });
        }
        // Otherwise reconstruct from correctly_guessed and reverse_mapping
        else if (gameData.reverse_mapping && correctlyGuessed.length > 0) {
          correctlyGuessed.forEach((encryptedLetter) => {
            if (encryptedLetter in gameData.reverse_mapping) {
              guessedMappings[encryptedLetter] =
                gameData.reverse_mapping[encryptedLetter];
            }
          });
        }

        // Create a new letterFrequency object with immutability
        const letterFrequency = {};
        if (
          gameData.letter_frequency &&
          typeof gameData.letter_frequency === "object"
        ) {
          Object.entries(gameData.letter_frequency).forEach(([key, value]) => {
            letterFrequency[key] = value;
          });
        } else {
          // Calculate frequency if not provided
          const matches = processedEncrypted.match(/[A-Z]/g) || [];
          matches.forEach((letter) => {
            letterFrequency[letter] = (letterFrequency[letter] || 0) + 1;
          });
        }

        // Store game ID
        if (gameData.game_id) {
          localStorage.setItem("uncrypt-game-id", gameData.game_id);
        }

        // Determine difficulty and max mistakes
        const difficulty = gameData.difficulty || "easy";

        // Get max mistakes - now terminology is aligned
        const maxMistakesValue = MAX_MISTAKES_MAP[difficulty] || 8;

        console.log(
          `Continuing game with difficulty: ${difficulty}, maxMistakes: ${maxMistakesValue}`,
        );

        // Determine game state (won/lost)
        const hasWon = gameData.hasWon || gameData.has_won === true;
        const hasLost = gameData.mistakes >= maxMistakesValue;
        const incorrectGuesses =
          gameData.incorrect_guesses || gameData.incorrectGuesses || {};

        // Update game state with Immer
        set(state => {
          // Core game data
          state.encrypted = processedEncrypted;
          state.display = processedDisplay;
          state.mistakes = gameData.mistakes || 0;

          // Processed data
          state.correctlyGuessed = correctlyGuessed;
          state.incorrectGuesses = incorrectGuesses;
          state.guessedMappings = guessedMappings;
          state.letterFrequency = letterFrequency;
          state.originalLetters = Array.isArray(gameData.original_letters)
            ? [...gameData.original_letters]
            : [];

          // Game metadata
          state.gameId = gameData.game_id;
          state.startTime = Date.now() - (gameData.time_spent || 0) * 1000;

          // Game configuration
          state.hardcoreMode = gameHardcoreMode;
          state.difficulty = difficulty;
          state.maxMistakes = maxMistakesValue;

          // Reset UI state
          state.selectedEncrypted = null;
          state.lastCorrectGuess = null;

          // Game status flags
          state.hasGameStarted = true;
          state.hasWon = hasWon;
          state.hasLost = hasLost;
          state.winData = gameData.winData || null;
          state.isResetting = false;
          state.stateInitialized = true;

          // Daily challenge flags
          state.isDailyChallenge = isDailyChallenge;
          state.dailyDate = dailyDate;
        });

        // Log success and return
        console.log("Game state successfully continued with proper immutability");
        return true;
      } catch (error) {
        console.error("Error continuing saved game:", error);
        return false;
      }
    },

    // Submit a guess
    submitGuess: async (encryptedLetter, guessedLetter) => {
      if (!encryptedLetter || !guessedLetter) {
        return { success: false, error: "Invalid input" };
      }

      try {
        const data = await apiService.submitGuess(encryptedLetter, guessedLetter);

        // Handle session expiration
        if (data.error && data.error.includes("Session expired")) {
          return { success: false, sessionExpired: true };
        }

        const state = get();
        const isDailyChallenge = state.isDailyChallenge;

        // Process display text for hardcore mode
        let displayText = data.display;
        if (displayText && state.hardcoreMode && !isDailyChallenge) {
          displayText = displayText.replace(/[^A-Z█]/g, "");
        }

        // Check if the number of mistakes increased - this means the guess was incorrect
        const isIncorrectGuess =
          typeof data.mistakes === "number" && data.mistakes > state.mistakes;

        // Check if this guess was correct
        let isCorrectGuess = false;
        if (
          Array.isArray(data.correctly_guessed) &&
          data.correctly_guessed.includes(encryptedLetter) &&
          !state.correctlyGuessed.includes(encryptedLetter)
        ) {
          isCorrectGuess = true;
        }

        // Update state with Immer
        set(state => {
          // Update basic properties
          state.display = displayText || state.display;
          state.mistakes = typeof data.mistakes === "number" ? data.mistakes : state.mistakes;
          state.selectedEncrypted = null;

          // Handle incorrect_guesses data
          if (data.incorrect_guesses && typeof data.incorrect_guesses === "object") {
            state.incorrectGuesses = data.incorrect_guesses;
          } else if (!data.is_correct && encryptedLetter && guessedLetter) {
            // Create the array if it doesn't exist
            if (!state.incorrectGuesses[encryptedLetter]) {
              state.incorrectGuesses[encryptedLetter] = [];
            }

            // Add the guess if it's not already included
            if (!state.incorrectGuesses[encryptedLetter].includes(guessedLetter)) {
              state.incorrectGuesses[encryptedLetter].push(guessedLetter);
            }
          }

          // Check for game lost - this must be checked FIRST
          if (state.mistakes >= state.maxMistakes) {
            state.hasLost = true;
            state.hasWon = false; // Explicitly set hasWon to false to avoid conflicts
            state.completionTime = Date.now();
          }
          // Only check for win if the game hasn't been lost
          else if (data.hasWon || data.game_complete) {
            state.hasWon = true;
            state.hasLost = false; // Explicitly set hasLost to false to avoid conflicts
            state.completionTime = Date.now();
            // Set verification in progress flag to show loading spinner
            state.isWinVerificationInProgress = true;
          }

          // Handle correctly guessed letters
          if (Array.isArray(data.correctly_guessed)) {
            state.correctlyGuessed = data.correctly_guessed;

            // Check if this guess was correct
            if (isCorrectGuess) {
              state.lastCorrectGuess = encryptedLetter;
              state.guessedMappings[encryptedLetter] = guessedLetter.toUpperCase();
            }
          }
        });

        // If we've detected a win, verify with backend in a separate call
        if (get().hasWon) {
          get().verifyWinAndGetData();
        }

        return {
          success: true,
          isCorrect: isCorrectGuess,
          isIncorrect: isIncorrectGuess,
          hasWon: get().hasWon || false,
          hasLost: get().hasLost || false,
        };
      } catch (error) {
        console.error("Error submitting guess:", error);
        return { success: false, error: error.message };
      }
    },

    // Get a hint with safety mechanisms against rapid clicks
    getHint: async () => {
      const state = get();

      // Safety check: Don't allow hints if a hint is already in progress
      if (state.isHintInProgress) {
        console.log("Hint already in progress, ignoring request");
        return { success: false, reason: "hint-in-progress" };
      }

      // Safety check: Calculate if this hint would exceed max mistakes
      const currentMistakes = state.mistakes;
      const pendingMistakes = currentMistakes + state.pendingHints + 1; // +1 for this hint
      const maxMistakesAllowed = state.maxMistakes;

      // Don't allow hints that would cause a loss
      if (pendingMistakes >= maxMistakesAllowed) {
        console.log(
          `Hint would exceed max mistakes (${currentMistakes}+${state.pendingHints}+1 vs ${maxMistakesAllowed})`,
        );
        return { success: false, reason: "would-exceed-max-mistakes" };
      }

      // Mark hint as in progress and increment pendingHints
      set(state => {
        state.isHintInProgress = true;
        state.pendingHints = state.pendingHints + 1;
      });

      try {
        const data = await apiService.getHint();

        // Handle errors
        if (data.authRequired) {
          set(state => {
            state.isHintInProgress = false;
            state.pendingHints = state.pendingHints - 1; // Subtract the pending hint
          });
          return { success: false, authRequired: true };
        }

        if (data.error) {
          set(state => {
            state.isHintInProgress = false;
            state.pendingHints = state.pendingHints - 1; // Subtract the pending hint
          });
          return { success: false, error: data.error };
        }

        const isDailyChallenge = get().isDailyChallenge;

        // Process display text for hardcore mode
        let displayText = data.display;
        if (state.hardcoreMode && displayText && !isDailyChallenge) {
          displayText = displayText.replace(/[^A-Z█]/g, "");
        }

        // Update mappings
        const newCorrectlyGuessed = data.correctly_guessed || [];
        const newMistakes = data.mistakes;

        // Check for game state changes
        let hasLost = false;
        let hasWon = false;

        if (newMistakes >= state.maxMistakes) {
          hasLost = true;
        } else if (data.hasWon || data.game_complete) {
          hasWon = true;
        }

        // Update state with all changes - including resetting hint flags
        set(state => {
          state.display = displayText;
          state.mistakes = newMistakes;
          state.correctlyGuessed = newCorrectlyGuessed;
          state.hasLost = hasLost;
          state.hasWon = hasWon;

          // Reset hint tracking
          state.isHintInProgress = false;
          state.pendingHints = 0; // Reset to 0 since we have the latest state from server

          // Only set completion time if game is over
          if (hasWon || hasLost) {
            state.completionTime = Date.now();
          }

          // Update guessedMappings based on newly revealed letters
          newCorrectlyGuessed.forEach(letter => {
            if (!state.correctlyGuessed.includes(letter)) {
              for (let i = 0; i < state.encrypted.length; i++) {
                if (state.encrypted[i] === letter && displayText[i] !== '█') {
                  state.guessedMappings[letter] = displayText[i];
                  break;
                }
              }
            }
          });
        });

        if (hasWon) {
          get().verifyWinAndGetData();
        }

        return { success: true };
      } catch (error) {
        console.error("Error getting hint:", error);

        // Reset hint tracking even on error
        set(state => {
          state.isHintInProgress = false;
          state.pendingHints = Math.max(0, state.pendingHints - 1); // Decrement but don't go negative
        });

        return { success: false, error: error.message };
      }
    },

    /**
     * Verify win status and get comprehensive win data from backend
     */
    verifyWinAndGetData: async () => {
      try {
        // Set flag to indicate verification is in progress
        set(state => {
          state.isWinVerificationInProgress = true;
        });

        // Get current game ID and check if it's a daily challenge
        const gameId = localStorage.getItem("uncrypt-game-id") || "";
        const isDailyChallenge = gameId.includes("-daily-") || get().isDailyChallenge;

        // Get fresh status from backend - pass isDailyChallenge flag if needed
        const gameStatus = await apiService.getGameStatus(isDailyChallenge);

        if (gameStatus.error) {
          console.error("Error verifying win:", gameStatus.error);
          set(state => {
            state.isWinVerificationInProgress = false;
          });
          return { verified: false };
        }

        // If backend confirms win, update state with complete win data
        if (
          gameStatus.game_complete ||
          gameStatus.gameComplete ||
          gameStatus.hasWon ||
          gameStatus.has_won
        ) {
          // Extract win data from the response - handle multiple possible field names
          const winData = gameStatus.win_data || gameStatus.winData || {};
          const uniqueLettersSolved = new Set(get().correctlyGuessed || []).size;

          // Create complete win data structure with normalized field names
          const formattedWinData = {
            score: winData.score || 0,
            mistakes: winData.mistakes || gameStatus.mistakes || 0,
            maxMistakes: winData.maxMistakes || gameStatus.maxMistakes || 5,
            gameTimeSeconds: winData.gameTimeSeconds || 0,
            rating: winData.rating || "Cryptanalyst",
            encrypted: get().encrypted || "",
            display: get().display || "",
            hardcoreMode: get().hardcoreMode,
            lettersSolved: uniqueLettersSolved,
            attribution: winData.attribution || {
              major_attribution:
                winData.major_attribution ||
                gameStatus.major_attribution ||
                "Unknown",
              minor_attribution:
                winData.minor_attribution || gameStatus.minor_attribution || "",
            },
            scoreStatus: {
              recorded: !!config.session.getAuthToken(),
              message: config.session.getAuthToken()
                ? "Score recorded successfully!"
                : "Score not recorded - anonymous game",
            },

            // Add daily challenge info to win data
            isDailyChallenge: isDailyChallenge,
            dailyDate: get().dailyDate,

            // Ensure daily streak data is properly passed through
            current_daily_streak: winData.current_daily_streak || 0,
          };

          // Update state with win data and clear verification flag
          set(state => {
            state.hasWon = true;
            state.hasLost = false;
            state.completionTime = Date.now();
            state.winData = formattedWinData;
            state.isWinVerificationInProgress = false;
          });

          return {
            verified: true,
            winData: formattedWinData,
          };
        }

        // No win/loss confirmed by backend
        set(state => {
          state.isWinVerificationInProgress = false;
        });

        return { verified: false };
      } catch (error) {
        console.error("Error in win verification:", error);
        set(state => {
          state.isWinVerificationInProgress = false;
        });
        return { verified: false, error };
      }
    },

    // Letter selection
    handleEncryptedSelect: (letter) => {
      const state = get();
      if (letter === null || !state.correctlyGuessed.includes(letter)) {
        set(state => {
          state.selectedEncrypted = letter;
        });
        return true;
      }
      return false;
    },

    // Reset game
    resetGame: () => {
      set(state => {
        // Reset all properties to initial values
        Object.keys(initialState).forEach(key => {
          state[key] = initialState[key];
        });

        // Set specific values that should differ from initialState
        state.isResetting = true;

        // Preserve settings-derived values
        state.difficulty = get().difficulty;
        state.maxMistakes = get().maxMistakes;
        state.hardcoreMode = get().hardcoreMode;
        state.settingsInitialized = get().settingsInitialized;
      });
    },

    // Reset complete
    resetComplete: () => {
      set(state => {
        state.isResetting = false;
      });
    },

    // Abandon game - thoroughly clean up both frontend and backend state
    abandonGame: async () => {
      try {
        // Check if there's an active daily game - don't abandon if starting daily
        const activeGameId = localStorage.getItem("uncrypt-game-id");
        const isActiveDailyGame =
          activeGameId && activeGameId.includes("-daily-");

        // If we have a daily game and we're trying to start a new daily, don't abandon
        if (isActiveDailyGame && window.location.pathname.includes("/daily")) {
          console.log("Preserving daily game during daily initialization");
          return true;
        }

        // Clear any stored game ID first
        localStorage.removeItem("uncrypt-game-id");

        // Get auth status to determine appropriate abandonment approach
        const token = config.session.getAuthToken();
        const isAuthenticated = !!token;

        if (isAuthenticated) {
          // For authenticated users, make a more thorough cleanup
          try {
            // Make direct call to abandon endpoint to ensure all game states are cleaned up
            await apiService.api.delete("/api/abandon-game", {
              headers: {
                // Ensure authentication headers are included
                ...config.session.getHeaders(),
              },
            });
            console.log("Successfully abandoned authenticated game state");
          } catch (err) {
            // Log but continue - we'll still reset local state
            console.warn("Server-side game abandonment failed:", err);
          }
        } else {
          // For anonymous users, just try the standard abandon
          try {
            await apiService.abandonAndResetGame();
          } catch (err) {
            console.warn("Anonymous game abandon failed:", err);
          }
        }

        // We don't reset the full state here because that would interfere with the
        // loading sequence and state flags. Let the calling context handle the
        // reset of all game state.

        return true;
      } catch (error) {
        console.error("Error completely abandoning game:", error);
        return false;
      }
    },

    // Reset and start new game with Immer simplification
    resetAndStartNewGame: async (
      useLongText = false,
      hardcoreMode = false,
      options = {},
    ) => {
      try {
        // Set resetting flag first, before any async operations
        set(state => {
          state.isResetting = true;
        });

        // First abandon the current game
        await get().abandonGame();

        // Clear local storage ID
        localStorage.removeItem("uncrypt-game-id");

        // Reset state but keep isResetting flag
        set(state => {
          // Reset all properties to initial values
          Object.keys(initialState).forEach(key => {
            state[key] = initialState[key];
          });

          // Set specific values that should differ from initialState
          state.isResetting = true;

          // Use latest settings from settingsStore
          state.difficulty = get().difficulty;
          state.maxMistakes = get().maxMistakes;
          state.hardcoreMode = get().hardcoreMode;
          state.settingsInitialized = true;
        });

        // Add a small delay to ensure state changes propagate
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Make direct API call to start game rather than using startGame method
        try {
          const latestSettings = useSettingsStore.getState().settings;

          // Directly call API service
          const gameData = await apiService.startGame({
            longText: useLongText,
            difficulty: latestSettings?.difficulty || "medium",
            hardcoreMode: latestSettings?.hardcoreMode || hardcoreMode,
          });

          if (gameData && gameData.encrypted_paragraph && gameData.display) {
            // Process data for hardcore mode if needed
            const effectiveHardcoreMode =
              latestSettings?.hardcoreMode || hardcoreMode;
            let processedEncrypted = effectiveHardcoreMode
              ? gameData.encrypted_paragraph.replace(/[^A-Z]/g, "")
              : gameData.encrypted_paragraph;

            let processedDisplay = effectiveHardcoreMode
              ? gameData.display.replace(/[^A-Z█]/g, "")
              : gameData.display;

            // Store game ID if present
            if (gameData.game_id) {
              localStorage.setItem("uncrypt-game-id", gameData.game_id);
            }

            // Explicitly update game state with new game data
            set(state => {
              state.encrypted = processedEncrypted;
              state.display = processedDisplay;
              state.mistakes = gameData.mistakes || 0;
              state.correctlyGuessed = Array.isArray(gameData.correctly_guessed)
                ? [...gameData.correctly_guessed]
                : [];
              state.letterFrequency = gameData.letter_frequency || {};
              state.originalLetters = Array.isArray(gameData.original_letters)
                ? [...gameData.original_letters]
                : [];
              state.startTime = Date.now();
              state.gameId = gameData.game_id;
              state.hasGameStarted = true;
              state.hardcoreMode = effectiveHardcoreMode;
              state.difficulty = latestSettings?.difficulty || "medium";
              state.maxMistakes =
                MAX_MISTAKES_MAP[latestSettings?.difficulty || "medium"] || 5;
              state.hasWon = false;
              state.hasLost = false;
              state.winData = null;
              state.isResetting = false;
              state.isDailyChallenge = options.isDaily || false;
            });

            console.log("Game state successfully updated with new game data");
            return true;
          } else {
            throw new Error("Invalid game data received");
          }
        } catch (error) {
          console.error("Error starting new game directly:", error);
          // Clear resetting flag on error
          set(state => {
            state.isResetting = false;
          });
          return false;
        }
      } catch (error) {
        console.error("Error in resetAndStartNewGame:", error);
        // Always clear resetting flag on error
        set(state => {
          state.isResetting = false;
        });
        return false;
      }
    },
  }))
);

// Initialize settings synchronization
setTimeout(() => {
  const gameStore = useGameStore.getState();
  if (!gameStore.settingsInitialized) {
    gameStore.initializeFromSettings();
  }
}, 0);

export default useGameStore;