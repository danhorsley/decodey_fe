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
  FaQuoteRight, // Added icon for quotes
} from "react-icons/fa";
import useSettingsStore from "../stores/settingsStore";
import useAuthStore from "../stores/authStore";
import useUIStore from "../stores/uiStore";
import useGameSession from "../hooks/useGameSession";
import useDeviceDetection from "../hooks/useDeviceDetection";
import "../Styles/HomePage.css";
import useGameStore from "../stores/gameStore";
import apiService from "../services/apiService";

const HomePage = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { userLogout } = useGameSession();
  const { isLandscape } = useDeviceDetection();
  const gameSession = useGameSession();
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
    console.log("Custom Game clicked in HomePage");

    // For authenticated users, check for active game first
    if (isAuthenticated) {
      try {
        // Check active game - but here's the key difference:
        // We'll use apiService directly to check without triggering any side effects
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

    // No active game or error checking - use the WinCelebration approach
    const resetAndStart = useGameStore.getState().resetAndStartNewGame;

    if (typeof resetAndStart === "function") {
      // First reset the game
      useGameStore.getState().resetGame();

      // Then start a new game with the exact same parameters used in WinCelebration
      resetAndStart(
        settings?.longText || false,
        settings?.hardcoreMode || false,
        {
          forceRender: true,
          customGameRequested: true,
        },
      );

      // Navigate to the game page
      navigate("/");
    } else {
      // Fallback to simple navigation
      navigate("/");
    }
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
      `mailto:quote@mail.decodey.game?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  };

  // Helper function to provide clipboard fallback
  const copyEmailToClipboard = () => {
    const emailAddress = "quote@mail.decodey.game";

    // Modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(emailAddress)
        .then(() => {
          alert(
            `Email address "${emailAddress}" copied to clipboard.\n\nPlease send your quote feedback to this address.`,
          );
        })
        .catch(() => {
          alert(`Please send your quote feedback to:\n${emailAddress}`);
        });
    } else {
      // Older fallback using textarea
      try {
        const textArea = document.createElement("textarea");
        textArea.value = emailAddress;
        textArea.style.position = "fixed"; // Avoid scrolling to bottom
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (successful) {
          alert(
            `Email address "${emailAddress}" copied to clipboard.\n\nPlease send your quote feedback to this address.`,
          );
        } else {
          alert(`Please send your quote feedback to:\n${emailAddress}`);
        }
      } catch (err) {
        alert(`Please send your quote feedback to:\n${emailAddress}`);
      }
    }
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
