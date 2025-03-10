import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "../../Styles/Settings.css";
import "../../Styles/About.css";
import { useAppContext } from "../../context/AppContext";

import React, { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";

function Settings({ onSave, onCancel }) {
  const { settings, isSettingsOpen } = useAppContext();

  // Local state to track changes before saving
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    // Update local state when props change
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (setting, value) => {
    // For theme changes, also update textColor accordingly
    if (setting === "theme") {
      setLocalSettings((prev) => ({
        ...prev,
        [setting]: value,
        // Auto-set textColor based on theme
        textColor: value === "dark" ? "dark" : "default",
      }));
    } else {
      setLocalSettings((prev) => ({
        ...prev,
        [setting]: value,
      }));
    }
  };

  if (!isSettingsOpen) return null;

  return (
    <div className="about-overlay">
      <div className={`about-container settings-container ${settings.theme === "dark" ? "dark-theme" : ""} text-${settings.textColor}`}>
        <button className="about-close" onClick={onCancel}>
          &times;
        </button>
        <div className="settings-content">
          <h1 className="settings-title">Game Settings</h1>

          <div className="settings-section">
            <h2>Appearance</h2>
            <div className="settings-field">
              <label>Theme</label>
              <div className="settings-options">
                <button
                  className={`option-button ${localSettings.theme === "light" ? "selected" : ""}`}
                  onClick={() => handleChange("theme", "light")}
                >
                  Light
                </button>
                <button
                  className={`option-button ${localSettings.theme === "dark" ? "selected" : ""}`}
                  onClick={() => handleChange("theme", "dark")}
                >
                  Dark
                </button>
              </div>
            </div>

            <div className="settings-field">
              <label>Text Color</label>
              <div className="settings-options">
                <button
                  className={`option-button ${localSettings.textColor === "default" ? "selected" : ""}`}
                  onClick={() => handleChange("textColor", "default")}
                >
                  Default
                </button>
                <button
                  className={`option-button ${localSettings.textColor === "dark" ? "selected" : ""}`}
                  onClick={() => handleChange("textColor", "dark")}
                >
                  Dark
                </button>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2>Gameplay</h2>
            <div className="settings-field">
              <label>Difficulty</label>
              <div className="settings-options difficulty-options">
                <button
                  className={`option-button ${localSettings.difficulty === "easy" ? "selected" : ""}`}
                  onClick={() => handleChange("difficulty", "easy")}
                >
                  Easy (8 mistakes)
                </button>
                <button
                  className={`option-button ${localSettings.difficulty === "normal" ? "selected" : ""}`}
                  onClick={() => handleChange("difficulty", "normal")}
                >
                  Normal (5 mistakes)
                </button>
                <button
                  className={`option-button ${localSettings.difficulty === "hard" ? "selected" : ""}`}
                  onClick={() => handleChange("difficulty", "hard")}
                >
                  Hard (3 mistakes)
                </button>
              </div>
            </div>

            <div className="settings-field">
              <label>Encryption Type</label>
              <div className="settings-options">
                <button
                  className={`option-button ${localSettings.encryptionMode === "standard" ? "selected" : ""}`}
                  onClick={() => handleChange("encryptionMode", "standard")}
                >
                  Standard (keep spaces and punctuation)
                </button>
                <button
                  className={`option-button ${localSettings.encryptionMode === "hardcore" ? "selected" : ""}`}
                  onClick={() => handleChange("encryptionMode", "hardcore")}
                >
                  Hardcore (all letters only)
                </button>
              </div>
            </div>
          </div>

          <div className="settings-actions bottom">
            <button className="settings-button cancel" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="settings-button save"
              onClick={() => onSave(localSettings)}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;