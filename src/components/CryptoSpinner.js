// src/components/CryptoSpinner.js
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

  return (
    <div
      className={`crypto-spinner ${isDarkTheme ? "dark-theme" : "light-theme"}`}
    >
      <div className="crypto-spinner-text">
        {chars.map((char, index) => (
          <span key={index} className="crypto-spinner-char">
            {char}
          </span>
        ))}
      </div>
    </div>
  );
};

export default CryptoSpinner;
