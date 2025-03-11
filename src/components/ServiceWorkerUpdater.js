// src/components/ServiceWorkerUpdater.js
import React, { useState, useEffect } from "react";

/**
 * Component to handle service worker updates
 * This component doesn't render anything unless there's an update
 */
const ServiceWorkerUpdater = () => {
  const [showReload, setShowReload] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  // Set up a listener for service worker updates
  useEffect(() => {
    // Function to handle new content from the service worker
    const onServiceWorkerUpdate = (registration) => {
      setShowReload(true);
      setWaitingWorker(registration.waiting);
    };

    // If service workers are supported
    if ("serviceWorker" in navigator) {
      // Set up event listeners for controlling service worker changes
      navigator.serviceWorker.ready.then((registration) => {
        // Check if there's already a waiting worker
        if (registration.waiting) {
          onServiceWorkerUpdate(registration);
        }

        // Listen for new updates
        registration.addEventListener("updatefound", () => {
          if (registration.installing) {
            const installingWorker = registration.installing;
            installingWorker.addEventListener("statechange", () => {
              if (
                installingWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                onServiceWorkerUpdate(registration);
              }
            });
          }
        });
      });

      // Handle controller change (after skipWaiting)
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  // Function to update the service worker
  const updateServiceWorker = () => {
    if (waitingWorker) {
      // Send message to service worker to skip waiting
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  // If no update is available, render nothing
  if (!showReload) return null;

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
    button: {
      padding: "6px 12px",
      backgroundColor: "#4cc9f0",
      color: "#222",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontFamily: "inherit",
      fontWeight: "bold",
    },
  };

  // Update notification UI
  return (
    <div style={styles.container}>
      <p style={styles.message}>New version available!</p>
      <button style={styles.button} onClick={updateServiceWorker}>
        Update
      </button>
    </div>
  );
};

export default ServiceWorkerUpdater;
