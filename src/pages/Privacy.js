import React from "react";
import { useNavigate } from "react-router-dom";
import useSettingsStore from "../stores/settingsStore";
import useUIStore from "../stores/uiStore";
import "../Styles/About.css";
import "../Styles/Privacy.css";

const Privacy = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);
  const showGame = useUIStore((state) => state.showGame);

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
          <h3>Email Marketing & How We Support The Game</h3>
          <p>
            <strong>Opt-in Only:</strong> We only send marketing emails to users
            who have explicitly opted in during registration.
          </p>
          <p>
            <strong>Our Business Model:</strong> Unlike many free games, we
            don't:
          </p>
          <ul>
            <li>Sell your personal data to third parties</li>
            <li>Display advertisements in our game</li>
            <li>Use tracking cookies for advertising purposes</li>
          </ul>
          <p>Instead, we sustain development through:</p>
          <ul>
            <li>
              Occasional emails about game updates and news (only with your
              explicit consent)
            </li>
            <li>
              Emails containing third-party marketing offers from partners that
              may interest puzzle enthusiasts (only sent to users who have
              explicitly consented)
            </li>
          </ul>
          <p>
            If you've consented to receive emails, you can withdraw this consent
            at any time by:
          </p>
          <ul>
            <li>Clicking the "unsubscribe" link included in every email</li>
            <li>
              Contacting us at{" "}
              <a href="mailto:support@uncryptgame.com">
                support@uncryptgame.com
              </a>
            </li>
          </ul>
          <p className="privacy-highlight">
            Your consent to receive emails is entirely optional and does not
            affect your ability to play the game. However, it's the primary way
            you can support Uncrypt's continued development.
          </p>
        </section>
        <section className="privacy-section">
          <h3>Quote Usage Disclaimer</h3>
          <p>
            All quotes used in this game are attributed where known and are intended for educational and entertainment purposes only. No endorsement by the original authors or rights holders is implied. If you would like to request the removal of a specific quote, please contact us at{" "}
            <a href="mailto:quotes@mail.decodey.game" className="privacy-email">
              quotes@mail.decodey.game
            </a>
            . We will review all removal requests and take appropriate action within a reasonable timeframe.
          </p>
        </section>

        <section className="privacy-section">
          <h3>Your Rights</h3>
          <p>You have the right to:</p>
          <ul>
            <li>
              <strong>Access your personal data</strong> - You can download all
              your data from the Settings menu
            </li>
            <li>
              <strong>
                Request deletion of your account and associated data
              </strong>{" "}
              - Available through the Settings menu
            </li>
            <li>Opt out of non-essential communications</li>
          </ul>
          <p>
            These options are accessible directly from your account settings,
            allowing you to exercise your GDPR rights without needing to contact
            us.
          </p>
        </section>

        <div className="privacy-footer">
          <p>Last updated: March 17, 2025</p>
          <button className="return-button" onClick={() => navigate("/")}>
            Return to Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
