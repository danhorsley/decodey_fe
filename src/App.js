// src/App.js
import React, { useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import "./Styles/App.css";
import "./Styles/Mobile.css";
import scoreService from "./services/scoreService";
import { useAuth } from "./context/AuthContext";
import { isOnline } from "./utils/networkUtils";
import ModalManager from "./components/modals/ModalManager";
import AccountButtonWrapper from "./components/AccountButtonWrapper";
import ServiceWorkerUpdater from "./components/ServiceWorkerUpdater";
import OfflineDetector from "./components/OfflineDetector";

// Lazy load components for code splitting
const Game = lazy(() => import("./pages/Game"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Privacy = lazy(() => import("./pages/Privacy"));
const WinCelebrationTest = lazy(() => import("./pages/WinCelebrationTest"));

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

  // Get auth state
  const { isAuthenticated } = useAuth();

  // Check for pending scores and try to submit them
  useEffect(() => {
    const checkPendingScores = async () => {
      // Get count of pending scores
      const pendingCount = scoreService.getPendingCount();

      if (pendingCount > 0 && isOnline() && isAuthenticated) {
        console.log(
          `App loaded with ${pendingCount} pending scores. Attempting to submit...`,
        );

        try {
          const result =
            await scoreService.submitPendingScores(isAuthenticated);

          if (result.submitted > 0) {
            // Show a toast notification
            console.log(
              `Successfully submitted ${result.submitted} pending scores.`,
            );

            // Could add a toast notification library here
            // For simplicity, we'll just log to console for now
          }
        } catch (error) {
          console.error("Error submitting pending scores on app load:", error);
        }
      }
    };

    // Run once when component mounts
    checkPendingScores();
  }, [isAuthenticated]);

  return !isLeaderboardPage ? <AccountButtonWrapper /> : null;
}

// Main App component using Router
function App() {
  return (
    <Router>
      <ModalManager>
        {/* Main content routes with Suspense for code splitting */}
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Game />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/wctest" element={<WinCelebrationTest />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<Navigate to="/" />} />
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
