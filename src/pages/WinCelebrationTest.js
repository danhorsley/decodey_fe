import React, { useState } from "react";
import { useAppContext } from "./context/AppContext";
import WinCelebration from "./components/modals/WinCelebration";
import "./Styles/WinCelebrationTest.css";

function WinCelebrationTest() {
  const { settings, updateSettings } = useAppContext();
  const [showCelebration, setShowCelebration] = useState(false);
  const [previewMode, setPreviewMode] = useState("desktop"); // desktop or mobile

  // Sample game data
  const testData = {
    mistakes: 3,
    maxMistakes: 8,
    startTime: Date.now() - 120000, // 2 minutes ago
    completionTime: Date.now(),
    encrypted:
      "XHMDHYH ATKA MDOH DE NBWAT MDYDVS KVQ UBJW XHMDHO NDMM THMF GWHKAH ATH OKGA.",
    display:
      "Believe that life is worth living and your belief will help create the fact.",
    correctlyGuessed: ["A", "B", "C", "D", "E"],
    guessedMappings: {
      A: "T",
      B: "O",
      C: "R",
      D: "I",
      E: "S",
    },
    // Fake attribution data instead of requesting from backend
    attribution: {
      major_attribution: "Traditional English",
      minor_attribution: "Proverb",
    },
    hasWon: true,
  };

  const playSound = (soundType) => {
    console.log(`Playing ${soundType} sound (mock)`);
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = settings.theme === "dark" ? "light" : "dark";
    const newTextColor = newTheme === "dark" ? "scifi-blue" : "default";
    updateSettings({ ...settings, theme: newTheme, textColor: newTextColor });
  };

  return (
    <div
      className={`win-test-container ${settings.theme === "dark" ? "dark-theme" : ""} ${previewMode}`}
    >
      {/* Small toggle control positioned at top center */}
      <div className="win-test-toggle-controls">
        <button
          className="test-button"
          onClick={() => setShowCelebration(!showCelebration)}
        >
          {showCelebration ? "Hide" : "Show"} Celebration
        </button>

        <div className="mode-toggle">
          <label>
            <input
              type="radio"
              name="mode"
              checked={previewMode === "desktop"}
              onChange={() => setPreviewMode("desktop")}
            />
            Desktop
          </label>
          <label>
            <input
              type="radio"
              name="mode"
              checked={previewMode === "mobile"}
              onChange={() => setPreviewMode("mobile")}
            />
            Mobile
          </label>
        </div>

        <button className="test-button theme-toggle" onClick={toggleTheme}>
          Theme: {settings.theme === "dark" ? "Dark" : "Light"}
        </button>
      </div>

      {/* Tiny link to go back to game */}
      <a href="/" className="back-link">
        Back to Game
      </a>

      {showCelebration && (
        <div className={previewMode === "mobile" ? "mobile-mode" : ""}>
          <WinCelebration
            startGame={() => setShowCelebration(false)}
            playSound={playSound}
            mistakes={testData.mistakes}
            maxMistakes={testData.maxMistakes}
            startTime={testData.startTime}
            completionTime={testData.completionTime}
            theme={settings.theme}
            textColor={settings.textColor}
            encrypted={testData.encrypted}
            display={testData.display}
            correctlyGuessed={testData.correctlyGuessed}
            guessedMappings={testData.guessedMappings}
            hasWon={testData.hasWon}
            attribution={testData.attribution} // Pass the fake attribution
          />
        </div>
      )}
    </div>
  );
}

export default WinCelebrationTest;
