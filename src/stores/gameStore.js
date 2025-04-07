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

  // Start a new game with data integrity checks
  startGame: async (
    useLongText = false,
    hardcoreMode = false,
    forceNewGame = false,
    isDailyChallenge = false, // New parameter
  ) => {
    try {
      // If we're forcing a new game, ensure any previous game is fully abandoned
      if (forceNewGame) {
        try {
          await get().abandonGame();
        } catch (err) {
          console.warn("Abandonment before new game failed:", err);
          // Continue anyway - we'll still try to start a new game
        }
      }

      // Clear any existing game ID for a fresh start
      localStorage.removeItem("uncrypt-game-id");

      // Make sure we've initialized settings
      if (!get().settingsInitialized) {
        get().initializeFromSettings();
      }

      // Get current difficulty and max mistakes from our synchronized state
      const difficulty = get().difficulty;
      const maxMistakesValue = get().maxMistakes;

      // Hardcore mode can come from parameter or store
      const effectiveHardcoreMode = hardcoreMode || get().hardcoreMode;

      console.log("Starting new game with settings:", {
        longText: useLongText,
        hardcoreMode: effectiveHardcoreMode,
        difficulty,
        maxMistakes: maxMistakesValue,
        isDailyChallenge,
      });

      // Request new game from API
      let data;

      if (isDailyChallenge) {
        // For daily challenges, use the daily API endpoint
        const todayDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        data = await apiService.startDailyChallenge(todayDate);
      } else {
        // For regular games, use the standard startGame
        data = await apiService.startGame({
          longText: useLongText,
          difficulty: difficulty,
          hardcoreMode: effectiveHardcoreMode,
        });
      }

      console.log("Game start response received");

      // Validate essential data
      if (!data || !data.encrypted_paragraph || !data.display) {
        console.error("Invalid game data received:", data);
        return false;
      }

      // Process for hardcore mode
      let processedEncrypted = data.encrypted_paragraph;
      let processedDisplay = data.display;

      // if (effectiveHardcoreMode) {
      //   processedEncrypted = processedEncrypted.replace(/[^A-Z]/g, "");
      //   processedDisplay = processedDisplay.replace(/[^A-Z█]/g, "");
      // }

      // DATA INTEGRITY CHECK: Ensure encrypted and display text are correctly aligned
      if (processedEncrypted.length !== processedDisplay.length) {
        console.error("Data integrity error: Text length mismatch", {
          encryptedLength: processedEncrypted.length,
          displayLength: processedDisplay.length,
        });

        // Attempt to fix by re-processing from original
        if (data.encrypted_paragraph && data.display) {
          console.log("Attempting to fix length mismatch");

          processedEncrypted = effectiveHardcoreMode
            ? data.encrypted_paragraph.replace(/[^A-Z]/g, "")
            : data.encrypted_paragraph;

          processedDisplay = effectiveHardcoreMode
            ? data.display.replace(/[^A-Z█]/g, "")
            : data.display;

          // Check if fix worked
          if (processedEncrypted.length !== processedDisplay.length) {
            console.error(
              "Failed to fix length mismatch - aborting game start",
            );
            return false;
          }
        } else {
          return false;
        }
      }

      // Store game ID if present
      if (data.game_id) {
        localStorage.setItem("uncrypt-game-id", data.game_id);

        // If game_id contains difficulty info, log it for debugging
        // Game IDs have format: "{difficulty}-{daily/custom}-{uuid}"
        try {
          const parts = data.game_id.split("-");
          if (parts.length >= 3) {
            const gameDifficultyPrefix = parts[0];
            const gameTypePrefix = parts[1]; // Could be "daily" or "custom"
            console.log(
              `Game returned with difficulty: ${gameDifficultyPrefix}, type: ${gameTypePrefix}`,
            );
          }
        } catch (e) {
          console.warn("Could not parse game_id:", e);
        }
      }

      // Create a clean, complete new state object
      const newGameState = {
        encrypted: processedEncrypted,
        display: processedDisplay,
        mistakes: data.mistakes || 0,
        correctlyGuessed: Array.isArray(data.correctly_guessed)
          ? [...data.correctly_guessed]
          : [],
        selectedEncrypted: null,
        lastCorrectGuess: null,
        letterFrequency: data.letter_frequency
          ? { ...data.letter_frequency }
          : {},
        guessedMappings: {},
        originalLetters: Array.isArray(data.original_letters)
          ? [...data.original_letters]
          : [],
        startTime: Date.now(),
        gameId: data.game_id,
        hasGameStarted: true,
        hardcoreMode: effectiveHardcoreMode,
        // Override difficulty for daily challenges
        difficulty: isDailyChallenge ? "easy" : difficulty,
        // Override maxMistakes for daily challenges
        maxMistakes: isDailyChallenge ? 8 : maxMistakesValue,
        hasWon: false,
        hasLost: false,
        winData: null,
        isResetting: false,

        // Set daily challenge flags
        isDailyChallenge: isDailyChallenge,
        dailyDate: isDailyChallenge
          ? new Date().toISOString().split("T")[0]
          : null,
      };

      // Update state in a single operation
      set(newGameState);

      return true;
    } catch (error) {
      console.error("Error starting game:", error);

      // Make sure we're not left in a resetting state
      set((state) => ({ ...state, isResetting: false }));

      return false;
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
        const parts = gameData.game_id.split("-");
        if (parts.length >= 3 && parts[1] === "daily") {
          console.log("Continuing a daily challenge game");
          isDailyChallenge = true;

          // Try to extract date from game data if available
          if (gameData.daily_date) {
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

      // Create a complete new state object for immutability
      const newGameState = {
        // Core game data
        encrypted: processedEncrypted,
        display: processedDisplay,
        mistakes: gameData.mistakes || 0,

        // Derived/processed data with proper immutability
        correctlyGuessed: correctlyGuessed,
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
      const isDailyChallenge = get().isDailyChallenge;
      // Process display text for hardcore mode
      const state = get();
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

        // First update state with what we know
        set(updates);

        // Then verify with backend to get complete win data
        get().verifyWinAndGetData();
      }

      // Handle correctly guessed letters
      if (Array.isArray(data.correctly_guessed)) {
        updates.correctlyGuessed = data.correctly_guessed;

        // Update guessedMappings based on display text
        const newMappings = { ...state.guessedMappings };
        data.correctly_guessed.forEach(letter => {
          // Find the corresponding plain text letter from display
          for(let i = 0; i < state.encrypted.length; i++) {
            if(state.encrypted[i] === letter && displayText[i] !== '█') {
              newMappings[letter] = displayText[i];
              break;
            }
          }
        });
        updates.guessedMappings = newMappings;

        // Check if this guess was correct (not previously guessed)
        if (
          data.correctly_guessed.includes(encryptedLetter) &&
          !state.correctlyGuessed.includes(encryptedLetter)
        ) {
          updates.lastCorrectGuess = encryptedLetter;
          // Play correct sound
          //playSound && playSound("correct");
        } else if (data.mistakes > state.mistakes) {
          // This was an incorrect guess
          //playSound && playSound("incorrect");
        }
      }

      // Update state with all changes at once
      set(updates);

      return {
        success: true,
        isCorrect: data.correctly_guessed.includes(encryptedLetter),
        isIncorrect: data.mistakes > state.mistakes,
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
      // Get fresh status from backend
      const gameStatus = await apiService.getGameStatus();

      if (gameStatus.error) {
        console.error("Error verifying win:", gameStatus.error);
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
          dailyStats: winData.dailyStats || null,
        };

        console.log("Formatted win data:", formattedWinData);

        set({
          hasWon: true,
          hasLost: false,
          completionTime: Date.now(),
          winData: formattedWinData,
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
      const isActiveCustomGame =
        activeGameId && !activeGameId.includes("-daily-");

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
              ?? { ...gameData.letter_frequency }
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