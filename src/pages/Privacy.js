import React from "react";
import { useNavigate } from "react-router-dom";
import { useUI } from "../context";
import "../Styles/About.css";
import "../Styles/Privacy.css";

const Privacy = () => {
  const navigate = useNavigate();
  const { settings } = useUI();

  return (
    <div className="about-overlay">
      <div
        className={`about-container privacy-container ${
          settings.theme === "dark" ? "dark-theme" : ""
        }`}
      >
        <button
          className="about-close"
          onClick={() => navigate("/")}
          aria-label="Close privacy policy"
        >
          &times;
        </button>

        <h2>Privacy Policy</h2>

        <section className="privacy-section">
          <h3>Information We Collect</h3>
          <p>
            Uncrypt collects minimal information to provide our game service:
          </p>
          <ul>
            <li>
              <strong>Account Information:</strong> Email and username when you
              register
            </li>
            <li>
              <strong>Game Data:</strong> Scores, streaks, and gameplay
              statistics
            </li>
            <li>
              <strong>Device Information:</strong> Browser type, device type,
              and screen resolution for optimization
            </li>
          </ul>
        </section>

        <section className="privacy-section">
          <h3>How We Use Your Information</h3>
          <p>We use collected information to:</p>
          <ul>
            <li>Maintain your account and track your game progress</li>
            <li>
              Populate leaderboards (only your username is displayed publicly)
            </li>
            <li>Improve game functionality and user experience</li>
            <li>Communicate important updates about the game</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h3>Data Security</h3>
          <p>
            We implement appropriate security measures to protect your personal
            information. Your password is securely hashed, and we use secure
            protocols for all data transmission.
          </p>
        </section>

        <section className="privacy-section">
          <h3>Your Rights</h3>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Opt out of non-essential communications</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h3>Contact Us</h3>
          <p>
            If you have questions about this privacy policy or your data, please
            contact us at:
            <a href="mailto:support@uncryptgame.com" className="privacy-email">
              support@uncryptgame.com
            </a>
          </p>
        </section>

        <div className="privacy-footer">
          <p>Last updated: March 10, 2025</p>
          <button className="return-button" onClick={() => navigate("/")}>
            Return to Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default Privacy;