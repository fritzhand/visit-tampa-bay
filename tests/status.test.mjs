/* tests/status.test.mjs · OWNER: E2 (client runtime) · site/js/lib/status.js (every live state word on the site) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { liveState, stateInput, dayWord, dateWord } from "../site/js/lib/status.js";
import { nyToEpoch, HOUR, MIN } from "../site/js/lib/time.js";

const at = (d, t = "12:00") => nyToEpoch(d, t);
const S = (x, now) => { const r = liveState(x, now); return [r.st, r.label]; };
// Oct 2026: Thu 8, Fri 9, Sat 10, Sun 11 … Wed 21, Fri 23, Sat 24, Sun 25
const guavaween = { s: at("2026-10-24", "16:00"), e: at("2026-10-24", "23:00") };

test("a timed event: day words, then In 20 min, Now, Ended", () => {
  assert.deepEqual(S(guavaween, at("2026-10-12")), ["upcoming", ""]);
  assert.deepEqual(S(guavaween, at("2026-10-21")), ["upcoming", "This weekend"], "Wednesday: the coming Fri–Sun");
  assert.deepEqual(S(guavaween, at("2026-10-23")), ["upcoming", "Tomorrow"]);
  assert.deepEqual(S(guavaween, at("2026-10-24", "10:00")), ["upcoming", "Today"]);
  assert.deepEqual(S(guavaween, at("2026-10-24", "15:40")), ["soon", "In 20 min"]);
  assert.deepEqual(S(guavaween, at("2026-10-24", "17:00")), ["live", "Now"]);
  assert.deepEqual(S(guavaween, at("2026-10-24", "23:00")), ["past", "Ended"]);
});

test("no end time: Started for the rest of its day, never Now; Ended once the day is over", () => {
  const s = at("2026-10-10", "19:00"), x = { s, e: s + HOUR, endUnknown: true };
  assert.deepEqual(S(x, s - 10 * MIN), ["soon", "In 10 min"]);
  assert.deepEqual(S(x, s + 30 * MIN), ["started", "Started"]);
  assert.deepEqual(S(x, at("2026-10-10", "23:50")), ["started", "Started"], "the source gives no end: no claim it ended");
  assert.deepEqual(S(x, at("2026-10-11", "00:10")), ["past", "Ended"]);
  for (let t = s - HOUR; t < s + 6 * HOUR; t += 10 * MIN) assert.notEqual(liveState(x, t).label, "Now");
});

test("no start time: day words only (Today), never a time state", () => {
  const x = { s: at("2026-10-24", "00:00"), e: at("2026-10-25", "00:00"), timeUnknown: true };
  assert.deepEqual(S(x, at("2026-10-23", "23:50")), ["upcoming", "Tomorrow"], "never In 10 min");
  assert.deepEqual(S(x, at("2026-10-24", "03:00")), ["today", "Today"]);
  assert.deepEqual(S(x, at("2026-10-25", "09:00")), ["past", "Ended"]);
  // several days (a market on three Saturdays), hours not listed: the days decide
  const m = { s: at("2026-10-03", "00:00"), e: at("2026-10-04", "00:00"), timeUnknown: true, days: ["2026-10-17", "2026-10-03", "2026-10-10"] };
  assert.deepEqual(S(m, at("2026-10-05")), ["upcoming", "This weekend"], "Monday: Sat Oct 10 is this weekend");
  assert.deepEqual(S(m, at("2026-10-10", "18:00")), ["today", "Today"]);
  assert.deepEqual(S(m, at("2026-10-12")), ["upcoming", "This weekend"], "Monday Oct 12: Sat Oct 17");
  assert.deepEqual(S({ ...m, days: ["2026-10-03", "2026-10-31"] }, at("2026-10-12")), ["upcoming", ""]);
  assert.deepEqual(S(m, at("2026-10-18")), ["past", "Ended"]);
});

test("all day: Today on the day, not Now at 3 AM, and no countdown the night before", () => {
  const x = { s: at("2026-10-24", "00:00"), e: at("2026-10-25", "00:00"), allDay: true };
  assert.deepEqual(S(x, at("2026-10-23", "23:45")), ["upcoming", "Tomorrow"]);
  assert.deepEqual(S(x, at("2026-10-24", "03:00")), ["today", "Today"]);
  assert.deepEqual(S(x, at("2026-10-25", "00:01")), ["past", "Ended"]);
});

test("a long run never says Now; before it opens it counts down only when its hours are listed", () => {
  const untimed = { s: at("2026-10-03", "00:00"), e: at("2027-01-11", "00:00"), run: true, timeUnknown: true };
  assert.deepEqual(S(untimed, at("2026-10-01")), ["upcoming", "This weekend"], "Thursday Oct 1: Sat Oct 3 is this weekend");
  assert.deepEqual(S(untimed, at("2026-10-02", "23:50")), ["upcoming", "Tomorrow"]);
  for (let t = at("2026-10-03", "00:00"); t < at("2027-01-11", "00:00"); t += 7 * HOUR) assert.deepEqual(S(untimed, t), ["running", ""]);
  assert.deepEqual(S(untimed, at("2027-01-11", "08:00")), ["past", "Ended"]);
  const timed = { s: at("2026-10-03", "10:00"), e: at("2027-01-10", "17:00"), run: true };
  assert.deepEqual(S(timed, at("2026-10-03", "09:40")), ["soon", "In 20 min"]);
  assert.deepEqual(S(timed, at("2026-10-03", "12:00")), ["running", ""]);
  assert.deepEqual(S(timed, at("2026-12-01", "03:00")), ["running", ""], "3 AM mid-run: no Now");
});

test("several days with hours follow the current, else the next day", () => {
  const days = ["2027-02-05", "2027-02-06", "2027-02-07"];
  const inst = days.map((d) => [at(d, "10:00"), at(d, "22:00")]);
  const x = { s: inst[0][0], e: inst[0][1], inst };
  assert.deepEqual(S(x, at("2027-02-06", "23:00")), ["upcoming", "Tomorrow"], "between days: the next one");
  assert.deepEqual(S(x, at("2027-02-07", "11:00")), ["live", "Now"]);
  assert.deepEqual(S(x, at("2027-02-08")), ["past", "Ended"]);
});

test("cancelled and postponed items get no state at all", () => {
  assert.deepEqual(S({ ...guavaween, cancelled: true }, at("2026-10-24", "17:00")), [null, ""]);
});

test("Tonight: an after-midnight start a few hours away", () => {
  const s = at("2026-10-25", "00:30");
  assert.equal(dayWord(s, at("2026-10-24", "22:00")), "Tonight");
  assert.equal(dayWord(s, at("2026-10-24", "12:00")), "Tomorrow", "twelve hours away is not tonight");
  assert.equal(dateWord("2026-10-20", at("2026-10-24")), "", "past dates have no word");
});

test("stateInput reads the card contract (build/CONTRACTS.md §6)", () => {
  const x = stateInput({ s: "10", e: "20", inst: "10:20,30:40", days: "2026-10-03 2026-10-10", endUnknown: "1", t: "evening" });
  assert.deepEqual(x.inst, [[10, 20], [30, 40]]);
  assert.deepEqual(x.days, ["2026-10-03", "2026-10-10"]);
  assert.equal(x.endUnknown, true);
  assert.equal(x.allDay, false);
  assert.equal(stateInput({ s: "1", e: "2", t: "allday" }).allDay, true, "the allday bucket of a timed-less card is all day");
  assert.equal(stateInput({ s: "1", e: "2", t: "allday", timeUnknown: "1" }).allDay, false, "time not listed is not all day");
  assert.equal(stateInput({ s: "1", e: "2", t: "allday", run: "2027-01-10" }).allDay, false);
  assert.equal(stateInput({ s: "1", e: "2", run: "2027-01-10" }).run, true);
  assert.equal(stateInput({ s: "1", e: "2", cancelled: "1" }).cancelled, true);
  assert.equal(stateInput({ s: "1", e: "2", allDay: "1" }).allDay, true, "the dialogs' data-all-day");
});
