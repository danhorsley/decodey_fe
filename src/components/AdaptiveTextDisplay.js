// src/components/AdaptiveTextDisplay.js
import React, { useRef, useEffect, useState } from "react";
import useUIStore from "../stores/uiStore";
import useDeviceDetection from "../hooks/useDeviceDetection";
import "../Styles/AdaptiveTextDisplay.css";

const AdaptiveTextDisplay = ({
  encrypted = "",
  display = "",
  hardcoreMode = false,
}) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const useMobileMode = useUIStore((state) => state.useMobileMode);
  const { isLandscape } = useDeviceDetection();

  // Track container dimensions
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

  // Process the text content into lines and pairs
  const processText = () => {
    if (!encrypted || !display) return [];

    // Split content by newlines first to respect manual breaks
    const encryptedLines = encrypted.split("\n");
    const displayLines = display.split("\n");

    // Determine optimal line length based on orientation and screen size
    let targetLineLength;

    if (isLandscape) {
      // Landscape: longer lines
      targetLineLength = useMobileMode ? 55 : 65;
    } else {
      // Portrait: shorter lines
      targetLineLength = useMobileMode ? 30 : 45;
    }

    // For very small screens, reduce further
    if (containerWidth < 320) {
      targetLineLength = Math.max(15, Math.floor(targetLineLength * 0.8));
    }

    const textPairs = [];

    // Process each line and create pairs
    for (let i = 0; i < encryptedLines.length; i++) {
      const encLine = encryptedLines[i] || "";
      const dispLine = displayLines[i] || "";

      // If line is shorter than target, keep it intact
      if (encLine.length <= targetLineLength) {
        textPairs.push({
          encrypted: encLine,
          display: dispLine,
        });
        continue;
      }

      // For longer lines, break at word boundaries when possible
      let startIndex = 0;
      while (startIndex < encLine.length) {
        // Find the nearest word boundary
        let endIndex = startIndex + targetLineLength;
        if (endIndex < encLine.length) {
          // Look for a space to break at
          let spaceIndex = encLine.lastIndexOf(" ", endIndex);
          if (spaceIndex > startIndex && spaceIndex > endIndex - 10) {
            // Found a good break point
            endIndex = spaceIndex;
          }
          // If we're breaking mid-word, go to the exact index
        }

        // Don't exceed the string length
        endIndex = Math.min(endIndex, encLine.length);

        // Create pair with corresponding substrings
        textPairs.push({
          encrypted: encLine.substring(startIndex, endIndex),
          display: dispLine.substring(startIndex, endIndex),
        });

        // Move to next chunk
        startIndex = endIndex;
        // Skip leading space if it exists
        if (encLine[startIndex] === " ") {
          startIndex++;
        }
      }
    }

    return textPairs;
  };

  const textPairs = processText();

  // Determine styling for the character cells
  const getCellStyles = () => {
    // Base size on container width and target column count
    const columnCount = isLandscape
      ? useMobileMode
        ? 25
        : 35
      : useMobileMode
        ? 30
        : 45;

    // Minimum size thresholds for readability
    const minWidth = useMobileMode ? 8 : 10;

    // Calculate size based on available width
    let cellWidth = Math.max(minWidth, (containerWidth - 350) / columnCount);

    // Adjust for very small screens
    if (containerWidth < 320) {
      cellWidth = Math.max(minWidth, cellWidth * 0.9);
    }

    // Set height with a good aspect ratio for clarity
    const cellHeight = cellWidth * 1.3;

    // Calculate font size based on cell dimensions
    const fontSize = cellWidth * 1.4;

    return {
      cellWidth: `${cellWidth}px`,
      cellHeight: `${cellHeight}px`,
      fontSize: `${fontSize}px`,
    };
  };

  const cellStyles = getCellStyles();

  return (
    <div
      ref={containerRef}
      className={`text-container ${hardcoreMode ? "hardcore-mode" : ""} ${isLandscape ? "landscape" : "portrait"}`}
    >
      {hardcoreMode && (
        <div className="badge-indicator hardcore-badge">HARDCORE</div>
      )}

      <div className="grid-text-display">
        {textPairs.map((pair, pairIndex) => (
          <div key={`pair-${pairIndex}`} className="text-line-block">
            {/* Encrypted line */}
            <div className="char-line encrypted-line">
              {Array.from(pair.encrypted).map((char, charIndex) => (
                <div
                  key={`enc-${pairIndex}-${charIndex}`}
                  className="char-cell"
                  style={{
                    width: cellStyles.cellWidth,
                    height: cellStyles.cellHeight,
                    fontSize: cellStyles.fontSize,
                  }}
                >
                  {char}
                </div>
              ))}
            </div>

            {/* Display line */}
            <div className="char-line display-line">
              {Array.from(pair.display).map((char, charIndex) => (
                <div
                  key={`disp-${pairIndex}-${charIndex}`}
                  className="char-cell"
                  style={{
                    width: cellStyles.cellWidth,
                    height: cellStyles.cellHeight,
                    fontSize: cellStyles.fontSize,
                  }}
                >
                  {char}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdaptiveTextDisplay;
