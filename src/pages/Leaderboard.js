// src/components/Leaderboard.js
import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import apiService from "../services/apiService";
import "../Styles/Leaderboard.css";

const Leaderboard = ({ onClose }) => {
  const { isAuthenticated } = useAppContext();
  const [activeTab, setActiveTab] = useState("all-time");
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

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
      setError("Failed to load leaderboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1); // Reset to first page when changing tabs
  };

  const renderTabs = () => (
    <div className="leaderboard-tabs">
      <button
        className={`tab-button ${activeTab === "all-time" ? "active" : ""}`}
        onClick={() => handleTabChange("all-time")}
      >
        All Time
      </button>
      <button
        className={`tab-button ${activeTab === "weekly" ? "active" : ""}`}
        onClick={() => handleTabChange("weekly")}
      >
        Weekly
      </button>
      {isAuthenticated && (
        <button
          className={`tab-button ${activeTab === "personal" ? "active" : ""}`}
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
      <div className="leaderboard-table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
              <th>Games</th>
              <th>Avg/Game</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.entries.map((entry) => (
              <tr
                key={entry.user_id}
                className={entry.is_current_user ? "current-user-row" : ""}
              >
                <td>#{entry.rank}</td>
                <td>{entry.username}</td>
                <td>{entry.score.toLocaleString()}</td>
                <td>{entry.games_played}</td>
                <td>{entry.avg_score.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {leaderboardData.user_rank && leaderboardData.user_rank > 20 && (
          <div className="current-user-position">
            <p>Your position: #{leaderboardData.user_rank}</p>
          </div>
        )}

        {renderPagination()}
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
          Previous
        </button>
        <span className="page-info">
          Page {page} of {total_pages}
        </span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= total_pages}
          className="pagination-button"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="leaderboard-container">
      <h2 className="leaderboard-title">Leaderboard</h2>

      {/* Back to Game button */}
      <button className="back-to-game-button" onClick={onClose}>
        Back to Game
      </button>

      {renderTabs()}

      {isLoading ? (
        <div className="loading-spinner">Loading...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        renderLeaderboardTable()
      )}
    </div>
  );
};

export default Leaderboard;
