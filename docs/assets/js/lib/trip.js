/* ============================================================
   site/js/lib/trip.js · OWNER: E2 (client runtime) · PURE (no DOM)
   My Trip's data helpers, shared by core/trip-store.js (the stars),
   views/trip.js (trip.html) and node:test (tests/trip.test.mjs).

   A trip is { v: 1, e: [event ids], x: [experience ids], p: [place ids], s: [stay ids], t: updated epoch }.
   Ids are unique across all four kinds (one URL and share-code space), so has(id) needs no kind.
     normalize(raw)              → a clean trip (drops bad ids, duplicates and unknown kinds; never throws)
     total(trip) · countText(trip) "2 events · 1 place to stay"
     kindOf(trip, id)            → "e" | "x" | "p" | "s" | null
     merge(a, b) · missing(a, b) → union · the ids of b that a lacks (for "Add all 3")
     sameTrip(a, b)              → the same ids, in any order
     codeMap({ events, experiences, places, stays }) → Map share code → { id, kind }
     nextUp(events, ids, now)    → the next starred event instance that has not ended, from events.json
   ============================================================ */
import { TRIP_KINDS } from "./share.js";

export const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
/** Words per kind: [one, many]. */
export const TRIP_WORDS = { e: ["event", "events"], x: ["experience", "experiences"], p: ["place", "places"], s: ["place to stay", "places to stay"] };
/** Group headings on the trip page. */
export const TRIP_HEADINGS = { e: "Events", x: "Experiences and tours", p: "Places", s: "Where to stay" };

export function normalize(raw) {
  const ok = (a) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === "string" && ID_RE.test(x)))] : []);
  const out = { v: 1, e: [], x: [], p: [], s: [], t: 0 };
  if (raw && typeof raw === "object") {
    const seen = new Set();
    for (const k of TRIP_KINDS) out[k] = ok(raw[k]).filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
    out.t = Number.isFinite(raw.t) ? raw.t : 0;
  }
  return out;
}

export const total = (trip) => TRIP_KINDS.reduce((n, k) => n + ((trip && trip[k]) || []).length, 0);
export const plural = (n, [one, many]) => `${n} ${n === 1 ? one : many}`;
/** "2 events · 1 experience · 3 places · 1 place to stay" (kinds with none are left out; "" when empty) */
export const countText = (trip) => TRIP_KINDS.filter((k) => (trip[k] || []).length).map((k) => plural(trip[k].length, TRIP_WORDS[k])).join(" · ");
export const kindOf = (trip, id) => TRIP_KINDS.find((k) => (trip[k] || []).includes(id)) || null;

export function merge(a, b) {
  const out = normalize(a);
  const have = new Set(TRIP_KINDS.flatMap((k) => out[k]));
  for (const k of TRIP_KINDS) for (const id of (b && b[k]) || []) if (!have.has(id) && ID_RE.test(id)) { out[k].push(id); have.add(id); }
  return out;
}
/** The ids in b that a does not have: { e, x, p, s } */
export function missing(a, b) {
  const have = new Set(TRIP_KINDS.flatMap((k) => (a && a[k]) || []));
  return Object.fromEntries(TRIP_KINDS.map((k) => [k, ((b && b[k]) || []).filter((id) => !have.has(id))]));
}
export const sameTrip = (a, b) => TRIP_KINDS.every((k) => { const x = [...((a && a[k]) || [])].sort(), y = [...((b && b[k]) || [])].sort(); return x.length === y.length && x.every((v, i) => v === y[i]); });

/** Map share code → { id, kind } from the four client JSON files (any may be missing). */
export function codeMap({ events = [], experiences = [], places = [], stays = [] } = {}) {
  const m = new Map();
  for (const [kind, list] of [["e", events], ["x", experiences], ["p", places], ["s", stays]]) for (const r of list || []) if (r && r.x) m.set(r.x, { id: r.id, kind });
  return m;
}

/** events.json flags */
export const F = { endUnknown: 1, timeUnknown: 2, allDay: 4, ongoing: 8, lateNight: 16, run: 32 };
const DEAD = new Set(["cancelled", "postponed"]);

/** The next starred event instance that has not ended at `now`: { id, t, ev, day, s, e, f, run } | null.
 *  Cancelled and postponed events are skipped. Long runs (flag 32) count only when nothing else is ahead
 *  (a run is not a thing that happens "next"). ids: a Set or an array of event ids. */
export function nextUp(events, ids, now) {
  const want = ids instanceof Set ? ids : new Set(ids || []);
  if (!want.size) return null;
  let best = null, bestRun = null;
  for (const ev of events || []) {
    if (!want.has(ev.id) || DEAD.has(ev.st)) continue;
    for (const [day, s, e, f] of ev.i || []) {
      if (e <= now) continue;
      const x = { id: ev.id, t: ev.t, ev, day, s, e, f, run: !!(f & F.run) };
      if (x.run) { if (!bestRun || s < bestRun.s) bestRun = x; }
      else if (!best || s < best.s) best = x;
    }
  }
  return best || bestRun;
}
