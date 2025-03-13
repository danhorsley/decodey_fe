// src/utils/ClickHandlers.js
/**
 * Extracted click handlers for Game.js to simplify the main component
 */

/**
 * Handle clicking on an encrypted letter
 */
export const handleEncryptedClick = (
  letter,
  correctlyGuessed,
  dispatch,
  playSound,
) => {
  if (!correctlyGuessed.includes(letter)) {
    dispatch({
      type: "SUBMIT_GUESS",
      payload: { selectedEncrypted: letter },
    });
    playSound && playSound("keyclick");
  }
};

/**
 * Handle submitting a guess for a letter mapping
 */
export const submitGuess = async (
  selectedEncrypted,
  guessedLetter,
  gameState,
  apiService,
  dispatch,
  playSound,
) => {
  // Safety check - if no letter is selected, don't proceed
  if (!selectedEncrypted || !guessedLetter) {
    console.warn(
      "Cannot submit guess: No encrypted letter selected or no guess provided",
    );
    return;
  }

  const gameId = localStorage.getItem("uncrypt-game-id");
  console.log(`Submitting guess: ${selectedEncrypted} → ${guessedLetter}`);

  try {
    const data = await apiService.submitGuess(
      gameId,
      selectedEncrypted,
      guessedLetter,
    );

    if (!data) {
      console.error("Received empty response from submitGuess");
      return;
    }

    // Handle session expiration
    if (data.error && data.error.includes("Session expired")) {
      console.warn("Session expired, restarting game");
      return { sessionExpired: true };
    }

    // Process display text
    let displayText = data.display;
    if (gameState.hardcoreMode && displayText) {
      displayText = displayText.replace(/[^A-Z█]/g, "");
    }

    // Prepare state update
    const payload = {
      display: displayText || gameState.display,
      mistakes:
        typeof data.mistakes === "number" ? data.mistakes : gameState.mistakes,
      selectedEncrypted: null, // Reset selected letter
    };

    // Handle correctly guessed letters
    if (Array.isArray(data.correctly_guessed)) {
      payload.correctlyGuessed = data.correctly_guessed;

      // Check if this guess was correct (not previously guessed)
      if (
        data.correctly_guessed.includes(selectedEncrypted) &&
        !gameState.correctlyGuessed.includes(selectedEncrypted)
      ) {
        // This was a new correct guess
        payload.lastCorrectGuess = selectedEncrypted;
        payload.guessedMappings = {
          ...gameState.guessedMappings,
          [selectedEncrypted]: guessedLetter.toUpperCase(),
        };

        // Play correct sound
        playSound && playSound("correct");
      } else if (data.mistakes > gameState.mistakes) {
        // This was an incorrect guess
        playSound && playSound("incorrect");
      }
    }

    // Update game state
    dispatch({ type: "SUBMIT_GUESS", payload });
    return { success: true };
  } catch (err) {
    console.error("Error submitting guess:", err);
    return { success: false, error: err };
  }
};

/**
 * Handle clicking on a guess letter
 */
export const handleGuessClick = (
  guessedLetter,
  selectedEncrypted,
  submitGuessFunc,
) => {
  if (selectedEncrypted) {
    submitGuessFunc(guessedLetter);
  }
};

/**
 * Handle getting a hint
 */
export const handleHint = async (
  apiService,
  gameState,
  dispatch,
  playSound,
) => {
  console.log("Requesting hint...");

  try {
    const data = await apiService.getHint();

    if (!data) {
      console.error("Received empty response from getHint");
      return;
    }

    // Handle session expiration
    if (data.error && data.error.includes("Session expired")) {
      console.warn("Session expired, restarting game");
      return { sessionExpired: true };
    }

    // Process display text
    let displayText = data.display;
    if (gameState.hardcoreMode && displayText) {
      displayText = displayText.replace(/[^A-Z█]/g, "");
    }

    // Calculate which letters were newly revealed
    const newCorrectlyGuessed =
      data.correctly_guessed || gameState.correctlyGuessed;
    const newlyAdded = newCorrectlyGuessed.filter(
      (letter) => !gameState.correctlyGuessed.includes(letter),
    );

    console.log("Hint revealed:", newlyAdded);

    // Update mappings for newly revealed letters
    const newMappings = { ...gameState.guessedMappings };

    newlyAdded.forEach((encryptedLetter) => {
      for (let i = 0; i < gameState.encrypted.length; i++) {
        if (
          gameState.encrypted[i] === encryptedLetter &&
          data.display[i] !== "?" &&
          data.display[i] !== "█"
        ) {
          newMappings[encryptedLetter] = data.display[i];
          break;
        }
      }
    });

    // Create update payload
    const payload = {
      display: displayText,
      mistakes: data.mistakes,
      correctlyGuessed: newCorrectlyGuessed,
      guessedMappings: newMappings,
    };

    // Update game state
    dispatch({ type: "SET_HINT", payload });

    // Play hint sound
    playSound && playSound("hint");

    return { success: true };
  } catch (err) {
    console.error("Error getting hint:", err);
    return { success: false, error: err };
  }
};
