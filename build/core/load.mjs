/* ============================================================
   build/core/load.mjs · OWNER: E1 (build engine; ported from Cincy Week)
   data/*.json → a validated, indexed `db`. Nothing here writes files.
   Problems go to fail()/warn() as "data/<file>.json#<id>.<field>: …";
   build.mjs stops before any page module runs when anything failed.

   db = {
     config, window: { start, end },
     regions (always all six, sheet order) areas (always all 45, sheet order) places stays experiences events
     series timeline transport faqs facts media routes      (arrays; data order except regions/areas)
     aliases images map basemap (bool: site/map/basemap.svg exists)
     byId: { region area place stay experience event series timeline transport faq fact media route } (Maps)
     instances (every event instance, by s) · runs (live long-run instances) · eventsByDay (day → live instances,
     runs excluded) · onDay(date) → the day's live instances + the runs covering it · days · months
     eventsByPlace eventsByArea eventsByRegion eventsBySeries (Maps of live events, by first start)
     placesByKind (kind or secondary kind → places) placesByGroup placesByTopic staysByKind experiencesByKind
     timelineByEra heritage ([{ kind: "place"|"stay", rec }] by era, year, name)
     code(id) codeToId (Map) nearby(lat, lng, meters, { kinds }) counts
   }
   The full list of fields the loader adds to records is in build/CONTRACTS.md §5.
   ============================================================ */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SPECS, ARRAY_FILES, REQUIRED_NONEMPTY, ID_SPACE, validateFile, coerce } from "./schema.mjs";
import {
  REGIONS, REGION_IDS, AREAS, AREA_IDS, AREA_NAMES, ERAS, PLACE_GROUP, EVENT_GROUP, EXPERIENCE_GROUP, DATE_WINDOW,
} from "./vocab.mjs";
import { expand, nyToEpoch, dateRange, monthKey, fmtMonth, isWeekend, ISO_DATE, RUN_MAX_DAYS } from "./time.mjs";
import { aliasKey, sortBy } from "./util.mjs";
import { codeTable, code } from "../../site/js/lib/share.js";
import { haversine } from "../../site/js/lib/geo.js";

export function validateConfig(config, fail, warn = () => {}) {
  const w = "site.config.json";
  for (const k of ["siteName", "siteTagline", "siteBase", "pathPrefix", "repo", "timezone"]) if (typeof config[k] !== "string" || !config[k]) fail(w, `"${k}" is required`);
  if (config.siteBase && !/^https:\/\/.+\/$/.test(config.siteBase)) fail(w, `"siteBase" must be an https:// URL ending in "/"`);
  if (config.pathPrefix && !/^\/([a-z0-9._-]+\/)*$/i.test(config.pathPrefix)) fail(w, `"pathPrefix" must look like "/x/"`);
  if (config.timezone && config.timezone !== "America/New_York") fail(w, `"timezone" must be America/New_York (the time model assumes it)`);
  const v = config.dataWindow;
  if (!v || !ISO_DATE.test(v.start || "") || !ISO_DATE.test(v.end || "")) fail(w, `"dataWindow" needs ISO "start" and "end" dates`);
  else {
    if (v.start > v.end) fail(w, `"dataWindow.start" is after "dataWindow.end"`);
    if (v.start !== DATE_WINDOW.start || v.end !== DATE_WINDOW.end) warn(w, `"dataWindow" (${v.start} to ${v.end}) differs from the research window in build/core/vocab.mjs (${DATE_WINDOW.start} to ${DATE_WINDOW.end})`);
  }
  if (!config.author || typeof config.author.name !== "string") fail(w, `"author.name" is required`);
  if (config.analyticsId && !/^G-[A-Z0-9]+$/.test(config.analyticsId)) fail(w, `"analyticsId" must be a GA4 id like G-XXXX or empty`);
}

function readJSON(file, fail) {
  try { return JSON.parse(readFileSync(file, "utf8")); }
  catch (e) { fail(file.replace(/^.*\/(data\/)/, "$1"), `invalid JSON: ${e.message}`); return null; }
}

/** First four-digit year in a string ("1888–1891" → 1888), for sorting heritage. */
const firstYear = (s) => { const m = /\b(1[0-9]{3}|20[0-9]{2})\b/.exec(String(s || "")); return m ? Number(m[1]) : 9999; };

export function load({ dataDir, siteDir, config, fail, warn }) {
  const W = (file, rid, field) => `data/${file}.json#${rid}${field ? "." + field : ""}`;
  const db = { config, window: config.dataWindow };
  const win = config.dataWindow;

  /* ---------- read + schema ---------- */
  for (const f of ARRAY_FILES) {
    const p = join(dataDir, `${f}.json`);
    if (!existsSync(p)) { if (REQUIRED_NONEMPTY.includes(f)) fail(`data/${f}.json`, "is missing"); db[f] = []; continue; }
    const v = readJSON(p, fail);
    db[f] = Array.isArray(v) ? v.filter((r) => r && typeof r === "object" && !Array.isArray(r)) : [];
    if (v !== null) for (const pr of validateFile(f, v)) (pr.level === "error" ? fail : warn)(pr.where, pr.msg);
    coerce(f, db[f]); // wrong-typed values → null / [] so the checks below report everything instead of crashing
    if (REQUIRED_NONEMPTY.includes(f) && Array.isArray(v) && !v.length) fail(`data/${f}.json`, "is empty");
    const seen = new Set();
    for (const r of db[f]) {
      if (!r || typeof r.id !== "string") continue;
      if (seen.has(r.id)) fail(W(f, r.id), `duplicate id "${r.id}"`);
      seen.add(r.id);
    }
  }
  const optObj = (f) => { const p = join(dataDir, `${f}.json`); if (!existsSync(p)) return {}; const v = readJSON(p, fail); if (v && (typeof v !== "object" || Array.isArray(v))) { fail(`data/${f}.json`, "must be a JSON object"); return {}; } return v || {}; };
  db.aliases = optObj("aliases");
  db.images = optObj("images");
  db.map = optObj("map");
  db.basemap = existsSync(join(siteDir, "map", "basemap.svg"));
  for (const k of Object.keys(db.aliases)) if (!["places"].includes(k)) fail("data/aliases.json", `unknown key "${k}" (allowed: places)`);

  /* ---------- one id space: places, stays, experiences, events, series, areas, regions ---------- */
  const owner = new Map();
  for (const f of ID_SPACE) for (const r of db[f]) {
    if (!r || typeof r.id !== "string") continue;
    const o = owner.get(r.id);
    if (o && o !== f) fail(W(f, r.id), `id "${r.id}" is also a ${o}.json id (ids are unique across ${ID_SPACE.join(", ")}: one URL and trip-code space)`);
    else owner.set(r.id, f);
  }

  /* ---------- regions and areas: every fixed id exists, merged with its record ---------- */
  const regionRec = new Map(db.regions.filter((r) => REGIONS[r.id]).map((r) => [r.id, r]));
  db.regions = REGION_IDS.map((rid) => {
    const rec = regionRec.get(rid);
    if (!rec) warn(W("regions", rid), "has no record (the sheet page shows no lede)", "regions without a record");
    return { lede: null, known_for: [], official_url: null, source_url: null, ...(rec || {}), id: rid, n: REGIONS[rid].n, code: REGIONS[rid].code, short: REGIONS[rid].short, name: rec?.name || REGIONS[rid].name, record: !!rec };
  });
  const areaRec = new Map(db.areas.filter((a) => AREAS[a.id]).map((a) => [a.id, a]));
  db.areas = AREA_IDS.map((aid) => {
    const rec = areaRec.get(aid);
    return { kind: null, lat: null, lng: null, summary: null, known_for: [], official_url: null, source_url: null, ...(rec || {}), id: aid, region: AREAS[aid], name: rec?.name || AREA_NAMES[aid], record: !!rec };
  });

  /* ---------- indexes ---------- */
  const byId = (arr) => new Map(arr.filter((r) => r && typeof r.id === "string").map((r) => [r.id, r]));
  db.byId = {
    region: byId(db.regions), area: byId(db.areas), place: byId(db.places), stay: byId(db.stays), experience: byId(db.experiences),
    event: byId(db.events), series: byId(db.series), timeline: byId(db.timeline), transport: byId(db.transport), faq: byId(db.faqs),
    fact: byId(db.facts), media: byId(db.media), route: byId(db.routes),
  };
  const B = db.byId;

  /* ---------- aliases: an event's location_text → place when place is null (stored values always win) ---------- */
  const placeKey = new Map();
  for (const p of db.places) for (const n of [p.name, ...(p.aliases || [])]) if (n) placeKey.set(aliasKey(n), p.id);
  for (const [k, pid] of Object.entries(db.aliases.places || {})) {
    if (k !== aliasKey(k)) fail(`data/aliases.json#places`, `key "${k}" is not normalized (expected "${aliasKey(k)}")`);
    if (!B.place.has(pid)) fail(`data/aliases.json#places.${k}`, `unknown place "${pid}"`);
    else placeKey.set(aliasKey(k), pid);
  }
  for (const r of [...db.events, ...db.series]) {
    if (r.place != null || !r.location_text) continue;
    const pid = placeKey.get(aliasKey(r.location_text));
    if (pid) r.place = pid;
  }

  /* ---------- references ---------- */
  const ref = (map, kind, file, rid, field, v) => { if (v != null && !map.has(v)) { fail(W(file, rid, field), `unknown ${kind} "${v}"`); return false; } return true; };
  for (const e of db.events) {
    ref(B.place, "place (data/places.json id)", "events", e.id, "place", e.place);
    ref(B.series, "series (data/series.json id)", "events", e.id, "series", e.series);
  }
  for (const s of db.series) ref(B.place, "place (data/places.json id)", "series", s.id, "place", s.place);
  for (const x of db.experiences) ref(B.place, "place (data/places.json id)", "experiences", x.id, "departs_place", x.departs_place);
  for (const t of db.timeline) {
    (t.places || []).forEach((pid, i) => { if (!B.place.has(pid) && !B.stay.has(pid)) fail(W("timeline", t.id, `places[${i}]`), `unknown place "${pid}" (a data/places.json or data/stays.json id)`); });
    (t.media || []).forEach((mid, i) => ref(B.media, "media (data/media.json id)", "timeline", t.id, `media[${i}]`, mid));
  }
  const SUBJECT = { place: B.place, stay: B.stay, area: B.area, region: B.region, timeline: B.timeline, event: B.event, series: B.series, experience: B.experience };
  for (const m of db.media) if (m.subject_kind && SUBJECT[m.subject_kind]) ref(SUBJECT[m.subject_kind], m.subject_kind, "media", m.id, "subject", m.subject);
  for (const t of db.transport) (t.stops || []).forEach((s, i) => ref(B.place, "place (data/places.json id)", "transport", t.id, `stops[${i}].place`, s?.place));
  const STOP = { place: B.place, stay: B.stay, experience: B.experience, event: B.event };
  for (const r of db.routes) (r.stops || []).forEach((s, i) => { if (s && STOP[s.kind]) ref(STOP[s.kind], s.kind, "routes", r.id, `stops[${i}].id`, s.id); });

  /* ---------- geo: on the basemap? (only when data/map.json exists) ---------- */
  const core = db.map && db.map.bbox && db.map.bbox.core;
  if (db.map && Object.keys(db.map).length && !core) fail("data/map.json", "needs bbox.core { s, n, w, e } (see build/CONTRACTS.md §5)");
  const onBasemap = (r) => !core || (r.lat >= core.s && r.lat <= core.n && r.lng >= core.w && r.lng <= core.e);
  for (const f of ["places", "stays", "experiences"]) for (const r of db[f]) {
    const dp = f === "experiences" && r.departs_place ? B.place.get(r.departs_place) : null;
    if (dp && dp.lat != null && r.lat == null) continue;   // an experience without its own point sits at its departure place
    if (r.lat == null || r.lng == null) warn(W(f, r.id), "has no coordinates (listed, but not on the map)", `${f} without coordinates`);
    else if (core && !onBasemap(r)) warn(W(f, r.id), "is outside the basemap (listed, but not on the map)", `${f} outside the basemap`);
  }

  /* ---------- time ---------- */
  const seenSlot = new Map();
  for (const e of db.events) {
    const where = (f) => W("events", e.id, f);
    if (!e.date || !ISO_DATE.test(e.date)) continue; // schema already failed
    const last = e.end_date && ISO_DATE.test(e.end_date) ? e.end_date : e.date;
    if (last < win.start || e.date > win.end) fail(where("date"), `${e.date}${e.end_date ? `–${e.end_date}` : ""} is outside the data window (${win.start} to ${win.end})`);
    for (const [i, o] of (e.occurrences || []).entries()) {
      if (!o || !o.date) continue;
      if (o.date < win.start || o.date > win.end) fail(where(`occurrences[${i}].date`), `${o.date} is outside the data window (${win.start} to ${win.end})`);
      if (o.date < e.date || o.date > last) fail(where(`occurrences[${i}].date`), `${o.date} is outside the event's own dates (${e.date}${e.end_date ? ` to ${e.end_date}` : ""})`);
    }
    if (!["cancelled", "postponed"].includes(e.status) && e.start) {
      const key = [(e.title || "").toLowerCase(), e.date, e.start, e.place || e.location_text || ""].join("|");
      if (seenSlot.has(key)) fail(where(), `duplicate of "${seenSlot.get(key)}" (same title, day, start and place: a duplicate record?)`);
      else seenSlot.set(key, e.id);
    }
  }

  /* ---------- derived: located records ---------- */
  const ll = (r) => (r && r.lat != null && r.lng != null ? [r.lat, r.lng] : null);
  const regionOf = (area) => (area && AREAS[area]) || null;
  for (const p of db.places) {
    p.region = regionOf(p.area);
    p.kindsAll = [...new Set([p.kind, ...(p.kinds || [])].filter(Boolean))];
    p.groups = [...new Set(p.kindsAll.map((k) => PLACE_GROUP[k]).filter(Boolean))];
    p.ll = ll(p);
    p.open = p.status !== "closed";
    if (!p.summary) warn(W("places", p.id, "summary"), "is empty (the card shows the name and kind only)", "places without a summary");
    if (p.status === "closed" && !p.heritage) warn(W("places", p.id), "is closed and has no heritage block (closed places are kept only for history)", "closed places without heritage");
  }
  for (const s of db.stays) { s.region = regionOf(s.area); s.ll = ll(s); s.open = s.status !== "closed"; }
  for (const x of db.experiences) {
    x.region = regionOf(x.area);
    x.kg = EXPERIENCE_GROUP[x.kind] || "adventure";
    x.departs = x.departs_place ? B.place.get(x.departs_place) || null : null;
    x.ll = ll(x) || ll(x.departs);
    x.open = x.status !== "closed";
  }
  for (const s of db.series) {
    s.venue = s.place ? B.place.get(s.place) || null : null;
    if (!s.area && s.venue) s.area = s.venue.area;
    s.region = regionOf(s.area);
  }

  /* ---------- derived: events and instances ---------- */
  db.instances = [];
  for (const e of db.events) {
    e.kg = EVENT_GROUP[e.kind] || "other";
    e.venue = e.place ? B.place.get(e.place) || null : null;
    if (!e.area && e.venue) e.area = e.venue.area;        // stored area wins; else the place's
    e.region = regionOf(e.area);
    e.ll = ll(e) || ll(e.venue);
    e.seriesRec = e.series ? B.series.get(e.series) || null : null;
    e.live = !["cancelled", "postponed"].includes(e.status);
    if (!e.area) warn(W("events", e.id, "area"), "has no area and no place with one (it shows on no sheet)", "events without an area");
    let inst = [];
    try { inst = e.date && ISO_DATE.test(e.date) ? expand(e, win, { maxRunDays: RUN_MAX_DAYS }) : []; } catch (err) { fail(W("events", e.id), `could not expand times: ${err.message}`); }
    e.instances = inst.map((x) => ({ id: e.id, ev: e, ...x }));
    e.run = e.instances.length === 1 && e.instances[0].run;
    e.day = e.instances[0]?.day || e.date;
    e.first = e.instances[0]?.s ?? nyToEpoch(e.date, "00:00");
    db.instances.push(...e.instances);
  }
  db.instances = sortBy(db.instances, (x) => x.s, (x) => x.e, (x) => x.id);
  const liveEvents = db.events.filter((e) => e.live);
  const byStart = (a) => sortBy(a, (e) => e.first, (e) => e.id);

  /* ---------- groupings ---------- */
  const add = (m, k, v) => { if (k == null) return; if (!m.has(k)) m.set(k, []); if (!m.get(k).includes(v)) m.get(k).push(v); };
  db.eventsByPlace = new Map(); db.eventsByArea = new Map(); db.eventsByRegion = new Map(); db.eventsBySeries = new Map();
  for (const e of byStart(liveEvents)) { add(db.eventsByPlace, e.place, e); add(db.eventsByArea, e.area, e); add(db.eventsByRegion, e.region, e); add(db.eventsBySeries, e.series, e); }
  db.placesByKind = new Map(); db.placesByGroup = new Map(); db.placesByTopic = new Map();
  for (const p of db.places) { for (const k of p.kindsAll) add(db.placesByKind, k, p); for (const g of p.groups) add(db.placesByGroup, g, p); for (const t of p.topics || []) add(db.placesByTopic, t, p); }
  db.staysByKind = new Map(); for (const s of db.stays) add(db.staysByKind, s.kind, s);
  db.experiencesByKind = new Map(); for (const x of db.experiences) add(db.experiencesByKind, x.kind, x);
  db.timelineByEra = new Map(ERAS.map((e) => [e, []]));
  for (const t of sortBy(db.timeline, (x) => x.year ?? 0, (x) => x.date || "", (x) => x.id)) db.timelineByEra.get(t.era)?.push(t);

  /* ---------- derived: timeline links, places, stays, areas, regions ---------- */
  for (const t of db.timeline) {
    t.links = (t.places || []).map((pid) => (B.place.has(pid) ? { kind: "place", rec: B.place.get(pid) } : B.stay.has(pid) ? { kind: "stay", rec: B.stay.get(pid) } : null)).filter(Boolean);
    if (!t.area && t.links[0]) t.area = t.links[0].rec.area;
    t.region = regionOf(t.area);
    t.ll = ll(t) || ll(t.links[0]?.rec);
  }
  const mediaBy = new Map();
  for (const m of db.media) add(mediaBy, `${m.subject_kind}:${m.subject}`, m);
  const near = (r, arr, meters, max) => (r.ll ? sortBy(arr.filter((o) => o !== r && o.ll).map((o) => ({ rec: o, d: haversine({ lat: r.ll[0], lng: r.ll[1] }, { lat: o.ll[0], lng: o.ll[1] }) })).filter((x) => x.d <= meters), (x) => x.d).slice(0, max) : []);
  const openStays = db.stays.filter((s) => s.open);
  for (const p of db.places) {
    p.events = db.eventsByPlace.get(p.id) || [];
    p.series = db.series.filter((s) => s.place === p.id);
    p.experiences = db.experiences.filter((x) => x.departs_place === p.id);
    p.timeline = db.timeline.filter((t) => (t.places || []).includes(p.id));
    p.media = mediaBy.get(`place:${p.id}`) || [];
    p.nearbyStays = near(p, openStays, 1600, 6);            // [{ rec, d }] within a mile, nearest first
  }
  for (const s of db.stays) {
    s.timeline = db.timeline.filter((t) => (t.places || []).includes(s.id));
    s.media = mediaBy.get(`stay:${s.id}`) || [];
    s.nearbyPlaces = near(s, db.places.filter((p) => p.open), 1200, 8);
  }
  for (const x of db.experiences) x.media = mediaBy.get(`experience:${x.id}`) || [];
  const inArea = (arr, aid) => arr.filter((r) => r.area === aid);
  for (const a of db.areas) {
    a.places = inArea(db.places, a.id); a.stays = inArea(db.stays, a.id); a.experiences = inArea(db.experiences, a.id);
    a.events = db.eventsByArea.get(a.id) || []; a.series = inArea(db.series, a.id);
    a.media = mediaBy.get(`area:${a.id}`) || [];
    a.ll = ll(a);
    const n = a.places.length + a.stays.length + a.experiences.length + a.events.length;
    if (!a.record && n) warn(W("areas", a.id), `has no record but ${n} entries sit in it (the area page shows no summary)`, "areas without a record");
  }
  for (const r of db.regions) {
    r.areas = db.areas.filter((a) => a.region === r.id);
    const inRegion = (arr) => arr.filter((x) => x.region === r.id);
    r.places = inRegion(db.places); r.stays = inRegion(db.stays); r.experiences = inRegion(db.experiences);
    r.events = db.eventsByRegion.get(r.id) || []; r.series = inRegion(db.series); r.routes = db.routes.filter((x) => x.region === r.id);
    r.timeline = inRegion(db.timeline);
    r.media = mediaBy.get(`region:${r.id}`) || [];
    r.ll = ll(r);
  }
  for (const rt of db.routes) rt.stopsResolved = (rt.stops || []).map((s) => ({ ...s, rec: STOP[s.kind]?.get(s.id) || null })).filter((s) => s.rec);
  db.heritage = sortBy([
    ...db.places.filter((p) => p.heritage).map((rec) => ({ kind: "place", rec })),
    ...db.stays.filter((s) => s.heritage).map((rec) => ({ kind: "stay", rec })),
  ], (x) => (x.rec.heritage.era ? ERAS.indexOf(x.rec.heritage.era) : 99), (x) => firstYear(x.rec.heritage.built), (x) => x.rec.name.toLowerCase());

  /* ---------- days and months ---------- */
  db.runs = db.instances.filter((x) => x.run && x.ev.live);
  db.eventsByDay = new Map();
  for (const x of db.instances) if (!x.run && x.ev.live) add(db.eventsByDay, x.day, x);
  db.onDay = (date) => sortBy([...(db.eventsByDay.get(date) || []), ...db.runs.filter((x) => x.date <= date && x.ev.end_date >= date && date <= win.end)], (x) => x.s, (x) => x.id);
  db.days = [...db.eventsByDay.keys()].filter((d) => d >= win.start && d <= win.end).sort().map((date) => ({
    date, count: db.eventsByDay.get(date).length, weekend: isWeekend(date), month: monthKey(date),
  }));
  const months = [...new Set(dateRange(win.start, win.end).map(monthKey))];
  db.months = months.map((key) => {
    const [y, m] = key.split("-").map(Number);
    const first = `${key}-01`, last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const evs = liveEvents.filter((e) => e.instances.some((x) => (x.run ? x.date <= last && x.through >= first : x.day >= first && x.day <= last)));
    return { key, label: fmtMonth(key), count: evs.length };
  }).filter((m) => m.count > 0);

  /* ---------- share codes (one space: trips, deep links) ---------- */
  const { map, collisions } = codeTable(ID_SPACE.flatMap((f) => db[f].map((r) => r.id)).filter(Boolean));
  for (const [c, a, b] of collisions) fail(`data/${owner.get(b) || "places"}.json#${b}`, `share code collision "${c}" between "${a}" and "${b}": rename one id before it is published`);
  db.codeToId = map;
  db.code = code;

  /* ---------- images manifest (data/images.json, from media.json by the images pass) ---------- */
  const IMG_KIND = { p: ["place", B.place], s: ["stay", B.stay], a: ["area", B.area], t: ["timeline", B.timeline], x: ["experience", B.experience] };
  for (const [k, v] of Object.entries(db.images)) {
    const m = /^([psatx])\/([a-z0-9][a-z0-9-]*)$/.exec(k);
    if (!m) { fail("data/images.json", `bad key "${k}" (expected p/<place id>, s/<stay id>, a/<area id>, t/<timeline id> or x/<experience id>)`); continue; }
    if (!v || typeof v.file !== "string") { fail(`data/images.json#${k}`, "needs a file"); continue; }
    if (!existsSync(join(siteDir, v.file))) fail(`data/images.json#${k}.file`, `site/${v.file} does not exist`);
    if (!Number.isInteger(v.w) || !Number.isInteger(v.h)) fail(`data/images.json#${k}`, "needs integer w and h");
    for (const f of ["credit", "license"]) if (!v[f]) fail(`data/images.json#${k}.${f}`, "is required (every image carries its credit line and license)");
    if (v.media && !B.media.has(v.media)) fail(`data/images.json#${k}.media`, `unknown media "${v.media}"`);
    if (!IMG_KIND[m[1]][1].has(m[2])) warn(`data/images.json#${k}`, `names no ${IMG_KIND[m[1]][0]} record (the image is never shown)`, "images for records that do not exist");
  }

  /* ---------- helpers ---------- */
  /** Records within `meters` of a point: [{ kind: "place"|"stay"|"experience", rec, d }], nearest first. */
  db.nearby = (lat, lng, meters = 800, { kinds = ["place", "stay", "experience"] } = {}) => {
    const out = [];
    const scan = (kind, arr) => { if (!kinds.includes(kind)) return; for (const r of arr) if (r.ll) { const d = haversine({ lat, lng }, { lat: r.ll[0], lng: r.ll[1] }); if (d <= meters && d > 0.5) out.push({ kind, rec: r, d }); } };
    scan("place", db.places); scan("stay", db.stays); scan("experience", db.experiences);
    return sortBy(out, (x) => x.d);
  };
  db.counts = {
    places: db.places.length, stays: db.stays.length, experiences: db.experiences.length, events: liveEvents.length,
    series: db.series.length, areas: db.areas.filter((a) => a.record).length, regions: db.regions.length, timeline: db.timeline.length,
    transport: db.transport.length, faqs: db.faqs.length, heritage: db.heritage.length, routes: db.routes.length, media: db.media.length,
  };
  return db;
}

export { SPECS };
