'use client';

import { useLayoutEffect, useState, useId, useMemo, useRef } from 'react';

interface ThreeDDiceProps {
  n: number;
  size?: number;
  spinning?: boolean;
}

// Coordinate layout of dots for each face of a die (relative % values)
const DOT_COORDINATES: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
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
  const uid = useId();
  const halfSize = size / 2;

  // We track the rotations (in degrees) to apply to the cube wrapper
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [wasSpinning, setWasSpinning] = useState(false);

  // We track the previous spinning state using a ref
  const prevSpinningRef = useRef(spinning);

  useLayoutEffect(() => {
    if (spinning) {
      setWasSpinning(true);
      // While spinning, generate large, randomized tumbling angles
      // to create a rich physical rolling animation.
      // We also set up an interval to repeatedly shake the angles during the spin.
      const interval = setInterval(() => {
        setRotation({
          x: Math.floor(Math.random() * 360 * 3) + 360,
          y: Math.floor(Math.random() * 360 * 3) + 360,
          z: Math.floor(Math.random() * 180) - 90,
        });
      }, 150);

      prevSpinningRef.current = true;
      return () => clearInterval(interval);
    } else {
      // When the roll finishes, set the target rotations to snap the rolled face forward.
      // We only add a full rotation multiplier (e.g. 720deg) to the destination
      // if we actually transitioned from spinning to resting state.
      const target = FACE_ROTATIONS[n] ?? FACE_ROTATIONS[1];
      const transitionedFromSpin = prevSpinningRef.current;

      setRotation({
        x: target.x + (transitionedFromSpin ? 720 : 0),
        y: target.y + (transitionedFromSpin ? 720 : 0),
        z: 0,
      });

      setWasSpinning(transitionedFromSpin);
      prevSpinningRef.current = false;
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
        height: size,
        perspective: '500px', // Scene camera perspective
        display: 'inline-block',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* 3D Cube Container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          transformStyle: 'preserve-3d', // Enable nested 3D spaces
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
          transition: spinning 
            ? 'transform 150ms linear' 
            : wasSpinning
              ? 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)' // physics-like spring snap back
              : 'none',
        }}
      >
        {faces.map(({ id, style }) => (
          <div
            key={id}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              background: 'radial-gradient(circle at 30% 30%, oklch(0.99 0.005 260) 0%, oklch(0.92 0.01 260) 100%)',
              border: '0.5px solid oklch(0.78 0.01 260)',
              borderRadius: size * 0.16, // Proportional rounded corners
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.8), inset 0 -2px 6px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.3)',
              backfaceVisibility: 'hidden', // Crucial: hides reverse side
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...style,
            }}
          >
            {/* Draw dots inside this face */}
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {(DOT_COORDINATES[id] ?? []).map((dot, index) => {
                const dotSize = size * 0.13;
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
                      // Premium engraved look with a tiny drop shadow / inner depth
                      background: id === 1 
                        ? 'radial-gradient(circle at 35% 35%, oklch(0.40 0.16 25) 0%, oklch(0.20 0.10 25) 100%)' // Red center dot for Face 1 (classic casino style!)
                        : 'radial-gradient(circle at 35% 35%, oklch(0.25 0.02 260) 0%, oklch(0.10 0.01 260) 100%)', // Slate/black dots for other faces
                      boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.8), 0 0.5px 0.5px rgba(255,255,255,0.9)',
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
