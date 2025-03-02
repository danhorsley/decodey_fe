import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to detect device type and orientation
 * @returns {Object} Device information including isMobile and orientation
 */
const useDeviceDetection = () => {
  // State for tracking device info
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isLandscape: false,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight
  });
  
  // Use ref to avoid dependency issues
  const deviceInfoRef = useRef(deviceInfo);
  
  // Cache the window dimensions to avoid unnecessary updates
  const dimensionsRef = useRef({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Extract the detection logic so it can be called from outside the hook
  // Make sure to memoize with useCallback to prevent recreation on renders
  const detectMobile = useCallback(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Get current window dimensions
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    
    // Skip if dimensions haven't changed - prevents unnecessary state updates
    if (dimensionsRef.current.width === currentWidth && 
        dimensionsRef.current.height === currentHeight &&
        deviceInfoRef.current.isMobile !== undefined) {
      return;
    }
    
    // Update dimensions ref
    dimensionsRef.current = {
      width: currentWidth,
      height: currentHeight
    };
    
    // Regular expressions to check for mobile devices
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    
    // Check if it's a mobile device
    const isMobile = mobileRegex.test(userAgent) || 
                    (currentWidth <= 800) || 
                    ('ontouchstart' in window && currentWidth <= 1024);
    
    // Check orientation
    const isLandscape = currentWidth > currentHeight;
    
    // Only update state if values have changed to prevent infinite loops
    if (deviceInfoRef.current.isMobile !== isMobile || 
        deviceInfoRef.current.isLandscape !== isLandscape ||
        deviceInfoRef.current.screenWidth !== currentWidth ||
        deviceInfoRef.current.screenHeight !== currentHeight) {
      
      const newInfo = {
        isMobile,
        isLandscape,
        screenWidth: currentWidth,
        screenHeight: currentHeight
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
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', detectMobile);

    // Cleanup listeners
    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', detectMobile);
    };
  }, [detectMobile]); // Include detectMobile as a dependency

  return {
    ...deviceInfo,
    detectMobile
  };
};

export default useDeviceDetection;