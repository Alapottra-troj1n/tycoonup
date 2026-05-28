'use client';

// ─── TycoonUP Sound Engine ────────────────────────────────────────────────────
// All sounds are synthesized via Web Audio API — no asset files needed.
// Every play() call is non-blocking and safe to call from any event handler.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Resume suspended context (browsers require a user gesture first)
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Master volume (0-1). Persisted in localStorage.
let masterVolume = 0.55;
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('tu_sfx_vol');
  if (saved !== null) masterVolume = parseFloat(saved);
}

export function setMasterVolume(v: number) {
  masterVolume = Math.max(0, Math.min(1, v));
  if (typeof window !== 'undefined') localStorage.setItem('tu_sfx_vol', String(masterVolume));
}
export function getMasterVolume() { return masterVolume; }

// ─── Low-level helpers ────────────────────────────────────────────────────────

function makeGain(c: AudioContext, vol: number): GainNode {
  const g = c.createGain();
  g.gain.value = vol * masterVolume;
  g.connect(c.destination);
  return g;
}

function osc(
  c: AudioContext,
  dest: AudioNode,
  type: OscillatorType,
  freq: number,
  start: number,
  dur: number,
  freqEnd?: number,
) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (freqEnd !== undefined) o.frequency.exponentialRampToValueAtTime(freqEnd, start + dur);
  o.connect(dest);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function envelope(g: GainNode, start: number, attack: number, sustain: number, release: number, peakVol = 1) {
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peakVol * masterVolume, start + attack);
  g.gain.setValueAtTime(peakVol * masterVolume, start + attack + sustain);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + sustain + release);
}

// White noise burst
function noiseBurst(c: AudioContext, dest: AudioNode, start: number, dur: number, vol = 0.4) {
  const bufLen = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, bufLen, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * vol;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(dest);
  src.start(start);
  src.stop(start + dur);
}

// ─── Sound Definitions ────────────────────────────────────────────────────────

/** Dice roll — rattling noise + tumble tones */
export function playDiceRoll() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;

  // Rattling percussion
  for (let i = 0; i < 6; i++) {
    const t = now + i * 0.14 + Math.random() * 0.06;
    const g = c.createGain();
    g.gain.value = (0.22 - i * 0.025) * masterVolume;
    g.connect(c.destination);
    noiseBurst(c, g, t, 0.055, 0.7);
    osc(c, g, 'square', 160 + Math.random() * 120, t, 0.07);
  }

  // Final landing thud
  const thudG = makeGain(c, 0.35);
  envelope(thudG, now + 0.88, 0.01, 0.04, 0.18);
  osc(c, thudG, 'sine', 120, now + 0.88, 0.22, 60);
  noiseBurst(c, thudG, now + 0.88, 0.12, 0.5);
}

/** Player token moves to a new tile — satisfying "step" click */
export function playTokenMove() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const g = makeGain(c, 0.28);
  envelope(g, now, 0.005, 0.02, 0.09);
  osc(c, g, 'triangle', 520, now, 0.12, 440);
  const g2 = makeGain(c, 0.12);
  envelope(g2, now, 0.005, 0.01, 0.06);
  noiseBurst(c, g2, now, 0.04, 0.6);
}

/** Game starts — triumphant arpeggio */
export function playGameStart() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const notes = [261.6, 329.6, 392, 523.3]; // C4 E4 G4 C5
  notes.forEach((freq, i) => {
    const t = now + i * 0.13;
    const g = makeGain(c, 0.3);
    envelope(g, t, 0.01, 0.12, 0.22);
    osc(c, g, 'triangle', freq, t, 0.35);
    // Harmonics
    const g2 = makeGain(c, 0.12);
    envelope(g2, t, 0.01, 0.08, 0.18);
    osc(c, g2, 'square', freq * 2, t, 0.25);
  });
  // Sparkle shimmer at the end
  const shimmerG = makeGain(c, 0.14);
  envelope(shimmerG, now + 0.56, 0.01, 0.1, 0.4);
  osc(c, shimmerG, 'sine', 1047, now + 0.56, 0.5, 1568);
}

/** Auction starts — urgent gavel + rising tone */
export function playAuctionStart() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;

  // Gavel hits
  [0, 0.22].forEach((offset) => {
    const g = makeGain(c, 0.45);
    envelope(g, now + offset, 0.003, 0.03, 0.14);
    osc(c, g, 'square', 200, now + offset, 0.18, 100);
    noiseBurst(c, g, now + offset, 0.055, 0.8);
  });

  // Rising tension tone
  const riseG = makeGain(c, 0.2);
  envelope(riseG, now + 0.45, 0.04, 0.3, 0.25);
  osc(c, riseG, 'sawtooth', 220, now + 0.45, 0.6, 660);
}

/** Bid placed — quick ascending "bid!" blip */
export function playBidPlaced() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const g = makeGain(c, 0.22);
  envelope(g, now, 0.01, 0.05, 0.12);
  osc(c, g, 'triangle', 660, now, 0.18, 880);
}

/** Property purchased — success chime */
export function playBuySuccess() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const chords = [523.3, 659.3, 783.9]; // C5 E5 G5
  chords.forEach((freq, i) => {
    const t = now + i * 0.09;
    const g = makeGain(c, 0.22);
    envelope(g, t, 0.01, 0.15, 0.3);
    osc(c, g, 'sine', freq, t, 0.46);
  });
}

/** Auction / buy skipped — soft downward blip */
export function playSkip() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const g = makeGain(c, 0.18);
  envelope(g, now, 0.008, 0.04, 0.12);
  osc(c, g, 'triangle', 320, now, 0.2, 200);
}

/** Rent paid — coin clink */
export function playRentPaid() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  [0, 0.07, 0.13].forEach((offset, i) => {
    const g = makeGain(c, 0.2 - i * 0.05);
    envelope(g, now + offset, 0.003, 0.02, 0.18);
    osc(c, g, 'sine', 1200 + i * 80, now + offset, 0.22);
  });
}

/** Land on Go / collect salary — cheerful ding */
export function playPassGo() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  [523.3, 659.3, 783.9, 1046.5].forEach((freq, i) => {
    const t = now + i * 0.1;
    const g = makeGain(c, 0.25);
    envelope(g, t, 0.008, 0.08, 0.28);
    osc(c, g, 'sine', freq, t, 0.38);
  });
}

/** Go to Jail — dramatic low descending */
export function playGoToJail() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const g = makeGain(c, 0.38);
  envelope(g, now, 0.01, 0.18, 0.4);
  osc(c, g, 'sawtooth', 220, now, 0.58, 82);
  // Clang
  const clangG = makeGain(c, 0.25);
  envelope(clangG, now, 0.003, 0.08, 0.3);
  osc(c, clangG, 'square', 440, now, 0.38, 110);
}

/** Chest / community card flip */
export function playChestOpen() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const g = makeGain(c, 0.2);
  envelope(g, now, 0.005, 0.06, 0.22);
  osc(c, g, 'sine', 880, now, 0.28, 1320);
  const g2 = makeGain(c, 0.1);
  envelope(g2, now + 0.04, 0.005, 0.05, 0.18);
  noiseBurst(c, g2, now + 0.04, 0.08, 0.5);
}

/** Turn announced — soft notification */
export function playTurnStart() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  [440, 554.4, 659.3].forEach((freq, i) => {
    const t = now + i * 0.11;
    const g = makeGain(c, 0.18);
    envelope(g, t, 0.01, 0.08, 0.2);
    osc(c, g, 'sine', freq, t, 0.3);
  });
}

/** Generic UI click — subtle tactile tick */
export function playClick() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const g = makeGain(c, 0.14);
  envelope(g, now, 0.002, 0.008, 0.05);
  osc(c, g, 'square', 800, now, 0.06, 600);
  const g2 = makeGain(c, 0.08);
  envelope(g2, now, 0.002, 0.005, 0.03);
  noiseBurst(c, g2, now, 0.02, 0.6);
}

/** Hover — barely-there whisper tick */
export function playHover() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const g = makeGain(c, 0.06);
  envelope(g, now, 0.002, 0.005, 0.03);
  osc(c, g, 'sine', 1000, now, 0.04);
}

/** Win / game over — full fanfare */
export function playWin() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const melody = [
    [523.3, 0], [659.3, 0.15], [783.9, 0.3],
    [1046.5, 0.48], [880, 0.66], [1046.5, 0.78],
  ] as [number, number][];
  melody.forEach(([freq, t]) => {
    const g = makeGain(c, 0.28);
    envelope(g, now + t, 0.01, 0.1, 0.25);
    osc(c, g, 'triangle', freq, now + t, 0.38);
    const g2 = makeGain(c, 0.12);
    envelope(g2, now + t, 0.01, 0.08, 0.2);
    osc(c, g2, 'square', freq * 2, now + t, 0.28);
  });
}

/** Tax / penalty — negative buzz */
export function playTax() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const g = makeGain(c, 0.3);
  envelope(g, now, 0.01, 0.12, 0.22);
  osc(c, g, 'sawtooth', 150, now, 0.35, 100);
  const g2 = makeGain(c, 0.15);
  envelope(g2, now + 0.08, 0.01, 0.08, 0.18);
  osc(c, g2, 'square', 180, now + 0.08, 0.28, 120);
}
