import React, { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import "../../Styles/Mobile.css";
import "../../Styles/MobileSmall.css";
import "../../Styles/DarkTheme.css";
import "../../Styles/WinCelebration.css";

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

  // Apply appropriate classes with stronger theming and data attributes for Samsung Browser
  const mobileClasses = `
    mobile-mode 
    ${theme === "dark" ? "dark-theme" : "light-theme"} 
    text-${textColor || "default"}
    ${!isLandscape ? "portrait" : "landscape"}
  `
    .trim()
    .replace(/\s+/g, " ");

  const handleDismissWarning = () => {
    setDismissedWarning(true);
  };

  // Extract components
  const extractComponents = (children) => {
    let gameHeader = null;
    let textContainer = null;
    let controls = null;
    let grids = null;
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
      } else if (child.props.className?.includes("grids")) {
        grids = child;
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
      grids,
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
      grids,
      gameMessage,
      winCelebration,
      otherElements,
    } = extractComponents(Array.isArray(children) ? children : [children]);

    if (isLandscape) {
      // Landscape layout
      return (
        <>
          {gameHeader}

          {/* Text container - close to the title */}
          <div className="text-container-wrapper">{textContainer}</div>

          {/* Main content area with grids aligned from center */}
          <div className="mobile-gameplay-container">
            {/* Left column - encrypted grid */}
            <div className="encrypted-grid-container">
              {grids && React.Children.toArray(grids.props.children)[0]}
            </div>

            {/* Right column - guess grid */}
            <div className="guess-grid-container">
              {grids && React.Children.toArray(grids.props.children)[1]}
            </div>
          </div>

          {/* Controls in a thin line at the bottom */}
          <div className="controls-container-fixed">{controls}</div>

          {/* Other elements */}
          {gameMessage}
          {winCelebration}
          {otherElements.map((element, index) => (
            <React.Fragment key={index}>{element}</React.Fragment>
          ))}
        </>
      );
    } else {
      // Portrait layout - simplified vertical stack
      return (
        <>
          {gameHeader}
          {textContainer}

          <div className="mobile-gameplay-container">
            {/* Encrypted grid on top */}
            <div className="encrypted-grid-container">
              {grids && React.Children.toArray(grids.props.children)[0]}
            </div>

            {/* Guess grid below */}
            <div className="guess-grid-container">
              {grids && React.Children.toArray(grids.props.children)[1]}
            </div>
          </div>

          <div className="controls-container-fixed">{controls}</div>

          {gameMessage}
          {winCelebration}
          {otherElements.map((element, index) => (
            <React.Fragment key={index}>{element}</React.Fragment>
          ))}
        </>
      );
    }
  };

  return (
    <div className={mobileClasses} data-theme={theme}>
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
    </div>
  );
};

export default MobileLayout;
