// src/App.js
import React, { useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
// Import stores if needed for initialization
// import useUIStore from "./stores/uiStore";
// import useSettingsStore from "./stores/settingsStore";

// Import ModalManager
import ModalManager from "./components/modals/ModalManager";
import AccountButtonWrapper from "./components/AccountButtonWrapper";
import ServiceWorkerUpdater from "./components/ServiceWorkerUpdater";
import OfflineDetector from "./components/OfflineDetector";
import ErrorBoundary from "./components/ErrorBoundary";
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
  // You can initialize stores here if needed
  // const initializeUI = useUIStore(state => state.initialize);
  // useEffect(() => {
  //   initializeUI();
  // }, [initializeUI]);

  return (
    <Router>
      {/* ModalManager wraps everything to provide modal functionality */}
      <ModalManager>
        {/* Main content routes with Suspense for code splitting */}
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route
              path="/"
              element={
                <ErrorBoundary
                  fallback={
                    <button onClick={() => window.location.reload()}>
                      Reload Game
                    </button>
                  }
                >
                  <Game />
                </ErrorBoundary>
              }
            />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        {/* Global fixed UI elements with conditional rendering */}
        <GlobalUIElements />

        {/* Service worker update notification */}
        <ServiceWorkerUpdater />

        {/* Offline detection notification */}
        <OfflineDetector />
      </ModalManager>
    </Router>
  );
}

export default App;
