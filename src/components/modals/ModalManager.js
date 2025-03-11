// src/components/modals/ModalManager.js
import React, { useState, useCallback } from "react";
import About from "./About";
import Settings from "./Settings";
import Login from "../../pages/Login";
import Signup from "../../pages/Signup";

// Create a modal context
export const ModalContext = React.createContext({
  openAbout: () => {},
  closeAbout: () => {},
  openLogin: () => {},
  closeLogin: () => {},
  openSignup: () => {},
  closeSignup: () => {},
  openSettings: () => {},
  closeSettings: () => {},
});

// Export hook to use modal context
export const useModalContext = () => React.useContext(ModalContext);

// Modal manager component
const ModalManager = ({ children, settings, updateSettings }) => {
  // Modal states
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Modal functions
  const openAbout = useCallback(() => {
    console.log("ModalManager: openAbout called");
    setIsAboutOpen(true);
  }, []);

  const closeAbout = useCallback(() => {
    console.log("ModalManager: closeAbout called");
    setIsAboutOpen(false);
  }, []);

  const openLogin = useCallback(() => {
    console.log("ModalManager: openLogin called");
    setIsLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    console.log("ModalManager: closeLogin called");
    setIsLoginOpen(false);
  }, []);

  const openSignup = useCallback(() => {
    console.log("ModalManager: openSignup called");
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  }, []);

  const closeSignup = useCallback(() => {
    console.log("ModalManager: closeSignup called");
    setIsSignupOpen(false);
  }, []);

  const openSettings = useCallback(() => {
    console.log("ModalManager: openSettings called");
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    console.log("ModalManager: closeSettings called");
    setIsSettingsOpen(false);
  }, []);

  // Context value
  const contextValue = {
    openAbout,
    closeAbout,
    openLogin,
    closeLogin,
    openSignup,
    closeSignup,
    openSettings,
    closeSettings,

    // Also add these aliases to support both naming conventions
    showAbout: openAbout,
    showLogin: openLogin,
    showSignup: openSignup,
    showSettings: openSettings,
  };

  console.log("ModalManager state:", {
    isAboutOpen,
    isLoginOpen,
    isSignupOpen,
    isSettingsOpen,
  });

  return (
    <ModalContext.Provider value={contextValue}>
      {/* Render modals */}
      {isAboutOpen && <About isOpen={true} onClose={closeAbout} />}

      {isLoginOpen && <Login onClose={closeLogin} />}

      {isSignupOpen && <Signup onClose={closeSignup} />}

      {isSettingsOpen && (
        <Settings
          currentSettings={settings}
          onSave={(newSettings) => {
            updateSettings(newSettings);
            closeSettings();
          }}
          onCancel={closeSettings}
        />
      )}

      {/* Render children */}
      {children}
    </ModalContext.Provider>
  );
};

export default ModalManager;
