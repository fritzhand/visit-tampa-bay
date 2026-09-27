/* tests/history.test.mjs · OWNER: the History lane (history-and-passages)
   history.html (the timeline by era, the historic sites) and passages.html (data/routes.json), built from a throwaway
   copy of the repo with tests/fixtures/mini as data/ plus a few edits that reach every path: dated and undated
   entries, a timeline image with its credit, a site with no year built, a passage with an event stop and a stop with
   no coordinates, and a synthetic basemap (the course chart). The last tests read the real data/routes.json (skipped
   while data/ is the fixture). */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { copyRepo, build, read, write, json, editData, cleanup, fx, REPO } from "./helpers.mjs";
import { tlDate, yearText, isNHL, isNR } from "../build/pages/history.mjs";
import { routeFacts, distWords, walkWords, stopHref } from "../build/pages/passages.mjs";

/* ---------- pure helpers ---------- */
test("timeline dates print as precisely as the source gives them, never more", () => {
  assert.deepEqual(tlDate({ year: 1914, date: "1914-01-01", era: "boomtown" }), { year: "1914", day: "Jan 1", iso: "1914-01-01", approx: false });
  assert.deepEqual(tlDate({ year: 1539, date: "1539-05", era: "spanish" }), { year: "1539", day: "May", iso: "1539-05", approx: false });
  assert.deepEqual(tlDate({ year: 1821, date: "1821", era: "frontier" }), { year: "1821", day: "", iso: "1821", approx: false });
  // no date: the year is only a sort key, so the page says so
  assert.deepEqual(tlDate({ year: 1960, era: "postwar" }), { year: "1960", day: "", iso: "", approx: true });
  assert.equal(yearText(-500, "indigenous"), "500 BCE");
  assert.equal(yearText(900, "indigenous"), "900 CE");
  assert.equal(yearText(1886, "boomtown"), "1886");
  assert.ok(isNHL({ name: "National Historic Landmark" }) && isNHL({ name: "National Historic Landmark District" }));
  assert.ok(!isNHL({ name: "Contributing building, Ybor City Historic District (National Historic Landmark)" }), "a contributing building is not itself a landmark");
  assert.ok(isNR({ name: "National Register of Historic Places" }) && !isNR({ name: "National Register of Historic Places (Belleview-Biltmore Hotel; delisted 2017)" }));
});

test("distances are straight-line words; on-foot estimates only for short legs", () => {
  assert.equal(distWords(352), "350 m");
  assert.equal(distWords(4), "10 m");
  assert.equal(distWords(2575), "1.6 mi");
  assert.equal(walkWords({ lat: 27.95, lng: -82.46 }, { lat: 27.9509, lng: -82.46 }, 100), "about 2 min on foot");
  assert.equal(walkWords({ lat: 27.95, lng: -82.46 }, { lat: 28.0, lng: -82.46 }, 5560), "");
  assert.equal(stopHref({ kind: "experience", id: "x1" }), "experiences.html?x=x1#x-x1");
  assert.equal(stopHref({ kind: "event", id: "e1" }), "whats-on.html?e=e1#e-e1");
  const f = routeFacts({ stopsResolved: [
    { kind: "place", id: "a", rec: { ll: [27.95, -82.46] } },
    { kind: "place", id: "b", rec: { ll: null } },
    { kind: "place", id: "c", rec: { ll: [27.96, -82.46] } },
    { kind: "stay", id: "d", rec: { ll: [27.97, -82.46] } },
  ] });
  assert.equal(f.stops[0].next.d, null, "a leg to a stop without coordinates has no distance");
  assert.equal(f.stops[1].next.d, null);
  assert.ok(f.stops[2].next.d > 1000 && f.stops[2].next.d < 1200);
  assert.equal(f.stops[3].next, undefined, "no leg after the last stop");
  assert.equal(f.located.length, 3);
  assert.deepEqual(f.kinds, { place: 3, stay: 1 });
});

/* ---------- one fixture build for the page tests ---------- */
const lat0 = 27.85, k = Math.cos((lat0 * Math.PI) / 180), sx = 1000 / 0.7;
const MAP = { bbox: { core: { s: 27.5, n: 28.2, w: -82.9, e: -82.2 } }, projection: { lat0, k, sx, viewBox: [Math.round(0.7 * k * sx), 1000] }, labels: [{ text: "Hillsborough River", lat: 27.955, lng: -82.46, kind: "water" }], attribution: "Basemap: fixture attribution line" };
let dir, H, P, R;
const TL_IMG = "ybor-cigar-factory-1886";
before(() => {
  dir = copyRepo();
  editData("timeline", (a) => {
    a.find((t) => t.id === TL_IMG).date = "1886-04-13";
    a.find((t) => t.id === "narvaez-lands-1528").date = "1528-04";
  })(dir);
  editData("places", (a) => {
    const p = a.find((x) => x.id === "henry-b-plant-museum"); delete p.heritage.built;         // "Year built not listed"
    const s = a.find((x) => x.id === "sunken-gardens"); delete s.lat; delete s.lng; delete s.geo_source; delete s.hours_text;
  })(dir);
  editData("routes", (a) => {
    a.push({ id: "zz-history-lane-test", title: "A test passage", region: "stpete", lede: "Test lede.",
      stops: [{ kind: "place", id: "dali-museum", note: "First stop note." }, { kind: "event", id: "riverwalk-concert-2026-10-02" }, { kind: "place", id: "sunken-gardens" }, { kind: "stay", id: "the-vinoy" }],
      notes: "test route (tests/history.test.mjs)" });
  })(dir);
  write(dir, `site/img/t/${TL_IMG}.webp`, "RIFF-not-really-a-webp");
  write(dir, "data/images.json", JSON.stringify({ [`t/${TL_IMG}`]: { file: `img/t/${TL_IMG}.webp`, w: 640, h: 427, credit: "Test Creator / Wikimedia Commons (public domain)", license: "public-domain", page_url: "https://commons.wikimedia.org/wiki/File:Test.jpg", alt: "A test image" } }));
  write(dir, "data/map.json", JSON.stringify(MAP));
  write(dir, "site/map/basemap.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP.projection.viewBox.join(" ")}"><g id="bm"></g><g id="bm-grid"></g></svg>`);
  const r = build(dir);
  assert.equal(r.status, 0, r.stderr);
  H = read(dir, "docs/history.html");
  P = read(dir, "docs/passages.html");
  R = json(dir, "data/routes.json");
});
after(() => cleanup(dir));

const count = (s, re) => (s.match(re) || []).length;
const main = (s) => s.slice(s.indexOf("<main"), s.indexOf("</main>"));

test("history.html: one id=tl-<id> per timeline entry, inside its era, with its source and checked date", () => {
  const tl = fx("timeline");
  for (const t of tl) {
    assert.equal(count(H, new RegExp(`id="tl-${t.id}"`, "g")), 1, t.id);
    const sec = H.slice(H.indexOf(`id="era-${t.era}"`));
    assert.ok(sec.indexOf(`id="tl-${t.id}"`) > 0, `${t.id} is in #era-${t.era}`);
    assert.match(H, new RegExp(`id="tl-${t.id}" data-era="${t.era}"`));
  }
  for (const era of ["indigenous", "spanish", "frontier", "boomtown", "land-boom", "postwar", "modern"]) assert.match(H, new RegExp(`id="era-${era}"`), era);
  assert.equal(count(main(H), /<li class="tl-item/g), tl.length);
  assert.match(H, /Checked Sep 27, 2026/);
  assert.match(H, /<ol class="timeline hx-tl">/);
});

test("history.html: dates as given (a day, a month, a year alone, no exact date), era intros computed", () => {
  assert.match(H, /<time datetime="1886-04-13">1886<\/time><\/p><p class="hx-day">Apr 13<\/p>/);
  assert.match(H, /<time datetime="1528-04">1528<\/time><\/p><p class="hx-day">April<\/p>/);
  // entries with no date print their year and say there is no exact date (never a made-up day)
  const undated = H.slice(H.indexOf('id="tl-tampa-bay-hotel-opens-1891"'), H.indexOf("</li>", H.indexOf('id="tl-tampa-bay-hotel-opens-1891"')));
  assert.match(undated, />1891<\/p><p class="hx-day hx-approx">No exact date</);
  // the intro: the count and the first and last entries, linked; never prose we wrote about the era
  const boom = H.slice(H.indexOf('id="era-boomtown"'), H.indexOf('<ol class="timeline', H.indexOf('id="era-boomtown"')));
  assert.match(boom, /2 entries, from 1886 \(<a href="#tl-ybor-cigar-factory-1886">Cigar making begins in Ybor City<\/a>\) to about 1891 \(<a href="#tl-tampa-bay-hotel-opens-1891">/, "an undated last entry reads \"about\"");
  assert.match(boom, /No timeline entries|historic site/);
  assert.match(H, /No timeline entries for this era yet\./, "an era without entries says so");
  assert.match(H, /4 dated moments in the region&#39;s history, from 1528 to about 1925, and 3 historic places and hotels you can visit\./);
});

test("history.html: a timeline image shows with its full credit; entries without one show none", () => {
  const item = H.slice(H.indexOf(`id="tl-${TL_IMG}"`), H.indexOf("</li>", H.indexOf(`id="tl-${TL_IMG}"`)));
  assert.match(item, /<figure class="photo-fig hx-fig"><img [^>]*src="assets\/img\/t\/ybor-cigar-factory-1886\.webp"[^>]*alt="A test image" width="640" height="427"/);
  assert.match(item, /Test Creator \/ Wikimedia Commons \(public domain\)/);
  assert.match(item, /href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Test\.jpg" target="_blank" rel="noopener">Image page<span class="sr-only"> \(opens in a new tab\)<\/span>/);
  assert.equal(count(main(H), /<figure/g), 1, "only the entry with an image has a figure");
  assert.match(H, /1 entry shows a rights-cleared image/);
});

test("history.html: every historic place and hotel is listed once, designations as words, unknowns as unknowns", () => {
  const her = [...fx("places"), ...fx("stays")].filter((r) => r.heritage);
  for (const r of her) {
    assert.equal(count(H, new RegExp(`id="hs-${r.id}"`, "g")), 1, r.id);
    const folder = fx("stays").some((s) => s.id === r.id) ? "stays" : "places";
    assert.match(H, new RegExp(`<p class="hs-name"><a href="${folder}/${r.id}\\.html">`), r.id);
  }
  assert.match(H, /<li class="is-nhl">National Historic Landmark \(1976\)<\/li>/);
  assert.match(H, /<li>National Register of Historic Places \(1978\)<\/li>/);
  assert.match(H, /<span class="unk">Year built not listed<\/span>/);
  assert.match(H, /class="hs-item is-stay" id="hs-the-vinoy"/);
  // the National Historic Landmarks as cards, with a star
  assert.match(H, /The 1 National Historic Landmark in this guide/);
  assert.match(H, /<article class="card hx-lm" data-sheet="tampa">[\s\S]*?Henry B\. Plant Museum[\s\S]*?data-star="henry-b-plant-museum" data-star-kind="p"/);
  assert.match(H, /href="map\.html\?layers=heritage"/);
  assert.doesNotMatch(main(H), /\bTBA\b|\bTBD\b|N\/A|\bundefined\b|\bnull\b|NaN/);
});

test("history.html: the filter covers the timeline and the sites (era, sheet, text) and every deep link is valid", () => {
  assert.match(H, /<div data-filter-list data-filter-items="\.tl-item, \.hs-item">/);
  for (const era of ["indigenous", "spanish", "frontier", "boomtown", "land-boom", "postwar", "modern"]) assert.match(H, new RegExp(`data-filter-chip="era=${era}"`));
  assert.match(H, /data-filter-chip="r=tampa"/);
  assert.match(H, /<input type="search" name="q"[^>]*data-filter-q>/);
  assert.match(H, /href="history\.html\?era=boomtown#sites"/);
  assert.match(H, /data-hx-count="all"[^>]*>4 entries · 3 historic sites</);
  assert.match(H, /data-features="history"/);
  // every era section and sheet group hides when the filter empties it
  assert.equal(count(H, /class="section hx-era"[^>]*data-filter-group/g), 7);
});

test("passages.html: one id=r-<id> per route, its stops numbered and linked by kind, star-all lists every stop", () => {
  for (const rt of R) {
    assert.equal(count(P, new RegExp(`id="r-${rt.id}"`, "g")), 1, rt.id);
    const sec = P.slice(P.indexOf(`id="r-${rt.id}"`), P.indexOf("</section>", P.indexOf(`id="r-${rt.id}"`)));
    assert.equal(count(sec, /<li class="rt-stop"/g), rt.stops.length, `${rt.id}: one numbered stop each`);
    const star = JSON.parse(sec.match(/data-star-all="([^"]+)"/)[1].replace(/&quot;/g, '"'));
    assert.deepEqual(star, rt.stops.map((s) => [{ place: "p", stay: "s", experience: "x", event: "e" }[s.kind], s.id]));
  }
  const t = P.slice(P.indexOf('id="r-zz-history-lane-test"'), P.indexOf("</section>", P.indexOf('id="r-zz-history-lane-test"')));
  assert.match(t, /<a href="places\/dali-museum\.html">The Dal/);
  assert.match(t, /<a href="whats-on\.html\?e=riverwalk-concert-2026-10-02#e-riverwalk-concert-2026-10-02" data-open-event="riverwalk-concert-2026-10-02">/);
  assert.match(t, /<a href="stays\/the-vinoy\.html">/);
  const f = P.slice(P.indexOf('id="r-downtown-tampa-waterfront"'), P.indexOf("</section>", P.indexOf('id="r-downtown-tampa-waterfront"')));
  assert.match(f, /<a href="experiences\.html\?x=pirate-water-taxi#x-pirate-water-taxi" data-open-experience="pirate-water-taxi">/);
  assert.match(t, /<p class="rt-note">First stop note\.<\/p>/);
  // the event's time as its record gives it (a start and an end), never more
  assert.match(t, /<dt>When<\/dt><dd>Fri, Oct 2 · 6:00–9:00 PM<\/dd>/);
});

test("passages.html: straight-line legs say so, unknowns print as unknowns, and nothing claims hours it lacks", () => {
  const t = P.slice(P.indexOf('id="r-zz-history-lane-test"'), P.indexOf("</section>", P.indexOf('id="r-zz-history-lane-test"')));
  assert.match(t, /To stop 2, Riverwalk Evening Concert: <b>[\d.]+ (m|mi)<\/b> in a straight line/);
  // an event's status words come from the event's statuses: a scheduled one has none (never the word "scheduled")
  assert.doesNotMatch(t, />scheduled</i);
  assert.match(t, /<span class="rt-est">\(estimate\)<\/span>/);
  assert.match(t, /To stop 3: <span class="unk">distance not known, no coordinates listed<\/span>/);
  assert.match(t, /<span class="unk">Not on the map: no coordinates listed<\/span>/);
  assert.match(t, /<dt>Hours<\/dt><dd><span class="unk">Hours not listed<\/span><\/dd>/);
  assert.equal(count(t, /class="rt-leg"/g), 3, "a leg between each pair of stops, none after the last");
  assert.match(P, /distances between stops are straight-line estimates/);
  assert.doesNotMatch(main(P), /\bTBA\b|\bTBD\b|N\/A|\bundefined\b|\bnull\b|NaN/);
});

test("passages.html: the chart has a numbered marker per stop and a course line through the located stops", () => {
  const t = P.slice(P.indexOf('id="r-zz-history-lane-test"'), P.indexOf("</section>", P.indexOf('id="r-zz-history-lane-test"')));
  const m = t.match(/<polyline class="rt-course" points="([^"]+)"/);
  assert.ok(m, "a course line");
  assert.equal(m[1].split(" ").length, 3, "through the three stops with coordinates, in list order");
  assert.match(t, /class="mini-map chart-map rt-chart" data-chart="bay"[^>]*role="img" aria-label="Chart of this passage: 3 numbered stops \(1 not on the map\)/);
  assert.match(t, /<use href="assets\/map\/basemap\.svg#bm"\/><use href="assets\/map\/basemap\.svg#bm-grid"\/>/);
  const marks = [...t.matchAll(/class="pin pin-course[^"]*"[^>]*><span>([^<]+)<\/span>/g)].map((x) => x[1]).join(", ");
  assert.deepEqual(marks.split(/, |–/).map(Number).sort((a, b) => a - b).filter((n, i, a) => a.indexOf(n) === i).length >= 2, true);
  assert.ok(/\b1\b/.test(marks) && /\b4\b/.test(marks), `markers name the stops: ${marks}`);
});

test("search: timeline entries and passages point at their anchors", () => {
  const s = json(dir, "docs/assets/data/search.json").items;
  const tl = s.find((x) => x.k === "tl" && x.id === TL_IMG);
  assert.equal(tl.u, `history.html#tl-${TL_IMG}`);
  assert.match(tl.s, /^Apr 13, 1886 · Boomtown$/);
  const rt = s.find((x) => x.k === "pg" && x.id === "route-zz-history-lane-test");
  assert.equal(rt.u, "passages.html#r-zz-history-lane-test");
  assert.match(rt.s, /4 stops/);
});

/* ---------- the real data/routes.json (skipped while data/ is the fixture) ---------- */
const DATA = path.join(REPO, "data");
const load = (f) => JSON.parse(fs.readFileSync(path.join(DATA, `${f}.json`), "utf8"));
const merged = () => !load("places").every((p) => /FIXTURE/.test(p.notes || ""));

test("data/routes.json: 10–14 passages built only from records that exist, at least two stops each", { skip: !merged() && "data/ is the fixture" }, () => {
  const routes = load("routes");
  assert.ok(routes.length >= 10 && routes.length <= 14, `${routes.length} passages`);
  const col = { place: load("places"), stay: load("stays"), experience: load("experiences"), event: load("events") };
  const ids = new Set();
  for (const rt of routes) {
    assert.ok(!ids.has(rt.id), `unique id ${rt.id}`); ids.add(rt.id);
    assert.match(rt.id, /^[a-z0-9][a-z0-9-]*$/);
    assert.ok(["tampa", "stpete", "beaches", "clearwater", "around", "daytrips"].includes(rt.region), rt.id);
    assert.ok(rt.stops.length >= 2, rt.id);
    const sentences = rt.lede ? rt.lede.replace(/\b(St|Dr|Jr|Mr|Mrs|Mt|Ft|No|Ave|Blvd)\./g, "$1").split(/(?<=[.!?])\s+(?=[A-Z])/).length : 0;
    assert.ok(sentences >= 1 && sentences <= 2, `${rt.id}: a lede of one or two sentences (${sentences})`);
    for (const s of rt.stops) assert.ok(col[s.kind] && col[s.kind].some((r) => r.id === s.id), `${rt.id}: ${s.kind} ${s.id} exists`);
  }
});

test("data/routes.json: a note never states a time, a price or a year its stop's record does not hold", { skip: !merged() && "data/ is the fixture" }, () => {
  const col = { place: load("places"), stay: load("stays"), experience: load("experiences"), event: load("events") };
  const TIME = /\b\d{1,2}(?::\d{2})?\s?(?:a\.m\.|p\.m\.|AM|PM|am|pm)\b/g, MONEY = /\$\s?\d[\d,.]*/g, YEAR = /\b1[5-9]\d\d\b|\b20[0-2]\d\b/g, NUM = /\b\d[\d,.]*\b/g;
  for (const rt of load("routes")) for (const s of rt.stops) {
    if (!s.note) continue;
    const rec = JSON.stringify(col[s.kind].find((r) => r.id === s.id));
    for (const re of [TIME, MONEY, YEAR, NUM]) for (const m of s.note.match(re) || []) {
      const bare = m.replace(/,/g, "").replace(/\.$/, "");
      assert.ok(rec.includes(m) || rec.includes(bare), `${rt.id} → ${s.id}: the note says "${m}", which its record does not`);
    }
  }
});
