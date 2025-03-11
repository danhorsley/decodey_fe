// src/utils/networkUtils.js
/**
 * Utility for monitoring and reporting network status
 */

// Network status event callbacks
let networkCallbacks = [];

/**
 * Check if the browser is currently online
 * @returns {boolean} True if online, false if offline
 */
export const isOnline = () => {
  // Use the browser's navigator.onLine property
  // This is supported in all modern browsers
  return navigator.onLine;
};

/**
 * Register a callback to be notified when network status changes
 * @param {Function} callback Function to call when network status changes
 * @returns {Function} Unregister function to remove the callback
 */
export const onNetworkStatusChange = (callback) => {
  if (typeof callback !== "function") {
    console.error("Network status callback must be a function");
    return () => {};
  }

  // Add to callbacks array
  networkCallbacks.push(callback);

  // Return function to unregister
  return () => {
    networkCallbacks = networkCallbacks.filter((cb) => cb !== callback);
  };
};

// Initialize event listeners
const initNetworkListeners = () => {
  // Handler for online event
  const handleOnline = () => {
    console.log("Network is now online");
    // Notify all registered callbacks
    networkCallbacks.forEach((callback) => {
      try {
        callback(true);
      } catch (err) {
        console.error("Error in network status callback:", err);
      }
    });
  };

  // Handler for offline event
  const handleOffline = () => {
    console.log("Network is now offline");
    // Notify all registered callbacks
    networkCallbacks.forEach((callback) => {
      try {
        callback(false);
      } catch (err) {
        console.error("Error in network status callback:", err);
      }
    });
  };

  // Add event listeners
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Store initial status for debugging
  console.log(
    `Initial network status: ${navigator.onLine ? "online" : "offline"}`,
  );
};

// Initialize listeners when this module is imported
initNetworkListeners();

/**
 * One-time check if we can reach the API server
 * More reliable than just checking navigator.onLine
 * @param {string} apiUrl URL to check (defaults to /health endpoint)
 * @returns {Promise<boolean>} Promise resolving to true if API is reachable
 */
export const checkApiReachability = async (apiUrl) => {
  if (!navigator.onLine) {
    return false; // Fail fast if browser reports offline
  }

  try {
    // Try to reach the API endpoint with a small timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(apiUrl, {
      method: "HEAD", // Use HEAD to minimize data transfer
      mode: "no-cors", // Allow cross-origin without CORS headers
      cache: "no-store", // Don't use cached responses
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return true; // If we get here, API is reachable
  } catch (error) {
    console.warn("API reachability check failed:", error.message);
    return false;
  }
};
