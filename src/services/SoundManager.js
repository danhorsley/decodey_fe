// src/services/SoundManager.js
import { useState, useEffect, useCallback, useRef } from "react";
import { Howl, Howler } from "howler";

/**
 * Sound manager using Howler.js with fixes to prevent double playing
 */
const useSound = () => {
  const [soundsLoaded, setSoundsLoaded] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const soundsRef = useRef({});
  const playingRef = useRef({}); // Track currently playing sounds
  const lastPlayedRef = useRef({}); // Track last play timestamp
  const totalSounds = useRef(0);
  const loadedSounds = useRef(0);

  // Define debounce time (prevents rapid retriggers)
  const DEBOUNCE_MS = 50;

  // Define sounds configuration
  const soundConfigs = {
    correct: { src: ["/sounds/correct.mp3"], volume: 0.7 },
    incorrect: { src: ["/sounds/incorrect.mp3"], volume: 0.7 },
    hint: { src: ["/sounds/hint.mp3"], volume: 0.7 },
    win: { src: ["/sounds/win.mp3"], volume: 0.8 },
    lose: { src: ["/sounds/lose.mp3"], volume: 0.8 },
    keyclick: { src: ["/sounds/keyclick.mp3"], volume: 0.5 },
  };

  // Clear global Howler cache on component mount
  useEffect(() => {
    // On init, make sure Howler is properly configured
    Howler.autoUnlock = true;

    return () => {
      // On unmount, make sure to unload all sounds
      Object.values(soundsRef.current).forEach((sound) => {
        if (sound && typeof sound.unload === "function") {
          sound.unload();
        }
      });
    };
  }, []);

  // Initialize Howler sounds
  const initializeSound = useCallback((soundType) => {
    const config = soundConfigs[soundType];
    if (!config) return null;

    // Skip if already initialized
    if (soundsRef.current[soundType]) {
      return soundsRef.current[soundType];
    }

    try {
      // Create Howl instance with controlled configuration
      const sound = new Howl({
        src: config.src,
        volume: config.volume || 0.7,
        preload: true,
        html5: !!navigator.userAgent.match(/Mobile|Android/i), // HTML5 only on mobile
        pool: 1, // Only allow 1 instance at a time

        // Important: these events help us track sound states
        onload: () => {
          loadedSounds.current += 1;
          const progress = Math.round(
            (loadedSounds.current / totalSounds.current) * 100,
          );
          setLoadingProgress(progress);

          if (loadedSounds.current >= totalSounds.current) {
            setSoundsLoaded(true);
          }
        },
        onplay: () => {
          // Mark as playing
          playingRef.current[soundType] = true;
        },
        onend: () => {
          // Mark as not playing
          playingRef.current[soundType] = false;
        },
        onstop: () => {
          // Mark as not playing
          playingRef.current[soundType] = false;
        },
        onloaderror: (id, err) => {
          console.warn(`Error loading sound ${soundType}:`, err);
          // Count as loaded to avoid getting stuck
          loadedSounds.current += 1;
          setLoadingProgress(
            Math.round((loadedSounds.current / totalSounds.current) * 100),
          );
        },
      });

      // Store in refs
      soundsRef.current[soundType] = sound;
      playingRef.current[soundType] = false;
      lastPlayedRef.current[soundType] = 0;

      return sound;
    } catch (error) {
      console.error(`Failed to initialize sound ${soundType}:`, error);
      return null;
    }
  }, []);

  // Load all sounds
  const loadSounds = useCallback(() => {
    // Set total count
    totalSounds.current = Object.keys(soundConfigs).length;

    // Create and start loading all sounds
    Object.keys(soundConfigs).forEach(initializeSound);
  }, [initializeSound]);

  // Play a sound with debounce to prevent double-triggers
  const playSound = useCallback(
    (soundType) => {
      if (!soundsEnabled) return;

      try {
        // Get or initialize the sound
        let sound = soundsRef.current[soundType];
        if (!sound) {
          sound = initializeSound(soundType);
          if (!sound) return;
        }

        const now = Date.now();

        // Prevent rapid re-triggers (debounce)
        if (now - (lastPlayedRef.current[soundType] || 0) < DEBOUNCE_MS) {
          return;
        }

        // If already playing, don't restart (prevents double playing)
        if (playingRef.current[soundType]) {
          return;
        }

        // Update last played time
        lastPlayedRef.current[soundType] = now;

        // Stop any previous instance (double safety)
        sound.stop();

        // Play new instance
        sound.play();
      } catch (error) {
        console.warn(`Error playing sound ${soundType}:`, error);
      }
    },
    [soundsEnabled, initializeSound],
  );

  // Toggle sounds on/off
  const toggleSounds = useCallback(() => {
    setSoundsEnabled((prev) => !prev);
    // We don't adjust Howler master volume to avoid affecting other sounds on the page
  }, []);

  // Return the API
  return {
    playSound,
    soundsLoaded,
    soundsEnabled,
    loadSounds,
    toggleSounds,
    loadProgress: () => loadingProgress,
  };
};

export default useSound;
