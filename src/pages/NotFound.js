// src/pages/NotFound.js
import React, { useEffect } from "react";
import { useSettings } from "../context/SettingsContext";
import HeaderControls from "../components/HeaderControls";

function NotFound() {
  const { settings } = useSettings();

  // Set the HTTP status code to 404
  useEffect(() => {
    // This only works with server-side rendering, but it's good practice
    document.title = "404 - Page Not Found | Uncrypt";
  }, []);

  return (
    <div
      className={`App-container ${settings?.theme === "dark" ? "dark-theme" : "light-theme"}`}
    >
      <HeaderControls title="uncrypt" />
      <div
        style={{
          textAlign: "center",
          padding: "50px 20px",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <button
          onClick={() => (window.location.href = "/")}
          style={{
            padding: "10px 20px",
            marginTop: "20px",
            cursor: "pointer",
          }}
        >
          Return to Game
        </button>
      </div>
    </div>
  );
}

export default NotFound;
