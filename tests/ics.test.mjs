/* tests/ics.test.mjs · OWNER: E2 (client runtime; ported from Cincy Week, Agent D) · site/js/lib/ics.js
   (RFC 5545 output for the event dialog's "Add to calendar" and My Trip's calendar export) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { vcalendar, vevent, fold, escText, utc, gcalUrl, icsFilename, nextDay, eventItems, consecutive } from "../site/js/lib/ics.js";
import { nyToEpoch, expand } from "../site/js/lib/time.js";

const octets = (s) => new TextEncoder().encode(s).length;
const unfold = (text) => text.replace(/\r\n /g, "");
const WINDOW = { start: "2026-09-28", end: "2027-04-30" };
const FLAGS = (x) => (x.endUnknown ? 1 : 0) | (x.timeUnknown ? 2 : 0) | (x.allDay ? 4 : 0) | (x.ongoing ? 8 : 0) | (x.lateNight ? 16 : 0) | (x.run ? 32 : 0);
/** An events.json event (build/core/client-data.mjs) from a data record, through the same expand() the build uses. */
const client = (rec, extra = {}) => ({ id: rec.id, t: rec.title, r: rec.region || "tampa", pl: rec.place || null, lt: rec.location_text || null, ll: null, c: rec.cost || null, f: rec.is_free === true ? 1 : null, u: rec.url || null, src: rec.source_url || "https://example.org/", st: rec.status || "scheduled", tt: rec.time_text || null, sm: rec.summary || null, ed: rec.end_date || null, i: expand(rec, WINDOW).map((x) => [x.day, x.s, x.e, FLAGS(x)]), ...extra });
const DATA = { regions: { tampa: { n: "Tampa" }, stpete: { n: "St. Petersburg" } }, places: { "curtis-hixon-waterfront-park": { n: "Curtis Hixon Waterfront Park", ad: "600 N Ashley Dr, Tampa, FL 33602", ll: [27.951, -82.461] } } };
const BASE = "https://fritzhand.github.io/visit-tampa-bay/";

test("utc() writes basic-format UTC with Z; October is EDT, December EST", () => {
  assert.equal(utc(Date.UTC(2026, 9, 24, 23, 0, 0)), "20261024T230000Z");
  assert.equal(utc(nyToEpoch("2026-10-24", "19:00")), "20261024T230000Z");
  assert.equal(utc(nyToEpoch("2026-12-12", "18:30")), "20261212T233000Z");
  assert.equal(nextDay("2026-10-31"), "2026-11-01");
});

test("TEXT escaping: backslash, semicolon, comma, newline; control characters dropped", () => {
  assert.equal(escText("a;b,c\\d"), "a\\;b\\,c\\\\d");
  assert.equal(escText("line one\r\nline two\nthree"), "line one\\nline two\\nthree");
  assert.equal(escText("tab\there\u0007bell"), "tab\there" + "bell");
  assert.equal(escText(null), "");
});

test("fold(): 75 octets per line, continuation lines start with a space, UTF-8 never split", () => {
  assert.equal(fold("SUMMARY:short"), "SUMMARY:short");
  const long = "DESCRIPTION:" + "Gasparilla — “the pirate invasion” ⚓ comes up Bayshore Boulevard. ".repeat(6);
  const lines = fold(long).split("\r\n");
  assert.ok(lines.length > 3);
  for (const [i, l] of lines.entries()) {
    assert.ok(octets(l) <= 75, `line ${i} has ${octets(l)} octets`);
    if (i > 0) assert.equal(l[0], " ");
  }
  assert.equal(unfold(fold(long)), long, "unfolding restores the line exactly");
  const emoji = "X:" + "😀".repeat(40);
  for (const l of fold(emoji).split("\r\n")) assert.ok(octets(l) <= 75);
  assert.equal(unfold(fold(emoji)), emoji);
});

test("vcalendar(): CRLF everywhere, the guide's name, UTC times, one VEVENT per item, no invented end", () => {
  const s = nyToEpoch("2026-10-02", "18:00"), e = nyToEpoch("2026-10-02", "21:00");
  const ics = vcalendar([
    { uid: "riverwalk-concert-2026-10-02", title: "Concert; on the river, free", s, e, location: "Curtis Hixon Waterfront Park, Tampa", geo: [27.951, -82.461], description: "Free.\nBring a chair.", url: `${BASE}whats-on.html?e=x#e-x`, category: "Tampa" },
    { uid: "game", title: "A game", s: nyToEpoch("2026-10-10", "19:00"), e: null },
  ], { name: "My Trip · Tampa Bay Chartbook", stamp: Date.UTC(2026, 8, 27, 12, 0, 0) });
  assert.ok(ics.endsWith("\r\n"));
  assert.ok(!/[^\r]\n/.test(ics), "every line ends in CRLF");
  const L = unfold(ics).split("\r\n");
  assert.equal(L[0], "BEGIN:VCALENDAR");
  assert.ok(L.includes("PRODID:-//Tampa Bay Chartbook//Visitor guide//EN"));
  assert.ok(L.includes("X-WR-CALNAME:My Trip · Tampa Bay Chartbook"));
  assert.equal(L.filter((l) => l === "BEGIN:VEVENT").length, 2);
  assert.ok(L.includes("UID:riverwalk-concert-2026-10-02@fritzhand.github.io"));
  assert.ok(L.includes("DTSTAMP:20260927T120000Z"));
  assert.ok(L.includes("DTSTART:20261002T220000Z"));
  assert.ok(L.includes("DTEND:20261003T010000Z"));
  assert.ok(L.includes("SUMMARY:Concert\\; on the river\\, free"));
  assert.ok(L.includes("GEO:27.951;-82.461"));
  assert.ok(L.includes("DESCRIPTION:Free.\\nBring a chair."));
  const game = L.slice(L.lastIndexOf("BEGIN:VEVENT"));
  assert.ok(game.includes("DTSTART:20261010T230000Z"));
  assert.ok(!game.some((l) => l.startsWith("DTEND")), "no DTEND when the end time is not listed");
});

test("all-day spans use VALUE=DATE with an exclusive end; statuses; safe UIDs", () => {
  const L = vevent({ uid: "show", title: "Exhibition", allDay: { start: "2026-10-03", end: "2027-01-10" } }, { stamp: 0 });
  assert.ok(L.includes("DTSTART;VALUE=DATE:20261003"));
  assert.ok(L.includes("DTEND;VALUE=DATE:20270111"));
  assert.ok(L.includes("TRANSP:TRANSPARENT"));
  assert.ok(vevent({ uid: "y", title: "Gone", s: 0, e: 3600000, status: "CANCELLED" }, { stamp: 0 }).includes("STATUS:CANCELLED"));
  assert.ok(vevent({ uid: "y", title: "Maybe", s: 0, status: "TENTATIVE" }, { stamp: 0 }).includes("STATUS:TENTATIVE"));
  assert.ok(vevent({ uid: "a b/c", title: "t", s: 0 }, { stamp: 0 }).includes("UID:a-b-c@fritzhand.github.io"));
});

test("eventItems: a timed evening, with the place's address and the guide's link", () => {
  const ev = client({ id: "riverwalk-concert-2026-10-02", title: "Riverwalk concert", place: "curtis-hixon-waterfront-park", date: "2026-10-02", start: "18:00", end: "21:00", is_free: true, summary: "A free concert." });
  const [it, ...rest] = eventItems(ev, DATA, { base: BASE });
  assert.equal(rest.length, 0);
  assert.equal(it.uid, "riverwalk-concert-2026-10-02");
  assert.equal(it.location, "Curtis Hixon Waterfront Park, 600 N Ashley Dr, Tampa, FL 33602");
  assert.deepEqual(it.geo, [27.951, -82.461], "the place's coordinates when the event has none");
  assert.equal(it.category, "Tampa");
  assert.equal(it.url, `${BASE}whats-on.html?e=riverwalk-concert-2026-10-02#e-riverwalk-concert-2026-10-02`);
  assert.match(it.description, /A free concert\.\n\nFree\./);
  assert.match(it.description, /Tampa Bay Chartbook: https:/);
});

test("eventItems: end not listed, occurrences, a 12-day fair, hours not listed, a long run, cancelled", () => {
  const game = eventItems(client({ id: "game", title: "Game", location_text: "Arena", date: "2026-10-10", start: "19:00" }), DATA);
  assert.equal(game[0].e, null);
  assert.match(game[0].description, /End time not listed\./);
  const market = eventItems(client({ id: "market", title: "Market", location_text: "Downtown", date: "2026-10-03", occurrences: [{ date: "2026-10-03", start: "09:00", end: "14:00" }, { date: "2026-10-10", start: "09:00", end: "14:00" }, { date: "2026-10-17", start: "09:00", end: "13:00" }] }), DATA);
  assert.deepEqual(market.map((x) => x.uid), ["market-2026-10-03", "market-2026-10-10", "market-2026-10-17"]);
  const fair = eventItems(client({ id: "fair", title: "Fair", location_text: "Fairgrounds", date: "2027-02-05", end_date: "2027-02-16", start: "10:00", end: "22:00" }), DATA);
  assert.equal(fair.length, 12, "a 12-day fair is 12 timed days");
  const untimed = eventItems(client({ id: "u", title: "Three Saturdays", location_text: "Park", date: "2026-10-03", occurrences: [{ date: "2026-10-03" }, { date: "2026-10-10" }, { date: "2026-10-17" }] }), DATA);
  assert.deepEqual(untimed.map((x) => [x.allDay.start, x.allDay.end]), [["2026-10-03", "2026-10-03"], ["2026-10-10", "2026-10-10"], ["2026-10-17", "2026-10-17"]], "never one span over the days between");
  assert.match(untimed[0].description, /Time not listed\./);
  const weekend = eventItems(client({ id: "w", title: "Weekend festival", location_text: "Park", date: "2026-11-07", end_date: "2026-11-08", time_text: "Gates open at 11 a.m." }), DATA);
  assert.deepEqual(weekend.map((x) => [x.allDay.start, x.allDay.end]), [["2026-11-07", "2026-11-08"]], "consecutive untimed days are one span");
  assert.match(weekend[0].description, /Time: Gates open at 11 a\.m\./);
  const run = eventItems(client({ id: "show", title: "Exhibition", location_text: "Museum", date: "2026-09-01", end_date: "2027-06-30", start: "10:00", end: "17:00" }), DATA);
  assert.equal(run.length, 1);
  assert.deepEqual(run[0].allDay, { start: "2026-09-28", end: "2027-06-30" }, "from its first day in the window to its real last day");
  assert.match(run[0].description, /Through Jun 30, 2027\. Hours: 10:00 AM–5:00 PM daily\./);
  const gone = eventItems(client({ id: "parade", title: "Parade", location_text: "River", date: "2026-12-12", start: "18:30", status: "cancelled" }), DATA);
  assert.equal(gone[0].status, "CANCELLED");
  assert.match(gone[0].description, /^Cancelled\./);
  assert.deepEqual(eventItems({ id: "none", t: "x", i: [] }, DATA), []);
  assert.deepEqual(consecutive(["2026-10-04", "2026-10-03", "2026-10-10"]), [["2026-10-03", "2026-10-04"], ["2026-10-10"]]);
});

test("Google Calendar link and file names", () => {
  const s = nyToEpoch("2026-10-24", "16:00"), e = nyToEpoch("2026-10-24", "23:00");
  const u = new URL(gcalUrl({ title: "Guavaween & more", s, e, location: "Ybor City", description: "Parade" }));
  assert.equal(u.origin + u.pathname, "https://calendar.google.com/calendar/render");
  assert.equal(u.searchParams.get("action"), "TEMPLATE");
  assert.equal(u.searchParams.get("text"), "Guavaween & more");
  assert.equal(u.searchParams.get("dates"), "20261024T200000Z/20261025T030000Z");
  assert.equal(new URL(gcalUrl({ title: "x", s, e: null })).searchParams.get("dates"), "20261024T200000Z/20261024T200000Z");
  assert.equal(new URL(gcalUrl({ title: "x", allDay: { start: "2027-02-05", end: "2027-02-16" } })).searchParams.get("dates"), "20270205/20270217");
  assert.equal(icsFilename("Gasparilla Pirate Fest 2027"), "gasparilla-pirate-fest-2027.ics");
  assert.equal(icsFilename("Café — “Première”"), "cafe-premiere.ics");
  assert.equal(icsFilename(""), "tampa-bay-chartbook.ics");
});
