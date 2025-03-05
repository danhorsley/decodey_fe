
import React, { useState } from "react";
import "./Styles/About.css";
import "./Styles/Login.css";
import { useAppContext } from "./AppContext";
import apiService from "./apiService";

function Login({ isOpen, onClose }) {
  const { settings } = useAppContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const response = await apiService.login(username, password);
      console.log("Login successful:", response);
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
          <button 
            type="submit" 
            className="login-button" 
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
