/* ============================================================
   build/pages/whats-on.mjs · OWNER: the What's On lane
   whats-on.html: every event in the data window (Sep 28, 2026 – Apr 30, 2027), server-rendered so the whole
   calendar works without JS; site/js/features/whats-on.js filters it, marks today, folds the past and draws the map.

   Page anatomy (ids are contracts: build/CONTRACTS.md §3, §9):
   - the page head (counts computed from the data) and the filter tools (JS only: search, when chips, sheet
     chips, month / area / kind selects, Free, In My Trip, List / Map), all read by core/filter.js from the URL
     (build/nav.mjs PARAMS["whats-on"]: month day series r a k free q when star view e);
   - .wo-bar: the month jump bar (sticky), one link per month with its count, plus Long runs and Every year;
   - #runs "Long runs": every run longer than 14 days as ONE lean card (its date box says "Until" + its last
     day; the card says "Through Jan 10" and never "Now"); whats-on.js splits it into Running now / Opening later;
   - #m-YYYY-MM month sections → #d-YYYY-MM-DD day sections → lean event cards (id="e-<id>", one per event,
     cancelled and postponed included with the word), filed under their FIRST listing day; every later day of a
     multi-day event is an li.ev-also row under that day (same filter attributes, no id), so a day or weekend
     filter shows the right day, not a far-away card. A day section carries data-s / data-e / data-time-unknown,
     so the core's live states give its heading "Today", "Tomorrow", "This weekend" or "Ended" (data-status);
   - the map pane (data-view-pane="map", built by whats-on.js from assets/data/events.json);
   - #annual "Every year": every series once (id="s-<id>"), filed under the month its season starts
     (year-round first), featured first; a 12-month strip shows every month it runs, "Also this month" lines
     name the series that started earlier; when_text is the organizer's own wording, in quotation marks.
   Weight: whats-on.html carries ~590 cards. The lean card (build/components/event-card.mjs { lean: true }) has
   no inline SVG and no description (the dialog loads descriptions from event-text.json): ~1,110 KB raw, ~125 KB
   gzipped on Sep 27 (the crawl budget is 1,600 KB raw). Most of what remains per card is the card contract that
   tests/build.test.mjs pins (the id six times: anchor, data-ev, the deep link twice, the dialog hook, the star).
   ============================================================ */

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function pages(ctx) {
  const { db, c, h, cards, vocab } = ctx;
  const { esc, attr, plural } = h;
  const win = db.window;

  /* ---------- what goes where ---------- */
  const runs = h.sortBy(db.events.filter((e) => e.run), (e) => e.instances[0].through, (e) => e.instances[0].date, (e) => e.title.toLowerCase());
  const dated = db.events.filter((e) => !e.run && e.instances.length);
  // untimed and all-day items open a day (they span it), then timed ones by start
  const dayKey = (x) => [x.timeUnknown || x.allDay ? 0 : 1, x.s, x.ev.title.toLowerCase()];
  const cmp = (a, b) => { const ka = dayKey(a), kb = dayKey(b); for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1; return 0; };
  const byDay = new Map();                         // day → { cards: [first instances], also: [[instances of one event on a later day]] }
  const slot = (d) => { if (!byDay.has(d)) byDay.set(d, { cards: [], also: [] }); return byDay.get(d); };
  for (const e of dated) {
    const first = e.instances[0];
    slot(first.day).cards.push(first);
    const later = new Map();
    for (const x of e.instances) if (x.day !== first.day) { if (!later.has(x.day)) later.set(x.day, []); later.get(x.day).push(x); }
    for (const [d, xs] of later) slot(d).also.push(xs);
  }
  for (const v of byDay.values()) { v.cards.sort(cmp); v.also.sort((a, b) => cmp(a[0], b[0])); }
  const days = [...byDay.keys()].sort();
  const months = [...new Set(days.map((d) => d.slice(0, 7)))];
  const liveIds = (xs) => new Set(xs.filter((x) => x.ev.live).map((x) => x.id));
  const dayCount = (d) => liveIds([...byDay.get(d).cards, ...byDay.get(d).also.map((xs) => xs[0])]).size;
  const monthDays = (m) => days.filter((d) => d.startsWith(m));
  const monthCount = (m) => liveIds(monthDays(m).flatMap((d) => [...byDay.get(d).cards, ...byDay.get(d).also.map((xs) => xs[0])])).size;
  const live = db.events.filter((e) => e.live);
  // the date the sources were checked: stated once when most listings share it (cards print only a different one)
  const checkedBy = new Map(); for (const e of [...db.events, ...db.series]) if (e.checked) checkedBy.set(e.checked, (checkedBy.get(e.checked) || 0) + 1);
  const checked = [...checkedBy].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const checkedAll = checked && checkedBy.get(checked) === db.events.length + db.series.length;
  const liveDays = new Set(days.filter((d) => dayCount(d) > 0)).size;
  const dead = db.events.filter((e) => !e.live).length;
  const freeN = live.filter((e) => e.is_free === true).length;
  const sigN = live.filter((e) => e.featured).length;

  /* ---------- counts for the tools ---------- */
  const countBy = (fn) => { const m = new Map(); for (const e of live) for (const k of [].concat(fn(e)).filter(Boolean)) m.set(k, (m.get(k) || 0) + 1); return m; };
  const byRegion = countBy((e) => e.region), byArea = countBy((e) => e.area), byKind = countBy((e) => e.kind), byGroup = countBy((e) => e.kg);
  const monthsTouched = countBy((e) => cards.monthsOf(e));

  /* ---------- the tools (JS only: without JS every event is listed below) ---------- */
  const whenChip = (w, label) => `<button class="chip" type="button" data-filter-chip="when=${w}" aria-pressed="false"><span>${esc(label)}</span>${h.icon("check", "ck")}</button>`;
  const sheetChips = db.regions.filter((r) => byRegion.get(r.id)).map((r) => c.chip(r.short, null, { sheet: r.id, pressed: false, count: byRegion.get(r.id), attrs: `data-filter-chip="r=${r.id}"` })).join("");
  const opt = (v, l, n) => `<option value="${attr(v)}">${esc(l)}${n != null ? ` (${n})` : ""}</option>`;
  const monthSel = `<label class="wo-sel"><span class="label">Month</span><select class="select" data-filter="month"><option value="">Any month</option>${db.months.filter((m) => monthsTouched.get(m.key)).map((m) => opt(m.key, m.label, monthsTouched.get(m.key))).join("")}</select></label>`;
  const areaSel = `<label class="wo-sel"><span class="label">Area</span><select class="select" data-filter="a"><option value="">Any area</option>${db.regions.map((r) => { const as = r.areas.filter((a) => byArea.get(a.id)); return as.length ? `<optgroup label="${attr(`Sheet ${r.n} · ${r.name}`)}">${as.map((a) => opt(a.id, a.name, byArea.get(a.id))).join("")}</optgroup>` : ""; }).join("")}</select></label>`;
  const groups = Object.keys(vocab.EVENT_GROUP_LABEL).filter((g) => byGroup.get(g));
  const kindSel = `<label class="wo-sel"><span class="label">Kind</span><select class="select" data-filter="k"><option value="">Any kind</option><optgroup label="Groups">${groups.map((g) => opt(g, vocab.EVENT_GROUP_LABEL[g], byGroup.get(g))).join("")}</optgroup><optgroup label="Kinds">${vocab.EVENT_KINDS.filter((k) => byKind.get(k)).map((k) => opt(k, vocab.EVENT_KIND_LABEL[k], byKind.get(k))).join("")}</optgroup></select></label>`;
  const tools = `<div class="wo-tools js-only" role="search" aria-label="Filter events">
<div class="wo-row wo-row-top"><label class="field wo-q">${h.icon("search")}<span class="sr-only">Search events</span><input type="search" name="q" placeholder="Search events, places, teams" autocomplete="off" data-filter-q></label><span class="view-toggle" role="group" aria-label="View"><button type="button" data-view="list" aria-pressed="true">${h.icon("list")}List</button><button type="button" data-view="map" aria-pressed="false">${h.icon("map")}Map</button></span></div>
<div class="wo-row chip-row" role="group" aria-label="Quick filters">${whenChip("today", "Today")}${whenChip("weekend", "This weekend")}${whenChip("week", "Next 7 days")}${whenChip("month", "This month")}<span class="chip-sep" aria-hidden="true"></span><button class="chip" type="button" data-filter-chip="free=1" aria-pressed="false"><span>Free</span><span class="n">${freeN}</span>${h.icon("check", "ck")}</button><button class="chip" type="button" data-filter-chip="star=1" aria-pressed="false">${h.icon("star")}<span>In My Trip</span>${h.icon("check", "ck")}</button><button class="chip wo-more-btn" type="button" aria-expanded="false" aria-controls="wo-more" data-wo-more>${h.icon("sliders")}<span>Sheet, area, kind</span><span class="count" data-wo-more-n hidden></span></button></div>
<div class="wo-more" id="wo-more" data-wo-more-panel>
<div class="wo-row chip-row" role="group" aria-label="Sheet">${sheetChips}</div>
<div class="wo-row wo-sels">${monthSel}${areaSel}${kindSel}</div>
</div>
<div class="wo-row wo-status"><p class="result-count" role="status" aria-live="polite" data-wo-count>${plural(live.length, "event")}${dead ? `, plus ${dead} cancelled or postponed` : ""}</p><button class="btn btn-ghost btn-sm" type="button" data-filter-clear hidden>${h.icon("x")}Clear filters</button><button class="btn btn-secondary btn-sm" type="button" data-wo-past hidden></button></div>
</div>`;

  /* ---------- the month bar (works without JS: anchor links) ---------- */
  const monthLabel = (m, i) => `${MON[Number(m.slice(5)) - 1]}${i === 0 || m.endsWith("-01") ? ` <small>${m.slice(0, 4)}</small>` : ""}`;
  const bar = `<nav class="wo-bar" aria-label="Jump to a month" data-wo-bar><div class="wo-bar-in">${runs.length ? `<a class="wo-bar-runs" href="#runs"><b>Long runs</b><span class="n tnum" data-wo-bn="runs">${runs.filter((e) => e.live).length}</span></a>` : ""}${months.map((m, i) => `<a href="#m-${m}" data-m="${m}" aria-label="${attr(`${h.fmtMonth(m)}: ${plural(monthCount(m), "event")}`)}"><b>${monthLabel(m, i)}</b><span class="n tnum" data-wo-bn="${m}">${monthCount(m)}</span></a>`).join("")}${db.series.length ? `<a class="wo-bar-yr" href="#annual"><b>Every year</b><span class="n tnum">${db.series.length}</span></a>` : ""}</div></nav>`;

  const empty = `<div class="wo-empty" data-filter-empty hidden>${c.emptyState({ title: "No events match these filters", body: "Try another date, sheet or kind, or clear the filters.", glyph: "calendar", level: 2, action: '<button class="btn btn-secondary" type="button" data-filter-clear>Clear filters</button>' })}</div>`;
  /* ---------- the list (root: "" here; kept so every internal URL is root + path) ---------- */
  const render = (root) => {
  const card = (x, hl) => cards.eventCard(root, x, { lean: true, datebox: true, headingLevel: hl, showDate: false, checked });
  const runsSec = runs.length ? `<section class="wo-runs" id="runs" data-filter-group aria-labelledby="runs-h" data-wo-runs>
<header class="wo-sech"><h2 id="runs-h">Long runs</h2><p class="wo-secd">${esc(`${plural(runs.filter((e) => e.live).length, "exhibition, season or market", "exhibitions, seasons and markets")} on for more than two weeks${runs.some((e) => !e.live) ? `, plus ${runs.filter((e) => !e.live).length} cancelled or postponed` : ""}. Each is listed once, with its last day.`)}</p></header>
<div class="wo-grid" data-wo-run-list>${runs.map((e) => card(e.instances[0], 3)).join("")}</div>
</section>` : "";
  const daySec = (d) => {
    const { cards: cs, also } = byDay.get(d);
    const n = dayCount(d);
    return `<section class="wo-day" id="d-${d}" data-filter-group>
<h3 class="wo-dh"><span class="wo-dn">${esc(h.fmtDayLong(d))}</span> <span class="wo-dc">${n ? plural(n, "event") : "Cancelled or postponed only"}</span> <span class="ev-status"></span></h3>
${cs.length ? `<div class="wo-grid">${cs.map((x) => card(x, 4)).join("")}</div>` : ""}${also.length ? `<div class="wo-also-box"><p class="wo-also-h">${cs.length ? "Also on this day" : "On this day"}</p><ul class="wo-also">${also.map((xs) => cards.alsoRow(root, xs[0], { local: true, slim: true, times: xs })).join("")}</ul></div>` : ""}
</section>`;
  };
  const monthSec = (m) => {
    const ds = monthDays(m), n = monthCount(m);
    const [y, mo] = m.split("-");
    return `<section class="wo-month" id="m-${m}" data-filter-group data-m="${m}">
<header class="wo-mh"><h2><span class="wo-mn">${MONTH_LONG[Number(mo) - 1]}</span> <span class="wo-my">${y}</span></h2><p class="wo-mc">${esc(`${plural(n, "event")} on ${plural(ds.filter((d) => dayCount(d) > 0).length, "day")}`)}</p></header>
${ds.map(daySec).join("\n")}
</section>`;
  };
  const list = `<div class="wo-list" data-filter-list="manual" data-filter-items=".ev, .ev-also" data-start="${win.start}" data-end="${win.end}" data-wo-list>
${runsSec}
${months.map(monthSec).join("\n")}
</div>`;

  return list;
  };

  /* ---------- the map pane (whats-on.js builds it on first use) ---------- */
  const mapPane = `<div class="wo-map" data-view-pane="map" hidden data-wo-map><p class="muted">The map needs JavaScript. Every event is listed in the List view.</p></div>`;

  /* ---------- the annual calendar ---------- */
  const seasonStart = (ms) => { const set = new Set(ms); if (set.size >= 12) return 0; for (let m = 1; m <= 12; m++) if (set.has(m) && !set.has(m === 1 ? 12 : m - 1)) return m; return Math.min(...ms); };
  const monthsText = (ms) => {
    const set = new Set(ms); if (set.size >= 12) return "Every month";
    const st = seasonStart(ms), out = [];
    for (let i = 0; i < 12; i++) { const m = ((st - 1 + i) % 12) + 1; if (set.has(m)) out.push(MONTH_LONG[m - 1]); }
    return h.listJoin(out);
  };
  // the months in words; whats-on.js draws the twelve-cell strip (lit where the series runs) from data-months
  const strip = (ms) => `<p class="wo-strip" data-months="${[...new Set(ms)].sort((a, b) => a - b).join(" ")}"><span class="wo-strip-t">${esc(monthsText(ms))}</span></p>`;
  const seriesSorted = h.sortBy(db.series, (s) => (s.featured ? 0 : 1), (s) => s.name.toLowerCase());
  const yr = new Map([[0, []], ...Array.from({ length: 12 }, (_, i) => [i + 1, []])]);
  for (const s of seriesSorted) yr.get(seasonStart(s.months || []))?.push(s);
  // the source's name; when the official site is another page of the same host, "host page" so the two links read apart
  const srcLabel = (s) => (s.url && s.url !== s.source_url && h.hostOf(s.url) === h.hostOf(s.source_url) ? `${h.hostOf(s.source_url)} (source page)` : h.hostOf(s.source_url));
  const seriesEvents = (s) => h.sortBy(db.events.filter((e) => e.series === s.id && e.instances.length), (e) => e.first);
  const seriesEntry = (s, root) => {
    const evs = seriesEvents(s);
    const where = s.venue ? `<a href="${root}places/${attr(s.venue.id)}.html">${esc(s.venue.name)}</a>` : s.location_text ? esc(s.location_text) : c.unk("Place not listed");
    const kicker = [vocab.EVENT_KIND_LABEL[s.kind] || s.kind, s.area ? db.byId.area.get(s.area)?.name : "", s.since ? `Since ${s.since}` : ""].filter(Boolean).join(" · ");
    const meta = `<span class="ev-kind">${esc(kicker)}</span>${s.featured ? '<span class="seal">Signature</span>' : ""}`;   // the sheet badge: .ev-meta::after (45-whats-on.css)
    // the dated events of this series in the list: every one when there are a few; a long season (42 home games) names
    // its first dates and links the whole set as a filtered list (?series=; without JS the link opens the whole list)
    const dateLink = (e) => `<a href="#e-${attr(e.id)}">${esc(e.run ? h.fmtDateRange(e.date, e.end_date) : e.instances.length > 1 ? h.fmtDateRange(e.instances[0].day, e.instances[e.instances.length - 1].day) : h.fmtDay(e.instances[0].day))}</a>${e.live ? "" : ` (${esc(vocab.EVENT_STATUS_LABEL[e.status])})`}`;
    const SHOW = 6, few = evs.length <= SHOW + 2;
    const dates = evs.length ? `<p class="wo-se-next"><span class="label">In this guide</span> ${(few ? evs : evs.slice(0, SHOW)).map(dateLink).join(", ")}${few ? "" : `, and ${evs.length - SHOW} more`}${evs.length > 1 ? ` <a class="wo-se-all" href="${root}whats-on.html?series=${attr(s.id)}">${esc(`List all ${evs.length}`)}</a>` : ""}</p>` : "";
    return `<article class="wo-se" id="s-${attr(s.id)}"${s.region ? ` data-sheet="${s.region}"` : ""}>
${strip(s.months || [])}<p class="ev-meta">${meta}</p>
<h4 class="wo-se-t">${esc(s.name)}</h4>
<p class="wo-se-when">“${esc(s.when_text)}”</p>
<p class="wo-se-where">${where}</p>
${s.summary ? `<p class="wo-se-sum">${esc(s.summary)}</p>` : ""}
${dates}<p class="source-line">${s.url && s.url !== s.source_url ? `Official site: ${h.extLink(s.url, esc(h.hostOf(s.url)))} · Source: ` : s.url ? "Official site and source: " : "Source: "}${h.extLink(s.source_url, esc(srcLabel(s)))}${s.checked && s.checked !== checked ? ` · Checked ${esc(h.fmtDateY(s.checked))}` : ""}</p>
</article>`;
  };
  const alsoIn = (m) => {
    if (!m) return "";
    const more = seriesSorted.filter((s) => (s.months || []).includes(m) && seasonStart(s.months) !== m && seasonStart(s.months) !== 0);
    return more.length ? `<p class="wo-yr-also"><span class="label">Also in ${MONTH_LONG[m - 1]}</span> ${more.map((s) => `<a href="#s-${attr(s.id)}">${esc(s.name)}</a>`).join(" · ")}</p>` : "";
  };
  const yearRound = yr.get(0).length;
  const annual = (root) => (db.series.length ? c.section({
    id: "annual", title: "Every year", kicker: `The annual calendar · ${plural(db.series.length, "recurring event")}`, root,
    body: `<p class="wo-secd">What happens every year, filed under the month each season starts${yearRound ? " (year-round events first)" : ""}. The dates in quotation marks are as each source states them (the source is named under each); the dated events in this guide are linked under each.</p>
<nav class="wo-yr-idx" aria-label="Annual calendar by month">${yearRound ? `<a href="#yr-0">Year-round <span class="n">${yearRound}</span></a>` : ""}${MON.map((m, i) => (yr.get(i + 1).length || alsoIn(i + 1) ? `<a href="#yr-${i + 1}">${m} <span class="n">${yr.get(i + 1).length}</span></a>` : "")).join("")}</nav>
${[...yr].filter(([m, list]) => list.length || alsoIn(m)).map(([m, list]) => `<section class="wo-yr" id="yr-${m}" aria-labelledby="yr-${m}-h"><h3 class="wo-yr-h" id="yr-${m}-h">${m ? `${MONTH_LONG[m - 1]} <span>${list.length ? `${plural(list.length, "season starts", "seasons start")}` : "nothing new starts"}</span>` : `Year-round <span>${plural(list.length, "event")}</span>`}</h3>${alsoIn(m)}${list.length ? `<div class="wo-se-grid">${list.map((x) => seriesEntry(x, root)).join("\n")}</div>` : ""}</section>`).join("\n")}`,
  }) : "");

  /* ---------- the page ---------- */
  const lede = live.length
    ? `${plural(live.length, "event")} on ${plural(liveDays, "day")}, ${h.fmtDate(win.start)}, ${win.start.slice(0, 4)} to ${h.fmtDateY(win.end)}: festivals, fairs, concerts, games and shows. ${freeN} ${freeN === 1 ? "is" : "are"} free; ${sigN} ${sigN === 1 ? "is a signature event" : "are signature events"}.`
    : `No events are listed yet for ${h.fmtDateY(win.start)} to ${h.fmtDateY(win.end)}.`;
  return [{
    path: "whats-on.html", nav: "whats-on", title: "What's On",
    description: `Every dated event in this Tampa Bay guide from ${h.fmtDateY(win.start)} to ${h.fmtDateY(win.end)}, by month and day: festivals, parades, fairs, concerts, home games and shows, each linked to its source.`,
    features: ["whats-on"], pageClass: "wo-page",
    body: (root) => `${c.pageHead({ kicker: `Plan · ${MONTH_LONG[Number(win.start.slice(5, 7)) - 1].slice(0, 3)} ${win.start.slice(0, 4)} – ${MONTH_LONG[Number(win.end.slice(5, 7)) - 1].slice(0, 3)} ${win.end.slice(0, 4)}`, num: 1, title: "What's On", lede })}
<div class="wo">
${tools}
<p class="wo-note">${h.icon("info")}<span>Select an event for its details, map and source link. An event on several days has its card on its first day and a short row on each later day. ${checked ? esc(checkedAll ? `Every listing here was checked against its source on ${h.fmtDateY(checked)}.` : `Most listings here were checked against their sources on ${h.fmtDateY(checked)}; the others say when.`) : ""}</span></p>
<div class="wo-pane" data-view-pane="list">
${bar}
${empty}
${render(root)}
</div>
${mapPane}
</div>
${annual(root)}`,
  }];
}

/** assets/data/whats-on-map.json: what the map view needs beyond events.json (the basemap's place and water names and
 *  its credit line), fetched only when a reader opens the map. */
export function data(ctx) {
  const m = ctx.db.map || {};
  const KINDS = new Set(["water", "city", "town", "beach", "island", "park"]);
  const labels = (m.labels || []).filter((l) => KINDS.has(l.kind) && typeof l.text === "string" && l.lat != null && l.lng != null)
    .map((l) => ({ text: l.text, lat: l.lat, lng: l.lng, kind: l.kind, minZoom: l.minZoom || 1 }));
  return { "assets/data/whats-on-map.json": { v: 1, attribution: m.attribution || null, labels } };
}
