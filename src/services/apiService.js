import config from "../config";

// Simple auth debug function - call this where auth issues occur
function debugAuth() {
  console.log("=== AUTH DEBUG ===");
  console.log(
    "localStorage token:",
    localStorage.getItem("uncrypt-token")?.substr(0, 10) + "...",
  );
  console.log(
    "sessionStorage token:",
    sessionStorage.getItem("uncrypt-token")?.substr(0, 10) + "...",
  );
  console.log("localStorage user_id:", localStorage.getItem("uncrypt-user-id"));
  console.log(
    "sessionStorage user_id:",
    sessionStorage.getItem("uncrypt-user-id"),
  );

  // Check if auth paths are consistent
  const hasToken = Boolean(
    localStorage.getItem("uncrypt-token") ||
      sessionStorage.getItem("uncrypt-token"),
  );
  const hasUserId = Boolean(
    localStorage.getItem("uncrypt-user-id") ||
      sessionStorage.getItem("uncrypt-user-id"),
  );
  console.log(
    "Token/UserID consistency:",
    hasToken === hasUserId ? "OK" : "MISMATCH",
  );
}
// Debug logging function
const logApiOperation = (
  method,
  endpoint,
  requestData = null,
  response = null,
  error = null,
) => {
  if (config.DEBUG) {
    const timestamp = new Date().toISOString();
    console.group(`🌐 API ${method} - ${endpoint} (${timestamp})`);
    console.log(`URL: ${config.apiUrl}${endpoint}`);

    // Log origin info for debugging cross-origin issues
    console.log("Current Origin:", window.location.origin);
    console.log("API Target Origin:", new URL(config.apiUrl).origin);

    if (requestData) {
      console.log("Request Data:", requestData);
    }

    if (response) {
      console.log("Response Status:", response.status);
      console.log("Response OK:", response.ok);
      if (response.headers) {
        console.log("Response Headers:", {
          "content-type": response.headers.get("content-type"),
          "x-session-id": response.headers.get("x-session-id"),
          "x-game-id": response.headers.get("x-game-id"),
        });
      }
    }

    if (error) {
      console.error("Error:", error);
      if (
        (error.message && error.message.includes("postMessage")) ||
        error.name === "SecurityError"
      ) {
        console.error("Cross-Origin Error Details:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      }
    }

    console.groupEnd();
  }
};

const apiService = {
  // Login functionality
  loginapi: async (credentials) => {
    console.log("Calling login API with credentials:", {
      username: credentials.username,
      password: credentials.password ? "[REDACTED]" : "missing",
    });

    try {
      const response = await fetch(`${config.apiUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include", // Include cookies for session-based auth
      });

      // Always get the response text even if it's not JSON
      const responseText = await response.text();

      // Try to parse as JSON, but handle non-JSON responses
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Non-JSON response from login API:", responseText);
        throw new Error("Invalid response format from server");
      }

      if (!response.ok) {
        throw new Error(
          data.error || `Login failed with status ${response.status}`,
        );
      }

      console.log("Login successful, received response:", {
        success: true,
        userId: data.user_id,
        username: data.username,
        hasToken: Boolean(data.token),
      });

      // Return a consistently structured response
      return {
        success: true,
        user_id: data.user_id,
        username: data.username,
        token: data.token,
        user: {
          id: data.user_id,
          username: data.username,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
      // Rethrow with consistent error format
      throw new Error(error.message || "Login failed");
    }
  },
  /**
   * Checks if the logged-in user has an active game and handles restoration
   * @param {string} token - The auth token from successful login
   * @returns {Promise<Object>} Result of the active game check and handling
   */
  checkAndHandleActiveGame: async (token) => {
    try {
      // Check if user has an active game
      const activeGameResponse = await fetch(
        `${config.apiUrl}/check_active_game`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...config.session.getHeaders(),
          },
          credentials: "include",
          mode: "cors",
        },
      );

      if (!activeGameResponse.ok) {
        console.warn(
          "Error checking for active game:",
          activeGameResponse.status,
        );
        return { handled: false };
      }

      const activeGameData = await activeGameResponse.json();

      // If there's an active game, ask user if they want to restore it
      if (activeGameData.has_active_game) {
        const percentComplete = activeGameData.progress_percentage || 0;
        const mistakes = activeGameData.mistakes || 0;

        const shouldRestore = window.confirm(
          `You have a game in progress (${percentComplete}% complete, ${mistakes} mistakes). ` +
            `Would you like to restore it?`,
        );

        if (shouldRestore) {
          // Return data about the active game so the caller can handle the restoration
          return {
            handled: true,
            restore: true,
            gameId: activeGameData.game_id,
            percentComplete,
            mistakes,
          };
        } else {
          // User chose not to restore - delete the active game
          await fetch(`${config.apiUrl}/completed`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              ...config.session.getHeaders(),
            },
            body: JSON.stringify({ game_id: activeGameData.game_id }),
            credentials: "include",
            mode: "cors",
          });

          return { handled: true, restore: false };
        }
      }

      // No active game found
      return { handled: false };
    } catch (error) {
      console.error("Error checking for active game:", error);
      return { handled: false, error: error.message };
    }
  },

  // Signup functionality
  signup: async (email, password) => {
    const endpoint = "/signup";

    try {
      const requestBody = {
        email,
        password,
      };

      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...config.session.getHeaders(),
      };

      logApiOperation("POST", endpoint, { email: email });

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      logApiOperation("POST", endpoint, { email: email }, response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`Signup failed with status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      const data = await response.json();
      return data;
    } catch (error) {
      logApiOperation("POST", endpoint, { email: email }, null, error);
      console.error("Error during signup:", error);
      throw error;
    }
  },

  // Function to check API health status
  checkHealth: async () => {
    const endpoint = "/health";
    try {
      logApiOperation("GET", endpoint);

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "GET",
        headers: {
          ...config.session.getHeaders(),
        },
        credentials: "include",
        mode: "cors",
      });

      logApiOperation("GET", endpoint, null, response);
      return response.ok;
    } catch (error) {
      logApiOperation("GET", endpoint, null, null, error);
      console.error("Health check failed:", error);
      return false;
    }
  },

  // Start Game function
  startGame: async (useLongQuotes = false) => {
    const endpoint = useLongQuotes ? "/longstart" : "/start";

    try {
      // Use minimal headers for public endpoints - don't include auth token
      // This is important because the /start endpoint doesn't require authentication
      const headers = {
        Accept: "application/json",
        // Only include basic content headers, not auth tokens
      };

      if (config.DEBUG) {
        console.log(
          `Starting new game (${useLongQuotes ? "long" : "standard"} quotes)`,
        );
        console.log(`Endpoint: ${config.apiUrl}${endpoint}`);
        console.log(`Headers:`, headers);
      }

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "GET",
        credentials: "include",
        mode: "cors",
        headers: headers,
      });

      if (config.DEBUG) {
        console.log(`Start game response status: ${response.status}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session info from headers if available
      config.session.saveSession(response.headers);

      const data = await response.json();

      if (config.DEBUG) {
        console.log("Game started successfully:", {
          encrypted_length: data.encrypted_paragraph?.length || 0,
          game_id: data.game_id || "None",
        });
      }

      // Save game ID to localStorage
      if (data.game_id) {
        localStorage.setItem("uncrypt-game-id", data.game_id);
      }

      return data;
    } catch (error) {
      console.error("Error starting game:", error);
      throw error;
    }
  },

  // Submit Guess function
  submitGuess: async (gameId, encryptedLetter, guessedLetter) => {
    const endpoint = "/guess";

    if (!encryptedLetter || !guessedLetter) {
      console.error("Missing required parameters for guess:", {
        encryptedLetter,
        guessedLetter,
      });
      return {
        error: "Missing parameters",
        display: "",
        mistakes: 0,
        correctly_guessed: [],
      };
    }

    try {
      // Prepare request body
      const requestBody = {
        encrypted_letter: encryptedLetter,
        guessed_letter: guessedLetter.toUpperCase(),
      };

      // Add game_id if available
      if (gameId) {
        requestBody.game_id = gameId;
      }

      // Log the request for debugging
      if (config.DEBUG) {
        console.log(`Submitting guess: ${encryptedLetter} → ${guessedLetter}`);
        console.log(`Request body:`, requestBody);
      }

      // Make the API request
      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // Check if the response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Guess API error: ${response.status}`, errorText);

        // Return error details
        return {
          error: `API error: ${response.status}`,
          display: "",
          mistakes: 0,
          correctly_guessed: [],
        };
      }

      // Parse the response
      const data = await response.json();

      if (config.DEBUG) {
        console.log("Guess response:", data);
      }

      // Ensure we have the expected data structure
      if (!data.display) {
        console.warn("Unexpected response format:", data);
        data.display = data.display || "";
        data.mistakes = data.mistakes || 0;
        data.correctly_guessed = data.correctly_guessed || [];
      }

      return data;
    } catch (error) {
      console.error("Error submitting guess:", error);

      // Return a safe default response
      return {
        error: error.message || "Failed to submit guess",
        display: "",
        mistakes: 0,
        correctly_guessed: [],
      };
    }
  },

  // Get Hint function
  getHint: async () => {
    const endpoint = "/hint";
    const gameId = localStorage.getItem("uncrypt-game-id");

    try {
      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      // Add game ID in header if available
      if (gameId) {
        headers["X-Game-Id"] = gameId;
      }

      console.log("Making hint request with headers:", headers);

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: headers,
        body: JSON.stringify({
          game_id: gameId, // Include game_id in the body too, for redundancy
        }),
      });

      console.log("Hint response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error in hint! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      const data = await response.json();
      console.log("Hint response data:", data);
      return data;
    } catch (error) {
      console.error("Error getting hint:", error);
      throw error;
    }
  },

  // Get Attribution function
  getAttribution: async () => {
    // Get game ID from localStorage
    const gameId = localStorage.getItem("uncrypt-game-id");

    // Construct URL with game_id as a query parameter if available
    const endpoint = gameId
      ? `/get_attribution?game_id=${encodeURIComponent(gameId)}`
      : "/get_attribution";

    try {
      const headers = {
        Accept: "application/json",
        ...config.session.getHeaders(),
      };

      logApiOperation("GET", endpoint, { headers });

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "GET",
        credentials: "include",
        mode: "cors",
        headers: headers,
      });

      logApiOperation("GET", endpoint, { gameId }, response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      const data = await response.json();
      return data;
    } catch (error) {
      logApiOperation("GET", endpoint, { gameId }, null, error);
      console.error("Error fetching attribution:", error);
      // Return a default value on error to avoid breaking the UI
      return {
        major_attribution: "",
        minor_attribution: "",
      };
    }
  },

  // Save Quote function
  saveQuote: async () => {
    const endpoint = "/save_quote";

    try {
      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...config.session.getHeaders(),
      };

      logApiOperation("POST", endpoint, { headers });

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: headers,
        body: JSON.stringify({}),
      });

      logApiOperation("POST", endpoint, {}, response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      const data = await response.json();
      return data;
    } catch (error) {
      logApiOperation("POST", endpoint, {}, null, error);
      console.error("Error saving quote:", error);
      throw error;
    }
  },

  // Get Leaderboard function
  getLeaderboard: async (period = "all-time", page = 1, per_page = 10) => {
    const endpoint = `/leaderboard?period=${period}&page=${page}&per_page=${per_page}`;

    try {
      const headers = {
        Accept: "application/json",
        ...config.session.getHeaders(),
      };

      logApiOperation("GET", endpoint, { headers });

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "GET",
        credentials: "include",
        mode: "cors",
        headers: headers,
      });

      logApiOperation("GET", endpoint, { period, page }, response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      // Parse the JSON response
      const data = await response.json();
      console.log("Raw leaderboard response:", data);

      // Transform the response to the expected format if needed
      // This makes our code work with both old and new API formats
      const transformedData = {
        // For entries, check all possible field names
        topEntries: data.topEntries || data.entries || [],

        // For user entry, either use the dedicated field or look for the user in entries
        currentUserEntry:
          data.currentUserEntry ||
          (data.entries &&
            data.entries.find((entry) => entry.is_current_user)) ||
          null,

        // For pagination, create a consistent format
        pagination: data.pagination || {
          current_page: data.page || page,
          total_pages: data.total_pages || 1,
          total_entries:
            data.total_users || (data.entries ? data.entries.length : 0),
        },
      };

      console.log("Transformed leaderboard data:", transformedData);
      return transformedData;
    } catch (error) {
      logApiOperation("GET", endpoint, { period, page }, null, error);
      console.error("Error fetching leaderboard:", error);
      // Return a safe default instead of throwing
      return {
        topEntries: [],
        currentUserEntry: null,
        pagination: { current_page: 1, total_pages: 1, total_entries: 0 },
      };
    }
  },

  // Get Streak Leaderboard function
  getStreakLeaderboard: async (
    streakType = "win",
    period = "current",
    page = 1,
    per_page = 10,
  ) => {
    const endpoint = `/streak_leaderboard?type=${streakType}&period=${period}&page=${page}&per_page=${per_page}`;

    try {
      // Get token for authorization
      const token = localStorage.getItem("uncrypt-token");
      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      // Add Authorization header if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      logApiOperation("GET", endpoint, { headers });

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "GET",
        credentials: "include",
        mode: "cors",
        headers: headers,
      });

      logApiOperation("GET", endpoint, {}, response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      if (config.session && config.session.saveSession) {
        config.session.saveSession(response.headers);
      }

      // Parse JSON and log for debugging
      const data = await response.json();
      console.log("Raw streak leaderboard response:", data);

      // Transform to a consistent format
      const transformedData = {
        // For entries, check all possible field names
        entries: data.entries || data.topEntries || [],

        // For user entry, either use the dedicated field or look for the user in entries
        currentUserEntry:
          data.currentUserEntry ||
          (data.entries &&
            data.entries.find((entry) => entry.is_current_user)) ||
          null,

        // For pagination, create a consistent format
        pagination: data.pagination || {
          current_page: data.page || page,
          total_pages: data.total_pages || 1,
          total_entries:
            data.total_users || (data.entries ? data.entries.length : 0),
        },

        // Keep other fields
        streak_type: data.streak_type || streakType,
        period: data.period || period,
      };

      console.log("Transformed streak data:", transformedData);
      return transformedData;
    } catch (error) {
      logApiOperation("GET", endpoint, {}, null, error);
      console.error("Error fetching streak leaderboard:", error);

      // Return a safe default instead of throwing
      return {
        entries: [],
        currentUserEntry: null,
        pagination: { current_page: 1, total_pages: 1, total_entries: 0 },
        streak_type: streakType,
        period: period,
      };
    }
  },

  // Get User Stats function
  getUserStats: async () => {
    const endpoint = "/user_stats";

    try {
      const headers = {
        Accept: "application/json",
        ...config.session.getHeaders(),
      };

      logApiOperation("GET", endpoint, { headers });

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "GET",
        credentials: "include",
        mode: "cors",
        headers: headers,
      });

      logApiOperation("GET", endpoint, {}, response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! Status: ${response.status}, Response:`,
          errorText,
        );
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      const data = await response.json();
      return data;
    } catch (error) {
      logApiOperation("GET", endpoint, {}, null, error);
      console.error("Error fetching user stats:", error);
      throw error;
    }
  },

  // Record Score function
  recordScore: async (scoreData) => {
    console.log("Recording score with data:", scoreData);
    // Debug auth state before API call
    debugAuth();
    // Get token explicitly to debug
    const token =
      localStorage.getItem("uncrypt-token") ||
      sessionStorage.getItem("uncrypt-token");
    console.log("Using token:", token ? "Yes" : "No");
    const endpoint = "/record_score";
    const gameId = localStorage.getItem("uncrypt-game-id");

    try {
      // Use standardized header approach with config helper
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      // Try to get token using the more reliable approach
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

      console.log("Recording score with data:", requestBody);

      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
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

          return {
            success: false,
            message: "Authentication required. Score saved locally.",
            authRequired: true,
          };
        }

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
      return data;
    } catch (error) {
      console.error("Error recording score:", error);

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
    }
  },
};

export default apiService;
