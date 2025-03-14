// src/pages/Leaderboard.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/Leaderboard.css";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useModalContext } from "../components/modals/ModalManager";
import HeaderControls from "../components/HeaderControls";
import AccountButtonWrapper from "../components/AccountButtonWrapper";
import { FiRefreshCw, FiArrowLeft } from "react-icons/fi";
import leaderboardService from "../services/LeaderboardService";

const Leaderboard = ({ onClose }) => {
  const navigate = useNavigate();

  // Get auth state directly from AuthContext
  const { isAuthenticated, user, authLoading: authContextLoading } = useAuth();

  // Get settings directly from SettingsContext
  const { settings } = useSettings();

  // Get modal context
  const { openLogin } = useModalContext();

  // Update our local auth loading state when context updates
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    console.log("Auth context update in Leaderboard:", {
      authContextLoading,
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
    });

    if (!authContextLoading) {
      setAuthLoading(false);
    }
  }, [authContextLoading, isAuthenticated, user]);

  // Tab and pagination state
  const [activeTab, setActiveTab] = useState("all-time");
  const [page, setPage] = useState(1);

  // Leaderboard data states
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Personal stats state
  const [personalStats, setPersonalStats] = useState(null);
  const [isPersonalLoading, setIsPersonalLoading] = useState(false);
  const [personalError, setPersonalError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Streak leaderboard state
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
      const response = await leaderboardService.getLeaderboard(activeTab, page);
      console.log("Leaderboard API response:", response);
      setLeaderboardData(response);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError("Failed to load leaderboard data.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page]);

  // Enhanced fetchStreakData function with better error handling and logging
  const fetchStreakData = useCallback(async () => {
    console.log("Starting fetchStreakData with:", {
      streakType,
      streakPeriod,
      page,
    });

    try {
      setIsStreakLoading(true);
      setStreakError(null);
      setStreakData(null); // Clear data first to avoid rendering stale data

      const response = await leaderboardService.getStreakLeaderboard(
        streakType,
        streakPeriod,
        page,
      );

      if (!response) {
        throw new Error("No data returned from API");
      }

      console.log("Streak API returned:", response);
      setStreakData(response);
    } catch (err) {
      console.error("Error in fetchStreakData:", err.message);
      setStreakError(`Failed to load streak leaderboard data: ${err.message}`);
    } finally {
      setIsStreakLoading(false);
    }
  }, [streakType, streakPeriod, page]);

  // New function to fetch personal stats with useCallback
  const fetchPersonalStats = useCallback(
    async (showRefreshAnimation = false) => {
      console.log(
        "fetchPersonalStats called with showRefreshAnimation =",
        showRefreshAnimation,
      );

      // Don't try to fetch stats if auth is still loading or user is not authenticated
      if (authLoading || !isAuthenticated) {
        console.log(
          "Skipping fetchPersonalStats - auth loading or not authenticated",
        );
        return;
      }

      console.log("Fetching personal stats for authenticated user");

      // Set loading state based on animation flag
      if (showRefreshAnimation) {
        setIsRefreshing(true);
      } else {
        setIsPersonalLoading(true);
      }

      // Clear previous errors
      setPersonalError(null);

      try {
        console.log("Making API call to get user stats...");

        // Get user stats from the API
        const response = await leaderboardService.getUserStats();
        console.log("API response received:", response);

        // Check for error responses
        if (response.error) {
          console.error("Error in API response:", response.error);
          if (response.authenticated === false) {
            setPersonalError("Please log in to view your stats.");
          } else {
            setPersonalError(
              response.message || "Failed to load your personal stats.",
            );
          }
          setPersonalStats(null);
        } else {
          // Success - set the stats
          console.log("Setting personal stats with data:", response);
          setPersonalStats(response);
        }
      } catch (err) {
        console.error("Exception in fetchPersonalStats:", err);
        setPersonalError(
          "Failed to load your personal stats. Please try again.",
        );
        setPersonalStats(null);
      } finally {
        // Important: Always reset the loading states
        setIsPersonalLoading(false);

        // For refresh animation, use a timer for visual feedback
        if (showRefreshAnimation) {
          setTimeout(() => {
            setIsRefreshing(false);
          }, 600);
        }
      }
    },
    [isAuthenticated, authLoading],
  );

  // Fetch leaderboard data
  useEffect(() => {
    // Only fetch leaderboard data for all-time and weekly tabs
    if (activeTab === "all-time" || activeTab === "weekly") {
      fetchLeaderboardData();
    } else if (activeTab === "streaks") {
      console.log("Initiating streak data fetch with params:", {
        streakType,
        streakPeriod,
        page,
      });
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

    // Fetch personal stats when switching to that tab if not already loaded and auth is ready
    if (
      tab === "personal" &&
      !personalStats &&
      isAuthenticated &&
      !authLoading
    ) {
      console.log("Fetching personal stats on tab change");
      fetchPersonalStats();
    } else if (tab === "personal") {
      console.log("Not fetching personal stats on tab change:", {
        hasExistingStats: !!personalStats,
        isAuthenticated,
        authLoading,
      });
    }
  };

  // Refresh personal stats data
  const handleRefreshPersonalStats = useCallback(() => {
    console.log("Refresh button clicked!");

    // Check if already refreshing or loading to prevent double-clicks
    if (isRefreshing || isPersonalLoading) {
      console.log("Refresh canceled - already in progress");
      return;
    }

    console.log("Starting refresh process...");

    // The key fix: Call fetchPersonalStats DIRECTLY, don't wrap in another try/catch
    // This avoids issues with async/await handling
    fetchPersonalStats(true);

    console.log("Refresh action triggered");
  }, [fetchPersonalStats, isRefreshing, isPersonalLoading]);

  const renderRefreshButton = () => (
    <button
      className="refresh-button"
      onClick={handleRefreshPersonalStats}
      disabled={isRefreshing || isPersonalLoading}
      style={{
        transform: isRefreshing ? "rotate(180deg)" : "none",
        transition: "transform 0.3s ease",
        position: "relative", // Ensure proper stacking
        zIndex: 10, // Make sure it's clickable
        pointerEvents: "auto", // Explicitly enable click events
      }}
    >
      <FiRefreshCw />
    </button>
  );

  const renderTabs = () => (
    <div className="tabs-container">
      {/* Back button on the left side with improved styling */}
      <button
        className="back-button"
        onClick={handleBackToGame}
        aria-label="Back to Game"
      >
        <FiArrowLeft size={18} />
      </button>

      {/* Tabs in the center */}
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

      {/* Account button placeholder on the right side */}
      <div className="account-icon-container">
        <AccountButtonWrapper />
      </div>
    </div>
  );

  // Improved leaderboard rendering to include the user carve-out
  const renderLeaderboardTable = () => {
    if (!leaderboardData) return null;

    console.log("Rendering leaderboard with data:", leaderboardData);

    // Destructure with defaults and handle both possible data structures
    // This will work with both the old and new API formats
    const topEntries =
      leaderboardData.topEntries || leaderboardData.entries || [];
    const currentUserEntry = leaderboardData.currentUserEntry || null;
    const pagination = leaderboardData.pagination || {
      current_page: page,
      total_pages: leaderboardData.total_pages || 1,
    };

    // Check if we have data to display
    if (!topEntries || topEntries.length === 0) {
      return <div className="no-data">No leaderboard data available</div>;
    }

    // Check if user entry should be carved out
    // - User must be logged in
    // - Current user entry must exist
    // - User must not be in the current page of top entries
    const shouldShowCarveOut =
      isAuthenticated &&
      currentUserEntry &&
      !topEntries.some(
        (entry) =>
          entry.is_current_user ||
          (currentUserEntry && entry.user_id === currentUserEntry.user_id),
      );

    console.log("Carve-out check:", {
      isAuthenticated,
      hasCurrentUserEntry: !!currentUserEntry,
      isUserInTopEntries: topEntries.some(
        (entry) =>
          entry.is_current_user ||
          (currentUserEntry && entry.user_id === currentUserEntry.user_id),
      ),
      shouldShowCarveOut,
    });

    return (
      <div className="table-container">
        <div className="table-grid">
          <div className="table-header">Rank</div>
          <div className="table-header">Player</div>
          <div className="table-header">Score</div>
          <div className="table-header">Games</div>
          <div className="table-header">Avg/Game</div>

          {/* Render top entries */}
          {topEntries.map((entry) => (
            <React.Fragment key={`top-${entry.user_id || Math.random()}`}>
              <div
                className={`table-cell ${entry.is_current_user || (currentUserEntry && entry.user_id === currentUserEntry.user_id) ? "user-highlight" : ""}`}
              >
                #{entry.rank}
              </div>
              <div
                className={`table-cell ${entry.is_current_user || (currentUserEntry && entry.user_id === currentUserEntry.user_id) ? "user-highlight" : ""}`}
              >
                {entry.username}
                {(entry.is_current_user ||
                  (currentUserEntry &&
                    entry.user_id === currentUserEntry.user_id)) && (
                  <span className="you-badge">YOU</span>
                )}
              </div>
              <div
                className={`table-cell ${entry.is_current_user || (currentUserEntry && entry.user_id === currentUserEntry.user_id) ? "user-highlight" : ""}`}
              >
                {entry.score.toLocaleString()}
              </div>
              <div
                className={`table-cell ${entry.is_current_user || (currentUserEntry && entry.user_id === currentUserEntry.user_id) ? "user-highlight" : ""}`}
              >
                {entry.games_played}
              </div>
              <div
                className={`table-cell ${entry.is_current_user || (currentUserEntry && entry.user_id === currentUserEntry.user_id) ? "user-highlight" : ""}`}
              >
                {entry.avg_score.toLocaleString()}
              </div>
            </React.Fragment>
          ))}

          {/* Carve out separator and user entry */}
          {shouldShowCarveOut && currentUserEntry && (
            <>
              {/* Separator row */}
              <div className="table-cell separator"></div>
              <div className="table-cell separator">...</div>
              <div className="table-cell separator"></div>
              <div className="table-cell separator"></div>
              <div className="table-cell separator"></div>

              {/* User entry row */}
              <div className="table-cell user-highlight">
                #{currentUserEntry.rank}
              </div>
              <div className="table-cell user-highlight">
                {currentUserEntry.username}{" "}
                <span className="you-badge">YOU</span>
              </div>
              <div className="table-cell user-highlight">
                {currentUserEntry.score.toLocaleString()}
              </div>
              <div className="table-cell user-highlight">
                {currentUserEntry.games_played}
              </div>
              <div className="table-cell user-highlight">
                {currentUserEntry.avg_score.toLocaleString()}
              </div>
            </>
          )}
        </div>

        {renderPagination(pagination)}
      </div>
    );
  };

  // Enhanced renderStreakControls function with clear labeling
  const renderStreakControls = () => (
    <div className="streak-controls">
      <div className="streak-type-selector">
        <button
          className={`streak-type-button ${streakType === "win" ? "active" : ""}`}
          onClick={() => {
            console.log("Setting streak type to 'win'");
            setStreakType("win");
            setPage(1); // Reset page when changing type
          }}
        >
          Win Streaks
        </button>
        <button
          className={`streak-type-button ${streakType === "noloss" ? "active" : ""}`}
          onClick={() => {
            console.log("Setting streak type to 'noloss'");
            setStreakType("noloss");
            setPage(1); // Reset page when changing type
          }}
        >
          No-Loss Streaks
        </button>
      </div>

      <div className="streak-period-selector">
        <button
          className={`streak-period-button ${streakPeriod === "current" ? "active" : ""}`}
          onClick={() => {
            console.log("Setting streak period to 'current'");
            setStreakPeriod("current");
            setPage(1); // Reset page when changing period
          }}
        >
          Current
        </button>
        <button
          className={`streak-period-button ${streakPeriod === "best" ? "active" : ""}`}
          onClick={() => {
            console.log("Setting streak period to 'best'");
            setStreakPeriod("best");
            setPage(1); // Reset page when changing period
          }}
        >
          Best
        </button>
      </div>
    </div>
  );

  // Updated pagination function to use pagination data from API
  const renderPagination = (paginationData) => {
    if (!paginationData) return null;

    console.log("Rendering pagination with data:", paginationData);

    // Extract pagination info with defaults
    const currentPage = paginationData.current_page || page;
    const totalPages = paginationData.total_pages || 1;

    // If there's only one page, don't show pagination
    if (!totalPages || totalPages <= 1) return null;

    console.log("Pagination details:", { currentPage, totalPages });

    return (
      <div className="pagination">
        <button
          onClick={() => {
            const newPage = Math.max(1, currentPage - 1);
            console.log("Setting page to:", newPage);
            setPage(newPage);
          }}
          disabled={currentPage <= 1}
          className="pagination-button"
        >
          ←
        </button>
        <span>
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => {
            const newPage = Math.min(totalPages, currentPage + 1);
            console.log("Setting page to:", newPage);
            setPage(newPage);
          }}
          disabled={currentPage >= totalPages}
          className="pagination-button"
        >
          →
        </button>
      </div>
    );
  };

  return (
    <div
      className={`leaderboard ${settings?.theme === "dark" ? "dark-theme" : ""}`}
    >
      {/* Add HeaderControls at the top */}
      <HeaderControls hideTitle={true} hideAbout={true} hideSettings={true} />
      <h2>Leaderboard</h2>
      {/* New tabs container with Back button on the left and Account button on right */}
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
        renderStreakLeaderboard()
      ) : null}
    </div>
  );
};

// New function to render personal stats tab
const renderPersonalStats = () => {
  // Don't show the login prompt if we're still loading auth state
  if (!isAuthenticated && !authLoading) {
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
          <div className="stat-value">{personalStats.current_streak || 0}</div>
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
                    {Math.floor(score.time_taken / 60)}m {score.time_taken % 60}
                    s
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
  // Handle auth loading state
  if (authLoading) {
    return (
      <div className="loading-spinner">Checking authentication status...</div>
    );
  }

  // Personal tab now uses the new renderPersonalStats function
  return renderPersonalStats();
};

// Enhanced renderStreakLeaderboard with comprehensive null checks
const renderStreakLeaderboard = () => {
  console.log("renderStreakLeaderboard called with data:", streakData);

  // Clear loading case
  if (isStreakLoading) {
    return <div className="loading">Loading streak data...</div>;
  }

  // Clear error case
  if (streakError) {
    return (
      <div className="error">
        {streakError}
        <button onClick={fetchStreakData} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  // Handle missing data case
  if (!streakData) {
    return (
      <div className="no-data">
        <p>No streak data available.</p>
        <button onClick={fetchStreakData} className="retry-button">
          Refresh
        </button>
      </div>
    );
  }

  // Safely extract data with fallbacks for everything
  const entries = streakData.entries || streakData.topEntries || [];
  const currentUserEntry = streakData.currentUserEntry || null;
  const pagination = streakData.pagination || {
    current_page: page,
    total_pages: streakData.total_pages || 1,
    total_entries: streakData.total_entries || entries.length,
  };

  // Track if we have content to display
  const hasEntries = entries && entries.length > 0;

  // Create streak type and period descriptions
  const streakTypeName = streakType === "win" ? "Win" : "No-Loss";
  const streakPeriodName = streakPeriod === "current" ? "Current" : "Best";

  // Determine if we should show the user carve-out
  const shouldShowCarveOut =
    isAuthenticated &&
    currentUserEntry &&
    entries.length > 0 &&
    !entries.some(
      (entry) =>
        entry.is_current_user ||
        (currentUserEntry && entry.user_id === currentUserEntry.user_id),
    );

  // Determine if we need a date column
  const showDateColumn = streakPeriod === "current";
  const tableClass = showDateColumn
    ? "table-grid streak-table with-date"
    : "table-grid streak-table";

  // Return the complete UI including streak controls and empty state handling
  return (
    <div className="table-container">
      {/* Always show streak controls */}
      {renderStreakControls()}

      <h3 className="streak-heading">
        {streakPeriodName} {streakTypeName} Streaks
      </h3>

      {/* Show empty state if no entries */}
      {!hasEntries ? (
        <div className="no-data">
          No {streakPeriodName.toLowerCase()} {streakTypeName.toLowerCase()}{" "}
          streaks found
        </div>
      ) : (
        <div className={tableClass}>
          {/* Table headers */}
          <div className="table-header">Rank</div>
          <div className="table-header">Player</div>
          <div className="table-header">Streak</div>
          {showDateColumn && <div className="table-header">Last Active</div>}

          {/* Table entries */}
          {entries.map((entry) => {
            // Ensure entry has required fields with fallbacks
            const userEntry = {
              rank: entry.rank || "?",
              username: entry.username || "Unknown Player",
              streak_length: entry.streak_length || 0,
              user_id: entry.user_id || `unknown-${Math.random()}`,
              last_active: entry.last_active || null,
              is_current_user: entry.is_current_user || false,
            };

            // Check if this is the current user
            const isCurrentUser =
              userEntry.is_current_user ||
              (currentUserEntry &&
                userEntry.user_id === currentUserEntry.user_id);

            return (
              <React.Fragment
                key={`streak-${userEntry.user_id}-${Math.random()}`}
              >
                <div
                  className={`table-cell ${isCurrentUser ? "user-highlight" : ""}`}
                >
                  #{userEntry.rank}
                </div>
                <div
                  className={`table-cell ${isCurrentUser ? "user-highlight" : ""}`}
                >
                  {userEntry.username}
                  {isCurrentUser && <span className="you-badge">YOU</span>}
                </div>
                <div
                  className={`table-cell ${isCurrentUser ? "user-highlight" : ""}`}
                >
                  {userEntry.streak_length}
                </div>
                {showDateColumn && (
                  <div
                    className={`table-cell ${isCurrentUser ? "user-highlight" : ""}`}
                  >
                    {userEntry.last_active
                      ? new Date(userEntry.last_active).toLocaleDateString()
                      : "N/A"}
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Carve out for user's position */}
          {shouldShowCarveOut && currentUserEntry && (
            <>
              {/* Separator row */}
              <div className="table-cell separator"></div>
              <div className="table-cell separator">...</div>
              <div className="table-cell separator"></div>
              {showDateColumn && <div className="table-cell separator"></div>}

              {/* User entry row */}
              <div className="table-cell user-highlight">
                #{currentUserEntry.rank || "?"}
              </div>
              <div className="table-cell user-highlight">
                {currentUserEntry.username || "You"}{" "}
                <span className="you-badge">YOU</span>
              </div>
              <div className="table-cell user-highlight">
                {currentUserEntry.streak_length || 0}
              </div>
              {showDateColumn && (
                <div className="table-cell user-highlight">
                  {currentUserEntry.last_active
                    ? new Date(
                        currentUserEntry.last_active,
                      ).toLocaleDateString()
                    : "N/A"}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Pagination, only shown if we have enough entries */}
      {hasEntries &&
        pagination &&
        pagination.total_pages > 1 &&
        renderPagination(pagination)}
    </div>
  );
};

export default Leaderboard;
