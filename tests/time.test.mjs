/* tests/time.test.mjs · OWNER: E1 (ported from Cincy Week) · site/js/lib/time.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "../site/js/lib/time.js";

test("nyToEpoch: October is UTC−4 (EDT)", () => {
  assert.equal(new Date(T.nyToEpoch("2026-10-05", "09:00")).toISOString(), "2026-10-05T13:00:00.000Z");
  assert.equal(new Date(T.nyToEpoch("2026-10-11", "23:30")).toISOString(), "2026-10-12T03:30:00.000Z");
  assert.equal(T.offsetAt(T.nyToEpoch("2026-10-08", "12:00")), -4 * T.HOUR);
});

test("nyToEpoch: winter is UTC−5 and the Nov 1 fall-back ambiguity resolves to the first 1:30 AM (EDT)", () => {
  assert.equal(new Date(T.nyToEpoch("2026-12-01", "09:00")).toISOString(), "2026-12-01T14:00:00.000Z");
  assert.equal(new Date(T.nyToEpoch("2026-11-01", "01:30")).toISOString(), "2026-11-01T05:30:00.000Z");
  assert.equal(new Date(T.nyToEpoch("2026-11-01", "03:00")).toISOString(), "2026-11-01T08:00:00.000Z");
});

test("nyParts round-trips nyToEpoch", () => {
  const e = T.nyToEpoch("2026-10-08", "16:40");
  assert.deepEqual(T.nyParts(e), { date: "2026-10-08", minutes: 16 * 60 + 40, weekday: 4, hhmm: "16:40" });
  assert.equal(T.nyParts(T.nyToEpoch("2026-10-09", "00:00")).hhmm, "00:00");
  assert.equal(T.isoLocal(T.nyToEpoch("2026-10-05", "09:00")), "2026-10-05T09:00-04:00");
});

test("festivalDay: 00:30 belongs to the previous day; 05:00 does not", () => {
  assert.deepEqual(T.festivalDay("2026-10-10", "00:30"), { day: "2026-10-09", lateNight: true });
  assert.deepEqual(T.festivalDay("2026-10-10", "04:59"), { day: "2026-10-09", lateNight: true });
  assert.deepEqual(T.festivalDay("2026-10-10", "05:00"), { day: "2026-10-10", lateNight: false });
  assert.equal(T.addDays("2026-10-01", -1), "2026-09-30");
});

test("bucket: morning / afternoon / evening / late", () => {
  assert.equal(T.bucket("08:30"), "morning");
  assert.equal(T.bucket("11:59"), "morning");
  assert.equal(T.bucket("12:00"), "afternoon");
  assert.equal(T.bucket("16:59"), "afternoon");
  assert.equal(T.bucket("17:00"), "evening");
  assert.equal(T.bucket("21:00"), "late");
  assert.equal(T.bucket("00:30"), "late");
  assert.equal(T.bucket(null), "allday");
});

test("status transitions at the boundaries", () => {
  const s = T.nyToEpoch("2026-10-08", "16:00"), e = T.nyToEpoch("2026-10-08", "21:00");
  assert.equal(T.status(s, e, s - 31 * T.MIN), "upcoming");
  assert.equal(T.status(s, e, s - 30 * T.MIN), "soon");
  assert.equal(T.status(s, e, s - 1), "soon");
  assert.equal(T.status(s, e, s), "live");
  assert.equal(T.status(s, e, e - 1), "live");
  assert.equal(T.status(s, e, e), "past");
  assert.equal(T.status(s, s + T.HOUR, s + 5 * T.MIN, true), "started", "no end time listed never claims live");
  assert.equal(T.relTime(s, e, s - 20 * T.MIN), "in 20 min");
  assert.equal(T.relTime(s, e, s + 40 * T.MIN), "Started 40 min ago");
  assert.equal(T.relTime(s, e, s - 130 * T.MIN), "in 2 h 10 min");
});

test("expand: a missing end is start + 60 min; after-midnight ends; multi-day daily hours; window clipping", () => {
  const [a] = T.expand({ date: "2026-10-05", start: "08:30", end: null }, null);
  assert.equal(a.e - a.s, T.HOUR);
  assert.ok(a.endUnknown);
  const [b] = T.expand({ date: "2026-10-09", start: "21:00", end: "02:00" }, null);
  assert.equal(new Date(b.e).toISOString(), "2026-10-10T06:00:00.000Z");
  assert.equal(b.day, "2026-10-09");
  const [c] = T.expand({ date: "2026-10-10", start: "00:30", end: "02:00" }, null);
  assert.equal(c.day, "2026-10-09");
  assert.ok(c.lateNight);
  const multi = T.expand({ date: "2026-10-08", end_date: "2026-10-11", start: "19:00", end: "23:00" }, null);
  assert.equal(multi.length, 4);
  assert.ok(multi.every((x) => x.ongoing && x.e - x.s === 4 * T.HOUR));
  const clipped = T.expand({ date: "2026-10-01", end_date: "2026-10-14", start: null, end: null }, { start: "2026-10-05", end: "2026-10-18" });
  assert.equal(clipped.length, 10, "a 14-day run expands per day, clipped to the window");
  assert.ok(clipped[0].timeUnknown && clipped[0].date === "2026-10-05");
  const occ = T.expand({ date: "2026-10-05", occurrences: [{ date: "2026-10-05", start: "10:00", end: "11:00" }, { date: "2026-10-07", start: "14:00", end: "15:00" }] }, null);
  assert.deepEqual(occ.map((x) => x.date), ["2026-10-05", "2026-10-07"]);
});

test("formatting follows the design voice", () => {
  assert.equal(T.fmtTime("19:30"), "7:30 PM");
  assert.equal(T.fmtTime("00:00"), "12:00 AM");
  assert.equal(T.fmtTime("12:00"), "12:00 PM");
  assert.equal(T.fmtRange("16:00", "21:00"), "4:00–9:00 PM");
  assert.equal(T.fmtRange("11:00", "13:00"), "11:00 AM–1:00 PM", "across noon");
  assert.equal(T.fmtRange("23:00", "01:00"), "11:00 PM–1:00 AM", "across midnight");
  assert.equal(T.fmtRange("09:00", "10:30"), "9:00–10:30 AM");
  assert.equal(T.fmtRange("08:30", null), "8:30 AM");
  assert.equal(T.fmtRangeCompact("19:00", "23:00"), "7–11 PM");
  assert.equal(T.fmtRangeCompact("19:30", "23:00"), "7:30–11 PM");
  assert.equal(T.fmtRangeCompact("11:00", "13:00"), "11 AM–1 PM");
  assert.equal(T.fmtDay("2026-10-08"), "Thu, Oct 8");
  assert.equal(T.fmtDayLong("2026-10-08"), "Thursday, October 8");
  assert.equal(T.fmtDateRange("2026-10-03", "2026-10-10"), "Oct 3–10");
  assert.equal(T.fmtDateRange("2026-09-30", "2026-11-01"), "Sep 30–Nov 1");
  assert.equal(T.fmtDowRange("2026-10-03", "2026-10-10"), "Sat–Sat");
  assert.equal(T.fmtDowRange("2026-09-30", "2026-11-01"), "");
});

test("expand: a run longer than 14 days is ONE instance, clipped to the window, flagged run with its last day", () => {
  const W = { start: "2026-09-28", end: "2027-04-30" };
  const [r, ...rest] = T.expand({ date: "2026-09-01", end_date: "2027-01-10", start: null, end: null }, W);
  assert.equal(rest.length, 0);
  assert.ok(r.run && r.ongoing && r.timeUnknown && !r.endUnknown);
  assert.equal(r.date, "2026-09-28", "starts on the window's first day");
  assert.equal(r.through, "2027-01-10");
  assert.equal(r.s, T.nyToEpoch("2026-09-28", "00:00"));
  assert.equal(r.e, T.nyToEpoch("2027-01-11", "00:00"));
  const [h] = T.expand({ date: "2026-10-03", end_date: "2026-11-30", start: "10:00", end: "17:00" }, W);
  assert.equal(h.s, T.nyToEpoch("2026-10-03", "10:00"));
  assert.equal(h.e, T.nyToEpoch("2026-11-30", "17:00"));
  const [past] = [T.expand({ date: "2026-10-01", end_date: "2027-06-30" }, W)[0]];
  assert.equal(past.e, T.nyToEpoch("2027-05-01", "00:00"), "clipped to the window's last day");
  assert.equal(past.through, "2027-06-30", "…but through names the real last day");
  assert.equal(T.RUN_MAX_DAYS, 14);
  assert.equal(T.expand({ date: "2026-10-01", end_date: "2026-10-14" }, W).length, 14, "14 days expand per day");
  assert.equal(T.expand({ date: "2026-10-01", end_date: "2026-10-15" }, W).length, 1, "15 days are one run");
});

test("helpers: months, weekends, through, whenRange", () => {
  assert.equal(T.monthKey("2026-10-08"), "2026-10");
  assert.equal(T.fmtMonth("2027-01"), "January 2027");
  assert.equal(T.fmtDateY("2026-10-08"), "Oct 8, 2026");
  assert.equal(T.fmtThrough("2026-12-31", "2026-10-03"), "Through Dec 31");
  assert.equal(T.fmtThrough("2027-01-10", "2026-10-03"), "Through Jan 10, 2027");
  assert.ok(T.isWeekend("2026-10-10") && T.isWeekend("2026-10-11") && !T.isWeekend("2026-10-09"));
  const wed = T.nyToEpoch("2026-10-07", "12:00"), sat = T.nyToEpoch("2026-10-10", "12:00"), sun = T.nyToEpoch("2026-10-11", "12:00");
  assert.deepEqual(T.whenRange("today", wed), ["2026-10-07", "2026-10-07"]);
  assert.deepEqual(T.whenRange("weekend", wed), ["2026-10-09", "2026-10-11"], "midweek: the coming Fri–Sun");
  assert.deepEqual(T.whenRange("weekend", sat), ["2026-10-10", "2026-10-11"]);
  assert.deepEqual(T.whenRange("weekend", sun), ["2026-10-11", "2026-10-11"]);
  assert.deepEqual(T.whenRange("week", wed), ["2026-10-07", "2026-10-13"]);
  assert.deepEqual(T.whenRange("month", wed), ["2026-10-07", "2026-10-31"]);
  assert.deepEqual(T.whenRange("month", T.nyToEpoch("2027-02-10", "12:00")), ["2027-02-10", "2027-02-28"]);
  assert.equal(T.whenRange("nope", wed), null);
});
