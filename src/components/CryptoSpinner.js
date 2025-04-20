// src/components/CryptoSpinner.js - Updated version with stats mode
import React, { useState, useEffect } from "react";

const cryptoChars = "ΘΔΦΨΩλπΣΞΓμζ※⧠⧫⁂☤⚕☢⚛☯☸⟁⟒";

const CryptoSpinner = ({
  isActive,
  isDarkTheme,
  inStatsContainer = false, // New prop to adjust styling when in stats container
}) => {
  const [chars, setChars] = useState(["Θ", "Δ", "Φ", "Ψ", "Ω"]);

  useEffect(() => {
    if (!isActive) return;

    // Change the characters rapidly to create decryption effect
    const intervalId = setInterval(() => {
      const newChars = chars.map(() => {
        const randomIndex = Math.floor(Math.random() * cryptoChars.length);
        return cryptoChars[randomIndex];
      });
      setChars(newChars);
    }, 100);

    return () => clearInterval(intervalId);
  }, [isActive, chars]);

  if (!isActive) return null;

  // Adjust styles based on whether spinner is in stats container
  const spinnerStyles = {
    position: inStatsContainer ? "relative" : "absolute",
    top: inStatsContainer ? "auto" : 0,
    left: inStatsContainer ? "auto" : 0,
    width: inStatsContainer ? "auto" : "100%",
    height: inStatsContainer ? "auto" : "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    pointerEvents: "none", // Allow clicks to pass through
    backgroundColor: inStatsContainer ? "transparent" : "rgba(0, 0, 0, 0.7)",
  };

  const textStyles = {
    display: "flex",
    justifyContent: "center",
    gap: "2px",
    // Fixed height to prevent layout shifts
    height: "30px",
    lineHeight: "30px",
  };

  const charStyles = {
    fontSize: inStatsContainer ? "1.5rem" : "2rem",
    animation: "pulse 0.8s infinite alternate",
    // Fixed width to prevent layout shifts
    width: "1.2em",
    textAlign: "center",
    display: "inline-block",
    color: isDarkTheme ? "#4cc9f0" : "#00ff41",
  };

  return (
    <div
      className={`crypto-spinner ${isDarkTheme ? "dark-theme" : "light-theme"}`}
      style={spinnerStyles}
    >
      <div className="crypto-spinner-text" style={textStyles}>
        {chars.map((char, index) => (
          <span key={index} className="crypto-spinner-char" style={charStyles}>
            {char}
          </span>
        ))}
      </div>
    </div>
  );
};

export default CryptoSpinner;
