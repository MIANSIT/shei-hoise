"use client";

import { m, AnimatePresence } from "framer-motion";

interface LoadingSwapProps {
  /** True while the skeleton should be shown. */
  loading: boolean;
  /** The skeleton to render while loading. */
  skeleton: React.ReactNode;
  /** The real content, rendered once loading finishes. */
  children: React.ReactNode;
  /** Distinguishes the content branch when several swaps share a parent. */
  contentKey?: string;
}

/**
 * Crossfades a skeleton into its real content.
 *
 * Swapping the two outright makes the page flash: the skeleton vanishes on one
 * frame and fully-formed content appears on the next, which reads as a glitch
 * rather than as loading finishing. A short overlap makes the same wait feel
 * deliberate — the perceived-performance win is in the transition, not in the
 * skeleton itself, which this codebase already has 21 of.
 *
 * Deliberately asymmetric: content fades in slightly slower than the skeleton
 * fades out, so the eye lands on the content rather than on empty space. The
 * upward drift is 4px — enough to read as arrival, small enough not to shift
 * layout perceptibly. Under `prefers-reduced-motion` MotionConfig collapses
 * both to an instant swap.
 */
export default function LoadingSwap({
  loading,
  skeleton,
  children,
  contentKey = "content",
}: LoadingSwapProps) {
  return (
    <AnimatePresence mode='wait' initial={false}>
      {loading ? (
        <m.div
          key='skeleton'
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {skeleton}
        </m.div>
      ) : (
        <m.div
          key={contentKey}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}
