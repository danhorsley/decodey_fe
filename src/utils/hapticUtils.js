// Add this to src/utils/hapticUtils.js
/**
 * Utility for providing haptic feedback on mobile devices
 */

// Check if vibration is supported
export const hasVibrationSupport = () => {
  return "vibrate" in navigator;
};

// Trigger vibration with different patterns based on feedback type
export const vibrate = (type = "default") => {
  if (!hasVibrationSupport()) return false;

  // Different vibration patterns for different interactions
  const patterns = {
    default: 20, // Short tap: 20ms
    success: [30, 50, 30], // Success: two short pulses with pause
    error: [80, 30, 80], // Error: two longer pulses
    hint: [20, 30, 20, 30, 20], // Hint: three quick pulses
    selection: 10, // Ultra short for selection
    keyclick: 5, // Very gentle for key clicks
    win: [50, 30, 100, 30, 50], // Win celebration: varied pattern
  };

  const pattern = patterns[type] || patterns.default;

  try {
    navigator.vibrate(pattern);
    return true;
  } catch (err) {
    console.warn("Vibration failed:", err);
    return false;
  }
};

// Enable/disable vibration system-wide
let vibrationEnabled = true;

export const setVibrationEnabled = (enabled) => {
  vibrationEnabled = enabled;

  // Store preference
  try {
    localStorage.setItem(
      "uncrypt-vibration-enabled",
      enabled ? "true" : "false",
    );
  } catch (e) {
    console.warn("Could not save vibration preference");
  }
};

export const isVibrationEnabled = () => vibrationEnabled;

// Initialize from stored preference
export const initVibrationPreference = () => {
  try {
    const stored = localStorage.getItem("uncrypt-vibration-enabled");
    if (stored !== null) {
      vibrationEnabled = stored === "true";
    } else {
      // Default to enabled on mobile, disabled on desktop
      vibrationEnabled = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }
  } catch (e) {
    console.warn("Could not load vibration preference");
  }
};
