// src/components/DailyChallengeButton.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaCalendarDay } from "react-icons/fa";
import useSettingsStore from "../stores/settingsStore";
import useGameService from "../hooks/useGameService";

/**
 * Daily Challenge Button Component
 * Provides a UI element to start the daily challenge
 */
const DailyChallengeButton = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);
  const { startDailyChallenge } = useGameService();

  // Handle button click - starts daily challenge directly
  const handleDailyClick = async () => {
    try {
      // Start daily challenge directly using our simplified service
      const result = await startDailyChallenge();

      if (result.success) {
        // If successful, navigate to main game route if not already there
        if (window.location.pathname !== "/") {
          navigate("/");
        }
      } else if (result.alreadyCompleted) {
        // If already completed, navigate to main game with a state flag
        navigate("/", { 
          state: { 
            dailyCompleted: true,
            completionData: result.completionData 
          }
        });
      } else {
        // On error, still go to main game page
        console.error("Failed to start daily challenge:", result.error);
        navigate("/");
      }
    } catch (error) {
      console.error("Error starting daily challenge:", error);
      navigate("/");
    }
  };

  return (
    <button
      className="daily-challenge-button-fixed"
      onClick={handleDailyClick}
      aria-label="Daily Challenge"
      title="Start Today's Daily Challenge"
    >
      <FaCalendarDay size={16} />
    </button>
  );
};

export default DailyChallengeButton;