// src/pages/HomePage.js
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarDay,
  FaRandom,
  FaCog,
  FaInfoCircle,
  FaTrophy,
  FaSignOutAlt,
  FaBookOpen,
} from "react-icons/fa";
import useSettingsStore from "../stores/settingsStore";
import useAuthStore from "../stores/authStore";
import useUIStore from "../stores/uiStore";
import useGameSession from "../hooks/useGameSession";
import useDeviceDetection from "../hooks/useDeviceDetection";
import "../Styles/HomePage.css";

const HomePage = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { userLogout } = useGameSession();
  const { isLandscape } = useDeviceDetection();

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

  // Reset tutorial
  const handleRewatchTutorial = () => {
    localStorage.removeItem("tutorial-completed");
    localStorage.removeItem("tutorial-started");
    navigate("/"); // Navigate to game to show tutorial
  };

  return (
    <div
      className={`home-page ${settings?.theme === "dark" ? "dark-theme" : ""}`}
    >
      <div className="home-content">
        <h1 className="retro-title">decodey</h1>

        <div className={`home-menu ${isLandscape ? "landscape-grid" : ""}`}>
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

          {/* Placeholder button for grid balance when not logged in */}
          {!isAuthenticated && <div className="home-button placeholder"></div>}
        </div>

        <div className="home-footer">
          <p>Break the code. Decrypt the quote.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
