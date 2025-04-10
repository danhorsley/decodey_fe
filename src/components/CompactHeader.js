import React, { useState, useEffect } from "react";
import "../Styles/CompactHeader.css";
import useAuthStore from "../stores/authStore";

/**
 * CompactHeader - A streamlined header with hamburger menu and login status indicator
 */
const CompactHeader = ({ 
  title, 
  toggleMenu, 
  isDailyChallenge = false,
  hardcoreMode = false 
}) => {
  // Get authentication state
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // State to track "just logged in" for animation
  const [showLoginAnimation, setShowLoginAnimation] = useState(false);

  // Detect changes in auth state to trigger animation
  useEffect(() => {
    if (isAuthenticated) {
      setShowLoginAnimation(true);
      const timer = setTimeout(() => {
        setShowLoginAnimation(false);
      }, 1500); // Animation duration

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  return (
    <div className="compact-header">
      {/* Hamburger menu button with status indicator */}
      <button
        className="menu-toggle"
        onClick={toggleMenu}
        aria-label="Open menu"
        title={isAuthenticated ? "Menu (Logged in - scores will be recorded)" : "Menu (Not logged in - playing anonymously)"}
      >
        <div className="hamburger">
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>

          {/* Login status indicator */}
          <span 
            className={`status-indicator ${isAuthenticated ? 'logged-in' : 'logged-out'} ${showLoginAnimation ? 'just-logged-in' : ''}`}
            aria-hidden="true"
          ></span>
        </div>
      </button>

      {/* Game title */}
      <h1 className="retro-title">{title}</h1>

      {/* Mode badges */}
      {isDailyChallenge && (
        <div className="badge-indicator daily-badge">DAILY</div>
      )}

      {hardcoreMode && !isDailyChallenge && (
        <div className="badge-indicator hardcore-badge">HARDCORE</div>
      )}
    </div>
  );
};

export default CompactHeader;