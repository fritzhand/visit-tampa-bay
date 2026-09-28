/* ============================================================
   collateral/lib/promo-audit.mjs — the per-frame audit (plan.md §10, §16.1).

   Every frame the stage reports (window.auditFrame):
   - stage lines: every visible [data-read] element's own text box (the union of its line boxes), opacity
     (every ancestor's multiplied), data-busy, font size;
   - device must-reads: the cue's selectors, their rects mapped through the phone's matrix (projected);
   - editions: every device frame's data-theme, and whether tbc-theme was stored on either origin;
   - words: the name guard (tourism offices, every team in the sports listings, their hosts) and the
     forbidden strings, scanned in the visible part of every visible device;
   - the mirror: the running head's copy of the parade card's state word.
   A line counts as read only while settled (opacity 1, moving ≤ 2 px/frame and ≤ 0.4 % scale/frame, not
   busy, and for device text a projected cap height ≥ 26 px in 9:16 / 22 px in 16:9); it must hold for
   max(floor, 0.3 s × words), floor 0.8 s for 1–3 words and 1.2 s otherwise. Must-reads are also checked
   against the safe zone and the size floors. report() writes .cache/promo/audit-<cut>.txt.
   ============================================================ */
import fs from "node:fs";
import { camFull, camUnproject, toScreen, PAPER, UNIT } from "./promo-world.mjs";

export const SAFE = {
  reel: { y0: 250, y1: 1440, x0: 64, x1: 1016, x1Low: 940, yLow: 1050 },
  wide: { y0: 60, y1: 960, x0: 96, x1: 1824 },
};
const need = (w) => Math.max(w <= 3 ? 0.8 : 1.2, 0.3 * w);
const FORBIDDEN = ["Test clock", "Loading today's listings", "Loading your trip", "Something went wrong", "TBA", "TBD"];

export class Audit {
  constructor(C, R, M, { cut, W, H }) {
    this.C = C; this.R = R; this.M = M; this.cut = cut; this.W = W; this.H = H;
    this.safe = SAFE[cut];
    this.lines = new Map(); this.prev = new Map(); this.notes = []; this.failures = []; this.warnings = [];
    this.guardRuns = new Map(); this.frames = 0;
    this.guardSrc = R.guard.map((g) => g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    this.capMin = cut === "reel" ? 26 : 22;
    this.devMin = cut === "reel" ? 40 : 30;                  // in-device must-reads (the Reel is read on a phone: ≥ 40 px)
    this.tripCardSeen = new Map(); this.sliced = new Map(); this.inBand = new Map();
  }
  note(m) { this.notes.push(m); }
  fail(m) { this.failures.push(m); }
  warn(m) { this.warnings.push(m); }

  async sample(page, i, t, st, info) {
    this.motion(i, t, st);
    const dr = (this.C.deviceReads || []).filter((d) => t >= d.t0 && t < d.t1);
    if (process.env.PROMO_PROF) { const T = []; for (const part of ["stage", "device", "themes", "scan"]) { const t0 = Date.now(); await page.evaluate(([spec, part]) => window.auditFrame({ ...spec, only: part }), [{ reads: [], guard: this.guardSrc, forbidden: FORBIDDEN, slots: Object.keys(st.phone?.slots || {}).filter((k) => st.phone.slots[k] > 0.5), lap: [] }, part]); T.push(`${part} ${Date.now() - t0}`); } console.log("  prof f" + i, T.join(" ")); }
    const a = await page.evaluate((spec) => window.auditFrame(spec), { reads: dr, guard: this.guardSrc, forbidden: FORBIDDEN, slots: Object.keys(st.phone?.slots || {}).filter((k) => st.phone.slots[k] > 0.5), lap: st.laptop?.on ? Object.keys(st.laptop.slots || {}).filter((k) => st.laptop.slots[k] > 0.5) : [] });
    this.frames++;
    const fps = 30;
    // stage lines
    for (const s of a.stage) this.track(i, t, { ...s, kind: "stage" });
    for (const s of a.device) this.track(i, t, { ...s, kind: "device" });
    for (const s of a.device) {
      if (!(s.o > 0.985) || s.vis === false) continue;
      if (s.sliced && !this.sliced.has(s.id)) this.sliced.set(s.id, `f${i}: the block around the must-read "${s.id}" is sliced at the ${s.sliced} frame edge (no edge fade covers it)`);
      if (s.inBand && !this.inBand.has(s.id)) this.inBand.set(s.id, `f${i}: the must-read "${s.id}" runs into an edge fade`);
    }
    // laptop reads (origin B, screen-space device)
    const lp = st.laptop;
    for (const r of (this.C.laptopReads || []).filter((d) => t >= d.t0 && t < d.t1)) {
      if (!lp || !lp.on || !(lp.slots[r.slot] > 0.98)) continue;
      const f = page.frame({ name: r.slot }); if (!f) continue;
      const q = await f.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const rg = document.createRange(); rg.selectNodeContents(e); const b = rg.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, fs: parseFloat(getComputedStyle(e).fontSize) }; }, r.sel).catch(() => null);
      if (!q) continue;
      const box = [lp.sx + lp.k * q.x, lp.sy + lp.k * q.y, lp.sx + lp.k * (q.x + q.w), lp.sy + lp.k * (q.y + q.h)];
      this.track(i, t, { id: r.id, words: r.words, role: r.role, o: (lp.o ?? 1), busy: false, box, px: q.fs * lp.k, cap: 0.7 * q.fs * lp.k, kind: "device", vis: true });
    }
    // origin B editions (every 15 frames)
    if (lp && lp.on && i % 15 === 0) for (const name of Object.keys(lp.slots).filter((k) => lp.slots[k] > 0)) {
      const f = page.frame({ name }); if (!f) continue;
      const th = await f.evaluate(() => ({ th: document.documentElement.dataset.theme, stored: (() => { try { return localStorage.getItem("tbc-theme"); } catch { return null; } })() })).catch(() => null);
      if (th && th.th && th.th !== (st.deviceTheme || st.theme)) this.fail(`f${i}: laptop ${name} is ${th.th}`);
      if (th && th.stored) this.fail(`f${i}: tbc-theme stored on origin B`);
    }
    // editions
    const expect = st.deviceTheme || st.theme;
    for (const [slot, th] of Object.entries(a.themes)) if (th && th !== expect) this.fail(`f${i}: ${slot} is ${th}, expected ${expect}`);
    if (a.stored) this.fail(`f${i}: tbc-theme was stored (${a.stored})`);
    // the mirror equals the card, never "Now"
    if (info && info.mirror && st.head?.stops?.mirror?.o > 0) {
      if (/^now$/i.test(info.mirror.text)) this.fail(`f${i}: the parade card says "Now"`);
      this.mirrorLog ||= []; this.mirrorLog.push([i, info.mirror.text]);
    }
    for (const w of a.forbidden) this.fail(`f${i}: forbidden "${w.text}" visible in ${w.slot}`);
    // the film's payoff ("Started", never "Now") must hold everywhere the site says it: every device's sidebar trip card,
    // in frame or not (origin A in the page, origin B every 3 frames)
    for (const [slot, text] of Object.entries(a.tripCards || {})) this.tripCard(i, slot, text);
    if (this.cut === "wide" && i % 3 === 0) for (const name of ["map", "shared"]) {
      const f = page.frame({ name }); if (!f) continue;
      const text = await f.evaluate(() => document.querySelector("[data-trip-card-next]")?.textContent.replace(/\s+/g, " ").trim() || null).catch(() => null);
      if (text) this.tripCard(i, `laptop ${name}`, text);
    }
    // images in devices: only the site's rights-cleared ones, credited (plan.md §15)
    this.images ||= {}; this.imgRuns ||= {};
    for (const im of a.imgs) {
      const m = im.src.match(/assets\/img\/([a-z])\/([a-z0-9-]+?)(?:-lg)?\.webp/);
      const key = m ? `${m[1]}/${m[2]}` : null, e = key && this.R.images ? this.R.images[key] : null;
      if (!e || !e.credit || !e.license) { if (!/assets\/img\/brand\//.test(im.src)) this.fail(`f${i}: image ${im.src} in ${im.slot} has no credited manifest entry`); continue; }
      this.images[key] = { key, ...e };
      if (im.frac >= 0.15) { this.imgRuns[key] = (this.imgRuns[key] || 0) + 1; if (this.imgRuns[key] === 15) this.fail(`f${i}: ${key} covers ${(im.frac * 100).toFixed(0)}% of a device for 15 frames: it needs an on-screen credit`); }
    }
    // the name guard: legible (cap ≥ 14 px), settled, 9 frames running
    const seen = new Set();
    for (const g of a.guard) {
      const key = `${g.slot}:${g.text}`; seen.add(key);
      const prev = this.guardRuns.get(key);
      const moved = prev ? Math.abs(prev.box[0] - g.box[0]) + Math.abs(prev.box[1] - g.box[1]) > 2 : true;
      const run = g.cap >= 14 && !moved ? (prev?.run || 0) + 1 : g.cap >= 14 ? 1 : 0;
      this.guardRuns.set(key, { run, box: g.box });
      if (run === 9) this.fail(`f${i}: "${g.text}" legible (cap ${g.cap.toFixed(0)} px) and settled for 9 frames in ${g.slot}`);
    }
    for (const k of [...this.guardRuns.keys()]) if (!seen.has(k)) this.guardRuns.delete(k);
  }

  /** a sidebar trip card that leads with "Now" for the parade, which has no end time, contradicts the film (and the About page) */
  tripCard(i, slot, text) {
    if (!text || !/^Now\b/.test(text) || this.R.ev.end != null || !text.includes(this.R.ev.title)) return;
    if (!this.tripCardSeen.has(slot)) this.tripCardSeen.set(slot, { f: i, text });
  }

  /** motion caps and the horizon (plan.md §4.5): Node-side, from the frame's state */
  motion(i, t, st) {
    const c = st.cam, v = this.C.view;
    // no horizon hole: points along the top of the picture must land on the paper when the table is pitched
    if (c.pitch > 0.5) {
      const M = camFull(c, v), yh = this.cut === "reel" ? 300 : 120;
      for (let k = 0; k <= 15; k++) {
        const x = (this.W * k) / 15, p = camUnproject(M, x, yh);
        const ok = p && p[0] >= PAPER.x0 * UNIT && p[0] <= PAPER.x1 * UNIT && p[1] >= PAPER.y0 * UNIT && p[1] <= PAPER.y1 * UNIT;
        if (!ok) { this.horizon = (this.horizon || 0) + 1; if (this.horizon <= 3) this.warn(`f${i}: the top of the picture (${x.toFixed(0)}, ${yh}) looks past the paper (pitch ${c.pitch.toFixed(1)}°)`); break; }
      }
    }
    const pv = this.prevCam;
    if (pv) {
      const ds = Math.abs(Math.log(c.s / pv.s));
      const [x0, y0] = toScreen(pv, v, pv.X, pv.Y), [x1, y1] = toScreen(c, v, pv.X, pv.Y);
      const sp = Math.hypot(x1 - x0, y1 - y0);
      (this.caps ||= { ds: 0, sp: 0, scroll: 0, dsF: 0, spF: 0, scrollF: 0 });
      if (ds > this.caps.ds) { this.caps.ds = ds; this.caps.dsF = i; }
      if (sp > this.caps.sp && ds < 0.02) { this.caps.sp = sp; this.caps.spF = i; }
    }
    this.prevCam = { ...c };
    const sc = st.scroll || {}, ps = this.prevScroll || {};
    for (const [k, y] of Object.entries(sc)) if (ps[k] != null && (st.phone?.slots?.[k] || 0) > 0.5) { const d = Math.abs(y - ps[k]); if (d > (this.caps?.scroll || 0)) { (this.caps ||= {}); this.caps.scroll = d; this.caps.scrollF = i; } if (d > 700) this.fail(`f${i}: ${k} scrolls ${d.toFixed(0)} css in one frame (cap 700)`); }
    this.prevScroll = { ...sc };
  }

  track(i, t, s) {
    const id = s.id;
    const L = this.lines.get(id) || { id, kind: s.kind, words: s.words, role: s.role, settled: 0, first: t, last: t, unsafe: [], minPx: Infinity, runs: [], zone: s.zone || "" };
    const prev = this.prev.get(id);
    const box = s.box;
    const w = box[2] - box[0], h = box[3] - box[1];
    let still = false;
    if (prev && prev.f === i - 1) {
      const dx = Math.abs(box[0] - prev.box[0]) + Math.abs(box[1] - prev.box[1]);
      const ds = Math.abs(w - prev.w) / Math.max(1, prev.w);
      still = dx <= 2 && ds <= 0.004;
    }
    this.prev.set(id, { f: i, box, w });
    const capOk = s.kind === "device" ? s.cap >= this.capMin : true;
    const settled = s.o > 0.985 && still && !s.busy && capOk && s.vis !== false;
    if (settled) {
      L.settled += 1 / 30;
      const last = L.runs[L.runs.length - 1];
      if (last && last[1] === i - 1) last[1] = i; else L.runs.push([i, i]);
      const S = this.safe;
      let inSafe;
      if (this.cut === "reel") inSafe = box[1] >= S.y0 - 0.5 && box[3] <= S.y1 + 0.5 && box[0] >= S.x0 - 0.5 && box[2] <= (box[3] > S.yLow ? S.x1Low : S.x1) + 0.5;
      else inSafe = box[1] >= S.y0 - 0.5 && box[3] <= S.y1 + 0.5 && box[0] >= S.x0 - 0.5 && box[2] <= S.x1 + 0.5;
      if (!inSafe && L.zone !== "free" && L.role !== "texture") L.unsafe.push(`${t.toFixed(2)}s [${box.map((v) => Math.round(v)).join(",")}]`);
      L.minPx = Math.min(L.minPx, s.px);
    }
    L.last = t; L.words = s.words; L.role = s.role;
    this.lines.set(id, L);
  }

  async finish(page) {
    // the live words: "In N min" when the mirror first shows, "In 1 min" on the frame before 18:15:00.000, "Started" from then, never "Now"
    const log = this.mirrorLog || [];
    const n = Math.round((this.R.START - this.R.A_EVE) / 60000);
    const sf = Math.round(this.C.music.started * 30);
    const at = (f) => (log.find(([g]) => g === f) || [])[1];
    if (!log.length) this.fail("the mirror never showed the card's state");
    else {
      if (log[0][1] !== `In ${n} min`) this.fail(`the mirror opened on "${log[0][1]}", not "In ${n} min"`);
      if (at(sf - 1) !== "In 1 min") this.fail(`the frame before the start read "${at(sf - 1)}"`);
      if (at(sf) !== "Started") this.fail(`the start frame read "${at(sf)}"`);
      if (log.some(([g, x]) => g < sf && x === "Started")) this.fail("\"Started\" before the start");
      if (log.some(([, x]) => /^now$/i.test(x))) this.fail("the card said \"Now\"");
    }
    // fonts, in the stage and in every same-origin device
    const fonts = await page.evaluate(() => { const faces = ["800 40px 'Bodoni Moda'", "italic 540 40px 'Bodoni Moda'", "700 40px 'Bodoni Moda'", "400 20px Figtree", "650 20px Figtree", "680 20px Archivo"]; const out = { stage: faces.filter((f) => !document.fonts.check(f)) }; for (const fr of document.querySelectorAll("iframe")) { try { const d = fr.contentDocument; if (d && d.fonts) out[fr.name] = ["400 16px Figtree", "700 20px 'Bodoni Moda'", "680 12px Archivo"].filter((f) => !d.fonts.check(f)); } catch {} } return out; });
    for (const [k, v] of Object.entries(fonts)) if (v.length) this.fail(`fonts not loaded in ${k}: ${v.join(", ")}`);
    if (this.tripCardSeen.size) {
      const [[slot0, first]] = [...this.tripCardSeen.entries()].sort((a, b) => a[1].f - b[1].f);
      this.fail(`f${first.f}: the site contradicts the film's "${this.R.words.startedNever}": the sidebar trip card reads "${first.text}" for an event with no end time (in ${[...this.tripCardSeen.keys()].join(", ")}; the card is never in frame). Fix nextLine() in site/js/core/trip-store.js (lead "Started", not "Now", when the end is not listed: flag 1), rebuild, re-render`);
      void slot0;
    }
    if (this.caps) this.note(`motion: largest scale change ${(100 * (Math.exp(this.caps.ds) - 1)).toFixed(1)}%/frame (f${this.caps.dsF}); largest table speed ${this.caps.sp.toFixed(0)} px/frame (f${this.caps.spF}); largest scroll ${this.caps.scroll.toFixed(0)} css/frame (f${this.caps.scrollF})`);
    if (this.horizon) this.note(`horizon: ${this.horizon} frame(s) look past the paper at the top of the picture (under the running head)`);
    if (this.blurred) this.note(`motion blur: ${this.blurred} frame(s) exposed from up to ${this.blurMax} sub-frames (a device page smearing 8 px or more; the shutter opens with the speed); largest unfilled sample spacing ${(this.blurGapMax || 0).toFixed(1)} px (fails over 8 px)`);
    if (this.painted) this.note(`painted check: ${this.painted} device viewport samples, each with luma sd ≥ 1 or reported`);
    this.done = true;
  }

  report(file, { partial = false } = {}) {
    const rows = [...this.lines.values()].map((L) => {
      const n = need(L.words || 1);
      const longest = L.runs.reduce((a, [x, y]) => Math.max(a, (y - x + 1) / 30), 0);
      const ok = L.role === "texture" || L.zone === "free" || longest + 1e-6 >= n;
      return { ...L, need: n, longest, ok };
    });
    const floor = this.cut === "reel" ? { must: 44, independence: 40, secondary: 28 } : { must: 40, independence: 30, secondary: 22 };
    const fails = [...this.failures, ...this.sliced.values(), ...this.inBand.values()];
    if (!partial) for (const r of rows) {
      if (r.role === "must" && !r.ok) fails.push(`${r.id}: settled ${r.longest.toFixed(2)} s at most, needs ${r.need.toFixed(2)} s`);
      if (r.role === "secondary" && !r.ok) fails.push(`${r.id} (secondary): settled ${r.longest.toFixed(2)} s, needs ${r.need.toFixed(2)} s`);
      if (r.unsafe.length && r.role !== "texture") fails.push(`${r.id}: outside the safe zone ×${r.unsafe.length} (${r.unsafe[0]})`);
      if (r.kind === "stage" && r.role === "must" && r.minPx !== Infinity && r.minPx < (r.id === "independence" ? floor.independence : floor.must)) fails.push(`${r.id}: ${r.minPx} px < ${r.id === "independence" ? floor.independence : floor.must} px`);
      if (this.cut === "reel" && r.kind === "stage" && r.role === "secondary" && r.minPx !== Infinity && r.minPx < floor.secondary) fails.push(`${r.id} (secondary): ${r.minPx} px < ${floor.secondary} px`);
      if (r.kind === "device" && r.role === "must" && r.minPx !== Infinity && r.minPx < this.devMin) fails.push(`${r.id}: in-device ${r.minPx.toFixed(1)} px < ${this.devMin} px`);
    }
    const lines = [
      `audit ${this.cut}: ${this.frames} frames`,
      ...rows.sort((a, b) => a.first - b.first).map((r) => `${r.ok && !r.unsafe.length ? "ok  " : "FAIL"} ${r.kind.padEnd(6)} ${r.role?.padEnd(9) || ""} ${String(r.id).slice(0, 34).padEnd(34)} ${String(r.words).padStart(2)} w  longest ${r.longest.toFixed(2)} s / need ${r.need.toFixed(2)} s  total ${r.settled.toFixed(2)} s  (${r.first.toFixed(2)}–${r.last.toFixed(2)})  min ${r.minPx === Infinity ? "-" : r.minPx.toFixed(0)}px${r.unsafe.length ? `  UNSAFE ×${r.unsafe.length} ${r.unsafe[0]}` : ""}`),
      "", "notes:", ...this.notes.map((n) => "  " + n),
      "", "warnings:", ...this.warnings.map((n) => "  " + n),
      "", `failures (${fails.length}):`, ...fails.map((n) => "  " + n),
    ];
    if (this.blurLog) lines.push("", "motion blur (frame, slot, content speed, samples, spacing, camera spacing, fill):", ...this.blurLog.map((n) => "  " + n));
    if (this.mirrorLog) {
      const ch = []; let last = null; for (const [f, x] of this.mirrorLog) if (x !== last) { ch.push(`f${f} ${x}`); last = x; }
      lines.push("", "mirror changes: " + ch.join(" · "));
    }
    fs.writeFileSync(file, lines.join("\n") + "\n");
    return fails;
  }
}

/** The in-page side, appended to the stage script. */
export const AUDIT_PAGE_JS = String.raw`
window.auditFrame=(spec)=>{
  const out={stage:[],device:[],themes:{},stored:null,guard:[],forbidden:[],imgs:[]};
  // stage lines
  if(!spec.only||spec.only==="stage")for(const el of document.querySelectorAll("#stage [data-read]")){
    let e=el,op=1,hidden=false,busy=false;
    while(e&&e.nodeType===1){const cs=getComputedStyle(e);if(cs.display==="none"||cs.visibility==="hidden"){hidden=true;break;}op*=parseFloat(cs.opacity);if(e.dataset&&e.dataset.busy==="1")busy=true;e=e.parentElement;}
    if(hidden||op<.02)continue;
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,px=0;
    const logo=el.querySelector("svg.wm-art")&&!el.textContent.trim();
    if(logo){const r=el.getBoundingClientRect();x0=r.left;y0=r.top;x1=r.right;y1=r.bottom;px=r.height;}
    else{const tw=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const rg=document.createRange();for(let n=tw.nextNode();n;n=tw.nextNode()){if(!n.textContent.trim())continue;rg.selectNodeContents(n);let any=false;for(const q of rg.getClientRects()){if(q.width<.5)continue;any=true;x0=Math.min(x0,q.left);y0=Math.min(y0,q.top);x1=Math.max(x1,q.right);y1=Math.max(y1,q.bottom);}
      if(any){let e=n.parentElement,sc=1;const fs=parseFloat(getComputedStyle(e).fontSize);while(e&&e!==document.body){const t=getComputedStyle(e).transform;if(t&&t!=="none"){const m=new DOMMatrix(t);sc*=Math.hypot(m.a,m.b)||1;}e=e.parentElement;}px=Math.max(px,fs*sc);}}}
    if(x0>x1)continue;
    out.stage.push({id:el.dataset.id||el.id,words:+el.dataset.read,role:el.dataset.role||"must",zone:el.dataset.zone||"",o:op,busy,box:[x0,y0,x1,y1],px});
  }
  // device must-reads
  if(!spec.only||spec.only==="device")for(const d of spec.reads){
    const b=window.phoneBox(d.slot,d.sel,d.last,d.child);if(!b)continue;
    let o=1;const f=document.getElementById("f-"+d.slot);o*=parseFloat(f.style.opacity||"1");
    if(d.toast){const doc=f.contentDocument,el=doc.querySelector(d.sel);if(!el||!el.classList.contains("show"))continue;o*=parseFloat(getComputedStyle(el).opacity);}
    const cap=0.7*b.fs*b.scale;
    // the must-read's whole block (e.g. the source line with its notes) must not be sliced by the frame edge, unless the
    // stage's edge fade dissolves that edge; and the must-read itself must stay clear of any edge fade
    const E=(S&&S.edge)||{},blk=window.blockLines(d.slot,d.sel,d.last)||[];let sliced=null;
    for(const q of blk){const cr=q[2]-L.W,cl=-q[0];if(cr>0.5&&q[0]<L.W&&!(E.r&&E.r.o>=Math.min(1,cr/8)-0.02)){sliced="right";break;}if(cl>0.5&&q[2]>0&&!(E.l&&E.l.o>=Math.min(1,cl/8)-0.02)){sliced="left";break;}}
    const inBand=!!((E.r&&E.r.o>0.05&&b.x1>L.W-E.r.w)||(E.l&&E.l.o>0.05&&b.x0<E.l.w));
    out.device.push({id:d.id,words:d.words,role:d.role,o,busy:false,box:[b.x0,b.y0,b.x1,b.y1],px:b.fs*b.scale,cap,vis:b.vis,sliced,inBand});
  }
  // editions and stored themes
  if(!spec.only||spec.only==="themes")for(const f of document.querySelectorAll("iframe")){try{const d=f.contentDocument;if(d&&d.documentElement&&d.location.href!=="about:blank")out.themes[f.name]=d.documentElement.dataset.theme;}catch(e){}}
  try{const v=localStorage.getItem("tbc-theme");if(v)out.stored="A:"+v;}catch(e){}
  out.tripCards={};if(!spec.only||spec.only==="themes")for(const f of document.querySelectorAll("iframe")){try{const d=f.contentDocument;const e=d&&d.querySelector("[data-trip-card-next]");if(e)out.tripCards[f.name]=e.textContent.replace(/\s+/g," ").trim();}catch(e){}}
  // the name guard and forbidden strings, in the visible part of each visible device
  const gre=spec.guard.length?new RegExp("(?:^|[^A-Za-z])("+spec.guard.join("|")+")(?![A-Za-z])"):null;
  const fre=new RegExp("("+spec.forbidden.map((s)=>s.replace(/[.*+?^$(){}|[\]\\]/g,"\\$&")).join("|")+")");
  const scan=(slot,toScreen,vw,vh,scale)=>{
    const f=document.getElementById("f-"+slot);let doc;try{doc=f.contentDocument;}catch(e){return;}if(!doc||!doc.body)return;
    for(const im of doc.images){const r=im.getBoundingClientRect();if(r.width<2||r.bottom<0||r.top>vh||r.right<0||r.left>vw)continue;const cs=getComputedStyle(im);if(cs.visibility==="hidden"||cs.display==="none"||parseFloat(cs.opacity)<.05)continue;
      const w=Math.min(vw,r.right)-Math.max(0,r.left),h=Math.min(vh,r.bottom)-Math.max(0,r.top);out.imgs.push({slot,src:im.getAttribute("src")||"",frac:(w*h)/(vw*vh)});}
    const tw=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT);const rg=doc.createRange();
    for(let n=tw.nextNode();n;n=tw.nextNode()){
      const s=n.textContent;if(!s||s.length<3)continue;
      const gm=gre&&gre.exec(s),fm=fre.exec(s);if(!gm&&!fm)continue;
      const p=n.parentElement;if(!p)continue;const cs=getComputedStyle(p);if(cs.visibility==="hidden"||cs.display==="none")continue;
      rg.selectNodeContents(n);const r=rg.getBoundingClientRect();if(r.width<1||r.bottom<0||r.top>vh||r.right<0||r.left>vw)continue;
      let op=1,e=p;while(e){const c=getComputedStyle(e);op*=parseFloat(c.opacity);if(c.display==="none")op=0;e=e.parentElement;}if(op<0.05)continue;
      // occluded (a sticky header over it)? test the middle of the visible part
      const cx=Math.min(vw-1,Math.max(0,(r.left+r.right)/2)),cy=Math.min(vh-1,Math.max(0,(Math.max(0,r.top)+Math.min(vh,r.bottom))/2));const hit=doc.elementFromPoint(cx,cy);if(hit&&hit!==p&&!p.contains(hit)&&!hit.contains(p))continue;
      const a=toScreen(r.left,r.top),b=toScreen(r.right,r.bottom);
      if(fm){const txt=fm[1];if(txt==="TBA"||txt==="TBD"){if(!new RegExp("\\b"+txt+"\\b").test(s))continue;}out.forbidden.push({slot,text:txt});}
      if(gm)out.guard.push({slot,text:gm[1],cap:0.7*parseFloat(cs.fontSize)*scale,box:[a[0],a[1],b[0],b[1]]});
    }
  };
  if(spec.only&&spec.only!=="scan")return out;
  if(S&&S.phone&&S.phone.on){const M=camMul(camFull(S.cam,V),phoneLocal(S.phone));const sc=(()=>{const a=vpToScreen(M,0,0),b=vpToScreen(M,100,0);return Math.hypot(b[0]-a[0],b[1]-a[1])/100;})();
    for(const slot of spec.slots)scan(slot,(u,v)=>vpToScreen(M,u,v),D.PHONE.w,D.PHONE.vp,sc);}
  if(S&&S.laptop&&S.laptop.on){for(const slot of spec.lap)scan(slot,(u,v)=>lapToScreen(u,v),D.LAPTOP.cssW,D.LAPTOP.cssH,S.laptop.k);}
  return out;
};`;
