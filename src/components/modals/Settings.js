// src/components/modals/Settings.js
import React, { useState, useEffect, useCallback } from "react";
import useDeviceDetection from "../../hooks/useDeviceDetection";
import useSettingsStore from "../../stores/settingsStore";
import useGameStore from "../../stores/gameStore";
import useAuthStore from "../../stores/authStore";
import apiService from "../../services/apiService";
import ReactDOM from "react-dom";

function Settings({ onCancel }) {
  // Get device detection
  const { isMobile, isLandscape } = useDeviceDetection();

  // Local component state
  const [userData, setUserData] = useState(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [showUserDataModal, setShowUserDataModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingSettings, setPendingSettings] = useState({});
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteEmailError, setDeleteEmailError] = useState("");

  // Get settings state from store
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  // Get game state from store
  const hasGameStarted = useGameStore((state) => state.hasGameStarted);
  const correctlyGuessed = useGameStore((state) => state.correctlyGuessed);

  // Get auth state from store
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isSubadmin = user?.subadmin === true;

  // Local settings state to track changes before saving
  const [localSettings, setLocalSettings] = useState({
    ...settings,
    backdoorMode: settings.backdoorMode || false
  });

  // Update local settings when store settings change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // State to track whether gameplay has started (made at least one guess)
  const hasStartedPlaying =
    hasGameStarted && correctlyGuessed && correctlyGuessed.length > 0;

  // Handle setting changes
  const handleChange = useCallback(
    (setting, value) => {
      // Always show warning for gameplay-affecting settings
      const gamePlaySettings = ["difficulty", "hardcoreMode", "longText"];

      if (gamePlaySettings.includes(setting)) {
        // Store pending setting change and show warning
        setPendingSettings({ type: setting, value });
        setShowWarningModal(true);
        return;
      }

      // Otherwise apply change immediately
      setLocalSettings((prev) => ({ ...prev, [setting]: value }));
    },
    [], // No dependency on hasStartedPlaying anymore
  );

  // Handle setting change confirmation
  const handleConfirmSettingChange = useCallback(() => {
    if (pendingSettings.type) {
      // Apply the pending setting change
      setLocalSettings((prev) => ({
        ...prev,
        [pendingSettings.type]: pendingSettings.value,
      }));

      // Reset UI state
      setShowWarningModal(false);
      setPendingSettings({});
    }
  }, [pendingSettings]);

  // Handle setting change cancellation
  const handleCancelSettingChange = useCallback(() => {
    setShowWarningModal(false);
    setPendingSettings({});
  }, []);

  // Save settings
  const handleSave = useCallback(() => {
    updateSettings(localSettings);
    onCancel();
  }, [localSettings, updateSettings, onCancel]);

  // Fetch user data
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

  // Copy data to clipboard
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

  // Download user data
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

  // Handle account deletion
  const handleDeleteAccount = useCallback(async () => {
    try {
      // Skip email verification - just confirm deletion by checking if the text is "DELETE"
      if (!deleteEmail || deleteEmail.toUpperCase() !== "DELETE") {
        setDeleteEmailError(
          'Please type "DELETE" (all caps) to confirm account deletion',
        );
        return;
      }

      setDeleteEmailError(""); // Clear any previous errors

      // Call the API to delete the account
      const response = await apiService.api.delete("/api/delete-account");

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
      }

      // Show a success message
      alert("Your account has been deleted successfully.");

      // Redirect to home/login page
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("There was a problem deleting your account. Please try again.");
    }
  }, [deleteEmail, onCancel, logout]);

  return ReactDOM.createPortal(
    <div className="about-overlay">
      <div
        className={`about-container settings-container ${
          settings.theme === "dark" ? "dark-theme" : ""
        } ${isLandscape ? "landscape-layout" : ""}`}
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
                  checked={localSettings.theme === "light"}
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
                  checked={localSettings.theme === "dark"}
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
                  checked={localSettings.soundEnabled}
                  onChange={() =>
                    handleChange("soundEnabled", !localSettings.soundEnabled)
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
                      checked={localSettings.vibrationEnabled}
                      onChange={() =>
                        handleChange(
                          "vibrationEnabled",
                          !localSettings.vibrationEnabled,
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
                  checked={localSettings.difficulty === "easy"}
                  onChange={() => handleChange("difficulty", "easy")}
                />
                <span className="option-label">Easy (7 mistakes)</span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="difficulty"
                  checked={localSettings.difficulty === "medium"}
                  onChange={() => handleChange("difficulty", "medium")}
                />
                <span className="option-label">Medium (4 mistakes)</span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="difficulty"
                  checked={localSettings.difficulty === "hard"}
                  onChange={() => handleChange("difficulty", "hard")}
                />
                <span className="option-label">Hard (2 mistakes)</span>
              </label>

              {hasStartedPlaying && (
                <p className="settings-description warning-text"></p>
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
                  checked={localSettings.hardcoreMode}
                  onChange={() =>
                    handleChange("hardcoreMode", !localSettings.hardcoreMode)
                  }
                />
                <span className="option-label">Hardcore Mode</span>
              </label>
              <p className="settings-description">
                When enabled, spaces and punctuation will be removed from the
                encrypted text, making it more challenging to decrypt.
              </p>

              {hasStartedPlaying && (
                <p className="settings-description warning-text"></p>
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
                  checked={localSettings.gridSorting === "default"}
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
                  checked={localSettings.gridSorting === "alphabetical"}
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
                  checked={localSettings.mobileMode === "auto"}
                  onChange={() => handleChange("mobileMode", "auto")}
                />
                <span className="option-label">Auto Detect</span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="mobileMode"
                  checked={localSettings.mobileMode === "always"}
                  onChange={() => handleChange("mobileMode", "always")}
                />
                <span className="option-label">Always Use Mobile Layout</span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="mobileMode"
                  checked={localSettings.mobileMode === "never"}
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
                  checked={localSettings.longText}
                  onChange={() =>
                    handleChange("longText", !localSettings.longText)
                  }
                />
                <span className="option-label">
                  Use Longer Quotes - over 65 characters & over 15 unique
                  letters
                </span>
              </label>
              <p className="settings-description warning-text">
                <strong>Warning:</strong> Longer quotes may not display well on
                smaller screens or in mobile view. Best used on desktop or
                larger tablet displays.
              </p>

              {hasStartedPlaying && (
                <p className="settings-description warning-text"></p>
              )}
            </div>
          </div>
         {/* backdoor for subadmin ONLY */}
          {isAuthenticated && isSubadmin && (
            <div className="settings-section">
              <h2>Admin Settings</h2>
              <div className="settings-options">
                <label className="settings-option">
                  <input
                    type="checkbox"
                    checked={localSettings.backdoorMode}
                    onChange={() => handleChange("backdoorMode", !localSettings.backdoorMode)}
                  />
                  <span className="option-label">Use Backdoor Quotes</span>
                </label>
              </div>
            </div>
          )}
          {/* Account Management Section - Only show if authenticated */}
          {isAuthenticated && (
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

      {/* User Data Modal */}
      {showUserDataModal && userData && (
        <div className="about-overlay" style={{ zIndex: 10001 }}>
          <div
            className={`about-container ${localSettings.theme === "dark" ? "dark-theme" : ""}`}
            style={{
              maxWidth: "450px",
              maxHeight: "80vh",
              width: "90%",
            }}
          >
            <h2>Your Data</h2>
            <p>
              This is all the data we store about your account. You can copy it
              or download it as a JSON file.
            </p>

            <div
              style={{
                maxHeight: "40vh",
                overflow: "auto",
                backgroundColor:
                  localSettings.theme === "dark" ? "#222" : "#f5f5f5",
                padding: "10px",
                borderRadius: "4px",
                marginBottom: "15px",
                fontFamily: "monospace",
                fontSize: "0.85rem",
              }}
            >
              <pre>{JSON.stringify(userData, null, 2)}</pre>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
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

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="about-overlay" style={{ zIndex: 10001 }}>
          <div
            className={`about-container ${localSettings.theme === "dark" ? "dark-theme" : ""}`}
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
                To confirm, please type "DELETE" in the box below:
              </p>
              <input
                type="text"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                placeholder='Type "DELETE" here'
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  backgroundColor:
                    localSettings.theme === "dark" ? "#333" : "#fff",
                  color: localSettings.theme === "dark" ? "#fff" : "#333",
                  textAlign: "center",
                  fontWeight: "bold",
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
            className={`about-container ${localSettings.theme === "dark" ? "dark-theme" : ""}`}
            style={{ maxWidth: "400px" }}
          >
            <h2>
              Change{" "}
              {pendingSettings.type === "difficulty"
                ? "Difficulty"
                : pendingSettings.type === "hardcoreMode"
                  ? "Gameplay Mode"
                  : "Quote Length"}
              ?
            </h2>
            <p>This change will only affect your next game.</p>
            <p>
              {pendingSettings.type === "difficulty"
                ? "Difficulty affects how many mistakes you can make before losing."
                : pendingSettings.type === "hardcoreMode"
                  ? "Hardcore mode removes spaces and punctuation for a greater challenge."
                  : "Quote length determines whether you'll see shorter or longer quotes."}
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
                onClick={handleCancelSettingChange}
              >
                Cancel
              </button>
              <button
                className="settings-button save"
                onClick={handleConfirmSettingChange}
              >
                Change Setting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.getElementById("root"),
  );
}

export default Settings;
