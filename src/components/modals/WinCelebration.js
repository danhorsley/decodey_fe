// src/components/modals/WinCelebration.js
import React, { useState, useEffect } from "react";
import MatrixRain from "../effects/MatrixRain";
import "../../Styles/WinCelebration.css";
import { useAuth } from "../../context/AuthContext";
import { useModalContext } from "./ModalManager";
import { useGameState } from "../../context/GameStateContext"; // Add this import

const WinCelebration = ({
  startGame,
  playSound,
  winData,
  theme,
  textColor,
}) => {
  const { isAuthenticated } = useAuth();
  const { openLogin } = useModalContext();
  // Get reset functions from GameStateContext
  const { resetGame, resetComplete, isResetting } = useGameState();
  const [loading, setLoading] = useState(true);

  // Store whether this game was originally played anonymously
  // This ensures we maintain the correct message even after login
  const [wasAnonymousGame, setWasAnonymousGame] = useState(true);

  // Animation state
  const [animationStage, setAnimationStage] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showMatrixRain, setShowMatrixRain] = useState(true);
  const [showFireworks, setShowFireworks] = useState(false);
  const [isMatrixActive, setIsMatrixActive] = useState(true);
  // Add a state to track if we're in the process of starting a new game
  const [isStartingNewGame, setIsStartingNewGame] = useState(false);

  // Set wasAnonymousGame when component mounts - will not change even if user logs in later
  useEffect(() => {
    setWasAnonymousGame(!isAuthenticated);
  }, []);

  // Unpack win data received from backend
  const {
    score,
    mistakes,
    maxMistakes,
    gameTimeSeconds,
    rating,
    encrypted,
    display,
    attribution,
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
    textColor === "scifi-blue"
      ? "#4cc9f0"
      : textColor === "retro-green"
        ? "#00ff41"
        : "#00ff41";

  // Get the decrypted text in proper case
  const getDecryptedText = () => {
    // If display is available, use it as a base but convert to proper case
    if (display) {
      // Convert to lowercase first then capitalize where needed
      return display
        .toLowerCase()
        .replace(/([.!?]\s*\w|^\w)/g, (match) => match.toUpperCase());
    }
    return ""; // Fallback
  };

  // Improved Play Again handler
  const handlePlayAgain = async () => {
    // Prevent multiple clicks
    if (isStartingNewGame) return;
    setIsStartingNewGame(true);
    setLoading(true);

    try {
      // Instead of complex state management, just close the modal and start a new game
      resetGame();
      if (typeof startGame === "function") {
        startGame();
      }
    } catch (error) {
      console.error("Error starting new game:", error);
    } finally {
      setIsStartingNewGame(false);
    }
  };

  // Staged animation sequence
  useEffect(() => {
    // Initial animation
    const timeline = [
      () => {
        // Play win sound and start matrix rain immediately
        playSound("win");
        setShowFireworks(true);
      },
      () => {
        // Show message with animation immediately
        document
          .querySelector(".victory-message")
          ?.classList.add("animate-scale-in");
      },
      () => {
        // Show stats with animation
        setShowStats(true);
        document
          .querySelector(".stats-container")
          ?.classList.add("animate-slide-in");
      },
      () => {
        // Gradually reduce matrix rain intensity
        setTimeout(() => {
          setIsMatrixActive(false);
        }, 1000);
      },
    ];

    // Execute animation stages with delays
    if (animationStage < timeline.length) {
      timeline[animationStage]();
      const nextStage = setTimeout(
        () => {
          setAnimationStage(animationStage + 1);
        },
        animationStage === 0 ? 100 : 300,
      );

      return () => clearTimeout(nextStage);
    }
  }, [animationStage, playSound]);

  // Force show stats after a delay (backup)
  useEffect(() => {
    const forceShowStats = setTimeout(() => {
      if (!showStats) {
        setShowStats(true);
      }
    }, 1000);

    return () => clearTimeout(forceShowStats);
  }, [showStats]);

  // Clean up animations after some time
  useEffect(() => {
    const cleanupTimer = setTimeout(() => {
      setShowMatrixRain(false);
      setShowFireworks(false);
    }, 10000);

    return () => clearTimeout(cleanupTimer);
  }, []);

  // Handle login button click
  const handleLoginClick = () => {
    openLogin();
  };

  return (
    <div
      className={`win-celebration ${theme === "dark" ? "dark-theme" : "light-theme"} text-${textColor}`}
    >
      {/* Matrix Rain effect */}
      {showMatrixRain && (
        <MatrixRain active={isMatrixActive} color={matrixColor} density={70} />
      )}

      {/* Fireworks effect */}
      {showFireworks && (
        <div className="fireworks-container">
          <div className="firework"></div>
          <div className="firework delayed"></div>
          <div className="firework delayed-2"></div>
        </div>
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
