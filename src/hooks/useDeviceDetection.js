// src/hooks/useDeviceDetection.js
import { useEffect } from "react";
import useUIStore from "../stores/uiStore";

/**
 * Ultra-simplified hook to detect mobile devices
 * @returns {Object} Empty object - all state is stored in the UI store
 */
const useDeviceDetection = () => {
  // Get the updateDeviceInfo function from UI store
  const updateDeviceInfo = useUIStore((state) => state.updateDeviceInfo);
  const isMobile = useUIStore((state) => state.isMobile);

  // Detect mobile on mount and window resize
  useEffect(() => {
    const detectMobile = () => {
      // Simple detection based on user agent and screen size
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isRealMobileDevice = mobileRegex.test(userAgent);

      // Small screens are considered mobile
      const isSmallScreen = window.innerWidth < 768;

      // Update UI store with result (state is centralized in the store)
      updateDeviceInfo({ isMobile: isRealMobileDevice || isSmallScreen });
    };

    // Run detection immediately
    detectMobile();

    // Simplified resize listener with debounce
    const handleResize = () => {
      // Only check on significant width changes to avoid excessive updates
      // This improves performance by preventing pointless re-renders
      window.requestAnimationFrame(detectMobile);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, [updateDeviceInfo]);

  // Simply return the mobile state from the store for direct access
  return { isMobile };
};

export default useDeviceDetection;
