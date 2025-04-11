// src/pages/Signup.js
import React, { useState, useCallback, useEffect } from "react";
import "../Styles/About.css";
import "../Styles/Login.css";
import useSettingsStore from "../stores/settingsStore";
import useAuthStore from "../stores/authStore";
import useUIStore from "../stores/uiStore";
import useGameSession from "../hooks/useGameSession"; // Add this import
import apiService from "../services/apiService"; // Using apiService directly for signup

function Signup({ onClose }) {
  // Get contexts directly
  const settings = useSettingsStore((state) => state.settings);
  const openLogin = useUIStore((state) => state.openLogin);
  // Use the game session hook for login after signup
  const { login: handleUserLogin } = useGameSession();

  // Local state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    available: null,
    message: "",
  });

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
        const result = await apiService.signup({
          email,
          username,
          password,
          emailConsent, // Add consent data to the request
        });

        if (result && result.msg === "User created successfully") {
          console.log("Account created successfully! Attempting auto-login");

          // Auto-login with the credentials just used for signup
          // Auto-login with credentials
          const credentials = {
            username: username,
            password: password,
            rememberMe: true, // Default to remember me for better UX
          };

          const result = await handleUserLogin(credentials);

          if (result.success) {
            console.log("Auto-login successful after signup");
            // Show success toast message
            const toast = document.createElement("div");
            toast.textContent = "Welcome! Your account has been created.";
            toast.style.cssText = `
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background-color: ${settings.theme === "dark" ? "#333" : "white"};
              color: ${settings.theme === "dark" ? "#4cc9f0" : "#007bff"};
              padding: 10px 20px;
              border-radius: 5px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.2);
              z-index: 9999;
            `;
            document.body.appendChild(toast);
            setTimeout(() => document.body.removeChild(toast), 3000);
            onClose();
          } else {
            console.warn("Auto-login failed after signup:", result.error);
            setError(result.error?.message || "Failed to login after signup");
            onClose();
            openLogin();
          }
          } catch (loginErr) {
            console.error("Error during auto-login after signup:", loginErr);
            alert("Account created successfully! You can now log in.");
            onClose();
            openLogin();
          }
        } else {
          throw new Error(result?.message || "Signup failed");
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
    [
      password,
      confirmPassword,
      email,
      username,
      emailConsent,
      openLogin,
      onClose,
      handleUserLogin,
      settings.theme,
    ],
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

  // Username availability check - using apiService
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
        const response = await apiService.checkUsernameAvailability(value);

        setUsernameStatus({
          checking: false,
          available: response.available,
          message: response.available
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
          <div className="login-field checkbox-field">
            <label className="consent-label">
              <input
                type="checkbox"
                checked={emailConsent}
                onChange={() => setEmailConsent(!emailConsent)}
                className="consent-checkbox"
              />
              <span>
                I consent to receive occasional emails with game updates, news,
                and third-party offers.
              </span>
            </label>
            <p className="consent-info">
              This is the only way to support the game - we don't sell your data
              or show ads. You can unsubscribe at any time.
            </p>
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
