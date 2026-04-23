'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChestQuestion, GameRoom } from '@/lib/types';
import { answerChestQuestion } from '@/app/actions/game';

interface ChestModalProps {
  room: GameRoom;
  playerId: string;
  question: ChestQuestion;
  isActivePlayer: boolean;
}

const TIMEOUT_SECONDS = 20;

export default function ChestModal({ room, playerId, question, isActivePlayer }: ChestModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SECONDS);
  const [result, setResult] = useState<{ correct: boolean; amount: number } | null>(null);

  useEffect(() => {
    if (!isActivePlayer || revealed) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          handleAnswer(0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActivePlayer, revealed]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAnswer(idx: number) {
    if (revealed || loading) return;
    setSelected(idx);
    setRevealed(true);
    const correct = idx === question.correctIndex;
    setResult({ correct, amount: correct ? question.reward : question.penalty });
    if (isActivePlayer) {
      setLoading(true);
      await answerChestQuestion(room.id, playerId, idx);
      setLoading(false);
    }
  }

  const timerDanger = timeLeft <= 5;

  return (
    <AnimatePresence>
      <motion.div
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          background: 'oklch(0.08 0.02 260 / 0.9)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          style={{
            width: '100%', maxWidth: 440,
            background: 'var(--bg-glass-strong)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid oklch(0.82 0.17 210 / 0.35)',
            borderRadius: 'var(--r-2xl)',
            boxShadow: 'var(--glow-cyan), var(--shadow-xl)',
            overflow: 'hidden',
          }}
          initial={{ scale: 0.75, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--stroke-hairline)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--r-md)',
                background: 'oklch(0.82 0.17 210 / 0.12)',
                border: '1px solid oklch(0.82 0.17 210 / 0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                📦
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--neon-cyan)' }}>
                  World Chest
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.06em' }}>
                  Answer correctly to earn a reward
                </div>
              </div>
            </div>

            {isActivePlayer && !revealed && (
              <motion.div
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14,
                  background: timerDanger ? 'oklch(0.68 0.22 25 / 0.15)' : 'oklch(0.82 0.17 210 / 0.12)',
                  border: `2px solid ${timerDanger ? 'var(--danger)' : 'var(--neon-cyan)'}`,
                  color: timerDanger ? 'var(--danger)' : 'var(--neon-cyan)',
                  boxShadow: timerDanger ? '0 0 12px oklch(0.68 0.22 25 / 0.4)' : '0 0 8px oklch(0.82 0.17 210 / 0.3)',
                }}
                animate={timerDanger ? { scale: [1, 1.08, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.6 }}
              >
                {timeLeft}
              </motion.div>
            )}
          </div>

          <div style={{ padding: '18px 18px' }}>
            {/* Question */}
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15,
              color: 'var(--text-primary)', lineHeight: 1.5,
              marginBottom: 16,
            }}>
              {question.question}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {question.options.map((opt, i) => {
                let bg = 'oklch(1 0 0 / 0.03)';
                let border = '1px solid var(--stroke-hairline)';
                let color = 'var(--text-secondary)';

                if (revealed) {
                  if (i === question.correctIndex) {
                    bg = 'oklch(0.78 0.18 150 / 0.1)';
                    border = '1px solid oklch(0.78 0.18 150 / 0.4)';
                    color = 'var(--success)';
                  } else if (i === selected && i !== question.correctIndex) {
                    bg = 'oklch(0.68 0.22 25 / 0.1)';
                    border = '1px solid oklch(0.68 0.22 25 / 0.3)';
                    color = 'var(--danger)';
                  }
                }

                return (
                  <motion.button
                    key={i}
                    disabled={!isActivePlayer || revealed || loading}
                    onClick={() => handleAnswer(i)}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '10px 14px',
                      borderRadius: 'var(--r-md)',
                      fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500,
                      background: bg, border, color,
                      cursor: !isActivePlayer || revealed || loading ? 'default' : 'pointer',
                      transition: 'all var(--dur-fast) var(--ease-out)',
                    }}
                    whileHover={!revealed && isActivePlayer ? { scale: 1.01, x: 2 } : {}}
                    whileTap={!revealed && isActivePlayer ? { scale: 0.99 } : {}}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11, color: 'var(--text-faint)', marginRight: 10 }}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Result */}
          {result && (
            <motion.div
              style={{ padding: '0 18px 18px' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div style={{
                padding: '12px 16px', borderRadius: 'var(--r-lg)', textAlign: 'center',
                background: result.correct ? 'oklch(0.78 0.18 150 / 0.08)' : 'oklch(0.68 0.22 25 / 0.08)',
                border: `1px solid ${result.correct ? 'oklch(0.78 0.18 150 / 0.25)' : 'oklch(0.68 0.22 25 / 0.25)'}`,
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
                  color: result.correct ? 'var(--success)' : 'var(--danger)',
                }}>
                  {result.correct ? '✓ Correct!' : '✗ Wrong!'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {result.correct ? `+$${result.amount}` : `-$${result.amount}`}
                </div>
              </div>
            </motion.div>
          )}

          {!isActivePlayer && !revealed && (
            <div style={{ padding: '0 18px 18px' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)',
                textAlign: 'center', letterSpacing: '0.06em',
              }}>
                Waiting for active player to answer…
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
