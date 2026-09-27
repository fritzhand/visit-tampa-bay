/* tests/map.test.mjs · OWNER: the Map lane (map.html, areas.html, areas/<id>.html, build/components/mini-map.mjs chartMap,
   site/js/features/map.js's markup contract). Build tests run on a throwaway copy (tests/helpers.mjs): the fixture
   without a basemap, the fixture with a synthetic bay and region chart, and (when data/ holds the merged research)
   the real data. They check the contracts: one row per located record with its layers, numbers and ids; the honest
   lines for what has no coordinates or no chart; the attribution; the area pages' sections, numbering and clock. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { copyRepo, build, read, write, json, cleanup, fx, REPO } from "./helpers.mjs";
import { oneLine, isHistoric, sectionOf, LAYERS, DEFAULT_LAYERS, THING_GROUPS, ATTRIBUTION } from "../build/pages/map.mjs";
import { PARAMS, paramValues, MAP_LAYERS } from "../build/nav.mjs";
import { AREA_IDS, REGION_IDS, AREAS, PLACE_GROUP } from "../build/core/vocab.mjs";

/* one build per scenario, shared by the tests below */
const builds = new Map();
function built(name, prep = () => {}, data) {
  if (!builds.has(name)) {
    const dir = copyRepo(data ? { data } : {});
    prep(dir);
    const r = build(dir);
    builds.set(name, { dir, r });
    process.on("exit", () => cleanup(dir));
  }
  const b = builds.get(name);
  assert.equal(b.r.status, 0, b.r.stderr);
  return b.dir;
}
const rowsOf = (html) => [...html.matchAll(/<li class="map-li" ([^>]*)>/g)].map((m) => Object.fromEntries([...m[1].matchAll(/data-([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])));
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const ll = (r) => r.lat != null && r.lng != null;

/* a synthetic chart pair: the bay (fixture's Tampa and St. Pete) and a region box, each with #bm and #bm-grid */
const lat0 = 27.85, k = Math.cos((lat0 * Math.PI) / 180), sx = 1000 / (0.6 * k);
const BAY = { bbox: { core: { s: 27.6, n: 28.1, w: -82.8, e: -82.2 }, home: { s: 27.7, n: 28.0, w: -82.7, e: -82.4 } }, projection: { lat0, k, sx, viewBox: [1000, Math.round(0.5 * sx)], mPerUnit: 111195 / sx } };
const rk = Math.cos((27.95 * Math.PI) / 180), rsx = 1000 / (1.6 * rk);
const REGION = { bbox: { core: { s: 26.9, n: 29, w: -83, e: -81.4 }, home: { s: 26.9, n: 29, w: -83, e: -81.4 } }, projection: { lat0: 27.95, k: rk, sx: rsx, viewBox: [1000, Math.round(2.1 * rsx)], mPerUnit: 111195 / rsx }, labels: [], file: "region.svg" };
const MAPJSON = { ...BAY, labels: [{ text: "Tampa Bay", lat: 27.8, lng: -82.55, kind: "water", minZoom: 1 }, { text: "Tampa", lat: 27.95, lng: -82.46, kind: "city", minZoom: 1 }], region: REGION, attribution: "Basemap: fixture attribution" };
const svg = (vb) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb.join(" ")}"><g id="bm"><rect width="10" height="10" style="fill:var(--map-land)"/></g><g id="bm-grid"></g></svg>`;
const withCharts = (dir) => {
  write(dir, "data/map.json", JSON.stringify(MAPJSON));
  write(dir, "site/map/basemap.svg", svg(BAY.projection.viewBox));
  write(dir, "site/map/region.svg", svg(REGION.projection.viewBox));
};

/* ---------------- units ---------------- */
test("oneLine: the first sentence, never cut at an abbreviation", () => {
  assert.equal(oneLine("A preserve in south St. Petersburg. It has trails."), "A preserve in south St. Petersburg.");
  assert.equal(oneLine("E.G. Simmons Park has a beach. More."), "E.G. Simmons Park has a beach.");
  assert.equal(oneLine("The U.S. Army built it in 1898. Then more."), "The U.S. Army built it in 1898.");
  assert.equal(oneLine("Open 9 a.m. to 5 p.m. daily. Closed Mondays."), "Open 9 a.m. to 5 p.m. daily.");
  assert.equal(oneLine(null), "");
  const long = oneLine(`${"word ".repeat(80)}end.`);
  assert.ok(long.length <= 170 && long.endsWith("…"), "long first sentences are cut at a word, with an ellipsis");
});

test("layers: the page's layers are exactly MAP_LAYERS; a place's section follows its heritage and kind", () => {
  assert.deepEqual([...LAYERS.map((l) => l.id)].sort(), [...MAP_LAYERS].sort());
  assert.ok(DEFAULT_LAYERS.every((l) => MAP_LAYERS.includes(l)));
  assert.ok(THING_GROUPS.every((g) => Object.values(PLACE_GROUP).includes(g)) && !THING_GROUPS.includes("outdoors") && !THING_GROUPS.includes("history"));
  assert.equal(sectionOf({ kind: "museum", groups: ["arts"], heritage: { built: "1891" } }), "heritage");
  assert.equal(sectionOf({ kind: "beach", groups: ["outdoors"] }), "outdoors");
  assert.equal(sectionOf({ kind: "restaurant", groups: ["eat"] }), "places");
  assert.ok(isHistoric({ kind: "landmark", groups: ["history"] }));
});

test("nav: map.html takes layers r focus k t when chart, and checks their values", () => {
  for (const key of ["layers", "r", "focus", "k", "t", "when", "chart"]) assert.ok(PARAMS.map.includes(key), key);
  const db = { months: [], days: [], series: [], events: [], experiences: [], places: [], faqs: [], byId: { place: new Map([["x", {}]]) } };
  const v = paramValues(db).map;
  assert.ok(v.chart("region") && v.chart("bay") && !v.chart("moon"));
  assert.ok(v.when("today") && v.when("weekend") && !v.when("tomorrow"));
  assert.ok(v.layers("places,outdoors,transport") && !v.layers("places,boats"));
  assert.ok(v.k("eat,drink") && v.t("history") && !v.t("nope"));
  assert.ok(v.focus("place:x") && !v.focus("place:nope") && !v.focus("planet:x"));
});

/* ---------------- the fixture, no basemap ---------------- */
test("map.html (fixture): one row per located record, with its layers; numbers 1…n; landmarks unnumbered", () => {
  const dir = built("fixture");
  const html = read(dir, "docs/map.html");
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /data-map-page/);
  const rows = rowsOf(html), ids = rows.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, "each row once");
  const places = fx("places"), stays = fx("stays"), xs = fx("experiences");
  for (const p of places.filter(ll)) assert.ok(ids.includes(`p:${p.id}`), `place ${p.id}`);
  for (const s of stays.filter(ll)) assert.ok(ids.includes(`s:${s.id}`), `stay ${s.id}`);
  const placeLL = new Map(places.map((p) => [p.id, ll(p)]));
  for (const x of xs.filter((x) => ll(x) || placeLL.get(x.departs_place))) assert.ok(ids.includes(`x:${x.id}`), `experience ${x.id}`);
  for (const r of rows) {
    const layers = r.l.split(" ");
    assert.ok(layers.length && layers.every((l) => MAP_LAYERS.includes(l)), `${r.id} layers ${r.l}`);
    assert.match(r.ll, /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
    if (r.r) assert.ok(REGION_IDS.includes(r.r));
  }
  // numbers: places only, 1…n with no gap; historic sites carry the landmark instead
  const nums = rows.filter((r) => r.n).map((r) => Number(r.n)).sort((a, b) => a - b);
  assert.deepEqual(nums, nums.map((_, i) => i + 1));
  for (const r of rows.filter((r) => r.k === "heritage")) assert.equal(r.n, undefined, `${r.id} is a landmark, not a number`);
  assert.ok(rows.some((r) => r.id === "p:tampa-theatre" && r.k === "heritage"), "a heritage block makes a landmark");
  // numbered in sheet order: every Tampa number comes before every St. Petersburg number
  const tp = rows.filter((r) => r.n && r.r === "tampa").map((r) => +r.n), sp = rows.filter((r) => r.n && r.r === "stpete").map((r) => +r.n);
  assert.ok(Math.max(...tp) < Math.min(...sp));
  // the layer chips count what the rows carry
  for (const l of LAYERS) {
    const m = new RegExp(`data-layer="${l.id}" aria-pressed="(true|false)">[\\s\\S]*?<span class="n">(\\d+)</span>`).exec(html);
    assert.ok(m, `chip ${l.id}`);
    assert.equal(Number(m[2]), rows.filter((r) => r.l.split(" ").includes(l.id)).length, `chip ${l.id} count`);
    assert.equal(m[1], String(DEFAULT_LAYERS.includes(l.id)));
  }
});

test("map.html (fixture): events by location, cancelled ones left off, unlocated ones listed as not on the chart", () => {
  const dir = built("fixture");
  const html = read(dir, "docs/map.html");
  const rows = rowsOf(html), evRows = rows.filter((r) => r.k === "event");
  const evIds = evRows.flatMap((r) => r.evs.split(" "));
  assert.ok(!evIds.includes("riverwalk-boat-parade-2026-12-12"), "a cancelled event leaves the chart");
  assert.ok(evIds.includes("dali-fixture-exhibition-2026"));
  const run = evRows.find((r) => r.evs.split(" ").includes("dali-fixture-exhibition-2026"));
  assert.equal(run.id, "e:dali-museum", "events at a place are one row keyed by the place");
  assert.match(run.runs, /^2026-\d\d-\d\d:2027-01-10$/, "a long run carries its span");
  for (const r of evRows) for (const d of (r.days || "").split(" ").filter(Boolean)) assert.ok(d >= "2026-09-28" && d <= "2027-04-30", `${r.id} day ${d} in the window`);
  // Guavaween has only a location text: listed, honestly, without a pin
  const off = html.slice(html.indexOf("map-off"));
  assert.match(off, /Guavaween[\s\S]*?no coordinates listed/);
  assert.match(html, /Not on the chart/);
  // transport stops with coordinates are rows that link to their getting-around anchor
  for (const r of rows.filter((r) => r.k === "stop")) assert.match(r.f, /^transport:[a-z0-9-]+$/);
});

test("map.html (fixture): without a basemap it says so, keeps the attribution line, and guesses nothing", () => {
  const dir = built("fixture");
  const html = read(dir, "docs/map.html");
  assert.match(html, /The chart appears once the basemap is in the guide\. Every place is in the list\./);
  const t = text(html);
  assert.ok(t.includes("Basemap: US Census Bureau TIGER/Line (public domain). Place coordinates include data © OpenStreetMap contributors, ODbL ( https://www.openstreetmap.org/copyright (opens in a new tab) )."), "the SPEC §7 attribution line");
  assert.equal(ATTRIBUTION, "Basemap: US Census Bureau TIGER/Line (public domain). Place coordinates include data © OpenStreetMap contributors, ODbL (https://www.openstreetmap.org/copyright).");
  assert.ok(!/\b(undefined|NaN|TBA|TBD)\b/.test(t), "no placeholder or broken value in the page");
  assert.match(t, /Distances on this chart are straight-line estimates/);
  const charts = json(dir, "docs/assets/data/map-charts.json");
  assert.equal(charts.bay, null);
  assert.equal(Object.keys(charts.areas).length, AREA_IDS.length);
  assert.equal(charts.attribution, ATTRIBUTION);
  const lines = json(dir, "docs/assets/data/map-lines.json").l;
  for (const p of fx("places").filter((p) => p.summary)) assert.ok(lines[`p:${p.id}`], `line for ${p.id}`);
});

test("areas.html (fixture): every area once, by sheet, filterable by ?r=", () => {
  const dir = built("fixture");
  const html = read(dir, "docs/areas.html");
  for (const id of AREA_IDS) {
    const m = new RegExp(`<article class="card area" id="a-${id}" data-area="${id}" data-sheet="(\\w+)" data-r="(\\w+)"`).exec(html);
    assert.ok(m, `card a-${id}`);
    assert.equal(m[1], AREAS[id]);
  }
  for (const r of REGION_IDS) assert.match(html, new RegExp(`<section class="section ar-sheet" id="r-${r}"[^>]*data-filter-group`));
  assert.match(html, /data-filter-list/);
  for (const r of REGION_IDS) assert.match(html, new RegExp(`data-filter-chip="r=${r}"`));
});

test("areas/<id>.html (fixture): every section, numbered rows, honest empty notes, straight-line neighbors", () => {
  const dir = built("fixture");
  for (const id of AREA_IDS) {
    const html = read(dir, `docs/areas/${id}.html`);
    for (const s of ["do", "stay", "tours", "on", "history", "eat", "nearby"]) assert.match(html, new RegExp(`<section class="section" id="${s}"`), `${id} #${s}`);
    const nums = [...html.matchAll(/<li class="row ar-row"[^>]*data-n="(\d+)"/g)].map((m) => +m[1]);
    assert.deepEqual(nums.slice().sort((a, b) => a - b), nums.map((_, i) => i + 1), `${id}: numbers 1…n in reading order`);
    assert.ok(!/\b(undefined|NaN)\b/.test(text(html)), id);
  }
  // an area with nothing filed: every list says so, in words
  const empty = read(dir, "docs/areas/harbour-island.html");
  assert.match(empty, /No museums, parks, beaches or other things to do in Harbour Island are in this guide yet\./);
  assert.match(empty, /No tours or boat trips in this guide depart from Harbour Island\./);
  assert.match(empty, /Nothing is listed in Harbour Island for the next 60 days\./);
  assert.match(empty, /No profile yet/);
  // no stays in Old Northeast: the nearest listed, by straight line from its center
  const one = read(dir, "docs/areas/old-northeast.html");
  assert.match(one, /No hotels, inns or other places to stay in Old Northeast are listed in this guide\. The nearest listed, by straight-line distance from the area's center:/);
  assert.match(one, /away, straight line/);
  assert.match(one, /Straight-line distance between area centers; by road it is farther\./);
  assert.match(one, /<span class="ar-dist tnum">\d+(\.\d)? (mi|m)<\/span>/);
});

test("areas/<id>.html (fixture): What's on here holds the season, shows the next 60 days, and follows the clock", () => {
  const dir = built("fixture");
  const dt = read(dir, "docs/areas/downtown-tampa.html");
  assert.match(dt, /data-area-events/);
  assert.match(dt, /<li data-ev="riverwalk-concert-2026-10-02"[^>]*data-s="\d+" data-e="\d+"(?![^>]*hidden)[^>]*>/, "Oct 2 is inside the first 60 days");
  const hp = read(dir, "docs/areas/hyde-park.html");
  assert.match(hp, /<li data-ev="gasparilla-pirate-fest-2027"[^>]*hidden>/, "Jan 30 is listed but hidden until it is within 60 days");
  const sp = read(dir, "docs/areas/downtown-stpete.html");
  assert.match(sp, /<li data-ev="dali-fixture-exhibition-2026"[^>]*data-run="2027-01-10" data-run-from="2026-\d\d-\d\d" data-run-to="2027-01-10"/, "a long run keeps its real end");
  assert.ok(!/data-ev="riverwalk-boat-parade-2026-12-12"/.test(dt), "cancelled events are not listed");
  assert.match(dt, /<body[^>]*data-features="[^"]*\bmap\b/, "the clock is wired by features/map.js");
});

/* ---------------- the fixture on a synthetic bay and region chart ---------------- */
test("with a basemap: the static chart has the neatline and signature buoys; area pages carry their chart", () => {
  const dir = built("charts", withCharts);
  const html = read(dir, "docs/map.html");
  assert.match(html, /<div class="map-view is-static" data-map-view style="--map-ratio: \d+ \/ \d+"><svg class="map-base" viewBox="-24(\.0)? -24(\.0)? /);
  assert.match(html, /<use href="assets\/map\/basemap\.svg#bm"\/><\/svg><use href="assets\/map\/basemap\.svg#bm-grid"\/>/);
  assert.match(html, /Not for navigation/);
  const charts = json(dir, "docs/assets/data/map-charts.json");
  assert.ok(charts.bay && charts.region && charts.bay.projection && charts.region.projection);
  const dt = read(dir, "docs/areas/downtown-tampa.html");
  assert.match(dt, /<figure class="ar-chart" data-area-chart="Downtown Tampa"><div class="mini-map chart-map ar-map" data-chart="bay"/);
  const numbered = [...dt.matchAll(/<li class="row ar-row"[^>]*data-n="(\d+)"/g)].length;
  const pins = [...dt.slice(dt.indexOf("chart-map"), dt.indexOf("</figure>")).matchAll(/class="pin pin-(place|heritage)"/g)].length;
  const meds = [...dt.slice(dt.indexOf("chart-map"), dt.indexOf("</figure>")).matchAll(/class="pin pin-cluster"[^>]*><span>(\d+)<\/span>/g)].reduce((a, m) => a + +m[1], 0);
  assert.equal(pins + meds, numbered, "every numbered place is a buoy or inside a medallion");
  assert.match(dt, /Basemap: US Census Bureau TIGER\/Line \(public domain\)/, "every map carries its attribution line");
  const idx = read(dir, "docs/areas.html");
  assert.match(idx, /<figure class="ar-index" data-sheet="tampa"><div class="mini-map chart-map ar-index-map" data-chart="(bay|region)"/);
});

/* ---------------- the real data, when it is merged ---------------- */
const merged = (() => { try { return !JSON.parse(fs.readFileSync(path.join(REPO, "data", "places.json"), "utf8")).some((p) => /FIXTURE/.test(p.notes || "")); } catch { return false; } })();
test("real data: every located record is on map.html once; area pages number their places; budgets hold", { skip: !merged && "data/ is not the merged research" }, () => {
  const dir = built("real", () => {}, path.join(REPO, "data"));
  const html = read(dir, "docs/map.html");
  const rows = rowsOf(html);
  const places = JSON.parse(fs.readFileSync(path.join(REPO, "data/places.json"), "utf8"));
  const stays = JSON.parse(fs.readFileSync(path.join(REPO, "data/stays.json"), "utf8"));
  assert.equal(rows.filter((r) => r.id.startsWith("p:")).length, places.filter(ll).length);
  assert.equal(rows.filter((r) => r.id.startsWith("s:")).length, stays.filter(ll).length);
  assert.ok(Buffer.byteLength(html) < 1000 * 1024, "map.html under its 1,000 KB raw budget");
  for (const id of AREA_IDS) {
    const a = read(dir, `docs/areas/${id}.html`);
    const nums = [...a.matchAll(/<li class="row ar-row"[^>]*data-n="(\d+)"/g)].map((m) => +m[1]);
    assert.deepEqual(nums.slice().sort((x, y) => x - y), nums.map((_, i) => i + 1), id);
  }
});
