// src/pages/Leaderboard.js
import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaTrophy, FaMedal, FaFire, FaUser } from "react-icons/fa";
import useLeaderboard from "../hooks/useLeaderboard";
import useUIStore from "../stores/uiStore";
import useSettingsStore from "../stores/settingsStore";
import "../Styles/Leaderboard.css";

// Component for when data is loading
const LeaderboardLoading = ({ theme }) => (
  <div className="leaderboard-loading">
    <h2 className="loading-title">Loading leaderboard data...</h2>
    <div className="leaderboard-loading-animation">
      {/* Could add a nice loading animation here */}
    </div>
  </div>
);

// Component for error state
const LeaderboardError = ({ error, onRetry, theme }) => (
  <div className="error-message">
    <p>{error}</p>
    <button onClick={onRetry}>Try Again</button>
  </div>
);

// Leaderboard page component
function Leaderboard() {
  const navigate = useNavigate();
  const { openLogin } = useUIStore();
  const settings = useSettingsStore((state) => state.settings);

  // Use our custom hook for all leaderboard functionality
  const {
    leaderboardType,
    period,
    streakType,
    streakPeriod,
    page,
    isLoading,
    error,
    leaderboardData,
    streakData,
    personalStats,
    handleTypeChange,
    handlePeriodChange,
    handleStreakTypeChange,
    handleStreakPeriodChange,
    handlePageChange,
    refreshData,
    isAuthenticated,
  } = useLeaderboard();

  // Navigate back to game
  const handleBack = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // Handle login click
  const handleLoginClick = useCallback(() => {
    openLogin();
  }, [openLogin]);

  // Render the main leaderboard
  const renderScoresLeaderboard = useCallback(() => {
    if (!leaderboardData) return null;

    const { topEntries, currentUserEntry, pagination } = leaderboardData;

    return (
      <>
        {/* Leaderboard period tabs */}
        <div className="tabs-container">
          <button className="back-button" onClick={handleBack} aria-label="Back">
            <FaArrowLeft />
          </button>

          <div className="tabs">
            <button
              className={`tab ${period === "all-time" ? "active" : ""}`}
              onClick={() => handlePeriodChange("all-time")}
            >
              All Time
            </button>
            <button
              className={`tab ${period === "weekly" ? "active" : ""}`}
              onClick={() => handlePeriodChange("weekly")}
            >
              Weekly
            </button>
          </div>

          <div className="account-icon-container">
            <button
              className={`tab ${leaderboardType === "personal" ? "active" : ""}`}
              onClick={() => handleTypeChange("personal")}
              disabled={!isAuthenticated}
              title={isAuthenticated ? "Your Stats" : "Login to view your stats"}
            >
              <FaUser />
            </button>
          </div>
        </div>

        {/* Table header */}
        <div className="table-container">
          <div className="table-grid">
            <div className="table-header">Rank</div>
            <div className="table-header">Player</div>
            <div className="table-header">Score</div>
            <div className="table-header">Games</div>
            <div className="table-header">Avg</div>
          </div>

          {/* No data message */}
          {topEntries.length === 0 && (
            <p className="no-data">No leaderboard data available.</p>
          )}

          {/* Table rows */}
          {topEntries.map((entry, index) => (
            <React.Fragment key={entry.user_id || index}>
              <div className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}>
                {entry.rank}
              </div>
              <div className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}>
                {entry.username}
                {entry.is_current_user && <span className="you-badge">YOU</span>}
              </div>
              <div className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}>
                {entry.score.toLocaleString()}
              </div>
              <div className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}>
                {entry.games_played}
              </div>
              <div className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}>
                {entry.avg_score}
              </div>
            </React.Fragment>
          ))}

          {/* User position if not in top entries */}
          {currentUserEntry && !topEntries.some(entry => entry.is_current_user) && (
            <>
              <div className="table-cell separator" colSpan="5">. . .</div>
              <div className="table-cell user-highlight">{currentUserEntry.rank || "?"}</div>
              <div className="table-cell user-highlight">
                {currentUserEntry.username}
                <span className="you-badge">YOU</span>
              </div>
              <div className="table-cell user-highlight">
                {currentUserEntry.score?.toLocaleString() || 0}
              </div>
              <div className="table-cell user-highlight">
                {currentUserEntry.games_played || 0}
              </div>
              <div className="table-cell user-highlight">
                {currentUserEntry.avg_score || 0}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="pagination">
            <button
              className="pagination-button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              Prev
            </button>
            <span>
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <button
              className="pagination-button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pagination.total_pages}
            >
              Next
            </button>
          </div>
        )}
      </>
    );
  }, [leaderboardData, period, leaderboardType, page, isAuthenticated, handleBack, handlePeriodChange, handleTypeChange, handlePageChange]);

  // Render the streak leaderboard
  const renderStreakLeaderboard = useCallback(() => {
    if (!streakData) return null;

    const { entries, currentUserEntry, pagination } = streakData;
    const showDates = streakPeriod === "current";

    return (
      <>
        {/* Streak type tabs */}
        <div className="tabs-container">
          <button className="back-button" onClick={handleBack} aria-label="Back">
            <FaArrowLeft />
          </button>

          <div className="tabs">
            <button
              className={`tab ${leaderboardType === "scores" ? "active" : ""}`}
              onClick={() => handleTypeChange("scores")}
            >
              Score
            </button>
            <button
              className={`tab ${leaderboardType === "streaks" ? "active" : ""}`}
              onClick={() => handleTypeChange("streaks")}
            >
              Streaks
            </button>
          </div>

          <div className="account-icon-container">
            <button
              className={`tab ${leaderboardType === "personal" ? "active" : ""}`}
              onClick={() => handleTypeChange("personal")}
              disabled={!isAuthenticated}
              title={isAuthenticated ? "Your Stats" : "Login to view your stats"}
            >
              <FaUser />
            </button>
          </div>
        </div>

        {/* Streak controls */}
        <div className="streak-controls">
          <div className="streak-type-selector">
            <button
              className={`streak-type-button ${streakType === "win" ? "active" : ""}`}
              onClick={() => handleStreakTypeChange("win")}
            >
              Win Streaks
            </button>
            <button
              className={`streak-type-button ${streakType === "noloss" ? "active" : ""}`}
              onClick={() => handleStreakTypeChange("noloss")}
            >
              No-Loss Streaks
            </button>
          </div>

          <div className="streak-period-selector">
            <button
              className={`streak-period-button ${streakPeriod === "current" ? "active" : ""}`}
              onClick={() => handleStreakPeriodChange("current")}
            >
              Current Streaks
            </button>
            <button
              className={`streak-period-button ${streakPeriod === "best" ? "active" : ""}`}
              onClick={() => handleStreakPeriodChange("best")}
            >
              All-Time Best
            </button>
          </div>
        </div>

        {/* Table header */}
        <div className="table-container">
          <div className={`streak-table ${showDates ? "with-date" : ""}`}>
            <div className="table-header">Rank</div>
            <div className="table-header">Player</div>
            <div className="table-header">Streak</div>
            {showDates && <div className="table-header">Last Active</div>}
          </div>

          {/* No data message */}
          {entries.length === 0 && (
            <p className="no-data">No streak data available.</p>
          )}

          {/* Table rows */}
          {entries.map((entry, index) => (
            <React.Fragment key={entry.user_id || index}>
              <div className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}>
                {entry.rank}
                {entry.rank <= 3 && (
                  <span className={`streak-badge ${
                    entry.rank === 1 ? "gold" : entry.rank === 2 ? "silver" : "bronze"
                  }`}>
                    {entry.rank === 1 ? "1st" : entry.rank === 2 ? "2nd" : "3rd"}
                  </span>
                )}
              </div>
              <div className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}>
                {entry.username}
                {entry.is_current_user && <span className="you-badge">YOU</span>}
              </div>
              <div className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}>
                {entry.streak_length}
              </div>
              {showDates && (
                <div className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}>
                  {new Date(entry.last_active).toLocaleDateString()}
                </div>
              )}
            </React.Fragment>
          ))}

          {/* User position if not in top entries */}
          {currentUserEntry && !entries.some(entry => entry.is_current_user) && (
            <>
              <div className="table-cell separator" colSpan={showDates ? "4" : "3"}>. . .</div>
              <div className="table-cell user-highlight">{currentUserEntry.rank || "?"}</div>
              <div className="table-cell user-highlight">
                {currentUserEntry.username}
                <span className="you-badge">YOU</span>
              </div>
              <div className="table-cell user-highlight">
                {currentUserEntry.streak_length || 0}
              </div>
              {showDates && (
                <div className="table-cell user-highlight">
                  {currentUserEntry.last_active 
                    ? new Date(currentUserEntry.last_active).toLocaleDateString()
                    : "N/A"
                  }
                </div>
              )}
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="pagination">
            <button
              className="pagination-button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              Prev
            </button>
            <span>
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <button
              className="pagination-button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pagination.total_pages}
            >
              Next
            </button>
          </div>
        )}
      </>
    );
  }, [streakData, streakType, streakPeriod, leaderboardType, page, isAuthenticated, handleBack, handleTypeChange, handleStreakTypeChange, handleStreakPeriodChange, handlePageChange]);

  // Render personal stats
  const renderPersonalStats = useCallback(() => {
    // If not authenticated, show login prompt
    if (!isAuthenticated) {
      return (
        <div className="personal-stats-login-required">
          <h3>Login Required</h3>
          <p>Please log in to view your personal stats and position on the leaderboard.</p>
          <button className="login-button" onClick={handleLoginClick}>
            Login
          </button>
        </div>
      );
    }

    // If no stats data, show loading or error
    if (!personalStats) {
      return <p className="loading">Loading your stats...</p>;
    }

    // Render personal stats UI
    return (
      <div className="personal-stats-container">
        <div className="tabs-container">
          <button className="back-button" onClick={handleBack} aria-label="Back">
            <FaArrowLeft />
          </button>

          <div className="tabs">
            <button
              className={`tab ${leaderboardType === "scores" ? "active" : ""}`}
              onClick={() => handleTypeChange("scores")}
            >
              Scores
            </button>
            <button
              className={`tab ${leaderboardType === "streaks" ? "active" : ""}`}
              onClick={() => handleTypeChange("streaks")}
            >
              Streaks
            </button>
          </div>

          <div className="account-icon-container">
            <button
              className={`tab ${leaderboardType === "personal" ? "active" : ""}`}
              onClick={() => handleTypeChange("personal")}
            >
              <FaUser />
            </button>
          </div>
        </div>

        <h2>Your Stats</h2>

        {/* Summary stats cards */}
        <div className="stats-summary">
          <div className="stat-card">
            <h3>Total Score</h3>
            <div className="stat-value">{personalStats.cumulative_score?.toLocaleString() || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Games Played</h3>
            <div className="stat-value">{personalStats.total_games_played || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Games Won</h3>
            <div className="stat-value">{personalStats.games_won || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Win Rate</h3>
            <div className="stat-value">{personalStats.win_percentage || 0}%</div>
          </div>
        </div>

        {/* Streaks section */}
        <div className="streaks-section">
          <h3>Your Streaks</h3>
          <div className="streaks-grid">
            <div className="streak-item">
              <span className="streak-label">Current Win Streak:</span>
              <span className="streak-value">{personalStats.current_streak || 0}</span>
            </div>
            <div className="streak-item">
              <span className="streak-label">Best Win Streak:</span>
              <span className="streak-value">{personalStats.max_streak || 0}</span>
            </div>
            <div className="streak-item">
              <span className="streak-label">Current No-Loss Streak:</span>
              <span className="streak-value">{personalStats.current_noloss_streak || 0}</span>
            </div>
            <div className="streak-item">
              <span className="streak-label">Best No-Loss Streak:</span>
              <span className="streak-value">{personalStats.max_noloss_streak || 0}</span>
            </div>
          </div>
        </div>

        {/* Top scores table */}
        {personalStats.top_scores && personalStats.top_scores.length > 0 && (
          <div className="top-performances">
            <h3>Your Top Scores</h3>
            <table className="top-scores-table">
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Time</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {personalStats.top_scores.map((score, index) => (
                  <tr key={index}>
                    <td>{score.score}</td>
                    <td>{Math.floor(score.time_taken / 60)}m {score.time_taken % 60}s</td>
                    <td>{new Date(score.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Last played date */}
        {personalStats.last_played_date && (
                                   <p className="last-played">
                                     Last played: {new Date(personalStats.last_played_date).toLocaleDateString()}
                                   </p>
                                   )}
                                   </div>
                                   );
                                   }, [isAuthenticated, personalStats, leaderboardType, handleBack, handleLoginClick, handleTypeChange]);

                                   // Main render function
                                   return (
                                   <div className={`leaderboard ${settings?.theme === "dark" ? "dark-theme" : ""}`}>
                                   {/* Show loading state */}
                                   {isLoading && <LeaderboardLoading theme={settings?.theme} />}

                                   {/* Show error state */}
                                   {error && !isLoading && (
                                   <LeaderboardError 
                                   error={error} 
                                   onRetry={refreshData} 
                                   theme={settings?.theme} 
                                   />
                                   )}

                                   {/* Show appropriate content based on selected tab */}
                                   {!isLoading && !error && (
                                   <>
                                   {leaderboardType === "scores" && renderScoresLeaderboard()}
                                   {leaderboardType === "streaks" && renderStreakLeaderboard()}
                                   {leaderboardType === "personal" && renderPersonalStats()}
                                   </>
                                   )}
                                   </div>
                                   );
                                   }

                                   export default Leaderboard;