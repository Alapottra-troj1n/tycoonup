'use client';

import { MotionConfig } from 'framer-motion';

// Makes every framer-motion animation respect the OS "reduce motion"
// preference — the CSS catch-all in globals.css can't reach JS-driven tweens.
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
