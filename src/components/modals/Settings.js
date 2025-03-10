import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "../../Styles/Settings.css";
import "../../Styles/About.css";
import { useAppContext } from "../../context/AppContext";

function Settings({ onSave, onCancel }) {
  const { isSettingsOpen, settings } = useAppContext();
  const [localSettings, setLocalSettings] = useState({ ...settings });

  // Initialize local settings when the component mounts or settings change
  useEffect(() => {
    setLocalSettings({ ...settings });
  }, [settings]);

  // Return null if settings are not open
  if (!isSettingsOpen) return null;

  // Handle save button click
  const handleSave = () => {
    onSave(localSettings);
  };

  // Handle theme change
  const handleThemeChange = (e) => {
    setLocalSettings({ ...localSettings, theme: e.target.value });
  };

  // Handle text color change
  const handleTextColorChange = (e) => {
    setLocalSettings({ ...localSettings, textColor: e.target.value });
  };

  return (
    <div className="about-overlay">
      <div
        className={`about-container settings-container ${
          settings.theme === "dark" ? "dark-theme" : ""
        } text-${settings.textColor}`}
      >
        <button className="about-close" onClick={onCancel}>
          &times;
        </button>
        <h2>Settings</h2>
        <div className="settings-group">
          <label htmlFor="theme">Theme:</label>
          <select
            id="theme"
            value={localSettings.theme}
            onChange={handleThemeChange}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="settings-group">
          <label htmlFor="textColor">Text Color:</label>
          <select
            id="textColor"
            value={localSettings.textColor}
            onChange={handleTextColorChange}
          >
            <option value="default">Default</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="purple">Purple</option>
          </select>
        </div>

        <div className="settings-actions">
          <button className="settings-save" onClick={handleSave}>
            Save
          </button>
          <button className="settings-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;