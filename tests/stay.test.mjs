/* ============================================================
   tests/stay.test.mjs · OWNER: the Stay lane (experiences-eat-stay)
   The contracts of stay.html, stays/<id>.html, experiences.html and eat-drink.html, built from the mini
   fixture (a throwaway copy: tests/helpers.mjs), plus the real data when data/ holds the merged research:
   · every stay has one card id="s-<id>" on stay.html and its own page; every experience one card id="x-<id>"
     with its deep link and dialog trigger; every place to eat or drink one card id="p-<id>"; stars by kind
   · filters: the controls name only keys the page accepts, every filter link's values exist, the features
     chips carry f=, the list is mounted by stay.js (data-filter-list="manual")
   · no unknown is rendered as a guess: missing phone, rooms, address, website, price, duration and hours print
     "… not listed"; no "undefined", "null" or "NaN" reaches a page; distances say they are straight lines
   · status is words: a temporarily closed stay is in "Closed for now" with its note, on its card and page
   · what's on nearby lists the events within 2 km with their listing days; the heritage block on historic stays
   ============================================================ */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { copyRepo, build, read, cleanup, editData, fx, REPO } from "./helpers.mjs";
import { builtYear } from "../build/components/stay-card.mjs";
import { EXPERIENCE_KINDS, EAT_DRINK_KINDS } from "../build/core/vocab.mjs";
import { FAMILIES } from "../build/pages/experiences.mjs";

const count = (s, re) => (s.match(re) || []).length;
const BAD = /\b(undefined|NaN)\b|>null<|"null"/;
/** the page body only (the shell's search palette and sprite are not ours) */
const main = (html) => { const m = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html); return m ? m[1] : html; };

test("builtYear reads only the year heritage.built states", () => {
  assert.equal(builtYear({ heritage: { built: "1925" } }), "1925");
  assert.equal(builtYear({ heritage: { built: "1925–1928" } }), "1925");
  assert.equal(builtYear({ heritage: { built: "c. 1912" } }), "c. 1912");
  assert.equal(builtYear({ heritage: { built: "circa 1890" } }), "c. 1890");
  assert.equal(builtYear({ heritage: { built: "1890s" } }), "", "a decade is not a year");
  assert.equal(builtYear({ heritage: { built: "1903 (saloon); expanded by the 1930s" } }), "1903");
  assert.equal(builtYear({ heritage: { built: "The 1920s" } }), "");
  assert.equal(builtYear({ heritage: {} }), "");
  assert.equal(builtYear({}), "");
});

test("the lane's pages on the fixture: cards, anchors, filters, unknowns, states", () => {
  const dir = copyRepo();
  try {
    // a temporarily closed stay with a note, and an open one with a note, to see both states
    editData("stays", (a) => {
      const h = a.find((s) => s.id === "hotel-haya");
      h.status = "temporarily-closed"; h.status_note = "Fixture: closed for repairs after a storm; no reopening date given.";
      const e = a.find((s) => s.id === "epicurean-hotel");
      e.status_note = "Fixture: the rooftop pool is closed for renovation.";
      const v = a.find((s) => s.id === "the-vinoy");
      v.rooms = 362; v.opened = "1925"; v.phone = "727-894-1000"; v.url = "https://www.marriott.com/";
    })(dir);
    const r = build(dir);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const stays = fx("stays"), xs = fx("experiences"), places = fx("places");

    /* ---------- stay.html ---------- */
    const st = read(dir, "docs/stay.html"), stMain = main(st);
    assert.doesNotMatch(stMain, BAD, "stay.html prints no undefined/null");
    for (const s of stays) {
      assert.equal(count(st, new RegExp(`id="s-${s.id}"`, "g")), 1, `stay.html: one card s-${s.id}`);
      assert.match(st, new RegExp(`<article class="card stay" id="s-${s.id}" data-stay="${s.id}"[^>]*data-f="`), `card ${s.id}: data-f`);
      assert.ok(st.includes(`data-star="${s.id}" data-star-kind="s"`), `card ${s.id}: star kind s`);
      assert.ok(st.includes(`href="stays/${s.id}.html"`), `card ${s.id}: links its page`);
      assert.ok(fs.existsSync(path.join(dir, "docs", "stays", `${s.id}.html`)), `stays/${s.id}.html`);
    }
    assert.match(st, /data-filter-list="manual" data-stay-list/, "the list is mounted by stay.js (AND test for features)");
    assert.match(st, /<body[^>]*data-features="[^"]*\bstay\b/, "stay.html loads the stay feature");
    for (const k of ["r", "a", "k"]) assert.match(st, new RegExp(`data-filter="${k}"`), `stay.html: a ${k} control`);
    assert.match(st, /data-filter-chip="f=pool"/, "feature chips filter f");
    assert.ok(!st.includes('data-view="map"') && !st.includes("data-stay-map"), "no basemap in the fixture: no Map view");
    assert.match(st, /data-filter-q/, "a search field");
    // closures, as words, with the source's note
    assert.match(st, /id="closures"/);
    const closures = /<section class="section stay-closures"[\s\S]*?<\/section>/.exec(st)[0];
    assert.match(closures, /Hotel Haya/);
    assert.match(closures, /Temporarily closed/);
    assert.match(closures, /closed for repairs after a storm/);
    assert.match(closures, /Epicurean Hotel[\s\S]*rooftop pool is closed/, "an open stay with a note is listed too");
    const haya = new RegExp(`<article class="card stay" id="s-hotel-haya"[\\s\\S]*?</article>`).exec(st)[0];
    assert.match(haya, /data-st="temporarily-closed"/);
    assert.match(haya, /class="card-note">Fixture: closed for repairs/);
    // choosing an area: a row per area with stays, counts computed, links that exist
    const choose = /<section class="section" id="choose"[\s\S]*?<\/section>/.exec(st)[0];
    const areasWith = [...new Set(stays.map((s) => s.area))];
    for (const a of areasWith) {
      const n = stays.filter((s) => s.area === a).length;
      assert.match(choose, new RegExp(`href="stay\\.html\\?a=${a}#list" data-set-filter="a=${a}"><b>${n}</b>`), `choose: ${a} counts ${n}`);
    }
    assert.match(choose, /straight-line distance/, "distances say they are straight lines");
    // the facts line: only what is stated
    const vinoy = new RegExp(`<article class="card stay" id="s-the-vinoy"[\\s\\S]*?</article>`).exec(st)[0];
    assert.match(vinoy, /class="card-facts">362 rooms · Opened 1925</, "rooms and opened as stated");
    assert.match(vinoy, /data-h="1"/, "a historic hotel carries the heritage mark");
    const marriott = new RegExp(`<article class="card stay" id="s-tampa-marriott-water-street"[\\s\\S]*?</article>`).exec(st)[0];
    assert.doesNotMatch(marriott, /card-facts/, "no rooms, no opened: no facts line (never a guess)");

    /* ---------- stays/<id>.html ---------- */
    const v = read(dir, "docs/stays/the-vinoy.html"), vMain = main(v);
    assert.doesNotMatch(vMain, BAD);
    assert.match(v, /<section class="heritage" id="heritage"/, "the heritage block");
    assert.match(v, /data-star="the-vinoy" data-star-kind="s"/);
    assert.match(vMain, /362/);
    assert.match(vMain, /727-894-1000/);
    assert.match(v, /class="mini-map|class="coord-line|mini-map-none/, "a map or an honest coordinate line");
    assert.match(v, /Google Maps/, "directions");
    assert.match(v, /id="near-events"[^>]*data-near-events/, "what's on nearby");
    assert.match(v, /data-open-event="dali-fixture-exhibition-2026"/, "the Dalí run is within 2 km of the Vinoy");
    assert.match(v, /data-days="2026-10-03" data-run="2027-01-10"/, "a long run carries its first listing day and its end");
    assert.match(v, /in a straight line/, "distances are labeled estimates");
    assert.match(v, /Checked Sep 27, 2026/, "the source line with its checked date");
    const m = read(dir, "docs/stays/tampa-marriott-water-street.html"), mMain = main(m);
    for (const w of ["Phone not listed", "Website not listed", "Room count not listed", "Year opened not listed"]) assert.ok(mMain.includes(w), `unknown printed as unknown: ${w}`);
    assert.doesNotMatch(mMain, BAD);
    assert.match(m, /data-open-event="riverwalk-concert-2026-10-02"/, "Curtis Hixon is within 2 km of Water Street");
    assert.doesNotMatch(m, /data-open-event="riverwalk-boat-parade-2026-12-12"/, "a cancelled event is not on the nearby list");
    const hy = read(dir, "docs/stays/hotel-haya.html");
    assert.match(hy, /class="callout tone-warn"[\s\S]*?Temporarily closed\.[\s\S]*?closed for repairs after a storm/, "the status callout says it in words");
    const ep = read(dir, "docs/stays/epicurean-hotel.html");
    assert.match(ep, /Open, with a note[\s\S]*?rooftop pool is closed/);

    /* ---------- experiences.html ---------- */
    const x = read(dir, "docs/experiences.html"), xMain = main(x);
    assert.doesNotMatch(xMain, BAD);
    for (const e of xs) {
      assert.equal(count(x, new RegExp(`id="x-${e.id}"`, "g")), 1, `one card x-${e.id}`);
      assert.match(x, new RegExp(`<article class="card exp" id="x-${e.id}" data-x="${e.id}"`), `card x-${e.id}`);
      assert.ok(x.includes(`href="experiences.html?x=${e.id}#x-${e.id}" data-open-experience="${e.id}"`), `${e.id}: deep link`);
      assert.ok(x.includes(`data-star="${e.id}" data-star-kind="x"`), `${e.id}: star kind x`);
    }
    for (const k of ["k", "r", "t"]) assert.match(x, new RegExp(`data-filter="${k}"`), `experiences: a ${k} control`);
    assert.match(x, /id="fam-water"/);
    assert.match(xMain, /Duration not listed/, "missing duration printed as unknown");
    assert.match(xMain, /Price not listed/, "missing price printed as unknown");
    const dolphin = /<article class="card exp" id="x-st-pete-pier-dolphin-cruise"[\s\S]*?<\/article>/.exec(x)[0];
    assert.match(dolphin, /Seasonal/);
    assert.match(dolphin, /class="card-note">Fixture: runs in season\./, "the status note on the card");
    assert.match(x, /class="callout tone-warn tour-check"[\s\S]*?St\. Pete Pier/, "check before you go lists it");

    /* ---------- eat-drink.html ---------- */
    const ed = read(dir, "docs/eat-drink.html"), edMain = main(ed);
    assert.doesNotMatch(edMain, BAD);
    const eat = places.filter((p) => [p.kind, ...(p.kinds || [])].some((k) => EAT_DRINK_KINDS.includes(k)));
    assert.ok(eat.length > 0);
    for (const p of eat) {
      assert.equal(count(ed, new RegExp(`id="p-${p.id}"`, "g")), 1, `one card p-${p.id}`);
      assert.ok(ed.includes(`data-star="${p.id}" data-star-kind="p"`));
      assert.ok(ed.includes(`href="places/${p.id}.html"`));
    }
    for (const k of ["r", "a", "k", "tag"]) assert.match(ed, new RegExp(`data-filter="${k}"`), `eat-drink: a ${k} control`);
    assert.doesNotMatch(ed, /Michelin/, "no Michelin words when no place carries a Michelin tag");
    assert.doesNotMatch(ed, /Cuban sandwiches &amp; bakeries/, "no quick filter for tags the data lacks");
    assert.match(ed, /href="eat-drink\.html\?tag=history#list" data-set-filter="tag=history"/, "a quick filter from a topic the data has");
    assert.match(edMain, /Hours not listed/, "missing hours printed as unknown");
  } finally { cleanup(dir); }
});

test("every experience kind belongs to exactly one family", () => {
  const kinds = FAMILIES.flatMap((f) => f.kinds);
  for (const k of EXPERIENCE_KINDS) assert.equal(kinds.filter((x) => x === k).length, 1, `kind ${k} in exactly one family`);
  for (const k of kinds) assert.ok(EXPERIENCE_KINDS.includes(k), `family kind ${k} is a vocabulary kind`);
});

/* ---------- the real data (skips while data/ is not the merged research) ---------- */
const realStays = (() => { try { return JSON.parse(fs.readFileSync(path.join(REPO, "data/stays.json"), "utf8")); } catch { return []; } })();
test("real data: every stay, experience and place to eat or drink is on its page once", { skip: realStays.length < 50 && "data/ is not the merged research" }, () => {
  const dir = copyRepo({ data: path.join(REPO, "data") });
  try {
    const r = build(dir);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const J = (f) => JSON.parse(fs.readFileSync(path.join(REPO, "data", `${f}.json`), "utf8"));
    const st = read(dir, "docs/stay.html"), x = read(dir, "docs/experiences.html"), ed = read(dir, "docs/eat-drink.html");
    assert.equal(count(st, /<article class="card stay" id="s-/g), realStays.length, "stay.html: one card per stay");
    for (const s of realStays) assert.ok(fs.existsSync(path.join(dir, "docs/stays", `${s.id}.html`)), `stays/${s.id}.html`);
    const xs = J("experiences");
    assert.equal(count(x, /<article class="card exp" id="x-/g), xs.length, "experiences.html: one card per experience");
    const eat = J("places").filter((p) => [p.kind, ...(p.kinds || [])].some((k) => EAT_DRINK_KINDS.includes(k)));
    assert.equal(count(ed, /<article class="card place eat" id="p-/g), eat.length, "eat-drink.html: one card per place to eat or drink");
    for (const [f, html] of [["stay", st], ["experiences", x], ["eat-drink", ed]]) assert.doesNotMatch(main(html), BAD, `${f}.html prints no undefined/null`);
    // every stay that is not open is named in "Closed for now" with its note
    const closures = /<section class="section stay-closures"[\s\S]*?<\/section>/.exec(st);
    for (const s of realStays.filter((s) => s.status !== "open")) assert.ok(closures && closures[0].includes(`stays/${s.id}.html`), `closures list ${s.id}`);
    // Michelin words only on places whose tags say so
    for (const p of eat) {
      const card = new RegExp(`<article class="card place eat" id="p-${p.id}"[\\s\\S]*?</article>`).exec(ed)[0];
      assert.equal(/Michelin star</.test(card), (p.tags || []).includes("michelin-star"), `${p.id}: Michelin star only when tagged`);
      assert.equal(/class="eat-her"/.test(card), !!p.heritage, `${p.id}: the heritage mark only with a heritage record`);
    }
  } finally { cleanup(dir); }
});
