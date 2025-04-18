// In src/pages/HomePage.js
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarDay,
  FaRandom,
  FaCog,
  FaInfoCircle,
  FaTrophy,
  FaSignOutAlt,
  FaBookOpen, // Add this import for tutorial icon
} from "react-icons/fa";
import useSettingsStore from "../stores/settingsStore";
import useAuthStore from "../stores/authStore";
import useUIStore from "../stores/uiStore";
import useGameSession from "../hooks/useGameSession";
import "../Styles/HomePage.css";

const HomePage = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { userLogout } = useGameSession();

  // UI actions
  const openSettings = useUIStore((state) => state.openSettings);
  const openAbout = useUIStore((state) => state.openAbout);

  // Game session for starting new games
  const { startNewGame, startDailyChallenge } = useGameSession();

  // Navigation handlers
  const handleDailyChallenge = () => {
    navigate("/daily");
  };

  const handleCustomGame = async () => {
    await startNewGame({ customGameRequested: true });
    navigate("/");
  };

  const handleLeaderboard = () => {
    navigate("/leaderboard");
  };

  const handleLogout = async () => {
    await userLogout(false); // Don't auto-start a new game
    window.location.href = "/"; // Full page refresh to ensure clean state
  };

  // New function to reset tutorial
  const handleRewatchTutorial = () => {
    localStorage.removeItem("tutorial-completed");
    localStorage.removeItem("tutorial-started");
    navigate("/"); // Navigate to game to show tutorial
  };

  return (
    <div
      className={`home-page ${settings?.theme === "dark" ? "dark-theme" : ""}`}
    >
      {/* Remove HeaderControls component completely */}
      <div className="home-content">
        <h1 className="home-welcome">Welcome to Decodey</h1>
        <p className="home-tagline">What would you like to do?</p>

        <div className="home-menu">
          {/* First row: Daily Challenge and Custom Game */}
          <button className="home-button daily" onClick={handleDailyChallenge}>
            <FaCalendarDay className="button-icon" />
            <span>Daily Challenge</span>
          </button>

          <button className="home-button custom" onClick={handleCustomGame}>
            <FaRandom className="button-icon" />
            <span>Custom Game</span>
          </button>

          {/* Second row: Leaderboard, Settings, About */}
          <button
            className="home-button leaderboard"
            onClick={handleLeaderboard}
          >
            <FaTrophy className="button-icon" />
            <span>Leaderboard</span>
          </button>

          <button className="home-button settings" onClick={openSettings}>
            <FaCog className="button-icon" />
            <span>Settings</span>
          </button>

          {/* New button for rewatching tutorial */}
          <button
            className="home-button tutorial"
            onClick={handleRewatchTutorial}
          >
            <FaBookOpen className="button-icon" />
            <span>Rewatch Tutorial</span>
          </button>

          {/* About button */}
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
        </div>

        <div className="home-footer">
          <p>Break the code. Decrypt the quote.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
