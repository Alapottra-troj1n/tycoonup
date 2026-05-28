'use client';

import { motion } from 'framer-motion';
import type { Player } from '@/lib/types';
import { useMemo } from 'react';

interface PlayerMascotProps {
  player: Player;
  size?: number;
  index?: number;
  total?: number;
}

const NEON_GLOWS: Record<string, string> = {
  cyan: 'rgba(34, 211, 238, 0.45)',
  magenta: 'rgba(236, 72, 153, 0.45)',
  lime: 'rgba(132, 204, 22, 0.45)',
  amber: 'rgba(245, 158, 11, 0.45)',
  violet: 'rgba(168, 85, 247, 0.45)',
  rose: 'rgba(244, 63, 94, 0.45)',
};

export default function PlayerMascot({ player, size = 26, index = 0, total = 1 }: PlayerMascotProps) {
  // Stagger the floating animation based on player ID or index so all mascots don't bob in perfect sync
  const staggerDelay = useMemo(() => {
    if (!player.id) return index * 0.2;
    let sum = 0;
    for (let i = 0; i < player.name.length; i++) {
      sum += player.name.charCodeAt(i);
    }
    return (sum % 10) * 0.25;
  }, [player.id, player.name, index]);

  const glowColor = NEON_GLOWS[player.color] ?? NEON_GLOWS.cyan;

  // Determine overlaps and styling for multiple players occupying the same tile
  // If there are multiple players, we offset them slightly
  const offsetStyle = useMemo(() => {
    if (total <= 1) return {};
    const offsetStep = 6;
    const midIdx = (total - 1) / 2;
    const offsetAmt = (index - midIdx) * offsetStep;
    return {
      transform: `translateX(${offsetAmt}px)`,
      zIndex: index + 5,
    };
  }, [index, total]);

  return (
    <motion.div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        boxShadow: `0 3px 8px rgba(0, 0, 0, 0.5), 0 0 10px ${glowColor}`,
        border: '1.5px solid oklch(1 0 0 / 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'default',
        flexShrink: 0,
        backgroundColor: '#11131e',
        ...offsetStyle,
      }}
      whileHover={{
        scale: 1.15,
        boxShadow: `0 4px 12px rgba(0,0,0,0.6), 0 0 16px ${glowColor}`,
        transition: { duration: 0.15 },
      }}
      layoutId={`mascot-${player.id}`} // framer-motion magic: automatically animate position moves!
      transition={{
        layout: {
          type: 'tween',
          ease: 'easeOut',
          duration: 0.22,
        }
      }}
    >
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
        {renderMascotSVG(player.color)}
      </div>
    </motion.div>
  );
}

// ─── HIGH-FIDELITY CUTE CHARACTER VECTOR MASCOTS ───────────────────────────────

export function renderMascotSVG(color: string) {
  switch (color) {
    case 'cyan':
      return (
        // Adorable Light-Blue Blob / Alien
        <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="m-grad-cyan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.85 0.12 210)" />
              <stop offset="100%" stopColor="oklch(0.55 0.15 210)" />
            </linearGradient>
          </defs>
          {/* Main body */}
          <circle cx="16" cy="16" r="15" fill="url(#m-grad-cyan)" />
          
          {/* Adorable shiny eyes */}
          <circle cx="10.5" cy="14.5" r="2.8" fill="#0f172a" />
          <circle cx="21.5" cy="14.5" r="2.8" fill="#0f172a" />
          {/* Eye reflections */}
          <circle cx="9.5" cy="13.5" r="0.9" fill="#ffffff" />
          <circle cx="11.2" cy="15.2" r="0.4" fill="#ffffff" />
          <circle cx="20.5" cy="13.5" r="0.9" fill="#ffffff" />
          <circle cx="22.2" cy="15.2" r="0.4" fill="#ffffff" />

          {/* Glowing rosy cheeks */}
          <ellipse cx="8.5" cy="18" rx="2" ry="1" fill="#ec4899" opacity="0.6" />
          <ellipse cx="23.5" cy="18" rx="2" ry="1" fill="#ec4899" opacity="0.6" />

          {/* Super cute smile */}
          <path d="M 14.5 18.2 Q 16 19.8 17.5 18.2" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );

    case 'magenta':
      return (
        // Adorable Pink Kitty / Bunny
        <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="m-grad-magenta" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.82 0.14 340)" />
              <stop offset="100%" stopColor="oklch(0.56 0.18 340)" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="15" fill="url(#m-grad-magenta)" />
          
          {/* Stylized cute bunny ears inside upper part */}
          <path d="M 9 9 Q 7 3 10 3 Q 13 3 12 9" fill="#fbcfe8" stroke="#0f172a" strokeWidth="0.8" />
          <path d="M 23 9 Q 25 3 22 3 Q 19 3 20 9" fill="#fbcfe8" stroke="#0f172a" strokeWidth="0.8" />

          {/* Anime glossy eyes */}
          <circle cx="11.5" cy="15" r="2.6" fill="#1e1b4b" />
          <circle cx="20.5" cy="15" r="2.6" fill="#1e1b4b" />
          {/* Reflection */}
          <circle cx="10.7" cy="14" r="0.8" fill="#ffffff" />
          <circle cx="19.7" cy="14" r="0.8" fill="#ffffff" />
          
          {/* Rosy cheeks */}
          <ellipse cx="9" cy="18.5" rx="1.8" ry="0.9" fill="#f43f5e" opacity="0.65" />
          <ellipse cx="23" cy="18.5" rx="1.8" ry="0.9" fill="#f43f5e" opacity="0.65" />

          {/* Kawaii "w" mouth */}
          <path d="M 14 18 Q 15 19 16 18 Q 17 19 18 18" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'lime':
      return (
        // Adorable Green Frog
        <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="m-grad-lime" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.85 0.14 145)" />
              <stop offset="100%" stopColor="oklch(0.60 0.17 145)" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="15" fill="url(#m-grad-lime)" />
          
          {/* Raised frog eye sockets */}
          <circle cx="10" cy="8" r="4.5" fill="url(#m-grad-lime)" />
          <circle cx="22" cy="8" r="4.5" fill="url(#m-grad-lime)" />
          
          {/* Big black eyes inside sockets */}
          <circle cx="10" cy="8.5" r="2.8" fill="#022c22" />
          <circle cx="22" cy="8.5" r="2.8" fill="#022c22" />
          {/* Gloss */}
          <circle cx="9" cy="7.5" r="1" fill="#ffffff" />
          <circle cx="21" cy="7.5" r="1" fill="#ffffff" />
          <circle cx="11" cy="9.5" r="0.4" fill="#ffffff" />
          <circle cx="23" cy="9.5" r="0.4" fill="#ffffff" />

          {/* Happy blushing cheeks */}
          <circle cx="7.5" cy="16.5" r="1.8" fill="#ea580c" opacity="0.5" />
          <circle cx="24.5" cy="16.5" r="1.8" fill="#ea580c" opacity="0.5" />

          {/* Big happy open frog smile */}
          <path d="M 11 16.5 Q 16 20.5 21 16.5" stroke="#022c22" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'amber':
      return (
        // Adorable Golden/Orange Bear
        <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="m-grad-amber" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.85 0.13 72)" />
              <stop offset="100%" stopColor="oklch(0.62 0.15 72)" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="15" fill="url(#m-grad-amber)" />
          
          {/* Cute rounded bear ears at corners */}
          <circle cx="7" cy="8" r="3.8" fill="url(#m-grad-amber)" />
          <circle cx="7" cy="8" r="2" fill="#ffedd5" />
          <circle cx="25" cy="8" r="3.8" fill="url(#m-grad-amber)" />
          <circle cx="25" cy="8" r="2" fill="#ffedd5" />

          {/* Smiling curved closed eyes */}
          <path d="M 8 13.5 Q 11 11.5 13 14" stroke="#451a03" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 24 13.5 Q 21 11.5 19 14" stroke="#451a03" strokeWidth="1.6" strokeLinecap="round" />

          {/* Soft cream muzzle */}
          <ellipse cx="16" cy="19.5" rx="5" ry="3.5" fill="#fef3c7" />
          {/* Heart nose */}
          <path d="M 15 18 C 15 17.5 17 17.5 17 18 C 17 18.5 16 19.3 16 19.3 C 16 19.3 15 18.5 15 18 Z" fill="#451a03" />
          {/* Smile line */}
          <path d="M 16 19.3 L 16 20.5 Q 16 21.5 14.5 21.5 M 16 20.5 Q 16 21.5 17.5 21.5" stroke="#451a03" strokeWidth="1" strokeLinecap="round" />
          
          {/* Blush */}
          <ellipse cx="9" cy="17.5" rx="1.5" ry="0.8" fill="#f97316" opacity="0.4" />
          <ellipse cx="23" cy="17.5" rx="1.5" ry="0.8" fill="#f97316" opacity="0.4" />
        </svg>
      );

    case 'violet':
      return (
        // Adorable Purple Alien/Octopus
        <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="m-grad-violet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.80 0.14 290)" />
              <stop offset="100%" stopColor="oklch(0.55 0.16 290)" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="15" fill="url(#m-grad-violet)" />
          
          {/* Cute antenna */}
          <path d="M 16 5 L 16 1.5" stroke="url(#m-grad-violet)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="1" r="1.5" fill="#f3e8ff" />

          {/* Sparkly cartoon eyes */}
          <circle cx="10" cy="14" r="2.8" fill="#2e1065" />
          <circle cx="22" cy="14" r="2.8" fill="#2e1065" />
          {/* Sparkle star design (simulated via overlapping circles) */}
          <circle cx="9.2" cy="13.2" r="1" fill="#ffffff" />
          <circle cx="11.2" cy="14.8" r="0.5" fill="#ffffff" />
          <circle cx="21.2" cy="13.2" r="1" fill="#ffffff" />
          <circle cx="23.2" cy="14.8" r="0.5" fill="#ffffff" />

          {/* Cheeks */}
          <ellipse cx="8.5" cy="17.5" rx="1.8" ry="0.9" fill="#d946ef" opacity="0.6" />
          <ellipse cx="23.5" cy="17.5" rx="1.8" ry="0.9" fill="#d946ef" opacity="0.6" />

          {/* Cute surprised o mouth */}
          <circle cx="16" cy="18.5" r="1.6" fill="#2e1065" />
        </svg>
      );

    case 'rose':
      return (
        // Adorable Rose/Red Panda Mascot
        <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
          <defs>
            <linearGradient id="m-grad-rose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.80 0.14 18)" />
              <stop offset="100%" stopColor="oklch(0.55 0.17 18)" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="15" fill="url(#m-grad-rose)" />
          
          {/* Fluffy Red Panda ears */}
          <path d="M 5 10 Q 1 6 6 4 Q 11 2 9 8" fill="url(#m-grad-rose)" stroke="#4c0519" strokeWidth="0.5" />
          <path d="M 6 9 Q 3.5 6 6.5 5 Q 9.5 4 8 8" fill="#ffe4e6" />
          
          <path d="M 27 10 Q 31 6 26 4 Q 21 2 23 8" fill="url(#m-grad-rose)" stroke="#4c0519" strokeWidth="0.5" />
          <path d="M 26 9 Q 28.5 6 25.5 5 Q 22.5 4 24 8" fill="#ffe4e6" />

          {/* White cheek patches */}
          <ellipse cx="6" cy="19" rx="3.5" ry="5" fill="#ffe4e6" transform="rotate(-15 6 19)" />
          <ellipse cx="26" cy="19" rx="3.5" ry="5" fill="#ffe4e6" transform="rotate(15 26 19)" />

          {/* Happy cartoon eyes */}
          <circle cx="11" cy="14" r="2.5" fill="#4c0519" />
          <circle cx="21" cy="14" r="2.5" fill="#4c0519" />
          {/* Ref */}
          <circle cx="10.2" cy="13.2" r="0.8" fill="#ffffff" />
          <circle cx="20.2" cy="13.2" r="0.8" fill="#ffffff" />

          {/* Cute black nose */}
          <ellipse cx="16" cy="16.2" rx="1.3" ry="0.8" fill="#4c0519" />

          {/* Happy blushing cheeks */}
          <circle cx="8" cy="17.5" r="1.5" fill="#ec4899" opacity="0.4" />
          <circle cx="24" cy="17.5" r="1.5" fill="#ec4899" opacity="0.4" />

          {/* Warm open mouth smile */}
          <path d="M 13.5 18 C 13.5 18 14.5 21 16 21 C 17.5 21 18.5 18 18.5 18 Z" fill="#9f1239" />
          {/* Cute upper lip line */}
          <path d="M 13.5 18 Q 15 19 16 18 Q 17 19 18.5 18" stroke="#4c0519" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <circle cx="16" cy="16" r="15" fill="#64748b" />
        </svg>
      );
  }
}
