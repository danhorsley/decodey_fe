// src/hooks/useLeaderboard.js
import { useState, useEffect, useCallback } from "react";
import leaderboardService from "../services/leaderboardService";
import useAuthStore from "../stores/authStore";

/**
 * Custom hook for leaderboard data management
 * Isolates leaderboard functionality from the rest of the app
 */
const useLeaderboard = () => {
  // Authentication state from auth store
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Leaderboard state
  const [leaderboardType, setLeaderboardType] = useState("scores"); // scores, streaks, personal
  const [period, setPeriod] = useState("all-time"); // all-time, weekly
  const [streakType, setStreakType] = useState("win"); // win, noloss
  const [streakPeriod, setStreakPeriod] = useState("current"); // current, best

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);

  // Data state
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [streakData, setStreakData] = useState(null);
  const [personalStats, setPersonalStats] = useState(null);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch main leaderboard data
   */
  const fetchLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await leaderboardService.getLeaderboard(
        period,
        page,
        perPage,
      );

      setLeaderboardData(data);
    } catch (err) {
      console.error("Error in fetchLeaderboard:", err);
      setError("Failed to load leaderboard. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [period, page, perPage]);

  /**
   * Fetch streak leaderboard data
   */
  const fetchStreakLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await leaderboardService.getStreakLeaderboard(
        streakType,
        streakPeriod,
        page,
        perPage,
      );

      setStreakData(data);
    } catch (err) {
      console.error("Error in fetchStreakLeaderboard:", err);
      setError("Failed to load streak leaderboard. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [streakType, streakPeriod, page, perPage]);

  /**
   * Fetch user's personal stats
   */
  const fetchPersonalStats = useCallback(async () => {
    // Skip if not authenticated
    if (!isAuthenticated) {
      setPersonalStats({ authenticated: false });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await leaderboardService.getUserStats();

      setPersonalStats(data);
    } catch (err) {
      console.error("Error in fetchPersonalStats:", err);
      setError("Failed to load personal stats. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Fetch data based on selected leaderboard type
   */
  const fetchData = useCallback(() => {
    switch (leaderboardType) {
      case "scores":
        fetchLeaderboard();
        break;
      case "streaks":
        fetchStreakLeaderboard();
        break;
      case "personal":
        fetchPersonalStats();
        break;
      default:
        fetchLeaderboard();
    }
  }, [
    leaderboardType,
    fetchLeaderboard,
    fetchStreakLeaderboard,
    fetchPersonalStats,
  ]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Change page
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  // Reset pagination when changing filters
  const resetPagination = useCallback(() => {
    setPage(1);
  }, []);

  // Change leaderboard type
  const handleTypeChange = useCallback(
    (type) => {
      setLeaderboardType(type);
      resetPagination();
    },
    [resetPagination],
  );

  // Change leaderboard period
  const handlePeriodChange = useCallback(
    (newPeriod) => {
      setPeriod(newPeriod);
      resetPagination();
    },
    [resetPagination],
  );

  // Change streak type
  const handleStreakTypeChange = useCallback(
    (type) => {
      setStreakType(type);
      resetPagination();
    },
    [resetPagination],
  );

  // Change streak period
  const handleStreakPeriodChange = useCallback(
    (newPeriod) => {
      setStreakPeriod(newPeriod);
      resetPagination();
    },
    [resetPagination],
  );

  // Refresh data
  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Return all the state and handlers
  return {
    // State
    leaderboardType,
    period,
    streakType,
    streakPeriod,
    page,
    perPage,
    isLoading,
    error,

    // Data
    leaderboardData,
    streakData,
    personalStats,

    // Handlers
    handleTypeChange,
    handlePeriodChange,
    handleStreakTypeChange,
    handleStreakPeriodChange,
    handlePageChange,
    refreshData,

    // Auth state
    isAuthenticated,
  };
};

export default useLeaderboard;
