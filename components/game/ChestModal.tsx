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
          handleAnswer(0); // auto-answer wrong on timeout
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActivePlayer, revealed]);

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

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'rgba(6,9,18,0.85)', backdropFilter: 'blur(12px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #0d1225, #060912)',
            border: '1px solid rgba(0,212,255,0.35)',
            boxShadow: '0 0 60px rgba(0,212,255,0.12)',
          }}
          initial={{ scale: 0.7, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          {/* Header */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.15)' }}
          >
            <div className="flex items-center gap-2">
              <motion.span
                className="text-2xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: 2, duration: 0.4 }}
              >
                📦
              </motion.span>
              <div>
                <p className="text-cyan-300 font-bold text-sm">World Chest</p>
                <p className="text-slate-500 text-xs">Answer correctly to earn a reward!</p>
              </div>
            </div>
            {isActivePlayer && !revealed && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: timeLeft < 6 ? '#ff4444' : '#00bcd4',
                    color: '#000',
                    boxShadow: timeLeft < 6 ? '0 0 8px #ff4444' : '0 0 8px #00bcd4',
                  }}
                >
                  {timeLeft}
                </div>
              </div>
            )}
          </div>

          {/* Question */}
          <div className="px-6 py-5">
            <p className="text-white text-base font-semibold leading-snug mb-5">
              {question.question}
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {question.options.map((opt, i) => {
                let style: React.CSSProperties = {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#cbd5e1',
                };

                if (revealed) {
                  if (i === question.correctIndex) {
                    style = {
                      background: 'rgba(0,255,136,0.1)',
                      border: '1px solid rgba(0,255,136,0.4)',
                      color: '#00ff88',
                    };
                  } else if (i === selected && i !== question.correctIndex) {
                    style = {
                      background: 'rgba(255,50,50,0.1)',
                      border: '1px solid rgba(255,50,50,0.3)',
                      color: '#ff6666',
                    };
                  }
                }

                return (
                  <motion.button
                    key={i}
                    disabled={!isActivePlayer || revealed || loading}
                    onClick={() => handleAnswer(i)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all"
                    style={style}
                    whileHover={!revealed && isActivePlayer ? { scale: 1.01 } : {}}
                    whileTap={!revealed && isActivePlayer ? { scale: 0.99 } : {}}
                  >
                    <span className="font-bold mr-2 text-slate-500">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Result */}
          {result && (
            <motion.div
              className="px-6 pb-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div
                className="rounded-xl px-4 py-3 text-center"
                style={{
                  background: result.correct ? 'rgba(0,255,136,0.08)' : 'rgba(255,50,50,0.08)',
                  border: `1px solid ${result.correct ? 'rgba(0,255,136,0.25)' : 'rgba(255,50,50,0.25)'}`,
                }}
              >
                <p
                  className="font-bold text-lg"
                  style={{ color: result.correct ? '#00ff88' : '#ff6666' }}
                >
                  {result.correct ? '✓ Correct!' : '✗ Wrong!'}
                </p>
                <p className="text-slate-400 text-sm mt-0.5">
                  {result.correct ? `+$${result.amount}` : `-$${result.amount}`}
                </p>
              </div>
            </motion.div>
          )}

          {!isActivePlayer && !revealed && (
            <div className="px-6 pb-5">
              <p className="text-slate-500 text-xs text-center">
                Waiting for active player to answer…
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
