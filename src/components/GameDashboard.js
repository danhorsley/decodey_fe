import React from "react";
import { FaLightbulb } from "react-icons/fa";
import useUIStore from "../stores/uiStore";
import "../Styles/GameDashboard.css";
const LetterCell = React.memo(
  ({
    letter,
    isSelected,
    isGuessed,
    isFlashing,
    frequency,
    onClick,
    disabled,
  }) => (
    <div
      className={`letter-cell ${isSelected ? "selected" : ""} ${isGuessed ? "guessed" : ""} ${isFlashing ? "flash" : ""}`}
      onClick={!disabled ? onClick : undefined}
    >
      {letter}
      {typeof frequency !== "undefined" && (
        <span className="frequency-indicator">{frequency}</span>
      )}
    </div>
  ),
);
const GameDashboard = ({
  mistakes,
  maxMistakes,
  pendingHints,
  onHintClick,
  disableHint,
  isHintInProgress,
  sortedEncryptedLetters,
  selectedEncrypted,
  correctlyGuessed,
  lastCorrectGuess,
  letterFrequency,
  onEncryptedClick,
  isGameActive,
  originalLetters,
  guessedMappings,
  onGuessClick,
}) => {
  const isMobile = useUIStore((state) => state.useMobileMode);

  const remainingMistakes = maxMistakes - mistakes - pendingHints;
  const getStatusColor = () => {
    if (remainingMistakes <= 1) return "danger";
    if (remainingMistakes <= maxMistakes / 2) return "warning";
    return "success";
  };

  return (
    <div className="game-dashboard">
      {/* Encrypted Grid */}
      <div className="encrypted-grid">
        {sortedEncryptedLetters.map((letter) => (
          <LetterCell
            key={letter}
            letter={letter}
            isSelected={selectedEncrypted === letter}
            isGuessed={correctlyGuessed.includes(letter)}
            isFlashing={lastCorrectGuess === letter}
            frequency={letterFrequency?.[letter] || 0}
            onClick={() => onEncryptedClick(letter)}
            disabled={!isGameActive}
          />
        ))}
      </div>

      {/* Middle Section: Mistakes and Hint Stacked */}
      <div className="controls-stack">
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
        <button
          className={`hint-button ${isHintInProgress ? "processing" : ""}`}
          disabled={disableHint}
          onClick={onHintClick}
          aria-label="Get hint"
        >
          <FaLightbulb className="hint-icon" />
          {!isMobile && <span className="hint-text">Hint</span>}
          {isHintInProgress && <span className="processing-spinner"></span>}
        </button>
      </div>

      {/* Guess Grid */}
      <div className="guess-grid">
        {originalLetters.map((letter) => (
          <LetterCell
            key={letter}
            letter={letter}
            isGuessed={Object.values(guessedMappings || {}).includes(letter)}
            onClick={() => onGuessClick(letter)}
            disabled={!isGameActive || !selectedEncrypted}
          />
        ))}
      </div>
    </div>
  );
};

export default GameDashboard;
