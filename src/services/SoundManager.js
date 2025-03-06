import { useEffect, useRef, useState, useCallback } from "react";

const useSound = () => {
  // References to audio elements
  const soundRefs = useRef({
    correct: null,
    incorrect: null,
    hint: null,
    win: null,
    lose: null,
    keyclick: null,
  });

  // Track loading state
  const [soundsLoaded, setSoundsLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [soundsInitialized, setSoundsInitialized] = useState(false);

  // Sound paths
  const soundPaths = {
    correct: "/sounds/correct.mp3",
    incorrect: "/sounds/incorrect.mp3",
    hint: "/sounds/hint.mp3",
    win: "/sounds/win.mp3",
    lose: "/sounds/lose.mp3",
    keyclick: "/sounds/keyclick.mp3",
  };

  // Lazy load initialization
  const initializeSounds = useCallback(() => {
    if (soundsInitialized) return;

    // Create audio elements
    const createAudio = (path, volume = 0.7) => {
      const audio = new Audio(path);
      audio.volume = volume;
      audio.preload = "auto";
      return audio;
    };

    // Initialize each sound with appropriate volume
    soundRefs.current.correct = createAudio(soundPaths.correct, 0.7);
    soundRefs.current.incorrect = createAudio(soundPaths.incorrect, 0.7);
    soundRefs.current.hint = createAudio(soundPaths.hint, 0.7);
    soundRefs.current.win = createAudio(soundPaths.win, 0.8);
    soundRefs.current.lose = createAudio(soundPaths.lose, 0.8);
    soundRefs.current.keyclick = createAudio(soundPaths.keyclick, 0.5);

    // Track loaded sounds
    const totalSounds = Object.keys(soundRefs.current).length;
    let loaded = 0;

    // Function to mark a sound as loaded
    const handleSoundLoaded = () => {
      loaded++;
      setLoadedCount(loaded);

      if (loaded === totalSounds) {
        setSoundsLoaded(true);
        console.log("All sounds loaded successfully");
      }
    };

    // Add load event listeners to all sounds
    Object.values(soundRefs.current).forEach((audio) => {
      audio.addEventListener("canplaythrough", handleSoundLoaded, {
        once: true,
      });
      audio.addEventListener(
        "error",
        (e) => {
          console.warn("Error loading sound:", e);
          handleSoundLoaded(); // Still count as "loaded" to avoid getting stuck
        },
        { once: true },
      );

      // Start loading the audio
      audio.load();
    });

    setSoundsInitialized(true);
  }, [soundsInitialized]);

  // Function to play a sound with reliable error handling
  const playSound = useCallback(
    (soundType) => {
      // Initialize sounds on first use
      if (!soundsInitialized) {
        initializeSounds();
      }

      const sound = soundRefs.current[soundType];

      if (!sound) {
        console.warn(`Sound ${soundType} not found`);
        return;
      }

      try {
        // Reset to beginning if it's already playing
        sound.currentTime = 0;

        // Play with proper promise handling for modern browsers
        const playPromise = sound.play();

        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            console.warn(`Couldn't play sound ${soundType}:`, e);
          });
        }
      } catch (e) {
        console.warn(`Error playing sound ${soundType}:`, e);
      }
    },
    [soundsInitialized, initializeSounds],
  );

  return {
    playSound,
    soundsLoaded,
    loadSounds: initializeSounds,
    loadProgress: () =>
      Math.round((loadedCount / Object.keys(soundPaths).length) * 100),
  };
};

export default useSound;
