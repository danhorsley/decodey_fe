// src/components/tutorial/TutorialOverlay.js
import React, { useState, useEffect } from "react";
import "../Styles/TutorialOverlay.css";

const tutorialSteps = [
  {
    id: "welcome",
    title: "Welcome to decodey!",
    description:
      "Ready to become a master cryptanalyst? Follow this quick tutorial to learn how to play. We'll show you everything you need to know to start decrypting!",
    targetSelector: "body", // Target the entire body for a centered modal
    position: "center", // New position type we'll handle specially
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
    description: "Click on an encrypted letter here to select it.",
    targetSelector: ".encrypted-grid",
    position: "right",
  },
  {
    id: "guess-grid",
    title: "Original Letters",
    description:
      "After selecting an encrypted letter, click a letter here to guess.",
    targetSelector: ".guess-grid",
    position: "left",
  },
  {
    id: "hint-button",
    title: "Hint Button",
    description:
      "Click here to get a hint. Each hint you take or mistake you make costs you one token. You lose if you make a mistake after you run out of tokens.",
    targetSelector: ".crossword-hint-button",
    position: "left",
  },
  {
    id: "menu",
    title: "Slide Menu",
    description:
      "Click the slide menu to create an account, log in, start new games, or view the leaderboard.",
    targetSelector: ".menu-toggle", // Changed from .game-header to .menu-toggle
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
  useEffect(() => {
    const positionElements = () => {
      const step = tutorialSteps[currentStep]; // Use a different variable name here
      const targetElement = document.querySelector(step.targetSelector);

      if (!targetElement) return;

      const targetRect = targetElement.getBoundingClientRect();

      // Position the highlight
      const highlight = document.querySelector(".tutorial-highlight");
      if (highlight) {
        highlight.style.top = `${targetRect.top}px`;
        highlight.style.left = `${targetRect.left}px`;
        highlight.style.width = `${targetRect.width}px`;
        highlight.style.height = `${targetRect.height}px`;
      }

      // Position the modal based on specified position
      const modal = document.querySelector(".tutorial-modal");
      if (!modal) return;

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
        default:
          modal.style.top = `${targetRect.bottom + 10}px`;
          modal.style.left = `${targetRect.left + targetRect.width / 2 - modal.offsetWidth / 2}px`;
      }

      // Keep modal within viewport bounds
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

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

    // Reposition on window resize
    window.addEventListener("resize", positionElements);
    return () => window.removeEventListener("resize", positionElements);
  }, [currentStep, tutorialSteps]);

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
