/* ============================================================
   site/js/lib/facets.js · OWNER: E2 (client runtime) · PURE (no DOM)
   Which card attribute each URL filter key reads, and whether a card
   matches. core/filter.js (the generic list filter every page can use)
   reads cards into items with itemOf() and filters them with matchItem();
   the URL round-trips through lib/filters.js parse/serialize with
   schemaFor(). Tests: tests/facets.test.mjs.

   Keys (build/nav.mjs PARAMS; values checked by the crawler at build time):
     q      text: every term appears in the card's text or its data-q
     r      data-r (or data-sheet)          a    data-a
     k      data-k · data-ks · data-kg · data-g  (a kind, a secondary kind or a group id)
     t      data-t (topics on place and experience cards)
     tag    data-tag · data-t               f    data-f (stay features)
     era    data-era                        month  data-month (event cards: "2026-10 2026-11")
     series data-se                         topic  data-topic (FAQ items)
     day    the card's listing days: data-days, else data-day; a long run (data-run) covers data-day…data-run
     when   today | weekend | week | month (lib/time.js whenRange at `now`), matched like day
     free   data-free="1"                   star  the card's [data-star] id is in My Trip
   List keys match when the card has ANY selected value; different keys combine with AND.
   Keys that are not filters (view e x focus layers) are left alone.
   ============================================================ */
import { norm } from "./search.js";
import { whenRange, WHEN } from "./time.js";

export const FACETS = {
  q: { type: "text" },
  r: { type: "list", attrs: ["r", "sheet"] },
  a: { type: "list", attrs: ["a"] },
  k: { type: "list", attrs: ["k", "ks", "kg", "g"] },
  t: { type: "list", attrs: ["t"] },
  tag: { type: "list", attrs: ["tag", "t"] },
  f: { type: "list", attrs: ["f"] },
  era: { type: "list", attrs: ["era"] },
  month: { type: "list", attrs: ["month"] },
  series: { type: "list", attrs: ["se"] },
  topic: { type: "list", attrs: ["topic"] },
  day: { type: "list", days: true },
  when: { type: "one", values: Object.keys(WHEN), days: true },
  free: { type: "bool", attrs: ["free"] },
  star: { type: "bool" },
};
/** URL keys that are never filters (dialogs, views, the map). */
export const NOT_FACETS = ["view", "e", "x", "focus", "layers"];
const TOKEN = /^[a-z0-9][a-z0-9:._-]*$/;

/** lib/filters.js schema for these keys (unknown keys get a list of tokens; `extra` adds or overrides specs). */
export function schemaFor(keys, extra = {}) {
  const out = {};
  for (const k of keys) {
    if (NOT_FACETS.includes(k)) continue;
    const f = extra[k] || FACETS[k] || { type: "list" };
    if (f.type === "text") out[k] = { type: "text", max: 100 };
    else if (f.type === "bool") out[k] = { type: "bool" };
    else if (f.type === "one") out[k] = { type: "one", values: f.values || ((v) => TOKEN.test(v)) };
    else out[k] = { type: "list", values: f.values || ((v) => TOKEN.test(v)) };
  }
  return out;
}

const words = (v) => (v == null || v === "" ? [] : String(v).split(/\s+/).filter(Boolean));

/** A card's dataset (DOMStringMap or plain object) + its visible text → the item matchItem() reads. */
export function itemOf(ds, text = "", starId = null) {
  const days = ds.days ? words(ds.days) : ds.day ? [ds.day] : [];
  return { ds, q: norm(`${text} ${ds.q || ""}`), days, run: ds.run || null, id: starId };
}

/** Does the item have any listing day in [a, b] (ISO dates, inclusive)? A long run covers its first day to data-run. */
export function inDays(item, a, b) {
  if (item.run && item.days.length) return item.days[0] <= b && item.run >= a;
  return item.days.some((d) => d >= a && d <= b);
}

/** Does the item match every active key of `state`?
 *  opts: { now (epoch ms, for when), inTrip(id) → bool (for star), tests: { key: (item, value, state) → bool } } */
export function matchItem(item, state, { now = Date.now(), inTrip = () => false, tests = {} } = {}) {
  for (const [k, v] of Object.entries(state)) {
    if (v == null || v === "" || v === false || (Array.isArray(v) && !v.length)) continue;
    if (tests[k]) { if (!tests[k](item, v, state)) return false; continue; }
    const f = FACETS[k];
    if (!f) {                                             // an unknown key filters data-<key>
      const have = words(item.ds[k]);
      if (!(Array.isArray(v) ? v : [v]).some((x) => have.includes(String(x)))) return false;
      continue;
    }
    if (f.type === "text") {
      const ts = norm(v).split(/\s+/).filter(Boolean);
      if (!ts.every((t) => item.q.includes(t))) return false;
    } else if (k === "star") {
      if (!item.id || !inTrip(item.id)) return false;
    } else if (f.type === "bool") {
      if (!f.attrs.some((a) => item.ds[a] === "1")) return false;
    } else if (k === "when") {
      const r = whenRange(v, now);
      if (r && !inDays(item, r[0], r[1])) return false;
    } else if (f.days) {
      if (!(Array.isArray(v) ? v : [v]).some((d) => inDays(item, d, d))) return false;
    } else {
      const have = new Set(f.attrs.flatMap((a) => words(item.ds[a])));
      if (!(Array.isArray(v) ? v : [v]).some((x) => have.has(String(x)))) return false;
    }
  }
  return true;
}
