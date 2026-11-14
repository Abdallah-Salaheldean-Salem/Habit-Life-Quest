/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ---------------------------------------------------------
// FEEDBACK — the app's "feel" layer.
// Short synthesized tones (no audio files), haptics where the platform has
// them (Android; iOS Safari exposes no vibration API), a shared particle
// layer for bursts, and floating "+XP" text. Settings are per device:
// sound is off until the user turns it on, and Calm mode (or the OS
// "reduce motion" setting) tones everything down.
// ---------------------------------------------------------

export interface FeelSettings {
  /** Short tones on actions. Off by default — sound is opt-in. */
  sound: boolean;
  /** Fewer particles, no flying text, softer moments. */
  calm: boolean;
}

export const DEFAULT_FEEL: FeelSettings = { sound: false, calm: false };
const KEY = 'habitquest:feel';

export function loadFeel(): FeelSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_FEEL, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_FEEL };
}

let settings: FeelSettings = typeof window !== 'undefined' ? loadFeel() : { ...DEFAULT_FEEL };

export function getFeel(): FeelSettings {
  return settings;
}

export function setFeel(next: FeelSettings): void {
  settings = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  if (next.sound) ensureAudio();
}

/** The OS asks for reduced motion — no particles or flying text at all. */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const quiet = () => settings.calm || prefersReducedMotion();

// ---------------------------------------------------------
// Where the user last tapped — so effects can start at the control that
// was pressed, whichever component called the action.
// ---------------------------------------------------------
let lastPoint: { x: number; y: number; t: number } | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e) => {
      lastPoint = { x: e.clientX, y: e.clientY, t: performance.now() };
    },
    { capture: true, passive: true },
  );
}

/** The point of the most recent tap (if recent), else the focused control's centre. */
export function actionPoint(): { x: number; y: number } | null {
  if (lastPoint && performance.now() - lastPoint.t < 1500) return { x: lastPoint.x, y: lastPoint.y };
  const el = document.activeElement as HTMLElement | null;
  if (el && el !== document.body) {
    const r = el.getBoundingClientRect();
    if (r.width || r.height) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return null;
}

// ---------------------------------------------------------
// Sound — tiny Web Audio synth.
// ---------------------------------------------------------
export type Sfx = 'tick' | 'min' | 'undo' | 'streak' | 'mastery' | 'shield' | 'seal' | 'swipe';

let actx: AudioContext | null = null;
function ensureAudio(): AudioContext | null {
  try {
    if (!actx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      actx = new Ctor();
    }
    if (actx.state === 'suspended') void actx.resume();
    return actx;
  } catch {
    return null;
  }
}

function tone(ctx: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain: number) {
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

export function playSfx(kind: Sfx): void {
  if (!settings.sound) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const q = settings.calm ? 0.6 : 1;
  switch (kind) {
    case 'tick':
      tone(ctx, 880, 0, 0.09, 'triangle', 0.05 * q);
      tone(ctx, 1320, 0.06, 0.14, 'triangle', 0.04 * q);
      break;
    case 'min':
      tone(ctx, 660, 0, 0.12, 'triangle', 0.04 * q);
      break;
    case 'undo':
      tone(ctx, 440, 0, 0.12, 'triangle', 0.03 * q);
      break;
    case 'streak':
      [523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, i * 0.07, 0.22, 'triangle', 0.045 * q));
      break;
    case 'mastery':
      [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(ctx, f, i * 0.09, 0.42, 'sine', 0.055 * q));
      break;
    case 'shield':
      tone(ctx, 330, 0, 0.22, 'square', 0.02 * q);
      tone(ctx, 660, 0.05, 0.35, 'sine', 0.045 * q);
      break;
    case 'seal':
      tone(ctx, 147, 0, 0.35, 'sawtooth', 0.02 * q);
      [659, 880, 1175].forEach((f, i) => tone(ctx, f, 0.18 + i * 0.09, 0.3, 'sine', 0.045 * q));
      break;
    case 'swipe':
      tone(ctx, 1047, 0, 0.1, 'triangle', 0.04 * q);
      break;
  }
}

/** Vibrate where supported (Android Chrome). A no-op on iOS and desktop. */
export function buzz(pattern: number | number[]): void {
  if (prefersReducedMotion()) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------
// Particles — one fixed canvas over the page, created on first use.
// ---------------------------------------------------------
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  g: number;
}
let canvas: HTMLCanvasElement | null = null;
let ctx2d: CanvasRenderingContext2D | null = null;
let parts: Particle[] = [];
let running = false;
let lastT = 0;
let dpr = 1;

function ensureCanvas(): CanvasRenderingContext2D | null {
  if (ctx2d && canvas && canvas.isConnected) return ctx2d;
  canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:70;';
  document.body.appendChild(canvas);
  const resize = () => {
    if (!canvas) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx2d?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  ctx2d = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  return ctx2d;
}

function frame(t: number) {
  const ctx = ctx2d;
  if (!ctx) return;
  const dt = Math.min(32, t - lastT);
  lastT = t;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  parts = parts.filter((p) => {
    p.life += dt;
    if (p.life >= p.max) return false;
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.986;
    p.vy *= 0.992;
    const k = 1 - p.life / p.max;
    ctx.globalAlpha = Math.min(1, k * 1.4);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.3, p.size * (0.4 + 0.6 * k)), 0, Math.PI * 2);
    ctx.fill();
    return true;
  });
  ctx.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(frame);
  else {
    running = false;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

export interface BurstOptions {
  /** Particles per burst before Calm scaling. */
  count?: number;
  /** Initial speed, px per ms. */
  speed?: number;
  /** Lifetime, ms. */
  life?: number;
  size?: number;
  /** Shoot upward in a cone instead of a ring (embers). */
  up?: boolean;
  gravity?: number;
}

/** A burst of particles at a screen point. No-op under reduced motion. */
export function burst(x: number, y: number, colors: string[], o: BurstOptions = {}): void {
  if (prefersReducedMotion() || typeof document === 'undefined') return;
  const ctx = ensureCanvas();
  if (!ctx) return;
  const n = Math.max(3, Math.round((o.count ?? 14) * (settings.calm ? 0.35 : 1)));
  const speed = o.speed ?? 0.2;
  for (let i = 0; i < n; i++) {
    const a = o.up ? -Math.PI / 2 + (Math.random() - 0.5) * 1.6 : Math.random() * Math.PI * 2;
    const v = speed * (0.35 + Math.random() * 0.9);
    parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0,
      max: (o.life ?? 520) * (0.6 + Math.random() * 0.7),
      size: (o.size ?? 2.2) * (0.6 + Math.random() * 0.8),
      color: colors[i % colors.length],
      g: o.gravity ?? 0,
    });
  }
  if (!running) {
    running = true;
    lastT = performance.now();
    requestAnimationFrame(frame);
  }
}

/** "+25 XP" rising from a point and fading. Skipped in Calm / reduced motion. */
export function floatText(x: number, y: number, text: string, color: string): void {
  if (quiet() || typeof document === 'undefined') return;
  const el = document.createElement('span');
  el.textContent = text;
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:71;pointer-events:none;transform:translate(-50%,-50%);font:800 13px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:${color};text-shadow:0 0 10px ${color};white-space:nowrap;`;
  document.body.appendChild(el);
  const anim = el.animate(
    [
      { transform: 'translate(-50%,-30%) scale(.7)', opacity: 0 },
      { transform: 'translate(-50%,-120%) scale(1.1)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%,-260%) scale(.9)', opacity: 0 },
    ],
    { duration: 900, easing: 'cubic-bezier(.2,.7,.3,1)' },
  );
  anim.onfinish = () => el.remove();
}

// ---------------------------------------------------------
// Composite moments
// ---------------------------------------------------------
const GOLD = '#d4af37';
const GOLD_SOFT = '#f3e5ab';

/** A quest was completed (full or minimum): spark + "+XP" + tone + tap. */
export function celebrateCompletion(xp: number, color: string, kind: 'full' | 'minimum' = 'full'): void {
  const p = actionPoint();
  if (p) {
    burst(p.x, p.y, kind === 'full' ? [color, GOLD, GOLD_SOFT] : [GOLD, GOLD_SOFT], { count: kind === 'full' ? 16 : 9 });
    floatText(p.x, p.y - 18, kind === 'full' ? `+${xp} XP` : `+${xp} XP · min`, kind === 'full' ? color : GOLD);
  }
  playSfx(kind === 'full' ? 'tick' : 'min');
  buzz(12);
}

/** A day-streak milestone: rising embers from a point. */
export function celebrateStreak(x: number, y: number): void {
  burst(x, y, ['#f97316', '#fdba74', GOLD, '#fb923c'], { count: 46, speed: 0.34, life: 1100, size: 2.6, up: true, gravity: 0.00035 });
  playSfx('streak');
  buzz([20, 40, 20]);
}
