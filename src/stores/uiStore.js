// src/stores/uiStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

const useUIStore = create(
  persist(
    (set, get) => ({
      // Current view state
      currentView: "game",

      // Modal states
      isAboutOpen: false,
      isLoginOpen: false,
      isSignupOpen: false,
      isSettingsOpen: false,
      isContinueGameOpen: false,
      activeGameStats: null,

      // Device state
      isMobile: false,
      isLandscape: true,
      screenWidth: typeof window !== "undefined" ? window.innerWidth : 0,
      screenHeight: typeof window !== "undefined" ? window.innerHeight : 0,

      // Mobile mode settings
      mobileModeSetting: "auto", // "auto", "always", or "never"
      useMobileMode: false,

      // Navigation actions
      showSettings: () => {
        set({
          currentView: "settings",
          isSettingsOpen: true,
        });
      },

      showGame: () => {
        set({ currentView: "game" });
      },

      showLogin: () => {
        set({
          currentView: "login",
          isLoginOpen: true,
          isSignupOpen: false, // Close signup if open
        });
      },

      showRegister: () => {
        set({
          currentView: "register",
          isSignupOpen: true,
          isLoginOpen: false, // Close login if open
        });
      },

      // Modal actions
      openAbout: () => set({ isAboutOpen: true }),
      closeAbout: () => set({ isAboutOpen: false }),

      openLogin: () =>
        set({
          isLoginOpen: true,
          isSignupOpen: false, // Close signup when opening login
        }),
      closeLogin: () => set({ isLoginOpen: false }),

      openSignup: () =>
        set({
          isSignupOpen: true,
          isLoginOpen: false, // Close login when opening signup
        }),
      closeSignup: () => set({ isSignupOpen: false }),

      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),

      openContinueGamePrompt: (gameStats) =>
        set({
          isContinueGameOpen: true,
          activeGameStats: gameStats,
        }),
      closeContinueGamePrompt: () =>
        set({
          isContinueGameOpen: false,
          activeGameStats: null,
        }),

      // Device detection update
      updateDeviceInfo: (deviceInfo) => {
        set({
          isMobile: deviceInfo.isMobile,
          isLandscape: deviceInfo.isLandscape,
          screenWidth: deviceInfo.screenWidth,
          screenHeight: deviceInfo.screenHeight,
        });

        // Also update mobile mode if it's set to "auto"
        const mobileMode = get().mobileModeSetting || "auto";
        if (mobileMode === "auto") {
          set({ useMobileMode: deviceInfo.isMobile });
        }
      },

      // Update mobile mode based on settings
      updateMobileMode: (mobileModeSetting) => {
        set({ mobileModeSetting });

        if (mobileModeSetting === "always") {
          set({ useMobileMode: true });
        } else if (mobileModeSetting === "never") {
          set({ useMobileMode: false });
        } else {
          // Auto mode - use device detection
          set({ useMobileMode: get().isMobile });
        }
      },
    }),
    {
      name: "uncrypt-ui-state",
      partialize: (state) => ({
        // Only persist these UI properties
        currentView: state.currentView,
        mobileModeSetting: state.mobileModeSetting,
      }),
    },
  ),
);

export default useUIStore;
