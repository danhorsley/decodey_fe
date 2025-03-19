import React, { useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import useSettingsStore from "../stores/settingsStore";
import useAuthStore from "../stores/authStore";
import useUIStore from "../stores/uiStore";
import useGameSession from "../hooks/useGameSession";

function AccountButtonWrapper() {
  // Get settings and auth state
  const settings = useSettingsStore((state) => state.settings);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Get UI actions
  const openLogin = useUIStore((state) => state.openLogin);

  // Use simplified game session hook for logout
  const { userLogout, isInitializing } = useGameSession();

  // State for logout confirmation
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  // Handle account icon click
  const handleClick = () => {
    if (isAuthenticated) {
      setShowLogoutConfirmation(true);
    } else {
      openLogin();
    }
  };

  // Handle logout
  const handleLogout = async () => {
    // Use simplified logout function from hook
    await userLogout(true);
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
                disabled={isInitializing}
              >
                {isInitializing ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AccountButtonWrapper;
