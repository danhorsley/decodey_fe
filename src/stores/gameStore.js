import { create } from "zustand";
import apiService from "../services/apiService";

// Define max mistakes map to avoid dependency on context
const MAX_MISTAKES_MAP = {
  easy: 8,
  normal: 5,
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
  difficulty: "easy",
  maxMistakes: 8,
  isResetting: false,
};

const useGameStore = create((set, get) => ({
  ...initialState,

  // Start a new game
  startGame: async (
    useLongText = false,
    hardcoreMode = false,
    forceNewGame = false,
  ) => {
    try {
      // Clear existing game ID
      localStorage.removeItem("uncrypt-game-id");

      // Determine difficulty and max mistakes
      const difficulty = get().difficulty || "easy";
      const maxMistakesValue = MAX_MISTAKES_MAP[difficulty] || 8;

      console.log("Starting new game with settings:", {
        longText: useLongText,
        hardcoreMode,
        difficulty,
      });

      const data = await apiService.startGame({
        longText: useLongText,
        difficulty,
      });

      console.log("Game start response:", data);

      // Processing for hardcore mode
      let processedEncrypted = data.encrypted_paragraph || "";
      let processedDisplay = data.display || "";

      if (hardcoreMode) {
        processedEncrypted = processedEncrypted.replace(/[^A-Z]/g, "");
        processedDisplay = processedDisplay.replace(/[^A-Z█]/g, "");
      }

      // Store game ID
      if (data.game_id) {
        localStorage.setItem("uncrypt-game-id", data.game_id);
      }

      // Update state
      set({
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
        hasGameStarted: true,
        hardcoreMode,
        difficulty,
        maxMistakes: maxMistakesValue,
        hasWon: false,
        hasLost: false,
        winData: null,
        isResetting: false,
      });

      return true;
    } catch (error) {
      console.error("Error starting game:", error);
      return false;
    }
  },

  // Continue a saved game
  continueSavedGame: async () => {
    try {
      console.log("Attempting to continue saved game");

      // Check for auth token
      const token =
        localStorage.getItem("uncrypt-token") ||
        sessionStorage.getItem("uncrypt-token");
      if (!token) {
        console.warn("Cannot continue saved game - no auth token found");
        return false;
      }

      // Set API headers
      apiService.api.defaults.headers.common["Authorization"] =
        `Bearer ${token}`;

      // Get game state from API
      const response = await apiService.api.get("/api/continue-game");
      console.log("Continue game response:", response.data);

      if (!response.data || response.data.error) {
        console.warn("Error or empty response from continue-game endpoint");
        return false;
      }

      const game = response.data;

      // Process game data for hardcore mode if needed
      const currentHardcoreMode = get().hardcoreMode;
      let processedEncrypted = game.encrypted_paragraph || "";
      let processedDisplay = game.display || "";

      if (currentHardcoreMode) {
        processedEncrypted = processedEncrypted.replace(/[^A-Z]/g, "");
        processedDisplay = processedDisplay.replace(/[^A-Z█]/g, "");
      }

      // Reconstruct guessedMappings
      const guessedMappings = {};
      const correctlyGuessed = Array.isArray(game.correctly_guessed)
        ? game.correctly_guessed
        : [];

      if (game.reverse_mapping && correctlyGuessed.length > 0) {
        correctlyGuessed.forEach((encryptedLetter) => {
          if (encryptedLetter in game.reverse_mapping) {
            guessedMappings[encryptedLetter] =
              game.reverse_mapping[encryptedLetter];
          }
        });
      }

      // Store game ID
      if (game.game_id) {
        localStorage.setItem("uncrypt-game-id", game.game_id);
      }

      // Determine max mistakes based on difficulty
      const difficulty = game.difficulty || "easy";
      const maxMistakesValue = MAX_MISTAKES_MAP[difficulty] || 8;

      // Update state
      set({
        encrypted: processedEncrypted,
        display: processedDisplay,
        mistakes: game.mistakes || 0,
        correctlyGuessed: correctlyGuessed,
        selectedEncrypted: null,
        lastCorrectGuess: null,
        letterFrequency: game.letter_frequency || {},
        guessedMappings: guessedMappings,
        originalLetters: game.original_letters || [],
        startTime: Date.now() - (game.time_spent || 0) * 1000,
        gameId: game.game_id,
        hasGameStarted: true,
        hardcoreMode: currentHardcoreMode,
        difficulty: difficulty,
        maxMistakes: maxMistakesValue,
        hasWon: false,
        hasLost: false,
        winData: null,
        isResetting: false,
      });

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

      // Check for game lost
      const state = get();
      if (
        typeof data.mistakes === "number" &&
        typeof state.maxMistakes === "number" &&
        data.mistakes >= state.maxMistakes
      ) {
        set({ hasLost: true });
      }

      // Process display text for hardcore mode
      let displayText = data.display;
      if (displayText && state.hardcoreMode) {
        displayText = displayText.replace(/[^A-Z█]/g, "");
      }

      // Update state
      const updates = {
        display: displayText || state.display,
        mistakes:
          typeof data.mistakes === "number" ? data.mistakes : state.mistakes,
        selectedEncrypted: null,
      };

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

      // Check for game win
      if (data.hasWon || data.game_complete) {
        updates.hasWon = true;
        updates.completionTime = Date.now();
        updates.winData = data.winData || null;
      }

      set(updates);

      return {
        success: true,
        isCorrect: isCorrectGuess,
      };
    } catch (error) {
      console.error("Error submitting guess:", error);
      return { success: false, error: error.message };
    }
  },

  // Get a hint
  getHint: async () => {
    try {
      const data = await apiService.getHint();

      // Handle errors
      if (data.authRequired) {
        return { success: false, authRequired: true };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      // Process display text for hardcore mode
      const state = get();
      let displayText = data.display;
      if (state.hardcoreMode && displayText) {
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

      // Update state
      set({
        display: displayText,
        mistakes: data.mistakes,
        correctlyGuessed: newCorrectlyGuessed,
        guessedMappings: newMappings,
      });

      return { success: true };
    } catch (error) {
      console.error("Error getting hint:", error);
      return { success: false, error: error.message };
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
    set({ ...initialState, isResetting: true });
  },

  // Reset complete
  resetComplete: () => {
    set({ isResetting: false });
  },

  // Abandon game
  abandonGame: async () => {
    try {
      // Remove game ID
      localStorage.removeItem("uncrypt-game-id");

      try {
        await apiService.api.delete("/api/abandon-game");
      } catch (err) {
        console.warn("Server abandon failed:", err);
      }

      // Reset state
      set({ ...initialState, isResetting: true });
      setTimeout(() => set({ isResetting: false }), 50);

      return true;
    } catch (error) {
      console.error("Error abandoning game:", error);
      return false;
    }
  },

  // Reset and start new game
  resetAndStartNewGame: async (useLongText = false, hardcoreMode = false) => {
    try {
      // First abandon any existing game
      try {
        await apiService.api.delete("/api/abandon-game");
      } catch (err) {
        console.warn("Error abandoning game:", err);
      }

      // Remove game ID
      localStorage.removeItem("uncrypt-game-id");

      // Reset state
      set({ ...initialState, isResetting: true });

      // Short delay to ensure state is reset
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Start new game
      const difficulty = get().difficulty || "easy";
      const result = await get().startGame(useLongText, hardcoreMode);

      return result;
    } catch (error) {
      console.error("Error in resetAndStartNewGame:", error);
      set({ isResetting: false });
      return false;
    }
  },
}));

export default useGameStore;
