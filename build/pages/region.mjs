/* ============================================================
   build/pages/region.mjs · OWNER: the Home & Sheets lane
   The six sheet pages (build/nav.mjs REGION_PAGES): tampa.html, st-petersburg.html, gulf-beaches.html,
   clearwater.html, around-the-bay.html, day-trips.html. Each is one chart sheet of the chartbook:
     the sheet head (the label frame in the sheet's ink: "Sheet 1 · TP", name, lede, known_for, counts, the
       official visitor site), the sheet chart (a crop of the basemap, or of the region overview when the sheet
       reaches past it: its areas named, its signature places as numbered buoys, the limits printed from the
       crop's real georeference) with its key, then: areas, signature places, things to do by family,
       beaches and outdoors, where to stay, what's on in the next 60 days (server list + live states; the
       client, site/js/features/region.js, moves the 60-day window to the reader's clock), every year on this
       sheet, experiences that depart here, historic places and the sheet's timeline, eat and drink highlights,
       getting around, and the sources.
   Everything is computed from data/; unknowns print as unknowns. Pages never read the build date (docs/ must
   rebuild byte for byte on any day): the no-JS 60-day list is the first 60 days of dataWindow.
   The helpers below are exported for build/pages/home.mjs (the chart index, signature places, event rows).
   ============================================================ */
import { PLACE_GROUP, PLACE_GROUP_LABEL, PLACE_KIND_LABEL, EXPERIENCE_GROUP, EXPERIENCE_GROUP_LABEL, EXPERIENCE_KIND_LABEL, STAY_KIND_LABEL, FEATURE_LABEL, MODE_LABEL, ERA_NAME, ERAS, EVENT_KIND_LABEL } from "../core/vocab.mjs";
import { metaOf, project, unproject, onMap, cluster } from "../../site/js/lib/geo.js";
import { addDays, daysBetween, fmtTime, fmtRange, fmtDay, fmtDate, fmtDateRange, fmtThrough, isoLocal, monthKey, fmtMonth, dowShort, nyParts } from "../core/time.mjs";

/* ====================================================================== shared helpers (home.mjs imports them) */

/** Place kinds in the order a first-time visitor looks for them (the "first by kind priority" rule). */
export const KIND_PRIORITY = ["theme-park", "zoo", "aquarium", "museum", "landmark", "beach", "state-park", "waterfront", "pier",
  "historic-district", "attraction", "water-park", "science-center", "garden", "park", "nature-preserve", "island", "performing-arts",
  "district", "market", "arena-stadium", "historic-site", "gallery", "music-venue", "food-hall", "trail", "sports", "shopping",
  "restaurant", "cafe-bakery", "brewery", "distillery-winery", "bar", "nightlife", "casino", "cemetery", "house-of-worship", "visitor-center"];
/** Group order for a varied pick (one of each before a second of any). */
export const GROUP_ORDER = ["attractions", "outdoors", "history", "arts", "shopping", "sports", "eat", "drink", "info"];
const kindIdx = (p) => { const i = KIND_PRIORITY.indexOf(p.kind); return i < 0 ? 99 : i; };
/** How often the guide refers to a place (its events, series, departures, timeline entries, heritage block). */
export const refsOf = (p) => (p.events?.length || 0) + (p.series?.length || 0) + (p.experiences?.length || 0) + (p.timeline?.length || 0) + (p.heritage ? 1 : 0);
const stRank = (r) => (r.status === "open" ? 0 : r.status === "seasonal" ? 1 : r.status === "opening-soon" ? 2 : 3);
/** Places in pick order: open first, signature first, then kind priority, then how often the guide refers to them, then name. */
export const rankPlaces = (h, list) => h.sortBy(list, stRank, (p) => (p.signature ? 0 : 1), kindIdx, (p) => -refsOf(p), (p) => p.name.toLowerCase());

/** n places for a sheet: signature places first (one per family before a second of any), then, when a sheet has
 *  fewer than n, the first by kind priority. → { list, signature: how many of them are signature places }. */
export function sheetPicks(h, places, n = 3) {
  const open = places.filter((p) => p.status !== "closed");
  const ranked = rankPlaces(h, open);
  const sig = ranked.filter((p) => p.signature);
  const out = [];
  for (const g of GROUP_ORDER) { if (out.length >= n) break; const p = sig.find((x) => PLACE_GROUP[x.kind] === g && !out.includes(x)); if (p) out.push(p); }
  for (const p of sig) { if (out.length >= n) break; if (!out.includes(p)) out.push(p); }
  const nSig = out.length;
  for (const g of GROUP_ORDER) { if (out.length >= n) break; const p = ranked.find((x) => PLACE_GROUP[x.kind] === g && !out.includes(x)); if (p) out.push(p); }
  for (const p of ranked) { if (out.length >= n) break; if (!out.includes(p)) out.push(p); }
  return { list: out, signature: nSig };
}

const ABBR = /^(St|Ste|Ft|Mt|Dr|Mr|Mrs|Ms|Jr|Sr|No|Ave|Blvd|Rd|U\.S|Inc|Co|vs|Pt|[A-Z])$/;
/** The first sentence of a text (abbreviations like "St." do not end it). */
export function firstSentence(t) {
  if (!t) return "";
  const re = /[.!?](?=\s+["“(]?[A-Z0-9])/g;
  let m;
  while ((m = re.exec(t))) {
    const word = t.slice(0, m.index).split(/\s+/).pop().replace(/^[("“]/, "");
    if (ABBR.test(word)) continue;
    return t.slice(0, m.index + 1);
  }
  return t;
}
/** A short name for map labels: "Channel District & Water Street" → "Channel District", "Lakeland, Winter Haven & Polk County" → "Lakeland". */
export const shortArea = (name) => String(name).split(" & ")[0].split(", ")[0];

/** The listing days of an event (runs: none), its first and last day inside the window. */
export function evSpan(db, ev) {
  const inst = ev.instances || [];
  if (!inst.length) return { days: [], first: ev.date, last: ev.date };
  if (inst[0].run) return { days: [], first: inst[0].date, last: inst[0].through < db.window.end ? inst[0].through : db.window.end, run: true };
  const days = [...new Set(inst.map((x) => x.day))].sort();
  return { days, first: days[0], last: days[days.length - 1] };
}
/** "Sat, Oct 24" · "Feb 4–15" · "Oct 3, Oct 10 and Oct 17" · "12 dates, Oct 3 to Dec 19" · "Through Jan 10, 2027" */
export function dateText(h, db, ev) {
  const sp = evSpan(db, ev);
  const x = ev.instances?.[0];
  if (x?.run) return fmtThrough(x.through, x.date);
  if (sp.days.length <= 1) return fmtDay(sp.first);
  if (daysBetween(sp.first, sp.last) + 1 === sp.days.length) return fmtDateRange(sp.first, sp.last);
  if (sp.days.length <= 4) return h.listJoin(sp.days.map(fmtDate));
  return `${sp.days.length} dates, ${fmtDate(sp.first)} to ${fmtDate(sp.last)}`;
}
/** The hours words of an event's first instance: "7:00–10:00 PM", "7:00 PM", "All day", its time_text, or "". */
export function hoursText(h, ev, x = ev.instances?.[0]) {
  if (!x) return "";
  if (x.allDay) return "All day";
  if (x.timeUnknown) return ev.time_text ? h.truncate(ev.time_text, 72) : "";
  return x.end ? fmtRange(x.start, x.end) : fmtTime(x.start);
}
/** Where an event is, as text: its place, else the source's location text (HTML: unknowns as unknowns). */
export const whereHtml = (h, c, ev) => (ev.venue ? h.esc(ev.venue.name) : ev.location_text ? h.esc(ev.location_text) : c.unk("Place not listed"));

/** The live-state attributes core/status.js reads (build/CONTRACTS.md §8) for an event's instances. */
export function liveAttrs(ev) {
  const all = ev.instances || [];
  const x = all[0];
  if (!x) return "";
  const multi = all.length > 1;
  return ` data-s="${x.s}" data-e="${x.e}"`
    + (multi && !x.timeUnknown ? ` data-inst="${all.map((y) => `${y.s}:${y.e}`).join(",")}"` : "")
    + (multi || x.timeUnknown ? ` data-days="${[...new Set(all.map((y) => y.day))].join(" ")}"` : "")
    + (x.run ? ` data-run="${x.through}"` : "")
    + (x.endUnknown ? ' data-end-unknown="1"' : "")
    + (x.timeUnknown ? ' data-time-unknown="1"' : "")
    + (x.allDay ? ' data-all-day="1"' : "")
    + (ev.live ? "" : ' data-cancelled="1"');
}

/** A time-first row for a day's list (inside <ol class="tonight evrows">): the time (or "All day", or a clock for the
 *  source's own time words, or "Time not listed"), the sheet mark, the title, "date · hours · place", the live word. */
export function timeRow(ctx, root, inst, { withDate = false } = {}) {
  const { h, c } = ctx;
  const ev = inst.ev;
  const timed = inst.start && !inst.timeUnknown && !inst.allDay;
  const [hm, ap] = timed ? fmtTime(inst.start).split(" ") : ["", ""];
  const tcol = timed ? `<time datetime="${isoLocal(inst.s)}">${h.esc(hm)}<small>${h.esc(ap)}</small></time>`
    : inst.allDay ? "<time><small>All day</small></time>"
      : ev.time_text ? `<time>${h.icon("clock")}</time>` : "<time><small>Time not listed</small></time>";
  const bits = [withDate ? h.esc(inst.run ? fmtThrough(inst.through, inst.date) : fmtDay(inst.day)) : "",
    timed && inst.end ? h.esc(fmtRange(inst.start, inst.end)) : timed ? c.unk("end time not listed") : inst.timeUnknown && ev.time_text ? h.esc(h.truncate(ev.time_text, 72)) : "",
    whereHtml(h, c, ev)].filter(Boolean);
  return `<li class="evrow" data-ev="${h.attr(ev.id)}"${ev.region ? ` data-sheet="${ev.region}"` : ""}${liveAttrs({ ...ev, instances: [inst] })}><a href="${root}whats-on.html?e=${h.attr(ev.id)}#e-${h.attr(ev.id)}" data-open-event="${h.attr(ev.id)}">${tcol}${ev.region ? h.bullet(ev.region) : '<span aria-hidden="true"></span>'}<span><span class="t">${h.esc(ev.title)}</span>${c.eventStatusBadge(ev)}<span class="w">${bits.join(" · ")} <span class="evr-st" data-status></span></span></span></a></li>`;
}

/** A date-first row for a sheet's coming weeks (inside <ol class="evrows dated">): a date box (the next listing day;
 *  a long run shows its last day under "Thru"), the title, "dates · hours · place", the live word.
 *  data-days / data-first / data-last let features/region.js move it with the clock. */
export function dateRow(ctx, root, ev, { hidden = false } = {}) {
  const { h, c, db } = ctx;
  const sp = evSpan(db, ev);
  const x = ev.instances[0];
  const box = x.run ? ["Thru", Number(x.through.slice(8)), fmtDate(x.through).split(" ")[0]] : [dowShort(sp.first), Number(sp.first.slice(8)), fmtDate(sp.first).split(" ")[0]];
  const multi = (ev.instances.length > 1 || x.run);
  const hours = hoursText(h, ev, x);
  const bits = [multi ? h.esc(dateText(h, db, ev)) : "", hours ? h.esc(hours) : x.timeUnknown ? c.unk("Time not listed") : "",
    x.start && !x.timeUnknown && !x.allDay && !x.end ? c.unk("end time not listed") : "", whereHtml(h, c, ev)].filter(Boolean);
  return `<li class="evrow" data-ev="${h.attr(ev.id)}"${ev.region ? ` data-sheet="${ev.region}"` : ""} data-first="${sp.first}" data-last="${sp.last}"${sp.days.length ? ` data-listing="${sp.days.join(" ")}"` : ""}${liveAttrs(ev)}${hidden ? " hidden" : ""}><a href="${root}whats-on.html?e=${h.attr(ev.id)}#e-${h.attr(ev.id)}" data-open-event="${h.attr(ev.id)}"><span class="dbox" aria-hidden="true"><span class="dw">${h.esc(box[0])}</span><span class="d">${box[1]}</span><span class="mo">${h.esc(box[2])}</span></span><span><span class="evr-k">${h.esc(EVENT_KIND_LABEL[ev.kind] || ev.kind)}</span>${c.eventStatusBadge(ev)}<span class="t">${h.esc(ev.title)}</span><span class="w"><span class="sr-only">${h.esc(multi ? "" : fmtDay(sp.first) + ", ")}</span>${bits.join(" · ")} <span class="evr-st" data-status></span></span></span></a></li>`;
}

/** The next featured (signature) event of a list of events, counted from a date (live events only). */
export const nextFeatured = (db, events, fromDay) => events.find((e) => e.live && e.featured && e.instances.length && evSpan(db, e).last >= fromDay) || null;

/** The area of a sheet with the most places in the guide (then the most events): the distance tables' "main area". */
export const principalArea = (h, region) => h.sortBy(region.areas.filter((a) => a.lat != null), (a) => -a.places.length, (a) => -a.events.length, (a) => a.name)[0] || null;

/** Metres → "4.2 mi" (straight-line: callers say so). */
export const miles = (m) => { const mi = m / 1609.344; return `${mi < 9.95 ? mi.toFixed(1) : Math.round(mi)} mi`; };

/* ---------------------------------------------------------------- the sheet chart
   A static crop of the basemap (or of the region overview, site/map/region.svg, for a sheet that reaches past the
   basemap) fitting the sheet's areas and its numbered places, its shape following theirs (landscape to portrait).
   Area names are map labels; places are numbered can buoys (numbered in reading order, north to south), merged into
   one buoy with a range ("5–9") where they sit too close to show apart at phone width. The biggest such group gets an
   inset at a larger scale (a harbor inset, as on a printed chart), outlined and lettered on the main chart. The
   crop's limits are printed from the real georeference. Plain SVG + HTML, no JS. null without a basemap. */
const NOMINAL = { phone: 340, wide: 480 };
const textW = (s, kind) => s.length * (kind === "water" ? 7.2 : 8.8) + 6;
const RANGE = (ns) => { const a = [...ns].sort((x, y) => x - y); return a.length === 1 ? String(a[0]) : a.every((v, i) => !i || v === a[i - 1] + 1) ? `${a[0]}–${a[a.length - 1]}` : a.join(", "); };

function fitCrop(meta, xy, { ratio, pad, minHalfM }) {
  const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
  let x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const minU = (2 * minHalfM) / meta.mPerUnit;
  let w = Math.max(x1 - x0, minU), hh = Math.max(y1 - y0, minU / ratio);
  if (w / hh > ratio) hh = w / ratio; else w = hh * ratio;
  if (w > meta.W) { w = meta.W; hh = w / ratio; }
  if (hh > meta.H) { hh = meta.H; w = hh * ratio; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  x0 = Math.min(Math.max(0, cx - w / 2), meta.W - w); y0 = Math.min(Math.max(0, cy - hh / 2), meta.H - hh);
  return { x0, y0, w, hh, ratio };
}
/** Fit twice: the second pass leaves room above each buoy for its body (about 52px at the wide width) and beside it. */
function fitWithBuoys(meta, pts, bxy, opt) {
  let f = fitCrop(meta, pts, opt);
  const upp = f.hh / (NOMINAL.wide / opt.ratio);
  return fitCrop(meta, [...pts, ...bxy.flatMap(([x, y]) => [[x, y - 52 * upp], [x - 22 * upp, y], [x + 22 * upp, y + 4 * upp]])], opt);
}
const pctIn = (crop, meta, lat, lng, m = 1) => {
  if (!onMap(meta, lat, lng)) return null;
  const [x, y] = project(lat, lng, meta);
  const px = ((x - crop.x0) / crop.w) * 100, py = ((y - crop.y0) / crop.hh) * 100;
  return px >= m && px <= 100 - m && py >= m && py <= 100 - m ? [px, py] : null;
};
/** Buoys for places inside a crop, clustered at phone width; numbers are assigned in reading order unless given. */
function buoysIn(h, crop, meta, places, { numbers = null, radius = 30 } = {}) {
  const ratio = crop.ratio, W = NOMINAL.phone, H = W / ratio;
  const pts = places.map((p, i) => { const at = p.ll ? pctIn(crop, meta, p.ll[0], p.ll[1]) : null; return at ? { p, i, px: at[0], py: at[1], x: (at[0] / 100) * W, y: (at[1] / 100) * H } : null; }).filter(Boolean);
  const groups = h.sortBy(cluster(pts, radius), (g) => Math.round(g.y / 36), (g) => g.x);
  const nums = numbers || new Map();
  let n = 0;
  return groups.map((g) => {
    const ms = h.sortBy(g.members, (m) => m.i);
    if (!numbers) for (const m of ms) nums.set(m.p.id, ++n);
    const px = ms.reduce((s, m) => s + m.px, 0) / ms.length, py = ms.reduce((s, m) => s + m.py, 0) / ms.length;
    return { label: RANGE(ms.map((m) => nums.get(m.p.id))), px, py, members: ms.map((m) => m.p), numbers: nums };
  });
}
/** Labels placed greedily clear of the buoys and of each other: the point, then around it; checked at phone width
 *  first, then at the wide width (such a label is hidden on phones). */
function labelsIn(crop, meta, cands, buoys) {
  const ratio = crop.ratio;
  const bBox = (b, W) => { const H = W / ratio, bw = b.label.length > 2 ? 12 + b.label.length * 7.5 : 30; return { x: b.px, y: b.py - (19 / H) * 100, hw: (bw / 2 / W) * 100, hh: (30 / H) * 100 }; };
  const boxes = { phone: buoys.map((b) => bBox(b, NOMINAL.phone)), wide: buoys.map((b) => bBox(b, NOMINAL.wide)) };
  const sizeAt = (l, W) => ({ hw: (textW(l.text, l.kind) / 2 / W) * 100, hh: (9 / (W / ratio)) * 100 });
  const clear = (k, b) => b.x - b.hw > 1 && b.x + b.hw < 99 && b.y - b.hh > 1 && b.y + b.hh < 99 && !boxes[k].some((o) => Math.abs(o.x - b.x) < o.hw + b.hw && Math.abs(o.y - b.y) < o.hh + b.hh);
  const out = [];
  for (const l of cands) {
    const at = pctIn(crop, meta, l.lat, l.lng, 0);
    if (!at) continue;
    let placed = null;
    for (const [k, W] of [["phone", NOMINAL.phone], ["wide", NOMINAL.wide]]) {
      const s = sizeAt(l, W), H = W / ratio, sx = (s.hw * W) / 100 + 12;
      const offs = l.kind === "water" ? [[0, 0]] : [[0, 0], [0, 16], [0, -16], [sx, 0], [-sx, 0], [0, 30], [0, -30], [sx, 14], [-sx, 14], [sx, -14], [-sx, -14]];
      for (const [dx, dy] of offs) {
        const b = { x: at[0] + (dx / W) * 100, y: at[1] + (dy / H) * 100, hw: s.hw, hh: s.hh };
        if (clear(k, b)) { placed = { k, b }; break; }
      }
      if (placed) break;
    }
    if (!placed) continue;
    const { k, b } = placed;
    boxes[k].push(b);
    if (k === "phone") { const s2 = sizeAt(l, NOMINAL.wide); boxes.wide.push({ ...b, hw: s2.hw, hh: s2.hh }); }
    out.push({ ...l, px: b.x, py: b.y, pri: k === "phone" ? 1 : 2 });
  }
  return out;
}
function mapHtml(h, root, file, crop, labels, buoys, { label, sheet, cls = "", extra = "" }) {
  const lab = (l) => `<span class="map-label ${l.kind === "water" ? "water" : l.kind === "city" ? "hood city-l" : "hood area-l"}${l.pri === 2 ? " wide-only" : ""}" style="left: ${l.px.toFixed(1)}%; top: ${l.py.toFixed(1)}%${l.angle ? `; --a: ${l.angle}deg` : ""}">${h.esc(l.text)}</span>`;
  const buoy = (b) => `<span class="pin pin-place${b.label.length > 2 ? " pin-range" : ""}" data-sheet="${sheet}" style="left: ${b.px.toFixed(2)}%; top: ${b.py.toFixed(2)}%"><span>${h.esc(b.label)}</span></span>`;
  return `<div class="mini-map area-map sheet-map-view${cls ? " " + cls : ""}" style="--map-ratio: ${crop.w.toFixed(1)} / ${crop.hh.toFixed(1)}" role="img" aria-label="${h.attr(label)}"><svg viewBox="${crop.x0.toFixed(1)} ${crop.y0.toFixed(1)} ${crop.w.toFixed(1)} ${crop.hh.toFixed(1)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><use href="${root}assets/map/${file}#bm"/></svg><span class="mini-labels" aria-hidden="true">${labels.map(lab).join("")}</span>${extra}${buoys.map(buoy).join("")}</div>`;
}
const limitsOf = (meta, c) => {
  const [latN, lngW] = unproject(c.x0, c.y0, meta), [latS, lngE] = unproject(c.x0 + c.w, c.y0 + c.hh, meta);
  const f = (v) => Math.abs(v).toFixed(2);
  return `${f(latS)}°–${f(latN)}° ${latN >= 0 ? "N" : "S"}, ${f(lngE)}°–${f(lngW)}° ${lngW < 0 ? "W" : "E"}`;
};

export function sheetChart(ctx, root, { region, places = [], areas = [], overview = null, label = "" }) {
  const { db, h } = ctx;
  const core = db.basemap ? metaOf(db.map) : null;
  const reg = db.basemap && db.map?.region ? metaOf(db.map.region) : null;
  const pts = [...areas.filter((a) => a.lat != null).map((a) => ({ lat: a.lat, lng: a.lng })), ...places.filter((p) => p.ll).map((p) => ({ lat: p.ll[0], lng: p.ll[1] }))];
  if (!pts.length) return null;
  const useCore = overview === false || (overview !== true && core && pts.every((p) => onMap(core, p.lat, p.lng)));
  const meta = useCore ? core : reg || core;
  if (!meta) return null;
  const file = meta === reg ? (db.map.region.file || "region.svg") : "basemap.svg";
  const on = pts.filter((p) => onMap(meta, p.lat, p.lng)).map((p) => project(p.lat, p.lng, meta));
  if (!on.length) return null;
  // the crop's shape follows the sheet's: between 3:4 (a strip of beaches) and 4:3
  const xs = on.map((p) => p[0]), ys = on.map((p) => p[1]);
  const nat = (Math.max(...xs) - Math.min(...xs) + 1) / (Math.max(...ys) - Math.min(...ys) + 1);
  const ratio = nat < 0.8 ? 3 / 4 : nat < 1.15 ? 1 : 4 / 3;
  const bxy = places.filter((p) => p.ll && onMap(meta, p.ll[0], p.ll[1])).map((p) => project(p.ll[0], p.ll[1], meta));
  const crop = fitWithBuoys(meta, on, bxy, { ratio, pad: meta === reg ? 18 : 28, minHalfM: 1400 });
  const buoys = buoysIn(h, crop, meta, places);
  const numbers = buoys[0]?.numbers || new Map();
  const areaCands = h.sortBy(areas.filter((a) => a.lat != null), (a) => -(a.places.length + a.stays.length + a.events.length), (a) => a.name).map((a) => ({ text: shortArea(a.name), lat: a.lat, lng: a.lng, kind: "area" }));
  const mlabels = (meta === reg ? db.map.region.labels : db.map.labels) || [];
  const water = mlabels.filter((l) => l.kind === "water" && (l.minZoom || 1) <= 1.6).map((l) => ({ text: l.text, lat: l.lat, lng: l.lng, kind: "water", angle: l.angle || 0 }));
  const cities = meta === reg ? mlabels.filter((l) => l.kind === "city" && (l.minZoom || 1) <= 1).map((l) => ({ text: l.text, lat: l.lat, lng: l.lng, kind: "city" })) : [];
  const labels = labelsIn(crop, meta, [...areaCands, ...water, ...cities], buoys);

  // the inset: the biggest group of three or more places, at a larger scale
  const big = h.sortBy(buoys.filter((b) => b.members.length >= 3), (b) => -b.members.length)[0];
  let inset = null;
  if (big) {
    const mxy = big.members.map((p) => project(p.ll[0], p.ll[1], meta));
    const ic = fitWithBuoys(meta, mxy, mxy, { ratio: 4 / 3, pad: 6, minHalfM: 700 });
    const ib = buoysIn(h, ic, meta, big.members, { numbers, radius: 24 });
    const inAreas = areaCands.filter((a) => pctIn(ic, meta, a.lat, a.lng, 4));
    const il = labelsIn(ic, meta, inAreas, ib);
    const home = h.sortBy([...h.groupBy(big.members, (p) => p.area)], ([, l]) => -l.length)[0][0];
    const name = db.byId.area.get(home)?.name || "";
    // the inset's outline on the main chart
    const tl = [((ic.x0 - crop.x0) / crop.w) * 100, ((ic.y0 - crop.y0) / crop.hh) * 100], wh = [(ic.w / crop.w) * 100, (ic.hh / crop.hh) * 100];
    const box = `<span class="inset-box" style="left: ${tl[0].toFixed(2)}%; top: ${tl[1].toFixed(2)}%; width: ${wh[0].toFixed(2)}%; height: ${wh[1].toFixed(2)}%" aria-hidden="true"><span>A</span></span>`;
    inset = {
      name, limits: limitsOf(meta, ic),
      html: mapHtml(h, root, file, ic, il, ib, { label: `Inset A, ${name}: places ${big.label} shown apart`, sheet: region.id, cls: "inset-map" }),
      box, label: big.label,
    };
  }
  const html = mapHtml(h, root, file, crop, labels, buoys, { label: label || `Chart of ${region.name}`, sheet: region.id, extra: inset ? inset.box : "" });
  return { html, numbers, limits: limitsOf(meta, crop), overview: meta === reg, clustered: buoys.some((b) => b.label.length > 2), inset };
}

/* ====================================================================== the pages */

const OUT_GROUPS = ["attractions", "arts", "sports", "shopping"];           // "things to do" (outdoors, history, eat, drink have their own sections)
const OUTDOOR_ORDER = ["beach", "state-park", "island", "park", "nature-preserve", "garden", "trail", "pier", "waterfront"];
const EXP_GROUPS = ["water", "tours", "taste", "adventure"];
/** Eat & drink highlight tags, strongest first, with their words. */
export const EAT_TAGS = [
  ["michelin-star", "Michelin star"], ["michelin-bib-gourmand", "Michelin Bib Gourmand"], ["michelin-recommended", "Michelin Guide"],
  ["james-beard-award", "James Beard Award"], ["historic-restaurant", "Historic restaurant"], ["landmark-restaurant", "Landmark restaurant"],
  ["cuban-sandwich", "Cuban sandwich"], ["seafood", "Seafood"], ["craft-beer", "Craft beer"], ["rooftop", "Rooftop"],
];
const TRANSPORT_FAMILY = { airport: "arrive", "cruise-port": "arrive", rail: "arrive", "intercity-bus": "arrive", streetcar: "transit", "water-taxi": "transit", ferry: "transit", bus: "transit", brt: "transit", trolley: "transit", microtransit: "transit", "bike-share": "bike", scooter: "bike", trail: "bike", toll: "drive", parking: "drive", "car-rental": "drive", rideshare: "drive" };
const FAMILY_LABEL = { arrive: "Arriving", transit: "Transit, trolleys and boats", bike: "Bikes and scooters", drive: "Driving, parking and tolls" };
const MODE_ICON = { airport: "plane", "cruise-port": "ferry", rail: "tram", "intercity-bus": "bus", streetcar: "tram", "water-taxi": "boat", ferry: "ferry", bus: "bus", brt: "bus", trolley: "trolley", microtransit: "car", "bike-share": "bike", scooter: "bike", trail: "trail", toll: "car", parking: "parking", "car-rental": "car", rideshare: "car" };
const GROUP_ICON = { attractions: "ticket", arts: "landmark", sports: "flag", shopping: "bag", water: "boat", tours: "walk", taste: "glass", adventure: "binoculars" };

export function pages(ctx) {
  const { db, c, h, cards, nav, seo, config, img } = ctx;
  const W0 = db.window.start;
  const until = addDays(W0, 59);                       // the no-JS 60-day list: the first 60 days of the window

  const RP = nav.REGION_PAGES;
  const sheetLink = (x) => (x ? { href: `${x.slug}.html`, label: `Sheet ${db.byId.region.get(x.region).n} · ${x.label}` } : null);
  const prevSheet = (rp) => sheetLink(RP[RP.indexOf(rp) - 1]), nextSheet = (rp) => sheetLink(RP[RP.indexOf(rp) + 1]);
  return RP.map((rp) => {
    const r = db.byId.region.get(rp.region);
    const path = `${rp.slug}.html`;
    const S = `Sheet ${r.n}`;
    const areasWith = r.areas;
    const open = r.places.filter((p) => p.status !== "closed");
    const sig = rankPlaces(h, open.filter((p) => p.signature));
    const keyPlaces = sig.length ? sig : sheetPicks(h, open, 6).list;
    const keyWord = sig.length ? "Signature places" : "Places to start";

    /* ---------- the chart ---------- */
    const chart = sheetChart(ctx, "ROOT/", {
      region: r, places: keyPlaces, areas: areasWith, overview: r.id === "daytrips" ? true : null,
      label: `Chart of ${r.name}: ${h.plural(areasWith.filter((a) => a.lat != null).length, "area")} named and ${h.plural(keyPlaces.length, sig.length ? "signature place" : "place")} numbered`,
    });
    const numbers = chart ? chart.numbers : new Map();
    const osm = [...keyPlaces].some((p) => ["photon", "osm"].includes(p.geo_source));
    const keyOrder = h.sortBy(keyPlaces, (p) => numbers.get(p.id) ?? 999);
    const keyList = keyOrder.map((p) => {
      const no = numbers.get(p.id);
      return `<li${no ? "" : ' class="off"'}><span class="kb" data-sheet="${r.id}" aria-hidden="true">${no ? no : ""}</span><span class="kt"><a href="ROOT/places/${h.attr(p.id)}.html">${h.esc(p.name)}</a><span class="w">${h.esc([PLACE_KIND_LABEL[p.kind], db.byId.area.get(p.area)?.name].filter(Boolean).join(" · "))}${no ? "" : ` · ${p.ll ? "outside this chart" : "no coordinates listed, not on the chart"}`}</span></span>${no ? `<span class="sr-only">, buoy ${no}</span>` : ""}</li>`;
    }).join("");
    const counts = [[areasWith.length, "area", "areas"], [r.places.length, "place", "places"], [r.stays.length, "place to stay", "places to stay"], [r.experiences.length, "experience", "experiences"], [r.events.length, "event", "events"]];
    const titleBlock = `<div class="sheet-title" data-sheet="${r.id}">
<p class="st-no label"><span>${h.esc(S)}</span><span class="tnum">${h.esc(r.code)}</span></p>
<p class="st-name">${h.esc(r.name)}</p>
<dl class="st-counts tnum">${counts.map(([v, one, many]) => `<div><dt>${h.esc(v === 1 ? one : many)}</dt><dd>${v}</dd></div>`).join("")}</dl>
${chart ? `<ul class="st-legend"><li><span class="st-buoy" data-sheet="${r.id}" aria-hidden="true">1</span>${h.esc(sig.length ? "A signature place, numbered as in the key below" : "A place to start, numbered as in the key below")}</li><li><span class="st-area label" aria-hidden="true">${h.esc(shortArea(areasWith[0]?.name || "").split(" ")[0])}</span>An area of this sheet, near its center</li>${chart.clustered ? `<li><span class="st-buoy wide" data-sheet="${r.id}" aria-hidden="true">4–6</span>Places too close to show apart</li>` : ""}</ul>` : ""}
</div>`;
    const keyBlock = keyPlaces.length && chart ? `<div class="sheet-keyblock"><p class="st-key-h label">${h.icon("buoy")}${h.esc(`${keyWord}: the key`)}</p><ol class="sheet-key">${keyList}</ol></div>` : "";
    const insetFig = chart?.inset ? `<figure class="sc-inset grat"><div class="grat-in">${chart.inset.html}</div><figcaption class="sc-cap"><span class="label">Inset A · ${h.esc(chart.inset.name)}</span><span>Buoys ${h.esc(chart.inset.label)} of the chart, at a larger scale. Limits ${h.esc(chart.inset.limits)}.</span></figcaption></figure>` : "";
    const chartSec = chart ? `<section class="sheet-chart" id="chart" aria-labelledby="chart-h" data-sheet="${r.id}">
<h2 class="sr-only" id="chart-h">The sheet chart</h2>
<div class="sc-grid"><figure class="sc-map grat"><div class="grat-in">${chart.html}</div>
<figcaption class="sc-cap"><span class="tnum">Chart limits ${h.esc(chart.limits)}</span><span>${chart.overview ? "Drawn on the region overview. " : ""}Buoys mark the listed coordinates${chart.clustered ? "; one with a range of numbers marks places too close to show apart" : ""}${chart.inset ? ", and the box lettered A is drawn larger in the inset" : ""}. Not for navigation.</span>${osm ? `<span>Positions include data © OpenStreetMap contributors, ${h.extLink("https://www.openstreetmap.org/copyright", "ODbL")}.</span>` : ""}<a href="ROOT/map.html?r=${r.id}">${h.icon("map")}Open ${h.esc(r.name)} on the full map</a></figcaption></figure>
<div class="sc-side">${insetFig}${titleBlock}</div></div>
${keyBlock}
</section>` : `<section class="sheet-chart no-chart" id="chart" aria-labelledby="chart-h" data-sheet="${r.id}"><h2 class="sr-only" id="chart-h">The sheet at a glance</h2>${titleBlock}${keyBlock}<p class="faint">The chart of this sheet appears once the basemap is in the guide. <a href="ROOT/map.html?r=${r.id}">Open the map</a>.</p></section>`;

    /* ---------- areas ---------- */
    const areasSec = c.section({ id: "areas", kicker: `${S} · ${h.plural(areasWith.length, "area")}`, title: "Areas and towns on this sheet", root: "ROOT/", more: { href: `areas.html?r=${r.id}`, label: "All areas" },
      body: `<div class="grid grid-3 sheet-areas">${areasWith.map((a) => cards.areaCard("ROOT/", a, { headingLevel: 3, summary: true })).join("")}</div>` });

    /* ---------- signature places ---------- */
    const sigSec = keyPlaces.length ? c.section({ id: "signature", kicker: sig.length ? `${S} · ${h.plural(sig.length, "signature place")}` : `${S} · by kind`, title: keyWord, root: "ROOT/",
      body: `<p class="sec-note">${sig.length ? "The places the region's official visitor guides lead with. The number is the buoy on the chart above." : "This sheet has no place marked signature in this guide. These are its first places by kind (theme parks, zoos, museums, beaches and parks first). The number is the buoy on the chart above."}</p>
<div class="grid grid-3 sig-grid">${keyPlaces.map((p) => `<div class="sig-item">${numbers.get(p.id) ? `<span class="sig-no" data-sheet="${r.id}" aria-hidden="true">${numbers.get(p.id)}</span>` : ""}${cards.placeCard("ROOT/", p, { headingLevel: 3, meta: false })}</div>`).join("")}</div>` }) : "";

    /* ---------- things to do, by family ---------- */
    const fam = OUT_GROUPS.map((g) => {
      const list = rankPlaces(h, r.places.filter((p) => p.groups.includes(g)));
      if (!list.length) return "";
      return `<div class="fam" data-g="${g}"><h3 class="fam-h">${h.icon(GROUP_ICON[g])}<span>${h.esc(PLACE_GROUP_LABEL[g])}</span><span class="n tnum">${list.length}</span></h3>
<ul class="rows">${list.slice(0, 5).map((p) => cards.placeRow("ROOT/", p)).join("")}</ul>
<p class="fam-all"><a href="ROOT/things-to-do.html?r=${r.id}&amp;k=${g}">${h.esc(list.length > 5 ? `All ${list.length}: ${PLACE_GROUP_LABEL[g].toLowerCase()}` : `${PLACE_GROUP_LABEL[g]} on Things to do`)}${h.icon("arrow-r")}</a></p></div>`;
    }).filter(Boolean);
    const thingsSec = fam.length ? c.section({ id: "things", kicker: `${S} · things to do`, title: "Things to do, by kind", root: "ROOT/", more: { href: `things-to-do.html?r=${r.id}`, label: "All things to do" },
      body: `<div class="fams">${fam.join("")}</div>` }) : "";

    /* ---------- beaches and outdoors ---------- */
    const outdoors = h.sortBy(r.places.filter((p) => p.groups.includes("outdoors")), stRank, (p) => { const i = OUTDOOR_ORDER.findIndex((k) => p.kindsAll.includes(k)); return i < 0 ? 99 : i; }, (p) => (p.signature ? 0 : 1), (p) => -refsOf(p), (p) => p.name.toLowerCase());
    const beaches = r.places.filter((p) => p.kindsAll.includes("beach"));
    const outChips = [
      beaches.length ? c.chip(h.plural(beaches.length, "beach", "beaches"), `outdoors.html?r=${r.id}&k=beach`, { root: "ROOT/", ic: "umbrella" }) : "",
      ...["state-park", "park", "nature-preserve", "trail", "island"].map((k) => { const n = r.places.filter((p) => p.kindsAll.includes(k)).length; return n ? c.chip(`${n} ${n === 1 ? PLACE_KIND_LABEL[k].toLowerCase() : `${PLACE_KIND_LABEL[k].toLowerCase()}s`}`, `outdoors.html?r=${r.id}&k=${k}`, { root: "ROOT/" }) : ""; }),
    ].filter(Boolean);
    const outSec = outdoors.length ? c.section({ id: "outdoors", kicker: `${S} · ${h.plural(outdoors.length, "place")} outdoors`, title: beaches.length ? "Beaches and outdoors" : "Parks and outdoors", root: "ROOT/", more: { href: `outdoors.html?r=${r.id}`, label: "All beaches and outdoors" },
      body: `${outChips.length ? `<div class="chip-row sec-chips">${outChips.join("")}</div>` : ""}<div class="grid grid-3">${outdoors.slice(0, 6).map((p) => cards.placeCard("ROOT/", p, { headingLevel: 3 })).join("")}</div>` }) : "";

    /* ---------- where to stay ---------- */
    const byArea = h.sortBy([...h.groupBy(r.stays, (s) => s.area)].map(([a, l]) => ({ a: db.byId.area.get(a), n: l.length })), (x) => -x.n, (x) => x.a.name);
    const byKind = h.sortBy([...h.groupBy(r.stays, (s) => s.kind)].map(([k, l]) => ({ k, n: l.length })), (x) => -x.n, (x) => x.k);
    const FEAT = ["beachfront", "waterfront", "bay-view", "pool", "airport-shuttle", "cruise-shuttle", "historic", "pet-friendly"];
    const byFeat = FEAT.map((f) => ({ f, n: r.stays.filter((s) => (s.features || []).includes(f)).length })).filter((x) => x.n);
    const stayPick = [];
    for (const s of h.sortBy(r.stays.filter((s) => s.status === "open" && s.heritage), (s) => s.name)) if (stayPick.length < 2) stayPick.push(s);
    for (const { a } of byArea) { if (stayPick.length >= 6) break; const s = h.sortBy(r.stays.filter((x) => x.area === a.id && x.status === "open" && !stayPick.includes(x)), (x) => -(x.features || []).length, (x) => x.name)[0]; if (s) stayPick.push(s); }
    const staySec = r.stays.length ? c.section({ id: "stay", kicker: `${S} · ${h.plural(r.stays.length, "place to stay", "places to stay")}`, title: "Where to stay", root: "ROOT/", more: { href: `stay.html?r=${r.id}`, label: "All places to stay" },
      body: `<div class="stay-split">
<div><h3 class="sub-h">By area</h3><ul class="count-list">${byArea.map(({ a, n }) => `<li><a href="ROOT/stay.html?a=${a.id}"><span>${h.esc(a.name)}</span><span class="n tnum">${n}</span></a></li>`).join("")}</ul></div>
<div><h3 class="sub-h">By kind</h3><ul class="count-list">${byKind.map(({ k, n }) => `<li><a href="ROOT/stay.html?r=${r.id}&amp;k=${k}"><span>${h.esc(STAY_KIND_LABEL[k] || k)}</span><span class="n tnum">${n}</span></a></li>`).join("")}</ul></div>
${byFeat.length ? `<div><h3 class="sub-h">As the hotels list them</h3><ul class="count-list">${byFeat.map(({ f, n }) => `<li><a href="ROOT/stay.html?r=${r.id}&amp;f=${f}"><span>${h.esc(FEATURE_LABEL[f])}</span><span class="n tnum">${n}</span></a></li>`).join("")}</ul></div>` : ""}
</div>
${stayPick.length ? `<h3 class="sub-h">A few to start with</h3><div class="grid grid-3">${stayPick.map((s) => cards.stayCard("ROOT/", s, { headingLevel: 4 })).join("")}</div><p class="sec-foot">Historic hotels first, then one from each of the areas with the most places to stay.</p>` : ""}` }) : "";

    /* ---------- what's on: the next 60 days (the window's first 60 days without JS) + every year ---------- */
    const evs = h.sortBy(r.events.filter((e) => e.instances.length), (e) => e.first, (e) => e.id);
    const first60 = evs.filter((e) => { const sp = evSpan(db, e); return sp.first <= until && sp.last >= W0; });
    const monthsOf = (e) => monthKey(evSpan(db, e).first < W0 ? W0 : evSpan(db, e).first);
    const rowsByMonth = h.groupBy(evs, monthsOf);
    const list60 = [...rowsByMonth].map(([m, list]) => `<div class="evmonth" data-month="${m}"${list.some((e) => first60.includes(e)) ? "" : " hidden"}><h3 class="sub-h">${h.esc(fmtMonth(m))}</h3><ol class="evrows dated">${list.map((e) => dateRow(ctx, "ROOT/", e, { hidden: !first60.includes(e) })).join("")}</ol></div>`).join("");
    const annual = h.sortBy(r.series, (s) => { const o = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]; return o.findIndex((m) => (s.months || []).includes(m)); }, (s) => (s.featured ? 0 : 1), (s) => s.name);
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const span = (ms) => { if (!ms || !ms.length) return ""; if (ms.length >= 12) return "All year"; const o = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((m) => ms.includes(m)); return o.length === 1 ? MON[o[0] - 1] : `${MON[o[0] - 1]}–${MON[o[o.length - 1] - 1]}`; };
    const onSec = c.section({ id: "on", kicker: `${S} · ${h.plural(r.events.length, "event")} listed`, title: "What's on in the next 60 days", root: "ROOT/", more: { href: `whats-on.html?r=${r.id}`, label: "All events on this sheet" },
      body: evs.length ? `<div class="on60" data-on60 data-window-start="${W0}" data-window-end="${db.window.end}">
<p class="on60-note" data-on60-note><span class="nojs-only">The first 60 days of the listings, ${h.esc(fmtDateRange(W0, until))}${W0.slice(0, 4) !== until.slice(0, 4) ? "" : `, ${W0.slice(0, 4)}`}.</span><span class="js-only" data-on60-range></span></p>
${list60}
<p class="on60-empty" data-on60-empty hidden>Nothing is listed on this sheet in the next 60 days. <a href="ROOT/whats-on.html?r=${r.id}">Every event on this sheet</a>.</p>
<p class="on60-more js-only" data-on60-more hidden><button class="btn btn-secondary btn-sm" type="button" data-on60-show></button></p>
</div>` : c.emptyState({ title: "No events listed on this sheet yet", body: "Events are listed from Sep 28, 2026 to Apr 30, 2027.", level: 3, sheet: r.id })
      + (annual.length ? `<h3 class="sub-h annual-h" id="every-year">Every year on this sheet</h3><ul class="annual">${annual.map((s) => `<li><a href="ROOT/whats-on.html#s-${h.attr(s.id)}"><span class="an-m label tnum">${h.esc(span(s.months))}</span><span class="an-t">${h.esc(s.name)}</span>${s.featured ? '<span class="an-sig label">Signature</span>' : ""}</a></li>`).join("")}</ul>` : "") });

    /* ---------- experiences that depart here ---------- */
    const expFam = EXP_GROUPS.map((g) => {
      const list = h.sortBy(r.experiences.filter((x) => x.kg === g), stRank, (x) => (x.departs ? 0 : 1), (x) => x.name.toLowerCase());
      if (!list.length) return "";
      return `<div class="fam" data-g="${g}"><h3 class="fam-h">${h.icon(GROUP_ICON[g])}<span>${h.esc(EXPERIENCE_GROUP_LABEL[g])}</span><span class="n tnum">${list.length}</span></h3>
<ul class="rows">${list.slice(0, 5).map((x) => cards.experienceRow("ROOT/", x)).join("")}</ul>
<p class="fam-all"><a href="ROOT/experiences.html?r=${r.id}&amp;k=${g}">${h.esc(list.length > 5 ? `All ${list.length}: ${EXPERIENCE_GROUP_LABEL[g].toLowerCase()}` : `${EXPERIENCE_GROUP_LABEL[g]} on Experiences`)}${h.icon("arrow-r")}</a></p></div>`;
    }).filter(Boolean);
    const expSec = expFam.length ? c.section({ id: "experiences", kicker: `${S} · ${h.plural(r.experiences.length, "experience")}`, title: "Tours and trips that start here", root: "ROOT/", more: { href: `experiences.html?r=${r.id}`, label: "All experiences" },
      body: `<div class="fams">${expFam.join("")}</div>` }) : "";

    /* ---------- history: historic places with designations, and the sheet's timeline ---------- */
    const her = db.heritage.filter((x) => x.rec.region === r.id);
    const herTop = h.sortBy(her, (x) => -((x.rec.heritage.designations || []).length), (x) => (x.rec.heritage.era ? ERAS.indexOf(x.rec.heritage.era) : 99), (x) => x.rec.name.toLowerCase()).slice(0, 8);
    const herRow = ({ kind, rec }) => {
      const hh = rec.heritage;
      const d = (hh.designations || [])[0];
      return `<li class="her"><a href="ROOT/${kind === "stay" ? "stays" : "places"}/${h.attr(rec.id)}.html"><span class="her-y tnum">${hh.built ? h.esc(String(hh.built).match(/\d{4}/)?.[0] || hh.built) : '<span class="unk">Year not listed</span>'}</span><span><span class="t">${h.esc(rec.name)}</span><span class="w">${h.esc([kind === "stay" ? "Hotel" : PLACE_KIND_LABEL[rec.kind], hh.era ? ERA_NAME[hh.era] : "", db.byId.area.get(rec.area)?.name].filter(Boolean).join(" · "))}</span>${d ? `<span class="her-d">${h.esc(`${d.name}${d.year ? ` (${d.year})` : ""}`)}${hh.designations.length > 1 ? ` <span class="faint">and ${hh.designations.length - 1} more</span>` : ""}</span>` : ""}</span></a></li>`;
    };
    const tl = h.sortBy(r.timeline, (t) => t.year ?? 0, (t) => t.date || "", (t) => t.id);
    const tlShow = tl.length > 6 ? [...tl.slice(0, 3), ...tl.slice(-3)] : tl;
    const histSec = her.length || tl.length ? c.section({ id: "history", kicker: `${S} · ${h.plural(her.length, "historic place")} · ${h.plural(tl.length, "milestone")}`, title: "History on this sheet", root: "ROOT/", more: { href: `history.html?r=${r.id}`, label: "History on this sheet" },
      body: `<div class="hist-split">
${her.length ? `<div><h3 class="sub-h">Historic places, most designated first</h3><ul class="her-list">${herTop.map(herRow).join("")}</ul>${her.length > herTop.length ? `<p class="fam-all"><a href="ROOT/history.html?r=${r.id}">All ${her.length} historic places on this sheet${h.icon("arrow-r")}</a></p>` : ""}</div>` : ""}
${tl.length ? `<div><h3 class="sub-h">On the timeline${tl.length > 6 ? ": the first and the latest" : ""}</h3><ol class="mini-tl">${tlShow.map((t, i) => `${tl.length > 6 && i === 3 ? `<li class="gap"><a href="ROOT/history.html?r=${r.id}">${h.esc(`${tl.length - 6} more milestones`)}</a></li>` : ""}<li data-era="${t.era}"><span class="mt-y tnum">${h.esc(t.year < 0 ? `${-t.year} BCE` : String(t.year))}</span><a href="ROOT/history.html#tl-${h.attr(t.id)}">${h.esc(t.title)}</a></li>`).join("")}</ol></div>` : ""}
</div>` }) : "";

    /* ---------- eat and drink ---------- */
    const ed = r.places.filter((p) => p.groups.includes("eat") || p.groups.includes("drink"));
    const tagOf = (p) => EAT_TAGS.findIndex(([t]) => (p.tags || []).includes(t));
    const edTop = h.sortBy(ed.filter((p) => tagOf(p) > -1 && tagOf(p) < 6 || p.heritage), stRank, (p) => { const i = tagOf(p); return i < 0 ? 5.5 : i; }, (p) => (p.signature ? 0 : 1), (p) => p.name.toLowerCase()).slice(0, 8);
    const edChips = [
      ...EAT_TAGS.map(([t, word]) => { const n = ed.filter((p) => (p.tags || []).includes(t)).length; return n ? c.chip(word, `eat-drink.html?r=${r.id}&tag=${t}`, { root: "ROOT/", count: n }) : ""; }),
      ...["brewery", "food-hall", "cafe-bakery", "distillery-winery"].map((k) => { const n = ed.filter((p) => p.kindsAll.includes(k)).length; return n ? c.chip(PLACE_KIND_LABEL[k], `eat-drink.html?r=${r.id}&k=${k}`, { root: "ROOT/", count: n }) : ""; }),
    ].filter(Boolean);
    const eatSec = ed.length ? c.section({ id: "eat", kicker: `${S} · ${h.plural(ed.length, "place")} to eat and drink`, title: "Eat and drink", root: "ROOT/", more: { href: `eat-drink.html?r=${r.id}`, label: "All places to eat and drink" },
      body: `${edChips.length ? `<div class="chip-row sec-chips">${edChips.join("")}</div>` : ""}${edTop.length ? `<h3 class="sub-h">Michelin Guide picks, award winners and historic restaurants</h3><ul class="rows">${edTop.map((p) => { const i = tagOf(p); return cards.placeRow("ROOT/", p, { note: i > -1 && i < 6 ? EAT_TAGS[i][1] : p.heritage?.built ? `Historic, ${String(p.heritage.built).match(/\d{4}/)?.[0] || p.heritage.built}` : "Historic" }); }).join("")}</ul>` : `<ul class="rows">${rankPlaces(h, ed).slice(0, 6).map((p) => cards.placeRow("ROOT/", p)).join("")}</ul>`}` }) : "";

    /* ---------- getting around ---------- */
    const tr = db.transport.filter((t) => (t.regions || []).includes(r.id));
    const trByFam = h.groupBy(h.sortBy(tr, (t) => ["arrive", "transit", "bike", "drive"].indexOf(TRANSPORT_FAMILY[t.mode] || "drive"), (t) => t.name), (t) => TRANSPORT_FAMILY[t.mode] || "drive");
    const aroundSec = tr.length ? c.section({ id: "around", kicker: `${S} · ${h.plural(tr.length, "way", "ways")} to get here and around`, title: "Getting around", root: "ROOT/", more: { href: "getting-around.html", label: "Getting around" },
      body: `<div class="tr-fams">${[...trByFam].map(([f, list]) => `<div><h3 class="sub-h">${h.esc(FAMILY_LABEL[f])}</h3><ul class="tr-list">${list.map((t) => `<li><a href="ROOT/getting-around.html#t-${h.attr(t.id)}">${h.icon(MODE_ICON[t.mode] || "route")}<span><span class="t">${h.esc(t.name)}${t.code ? ` <span class="tr-code">${h.esc(t.code)}</span>` : ""}</span><span class="w">${h.esc([MODE_LABEL[t.mode], t.fare_text && t.fare_text.length < 60 ? t.fare_text : t.is_free === true ? "Free" : ""].filter(Boolean).join(" · "))}</span>${t.summary && (f === "arrive" || f === "transit") ? `<span class="tr-sum">${h.esc(t.summary)}</span>` : ""}</span></a></li>`).join("")}</ul></div>`).join("")}</div>` }) : "";

    /* ---------- sources ---------- */
    const srcSec = `<section class="section sheet-sources" id="sources" aria-labelledby="sources-h"><div class="sec-head oxford"><h2 id="sources-h">Sources</h2></div>
${r.record ? c.recordSource(r, { label: "Sheet source" }) : '<p class="faint">This sheet has no record of its own yet: its lede and "known for" appear once one is added.</p>'}
<p class="sec-note">Every place, stay, experience and event on this sheet links to its own source on its page or in its dialog. Counts are computed from the guide's data. ${chart ? "The chart is drawn from U.S. Census Bureau TIGER/Line (public domain)." : ""}</p>
</section>`;

    /* ---------- the head ---------- */
    const head = c.pageHead({
      kicker: `${S} · ${r.code}`, sheet: r.id, title: r.name,
      lede: r.lede || `${r.name}: ${h.plural(areasWith.length, "area")}, ${h.plural(r.places.length, "place")} and ${h.plural(r.stays.length, "place to stay", "places to stay")} in this guide.`,
      dek: (r.known_for || []).length ? `Known for ${h.listJoin(r.known_for)}.` : "",
      after: `<p class="sh-counts label tnum">${counts.map(([v, one, many]) => `<span>${v} ${h.esc(v === 1 ? one : many)}</span>`).join('<span aria-hidden="true"> · </span>')}</p>
${r.official_url ? `<p class="sh-official">Official visitor bureau: ${h.extLink(r.official_url, `${h.esc(h.hostOf(r.official_url))}${h.icon("ext")}`)}</p>` : ""}
<nav class="head-chips chip-row" aria-label="On this sheet">${[
        ["#chart", "Chart", "compass"], ["#things", "Things to do", "buoy"], ["#stay", "Stays", "anchor"], ["#on", "What's on", "flag"], ["#history", "History", "landmark"],
      ].filter(([id]) => ({ "#things": fam.length, "#stay": r.stays.length, "#history": her.length || tl.length, "#chart": true, "#on": true })[id]).map(([href, l, ic]) => `<a class="chip" href="${href}">${h.icon(ic)}<span>${h.esc(l)}</span></a>`).join("")}</nav>`,
    });

    const toc = [["chart", "The chart"], ["areas", "Areas"], keyPlaces.length && ["signature", keyWord], fam.length && ["things", "Things to do"], outdoors.length && ["outdoors", beaches.length ? "Beaches and outdoors" : "Outdoors"],
      r.stays.length && ["stay", "Where to stay"], ["on", "What's on"], expFam.length && ["experiences", "Experiences"], (her.length || tl.length) && ["history", "History"], ed.length && ["eat", "Eat and drink"],
      tr.length && ["around", "Getting around"], ["sources", "Sources"]].filter(Boolean);
    const body = [head, chartSec, areasSec, sigSec, thingsSec, outSec, staySec, onSec, expSec, histSec, eatSec, aroundSec, srcSec].join("\n");
    const og = { tampa: "og-tampa.png", stpete: "og-stpete.png", beaches: "og-beaches.png", clearwater: "og-clearwater.png", around: "og-around.png", daytrips: "og-daytrips.png" }[r.id];
    return {
      path, nav: rp.slug, title: r.name, og,
      description: `${S} (${r.code}) of Tampa Bay Chartbook, ${r.name}: ${h.plural(areasWith.length, "area")}, ${h.plural(r.places.length, "place")}, ${h.plural(r.stays.length, "place to stay", "places to stay")} and ${h.plural(r.events.length, "event")}, each linked to its source.`,
      toc, features: ["region"], pageClass: "sheet-page",
      pagenav: { prev: prevSheet(rp) || { href: "index.html", label: "Overview" }, next: nextSheet(rp) || { href: "things-to-do.html", label: "Things to do" } },
      jsonld: seo.destinationLd(r, { url: `${config.siteBase}${path}` }),
      body: (root) => body.replace(/ROOT\//g, root),
    };
  });
}
