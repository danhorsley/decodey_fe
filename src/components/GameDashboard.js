import React from "react";
import { FaLightbulb } from "react-icons/fa";
import useUIStore from "../stores/uiStore";
import "../Styles/GameDashboard.css";

/**
 * GameDashboard - A compact game controls panel
 */
const GameDashboard = ({
  mistakes,
  maxMistakes,
  pendingHints,
  onHintClick,
  disableHint,
  isHintInProgress,
}) => {
  // Get mobile mode status
  const isMobile = useUIStore((state) => state.useMobileMode);

  // Calculate remaining mistakes
  const remainingMistakes = maxMistakes - mistakes - pendingHints;

  // Determine status color
  const getStatusColor = () => {
    if (remainingMistakes <= 1) return "danger";
    if (remainingMistakes <= maxMistakes / 2) return "warning";
    return "success";
  };

  return (
    <div className="game-dashboard">
      {/* Mistakes counter with visual status */}
      <div className={`mistake-counter status-${getStatusColor()}`}>
        <span className="counter-label">Mistakes</span>
        <span className="counter-value">
          {mistakes}
          <span className="max-value">/{maxMistakes}</span>
          {pendingHints > 0 && (
            <span className="pending-value">+{pendingHints}</span>
          )}
        </span>
      </div>

      {/* Hint button */}
      <button
        className={`hint-button ${isHintInProgress ? "processing" : ""}`}
        disabled={disableHint}
        onClick={onHintClick}
        aria-label="Get hint"
      >
        <FaLightbulb className="hint-icon" />
        {!isMobile && <span className="hint-text">Hint</span>}

        {/* Processing indicator */}
        {isHintInProgress && <span className="processing-spinner"></span>}
      </button>
    </div>
  );
};

export default GameDashboard;
