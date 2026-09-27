#!/usr/bin/env node
/* ============================================================
   scripts/merge-research.mjs · OWNER: Merge (research → data/) · zero dependencies, Node ≥ 18, deterministic
   The research slices (research/<slice>/<slice>.json, final record shapes: research/SCHEMA.md) → data/*.json:

     node scripts/merge-research.mjs             # merge, geocode the gaps (research/tools/geocode.mjs, cached), validate, write
     node scripts/merge-research.mjs --offline   # never touch the network: only the geocoder's cache (a miss stays unknown)
     node scripts/merge-research.mjs --check     # merge + validate with the build's own loader, write nothing
     --allow-missing                             # treat a missing slice as empty (it would drop that slice's records)

   Env: TBC_RESEARCH (default research/), TBC_DATA_OUT (default data/; tests and dry runs write elsewhere).
   Writes data/{regions,areas,places,stays,experiences,events,series,timeline,transport,faqs,facts,media,routes,aliases}.json
   and data/README.md. Never writes data/images.json (images pass), data/map.json (basemap) or anything under research/
   (the geocoder tool appends to its own cache, research/tools/.geocache.jsonl, as every research agent's lookups do).

   Rules (SPEC §2, §7; CLAUDE.md): never invent a fact. Same id in several slices = the same thing, merged field by field
   by the OWNER table below (the verifier-edited record wins over an unverified one); every field conflict is logged with
   both values. Ids are unique across places stays experiences events series areas regions (COLLISION_RULES). Fuzzy
   duplicates merge only through the hand-reviewed DUP_MERGES table. Coordinates: the best-ranked point per record
   (official > OpenStreetMap by name > Census > Wikipedia > manual), never averaged; > 250 m disagreements go to QA.
   Everything is validated by build/core/load.mjs before a single file is written.
   ============================================================ */
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, copyFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { SPECS } from "../build/core/schema.mjs";
import { load } from "../build/core/load.mjs";
import { AREAS, AREA_IDS, REGIONS, REGION_IDS, BOX } from "../build/core/vocab.mjs";
import { aliasKey } from "../site/js/lib/text.js";
import * as L from "./merge-lib.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARGS = new Set(process.argv.slice(2));
const OFFLINE = ARGS.has("--offline"), CHECK = ARGS.has("--check"), ALLOW_MISSING = ARGS.has("--allow-missing");
const RESEARCH = process.env.TBC_RESEARCH ? resolve(REPO, process.env.TBC_RESEARCH) : join(REPO, "research");
const DATA = join(REPO, "data");
const DATA_OUT = process.env.TBC_DATA_OUT ? resolve(REPO, process.env.TBC_DATA_OUT) : DATA;
const CONFIG = JSON.parse(readFileSync(join(REPO, "site.config.json"), "utf8"));
const GEOCODER = join(RESEARCH, "tools", "geocode.mjs");
const GEOCACHE = join(RESEARCH, "tools", ".geocache.jsonl");
const WORK = join(REPO, ".cache", "merge");

/** The 23 research slices (research/README.md), plus media-commons (Commons images for records that had none, written by
 *  research/tools/find-images.mjs). A missing one stops the merge (it would silently drop records). */
const SLICES = [
  "areas", "see-tampa", "see-pinellas", "venues-bay", "outdoors", "around-daytrips", "eat-tampa", "eat-pinellas",
  "history-tampa", "history-region", "stays-tampa-core", "stays-tampa-outer", "stays-stpete-pinellas", "stays-beaches",
  "exp-water", "exp-land", "events-fall", "events-spring", "events-sports", "events-shows", "timeline", "getting-around", "practical",
  "media-commons",
];
const COLLECTIONS = ["regions", "areas", "places", "stays", "experiences", "events", "series", "timeline", "transport", "faqs", "facts", "media"];
const FIELDS = Object.fromEntries(Object.entries(SPECS).map(([c, s]) => [c, Object.keys(s)]));

/* ================================================================ JUDGMENT TABLES (each is printed in data/README.md) ================================================================ */
/** The slices that own heritage blocks (built, architect, style, era, story, visiting; designations and sources are unions). */
const HISTORY_SLICES = new Set(["history-tampa", "history-region"]);
/** Which slice's value wins when records share an id (first = owner). A record whose notes carry a verifier pass
 *  ("Verified 2026-09-27", "Verifier (2026-09-27)") wins over an unverified one before this order applies. Places pick
 *  their list by kind: venues-bay owns venue facts, outdoors parks and beaches, eat-* food and drink, see-* (and
 *  around-daytrips, their counterpart outside the core) attractions; history-* never own the base record, only heritage. */
const PLACE_ATTRACTION = ["see-tampa", "see-pinellas", "around-daytrips", "venues-bay", "outdoors", "eat-tampa", "eat-pinellas", "practical", "history-tampa", "history-region"];
const OWNER = {
  places: {
    venue: ["venues-bay", ...PLACE_ATTRACTION],
    outdoor: ["outdoors", ...PLACE_ATTRACTION],
    eat: ["eat-tampa", "eat-pinellas", ...PLACE_ATTRACTION],
    attraction: PLACE_ATTRACTION,
  },
  stays: ["stays-tampa-core", "stays-tampa-outer", "stays-stpete-pinellas", "stays-beaches", "outdoors", "history-region", "history-tampa"],
  experiences: ["exp-water", "exp-land"],
  events: ["events-sports", "events-shows", "events-fall", "events-spring"],
  // series: the slice holding most of the series' dated events owns it ("events-* own their events"); ties → this order
  series: ["events-spring", "events-fall", "events-sports", "events-shows"],
  timeline: ["timeline"], media: ["history-tampa", "history-region", "timeline", "media-commons"], transport: ["getting-around"],
  faqs: ["practical", "getting-around"], facts: ["practical", "getting-around", "timeline"], regions: ["areas"], areas: ["areas"],
};
const VENUE_KINDS = new Set(["performing-arts", "music-venue", "arena-stadium", "sports"]);
const OUTDOOR_KINDS = new Set(["park", "beach", "state-park", "nature-preserve", "garden", "trail", "island"]);
const EAT_KINDS = new Set(["restaurant", "cafe-bakery", "bar", "brewery", "distillery-winery", "food-hall", "nightlife"]);

/** One id space (places stays experiences events series areas regions): how a shared id is resolved. */
const COLLISION_RULES = [
  { a: "series", b: "*", action: "suffix", suffix: "-series" },   // the annual calendar entry of a place (a market) keeps the place's id
  { a: "places", b: "stays", action: "fold" },                    // a historic hotel is ONE stay with a heritage block, never also a place
];
/** Explicit renames, "collection:id" → new id (win over the rules). */
const ID_COLLISIONS = {};

/** Fuzzy duplicates merged on review: [keep "collection:id", drop "collection:id", evidence]. place → stay folds. */
const DUP_MERGES = [];
/** Fuzzy-duplicate candidates reviewed and kept apart: [a, b, why] (reviewed 2026-09-27 from the records' own addresses and pages). */
const DUP_DISTINCT = [
  ["places:tampa-bay-history-center", "places:columbia-cafe-tampa-bay-history-center", "a museum and the restaurant inside it (both 801 Water St)"],
  ["places:sparkman-wharf", "places:noble-rice", "the waterfront venue and a restaurant in its building (615 Channelside Dr; Noble Rice is Suite 112)"],
  ["places:seminole-hard-rock-casino-tampa", "places:hard-rock-event-center", "the casino and the concert hall of one complex (5223 Orient Rd): a casino and a music venue"],
  ["places:seminole-hard-rock-casino-tampa", "stays:seminole-hard-rock-hotel-casino-tampa", "the casino (things to do) and the hotel (where to stay) of one complex; not a historic hotel, so both stay (153 m apart; the place's alias names the hotel)"],
  ["places:funny-bone-tampa", "places:ybor-city-visitor-information-center", "two tenants of 1600 E 8th Ave (Centro Ybor): a comedy club and the visitor center"],
  ["places:historic-downtown-dade-city", "places:pasco-county-courthouse", "the historic downtown and the 1909 courthouse on its square; the district's alias \"Pasco County Courthouse\" is the courthouse's (ALIAS_DROP)"],
  ["places:flor-fina", "places:cafe-quiquiriqui", "two restaurants in Hotel Haya (1412 E 7th Ave)"],
  ["places:lilac", "places:azure-at-edition", "two restaurants in The Tampa EDITION (500 Channelside Dr): Lilac on the main floor, Azure on the rooftop"],
  ["stays:hyatt-place-tampa-downtown", "stays:hyatt-house-tampa-downtown", "two brands at one address (325 N Florida Ave), each with its own page: two hotels"],
  ["stays:hampton-inn-tampa-downtown-channel-district", "stays:home2-suites-tampa-downtown-channel-district", "two brands at one address (1155 E Kennedy Blvd), each with its own page: two hotels"],
  ["stays:aloft-tampa-midtown", "stays:element-tampa-midtown", "two brands at one address (3650 Midtown Dr), each with its own page: two hotels"],
  ["stays:residence-inn-clearwater-beach", "stays:springhill-suites-clearwater-beach", "two brands at one address (309 Coronado Dr), each with its own page: two hotels"],
  ["events:hyde-park-village-fresh-market-fall-2026", "events:hyde-park-village-pumpkin-patch-2026", "a farmers market and a pumpkin patch at Hyde Park Village"],
  ["events:usf-mens-basketball-vs-charleston-southern-2026-11-02", "events:usf-womens-basketball-vs-furman-2026-11-02", "the men's and the women's teams: two games"],
];
/** Aliases removed on review because they name another record: "collection:id" → [[alias, why]]. */
const ALIAS_DROP = {
  "places:historic-downtown-dade-city": [["Pasco County Courthouse", "it is the courthouse record's own alias (pasco-county-courthouse, one building in the district); shared, it made the name ambiguous"]],
};

/** An event's or series' location_text that names a place in other words: aliasKey(text) → place id. */
const LOCATION_PLACE = {};
/** location_text values the automatic first-part rule must not resolve: aliasKey(text) → why. */
const LOCATION_NOT = {};
/** timeline.places slug variants: research id → data id. */
const TIMELINE_SLUGS = {};
/** Coordinates without geo_source: the research notes' word for the point's source. */
const NOTES_GEO = [[/\b(?:OpenStreetMap|OSM|Photon)\b/i, "photon"], [/\bcensus\b/i, "census"], [/\bwikipedia\b/i, "wikipedia"], [/\b(?:official|publishes)\b/i, "official"]];

/* ================================================================ LOG ================================================================ */
const LOG = { input: [], merge: [], collision: [], dup: [], dupOpen: [], ref: [], location: [], geo: [], geocode: [], status: [], drop: [], fix: [], stale: [] };
const note = (k, m) => LOG[k].push(m);
const CONFLICTS = [];
const fail = (m) => { console.error(`merge-research: ${m}`); process.exit(1); };

/* ================================================================ LOAD ================================================================ */
{
  const missing = SLICES.filter((s) => !existsSync(join(RESEARCH, s, `${s}.json`)));
  if (missing.length && !ALLOW_MISSING) {
    console.error(`merge-research: ${RESEARCH} lacks ${missing.map((s) => `${s}/${s}.json`).join(", ")}.\n` +
      "Refusing to write data/ without them (their records would disappear). Pass --allow-missing to treat them as empty.");
    process.exit(2);
  }
}
/** Trim strings, "" → null (the build fails on empty strings), recursively. */
let trimmed = 0, emptied = 0;
function clean(v) {
  if (typeof v === "string") { const t = v.trim(); if (t !== v) trimmed++; if (!t) { emptied++; return null; } return t; }
  if (Array.isArray(v)) return v.map(clean).filter((x) => x !== null && x !== undefined);
  if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) if (x !== undefined) o[k] = clean(x); return o; }
  return v;
}
const RAW = Object.fromEntries(COLLECTIONS.map((c) => [c, []]));   // collection → [{ slice, rec }]
const SLICE_COUNTS = {};                                              // slice → { collection: n }
for (const slice of SLICES) {
  const f = join(RESEARCH, slice, `${slice}.json`);
  if (!existsSync(f)) { note("input", `research/${slice}/${slice}.json: missing, treated as empty (--allow-missing)`); continue; }
  let doc;
  try { doc = JSON.parse(readFileSync(f, "utf8")); } catch (e) { fail(`research/${slice}/${slice}.json is not valid JSON (${e.message}); a verifier may be mid-edit: re-run when it is done`); }
  if (doc.slice !== slice) note("input", `research/${slice}/${slice}.json: "slice" is ${JSON.stringify(doc.slice)}`);
  SLICE_COUNTS[slice] = {};
  let verified = 0;
  for (const [c, arr] of Object.entries(doc.records || {})) {
    if (!RAW[c]) { note("input", `research/${slice}: unknown collection "${c}" skipped`); continue; }
    for (const r of arr || []) {
      if (!r || typeof r.id !== "string") { note("input", `research/${slice}/${c}: a record without an id skipped`); continue; }
      const rec = clean(r);
      if (L.isVerified(rec)) verified++;
      RAW[c].push({ slice, rec });
    }
    SLICE_COUNTS[slice][c] = (arr || []).length;
  }
  note("input", `research/${slice}/${slice}.json (checked ${doc.checked || "?"}): ${Object.entries(SLICE_COUNTS[slice]).map(([c, n]) => `${n} ${c}`).join(", ") || "no records"}; ${verified} record(s) with a verifier pass in notes`);
}
if (trimmed || emptied) note("fix", `${trimmed} string(s) trimmed, ${emptied} empty string(s) → null (the build rejects empty strings)`);

/* ================================================================ SAME-ID MERGE ================================================================ */
const sliceOrder = (list, slices) => [...new Set([...list, ...[...slices].sort()])];
function placeGroup(parts) {
  const base = parts.filter((p) => !HISTORY_SLICES.has(p.slice));
  const kinds = new Set((base.length ? base : parts).map((p) => p.rec.kind));
  if ([...kinds].some((k) => VENUE_KINDS.has(k))) return "venue";
  if ([...kinds].some((k) => OUTDOOR_KINDS.has(k))) return "outdoor";
  if ([...kinds].some((k) => EAT_KINDS.has(k))) return "eat";
  return "attraction";
}
const seriesEventCount = new Map();   // "slice|series id" → n
for (const { slice, rec } of RAW.events) if (rec.series) seriesEventCount.set(`${slice}|${rec.series}`, (seriesEventCount.get(`${slice}|${rec.series}`) || 0) + 1);
function ownerOrder(c, parts) {
  const slices = new Set(parts.map((p) => p.slice));
  if (c === "places") return sliceOrder(OWNER.places[placeGroup(parts)], slices);
  if (c === "series") {
    const base = sliceOrder(OWNER.series, slices);
    return [...base].sort((a, b) => (seriesEventCount.get(`${b}|${parts[0].rec.id}`) || 0) - (seriesEventCount.get(`${a}|${parts[0].rec.id}`) || 0) || base.indexOf(a) - base.indexOf(b));
  }
  return sliceOrder(OWNER[c] || [], slices);
}
const ONE = { places: "place", stays: "stay", experiences: "experience", events: "event", series: "series", areas: "area", regions: "region" };
const trunc = (v, n = 150) => { const s = typeof v === "string" ? v : JSON.stringify(v); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
const OUT = {};
const COORD_QA = [];      // [{ where, keep, other, d }]
for (const c of COLLECTIONS) {
  const groups = new Map();
  for (const p of RAW[c]) { if (!groups.has(p.rec.id)) groups.set(p.rec.id, []); groups.get(p.rec.id).push(p); }
  const out = [];
  for (const [id, parts0] of groups) {
    if (parts0.length === 1) { out.push(L.canonical(parts0[0].rec, FIELDS[c])); continue; }
    const order = ownerOrder(c, parts0);
    const parts = [...parts0].sort((a, b) => order.indexOf(a.slice) - order.indexOf(b.slice));
    const nameField = c === "events" ? "title" : "name";
    const { rec, conflicts, coords, status } = L.mergeGroup(parts, { fieldOrder: FIELDS[c], isHistory: (s) => HISTORY_SLICES.has(s), nameField });
    out.push(rec);
    const vs = parts.filter((p) => L.isVerified(p.rec)).map((p) => p.slice);
    note("merge", `${c} **${id}** ← ${parts.map((p) => p.slice).join(" + ")} (owner ${parts[0].slice}${vs.length ? `; verified: ${vs.join(", ")}` : ""}${c === "places" ? `; kind group ${placeGroup(parts)}` : ""}${rec.heritage ? `; heritage from ${parts.find((p) => HISTORY_SLICES.has(p.slice) && p.rec.heritage)?.slice || parts.find((p) => p.rec.heritage)?.slice}` : ""}${coords ? `; point from ${coords.from} (${coords.geo_source})` : ""}; ${conflicts.length} conflict(s))`);
    for (const x of conflicts) CONFLICTS.push({ c, ...x });
    if (coords) for (const d of coords.disagreements) COORD_QA.push({ where: `${c}#${id}`, keep: `${coords.from} (${coords.geo_source})`, other: `${d.slice} (${d.geo_source})`, d: d.d });
    if (status) note("status", `${c}#${id}: kept "${status.chosen.status}" from ${status.chosen.slice} (checked ${status.chosen.checked}); ${status.others.map((o) => `${o.slice} says "${o.status}" (checked ${o.checked}${o.note ? `: ${trunc(o.note, 120)}` : ""})`).join("; ")}. QA: settle it at the source.`);
  }
  OUT[c] = out;
}

/* ================================================================ COORDINATES (SPEC §7) ================================================================ */
const AREA_CENTER = new Map(OUT.areas.filter((a) => typeof a.lat === "number").map((a) => [a.id, { lat: a.lat, lng: a.lng }]));
const LOCATED = ["places", "stays", "experiences"];
// (a) coordinates without geo_source: the research notes' word, else drop them (never guess)
for (const c of LOCATED) for (const r of OUT[c]) {
  if (typeof r.lat !== "number" || r.geo_source) continue;
  const hit = NOTES_GEO.find(([re]) => re.test(r.notes || ""));
  if (hit) { r.geo_source = hit[1]; note("geo", `${c}#${r.id}: coordinates without geo_source → "${hit[1]}" (the research notes name the source)`); }
  else { note("geo", `${c}#${r.id}: coordinates ${r.lat}, ${r.lng} without a source dropped (the notes do not say where they came from; re-geocode by hand)`); r.lat = null; r.lng = null; }
}
// (b) no coordinates but a street address: the geocoder (Census, then Photon by name near the area center)
const geocache = new Map();
if (existsSync(GEOCACHE)) for (const line of readFileSync(GEOCACHE, "utf8").split("\n")) { try { const o = JSON.parse(line); geocache.set(o.k, o.v); } catch { /* partial line */ } }
/** Mirror of research/tools/geocode.mjs one(): cached answers only (undefined = never asked). */
function cached({ q, name, near }) {
  const census = (x) => geocache.get(`census:${x.toLowerCase()}`);
  const photon = (x, n) => geocache.get(`photon:${x.toLowerCase()}:${n || ""}`);
  const chain = name ? [() => photon(name, near), ...(q ? [() => census(q), () => photon(q, near)] : [])] : [() => census(q), () => photon(q, near)];
  for (const f of chain) { const v = f(); if (v === undefined) return undefined; if (v) return v; }
  return { error: "no match" };
}
let geoCalls = 0, geoMisses = 0;
function geocode(items) {
  const res = new Map();
  const todo = [];
  for (const it of items) { const v = cached(it); if (v !== undefined) res.set(it.key, v); else todo.push(it); }
  if (todo.length && OFFLINE) { geoMisses += todo.length; for (const it of todo) res.set(it.key, undefined); return res; }
  if (todo.length) {
    mkdirSync(WORK, { recursive: true });
    const f = join(WORK, "geocode-batch.json");
    writeFileSync(f, JSON.stringify(todo.map(({ key, q, name, near }) => ({ key, ...(q ? { q } : {}), ...(name ? { name } : {}), ...(near ? { near } : {}) }))));
    geoCalls += todo.length;
    const r = spawnSync(process.execPath, [GEOCODER, "--batch", f], { encoding: "utf8", env: process.env, timeout: 600000 });
    for (const line of (r.stdout || "").split("\n")) { try { const o = JSON.parse(line); if (o.key) res.set(o.key, o.error ? { error: o.error } : o); } catch { /* not JSON */ } }
    if (r.status !== 0) note("geocode", `the geocoder exited ${r.status}: ${String(r.stderr || "").split("\n")[0]}`);
  }
  return res;
}
const nearOf = (r) => { const a = AREA_CENTER.get(r.area); return a ? `${a.lat.toFixed(4)},${a.lng.toFixed(4)}` : null; };
const queryOf = (r) => {
  const a = String(r.address);
  if (/\b\d{5}\b/.test(a) || (r.city && a.toLowerCase().includes(String(r.city).toLowerCase()))) return a;
  return [a, r.city, `${r.state || "FL"}${r.zip ? ` ${r.zip}` : ""}`].filter(Boolean).join(", ");
};
{
  const need = [];
  for (const c of LOCATED) for (const r of OUT[c]) {
    if (typeof r.lat === "number") continue;
    if (c === "experiences" && r.departs_place) continue;   // it sits at its departure place
    if (!L.streetKey(r.address)) continue;
    need.push({ c, r });
  }
  const pass1 = geocode(need.map(({ c, r }) => ({ key: `${c}#${r.id}`, q: queryOf(r) })));
  const retry = [];
  for (const { c, r } of need) {
    const hit = pass1.get(`${c}#${r.id}`);
    if (hit === undefined) { note("geocode", `${c}#${r.id}: "${queryOf(r)}" is not in the geocoder cache (offline run): no coordinates`); continue; }
    const center = AREA_CENTER.get(r.area);
    const ok = L.acceptGeocode(r, hit, { center, maxKm: 30 });
    if (ok.ok) { r.lat = hit.lat; r.lng = hit.lng; r.geo_source = hit.geo_source; note("geocode", `${c}#${r.id}: ACCEPTED ${hit.geo_source} for "${queryOf(r)}": ${ok.why}`); r.notes = [r.notes, `Merge 2026: coordinates from the ${hit.geo_source === "census" ? "US Census geocoder" : "OpenStreetMap (Photon)"} for "${queryOf(r)}" (${ok.why}).`].filter(Boolean).join(" "); }
    else { note("geocode", `${c}#${r.id}: rejected ${hit.geo_source || ""} for "${queryOf(r)}": ${ok.why}`); retry.push({ c, r }); }
  }
  const pass2 = geocode(retry.filter(({ r }) => nearOf(r)).map(({ c, r }) => ({ key: `${c}#${r.id}`, name: r.name, near: nearOf(r) })));
  for (const { c, r } of retry) {
    const hit = pass2.get(`${c}#${r.id}`);
    if (hit === undefined) { note("geocode", `${c}#${r.id}: name "${r.name}" not in the geocoder cache (offline run): no coordinates`); continue; }
    const ok = L.acceptGeocode(r, hit, { center: AREA_CENTER.get(r.area), maxKm: 15, byName: true });
    if (ok.ok) { r.lat = hit.lat; r.lng = hit.lng; r.geo_source = hit.geo_source; note("geocode", `${c}#${r.id}: ACCEPTED photon by name "${r.name}" near ${nearOf(r)}: ${ok.why}`); r.notes = [r.notes, `Merge 2026: coordinates from OpenStreetMap (Photon) by name (${ok.why}).`].filter(Boolean).join(" "); }
    else note("geocode", `${c}#${r.id}: rejected photon by name "${r.name}": ${ok.why}: no coordinates`);
  }
}

/* ================================================================ ALIASES NAMING ANOTHER RECORD ================================================================ */
for (const [ref, drops] of Object.entries(ALIAS_DROP)) {
  const [c, id] = ref.split(":");
  const r = OUT[c]?.find((x) => x.id === id);
  if (!r) { note("stale", `ALIAS_DROP ${ref}: no such record`); continue; }
  for (const [a, why] of drops) {
    const before = (r.aliases || []).length;
    r.aliases = (r.aliases || []).filter((x) => L.nameKey(x) !== L.nameKey(a));
    if (r.aliases.length < before) note("fix", `${ref}: alias "${a}" removed: ${why}`); else note("stale", `ALIAS_DROP ${ref}: no alias "${a}"`);
  }
}

/* ================================================================ FUZZY DUPLICATES ================================================================ */
const REMAP = new Map();          // "collection:old id" → "collection:new id"
const FOLDED = new Map();         // place id → stay id (the place folded into a stay)
const DROPPED = new Map();        // "collection:id" → { name, why }
const byRef = (ref) => { const [c, id] = ref.split(":"); return (OUT[c] || []).find((r) => r.id === id) || null; };
const reviewed = new Set([...DUP_MERGES, ...DUP_DISTINCT].map(([a, b]) => [a, b].sort().join(" ~ ")));
{
  const items = [...OUT.places.map((rec) => ({ c: "places", rec })), ...OUT.stays.map((rec) => ({ c: "stays", rec }))];
  const cands = [...L.dupCandidates(items), ...L.dupCandidates(OUT.experiences.map((rec) => ({ c: "experiences", rec }))), ...L.dupCandidates(OUT.events.map((rec) => ({ c: "events", rec })))];
  for (const x of cands) if (!reviewed.has([x.a, x.b].sort().join(" ~ "))) note("dupOpen", `${x.a} ~ ${x.b}: ${x.reasons.join(", ")}${x.d !== null ? ` (${x.d} m apart)` : ""}: "${byRef(x.a)?.name || byRef(x.a)?.title}" / "${byRef(x.b)?.name || byRef(x.b)?.title}"`);
  for (const [a, b, why] of DUP_DISTINCT) {
    if (!byRef(a) || !byRef(b)) { note("stale", `DUP_DISTINCT ${a} ~ ${b}: a record no longer exists (entry kept for the record)`); continue; }
    note("dup", `kept apart: ${a} ~ ${b}: ${why}`);
  }
  for (const [keep, drop, why] of DUP_MERGES) {
    const K = byRef(keep), D = byRef(drop);
    if (!K || !D) { note("stale", `DUP_MERGES ${keep} ← ${drop}: ${!K ? keep : drop} no longer exists`); continue; }
    const [kc] = keep.split(":"), [dc] = drop.split(":");
    if (kc === dc) {
      const { rec, conflicts } = L.mergeGroup([{ slice: K.id, rec: K }, { slice: D.id, rec: { ...D, id: K.id } }], { fieldOrder: FIELDS[kc], isHistory: () => false, nameField: kc === "events" ? "title" : "name" });
      OUT[kc][OUT[kc].indexOf(K)] = rec;
      OUT[dc].splice(OUT[dc].indexOf(D), 1);
      for (const x of conflicts) CONFLICTS.push({ c: kc, ...x, why: `DUP_MERGES (${x.why})` });
    } else if (dc === "places" && kc === "stays") {
      OUT.stays[OUT.stays.indexOf(K)] = L.foldPlaceIntoStay(D, K, { fieldOrder: FIELDS.stays });
      OUT.places.splice(OUT.places.indexOf(D), 1);
      FOLDED.set(D.id, K.id);
    } else fail(`DUP_MERGES ${keep} ← ${drop}: only same-collection merges and place → stay folds are supported`);
    REMAP.set(drop, keep);
    note("dup", `merged: ${keep} ← ${drop}: ${why}`);
  }
}

/* ================================================================ ONE ID SPACE ================================================================ */
{
  const { renames, folds, unresolved } = L.resolveIdCollisions(OUT, COLLISION_RULES, ID_COLLISIONS);
  if (unresolved.length) fail(`ids shared across collections with no rule: ${unresolved.map((u) => `${u.id} (${u.collections.join(", ")})`).join("; ")}. Add an ID_COLLISIONS entry or a COLLISION_RULES rule.`);
  for (const r of renames) {
    const rec = OUT[r.collection].find((x) => x.id === r.from);
    rec.id = r.to;
    REMAP.set(`${r.collection}:${r.from}`, `${r.collection}:${r.to}`);
    let extra = "";
    if (r.collection === "series" && r.other.includes("places") && !rec.place) { rec.place = r.from; extra = `; series.place set to the place "${r.from}" (the same market or venue)`; }
    rec.notes = [rec.notes, `Merge 2026: id "${r.from}" is also a ${r.other.map((o) => ONE[o] || o).join("/")} id, so this record is "${r.to}".`].filter(Boolean).join(" ");
    note("collision", `${r.collection}:${r.from} → ${r.collection}:${r.to} (${r.why}; the ${r.other.map((o) => ONE[o] || o).join("/")} record keeps "${r.from}")${extra}`);
  }
  for (const f of folds) {
    const P = OUT.places.find((x) => x.id === f.from), S = OUT.stays.find((x) => x.id === f.to);
    OUT.stays[OUT.stays.indexOf(S)] = L.foldPlaceIntoStay(P, S, { fieldOrder: FIELDS.stays });
    OUT.places.splice(OUT.places.indexOf(P), 1);
    FOLDED.set(P.id, S.id);
    note("collision", `places:${f.from} folded into stays:${f.to} (a hotel that is also a landmark is one stay; its heritage, tags, aliases and sources moved)`);
  }
}

/* ================================================================ CLOSURES ================================================================ */
for (const c of LOCATED) OUT[c] = OUT[c].filter((r) => {
  if (r.status !== "closed") return true;
  if (r.heritage) { note("status", `${c}#${r.id}: closed for good, kept for its heritage block (${trunc(r.status_note || "", 100)})`); return true; }
  DROPPED.set(`${c}:${r.id}`, { name: r.name, why: `closed for good: ${r.status_note || "no note"}` });
  note("drop", `${c}#${r.id} ("${r.name}"): closed for good and no heritage block (${trunc(r.status_note || "", 120)})`);
  return false;
});

/* ================================================================ REFERENCES ================================================================ */
const ids = (c) => new Set(OUT[c].map((r) => r.id));
const PLACE = new Map(OUT.places.map((r) => [r.id, r])), STAY = new Map(OUT.stays.map((r) => [r.id, r]));
const SERIES = ids("series"), MEDIA = new Set(OUT.media.map((m) => m.id));
const remapId = (c, id) => { const r = REMAP.get(`${c}:${id}`); return r ? r.split(":")[1] : id; };
/** A place reference → { id } (still a place), { stay } (folded into a stay), { gone } (dropped), { unknown }. */
function placeRef(id) {
  const to = remapId("places", id);
  if (PLACE.has(to)) return { id: to };
  if (FOLDED.has(id)) return { stay: STAY.get(FOLDED.get(id)) };
  if (DROPPED.has(`places:${id}`)) return { gone: DROPPED.get(`places:${id}`) };
  return { unknown: true };
}
// place keys for location_text: every place name and alias (keys shared by two places are ambiguous and dropped)
const placeKeys = new Map(), ambiguous = new Set();
for (const p of OUT.places) for (const n of [p.name, ...(p.aliases || [])]) {
  const k = L.nameKey(n);
  if (!k) continue;
  if (placeKeys.has(k) && placeKeys.get(k) !== p.id) ambiguous.add(k); else placeKeys.set(k, p.id);
}
for (const k of ambiguous) placeKeys.delete(k);
const ALIAS_OUT = {};   // aliasKey → place id (data/aliases.json)
function resolvePlace(c, r) {
  if (r.place) {
    const ref = placeRef(r.place);
    if (ref.id) { if (ref.id !== r.place) note("ref", `${c}#${r.id}.place ${r.place} → ${ref.id} (merged)`); r.place = ref.id; return; }
    const was = r.place;
    r.place = null;
    if (ref.stay) {
      r.location_text ||= [ref.stay.name, ref.stay.address].filter(Boolean).join(", ");
      if (!r.area) r.area = ref.stay.area;
      note("ref", `${c}#${r.id}.place ${was}: now a stay (folded), so place → null and location_text "${r.location_text}"`);
    } else {
      const why = ref.gone ? `dropped (${ref.gone.why})` : "no such place";
      if (!r.location_text) fail(`${c}#${r.id}.place "${was}": ${why}, and the record has no location_text to fall back on: fix the research or the tables`);
      note("ref", `${c}#${r.id}.place "${was}": ${why}; place → null (location_text kept: "${r.location_text}")`);
    }
    return;
  }
  if (!r.location_text) return;
  const key = aliasKey(r.location_text);
  if (LOCATION_NOT[key]) { note("location", `${c}#${r.id}: "${r.location_text}" left as text (LOCATION_NOT: ${LOCATION_NOT[key]})`); return; }
  let hit = LOCATION_PLACE[key] ? { id: LOCATION_PLACE[key], how: "LOCATION_PLACE table" } : L.firstSegmentPlace(r.location_text, placeKeys);
  if (hit && !PLACE.has(hit.id)) { note("stale", `LOCATION_PLACE "${key}" → ${hit.id}: no such place`); hit = null; }
  if (!hit) return;
  r.place = hit.id;
  const p = PLACE.get(hit.id);
  if (!placeKeys.has(L.nameKey(r.location_text)) || placeKeys.get(L.nameKey(r.location_text)) !== hit.id) ALIAS_OUT[key] = hit.id;
  note("location", `${c}#${r.id}: "${r.location_text}" → place ${hit.id} (${hit.how})${r.area && p.area !== r.area ? `; QA: the record's area ${r.area} ≠ the place's area ${p.area}` : ""}`);
}
for (const e of OUT.events) {
  resolvePlace("events", e);
  if (e.series) {
    const to = remapId("series", e.series);
    if (to !== e.series) { note("ref", `events#${e.id}.series ${e.series} → ${to} (renamed)`); e.series = to; }
    if (!SERIES.has(e.series)) { note("ref", `events#${e.id}.series "${e.series}": no such series; → null`); e.series = null; }
  }
}
for (const s of OUT.series) resolvePlace("series", s);
for (const x of OUT.experiences) {
  if (!x.departs_place) continue;
  const ref = placeRef(x.departs_place);
  if (ref.id) { if (ref.id !== x.departs_place) note("ref", `experiences#${x.id}.departs_place ${x.departs_place} → ${ref.id}`); x.departs_place = ref.id; continue; }
  const was = x.departs_place;
  x.departs_place = null;
  if (ref.stay) {
    x.departs_text ||= ref.stay.name;
    if (typeof x.lat !== "number" && typeof ref.stay.lat === "number") { x.lat = ref.stay.lat; x.lng = ref.stay.lng; x.geo_source = ref.stay.geo_source; }
    note("ref", `experiences#${x.id}.departs_place ${was}: now a stay; departs_text "${x.departs_text}" and the stay's point`);
  } else {
    if (!x.departs_text && typeof x.lat !== "number") fail(`experiences#${x.id}.departs_place "${was}": ${ref.gone ? "dropped" : "unknown"}, and no departs_text or coordinates to fall back on`);
    note("ref", `experiences#${x.id}.departs_place "${was}": ${ref.gone ? `dropped (${ref.gone.why})` : "no such place"}; → null`);
  }
}
// media: subjects that still exist (a folded place's images follow it to the stay)
const SUBJECT = { place: () => ids("places"), stay: () => ids("stays"), area: () => new Set(AREA_IDS), region: () => new Set(REGION_IDS), timeline: () => ids("timeline"), event: () => ids("events"), series: () => ids("series"), experience: () => ids("experiences") };
OUT.media = OUT.media.filter((m) => {
  if (m.subject_kind === "place" && FOLDED.has(m.subject)) { note("ref", `media#${m.id}: subject place:${m.subject} → stay:${FOLDED.get(m.subject)} (folded)`); m.subject_kind = "stay"; m.subject = FOLDED.get(m.subject); }
  const kindC = { place: "places", stay: "stays", timeline: "timeline", event: "events", series: "series", experience: "experiences" }[m.subject_kind];
  if (kindC) { const to = remapId(kindC, m.subject); if (to !== m.subject) { note("ref", `media#${m.id}: subject ${m.subject} → ${to}`); m.subject = to; } }
  if (SUBJECT[m.subject_kind] && SUBJECT[m.subject_kind]().has(m.subject)) return true;
  note("drop", `media#${m.id} ("${m.title}"): its subject ${m.subject_kind}:${m.subject} is not in the data`);
  return false;
});
for (const m of OUT.media) MEDIA.add(m.id);
{
  const kept = new Set(OUT.media.map((m) => m.id));
  for (const id of [...MEDIA]) if (!kept.has(id)) MEDIA.delete(id);
}
// timeline: places or stays (slug variants mapped), media that exist
const compact = (s) => String(s).replace(/^the-/, "").replace(/-/g, "");
const COMPACT = new Map([...PLACE.keys(), ...STAY.keys()].map((id) => [compact(id), id]));
for (const t of OUT.timeline) {
  const out = [];
  for (const pid0 of t.places || []) {
    let pid = TIMELINE_SLUGS[pid0] || remapId("places", pid0);
    if (FOLDED.has(pid)) pid = FOLDED.get(pid);
    if (!PLACE.has(pid) && !STAY.has(pid)) {
      const v = COMPACT.get(compact(pid));
      if (v) { note("ref", `timeline#${t.id}.places "${pid0}" → "${v}" (slug variant)`); pid = v; }
      else { note("ref", `timeline#${t.id}.places "${pid0}": no such place or stay${DROPPED.has(`places:${pid0}`) ? " (dropped: closed)" : ""}; removed`); continue; }
    } else if (pid !== pid0) note("ref", `timeline#${t.id}.places "${pid0}" → "${pid}"`);
    if (!out.includes(pid)) out.push(pid);
  }
  if (t.places) t.places = out;
  if (t.media) t.media = t.media.filter((m) => { if (MEDIA.has(m)) return true; note("ref", `timeline#${t.id}.media "${m}": no such media; removed`); return false; });
}
for (const t of OUT.transport) (t.stops || []).forEach((s, i) => {
  if (!s.place) return;
  const ref = placeRef(s.place);
  if (ref.id) { s.place = ref.id; return; }
  note("ref", `transport#${t.id}.stops[${i}].place "${s.place}": ${ref.stay ? "now a stay" : ref.gone ? "dropped" : "no such place"}; → null (the stop keeps its name)`);
  s.place = null;
});
// routes (Passages, build phase): keep what the page lane wrote; the fixture's placeholder route goes
let ROUTES = [];
if (existsSync(join(DATA, "routes.json"))) {
  const prev = JSON.parse(readFileSync(join(DATA, "routes.json"), "utf8"));
  for (const r of Array.isArray(prev) ? prev : []) {
    if (/^FIXTURE/.test(r.notes || "")) { note("drop", `routes#${r.id}: the test fixture's route (data/ was a copy of tests/fixtures/mini)`); continue; }
    for (const s of r.stops || []) { const c = { place: "places", stay: "stays", experience: "experiences", event: "events" }[s.kind]; if (c) s.id = remapId(c, s.id); if (s.kind === "place" && FOLDED.has(s.id)) { s.kind = "stay"; s.id = FOLDED.get(s.id); } }
    ROUTES.push(r);
  }
}
// aliases.json: the resolved location texts + earlier entries that still name a place and add something
{
  const prev = existsSync(join(DATA, "aliases.json")) ? JSON.parse(readFileSync(join(DATA, "aliases.json"), "utf8")) : {};
  const nameKeys = new Set(OUT.places.flatMap((p) => [p.name, ...(p.aliases || [])].map(aliasKey)));
  for (const [k, v] of Object.entries(prev.places || {})) {
    const to = remapId("places", v);
    if (!PLACE.has(to)) { note("drop", `aliases.json "${k}" → ${v}: no such place`); continue; }
    if (nameKeys.has(aliasKey(k))) { note("drop", `aliases.json "${k}" → ${v}: already a name or alias of a place (redundant)`); continue; }
    ALIAS_OUT[aliasKey(k)] ||= to;
  }
  for (const k of Object.keys(ALIAS_OUT)) if (nameKeys.has(k)) delete ALIAS_OUT[k];
}

/* ================================================================ SORT ================================================================ */
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
for (const c of COLLECTIONS) OUT[c] = OUT[c].map((r) => L.canonical(r, FIELDS[c])).sort(byId);   // fields set after the merge take their schema place
OUT.events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || String(a.start ?? "99:99").localeCompare(String(b.start ?? "99:99")) || String(a.title).localeCompare(String(b.title), "en") || byId(a, b));
OUT.routes = ROUTES.sort(byId);
const ALIASES = { places: Object.fromEntries(Object.keys(ALIAS_OUT).sort().map((k) => [k, ALIAS_OUT[k]])) };
for (const aid of AREA_IDS) if (!OUT.areas.some((a) => a.id === aid)) note("input", `areas.json lacks the area "${aid}" (the build synthesizes it)`);
for (const rid of REGION_IDS) if (!OUT.regions.some((r) => r.id === rid)) note("input", `regions.json lacks the region "${rid}" (the build synthesizes it)`);

/* ================================================================ VALIDATE (the build's own loader) ================================================================ */
const FILES = [...COLLECTIONS, "routes"];
const tmp = mkdtempSync(join(tmpdir(), "tbc-merge-"));
let db = null;
const ERR = [], WARN = [];
try {
  for (const f of FILES) writeFileSync(join(tmp, `${f}.json`), JSON.stringify(OUT[f], null, 2) + "\n");
  writeFileSync(join(tmp, "aliases.json"), JSON.stringify(ALIASES, null, 2) + "\n");
  for (const f of ["images.json", "map.json"]) if (existsSync(join(DATA, f))) copyFileSync(join(DATA, f), join(tmp, f));
  db = load({ dataDir: tmp, siteDir: join(REPO, "site"), config: CONFIG, fail: (w, m) => ERR.push(`${w}: ${m}`), warn: (w, m, g) => WARN.push({ w, m, g: g || m }) });
} finally { rmSync(tmp, { recursive: true, force: true }); }
if (ERR.length) { for (const e of ERR) console.error(`ERROR ${e}`); console.error(`\n${ERR.length} error(s) from build/core/load.mjs: nothing written.`); process.exit(1); }
const warnGroups = new Map();
for (const w of WARN) { if (!warnGroups.has(w.g)) warnGroups.set(w.g, []); warnGroups.get(w.g).push(w); }

/* ================================================================ QA FLAGS ================================================================ */
const QA = { noCoords: [], noSummary: [], noUrl: [], guess: [], longQuote: [], weekday: [], farFromArea: [], freeWithPrice: [], closedVenue: [], noArea: [], ambiguous: [], placeholderSummary: [] };
const hasLL = (r) => typeof r.lat === "number";
for (const c of LOCATED) for (const r of OUT[c]) {
  const dp = c === "experiences" && r.departs_place ? PLACE.get(r.departs_place) : null;
  if (!hasLL(r) && !(dp && hasLL(dp))) QA.noCoords.push(`${c}#${r.id}${r.address ? ` (address: ${r.address})` : ""}`);
  if (!r.summary) QA.noSummary.push(`${c}#${r.id}`);
  if (!r.url) QA.noUrl.push(`${c}#${r.id}`);
  const center = AREA_CENTER.get(r.area);
  if (center && hasLL(r)) {
    const km = L.haversine(center, r) / 1000, lim = ["around", "daytrips"].includes(AREAS[r.area]) ? 60 : 20;
    if (km > lim) QA.farFromArea.push(`${c}#${r.id}: ${km.toFixed(1)} km from the center of its area "${r.area}" (${r.geo_source})`);
  }
  if (r.is_free === true && /\$\s?\d/.test(r.price_text || "")) QA.freeWithPrice.push(`${c}#${r.id}: is_free true, price_text "${trunc(r.price_text, 100)}"`);
}
for (const c of ["events", "series"]) for (const r of OUT[c]) if (!r.summary) QA.noSummary.push(`${c}#${r.id}`);
for (const c of [...LOCATED, "events", "series"]) for (const r of OUT[c]) if (/\b(?:TBA|TBD|TBC)\b/.test(r.summary || "")) QA.placeholderSummary.push(`${c}#${r.id}.summary: "${trunc(r.summary, 140)}" (our own words: say what is not known instead)`);
const GUESS_FIELDS = { places: ["price_text", "hours_text"], experiences: ["price_text"], events: ["cost"], transport: ["fare_text", "hours_text"] };
for (const [c, fs] of Object.entries(GUESS_FIELDS)) for (const r of OUT[c]) for (const f of fs) { const w = L.guessWords(r[f]); if (w) QA.guess.push(`${c}#${r.id}.${f}: "${trunc(r[f], 120)}" (word: "${w}")`); }
for (const c of ["places", "stays", "experiences", "series"]) for (const r of OUT[c]) if (r.quote && L.wordCount(r.quote) > 40) QA.longQuote.push(`${c}#${r.id}: ${L.wordCount(r.quote)} words`);
for (const r of OUT.events) {
  const text = [r.title, r.description, r.summary, r.time_text].filter(Boolean).join(" \n ");
  const yrs = [...new Set([r.date, r.end_date, ...(r.occurrences || []).map((o) => o.date)].filter(Boolean).map((d) => Number(d.slice(0, 4))))];
  for (const m of L.weekdayMismatches(text, { years: () => yrs })) QA.weekday.push(`events#${r.id}: "${m.text}" but ${m.date} is a ${m.actual[0].toUpperCase() + m.actual.slice(1)}`);
  // a single-day event whose text names exactly one weekday, and not the date's
  if (!r.end_date && !(r.occurrences || []).length) {
    const days = new Set([...String([r.description, r.time_text].filter(Boolean).join(" ")).matchAll(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)s?\b/g)].map((m) => m[1]));
    const actual = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(`${r.date}T12:00:00Z`).getUTCDay()];
    if (days.size === 1 && !days.has(actual) && !/\bevery\b|\bweekly\b|\bthrough\b|\buntil\b/i.test(r.description || "")) QA.weekday.push(`events#${r.id}: ${r.date} is a ${actual}; its text names only ${[...days][0]}`);
  }
  if (r.is_free === true && /\$\s?\d/.test(r.cost || "")) QA.freeWithPrice.push(`events#${r.id}: is_free true, cost "${trunc(r.cost, 100)}"`);
  if (r.place && PLACE.get(r.place) && ["temporarily-closed", "closed"].includes(PLACE.get(r.place).status) && !["cancelled", "postponed"].includes(r.status)) QA.closedVenue.push(`events#${r.id} (${r.date}) at ${r.place}, which is ${PLACE.get(r.place).status}`);
  if (!r.area && !(r.place && PLACE.get(r.place)?.area)) QA.noArea.push(`events#${r.id}: "${r.location_text || ""}"`);
}
{
  const shared = new Map();
  for (const p of OUT.places) for (const n of [p.name, ...(p.aliases || [])]) { const k = L.nameKey(n); if (!shared.has(k)) shared.set(k, new Set()); shared.get(k).add(p.id); }
  for (const [k, set] of shared) if (set.size > 1) QA.ambiguous.push(`"${k}": ${[...set].join(", ")} (not used to resolve location texts)`);
}
for (const s of OUT.series) for (const m of L.weekdayMismatches(s.when_text || "", { years: () => [2025, 2026, 2027] })) QA.weekday.push(`series#${s.id}.when_text: "${m.text}" but ${m.date} is a ${m.actual[0].toUpperCase() + m.actual.slice(1)}`);

/* ================================================================ COUNTS + README ================================================================ */
const regionOfRec = (c, r) => {
  if (c === "transport") return r.regions || [];
  let a = r.area;
  if (!a && r.place && PLACE.get(r.place)) a = PLACE.get(r.place).area;
  if (!a && c === "timeline" && (r.places || []).length) a = (PLACE.get(r.places[0]) || STAY.get(r.places[0]))?.area;
  return a && AREAS[a] ? [AREAS[a]] : [];
};
const REGION_ROWS = ["areas", "places", "stays", "experiences", "events", "series", "timeline", "transport"];
const regionCounts = Object.fromEntries(REGION_ROWS.map((c) => {
  const row = Object.fromEntries([...REGION_IDS, "none"].map((k) => [k, 0]));
  for (const r of OUT[c]) { const rs = c === "areas" ? [AREAS[r.id]] : regionOfRec(c, r); if (!rs.length) row.none++; for (const x of rs) row[x]++; }
  return [c, row];
}));
const heritageN = OUT.places.filter((p) => p.heritage).length + OUT.stays.filter((s) => s.heritage).length;
const provenance = Object.fromEntries(COLLECTIONS.map((c) => [c, Object.entries(SLICE_COUNTS).filter(([, m]) => m[c]).map(([s, m]) => `${s} ${m[c]}`)]));
const factConflicts = CONFLICTS.filter((x) => x.kind === "fact"), textConflicts = CONFLICTS.filter((x) => x.kind !== "fact");
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const summaryLine = `${FILES.map((f) => `${f} ${OUT[f].length}`).join(" · ")} · aliases ${Object.keys(ALIASES.places).length} · conflicts ${CONFLICTS.length} (${factConflicts.length} fact) · open dup candidates ${LOG.dupOpen.length}${geoCalls ? ` · geocoder lookups ${geoCalls}` : ""}${geoMisses ? ` · geocoder cache misses ${geoMisses}` : ""}`;

function readme() {
  const Ls = [];
  const P = (...x) => Ls.push(...x);
  const list = (title, arr, empty = "None.") => { P(`### ${title}`, ""); if (!arr.length) P(empty, ""); else { for (const x of arr) P(`- ${x}`); P(""); } };
  P("# data/: the merged research", "",
    "Generated by `scripts/merge-research.mjs` from the research slices in `research/<slice>/<slice>.json` (shapes: `research/SCHEMA.md`).",
    "Every record keeps its `source_url` (the page that was read) and `checked`; unknowns are `null`; summaries are the researchers' own",
    "words and quotes are verbatim. The script validates everything with the build's own loader (`build/core/load.mjs`) before it writes",
    "a single file. **After the merge, `data/*.json` is the source of truth**: correct a record here (CLAUDE.md, \"The loop\"), never by",
    "re-running the merge, which replaces these files and loses every hand edit.", "",
    "## Regenerate", "", "```sh",
    "node scripts/merge-research.mjs              # research → data/*.json + this README (geocodes gaps: research/tools/geocode.mjs, cached)",
    "node scripts/merge-research.mjs --offline    # the geocoder's cache only (research/tools/.geocache.jsonl), no network",
    "node scripts/merge-research.mjs --check      # merge + validate, write nothing",
    "node --test tests/merge.test.mjs             # the merge helpers' unit tests",
    "```", "",
    "The script never writes `research/`, `data/images.json` (images pass) or `data/map.json` (basemap). The geocoder tool appends its",
    "answers to its own cache; with the same research and cache the output is byte-identical. If a regeneration is ever needed after hand",
    "edits, run it, then `git diff data/` and re-apply the edits (their `notes` say what and why).", "");
  P("## Counts", "", `| file | records |`, `|---|---:|`, ...FILES.map((f) => `| ${f}.json | ${OUT[f].length} |`), `| aliases.json (places) | ${Object.keys(ALIASES.places).length} |`, "",
    `Heritage blocks: ${heritageN} (${OUT.places.filter((p) => p.heritage).length} places, ${OUT.stays.filter((s) => s.heritage).length} stays). Events by status: ${Object.entries(OUT.events.reduce((m, e) => ((m[e.status] = (m[e.status] || 0) + 1), m), {})).map(([k, n]) => `${n} ${k}`).join(", ")}. ` +
    `Places by status: ${Object.entries(OUT.places.reduce((m, e) => ((m[e.status] = (m[e.status] || 0) + 1), m), {})).map(([k, n]) => `${n} ${k}`).join(", ")}. Stays by status: ${Object.entries(OUT.stays.reduce((m, e) => ((m[e.status] = (m[e.status] || 0) + 1), m), {})).map(([k, n]) => `${n} ${k}`).join(", ")}.`, "",
    "### Per region (sheet)", "",
    `| file | ${REGION_IDS.map((r) => `${REGIONS[r].code} ${REGIONS[r].name}`).join(" | ")} | no region | total |`,
    `|---|${REGION_IDS.map(() => "---:").join("|")}|---:|---:|`,
    ...REGION_ROWS.map((c) => `| ${c} | ${REGION_IDS.map((r) => regionCounts[c][r]).join(" | ")} | ${regionCounts[c].none} | ${OUT[c].length} |`), "",
    "Region follows from `area` (an event or series without one takes its place's; a timeline entry its first place's); transport counts",
    "once per region it serves.", "");
  P("## Provenance per file", "", "| file | research slices (records read) |", "|---|---|",
    ...COLLECTIONS.map((c) => `| ${c}.json | ${provenance[c].join(", ") || "none"} |`),
    "| routes.json | written in the build phase (Passages); the merge keeps what is there and drops the test fixture's route |",
    "| aliases.json | location texts the merge resolved to a place, plus earlier entries that still add something |", "");
  P("## Policies", "",
    "### Same id in several slices (OWNER)", "",
    "Records that share an id are one thing, merged field by field. For each field the value comes from the first record that has one,",
    "in this order: **a record with a verifier pass in its notes** (\"Verified 2026-09-27\", \"Verifier (2026-09-27)\") before an unverified",
    "one, then the owner order below. Lists (`aliases kinds topics tags features months known_for`) are unions; the other slices' names",
    "become `aliases` and their kinds `kinds`; `featured`/`signature` are true when any slice sets them; `source_url` is the winning",
    "record's and every other page read goes to `also_sources`; a quote travels with its page (`quote_source`); `checked` is the latest.",
    "Heritage blocks come from **history-tampa / history-region** first (built, architect, style, era, story, visiting), with designations",
    "united by name + ref and `sources` united. Coordinates follow SPEC §7 (below). Status follows the most recent `checked` evidence.", "",
    "| collection | owner order |", "|---|---|",
    `| places (venue kinds: ${[...VENUE_KINDS].join(", ")}) | ${OWNER.places.venue.slice(0, 3).join(" > ")} > … |`,
    `| places (outdoor kinds: ${[...OUTDOOR_KINDS].join(", ")}) | ${OWNER.places.outdoor.slice(0, 3).join(" > ")} > … |`,
    `| places (eat and drink kinds: ${[...EAT_KINDS].join(", ")}) | ${OWNER.places.eat.slice(0, 4).join(" > ")} > … |`,
    `| places (everything else: attractions) | ${OWNER.places.attraction.join(" > ")} |`,
    `| stays | ${OWNER.stays.join(" > ")} |`, `| experiences | ${OWNER.experiences.join(" > ")} |`, `| events | ${OWNER.events.join(" > ")} |`,
    `| series | the slice with most of the series' dated events, then ${OWNER.series.join(" > ")} |`,
    `| media, faqs, facts | ${OWNER.media.join(" > ")}; ${OWNER.faqs.join(" > ")}; ${OWNER.facts.join(" > ")} |`, "",
    "A place's kind group is read from its non-history records' primary kinds (venue before outdoor before eat).", "");
  list("Merged records", LOG.merge);
  P("### One id space (collisions)", "",
    "Ids are unique across places, stays, experiences, events, series, areas and regions. Rules: " +
    COLLISION_RULES.map((r) => (r.action === "suffix" ? `a ${ONE[r.a]} id that is also ${r.b === "*" ? "any other record's" : `a ${ONE[r.b]}`} id gets \`${r.suffix}\`` : `a ${ONE[r.a]} that is also a ${ONE[r.b]} is folded into the ${ONE[r.b]} (its heritage, tags, aliases and sources move; references are rewritten)`)).join("; ") +
    `. Explicit renames: ${Object.keys(ID_COLLISIONS).length ? Object.entries(ID_COLLISIONS).map(([k, v]) => `\`${k}\` → \`${v}\``).join(", ") : "none"}. Anything else stops the merge.`, "");
  list("Applied", LOG.collision);
  P("### Fuzzy duplicates (DUP_MERGES, DUP_DISTINCT)", "",
    "Candidates: places and stays with the same name (or alias) or the same street address within 150 m (across places and stays, the",
    "name only); experiences with the same name and operator; events on overlapping dates at the same place with most title words shared.",
    "Nothing merges automatically: each candidate is reviewed by hand and listed in `DUP_MERGES` (merged, with evidence) or `DUP_DISTINCT`",
    "(two things). Two locations of one chain are distinct.", "");
  list("Decisions", LOG.dup);
  list("Candidates not yet reviewed (add each to DUP_MERGES or DUP_DISTINCT)", LOG.dupOpen);
  P("### Coordinates (SPEC §7)", "",
    "Per record the most accurate point wins, never an average: " + Object.entries(L.GEO_RANK).sort((a, b) => a[1] - b[1]).map(([k, v]) => `${k} (${v})`).join(" > ") + ".",
    "When two slices' points for one record are more than 250 m apart the best-ranked one is kept and the case is listed below for QA.",
    "Coordinates without `geo_source` take the source the research notes name, else they are dropped. Records without coordinates that",
    "have a street address go to the geocoder (the US Census, then OpenStreetMap by name near the area's center); a match is accepted",
    "only when its house number and street (direction included) or its name are the record's.", "");
  list("Points more than 250 m apart (QA: settle from the source)", COORD_QA.map((x) => `${x.where}: kept ${x.keep}; ${x.other} is ${x.d} m away`));
  list("Geocoding", LOG.geocode.concat(LOG.geo));
  P("### Closures", "",
    "`status` is what the source says as of `checked`. When slices disagree, the most recent `checked` wins (then the verified record, then",
    "the owner) and the case is listed for QA. Places, stays and experiences closed for good are dropped unless they carry a heritage block",
    "(then kept with `status: \"closed\"`).", "");
  list("Status decisions", LOG.status);
  P("### References", "",
    "`event.place` / `series.place`: a `location_text` whose first part (before a comma, semicolon, parenthesis or colon) is exactly one",
    "place's name or alias gets that `place` (texts that join several places are left alone; `LOCATION_PLACE` and `LOCATION_NOT` override);",
    "the text is kept and also written to `aliases.json` so the build resolves it the same way. `timeline.places` keeps ids that are places or",
    "stays (slug variants mapped), `media.subject` must exist (else the image is dropped), `transport.stops[].place` must be a place.", "");
  list("location_text resolved", LOG.location);
  list("Rewritten or removed references", LOG.ref);
  list("Dropped on purpose", LOG.drop);
  list("Corrections and normalizations", LOG.fix);
  list("Stale table entries", LOG.stale);
  P("## Conflicts", "",
    `${CONFLICTS.length} field conflicts between slices (${factConflicts.length} facts, ${textConflicts.length} text variants and flags). The kept value`,
    "follows the policy above; QA should settle each fact from its source. Values are shortened to 150 characters.", "",
    "### Facts", "", "| record | field | kept | other | why |", "|---|---|---|---|---|",
    ...factConflicts.map((x) => `| ${x.c}#${x.id} | ${x.field} | ${x.winner.slice}: ${esc(trunc(x.winner.v))} | ${x.loser.slice}: ${esc(trunc(x.loser.v))} | ${x.why} |`), "",
    "### Text variants and editorial flags", "", "| record | field | kept | other | why |", "|---|---|---|---|---|",
    ...textConflicts.map((x) => `| ${x.c}#${x.id} | ${x.field} | ${x.winner.slice}: ${esc(trunc(x.winner.v, 110))} | ${x.loser.slice}: ${esc(trunc(x.loser.v, 110))} | ${x.why} |`), "");
  P("## QA flags", "", "Found by the merge on the final data (not errors; each is worth a look at the source).", "");
  list(`Without coordinates (${QA.noCoords.length})`, QA.noCoords);
  list(`Far from their area's center (${QA.farFromArea.length})`, QA.farFromArea);
  list(`Without a summary (${QA.noSummary.length})`, QA.noSummary);
  list(`Without an official url (${QA.noUrl.length})`, QA.noUrl);
  list(`Prices, hours or durations that read like estimates (${QA.guess.length})`, QA.guess);
  list(`Quotes over 40 words (${QA.longQuote.length})`, QA.longQuote);
  list(`Day names that do not match the date (${QA.weekday.length})`, QA.weekday);
  list(`Free but a price is listed (${QA.freeWithPrice.length})`, QA.freeWithPrice);
  list(`Our summaries with a placeholder word (${QA.placeholderSummary.length})`, QA.placeholderSummary);
  list(`Events at a place that is not open (${QA.closedVenue.length})`, QA.closedVenue);
  list(`Events with no area (${QA.noArea.length})`, QA.noArea);
  P(`Also: ${OUT.events.filter((e) => !e.start && !e.all_day).length} events have no start time (${OUT.events.filter((e) => !e.start && !e.all_day && !e.time_text).length} of them without \`time_text\` either; pages print "Time not listed"), ${OUT.events.filter((e) => e.end_date && (Date.parse(e.end_date) - Date.parse(e.date)) / 864e5 > 14).length} are long runs (> 14 days), ${OUT.events.filter((e) => e.status === "tentative").length} are tentative.`, "");
  list(`Names or aliases shared by several places (${QA.ambiguous.length})`, QA.ambiguous);
  list("Build warnings on this data (build/core/load.mjs, grouped)", [...warnGroups].map(([g, ws]) => `${g}: ${ws.length}${ws.length <= 6 ? ` (${ws.map((w) => w.w.replace(/^data\//, "")).join(", ")})` : ""}`));
  list("Research inputs read", LOG.input);
  return Ls.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

/* ================================================================ WRITE ================================================================ */
if (CHECK) { console.log(`check ok: ${summaryLine}`); if (LOG.dupOpen.length) console.log(`${LOG.dupOpen.length} fuzzy-duplicate candidate(s) not reviewed:\n  ${LOG.dupOpen.join("\n  ")}`); process.exit(0); }
mkdirSync(DATA_OUT, { recursive: true });
for (const f of FILES) writeFileSync(join(DATA_OUT, `${f}.json`), JSON.stringify(OUT[f], null, 2) + "\n");
writeFileSync(join(DATA_OUT, "aliases.json"), JSON.stringify(ALIASES, null, 2) + "\n");
writeFileSync(join(DATA_OUT, "README.md"), readme());
mkdirSync(WORK, { recursive: true });
writeFileSync(join(WORK, "conflicts.json"), JSON.stringify(CONFLICTS, null, 1) + "\n");
console.log(`wrote ${DATA_OUT.replace(REPO + "/", "")}/: ${summaryLine}`);
if (LOG.dupOpen.length) console.log(`${LOG.dupOpen.length} fuzzy-duplicate candidate(s) not reviewed (listed in data/README.md)`);
