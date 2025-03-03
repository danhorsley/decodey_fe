import React, { useState, useEffect, useRef } from 'react';
import MatrixRain from './MatrixRain';
import SaveButton from './SaveButton';
import config from './config';

// Enhanced win celebration component with Matrix effect
const WinCelebration = ({ 
  startGame, 
  playSound, 
  mistakes, 
  maxMistakes, 
  startTime,
  completionTime,
  theme,
  textColor,
  encrypted = '',
  display = '',
  correctlyGuessed = [],
  guessedMappings = {},
  hasWon // Added hasWon prop
}) => {
  // Animation state
  const [animationStage, setAnimationStage] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showMatrixRain, setShowMatrixRain] = useState(true);
  const [showFireworks, setShowFireworks] = useState(false);
  const [isMatrixActive, setIsMatrixActive] = useState(true);

  // Attribution state
  const [attribution, setAttribution] = useState({
    major: '',
    minor: ''
  });

  // Get matrix color based on textColor
  const matrixColor = textColor === 'scifi-blue' ? '#4cc9f0' : 
                      textColor === 'retro-green' ? '#00ff41' : '#00ff41';

  // Refs for animation
  const statsRef = useRef(null);
  const messageRef = useRef(null);
  const containerRef = useRef(null);

  // Calculate stats
  const gameTimeSeconds = startTime && completionTime 
    ? Math.floor((completionTime - startTime) / 1000) 
    : 0;
  const minutes = Math.floor(gameTimeSeconds / 60);
  const seconds = gameTimeSeconds % 60;
  const timeString = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;

  // Calculate score based on mistakes and time
  const maxScore = 1000;
  const mistakePenalty = 50;
  const timePenalty = 2; // points per second
  const score = Math.max(0, maxScore - (mistakes * mistakePenalty) - (gameTimeSeconds * timePenalty));

  // Performance rating based on score
  let rating = '';
  if (score >= 900) rating = 'Perfect';
  else if (score >= 800) rating = 'Ace of Spies';
  else if (score >= 700) rating = 'Bletchley Park';
  else if (score >= 500) rating = 'Cabinet Noir';
  else rating = 'Cryptanalyst';

  // Get the decrypted text in proper case
  const getDecryptedText = () => {
    // If display is available, use it as a base but convert to proper case
    if (display) {
      // Convert to lowercase first then capitalize where needed
      return display.toLowerCase().replace(/([.!?]\s*\w|^\w)/g, match => match.toUpperCase());
    }

    // Fallback: Try to reconstruct from encrypted and mappings
    try {
      const decrypted = encrypted.replace(/[A-Z]/g, (match) => {
        // Find this encrypted letter's original letter
        for (const [enc, orig] of Object.entries(guessedMappings)) {
          if (enc === match) return orig;
        }
        return match; // Return the encrypted letter if mapping not found
      });
      // Convert to lowercase first then capitalize where needed
      return decrypted.toLowerCase().replace(/([.!?]\s*\w|^\w)/g, match => match.toUpperCase());
    } catch (error) {
      console.error("Error generating decrypted text:", error);
      return encrypted || "Error displaying text";
    }
  };

  // Fetch attribution data when component mounts
  useEffect(() => {
    const fetchAttribution = async () => {
      try {
        // Get the game_id from localStorage
        const gameId = localStorage.getItem('uncrypt-game-id');

        // Add game_id as a query parameter if available
        const url = gameId 
          ? `${config.apiUrl}/get_attribution?game_id=${encodeURIComponent(gameId)}`
          : `${config.apiUrl}/get_attribution`;

        console.log("Fetching attribution from URL:", url);

        const response = await fetch(url, {
          credentials: 'include',
          mode: 'cors',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`HTTP error! Status: ${response.status}`);
          return;
        }

        const data = await response.json();
        console.log("Attribution data received:", data);

        setAttribution({
          major: data.major_attribution || "",
          minor: data.minor_attribution || ""
        });
      } catch (error) {
        console.error("Error fetching attribution:", error);
      }
    };

    fetchAttribution();
  }, []);

  // Staged animation sequence
  useEffect(() => {
    console.log("Running animation stage:", animationStage);

    // Initial animation
    const timeline = [
      () => {
        // Play win sound and start matrix rain immediately
        playSound('win');
        setShowFireworks(true); // Show fireworks immediately
        console.log("Stage 0: Playing win sound and showing fireworks");
      },
      () => {
        // Show message with animation immediately
        if (messageRef.current) {
          messageRef.current.classList.add('animate-scale-in');
          console.log("Stage 1: Message animation added");
        }
      },
      () => {
        // Show stats with animation
        setShowStats(true);
        console.log("Stage 2: Setting show stats to true");

        if (statsRef.current) {
          statsRef.current.classList.add('animate-slide-in');
          console.log("Stats animation class added");
        } else {
          console.log("Stats ref is null");
        }
      },
      () => {
        // Gradually reduce matrix rain intensity
        console.log("Stage 3: Reducing matrix rain");
        setTimeout(() => {
          setIsMatrixActive(false);
        }, 1000);
      }
    ];

    // Execute animation stages with delays
    if (animationStage < timeline.length) {
      timeline[animationStage]();
      const nextStage = setTimeout(() => {
        setAnimationStage(animationStage + 1);
      }, animationStage === 0 ? 100 : 300); // Reduced delays for quicker appearance

      return () => clearTimeout(nextStage);
    }
  }, [animationStage, playSound]);

  // Force show stats after a delay (backup)
  useEffect(() => {
    const forceShowStats = setTimeout(() => {
      if (!showStats) {
        console.log("Force showing stats after timeout");
        setShowStats(true);
      }
    }, 1000); // Reduced from 2000 to make it appear faster

    return () => clearTimeout(forceShowStats);
  }, [showStats]);

  // Clean up animations after some time
  useEffect(() => {
    const cleanupTimer = setTimeout(() => {
      setShowMatrixRain(false);
      setShowFireworks(false);
    }, 10000); // Stop animations after 10 seconds

    return () => clearTimeout(cleanupTimer);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`win-celebration ${theme === 'dark' ? 'dark-theme' : 'light-theme'} text-${textColor} ${hasWon ? '' : 'game-over-container'}`}
      style={{ zIndex: 1200 }} /* Ensure this is higher than any other content */
    >
      {/* Matrix Rain effect */}
      {showMatrixRain && (
        <MatrixRain 
          active={isMatrixActive}
          color={matrixColor}
          density={70}
        />
      )}

      {/* Fireworks effect */}
      {showFireworks && (
        <div className="fireworks-container">
          <div className="firework"></div>
          <div className="firework delayed"></div>
          <div className="firework delayed-2"></div>
        </div>
      )}

      {/* Main celebration content */}
      <div className={`celebration-content ${hasWon ? '' : 'game-over-message'}`} style={{ zIndex: 1500, position: "relative" }}>
        {/* Victory message */}
        <div ref={messageRef} className="victory-message">
          <h2 className="victory-title">Solved! Rating: </h2>
          <h2 className="victory-title">{rating}</h2>

          {/* Display the original quote and attribution */}
          <div className="quote-container">
            <p className="decrypted-quote">{getDecryptedText()}</p>
            <div className="quote-attribution">
              {attribution && attribution.major && (
                <span>— {attribution.major}</span>
              )}
              {attribution && attribution.minor && (
                <span>, {attribution.minor}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats display - now with inline style fallback */}
        <div 
          ref={statsRef} 
          className={`stats-container ${showStats ? 'animate-slide-in' : ''}`}
          style={{ 
            opacity: showStats ? 1 : 0, 
            transition: 'opacity 0.8s ease-out',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '20px',
            margin: '25px 0',
            color: theme === 'dark' ? 'white' : '#333'
          }}
        >
          <div className="stat-item">
            <span className="stat-label">Time</span>
            <span className="stat-value">{timeString}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Mistakes</span>
            <span className="stat-value">{mistakes} / {maxMistakes}</span>
          </div>
          <div className="stat-item score">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="celebration-actions">
          {/* <SaveButton hasWon={true} playSound={playSound} /> */}
          <button 
            className="play-again-button button"
            onClick={startGame}
            style={{ color: textColor === 'retro-green' ? '#003b00' : 'white' }}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinCelebration;