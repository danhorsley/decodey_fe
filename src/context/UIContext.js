// src/context/UIContext.js
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import useDeviceDetection from "../hooks/useDeviceDetection";

// Create context
const UIContext = createContext();

export const UIProvider = ({ children }) => {
  // Current view state (game, settings, etc.)
  const [currentView, setCurrentView] = useState("game");

  // Modal states
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Device detection
  const { isMobile, isLandscape, screenWidth, screenHeight, detectMobile } =
    useDeviceDetection();

  // Mobile mode state
  const [useMobileMode, setUseMobileMode] = useState(false);

  // Re-check device when window resizes
  useEffect(() => {
    const handleResize = () => {
      detectMobile();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [detectMobile]);

  // Navigation methods
  const showSettings = useCallback(() => {
    setCurrentView("settings");
    setIsSettingsOpen(true);
  }, []);

  const showGame = useCallback(() => {
    setCurrentView("game");
  }, []);

  const showLogin = useCallback(() => {
    setCurrentView("login");
    setIsLoginOpen(true);
  }, []);

  const showRegister = useCallback(() => {
    setCurrentView("register");
  }, []);

  // Modal methods
  const openAbout = useCallback(() => {
    setIsAboutOpen(true);
  }, []);

  const closeAbout = useCallback(() => {
    setIsAboutOpen(false);
  }, []);

  const openLogin = useCallback(() => {
    setIsLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setIsLoginOpen(false);
  }, []);

  const openSignup = useCallback(() => {
    setIsLoginOpen(false); // Close login when opening signup
    setIsSignupOpen(true);
  }, []);

  const closeSignup = useCallback(() => {
    setIsSignupOpen(false);
  }, []);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
    // Also go back to game view
    setCurrentView("game");
  }, []);

  // Update mobile mode based on settings and device detection
  const updateMobileMode = useCallback(
    (mobileModeSetting) => {
      if (mobileModeSetting === "always") {
        setUseMobileMode(true);
      } else if (mobileModeSetting === "never") {
        setUseMobileMode(false);
      } else {
        // Auto mode - use device detection
        setUseMobileMode(isMobile);
      }
    },
    [isMobile],
  );

  return (
    <UIContext.Provider
      value={{
        // View state
        currentView,
        showSettings,
        showGame,
        showLogin,
        showRegister,

        // Modal states and methods
        isAboutOpen,
        openAbout,
        closeAbout,
        isLoginOpen,
        openLogin,
        closeLogin,
        isSignupOpen,
        openSignup,
        closeSignup,
        isSettingsOpen,
        openSettings,
        closeSettings,

        // Device/mobile state
        isMobile,
        isLandscape,
        screenWidth,
        screenHeight,
        useMobileMode,
        updateMobileMode,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

// Custom hook to use the UI context
export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
};
