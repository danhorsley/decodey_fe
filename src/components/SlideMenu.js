import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaTrophy, FaUserCircle, FaSignOutAlt, FaSignInAlt, 
  FaCog, FaInfoCircle, FaCalendarAlt, FaHome 
} from "react-icons/fa";
import "../Styles/SlideMenu.css";
import useAuthStore from "../stores/authStore";
import useUIStore from "../stores/uiStore";

/**
 * SlideMenu - The sidebar menu that opens when the hamburger is clicked
 */
const SlideMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  // Get auth state and actions
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  // Get UI actions
  const openLogin = useUIStore((state) => state.openLogin);
  const openSignup = useUIStore((state) => state.openSignup);
  const openSettings = useUIStore((state) => state.openSettings);
  const openAbout = useUIStore((state) => state.openAbout);

  // Handle navigation
  const handleNavigation = (path) => {
    navigate(path);
    onClose();
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
    await logout();
    onClose();
  };

  return (
    <>
      {/* Backdrop for closing when clicking outside */}
      {isOpen && <div className="menu-backdrop" onClick={onClose}></div>}

      {/* The menu itself */}
      <div className={`slide-menu ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="menu-header">
          <button className="close-menu" onClick={onClose}>&times;</button>
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
          <li onClick={() => handleNavigation('/')}>
            <FaHome className="menu-icon" />
            Home
          </li>

          <li onClick={() => handleNavigation('/daily')}>
            <FaCalendarAlt className="menu-icon" />
            Daily Challenge
          </li>

          <li onClick={() => handleNavigation('/leaderboard')}>
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
          <p className="version">Version 1.0.0</p>
        </div>
      </div>
    </>
  );
};

export default SlideMenu;