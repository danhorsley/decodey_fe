
import React, { useState } from "react";
import WinCelebration from "../components/modals/WinCelebration";
import useSettingsStore from "../stores/settingsStore";
import useGameStore from "../stores/gameStore";
import "../Styles/WinCelebrationTest.css";

function WinCelebrationTest() {
  const settings = useSettingsStore((state) => state.settings);
  const [showCelebration, setShowCelebration] = useState(false);
  const [previewMode, setPreviewMode] = useState("desktop");

  // Sample game data for testing
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
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const toggleTheme = () => {
    const newTheme = settings.theme === "dark" ? "light" : "dark";
    const newTextColor = newTheme === "dark" ? "scifi-blue" : "default";
    updateSettings({ ...settings, theme: newTheme, textColor: newTextColor });
  };

  return (
    <div
      className={`win-test-container ${settings.theme === "dark" ? "dark-theme" : ""} ${previewMode}`}
    >
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

      <a href="/" className="back-link">
        Back to Game
      </a>

      {showCelebration && (
        <div className={previewMode === "mobile" ? "mobile-mode" : ""}>
          <WinCelebration
            playSound={playSound}
            winData={testData}
          />
        </div>
      )}
    </div>
  );
}

export default WinCelebrationTest;
