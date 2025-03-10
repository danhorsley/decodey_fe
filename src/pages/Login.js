import React, { useState } from "react";
import "../Styles/About.css";
import "../Styles/Login.css";
import { useAppContext } from "../context/AppContext";
import apiService from "../services/apiService";
import config from "../config";

function Login({ isOpen, onClose }) {
  const { settings, openSignup, login } = useAppContext();
  const { isLoginOpen, isSignupOpen } = useAppContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isLoginOpen) return null;

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

  // In Login.js
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const credentials = { username: username, password: password };
    try {
      console.log("Login.js handleSubmitchecker", username, password);
      const result = await login(credentials);
      if (result.success) {
        console.log("Login successful");

        // Check for pending scores to submit
        const pendingScores = JSON.parse(
          localStorage.getItem("uncrypt-pending-scores") || "[]",
        );

        if (pendingScores.length > 0) {
          console.log(`Found ${pendingScores.length} pending scores to submit`);

          // Submit each pending score
          for (const scoreData of pendingScores) {
            try {
              await apiService.recordScore(scoreData);
              console.log("Pending score submitted successfully");
            } catch (err) {
              console.error("Error submitting pending score:", err);
            }
          }

          // Clear pending scores after submitting
          localStorage.removeItem("uncrypt-pending-scores");
        }

        onClose();
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
