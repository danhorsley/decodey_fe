import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook to detect device type and orientation
 * @returns {Object} Device information including isMobile and orientation
 */
const useDeviceDetection = () => {
  // State for tracking device info
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: null, // Initially null until detection runs
    isLandscape: false,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  });

  // Use ref to avoid dependency issues
  const deviceInfoRef = useRef(deviceInfo);

  // Cache the window dimensions to avoid unnecessary updates
  const dimensionsRef = useRef({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Add a ref to store whether we've identified device as mobile - this won't change during orientation shifts
  const detectedAsMobileRef = useRef(false);

  // Extract the detection logic so it can be called from outside the hook
  // Make sure to memoize with useCallback to prevent recreation on renders
  const detectMobile = useCallback(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Get current window dimensions
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;

    // Skip if dimensions haven't changed - prevents unnecessary state updates
    if (
      dimensionsRef.current.width === currentWidth &&
      dimensionsRef.current.height === currentHeight &&
      deviceInfoRef.current.isMobile !== null
    ) {
      return;
    }

    // Update dimensions ref
    dimensionsRef.current = {
      width: currentWidth,
      height: currentHeight,
    };

    // First check: detect real mobile devices by user agent
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isRealMobileDevice = mobileRegex.test(userAgent);

    // If it's a real mobile device, always set isMobile to true
    if (isRealMobileDevice) {
      detectedAsMobileRef.current = true;

      const newInfo = {
        isMobile: true,
        isLandscape: currentWidth > currentHeight,
        screenWidth: currentWidth,
        screenHeight: currentHeight,
        isRealMobileDevice: true,
      };

      deviceInfoRef.current = newInfo;
      setDeviceInfo(newInfo);
      return;
    }

    // For non-mobile devices, use the original detection logic
    let isMobile = false;

    // 1. If we previously detected as mobile, keep that state
    if (detectedAsMobileRef.current) {
      isMobile = true;
    } else {
      // 2. Regular expressions to check for common mobile devices
      const tabletRegex = /iPad|tablet|Nexus 7|Nexus 10|KFAPWI/i;

      // 3. Check device pixel ratio (typically > 2 on modern phones)
      const highDensityDisplay = window.devicePixelRatio > 1.5;

      // 4. Max dimension (max of width or height) < 1366px is likely mobile
      const maxDimension = Math.max(currentWidth, currentHeight);
      const smallScreen = maxDimension < 1366;

      // 5. Touch capability
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

      // Decision logic - consider mobile if ANY of the following:
      isMobile =
        // User agent indicates mobile
        mobileRegex.test(userAgent) ||
        // Typical phone metrics: small screen + high density + touch
        (smallScreen && highDensityDisplay && hasTouch) ||
        // Extra small screen is almost certainly mobile regardless of other factors
        Math.min(currentWidth, currentHeight) < 500;

      // If detected as mobile, save this state for future orientation changes
      if (isMobile) {
        detectedAsMobileRef.current = true;
      }
    }

    // Check orientation (always do this part even if mobile detection doesn't change)
    const isLandscape = currentWidth > currentHeight;

    // Only update state if values have changed to prevent infinite loops
    if (
      deviceInfoRef.current.isMobile !== isMobile ||
      deviceInfoRef.current.isLandscape !== isLandscape ||
      deviceInfoRef.current.screenWidth !== currentWidth ||
      deviceInfoRef.current.screenHeight !== currentHeight
    ) {
      const newInfo = {
        isMobile,
        isLandscape,
        screenWidth: currentWidth,
        screenHeight: currentHeight,
        isRealMobileDevice: false,
      };

      // Update the ref first
      deviceInfoRef.current = newInfo;

      // Then update state
      setDeviceInfo(newInfo);
    }
  }, []); // Empty dependency array ensures this function doesn't change

  // Set up event listeners and initial detection
  useEffect(() => {
    // Initial detection
    detectMobile();

    // Throttle resize events to prevent excessive updates
    let resizeTimeout;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(detectMobile, 150);
    };

    // Add event listeners to detect orientation changes and window resizing
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", () => {
      // Force immediate detection after orientation change
      detectMobile();
    });

    // Cleanup listeners
    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", detectMobile);
    };
  }, [detectMobile]); // Include detectMobile as a dependency

  return {
    ...deviceInfo,
    detectMobile,
  };
};

export default useDeviceDetection;
