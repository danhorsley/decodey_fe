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
 * Splits a long line into multiple chunks of a reasonable size
 * @param {string} line - The text line to split
 * @param {number} maxLength - Maximum length for each chunk
 * @returns {Array<string>} Array of chunks
 */
const splitLongLine = (line, maxLength) => {
  if (!line || line.length <= maxLength) {
    return [line];
  }

  const chunks = [];
  let currentIndex = 0;

  while (currentIndex < line.length) {
    // Try to find a space to break at
    let breakIndex = currentIndex + maxLength;

    if (breakIndex < line.length) {
      // Look backward for a space to break at
      while (breakIndex > currentIndex && line[breakIndex] !== " ") {
        breakIndex--;
      }

      // If no space found, just break at the max length
      if (breakIndex === currentIndex) {
        breakIndex = currentIndex + maxLength;
      } else {
        // Include the space in the current chunk
        breakIndex++;
      }
    } else {
      breakIndex = line.length;
    }

    chunks.push(line.substring(currentIndex, breakIndex));
    currentIndex = breakIndex;
  }

  return chunks;
};

/**
 * Split a display line to match the encrypted chunks pattern
 * @param {string} displayLine - The display line to split
 * @param {Array<string>} encryptedChunks - The encrypted chunks to match
 * @param {string} encryptedLine - The full encrypted line
 * @returns {Array<string>} - Matching display chunks
 */
const splitLineToMatch = (displayLine, encryptedChunks, encryptedLine) => {
  if (!displayLine || encryptedChunks.length <= 1) {
    return [displayLine];
  }

  const displayChunks = [];
  let currentDisplayIndex = 0;

  // For each encrypted chunk, find the corresponding display text
  for (let i = 0; i < encryptedChunks.length; i++) {
    const encryptedChunk = encryptedChunks[i];
    const startIndexInFull = encryptedLine.indexOf(
      encryptedChunk,
      i === 0
        ? 0
        : encryptedLine.indexOf(encryptedChunks[i - 1]) +
            encryptedChunks[i - 1].length,
    );

    // Calculate end index in the full line
    const endIndexInFull = startIndexInFull + encryptedChunk.length;

    // Get the corresponding portion of the display line
    const displayChunk = displayLine.substring(
      startIndexInFull,
      endIndexInFull,
    );
    displayChunks.push(displayChunk);
  }

  return displayChunks;
};

/**
 * Creates a structurally identical display text from encrypted and display text
 * @param {string} encrypted - Encrypted text
 * @param {string} display - Display text with solved letters
 * @param {string} placeholderStyle - Style for placeholders ("matching" or "contrasting")
 * @returns {Object} - HTML object for dangerouslySetInnerHTML
 */

// Helper function to determine if we're on a real mobile device vs desktop emulation
const isRealMobileDevice = () => {
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0)
  );
};

// Determine placeholder character based on device
const getPlaceholderChar = () => {
  // Use a slightly narrower character on real mobile devices
  return isRealMobileDevice() ? "■" : "█";
};
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
  const displayLetters = display.replace(/[^A-Z█]/g, "");
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
        structuredDisplay += "█";
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

  // For contrasting style, wrap each block character in a span for styling
  const html = display.replace(/█/g, '<span class="placeholder">█</span>');
  return { __html: html };
};

/**
 * Formats encrypted and display text into alternating lines with improved space handling
 * @param {string} encrypted - The encrypted text
 * @param {string} display - The display text with solved letters and blocks
 * @param {boolean} enhanceSpaces - Whether to enhance spaces with special styling (for mobile view)
 * @returns {Object} - HTML object for dangerouslySetInnerHTML
 */
export const formatAlternatingLines = (
  encrypted,
  display,
  enhanceSpaces = false,
) => {
  if (!encrypted || !display) return { __html: "" };

  // Mobile detection
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isRealMobileDevice =
    isMobile && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  // Use a mobile-friendly placeholder char for better alignment
  const placeholderChar = isRealMobileDevice ? "■" : "█";

  // Process display text to use mobile-friendly placeholder
  if (isMobile) {
    display = display.replace(/█/g, placeholderChar);
  }

  // Split into lines if text contains newlines
  const encryptedLines = encrypted.split("\n");
  const displayLines = display.split("\n");

  // Create alternating encrypted/display pattern with grid-based HTML
  let result = "";
  for (let i = 0; i < encryptedLines.length; i++) {
    let encryptedLine = encryptedLines[i];
    let displayLine = i < displayLines.length ? displayLines[i] : "";

    // Split long lines into chunks for better mobile display
    // Use a reasonable character limit based on screen width
    const maxLineLength = isRealMobileDevice ? 40 : 60;

    // Process encrypted line
    const encryptedChunks = splitLongLine(encryptedLine, maxLineLength);

    // Process display line (must match encrypted chunks)
    const displayChunks = splitLineToMatch(
      displayLine,
      encryptedChunks,
      encryptedLine,
    );

    // Create grids for each chunk
    for (
      let chunkIndex = 0;
      chunkIndex < encryptedChunks.length;
      chunkIndex++
    ) {
      const encryptedChunk = encryptedChunks[chunkIndex];
      const displayChunk = displayChunks[chunkIndex] || "";

      // Create character grid for encrypted line chunk
      let encryptedGrid = '<div class="char-grid encrypted-line">';
      for (let j = 0; j < encryptedChunk.length; j++) {
        const char = encryptedChunk[j];
        if (char === " ") {
          encryptedGrid += `<div class="grid-cell space-cell"><span class="space-dot">·</span></div>`;
        } else {
          encryptedGrid += `<div class="grid-cell">${char}</div>`;
        }
      }
      encryptedGrid += "</div>";

      // Create character grid for display line chunk
      let displayGrid = '<div class="char-grid display-line">';
      for (let j = 0; j < displayChunk.length; j++) {
        const char = displayChunk[j];
        if (char === " ") {
          displayGrid += `<div class="grid-cell space-cell"><span class="space-dot">·</span></div>`;
        } else {
          displayGrid += `<div class="grid-cell">${char}</div>`;
        }
      }
      displayGrid += "</div>";

      // Add both grids
      result += encryptedGrid + displayGrid;
    }
  }

  return { __html: result };
};
/**
 * Prevents words from breaking across lines, useful for mobile display
 * By adding non-breaking spaces between letters within words
 * @param {string} text - The text to process
 * @returns {string} - Text with non-breaking spaces within words
 */
export const preventWordBreaks = (text) => {
  if (!text) return "";

  // Only add special handling for very long words that might cause layout issues
  return text.replace(/(\w{10,})/g, (match) => {
    // For only exceptionally long words, add zero-width space to allow smart breaking
    return match.replace(/(.{5})/g, "$1\u200B");
  });
};
