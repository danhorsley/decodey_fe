// src/tests/authTest.js - For manual testing/verification of auth flow
// This can be temporarily imported into a component to test the auth system

import { useAuth } from "../context/AuthContext";
import config from "../config";

// Component to test auth functionality
const AuthTest = () => {
  const { user, isAuthenticated, authLoading, login, logout } = useAuth();

  const testLogin = async () => {
    console.group("Auth System Test - Login");
    console.log("Initial state:", { isAuthenticated, user });

    // Verify storage is empty before login
    console.log("Storage before login:");
    console.log(
      "localStorage token:",
      localStorage.getItem(config.AUTH_KEYS.TOKEN),
    );
    console.log(
      "sessionStorage token:",
      sessionStorage.getItem(config.AUTH_KEYS.TOKEN),
    );

    // Test login with remember me
    const result = await login({
      username: "danielhorsley@mac.com",
      password: "test123!",
      rememberMe: true,
    });

    console.log("Login result:", result);
    console.log("Auth state after login:", { isAuthenticated, user });

    // Verify storage after login
    console.log("Storage after login (should be in localStorage):");
    console.log(
      "localStorage token:",
      localStorage.getItem(config.AUTH_KEYS.TOKEN),
    );
    console.log(
      "sessionStorage token:",
      sessionStorage.getItem(config.AUTH_KEYS.TOKEN),
    );

    console.groupEnd();
  };

  const testLoginWithoutRemember = async () => {
    console.group("Auth System Test - Login without Remember Me");

    // Test login without remember me
    const result = await login({
      username: "danielhorsley@me.com",
      password: "test123!",
      rememberMe: false,
    });

    console.log("Login result:", result);
    console.log("Auth state after login:", { isAuthenticated, user });

    // Verify storage after login
    console.log("Storage after login (should be in sessionStorage):");
    console.log(
      "localStorage token:",
      localStorage.getItem(config.AUTH_KEYS.TOKEN),
    );
    console.log(
      "sessionStorage token:",
      sessionStorage.getItem(config.AUTH_KEYS.TOKEN),
    );

    console.groupEnd();
  };

  const testLogout = () => {
    console.group("Auth System Test - Logout");
    console.log("State before logout:", { isAuthenticated, user });

    // Verify storage before logout
    console.log("Storage before logout:");
    console.log(
      "localStorage token:",
      localStorage.getItem(config.AUTH_KEYS.TOKEN),
    );
    console.log(
      "sessionStorage token:",
      sessionStorage.getItem(config.AUTH_KEYS.TOKEN),
    );

    // Test logout
    logout();

    console.log("Auth state after logout:", { isAuthenticated, user });

    // Verify storage after logout
    console.log("Storage after logout (both should be empty):");
    console.log(
      "localStorage token:",
      localStorage.getItem(config.AUTH_KEYS.TOKEN),
    );
    console.log(
      "sessionStorage token:",
      sessionStorage.getItem(config.AUTH_KEYS.TOKEN),
    );

    console.groupEnd();
  };

  const testStorage = () => {
    console.group("Auth System Test - Storage Helper Functions");

    // Test helper functions
    console.log("Auth Token:", config.session.getAuthToken());
    console.log("User ID:", config.session.getAuthUserId());
    console.log(
      "Storage Type:",
      config.session.getStorage() === localStorage
        ? "localStorage"
        : "sessionStorage",
    );

    // Test headers
    console.log(
      "Public Headers:",
      config.session.getHeaders({ publicEndpoint: true }),
    );
    console.log("Auth Headers:", config.session.getHeaders());

    console.groupEnd();
  };

  // Return a simple UI for testing
  return (
    <div style={{ padding: 20, border: "1px solid #ccc", margin: 10 }}>
      <h3>Auth System Test</h3>
      <p>Authenticated: {isAuthenticated ? "Yes" : "No"}</p>
      <p>Loading: {authLoading ? "Yes" : "No"}</p>
      <p>User: {user ? `${user.username} (${user.id})` : "Not logged in"}</p>

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button onClick={testLogin}>Test Login (Remember)</button>
        <button onClick={testLoginWithoutRemember}>
          Test Login (No Remember)
        </button>
        <button onClick={testLogout}>Test Logout</button>
        <button onClick={testStorage}>Test Storage Helpers</button>
      </div>
    </div>
  );
};

export default AuthTest;

/* 
   To use this test component:

   1. Import it in a component:
      import AuthTest from './tests/authTest';

   2. Add it to your component's JSX:
      <AuthTest />

   3. Use the buttons to test different aspects of the auth system

   4. Check the console for detailed logs

   Note: This is for development/testing only and should be removed in production
*/
