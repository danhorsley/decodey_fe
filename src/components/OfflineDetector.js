// src/components/OfflineDetector.js
import React, { useState, useEffect } from "react";
import { isOnline } from "../utils/networkUtils";

/**
 * Component that shows a notification when the user goes offline
 */
const OfflineDetector = () => {
  const [offline, setOffline] = useState(!isOnline());

  useEffect(() => {
    // Function to handle online status change
    const handleStatusChange = () => {
      setOffline(!navigator.onLine);
    };

    // Set initial status
    setOffline(!navigator.onLine);

    // Add event listeners
    window.addEventListener("online", handleStatusChange);
    window.addEventListener("offline", handleStatusChange);

    // Clean up
    return () => {
      window.removeEventListener("online", handleStatusChange);
      window.removeEventListener("offline", handleStatusChange);
    };
  }, []);

  // If online, show nothing
  if (!offline) {
    return null;
  }

  // Simple notification style
  const styles = {
    container: {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "#333",
      color: "white",
      padding: "12px 20px",
      borderRadius: "8px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      gap: "15px",
      fontFamily: "Courier New, Courier, monospace",
      maxWidth: "90%",
      boxSizing: "border-box",
    },
    message: {
      margin: 0,
      fontSize: "0.9rem",
    },
    icon: {
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      backgroundColor: "#e74c3c",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: "bold",
    },
  };

  // Offline notification UI
  return (
    <div style={styles.container}>
      <div style={styles.icon}>!</div>
      <p style={styles.message}>
        You're currently offline. Some features may be limited.
      </p>
    </div>
  );
};

export default OfflineDetector;
