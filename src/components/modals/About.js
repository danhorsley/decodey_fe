import React from "react";
import "./Styles/About.css";
import { useAppContext } from "./context/AppContext";

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
      </div>
    </div>
  );
}

export default About;
