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
    text-${textColor || "default"} 
    ${!isLandscape ? "portrait" : "landscape"}
  `
    .trim()
    .replace(/\s+/g, " ");

  const handleDismissWarning = () => {
    setDismissedWarning(true);
  };

  // Process children to ensure proper structuring for mobile layout
  const processChildren = (children) => {
    if (!React.isValidElement(children)) {
      return children;
    }

    // Find the game header, text container, controls, and grids from children
    let gameHeader = null;
    let textContainer = null;
    let controls = null;
    let grids = null;
    let otherElements = [];

    // If children is a single element, process it directly
    if (React.Children.count(children) === 1) {
      // If it's a fragment or div, process its children
      if (
        children.type === React.Fragment ||
        (typeof children.type === "string" && children.type === "div")
      ) {
        return processChildren(children.props.children);
      }
      return children;
    }

    // Process array of children
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) {
        otherElements.push(child);
        return;
      }

      if (child.props.className?.includes("game-header")) {
        gameHeader = child;
      } else if (child.props.className?.includes("text-container")) {
        textContainer = child;
      } else if (child.props.className?.includes("middle-controls-container")) {
        controls = child;
      } else if (child.props.className?.includes("grids")) {
        grids = child;
      } else {
        otherElements.push(child);
      }
    });

    // Restructure for mobile layout
    return (
      <>
        {gameHeader}
        {textContainer}
        <div className="mobile-layout-flex-container">
          {grids}
          {controls}
        </div>
        {otherElements}
      </>
    );
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
      <div className="game-content">{processChildren(children)}</div>

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
