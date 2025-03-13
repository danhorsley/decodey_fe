// src/pages/Signup.js
import React, { useState, useCallback, useEffect } from "react";
import "../Styles/About.css";
import "../Styles/Login.css";
import { useSettings } from "../context/SettingsContext";
import { useModalContext } from "../components/modals/ModalManager";
import apiService from "../services/apiService";

function Signup({ onClose }) {
  // Get contexts directly
  const { settings } = useSettings();
  const { openLogin } = useModalContext();

  // Local state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    available: null,
    message: "",
  });

  // Handle form submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Validate passwords match
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // Make signup request using apiService
        const result = await apiService.api.post("/signup", {
          email,
          username,
          password,
        });

        if (result.status === 201 || result.status === 200) {
          alert("Account created successfully! You can now log in.");
          onClose();
          openLogin();
        } else {
          throw new Error(result.data?.message || "Signup failed");
        }
      } catch (err) {
        console.error("Signup error:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Signup failed. Please try again.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [password, confirmPassword, email, username, openLogin, onClose],
  );

  // Debounce function for username availability check
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(null, args);
      }, delay);
    };
  };

  // Username availability check
  const checkUsername = useCallback(
    debounce(async (value) => {
      if (value.length < 3) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: "Username must be at least 3 characters",
        });
        return;
      }

      setUsernameStatus((prev) => ({ ...prev, checking: true }));

      try {
        const response = await apiService.api.post("/check-username", {
          username: value,
        });

        setUsernameStatus({
          checking: false,
          available: response.data.available,
          message: response.data.available
            ? "Username available!"
            : "Username already taken",
        });
      } catch (error) {
        setUsernameStatus({
          checking: false,
          available: null,
          message: "Error checking username",
        });
      }
    }, 500),
    [],
  );

  // Check username availability when username changes
  useEffect(() => {
    if (username.length >= 3) {
      checkUsername(username);
    } else {
      setUsernameStatus({
        checking: false,
        available: null,
        message: "",
      });
    }
  }, [username, checkUsername]);

  return (
    <div className="about-overlay">
      <div
        className={`about-container login-container ${settings.theme === "dark" ? "dark-theme" : ""} text-${settings.textColor}`}
      >
        <button className="about-close" onClick={onClose}>
          &times;
        </button>
        <h2>Create Account</h2>
        {error && <p className="login-error">{error}</p>}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="login-field">
            <label htmlFor="username">Username (for leaderboards)</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={
                usernameStatus.available === true
                  ? "valid-input"
                  : usernameStatus.available === false
                    ? "invalid-input"
                    : ""
              }
            />
            {usernameStatus.message && (
              <span
                className={
                  usernameStatus.available ? "valid-message" : "error-message"
                }
              >
                {usernameStatus.checking
                  ? "Checking..."
                  : usernameStatus.message}
              </span>
            )}
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
          <div className="login-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>

          <div className="login-actions">
            <button
              type="button"
              className="text-button back-to-login"
              onClick={onClose}
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Signup;
