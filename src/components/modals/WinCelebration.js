// src/components/modals/WinCelebration.js - Fixed version with proper spinner overlay
import React, { useState, useEffect, useCallback } from "react";
import MatrixRain from "../effects/MatrixRain";
import CryptoSpinner from "../CryptoSpinner";
import "../../Styles/WinCelebration.css";
import useAuthStore from "../../stores/authStore";
import useUIStore from "../../stores/uiStore";
import useSettingsStore from "../../stores/settingsStore";
import useGameService from "../../hooks/useGameService"; // Game service for events
import apiService from "../../services/apiService"; // Import apiService for checking active games
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
  // Get auth and settings state
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openLogin = useUIStore((state) => state.openLogin);
  const settings = useSettingsStore((state) => state.settings);

  // Get UI actions for continue game prompt
  const openContinueGamePrompt = useUIStore(
    (state) => state.openContinueGamePrompt,
  );

  // Get game service functions and event system
  const { startNewGame } = useGameService();

  // State for showing quote (for loss state)
  const [showQuote, setShowQuote] = useState(true);

  // State to track if we specifically need the stats spinner
  // IMPORTANT: Initialize to true if winData has statsLoading flag
  const [showStatsSpinner, setShowStatsSpinner] = useState(
    winData?.statsLoading === true,
  );

  // Store anonymous state at mount time
  const [wasAnonymous] = useState(!isAuthenticated);

  // State to track if we're checking for active games
  const [isCheckingActiveGames, setIsCheckingActiveGames] = useState(false);

  // Play sound effect on mount and handle loading state
  useEffect(() => {
    // Play win sound
    if (typeof playSound === "function") {
      playSound("win");
    }

    // Update spinner state when winData changes
    if (winData?.statsLoading === true) {
      setShowStatsSpinner(true);

      // Set up a timeout to hide the spinner after a reasonable time
      // even if the backend doesn't respond
      const timeout = setTimeout(() => {
        setShowStatsSpinner(false);
      }, 5000); // 5 second maximum loading time

      return () => clearTimeout(timeout);
    } else {
      setShowStatsSpinner(false);
    }
  }, [playSound, winData?.statsLoading]);

  // Effect to handle winData updates - to clear the loading state
  // when complete data arrives
  useEffect(() => {
    if (winData && winData.statsLoading === false && showStatsSpinner) {
      // Data has arrived and is no longer loading, but spinner is showing
      setShowStatsSpinner(false);
    }
  }, [winData, showStatsSpinner]);

  // Handler for Play Again button - using direct API call for simplicity
  const handlePlayAgain = useCallback(async () => {
    // For authenticated users, check for existing active games
    if (isAuthenticated) {
      try {
        // Show the checking games spinner
        setIsCheckingActiveGames(true);

        // Use apiService directly to check for active games
        console.log("Checking for active games...");
        const activeGameCheck = await apiService.checkActiveGame();
        console.log("Active game check result:", activeGameCheck);

        // Hide the spinner
        setIsCheckingActiveGames(false);

        if (
          activeGameCheck.has_active_game ||
          activeGameCheck.has_active_daily_game
        ) {
          // If user has any active games, open the continue game prompt
          console.log("User has active games, showing continue prompt");

          // Open the continue game prompt with proper game stats
          openContinueGamePrompt({
            gameStats: activeGameCheck.game_stats || null,
            dailyStats: activeGameCheck.daily_stats || null,
            hasActiveDailyGame: activeGameCheck.has_active_daily_game || false,
          });

          return;
        }

        // If no active games, use onPlayAgain callback if provided
        if (winData?.onPlayAgain && typeof winData.onPlayAgain === "function") {
          winData.onPlayAgain();
        } else {
          // Fallback if callback is missing
          window.location.reload();
        }
      } catch (error) {
        console.error("Error checking for active games:", error);
        setIsCheckingActiveGames(false);

        // Fall back to using the provided callback
        if (winData?.onPlayAgain && typeof winData.onPlayAgain === "function") {
          winData.onPlayAgain();
        } else {
          window.location.reload();
        }
      }
    } else {
      // For anonymous users, start a custom game with current settings
      try {
        // Use current settings but start a custom game
        await startNewGame({
          longText: settings?.longText || false,
          hardcoreMode: settings?.hardcoreMode || false,
          difficulty: settings?.difficulty || "medium",
          customGameRequested: true, // Ensure it's a custom game
        });
      } catch (error) {
        console.error("Error starting new game:", error);
        // Fallback - just reload the page if the API call fails
        window.location.reload();
      }
    }
  }, [
    isAuthenticated,
    openContinueGamePrompt,
    startNewGame,
    settings,
    winData,
  ]);

  // Safely extract win data with defaults
  const {
    score = 0,
    mistakes = 0,
    maxMistakes = 4,
    gameTimeSeconds = 0,
    encrypted = "",
    display = "",
    correctlyGuessed = [],
    hasLost = false,
    attribution = {},
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

  // Debug logging for spinner state
  console.log("Spinner state:", {
    showStatsSpinner,
    isCheckingActiveGames,
    statsLoading: winData?.statsLoading,
  });

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

      {/* Main celebration content - always visible */}
      <div className="celebration-retro">
        {/* Simple header */}
        <div className="retro-header">
          <h2 className="status-text">
            {hasLost ? (
              "GAME OVER"
            ) : (
              <span className="rating-tooltip">
                DECODED! Rating:{" "}
                {calculatePercentageRating(baseScore, isDailyChallenge)}%
                <span className="tooltip-text">
                  Rating is calculated based on your score relative to the
                  theoretical maximum. Factors include difficulty, hardcore
                  mode, mistakes made, and time taken. Higher ratings are
                  achieved with harder difficulty, fewer mistakes, and faster
                  times.
                </span>
              </span>
            )}
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

        {/* Daily streak info if applicable */}
        {isAuthenticated && current_daily_streak > 0 && !hasLost && (
          <div className="stat-row streak-bonus-row">
            <div className="stat-item streak-info">
              <span>
                DAILY STREAK: {current_daily_streak} (+5% per day, max 100%)
              </span>
            </div>
            <div className="stat-item streak-bonus"></div>
          </div>
        )}

        {/* Stats in monospace grid - with loading spinner overlay */}
        <div className="retro-stats" style={{ position: "relative" }}>
          {/* CryptoSpinner overlay for stats section */}
          {(showStatsSpinner || isCheckingActiveGames) && (
            <div className="stats-spinner-container">
              <CryptoSpinner
                isActive={true}
                isDarkTheme={settings.theme === "dark"}
                inStatsContainer={true}
              />
              <div className="calculating-text">
                {isCheckingActiveGames
                  ? "CHECKING GAME DATA"
                  : "CALCULATING SCORE"}
              </div>
            </div>
          )}

          {/* Top row with time and mistakes */}
          <div className="stat-row">
            <div className="stat-item">TIME: {formatTime()}</div>
            <div className="stat-item">
              HINT TOKENS USED : {mistakes}/{maxMistakes - 1}
            </div>
          </div>

          {/* Score row - now separate from time/mistakes */}
          <div className="stat-row score-row" style={{ marginTop: "8px" }}>
            {hasLost ? (
              <div className="stat-item score">
                SOLVED: {calculatePercentageSolved()}%
              </div>
            ) : (
              <>
                {/* Score as sole item */}
                <div
                  className="stat-item score"
                  style={{ width: "100%", textAlign: "center" }}
                >
                  SCORE: {baseScore}
                  {hasStreakBonus && (
                    <span className="streak-bonus-tag">+{bonusAmount}</span>
                  )}
                  {hasStreakBonus && (
                    <span className="streak-bonus-tag">={score}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Login prompt for anonymous users */}
        {wasAnonymous && (
          <div className="anon-message">
            ⚠️ Score not recorded. Login before your next game to save scores.
            <button
              className="game-over-action-button login-hint"
              onClick={openLogin}
            >
              <div className="game-over-text-display">LOGIN</div>
            </button>
          </div>
        )}

        {/* Action buttons using hint button styling */}
        <div className="retro-actions">
          <button
            className="game-over-action-button play-again"
            onClick={handlePlayAgain}
            disabled={isCheckingActiveGames}
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
                "I'm enjoying decodey and I think you'll like it too! Check it out at:";
              const url = "https://decodey.game";
              if (navigator.share) {
                navigator.share({
                  title: "decodey",
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
      </div>
    </div>
  );
};

export default WinCelebration;
