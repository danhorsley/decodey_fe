// src/services/enhancedApiService.js
import config from "../config";
import { logAuthDiagnostics, addAuthDiagnosticsHeaders } from "../utils/authDiagnostics";

// Create a diagnostic wrapper around the original apiService
const enhancedApiService = {
  // Wrapper around the apiService.getLeaderboard
  getLeaderboard: async (period = "all-time", page = 1, per_page = 10) => {
    console.group("🔍 Diagnostics: getLeaderboard");
    console.log("Parameters:", { period, page, per_page });

    // Run auth diagnostics before the call
    const preDiagnostics = logAuthDiagnostics();

    try {
      const endpoint = `/leaderboard?period=${period}&page=${page}&per_page=${per_page}`;
      console.log(`Fetching from: ${config.apiUrl}${endpoint}`);

      // Get standard headers with diagnostic additions
      const headers = addAuthDiagnosticsHeaders({
        Accept: "application/json",
        ...config.session.getHeaders(),
      });

      console.log("Request headers:", headers);

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "GET",
        credentials: "include",
        mode: "cors",
        headers: headers,
      });

      console.log("Response status:", response.status);
      console.log("Response OK:", response.ok);

      if (response.headers) {
        console.log("Response headers:", {
          "content-type": response.headers.get("content-type"),
          "x-session-id": response.headers.get("x-session-id"),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! Status: ${response.status}, Response:`, errorText);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Parse the JSON response
      const data = await response.json();
      console.log("Response data sample:", {
        topEntries: Array.isArray(data.topEntries) ? 
          `${data.topEntries.length} entries` : 
          (Array.isArray(data.entries) ? `${data.entries.length} entries` : 'No entries array'),
        hasCurrentUserEntry: Boolean(data.currentUserEntry),
        pagination: data.pagination
      });

      // Run auth diagnostics after successful call
      console.log("Auth state after successful call:");
      logAuthDiagnostics();

      return data;
    } catch (error) {
      console.error("Error fetching leaderboard:", error);

      // Log diagnostics on error
      console.log("Auth state after error:");
      logAuthDiagnostics();

      // On error, attempt to store score locally for later submission
      try {
        const pendingScores = JSON.parse(
          localStorage.getItem("uncrypt-pending-scores") || "[]",
        );
        pendingScores.push({
          ...scoreData,
          game_id: gameId || scoreData.game_id,
        });
        localStorage.setItem(
          "uncrypt-pending-scores",
          JSON.stringify(pendingScores),
        );

        return {
          success: false,
          message:
            "Failed to record score, but saved locally for later submission.",
          error: error.message,
        };
      } catch (storageError) {
        console.error("Failed to save score locally:", storageError);

        return {
          success: false,
          message: "Failed to record score and could not save locally.",
          error: error.message,
        };
      }
    } finally {
      console.groupEnd();
    }
  },

  // Add a diagnostic method to test authentication directly
  testAuthentication: async () => {
    console.group("🔍 Authentication Test");

    // Log all current auth state
    const authDiagnostics = logAuthDiagnostics();

    try {
      // Try to access a custom diagnostic endpoint if available
      const response = await fetch(`${config.apiUrl}/auth_diagnostic`, {
        method: "GET",
        credentials: "include",
        mode: "cors",
        headers: addAuthDiagnosticsHeaders({
          Accept: "application/json",
          ...config.session.getHeaders(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Auth diagnostic server response:", data);
        return { success: true, data };
      } else {
        // If no diagnostic endpoint, test with user_stats
        console.log("No auth diagnostic endpoint, testing with user_stats...");
        const statsResponse = await fetch(`${config.apiUrl}/user_stats`, {
          method: "GET",
          credentials: "include",
          mode: "cors",
          headers: addAuthDiagnosticsHeaders({
            Accept: "application/json",
            ...config.session.getHeaders(),
          }),
        });

        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          console.log("User stats response:", stats);
          return { 
            success: true, 
            authenticated: true,
            data: stats
          };
        } else if (statsResponse.status === 401) {
          return {
            success: true,
            authenticated: false,
            message: "Not authenticated"
          };
        } else {
          throw new Error(`Unexpected status: ${statsResponse.status}`);
        }
      }
    } catch (error) {
      console.error("Authentication test failed:", error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      console.groupEnd();
    }
  },

  // Add a method to retry login with current stored credentials
  refreshLogin: async () => {
    console.group("🔍 Refreshing Login");

    try {
      // Get user ID and token from storage
      const userId = 
        localStorage.getItem("uncrypt-user-id") || 
        localStorage.getItem("user_id");

      const token = 
        localStorage.getItem("uncrypt-token") || 
        sessionStorage.getItem("uncrypt-token") ||
        localStorage.getItem("auth_token");

      if (!userId || !token) {
        console.log("No stored credentials found for refresh");
        return { success: false, message: "No stored credentials" };
      }

      // Make a request to validate token with the server
      const response = await fetch(`${config.apiUrl}/validate-token`, {
        method: "GET",
        credentials: "include",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-User-ID": userId,
          ...addAuthDiagnosticsHeaders({})
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Token validation successful:", data);

        // Update storage with the freshest data
        if (data.user_id) {
          localStorage.setItem("uncrypt-user-id", data.user_id);
        }

        if (data.username) {
          localStorage.setItem("uncrypt-username", data.username);
        }

        return { 
          success: true,
          message: "Token validated successfully",
          user: {
            id: data.user_id || userId,
            username: data.username || "User"
          }
        };
      } else {
        console.log("Token validation failed:", response.status);
        return { 
          success: false, 
          message: "Token validation failed",
          status: response.status
        };
      }
    } catch (error) {
      console.error("Login refresh failed:", error);
      return { success: false, error: error.message };
    } finally {
      console.groupEnd();
    }
  }
};

export default enhancedApiService; diagnostics on error
      console.log("Auth state after error:");
      logAuthDiagnostics();

      // Return safe default to prevent app crashes
      return {
        topEntries: [],
        currentUserEntry: null,
        pagination: { current_page: 1, total_pages: 1, total_entries: 0 },
      };
    } finally {
      console.groupEnd();
    }
  },

  // Wrapper around apiService.getUserStats
  getUserStats: async () => {
    console.group("🔍 Diagnostics: getUserStats");

    // Run auth diagnostics before the call
    const preDiagnostics = logAuthDiagnostics();

    try {
      const endpoint = "/user_stats";
      console.log(`Fetching from: ${config.apiUrl}${endpoint}`);

      // Get headers with diagnostics
      const headers = addAuthDiagnosticsHeaders({
        Accept: "application/json",
        ...config.session.getHeaders(),
      });

      console.log("Request headers:", headers);

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "GET",
        credentials: "include",
        mode: "cors",
        headers: headers,
      });

      console.log("Response status:", response.status);
      console.log("Response OK:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! Status: ${response.status}, Response:`, errorText);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      // Analyze the response for debugging
      const dataFields = Object.keys(data);
      console.log("Response data fields:", dataFields);
      console.log("Has user_id:", Boolean(data.user_id));
      console.log("Has stats:", Boolean(data.current_streak !== undefined));

      // Run auth diagnostics after successful call
      console.log("Auth state after successful call:");
      logAuthDiagnostics();

      return data;
    } catch (error) {
      console.error("Error fetching user stats:", error);

      // Log diagnostics on error
      console.log("Auth state after error:");
      logAuthDiagnostics();

      throw error;
    } finally {
      console.groupEnd();
    }
  },

  // Wrapper around apiService.getStreakLeaderboard
  getStreakLeaderboard: async (
    streakType = "win",
    period = "current",
    page = 1,
    per_page = 10,
  ) => {
    console.group("🔍 Diagnostics: getStreakLeaderboard");
    console.log("Parameters:", { streakType, period, page, per_page });

    // Run auth diagnostics before the call
    const preDiagnostics = logAuthDiagnostics();

    try {
      const endpoint = `/streak_leaderboard?type=${streakType}&period=${period}&page=${page}&per_page=${per_page}`;
      console.log(`Fetching from: ${config.apiUrl}${endpoint}`);

      // Get headers with diagnostics
      const headers = addAuthDiagnosticsHeaders({
        Accept: "application/json",
        ...config.session.getHeaders(),
      });

      console.log("Request headers:", headers);

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "GET",
        credentials: "include",
        mode: "cors",
        headers: headers,
      });

      console.log("Response status:", response.status);
      console.log("Response OK:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! Status: ${response.status}, Response:`, errorText);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      // Analyze the response for debugging
      console.log("Response data sample:", {
        entries: Array.isArray(data.entries) ? 
          `${data.entries.length} entries` : 
          (Array.isArray(data.topEntries) ? `${data.topEntries.length} entries` : 'No entries array'),
        hasCurrentUserEntry: Boolean(data.currentUserEntry),
        pagination: data.pagination
      });

      if (data.currentUserEntry) {
        console.log("Current user entry:", data.currentUserEntry);
      }

      // Run auth diagnostics after successful call
      console.log("Auth state after successful call:");
      logAuthDiagnostics();

      return data;
    } catch (error) {
      console.error("Error fetching streak leaderboard:", error);

      // Log diagnostics on error
      console.log("Auth state after error:");
      logAuthDiagnostics();

      // Return safe defaults
      return {
        entries: [],
        currentUserEntry: null,
        pagination: { current_page: 1, total_pages: 1, total_entries: 0 },
        streak_type: streakType,
        period: period,
      };
    } finally {
      console.groupEnd();
    }
  },

  // Wrapper around apiService.recordScore
  recordScore: async (scoreData) => {
    console.group("🔍 Diagnostics: recordScore");
    console.log("Score data:", scoreData);

    // Run auth diagnostics before the call
    const preDiagnostics = logAuthDiagnostics();

    try {
      const endpoint = "/record_score";
      const gameId = localStorage.getItem("uncrypt-game-id");

      // Use standardized header approach with diagnostics
      const headers = addAuthDiagnosticsHeaders({
        "Content-Type": "application/json",
        Accept: "application/json",
      });

      // Try to get token using more reliable approach
      const token =
        localStorage.getItem("uncrypt-token") ||
        sessionStorage.getItem("uncrypt-token") ||
        localStorage.getItem("auth_token");

      // Add Authorization header if token exists
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Add game ID to headers if available
      if (gameId) {
        headers["X-Game-Id"] = gameId;
      }

      // Prepare request body
      const requestBody = {
        ...scoreData,
        game_id: gameId || scoreData.game_id,
      };

      console.log("Recording score with URL:", `${config.apiUrl}${endpoint}`);
      console.log("Headers:", headers);
      console.log("Request body:", requestBody);

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);
      console.log("Response OK:", response.ok);

      // Special handling for 401 Unauthorized
      if (response.status === 401) {
        console.log("Authentication required to record score");

        // If not authenticated, store score locally
        const pendingScores = JSON.parse(
          localStorage.getItem("uncrypt-pending-scores") || "[]",
        );
        pendingScores.push(requestBody);
        localStorage.setItem(
          "uncrypt-pending-scores",
          JSON.stringify(pendingScores),
        );

        // Log diagnostics after handling unauthorized
        console.log("Auth state after 401 response:");
        logAuthDiagnostics();

        return {
          success: false,
          message: "Authentication required. Score saved locally.",
          authRequired: true,
        };
      }

      if (!response.ok) {
        // Handle other errors
        const errorText = await response.text();
        console.error(
          `Score recording error: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`Failed to record score. Status: ${response.status}`);
      }

      // Parse and return response
      const data = await response.json();
      console.log("Score recording response:", data);

      // Run auth diagnostics after successful call
      console.log("Auth state after successful call:");
      logAuthDiagnostics();

      return data;
    } catch (error) {
      console.error("Error recording score:", error);

  