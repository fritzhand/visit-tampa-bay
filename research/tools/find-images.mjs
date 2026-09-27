#!/usr/bin/env node
/* ============================================================
   research/tools/find-images.mjs · OWNER: media-commons (research/media-commons/) · zero dependencies, Node ≥ 22
   Rights-cleared Wikimedia Commons images for data/ records (regions, areas, places, stays), through Wikidata:

     node research/tools/find-images.mjs             # fetch what .cache/commons/ lacks, match, write the slice + log
     node research/tools/find-images.mjs --offline   # never touch the network: the cache only (a miss is logged)
     node research/tools/find-images.mjs --dry-run   # everything except writing research/media-commons/

   Method (research/SCHEMA.md "media", CLAUDE.md rule 8):
   1. Wikidata SPARQL (query.wikidata.org): every item with an image (P18) and coordinates (P625) inside the Tampa Bay
      box (padded), in tiles. A record matches an item only when NAME and LOCATION agree: one of the record's names
      (name, aliases; for areas and regions each part of "A & B") equals one of the item's English labels/aliases
      after normalization (or the same words in another order, or the record's words plus place qualifiers only), and
      the item's point is within the radius for the record's kind (radius()). Hand-reviewed exceptions: REJECT_MATCH,
      FORCE_MATCH, REJECT_FILE, CREATOR_FIX, ALT_FIX. Every rejection is logged (research/media-commons/log.json).
   2. Commons (commons.wikimedia.org/w/api.php, imageinfo + extmetadata, 50 files per request): license, creator,
      date, description, size. Accepted: public domain, CC0, CC BY (any version), CC BY-SA (any version), U.S.
      government works. Rejected: NC, ND, GFDL-only, other licenses, fair use, no license; attribution licenses
      without a named author (Commons' Artist, else the file page's author field); SVGs, maps, logos, flags, seals,
      satellite views; images under 640 px on the long side or 360 px on the short; files whose own title, description
      and categories do not name the place, or whose description puts them somewhere else.
   3. research/media-commons/media-commons.json (slice format; records.media per SCHEMA), one image per subject,
      never a subject that data/media.json already illustrates, never a file another region/area/place/stay already
      uses (a file that only illustrates a timeline entry may also illustrate the place it shows).

   Network etiquette (Wikimedia rate-limits hard): a descriptive User-Agent, at most one request per second per host,
   Retry-After honored, exponential backoff, and every response cached on disk under .cache/commons/ (sparql/, api/,
   file/, wikitext/) so a re-run costs nothing. Deterministic: same cache + same data/ → byte-identical output.
   ============================================================ */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

// Node's fetch only uses HTTPS_PROXY when NODE_USE_ENV_PROXY=1 is set at startup: re-run under it.
if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, ["--no-warnings", ...process.argv.slice(1)], { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
  process.exit(r.status ?? 1);
}

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARGS = new Set(process.argv.slice(2));
const OFFLINE = ARGS.has("--offline"), DRY = ARGS.has("--dry-run");
const SLICE = "media-commons", CHECKED = "2026-09-27";
const OUT_DIR = join(REPO, "research", SLICE);
const CACHE = join(REPO, ".cache", "commons");
const UA = "tampa-bay-chartbook/1.0 (https://github.com/fritzhand/visit-tampa-bay)";
const readJSON = (f) => JSON.parse(readFileSync(f, "utf8"));

/* ================================================================ JUDGMENT TABLES (hand-reviewed; printed in the report) ================================================================ */
/** Match radius in meters by record kind and name-match strength (3 exact, 2 same words, 1 record words + qualifiers). */
const LARGE_KINDS = new Set(["park", "state-park", "beach", "nature-preserve", "island", "trail", "garden", "theme-park", "water-park", "zoo", "district", "historic-district", "waterfront"]);
const EAT_KINDS = new Set(["restaurant", "cafe-bakery", "bar", "brewery", "distillery-winery", "food-hall", "nightlife"]);
function radius(subject, level) {
  if (subject.kind === "region") return level >= 2 ? 15000 : 0;
  if (subject.kind === "area") return level >= 2 ? 8000 : 3000;
  if (subject.strict) return level >= 2 ? 750 : 0;          // restaurants, bars, ordinary hotels: the exact building only
  // state parks and refuges cover thousands of acres and have one-of-a-kind names: the item's point can be far from the entrance
  if ((subject.rec.kind === "state-park" || subject.rec.kind === "nature-preserve") && level === 3) return 12000;
  if (LARGE_KINDS.has(subject.rec.kind)) return level >= 2 ? 4000 : 1500;
  return level >= 2 ? 1500 : 600;
}
/** A region is several towns; its image is its principal city's item. Region → the area whose point anchors the search. */
const REGION_ANCHOR = { tampa: "downtown-tampa", stpete: "downtown-stpete", clearwater: "downtown-clearwater", beaches: "st-pete-beach" };
/** Words that may follow a record's name in an item's label without changing what it names ("Tampa Theatre, Florida"). */
const QUALIFIERS = new Set(["florida", "fl", "usa", "us", "tampa", "st", "petersburg", "pete", "clearwater", "sarasota", "bradenton", "dunedin", "lakeland", "gulfport", "largo", "hillsborough", "pinellas", "county"]);
const STOP = new Set(["the", "a", "an", "of", "at", "and", "in", "on", "by"]);
/** Matches rejected on review (2026-09-27, every accepted match read by hand): "kind:id" → { QID: why }. */
const REJECT_MATCH = {
  "region:clearwater": { Q244146: "the city's image shows Clearwater Beach, which is on sheet 3 (Gulf Beaches), not on the Clearwater & North Pinellas sheet" },
  "place:legoland-florida": { Q2397019: "the item is the Cypress Gardens theme park that closed in 2009 (the record's alias because its gardens survive inside the resort); its 2007 photo does not show LEGOLAND Florida" },
  "place:homosassa-springs-wildlife-state-park": { Q1626252: "the item is the census-designated place Homosassa Springs, not the state park; its image is a highway sign" },
  "place:sunset-beach-treasure-island": { Q16900918: "the item's image is the street sign at the entrance to the Sunset Beach neighborhood, not the beach" },
  "stay:belleview-inn": { Q4883834: "the item is the whole Belleview-Biltmore Hotel, mostly demolished after 2015; its 2007 photo is not the Belleview Inn (the preserved and moved 1897 core) a guest books today" },
};
/** Matches accepted on review although the names differ in wording: "kind:id" → [QID, why]. Name and place still agree. */
const FORCE_MATCH = {
  "area:pass-a-grille": ["Q7142362", "the Pass-a-Grille Historic District is the Pass-a-Grille neighborhood (item 113 m from the area's point)"],
  "area:tampa-heights": ["Q7681714", "the Tampa Heights Historic District lies in Tampa Heights (item 49 m from the area's point)"],
  "place:l-b-brown-house-museum": ["Q6503883", "the item Lawrence Brown House is the L.B. Brown House (built by Lawrence B. Brown, per the record), 37 m away"],
  "place:yulee-sugar-mill-ruins-historic-state-park": ["Q3485439", "the item names the same ruins as Yulee Sugar Mill Ruins State Historic Site, 104 m away"],
  "place:brooksville-train-depot-museum": ["Q16847334", "the item Brooksville Railroad Depot Museum is the 1885 depot museum, 54 m away"],
  "place:nokomis-beach-park": ["Q16976013", "the Nokomis Beach Pavilion stands in Nokomis Beach Park (the record's alias is Nokomis Beach), 67 m away; the image shows the pavilion"],
  "place:tampa-police-museum": ["Q105487878", "One Police Center (411 N Franklin St) is the Tampa Police Department headquarters whose ground floor holds the museum, per the record; 2 m away"],
};
/** Files rejected on review (wrong subject, not a photo, …): "File:…" → why. */
const REJECT_FILE = {
  "File:Weeki Wachee Springs in the 1950s.jpg": "a scan of a 1950s family slide the uploader says their father took; the author and date on Commons are uncertain",
  "File:CZ Lake.JPG": "its description places it near the Ca' d'Zan (the Ringling), not at Sarasota Jungle Gardens",
  "File:Fort De Soto Park (8416015934).jpg": "its own title and description say Fort De Soto Park, not Shell Key Preserve",
  "File:PoorPeoplesArtPlacardsUSFCAM.jpg": "shows one exhibition's placards, not the museum",
};
/** Creators corrected on review from the file page: "File:…" → [creator, why]. */
const CREATOR_FIX = {
  "File:Largo Library 2005.jpg": ["Jay R. Ashworth (Baylink at English Wikipedia)", "the author field names the uploader Baylink and adds \"Copyright 2005 Jay R. Ashworth\""],
};
/** Files whose own words name the place only by a former name or a landmark in it (reviewed): "File:…" → why. */
const NAME_OK = {
  "File:South Florida Museum Main Entrance 2014.JPG": "the Bishop Museum of Science and Nature was the South Florida Museum until 2019 (its Wikidata item's own image)",
  "File:St. Pete Arts Center01.jpg": "the Morean Arts Center was The Arts Center when this was taken in 2008 (its Wikidata item's own image; description: \"St. Petersburg, Florida : The Arts Center\")",
  "File:Don cesar from air.JPG": "the Don CeSar stands in St. Pete Beach; the city's own Wikidata image",
};
/** Alt text written on review from the file's own title and categories (its description is a camera string): "File:…" → alt. */
const ALT_FIX = {
  "File:New Standard D-25 1931 9 Waldo Wright Fantasy of Flight Splash ramp SNFSI FOF 15April2010 (14630315535).jpg": "A 1931 New Standard D-25 (NC9125) on the splash ramp at Fantasy of Flight, April 2010.",
};

/* ================================================================ HTTP (throttled, cached) ================================================================ */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha1 = (s) => createHash("sha1").update(s).digest("hex");
const nextSlot = new Map();                 // host → earliest time of the next request (ms)
const NET = { requests: 0, cached: 0, retries: 0, r429: 0, failed: 0, misses: 0 };
async function getJSON(url, kind, accept = "application/json") {
  const file = join(CACHE, kind, `${sha1(url)}.json`);
  if (existsSync(file)) { NET.cached++; return readJSON(file).body; }
  if (OFFLINE) { NET.misses++; return null; }
  const host = new URL(url).host;
  let backoff = 2000;
  for (let attempt = 1; attempt <= 9; attempt++) {
    const wait = (nextSlot.get(host) || 0) - Date.now();
    if (wait > 0) await sleep(wait);
    nextSlot.set(host, Date.now() + 1100);  // ≤ 1 request per second per host
    NET.requests++;
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept, "Api-User-Agent": UA }, signal: AbortSignal.timeout(120000) });
    } catch (e) {
      NET.retries++;
      console.warn(`  … ${host}: ${e.cause?.code || e.name} (attempt ${attempt}); retrying in ${backoff / 1000}s`);
      nextSlot.set(host, Date.now() + backoff); backoff = Math.min(backoff * 2, 180000); continue;
    }
    if (res.status === 429 || res.status >= 500) {
      if (res.status === 429) NET.r429++;
      NET.retries++;
      const ra = Number(res.headers.get("retry-after"));
      const pause = Math.max(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 0, backoff);
      console.warn(`  … ${host}: HTTP ${res.status} (attempt ${attempt}); Retry-After ${res.headers.get("retry-after") ?? "-"}; waiting ${Math.round(pause / 1000)}s`);
      await res.arrayBuffer().catch(() => {});
      nextSlot.set(host, Date.now() + pause); backoff = Math.min(backoff * 2, 180000); continue;
    }
    if (!res.ok) { NET.failed++; console.warn(`  ✗ ${host}: HTTP ${res.status} for ${url.slice(0, 160)}`); return null; }
    const body = await res.json();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ url, fetched: new Date().toISOString(), body }));
    return body;
  }
  NET.failed++;
  console.warn(`  ✗ ${host}: gave up after 9 attempts: ${url.slice(0, 160)}`);
  return null;
}

/* ================================================================ TEXT ================================================================ */
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", eacute: "é", aacute: "á", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", ouml: "ö", uuml: "ü", auml: "ä", ccedil: "ç", egrave: "è", agrave: "à", deg: "°", copy: "©", middot: "·", times: "×" };
function decode(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? " ");
}
/** HTML → one line of plain text (tags dropped, entities decoded, whitespace collapsed; no "<tag" or "&x;" left). */
function plain(html) {
  if (html == null) return null;
  let s = String(html).replace(/<br\s*\/?>/gi, " ").replace(/<\/(p|div|li|tr)>/gi, " ").replace(/<[^>]*>/g, " ");
  s = decode(decode(s)).replace(/<\/?[a-zA-Z][^>]*>/g, " ").replace(/[<>]/g, " ").replace(/&(?=[a-zA-Z#])/g, "and ");
  s = s.replace(/[​-‏‪-‮]/g, "").replace(/\s+/g, " ").trim();
  return s || null;
}
const deaccent = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
function norm(s) {
  let t = deaccent(String(s)).toLowerCase().replace(/\([^)]*\)/g, " ").replace(/&/g, " and ").replace(/['’`´]/g, "");
  t = t.replace(/[^a-z0-9]+/g, " ").trim();
  t = t.replace(/\bsaint\b/g, "st").replace(/\bmount\b/g, "mt").replace(/\bcentre\b/g, "center").replace(/\btheatre\b/g, "theater").replace(/\bharbour\b/g, "harbor");
  t = t.replace(/^the /, "").replace(/ (florida|fl|usa|united states)$/g, "").trim();
  return t;
}
const toks = (s) => norm(s).split(" ").filter((w) => w && !STOP.has(w));
/** 3 = same name, 2 = same words, 1 = the record's words plus qualifiers (or the item's words plus qualifiers), 0 = no. */
function nameLevel(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 3;
  const A = toks(a), B = toks(b), sa = new Set(A), sb = new Set(B);
  if (sa.size && sa.size === sb.size && [...sa].every((w) => sb.has(w))) return 2;
  const contained = (small, big) => small.size >= 2 && [...small].every((w) => big.has(w)) && [...big].filter((w) => !small.has(w)).every((w) => QUALIFIERS.has(w));
  if (contained(sa, sb) || contained(sb, sa)) return 1;
  return 0;
}
const overlap = (a, b) => { const A = new Set(toks(a)), B = new Set(toks(b)); const i = [...A].filter((w) => B.has(w)).length; return i / Math.max(1, Math.min(A.size, B.size)); };
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371008.8, r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
/** First sentence (abbreviation-aware), at most `max` characters (cut at a word, "…"). */
const ABBR = /\b(?:St|Ft|Mt|Dr|Mr|Mrs|Ms|Jr|Sr|Ave|Blvd|Rd|No|Co|Inc|Fla|Bros|Capt|Gen|Col|Lt|Sgt|Rev|Prof|ca|c|approx|vs|U\.S|[A-Z])\.$/;
function firstSentence(s, max = 220) {
  const parts = s.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/);
  let out = "";
  for (const p of parts) { out = out ? `${out} ${p}` : p; if (!ABBR.test(out)) break; }
  if (out.length > max) { const cut = out.slice(0, max); out = `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).replace(/[\s,;:–—-]+$/, "")}…`; }
  return out.trim();
}

/* ================================================================ DATA: the subjects ================================================================ */
const D = (f) => readJSON(join(REPO, "data", f));
const regions = D("regions.json"), areas = D("areas.json"), places = D("places.json"), stays = D("stays.json"), media = D("media.json");
const prior = existsSync(join(OUT_DIR, `${SLICE}.json`)) ? new Set((readJSON(join(OUT_DIR, `${SLICE}.json`)).records?.media || []).map((m) => m.id)) : new Set();
const OTHER_MEDIA = media.filter((m) => !prior.has(m.id) && !m.id.startsWith("m-"));
const HAS_IMAGE = new Map(OTHER_MEDIA.map((m) => [`${m.subject_kind}:${m.subject}`, m.id]));
const fileKey = (nameOrUrl) => { const n = decodeURIComponent(String(nameOrUrl).split("/").pop()).replace(/^File:/, "").replace(/ /g, "_"); return n.charAt(0).toUpperCase() + n.slice(1); };
/** Files already illustrating a region, area, place or stay are never used again; a file that only illustrates a
 *  timeline entry (history.html) may also illustrate the place it shows, since the subject differs. */
const FILE_USED = new Map(), FILE_TIMELINE = new Map();   // file key → "media#id (kind:subject)"
for (const m of OTHER_MEDIA) {
  const u = m.page_url?.includes("/wiki/File:") ? m.page_url.split("/wiki/File:")[1] : m.file_url.includes("/thumb/") ? m.file_url.split("/").slice(-2)[0] : m.file_url;
  (m.subject_kind === "timeline" ? FILE_TIMELINE : FILE_USED).set(fileKey(u), `media#${m.id} (${m.subject_kind}:${m.subject})`);
}
const AREA_BY = new Map(areas.map((a) => [a.id, a]));
const ATTRACTION_KINDS = new Set(["museum", "attraction", "theme-park", "water-park", "zoo", "aquarium", "landmark", "pier", "district", "historic-district", "historic-site", "science-center"]);
const OUTDOOR_KINDS = new Set(["beach", "park", "state-park", "garden", "nature-preserve", "trail", "island", "waterfront"]);
const VENUE_KINDS = new Set(["arena-stadium", "performing-arts", "music-venue", "sports"]);
const TIER_LABEL = { 1: "regions", 2: "areas", 3: "signature places", 4: "heritage places", 5: "museums, attractions, landmarks, districts", 6: "beaches, parks, gardens, preserves", 7: "arenas and theaters", 8: "historic stays", 9: "other places", 10: "restaurants, bars, breweries (exact building only)", 11: "other stays (exact building only)" };
const nameParts = (name) => String(name).split(/\s*(?:&|,|\band\b)\s*/i).map((s) => s.replace(/^the\s+/i, "").trim()).filter(Boolean);
const SUBJECTS = [];
for (const r of regions) {
  const anchor = AREA_BY.get(REGION_ANCHOR[r.id]);
  SUBJECTS.push({ kind: "region", id: r.id, rec: r, name: r.name, names: nameParts(r.name), tier: 1, lat: anchor?.lat ?? null, lng: anchor?.lng ?? null });
}
for (const a of areas) SUBJECTS.push({ kind: "area", id: a.id, rec: a, name: a.name, names: [...new Set([a.name, ...nameParts(a.name)])], tier: 2, lat: a.lat, lng: a.lng });
for (const p of places) {
  const tier = p.signature ? 3 : p.heritage ? 4 : ATTRACTION_KINDS.has(p.kind) ? 5 : OUTDOOR_KINDS.has(p.kind) ? 6 : VENUE_KINDS.has(p.kind) ? 7 : EAT_KINDS.has(p.kind) ? 10 : 9;
  SUBJECTS.push({ kind: "place", id: p.id, rec: p, name: p.name, names: [p.name, ...(p.aliases || [])], tier, strict: tier === 10, lat: p.lat ?? null, lng: p.lng ?? null });
}
for (const s of stays) {
  const tier = s.heritage ? 8 : 11;
  SUBJECTS.push({ kind: "stay", id: s.id, rec: s, name: s.name, names: [s.name, ...(s.aliases || [])], tier, strict: tier === 11, lat: s.lat ?? null, lng: s.lng ?? null });
}
SUBJECTS.sort((a, b) => a.tier - b.tier || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));

/* ================================================================ 1. WIKIDATA: items with P18 + P625 in the box ================================================================ */
const BOX = { s: 26.85, n: 29.05, w: -83.05, e: -81.35 }, STEP = 0.5;
const tileQuery = (s, w, n, e) => `SELECT ?item (GROUP_CONCAT(DISTINCT STR(?coord); separator="|") AS ?coords) (GROUP_CONCAT(DISTINCT STR(?img); separator="|") AS ?imgs)
  (GROUP_CONCAT(DISTINCT ?lbl; separator="|") AS ?lbls) (GROUP_CONCAT(DISTINCT ?alt; separator="|") AS ?alts)
  (SAMPLE(?d) AS ?desc) (GROUP_CONCAT(DISTINCT STRAFTER(STR(?t), "entity/"); separator=" ") AS ?types)
WHERE {
  SERVICE wikibase:box { ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerSouthWest "Point(${w} ${s})"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(${e} ${n})"^^geo:wktLiteral . }
  ?item wdt:P18 ?img .
  OPTIONAL { ?item rdfs:label ?lbl . FILTER(LANG(?lbl) = "en" || LANG(?lbl) = "mul") }
  OPTIONAL { ?item skos:altLabel ?alt . FILTER(LANG(?alt) = "en" || LANG(?alt) = "mul") }
  OPTIONAL { ?item schema:description ?d . FILTER(LANG(?d) = "en") }
  OPTIONAL { ?item wdt:P31 ?t }
} GROUP BY ?item`;
const ITEMS = new Map();                   // QID → { qid, labels, aliases, names, desc, types, coords: [[lat,lng]], images: [title] }
let tiles = 0, tileMiss = 0;
const r3 = (x) => Math.round(x * 1000) / 1000;
for (let s = BOX.s; s < BOX.n - 1e-9; s += STEP) for (let w = BOX.w; w < BOX.e - 1e-9; w += STEP) {
  const n = Math.min(r3(s + STEP), BOX.n), e = Math.min(r3(w + STEP), BOX.e);
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(tileQuery(r3(s), r3(w), n, e))}`;
  const j = await getJSON(url, "sparql", "application/sparql-results+json");
  tiles++;
  if (!j) { tileMiss++; continue; }
  for (const b of j.results.bindings) {
    const qid = b.item.value.split("/").pop();
    const coords = (b.coords?.value || "").split("|").map((p) => p.match(/Point\(([-\d.eE]+) ([-\d.eE]+)\)/)).filter(Boolean).map((m) => [Number(m[2]), Number(m[1])]);
    const images = (b.imgs?.value || "").split("|").filter(Boolean).map((u) => `File:${decodeURIComponent(u.split("/Special:FilePath/")[1] || "")}`).filter((t) => t !== "File:");
    const labels = (b.lbls?.value || "").split("|").filter(Boolean), aliases = (b.alts?.value || "").split("|").filter(Boolean);
    const it = ITEMS.get(qid) || { qid, labels: [], aliases: [], desc: b.desc?.value || null, types: [], coords: [], images: [] };
    for (const [k, v] of [["labels", labels], ["aliases", aliases], ["types", (b.types?.value || "").split(" ").filter(Boolean)], ["images", images]]) for (const x of v) if (!it[k].includes(x)) it[k].push(x);
    for (const c of coords) if (!it.coords.some((d) => d[0] === c[0] && d[1] === c[1])) it.coords.push(c);
    ITEMS.set(qid, it);
  }
}
for (const it of ITEMS.values()) { it.images.sort(); it.label = it.labels[0] || it.aliases[0] || it.qid; it.names = [...it.labels, ...it.aliases]; }
console.log(`Wikidata: ${ITEMS.size} items with an image and coordinates (${tiles} tiles${tileMiss ? `, ${tileMiss} not fetched` : ""})`);
const ITEM_LIST = [...ITEMS.values()].sort((a, b) => a.qid.localeCompare(b.qid, "en", { numeric: true }));

/* ================================================================ MATCH records → items ================================================================ */
const LOG = [];                             // per subject
const REJECTS = [];                         // { subject, reason, detail }
const reject = (sub, reason, detail) => REJECTS.push({ subject: `${sub.kind}:${sub.id}`, tier: sub.tier, reason, detail });
const MATCH = new Map();                    // subject key → { item, level, d, via }
for (const sub of SUBJECTS) {
  const key = `${sub.kind}:${sub.id}`;
  const entry = { subject: key, name: sub.name, tier: sub.tier, result: "none", reasons: [] };
  LOG.push(entry);
  sub.log = entry;
  if (HAS_IMAGE.has(key)) { entry.result = "has-image"; entry.reasons.push(`already illustrated by media#${HAS_IMAGE.get(key)}`); continue; }
  if (sub.kind === "region" && !REGION_ANCHOR[sub.id]) { entry.reasons.push("a region of several towns with no one principal place to match"); reject(sub, "region: no single place", sub.name); continue; }
  if (sub.lat == null) { entry.reasons.push("no coordinates in data/"); reject(sub, "record has no coordinates", sub.name); continue; }
  const cands = [];
  for (const it of ITEM_LIST) {
    let d = Infinity; for (const [la, lo] of it.coords) d = Math.min(d, haversine(sub.lat, sub.lng, la, lo));
    if (d > 20000) continue;
    let level = 0, via = null;
    for (const a of sub.names) for (const b of it.names) { const l = nameLevel(a, b); if (l > level) { level = l; via = `"${a}" ~ "${b}"`; } }
    cands.push({ it, d, level, via });
  }
  const forced = FORCE_MATCH[key];
  const rejected = REJECT_MATCH[key] || {};
  let best = null;
  if (forced) {
    const c = cands.find((c) => c.it.qid === forced[0]);
    if (c) best = { ...c, level: Math.max(c.level, 1), via: `FORCE_MATCH: ${forced[1]}`, forced: true };
    else entry.reasons.push(`FORCE_MATCH ${forced[0]}: not among the items with an image within 20 km`);
  }
  if (!best) {
    const ok = cands.filter((c) => c.level > 0 && c.d <= radius(sub, c.level) && !rejected[c.it.qid])
      .sort((a, b) => b.level - a.level || a.d - b.d || a.it.qid.localeCompare(b.it.qid));
    best = ok[0] || null;
    for (const c of cands.filter((c) => rejected[c.it.qid] && c.level > 0)) { entry.reasons.push(`REJECT_MATCH ${c.it.qid} (${c.it.label}): ${rejected[c.it.qid]}`); reject(sub, "rejected on review", `${c.it.qid} ${c.it.label}: ${rejected[c.it.qid]}`); }
  }
  if (best) {
    MATCH.set(key, best);
    entry.item = best.it.qid; entry.item_label = best.it.label; entry.match = { level: best.level, m: Math.round(best.d), via: best.via };
    continue;
  }
  // why not: a same-name item too far away; a nearby item whose name only overlaps; nothing at all
  const far = cands.filter((c) => c.level > 0 && !rejected[c.it.qid]).sort((a, b) => b.level - a.level || a.d - b.d)[0];
  if (far) {
    const why = sub.strict && far.level < 2 ? "name only partly the same (exact building required)" : "same name but too far";
    entry.reasons.push(`${why}: ${far.it.qid} "${far.it.label}" at ${Math.round(far.d)} m (${far.via}; radius ${radius(sub, far.level)} m)`);
    reject(sub, sub.strict && far.level < 2 ? "name differs" : "same name, too far", `${far.it.qid} "${far.it.label}" ${Math.round(far.d)} m`);
    continue;
  }
  const near = cands.filter((c) => c.d <= Math.max(radius(sub, 3), 600) && sub.names.some((a) => c.it.names.some((b) => overlap(a, b) >= 0.5)))
    .sort((a, b) => a.d - b.d).slice(0, 3);
  if (near.length) {
    entry.reasons.push(`nearby item(s) with a different name: ${near.map((c) => `${c.it.qid} "${c.it.label}" ${Math.round(c.d)} m`).join("; ")}`);
    reject(sub, "name differs", near.map((c) => `${c.it.qid} "${c.it.label}" ${Math.round(c.d)} m`).join("; "));
    continue;
  }
  entry.reasons.push("no Wikidata item with an image matches the name nearby");
  reject(sub, "no Wikidata item with an image", "");
}
console.log(`Matched ${MATCH.size} record(s) to a Wikidata item`);

/* ================================================================ 2. COMMONS: license and metadata ================================================================ */
const EXT = "ObjectName|ImageDescription|DateTimeOriginal|Artist|Credit|LicenseShortName|License|LicenseUrl|UsageTerms|AttributionRequired|Copyrighted|NonFree|Restrictions|Categories";
const fileCache = (title) => join(CACHE, "file", `${sha1(title)}.json`);
const META = new Map();                     // title → page object (or { missing: true })
{
  const want = new Set();
  for (const m of MATCH.values()) for (const t of m.it.images) want.add(t);
  const todo = [];
  for (const t of [...want].sort()) {
    const f = fileCache(t);
    if (existsSync(f)) META.set(t, readJSON(f)); else todo.push(t);
  }
  console.log(`Commons: ${want.size} file(s); ${want.size - todo.length} cached, ${todo.length} to fetch`);
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const qs = `action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Cextmetadata&iiextmetadatalanguage=en&iiextmetadatafilter=${encodeURIComponent(EXT)}&iiurlwidth=2560&titles=${encodeURIComponent(batch.join("|"))}`;
    const j = await getJSON(`https://commons.wikimedia.org/w/api.php?${qs}`, "api");
    if (!j?.query) { console.warn(`  ✗ batch ${i / 50 + 1}: no answer`); continue; }
    const back = new Map();
    for (const n of j.query.normalized || []) back.set(n.to, n.from);
    for (const p of j.query.pages || []) {
      const asked = back.get(p.title) || p.title;
      const v = p.missing || !p.imageinfo?.length ? { title: p.title, missing: true } : { title: p.title, ...p.imageinfo[0] };
      META.set(asked, v);
      mkdirSync(dirname(fileCache(asked)), { recursive: true });
      writeFileSync(fileCache(asked), JSON.stringify(v));
    }
    process.stdout.write(`  batch ${i / 50 + 1}/${Math.ceil(todo.length / 50)} ✓\n`);
  }
}
const US_GOV = /(^|\|)PD[ -](US[ -]?Gov|US Government|USGov|US (federal|Army|Navy|Air Force|Coast Guard|Marine|Military|military|National Park|NPS|Fish|FWS|NOAA|Geological|Department|Congress|Census|EPA|FEMA|DOT|NASA|Forest)|NASA|NOAA|USGS|USDA|USFWS|FWS|NPS|FEMA|EPA)/i;
const NOT_PHOTO = /\b(map|maps|locator|location map|seal|flag|logo|coat of arms|emblem|diagram|wordmark|signature|satellite)\b/i;
/** A file whose own words put it somewhere else (another state, or a Florida city outside the guide). */
const ELSEWHERE = /,\s*(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Hawaii|Idaho|Illinois|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Wisconsin|Wyoming)\b|\b(Cape Canaveral|Cocoa Beach|Orlando|Miami|Jacksonville|Tallahassee|Key West|Gainesville|Daytona|Fort Lauderdale|Fort Myers|Pensacola|Kissimmee|Titusville|St\. Augustine|Ocala|Palm Beach)\b/;
/** Words too common to show that a file is about a given place. */
const GENERIC = new Set(["florida", "fl", "usa", "us", "st", "saint", "park", "state", "beach", "museum", "center", "historic", "district", "county", "city", "north", "south", "east", "west", "downtown", "new", "old", "art", "arts", "house", "hall", "island", "lake", "river", "bay", "street", "avenue", "preserve", "gardens", "garden", "theater", "hotel", "inn", "field", "stadium", "trail"]);
/** Commons extmetadata → { ok, license, label, url } or { ok: false, reason }. */
function licenseOf(em) {
  const v = (k) => plain(em?.[k]?.value) || "";
  const short = v("LicenseShortName"), lic = v("License").toLowerCase(), cats = em?.Categories?.value || "";
  if (/^true$/i.test(v("NonFree")) || /fair use|non-free/i.test(short)) return { ok: false, reason: "fair use / non-free" };
  if (!short && !lic) return { ok: false, reason: "no license" };
  if (/\bnc\b|-nc-|noncommercial|non-commercial/i.test(`${short} ${lic}`)) return { ok: false, reason: "non-commercial (NC)", short };
  if (/\bnd\b|-nd-|noderiv/i.test(`${short} ${lic}`)) return { ok: false, reason: "no derivatives (ND)", short };
  const url = v("LicenseUrl") ? v("LicenseUrl").replace(/^http:/, "https:").replace(/^\/\//, "https://") : null;
  if (lic === "cc0" || /^cc0\b/i.test(short) || /^cc-zero/i.test(lic)) return { ok: true, license: "cc0", label: "CC0", url };
  if (/^cc-by-sa-\d/.test(lic) || /^CC BY-SA \d/i.test(short)) return { ok: true, license: "cc-by-sa", label: short || lic.toUpperCase(), url };
  if (/^cc-by-\d/.test(lic) || /^CC BY \d/i.test(short)) return { ok: true, license: "cc-by", label: short || lic.toUpperCase(), url };
  if (lic === "pd" || /^public domain/i.test(short) || /^pd\b/i.test(short)) {
    if (US_GOV.test(cats)) return { ok: true, license: "us-gov", label: "public domain, U.S. government work", url: null };
    return { ok: true, license: "public-domain", label: "public domain", url: null };
  }
  if (/gfdl/i.test(`${short} ${lic}`)) return { ok: false, reason: "GFDL only", short };
  return { ok: false, reason: `other license (${short || lic})`, short };
}
const UNKNOWN_AUTHOR = /^(unknown|anonymous|unknown author|author unknown|unknown photographer|unidentified( photographer)?)\b\.?$/i;
/** Commons' Artist HTML → { name, how } (talk links dropped; Commons' own boilerplate unwrapped; `truncated` when it ends in "…"). */
function creatorOf(em) {
  const html = em?.Artist?.value;
  if (!html) return { name: null };
  const h = String(html).replace(/<a[^>]*User[_ ]talk:[^>]*>[\s\S]*?<\/a>/gi, " ").replace(/<sup>[\s\S]*?<\/sup>/gi, " ");
  let a = plain(h) || "", how = null, m;
  if ((m = a.match(/^No machine-readable author provided\.\s*(.+?)\s+assumed \(based on copyright claims\)\.?$/i))) { a = m[1]; how = "Commons gives no machine-readable author and assumes the uploader from the copyright claim"; }
  else if ((m = a.match(/^The original uploader was (.+?) at (English Wikipedia|[\w.]*wikipedia[\w.]*)\.*\s*(.*)$/i))) { a = `${m[1]} at ${m[2]}`; if (m[3]) how = `Commons' author field adds "${m[3]}"`; }
  else if ((m = a.match(/^Originally uploaded by (.+?)(?:\s*\(Transferred by [^)]*\))?\.?$/i))) a = m[1];
  a = a.replace(/\s*\(\s*(talk|talk · contribs|contribs)?\s*\)/gi, "").replace(/\s+(talk|talk page)$/i, "").replace(/\bUser:/g, "").replace(/\s+/g, " ").trim();
  if (!a || UNKNOWN_AUTHOR.test(a) || /^no machine-readable author/i.test(a)) return { name: null, unknown: UNKNOWN_AUTHOR.test(a) };
  if (/\s\([^)]*…$/.test(a)) { a = a.replace(/\s\([^)]*…$/, ""); how = "the source (Panoramio) cut the author's display name short; its incomplete parenthetical is left out"; }
  if (a.length > 120) a = `${a.slice(0, 120).replace(/\s+\S*$/, "")}…`;
  return { name: a, how, truncated: /…$/.test(a) };
}
/** The author field of a file page's wikitext ({{Information|author=…}}), wiki markup removed; the uploader for own work. */
function authorFromWikitext(wt, uploader) {
  const m = wt.match(/\|\s*[Aa]uthor\s*=\s*([^\n]*)/);
  let a = (m ? m[1] : "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1").replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, "$1").replace(/\[https?:\/\/\S+\]/g, "")
    .replace(/\{\{\s*(?:u|user|user at project)\s*\|\s*([^|}]+)[^}]*\}\}/gi, "$1").replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/<[^>]+>/g, "").replace(/'{2,}/g, "").replace(/^\s*(?:User:)/i, "").replace(/\s+/g, " ").trim();
  a = decode(a).trim();
  if (a && !/^own work\.?$/i.test(a) && !UNKNOWN_AUTHOR.test(a)) return { name: a, how: "author read from the file page's wikitext (Commons has no machine-readable author)" };
  const by = wt.match(/taken by\s+\[\[(?::?[a-z]{2,3}:)?(?:User:)?([^\]|]+)(?:\|([^\]]+))?\]\]/i);
  if (by) return { name: (by[2] || by[1]).trim(), how: `the file page says "taken by ${(by[2] || by[1]).trim()}" (Commons has no machine-readable author)` };
  const own = /\{\{\s*(self|own)\b/i.test(wt) || /own work/i.test(m?.[1] || "") || /\b(taken by me|by me on|I took)\b/i.test(wt);
  if (own && uploader) return { name: uploader, how: `the file page says it is the uploader's own photo ("taken by me"/own work), so the author is the uploader, ${uploader} (Commons has no machine-readable author)` };
  return { name: null };
}
const JUNK_DESC = /\b(own work|i took|taken by me|my photo|my picture|my dad|my father|my mother|uploaded|img_?\d+|dsc_?\d+|dscn\d+|sony dsc|olympus digital camera|p\d{7})\b|^(dsc|img|photo|picture|image)\b/i;
const letterWords = (s) => (s.match(/[A-Za-z]{3,}/g) || []).length;
const titleWords = (s) => s.split(/\s+/).filter((w) => /^[A-Za-z'’.-]{3,}$/.test(w)).length;
function cleanText(s) {
  return s.replace(/https?:\/\/\S+/g, " ").replace(/^(English|en)\s*:\s*/i, "").replace(/^Image title:\s*/i, "").replace(/\s*Image from Public domain images website.*$/i, "").replace(/\s*This is an image of a place or building that is listed on the National Register of Historic Places.*$/i, "")
    .replace(/(^|\s):?(?:w|en|wikipedia):(?=\S)/g, "$1").replace(/\S*_\S*/g, " ").replace(/\s*\(\d{6,}\)/g, "")
    .replace(/\s+([.,;:!?])/g, "$1").replace(/([,;])(?=[A-Za-z])/g, "$1 ").replace(/\s*[:;,]+\s*(?=[.!?]|$)/g, "").replace(/\s+/g, " ").trim();
}
const finish = (s) => { s = s.replace(/^(.{6,}?)\s+\1(?=[.!?]?$)/i, "$1").trim(); return /[.!?…]$/.test(s) ? s : `${s}.`; };
/** Tokens that show a text is about this subject (its names, its item's names; generic words dropped). */
function subjectTokens(sub, item) {
  const all = [...sub.names, ...item.names].flatMap(toks).filter((w) => w.length >= 3);
  const specific = all.filter((w) => !GENERIC.has(w));
  return new Set(specific.length ? specific : all.filter((w) => !["florida", "fl", "usa", "us"].includes(w)));
}
const mentions = (text, T) => toks(text).some((w) => T.has(w) || [...T].some((t) => t.length >= 5 && w.length >= 5 && (w.startsWith(t) || t.startsWith(w))));
/** alt: the file's own words (its description's first sentence, else its title, else the item's label), cleaned. */
function altOf(em, title, item, T) {
  if (ALT_FIX[title]) return { alt: ALT_FIX[title], from: "hand-written from the file's title and categories (ALT_FIX)" };
  const d0 = cleanText(plain(em?.ImageDescription?.value) || "");
  const d = d0 ? firstSentence(d0) : "";
  const t = cleanText(plain(em?.ObjectName?.value) || title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ")).replace(/[\s-]*\b\d{1,3}$/, "").replace(/([A-Za-z])\d{1,3}$/, "$1").replace(/^\d+\s+/, "").trim();
  const okD = d.length >= 8 && letterWords(d) >= 2 && !JUNK_DESC.test(d);
  const okT = t.length >= 4 && titleWords(t) >= 2 && !JUNK_DESC.test(t);
  if (okD && (mentions(d, T) || !okT || !mentions(t, T))) return { alt: finish(d), from: "the file's description" };
  if (okT) return { alt: finish(firstSentence(t)), from: "the file's title" };
  return { alt: finish(item.label), from: "the Wikidata label (the file has no usable description or title)" };
}
const yearOf = (em) => { const m = (plain(em?.DateTimeOriginal?.value) || "").match(/\b(1[6-9]\d\d|20[0-2]\d)\b/); return m ? m[1] : null; };

/* ================================================================ 3. SELECT one image per subject (priority order) ================================================================ */
/** The author of a file Commons gives no usable machine-readable author for (or cuts short): its page's wikitext. */
async function wikitextAuthor(title) {
  const qs = `action=query&format=json&formatversion=2&prop=revisions%7Cimageinfo&rvprop=content&rvslots=main&iiprop=user&iilimit=50&titles=${encodeURIComponent(title)}`;
  const j = await getJSON(`https://commons.wikimedia.org/w/api.php?${qs}`, "wikitext");
  const p = j?.query?.pages?.[0];
  const wt = p?.revisions?.[0]?.slots?.main?.content;
  if (!wt) return { name: null, how: "file page not read" };
  const ii = p.imageinfo || [];
  return authorFromWikitext(wt, ii.length ? ii[ii.length - 1].user : null);
}
const MIN_LONG = 640, MIN_SHORT = 360;
const OUT = [];
const LIC_COUNT = {};
for (const sub of SUBJECTS) {
  const key = `${sub.kind}:${sub.id}`, m = MATCH.get(key);
  if (!m) continue;
  const entry = sub.log;
  const T = subjectTokens(sub, m.it);
  let chosen = null;
  const why = [];
  const no = (t, msg, reason, detail = t) => { why.push(`${t}: ${msg}`); reject(sub, reason, detail); };
  for (const t of m.it.images) {
    const meta = META.get(t);
    const fk = fileKey(t);
    if (REJECT_FILE[t]) { no(t, `rejected on review (${REJECT_FILE[t]})`, "file rejected on review"); continue; }
    if (!meta) { no(t, "Commons metadata not fetched", "Commons metadata not fetched"); continue; }
    if (meta.missing) { no(t, "not on Commons", "file missing on Commons"); continue; }
    if (FILE_USED.has(fk)) { no(t, `already used by ${FILE_USED.get(fk)}`, "file already used by another record", `${t} → ${FILE_USED.get(fk)}`); continue; }
    if (/svg|pdf|djvu/.test(meta.mime || "") || NOT_PHOTO.test(t.replace(/_/g, " "))) { no(t, `not a photograph (${meta.mime})`, "not a photo (map, logo, drawing, satellite view)"); continue; }
    const em = meta.extmetadata || {};
    const lic = licenseOf(em);
    if (!lic.ok) { no(t, lic.reason, `license: ${lic.reason.replace(/ \(.*\)$/, "")}`, `${t} (${lic.short || lic.reason})`); continue; }
    const big = /tiff/.test(meta.mime || "") || (meta.size || 0) > 25e6;
    const w = big ? meta.thumbwidth : meta.width, h = big ? meta.thumbheight : meta.height;
    if (Math.max(w, h) < MIN_LONG || Math.min(w, h) < MIN_SHORT) { no(t, `too small (${w}×${h})`, `too small (< ${MIN_LONG} px)`, `${t} ${w}×${h}`); continue; }
    // the file's own words must name the place, and must not put it somewhere else
    const own = [t.replace(/^File:/, "").replace(/_/g, " "), plain(em.ObjectName?.value), plain(em.ImageDescription?.value), (em.Categories?.value || "").replace(/\|/g, ". ")].filter(Boolean).join(". ");
    const own2 = [t.replace(/^File:/, "").replace(/_/g, " "), plain(em.ImageDescription?.value)].filter(Boolean).join(". ");
    const far = own2.match(ELSEWHERE);
    if (far && !sub.names.some((n) => n.includes(far[1] || far[2]))) { no(t, `its own description puts it elsewhere (${far[1] || far[2]})`, "file describes a place elsewhere", `${t} (${far[1] || far[2]})`); continue; }
    if (!mentions(own, T) && !NAME_OK[t]) { no(t, "its title, description and categories do not name the place", "file does not name the place"); continue; }
    let cr = CREATOR_FIX[t] ? { name: CREATOR_FIX[t][0], how: `creator corrected on review: ${CREATOR_FIX[t][1]}` } : creatorOf(em);
    if (!CREATOR_FIX[t] && cr.truncated) {
      const wa = await wikitextAuthor(t);
      cr = wa.name && !/…$/.test(wa.name) ? wa : { ...cr, how: "the source (Panoramio) cut the author's display name short; the file page has no fuller name, so it is credited as Commons shows it" };
    } else if (!CREATOR_FIX[t] && !cr.name && !cr.unknown && /Files with no machine-readable author/i.test(em.Categories?.value || "")) {
      cr = await wikitextAuthor(t);
    }
    if (!cr.name && (lic.license === "cc-by" || lic.license === "cc-by-sa")) { no(t, `${lic.label} but no author named`, "attribution license, no author named"); continue; }
    chosen = { t, meta, em, lic, cr, big, w, h };
    break;
  }
  if (!chosen) { entry.result = "none"; entry.reasons.push(...why); continue; }
  const { t, meta, em, lic, cr, big, w, h } = chosen;
  const title = plain(em.ObjectName?.value) || t.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "");
  const creditName = cr.name || (UNKNOWN_AUTHOR.test(plain(em?.Artist?.value) || "") ? "Unknown author" : null);
  const alt = altOf(em, t, m.it, T);
  const tl = FILE_TIMELINE.get(fileKey(t));
  const rec = {
    id: `m-${sub.id}`,
    title: firstSentence(cleanText(title) || title, 160),
    creator: cr.name,
    year: yearOf(em),
    license: lic.license,
    license_url: lic.url,
    credit: `${creditName ? `${creditName} / ` : ""}Wikimedia Commons (${lic.label})`,
    file_url: big ? meta.thumburl : meta.url,
    page_url: (meta.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURI(t.replace(/ /g, "_"))}`).replace(/^http:/, "https:"),
    subject_kind: sub.kind,
    subject: sub.id,
    alt: alt.alt,
    width: w, height: h,
    notes: [
      m.forced
        ? `Wikidata ${m.it.qid} ("${m.it.label}") image (P18); the names differ in wording and the match was accepted on review (${FORCE_MATCH[key][1]}); item ${Math.round(m.d)} m from the record's point.`
        : `Wikidata ${m.it.qid} ("${m.it.label}") image (P18); name ${["", "matched with qualifiers", "same words", "exact"][m.level]} (${m.via}), item ${Math.round(m.d)} m from the record's point.`,
      `Commons license: ${plain(em.LicenseShortName?.value) || lic.label}${lic.license === "us-gov" ? " (U.S. government work per its Commons license category)" : ""}; read ${CHECKED}.`,
      cr.how ? `Creator: ${cr.how}.` : null,
      `Alt from ${alt.from}.`,
      plain(em.Credit?.value) ? `Commons source: ${firstSentence(plain(em.Credit.value), 140)}` : null,
      tl ? `The same file also illustrates ${tl} on the history timeline.` : null,
      big ? "file_url is a 2560 px rendition (the original is a large TIFF or over 25 MB)." : null,
    ].filter(Boolean).join(" "),
  };
  for (const k of ["creator", "year", "license_url"]) if (rec[k] == null) delete rec[k];
  OUT.push(rec);
  FILE_USED.set(fileKey(t), `media#${rec.id} (${sub.kind}:${sub.id})`);
  LIC_COUNT[lic.license] = (LIC_COUNT[lic.license] || 0) + 1;
  entry.result = "image"; entry.media = rec.id; entry.file = t; entry.license = lic.license;
  if (why.length) entry.reasons.push(...why);
}

/* ================================================================ REPORT + WRITE ================================================================ */
const byKind = (f) => { const o = {}; for (const s of SUBJECTS) { const k = f(s); if (k) o[k] = (o[k] || 0) + 1; } return o; };
const has = new Set(OUT.map((m) => `${m.subject_kind}:${m.subject}`));
const KINDS = ["region", "area", "place", "stay"];
const total = byKind((s) => s.kind), before = byKind((s) => (HAS_IMAGE.has(`${s.kind}:${s.id}`) ? s.kind : null)), added = byKind((s) => (has.has(`${s.kind}:${s.id}`) ? s.kind : null));
const without = SUBJECTS.filter((s) => !has.has(`${s.kind}:${s.id}`) && !HAS_IMAGE.has(`${s.kind}:${s.id}`));
const reasonCount = {};
for (const s of without) {
  const rs = REJECTS.filter((r) => r.subject === `${s.kind}:${s.id}`).map((r) => r.reason);
  const top = rs.find((r) => !/file already used|no Wikidata/.test(r)) || rs[0] || "no Wikidata item with an image";
  reasonCount[top] = (reasonCount[top] || 0) + 1;
}
const allReasons = {};
for (const r of REJECTS) allReasons[r.reason] = (allReasons[r.reason] || 0) + 1;
const tierRows = Object.keys(TIER_LABEL).map(Number).map((t) => {
  const subs = SUBJECTS.filter((s) => s.tier === t);
  const pre = subs.filter((s) => HAS_IMAGE.has(`${s.kind}:${s.id}`)).length, add = subs.filter((s) => has.has(`${s.kind}:${s.id}`)).length;
  return `| ${t} | ${TIER_LABEL[t]} | ${subs.length} | ${pre} | ${add} | ${subs.length - pre - add} |`;
});
const placeKindsWithout = {};
for (const s of without.filter((s) => s.kind === "place")) placeKindsWithout[s.rec.kind] = (placeKindsWithout[s.rec.kind] || 0) + 1;
const sortObj = (o) => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const partial = OUT.filter((m) => / matched with qualifiers /.test(m.notes)).map((m) => `${m.subject_kind}:${m.subject}`);
const forcedOut = OUT.filter((m) => /accepted on review/.test(m.notes)).map((m) => `${m.subject_kind}:${m.subject}`);
const noneOf = (k) => without.filter((s) => s.kind === k).map((s) => s.id);
const report = [
  `# media-commons: rights-cleared Commons images for regions, areas, places and stays`,
  "",
  `Checked ${CHECKED}. Written by \`node research/tools/find-images.mjs\` (re-runnable; every Wikidata and Commons response is cached in \`.cache/commons/\`, so a re-run with \`--offline\` reproduces this file byte for byte). ${OUT.length} images added for ${OUT.length} records that had none in data/media.json.`,
  "",
  "## Method",
  "",
  `1. **Wikidata.** SPARQL (query.wikidata.org) for every item with an image (P18) and coordinates (P625) in the Tampa Bay box (${BOX.s}–${BOX.n} N, ${BOX.w}–${BOX.e}), in ${tiles} tiles of ${STEP}°: ${ITEMS.size} items. A record matches an item only when the **name and the location agree**: one of the record's names (name and aliases; for regions and areas each part of "A & B") is the item's English label or alias after normalization (case, accents, punctuation, "the", "Saint"/"St", "Theatre"/"Theater"), or the same words in another order, or the same words plus place qualifiers ("Florida", a city name); and the item's point lies within 1,500 m of the record's (600 m for a qualifier match; 4,000 m for parks, beaches, preserves, islands, trails, gardens, theme parks, zoos and districts; 12,000 m for a state park or refuge with exactly the same name; 8,000 m for areas; 15,000 m for a region's principal city). Restaurants, bars, breweries and ordinary (non-heritage) hotels need an exact or same-words match within 750 m: an image only when Wikidata has that exact building. Regions: Tampa, St. Petersburg and Clearwater & North Pinellas take their principal city's item; Gulf Beaches, Around the Bay and Day Trips are groups of towns with no one place to match. Every accepted match was then read by hand: ${Object.keys(REJECT_MATCH).length} were rejected (REJECT_MATCH) and ${Object.keys(FORCE_MATCH).length} near misses whose names differ only in wording were accepted (FORCE_MATCH), each with its reason.`,
  `2. **Commons.** For the matched item's P18 file, the Commons API (imageinfo, extmetadata: LicenseShortName, License, LicenseUrl, Artist, Credit, ImageDescription, DateTimeOriginal, Categories). Accepted: public domain, CC0, CC BY and CC BY-SA (any version), and U.S. government works (public domain with a "PD US …" license category). Rejected: NC, ND, GFDL-only, other licenses (Free Art License, "Attribution"), fair use, no license; CC BY/BY-SA files with no author named (when Commons has no machine-readable author, or cuts the name short, the author field of the file page's wikitext is read; for own work, the uploader); SVGs, maps, logos, flags, seals and satellite views; images under ${MIN_LONG} px on the long side or ${MIN_SHORT} px on the short; files whose own title, description and categories do not name the place, or whose description puts them in another state or a Florida city outside the guide (Wikidata's P18 is sometimes a photo of a namesake elsewhere). ${Object.keys(REJECT_FILE).length} more files were rejected on review (REJECT_FILE: a family slide of uncertain authorship, photos whose own description names a neighboring place, an exhibition close-up).`,
  `3. **One image per record**, in priority order (regions, areas, signature places, heritage places, museums and attractions, beaches and parks, arenas and theaters, historic stays, other places, then restaurants/bars and other stays). Never a record that data/media.json already illustrates (the history slices' ${OTHER_MEDIA.length} images), and never a file another region, area, place or stay already uses (a later record whose item's image is taken gets none); a file that only illustrates a timeline entry may also illustrate the place it shows.`,
  `4. Each media record: \`creator\` is Commons' Artist with the HTML stripped; \`credit\` is "Creator / Wikimedia Commons (license)"; \`year\` is the year in DateTimeOriginal (left out when there is none); \`alt\` is the file's own English description (first sentence) or, when that is missing or not a description, its title (or the Wikidata label): what the file says it shows, nothing added; \`file_url\` is the upload.wikimedia.org original (a 2,560 px rendition for TIFFs and files over 25 MB); \`notes\` name the Wikidata item, how the name matched, the distance and the Commons license as read.`,
  "",
  "## Counts",
  "",
  "| subject kind | records | had an image | added here | still none |",
  "|---|---:|---:|---:|---:|",
  ...KINDS.map((k) => `| ${k} | ${total[k] || 0} | ${before[k] || 0} | ${added[k] || 0} | ${(total[k] || 0) - (before[k] || 0) - (added[k] || 0)} |`),
  "",
  `Licenses of the images added: ${sortObj(LIC_COUNT).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}.`,
  "",
  "| tier | records | total | had an image | added | still none |",
  "|---:|---|---:|---:|---:|---:|",
  ...tierRows,
  "",
  "## Rejections",
  "",
  `Every rejection is in \`research/media-commons/log.json\` (per record: the item, the match, each file tried and why it was refused). Counts by reason (a record can be refused for several files): ${sortObj(allReasons).map(([k, n]) => `${k} ${n}`).join("; ")}.`,
  "",
  `Records still without an image, by the main reason: ${sortObj(reasonCount).map(([k, n]) => `${k} ${n}`).join("; ")}.`,
  "",
  `Regions still without an image: ${noneOf("region").join(", ") || "none"}. Areas still without an image: ${noneOf("area").join(", ") || "none"}.`,
  "",
  `Places still without an image, by kind: ${sortObj(placeKindsWithout).map(([k, n]) => `${k} ${n}`).join(", ")}. Stays still without an image: ${noneOf("stay").length} (${without.filter((s) => s.kind === "stay" && s.rec.heritage).length} of them historic).`,
  "",
  "## Review",
  "",
  `Matches made with qualifiers only (the item's name is the record's plus a place word, or the reverse): ${partial.length ? partial.join(", ") : "none"}. Near misses accepted on review (FORCE_MATCH) that have an image: ${forcedOut.length ? forcedOut.join(", ") : "none"}. Hand-reviewed exceptions: REJECT_MATCH ${Object.keys(REJECT_MATCH).length}, FORCE_MATCH ${Object.keys(FORCE_MATCH).length}, REJECT_FILE ${Object.keys(REJECT_FILE).length}, CREATOR_FIX ${Object.keys(CREATOR_FIX).length}, ALT_FIX ${Object.keys(ALT_FIX).length}, NAME_OK ${Object.keys(NAME_OK).length} (tables at the top of the script, each with its reason).`,
  "",
  "## Left out and open questions",
  "",
  "- Only P18 (the item's own chosen image) is used; items without P18 and Commons categories were not searched, so a record whose Wikidata item has no image, or that has no item, keeps its typographic plate.",
  "- Restaurants, bars and chain hotels get an image only when Wikidata has an item for that exact building with a photo; no photos from business websites.",
  "- The images pass downloads each file_url once into site/img/ and writes data/images.json; nothing is hotlinked.",
].join("\n");

const REVIEW = REJECT_MATCH, FORCED = FORCE_MATCH;
const slice = { slice: SLICE, checked: CHECKED, records: { media: OUT }, report };
const logDoc = {
  slice: SLICE, checked: CHECKED,
  tables: { REJECT_MATCH: REVIEW, FORCE_MATCH: FORCED, REJECT_FILE },
  network: { ...NET, items: ITEMS.size, tiles },
  subjects: LOG,
};
console.log(`Images: ${OUT.length} (${sortObj(LIC_COUNT).map(([k, n]) => `${k} ${n}`).join(", ")}); added by kind ${JSON.stringify(added)}`);
console.log(`Network: ${NET.requests} request(s), ${NET.cached} cached, ${NET.retries} retr(ies), ${NET.r429} × 429, ${NET.failed} failed, ${NET.misses} offline miss(es)`);
if (NET.failed || NET.misses || tileMiss) console.warn("⚠ some responses are missing: the result is incomplete; re-run (online) to fill the cache");
if (!DRY) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${SLICE}.json`), `${JSON.stringify(slice, null, 2)}\n`);
  writeFileSync(join(OUT_DIR, "log.json"), `${JSON.stringify(logDoc, null, 1)}\n`);
  console.log(`Wrote research/${SLICE}/${SLICE}.json and research/${SLICE}/log.json`);
}
