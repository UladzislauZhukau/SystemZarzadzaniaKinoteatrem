import { useEffect, useRef } from "react";

// Three parallax layers: nearer layers are bigger, brighter and move faster.
const LAYERS = [
  { count: 120, speed: 6, size: [0.4, 0.9], base: 0.35 },
  { count: 70, speed: 14, size: [0.7, 1.4], base: 0.55 },
  { count: 30, speed: 26, size: [1.1, 2.2], base: 0.8 },
];

export default function StarBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let stars = [];
    let animationId;
    let lastTime = performance.now();

    const rand = (min, max) => Math.random() * (max - min) + min;

    const buildStars = () => {
      stars = [];
      LAYERS.forEach((layer, layerIndex) => {
        for (let i = 0; i < layer.count; i++) {
          stars.push({
            layer: layerIndex,
            x: Math.random() * width,
            y: Math.random() * height,
            radius: rand(layer.size[0], layer.size[1]),
            // twinkle phase + rate so stars fade in/out out of sync
            phase: Math.random() * Math.PI * 2,
            twinkleRate: rand(0.5, 1.8),
          });
        }
      });
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    };

    const draw = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        const layer = LAYERS[star.layer];

        // Parallax drift downward; wrap around when off-screen.
        star.y += layer.speed * dt;
        if (star.y > height + star.radius) {
          star.y = -star.radius;
          star.x = Math.random() * width;
        }

        // Twinkle: opacity oscillates around the layer's base brightness.
        star.phase += star.twinkleRate * dt;
        const twinkle = 0.5 + 0.5 * Math.sin(star.phase);
        const opacity = Math.min(1, layer.base * (0.6 + 0.4 * twinkle) + 0.15 * twinkle);

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(233, 236, 245, ${opacity.toFixed(3)})`;
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
