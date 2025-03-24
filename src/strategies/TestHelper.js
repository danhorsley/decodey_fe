// src/utils/strategyTestHelper.js
/**
 * This utility is for testing the strategy pattern implementation
 * It can be temporarily added to a component to verify which strategy is being used
 */

import GameStrategyFactory from "../strategies/GameStrategyFactory";
import EventEmitter from "events";

const testEventEmitter = new EventEmitter();
const strategyFactory = new GameStrategyFactory(testEventEmitter);

/**
 * Test function to log which strategy would be used
 * @returns {string} Name of the strategy that would be used
 */
export const testStrategySelection = () => {
  try {
    const strategy = strategyFactory.getStrategy();
    const strategyName = strategy.constructor.name;

    console.log(`Selected strategy: ${strategyName}`);
    console.log(`Is authenticated: ${!strategy.isAnonymous}`);

    return strategyName;
  } catch (error) {
    console.error("Error testing strategy selection:", error);
    return "Error determining strategy";
  }
};

/**
 * Log current authentication state and game ID
 */
export const logGameState = () => {
  const gameId = localStorage.getItem("uncrypt-game-id");
  const authToken =
    localStorage.getItem("uncrypt-token") ||
    sessionStorage.getItem("uncrypt-token");

  console.log(`Current game ID: ${gameId || "none"}`);
  console.log(`Auth state: ${authToken ? "Authenticated" : "Anonymous"}`);
};

export default {
  testStrategySelection,
  logGameState,
};
