// src/components/tutorial/TutorialOverlay.js
import React, { useState, useEffect } from "react";
import "../Styles/TutorialOverlay.css";

const tutorialSteps = [
  {
    id: "welcome",
    title: "Welcome to decodey!",
    description:
      "Ready to become a master cryptanalyst? Follow this quick tutorial to learn how to play.",
    targetSelector: "body",
    position: "center",
  },
  {
    id: "text-display",
    title: "Encrypted Text",
    description: "This shows the encrypted quote you need to decrypt.",
    targetSelector: ".text-container",
    position: "bottom",
  },
  {
    id: "encrypted-grid",
    title: "Encrypted Letters",
    description: "Click a letter here to select it for decoding.",
    targetSelector: ".encrypted-grid",
    position: "right", // Will be auto-adjusted on small screens
    smallScreenPosition: "top", // Prefer top on small screens
  },
  {
    id: "guess-grid",
    title: "Original Letters",
    description:
      "And then click on this grid to choose the real letter you think it represents.",
    targetSelector: ".guess-grid",
    position: "left", // Will be auto-adjusted on small screens
    smallScreenPosition: "top", // Prefer top on small screens
  },
  {
    id: "hint-button",
    title: "Hint Button",
    description:
      "Stuck? Use a hint to reveal a letter. Each hint or mistake costs one token.",
    targetSelector: ".crossword-hint-button",
    position: "left", // Will be auto-adjusted on small screens
    smallScreenPosition: "top", // Prefer top on small screens
  },
  {
    id: "menu",
    title: "Slide Menu",
    description:
      "Start new games, or change difficulty and other settings. Create a free account to save scores and compete on leaderboards.",
    targetSelector: ".menu-toggle",
    position: "bottom",
  },
];

const TutorialOverlay = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Mark tutorial as started
    localStorage.setItem("tutorial-started", "true");
  }, []);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark tutorial as completed
      localStorage.setItem("tutorial-completed", "true");
      setIsVisible(false);
      if (onComplete) onComplete();
    }
  };
  // Positioning logic
  useEffect(() => {
    const positionElements = () => {
      const step = tutorialSteps[currentStep];
      const targetElement = document.querySelector(step.targetSelector);

      if (!targetElement) return;

      const targetRect = targetElement.getBoundingClientRect();
      const isPortrait = window.innerHeight > window.innerWidth;
      const isSmallScreen = window.innerHeight < 700; // Threshold for small screens like S8/SE
      const isVerySmallScreen = window.innerHeight < 600; // Extra small screens

      // Position the highlight
      const highlight = document.querySelector(".tutorial-highlight");
      if (highlight) {
        highlight.style.top = `${targetRect.top}px`;
        highlight.style.left = `${targetRect.left}px`;
        highlight.style.width = `${targetRect.width}px`;
        highlight.style.height = `${targetRect.height}px`;
      }

      // Position the modal based on specified position and orientation
      const modal = document.querySelector(".tutorial-modal");
      if (!modal) return;

      // Reset any previous transforms or special styles
      modal.style.transform = "none";
      modal.style.opacity = "1";

      // Add a data attribute to track screen size for CSS
      if (isSmallScreen) {
        modal.setAttribute("data-small-screen", "true");

        if (isVerySmallScreen) {
          modal.setAttribute("data-very-small-screen", "true");
        } else {
          modal.removeAttribute("data-very-small-screen");
        }
      } else {
        modal.removeAttribute("data-small-screen");
        modal.removeAttribute("data-very-small-screen");
      }

      // Special case for welcome step - always center
      if (step.id === "welcome") {
        // Center positioning for welcome step
        modal.style.top = "50%";
        modal.style.left = "50%";
        modal.style.transform = "translate(-50%, -50%)";
        return;
      }

      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate available space
      const spaceAbove = targetRect.top;
      const spaceBelow = viewportHeight - targetRect.bottom;
      const spaceLeft = targetRect.left;
      const spaceRight = viewportWidth - targetRect.right;

      // For small screens, check available space and adjust
      if (isSmallScreen && isPortrait) {
        // Check if step has a preferred small screen position
        const smallScreenPos = step.smallScreenPosition;

        if (smallScreenPos === "top" && spaceAbove > 120) {
          // Use the preferred top position if there's enough space
          modal.style.top = `${targetRect.top - modal.offsetHeight - 10}px`;
          modal.style.left = `${targetRect.left + targetRect.width / 2 - modal.offsetWidth / 2}px`;
        } else if (smallScreenPos === "bottom" && spaceBelow > 120) {
          // Use the preferred bottom position if there's enough space
          modal.style.top = `${targetRect.bottom + 10}px`;
          modal.style.left = `${targetRect.left + targetRect.width / 2 - modal.offsetWidth / 2}px`;
        } else {
          // Make tutorial semi-transparent on small screens for these specific elements
          if (step.id === "guess-grid" || step.id === "hint-button") {
            modal.style.opacity = "0.9";
          }

          // Determine best position based on available space
          if (spaceBelow > modal.offsetHeight + 10 || spaceBelow > spaceAbove) {
            // If there's enough space below OR more space below than above
            modal.style.top = `${targetRect.bottom + 10}px`;
            modal.style.left = `${targetRect.left + targetRect.width / 2 - modal.offsetWidth / 2}px`;
          } else if (spaceAbove > 120) {
            // Minimum reasonable space for the modal
            // Position above the element
            modal.style.top = `${targetRect.top - modal.offsetHeight - 10}px`;
            modal.style.left = `${targetRect.left + targetRect.width / 2 - modal.offsetWidth / 2}px`;
          } else if (
            spaceLeft > modal.offsetWidth + 10 ||
            spaceLeft > spaceRight
          ) {
            // Try left side if there's room
            modal.style.top = `${targetRect.top + targetRect.height / 2 - modal.offsetHeight / 2}px`;
            modal.style.left = `${targetRect.left - modal.offsetWidth - 10}px`;
          } else if (spaceRight > modal.offsetWidth + 10) {
            // Try right side if there's room
            modal.style.top = `${targetRect.top + targetRect.height / 2 - modal.offsetHeight / 2}px`;
            modal.style.left = `${targetRect.right + 10}px`;
          } else {
            // Fallback - just make it semi-transparent and place below
            // This ensures user can still see what's being highlighted even if covered
            modal.style.opacity = "0.85";
            modal.style.top = `${targetRect.bottom + 5}px`;
            modal.style.left = `${targetRect.left + targetRect.width / 2 - modal.offsetWidth / 2}px`;
          }
        }
      } else if (isPortrait) {
        // Regular portrait device - default to below
        modal.style.top = `${targetRect.bottom + 10}px`;
        modal.style.left = `${targetRect.left + targetRect.width / 2 - modal.offsetWidth / 2}px`;
      } else {
        // In landscape, use the specified position
        switch (step.position) {
          case "top":
            modal.style.top = `${targetRect.top - modal.offsetHeight - 10}px`;
            modal.style.left = `${targetRect.left + targetRect.width / 2 - modal.offsetWidth / 2}px`;
            break;
          case "bottom":
            modal.style.top = `${targetRect.bottom + 10}px`;
            modal.style.left = `${targetRect.left + targetRect.width / 2 - modal.offsetWidth / 2}px`;
            break;
          case "left":
            modal.style.top = `${targetRect.top + targetRect.height / 2 - modal.offsetHeight / 2}px`;
            modal.style.left = `${targetRect.left - modal.offsetWidth - 10}px`;
            break;
          case "right":
            modal.style.top = `${targetRect.top + targetRect.height / 2 - modal.offsetHeight / 2}px`;
            modal.style.left = `${targetRect.right + 10}px`;
            break;
          case "center":
            modal.style.top = "50%";
            modal.style.left = "50%";
            modal.style.transform = "translate(-50%, -50%)";
            break;
          default:
            modal.style.top = `${targetRect.bottom + 10}px`;
            modal.style.left = `${targetRect.left + targetRect.width / 2 - modal.offsetWidth / 2}px`;
        }
      }

      // Keep modal within viewport bounds
      if (parseInt(modal.style.left) < 10) {
        modal.style.left = "10px";
      } else if (
        parseInt(modal.style.left) + modal.offsetWidth >
        viewportWidth - 10
      ) {
        modal.style.left = `${viewportWidth - modal.offsetWidth - 10}px`;
      }

      if (parseInt(modal.style.top) < 10) {
        modal.style.top = "10px";
      } else if (
        parseInt(modal.style.top) + modal.offsetHeight >
        viewportHeight - 10
      ) {
        modal.style.top = `${viewportHeight - modal.offsetHeight - 10}px`;
      }
    };

    // Add a slight delay to ensure DOM is ready
    setTimeout(positionElements, 50);

    // Reposition on window resize and orientation change
    window.addEventListener("resize", positionElements);
    window.addEventListener("orientationchange", () => {
      // Add extra delay after orientation change to ensure UI is settled
      setTimeout(positionElements, 150);
    });

    return () => {
      window.removeEventListener("resize", positionElements);
      window.removeEventListener("orientationchange", positionElements);
    };
  }, [currentStep, tutorialSteps]);
  // Handle orientation changes
  useEffect(() => {
    // Track previous orientation
    let prevOrientation =
      window.innerHeight > window.innerWidth ? "portrait" : "landscape";

    const handleOrientationChange = () => {
      // Get current orientation
      const currentOrientation =
        window.innerHeight > window.innerWidth ? "portrait" : "landscape";

      // If orientation has changed, force a reset of positions
      if (prevOrientation !== currentOrientation) {
        console.log(
          `Orientation changed from ${prevOrientation} to ${currentOrientation}`,
        );
        prevOrientation = currentOrientation;

        // Use a short delay to ensure the UI has settled after rotation
        setTimeout(() => {
          // Force a refresh of the tutorial position
          const highlight = document.querySelector(".tutorial-highlight");
          const modal = document.querySelector(".tutorial-modal");

          if (highlight && modal) {
            // Temporarily hide elements while repositioning
            highlight.style.opacity = "0";
            modal.style.opacity = "0";

            // Force recalculation after a brief delay
            setTimeout(() => {
              // Trigger the positionElements function by forcing a re-render
              setCurrentStep(currentStep);

              // Fade elements back in after positioning
              setTimeout(() => {
                highlight.style.opacity = "1";
                modal.style.opacity = "1";
              }, 50);
            }, 300);
          }
        }, 500);
      }
    };

    // Add event listeners for both standard and iOS orientation changes
    window.addEventListener("resize", handleOrientationChange);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("resize", handleOrientationChange);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, [currentStep]);
  // wait until game is fully loaded to ensure all elements are available
  useEffect(() => {
    // Mark tutorial as started
    localStorage.setItem("tutorial-started", "true");

    // Let's make sure everything is loaded before showing the initial welcome
    if (currentStep === 0) {
      const checkAllElementsExist = () => {
        // Skip welcome check since it targets body
        const nextStep = tutorialSteps[1];
        const element = document.querySelector(nextStep.targetSelector);
        return !!element;
      };

      // If next step element doesn't exist yet, try again in a moment
      if (!checkAllElementsExist()) {
        const timer = setTimeout(() => {
          // Force a re-render to try positioning again
          setCurrentStep(0);
        }, 300);

        return () => clearTimeout(timer);
      }
    }
  }, [currentStep]);
  const handleSkip = () => {
    // Mark tutorial as completed
    localStorage.setItem("tutorial-completed", "true");
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  if (!isVisible) return null;

  const currentTutorialStep = tutorialSteps[currentStep];

  return (
    <div className="tutorial-overlay">
      <div
        className="tutorial-highlight"
        data-target={currentTutorialStep.targetSelector}
      ></div>
      <div
        className={`tutorial-modal tutorial-position-${currentTutorialStep.position}`}
        data-target={currentTutorialStep.targetSelector}
      >
        <h3>{currentTutorialStep.title}</h3>
        <p>{currentTutorialStep.description}</p>
        <div className="tutorial-buttons">
          <button className="tutorial-skip" onClick={handleSkip}>
            Skip Tutorial
          </button>
          <button className="tutorial-next" onClick={handleNext}>
            {currentStep === tutorialSteps.length - 1 ? "Finish" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
