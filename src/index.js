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
import reportWebVitals from "./reportWebVitals";
import { AppProviders } from "./context"; // Import the new AppProviders
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

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
    <AppProviders>
      <App />
    </AppProviders>
  ) : (
    <React.StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </React.StrictMode>
  ),
);

// Register service worker for production
// Register the service worker with custom callbacks for handling updates
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    // When a new version is available, show a notification
    const shouldRefresh = window.confirm(
      "A new version of the app is available. Load the latest version?",
    );

    if (shouldRefresh) {
      // Send skip waiting message to the service worker
      const waitingServiceWorker = registration.waiting;
      if (waitingServiceWorker) {
        waitingServiceWorker.postMessage({ type: "SKIP_WAITING" });

        // Reload once the new service worker becomes active
        waitingServiceWorker.addEventListener("statechange", (event) => {
          if (event.target.state === "activated") {
            window.location.reload();
          }
        });
      }
    }
  },
  onSuccess: (registration) => {
    console.log("App is now available offline!");
    // Could show a toast notification here
  },
});

reportWebVitals();
