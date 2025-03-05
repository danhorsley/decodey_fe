
import React, { useMemo } from 'react';
import LetterCell from './LetterCell';

const LetterGrids = ({ 
  encrypted, 
  settings, 
  selectedEncrypted, 
  correctlyGuessed, 
  lastCorrectGuess, 
  letterFrequency, 
  originalLetters, 
  guessedMappings, 
  isGameActive, 
  onEncryptedClick, 
  onGuessClick 
}) => {
  // Get unique encrypted letters and sort them if needed
  const encryptedLetters = useMemo(
    () => [...new Set(encrypted.match(/[A-Z]/g) || [])],
    [encrypted],
  );

  const sortedEncryptedLetters = useMemo(
    () =>
      settings.gridSorting === "alphabetical"
        ? [...encryptedLetters].sort()
        : encryptedLetters,
    [encryptedLetters, settings.gridSorting],
  );

  // Get used guess letters
  const usedGuessLetters = useMemo(
    () => Object.values(guessedMappings),
    [guessedMappings],
  );

  return (
    <div className="grids">
      <div className="encrypted-grid">
        {sortedEncryptedLetters.map((letter) => (
          <LetterCell
            key={letter}
            letter={letter}
            isSelected={selectedEncrypted === letter}
            isGuessed={correctlyGuessed.includes(letter)}
            isFlashing={lastCorrectGuess === letter}
            frequency={letterFrequency[letter]}
            onClick={() => onEncryptedClick(letter)}
            disabled={!isGameActive}
          />
        ))}
      </div>
      <div className="guess-grid">
        {originalLetters.map((letter) => (
          <LetterCell
            key={letter}
            letter={letter}
            isGuessed={usedGuessLetters.includes(letter)}
            onClick={() => onGuessClick(letter)}
            disabled={!isGameActive || !selectedEncrypted}
          />
        ))}
      </div>
    </div>
  );
};

export default LetterGrids;
