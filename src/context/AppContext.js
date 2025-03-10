import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import useDeviceDetection from "../hooks/useDeviceDetection";
import config from "../config";
import apiService from "../services/apiService";

// Create context
const AppContext = createContext();

// Default settings
const defaultSettings = {
  theme: "light",
  difficulty: "easy",
  longText: false,
  speedMode: true, // Always on - cannot be changed
  gridSorting: "default",
  hardcoreMode: false,
  mobileMode: "auto",
  textColor: "default",
};

// Default user state
const defaultUserState = {
  user: null,
  isAuthenticated: false,
  authLoading: true,
  token: localStorage.getItem("auth_token") || null, // Add this line
  authError: null,
};

// Get max mistakes based on difficulty
export const getMaxMistakes = (difficulty) => {
  switch (difficulty) {
    case "easy":
      return 8;
    case "hard":
      return 3;
    case "normal":
    default:
      return 5;
  }
};

// Provider component
export const AppProvider = ({ children }) => {
  // ==== SETTINGS STATE ====
  // Initialize state from localStorage or defaults
  const [settings, setSettings] = useState(() => {
    try {
      const savedSettings = localStorage.getItem("uncrypt-settings");
      return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
    } catch (error) {
      console.error("Error loading settings from localStorage:", error);
      return defaultSettings;
    }
  });

  // ==== AUTH STATE ====
  const [authState, setAuthState] = useState(defaultUserState);
  const closeLogin = useCallback(() => {
    setIsLoginOpen(false);
  }, []);

  // ==== UI STATE ====
  const [currentView, setCurrentView] = useState("game"); // 'game', 'settings', 'login', etc.
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Add this effect to log any changes to authState
  useEffect(() => {
    console.log(
      "%c Auth State Changed:",
      "background: #4cc9f0; color: white; padding: 2px 6px; border-radius: 2px;",
      {
        authState,
        timestamp: new Date().toLocaleTimeString(),
      },
    );
  }, [authState]);

  // submit pending scores to be on login
  useEffect(() => {
    // Whenever auth state changes to authenticated
    if (authState.isAuthenticated) {
      const submitPendingScores = async () => {
        const pendingScores = JSON.parse(
          localStorage.getItem("uncrypt-pending-scores") || "[]",
        );

        if (pendingScores.length > 0) {
          console.log(
            `Found ${pendingScores.length} pending scores to submit after auth change`,
          );

          for (const scoreData of pendingScores) {
            try {
              await apiService.recordScore(scoreData);
              console.log("Pending score submitted successfully");
            } catch (err) {
              console.error("Error submitting pending score:", err);
            }
          }

          // Clear pending scores after submitting
          localStorage.removeItem("uncrypt-pending-scores");
        }
      };

      submitPendingScores();
    }
  }, [authState.isAuthenticated]);

  // ==== DEVICE DETECTION ====
  const { isMobile, isLandscape, screenWidth, screenHeight, detectMobile } =
    useDeviceDetection();

  // Track whether we should use mobile mode
  const [useMobileMode, setUseMobileMode] = useState(false);

  // ==== AUTH METHODS ====
  // Initialize auth state from token if exists
  useEffect(() => {
    const initAuth = async () => {
      console.log("Initializing auth state...");

      // First check localStorage for token (for persistent sessions)
      let token =
        localStorage.getItem("uncrypt-token") ||
        localStorage.getItem("auth_token");
      let userId =
        localStorage.getItem("uncrypt-user-id") ||
        localStorage.getItem("user_id");
      let username =
        localStorage.getItem("uncrypt-username") ||
        localStorage.getItem("username");

      // If not in localStorage, check sessionStorage (for session-only logins)
      if (!token) {
        token = sessionStorage.getItem("uncrypt-token");
        userId = sessionStorage.getItem("uncrypt-user-id");
        username = sessionStorage.getItem("uncrypt-username");
      }

      if (!token || !userId) {
        console.log("No token or user ID found in storage");
        setAuthState({
          ...defaultUserState,
          authLoading: false,
        });
        return;
      }

      // Log what we found for debugging
      console.log("Found stored authentication:", {
        tokenSource: localStorage.getItem("uncrypt-token")
          ? "localStorage (new format)"
          : localStorage.getItem("auth_token")
            ? "localStorage (old format)"
            : "sessionStorage",
        userId: userId,
        username: username || "(unknown)",
      });

      try {
        // First try the explicit token validation endpoint
        let validationSuccess = false;

        try {
          const response = await fetch(`${config.apiUrl}/validate-token`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const userData = await response.json();
            console.log("Token validation successful:", userData);

            // Update auth state with validated user data
            setAuthState({
              user: {
                id: userData.user_id || userId,
                username: userData.username || username,
              },
              isAuthenticated: true,
              authLoading: false,
              token: token,
              authError: null,
            });
            validationSuccess = true;
          }
        } catch (error) {
          console.warn(
            "Token validation endpoint failed, will try alternative method:",
            error,
          );
        }

        // If endpoint validation failed, assume token is valid if it exists
        // This is a fallback for backends that don't support the validation endpoint
        if (!validationSuccess && token && userId) {
          console.log("Using fallback authentication with existing token");
          setAuthState({
            user: {
              id: userId,
              username: username || "User",
            },
            isAuthenticated: true,
            authLoading: false,
            token: token,
            authError: null,
          });

          // Ensure consistency across storage mechanisms
          localStorage.setItem("auth_token", token);
          localStorage.setItem("user_id", userId);
          if (username) localStorage.setItem("username", username);

          localStorage.setItem("uncrypt-token", token);
          localStorage.setItem("uncrypt-user-id", userId);
          if (username) localStorage.setItem("uncrypt-username", username);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setAuthState({
          ...defaultUserState,
          authLoading: false,
          authError: "Failed to validate authentication state",
        });
      }
    };

    initAuth();
  }, []);
  // Login method
  const login = useCallback(
    async (credentials) => {
      console.log("appcntx check : ", credentials);
      setAuthState((prev) => ({ ...prev, authLoading: true, authError: null }));

      try {
        // Extract remember me preference
        const { rememberMe, ...loginCredentials } = credentials;

        // Use apiService instead of direct fetch
        const data = await apiService.loginapi(loginCredentials);

        // If we received a token, save it
        if (data.token) {
          // Choose storage method based on rememberMe preference
          const storage = rememberMe ? localStorage : sessionStorage;

          // Store authentication data in new format
          storage.setItem("uncrypt-token", data.token);
          storage.setItem("uncrypt-user-id", data.user_id);
          storage.setItem(
            "uncrypt-username",
            data.username || credentials.username,
          );

          // IMPORTANT: For backward compatibility, also store in original format
          localStorage.setItem("auth_token", data.token);
          localStorage.setItem("user_id", data.user_id);
          localStorage.setItem(
            "username",
            data.username || credentials.username,
          );

          // Always remember user preference
          localStorage.setItem("uncrypt-remember-me", rememberMe);

          // Close login modal after successful login
          closeLogin();
        }

        // Update auth state
        setAuthState({
          user: data.user || {
            username: credentials.username,
            id: data.user_id,
          },
          isAuthenticated: true,
          authLoading: false,
          authError: null,
        });

        // Log successful authentication
        console.log("Authentication state updated:", {
          username: credentials.username,
          authenticated: true,
          token: data.token ? "[REDACTED]" : "None",
        });

        return { success: true };
      } catch (error) {
        console.error("Login error:", error);

        setAuthState((prev) => ({
          ...prev,
          authLoading: false,
          authError: error.message || "Login failed",
        }));

        return {
          success: false,
          error: error.message || "Login failed",
        };
      }
    },
    [closeLogin],
  );

  // On component mount, check for existing token in both storage types
  useEffect(() => {
    // First check new format keys in localStorage
    let token = localStorage.getItem("uncrypt-token");
    let userId = localStorage.getItem("uncrypt-user-id");
    let username = localStorage.getItem("uncrypt-username");

    // If not found, check old format keys in localStorage
    if (!token) {
      token = localStorage.getItem("auth_token");
      userId = localStorage.getItem("user_id");
      username = localStorage.getItem("username");
    }

    // If still not found, check sessionStorage
    if (!token) {
      token = sessionStorage.getItem("uncrypt-token");
      userId = sessionStorage.getItem("uncrypt-user-id");
      username = sessionStorage.getItem("uncrypt-username");
    }

    if (token && userId) {
      // If token exists, set authenticated state
      setAuthState({
        user: { id: userId, username: username },
        isAuthenticated: true,
        token: token,
        loading: false,
      });

      // For backward compatibility, ensure tokens exist in both formats
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_id", userId);
      if (username) localStorage.setItem("username", username);
    } else {
      // No token found, mark as not authenticated
      setAuthState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // Logout method
  const logout = () => {
    // Clear tokens from both storage types
    localStorage.removeItem("uncrypt-token");
    localStorage.removeItem("uncrypt-user-id");
    localStorage.removeItem("uncrypt-username");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");

    sessionStorage.removeItem("uncrypt-token");
    sessionStorage.removeItem("uncrypt-user-id");
    sessionStorage.removeItem("uncrypt-username");

    // Don't remove the remember preference

    // Update auth state
    setAuthState({
      user: null,
      isAuthenticated: false,
      authLoading: false,
      authError: null,
    });

    // Call backend logout endpoint if needed
    fetch(`${config.apiUrl}/logout`, {
      method: "POST",
      credentials: "include",
    }).catch((err) => console.error("Logout error:", err));
  };

  const [leaderboardData, setLeaderboardData] = useState({
    entries: [],
    loading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
  });

  // Add this function to handle fetching leaderboard data
  const fetchLeaderboard = useCallback(async (page = 1, limit = 10) => {
    setLeaderboardData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiService.getLeaderboard(page, limit);

      setLeaderboardData({
        entries: data.scores || [],
        loading: false,
        error: null,
        currentPage: page,
        totalPages: data.totalPages || 1,
      });

      return data;
    } catch (error) {
      console.error("Error fetching leaderboard:", error);

      setLeaderboardData((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load leaderboard data",
      }));

      return null;
    }
  }, []);

  // ==== SETTINGS METHODS ====
  // Update settings
  const updateSettings = useCallback((newSettings) => {
    // Always ensure textColor matches theme
    const updatedSettings = {
      ...newSettings,
      textColor: newSettings.theme === "dark" ? "scifi-blue" : "default",
      speedMode: true, // Always ensure speed mode is on
    };
    setSettings(updatedSettings);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("uncrypt-settings", JSON.stringify(settings));
  }, [settings]);

  // ==== MOBILE MODE EFFECTS ====
  // Determine if we should use mobile mode based on settings and device
  useEffect(() => {
    if (settings.mobileMode === "always") {
      setUseMobileMode(true);
    } else if (settings.mobileMode === "never") {
      setUseMobileMode(false);
    } else {
      // Auto mode - use device detection
      setUseMobileMode(isMobile);
    }
  }, [settings.mobileMode, isMobile]);

  // Re-check device when window resizes
  useEffect(() => {
    const handleResize = () => {
      detectMobile();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [detectMobile]);

  // ==== THEME EFFECTS ====
  // Apply theme whenever settings change
  useEffect(() => {
    try {
      // Use a forced timeout to ensure theme is applied on all browsers
      setTimeout(() => {
        if (settings.theme === "dark") {
          document.documentElement.classList.add("dark-theme");
          document.body.classList.add("dark-theme");
          document.documentElement.setAttribute("data-theme", "dark");

          // Force mobile browser compatibility
          if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            document.documentElement.style.backgroundColor = "#222";
            document.body.style.backgroundColor = "#222";
            document.body.style.color = "#f8f9fa";
          }
        } else {
          document.documentElement.classList.remove("dark-theme");
          document.body.classList.remove("dark-theme");
          document.documentElement.setAttribute("data-theme", "light");

          // Force mobile browser compatibility
          if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            document.documentElement.style.backgroundColor = "#ffffff";
            document.body.style.backgroundColor = "#ffffff";
            document.body.style.color = "#212529";
          }
        }
      }, 100);
    } catch (e) {
      console.error("Error applying theme:", e);
    }
  }, [settings.theme]);

  // ==== VIEW METHODS ====
  // Navigate to settings view
  const showSettings = useCallback(() => {
    setCurrentView("settings");
  }, []);

  // Navigate to game view
  const showGame = useCallback(() => {
    setCurrentView("game");
  }, []);

  const showLogin = useCallback(() => {
    setCurrentView("login");
  }, []);

  const showRegister = useCallback(() => {
    setCurrentView("register");
  }, []);

  const openAbout = useCallback(() => {
    setIsAboutOpen(true);
  }, []);

  const closeAbout = useCallback(() => {
    setIsAboutOpen(false);
  }, []);

  const openLogin = useCallback(() => {
    console.log("openLogin called, setting isLoginOpen to true");
    setIsLoginOpen(true);
  }, []);

  const openSignup = useCallback(() => {
    setIsLoginOpen(false); // Close login when opening signup
    setIsSignupOpen(true);
    // Log for debugging
    console.log("Opening signup modal", {
      isLoginOpen: false,
      isSignupOpen: true,
    });
  }, []);

  const closeSignup = useCallback(() => {
    setIsSignupOpen(false);
  }, []);

  // ==== CONTEXT VALUE ====
  // Organize context value into logical sections
  const contextValue = {
    // Settings
    settings,
    updateSettings,
    maxMistakes: getMaxMistakes(settings.difficulty),

    // Auth
    ...authState, // Spread auth state (user, isAuthenticated, authLoading, authError)
    login,
    logout,

    // View state
    currentView,
    showSettings,
    showGame,
    showLogin,
    showRegister,
    isAboutOpen,
    openAbout,
    closeAbout,
    isLoginOpen,
    openLogin,
    closeLogin,
    isSignupOpen,
    openSignup,
    closeSignup,
    isSettingsOpen,
    openSettings: useCallback(() => setIsSettingsOpen(true), []),
    closeSettings: useCallback(() => setIsSettingsOpen(false), []),
    // Device/Mobile state
    isMobile,
    isLandscape,
    screenWidth,
    screenHeight,
    useMobileMode,
    leaderboardData,
    fetchLeaderboard,
    // token,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

// Custom hook for using the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

export default AppContext;
