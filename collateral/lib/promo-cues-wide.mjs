/* ============================================================
   collateral/lib/promo-cues-wide.mjs — the 16:9 cut, 1920 × 1080, 41.5 s (plan.md §8).

   The same day, stops, taps and score material as the Reel, with three additions: a laptop at sunset (the
   dock match onto the map page, the sunset on a big chart, a real click on the map), the share link opened
   on a second browser ("Add 3 to my trip"), and more history at Ybor (the lede, then the timeline rolling
   with one tres note per year). The label frame is a left column (x 32–712); devices live in x 720–1920.
   wideCues(R, M) returns the same shape as reelCues (promo-cues.mjs).
   ============================================================ */
import { PHONE, PHONE_K, LAYOUT, LAPTOP } from "./promo-stage.mjs";
import { UNIT, toScreen } from "./promo-world.mjs";
import {
  FPS, clamp, lerp, P, inout, sine, out, inq, outBack, slam, clockOf, odometer, pose, flight, framePose, heading, NOTE_, words, reveal, win, phoneBoxAt, h12x,
} from "./promo-cues.mjs";

const S2MS = 1000;
const fsec = (f) => f / FPS;

export function wideCues(R, M) {
  const Lw = LAYOUT.wide;
  const view = { P: Lw.P, ox: Lw.ox, oy: Lw.oy };
  const T = (lat, lng) => [(lng - R.meta.bbox.w) * R.meta.k * R.meta.sx * UNIT, (R.meta.bbox.n - lat) * R.meta.sx * UNIT];
  const FDS = T(R.fds.lat, R.fds.lng), YB = T(R.ybor.lat, R.ybor.lng), RW = T(R.evPlace.lat, R.evPlace.lng);
  const hd1 = heading(FDS, YB), hd2 = heading(YB, RW);
  const WB16 = pose(5000, 5590, 0.0894, 0, 0, 1320, 540);
  const R16 = (p) => pose(p[0], p[1], 0.825, 55, 0, 1320, 1022);
  const FDS_R = R16(FDS), YB_R = R16(YB), RW_R = R16(RW);

  /* ---- the clock (plan.md §8.3) ---- */
  const d = R.plan.date, ny = (hm, s = 0) => Date.parse(`${d}T${hm}:00-05:00`) / 1000 + s;
  const SR = R.SR / 1000, SS = R.SS / 1000, EVE = R.A_EVE / 1000, START = R.START / 1000;
  const anchors = [
    [0, ny("07:14"), "lin"], [1.5, SR, "lin"], [7.55, SR + 6.05, "lin"],
    [8.0, ny("08:00"), "herm"], [8.25, ny("09:00"), "herm"], [8.5, ny("10:00"), "herm"], [8.75, ny("11:00"), "herm"], [9.0, ny("12:00"), "herm"], [9.5, ny("12:30"), "herm"],
    [10.9, ny("12:30") + 1.4, "lin"], [11.7, ny("12:30") + 3.8, "lin"], [15.55, ny("12:30") + 7.65, "lin"],
    [16.25, ny("13:00"), "herm"], [16.75, ny("14:00"), "herm"], [17.25, ny("15:00"), "herm"], [17.75, ny("16:00"), "herm"], [18.25, ny("17:00"), "herm"], [19.0, SS - 2.5, "herm"],
    [21.5, SS, "lin"], [23.3, SS + 1.8, "lin"], [24.1, EVE, "lin"], [27.5, EVE + 3.4, "lin"],
  ];
  const nMin = Math.round((START - EVE) / 60);
  for (let k = 1; k < nMin; k++) anchors.push([27.5 + (2 * k) / nMin, EVE + 60 * k, "lin"]);
  anchors.push([29.5, START, "lin"], [41.5, START + 12, "lin"]);
  const Wf = clockOf(anchors);
  const W = (t) => Wf(t) * S2MS;
  const rate = (t) => (Wf(t + 1 / 60) - Wf(t - 1 / 60)) * 30 / 60;

  /* ---- actions ---- */
  const actions = [
    { f: 165, kind: "star", dev: "phone", slot: "fds", sel: `.page-head button.star[data-star="${R.fds.id}"]`, n: 1 },
    { f: 300, kind: "star", dev: "phone", slot: "ybor", sel: `.page-head button.star[data-star="${R.ybor.id}"]`, n: 2 },
    { f: 675, kind: "mapclick", dev: "laptop", slot: "map" },
    { f: 735, kind: "star", dev: "phone", slot: "wo", sel: `#e-${R.ev.id} button.star`, n: 3 },
    { f: 926, kind: "navtap", dev: "phone", slot: "wo", sel: `nav.dock a[href$="trip.html"]` },
    { f: 945, kind: "share", dev: "phone", slot: "trip", sel: "[data-trip-share]" },
    { f: 990, kind: "opentrip", dev: "laptop", slot: "shared" },
    { f: 1065, kind: "addall", dev: "laptop", slot: "shared", sel: "[data-trip-add-all]" },
  ];
  const flips = [{ f: 45, scheme: "light" }, { f: 645, scheme: "dark" }];

  /* ---- scroll targets ---- */
  const scroll = (t) => {
    const o = {};
    if (M.fds) o.fds = t < 5.0 ? M.fds.lie : lerp(M.fds.lie, M.fds.star, inout(P(t, 5.0, 0.4)));
    if (M.ybor && M.yborTl) {
      const tl = M.yborTl;                                  // [page top of each timeline entry]
      let y = M.ybor.lie;
      if (t >= 10.9) y = lerp(M.ybor.lie, tl[0] - 200, sine(P(t, 10.9, 0.85)));
      if (t >= 11.75) { const k = Math.min(tl.length - 1, Math.floor((t - 11.75) / 0.125)); const q = clamp((t - 11.75 - 0.125 * k) / 0.125); y = k >= tl.length - 1 ? tl[tl.length - 1] - 200 : lerp(tl[k] - 200, tl[k + 1] - 200, q); }
      if (t >= 13.0) y = lerp(tl[tl.length - 1] - 200, M.ybor.src, sine(P(t, 13.0, 0.5)));
      o.ybor = y;
    }
    if (M.wo) o.wo = M.wo.rest;
    if (M.trip) o.trip = M.trip.rest;
    return o;
  };

  /* ---- the phone's poses ---- */
  const standUp = (t, t0, dd, pitch, rot0, rot1) => { const q = outBack(P(t, t0, dd)); return { phi: pitch * q, rotZ: lerp(rot0, rot1, clamp(q)) }; };
  const lieDown = (t, t0, dd, pitch, rot0, rot1) => { const q = 1 - inq(P(t, t0, dd)); return { phi: pitch * q, rotZ: lerp(rot0, rot1, q) }; };
  const FDS_P = () => (M.fdsToast ? framePose(FDS, 1.7, [M.fdsToast.x + M.fdsToast.w / 2, M.fdsToast.y], [1320, 760]) : pose(FDS[0], FDS[1], 1.7, 55, 0, 1320, 1400));
  const YB_P = () => (M.yborSrc ? framePose(YB, 1.85, [M.yborSrc.x, M.yborSrc.y], [780, 620]) : pose(YB[0], YB[1], 1.85, 55, 0, 1320, 1400));
  const RW_P = () => (M.woCard ? framePose(RW, 1.7, [195, M.woCard.y], [1320, 120]) : pose(RW[0], RW[1], 1.7, 55, 0, 1320, 1400));
  const TRIP_P = () => (M.tripToast ? framePose(RW, 1.7, [M.tripToast.x + M.tripToast.w / 2, M.tripToast.y], [1320, 760]) : pose(RW[0], RW[1], 1.7, 55, 0, 1320, 1400));
  const DOCK = () => M.dock ? pose(M.dock.X, M.dock.Y, M.dock.s, 0, 0, M.dock.Cx, M.dock.Cy) : pose(3727.7, 5523.6, 0.076848, 0, 0, 1279.7, 500.1);
  const mix = (A, B, e) => flight(A, B, e);

  const camera = (t) => {
    if (t < 3.5) return WB16;
    if (t < 4.6) return flight(WB16, FDS_R, inout(P(t, 3.5, 1.1)));
    if (t < 5.55) return FDS_R;
    if (t < 6.05) return mix(FDS_R, FDS_P(), inout(P(t, 5.55, 0.5)));
    if (t < 7.55) return FDS_P();
    if (t < 9.5) {
      const c = flight(FDS_P(), YB_R, inout(P(t, 7.55, 1.95)), { s: 0.26, pitch: 62, Cx: 1320, Cy: 700 });
      c.yaw = t < 8.0 ? -hd1 * inout(P(t, 7.55, 0.45)) : t < 9.0 ? -hd1 : -hd1 * (1 - inout(P(t, 9.0, 0.5)));
      return c;
    }
    if (t < 13.5) return YB_R;
    if (t < 13.8) return mix(YB_R, YB_P(), inout(P(t, 13.5, 0.3)));
    if (t < 15.5) return YB_P();
    if (t < 18.8) { const c = flight(YB_P(), DOCK(), inout(P(t, 15.5, 3.3)), { s: 0.20, pitch: 30, yaw: 15 }); return c; }
    if (t < 23.3) { const c = { ...DOCK() }; if (t >= 19.77) { const q = sine(P(t, 19.77, 1.73)); c.s *= 1 + 0.02 * q; } if (t >= 21.5) c.s = DOCK().s * 1.02; return c; }
    if (t < 24.1) return flight({ ...DOCK(), s: DOCK().s * 1.02 }, RW_R, inout(P(t, 23.3, 0.8)));
    if (t < 24.5) return RW_R;
    if (t < 24.9) return mix(RW_R, RW_P(), inout(P(t, 24.5, 0.4)));
    if (t < 30.9) return RW_P();
    if (t < 31.3) return mix(RW_P(), RW_R, inout(P(t, 30.9, 0.4)));
    if (t < 31.55) return RW_R;
    if (t < 32.05) return mix(RW_R, TRIP_P(), inout(P(t, 31.55, 0.5)));
    if (t < 33.5) return TRIP_P();
    if (t < 34.0) return mix(TRIP_P(), RW_R, inout(P(t, 33.5, 0.5)));
    if (t < 37.5) return RW_R;
    if (t < 38.7) return flight(RW_R, WB16, inout(P(t, 37.5, 1.2)));
    return WB16;
  };

  const phone = (t, cam) => {
    const ph = { on: true, k: PHONE_K, x: FDS[0], y: FDS[1], rotZ: hd1, phi: 0, slots: {}, time: "" };
    const tm = R.fmt.nyParts(Math.floor(W(t))); const [hh, mm] = tm.hhmm.split(":").map(Number); ph.time = `${h12x(hh)}:${String(mm).padStart(2, "0")}`;
    if (t < 4.0) ph.slots.fds = 1;
    else if (t < 7.5) { Object.assign(ph, standUp(t, 4.0, 0.6, cam.pitch, hd1, -cam.yaw)); ph.slots.fds = 1; }
    else if (t < 9.5) {
      const u = inout(P(t, 7.55, 1.95)); ph.x = lerp(FDS[0], YB[0], u); ph.y = lerp(FDS[1], YB[1], u);
      if (t < 9.0) Object.assign(ph, lieDown(t, 7.5, 0.3, cam.pitch, hd1, -cam.yaw)); else Object.assign(ph, standUp(t, 9.0, 0.5, cam.pitch, hd1, -cam.yaw));
      const sw = P(t, 8.5, 4 / 30); ph.slots.fds = 1 - sw; ph.slots.ybor = sw;
    } else if (t < 15.5) { ph.x = YB[0]; ph.y = YB[1]; Object.assign(ph, standUp(t, 9.0, 0.5, cam.pitch, hd1, -cam.yaw)); ph.slots.ybor = 1; }
    else if (t < 23.7) {
      const u = inout(P(t, 15.55, 2.0)); ph.x = lerp(YB[0], RW[0], u); ph.y = lerp(YB[1], RW[1], u);
      Object.assign(ph, lieDown(t, 15.5, 0.3, cam.pitch, hd2, -cam.yaw));
      const sw = P(t, 16.6, 4 / 30); ph.slots.ybor = 1 - sw; ph.slots.wo = sw;
    } else if (t < 33.5) {
      ph.x = RW[0]; ph.y = RW[1];
      Object.assign(ph, t < 24.3 ? standUp(t, 23.7, 0.5, cam.pitch, hd2, -cam.yaw) : { phi: cam.pitch, rotZ: -cam.yaw });
      const sw = P(t, 30.95, 3 / 30); ph.slots.wo = 1 - sw; ph.slots.trip = sw;
    } else { ph.x = RW[0]; ph.y = RW[1]; Object.assign(ph, lieDown(t, 33.5, 0.3, cam.pitch, hd2, -cam.yaw)); ph.slots.trip = 1; }
    return ph;
  };

  /* ---- the laptop (screen space; plan.md §4.3, §8.2) ---- */
  const LK = LAPTOP.k, LSX = LAPTOP.sx, LSY = LAPTOP.sy, LW = LAPTOP.cssW * LK, LH = LAPTOP.cssH * LK;
  const slideOut = (q) => ({ dx: 700 * q, dy: -200 * q, ry: -25 * q, o: 1 - q });
  const laptop = (t) => {
    if (t < 18.8 || (t >= 23.7 && t < 33.6) || t >= 37.9) return { on: false, slots: {} };
    const lp = { on: true, k: LK, sx: LSX, sy: LSY, slots: {}, bar: true, url: "", bodyO: 1, o: 1 };
    const Rr = M.dock?.R || { x: 1032, y: 261, w: 495.4, h: 478.1 };
    const cx = Rr.x + Rr.w / 2, cy = Rr.y + Rr.h / 2;
    if (t < 23.7) {
      lp.slots.map = 1; lp.url = `${R.words.url}/map.html`;
      // the iris: fade in clipped to R, then open to the full screen while the body fades in and settles
      const fadeIn = P(t, 19.1, 0.27), open = out(P(t, 19.5, 8 / 30)), body = out(P(t, 19.5, 8 / 30));
      const barH = 30;
      const ins = { top: Rr.y - (LSY - barH), left: Rr.x - LSX, right: LSX + LW - (Rr.x + Rr.w), bottom: LSY + LH - (Rr.y + Rr.h) };
      lp.clip = [ins.top * (1 - open), ins.right * (1 - open), ins.bottom * (1 - open), ins.left * (1 - open)];
      lp.slots.map = fadeIn;
      lp.bodyO = body; lp.bodyScale = lerp(1.04, 1, out(P(t, 19.5, 8 / 30))); lp.bodyOrigin = `${cx}px ${cy}px`;
      let rx = 0, ry = 0;
      if (t >= 19.77) { const q = sine(P(t, 19.77, 1.73)); ry = -4 * q; rx = 2 * q; }
      if (t >= 21.5) { ry = -4; rx = 2; }
      let tr = `perspective(2400px) rotateY(${ry}deg) rotateX(${rx}deg)`;
      if (t >= 23.3) { const so = slideOut(inq(P(t, 23.3, 0.4))); tr = `perspective(2400px) translate(${so.dx}px,${so.dy}px) rotateY(${ry + so.ry}deg) rotateX(${rx}deg)`; lp.o = so.o; }
      lp.transform = tr; lp.origin = `${LSX + LW / 2}px ${LSY + LH / 2}px`;
      return lp;
    }
    // the shared link on a second browser (33.6–37.9)
    lp.slots.shared = 1; lp.url = `${R.words.url}/trip.html#${R.hash}`;
    let q = 1 - out(P(t, 33.6, 0.5));
    const so = slideOut(q);
    let k = LK, sx = LSX, sy = LSY;
    if (M.shared && t >= 34.1) {
      const e = inout(P(t, 34.1, 0.4));
      const ex = M.shared.hx, ey = M.shared.hy;             // the top left of "A shared trip" (css)
      const ax = lerp(LSX + LK * ex, 800, e), ay = lerp(LSY + LK * ey, 330, e);
      k = lerp(LK, 1.6, e); sx = ax - k * ex; sy = ay - k * ey;
    }
    lp.k = k; lp.sx = sx; lp.sy = sy;
    lp.transform = `perspective(2400px) translate(${so.dx}px,${so.dy}px) rotateY(${so.ry}deg)`; lp.origin = `${LSX + LW / 2}px ${LSY + LH / 2}px`; lp.o = so.o;
    if (t >= 37.5) { const so2 = slideOut(inq(P(t, 37.5, 0.4))); lp.transform = `perspective(2400px) translate(${so2.dx}px,${so2.dy}px) rotateY(${so2.ry}deg)`; lp.o = so2.o; }
    return lp;
  };

  /* ---- the cursor (16:9) ---- */
  const bez = (a, b, q) => { const c1 = [a[0] + (b[0] - a[0]) * 0.2, a[1] - 120], c2 = [b[0] - (b[0] - a[0]) * 0.1, b[1] - 60]; const u = 1 - q; return [u * u * u * a[0] + 3 * u * u * q * c1[0] + 3 * u * q * q * c2[0] + q * q * q * b[0], u * u * u * a[1] + 3 * u * u * q * c1[1] + 3 * u * q * q * c2[1] + q * q * q * b[1]]; };
  const cursor = (t, lp) => {
    const click = (t0) => { const df = Math.round((t - t0) * FPS); return { s: df >= 0 && df < 3 ? 0.88 : 1, ring: t >= t0 && t < t0 + 0.4 ? { r: lerp(6, 34, out(P(t, t0, 0.4))), o: 1 - P(t, t0, 0.4) } : null }; };
    if (t >= 21.6 && t < 23.3 && M.cluster) {
      const tgt = [LSX + LK * M.cluster.x, LSY + LK * M.cluster.y];
      const p = bez([1800, 980], tgt, inout(P(t, 21.6, 0.8)));
      return { on: true, x: p[0], y: p[1], ...click(22.5) };
    }
    if (t >= 34.6 && t < 37.5 && M.addBtn && lp.on) {
      const tgt = [lp.sx + lp.k * M.addBtn.x, lp.sy + lp.k * M.addBtn.y];
      const p = bez([1850, 1000], tgt, inout(P(t, 34.6, 0.8)));
      return { on: true, x: p[0], y: p[1], ...click(35.5) };
    }
    return null;
  };

  /* ---- words ---- */
  const Wd = R.words;
  const LOG = {
    kicker: { id: "kicker", text: Wd.kicker, words: words(Wd.kicker) },
    founded: { id: "founded", text: Wd.founded, words: words(Wd.founded) },
    sourced: { id: "sourced", text: Wd.sourced, words: words(Wd.sourced), role: "secondary" },
    chart: { id: "chart", text: Wd.mapLede, words: words(Wd.mapLede) },
    title: { id: "title", text: Wd.eventTitle, words: words(Wd.eventTitle), style: "title" },
    never: { id: "never", text: Wd.startedNever, words: 4 },
    punch: { id: "punch", text: Wd.punch, words: words(Wd.punch), style: "title" },
  };
  const clockLine = (t) => `${R.fmt.fmtDayLong(d)} · ${odometer(Wf(t), rate(t), R.fmt.nyParts).text}`.toUpperCase();
  const hourOf = (sec) => { const p = R.fmt.nyParts(Math.floor(sec * 1000)); return p.minutes / 60 + (((sec % 60) + 60) % 60) / 3600; };
  const dayRule = (t) => ({
    o: 1, h0: 5, h1: 21, sr: hourOf(SR), ss: hourOf(SS), now: hourOf(Wf(t)),
    labels: [[6, R.fmt.fmtTime ? R.fmt.fmtTime("06:00") : "6 AM"], [12, R.fmt.fmtTime ? R.fmt.fmtTime("12:00") : "12 PM"], [18, R.fmt.fmtTime ? R.fmt.fmtTime("18:00") : "6 PM"]],
    syms: [t >= 5.5 && { h: hourOf(SR + 4), sym: "landmark", sheet: "beaches" }, t >= 10.0 && { h: 12.5, sym: "landmark", sheet: "tampa" }, t >= 24.5 && { h: hourOf(START), sym: "flag", sheet: R.ev.region || "tampa" }].filter(Boolean),
  });

  const head = (t) => {
    const hh = { bottom: Lw.frame.bottom, ribbon: { text: Wd.ribbonHook, sheet: null, o: 1 } };
    if (t < 4.05) {
      const lift = out(P(t, 3.9, 0.15));
      hh.hook = {
        wm: { o: 1 - lift, dy: -24 * lift },
        t1: { o: (t < 0.4 ? 0 : 1) * (1 - lift), dy: -24 * lift, clip: out(P(t, 0.4, 8 / 30)) },
        t2: { o: (t < 20 / 30 ? 0 : 1) * (1 - lift), dy: -24 * lift, clip: out(P(t, 20 / 30, 7 / 30)) },
        clock: { o: 1 - lift, dy: -24 * lift }, clockText: clockLine(t),
      };
    }
    if (t >= 4.05 && t < 37.6) {
      let rb = { text: M.kick?.fds, sheet: "beaches" };
      if (t >= 8.5) rb = { text: M.kick?.ybor, sheet: "tampa" };
      if (t >= 19.5) rb = { text: M.kick?.map, sheet: null };
      if (t >= 24.1) rb = { text: M.kick?.wo, sheet: M.kick?.woSheet || "tampa" };
      if (t >= 30.95) rb = { text: M.kick?.trip, sheet: null };
      hh.ribbon = { ...rb, o: 1 };
    }
    if (t >= 4.05 && t < 37.75) {
      const st = {}, fade = 1 - P(t, 37.6, 0.15);
      const od = odometer(Wf(t), rate(t), R.fmt.nyParts);
      const sl = slam(t, 4.05);
      st.chrono = { ...od, o: sl.o * fade, s: sl.s };
      st.date = { o: out(P(t, 4.1, 0.15)) * fade };
      let lg = null;
      if (t >= 4.2 && t < 7.8) lg = { ...LOG.kicker, ...slam(t, 4.2) };
      if (t >= 7.8 && t < 9.55) lg = { ...LOG.kicker, o: 1 - P(t, 7.8, 0.15) };
      if (t >= 9.55 && t < 13.55) lg = { ...LOG.founded, ...slam(t, 9.55) };
      if (t >= 13.55 && t < 15.65) lg = { ...LOG.sourced, ...slam(t, 13.55), o: slam(t, 13.55).o * (1 - P(t, 15.5, 0.15)) };
      if (t >= 19.55 && t < 24.1) lg = { ...LOG.chart, ...slam(t, 19.55), o: slam(t, 19.55).o * (1 - P(t, 23.3, 0.15)) };
      if (t >= 24.1 && t < 29.55) lg = { ...LOG.title, ...slam(t, 24.1) };
      if (t >= 29.55 && t < 31.2) lg = { ...LOG.never, ...slam(t, 29.55), o: slam(t, 29.55).o * (1 - P(t, 31.05, 0.15)) };
      if (t >= 31.55 && t < 34.25) lg = { ...LOG.punch, ...slam(t, 31.55), o: slam(t, 31.55).o * (1 - P(t, 34.1, 0.15)) };
      if (t >= 35.55 && t < 37.75 && M.addToast) lg = { id: "added", text: M.addToast.text, words: words(M.addToast.text), ...slam(t, 35.55), o: slam(t, 35.55).o * fade };
      st.log = lg;
      if (t >= 24.1 && t < 31.05) st.mirror = { o: t < 30.95 ? slam(t, 24.1).o : 1 - P(t, 30.95, 0.1), busy: t >= 27.5 && t < 29.5 };
      if (t >= 21.55 && t < 29.5) st.foot = { id: "dark", text: Wd.footnote.toUpperCase(), words: words(Wd.footnote), o: out(P(t, 21.55, 0.15)) * (1 - P(t, 29.35, 0.15)), role: "secondary" };
      if (t >= 29.55 && t < 31.2) st.foot = { id: "endtime", text: (M.woUnk || "end time not listed").toUpperCase(), words: 4, o: out(P(t, 29.55, 0.15)) * (1 - P(t, 31.05, 0.15)), role: "secondary" };
      if (t >= 31.8 && t < 34.25 && M.link) {
        const shown = M.link.slice(0, Math.round(M.link.length * P(t, 31.8, 0.8))), cut = Wd.url.length + 1;
        st.typed = { o: 1 - P(t, 34.1, 0.15), html: `<b>${shown.slice(0, cut)}</b>${shown.slice(cut)}`, busy: t < 32.6 };
      }
      st.dayRule = { ...dayRule(t), o: out(P(t, 4.05, 0.15)) * fade };
      let re = null;
      if (t >= 4.05 && t < 7.5) re = M.rowE?.fds;
      if (t >= 9.5 && t < 15.5) re = M.rowE?.ybor;
      if (t >= 24.1 && t < 30.95) re = M.rowE?.wo;
      if (re) st.rowE = { text: re, o: fade };
      hh.stops = st;
    }
    if (t >= 37.6) {
      const e = out(P(t, 37.6, 0.15));
      hh.ribbon = { text: Wd.ribbonHook, sheet: null, o: 1 };
      hh.end = { wm: { o: e, dy: 16 * (1 - e) }, counts: { o: out(P(t, 37.65, 0.15)) }, src: { o: out(P(t, 37.7, 0.15)) }, about: { o: out(P(t, 37.65, 0.12)) } };
    }
    return hh;
  };

  /* ---- the whole state ---- */
  const course = [FDS, YB, RW];
  const legLen = Math.hypot(YB[0] - FDS[0], YB[1] - FDS[1]), leg2 = Math.hypot(RW[0] - YB[0], RW[1] - YB[1]);
  const Rc = () => (M.dock ? M.dock.unitCenter : [372.77, 552.36]);
  const state = (t) => {
    const f = Math.round(t * FPS);
    const cam = camera(t);
    const theme = t < 1.5 ? "dark" : t < 21.5 ? "light" : "dark";
    const st = { t, f, theme, cam };
    let termMode = t < 1.5 ? (t < 1.26 ? 1 : 2) : t < 21.5 ? (t < 1.6 ? 2 : 0) : (t < 21.75 ? 3 : 1);
    if (t >= 21.25 && t < 21.5) termMode = 3;
    let termX = 0;
    if (t >= 1.2 && t < 1.7) termX = 246.3 + (1.5 - t) * 3333;
    if (t >= 21.2 && t < 21.8) termX = Rc()[0] + (21.5 - t) * 3333;
    const dofIn = Math.max(win(t, 4.6, 7.5), win(t, 9.5, 15.5), win(t, 24.1, 33.5));
    st.gl = { termMode, termX, fillMix: t < 1.15 ? 1 : 1 - P(t, 1.15, 0.1), grade: t < 21.5 ? 0.16 * sine(P(t, 16.0, 2.5)) : 0, dof: 2.0 * dofIn };
    st.engrave = t < 1.25 ? { o: t < 1.15 ? 1 : 1 - P(t, 1.15, 0.1), p: reveal(P(t, 1 / 30, 1.15 - 1 / 30)), p1: reveal(P(t, 1 / 30 + 0.12, 1.15 - 1 / 30)), p2: reveal(P(t, 1 / 30 + 0.24, 1.15 - 1 / 30)) } : null;
    if (M.rose) {
      const r0 = M.rose;
      if (t < 3.5) st.rose = { x: r0.x, y: r0.y, d: r0.d, rot: -300 * (1 - outBack(P(t, 0.1, 0.9), 1.9)), o: 1 };
      else if (t < 4.3) { const q = inout(P(t, 3.5, 0.8)); st.rosefg = { x: lerp(r0.x, 400, q), y: lerp(r0.y, 1500, q), d: lerp(r0.d, 1400, q), rot: 20 * (t - 3.5), o: lerp(1, 0.12, P(t, 3.5, 0.25)) * (1 - P(t, 4.1, 0.2)), blur: 6 * P(t, 3.5, 0.3) }; }
      else if (t >= 8.0 && t < 9.0) { const q = P(t, 8.0, 1.0); st.rosefg = { x: lerp(2300, 700, q), y: lerp(100, 900, q), d: 1400, rot: 20 * (t - 8.0), o: 0.12 * Math.sin(Math.PI * q), blur: 6 }; }

    }
    if (t >= 2.0 && t < 3.72) {
      st.badges = {};
      const at = { tampa: 60, stpete: 68, beaches: 75, clearwater: 83, around: 90, daytrips: 98 };
      for (const [id, f0] of Object.entries(at)) {
        const tf = f - f0; if (tf < 0) continue;
        let sx = 1, sy = 1;
        if (tf < 5) { const q = inq(tf / 5); sx = sy = lerp(2.4, 1, q); } else if (tf < 7) { sx = 1.05; sy = 0.92; }
        const o = (tf < 5 ? Math.min(1, 0.4 + tf / 5) : 1) * (1 - P(t, 3.5, 0.2));
        const tr = t - (f0 + 5) / FPS;
        st.badges[id] = { o, sx, sy, r1: tr >= 0 ? { r: lerp(18, 60, out(tr / 0.4)), o: 0.9 * (1 - clamp(tr / 0.4)) } : null, r2: tr >= 0.1 ? { r: lerp(18, 60, out((tr - 0.1) / 0.4)), o: 0.7 * (1 - clamp((tr - 0.1) / 0.4)) } : null };
      }
    }
    st.phone = phone(t, cam);
    st.scroll = scroll(t);
    let len = 0;
    if (t >= 7.55) len = legLen * inout(P(t, 7.55, 1.95));
    if (t >= 15.55) len = legLen + leg2 * inout(P(t, 15.55, 2.0));
    st.course = len > 0 ? { pts: course, len, glow: t >= 37.5 ? Math.sin(Math.PI * P(t, 37.5, 0.8)) : 0, o: 1 } : null;
    st.syms = [
      { id: "fds", sym: "landmark", x: FDS[0], y: FDS[1], sheet: "beaches", o: t >= 5.5 ? out(P(t, 5.5, 0.2)) : 0 },
      { id: "ybor", sym: "landmark", x: YB[0], y: YB[1], sheet: "tampa", o: t >= 10.0 ? out(P(t, 10.0, 0.2)) : 0 },
      { id: "rw", sym: "flag", x: RW[0], y: RW[1], sheet: R.ev.region || "tampa", o: t >= 24.5 ? out(P(t, 24.5, 0.2)) : 0 },
    ];
    st.dots = t >= 37.9 ? { o: 1, t } : null;
    st.shadow = { o: st.phone.phi > 5 ? 1 : 0 };
    st.mist = 0;
    st.head = head(t);
    st.plate = t >= 37.6 ? { o: out(P(t, 37.6, 0.15)), dy: 30 * (1 - out(P(t, 37.6, 0.15))) } : null;
    st.laptop = laptop(t);
    st.cursor = cursor(t, st.laptop);
    for (const a of actions) { const ta = fsec(a.f); if (a.dev === "phone" && t >= ta && t < ta + 0.55) st.tap = { dev: a.dev, slot: a.slot, sel: a.sel, p: (t - ta) / 0.55 }; }
    if (t >= 24.1 && t < 31.05) st.mirrorFrom = { slot: "wo", sel: `#e-${R.ev.id}` };
    // the share arc: from the phone to the laptop coming in (a quadratic Bézier with the course's arrowhead)
    if (t >= 33.5 && t < 34.2) {
      const [px, py] = toScreen(cam, view, RW[0], RW[1] - 400);
      const ex = 1560, ey = 330, cx = (px + ex) / 2 + 60, cy = Math.min(py, ey) - 180;
      st.arc = { q: [px, py, cx, cy, ex, ey], p: out(P(t, 33.5, 0.4)), w: 6, o: 1 - P(t, 34.0, 0.2) };
    }
    return st;
  };

  const deviceReads = [
    { id: "toast-fds", slot: "fds", sel: "[data-toast]", words: 5, t0: 5.5, t1: 7.6, role: "must", toast: true },
    { id: "source-nps", slot: "ybor", sel: ".source-line", last: true, child: "span", words: 5, t0: 13.7, t1: 15.5, role: "must" },
    { id: "toast-link", slot: "trip", sel: "[data-toast]", words: 2, t0: 31.5, t1: 33.5, role: "must", toast: true },
  ];
  const laptopReads = [{ id: "shared-h", slot: "shared", sel: ".trip-shared h2", words: 3, t0: 34.1, t1: 35.5, role: "must" }];

  /* ---- the score's timetable (plan.md §12.3, 16:9) ---- */
  const revealAt = (t) => reveal(P(t, 1 / 30, 1.15 - 1 / 30));
  const ratchet = []; { let last = null; for (let i = 0; i <= 1200; i++) { const t = 0.1 + 0.9 * i / 1200; const rot = -300 * (1 - outBack(P(t, 0.1, 0.9), 1.9)); const k = Math.floor(rot / 11.25); if (last != null && k !== last) ratchet.push(t); last = k; } }
  const yearNotes = ["F#4", "A4", "C#5", "F#5", "A5", "A5", "C#6", "F#6", "A6", "C#7", "F#7"];
  const music = {
    sunrise: 1.5, sunset: 21.5, grooveIn: 4.5, pullback: 37.5, started: 29.5, share: 31.5, end: 39.5, roseNorth: 1.0, dive: 3.9,
    burin: { t0: 1 / 30, t1: 1.15, amp: (tt) => clamp((revealAt(1 / 30 + tt + 0.01) - revealAt(1 / 30 + tt - 0.01)) / 0.02 / 1.2), pan: (tt) => -0.6 + 1.2 * revealAt(1 / 30 + tt) },
    ratchet, badges: [60, 68, 75, 83, 90, 98].map((f) => f / FPS),
    grooves: [
      { bar: 2, chords: [null, "D"], next: "A", parts: ["gua", "clave", "mar"], from: 4.5 },
      { bar: 3, chords: ["A", "D"], next: "E", parts: ["gua", "clave", "mar", "bass", "bongo"], fromOf: { bass: 6.5, bongo: 6.5 } },
      { bar: 4, chords: [null, null], parts: ["mar"], vel: 0.6 },
      { bar: 5, chords: [["A", 4], ["D", 4]], next: "Fsm", parts: ["gua", "clave", "mar", "bass", "bongo", "guiro"], from: 9.5 },
      { bar: 6, chords: [["Fsm", 4], ["D", 2], ["E", 2]], next: "E", parts: ["clave", "mar", "bass"], vel: 0.8 },
      { bar: 7, chords: ["A", "D"], next: "E", parts: ["gua", "clave", "mar", "bass"], from: 13.8, vel: 0.85 },
      { bar: 8, chords: [null, null], parts: ["mar"], vel: 0.5 },
      { bar: 10, chords: ["A", "D"], parts: ["clave", "mar"], vel: 0.5, from: 19.5 },
      { bar: 12, chords: [null, "Bb"], next: "C", parts: ["gua", "clave"], from: 24.1, vel: 0.9 },
      { bar: 13, chords: ["C", "Bb2"], next: "F", parts: ["gua", "clave", "bass", "bongo", "mar"], vel: 0.85 },
      { bar: 14, chords: ["F", "Bb"], parts: ["gua", "clave"], vel: 0.7 },
      { bar: 15, chords: ["C", "Bb2"], next: "F", parts: ["gua", "clave", "bass", "mar"], from: 30.0, vel: 0.75 },
      { bar: 16, chords: ["F", "Bb"], next: "C", parts: ["gua", "clave", "bass", "mar"], vel: 0.65 },
      { bar: 17, chords: ["C", "Bb2"], next: "F", parts: ["gua", "clave", "bass", "mar"], vel: 0.6 },
      { bar: 18, chords: ["F", "Bb"], next: "C", parts: ["gua", "clave", "mar"], vel: 0.55 },
    ],
    taps: [{ t: 5.5, m: [NOTE_("E5"), NOTE_("A5")] }, { t: 10.0, m: [NOTE_("E5"), NOTE_("A5")] }, { t: 24.5, m: [NOTE_("C6"), NOTE_("F6")] }, { t: 926 / FPS, m: [] }, { t: 31.5, m: [] }],
    clicks: [{ t: 22.5, swish: true }, { t: 35.5 }],
    hours: [[8.0, "A5"], [8.25, "B5"], [8.5, "C#6"], [8.75, "D6"], [9.0, "E6"], [16.25, "C#6"], [16.75, "D6"], [17.25, "E6"], [17.75, "F#6"], [18.25, "G#6"]],
    whooshes: [{ t: 7.55, d: 0.75, from: 400, to: 2600 }, { t: 8.5, d: 0.9, from: 2600, to: 400 }, { t: 23.3, d: 0.6, from: 500, to: 2400, vel: 0.4 }],
    pedals: [{ t: 7.5, d: 2.0, bass: "E2", trem: ["E4", "B4", "E5", "B4"] }, { t: 15.5, d: 3.5, bass: "E2", trem: ["E4", "G#4", "B4", "D5"] }],
    brassCues: [{ t: 15.6, notes: "E3 A3 B3 D4", d: 1.9, swell: 1.6, cut: 700, cutTo: 2600, sweep: 3.0, vel: 0.65 }, { t: 17.5, notes: "E3 G#3 B3 D4", d: 1.9, cut: 1400, cutTo: 3200, sweep: 1.8, vel: 0.75 }, { t: 19.5, notes: "C#4 E4 A4", d: 0.5, vel: 0.8 }, { t: 35.5, notes: "F4 A4 C5", d: 0.4, vel: 0.5 }],
    strums: [{ t: 9.5, notes: "A2 E3 A3 C#4 E4 A4", dur: 0.7, vel: 0.95 }],
    tresNotes: [{ t: 19.5, n: "C#5", dur: 0.4, vel: 0.9, ring: 1.4 }, ...yearNotes.map((n, k) => ({ t: 11.75 + 0.125 * k, n, dur: 0.1, vel: 0.75, ring: 0.9 })), { t: 35.625, n: "C6", dur: 0.12, vel: 0.8 }, { t: 35.75, n: "F6", dur: 0.12, vel: 0.8 }, { t: 35.875, n: "A6", dur: 0.2, vel: 0.8 }],
    whip: null,
    guiroRuns: [{ t0: 10.9, t1: 11.75 }, { t0: 13.0, t1: 13.5 }],
    proof: 13.8,
    countdown: Array.from({ length: nMin - 1 }, (_, k) => 27.5 + (2 * (k + 1)) / nMin),
    typing: Array.from({ length: 36 }, (_, k) => 31.8 + (0.8 * k) / 36),
    arc: 33.5,
    glints: Array.from({ length: 40 }, (_, k) => { const dd = R.dots[(k * 97) % R.dots.length]; return [37.9 + (0.7 * k) / 40, dd[0] / 5000 - 1]; }),
    logo3: [[37.5, "A4"], [38.25, "C5"], [39.0, "D5"]], logo2: [[40.0, "G4"], [40.5, "F4"]],
    bongoSlaps: [],
  };

  return {
    music, remeasure: [{ f: 148, what: "fds" }, { f: 326, what: "ybor" }, { f: 495, what: "wo" }],
    cut: "wide", width: Lw.W, height: Lw.H, NF: 1245, duration: 41.5, view, W, Wsec: Wf, rate, anchors, actions, flips, state, camera, deviceReads, laptopReads,
    stops: { FDS, YB, RW }, cover: 657, poses: { WB: WB16, FDS_R, YB_R, RW_R },
    roseAvoid: [...R.badges.map((b) => { const [x, y] = toScreen(WB16, view, b.x, b.y); return [x - 50, y - 32, x + 50, y + 32]; }), phoneBoxAt(WB16, view, FDS, hd1, 16), [0, 0, 720, 1080]],
    sceneOf: (t) => (t < 4.6 ? "S1" : t < 7.5 ? "S2" : t < 9.5 ? "T1" : t < 15.5 ? "S3" : t < 19.5 ? "T2" : t < 24.1 ? "S4" : t < 30.85 ? "S5" : t < 37.5 ? "S6" : t < 39.5 ? "S7" : "S8"),
  };
}
