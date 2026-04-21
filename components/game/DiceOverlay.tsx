'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiceOverlayProps {
  roll: [number, number] | null;
  animating: boolean;
  playerName?: string;
}

const DOTS: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]],
};

function Die({ value, spinning }: { value: number; spinning: boolean }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!spinning) {
      setDisplay(value);
      return;
    }
    let count = 0;
    const interval = setInterval(() => {
      setDisplay(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 14) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, [spinning, value]);

  return (
    <motion.div
      className="relative w-16 h-16 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        border: '2px solid rgba(0,245,255,0.4)',
        boxShadow: spinning
          ? '0 0 20px rgba(0,245,255,0.6), inset 0 0 10px rgba(0,245,255,0.1)'
          : '0 0 10px rgba(0,245,255,0.3)',
      }}
      animate={spinning ? { rotate: [0, 15, -15, 10, -10, 5, -5, 0] } : { rotate: 0 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
    >
      <div className="absolute inset-2 grid grid-cols-3 grid-rows-3">
        {(DOTS[display] ?? []).map(([r, c], i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{ gridRow: r + 1, gridColumn: c + 1 }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: '#00f5ff',
                boxShadow: '0 0 4px #00f5ff',
              }}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function DiceOverlay({ roll, animating, playerName }: DiceOverlayProps) {
  if (!roll && !animating) return null;

  const d1 = roll?.[0] ?? 1;
  const d2 = roll?.[1] ?? 1;

  return (
    <AnimatePresence>
      {(roll || animating) && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="flex flex-col items-center gap-4 px-10 py-8 rounded-2xl"
            style={{
              background: 'rgba(10,10,26,0.9)',
              border: '1px solid rgba(0,245,255,0.3)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 60px rgba(0,245,255,0.15)',
            }}
            initial={{ scale: 0.6, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {playerName && (
              <p className="text-slate-400 text-sm font-medium tracking-wide">
                {playerName} is rolling…
              </p>
            )}
            <div className="flex gap-6">
              <Die value={d1} spinning={animating} />
              <Die value={d2} spinning={animating} />
            </div>
            {!animating && roll && (
              <motion.p
                className="text-white font-bold text-lg"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ textShadow: '0 0 10px rgba(0,245,255,0.6)' }}
              >
                Total: {d1 + d2}
                {d1 === d2 && (
                  <span className="ml-2 text-yellow-400 text-sm">Doubles!</span>
                )}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
