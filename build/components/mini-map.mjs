/* ============================================================
   build/components/mini-map.mjs · OWNER: E1 (engine; ported from Cincy Week's venue-card mini map).
   The Map lane may extend it additively. Reads data/map.json (written with site/map/basemap.svg by the
   basemap agent; shape in build/CONTRACTS.md §5). Without map.json or the basemap, every map renders an
   honest coordinate line instead, and nothing fails.

   makeMiniMaps(ctx) → {
     miniMap(root, lat, lng, { sheet, n, label, halfWidthM = 900 })
         .mini-map: <svg viewBox="{crop}"><use href="{root}assets/map/basemap.svg#bm"/></svg> + up to three basemap
         labels + one .pin[data-sheet]. Plain SVG, no JS. No coordinates → p.unk "Not on the map: no coordinates
         listed"; no basemap or off it → p.coord-line with the coordinates ("27.9506° N, 82.4572° W").
     areaMap(root, [{ lat, lng, kind, sheet, n }], { label, minHalfM, center, ratio, cls })
         a static crop that fits several points, one pin each ("" without a basemap)
     coordLine(lat, lng) → p.coord-line (always works)
     directions(lat, lng, { mode }) → { apple, google }   mode "walking" | "driving" | "transit" | null (the reader picks)
     directionsTo(record) → { apple|null, google } by coordinates, else by the street address (Google only), else null
     where(record) → "on" | "off" (no basemap, or outside it) | "none" (no coordinates)
     mapStatus(record) → the honest badge ("Not on the map") or ""
     nearbyOf(lat, lng, meters, opts) → db.nearby plus distance labels: [{ kind, rec, d, label }]
     distLabel(meters) → "350 m" | "1.2 mi" (straight-line distance; always labeled as such by pages)
     meta → the projection (lib/geo.js metaOf(data/map.json)) or null
     --- added by the Map lane (additive, 2026-09-27) ---
     charts → { bay: { meta, labels, file: "basemap.svg" } | null, region: { … file: "region.svg" } | null }
              the two charts of data/map.json (the bay chart, and `region`: the whole guide box, site/map/region.svg)
     chartOf(points) → "bay" | "region" | null: the chart that holds every point with coordinates (bay first)
     chartMap(root, points, { chart = "auto", label, minHalfM = 900, ratio = 4 / 3 | "auto", cls, labels = 3, whole = false, grid = true })
         a static crop (no JS) of that chart fitting every point: .mini-map.chart-map[data-chart] > <svg> with
         <use href="…#bm"/> (+ the graticule lines <use href="…#bm-grid"/>), up to `labels` basemap labels clear of the
         pins, and one .pin.pin-{kind}[data-sheet] per point ({ lat, lng, kind = "place", sheet, n, ic, title }): the
         number n, or the icon ic; points closer than 26px at refW share a .pin-cluster medallion with their count. whole: the full chart with the neatline margin and its minute ticks (bm-grid).
         bare: only the inner markup (svg.map-base, labels, pins), for a container of the caller's.
         "" when no chart holds a point (callers print the honest line). Points off the chosen chart are dropped.
   }
   ============================================================ */
import { existsSync, readFileSync } from "node:fs";
import { esc, attr } from "../core/util.mjs";
import { icon } from "../core/icons.mjs";
import { metaOf, crop, onMap, project, cluster } from "../../site/js/lib/geo.js";

const REGION_SVG = new URL("../../site/map/region.svg", import.meta.url), BAY_SVG = new URL("../../site/map/basemap.svg", import.meta.url);
/** Does a chart file carry its graticule group (#bm-grid)? (A basemap without one gets no graticule lines.) */
const hasGrid = (u) => { try { return /\sid="bm-grid"/.test(readFileSync(u, "utf8")); } catch { return false; } };

export function makeMiniMaps(ctx) {
  const { db, c } = ctx;
  const meta = db.basemap ? metaOf(db.map) : null;

  const directions = (lat, lng, { mode = null } = {}) => ({
    apple: `https://maps.apple.com/?daddr=${lat},${lng}${mode === "walking" ? "&dirflg=w" : mode === "driving" ? "&dirflg=d" : mode === "transit" ? "&dirflg=r" : ""}`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${mode ? `&travelmode=${mode}` : ""}`,
  });
  function directionsTo(r, { mode = null } = {}) {
    const ll = r.ll || (r.lat != null && r.lng != null ? [r.lat, r.lng] : null);
    if (ll) return directions(ll[0], ll[1], { mode });
    if (!r.address) return null;
    const q = encodeURIComponent([r.address, r.city, r.state].filter(Boolean).join(", "));
    return { apple: null, google: `https://www.google.com/maps/dir/?api=1&destination=${q}${mode ? `&travelmode=${mode}` : ""}` };
  }
  const llOf = (r) => r.ll || (r.lat != null && r.lng != null ? [r.lat, r.lng] : null);
  const where = (r) => { const ll = llOf(r); return !ll ? "none" : onMap(meta, ll[0], ll[1]) ? "on" : "off"; };
  function mapStatus(r) {
    const w = where(r);
    if (w === "on" || (w === "off" && !meta)) return "";
    if (w === "off") return c.badge("out", "Outside the map area");
    return c.badge("unconfirmed", r.address ? "Not on the map" : "Address not listed · not on the map");
  }
  const fmtCoord = (lat, lng) => `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng < 0 ? "W" : "E"}`;
  const coordLine = (lat, lng) => `<p class="coord-line"><svg class="i" aria-hidden="true"><use href="#i-pin"/></svg><span>${esc(fmtCoord(lat, lng))}</span></p>`;
  const distLabel = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1609.344).toFixed(1)} mi`);
  const nearbyOf = (lat, lng, meters = 800, opts) => db.nearby(lat, lng, meters, opts).map((x) => ({ ...x, label: distLabel(x.d) }));

  /** Up to three basemap labels inside a crop, clear of the pin and of each other (positions in percent). */
  const LABELS = (db.map && db.map.labels) || [];
  const LABEL_PRI = { park: 0, street: 1, hood: 2, water: 3, bridge: 4 };
  function cropLabels(vb, px, py) {
    if (!meta) return "";
    const [x0, y0, w, h] = vb, out = [];
    const cands = LABELS.filter((l) => LABEL_PRI[l.kind] != null && typeof l.text === "string").map((l) => {
      const x = (((l.lng - meta.bbox.w) * meta.k * meta.sx - x0) / w) * 100, y = (((meta.bbox.n - l.lat) * meta.sx - y0) / h) * 100;
      const len = (l.text.length * (l.kind === "hood" ? 8.4 : 6.6)) / 2, a = ((l.angle || 0) * Math.PI) / 180;
      const half = ((len * Math.abs(Math.cos(a)) + 8 * Math.abs(Math.sin(a))) / 240) * 100 + 3;
      const halfY = ((len * Math.abs(Math.sin(a)) + 8 * Math.abs(Math.cos(a))) / 180) * 100 + 3;
      return { l, x, y, half, halfY };
    }).filter((q) => q.x - q.half > 1 && q.x + q.half < 99 && q.y - q.halfY > 1 && q.y + q.halfY < 99 && Math.hypot(q.x - px, (q.y - py) * 0.75) > 16)
      .sort((a, b) => LABEL_PRI[a.l.kind] - LABEL_PRI[b.l.kind]);
    for (const q of cands) {
      if (out.length >= 3) break;
      if (out.some((o) => Math.abs(o.y - q.y) < o.halfY + q.halfY && Math.abs(o.x - q.x) < o.half + q.half)) continue;
      if (out.some((o) => o.l.text === q.l.text)) continue;
      out.push(q);
    }
    return out.map((q) => `<span class="map-label ${q.l.kind}" style="left: ${q.x.toFixed(1)}%; top: ${q.y.toFixed(1)}%${q.l.angle ? `; --a: ${q.l.angle}deg` : ""}">${esc(q.l.text)}</span>`).join("");
  }

  function miniMap(root, lat, lng, { sheet = null, n = "", label = "", halfWidthM = 900 } = {}) {
    if (lat == null || lng == null) return `<p class="unk mini-map-none">Not on the map: no coordinates listed</p>`;
    const cr = meta && crop(lat, lng, meta, { halfWidthM });
    if (!cr) return coordLine(lat, lng);
    return `<div class="mini-map"${label ? ` role="img" aria-label="${attr(label)}"` : ""}><svg viewBox="${cr.vb.join(" ")}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><use href="${root}assets/map/basemap.svg#bm"/></svg><span class="mini-labels" aria-hidden="true">${cropLabels(cr.vb, cr.px, cr.py)}</span><span class="pin pin-place"${sheet ? ` data-sheet="${attr(sheet)}"` : ""} style="left: ${cr.px}%; top: ${cr.py}%"><span>${esc(n)}</span></span></div>`;
  }

  function areaMap(root, points, { label = "", minHalfM = 900, center = null, ratio = 4 / 3, cls = "" } = {}) {
    if (!meta) return "";
    const pts = points.filter((p) => onMap(meta, p.lat, p.lng)).map((p) => ({ ...p, xy: [(p.lng - meta.bbox.w) * meta.k * meta.sx, (meta.bbox.n - p.lat) * meta.sx] }));
    const ctr = center && onMap(meta, center.lat, center.lng) ? [(center.lng - meta.bbox.w) * meta.k * meta.sx, (meta.bbox.n - center.lat) * meta.sx] : null;
    if (!pts.length && !ctr) return "";
    const xs = [...pts.map((p) => p.xy[0]), ...(ctr ? [ctr[0]] : [])], ys = [...pts.map((p) => p.xy[1]), ...(ctr ? [ctr[1]] : [])];
    const minU = (2 * minHalfM) / meta.mPerUnit, pad = 28;
    let x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
    let w = Math.max(x1 - x0, minU), hh = Math.max(y1 - y0, minU / ratio);
    if (w / hh > ratio) hh = w / ratio; else w = hh * ratio;
    w = Math.min(w, meta.W); hh = Math.min(hh, meta.H);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    x0 = Math.min(Math.max(0, cx - w / 2), meta.W - w); y0 = Math.min(Math.max(0, cy - hh / 2), meta.H - hh);
    const pct = (v, a, b) => (((v - a) / b) * 100).toFixed(2);
    const pin = (p) => `<span class="pin pin-${attr(p.kind || "place")}"${p.sheet ? ` data-sheet="${attr(p.sheet)}"` : ""} style="left: ${pct(p.xy[0], x0, w)}%; top: ${pct(p.xy[1], y0, hh)}%"><span>${p.n != null ? esc(p.n) : ""}</span></span>`;
    return `<div class="mini-map area-map${cls ? " " + cls : ""}" style="--map-ratio: ${w.toFixed(1)} / ${hh.toFixed(1)}"${label ? ` role="img" aria-label="${attr(label)}"` : ""}><svg viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${hh.toFixed(1)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><use href="${root}assets/map/basemap.svg#bm"/></svg>${pts.map(pin).join("")}</div>`;
  }

  /* ---------- the two charts, and a static crop of either (the Map lane) ---------- */
  const regionMeta = meta && db.map.region && existsSync(REGION_SVG) ? metaOf(db.map.region) : null;
  const charts = {
    bay: meta ? { id: "bay", meta, labels: LABELS, file: "basemap.svg", grid: hasGrid(BAY_SVG) } : null,
    region: regionMeta ? { id: "region", meta: regionMeta, labels: db.map.region.labels || [], file: "region.svg", grid: hasGrid(REGION_SVG) } : null,
  };
  function chartOf(points) {
    const pts = points.filter((p) => p.lat != null && p.lng != null);
    for (const id of ["bay", "region"]) { const ch = charts[id]; if (ch && pts.length && pts.every((p) => onMap(ch.meta, p.lat, p.lng))) return id; }
    return null;
  }
  // land names wide, water names in italic: rough widths (px at 12px) to keep labels clear of pins and each other
  const LABEL_KINDS = { water: 0, city: 1, town: 2, beach: 3, island: 3, hood: 4, area: 5, park: 6 };
  function chartMap(root, points, { chart = "auto", label = "", minHalfM = 900, ratio: ratio0 = 4 / 3, cls = "", labels = 3, whole = false, grid = true, refW = 640, bare = false } = {}) {
    const id = chart === "auto" ? chartOf(points) || (charts.bay && points.some((p) => onMap(meta, p.lat, p.lng)) ? "bay" : null) : chart;
    const ch = id && charts[id];
    if (!ch) return "";
    const M = ch.meta, pts = points.filter((p) => onMap(M, p.lat, p.lng)).map((p) => ({ ...p, xy: project(p.lat, p.lng, M) }));
    let ratio = ratio0 === "auto" && whole ? M.W / M.H : ratio0;
    let x0, y0, w, hh, mg = 0;
    if (whole) { mg = 24; x0 = -mg; y0 = -mg; w = M.W + 2 * mg; hh = M.H + 2 * mg; }
    else {
      if (!pts.length) return "";
      const xs = pts.map((p) => p.xy[0]), ys = pts.map((p) => p.xy[1]);
      const minU = (2 * minHalfM) / M.mPerUnit, pad = Math.max(300 / M.mPerUnit, 0.12 * Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
      // ratio "auto": the points' own shape (a long beach strip gets a tall chart), between 0.6 and 1.9
      if (ratio === "auto") ratio = Math.min(1.9, Math.max(0.6, (Math.max(...xs) - Math.min(...xs) + 2 * pad) / Math.max(1, Math.max(...ys) - Math.min(...ys) + 2 * pad)));
      x0 = Math.min(...xs) - pad; y0 = Math.min(...ys) - pad;
      w = Math.max(Math.max(...xs) + pad - x0, minU); hh = Math.max(Math.max(...ys) + pad - y0, minU / ratio);
      if (w / hh > ratio) hh = w / ratio; else w = hh * ratio;
      if (w > M.W) { w = M.W; hh = w / ratio; } if (hh > M.H) { hh = M.H; w = hh * ratio; }
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      x0 = Math.min(Math.max(0, cx - w / 2), M.W - w); y0 = Math.min(Math.max(0, cy - hh / 2), M.H - hh);
      // a buoy is drawn above its point: keep the top one inside the frame
      const top = (Math.min(...ys) - y0) / hh;
      if (top < 0.14) y0 = Math.max(0, y0 - (0.14 - top) * hh);
    }
    const px = (v) => (((v - x0) / w) * 100), py = (v) => (((v - y0) / hh) * 100);
    const f2 = (v) => v.toFixed(2);
    // places too close to tell apart at this size share a medallion with their count (the lists name them)
    const groups = whole ? pts.map((p) => ({ members: [{ p }] })) : cluster(pts.map((p) => ({ p, x: (px(p.xy[0]) / 100) * refW, y: (py(p.xy[1]) / 100) * (refW / ratio) })), 26);
    const med = (g) => { const ms = g.members.map((m) => m.p), x = ms.reduce((a, m) => a + m.xy[0], 0) / ms.length, y = ms.reduce((a, m) => a + m.xy[1], 0) / ms.length; return `<span class="pin pin-cluster" style="left: ${f2(px(x))}%; top: ${f2(py(y))}%" title="${attr(ms.some((m) => m.n != null) ? `Nos. ${ms.map((m) => m.n).filter((n) => n != null).join(", ")}` : `${ms.length} places`)}"><span>${ms.length}</span></span>`; };
    const pin = (p) => `<span class="pin pin-${attr(p.kind || "place")}"${p.sheet ? ` data-sheet="${attr(p.sheet)}"` : ""} style="left: ${f2(px(p.xy[0]))}%; top: ${f2(py(p.xy[1]))}%"${p.title ? ` title="${attr(p.title)}"` : ""}><span>${p.n != null ? esc(p.n) : p.ic ? icon(p.ic) : ""}</span></span>`;
    // labels: the chart's own names inside the crop, clear of the pins and of each other (estimates at refW px)
    const out = [];
    if (labels) {
      const cand = (ch.labels || []).filter((l) => LABEL_KINDS[l.kind] != null && typeof l.text === "string")
        .map((l) => { const [x, y] = project(l.lat, l.lng, M); return { l, x: px(x), y: py(y) }; })
        .filter((q) => q.x > 0 && q.x < 100 && q.y > 0 && q.y < 100)
        .sort((a, b) => LABEL_KINDS[a.l.kind] - LABEL_KINDS[b.l.kind] || (a.l.minZoom || 9) - (b.l.minZoom || 9));
      for (const q of cand) {
        if (out.length >= labels) break;
        const wpx = q.l.text.length * (q.l.kind === "water" ? 7.4 : 9.6) + 8;
        const half = ((wpx / 2) / refW) * 100, halfY = (11 / (refW / ratio)) * 100;
        if (q.x - half < 2 || q.x + half > 98 || q.y - halfY < 3 || q.y + halfY > 97) continue;
        if (pts.some((p) => Math.abs(px(p.xy[0]) - q.x) < half + 4 && py(p.xy[1]) - q.y < halfY + 9 && q.y - py(p.xy[1]) < halfY + 3)) continue;
        if (out.some((o) => Math.abs(o.x - q.x) < o.half + half + 1 && Math.abs(o.y - q.y) < o.halfY + halfY + 1)) continue;
        out.push({ ...q, half, halfY });
      }
    }
    const lab = out.map((q) => `<span class="map-label ${q.l.kind}" style="left: ${f2(q.x)}%; top: ${f2(q.y)}%${q.l.angle ? `; --a: ${q.l.angle}deg` : ""}">${esc(q.l.text)}</span>`).join("");
    const href = `${root}assets/map/${ch.file}`;
    const vb = [x0, y0, w, hh].map((v) => v.toFixed(1)).join(" ");
    const inner = whole
      ? `<rect x="${x0}" y="${y0}" width="${w}" height="${hh}" style="fill:var(--surface)"/><svg x="0" y="0" width="${M.W}" height="${M.H}" viewBox="0 0 ${M.W} ${M.H}"><use href="${href}#bm"/></svg>${grid && ch.grid ? `<use href="${href}#bm-grid"/>` : ""}`
      : `<use href="${href}#bm"/>${grid && ch.grid ? `<use href="${href}#bm-grid"/>` : ""}`;
    const body = `<svg class="map-base" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${inner}</svg><span class="mini-labels" aria-hidden="true">${lab}</span>${groups.map((g) => (g.members.length > 1 ? med(g) : pin(g.members[0].p))).join("")}`;
    if (bare) return body;
    return `<div class="mini-map chart-map${cls ? " " + cls : ""}" data-chart="${id}" style="--map-ratio: ${w.toFixed(1)} / ${hh.toFixed(1)}; --map-ar: ${(w / hh).toFixed(3)}"${label ? ` role="img" aria-label="${attr(label)}"` : ""}>${body}</div>`;
  }

  return { miniMap, areaMap, coordLine, directions, directionsTo, where, mapStatus, nearbyOf, distLabel, meta, charts, chartOf, chartMap };
}
