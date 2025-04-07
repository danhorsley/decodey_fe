// src/components/debug/MobileDebugTool.js
import React, { useState, useEffect } from "react";
import useUIStore from "../../stores/uiStore";

/**
 * Debug tool to test mobile mode
 * Add this component temporarily to your App or Game component
 * to help diagnose mobile mode issues
 */
const MobileDebugTool = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [forceEnabled, setForceEnabled] = useState(
    localStorage.getItem("force_mobile_debug") === "true",
  );

  // Get state from UI store
  const isMobile = useUIStore((state) => state.isMobile);
  const useMobileMode = useUIStore((state) => state.useMobileMode);
  const mobileModeSetting = useUIStore((state) => state.mobileModeSetting);
  const updateMobileMode = useUIStore((state) => state.updateMobileMode);

  // Toggle force mobile debug mode
  const toggleForceMobile = () => {
    const newState = !forceEnabled;
    setForceEnabled(newState);
    localStorage.setItem("force_mobile_debug", newState.toString());
    // Reload the page to apply the change
    window.location.reload();
  };

  // Directly apply mobile mode setting
  const setMobileMode = (mode) => {
    updateMobileMode(mode);
  };

  // Style for the debug panel
  const styles = {
    container: {
      position: "fixed",
      bottom: "10px",
      right: "10px",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      color: "white",
      padding: "10px",
      borderRadius: "5px",
      zIndex: 10000,
      fontSize: "12px",
      fontFamily: "monospace",
      maxWidth: "250px",
      boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
    },
    heading: {
      margin: "0 0 8px 0",
      fontSize: "14px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    buttonRow: {
      display: "flex",
      gap: "5px",
      marginTop: "8px",
    },
    button: {
      backgroundColor: "#555",
      border: "none",
      padding: "4px 8px",
      borderRadius: "3px",
      color: "white",
      cursor: "pointer",
      fontSize: "11px",
    },
    activeButton: {
      backgroundColor: "#0077ff",
      fontWeight: "bold",
    },
    toggleButton: {
      backgroundColor: forceEnabled ? "#ff3300" : "#555",
    },
    info: {
      margin: "5px 0",
      display: "flex",
      justifyContent: "space-between",
    },
    label: {
      opacity: 0.8,
    },
    value: {
      fontWeight: "bold",
    },
    closeButton: {
      backgroundColor: "transparent",
      border: "none",
      color: "white",
      cursor: "pointer",
      fontSize: "14px",
      padding: "0 5px",
    },
  };

  if (!isVisible) {
    return (
      <button
        style={{
          position: "fixed",
          bottom: "10px",
          right: "10px",
          zIndex: 10000,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: "30px",
          height: "30px",
          fontSize: "16px",
          cursor: "pointer",
        }}
        onClick={() => setIsVisible(true)}
      >
        M
      </button>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.heading}>
        <span>Mobile Debug Panel</span>
        <button style={styles.closeButton} onClick={() => setIsVisible(false)}>
          ×
        </button>
      </div>

      <div style={styles.info}>
        <span style={styles.label}>isMobile:</span>
        <span style={styles.value}>{isMobile ? "true" : "false"}</span>
      </div>

      <div style={styles.info}>
        <span style={styles.label}>useMobileMode:</span>
        <span style={styles.value}>{useMobileMode ? "true" : "false"}</span>
      </div>

      <div style={styles.info}>
        <span style={styles.label}>mobileModeSetting:</span>
        <span style={styles.value}>{mobileModeSetting}</span>
      </div>

      <div style={styles.info}>
        <span style={styles.label}>window size:</span>
        <span style={styles.value}>
          {window.innerWidth}×{window.innerHeight}
        </span>
      </div>

      <div style={styles.buttonRow}>
        <button
          style={{
            ...styles.button,
            ...(mobileModeSetting === "auto" ? styles.activeButton : {}),
          }}
          onClick={() => setMobileMode("auto")}
        >
          Auto
        </button>
        <button
          style={{
            ...styles.button,
            ...(mobileModeSetting === "always" ? styles.activeButton : {}),
          }}
          onClick={() => setMobileMode("always")}
        >
          Always
        </button>
        <button
          style={{
            ...styles.button,
            ...(mobileModeSetting === "never" ? styles.activeButton : {}),
          }}
          onClick={() => setMobileMode("never")}
        >
          Never
        </button>
      </div>

      <div style={styles.buttonRow}>
        <button
          style={{ ...styles.button, ...styles.toggleButton }}
          onClick={toggleForceMobile}
        >
          {forceEnabled ? "Disable Force Mobile" : "Force Mobile"}
        </button>
      </div>
    </div>
  );
};

export default MobileDebugTool;
