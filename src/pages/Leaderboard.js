// src/pages/Leaderboard.js
import React, { useState, useEffect, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import "../Styles/Leaderboard.css";
import { FiRefreshCw } from "react-icons/fi";

const Leaderboard = ({ onClose }) => {
  const navigate = useNavigate();
  const { isAuthenticated, openLogin } = useAppContext();
  const [activeTab, setActiveTab] = useState("all-time");
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  // New state for personal stats
  const [personalStats, setPersonalStats] = useState(null);
  const [isPersonalLoading, setIsPersonalLoading] = useState(false);
  const [personalError, setPersonalError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New state for streak leaderboard
  const [streakData, setStreakData] = useState(null);
  const [streakType, setStreakType] = useState("win"); // 'win' or 'noloss'
  const [streakPeriod, setStreakPeriod] = useState("current"); // 'current' or 'best'
  const [isStreakLoading, setIsStreakLoading] = useState(false);
  const [streakError, setStreakError] = useState(null);

  const handleBackToGame = () => {
    onClose ? onClose() : navigate("/");
  };

  // Fetch leaderboard data using useCallback
  const fetchLeaderboardData = useCallback(async () => {
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
  }, [activeTab, page]);

  const fetchStreakData = useCallback(async () => {
    console.log("Fetching streak data with:", {
      streakType,
      streakPeriod,
      page,
    });
    setIsStreakLoading(true);
    setStreakError(null);
    try {
      const response = await apiService.getStreakLeaderboard(
        streakType,
        streakPeriod,
        page,
      );
      console.log("Streak data received:", response);
      setStreakData(response);
    } catch (err) {
      console.error("Error fetching streak leaderboard:", err);
      setStreakError("Failed to load streak leaderboard data.");
    } finally {
      setIsStreakLoading(false);
    }
  }, [streakType, streakPeriod, page]);

  // New function to fetch personal stats with useCallback
  const fetchPersonalStats = useCallback(
    async (showRefreshAnimation = false) => {
      if (!isAuthenticated) return;

      if (showRefreshAnimation) {
        setIsRefreshing(true);
      } else {
        setIsPersonalLoading(true);
      }

      setPersonalError(null);

      try {
        // Get user stats from the API
        const response = await apiService.getUserStats();

        // Check for error responses
        if (response.error) {
          if (response.authenticated === false) {
            // Auth error - let the user know they need to log in
            setPersonalError("Please log in to view your stats.");
          } else {
            // Other error
            setPersonalError(
              response.message || "Failed to load your personal stats.",
            );
          }
          setPersonalStats(null);
        } else {
          // Success - set the stats
          setPersonalStats(response);
        }
      } catch (err) {
        console.error("Error fetching personal stats:", err);
        setPersonalError(
          "Failed to load your personal stats. Please try again.",
        );
        setPersonalStats(null);
      } finally {
        setIsPersonalLoading(false);
        if (showRefreshAnimation) {
          // Reset refresh animation after a short delay
          setTimeout(() => setIsRefreshing(false), 600);
        }
      }
    },
    [isAuthenticated],
  );
  // Fetch leaderboard data
  useEffect(() => {
    // Only fetch leaderboard data for all-time and weekly tabs
    if (activeTab === "all-time" || activeTab === "weekly") {
      fetchLeaderboardData();
    } else if (activeTab === "streaks") {
      fetchStreakData();
    }
  }, [
    activeTab,
    page,
    streakType,
    streakPeriod,
    fetchLeaderboardData,
    fetchStreakData,
  ]);
  // Handle tab switching - fetch personal stats when that tab is clicked
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);

    // Fetch personal stats when switching to that tab if not already loaded
    if (tab === "personal" && !personalStats && isAuthenticated) {
      fetchPersonalStats();
    }
  };

  // Refresh personal stats data
  const handleRefreshPersonalStats = () => {
    fetchPersonalStats(true);
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
      <button
        className={`tab ${activeTab === "streaks" ? "active" : ""}`}
        onClick={() => handleTabChange("streaks")}
      >
        Streaks
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

  // New function to render personal stats tab
  const renderPersonalStats = () => {
    if (!isAuthenticated) {
      return (
        <div className="personal-stats-login-required">
          <p>Please log in to view your personal stats.</p>
          <button className="login-button" onClick={openLogin}>
            Login
          </button>
        </div>
      );
    }

    if (isPersonalLoading) {
      return <div className="loading-spinner">Loading your stats...</div>;
    }

    if (personalError) {
      return (
        <div className="error-message">
          {personalError}
          <button onClick={() => fetchPersonalStats()}>Try Again</button>
        </div>
      );
    }

    if (!personalStats) {
      return <div className="loading-spinner">No stats available</div>;
    }

    // Format date for display
    const formatDate = (dateString) => {
      if (!dateString) return "Never";
      return new Date(dateString).toLocaleDateString();
    };

    return (
      <div className="personal-stats-container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h3>Your Stats</h3>
          <button
            className="refresh-button"
            onClick={handleRefreshPersonalStats}
            disabled={isRefreshing || isPersonalLoading}
            style={{ transform: isRefreshing ? "rotate(180deg)" : "none" }}
          >
            <FiRefreshCw />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="stats-summary">
          <div className="stat-card">
            <h3>Total Score</h3>
            <div className="stat-value">
              {personalStats.cumulative_score?.toLocaleString() || 0}
            </div>
          </div>
          <div className="stat-card">
            <h3>Weekly Score</h3>
            <div className="stat-value">
              {personalStats.weekly_stats?.score?.toLocaleString() || 0}
            </div>
          </div>
          <div className="stat-card">
            <h3>Games Played</h3>
            <div className="stat-value">
              {personalStats.total_games_played || 0}
            </div>
          </div>
          <div className="stat-card">
            <h3>Current Streak</h3>
            <div className="stat-value">
              {personalStats.current_streak || 0}
            </div>
          </div>
        </div>

        {/* Streaks Section */}
        <div className="streaks-section">
          <h3>Streaks</h3>
          <div className="streaks-grid">
            <div className="streak-item">
              <span className="streak-label">Current Win Streak</span>
              <span className="streak-value">
                {personalStats.current_streak || 0}
              </span>
            </div>
            <div className="streak-item">
              <span className="streak-label">Best Win Streak</span>
              <span className="streak-value">
                {personalStats.max_streak || 0}
              </span>
            </div>
            <div className="streak-item">
              <span className="streak-label">Current No-Loss Streak</span>
              <span className="streak-value">
                {personalStats.current_noloss_streak || 0}
              </span>
            </div>
            <div className="streak-item">
              <span className="streak-label">Best No-Loss Streak</span>
              <span className="streak-value">
                {personalStats.max_noloss_streak || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Top Performances */}
        {personalStats.top_scores && personalStats.top_scores.length > 0 && (
          <div className="top-performances">
            <h3>Top Performances</h3>
            <table className="top-scores-table">
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Difficulty</th>
                  <th>Time</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {personalStats.top_scores.map((score, index) => (
                  <tr key={index}>
                    <td>{score.score.toLocaleString()}</td>
                    <td style={{ textTransform: "capitalize" }}>
                      {score.difficulty}
                    </td>
                    <td>
                      {Math.floor(score.time_taken / 60)}m{" "}
                      {score.time_taken % 60}s
                    </td>
                    <td>{new Date(score.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Last Played */}
        {personalStats.last_played_date && (
          <div className="last-played">
            Last played: {formatDate(personalStats.last_played_date)}
          </div>
        )}
      </div>
    );
  };

  const renderPersonalLeaderboard = () => {
    // Personal tab now uses the new renderPersonalStats function
    return renderPersonalStats();
  };

  // Updated renderStreakLeaderboard function
  const renderStreakLeaderboard = () => {
    if (!streakData || !streakData.entries) return null;

    const streakTypeName = streakType === "win" ? "Win" : "No-Loss";
    const streakPeriodName = streakPeriod === "current" ? "Current" : "Best";

    // Determine CSS class based on whether we're showing a date column
    const tableClass =
      streakPeriod === "current"
        ? "table-grid streak-table with-date"
        : "table-grid streak-table";

    return (
      <div className="table-container">
        {renderStreakControls()}

        <h3 className="streak-heading">
          {streakPeriodName} {streakTypeName} Streaks
        </h3>

        <div className={tableClass}>
          <div className="table-header">Rank</div>
          <div className="table-header">Player</div>
          <div className="table-header">Streak</div>
          {streakPeriod === "current" && (
            <div className="table-header">Last Active</div>
          )}

          {streakData.entries.map((entry) => (
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
                {entry.streak_length}
              </div>
              {streakPeriod === "current" && (
                <div
                  className={`table-cell ${entry.is_current_user ? "highlight" : ""}`}
                >
                  {entry.last_active
                    ? new Date(entry.last_active).toLocaleDateString()
                    : "N/A"}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {streakData.user_rank && (
          <div className="user-position">
            Your position: #{streakData.user_rank}
          </div>
        )}

        {renderPagination()}
      </div>
    );
  };

  // Render streak type and period controls
  const renderStreakControls = () => (
    <div className="streak-controls">
      <div className="streak-type-selector">
        <button
          className={`streak-type-button ${streakType === "win" ? "active" : ""}`}
          onClick={() => setStreakType("win")}
        >
          Win Streaks
        </button>
        <button
          className={`streak-type-button ${streakType === "noloss" ? "active" : ""}`}
          onClick={() => setStreakType("noloss")}
        >
          No-Loss Streaks
        </button>
      </div>

      <div className="streak-period-selector">
        <button
          className={`streak-period-button ${streakPeriod === "current" ? "active" : ""}`}
          onClick={() => setStreakPeriod("current")}
        >
          Current
        </button>
        <button
          className={`streak-period-button ${streakPeriod === "best" ? "active" : ""}`}
          onClick={() => setStreakPeriod("best")}
        >
          Best
        </button>
      </div>
    </div>
  );

  const renderPagination = () => {
    if (!leaderboardData && !streakData) return null;

    const data = activeTab === "streaks" ? streakData : leaderboardData;
    if (!data) return null;

    const { page, total_pages } = data;

    // If there's only one page, don't show pagination
    if (total_pages <= 1) return null;

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

      {activeTab === "all-time" || activeTab === "weekly" ? (
        isLoading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          renderLeaderboardTable()
        )
      ) : activeTab === "personal" ? (
        renderPersonalLeaderboard()
      ) : activeTab === "streaks" ? (
        isStreakLoading ? (
          <div className="loading">Loading streak data...</div>
        ) : streakError ? (
          <div className="error">{streakError}</div>
        ) : (
          renderStreakLeaderboard()
        )
      ) : null}
    </div>
  );
};

export default Leaderboard;
