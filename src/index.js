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
const enableScrollingOnSmallDevices = () => {
  // Add a class to body for small screens
  const isVerySmallScreen = window.innerHeight < 600; // iPhone 13 mini is around 812px, but we'll be conservative
  if (isVerySmallScreen) {
    document.body.classList.add("very-small-screen");

    // Add CSS to ensure scrolling works
    const style = document.createElement("style");
    style.textContent = `
      .very-small-screen {
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
        height: auto !important;
        position: relative !important;
      }

      .very-small-screen .App-container {
        min-height: 100vh;
        overflow-y: auto !important;
        padding-bottom: 60px !important; /* Add extra padding at bottom */
      }

      /* Adjust fixed elements */
      .very-small-screen .menu-toggle,
      .very-small-screen .daily-challenge-button-fixed {
        position: absolute !important;
      }

      /* Ensure touch events are not intercepted */
      .very-small-screen * {
        touch-action: auto !important;
      }
    `;
    document.head.appendChild(style);
  }
};

function fixIOSScrolling() {
  // Check if it's an iOS device
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (isIOS) {
    console.log("iOS device detected, applying scroll fixes");

    // Force document to be scrollable
    document.documentElement.style.height = "auto";
    document.body.style.height = "auto";
    document.body.style.position = "static";
    document.body.style.overflow = "auto";
    document.body.style.webkitOverflowScrolling = "touch";

    // Add some padding at the bottom to ensure scrollability
    const existingPadding =
      parseInt(getComputedStyle(document.body).paddingBottom) || 0;
    document.body.style.paddingBottom = existingPadding + 60 + "px";

    // Find and modify any fixed position containers that might block scrolling
    document
      .querySelectorAll(".App-container, .game-dashboard, .text-container")
      .forEach((el) => {
        const position = getComputedStyle(el).position;
        if (position === "fixed") {
          el.style.position = "absolute";
        }
        el.style.height = "auto";
        el.style.maxHeight = "none";
        el.style.overflow = "visible";
      });

    // Add scroll touch helper
    document.addEventListener(
      "touchstart",
      function () {
        // This empty handler enables "momentum" scrolling on iOS
      },
      false,
    );
  }
}
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

  // Add CSS to disable selection but allow scrolling
  style.textContent = `
    body,
    .App-container, 
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
    }

    /* ALLOW SCROLLING on text containers - THIS IS CRITICAL */
    .text-container,
    .char-line,
    .display-line,
    .encrypted-line,
    .char-cell {
      touch-action: auto !important; /* Allow all touch gestures including scrolling */
      -webkit-overflow-scrolling: touch !important;
    }

    /* Special rule for disabling word search */
    ::selection { background: transparent !important; }
    ::-moz-selection { background: transparent !important; }

    /* Make specific game interaction elements unselectable */
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

// Add mobile scroll handling to hide address bar
window.addEventListener("load", function () {
  // Only apply this on mobile devices
  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )
  ) {
    // Attempt to hide the address bar
    const hideAddressBar = () => {
      // Most effective method is just scrolling to position 1
      window.scrollTo(0, 1);

      // For iOS Safari, sometimes a small delay helps
      setTimeout(() => {
        window.scrollTo(0, 1);
      }, 50);
    };

    // Try immediately and after a short delay
    hideAddressBar();
    setTimeout(hideAddressBar, 300);

    // Also hide on resize events
    window.addEventListener("resize", () => {
      setTimeout(hideAddressBar, 100);
    });

    // Also hide after any orientation change
    window.addEventListener("orientationchange", () => {
      setTimeout(hideAddressBar, 100);
    });
  }
  // Enable scrolling on very small devices
  enableScrollingOnSmallDevices();
  // Fix iOS scrolling issues
  fixIOSScrolling();
  // Apply touch selection prevention for mobile
  disableTouchSelection();
});
