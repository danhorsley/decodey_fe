import { useEffect } from "react";

/**
 * Custom hook to handle keyboard inputs for the Decrypto game
 * Updated with robust default values to prevent undefined property access
 *
 * @param {Object} props - Configuration and callback functions
 * @param {boolean} [props.enabled=true] - Whether keyboard control is enabled
 * @param {boolean} [props.speedMode=false] - Whether speed mode is active
 * @param {Array<string>} [props.encryptedLetters=[]] - Array of encrypted letters in the grid
 * @param {Array<string>} [props.originalLetters=[]] - Array of original letters for guessing
 * @param {string|null} [props.selectedEncrypted=null] - Currently selected encrypted letter
 * @param {Function} [props.onEncryptedSelect=()=>{}] - Callback when an encrypted letter is selected
 * @param {Function} [props.onGuessSubmit=()=>{}] - Callback when a guess is submitted
 * @param {Function} [props.playSound] - Function to play sound effects
 * @returns {Object} - State of the keyboard input
 */
const useKeyboardInput = (props = {}) => {
  // Extract properties with default values to prevent undefined errors
  const {
    enabled = true,
    speedMode = false,
    encryptedLetters = [],
    originalLetters = [],
    selectedEncrypted = null,
    onEncryptedSelect = () => {},
    onGuessSubmit = () => {},
    playSound,
  } = props || {};

  // Handle all keyboard events
  useEffect(() => {
    // Early return if not enabled - IMPORTANT for modals
    if (!enabled) {
      return;
    }

    // Safety checks for required callback functions
    if (
      typeof onEncryptedSelect !== "function" ||
      typeof onGuessSubmit !== "function"
    ) {
      console.error("KeyboardController: required callbacks are missing");
      return;
    }

    const handleKeyPress = (event) => {
      // First check if input or textarea is focused - don't handle keyboard events
      // when user is typing in a form field
      if (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA" ||
        document.activeElement.isContentEditable
      ) {
        return;
      }

      // Add safety check - event must have a key property
      if (!event.key) {
        return;
      }

      // Convert to uppercase safely
      const key = event.key.toUpperCase();

      // Handle ESC key to deselect
      if (event.key === "Escape") {
        if (selectedEncrypted) {
          onEncryptedSelect(null);
          playSound && playSound("keyclick");
          event.preventDefault();
        }
        return;
      }

      // Check if key is a letter A-Z
      if (/^[A-Z]$/.test(key)) {
        // In speed mode, first press selects from encrypted grid, second submits guess
        if (speedMode) {
          // If no letter is selected, try to select from encrypted grid
          if (!selectedEncrypted) {
            // Check if this letter exists in the encrypted grid
            const isInEncryptedGrid = encryptedLetters.includes(key);
            if (isInEncryptedGrid) {
              onEncryptedSelect(key);
              playSound && playSound("keyclick");
              event.preventDefault();
            }
          }
          // If a letter is already selected, submit the guess
          else {
            // Check if key is in original letters
            if (originalLetters.includes(key)) {
              onGuessSubmit(key);
              event.preventDefault();
            }
          }
        }
        // In normal mode, just submit guess if a letter is selected
        else if (selectedEncrypted) {
          onGuessSubmit(key);
          event.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    enabled,
    speedMode,
    encryptedLetters,
    originalLetters,
    selectedEncrypted,
    onEncryptedSelect,
    onGuessSubmit,
    playSound,
  ]);

  // Return the current state (could be extended with more state if needed)
  return {
    isActive: enabled,
    speedModeActive: speedMode,
  };
};

export default useKeyboardInput;