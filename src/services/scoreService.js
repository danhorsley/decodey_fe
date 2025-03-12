// src/services/scoreService.js
import apiService from "./apiService";
import { isOnline, onNetworkStatusChange } from "../utils/networkUtils";
import config from "../config";

// Key for storing pending scores in localStorage
const PENDING_SCORES_KEY = "uncrypt-pending-scores";

/**
 * Load pending scores from localStorage
 * @returns {Array} Array of pending score objects
 */
export const loadPendingScores = () => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_SCORES_KEY) || "[]");
  } catch (error) {
    console.error("Error loading pending scores:", error);
    return [];
  }
};

/**
 * Save pending scores to localStorage
 * @param {Array} scores Array of score objects to save
 */
export const savePendingScores = (scores) => {
  try {
    localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(scores));
  } catch (error) {
    console.error("Error saving pending scores:", error);
  }
};

/**
 * Add a score to the pending queue
 * @param {Object} scoreData Score data to queue
 */
export const queueScore = (scoreData) => {
  const pendingScores = loadPendingScores();
  const gameId = localStorage.getItem("uncrypt-game-id");

  // Add game_id to score data if not already present
  const scoreWithGameId = {
    ...scoreData,
    game_id: scoreData.game_id || gameId,
    queuedAt: Date.now(), // Add timestamp for sorting/debugging
  };

  pendingScores.push(scoreWithGameId);
  savePendingScores(pendingScores);

  // Log the queued score
  console.log("Score queued for later submission:", scoreWithGameId);

  return {
    success: false,
    queued: true,
    pendingCount: pendingScores.length,
    message: "Score saved locally. Will submit when online.",
  };
};

/**
 * Clear all pending scores
 */
export const clearPendingScores = () => {
  localStorage.removeItem(PENDING_SCORES_KEY);
};

/**
 * Get count of pending scores
 * @returns {number} Number of pending scores
 */
export const getPendingCount = () => {
  return loadPendingScores().length;
};

/**
 * Try to submit all pending scores
 * @param {boolean} isAuthenticated Current authentication state
 * @returns {Promise<{success: boolean, submitted: number, failed: number, message: string}>}
 */
export const submitPendingScores = async (isAuthenticated = null) => {
  // Don't try to submit if we're offline
  if (!isOnline()) {
    return {
      success: false,
      submitted: 0,
      failed: 0,
      message: "Currently offline. Will try again when online.",
    };
  }

  // Don't try to submit if we're not authenticated and auth state is known
  if (isAuthenticated === false) {
    return {
      success: false,
      submitted: 0,
      failed: 0,
      authRequired: true,
      message: "Authentication required to submit scores.",
    };
  }

  const pendingScores = loadPendingScores();
  if (pendingScores.length === 0) {
    return {
      success: true,
      submitted: 0,
      failed: 0,
      message: "No pending scores to submit.",
    };
  }

  console.log(`Attempting to submit ${pendingScores.length} pending scores...`);

  // Track results
  let submitted = 0;
  let failed = 0;
  const remainingScores = [];

  // Try to submit each score
  for (const scoreData of pendingScores) {
    try {
      const result = await apiService.recordScore(scoreData);

      if (result.success || result.score_id) {
        // Successfully submitted
        submitted++;
        console.log("Pending score submitted successfully:", scoreData);
      } else if (result.authRequired) {
        // Auth required - keep in queue
        remainingScores.push(scoreData);
        failed++;
        console.log("Authentication required for score:", scoreData);
      } else {
        // Other failure - keep in queue for retry
        remainingScores.push(scoreData);
        failed++;
        console.log("Failed to submit pending score:", scoreData);
      }
    } catch (error) {
      // Error submitting - keep in queue
      remainingScores.push(scoreData);
      failed++;
      console.error("Error submitting pending score:", error);
    }
  }

  // Update pending scores with remaining ones
  savePendingScores(remainingScores);

  // Generate result message
  let message = "";
  if (submitted > 0 && failed === 0) {
    message = `${submitted} pending score${submitted !== 1 ? "s" : ""} submitted successfully.`;
  } else if (submitted > 0 && failed > 0) {
    message = `${submitted} score${submitted !== 1 ? "s" : ""} submitted. ${failed} ${failed !== 1 ? "scores" : "score"} still pending.`;
  } else if (submitted === 0 && failed > 0) {
    message = `Failed to submit ${failed} pending score${failed !== 1 ? "s" : ""}.`;
  }

  return {
    success: submitted > 0,
    submitted,
    failed,
    remaining: remainingScores.length,
    message,
  };
};

/**
 * Submit a score with offline queueing
 * @param {Object} scoreData Score data to submit
 * @param {boolean} isAuthenticated Current authentication state
 * @returns {Promise<Object>} Result object
 */
/**
 * Submit a score with offline queueing, handling both wins and losses
 * @param {Object} scoreData Score data to submit
 * @param {boolean} isAuthenticated Current authentication state
 * @returns {Promise<Object>} Result object
 */
export const submitScore = async (scoreData, isAuthenticated = null) => {
  // Ensure completed flag is included
  if (scoreData.completed === undefined) {
    // Default to true for backward compatibility
    scoreData.completed = true;
  }

  // If offline, queue the score
  if (!isOnline()) {
    return queueScore(scoreData);
  }

  // If not authenticated and auth state is known, queue the score
  if (isAuthenticated === false) {
    return {
      ...queueScore(scoreData),
      authRequired: true,
      message: "Authentication required. Score saved locally.",
    };
  }

  try {
    // Try to submit directly
    const result = await apiService.recordScore(scoreData);

    // Handle API responses
    if (result.success || result.score_id) {
      return {
        success: true,
        message: result.message || "Score recorded successfully!",
        score_id: result.score_id,
      };
    } else if (result.authRequired) {
      // Auth required - queue the score
      return {
        ...queueScore(scoreData),
        authRequired: true,
        message: "Authentication required. Score saved locally.",
      };
    } else {
      // Other API failure - queue the score
      return queueScore(scoreData);
    }
  } catch (error) {
    console.error("Error submitting score:", error);
    // Error submitting - queue the score
    return queueScore(scoreData);
  }
};

// Set up network status change handler to automatically try submitting
// when we come back online
let isSubmitting = false;
onNetworkStatusChange(async (online) => {
  if (online && !isSubmitting) {
    const pendingCount = getPendingCount();

    if (pendingCount > 0) {
      console.log(
        `Network is back online. Attempting to submit ${pendingCount} pending scores.`,
      );

      isSubmitting = true;
      try {
        await submitPendingScores();
      } finally {
        isSubmitting = false;
      }
    }
  }
});

export default {
  submitScore,
  submitPendingScores,
  getPendingCount,
  loadPendingScores,
  clearPendingScores,
};
