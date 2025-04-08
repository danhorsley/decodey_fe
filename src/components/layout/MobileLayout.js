import React, { useState, useEffect } from "react";
import useSettingsStore from "../../stores/settingsStore";
import useDeviceDetection from "../../hooks/useDeviceDetection";

/**
 * Enhanced mobile layout that properly handles orientation
 * Detects and responds to landscape/portrait orientations
 */
const MobileLayout = ({ children }) => {
  // Get theme settings from store
  const settings = useSettingsStore((state) => state.settings);
  const { theme, textColor } = settings;

  // Get device information from our detection hook
  const { isMobile, isLandscape } = useDeviceDetection();

  // State for first-time portrait mode notification
  const [showPortraitNotice, setShowPortraitNotice] = useState(false);

  // Check if this is the first time we're showing portrait mode
  useEffect(() => {
    // Only show the notice if we're in portrait mode and haven't shown it before
    if (!isLandscape && !localStorage.getItem("portrait-notice-shown")) {
      setShowPortraitNotice(true);
      // Mark as shown so we don't keep showing it
      localStorage.setItem("portrait-notice-shown", "true");

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowPortraitNotice(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isLandscape]);

  // Assemble classes based on orientation and theme
  const mobileClasses = `
    mobile-mode 
    ${theme === "dark" ? "dark-theme" : ""} 
    text-${textColor || "default"}
    ${isLandscape ? "landscape-mode" : "portrait-mode"}
  `;

  // Render the mobile layout with appropriate classes
  return (
    <div
      className={mobileClasses}
      data-theme={theme}
      data-orientation={isLandscape ? "landscape" : "portrait"}
    >
      {/* Orientation notice for portrait mode */}
      {showPortraitNotice && (
        <div className="orientation-notice">
          <div className="notice-content">
            <p>Rotate your device to landscape for a better experience</p>
            <button onClick={() => setShowPortraitNotice(false)}>Got it</button>
          </div>
        </div>
      )}

      {/* Mobile container with orientation-aware class */}
      <div className="mobile-game-container">{children}</div>
    </div>
  );
};

export default MobileLayout;
