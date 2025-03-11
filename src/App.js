// src/App.js
import React from "react";
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

// Create a wrapper component that conditionally renders the AccountButtonWrapper
function GlobalUIElements() {
  const location = useLocation();
  // Don't render the account button on the leaderboard page
  const isLeaderboardPage = location.pathname === "/leaderboard";
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
