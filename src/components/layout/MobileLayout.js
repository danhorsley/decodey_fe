import React from "react";
import useSettingsStore from "../../stores/settingsStore";

/**
 * A dramatically simplified wrapper component for mobile layout
 * No orientation detection, no component restructuring, no warnings
 */
const MobileLayout = ({ children }) => {
  // Get theme settings from store
  const settings = useSettingsStore((state) => state.settings);
  const { theme, textColor } = settings;

  console.log("MobileLayout rendered with theme:", theme); // Debug log

  // Apply simple mobile-specific classes
  const mobileClasses = `mobile-mode ${theme === "dark" ? "dark-theme" : ""} text-${textColor || "default"}`;

  return (
    <div className={mobileClasses} data-theme={theme}>
      {/* Simplified mobile container with no restructuring */}
      <div className="mobile-game-container">
        {/* Direct rendering of children with no manipulation */}
        {children}
      </div>
    </div>
  );
};

export default MobileLayout;
