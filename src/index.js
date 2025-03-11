// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./Styles/index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { AppProviders } from "./context"; // Import the new AppProviders

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

reportWebVitals();
