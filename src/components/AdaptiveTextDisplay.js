// src/components/AdaptiveTextDisplay.js
import React, { useRef, useEffect, useState } from "react";
import useUIStore from "../stores/uiStore";
import useDeviceDetection from "../hooks/useDeviceDetection";

const AdaptiveTextDisplay = ({
  encrypted = "",
  display = "",
  hardcoreMode = false,
}) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const useMobileMode = useUIStore((state) => state.useMobileMode);
  const { isLandscape } = useDeviceDetection();

  // Character display settings
  const [cellSize, setCellSize] = useState(22);
  const [cellGap, setCellGap] = useState(1);
  const [charsPerLine, setCharsPerLine] = useState(40);

  // Update container dimensions
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);
    window.addEventListener("orientationchange", () => {
      setTimeout(updateContainerSize, 200);
    });

    return () => {
      window.removeEventListener("resize", updateContainerSize);
      window.removeEventListener("orientationchange", updateContainerSize);
    };
  }, []);

  // Calculate optimal display parameters
  useEffect(() => {
    if (!encrypted || containerWidth === 0) return;

    // Calculate max chars per line based on container width and minimum cell size
    const minCellSize = useMobileMode ? 16 : 18;
    const maxCellSize = useMobileMode ? 24 : 28;
    const preferredCellGap = useMobileMode ? 0 : 1;

    // Available width minus some padding
    const availableWidth = containerWidth - 20;

    // Find longest line for reference
    const lines = encrypted.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));

    // Calculate how many chars fit per line
    let newCharsPerLine = Math.floor(availableWidth / (minCellSize + preferredCellGap));

    // Ensure minimum number of chars per line for readability
    newCharsPerLine = Math.max(newCharsPerLine, 20);

    // If original text fits, use it
    if (maxLineLength <= newCharsPerLine) {
      newCharsPerLine = maxLineLength;
    }

    // Calculate optimal cell size based on the chars per line
    let newCellSize = Math.floor(availableWidth / newCharsPerLine) - preferredCellGap;

    // Ensure cell size stays within bounds
    newCellSize = Math.min(Math.max(newCellSize, minCellSize), maxCellSize);

    // Apply results
    setCharsPerLine(newCharsPerLine);
    setCellSize(newCellSize);
    setCellGap(preferredCellGap);

  }, [encrypted, containerWidth, useMobileMode, isLandscape]);

  // Process text with word-aware line breaks
  const processTextWithLineBreaks = (text) => {
    if (!text) return [];

    // Split original text into lines (respecting manual line breaks)
    const originalLines = text.split('\n');
    const processedLines = [];

    originalLines.forEach(line => {
      // If line is shorter than the limit, keep it as is
      if (line.length <= charsPerLine) {
        processedLines.push(line);
        return;
      }

      // For longer lines, we need to break them
      const words = line.split(/(\s+)/); // Split by whitespace, keeping separators
      let currentLine = '';

      words.forEach(word => {
        // If adding this word would exceed the limit
        if (currentLine.length + word.length > charsPerLine) {
          // If current line is not empty, push it
          if (currentLine.length > 0) {
            processedLines.push(currentLine);
            currentLine = '';
          }

          // If the word itself is longer than the limit, we need to chunk it
          if (word.length > charsPerLine) {
            // Break long word into chunks
            for (let i = 0; i < word.length; i += charsPerLine) {
              const chunk = word.substring(i, i + charsPerLine);
              processedLines.push(chunk);
            }
          } else {
            currentLine = word;
          }
        } else {
          // Word fits, add it to current line
          currentLine += word;
        }
      });

      // Don't forget the last line
      if (currentLine.length > 0) {
        processedLines.push(currentLine);
      }
    });

    return processedLines;
  };

  // Process encrypted and display text
  const processedEncrypted = processTextWithLineBreaks(encrypted);
  const processedDisplay = processTextWithLineBreaks(display);

  // Create grids from processed text
  const createCharacterGrid = (lines) => {
    return lines.map(line => Array.from(line));
  };

  const encryptedGrid = createCharacterGrid(processedEncrypted);
  const displayGrid = createCharacterGrid(processedDisplay);

  return (
    <div 
      ref={containerRef}
      className={`text-container ${hardcoreMode ? "hardcore-mode" : ""}`}
    >
      {hardcoreMode && (
        <div className="badge-indicator hardcore-badge">HARDCORE</div>
      )}

      <div className="grid-text-display">
        {encryptedGrid.map((line, lineIndex) => (
          <div key={`block-${lineIndex}`} className="text-line-block">
            {/* Encrypted line */}
            <div className="char-line encrypted-line">
              {line.map((char, charIndex) => (
                <div 
                  key={`enc-${lineIndex}-${charIndex}`} 
                  className="char-cell"
                  style={{ 
                    width: `${cellSize}px`, 
                    height: `${cellSize}px`,
                    margin: `0 ${cellGap/2}px`,
                    fontSize: `${Math.max(cellSize * 0.75, 12)}px`
                  }}
                >
                  {char}
                </div>
              ))}
            </div>

            {/* Display line */}
            {displayGrid[lineIndex] && (
              <div className="char-line display-line">
                {displayGrid[lineIndex].map((char, charIndex) => (
                  <div 
                    key={`disp-${lineIndex}-${charIndex}`} 
                    className="char-cell"
                    style={{ 
                      width: `${cellSize}px`, 
                      height: `${cellSize}px`,
                      margin: `0 ${cellGap/2}px`,
                      fontSize: `${Math.max(cellSize * 0.75, 12)}px`
                    }}
                  >
                    {char}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdaptiveTextDisplay;