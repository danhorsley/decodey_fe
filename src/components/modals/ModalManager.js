// src/components/modals/ModalManager.js
import React, { useState, useCallback, useContext } from "react";
import About from "./About";
import Settings from "./Settings";
import Login from "../../pages/Login";
import Signup from "../../pages/Signup";

// Create a modal context
const ModalContext = React.createContext({
  openAbout: () => {},
  closeAbout: () => {},
  openLogin: () => {},
  closeLogin: () => {},
  openSignup: () => {},
  closeSignup: () => {},
  openSettings: () => {},
  closeSettings: () => {},
  isAboutOpen: false,
  isLoginOpen: false,
  isSignupOpen: false,
  isSettingsOpen: false,
});

// Export hook to use modal context
export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    console.warn("useModalContext must be used within a ModalProvider!");
    // Return a default object to prevent app crashes
    return {
      openAbout: () => console.warn("Modal context not available"),
      closeAbout: () => console.warn("Modal context not available"),
      openLogin: () => console.warn("Modal context not available"),
      closeLogin: () => console.warn("Modal context not available"),
      openSignup: () => console.warn("Modal context not available"),
      closeSignup: () => console.warn("Modal context not available"),
      openSettings: () => console.warn("Modal context not available"),
      closeSettings: () => console.warn("Modal context not available"),
      isAboutOpen: false,
      isLoginOpen: false,
      isSignupOpen: false,
      isSettingsOpen: false,
    };
  }
  return context;
};

// Modal manager component
const ModalManager = ({ children }) => {
  // Modal states
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Modal functions
  const openAbout = useCallback(() => {
    setIsAboutOpen(true);
  }, []);

  const closeAbout = useCallback(() => {
    setIsAboutOpen(false);
  }, []);

  const openLogin = useCallback(() => {
    setIsSignupOpen(false); // Close signup if open
    setIsLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setIsLoginOpen(false);
  }, []);

  const openSignup = useCallback(() => {
    setIsLoginOpen(false); // Close login if open
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
  }, []);

  // Context value - include state flags for checking in components
  const contextValue = {
    // Functions
    openAbout,
    closeAbout,
    openLogin,
    closeLogin,
    openSignup,
    closeSignup,
    openSettings,
    closeSettings,

    // State flags
    isAboutOpen,
    isLoginOpen,
    isSignupOpen,
    isSettingsOpen,

    // Also add these aliases to support both naming conventions
    showAbout: openAbout,
    showLogin: openLogin,
    showSignup: openSignup,
    showSettings: openSettings,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {/* Only render each modal when its state is true */}
      {isAboutOpen && <About isOpen={true} onClose={closeAbout} />}
      {isLoginOpen && <Login onClose={closeLogin} />}
      {isSignupOpen && <Signup onClose={closeSignup} />}
      {isSettingsOpen && <Settings onCancel={closeSettings} />}

      {/* Render children */}
      {children}
    </ModalContext.Provider>
  );
};

export default ModalManager;
