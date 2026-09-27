/* ============================================================
   site/js/lib/time.js · OWNER: E1 (build engine; ported from Cincy Week) · PURE (no DOM)
   The time model. Imported by the build (build/core/time.mjs), by the
   client (E2: core/clock.js, core/status.js, features) and by node:test.
   Tampa Bay Chartbook additions: long runs (a run longer than RUN_MAX_DAYS is
   ONE instance, "Through <date>"), whenRange (today | weekend | week | month),
   month helpers (monthKey, fmtMonth), fmtDateY, fmtThrough, isWeekend.

   Every instant is computed from America/New_York wall-clock times into
   epoch ms (nyToEpoch). The client compares epochs with Date.now().
   Voice (DESIGN.md §14): "9:00 AM", "4:00–9:00 PM" (one AM/PM when both
   share it), "11:00 PM–1:00 AM", "Thu, Oct 8", "Oct 3–10", "in 20 min".
   ============================================================ */
export const TZ = "America/New_York";
export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

let fmt = null;
function parts(epoch) {
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  }
  const o = {};
  for (const p of fmt.formatToParts(new Date(epoch))) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute };
}

/** Offset of New York from UTC at an instant, in ms (EDT = -4 h). */
export function offsetAt(epoch) {
  const p = parts(epoch);
  const wall = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
  return wall - Math.floor(epoch / MIN) * MIN;
}

/** "2026-10-05", "09:00" (New York wall clock) → epoch ms. Two passes, so DST edges resolve;
 *  an ambiguous fall-back time resolves to its first occurrence (daylight time). */
export function nyToEpoch(date, hhmm = "00:00") {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const t1 = guess - offsetAt(guess);
  return guess - offsetAt(t1);
}

/** epoch → New York parts: { date: "YYYY-MM-DD", minutes (since midnight), weekday (0 = Sun), hhmm } */
export function nyParts(epoch) {
  const p = parts(epoch);
  const date = `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  return { date, minutes: p.h * 60 + p.mi, weekday: weekday(date), hhmm: `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}` };
}

/* ---------- calendar arithmetic on ISO dates (no time zone involved) ---------- */
const ymd = (date) => date.split("-").map(Number);
export function weekday(date) { const [y, m, d] = ymd(date); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
export function addDays(date, n) {
  const [y, m, d] = ymd(date);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
export function daysBetween(a, b) { const [y1, m1, d1] = ymd(a), [y2, m2, d2] = ymd(b); return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY); }
export function dateRange(start, end) { const out = []; for (let d = start; d <= end; d = addDays(d, 1)) out.push(d); return out; }
export const toMinutes = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

/** The day a start belongs to: 00:00–04:59 belongs to the previous day (a 12:30 AM show sits under Friday night).
 *  (Cincy Week called it the festival day; the name is kept.) */
export const LATE_NIGHT_END = "05:00";
export function festivalDay(date, start) {
  if (start && start < LATE_NIGHT_END) return { day: addDays(date, -1), lateNight: true };
  return { day: date, lateNight: false };
}

/** Time-of-day bucket for filters: morning <12, afternoon <17, evening <21, late ≥21 or after midnight. */
export function bucket(hhmm) {
  if (!hhmm) return "allday";
  const m = toMinutes(hhmm);
  if (m < 5 * 60) return "late";
  if (m < 12 * 60) return "morning";
  if (m < 17 * 60) return "afternoon";
  if (m < 21 * 60) return "evening";
  return "late";
}
export const BUCKETS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", late: "Late" };

/** State at `now`: upcoming | soon (≤ 30 min) | live | started (no end time listed: never "live") | past. */
export const SOON = 30 * MIN;
export function status(s, e, now, endUnknown = false) {
  if (now < s - SOON) return "upcoming";
  if (now < s) return "soon";
  if (now < e) return endUnknown ? "started" : "live";
  return "past";
}
export const STATUS_LABEL = { upcoming: "", soon: "Soon", live: "Now", started: "Started", past: "Ended" };

/** "in 20 min", "in 2 h 5 min", "Started 40 min ago", "Ended" */
export function relTime(s, e, now, endUnknown = false) {
  const st = status(s, e, now, endUnknown);
  const span = (ms) => { const m = Math.max(1, Math.round(ms / MIN)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`; };
  if (st === "upcoming" || st === "soon") return `in ${span(s - now)}`;
  if (st === "live" || st === "started") return `Started ${span(now - s)} ago`;
  return "Ended";
}

/* ---------- formatting ---------- */
function h12(hhmm) { const [h, m] = hhmm.split(":").map(Number); return { t: `${h % 12 || 12}:${String(m).padStart(2, "0")}`, ap: h < 12 ? "AM" : "PM" }; }
/** "19:30" → "7:30 PM" */
export function fmtTime(hhmm) { if (!hhmm) return ""; const a = h12(hhmm); return `${a.t} ${a.ap}`; }
/** "16:00","21:00" → "4:00–9:00 PM"; "11:00","13:00" → "11:00 AM–1:00 PM"; "23:00","01:00" → "11:00 PM–1:00 AM"; end null → "4:00 PM" */
export function fmtRange(start, end) {
  if (!start) return "";
  if (!end) return fmtTime(start);
  const a = h12(start), b = h12(end);
  const crossesMidnight = end < start;
  return a.ap === b.ap && !crossesMidnight ? `${a.t}–${b.t} ${b.ap}` : `${a.t} ${a.ap}–${b.t} ${b.ap}`;
}
/** Compact range for tight labels (the sidebar's program lines): "19:00","23:00" → "7–11 PM"; "19:30","23:00" → "7:30–11 PM" */
export function fmtRangeCompact(start, end) {
  const c = (s) => s.replace(/:00(?= |$)/, "");
  if (!start) return "";
  if (!end) return c(fmtTime(start));
  return fmtRange(start, end).split("–").map((x) => x.replace(/:00(?=\b)/, "")).join("–");
}
/** "2026-10-08" → "Thu, Oct 8" */
export function fmtDay(date) { const [, m, d] = ymd(date); return `${DOW[weekday(date)]}, ${MON[m - 1]} ${d}`; }
/** "2026-10-08" → "Thursday, October 8" */
export function fmtDayLong(date) { const [, m, d] = ymd(date); return `${DOW_LONG[weekday(date)]}, ${MON_LONG[m - 1]} ${d}`; }
/** "2026-10-08" → "Oct 8" */
export function fmtDate(date) { const [, m, d] = ymd(date); return `${MON[m - 1]} ${d}`; }
export const dowShort = (date) => DOW[weekday(date)];
export const dowLong = (date) => DOW_LONG[weekday(date)];
export const monthLong = (date) => MON_LONG[ymd(date)[1] - 1];
/** "Oct 3–10", "Sep 30–Nov 1", "Oct 8"; "Oct 2–Feb 7" into the next year; a run of a year or more names
 *  both years ("Aug 28, 2026–Aug 13, 2027", "Oct 17, 2024–Oct 31, 2026"), which would otherwise read backwards */
export function fmtDateRange(start, end) {
  if (!end || end === start) return fmtDate(start);
  const [y1, m1, d1] = ymd(start), [y2, m2, d2] = ymd(end);
  if (y1 !== y2 && (y2 - y1 > 1 || m2 >= m1)) return `${MON[m1 - 1]} ${d1}, ${y1}–${MON[m2 - 1]} ${d2}, ${y2}`;
  return m1 === m2 ? `${MON[m1 - 1]} ${d1}–${d2}` : `${MON[m1 - 1]} ${d1}–${MON[m2 - 1]} ${d2}`;
}
/** "Sat–Sat" (a weekday span, for ranges of 2–9 days); "" otherwise */
export function fmtDowRange(start, end) {
  if (!end || end === start) return DOW[weekday(start)];
  const n = daysBetween(start, end);
  return n > 0 && n < 9 ? `${DOW[weekday(start)]}–${DOW[weekday(end)]}` : "";
}
/** ISO datetime with the New York offset, for <time datetime>: "2026-10-05T09:00-04:00" */
export function isoLocal(epoch) {
  const p = nyParts(epoch), o = offsetAt(epoch) / MIN, sign = o < 0 ? "-" : "+", a = Math.abs(o);
  return `${p.date}T${p.hhmm}${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

/* ---------- destination helpers ---------- */
const MON_SHORT = MON;
/** "2026-10-08" → "2026-10" */
export const monthKey = (date) => date.slice(0, 7);
/** "2026-10" (or "2026-10-08") → "October 2026" */
export function fmtMonth(key) { const [y, m] = key.split("-").map(Number); return `${MON_LONG[m - 1]} ${y}`; }
/** "2026-10" → "Oct" (short month) */
export const fmtMonthShort = (key) => MON_SHORT[Number(key.split("-")[1]) - 1];
/** "2026-10-08" → "Oct 8, 2026" */
export function fmtDateY(date) { const [y, m, d] = ymd(date); return `${MON[m - 1]} ${d}, ${y}`; }
/** Long-run label: "Through Jan 10" (the year is added when it differs from `fromDate`'s year) */
export function fmtThrough(end, fromDate = end) { return `Through ${end.slice(0, 4) !== fromDate.slice(0, 4) ? fmtDateY(end) : fmtDate(end)}`; }
/** Saturday or Sunday */
export const isWeekend = (date) => { const w = weekday(date); return w === 0 || w === 6; };
/** The ISO date span a "when" filter means at `now` (epoch ms, New York calendar):
 *  today → [today, today]; weekend → Fri–Sun of this week (from today when today is Fri, Sat or Sun,
 *  else the coming Fri–Sun); week → today and the next 6 days; month → today to the end of this month. */
export const WHEN = { today: "Today", weekend: "This weekend", week: "Next 7 days", month: "This month" };
export function whenRange(when, now) {
  const today = nyParts(now).date, w = weekday(today);
  if (when === "today") return [today, today];
  if (when === "weekend") {
    if (w === 5 || w === 6 || w === 0) return [today, addDays(today, w === 0 ? 0 : 7 - w)];
    return [addDays(today, 5 - w), addDays(today, 7 - w)];
  }
  if (when === "week") return [today, addDays(today, 6)];
  if (when === "month") { const [y, m] = ymd(today); return [today, new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)]; }
  return null;
}

/* ---------- event instances ---------- */
/** A date + end_date run longer than this many days (inclusive) is ONE instance (a long run: an exhibition, a
 *  season); shorter runs (a fair, a festival weekend) expand to one instance per day. Occurrences always expand. */
export const RUN_MAX_DAYS = 14;
/** Expand one event record into instances inside `window` ({start,end} ISO dates, inclusive).
 *  Multi-day items (end_date, occurrences) use start/end as daily hours. A missing end is start + 60 min
 *  (endUnknown). A missing start, or all_day, spans the day (timeUnknown / allDay). end < start ends after
 *  midnight. A run longer than `maxRunDays` (date → end_date, no occurrences) gives ONE instance, clipped to the
 *  window: s = its first day's start (or 00:00), e = its last day's end (or 24:00), with run: true and
 *  through: end_date (the unclipped last day). Pages say "Through Jan 10"; a run never claims "Now".
 *  Returns [{ date, day, s, e, lateNight, endUnknown, timeUnknown, allDay, ongoing, run, through, start, end }]. */
export function expand(ev, window, { maxRunDays = RUN_MAX_DAYS } = {}) {
  const hasOcc = Array.isArray(ev.occurrences) && ev.occurrences.length;
  if (!hasOcc && ev.end_date && ev.end_date > ev.date && daysBetween(ev.date, ev.end_date) + 1 > maxRunDays) {
    const first = window && ev.date < window.start ? window.start : ev.date;
    const last = window && ev.end_date > window.end ? window.end : ev.end_date;
    if (first > last) return [];
    const allDay = !!ev.all_day, timeUnknown = !allDay && !ev.start;
    const s = nyToEpoch(first, allDay || timeUnknown ? "00:00" : ev.start);
    const e = allDay || timeUnknown || !ev.end ? nyToEpoch(addDays(last, 1), "00:00")
      : ev.end < ev.start ? nyToEpoch(addDays(last, 1), ev.end) : nyToEpoch(last, ev.end);
    return [{ date: first, day: first, s, e, lateNight: false, endUnknown: false, timeUnknown, allDay, ongoing: true, run: true, through: ev.end_date, start: ev.start ?? null, end: ev.end ?? null }];
  }
  const occ = hasOcc
    ? ev.occurrences.map((o) => ({ date: o.date, start: o.start ?? null, end: o.end ?? null }))
    : (ev.end_date && ev.end_date !== ev.date ? dateRange(ev.date, ev.end_date) : [ev.date]).map((d) => ({ date: d, start: ev.start ?? null, end: ev.end ?? null }));
  const multi = occ.length > 1;
  const out = [];
  for (const o of occ) {
    if (window && (o.date < window.start || o.date > window.end)) continue;
    const allDay = !!ev.all_day;
    const timeUnknown = !allDay && !o.start;
    let s, e, endUnknown = false;
    if (allDay || timeUnknown) {
      s = nyToEpoch(o.date, "00:00");
      e = nyToEpoch(o.date, "23:59") + MIN;
    } else {
      s = nyToEpoch(o.date, o.start);
      if (!o.end) { e = s + HOUR; endUnknown = true; }
      else if (o.end < o.start) e = nyToEpoch(addDays(o.date, 1), o.end);
      else e = nyToEpoch(o.date, o.end);
    }
    const fd = allDay || timeUnknown ? { day: o.date, lateNight: false } : festivalDay(o.date, o.start);
    out.push({ date: o.date, day: fd.day, s, e, lateNight: fd.lateNight, endUnknown, timeUnknown, allDay, ongoing: multi || allDay || timeUnknown, run: false, through: null, start: o.start, end: o.end });
  }
  return out;
}
