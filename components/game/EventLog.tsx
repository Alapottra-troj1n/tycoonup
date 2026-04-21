'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EventLogEntry } from '@/lib/types';

const TYPE_COLORS: Record<string, string> = {
  move:   '#94a3b8',
  buy:    '#00ff88',
  rent:   '#ff7700',
  tax:    '#ff4444',
  chest:  '#00d4ff',
  event:  '#ffcc00',
  jail:   '#ff00ff',
  system: '#64748b',
};

interface EventLogProps {
  entries: EventLogEntry[];
}

export default function EventLog({ entries }: EventLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        background: 'rgba(6,9,18,0.85)',
        border: '1px solid rgba(100,116,139,0.2)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="px-3 py-2 border-b"
        style={{ borderColor: 'rgba(100,116,139,0.15)' }}
      >
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
          Event Log
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin">
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex gap-2 items-start"
            >
              <span
                className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
                style={{ backgroundColor: TYPE_COLORS[entry.type] ?? '#555' }}
              />
              <p
                className="text-xs leading-relaxed"
                style={{ color: TYPE_COLORS[entry.type] ?? '#94a3b8' }}
              >
                {entry.message}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
