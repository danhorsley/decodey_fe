import config from "../config";

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
  // In apiService.js

  loginapi: async (credentials) => {
    console.log("credentials : ", credentials);
    try {
      const response = await fetch(`${config.apiUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user info in localStorage
        if (data.token) {
          localStorage.setItem("auth_token", data.token);
        }
        localStorage.setItem("user_id", data.user_id);
        localStorage.setItem("username", data.username);
        console.log("token : ", data.token);
        return {
          success: true,
          user: {
            id: data.user_id,
            username: data.username,
          },
          token: data.token,
        };
      } else {
        throw new Error(data.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
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

  // Fixed startGame function for apiService.js

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
  // Update these functions in your apiService.js

  // More robust submitGuess function
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

  // More robust getHint function
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

      const data = await response.json();

      // Transform the response to the new expected format if it's in the old format
      // This maintains backwards compatibility while we update the backend
      if (data.entries && !data.topEntries) {
        const transformedData = {
          topEntries: data.entries,
          currentUserEntry:
            data.entries.find((entry) => entry.is_current_user) || null,
          pagination: {
            current_page: data.page || page,
            total_pages: data.total_pages || 1,
            total_entries: data.total_users || data.entries.length,
          },
        };

        return transformedData;
      }

      return data;
    } catch (error) {
      logApiOperation("GET", endpoint, { period, page }, null, error);
      console.error("Error fetching leaderboard:", error);
      throw error;
    }
  },

  getStreakLeaderboard: async (
    streakType = "win",
    period = "current",
    page = 1,
    per_page = 10,
  ) => {
    const endpoint = `/streak_leaderboard?type=${streakType}&period=${period}&page=${page}&per_page=${per_page}`;

    try {
      // Use same auth headers setup as in getLeaderboard
      const token = localStorage.getItem("uncrypt-token");
      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      // Add Authorization header for token-based authentication (if available)
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

      const data = await response.json();

      // Transform the response to the new expected format if it's in the old format
      if (data.entries && !data.topEntries) {
        const transformedData = {
          entries: data.entries, // Keep original entries array name for streaks
          currentUserEntry:
            data.entries.find((entry) => entry.is_current_user) || null,
          pagination: {
            current_page: data.page || page,
            total_pages: data.total_pages || 1,
            total_entries: data.total_users || data.entries.length,
          },
        };

        return transformedData;
      }

      return data;
    } catch (error) {
      logApiOperation("GET", endpoint, {}, null, error);
      console.error("Error fetching streak leaderboard:", error);

      // Return structured error object
      return {
        error: "Failed to load streak leaderboard",
        message: error.message || "Unknown error occurred",
      };
    }
  },
  // Add this method to your existing apiService.js file

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
};
export default apiService;
