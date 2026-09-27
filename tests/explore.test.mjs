/* ============================================================
   tests/explore.test.mjs · OWNER: the Explore lane (explore-and-places)
   The contracts of things-to-do.html, outdoors.html and places/<id>.html, built from the mini fixture in a
   throwaway copy (plus a few records added to the copy: beaches on the Gulf and the bay, a campground, the
   beach-safety FAQs, a place without coordinates), with and without a synthetic basemap:
     - who is listed where (placeHome), each place once, counts computed from data and matching the cards
     - the anchors other pages link to (#f-<family>, #start, #safety, #glance, #where, #source …)
     - filters: chip and select values are values the crawler accepts (regions, areas, kinds, topics)
     - unknowns print as unknowns ("Hours not listed" …), never as a placeholder or a guess
     - Gulf beaches run north to south, their chart's numbers match, distances say "straight line"
     - every card and page names its source and the date it was checked
   Pure helpers (placeHome, placeTagWords, placeSym) are tested directly.
   ============================================================ */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPO, fx, copyRepo, build, read, write, cleanup, editData } from "./helpers.mjs";

const { placeHome, placeTagWords, placeSym, OUTDOOR_HOME_KINDS } = await import(path.join(REPO, "build", "components", "place-card.mjs"));
const { PLACE_KINDS, TOPICS, REGION_IDS, AREA_IDS, PLACE_GROUP } = await import(path.join(REPO, "build", "core", "vocab.mjs"));

/* ---------- records added to the copy (FIXTURE-shaped, sourced) ---------- */
const src = { source_url: "https://example.org/beach", checked: "2026-09-27", notes: "FIXTURE (explore test)" };
const EXTRA_PLACES = [
  { id: "xp-north-gulf-beach", name: "North Gulf Beach", kind: "beach", topics: ["beaches"], area: "clearwater-beach", lat: 27.978, lng: -82.83, geo_source: "manual", summary: "Fixture beach.", tags: ["lifeguards", "no-alcohol"], status: "open", ...src },
  { id: "xp-south-gulf-beach", name: "South Gulf Beach", kind: "beach", topics: ["beaches"], area: "pass-a-grille", lat: 27.689, lng: -82.737, geo_source: "manual", summary: "Fixture beach.", tags: ["dog-beach"], hours_text: "Daily, sunrise to sunset.", status: "open", ...src },
  { id: "xp-bay-beach", name: "Bay Side Beach", kind: "beach", topics: ["beaches"], area: "davis-islands", lat: 27.911, lng: -82.451, geo_source: "manual", summary: "Fixture beach.", tags: ["bay-beach", "dog-beach"], status: "open", ...src },
  { id: "xp-mystery-trail", name: "Mystery Trail", kind: "trail", topics: ["outdoors"], area: "south-tampa", summary: "A fixture trail with no position.", status: "open", ...src },
];
const EXTRA_STAYS = [{ id: "xp-camp", name: "Fixture Campground", kind: "campground", area: "fort-de-soto", lat: 27.63, lng: -82.72, geo_source: "manual", summary: "Fixture campground.", status: "open", ...src }];
const EXTRA_FAQS = [
  { id: "beach-warning-flags", topic: "Beaches & water safety", q: "What do the beach warning flags mean?", a: "Fixture answer about flags.", source_url: "https://example.org/flags", checked: "2026-09-27" },
  { id: "rip-current-escape", topic: "Beaches & water safety", q: "What do I do if a rip current pulls me out?", a: "Fixture answer about rip currents.", source_url: "https://example.org/rip", checked: "2026-09-27" },
  { id: "stingray-shuffle", topic: "Beaches & water safety", q: "What is the stingray shuffle?", a: "Fixture answer.", source_url: "https://example.org/shuffle", checked: "2026-09-27" },
];
const MAP_LAT0 = 27.85, K = Math.cos((MAP_LAT0 * Math.PI) / 180), SX = 1000 / 0.7;
const MAP = { bbox: { core: { s: 27.5, n: 28.2, w: -82.9, e: -82.2 } }, projection: { lat0: MAP_LAT0, k: K, sx: SX, viewBox: [Math.round(0.7 * K * SX), 1000] }, labels: [{ text: "Tampa Bay", lat: 27.75, lng: -82.55, kind: "water", minZoom: 1 }] };

/** Build a copy with the extra records (and, with `basemap`, a synthetic basemap). Returns { dir, docs, r }. */
function buildWith({ basemap = false } = {}) {
  const dir = copyRepo();
  editData("places", (a) => a.push(...EXTRA_PLACES))(dir);
  editData("stays", (a) => a.push(...EXTRA_STAYS))(dir);
  editData("faqs", (a) => a.push(...EXTRA_FAQS))(dir);
  if (basemap) {
    write(dir, "data/map.json", JSON.stringify(MAP));
    write(dir, "site/map/basemap.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP.projection.viewBox.join(" ")}"><g id="bm"></g><g id="bm-grid"></g></svg>`);
  }
  const r = build(dir);
  return { dir, docs: path.join(dir, "docs"), r };
}
const cardsOf = (html) => [...html.matchAll(/<article class="card place[^"]*"[^>]*data-place="([^"]+)"/g)].map((m) => m[1]);
/** the markup from a section's id to its end ("" when there is none) */
const sectionOf = (html, id) => { const i = html.indexOf(`id="${id}"`); return i < 0 ? "" : html.slice(i, html.indexOf("</section>", i)); };
const PLACEHOLDERS = /\b(TBA|TBD|N\/A)\b|>\s*(Varies|Unknown|See website)\s*</;
const places = [...fx("places"), ...EXTRA_PLACES];

/* ---------- pure helpers ---------- */
test("placeHome: eat and drink kinds go to Eat & drink, beaches and parks to outdoors, the rest to Things to do", () => {
  const home = (kind) => placeHome({ kind });
  for (const k of PLACE_KINDS) {
    const g = PLACE_GROUP[k];
    const want = g === "eat" || g === "drink" ? "eat-drink" : OUTDOOR_HOME_KINDS.includes(k) ? "outdoors" : "things-to-do";
    assert.equal(home(k), want, k);
  }
  assert.equal(home("pier"), "things-to-do", "piers stay on Things to do (outdoors lists them too)");
  assert.equal(home("waterfront"), "things-to-do");
  assert.equal(home("historic-site"), "things-to-do");
});

test("placeTagWords: research tags as plain words, most useful first, contradictions dropped", () => {
  assert.deepEqual(placeTagWords({ tags: ["birding", "dog-beach", "lifeguards", "no-alcohol"] }), ["Dog beach", "Lifeguards", "No alcohol", "Birding"]);
  assert.deepEqual(placeTagWords({ tags: ["swimming", "no-swimming"] }), ["No swimming"]);
  assert.deepEqual(placeTagWords({ tags: ["michelin-2026", "craft-beer"] }), [], "tags without a word are left out");
  assert.equal(placeTagWords({ tags: ["dog-beach", "lifeguards", "no-alcohol", "concession", "fishing-pier", "boat-ramp"] }, { max: 3 }).length, 3);
  assert.equal(placeTagWords({}).length, 0);
});

test("placeSym: every kind has a chart symbol the sprite knows", async () => {
  const { ICONS } = await import(path.join(REPO, "build", "core", "icons.mjs"));
  for (const k of PLACE_KINDS) assert.ok(ICONS[placeSym({ kind: k, tags: [] })], `${k} → ${placeSym({ kind: k })}`);
  assert.equal(placeSym({ kind: "landmark", tags: ["lighthouse"] }), "lighthouse");
});

/* ---------- the pages, built from the fixture ---------- */
test("things-to-do.html: every place whose home it is, once, grouped by family, counts from data", () => {
  const { dir, docs, r } = buildWith();
  try {
    assert.equal(r.status, 0, `build failed:\n${r.stderr}${r.stdout}`);
    const html = read(docs, "things-to-do.html");
    const want = places.filter((p) => placeHome(p) === "things-to-do").map((p) => p.id).sort();
    const got = cardsOf(html);
    assert.deepEqual([...got].sort(), want, "exactly the Things to do places");
    assert.equal(new Set(got).size, got.length, "each place once");
    for (const p of places.filter((x) => placeHome(x) !== "things-to-do" && !["pier", "waterfront"].includes(x.kind))) assert.ok(!got.includes(p.id), `${p.id} is not a thing to do`);
    // the kicker, the result count and every section's count are computed from the cards
    assert.match(html, new RegExp(`Explore · ${want.length} places`));
    assert.match(html, new RegExp(`Showing <b>${want.length}</b> of ${want.length}`));
    for (const m of html.matchAll(/<section class="section xp-sec[^"]*" id="(f-[a-z-]+)"[\s\S]*?<span data-group-count>(\d+)<\/span>[\s\S]*?<\/section>/g)) {
      const n = cardsOf(m[0]).length;
      assert.equal(Number(m[2]), n, `${m[1]} says ${m[2]} and holds ${n}`);
      assert.ok(n > 0, `${m[1]} is not empty`);
    }
    // "Start here" is the signature places, and the head chips jump to sections that exist
    const sig = places.filter((p) => p.signature && placeHome(p) === "things-to-do").map((p) => p.id);
    const start = html.slice(html.indexOf('id="start"'), html.indexOf("</section>", html.indexOf('id="start"')));
    for (const id of sig) assert.match(start, new RegExp(`places/${id}\\.html`));
    for (const m of html.matchAll(/class="chip" href="#(f-[a-z-]+)"/g)) assert.match(html, new RegExp(`<section[^>]* id="${m[1]}"`), `chip → #${m[1]}`);
    // filters: values the crawler and lib/facets accept
    for (const m of html.matchAll(/data-filter-chip="r=([a-z]+)"/g)) assert.ok(REGION_IDS.includes(m[1]), m[1]);
    const selects = Object.fromEntries([...html.matchAll(/<select class="select" name="([a-z]+)" data-filter="\1">([\s\S]*?)<\/select>/g)].map((m) => [m[1], [...m[2].matchAll(/<option value="([^"]*)"/g)].map((o) => o[1]).filter(Boolean)]));
    assert.deepEqual(Object.keys(selects).sort(), ["a", "k", "t"]);
    const kindOk = new Set([...PLACE_KINDS, ...Object.values(PLACE_GROUP)]);
    for (const v of selects.k) for (const x of v.split(",")) assert.ok(kindOk.has(x), `k=${x}`);
    for (const v of selects.a) assert.ok(AREA_IDS.includes(v), `a=${v}`);
    for (const v of selects.t) assert.ok(TOPICS.includes(v), `t=${v}`);
    assert.match(html, /<input type="checkbox" data-filter="free">/);
    assert.match(html, /data-filter-list data-filter-items="\.card"/);
    assert.match(html, /data-filter-empty hidden/);
    assert.doesNotMatch(html, /data-view="map"/, "no basemap, no Map view");
    // every card names its source and date; unknowns are unknowns
    assert.equal((html.match(/<p class="card-src">Source: /g) || []).length, want.length);
    assert.match(html, /Checked Sep 27, 2026/);
    assert.match(html, /<span class="unk">Hours not listed<\/span>/);
    assert.match(html, /<span class="unk">Price not listed<\/span>/);
    assert.doesNotMatch(html.replace(/data-q="[^"]*"/g, ""), PLACEHOLDERS);
    assert.match(html, /<body[^>]*data-features="[^"]*\bexplore\b/);
  } finally { cleanup(dir); }
});

test("outdoors.html: beaches north to south, then the bay, each place once, campgrounds, the safety FAQs", () => {
  const { dir, docs, r } = buildWith();
  try {
    assert.equal(r.status, 0, `build failed:\n${r.stderr}${r.stdout}`);
    const html = read(docs, "outdoors.html");
    const got = cardsOf(html);
    const want = places.filter((p) => placeHome(p) === "outdoors" || ["pier", "waterfront"].includes(p.kind)).map((p) => p.id).sort();
    assert.deepEqual([...got].sort(), want);
    assert.equal(new Set(got).size, got.length, "each place in one section only");
    // Gulf beaches: north first, numbered 1…n in the cards; the bay beach in its own run
    const gulf = sectionOf(html, "f-gulf");
    assert.deepEqual(cardsOf(gulf), ["xp-north-gulf-beach", "xp-south-gulf-beach"]);
    assert.deepEqual([...gulf.matchAll(/class="xp-no" data-n="(\d+)"/g)].map((m) => m[1]), ["1", "2"]);
    assert.deepEqual(cardsOf(sectionOf(html, "f-bay")), ["xp-bay-beach"]);
    assert.match(gulf, /<span>Dog beach<\/span>/, "tags as words");
    assert.match(gulf, /<span>Lifeguards<\/span><span>No alcohol<\/span>/);
    assert.match(gulf, /class="card place no-plate"/, "beach cards carry no plate without a cleared photo");
    // campgrounds are stays and link to their stay pages
    assert.match(sectionOf(html, "f-camp"), /href="stays\/xp-camp\.html"/);
    // before you swim: the FAQ's own answers, linked to faq.html#fq-<id>
    assert.match(html, /id="safety"/);
    for (const f of EXTRA_FAQS) assert.match(html, new RegExp(`href="faq\\.html#fq-${f.id}"`));
    assert.match(html, /Fixture answer about flags\./);
    for (const m of html.matchAll(/data-filter-chip="r=([a-z]+)"/g)) assert.ok(REGION_IDS.includes(m[1]));
    assert.doesNotMatch(html, /data-filter="(a|t|free)"/, "outdoors takes r, k and q only (build/nav.mjs PARAMS)");
    assert.doesNotMatch(html.replace(/data-q="[^"]*"/g, ""), PLACEHOLDERS);
  } finally { cleanup(dir); }
});

test("places/<id>.html: every place, its parent page, facts with unknowns as unknowns, sources, JSON-LD", () => {
  const { dir, docs, r } = buildWith();
  try {
    assert.equal(r.status, 0, `build failed:\n${r.stderr}${r.stdout}`);
    for (const p of places) {
      const html = read(docs, `places/${p.id}.html`);
      const parent = placeHome(p);
      assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${p.id}: one h1`);
      assert.match(html, new RegExp(`<a class="nav-link[^"]*" href="\\.\\./${parent}\\.html" aria-current="page">`), `${p.id} sits under ${parent}`);
      assert.match(html, new RegExp(`<nav class="crumbs"[^>]*><a href="\\.\\./index\\.html">Overview</a>[\\s\\S]*?href="\\.\\./${parent}\\.html"`));
      for (const id of ["glance", "where", "source"]) assert.match(html, new RegExp(`id="${id}"`), `${p.id}#${id}`);
      assert.match(html, /<script type="application\/ld\+json">[\s\S]*?"@context":"https:\/\/schema\.org"/);
      assert.match(html, /Source: <a href="https:[^"]+" target="_blank" rel="noopener">[^<]+<span class="sr-only"> \(opens in a new tab\)<\/span><\/a> · Checked /, `${p.id} names its source and date`);
      assert.match(html, new RegExp(`data-star="${p.id}" data-star-kind="p"`));
      if (!p.hours_text) assert.match(html, /<span class="unk">Hours not listed<\/span>/, `${p.id}: hours`);
      if (!p.accessibility) assert.match(html, /<span class="unk">Accessibility not listed<\/span>/);
      if (!p.parking_text) assert.match(html, /<span class="unk">Parking not listed<\/span>/);
      if (!p.phone) assert.match(html, /<span class="unk">Phone not listed<\/span>/);
      if (p.lat == null) assert.match(html, /Not on the map: no coordinates listed/);
      if (p.heritage) assert.match(html, /<section class="heritage" id="heritage"/);
      if (p.status !== "open") assert.match(html, /Check before you go/);
      assert.doesNotMatch(html.replace(/<script[\s\S]*?<\/script>/g, ""), PLACEHOLDERS, p.id);
    }
    // events here: rows with the live-state attributes, next first, opening the event dialog
    const curtis = read(docs, "places/curtis-hixon-waterfront-park.html");
    assert.match(curtis, /id="whats-on-here"/);
    assert.match(curtis, /<li class="pl-ev" data-sheet="tampa" data-s="\d+" data-e="\d+"[^>]*>[\s\S]*?data-open-event="riverwalk-concert-2026-10-02"/);
    assert.match(curtis, /<span class="pl-ev-st" data-status><\/span>/);
    const dali = read(docs, "places/dali-museum.html");
    assert.match(dali, /data-run="2027-01-10"/, "a long run keeps its end for the live words");
    assert.match(dali, /Through Jan 10, 2027/);
    // a venue with nothing listed says so; nearby distances are labeled straight-line
    const arena = read(docs, "places/tropicana-field.html");
    assert.match(arena, /No events listed here between Sep 28 and Apr 30, 2027/);
    const aq = read(docs, "places/florida-aquarium.html");
    assert.match(aq, /id="nearby"/);
    assert.match(aq, /not walking or driving routes/);
    assert.match(aq, /<span class="sr-only">Straight-line distance: <\/span>\d/);
    // no basemap: the coordinate line and open-by-coordinates links, never a map that is not there
    assert.match(aq, /class="coord-line"/);
    assert.match(aq, /https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=27\.944,-82\.4453/);
    assert.doesNotMatch(aq, /map\.html\?focus=/, "no chart to point at without a basemap");
  } finally { cleanup(dir); }
});

test("with a basemap: the Map view, the Gulf beaches' chart with matching numbers, mini maps and 'On the chart'", () => {
  const { dir, docs, r } = buildWith({ basemap: true });
  try {
    assert.equal(r.status, 0, `build failed:\n${r.stderr}${r.stdout}`);
    const ttd = read(docs, "things-to-do.html");
    assert.match(ttd, /<button type="button" data-view="map" aria-pressed="false">/);
    const charts = JSON.parse(ttd.match(/data-charts="([^"]+)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
    assert.deepEqual(Object.keys(charts.bay).sort(), ["H", "W", "base", "bbox", "home", "k", "labels", "mPerUnit", "sx"]);
    assert.equal(charts.bay.base, "assets/map/basemap.svg#bm");
    assert.equal(charts.region, null, "no region chart in this map.json");
    assert.match(ttd, /OpenStreetMap contributors/, "the map credits OpenStreetMap (SPEC §7)");
    const out = read(docs, "outdoors.html");
    const chart = out.slice(out.indexOf('class="mini-map area-map xp-coast"'), out.indexOf("</figure>", out.indexOf("xp-coast")));
    assert.ok(chart.length > 0, "the Gulf beaches' chart renders");
    assert.deepEqual([...chart.matchAll(/class="xp-no xp-tick" data-n="(\d+)"/g)].map((m) => m[1]), ["1", "2"], "one number per beach on the chart, in list order");
    assert.equal((chart.match(/class="xp-dot"/g) || []).length, 2);
    const aq = read(docs, "places/florida-aquarium.html");
    assert.match(aq, /<div class="mini-map" role="img" aria-label="Map: The Florida Aquarium">/);
    assert.match(aq, /href="\.\.\/map\.html\?focus=place:florida-aquarium"/);
  } finally { cleanup(dir); }
});

test("site/js/features/explore.js exists, exports init and imports only ../lib", () => {
  const js = fs.readFileSync(path.join(REPO, "site", "js", "features", "explore.js"), "utf8");
  assert.match(js, /export function init\(app\)/);
  for (const m of js.matchAll(/from "([^"]+)"/g)) assert.match(m[1], /^\.\.\/lib\/[a-z]+\.js$/, m[1]);
  for (const f of ["55-explore.css", "74-place.css"]) {
    const css = fs.readFileSync(path.join(REPO, "site", "css", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, `${f}: tokens only`);
  }
});
