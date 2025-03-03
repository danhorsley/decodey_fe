/**
 * Utility functions for the Decrypto app
 */

/**
 * Formats an all-caps major attribution to proper title case
 * @param {string} text - The all-caps attribution text to format
 * @returns {string} - Properly formatted text
 */
export const formatMajorAttribution = (text) => {
  if (!text) return "";

  // List of articles, conjunctions, and prepositions that should be lowercase
  // unless they are the first word
  const lowerCaseWords = [
    "a",
    "an",
    "the",
    "and",
    "but",
    "or",
    "for",
    "nor",
    "on",
    "at",
    "to",
    "from",
    "by",
    "in",
    "of",
    "with",
  ];

  // First convert all text to lowercase
  const words = text.toLowerCase().split(" ");

  // Process each word
  return words
    .map((word, index) => {
      // Skip empty words
      if (word.length === 0) return "";

      // If it's the first word or not in our lowercase list, capitalize first letter
      if (index === 0 || !lowerCaseWords.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      } else {
        return word;
      }
    })
    .join(" ");
};

/**
 * Creates a structurally identical display text from encrypted and display text
 * @param {string} encrypted - Encrypted text
 * @param {string} display - Display text with solved letters
 * @param {string} placeholderStyle - Style for placeholders ("matching" or "contrasting")
 * @returns {Object} - HTML object for dangerouslySetInnerHTML
 */
export const createStructuralMatch = (
  encrypted,
  display,
  placeholderStyle = "matching",
) => {
  if (!encrypted || !display) return { __html: "" };

  // If the encrypted text doesn't have spaces or punctuation (hardcore mode),
  // we can simply return the display text with proper placeholder styling
  if (!/[^A-Z]/.test(encrypted)) {
    return createDisplayHTML(display, placeholderStyle);
  }

  // For normal mode with spaces and punctuation, we need to maintain structure
  // Extract only the letters from the display text (removing spaces/punctuation)
  const displayLetters = display.replace(/[^A-Z?]/g, "");
  let letterIndex = 0;
  let structuredDisplay = "";

  // Iterate through encrypted text and replace only the letters
  for (let i = 0; i < encrypted.length; i++) {
    const char = encrypted[i];
    if (/[A-Z]/.test(char)) {
      // If it's a letter, use the corresponding character from display
      if (letterIndex < displayLetters.length) {
        const displayChar = displayLetters[letterIndex];
        structuredDisplay += displayChar;
        letterIndex++;
      } else {
        structuredDisplay += "?";
      }
    } else {
      // For non-letters (spaces, punctuation), keep the original character
      structuredDisplay += char;
    }
  }

  // Apply contrasting styles for placeholders if needed
  return createDisplayHTML(structuredDisplay, placeholderStyle);
};

/**
 * Creates HTML for display text with special handling for placeholder characters
 * @param {string} display - Display text with solved and unsolved letters
 * @param {string} placeholderStyle - Style for placeholders ("matching" or "contrasting")
 * @returns {Object} - HTML object for dangerouslySetInnerHTML
 */
export const createDisplayHTML = (display, placeholderStyle) => {
  if (!display) return { __html: "" };

  // If using matching style (default), just return the display text as is
  if (placeholderStyle !== "contrasting") {
    return { __html: display };
  }

  // For contrasting style, wrap each ? in a span for styling
  const html = display.replace(/\?/g, '<span class="placeholder">?</span>');
  return { __html: html };
};
