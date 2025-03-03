import React, { useState, useEffect } from "react";
import { useAppContext } from "./AppContext";
import "./Mobile.css";

/**
 * A wrapper component for the mobile layout
 * Handles orientation messaging and applies mobile-specific classes
 */
const MobileLayout = ({ children, isLandscape }) => {
  // Get theme settings from context
  const { settings } = useAppContext();
  const { theme, textColor } = settings;
  const [dismissedWarning, setDismissedWarning] = useState(false);

  // Reset dismissed state when orientation changes to portrait
  useEffect(() => {
    if (!isLandscape) {
      // Wait a moment before showing the warning to avoid flashing during rotation
      const timer = setTimeout(() => {
        setDismissedWarning(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLandscape]);

  // Determine if we should show portrait warning
  const showPortraitWarning = !isLandscape && !dismissedWarning;

  // Apply appropriate classes
  const mobileClasses = `
    mobile-mode 
    ${theme === "dark" ? "dark-theme" : ""} 
    text-${settings.textColor || "default"}
    placeholder-${settings.placeholderStyle}
    ${!isLandscape ? "portrait" : "landscape"}
  `
    .trim()
    .replace(/\s+/g, " ");

  const handleDismissWarning = () => {
    setDismissedWarning(true);
  };

  // Find the different components we need to rearrange
  const extractComponents = (children) => {
    let gameHeader = null;
    let textContainer = null;
    let controls = null;
    let sidebar = null;
    let grids = null;
    let keyboardHint = null;
    let gameMessage = null;
    let winCelebration = null;
    let otherElements = [];

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) {
        otherElements.push(child);
        return;
      }

      if (child.props.className?.includes("game-header")) {
        gameHeader = child;
      } else if (child.props.className?.includes("text-container")) {
        textContainer = child;
      } else if (child.props.className?.includes("controls")) {
        controls = child;
      } else if (child.props.className?.includes("sidebar")) {
        sidebar = child;
      } else if (child.props.className?.includes("grids")) {
        grids = child;
      } else if (child.props.className?.includes("keyboard-hint")) {
        keyboardHint = child;
      } else if (child.props.className?.includes("game-message")) {
        gameMessage = child;
      } else if (child.props.className?.includes("win-celebration")) {
        winCelebration = child;
      } else {
        otherElements.push(child);
      }
    });

    return {
      gameHeader,
      textContainer,
      controls,
      sidebar,
      grids,
      keyboardHint,
      gameMessage,
      winCelebration,
      otherElements,
    };
  };

  // Process all children to restructure for mobile layout
  const renderMobileLayout = (children) => {
    // Extract components
    const {
      gameHeader,
      textContainer,
      controls,
      sidebar,
      grids,
      keyboardHint,
      gameMessage,
      winCelebration,
      otherElements,
    } = extractComponents(Array.isArray(children) ? children : [children]);

    // Check orientation to apply different layouts
    const isLandscape = window.innerWidth > window.innerHeight;

    if (isLandscape) {
      // Landscape layout - three column
      return (
        <>
          {gameHeader}

          {/* Main three-column container */}
          <div className="mobile-layout-container">
            {/* Left column - encrypted grid */}
            <div className="encrypted-grid-container">
              {grids && React.Children.toArray(grids.props.children)[0]}
            </div>

            {/* Center column - text */}
            {textContainer}

            {/* Right column - guess grid */}
            <div className="guess-grid-container">
              {grids && React.Children.toArray(grids.props.children)[1]}
            </div>
          </div>

          {/* Bottom container for other elements */}
          <div className="bottom-container">
            {sidebar}
            <div className="controls-container">{controls}</div>
            {keyboardHint}
            {gameMessage}
          </div>

          {/* Win celebration overlay */}
          {winCelebration}

          {/* Other elements */}
          {otherElements.map((element, index) => (
            <React.Fragment key={index}>{element}</React.Fragment>
          ))}
        </>
      );
    } else {
      // Portrait layout - vertical stack
      return (
        <>
          {gameHeader}

          {/* Text container */}
          {textContainer}

          {/* Grids */}
          {grids}

          {/* Bottom elements */}
          {sidebar}
          <div className="controls-container">{controls}</div>
          {keyboardHint}
          {gameMessage}
          {winCelebration}

          {/* Other elements */}
          {otherElements.map((element, index) => (
            <React.Fragment key={index}>{element}</React.Fragment>
          ))}
        </>
      );
    }
  };

  return (
    <div className={mobileClasses}>
      {/* Orientation warning overlay */}
      {showPortraitWarning && (
        <div className="mobile-orientation-warning">
          <div className="orientation-message">
            <h3>
              For the best experience, please rotate your device to landscape
              mode
            </h3>
            <p>
              This game is designed to be played with your phone in landscape
              orientation
            </p>
            <button
              className="orientation-dismiss"
              onClick={handleDismissWarning}
            >
              Continue Anyway
            </button>
          </div>
        </div>
      )}

      {/* Main content with mobile-specific structure */}
      <div className="game-content">{renderMobileLayout(children)}</div>

      {/* Optional debug information - can be removed in production */}
      {process.env.NODE_ENV === "development" && (
        <div
          className="debug-info"
          style={{
            position: "fixed",
            bottom: 0,
            right: 0,
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "5px",
            fontSize: "10px",
            zIndex: 9999,
          }}
        >
          {isLandscape ? "Landscape" : "Portrait"} Mode
        </div>
      )}
    </div>
  );
};

export default MobileLayout;
