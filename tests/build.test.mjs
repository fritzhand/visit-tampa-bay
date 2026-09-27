/* ============================================================
   tests/build.test.mjs · OWNER: E1 (build engine; ported from Cincy Week's QS port).
   Every test builds in a throwaway copy of the repo (build.mjs, build/,
   site/, site.config.json) with tests/fixtures/mini as data/, so the real
   docs/ and the moving real data are never touched. Helpers: tests/helpers.mjs
   (page lanes add tests/<lane>.test.mjs with them; see build/CONTRACTS.md §10).
   Run: npm test   (node --test tests/*.test.mjs)
   ============================================================ */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPO, CONFIG, fx, copyRepo, build, read, write, cleanup, json, editData, edit, extraPage, hashTree } from "./helpers.mjs";

const { NAV_SLUGS } = await import(path.join(REPO, "build", "nav.mjs"));
const { AREA_IDS } = await import(path.join(REPO, "build", "core", "vocab.mjs"));
const { code } = await import(path.join(REPO, "site", "js", "lib", "share.js"));

test("the fixture builds: every page, asset, link, index entry and card contract", () => {
  const dir = copyRepo();
  try {
    const r = build(dir);
    assert.equal(r.status, 0, `build failed:\n${r.stderr}${r.stdout}`);
    assert.match(r.stdout, /✓ built \d+ pages → docs\//);
    const docs = path.join(dir, "docs");
    assert.ok(!fs.existsSync(path.join(dir, "docs.tmp")), "docs.tmp/ is cleaned up");
    const places = fx("places"), stays = fx("stays"), events = fx("events"), exps = fx("experiences"), series = fx("series"), faqs = fx("faqs"), timeline = fx("timeline"), transport = fx("transport"), routes = fx("routes");
    for (const s of NAV_SLUGS) assert.ok(fs.existsSync(path.join(docs, `${s}.html`)), `missing docs/${s}.html`);
    for (const p of places) assert.ok(fs.existsSync(path.join(docs, "places", `${p.id}.html`)), `missing places/${p.id}.html`);
    for (const s of stays) assert.ok(fs.existsSync(path.join(docs, "stays", `${s.id}.html`)), `missing stays/${s.id}.html`);
    for (const a of AREA_IDS) assert.ok(fs.existsSync(path.join(docs, "areas", `${a}.html`)), `missing areas/${a}.html (every fixed area has a page)`);
    for (const f of ["404.html", "sitemap.xml", "robots.txt", ".nojekyll", "assets/tokens.css", "assets/site.css", "assets/fonts/newsreader-roman-latin.woff2",
      "assets/data/search.json", "assets/data/events.json", "assets/data/event-text.json", "assets/data/experiences.json", "assets/data/places-lite.json", "assets/data/stays-lite.json"]) {
      assert.ok(fs.existsSync(path.join(docs, f)), `missing docs/${f}`);
    }
    if (fs.existsSync(path.join(REPO, "site", "js", "main.js"))) assert.ok(fs.existsSync(path.join(docs, "assets/js/main.js")), "main.js is copied when it exists");
    assert.match(read(docs, "assets/tokens.css"), /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme\]\)/, "the no-JS dark block ships with tokens.css");

    // search index: one entry per record of every kind, and every nav page reachable
    const idx = json(docs, "assets/data/search.json");
    assert.equal(idx.v, 1);
    const have = (k, id) => idx.items.some((e) => e.k === k && e.id === id);
    for (const [k, list] of [["pl", places], ["st", stays], ["ev", events], ["ex", exps], ["se", series], ["fq", faqs], ["tl", timeline], ["tr", transport]]) for (const x of list) assert.ok(have(k, x.id), `search: ${k} ${x.id}`);
    for (const a of AREA_IDS) assert.ok(have("ar", a), `search: area ${a}`);
    for (const rt of routes) assert.ok(have("pg", `route-${rt.id}`), `search: route ${rt.id}`);
    for (const s of NAV_SLUGS) assert.ok(idx.items.some((e) => e.u === `${s}.html`), `search: page ${s}`);
    assert.ok(idx.items.find((e) => e.k === "ev" && e.id === "riverwalk-concert-2026-10-02").st > 0, "timed events carry st/en");
    assert.ok(!("st" in idx.items.find((e) => e.k === "ev" && e.id === "dali-fixture-exhibition-2026")), "a long run carries no st (never 'happening now')");

    // sitemap: every indexable page, index maps to siteBase
    const sitemap = read(docs, "sitemap.xml");
    assert.equal((sitemap.match(/<loc>/g) || []).length, NAV_SLUGS.length + places.length + stays.length + AREA_IDS.length);
    assert.ok(sitemap.includes(`<loc>${CONFIG.siteBase}</loc>`));

    // 404: every link absolute
    const nf = read(docs, "404.html");
    const rel = [...nf.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|mailto:|#)/.test(u));
    assert.ok(rel.length > 10);
    for (const u of rel) assert.ok(u.startsWith(CONFIG.pathPrefix), `404.html link not absolute: ${u}`);
    assert.match(nf, /<meta name="robots" content="noindex">/);

    // every nav page: title, canonical, aria-current, exactly one h1, the boot script before CSS, the footer's lines
    for (const s of NAV_SLUGS) {
      const html = read(docs, `${s}.html`);
      assert.match(html, /<title>[^<]+ · Tampa Bay Chartbook<\/title>|<title>Tampa Bay Chartbook · /, `${s}: title`);
      assert.match(html, /<link rel="canonical" href="https:\/\//, `${s}: canonical`);
      assert.match(html.split('<nav class="sidebar"')[1].split("</nav>")[0], /aria-current="page"/, `${s}: active nav item`);
      assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${s}: one h1`);
      assert.ok(html.indexOf("tbc-theme") < html.indexOf("assets/tokens.css"), `${s}: boot before CSS`);
      assert.match(html, /<html lang="en" class="no-js"/);
      assert.ok(html.includes("Independent guide. Not affiliated with any tourism office, venue or operator."), `${s}: the independence line`);
      assert.ok(html.includes("Every entry links to its source."), `${s}: the sources line`);
      for (const rid of ["tampa", "stpete", "beaches", "clearwater", "around", "daytrips"]) assert.ok(html.includes(`<symbol id="b-${rid}"`), `${s}: sheet mark ${rid}`);
    }
    assert.match(read(docs, "tampa.html"), /aria-current="page"[^>]*data-sheet="tampa"|data-sheet="tampa"[^>]*aria-current="page"/, "the sheet item is current on its page");
    assert.match(read(docs, "places/florida-aquarium.html"), /<a class="nav-link" href="\.\.\/things-to-do\.html" aria-current="page">/, "a detail page marks its parent");
    assert.match(read(docs, "places/columbia-restaurant-ybor-city.html"), /href="\.\.\/eat-drink\.html" aria-current="page"/, "a restaurant's page sits under Eat & drink");

    // the event card contract, on What's On
    const on = read(docs, "whats-on.html");
    for (const e of events) {
      const card = on.match(new RegExp(`<article class="ev" id="e-${e.id}"[^>]*>`));
      assert.ok(card, `whats-on: card e-${e.id}`);
      for (const a of ["data-ev", "data-sheet", "data-r", "data-a", "data-k", "data-kg", "data-day", "data-month", "data-s", "data-e", "data-t", "data-free", "data-q"]) assert.match(card[0], new RegExp(`\\s${a}="`), `card ${e.id}: ${a}`);
      assert.ok(on.includes(`href="whats-on.html?e=${e.id}#e-${e.id}" data-open-event="${e.id}"`), `card ${e.id}: deep link`);
      assert.ok(on.includes(`data-star="${e.id}" data-star-kind="e"`), `card ${e.id}: star`);
    }
    assert.match(on.match(/<article class="ev" id="e-dali-fixture-exhibition-2026"[^>]*>/)[0], /data-run="2027-01-10"/, "a long run is flagged with its last day");
    assert.match(on.match(/<article class="ev" id="e-riverwalk-boat-parade-2026-12-12"[^>]*>/)[0], /data-cancelled="1"/, "a cancelled event is flagged");
    assert.match(on, /Through Jan 10, 2027/, "a long run says Through <date>");
    for (const s of series) assert.ok(on.includes(`id="s-${s.id}"`), `whats-on: series anchor s-${s.id}`);
    // the experience card contract
    const xp = read(docs, "experiences.html");
    for (const x of exps) {
      assert.ok(xp.includes(`href="experiences.html?x=${x.id}#x-${x.id}" data-open-experience="${x.id}"`), `experience ${x.id}: deep link`);
      assert.match(xp, new RegExp(`<article class="card exp" id="x-${x.id}" data-x="${x.id}"`), `experience ${x.id}: card`);
      assert.ok(xp.includes(`data-star="${x.id}" data-star-kind="x"`), `experience ${x.id}: star`);
    }
    assert.ok(read(docs, "places/tampa-theatre.html").includes('data-star="tampa-theatre" data-star-kind="p"'), "place pages carry a place star");
    assert.ok(read(docs, "stays/hotel-haya.html").includes('data-star="hotel-haya" data-star-kind="s"'), "stay pages carry a stay star");
    assert.match(read(docs, "places/tampa-theatre.html"), /id="heritage"/, "a heritage block renders");
    assert.match(read(docs, "places/tampa-theatre.html"), /class="coord-line"/, "no basemap: a coordinate line, never a failure");

    // client JSON
    const ej = json(docs, "assets/data/events.json");
    assert.deepEqual(ej.events.map((e) => e.id).sort(), events.map((e) => e.id).sort());
    for (const e of ej.events) assert.ok(e.i.length && e.i.every(([d, s, en]) => /^\d{4}-\d\d-\d\d$/.test(d) && en > s), `events.json ${e.id}: instances`);
    const byId = Object.fromEntries(ej.events.map((e) => [e.id, e]));
    assert.equal(byId["florida-state-fair-2027"].i.length, 12, "a 12-day fair expands per day");
    assert.equal(byId["saturday-morning-market-2026-10"].i.length, 3, "occurrences expand per occurrence");
    assert.equal(byId["dali-fixture-exhibition-2026"].i.length, 1, "a long run is one instance");
    assert.equal(byId["dali-fixture-exhibition-2026"].i[0][3] & 32, 32, "…flagged run (32)");
    assert.equal(byId["lightning-home-game-2026-10-10"].pl, "benchmark-international-arena", "location_text resolved to a place through its alias");
    assert.equal(byId["guavaween-2026"].r, "tampa", "region from the area");
    for (const e of ej.events) assert.equal(e.x, code(e.id), "share codes");
    assert.equal(json(docs, "assets/data/experiences.json").experiences.length, exps.length);
    assert.equal(json(docs, "assets/data/places-lite.json").places.length, places.length);
    assert.equal(json(docs, "assets/data/stays-lite.json").stays.length, stays.length);
    assert.equal(json(docs, "assets/data/event-text.json").d["riverwalk-concert-2026-10-02"], events.find((e) => e.id === "riverwalk-concert-2026-10-02").description);

    // no inline color anywhere in the output, and no color literal in site.css
    for (const f of ["index.html", "whats-on.html", "things-to-do.html"]) assert.doesNotMatch(read(docs, f).replace(/<meta name="theme-color"[^>]*>/g, ""), /style="[^"]*#[0-9a-f]{3,8}/i);
    assert.doesNotMatch(read(docs, "assets/site.css").replace(/\/\*[\s\S]*?\*\//g, ""), /:\s*[^;{}]*#[0-9a-f]{3,8}\b/i);
  } finally { cleanup(dir); }
});

test("building twice gives byte-identical output", () => {
  const dir = copyRepo();
  try {
    assert.equal(build(dir).status, 0);
    const a = hashTree(path.join(dir, "docs"));
    assert.equal(build(dir).status, 0);
    assert.equal(hashTree(path.join(dir, "docs")), a);
  } finally { cleanup(dir); }
});

test("a failed build leaves the previous docs/ untouched", () => {
  const dir = copyRepo();
  try {
    assert.equal(build(dir).status, 0);
    const before = hashTree(path.join(dir, "docs"));
    editData("events", (a) => { a[0].place = "nowhere"; })(dir);
    const r = build(dir);
    assert.notEqual(r.status, 0);
    assert.equal(hashTree(path.join(dir, "docs")), before);
    assert.ok(!fs.existsSync(path.join(dir, "docs.tmp")));
  } finally { cleanup(dir); }
});

test("an event may end after midnight, by 06:00", () => {
  const dir = copyRepo();
  try {
    editData("events", (a) => { const e = a.find((x) => x.id === "guavaween-2026"); e.start = "21:00"; e.end = "02:00"; })(dir);
    const r = build(dir);
    assert.equal(r.status, 0, r.stderr);
  } finally { cleanup(dir); }
});

test("a missing map.json, basemap, main.js, favicon or og image never fails the build", () => {
  const dir = copyRepo();
  try {
    for (const f of ["site/map", "site/js/main.js", "site/favicon.svg", "data/map.json"]) fs.rmSync(path.join(dir, f), { recursive: true, force: true });
    const r = build(dir);
    assert.equal(r.status, 0, r.stderr);
    const html = read(dir, "docs/index.html");
    assert.doesNotMatch(html, /assets\/js\/main\.js/, "no script tag for a missing main.js");
    assert.doesNotMatch(html, /favicon\.svg/, "no icon link for a missing favicon");
  } finally { cleanup(dir); }
});

test("TBC_OUT builds into a private directory and never touches docs/", () => {
  const dir = copyRepo();
  try {
    const r = build(dir, { TBC_OUT: ".cache/out-test" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /→ \.cache\/out-test\//);
    for (const f of ["index.html", "whats-on.html", "assets/site.css", "assets/data/search.json"]) assert.ok(fs.existsSync(path.join(dir, ".cache/out-test", f)), `missing ${f}`);
    assert.ok(!fs.existsSync(path.join(dir, "docs")), "docs/ must not be written");
    assert.ok(!fs.existsSync(path.join(dir, ".cache/out-test.tmp")), "the temp dir is cleaned up");
    const bad = build(dir, { TBC_OUT: "site" });
    assert.notEqual(bad.status, 0, "TBC_OUT=site must be refused");
    assert.ok(fs.existsSync(path.join(dir, "site/css/tokens.css")), "sources untouched");
  } finally { cleanup(dir); }
});

test("the real data/ builds", { skip: !fs.existsSync(path.join(REPO, "data", "places.json")) && "data/ is empty" }, () => {
  const dir = copyRepo({ data: path.join(REPO, "data") });
  try {
    const r = build(dir);
    assert.equal(r.status, 0, `real data failed:\n${r.stderr}`);
  } finally { cleanup(dir); }
});

/** Two ids with the same 5-character share code (found by brute force, so the collision test needs no fixture). */
function collidingIds() {
  const seen = new Map();
  for (let i = 0; ; i++) { const id = `zz-collide-${i}`, c = code(id); if (seen.has(c)) return [seen.get(c), id]; seen.set(c, id); }
}

const ev0 = (fn) => editData("events", (a) => fn(a[0], a));
const pl0 = (fn) => editData("places", (a) => fn(a[0], a));
const BROKEN = [
  ["an unknown key (typo)", ev0((e) => { e.placeid = e.place; }), `unknown key "placeid"`],
  ["a bad area", pl0((p) => { p.area = "downtown-tampa-typo"; }), `area: must be one of`],
  ["an area record in the wrong region", editData("areas", (a) => { a[0].region = "stpete"; }), `is not the region of area "downtown-tampa"`],
  ["an http:// URL", ev0((e) => { e.source_url = "http://www.tampa.gov/"; }), "insecure link"],
  ["a placeholder string", pl0((p) => { p.hours_text = "Varies"; }), "is a placeholder"],
  ["a TBA inside a title", ev0((e) => { e.title = "Headliner TBA"; }), `contains the placeholder "TBA"`],
  ["a dangling place ref", ev0((e) => { e.place = "nowhere-hall"; }), `unknown place (data/places.json id) "nowhere-hall"`],
  ["a dangling departure place", editData("experiences", (a) => { a[0].departs_place = "no-such-dock"; }), `unknown place (data/places.json id) "no-such-dock"`],
  ["a dangling series", ev0((e) => { e.series = "no-such-series"; }), `unknown series (data/series.json id) "no-such-series"`],
  ["a dangling timeline place", editData("timeline", (a) => { a[1].places = ["no-such-place"]; }), `unknown place "no-such-place"`],
  ["a dangling route stop", editData("routes", (a) => { a[0].stops[0].id = "no-such-stop"; }), `unknown place "no-such-stop"`],
  ["a date outside the data window", ev0((e) => { e.date = "2027-06-01"; }), "outside the data window"],
  ["an end_date before the date", ev0((e) => { e.end_date = "2026-09-30"; }), "end_date: is before date"],
  ["an event with neither place nor location_text", ev0((e) => { e.place = null; e.location_text = null; }), "give a place (a places.json id) or a location_text"],
  ["an end before its start (not after midnight)", ev0((e) => { e.start = "10:00"; e.end = "09:00"; }), "suspicious times"],
  ["a duplicate id across files", editData("stays", (a) => { a[0].id = "tampa-theatre"; }), `id "tampa-theatre" is also a places.json id`],
  ["a duplicate id in one file", pl0((p, a) => { a.push({ ...p }); }), `duplicate id "tampa-theatre"`],
  ["a share-code collision", (dir) => { const [a, b] = collidingIds(); editData("places", (arr) => { arr.push({ ...arr[0], id: a, name: "Collide A" }, { ...arr[0], id: b, name: "Collide B" }); })(dir); }, "share code collision"],
  ["a missing source_url", pl0((p) => { delete p.source_url; }), "source_url: is required"],
  ["coordinates outside the box", pl0((p) => { p.lat = 39.1; }), "outside the Tampa Bay box"],
  ["coordinates without geo_source", pl0((p) => { delete p.geo_source; }), "geo_source: is required when lat/lng are set"],
  ["a closed place without a status note", pl0((p) => { p.status = "closed"; delete p.status_note; }), "status_note: is required when status is closed"],
  ["&amp; in a summary", pl0((p) => { p.summary = "Films &amp; tours."; }), "is plain text"],
  ["invalid JSON", (dir) => write(dir, "data/stays.json", "[{,"), "invalid JSON"],
  ["a wrong-typed list (no crash, a message)", pl0((p) => { p.topics = "arts"; }), "topics: must be an array"],
  ["a missing sheet token", edit("site/css/tokens.css", (s) => s.replace(/--sheet-beaches-tint:[^;]+;/g, "")), "--sheet-beaches-tint is missing"],
  ["a color literal in a partial", edit("site/css/40-events.css", (s) => `${s}\n.zz { color: #ff0000; }\n`), "color literal"],
  ["a font size under 12px", edit("site/css/40-events.css", (s) => `${s}\n.zz { font-size: 10px; }\n`), "under the 12px floor"],
  ["an orphan page module", (dir) => write(dir, "build/pages/zz-orphan.mjs", `export function pages() { return [{ path: "orphan.html", title: "O", description: "O.", body: () => "<h1>O</h1>" }]; }\n`), "orphan page"],
  ["a nav page with no producer", (dir) => fs.rmSync(path.join(dir, "build/pages/faq.mjs")), "nav page faq.html is not produced"],
  ["a place without its page", (dir) => fs.rmSync(path.join(dir, "build/pages/places.mjs")), "places/tampa-theatre.html is not produced"],
  ["a broken internal link", extraPage("<h1>X</h1><a href=\"../nope.html\">x</a>"), "broken link ../nope.html"],
  ["a broken anchor", extraPage("<h1>X</h1><a href=\"../about.html#no-such-id\">x</a>"), `no id "no-such-id"`],
  ["an unknown query parameter", extraPage("<h1>X</h1><a href=\"../whats-on.html?zz=1\">x</a>"), `unknown parameter "zz"`],
  ["a deep link naming nothing (?r=nope)", extraPage("<h1>X</h1><a href=\"../things-to-do.html?r=nope\">x</a>"), `bad value "nope" for "r"`],
  ["a deep link to an unknown event (?e=)", extraPage("<h1>X</h1><a href=\"../whats-on.html?e=no-such-event\">x</a>"), `bad value "no-such-event" for "e"`],
  ["a map focus naming nothing", extraPage("<h1>X</h1><a href=\"../map.html?focus=place:nope\">x</a>"), `bad value "place:nope" for "focus"`],
  ["href=\"#\"", extraPage("<h1>X</h1><a href=\"#\">x</a>"), `href="#"`],
  ["an external link without a new-tab note", extraPage("<h1>X</h1><a href=\"https://example.com/\">x</a>"), "needs target"],
  ["two h1 elements", extraPage("<h1>X</h1><h1>Y</h1>"), "has 2 <h1> elements"],
  ["an img without alt", extraPage("<h1>X</h1><img src=\"../assets/tokens.css\" width=\"1\" height=\"1\">"), "needs alt"],
  ["a color in a style attribute", extraPage("<h1>X</h1><p style=\"color: #c00\">x</p>"), "color literal in style"],
  ["an unknown feature module", extraPage("<h1>X</h1>", `features: ["nope"]`), "has no site/js/features/nope.js"],
  ["a broken srcset", extraPage("<h1>X</h1><img src=\"../assets/tokens.css\" srcset=\"../assets/img/p/nope-960.webp 960w\" alt=\"\" width=\"1\" height=\"1\">"), "broken link ../assets/img/p/nope-960.webp"],
  ["a font url() that does not resolve", edit("site/css/tokens.css", (s) => s.replace(/url\((['"]?)fonts\/public-sans-roman-latin\.woff2/, "url($1fonts/nope.woff2")), "does not resolve"],
  ["a search entry that does not resolve", (dir) => write(dir, "build/pages/zz-search.mjs", `export function pages() { return []; }\nexport function search() { return [{ k: "pg", id: "zz", t: "ZZ", u: "zz-nowhere.html" }]; }\n`), "assets/data/search.json"],
  ["an image manifest entry without its file", (dir) => write(dir, "data/images.json", JSON.stringify({ "p/tampa-theatre": { file: "img/p/tampa-theatre.webp", w: 640, h: 427, credit: "X / Wikimedia Commons (CC BY 4.0)", license: "cc-by" } })), "site/img/p/tampa-theatre.webp does not exist"],
];

for (const [name, mutate, expected] of BROKEN) {
  test(`fails loudly on ${name}`, () => {
    const dir = copyRepo();
    try {
      mutate(dir);
      const r = build(dir);
      assert.notEqual(r.status, 0, `expected the build to fail on ${name}`);
      assert.ok(r.stderr.includes(expected), `stderr should mention ${JSON.stringify(expected)}:\n${r.stderr}`);
      assert.ok(!fs.existsSync(path.join(dir, "docs")), "a failed build must not write docs/");
      assert.ok(!fs.existsSync(path.join(dir, "docs.tmp")), "a failed build cleans up docs.tmp/");
    } finally { cleanup(dir); }
  });
}
