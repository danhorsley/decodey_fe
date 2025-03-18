// src/services/WebAudioSoundManager.js
import { useState, useCallback, useRef, useEffect } from "react";
import { vibrate, isVibrationEnabled } from "../utils/hapticUtils";
import useSettingsStore from "../stores/settingsStore";
/**
 * Custom hook for sound management using Web Audio API
 * Generates sounds on-the-fly instead of loading MP3 files
 */
const useSound = () => {
  // Use settings context for sound state
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [soundEnabled, setSoundEnabled] = useState(
    settings?.soundEnabled !== undefined ? settings.soundEnabled : true,
  );
  const audioContextRef = useRef(null);
  const initializedRef = useRef(false);

  // Keep local state in sync with settings
  useEffect(() => {
    if (
      settings?.soundEnabled !== undefined &&
      settings.soundEnabled !== soundEnabled
    ) {
      setSoundEnabled(settings.soundEnabled);
    }
  }, [settings?.soundEnabled, soundEnabled]);

  // Initialize audio context on demand (for browser autoplay policies)
  const initAudioContext = useCallback(() => {
    if (!initializedRef.current) {
      try {
        // Create new AudioContext (with fallback for older browsers)
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        // Resume the audio context if it's suspended
        if (audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume();
        }

        initializedRef.current = true;
        console.log("Audio context initialized successfully");
        return true;
      } catch (error) {
        console.warn("Failed to initialize audio context:", error);
        return false;
      }
    }
    return true;
  }, []);

  // Generate and play a "correct" sound (pleasant major chord)
  const playCorrectSound = useCallback(() => {
    if (!soundEnabled || !initAudioContext()) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Create an oscillator for the base note
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 440; // A4

    // Create an oscillator for the major third
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 554.37; // C#5

    // Create an oscillator for the fifth
    const osc3 = ctx.createOscillator();
    osc3.type = "sine";
    osc3.frequency.value = 659.25; // E5

    // Create gain nodes to control volume
    const gainNode1 = ctx.createGain();
    const gainNode2 = ctx.createGain();
    const gainNode3 = ctx.createGain();

    // Set volumes
    gainNode1.gain.value = 0.2;
    gainNode2.gain.value = 0.15;
    gainNode3.gain.value = 0.15;

    // Connect the oscillators to their gain nodes, then to destination
    osc1.connect(gainNode1);
    osc2.connect(gainNode2);
    osc3.connect(gainNode3);

    gainNode1.connect(ctx.destination);
    gainNode2.connect(ctx.destination);
    gainNode3.connect(ctx.destination);

    // Set envelope for a pleasant sound (quick attack, short decay)
    gainNode1.gain.setValueAtTime(0, now);
    gainNode1.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    gainNode2.gain.setValueAtTime(0, now);
    gainNode2.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    gainNode3.gain.setValueAtTime(0, now);
    gainNode3.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gainNode3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    // Start and stop the oscillators
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
    osc3.stop(now + 0.5);
  }, [soundEnabled, initAudioContext]);

  // Generate and play an "incorrect" sound (dissonant minor second)
  const playIncorrectSound = useCallback(() => {
    if (!soundEnabled || !initAudioContext()) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Create oscillators for dissonant interval
    const osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.value = 220; // A3

    const osc2 = ctx.createOscillator();
    osc2.type = "sawtooth";
    osc2.frequency.value = 233.08; // Bb3 (dissonant minor second)

    // Create gain nodes
    const gainNode1 = ctx.createGain();
    const gainNode2 = ctx.createGain();

    // Set volumes
    gainNode1.gain.value = 0.15;
    gainNode2.gain.value = 0.15;

    // Connect everything
    osc1.connect(gainNode1);
    osc2.connect(gainNode2);

    gainNode1.connect(ctx.destination);
    gainNode2.connect(ctx.destination);

    // Set envelope for a harsh sound
    gainNode1.gain.setValueAtTime(0, now);
    gainNode1.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    gainNode2.gain.setValueAtTime(0, now);
    gainNode2.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    // Start and stop
    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }, [soundEnabled, initAudioContext]);

  // Generate and play a "keyclick" sound (short click)
  const playKeyClickSound = useCallback(() => {
    if (!soundEnabled || !initAudioContext()) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Create a short noise burst
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 800;

    // Create filter for a more "clicky" sound
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1000;

    // Create gain node
    const gainNode = ctx.createGain();

    // Connect
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Very quick envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    // Start and stop
    osc.start(now);
    osc.stop(now + 0.05);
  }, [soundEnabled, initAudioContext]);

  // Generate and play a "hint" sound (first two notes of a digital arpeggio)
  const playHintSound = useCallback(() => {
    if (!soundEnabled || !initAudioContext()) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Create oscillator with square wave for more digital sound
    const osc = ctx.createOscillator();
    osc.type = "square";

    // Create gain node
    const gainNode = ctx.createGain();

    // Add a slight bit of distortion for digital feel
    const distortion = ctx.createWaveShaper();
    function makeDistortionCurve(amount) {
      const k = amount;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;

      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      return curve;
    }
    distortion.curve = makeDistortionCurve(5);

    // Create a high-pass filter for a cleaner digital sound
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 300;

    // Connect the audio path
    osc.connect(filter);
    filter.connect(distortion);
    distortion.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Play first two notes of the matrix-themed sequence
    // C minor scale with a digital twist
    osc.frequency.setValueAtTime(277.18, now); // C#4 with slight detune for matrix vibe
    osc.frequency.setValueAtTime(370.0, now + 0.2); // F#4 with slight detune

    // Envelope with digital attack/release
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.17, now + 0.02); // Fast attack
    gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.2); // First note decay
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.22); // Second note attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4); // Release

    // Start and stop
    osc.start(now);
    osc.stop(now + 0.4);
  }, [soundEnabled, initAudioContext]);

  // Array of different win sounds for variety
  const playWinSound = useCallback(() => {
    if (!soundEnabled || !initAudioContext()) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Choose a random win sound from 3 variations
    const winVariation = Math.floor(Math.random() * 3);

    // Win Sound 1: Matrix-inspired digital cascade
    if (winVariation === 0) {
      // Create primary oscillator for melody
      const osc1 = ctx.createOscillator();
      osc1.type = "sawtooth"; // Digital, sharper sound

      // Create secondary oscillator for bass
      const osc2 = ctx.createOscillator();
      osc2.type = "square"; // For lower notes

      // Create gain nodes
      const gainNode1 = ctx.createGain();
      const gainNode2 = ctx.createGain();

      // Create a matrix-like digital delay effect
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.16; // Digitally precise delay

      const feedback = ctx.createGain();
      feedback.gain.value = 0.3; // Echo amount

      // Create filter for that matrix "digital rain" effect
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 3000;
      filter.Q.value = 1;

      // Connect melody path with effects
      osc1.connect(gainNode1);
      gainNode1.connect(filter);
      filter.connect(ctx.destination);

      // Connect delay network
      filter.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      feedback.connect(ctx.destination);

      // Connect bass oscillator
      osc2.connect(gainNode2);
      gainNode2.connect(ctx.destination);

      // Matrix-themed descending cascade (minor scale)
      const melodyNotes = [
        { time: 0.0, freq: 587.33, vol: 0.18 }, // D5
        { time: 0.1, freq: 523.25, vol: 0.18 }, // C5
        { time: 0.2, freq: 466.16, vol: 0.17 }, // A#4
        { time: 0.3, freq: 415.3, vol: 0.17 }, // G#4
        { time: 0.4, freq: 392.0, vol: 0.16 }, // G4
        { time: 0.5, freq: 349.23, vol: 0.16 }, // F4
        { time: 0.6, freq: 311.13, vol: 0.15 }, // D#4
        { time: 0.7, freq: 277.18, vol: 0.15 }, // C#4
        { time: 0.8, freq: 261.63, vol: 0.2 }, // C4 (slight accent)
        { time: 1.0, freq: 523.25, vol: 0.22 }, // C5 (final accent)
      ];

      // Bass notes to complement the melody
      const bassNotes = [
        { time: 0.0, freq: 65.41, vol: 0.17 }, // C2 bass
        { time: 0.5, freq: 73.42, vol: 0.17 }, // D2 bass
        { time: 1.0, freq: 65.41, vol: 0.2 }, // C2 bass (final)
      ];

      // Schedule all the melody notes
      melodyNotes.forEach((note) => {
        osc1.frequency.setValueAtTime(note.freq, now + note.time);
        gainNode1.gain.setValueAtTime(0, now + note.time);
        gainNode1.gain.linearRampToValueAtTime(
          note.vol,
          now + note.time + 0.02,
        );
        gainNode1.gain.exponentialRampToValueAtTime(
          0.001,
          now + note.time + 0.09,
        );
      });

      // Schedule the bass notes
      bassNotes.forEach((note) => {
        osc2.frequency.setValueAtTime(note.freq, now + note.time);
        gainNode2.gain.setValueAtTime(0, now + note.time);
        gainNode2.gain.linearRampToValueAtTime(
          note.vol,
          now + note.time + 0.05,
        );
        gainNode2.gain.exponentialRampToValueAtTime(
          0.001,
          now + note.time + 0.4,
        );
      });

      // Automate filter for sweep effect
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.linearRampToValueAtTime(5000, now + 0.6);
      filter.frequency.linearRampToValueAtTime(2000, now + 1.2);

      // Start and stop
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);
    }
    // Win Sound 2: Cyberpunk ascending chord progression
    else if (winVariation === 1) {
      // Create oscillator
      const osc1 = ctx.createOscillator();
      osc1.type = "square";

      const osc2 = ctx.createOscillator();
      osc2.type = "sawtooth";

      // Create gain nodes
      const gainNode1 = ctx.createGain();
      const gainNode2 = ctx.createGain();

      // Create filter for synth-like effect
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1000;
      filter.Q.value = 2;

      // Connect everything
      osc1.connect(gainNode1);
      osc2.connect(gainNode2);
      gainNode1.connect(filter);
      gainNode2.connect(filter);
      filter.connect(ctx.destination);

      // Cyberpunk-style chord progression (rising tension)
      const chordProgression = [
        { time: 0.0, freq1: 261.63, freq2: 311.13, vol: 0.15 }, // C4 + D#4
        { time: 0.2, freq1: 277.18, freq2: 349.23, vol: 0.15 }, // C#4 + F4
        { time: 0.4, freq1: 311.13, freq2: 369.99, vol: 0.16 }, // D#4 + F#4
        { time: 0.6, freq1: 349.23, freq2: 415.3, vol: 0.17 }, // F4 + G#4
        { time: 0.8, freq1: 415.3, freq2: 523.25, vol: 0.18 }, // G#4 + C5 (climax)
      ];

      // Schedule the chord progression
      chordProgression.forEach((chord) => {
        osc1.frequency.setValueAtTime(chord.freq1, now + chord.time);
        osc2.frequency.setValueAtTime(chord.freq2, now + chord.time);

        gainNode1.gain.setValueAtTime(0, now + chord.time);
        gainNode1.gain.linearRampToValueAtTime(
          chord.vol,
          now + chord.time + 0.05,
        );

        gainNode2.gain.setValueAtTime(0, now + chord.time);
        gainNode2.gain.linearRampToValueAtTime(
          chord.vol * 0.8,
          now + chord.time + 0.05,
        );

        // Fast decay except for final chord
        if (chord.time < 0.8) {
          gainNode1.gain.exponentialRampToValueAtTime(
            0.001,
            now + chord.time + 0.19,
          );
          gainNode2.gain.exponentialRampToValueAtTime(
            0.001,
            now + chord.time + 0.19,
          );
        }
      });

      // Final chord sustain and fade
      gainNode1.gain.setValueAtTime(0.18, now + 0.85);
      gainNode1.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      gainNode2.gain.setValueAtTime(0.14, now + 0.85);
      gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      // Filter sweep for the synth feel
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(3000, now + 0.8);
      filter.frequency.exponentialRampToValueAtTime(800, now + 1.3);

      // Start and stop
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);
    }
    // Win Sound 3: Digital glitch victory
    else {
      // Create oscillators
      const osc1 = ctx.createOscillator();
      osc1.type = "sawtooth";

      const osc2 = ctx.createOscillator();
      osc2.type = "square";

      // Create gain nodes
      const gainNode1 = ctx.createGain();
      const gainNode2 = ctx.createGain();

      // Create distortion for glitch effect
      const distortion = ctx.createWaveShaper();
      function makeDistortionCurve(amount) {
        const k = amount;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < n_samples; ++i) {
          const x = (i * 2) / n_samples - 1;
          curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
      }
      distortion.curve = makeDistortionCurve(10);

      // Connect everything
      osc1.connect(gainNode1);
      osc2.connect(gainNode2);
      gainNode1.connect(distortion);
      gainNode2.connect(ctx.destination);
      distortion.connect(ctx.destination);

      // Digital glitch sequence - rapid frequency changes
      const glitchSequence = [];

      // Generate random but musical frequency changes
      const baseFreqs = [261.63, 329.63, 392.0, 466.16, 523.25]; // C4, E4, G4, A#4, C5

      // Create 15 rapid glitch notes
      for (let i = 0; i < 15; i++) {
        const randomFreq =
          baseFreqs[Math.floor(Math.random() * baseFreqs.length)];
        const detune = (Math.random() - 0.5) * 20; // Slight random detune

        glitchSequence.push({
          time: i * 0.06,
          freq: randomFreq + detune,
          vol: 0.1 + Math.random() * 0.08,
        });
      }

      // Add final resolving notes
      glitchSequence.push({ time: 0.9, freq: 523.25, vol: 0.18 }); // C5
      glitchSequence.push({ time: 1.0, freq: 783.99, vol: 0.2 }); // G5

      // Schedule the glitch sequence for osc1
      glitchSequence.forEach((note) => {
        osc1.frequency.setValueAtTime(note.freq, now + note.time);
        gainNode1.gain.setValueAtTime(0, now + note.time);
        gainNode1.gain.linearRampToValueAtTime(
          note.vol,
          now + note.time + 0.02,
        );
        gainNode1.gain.exponentialRampToValueAtTime(
          0.001,
          now + note.time + 0.05,
        );
      });

      // Add a bass drone for stability
      osc2.frequency.setValueAtTime(65.41, now); // C2
      gainNode2.gain.setValueAtTime(0, now);
      gainNode2.gain.linearRampToValueAtTime(0.12, now + 0.1);
      gainNode2.gain.linearRampToValueAtTime(0.15, now + 0.9);
      gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      // Start and stop
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    }
  }, [soundEnabled, initAudioContext]);

  // Generate and play a "lose" sound (sad descending notes)
  const playLoseSound = useCallback(() => {
    if (!soundEnabled || !initAudioContext()) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Create oscillator
    const osc = ctx.createOscillator();
    osc.type = "sine";

    // Create gain node
    const gainNode = ctx.createGain();

    // Connect
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Play sad descending minor third
    osc.frequency.setValueAtTime(392, now); // G4
    osc.frequency.setValueAtTime(329.63, now + 0.3); // E4

    // Envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.15, now + 0.3);
    gainNode.gain.setValueAtTime(0.15, now + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    // Start and stop
    osc.start(now);
    osc.stop(now + 0.8);
  }, [soundEnabled, initAudioContext]);

  // Main playSound function that routes to specific sound generators
  const playSound = useCallback(
    (soundType) => {
      if (!soundEnabled) return;
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

      // Route to appropriate sound generator based on type
      switch (soundType) {
        case "correct":
          playCorrectSound();
          break;
        case "incorrect":
          playIncorrectSound();
          break;
        case "keyclick":
          playKeyClickSound();
          break;
        case "hint":
          playHintSound();
          break;
        case "win":
          playWinSound();
          break;
        case "lose":
          playLoseSound();
          break;
        default:
          // Default to keyclick for unknown sound types
          playKeyClickSound();
      }
    },
    [
      soundEnabled,
      initAudioContext,
      playCorrectSound,
      playIncorrectSound,
      playKeyClickSound,
      playHintSound,
      playWinSound,
      playLoseSound,
    ],
  );

  // Toggle sounds on/off - update both local state and settings context
  const toggleSounds = useCallback(() => {
    const newSoundState = !soundEnabled;

    // Update local state
    setSoundEnabled(newSoundState);

    // Update global settings context
    if (updateSettings) {
      updateSettings({
        ...settings,
        soundEnabled: newSoundState,
      });
      console.log(
        `Sound ${newSoundState ? "enabled" : "disabled"} - Updated settings context`,
      );
    } else {
      console.warn(
        "Could not update settings context - updateSettings is not available",
      );
    }
  }, [soundEnabled, settings, updateSettings]);

  // Unlock audio context on first user interaction
  const unlockAudioContext = useCallback(() => {
    // Try to initialize/resume audio context
    return initAudioContext();
  }, [initAudioContext]);

  // Return API
  return {
    playSound,
    soundEnabled,
    toggleSounds,
    unlockAudioContext,
    // Legacy compatibility properties
    soundsLoaded: true, // Always true since we generate sounds on demand
    loadSounds: unlockAudioContext, // For compatibility with old API
    loadProgress: () => 100, // Always 100% since no loading needed
  };
};

export default useSound;
