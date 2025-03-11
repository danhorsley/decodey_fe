// src/context/AppContext.js
import React from "react";
import { useAppContext as useNewAppContext } from "./index";

// Default values for the context to prevent destructuring errors
const defaultContextValue = {
  // Settings defaults
  settings: {
    theme: "light",
    difficulty: "easy",
    longText: false,
    speedMode: true,
    gridSorting: "default",
    hardcoreMode: false,
    mobileMode: "auto",
    textColor: "default",
  },
  updateSettings: () => {},
  maxMistakes: 8,

  // Auth defaults
  user: null,
  isAuthenticated: false,
  authLoading: false,
  token: null,
  authError: null,
  login: async () => ({ success: false }),
  logout: () => {},
  leaderboardData: { entries: [] },
  fetchLeaderboard: async () => ({}),

  // UI defaults
  currentView: "game",
  showSettings: () => {},
  showGame: () => {},
  showLogin: () => {},
  showRegister: () => {},
  isAboutOpen: false,
  openAbout: () => {},
  closeAbout: () => {},
  isLoginOpen: false,
  openLogin: () => {},
  closeLogin: () => {},
  isSignupOpen: false,
  openSignup: () => {},
  closeSignup: () => {},
  isSettingsOpen: false,
  openSettings: () => {},
  closeSettings: () => {},
  isMobile: false,
  isLandscape: true,
  screenWidth: 0,
  screenHeight: 0,
  useMobileMode: false,

  // Game state defaults
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
  startGame: async () => false,
  handleEncryptedSelect: () => false,
  submitGuess: async () => ({ success: false }),
  getHint: async () => ({ success: false }),
  resetGame: () => {},
};

// Create a context with default values
const AppContext = React.createContext(defaultContextValue);

// Export the provider that combines all contexts
export const AppProvider = ({ children }) => {
  // Use the new combined context hook or fall back to defaults
  const contextValue = useNewAppContext() || defaultContextValue;

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

// Export the hook for backward compatibility
export const useAppContext = () => {
  // Get context value with fallback to defaults
  const context = React.useContext(AppContext) || defaultContextValue;
  return context;
};

export default AppContext;
