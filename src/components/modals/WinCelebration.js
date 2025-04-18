// src/components/modals/WinCelebration.js - Updated with streak bonus
import React, { useState, useEffect } from "react";
import MatrixRain from "../effects/MatrixRain";
import CryptoSpinner from "../CryptoSpinner";
import "../../Styles/WinCelebration.css";
import useAuthStore from "../../stores/authStore";
import useUIStore from "../../stores/uiStore";
import useSettingsStore from "../../stores/settingsStore";
import { FaXTwitter } from "react-icons/fa6";

/**
 * Convert raw score to percentage rating (50-100%)
 * @param {number} score - The raw score
 * @param {boolean} isDailyChallenge - Whether this is a daily challenge
 * @return {number} - Percentage score between 50-100
 */
const calculatePercentageRating = (score, isDailyChallenge) => {
  // Maximum theoretical score depends on game type
  // Daily challenges use Easy difficulty, so max is lower
  const MAX_THEORETICAL_SCORE = isDailyChallenge ? 1800 : 11250;

  // Calculate percentage (50% minimum for winners)
  const percentage = 50 + (score / MAX_THEORETICAL_SCORE) * 50;

  // Cap at 100% and ensure we have an integer
  return Math.min(100, Math.round(percentage));
};

/**
 * Calculate the base score from total score and streak
 * @param {number} totalScore - The final score with streak bonus
 * @param {number} streak - Current daily streak
 * @return {Object} - Base score and bonus amount
 */
const calculateBaseScore = (totalScore, streak) => {
  if (!streak || !totalScore) {
    return { baseScore: totalScore, bonusAmount: 0 };
  }

  // Calculate streak multiplier: 1 + (min(current_daily_streak, 20) * 0.05)
  const cappedStreak = Math.min(streak, 20);
  const multiplier = 1 + cappedStreak * 0.05;

  // Calculate base score by dividing the total score by the multiplier
  const baseScore = Math.round(totalScore / multiplier);
  const bonusAmount = totalScore - baseScore;

  return { baseScore, bonusAmount };
};

const WinCelebration = ({ playSound, winData }) => {
  console.log("win data", winData);
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
    maxMistakes = 4,
    gameTimeSeconds = 0,
    rating = 50,
    encrypted = "",
    display = "",
    correctlyGuessed = [],
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
    current_daily_streak = 0, // Extract the streak from win data
  } = winData || {};

  // Calculate base score and bonus
  const { baseScore, bonusAmount } = calculateBaseScore(
    score,
    current_daily_streak,
  );
  const hasStreakBonus = bonusAmount > 0;

  // Format time display - show infinity symbol for losses
  const formatTime = () => {
    if (hasLost) return "∞"; // Infinity symbol for losses

    const minutes = Math.floor(gameTimeSeconds / 60);
    const seconds = gameTimeSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
  };

  // Get decrypted text for display
  const getDecryptedText = () => {
    return display || "";
  };

  // Calculate percentage solved
  const calculatePercentageSolved = () => {
    if (!encrypted || !correctlyGuessed) return 0;

    // Get unique letters in the encrypted text
    const uniqueEncryptedLetters = [
      ...new Set(encrypted.match(/[A-Z]/g) || []),
    ];
    // Calculate percentage based on correctly guessed letters
    const percentage = Math.round(
      (correctlyGuessed.length / uniqueEncryptedLetters.length) * 100,
    );

    return percentage;
  };

  // Share URL for Twitter
  const getShareUrl = (score) => {
    let message;
    const url = "https://decodey.game";

    if (hasLost) {
      const solvePercentage = calculatePercentageSolved();
      const failBlocks = Math.round(solvePercentage / 10);
      const failBar = "■".repeat(failBlocks) + "□".repeat(10 - failBlocks);
      message = `>>>  [D E C O D E Y   F A I L E D]  <<<
> P C T : [${failBar}] ${solvePercentage}% <
> D E C O D E Y . G A M E .  .  .  .  .  .  .<`;
    } else {
      const blocks = ["░", "▒", "▓", "█", "⠿", "■", "□"];
      const ratingNum = calculatePercentageRating(baseScore, isDailyChallenge);
      const filledBlocks = Math.round(ratingNum / 10);
      const ratingBar =
        blocks[5].repeat(filledBlocks) + blocks[6].repeat(10 - filledBlocks);

      message = `>> [D E C O D E Y   C O M P L E T E] <<
  > T I M E : ${formatTime()} .  .  .  T O K E N S :  ${mistakes} <
  > S C O R E : ${score} .  .  .  .  .  .  .  .  .  .  .  .<
  > P C T : [${ratingBar}] ${ratingNum}% <
  > D E C O D E Y . G A M E .  .  .  .  .  .  .<`;
    }

    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
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
                {hasLost
                  ? "GAME OVER"
                  : `DECODED! Rating: ${calculatePercentageRating(baseScore, isDailyChallenge)}%`}
              </h2>
            </div>

            {/* Quote section (show for win, optional for loss) */}
            {(showQuote || !hasLost) && (
              <div className="retro-quote">
                <div className="quote-text">{getDecryptedText()}</div>
                {attribution?.major_attribution && (
                  <div className="quote-attribution">
                    — {attribution.major_attribution}
                    {", "}
                    {attribution.minor_attribution}
                  </div>
                )}
              </div>
            )}

            {/* Stats in monospace grid */}
            <div className="retro-stats">
              <div className="stat-row">
                <div className="stat-item">TIME: {formatTime()}</div>
                <div className="stat-item">
                  MISTAKES: {mistakes}/{maxMistakes - 1}
                </div>
                {hasLost ? (
                  <div className="stat-item score">
                    SOLVED: {calculatePercentageSolved()}%
                  </div>
                ) : (
                  <div className="stat-item score">
                    SCORE: {score}
                    {hasStreakBonus && (
                      <span className="streak-bonus-tag">+{bonusAmount}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Display streak bonus info if applicable */}
              {isDailyChallenge && current_daily_streak > 0 && !hasLost && (
                <div className="stat-row streak-bonus-row">
                  <div className="stat-item streak-info">
                    DAILY STREAK: {current_daily_streak}
                  </div>
                  <div className="stat-item streak-bonus">
                    BONUS: +{Math.min(current_daily_streak, 20) * 5}%
                  </div>
                </div>
              )}
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
                  <div className="game-over-text-display">LOGIN</div>
                </button>
              </div>
            )}

            {/* Daily streak info if applicable */}
            {isAuthenticated && current_daily_streak > 0 && (
              <div className="retro-daily">
                <div className="daily-streak-row">
                  <div className="streak-item">
                    CURRENT STREAK: {current_daily_streak}
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

              {/* New Home button to go to the home page */}
              <button
                className="game-over-action-button home"
                onClick={() => (window.location.href = "/home")}
              >
                <div className="game-over-text-display">HOME MENU</div>
              </button>

              {hasLost && !showQuote && (
                <button
                  className="game-over-action-button reveal"
                  onClick={() => setShowQuote(true)}
                >
                  <div className="hint-text-display">REVEAL QUOTE</div>
                </button>
              )}

              <button
                className="game-over-action-button share"
                onClick={() => window.open(getShareUrl(score), "_blank")}
              >
                <div className="game-over-text-display">
                  SHARE <FaXTwitter />
                </div>
              </button>

              <button
                className="game-over-action-button share"
                onClick={() => {
                  const shareText =
                    "I'm enjoying Decodey and I think you'll like it too! Check it out at:";
                  const url = "https://decodey.game";
                  if (navigator.share) {
                    navigator.share({
                      title: "Decodey",
                      text: shareText,
                      url: url,
                    });
                  } else {
                    navigator.clipboard.writeText(`${shareText} ${url}`);
                    alert("Share link copied to clipboard!");
                  }
                }}
              >
                <div className="game-over-text-display">SHARE LINK</div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WinCelebration;
