// src/hooks/useDeviceDetection.js
import { useState, useEffect, useCallback } from "react";
import useUIStore from "../stores/uiStore";

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

  // Detect orientation change handler
  const handleOrientationChange = useCallback(() => {
    const newIsLandscape = window.innerWidth > window.innerHeight;
    setIsLandscape(newIsLandscape);

    // Update UI store with new orientation
    updateDeviceInfo({
      isLandscape: newIsLandscape,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    });

    console.log(
      `[DeviceDetection] Orientation changed to: ${newIsLandscape ? "landscape" : "portrait"}`,
    );
  }, [updateDeviceInfo]);

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
      setIsLandscape(newIsLandscape);

      // Log detailed detection information
      console.log("[DeviceDetection]", {
        userAgent: userAgent.substring(0, 50) + "...",
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

      // Update UI store with result (state is centralized in the store)
      updateDeviceInfo({
        isMobile: isMobileDetected,
        isLandscape: newIsLandscape,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
      });
    };

    // Run detection immediately
    detectMobile();

    // More responsive resize listener with throttling for better performance
    let resizeTimeout;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      resizeTimeout = setTimeout(() => {
        console.log("[DeviceDetection] Window resized, rechecking...");
        detectMobile();
        handleOrientationChange();
      }, 250); // Reasonable throttle time
    };

    window.addEventListener("resize", handleResize);

    // Also detect on orientation change for mobile devices
    window.addEventListener("orientationchange", () => {
      console.log("[DeviceDetection] Orientation change event fired");
      // Wait a moment for dimensions to update after orientation change
      setTimeout(handleOrientationChange, 50);
    });

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, [updateDeviceInfo, handleOrientationChange]);

  // Return comprehensive info about mobile state including orientation
  return {
    isMobile,
    useMobileMode,
    mobileModeSetting,
    isLandscape,
  };
};

export default useDeviceDetection;
