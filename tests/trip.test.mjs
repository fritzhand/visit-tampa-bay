/* tests/trip.test.mjs · OWNER: E2 (client runtime) · site/js/lib/trip.js (My Trip's data helpers) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, total, countText, kindOf, merge, missing, sameTrip, codeMap, nextUp } from "../site/js/lib/trip.js";
import { code, tripHash, decode } from "../site/js/lib/share.js";
import { nyToEpoch, HOUR } from "../site/js/lib/time.js";

test("normalize: bad ids, duplicates and unknown kinds are dropped; it never throws", () => {
  assert.deepEqual(normalize(null), { v: 1, e: [], x: [], p: [], s: [], t: 0 });
  assert.deepEqual(normalize("junk"), { v: 1, e: [], x: [], p: [], s: [], t: 0 });
  const t = normalize({ v: 1, e: ["guavaween-2026", "guavaween-2026", "Bad Id", 7], x: "no", p: ["dali-museum"], s: ["dali-museum", "hotel-haya"], w: ["old-kind"], t: 5 });
  assert.deepEqual(t, { v: 1, e: ["guavaween-2026"], x: [], p: ["dali-museum"], s: ["hotel-haya"], t: 5 }, "an id lives in one kind only");
});

test("counts and words", () => {
  const t = normalize({ e: ["a", "b"], x: ["c"], p: ["d", "e", "f"], s: ["g"] });
  assert.equal(total(t), 7);
  assert.equal(countText(t), "2 events · 1 experience · 3 places · 1 place to stay");
  assert.equal(countText(normalize({ s: ["g", "h"] })), "2 places to stay");
  assert.equal(countText(normalize({})), "");
  assert.equal(kindOf(t, "c"), "x");
  assert.equal(kindOf(t, "zz"), null);
});

test("merge, missing and sameTrip (shared-trip import)", () => {
  const mine = normalize({ p: ["dali-museum"], e: ["guavaween-2026"] });
  const theirs = normalize({ p: ["dali-museum", "st-pete-pier"], s: ["hotel-haya"] });
  assert.deepEqual(missing(mine, theirs), { e: [], x: [], p: ["st-pete-pier"], s: ["hotel-haya"] });
  const m = merge(mine, theirs);
  assert.deepEqual([m.e, m.p, m.s], [["guavaween-2026"], ["dali-museum", "st-pete-pier"], ["hotel-haya"]]);
  assert.equal(sameTrip(m, normalize({ s: ["hotel-haya"], e: ["guavaween-2026"], p: ["st-pete-pier", "dali-museum"] })), true);
  assert.equal(sameTrip(mine, theirs), false);
});

test("codeMap resolves a shared hash across the four client files", () => {
  const files = { events: [{ id: "guavaween-2026", x: code("guavaween-2026") }], experiences: [{ id: "pirate-water-taxi", x: code("pirate-water-taxi") }], places: [{ id: "dali-museum", x: code("dali-museum") }], stays: [{ id: "hotel-haya", x: code("hotel-haya") }] };
  const m = codeMap(files);
  assert.deepEqual(m.get(code("hotel-haya")), { id: "hotel-haya", kind: "s" });
  const hash = tripHash({ e: ["guavaween-2026"], x: ["pirate-water-taxi"], p: ["dali-museum"], s: ["hotel-haya"] });
  const d = decode(hash, new Map([...m].map(([c, v]) => [c, v.id])));
  assert.deepEqual([d.e, d.x, d.p, d.s, d.unknown], [["guavaween-2026"], ["pirate-water-taxi"], ["dali-museum"], ["hotel-haya"], 0]);
});

test("nextUp: the next starred instance that has not ended; cancelled skipped; long runs only when nothing else is ahead", () => {
  const t = (d, h) => nyToEpoch(d, h);
  const events = [
    { id: "concert", t: "Concert", st: "scheduled", i: [["2026-10-02", t("2026-10-02", "18:00"), t("2026-10-02", "21:00"), 0]] },
    { id: "game", t: "Game", st: "scheduled", i: [["2026-10-10", t("2026-10-10", "19:00"), t("2026-10-10", "20:00"), 1]] },
    { id: "parade", t: "Parade", st: "cancelled", i: [["2026-10-05", t("2026-10-05", "18:00"), t("2026-10-05", "20:00"), 0]] },
    { id: "show", t: "Show", st: "scheduled", ed: "2027-01-10", i: [["2026-10-03", t("2026-10-03", "00:00"), t("2027-01-11", "00:00"), 2 | 8 | 32]] },
  ];
  const ids = ["concert", "game", "parade", "show"];
  assert.equal(nextUp(events, ids, t("2026-10-01", "12:00")).id, "concert");
  assert.equal(nextUp(events, ids, t("2026-10-02", "19:00")).id, "concert", "a live one is still the next thing");
  assert.equal(nextUp(events, ids, t("2026-10-04", "12:00")).id, "game", "the cancelled parade is skipped; the run is not 'next'");
  const last = nextUp(events, ids, t("2026-10-10", "20:00") + HOUR);
  assert.equal(last.id, "show");
  assert.equal(last.run, true);
  assert.equal(nextUp(events, ["concert"], t("2026-10-03", "00:00")), null);
  assert.equal(nextUp(events, [], 0), null);
});
