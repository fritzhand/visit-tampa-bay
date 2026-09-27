/* tests/facets.test.mjs · OWNER: E2 (client runtime) · site/js/lib/facets.js (+ lib/filters.js round trips): the generic list filter */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FACETS, schemaFor, itemOf, matchItem, inDays } from "../site/js/lib/facets.js";
import { parse, serialize } from "../site/js/lib/filters.js";
import { nyToEpoch } from "../site/js/lib/time.js";

// datasets as the build's cards emit them (build/CONTRACTS.md §6)
const aquarium = itemOf({ place: "", sheet: "tampa", r: "tampa", a: "channel-district", k: "aquarium", ks: "attraction", g: "attractions", t: "family water wildlife", free: "0", st: "open", q: "flaquarium" }, "The Florida Aquarium Aquarium Channel District", "florida-aquarium");
const pier = itemOf({ sheet: "stpete", r: "stpete", a: "downtown-stpete", k: "pier", g: "outdoors", t: "water", free: "1", q: "" }, "St. Pete Pier", "st-pete-pier");
const fair = itemOf({ ev: "florida-state-fair-2027", r: "tampa", a: "east-tampa", k: "fair", kg: "festivals", day: "2027-02-05", days: "2027-02-05 2027-02-06 2027-02-07", month: "2027-02", se: "florida-state-fair", free: "0", q: "" }, "Florida State Fair", "florida-state-fair-2027");
const run = itemOf({ ev: "dali-show", r: "stpete", k: "exhibition", kg: "arts", day: "2026-10-03", run: "2027-01-10", month: "2026-10 2026-11 2026-12 2027-01", free: "0", q: "" }, "A long exhibition", "dali-show");
const opts = { now: nyToEpoch("2026-10-21", "12:00"), inTrip: (id) => id === "st-pete-pier" };
const keep = (items, state, o = opts) => items.filter((it) => matchItem(it, state, o)).map((it) => it.id);

test("list keys read their attributes; any selected value matches; keys combine with AND", () => {
  const all = [aquarium, pier, fair, run];
  assert.deepEqual(keep(all, { r: ["stpete"] }), ["st-pete-pier", "dali-show"]);
  assert.deepEqual(keep(all, { r: ["stpete", "tampa"], k: ["aquarium", "pier"] }), ["florida-aquarium", "st-pete-pier"]);
  assert.deepEqual(keep(all, { k: ["attraction"] }), ["florida-aquarium"], "a secondary kind (data-ks)");
  assert.deepEqual(keep(all, { k: ["festivals"] }), ["florida-state-fair-2027"], "an event group (data-kg)");
  assert.deepEqual(keep(all, { k: ["outdoors"] }), ["st-pete-pier"], "a place group (data-g)");
  assert.deepEqual(keep(all, { t: ["wildlife"] }), ["florida-aquarium"]);
  assert.deepEqual(keep(all, { series: ["florida-state-fair"] }), ["florida-state-fair-2027"]);
  assert.deepEqual(keep(all, { month: ["2026-12"] }), ["dali-show"]);
  assert.deepEqual(keep(all, {}), ["florida-aquarium", "st-pete-pier", "florida-state-fair-2027", "dali-show"], "no state: everything");
});

test("text, free and star", () => {
  const all = [aquarium, pier, fair];
  assert.deepEqual(keep(all, { q: "flaquarium" }), ["florida-aquarium"], "data-q holds what the card does not print");
  assert.deepEqual(keep(all, { q: "channel aquarium" }), ["florida-aquarium"], "every term");
  assert.deepEqual(keep(all, { q: "st. pete" }), ["st-pete-pier"]);
  assert.deepEqual(keep(all, { free: true }), ["st-pete-pier"]);
  assert.deepEqual(keep(all, { star: true }), ["st-pete-pier"]);
});

test("day and when: listing days, and a long run covers every day it runs", () => {
  assert.equal(inDays(run, "2026-12-24", "2026-12-24"), true);
  assert.equal(inDays(run, "2027-01-11", "2027-01-20"), false);
  assert.deepEqual(keep([fair, run], { day: ["2027-02-06"] }), ["florida-state-fair-2027"]);
  assert.deepEqual(keep([fair, run], { day: ["2026-11-02"] }), ["dali-show"]);
  // Wednesday Oct 21: the weekend is Oct 23–25; the run covers it, the February fair does not
  assert.deepEqual(keep([fair, run], { when: "weekend" }), ["dali-show"]);
  assert.deepEqual(keep([fair, run], { when: "today" }, { now: nyToEpoch("2027-02-06", "09:00") }), ["florida-state-fair-2027"]);
});

test("custom tests and unknown keys", () => {
  assert.deepEqual(keep([aquarium, pier], { st: ["open"] }), ["florida-aquarium"], "an unknown key reads data-<key>");
  assert.deepEqual(keep([aquarium, pier], { r: ["tampa"] }, { ...opts, tests: { r: (it) => it.id === "st-pete-pier" } }), ["st-pete-pier"], "a page's own test wins");
});

test("schemaFor + lib/filters.js: the URL round-trips, junk is dropped, non-filters are left alone", () => {
  const schema = schemaFor(["q", "r", "k", "when", "free", "star", "view", "e"]);
  assert.equal("view" in schema, false);
  assert.equal("e" in schema, false);
  const st = parse("?r=tampa,stpete&k=museum&when=weekend&free=1&q=cuban%20sandwich&e=guavaween-2026&junk=1&r2=x", schema);
  assert.deepEqual(st.r, ["stpete", "tampa"]);
  assert.equal(st.when, "weekend");
  assert.equal(st.free, true);
  assert.equal(st.q, "cuban sandwich");
  assert.equal(serialize(st, schema), "?q=cuban%20sandwich&r=stpete,tampa&k=museum&when=weekend&free=1");
  assert.equal(parse("?when=someday&r=<script>", schema).when, null, "values outside the set are dropped");
  assert.deepEqual(parse("?r=<script>", schema).r, []);
  assert.ok(Object.keys(FACETS).every((k) => schemaFor([k])[k]), "every facet has a schema");
});
