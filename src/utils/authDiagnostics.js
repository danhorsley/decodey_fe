// src/utils/authDiagnostics.js
/**
 * Authentication Diagnostics Utility
 *
 * This utility helps diagnose authentication issues by inspecting
 * all auth-related data and providing detailed reports.
 */

/**
 * Inspects all authentication-related storage and state
 * @param {Object} authState - Current auth state from context (optional)
 * @return {Object} Diagnostic information
 */
export const inspectAuthState = (authState = null) => {
  // Results container
  const diagnostics = {
    storageItems: {},
    tokens: {},
    sessionData: {},
    authState: authState || "Not provided",
    inconsistencies: [],
    timestamp: new Date().toISOString(),
  };

  // Collect all auth-related items from localStorage
  const localStorageKeys = [
    "uncrypt-token",
    "uncrypt-user-id",
    "uncrypt-username",
    "uncrypt-session-id",
    "uncrypt-remember-me",
    // Legacy keys
    "auth_token",
    "user_id",
    "username",
  ];

  // Check localStorage
  diagnostics.storageItems.localStorage = {};
  localStorageKeys.forEach((key) => {
    const value = localStorage.getItem(key);
    diagnostics.storageItems.localStorage[key] = value
      ? key.includes("token")
        ? `${value.substring(0, 10)}...`
        : value
      : null;
  });

  // Check sessionStorage
  diagnostics.storageItems.sessionStorage = {};
  localStorageKeys.forEach((key) => {
    const value = sessionStorage.getItem(key);
    diagnostics.storageItems.sessionStorage[key] = value
      ? key.includes("token")
        ? `${value.substring(0, 10)}...`
        : value
      : null;
  });

  // Analyze token format if available
  const token =
    localStorage.getItem("uncrypt-token") ||
    sessionStorage.getItem("uncrypt-token") ||
    localStorage.getItem("auth_token");

  if (token) {
    try {
      // Parse JWT-like token (payload.signature)
      const parts = token.split(".");

      if (parts.length >= 2) {
        // It's a JWT-like token
        diagnostics.tokens.format = "JWT-like";
        diagnostics.tokens.parts = parts.length;

        try {
          // Try to decode the payload if it's base64
          const payloadStr = atob(parts[0]);
          const payload = JSON.parse(payloadStr);
          diagnostics.tokens.payload = {
            user_id: payload.user_id,
            username: payload.username,
            exp: payload.exp,
            expiration: payload.exp
              ? new Date(payload.exp * 1000).toISOString()
              : null,
            isExpired: payload.exp ? payload.exp * 1000 < Date.now() : null,
          };
        } catch (e) {
          diagnostics.tokens.payloadError = e.message;
        }
      } else {
        diagnostics.tokens.format = "Unknown";
      }
    } catch (e) {
      diagnostics.tokens.error = e.message;
    }
  } else {
    diagnostics.tokens.available = false;
  }

  // Look for inconsistencies
  // 1. Check if user IDs are different between storage mechanisms
  const localUserId =
    localStorage.getItem("uncrypt-user-id") || localStorage.getItem("user_id");
  const sessionUserId = sessionStorage.getItem("uncrypt-user-id");

  if (localUserId && sessionUserId && localUserId !== sessionUserId) {
    diagnostics.inconsistencies.push({
      type: "user_id_mismatch",
      localStorage: localUserId,
      sessionStorage: sessionUserId,
    });
  }

  // 2. Check token vs stored user ID consistency
  if (diagnostics.tokens.payload && localUserId) {
    if (diagnostics.tokens.payload.user_id !== localUserId) {
      diagnostics.inconsistencies.push({
        type: "token_userid_mismatch",
        tokenUserId: diagnostics.tokens.payload.user_id,
        storedUserId: localUserId,
      });
    }
  }

  // 3. Check auth state consistency with stored data
  if (authState) {
    if (authState.user && authState.user.id) {
      if (localUserId && authState.user.id !== localUserId) {
        diagnostics.inconsistencies.push({
          type: "authstate_userid_mismatch",
          authStateUserId: authState.user.id,
          storedUserId: localUserId,
        });
      }
    }

    // Check if auth state says authenticated but no token exists
    if (authState.isAuthenticated && !token) {
      diagnostics.inconsistencies.push({
        type: "auth_without_token",
        authState: authState.isAuthenticated,
      });
    }

    // Or if token exists but auth state says not authenticated
    if (!authState.isAuthenticated && token) {
      diagnostics.inconsistencies.push({
        type: "token_without_auth",
        hasToken: Boolean(token),
      });
    }
  }

  return diagnostics;
};

/**
 * Logs detailed authentication diagnostics
 * @param {Object} authState - Current auth state from context (optional)
 */
export const logAuthDiagnostics = (authState = null) => {
  const diagnostics = inspectAuthState(authState);

  console.group("🔍 Authentication Diagnostics");
  console.log("Timestamp:", diagnostics.timestamp);

  console.group("📦 Storage Items");
  console.log("LocalStorage:", diagnostics.storageItems.localStorage);
  console.log("SessionStorage:", diagnostics.storageItems.sessionStorage);
  console.groupEnd();

  console.group("🔑 Token Analysis");
  console.log("Token data:", diagnostics.tokens);
  console.groupEnd();

  console.group("⚠️ Inconsistencies");
  if (diagnostics.inconsistencies.length > 0) {
    diagnostics.inconsistencies.forEach((issue, index) => {
      console.log(`Issue ${index + 1}:`, issue);
    });
  } else {
    console.log("No inconsistencies detected");
  }
  console.groupEnd();

  console.group("🔐 Auth State");
  console.log("Current Auth State:", diagnostics.authState);
  console.groupEnd();

  console.groupEnd();

  return diagnostics;
};

/**
 * Adds auth diagnostics headers to fetch requests for debugging
 * @param {Object} headers - The headers object to modify
 * @returns {Object} Updated headers
 */
export const addAuthDiagnosticsHeaders = (headers = {}) => {
  const newHeaders = { ...headers };

  // Add user ID from all possible sources for debugging
  const localUserId =
    localStorage.getItem("uncrypt-user-id") || localStorage.getItem("user_id");
  const sessionUserId = sessionStorage.getItem("uncrypt-user-id");

  if (localUserId) {
    newHeaders["X-Debug-Local-User-ID"] = localUserId;
  }

  if (sessionUserId) {
    newHeaders["X-Debug-Session-User-ID"] = sessionUserId;
  }

  // Add token source info for debugging
  if (localStorage.getItem("uncrypt-token")) {
    newHeaders["X-Debug-Token-Source"] = "localStorage-new";
  } else if (sessionStorage.getItem("uncrypt-token")) {
    newHeaders["X-Debug-Token-Source"] = "sessionStorage-new";
  } else if (localStorage.getItem("auth_token")) {
    newHeaders["X-Debug-Token-Source"] = "localStorage-legacy";
  }

  return newHeaders;
};

export default {
  inspectAuthState,
  logAuthDiagnostics,
  addAuthDiagnosticsHeaders,
};
