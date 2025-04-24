// src/components/SlideMenu.js - Updated for direct daily challenge
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTrophy,
  FaUserCircle,
  FaSignOutAlt,
  FaSignInAlt,
  FaCog,
  FaInfoCircle,
  FaCalendarAlt,
  FaHome,
  FaRandom,
} from "react-icons/fa";
import "../Styles/SlideMenu.css";
import useAuthStore from "../stores/authStore";
import useUIStore from "../stores/uiStore";
import useGameService from "../hooks/useGameService";

/**
 * SlideMenu - The sidebar menu that opens when the hamburger is clicked
 * Updated to directly start daily challenge instead of navigating
 */
const SlideMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  // Get auth state and actions with ready check
  const [authState, setAuthState] = useState({ isAuthenticated: false, user: null });
  
  useEffect(() => {
    useAuthStore.getState().waitForAuthReady().then(state => {
      setAuthState(state);
    });
  }, []);

  const { isAuthenticated, user } = authState;

  // Get UI actions
  const openLogin = useUIStore((state) => state.openLogin);
  const openSignup = useUIStore((state) => state.openSignup);
  const openSettings = useUIStore((state) => state.openSettings);
  const openAbout = useUIStore((state) => state.openAbout);

  // Get game service functions
  const { continueGame, logout, startDailyChallenge, events, onEvent } =
    useGameService();

  // Handle navigation
  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  // Handle custom game - simplified with our new service
  const handleCustomGame = async () => {
    console.log("Custom Game clicked in SlideMenu");
    onClose(); // Close menu first for better UX

    // For authenticated users, check for active game
    if (isAuthenticated) {
      try {
        // Try to continue game - if active game exists, service will emit the event
        const result = await continueGame();

        // If no active game found, just refresh to start a new game
        if (!result.success || !result.activeGameFound) {
          window.location.href = "/";
        }
      } catch (error) {
        console.error("Error checking for active game:", error);
        // On error, just refresh the page to start fresh
        window.location.href = "/";
      }
    } else {
      // For anonymous users, refresh the page to start a new game
      window.location.href = "/";
    }
  };

  // Updated handler for daily challenge - now starts directly rather than navigating
  const handleDailyChallenge = async () => {
    console.log("Daily Challenge clicked in SlideMenu");
    onClose(); // Close menu first

    try {
      // Start daily challenge directly
      const result = await startDailyChallenge();

      if (result.success) {
        // No need to navigate - the game is already initialized with daily challenge
        console.log("Daily challenge started successfully");
      } else if (result.alreadyCompleted) {
        // If already completed, navigate with state to show notification
        navigate("/", {
          state: {
            dailyCompleted: true,
            completionData: result.completionData,
          },
        });
      } else {
        // On error, show a message and stay on current page
        console.error("Failed to start daily challenge:", result.error);
        alert("Could not start daily challenge. Please try again.");
      }
    } catch (error) {
      console.error("Error starting daily challenge:", error);
      alert("Error starting daily challenge. Please try again.");
    }
  };

  // Handle auth actions
  const handleLogin = () => {
    openLogin();
    onClose();
  };

  const handleSignup = () => {
    openSignup();
    onClose();
  };

  const handleLogout = async () => {
    console.log("Logout clicked in SlideMenu");
    await logout(true); // true means start an anonymous game
    console.log("Logout completed in SlideMenu");
    onClose();
  };

  return (
    <>
      {/* Backdrop for closing when clicking outside */}
      {isOpen && <div className="menu-backdrop" onClick={onClose}></div>}

      {/* The menu itself */}
      <div className={`slide-menu ${isOpen ? "open" : ""}`}>
        {/* Header */}
        <div className="menu-header">
          <button className="close-menu" onClick={onClose}>
            &times;
          </button>
          <h2 className="menu-title">decodey</h2>
        </div>

        {/* User info if logged in */}
        {isAuthenticated && user && (
          <div className="user-info">
            <FaUserCircle className="user-icon" />
            <span className="username">{user.username}</span>
          </div>
        )}

        {/* Menu items */}
        <ul className="menu-items">
          <li onClick={() => handleNavigation("/home")}>
            <FaHome className="menu-icon" />
            Home Menu
          </li>

          <li onClick={handleDailyChallenge}>
            <FaCalendarAlt className="menu-icon" />
            Daily Challenge
          </li>

          <li onClick={handleCustomGame}>
            <FaRandom className="menu-icon" />
            Custom Game
          </li>

          <li onClick={() => handleNavigation("/leaderboard")}>
            <FaTrophy className="menu-icon" />
            Leaderboard
          </li>

          <li onClick={openSettings}>
            <FaCog className="menu-icon" />
            Settings
          </li>

          <li onClick={openAbout}>
            <FaInfoCircle className="menu-icon" />
            About
          </li>

          {/* Auth actions */}
          {isAuthenticated ? (
            <li className="menu-action-item" onClick={handleLogout}>
              <FaSignOutAlt className="menu-icon" />
              Logout
            </li>
          ) : (
            <>
              <li className="menu-action-item" onClick={handleLogin}>
                <FaSignInAlt className="menu-icon" />
                Login
              </li>
              <li onClick={handleSignup}>
                <FaUserCircle className="menu-icon" />
                Create Account
              </li>
            </>
          )}
        </ul>

        {/* Footer */}
        <div className="menu-footer">
          <p className="version">Version 1.0.1</p>
        </div>
      </div>
    </>
  );
};

export default SlideMenu;
