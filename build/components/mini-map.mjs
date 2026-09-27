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
   }
   ============================================================ */
import { esc, attr } from "../core/util.mjs";
import { metaOf, crop, onMap } from "../../site/js/lib/geo.js";

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

  return { miniMap, areaMap, coordLine, directions, directionsTo, where, mapStatus, nearbyOf, distLabel, meta };
}
