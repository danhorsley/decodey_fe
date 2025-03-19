// src/App.js
import React, { useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

// Import ModalManager
import ModalManager from "./components/modals/ModalManager";
import AccountButtonWrapper from "./components/AccountButtonWrapper";
import NotFound from "./pages/NotFound";

// Lazy load components for code splitting
const Game = lazy(() => import("./pages/Game"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Privacy = lazy(() => import("./pages/Privacy"));

// Simple loading component
const Loading = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      fontFamily: "Courier New, Courier, monospace",
    }}
  >
    Loading...
  </div>
);

// Create a wrapper component that conditionally renders the AccountButtonWrapper
function GlobalUIElements() {
  const location = useLocation();
  // Don't render the account button on the leaderboard page
  const isLeaderboardPage = location.pathname === "/leaderboard";

  return !isLeaderboardPage ? <AccountButtonWrapper /> : null;
}

// Main App component using Router
function App() {
  // No need to initialize any stores manually
  // The game session manager is used by the components that need it
  // and it initializes itself on first use

  return (
    <Router>
      {/* ModalManager wraps everything to provide modal functionality */}
      <ModalManager>
        {/* Main content routes with Suspense for code splitting */}
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Game />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        {/* Global fixed UI elements with conditional rendering */}
        <GlobalUIElements />
      </ModalManager>
    </Router>
  );
}

export default App;
