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
     chartMap(root, points, { chart = "auto", label, minHalfM = 900, ratio = 4 / 3 | "auto", cls, labels = 3, whole = false, grid = true,
                              refW = 640, clusterPx = 26 (0 when whole), lifts = true })
         a static crop (no JS) of that chart fitting every point: .mini-map.chart-map[data-chart] > <svg> with
         <use href="…#bm"/> (+ the graticule lines <use href="…#bm-grid"/>), up to `labels` basemap labels clear of the
         pins, and one .pin.pin-{kind}[data-sheet] per point ({ lat, lng, kind = "place", sheet, n, ic, title }): the
         number n, or the icon ic. Estimates are made at refW px wide (pass the narrowest width the chart is shown at):
         points closer than clusterPx share a .pin-cluster medallion with their count (0: never); a buoy that would
         still cover another's number is lifted on a longer stem ([data-lift="1|2"], style --lift: 26px | 52px; the
         CSS is in 51-map-page.css). whole: the full chart with the neatline margin and its minute ticks (bm-grid).
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
  /** Medallions whose centers end up closer than d px (cluster() seeds groups, then centers them on their members)
   *  merge, so no medallion hides another; two lone buoys are left to the lifts. */
  function mergeNear(groups, d) {
    const gs = groups.map((g) => ({ members: g.members.slice() }));
    const ctr = (g) => [g.members.reduce((a, m) => a + m.x, 0) / g.members.length, g.members.reduce((a, m) => a + m.y, 0) / g.members.length];
    for (let again = true; again;) {
      again = false;
      outer: for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) {
        if (gs[i].members.length + gs[j].members.length < 3) continue;
        const [ax, ay] = ctr(gs[i]), [bx, by] = ctr(gs[j]);
        if (Math.hypot(ax - bx, ay - by) < d) { gs[i].members.push(...gs[j].members); gs.splice(j, 1); again = true; break outer; }
      }
    }
    return gs;
  }
  // land names wide, water names in italic: rough widths (px per character, measured on the rendered labels) to keep
  // labels clear of pins and of each other
  const LABEL_KINDS = { water: 0, city: 1, town: 2, beach: 3, island: 3, hood: 4, area: 5, park: 6 };
  const LABEL_W = { water: 9.4, city: 11.6, park: 7.4 };
  function chartMap(root, points, { chart = "auto", label = "", minHalfM = 900, ratio: ratio0 = 4 / 3, cls = "", labels = 3, whole = false, grid = true, refW = 640, bare = false, clusterPx = null, lifts = true } = {}) {
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
    // everything below is estimated at refW px wide (the narrowest width the caller expects the chart to be shown at)
    const RW = refW, RH = refW / ratio, X = (p) => (px(p.xy[0]) / 100) * RW, Y = (p) => (py(p.xy[1]) / 100) * RH;
    // places too close to tell apart at this size share a medallion with their count (the lists name them)
    const cr = clusterPx ?? (whole ? 0 : 26);
    const groups = cr > 0 ? mergeNear(cluster(pts.map((p) => ({ p, x: X(p), y: Y(p) })), cr), 36) : pts.map((p) => ({ members: [{ p }] }));
    // a buoy drawn over another one's number is lifted on a longer stem (up to two steps), so every number stays
    // readable: southern buoys are placed first, each northern neighbor takes the step that covers the least (a number
    // or a medallion weighs 10, another buoy's position circle 1, a body cut off by the top of the frame 5)
    const STEP = 26, hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    const meds = groups.filter((g) => g.members.length > 1).map((g) => { const ms = g.members.map((m) => m.p); return { ms, xy: [ms.reduce((a, m) => a + m.xy[0], 0) / ms.length, ms.reduce((a, m) => a + m.xy[1], 0) / ms.length] }; });
    const singles = groups.filter((g) => g.members.length === 1).map((g) => g.members[0].p);
    const lift = new Map();
    let boxes = [];
    const place = () => {
      const solid = meds.map((m) => { const x = (px(m.xy[0]) / 100) * RW, y = (py(m.xy[1]) / 100) * RH; return [x - 23, y - 23, x + 23, y + 23]; });
      const dots = singles.map((p) => ({ p, b: [X(p) - 6, Y(p) - 6, X(p) + 6, Y(p) + 6] }));
      for (const p of [...singles].sort((a, b) => Y(b) - Y(a))) {
        const hw = Math.max(15, String(p.n ?? "").length * 4 + 9), x = X(p), y = Y(p);
        let best = 0, bestW = Infinity, bestBox = null;
        for (let L = 0; L <= (lifts ? 2 : 0); L++) {
          const box = [x - hw, y - 48 - L * STEP, x + hw, y - 16 - L * STEP];
          const wgt = 10 * solid.filter((b) => hit(box, b)).length + dots.filter((d) => d.p !== p && hit(box, d.b)).length + (box[1] < 2 ? 5 : 0) + L * 0.5;
          if (wgt < bestW) { best = L; bestW = wgt; bestBox = box; }
        }
        lift.set(p, best); solid.push(bestBox);
      }
      boxes = [...solid, ...dots.map((d) => d.b)];
    };
    place();
    // a crop (not the whole chart) moves up when a lifted buoy would be cut off by its top edge
    const minTop = Math.min(Infinity, ...boxes.map((b) => b[1]));
    if (!whole && minTop < 4 && y0 > 0) { y0 = Math.max(0, y0 - ((4 - minTop) / RH) * hh); place(); }
    const med = (m) => `<span class="pin pin-cluster" style="left: ${f2(px(m.xy[0]))}%; top: ${f2(py(m.xy[1]))}%" title="${attr(m.ms.some((x) => x.n != null) ? `Nos. ${m.ms.map((x) => x.n).filter((n) => n != null).join(", ")}` : `${m.ms.length} places`)}"><span>${m.ms.length}</span></span>`;
    const pin = (p) => { const L = lift.get(p) || 0; return `<span class="pin pin-${attr(p.kind || "place")}"${p.sheet ? ` data-sheet="${attr(p.sheet)}"` : ""}${L ? ` data-lift="${L}"` : ""} style="left: ${f2(px(p.xy[0]))}%; top: ${f2(py(p.xy[1]))}%${L ? `; --lift: ${L * STEP}px` : ""}"${p.title ? ` title="${attr(p.title)}"` : ""}><span>${p.n != null ? esc(p.n) : p.ic ? icon(p.ic) : ""}</span></span>`; };
    // labels: the chart's own names inside the crop, clear of the buoys, medallions and each other
    const out = [];
    if (labels) {
      const cand = (ch.labels || []).filter((l) => LABEL_KINDS[l.kind] != null && typeof l.text === "string")
        .map((l) => { const [x, y] = project(l.lat, l.lng, M); return { l, x: px(x), y: py(y) }; })
        .filter((q) => q.x > 0 && q.x < 100 && q.y > 0 && q.y < 100)
        .sort((a, b) => LABEL_KINDS[a.l.kind] - LABEL_KINDS[b.l.kind] || (a.l.minZoom || 9) - (b.l.minZoom || 9));
      for (const q of cand) {
        if (out.length >= labels) break;
        const wpx = q.l.text.length * (LABEL_W[q.l.kind] || 11.2) + 10, x = (q.x / 100) * RW, y = (q.y / 100) * RH;
        const box = [x - wpx / 2, y - 10, x + wpx / 2, y + 10];
        if (box[0] < 6 || box[2] > RW - 6 || box[1] < 6 || box[3] > RH - 6) continue;
        if (boxes.some((b) => hit(box, b))) continue;
        boxes.push(box);
        out.push(q);
      }
    }
    const lab = out.map((q) => `<span class="map-label ${q.l.kind}" style="left: ${f2(q.x)}%; top: ${f2(q.y)}%${q.l.angle ? `; --a: ${q.l.angle}deg` : ""}">${esc(q.l.text)}</span>`).join("");
    const href = `${root}assets/map/${ch.file}`;
    const vb = [x0, y0, w, hh].map((v) => v.toFixed(1)).join(" ");
    const inner = whole
      ? `<rect x="${x0}" y="${y0}" width="${w}" height="${hh}" style="fill:var(--surface)"/><svg x="0" y="0" width="${M.W}" height="${M.H}" viewBox="0 0 ${M.W} ${M.H}"><use href="${href}#bm"/></svg>${grid && ch.grid ? `<use href="${href}#bm-grid"/>` : ""}`
      : `<use href="${href}#bm"/>${grid && ch.grid ? `<use href="${href}#bm-grid"/>` : ""}`;
    const body = `<svg class="map-base" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${inner}</svg><span class="mini-labels" aria-hidden="true">${lab}</span>${groups.map((g) => (g.members.length > 1 ? med(meds.find((m) => m.ms[0] === g.members[0].p)) : pin(g.members[0].p))).join("")}`;
    if (bare) return body;
    return `<div class="mini-map chart-map${cls ? " " + cls : ""}" data-chart="${id}" style="--map-ratio: ${w.toFixed(1)} / ${hh.toFixed(1)}; --map-ar: ${(w / hh).toFixed(3)}"${label ? ` role="img" aria-label="${attr(label)}"` : ""}>${body}</div>`;
  }

  return { miniMap, areaMap, coordLine, directions, directionsTo, where, mapStatus, nearbyOf, distLabel, meta, charts, chartOf, chartMap };
}
