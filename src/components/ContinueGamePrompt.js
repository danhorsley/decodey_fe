// src/components/ContinueGamePrompt.js
import React from "react";

const ContinueGamePrompt = ({
  gameData,
  onContinue,
  onNewGame,
  theme = "light",
}) => {
  if (!gameData) return null;

  const formatTimeSpent = (seconds) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} min ${remainingSeconds} sec`;
  };

  // Get difficulty name in a user-friendly format
  const getDifficultyName = (diff) => {
    switch (diff) {
      case "hard":
        return "Hard";
      case "easy":
        return "Easy";
      case "medium":
        return "Normal";
      default:
        return diff ? diff.charAt(0).toUpperCase() + diff.slice(1) : "Normal";
    }
  };

  return (
    <div className="about-overlay">
      <div
        className={`about-container ${theme === "dark" ? "dark-theme" : ""}`}
        style={{ maxWidth: "400px" }}
      >
        <h2>Continue Your Game?</h2>
        <p>You have an active game in progress:</p>

        <div
          style={{
            backgroundColor: theme === "dark" ? "#333" : "#f5f5f5",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <span>Difficulty:</span>
            <span>
              <strong>{getDifficultyName(gameData.difficulty)}</strong>
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <span>Progress:</span>
            <span>
              <strong>{gameData.completion_percentage}%</strong>
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <span>Time spent:</span>
            <span>
              <strong>{formatTimeSpent(gameData.time_spent)}</strong>
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Mistakes:</span>
            <span>
              <strong>
                {gameData.mistakes} / {gameData.max_mistakes}
              </strong>
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "15px",
          }}
        >
          <button
            onClick={onNewGame}
            style={{
              flex: "1",
              backgroundColor: theme === "dark" ? "#333" : "#e9e9e9",
              color: theme === "dark" ? "#f8f9fa" : "#333",
            }}
          >
            New Game
          </button>
          <button
            onClick={onContinue}
            style={{
              flex: "1",
              backgroundColor: theme === "dark" ? "#4cc9f0" : "#007bff",
              color: theme === "dark" ? "#222" : "#fff",
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContinueGamePrompt;
