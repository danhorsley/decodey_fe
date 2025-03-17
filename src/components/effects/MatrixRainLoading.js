import React, { useRef, useEffect } from "react";

/**
 * MatrixRainLoading - A specialized Matrix Rain effect for loading screens
 * Optimized for performance with fewer drops and simplified rendering
 */
const MatrixRainLoading = ({
  active = true,
  color = "#00ff41",
  containerClassName = "",
  width = "100%",
  height = "200px",
  density = 30,
  message = null,
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Set canvas to container size
    const resize = () => {
      const container = canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      } else {
        // Fallback if no parent container
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
    };

    // Initialize
    resize();
    window.addEventListener("resize", resize);

    // Character set for Matrix rain - binary + a few symbols
    let chars = "01";

    // Add a few katakana characters for authentic matrix effect (but fewer than the full version)
    for (let i = 0x30a0; i <= 0x30ff; i += 5) {
      // Step by 5 to use fewer characters
      chars += String.fromCharCode(i);
    }

    // Add a few special characters
    chars += "♠♥♦♣«»≡≈≠≤≥";

    const fontSize = 14;
    const columns = Math.ceil(canvas.width / fontSize);

    // Array to store drops
    const drops = [];
    const speeds = [];

    // Initialize all drops
    for (let i = 0; i < columns; i++) {
      // Start at random position
      drops[i] = Math.floor((Math.random() * -canvas.height) / fontSize);

      // Using more uniform speeds for loading indicator
      speeds[i] = Math.random() * 0.3 + 0.7;
    }

    // Draw function
    const draw = () => {
      // Semi-transparent black to create trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set font
      ctx.font = `${fontSize}px monospace`;

      // Loop through drops
      for (let i = 0; i < drops.length; i++) {
        // Integer position
        const y = Math.floor(drops[i]);

        // Only draw if within bounds
        if (y >= 0 && y < canvas.height / fontSize) {
          // Select a random character
          const text = chars.charAt(Math.floor(Math.random() * chars.length));

          // Calculate opacity based on position
          const headOpacity = 1;

          // Draw character with full brightness
          ctx.fillStyle = color;
          ctx.fillText(text, i * fontSize, y * fontSize);

          // Draw just a few trailing characters for better performance
          for (let j = 1; j < 5; j++) {
            if (y - j >= 0) {
              // Exponential decay of brightness
              const trailOpacity = headOpacity * Math.pow(0.8, j);

              // Skip if too dim
              if (trailOpacity < 0.05) continue;

              // Random character for trail
              const trailChar = chars.charAt(
                Math.floor(Math.random() * chars.length),
              );

              // Calculate color with opacity
              const trailColor = color.startsWith("#")
                ? `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${trailOpacity})`
                : color;

              ctx.fillStyle = trailColor;
              ctx.fillText(trailChar, i * fontSize, (y - j) * fontSize);
            }
          }
        }

        // Move drops down
        drops[i] += speeds[i];

        // Reset when off-screen with random chance
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.98) {
          drops[i] = Math.floor(Math.random() * -20);
        }
      }

      // Add loading message if provided
      if (message) {
        const messageX = canvas.width / 2;
        const messageY = canvas.height / 2;

        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";

        // Add subtle shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillText(message, messageX, messageY);

        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
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

    // Cleanup
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [active, color, density, message]);

  return (
    <div
      className={`matrix-rain-loading ${containerClassName}`}
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        borderRadius: "8px",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};

export default MatrixRainLoading;
