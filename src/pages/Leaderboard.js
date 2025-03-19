// src/pages/Leaderboard.js
import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaTrophy, FaMedal, FaFire, FaUser } from "react-icons/fa";
import useLeaderboard from "../hooks/useLeaderboard";
import useUIStore from "../stores/uiStore";
import useSettingsStore from "../stores/settingsStore";
import "../Styles/Leaderboard.css";

// Component for when data is loading
const LeaderboardLoading = ({ theme, type }) => {
  // Customize loading message based on the type of data being loaded
  let message = "Loading leaderboard data...";

  if (type === "streaks") {
    message = "Loading streak data...";
  } else if (type === "personal") {
    message = "Loading your stats...";
  }

  return (
    <div className="leaderboard-loading">
      <h2 className="loading-title">{message}</h2>
      <div className="leaderboard-loading-animation">
        {/* Use MatrixRainLoading for a consistent look with the rest of the app */}
        <div style={{ height: "300px", width: "100%" }}>
          {/* Could use MatrixRainLoading here if imported */}
        </div>
      </div>
    </div>
  );
};

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
        {/* Main navigation tabs */}
        <div className="tabs-container">
          <button
            className="back-button"
            onClick={handleBack}
            aria-label="Back"
          >
            <FaArrowLeft />
          </button>

          <div className="tabs">
            <button
              className={`tab ${leaderboardType === "scores" ? "active" : ""}`}
              onClick={() => handleTypeChange("scores")}
            >
              <FaTrophy style={{ marginRight: "5px" }} /> Scores
            </button>
            <button
              className={`tab ${leaderboardType === "streaks" ? "active" : ""}`}
              onClick={() => handleTypeChange("streaks")}
            >
              <FaFire style={{ marginRight: "5px" }} /> Streaks
            </button>
            <button
              className={`tab ${leaderboardType === "personal" ? "active" : ""}`}
              onClick={() => handleTypeChange("personal")}
              disabled={!isAuthenticated}
              title={
                isAuthenticated ? "Your Stats" : "Login to view your stats"
              }
            >
              <FaUser style={{ marginRight: "5px" }} /> My Stats
            </button>
          </div>
        </div>

        {/* Period tabs - only shown for scores view */}
        {leaderboardType === "scores" && (
          <div className="tabs-container" style={{ marginTop: "10px" }}>
            <div style={{ width: "40px" }}></div> {/* Spacer for alignment */}
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
            <div style={{ width: "40px" }}></div> {/* Spacer for alignment */}
          </div>
        )}

        {/* Table header and data - using a traditional table-like approach */}
        <div className="table-container">
          <div
            className="table-grid"
            style={{
              display: "table",
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <div style={{ display: "table-row" }}>
              <div
                className="table-header"
                style={{ display: "table-cell", width: "15%" }}
              >
                Rank
              </div>
              <div
                className="table-header"
                style={{ display: "table-cell", width: "40%" }}
              >
                Player
              </div>
              <div
                className="table-header"
                style={{ display: "table-cell", width: "15%" }}
              >
                Score
              </div>
              <div
                className="table-header"
                style={{ display: "table-cell", width: "15%" }}
              >
                Games
              </div>
              <div
                className="table-header"
                style={{ display: "table-cell", width: "15%" }}
              >
                Avg
              </div>
            </div>

            {/* No data message */}
            {topEntries.length === 0 && (
              <div style={{ display: "table-row" }}>
                <div
                  style={{
                    display: "table-cell",
                    padding: "30px",
                    textAlign: "center",
                    colspan: "5",
                  }}
                >
                  No leaderboard data available.
                </div>
              </div>
            )}

            {/* Table rows using table-row structure */}
            {topEntries.map((entry, index) => (
              <div
                key={entry.user_id || index}
                style={{ display: "table-row" }}
              >
                <div
                  className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  style={{ display: "table-cell" }}
                >
                  {entry.rank}
                </div>
                <div
                  className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  style={{ display: "table-cell" }}
                >
                  {entry.username}
                  {entry.is_current_user && (
                    <span className="you-badge">YOU</span>
                  )}
                </div>
                <div
                  className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  style={{ display: "table-cell" }}
                >
                  {entry.score.toLocaleString()}
                </div>
                <div
                  className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  style={{ display: "table-cell" }}
                >
                  {entry.games_played}
                </div>
                <div
                  className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  style={{ display: "table-cell" }}
                >
                  {entry.avg_score}
                </div>
              </div>
            ))}

            {/* User position if not in top entries */}
            {currentUserEntry &&
              !topEntries.some((entry) => entry.is_current_user) && (
                <>
                  <div style={{ display: "table-row" }}>
                    <div
                      className="table-cell separator"
                      style={{
                        display: "table-cell",
                        textAlign: "center",
                        colspan: "5",
                      }}
                    >
                      . . .
                    </div>
                  </div>
                  <div style={{ display: "table-row" }}>
                    <div
                      className="table-cell user-highlight"
                      style={{ display: "table-cell" }}
                    >
                      {currentUserEntry.rank || "?"}
                    </div>
                    <div
                      className="table-cell user-highlight"
                      style={{ display: "table-cell" }}
                    >
                      {currentUserEntry.username}
                      <span className="you-badge">YOU</span>
                    </div>
                    <div
                      className="table-cell user-highlight"
                      style={{ display: "table-cell" }}
                    >
                      {currentUserEntry.score?.toLocaleString() || 0}
                    </div>
                    <div
                      className="table-cell user-highlight"
                      style={{ display: "table-cell" }}
                    >
                      {currentUserEntry.games_played || 0}
                    </div>
                    <div
                      className="table-cell user-highlight"
                      style={{ display: "table-cell" }}
                    >
                      {currentUserEntry.avg_score || 0}
                    </div>
                  </div>
                </>
              )}
          </div>
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
  }, [
    leaderboardData,
    period,
    leaderboardType,
    page,
    isAuthenticated,
    handleBack,
    handlePeriodChange,
    handleTypeChange,
    handlePageChange,
  ]);

  // Render the streak leaderboard
  const renderStreakLeaderboard = useCallback(() => {
    if (!streakData) return null;

    const { entries, currentUserEntry, pagination } = streakData;
    const showDates = streakPeriod === "current";

    return (
      <>
        {/* Main navigation tabs */}
        <div className="tabs-container">
          <button
            className="back-button"
            onClick={handleBack}
            aria-label="Back"
          >
            <FaArrowLeft />
          </button>

          <div className="tabs">
            <button
              className={`tab ${leaderboardType === "scores" ? "active" : ""}`}
              onClick={() => handleTypeChange("scores")}
            >
              <FaTrophy style={{ marginRight: "5px" }} /> Scores
            </button>
            <button
              className={`tab ${leaderboardType === "streaks" ? "active" : ""}`}
              onClick={() => handleTypeChange("streaks")}
            >
              <FaFire style={{ marginRight: "5px" }} /> Streaks
            </button>
            <button
              className={`tab ${leaderboardType === "personal" ? "active" : ""}`}
              onClick={() => handleTypeChange("personal")}
              disabled={!isAuthenticated}
              title={
                isAuthenticated ? "Your Stats" : "Login to view your stats"
              }
            >
              <FaUser style={{ marginRight: "5px" }} /> My Stats
            </button>
          </div>
        </div>

        {/* No streak type tabs here - they've been moved to main navigation */}

        {/* Streak controls - add a heading to make it clearer now that tabs are gone */}
        <div className="streak-controls">
          <h2 className="streak-heading">Streak Leaderboards</h2>
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

        {/* Table header and data - using a traditional table-like approach */}
        <div className="table-container">
          <div
            className={`streak-table ${showDates ? "with-date" : ""}`}
            style={{
              display: "table",
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <div style={{ display: "table-row" }}>
              <div
                className="table-header"
                style={{
                  display: "table-cell",
                  width: showDates ? "15%" : "20%",
                }}
              >
                Rank
              </div>
              <div
                className="table-header"
                style={{
                  display: "table-cell",
                  width: showDates ? "40%" : "60%",
                }}
              >
                Player
              </div>
              <div
                className="table-header"
                style={{
                  display: "table-cell",
                  width: showDates ? "15%" : "20%",
                }}
              >
                Streak
              </div>
              {showDates && (
                <div
                  className="table-header"
                  style={{ display: "table-cell", width: "30%" }}
                >
                  Last Active
                </div>
              )}
            </div>

            {/* No data message */}
            {entries.length === 0 && (
              <div style={{ display: "table-row" }}>
                <div
                  style={{
                    display: "table-cell",
                    padding: "30px",
                    textAlign: "center",
                    colspan: showDates ? "4" : "3",
                  }}
                >
                  No streak data available.
                </div>
              </div>
            )}

            {/* Table rows using table-row structure */}
            {entries.map((entry, index) => (
              <div
                key={entry.user_id || index}
                style={{ display: "table-row" }}
              >
                <div
                  className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  style={{ display: "table-cell" }}
                >
                  {entry.rank}
                  {entry.rank <= 3 && (
                    <span
                      className={`streak-badge ${
                        entry.rank === 1
                          ? "gold"
                          : entry.rank === 2
                            ? "silver"
                            : "bronze"
                      }`}
                    >
                      {entry.rank === 1
                        ? "1st"
                        : entry.rank === 2
                          ? "2nd"
                          : "3rd"}
                    </span>
                  )}
                </div>
                <div
                  className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  style={{ display: "table-cell" }}
                >
                  {entry.username}
                  {entry.is_current_user && (
                    <span className="you-badge">YOU</span>
                  )}
                </div>
                <div
                  className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  style={{ display: "table-cell" }}
                >
                  {entry.streak_length}
                </div>
                {showDates && (
                  <div
                    className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                    style={{ display: "table-cell" }}
                  >
                    {new Date(entry.last_active).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}

            {/* User position if not in top entries */}
            {currentUserEntry &&
              !entries.some((entry) => entry.is_current_user) && (
                <>
                  <div style={{ display: "table-row" }}>
                    <div
                      className="table-cell separator"
                      style={{
                        display: "table-cell",
                        textAlign: "center",
                        colspan: showDates ? "4" : "3",
                      }}
                    >
                      . . .
                    </div>
                  </div>
                  <div style={{ display: "table-row" }}>
                    <div
                      className="table-cell user-highlight"
                      style={{ display: "table-cell" }}
                    >
                      {currentUserEntry.rank || "?"}
                    </div>
                    <div
                      className="table-cell user-highlight"
                      style={{ display: "table-cell" }}
                    >
                      {currentUserEntry.username}
                      <span className="you-badge">YOU</span>
                    </div>
                    <div
                      className="table-cell user-highlight"
                      style={{ display: "table-cell" }}
                    >
                      {currentUserEntry.streak_length || 0}
                    </div>
                    {showDates && (
                      <div
                        className="table-cell user-highlight"
                        style={{ display: "table-cell" }}
                      >
                        {currentUserEntry.last_active
                          ? new Date(
                              currentUserEntry.last_active,
                            ).toLocaleDateString()
                          : "N/A"}
                      </div>
                    )}
                  </div>
                </>
              )}
          </div>
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
  }, [
    streakData,
    streakType,
    streakPeriod,
    leaderboardType,
    page,
    isAuthenticated,
    handleBack,
    handleTypeChange,
    handleStreakTypeChange,
    handleStreakPeriodChange,
    handlePageChange,
  ]);

  // Render personal stats
  const renderPersonalStats = useCallback(() => {
    // If not authenticated, show login prompt
    if (!isAuthenticated) {
      return (
        <div className="personal-stats-login-required">
          <h3>Login Required</h3>
          <p>
            Please log in to view your personal stats and position on the
            leaderboard.
          </p>
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
        {/* Main navigation tabs */}
        <div className="tabs-container">
          <button
            className="back-button"
            onClick={handleBack}
            aria-label="Back"
          >
            <FaArrowLeft />
          </button>

          <div className="tabs">
            <button
              className={`tab ${leaderboardType === "scores" ? "active" : ""}`}
              onClick={() => handleTypeChange("scores")}
            >
              <FaTrophy style={{ marginRight: "5px" }} /> Scores
            </button>
            <button
              className={`tab ${leaderboardType === "streaks" ? "active" : ""}`}
              onClick={() => handleTypeChange("streaks")}
            >
              <FaFire style={{ marginRight: "5px" }} /> Streaks
            </button>
            <button
              className={`tab ${leaderboardType === "personal" ? "active" : ""}`}
              onClick={() => handleTypeChange("personal")}
              disabled={!isAuthenticated}
              title={
                isAuthenticated ? "Your Stats" : "Login to view your stats"
              }
            >
              <FaUser style={{ marginRight: "5px" }} /> My Stats
            </button>
          </div>
        </div>

        <h2>Your Stats</h2>

        {/* Summary stats cards */}
        <div className="stats-summary">
          <div className="stat-card">
            <h3>Total Score</h3>
            <div className="stat-value">
              {personalStats.cumulative_score?.toLocaleString() || 0}
            </div>
          </div>
          <div className="stat-card">
            <h3>Games Played</h3>
            <div className="stat-value">
              {personalStats.total_games_played || 0}
            </div>
          </div>
          <div className="stat-card">
            <h3>Games Won</h3>
            <div className="stat-value">{personalStats.games_won || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Win Rate</h3>
            <div className="stat-value">
              {personalStats.win_percentage || 0}%
            </div>
          </div>
        </div>

        {/* Streaks section */}
        <div className="streaks-section">
          <h3>Your Streaks</h3>
          <div className="streaks-grid">
            <div className="streak-item">
              <span className="streak-label">Current Win Streak:</span>
              <span className="streak-value">
                {personalStats.current_streak || 0}
              </span>
            </div>
            <div className="streak-item">
              <span className="streak-label">Best Win Streak:</span>
              <span className="streak-value">
                {personalStats.max_streak || 0}
              </span>
            </div>
            <div className="streak-item">
              <span className="streak-label">Current No-Loss Streak:</span>
              <span className="streak-value">
                {personalStats.current_noloss_streak || 0}
              </span>
            </div>
            <div className="streak-item">
              <span className="streak-label">Best No-Loss Streak:</span>
              <span className="streak-value">
                {personalStats.max_noloss_streak || 0}
              </span>
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

        {/* Last played date */}
        {personalStats.last_played_date && (
          <p className="last-played">
            Last played:{" "}
            {new Date(personalStats.last_played_date).toLocaleDateString()}
          </p>
        )}
      </div>
    );
  }, [
    isAuthenticated,
    personalStats,
    leaderboardType,
    handleBack,
    handleLoginClick,
    handleTypeChange,
  ]);

  // Main render function
  return (
    <div
      className={`leaderboard ${settings?.theme === "dark" ? "dark-theme" : ""}`}
    >
      {/* Show loading state */}
      {isLoading && (
        <LeaderboardLoading theme={settings?.theme} type={leaderboardType} />
      )}

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
