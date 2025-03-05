import React, { createContext, useState, useEffect, useContext } from "react";
import useDeviceDetection from "./useDeviceDetection";

// Create context
const AppContext = createContext();

// Default settings
const defaultSettings = {
  // frequencyDisplay: "numeric",
  theme: "dark",
  difficulty: "easy",
  // textColor: "scifi-blue", // This will be auto-set based on theme
  speedMode: true, // Always on - cannot be changed
  gridSorting: "default",
  hardcoreMode: false,
  mobileMode: "auto",
  useLongQuotes: false, // Added: use long quotes or not
  // placeholderStyle: "matching" // Default placeholder style
};

// Get max mistakes based on difficulty
export const getMaxMistakes = (difficulty) => {
  switch (difficulty) {
    case "easy":
      return 8;
    case "hard":
      return 3;
    case "normal":
    default:
      return 5;
  }
};

// Provider component
export const AppProvider = ({ children }) => {
  // Initialize state from localStorage or defaults
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem("decrypto-settings");
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });

  // Get device information
  const { isMobile, isLandscape, screenWidth, screenHeight, detectMobile } =
    useDeviceDetection();

  // Track whether we should use mobile mode
  const [useMobileMode, setUseMobileMode] = useState(false);

  const [currentView, setCurrentView] = useState("game"); // 'game' or 'settings'
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Determine if we should use mobile mode based on settings and device
  useEffect(() => {
    if (settings.mobileMode === "always") {
      setUseMobileMode(true);
    } else if (settings.mobileMode === "never") {
      setUseMobileMode(false);
    } else {
      // Auto mode - use device detection
      setUseMobileMode(isMobile);
    }
  }, [settings.mobileMode, isMobile]);

  // Re-check device when window resizes
  useEffect(() => {
    const handleResize = () => {
      detectMobile();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [detectMobile]);

  // Apply theme whenever settings change
  useEffect(() => {
    try {
      // Use a forced timeout to ensure theme is applied on all browsers
      setTimeout(() => {
        if (settings.theme === "dark") {
          document.documentElement.classList.add("dark-theme");
          document.body.classList.add("dark-theme");

          // Force mobile browser compatibility
          if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            document.documentElement.style.backgroundColor = "#222";
            document.body.style.backgroundColor = "#222";
            document.body.style.color = "#f8f9fa";
          }
        } else {
          document.documentElement.classList.remove("dark-theme");
          document.body.classList.remove("dark-theme");

          // Force mobile browser compatibility
          if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            document.documentElement.style.backgroundColor = "#ffffff";
            document.body.style.backgroundColor = "#ffffff";
            document.body.style.color = "#212529";
          }
        }
      }, 100);
    } catch (e) {
      console.error("Error applying theme:", e);
    }
  }, [settings.theme]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("decrypto-settings", JSON.stringify(settings));
  }, [settings]);

  // Update settings
  const updateSettings = (newSettings) => {
    // Always ensure textColor matches theme
    const updatedSettings = {
      ...newSettings,
      textColor: newSettings.theme === "dark" ? "scifi-blue" : "default",
      speedMode: true, // Always ensure speed mode is on
    };
    setSettings(updatedSettings);
  };

  // Navigate to settings view
  const showSettings = () => {
    setCurrentView("settings");
  };

  // Navigate to game view
  const showGame = () => {
    setCurrentView("game");
  };

  const openAbout = () => {
    setIsAboutOpen(true);
  };

  const closeAbout = () => {
    setIsAboutOpen(false);
  };

  // Context value
  const contextValue = {
    settings,
    updateSettings,
    currentView,
    showSettings,
    showGame,
    maxMistakes: getMaxMistakes(settings.difficulty),
    isAboutOpen,
    openAbout,
    closeAbout,
    // Mobile-related properties
    isMobile,
    isLandscape,
    screenWidth,
    screenHeight,
    useMobileMode,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

// Custom hook for using the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

export default AppContext;