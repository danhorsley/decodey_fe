
import { create } from 'zustand';
import apiService from '../services/apiService';
import { getMaxMistakes } from '../context/SettingsContext';

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
  difficulty: "easy"
};

const useGameStore = create((set, get) => ({
  ...initialState,

  startGame: async (useLongText = false, hardcoreMode = false, difficulty = "easy") => {
    try {
      localStorage.removeItem("uncrypt-game-id");
      const maxMistakesValue = getMaxMistakes(difficulty);
      
      const data = await apiService.startGame({
        longText: useLongText,
        difficulty
      });

      set({
        encrypted: data.encrypted_paragraph,
        display: data.display,
        mistakes: 0,
        correctlyGuessed: [],
        letterFrequency: data.letter_frequency,
        gameId: data.game_id,
        hasGameStarted: true,
        hardcoreMode,
        difficulty,
        maxMistakes: maxMistakesValue
      });

      localStorage.setItem("uncrypt-game-id", data.game_id);
      return true;
    } catch (error) {
      console.error("Error starting game:", error);
      return false;
    }
  },

  submitGuess: async (encryptedLetter, guessedLetter) => {
    const response = await apiService.submitGuess(encryptedLetter, guessedLetter);
    if (response.success) {
      set({
        display: response.display,
        mistakes: response.mistakes,
        correctlyGuessed: response.correctly_guessed,
        hasWon: response.game_complete
      });
    }
    return response;
  },

  getHint: async () => {
    const response = await apiService.getHint();
    if (response.success) {
      set({
        display: response.display,
        mistakes: response.mistakes,
        correctlyGuessed: response.correctly_guessed
      });
    }
    return response;
  },

  resetGame: () => set(initialState),

  handleEncryptedSelect: (letter) => {
    set({ selectedEncrypted: letter });
  },

  abandonGame: async () => {
    try {
      await apiService.abandonAndResetGame();
      set(initialState);
      return true;
    } catch (error) {
      console.error("Error abandoning game:", error);
      return false;
    }
  },

  resetAndStartNewGame: async (useLongText = false, hardcoreMode = false) => {
    try {
      await apiService.abandonAndResetGame();
      set(initialState);
      return await get().startGame(useLongText, hardcoreMode, true);
    } catch (error) {
      console.error("Error resetting and starting new game:", error);
      return false;
    }
  },

  continueSavedGame: async () => {
    try {
      const response = await apiService.getGameStatus();
      if (response.success) {
        set({
          ...response,
          hasGameStarted: true,
          startTime: Date.now()
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error continuing saved game:", error);
      return false;
    }
  }
}));

export default useGameStore;
