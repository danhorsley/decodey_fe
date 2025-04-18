// src/components/CryptoSpinner.js - Updated version with fixed dimensions
import React, { useState, useEffect } from "react";

const cryptoChars = "ΘΔΦΨΩλπΣΞΓμζ※⧠⧫⁂☤⚕☢⚛☯☸⟁⟒";

const CryptoSpinner = ({ isActive, isDarkTheme }) => {
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

  // Add specific styles to prevent layout shifts when spinner is active
  const spinnerStyles = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    pointerEvents: "none", // Allow clicks to pass through
  };

  const textStyles = {
    display: "flex",
    justifyContent: "center",
    gap: "2px",
    // Fixed height to prevent layout shifts
    height: "20px",
    lineHeight: "20px",
  };

  const charStyles = {
    fontSize: "1rem",
    animation: "pulse 0.8s infinite alternate",
    // Fixed width to prevent layout shifts
    width: "14px",
    textAlign: "center",
    display: "inline-block",
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
