import React, { useState, useEffect, useRef, useCallback } from "react";
import MatrixRain from "../../components/effects/MatrixRain";
import config from "../../config";
import "../../Styles/WinCelebration.css";
import {
  getDifficultyFromMaxMistakes,
  calculateScore,
} from "../../utils/utils";
import apiService from "../../services/apiService";
import { useAppContext } from "../../context/AppContext";

// Enhanced win celebration component with Matrix effect
const WinCelebration = ({
  startGame,
  playSound,
  mistakes,
  maxMistakes,
  startTime,
  completionTime,
  theme,
  textColor,
  encrypted = "",
  display = "",
  correctlyGuessed = [],
  guessedMappings = {},
  hasWon, // Added hasWon prop
  attribution, // Added attribution prop
}) => {
  const { isAuthenticated, openLogin } = useAppContext();
  const [scoreStatus, setScoreStatus] = useState({
    attempted: false,
    recorded: false,
    error: null,
    authRequired: false,
  });

  const handleRetryScoreSubmit = useCallback(() => {
    setScoreStatus({
      attempted: false,
      recorded: false,
      error: null,
      authRequired: false,
    });
  }, []);

  // Handle login and then retry score recording
  const handleLoginAndRecordScore = useCallback(() => {
    // Open the login modal
    openLogin();

    // Reset score status so it will be attempted again after login
    setScoreStatus({
      attempted: false,
      recorded: false,
      error: null,
      authRequired: false,
    });
  }, [openLogin]);

  // Animation state
  const [animationStage, setAnimationStage] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showMatrixRain, setShowMatrixRain] = useState(true);
  const [showFireworks, setShowFireworks] = useState(false);
  const [isMatrixActive, setIsMatrixActive] = useState(true);

  // Attribution state - now using prop
  const [attributionData, setAttributionData] = useState({
    major: "",
    minor: "",
  });

  // Get matrix color based on textColor
  const matrixColor =
    textColor === "scifi-blue"
      ? "#4cc9f0"
      : textColor === "retro-green"
        ? "#00ff41"
        : "#00ff41";

  // Refs for animation
  const statsRef = useRef(null);
  const messageRef = useRef(null);
  const containerRef = useRef(null);

  // Calculate stats
  const gameTimeSeconds =
    startTime && completionTime
      ? Math.floor((completionTime - startTime) / 1000)
      : 0;
  const minutes = Math.floor(gameTimeSeconds / 60);
  const seconds = gameTimeSeconds % 60;
  const timeString = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;

  // Calculate score based on mistakes and time
  const maxScore = 1000;
  const mistakePenalty = 50;
  const timePenalty = 2; // points per second
  const score = Math.max(
    0,
    maxScore - mistakes * mistakePenalty - gameTimeSeconds * timePenalty,
  );

  // Performance rating based on score
  let rating = "";
  if (score >= 900) rating = "Perfect";
  else if (score >= 800) rating = "Ace of Spies";
  else if (score >= 700) rating = "Bletchley Park";
  else if (score >= 500) rating = "Cabinet Noir";
  else rating = "Cryptanalyst";

  // Get the decrypted text in proper case
  const getDecryptedText = () => {
    // If display is available, use it as a base but convert to proper case
    if (display) {
      // Convert to lowercase first then capitalize where needed
      return display
        .toLowerCase()
        .replace(/([.!?]\s*\w|^\w)/g, (match) => match.toUpperCase());
    }

    // Fallback: Try to reconstruct from encrypted and mappings
    try {
      const decrypted = encrypted.replace(/[A-Z]/g, (match) => {
        // Find this encrypted letter's original letter
        for (const [enc, orig] of Object.entries(guessedMappings)) {
          if (enc === match) return orig;
        }
        return match; // Return the encrypted letter if mapping not found
      });
      // Convert to lowercase first then capitalize where needed
      return decrypted
        .toLowerCase()
        .replace(/([.!?]\s*\w|^\w)/g, (match) => match.toUpperCase());
    } catch (error) {
      console.error("Error generating decrypted text:", error);
      return encrypted || "Error displaying text";
    }
  };

  // Use attribution data passed as a prop or set a default
  useEffect(() => {
    if (animationStage >= 3) {
      // Assuming animationStage 3 is a suitable point
      if (attribution) {
        console.log("Attribution data received:", attribution);
        setAttributionData(attribution);
      } else {
        // Set default values if no attribution provided
        setAttributionData({
          major_attribution: "Unknown",
          minor_attribution: "",
        });
      }
    }
  }, [animationStage, attribution]);

  // Staged animation sequence
  useEffect(() => {
    console.log("Running animation stage:", animationStage);

    // Initial animation
    const timeline = [
      () => {
        // Play win sound and start matrix rain immediately
        playSound("win");
        setShowFireworks(true); // Show fireworks immediately
        console.log("Stage 0: Playing win sound and showing fireworks");
      },
      () => {
        // Show message with animation immediately
        if (messageRef.current) {
          messageRef.current.classList.add("animate-scale-in");
          console.log("Stage 1: Message animation added");
        }
      },
      () => {
        // Show stats with animation
        setShowStats(true);
        console.log("Stage 2: Setting show stats to true");

        if (statsRef.current) {
          statsRef.current.classList.add("animate-slide-in");
          console.log("Stats animation class added");
        } else {
          console.log("Stats ref is null");
        }
      },
      () => {
        // Gradually reduce matrix rain intensity
        console.log("Stage 3: Reducing matrix rain");
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
      ); // Reduced delays for quicker appearance

      return () => clearTimeout(nextStage);
    }
  }, [animationStage, playSound]);

  // Force show stats after a delay (backup)
  useEffect(() => {
    const forceShowStats = setTimeout(() => {
      if (!showStats) {
        console.log("Force showing stats after timeout");
        setShowStats(true);
      }
    }, 1000); // Reduced from 2000 to make it appear faster

    return () => clearTimeout(forceShowStats);
  }, [showStats]);

  // Clean up animations after some time
  useEffect(() => {
    const cleanupTimer = setTimeout(() => {
      setShowMatrixRain(false);
      setShowFireworks(false);
    }, 10000); // Stop animations after 10 seconds

    return () => clearTimeout(cleanupTimer);
  }, []);

  // Record score to backend
  useEffect(() => {
    const recordGameScore = async () => {
      // Only proceed if user has won and hasn't attempted to record score yet
      if (hasWon && !scoreStatus.attempted) {
        setScoreStatus((prev) => ({ ...prev, attempted: true }));

        try {
          // Calculate score based on mistakes and time
          const gameTimeSeconds = (completionTime - startTime) / 1000;
          const score = calculateScore(maxMistakes, mistakes, gameTimeSeconds);

          const gameData = {
            score,
            mistakes,
            timeTaken: Math.round(gameTimeSeconds),
            difficulty: getDifficultyFromMaxMistakes(maxMistakes),
          };

          const result = await apiService.recordScore(gameData);

          if (result.success) {
            setScoreStatus((prev) => ({ ...prev, recorded: true }));
            console.log("Score recorded successfully:", result);
          } else if (result.authRequired) {
            // Score couldn't be recorded because user is not authenticated
            setScoreStatus((prev) => ({
              ...prev,
              error: "Login required to record your score",
              authRequired: true,
            }));
          } else {
            throw new Error(result.error || "Failed to record score");
          }
        } catch (error) {
          console.error("Failed to record score:", error);
          setScoreStatus((prev) => ({
            ...prev,
            error: "Failed to record score. Please try again.",
          }));
        }
      }
    };

    // Only attempt to record score if this is a win celebration
    if (hasWon) {
      recordGameScore();
    }
  }, [
    hasWon,
    scoreStatus.attempted,
    isAuthenticated,
    mistakes,
    maxMistakes,
    startTime,
    completionTime,
  ]);

  return (
    <div
      ref={containerRef}
      className={`win-celebration ${theme === "dark" ? "dark-theme" : "light-theme"} text-${textColor} ${hasWon ? "" : "game-over-container"}`}
      style={{
        zIndex: 1200,
      }} /* Ensure this is higher than any other content */
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
      <div
        className={`celebration-content ${hasWon ? "" : "game-over-message"}`}
        style={{ zIndex: 1500 }}
      >
        {/* Victory message */}
        <div ref={messageRef} className="victory-message">
          <h2 className="victory-title">Solved! Rating: </h2>
          <h2 className="victory-title">{rating}</h2>

          {/* Display the original quote and attribution */}
          <div className="quote-container">
            <p className="decrypted-quote">
              {getDecryptedText()}
              {attributionData && attributionData.major_attribution && (
                <> — {attributionData.major_attribution}</>
              )}
              {attributionData && attributionData.minor_attribution && (
                <> , {attributionData.minor_attribution}</>
              )}
            </p>
          </div>
        </div>

        {/* Stats display - now with inline style fallback */}
        <div
          ref={statsRef}
          className={`stats-container ${showStats ? "animate-slide-in" : ""}`}
          style={{
            opacity: showStats ? 1 : 0,
            transition: "opacity 0.8s ease-out",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "20px",
            margin: "25px 0",
            color: theme === "dark" ? "white" : "#333",
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
          {/* <SaveButton hasWon={true} playSound={playSound} /> */}
          <button
            className="play-again-button button"
            onClick={startGame}
            style={{ color: textColor === "retro-green" ? "#003b00" : "white" }}
          >
            Play Again
          </button>

          {/* Score recording status - now without redundant hasWon check */}
          <div className="score-section">
            {isAuthenticated ? (
              scoreStatus.recorded ? (
                <p className="score-success">Your score has been recorded!</p>
              ) : scoreStatus.error ? (
                <>
                  <p className="score-error">{scoreStatus.error}</p>
                  <button
                    onClick={handleRetryScoreSubmit}
                    className="retry-button"
                  >
                    Try Again
                  </button>
                </>
              ) : (
                <p className="score-recording">Recording your score...</p>
              )
            ) : scoreStatus.authRequired ? (
              <div className="login-prompt">
                <p>Login to save your score to the leaderboard!</p>
                <button
                  onClick={handleLoginAndRecordScore}
                  className="login-button"
                >
                  Login or Create Account
                </button>
              </div>
            ) : (
              <div className="login-prompt">
                <p>Login to save your score to the leaderboard!</p>
                <button onClick={openLogin} className="login-button">
                  Login or Create Account
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
