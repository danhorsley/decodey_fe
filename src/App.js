// src/App.js
import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import "./Styles/App.css";
import "./Styles/Mobile.css";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";
import Privacy from "./pages/Privacy";
import WinCelebrationTest from "./pages/WinCelebrationTest";
import AccountButtonWrapper from "./components/AccountButtonWrapper";
import ModalManager from "./components/modals/ModalManager";
import scoreService from "./services/scoreService";
import { useAuth } from "./context/AuthContext";
import { isOnline } from "./utils/networkUtils";

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
        {/* Main content routes */}
        <Routes>
          <Route path="/" element={<Game />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/wctest" element={<WinCelebrationTest />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        {/* Global fixed UI elements with conditional rendering */}
        <GlobalUIElements />
      </ModalManager>
    </Router>
  );
}

export default App;
