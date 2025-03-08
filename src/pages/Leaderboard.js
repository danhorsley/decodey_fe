import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import "../Styles/Leaderboard.css";

function Leaderboard() {
  const navigate = useNavigate();
  const { 
    leaderboardData, 
    fetchLeaderboard, 
    settings,
    isAuthenticated,
    user 
  } = useAppContext();

  const [activeTab, setActiveTab] = useState("all"); // "all", "daily", "weekly", "monthly"

  // Fetch leaderboard data on component mount
  useEffect(() => {
    fetchLeaderboard(1, 20);
  }, [fetchLeaderboard]);

  // Handle page navigation
  const handlePageChange = (page) => {
    fetchLeaderboard(page, 20);
  };

  // Handle going back to the game
  const handleBackToGame = () => {
    navigate("/");
  };

  // Filter entries by time period (if needed)
  const filteredEntries = leaderboardData.entries;

  return (
    <div className={`leaderboard-container ${settings.theme === "dark" ? "dark-theme" : ""}`}>
      <div className="leaderboard-header">
        <h1>Leaderboard</h1>
        <button className="back-button" onClick={handleBackToGame}>
          Back to Game
        </button>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All Time
        </button>
        <button 
          className={`tab ${activeTab === "monthly" ? "active" : ""}`}
          onClick={() => setActiveTab("monthly")}
        >
          Monthly
        </button>
        <button 
          className={`tab ${activeTab === "weekly" ? "active" : ""}`}
          onClick={() => setActiveTab("weekly")}
        >
          Weekly
        </button>
        <button 
          className={`tab ${activeTab === "daily" ? "active" : ""}`}
          onClick={() => setActiveTab("daily")}
        >
          Daily
        </button>
      </div>

      {leaderboardData.loading ? (
        <div className="loading">Loading leaderboard data...</div>
      ) : leaderboardData.error ? (
        <div className="error-message">{leaderboardData.error}</div>
      ) : (
        <>
          <div className="leaderboard-table">
            <div className="leaderboard-header-row">
              <div className="rank-column">Rank</div>
              <div className="player-column">Player</div>
              <div className="score-column">Score</div>
              <div className="mistakes-column">Mistakes</div>
              <div className="difficulty-column">Difficulty</div>
              <div className="time-column">Time</div>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="no-data">No scores available.</div>
            ) : (
              filteredEntries.map((entry, index) => (
                <div 
                  key={entry.id || index} 
                  className={`leaderboard-row ${user && entry.user_id === user.user_id ? "highlight-own" : ""}`}
                >
                  <div className="rank-column">
                    {leaderboardData.currentPage === 1 
                      ? index + 1 
                      : (leaderboardData.currentPage - 1) * 20 + index + 1}
                  </div>
                  <div className="player-column">{entry.username}</div>
                  <div className="score-column">{entry.score}</div>
                  <div className="mistakes-column">{entry.mistakes}</div>
                  <div className="difficulty-column">{entry.difficulty}</div>
                  <div className="time-column">
                    {Math.floor(entry.time_taken / 60)}:{String(entry.time_taken % 60).padStart(2, '0')}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {leaderboardData.totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => handlePageChange(leaderboardData.currentPage - 1)}
                disabled={leaderboardData.currentPage === 1}
              >
                Previous
              </button>
              <span>Page {leaderboardData.currentPage} of {leaderboardData.totalPages}</span>
              <button 
                onClick={() => handlePageChange(leaderboardData.currentPage + 1)}
                disabled={leaderboardData.currentPage === leaderboardData.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {!isAuthenticated && (
        <div className="login-prompt">
          <p>Login to see your ranking and have your scores counted!</p>
          <button className="login-button" onClick={() => navigate("/")}>Sign In</button>
        </div>
      )}
    </div>
  );
}

export default Leaderboard;