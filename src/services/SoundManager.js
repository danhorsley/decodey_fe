// src/services/SoundManager.js - Updated to fix audio context suspension
import { useState, useEffect, useCallback, useRef } from "react";
import { Howl, Howler } from "howler";
import { vibrate, isVibrationEnabled } from "../utils/hapticUtils";

/**
 * Sound manager using Howler.js with fixes for lazy loading and AudioContext issues
 */
const useSound = () => {
  const [soundsLoaded, setSoundsLoaded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const savedSettings = localStorage.getItem("uncrypt-settings");
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        // Return the sound setting if available, otherwise default to true
        return parsedSettings.soundEnabled !== undefined
          ? parsedSettings.soundEnabled
          : true;
      }
      return true; // Default to enabled if no settings found
    } catch (error) {
      console.warn("Error loading sound settings:", error);
      return true; // Default to enabled on error
    }
  });
  const [loadingProgress, setLoadingProgress] = useState(0);
  const soundsRef = useRef({});
  const playingRef = useRef({});
  const lastPlayedRef = useRef({});
  const totalSounds = useRef(0);
  const loadedSounds = useRef(0);
  const initAttemptedRef = useRef(false);
  const audioContextUnlockedRef = useRef(false);

  // Define debounce time (prevents rapid retriggers)
  const DEBOUNCE_MS = 50;

  // Define sounds configuration with process.env.PUBLIC_URL for correct path resolution
  // This ensures paths work correctly with lazy loading
  const publicUrl = process.env.PUBLIC_URL || "";
  const soundConfigs = {
    correct: {
      src: [`${publicUrl}/sounds/correct.mp3`],
      volume: 0.7,
    },
    incorrect: {
      src: [`${publicUrl}/sounds/incorrect.mp3`],
      volume: 0.7,
    },
    hint: { src: [`${publicUrl}/sounds/hint.mp3`], volume: 0.7 },
    win: { src: [`${publicUrl}/sounds/win.mp3`], volume: 0.8 },
    lose: { src: [`${publicUrl}/sounds/lose.mp3`], volume: 0.8 },
    keyclick: {
      src: [`${publicUrl}/sounds/keyclick.mp3`],
      volume: 0.5,
    },
  };

  // Log path for debugging
  console.log(
    "Using resolved paths to sounds folder, e.g.:",
    soundConfigs.correct.src[0],
  );

  // Add a function to unlock AudioContext
  const unlockAudioContext = useCallback(() => {
    if (audioContextUnlockedRef.current) return;

    console.log("Attempting to unlock AudioContext...");

    // Try to resume the AudioContext
    if (Howler.ctx && Howler.ctx.state !== "running") {
      console.log("Found suspended AudioContext, attempting to resume...");
      Howler.ctx
        .resume()
        .then(() => {
          console.log("AudioContext resumed successfully!");
          audioContextUnlockedRef.current = true;
        })
        .catch((err) => {
          console.warn("Failed to resume AudioContext:", err);
        });
    } else {
      console.log("AudioContext is already running or not available");
      audioContextUnlockedRef.current = true;
    }

    // Create and play a silent sound to unlock audio on iOS
    const silentSound = new Howl({
      src: [
        "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAABhTEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADgnABGiAAQBCqgCRMAAgEAH///////////////7+n/9FTuQsQH//////2NG0jWUGlio5gLQTOtIoeR2WX////X4s9Atb/JRVCbBUpeRUq//////////////////9RUi0f2jn/+xDECgPCjAEQAABN4AAANIAAAAQVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==",
      ],
      volume: 0.001,
      autoplay: true,
      loop: false,
      onend: () => {
        console.log("Silent sound played successfully");
      },
    });
  }, []);

  // Clear global Howler cache on component mount and setup unlock listeners
  useEffect(() => {
    // On init, make sure Howler is properly configured
    Howler.autoUnlock = true;

    // Add event listeners to unlock AudioContext on user interaction
    const unlockEvents = ["touchstart", "touchend", "mousedown", "keydown"];
    const unlockHandler = () => {
      unlockAudioContext();

      // Remove listeners once unlocked
      if (audioContextUnlockedRef.current) {
        unlockEvents.forEach((event) => {
          document.removeEventListener(event, unlockHandler);
        });
      }
    };

    // Add unlock listeners
    unlockEvents.forEach((event) => {
      document.addEventListener(event, unlockHandler);
    });

    // Attempt unlock right away (helps in some browsers)
    unlockAudioContext();

    return () => {
      // Clean up listeners
      unlockEvents.forEach((event) => {
        document.removeEventListener(event, unlockHandler);
      });

      // On unmount, make sure to unload all sounds
      Object.values(soundsRef.current).forEach((sound) => {
        if (sound && typeof sound.unload === "function") {
          sound.unload();
        }
      });
    };
  }, [unlockAudioContext]);

  // Initialize Howler sounds with retry mechanism
  const initializeSound = useCallback((soundType) => {
    const config = soundConfigs[soundType];
    if (!config) return null;

    // Skip if already initialized
    if (soundsRef.current[soundType]) {
      return soundsRef.current[soundType];
    }

    try {
      console.log(`Initializing sound: ${soundType}`, config.src);

      // Ensure the audio context is ready
      unlockAudioContext();

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
          console.log(`Sound loaded: ${soundType} (${progress}%)`);

          if (loadedSounds.current >= totalSounds.current) {
            setSoundsLoaded(true);
            console.log("All sounds loaded successfully!");
          }
        },
        onplay: () => {
          // Mark as playing
          playingRef.current[soundType] = true;
          console.log(`Sound playing: ${soundType}`);
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

          // Retry loading with a delay (helps with lazy loading timing issues)
          setTimeout(() => {
            console.log(`Retrying to load sound: ${soundType}`);
            // Force reload by removing from refs
            if (soundsRef.current[soundType]) {
              soundsRef.current[soundType].unload();
              delete soundsRef.current[soundType];
              // Re-initialize after cleanup
              initializeSound(soundType);
            }
          }, 2000);

          // Count as loaded to avoid getting stuck in UI
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
    if (initAttemptedRef.current) {
      console.log("Sound loading already attempted, skipping duplicate call");
      return;
    }

    console.log("Loading sounds...");
    initAttemptedRef.current = true;

    // Set total count
    totalSounds.current = Object.keys(soundConfigs).length;

    // Create and start loading all sounds
    Object.keys(soundConfigs).forEach(initializeSound);

    // Try to unlock audio context
    unlockAudioContext();
  }, [initializeSound, unlockAudioContext]);

  // Play a sound with debounce to prevent double-triggers
  const playSound = useCallback(
    (soundType) => {
      if (!soundEnabled) {
        console.log("Sound disabled, not playing:", soundType);
        return;
      }

      // Try to unlock audio context when sound is played
      unlockAudioContext();
      // Also trigger haptic feedback for mobile
      if (isVibrationEnabled()) {
        // Map sound types to vibration patterns
        switch (soundType) {
          case "correct":
            vibrate("success");
            break;
          case "incorrect":
            vibrate("error");
            break;
          case "keyclick":
            vibrate("keyclick");
            break;
          case "hint":
            vibrate("hint");
            break;
          case "win":
            vibrate("win");
            break;
          default:
            vibrate("default");
        }
      }

      // Ensure audio context is initialized
      if (!initAudioContext()) {
        console.warn(
          "Could not play sound: Audio context initialization failed",
        );
        return;
      }
      try {
        // Get or initialize the sound
        let sound = soundsRef.current[soundType];
        if (!sound) {
          console.log(`Sound ${soundType} not loaded yet, initializing...`);
          sound = initializeSound(soundType);
          if (!sound) {
            console.warn(`Failed to initialize sound ${soundType}`);
            return;
          }
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
        console.log(`Attempting to play sound: ${soundType}`);
        sound.play();
      } catch (error) {
        console.warn(`Error playing sound ${soundType}:`, error);
      }
    },
    [soundEnabled, initializeSound, unlockAudioContext],
  );

  // Toggle sounds on/off
  const toggleSounds = useCallback(() => {
    setSoundEnabled((prev) => !prev);
    // We don't adjust Howler master volume to avoid affecting other sounds on the page
  }, []);

  // Return the API
  return {
    playSound,
    soundsLoaded,
    soundEnabled,
    loadSounds,
    toggleSounds,
    loadProgress: () => loadingProgress,
    unlockAudioContext, // Expose this for direct calls from components
  };
};

export default useSound;
