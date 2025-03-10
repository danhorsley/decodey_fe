import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import "../Styles/Leaderboard.css";
import { useAppContext } from "../context/AppContext";
import HeaderControls from "../components/HeaderControls";
import { FiRefreshCw, FiArrowLeft } from "react-icons/fi";
import AccountButtonWrapper from "../components/AccountButtonWrapper";

function Leaderboard() {
  const {
    settings,
    isMobile,
    isSettingsOpen,
    leaderboardData,
    fetchLeaderboard,
    closeSettings,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState("today");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load leaderboard data on component mount
  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true);
      try {
        await fetchLeaderboard(activeTab);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, [activeTab, fetchLeaderboard]);

  // Utility function to format date for display
  const formatDate = (dateString) => {
    const options = { month: "short", day: "numeric", year: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleBack = () => {
    navigate("/");
  };

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchLeaderboard(activeTab);
    } catch (error) {
      console.error("Error refreshing leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, fetchLeaderboard]);

  return (
    <div
      className={`leaderboard-page ${settings.theme === "dark" ? "dark-theme" : ""} text-${settings.textColor}`}
    >
      {/* Add HeaderControls at the top */}
      <HeaderControls hideTitle={true} />
      <h2>Leaderboard</h2>

      {/* New tabs container with Back button on the left and Account button on right */}
      <div className="leaderboard-header">
        <button className="back-button" onClick={handleBack}>
          <FiArrowLeft />
          <span>Back</span>
        </button>

        <div className="tab-container">
          <button
            className={`tab-button ${activeTab === "today" ? "active" : ""}`}
            onClick={() => setActiveTab("today")}
          >
            Today
          </button>
          <button
            className={`tab-button ${activeTab === "weekly" ? "active" : ""}`}
            onClick={() => setActiveTab("weekly")}
          >
            This Week
          </button>
          <button
            className={`tab-button ${activeTab === "alltime" ? "active" : ""}`}
            onClick={() => setActiveTab("alltime")}
          >
            All Time
          </button>
        </div>

        <button
          className={`refresh-button ${isLoading ? "loading" : ""}`}
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <FiRefreshCw className={isLoading ? "spin" : ""} />
        </button>
      </div>

      <div className="leaderboard-container">
        {isLoading ? (
          <div className="loading-indicator">Loading...</div>
        ) : leaderboardData && leaderboardData.length > 0 ? (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="rank-col">#</th>
                <th className="name-col">Player</th>
                <th className="score-col">Score</th>
                <th className="date-col">Date</th>
                <th className="mode-col">Mode</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map((entry, index) => (
                <tr key={index}>
                  <td className="rank-col">{index + 1}</td>
                  <td className="name-col">{entry.username}</td>
                  <td className="score-col">{entry.score}</td>
                  <td className="date-col">{formatDate(entry.date)}</td>
                  <td className="mode-col">{entry.difficulty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">No scores to display for this period.</div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;