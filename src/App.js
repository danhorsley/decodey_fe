import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./Styles/App.css";
import "./Styles/Mobile.css";
import Game from "./pages/Game";
import WinCelebrationTest from "./pages/WinCelebrationTest";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Game />} />
        <Route path="/wctest" element={<WinCelebrationTest />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
