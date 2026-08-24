'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ChestQuestion, GameRoom } from '@/lib/types';
import { answerChestQuestion } from '@/app/actions/game';
import DockCard from './DockCard';
import { ChestIcon } from './icons';

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
    <DockCard accent="var(--neon-cyan)" width={480}>
      {/* Header */}
      <div style={{
        padding: '13px 18px 12px',
        borderBottom: '1px solid var(--stroke-hairline)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 'var(--r-md)',
            background: 'oklch(0.80 0.10 200 / 0.12)',
            border: '1px solid oklch(0.80 0.10 200 / 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--neon-cyan)', flexShrink: 0,
          }}>
            <ChestIcon size={18} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--neon-cyan)' }}>
              World Chest
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)', letterSpacing: '0.04em', marginTop: 1 }}>
              Answer correctly to win <span style={{ color: 'var(--gold)' }}>${question.reward}</span> · miss and lose ${question.penalty}
            </div>
          </div>
        </div>

        {isActivePlayer && !revealed && (
          <div
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15,
              background: timerDanger ? 'var(--danger-soft)' : 'oklch(0.80 0.10 200 / 0.1)',
              border: `2.5px solid ${timerDanger ? 'var(--danger)' : 'var(--neon-cyan)'}`,
              color: timerDanger ? 'var(--danger)' : 'var(--neon-cyan)',
              animation: timerDanger ? 'tu-pulse 0.6s infinite ease-in-out' : undefined,
            }}
          >
            {timeLeft}
          </div>
        )}
      </div>

      <div style={{ padding: '15px 18px 18px' }}>
        {/* Question */}
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16,
          color: 'var(--text-primary)', lineHeight: 1.45,
          marginBottom: 14,
        }}>
          {question.question}
        </div>

        {/* Options — 2×2 grid for fast scanning */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {question.options.map((opt, i) => {
            let bg = 'oklch(1 0 0 / 0.03)';
            let border = '1px solid var(--stroke-soft)';
            let color = 'var(--text-secondary)';

            if (revealed) {
              if (i === question.correctIndex) {
                bg = 'var(--success-soft)';
                border = '1px solid oklch(0.78 0.13 155 / 0.5)';
                color = 'var(--success)';
              } else if (i === selected && i !== question.correctIndex) {
                bg = 'var(--danger-soft)';
                border = '1px solid oklch(0.71 0.155 25 / 0.4)';
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
                  padding: '11px 14px',
                  borderRadius: 'var(--r-md)',
                  fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 500,
                  background: bg, border, color,
                  cursor: !isActivePlayer || revealed || loading ? 'default' : 'pointer',
                  transition: 'all var(--dur-fast) var(--ease-out)',
                  display: 'flex', alignItems: 'center', gap: 9,
                }}
                whileHover={!revealed && isActivePlayer ? { scale: 1.015, y: -1 } : {}}
                whileTap={!revealed && isActivePlayer ? { scale: 0.99 } : {}}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11,
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'oklch(1 0 0 / 0.06)', color: 'var(--text-muted)',
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </motion.button>
            );
          })}
        </div>

        {/* Result */}
        {result && (
          <motion.div
            style={{ marginTop: 12 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div style={{
              padding: '11px 16px', borderRadius: 'var(--r-md)', textAlign: 'center',
              background: result.correct ? 'var(--success-soft)' : 'var(--danger-soft)',
              border: `1px solid ${result.correct ? 'oklch(0.78 0.13 155 / 0.35)' : 'oklch(0.71 0.155 25 / 0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15.5,
                color: result.correct ? 'var(--success)' : 'var(--danger)',
              }}>
                {result.correct ? '✓ Correct!' : '✗ Wrong!'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14.5, color: result.correct ? 'var(--gold)' : 'var(--danger)' }}>
                {result.correct ? `+$${result.amount}` : `−$${result.amount}`}
              </span>
            </div>
          </motion.div>
        )}

        {!isActivePlayer && !revealed && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-faint)',
            textAlign: 'center', letterSpacing: '0.05em', marginTop: 12,
          }}>
            Waiting for the active player to answer…
          </div>
        )}
      </div>
    </DockCard>
  );
}
