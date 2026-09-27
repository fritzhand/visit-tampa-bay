/* ============================================================
   site/js/features/region.js · OWNER: the Home & Sheets lane
   The sheet pages' "What's on in the next 60 days" (build/pages/region.mjs). The server renders every live event
   of the sheet as a date-first row (li.evrow with data-first, data-last, data-listing = its listing days, data-run
   for a long run) and shows the first 60 days of the listings (what a reader without JS sees). This module moves
   the window to the reader's clock (app.now(), honoring ?now=): it keeps the rows listed in the next 60 days,
   puts each under the month of its next listing day, sorts them by that day, moves a multi-day row's date box to
   that day, shows the first 30 with a "Show all" button, and says the range in words. The core's status runner
   adds the live words ("Today", "Now", "Started", "Ended"). Pure planning is exported for tests/home.test.mjs.
   ============================================================ */
import { nyParts, addDays, fmtDay, fmtMonth, monthKey, dowShort, fmtDate } from "../lib/time.js";

export const DAYS = 60;
export const SHOW_FIRST = 30;

/** Read a row's dataset into the shape plan() takes. */
export const rowOf = (ds, i = 0) => ({
  i, first: ds.first, last: ds.last, run: ds.run != null && ds.run !== "",
  listing: ds.listing ? ds.listing.split(/\s+/).filter(Boolean) : [ds.first],
});

/** For each row, its next listing day inside [today, today + days − 1] (a long run: today, or its first day), else null.
 *  Returns the rows that have one, sorted by that day (ties keep the server's order). */
export function plan(rows, today, days = DAYS) {
  const end = addDays(today, days - 1);
  const out = [];
  for (const r of rows) {
    let next = null;
    if (r.run) { if (r.last >= today && r.first <= end) next = r.first > today ? r.first : today; }
    else next = r.listing.find((d) => d >= today && d <= end) || null;
    if (next) out.push({ ...r, next });
  }
  return out.sort((a, b) => (a.next < b.next ? -1 : a.next > b.next ? 1 : a.i - b.i));
}

export function init(app) {
  const box = document.querySelector("[data-on60]");
  if (!box) return;
  const rows = [...box.querySelectorAll("li.evrow")];
  if (!rows.length) return;
  const items = rows.map((el, i) => ({ el, ...rowOf(el.dataset, i) }));
  const note = box.querySelector("[data-on60-range]");
  const empty = box.querySelector("[data-on60-empty]");
  const moreP = box.querySelector("[data-on60-more]");
  const moreB = box.querySelector("[data-on60-show]");
  const anchor = box.querySelector("[data-on60-note]");
  let all = false, lastDay = "";

  const setBox = (it) => {
    if (it.run || it.listing.length < 2) return;             // single days keep their date; runs keep "Thru"
    const b = it.el.querySelector(".dbox");
    if (!b) return;
    b.querySelector(".dw").textContent = dowShort(it.next);
    b.querySelector(".d").textContent = String(Number(it.next.slice(8)));
    b.querySelector(".mo").textContent = fmtDate(it.next).split(" ")[0];
  };

  function render(now) {
    const today = nyParts(now).date;
    if (today === lastDay && !render.force) return;
    lastDay = today; render.force = false;
    const shown = plan(items, today);
    // long runs already open go last, in their own group ("under way"), soonest to close first
    const under = shown.filter((it) => it.run && it.first <= today).sort((a, b) => (a.last < b.last ? -1 : a.last > b.last ? 1 : a.i - b.i));
    const dated = shown.filter((it) => !under.includes(it));
    const visible = [...(all ? dated : dated.slice(0, SHOW_FIRST)), ...under];
    for (const m of box.querySelectorAll(".evmonth")) m.remove();
    const months = new Map();
    for (const it of visible) {
      const k = under.includes(it) ? "under" : monthKey(it.next);
      if (!months.has(k)) {
        const wrap = document.createElement("div");
        wrap.className = k === "under" ? "evmonth underway" : "evmonth"; wrap.dataset.month = k;
        wrap.innerHTML = `<h3 class="sub-h">${k === "under" ? "Under way, through a later date" : fmtMonth(k)}</h3><ol class="evrows dated"></ol>`;
        months.set(k, wrap);
      }
      it.el.hidden = false;
      setBox(it);
      months.get(k).querySelector("ol").appendChild(it.el);
    }
    for (const w of months.values()) box.insertBefore(w, empty);
    if (note) note.textContent = `${fmtDay(today)} to ${fmtDay(addDays(today, DAYS - 1))}: ${shown.length === 1 ? "1 event" : `${shown.length} events`} on this sheet.`;
    if (empty) empty.hidden = shown.length > 0;
    if (moreP && moreB) {
      moreP.hidden = all || dated.length <= SHOW_FIRST;
      moreB.textContent = `Show all ${dated.length} dated events in the next 60 days`;
    }
    app.status.update(now, box);
  }
  if (moreB) moreB.addEventListener("click", () => { all = true; render.force = true; render(app.now()); const first = box.querySelectorAll("li.evrow")[SHOW_FIRST]; first?.querySelector("a")?.focus(); });
  if (anchor) anchor.hidden = false;
  app.onTick(render);
}
