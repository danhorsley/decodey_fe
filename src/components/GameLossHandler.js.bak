// Create new file: src/components/GameLossHandler.js

import React, { useEffect } from "react";
import { getDifficultyFromMaxMistakes } from "../utils/utils";
import scoreService from "../services/scoreService";

/**
 * Component that handles recording game losses
 * This is separated from Game.js to avoid initialization issues
 */
const GameLossHandler = ({
  encrypted,
  startTime,
  mistakes,
  maxMistakes,
  isAuthenticated,
  isGameLost,
}) => {
  // Record loss when the game is lost
  useEffect(() => {
    // Only proceed if the game is lost and we have valid game data
    if (!isGameLost || !encrypted || !startTime) {
      return;
    }

    const recordLoss = async () => {
      // Check if we've already recorded this loss
      if (localStorage.getItem("game-loss-recorded")) {
        return;
      }

      // Mark that we've recorded this loss to prevent duplicate recordings
      localStorage.setItem("game-loss-recorded", "true");

      // Calculate time played before loss
      const gameTimeSeconds = Math.floor((Date.now() - startTime) / 1000);

      // Prepare the score data
      const gameData = {
        score: 0, // No points for losses
        mistakes: mistakes,
        timeTaken: gameTimeSeconds,
        difficulty: getDifficultyFromMaxMistakes(maxMistakes),
        timestamp: Date.now(),
        completed: false, // This is the key difference - mark as incomplete
        game_id: localStorage.getItem("uncrypt-game-id"),
      };

      console.log("Recording loss with data:", gameData);

      try {
        // Use the scoreService to submit the score
        const result = await scoreService.submitScore(
          gameData,
          isAuthenticated,
        );
        console.log("Loss recording result:", result);
      } catch (error) {
        console.error("Error recording loss:", error);
      }
    };

    // Execute the loss recording
    recordLoss();

    // Cleanup function to reset the recorded flag when component unmounts
    return () => {
      // We don't reset the flag here because we want it to persist
      // between component re-renders
    };
  }, [
    encrypted,
    startTime,
    mistakes,
    maxMistakes,
    isAuthenticated,
    isGameLost,
  ]);

  // This component doesn't render anything, it just handles the side effect
  return null;
};

export default GameLossHandler;
