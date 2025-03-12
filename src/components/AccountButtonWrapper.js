// src/components/AccountButtonWrapper.js
import React, { useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useModalContext } from "./modals/ModalManager";

function AccountButtonWrapper() {
  // Get settings directly from context
  const { settings } = useSettings();

  // Get auth state directly from context
  const { isAuthenticated, user, logout } = useAuth();

  // Get modal functions directly from context
  const { openLogin } = useModalContext();

  // State to manage logout confirmation
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const handleClick = () => {
    console.log("Account button clicked, auth state:", {
      isAuthenticated,
      username: user?.username,
    });

    // If authenticated, show logout confirmation, otherwise open login modal
    if (isAuthenticated) {
      setShowLogoutConfirmation(true);
    } else {
      openLogin();
    }
  };

  // Handle logout confirmation
  const handleLogout = () => {
    logout();
    setShowLogoutConfirmation(false);
  };

  // Handle cancel logout
  const handleCancelLogout = () => {
    setShowLogoutConfirmation(false);
  };

  return (
    <>
      <button
        className={`account-icon ${settings?.theme === "dark" ? "dark-theme" : ""}`}
        onClick={handleClick}
        aria-label={isAuthenticated ? "Account" : "Login"}
      >
        <FaUserCircle />
      </button>

      {/* Logout confirmation dialog */}
      {showLogoutConfirmation && (
        <div className="about-overlay">
          <div
            className={`about-container login-container ${settings?.theme === "dark" ? "dark-theme" : ""}`}
            style={{ maxWidth: "300px" }}
          >
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out?</p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "20px",
              }}
            >
              <button
                className="login-button"
                onClick={handleCancelLogout}
                style={{
                  backgroundColor: "#6c757d",
                  flex: "1",
                  marginRight: "10px",
                }}
              >
                Cancel
              </button>
              <button
                className="login-button"
                onClick={handleLogout}
                style={{ flex: "1", marginLeft: "10px" }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AccountButtonWrapper;
