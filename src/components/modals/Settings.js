// src/components/modals/Settings.js
import React, { useState, useEffect, useCallback } from "react";
import useDeviceDetection from "../../hooks/useDeviceDetection";
import { useSettings } from "../../context/SettingsContext";
import { useGameState } from "../../context/GameStateContext";
import {useAuth} from "../../context/AuthContext";
import apiService from "../../services/apiService";
import ReactDOM from "react-dom";

function Settings({ onCancel }) {
  const { isMobile } = useDeviceDetection();
  const [userData, setUserData] = useState(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [showUserDataModal, setShowUserDataModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState(null);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteEmailError, setDeleteEmailError] = useState("");
  const authContext = useAuth();
  const user = authContext?.user || null;
  const logout =
    authContext?.logout || (() => console.log("No logout function available"));
  // Get settings directly from the context
  const { settings: currentSettings, updateSettings } = useSettings();
  const { hasGameStarted, correctlyGuessed } = useGameState();

  // Local state to track changes before saving
  const [settings, setSettings] = useState(currentSettings || {});

  // State to track whether gameplay has started (made at least one guess)
  const hasStartedPlaying = hasGameStarted && correctlyGuessed.length > 0;

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  // Move all useCallback hooks to the top level
  const handleChange = useCallback(
    (setting, value) => {
      if (setting === "difficulty" && hasStartedPlaying) {
        setPendingDifficulty(value);
        setShowWarningModal(true);
        return;
      }
      setSettings((prev) => ({ ...prev, [setting]: value }));
    },
    [hasStartedPlaying],
  );

  const handleConfirmDifficultyChange = useCallback(() => {
    if (pendingDifficulty) {
      setSettings((prev) => ({ ...prev, difficulty: pendingDifficulty }));
      setShowWarningModal(false);
      setPendingDifficulty(null);
    }
  }, [pendingDifficulty]);

  const handleCancelDifficultyChange = useCallback(() => {
    setShowWarningModal(false);
    setPendingDifficulty(null);
  }, []);

  const handleSave = useCallback(() => {
    updateSettings(settings);
    onCancel();
  }, [settings, updateSettings, onCancel]);

  const fetchUserData = useCallback(async () => {
    setIsLoadingUserData(true);
    try {
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

  if (!currentSettings) {
    return null;
  }
  const handleDeleteAccount = useCallback(async () => {
    try {
      // Check if we have a user object with email
      if (!user || !user.email) {
        setDeleteEmailError(
          "Cannot verify user email. Please try logging in again.",
        );
        return;
      }

      // First validate that email matches
      if (!deleteEmail || deleteEmail !== user.email) {
        setDeleteEmailError(
          "Please enter your correct email address to confirm deletion",
        );
        return;
      }

      setDeleteEmailError(""); // Clear any previous errors

      // Call the API to delete the account
      const response = await apiService.api.delete("/api/delete-account");

      if (response.status === 200) {
        // Close settings and confirmation
        setShowDeleteConfirmation(false);
        onCancel();

        // Log the user out safely
        try {
          if (typeof logout === "function") {
            await logout();
          }
        } catch (logoutError) {
          console.error(
            "Error during logout after account deletion:",
            logoutError,
          );
          // Continue anyway - account is deleted on the server
        }

        // Show a success message
        alert("Your account has been deleted successfully.");

        // Redirect to home/login page
        window.location.href = "/";
      } else {
        alert("There was a problem deleting your account. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("There was a problem deleting your account. Please try again.");
    }
  }, [deleteEmail, user, onCancel, logout]);

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

          {/* User Data Modal - Adjusted width to fit within settings modal */}
          {showUserDataModal && userData && (
            <div className="about-overlay" style={{ zIndex: 10001 }}>
              <div
                className={`about-container ${settings.theme === "dark" ? "dark-theme" : ""}`}
                style={{
                  maxWidth: "450px", // Reduced width to fit within settings modal
                  maxHeight: "80vh",
                  width: "90%", // Ensure it's responsive on smaller screens
                }}
              >
                <h2>Your Data</h2>
                <p>
                  This is all the data we store about your account. You can copy
                  it or download it as a JSON file.
                </p>

                <div
                  style={{
                    maxHeight: "40vh", // Slightly smaller height
                    overflow: "auto",
                    backgroundColor:
                      settings.theme === "dark" ? "#222" : "#f5f5f5",
                    padding: "10px",
                    borderRadius: "4px",
                    marginBottom: "15px",
                    fontFamily: "monospace",
                    fontSize: "0.85rem", // Slightly smaller font
                  }}
                >
                  <pre>{JSON.stringify(userData, null, 2)}</pre>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap", // Allow buttons to wrap on narrow screens
                    gap: "8px", // Add gap between buttons when they wrap
                  }}
                >
                  <button
                    className="settings-button save"
                    onClick={copyDataToClipboard}
                    style={{ flex: "1", minWidth: "120px" }}
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    className="settings-button save"
                    onClick={downloadUserData}
                    style={{ flex: "1", minWidth: "120px" }}
                  >
                    Download JSON
                  </button>
                  <button
                    className="settings-button cancel"
                    onClick={() => setShowUserDataModal(false)}
                    style={{ flex: "1", minWidth: "120px" }}
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
      {/* Update the confirmation dialog */}
      {showDeleteConfirmation && (
        <div className="about-overlay" style={{ zIndex: 10001 }}>
          <div
            className={`about-container ${settings.theme === "dark" ? "dark-theme" : ""}`}
            style={{ maxWidth: "400px" }}
          >
            <h2>Delete Account</h2>
            <p>
              Are you sure you want to delete your account? This will
              permanently remove:
            </p>
            <ul style={{ textAlign: "left", marginBottom: "20px" }}>
              <li>Your account information</li>
              <li>All your game history and statistics</li>
              <li>Your position on leaderboards</li>
            </ul>

            <div style={{ marginBottom: "20px" }}>
              <p style={{ marginBottom: "10px" }}>
                To confirm, please enter your email address:
              </p>
              <input
                type="email"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                placeholder="Enter your email"
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  backgroundColor: settings.theme === "dark" ? "#333" : "#fff",
                  color: settings.theme === "dark" ? "#fff" : "#333",
                }}
              />
              {deleteEmailError && (
                <p
                  style={{
                    color: "red",
                    fontSize: "0.9rem",
                    marginTop: "5px",
                  }}
                >
                  {deleteEmailError}
                </p>
              )}
            </div>

            <p>
              This action <strong>cannot be undone</strong>.
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
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setDeleteEmail("");
                  setDeleteEmailError("");
                }}
              >
                Cancel
              </button>
              <button
                className="settings-button save"
                style={{ backgroundColor: "#dc3545" }}
                onClick={handleDeleteAccount}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
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
