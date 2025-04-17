// src/components/TunableTextDisplay.js
import React, { useRef, useEffect, useState } from "react";
import useUIStore from "../stores/uiStore";
import useDeviceDetection from "../hooks/useDeviceDetection";

// Tuning parameters - TWEAK THESE VALUES
const TUNING = {
  // Portrait mode
  portrait: {
    desktop: {
      widthRatio: 0.6, // Width to height ratio (0.6 means width is 60% of height)
      fontRatio: 0.65, // Font size as percentage of cell height
      minCellWidth: 7, // Minimum cell width in pixels
      maxCellWidth: 12, // Maximum cell width in pixels
      minCellHeight: 12, // Minimum cell height in pixels
      maxCellHeight: 18, // Maximum cell height in pixels
      minCharsPerLine: 25, // Minimum characters per line
      maxLines: 999, // No practical limit on lines
    },
    mobile: {
      widthRatio: 0.6, // Width to height ratio
      fontRatio: 1, // Font size as percentage of cell height
      minCellWidth: 15, // Minimum cell width in pixels
      maxCellWidth: 15, // Maximum cell width in pixels
      minCellHeight: 22, // Minimum cell height in pixels
      maxCellHeight: 22, // Maximum cell height in pixels
      minCharsPerLine: 22, // Minimum characters per line
      maxLines: 999, // No practical limit on lines
    },
  },
  // Landscape mode
  landscape: {
    desktop: {
      widthRatio: 0.6, // Width to height ratio
      fontRatio: 0.65, // Font size as percentage of cell height
      minCellWidth: 7, // Minimum cell width in pixels
      maxCellWidth: 14, // Maximum cell width in pixels
      minCellHeight: 12, // Minimum cell height in pixels
      maxCellHeight: 18, // Maximum cell height in pixels
      minCharsPerLine: 40, // Minimum characters per line
      maxLines: 2, // Maximum of 2 lines in landscape
    },
    mobile: {
      widthRatio: 0.6, // Width to height ratio
      fontRatio: 0.65, // Font size as percentage of cell height
      minCellWidth: 7, // Minimum cell width in pixels
      maxCellWidth: 10, // Maximum cell width in pixels
      minCellHeight: 12, // Minimum cell height in pixels
      maxCellHeight: 16, // Maximum cell height in pixels
      minCharsPerLine: 40, // Minimum characters per line
      maxLines: 2, // Maximum of 2 lines in landscape
    },
  },
};

const TunableTextDisplay = ({
  encrypted = "",
  display = "",
  hardcoreMode = false,
}) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const useMobileMode = useUIStore((state) => state.useMobileMode);
  const { isLandscape } = useDeviceDetection();

  // Character display settings
  const [cellWidth, setCellWidth] = useState(10);
  const [cellHeight, setCellHeight] = useState(16);
  const [charsPerLine, setCharsPerLine] = useState(40);

  // For debugging - will show parameters on screen
  const [debugInfo, setDebugInfo] = useState({});

  // Update container dimensions
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
        setContainerHeight(containerRef.current.clientHeight);
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

    // Get tuning parameters based on orientation and device
    const orientation = isLandscape ? "landscape" : "portrait";
    const device = useMobileMode ? "mobile" : "desktop";
    const params = TUNING[orientation][device];

    // Available width minus some padding
    const availableWidth = containerWidth - 20;

    // Find longest line for reference
    const lines = encrypted.split("\n");
    const maxLineLength = Math.max(...lines.map((line) => line.length));

    // Calculate how many chars fit per line based on width
    let newCharsPerLine = Math.floor(availableWidth / params.minCellWidth);

    // Ensure minimum number of chars per line
    newCharsPerLine = Math.max(newCharsPerLine, params.minCharsPerLine);

    // If original text fits, use it
    if (maxLineLength <= newCharsPerLine) {
      newCharsPerLine = maxLineLength;
    }

    // Calculate optimal cell width based on the chars per line
    let newCellWidth = Math.floor(availableWidth / newCharsPerLine);

    // Ensure cell width stays within bounds
    newCellWidth = Math.min(
      Math.max(newCellWidth, params.minCellWidth),
      params.maxCellWidth,
    );

    // Calculate cell height based on width and aspect ratio
    let newCellHeight = Math.round(newCellWidth / params.widthRatio);

    // Ensure height is within bounds
    newCellHeight = Math.min(
      Math.max(newCellHeight, params.minCellHeight),
      params.maxCellHeight,
    );

    // Apply results
    setCharsPerLine(newCharsPerLine);
    setCellWidth(newCellWidth);
    setCellHeight(newCellHeight);

    // Update debug info
    setDebugInfo({
      orientation,
      device,
      containerWidth,
      cellWidth: newCellWidth,
      cellHeight: newCellHeight,
      charsPerLine: newCharsPerLine,
      fontSize: Math.max(newCellHeight * params.fontRatio, 10),
      ratio: params.widthRatio,
    });
  }, [encrypted, containerWidth, useMobileMode, isLandscape]);

  // Process text with word-aware line breaks and respect maxLines limit
  const processTextWithLineBreaks = (text) => {
    if (!text) return [];

    // Get orientation and device parameters
    const orientation = isLandscape ? "landscape" : "portrait";
    const device = useMobileMode ? "mobile" : "desktop";
    const params = TUNING[orientation][device];

    // Split original text into lines (respecting manual line breaks)
    const originalLines = text.split("\n");
    const processedLines = [];

    // Process lines with respect to max lines limit
    let linesAdded = 0;
    let lineBuffer = [];

    originalLines.forEach((line) => {
      // Skip if we've reached max lines
      if (linesAdded >= params.maxLines && params.maxLines > 0) return;

      // If line is shorter than the limit, keep it as is
      if (line.length <= charsPerLine) {
        if (linesAdded < params.maxLines || params.maxLines <= 0) {
          processedLines.push(line);
          linesAdded++;
        }
        return;
      }

      // For longer lines, we need to break them
      const words = line.split(/(\s+)/); // Split by whitespace, keeping separators
      let currentLine = "";

      words.forEach((word) => {
        // Check if we've reached max lines
        if (linesAdded >= params.maxLines && params.maxLines > 0) return;

        // If adding this word would exceed the limit
        if (currentLine.length + word.length > charsPerLine) {
          // If current line is not empty, push it
          if (currentLine.length > 0) {
            processedLines.push(currentLine);
            linesAdded++;
            currentLine = "";
          }

          // If we've reached max lines, stop
          if (linesAdded >= params.maxLines && params.maxLines > 0) return;

          // If the word itself is longer than the limit, we need to chunk it
          if (word.length > charsPerLine) {
            // Break long word into chunks
            for (
              let i = 0;
              i < word.length &&
              (linesAdded < params.maxLines || params.maxLines <= 0);
              i += charsPerLine
            ) {
              const chunk = word.substring(i, i + charsPerLine);
              processedLines.push(chunk);
              linesAdded++;
            }
          } else {
            currentLine = word;
          }
        } else {
          // Word fits, add it to current line
          currentLine += word;
        }
      });

      // Don't forget the last line if we haven't reached max lines
      if (
        currentLine.length > 0 &&
        (linesAdded < params.maxLines || params.maxLines <= 0)
      ) {
        processedLines.push(currentLine);
        linesAdded++;
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

  // Get orientation and device parameters for rendering
  const orientation = isLandscape ? "landscape" : "portrait";
  const device = useMobileMode ? "mobile" : "desktop";
  const params = TUNING[orientation][device];

  return (
    <div
      ref={containerRef}
      className={`text-container ${hardcoreMode ? "hardcore-mode" : ""}`}
    >
      {hardcoreMode && (
        <div className="badge-indicator hardcore-badge">HARDCORE</div>
      )}

      {/* Debug info - comment out when not needed */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "5px",
          fontSize: "10px",
          zIndex: 100,
        }}
      >
        {JSON.stringify(debugInfo, null, 2)}
      </div>

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
                    fontSize: `${Math.max(cellHeight * params.fontRatio, 10)}px`,
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
                      fontSize: `${Math.max(cellHeight * params.fontRatio, 10)}px`,
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

export default TunableTextDisplay;
