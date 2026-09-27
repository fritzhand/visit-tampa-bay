/* ============================================================
   site/js/lib/ics.js · OWNER: E2 (client runtime; ported from Cincy Week, Agent D) · PURE (no DOM)
   iCalendar (RFC 5545) for the event dialog's "Add to calendar" and My Trip's
   calendar export. Imported lazily by core/event-dialog.js and core/trip-view.js,
   and by tests/ics.test.mjs.

   vcalendar(items, { name, stamp, domain }) → text with CRLF line endings, lines folded at 75 octets
   (UTF-8 safe), TEXT values escaped (\ ; , newline), times in UTC "Z" (no VTIMEZONE: calendar apps show
   local time). One VEVENT per item. An item is
     { uid, title, s, e?, allDay?: { start, end }, allDayDate?, location?, geo?: [lat, lng],
       description?, url?, category?, status?: "CANCELLED" | "TENTATIVE", transparent? }
   - s / e are epoch ms. e null = end time not listed: DTEND is left out rather than invented (RFC 5545
     §3.6.1: the event then ends when it starts) and the description says so.
   - allDay { start, end } (ISO dates, end inclusive) gives VALUE=DATE with an exclusive DTEND.
   eventItems(ev, data, { base, text }) turns one assets/data/events.json event into items:
   - timed instances → one item each (end left out when not listed);
   - instances without hours (all day, or time not listed) → one all-day item per run of consecutive days;
   - a long run (flag 32) → one all-day span from its first listed day to its real last day (ed),
     with its daily hours in the description.
   gcalUrl(item) → a Google Calendar "render" link for one item (widely used, not formally documented,
   so the .ics download stays the primary action).
   ============================================================ */
import { nyParts, fmtRange, fmtTime, fmtThrough, addDays } from "./time.js";

const pad = (n) => String(n).padStart(2, "0");
export const APP_NAME = "Tampa Bay Chartbook";

/** epoch ms → "20261024T230000Z" */
export const utc = (epoch) => { const d = new Date(epoch); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`; };
/** "2026-10-24" → "20261024" */
export const ymd = (iso) => iso.replace(/-/g, "");
/** The day after an ISO date (DTEND of an all-day span is exclusive). */
export const nextDay = (iso) => addDays(iso, 1);

/** TEXT escaping (RFC 5545 §3.3.11): backslash, semicolon, comma and newlines; other control characters dropped. */
export const escText = (s) => String(s ?? "")
  .replace(/\r\n?/g, "\n")
  .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
  .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

const enc = new TextEncoder();
/** Fold a content line at 75 octets without splitting a UTF-8 sequence (continuation lines start with one space). */
export function fold(line) {
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let cur = "", n = 0, limit = 75;
  for (const ch of line) {
    const len = enc.encode(ch).length;
    if (n + len > limit) { out.push(cur); cur = ""; n = 0; limit = 74; }
    cur += ch; n += len;
  }
  out.push(cur);
  return out.join("\r\n ");
}

/** A URI value: no escaping, but never a line break or a space. */
const uri = (u) => String(u).replace(/[\r\n\s]+/g, "");

export function vevent(ev, { stamp = Date.now(), domain = "fritzhand.github.io" } = {}) {
  const L = ["BEGIN:VEVENT", `UID:${String(ev.uid).replace(/[^\w.@-]/g, "-")}@${domain}`, `DTSTAMP:${utc(stamp)}`];
  const span = ev.allDay || (ev.allDayDate ? { start: ev.allDayDate, end: ev.allDayDate } : null);
  if (span) {
    L.push(`DTSTART;VALUE=DATE:${ymd(span.start)}`, `DTEND;VALUE=DATE:${ymd(nextDay(span.end || span.start))}`);
  } else {
    L.push(`DTSTART:${utc(ev.s)}`);
    if (ev.e != null && ev.e > ev.s) L.push(`DTEND:${utc(ev.e)}`);
  }
  L.push(`SUMMARY:${escText(ev.title)}`);
  if (ev.location) L.push(`LOCATION:${escText(ev.location)}`);
  if (Array.isArray(ev.geo) && ev.geo.length === 2 && ev.geo.every((x) => typeof x === "number" && isFinite(x))) L.push(`GEO:${ev.geo[0]};${ev.geo[1]}`);
  if (ev.description) L.push(`DESCRIPTION:${escText(ev.description)}`);
  if (ev.url) L.push(`URL:${uri(ev.url)}`);
  if (ev.category) L.push(`CATEGORIES:${escText(ev.category)}`);
  if (ev.status === "CANCELLED" || ev.status === "TENTATIVE") L.push(`STATUS:${ev.status}`);
  if (ev.transparent || span) L.push("TRANSP:TRANSPARENT");
  L.push("END:VEVENT");
  return L;
}

export function vcalendar(items, { name = APP_NAME, stamp = Date.now(), domain = "fritzhand.github.io" } = {}) {
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${APP_NAME}//Visitor guide//EN`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${escText(name)}`];
  for (const ev of items) L.push(...vevent(ev, { stamp, domain }));
  L.push("END:VCALENDAR");
  return L.map(fold).join("\r\n") + "\r\n";
}

/** Google Calendar template link for one item (zero-length when the end time is not listed). */
export function gcalUrl(ev) {
  const span = ev.allDay || (ev.allDayDate ? { start: ev.allDayDate, end: ev.allDayDate } : null);
  const dates = span ? `${ymd(span.start)}/${ymd(nextDay(span.end || span.start))}` : `${utc(ev.s)}/${utc(ev.e != null && ev.e > ev.s ? ev.e : ev.s)}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: ev.title || "", dates });
  if (ev.description) q.set("details", ev.description);
  if (ev.location) q.set("location", ev.location);
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** "Guavaween 2026" → "guavaween-2026.ics" */
export function icsFilename(title, fallback = "tampa-bay-chartbook") {
  const s = String(title || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
  return `${s || fallback}.ics`;
}

/** Split sorted ISO dates into runs of consecutive days: [["2026-10-03","2026-10-04"],["2026-10-10"]] */
export function consecutive(dates) {
  const out = [];
  for (const d of [...new Set(dates)].sort()) {
    const last = out[out.length - 1];
    if (last && nextDay(last[last.length - 1]) === d) last.push(d); else out.push([d]);
  }
  return out;
}

const shorten = (s, n) => { const t = String(s || "").replace(/\s+/g, " ").trim(); if (t.length <= n) return t; const i = t.lastIndexOf(" ", n); return `${t.slice(0, i > n * 0.6 ? i : n).replace(/[\s,.;:–—-]+$/, "")}…`; };

/** One assets/data/events.json event → vcalendar() items.
 *  data = the events.json object (places, regions, series); base = the absolute site root
 *  ("https://fritzhand.github.io/visit-tampa-bay/"); ev.d = the verbatim description (event-text.json) when loaded.
 *  Flags: 1 endUnknown · 2 timeUnknown · 4 allDay · 8 ongoing · 16 lateNight · 32 run. */
export function eventItems(ev, data = {}, { base = "", maxDesc = 500 } = {}) {
  const inst = ev.i || [];
  if (!inst.length) return [];
  const pl = ev.pl && data.places ? data.places[ev.pl] : null;
  const location = pl ? [pl.n, pl.ad].filter(Boolean).join(", ") : ev.lt || "";
  const geo = ev.ll || (pl && pl.ll) || null;
  const link = `${base}whats-on.html?e=${ev.id}#e-${ev.id}`;
  const region = data.regions && data.regions[ev.r] ? data.regions[ev.r].n : "";
  const status = ev.st === "cancelled" ? "CANCELLED" : ev.st === "postponed" || ev.st === "tentative" ? "TENTATIVE" : null;
  const statusLine = ev.st === "cancelled" ? "Cancelled." : ev.st === "postponed" ? "Postponed." : ev.st === "tentative" ? "Tentative." : "";
  const cost = ev.c ? `Cost: ${ev.c}` : ev.f === 1 ? "Free." : "";
  const text = (extra) => [statusLine, ev.sm || "", ev.d ? `“${shorten(ev.d, maxDesc)}”` : "", extra, cost, ev.u ? `Official page: ${ev.u}` : "", ev.src && ev.src !== ev.u ? `Source: ${ev.src}` : "", `${APP_NAME}: ${link}`].filter(Boolean).join("\n\n");
  const common = { title: ev.t, location, geo, url: link, category: region, status };
  const hm = (t) => nyParts(t).hhmm;

  // a long run: one all-day span over its dates, its daily hours in the text
  if (inst.length === 1 && inst[0][3] & 32) {
    const [day, s, e, f] = inst[0];
    const hours = f & 4 ? "All day." : f & 2 ? (ev.tt ? `Hours: ${ev.tt}` : "Hours not listed.") : `Hours: ${f & 1 ? fmtTime(hm(s)) : fmtRange(hm(s), hm(e))} daily.`;
    return [{ ...common, uid: ev.id, allDay: { start: day, end: ev.ed && ev.ed >= day ? ev.ed : nyParts(e - 1).date }, description: text(`${ev.ed ? fmtThrough(ev.ed, day) + ". " : ""}${hours}`) }];
  }
  const items = [];
  const untimed = inst.filter(([, , , f]) => f & 6);
  for (const days of consecutive(untimed.map(([day]) => day))) {
    const f = untimed.find(([d]) => d === days[0])[3];
    items.push({ ...common, uid: untimed.length > 1 ? `${ev.id}-${days[0]}` : ev.id, allDay: { start: days[0], end: days[days.length - 1] }, description: text(f & 4 ? "All day." : ev.tt ? `Time: ${ev.tt}` : "Time not listed.") });
  }
  const multi = inst.length > 1;
  for (const [day, s, e, f] of inst) {
    if (f & 6) continue;
    items.push({ ...common, uid: multi ? `${ev.id}-${day}` : ev.id, s, e: f & 1 ? null : e, description: text(f & 1 ? "End time not listed." : "") });
  }
  return items.sort((a, b) => (a.s ?? Date.parse(a.allDay.start)) - (b.s ?? Date.parse(b.allDay.start)));
}
