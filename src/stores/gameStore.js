import { create } from "zustand";
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

const useGameStore = create((set, get) => ({
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
    set({
      difficulty: difficulty,
      maxMistakes: MAX_MISTAKES_MAP[difficulty] || 5,
      hardcoreMode: settings.hardcoreMode || false,
      settingsInitialized: true,
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
          set({
            difficulty: newDifficulty,
            maxMistakes: MAX_MISTAKES_MAP[newDifficulty] || 5,
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
          set({ hardcoreMode: newHardcoreMode });
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
   * @param {boolean} longText Whether to use long text
   * @param {boolean} hardcoreMode Whether hardcore mode is enabled
   * @param {boolean} forceNew Whether to force a new game even if one exists
   * @param {boolean} isDaily Whether this is a daily challenge
   * @returns {Promise<Object>} Game start response
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
      set({
        // Instead of using getInitialState, reset the state directly
        gameInProgress: false,
        isInitializing: true,
        hasError: false,
        errorMessage: null,
        display: "",
        encrypted: "",
        selectedEncrypted: null,
        letterFrequency: {},
        correctlyGuessed: [],
        incorrectGuesses: {},
        guessedMappings: {},
        lastCorrectGuess: null,
        mistakes: 0,
        maxMistakes: 5,
        difficulty: "medium",
        pendingHints: 0,
        isHintInProgress: false,
        hasLost: false,
        hasWon: false,
        gameId: null,
        originalLetters: [],
        completionTime: null,
        isAnonymous: false,
        // Preserve these specific settings from parameters
        isAuthenticated,
        hardcoreMode,
        isDailyChallenge: isDaily,
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

      // Don't make another API call if this is a daily challenge
      if (settingsToUse.isDailyChallenge) {
        console.log("Daily challenge already initialized, skipping additional game start");
        return { success: true };
      }

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

      // Set state with game data
      const updates = {
        gameInProgress: true,
        isAnonymous: result.is_anonymous,
        display: result.display,
        encrypted: result.encrypted_paragraph,
        letterFrequency: result.letter_frequency,
        errors: 0,
        hasLost: false,
        hasWon: false,
        gameId: result.game_id,
        originalLetters: result.original_letters,
        incorrectGuesses: {}, // Reset incorrect guesses
        isInitializing: false, // Explicitly mark as not initializing
      };

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

      // Override with server values when available
      updates.difficulty = result.difficulty || difficulty;
      updates.maxMistakes =
        result.max_mistakes ||
        maxMistakesByDifficulty[updates.difficulty] ||
        maxMistakesByDifficulty.medium;
      updates.mistakes = result.mistakes || 0;

      set(updates);

      return {
        success: true,
        gameId: result.game_id,
        difficulty: updates.difficulty,
      };
    } catch (error) {
      console.error("Error in startGame:", error);
      set({ isInitializing: false, hasError: true, errorMessage: error.message });
      return { success: false, error: error.message };
    }
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
      console.log("printing gameData for continue", gameData);
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
      // Create a complete new state object for immutability
      const newGameState = {
        // Core game data
        encrypted: processedEncrypted,
        display: processedDisplay,
        mistakes: gameData.mistakes || 0,

        // Derived/processed data with proper immutability
        correctlyGuessed: correctlyGuessed,
        incorrectGuesses: incorrectGuesses,
        guessedMappings: guessedMappings,
        letterFrequency: letterFrequency,
        originalLetters: Array.isArray(gameData.original_letters)
          ? [...gameData.original_letters]
          : [],

        // Game metadata
        gameId: gameData.game_id,
        startTime: Date.now() - (gameData.time_spent || 0) * 1000,

        // Game configuration
        hardcoreMode: gameHardcoreMode,
        difficulty: difficulty, // Now using consistent terminology
        maxMistakes: maxMistakesValue,

        // Reset UI state
        selectedEncrypted: null,
        lastCorrectGuess: null,

        // Game status flags - explicitly set both for consistency
        hasGameStarted: true,
        hasWon: hasWon,
        hasLost: hasLost,
        winData: gameData.winData || null,
        isResetting: false,
        stateInitialized: true, // Flag to indicate state is properly initialized

        // Daily challenge flags
        isDailyChallenge: isDailyChallenge,
        dailyDate: dailyDate,
      };

      // Replace entire game state at once for clean update
      set(newGameState);

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

      // Prepare state updates
      const updates = {
        display: displayText || state.display,
        mistakes:
          typeof data.mistakes === "number" ? data.mistakes : state.mistakes,
        selectedEncrypted: null,
      };

      // Handle incorrect_guesses data
      let updatedIncorrectGuesses = { ...state.incorrectGuesses };

      // If API provides incorrect_guesses, use it
      if (
        data.incorrect_guesses &&
        typeof data.incorrect_guesses === "object"
      ) {
        updatedIncorrectGuesses = data.incorrect_guesses;
      }
      // Otherwise update manually if this guess was incorrect
      else if (!data.is_correct && encryptedLetter && guessedLetter) {
        if (!updatedIncorrectGuesses[encryptedLetter]) {
          updatedIncorrectGuesses[encryptedLetter] = [];
        }
        if (!updatedIncorrectGuesses[encryptedLetter].includes(guessedLetter)) {
          updatedIncorrectGuesses[encryptedLetter] = [
            ...updatedIncorrectGuesses[encryptedLetter],
            guessedLetter,
          ];
        }
      }

      // Add to state updates
      updates.incorrectGuesses = updatedIncorrectGuesses;

      // Check if the number of mistakes increased - this means the guess was incorrect
      const isIncorrectGuess =
        typeof data.mistakes === "number" && data.mistakes > state.mistakes;

      // Check for game lost - this must be checked FIRST
      if (updates.mistakes >= state.maxMistakes) {
        updates.hasLost = true;
        updates.hasWon = false; // Explicitly set hasWon to false to avoid conflicts
        updates.completionTime = Date.now();
      }
      // Only check for win if the game hasn't been lost
      else if (data.hasWon || data.game_complete) {
        updates.hasWon = true;
        updates.hasLost = false; // Explicitly set hasLost to false to avoid conflicts
        updates.completionTime = Date.now();
        // Set verification in progress flag to show loading spinner
        updates.isWinVerificationInProgress = true;
        // First update state with what we know
        set(updates);

        // Then verify with backend to get complete win data
        get().verifyWinAndGetData();
      }

      // Handle correctly guessed letters
      let isCorrectGuess = false;
      if (Array.isArray(data.correctly_guessed)) {
        updates.correctlyGuessed = data.correctly_guessed;

        // Check if this guess was correct
        if (
          data.correctly_guessed.includes(encryptedLetter) &&
          !state.correctlyGuessed.includes(encryptedLetter)
        ) {
          isCorrectGuess = true;
          updates.lastCorrectGuess = encryptedLetter;
          updates.guessedMappings = {
            ...state.guessedMappings,
            [encryptedLetter]: guessedLetter.toUpperCase(),
          };
        }
      }

      // Update state with all changes at once
      set(updates);

      return {
        success: true,
        isCorrect: isCorrectGuess,
        isIncorrect: isIncorrectGuess,
        hasWon: updates.hasWon || false,
        hasLost: updates.hasLost || false,
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
    set({ isHintInProgress: true, pendingHints: state.pendingHints + 1 });

    try {
      const data = await apiService.getHint();

      // Handle errors
      if (data.authRequired) {
        set({ isHintInProgress: false, pendingHints: state.pendingHints });
        return { success: false, authRequired: true };
      }

      if (data.error) {
        set({ isHintInProgress: false, pendingHints: state.pendingHints });
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
      const newMappings = { ...state.guessedMappings };

      newCorrectlyGuessed.forEach((letter) => {
        if (!state.correctlyGuessed.includes(letter)) {
          for (let i = 0; i < state.encrypted.length; i++) {
            if (state.encrypted[i] === letter && displayText[i] !== "█") {
              newMappings[letter] = displayText[i];
              break;
            }
          }
        }
      });

      // Check for game lost after hint
      const newMistakes = data.mistakes;
      let hasLost = false;
      let hasWon = false;

      if (newMistakes >= state.maxMistakes) {
        hasLost = true;
      } else if (data.hasWon || data.game_complete) {
        hasWon = true;
      }

      // Update state with all changes - including resetting hint flags
      set({
        display: displayText,
        mistakes: newMistakes,
        correctlyGuessed: newCorrectlyGuessed,
        guessedMappings: newMappings,
        hasLost: hasLost,
        hasWon: hasWon,
        // Reset hint tracking
        isHintInProgress: false,
        pendingHints: 0, // Reset to 0 since we have the latest state from server
        // Only set completion time if game is over
        ...(hasWon ? { completionTime: Date.now() } : {}),
      });
      if (hasWon) {
        get().verifyWinAndGetData();
      }
      return { success: true };
    } catch (error) {
      console.error("Error getting hint:", error);

      // Reset hint tracking even on error
      set({
        isHintInProgress: false,
        pendingHints: Math.max(0, state.pendingHints - 1), // Decrement pending hints but don't go negative
      });

      return { success: false, error: error.message };
    }
  },

  /**
   * Verify win status and get comprehensive win data from backend
   * This is called when frontend detects a potential win
   * @returns {Promise<Object>} Win verification result
   */
  verifyWinAndGetData: async () => {
    try {
      // Set flag to indicate verification is in progress
      set({ isWinVerificationInProgress: true });

      // Get fresh status from backend
      const gameStatus = await apiService.getGameStatus();

      if (gameStatus.error) {
        console.error("Error verifying win:", gameStatus.error);
        set({ isWinVerificationInProgress: false });
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

        // Log the win data to help diagnose streak issues
        console.log("Raw win data from server:", winData);
        console.log("Streak data:", winData.current_daily_streak);

        // Get daily challenge status
        const isDailyChallenge = get().isDailyChallenge;
        const dailyDate = get().dailyDate;

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
          dailyDate: dailyDate,

          // Ensure daily streak data is properly passed through - FIXED
          current_daily_streak: winData.current_daily_streak || 0,
        };

        console.log("Formatted win data:", formattedWinData);

        // Update state with win data and clear verification flag
        set({
          hasWon: true,
          hasLost: false,
          completionTime: Date.now(),
          winData: formattedWinData,
          isWinVerificationInProgress: false
        });

        return {
          verified: true,
          winData: formattedWinData,
        };
      }

      // Handle case where backend says game is lost
      if (gameStatus.game_complete && !gameStatus.has_won) {
        set({
          hasWon: false,
          hasLost: true,
          completionTime: Date.now(),
        });

        return { verified: true, hasLost: true };
      }

      // No win/loss confirmed by backend
      return { verified: false };
    } catch (error) {
      console.error("Error in win verification:", error);
      return { verified: false, error };
    }
  },

  // Letter selection
  handleEncryptedSelect: (letter) => {
    const state = get();
    if (letter === null || !state.correctlyGuessed.includes(letter)) {
      set({ selectedEncrypted: letter });
      return true;
    }
    return false;
  },

  // Reset game
  resetGame: () => {
    set({
      ...initialState,
      isResetting: true,
      isHintInProgress: false,
      pendingHints: 0,
      incorrectGuesses: {},
      // Preserve settings-derived values
      difficulty: get().difficulty,
      maxMistakes: get().maxMistakes,
      hardcoreMode: get().hardcoreMode,
      settingsInitialized: get().settingsInitialized,
    });
  },

  // Reset complete
  resetComplete: () => {
    set({ isResetting: false });
  },

  // Abandon game - thoroughly clean up both frontend and backend state
  abandonGame: async () => {
    try {
      // Check if there's an active daily game - don't abandon if starting daily
      const activeGameId = localStorage.getItem("uncrypt-game-id");
      const isActiveDailyGame =
        activeGameId && activeGameId.includes("-daily-");
      // const isActiveCustomGame =
      //   activeGameId && !activeGameId.includes("-daily-");

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

  // Reset and start new game
  // In gameStore.js, modify resetAndStartNewGame to include more explicit data handling:

  resetAndStartNewGame: async (
    useLongText = false,
    hardcoreMode = false,
    options = {},
  ) => {
    try {
      // Set resetting flag first, before any async operations
      set({ isResetting: true });

      // First abandon the current game
      await get().abandonGame();

      // Clear local storage ID
      localStorage.removeItem("uncrypt-game-id");

      // Reset state but keep isResetting flag
      set((state) => ({
        ...initialState,
        isResetting: true,
        // Use latest settings from settingsStore
        difficulty: state.difficulty,
        maxMistakes: state.maxMistakes,
        hardcoreMode: state.hardcoreMode,
        settingsInitialized: true,
      }));

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
          set({
            encrypted: processedEncrypted,
            display: processedDisplay,
            mistakes: gameData.mistakes || 0,
            correctlyGuessed: Array.isArray(gameData.correctly_guessed)
              ? [...gameData.correctly_guessed]
              : [],
            letterFrequency: gameData.letter_frequency
              ? { ...gameData.letter_frequency }
              : {},
            originalLetters: Array.isArray(gameData.original_letters)
              ? [...gameData.original_letters]
              : [],
            startTime: Date.now(),
            gameId: gameData.game_id,
            hasGameStarted: true,
            hardcoreMode: effectiveHardcoreMode,
            difficulty: latestSettings?.difficulty || "medium",
            maxMistakes:
              MAX_MISTAKES_MAP[latestSettings?.difficulty || "medium"] || 5,
            hasWon: false,
            hasLost: false,
            winData: null,
            isResetting: false,
            isDailyChallenge: options.isDaily || false,
          });

          console.log("Game state successfully updated with new game data");
          return true;
        } else {
          throw new Error("Invalid game data received");
        }
      } catch (error) {
        console.error("Error starting new game directly:", error);
        // Clear resetting flag on error
        set({ isResetting: false });
        return false;
      }
    } catch (error) {
      console.error("Error in resetAndStartNewGame:", error);
      // Always clear resetting flag on error
      set({ isResetting: false });
      return false;
    }
  },
}));

// Initialize settings synchronization
setTimeout(() => {
  const gameStore = useGameStore.getState();
  if (!gameStore.settingsInitialized) {
    gameStore.initializeFromSettings();
  }
}, 0);

export default useGameStore;
