// src/pages/Login.js - Improved with gameService approach
import React, { useState } from "react";
import "../Styles/About.css";
import "../Styles/Login.css";
import useSettingsStore from "../stores/settingsStore";
import useUIStore from "../stores/uiStore";
import useGameService from "../hooks/useGameService";
import apiService from "../services/apiService";

function Login({ onClose }) {
  // Get settings and UI actions
  const settings = useSettingsStore((state) => state.settings);
  const openSignup = useUIStore((state) => state.openSignup);

  // Use gameService for login functionality
  const { login, isInitializing } = useGameService();

  // Local state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("uncrypt-remember-me") === "true";
  });
  const [error, setError] = useState("");

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const credentials = {
      username: username,
      password: password,
      rememberMe: rememberMe,
    };

    try {
      // Use the login function from gameService
      const result = await login(credentials);

      if (result.success) {
        // Store remember me preference
        localStorage.setItem("uncrypt-remember-me", rememberMe.toString());

        // Close login form
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

  // Handle forgotten password
  const handleForgotPassword = async () => {
    const email = prompt("Please enter your email address:");
    if (!email) return;

    try {
      const result = await apiService.forgotPassword(email);
      alert(
        result.message ||
          "If an account exists with this email, a reset link will be sent",
      );
    } catch (error) {
      console.error("Error in forgot password:", error);
      alert(
        "Failed to process password reset request. Please try again later.",
      );
    }
  };

  // Handle account creation
  const handleCreateAccount = () => {
    openSignup();
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
            <label htmlFor="username">Username or Email</label>
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
          <button
            type="submit"
            className="login-button"
            disabled={isInitializing}
          >
            {isInitializing ? "Logging in..." : "Login"}
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
