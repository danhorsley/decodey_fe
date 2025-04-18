// src/components/LeaderboardLoading.js (renamed to LeaderboardUI.js)
import React from "react";
import MatrixRainLoading from "./effects/MatrixRainLoading";
import useSettingsStore from "../stores/settingsStore";
import "../Styles/Leaderboard.css";

/**
 * LeaderboardUI - A unified component for both loading and error states
 * @param {Object} props Component props
 * @param {string} props.type Type of content ("loading" or "error")
 * @param {string} props.message Custom message (optional)
 * @param {Function} props.onRetry Retry callback for error state (optional)
 */
const LeaderboardUI = ({ type = "loading", message, onRetry }) => {
  const { settings } = useSettingsStore();
  const isDarkTheme = settings?.theme === "dark";

  // Determine message based on type if not provided
  const defaultMessages = {
    loading: "Loading leaderboard data...",
    error: "Failed to load leaderboard data.",
    personal: "Loading your stats...",
    streaks: "Loading streak data...",
  };

  const displayMessage =
    message || defaultMessages[type] || defaultMessages.loading;

  // For error state with retry button
  if (type === "error") {
    return (
      <div
        className={`leaderboard-ui error ${isDarkTheme ? "dark-theme" : "light-theme"}`}
      >
        <p className="error-message">{displayMessage}</p>
        {onRetry && (
          <button onClick={onRetry} className="retry-button">
            Try Again
          </button>
        )}
      </div>
    );
  }

  // For loading state with animation
  return (
    <div
      className={`leaderboard-ui loading ${isDarkTheme ? "dark-theme" : "light-theme"}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        textAlign: "center",
      }}
    >
      <h3
        className="loading-title"
        style={{ textAlign: "center", width: "100%" }}
      >
        {displayMessage}
        <span className="loading-dots"></span>
      </h3>

      <div
        className="loading-animation"
        style={{ width: "100%", maxWidth: "700px", margin: "0 auto" }}
      >
        <MatrixRainLoading
          active={true}
          color={isDarkTheme ? "#4cc9f0" : "#00ff41"}
          message={
            type === "personal"
              ? "Decrypting profile data..."
              : "Decrypting leaderboard..."
          }
          width="100%"
          height="100%"
          density={30}
        />
      </div>
    </div>
  );
};

export default LeaderboardUI;
