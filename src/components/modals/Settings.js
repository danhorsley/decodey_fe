// src/components/modals/Settings.js
import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import "../../Styles/Settings.css";
import "../../Styles/About.css";
import { useSettings } from "../../context/SettingsContext";
import { useGameState } from "../../context/GameStateContext";
import useDeviceDetection from "../../hooks/useDeviceDetection";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/apiService";

function Settings({ onCancel }) {
  const { isMobile } = useDeviceDetection();
  const [userData, setUserData] = useState(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [showUserDataModal, setShowUserDataModal] = useState(false);
  // Get settings directly from the context
  const { settings: currentSettings, updateSettings } = useSettings();

  // Get game state to check if game has started
  const { hasGameStarted, correctlyGuessed } = useGameState();

  // Local state to track changes before saving
  const [settings, setSettings] = useState(currentSettings || {});

  // State to track warning modal
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState(null);

  // State to track whether gameplay has started (made at least one guess)
  const hasStartedPlaying = hasGameStarted && correctlyGuessed.length > 0;

  // Add debugging to see what's happening
  console.log(
    "Settings component rendered with currentSettings:",
    currentSettings,
    "hasGameStarted:",
    hasGameStarted,
    "correctlyGuessed:",
    correctlyGuessed,
    "hasStartedPlaying:",
    hasStartedPlaying,
  );

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

    // Special handling for difficulty changes if game has started playing
    if (setting === "difficulty" && hasStartedPlaying) {
      console.log("Game in progress, showing difficulty change warning");
      setPendingDifficulty(value);
      setShowWarningModal(true);
      return;
    }

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

  // Handle confirming difficulty change when game has started
  const handleConfirmDifficultyChange = () => {
    console.log("Difficulty change confirmed, updating to:", pendingDifficulty);

    // Update settings with the new difficulty
    setSettings((prev) => ({
      ...prev,
      difficulty: pendingDifficulty,
    }));

    // Close the warning modal
    setShowWarningModal(false);
    setPendingDifficulty(null);
  };

  // Handle canceling difficulty change
  const handleCancelDifficultyChange = () => {
    console.log("Difficulty change canceled");
    setShowWarningModal(false);
    setPendingDifficulty(null);
  };

  if (!currentSettings) {
    console.log("No current settings available, returning null");
    return null;
  }
  // Add a function to fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      setIsLoadingUserData(true);
      const response = await apiService.api.get("/api/user-data");
      if (response.status === 200) {
        setUserData(response.data);
        setShowUserDataModal(true);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      alert("There was a problem retrieving your data. Please try again.");
    } finally {
      setIsLoadingUserData(false);
    }
  }, []);

  // Add copy to clipboard function
  const copyDataToClipboard = useCallback(() => {
    if (!userData) return;

    const dataStr = JSON.stringify(userData, null, 2);
    navigator.clipboard
      .writeText(dataStr)
      .then(() => {
        alert("Data copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy data:", err);
        // Fallback method for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = dataStr;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Data copied to clipboard!");
      });
  }, [userData]);

  // Add download function
  const downloadUserData = useCallback(() => {
    if (!userData) return;

    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "my-uncrypt-data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [userData]);
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
          <div className="settings-section">
            <h2>Feedback Settings</h2>
            <div className="settings-options">
              {/* Sound toggle */}
              <label className="settings-option">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={() =>
                    handleChange("soundEnabled", !settings.soundEnabled)
                  }
                />
                <span className="option-label">Enable sound effects</span>
              </label>
              <p className="settings-description">
                Play sound effects for interactions and game events.
              </p>

              {/* Only show vibration option on mobile devices */}
              {isMobile && (
                <>
                  <label className="settings-option">
                    <input
                      type="checkbox"
                      checked={settings.vibrationEnabled}
                      onChange={() =>
                        handleChange(
                          "vibrationEnabled",
                          !settings.vibrationEnabled,
                        )
                      }
                    />
                    <span className="option-label">Enable haptic feedback</span>
                  </label>
                  <p className="settings-description">
                    Provides gentle vibrations when interacting with the game.
                    Only works on supported mobile devices.
                  </p>
                </>
              )}
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

              {hasStartedPlaying && (
                <p className="settings-description warning-text">
                  Note: Changing difficulty will only affect your next game.
                </p>
              )}
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

              {hasStartedPlaying && (
                <p className="settings-description warning-text">
                  Note: Hardcore mode changes will only affect your next game.
                </p>
              )}
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

              {hasStartedPlaying && (
                <p className="settings-description warning-text">
                  Note: Quote length changes will only affect your next game.
                </p>
              )}
            </div>
          </div>
          <div className="settings-section">
            <h2>Account Management</h2>
            <div className="settings-options">
              <button
                className="settings-button save"
                style={{
                  backgroundColor: "#007bff",
                  marginBottom: "15px",
                  width: "100%",
                }}
                onClick={fetchUserData}
                disabled={isLoadingUserData}
              >
                {isLoadingUserData ? "Loading..." : "Download My Data"}
              </button>
              <p className="settings-description">
                View and download all data associated with your account.
              </p>

              <button
                className="settings-button cancel"
                style={{
                  backgroundColor: "#dc3545",
                  color: "white",
                  marginTop: "15px",
                  width: "100%",
                }}
                onClick={() => setShowDeleteConfirmation(true)}
              >
                Delete My Account
              </button>
              <p className="settings-description warning-text">
                This will permanently delete your account and all associated
                data. This action cannot be undone.
              </p>
            </div>
          </div>

          {/* User Data Modal */}
          {showUserDataModal && userData && (
            <div className="about-overlay" style={{ zIndex: 10001 }}>
              <div
                className={`about-container ${settings.theme === "dark" ? "dark-theme" : ""}`}
                style={{ maxWidth: "700px", maxHeight: "80vh" }}
              >
                <h2>Your Data</h2>
                <p>
                  This is all the data we store about your account. You can copy
                  it or download it as a JSON file.
                </p>

                <div
                  style={{
                    maxHeight: "50vh",
                    overflow: "auto",
                    backgroundColor:
                      settings.theme === "dark" ? "#222" : "#f5f5f5",
                    padding: "10px",
                    borderRadius: "4px",
                    marginBottom: "15px",
                    fontFamily: "monospace",
                    fontSize: "0.9rem",
                  }}
                >
                  <pre>{JSON.stringify(userData, null, 2)}</pre>
                </div>

                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <button
                    className="settings-button save"
                    onClick={copyDataToClipboard}
                    style={{ marginRight: "10px" }}
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    className="settings-button save"
                    onClick={downloadUserData}
                  >
                    Download as JSON
                  </button>
                  <button
                    className="settings-button cancel"
                    onClick={() => setShowUserDataModal(false)}
                    style={{ marginLeft: "10px" }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Action Buttons */}
          <div className="settings-actions">
            <button className="settings-button cancel" onClick={onCancel}>
              Cancel
            </button>
            <button className="settings-button save" onClick={handleSave}>
              Save & Return to Game
            </button>
          </div>
        </div>
      </div>

      {/* Difficulty Change Warning Modal */}
      {showWarningModal && (
        <div className="about-overlay" style={{ zIndex: 10000 }}>
          <div
            className={`about-container ${currentSettings.theme === "dark" ? "dark-theme" : ""}`}
            style={{ maxWidth: "400px" }}
          >
            <h2>Change Difficulty?</h2>
            <p>
              You've already started a game. Changing difficulty will only
              affect your next game.
            </p>
            <p>
              Your current game will continue with the{" "}
              {currentSettings.difficulty} difficulty setting.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "20px",
              }}
            >
              <button
                className="settings-button cancel"
                onClick={handleCancelDifficultyChange}
              >
                Cancel
              </button>
              <button
                className="settings-button save"
                onClick={handleConfirmDifficultyChange}
              >
                Change Difficulty
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.getElementById("root"), // Mount directly to root element
  );
}

export default Settings;
