// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
// Import consolidated CSS files instead of multiple individual ones
import "./Styles/ConsolidatedMain.css";
import "./Styles/ConsolidatedDarkTheme.css";
// import "./Styles/SimplifiedMobile.css";
// import "./Styles/MobileResponsive.css";
// Specialized CSS files remain separate
import "./Styles/Login.css";
import "./Styles/About.css";
import "./Styles/Settings.css";
import "./Styles/Leaderboard.css";
import "./Styles/Privacy.css";
import "./Styles/Scoring.css";
import "./Styles/Modal.css";
import "./Styles/DailyChallenge.css";
import "./Styles/ResponsiveQuotes.css";
import "./Styles/AdaptiveTextDisplay.css";

import App from "./App";
// Import stores needed for initialization
import useGameStore from "./stores/gameStore";
import useSettingsStore from "./stores/settingsStore";

// Utility to disable text selection and context menus on touch devices
const disableTouchSelection = () => {
  // Only apply on mobile devices
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  if (!isMobile) return;

  // Create a style element
  const style = document.createElement("style");

  // Add CSS to disable selection
  style.textContent = `
    body,
    .App-container, 
    .text-container,
    .encrypted-line,
    .display-line,
    .char-cell,
    .letter-cell,
    .encrypted-grid,
    .guess-grid,
    .letter-cell,
    .crossword-hint-button,
    .hint-text-display,
    .hint-label,
    .game-dashboard * {
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
      -khtml-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
      touch-action: manipulation !important;
    }

    /* Special rule for disabling word search */
    ::selection { background: transparent !important; }
    ::-moz-selection { background: transparent !important; }

    /* Make all game interaction elements unselectable */
    .letter-cell, .hint-button, .crossword-hint-button {
      -webkit-tap-highlight-color: transparent !important;
    }
  `;

  // Add the style element to the head
  document.head.appendChild(style);

  // Prevent long-press context menu
  document.addEventListener(
    "contextmenu",
    function (e) {
      if (!e.target.closest("input") && !e.target.closest("textarea")) {
        e.preventDefault();
        return false;
      }
    },
    { capture: true, passive: false },
  );

  // Prevent selection by canceling mousedown events
  document.addEventListener(
    "mousedown",
    function (e) {
      if (!e.target.closest("input") && !e.target.closest("textarea")) {
        if (
          e.target.closest(".letter-cell") ||
          e.target.closest(".crossword-hint-button") ||
          e.target.closest(".char-cell") ||
          e.target.closest(".text-container")
        ) {
          // Prevent selection but allow clicks
          e.preventDefault();
        }
      }
    },
    { capture: true, passive: false },
  );

  // Prevent text selection on touch events in game areas
  document.addEventListener(
    "touchstart",
    function (e) {
      if (!e.target.closest("input") && !e.target.closest("textarea")) {
        if (
          e.target.closest(".letter-cell") ||
          e.target.closest(".crossword-hint-button") ||
          e.target.closest(".game-dashboard") ||
          e.target.closest(".char-cell")
        ) {
          e.target.classList.add("no-select-active");
        }
      }
    },
    { capture: true, passive: true },
  );

  // Remove any selection on touch end
  document.addEventListener(
    "touchend",
    function () {
      // Clear any text selection that might have occurred
      if (window.getSelection) {
        if (window.getSelection().empty) {
          // Chrome
          window.getSelection().empty();
        } else if (window.getSelection().removeAllRanges) {
          // Firefox
          window.getSelection().removeAllRanges();
        }
      } else if (document.selection) {
        // Old IE
        document.selection.empty();
      }

      // Remove the special class
      document.querySelectorAll(".no-select-active").forEach((el) => {
        el.classList.remove("no-select-active");
      });
    },
    { capture: true, passive: true },
  );
};

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

// Initialize store subscriptions
const initializeStores = () => {
  // Ensure settings are applied
  useSettingsStore.getState().applyTheme();

  // Initialize game store with settings
  useGameStore.getState().initializeFromSettings();
};

// Run store initialization immediately
initializeStores();

const root = ReactDOM.createRoot(document.getElementById("root"));

// Check if we're in production
const isProduction = process.env.NODE_ENV === "production";

// Conditionally apply StrictMode only in development
root.render(
  isProduction ? (
    <App />
  ) : (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ),
);

// Add minimal scroll on launch and disable touch selection
window.addEventListener("load", function () {
  // Delay slightly to ensure everything is loaded
  setTimeout(function () {
    window.scrollTo(0, 1);
    // Try to request fullscreen if possible
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        // Silently handle any errors since fullscreen isn't critical
        console.log("Fullscreen request failed:", err);
      });
    }

    // Apply touch selection prevention for mobile
    disableTouchSelection();
  }, 300);
});
