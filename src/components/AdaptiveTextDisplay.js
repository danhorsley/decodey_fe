// src/components/AdaptiveTextDisplay.js
import React, { useRef, useEffect, useState } from "react";
import useUIStore from "../stores/uiStore";
import useDeviceDetection from "../hooks/useDeviceDetection";

/**
 * A component that adaptively displays encrypted and plaintext with proper formatting
 * - Prevents mid-word breaks
 * - Dynamically adjusts font size based on content and container
 * - Maintains proper alignment between encrypted and plaintext
 * - Handles different screen sizes and orientations
 */
const AdaptiveTextDisplay = ({
  encrypted = "",
  display = "",
  hardcoreMode = false,
}) => {
  // Container and size references
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Device and UI detection
  const useMobileMode = useUIStore((state) => state.useMobileMode);
  const { isLandscape } = useDeviceDetection();

  // Font size state
  const [fontSize, setFontSize] = useState(1);
  const [letterSpacing, setLetterSpacing] = useState(2);
  const [textClass, setTextClass] = useState("");

  // Track container size
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    // Initial measurement
    updateContainerWidth();

    // Update on resize
    window.addEventListener("resize", updateContainerWidth);

    // Listen to orientation changes for better mobile handling
    window.addEventListener("orientationchange", () => {
      // Delay measurement slightly to let device complete orientation change
      setTimeout(updateContainerWidth, 100);
    });

    // Custom event from our orientation detection system
    window.addEventListener("app:orientationchange", updateContainerWidth);

    return () => {
      window.removeEventListener("resize", updateContainerWidth);
      window.removeEventListener("orientationchange", updateContainerWidth);
      window.removeEventListener("app:orientationchange", updateContainerWidth);
    };
  }, []);

  // Debug log to verify hardcore mode
  useEffect(() => {
    console.log("AdaptiveTextDisplay - hardcoreMode:", hardcoreMode);
  }, [hardcoreMode]);

  // Adjust font size based on text length and container width
  useEffect(() => {
    if (!encrypted || containerWidth === 0) return;

    // Count unique characters to better estimate complexity
    const uniqueChars = new Set(encrypted.replace(/[^A-Z]/g, "")).size;

    // Count visible characters
    const textLength = encrypted.length;

    // Calculate maximum line length based on actual content
    const lines = encrypted.split(/[\n\r]+/);
    const maxLineLength = Math.max(...lines.map((line) => line.trim().length));

    // Base calculation
    let newFontSize = 1.25; // Default rem
    let newLetterSpacing = 2; // Default px
    let newClass = "";

    // Determine class based on text length and unique characters
    // More unique characters means a more complex quote that needs more space
    const complexityFactor = uniqueChars / 26; // Percentage of alphabet used

    if (textLength > 80 || (textLength > 70 && complexityFactor > 0.8)) {
      newClass = "quote-very-long";
      newFontSize = 1.05;
      newLetterSpacing = 0;
    } else if (textLength > 70 || (textLength > 60 && complexityFactor > 0.8)) {
      newClass = "quote-long";
      newFontSize = 1.15;
      newLetterSpacing = 0.5;
    } else if (textLength > 60 || (textLength > 50 && complexityFactor > 0.7)) {
      newClass = "quote-medium";
      newFontSize = 1.2;
      newLetterSpacing = 1;
    }

    // Mobile adjustments
    if (useMobileMode) {
      // Further reduce sizes for mobile
      newFontSize *= 0.9;
      newLetterSpacing = Math.max(0, newLetterSpacing - 0.5);

      // Special handling for landscape mode
      if (isLandscape) {
        // Even more aggressive scaling for landscape mode with long text
        if (textLength > 70) {
          newFontSize *= 0.85;
          newLetterSpacing = 0;
        }

        // Very limited height in landscape, so smaller text is better
        if (window.innerHeight < 400) {
          newFontSize *= 0.9;
        }
      }
    }

    // Very small screens (like iPhone SE)
    if (containerWidth < 320 && textLength > 50) {
      newFontSize *= 0.85;
      newLetterSpacing = 0;
    }

    // Final adjustments based on line length vs container width
    // This prevents wrapping in most cases
    const approxCharWidth = newFontSize * 0.625; // rem to em approximation
    const spacingInEm = newLetterSpacing / 16; // px to em conversion
    const approxLineWidth = maxLineLength * (approxCharWidth + spacingInEm);

    if (approxLineWidth > containerWidth && containerWidth > 0) {
      // Scale down to fit container
      const scaleFactor = (containerWidth - 10) / approxLineWidth; // 10px buffer
      newFontSize = Math.max(0.7, newFontSize * scaleFactor);
      newLetterSpacing = Math.max(0, newLetterSpacing * scaleFactor);
    }

    // Update states
    setFontSize(newFontSize);
    setLetterSpacing(newLetterSpacing);
    setTextClass(newClass);
  }, [encrypted, containerWidth, hardcoreMode, useMobileMode, isLandscape]);

  // Format text for display with proper alignment - simplified approach
  const formatText = () => {
    if (!encrypted || !display) return { __html: "" };

    // Split both texts into lines
    const encryptedLines = encrypted.split(/[\n\r]+/);
    const displayLines = display.split(/[\n\r]+/);

    // Build HTML without complex word wrapping - let CSS handle it
    const html = [];

    for (
      let i = 0;
      i < Math.max(encryptedLines.length, displayLines.length);
      i++
    ) {
      // Add encrypted line (if exists)
      if (encryptedLines[i]?.trim()) {
        html.push(
          `<div class="char-grid encrypted-line">${encryptedLines[i]}</div>`,
        );
      }

      // Add display line (if exists)
      if (displayLines[i]?.trim()) {
        html.push(
          `<div class="char-grid display-line">${displayLines[i]}</div>`,
        );
      }
    }

    return { __html: html.join("") };
  };

  return (
    <div
      ref={containerRef}
      className={`text-container ${textClass} ${hardcoreMode ? "hardcore-mode" : ""}`}
      style={{
        "--char-font-size": `${fontSize}rem`,
        "--char-letter-spacing": `${letterSpacing}px`,
      }}
    >
      {/* Hardcore mode indicator - only show this one */}
      {/* {hardcoreMode && (
        <div className="badge-indicator hardcore-badge">HARDCORE</div>
      )} */}

      {/* Content */}
      <div
        className="alternating-text"
        dangerouslySetInnerHTML={formatText()}
      />
    </div>
  );
};

export default AdaptiveTextDisplay;
