'use client';

import { useLayoutEffect, useState, useMemo, useRef } from 'react';

interface ThreeDDiceProps {
  n: number;
  size?: number;
  spinning?: boolean;
}

// Coordinate layout of dots for each face of a die (relative % values)
const DOT_COORDINATES: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[26, 26], [74, 74]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[26, 26], [74, 26], [26, 74], [74, 74]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[26, 26], [74, 26], [26, 50], [74, 50], [26, 74], [74, 74]],
};

// Target Euler angles to bring each face facing direct center to the user:
// 1 = Front, 6 = Back, 3 = Left, 4 = Right, 2 = Top, 5 = Bottom
const FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  3: { x: 0, y: 90 },
  4: { x: 0, y: -90 },
  2: { x: -90, y: 0 },
  5: { x: 90, y: 0 },
};

export default function ThreeDDice({ n, size = 80, spinning = false }: ThreeDDiceProps) {
  const halfSize = size / 2;

  const [rotation, setRotation] = useState({ x: -18, y: 22, z: 0 });
  const [wasSpinning, setWasSpinning] = useState(false);
  const [justLanded, setJustLanded] = useState(false);
  const prevSpinningRef = useRef(spinning);

  useLayoutEffect(() => {
    if (spinning) {
      setWasSpinning(true);
      setJustLanded(false);
      // Continuous randomized tumble while rolling
      const tumble = () => setRotation({
        x: Math.floor(Math.random() * 360 * 3) + 360,
        y: Math.floor(Math.random() * 360 * 3) + 360,
        z: Math.floor(Math.random() * 160) - 80,
      });
      tumble();
      const interval = setInterval(tumble, 160);
      prevSpinningRef.current = true;
      return () => clearInterval(interval);
    } else {
      const target = FACE_ROTATIONS[n] ?? FACE_ROTATIONS[1];
      const transitionedFromSpin = prevSpinningRef.current;

      setRotation({
        // settle with a slight cocked angle so the cube keeps its 3D presence
        x: target.x + (transitionedFromSpin ? 720 : 0) - 14,
        y: target.y + (transitionedFromSpin ? 720 : 0) + 16,
        z: 0,
      });

      setWasSpinning(transitionedFromSpin);
      prevSpinningRef.current = false;

      if (transitionedFromSpin) {
        setJustLanded(true);
        const t = setTimeout(() => setJustLanded(false), 900);
        return () => clearTimeout(t);
      }
    }
  }, [spinning, n]);

  // CSS Styles for each of the 6 cube faces
  const faces = useMemo(() => {
    return [
      { id: 1, style: { transform: `rotateY(0deg) translateZ(${halfSize}px)` } },     // Front (1)
      { id: 6, style: { transform: `rotateY(180deg) translateZ(${halfSize}px)` } },   // Back (6)
      { id: 3, style: { transform: `rotateY(-90deg) translateZ(${halfSize}px)` } },   // Left (3)
      { id: 4, style: { transform: `rotateY(90deg) translateZ(${halfSize}px)` } },    // Right (4)
      { id: 2, style: { transform: `rotateX(90deg) translateZ(${halfSize}px)` } },    // Top (2)
      { id: 5, style: { transform: `rotateX(-90deg) translateZ(${halfSize}px)` } },   // Bottom (5)
    ];
  }, [halfSize]);

  return (
    <div
      style={{
        width: size,
        height: size + size * 0.22,
        display: 'inline-block',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Ground shadow — squashes and breathes with the roll */}
      <div
        style={{
          position: 'absolute',
          left: '8%',
          right: '8%',
          bottom: 0,
          height: size * 0.16,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, oklch(0 0 0 / 0.55) 0%, transparent 70%)',
          opacity: spinning ? 0.18 : 0.42,
          transform: spinning ? 'scale(0.6)' : 'scale(1)',
          transition: 'opacity 400ms var(--ease-out), transform 400ms var(--ease-out)',
          animation: justLanded ? 'tu-dice-shadow 700ms var(--ease-out)' : undefined,
          filter: 'blur(2px)',
        }}
      />

      {/* Bounce wrapper — vertical hop on landing, still at rest */}
      <div
        style={{
          width: size,
          height: size,
          position: 'absolute',
          top: 0,
          perspective: `${size * 9}px`,
          animation: justLanded ? 'tu-dice-land 700ms var(--ease-out)' : undefined,
          transform: spinning ? `translateY(-${size * 0.10}px)` : undefined,
          transition: 'transform 300ms var(--ease-out)',
        }}
      >
        {/* 3D Cube */}
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
            transition: spinning
              ? 'transform 160ms linear'
              : wasSpinning
                ? 'transform 0.85s cubic-bezier(0.18, 0.89, 0.32, 1.18)'
                : 'transform 400ms var(--ease-out)',
          }}
        >
          {faces.map(({ id, style }) => (
            <div
              key={id}
              style={{
                position: 'absolute',
                width: size,
                height: size,
                // Warm ivory material with a beveled top-light
                background: 'linear-gradient(145deg, oklch(0.995 0.008 90) 0%, oklch(0.955 0.012 85) 55%, oklch(0.90 0.015 80) 100%)',
                border: '1px solid oklch(0.82 0.015 80)',
                borderRadius: size * 0.18,
                boxShadow:
                  'inset 0 2px 4px oklch(1 0 0 / 0.9), inset 0 -3px 8px oklch(0.4 0.03 70 / 0.18), 0 2px 6px oklch(0 0 0 / 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...style,
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {(DOT_COORDINATES[id] ?? []).map((dot, index) => {
                  const dotSize = size * 0.14;
                  const offset = dotSize / 2;
                  return (
                    <div
                      key={index}
                      style={{
                        position: 'absolute',
                        left: `calc(${dot[0]}% - ${offset}px)`,
                        top: `calc(${dot[1]}% - ${offset}px)`,
                        width: dotSize,
                        height: dotSize,
                        borderRadius: '50%',
                        // Engraved pips; classic red ace
                        background: id === 1
                          ? 'radial-gradient(circle at 35% 32%, oklch(0.52 0.18 25) 0%, oklch(0.30 0.13 25) 100%)'
                          : 'radial-gradient(circle at 35% 32%, oklch(0.34 0.03 260) 0%, oklch(0.14 0.015 260) 100%)',
                        boxShadow: 'inset 0 2px 3px oklch(0 0 0 / 0.65), 0 1px 0 oklch(1 0 0 / 0.85)',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
