// src/components/modals/WinCelebration.js
import React, { useState, useEffect, useCallback } from "react";
import MatrixRain from "../effects/MatrixRain";
import "../../Styles/WinCelebration.css";
import useAuthStore from "../../stores/authStore";
import useUIStore from "../../stores/uiStore";
import useGameStore from "../../stores/gameStore";
import useSettingsStore from "../../stores/settingsStore";
import { FaXTwitter } from "react-icons/fa6";

const WinCelebration = ({ playSound, winData }) => {
  // Get auth state from store
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Get UI actions from store
  const openLogin = useUIStore((state) => state.openLogin);

  // Get game actions from store
  const resetAndStartNewGame = useGameStore(
    (state) => state.resetAndStartNewGame,
  );
  const isResetting = useGameStore((state) => state.isResetting);

  // Get settings from store
  const settings = useSettingsStore((state) => state.settings);

  // Local state
  const [showMatrixRain, setShowMatrixRain] = useState(true);
  const [isMatrixActive, setIsMatrixActive] = useState(true);
  const [animationStage, setAnimationStage] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [isStartingNewGame, setIsStartingNewGame] = useState(false);
  const [wasAnonymousGame, setWasAnonymousGame] = useState(!isAuthenticated);

  const getShareUrl = (score, difficulty, rating, hardcoreMode) => {
    // Create a message to share
    const message = `I scored ${score} points on Uncrypt${hardcoreMode ? " (Hardcore Mode)" : ""} with a "${rating}" rating! Can you beat my score? Play at`;
    const url = "https://decodey.game"; // Replace with your actual game URL

    // Encode the message for URL
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`;
  };
  // Only set wasAnonymousGame once on mount
  useEffect(() => {
    setWasAnonymousGame(!isAuthenticated);
  }, []);

  // Unpack win data received from backend with safe defaults
  const {
    score = 0,
    mistakes = 0,
    maxMistakes = 5,
    gameTimeSeconds = 0,
    rating = "Cryptanalyst",
    encrypted = "",
    display = "",
    attribution = {},
    scoreStatus = {
      recorded: !wasAnonymousGame,
      message: wasAnonymousGame
        ? "Score not recorded - anonymous game"
        : "Score recorded successfully!",
    },
  } = winData || {};

  // Format time for display
  const minutes = Math.floor(gameTimeSeconds / 60);
  const seconds = gameTimeSeconds % 60;
  const timeString = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;

  // Get matrix color based on textColor
  const matrixColor =
    settings.textColor === "scifi-blue"
      ? "#4cc9f0"
      : settings.textColor === "retro-green"
        ? "#00ff41"
        : "#00ff41";

  // Get the decrypted text in proper case
  const getDecryptedText = useCallback(() => {
    // If display is available, use it as a base but convert to proper case
    if (display) {
      // Convert to lowercase first then capitalize where needed
      return display
        .toLowerCase()
        .replace(/([.!?]\s*\w|^\w)/g, (match) => match.toUpperCase());
    }
    return ""; // Fallback
  }, [display]);

  // Improved Play Again handler
  const handlePlayAgain = useCallback(async () => {
    // Prevent multiple clicks
    if (isStartingNewGame) return;
    setIsStartingNewGame(true);

    try {
      // Start a new game with the current settings
      if (typeof resetAndStartNewGame === "function") {
        console.log("Starting new game after win");
        await resetAndStartNewGame(
          settings.longText === true,
          settings.hardcoreMode === true,
        );
      }
    } catch (error) {
      console.error("Error starting new game:", error);
    } finally {
      setIsStartingNewGame(false);
    }
  }, [
    isStartingNewGame,
    resetAndStartNewGame,
    settings.longText,
    settings.hardcoreMode,
  ]);

  // Staged animation sequence - only run once on mount with fixed dependencies
  useEffect(() => {
    // Initial animation
    const timeline = [
      () => {
        // Play win sound and start animation immediately
        if (typeof playSound === "function") {
          playSound("win");
        }
      },
      () => {
        // Show message with animation
        const victoryMessage = document.querySelector(".victory-message");
        if (victoryMessage) {
          victoryMessage.classList.add("animate-scale-in");
        }
      },
      () => {
        // Show stats with animation
        setShowStats(true);
        const statsContainer = document.querySelector(".stats-container");
        if (statsContainer) {
          statsContainer.classList.add("animate-slide-in");
        }
      },
      () => {
        // Gradually reduce matrix rain intensity
        setTimeout(() => {
          setIsMatrixActive(false);
        }, 1000);
      },
    ];

    // Execute the first animation step immediately
    timeline[0]();

    // Set up timers for the rest of the animation sequence
    const timers = [
      setTimeout(() => timeline[1](), 300),
      setTimeout(() => timeline[2](), 600),
      setTimeout(() => timeline[3](), 1200),
    ];

    // Clean up all timers
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []); // Empty dependency array ensures this only runs once on mount

  // Force show stats after a delay (backup)
  useEffect(() => {
    const forceShowStatsTimer = setTimeout(() => {
      if (!showStats) {
        setShowStats(true);
      }
    }, 1000);

    return () => clearTimeout(forceShowStatsTimer);
  }, []);

  // Clean up animations after some time
  useEffect(() => {
    const cleanupTimer = setTimeout(() => {
      setShowMatrixRain(false);
    }, 10000);

    return () => clearTimeout(cleanupTimer);
  }, []);

  // Handle login button click
  const handleLoginClick = useCallback(() => {
    if (typeof openLogin === "function") {
      openLogin();
    }
  }, [openLogin]);

  return (
    <div
      className={`win-celebration ${settings.theme === "dark" ? "dark-theme" : "light-theme"} text-${settings.textColor}`}
    >
      {/* Matrix Rain effect */}
      {showMatrixRain && (
        <MatrixRain active={isMatrixActive} color={matrixColor} density={70} />
      )}

      {/* Main celebration content */}
      <div className="celebration-content">
        {/* Victory message */}
        <div className="victory-message">
          <h2 className="victory-title">Solved! Rating: </h2>
          <h2 className="victory-title">{rating || "Cryptanalyst"}</h2>

          {/* Display the original quote and attribution */}
          <div className="quote-container">
            <p className="decrypted-quote">
              {getDecryptedText()}
              {attribution?.major_attribution && (
                <> — {attribution.major_attribution}</>
              )}
              {attribution?.minor_attribution && (
                <> , {attribution.minor_attribution}</>
              )}
            </p>
          </div>
        </div>

        {/* Stats display */}
        <div
          className={`stats-container ${showStats ? "animate-slide-in" : ""}`}
          style={{
            opacity: showStats ? 1 : 0,
            transition: "opacity 0.8s ease-out",
          }}
        >
          <div className="stat-item">
            <span className="stat-label">Time</span>
            <span className="stat-value">{timeString}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Mistakes</span>
            <span className="stat-value">
              {mistakes} / {maxMistakes}
            </span>
          </div>
          <div className="stat-item score">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="celebration-actions">
          <button
            className="play-again-button"
            onClick={handlePlayAgain}
            disabled={isStartingNewGame || isResetting}
          >
            {isStartingNewGame ? "Starting..." : "Play Again"}
          </button>
          {/* Share on X button */}
          <button
            className="share-button"
            onClick={() =>
              window.open(
                getShareUrl(
                  winData.score,
                  winData.difficulty || "normal",
                  winData.rating || "Cryptanalyst",
                  winData.hardcoreMode || false,
                ),
                "_blank",
              )
            }
          >
            <FaXTwitter /> Share on X
          </button>
          {/* Simplified score status message */}
          <div className="score-section">
            {!wasAnonymousGame ? (
              <p className="score-success">{scoreStatus.message}</p>
            ) : (
              <div className="login-prompt">
                <p className="anon-score-message">
                  <span className="warning-icon">⚠️</span> Your score was not
                  recorded. To record scores and track streaks, you must be
                  logged in <strong>before</strong> starting a game.
                </p>
                <button onClick={handleLoginClick} className="login-button">
                  Login for Your Next Game
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WinCelebration;
