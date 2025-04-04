import React from "react";
import "../Styles/CompactHeader.css";

/**
 * CompactHeader - A streamlined header with hamburger menu
 * @param {Object} props Component props
 * @param {string} props.title Game title to display
 * @param {Function} props.toggleMenu Function to toggle the slide menu
 * @param {boolean} props.isDailyChallenge Whether this is a daily challenge
 * @param {boolean} props.hardcoreMode Whether hardcore mode is active
 */
const CompactHeader = ({
  title,
  toggleMenu,
  isDailyChallenge = false,
  hardcoreMode = false,
}) => {
  return (
    <div className="compact-header">
      {/* Hamburger menu button */}
      <button
        className="menu-toggle"
        onClick={toggleMenu}
        aria-label="Open menu"
      >
        <div className="hamburger">
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </div>
      </button>

      {/* Game title */}
      <h1 className="game-title">{title}</h1>

      {/* Mode badges - only show one at a time (Daily takes precedence) */}
      {isDailyChallenge && (
        <div className="badge-indicator daily-badge">DAILY</div>
      )}

      {hardcoreMode && !isDailyChallenge && (
        <div className="badge-indicator hardcore-badge">HARDCORE</div>
      )}
    </div>
  );
};

export default CompactHeader;
