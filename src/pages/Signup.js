import React, { useState, useCallback } from "react";
import "../Styles/About.css";
import "../Styles/Login.css";
import { useAppContext } from "../context/AppContext";
import apiService from "../services/apiService";
import config from "../config";

function Signup({ isOpen, onClose }) {
  const { settings, openLogin } = useAppContext();
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

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Make the signup request to the backend
      const response = await fetch(`${config.apiUrl}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      console.log("Signup successful:", data);
      alert("Account created successfully! You can now log in.");
      onClose();
      // Optionally open the login form
      openLogin();
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  // Add debounced check function
  const checkUsername = useCallback(
    _.debounce(async (value) => {
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
        const response = await fetch(`${config.apiUrl}/check-username`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: value }),
        });

        const data = await response.json();

        setUsernameStatus({
          checking: false,
          available: data.available,
          message: data.available
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

  // Add this effect
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
