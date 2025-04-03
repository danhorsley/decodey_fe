import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCog,
  FaInfoCircle,
  FaTrophy,
  FaCalendarDay,
  FaUser,
  FaSignOutAlt,
  FaSignInAlt,
} from "react-icons/fa";
import useUIStore from "../stores/uiStore";
import useAuthStore from "../stores/authStore";
import useGameSession from "../hooks/useGameSession";
import "../Styles/SlideMenu.css";

/**
 * SlideMenu - A mobile-friendly slide-out menu component
 */
const SlideMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  // Get UI actions from store
  const openSettings = useUIStore((state) => state.openSettings);
  const openAbout = useUIStore((state) => state.openAbout);
  const openLogin = useUIStore((state) => state.openLogin);

  // Auth state
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  // Get logout function
  const { userLogout } = useGameSession();

  // Handle logout
  const handleLogout = async () => {
    onClose();
    await userLogout(true); // Logout and start new anonymous game
  };

  return (
    <>
      {/* Backdrop for closing the menu when clicking outside */}
      {isOpen && <div className="menu-backdrop" onClick={onClose}></div>}

      {/* The slide menu itself */}
      <div className={`slide-menu ${isOpen ? "open" : ""}`}>
        <div className="menu-header">
          <button
            className="close-menu"
            onClick={onClose}
            aria-label="Close menu"
          >
            &times;
          </button>
          <h2 className="menu-title">decodey</h2>
        </div>

        {/* User info section (if authenticated) */}
        {isAuthenticated && user && (
          <div className="user-info">
            <FaUser className="user-icon" />
            <span className="username">{user.username}</span>
          </div>
        )}

        {/* Menu items */}
        <ul className="menu-items">
          <li
            onClick={() => {
              onClose();
              openAbout();
            }}
          >
            <FaInfoCircle className="menu-icon" />
            <span>About</span>
          </li>

          <li
            onClick={() => {
              onClose();
              openSettings();
            }}
          >
            <FaCog className="menu-icon" />
            <span>Settings</span>
          </li>

          <li
            onClick={() => {
              onClose();
              navigate("/leaderboard");
            }}
          >
            <FaTrophy className="menu-icon" />
            <span>Leaderboards</span>
          </li>

          <li
            onClick={() => {
              onClose();
              navigate("/daily");
            }}
          >
            <FaCalendarDay className="menu-icon" />
            <span>Daily Challenge</span>
          </li>

          {/* Conditional login/logout */}
          {isAuthenticated ? (
            <li className="menu-action-item" onClick={handleLogout}>
              <FaSignOutAlt className="menu-icon" />
              <span>Sign Out</span>
            </li>
          ) : (
            <li
              className="menu-action-item"
              onClick={() => {
                onClose();
                openLogin();
              }}
            >
              <FaSignInAlt className="menu-icon" />
              <span>Sign In</span>
            </li>
          )}
        </ul>

        <div className="menu-footer">
          <p className="version">Version 1.0.0</p>
        </div>
      </div>
    </>
  );
};

export default SlideMenu;
