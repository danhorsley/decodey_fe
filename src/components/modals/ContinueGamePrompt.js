// src/components/modals/ContinueGamePrompt.js - Updated with better game type handling
import React from "react";
import "../../Styles/About.css";
import "../../Styles/Modal.css";
import useSettingsStore from "../../stores/settingsStore";
import useGameStore from "../../stores/gameStore";

/**
 * Modal that prompts user to continue an existing game or start a new one
 * Now with improved support for both regular and daily games
 */
function ContinueGamePrompt({
  isOpen,
  onClose,
  gameStats, // Regular game stats
  dailyGameStats = null, // Daily game stats
  onContinue,
  onNewGame,
  dailyCompleted = true, // Flag for already completed daily
  onDailyChallenge, // Handler for daily challenge button
  hasActiveDailyGame = false, // Active daily game flag from API
}) {
  // Debug logging
  console.log(
    "ContinueGamePrompt received hasActiveDailyGame:",
    hasActiveDailyGame,
  );
  console.log("ContinueGamePrompt received dailyGameStats:", dailyGameStats);
  // Get theme from settings
  const settings = useSettingsStore((state) => state.settings);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  // Format completion percentage
  const formatPercentage = (value) => {
    if (typeof value !== "number") return "0%";
    return `${Math.round(value)}%`;
  };

  // Format time spent
  const formatTime = (seconds) => {
    if (typeof seconds !== "number") return "0m 0s";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Use provided gameStats or default to empty object
  const regularStats = gameStats || {};
  const dailyStats = dailyGameStats || {};

  // Determine if we show daily button and what text to use
  const showDailyButton = !dailyCompleted || hasActiveDailyGame;
  const dailyButtonText = hasActiveDailyGame
    ? "Continue Daily Challenge"
    : "Daily Challenge";

  // Determine if we have a regular game (non-daily)
  const hasRegularGame = !!gameStats;

  return (
    <div className="about-overlay">
      <div
        className={`about-container ${settings.theme === "dark" ? "dark-theme" : ""} text-${settings.textColor}`}
      >
        <button className="about-close" onClick={onClose}>
          &times;
        </button>
        <h2>
          Active Game{hasActiveDailyGame && dailyGameStats ? "s" : ""} Found
        </h2>
        <p>
          You have{" "}
          {hasActiveDailyGame && dailyGameStats
            ? "active games"
            : "an active game"}{" "}
          in progress. What would you like to do?
        </p>

        {/* Regular game stats */}
        {gameStats && (
          <div
            className="game-stats-container"
            style={{
              margin: "20px 0",
              padding: "15px",
              backgroundColor: settings.theme === "dark" ? "#333" : "#f8f9fa",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ margin: "0 0 15px 0" }}>Regular Game Progress</h3>
            <div
              className="game-stats-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div className="stat-item">
                <span className="stat-label">Difficulty:</span>
                <span
                  className="stat-value"
                  style={{ textTransform: "capitalize" }}
                >
                  {regularStats.difficulty || "Unknown"}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Completion:</span>
                <span className="stat-value">
                  {formatPercentage(regularStats.completion_percentage)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Mistakes:</span>
                <span className="stat-value">
                  {regularStats.mistakes || 0}/{regularStats.max_mistakes || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Time Spent:</span>
                <span className="stat-value">
                  {formatTime(regularStats.time_spent)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Daily game stats - only show if hasActiveDailyGame is true */}
        {hasActiveDailyGame && dailyGameStats && (
          <div
            className="game-stats-container"
            style={{
              margin: "20px 0",
              padding: "15px",
              backgroundColor: settings.theme === "dark" ? "#333" : "#f8f9fa",
              borderRadius: "8px",
              borderLeft: "4px solid #FF5722", // Orange border for daily challenge
            }}
          >
            <h3 style={{ margin: "0 0 15px 0" }}>Daily Challenge Progress</h3>
            <div
              className="game-stats-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div className="stat-item">
                <span className="stat-label">Difficulty:</span>
                <span
                  className="stat-value"
                  style={{ textTransform: "capitalize" }}
                >
                  {dailyStats.difficulty || "Easy"}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Completion:</span>
                <span className="stat-value">
                  {formatPercentage(dailyStats.completion_percentage)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Mistakes:</span>
                <span className="stat-value">
                  {dailyStats.mistakes || 0}/{dailyStats.max_mistakes || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Time Spent:</span>
                <span className="stat-value">
                  {formatTime(dailyStats.time_spent)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "25px",
            flexWrap: "wrap", // Allow wrapping for mobile
            gap: "10px", // Add gap between buttons
          }}
        >
          <button
            onClick={onNewGame}
            style={{
              backgroundColor: "#6c757d",
              color: "white",
              padding: "8px 16px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              flex: showDailyButton ? "1 1 30%" : "1 1 45%", // Adjust flex basis based on number of buttons
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Custom Game
          </button>

          {/* Only show Daily Challenge button if not completed or has active daily */}
          {showDailyButton && (
            <button
              onClick={() => onDailyChallenge(hasActiveDailyGame)}
              style={{
                backgroundColor: "#FF5722", // Orange color for Daily Challenge
                color: "white",
                padding: "8px 16px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                flex: "1 1 30%",
              }}
            >
              {dailyButtonText}
            </button>
          )}

          {/* Only show Continue Game button if there's a regular game */}
          {hasRegularGame && (
            <button
              onClick={() => onContinue(false)} // Pass false to indicate this is not a daily game
              style={{
                backgroundColor:
                  settings.theme === "dark" ? "#4cc9f0" : "#007bff",
                color: settings.theme === "dark" ? "black" : "white",
                padding: "8px 16px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
                flex: showDailyButton ? "1 1 30%" : "1 1 45%", // Adjust flex basis based on number of buttons
              }}
            >
              Continue Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContinueGamePrompt;
