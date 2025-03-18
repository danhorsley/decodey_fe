// src/stores/settingsStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

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

// Map for max mistakes based on difficulty
const MAX_MISTAKES_MAP = {
  easy: 8,
  normal: 5,
  hard: 3,
};

const useSettingsStore = create(
  persist(
    (set, get) => ({
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

          // Validate difficulty
          let validatedDifficulty = newSettings.difficulty;
          if (
            validatedDifficulty &&
            !["easy", "normal", "hard"].includes(validatedDifficulty)
          ) {
            console.warn(
              `Invalid difficulty value: ${validatedDifficulty}, defaulting to easy`,
            );
            validatedDifficulty = "easy";
          }

          // Create complete settings object
          const completeSettings = {
            ...defaultSettings,
            ...state.settings,
            ...newSettings,
            difficulty:
              validatedDifficulty ||
              newSettings.difficulty ||
              state.settings.difficulty,
            speedMode: true, // Always ensure speed mode is on
          };

          // Handle theme-based text color adjustment
          if (
            newSettings.theme === "dark" &&
            completeSettings.textColor === "default"
          ) {
            completeSettings.textColor = "scifi-blue";
          }

          return { settings: completeSettings };
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
    }),
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
