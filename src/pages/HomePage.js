// src/pages/HomePage.js - Updated daily challenge handling
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarDay,
  FaRandom,
  FaCog,
  FaInfoCircle,
  FaTrophy,
  FaSignOutAlt,
  FaBookOpen,
  FaQuoteRight,
} from "react-icons/fa";
import useSettingsStore from "../stores/settingsStore";
import useAuthStore from "../stores/authStore";
import useUIStore from "../stores/uiStore";
import useGameService from "../hooks/useGameService";
import useDeviceDetection from "../hooks/useDeviceDetection";
import "../Styles/HomePage.css";
import useGameStore from "../stores/gameStore";

const HomePage = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { logout, startDailyChallenge, initializeGame, continueGame } =
    useGameService();
  const { isLandscape } = useDeviceDetection();

  // UI actions
  const openSettings = useUIStore((state) => state.openSettings);
  const openAbout = useUIStore((state) => state.openAbout);

  // Navigation handlers - updated daily challenge to start directly
  const handleDailyChallenge = async () => {
    try {
      console.log("Starting daily challenge from HomePage");
      const result = await startDailyChallenge();

      if (result.success) {
        // Just navigate to the game - daily challenge is already initialized
        navigate("/");
      } else if (result.alreadyCompleted) {
        // If already completed, navigate with state to show notification
        navigate("/", {
          state: {
            dailyCompleted: true,
            completionData: result.completionData,
          },
        });
      } else {
        // On error, show error message
        console.error("Failed to start daily challenge:", result.error);
        alert("Could not start daily challenge. Please try again.");
        // Still navigate to main game as fallback
        navigate("/");
      }
    } catch (error) {
      console.error("Error starting daily challenge:", error);
      alert("Error starting daily challenge. Please try again.");
      // Still navigate to main game as fallback
      navigate("/");
    }
  };

  const handleCustomGame = async () => {
    console.log("Custom Game clicked in HomePage");

    // For authenticated users, check for active game first
    if (isAuthenticated) {
      try {
        // Try to continue game - this will trigger continue prompt if active game exists
        const result = await continueGame();

        if (result.success) {
          // Just navigate to the game page, modal will show if there's an active game
          navigate("/");
          return;
        }
      } catch (error) {
        console.error("Error checking for active game:", error);
      }
    }

    // No active game or error checking - start a new custom game
    try {
      // First reset the game
      useGameStore.getState().resetGame();

      // Start a new custom game
      const result = await initializeGame({
        longText: settings?.longText || false,
        hardcoreMode: settings?.hardcoreMode || false,
        customGameRequested: true,
      });

      if (result.success) {
        // Navigate to the game page
        navigate("/");
      } else {
        console.error(
          "Failed to start custom game:",
          result.error || result.reason,
        );
        // Fallback to simple navigation
        navigate("/");
      }
    } catch (error) {
      console.error("Error starting custom game:", error);
      navigate("/");
    }
  };

  const handleLeaderboard = () => {
    navigate("/leaderboard");
  };

  const handleLogout = async () => {
    await logout(false); // Don't auto-start a new game
    window.location.href = "/"; // Full page refresh to ensure clean state
  };

  // Reset tutorial
  const handleRewatchTutorial = () => {
    localStorage.removeItem("tutorial-completed");
    localStorage.removeItem("tutorial-started");
    navigate("/"); // Navigate to game to show tutorial
  };

  // Handle quote feedback with robust fallback
  const handleQuoteFeedback = (e) => {
    e.preventDefault();
    const subject = "decodey Quote Feedback";
    const body =
      "I'd like to provide feedback about a quote:\n\n" +
      "Type (suggestion/removal/correction): \n" +
      "Quote: \n" +
      "Reason: \n";

    window.open(
      `mailto:quotes@mail.decodey.game?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  };

  return (
    <div
      className={`home-page ${settings?.theme === "dark" ? "dark-theme" : ""}`}
    >
      <div className="home-content">
        <h1 className="retro-title">decodey</h1>
        <div
          className={`home-menu ${isLandscape ? "landscape-grid" : ""} ${isAuthenticated ? "eight-items" : "seven-items"}`}
        >
          {/* Daily Challenge */}
          <button className="home-button daily" onClick={handleDailyChallenge}>
            <FaCalendarDay className="button-icon" />
            <span>Daily Challenge</span>
          </button>

          {/* Custom Game */}
          <button className="home-button custom" onClick={handleCustomGame}>
            <FaRandom className="button-icon" />
            <span>Custom Game</span>
          </button>

          {/* Leaderboard */}
          <button
            className="home-button leaderboard"
            onClick={handleLeaderboard}
          >
            <FaTrophy className="button-icon" />
            <span>Leaderboard</span>
          </button>

          {/* Settings */}
          <button className="home-button settings" onClick={openSettings}>
            <FaCog className="button-icon" />
            <span>Settings</span>
          </button>

          {/* Tutorial */}
          <button
            className="home-button tutorial"
            onClick={handleRewatchTutorial}
          >
            <FaBookOpen className="button-icon" />
            <span>Rewatch Tutorial</span>
          </button>

          {/* Quote Feedback - new button */}
          <button className="home-button quote" onClick={handleQuoteFeedback}>
            <FaQuoteRight className="button-icon" />
            <span>Quote Feedback</span>
          </button>

          {/* About */}
          <button className="home-button about" onClick={openAbout}>
            <FaInfoCircle className="button-icon" />
            <span>About</span>
          </button>

          {/* Logout button if authenticated */}
          {isAuthenticated && (
            <button className="home-button logout" onClick={handleLogout}>
              <FaSignOutAlt className="button-icon" />
              <span>Logout</span>
            </button>
          )}

          {/* No placeholder needed - grid will handle the layout */}
        </div>

        <div className="home-footer">
          <p>Break the code. Decrypt the quote.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
