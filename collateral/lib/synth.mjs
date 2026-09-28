/* ============================================================
   collateral/lib/synth.mjs — a small, deterministic synthesizer for the promo's score (plan.md §12).

   Ported from Cincy Week's collateral/lib/synth.mjs (its biquads, envelopes, Freeverb, mixer and WAV
   writer) and extended for a son montuno on a chart table: a Karplus-Strong tres, a tumbao bass,
   modal claves, bongó, maracas and güiro, a brass section, a celesta, a ship's bell, the sea and the
   river, and the table's own sounds (the engraving burin, the rose's ratchet, the badge stamps, the
   proof stamp, taps, clicks, whooshes). No samples, no downloads: every sound is computed here and all
   noise comes from a seeded PRNG, so the render is the same bit for bit every time.
   A score is a list of notes on buses; mix() renders the buses, sends them through one shared room,
   applies bus filters and ducking, a master high-pass, a 2:1 glue compressor and a soft ceiling.
   ============================================================ */
import fs from "node:fs";

export const SR = 48000;
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;

/* ---------- deterministic noise ---------- */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1; };
}
/** pink noise (Paul Kellet's refined filter) */
function pinkGen(seed) {
  const R = rng(seed); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => { const w = R(); b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; const o = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926; return o * 0.11; };
}

/* ---------- filters (RBJ biquads, per-sample settable) ---------- */
export class Biquad {
  constructor(type = "lp", f = 1000, q = 0.707, db = 0) { this.type = type; this.db = db; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(f, q); }
  set(f, q = this.q) {
    this.f = f; this.q = q;
    const w = (TAU * Math.min(Math.max(f, 10), SR * 0.45)) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if (this.type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (this.type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else if (this.type === "peak") { const A = Math.pow(10, (this.db || 0) / 40); b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0; return; }
    else if (this.type === "hs") {
      const A = Math.pow(10, (this.db || 0) / 40), sa = 2 * Math.sqrt(A) * (s / 2) * Math.SQRT2;
      b0 = A * ((A + 1) + (A - 1) * c + sa); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - sa);
      a0 = (A + 1) - (A - 1) * c + sa; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - sa;
      this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0; return;
    }
    else { b0 = al; b1 = 0; b2 = -al; }                       // "bp": constant 0 dB peak gain
    a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }
  run(x) { const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2; this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y; }
}

/* ---------- envelopes and oscillators ---------- */
const expDecay = (t, tau) => Math.exp(-t / tau);
function adsr(t, { a = 0.005, d = 0.3, s = 0, hold = Infinity, r = 0.2 }) {
  let v = t < a ? t / a : s + (1 - s) * expDecay(t - a, d);
  if (t > hold) v *= expDecay(t - hold, r / 4.6);
  return v;
}
function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
function sawOsc(freq, phase0 = 0) { let p = phase0; const dt = freq / SR; return (fm = 1) => { const d = dt * fm; const v = 2 * p - 1 - blep(p, d); p += d; if (p >= 1) p -= 1; return v; }; }

/* ---------- Karplus-Strong string (the tres) ---------- */
function ksString(f, n, { seed = 1, vel = 1, beta = 0.13, rho = 0.9965, damp = 0.95, dampAt = Infinity, bright = 1 }) {
  const out = new Float32Array(n), R = rng(seed);
  const period = SR / f, N = Math.floor(period - 0.5), frac = period - 0.5 - N;       // loop = N samples + a fractional allpass
  const ap = (1 - frac) / (1 + frac);
  const buf = new Float32Array(N + 2);
  // excitation: noise, low-passed by the velocity, with a pick-position comb
  const lp = new Biquad("lp", 2500 + 4500 * Math.min(1, vel) * bright, 0.6);
  const ex = new Float32Array(N + 2); for (let i = 0; i < ex.length; i++) ex[i] = lp.run(R());
  const pk = Math.max(1, Math.round(beta * N));
  for (let i = 0; i < N; i++) buf[i] = ex[i] - (i >= pk ? ex[i - pk] : 0);
  let idx = 0, prev = 0, apx = 0, apy = 0;
  for (let i = 0; i < n; i++) {
    const cur = buf[idx];
    const r = i >= dampAt ? damp : rho;
    let y = r * 0.5 * (cur + prev);                          // the loop's averaging low-pass
    const a = ap * y + apx - ap * apy; apx = y; apy = a; y = a; // fractional delay (first-order allpass)
    prev = cur; buf[idx] = y; idx = (idx + 1) % N;
    out[i] = cur;
  }
  return out;
}

/* ---------- instruments: each returns a mono Float32Array ---------- */
export const I = {
  /** tres: a course of two strings (unison ±3 cents); the middle course is an octave pair; body peaks at 220 Hz and 1.1 kHz */
  tres({ midi, dur = 0.25, vel = 1, seed = 1, ring = 1.6, bright = 1, damped = false }) {
    const f = mtof(midi), n = Math.round(SR * (dur + ring)), o = new Float32Array(n);
    const dampAt = Math.round(SR * (dur + 0.02));
    const s1 = ksString(f * Math.pow(2, 3 / 1200), n, { seed, vel, dampAt, damp: damped ? 0.9 : 0.985, bright });
    const s2 = ksString(f * Math.pow(2, -3 / 1200), n, { seed: seed + 101, vel, dampAt, damp: damped ? 0.9 : 0.985, bright });
    const oct = midi >= 60 && midi <= 67 ? ksString(f * 2, n, { seed: seed + 202, vel: vel * 0.8, dampAt, damp: 0.98, bright }) : null;
    const b1 = new Biquad("peak", 220, 2, 5), b2 = new Biquad("peak", 1100, 3, 4), hp = new Biquad("hp", 90, 0.7);
    for (let i = 0; i < n; i++) {
      let x = s1[i] + s2[i] + (oct ? 0.45 * oct[i] : 0);
      x = hp.run(b2.run(b1.run(x)));
      o[i] = x * 0.42 * vel;
    }
    return o;
  },
  /** bass: a sine plus a low-passed triangle, a −30 cent scoop over 25 ms, a round decay */
  bass({ midi, dur, vel = 1 }) {
    const f = mtof(midi), n = Math.round(SR * (dur + 0.3)), o = new Float32Array(n), lp = new Biquad("lp", 700, 0.7); let ph = 0, pt = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, cents = -30 * Math.max(0, 1 - t / 0.025), ff = f * Math.pow(2, cents / 1200);
      ph += (TAU * ff) / SR; pt += ff / SR; if (pt >= 1) pt -= 1;
      const tri = 1 - 4 * Math.abs(pt - 0.5);
      const e = adsr(t, { a: 0.006, d: 0.45, s: 0.5, hold: dur, r: 0.12 });
      o[i] = (Math.sin(ph) * 0.8 + lp.run(tri) * 0.35) * e * 0.8 * vel;
    }
    return o;
  },
  /** claves: two modes (2.45 and 3.9 kHz, 28 and 12 ms) and a 1 ms click; `pitch` retunes the modes (the hours) */
  clave({ vel = 1, midi = null, seed = 3 }) {
    const n = Math.round(SR * 0.25), o = new Float32Array(n), R = rng(seed);
    const k = midi ? mtof(midi) / 2450 * 2 : 1, f1 = 2450 * (midi ? mtof(midi) * 2 / 2450 : 1), f2 = f1 * (3.9 / 2.45);
    let p1 = 0, p2 = 0; const hp = new Biquad("hp", 1500, 0.7);
    for (let i = 0; i < n; i++) { const t = i / SR; p1 += (TAU * f1) / SR; p2 += (TAU * f2) / SR;
      o[i] = (Math.sin(p1) * expDecay(t, 0.028) * 0.7 + Math.sin(p2) * expDecay(t, 0.012) * 0.35 + (t < 0.001 ? hp.run(R()) * 0.6 : 0)) * vel; }
    return o;
  },
  /** bongó: membrane modes with a pitch drop; macho 420 → 395 Hz, hembra 300 → 282 Hz; slap adds band-passed noise */
  bongo({ drum = "macho", vel = 1, slap = false, mute = false, seed = 5 }) {
    const [a, b] = drum === "macho" ? [420, 395] : [300, 282];
    const n = Math.round(SR * 0.45), o = new Float32Array(n), R = rng(seed), bp = new Biquad("bp", 2200, 0.9);
    let p0 = 0, p1 = 0, p2 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, f = b + (a - b) * expDecay(t, 0.03);
      p0 += (TAU * f) / SR; p1 += (TAU * f * 1.59) / SR; p2 += (TAU * f * 2.14) / SR;
      const dec = mute ? 0.04 : 0.16;
      let v = Math.sin(p0) * expDecay(t, dec) + 0.45 * Math.sin(p1) * expDecay(t, dec * 0.6) + 0.25 * Math.sin(p2) * expDecay(t, dec * 0.4);
      if (slap) v += bp.run(R()) * expDecay(t, 0.02) * 1.4;
      v += (t < 0.002 ? R() * 0.3 : 0);
      o[i] = v * 0.5 * vel;
    }
    return o;
  },
  /** maracas: high-passed noise (3 ms attack, 40 ms decay) */
  maracas({ vel = 1, seed = 7 }) {
    const n = Math.round(SR * 0.12), o = new Float32Array(n), R = rng(seed), hp = new Biquad("hp", 4200, 0.8), lp = new Biquad("lp", 11000, 0.7);
    for (let i = 0; i < n; i++) { const t = i / SR, e = t < 0.003 ? t / 0.003 : expDecay(t - 0.003, 0.04); o[i] = lp.run(hp.run(R())) * e * 0.55 * vel; }
    return o;
  },
  /** güiro: 1 ms noise clicks through a 2.8–3.2 kHz band-pass; `rate` clicks per second (a function of time, or a number) */
  guiro({ dur = 0.2, rate = 60, vel = 1, seed = 9 }) {
    const n = Math.round(SR * (dur + 0.05)), o = new Float32Array(n), R = rng(seed), bp = new Biquad("bp", 3000, 2.2), bp2 = new Biquad("bp", 3000, 2.2);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, r = typeof rate === "function" ? rate(t) : rate, lv = typeof vel === "function" ? vel(t) : vel;
      ph += r / SR; let click = 0; if (ph >= 1) { ph -= 1; } const inClick = ph < 0.001 * r;
      const x = inClick && t < dur ? R() : 0;
      bp.set(2800 + 400 * ((i * 7919) % 1000) / 1000, 2.2);
      o[i] = bp2.run(bp.run(x)) * 5 * lv * (t < dur ? 1 : expDecay(t - dur, 0.01));
    }
    return o;
  },
  /** brass: a section note, 3 detuned saws; the filter blats 600 → 3200 Hz in 40 ms, then 1400 Hz; 5 Hz vibrato after 0.3 s */
  brass({ midi, dur, vel = 1, pad = false, swell = 0, cut = 1400, cutTo = null, sweep = 1 }) {
    const f = mtof(midi), n = Math.round(SR * (dur + 0.6)), o = new Float32Array(n);
    const osc = [sawOsc(f * Math.pow(2, -7 / 1200), 0.1), sawOsc(f, 0.43), sawOsc(f * Math.pow(2, 6 / 1200), 0.77)];
    const lp = new Biquad("lp", 600, 0.9), lp2 = new Biquad("lp", 600, 0.7);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const vib = t > 0.3 ? 1 + 0.0035 * Math.sin(TAU * 5 * (t - 0.3)) * Math.min(1, (t - 0.3) / 0.3) : 1;
      if (i % 32 === 0) {
        let fc = pad ? cut : t < 0.04 ? 600 + 2600 * (t / 0.04) : 3200 + (cut - 3200) * Math.min(1, (t - 0.04) / 0.12);
        if (cutTo) fc = cut * Math.pow(cutTo / cut, Math.min(1, t / sweep));
        lp.set(fc, 0.9); lp2.set(fc * 1.3, 0.7);
      }
      const a = pad ? 0.25 : 0.012;
      let e = adsr(t, { a, d: 1.2, s: 0.75, hold: dur, r: pad ? 0.6 : 0.25 });
      if (swell) e *= 0.35 + 0.65 * Math.min(1, t / swell);
      o[i] = lp2.run(lp.run((osc[0](vib) + osc[1](vib) + osc[2](vib)) / 3)) * e * 0.3 * vel;
    }
    return o;
  },
  /** celesta: FM 1:1 plus a ×4 partial, decay 0.8 s */
  celesta({ midi, vel = 1, len = 1.4 }) {
    const f = mtof(midi), n = Math.round(SR * len), o = new Float32Array(n); let pc = 0, pm = 0, p4 = 0;
    for (let i = 0; i < n; i++) { const t = i / SR; pc += (TAU * f) / SR; pm += (TAU * f) / SR; p4 += (TAU * f * 4) / SR;
      const idx = 1.1 * expDecay(t, 0.12);
      o[i] = (Math.sin(pc + idx * Math.sin(pm)) * expDecay(t, 0.8) + 0.22 * Math.sin(p4) * expDecay(t, 0.12)) * (t < 0.002 ? t / 0.002 : 1) * 0.28 * vel; }
    return o;
  },
  /** a ship's bell: eight inharmonic partials with decays from 3.2 s down to 0.4 s, and a strike */
  shipsBell({ midi, vel = 1, len = 3.4, seed = 11 }) {
    const f = mtof(midi), n = Math.round(SR * len), o = new Float32Array(n), R = rng(seed), bp = new Biquad("bp", f * 3, 1.5);
    const P = [[0.5, 3.2, 0.35], [1, 2.6, 1], [1.183, 2.0, 0.45], [1.506, 1.5, 0.55], [2, 1.2, 0.5], [2.514, 0.9, 0.3], [2.662, 0.6, 0.25], [3.011, 0.4, 0.2]];
    const ph = new Float64Array(P.length);
    for (let i = 0; i < n; i++) { const t = i / SR; let v = 0;
      for (let k = 0; k < P.length; k++) { ph[k] += (TAU * f * P[k][0]) / SR; v += Math.sin(ph[k]) * expDecay(t, P[k][1]) * P[k][2]; }
      v += t < 0.006 ? bp.run(R()) * 1.2 * (1 - t / 0.006) : 0;
      o[i] = v * 0.16 * vel * (t < 0.001 ? t / 0.001 : 1); }
    return o;
  },
  /** a pitched finger tap */
  tap({ midi = 84, vel = 1, seed = 5 }) {
    const f = mtof(midi), n = Math.round(SR * 0.16), o = new Float32Array(n), R = rng(seed), bp = new Biquad("bp", 2600, 1.1); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR; ph += (TAU * f) / SR; o[i] = (Math.sin(ph) * expDecay(t, 0.028) * 0.5 + bp.run(R()) * expDecay(t, 0.004) * 0.45) * vel; }
    return o;
  },
  /** a trackpad click (16:9) */
  click({ vel = 1, seed = 13 }) {
    const n = Math.round(SR * 0.05), o = new Float32Array(n), R = rng(seed), bp = new Biquad("bp", 3400, 1.6), bp2 = new Biquad("bp", 1200, 2);
    for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (bp.run(R()) * expDecay(t, 0.003) * 0.9 + bp2.run(R()) * expDecay(t, 0.006) * 0.5) * vel; }
    return o;
  },
  /** a wood tick (typing) */
  woodTick({ vel = 1, seed = 1, midi = 96 }) {
    const n = Math.round(SR * 0.05), o = new Float32Array(n), R = rng(seed), f = mtof(midi); let ph = 0; const bp = new Biquad("bp", 2400 + 900 * ((seed * 37) % 10) / 10, 3);
    for (let i = 0; i < n; i++) { const t = i / SR; ph += (TAU * f) / SR; o[i] = (Math.sin(ph) * expDecay(t, 0.006) * 0.4 + bp.run(R()) * expDecay(t, 0.004) * 0.8) * vel; }
    return o;
  },
  /** air moving: band-passed noise swept from → to */
  whoosh({ dur = 0.45, from = 350, to = 3200, vel = 1, seed = 23 }) {
    const n = Math.round(SR * (dur + 0.15)), o = new Float32Array(n), R = rng(seed), bp = new Biquad("bp", from, 0.9), lp = new Biquad("lp", 6000, 0.7);
    for (let i = 0; i < n; i++) {
      const t = i / SR, p = Math.min(1, t / dur);
      if (i % 16 === 0) bp.set(from * Math.pow(to / from, p), 0.9);
      const e = Math.sin(Math.PI * Math.min(1, p)) ** 1.6 * (t > dur ? expDecay(t - dur, 0.04) : 1);
      o[i] = lp.run(bp.run(R())) * e * 0.9 * vel;
    }
    return o;
  },
  /** a low, round landing (a sine drop) */
  thump({ midi = 36, vel = 1 }) {
    const n = Math.round(SR * 0.7), o = new Float32Array(n); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR, f = mtof(midi) * (1 + 0.8 * expDecay(t, 0.03)); ph += (TAU * f) / SR; o[i] = Math.sin(ph) * adsr(t, { a: 0.003, d: 0.22, s: 0 }) * 0.8 * vel; }
    return o;
  },
  /** a swell into a downbeat that ends exactly at `dur` */
  riser({ dur = 0.5, midi = 60, vel = 1, seed = 31 }) {
    const n = Math.round(SR * dur), o = new Float32Array(n), R = rng(seed), bp = new Biquad("bp", 400, 1.2); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR, p = t / dur; if (i % 16 === 0) bp.set(400 * Math.pow(10, p), 1.2); ph += (TAU * mtof(midi) * Math.pow(2, p)) / SR; o[i] = (bp.run(R()) * 0.8 + Math.sin(ph) * 0.12) * p ** 2.2 * vel * 0.6; }
    return o;
  },
  /** paper stamp: a sine thump dropping to the note, and a paper slap */
  stamp({ midi = 69, vel = 1, seed = 17 }) {
    const n = Math.round(SR * 0.25), o = new Float32Array(n), R = rng(seed), f = mtof(midi - 24), bp = new Biquad("bp", 1800, 0.8); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR; ph += (TAU * f * (1 + 1.5 * expDecay(t, 0.012))) / SR; o[i] = (Math.sin(ph) * expDecay(t, 0.05) * 0.6 + bp.run(R()) * expDecay(t, 0.008) * 0.7) * vel; }
    return o;
  },
  /** the proof: a wood-block stamp (1.2 and 1.9 kHz modes) */
  woodblock({ vel = 1, seed = 19 }) {
    const n = Math.round(SR * 0.2), o = new Float32Array(n), R = rng(seed); let p1 = 0, p2 = 0;
    for (let i = 0; i < n; i++) { const t = i / SR; p1 += (TAU * 1200) / SR; p2 += (TAU * 1900) / SR; o[i] = (Math.sin(p1) * expDecay(t, 0.04) + 0.6 * Math.sin(p2) * expDecay(t, 0.025) + (t < 0.0015 ? R() * 0.5 : 0)) * 0.6 * vel; }
    return o;
  },
  /** the rose's ratchet: a 3 kHz, 8 ms tick */
  ratchet({ vel = 1, seed = 21 }) {
    const n = Math.round(SR * 0.012), o = new Float32Array(n), R = rng(seed), bp = new Biquad("bp", 3000, 3); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR; ph += (TAU * 3000) / SR; o[i] = (Math.sin(ph) * 0.4 + bp.run(R()) * 0.8) * expDecay(t, 0.0025) * vel; }
    return o;
  },
  /** the burin: noise band-passed 2–4 kHz with 30–60 Hz chatter; amp(t) and pan are given by the picture */
  burin({ dur, amp, seed = 27 }) {
    const n = Math.round(SR * dur), o = new Float32Array(n), R = rng(seed), bp = new Biquad("bp", 3000, 0.9), R2 = rng(seed + 1);
    let ch = 0, rate = 45;
    for (let i = 0; i < n; i++) { const t = i / SR; ch += rate / SR; if (ch >= 1) { ch -= 1; rate = 30 + 30 * (R2() + 1) / 2; }
      if (i % 64 === 0) bp.set(2000 + 2000 * (0.5 + 0.5 * Math.sin(TAU * 0.7 * t)), 0.9);
      const chatter = 0.55 + 0.45 * Math.max(0, Math.sin(TAU * ch));
      o[i] = bp.run(R()) * chatter * amp(t) * 0.9; }
    return o;
  },
  /** the sea (or the river): two decorrelated pink noises through a swelling low-pass; cut(t) and gain(t) from the score */
  sea({ dur, seed = 41, cut = () => 800, level = () => 1, river = false }) {
    const n = Math.round(SR * dur), o = new Float32Array(n), P = pinkGen(seed), R = rng(seed + 7);
    const lp = new Biquad("lp", 400, 0.6), bp = new Biquad("bp", 1200, 0.5);
    const jit = 1 + 0.15 * R();
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      if (i % 64 === 0) { const wave = 0.5 + 0.5 * Math.sin((TAU * t) / (6.4 * jit) + seed); lp.set(cut(t) * (0.6 + 0.8 * wave), 0.6); }
      let x = lp.run(P());
      if (river) { x = bp.run(x) * 1.6; x *= 0.75 + 0.25 * Math.sin((TAU * t) / 1.1 + seed); }
      o[i] = x * level(t);
    }
    return o;
  },
};

/* ---------- Freeverb (Jezar's tunings, scaled to 48 kHz) ---------- */
class Comb { constructor(n) { this.b = new Float32Array(n); this.i = 0; this.s = 0; } run(x, fb, damp) { const y = this.b[this.i]; this.s = y * (1 - damp) + this.s * damp; this.b[this.i] = x + this.s * fb; if (++this.i >= this.b.length) this.i = 0; return y; } }
class AP { constructor(n) { this.b = new Float32Array(n); this.i = 0; } run(x) { const b = this.b[this.i], y = -x + b; this.b[this.i] = x + b * 0.5; if (++this.i >= this.b.length) this.i = 0; return y; } }
export function reverb(L, R, { size = 0.78, damp = 0.4, width = 1, predelay = 0.02 } = {}) {
  const k = SR / 44100, sp = 23, CT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], AT = [556, 441, 341, 225];
  const mk = (off) => ({ c: CT.map((n) => new Comb(Math.round((n + off) * k))), a: AT.map((n) => new AP(Math.round((n + off) * k))) });
  const l = mk(0), r = mk(sp), n = L.length, pd = Math.round(predelay * SR);
  const oL = new Float32Array(n), oR = new Float32Array(n), fb = size * 0.28 + 0.7;
  for (let i = 0; i < n; i++) {
    const x = ((i >= pd ? L[i - pd] + R[i - pd] : 0)) * 0.015;
    let a = 0, b = 0; for (const c of l.c) a += c.run(x, fb, damp); for (const c of r.c) b += c.run(x, fb, damp);
    for (const p of l.a) a = p.run(a); for (const p of r.a) b = p.run(b);
    oL[i] = a * (0.5 + width / 2) + b * (0.5 - width / 2); oR[i] = b * (0.5 + width / 2) + a * (0.5 - width / 2);
  }
  return [oL, oR];
}

/* ---------- the mix ---------- */
/**
 * score: { seconds, buses: { name: { gain, send, duck, hp, lp } }, notes: [{ t, bus, inst, pan, gain, ...params }],
 *          duckKeys: [t…], room, fadeOut, tailTo (dB at the end) }
 */
export function mix(score) {
  const N = Math.round(SR * score.seconds);
  const bus = {};
  for (const [name, b] of Object.entries(score.buses)) bus[name] = { ...b, L: new Float32Array(N), R: new Float32Array(N) };
  for (const n of score.notes) {
    const b = bus[n.bus]; if (!b) throw new Error(`no bus ${n.bus}`);
    const buf = I[n.inst](n), i0 = Math.round(n.t * SR), g = n.gain ?? 1;
    const panOf = typeof n.pan === "function" ? n.pan : null, p0 = panOf ? 0 : n.pan ?? 0;
    let gl = g * Math.cos((p0 + 1) * Math.PI / 4) * Math.SQRT2, gr = g * Math.sin((p0 + 1) * Math.PI / 4) * Math.SQRT2;
    for (let i = 0; i < buf.length && i0 + i < N; i++) {
      if (i0 + i < 0) continue;
      if (panOf && i % 256 === 0) { const p = Math.max(-1, Math.min(1, panOf(i / SR))); gl = g * Math.cos((p + 1) * Math.PI / 4) * Math.SQRT2; gr = g * Math.sin((p + 1) * Math.PI / 4) * Math.SQRT2; }
      b.L[i0 + i] += buf[i] * gl; b.R[i0 + i] += buf[i] * gr;
    }
  }
  const duckEnv = new Float32Array(N).fill(0);
  for (const t of score.duckKeys || []) { const i0 = Math.round(t * SR); for (let i = 0; i < SR * 0.25 && i0 + i < N; i++) { const x = i / SR, v = x < 0.006 ? x / 0.006 : Math.exp(-(x - 0.006) / 0.09); duckEnv[i0 + i] = Math.max(duckEnv[i0 + i], v); } }
  const sendL = new Float32Array(N), sendR = new Float32Array(N), outL = new Float32Array(N), outR = new Float32Array(N);
  for (const b of Object.values(bus)) {
    const hpL = b.hp ? new Biquad("hp", b.hp, 0.7) : null, hpR = b.hp ? new Biquad("hp", b.hp, 0.7) : null;
    const lpL = b.lp ? new Biquad("lp", b.lp, 0.7) : null, lpR = b.lp ? new Biquad("lp", b.lp, 0.7) : null;
    for (let i = 0; i < N; i++) {
      let l = b.L[i], r = b.R[i];
      if (hpL) { l = hpL.run(l); r = hpR.run(r); } if (lpL) { l = lpL.run(l); r = lpR.run(r); }
      const g = (b.gain ?? 1) * (1 - (b.duck || 0) * duckEnv[i]);
      l *= g; r *= g; outL[i] += l; outR[i] += r; sendL[i] += l * (b.send || 0); sendR[i] += r * (b.send || 0);
    }
  }
  const [wl, wr] = reverb(sendL, sendR, score.room || {});
  const mhL = new Biquad("hp", 30, 0.7), mhR = new Biquad("hp", 30, 0.7);
  for (let i = 0; i < N; i++) { outL[i] = mhL.run(outL[i] + wl[i]); outR[i] = mhR.run(outR[i] + wr[i]); }
  // glue: feed-forward RMS-ish compressor, 2:1 over −16 dBFS, then a soft ceiling
  let env = 0; const att = Math.exp(-1 / (0.01 * SR)), rel = Math.exp(-1 / (0.18 * SR)), thr = Math.pow(10, -16 / 20);
  for (let i = 0; i < N; i++) {
    const x = Math.max(Math.abs(outL[i]), Math.abs(outR[i])); env = x > env ? att * env + (1 - att) * x : rel * env + (1 - rel) * x;
    const gr = env > thr ? Math.pow(env / thr, 1 / 2 - 1) : 1;
    outL[i] = Math.tanh(outL[i] * gr * 1.05) / 1.05; outR[i] = Math.tanh(outR[i] * gr * 1.05) / 1.05;
  }
  const fi = Math.round(0.004 * SR);
  for (let i = 0; i < fi; i++) { outL[i] *= i / fi; outR[i] *= i / fi; }
  if (score.fadeOut) { const fo = Math.round(score.fadeOut * SR); for (let i = 0; i < fo; i++) { const j = N - fo + i, g = Math.cos((i / fo) * Math.PI / 2); outL[j] *= g; outR[j] *= g; } }
  return [outL, outR];
}

/** A 4× oversampled look-ahead peak limiter (plan.md §12.4): ceiling in dBFS, 5 ms look-ahead, 80 ms release. */
export function limit(L, R, { ceilingDb = -1.2, lookahead = 0.005, release = 0.08 } = {}) {
  const n = L.length, c = Math.pow(10, ceilingDb / 20), la = Math.round(lookahead * SR);
  // true-peak estimate per sample: |x| and three interpolated points to the next sample (4× oversampling,
  // a 24-tap Hann-windowed sinc per phase, as a BS.1770 true-peak meter does)
  const peak = new Float32Array(n), TAPS = 12, phs = [0.25, 0.5, 0.75];
  const H = phs.map((ph) => { const h = new Float64Array(2 * TAPS); let sum = 0; for (let k = -TAPS + 1; k <= TAPS; k++) { const d = k - ph, sinc = Math.sin(Math.PI * d) / (Math.PI * d), w = 0.5 + 0.5 * Math.cos((Math.PI * d) / (TAPS + 0.5)); h[k + TAPS - 1] = sinc * w; sum += sinc * w; } for (let k = 0; k < h.length; k++) h[k] /= sum; return h; });
  for (const x of [L, R]) for (let i = 0; i < n; i++) {
    let m = Math.abs(x[i]);
    if (i >= TAPS && i < n - TAPS) for (const h of H) { let y = 0; for (let k = -TAPS + 1; k <= TAPS; k++) y += x[i + k] * h[k + TAPS - 1]; const a = Math.abs(y); if (a > m) m = a; }
    if (m > peak[i]) peak[i] = m;
  }
  // required gain, looking ahead: the minimum over the next `la` samples, smoothed
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) need[i] = peak[i] > c ? c / peak[i] : 1;
  const gmin = new Float32Array(n); const dq = [];
  for (let i = n - 1; i >= 0; i--) { // sliding minimum over [i, i + la]
    while (dq.length && need[dq[dq.length - 1]] >= need[i]) dq.pop(); dq.push(i);
    while (dq[0] > i + la) dq.shift();
    gmin[i] = need[dq[0]];
  }
  const rel = Math.exp(-1 / (release * SR)); let g = 1;
  const oL = new Float32Array(n), oR = new Float32Array(n);
  for (let i = 0; i < n; i++) { const target = gmin[i]; g = target < g ? target : rel * g + (1 - rel) * target; if (g > target) g = target; oL[i] = L[i] * g; oR[i] = R[i] * g; }
  return [oL, oR];
}

/** 32-bit float stereo WAV */
export function writeWav(file, L, R) {
  const n = L.length, data = Buffer.alloc(n * 8);
  for (let i = 0; i < n; i++) { data.writeFloatLE(L[i], i * 8); data.writeFloatLE(R[i], i * 8 + 4); }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34);
  h.write("data", 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}
