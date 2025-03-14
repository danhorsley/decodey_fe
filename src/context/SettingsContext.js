// src/context/SettingsContext.js
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";

// Default settings
const defaultSettings = {
  theme: "light",
  difficulty: "easy",
  longText: false,
  speedMode: true, // Always on - cannot be changed
  gridSorting: "default",
  hardcoreMode: false,
  mobileMode: "auto",
  textColor: "default",
  soundEnabled: true,
  vibrationEnabled: true,
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

// Create context
const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  // Initialize state from localStorage or defaults
  const [settings, setSettings] = useState(() => {
    try {
      const savedSettings = localStorage.getItem("uncrypt-settings");

      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);

        // Make sure we have all required properties by merging with defaults
        return {
          ...defaultSettings,
          ...parsedSettings,
        };
      }

      return defaultSettings;
    } catch (error) {
      console.error("Error loading settings from localStorage:", error);
      return defaultSettings;
    }
  });

  // Update settings with validation and normalization
  const updateSettings = useCallback(
    (newSettings) => {
      // Create a complete settings object with all properties
      const completeSettings = {
        ...defaultSettings, // Start with defaults to ensure all fields exist
        ...settings, // Add current settings
        ...newSettings, // Override with new settings
        // Ensure specific derived values are set
        textColor: newSettings.theme === "dark" ? "scifi-blue" : "default",
        speedMode: true, // Always ensure speed mode is on
      };

      setSettings(completeSettings);
    },
    [settings],
  );

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("uncrypt-settings", JSON.stringify(settings));
  }, [settings]);

  // Apply theme whenever settings change
  useEffect(() => {
    const className = "dark-theme";
    if (settings.theme === "dark") {
      document.documentElement.classList.add(className);
      document.body.classList.add(className);
      document.documentElement.setAttribute("data-theme", "dark");

      // Force mobile browser compatibility
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        document.documentElement.style.backgroundColor = "#222";
        document.body.style.backgroundColor = "#222";
        document.body.style.color = "#f8f9fa";
      }
    } else {
      document.documentElement.classList.remove(className);
      document.body.classList.remove(className);
      document.documentElement.setAttribute("data-theme", "light");

      // Force mobile browser compatibility
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        document.documentElement.style.backgroundColor = "#ffffff";
        document.body.style.backgroundColor = "#ffffff";
        document.body.style.color = "#212529";
      }
    }
  }, [settings.theme]);

  // Calculate maxMistakes from difficulty setting
  const maxMistakes = getMaxMistakes(settings.difficulty);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        maxMistakes,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use the settings context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
