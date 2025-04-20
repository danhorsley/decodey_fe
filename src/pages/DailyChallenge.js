// src/pages/DailyChallenge.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useGameSession from "../hooks/useGameSession";
import useSettingsStore from "../stores/settingsStore";
import useAuthStore from "../stores/authStore";
import HeaderControls from "../components/HeaderControls";
import MatrixRainLoading from "../components/effects/MatrixRainLoading";
import useGameStore from "../stores/gameStore";
import apiService from "../services/apiService";
/**
 * Daily Challenge Page
 * This page handles checking daily completion status and redirecting to the Game component
 * with daily challenge mode initialized
 */
const DailyChallenge = () => {
  const navigate = useNavigate();

  // Get auth state
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Get settings
  const settings = useSettingsStore((state) => state.settings);

  // Get game session functions
  const { startDailyChallenge, isDailyCompleted, isInitializing } =
    useGameSession();

  // Local state
  const [checking, setChecking] = useState(true);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [error, setError] = useState(null);
  const handleCustomGame = async () => {
    console.log("Custom Game clicked in Daily Challenge completion screen");

    // For authenticated users, check for active game first
    if (isAuthenticated) {
      try {
        // Check active game using apiService directly
        const response = await apiService.checkActiveGame();

        if (response && response.has_active_game) {
          // If active game exists, simply navigate to "/" which will detect
          // and show the continue prompt through the normal flow
          navigate("/");
          return;
        }
      } catch (error) {
        console.error("Error checking for active game:", error);
      }
    }

    // No active game or error checking - start a new game
    const resetAndStart = useGameStore.getState().resetAndStartNewGame;

    if (typeof resetAndStart === "function") {
      // First reset the game
      useGameStore.getState().resetGame();

      // Then start a new game with the same parameters used in HomePage
      resetAndStart(
        settings?.longText || false,
        settings?.hardcoreMode || false,
        {
          forceRender: true,
          customGameRequested: true,
        }
      );

      // Navigate to the game page
      navigate("/");
    } else {
      // Fallback to simple navigation
      navigate("/");
    }
  };
  // Check completion status on mount
  useEffect(() => {
    const checkDailyStatus = async () => {
      try {
        setChecking(true);

        // Only check completion for authenticated users
        if (isAuthenticated) {
          const result = await isDailyCompleted();

          if (result.isCompleted) {
            setAlreadyCompleted(true);
            setCompletionData(result.completion_data);
            return;
          }
        }

        // If not completed or anonymous, start the daily challenge
        const dailyResult = await startDailyChallenge();

        if (dailyResult.success) {
          // Completion check and challenge start successful, redirect to game page
          navigate("/", {
            state: {
              dailyChallenge: true,
              date: new Date().toISOString().split("T")[0],
            },
          });
        } else if (dailyResult.alreadyCompleted) {
          // Already completed (caught from start attempt)
          setAlreadyCompleted(true);
          setCompletionData(dailyResult.completionData);
        } else {
          // Some other error
          setError(dailyResult.error || "Failed to start daily challenge");
        }
      } catch (err) {
        console.error("Error in daily challenge initialization:", err);
        setError("Could not load daily challenge. Please try again.");
      } finally {
        setChecking(false);
      }
    };

    checkDailyStatus();
  }, [isAuthenticated, isDailyCompleted, startDailyChallenge, navigate]);

  // Format time for display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // If checking or initializing, show loading
  if (checking || isInitializing) {
    return (
      <div
        className={`App-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
      >
        {/* Just use a simple title without the full HeaderControls */}
        <div className="game-header">
          <h1 className="retro-title">decodey</h1>
        </div>

        <div className="loading-container">
          <h2 className="loading-title">Loading Today's Challenge</h2>
          <div className="loading-animation">
            <MatrixRainLoading
              active={true}
              color={settings?.theme === "dark" ? "#4cc9f0" : "#00ff41"}
              message="Decrypting daily puzzle..."
              width="100%"
              height="100%"
              density={50}
            />
          </div>
        </div>
      </div>
    );
  }

  // If daily is already completed, show completion info
  if (alreadyCompleted) {
    return (
      <div
        className={`App-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
      >
        <HeaderControls title="decodey" />

        <div className="daily-completed-container">
          <h2>You've already completed today's challenge!</h2>

          {completionData && (
            <div className="completion-stats">
              <p>
                You completed today's challenge in{" "}
                {formatTime(completionData.time_taken)}
              </p>
              <p>
                Score: <strong>{completionData.score}</strong>
              </p>
              <p>
                Mistakes: {completionData.mistakes} /{" "}
                {completionData.max_mistakes}
              </p>
              <p>Rating: {completionData.rating || "Cryptanalyst"}</p>
            </div>
          )}

          <div className="daily-actions">
            <button onClick={handleCustomGame}>Try a Custom Puzzle</button>

            <button
              onClick={() =>
                navigate("/leaderboard", { state: { tab: "daily" } })
              }
            >
              View Daily Leaderboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <div
        className={`App-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
      >
        <HeaderControls title="decodey" />

        <div className="error-container">
          <h2 className="error-title">Oops!</h2>
          <p className="error-message">{error}</p>
          <button
            className="try-again-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Default - should normally redirect before reaching this
  return (
    <div
      className={`App-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
    >
      <HeaderControls title="decodey" />
      <p>Redirecting to today's challenge...</p>
    </div>
  );
};

export default DailyChallenge;
