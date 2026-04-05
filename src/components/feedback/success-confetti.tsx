"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

type SuccessConfettiProps = {
  active: boolean;
  variant?: "celebration" | "completion";
};

export function SuccessConfetti({
  active,
  variant = "celebration",
}: SuccessConfettiProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active || firedRef.current) {
      return;
    }

    firedRef.current = true;

    const isCompletion = variant === "completion";
    const colors = isCompletion
      ? ["#0F63FF", "#119da4", "#ffc857", "#655670"]
      : ["#0F63FF", "#6f8dff", "#ffc857"];

    void confetti({
      particleCount: isCompletion ? 140 : 90,
      spread: isCompletion ? 90 : 70,
      startVelocity: 42,
      ticks: 220,
      gravity: 0.95,
      scalar: 1.05,
      origin: { x: 0.5, y: 0.25 },
      colors,
      zIndex: 120,
      disableForReducedMotion: true,
    });

    const timeout = window.setTimeout(() => {
      void confetti({
        particleCount: isCompletion ? 100 : 70,
        angle: 120,
        spread: 60,
        startVelocity: 38,
        origin: { x: 0.1, y: 0.55 },
        colors,
        zIndex: 120,
        disableForReducedMotion: true,
      });
      void confetti({
        particleCount: isCompletion ? 100 : 70,
        angle: 60,
        spread: 60,
        startVelocity: 38,
        origin: { x: 0.9, y: 0.55 },
        colors,
        zIndex: 120,
        disableForReducedMotion: true,
      });
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [active, variant]);

  return null;
}
