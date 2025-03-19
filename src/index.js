// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
// Import consolidated CSS files instead of multiple individual ones
import "./Styles/ConsolidatedMain.css";
import "./Styles/ConsolidatedMobile.css";
import "./Styles/ConsolidatedDarkTheme.css";
// Specialized CSS files remain separate
import "./Styles/Login.css";
import "./Styles/About.css";
import "./Styles/Settings.css";
import "./Styles/Leaderboard.css";
import "./Styles/Privacy.css";
// Keep Modal CSS separate as it's used across components
import "./Styles/Modal.css";

import App from "./App";

// Add data-theme attribute to HTML element for Samsung Browser
const applyHtmlDataTheme = () => {
  const storedSettings = localStorage.getItem("uncrypt-settings");
  if (storedSettings) {
    try {
      const { theme } = JSON.parse(storedSettings);
      document.documentElement.setAttribute("data-theme", theme || "light");
    } catch (e) {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } else {
    document.documentElement.setAttribute("data-theme", "light");
  }
};

// Apply data-theme right away
applyHtmlDataTheme();

const root = ReactDOM.createRoot(document.getElementById("root"));

// Check if we're in production
const isProduction = process.env.NODE_ENV === "production";

// Conditionally apply StrictMode only in development
// Important: Use the new AppProviders component here, not the old AppProvider
root.render(
  isProduction ? (
    <App />
  ) : (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ),
);




