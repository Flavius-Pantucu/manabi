import confetti from "canvas-confetti";

export const triggerSakura = () => {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const randomInRange = (min: number, max: number) =>
    Math.random() * (max - min) + min;

  const interval: any = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Sakura petals (pink/white shades)
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ["#FFB7C5", "#FFC0CB", "#FFFFFF", "#F8C8DC"],
      shapes: ["circle"],
      scalar: randomInRange(0.4, 1),
      drift: randomInRange(-0.5, 0.5),
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ["#FFB7C5", "#FFC0CB", "#FFFFFF", "#F8C8DC"],
      shapes: ["circle"],
      scalar: randomInRange(0.4, 1),
      drift: randomInRange(-0.5, 0.5),
    });
  }, 250);
};

export const triggerSuccess = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#FFB7C5", "#FF69B4", "#FFFFFF"],
  });
};
