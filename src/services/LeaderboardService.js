// src/services/leaderboardService.js
import apiService from "./apiService";

/**
 * Service to handle all leaderboard and stats related API calls
 */
class LeaderboardService {
  /**
   * Fetch main leaderboard data
   * @param {string} period - Time period for leaderboard ('all-time' or 'weekly')
   * @param {number} page - Page number for pagination
   * @param {number} perPage - Number of entries per page
   * @returns {Promise<Object>} - Leaderboard data
   */
  async getLeaderboard(period = "all-time", page = 1, perPage = 10) {
    try {
      console.log(`Fetching ${period} leaderboard, page ${page}`);

      // Use the base API instance from apiService
      const response = await apiService.api.get(`/api/leaderboard`, {
        params: { period, page, per_page: perPage },
      });

      console.log("Leaderboard response:", response.data);

      // Transform response to a standardized format
      return this.transformLeaderboardResponse(response.data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      // Return a safe default instead of throwing
      return {
        topEntries: [],
        currentUserEntry: null,
        pagination: { current_page: page, total_pages: 1, total_entries: 0 },
      };
    }
  }

  /**
   * Fetch streak leaderboard data
   * @param {string} streakType - Type of streak ('win' or 'noloss')
   * @param {string} period - Period of streak ('current' or 'best')
   * @param {number} page - Page number for pagination
   * @param {number} perPage - Number of entries per page
   * @returns {Promise<Object>} - Streak leaderboard data
   */
  async getStreakLeaderboard(
    streakType = "win",
    period = "current",
    page = 1,
    perPage = 10,
  ) {
    try {
      console.log(
        `Fetching ${streakType} streak leaderboard (${period}), page ${page}`,
      );

      const response = await apiService.api.get(`/api/streak_leaderboard`, {
        params: { type: streakType, period, page, per_page: perPage },
      });

      console.log("Streak leaderboard response:", response.data);

      // Transform to a consistent format
      return this.transformStreakResponse(response.data, streakType, period);
    } catch (error) {
      console.error("Error fetching streak leaderboard:", error);
      // Return a safe default instead of throwing
      return {
        entries: [],
        currentUserEntry: null,
        pagination: { current_page: page, total_pages: 1, total_entries: 0 },
        streak_type: streakType,
        period: period,
      };
    }
  }

  /**
   * Fetch user's personal stats
   * @returns {Promise<Object>} - User stats data
   */
  async getUserStats() {
    try {
      console.log("Fetching user stats");

      const response = await apiService.api.get(`/api/user_stats`);

      console.log("User stats response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching user stats:", error);

      // Check if this is an auth error
      if (error.response && error.response.status === 401) {
        return {
          authenticated: false,
          message: "Authentication required to view your stats.",
        };
      }

      throw error;
    }
  }

  /**
   * Transforms the leaderboard API response to a consistent format
   * @param {Object} data - Raw API response
   * @returns {Object} - Standardized leaderboard data
   */
  transformLeaderboardResponse(data) {
    return {
      // For entries, check all possible field names
      topEntries: data.topEntries || data.entries || [],

      // For user entry, either use the dedicated field or look for the user in entries
      currentUserEntry:
        data.currentUserEntry ||
        (data.entries && data.entries.find((entry) => entry.is_current_user)) ||
        null,

      // For pagination, create a consistent format
      pagination: data.pagination || {
        current_page: data.page || 1,
        total_pages: data.total_pages || 1,
        total_entries:
          data.total_users || (data.entries ? data.entries.length : 0),
      },
    };
  }

  /**
   * Transforms the streak leaderboard API response to a consistent format
   * @param {Object} data - Raw API response
   * @param {string} streakType - Type of streak requested
   * @param {string} period - Period of streak requested
   * @returns {Object} - Standardized streak leaderboard data
   */
  transformStreakResponse(data, streakType, period) {
    return {
      // For entries, check all possible field names
      entries: data.entries || data.topEntries || [],

      // For user entry, either use the dedicated field or look for the user in entries
      currentUserEntry:
        data.currentUserEntry ||
        (data.entries && data.entries.find((entry) => entry.is_current_user)) ||
        null,

      // For pagination, create a consistent format
      pagination: data.pagination || {
        current_page: data.page || 1,
        total_pages: data.total_pages || 1,
        total_entries:
          data.total_users || (data.entries ? data.entries.length : 0),
      },

      // Keep other fields
      streak_type: data.streak_type || streakType,
      period: data.period || period,
    };
  }
}

export default new LeaderboardService();
