"use client";

import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";

/**
 * Single motion runtime for the whole app.
 *
 * Two jobs:
 *
 * 1. `reducedMotion="user"` honours the OS "reduce motion" setting for every
 *    framer-motion animation in the tree — transforms and opacity fades stop
 *    animating and jump to their end state. Vestibular disorders and motion
 *    sickness make sweeping transitions genuinely unpleasant, and the setting
 *    is the accessibility contract for saying so. CSS keyframe animations are
 *    handled separately in globals.css, since MotionConfig can't reach them.
 *
 * 2. `LazyMotion` + `domAnimation` ships the ~5kb animation feature set rather
 *    than the full ~34kb `motion` bundle. This only pays off if every animated
 *    element in the tree uses the `m` component instead of `motion` — importing it
 *    anywhere pulls the whole bundle back in and silently undoes the saving.
 *    `strict` turns that mistake into a runtime error instead of a size
 *    regression nobody notices for six months.
 *
 * `domAnimation` deliberately excludes layout animations and drag. Nothing in
 * this codebase uses either (no `layout`/`layoutId` props, no framer drag —
 * the image reorder uses dnd-kit). If layout animations are ever needed,
 * switch to `domMax`, which costs roughly 10kb more.
 */
export default function MotionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
