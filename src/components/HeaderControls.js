// src/components/HeaderControls.js (or wherever the file is located)
import React from "react";
import { FaCog, FaQuestion } from "react-icons/fa";
import useUIStore from "../stores/uiStore";

function HeaderControls({ title }) {
  // Get UI actions from store
  const openSettings = useUIStore((state) => state.openSettings);
  const openAbout = useUIStore((state) => state.openAbout);

  // Add debugging to help track issues
  const handleSettingsClick = () => {
    console.log("Settings button clicked");
    if (typeof openSettings === "function") {
      openSettings();
    } else {
      console.error("openSettings is not a function:", openSettings);
    }
  };

  const handleAboutClick = () => {
    console.log("About button clicked");
    if (typeof openAbout === "function") {
      openAbout();
    } else {
      console.error("openAbout is not a function:", openAbout);
    }
  };

  return (
    <div className="game-header">
      <button
        className="about-icon"
        onClick={handleAboutClick}
        aria-label="About"
      >
        <FaQuestion />
      </button>

      <h1 className="retro-title">{title}</h1>

      <button
        className="settings-icon"
        onClick={handleSettingsClick}
        aria-label="Settings"
      >
        <FaCog />
      </button>
    </div>
  );
}

export default HeaderControls;
