// src/pages/Login.js
import React, { useState } from "react";
import "../Styles/About.css";
import "../Styles/Login.css";
import useSettingsStore from "../stores/settingsStore";
import useUIStore from "../stores/uiStore";
import useGameSession from "../hooks/useGameSession"; // Add this import

function Login({ onClose }) {
  // Get contexts directly
  const settings = useSettingsStore((state) => state.settings);
  const openSignup = useUIStore((state) => state.openSignup);
  const closeLogin = useUIStore((state) => state.closeLogin);

  // Use our game session hook instead of direct auth store
  const { handleUserLogin, isInitializing: isLoggingIn } = useGameSession();

  // Local state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("uncrypt-remember-me") === "true";
  });
  const [error, setError] = useState("");

  // Handle forgotten password
  const handleForgotPassword = () => {
    alert("Password reset functionality will be available soon!");
  };

  // Handle account creation
  const handleCreateAccount = () => {
    openSignup();
  };

  // Handle form submission - now using our centralized service
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const credentials = {
      username: username,
      password: password,
      rememberMe: rememberMe,
    };

    try {
      // Use our centralized login function
      const result = await handleUserLogin(credentials);

      if (result.success) {
        // Store remember me preference
        localStorage.setItem("uncrypt-remember-me", rememberMe.toString());

        // Close the login modal immediately
        onClose();
      } else {
        setError(
          result.error?.message ||
            "Login failed. Please check your credentials.",
        );
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please check your credentials.");
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
          <div className="remember-me-container">
            <label className="remember-me-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="remember-me-checkbox"
              />
              <span>Remember me</span>
            </label>
          </div>
          <button type="submit" className="login-button" disabled={isLoggingIn}>
            {isLoggingIn ? "Logging in..." : "Login"}
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
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
