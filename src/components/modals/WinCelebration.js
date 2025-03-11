import React, { useState, useEffect, useRef, useCallback } from "react";
import MatrixRain from "../../components/effects/MatrixRain";
import config from "../../config";
import "../../Styles/WinCelebration.css";
import {
  getDifficultyFromMaxMistakes,
  calculateScore,
} from "../../utils/utils";
import scoreService from "../../services/scoreService";
import { isOnline } from "../../utils/networkUtils";
import { useAuth } from "../../context/AuthContext";
import { useModalContext } from "../modals/ModalManager";

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
  // Get authentication state directly from the auth context
  const { isAuthenticated } = useAuth();
  // Get modal functions from the modal context
  const { openLogin } = useModalContext();

  const [scoreStatus, setScoreStatus] = useState({
    attempted: false,
    recorded: false,
    error: null,
    authRequired: false,
    queued: false,
    pendingCount: 0,
    retrying: false,
    message: null,
  });

  // Enhanced retry function that attempts to submit immediately
  const handleRetryScoreSubmit = useCallback(async () => {
    // Reset error state
    setScoreStatus((prev) => ({
      ...prev,
      error: null,
      retrying: true,
    }));

    // If we're not authenticated, show login prompt
    if (!isAuthenticated) {
      setScoreStatus((prev) => ({
        ...prev,
        authRequired: true,
        message: "Login to save your score!",
        retrying: false,
      }));
      return;
    }

    // If we're offline, alert the user
    if (!isOnline()) {
      setScoreStatus((prev) => ({
        ...prev,
        retrying: false,
        message: "Currently offline. Score will be submitted when online.",
      }));
      return;
    }

    try {
      // Try to submit pending scores if any exist
      const pendingCount = scoreService.getPendingCount();

      if (pendingCount > 0) {
        // Try to submit pending scores
        const result = await scoreService.submitPendingScores(isAuthenticated);

        if (result.success) {
          setScoreStatus((prev) => ({
            ...prev,
            recorded: true,
            retrying: false,
            message:
              result.message ||
              `${result.submitted} score(s) submitted successfully.`,
          }));
        } else if (result.submitted > 0) {
          // Partial success
          setScoreStatus((prev) => ({
            ...prev,
            retrying: false,
            queued: result.remaining > 0,
            pendingCount: result.remaining,
            message:
              result.message ||
              `${result.submitted} score(s) submitted. ${result.remaining} still pending.`,
          }));
        } else {
          // No success
          setScoreStatus((prev) => ({
            ...prev,
            retrying: false,
            error:
              result.message || "Failed to submit scores. Will retry later.",
          }));
        }
      } else if (scoreStatus.attempted && !scoreStatus.recorded) {
        // No pending scores but we haven't recorded current score
        // Try again from scratch
        setScoreStatus({
          attempted: false,
          recorded: false,
          error: null,
          authRequired: false,
          retrying: false,
        });
      } else {
        // Nothing to retry
        setScoreStatus((prev) => ({
          ...prev,
          retrying: false,
          message: "No pending scores to submit.",
        }));
      }
    } catch (error) {
      console.error("Error retrying score submission:", error);
      setScoreStatus((prev) => ({
        ...prev,
        retrying: false,
        error: "Failed to submit scores. Please try again later.",
      }));
    }
  }, [isAuthenticated, scoreStatus.attempted, scoreStatus.recorded]);

  // Handle login and then retry score recording
  const handleLoginAndRecordScore = useCallback(() => {
    // Open the login modal
    openLogin();

    // Reset score status so it will be attempted again after login
    setScoreStatus({
      attempted: false,
      recorded: false,
      queued: scoreService.getPendingCount() > 0,
      pendingCount: scoreService.getPendingCount(),
      error: null,
      authRequired: false,
    });
  }, [openLogin]);

  // Effect to detect auth state changes and retry score recording if needed
  useEffect(() => {
    // If user just logged in and previously needed authentication
    if (isAuthenticated && scoreStatus.authRequired) {
      console.log(
        "Auth state changed to authenticated, retrying score recording",
      );

      // Reset score status to trigger re-attempt
      setScoreStatus({
        attempted: false,
        recorded: false,
        error: null,
        authRequired: false,
      });
    }
  }, [isAuthenticated, scoreStatus.authRequired]);

  // Record score to backend with proper auth state and offline handling
  useEffect(() => {
    const recordGameScore = async () => {
      // Only proceed if user has won and hasn't attempted to record score yet
      if (hasWon && !scoreStatus.attempted) {
        // Check auth state at the moment of execution
        const currentIsAuthenticated = isAuthenticated;
        const networkAvailable = isOnline();

        console.log("Attempting to record score:", {
          isAuthenticated: currentIsAuthenticated,
          networkAvailable,
          pendingScores: scoreService.getPendingCount(),
        });

        // Mark as attempted regardless of auth state or network
        setScoreStatus((prev) => ({ ...prev, attempted: true }));

        // Calculate score based on mistakes and time
        const gameTimeSeconds = (completionTime - startTime) / 1000;
        const score = calculateScore(maxMistakes, mistakes, gameTimeSeconds);

        const gameData = {
          score,
          mistakes,
          timeTaken: Math.round(gameTimeSeconds),
          difficulty: getDifficultyFromMaxMistakes(maxMistakes),
          timestamp: Date.now(), // Add timestamp to track when score was earned
        };

        console.log("Recording score with data:", gameData);

        try {
          // Use new scoreService which handles both online and offline cases
          const result = await scoreService.submitScore(
            gameData,
            currentIsAuthenticated,
          );
          console.log("Score submission result:", result);

          if (result.success) {
            // Successfully submitted to server
            setScoreStatus((prev) => ({
              ...prev,
              recorded: true,
              message: result.message || "Score recorded successfully!",
            }));
          } else if (result.queued) {
            // Saved to queue (offline or other error)
            setScoreStatus((prev) => ({
              ...prev,
              queued: true,
              pendingCount: result.pendingCount || 1,
              message:
                result.message ||
                "Score saved offline. Will submit when online.",
            }));
          } else if (result.authRequired) {
            // Authentication required
            setScoreStatus((prev) => ({
              ...prev,
              authRequired: true,
              queued: true,
              pendingCount: result.pendingCount || 1,
              message: "Login to save your score!",
            }));
          } else {
            // Other error
            throw new Error(result.error || "Failed to record score");
          }
        } catch (error) {
          console.error("Error recording score:", error);
          setScoreStatus((prev) => ({
            ...prev,
            error: error.message || "Failed to record score. Will retry later.",
          }));
        }
      }
    };

    recordGameScore();
  }, [
    hasWon,
    scoreStatus.attempted,
    isAuthenticated, // Keep this in dependencies to retrigger if auth changes
    mistakes,
    maxMistakes,
    startTime,
    completionTime,
  ]);

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

          {/* Score recording status */}
          <div className="score-section">
            {isAuthenticated ? (
              scoreStatus.recorded ? (
                <p className="score-success">Your score has been recorded!</p>
              ) : scoreStatus.retrying ? (
                <p className="score-recording">Submitting scores...</p>
              ) : scoreStatus.queued ? (
                <div className="score-queued">
                  <p>
                    {scoreStatus.message ||
                      `Score saved offline (${scoreStatus.pendingCount} pending).`}
                  </p>
                  <button
                    onClick={handleRetryScoreSubmit}
                    className="retry-button"
                    disabled={!isOnline()}
                  >
                    Submit Now
                  </button>
                </div>
              ) : scoreStatus.error ? (
                <div className="score-error">
                  <p>{scoreStatus.error}</p>
                  <button
                    onClick={handleRetryScoreSubmit}
                    className="retry-button"
                  >
                    Try Again
                  </button>
                </div>
              ) : scoreStatus.attempted ? (
                <p className="score-recording">Recording your score...</p>
              ) : null
            ) : scoreStatus.queued ? (
              <div className="login-prompt">
                <p>
                  {scoreStatus.message ||
                    `Score saved offline (${scoreStatus.pendingCount} pending). Login to submit.`}
                </p>
                <button
                  onClick={handleLoginAndRecordScore}
                  className="login-button"
                >
                  Login or Create Account
                </button>
              </div>
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
