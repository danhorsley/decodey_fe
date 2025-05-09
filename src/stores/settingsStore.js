// src/stores/settingsStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer"; // Import immer middleware

const defaultSettings = {
  theme: "light",
  difficulty: "medium", // Using "medium" to match backend terminology
  longText: false,
  speedMode: true, // Always on - cannot be changed
  gridSorting: "default",
  hardcoreMode: false,
  mobileMode: "auto",
  textColor: "default",
  soundEnabled: true,
  vibrationEnabled: true,
  backdoorMode: false,
};

// Map for max mistakes based on difficulty
const MAX_MISTAKES_MAP = {
  easy: 8,
  medium: 5, // Changed from normal to medium
  hard: 3,
};

// Combine persist and immer middleware
const useSettingsStore = create(
  persist(
    immer((set, get) => ({
      // State
      settings: { ...defaultSettings },

      // Computed value function
      getMaxMistakes: () => {
        const { difficulty } = get().settings;
        return MAX_MISTAKES_MAP[difficulty] || 5;
      },

      // Actions
      updateSettings: (newSettings) => {
        set((state) => {
          console.log("Updating settings with:", newSettings);

          // Get current difficulty for comparison
          const currentDifficulty =
            state.settings?.difficulty || defaultSettings.difficulty;

          // With Immer, we can directly modify settings
          // First apply default settings for missing values
          Object.keys(defaultSettings).forEach((key) => {
            if (state.settings[key] === undefined) {
              state.settings[key] = defaultSettings[key];
            }
          });

          // Then apply new settings
          Object.keys(newSettings).forEach((key) => {
            // Special handling for difficulty
            if (key === "difficulty") {
              if (
                newSettings.difficulty &&
                ["easy", "medium", "hard"].includes(newSettings.difficulty)
              ) {
                state.settings.difficulty = newSettings.difficulty;
              }
              // If invalid, keep existing value
            }
            // Handle all other settings
            else {
              state.settings[key] = newSettings[key];
            }
          });

          // Always ensure speedMode is on
          state.settings.speedMode = true;

          // Handle theme-based text color adjustment
          if (
            newSettings.theme === "dark" &&
            state.settings.textColor === "default"
          ) {
            state.settings.textColor = "scifi-blue";
          }

          // If difficulty changed, log it
          if (state.settings.difficulty !== currentDifficulty) {
            console.log(
              `Settings difficulty changed from ${currentDifficulty} to ${state.settings.difficulty}`,
            );
          }
        });

        // Apply theme changes
        get().applyTheme();
      },

      // Apply theme to DOM
      applyTheme: () => {
        try {
          setTimeout(() => {
            const { theme } = get().settings;

            if (theme === "dark") {
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
      },
    })),
    {
      name: "uncrypt-settings", // Name for localStorage key
      getStorage: () => localStorage, // Use localStorage for persistence
    },
  ),
);

// Apply theme when the store is first loaded
// This ensures the theme is applied on page load
setTimeout(() => {
  useSettingsStore.getState().applyTheme();
}, 0);

export default useSettingsStore;

// Helper function export for getMaxMistakes for backward compatibility
export const getMaxMistakes = (difficulty) => {
  return MAX_MISTAKES_MAP[difficulty] || 5;
};
