"use client";
import { useId } from "react";
import { m } from "framer-motion";

interface FlameIconProps {
  className?: string;
}

/**
 * A two-layer flame in real fire colours: red tip fading to orange, with a
 * bright yellow core. The whole flame sways from its base and the core
 * pulses on its own beat, so it reads as flickering rather than rotating.
 * Transform and opacity only — reduced-motion is handled by MotionConfig.
 */
export function FlameIcon({ className }: FlameIconProps) {
  const uid = useId().replace(/:/g, "");
  const outerId = `flame-outer-${uid}`;
  const coreId = `flame-core-${uid}`;

  return (
    <m.svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      style={{
        transformOrigin: "50% 92%",
        filter: "drop-shadow(0 0 3px rgba(255, 110, 0, 0.55))",
      }}
      animate={{
        scale: [1, 1.1, 0.97, 1.07, 1],
        rotate: [0, -5, 4, -3, 0],
      }}
      transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id={outerId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2321B" />
          <stop offset="55%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
        <linearGradient id={coreId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD21F" />
          <stop offset="100%" stopColor="#FFF4A8" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${outerId})`}
        d="M12.6 1.6c.5 3.3-1.3 5-2.9 6.8C8 10.3 6.2 12.2 6.2 15.2a5.8 5.8 0 0 0 11.6 0c0-2.5-1-4.3-2.4-5.9-.3 1.5-1.1 2.4-2 2.8.5-3.5-.1-7.6-.8-10.5z"
      />
      <m.path
        fill={`url(#${coreId})`}
        style={{ transformOrigin: "50% 95%" }}
        animate={{ scale: [1, 1.14, 0.92, 1.08, 1], opacity: [0.95, 1, 0.85, 1, 0.95] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        d="M12 21.4a3.5 3.5 0 0 0 3.5-3.5c0-1.9-1.2-3-2.1-4.3-.4 1-1 1.5-1.6 1.9-1 .8-3.3 1.6-3.3 3.9A3.5 3.5 0 0 0 12 21.4z"
      />
    </m.svg>
  );
}
