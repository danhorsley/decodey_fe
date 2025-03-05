
import React, { useState } from "react";
import "./Styles/About.css";
import "./Styles/Login.css";
import { useAppContext } from "./AppContext";
import apiService from "./apiService";

function Login({ isOpen, onClose }) {
  const { settings } = useAppContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // login, signup, or forgot

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      if (mode === "login") {
        const response = await apiService.login(username, password);
        console.log("Login successful:", response);
        onClose();
        // You might want to update the app context with user info here
      } else if (mode === "signup") {
        // This would be a real signup API call in production
        console.log("Sign up with:", { username, password, email });
        setError(""); // Clear any previous errors
        setTimeout(() => {
          setMode("login");
          setIsLoading(false);
          setUsername("");
          setPassword("");
          setEmail("");
        }, 1000);
      } else if (mode === "forgot") {
        // This would be a real password reset API call in production
        console.log("Reset password for:", email);
        setError(""); // Clear any previous errors
        setTimeout(() => {
          setMode("login");
          setIsLoading(false);
          setEmail("");
        }, 1000);
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setError(mode === "login" 
        ? "Login failed. Please check your credentials." 
        : mode === "signup" 
          ? "Sign up failed. Please try again." 
          : "Password reset request failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderLoginForm = () => (
    <>
      <h2>Login</h2>
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
        
        <div className="auth-links">
          <button 
            type="button"
            className="text-link" 
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            Sign Up
          </button>
          <button 
            type="button"
            className="text-link" 
            onClick={() => {
              setMode("forgot");
              setError("");
            }}
          >
            Forgot Password?
          </button>
        </div>
      </form>
    </>
  );

  const renderSignupForm = () => (
    <>
      <h2>Sign Up</h2>
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
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>
        
        <div className="auth-links">
          <button 
            type="button"
            className="text-link" 
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Back to Login
          </button>
        </div>
      </form>
    </>
  );

  const renderForgotPasswordForm = () => (
    <>
      <h2>Reset Password</h2>
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
        <button 
          type="submit" 
          className="login-button" 
          disabled={isLoading}
        >
          {isLoading ? "Sending Reset Link..." : "Send Reset Link"}
        </button>
        
        <div className="auth-links">
          <button 
            type="button"
            className="text-link" 
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Back to Login
          </button>
        </div>
      </form>
    </>
  );

  return (
    <div className="about-overlay">
      <div
        className={`about-container login-container ${settings.theme === "dark" ? "dark-theme" : ""} text-${settings.textColor}`}
      >
        <button className="about-close" onClick={onClose}>
          &times;
        </button>
        
        {error && <p className="login-error">{error}</p>}
        
        {mode === "login" && renderLoginForm()}
        {mode === "signup" && renderSignupForm()}
        {mode === "forgot" && renderForgotPasswordForm()}
      </div>
    </div>
  );
}

export default Login;
