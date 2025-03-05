
import React, { useCallback, useEffect } from "react";
import "./App.css";
import "./Mobile.css";
import Settings from "./Settings";
import { useAppContext } from "./context/AppContext";
import useSound from "./hooks/useSound";
import useKeyboardInput from "./hooks/useKeyboardInput";
import useGame from "./hooks/useGame";
import WinCelebration from "./WinCelebration";
import About from "./About";
import MobileLayout from "./MobileLayout";

// Components
import GameHeader from "./components/game/GameHeader";
import TextContainer from "./components/game/TextContainer";
import LetterGrids from "./components/game/LetterGrids";
import Controls from "./components/game/Controls";
import GameOverMessage from "./components/game/GameOverMessage";

function App() {
  // Get app context
  const {
    settings,
    updateSettings,
    currentView,
    showSettings,
    showGame,
    maxMistakes,
    isAboutOpen,
    openAbout,
    closeAbout,
    useMobileMode,
    isLandscape,
  } = useAppContext();

  // Get game state and handlers
  const {
    state,
    startGame,
    handleEncryptedClick,
    handleGuessClick,
    handleHint,
    isGameActive
  } = useGame();

  const {
    encrypted,
    display,
    mistakes,
    correctlyGuessed,
    selectedEncrypted,
    lastCorrectGuess,
    letterFrequency,
    guessedMappings,
    originalLetters,
    startTime,
    completionTime,
  } = state;

  // Sound management
  const { playSound } = useSound();

  // Keyboard input handling
  useKeyboardInput({
    enabled: isGameActive,
    speedMode: settings.speedMode,
    encryptedLetters: [...new Set(encrypted.match(/[A-Z]/g) || [])],
    originalLetters,
    selectedEncrypted,
    onEncryptedSelect: (letter) => {
      if (!correctlyGuessed.includes(letter)) {
        handleEncryptedClick(letter);
      }
    },
    onGuessSubmit: (guessedLetter) => {
      if (selectedEncrypted) {
        handleGuessClick(guessedLetter);
      }
    },
    playSound,
  });

  // Start game on mount
  useEffect(() => {
    startGame();
  }, [startGame]);

  // Apply theme based on settings
  useEffect(() => {
    const className = "dark-theme";
    if (settings.theme === "dark") {
      document.documentElement.classList.add(className);
      document.body.classList.add(className);
    } else {
      document.documentElement.classList.remove(className);
      document.body.classList.remove(className);
    }
  }, [settings.theme]);

  // Handle settings save
  const handleSaveSettings = useCallback(
    (newSettings) => {
      updateSettings(newSettings);
      showGame();
    },
    [updateSettings, showGame]
  );

  // If we're on settings view
  if (currentView === "settings") {
    return (
      <div
        className={`App-container ${settings.theme === "dark" ? "dark-theme" : ""}`}
      >
        <Settings
          currentSettings={settings}
          onSave={handleSaveSettings}
          onCancel={showGame}
        />
      </div>
    );
  }

  // Game Over or Win state content
  const gameStatusContent = completionTime ? (
    <WinCelebration
      startGame={startGame}
      playSound={playSound}
      mistakes={mistakes}
      maxMistakes={maxMistakes}
      startTime={startTime}
      completionTime={completionTime}
      theme={settings.theme}
      textColor={settings.textColor}
      encrypted={encrypted}
      display={display}
      correctlyGuessed={correctlyGuessed}
      guessedMappings={guessedMappings}
    />
  ) : mistakes >= maxMistakes ? (
    <GameOverMessage 
      onRestart={startGame} 
      theme={settings.theme} 
    />
  ) : null;

  // Mobile layout
  if (useMobileMode) {
    return (
      <div className="App-container">
        {isAboutOpen && <About isOpen={isAboutOpen} onClose={closeAbout} />}
        <MobileLayout isLandscape={isLandscape}>
          <GameHeader openAbout={openAbout} showSettings={showSettings} />
          <TextContainer 
            encrypted={encrypted} 
            display={display} 
            settings={settings} 
            useMobileMode={useMobileMode} 
          />
          <LetterGrids
            encrypted={encrypted}
            settings={settings}
            selectedEncrypted={selectedEncrypted}
            correctlyGuessed={correctlyGuessed}
            lastCorrectGuess={lastCorrectGuess}
            letterFrequency={letterFrequency}
            originalLetters={originalLetters}
            guessedMappings={guessedMappings}
            isGameActive={isGameActive}
            onEncryptedClick={handleEncryptedClick}
            onGuessClick={handleGuessClick}
          />
          <Controls 
            mistakes={mistakes} 
            maxMistakes={maxMistakes} 
            onHint={handleHint} 
            isGameActive={isGameActive} 
          />
          {gameStatusContent}
        </MobileLayout>
      </div>
    );
  }

  // Desktop layout
  return (
    <div
      className={`App-container ${settings.theme === "dark" ? "dark-theme" : ""}`}
    >
      {isAboutOpen && <About isOpen={isAboutOpen} onClose={closeAbout} />}

      <GameHeader openAbout={openAbout} showSettings={showSettings} />

      <TextContainer 
        encrypted={encrypted} 
        display={display} 
        settings={settings} 
        useMobileMode={useMobileMode} 
      />

      <LetterGrids
        encrypted={encrypted}
        settings={settings}
        selectedEncrypted={selectedEncrypted}
        correctlyGuessed={correctlyGuessed}
        lastCorrectGuess={lastCorrectGuess}
        letterFrequency={letterFrequency}
        originalLetters={originalLetters}
        guessedMappings={guessedMappings}
        isGameActive={isGameActive}
        onEncryptedClick={handleEncryptedClick}
        onGuessClick={handleGuessClick}
      />

      <Controls 
        mistakes={mistakes} 
        maxMistakes={maxMistakes} 
        onHint={handleHint} 
        isGameActive={isGameActive} 
      />

      {gameStatusContent}
    </div>
  );
}

export default App;
