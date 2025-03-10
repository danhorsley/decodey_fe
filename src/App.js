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
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import About from "./components/modals/About";
import Settings from "./components/modals/Settings";
import { useAppContext } from "./context/AppContext";

// Create a wrapper component that conditionally renders the AccountButtonWrapper
function GlobalUIElements() {
  const location = useLocation();

  // Don't render the account button on the leaderboard page
  const isLeaderboardPage = location.pathname === "/leaderboard";

  return !isLeaderboardPage ? <AccountButtonWrapper /> : null;
}

function App() {
  const {
    isLoginOpen,
    closeLogin,
    isSignupOpen,
    closeSignup,
    isAboutOpen,
    closeAbout,
    isSettingsOpen,
    closeSettings,
    settings,
    updateSettings,
  } = useAppContext();

  return (
    <Router>
      {/* Global modals that should be available on all pages */}
      {isLoginOpen && <Login onClose={closeLogin} />}
      {isSignupOpen && <Signup onClose={closeSignup} />}
      {isAboutOpen && <About isOpen={isAboutOpen} onClose={closeAbout} />}
      {isSettingsOpen && (
        <Settings
          currentSettings={settings}
          onSave={(newSettings) => {
            updateSettings(newSettings);
            closeSettings();
          }}
          onCancel={closeSettings}
        />
      )}

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
    </Router>
  );
}

export default App;
