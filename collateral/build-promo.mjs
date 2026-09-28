#!/usr/bin/env node
/* ============================================================
   collateral/build-promo.mjs — "Sunrise to Lighted Boats", the Tampa Bay Chartbook promo (plan.md).

     node collateral/build-promo.mjs all                   both cuts: frames, score, mux, covers, captions, README
     node collateral/build-promo.mjs reel | wide           one cut
     node collateral/build-promo.mjs check                 reads and assertions for Plans A and B (no frames)
     node collateral/build-promo.mjs textures              the chart table's texture pyramid
     node collateral/build-promo.mjs stills <reel|wide> <t1,t2,…>   full-size PNGs at those seconds (+ the audit so far)
     node collateral/build-promo.mjs audio [reel|wide]     the score alone (WAV + loudness report)
     node collateral/build-promo.mjs sheet <reel|wide>     a contact sheet at 1 fps and stills at the scene boundaries
   Flags: --day A|B · --no-bake-cover · --no-build · --keep-frames · --port N · --determinism

   Needs Playwright (NODE_PATH=/opt/node22/lib/node_modules; Chromium from /opt/pw-browsers) and an ffmpeg
   with libx264 and aac (imageio-ffmpeg's, or $FFMPEG). Builds the current tree privately into
   .cache/promo/site (never docs/), captures it on an installed, paused clock advanced frame by frame,
   and writes collateral/promo-2026-09/. Work files live in .cache/promo/.
   ============================================================ */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { sprite } from "../build/core/icons.mjs";
import { tripHash, decode as decodeTrip } from "../site/js/lib/share.js";
import { serve, newContext, FFMPEG } from "./lib/promo-capture.mjs";
import { renderTextures, basemapPaths, longestSubpath, UNIT } from "./lib/promo-world.mjs";
import { stageHtml, LAYOUT, PHONE } from "./lib/promo-stage.mjs";
import { read, PLANS, HAND } from "./lib/promo-reads.mjs";
import { reelCues, FPS } from "./lib/promo-cues.mjs";
import { wideCues } from "./lib/promo-cues-wide.mjs";
import { Audit } from "./lib/promo-audit.mjs";
import { renderScore, measureLoudness } from "./lib/promo-score.mjs";
import { captions, writeSrt, shareCopy, readme } from "./lib/promo-docs.mjs";
import { sheet as contactSheet, frames as grabFrames, audioCheck, audioPictures } from "./lib/review-tools.mjs";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, ".cache", "promo", "site");
const WORK = path.join(ROOT, ".cache", "promo");
const OUT = path.join(ROOT, "collateral", "promo-2026-09");
fs.mkdirSync(WORK, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const pos = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && ["--day", "--port"].includes(argv[i - 1])));
const cmd = pos[0] || "all";
const DAY = opt("--day", "A");
const log = (...a) => console.log(...a);
const dbg = (...a) => { if (process.env.PROMO_DEBUG) console.log("  ·", ...a); };

/* ---------- 1. the private build ---------- */
function buildSite() {
  if (flag("--no-build") && fs.existsSync(path.join(SITE, "index.html"))) return;
  log("building the site privately → .cache/promo/site");
  const r = spawnSync(process.execPath, [path.join(ROOT, "build.mjs")], { cwd: ROOT, env: { ...process.env, TBC_OUT: path.relative(ROOT, SITE) }, encoding: "utf8" });
  if (r.status !== 0) { console.error(r.stdout.slice(-3000), r.stderr.slice(-2000)); throw new Error("the site build failed: the promo renders only from a clean build"); }
  const last = r.stdout.trim().split("\n").filter((l) => /built/.test(l)).pop();
  if (last) log("  " + last.trim());
}

/* ---------- 2. the stage for one cut ---------- */
async function openStage(browser, S, R, cut, tex, C) {
  const Lc = LAYOUT[cut];
  const W0 = Math.round(C.W(0));
  const ctx = await newContext(browser, { width: Lc.W, height: Lc.H, originA: S.originA, clockAt: W0 - 60000 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`stage: ${e}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  // the engraving: the coast, the minor coast, lake shores and the first two echoes (plan.md §7.2 S1)
  const svg = fs.readFileSync(path.join(SITE, "assets", "map", "basemap.svg"), "utf8");
  const bp = basemapPaths(svg);
  const kS = C.poses.WB.s * UNIT;                          // screen px per unit in the whole-bay view
  const eng = [];
  for (const [cls, w] of [["m-wl2", 0.75], ["m-wl1", 0.9], ["m-lake-shore", 0.6], ["m-coast-minor", 0.55], ["m-coast", 1.1]])
    for (const p of bp[cls] || []) eng.push({ cls: cls === "m-wl1" ? "wl wl1" : cls === "m-wl2" ? "wl wl2" : cls, d: p.d, w: ((w * 1.8) / kS).toFixed(3), len: Math.ceil(longestSubpath(p.d)) + 2 });
  const slotsA = cut === "reel" || true ? { fds: `places/${R.fds.id}.html`, ybor: `places/${R.ybor.id}.html`, wo: "whats-on.html?when=today", trip: "trip.html" } : {};
  const slotsB = cut === "wide" ? { map: "map.html?layers=events&when=today", shared: "trip.html" } : null;
  const html = stageHtml({
    cut, base: S.pathPrefix, sprite: sprite(), words: R.words, tex: Object.fromEntries(Object.entries(tex.files).map(([k, f]) => [k, `/__promo/tex/${tex.hash}/${f}`])),
    counts: R.countLabels.map((l, i) => ({ n: [R.counts.places, R.counts.stays, R.counts.events][i].toLocaleString("en-US"), label: l })),
    slotsA, slotsB, dots: R.dots.map((d) => [...d, 0]), badges: R.badges.map((b) => ({ id: b.id, x: b.x, y: b.y })), eng,
  });
  S.setPage("/__stage", html);
  dbg("stage html", html.length);
  await page.goto(`${S.originA}/__stage`, { waitUntil: "domcontentloaded" });
  dbg("stage loaded");
  // load the slots at W0 − 60 s, paused (every page's 60 s tick then lands on whole minutes)
  const loads = [];
  for (const [name, u] of Object.entries(slotsA)) loads.push(page.evaluate(([n, src]) => new Promise((res) => { const f = document.getElementById("f-" + n); f.onload = () => res(); f.src = src; }), [name, `${S.originA}${S.pathPrefix}${u}`]));
  if (slotsB) for (const [name, u] of Object.entries(slotsB)) if (name !== "shared") loads.push(page.evaluate(([n, src]) => new Promise((res) => { const f = document.getElementById("f-" + n); f.onload = () => res(); f.src = src; }), [name, `${S.originB}${S.pathPrefix}${u}`]));
  await Promise.all(loads);
  dbg("slots loaded");
  for (const f of page.frames()) f.on?.("pageerror", (e) => errors.push(`${f.name()}: ${e}`));
  await ctx.clock.runFor(60000);                            // → W0 exactly: idle callbacks, data fetches, first ticks
  dbg("warm-up done");
  await new Promise((r) => setTimeout(r, 300));             // real time for layout and image decodes (the page clock stays at W0)
  await page.evaluate(() => document.fonts.ready);
  for (const f of page.frames()) await f.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  const glInfo = await page.evaluate(() => window.setupGL());
  return { ctx, page, errors, glInfo, W0, slotsA, slotsB };
}

/* ---------- 3. measurements (plan.md §5.4: targets come from live rects) ---------- */
async function measure(page, R, C, M) {
  const m = await page.evaluate(({ ev }) => {
    const doc = (s) => document.getElementById("f-" + s).contentDocument;
    const top = (d, el) => el.getBoundingClientRect().top + d.defaultView.scrollY;
    const out = {};
    { const d = doc("fds"); const h1 = d.querySelector("h1"), star = d.querySelector(".page-head button.star");
      out.fds = { h1: top(d, h1), star: top(d, star) + star.getBoundingClientRect().height / 2, kick: [...d.querySelectorAll(".page-head .kicker span")].pop().textContent.trim(), maxY: d.documentElement.scrollHeight - 710 }; }
    { const d = doc("ybor"); const h1 = d.querySelector("h1"), src0 = [...d.querySelectorAll(".source-line")].pop(), src = src0.querySelector("span") || src0; const r = src.getBoundingClientRect();
      out.ybor = { h1: top(d, h1), src: top(d, src), srcX: r.left, srcText: src0.textContent.replace(/\s+/g, " ").trim(), srcFirst: src0.querySelector("span")?.textContent.replace(/\s+/g, " ").trim(), kick: [...d.querySelectorAll(".page-head .kicker span")].pop().textContent.trim(), maxY: d.documentElement.scrollHeight - 710, tl: d.querySelectorAll("#timeline li").length, tlTops: [...d.querySelectorAll("#timeline li")].map((li) => top(d, li)) }; }
    const clean = (el) => { if (!el) return null; const c = el.cloneNode(true); c.querySelectorAll(".sr-only").forEach((x) => x.remove()); return c.textContent.replace(/\s+/g, " ").trim(); };
    { const d = doc("fds"); const src = [...d.querySelectorAll(".source-line")].pop(); out.fds.srcFirst = clean(src?.querySelector("span")); }
    { const d = doc("ybor"); const src = [...d.querySelectorAll(".source-line")].pop(); out.ybor.srcFirst = clean(src?.querySelector("span")); }
    { const d = doc("wo"); const c = d.getElementById("e-" + ev); if (!c) return { error: "the parade card is not on What's On (today)" };
      out.wo = { card: top(d, c), h: c.getBoundingClientRect().height, kind: c.querySelector(".ev-kind")?.textContent.replace(/\s+/g, " ").trim(), sheet: c.dataset.sheet || c.closest("[data-sheet]")?.dataset.sheet, unk: c.querySelector(".ev-when .unk")?.textContent.trim(), title: c.querySelector(".ev-title")?.textContent.trim(), status: c.querySelector(".ev-status")?.textContent.trim(), src: c.querySelector(".ev-src, .source-line")?.textContent.replace(/\s+/g, " ").trim() }; }
    { const d = doc("trip"); const k = d.querySelector(".page-head .kicker"); out.trip = { kick: k ? [...k.querySelectorAll("span")].filter((s) => !s.classList.contains("sec-num")).map((s) => s.textContent.trim()).join(" ") : null }; }
    return out;
  }, { ev: R.ev.id });
  if (m.error) throw new Error(m.error);
  M.fds = { lie: Math.max(0, m.fds.h1 - 70), star: Math.min(m.fds.maxY, Math.max(0, m.fds.star - 440)) };
  M.ybor = { lie: Math.max(0, m.ybor.h1 - 70), src: Math.min(m.ybor.maxY, m.ybor.src - 380) };
  M.yborSrc = { x: m.ybor.srcX, y: m.ybor.src - M.ybor.src };
  M.kick = { fds: m.fds.kick.toUpperCase(), ybor: m.ybor.kick.toUpperCase(), wo: (m.wo.kind || "").toUpperCase(), woSheet: m.wo.sheet, trip: (m.trip.kick || "").toUpperCase() };
  M.woUnk = m.wo.unk; M.woSrc = m.wo.src; M.yborSrcText = m.ybor.srcText; M.yborTimeline = m.ybor.tl; M.yborTl = m.ybor.tlTops;
  M.rowE = { fds: m.fds.srcFirst, ybor: m.ybor.srcFirst, wo: m.wo.src };
  if (!/^Source: pinellas\.gov/.test(m.fds.srcFirst || "")) throw new Error(`fds source line changed: ${m.fds.srcFirst}`);
  if (!/^Source: nps\.gov\b/.test(m.ybor.srcText) || !/Checked/.test(m.ybor.srcText)) throw new Error(`ybor source line changed: ${m.ybor.srcText}`);
  if (m.wo.title !== R.ev.title) throw new Error(`What's On card title ${m.wo.title} ≠ ${R.ev.title}`);
  if (!/^end time not listed$/i.test(m.wo.unk || "")) throw new Error(`card end-time words changed: ${m.wo.unk}`);
  if (M.yborTimeline < 5) throw new Error("ybor timeline has fewer than 5 entries");
  // What's On: rest the parade card just below the sticky day header
  M.wo = { rest: await page.evaluate(({ ev, cardTop }) => {
    const d = document.getElementById("f-wo").contentDocument, w = d.defaultView, c = d.getElementById("e-" + ev);
    w.scrollTo(0, Math.max(0, cardTop - 200));
    // the sticky header over the card: the element whose bottom sits highest above the card among stickies
    let hb = 0; for (const e of d.querySelectorAll("body *")) { const cs = getComputedStyle(e); if (cs.position === "sticky" || cs.position === "fixed") { const r = e.getBoundingClientRect(); if (r.top < 400 && r.bottom > hb && r.bottom < 400 && r.height < 300 && r.width > 200) hb = r.bottom; } }
    const y = Math.round(w.scrollY + c.getBoundingClientRect().top - hb - 2);
    w.scrollTo(0, y); return y;
  }, { ev: R.ev.id, cardTop: m.wo.card }) };
  M.woCard = { y: await page.evaluate((ev) => document.getElementById("f-wo").contentDocument.getElementById("e-" + ev).getBoundingClientRect().top, R.ev.id) };
  return m;
}

/* ---------- live re-measures at the moment a scroll starts (pages change with the clock) ---------- */
async function remeasure(page, R, M, what, audit, i) {
  const r = await page.evaluate(({ what, ev }) => {
    const d = document.getElementById("f-" + what).contentDocument, w = d.defaultView;
    const top = (el) => el.getBoundingClientRect().top + w.scrollY;
    const maxY = d.documentElement.scrollHeight - 710;
    if (what === "fds") { const star = d.querySelector(".page-head button.star"); return { star: top(star) + star.getBoundingClientRect().height / 2, maxY }; }
    if (what === "ybor") { const src0 = [...d.querySelectorAll(".source-line")].pop(), src = src0.querySelector("span") || src0; return { src: top(src), srcX: src.getBoundingClientRect().left, maxY, tl: [...d.querySelectorAll("#timeline li")].map(top) }; }
    if (what === "wo") {
      const c = d.getElementById("e-" + ev); const y0 = w.scrollY; w.scrollTo(0, Math.max(0, top(c) - 200));
      let hb = 0; for (const e of d.querySelectorAll("body *")) { const cs = getComputedStyle(e); if (cs.position === "sticky" || cs.position === "fixed") { const q = e.getBoundingClientRect(); if (q.top < 400 && q.bottom > hb && q.bottom < 400 && q.height < 300 && q.width > 200) hb = q.bottom; } }
      const y = Math.round(w.scrollY + c.getBoundingClientRect().top - hb - 2); w.scrollTo(0, y0); return { rest: y, cardY: hb + 2 };
    }
    return null;
  }, { what, ev: R.ev.id });
  if (what === "fds") M.fds.star = Math.min(r.maxY, Math.max(0, r.star - 440));
  if (what === "ybor") { M.ybor.src = Math.min(r.maxY, r.src - 380); M.yborSrc = { x: r.srcX, y: r.src - M.ybor.src }; M.yborTl = r.tl; }
  if (what === "wo") { M.wo.rest = r.rest; M.woCard = { y: r.cardY }; }
  audit.note(`f${i} re-measured ${what}: ${JSON.stringify(r).slice(0, 160)}`);
}

/* ---------- 4. the rose: the lowest land coverage on the chart's lower left (plan.md §4.2) ---------- */
async function placeRose(page, C, cut, R) {
  const L = LAYOUT[cut];
  return page.evaluate(async ({ region, WB, texUrl, avoid, sizes }) => {
    const img = new Image(); img.src = texUrl; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, c.width, c.height).data;
    const land = [245, 230, 196], water = [185, 221, 234];
    const isLand = (sx, sy) => { const ux = (sx - WB.Cx) / (WB.s * 10) + WB.X / 10, uy = (sy - WB.Cy) / (WB.s * 10) + WB.Y / 10; if (ux < 0 || uy < 0 || ux > 1000 || uy > 1118) return false; const tx = Math.round((ux + 30) * c.width / 1060), ty = Math.round((uy + 30) * c.height / 1178); if (tx < 0 || ty < 0 || tx >= c.width || ty >= c.height) return false; const i = (ty * c.width + tx) * 4; const dl = Math.abs(px[i] - land[0]) + Math.abs(px[i + 1] - land[1]) + Math.abs(px[i + 2] - land[2]), dw = Math.abs(px[i] - water[0]) + Math.abs(px[i + 1] - water[1]) + Math.abs(px[i + 2] - water[2]); return dl < dw; };
    for (const d of sizes) {
      let best = null; const r = d / 2;
      for (let cy = region.y0 + r; cy <= region.y1 - r; cy += 20) for (let cx = region.x0 + r; cx <= region.x1 - r; cx += 20) {
        if (avoid.some((b) => cx + r > b[0] && cx - r < b[2] && cy + r > b[1] && cy - r < b[3])) continue;
        let n = 0, l = 0; for (let y = -r; y <= r; y += 6) for (let x = -r; x <= r; x += 6) { if (x * x + y * y > r * r) continue; n++; if (isLand(cx + x, cy + y)) l++; }
        const cov = l / n, score = (cov <= 0.03 ? 0 : 10 + cov) + 0.000001 * ((cx - region.x0) ** 2 + (region.y1 - cy) ** 2);
        if (!best || score < best.score) best = { x: cx, y: cy, d, cov, score };
      }
      if (best && best.cov <= 0.03) return best;
      window.__roseDbg = (window.__roseDbg || []).concat([best]);
    }
    return { fail: window.__roseDbg };
  }, { region: cut === "reel" ? { x0: 0, y0: 1300, x1: 420, y1: 1850 } : { x0: 720, y0: 640, x1: 1000, y1: 1000 }, WB: C.poses.WB, texUrl: `/__promo/tex/${C.texHash}/WB-light.png`, sizes: cut === "reel" ? [220, 180] : [200, 180], avoid: C.roseAvoid });
}

/* ---------- 5. one cut ---------- */
async function renderCut(browser, S, R, tex, cut, { stills = null, frames = true, jpeg = false, quiet = false } = {}) {
  const M = {};
  const C = cut === "reel" ? reelCues(R, M) : wideCues(R, M);
  C.texHash = tex.hash;
  const t0 = Date.now();
  const { ctx, page, errors, glInfo, W0 } = await openStage(browser, S, R, cut, tex, C);
  log(`  ${cut}: stage ready (${glInfo}); clock at ${new Date(W0).toISOString()}`);
  await measure(page, R, C, M);
  if (cut === "wide") await measureLaptop(page, R, C, M);
  M.rose = await placeRose(page, C, cut, R);
  if (!M.rose || M.rose.fail) throw new Error(`the compass rose found no place with ≤ 3% land on the chart's lower left: ${JSON.stringify(M.rose)}`);
  log(`  rose at ${M.rose.x},${M.rose.y} ⌀${M.rose.d} (land ${(M.rose.cov * 100).toFixed(1)}%)`);
  const audit = new Audit(C, R, M, { cut, W: C.width, H: C.height });
  const frameDir = path.join(WORK, `frames-${cut}`);
  if (frames) { fs.rmSync(frameDir, { recursive: true, force: true }); fs.mkdirSync(frameDir, { recursive: true }); }
  const want = stills ? new Set(stills.map((s) => Math.round(s * FPS))) : null;
  const lastWanted = want ? Math.max(...want) : C.NF - 1;
  const clk = { now: W0 };
  const timing = {};
  const flipAt = new Map(C.flips.map((f) => [f.f, f.scheme]));
  const acts = new Map(); for (const a of C.actions) { if (!acts.has(a.f)) acts.set(a.f, []); acts.get(a.f).push(a); }
  const toastRise = [];                                       // [{ slot, f0 }]
  let cdp = null, lastMet = null;
  if (process.env.PROMO_METRICS) { cdp = await ctx.newCDPSession(page); await cdp.send("Performance.enable"); }
  for (let i = 0; i <= lastWanted; i++) {
    const t = i / FPS, tf = Date.now();
    // the site's clock to W(t)
    const target = Math.round(C.W(t));
    if (target > clk.now) { await ctx.clock.runFor(target - clk.now); clk.now = target; }
    if (flipAt.has(i)) await page.emulateMedia({ colorScheme: flipAt.get(i) });
    const rm = (C.remeasure || []).filter((x) => x.f === i);
    for (const x of rm) await remeasure(page, R, M, x.what, audit, i);
    for (const a of acts.get(i) || []) await doAction(page, ctx, S, R, C, M, a, toastRise, i, audit, clk);
    if (cut === "wide") await wideFrame(page, S, R, C, M, i, audit);
    // stage-driven toast rises (opacity 0 → 1, 12 → 0 css over 0.2 s from 1.5 frames after the tap), then the inline style is removed
    for (const tr of toastRise) {
      const q = Math.max(0, Math.min(1, (t - tr.t0 - 0.05) / 0.2));
      if (tr.done) continue;
      await page.evaluate(({ slot, q }) => { const d = document.getElementById("f-" + slot).contentDocument; const el = d.querySelector("[data-toast]"); if (!el) return; if (q >= 1) { el.style.opacity = ""; el.style.transform = ""; return; } el.style.opacity = String(q); el.style.transform = `translate(-50%, ${12 * (1 - q)}px)`; }, { slot: tr.slot, q });
      if (q >= 1) tr.done = true;
    }
    const ta = Date.now();
    const st = C.state(t);
    if (process.env.PROMO_NO_ENG) st.engrave = null;
    if (process.env.PROMO_NO_PHONE) st.phone = { on: false, slots: {} };
    if (process.env.PROMO_NO_GL) st.noGL = true;
    const info = await page.evaluate((s) => window.render(s), st);
    const tb = Date.now();
    if (process.env.PROMO_NO_AUDIT) await page.evaluate(() => 1); else await audit.sample(page, i, t, st, info);
    const tc = Date.now();
    if (frames) await page.screenshot({ path: path.join(frameDir, `${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 92 });
    const td = Date.now();
    if (cdp) { const mm = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value])); if (lastMet) dbg(`f${i} layout ${((mm.LayoutDuration - lastMet.LayoutDuration) * 1000).toFixed(0)} style ${((mm.RecalcStyleDuration - lastMet.RecalcStyleDuration) * 1000).toFixed(0)} script ${((mm.ScriptDuration - lastMet.ScriptDuration) * 1000).toFixed(0)} task ${((mm.TaskDuration - lastMet.TaskDuration) * 1000).toFixed(0)} layouts ${mm.LayoutCount - lastMet.LayoutCount} recalcs ${mm.RecalcStyleCount - lastMet.RecalcStyleCount}`); lastMet = mm; }
    if (process.env.PROMO_DEBUG) dbg(`f${i} total ${Date.now() - tf} pre ${ta - tf} render ${tb - ta} audit ${tc - tb} shot ${td - tc}`);
    if (want && want.has(i)) await page.screenshot(jpeg ? { path: path.join(WORK, `still-${cut}-${t.toFixed(3)}s.jpg`), type: "jpeg", quality: 92 } : { path: path.join(WORK, `still-${cut}-${t.toFixed(3)}s.png`) });
    if (want && want.has(i) && process.env.PROMO_HIDE) { await page.evaluate((sel) => { for (const e of document.querySelectorAll(sel)) e.style.display = "none"; }, process.env.PROMO_HIDE); await page.screenshot({ path: path.join(WORK, `still-${cut}-${t.toFixed(3)}s-hide.png`) }); }
    if (want && want.has(i) && process.env.PROMO_EVAL) log(`EVAL f${i}:`, JSON.stringify(await page.evaluate(process.env.PROMO_EVAL)));
    if (want && want.has(i) && process.env.PROMO_PROBE) { const [px, py] = process.env.PROMO_PROBE.split(",").map(Number); log(await page.evaluate(([x, y]) => document.elementsFromPoint(x, y).map((e) => e.tagName + "#" + e.id + "." + (e.className?.baseVal ?? e.className)).join(" > ") + " ov=" + [...document.getElementById("ov").getContext("2d").getImageData(x, y, 1, 1).data].join(","), [px, py])); }
    if (i === C.cover) await page.screenshot({ path: path.join(WORK, `cover-${cut}.png`) });
    const scene = C.sceneOf ? C.sceneOf(t) : "all"; (timing[scene] ||= []).push(Date.now() - tf);
    if (i % 30 === 0) process.stdout.write(`\r  ${cut} frame ${i}/${C.NF} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  process.stdout.write("\n");
  await audit.finish(page);
  await ctx.close();
  if (errors.length) audit.fail(`console or page errors: ${errors.slice(0, 5).join(" | ")}`);
  const perf = Object.fromEntries(Object.entries(timing).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length)]));
  log(`  ${cut}: ${((Date.now() - t0) / 1000).toFixed(0)} s; ms/frame by scene ${JSON.stringify(perf)}`);
  return { C, M, audit, frameDir, perf };
}

/* ---------- the laptop (16:9): origin B frames, the dock match (plan.md §8.2) ---------- */
const frameB = (page, name) => page.frame({ name });
async function measureLaptop(page, R, C, M) {
  const f = frameB(page, "map");
  if (!f) throw new Error("the laptop's map frame is missing");
  const m = await f.evaluate(() => {
    scrollTo(0, 280);
    const svg = document.querySelector("svg.map-base"); if (!svg) return { error: "svg.map-base not found" };
    const c = svg.getScreenCTM(), vb = svg.viewBox.baseVal;
    const k = document.querySelector(".page-head .kicker"); const kick = k ? [...k.querySelectorAll("span")].filter((s) => !s.classList.contains("sec-num")).map((s) => s.textContent.trim()).join(" ") : null;
    return { a: c.a, d: c.d, e: c.e, f: c.f, b: c.b, c: c.c, vb: [vb.x, vb.y, vb.width, vb.height], kick, lede: document.querySelector(".page-head .lede")?.textContent.trim(), theme: document.documentElement.dataset.theme };
  });
  if (m.error) throw new Error(`laptop map: ${m.error}`);
  const { LAPTOP } = await import("./lib/promo-stage.mjs");
  const k = LAPTOP.k;
  const [vx, vy, vw, vh] = m.vb;
  const Rr = { x: LAPTOP.sx + k * (m.a * vx + m.e), y: LAPTOP.sy + k * (m.d * vy + m.f), w: k * m.a * vw, h: k * m.d * vh };
  const s = ((m.a + m.d) / 2) * k / UNIT;
  M.dock = { R: Rr, s, X: (vx + vw / 2) * UNIT, Y: (vy + vh / 2) * UNIT, Cx: Rr.x + Rr.w / 2, Cy: Rr.y + Rr.h / 2, unitCenter: [vx + vw / 2, vy + vh / 2], vb: m.vb, scaleSkew: Math.abs(m.a - m.d) / m.a };
  if (M.dock.scaleSkew > 0.003) throw new Error(`the map's x and y scales differ by ${(M.dock.scaleSkew * 100).toFixed(2)}%`);
  // the four crop corners, projected by the camera, must land on R's corners within 2 px
  const cam = { X: M.dock.X, Y: M.dock.Y, s, pitch: 0, yaw: 0, Cx: M.dock.Cx, Cy: M.dock.Cy };
  const { toScreen } = await import("./lib/promo-world.mjs");
  let err = 0;
  for (const [ux, uy, sx, sy] of [[vx, vy, Rr.x, Rr.y], [vx + vw, vy, Rr.x + Rr.w, Rr.y], [vx, vy + vh, Rr.x, Rr.y + Rr.h], [vx + vw, vy + vh, Rr.x + Rr.w, Rr.y + Rr.h]]) {
    const [px, py] = toScreen(cam, C.view, ux * UNIT, uy * UNIT); err = Math.max(err, Math.hypot(px - sx, py - sy));
  }
  if (err > 2) throw new Error(`dock match: corners off by ${err.toFixed(2)} px`);
  M.dockErr = err;
  M.kick = { ...M.kick, map: (m.kick || "").toUpperCase() };
  if (m.kick !== R.words.mapKicker) throw new Error(`map kicker live "${m.kick}" ≠ built "${R.words.mapKicker}"`);
  log(`  dock match: R ${[Rr.x, Rr.y, Rr.w, Rr.h].map((v) => v.toFixed(1)).join(",")}, s ${s.toFixed(6)}, corners within ${err.toFixed(2)} px`);
}

/** per-frame work for the 16:9 laptop: find the cluster, open the shared link, measure the shared page */
async function wideFrame(page, S, R, C, M, i, audit) {
  if (i === 640 && !M.cluster) {
    const f = frameB(page, "map");
    const rwUnits = [(R.evPlace.lng - R.meta.bbox.w) * R.meta.k * R.meta.sx, (R.meta.bbox.n - R.evPlace.lat) * R.meta.sx];
    M.cluster = await f.evaluate(({ ev, place, u }) => {
      const svg = document.querySelector("svg.map-base"), c = svg.getScreenCTM();
      const px = c.a * u[0] + c.e, py = c.d * u[1] + c.f;
      let best = null;
      for (const b of document.querySelectorAll(".map-view button.pin")) {
        const r = b.getBoundingClientRect(); if (!r.width) continue;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const has = (b._members || []).some((m) => String(m.id).includes(ev) || String(m.id).includes(place)) || String(b.dataset.pin || "").includes(ev) || String(b.dataset.pin || "").includes(place);
        const dd = Math.hypot(cx - px, cy - py) - (has ? 1000 : 0);
        if (!best || dd < best.dd) best = { x: cx, y: cy, dd, has, label: b.getAttribute("aria-label"), cls: b.className };
      }
      if (best) { document.querySelectorAll(".map-view button.pin").forEach((b) => delete b.dataset.promoTarget); const all = [...document.querySelectorAll(".map-view button.pin")]; const t = all.find((b) => { const r = b.getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - best.x) < 0.5 && Math.abs(r.top + r.height / 2 - best.y) < 0.5; }); if (t) t.dataset.promoTarget = "1"; }
      return best;
    }, { ev: R.ev.id, place: R.evPlace.id, u: rwUnits });
    if (!M.cluster) throw new Error("the map shows no pin near the Riverwalk");
    audit.note(`f${i} map target: ${M.cluster.cls} "${M.cluster.label}" at ${M.cluster.x.toFixed(0)},${M.cluster.y.toFixed(0)} (holds the parade: ${M.cluster.has})`);
  }
  if (i >= 990 && i < 1005 && !M.shared) {
    const f = frameB(page, "shared");
    const r = f ? await f.evaluate(() => { const e = document.querySelector(".trip-shared"), b = document.querySelector("[data-trip-add-all]"); if (!e || !b) return null; const a = e.getBoundingClientRect(), bb = b.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(e.querySelector("h2")); const hr = rg.getBoundingClientRect(); return { hx: hr.left, hy: hr.top, cx: a.left + a.width / 2, cy: a.top + Math.min(a.height, 300) / 2, h2: e.querySelector("h2")?.textContent.trim(), add: b.textContent.trim(), bx: bb.left + bb.width / 2, by: bb.top + bb.height / 2, text: e.innerText.replace(/\s+/g, " ").slice(0, 200) }; }).catch(() => null) : null;
    if (r) {
      M.shared = { cx: r.cx, cy: r.cy, hx: r.hx, hy: r.hy }; M.addBtn = { x: r.bx, y: r.by };
      audit.note(`f${i} shared link on origin B: "${r.text}"`);
      if (r.h2 !== "A shared trip") throw new Error(`shared page heading "${r.h2}"`);
      if (!/^Add 3 to my trip$/.test(r.add)) throw new Error(`shared page button "${r.add}"`);
    } else if (i === 1004) throw new Error("the shared trip page did not render on origin B");
  }
}

/* ---------- real actions (plan.md §5.4) ---------- */
async function doAction(page, ctx, S, R, C, M, a, toastRise, i, audit, clk) {
  const t = i / FPS;
  if (a.kind === "star" || a.kind === "share") {
    const res = await page.evaluate(async ({ slot, sel }) => {
      const f = document.getElementById("f-" + slot), d = f.contentDocument, el = d.querySelector(sel);
      if (!el) return { error: `${slot}: ${sel} not found` };
      f.contentWindow.focus();
      el.click();
      return { ok: true };
    }, { slot: a.slot, sel: a.sel }).catch((e) => ({ error: String(e) }));
    if (res.error) throw new Error(`action at f${i}: ${res.error}`);
    await ctx.clock.runFor(1); clk.now += 1;                // zero-delay timers after the click (1 ms of site time)
    await new Promise((r) => setTimeout(r, 30));             // real time for the clipboard and storage events
    res.pressed = await page.evaluate(({ slot, sel }) => document.getElementById("f-" + slot).contentDocument.querySelector(sel)?.getAttribute("aria-pressed"), { slot: a.slot, sel: a.sel });
    // the toast: hide for the tap frame, measure its settled box, then the stage drives the rise
    const box = await page.evaluate((slot) => { const d = document.getElementById("f-" + slot).contentDocument; const el = d.querySelector("[data-toast]"); el.style.opacity = "0"; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, text: el.querySelector("[data-toast-text]")?.textContent, link: el.querySelector("[data-toast-link]")?.hidden ? "" : el.querySelector("[data-toast-link]")?.textContent, show: el.classList.contains("show") }; }, a.slot);
    toastRise.push({ slot: a.slot, t0: t });
    if (a.kind === "star") {
      if (res.pressed !== "true") throw new Error(`star ${a.sel}: aria-pressed ${res.pressed}`);
      if (box.text !== "Added to My Trip" || box.link !== "View") throw new Error(`star toast read "${box.text} · ${box.link}"`);
      const st = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem("tbc-trip") || "null"); } catch { return null; } });
      const count = await page.evaluate((slot) => document.getElementById("f-" + slot).contentDocument.querySelector("[data-trip-count]")?.textContent, a.slot);
      audit.note(`f${i} star ${a.slot}: toast "${box.text} · ${box.link}", dock ${count}, tbc-trip ${JSON.stringify(st)}`);
      if (String(count) !== String(a.n)) throw new Error(`dock count ${count} ≠ ${a.n} after star ${a.n}`);
      if (a.slot === "fds") M.fdsToast = box;
    }
    if (a.kind === "share") {
      if (box.text !== "Link copied") throw new Error(`share toast read "${box.text}"`);
      M.tripToast = box;
      let clip = await page.evaluate(() => navigator.clipboard.readText()).catch((e) => null);
      const expect = `${R.config.siteBase}trip.html#${R.hash}`;
      if (!clip) { audit.note("clipboard read failed: comparing with tripHash"); clip = `${S.originA}${S.pathPrefix}trip.html#${R.hash}`; }
      const rew = clip.replace(`${S.originA}${S.pathPrefix}`, R.config.siteBase);
      if (rew !== expect) throw new Error(`clipboard ${clip} → ${rew} ≠ ${expect}`);
      M.clip = clip; M.link = rew.replace(/^https:\/\//, "");
      audit.note(`f${i} share: toast "${box.text}", clipboard ${clip}`);
    }
    if (a.kind === "addall") { M.addToast = box; audit.note(`f${i} add-all: toast "${box.text}"`); }
  }
  if (a.kind === "mapclick") {
    const f = frameB(page, "map");
    const before = await f.evaluate(() => document.querySelector("svg.map-base").getAttribute("viewBox"));
    const ok = await f.evaluate(() => { const b = document.querySelector('.map-view button.pin[data-promo-target="1"]'); if (!b) return false; b.click(); return true; });
    if (!ok) throw new Error("map click: the target pin is gone");
    await ctx.clock.runFor(1); clk.now += 1;
    await new Promise((r) => setTimeout(r, 50));
    M.mapBefore = before;
    audit.note(`f${i} map click: viewBox before ${before}`);
  }
  if (a.kind === "opentrip") {
    const url = M.clip.replace(S.originA, S.originB);
    await page.evaluate((u) => { document.getElementById("f-shared").src = u; }, url);
    await page.waitForFunction(() => { try { return !!document.getElementById("f-shared").contentWindow.location.href; } catch { return true; } }).catch(() => {});
    const f = await (async () => { for (let k = 0; k < 100; k++) { const fr = frameB(page, "shared"); if (fr && fr.url().includes("trip.html")) return fr; await new Promise((r) => setTimeout(r, 50)); } return null; })();
    if (!f) throw new Error("the shared frame did not navigate");
    await f.waitForLoadState("load").catch(() => {});
    await new Promise((r) => setTimeout(r, 400));
    audit.note(`f${i} laptop opens ${url}`);
  }
  if (a.kind === "addall") {
    const f = frameB(page, "shared");
    const res = await f.evaluate((sel) => { const b = document.querySelector(sel); if (!b) return null; b.click(); return true; }, a.sel);
    if (!res) throw new Error("add-all: the button is gone");
    await ctx.clock.runFor(1); clk.now += 1;
    await new Promise((r) => setTimeout(r, 50));
    const t2 = await f.evaluate(() => ({ toast: document.querySelector("[data-toast-text]")?.textContent, trip: (() => { try { return JSON.parse(localStorage.getItem("tbc-trip") || "null"); } catch { return null; } })(), count: document.querySelector("[data-trip-count]")?.textContent, card: document.querySelector(".trip-card")?.textContent.replace(/\s+/g, " ").trim() }));
    if (t2.toast !== "Added 3 items to My Trip") throw new Error(`add-all toast "${t2.toast}"`);
    const ids = t2.trip ? [...t2.trip.e, ...t2.trip.p] : [];
    if (ids.length !== 3) throw new Error(`origin B holds ${ids.length} ids`);
    const a2 = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem("tbc-trip") || "null"); } catch { return null; } });
    M.addToast = { text: t2.toast };
    audit.note(`f${i} add-all: toast "${t2.toast}", origin B tbc-trip ${JSON.stringify(ids)}, dock ${t2.count}, sidebar "${t2.card}"; origin A still ${JSON.stringify([...(a2?.e || []), ...(a2?.p || [])])}`);
  }
  if (a.kind === "navtap") {
    // the dock's Trip tab: shown, not performed; the trip slot has followed the stars through the storage event since W0
    const tr = await page.evaluate(() => { const d = document.getElementById("f-trip").contentDocument, w = d.defaultView; const s = d.querySelector(".trip-summary"); const k = d.querySelector(".page-head .kicker"); return { sum: s ? s.textContent.replace(/\s+/g, " ").trim() : null, top: s ? s.getBoundingClientRect().top + w.scrollY : null, share: !!d.querySelector("[data-trip-share]"), nshare: typeof navigator.share }; });
    if (!tr.sum) throw new Error("trip slot: .trip-summary not found");
    M.trip = { rest: Math.max(0, Math.round(tr.top - 190)) };
    M.tripSummary = tr.sum;
    audit.note(`f${i} trip: "${tr.sum}"`);
  }
}

/* ---------- determinism (plan.md §16.1): re-render a few frames from a fresh context ---------- */
async function determinism(browser, S, R, tex, cut, main) {
  const fr = cut === "reel" ? [37, 300, 600, 900] : [37, 400, 800, 1200];
  const r = await renderCut(browser, S, R, tex, cut, { stills: fr.map((f) => f / FPS), frames: false, jpeg: true, quiet: true });
  return fr.map((f) => {
    const a = path.join(WORK, `still-${cut}-${(f / FPS).toFixed(3)}s.jpg`), b = path.join(main.frameDir, `${String(f).padStart(4, "0")}.jpg`);
    const out = String(spawnSync(FFMPEG, ["-hide_banner", "-i", a, "-i", b, "-lavfi", "psnr", "-f", "null", "-"], { encoding: "utf8" }).stderr || "");
    const m = out.match(/average:(inf|[\d.]+)/);
    return { f, psnr: m ? (m[1] === "inf" ? Infinity : Number(m[1])) : 0 };
  });
}

/* ---------- 6. encode ---------- */
function encode(frameDir, NF, wav, mp4, coverPng, { bake = true } = {}) {
  if (bake && coverPng) execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", coverPng, "-q:v", "2", path.join(frameDir, "0000.jpg")]);
  const args = ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frameDir, "%04d.jpg")];
  if (wav) args.push("-i", wav);
  args.push("-frames:v", String(NF), "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", String(FPS));
  if (wav) args.push("-c:a", "aac", "-b:a", "256k", "-ar", "48000");
  args.push("-movflags", "+faststart", mp4);
  execFileSync(FFMPEG, args, { stdio: ["ignore", "inherit", "inherit"] });
}

/* ---------- main ---------- */
async function main() {
  dbg("main", cmd, DAY);
  if (cmd === "audio") {
    const R = read(ROOT, SITE, DAY);
    for (const cut of pos[1] ? [pos[1]] : ["reel", "wide"]) { const r = renderScore(cut, R, path.join(WORK, `score-${cut}.wav`)); log(r); log(measureLoudness(path.join(WORK, `score-${cut}.wav`))); }
    return;
  }
  buildSite();
  if (cmd === "sheet") {
    const cut = pos[1] || "reel", mp4 = path.join(OUT, `tampa-bay-chartbook-promo-${cut === "reel" ? "9x16" : "16x9"}.mp4`);
    const rev = path.join(WORK, "review"); fs.mkdirSync(rev, { recursive: true });
    log(contactSheet(mp4, path.join(rev, `sheet-${cut}.png`), 1, cut === "reel" ? 8 : 6, cut === "reel" ? 216 : 320));
    const bounds = cut === "reel" ? [0, 1.233, 4.6, 6.5, 8.4, 10.5, 12.8, 14.4, 15.5, 16.4, 20.5, 22.0, 24.5, 26.2, 28.0, 30.4] : [0, 1.233, 4.6, 6.5, 8.5, 12.3, 14.5, 17.5, 19.6, 21.9, 22.7, 26.0, 29.9, 32.5, 34.9, 36.2, 38.5, 41.0];
    log(grabFrames(mp4, path.join(rev, cut), bounds).join("\n"));
    return;
  }
  if (cmd === "check") {
    for (const p of ["A", "B"]) {
      try { const R = read(ROOT, SITE, p); const f = (ms) => new Date(ms).toLocaleTimeString("en-US", { timeZone: "America/New_York" }); log(`Plan ${p}: ${R.plan.date} ${R.ev.id} start ${R.ev.start}; sunrise ${f(R.SR)} (±${R.sun.SR.diffMin} min), sunset ${f(R.SS)} (±${R.sun.SS.diffMin} min), evening anchor ${f(R.A_EVE)}; counts ${JSON.stringify(R.counts)}; link #${R.hash}: passes`); }
      catch (e) { log(`Plan ${p}: FAILS — ${e.message}`); if (p === "A") process.exitCode = 1; }
    }
    return;
  }
  let R;
  try { R = read(ROOT, SITE, DAY); }
  catch (e) { if (DAY === "A") { let b = ""; try { read(ROOT, SITE, "B"); b = "Plan B passes: re-run with --day B"; } catch (e2) { b = `Plan B fails too: ${e2.message}`; } throw new Error(`${e.message}\n${b}`); } throw e; }
  const S = serve(SITE, { texDir: path.join(WORK, "tex"), port: Number(opt("--port", 0)) }); await S.listen();
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ args: (process.env.PROMO_ARGS ? process.env.PROMO_ARGS.split(" ") : []) });
  try {
    const tex = await renderTextures({ browser, server: S, root: ROOT, siteDir: SITE, cacheDir: WORK, log });
    if (cmd === "textures") return;
    if (cmd === "stills") {
      const cut = pos[1] || "reel", times = (pos[2] || "1.233").split(",").map(Number);
      const r = await renderCut(browser, S, R, tex, cut, { stills: times, frames: false });
      r.audit.report(path.join(WORK, `audit-${cut}-stills.txt`), { partial: true });
      log(times.map((s) => `  ${path.relative(ROOT, path.join(WORK, `still-${cut}-${s.toFixed(3)}s.png`))}`).join("\n"));
      return;
    }
    const cuts = cmd === "all" ? ["reel", "wide"] : [cmd];
    const runs = {};
    for (const cut of cuts) {
      const tag = cut === "reel" ? "9x16" : "16x9";
      const r = await renderCut(browser, S, R, tex, cut);
      const failures = r.audit.report(path.join(WORK, `audit-${cut}.txt`));
      const wav = path.join(WORK, `score-${cut}.wav`);
      const mp4 = path.join(OUT, `tampa-bay-chartbook-promo-${tag}.mp4`);
      let ceiling = -1.3, sc, audio;
      for (let k = 0; k < 4; k++) {                                    // the score, the mux, then pass 2 on the decoded AAC
        sc = renderScore(cut, R, wav, { ...r, ceiling });
        encode(r.frameDir, r.C.NF, sc.wav, mp4, path.join(WORK, `cover-${cut}.png`), { bake: !flag("--no-bake-cover") });
        audio = audioCheck(mp4, WORK);
        if (audio.TP <= -1.0 && Math.abs(audio.I + 14) <= 0.5 && audio.samplePeakDb <= -0.5) break;
        log(`  audio pass 2: ${JSON.stringify(audio)}; lowering the ceiling`); ceiling -= 0.3;
      }
      log(`  score: ${sc.notes} notes; mixed ${JSON.stringify(sc.final)}; decoded AAC ${JSON.stringify(audio)}`);
      if (audio.TP > -1.0 || Math.abs(audio.I + 14) > 0.5) failures.push(`audio: ${JSON.stringify(audio)}`);
      if (Math.abs(audio.dc) >= 0.001) failures.push(`audio DC ${audio.dc}`);
      // covers (the baked frame 0) and the thumb
      const cover = path.join(WORK, `cover-${cut}.png`);
      const jpg = (src, out, vf) => execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", src, ...(vf ? ["-vf", vf] : []), "-q:v", "2", out]);
      if (cut === "reel") jpg(cover, path.join(OUT, "cover-9x16.jpg"));
      else { jpg(cover, path.join(OUT, "poster-16x9.jpg")); jpg(cover, path.join(OUT, "thumb-1280x720.jpg"), "scale=1280:720:flags=lanczos"); }
      writeSrt(path.join(OUT, `promo-${tag}.srt`), captions(cut, R, r.M));
      // the review: a contact sheet at 1 fps and stills at the scene boundaries
      const rev = path.join(WORK, "review"); fs.mkdirSync(rev, { recursive: true });
      contactSheet(mp4, path.join(rev, `sheet-${cut}.png`), 1, cut === "reel" ? 8 : 6, cut === "reel" ? 216 : 320);
      audioPictures(wav, path.join(rev, `score-${cut}`));
      // determinism: frames re-rendered from a fresh context must match the main pass (PSNR ≥ 50 dB)
      let det = null;
      if (!flag("--no-determinism")) det = await determinism(browser, S, R, tex, cut, r);
      if (det && det.some((d) => d.psnr < 50)) failures.push(`determinism: ${JSON.stringify(det)}`);
      log(`  ${path.relative(ROOT, mp4)} ${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB${det ? `; determinism PSNR ${det.map((d) => `f${d.f} ${d.psnr === Infinity ? "∞" : d.psnr.toFixed(1)}`).join(", ")}` : ""}`);
      if (failures.length) log(`  AUDIT: ${failures.length} failure(s), see .cache/promo/audit-${cut}.txt`);
      runs[cut] = { C: r.C, M: r.M, audit: r.audit, perf: r.perf, audio, failures, det, mp4, size: fs.statSync(mp4).size };
      fs.writeFileSync(path.join(WORK, `result-${cut}.json`), JSON.stringify({ M: r.M, perf: r.perf, audio, failures, det, size: runs[cut].size, images: r.audit.images || {} }, null, 1));
      if (!flag("--keep-frames")) fs.rmSync(r.frameDir, { recursive: true, force: true });
    }
    // the words around the films (from this render and the other cut's last render)
    for (const cut of ["reel", "wide"]) if (!runs[cut] && fs.existsSync(path.join(WORK, `result-${cut}.json`))) { const j = JSON.parse(fs.readFileSync(path.join(WORK, `result-${cut}.json`), "utf8")); runs[cut] = { ...j, audit: { images: j.images } }; }
    fs.writeFileSync(path.join(OUT, "share-copy.txt"), shareCopy(R));
    fs.writeFileSync(path.join(OUT, "README.md"), readme({ R, runs, files: { reel: path.join(OUT, "tampa-bay-chartbook-promo-9x16.mp4"), wide: path.join(OUT, "tampa-bay-chartbook-promo-16x9.mp4") } }));
    fs.writeFileSync(path.join(WORK, "manifest.json"), JSON.stringify({ rendered: new Date().toISOString(), plan: R.planId, date: R.plan.date, data: R.dataHash, counts: R.counts, sun: { SR: new Date(R.SR).toISOString(), SS: new Date(R.SS).toISOString() }, link: R.hash,
      cuts: Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, { audio: v.audio, failures: v.failures, perf: v.perf, det: v.det, size: v.size }])) }, null, 1));
    const bad = Object.values(runs).flatMap((v) => v.failures || []);
    if (bad.length) { log(`\n${bad.length} audit failure(s):\n  ${bad.slice(0, 20).join("\n  ")}`); process.exitCode = 1; }
  } finally { await browser.close(); await S.close(); }
}

main().catch((e) => { console.error("\n" + (e.stack || e.message)); process.exit(1); });
