// src/components/modals/Settings.js
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "../../Styles/Settings.css";
import "../../Styles/About.css";
import { useSettings } from "../../context/SettingsContext"; // Direct import of settings context

function Settings({ onCancel }) {
  // Get settings directly from the context
  const { settings: currentSettings, updateSettings } = useSettings();

  // Local state to track changes before saving
  const [settings, setSettings] = useState(currentSettings || {});

  // Add debugging to see what's happening
  console.log(
    "Settings component rendered with currentSettings:",
    currentSettings,
  );
  console.log("Local settings state:", settings);

  useEffect(() => {
    // Update local state when context settings change
    console.log(
      "Settings useEffect: currentSettings changed:",
      currentSettings,
    );
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const handleChange = (setting, value) => {
    console.log(`Setting ${setting} changing to:`, value);

    // For theme changes, also update textColor accordingly
    if (setting === "theme") {
      setSettings((prev) => {
        const newSettings = {
          ...prev,
          [setting]: value,
          // Auto-set textColor based on theme
          textColor: value === "dark" ? "scifi-blue" : "default",
        };
        console.log("New settings after theme change:", newSettings);
        return newSettings;
      });
    } else {
      setSettings((prev) => {
        const newSettings = {
          ...prev,
          [setting]: value,
        };
        console.log("New settings after change:", newSettings);
        return newSettings;
      });
    }
  };

  const handleSave = () => {
    console.log("Saving settings directly to context:", settings);
    // Make a complete copy of the settings to ensure all properties are included
    const settingsToSave = { ...settings };
    updateSettings(settingsToSave);
    if (onCancel) onCancel();
  };

  if (!currentSettings) {
    console.log("No current settings available, returning null");
    return null;
  }

  // Create portal to render the modal at the root level of the DOM
  return ReactDOM.createPortal(
    <div className="about-overlay">
      <div
        className={`about-container settings-container ${currentSettings.theme === "dark" ? "dark-theme" : ""} text-${currentSettings.textColor}`}
      >
        <div className="settings-content">
          <div className="settings-actions top">
            <button className="settings-button cancel" onClick={onCancel}>
              Cancel
            </button>
            <button className="settings-button save" onClick={handleSave}>
              Save Changes
            </button>
          </div>
          <h1 className="settings-title">Game Settings</h1>

          {/* Theme Setting - Now at the top */}
          <div className="settings-section">
            <h2>Theme</h2>
            <div className="settings-options">
              <label className="settings-option">
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === "light"}
                  onChange={() => handleChange("theme", "light")}
                />
                <span className="option-label">
                  Light Mode (Default Colors)
                </span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === "dark"}
                  onChange={() => handleChange("theme", "dark")}
                />
                <span className="option-label">Dark Mode (Sci-Fi Blue)</span>
              </label>
            </div>
          </div>

          {/* Difficulty Setting - Now second */}
          <div className="settings-section">
            <h2>Difficulty</h2>
            <div className="settings-options">
              <label className="settings-option">
                <input
                  type="radio"
                  name="difficulty"
                  checked={settings.difficulty === "easy"}
                  onChange={() => handleChange("difficulty", "easy")}
                />
                <span className="option-label">Easy (8 mistakes)</span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="difficulty"
                  checked={settings.difficulty === "normal"}
                  onChange={() => handleChange("difficulty", "normal")}
                />
                <span className="option-label">Normal (5 mistakes)</span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="difficulty"
                  checked={settings.difficulty === "hard"}
                  onChange={() => handleChange("difficulty", "hard")}
                />
                <span className="option-label">Hard (3 mistakes)</span>
              </label>
            </div>
          </div>

          {/* Hardcore Mode Setting */}
          <div className="settings-section">
            <h2>Gameplay Mode</h2>
            <div className="settings-options">
              <label className="settings-option">
                <input
                  type="checkbox"
                  checked={settings.hardcoreMode}
                  onChange={() =>
                    handleChange("hardcoreMode", !settings.hardcoreMode)
                  }
                />
                <span className="option-label">Hardcore Mode</span>
              </label>
              <p className="settings-description">
                When enabled, spaces and punctuation will be removed from the
                encrypted text, making it more challenging to decrypt.
              </p>
            </div>
          </div>

          {/* Grid Sorting Setting */}
          <div className="settings-section">
            <h2>Encrypted Grid Sorting</h2>
            <div className="settings-options">
              <label className="settings-option">
                <input
                  type="radio"
                  name="gridSorting"
                  checked={settings.gridSorting === "default"}
                  onChange={() => handleChange("gridSorting", "default")}
                />
                <span className="option-label">
                  Default Order (as they appear in text)
                </span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="gridSorting"
                  checked={settings.gridSorting === "alphabetical"}
                  onChange={() => handleChange("gridSorting", "alphabetical")}
                />
                <span className="option-label">Alphabetical Order</span>
              </label>
            </div>
          </div>

          {/* Mobile Mode Setting */}
          <div className="settings-section">
            <h2>Mobile Mode</h2>
            <div className="settings-options">
              <label className="settings-option">
                <input
                  type="radio"
                  name="mobileMode"
                  checked={settings.mobileMode === "auto"}
                  onChange={() => handleChange("mobileMode", "auto")}
                />
                <span className="option-label">Auto Detect</span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="mobileMode"
                  checked={settings.mobileMode === "always"}
                  onChange={() => handleChange("mobileMode", "always")}
                />
                <span className="option-label">Always Use Mobile Layout</span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="mobileMode"
                  checked={settings.mobileMode === "never"}
                  onChange={() => handleChange("mobileMode", "never")}
                />
                <span className="option-label">Never Use Mobile Layout</span>
              </label>
              <p className="settings-description">
                Mobile mode provides a thumb-friendly interface with grids
                positioned at the sides of the screen. Best experienced in
                landscape orientation.
              </p>
            </div>
          </div>

          {/* Long Quotes Setting */}
          <div className="settings-section">
            <h2>Quote Length</h2>
            <div className="settings-options">
              <label className="settings-option">
                <input
                  type="checkbox"
                  checked={settings.longText}
                  onChange={() => handleChange("longText", !settings.longText)}
                />
                <span className="option-label">
                  Use Longer Quotes - over 65 characters
                </span>
              </label>
              <p className="settings-description warning-text">
                <strong>Warning:</strong> Longer quotes may not display well on
                smaller screens or in mobile view. Best used on desktop or
                larger tablet displays.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="settings-actions">
            <button className="settings-button cancel" onClick={onCancel}>
              Cancel
            </button>
            <button className="settings-button save" onClick={handleSave}>
              Save & Return to Game
            </button>
          </div>

          {/* Add debug display of current settings */}
          <div
            style={{
              marginTop: "20px",
              borderTop: "1px solid #ccc",
              paddingTop: "10px",
              fontSize: "10px",
              color: "#999",
            }}
          >
            <p>Debug - Current Settings:</p>
            <pre>{JSON.stringify(settings, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById("root"), // Mount directly to root element
  );
}

export default Settings;
