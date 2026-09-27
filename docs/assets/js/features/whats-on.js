/* ============================================================
   site/js/features/whats-on.js · OWNER: the What's On lane
   Two pages load it (build/pages/whats-on.mjs, build/pages/trip.mjs); init(app) picks by app.page.

   whats-on.html (the list is server-rendered and complete without this file):
   - Filters: mounts core/filter.js on [data-wo-list] (data-filter-list="manual") with four custom tests. A card is
     filed under its FIRST listing day and every later day of a multi-day event is an li.ev-also row under that
     day, so the date keys (day, when, month) match an item's own listing day, not every day of its event; a long
     run (data-run) matches any day it covers. star reads the event id (rows carry no star). Every other key
     (q r a k free series) is the core's, on the same attributes.
   - Counts: after each pass (tbc:filter) the result line, each day's and month's count and the month bar count
     distinct live events (a card and its rows are one event; cancelled and postponed are left out and said).
   - The past: when the clock is inside the data window and no date filter is set, days that have ended
     (the core's live states mark each .wo-day data-status="past") and ended runs fold away behind
     "Show earlier dates (n)". The month bar gains "Today" (or the next day with events).
   - Long runs: split into "Running now" (by last day) and "Opening later" (by first day); more than six fold
     behind "Show all" until a filter is set.
   - Map view ([data-view="map"], ?view=map): the basemap with one buoy per place for the filtered events that
     have coordinates (events.json: the event's own point, else its place's); nearby places cluster (click to
     zoom), a place opens a card listing its events (each opens the event dialog). Drag to pan, +/− to zoom,
     "Fit all". Events off the basemap or without coordinates are counted under the map, never guessed.
   trip.html: "Times that overlap": starred events whose listed times overlap on the same day (only times the
   sources publish: an event with no end time overlaps only what is under way when it starts, or what starts
   with it), with the straight-line distance between the two places (an estimate, and said so). Print button.
   ============================================================ */
import { inDays } from "../lib/facets.js";
import { liveState } from "../lib/status.js";
import { whenRange, nyParts, fmtDay, fmtTime, fmtRange, fmtDate, fmtDateRange, fmtThrough } from "../lib/time.js";
import { project, onMap, cluster, haversine } from "../lib/geo.js";
import { esc } from "../lib/text.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const I = (name, cls = "") => `<svg class="i${cls ? " " + cls : ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const ext = (href, inner, cls = "") => `<a${cls ? ` class="${cls}"` : ""} href="${esc(href)}" target="_blank" rel="noopener">${inner}<span class="sr-only"> (opens in a new tab)</span></a>`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const set = (v) => v != null && v !== "" && v !== false && !(Array.isArray(v) && !v.length);
const DEAD = new Set(["cancelled", "postponed"]);
const hm = (t) => nyParts(t).hhmm;

export function init(app) {
  if (app.page === "trip") return initTrip(app);
  const list = $("[data-wo-list]");
  if (list) initWhatsOn(app, list);
}

/* =================================================================== What's On */
function initWhatsOn(app, list) {
  const scope = document;
  const win = { start: list.dataset.start, end: list.dataset.end };
  const items = $$(".ev, .ev-also", list);
  // a row carries only data-ev, data-sheet and data-day: it takes its card's filter attributes and words (for search)
  const cardOf = new Map($$(".ev", list).map((el) => [el.dataset.ev, el]));
  for (const row of $$(".ev-also", list)) {
    if (!row.dataset.ev) row.dataset.ev = (row.querySelector("a")?.getAttribute("href") || "").replace(/^.*#e-/, "");
    if (!row.dataset.day) row.dataset.day = (row.closest(".wo-day")?.id || "").slice(2);
    const c = cardOf.get(row.dataset.ev);
    if (!c) continue;
    for (const k of ["sheet", "r", "a", "k", "kg", "se", "free"]) if (c.dataset[k] != null && row.dataset[k] == null) row.dataset[k] = c.dataset[k];
    row.querySelector("a")?.setAttribute("data-open-event", row.dataset.ev);
    row.dataset.q = `${c.dataset.q || ""} ${c.querySelector(".ev-where")?.textContent || ""} ${c.querySelector(".ev-kind")?.textContent || ""}`;
  }
  const dayEls = $$(".wo-day", list), monthEls = $$(".wo-month", list);
  for (const d of dayEls) d.dataset.day = d.id.slice(2);
  const runBox = $("[data-wo-runs]", list), runList = $("[data-wo-run-list]", list);
  const countEl = $("[data-wo-count]", scope), pastBtn = $("[data-wo-past]", scope);
  const bar = $("[data-wo-bar]", scope), mapPane = $("[data-wo-map]", scope);
  // same-page event links (the annual calendar's dates) open the dialog too
  $$('a[href^="#e-"]:not([data-open-event])', scope).forEach((a) => { a.dataset.openEvent = a.getAttribute("href").slice(3); });

  /* ---------- the annual calendar's month strips: twelve cells, lit where a series runs (the words stay beside them) ---------- */
  for (const p of $$(".wo-strip[data-months]", scope)) {
    const on = new Set(p.dataset.months.split(" ").map(Number));
    p.insertAdjacentHTML("afterbegin", `<span class="wo-cells" aria-hidden="true">${"JFMAMJJASOND".split("").map((m, i) => `<${on.has(i + 1) ? "b" : "i"}>${m}</${on.has(i + 1) ? "b" : "i"}>`).join("")}</span>`);
  }

  /* ---------- each day's word: Today, Tomorrow, This weekend, Ended (lib/status.js, as the cards) ---------- */
  function dayWords() {
    const t = app.now();
    for (const d of dayEls) {
      const { st, label } = liveState({ timeUnknown: true, days: [d.dataset.day], s: 1, e: 1 }, t);
      if (st) d.dataset.status = st; else delete d.dataset.status;
      const el = $(".wo-dh .ev-status", d);
      if (el && el.textContent !== label) el.textContent = label;
    }
  }
  dayWords();
  const total = new Set(items.filter((el) => !el.hasAttribute("data-cancelled")).map((el) => el.dataset.ev)).size;
  let state = {}, showPast = false, lastKey = "";

  /* ---------- the date keys match an item's own listing day ---------- */
  const tests = {
    day: (it, v) => { const ds = [].concat(v); return it.run ? ds.some((d) => inDays(it, d, d)) : ds.includes(it.ds.day); },
    when: (it, v) => { const r = whenRange(v, app.now()); if (!r) return true; return it.run ? inDays(it, r[0], r[1]) : it.ds.day >= r[0] && it.ds.day <= r[1]; },
    month: (it, v) => { const ms = [].concat(v); if (it.run) { const have = String(it.ds.month || "").split(/\s+/); return ms.some((m) => have.includes(m)); } return ms.includes(String(it.ds.day || "").slice(0, 7)); },
    star: (it) => app.trip.has(it.ds.ev),
  };

  /* ---------- the past (only while the clock is inside the window) ---------- */
  const inWindow = () => { const d = app.today(); return !!win.start && d >= win.start && d <= win.end; };
  const isPast = (el) => (el.matches("[data-run]") ? el.dataset.status === "past" : !!el.closest('.wo-day[data-status="past"]'));
  const dated = () => ["day", "when", "month"].some((k) => set(state[k]));
  const hiding = () => inWindow() && !dated() && !showPast;
  // shown by the filter (a group hides only when none of its items shows) and not folded away as past
  const shownNow = (el) => !el.hidden && !(hiding() && isPast(el));
  const uniq = (els) => { const live = new Set(), dead = new Set(); for (const el of els) (el.hasAttribute("data-cancelled") ? dead : live).add(el.dataset.ev); for (const id of live) dead.delete(id); return { live: live.size, dead: dead.size, ids: new Set([...live, ...dead]) }; };

  /* ---------- long runs: "Running now" (by last day) and "Opening later" (by first day), each its own grid (a
     sideways carousel on phones, 45-whats-on.css); on wider screens a group folds beyond six (three when filtered) ---------- */
  const runCards = runList ? $$(":scope > .ev", runList) : [];
  const phone = window.matchMedia("(max-width: 699px)");
  const groups = {};
  let runSig = "";
  function runGroup(key, label) {
    const g = document.createElement("div");
    g.className = "wo-rg"; g.dataset.g = key;
    g.innerHTML = `<p class="wo-run-h label">${label} <span class="n"></span></p><div class="wo-grid wo-rgrid"></div><p class="wo-run-more"><button class="btn btn-secondary btn-sm" type="button" aria-expanded="false"></button></p>`;
    const btn = $("button", g);
    btn.addEventListener("click", () => { g.classList.toggle("is-open"); after(); });
    runBox.append(g);
    return { g, grid: $(".wo-rgrid", g), head: $(".wo-run-h", g), n: $(".wo-run-h .n", g), more: $(".wo-run-more", g), btn, label, cards: [] };
  }
  function arrangeRuns() {
    if (!runList || !runCards.length) return;
    const st = (el) => el.dataset.status || "upcoming";
    const sig = runCards.map(st).join();
    if (sig === runSig) return;
    runSig = sig;
    if (!groups.now) { groups.now = runGroup("now", "Running now"); groups.later = runGroup("later", "Opening later"); groups.over = runGroup("over", "Ended"); runList.hidden = true; }
    groups.now.cards = runCards.filter((el) => st(el) === "running").sort((a, b) => a.dataset.run.localeCompare(b.dataset.run));
    groups.later.cards = runCards.filter((el) => st(el) === "upcoming" || st(el) === "soon").sort((a, b) => a.dataset.day.localeCompare(b.dataset.day) || a.dataset.run.localeCompare(b.dataset.run));
    groups.over.cards = runCards.filter((el) => st(el) === "past");
    for (const g of Object.values(groups)) g.grid.append(...g.cards);
  }
  function foldRuns() {
    if (!groups.now) return;
    const filtered = Object.entries(state).some(([k, v]) => set(v) && k !== "view");
    const limit = filtered ? 3 : 6;
    for (const g of Object.values(groups)) {
      const vis = g.cards.filter((el) => !el.hidden && !(hiding() && isPast(el)));
      g.g.hidden = !vis.length;
      g.n.textContent = String(vis.length);
      const open = phone.matches || g.g.classList.contains("is-open");
      vis.forEach((el, i) => el.classList.toggle("wo-fold", !open && i >= limit));
      g.cards.filter((el) => el.hidden).forEach((el) => el.classList.remove("wo-fold"));
      g.more.hidden = phone.matches || vis.length <= limit;
      g.btn.setAttribute("aria-expanded", String(g.g.classList.contains("is-open")));
      g.btn.textContent = g.g.classList.contains("is-open") ? "Show fewer" : `Show all ${vis.length}: ${g.label.toLowerCase()}`;
    }
  }
  phone.addEventListener?.("change", () => after());

  /* ---------- counts, the bar, the past button ---------- */
  function after() {
    const hide = hiding();
    list.classList.toggle("hide-past", hide);
    foldRuns();
    const vis = items.filter(shownNow);
    const u = uniq(vis);
    const filtered = Object.entries(state).some(([k, v]) => set(v) && k !== "view");
    const pastIds = hide ? uniq(items.filter((el) => !el.hidden && isPast(el))) : { live: 0 };
    if (countEl) {
      const dead = u.dead ? `, plus ${u.dead} cancelled or postponed` : "";
      countEl.innerHTML = filtered ? `Showing <b>${u.live}</b> of ${plural(total, "event")}${dead}` : hide ? `<b>${plural(u.live, "event")}</b> from today on${dead}` : `<b>${plural(u.live, "event")}</b>${dead}`;
    }
    if (pastBtn) {
      const n = hide ? pastIds.live : 0;
      pastBtn.hidden = !(inWindow() && !dated() && (showPast || n));
      pastBtn.textContent = showPast ? "Hide earlier dates" : `Show earlier (${n})`;
      pastBtn.setAttribute("aria-label", showPast ? "Hide earlier dates" : `Show earlier dates: ${plural(n, "event")}`);
      pastBtn.setAttribute("aria-pressed", String(showPast));
    }
    for (const d of dayEls) {
      if (d.hidden) continue;
      const c = uniq($$(".ev, .ev-also", d).filter((el) => !el.hidden));
      const el = $(".wo-dc", d);
      if (el) el.textContent = c.live ? plural(c.live, "event") : "Cancelled or postponed only";
    }
    for (const m of monthEls) {
      const days = $$(".wo-day", m).filter((d) => !d.hidden && !(hide && d.dataset.status === "past"));
      const c = uniq(days.flatMap((d) => $$(".ev, .ev-also", d)).filter((el) => !el.hidden));
      const el = $(".wo-mc", m);
      const nd = days.filter((d) => $$(".ev, .ev-also", d).some((el) => !el.hidden && !el.hasAttribute("data-cancelled"))).length;
      if (el) el.textContent = `${plural(c.live, "event")} on ${plural(nd, "day")}`;
      m.classList.toggle("is-past", hide && !days.length && !m.hidden);
      const b = bar && $(`[data-wo-bn="${m.dataset.m}"]`, bar);
      if (b) { b.textContent = String(c.live); const a = b.closest("a"); const none = !c.live || m.hidden || (hide && !days.length); a.classList.toggle("is-none", none); if (none) a.setAttribute("aria-disabled", "true"); else a.removeAttribute("aria-disabled"); }
    }
    if (bar && runBox) {
      const b = $('[data-wo-bn="runs"]', bar);
      const c = uniq(runCards.filter((el) => !el.hidden && !(hide && isPast(el))));
      if (b) { b.textContent = String(c.live); b.closest("a").classList.toggle("is-none", !c.live); }
    }
    todayLink();
    const empty = $("[data-filter-empty]", scope);
    if (empty) empty.hidden = u.ids.size > 0;
    const key = JSON.stringify(state) + hide;
    if (map && key !== lastKey && mapPane && !mapPane.hidden) map.update(u.ids, true);
    lastKey = key;
  }

  /* ---------- "Today" in the month bar ---------- */
  let todayA = null;
  function todayLink() {
    if (!bar) return;
    if (!inWindow()) { if (todayA) todayA.hidden = true; return; }
    const today = app.today();
    const next = dayEls.find((d) => d.dataset.day >= today && !d.hidden);
    if (!todayA) { todayA = document.createElement("a"); todayA.className = "wo-bar-today"; $(".wo-bar-in", bar).prepend(todayA); }
    todayA.hidden = !next;
    if (!next) return;
    todayA.href = `#${next.id}`;
    todayA.innerHTML = next.dataset.day === today ? "<b>Today</b>" : `<b>Next</b><span class="n">${esc(fmtDate(next.dataset.day))}</span>`;
  }

  /* ---------- the month bar follows the scroll ---------- */
  if (bar && "IntersectionObserver" in window) {
    const links = new Map($$("a[data-m]", bar).map((a) => [a.dataset.m, a]));
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) {
        const a = links.get(e.target.dataset.m);
        if (!a) continue;
        links.forEach((x) => x.removeAttribute("aria-current"));
        a.setAttribute("aria-current", "true");
        const box = a.parentElement, l = a.offsetLeft - box.offsetLeft;
        if (l < box.scrollLeft || l + a.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollTo({ left: l - 40, behavior: "smooth" });
      }
    }, { rootMargin: "-140px 0px -65% 0px" });
    monthEls.forEach((m) => io.observe(m));
  }
  bar?.addEventListener("click", (e) => { const a = e.target.closest("a[aria-disabled]"); if (a) e.preventDefault(); });

  /* ---------- "Sheet, area, kind" on phones ---------- */
  const moreBtn = $("[data-wo-more]", scope), morePanel = $("[data-wo-more-panel]", scope);
  if (moreBtn && morePanel) {
    moreBtn.addEventListener("click", () => { const open = moreBtn.getAttribute("aria-expanded") !== "true"; moreBtn.setAttribute("aria-expanded", String(open)); morePanel.classList.toggle("is-open", open); });
  }
  const moreCount = () => {
    const n = ["r", "a", "k", "month"].reduce((a, k) => a + (set(state[k]) ? [].concat(state[k]).length : 0), 0);
    const el = $("[data-wo-more-n]", scope);
    if (el) { el.textContent = String(n); el.hidden = !n; }
    if (n && moreBtn && moreBtn.getAttribute("aria-expanded") !== "true") { moreBtn.setAttribute("aria-expanded", "true"); morePanel?.classList.add("is-open"); }
  };

  /* ---------- wiring ---------- */
  let map = null;
  list.addEventListener("tbc:filter", (e) => { state = e.detail.state || {}; moreCount(); after(); });
  list.addEventListener("tbc:view", (e) => { if (e.detail.view === "map") openMap(); });
  pastBtn?.addEventListener("click", () => { showPast = !showPast; after(); });
  arrangeRuns();
  app.filter.mount(list, { tests });
  app.onTick(() => { dayWords(); arrangeRuns(); after(); }, { immediate: false });
  // a deep link to a folded card (?e=, #e-) shows it
  const target = new URLSearchParams(location.search).get("e") || (location.hash.startsWith("#e-") ? location.hash.slice(3) : "");
  const tEl = target && document.getElementById(`e-${target}`);
  if (tEl && isPast(tEl) && hiding()) { showPast = true; after(); }
  if (tEl && tEl.classList.contains("wo-fold")) { tEl.closest(".wo-rg")?.classList.add("is-open"); after(); }

  /* ---------- the map ---------- */
  async function openMap() {
    const pane = $("[data-wo-map]", scope);
    if (!pane) return;
    if (!map) {
      let data, extra = null;
      try { [data, extra] = await Promise.all([app.data("events.json"), app.data("whats-on-map.json").catch(() => null)]); }
      catch { pane.innerHTML = '<p class="unk">The map could not load the guide\'s data. Try reloading.</p>'; return; }
      map = makeMap(app, pane, data, extra);
    }
    map.update(uniq(items.filter(shownNow)).ids, true);
  }
}

/* ---------- the map view ---------- */
function makeMap(app, pane, data, extra) {
  const meta = data.map;
  const R = app.root;
  const byId = new Map((data.events || []).map((e) => [e.id, e]));
  const places = data.places || {}, regions = data.regions || {};
  if (!meta) { pane.innerHTML = '<p class="unk">The basemap is not in this build yet. Every event is in the List view.</p>'; return { update() {} }; }
  pane.innerHTML = `<div class="map-box wo-mapbox">
<div class="map-bar"><p class="wo-map-sum" data-wm-sum role="status" aria-live="polite"></p><span class="map-bar-acts"><button class="btn btn-secondary btn-sm" type="button" data-wm-fit>${I("fit")}Fit all</button></span></div>
<div class="map-view wo-mapview" data-wm-view><svg class="map-base" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><use href="${R}assets/map/basemap.svg#bm"/></svg><div class="map-labels" aria-hidden="true" data-wm-labels></div><div class="map-pins" data-wm-pins></div><div class="map-zoom"><button type="button" aria-label="Zoom in" data-wm-z="in">${I("plus")}</button><button type="button" aria-label="Zoom out" data-wm-z="out">${I("minus")}</button></div><div class="map-card" data-wm-card hidden></div></div>
<p class="map-legend"><span><span class="lg-buoy"></span>One event</span><span><span class="wo-lg-cl">3</span>Several events at one place or nearby: select to see them or zoom in</span>${extra && extra.attribution ? `<span class="map-attrib">Basemap: ${esc(extra.attribution)}</span>` : ""}</p>
</div>
<p class="wo-map-note" data-wm-note></p>`;
  const view = $("[data-wm-view]", pane), svg = $("svg", view), pinsEl = $("[data-wm-pins]", view), labelsEl = $("[data-wm-labels]", view);
  const card = $("[data-wm-card]", view), sum = $("[data-wm-sum]", pane), note = $("[data-wm-note]", pane);
  const labels = (extra && extra.labels) || [];
  let vb = { x: 0, y: 0, w: meta.W, h: meta.H }, pts = [], groups = new Map();
  const llOf = (ev) => ev.ll || (ev.pl && places[ev.pl] && places[ev.pl].ll) || null;
  const ratio = () => { const r = view.getBoundingClientRect(); return r.width && r.height ? r.width / r.height : 4 / 3; };

  /** A view box of this aspect around [x0, y0, x1, y1] (basemap units), padded and kept inside the basemap. */
  function fit(b) {
    const minW = (2 * 1400) / (meta.mPerUnit || 85);
    let w = Math.max(b[2] - b[0], minW) * 1.18, h = Math.max(b[3] - b[1], minW / ratio()) * 1.18;
    const r = ratio();
    if (w / h > r) h = w / r; else w = h * r;
    return clamp({ x: (b[0] + b[2]) / 2 - w / 2, y: (b[1] + b[3]) / 2 - h / 2, w, h });
  }
  function clamp(v) {
    const r = ratio();
    let { w, h } = v;
    if (w > meta.W) { w = meta.W; h = w / r; }
    if (h > meta.H) { h = meta.H; w = h * r; }
    return { x: Math.min(Math.max(0, v.x), Math.max(0, meta.W - w)), y: Math.min(Math.max(0, v.y), Math.max(0, meta.H - h)), w, h };
  }
  const bounds = (ps) => [Math.min(...ps.map((p) => p.x)), Math.min(...ps.map((p) => p.y)), Math.max(...ps.map((p) => p.x)), Math.max(...ps.map((p) => p.y))];

  function update(ids, refit) {
    card.hidden = true;
    groups = new Map();
    let off = 0, none = 0;
    for (const id of ids) {
      const ev = byId.get(id); if (!ev) continue;
      const ll = llOf(ev);
      if (!ll) { none++; continue; }
      if (!onMap(meta, ll[0], ll[1])) { off++; continue; }
      const key = ev.pl && places[ev.pl] && places[ev.pl].ll ? `p:${ev.pl}` : `${ll[0].toFixed(4)},${ll[1].toFixed(4)}`;
      if (!groups.has(key)) { const [x, y] = project(ll[0], ll[1], meta); groups.set(key, { key, x, y, pl: ev.pl && places[ev.pl] ? ev.pl : null, name: ev.pl && places[ev.pl] ? places[ev.pl].n : ev.lt || ev.t, r: ev.r, evs: [] }); }
      groups.get(key).evs.push(ev);
    }
    pts = [...groups.values()];
    const n = pts.reduce((a, g) => a + g.evs.length, 0);
    sum.textContent = n ? `${plural(n, "event")} at ${plural(pts.length, "place")} on the map` : "No event in this selection is on the map";
    note.innerHTML = [off ? `${plural(off, "event is", "events are")} outside this map (Day Trips and beyond): see the List view.` : "", none ? `${plural(none, "event has", "events have")} no coordinates listed, so ${none === 1 ? "it is" : "they are"} not on the map.` : ""].filter(Boolean).map((s) => `<span>${esc(s)}</span>`).join(" ");
    if (refit) vb = pts.length ? fit(bounds(pts)) : clamp({ x: 0, y: 0, w: meta.W, h: meta.H });
    draw();
  }

  function draw() {
    // the view box has the view's own aspect, so basemap units map to pixels with one scale
    svg.setAttribute("viewBox", `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`);
    const r = view.getBoundingClientRect(), cw = r.width || 1, ch = r.height || 1;
    const s = cw / vb.w;
    const px = (x) => (x - vb.x) * s, py = (y) => (y - vb.y) * s;
    const zoom = meta.W / vb.w;
    labelsEl.innerHTML = labels.filter((l) => (l.minZoom || 1) <= zoom * 1.4).map((l) => { const [x, y] = project(l.lat, l.lng, meta); const X = px(x), Y = py(y); return X > 30 && X < cw - 30 && Y > 12 && Y < ch - 12 ? `<span class="map-label ${esc(l.kind)}" style="left: ${X.toFixed(0)}px; top: ${Y.toFixed(0)}px">${esc(l.text)}</span>` : ""; }).join("");
    const inView = pts.filter((g) => px(g.x) >= -20 && px(g.x) <= cw + 20 && py(g.y) >= -20 && py(g.y) <= ch + 20);
    const cl = cluster(inView.sort((a, b) => b.evs.length - a.evs.length).map((g) => ({ x: px(g.x), y: py(g.y), g })), 40);
    pinsEl.innerHTML = cl.map((c, i) => {
      const gs = c.members.map((m) => m.g), n = gs.reduce((a, g) => a + g.evs.length, 0);
      const pos = `left: ${c.x.toFixed(1)}px; top: ${c.y.toFixed(1)}px`;
      if (gs.length === 1 && n === 1) {
        const ev = gs[0].evs[0];
        return `<button class="pin pin-event" type="button" data-wm-i="${i}"${ev.r ? ` data-sheet="${esc(ev.r)}"` : ""} style="${pos}" aria-label="${esc(`${ev.t}, ${gs[0].name}`)}"><span>${I("flag")}</span></button>`;
      }
      const label = gs.length === 1 ? `${plural(n, "event")} at ${gs[0].name}` : `${plural(n, "event")} at ${gs.length} places nearby: zoom in`;
      return `<button class="pin pin-cluster" type="button" data-wm-i="${i}" style="${pos}" aria-label="${esc(label)}"><span>${n}</span></button>`;
    }).join("");
    pinsEl._cl = cl;
  }

  /* one place: a card listing its events (next date first); several: zoom in */
  function nextOf(ev) { const t = app.now(); return (ev.i || []).find(([, , e]) => e > t) || (ev.i || [])[0]; }
  function whenLine(ev) {
    const x = nextOf(ev); if (!x) return "";
    const [day, s, e, f] = x;
    if (f & 32) return fmtThrough(ev.ed || nyParts(e - 1).date, day);
    const days = [...new Set((ev.i || []).map(([d]) => d))];
    const date = days.length > 1 ? fmtDateRange(days[0], days[days.length - 1]) : fmtDay(day);
    return `${date} · ${f & 4 ? "All day" : f & 2 ? ev.tt || "Time not listed" : f & 1 ? `${fmtTime(hm(s))}, end time not listed` : fmtRange(hm(s), hm(e))}`;
  }
  function openCard(g, trigger) {
    const evs = [...g.evs].sort((a, b) => (nextOf(a)?.[1] || 0) - (nextOf(b)?.[1] || 0));
    const st = (ev) => (ev.st && ev.st !== "scheduled" ? ` · ${esc((data.lb && data.lb.st && data.lb.st[ev.st]) || ev.st)}` : "");
    card.innerHTML = `<button class="map-card-x" type="button" aria-label="Close" data-wm-x>${I("x")}</button>
<p class="label">${g.r && regions[g.r] ? esc(`Sheet ${regions[g.r].no} · ${regions[g.r].n}`) : "Event place"}</p>
<h3>${g.pl ? `<a href="${R}places/${esc(g.pl)}.html">${esc(g.name)}</a>` : esc(g.name)}</h3>
<p class="muted">${esc(plural(evs.length, "event"))} here in this selection</p>
<ul class="wo-mc-list">${evs.map((ev) => `<li><a href="${R}whats-on.html?e=${esc(ev.id)}#e-${esc(ev.id)}" data-open-event="${esc(ev.id)}">${esc(ev.t)}</a><span class="w tnum">${esc(whenLine(ev))}${st(ev)}</span></li>`).join("")}</ul>`;
    card.hidden = false;
    card.dataset.sheet = g.r || "";
    $("[data-wm-x]", card).addEventListener("click", () => { card.hidden = true; trigger?.focus(); });
    $("h3 a, [data-open-event]", card)?.focus({ preventScroll: true });
  }
  pinsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-wm-i]"); if (!b || dragged) return;
    const c = pinsEl._cl[Number(b.dataset.wmI)]; if (!c) return;
    const gs = c.members.map((m) => m.g);
    if (gs.length === 1) { openCard(gs[0], b); return; }
    card.hidden = true;
    vb = fit(bounds(gs)); draw();
  });

  /* zoom, fit, drag */
  const zoomBy = (k, cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2) => {
    const w = Math.min(meta.W, Math.max((2 * 700) / (meta.mPerUnit || 85), vb.w * k)), h = w / ratio();
    vb = clamp({ x: cx - ((cx - vb.x) / vb.w) * w, y: cy - ((cy - vb.y) / vb.h) * h, w, h }); draw();
  };
  $$("[data-wm-z]", view).forEach((b) => b.addEventListener("click", () => zoomBy(b.dataset.wmZ === "in" ? 0.6 : 1 / 0.6)));
  $("[data-wm-fit]", pane).addEventListener("click", () => { card.hidden = true; vb = pts.length ? fit(bounds(pts)) : clamp({ x: 0, y: 0, w: meta.W, h: meta.H }); draw(); });
  let drag = null, dragged = false;
  view.addEventListener("pointerdown", (e) => { if (e.target.closest(".map-card, .map-zoom") || e.button > 0) return; drag = { x: e.clientX, y: e.clientY, vb: { ...vb } }; dragged = false; });
  view.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!dragged && Math.hypot(dx, dy) < 6) return;
    if (!dragged) { dragged = true; view.setPointerCapture?.(e.pointerId); view.classList.add("is-dragging"); }
    const s = view.getBoundingClientRect().width / vb.w;
    vb = clamp({ ...drag.vb, x: drag.vb.x - dx / s, y: drag.vb.y - dy / s }); draw();
  });
  const end = () => { if (!drag) return; drag = null; view.classList.remove("is-dragging"); setTimeout(() => { dragged = false; }, 0); };
  view.addEventListener("pointerup", end); view.addEventListener("pointercancel", end);
  view.addEventListener("wheel", (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const r = view.getBoundingClientRect(); zoomBy(e.deltaY > 0 ? 1.25 : 0.8, vb.x + ((e.clientX - r.left) / r.width) * vb.w, vb.y + ((e.clientY - r.top) / r.height) * vb.h); }, { passive: false });
  view.addEventListener("keydown", (e) => { if (e.key === "Escape" && !card.hidden) { card.hidden = true; } });
  let rt = null;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (!pane.hidden) { vb = clamp({ ...vb, h: vb.w / ratio() }); draw(); } }, 150); });
  return { update };
}

/* =================================================================== My Trip */
async function initTrip(app) {
  const box = $("[data-trip-clash]");
  $$("[data-trip-print]").forEach((b) => b.addEventListener("click", () => window.print()));
  if (!box) return;
  let data;
  try { data = await app.data("events.json"); } catch { return; }
  const byId = new Map((data.events || []).map((e) => [e.id, e]));
  const places = data.places || {};
  const llOf = (ev) => ev.ll || (ev.pl && places[ev.pl] && places[ev.pl].ll) || null;
  const placeOf = (ev) => (ev.pl && places[ev.pl] ? places[ev.pl].n : ev.lt || "");
  const mi = (m) => (m < 400 ? `${Math.round(m / 10) * 10} m` : `${(m / 1609.344).toFixed(1)} mi`);

  function clashes() {
    const t = app.now(), slots = [];
    for (const id of app.trip.list().e) {
      const ev = byId.get(id);
      if (!ev || DEAD.has(ev.st)) continue;
      for (const [day, s, e, f] of ev.i || []) {
        if (f & (2 | 4 | 32)) continue;                 // no listed time, all day, a long run: nothing to compare
        if ((f & 1 ? s : e) <= t) continue;              // over
        slots.push({ ev, day, s, e: f & 1 ? null : e });
      }
    }
    slots.sort((a, b) => a.s - b.s);
    const out = [];
    for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i], b = slots[j];
      // b starts while a is on (a's end is listed), or both start together; nothing later can overlap a
      if (!(b.s === a.s || (a.e != null && b.s < a.e))) break;
      if (a.ev !== b.ev) out.push([a, b]);
    }
    return out;
  }
  const whenOf = (x) => (x.e ? fmtRange(hm(x.s), hm(x.e)) : `${fmtTime(hm(x.s))}, end time not listed`);
  const link = (ev) => `<a href="${app.root}whats-on.html?e=${esc(ev.id)}#e-${esc(ev.id)}" data-open-event="${esc(ev.id)}">${esc(ev.t)}</a>`;
  const prints = $$("[data-trip-print]");
  /** One block per day: the events involved (time and place, once each), then each overlapping pair with the
   *  straight-line distance between the two places (an estimate, said once below). */
  function render() {
    prints.forEach((b) => { b.closest("p").hidden = !app.trip.count(); });
    const cs = clashes();
    box.hidden = !cs.length;
    if (!cs.length) { box.innerHTML = ""; return; }
    const days = new Map();
    for (const [a, b] of cs) { if (!days.has(a.day)) days.set(a.day, { slots: new Map(), pairs: [] }); const d = days.get(a.day); for (const x of [a, b]) if (!d.slots.has(x.ev.id)) d.slots.set(x.ev.id, x); d.pairs.push([a, b]); }
    const apart = (a, b) => {
      if (a.ev.pl && a.ev.pl === b.ev.pl) return "at the same place";
      const la = llOf(a.ev), lb = llOf(b.ev);
      return la && lb ? `${mi(haversine({ lat: la[0], lng: la[1] }, { lat: lb[0], lng: lb[1] }))} apart` : "distance not known: a place has no coordinates";
    };
    const n = new Set(cs.flatMap(([a, b]) => [a.ev.id, b.ev.id])).size;
    box.innerHTML = `<h2 id="trip-clash-h">Times that overlap</h2>
<p class="muted">${esc(`${plural(n, "starred event")} ${n === 1 ? "has" : "have"} listed times that overlap. Check the organizers' pages before you choose.`)}</p>
<ul class="trip-clash-list">${[...days].map(([day, d]) => `<li><p class="trip-clash-day label">${esc(fmtDay(day))} · ${esc(plural(d.slots.size, "event"))}</p>
<ul class="trip-clash-evs">${[...d.slots.values()].sort((a, b) => a.s - b.s).map((x) => `<li>${link(x.ev)} <span class="tnum">${esc(whenOf(x))}</span>${placeOf(x.ev) ? `<span class="w"> · ${esc(placeOf(x.ev))}</span>` : ""}</li>`).join("")}</ul>
<ul class="trip-clash-pairs">${d.pairs.map(([a, b]) => `<li>${esc(a.ev.t)} <span class="faint">and</span> ${esc(b.ev.t)}: <span class="tnum">${esc(apart(a, b))}</span></li>`).join("")}</ul></li>`).join("")}</ul>
<p class="faint trip-clash-note">Distances are straight lines between the two places: estimates, not travel times. An event with no end time listed overlaps only what is under way when it starts.</p>`;
  }
  render();
  app.trip.subscribe(render);
  app.onTick(render, { immediate: false });
}
