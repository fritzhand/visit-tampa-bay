/* ============================================================
   site/js/lib/status.js · OWNER: E2 (client runtime) · PURE (no DOM)
   The live-state model behind every "Now", "In 20 min", "Today" and "Ended"
   word on the site. core/status.js reads an element's data-* attributes into
   the shape below and calls liveState() every minute; the event dialog and
   the trip view use the same function, so a card and its dialog never
   disagree. node:test covers it (tests/status.test.mjs).

   liveState(x, now) → { st, label, s, e }
     x = { s, e,                 epoch ms of the instance (data-s / data-e)
           inst?: [[s, e], …],   several days (data-inst): follow the current, else the next, else the last
           days?: ["YYYY-MM-DD"], listing days (data-days), used when hours are not listed
           endUnknown?,          no end time published (data-end-unknown="1")
           timeUnknown?,         no start time published (data-time-unknown="1")
           allDay?,              the source says all day (a card's data-t="allday" without the two flags below)
           run?,                 a long run (data-run: more than 14 days, one instance spanning it)
           cancelled? }          cancelled or postponed (data-cancelled="1")
     st:    upcoming | soon | live | started | running | today | past | null (no state at all)
     label: the visible word: "" · "Today" · "Tonight" · "Tomorrow" · "This weekend" · "In 20 min" ·
            "Now" · "Started" · "Ended"
   Honesty rules (SPEC §2, build/CONTRACTS.md §8):
   - "Now" only when both ends are published and the clock is between them.
   - No end time: "Started", never "Now"; "Ended" only once its day is over.
   - No start time: day words only ("Today"), never a time state.
   - All day: "Today" on the day (not "Now" at 3 AM).
   - A long run never says "Now" (its s..e span weeks, closed hours included): "running", no word
     (the card already prints "Through Jan 10").
   - Cancelled and postponed: no state.
   ============================================================ */
import { nyParts, nyToEpoch, addDays, whenRange, status as timeStatus, MIN, HOUR } from "./time.js";

export const STATES = ["upcoming", "soon", "live", "started", "running", "today", "past"];
/** A start this close after midnight (and not today by the calendar) reads "Tonight". */
export const TONIGHT_WITHIN = 6 * HOUR;

/** The word for a calendar date seen at `now`: "Today" · "Tomorrow" · "This weekend" · "". */
export function dateWord(date, now) {
  const today = nyParts(now).date;
  if (date === today) return "Today";
  if (date < today) return "";
  if (date === addDays(today, 1)) return "Tomorrow";
  const [a, b] = whenRange("weekend", now);
  return date >= a && date <= b ? "This weekend" : "";
}

/** The word for an upcoming start instant: its date's word, or "Tonight" for an after-midnight start a few hours away. */
export function dayWord(s, now) {
  if (!(s > 0)) return "";
  const date = nyParts(s).date;
  if (date !== nyParts(now).date && s > now && s - now <= TONIGHT_WITHIN && nyParts(s).minutes < 5 * 60) return "Tonight";
  return dateWord(date, now);
}

/** "In 20 min" (at least 1). */
export const inMinutes = (s, now) => `In ${Math.max(1, Math.round((s - now) / MIN))} min`;

/** The end of the calendar day an instant falls on (New York midnight after it). */
const dayEnd = (t) => nyToEpoch(addDays(nyParts(t).date, 1), "00:00");

export function liveState(x, now) {
  const none = { st: null, label: "", s: x.s, e: x.e };
  if (!x || x.cancelled) return none;
  let s = Number(x.s) || 0, e = Number(x.e) || 0;
  if (Array.isArray(x.inst) && x.inst.length) {
    const cur = x.inst.find(([, pe]) => pe > now) || x.inst[x.inst.length - 1];
    [s, e] = cur;
  }
  const out = (st, label) => ({ st, label, s, e });
  // a long run: before it opens, a day word (never "In 20 min" when its hours are not listed); then no word until it closes
  if (x.run) {
    if (!s || !e) return none;
    if (now >= e) return out("past", "Ended");
    if (now >= s) return out("running", "");
    if (!x.timeUnknown && !x.allDay && s - now <= 30 * MIN) return out("soon", inMinutes(s, now));
    return out("upcoming", x.timeUnknown || x.allDay ? dateWord(nyParts(s).date, now) : dayWord(s, now));
  }
  // hours not listed: the listing days alone decide ("Today", "Tomorrow", …, "Ended" once the last day is over)
  if (x.timeUnknown) {
    const days = Array.isArray(x.days) && x.days.length ? [...x.days].sort() : s ? [nyParts(s).date] : [];
    if (!days.length) return none;
    const today = nyParts(now).date;
    if (days.includes(today)) return out("today", "Today");
    const next = days.find((d) => d > today);
    return next ? out("upcoming", dateWord(next, now)) : out("past", "Ended");
  }
  if (!s || !e) return none;
  if (x.allDay) {
    if (now >= e) return out("past", "Ended");
    if (now >= s) return out("today", "Today");
    return out("upcoming", dateWord(nyParts(s).date, now));
  }
  if (x.endUnknown) {
    // no end time: "Started" for the rest of its day, never "Now"; "Ended" once the day is over
    if (now < s) return s - now <= 30 * MIN ? out("soon", inMinutes(s, now)) : out("upcoming", dayWord(s, now));
    return now < Math.max(e, dayEnd(s)) ? out("started", "Started") : out("past", "Ended");
  }
  const st = timeStatus(s, e, now, false);
  if (st === "soon") return out(st, inMinutes(s, now));
  if (st === "live") return out(st, "Now");
  if (st === "past") return out(st, "Ended");
  return out("upcoming", dayWord(s, now));
}

/** Read the shape liveState() takes from an element's dataset (DOMStringMap or a plain object). */
export function stateInput(ds) {
  const inst = ds.inst ? ds.inst.split(",").map((p) => p.split(":").map(Number)).filter(([a, b]) => a > 0 && b > 0) : null;
  const timeUnknown = ds.timeUnknown === "1", run = ds.run != null && ds.run !== "";
  return {
    s: Number(ds.s) || 0, e: Number(ds.e) || 0, inst,
    days: ds.days ? ds.days.split(/\s+/).filter(Boolean) : null,
    endUnknown: ds.endUnknown === "1", timeUnknown, run,
    allDay: ds.allDay === "1" || (ds.t === "allday" && !timeUnknown && !run),
    cancelled: ds.cancelled === "1",
  };
}
