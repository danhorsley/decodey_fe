import React from "react";
import "./About.css";
import { useAppContext } from "./AppContext";

function About({ isOpen, onClose }) {
  const { settings } = useAppContext();

  if (!isOpen) return null;

  return (
    <div className="about-overlay">
      <div
        className={`about-container ${settings.theme === "dark" ? "dark-theme" : ""} text-${settings.textColor}`}
      >
        <button className="about-close" onClick={onClose}>
          &times;
        </button>
        <h2>uncrypt</h2>
        <p>Crack the code by figuring out which letter stands for which!</p>
        <div className="about-details">
          <p>
            <strong>How to play:</strong>
          </p>
          <ol>
            <li>Select a letter from the encrypted text (left grid)</li>
            <li>Guess what original letter it represents (right grid)</li>
            <li>
              Use letter frequency numbers in the left grid to help analyze the
              pattern
            </li>
            <li>Solve before running out of mistakes</li>
          </ol>
          <p>Need help? Use the hint button (costs one mistake).</p>
        </div>
      </div>
    </div>
  );
}

export default About;
