/* ============================================================
   tests/whats-on.test.mjs · OWNER: the What's On lane
   What's On (build/pages/whats-on.mjs, the lean card in build/components/event-card.mjs) and My Trip's page
   (build/pages/trip.mjs), built from tests/fixtures/mini, plus the feature's pure helpers
   (site/js/features/whats-on.js: dateTests, overlaps).
   Contracts: one card id="e-<id>" per event (cancelled included, with the word), filed under its first listing day;
   later days of multi-day events as rows under their day; long runs once in #runs ("Until" + "Through …"); one
   element id="s-<id>" per series, when_text quoted; counts computed from the data; unknowns printed as unknowns;
   no inline SVG in the lean cards; filter values that name something; the map data file.
   ============================================================ */
import test from "node:test";
import assert from "node:assert/strict";
import { copyRepo, build, read, json, editData, cleanup, fx } from "./helpers.mjs";
import { itemOf } from "../site/js/lib/facets.js";
import { nyToEpoch } from "../site/js/lib/time.js";
import { EVENT_KINDS, EVENT_GROUP_LABEL } from "../build/core/vocab.mjs";
import { dateTests, overlaps } from "../site/js/features/whats-on.js";

const events = fx("events"), series = fx("series");
const card = (html, id) => { const m = html.match(new RegExp(`<article class="ev" id="e-${id}"[\\s\\S]*?</article>`)); return m ? m[0] : null; };
/** A month section's HTML (it holds day sections, so it runs to the next month, or to the annual calendar). */
const monthOf = (html, key) => { const i = html.indexOf(`id="m-${key}"`); assert.ok(i > 0, `#m-${key}`); const ends = [html.indexOf('<section class="wo-month"', i + 1), html.indexOf('id="annual"', i), html.indexOf("</main>", i)].filter((x) => x > 0); return html.slice(i, Math.min(...ends)); };
const section = (html, id) => { const i = html.indexOf(`id="${id}"`); assert.ok(i > 0, `#${id} exists`); const s = html.lastIndexOf("<section", i); const e = html.indexOf("</section>", i); return html.slice(s, e); };

let dir, wo, trip;
test.before(() => {
  dir = copyRepo();
  const r = build(dir);
  assert.equal(r.status, 0, r.stderr);
  wo = read(dir, "docs/whats-on.html");
  trip = read(dir, "docs/trip.html");
});
test.after(() => cleanup(dir));

test("every event has exactly one lean card, cancelled ones included, with no inline SVG and no description", () => {
  for (const e of events) {
    const c = card(wo, e.id);
    assert.ok(c, `card e-${e.id}`);
    assert.equal(wo.split(`id="e-${e.id}"`).length, 2, `one card for ${e.id}`);
    assert.doesNotMatch(c, /<svg/, `${e.id}: no inline SVG in a lean card`);
    assert.doesNotMatch(c, /<details|ev-desc|<blockquote/, `${e.id}: descriptions live in the dialog`);
    assert.match(c, /<div class="datebox[^"]*" aria-hidden="true">/, `${e.id}: date box`);
    assert.match(c, /<button class="star" type="button" data-star="[^"]+" data-star-kind="e" aria-label="Add “[^"]+” to My Trip"><\/button>/, `${e.id}: the star`);
    assert.match(c, /<p class="ev-src">Source: /, `${e.id}: the source is named`);
    if (e.description) assert.ok(!c.includes(e.description.slice(0, 40)), `${e.id}: no description on the card`);
  }
  const dead = card(wo, "riverwalk-boat-parade-2026-12-12");
  assert.match(dead, /data-cancelled="1"/);
  assert.match(dead, /<span class="badge badge-warn">Cancelled<\/span>/, "a cancelled event says so");
});

test("cards sit under their first listing day; later days are rows under theirs", () => {
  // the 12-day fair: its card on Feb 5, one row on each of the next eleven days
  assert.ok(section(wo, "d-2027-02-05").includes('id="e-florida-state-fair-2027"'));
  for (let d = 6; d <= 16; d++) {
    const day = `2027-02-${String(d).padStart(2, "0")}`;
    const s = section(wo, `d-${day}`);
    assert.match(s, /<li class="ev-also"><a href="#e-florida-state-fair-2027">/, `the fair's row on ${day}`);
    assert.match(s, /10:00 AM–10:00 PM/, `its hours on ${day}`);
  }
  // three market dates: the card on the first, rows on the other two
  assert.ok(section(wo, "d-2026-10-03").includes('id="e-saturday-morning-market-2026-10"'));
  for (const d of ["2026-10-10", "2026-10-17"]) assert.ok(section(wo, `d-${d}`).includes('href="#e-saturday-morning-market-2026-10"'), `market row on ${d}`);
  // day sections in date order, each inside its month
  const days = [...wo.matchAll(/<section class="wo-day" id="d-(\d{4}-\d\d-\d\d)"/g)].map((m) => m[1]);
  assert.deepEqual(days, [...days].sort(), "days in order");
  for (const d of days) assert.ok(monthOf(wo, d.slice(0, 7)).includes(`id="d-${d}"`), `${d} sits in its month`);
});

test("a long run is listed once, in the long-runs band, with its last day", () => {
  const runs = section(wo, "runs");
  const c = card(wo, "dali-fixture-exhibition-2026");
  assert.ok(runs.includes(c), "in #runs");
  assert.match(c, /data-run="2027-01-10"/);
  assert.match(c, /<div class="datebox is-until" aria-hidden="true"><i>Until<\/i><b>10<\/b><i>Jan<\/i><\/div>/);
  assert.match(c, /Through Jan 10, 2027/);
  assert.doesNotMatch(c, /daily/, "never claims daily hours");
  assert.ok(!wo.includes('href="#e-dali-fixture-exhibition-2026"'), "no day rows for a run");
});

test("unknowns print as unknowns, prices as the source gives them", () => {
  assert.match(card(wo, "lightning-home-game-2026-10-10"), /7:00 PM <span class="unk">end time not listed<\/span>/);
  assert.match(card(wo, "guavaween-2026"), /<p class="ev-cost unk">Price not listed<\/p>/);
  assert.match(card(wo, "riverwalk-concert-2026-10-02"), /<span class="badge badge-free">Free<\/span>/);
  assert.match(card(wo, "lightning-home-game-2026-10-10"), /<span class="ev-cw">Fixture cost text<\/span>/);
  const run = events.find((e) => e.id === "dali-fixture-exhibition-2026");
  assert.ok(card(wo, run.id).includes(run.time_text ? `<span class="ev-tt">${run.time_text}</span>` : '<span class="unk">Hours not listed</span>'), "a run's hours: the source's words, or not listed");
  const main = wo.slice(wo.indexOf("<main"), wo.indexOf("</main>")).replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(main, /\b(undefined|null|NaN|TBA|TBD|N\/A)\b/, "no invented or leaked placeholder");
});

test("counts are computed from the data", () => {
  const live = events.filter((e) => !["cancelled", "postponed"].includes(e.status));
  assert.match(wo, new RegExp(`<p class="lede">${live.length} events on \\d+ days`));
  assert.match(wo, new RegExp(`${live.filter((e) => e.is_free === true).length} are free`));
  // month bar: a link per month section, its number = distinct live events filed in that month (cards + rows)
  for (const m of wo.matchAll(/<section class="wo-month" id="m-(\d{4}-\d\d)"/g)) {
    const key = m[1], s = monthOf(wo, key);
    const ids = new Set([...s.matchAll(/<article class="ev" id="e-([a-z0-9-]+)"[^>]*>/g)].filter((x) => !x[0].includes("data-cancelled")).map((x) => x[1]));
    for (const r of s.matchAll(/<li class="ev-also"><a href="#e-([a-z0-9-]+)">/g)) ids.add(r[1]);
    assert.match(wo, new RegExp(`<a href="#m-${key}" data-m="${key}" aria-label="[A-Z][a-z]+ \\d{4}: ${ids.size} events?"><b>[^<]*(<small>\\d{4}</small>)?</b><span class="n tnum" data-wo-bn="${key}">${ids.size}</span></a>`), `bar count for ${key}`);
    assert.match(s, new RegExp(`<p class="wo-mc">${ids.size} events? on \\d+ days?</p>`), `month head count for ${key}`);
  }
});

test("every series once, with the organizer's words quoted, its months and its dated events", () => {
  for (const s of series) {
    assert.equal(wo.split(`id="s-${s.id}"`).length, 2, `one element s-${s.id}`);
    const el = wo.slice(wo.indexOf(`id="s-${s.id}"`), wo.indexOf("</article>", wo.indexOf(`id="s-${s.id}"`)));
    assert.ok(el.includes(`“${s.when_text}”`), `${s.id}: when_text quoted`);
    assert.ok(el.includes(`data-months="${[...s.months].sort((a, b) => a - b).join(" ")}"`), `${s.id}: its months`);
    assert.match(el, /Source: |source: /, `${s.id}: its source`);
  }
  // filed under the month its season starts (Oct for an Oct–May market), featured first
  assert.ok(section(wo, "yr-10").includes('id="s-saturday-morning-market"'));
  assert.ok(section(wo, "yr-1").includes('id="s-gasparilla-pirate-fest"'));
  assert.match(section(wo, "yr-1"), /Also in January<\/span> <a href="#s-saturday-morning-market">/);
  assert.match(wo.slice(wo.indexOf('id="s-gasparilla-pirate-fest"')), /<span class="seal">Signature<\/span>/);
  assert.match(wo, /In this guide<\/span> <a href="#e-gasparilla-pirate-fest-2027">Sat, Jan 30<\/a>/);
});

test("the filter tools name only values the page accepts", () => {
  assert.match(wo, /<div class="wo-list" data-filter-list="manual" data-filter-items="\.ev, \.ev-also"/);
  for (const w of ["today", "weekend", "week", "month"]) assert.ok(wo.includes(`data-filter-chip="when=${w}"`), `when=${w}`);
  assert.ok(wo.includes('data-filter-chip="free=1"') && wo.includes('data-filter-chip="star=1"'));
  const opts = (name) => { const m = wo.match(new RegExp(`<select class="select" data-filter="${name}">([\\s\\S]*?)</select>`)); assert.ok(m, `select ${name}`); return [...m[1].matchAll(/<option value="([^"]*)"/g)].map((x) => x[1]).filter(Boolean); };
  const months = new Set(events.flatMap((e) => [e.date.slice(0, 7), (e.end_date || e.date).slice(0, 7)]));
  for (const v of opts("month")) assert.match(v, /^\d{4}-\d\d$/, `month ${v}`);
  assert.ok(opts("month").every((v) => v >= [...months].sort()[0]));
  const areas = new Set([...json(dir, "docs/assets/data/events.json").events.map((e) => e.a)].filter(Boolean));
  for (const v of opts("a")) assert.ok(areas.has(v), `area ${v} has events`);
  for (const v of opts("k")) assert.ok(v in EVENT_GROUP_LABEL || EVENT_KINDS.includes(v), `kind ${v}`);
  for (const r of wo.matchAll(/data-filter-chip="r=([a-z]+)"/g)) assert.ok(["tampa", "stpete", "beaches", "clearwater", "around", "daytrips"].includes(r[1]));
  assert.match(wo, /data-view-pane="map" hidden/, "the map pane waits for JS");
});

test("the map data file carries labels and the basemap credit", () => {
  const m = json(dir, "docs/assets/data/whats-on-map.json");
  assert.equal(m.v, 1);
  assert.ok(Array.isArray(m.labels));
  for (const l of m.labels) assert.ok(l.text && Number.isFinite(l.lat) && Number.isFinite(l.lng));
});

test("trip.html: the page around the core's view", () => {
  assert.match(trip, /<div class="trip-root" data-trip-root><\/div>/);
  assert.match(trip, /<section class="trip-clash" data-trip-clash hidden/);
  assert.match(trip, /Your list stays in this browser, on this device\. The list itself is never sent anywhere/);
  assert.match(trip, /<noscript>/);
  assert.match(trip, /data-features="whats-on"/);
  assert.match(trip, /data-trip-print/);
  assert.match(trip, new RegExp(`${events.filter((e) => e.status !== "cancelled").length} events, by day`));
  // "Find things to star": each Explore page's count is the count that page itself shows
  for (const [page, label] of [["things-to-do", "Things to do"], ["outdoors", "Beaches and outdoors"], ["eat-drink", "Eat and drink"]]) {
    const own = read(dir, `docs/${page}.html`).match(/data-result-count[^>]*>Showing <b>\d+<\/b> of (\d+) places?/);
    const said = trip.slice(trip.indexOf('id="find"')).match(new RegExp(`href="${page}\\.html">[^]*?<span class="t">${label}</span><span class="w">(\\d+) places?(?: and (\\d+) campgrounds?)?`));
    if (!own) continue;                                  // a page without a result line (its lane's choice)
    assert.ok(said, `trip.html links ${page}.html with a count`);
    const n = Number(said[1]) + Number(said[2] || 0);   // Beaches & outdoors counts its campgrounds with its places
    assert.equal(n, Number(own[1]), `${page}: trip.html says ${n}, the page lists ${own[1]}`);
  }
});

test("date tests: an item matches on its own listing day; a run on any day it covers", () => {
  const t = dateTests(() => nyToEpoch("2026-10-09", "12:00"));      // a Friday
  const cardFair = itemOf({ day: "2027-02-05", days: "2027-02-05 2027-02-06", month: "2027-02" });
  const row = itemOf({ day: "2027-02-06" });
  const run = itemOf({ day: "2026-10-03", run: "2027-01-10", month: "2026-10 2026-11 2026-12 2027-01" });
  assert.equal(t.day(cardFair, ["2027-02-06"]), false, "the card is not filed under its second day");
  assert.equal(t.day(row, ["2027-02-06"]), true, "its row is");
  assert.equal(t.day(run, ["2026-12-01"]), true, "a run covers its days");
  assert.equal(t.day(run, ["2027-02-01"]), false);
  assert.equal(t.when(itemOf({ day: "2026-10-10" }), "weekend"), true, "Sat in the weekend (Fri–Sun)");
  assert.equal(t.when(itemOf({ day: "2026-10-12" }), "weekend"), false);
  assert.equal(t.when(run, "today"), true);
  assert.equal(t.month(cardFair, ["2027-02"]), true);
  assert.equal(t.month(row, ["2027-03"]), false);
  assert.equal(t.month(run, ["2026-12"]), true);
});

test("overlaps: only published times, no invented end", () => {
  const at = (d, hm) => nyToEpoch(d, hm);
  const ev = (id, i, st = "scheduled") => ({ id, t: id, st, i });
  const A = ev("a", [["2026-10-24", at("2026-10-24", "16:00"), at("2026-10-24", "21:00"), 0]]);
  const B = ev("b", [["2026-10-24", at("2026-10-24", "19:00"), at("2026-10-24", "20:00"), 1]]);   // no end listed, starts while A is on
  const C = ev("c", [["2026-10-24", at("2026-10-24", "19:30"), at("2026-10-24", "20:30"), 1]]);   // no end listed, after B starts
  const D = ev("d", [["2026-10-24", 0, 0, 2]]);                                                     // no time listed
  const E = ev("e", [["2026-10-24", at("2026-10-24", "17:00"), at("2026-10-24", "18:00"), 0]], "cancelled");
  const F = ev("f", [["2026-10-24", at("2026-10-24", "21:00"), at("2026-10-24", "22:00"), 0]]);  // starts as A ends
  const now = at("2026-10-24", "09:00");
  const pairs = overlaps([A, B, C, D, E, F], now).map(([x, y]) => `${x.ev.id}${y.ev.id}`).sort();
  assert.deepEqual(pairs, ["ab", "ac"], "B and C start while A is on; B's unknown end never overlaps C; F starts as A ends");
  assert.deepEqual(overlaps([A, B], at("2026-10-24", "22:00")), [], "over by now");
  const G = ev("g", [["2026-10-24", at("2026-10-24", "19:00"), at("2026-10-24", "20:00"), 1]]);
  assert.deepEqual(overlaps([B, G], now).map(([x, y]) => [x.ev.id, y.ev.id].sort().join("")), ["bg"], "two unknown ends starting together");
});

test("a multi-day card carries every day; several shows on a day are all listed; a cancelled card has no ticket link", () => {
  // the fixture as it is: the 12-day fair and the 3-date market carry each day's times, so the card's word follows the event
  assert.match(card(wo, "florida-state-fair-2027"), /data-inst="(\d+:\d+,){11}\d+:\d+"/, "the fair's twelve days");
  assert.match(card(wo, "saturday-morning-market-2026-10"), /data-inst="\d+:\d+,\d+:\d+,\d+:\d+"/);
  assert.doesNotMatch(card(wo, "guavaween-2026"), /data-inst=/, "a one-day event needs none");
  const d = copyRepo();
  try {
    editData("events", (a) => {
      const m = a.find((e) => e.id === "saturday-morning-market-2026-10");
      m.occurrences = [{ date: "2026-10-03", start: "09:00", end: "14:00" }, { date: "2026-10-03", start: "15:00", end: "17:00" }, { date: "2026-10-10", start: "09:00", end: "14:00" }, { date: "2026-10-17", start: "10:00", end: "13:00" }];
      a.find((e) => e.id === "riverwalk-boat-parade-2026-12-12").tickets_url = "https://example.com/tickets";
    })(d);
    const r = build(d);
    assert.equal(r.status, 0, r.stderr);
    const h = read(d, "docs/whats-on.html");
    const m = card(h, "saturday-morning-market-2026-10").replace(/\u00a0/g, " ");
    assert.match(m, /Oct 3: <\/span><span>9:00 AM–2:00 PM and 3:00–5:00 PM<\/span>/, "both starts of the first day, never only the first");
    assert.match(m, /hours differ by day/, "and the hours are said to differ by day");
    assert.match(section(h, "d-2026-10-17"), /10:00 AM–1:00 PM/, "the later day's own hours on its row");
    const dead = card(h, "riverwalk-boat-parade-2026-12-12");
    assert.match(dead, /Cancelled/);
    assert.doesNotMatch(dead, /Tickets/, "no ticket link on a cancelled card");
  } finally { cleanup(d); }
});

test("a page without events still builds (empty states, no series)", () => {
  const d = copyRepo();
  try {
    editData("events", (a) => { a.length = 0; })(d);
    editData("series", (a) => { a.length = 0; })(d);
    const r = build(d);
    assert.equal(r.status, 0, r.stderr);
    const h = read(d, "docs/whats-on.html");
    assert.match(h, /<p class="lede">No events are listed yet for /, "an empty calendar says so, not \"0 events on 0 days\"");
    assert.doesNotMatch(h, /id="annual"/);
  } finally { cleanup(d); }
});
