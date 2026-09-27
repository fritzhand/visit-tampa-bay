#!/usr/bin/env node
/* ============================================================
   scripts/build-basemap.mjs · OWNER: Basemap lane · Dev-time only (zero dependencies, Node ≥ 18; curl and unzip
   for --fetch)

   U.S. Census TIGER/Line 2024 → the token-themed nautical-chart basemaps every map, mini-map and sheet uses
   (SPEC §3 "Chart & Label": land, water, water lining, coastline, roads, bridges and causeways, labels). Decoration
   never reads as data: no soundings, no buoys, no depth tints, no depth contours. The water lining is an engraver's
   echo of the shore at fixed distances, nothing more.

   SOURCES — U.S. Census Bureau, TIGER/Line Shapefiles 2024 (https://www.census.gov/geographies/mapping-files/
   time-series/geo/tiger-line-file.html). TIGER/Line files are a product of the U.S. Government and are in the public
   domain (no copyright; credited in data/map.json `attribution`). Downloaded into .cache/tiger/ (gitignored):
     COUNTY/tl_2024_us_county.zip             county polygons at full resolution (they include the counties' water)
     AREAWATER/tl_2024_12<ccc>_areawater.zip   water polygons of every county that touches a frame (bays, the Gulf,
                                               rivers, canals, lakes)
     PRISECROADS/tl_2024_12_prisecroads.zip   primary (S1100) and secondary (S1200) roads, Florida
     ROADS/tl_2024_12<ccc>_roads.zip          local roads of Hillsborough, Pinellas, Manatee, Pasco: only the pieces that
                                               cross water are drawn (the island bridges and causeways)
     FEATNAMES/tl_2024_12<ccc>_featnames.zip   every name of a road feature ("Sunshine Skyway Brg" is I-275's alternate)
     RAILS/tl_2024_us_rails.zip               railroad main lines (R1011; "Abandoned RR" left out)
     PLACE/tl_2024_12_place.zip               incorporated places and CDPs: names and internal points
     POINTLM/tl_2024_12_pointlm.zip           locality points (C3081: Ybor City, Palma Ceia…), airports (K2451), parks
     AREALM/tl_2024_12_arealm.zip             area landmarks: park names and internal points

   METHOD
     1. Salt water = every AREAWATER polygon connected by shared edges to a bay/estuary/gulf/sea polygon (H2051,
        H2053): the Gulf, the bays, the tidal rivers and canals. Unconnected water ≥ minLakeKm2 is drawn as lakes.
     2. Land is painted on a fine raster (0.25 unit ≈ 22 m on the core chart): the county polygons on, every salt
        polygon off. Painting is immune to AREAWATER features that overlap each other (the Intracoastal Waterway laid
        over the bays), which defeats any edge-cancelling vector difference. The cartographic-boundary files
        (cb_2024_*_500k) are not used: they are generalized to 1:500,000.
     3. Generalization: a morphological closing (radius closeM: 30 m core, 150 m region) fills residential finger
        canals and marsh creeks, which would otherwise print as solid ink at chart scale; channels and passes wider
        than twice the radius stay open. The coast is the zero contour of that distance field (marching squares with
        interpolation, so it is smooth, not stepped), simplified with Douglas–Peucker and quantized.
     4. Water lining: contours of the distance from land at `lining` units, so they only ever lie in water, merge
        around close islands like an engraving and never cross land.
     5. Roads are split where they leave the land raster: runs over water (≥ 0.9 units) are bridges and causeways.
     6. Labels are placed from Census geometry (below) and verified (the script fails on an unverified string).

   OUTPUTS (the contract; the client ports of cincy-week lib/geo.js and features/map.js read them unchanged)
     site/map/basemap.svg   <svg viewBox="0 0 W H"><g id="bm">…</g><g id="bm-grid">…</g></svg>, the core chart.
                            #bm holds one <path> per layer, in paint order (class · paint):
                              rect (frame + pad)       fill --map-bg (backdrop; shows only where --map-water is clear)
                              m-water                  fill --map-water (the whole frame: land is drawn over it)
                              m-water-line m-wl1..3    stroke --map-water-line, 0.9/0.75/0.6 px at opacity 1/.75/.5
                              m-land                   fill --map-land, fill-rule evenodd
                              m-inland-water           fill --map-inland-water (lakes), and m-lake-shore stroke --map-coast
                              m-coast, m-coast-minor   stroke --map-coast, 1.1 px (coast, big islands) / 0.55 px (islets)
                              m-rail                   stroke --map-rail, dashed
                              m-road-casing            stroke --map-road-casing (under m-road and m-road-major)
                              m-road, m-road-major     stroke --map-road (S1200) / --map-road-major (S1100: interstates,
                                                       expressways, toll roads)
                              m-bridge-casing          stroke --map-bridge (the bridge rails, wider than the deck)
                              m-bridge, m-bridge-major stroke --map-road / --map-road-major (the deck)
                            #bm-grid (class m-graticule, outside #bm): lines every 0.1° inside the frame and minute ticks
                            (longer every 5′) just outside it, plus the neat line; stroke --map-graticule, falling back to
                            --map-label. Show it with a margin, clipping the chart to its frame with a nested <svg>:
                              <svg viewBox="-24 -24 W+48 H+48"><svg width="W" height="H" viewBox="0 0 W H">
                                <use href="basemap.svg#bm"/></svg><use href="basemap.svg#bm-grid"/></svg>
                            Paint is an inline style that references ONLY custom properties (no color literals), so the
                            chart themes when inlined and through <use href="…#bm"> (custom properties inherit into the
                            <use> tree). Line widths are screen pixels (vector-effect: non-scaling-stroke) × --mw
                            (default 1; the interactive map sets it per zoom). Fills extend `pad` units past the frame.
     site/map/region.svg    the same structure (#bm, #bm-grid) for the whole guide box at low detail: land, the big
                            water bodies and lakes ≥ 4 km², two lining lines, interstates only (Day Trips sheet, region
                            mini-maps).
     data/map.json          { bbox: { core, home }, projection: { lat0, k, sx, scale, viewBox, mPerUnit },
                              labels: [{ text, lat, lng, kind, minZoom, angle?, id? }], transit: { name, stops },
                              graticule: { step, tick, lat: [°…], lng: [°…] },
                              region: { bbox: { core, home }, projection, labels, graticule, file: "region.svg" },
                              attribution, source, source_url, tiger_vintage }
                            metaOf(map) and metaOf(map.region) both work (the region block has the same fields).
                            Projection (identical to cincy-week site/js/lib/geo.js project(), W = 1000):
                              k = cos(lat0), lat0 = (s + n) / 2, sx = W / ((e − w)·k), H = round((n − s)·sx)
                              x = (lng − w)·k·sx     y = (n − lat)·sx
                            Label kinds: water (italic, --map-label-water), city, town, beach, hood, island, park,
                            airport, bridge, route (interstate markers), county (region only), area (from data/areas.json).
                            minZoom is in units of Z1 = 0.36 px per viewBox unit (a phone showing the whole chart; the
                            whole chart on a 1000 px desktop is zoom 2.8). `angle` is degrees, clockwise, for rivers and
                            bridges. `id` is the SPEC §4.1 area id when the label names an area.
                            transit is empty: TIGER has no streetcar stops (the TECO Line comes from data/transport.json).

   LABELS. Every string is (a) a Census name, with TIGER's standard abbreviations spelled out (Hbr → Harbor, Brg →
   Bridge, Cswy → Causeway, Riv → River, Lk → Lake, Arprt → Airport, a leading "St" → "St."), (b) a leading run of
   words of a Census name ("Honeymoon Island" of "Honeymoon Island State Rec Area"), (c) a phrase of SPEC.md, or (d) an
   area's name (its SPEC §4.1 id, or data/areas.json). The script throws on anything else. Positions: Census internal
   points (places, localities, landmarks, counties); the most open water of the named TIGER water polygons (the pole
   of inaccessibility on a 1-unit grid; rivers get their axis as `angle`); the interior of the TIGER island that holds
   a seed point, near the seed (Davis Islands, Harbour Island, Clearwater Beach, Sand Key, Pass-a-Grille, Anna Maria
   Island, Egmont Key, Honeymoon Island); the middle of a named road's longest crossing (bridges); points along an
   interstate on land (route markers); data/areas.json points for the other areas (re-run after the research merge).

   CUSTOM PROPERTIES the site CSS must define (both editions): --map-bg --map-water --map-land --map-coast
     --map-water-line --map-park --map-inland-water --map-road --map-road-major --map-road-casing --map-bridge --map-rail
     --map-label --map-label-water; optional: --mw (line-width factor, default 1), --map-graticule (default --map-label).
     --map-park is reserved: no park fills are drawn (TIGER's Florida park polygons are sparse, so a partial park layer
     would read as "no parks here").

   USAGE
     node scripts/build-basemap.mjs            build from .cache/tiger/ → site/map/basemap.svg, region.svg, data/map.json
     node scripts/build-basemap.mjs --fetch    download what is missing first (curl, www2.census.gov), then build
     node scripts/build-basemap.mjs --check    build in memory, report sizes, anchors and labels; write nothing
     node scripts/build-basemap.mjs --out DIR  write a trial build to DIR instead (even over budget), for review
     --verbose                                 also list every label
   Checks (the script exits 1): basemap.svg ≤ 150 KB gzipped, region.svg ≤ 40 KB gzipped; five anchor points (Tampa
   Theatre, the Dali, Pier 60, Fort De Soto, TPA) must project onto land; every label verified.
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, ".cache", "tiger");
const XDIR = path.join(CACHE, "x");
const FETCH = process.argv.includes("--fetch");
const CHECK = process.argv.includes("--check");
const VERBOSE = process.argv.includes("--verbose");
const OUT = process.argv.includes("--out") ? path.resolve(process.argv[process.argv.indexOf("--out") + 1]) : null;
const t0 = Date.now();
const log = (...a) => console.log(...a);
const vlog = (...a) => { if (VERBOSE) console.log(...a); };

/* ---------- the frames ---------- */
/** The core chart: Tarpon Springs and Wesley Chapel south to Anna Maria Island, Clearwater Beach east to Plant City. */
export const CORE = { s: 27.4, n: 28.26, w: -82.95, e: -82.08 };
/** The frame a map opens on: the bay, from Clearwater Beach and Fort De Soto to downtown Tampa. */
export const HOME = { s: 27.6, n: 28.06, w: -82.86, e: -82.38 };
/** The whole guide box (research/tools/geocode.mjs BOX): the Day Trips sheet and region mini-maps. */
export const REGION = { s: 26.9, n: 29.0, w: -83.0, e: -81.4 };
const W = 1000;
/** Hillsborough, Pinellas, Manatee, Pasco: the counties whose local bridges and causeways are drawn. */
const ROAD_COUNTIES = ["12057", "12103", "12081", "12101"];

/* ---------- projection: identical to cincy-week site/js/lib/geo.js ---------- */
const METERS_PER_DEG_LAT = (2 * Math.PI * 6371008.8) / 360;
/** Equirectangular projection into a basemap's viewBox units. meta = { bbox: { s, n, w, e }, k, sx }. */
export function project(lat, lng, meta) {
  return [(lng - meta.bbox.w) * meta.k * meta.sx, (meta.bbox.n - lat) * meta.sx];
}
export function unproject(x, y, meta) {
  return [meta.bbox.n - y / meta.sx, meta.bbox.w + x / (meta.k * meta.sx)];
}
function frameOf(box) {
  const lat0 = (box.s + box.n) / 2;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const sx = W / ((box.e - box.w) * k);
  const H = Math.round((box.n - box.s) * sx);
  return { bbox: box, lat0, k, sx, W, H, mPerUnit: METERS_PER_DEG_LAT / sx };
}

/* ---------- per-map settings ---------- */
const SETTINGS = {
  core: {
    box: CORE, home: HOME, file: "basemap.svg", budgetKB: 150,
    pad: 16,                       // units drawn beyond the frame so fills and strokes reach the edge
    grid: 0.1,                     // quantization grid (units)
    eps: { land: 0.12, lake: 0.15, road: 0.15, rail: 0.25, line: 0.2 },
    minIsland: 0.35, minHole: 0.6, // square units: smaller land rings / water holes are dropped
    minLakeKm2: 0.25,              // inland lakes drawn at or above this area
    minorRing: 14,                 // square units: islets and inlets below this get a hairline shore
    minWaterM2: 1500,              // water polygons smaller than this are ignored (retention ponds)
    raster: 0.25,                  // land raster cell (units)
    closeM: 30,                    // closing radius (m): water narrower than twice this becomes land
    lining: [2.2, 5, 8.6],         // water-lining offsets from the shore (units)
    roads: "all", bridgesFromLocal: true, rail: true,
  },
  region: {
    box: REGION, home: REGION, file: "region.svg", budgetKB: 40,
    pad: 12, grid: 0.5,
    eps: { land: 0.55, lake: 0.6, road: 0.6, rail: 0.8, line: 0.6 },
    minIsland: 5, minHole: 6, minLakeKm2: 4, minWaterM2: 20000, minorRing: 12,
    raster: 0.5, closeM: 150, lining: [2.4, 5.6],
    roads: "interstate", bridgesFromLocal: false, rail: false,
  },
};

/* ============================================================ downloads ============================================================ */
const TIGER = "https://www2.census.gov/geo/tiger/TIGER2024";
const SRC = {
  county: `${TIGER}/COUNTY/tl_2024_us_county.zip`,
  prisec: `${TIGER}/PRISECROADS/tl_2024_12_prisecroads.zip`,
  rails: `${TIGER}/RAILS/tl_2024_us_rails.zip`,
  place: `${TIGER}/PLACE/tl_2024_12_place.zip`,
  pointlm: `${TIGER}/POINTLM/tl_2024_12_pointlm.zip`,
  arealm: `${TIGER}/AREALM/tl_2024_12_arealm.zip`,
  areawater: (fips) => `${TIGER}/AREAWATER/tl_2024_${fips}_areawater.zip`,
  roads: (fips) => `${TIGER}/ROADS/tl_2024_${fips}_roads.zip`,
  featnames: (fips) => `${TIGER}/FEATNAMES/tl_2024_${fips}_featnames.zip`,
};
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const nameOf = (url) => path.basename(url, ".zip");

/** The .shp/.dbf of one TIGER zip, extracted under .cache/tiger/x/<name>/ (downloading it with --fetch). */
function ensure(url) {
  const name = nameOf(url), zip = path.join(CACHE, `${name}.zip`), dir = path.join(XDIR, name);
  const shp = path.join(dir, `${name}.shp`), dbf = path.join(dir, `${name}.dbf`);
  if (!fs.existsSync(zip)) {
    if (!FETCH) { console.error(`✗ missing .cache/tiger/${name}.zip: run node scripts/build-basemap.mjs --fetch`); process.exit(1); }
    fs.mkdirSync(CACHE, { recursive: true });
    process.stdout.write(`  ↓ ${url} … `);
    const r = spawnSync("curl", ["-sS", "-f", "-L", "--retry", "3", "-m", "900", "-A", UA, "-o", zip + ".part", url], { encoding: "utf8" });
    if (r.status !== 0) { console.error(`failed: ${(r.stderr || "").trim()}`); process.exit(1); }
    fs.renameSync(zip + ".part", zip);
    log(`${(fs.statSync(zip).size / 1048576).toFixed(1)} MB`);
  }
  if (!fs.existsSync(dbf) || fs.statSync(dbf).mtimeMs < fs.statSync(zip).mtimeMs) {
    fs.mkdirSync(dir, { recursive: true });
    let r = spawnSync("unzip", ["-o", "-q", zip, `${name}.shp`, `${name}.dbf`, "-d", dir], { encoding: "utf8" });
    if (r.status !== 0) r = spawnSync("python3", ["-c", `import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);[z.extract(n,sys.argv[2]) for n in z.namelist() if n.endswith(('.shp','.dbf'))]`, zip, dir], { encoding: "utf8" });
    if (r.status !== 0) { console.error(`✗ could not unzip ${zip}: ${r.stderr}`); process.exit(1); }
  }
  return { shp, dbf, name };
}

/* ============================================================ shapefile + dBASE readers ============================================================ */
/** dBASE III rows as objects of trimmed strings (TIGER .dbf files are UTF-8, per their .cpg). */
function readDbf(file) {
  const b = fs.readFileSync(file);
  const n = b.readUInt32LE(4), hl = b.readUInt16LE(8), rl = b.readUInt16LE(10);
  const fields = [];
  for (let o = 32; b[o] !== 0x0d; o += 32) fields.push({ name: b.toString("latin1", o, o + 11).replace(/\0.*$/, ""), len: b[o + 16] });
  const rows = new Array(n);
  for (let i = 0; i < n; i++) {
    let o = hl + i * rl + 1;
    const r = {};
    for (const f of fields) { r[f.name] = b.toString("utf8", o, o + f.len).trim(); o += f.len; }
    rows[i] = r;
  }
  return rows;
}
/** Shapefile records (Point 1, PolyLine 3, Polygon 5): { idx, bbox: [xmin, ymin, xmax, ymax], parts: [[[x, y], …]], x?, y? }.
 *  `want(bbox, idx)` is asked before a record's points are decoded (bbox is null for points). */
function readShp(file, want = () => true) {
  const b = fs.readFileSync(file);
  const out = [];
  let o = 100, i = 0;
  while (o + 8 <= b.length) {
    const len = b.readInt32BE(o + 4) * 2, c = o + 8;
    o = c + len;
    const idx = i++, t = b.readInt32LE(c);
    if (t === 0) continue;
    if (t === 1) { const x = b.readDoubleLE(c + 4), y = b.readDoubleLE(c + 12); if (want([x, y, x, y], idx)) out.push({ idx, x, y }); continue; }
    if (t !== 3 && t !== 5) throw new Error(`${file}: shape type ${t} is not supported`);
    const bbox = [b.readDoubleLE(c + 4), b.readDoubleLE(c + 12), b.readDoubleLE(c + 20), b.readDoubleLE(c + 28)];
    if (!want(bbox, idx)) continue;
    const np = b.readInt32LE(c + 36), nn = b.readInt32LE(c + 40), po = c + 44 + 4 * np;
    const starts = [];
    for (let p = 0; p < np; p++) starts.push(b.readInt32LE(c + 44 + 4 * p));
    const parts = [];
    for (let p = 0; p < np; p++) {
      const e = p + 1 < np ? starts[p + 1] : nn, ring = [];
      for (let k = starts[p]; k < e; k++) ring.push([b.readDoubleLE(po + 16 * k), b.readDoubleLE(po + 16 * k + 8)]);
      parts.push(ring);
    }
    out.push({ idx, bbox, parts });
  }
  return out;
}
const hits = (bbox, box, m = 0) => !(bbox[2] < box.w - m || bbox[0] > box.e + m || bbox[3] < box.s - m || bbox[1] > box.n + m);

/* ============================================================ geometry ============================================================ */
/** Douglas–Peucker on an open polyline (iterative, so long coastlines cannot overflow the stack). */
function dp(pts, eps) {
  const n = pts.length;
  if (n < 3) return pts.slice();
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [x1, y1] = pts[a], [x2, y2] = pts[b];
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    let idx = -1, max = 0;
    for (let i = a + 1; i < b; i++) {
      const d = L ? Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L : Math.hypot(pts[i][0] - x1, pts[i][1] - y1);
      if (d > max) { max = d; idx = i; }
    }
    if (idx > 0 && max > eps) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
/** Douglas–Peucker on a closed ring: split at the vertex farthest from the first (plain DP collapses a closed ring). */
function dpRing(pts, eps) {
  let far = 0, fd = -1;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; far = i; } }
  if (far === 0) return pts;
  return [...dp(pts.slice(0, far + 1), eps).slice(0, -1), ...dp(pts.slice(far).concat([pts[0]]), eps).slice(0, -1)];
}
const ringArea = (r) => { let a = 0; for (let i = 0, n = r.length; i < n; i++) { const p = r[i], q = r[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
const lenOf = (pts) => { let n = 0; for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return n; };

function clipper(W_, H_, PAD) {
  const inBox = ([x, y]) => x >= -PAD && x <= W_ + PAD && y >= -PAD && y <= H_ + PAD;
  /** Sutherland–Hodgman: a ring clipped to the padded frame. */
  function clipRing(ring) {
    const lim = [-PAD, W_ + PAD, -PAD, H_ + PAD];
    const inside = [(p) => p[0] >= lim[0], (p) => p[0] <= lim[1], (p) => p[1] >= lim[2], (p) => p[1] <= lim[3]];
    const cross = (a, b, i) => {
      const v = lim[i];
      if (i < 2) { const t = (v - a[0]) / (b[0] - a[0]); return [v, a[1] + t * (b[1] - a[1])]; }
      const t = (v - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), v];
    };
    let out = ring;
    for (let i = 0; i < 4 && out.length; i++) {
      const inp = out; out = [];
      for (let j = 0; j < inp.length; j++) {
        const a = inp[j], b = inp[(j + 1) % inp.length], ia = inside[i](a), ib = inside[i](b);
        if (ia) out.push(a);
        if (ia !== ib) out.push(cross(a, b, i));
      }
    }
    return out;
  }
  /** The runs of a polyline inside the padded frame (one vertex of overhang each side). */
  function clipLine(pts) {
    const runs = [];
    let cur = [];
    for (let i = 0; i < pts.length; i++) {
      const inside = inBox(pts[i]) || (i > 0 && inBox(pts[i - 1])) || (i < pts.length - 1 && inBox(pts[i + 1]));
      if (inside) cur.push(pts[i]);
      else if (cur.length) { runs.push(cur); cur = []; }
    }
    if (cur.length) runs.push(cur);
    return runs.filter((r) => r.length > 1);
  }
  return { inBox, clipRing, clipLine };
}

/* ---------- path encoding: absolute M, then relative l pairs on the quantization grid ---------- */
function encoder(grid) {
  const q = (v) => Math.round(v / grid) * grid;
  const num = (v) => { const s = String(+v.toFixed(grid < 1 ? 1 : 0)); return s.replace(/^0\./, ".").replace(/^-0\./, "-."); };
  return function encode(pts, close) {
    const p = [];
    for (const [x, y] of pts) { const r = [q(x), q(y)]; const last = p[p.length - 1]; if (!last || Math.abs(last[0] - r[0]) > 1e-9 || Math.abs(last[1] - r[1]) > 1e-9) p.push(r); }
    if (close && p.length > 1 && Math.abs(p[0][0] - p[p.length - 1][0]) < 1e-9 && Math.abs(p[0][1] - p[p.length - 1][1]) < 1e-9) p.pop();
    if (p.length < 2 || (close && p.length < 3)) return "";
    let s = `M${num(p[0][0])} ${num(p[0][1])}l`;
    for (let i = 1; i < p.length; i++) {
      const dx = num(p[i][0] - p[i - 1][0]), dy = num(p[i][1] - p[i - 1][1]);
      s += (i > 1 && !dx.startsWith("-") ? " " : "") + dx + (dy.startsWith("-") ? "" : " ") + dy;
    }
    return s + (close ? "z" : "");
  };
}

/* ============================================================ land: county − salt water ============================================================ */
/** Vertex interning at 1e-7° (TIGER's shared boundaries carry identical coordinates). */
function vertexTable() {
  const ids = new Map(), xs = [], ys = [];
  return {
    id(p) { const k = `${Math.round(p[0] * 1e7)},${Math.round(p[1] * 1e7)}`; let v = ids.get(k); if (v === undefined) { v = xs.length; ids.set(k, v); xs.push(p[0]); ys.push(p[1]); } return v; },
    xy: (v) => [xs[v], ys[v]],
    get size() { return xs.length; },
  };
}
const SEA_MTFCC = new Set(["H2051", "H2053"]);

/** Everything a map needs from the counties and their water (lng/lat): the county polygons, every water polygon
 *  (with `sea` set when it is salt water: connected by shared edges to a bay, estuary, gulf or sea polygon) and the
 *  inland lakes to draw. */
function loadHydro(box, S, countyShp, countyRows) {
  const M = 0.12; // degrees of margin: polygons just outside the frame still shape the coast inside it
  const counties = countyShp.filter((c) => hits(c.bbox, box, M) && countyRows[c.idx].STATEFP === "12");
  const T = vertexTable();
  const water = []; // { fips, mtfcc, name, area, parts, sea }
  for (const c of counties) {
    const row = countyRows[c.idx], fips = `12${row.COUNTYFP}`;
    const f = ensure(SRC.areawater(fips));
    const rows = readDbf(f.dbf);
    for (const r of readShp(f.shp, (bb, i) => hits(bb, box, M) && (SEA_MTFCC.has(rows[i].MTFCC) || +rows[i].AWATER >= S.minWaterM2))) {
      const d = rows[r.idx];
      water.push({ fips, mtfcc: d.MTFCC, name: d.FULLNAME, area: +d.AWATER, parts: r.parts });
    }
  }
  // connectivity: water polygons that share an edge belong together; the components that hold a bay/gulf are salt water
  const parent = water.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const owner = new Map();
  water.forEach((w, i) => {
    for (const ring of w.parts) for (let j = 0; j + 1 < ring.length; j++) {
      const a = T.id(ring[j]), b = T.id(ring[j + 1]);
      if (a === b) continue;
      const k = a < b ? a * 67108864 + b : b * 67108864 + a;
      const o = owner.get(k);
      if (o === undefined) owner.set(k, i); else if (o !== i) { const ra = find(o), rb = find(i); if (ra !== rb) parent[ra] = rb; }
    }
  });
  const salty = new Set();
  water.forEach((w, i) => { if (SEA_MTFCC.has(w.mtfcc)) salty.add(find(i)); });
  for (const [i, w] of water.entries()) w.sea = salty.has(find(i));
  owner.clear();

  const lakes = water.filter((w) => !w.sea && w.area >= S.minLakeKm2 * 1e6);
  return { lakes, water, counties };
}

/* ============================================================ rasters: land mask, distance fields, contours ============================================================ */
function makeGrid(F, S) {
  const r = S.raster, x0 = -S.pad, y0 = -S.pad;
  const nx = Math.ceil((F.W + 2 * S.pad) / r), ny = Math.ceil((F.H + 2 * S.pad) / r);
  return { r, x0, y0, nx, ny, cx: (i) => x0 + (i + 0.5) * r, cy: (j) => y0 + (j + 0.5) * r };
}
/** Even-odd scanline fill of one polygon's rings (units) into an existing mask: covered cells are set to `value`. */
function paint(mask, rings, G, value) {
  let ylo = Infinity, yhi = -Infinity;
  for (const r of rings) for (const p of r) { if (p[1] < ylo) ylo = p[1]; if (p[1] > yhi) yhi = p[1]; }
  const j0 = Math.max(0, Math.ceil((ylo - G.y0) / G.r - 0.5)), j1 = Math.min(G.ny - 1, Math.floor((yhi - G.y0) / G.r - 0.5));
  if (j1 < j0) return;
  const rows = Array.from({ length: j1 - j0 + 1 }, () => []);
  for (const ring of rings) {
    for (let i = 0, n = ring.length; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n];
      if (a[1] === b[1]) continue;
      const lo = Math.min(a[1], b[1]), hi = Math.max(a[1], b[1]);
      const ja = Math.max(j0, Math.ceil((lo - G.y0) / G.r - 0.5)), jb = Math.min(j1, Math.floor((hi - G.y0) / G.r - 0.5));
      for (let j = ja; j <= jb; j++) {
        const yc = G.cy(j);
        if (yc < lo || yc >= hi) continue;
        rows[j - j0].push(a[0] + ((yc - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    }
  }
  for (let j = j0; j <= j1; j++) {
    const xs = rows[j - j0].sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - G.x0) / G.r - 0.5)), i1 = Math.min(G.nx - 1, Math.ceil((xs[k + 1] - G.x0) / G.r - 0.5) - 1);
      for (let i = i0; i <= i1; i++) mask[j * G.nx + i] = value;
    }
  }
}
/** Even-odd scanline fill of rings (units) → a new Uint8Array (1 inside). */
function rasterize(rings, G) {
  const rows = Array.from({ length: G.ny }, () => []);
  for (const ring of rings) {
    for (let i = 0, n = ring.length; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n];
      if (a[1] === b[1]) continue;
      const ylo = Math.min(a[1], b[1]), yhi = Math.max(a[1], b[1]);
      const j0 = Math.max(0, Math.ceil((ylo - G.y0) / G.r - 0.5)), j1 = Math.min(G.ny - 1, Math.floor((yhi - G.y0) / G.r - 0.5));
      for (let j = j0; j <= j1; j++) {
        const yc = G.cy(j);
        if (yc < ylo || yc >= yhi) continue;
        rows[j].push(a[0] + ((yc - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    }
  }
  const m = new Uint8Array(G.nx * G.ny);
  for (let j = 0; j < G.ny; j++) {
    const xs = rows[j].sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - G.x0) / G.r - 0.5)), i1 = Math.min(G.nx - 1, Math.ceil((xs[k + 1] - G.x0) / G.r - 0.5) - 1);
      for (let i = i0; i <= i1; i++) m[j * G.nx + i] = 1;
    }
  }
  return m;
}
/** Exact Euclidean distance transform (Felzenszwalb & Huttenlocher): distance in units from the nearest cell where
 *  mask === src. */
function edt(mask, G, src) {
  const { nx, ny } = G, INF = 1e20, n = Math.max(nx, ny);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  const g = new Float64Array(nx * ny);
  for (let i = 0; i < g.length; i++) g[i] = mask[i] === src ? 0 : INF;
  const pass = (len) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s;
      do { const p = v[k]; s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p); if (s <= z[k]) k--; else break; } while (k >= 0);
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; const p = v[k]; d[q] = (q - p) * (q - p) + f[p]; }
  };
  for (let i = 0; i < nx; i++) { for (let j = 0; j < ny; j++) f[j] = g[j * nx + i]; pass(ny); for (let j = 0; j < ny; j++) g[j * nx + i] = d[j]; }
  for (let j = 0; j < ny; j++) { for (let i = 0; i < nx; i++) f[i] = g[j * nx + i]; pass(nx); for (let i = 0; i < nx; i++) g[j * nx + i] = d[i]; }
  const out = new Float32Array(nx * ny);
  for (let i = 0; i < out.length; i++) out[i] = Math.sqrt(g[i]) * G.r;
  return out;
}
/** Marching squares: the polylines where field === level (values at cell centers), in units. */
function contours(field, G, level) {
  const { nx, ny } = G;
  const segs = [];
  const at = (i, j) => field[j * nx + i];
  // edge ids: h(i,j) joins (i,j)-(i+1,j); v(i,j) joins (i,j)-(i,j+1)
  const pt = (e) => {
    const [t, i, j] = e;
    const a = at(i, j), b = t === 0 ? at(i + 1, j) : at(i, j + 1), f = (level - a) / (b - a);
    return t === 0 ? [G.cx(i) + f * G.r, G.cy(j)] : [G.cx(i), G.cy(j) + f * G.r];
  };
  const key = (e) => (e[0] * ny + e[2]) * nx + e[1];
  for (let j = 0; j + 1 < ny; j++) for (let i = 0; i + 1 < nx; i++) {
    const a = at(i, j) > level, b = at(i + 1, j) > level, c = at(i + 1, j + 1) > level, d = at(i, j + 1) > level;
    const idx = (a ? 8 : 0) | (b ? 4 : 0) | (c ? 2 : 0) | (d ? 1 : 0);
    if (idx === 0 || idx === 15) continue;
    const T = [0, i, j], R = [1, i + 1, j], B = [0, i, j + 1], L = [1, i, j];
    const mid = (at(i, j) + at(i + 1, j) + at(i + 1, j + 1) + at(i, j + 1)) / 4 > level;
    switch (idx) {
      case 1: case 14: segs.push([L, B]); break;
      case 2: case 13: segs.push([B, R]); break;
      case 3: case 12: segs.push([L, R]); break;
      case 4: case 11: segs.push([T, R]); break;
      case 6: case 9: segs.push([T, B]); break;
      case 7: case 8: segs.push([L, T]); break;
      case 5: if (mid) segs.push([L, T], [B, R]); else segs.push([L, B], [T, R]); break;
      case 10: if (mid) segs.push([T, R], [L, B]); else segs.push([L, T], [B, R]); break;
    }
  }
  // chain the segments through their shared edge points
  const ends = new Map();
  segs.forEach((s, n) => { for (const e of s) { const k = key(e); if (!ends.has(k)) ends.set(k, []); ends.get(k).push(n); } });
  const used = new Uint8Array(segs.length), lines = [];
  for (let n = 0; n < segs.length; n++) {
    if (used[n]) continue;
    used[n] = 1;
    const chain = [segs[n][0], segs[n][1]];
    for (const dir of [1, 0]) {
      for (;;) {
        const tip = dir ? chain[chain.length - 1] : chain[0];
        const next = (ends.get(key(tip)) || []).find((m) => !used[m]);
        if (next === undefined) break;
        used[next] = 1;
        const s = segs[next], other = key(s[0]) === key(tip) ? s[1] : s[0];
        if (dir) chain.push(other); else chain.unshift(other);
      }
    }
    const pts = chain.map(pt);
    const closed = key(chain[0]) === key(chain[chain.length - 1]);
    lines.push({ pts, closed });
  }
  return lines;
}
/** The cell with the largest field value inside a mask: [x, y, value] in units. */
function pole(field, mask, G) {
  let best = -1, bi = -1;
  for (let i = 0; i < field.length; i++) if (mask[i] && field[i] > best) { best = field[i]; bi = i; }
  if (bi < 0) return null;
  return [G.cx(bi % G.nx), G.cy(Math.floor(bi / G.nx)), field[bi]];
}
/** Orientation (degrees, −90…90, y down) of the mask cells within radius r of a point: principal axis. */
function axisAngle(mask, G, [x, y], r) {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, n = 0;
  const i0 = Math.max(0, Math.floor((x - r - G.x0) / G.r)), i1 = Math.min(G.nx - 1, Math.ceil((x + r - G.x0) / G.r));
  const j0 = Math.max(0, Math.floor((y - r - G.y0) / G.r)), j1 = Math.min(G.ny - 1, Math.ceil((y + r - G.y0) / G.r));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (!mask[j * G.nx + i]) continue;
    const px = G.cx(i), py = G.cy(j);
    if (Math.hypot(px - x, py - y) > r) continue;
    sx += px; sy += py; sxx += px * px; syy += py * py; sxy += px * py; n++;
  }
  if (n < 3) return 0;
  const mx = sx / n, my = sy / n, cxx = sxx / n - mx * mx, cyy = syy / n - my * my, cxy = sxy / n - mx * my;
  let a = (0.5 * Math.atan2(2 * cxy, cxx - cyy) * 180) / Math.PI;
  while (a > 90) a -= 180; while (a <= -90) a += 180;
  return Math.round(a);
}

/* ============================================================ names ============================================================ */
/** TIGER writes standard abbreviations (USPS Publication 28 suffixes and GNIS generics); labels spell them out. */
const ABBR = {
  Brg: "Bridge", Cswy: "Causeway", Hbr: "Harbor", Riv: "River", Lk: "Lake", Lks: "Lakes", Byu: "Bayou", Crk: "Creek",
  Chnnl: "Channel", Cnl: "Canal", Skwy: "Skyway", Pkwy: "Parkway", Expy: "Expressway", Blvd: "Boulevard", Arprt: "Airport",
  Is: "Island", Pt: "Point", Ft: "Fort", Hwy: "Highway", Rd: "Road", Ave: "Avenue", Dr: "Drive", Trl: "Trail",
  Natl: "National", Meml: "Memorial", Rec: "Recreation", Pk: "Park", Spg: "Spring", Spgs: "Springs", Cv: "Cove",
  Inlt: "Inlet", Snd: "Sound", Tpke: "Turnpike", Fld: "Field", Mtn: "Mountain", Sta: "Station",
};
function expand(name) {
  const w = name.split(/\s+/);
  return w.map((x, i) => {
    if (x === "St") return i === w.length - 1 ? "Street" : "St.";
    if (/^St-/.test(x)) return x.replace(/^St-/, "St.-");
    return ABBR[x] || x;
  }).join(" ").replace(/^(St\.) (Pete)-/, "$1 $2–");
}
/** "I- 275" → "I-275", "US Hwy 19" → "US 19". */
const routeText = (name) => name.replace(/^I- ?(\d+).*$/, "I-$1");
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ============================================================ build one map ============================================================ */
const W_ = (w) => `stroke-width:calc(${w}px*var(--mw,1))`;
const LINE = "fill:none;stroke-linecap:round;stroke-linejoin:round";
const PAINT = {
  water: "fill:var(--map-water)",
  wl1: `${LINE};stroke:var(--map-water-line);${W_(0.9)}`,
  wl2: `${LINE};stroke:var(--map-water-line);${W_(0.75)};stroke-opacity:.75`,
  wl3: `${LINE};stroke:var(--map-water-line);${W_(0.6)};stroke-opacity:.5`,
  land: "fill:var(--map-land);fill-rule:evenodd",
  "inland-water": "fill:var(--map-inland-water);fill-rule:evenodd",
  coast: `${LINE};stroke:var(--map-coast);${W_(1.1)}`,
  "coast-minor": `${LINE};stroke:var(--map-coast);${W_(0.55)}`,
  "lake-shore": `${LINE};stroke:var(--map-coast);${W_(0.6)}`,
  rail: `fill:none;stroke:var(--map-rail);${W_(1.1)};stroke-dasharray:5 3;stroke-linecap:butt`,
  "road-casing": `${LINE};stroke:var(--map-road-casing);${W_(3.4)}`,
  "road-major-casing": `${LINE};stroke:var(--map-road-casing);${W_(4.6)}`,
  road: `${LINE};stroke:var(--map-road);${W_(1.6)}`,
  "road-major": `${LINE};stroke:var(--map-road-major);${W_(2.6)}`,
  "bridge-casing": `fill:none;stroke:var(--map-bridge);${W_(4.4)};stroke-linecap:butt;stroke-linejoin:round`,
  "bridge-major-casing": `fill:none;stroke:var(--map-bridge);${W_(5.6)};stroke-linecap:butt;stroke-linejoin:round`,
  bridge: `fill:none;stroke:var(--map-road);${W_(1.8)};stroke-linecap:butt;stroke-linejoin:round`,
  "bridge-major": `fill:none;stroke:var(--map-road-major);${W_(2.6)};stroke-linecap:butt;stroke-linejoin:round`,
  grid: `fill:none;stroke:var(--map-graticule,var(--map-label));${W_(0.6)};stroke-opacity:.35`,
  tick: `fill:none;stroke:var(--map-graticule,var(--map-label));${W_(0.8)}`,
};

function buildMap(which, shared) {
  const S = SETTINGS[which], F = frameOf(S.box), C = clipper(F.W, F.H, S.pad), encode = encoder(S.grid);
  const PP = ([lng, lat]) => project(lat, lng, F);
  log(`\n${which}: ${F.W}×${F.H} units, ${F.mPerUnit.toFixed(1)} m per unit`);

  /* ---- land and water ---- */
  const hy = loadHydro(S.box, S, shared.countyShp, shared.countyRows);
  log(`  ${hy.counties.length} counties (${hy.counties.map((c) => shared.countyRows[c.idx].NAME).join(", ")}), ${hy.water.length} water polygons (${hy.water.filter((w) => w.sea).length} salt), ${hy.lakes.length} lakes`);
  /* ---- land: exact TIGER rings → a fine raster → closing (fills canals and creeks narrower than 2·close) →
     the smooth zero contour of a distance field. This is the cartographic generalization: residential finger
     canals and marsh slivers would otherwise print as solid ink at chart scale. ---- */
  const G = makeGrid(F, S), N = G.nx * G.ny;
  const close = S.closeM / F.mPerUnit;
  // exact land at raster resolution: paint the counties, then clear every salt-water polygon (painting is immune to
  // AREAWATER features that overlap one another)
  const land0 = new Uint8Array(N);
  const inFrame = (bb) => !(bb[2] < -S.pad || bb[0] > F.W + S.pad || bb[3] < -S.pad || bb[1] > F.H + S.pad);
  for (const c of hy.counties) { const rings = c.parts.map((r) => r.map(PP)); if (inFrame(bboxOf(rings.flat()))) paint(land0, rings, G, 1); }
  for (const w of hy.water) if (w.sea) { const rings = w.parts.map((r) => r.map(PP)); if (inFrame(bboxOf(rings.flat()))) paint(land0, rings, G, 0); }
  const toLand0 = edt(land0, G, 1);                              // water cells: distance to the exact land
  const deep = new Uint8Array(N);
  for (let i = 0; i < N; i++) deep[i] = toLand0[i] > close ? 1 : 0;
  const toDeep = edt(deep, G, 1);                                // distance to water wider than 2·close
  const f = new Float32Array(N);
  for (let i = 0; i < N; i++) f[i] = toDeep[i] - close;        // > 0: land after the closing
  const land = new Uint8Array(N);
  for (let i = 0; i < N; i++) land[i] = f[i] > 0 ? 1 : 0;
  // contour the land (border cells forced to water so every ring closes, outside the visible frame)
  for (let i = 0; i < G.nx; i++) { f[i] = -1; f[(G.ny - 1) * G.nx + i] = -1; }
  for (let j = 0; j < G.ny; j++) { f[j * G.nx] = -1; f[j * G.nx + G.nx - 1] = -1; }
  const landRings = [];   // simplified, for the SVG
  const landFull = [];    // contour rings, for labels
  for (const c of contours(f, G, 0)) {
    if (!c.closed) continue;
    const a = ringArea(c.pts);
    if (Math.abs(a) < Math.min(S.minIsland, S.minHole)) continue;
    landFull.push(c.pts);
    const sr = dpRing(c.pts, S.eps.land);
    if (sr.length >= 3 && Math.abs(ringArea(sr)) >= Math.min(S.minIsland, S.minHole)) landRings.push(sr);
  }
  const lakes = [];
  for (const w of hy.lakes) for (const ring of w.parts) {
    const pr = ring.map(PP);
    if (!pr.some(C.inBox)) continue;
    const cr = C.clipRing(pr);
    if (cr.length < 3) continue;
    const sr = dpRing(cr, S.eps.lake);
    if (sr.length >= 3) lakes.push(sr);
  }
  const dLand = edt(land, G, 1);   // water cells: distance to the (generalized) land
  const landAt = (x, y) => { const i = Math.floor((x - G.x0) / G.r), j = Math.floor((y - G.y0) / G.r); return i >= 0 && j >= 0 && i < G.nx && j < G.ny ? land[j * G.nx + i] === 1 : false; };
  log(`  raster ${G.nx}×${G.ny} at ${G.r} units, closing ${close.toFixed(2)} units (${S.closeM} m): ${landRings.length} land rings`);

  /* ---- water lining: contours of the distance from land, only ever in water ---- */
  const lining = S.lining.map((lv) => {
    const ls = contours(dLand, G, lv).filter((l) => lenOf(l.pts) > lv * 4);
    return ls.map((l) => encode(l.closed ? dpRing(l.pts, S.eps.line) : dp(l.pts, S.eps.line), l.closed)).filter(Boolean);
  });

  /* ---- roads ---- */
  const roads = { road: [], "road-major": [], bridge: [], "bridge-major": [] };
  const bridgeRuns = []; // { name, pts, major }
  const rd = shared.prisecRows;
  const addRoad = (pts, major, names, localOnly) => {
    // split into land and over-water runs (bridges and causeways): a run over water must be ≥ 0.9 units long
    const dense = [];
    for (let i = 0; i < pts.length; i++) {
      if (i) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.ceil(Math.hypot(bx - ax, by - ay) / (G.r / 2)); for (let k = 1; k < n; k++) dense.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]); }
      dense.push(pts[i]);
    }
    const wet = dense.map((p, i) => i > 0 && !landAt((p[0] + dense[i - 1][0]) / 2, (p[1] + dense[i - 1][1]) / 2));
    // smooth: short wet runs are shoreline noise, short dry gaps inside a crossing are piers and islets
    const runs = [];
    for (let i = 1; i < dense.length; i++) { const w = wet[i]; if (!runs.length || runs[runs.length - 1].w !== w) runs.push({ w, a: i - 1, b: i }); else runs[runs.length - 1].b = i; }
    const L = (r) => lenOf(dense.slice(r.a, r.b + 1));
    for (const r of runs) if (!r.w && L(r) < 0.6 && runs.length > 1) r.w = true;
    for (const r of runs) if (r.w && L(r) < 0.9) r.w = false;
    const merged = [];
    for (const r of runs) { const m = merged[merged.length - 1]; if (m && m.w === r.w) m.b = r.b; else merged.push({ ...r }); }
    for (const r of merged) {
      const seg = dense.slice(r.a, r.b + 1);
      if (r.w) { bridgeRuns.push({ names, pts: seg, major }); for (const run of C.clipLine(seg)) { const d = encode(dp(run, S.eps.road * 0.5), false); if (d) roads[major ? "bridge-major" : "bridge"].push(d); } }
      if (!r.w && localOnly) continue;
      if (!r.w) for (const run of C.clipLine(seg)) { const d = encode(dp(run, S.eps.road), false); if (d) roads[major ? "road-major" : "road"].push(d); }
    }
  };
  for (const r of shared.prisec) {
    if (!hits(r.bbox, S.box, 0.05)) continue;
    const row = rd[r.idx];
    const major = row.MTFCC === "S1100";
    if (S.roads === "interstate" && row.RTTYP !== "I") continue;
    for (const part of r.parts) addRoad(part.map(PP), major || S.roads === "interstate", r.names, false);
  }
  if (S.bridgesFromLocal) {
    // local roads (S1400) only where they cross water: the island bridges and causeways (Davis Islands, Bayside…)
    for (const lr of shared.localRoads) {
      if (!hits(lr.bbox, S.box, 0)) continue;
      for (const part of lr.parts) {
        const pts = part.map(PP);
        if (pts.every((p) => landAt(p[0], p[1]))) continue;
        addRoad(pts, false, lr.names, true);
      }
    }
  }
  /* ---- rail ---- */
  const rail = [];
  if (S.rail) for (const r of shared.rails) {
    if (!hits(r.bbox, S.box, 0.05)) continue;
    for (const part of r.parts) for (const run of C.clipLine(part.map(PP))) { const d = encode(dp(run, S.eps.rail), false); if (d) rail.push(d); }
  }

  /* ---- SVG ---- */
  const dLandPath = landRings.map((r) => encode(r, true)).filter(Boolean).join("");
  // the shore: a full-weight line for the coast and big islands, a hairline for islets and small inlets (at chart
  // scale a canal subdivision would otherwise print as a solid block of ink)
  const coast = [], coastMinor = [];
  for (const r of landRings) for (const run of C.clipLine(r.concat([r[0]]))) { const d = encode(run, false); if (d) (Math.abs(ringArea(r)) < S.minorRing ? coastMinor : coast).push(d); }
  const lakeD = lakes.map((r) => encode(r, true)).filter(Boolean).join("");
  const path_ = (cls, d, paint = PAINT[cls]) => (d ? `<path class="m-${cls}" style="${paint}" vector-effect="non-scaling-stroke" d="${d}"/>` : "");
  const frameD = `M${-S.pad} ${-S.pad}H${F.W + S.pad}V${F.H + S.pad}H${-S.pad}z`;
  const layers = [
    `<rect x="${-S.pad}" y="${-S.pad}" width="${F.W + 2 * S.pad}" height="${F.H + 2 * S.pad}" style="fill:var(--map-bg)"/>`,
    path_("water", frameD),
    ...lining.map((ls, i) => (ls.length ? `<path class="m-water-line m-wl${i + 1}" style="${PAINT[`wl${i + 1}`]}" vector-effect="non-scaling-stroke" d="${ls.join("")}"/>` : "")),
    path_("land", dLandPath),
    path_("inland-water", lakeD),
    path_("lake-shore", lakeD, PAINT["lake-shore"]),
    path_("coast", coast.join("")),
    path_("coast-minor", coastMinor.join("")),
    path_("rail", rail.join("")),
    path_("road-casing", roads.road.join("")),
    path_("road-casing", roads["road-major"].join(""), PAINT["road-major-casing"]),
    path_("road", roads.road.join("")),
    path_("road-major", roads["road-major"].join("")),
    path_("bridge-casing", roads.bridge.join("")),
    path_("bridge-casing", roads["bridge-major"].join(""), PAINT["bridge-major-casing"]),
    path_("bridge", roads.bridge.join("")),
    path_("bridge-major", roads["bridge-major"].join("")),
  ].filter(Boolean);
  const grat = graticule(F);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${F.W} ${F.H}"><g id="bm">\n${layers.join("\n")}\n</g>\n<g id="bm-grid" class="m-graticule">${path_("grid", grat.lines)}${path_("tick", grat.ticks)}</g></svg>\n`;

  const stats = {
    land: dLandPath.length, coast: coast.join("").length + coastMinor.join("").length, lining: lining.map((l) => l.join("").length), lakes: lakeD.length,
    roads: Object.fromEntries(Object.entries(roads).map(([k, v]) => [k, v.join("").length])), rail: rail.join("").length,
  };
  return { S, F, G, hy, land, landRings: landFull, bridgeRuns, svg, stats, grat };
}
function bboxOf(pts) { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const [x, y] of pts) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y; } return [a, b, c, d]; }

/** Lines every 0.1° inside the frame, minute ticks (every 1′, longer every 5′) in the margin just outside it. */
function graticule(F) {
  const { s, n, w, e } = F.bbox, step = 0.1, lines = [], ticks = [], lat = [], lng = [];
  const r1 = (v) => Math.round(v * 10) / 10;
  for (let v = Math.ceil(s / step - 1e-9) * step; v <= n + 1e-9; v += step) { const y = r1(project(v, w, F)[1]); lat.push(+v.toFixed(1)); lines.push(`M0 ${y}H${F.W}`); }
  for (let v = Math.ceil(w / step - 1e-9) * step; v <= e + 1e-9; v += step) { const x = r1(project(n, v, F)[0]); lng.push(+v.toFixed(1)); lines.push(`M${x} 0V${F.H}`); }
  for (let m = Math.ceil(s * 60 - 1e-9); m <= n * 60 + 1e-9; m++) { const y = r1(project(m / 60, w, F)[1]), L = m % 5 === 0 ? 9 : 5; ticks.push(`M${-L} ${y}h${L}M${F.W} ${y}h${L}`); }
  for (let m = Math.ceil(w * 60 - 1e-9); m <= e * 60 + 1e-9; m++) { const x = r1(project(n, m / 60, F)[0]), L = m % 5 === 0 ? 9 : 5; ticks.push(`M${x} ${-L}v${L}M${x} ${F.H}v${L}`); }
  ticks.push(`M0 0H${F.W}V${F.H}H0z`);
  return { lines: lines.join(""), ticks: ticks.join(""), json: { step, tick: +(1 / 60).toFixed(6), lat, lng } };
}

/* ============================================================ labels ============================================================ */
function labelMaker(map, shared) {
  const { F } = map;
  // label placement works on its own coarse grid (1 unit): the poles of named water and of islands
  const G = makeGrid(F, { raster: 1, pad: map.S.pad });
  const round6 = (v) => Math.round(v * 1e6) / 1e6;
  const ll = ([x, y]) => { const [lat, lng] = unproject(x, y, F); return { lat: round6(lat), lng: round6(lng) }; };
  const inFrame = (lat, lng, m = 0) => lat >= F.bbox.s + m && lat <= F.bbox.n - m && lng >= F.bbox.w + m && lng <= F.bbox.e - m;
  const out = [], seen = new Set();
  const push = (l) => {
    const key = `${l.kind}|${l.text}|${l.lat}|${l.lng}`;
    if (seen.has(key)) return;
    if (!inFrame(l.lat, l.lng)) { vlog(`    · ${l.text}: outside the frame`); return; }
    seen.add(key);
    out.push(Object.fromEntries(Object.entries(l).filter(([, v]) => v !== undefined && v !== null)));
  };
  const areaId = (text) => { const s = slug(text); return shared.areaIds.has(s) ? s : undefined; };

  /** A named water body at its most open water inside the frame (optionally near a hint point). */
  function water(text, names, minZoom, { river = false, largest = false } = {}) {
    shared.verify(text);
    const rings = [];
    // `largest`: only the biggest polygon of that name (TIGER also gives "Terra Ceia Bay" to a patch of Tampa Bay)
    let named = map.hy.water.filter((w) => names.includes(w.name));
    if (largest) named = named.sort((a, b) => b.area - a.area).slice(0, 1);
    for (const w of named) for (const ring of w.parts) rings.push(ring.map(([lng, lat]) => project(lat, lng, F)));
    if (!rings.length) { log(`    ! water label "${text}": no TIGER water named ${names.join(" / ")} near the frame`); return; }
    const mask = rasterize(rings, G);
    // the most open water of the named polygons (farthest from their own shores, which include the neighboring
    // bays' polygons), kept inside the frame with a margin
    const inset = 18;
    for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) {
      const x = G.cx(i), y = G.cy(j);
      if (x < inset || y < inset || x > F.W - inset || y > F.H - inset) mask[j * G.nx + i] = 0;
    }
    const p = pole(edt(mask, G, 0), mask, G);
    if (!p) { log(`    ! water label "${text}": no open water in the frame`); return; }
    const angle = river ? axisAngle(mask, G, p, 30) : 0;
    push({ text, ...ll(p), kind: "water", minZoom, angle: angle || undefined });
  }
  /** A label at a Census point (place internal point, locality point, landmark internal point). */
  function at(text, lat, lng, kind, minZoom, id) { shared.verify(text); push({ text, lat: round6(lat), lng: round6(lng), kind, minZoom, id: id === undefined ? areaId(text) : id || undefined }); }
  /** An island: the interior of the land ring (TIGER geometry) that holds the seed point. */
  function island(text, seed, kind, minZoom, id, near = 0) {
    shared.verify(text);
    const [x, y] = project(seed[0], seed[1], F);
    // the smallest land ring around the seed is the island itself (contour rings nest: coast, lagoon, island…)
    const ring = map.landRings.filter((r) => pointIn(r, x, y)).sort((a, b) => Math.abs(ringArea(a)) - Math.abs(ringArea(b)))[0];
    if (!ring || !landAt(map, [x, y])) {
      // say where the nearest land is, so the seed can be corrected by hand (never snapped automatically)
      let best = null;
      for (let dy = -3; dy <= 3; dy += 0.25) for (let dx = -3; dx <= 3; dx += 0.25) if (landAt(map, [x + dx, y + dy]) && (!best || Math.hypot(dx, dy) < best.d)) best = { d: Math.hypot(dx, dy), ll: ll([x + dx, y + dy]) };
      log(`    ! island label "${text}": the seed ${seed} is not on land${best ? ` (nearest land ${best.ll.lat},${best.ll.lng})` : ""}`);
      return;
    }
    const mask = rasterize([ring], G);
    // a long island (Clearwater Beach runs on into Caladesi Island) is labelled near its seed: within `near` units
    if (near) for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) if (Math.hypot(G.cx(i) - x, G.cy(j) - y) > near) mask[j * G.nx + i] = 0;
    const p = pole(edt(mask, G, 0), mask, G);
    if (!p) return;
    push({ text, ...ll(p), kind, minZoom, id: id === undefined ? areaId(text) : id || undefined });
  }
  /** A bridge or causeway: the middle of its longest run over water. */
  function bridge(text, roadNames, minZoom) {
    shared.verify(text);
    const runs = map.bridgeRuns.filter((r) => r.names.some((n) => roadNames.includes(n))).map((r) => ({ ...r, len: lenOf(r.pts) })).sort((a, b) => b.len - a.len);
    if (!runs.length) { log(`    ! bridge label "${text}": no crossing of ${roadNames.join(" / ")}`); return; }
    const r = runs[0], half = r.len / 2;
    let acc = 0;
    for (let i = 1; i < r.pts.length; i++) {
      const a = r.pts[i - 1], b = r.pts[i], s = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + s >= half) {
        const f = s ? (half - acc) / s : 0;
        let ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
        while (ang > 90) ang -= 180; while (ang <= -90) ang += 180;
        push({ text, ...ll([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]), kind: "bridge", minZoom, angle: Math.round(ang) || undefined });
        return;
      }
      acc += s;
    }
  }
  /** Route markers along an interstate, on land, every `every` units. */
  function route(text, minZoom, every) {
    shared.verify(text);
    const pts = [];
    for (const r of shared.prisec) {
      const row = shared.prisecRows[r.idx];
      if (row.RTTYP !== "I" || routeText(row.FULLNAME) !== text || !hits(r.bbox, F.bbox, 0)) continue;
      for (const part of r.parts) pts.push(part.map(([lng, lat]) => project(lat, lng, F)));
    }
    const chosen = [];
    for (const line of pts) for (const p of line) {
      if (p[0] < 30 || p[1] < 30 || p[0] > F.W - 30 || p[1] > F.H - 30 || !landAt(map, p)) continue;
      if (chosen.every((c) => Math.hypot(c[0] - p[0], c[1] - p[1]) > every)) chosen.push(p);
    }
    for (const p of chosen) push({ text, ...ll(p), kind: "route", minZoom });
  }
  return { out, water, at, island, bridge, route, inFrame };
}
function landAt(map, [x, y]) { const G = map.G, i = Math.floor((x - G.x0) / G.r), j = Math.floor((y - G.y0) / G.r); return i >= 0 && j >= 0 && i < G.nx && j < G.ny && map.land[j * G.nx + i] === 1; }
function pointIn(ring, x, y) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Census places by name (internal points). */
const placeAt = (shared, name) => { const p = shared.places.get(name); if (!p) throw new Error(`no Census place named "${name}"`); return p; };

function coreLabels(map, shared) {
  const L = labelMaker(map, shared);
  // water: the bays at their most open water
  L.water("Gulf of Mexico", ["Gulf of Mexico"], 1);
  L.water("Tampa Bay", ["Tampa Bay"], 1);
  L.water("Old Tampa Bay", ["Old Tampa Bay"], 1);
  L.water("Hillsborough Bay", ["Hillsborough Bay"], 1.6);
  L.water("Boca Ciega Bay", ["Boca Ciega Bay"], 1.6);
  L.water("Clearwater Harbor", ["Clearwater Hbr"], 2.8);
  L.water("St. Joseph Sound", ["St Joseph Sound"], 2.8);
  L.water("Terra Ceia Bay", ["Terra Ceia Bay"], 2.8, { largest: true });
  L.water("Anna Maria Sound", ["Anna Maria Sound"], 4);
  L.water("Sarasota Bay", ["Sarasota Bay"], 2.8);
  L.water("Manatee River", ["Manatee Riv"], 2.8, { river: true });
  L.water("Hillsborough River", ["Hillsborough Riv"], 4, { river: true });
  L.water("Alafia River", ["Alafia Riv"], 4, { river: true });
  L.water("Little Manatee River", ["Little Manatee Riv"], 5.5, { river: true });
  L.water("Anclote River", ["Anclote Riv"], 5.5, { river: true });
  // cities and towns: Census places at their internal points
  const TOWNS = [
    ["Tampa", "city", 1], ["St. Petersburg", "city", 1], ["Clearwater", "city", 1],
    ["Largo", "town", 1.6], ["Dunedin", "town", 1.6], ["Tarpon Springs", "town", 1.6], ["Brandon", "town", 1.6], ["Bradenton", "town", 1.6],
    ["Plant City", "town", 1.6], ["Temple Terrace", "town", 2.8], ["Pinellas Park", "town", 2.8], ["Palm Harbor", "town", 2.8],
    ["Safety Harbor", "town", 2.8], ["Oldsmar", "town", 2.8], ["Gulfport", "town", 2.8], ["Seminole", "town", 2.8],
    ["Riverview", "town", 2.8], ["Apollo Beach", "town", 2.8], ["Ruskin", "town", 2.8], ["Palmetto", "town", 2.8],
    ["Wesley Chapel", "town", 2.8], ["Lutz", "town", 2.8], ["Land O' Lakes", "town", 4], ["Zephyrhills", "town", 4],
    ["Valrico", "town", 4], ["Seffner", "town", 4], ["Thonotosassa", "town", 4], ["Dover", "town", 5.5], ["Gibsonton", "town", 4],
    ["Sun City Center", "town", 4], ["Ellenton", "town", 4], ["Carrollwood", "town", 4], ["Town 'n' Country", "town", 4],
    ["Westchase", "town", 5.5], ["Citrus Park", "town", 5.5], ["Odessa", "town", 5.5], ["East Lake", "town", 5.5],
    ["Holiday", "town", 4], ["New Port Richey", "town", 4], ["Trinity", "town", 5.5], ["Keystone", "town", 5.5],
    ["Belleair", "town", 5.5], ["Belleair Bluffs", "town", 5.5], ["Kenneth City", "town", 5.5], ["South Pasadena", "town", 5.5],
    ["Lealman", "town", 5.5], ["Feather Sound", "town", 5.5], ["Bay Pines", "town", 5.5], ["Wimauma", "town", 5.5],
    ["Fish Hawk", "town", 5.5], ["Progress Village", "town", 5.5], ["University", "town", 5.5], ["Lake Magdalene", "town", 5.5],
    ["Cortez", "town", 5.5], ["West Bradenton", "town", 5.5], ["Memphis", "town", 5.5],
    // the Gulf beach towns
    ["St. Pete Beach", "beach", 1.6], ["Treasure Island", "beach", 2.8], ["Madeira Beach", "beach", 2.8],
    ["Indian Rocks Beach", "beach", 2.8], ["Belleair Beach", "beach", 4], ["Indian Shores", "beach", 4],
    ["Redington Shores", "beach", 5.5], ["North Redington Beach", "beach", 5.5], ["Redington Beach", "beach", 5.5],
    ["Holmes Beach", "beach", 2.8], ["Anna Maria", "beach", 2.8], ["Bradenton Beach", "beach", 4], ["Tierra Verde", "beach", 2.8],
    ["Longboat Key", "beach", 4],
  ];
  for (const [name, kind, z] of TOWNS) { const p = placeAt(shared, name); L.at(name, p.lat, p.lng, kind, z); }
  // neighborhoods: Census locality points (TIGER POINTLM C3081) named in SPEC §4.1
  for (const [name, z] of [["Ybor City", 2.8], ["Palma Ceia", 5.5], ["Port Tampa", 5.5], ["Sulphur Springs", 5.5]]) {
    const p = shared.localities.get(name);
    if (!p) throw new Error(`no Census locality point named "${name}"`);
    L.at(name, p.lat, p.lng, "hood", z);
  }
  // islands and beach areas named in SPEC §4.1: the interior of their own TIGER land ring
  L.island("Clearwater Beach", [27.9776, -82.828], "beach", 1.6, undefined, 12);
  L.island("Davis Islands", [27.915, -82.455], "hood", 2.8);
  L.island("Harbour Island", [27.934, -82.4513], "hood", 4);
  L.island("Sand Key", [27.955, -82.8305], "beach", 4, undefined, 10);
  L.island("Pass-a-Grille", [27.688, -82.7375], "beach", 4, undefined, 8);
  L.island("Anna Maria Island", [27.5, -82.712], "island", 1.6, null);
  L.island("Egmont Key", [27.6009, -82.7604], "island", 2.8, null);
  L.island("Honeymoon Island", [28.07, -82.83], "island", 2.8, null);
  const ak = shared.localities.get("Anclote Key");
  if (ak) L.at("Anclote Key", ak.lat, ak.lng, "island", 4, null);
  // parks and airports: Census area-landmark and point-landmark internal points
  for (const [text, census, z] of [["Fort de Soto Park", "Fort de Soto Park", 2.8], ["Hillsborough River State Park", "Hillsborough River State Park", 4], ["Boyd Hill Nature Preserve", "Boyd Hill Nature Preserve", 5.5], ["Lake Manatee State Park", "Lake Manatee State Park", 5.5]]) {
    const p = shared.parks.get(census);
    if (p) L.at(text, p.lat, p.lng, "park", z, null); else log(`    ! no Census landmark "${census}"`);
  }
  for (const [text, census, z] of [["Tampa International Airport", "Tampa International Arprt", 1.6], ["St. Pete–Clearwater International Airport", "St Pete-Clearwater International Arprt", 2.8]]) {
    const p = shared.airports.get(census);
    if (p) L.at(text, p.lat, p.lng, "airport", z, null); else log(`    ! no Census airport "${census}"`);
  }
  // bridges and causeways (TIGER names of the crossing roads)
  L.bridge("Sunshine Skyway Bridge", ["Sunshine Skyway Brg", "Sunshine Skwy"], 1.6);
  L.bridge("Courtney Campbell Causeway", ["W Courtney Campbell Cswy", "Courtney Campbell Cswy"], 2.8);
  L.bridge("Gandy Boulevard", ["Gandy Blvd", "W Gandy Blvd", "Gandy Blvd N"], 2.8);
  L.bridge("Bayside Bridge", ["Bayside Brg"], 4);
  L.bridge("Pinellas Bayway", ["Pinellas Bayway", "Pinellas Bayway S"], 4);
  L.bridge("Clearwater Memorial Causeway", ["Clearwater Memorial Cswy"], 5.5);
  L.bridge("Davis Islands Bridge", ["Davis Islands Brg"], 5.5);
  L.bridge("Green Bridge", ["Green Brg"], 5.5);
  L.bridge("Desoto Bridge", ["Desoto Brg"], 5.5);
  // interstates (route markers)
  L.route("I-275", 1.6, 170);
  L.route("I-75", 1.6, 190);
  L.route("I-4", 1.6, 190);
  // the SPEC §4.1 areas not labelled above, at the points data/areas.json gives them (after the research merge;
  // re-run this script then)
  const areas = readJson(path.join(ROOT, "data", "areas.json"));
  if (Array.isArray(areas)) {
    const have = new Set(L.out.map((l) => l.id).filter(Boolean));
    const Z = { neighborhood: 4, district: 4, city: 2.8, "beach-town": 2.8, island: 2.8, "county-area": 2.2 };
    for (const a of areas) if (a && a.id && !have.has(a.id) && a.lat != null && a.lng != null && L.inFrame(a.lat, a.lng)) L.at(a.name, a.lat, a.lng, "area", Z[a.kind] || 4, a.id);
  }
  return L.out;
}
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } }

function regionLabels(map, shared) {
  const L = labelMaker(map, shared);
  L.water("Gulf of Mexico", ["Gulf of Mexico"], 1);
  L.water("Tampa Bay", ["Tampa Bay"], 1);
  L.water("Sarasota Bay", ["Sarasota Bay"], 2.2);
  L.water("Crystal Bay", ["Crystal Bay"], 2.2);
  L.water("Tsala Apopka Lake", ["Tsala Apopka Lk"], 2.2);
  L.water("Lake Weohyakapka", ["Lk Weohyakapka"], 2.8);
  L.water("Lake Apopka", ["Lk Apopka"], 2.8);
  L.water("Lake Hancock", ["Lk Hancock"], 2.8);
  L.water("Peace River", ["Peace Riv"], 2.8, { river: true });
  L.water("Myakka River", ["Myakka Riv"], 2.8, { river: true });
  for (const [name, kind, z] of [
    ["Tampa", "city", 1], ["St. Petersburg", "city", 1], ["Clearwater", "city", 1], ["Sarasota", "city", 1], ["Bradenton", "city", 1.6],
    ["Lakeland", "city", 1], ["Winter Haven", "town", 1.6], ["Lake Wales", "town", 2.2], ["Bartow", "town", 2.2], ["Plant City", "town", 2.2],
    ["Brooksville", "town", 1.6], ["Spring Hill", "town", 2.2], ["Crystal River", "town", 1.6], ["Homosassa Springs", "town", 2.2],
    ["Inverness", "town", 2.2], ["Dade City", "town", 2.2], ["Zephyrhills", "town", 2.8], ["Wesley Chapel", "town", 2.8],
    ["Tarpon Springs", "town", 2.2], ["New Port Richey", "town", 2.8], ["Venice", "town", 1.6], ["North Port", "town", 2.8],
    ["Arcadia", "town", 2.2], ["Wauchula", "town", 2.8], ["Sebring", "town", 2.2], ["Kissimmee", "town", 2.2], ["Clermont", "town", 2.2],
    ["Leesburg", "town", 2.2], ["The Villages", "town", 2.2], ["Punta Gorda", "town", 2.2], ["Port Charlotte", "town", 2.8],
    ["Anna Maria", "beach", 2.8], ["St. Pete Beach", "beach", 2.2], ["Ellenton", "town", 2.8],
  ]) { const p = shared.places.get(name); if (p) L.at(name, p.lat, p.lng, kind, z); else log(`    ! no Census place "${name}"`); }
  const ww = shared.localities.get("Weeki Wachee");
  if (ww) L.at("Weeki Wachee", ww.lat, ww.lng, "town", 1.6);
  for (const [text, z] of [["Myakka River State Park", 2.8], ["Hillsborough River State Park", 2.8], ["Withlacoochee State Forest", 2.8]]) {
    const p = shared.parks.get(text);
    if (p) L.at(text, p.lat, p.lng, "park", z, null); else log(`    ! no Census landmark "${text}"`);
  }
  for (const c of map.hy.counties) {
    const row = shared.countyRows[c.idx];
    L.at(row.NAME === "DeSoto" ? "DeSoto" : row.NAME, +row.INTPTLAT, +row.INTPTLON, "county", 2.2, null);
  }
  L.route("I-75", 1, 260);
  L.route("I-4", 1, 260);
  L.route("I-275", 1.6, 260);
  return L.out;
}

/* ---------- self-check: well-known points must project onto land, inside the frame ---------- */
/** Anchors for the projection and the land raster (a test, never output). */
const ANCHORS = [
  ["Tampa Theatre", 27.9504, -82.4588], ["The Dali Museum", 27.766, -82.6315], ["Pier 60", 27.9776, -82.828],
  ["Fort De Soto", 27.6205, -82.7359], ["Tampa International Airport", 27.9755, -82.5332],
];
function selfCheck(map) {
  let ok = true;
  for (const [name, lat, lng] of ANCHORS) {
    const [x, y] = project(lat, lng, map.F);
    const on = landAt(map, [x, y]);
    log(`  ${on ? "✓" : "✗"} ${name} → ${x.toFixed(1)}, ${y.toFixed(1)} ${on ? "on land" : "NOT on land"}`);
    if (!on) ok = false;
  }
  return ok;
}

/* ============================================================ main ============================================================ */
function main() {
  // shared Census layers
  const county = ensure(SRC.county);
  const countyRows = readDbf(county.dbf);
  const bigBox = { s: Math.min(CORE.s, REGION.s), n: Math.max(CORE.n, REGION.n), w: Math.min(CORE.w, REGION.w), e: Math.max(CORE.e, REGION.e) };
  const countyShp = readShp(county.shp, (bb, i) => countyRows[i].STATEFP === "12" && hits(bb, bigBox, 0.2));
  const prisecF = ensure(SRC.prisec), prisecRows = readDbf(prisecF.dbf);
  const prisec = readShp(prisecF.shp, (bb) => hits(bb, bigBox, 0.1));
  const railF = ensure(SRC.rails), railRows = readDbf(railF.dbf);
  const rails = readShp(railF.shp, (bb, i) => hits(bb, CORE, 0.1) && railRows[i].MTFCC === "R1011" && !/Abandoned/i.test(railRows[i].FULLNAME));
  const placeF = ensure(SRC.place), placeRows = readDbf(placeF.dbf);
  const places = new Map(placeRows.map((r) => [r.NAME, { lat: +r.INTPTLAT, lng: +r.INTPTLON, lsad: r.NAMELSAD }]));
  const plmF = ensure(SRC.pointlm), plmRows = readDbf(plmF.dbf);
  const localities = new Map(), airports = new Map();
  for (const p of readShp(plmF.shp, (bb) => hits(bb, bigBox, 0.1))) {
    const r = plmRows[p.idx];
    if (!r.FULLNAME) continue;
    if (r.MTFCC === "C3081" && !localities.has(r.FULLNAME)) localities.set(r.FULLNAME, { lat: p.y, lng: p.x });
    if (r.MTFCC === "K2451" && !airports.has(r.FULLNAME)) airports.set(r.FULLNAME, { lat: p.y, lng: p.x });
  }
  const almF = ensure(SRC.arealm), almRows = readDbf(almF.dbf);
  const parks = new Map();
  for (const r of almRows) if (/^K21[89]/.test(r.MTFCC) && r.FULLNAME && !parks.has(r.FULLNAME)) parks.set(r.FULLNAME, { lat: +r.INTPTLAT, lng: +r.INTPTLON });
  for (const p of readShp(plmF.shp, (bb) => hits(bb, bigBox, 0.1))) { const r = plmRows[p.idx]; if (/^K21[89]/.test(r.MTFCC) && r.FULLNAME && !parks.has(r.FULLNAME)) parks.set(r.FULLNAME, { lat: p.y, lng: p.x }); }

  // local roads that cross water, and every road's alternate names (FEATNAMES), for the four counties on the bay
  // (a crossing is known by every name of its feature: I-275 is "Sunshine Skyway Brg" on the bridge)
  const localRoads = [];
  const altNames = new Map(); // LINEARID → [names]
  for (const fips of ROAD_COUNTIES) {
    const fn = ensure(SRC.featnames(fips));
    for (const r of readDbf(fn.dbf)) { if (!r.FULLNAME) continue; if (!altNames.has(r.LINEARID)) altNames.set(r.LINEARID, []); altNames.get(r.LINEARID).push(r.FULLNAME); }
  }
  const namesOf = (id, primary) => [...new Set([primary, ...(altNames.get(id) || [])].filter(Boolean))];
  for (const fips of ROAD_COUNTIES) {
    const rf = ensure(SRC.roads(fips)), rrows = readDbf(rf.dbf);
    for (const r of readShp(rf.shp, (bb, i) => rrows[i].MTFCC === "S1400" && hits(bb, CORE, 0.02))) {
      const row = rrows[r.idx];
      localRoads.push({ bbox: r.bbox, parts: r.parts, names: namesOf(row.LINEARID, row.FULLNAME) });
    }
  }
  for (const r of prisec) r.names = namesOf(prisecRows[r.idx].LINEARID, prisecRows[r.idx].FULLNAME);

  // the label vocabulary: Census names (expanded), their leading word runs, SPEC phrases
  const census = new Set();
  const addName = (n) => { if (!n) return; census.add(n); census.add(expand(n)); census.add(routeText(n)); };
  for (const r of placeRows) addName(r.NAME);
  for (const r of plmRows) addName(r.FULLNAME);
  for (const r of almRows) addName(r.FULLNAME);
  for (const r of prisecRows) addName(r.FULLNAME);
  for (const r of countyRows) if (r.STATEFP === "12") addName(r.NAME);
  for (const [, ns] of altNames) for (const n of ns) addName(n);
  const spec = fs.readFileSync(path.join(ROOT, "SPEC.md"), "utf8");
  const areaIds = new Set();
  const areaNames = new Set((readJson(path.join(ROOT, "data", "areas.json")) || []).filter((a) => a && a.name).map((a) => a.name));
  const schema = path.join(ROOT, "research", "tools", "schema.mjs");
  if (fs.existsSync(schema)) { const m = fs.readFileSync(schema, "utf8").match(/export const AREAS = \{([\s\S]*?)\};/); if (m) for (const k of m[1].matchAll(/"?([a-z0-9-]+)"?\s*:/g)) areaIds.add(k[1]); }
  const shared = { countyShp, countyRows, prisec, prisecRows, rails, places, localities, airports, parks, localRoads, areaIds, census };
  shared.verify = (text) => {
    if (census.has(text)) return text;
    // a leading run of words of a Census name ("Honeymoon Island" of "Honeymoon Island State Rec Area")
    for (const n of census) if (n.startsWith(text + " ") && text.split(" ").length >= 2) return text;
    // a phrase of SPEC.md (area names, "Anna Maria Island", "Egmont Key"…)
    if (new RegExp(`(^|[^A-Za-z])${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z]|$)`).test(spec)) return text;
    // an area's name ("Clearwater Beach" ↔ clearwater-beach, or the name data/areas.json gives an area id)
    if (areaIds.has(slug(text)) || areaNames.has(text)) return text;
    throw new Error(`label "${text}" is not a Census name, a SPEC.md phrase or an area name`);
  };

  // build
  const core = buildMap("core", shared);
  for (const w of core.hy.water) addName(w.name);

  const region = buildMap("region", shared);
  for (const w of region.hy.water) addName(w.name);

  log("\nanchors (core)");
  const anchorsOk = selfCheck(core);
  log("\nlabels");
  const labels = coreLabels(core, shared);
  const rlabels = regionLabels(region, shared);
  log(`  core ${labels.length}, region ${rlabels.length}`);

  const projBlock = (F) => ({ lat0: F.lat0, k: F.k, sx: F.sx, scale: F.sx, viewBox: [F.W, F.H], mPerUnit: F.mPerUnit });
  const mapJson = {
    bbox: { core: CORE, home: HOME },
    projection: projBlock(core.F),
    labels,
    transit: { name: null, stops: [] },
    graticule: core.grat.json,
    region: { bbox: { core: REGION, home: REGION }, projection: projBlock(region.F), labels: rlabels, graticule: region.grat.json, file: "region.svg" },
    attribution: "U.S. Census Bureau, TIGER/Line Shapefiles 2024 (public domain)",
    source: "TIGER/Line 2024: COUNTY, AREAWATER, PRISECROADS, ROADS, FEATNAMES, RAILS, PLACE, POINTLM, AREALM",
    source_url: "https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html",
    tiger_vintage: "2024",
  };

  let fail = false;
  for (const m of [core, region]) {
    const gz = zlib.gzipSync(Buffer.from(m.svg), { level: 9 }).length / 1024;
    log(`\n${m.S.file}: ${(m.svg.length / 1024).toFixed(1)} KB, ${gz.toFixed(1)} KB gzipped (budget ${m.S.budgetKB} KB)`);
    log(`  bytes per layer: land ${m.stats.land}, coast ${m.stats.coast}, lining ${m.stats.lining.join("/")}, lakes ${m.stats.lakes}, rail ${m.stats.rail}, roads ${JSON.stringify(m.stats.roads)}`);
    if (gz > m.S.budgetKB) { console.error(`✗ ${m.S.file} is ${gz.toFixed(1)} KB gzipped: over the ${m.S.budgetKB} KB budget. Raise eps or drop a layer.`); fail = true; }
  }
  if (VERBOSE) for (const l of labels) log(`  ${l.kind.padEnd(7)} ${String(l.minZoom).padEnd(4)} ${l.text}${l.id ? ` (#${l.id})` : ""} ${l.lat},${l.lng}${l.angle ? ` ∠${l.angle}` : ""}`);
  log(`\n${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (OUT) {
    // a trial build for review (written even when over budget): <dir>/basemap.svg, region.svg, map.json
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, "basemap.svg"), core.svg);
    fs.writeFileSync(path.join(OUT, "region.svg"), region.svg);
    fs.writeFileSync(path.join(OUT, "map.json"), JSON.stringify(mapJson, null, 2) + "\n");
    log(`✓ wrote a trial build to ${OUT}`);
  }
  if (!anchorsOk) { console.error("✗ an anchor point is not on land: the projection or the land raster is wrong"); fail = true; }
  if (fail) process.exit(1);
  if (CHECK || OUT) return;
  fs.mkdirSync(path.join(ROOT, "site", "map"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "site", "map", "basemap.svg"), core.svg);
  fs.writeFileSync(path.join(ROOT, "site", "map", "region.svg"), region.svg);
  fs.writeFileSync(path.join(ROOT, "data", "map.json"), JSON.stringify(mapJson, null, 2) + "\n");
  log("✓ wrote site/map/basemap.svg, site/map/region.svg and data/map.json");
}

main();
