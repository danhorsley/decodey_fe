import React from "react";
import ReactDOM from "react-dom/client";
import "./Styles/index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { AppProvider } from "./AppContext";

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
root.render(
  isProduction ? (
    <AppProvider>
      <App />
    </AppProvider>
  ) : (
    <React.StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </React.StrictMode>
  ),
);

reportWebVitals();
