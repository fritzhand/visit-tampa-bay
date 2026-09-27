/* tests/filters.test.mjs · OWNER: E1 (ported from Cincy Week) · site/js/lib/filters.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, serialize, matches, defaults, activeCount } from "../site/js/lib/filters.js";

const SCHEMA = {
  day: { type: "one", values: (v) => v === "all" || /^\d{4}-\d\d-\d\d$/.test(v), default: "2026-10-08" },
  p: { type: "list", values: ["tampa", "stpete", "beaches", "clearwater", "around", "daytrips"] },
  k: { type: "list", values: ["festivals", "shows", "sports", "arts", "food"], field: "kg" },
  free: { type: "bool" },
  q: { type: "text" },
  view: { type: "one", values: ["list", "map"], default: "list" },
};

test("parse/serialize round-trip", () => {
  const s = parse("?p=stpete,beaches&k=shows&free=1&q=pier%20market&day=2026-10-06", SCHEMA);
  assert.deepEqual(s, { day: "2026-10-06", p: ["beaches", "stpete"], k: ["shows"], free: true, q: "pier market", view: "list" });
  const url = serialize(s, SCHEMA);
  assert.equal(url, "?day=2026-10-06&p=beaches,stpete&k=shows&free=1&q=pier%20market");
  assert.deepEqual(parse(url, SCHEMA), s);
});

test("defaults are omitted", () => {
  assert.equal(serialize(defaults(SCHEMA), SCHEMA), "");
  assert.equal(serialize({ ...defaults(SCHEMA), view: "list", day: "2026-10-08" }, SCHEMA), "");
  assert.equal(serialize({ ...defaults(SCHEMA), view: "map" }, SCHEMA), "?view=map");
});

test("invalid values and unknown keys are dropped", () => {
  const s = parse("?p=stpete,nope&view=grid&day=tomorrow&zzz=1&free=maybe", SCHEMA);
  assert.deepEqual(s.p, ["stpete"]);
  assert.equal(s.view, "list");
  assert.equal(s.day, "2026-10-08");
  assert.equal(s.free, false);
  assert.ok(!("zzz" in s));
});

test("stable ordering: the same state gives the same URL", () => {
  const a = serialize({ ...defaults(SCHEMA), p: ["stpete", "tampa", "beaches"] }, SCHEMA);
  const b = serialize({ ...defaults(SCHEMA), p: ["beaches", "stpete", "tampa", "stpete"] }, SCHEMA);
  assert.equal(a, b);
  assert.equal(a, "?p=beaches,stpete,tampa");
});

test("matches: lists intersect, bools require, text needs every term", () => {
  const item = { p: "stpete", kg: "shows", free: false, q: "saturday morning market st pete pier" };
  const st = (o) => ({ ...defaults(SCHEMA), ...o });
  assert.ok(matches(item, st({}), SCHEMA));
  assert.ok(matches(item, st({ p: ["stpete", "tampa"] }), SCHEMA));
  assert.ok(!matches(item, st({ p: ["beaches"] }), SCHEMA));
  assert.ok(matches(item, st({ k: ["shows"] }), SCHEMA));
  assert.ok(!matches(item, st({ free: true }), SCHEMA));
  assert.ok(matches(item, st({ q: "Pîer Market" }), SCHEMA));
  assert.ok(!matches(item, st({ q: "pier ybor" }), SCHEMA));
  assert.equal(activeCount(st({ p: ["stpete", "tampa"], free: true }), SCHEMA), 3);
});
