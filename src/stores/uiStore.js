// src/stores/uiStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Add a flag to force mobile mode during development
// You can turn this on/off in the browser console with:
// localStorage.setItem('force_mobile_debug', 'true')
const DEBUG_FORCE_MOBILE =
  localStorage.getItem("force_mobile_debug") === "true";

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

  // Log detection factors
  console.log("[Mobile Detection]", {
    userAgent: userAgent.substring(0, 50) + "...",
    isMobileUserAgent,
    screenSize: { width: window.innerWidth, height: window.innerHeight },
    isMobileScreenSize,
    isTouchDevice,
    hasMobileParam,
    DEBUG_FORCE_MOBILE,
  });

  // Return true if ANY detection method indicates mobile
  return (
    isMobileUserAgent ||
    isMobileScreenSize ||
    isTouchDevice ||
    hasMobileParam ||
    DEBUG_FORCE_MOBILE
  );
};

// Create the UI store
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

      // Enhanced device detection update
      updateDeviceInfo: (deviceInfo) => {
        const isActuallyMobile =
          typeof deviceInfo.isMobile === "boolean"
            ? deviceInfo.isMobile
            : detectMobileDevice();

        // Get accurate orientation info
        const newIsLandscape = 
          typeof deviceInfo.isLandscape === "boolean"
            ? deviceInfo.isLandscape
            : (deviceInfo.screenWidth > deviceInfo.screenHeight);

        console.log(
          `[uiStore] updateDeviceInfo: Detected ${isActuallyMobile ? "MOBILE" : "DESKTOP"} device, orientation: ${newIsLandscape ? "landscape" : "portrait"}`,
        );

        // Update device info
        set({
          isMobile: isActuallyMobile,
          isLandscape: newIsLandscape,
          screenWidth: deviceInfo.screenWidth || window.innerWidth,
          screenHeight: deviceInfo.screenHeight || window.innerHeight,
        });

        // Also update mobile mode if it's set to "auto"
        const mobileMode = get().mobileModeSetting;
        console.log(`[uiStore] Current mobile setting: ${mobileMode}`);

        if (mobileMode === "auto") {
          console.log(
            `[uiStore] Auto mode: setting useMobileMode to ${isActuallyMobile}`,
          );
          set({ useMobileMode: isActuallyMobile });
        }

        // Dispatch a custom event that components can listen for
        // This helps with orientation-aware components that need to update
        try {
          const orientationEvent = new CustomEvent('app:orientationchange', { 
            detail: { 
              isLandscape: newIsLandscape,
              isMobile: isActuallyMobile
            }
          });
          window.dispatchEvent(orientationEvent);
        } catch (e) {
          console.warn('[uiStore] Could not dispatch orientation event:', e);
        }
      },

      // Update mobile mode based on settings
      updateMobileMode: (mobileModeSetting) => {
        console.log(
          `[uiStore] Updating mobile mode setting to: ${mobileModeSetting}`,
        );

        // First update the setting value
        set({ mobileModeSetting });

        // Log it for verification
        const updatedMode = get().mobileModeSetting;
        console.log(
          `[uiStore] Verified: mobile mode setting is now: ${updatedMode}`,
        );

        // Then apply the appropriate useMobileMode based on the setting
        if (mobileModeSetting === "always") {
          console.log("[uiStore] Setting useMobileMode to true (always)");
          set({ useMobileMode: true });
        } else if (mobileModeSetting === "never") {
          console.log("[uiStore] Setting useMobileMode to false (never)");
          set({ useMobileMode: false });
        } else {
          // Auto mode - use device detection
          const isMobile = get().isMobile || detectMobileDevice();
          console.log(
            `[uiStore] Auto mode: setting useMobileMode to ${isMobile}`,
          );
          set({ useMobileMode: isMobile });
        }

        // Verify the final state
        setTimeout(() => {
          const state = get();
          console.log(
            `[uiStore] After update: mobileModeSetting=${state.mobileModeSetting}, useMobileMode=${state.useMobileMode}`,
          );
        }, 0);
      },

      // Initialize mobile mode on app start
      initMobileMode: () => {
        const state = get();
        console.log(
          `[uiStore] Initializing with mobileModeSetting: ${state.mobileModeSetting}`,
        );

        // Force mobile detection again to be sure
        const isMobile = detectMobileDevice();
        console.log(`[uiStore] Fresh mobile detection: ${isMobile}`);

        // Update isMobile state with the fresh detection
        set({ isMobile });

        // Apply the mobile mode setting
        if (state.mobileModeSetting === "always" || DEBUG_FORCE_MOBILE) {
          console.log(
            "[uiStore] Init: Setting useMobileMode to true (always or debug)",
          );
          set({ useMobileMode: true });
        } else if (state.mobileModeSetting === "never") {
          console.log("[uiStore] Init: Setting useMobileMode to false (never)");
          set({ useMobileMode: false });
        } else {
          // For auto mode, use the fresh detection
          console.log(
            `[uiStore] Init: Auto mode, using fresh detection: ${isMobile}`,
          );
          set({ useMobileMode: isMobile });
        }
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
          console.log("[uiStore] Store rehydrated with settings:", {
            mobileModeSetting: state.mobileModeSetting,
            useMobileMode: state.useMobileMode,
          });

          // Call initMobileMode in the next tick to ensure state is fully available
          setTimeout(() => {
            state.initMobileMode();
          }, 10);
        }
      },
    },
  ),
);

// Initialization - run at startup
setTimeout(() => {
  const state = useUIStore.getState();
  console.log(
    `[uiStore] Startup check - mobileModeSetting: ${state.mobileModeSetting}, useMobileMode: ${state.useMobileMode}`,
  );

  // Always initialize to ensure proper mobile detection
  state.initMobileMode();

  // Re-check after a short delay to make sure settings took effect
  setTimeout(() => {
    const updatedState = useUIStore.getState();
    console.log(
      `[uiStore] After init - mobileModeSetting: ${updatedState.mobileModeSetting}, useMobileMode: ${updatedState.useMobileMode}`,
    );
  }, 50);
}, 100);

export default useUIStore;
