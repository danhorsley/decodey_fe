import React from "react";
import "../Styles/CompactHeader.css";

/**
 * CompactHeader - A streamlined header with hamburger menu
 */
const CompactHeader = ({ title, toggleMenu, isDailyChallenge = false }) => {
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

      {/* Daily challenge badge */}
      {isDailyChallenge && <div className="daily-badge">DAILY</div>}
    </div>
  );
};

export default CompactHeader;
