// src/pages/Leaderboard.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaTrophy } from "react-icons/fa";
import useAuthStore from "../stores/authStore";
import useSettingsStore from "../stores/settingsStore";
import useUIStore from "../stores/uiStore";
import apiService from "../services/apiService";
import "../Styles/Leaderboard.css";
import MatrixRain from "../components/effects/MatrixRain";

const Leaderboard = () => {
  const navigate = useNavigate();

  // Get auth state from store
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  // Get settings from store
  const settings = useSettingsStore((state) => state.settings);

  // Get UI actions from store
  const openLogin = useUIStore((state) => state.openLogin);

  // Local state
  const [activeTab, setActiveTab] = useState("leaderboard");
  const [leaderboardData, setLeaderboardData] = useState({
    entries: [],
    pagination: {
      current_page: 1,
      total_pages: 1,
      total_entries: 0,
      per_page: 10,
    },
    currentUserEntry: null,
    period: "all-time",
  });
  const [personalStats, setPersonalStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timePeriod, setTimePeriod] = useState("all-time");
  const [currentPage, setCurrentPage] = useState(1);
  const [streakType, setStreakType] = useState("win");
  const [streakPeriod, setStreakPeriod] = useState("current");

  // Function to fetch leaderboard data
  const fetchLeaderboard = useCallback(
    async (page = 1, period = "all-time") => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.api.get(
          `/leaderboard?page=${page}&period=${period}`,
        );
        if (response.status === 200) {
          setLeaderboardData({
            entries: response.data.entries || [],
            pagination: response.data.pagination || {
              current_page: 1,
              total_pages: 1,
              total_entries: 0,
              per_page: 10,
            },
            currentUserEntry: response.data.currentUserEntry || null,
            period: response.data.period || "all-time",
          });
        }
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError("Failed to load leaderboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Function to fetch streak leaderboard
  const fetchStreakLeaderboard = useCallback(
    async (page = 1, type = "win", period = "current") => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.api.get(
          `/streak_leaderboard?page=${page}&type=${type}&period=${period}`,
        );
        if (response.status === 200) {
          setLeaderboardData({
            entries: response.data.entries || [],
            pagination: response.data.pagination || {
              current_page: 1,
              total_pages: 1,
              total_entries: 0,
              per_page: 10,
            },
            currentUserEntry: response.data.currentUserEntry || null,
            streakType: response.data.streak_type || "win",
            period: response.data.period || "current",
          });
        }
      } catch (err) {
        console.error("Error fetching streak leaderboard:", err);
        setError("Failed to load streak leaderboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Function to fetch personal stats
  const fetchPersonalStats = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await apiService.api.get("/user_stats");
      if (response.status === 200) {
        setPersonalStats(response.data);
      }
    } catch (err) {
      console.error("Error fetching personal stats:", err);
      // Not setting global error as this is a secondary feature
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initial data load
  useEffect(() => {
    if (activeTab === "leaderboard") {
      fetchLeaderboard(currentPage, timePeriod);
    } else if (activeTab === "streaks") {
      fetchStreakLeaderboard(currentPage, streakType, streakPeriod);
    } else if (activeTab === "personal" && isAuthenticated) {
      fetchPersonalStats();
    }
  }, [
    activeTab,
    currentPage,
    timePeriod,
    streakType,
    streakPeriod,
    isAuthenticated,
    fetchLeaderboard,
    fetchStreakLeaderboard,
    fetchPersonalStats,
  ]);

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page on tab change

    // Reset relevant state based on new tab
    if (tab === "leaderboard") {
      fetchLeaderboard(1, timePeriod);
    } else if (tab === "streaks") {
      fetchStreakLeaderboard(1, streakType, streakPeriod);
    } else if (tab === "personal" && isAuthenticated) {
      fetchPersonalStats();
    }
  };

  // Handle time period change
  const handlePeriodChange = (period) => {
    setTimePeriod(period);
    setCurrentPage(1); // Reset to first page
    fetchLeaderboard(1, period);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);

    if (activeTab === "leaderboard") {
      fetchLeaderboard(page, timePeriod);
    } else if (activeTab === "streaks") {
      fetchStreakLeaderboard(page, streakType, streakPeriod);
    }
  };

  // Handle streak type change
  const handleStreakTypeChange = (type) => {
    setStreakType(type);
    setCurrentPage(1); // Reset to first page
    fetchStreakLeaderboard(1, type, streakPeriod);
  };

  // Handle streak period change
  const handleStreakPeriodChange = (period) => {
    setStreakPeriod(period);
    setCurrentPage(1); // Reset to first page
    fetchStreakLeaderboard(1, streakType, period);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return "Today";
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Determine matrix color based on theme
  const getMatrixColor = () => {
    if (settings.theme === "dark") {
      return settings.textColor === "scifi-blue" ? "#4cc9f0" : "#00ff41";
    }
    return "#007bff"; // Default blue for light theme
  };

  return (
    <div
      className={`leaderboard ${settings.theme === "dark" ? "dark-theme" : "light-theme"}`}
    >
      {/* Background Matrix Effect */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: -1,
          opacity: 0.05,
        }}
      >
        <MatrixRain
          active={true}
          color={getMatrixColor()}
          density={20}
          fadeSpeed={0.1}
          speedFactor={0.8}
        />
      </div>

      {/* Leaderboard Header and Navigation */}
      <div className="tabs-container">
        <button className="back-button" onClick={() => navigate("/")}>
          <FaArrowLeft />
        </button>

        <div className="tabs">
          <button
            className={`tab ${activeTab === "leaderboard" ? "active" : ""}`}
            onClick={() => handleTabChange("leaderboard")}
          >
            Leaderboard
          </button>
          <button
            className={`tab ${activeTab === "streaks" ? "active" : ""}`}
            onClick={() => handleTabChange("streaks")}
          >
            Streaks
          </button>
          <button
            className={`tab ${activeTab === "personal" ? "active" : ""}`}
            onClick={() => handleTabChange("personal")}
          >
            My Stats
          </button>
        </div>

        <div className="account-icon-container">
          <FaTrophy
            size={24}
            color={settings.theme === "dark" ? "#4cc9f0" : "#007bff"}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading && activeTab !== "personal" && (
        <div className="leaderboard-loading">
          <h2 className="loading-title">Loading Data</h2>
          <div className="leaderboard-loading-animation">
            <MatrixRain
              active={true}
              color={getMatrixColor()}
              density={30}
              fadeSpeed={0.1}
              speedFactor={1}
              message="Decrypting leaderboard data..."
            />
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button
            onClick={() => {
              if (activeTab === "leaderboard") {
                fetchLeaderboard(currentPage, timePeriod);
              } else if (activeTab === "streaks") {
                fetchStreakLeaderboard(currentPage, streakType, streakPeriod);
              }
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && activeTab === "leaderboard" && (
        <>
          {/* Period Selection */}
          <div className="tabs">
            <button
              className={`tab ${timePeriod === "all-time" ? "active" : ""}`}
              onClick={() => handlePeriodChange("all-time")}
            >
              All Time
            </button>
            <button
              className={`tab ${timePeriod === "weekly" ? "active" : ""}`}
              onClick={() => handlePeriodChange("weekly")}
            >
              This Week
            </button>
          </div>

          {/* Leaderboard Table */}
          <div className="table-container">
            <div className="table-grid">
              <div className="table-header">Rank</div>
              <div className="table-header">Player</div>
              <div className="table-header">Score</div>
              <div className="table-header">Games</div>
              <div className="table-header">Avg Score</div>

              {leaderboardData.entries.map((entry, index) => (
                <React.Fragment key={index}>
                  <div
                    className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  >
                    {entry.rank}
                    {entry.is_current_user && (
                      <span className="you-badge">YOU</span>
                    )}
                  </div>
                  <div
                    className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  >
                    {entry.username}
                  </div>
                  <div
                    className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  >
                    {entry.score.toLocaleString()}
                  </div>
                  <div
                    className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  >
                    {entry.games_played}
                  </div>
                  <div
                    className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  >
                    {entry.avg_score}
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* User Position Notice */}
            {leaderboardData.currentUserEntry &&
              !leaderboardData.entries.some((e) => e.is_current_user) && (
                <div className="user-position">
                  Your position: Rank {leaderboardData.currentUserEntry.rank}{" "}
                  with {leaderboardData.currentUserEntry.score.toLocaleString()}{" "}
                  points
                </div>
              )}

            {/* Pagination */}
            {leaderboardData.pagination &&
              leaderboardData.pagination.total_pages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-button"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    &lt;
                  </button>
                  <span>
                    Page {currentPage} of{" "}
                    {leaderboardData.pagination.total_pages}
                  </span>
                  <button
                    className="pagination-button"
                    disabled={
                      currentPage === leaderboardData.pagination.total_pages
                    }
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    &gt;
                  </button>
                </div>
              )}
          </div>
        </>
      )}

      {!loading && !error && activeTab === "streaks" && (
        <>
          {/* Streak Controls */}
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
                Best Streaks
              </button>
            </div>
          </div>

          <h3 className="streak-heading">
            {streakType === "win" ? "Win" : "No-Loss"} Streaks
            {streakPeriod === "current" ? " (Active)" : " (All-Time Best)"}
          </h3>

          {/* Streak Table */}
          <div className="table-container">
            <div
              className={`streak-table ${streakPeriod === "current" ? "with-date" : ""}`}
            >
              <div className="table-header">Rank</div>
              <div className="table-header">Player</div>
              <div className="table-header">Streak</div>
              {streakPeriod === "current" && (
                <div className="table-header">Last Active</div>
              )}

              {leaderboardData.entries.map((entry, index) => (
                <React.Fragment key={index}>
                  <div
                    className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  >
                    {entry.rank}
                    {entry.is_current_user && (
                      <span className="you-badge">YOU</span>
                    )}
                  </div>
                  <div
                    className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  >
                    {entry.username}
                  </div>
                  <div
                    className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                  >
                    {entry.streak_length}
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
                          ? "🥇"
                          : entry.rank === 2
                            ? "🥈"
                            : "🥉"}
                      </span>
                    )}
                  </div>
                  {streakPeriod === "current" && (
                    <div
                      className={`table-cell ${entry.is_current_user ? "user-highlight" : ""}`}
                    >
                      {formatDate(entry.last_active)}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* User Position Notice */}
            {leaderboardData.currentUserEntry &&
              !leaderboardData.entries.some((e) => e.is_current_user) && (
                <div className="user-position">
                  Your position: Rank {leaderboardData.currentUserEntry.rank}{" "}
                  with streak of{" "}
                  {leaderboardData.currentUserEntry.streak_length}
                </div>
              )}

            {/* Pagination */}
            {leaderboardData.pagination &&
              leaderboardData.pagination.total_pages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-button"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    &lt;
                  </button>
                  <span>
                    Page {currentPage} of{" "}
                    {leaderboardData.pagination.total_pages}
                  </span>
                  <button
                    className="pagination-button"
                    disabled={
                      currentPage === leaderboardData.pagination.total_pages
                    }
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    &gt;
                  </button>
                </div>
              )}
          </div>
        </>
      )}

      {activeTab === "personal" && (
        <>
          {!isAuthenticated ? (
            <div className="personal-stats-login-required">
              <p>You need to be logged in to see your personal statistics.</p>
              <button className="login-button" onClick={openLogin}>
                Login
              </button>
            </div>
          ) : loading ? (
            <div className="loading-spinner">Loading your stats...</div>
          ) : personalStats ? (
            <div className="personal-stats-container">
              {/* Summary Stats */}
              <div className="stats-summary">
                <div className="stat-card">
                  <h3>Games Played</h3>
                  <div className="stat-value">
                    {personalStats.total_games_played}
                  </div>
                </div>
                <div className="stat-card">
                  <h3>Total Score</h3>
                  <div className="stat-value">
                    {personalStats.cumulative_score.toLocaleString()}
                  </div>
                </div>
                <div className="stat-card">
                  <h3>Win Rate</h3>
                  <div className="stat-value">
                    {personalStats.win_percentage}%
                  </div>
                </div>
                <div className="stat-card">
                  <h3>Max Streak</h3>
                  <div className="stat-value">{personalStats.max_streak}</div>
                </div>
              </div>

              {/* Streaks Section */}
              <div className="streaks-section">
                <h3>Your Streaks</h3>
                <div className="streaks-grid">
                  <div className="streak-item">
                    <span className="streak-label">Current Win Streak:</span>
                    <span className="streak-value">
                      {personalStats.current_streak}
                    </span>
                  </div>
                  <div className="streak-item">
                    <span className="streak-label">Best Win Streak:</span>
                    <span className="streak-value">
                      {personalStats.max_streak}
                    </span>
                  </div>
                  <div className="streak-item">
                    <span className="streak-label">
                      Current No-Loss Streak:
                    </span>
                    <span className="streak-value">
                      {personalStats.current_noloss_streak}
                    </span>
                  </div>
                  <div className="streak-item">
                    <span className="streak-label">Best No-Loss Streak:</span>
                    <span className="streak-value">
                      {personalStats.max_noloss_streak}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Performances */}
              <div className="top-performances">
                <h3>Your Top Scores</h3>
                {personalStats.top_scores &&
                personalStats.top_scores.length > 0 ? (
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
                            {Math.floor(score.time_taken / 60)}:
                            {(score.time_taken % 60)
                              .toString()
                              .padStart(2, "0")}
                          </td>
                          <td>{new Date(score.date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>
                    No game scores recorded yet. Play more games to see your top
                    performances!
                  </p>
                )}
              </div>

              {/* Weekly Stats */}
              <div className="top-performances">
                <h3>This Week</h3>
                <div className="streaks-grid">
                  <div className="streak-item">
                    <span className="streak-label">Games Played:</span>
                    <span className="streak-value">
                      {personalStats.weekly_stats.games_played}
                    </span>
                  </div>
                  <div className="streak-item">
                    <span className="streak-label">Total Score:</span>
                    <span className="streak-value">
                      {personalStats.weekly_stats.score}
                    </span>
                  </div>
                </div>
              </div>

              {/* Last Played */}
              {personalStats.last_played_date && (
                <p className="last-played">
                  Last played: {formatDate(personalStats.last_played_date)}
                </p>
              )}
            </div>
          ) : (
            <div className="error-message">
              <p>Failed to load personal stats. Please try again.</p>
              <button onClick={fetchPersonalStats}>Reload Stats</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Leaderboard;
