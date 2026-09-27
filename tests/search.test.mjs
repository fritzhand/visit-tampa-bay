/* tests/search.test.mjs · OWNER: E1 (ported from Cincy Week) · site/js/lib/search.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { norm, prepare, search, group, mark, KINDS, GROUP_ORDER, SEE_ALL } from "../site/js/lib/search.js";
import { esc } from "../site/js/lib/text.js";

const ITEMS = prepare([
  { k: "pl", id: "dali-museum", t: "The Dalí Museum", s: "Museum · Downtown St. Petersburg", u: "places/dali-museum.html" },
  { k: "pl", id: "florida-aquarium", t: "The Florida Aquarium", s: "Aquarium · Channel District", u: "places/florida-aquarium.html", g: "family wildlife" },
  { k: "ev", id: "gasparilla-pirate-fest-2027", t: "Gasparilla Pirate Fest", s: "Jan 30 · Bayshore Boulevard", u: "whats-on.html?e=gasparilla-pirate-fest-2027", g: "parade pirate invasion" },
  { k: "ex", id: "pirate-water-taxi", t: "Pirate Water Taxi", s: "Water taxi · Pirate Water Taxi", u: "experiences.html?x=pirate-water-taxi" },
  { k: "ar", id: "ybor-city", t: "Ybor City", s: "Tampa · Sheet 1", u: "areas/ybor-city.html", g: "cigar factories" },
  { k: "st", id: "hotel-haya", t: "Hotel Haya", s: "Boutique hotel · Ybor City", u: "stays/hotel-haya.html" },
  { k: "tl", id: "ybor-cigar-factory-1886", t: "Cigar making begins in Ybor City", s: "1886 · Boomtown", u: "history.html#tl-ybor-cigar-factory-1886" },
  ...Array.from({ length: 8 }, (_, i) => ({ k: "pl", id: `p${i}`, t: `Pier Place ${i}`, s: "", u: `places/p${i}.html` })),
]);

test("every index kind has a group, and every group is ordered", () => {
  for (const k of ["pl", "st", "ex", "ev", "se", "ar", "rg", "pg", "fq", "tr", "tl"]) assert.ok(KINDS[k], `kind ${k}`);
  for (const g of new Set(Object.values(KINDS))) assert.ok(GROUP_ORDER.includes(g), `group ${g}`);
  for (const g of Object.keys(SEE_ALL)) assert.ok(GROUP_ORDER.includes(g));
});

test("accent folding: Dalí ~ dali", () => {
  assert.equal(norm("Dalí"), "dali");
  assert.equal(search(ITEMS, "dali")[0].id, "dali-museum");
  assert.equal(search(ITEMS, "DALÍ")[0].id, "dali-museum");
});

test("multi-term AND", () => {
  const ids = search(ITEMS, "pirate taxi").map((h) => h.id);
  assert.deepEqual(ids, ["pirate-water-taxi"]);
  assert.deepEqual(search(ITEMS, "pirate zebra"), []);
});

test("exact and word-prefix matches rank first", () => {
  assert.equal(search(ITEMS, "ybor city")[0].id, "ybor-city", "exact title beats a subline match");
  assert.equal(search(ITEMS, "aqua")[0].id, "florida-aquarium", "word prefix inside a title");
});

test("happening-soon boost for events", () => {
  const items = prepare([
    { k: "ev", id: "a", t: "Concert A", s: "", u: "a", st: 1000, en: 5000 },
    { k: "ev", id: "b", t: "Concert B", s: "", u: "b", st: 90000000, en: 90005000 },
  ]);
  assert.equal(search(items, "concert", { now: 2000 })[0].id, "a");
});

test("grouping caps each group, keeps totals, and an exact hit's group leads", () => {
  const groups = group(search(ITEMS, "pier"), 5);
  const places = groups.find((g) => g.label === "Places");
  assert.equal(places.items.length, 5);
  assert.equal(places.total, 8);
  const lead = group(search(ITEMS, "ybor city"));
  assert.equal(lead[0].label, "Areas and sheets", "the exact area match leads");
});

test("mark wraps matches and escapes", () => {
  assert.equal(mark("Pier <60>", "pier", esc), "<mark>Pier</mark> &lt;60&gt;");
  assert.equal(mark("Dalí", "dali", esc), "<mark>Dalí</mark>");
});
