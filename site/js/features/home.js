/* ============================================================
   site/js/features/home.js · OWNER: the Home & Sheets lane
   The front page's clock-driven parts (build/pages/home.mjs). The server renders what a reader without JS sees
   (the first seven days of the listings, the chart index's first signature events, the season's first signature
   events); this module redraws them for the reader's clock (app.now(), honoring ?now=) from events.json:
   - the masthead's date line ("Sunday, September 27, 2026"),
   - "On the water today": today's list (time first), this weekend's days (or next weekend's on a Sunday), the long
     runs open today, with live words from the core's status runner; before the listings start it says so and shows
     the first day; after they end it says so,
   - each sheet plate's next signature event,
   - the season's signature events from today on (the first nine),
   - the annual calendar: this month is marked, and on phones only this month and the next two stay open,
   - the stat tiles open on hover where there is a mouse (tap opens them everywhere: they are <details>).
   Pure helpers (band, nextFor, items) are exported for tests/home.test.mjs.
   ============================================================ */
import { esc, truncate } from "../lib/text.js";
import { nyParts, addDays, dateRange, fmtDay, fmtDayLong, fmtTime, fmtRange, fmtDate, fmtDateY, fmtThrough, whenRange, weekday, isoLocal } from "../lib/time.js";

export const FL = { END_UNKNOWN: 1, TIME_UNKNOWN: 2, ALL_DAY: 4, ONGOING: 8, LATE: 16, RUN: 32 };
const dead = (ev) => ev.st === "cancelled" || ev.st === "postponed";

/** Every live instance of events.json as { ev, day, s, e, f } (runs included, flagged). */
export function items(events) {
  const out = [];
  for (const ev of events || []) if (!dead(ev)) for (const [day, s, e, f] of ev.i || []) out.push({ ev, day, s, e, f });
  return out.sort((a, b) => a.s - b.s || (a.ev.id < b.ev.id ? -1 : 1));
}

/** What the band shows at `now`: today's list, the weekend's days, the runs open today, the next listed day when
 *  today has nothing, and where today stands against the window. */
export function band(all, now, win) {
  const today = nyParts(now).date;
  const dated = all.filter((x) => !(x.f & FL.RUN));
  const byDay = (d) => dated.filter((x) => x.day === d).sort((a, b) => ((a.f & (FL.TIME_UNKNOWN | FL.ALL_DAY)) ? 1 : 0) - ((b.f & (FL.TIME_UNKNOWN | FL.ALL_DAY)) ? 1 : 0) || a.s - b.s);
  // today: what is on or still ahead first (timed by start, then untimed), what has ended after it
  const ended = (x) => !(x.f & (FL.TIME_UNKNOWN | FL.ALL_DAY | FL.END_UNKNOWN)) && x.e <= now;
  const todayList = byDay(today).sort((a, b) => (ended(a) ? 1 : 0) - (ended(b) ? 1 : 0));
  let [a, b] = whenRange("weekend", now);
  let wkDays = dateRange(a, b).filter((d) => d > today);
  let wkLabel = wkDays.length && wkDays.length < dateRange(a, b).length ? "Rest of the weekend" : "This weekend";
  if (!wkDays.length) { const w = weekday(today); const fri = addDays(today, ((5 - w + 7) % 7) || 7); wkDays = [fri, addDays(fri, 1), addDays(fri, 2)]; wkLabel = "Next weekend"; }
  const weekend = wkDays.map((d) => ({ d, list: byDay(d) }));
  const runs = all.filter((x) => (x.f & FL.RUN) && x.day <= today && x.e > now && (x.ev.ed ? x.ev.ed >= today : true));
  const nextDay = todayList.length ? null : [...new Set(dated.filter((x) => x.day > today).map((x) => x.day))].sort()[0] || null;
  const phase = win && today < win.start ? "before" : win && today > win.end ? "after" : "during";
  return { today, todayList, wkLabel, weekend, runs, nextDay, nextList: nextDay ? byDay(nextDay) : [], phase };
}

/** The next signature event of a sheet at `now` (live, featured, not over): { ev, x } | null. */
export function nextFor(all, region, now) {
  const today = nyParts(now).date;
  for (const x of all) {
    if (!x.ev.fe || x.ev.r !== region) continue;
    const last = x.f & FL.RUN ? (x.ev.ed || x.day) : x.day;
    if (last >= today && x.e > now) return x;
  }
  return null;
}

const bullet = (r) => (r ? `<svg class="bullet" viewBox="0 0 44 26" aria-hidden="true" focusable="false"><use href="#b-${esc(r)}"/></svg>` : '<span aria-hidden="true"></span>');
const hhmm = (t) => nyParts(t).hhmm;

/** Where an event is: its place's name, else the source's location text, else "Place not listed" (HTML). */
export const placeOf = (ev, data) => {
  const p = ev.pl && data.places && data.places[ev.pl];
  if (p) return esc(p.n);
  if (ev.lt) return esc(ev.lt);
  return '<span class="unk">Place not listed</span>';
};
const stBadge = (ev, data) => (ev.st && ev.st !== "scheduled" ? `<span class="badge ${ev.st === "tentative" ? "badge-unconfirmed" : "badge-warn"}">${esc((data.lb && data.lb.st && data.lb.st[ev.st]) || ev.st)}</span>` : "");
/** A time-first row from events.json: the same markup as build/pages/region.mjs timeRow (tests/home.test.mjs compares them). */
export function rowHtml(x, data, R, { withDate = false } = {}) {
  const ev = x.ev, f = x.f;
  const tu = f & FL.TIME_UNKNOWN, ad = f & FL.ALL_DAY, eu = f & FL.END_UNKNOWN;
  const timed = !tu && !ad;
  const [hm, ap] = timed ? fmtTime(hhmm(x.s)).split(" ") : ["", ""];
  const tcol = timed ? `<time datetime="${isoLocal(x.s)}">${esc(hm)}<small>${esc(ap)}</small></time>`
    : ad ? "<time><small>All day</small></time>"
      : ev.tt ? '<time><svg class="i" aria-hidden="true" focusable="false"><use href="#i-clock"/></svg></time>' : "<time><small>Time not listed</small></time>";
  const bits = [withDate ? esc(fmtDay(x.day)) : "", timed && !eu ? esc(fmtRange(hhmm(x.s), hhmm(x.e))) : timed ? '<span class="unk">end time not listed</span>' : tu && ev.tt ? esc(truncate(ev.tt, 72)) : "", placeOf(ev, data)].filter(Boolean);
  return `<li class="evrow" data-ev="${esc(ev.id)}"${ev.r ? ` data-sheet="${esc(ev.r)}"` : ""} data-s="${x.s}" data-e="${x.e}"${eu ? ' data-end-unknown="1"' : ""}${tu ? ` data-days="${x.day}"` : ""}${tu ? ' data-time-unknown="1"' : ""}${ad ? ' data-all-day="1"' : ""}><a href="${R}whats-on.html?e=${esc(ev.id)}#e-${esc(ev.id)}" data-open-event="${esc(ev.id)}">${tcol}${bullet(ev.r)}<span><span class="t">${esc(ev.t)}</span>${stBadge(ev, data)}<span class="w">${bits.join(" · ")} <span class="evr-st" data-status></span></span></span></a></li>`;
}

export function init(app) {
  const R = app.root;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const sec = $("#today");
  const win = sec ? { start: sec.dataset.windowStart, end: sec.dataset.windowEnd } : null;
  if ($("[data-tb-sim]") && app.isSimulated()) $("[data-tb-sim]").hidden = false;

  /* the masthead's date line and the band's clock */
  const clock = (now) => {
    const p = nyParts(now);
    const m = $("[data-mast-date]");
    if (m) m.textContent = `${fmtDayLong(p.date)}, ${p.date.slice(0, 4)}`;
    const c = $("[data-tb-clock]");
    if (c) c.textContent = `${fmtDayLong(p.date)} · ${fmtTime(p.hhmm)}`;
  };

  /* the calendar: mark this month; on phones keep this month and the next two open */
  const almanac = (now) => {
    const key = nyParts(now).date.slice(0, 7);
    const months = $$(".al-month");
    months.forEach((m) => { if (m.dataset.month === key) m.setAttribute("data-now", "1"); else m.removeAttribute("data-now"); });
    // on phones: this month (or the next in the calendar) and the two after it stay open
    let i = months.findIndex((m) => m.dataset.month >= key);
    if (i < 0) i = 0;
    if (window.matchMedia && window.matchMedia("(max-width: 699px)").matches) months.forEach((m, j) => { m.open = j >= i && j <= i + 2; });
  };

  /* the stat tiles: hover opens them where there is a mouse */
  if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    for (const d of $$(".stat")) {
      let byHover = false;
      d.addEventListener("mouseenter", () => { if (!d.open) { d.open = true; byHover = true; } });
      d.addEventListener("mouseleave", () => { if (byHover) { d.open = false; byHover = false; } });
      d.querySelector("summary")?.addEventListener("click", () => { if (byHover) { byHover = false; setTimeout(() => { d.open = true; }); } });
    }
  }

  let data = null, all = null, lastKey = "";
  const list = (xs, max) => `<ol class="tonight evrows">${xs.slice(0, max).map((x) => rowHtml(x, data, R)).join("")}</ol>`;
  const place = (ev) => placeOf(ev, data);

  function drawBand(now) {
    const body = $("[data-tb-body]");
    if (!body || !all) return;
    const b = band(all, now, win);
    const MAX = 8, PER = 4;
    const col = [];
    // today
    let t = `<div class="tb-col"><h3 class="tb-h"><span class="label">Today</span><span class="tb-d">${esc(fmtDay(b.today))}</span></h3>`;
    if (b.todayList.length) {
      t += list(b.todayList, MAX);
      t += `<p class="tb-more"><a href="${R}whats-on.html?when=today">${esc(b.todayList.length > MAX ? `All ${b.todayList.length} on today` : "Today on What's On")}</a></p>`;
    } else {
      t += `<p class="tb-none">${esc(b.phase === "before" ? `Nothing is listed for today: the listings in this guide start ${fmtDay(win.start)}, ${win.start.slice(0, 4)}.` : b.phase === "after" ? `The listings in this guide ended ${fmtDay(win.end)}, ${win.end.slice(0, 4)}.` : "Nothing is listed for today.")}</p>`;
      if (b.nextDay) t += `<h4 class="sub-h">${esc(`Next listed · ${fmtDay(b.nextDay)} · ${b.nextList.length === 1 ? "1 event" : `${b.nextList.length} events`}`)}</h4>${list(b.nextList, PER + 1)}<p class="tb-more"><a href="${R}whats-on.html?day=${b.nextDay}">${esc(`All ${b.nextList.length} on ${fmtDay(b.nextDay)}`)}</a></p>`;
    }
    col.push(t + "</div>");
    // the weekend
    const n = b.weekend.reduce((s, d) => s + d.list.length, 0);
    const w0 = b.weekend[0].d, w1 = b.weekend[b.weekend.length - 1].d;
    let w = `<div class="tb-col"><h3 class="tb-h"><span class="label">${esc(b.wkLabel)}</span><span class="tb-d">${esc(w0 === w1 ? fmtDay(w0) : `${fmtDay(w0)} to ${fmtDay(w1)}`)}</span></h3>`;
    if (!n) w += `<p class="tb-none">${esc(b.phase === "after" ? "Nothing listed: the listings have ended." : "Nothing is listed for these days.")}</p>`;
    for (const d of b.weekend) {
      if (!d.list.length) continue;
      w += `<div class="tb-day"><h4 class="sub-h">${esc(`${fmtDay(d.d)} · ${d.list.length === 1 ? "1 event" : `${d.list.length} events`}`)}</h4>${list(d.list, PER)}${d.list.length > PER ? `<p class="tb-more"><a href="${R}whats-on.html?day=${d.d}">${esc(`All ${d.list.length} on ${fmtDay(d.d)}`)}</a></p>` : ""}</div>`;
    }
    if (b.wkLabel !== "Next weekend" && n) w += `<p class="tb-more"><a href="${R}whats-on.html?when=weekend">This weekend on What's On</a></p>`;
    col.push(w + "</div>");
    const runs = b.runs.slice(0, 4);
    const runsHtml = runs.length ? `<div class="tb-runs"><h3 class="sub-h">${esc(`Open for a run of weeks · ${b.runs.length}`)}</h3><ul class="tb-runlist">${runs.map((x) => `<li${x.ev.r ? ` data-sheet="${esc(x.ev.r)}"` : ""}><a href="${R}whats-on.html?e=${esc(x.ev.id)}#e-${esc(x.ev.id)}" data-open-event="${esc(x.ev.id)}">${bullet(x.ev.r)}<span><span class="t">${esc(x.ev.t)}</span><span class="w">${esc(x.ev.ed ? fmtThrough(x.ev.ed, b.today) : "")} · ${place(x.ev)}</span></span></a></li>`).join("")}</ul></div>` : "";
    body.innerHTML = `<div class="tb-cols">${col.join("")}</div>${runsHtml}`;
    app.status.update(now, body);
  }

  function drawNext(now) {
    for (const el of $$("[data-next-featured]")) {
      const x = nextFor(all, el.dataset.nextFeatured, now);
      const head = '<p class="si-sub label">Next signature event</p>';
      if (!x) { el.innerHTML = `${head}<span class="unk">No signature event listed from today to ${esc(fmtDateY(win.end))}</span>`; continue; }
      const multi = x.ev.i.length > 1;
      const when = x.f & FL.RUN ? fmtThrough(x.ev.ed || x.day, x.day) : multi ? `${fmtDate(x.ev.i[0][0])} to ${fmtDate(x.ev.i[x.ev.i.length - 1][0])}` : fmtDay(x.day);
      el.innerHTML = `${head}<a href="${R}whats-on.html?e=${esc(x.ev.id)}#e-${esc(x.ev.id)}" data-open-event="${esc(x.ev.id)}"><span class="t">${esc(x.ev.t)}</span><span class="w">${esc(when)}${x.ev.pl && data.places[x.ev.pl] ? ` · ${esc(data.places[x.ev.pl].n)}` : ""}</span></a>`;
    }
  }

  function drawFeatured(now) {
    const ol = $("[data-featured]");
    if (!ol) return;
    const today = nyParts(now).date, max = Number(ol.dataset.shown) || 9;
    let shown = 0, left = 0;
    for (const li of $$("li", ol)) {
      const open = li.dataset.last >= today;
      if (open) left++;
      li.hidden = !(open && shown < max);
      if (open && shown < max) shown++;
    }
    const note = $("[data-fe-note]");
    if (note) note.textContent = left ? `${left > shown ? `The next ${shown} of ${left}` : `All ${left}`} from ${fmtDay(today)}, ${today.slice(0, 4)}, to the end of the listings.` : "No signature event is left in the listings.";
    app.status.update(now, ol);
  }

  const tick = (now) => {
    clock(now);
    const key = nyParts(now).date;
    if (key !== lastKey) { lastKey = key; almanac(now); drawFeatured(now); if (all) { drawNext(now); } }
    if (all) drawBand(now);
  };
  app.onTick(tick);
  app.data("events.json").then((d) => {
    data = d; all = items(d.events);
    const fb = $("[data-tb-fallback]"); if (fb) fb.remove();
    const ld = $("[data-tb-loading]"); if (ld) ld.remove();
    lastKey = ""; tick(app.now());
  }).catch(() => {
    const ld = $("[data-tb-loading]");
    if (ld) ld.textContent = "Today's list could not load here; the first seven days of the listings are below.";
    const fb = $("[data-tb-fallback]"); if (fb) fb.classList.add("is-shown");
  });
}
