'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EventLogEntry } from '@/lib/types';
import { HomeIcon, TaxIcon, ChestIcon, BoltIcon, ChainIcon } from './icons';

type IconRenderer = ((p: { size?: number }) => React.JSX.Element) | null;

const TYPE_META: Record<string, { color: string; Icon: IconRenderer }> = {
  move:   { color: 'var(--text-muted)',    Icon: null },
  buy:    { color: 'var(--success)',       Icon: HomeIcon },
  rent:   { color: 'var(--gold)',          Icon: TaxIcon },
  tax:    { color: 'var(--danger)',        Icon: TaxIcon },
  chest:  { color: 'var(--neon-cyan)',     Icon: ChestIcon },
  event:  { color: 'var(--neon-magenta)',  Icon: BoltIcon },
  jail:   { color: 'var(--neon-violet)',   Icon: ChainIcon },
  system: { color: 'var(--text-faint)',    Icon: null },
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
        padding: '13px 16px 10px',
        borderBottom: '1px solid var(--stroke-hairline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>
          Activity
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>live</span>
        </div>
      </div>

      {/* Log entries */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        <AnimatePresence initial={false}>
          {entries.map((entry) => {
            const meta = TYPE_META[entry.type] ?? TYPE_META.system;
            const emphasized = entry.type !== 'move' && entry.type !== 'system';
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{
                  display: 'flex',
                  gap: 9,
                  alignItems: 'flex-start',
                  padding: '7px 14px',
                  background: emphasized ? `oklch(from ${meta.color} l c h / 0.05)` : 'transparent',
                  borderLeft: emphasized ? `2px solid ${meta.color}` : '2px solid transparent',
                }}
              >
                <span style={{
                  width: 16, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 17,
                  color: meta.color,
                }}>
                  {meta.Icon ? meta.Icon({ size: 11 }) : <span style={{ fontSize: 13, lineHeight: '17px' }}>·</span>}
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  color: emphasized ? 'var(--text-secondary)' : 'var(--text-muted)',
                  flex: 1,
                }}>
                  {entry.message}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-faint)',
                  flexShrink: 0, paddingTop: 2,
                }}>
                  {new Date(entry.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}
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
