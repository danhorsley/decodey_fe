// src/components/layout/MobileLayout.js - Updated with better scrolling support

import React from "react";
import useSettingsStore from "../../stores/settingsStore";
import useDeviceDetection from "../../hooks/useDeviceDetection";

/**
 * Enhanced mobile layout that properly handles orientation and allows scrolling
 * Detects and responds to landscape/portrait orientations
 */
const MobileLayout = ({ children }) => {
  // Get theme settings from store
  const settings = useSettingsStore((state) => state.settings);
  const { theme, textColor } = settings;

  // Get device information from our detection hook
  const { isMobile, isLandscape } = useDeviceDetection();

  // Assemble classes based on orientation and theme
  const mobileClasses = `
    mobile-mode 
    ${theme === "dark" ? "dark-theme" : ""} 
    text-${textColor || "default"}
    ${isLandscape ? "landscape-mode" : "portrait-mode"}
  `;

  // Add custom styling for scroll handling
  const mobileStyle = {
    // Allow scrolling
    overflow: "auto",
    WebkitOverflowScrolling: "touch",
    // Full height but allow growing
    minHeight: "100vh",
    height: "auto",
    // Ensure content is visible
    paddingBottom: "50px",
  };

  // Container style specifically for portrait mode
  const containerStyle = {
    // Allow container to scroll
    overflow: "auto",
    WebkitOverflowScrolling: "touch",
    // Make sure we can see all content
    minHeight: "100vh",
    height: "auto",
    // Some spacing at the bottom to prevent controls from being cut off
    paddingBottom: isLandscape ? "20px" : "50px",
  };

  // Render the mobile layout with appropriate classes and styles
  return (
    <div
      className={mobileClasses}
      data-theme={theme}
      data-orientation={isLandscape ? "landscape" : "portrait"}
      style={mobileStyle}
    >
      {/* Mobile container with orientation-aware class and scrolling enabled */}
      <div className="mobile-game-container" style={containerStyle}>
        {children}
      </div>
    </div>
  );
};

export default React.memo(MobileLayout);
