// src/components/Leaderboard.js
import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import "../Styles/Leaderboard.css";

const Leaderboard = ({ onClose }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppContext();
  const [activeTab, setActiveTab] = useState("all-time");
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const handleBackToGame = () => {
    onClose ? onClose() : navigate("/");
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [activeTab, page]);

  const fetchLeaderboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.getLeaderboard(activeTab, page);
      setLeaderboardData(response);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError("Failed to load leaderboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const renderTabs = () => (
    <div className="tabs">
      <button
        className={`tab ${activeTab === "all-time" ? "active" : ""}`}
        onClick={() => handleTabChange("all-time")}
      >
        All Time
      </button>
      <button
        className={`tab ${activeTab === "weekly" ? "active" : ""}`}
        onClick={() => handleTabChange("weekly")}
      >
        Weekly
      </button>
      {isAuthenticated && (
        <button
          className={`tab ${activeTab === "personal" ? "active" : ""}`}
          onClick={() => handleTabChange("personal")}
        >
          Personal
        </button>
      )}
    </div>
  );

  const renderLeaderboardTable = () => {
    if (!leaderboardData || !leaderboardData.entries) return null;

    return (
      <div className="table-container">
        <div className="table-grid">
          <div className="table-header">Rank</div>
          <div className="table-header">Player</div>
          <div className="table-header">Score</div>
          <div className="table-header">Games</div>
          <div className="table-header">Avg/Game</div>
          {leaderboardData.entries.map((entry) => (
            <React.Fragment key={entry.user_id}>
              <div
                className={`table-cell ${entry.is_current_user ? "highlight" : ""}`}
              >
                #{entry.rank}
              </div>
              <div
                className={`table-cell ${entry.is_current_user ? "highlight" : ""}`}
              >
                {entry.username}
              </div>
              <div
                className={`table-cell ${entry.is_current_user ? "highlight" : ""}`}
              >
                {entry.score.toLocaleString()}
              </div>
              <div
                className={`table-cell ${entry.is_current_user ? "highlight" : ""}`}
              >
                {entry.games_played}
              </div>
              <div
                className={`table-cell ${entry.is_current_user ? "highlight" : ""}`}
              >
                {entry.avg_score.toLocaleString()}
              </div>
            </React.Fragment>
          ))}
        </div>
        {leaderboardData.user_rank && leaderboardData.user_rank > 20 && (
          <div className="user-position">
            Your position: #{leaderboardData.user_rank}
          </div>
        )}
        {renderPagination()}
      </div>
    );
  };

  const renderPersonalLeaderboard = () => {
    if (!isAuthenticated) {
      return (
        <div className="login-prompt">
          <p>Login to see your personal scores.</p>
          <button className="login-button" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      );
    }
    if (!leaderboardData || !leaderboardData.personal_entries) return null;

    return (
      <div className="table-container">
        <div className="table-grid personal">
          <div className="table-header">Date</div>
          <div className="table-header">Score</div>
          <div className="table-header">Mistakes</div>
          <div className="table-header">Difficulty</div>
          <div className="table-header">Time</div>
          {leaderboardData.personal_entries.map((entry, index) => (
            <React.Fragment key={index}>
              <div className="table-cell">
                {new Date(entry.timestamp).toLocaleDateString()}
              </div>
              <div className="table-cell">{entry.score.toLocaleString()}</div>
              <div className="table-cell">{entry.mistakes}</div>
              <div className="table-cell">
                {entry.difficulty.charAt(0).toUpperCase() +
                  entry.difficulty.slice(1)}
              </div>
              <div className="table-cell">
                {Math.floor(entry.time_seconds / 60)}m {entry.time_seconds % 60}
                s
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    if (!leaderboardData) return null;
    const { page, total_pages } = leaderboardData;

    return (
      <div className="pagination">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          className="pagination-button"
        >
          ←
        </button>
        <span>
          {page} / {total_pages}
        </span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= total_pages}
          className="pagination-button"
        >
          →
        </button>
      </div>
    );
  };

  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      <button className="back-button" onClick={handleBackToGame}>
        Back
      </button>
      {renderTabs()}
      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : activeTab === "personal" ? (
        renderPersonalLeaderboard()
      ) : (
        renderLeaderboardTable()
      )}
    </div>
  );
};

export default Leaderboard;
