'use client';

// ─── TycoonUP Sound & Atmosphere Engine ───────────────────────────────────────
// All sounds are dynamically synthesized in real-time via HTML5 Web Audio API.
// No asset file downloads required — zero footprint, high performance, fully responsive.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;

// Procedural background ambience states
let ambientPadGain: GainNode | null = null;
let heartbeatGain: GainNode | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let ambientOscs: OscillatorNode[] = [];
let padFilter: BiquadFilterNode | null = null;
let isAmbientPlaying = false;
let isTenseMode = false;
let ambientTimer: ReturnType<typeof setTimeout> | null = null;

// Dynamic master volume (0-1). Persisted in localStorage.
let masterVolume = 0.55;
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('tu_sfx_vol');
  if (saved !== null) masterVolume = parseFloat(saved);
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      // Create context support standard and legacy prefixes
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Setup dynamic compressor to prevent clipping when multiple sounds overlap
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, ctx.currentTime);
      compressor.knee.setValueAtTime(24, ctx.currentTime);
      compressor.ratio.setValueAtTime(10, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.08, ctx.currentTime);
      
      // Setup master gain node for real-time volume scaling
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(masterVolume, ctx.currentTime);
      
      // Chain: Sources -> Compressor -> MasterGain -> Speakers
      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  // Resume suspended context (browsers require a user gesture first)
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setMasterVolume(v: number) {
  masterVolume = Math.max(0, Math.min(1, v));
  if (typeof window !== 'undefined') localStorage.setItem('tu_sfx_vol', String(masterVolume));
  if (masterGain && ctx) {
    masterGain.gain.setValueAtTime(masterVolume, ctx.currentTime);
  }
}
export function getMasterVolume() { return masterVolume; }

// ─── Sound Helpers ───────────────────────────────────────────────────────────

function makeGain(c: AudioContext, vol: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  // Connect to the central compressor to keep final output safe and clean
  if (compressor) g.connect(compressor);
  else g.connect(c.destination);
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
  g.gain.linearRampToValueAtTime(peakVol, start + attack);
  g.gain.setValueAtTime(peakVol, start + attack + sustain);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + sustain + release);
}

// Subtractive synthesis white noise generator
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

// ─── Premium Sound Redesigns ──────────────────────────────────────────────────

/** Dynamic, physics-driven dice roll — rattle percussion + dual thud landing */
export function playDiceRoll() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;

  // Spacing rattles exponentially to simulate real physics/friction slowing down
  const delays = [0.0, 0.11, 0.24, 0.39, 0.56, 0.75, 0.96];
  delays.forEach((offset, idx) => {
    const t = now + offset;
    const rattleG = makeGain(c, 0.18 - idx * 0.02);
    envelope(rattleG, t, 0.002, 0.025, 0.055, 1);
    
    // Rattle felt wood friction noise
    const noiseFilter = c.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(260 + Math.random() * 70, t);
    noiseFilter.Q.setValueAtTime(1.8, t);
    noiseFilter.connect(rattleG);
    noiseBurst(c, noiseFilter, t, 0.06, 0.65);
    
    // Body impact tone
    osc(c, rattleG, 'triangle', 180 + Math.random() * 80, t, 0.07);
  });

  // Final landing thuds (Double landing thuds for two heavy dice)
  [1.04, 1.15].forEach((offset, idx) => {
    const t = now + offset;
    const thudG = makeGain(c, idx === 0 ? 0.35 : 0.4);
    envelope(thudG, t, 0.002, 0.03, 0.14, 1);
    
    // Low frequency solid sine boom
    osc(c, thudG, 'sine', 95 - idx * 10, t, 0.18, 50);
    
    // Heavy wood impact click
    const clickG = makeGain(c, 0.08);
    envelope(clickG, t, 0.002, 0.004, 0.02, 1);
    osc(c, clickG, 'triangle', 520, t, 0.025);
  });
}

/** Token tile landing step — tactile wood-ceramic clicks with anti-fatigue pitch variation */
export function playTokenMove(isFinal = false) {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  
  // Anti-fatigue micro pitch modulation (+/- 4.5%)
  const pitchRand = 1 + (Math.random() * 0.09 - 0.045);
  
  const g = makeGain(c, isFinal ? 0.32 : 0.22);
  envelope(g, now, 0.003, isFinal ? 0.04 : 0.015, isFinal ? 0.13 : 0.06, 1);
  
  const osc1 = c.createOscillator();
  const osc2 = c.createOscillator();
  
  // Layer 1: Ceramic crisp touch click
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(1550 * pitchRand, now);
  
  // Layer 2: Hollow warm wood tile resonance
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(360 * pitchRand, now);
  
  // Clean filtering
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, now);
  
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(g);
  
  osc1.start(now);
  osc1.stop(now + 0.07);
  osc2.start(now);
  osc2.stop(now + 0.07);
  
  // Spatial stereo panning variation
  const panner = c.createStereoPanner ? c.createStereoPanner() : null;
  if (panner) {
    panner.pan.setValueAtTime(Math.random() * 0.4 - 0.2, now);
    g.disconnect();
    if (compressor) {
      g.connect(panner);
      panner.connect(compressor);
    } else {
      g.connect(panner);
      panner.connect(c.destination);
    }
  }
}

/** Triumphant Empire Opening — ascending chord with shimmering magic chimes */
export function playGameStart() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  
  // Golden rising chord progression: C4 -> E4 -> G4 -> C5 -> E5 -> G5 -> C6
  const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
  freqs.forEach((freq, i) => {
    const t = now + i * 0.08;
    const g = makeGain(c, 0.22);
    envelope(g, t, 0.01, 0.12, 0.24, 1);
    
    // Primary core tone
    osc(c, g, 'triangle', freq, t, 0.4);
    
    // Rich harmonic upper chime
    const g2 = makeGain(c, 0.08);
    envelope(g2, t, 0.008, 0.08, 0.18, 1);
    osc(c, g2, 'sine', freq * 2, t, 0.35);
  });
  
  // Sparkle shimmers
  const shimmerG = makeGain(c, 0.08);
  envelope(shimmerG, now + 0.52, 0.015, 0.1, 0.45, 1);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(6500, now + 0.52);
  hp.connect(shimmerG);
  noiseBurst(c, hp, now + 0.52, 0.52, 0.4);
}

/** Auction gavel hits with rising frequency anticipation */
export function playAuctionStart() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;

  // Enable dynamic atmospheric tension mode
  setTension(true);

  // Quick double-strike gavel wood block hitting stand
  [0, 0.22].forEach((offset) => {
    const t = now + offset;
    const g = makeGain(c, 0.35);
    envelope(g, t, 0.002, 0.018, 0.12, 1);
    
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(175, t);
    o.connect(g);
    
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, t);
    filter.connect(g);
    
    noiseBurst(c, filter, t, 0.045, 0.6);
    
    o.start(t);
    o.stop(t + 0.15);
  });
}

/** Auction Bid — quick ascending perfect fourth blip */
export function playBidPlaced() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const g = makeGain(c, 0.18);
  envelope(g, now, 0.005, 0.025, 0.08, 1);
  
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(587.33, now); // D5
  o.frequency.exponentialRampToValueAtTime(783.99, now + 0.07); // G5
  o.connect(g);
  o.start(now);
  o.stop(now + 0.11);
}

/** Property Purchased — luxury FM synthesized chime arpeggio + grounding warm bass */
export function playBuySuccess() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  
  // Duck background ambience temporarily
  duckAmbient(0.12, 1.8);

  // Ascending golden major 9th arpeggio: C5 -> E5 -> G5 -> B5 -> D6
  const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
  notes.forEach((freq, idx) => {
    const t = now + idx * 0.08;
    const chimeG = makeGain(c, 0.15);
    envelope(chimeG, t, 0.008, 0.15, 0.4, 1);
    
    // Frequency Modulation (FM) synthesis for crystal physical bells
    const carrier = c.createOscillator();
    const modulator = c.createOscillator();
    const modGain = c.createGain();
    
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, t);
    
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 1.5, t); // perfect fifth modulator
    modGain.gain.setValueAtTime(freq * 0.6, t);
    modGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(chimeG);
    
    modulator.start(t);
    modulator.stop(t + 0.55);
    carrier.start(t);
    carrier.stop(t + 0.55);
    
    // Flutter across stereo field
    const panner = c.createStereoPanner ? c.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(idx % 2 === 0 ? -0.35 : 0.35, t);
      chimeG.disconnect();
      if (compressor) {
        chimeG.connect(panner);
        panner.connect(compressor);
      } else {
        chimeG.connect(panner);
        panner.connect(c.destination);
      }
    }
  });

  // Sparkling cloud
  const sparkleG = makeGain(c, 0.04);
  envelope(sparkleG, now + 0.22, 0.01, 0.08, 0.48, 1);
  const hpFilter = c.createBiquadFilter();
  hpFilter.type = 'highpass';
  hpFilter.frequency.setValueAtTime(6800, now + 0.22);
  hpFilter.connect(sparkleG);
  noiseBurst(c, hpFilter, now + 0.22, 0.55, 0.45);

  // Warm foundation bass note
  const bassG = makeGain(c, 0.2);
  envelope(bassG, now, 0.01, 0.28, 0.4, 1);
  const bassOsc = c.createOscillator();
  bassOsc.type = 'sine';
  bassOsc.frequency.setValueAtTime(110.00, now); // A2 grounding note
  bassOsc.connect(bassG);
  bassOsc.start(now);
  bassOsc.stop(now + 0.7);
}

/** Skipped / Cancelled — soft, low-passed downward slide */
export function playSkip() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const g = makeGain(c, 0.16);
  envelope(g, now, 0.008, 0.035, 0.11, 1);
  
  const o = c.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(310, now);
  o.frequency.exponentialRampToValueAtTime(210, now + 0.14);
  o.connect(g);
  o.start(now);
  o.stop(now + 0.16);
}

/** Rent Cashflow — rapid metallic cascade of heavy gold coins + cash register bell */
export function playRentPaid() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  
  duckAmbient(0.18, 1.25);

  // Coin Cascade: 7 rapid micro-clinks colliding
  for (let i = 0; i < 7; i++) {
    const t = now + i * 0.048 + Math.random() * 0.016;
    const coinG = makeGain(c, 0.14 - i * 0.01);
    envelope(coinG, t, 0.002, 0.018, 0.11, 1);
    
    // Detuned metal bandpass clinks
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(2400 + i * 380 + Math.random() * 200, t);
    
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4200 + i * 200, t);
    filter.Q.setValueAtTime(5.5, t);
    
    o.connect(filter);
    filter.connect(coinG);
    o.start(t);
    o.stop(t + 0.14);
    
    // Stereo transfer effect (right payer side to left receiver side)
    const panner = c.createStereoPanner ? c.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(0.5 - i * 0.17, t);
      coinG.disconnect();
      if (compressor) {
        coinG.connect(panner);
        panner.connect(compressor);
      } else {
        coinG.connect(panner);
        panner.connect(c.destination);
      }
    }
  }
  
  // Nostalgic Cash Register bell chime
  const bellG = makeGain(c, 0.18);
  const bellTime = now + 0.14;
  envelope(bellG, bellTime, 0.004, 0.14, 0.32, 1);
  
  const oscC = c.createOscillator();
  oscC.type = 'sine';
  oscC.frequency.setValueAtTime(1046.50, bellTime); // C6
  
  const oscM = c.createOscillator();
  oscM.type = 'sine';
  oscM.frequency.setValueAtTime(1567.98, bellTime); // G6 perfect fifth harmonic
  
  oscC.connect(bellG);
  oscM.connect(bellG);
  
  oscC.start(bellTime);
  oscC.stop(bellTime + 0.48);
  oscM.start(bellTime);
  oscM.stop(bellTime + 0.48);
}

/** Salary collection / Passed Go — warm, happy four-stage major chord chime */
export function playPassGo() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  
  duckAmbient(0.25, 1.4);
  
  // Happy upward major chord: C5 -> E5 -> G5 -> C6
  const freqs = [523.25, 659.25, 783.99, 1046.50];
  freqs.forEach((freq, idx) => {
    const t = now + idx * 0.07;
    const g = makeGain(c, 0.2);
    envelope(g, t, 0.008, 0.14, 0.28, 1);
    
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.46);
  });
}

/** Go to Jail — heavy slamming metal jail gate clang + dynamic low sweep */
export function playGoToJail() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  
  duckAmbient(0.1, 1.6);
  
  // Low sweep boom
  const boomG = makeGain(c, 0.3);
  envelope(boomG, now, 0.01, 0.16, 0.35, 1);
  const boomOsc = c.createOscillator();
  boomOsc.type = 'sine';
  boomOsc.frequency.setValueAtTime(110.00, now);
  boomOsc.frequency.exponentialRampToValueAtTime(45.00, now + 0.4);
  boomOsc.connect(boomG);
  boomOsc.start(now);
  boomOsc.stop(now + 0.58);

  // Jail bars iron clang!
  const clangG = makeGain(c, 0.36);
  envelope(clangG, now, 0.003, 0.08, 0.4, 1);
  
  // Detuned hollow metal rods resonance
  const rods = [110, 148, 220, 315];
  rods.forEach((freq) => {
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, now);
    
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, now);
    filter.Q.setValueAtTime(3.8, now);
    
    o.connect(filter);
    filter.connect(clangG);
    o.start(now);
    o.stop(now + 0.55);
  });
}

/** Chest Modal Cards — card sweep flip noise + ascending chime notification */
export function playChestOpen() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  
  const g = makeGain(c, 0.22);
  envelope(g, now, 0.008, 0.07, 0.2, 1);
  
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(587.33, now); // D5
  o.frequency.exponentialRampToValueAtTime(880.00, now + 0.18); // A5
  o.connect(g);
  o.start(now);
  o.stop(now + 0.32);
  
  // Spatial paper flip brush
  const noiseG = makeGain(c, 0.06);
  envelope(noiseG, now + 0.03, 0.005, 0.035, 0.12, 1);
  
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(950, now + 0.03);
  filter.Q.setValueAtTime(1.6, now + 0.03);
  filter.connect(noiseG);
  noiseBurst(c, filter, now + 0.03, 0.18, 0.5);
}

/** Turn Announcer Pop — pleasant dual-tone chime */
export function playTurnStart() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  
  [587.33, 783.99].forEach((freq, idx) => {
    const t = now + idx * 0.08;
    const g = makeGain(c, 0.14);
    envelope(g, t, 0.008, 0.08, 0.16, 1);
    
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.26);
  });
}

/** Glassmorphic Button Click — tactile dual-sine pop with crisp noise transients */
export function playClick(isConfirm = false) {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  
  const g = makeGain(c, isConfirm ? 0.16 : 0.12);
  envelope(g, now, 0.003, 0.005, 0.035, 1);
  
  const f1 = isConfirm ? 1140 : 950;
  const f2 = isConfirm ? 1710 : 1425; // Perfect 5th chord harmonic
  
  const osc1 = c.createOscillator();
  const osc2 = c.createOscillator();
  
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(f1, now);
  osc1.frequency.exponentialRampToValueAtTime(f1 * 0.8, now + 0.04);
  
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(f2, now);
  osc2.frequency.exponentialRampToValueAtTime(f2 * 0.8, now + 0.04);
  
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(isConfirm ? 1300 : 1100, now);
  filter.Q.setValueAtTime(3.2, now);
  
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(g);
  
  osc1.start(now);
  osc1.stop(now + 0.045);
  osc2.start(now);
  osc2.stop(now + 0.045);
  
  // Whisper noise burst for fingernail friction touch transient
  const noiseG = makeGain(c, 0.03);
  envelope(noiseG, now, 0.001, 0.002, 0.008, 1);
  
  const hpFilter = c.createBiquadFilter();
  hpFilter.type = 'highpass';
  hpFilter.frequency.setValueAtTime(4500, now);
  hpFilter.connect(noiseG);
  noiseBurst(c, hpFilter, now, 0.012, 0.45);
}

/** Whisper hover tick — very short friction feedback */
export function playHover() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const g = makeGain(c, 0.04);
  envelope(g, now, 0.002, 0.001, 0.012, 1);
  
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(1300, now);
  o.connect(g);
  o.start(now);
  o.stop(now + 0.015);
}

/** Win & Game Finished — full rich horn fanfare with cascading chimes and sub drops */
export function playWin() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  
  duckAmbient(0.01, 4.2);

  // Cinematic detuned sawtooth horn chords: C4, G4, C5, E5
  const chords = [261.63, 392.00, 523.25, 659.25];
  chords.forEach((freq, idx) => {
    const t = now + idx * 0.12;
    const hornG = makeGain(c, 0.18);
    envelope(hornG, t, 0.035, 0.35, 0.45, 1);
    
    const o1 = c.createOscillator();
    const o2 = c.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'sawtooth';
    o1.frequency.setValueAtTime(freq - 1.5, t);
    o2.frequency.setValueAtTime(freq + 1.5, t);
    
    // Dynamic filter opening sweep simulating horn bells swelling
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, t);
    filter.frequency.exponentialRampToValueAtTime(1600, t + 0.22);
    
    o1.connect(filter);
    o2.connect(filter);
    filter.connect(hornG);
    
    o1.start(t);
    o1.stop(t + 0.85);
    o2.start(t);
    o2.stop(t + 0.85);
  });
  
  // Sparkling crystal arpeggio cascade fluttering in background
  for (let i = 0; i < 12; i++) {
    const t = now + 0.6 + i * 0.08;
    const chimeG = makeGain(c, 0.07);
    envelope(chimeG, t, 0.005, 0.07, 0.18, 1);
    
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1200 + (i % 4) * 200, t);
    
    const panner = c.createStereoPanner ? c.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime((i % 3 - 1) * 0.45, t);
      o.connect(chimeG);
      chimeG.disconnect();
      if (compressor) {
        chimeG.connect(panner);
        panner.connect(compressor);
      } else {
        chimeG.connect(panner);
        panner.connect(c.destination);
      }
    } else {
      o.connect(chimeG);
    }
    
    o.start(t);
    o.stop(t + 0.28);
  }
}

/** Paying Tax / Financial losses — low pitch drop sweep + low passed melancholic chord */
export function playTax() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  
  duckAmbient(0.2, 1.25);
  
  // Low tension drop
  const g = makeGain(c, 0.28);
  envelope(g, now, 0.01, 0.18, 0.35, 1);
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(135, now);
  o.frequency.linearRampToValueAtTime(65, now + 0.4);
  o.connect(g);
  o.start(now);
  o.stop(now + 0.55);
  
  // Melancholic low-passed minor chord (Am: A3 -> C4 -> E4)
  const minor = [220.00, 261.63, 329.63];
  minor.forEach((freq, idx) => {
    const t = now + 0.05;
    const padG = makeGain(c, 0.09);
    envelope(padG, t, 0.05, 0.2, 0.22, 1);
    
    const oscNode = c.createOscillator();
    oscNode.type = 'triangle';
    oscNode.frequency.setValueAtTime(freq, t);
    
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(420, t);
    
    oscNode.connect(f);
    f.connect(padG);
    
    oscNode.start(t);
    oscNode.stop(t + 0.5);
  });
}

/** Elegant modal whoosh open sliding effect */
export function playModalOpen() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const g = makeGain(c, 0.16);
  envelope(g, now, 0.12, 0.02, 0.12, 1); // smooth 120ms opening swell
  
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(180, now);
  filter.frequency.exponentialRampToValueAtTime(1450, now + 0.18);
  filter.Q.setValueAtTime(1.4, now);
  
  filter.connect(g);
  noiseBurst(c, filter, now, 0.26, 0.4);
}

/** Modal Whoosh close effect */
export function playModalClose() {
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  const g = makeGain(c, 0.13);
  envelope(g, now, 0.02, 0.02, 0.12, 1); // rapid exit whoosh
  
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1450, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + 0.12);
  filter.Q.setValueAtTime(1.1, now);
  
  filter.connect(g);
  noiseBurst(c, filter, now, 0.16, 0.35);
}

// ─── Procedural Background Ambient Pad Loop ───────────────────────────────────

// Harmonious modal pad chord progression (Fmaj9 -> Cmaj9 -> Am7 -> G6)
const CHORDS = [
  [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9
  [130.81, 196.00, 246.94, 293.66, 329.63], // Cmaj9
  [110.00, 164.81, 196.00, 261.63, 329.63], // Am7
  [98.00, 146.83, 196.00, 246.94, 293.66],  // G6
];
let currentChordIdx = 0;

function playNextPadChord() {
  if (!isAmbientPlaying) return;
  const c = getCtx(); if (!c) return;
  
  const now = c.currentTime;
  const chord = CHORDS[currentChordIdx];
  const chordDuration = 8.0; // seconds per chord
  
  // Set up dynamic lowpass filter on pad if missing
  if (!padFilter) {
    padFilter = c.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(isTenseMode ? 850 : 380, now);
    if (ambientPadGain) {
      padFilter.connect(ambientPadGain);
    } else if (compressor) {
      padFilter.connect(compressor);
    } else {
      padFilter.connect(c.destination);
    }
  }
  
  // LFO lowpass filter sweep modulation
  const lfoMod = isTenseMode ? 150 : 70;
  const baseCutoff = isTenseMode ? 850 : 380;
  padFilter.frequency.cancelScheduledValues(now);
  padFilter.frequency.setValueAtTime(baseCutoff, now);
  padFilter.frequency.linearRampToValueAtTime(baseCutoff + lfoMod, now + chordDuration * 0.5);
  padFilter.frequency.linearRampToValueAtTime(baseCutoff - lfoMod, now + chordDuration);

  // Synthesize chord voices
  chord.forEach((freq) => {
    // Volume envelope crossfades: 3.5s attack, 3.5s release (overlaps next chord)
    const voiceG = c.createGain();
    voiceG.gain.setValueAtTime(0, now);
    voiceG.gain.linearRampToValueAtTime(0.045 / chord.length, now + 3.5);
    voiceG.gain.setValueAtTime(0.045 / chord.length, now + 5.0);
    voiceG.gain.exponentialRampToValueAtTime(0.0001, now + chordDuration + 0.25);
    
    voiceG.connect(padFilter!);
    
    // Core warm triangle wave
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, now);
    o.connect(voiceG);
    o.start(now);
    o.stop(now + chordDuration + 0.35);
    ambientOscs.push(o);
    
    // detuned sister wave (+3 cents detune) for rich dimensional depth
    const oDetune = c.createOscillator();
    oDetune.type = 'triangle';
    oDetune.frequency.setValueAtTime(freq * 1.0018, now);
    oDetune.connect(voiceG);
    oDetune.start(now);
    oDetune.stop(now + chordDuration + 0.35);
    ambientOscs.push(oDetune);
  });
  
  // Random crystal micro-chime (25% trigger probability per chord change)
  if (Math.random() < 0.25) {
    const chimeTime = now + 2.0 + Math.random() * 4.0;
    const chimeFreq = 1800 + Math.random() * 1400;
    const chimeG = c.createGain();
    chimeG.gain.setValueAtTime(0, chimeTime);
    chimeG.gain.linearRampToValueAtTime(0.012, chimeTime + 0.05);
    chimeG.gain.exponentialRampToValueAtTime(0.0001, chimeTime + 1.2);
    
    const chimeOsc = c.createOscillator();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(chimeFreq, chimeTime);
    
    const chimeFilter = c.createBiquadFilter();
    chimeFilter.type = 'highpass';
    chimeFilter.frequency.setValueAtTime(1500, chimeTime);
    
    chimeOsc.connect(chimeFilter);
    chimeFilter.connect(chimeG);
    
    if (compressor) chimeG.connect(compressor);
    else chimeG.connect(c.destination);
    
    chimeOsc.start(chimeTime);
    chimeOsc.stop(chimeTime + 1.3);
  }
  
  // Proceed to next chord sequence
  currentChordIdx = (currentChordIdx + 1) % CHORDS.length;
  
  // Schedule next crossfade loop trigger (chords overlap by 3.2 seconds)
  ambientTimer = setTimeout(() => {
    playNextPadChord();
  }, (chordDuration - 3.2) * 1000);
}

/** Ramps ambient volume dynamically to clear mix spectrum for other effects */
export function duckAmbient(amount: number, duration: number) {
  const c = getCtx(); if (!c || !ambientPadGain) return;
  const now = c.currentTime;
  
  ambientPadGain.gain.cancelScheduledValues(now);
  // Duck pad volume down in 120ms
  ambientPadGain.gain.linearRampToValueAtTime(0.06 * amount, now + 0.12);
  // Keep ducked until end of sound transient, then restore smoothly
  ambientPadGain.gain.setValueAtTime(0.06 * amount, now + duration - 0.2);
  ambientPadGain.gain.linearRampToValueAtTime(0.06, now + duration);
}

/** Toggles high tension mood — heartbeats pulse, pad sweeps filter bright and tense */
export function setTension(isTense: boolean) {
  if (isTense === isTenseMode) return;
  isTenseMode = isTense;
  
  const c = getCtx(); if (!c) return;
  const now = c.currentTime;
  
  // Sweep pad resonance filter frequency dynamically
  if (padFilter) {
    const targetFreq = isTense ? 850 : 380;
    padFilter.frequency.cancelScheduledValues(now);
    padFilter.frequency.exponentialRampToValueAtTime(targetFreq, now + 1.5);
  }
  
  // Pulse active heartbeat ticks
  if (isTense) {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    
    heartbeatGain = c.createGain();
    heartbeatGain.gain.setValueAtTime(0.05, now);
    if (compressor) heartbeatGain.connect(compressor);
    else heartbeatGain.connect(c.destination);
    
    // Heartbeat BPM rate = 110 (triggers every 545ms)
    heartbeatInterval = setInterval(() => {
      triggerHeartbeatTick();
    }, 545);
  } else {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    if (heartbeatGain) {
      heartbeatGain.gain.cancelScheduledValues(now);
      heartbeatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      const oldGain = heartbeatGain;
      setTimeout(() => {
        try { oldGain.disconnect(); } catch {}
      }, 600);
      heartbeatGain = null;
    }
  }
}

function triggerHeartbeatTick() {
  const c = getCtx(); if (!c || !heartbeatGain) return;
  const now = c.currentTime;
  
  // Standard double-beat: lub-dub
  // Beat 1 (lub): higher gain, 65Hz
  const g1 = c.createGain();
  g1.gain.setValueAtTime(0, now);
  g1.gain.linearRampToValueAtTime(0.24, now + 0.002);
  g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  g1.connect(heartbeatGain);
  
  const o1 = c.createOscillator();
  o1.type = 'sine';
  o1.frequency.setValueAtTime(65, now);
  o1.connect(g1);
  o1.start(now);
  o1.stop(now + 0.1);
  
  // Beat 2 (dub): delayed, lower gain, 60Hz
  const delay = 0.14;
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0, now + delay);
  g2.gain.linearRampToValueAtTime(0.12, now + delay + 0.002);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.08);
  g2.connect(heartbeatGain);
  
  const o2 = c.createOscillator();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(60, now + delay);
  o2.connect(g2);
  o2.start(now + delay);
  o2.stop(now + delay + 0.1);
}

export function startAmbient() {
  if (isAmbientPlaying) return;
  const c = getCtx(); if (!c) return;
  
  isAmbientPlaying = true;
  currentChordIdx = 0;
  
  // Initialize atmospheric gain node
  ambientPadGain = c.createGain();
  ambientPadGain.gain.setValueAtTime(0.06, c.currentTime);
  if (compressor) ambientPadGain.connect(compressor);
  else ambientPadGain.connect(c.destination);
  
  playNextPadChord();
}

export function stopAmbient() {
  isAmbientPlaying = false;
  isTenseMode = false;
  if (ambientTimer) {
    clearTimeout(ambientTimer);
    ambientTimer = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  // Halt all oscillators
  ambientOscs.forEach(o => {
    try { o.stop(); } catch {}
  });
  ambientOscs = [];
  
  if (ambientPadGain) {
    try { ambientPadGain.disconnect(); } catch {}
    ambientPadGain = null;
  }
  if (heartbeatGain) {
    try { heartbeatGain.disconnect(); } catch {}
    heartbeatGain = null;
  }
  padFilter = null;
}
