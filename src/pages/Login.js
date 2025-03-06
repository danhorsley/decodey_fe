import React, { useState } from "react";
import "../Styles/About.css";
import "../Styles/Login.css";
import { useAppContext } from "../context/AppContext";
import apiService from "../services/apiService";
import config from "../config";

function Login({ isOpen, onClose }) {
  console.log("Login render - isOpen:", isOpen, "isLoginOpen from context:", useAppContext().isLoginOpen);

  const { settings, openSignup } = useAppContext();
  const { isLoginOpen, isSignupOpen } = useAppContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Moved conditional returns after all hooks are called
  // This is critical - React hooks must be called unconditionally
  if (!isOpen || !isLoginOpen) {
    console.log("Login component early return - not rendering");
    return null;
  }

  // Handle forgotten password
  const handleForgotPassword = () => {
    // For now, just show an alert
    alert("Password reset functionality will be available soon!");
    // You could also set up a modal or redirect to a password reset page
  };

  // Handle account creation
  const handleCreateAccount = () => {
    // Call openSignup directly without onClose
    openSignup();
    // Don't call onClose here, let the context handle it
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await apiService.login(username, password);
      console.log("Login successful:", response);
      const { updateAuthState } = useAppContext();
      if (updateAuthState) {
        updateAuthState({
          isAuthenticated: true,
          user: {
            username: username,
            // Add other user data from API response if available
            ...response?.user
          },
          authLoading: false,
          authError: null
        });
      } else {
        console.error("updateAuthState is not available in context");
      }
      onClose();
      // You might want to update the app context with user info here
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="about-overlay">
      <div
        className={`about-container login-container ${settings.theme === "dark" ? "dark-theme" : ""} text-${settings.textColor}`}
      >
        <button className="about-close" onClick={onClose}>
          &times;
        </button>
        <h2>Login</h2>
        {error && <p className="login-error">{error}</p>}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>

          <div className="login-actions">
            <button
              type="button"
              className="text-button forgot-password"
              onClick={handleForgotPassword}
            >
              Forgot Password?
            </button>
            <button
              type="button"
              className="text-button create-account"
              onClick={handleCreateAccount}
            >
              Create Account
            </button>
            {config.DEBUG && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  console.log("Debug button clicked");
                  const { updateAuthState } = useAppContext();
                  if (updateAuthState) {
                    updateAuthState({
                      authLoading: !isLoading,
                      user: { username: "debug-user" }
                    });
                  } else {
                    console.error("updateAuthState is not available in context");
                  }
                }}
              >
                Debug Auth
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;