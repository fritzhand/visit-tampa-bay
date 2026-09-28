/* ============================================================
   collateral/lib/promo-cues.mjs — the single source of timing (plan.md §7, §8, §12).

   cues(cut, R, M) → { NF, W(t), flips, actions, state(t), score, captions, reading }
     R = promo-reads.mjs read() (words, counts, the day, the sun), M = live measurements (filled as the
     render runs: slot rects, toast boxes; a pose that frames a device element reads them here).
   Every value is a pure function of t (and of M, which is itself measured at fixed frames), so the
   picture and the score share one clock: the claves, the celesta and the chronometer land together.
   ============================================================ */
import { PHONE, PHONE_K, LAYOUT, LAPTOP } from "./promo-stage.mjs";
import { UNIT, toScreen, camFull, camApply } from "./promo-world.mjs";

export const FPS = 30;
const S2MS = 1000;

/* ---------- easing ---------- */
export const clamp = (p, a = 0, b = 1) => (p < a ? a : p > b ? b : p);
export const lerp = (a, b, p) => a + (b - a) * p;
export const P = (t, t0, d) => clamp((t - t0) / d);
export const inout = (p) => { p = clamp(p); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
export const sine = (p) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(p));
export const out = (p) => 1 - Math.pow(1 - clamp(p), 3);
export const inq = (p) => Math.pow(clamp(p), 3);
export const outBack = (p, c1 = 0.72) => { p = clamp(p); const c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
/** a slam: scale 1.08 → 1, opacity 0 → 1 over 0.15 s (easeOut), then dead still */
export const slam = (t, t0, d = 0.15) => (t < t0 ? { o: 0 } : { o: out(P(t, t0, d)), s: lerp(1.08, 1, out(P(t, t0, d))) });
const fadeOut = (f, t, t0, d) => (t < t0 ? f : { ...f, o: (f.o ?? 1) * (1 - P(t, t0, d)) });

/* ---------- the clock: W(t), piecewise (plan.md §5.2) ---------- */
/** anchors: [[t, W (epoch s), kind]] where kind names the segment ending at that anchor: "lin" or "herm" */
export function clockOf(anchors) {
  const n = anchors.length, tan = new Array(n).fill(null);   // per segment k (k → k+1): [start, end] tangents
  let i = 0;
  while (i < n - 1) {
    if (anchors[i + 1][2] !== "herm") { i++; continue; }
    let j = i + 1; while (j + 1 < n && anchors[j + 1][2] === "herm") j++;
    const d = []; for (let k = i; k < j; k++) d.push((anchors[k + 1][1] - anchors[k][1]) / (anchors[k + 1][0] - anchors[k][0]));
    const mm = new Array(j - i + 1).fill(0); mm[0] = 1; mm[j - i] = 1;           // real speed at both ends
    for (let k = 1; k < j - i; k++) mm[k] = d[k - 1] * d[k] <= 0 ? 0 : (d[k - 1] + d[k]) / 2;
    for (let k = 0; k < j - i; k++) {                                            // Fritsch–Carlson: keep it monotone
      if (d[k] === 0) { mm[k] = mm[k + 1] = 0; continue; }
      const a = mm[k] / d[k], b = mm[k + 1] / d[k], s2 = a * a + b * b;
      if (s2 > 9) { const tau = 3 / Math.sqrt(s2); mm[k] = tau * a * d[k]; mm[k + 1] = tau * b * d[k]; }
    }
    for (let k = i; k < j; k++) tan[k] = [mm[k - i], mm[k - i + 1]];
    i = j;
  }
  const W = (t) => {
    if (t <= anchors[0][0]) return anchors[0][1] + (t - anchors[0][0]);
    for (let k = 0; k < n - 1; k++) {
      const [t0, w0] = anchors[k], [t1, w1, kind] = anchors[k + 1];
      if (t > t1) continue;
      if (kind === "herm") {
        const h = t1 - t0, u = (t - t0) / h, [m0, m1] = tan[k];
        const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
        return h00 * w0 + h10 * h * m0 + h01 * w1 + h11 * h * m1;
      }
      return lerp(w0, w1, (t - t0) / (t1 - t0));
    }
    const [tl, wl] = anchors[n - 1]; return wl + (t - tl);
  };
  return W;
}

/* ---------- the chronometer as an odometer (plan.md §4.6) ---------- */
function h12(h) { const x = h % 12; return x === 0 ? 12 : x; }
export function h12x(h) { return h12(h); }
export function odometer(Wsec, rateMinPerSec, nyParts) {
  const p = nyParts(Math.floor(Wsec * 1000));
  const secs = ((Wsec % 60) + 60) % 60;
  const mTot = p.minutes + secs / 60;
  const mi = Math.floor(mTot), frac = mTot - mi;
  const r = clamp(rateMinPerSec * 0.15, 0.004, 1);
  const q = r >= 1 ? frac : clamp((frac - (1 - r)) / r);
  const pe = r >= 1 ? q : sine(q);
  const nx = mi + 1;
  const ones = [String(mi % 10), String(nx % 10), pe];
  const tens = [String(Math.floor(mi / 10) % 6), String(Math.floor((nx % 1440) / 10) % 6), mi % 10 === 9 ? pe : 0];
  const hA = Math.floor(mi / 60), hB = Math.floor((nx % 1440) / 60);
  const hour = [String(h12(hA)), String(h12(hB)), mi % 60 === 59 ? pe : 0];
  const mer = [hA < 12 ? "AM" : "PM", hB < 12 ? "AM" : "PM", mi % 720 === 719 ? pe : 0];
  return { h: hour, m1: tens, m2: ones, mer, busy: rateMinPerSec > 2 || (pe > 0 && pe < 1), text: `${h12(hA)}:${String(mi % 60).padStart(2, "0")} ${hA < 12 ? "AM" : "PM"}` };
}

/* ---------- camera poses and flights (plan.md §4.5) ---------- */
export const pose = (X, Y, s, pitch, yaw, Cx, Cy) => ({ X, Y, s, pitch, yaw, Cx, Cy });
export function flight(A, B, u, apex = {}) {
  const e = u;
  const lnA = Math.log(A.s), lnB = Math.log(B.s), mid = (lnA + lnB) / 2;
  const Z = apex.s ? mid - Math.log(apex.s) : 0;
  const bump = Math.sin(Math.PI * e);
  const bm = (a, b, ap) => lerp(a, b, e) + (ap == null ? 0 : (ap - lerp(a, b, 0.5)) * bump);
  return {
    X: lerp(A.X, B.X, e), Y: lerp(A.Y, B.Y, e),
    s: Math.exp(lerp(lnA, lnB, e) - Z * bump),
    pitch: bm(A.pitch, B.pitch, apex.pitch), yaw: bm(A.yaw, B.yaw, apex.yaw),
    Cx: bm(A.Cx, B.Cx, apex.Cx), Cy: bm(A.Cy, B.Cy, apex.Cy),
  };
}
const mixPose = (A, B, e) => flight(A, B, e);

/** standing phone: css offset (u, v) from the pivot lands at (Cx + s·k·u, Cy + s·k·v). Solve C for a target. */
export const vpOffset = (u, v) => [u + PHONE.vx - PHONE.W / 2, v + PHONE.vy - PHONE.H];   // viewport css → offset from the pivot
export function framePose(stop, s, [ux, uy], [sx, sy]) { const k = s * PHONE_K, [ox, oy] = vpOffset(ux, uy); return pose(stop[0], stop[1], s, 55, 0, sx - k * ox, sy - k * oy); }

/* ---------- helpers ---------- */
export const heading = (a, b) => (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI;
export const NOTE_ = (n) => { const m = n.match(/^([A-G])([#b]?)(-?\d)$/); const b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return 12 * (Number(m[3]) + 1) + b + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0); };
export const words = (s) => s.replace(/[·–—]/g, " ").split(/\s+/).filter(Boolean).length;
const fsec = (f) => f / FPS;

/* ============================================================ the Reel (plan.md §7) ============================================================ */
export function reelCues(R, M) {
  const Lr = LAYOUT.reel;
  const T = (lat, lng) => { const u = [(lng - R.meta.bbox.w) * R.meta.k * R.meta.sx, (R.meta.bbox.n - lat) * R.meta.sx]; return [u[0] * UNIT, u[1] * UNIT]; };
  const FDS = T(R.fds.lat, R.fds.lng), YB = T(R.ybor.lat, R.ybor.lng), RW = T(R.evPlace.lat, R.evPlace.lng);
  const hd1 = heading(FDS, YB), hd2 = heading(YB, RW);
  const WB9 = pose(5000, 5590, 0.0957, 0, 0, 540, 1330);
  const stopR = (p) => pose(p[0], p[1], 1.2, 55, 0, 540, 2052);
  const FDS_R = stopR(FDS), YB_R = stopR(YB), RW_R = stopR(RW);
  const view = { P: Lr.P, ox: Lr.ox, oy: Lr.oy };

  /* ---- the clock (plan.md §7.3) ---- */
  const d = R.plan.date, ny = (hm, s = 0) => R.fmt ? (Date.parse(`${d}T${hm}:00-05:00`) / 1000 + s) : 0;
  const SR = R.SR / 1000, SS = R.SS / 1000, EVE = R.A_EVE / 1000, START = R.START / 1000;
  const W0 = ny("07:14");
  const anchors = [
    [0, W0, "lin"], [1.5, SR, "lin"], [7.55, SR + 6.05, "lin"],
    [8.0, ny("08:00"), "herm"], [8.25, ny("09:00"), "herm"], [8.5, ny("10:00"), "herm"], [8.75, ny("11:00"), "herm"], [9.0, ny("12:00"), "herm"], [9.25, ny("12:30"), "herm"],
    [10.9, ny("12:30") + 1.65, "lin"], [11.7, ny("12:30") + 4.05, "lin"], [13.55, ny("12:30") + 5.9, "lin"],
    [14.0, ny("13:00"), "herm"], [14.25, ny("14:00"), "herm"], [14.5, ny("15:00"), "herm"], [14.75, ny("16:00"), "herm"], [15.0, ny("17:00"), "herm"], [15.5, SS, "herm"],
    [15.9, SS + 0.4, "lin"], [16.3, EVE, "lin"], [19.5, EVE + 3.2, "lin"],
  ];
  const nMin = Math.round((START - EVE) / 60);                       // 23 for Plan A
  for (let k = 1; k < nMin; k++) anchors.push([19.5 + (2 * k) / nMin, EVE + 60 * k, "lin"]);
  anchors.push([21.5, START, "lin"], [30.5, START + 9, "lin"]);
  const Wf = clockOf(anchors);
  const W = (t) => Wf(t) * S2MS;
  const rate = (t) => (Wf(t + 1 / 60) - Wf(t - 1 / 60)) * 30 / 60;    // minutes of clock per video second

  /* ---- actions on frames (real clicks; plan.md §5.4) ---- */
  const actions = [
    { f: 165, kind: "star", dev: "phone", slot: "fds", sel: `.page-head button.star[data-star="${R.fds.id}"]`, n: 1, ids: [R.fds.id] },
    { f: 300, kind: "star", dev: "phone", slot: "ybor", sel: `.page-head button.star[data-star="${R.ybor.id}"]`, n: 2, ids: [R.fds.id, R.ybor.id] },
    { f: 495, kind: "star", dev: "phone", slot: "wo", sel: `#e-${R.ev.id} button.star`, n: 3, ids: [R.fds.id, R.ybor.id, R.ev.id] },
    { f: 686, kind: "navtap", dev: "phone", slot: "wo", sel: `nav.dock a[href$="trip.html"]` },
    { f: 705, kind: "share", dev: "phone", slot: "trip", sel: "[data-trip-share]" },
  ];
  const flips = [{ f: 45, scheme: "light" }, { f: 465, scheme: "dark" }];

  /* ---- scroll targets (from live rects, M) ---- */
  const scroll = (t) => {
    const o = {};
    if (M.fds) o.fds = t < 5.0 ? M.fds.lie : lerp(M.fds.lie, M.fds.star, inout(P(t, 5.0, 0.4)));
    if (M.ybor) {
      let y = M.ybor.lie;
      if (t >= 10.9) y = lerp(M.ybor.lie, M.ybor.src, whip(P(t, 10.9, 0.8)));
      o.ybor = y;
    }
    if (M.wo) o.wo = M.wo.rest;
    if (M.trip) o.trip = M.trip.rest;
    return o;
  };

  /* ---- the phone ---- */
  const standUp = (t, t0, d, pitch, rot0, rot1) => { const q = outBack(P(t, t0, d)); return { phi: pitch * q, rotZ: lerp(rot0, rot1, clamp(q)) }; };
  const lieDown = (t, t0, d, pitch, rot0, rot1) => { const q = 1 - inq(P(t, t0, d)); return { phi: pitch * q, rotZ: lerp(rot0, rot1, q) }; };

  /* ---- camera per time ---- */
  const FDS_P = () => M.fdsToast ? framePose(FDS, 2.1, [M.fdsToast.x + M.fdsToast.w / 2, M.fdsToast.y], [540, 1250]) : pose(FDS[0], FDS[1], 2.1, 55, 0, 540, 1918);
  const YB_P = () => M.yborSrc ? framePose(YB, 2.16, [M.yborSrc.x, M.yborSrc.y], [72, 1180]) : pose(YB[0], YB[1], 2.16, 55, 0, 540, 1900);
  const RW_P = () => M.woCard ? framePose(RW, 1.65, [195, M.woCard.y], [540, 744]) : pose(RW[0], RW[1], 1.65, 55, 0, 540, 1900);
  const TRIP_P = () => M.tripToast ? framePose(RW, 2.1, [M.tripToast.x + M.tripToast.w / 2, M.tripToast.y], [540, 1250]) : pose(RW[0], RW[1], 2.1, 55, 0, 540, 1918);
  const drift = (t, t0) => 2 * Math.sin(((t - t0) / 3) * Math.PI);    // ±2° over 3 s, camera only
  const camera = (t) => {
    if (t < 3.5) return WB9;
    if (t < 4.6) return flight(WB9, FDS_R, inout(P(t, 3.5, 1.1)));
    if (t < 5.55) return { ...FDS_R, yaw: 0 };
    if (t < 6.05) return mixPose(FDS_R, FDS_P(), inout(P(t, 5.55, 0.5)));
    if (t < 7.55) return FDS_P();
    if (t < 9.25) {
      const u = inout(P(t, 7.55, 1.7));
      const c = flight(FDS_P(), YB_R, u, { s: 0.30, pitch: 62, Cx: 540, Cy: 1500 });
      c.yaw = t < 8.0 ? -hd1 * inout(P(t, 7.55, 0.45)) : t < 8.8 ? -hd1 : -hd1 * (1 - inout(P(t, 8.8, 0.45)));
      return c;
    }
    if (t < 11.7) return YB_R;
    if (t < 11.95) return mixPose(YB_R, YB_P(), inout(P(t, 11.7, 0.25)));
    if (t < 13.55) return YB_P();
    if (t < 15.2) return flight(YB_P(), RW_R, inout(P(t, 13.55, 1.65)), { s: 0.32, pitch: 38, yaw: 20, Cx: 540, Cy: 1500 });
    if (t < 16.5) return RW_R;
    if (t < 16.9) return mixPose(RW_R, RW_P(), inout(P(t, 16.5, 0.4)));
    if (t < 22.9) return RW_P();
    if (t < 23.3) return mixPose(RW_P(), RW_R, inout(P(t, 22.9, 0.4)));
    if (t < 23.55) return RW_R;
    if (t < 24.05) return mixPose(RW_R, TRIP_P(), inout(P(t, 23.55, 0.5)));
    if (t < 25.5) return TRIP_P();
    if (t < 26.7) return flight(TRIP_P(), WB9, inout(P(t, 25.5, 1.2)));
    return WB9;
  };

  /* ---- the phone's pose and slot ---- */
  const phone = (t, cam) => {
    const ph = { on: true, k: PHONE_K, x: FDS[0], y: FDS[1], rotZ: hd1, phi: 0, slots: {}, time: "" };
    const tm = R.fmt.nyParts(Math.floor(W(t))); const [hh, mm] = tm.hhmm.split(":").map(Number); ph.time = `${h12(hh)}:${String(mm).padStart(2, "0")}`;
    if (t < 4.0) { ph.slots.fds = 1; }
    else if (t < 7.5) { Object.assign(ph, standUp(t, 4.0, 0.6, cam.pitch, hd1, -cam.yaw)); ph.slots.fds = 1; }
    else if (t < 9.25) {
      const u = inout(P(t, 7.55, 1.7)); ph.x = lerp(FDS[0], YB[0], u); ph.y = lerp(FDS[1], YB[1], u);
      if (t < 9.0) Object.assign(ph, lieDown(t, 7.5, 0.3, cam.pitch, hd1, -cam.yaw)); else Object.assign(ph, standUp(t, 9.0, 0.5, cam.pitch, hd1, -cam.yaw));
      const sw = P(t, 8.4, 4 / 30); ph.slots.fds = 1 - sw; ph.slots.ybor = sw;
    } else if (t < 13.5) { ph.x = YB[0]; ph.y = YB[1]; Object.assign(ph, standUp(t, 9.0, 0.5, cam.pitch, hd1, -cam.yaw)); ph.slots.ybor = 1; }
    else if (t < 15.2) {
      const u = inout(P(t, 13.55, 1.65)); ph.x = lerp(YB[0], RW[0], u); ph.y = lerp(YB[1], RW[1], u);
      if (t < 14.9) Object.assign(ph, lieDown(t, 13.5, 0.3, cam.pitch, hd2, -cam.yaw)); else Object.assign(ph, standUp(t, 14.9, 0.5, cam.pitch, hd2, -cam.yaw));
      const sw = P(t, 14.4, 4 / 30); ph.slots.ybor = 1 - sw; ph.slots.wo = sw;
    } else if (t < 25.5) {
      ph.x = RW[0]; ph.y = RW[1];
      Object.assign(ph, t < 15.4 ? standUp(t, 14.9, 0.5, cam.pitch, hd2, -cam.yaw) : { phi: cam.pitch, rotZ: -cam.yaw });
      const sw = P(t, 22.95, 3 / 30); ph.slots.wo = 1 - sw; ph.slots.trip = sw;
    } else { ph.x = RW[0]; ph.y = RW[1]; Object.assign(ph, lieDown(t, 25.5, 0.35, cam.pitch, hd2, -cam.yaw)); ph.slots.trip = 1; }
    return ph;
  };

  /* ---- words ---- */
  const Wd = R.words;
  const LOG = {
    kicker: { id: "kicker", text: Wd.kicker, words: words(Wd.kicker) },
    sourced: { id: "sourced", text: Wd.sourced, words: words(Wd.sourced) },
    title: { id: "title", text: Wd.eventTitle, words: words(Wd.eventTitle), style: "title" },
    never: { id: "never", text: Wd.startedNever, words: 4 },
    punch: { id: "punch", text: Wd.punch, words: words(Wd.punch), style: "title", size: 52 },
  };
  const clockLine = (t) => `${R.fmt.fmtDayLong(d)} · ${odometer(Wf(t), rate(t), R.fmt.nyParts).text}`.toUpperCase();
  const endTimeWords = () => (M.woUnk || "end time not listed").toUpperCase();

  const head = (t) => {
    const hh = { bottom: 780, ribbon: { text: Wd.ribbonHook, sheet: null, o: 1 } };
    // bottom rule: 780 (hook) → 640 (stops) at 3.9–4.1; → 690 (end) at 26.1–26.3
    hh.bottom = t < 3.9 ? 780 : t < 26.1 ? lerp(780, 640, out(P(t, 3.9, 0.2))) : lerp(640, 690, out(P(t, 26.1, 0.2)));
    if (t < 4.05) {
      const lift = out(P(t, 3.9, 0.15));
      const clockSettled = t >= 1.5;
      hh.hook = {
        wm: { o: 1 - lift, dy: -24 * lift },
        t1: { o: (t < 0.4 ? 0 : 1) * (1 - lift), dy: -24 * lift, clip: out(P(t, 0.4, 8 / 30)) },
        t2: { o: (t < 20 / 30 ? 0 : 1) * (1 - lift), dy: -24 * lift, clip: out(P(t, 20 / 30, 7 / 30)) },
        clock: { o: 1 - lift, dy: -24 * lift }, clockText: clockLine(t),
      };
      if (!clockSettled) hh.hook.clockBusy = true;
    }
    const sheetOf = (slot) => ({ fds: "beaches", ybor: "tampa", wo: R.ev.region || "tampa", trip: null }[slot]);
    if (t >= 4.05 && t < 26.1) {
      let rb = { text: Wd.ribbonHook, sheet: null };
      if (t >= 4.05) rb = { text: M.kick?.fds, sheet: "beaches" };
      if (t >= 8.4) rb = { text: M.kick?.ybor, sheet: "tampa" };
      if (t >= 14.4) rb = { text: M.kick?.wo, sheet: M.kick?.woSheet || "tampa" };
      if (t >= 22.95) rb = { text: M.kick?.trip, sheet: null };
      hh.ribbon = { ...rb, o: 1 };
    }
    if (t >= 26.1) hh.ribbon = { text: Wd.ribbonHook, sheet: null, o: 1 };
    if (t >= 4.05 && t < 26.25) {
      const st = {}, fade = 1 - P(t, 26.1, 0.15);
      const od = odometer(Wf(t), rate(t), R.fmt.nyParts);
      const sl = slam(t, 4.05);
      const settle = [[9.5, 9.5], [15.5, 15.5], [16.3, 16.3]];
      st.chrono = { ...od, o: sl.o * fade, s: sl.s };
      if (t >= 9.5 && t < 9.65) Object.assign(st.chrono, { s: slam(t, 9.5).s });
      st.date = { o: out(P(t, 4.1, 0.15)) * fade };
      // the log line
      let lg = null;
      if (t >= 4.2 && t < 7.8) lg = { ...LOG.kicker, ...slam(t, 4.2) };
      if (t >= 7.8 && t < 9.55) lg = { ...LOG.kicker, o: 1 - P(t, 7.8, 0.15) };
      if (t >= 9.55 && t < 13.65) lg = { ...LOG.sourced, ...slam(t, 9.55) };
      if (t >= 13.5 && t < 13.65) lg = { ...LOG.sourced, o: 1 - P(t, 13.5, 0.15) };
      if (t >= 16.3 && t < 21.55) lg = { ...LOG.title, ...slam(t, 16.3) };
      if (t >= 21.55 && t < 23.2) lg = { ...LOG.never, ...slam(t, 21.55) };
      if (t >= 23.05 && t < 23.2) lg = { ...LOG.never, o: 1 - P(t, 23.05, 0.15) };
      if (t >= 23.55 && t < 26.25) lg = { ...LOG.punch, ...slam(t, 23.55) };
      if (lg && t >= 26.1) { lg.o = (lg.o ?? 1) * fade; lg.dy = -20 * P(t, 26.1, 0.15); }
      st.log = lg;
      // the live-state mirror (the parade)
      if (t >= 16.3 && t < 23.05) st.mirror = { o: t < 22.95 ? slam(t, 16.3).o : 1 - P(t, 22.95, 0.1), busy: t >= 19.5 && t < 21.5 };
      // footnote
      if (t >= 15.55 && t < 21.5) st.foot = { id: "dark", text: Wd.footnote.toUpperCase(), words: words(Wd.footnote), o: out(P(t, 15.55, 0.15)) * (1 - P(t, 21.35, 0.15)), role: "secondary" };
      if (t >= 21.55 && t < 23.2) st.foot = { id: "endtime", text: endTimeWords(), words: 4, o: out(P(t, 21.55, 0.15)) * (1 - P(t, 23.05, 0.15)), role: "secondary" };
      // the typed link (texture)
      if (t >= 23.8 && t < 26.25 && M.link) {
        const shown = M.link.slice(0, Math.round(M.link.length * P(t, 23.8, 0.8)));
        const cut = Wd.url.length + 1;
        st.typed = { o: fade, dy: -20 * P(t, 26.1, 0.15), html: `<b>${shown.slice(0, cut)}</b>${shown.slice(cut)}`, busy: t < 24.6 };
      }
      hh.stops = st;
    }
    if (t >= 26.1) {
      const e = out(P(t, 26.1, 0.15));
      hh.end = { wm: { o: e, dy: 16 * (1 - e) }, counts: { o: out(P(t, 26.15, 0.15)), dy: 16 * (1 - out(P(t, 26.15, 0.15))) } };
    }
    return hh;
  };

  /* ---- the whole state ---- */
  const course = [FDS, YB, RW];
  const legLen = Math.hypot(YB[0] - FDS[0], YB[1] - FDS[1]), leg2 = Math.hypot(RW[0] - YB[0], RW[1] - YB[1]);
  const state = (t) => {
    const f = Math.round(t * FPS);
    const cam = camera(t);
    const theme = t < 1.5 ? "dark" : t < 15.5 ? "light" : "dark";
    const st = { t, f, theme, cam };
    // the table
    let termMode = t < 1.5 ? (t < 1.26 ? 1 : 2) : t < 15.5 ? (t < 1.6 ? 2 : 0) : (t < 15.7 ? 3 : 1);
    if (t >= 15.3 && t < 15.5) termMode = 3;
    let termX = 0;
    if (t >= 1.2 && t < 1.7) termX = 246.3 + (1.5 - t) * 3333;             // sunrise crosses Fort De Soto at f45
    if (t >= 15.3 && t < 15.75) termX = RW[0] / UNIT + (15.5 - t) * 3333;  // sunset crosses the Riverwalk at f465
    const dofIn = Math.max(win(t, 4.6, 7.5), win(t, 9.5, 13.5), win(t, 15.4, 25.5));
    st.gl = { termMode, termX, fillMix: t < 1.15 ? 1 : 1 - P(t, 1.15, 0.1), grade: t < 15.5 ? 0.16 * sine(P(t, 14.0, 1.3)) : 0, dof: 2.0 * dofIn };
    st.engrave = t < 1.25 ? { o: t < 1.15 ? 1 : 1 - P(t, 1.15, 0.1), p: reveal(P(t, 1 / 30, 1.15 - 1 / 30)), p1: reveal(P(t, 1 / 30 + 0.12, 1.15 - 1 / 30)), p2: reveal(P(t, 1 / 30 + 0.24, 1.15 - 1 / 30)) } : null;
    // the rose: on the chart in the whole-bay view; foreground during the dive and the low flight
    if (M.rose) {
      const r0 = M.rose;
      if (t < 3.5) st.rose = { x: r0.x, y: r0.y, d: r0.d, rot: -300 * (1 - outBack(P(t, 0.1, 0.9), 1.9)), o: 1 };
      else if (t < 4.3) { const q = inout(P(t, 3.5, 0.8)); st.rose = null; st.rosefg = { x: lerp(r0.x, -500, q), y: lerp(r0.y, 2400, q), d: lerp(r0.d, 1400, q), rot: 20 * (t - 3.5), o: lerp(1, 0.12, P(t, 3.5, 0.25)) * (1 - P(t, 4.1, 0.2)), blur: 6 * P(t, 3.5, 0.3) }; }
      else if (t >= 8.0 && t < 8.9) { const q = P(t, 8.0, 0.9); st.rosefg = { x: lerp(1500, -400, q), y: lerp(300, 1500, q), d: 1400, rot: 20 * (t - 8.0), o: 0.12 * Math.sin(Math.PI * q), blur: 6 }; }
      else if (t >= 26.0) st.rose = { x: r0.x, y: r0.y, d: r0.d, rot: 0, o: P(t, 26.2, 0.4) };
    }
    // badges (plan.md §7.2 S1)
    if (t >= 2.0 && t < 3.72) {
      st.badges = {};
      const at = { tampa: 60, stpete: 68, beaches: 75, clearwater: 83, around: 90, daytrips: 98 };
      for (const [id, f0] of Object.entries(at)) {
        const tf = f - f0; if (tf < 0) continue;
        let sx = 1, sy = 1;
        if (tf < 5) { const q = inq(tf / 5); sx = sy = lerp(2.4, 1, q); } else if (tf < 7) { sx = 1.05; sy = 0.92; }
        const o = (tf < 5 ? Math.min(1, 0.4 + tf / 5) : 1) * (1 - P(t, 3.5, 0.2));
        const tr = (t - (f0 + 5) / FPS);
        st.badges[id] = { o, sx, sy, r1: tr >= 0 ? { r: lerp(18, 60, out(tr / 0.4)), o: 0.9 * (1 - clamp(tr / 0.4)) } : null, r2: tr >= 0.1 ? { r: lerp(18, 60, out((tr - 0.1) / 0.4)), o: 0.7 * (1 - clamp((tr - 0.1) / 0.4)) } : null };
      }
    }
    st.phone = phone(t, cam);
    st.scroll = scroll(t);
    // course and symbols
    let len = 0;
    if (t >= 7.55) len = legLen * inout(P(t, 7.55, 1.7));
    if (t >= 13.55) len = legLen + leg2 * inout(P(t, 13.55, 1.65));
    st.course = len > 0 ? { pts: course, len, glow: t >= 25.5 ? Math.sin(Math.PI * P(t, 25.5, 0.8)) : 0, o: 1 } : null;
    st.syms = [
      { id: "fds", sym: "landmark", x: FDS[0], y: FDS[1], sheet: "beaches", o: t >= 5.5 ? out(P(t, 5.5, 0.2)) : 0 },
      { id: "ybor", sym: "landmark", x: YB[0], y: YB[1], sheet: "tampa", o: t >= 10.0 ? out(P(t, 10.0, 0.2)) : 0 },
      { id: "rw", sym: "flag", x: RW[0], y: RW[1], sheet: R.ev.region || "tampa", o: t >= 16.5 ? out(P(t, 16.5, 0.2)) : 0 },
    ];
    st.dots = t >= 25.9 ? { o: 1, t: t } : null;
    st.shadow = { o: st.phone.phi > 5 ? 1 : 0 };
    st.mist = 1;
    st.head = head(t);
    st.plate = t >= 27.0 ? { o: out(P(t, 27.0, 0.15)), dy: 30 * (1 - out(P(t, 27.0, 0.15))) } : null;
    // the tap ripple (0.55 s) at each real action
    for (const a of actions) { const ta = fsec(a.f); if (t >= ta && t < ta + 0.55) st.tap = { dev: a.dev, slot: a.slot, sel: a.sel, p: (t - ta) / 0.55 }; }
    if (t >= 16.3 && t < 23.05) st.mirrorFrom = { slot: "wo", sel: `#e-${R.ev.id}` };
    return st;
  };

  /* ---- device must-reads (plan.md §10.1) ---- */
  const deviceReads = [
    { id: "toast-fds", slot: "fds", sel: "[data-toast]", words: 5, t0: 5.5, t1: 7.6, role: "must", toast: true },
    { id: "source-nps", slot: "ybor", sel: ".source-line", last: true, child: "span", words: 5, t0: 11.9, t1: 13.5, role: "must" },
    { id: "toast-link", slot: "trip", sel: "[data-toast]", words: 2, t0: 23.5, t1: 25.5, role: "must", toast: true },
  ];

  /* ---- the score's timetable (plan.md §12.3) ---- */
  const revealAt = (t) => reveal(P(t, 1 / 30, 1.15 - 1 / 30));
  const ratchet = []; { let last = null; for (let f2 = 0; f2 <= 1200; f2++) { const t = 0.1 + 0.9 * f2 / 1200; const rot = -300 * (1 - outBack(P(t, 0.1, 0.9), 1.9)); const k = Math.floor(rot / 11.25); if (last != null && k !== last) ratchet.push(t); last = k; } }
  const whipD = () => (M.ybor ? M.ybor.src - M.ybor.lie : 10000);
  const whipSpeed = (tt) => Math.abs(whipD() * (Math.PI / 2) * Math.sin(Math.PI * clamp(tt / 0.8)) / 0.8);
  const music = {
    sunrise: 1.5, sunset: 15.5, grooveIn: 4.5, pullback: 25.5, started: 21.5, share: 23.5, end: 27.5, roseNorth: 1.0, dive: 3.9,
    burin: { t0: 1 / 30, t1: 1.15, amp: (tt) => clamp((revealAt(1 / 30 + tt + 0.01) - revealAt(1 / 30 + tt - 0.01)) / 0.02 / 1.2), pan: (tt) => -0.6 + 1.2 * revealAt(1 / 30 + tt) },
    ratchet, badges: [60, 68, 75, 83, 90, 98].map((f) => f / FPS),
    grooves: [
      { bar: 2, chords: [null, "D"], next: "A", parts: ["gua", "clave", "mar"], from: 4.5 },
      { bar: 3, chords: ["A", "D"], next: "E", parts: ["gua", "clave", "mar", "bass", "bongo"], fromOf: { bass: 6.5, bongo: 6.5 } },
      { bar: 4, chords: [null, null], parts: ["mar"], vel: 0.6 },
      { bar: 5, chords: ["A", "D"], next: "Fsm", parts: ["gua", "clave", "mar", "bass", "bongo", "guiro"] },
      { bar: 6, chords: [["Fsm", 4], ["D", 2], ["E", 2]], next: "E", parts: ["gua", "clave", "mar", "bass"] },
      { bar: 8, chords: [null, "Bb"], next: "C", parts: ["gua", "clave"], from: 16.5, vel: 0.9 },
      { bar: 9, chords: ["C", "Bb2"], next: "F", parts: ["gua", "clave", "bass", "bongo", "mar"], vel: 0.85 },
      { bar: 10, chords: ["F", "Bb"], parts: ["gua", "clave"], vel: 0.7 },
      { bar: 11, chords: ["C", "Bb2"], next: "F", parts: ["gua", "clave", "bass", "mar"], from: 22.0, vel: 0.75 },
      { bar: 12, chords: ["F", "Bb"], next: "C", parts: ["gua", "clave", "bass", "mar"], vel: 0.65 },
    ],
    taps: [{ t: 5.5, m: [NOTE_("E5"), NOTE_("A5")] }, { t: 10.0, m: [NOTE_("E5"), NOTE_("A5")] }, { t: 16.5, m: [NOTE_("C6"), NOTE_("F6")] }, { t: 686 / FPS, m: [] }, { t: 23.5, m: [] }],
    hours: [[8.0, "A5"], [8.25, "B5"], [8.5, "C#6"], [8.75, "D6"], [9.0, "E6"], [14.0, "C#6"], [14.25, "D6"], [14.5, "E6"], [14.75, "F#6"], [15.0, "G#6"]],
    whooshes: [{ t: 7.55, d: 0.75, from: 400, to: 2600 }, { t: 8.3, d: 0.9, from: 2600, to: 400 }],
    pedals: [{ t: 7.5, d: 2.0, bass: "E2", trem: ["E4", "B4", "E5", "B4"] }, { t: 13.5, d: 2.0, bass: "E2", trem: ["E4", "G#4", "B4", "D5"] }],
    brassCues: [{ t: 13.6, notes: "E3 A3 B3 D4", d: 0.95, swell: 0.9, cut: 700, cutTo: 2600, sweep: 1.9, vel: 0.7 }, { t: 14.55, notes: "E3 G#3 B3 D4", d: 0.95, cut: 1400, cutTo: 3200, sweep: 0.9, vel: 0.8 }],
    strums: [{ t: 9.5, notes: "A2 E3 A3 C#4 E4 A4", dur: 0.7, vel: 0.95 }],
    whip: { t0: 10.9, t1: 11.7, rate: (tt) => Math.max(8, whipSpeed(tt) / 60), level: (tt) => Math.min(1, whipSpeed(tt) / 2000) },
    proof: 12.0,
    countdown: Array.from({ length: nMin - 1 }, (_, k) => 19.5 + (2 * (k + 1)) / nMin),
    typing: Array.from({ length: 36 }, (_, k) => 23.8 + (0.8 * k) / 36),
    glints: Array.from({ length: 40 }, (_, k) => { const dd = R.dots[(k * 97) % R.dots.length]; return [25.9 + (0.7 * k) / 40, dd[0] / 5000 - 1]; }),
    logo3: [[25.5, "A4"], [26.25, "C5"], [27.0, "D5"]], logo2: [[28.0, "G4"], [28.5, "F4"]],
  };

  return {
    music, remeasure: [{ f: 148, what: "fds" }, { f: 326, what: "ybor" }, { f: 430, what: "wo" }],
    cut: "reel", width: Lr.W, height: Lr.H, NF: 915, duration: 30.5, view, W: W, Wsec: Wf, rate, anchors, actions, flips, state, camera, deviceReads,
    stops: { FDS, YB, RW }, cover: 37, poses: { WB: WB9, FDS_R, YB_R, RW_R },
    roseAvoid: [...R.badges.map((b) => { const [x, y] = toScreen(WB9, view, b.x, b.y); return [x - 50, y - 32, x + 50, y + 32]; }),
      phoneBoxAt(WB9, view, FDS, hd1, 16)],
    sceneOf: (t) => (t < 4.6 ? "S1" : t < 7.5 ? "S2" : t < 9.25 ? "T1" : t < 13.5 ? "S3" : t < 15.5 ? "T2" : t < 16.3 ? "S4" : t < 22.9 ? "S5" : t < 25.5 ? "S6" : t < 27 ? "S7" : "S8"),
  };
}

/** the screen box of a phone lying flat at a stop (pivot at the bottom center, top along the heading), plus a margin */
export function phoneBoxAt(cam, view, [px, py], hdg, pad = 0) {
  const a = (hdg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), k = PHONE_K;
  const pts = [[-PHONE.W / 2, 0], [PHONE.W / 2, 0], [-PHONE.W / 2, -PHONE.H], [PHONE.W / 2, -PHONE.H]].map(([u, v]) => toScreen(cam, view, px + k * (u * c - v * s), py + k * (u * s + v * c)));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
}
/** the engraving's reveal: linear for 70%, then easing out (continuous slope) */
export function reveal(q) { q = clamp(q); const a = 1 / 0.85; return q <= 0.7 ? a * q : a * 0.7 + a * (q - 0.7) - (a * (q - 0.7) ** 2) / 0.6; }
/** 1 inside [a, b], easing in and out over 0.2 s at each end */
export function win(t, a, b, d = 0.2) { return t < a || t >= b ? 0 : Math.min(P(t, a, d), 1 - P(t, b - d, d)); }
/** the whip: a sine-eased scroll (peak speed π/2 × average) */
function whip(q) { return sine(q); }
