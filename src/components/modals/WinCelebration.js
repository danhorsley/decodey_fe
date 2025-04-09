// src/components/modals/WinCelebration.js - Simplified
import React, { useState, useEffect } from "react";
import MatrixRain from "../effects/MatrixRain";
import CryptoSpinner from "../CryptoSpinner";
import "../../Styles/WinCelebration.css";
import useAuthStore from "../../stores/authStore";
import useUIStore from "../../stores/uiStore";
import useSettingsStore from "../../stores/settingsStore";
import { FaXTwitter } from "react-icons/fa6";

const WinCelebration = ({ playSound, winData }) => {
  // Get auth and settings state
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openLogin = useUIStore((state) => state.openLogin);
  const settings = useSettingsStore((state) => state.settings);

  // State for showing quote (for loss state)
  const [showQuote, setShowQuote] = useState(true);
  // State for loading data
  const [isLoading, setIsLoading] = useState(false);
  // Store anonymous state at mount time
  const [wasAnonymous] = useState(!isAuthenticated);

  // Play sound effect on mount
  useEffect(() => {
    if (typeof playSound === "function") {
      playSound("win");
    }
  }, [playSound]);

  // Safely extract win data with defaults
  const {
    score = 0,
    mistakes = 0,
    maxMistakes = 5,
    gameTimeSeconds = 0,
    rating = "Cryptanalyst",
    encrypted = "",
    display = "",
    hardcoreMode = false,
    hasLost = false,
    attribution = {},
    scoreStatus = {
      recorded: isAuthenticated,
      message: isAuthenticated
        ? "Score recorded successfully!"
        : "Score not recorded - anonymous game",
    },
    isDailyChallenge = false,
    dailyStats = null,
  } = winData || {};

  // Format time display
  const formatTime = () => {
    const minutes = Math.floor(gameTimeSeconds / 60);
    const seconds = gameTimeSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
  };

  // Get decrypted text for display
  const getDecryptedText = () => {
    return display || "";
  };

  // Share URL for Twitter
  const getShareUrl = () => {
    const message = `I scored ${score} points on Uncrypt${hardcoreMode ? " (Hardcore Mode)" : ""} with a "${rating}" rating! Can you beat my score? Play at`;
    const url = "https://decodey.game";
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`;
  };

  return (
    <div
      className={`win-celebration ${settings.theme === "dark" ? "dark-theme" : ""}`}
    >
      {/* Matrix Rain in background */}
      <MatrixRain
        active={!hasLost}
        color={settings.textColor === "scifi-blue" ? "#4cc9f0" : "#00ff41"}
        density={45}
      />

      {/* Main celebration content */}
      <div className="celebration-retro">
        {isLoading ? (
          <CryptoSpinner
            isActive={true}
            isDarkTheme={settings.theme === "dark"}
          />
        ) : (
          <>
            {/* Simple header */}
            <div className="retro-header">
              <h2 className="status-text">
                {hasLost ? "GAME OVER" : `SOLVED! Rating: ${rating}`}
              </h2>
            </div>

            {/* Quote section (show for win, optional for loss) */}
            {(showQuote || !hasLost) && (
              <div className="retro-quote">
                <div className="quote-text">{getDecryptedText()}</div>
                {attribution?.major_attribution && (
                  <div className="quote-attribution">
                    — {attribution.major_attribution}
                  </div>
                )}
              </div>
            )}

            {/* Stats in monospace grid */}
            <div className="retro-stats">
              <div className="stat-row">
                <div className="stat-item">TIME: {formatTime()}</div>
                <div className="stat-item">
                  MISTAKES: {mistakes}/{maxMistakes}
                </div>
                <div className="stat-item score">SCORE: {score}</div>
              </div>
            </div>

            {/* Login prompt for anonymous users */}
            {wasAnonymous && (
              <div className="anon-message">
                ⚠️ Score not recorded. Login before your next game to save
                scores.
                <button
                  className="game-over-action-button login-hint"
                  onClick={openLogin}
                >
                  <div className="hint-text-display">LOGIN</div>
                </button>
              </div>
            )}

            {/* Daily streak info if applicable */}
            {isDailyChallenge && isAuthenticated && dailyStats && (
              <div className="retro-daily">
                <div className="daily-streak-row">
                  <div className="streak-item">
                    CURRENT STREAK: {dailyStats.currentStreak || 0}
                  </div>
                  <div className="streak-item">
                    BEST STREAK: {dailyStats.bestStreak || 0}
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons using hint button styling */}
            <div className="retro-actions">
              <button
                className="game-over-action-button play-again"
                onClick={winData.onPlayAgain}
              >
                <div className="game-over-text-display">
                  {hasLost ? "TRY AGAIN" : "PLAY AGAIN"}
                </div>
              </button>

              {hasLost && !showQuote && (
                <button
                  className="game-over-action-button reveal"
                  onClick={() => setShowQuote(true)}
                >
                  <div className="game-over-text-display">REVEAL QUOTE</div>
                </button>
              )}

              <button
                className="game-over-action-button share"
                onClick={() => window.open(getShareUrl(), "_blank")}
              >
                <div className="game-over-text-display">
                  SHARE <FaXTwitter />
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WinCelebration;
