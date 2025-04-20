// src/hooks/useDeviceDetection.js - Optimized version
import { useState, useEffect, useCallback, useRef } from "react";
import useUIStore from "../stores/uiStore";

// Development mode flag to control logging
const isDev = process.env.NODE_ENV !== "production";

/**
 * Enhanced hook to detect mobile devices and orientation
 * Works with emulators and testing tools
 * @returns {Object} Mobile detection state including orientation
 */
const useDeviceDetection = () => {
  // Local state for orientation
  const [isLandscape, setIsLandscape] = useState(
    window.innerWidth > window.innerHeight,
  );

  // Get the device info functions from UI store
  const updateDeviceInfo = useUIStore((state) => state.updateDeviceInfo);
  const isMobile = useUIStore((state) => state.isMobile);
  const useMobileMode = useUIStore((state) => state.useMobileMode);
  const mobileModeSetting = useUIStore((state) => state.mobileModeSetting);

  // Use refs to track last detected state and avoid duplicate logs
  const lastLoggedState = useRef({
    width: window.innerWidth,
    height: window.innerHeight,
    isLandscape: window.innerWidth > window.innerHeight,
  });

  // Debounce helper
  const useDebounce = (fn, ms) => {
    const timerRef = useRef(null);

    return useCallback(
      (...args) => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
          fn(...args);
          timerRef.current = null;
        }, ms);
      },
      [fn, ms],
    );
  };

  // Detect orientation change handler with debouncing
  const handleOrientationChange = useCallback(() => {
    const newIsLandscape = window.innerWidth > window.innerHeight;

    // Only update if orientation actually changed
    if (isLandscape !== newIsLandscape) {
      setIsLandscape(newIsLandscape);

      // Update UI store with new orientation
      updateDeviceInfo({
        isLandscape: newIsLandscape,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
      });

      if (isDev) {
        console.log(
          `[DeviceDetection] Orientation changed to: ${newIsLandscape ? "landscape" : "portrait"}`,
        );
      }
    }
  }, [updateDeviceInfo, isLandscape]);

  // Debounced version for better performance
  const debouncedHandleOrientationChange = useDebounce(
    handleOrientationChange,
    150,
  );

  // Detect mobile on mount and window resize
  useEffect(() => {
    const detectMobile = () => {
      // Check for mobile user agent
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
      const isRealMobileDevice = mobileRegex.test(userAgent);

      // Check for small screen size
      const isSmallScreen = window.innerWidth < 768;

      // Check for touch support
      const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;

      // Check for mobile emulator parameters
      const urlParams = new URLSearchParams(window.location.search);
      const hasMobileParam = urlParams.get("mobile") === "true";

      // Check for debug force mode
      const debugForceMobile =
        localStorage.getItem("force_mobile_debug") === "true";

      // True if ANY detection method indicates mobile
      const isMobileDetected =
        isRealMobileDevice ||
        isSmallScreen ||
        isTouchDevice ||
        hasMobileParam ||
        debugForceMobile;

      // Get accurate orientation
      const newIsLandscape = window.innerWidth > window.innerHeight;

      // Only update UI state if orientation actually changed
      if (isLandscape !== newIsLandscape) {
        setIsLandscape(newIsLandscape);
      }

      // Check if state has changed enough to log
      const hasSignificantChange =
        Math.abs(window.innerWidth - lastLoggedState.current.width) > 10 ||
        Math.abs(window.innerHeight - lastLoggedState.current.height) > 10 ||
        lastLoggedState.current.isLandscape !== newIsLandscape;

      // Only log when something notable changes
      if (isDev && hasSignificantChange) {
        // Only show part of the user agent to avoid console clutter
        const shortUserAgent = userAgent.substring(0, 50) + "...";

        console.log("[DeviceDetection]", {
          userAgent: shortUserAgent,
          width: window.innerWidth,
          height: window.innerHeight,
          isRealMobileDevice,
          isSmallScreen,
          isTouchDevice,
          hasMobileParam,
          debugForceMobile,
          isLandscape: newIsLandscape,
          isMobileDetected,
        });

        // Update last logged state
        lastLoggedState.current = {
          width: window.innerWidth,
          height: window.innerHeight,
          isLandscape: newIsLandscape,
        };
      }

      // Update UI store with result (state is centralized in the store)
      updateDeviceInfo({
        isMobile: isMobileDetected,
        isLandscape: newIsLandscape,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
      });
    };

    // Run detection immediately, once
    detectMobile();

    // More responsive resize listener with improved throttling
    let resizeTimeout;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      resizeTimeout = setTimeout(() => {
        // Only run detection if the size actually changed significantly
        const widthDiff = Math.abs(
          window.innerWidth - lastLoggedState.current.width,
        );
        const heightDiff = Math.abs(
          window.innerHeight - lastLoggedState.current.height,
        );

        if (widthDiff > 5 || heightDiff > 5) {
          if (isDev) {
            console.log("[DeviceDetection] Window resized, rechecking...");
          }
          detectMobile();
          debouncedHandleOrientationChange();
        }
      }, 250); // Reasonable throttle time
    };

    window.addEventListener("resize", handleResize);

    // Also detect on orientation change for mobile devices
    window.addEventListener("orientationchange", () => {
      if (isDev) {
        console.log("[DeviceDetection] Orientation change event fired");
      }
      // Wait a moment for dimensions to update after orientation change
      setTimeout(debouncedHandleOrientationChange, 50);
    });

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener(
        "orientationchange",
        debouncedHandleOrientationChange,
      );
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, [updateDeviceInfo, debouncedHandleOrientationChange, isLandscape]);

  // Return comprehensive info about mobile state including orientation
  return {
    isMobile,
    useMobileMode,
    mobileModeSetting,
    isLandscape,
  };
};

export default useDeviceDetection;
