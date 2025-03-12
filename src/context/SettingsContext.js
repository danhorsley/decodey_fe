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
      console.log("Loading settings from localStorage:", savedSettings);

      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        console.log("Parsed settings:", parsedSettings);

        // Make sure we have all required properties by merging with defaults
        const completeSettings = {
          ...defaultSettings,
          ...parsedSettings,
        };

        console.log(
          "Complete settings after merging with defaults:",
          completeSettings,
        );
        return completeSettings;
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
      console.log("SettingsContext updateSettings called with:", newSettings);

      // Create a complete settings object with all properties
      // First spread the current settings to keep any values not in newSettings
      // Then spread newSettings to override those values
      const completeSettings = {
        ...defaultSettings, // Start with defaults to ensure all fields exist
        ...settings, // Add current settings
        ...newSettings, // Override with new settings
        // Ensure specific derived values are set
        textColor: newSettings.theme === "dark" ? "scifi-blue" : "default",
        speedMode: true, // Always ensure speed mode is on
      };

      console.log("Updating settings with complete object:", completeSettings);
      setSettings(completeSettings);
    },
    [settings],
  );

  // Save settings to localStorage whenever they change
  useEffect(() => {
    console.log("Saving settings to localStorage:", settings);
    localStorage.setItem("uncrypt-settings", JSON.stringify(settings));

    // Debug: immediately read back to verify
    const savedSettings = localStorage.getItem("uncrypt-settings");
    console.log(
      "Verification - settings saved to localStorage:",
      savedSettings,
    );

    try {
      const parsed = JSON.parse(savedSettings);
      console.log("Verification - parsed settings:", parsed);
    } catch (e) {
      console.error("Error parsing saved settings:", e);
    }
  }, [settings]);

  // Apply theme whenever settings change
  useEffect(() => {
    try {
      // Use a forced timeout to ensure theme is applied on all browsers
      setTimeout(() => {
        if (settings.theme === "dark") {
          document.documentElement.classList.add("dark-theme");
          document.body.classList.add("dark-theme");
          document.documentElement.setAttribute("data-theme", "dark");

          // Force mobile browser compatibility
          if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            document.documentElement.style.backgroundColor = "#222";
            document.body.style.backgroundColor = "#222";
            document.body.style.color = "#f8f9fa";
          }
        } else {
          document.documentElement.classList.remove("dark-theme");
          document.body.classList.remove("dark-theme");
          document.documentElement.setAttribute("data-theme", "light");

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
