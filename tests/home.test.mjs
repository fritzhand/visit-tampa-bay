/* ============================================================
   tests/home.test.mjs · OWNER: the Home & Sheets lane
   index.html and the six sheet pages (build/pages/home.mjs, build/pages/region.mjs) and their client modules
   (site/js/features/home.js, region.js):
   - the pure parts: first sentences, the sheet picks (signature first, then kind priority), season months,
     straight-line miles, the 60-day plan of a sheet's list, the home band (today, the weekend, runs, the next
     listed day, before and after the listings) and the next signature event of a sheet;
   - the fixture build (a throwaway copy, tests/helpers.mjs): the masthead and its one h1, the no-JS band (only the
     first seven days of the listings), the six plates with their computed counts and links, the calendar (every
     series once), the seven eras, the sheet pages' heads, TOC anchors, the 60-day list (every live event of the
     sheet once, cancelled ones never, the first 60 days of the listings shown), family links, prev/next sheets,
     unknowns printed as unknowns (a sheet with no record, no coordinates, no signature event);
   - a synthetic basemap: the sheet chart (buoys, the key, printed limits) and the index chart;
   - the real data, when data/ holds the merged research: every signature place in its sheet's key with the buoy
     number the chart shows, insets, the airports' distance table, nothing printed as "undefined" or "NaN".
   ============================================================ */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPO, fx, copyRepo, build, read, write, cleanup } from "./helpers.mjs";

const { AREAS, REGIONS, REGION_IDS, ERAS } = await import(path.join(REPO, "build", "core", "vocab.mjs"));
const { REGION_PAGES } = await import(path.join(REPO, "build", "nav.mjs"));
const U = await import(path.join(REPO, "build", "core", "util.mjs"));
const R = await import(path.join(REPO, "build", "pages", "region.mjs"));
const H = await import(path.join(REPO, "build", "pages", "home.mjs"));
const RJ = await import(path.join(REPO, "site", "js", "features", "region.js"));
const HJ = await import(path.join(REPO, "site", "js", "features", "home.js"));
const T = await import(path.join(REPO, "site", "js", "lib", "time.js"));

const h = { sortBy: U.sortBy };
const slugOf = (rid) => REGION_PAGES.find((p) => p.region === rid).slug;
const W0 = "2026-09-28", W1 = "2027-04-30";

/* ---------------------------------------------------------------- pure helpers */

test("firstSentence keeps abbreviations inside the sentence", () => {
  assert.equal(R.firstSentence("St. Petersburg sits on the Pinellas peninsula. Its downtown has the Pier."), "St. Petersburg sits on the Pinellas peninsula.");
  assert.equal(R.firstSentence("One sentence only"), "One sentence only");
  assert.equal(R.firstSentence(""), "");
  assert.equal(R.shortArea("Channel District & Water Street"), "Channel District");
  assert.equal(R.shortArea("Lakeland, Winter Haven & Polk County"), "Lakeland");
});

test("sheetPicks: signature places first, one per family, then the first by kind priority", () => {
  const p = (id, kind, extra = {}) => ({ id, name: id, kind, status: "open", events: [], experiences: [], timeline: [], series: [], ...extra });
  const places = [p("a-bar", "bar", { signature: true }), p("b-zoo", "zoo"), p("c-museum", "museum", { signature: true }), p("d-park", "park", { signature: true }), p("e-closed", "theme-park", { status: "closed" })];
  const pk = R.sheetPicks(h, places, 3);
  assert.deepEqual(pk.list.map((x) => x.id), ["d-park", "c-museum", "a-bar"], "outdoors, then arts, then drink: one per family, signature only");
  assert.equal(pk.signature, 3);
  const none = R.sheetPicks(h, places.map((x) => ({ ...x, signature: false })), 2);
  assert.deepEqual(none.list.map((x) => x.id), ["b-zoo", "d-park"], "no signature place: attractions, then outdoors, by kind priority");
  assert.equal(none.signature, 0);
  assert.ok(!R.sheetPicks(h, places, 5).list.some((x) => x.id === "e-closed"), "a closed place is never picked");
});

test("season months, spans and straight-line miles", () => {
  assert.equal(H.seasonMonth({ months: [9, 10, 11, 12, 1] }), 10, "a Sep–Jan series is listed in October, the first month of the season it covers");
  assert.equal(H.seasonMonth({ months: [2, 3] }), 2);
  assert.equal(H.seasonMonth({ months: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12] }), 0, "eleven months or more is year-round");
  assert.equal(H.monthSpan([11, 12, 1]), "Nov–Jan");
  assert.equal(H.monthSpan([4]), "Apr");
  assert.equal(H.monthSpan([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), "All year");
  assert.equal(R.miles(1609.344 * 4.26), "4.3 mi");
  assert.equal(R.miles(1609.344 * 9.97), "10 mi", "never 10.0");
  assert.equal(R.miles(1609.344 * 38.6), "39 mi");
});

test("region.js plan: the rows in the next 60 days, by their next listing day; runs while open", () => {
  const rows = [
    { i: 0, first: "2026-10-02", last: "2026-10-02", listing: ["2026-10-02"], run: false },
    { i: 1, first: "2026-10-03", last: "2026-10-17", listing: ["2026-10-03", "2026-10-10", "2026-10-17"], run: false },
    { i: 2, first: "2026-09-28", last: "2027-01-10", listing: [], run: true },
    { i: 3, first: "2027-02-05", last: "2027-02-16", listing: ["2027-02-05"], run: false },
  ];
  const a = RJ.plan(rows, "2026-10-05");
  assert.deepEqual(a.map((x) => [x.i, x.next]), [[2, "2026-10-05"], [1, "2026-10-10"]], "a past day drops out; the market moves to its next date; the run is open today");
  assert.deepEqual(RJ.plan(rows, "2026-12-20").map((x) => x.i), [2, 3], "60 days from Dec 20 reach Feb 5");
  assert.deepEqual(RJ.plan(rows, "2027-03-01"), [], "nothing left");
  assert.deepEqual(RJ.rowOf({ first: "2026-10-02", last: "2026-10-02" }).listing, ["2026-10-02"], "a single day lists itself");
});

test("home.js band: today, the weekend, runs, the next listed day; before and after the listings", () => {
  const at = (d, t) => T.nyToEpoch(d, t);
  const ev = (id, rows, extra = {}) => ({ id, t: id, r: "tampa", st: "scheduled", i: rows, ...extra });
  const events = [
    ev("fri", [["2026-10-02", at("2026-10-02", "18:00"), at("2026-10-02", "21:00"), 0]]),
    ev("sat", [["2026-10-03", at("2026-10-03", "09:00"), at("2026-10-03", "14:00"), 0]], { fe: 1 }),
    ev("sat-untimed", [["2026-10-03", at("2026-10-03", "00:00"), at("2026-10-04", "00:00"), 2]]),
    ev("gone", [["2026-10-03", at("2026-10-03", "10:00"), at("2026-10-03", "11:00"), 0]], { st: "cancelled", fe: 1 }),
    ev("run", [["2026-09-28", at("2026-09-28", "00:00"), at("2026-11-01", "00:00"), 32]], { ed: "2026-10-31", fe: 1, r: "stpete" }),
  ];
  const all = HJ.items(events);
  assert.ok(!all.some((x) => x.ev.id === "gone"), "cancelled events never show");
  const win = { start: W0, end: W1 };
  const sun = HJ.band(all, at("2026-09-27", "12:00"), win);
  assert.equal(sun.phase, "before");
  assert.equal(sun.todayList.length, 0);
  assert.equal(sun.wkLabel, "Next weekend", "on a Sunday the weekend shown is the next one");
  assert.deepEqual(sun.weekend.map((d) => d.d), ["2026-10-02", "2026-10-03", "2026-10-04"]);
  assert.equal(sun.nextDay, "2026-10-02");
  const fri = HJ.band(all, at("2026-10-02", "19:00"), win);
  assert.deepEqual(fri.todayList.map((x) => x.ev.id), ["fri"]);
  assert.equal(fri.wkLabel, "This weekend");
  assert.deepEqual(fri.weekend.map((d) => d.d), ["2026-10-03", "2026-10-04"], "the rest of the weekend, today left out");
  assert.deepEqual(fri.weekend[0].list.map((x) => x.ev.id), ["sat", "sat-untimed"], "timed first, then untimed");
  assert.deepEqual(fri.runs.map((x) => x.ev.id), ["run"]);
  const late = HJ.band(all, at("2027-05-02", "12:00"), win);
  assert.equal(late.phase, "after");
  assert.equal(late.nextDay, null);
  assert.equal(late.runs.length, 0);
  assert.equal(HJ.nextFor(all, "tampa", at("2026-10-02", "19:00")).ev.id, "sat");
  assert.equal(HJ.nextFor(all, "tampa", at("2026-10-04", "12:00")), null, "the only later signature event is cancelled");
  assert.equal(HJ.nextFor(all, "stpete", at("2026-10-20", "12:00")).ev.id, "run", "a run is next while it is open");
});

/* ---------------------------------------------------------------- the fixture build */

let dir = null, docs = null;
before(() => {
  dir = copyRepo();
  const r = build(dir);
  assert.equal(r.status, 0, `fixture build failed:\n${r.stderr}${r.stdout}`);
  docs = path.join(dir, "docs");
});
after(() => { if (dir) cleanup(dir); });

const regionOf = (area) => AREAS[area] || null;
const fxPlaces = fx("places"), fxStays = fx("stays"), fxSeries = fx("series"), fxRegions = fx("regions");
// events as the build resolved them (a place found through aliases gives its area): the client JSON is the ground truth
let EV = null;
const liveEv = () => (EV ||= JSON.parse(read(docs, "assets/data/events.json")).events).filter((e) => !["cancelled", "postponed"].includes(e.st));
const count = (rid) => ({
  places: fxPlaces.filter((p) => regionOf(p.area) === rid).length,
  stays: fxStays.filter((s) => regionOf(s.area) === rid).length,
  events: liveEv().filter((e) => e.r === rid && e.i.length).length,
});
const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

test("index.html: the masthead is the page's one h1; the six plates carry computed counts and link their sheets", () => {
  const html = read(docs, "index.html");
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /<h1 class="mast-h" id="mast-h"><svg class="wm-art"[^>]*role="img" aria-label="Tampa Bay Chartbook"/);
  assert.match(html, /data-mast-date>Listings Sep 28, 2026 – Apr 30, 2027</, "without JS the date line names the listings, never the build date");
  for (const rid of REGION_IDS) {
    const m = html.match(new RegExp(`<article class="si-plate" id="sheet-${rid}"[\\s\\S]*?</article>`));
    assert.ok(m, `plate for ${rid}`);
    const c = count(rid);
    assert.match(m[0], new RegExp(`<dd>${c.places}</dd><dt>places</dt>`), `${rid}: places`);
    assert.match(m[0], new RegExp(`<dd>${c.stays}</dd><dt>to stay</dt>`), `${rid}: stays`);
    assert.match(m[0], new RegExp(`<dd>${c.events}</dd><dt>events</dt>`), `${rid}: live events`);
    assert.match(m[0], new RegExp(`href="${slugOf(rid)}\\.html"`));
    assert.match(m[0], new RegExp(`Sheet ${REGIONS[rid].n} · ${REGIONS[rid].code}`));
    if (!c.events) assert.match(m[0], /<span class="unk">No signature event listed<\/span>/, `${rid}: an unknown next event says so`);
  }
  for (const id of ["today", "sheets", "signature", "season", "stay", "eras", "numbers"]) assert.ok(ids(html).has(id), `section #${id}`);
});

test("index.html: the no-JS band lists only the first seven days of the listings", () => {
  const html = read(docs, "index.html");
  const fb = html.match(/<div class="tb-fallback" data-tb-fallback>[\s\S]*?<\/div>\n<\/div>/)[0];
  const shown = [...fb.matchAll(/data-ev="([^"]+)"/g)].map((m) => m[1]);
  const last = T.addDays(W0, 6);
  const inFirstWeek = liveEv().filter((e) => e.i.some(([day, , , f]) => !(f & 32) && day >= W0 && day <= last)).map((e) => e.id);
  assert.ok(shown.length > 0);
  for (const id of shown) assert.ok(inFirstWeek.includes(id), `${id} is in the first seven days`);
  assert.ok(!shown.includes("guavaween-2026"), "Oct 24 is not in the first week");
  assert.match(fb, /Mon, Sep 28 to Sun, Oct 4, 2026/);
});

test("index.html: signature events in order, every series once in the calendar, seven eras, stat tiles with sources", () => {
  const html = read(docs, "index.html");
  const fe = [...html.matchAll(/<li class="fe-item evrow" data-ev="([^"]+)"/g)].map((m) => m[1]);
  const want = liveEv().filter((e) => e.fe && e.i.length).map((e) => e.id);
  assert.deepEqual([...fe].sort(), [...want].sort(), "every live signature event, cancelled ones never");
  for (const s of fxSeries) assert.equal((html.match(new RegExp(`whats-on\\.html#s-${s.id}"`, "g")) || []).length, 1, `series ${s.id} once`);
  for (const e of ERAS) assert.match(html, new RegExp(`href="history\\.html#era-${e}"`));
  const facts = fx("facts");
  for (const f of facts) assert.ok(html.includes(U.attr(f.source_url)), `fact ${f.id}: its source is linked`);
  assert.match(html, /<details class="stat[^"]*"><summary>/, "tiles open on tap without JS");
});

test("sheet pages: head, TOC anchors, prev/next sheets, the 60-day list, family links, unknowns as unknowns", () => {
  for (const rp of REGION_PAGES) {
    const rid = rp.region;
    const html = read(docs, `${rp.slug}.html`);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
    assert.match(html, new RegExp(`<header class="page-head sheet-head" data-sheet="${rid}">`));
    assert.match(html, new RegExp(`Sheet ${REGIONS[rid].n} · ${REGIONS[rid].code}`));
    const all = ids(html);
    for (const [id] of [...html.matchAll(/<aside class="toc"[\s\S]*?<\/aside>/g)].flatMap((m) => [...m[0].matchAll(/href="#([^"]+)"/g)]).map((m) => [m[1]])) assert.ok(all.has(id), `${rp.slug}: TOC #${id} exists`);
    // the 60-day list: every live event of the sheet once, cancelled never, the first 60 days of the listings shown
    const rows = [...html.matchAll(/<li class="evrow" data-ev="([^"]+)"[^>]*?data-first="([^"]+)"[^>]*>/g)];
    const wanted = liveEv().filter((e) => e.r === rid && e.i.length).map((e) => e.id).sort();
    assert.deepEqual(rows.map((m) => m[1]).sort(), wanted, `${rp.slug}: every live event once`);
    const until = T.addDays(W0, 59);
    for (const m of rows) assert.equal(/\shidden(?=[\s>])/.test(m[0]), m[2] > until, `${rp.slug}: ${m[1]} ${m[2] > until ? "waits" : "shows"} without JS`);
    assert.ok(!html.includes('data-ev="riverwalk-boat-parade-2026-12-12"'), "a cancelled event is not in the coming weeks");
    // families link to their filtered lists
    for (const m of html.matchAll(/href="things-to-do\.html\?([^"]+)"/g)) assert.match(m[1], new RegExp(`^r=${rid}(&amp;k=(attractions|arts|sports|shopping))?$`));
    // prev / next are the neighbouring sheets
    const i = REGION_PAGES.indexOf(rp);
    if (i > 0) assert.match(html, new RegExp(`class="prev" href="${REGION_PAGES[i - 1].slug}\\.html"`));
    if (i < REGION_PAGES.length - 1) assert.match(html, new RegExp(`class="next" href="${REGION_PAGES[i + 1].slug}\\.html"`));
    // a sheet without a record: no invented lede words, no official site, no "known for"
    if (!fxRegions.some((r) => r.id === rid)) {
      assert.ok(!/Official visitor bureau/.test(html) && !/Known for /.test(html), `${rp.slug}: nothing invented for a sheet with no record`);
      assert.match(html, /has no record of its own yet/);
    }
    assert.ok(!/undefined|NaN|\bnull\b/.test(html.replace(/<script[\s\S]*?<\/script>/g, "")), `${rp.slug}: no undefined, NaN or null printed`);
  }
  const t = read(docs, "tampa.html");
  assert.match(t, /The chart of this sheet appears once the basemap is in the guide/, "no basemap: the chart says so");
  assert.ok(!/outside this chart/.test(t), "no chart, no 'outside this chart'");
});

/* ---------------------------------------------------------------- a synthetic basemap */

test("with a basemap: the sheet chart numbers its buoys, prints its limits, keys them; the home page draws the index chart", () => {
  const d = copyRepo();
  try {
    const lat0 = 27.85, k = Math.cos((lat0 * Math.PI) / 180), sx = 1000 / 0.9;
    const core = { bbox: { core: { s: 27.4, n: 28.3, w: -82.95, e: -82.05 } }, projection: { lat0, k, sx, viewBox: [Math.round(0.9 * k * sx), 1000] }, labels: [{ text: "Tampa Bay", lat: 27.75, lng: -82.55, kind: "water" }] };
    const sxr = 1000 / 2.1;
    const region = { bbox: { core: { s: 26.9, n: 29, w: -83, e: -81.4 } }, projection: { lat0: 27.95, k: Math.cos((27.95 * Math.PI) / 180), sx: sxr, viewBox: [Math.round(1.6 * Math.cos((27.95 * Math.PI) / 180) * sxr), 1000] }, labels: [{ text: "Gulf of Mexico", lat: 28.2, lng: -82.9, kind: "water", minZoom: 1 }], file: "region.svg" };
    write(d, "data/map.json", JSON.stringify({ ...core, region }));
    write(d, "site/map/basemap.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${core.projection.viewBox.join(" ")}"><g id="bm"></g><g id="bm-grid"></g></svg>`);
    write(d, "site/map/region.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${region.projection.viewBox.join(" ")}"><g id="bm"></g><g id="bm-grid"></g></svg>`);
    const r = build(d);
    assert.equal(r.status, 0, r.stderr);
    const t = read(d, "docs/tampa.html");
    assert.match(t, /<div class="mini-map area-map sheet-map-view" style="--map-ratio: [\d.]+ \/ [\d.]+" role="img" aria-label="Chart of Tampa:[^"]*"><svg viewBox="[\d. ]+"[^>]*><use href="assets\/map\/basemap\.svg#bm"\/>/);
    const buoys = [...t.matchAll(/class="pin pin-place[^"]*" data-sheet="tampa"[^>]*><span>([^<]+)<\/span>/g)].map((m) => m[1]);
    assert.deepEqual(buoys, ["1"], "one signature place in the fixture, buoy 1");
    assert.match(t, /<ol class="sheet-key"><li><span class="kb" data-sheet="tampa" aria-hidden="true">1<\/span><span class="kt"><a href="places\/florida-aquarium\.html">The Florida Aquarium<\/a>/);
    assert.match(t, /Chart limits \d+\.\d\d°–\d+\.\d\d° N, \d+\.\d\d°–\d+\.\d\d° W/, "limits printed from the crop");
    assert.match(t, /map-label hood area-l[^"]*"[^>]*>(Downtown Tampa|Channel District|Ybor City|Hyde Park)</, "areas are named on the chart");
    const home = read(d, "docs/index.html");
    assert.match(home, /<figure class="ix-chart grat">/);
    assert.match(home, /<use href="assets\/map\/region\.svg#bm"\/>/);
    for (const rid of ["tampa", "stpete"]) assert.match(home, new RegExp(`<span class="ix-badge" data-sheet="${rid}"`), `index badge for ${rid}`);
  } finally { cleanup(d); }
});

/* ---------------------------------------------------------------- the real data (skips while data/ is the fixture) */

const realPlaces = JSON.parse(fs.readFileSync(path.join(REPO, "data", "places.json"), "utf8"));
const realMap = fs.existsSync(path.join(REPO, "data", "map.json")) && fs.existsSync(path.join(REPO, "site", "map", "basemap.svg"));
test("real data: every signature place is in its sheet's key with the buoy the chart shows; airports; no undefined", { skip: (realPlaces.length < 100 || !realMap) && "data/ is not the merged research, or there is no basemap" }, () => {
  const d = copyRepo({ data: path.join(REPO, "data") });
  try {
    const r = build(d);
    assert.equal(r.status, 0, `real build failed:\n${r.stderr}`);
    for (const rp of REGION_PAGES) {
      const html = read(d, `docs/${rp.slug}.html`);
      const sig = realPlaces.filter((p) => p.signature && p.status !== "closed" && AREAS[p.area] === rp.region);
      const key = [...html.matchAll(/<li(?: class="off")?><span class="kb" data-sheet="[a-z]+" aria-hidden="true">(\d*)<\/span><span class="kt"><a href="places\/([^"]+)\.html">/g)].map((m) => ({ n: m[1], id: m[2] }));
      if (sig.length) assert.deepEqual(key.map((k) => k.id).sort(), sig.map((p) => p.id).sort(), `${rp.slug}: the key lists every signature place`);
      else assert.ok(key.length > 0, `${rp.slug}: places to start when no place is signature`);
      const nums = key.filter((k) => k.n).map((k) => Number(k.n));
      assert.deepEqual(nums, nums.map((_, i) => i + 1), `${rp.slug}: buoys numbered 1…n in key order`);
      const expand = (label) => label.split(", ").flatMap((part) => { const [a, b] = part.split("–").map(Number); return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a]; });
      const onChart = new Set([...html.matchAll(/class="pin pin-place[^"]*"[^>]*><span>([^<]+)<\/span>/g)].flatMap((m) => expand(m[1])));
      for (const n of nums) assert.ok(onChart.has(n), `${rp.slug}: buoy ${n} is on the chart or its inset`);
      assert.ok(!/>undefined<|>NaN<|\bundefined\b/.test(html.replace(/<script[\s\S]*?<\/script>/g, "")), `${rp.slug}: nothing undefined`);
    }
    const home = read(d, "docs/index.html");
    for (const code of ["TPA", "PIE", "SRQ"]) assert.match(home, new RegExp(`<p class="ap-code tnum" aria-hidden="true">${code}</p>`));
    const rows = [...home.matchAll(/<tr data-sheet="[a-z]+">[\s\S]*?<\/tr>/g)].map((m) => m[0]);
    assert.equal(rows.length, 6);
    for (const row of rows) assert.equal((row.match(/class="near">nearest</g) || []).length, 1, "one nearest airport per sheet, said in words");
    assert.match(home, /Straight-line distances/);
    assert.ok(!/\bundefined\b|>NaN</.test(home.replace(/<script[\s\S]*?<\/script>/g, "")));
  } finally { cleanup(d); }
});
