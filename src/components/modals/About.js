// src/components/modals/About.js
import React from "react";
import { Link } from "react-router-dom";
import "../../Styles/About.css";
import useSettingsStore from "../../stores/settingsStore";
import useUIStore from "../../stores/uiStore";

function About({ isOpen, onClose }) {
  // Get settings directly from store
  const settings = useSettingsStore((state) => state.settings);

  // Get close function from store as fallback if props don't provide it
  const closeAbout = useUIStore((state) => state.closeAbout);

  // Use the onClose prop if provided, otherwise use the store function
  const handleClose = onClose || closeAbout;

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div className="about-overlay">
      <div
        className={`about-container ${settings.theme === "dark" ? "dark-theme" : ""} text-${settings.textColor}`}
      >
        <button className="about-close" onClick={handleClose}>
          &times;
        </button>
        <h2>uncrypt: What's the famous quote?!?</h2>
        <p>
          Crack the code by figuring out which letter stands for which in the
          well known quote.
        </p>
        <div className="about-details">
          <p>
            <strong>How to play:</strong>
          </p>
          <ol>
            <li>
              Select a letter from the{" "}
              <span className="left-grid-reference"> left grid</span>
            </li>
            <li>
              Guess the original letter it represents in the{" "}
              <span className="right-grid-reference"> right grid</span>
            </li>
            <li>
              Use the letter frequency numbers in the{" "}
              <span className="left-grid-reference"> left grid</span> to make
              smarter guesses
            </li>
            <li>Solve before running out of mistakes!</li>
          </ol>
          <p>Stuck? Hit the hint button (but it'll cost you one mistake).</p>
        </div>

        <div className="about-footer">
          {/* Add Scoring link */}
          <Link to="/scoring" className="privacy-link" onClick={handleClose}>
            Scoring System
          </Link>

          <Link to="/privacy" className="privacy-link" onClick={handleClose}>
            Privacy Policy
          </Link>

          <div className="contact-info">
            <p>Having trouble? Need help?</p>
            <a href="mailto:support@uncryptgame.com" className="contact-email">
              Contact Support
            </a>
          </div>
          <p style={{ fontSize: '0.8rem', marginTop: '15px', opacity: '0.8' }}>
            Disclaimer: All quotes used in this game are attributed where known and are intended for educational and entertainment purposes only. No endorsement by the original authors or rights holders is implied.
          </p>
        </div>
      </div>
    </div>
  );
}

export default About;
