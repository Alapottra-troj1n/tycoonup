'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EventLogEntry } from '@/lib/types';

const TYPE_COLORS: Record<string, string> = {
  move:   'var(--text-muted)',
  buy:    'var(--success)',
  rent:   'var(--neon-amber)',
  tax:    'var(--danger)',
  chest:  'var(--neon-cyan)',
  event:  'var(--neon-magenta)',
  jail:   'var(--neon-violet)',
  system: 'var(--text-faint)',
};

const TYPE_BORDER: Record<string, string> = {
  buy:   'var(--success)',
  rent:  'var(--neon-amber)',
  tax:   'var(--danger)',
  chest: 'var(--neon-cyan)',
  event: 'var(--neon-magenta)',
  jail:  'var(--neon-violet)',
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 8px',
        borderBottom: '1px solid var(--stroke-hairline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>
          Event log
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>live</span>
        </div>
      </div>

      {/* Log entries */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        <AnimatePresence initial={false}>
          {entries.map((entry) => {
            const borderColor = TYPE_BORDER[entry.type];
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'baseline',
                  padding: '7px 14px',
                  borderLeft: borderColor ? `2px solid ${borderColor}` : '2px solid transparent',
                  background: borderColor ? `oklch(from ${borderColor} l c h / 0.05)` : 'transparent',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', flexShrink: 0, minWidth: 28 }}>
                  {new Date(entry.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: TYPE_COLORS[entry.type] ?? 'var(--text-secondary)',
                }}>
                  {entry.message}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
