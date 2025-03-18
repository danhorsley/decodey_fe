import React, { useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import useSettingsStore from "../stores/settingsStore";
import useAuthStore from "../stores/authStore";
import useUIStore from "../stores/uiStore";
import useGameSession from "../hooks/useGameSession"; // Import the hook

function AccountButtonWrapper() {
  // Get settings from store
  const settings = useSettingsStore((state) => state.settings);

  // Get auth state using separate selectors
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Get UI actions from store
  const openLogin = useUIStore((state) => state.openLogin);

  // Use our game session hook for logout
  const { handleUserLogout, isInitializing: isLoggingOut } = useGameSession();

  // State for logout confirmation
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const handleClick = () => {
    // If authenticated, show logout confirmation, otherwise open login modal
    if (isAuthenticated) {
      setShowLogoutConfirmation(true);
    } else {
      openLogin();
    }
  };

  const handleLogout = async () => {
    // Use our centralized logout function
    try {
      const result = await handleUserLogout(true);

      if (result.success) {
        console.log("Logout successful, started new anonymous game");
      } else {
        console.warn("Logout had issues:", result.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }

    // Close the confirmation dialog
    setShowLogoutConfirmation(false);
  };

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
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AccountButtonWrapper;
