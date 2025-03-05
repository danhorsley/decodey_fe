
import React from 'react';

const GameOverMessage = ({ onRestart, theme }) => {
  const gameOverStyle = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 1100,
    backgroundColor: theme === "dark" ? "#333" : "#f0f8ff",
    color: theme === "dark" ? "#f8f9fa" : "#212529",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
    textAlign: "center",
    maxWidth: "280px",
    width: "85%",
    margin: "0 auto",
    boxSizing: "border-box",
  };

  const buttonStyle = {
    margin: "15px auto 0",
    padding: "12px 20px",
    fontSize: "1.1rem",
    display: "block",
    width: "90%",
    maxWidth: "160px",
    textAlign: "center",
    fontWeight: "bold",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    position: "relative",
    zIndex: 1010,
    borderRadius: "8px",
  };

  return (
    <div className="game-message" style={gameOverStyle}>
      <p
        style={{
          fontSize: "1.2rem",
          marginBottom: "20px",
          fontWeight: "bold",
        }}
      >
        Game Over! Too many mistakes.
      </p>
      <button onClick={onRestart} style={buttonStyle}>
        Try Again
      </button>
    </div>
  );
};

export default GameOverMessage;
