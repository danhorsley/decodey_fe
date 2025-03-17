import React from "react";
import MatrixRainLoading from "./effects/MatrixRainLoading";
import { useSettings } from "../context/SettingsContext";
import "../Styles/Leaderboard.css";

/**
 * LeaderboardLoading - A reusable loading component for leaderboard screens
 * @param {Object} props Component props
 * @param {string} props.message Custom loading message (optional)
 * @param {string} props.type Type of data being loaded (optional)
 */
const LeaderboardLoading = ({ message, type = "leaderboard" }) => {
  const { settings } = useSettings();
  const isDarkTheme = settings?.theme === "dark";

  // Determine message based on type if not provided
  const loadingMessage =
    message ||
    (type === "personal"
      ? "Loading your stats..."
      : type === "streaks"
        ? "Loading streak data..."
        : "Loading leaderboard...");

  return (
    <div
      className={`leaderboard-loading ${isDarkTheme ? "dark-theme" : "light-theme"}`}
    >
      <h3 className="loading-title">
        {loadingMessage}
        <span className="loading-dots"></span>
      </h3>

      <div className="loading-animation leaderboard-loading-animation">
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

export default LeaderboardLoading;
