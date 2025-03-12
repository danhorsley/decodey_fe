// src/pages/Login.js
import React, { useState } from "react";
import "../Styles/About.css";
import "../Styles/Login.css";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useModalContext } from "../components/modals/ModalManager";
import apiService from "../services/apiService";

function Login({ onClose }) {
  // Get contexts directly
  const { settings } = useSettings();
  const { login } = useAuth();
  const { openSignup } = useModalContext();

  // Local state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Initialize rememberMe from localStorage if available
  const [rememberMe, setRememberMe] = useState(() => {
    const savedPreference = localStorage.getItem("uncrypt-remember-me");
    return savedPreference === "true";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle forgotten password
  const handleForgotPassword = () => {
    // For now, just show an alert
    alert("Password reset functionality will be available soon!");
    // You could also set up a modal or redirect to a password reset page
  };

  // Handle account creation
  const handleCreateAccount = () => {
    openSignup();
    // Don't call onClose here to prevent closing both modals
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const credentials = {
      username: username,
      password: password,
      rememberMe: rememberMe,
    };
    try {
      console.log("Login.js handleSubmit", username, password, rememberMe);
      const result = await login(credentials);
      if (result.success) {
        console.log("Login successful, checking for active game");
        const activeGameCheck = await apiService.checkAndHandleActiveGame(
          result.token,
        );

        console.log("Active game check result:", activeGameCheck);

        if (activeGameCheck.handled && activeGameCheck.restore) {
          console.log(
            "About to restore server game with ID:",
            activeGameCheck.gameId,
          );

          // THIS IS CRITICAL: We need to update localStorage with the server's game ID
          localStorage.setItem("uncrypt-game-id", activeGameCheck.gameId);

          // IMPORTANT: Remove any existing game data to force server fetch
          localStorage.removeItem("uncrypt-game-data");

          // We also need to create a special flag to force the /start endpoint to recognize this game ID
          localStorage.setItem("force-load-server-game", "true");

          console.log(
            "Local game state cleared, game ID updated to server value",
          );

          // Instead of just reloading, let's be more explicit
          window.location.href = "/"; // Navigate to home to ensure clean state
        } else {
          // No active game or user chose not to restore
          onClose();
        }
      } else {
        setError(
          result.error || "Login failed. Please check your credentials.",
        );
      }
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
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
