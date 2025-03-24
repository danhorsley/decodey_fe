// src/components/DailyChallengeButton.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaCalendarDay } from "react-icons/fa";
import useSettingsStore from "../stores/settingsStore";

/**
 * Daily Challenge Button Component
 * Provides a UI element to start the daily challenge
 */
const DailyChallengeButton = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);

  // Handle button click
  const handleDailyClick = () => {
    navigate("/daily");
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
