// src/stores/uiStore.js - Optimized for performance
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Development mode flag to control logging
const isDev = process.env.NODE_ENV !== 'production';

// Add a flag to force mobile mode during development - only evaluate once
const DEBUG_FORCE_MOBILE = localStorage.getItem("force_mobile_debug") === "true";

// Track event throttling
let lastOrientationEventTime = 0;
const EVENT_THROTTLE_MS = 200; // Minimum time between orientation events

// Improved mobile detection that works with emulators
const detectMobileDevice = () => {
  // Check for mobile user agent
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
  const isMobileUserAgent = mobileRegex.test(userAgent);

  // Check for small screen size
  const isMobileScreenSize = window.innerWidth < 768;

  // Check for touch support
  const isTouchDevice =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // Check for mobile emulator parameters
  const urlParams = new URLSearchParams(window.location.search);
  const hasMobileParam = urlParams.get("mobile") === "true";

  // Only log in development
  if (isDev) {
    console.log("[Mobile Detection]", {
      screenSize: { width: window.innerWidth, height: window.innerHeight },
      isMobileUserAgent,
      isMobileScreenSize,
      isTouchDevice,
      hasMobileParam,
      DEBUG_FORCE_MOBILE,
    });
  }

  // Return true if ANY detection method indicates mobile
  return (
    isMobileUserAgent ||
    isMobileScreenSize ||
    isTouchDevice ||
    hasMobileParam ||
    DEBUG_FORCE_MOBILE
  );
};

// Create the UI store with optimized state management
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

      // Device state - initialize with actual detection at creation time
      isMobile: typeof window !== "undefined" ? detectMobileDevice() : false,
      isLandscape:
        typeof window !== "undefined"
          ? window.innerWidth > window.innerHeight
          : true,
      screenWidth: typeof window !== "undefined" ? window.innerWidth : 0,
      screenHeight: typeof window !== "undefined" ? window.innerHeight : 0,

      // Mobile mode settings - initialize with detection result if debug mode is on
      mobileModeSetting: DEBUG_FORCE_MOBILE ? "always" : "auto",
      useMobileMode: DEBUG_FORCE_MOBILE ? true : false,

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

      // Modal actions - consolidated to reduce repetitive code
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

      // Enhanced device detection update - optimized with debouncing
      updateDeviceInfo: (() => {
        // Use closure for debounce state
        let debounceTimeout = null;

        return (deviceInfo) => {
          // Clear any pending debounce
          if (debounceTimeout) clearTimeout(debounceTimeout);

          // Set debounce for device updates (100ms feels responsive but prevents excessive updates)
          debounceTimeout = setTimeout(() => {
            const isActuallyMobile =
              typeof deviceInfo.isMobile === "boolean"
                ? deviceInfo.isMobile
                : detectMobileDevice();

            // Get accurate orientation info
            const newIsLandscape = 
              typeof deviceInfo.isLandscape === "boolean"
                ? deviceInfo.isLandscape
                : (deviceInfo.screenWidth > deviceInfo.screenHeight);

            // More concise logging in development only
            if (isDev) {
              console.log(
                `[uiStore] Updating device: ${isActuallyMobile ? "mobile" : "desktop"}, ${newIsLandscape ? "landscape" : "portrait"}`
              );
            }

            // Get current state for comparison
            const currentState = get();
            const stateChanged = 
              currentState.isMobile !== isActuallyMobile || 
              currentState.isLandscape !== newIsLandscape ||
              currentState.screenWidth !== (deviceInfo.screenWidth || window.innerWidth) ||
              currentState.screenHeight !== (deviceInfo.screenHeight || window.innerHeight);

            // Only update if state actually changed
            if (stateChanged) {
              // Consolidated state update - single set call with all changes
              const updates = {
                isMobile: isActuallyMobile,
                isLandscape: newIsLandscape,
                screenWidth: deviceInfo.screenWidth || window.innerWidth,
                screenHeight: deviceInfo.screenHeight || window.innerHeight,
              };

              // If we're on auto mode, update useMobileMode too
              if (currentState.mobileModeSetting === "auto") {
                updates.useMobileMode = isActuallyMobile;
              }

              // Update state in a single operation
              set(updates);

              // Throttled event dispatch - only if it's been long enough since last event
              const now = Date.now();
              if (now - lastOrientationEventTime > EVENT_THROTTLE_MS) {
                lastOrientationEventTime = now;

                try {
                  const orientationEvent = new CustomEvent('app:orientationchange', { 
                    detail: { 
                      isLandscape: newIsLandscape,
                      isMobile: isActuallyMobile
                    }
                  });
                  window.dispatchEvent(orientationEvent);
                } catch (e) {
                  if (isDev) {
                    console.warn('[uiStore] Could not dispatch orientation event:', e);
                  }
                }
              }
            }
          }, 100); // 100ms debounce is responsive yet reduces redundant updates
        };
      })(),

      // Update mobile mode based on settings - optimized version
      updateMobileMode: (mobileModeSetting) => {
        if (isDev) {
          console.log(`[uiStore] Updating mobile mode setting to: ${mobileModeSetting}`);
        }

        // Get current state
        const currentState = get();
        const isMobile = currentState.isMobile || detectMobileDevice();

        // Determine the appropriate mobile mode value
        const useMobileMode = 
          mobileModeSetting === "always" ? true :
          mobileModeSetting === "never" ? false :
          isMobile;

        // Consolidated state update with a single set call
        set({ 
          mobileModeSetting, 
          useMobileMode 
        });
      },

      // Initialize mobile mode on app start - optimized
      initMobileMode: () => {
        const state = get();

        // Force mobile detection again to be sure
        const isMobile = detectMobileDevice();

        // Determine appropriate useMobileMode value based on settings and detection
        const useMobileMode = 
          state.mobileModeSetting === "always" || DEBUG_FORCE_MOBILE ? true :
          state.mobileModeSetting === "never" ? false :
          isMobile;

        // Simplified log for development
        if (isDev) {
          console.log(
            `[uiStore] Initializing mobile: setting=${state.mobileModeSetting}, detected=${isMobile}, using=${useMobileMode}`
          );
        }

        // Consolidated update with a single set call
        set({ 
          isMobile, 
          useMobileMode
        });
      },
    }),
    {
      name: "uncrypt-ui-state",
      partialize: (state) => ({
        // IMPORTANT: Persist both currentView AND mobileModeSetting
        currentView: state.currentView,
        mobileModeSetting: state.mobileModeSetting,
      }),
      // Add onRehydrate callback to initialize mobile mode after store is rehydrated
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Call initMobileMode in the next tick to ensure state is fully available
          setTimeout(() => {
            state.initMobileMode();
          }, 10);
        }
      },
    },
  ),
);

// Initialization - run at startup with reduced timeout sequencing
setTimeout(() => {
  useUIStore.getState().initMobileMode();
}, 100);

export default useUIStore;