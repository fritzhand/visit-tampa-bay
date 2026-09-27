/* tests/share.test.mjs · OWNER: E1 (ported from Cincy Week) · site/js/lib/share.js + site/js/lib/text.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { code, encode, decode, tripHash, codeTable, CODE_RE, TRIP_KINDS } from "../site/js/lib/share.js";
import { initials, truncate, paras, hostOf, aliasKey, slugify } from "../site/js/lib/text.js";

test("codes are stable, 5 base36 characters", () => {
  const c = code("florida-aquarium");
  assert.match(c, CODE_RE);
  assert.equal(code("florida-aquarium"), c);
  assert.notEqual(code("florida-aquarium"), code("florida-aquarium-2"));
});

test("trip hash round-trip over the four kinds; unknown codes are ignored", () => {
  assert.deepEqual(TRIP_KINDS, ["e", "x", "p", "s"]);
  const trip = { e: ["guavaween-2026", "florida-state-fair-2027"], x: ["pirate-water-taxi"], p: ["dali-museum", "st-pete-pier"], s: ["hotel-haya"] };
  const { map, collisions } = codeTable(Object.values(trip).flat());
  assert.deepEqual(collisions, []);
  const hash = "#" + tripHash(trip);
  assert.match(hash, /^#e=[0-9a-z]{5},[0-9a-z]{5};x=[0-9a-z]{5};p=[0-9a-z]{5},[0-9a-z]{5};s=[0-9a-z]{5}$/);
  const out = decode(hash + ",zzzzz,BAD!", map);
  for (const k of TRIP_KINDS) assert.deepEqual(out[k].sort(), [...trip[k]].sort(), k);
  assert.equal(out.unknown, 2);
  assert.equal(tripHash({ p: ["dali-museum"] }), `p=${code("dali-museum")}`, "empty kinds are left out");
  assert.equal(encode(["a", "b"]), encode(["b", "a", "a"]));
  assert.deepEqual(decode("#w=abcde;q=12345", map), { e: [], x: [], p: [], s: [], unknown: 0 }, "unknown sections are ignored");
});

test("text helpers", () => {
  assert.equal(initials("Jeremy Fritzhand"), "JF");
  assert.equal(truncate("A long sentence that goes on", 12), "A long…");
  assert.deepEqual(paras("One.\n\nTwo\nlines.\n\n\n"), ["One.", "Two lines."]);
  assert.equal(hostOf("https://www.flaquarium.org/visit/"), "flaquarium.org");
  assert.equal(aliasKey("Amalie Arena!"), "amalie arena");
  assert.equal(slugify("Ybor City & Tampa Heights"), "ybor-city-and-tampa-heights");
  assert.equal(slugify("The Dalí Museum"), "the-dali-museum");
});
