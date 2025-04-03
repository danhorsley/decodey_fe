import React from "react";
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
  hasLost,
  onStartNewGame
}) => {
  const isMobile = useUIStore((state) => state.useMobileMode);
  const isDarkTheme = useUIStore((state) => state.isDarkTheme);

  const remainingMistakes = maxMistakes - mistakes - pendingHints;

  // Hint text representations with crossword-style filled squares
  const hintTexts = {
    8: "SEVEN",
    7: "█SIX█",
    6: "█FIVE",
    5: "FOUR█",
    4: "THREE",
    3: "█TWO█",
    2: "█ONE█",
    1: "ZERO█",
  };

  const getStatusColor = () => {
    if (remainingMistakes <= 1) return "danger";
    if (remainingMistakes <= maxMistakes / 2) return "warning";
    return "success";
  };

  // Render the hint button or game over message
  const renderHintOrGameOver = () => {
    if (hasLost) {
      return (
        <div 
          className="crossword-hint-button game-over status-danger"
          onClick={onStartNewGame}
        >
          <div className="hint-text-display">
            GAME OVER
          </div>
          <div className="hint-label">Try Again</div>
        </div>
      );
    }

    return (
      <div
        className={`crossword-hint-button status-${getStatusColor()} ${isHintInProgress ? "processing" : ""}`}
        onClick={!disableHint ? onHintClick : undefined}
      >
        <div className="hint-text-display">
          {hintTexts[remainingMistakes] || hintTexts[0]}
        </div>
        <div className="hint-label">HINT TOKENS</div>
        {pendingHints > 0 && (
          <div className="pending-hint-indicator">+{pendingHints}</div>
        )}
        {isHintInProgress && <span className="processing-spinner"></span>}
      </div>
    );
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

      {/* Middle Section: Hint Button or Game Over */}
      <div className="controls-stack">
        {renderHintOrGameOver()}
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