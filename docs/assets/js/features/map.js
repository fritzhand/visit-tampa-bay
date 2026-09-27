/* site/js/features/map.js · OWNER: the Map lane. The interactive chart (DESIGN §9): mountMap() (exported, for any page),
   map.html (layers, filters, panel, in-view list, URL state) and the area pages (live chart, "What's on here" by the clock).
   The contract (options, markup, URL keys) is in build/CONTRACTS.md, "Map lane". Every buoy is also a list row. */
import { project, unproject, metaOf, onMap, cluster, clampView, fitScale } from "../lib/geo.js";
import { esc } from "../lib/text.js";
import { nyParts, fmtTime, fmtDay, fmtDate, fmtThrough, addDays, whenRange } from "../lib/time.js";

const DOC = document.documentElement;
const ROOT = DOC.dataset.root || "";
const V = DOC.dataset.v || "";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const I = (n, cls = "") => `<svg class="i${cls ? " " + cls : ""}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const ext = (href, html, cls) => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${html}<span class="sr-only"> (opens in a new tab)</span></a>`;
const plural = (n, [one, many]) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
const MAX_S = { bay: 12, region: 6 };
const Z1 = 0.36;
const GRAT = { t: 20, l: 20, b: 6, r: 6, band: 5 };
if (matchMedia("(max-width: 699px)").matches) Object.assign(GRAT, { t: 18, l: 18, b: 5, r: 5, band: 4 });
const KIND_ORDER = { place: 0, heritage: 0, stay: 1, experience: 2, event: 3, stop: 4 };
const KIND_WORD = { place: ["place", "places"], heritage: ["historic site", "historic sites"], stay: ["place to stay", "places to stay"], experience: ["tour departure", "tour departures"], event: ["place with events", "places with events"], stop: ["transit stop", "transit stops"] };
const KIND_LABEL = { place: "Place", heritage: "Historic site", stay: "Place to stay", experience: "Tour departure", event: "What's on", stop: "Getting around" };
const SYMBOL = { heritage: "landmark", stay: "anchor", experience: "daymark", event: "flag" };
const LABEL_RANK = { water: 0, city: 1, town: 2, beach: 2, island: 2, hood: 3, area: 4, park: 5, airport: 5, bridge: 6, route: 7, county: 8 };
const LABEL_W = { water: 9.4, city: 11.6, route: 7.2, park: 7.4, airport: 7.4, bridge: 7.4 };   // px per character, measured on the rendered labels
const tbc = () => window.tbc || null;
const toast = (t) => { const a = tbc(); if (a && a.toast) a.toast(t, { ms: 4000 }); };
const directions = (lat, lng) => ({ apple: `https://maps.apple.com/?daddr=${lat},${lng}`, google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` });

/* ---------- shared, memoized loads ---------- */
const memo = {};
function getJSON(name) {
  if (!memo[name]) memo[name] = fetch(`${ROOT}assets/data/${name}${V ? `?v=${V}` : ""}`).then((r) => { if (!r.ok) throw new Error(`${name} ${r.status}`); return r.json(); });
  memo[name].catch(() => { delete memo[name]; });
  return memo[name];
}
const svgs = {};
function loadSvg(file) {
  if (!svgs[file]) svgs[file] = fetch(`${ROOT}assets/map/${file}`).then((r) => { if (!r.ok) throw new Error(`${file} ${r.status}`); return r.text(); });
  svgs[file].catch(() => { delete svgs[file]; });
  return svgs[file];
}
const FILE = { bay: "basemap.svg", region: "region.svg" };

/** cluster() seeds a group at its first point and then centers it on its members, so two medallions (or a medallion
 *  and a buoy) can land on each other. Nudge the medallions apart, a few px at a time and never more than `cap` px
 *  from their centers; buoys never move (they mark real points). Returns [{ x, y }] (screen px), one per group. */
function spread(groups, { gap = 48, buoy = 38, cap = 30 } = {}) {
  const G = groups.map((g) => ({ x: g.x, y: g.y, x0: g.x, y0: g.y, med: g.members.length > 1 }));
  const ctr = (q) => (q.med ? [q.x, q.y] : [q.x, q.y - 30]);   // a buoy's body stands above its point
  for (let it = 0; it < 14; it++) {
    let moved = false;
    for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) {
      const a = G[i], b = G[j];
      if (!a.med && !b.med) continue;
      const need = a.med && b.med ? gap : buoy, [ax, ay] = ctr(a), [bx, by] = ctr(b);
      let dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
      if (d >= need) continue;
      if (d < 0.01) { dx = 0; dy = 1; d = 1; }
      const k = (need - d) / d;
      if (a.med && b.med) { a.x -= (dx * k) / 2; a.y -= (dy * k) / 2; b.x += (dx * k) / 2; b.y += (dy * k) / 2; }
      else if (a.med) { a.x -= dx * k; a.y -= dy * k; } else { b.x += dx * k; b.y += dy * k; }
      moved = true;
    }
    for (const q of G) if (q.med) { const dx = q.x - q.x0, dy = q.y - q.y0, d = Math.hypot(dx, dy); if (d > cap) { q.x = q.x0 + (dx * cap) / d; q.y = q.y0 + (dy * cap) / d; } }
    if (!moved) break;
  }
  return G.map((q) => ({ x: q.x, y: q.y }));
}

/* ---------- coordinates in the margin: 27°56′N, 82°27.5′W ---------- */
function dm(v, lab, pos, neg) {
  const a = Math.abs(v), d = Math.floor(a + 1e-9), m = (a - d) * 60;
  const mm = lab < 1 ? m.toFixed(1).replace(/\.0$/, "") : String(Math.round(m));
  return mm === "60" ? `${d + 1}°00′${v < 0 ? neg : pos}` : `${d}°${mm.padStart(mm.includes(".") ? 4 : 2, "0")}′${v < 0 ? neg : pos}`;
}
const LAB_STEPS = [0.5, 1, 2, 3, 6, 12, 30, 60];
const BAND_STEPS = [0.1, 0.25, 0.5, 1, 2, 3, 6, 10, 15, 30];

/* ============================================================ mountMap ============================================================ */
export function mountMap(el, opts = {}) {
  let box = el.classList && el.classList.contains("map-box") ? el : el.querySelector(".map-box");
  if (!box) {
    el.innerHTML = `<div class="map-box"><div class="map-view" data-map-view></div><div class="map-legend"><p class="map-attrib-line" data-attrib></p></div></div>`;
    box = el.querySelector(".map-box");
  }
  const view = $(".map-view", box);
  const S = { charts: null, chart: null, meta: null, labels: [], pins: [], byId: new Map(), els: new Map(), sel: null, hi: null, you: null, v: null, vw: 0, vh: 0, ready: false, placed: [], init: true, areas: {} };
  let pending = opts.pins || [];
  const ac = new AbortController();
  const on = (t, ev, fn, o = {}) => t.addEventListener(ev, fn, { signal: ac.signal, ...o });

  view.classList.add("is-loading");
  view.setAttribute("role", "group");
  view.setAttribute("aria-roledescription", "map");
  view.tabIndex = 0;
  view.setAttribute("aria-label", `${opts.title || "Chart"}. Arrow keys pan, plus and minus zoom, 0 shows the whole area. Everything on the chart is also in the list on this page.`);

  const api = {
    el: box,
    update(pins) { pending = pins || []; if (S.ready) setPins(pending); },
    select(id, o = {}) { const p = S.byId.get(id); if (!p) return false; choose(p, { ...o, fromApi: true }); return true; },
    highlight(id) { S.hi = id || null; paintHi(); },
    fit(pins) { if (S.ready) fitTo(pins && pins.length ? pins.map(projectPin).filter(Boolean) : null); },
    home() { if (S.ready) goHome(); },
    setChart, locate,
    bounds,
    get chart() { return S.chart; },
    get view() { return S.v; },
    destroy() { ac.abort(); if (ro) ro.disconnect(); view.innerHTML = ""; },
  };

  let ro = null;
  getJSON("map-charts.json").then(async (charts) => {
    if (ac.signal.aborted) return;
    S.charts = charts;
    S.areas = charts.areas || {};
    const at = $("[data-attrib]", box); if (at) at.innerHTML = attribHtml(charts);
    let id = opts.chart && opts.chart !== "auto" ? opts.chart : "bay";
    if (opts.chart === "auto" && charts.bay && charts.region && pending.length && !pending.every((p) => onMap(metaOf(charts.bay), p.lat, p.lng))) id = "region";
    if (!charts[id]) id = charts.bay ? "bay" : "region";
    if (!charts[id]) throw new Error("no chart");
    const svgText = await loadSvg(FILE[id]);
    if (ac.signal.aborted) return;
    build();
    swapBase(id, svgText);
    S.ready = true;
    setPins(pending);
    view.classList.remove("is-loading");
    ro = new ResizeObserver(() => {
      const r = view.getBoundingClientRect();
      if (Math.abs(r.width - S.vw) < 0.5 && Math.abs(r.height - S.vh) < 0.5) return;
      S.vw = r.width; S.vh = r.height;
      if (S.init) setPins(pending); else { S.v = clamp(S.v); render(true); }
    });
    ro.observe(view);
  }).catch((e) => {
    console.error("[tbc] map", e);
    view.classList.remove("is-loading");
    view.insertAdjacentHTML("beforeend", `<p class="map-fail unk">The chart could not load. Everything is in the list on this page.</p>`);
  });

  /* ---------- DOM ---------- */
  let svg, gratEl, labelsEl, pinsEl, edgeBtn, hint, scaleEl, card;
  function build() {
    view.textContent = "";
    view.classList.remove("is-static");
    view.insertAdjacentHTML("beforeend", `<svg class="map-base" preserveAspectRatio="none" aria-hidden="true" focusable="false"></svg><div class="map-labels" aria-hidden="true"></div><svg class="map-grat" aria-hidden="true" focusable="false"></svg><span class="map-rose" aria-hidden="true"><svg class="rose" viewBox="0 0 200 200" focusable="false"><use href="${ROOT}assets/img/brand/brand.svg#compass"/></svg></span><div class="map-pins"></div>
<div class="map-zoom"><button type="button" data-zoom="in" aria-label="Zoom in">${I("plus")}</button><button type="button" data-zoom="out" aria-label="Zoom out">${I("minus")}</button><button type="button" data-zoom="fit" aria-label="Show the whole chart">${I("fit")}</button></div>
<div class="map-foot"><span class="map-scale" aria-hidden="true"><i></i><b></b></span><span class="map-note label">Not for navigation</span></div>
<button class="map-edge" type="button" hidden></button><p class="map-hint" hidden></p><div class="map-card" role="region" aria-label="Selected on the chart" hidden></div>`);
    svg = $(".map-base", view); gratEl = $(".map-grat", view); labelsEl = $(".map-labels", view); pinsEl = $(".map-pins", view);
    edgeBtn = $(".map-edge", view); hint = $(".map-hint", view); scaleEl = $(".map-scale", view); card = $(".map-card", view);
    const r = view.getBoundingClientRect(); S.vw = r.width; S.vh = r.height;
    wire();
  }
  function swapBase(id, svgText) {
    const g = new DOMParser().parseFromString(svgText, "image/svg+xml").getElementById("bm");
    svg.textContent = "";
    if (g) { g.removeAttribute("id"); svg.appendChild(document.importNode(g, true)); }
    S.chart = id;
    S.meta = metaOf(S.charts[id]);
    S.labels = (S.charts[id].labels || []).map((l) => ({ ...l, xy: project(l.lat, l.lng, S.meta), rank: LABEL_RANK[l.kind] ?? 9 })).sort((a, b) => a.rank - b.rank);
    view.dataset.chart = id;
  }
  async function setChart(id, { fit = "home", keep = false } = {}) {
    if (!S.ready || !S.charts || !S.charts[id] || id === S.chart) return false;
    const center = S.v ? unproject(S.v.cx, S.v.cy, S.meta) : null, ground = S.v ? S.vw / S.v.s * S.meta.mPerUnit : 0;
    let text;
    try { text = await loadSvg(FILE[id]); } catch { toast("That chart could not load."); return false; }
    swapBase(id, text);
    S.init = false;
    S.pins = []; S.byId = new Map();
    setPins(pending, { refit: false });
    if (keep && center && onMap(S.meta, center[0], center[1])) { const [cx, cy] = project(center[0], center[1], S.meta); S.v = clamp({ cx, cy, s: (S.vw * S.meta.mPerUnit) / Math.max(1, ground) }); render(true); }
    else if (fit === "pins" && S.pins.length) fitTo(S.pins, false);
    else goHome(false);
    return true;
  }

  /* ---------- the view: center (units), s (px per unit) ---------- */
  const maxS = () => MAX_S[S.chart] || 8;
  const clamp = (v) => clampView(v, Math.max(1, S.vw), Math.max(1, S.vh), S.meta, maxS());
  const unitsBox = (pts) => { const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
  function fitBox(b, pad = 44, cap = 2.6) {
    const s = Math.min(cap, fitScale(b, Math.max(1, S.vw - GRAT.l - GRAT.r), Math.max(1, S.vh - GRAT.t - GRAT.b), pad));
    S.v = clamp({ cx: (b[0] + b[2]) / 2 - (GRAT.l - GRAT.r) / 2 / s, cy: (b[1] + b[3]) / 2 - (GRAT.t - GRAT.b) / 2 / s, s });
  }
  function homeBox() { const h = S.meta.home; const [x0, y0] = project(h.n, h.w, S.meta), [x1, y1] = project(h.s, h.e, S.meta); return [x0, y0, x1, y1]; }
  function goHome(anim = true) { const t = S.v; fitBox(homeBox(), 0, maxS()); if (anim && t) animateFrom(t); else render(true); }
  function fitTo(pins, anim = true) {
    const t = S.v;
    if (!pins || !pins.length) fitBox(homeBox(), 0, maxS()); else fitBox(unitsBox(pins), 56, pins.length === 1 ? 3 : S.chart === "bay" ? 4 : 2);
    if (anim && t) animateFrom(t); else render(true);
  }
  function zoomAt(f, px = S.vw / 2, py = S.vh / 2, anim = false) {
    const t = S.v, v = S.v;
    const ux = v.cx + (px - S.vw / 2) / v.s, uy = v.cy + (py - S.vh / 2) / v.s;
    const s = Math.min(maxS(), v.s * f);
    S.v = clamp({ s, cx: ux - (px - S.vw / 2) / s, cy: uy - (py - S.vh / 2) / s });
    if (anim) animateFrom(t); else render(true);
  }
  let animId = 0;
  function animateFrom(from) {
    const to = S.v, id = ++animId;
    if (still() || !from) { render(true); return; }
    const t0 = performance.now(), D = 200;
    const step = (t) => {
      if (id !== animId) return;
      const k = Math.min(1, (t - t0) / D), e = 1 - (1 - k) ** 3;
      S.v = { cx: from.cx + (to.cx - from.cx) * e, cy: from.cy + (to.cy - from.cy) * e, s: from.s * (to.s / from.s) ** e };
      if (k < 1) { render(false); requestAnimationFrame(step); } else { S.v = to; render(true); }
    };
    requestAnimationFrame(step);
  }
  function bounds() {
    if (!S.v) return null;
    const w = S.vw / S.v.s, h = S.vh / S.v.s;
    return { chart: S.chart, meta: S.meta, s: S.v.s, x0: S.v.cx - w / 2 + GRAT.l / S.v.s, y0: S.v.cy - h / 2 + GRAT.t / S.v.s, x1: S.v.cx + w / 2 - GRAT.r / S.v.s, y1: S.v.cy + h / 2 - GRAT.b / S.v.s };
  }

  /* ---------- pins ---------- */
  function projectPin(p) { if (!onMap(S.meta, p.lat, p.lng)) return null; const [x, y] = project(p.lat, p.lng, S.meta); return { ...p, x, y }; }
  function setPins(pins, { refit = true } = {}) {
    const prevEmpty = !S.pins.length;
    S.pins = pins.map(projectPin).filter(Boolean).sort((a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9) || (a.n || 1e9) - (b.n || 1e9));
    S.byId = new Map(S.pins.map((p) => [p.id, p]));
    for (const p of S.pins) { p.el = pinEl(p, S.els.get(p.id)); S.els.set(p.id, p.el); }
    if (S.sel && !S.byId.has(S.sel)) { S.sel = null; card.hidden = true; }
    if (S.vw < 10 || S.vh < 10) return;
    if (S.init) {
      S.init = false;
      const f = opts.focus && S.byId.get(opts.focus);
      if (f) { S.v = clamp({ cx: f.x, cy: f.y, s: S.chart === "bay" ? 4 : 1.6 }); S.sel = f.id; if (!opts.onSelect) showCard(f); }
      else if (opts.fit === "pins" && S.pins.length) fitBox(unitsBox(S.pins), 48, S.pins.length === 1 ? 3 : maxS());
      else fitBox(homeBox(), 0, maxS());
    } else if (refit && opts.fit === "pins" && prevEmpty && S.pins.length) fitBox(unitsBox(S.pins), 56, 4);
    render(true);
  }
    function pinEl(p, b) {
    if (!b) { b = document.createElement("button"); b.type = "button"; }
    b.className = `pin pin-${p.kind}${p.live ? " is-live" : ""}${p.count > 1 ? " has-more" : ""}${p.dim ? " is-dim" : ""}`;
    if (p.sheet) b.dataset.sheet = p.sheet; else delete b.dataset.sheet;
    b.dataset.pin = p.id;
    b.setAttribute("aria-pressed", String(S.sel === p.id));
    b.setAttribute("aria-label", `${p.n ? `${p.n}. ` : ""}${p.label}${p.kindWord ? `, ${p.kindWord}` : ""}${p.count > 1 ? `, and ${p.count - 1} more at this spot` : ""}${p.live ? ", an event on now" : ""}`);
    const inner = `<span>${p.n ? esc(p.n) : SYMBOL[p.kind] ? I(SYMBOL[p.kind]) : ""}</span>${p.count > 1 ? `<b class="pin-more" aria-hidden="true">+${p.count - 1}</b>` : ""}`;
    if (b.innerHTML !== inner) b.innerHTML = inner;
    return b;
  }

  /* ---------- render ---------- */
  let raf = 0;
  const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(false); }); };
  let viewT = 0;
  function render(full) {
    if (!S.ready || !S.v) return;
    const v = S.v, w = S.vw / v.s, h = S.vh / v.s, x0 = v.cx - w / 2, y0 = v.cy - h / 2;
    svg.setAttribute("viewBox", `${x0.toFixed(2)} ${y0.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
    const sx = (x) => (x - x0) * v.s, sy = (y) => (y - y0) * v.s;
    if (full) {
      view.dataset.lod = v.s < 0.5 ? "0" : v.s < 1.2 ? "1" : "2";
      view.style.setProperty("--mw", v.s < 0.5 ? ".7" : v.s < 0.9 ? ".85" : v.s < 2.5 ? "1" : "1.3");
      layoutPins(sx, sy);
      layoutLabels(sx, sy, v);
      edge(x0, y0, w, h);
      clearTimeout(viewT);
      if (opts.onView) viewT = setTimeout(() => opts.onView(bounds()), 90);
    } else {
      for (const l of S.shownLabels || []) { l.el.style.left = `${sx(l.xy[0])}px`; l.el.style.top = `${sy(l.xy[1]) + l.dy}px`; }
      for (const p of S.placed) { p.el.style.left = `${sx(p.x)}px`; p.el.style.top = `${sy(p.y)}px`; }
    }
    if (S.you) { S.you.el.style.left = `${sx(S.you.x)}px`; S.you.el.style.top = `${sy(S.you.y)}px`; }
    grat(x0, y0, w, h);
    scale();
  }
  /* the neatline margin: minute bands in ink and paper at the chart's real coordinates, labels top and left */
  function grat(x0, y0, w, h) {
    const M = S.meta, s = S.v.s, W = S.vw, H = S.vh, T = GRAT.t, L = GRAT.l, B = GRAT.b, R = GRAT.r, bw = GRAT.band;
    if (W < L + R + 40 || H < T + B + 40) return;
    const [latTop, lngLeft] = unproject(x0, y0, M), [latBot, lngRight] = unproject(x0 + w, y0 + h, M);
    const ppmLat = (M.sx * s) / 60, ppmLng = (M.sx * M.k * s) / 60;
    const labLat = LAB_STEPS.find((m) => m * ppmLat >= 64) || 60, labLng = LAB_STEPS.find((m) => m * ppmLng >= 96) || 60;
    const bandOf = (lab, ppm) => BAND_STEPS.find((b) => b * ppm >= 7 && Math.abs(lab / b - Math.round(lab / b)) < 1e-6) || lab;
    const bLat = bandOf(labLat, ppmLat), bLng = bandOf(labLng, ppmLng);
    const X = (lng) => ((lng - M.bbox.w) * M.k * M.sx - x0) * s, Y = (lat) => ((M.bbox.n - lat) * M.sx - y0) * s;
    // buoys and medallions reaching into the margin: a coordinate they would cover is left out
    const reach = S.placed.map((p) => { const px = (p.x - x0) * s, py = (p.y - y0) * s; return p.cluster ? [px - 26, py - 26, px + 26, py + 26] : [px - 17, py - 52, px + 17, py + 4]; }).filter((b) => b[1] < T || b[0] < L);
    const covered = (b) => reach.some((r) => b[0] < r[2] && b[2] > r[0] && b[1] < r[3] && b[3] > r[1]);
    const out = [`<rect class="g-paper" x="0" y="0" width="${W}" height="${T}"/><rect class="g-paper" x="0" y="0" width="${L}" height="${H}"/><rect class="g-paper" x="${W - R}" y="0" width="${R}" height="${H}"/><rect class="g-paper" x="0" y="${H - B}" width="${W}" height="${B}"/>`];
    const lines = [], labs = [];
    // longitude: vertical minute bands on the top and bottom, labels on top
    for (let m = Math.floor((lngLeft * 60) / bLng) * bLng; m <= lngRight * 60 + bLng; m += bLng) {
      const a = X(m / 60), b = X((m + bLng) / 60);
      if (b < L || a > W - R) continue;
      const xa = Math.max(L, a), xb = Math.min(W - R, b);
      if (Math.round(m / bLng) % 2 === 0 && xb > xa) out.push(`<rect class="g-ink" x="${xa.toFixed(1)}" y="${T - bw}" width="${(xb - xa).toFixed(1)}" height="${bw}"/><rect class="g-ink" x="${xa.toFixed(1)}" y="${H - B}" width="${(xb - xa).toFixed(1)}" height="${bw}"/>`);
      if (Math.abs(m / labLng - Math.round(m / labLng)) < 1e-6 && a > L + 36 && a < W - R - 36) {
        lines.push(`M${a.toFixed(1)} ${T}V${H - B}`);
        if (!covered([a - 34, 0, a + 34, T])) labs.push(`<text class="g-lab" x="${a.toFixed(1)}" y="${T - bw - 2}" text-anchor="middle">${dm(m / 60, labLng, "E", "W")}</text>`);
      }
    }
    // latitude: horizontal bands on the left and right, labels on the left (rotated)
    for (let m = Math.floor((latBot * 60) / bLat) * bLat; m <= latTop * 60 + bLat; m += bLat) {
      const a = Y((m + bLat) / 60), b = Y(m / 60);
      if (b < T || a > H - B) continue;
      const ya = Math.max(T, a), yb = Math.min(H - B, b);
      if (Math.round(m / bLat) % 2 === 0 && yb > ya) out.push(`<rect class="g-ink" x="${L - bw}" y="${ya.toFixed(1)}" width="${bw}" height="${(yb - ya).toFixed(1)}"/><rect class="g-ink" x="${W - R}" y="${ya.toFixed(1)}" width="${bw}" height="${(yb - ya).toFixed(1)}"/>`);
      const yl = Y(m / 60);
      if (Math.abs(m / labLat - Math.round(m / labLat)) < 1e-6 && yl > T + 34 && yl < H - B - 34) {
        lines.push(`M${L} ${yl.toFixed(1)}H${W - R}`);
        if (!covered([0, yl - 32, L, yl + 32])) labs.push(`<text class="g-lab" x="${L - bw - 3}" y="${yl.toFixed(1)}" text-anchor="middle" transform="rotate(-90 ${L - bw - 3} ${yl.toFixed(1)})">${dm(m / 60, labLat, "N", "S")}</text>`);
      }
    }
    gratEl.setAttribute("viewBox", `0 0 ${W} ${H}`);
    gratEl.innerHTML = `<path class="g-line" d="${lines.join("")}"/>${out.join("")}<path class="g-rule" d="M${L - bw} ${H}V${T - bw}H${W}M${L} ${T}H${W - R}V${H - B}H${L}Z"/><rect class="g-rule" x=".5" y=".5" width="${W - 1}" height="${H - 1}"/>${labs.join("")}`;
  }
  function scale() {
    const mpp = S.meta.mPerUnit / S.v.s, MI = 1609.344;
    const d = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50].find((m) => (m * MI) / mpp >= 56) || 50;
    scaleEl.style.setProperty("--w", `${Math.round((d * MI) / mpp)}px`);
    const t = `${d} mi`;
    if (scaleEl.lastChild.textContent !== t) scaleEl.lastChild.textContent = t;
  }
  function layoutLabels(sx, sy, v) {
    const z = v.s / Z1, shown = [];
    const boxes = S.placed.map((p) => { const x = sx(p.x), y = sy(p.y), r = p.cluster ? 22 : 18; return [x - r, y - r - (p.cluster ? 0 : 16), x + r, y + r]; });
    const vr = view.getBoundingClientRect();
    for (const c of view.querySelectorAll(".map-zoom, .map-edge:not([hidden]), .map-foot, .map-rose")) { const b = c.getBoundingClientRect(); if (b.width) boxes.push([b.left - vr.left - 4, b.top - vr.top - 4, b.right - vr.left + 4, b.bottom - vr.top + 4]); }
    const hit = (r) => boxes.some((b) => r[0] < b[2] && r[2] > b[0] && r[1] < b[3] && r[3] > b[1]);
    labelsEl.textContent = "";
    const frag = document.createDocumentFragment();
    for (const l of S.labels) {
      if ((l.minZoom || 1) > z + 1e-9) continue;
      const x0 = sx(l.xy[0]), y0 = sy(l.xy[1]);
      if (x0 < -80 || y0 < -20 || x0 > S.vw + 80 || y0 > S.vh + 20) continue;
      const wpx = l.text.length * (LABEL_W[l.kind] || 11.2) + 12, hpx = l.kind === "route" ? 22 : 18;
      const a = ((l.angle || 0) * Math.PI) / 180, bw = Math.abs(wpx * Math.cos(a)) + Math.abs(hpx * Math.sin(a)), bh = Math.abs(wpx * Math.sin(a)) + Math.abs(hpx * Math.cos(a));
      let r = null, y = y0;
      for (const dy of l.kind === "route" || l.kind === "bridge" || l.kind === "water" ? [0] : [0, -22, 22]) {
        const c = [x0 - bw / 2, y0 + dy - bh / 2, x0 + bw / 2, y0 + dy + bh / 2];
        if (c[0] < GRAT.l + 4 || c[2] > S.vw - GRAT.r - 4 || c[1] < GRAT.t + 4 || c[3] > S.vh - GRAT.b - 4 || hit(c)) continue;
        r = c; y = y0 + dy; break;
      }
      if (!r) continue;
      boxes.push(r);
      const e = document.createElement("span");
      e.className = `map-label ${l.kind}`;
      e.textContent = l.text;
      if (l.angle) e.style.setProperty("--a", `${l.angle}deg`);
      e.style.left = `${x0}px`; e.style.top = `${y}px`;
      frag.appendChild(e);
      shown.push({ ...l, el: e, dy: y - y0 });
    }
    labelsEl.appendChild(frag);
    S.shownLabels = shown;
  }
  function layoutPins(sx, sy) {
    const pts = [];
    for (const p of S.pins) {
      const x = sx(p.x), y = sy(p.y);
      if (x < GRAT.l || y < GRAT.t || x > S.vw - GRAT.r || y > S.vh - GRAT.b) continue;
      pts.push({ p, x, y });
    }
    const sel = pts.find((q) => q.p.id === S.sel);
    const groups = cluster(pts.filter((q) => q !== sel), S.vw < 520 ? 56 : 44);
    if (sel) groups.push({ x: sel.x, y: sel.y, members: [sel] });
    const at = spread(groups);
    const keep = new Set(), placed = [];
    for (const [gi, g] of groups.entries()) {
      if (g.members.length === 1) { const p = g.members[0].p; keep.add(p.el); placed.push(p); continue; }
      const ms = g.members.map((m) => m.p);
      const el = document.createElement("button");
      el.type = "button";
      el.className = `pin pin-cluster${ms.some((m) => m.live) ? " is-live" : ""}${ms.some((m) => m.id === S.hi) ? " is-hi" : ""}`;
      const n = ms.reduce((a, m) => a + (m.count || 1), 0);
      const kinds = Object.entries(ms.reduce((a, m) => ((a[m.kind] = (a[m.kind] || 0) + (m.count || 1)), a), {})).map(([k, c]) => plural(c, KIND_WORD[k] || ["place", "places"]));
      el.setAttribute("aria-label", `${n} here: ${kinds.join(", ")}. ${canSplit(ms) ? "Zoom in to see them" : "List them"}`);
      el.innerHTML = `<span>${n}</span>`;
      el._members = ms;
      placed.push({ el, x: ms.reduce((a, m) => a + m.x, 0) / ms.length + (at[gi].x - g.x) / S.v.s, y: ms.reduce((a, m) => a + m.y, 0) / ms.length + (at[gi].y - g.y) / S.v.s, cluster: true });
      keep.add(el);
    }
    const had = document.activeElement && pinsEl.contains(document.activeElement) ? document.activeElement : null;
    for (const ch of [...pinsEl.children]) if (!keep.has(ch)) ch.remove();
    for (const p of placed) { p.el.style.left = `${sx(p.x)}px`; p.el.style.top = `${sy(p.y)}px`; if (p.el.parentNode !== pinsEl) pinsEl.appendChild(p.el); }
    if (S.you) pinsEl.appendChild(S.you.el);
    S.placed = placed;
    if (S.focusAfter) {
      const id = S.focusAfter, p = S.byId.get(id);
      const target = p && p.el.isConnected ? p.el : (placed.find((c) => c.cluster && c.el._members.some((m) => m.id === id)) || {}).el;
      if (target) { S.focusAfter = null; target.focus({ preventScroll: true }); }
    } else if (had && !had.isConnected) view.focus({ preventScroll: true });
    paintHi();
  }
  const canSplit = (ms) => { const b = unitsBox(ms); return S.v.s < maxS() - 1e-6 && Math.max(b[2] - b[0], b[3] - b[1]) * maxS() > 28; };
  function paintHi() {
    if (!S.ready) return;
    for (const p of S.pins) { p.el.classList.toggle("is-hi", p.id === S.hi); p.el.setAttribute("aria-pressed", String(p.id === S.sel)); }
    for (const c of S.placed) if (c.cluster) c.el.classList.toggle("is-hi", c.el._members.some((m) => m.id === S.hi));
  }

  /* ---------- the edge chip: what lies beyond the frame, counted, one tap away ---------- */
  let edgeGroup = null;
  function edge(x0, y0, w, h) {
    const b = bounds();
    const off = S.pins.filter((p) => p.x < b.x0 || p.x > b.x1 || p.y < b.y0 || p.y > b.y1);
    if (!off.length) { edgeBtn.hidden = true; edgeGroup = null; return; }
    const by = new Map();
    for (const p of off) { const dx = p.x - S.v.cx, dy = p.y - S.v.cy, d = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? "south" : "north") : dx > 0 ? "east" : "west"; if (!by.has(d)) by.set(d, []); by.get(d).push(p); }
    const [dir, ps] = [...by].sort((a, b2) => b2[1].reduce((n, p) => n + (p.count || 1), 0) - a[1].reduce((n, p) => n + (p.count || 1), 0))[0];
    const count = ps.reduce((n, p) => n + (p.count || 1), 0), all = off.reduce((n, p) => n + (p.count || 1), 0);
    const areas = new Map(); for (const p of ps) if (p.a) areas.set(p.a, (areas.get(p.a) || 0) + 1);
    const top = [...areas].sort((a, b2) => b2[1] - a[1])[0];
    const where = top && top[1] >= ps.length / 2 && S.areas[top[0]] ? S.areas[top[0]].n : "";
    const kinds = new Set(ps.map((p) => p.kind));
    const noun = kinds.size === 1 ? KIND_WORD[ps[0].kind] : ["more", "more"];
    edgeGroup = ps;
    const txt = `${where ? `${where}: ` : ""}${count} ${count === 1 ? noun[0] : noun[1]} to the ${dir}${all > count ? ` · ${all - count} elsewhere` : ""}`;
    edgeBtn.innerHTML = `${I("arrow-r", `dir-${dir}`)}<span>${esc(txt)}</span>`;
    edgeBtn.setAttribute("aria-label", `Show ${count} to the ${dir}${where ? `, in ${where}` : ""}`);
    edgeBtn.hidden = false;
  }

  /* ---------- selection ---------- */
  function choose(p, { keyboard = false, zoom = false, fromApi = false } = {}) {
    S.sel = p.id;
    const bias = opts.bias ? opts.bias() : 0.5;
    const t = S.v, b = bounds(), inside = p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1 && (bias >= 0.5 || (p.y - b.y0) * S.v.s < (bias + 0.12) * S.vh);
    if (zoom || !inside) { const s = zoom ? Math.max(S.v.s, S.chart === "bay" ? 4 : 1.6) : S.v.s; S.v = clamp({ cx: p.x, cy: p.y + ((0.5 - bias) * S.vh) / s, s }); animateFrom(t); }
    else render(true);
    paintHi();
    if (opts.onSelect) { card.hidden = true; if (!fromApi) opts.onSelect(p.id, p, { keyboard }); }
    else showCard(p, keyboard);
  }
  function showCard(p, focus = false) {
    const d = directions(p.lat, p.lng);
    card.innerHTML = `<button class="map-card-x" type="button" aria-label="Close">${I("x")}</button><p class="label faint">${esc(p.n ? `No. ${p.n}` : KIND_LABEL[p.kind] || "Place")}</p><h3 tabindex="-1">${esc(p.label)}</h3>${p.meta ? `<p class="muted">${esc(p.meta)}</p>` : ""}<p class="btn-row">${p.href ? `<a class="btn btn-secondary btn-sm" href="${esc(p.href)}">Open${I("arrow-r")}</a>` : ""}${ext(d.apple, "Apple Maps", "btn btn-ghost btn-sm")}${ext(d.google, "Google Maps", "btn btn-ghost btn-sm")}</p>`;
    card.hidden = false;
    if (focus) $("h3", card).focus();
  }
  function clearSel() { S.sel = null; card.hidden = true; paintHi(); if (opts.onClear) opts.onClear(); }

  /* ---------- "Near me": asked for, used once, never stored ---------- */
  function locate() {
    if (!navigator.geolocation) { toast("This browser can't share your location."); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      if (!onMap(S.meta, lat, lng)) { toast(S.chart === "bay" ? "You're outside the bay chart. Try the region chart." : "You're outside the area of this guide."); return; }
      const [x, y] = project(lat, lng, S.meta);
      if (!S.you) { const e = document.createElement("span"); e.className = "pin pin-you"; e.setAttribute("role", "img"); e.setAttribute("aria-label", "You are here"); e.innerHTML = "<span></span>"; S.you = { el: e }; pinsEl.appendChild(e); }
      S.you.x = x; S.you.y = y;
      const t = S.v; S.v = clamp({ cx: x, cy: y, s: Math.max(S.v.s, S.chart === "bay" ? 3 : 1.2) }); animateFrom(t);
      toast("Showing where you are. Your location stays on this device.");
    }, () => toast("Your location is not available."), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  /* ---------- input ---------- */
  function wire() {
    on(box, "click", (e) => {
      const z = e.target.closest("[data-zoom]");
      if (z && view.contains(z)) { const k = z.dataset.zoom; if (k === "fit") fitTo(opts.fit === "pins" && S.pins.length ? S.pins : null); else zoomAt(k === "in" ? 1.8 : 1 / 1.8, S.vw / 2, S.vh / 2, true); return; }
      if (e.target.closest("[data-near-me]")) { locate(); return; }
      if (e.target.closest(".map-card-x")) { clearSel(); view.focus({ preventScroll: true }); return; }
      if (e.target.closest(".map-edge")) { if (edgeGroup) fitTo(edgeGroup); return; }
      const pk = e.target.closest("[data-pick]");
      if (pk && view.contains(pk)) { const p = S.byId.get(pk.dataset.pick); if (p) choose(p, { keyboard: e.detail === 0, zoom: true }); return; }
      const pb = e.target.closest("button.pin");
      if (!pb || !view.contains(pb)) return;
      if (moved) { e.preventDefault(); return; }
      const kb = e.detail === 0;
      if (pb.classList.contains("pin-cluster")) {
        const ms = pb._members;
        if (canSplit(ms)) { if (kb) S.focusAfter = ms[0].id; fitTo(ms); }
        else if (opts.onList) opts.onList(ms.map((m) => m.id), { keyboard: kb });
        else { card.innerHTML = `<button class="map-card-x" type="button" aria-label="Close">${I("x")}</button><p class="label faint">${ms.length} here</p><ul class="map-card-list">${ms.map((m) => `<li><button type="button" data-pick="${esc(m.id)}">${m.n ? `<b>${esc(m.n)}</b> ` : ""}${esc(m.label)}</button></li>`).join("")}</ul>`; card.hidden = false; if (kb) $("[data-pick]", card).focus(); }
        return;
      }
      const p = S.byId.get(pb.dataset.pin);
      if (p) choose(p, { keyboard: kb });
    });
    on(pinsEl, "pointerover", (e) => { const pb = e.target.closest("button.pin"); if (pb && opts.onHover) opts.onHover(pb.dataset.pin || null); });
    on(pinsEl, "pointerout", (e) => { if (opts.onHover && !pinsEl.contains(e.relatedTarget)) opts.onHover(null); });
    on(pinsEl, "focusin", (e) => { const pb = e.target.closest("button.pin"); if (pb && opts.onHover) opts.onHover(pb.dataset.pin || null); });
    on(view, "keydown", (e) => {
      if (e.key === "Escape" && (S.sel || !card.hidden)) { clearSel(); return; }
      if (e.target !== view) return;
      const step = 90 / S.v.s, k = e.key;
      if (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown") {
        const t = S.v;
        S.v = clamp({ ...S.v, cx: S.v.cx + (k === "ArrowLeft" ? -step : k === "ArrowRight" ? step : 0), cy: S.v.cy + (k === "ArrowUp" ? -step : k === "ArrowDown" ? step : 0) });
        animateFrom(t);
      } else if (k === "+" || k === "=") zoomAt(1.6, S.vw / 2, S.vh / 2, true);
      else if (k === "-" || k === "_") zoomAt(1 / 1.6, S.vw / 2, S.vh / 2, true);
      else if (k === "0") fitTo(opts.fit === "pins" && S.pins.length ? S.pins : null);
      else return;
      e.preventDefault();
    });
    let hintT = 0;
    on(view, "wheel", (e) => {
      if (opts.wheel !== "always" && !(e.ctrlKey || e.metaKey)) {
        hint.textContent = `Hold ${/mac/i.test(navigator.platform) ? "⌘" : "Ctrl"} and scroll to zoom the chart`;
        hint.hidden = false; clearTimeout(hintT); hintT = setTimeout(() => { hint.hidden = true; }, 1400);
        return;
      }
      e.preventDefault();
      const r = view.getBoundingClientRect();
      zoomAt(Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.006), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    const ptrs = new Map();
    let moved = false, start = null, pinch = null, lastTap = 0, lastTapXY = null, lastType = "mouse";
    on(view, "dblclick", (e) => { if (lastType === "touch" || e.target.closest("button, a")) return; const r = view.getBoundingClientRect(); zoomAt(2, e.clientX - r.left, e.clientY - r.top, true); });
    on(view, "pointerdown", (e) => {
      lastType = e.pointerType;
      if (e.target.closest(".map-zoom, .map-edge, .map-card, .map-hint")) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { moved = false; start = { x: e.clientX, y: e.clientY, v: { ...S.v } }; }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, v: { ...S.v } }; moved = true; }
    });
    on(view, "pointermove", (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = view.getBoundingClientRect();
      if (ptrs.size >= 2 && pinch) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const s = Math.min(maxS(), pinch.v.s * (d / Math.max(1, pinch.d)));
        const ux = pinch.v.cx + (pinch.mx - r.left - S.vw / 2) / pinch.v.s, uy = pinch.v.cy + (pinch.my - r.top - S.vh / 2) / pinch.v.s;
        S.v = clamp({ s, cx: ux - (mx - r.left - S.vw / 2) / s, cy: uy - (my - r.top - S.vh / 2) / s });
        queue();
        return;
      }
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      if (!moved) { moved = true; try { view.setPointerCapture(e.pointerId); } catch { /* gone */ } view.classList.add("is-dragging"); }
      S.v = clamp({ s: start.v.s, cx: start.v.cx - dx / start.v.s, cy: start.v.cy - dy / start.v.s });
      queue();
    });
    const end = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (ptrs.size === 1 && pinch) { const [a] = [...ptrs.values()]; pinch = null; start = { x: a.x, y: a.y, v: { ...S.v } }; return; }
      if (ptrs.size) return;
      pinch = null;
      view.classList.remove("is-dragging");
      if (moved) { render(true); setTimeout(() => { moved = false; }, 0); }
      else if (e.pointerType === "touch" && !e.target.closest("button, a")) {
        const t = performance.now();
        if (t - lastTap < 320 && lastTapXY && Math.hypot(e.clientX - lastTapXY.x, e.clientY - lastTapXY.y) < 30) { const r = view.getBoundingClientRect(); zoomAt(2, e.clientX - r.left, e.clientY - r.top, true); lastTap = 0; }
        else { lastTap = t; lastTapXY = { x: e.clientX, y: e.clientY }; }
      }
      start = null;
    };
    on(view, "pointerup", end);
    on(view, "pointercancel", end);
  }
  return api;
}
const attribHtml = (c) => (c && c.attribution ? esc(c.attribution).replace(esc(c.osm || "https://www.openstreetmap.org/copyright"), ext(c.osm || "https://www.openstreetmap.org/copyright", esc(c.osm || "https://www.openstreetmap.org/copyright"), "")) : "");

/* ============================================================ pages ============================================================ */
export function init(app) {
  if ($("[data-map-page]")) mapPage(app);
  for (const box of $$("[data-area-events]")) areaEvents(app, box);
  const fig = $("[data-area-chart]");
  if (fig) areaChart(fig);
}

/* ---------- area pages: the static chart becomes a live one (its buoys are the numbered rows of the lists) ---------- */
function areaChart(fig) {
  const seen = new Set(), pins = [];
  for (const li of $$("li.ar-row[data-ll]")) {
    if (seen.has(li.dataset.n)) continue; seen.add(li.dataset.n);
    const [lat, lng] = li.dataset.ll.split(",").map(Number), a = $("a", li);
    pins.push({ id: li.dataset.n, kind: li.dataset.h ? "heritage" : "place", n: li.dataset.n, lat, lng, sheet: li.dataset.sheet, label: ($(".t", li) || a).textContent, meta: ($(".w", li) || {}).textContent || "", href: a.getAttribute("href") });
  }
  const stat = $(".chart-map", fig);
  if (!pins.length || !stat) return;
  const box = document.createElement("div");
  box.className = "ar-live";
  stat.replaceWith(box);
  mountMap(box, { pins, chart: stat.dataset.chart, fit: "pins", title: `Chart of ${fig.dataset.areaChart}, numbered as in the lists` });
}

/** Is a row's event listing inside [a, b]? days: listing days; runs: [[from, to]]. */
const evIn = (x, a, b) => (x.days || []).some((d) => d >= a && d <= b) || (x.runs || []).some(([f, t]) => f <= b && t >= a);

/* ---------- map.html ---------- */
const CAP = 40;                                      // rows per list section before "Show all"
const SEC_NOUN = { places: ["thing to do", "things to do"], outdoors: ["beach or outdoor place", "beaches and outdoor places"], heritage: KIND_WORD.heritage, events: KIND_WORD.event, stays: KIND_WORD.stay, experiences: KIND_WORD.experience, transport: KIND_WORD.stop };
const TOPICAL = new Set(["place", "heritage", "experience", "event"]);
function mapPage(app) {
  const page = $("[data-map-page]");
  const box = $("[data-map-box]", page), list = $("[data-map-list]", page), panel = $("[data-map-panel]", page);
  const countEl = $("[data-map-count]", page), scopeBtn = $("[data-map-scope]", page), resetBtn = $("[data-map-reset]", page);
  const rows = $$("li.map-li[data-id]", list).map((el) => {
    const ds = el.dataset, [lat, lng] = ds.ll.split(",").map(Number), a = $("a.t", el);
    return {
      el, id: ds.id, k: ds.k, l: ds.l.split(" "), r: ds.r || "", a: ds.a || "", lat, lng, ll: ds.ll, n: ds.n || "", g: (ds.g || "").split(" ").filter(Boolean),
      t: (ds.t || "").split(" ").filter(Boolean), st: ds.st || "", days: ds.days ? ds.days.split(" ") : null, runs: ds.runs ? ds.runs.split(" ").map((r) => r.split(":")) : null,
      evs: ds.evs ? ds.evs.split(" ") : null, f: ds.f || "", sub: ds.sub || "", sec: el.closest("[data-sec]").dataset.sec, grp: el.closest("[data-grp]"),
      name: (a.lastChild || a).textContent.trim(), meta0: $(".m", el).textContent, mEl: $(".m", el), href: a.getAttribute("href"), oe: a.dataset.openEvent || "", ox: a.dataset.openExperience || "",
      badge: ($(".badge", el) || {}).outerHTML || "",
    };
  });
  const byId = new Map(rows.map((x) => [x.id, x]));
  const evRow = new Map(); for (const x of rows) for (const id of x.evs || []) evRow.set(id, x);
  const secs = $$("[data-sec]", list).filter((s) => s.tagName === "SECTION");
  const LAY = [...new Set($$("button[data-layer]", page).map((b) => b.dataset.layer))];
  const DEF = (page.dataset.defaultLayers || "").split(" ").filter((l) => LAY.includes(l));
  const REG = $$("[data-mr]", page).map((b) => b.dataset.mr), GRP = $$("[data-mk]", page).map((b) => b.dataset.mk);
  const topicSel = $("[data-mt]", page), TOP = topicSel ? [...topicSel.options].map((o) => o.value).filter(Boolean) : [];
  const areaSel = $("[data-ma]", page);
  const WHENS = ["today", "weekend", "week", "month"];
  const q = new URLSearchParams(location.search);
  const listOf = (k, ok) => (q.get(k) || "").split(",").filter((x) => ok.includes(x));
  const st = {
    layers: q.has("layers") ? listOf("layers", LAY) : DEF.slice(), r: listOf("r", REG), k: listOf("k", GRP), t: listOf("t", TOP),
    when: WHENS.includes(q.get("when")) ? q.get("when") : "", chart: ["bay", "region"].includes(q.get("chart")) ? q.get("chart") : "",
    sel: null, lead: null, area: null, pinned: null, scope: "view", more: new Set(), focusEv: null,
  };

  /* focus=<kind>:<id> → a row (or an area) */
  const fq = q.get("focus") || "", fi = fq.indexOf(":"), fk = fq.slice(0, fi), fid = fq.slice(fi + 1);
  let focusRow = null;
  if (fk === "place" || fk === "stay" || fk === "experience") focusRow = byId.get(`${fk[0] === "e" ? "x" : fk[0]}:${fid}`) || null;
  else if (fk === "event") { focusRow = evRow.get(fid) || null; if (focusRow) st.focusEv = fid; }
  else if (fk === "transport") focusRow = rows.find((x) => x.id.startsWith(`t:${fid}~`)) || null;
  else if (fk === "area") st.area = fid;
  if (focusRow) {
    st.pinned = focusRow;
    if (!focusRow.l.some((l) => st.layers.includes(l))) st.layers.push(focusRow.l[0]);
  }
  let charts = null, bayMeta = null, regionMeta = null;

  const win = () => { const now = app.now(), today = nyParts(now).date; return st.when ? whenRange(st.when, now) : [today, addDays(today, 29)]; };
  const vis = (x, w) => {
    if (x === st.pinned) return true;
    if (!x.l.some((l) => st.layers.includes(l))) return false;
    if (st.k.length && x.sec === "places" && !x.g.some((g) => st.k.includes(g)) && !x.l.some((l) => l !== "places" && st.layers.includes(l))) return false;
    if (st.r.length && !st.r.includes(x.r)) return false;
    if (st.t.length && TOPICAL.has(x.k) && !x.t.some((t) => st.t.includes(t))) return false;
    if (x.k === "event" && !evIn(x, w[0], w[1])) return false;
    return true;
  };

  let live = new Set(), evData = null, shown = [], pinOfRow = new Map(), pinsById = new Map(), lastBounds = null;
  const PRI = { place: 0, heritage: 0, stay: 1, experience: 2, event: 3, stop: 4 };
  function makePins() {
    const by = new Map();
    for (const x of shown) { if (!by.has(x.ll)) by.set(x.ll, []); by.get(x.ll).push(x); }
    pinOfRow = new Map(); pinsById = new Map();
    const out = [];
    for (const ms of by.values()) {
      ms.sort((a, b) => PRI[a.k] - PRI[b.k] || (+a.n || 1e9) - (+b.n || 1e9));
      const p = ms[0];
      const pin = { id: p.id, kind: p.k, lat: p.lat, lng: p.lng, sheet: p.r, n: p.n, label: p.name, kindWord: (p.meta0.split(" · ")[0] || "").toLowerCase(), count: ms.length, members: ms, live: ms.some((m) => live.has(m.id)), a: p.a };
      for (const m of ms) pinOfRow.set(m.id, p.id);
      pinsById.set(p.id, pin);
      out.push(pin);
    }
    return out;
  }

  const map = mountMap(box, {
    pins: [], wheel: "always", chart: "bay", title: "Chart of Tampa Bay", bias: () => (narrow() ? 0.3 : 0.5),
    onSelect: (id, pin, o) => select(id, o), onClear: () => closePanel(false),
    onHover: (id) => { const p = id && pinsById.get(id); for (const x of rows) x.el.classList.toggle("is-hi", !!p && p.members.includes(x)); },
    onView: (b) => { lastBounds = b; paintList(); },
  });

  /* the controls */
  function paintControls() {
    for (const b of $$("button[data-layer]", page)) b.setAttribute("aria-pressed", String(st.layers.includes(b.dataset.layer)));
    for (const b of $$("[data-mr]", page)) b.setAttribute("aria-pressed", String(st.r.includes(b.dataset.mr)));
    for (const b of $$("[data-mk]", page)) b.setAttribute("aria-pressed", String(st.k.includes(b.dataset.mk)));
    for (const b of $$("[data-mw]", page)) b.setAttribute("aria-pressed", String(b.dataset.mw === st.when));
    for (const b of $$("[data-chart]", page)) b.setAttribute("aria-pressed", String(b.dataset.chart === (map.chart || "bay")));
    if (topicSel) topicSel.value = st.t[0] || "";
    if (areaSel) areaSel.value = st.area && !st.sel ? st.area : "";
    for (const g of $$("[data-for]", page)) g.hidden = !g.dataset.for.split(" ").some((l) => st.layers.includes(l));
    for (const l of $$("[data-lg]", page)) l.hidden = !l.dataset.lg.split(" ").some((x) => st.layers.includes(x));
    const note = $("[data-mc-note]", page); if (note) note.hidden = !st.t.length;
    resetBtn.hidden = !(st.r.length || st.k.length || st.t.length || st.when);
    const t = $("[data-map-title]", page); if (t) t.textContent = map.chart === "region" ? "The region chart: the whole guide" : "The bay chart";
  }
  function apply(write = true) {
    const w = win();
    shown = rows.filter((x) => vis(x, w));
    if (st.pinned && !shown.includes(st.pinned)) shown.push(st.pinned);
    paintEventMeta(w);
    paintControls();
    map.update(makePins());
    if (st.sel && !pinsById.has(st.sel)) closePanel(false);
    paintList();
    if (write) writeUrl();
  }
  function paintEventMeta(w) {
    for (const x of rows) {
      if (x.k !== "event") continue;
      const ds = (x.days || []).filter((d) => d >= w[0] && d <= w[1]), rn = (x.runs || []).filter(([f, t]) => f <= w[1] && t >= w[0]);
      const parts = [x.sub, ds.length ? `${x.sub ? "" : "Next "}${fmtDay(ds[0])}` : "", rn.length ? fmtThrough(rn.map((r) => r[1]).sort().pop(), rn[0][0]) : "", ds.length > 1 ? `events on ${ds.length} days` : ""].filter(Boolean);
      const txt = parts.length > (x.sub ? 1 : 0) ? parts.join(" · ") : x.meta0;
      if (x.mEl.textContent !== txt) x.mEl.textContent = txt;
    }
  }
  /** The list follows the chart: rows shown by the filters and inside the view (or all shown, by choice), 40 a section. */
  function paintList() {
    const b = lastBounds, M = b && b.meta;
    const inView = (x) => !!M && onMap(M, x.lat, x.lng) && (() => { const [px, py] = project(x.lat, x.lng, M); return px >= b.x0 && px <= b.x1 && py >= b.y0 && py <= b.y1; })();
    const onChart = (x) => !!M && onMap(M, x.lat, x.lng);
    const set = new Set(shown);
    const per = {}, grpN = new Map();
    let nView = 0, nChart = 0, beyond = 0;
    for (const x of rows) {
      const s = set.has(x);
      const oc = s && onChart(x);
      if (s && !oc) beyond++;
      if (oc) nChart++;
      const ok = oc && (st.scope === "all" || inView(x));
      if (ok) nView++;
      const i = ok ? (per[x.sec] = (per[x.sec] || 0) + 1) : 0;
      const showRow = ok && (i <= CAP || st.more.has(x.sec));
      if (x.el.hidden === showRow) x.el.hidden = !showRow;
      if (ok) grpN.set(x.grp, (grpN.get(x.grp) || 0) + 1);
      if (showRow && !x.btn) {
        x.btn = document.createElement("button");
        x.btn.type = "button"; x.btn.className = "map-show"; x.btn.dataset.show = x.id;
        x.btn.setAttribute("aria-label", `Show ${x.name} on the chart`);
        x.btn.innerHTML = I("locate");
        x.el.appendChild(x.btn);
      }
    }
    for (const g of $$("[data-grp]", list)) { const n = grpN.get(g) || 0; g.hidden = !n; const c = $("[data-grp-count]", g); if (c) c.textContent = String(n); }
    for (const sec of secs) {
      const id = sec.dataset.sec, n = per[id] || 0;
      sec.hidden = !n;
      $("[data-sec-count]", sec).textContent = n.toLocaleString("en-US");
      const more = $(".map-more", sec), btn = $("[data-more]", sec);
      more.hidden = n <= CAP;
      if (n > CAP) btn.textContent = st.more.has(id) ? `Show the first ${CAP}` : `Show all ${n.toLocaleString("en-US")} ${n === 1 ? SEC_NOUN[id][0] : SEC_NOUN[id][1]}${st.scope === "all" ? "" : " in view"}`;
    }
    const other = b && b.chart === "bay" ? "region" : "bay", f = (v) => v.toLocaleString("en-US");
    countEl.innerHTML = !b ? "Loading the chart…" : `${st.scope === "all" ? `Listing all <b>${f(nChart)}</b> shown on this chart` : `In view: <b>${f(nView)}</b> of ${f(nChart)} shown`}${beyond ? ` · <button class="linkish" type="button" data-to-chart="${other}">${f(beyond)} more on the ${other} chart</button>` : ""}`;
    scopeBtn.hidden = false;
    scopeBtn.textContent = st.scope === "all" ? "List only what is in view" : "List everything shown";
    scopeBtn.setAttribute("aria-pressed", String(st.scope === "all"));
  }
  function writeUrl() {
    const u = new URL(location.href);
    const set = (k, v) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
    const dl = LAY.filter((l) => st.layers.includes(l)).join(",");
    set("layers", dl === DEF.join(",") ? "" : dl || "places");
    set("r", st.r.join(",")); set("k", st.k.join(",")); set("t", st.t.join(",")); set("when", st.when);
    set("chart", st.chart);
    const x = st.lead || (st.sel && byId.get(st.sel));
    set("focus", st.area && !st.sel ? `area:${st.area}` : x ? focusOf(x) : "");
    try { history.replaceState(history.state, "", u.pathname + u.search + u.hash); } catch { /* sandboxed */ }
  }
  const focusOf = (x) => (x.f ? x.f : x.k === "event" ? `event:${st.focusEv && x.evs.includes(st.focusEv) ? st.focusEv : firstEvent(x) || x.evs[0]}` : `${{ p: "place", s: "stay", x: "experience" }[x.id[0]]}:${x.id.slice(2)}`);
  const firstEvent = (x) => { if (!evData) return null; const w = win(); const e = evData.events.find((ev) => x.evs.includes(ev.id) && ev.i.some(([d]) => d >= w[0] && d <= w[1])); return e ? e.id : null; };

  const narrow = () => matchMedia("(max-width: 1279px)").matches;
  /** Bring the chart itself (not its bar) under the top bar, so a selection shows above the bottom sheet. */
  const toView = () => { const v = $(".map-view", box), r = v.getBoundingClientRect(); if (narrow() || r.top < 0 || r.bottom > innerHeight) window.scrollTo({ top: scrollY + r.top - (narrow() ? 64 : 80), behavior: still() ? "auto" : "smooth" }); };
  /* the panel: a side panel on wide screens, a bottom sheet on phones */
  let returnTo = null, lines = null;
  const loadLines = () => (lines ? Promise.resolve(lines) : app.data("map-lines.json").then((j) => (lines = j.l || {})).catch(() => ({})));
  function select(pinId, { keyboard = false, lead = null } = {}) {
    const pin = pinsById.get(pinId);
    if (!pin) return;
    if (narrow() && !st.sel) toView();
    st.sel = pinId; st.area = null;
    st.lead = lead ? byId.get(lead) || null : null;
    if (st.focusEv && !pin.members.some((m) => (m.evs || []).includes(st.focusEv))) st.focusEv = null;
    returnTo = keyboard ? document.activeElement : null;
    for (const y of rows) y.el.classList.toggle("is-sel", pin.members.includes(y));
    renderPanel(pin);
    openPanel(keyboard);
    keepAbove();
    writeUrl();
  }
  /** Phones and tablets: once the sheet is up, scroll the page so the selected buoy sits above it. */
  function keepAbove() {
    if (!narrow()) return;
    setTimeout(() => {
      const el = st.sel && box.querySelector(`.map-pins [data-pin="${CSS.escape(st.sel)}"]`);
      if (!el || panel.hidden) return;
      const over = el.getBoundingClientRect().bottom + 16 - panel.getBoundingClientRect().top;
      if (over > 0) window.scrollBy({ top: over, behavior: still() ? "auto" : "smooth" });
    }, 420);
  }
  function openPanel(focus) {
    panel.hidden = false;
    page.classList.add("has-sel");
    requestAnimationFrame(() => panel.classList.add("is-open"));
    if (focus) { const t = $("[data-panel-title]", panel); if (t) t.focus({ preventScroll: true }); }
  }
  function closePanel(restore = true) {
    st.sel = null; st.lead = null; st.area = null; st.focusEv = null;
    if (areaSel) areaSel.value = "";
    for (const y of rows) y.el.classList.remove("is-sel");
    panel.classList.remove("is-open", "is-full");
    panel.hidden = true;
    page.classList.remove("has-sel");
    writeUrl();
    if (restore && returnTo && returnTo.isConnected) returnTo.focus({ preventScroll: true });
    returnTo = null;
  }
  const head = (kicker, title, sheet, n = "", kind = "") => `<div class="map-panel-top"><button class="map-panel-grip" type="button" data-panel-grow aria-expanded="false" aria-label="Expand">${I("chev-d")}</button><button class="map-panel-x" type="button" data-panel-close aria-label="Close">${I("x")}</button></div><p class="label map-panel-k"${sheet ? ` data-sheet="${esc(sheet)}"` : ""}>${sheet ? `<svg class="bullet" aria-hidden="true"><use href="#b-${esc(sheet)}"/></svg>` : ""}<span>${esc(kicker)}</span></p><h2 tabindex="-1" data-panel-title>${n ? `<span class="map-mk mk-buoy" data-sheet="${esc(sheet)}" aria-hidden="true">${esc(n)}</span>` : kind && SYMBOL[kind] ? `<span class="map-mk mk-sym" data-sheet="${esc(sheet)}" aria-hidden="true">${I(SYMBOL[kind])}</span>` : ""}<span>${esc(title)}</span></h2>`;
  const sheetShort = (r) => { const b = $(`[data-mr="${r}"] span`, page); return b ? b.textContent : ""; };
  const sheetName = (r) => (REG.includes(r) ? `Sheet ${REG.indexOf(r) + 1}, ${sheetShort(r)}` : "");
  const star = (x) => { const kind = { p: "p", s: "s", x: "x" }[x.id[0]]; return kind ? `<button class="star" type="button" data-star="${esc(x.id.slice(2))}" data-star-kind="${kind}" aria-pressed="false" aria-label="Add “${esc(x.name)}” to My Trip">${I("star")}</button>` : ""; };
  const openLink = (x, cls = "btn btn-secondary btn-sm") => `<a class="${cls}" href="${esc(x.href)}"${x.oe ? ` data-open-event="${esc(x.oe)}"` : x.ox ? ` data-open-experience="${esc(x.ox)}"` : ""}>${x.k === "stop" ? "Getting around" : x.ox || x.oe ? "Details" : x.k === "event" ? "Place page" : "Open page"}${I("arrow-r")}</a>`;
  function renderPanel(pin) {
    const ms = pin.members.slice();
    if (st.lead && ms.includes(st.lead)) ms.sort((a, b) => (a === st.lead ? -1 : b === st.lead ? 1 : 0));
    const x = ms[0], d = directions(x.lat, x.lng), evMembers = ms.filter((m) => m.k === "event"), others = ms.slice(1).filter((m) => m.k !== "event");
    const parts = x.k === "event" ? [KIND_LABEL.event, x.mEl.textContent] : [x.meta0.split(" · ")[0], x.meta0.split(" · ").slice(1).join(" · ")];
    panel.innerHTML = `${head([parts[0], sheetName(x.r)].filter(Boolean).join(" · "), x.name, x.r, x.n, x.k)}
<p class="muted map-panel-meta">${esc(parts[1])}${x.badge ? ` ${x.badge}` : ""}</p><p class="map-panel-line" data-line></p>
<p class="btn-row map-panel-acts">${openLink(x)}${star(x)}</p><p class="btn-row map-panel-dir"><span class="label">Directions</span>${ext(d.apple, `${I("route")}Apple Maps`, "btn btn-ghost btn-sm")}${ext(d.google, `${I("route")}Google Maps`, "btn btn-ghost btn-sm")}</p>
${evMembers.length ? `<div class="map-panel-ev" data-panel-events><p class="faint">Loading what's on here…</p></div>` : ""}
${others.length ? `<h3 class="map-panel-h">Also at this spot</h3><ul class="map-panel-list">${others.map((m) => `<li>${m.n ? `<span class="map-mk mk-buoy" data-sheet="${esc(m.r)}" aria-hidden="true">${esc(m.n)}</span>` : `<span class="map-mk mk-sym" data-sheet="${esc(m.r)}" aria-hidden="true">${I(SYMBOL[m.k] || "pin")}</span>`}<span><a href="${esc(m.href)}"${m.oe ? ` data-open-event="${esc(m.oe)}"` : m.ox ? ` data-open-experience="${esc(m.ox)}"` : ""}>${esc(m.name)}</a><span class="faint">${esc(m.mEl.textContent)}</span></span>${star(m)}</li>`).join("")}</ul>` : ""}`;
    app.trip.refresh(panel);
    const lineKey = x.k === "stop" ? `t:${x.id.slice(2).split("~")[0]}` : x.id;
    loadLines().then((l) => { const el = $("[data-line]", panel); if (el && st.sel === pin.id && l[lineKey]) el.textContent = l[lineKey]; });
    if (evMembers.length) eventsHere(pin, evMembers);
  }
  async function eventsHere(pin, evMembers) {
    const boxEl = $("[data-panel-events]", panel);
    try { evData = evData || (await app.data("events.json")); } catch { if (boxEl) boxEl.innerHTML = `<p class="faint"><a href="${ROOT}whats-on.html">See What's On</a></p>`; return; }
    if (!boxEl || st.sel !== pin.id) return;
    const ids = new Set(evMembers.flatMap((m) => m.evs)), [a, b] = win(), now = app.now();
    const inst = [];
    for (const e of evData.events) if (ids.has(e.id) && e.st !== "cancelled" && e.st !== "postponed") for (const [day, s, en, f] of e.i) if ((f & 32) ? day <= b && (e.ed || day) >= a : day >= a && day <= b) inst.push({ e, day, s, en, f });
    inst.sort((p, q2) => p.s - q2.s);
    const seen = new Set(), pick = inst.filter((i) => (seen.has(i.e.id) ? false : seen.add(i.e.id)));
    const label = st.when ? { today: "Today", weekend: "This weekend", week: "The next 7 days", month: "This month" }[st.when] : "The next 30 days";
    const row = (i) => {
      const timed = !(i.f & 2) && !(i.f & 4) && !(i.f & 32);
      const [hm, ap] = timed ? fmtTime(nyParts(i.s).hhmm).split(" ") : ["", ""];
      const attrs = `data-s="${i.s}" data-e="${i.en}"${i.f & 1 ? ' data-end-unknown="1"' : ""}${i.f & 2 ? ' data-time-unknown="1"' : ""}${i.f & 4 ? ' data-all-day="1"' : ""}${i.f & 32 ? ` data-run="${esc(i.e.ed || "")}"` : ""}`;
      return `<li ${attrs}><a href="${ROOT}whats-on.html?e=${esc(i.e.id)}#e-${esc(i.e.id)}" data-open-event="${esc(i.e.id)}"><time>${hm ? `${esc(hm)}<small>${esc(ap)}</small>` : `<small>${i.f & 32 ? "Ongoing" : i.f & 4 ? "All day" : "Time not listed"}</small>`}</time><span><span class="t">${esc(i.e.t)}</span><span class="w">${esc(i.f & 32 ? fmtThrough(i.e.ed || i.day, i.day) : fmtDay(i.day))} <span data-status></span></span></span></a></li>`;
    };
    // a link to one event (focus=event:<id>) always shows that event, even when it is outside the window
    let named = "";
    const fe = st.focusEv && ids.has(st.focusEv) && !pick.some((i) => i.e.id === st.focusEv) ? evData.events.find((e) => e.id === st.focusEv) : null;
    if (fe && fe.i.length) {
      const today = nyParts(now).date, [day, s, en, f] = fe.i.find(([d, , , fl]) => (fl & 32 ? (fe.ed || d) >= today : d >= today)) || fe.i[fe.i.length - 1];
      named = `<h3 class="map-panel-h">The event in your link</h3><ol class="tonight map-panel-events">${row({ e: fe, day, s, en, f })}</ol>`;
    }
    boxEl.innerHTML = named + (pick.length
      ? `<h3 class="map-panel-h">What's on here · ${esc(label)}</h3><ol class="tonight map-panel-events">${pick.slice(0, 8).map(row).join("")}</ol>${pick.length > 8 ? `<p class="faint">${pick.length - 8} more in this window: see the place's page or What's On.</p>` : ""}`
      : `<p class="faint">Nothing listed here for ${esc(label.toLowerCase())}.</p>`);
    app.status.update(now, boxEl);
  }
  function showArea(id) {
    const a = charts && charts.areas && charts.areas[id];
    if (!a) return;
    // an area beyond the chart in use (a day trip on the bay chart): switch charts first
    const cur = map.chart === "region" ? regionMeta : bayMeta, other = map.chart === "region" ? "bay" : "region", om = other === "region" ? regionMeta : bayMeta;
    const pt = a.ll || (shown.find((x) => x.a === id) || {}).ll?.split(",").map(Number);
    if (pt && cur && om && !onMap(cur, pt[0], pt[1]) && onMap(om, pt[0], pt[1]) && !showArea.busy) {
      showArea.busy = true;
      map.setChart(other, { fit: "home" }).then(() => { showArea.busy = false; paintControls(); showArea(id); });
      return;
    }
    const inArea = shown.filter((x) => x.a === id), mt = map.chart && (map.chart === "bay" ? bayMeta : regionMeta);
    const on = inArea.filter((x) => mt && onMap(mt, x.lat, x.lng));
    if (on.length) map.fit(on.map((x) => ({ lat: x.lat, lng: x.lng })));
    else if (a.ll) map.fit([{ lat: a.ll[0], lng: a.ll[1] }]);
    const by = {}; for (const x of inArea) by[x.sec] = (by[x.sec] || 0) + 1;
    panel.innerHTML = `${head([a.k || "Area", sheetName(a.r)].filter(Boolean).join(" · "), a.n, a.r)}<p class="map-panel-line" data-line></p><p class="muted">${esc(Object.entries(by).map(([k, n]) => plural(n, SEC_NOUN[k])).join(" · ") || "Nothing shown here with the layers you have on.")}</p><p class="btn-row map-panel-acts"><a class="btn btn-secondary btn-sm" href="${ROOT}areas/${esc(id)}.html">Area page${I("arrow-r")}</a></p>`;
    loadLines().then((l) => { const el = $("[data-line]", panel); if (el && st.area === id && l[`a:${id}`]) el.textContent = l[`a:${id}`]; });
    openPanel(false);
  }

  /* events: controls, list ↔ chart, panel */
  page.addEventListener("click", (e) => {
    const lb = e.target.closest("button[data-layer]");
    if (lb) { const l = lb.dataset.layer; st.layers = st.layers.includes(l) ? st.layers.filter((x) => x !== l) : [...st.layers, l]; st.pinned = null; apply(); return; }
    const rb = e.target.closest("[data-mr]");
    if (rb) { const r = rb.dataset.mr; st.r = st.r.includes(r) ? st.r.filter((x) => x !== r) : [...st.r, r]; st.pinned = null; autoChart(); apply(); fitShown(); return; }
    const kb = e.target.closest("[data-mk]");
    if (kb) { const k = kb.dataset.mk; st.k = st.k.includes(k) ? st.k.filter((x) => x !== k) : [...st.k, k]; apply(); return; }
    const wb = e.target.closest("[data-mw]");
    if (wb) { st.when = wb.dataset.mw; apply(); if (st.sel) { const p = pinsById.get(st.sel); if (p) renderPanel(p); } return; }
    const cb = e.target.closest("button[data-chart], [data-to-chart]");
    if (cb && !cb.disabled) { toChart(cb.dataset.chart || cb.dataset.toChart, true); return; }
    if (e.target.closest("[data-map-reset]")) { st.r = []; st.k = []; st.t = []; st.when = ""; st.pinned = null; autoChart(); apply(); return; }
    if (e.target.closest("[data-map-scope]")) { st.scope = st.scope === "all" ? "view" : "all"; st.more.clear(); paintList(); return; }
    const mb = e.target.closest("[data-more]");
    if (mb) { const s = mb.dataset.more; if (st.more.has(s)) st.more.delete(s); else st.more.add(s); paintList(); return; }
    const sh = e.target.closest("[data-show]");
    if (sh) {
      const x = byId.get(sh.dataset.show), pid = x && pinOfRow.get(x.id);
      if (!pid) return;
      if (map.select(pid, { zoom: true })) { select(pid, { keyboard: e.detail === 0, lead: x.id }); toView(); }
      return;
    }
    if (e.target.closest("[data-panel-close]")) { closePanel(); return; }
    const grow = e.target.closest("[data-panel-grow]");
    if (grow) { const full = panel.classList.toggle("is-full"); grow.setAttribute("aria-expanded", String(full)); grow.setAttribute("aria-label", full ? "Collapse" : "Expand"); }
  });
  if (topicSel) topicSel.addEventListener("change", () => { st.t = topicSel.value ? [topicSel.value] : []; apply(); });
  if (areaSel) areaSel.addEventListener("change", () => {
    const id = areaSel.value;
    if (!id) return;
    if (st.sel) { st.sel = null; st.lead = null; for (const y of rows) y.el.classList.remove("is-sel"); }
    st.area = id; st.focusEv = null;
    showArea(id); writeUrl();
    if (narrow()) toView();
  });
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); closePanel(); } });
  list.addEventListener("pointerover", (e) => { const li = e.target.closest("li.map-li[data-id]"); map.highlight(li ? pinOfRow.get(li.dataset.id) : null); });
  list.addEventListener("pointerleave", () => map.highlight(null));
  list.addEventListener("focusin", (e) => { const li = e.target.closest("li.map-li[data-id]"); map.highlight(li ? pinOfRow.get(li.dataset.id) : null); });

  /* the two charts: the region chart when only Day Trips are asked for, or a focus lies beyond the bay chart */
  const onlyRegion = (x) => bayMeta && !onMap(bayMeta, x.lat, x.lng) && regionMeta && onMap(regionMeta, x.lat, x.lng);
  function autoChart() {
    if (st.chart) return;
    const want = st.r.length && st.r.every((r) => r === "daytrips") ? "region" : "bay";
    if (want !== map.chart) map.setChart(want, { fit: "pins" }).then(() => paintControls());
  }
  function toChart(id, byUser) {
    if (byUser) st.chart = id === "bay" ? "" : id;
    map.setChart(id, { fit: st.sel ? "home" : "pins", keep: !st.r.length }).then((ok) => { if (ok && st.sel) map.select(st.sel, { zoom: true }); paintControls(); writeUrl(); });
  }
  function fitShown() {
    if (!st.r.length) return;
    const mt = map.chart === "region" ? regionMeta : bayMeta;
    const pts = shown.filter((x) => mt && onMap(mt, x.lat, x.lng)).map((x) => ({ lat: x.lat, lng: x.lng }));
    if (pts.length) setTimeout(() => map.fit(pts), 60);
  }

  // live rings: a place with an event on now (both ends listed)
  async function liveNow() {
    if (!st.layers.includes("events")) return;
    try { evData = evData || (await app.data("events.json")); } catch { return; }
    const now = app.now(), next = new Set();
    for (const e of evData.events) {
      if (e.st === "cancelled" || e.st === "postponed") continue;
      const x = evRow.get(e.id);
      if (x && e.i.some(([, s, en, f]) => !(f & 39) && s <= now && now < en)) next.add(x.id);
    }
    const changed = next.size !== live.size || [...next].some((x) => !live.has(x));
    live = next;
    if (changed) apply(false);
  }

  getJSON("map-charts.json").then((c) => {
    charts = c;
    bayMeta = c.bay ? metaOf(c.bay) : null; regionMeta = c.region ? metaOf(c.region) : null;
    const want = st.chart || ((st.r.length && st.r.every((r) => r === "daytrips")) || (focusRow && onlyRegion(focusRow)) ? "region" : "bay");
    apply(false);
    const go = () => {
      if (map.chart === null || map.chart === undefined) { setTimeout(go, 60); return; }
      const after = () => {
        paintControls();
        if (focusRow) { const pid = pinOfRow.get(focusRow.id); if (pid && map.select(pid, { zoom: true })) { select(pid, { lead: focusRow.id }); if (narrow()) requestAnimationFrame(toView); } }
        else if (st.area) showArea(st.area);
        else fitShown();
      };
      if (want !== map.chart) map.setChart(want, { fit: "pins" }).then(after); else after();
    };
    go();
  }).catch(() => apply(false));
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 800));
  idle(() => { liveNow(); app.onTick(() => { liveNow(); }, { immediate: false }); });
  // a new day changes the "What's on" window: re-apply when the date turns
  let day = app.today();
  app.onTick(() => { const d = app.today(); if (d !== day) { day = d; apply(false); } }, { immediate: false });
}

/* ---------- area pages: "What's on here" follows the clock (the next 60 days, never past the guide's last day), in
   the order of each listing's next day from today; past 12 rows, "Show all n" ---------- */
const AREA_CAP = 12;
function areaEvents(app, box) {
  const list = $("ol", box), rows = $$("li[data-ev]", box), empty = $("[data-ev-empty]", box), count = $("[data-ev-count]", box);
  const end = box.dataset.windowEnd || "";
  let all = false;
  const more = document.createElement("p");
  more.className = "ar-link ar-evmore";
  more.innerHTML = `<button class="btn btn-secondary btn-sm" type="button" aria-expanded="false"></button>`;
  more.hidden = true;
  if (list) list.after(more);
  const btn = $("button", more);
  const info = rows.map((li) => {
    const days = (li.dataset.days || "").split(" ").filter(Boolean), run = li.dataset.runTo ? [li.dataset.runFrom, li.dataset.runTo] : null;
    return { li, days, run, hm: li.dataset.s ? nyParts(+li.dataset.s).hhmm : "99:99" };
  });
  const paint = () => {
    const a = app.today(), b0 = addDays(a, 59), b = end && end < b0 ? end : b0;
    const ok = [];
    for (const x of info) {
      const on = evIn({ days: x.days, runs: x.run ? [x.run] : [] }, a, b);
      x.li.hidden = true;
      if (!on) continue;
      x.next = x.run ? (x.run[0] > a ? x.run[0] : a) : x.days.find((d) => d >= a) || "";
      ok.push(x);
    }
    ok.sort((p, q) => (p.next < q.next ? -1 : p.next > q.next ? 1 : (p.run ? 0 : 1) - (q.run ? 0 : 1) || (p.hm < q.hm ? -1 : p.hm > q.hm ? 1 : 0)));
    if (list) for (const x of ok) list.appendChild(x.li);
    ok.forEach((x, i) => { x.li.hidden = !all && i >= AREA_CAP; });
    more.hidden = ok.length <= AREA_CAP;
    btn.textContent = all ? `Show the first ${AREA_CAP}` : `Show all ${ok.length} events`;
    btn.setAttribute("aria-expanded", String(all));
    if (empty) empty.hidden = ok.length > 0;
    if (count) count.textContent = end && a > end ? `This guide lists events through ${fmtDate(end)}, ${end.slice(0, 4)}.` : ok.length ? `${ok.length} ${ok.length === 1 ? "event" : "events"} from ${fmtDate(a)} to ${fmtDate(b)}${b < b0 ? ", the last day this guide lists" : ""}` : "";
  };
  btn.addEventListener("click", () => { all = !all; paint(); if (!all && list) list.scrollIntoView({ block: "nearest" }); });
  paint();
  app.status.update(app.now(), box);
  let day = app.today();
  app.onTick(() => { const d = app.today(); if (d !== day) { day = d; paint(); } }, { immediate: false });
}
