import React, { useRef, useEffect } from "react";

const MatrixRain = ({
  active = true,
  color = "#00ff41",
  density = 50,
  fadeSpeed = 0.05,
  speedFactor = 1,
  includeKatakana = true,
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas to full window size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Initialize
    resize();
    window.addEventListener("resize", resize);

    // Character set for Matrix rain - binary + optional katakana
    let chars = "01";

    // Add katakana characters for more authentic matrix effect
    if (includeKatakana) {
      // Range of katakana characters in unicode
      for (let i = 0x30a0; i <= 0x30ff; i++) {
        chars += String.fromCharCode(i);
      }
      // Add some special unicode characters
      chars += "・ー「」";
    }

    // Add special characters for cryptographic feel
    chars += "♠♥♦♣★☆⋆§¶†‡※⁂⁑⁎⁕≡≈≠≤≥÷«»";

    // Configure drops
    const fontSize = 14;
    const columns = Math.ceil(canvas.width / fontSize);

    // Array to store drops - one per column
    const drops = [];

    // Array to store speeds for each drop
    const speeds = [];

    // Initialize all drops
    for (let i = 0; i < columns; i++) {
      // Start at random position
      drops[i] = Math.floor((Math.random() * -canvas.height) / fontSize);
      // Randomize speed
      speeds[i] = (Math.random() * 0.5 + 0.5) * speedFactor;
    }

    // Function to draw Matrix rain effect
    const draw = () => {
      // Semi-transparent black to create trail effect
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeSpeed * 1.5})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set font
      ctx.font = `${fontSize}px monospace`;

      // Loop through drops
      for (let i = 0; i < drops.length; i++) {
        // Get integer position
        const y = Math.floor(drops[i]);

        // Only draw if within screen bounds
        if (y >= 0 && y < canvas.height / fontSize) {
          // Select a random character
          const text = chars.charAt(Math.floor(Math.random() * chars.length));

          // Create head glow effect (brightest at the head of the stream)
          const headOpacity = 1;
          const tailFactor = 0.8;

          // Draw the character at head with full brightness
          ctx.fillStyle = color;
          ctx.fillText(text, i * fontSize, y * fontSize);

          // Update opacities for trailing characters
          for (let j = 1; j < 20; j++) {
            if (y - j >= 0) {
              // Exponential decay of brightness
              const trailOpacity = headOpacity * Math.pow(tailFactor, j);

              // Skip if too dim
              if (trailOpacity < 0.05) continue;

              // Select a random character for trail
              const trailChar = chars.charAt(
                Math.floor(Math.random() * chars.length),
              );

              // Draw trail character with reduced opacity
              const trailColor = color.startsWith("#")
                ? `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${trailOpacity})`
                : color;

              ctx.fillStyle = trailColor;
              ctx.fillText(trailChar, i * fontSize, (y - j) * fontSize);
            }
          }
        }

        // Move the drop down
        drops[i] += speeds[i];

        // Reset drop when it goes below screen with random chance
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = Math.floor(Math.random() * -20);
          speeds[i] = (Math.random() * 0.5 + 0.5) * speedFactor;
        }
      }
    };

    // Animation loop
    let animationId;
    const animate = () => {
      draw();
      animationId = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Cleanup function
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [active, color, density, fadeSpeed, speedFactor, includeKatakana]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 999,
        pointerEvents: "none",
      }}
    />
  );
};

export default MatrixRain;
