
import React from 'react';

const Controls = ({ mistakes, maxMistakes, onHint, isGameActive }) => {
  return (
    <div className="controls">
      <p>
        Mistakes: {mistakes}/{maxMistakes}
      </p>
      <button
        onClick={onHint}
        disabled={mistakes >= maxMistakes - 1 || !isGameActive}
        className="hint-button"
      >
        Hint (Costs 1 Mistake)
      </button>
    </div>
  );
};

export default Controls;
