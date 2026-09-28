/* ============================================================
   collateral/lib/promo-score.mjs — the original score (plan.md §12): a son montuno on a chart table.

   120 BPM, 4/4, son clave 3-2, a 3-beat pickup (the downbeat of bar n is at 1.5 + 2(n − 1) s). The night
   pickup is in F major; sunrise modulates a major third up to A major (the day); sunset turns a major
   third down to F (the night); the end resolves on F6/9, so the last bar flows into the pickup and the
   loop is musical. Written to the picture: every hit reads its time from the cue module (the sunrise and
   sunset frames, the badge drops, the taps, the hour anchors of the clock, the minute crossings of the
   countdown, the whip's scroll speed), so the claves strike the hours as the chronometer rolls, and the
   celesta climbs one note per countdown minute. Motifs: six plucks for the six sheets, the hours on the
   claves, the countdown on the celesta, the ship's bell at sunrise, sunset, "Started" and the end, and the
   clave rhythm voiced 3 up, 2 down as the sign-off.

   renderScore(cut, R, wav, run) writes a 48 kHz stereo float WAV at −14 LUFS integrated with a
   −1.2 dBFS true-peak ceiling (measured with ffmpeg's ebur128, then a linear gain and the limiter).
   ============================================================ */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { mix, writeWav, limit, SR } from "./synth.mjs";
import { FFMPEG } from "./promo-capture.mjs";
import { reelCues, outBack, P as Pr, sine } from "./promo-cues.mjs";
import { wideCues } from "./promo-cues-wide.mjs";

const NOTE = (n) => { const m = n.match(/^([A-G])([#b]?)(-?\d)$/); const b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return 12 * (Number(m[3]) + 1) + b + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0); };
const N = (s) => s.split(/\s+/).map(NOTE);
const bar = (n) => 1.5 + 2 * (n - 1);

/* the guajeo shapes: one chord per half bar, on 8ths (plan.md §12.3) */
const GUA = {
  A: N("A4 E5 C#5 E5"), D: N("D5 A4 F#5 A4"), E: N("E5 B4 G#5 B4"), D2: N("F#5 D5 A4 D5"), Fsm: N("F#5 C#5 A4 C#5"),
  F: N("F4 C5 A4 C5"), Bb: N("Bb4 F4 D5 F4"), C: N("C5 G4 E5 G4"), Bb2: N("D5 Bb4 F4 Bb4"),
};
const ROOT = { A: NOTE("A2"), D: NOTE("D2"), E: NOTE("E2"), D2: NOTE("D2"), Fsm: NOTE("F#2"), F: NOTE("F2"), Bb: NOTE("Bb1"), C: NOTE("C2"), Bb2: NOTE("Bb1") };
const FIFTH = { A: NOTE("E2"), D: NOTE("A2"), E: NOTE("B1"), D2: NOTE("A2"), Fsm: NOTE("C#2"), F: NOTE("C2"), Bb: NOTE("F2"), C: NOTE("G2"), Bb2: NOTE("F2") };

export function buildScore(cut, R, run) {
  const C = run?.C || (cut === "reel" ? reelCues(R, run?.M || {}) : wideCues(R, run?.M || {}));
  const T = C.music;                                         // the cut's timetable (promo-cues*.mjs)
  const notes = [], duck = [];
  const add = (t, bus, inst, o = {}) => { if (t >= 0 && t < C.duration) notes.push({ t, bus, inst, ...o }); };
  let seed = 100;
  const tres = (t, midi, o = {}) => add(t, "tres", "tres", { midi, dur: o.dur ?? 0.22, vel: o.vel ?? 0.8, seed: seed++, pan: o.pan ?? 0.1, gain: o.gain ?? 1, ring: o.ring ?? 1.2, damped: o.damped, bright: o.bright });
  const strum = (t, ms, o = {}) => ms.forEach((m, i) => tres(t + 0.014 * i, m, { dur: o.dur ?? 1.2, vel: (o.vel ?? 0.9) * (1 - 0.04 * i), pan: -0.3 + (0.6 * i) / Math.max(1, ms.length - 1), gain: o.gain ?? 1, ring: o.ring ?? 2 }));
  const brass = (t, ms, dur, o = {}) => ms.forEach((m, i) => add(t, "brass", "brass", { midi: m, dur, vel: o.vel ?? 0.8, pad: o.pad, swell: o.swell || 0, cut: o.cut ?? 1400, cutTo: o.cutTo, sweep: o.sweep ?? 1, pan: [-0.35, 0.05, 0.35, -0.15, 0.2][i % 5], gain: o.gain ?? 1 }));
  const bell = (t, midi, o = {}) => add(t, "bell", "shipsBell", { midi, vel: o.vel ?? 0.8, seed: seed++, pan: o.pan ?? 0.15, gain: o.gain ?? 1 });
  const cel = (t, midi, o = {}) => add(t, "cel", "celesta", { midi, vel: o.vel ?? 0.8, pan: o.pan ?? 0.2, gain: o.gain ?? 1, len: o.len ?? 1.4 });
  const clave = (t, o = {}) => add(t, "perc", "clave", { vel: o.vel ?? 0.7, midi: o.midi ?? null, seed: seed++, pan: o.pan ?? -0.35, gain: o.gain ?? 1 });
  const sfx = (t, inst, o = {}) => add(t, "sfx", inst, { seed: seed++, ...o });

  /* ---- grooves ---- */
  // chords: a bar as [[chord, eighths], …] summing to 8, or [c1, c2] (one per half bar); `from` skips anything earlier
  const segs = (chords) => (Array.isArray(chords[0]) ? chords : chords.map((c) => [c, 4]));
  const guajeo = (b0, chords, o = {}) => { let k0 = 0; for (const [ch, n8] of segs(chords)) { for (let k = 0; k < n8; k++) { const t = b0 + (k0 + k) * 0.25; if (ch && t >= (o.from ?? 0)) tres(t, GUA[ch][k % 4], { dur: 0.2, vel: (k % 4 === 0 ? 0.85 : 0.68) * (o.vel ?? 1), pan: 0.18, damped: true, ring: 0.5, gain: o.gain ?? 1 }); } k0 += n8; } };
  const tumbao = (b0, chords, next, o = {}) => { const sg = segs(chords); const c1 = sg[0][0] || sg[sg.length - 1][0]; const nx = next || sg[sg.length - 1][0];
    if (b0 + 0.75 >= (o.from ?? 0) && c1) add(b0 + 0.75, "bass", "bass", { midi: ROOT[c1], dur: 0.7, vel: 0.9 * (o.vel ?? 1) });
    if (b0 + 1.5 >= (o.from ?? 0) && nx) add(b0 + 1.5, "bass", "bass", { midi: ROOT[nx], dur: 1.0, vel: 0.85 * (o.vel ?? 1) }); };
  const claveBar = (b0, side, o = {}) => (side === 3 ? [0, 0.75, 1.5] : [0.5, 1.0]).forEach((d) => { if (b0 + d >= (o.from ?? 0)) clave(b0 + d, o); });
  const maracas = (b0, o = {}) => { for (let k = 0; k < 8; k++) if (b0 + k * 0.25 >= (o.from ?? 0)) add(b0 + k * 0.25, "perc", "maracas", { vel: (k % 2 ? 0.55 : 0.32) * (o.vel ?? 1), seed: seed++, pan: 0.4 }); };
  const bongo = (b0, o = {}) => { const pat = [["macho", 0.8], ["macho", 0.35, true], ["macho", 0.6], ["macho", 0.35, true], ["macho", 0.6], ["macho", 0.35, true], ["hembra", 0.85], ["macho", 0.35, true]];
    pat.forEach(([d, v, mute], k) => { if (b0 + k * 0.25 >= (o.from ?? 0)) add(b0 + k * 0.25, "perc", "bongo", { drum: d, vel: v * (o.vel ?? 1), mute: !!mute, seed: seed++, pan: -0.15 }); }); };
  const guiro = (b0, o = {}) => { for (const [d, dur, r] of [[0, 0.42, 70], [1.0, 0.12, 90], [1.25, 0.12, 90]]) if (b0 + d >= (o.from ?? 0)) add(b0 + d, "perc", "guiro", { dur, rate: r, vel: (d ? 0.45 : 0.5) * (o.vel ?? 1), seed: seed++, pan: 0.3 }); };
  const groove = (n, chords, next, parts, o = {}) => { const b0 = bar(n); const po = (k) => ({ ...o, from: Math.max(o.from ?? 0, (o.fromOf || {})[k] ?? 0) });
    if (parts.includes("gua")) guajeo(b0, chords, po("gua")); if (parts.includes("bass")) tumbao(b0, chords, next, po("bass")); if (parts.includes("clave")) claveBar(b0, (n % 2 === 1) ? 3 : 2, { ...po("clave"), vel: 0.65 * (o.vel ?? 1) });
    if (parts.includes("mar")) maracas(b0, po("mar")); if (parts.includes("bongo")) bongo(b0, po("bongo")); if (parts.includes("guiro")) guiro(b0, po("guiro")); };

  /* ---- the sea: the ocean under the whole piece, the river at night ---- */
  const oceanCut = (t) => (t < T.sunrise ? 350 : t < T.sunrise + 0.8 ? 350 * Math.pow(2400 / 350, (t - T.sunrise) / 0.8) : 2400);
  const oceanGain = (t) => (t < T.sunrise ? 1 : t < T.grooveIn ? 0.8 : t < T.sunset ? 0.45 : t < T.pullback ? 0.45 * Math.max(0.25, 1 - (t - T.sunset) / 0.8) : Math.min(1, 0.12 + (t - T.pullback) / 1.5));
  add(0, "sea", "sea", { dur: C.duration, seed: 41, cut: oceanCut, level: oceanGain, pan: 0 });
  add(T.sunset, "sea", "sea", { dur: C.duration - T.sunset, seed: 77, river: true, cut: () => 2200, level: (t) => Math.min(1, t / 0.8) * (T.sunset + t > T.pullback ? Math.max(0, 1 - (T.sunset + t - T.pullback) / 1.2) : 1) * 0.7, pan: 0 });

  /* ---- the pickup: the night bay (F major) ---- */
  brass(0, N("F2 C3 A3"), 1.35, { pad: true, vel: 0.45, cut: 900 });
  [[0.25, "C6"], [0.5, "A5"], [0.75, "F5"]].forEach(([t, n], i) => cel(t, NOTE(n), { vel: 0.55, pan: -0.3 + 0.3 * i }));
  if (T.burin) add(T.burin.t0, "sfx", "burin", { dur: T.burin.t1 - T.burin.t0, amp: T.burin.amp, pan: T.burin.pan, seed: 27, gain: 0.55 });
  for (const t of T.ratchet || []) sfx(t, "ratchet", { vel: 0.35, pan: -0.5 });
  bell(T.roseNorth, NOTE("C6"), { vel: 0.45, gain: 0.8 });
  sfx(T.sunrise - 0.5, "riser", { dur: 0.5, midi: NOTE("E4"), vel: 0.6, gain: 0.8 });

  /* ---- sunrise: A major ---- */
  strum(T.sunrise, N("A2 E3 A3 C#4 E4 A4"), { dur: 1.6, vel: 0.95 });
  brass(T.sunrise, N("A3 C#4 E4"), 1.8, { swell: 0.8, vel: 0.7 });
  bell(T.sunrise, NOTE("E5"), { vel: 0.85 }); bell(T.sunrise + 0.25, NOTE("E5"), { vel: 0.6 });
  sfx(T.sunrise, "thump", { midi: NOTE("A1"), vel: 0.9 });
  N("A4 B4 C#5 D5 E5 F#5").forEach((m, i) => { const t = T.badges[i]; tres(t, m, { dur: 0.3, vel: 0.95, pan: -0.4 + 0.16 * i, ring: 1.4 }); sfx(t, "stamp", { midi: m, vel: 0.7, pan: -0.4 + 0.16 * i }); });

  /* ---- the dive and the running head ---- */
  sfx(T.dive, "whoosh", { dur: 0.6, from: NOTE("E4") ? 330 : 330, to: 2640, vel: 0.5 });
  for (const g of T.grooves) groove(g.bar, g.chords, g.next, g.parts, g);
  for (const k of T.bongoSlaps || []) { add(k, "perc", "bongo", { drum: "macho", slap: true, vel: 0.9, seed: seed++, pan: -0.15 }); duck.push(k); }

  /* ---- taps and their "added" motifs ---- */
  for (const tp of T.taps) {
    sfx(tp.t, "tap", { midi: (tp.m[0] ?? NOTE("F5")) + 12, vel: 0.5, pan: 0.05 });
    tp.m.forEach((m, i) => tres(tp.t + 0.125 * i, m, { dur: 0.18, vel: 0.9, pan: 0.2, ring: 1 }));
  }
  for (const c of T.clicks || []) { sfx(c.t, "click", { vel: 0.8, pan: 0.2 }); if (c.swish) sfx(c.t + 0.02, "whoosh", { dur: 0.22, from: 2600, to: 5200, vel: 0.18 }); }

  /* ---- the hours on the claves, the whooshes of the flights ---- */
  for (const [t, n] of T.hours) { clave(t, { midi: NOTE(n), vel: 0.95, pan: 0.2 }); cel(t, NOTE(n) - 12, { vel: 0.25, len: 0.6 }); }
  for (const w of T.whooshes) sfx(w.t, "whoosh", { dur: w.d, from: w.from, to: w.to, vel: w.vel ?? 0.45 });
  for (const p of T.pedals || []) { add(p.t, "bass", "bass", { midi: NOTE(p.bass), dur: p.d, vel: 0.45 }); if (p.trem) for (let k = 0; k < p.d / 0.0625; k++) tres(p.t + k * 0.0625, NOTE(p.trem[k % p.trem.length]), { dur: 0.06, vel: 0.35 + 0.25 * (k / (p.d / 0.0625)), damped: true, ring: 0.3, pan: 0.25 }); }
  for (const s of T.brassCues || []) brass(s.t, N(s.notes), s.d, s);
  for (const s of T.strums || []) strum(s.t, N(s.notes), s);
  for (const s of T.tresNotes || []) tres(s.t, NOTE(s.n), s);

  /* ---- the whip: the güiro follows the scroll speed ---- */
  if (T.whip) add(T.whip.t0, "perc", "guiro", { dur: T.whip.t1 - T.whip.t0, rate: T.whip.rate, vel: T.whip.level, seed: 55, pan: 0.3, gain: 1.2 });
  for (const g of T.guiroRuns || []) add(g.t0, "perc", "guiro", { dur: g.t1 - g.t0, rate: (tt) => 40 + 60 * Math.sin(Math.PI * Math.min(1, tt / (g.t1 - g.t0))), vel: (tt) => 0.35 + 0.5 * Math.sin(Math.PI * Math.min(1, tt / (g.t1 - g.t0))), seed: seed++, pan: 0.3, gain: 1.1 });
  if (T.proof) { add(T.proof, "sfx", "woodblock", { vel: 0.9, pan: 0 }); tres(T.proof, NOTE("A6"), { dur: 0.4, vel: 0.7, bright: 1.4, ring: 1.6 }); }

  /* ---- sunset: F major, the river, the parade ---- */
  brass(T.sunset, N("F3 A3 C4"), 1.6, { swell: 0.5, vel: 0.85 });
  bell(T.sunset, NOTE("C6"), { vel: 0.85 }); bell(T.sunset + 0.25, NOTE("C6"), { vel: 0.6 });
  sfx(T.sunset, "thump", { midi: NOTE("F1"), vel: 0.9 });
  N("F5 G5 A5 C6 D6").forEach((m, i) => cel(T.sunset + 0.1 + 0.11 * i, m + 12, { vel: 0.4, pan: -0.4 + 0.2 * i }));

  /* ---- the countdown: one celesta note per minute crossing, F4 → F7 ---- */
  const scale = []; for (let o = 4; o <= 7; o++) for (const n of ["F", "G", "A", "Bb", "C", "D", "E"]) scale.push(NOTE(`${n}${n === "C" || n === "D" || n === "E" ? o + 1 : o}`));
  const up = [...new Set(scale)].sort((a, b) => a - b).filter((m) => m >= NOTE("F4") && m <= NOTE("F7"));
  T.countdown.forEach((t, k) => cel(t, up[Math.min(up.length - 1, k + (up.length - T.countdown.length))], { vel: 0.5 + 0.35 * (k / T.countdown.length), pan: -0.3 + 0.6 * (k / T.countdown.length), len: 1.0 }));
  if (T.countdown.length) add(T.countdown[0] - 0.1, "bass", "bass", { midi: NOTE("C2"), dur: T.started - T.countdown[0], vel: 0.4 });

  /* ---- "Started" ---- */
  strum(T.started, N("F2 C3 F3 A3 C4 G4"), { dur: 1.8, vel: 1 });
  brass(T.started, N("F3 A3 C4 G4"), 1.4, { vel: 0.9 });
  bell(T.started, NOTE("C6"), { vel: 0.9 }); bell(T.started + 0.25, NOTE("C6"), { vel: 0.65 });
  N("C7 Bb6 A6 G6 F6 E6 D6 C6 Bb5 A5 G5 F5").forEach((m, i) => cel(T.started + 0.125 * i, m, { vel: 0.6 - 0.02 * i, pan: 0.4 - 0.066 * i, len: 1.0 }));
  add(T.started, "perc", "bongo", { drum: "macho", slap: true, vel: 1, seed: seed++, pan: -0.15 }); duck.push(T.started);

  /* ---- the share ---- */
  N("C6 F6 A6").forEach((m, i) => tres(T.share + 0.125 * i, m, { dur: 0.18, vel: 0.85, pan: 0.2, ring: 1.2 }));
  for (const t of T.typing || []) add(t, "sfx", "woodTick", { vel: 0.12, seed: seed++, pan: 0.25 });
  if (T.arc) for (let k = 0; k < 8; k++) tres(T.arc + 0.05 * k, NOTE("F4") + [0, 2, 4, 5, 7, 9, 11, 12][k], { dur: 0.1, vel: 0.5, ring: 0.8, pan: -0.3 + 0.08 * k });

  /* ---- the pull-back: the clave's 3-side up, glints for the dots ---- */
  sfx(T.pullback, "whoosh", { dur: 1.2, from: 300, to: 3400, vel: 0.4 });
  brass(T.pullback, N("F2 C3 A3"), 2.2, { pad: true, vel: 0.5, cut: 1000 });
  T.logo3.forEach(([t, n]) => { tres(t, NOTE(n), { dur: 0.4, vel: 0.95, ring: 1.6, pan: 0 }); clave(t, { vel: 0.8, pan: -0.2 }); });
  const penta = N("F5 G5 A5 C6 D6 F6 G6 A6");
  (T.glints || []).forEach(([t, x], i) => cel(t, penta[(i * 5) % penta.length], { vel: 0.2 + 0.1 * ((i * 7) % 3), pan: x, len: 1.0, gain: 0.8 }));

  /* ---- the end: F6/9, the clave's 2-side, the tail ---- */
  strum(T.end, N("F2 C3 A3 D4 G4"), { dur: 2.6, vel: 0.95, ring: 2.4 });
  brass(T.end, N("F2 C3 A3 D4"), 2.2, { pad: true, vel: 0.6, cut: 1200 });
  bell(T.end, NOTE("C6"), { vel: 0.8 }); bell(T.end + 0.25, NOTE("C6"), { vel: 0.55 });
  T.logo2.forEach(([t, n]) => { tres(t, NOTE(n), { dur: 0.5, vel: 0.9, ring: 1.8, pan: 0 }); clave(t, { vel: 0.8, pan: -0.2 }); });

  return {
    seconds: C.duration, notes, duckKeys: duck, fadeOut: 0.25,
    buses: {
      tres: { gain: 0.7, send: 0.22, hp: 120 },
      bass: { gain: 0.46, lp: 900, hp: 45, duck: 0.35 },
      perc: { gain: 0.6, send: 0.08, hp: 200 },
      brass: { gain: 0.45, send: 0.3, hp: 180 },
      cel: { gain: 0.4, send: 0.38, hp: 400 },
      bell: { gain: 0.4, send: 0.45 },
      sea: { gain: 0.4, send: 0.1, hp: 160 },
      sfx: { gain: 0.5, send: 0.2, lp: 8000 },
    },
    room: { size: 0.78, damp: 0.4, predelay: 0.02 },
  };
}

/** ffmpeg ebur128 on a file: { I (LUFS), LRA, TP (dBTP) } */
export function measureLoudness(file) {
  const r = String(spawnSync(FFMPEG, ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr || "");
  const S = r.slice(r.lastIndexOf("Summary:"));
  const pick = (re) => Number((S.match(re) || [])[1]);
  return { I: pick(/I:\s+(-?[\d.]+) LUFS/), LRA: pick(/LRA:\s+([\d.]+) LU/), TP: pick(/Peak:\s+(-?[\d.]+) dBFS/) };
}

/** Render, normalize to −14 LUFS, limit to −1.2 dBFS (true peak, 4× oversampled), write the WAV. */
export function renderScore(cut, R, wav, run) {
  const sc = buildScore(cut, R, run);
  let [L, Rr] = mix(sc);
  const tmp = wav.replace(/\.wav$/, "-raw.wav");
  writeWav(tmp, L, Rr);
  const m1 = measureLoudness(tmp);
  const g = Math.pow(10, (-14.0 - m1.I) / 20);
  for (let i = 0; i < L.length; i++) { L[i] *= g; Rr[i] *= g; }
  [L, Rr] = limit(L, Rr, { ceilingDb: run?.ceiling ?? -1.3 });
  writeWav(wav, L, Rr);
  const m2 = measureLoudness(wav);
  // a second nudge if the limiter moved the integrated loudness (it only ever lowers it)
  if (Math.abs(m2.I + 14) > 0.2) { const g2 = Math.pow(10, (-14.0 - m2.I) / 20); for (let i = 0; i < L.length; i++) { L[i] *= g2; Rr[i] *= g2; } [L, Rr] = limit(L, Rr, { ceilingDb: run?.ceiling ?? -1.3 }); writeWav(wav, L, Rr); }
  fs.rmSync(tmp, { force: true });
  let pk = 0, dc = 0; for (let i = 0; i < L.length; i++) { pk = Math.max(pk, Math.abs(L[i]), Math.abs(Rr[i])); dc += L[i] + Rr[i]; }
  return { wav, notes: sc.notes.length, seconds: L.length / SR, raw: m1, final: measureLoudness(wav), samplePeakDb: +(20 * Math.log10(pk)).toFixed(2), dc: +(dc / (2 * L.length)).toExponential(2) };
}
