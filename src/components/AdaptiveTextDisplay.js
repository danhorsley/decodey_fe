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

  // Character display settings - adjusted for monospace
  const [cellWidth, setCellWidth] = useState(11); // Narrower default width
  const [cellHeight, setCellHeight] = useState(18); // Slightly taller for aspect ratio
  const [charsPerLine, setCharsPerLine] = useState(30);

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

  // Calculate optimal display parameters with proper monospace dimensions
  useEffect(() => {
    if (!encrypted || containerWidth === 0) return;

    // Set appropriate dimensions for monospace fonts
    // Width is typically ~60% of height for monospace
    const minCellWidth = useMobileMode ? 8 : 9; // Much narrower width for monospace
    const minCellHeight = useMobileMode ? 14 : 16; // Slightly smaller height too

    const maxCellWidth = useMobileMode ? 14 : 16;
    const maxCellHeight = useMobileMode ? 20 : 24;

    // Available width minus some padding
    const availableWidth = containerWidth - 20;

    // Find longest line for reference
    const lines = encrypted.split("\n");
    const maxLineLength = Math.max(...lines.map((line) => line.length));

    // Calculate how many chars fit per line using width
    let newCharsPerLine = Math.floor(availableWidth / minCellWidth);

    // Ensure minimum number of chars per line for readability
    newCharsPerLine = Math.max(newCharsPerLine, 20);

    // If original text fits, use it
    if (maxLineLength <= newCharsPerLine) {
      newCharsPerLine = maxLineLength;
    }

    // Calculate optimal cell width based on the chars per line
    let newCellWidth = Math.floor(availableWidth / newCharsPerLine);

    // Ensure cell width stays within bounds
    newCellWidth = Math.min(Math.max(newCellWidth, minCellWidth), maxCellWidth);

    // Calculate cell height based on width with proper aspect ratio
    // Monospace fonts typically have height:width ratio of ~1.6:1
    let newCellHeight = Math.round(newCellWidth * 1.6);

    // Ensure height is within bounds
    newCellHeight = Math.min(
      Math.max(newCellHeight, minCellHeight),
      maxCellHeight,
    );

    // Apply results
    setCharsPerLine(newCharsPerLine);
    setCellWidth(newCellWidth);
    setCellHeight(newCellHeight);
  }, [encrypted, containerWidth, useMobileMode, isLandscape]);

  // Process text with word-aware line breaks
  const processTextWithLineBreaks = (text) => {
    if (!text) return [];

    // Split original text into lines (respecting manual line breaks)
    const originalLines = text.split("\n");
    const processedLines = [];

    originalLines.forEach((line) => {
      // If line is shorter than the limit, keep it as is
      if (line.length <= charsPerLine) {
        processedLines.push(line);
        return;
      }

      // For longer lines, we need to break them
      const words = line.split(/(\s+)/); // Split by whitespace, keeping separators
      let currentLine = "";

      words.forEach((word) => {
        // If adding this word would exceed the limit
        if (currentLine.length + word.length > charsPerLine) {
          // If current line is not empty, push it
          if (currentLine.length > 0) {
            processedLines.push(currentLine);
            currentLine = "";
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
    return lines.map((line) => Array.from(line));
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
                    width: `${cellWidth}px`,
                    height: `${cellHeight}px`,
                    fontSize: `${Math.max(cellHeight * 0.65, 10)}px`,
                    padding: 0,
                    margin: 0,
                    display: "inline-block",
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
                      width: `${cellWidth}px`,
                      height: `${cellHeight}px`,
                      fontSize: `${Math.max(cellHeight * 0.65, 10)}px`,
                      padding: 0,
                      margin: 0,
                      display: "inline-block",
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
