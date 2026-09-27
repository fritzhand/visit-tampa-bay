/* ============================================================
   site/js/features/history.js · OWNER: the History lane (history-and-passages)
   Two pages, one module (each part runs only where its markup is):

   history.html — the core list filter (core/filter.js) already filters the timeline entries (.tl-item) and the
     historic-site rows (.hs-item) of one [data-filter-list] by era, sheet and text, hides empty eras, sheets and
     areas ([data-filter-group]) and keeps the state in the URL (?era=boomtown&r=tampa&q=…). This module adds
     what the page needs on top:
       - the counts per section: [data-hx-count="all"] "Showing 24 of 115 entries · 30 of 186 historic sites",
         [data-hx-count="sites"] "30 of 186 sites" (the core writes one count for the whole list);
       - the empty state of each section ([data-hx-empty="tl"|"sites"]);
       - a #tl-<id> or #hs-<id> target (a search hit, a shared link) that the current filter hides clears the
         filter first, so the link always lands on its entry.

   passages.html — "Star all n stops" (button[data-star-all='[["p","id"],…]']): adds every stop of the passage
     to My Trip (app.trip.add per kind), or, when all are in it already, takes them out; the label and
     aria-pressed follow the trip (also when stars change elsewhere), and a toast says what happened.

   Without JS: every entry and row is listed, the counts show the totals, and the star-all buttons are hidden
   (.js-only). Features never import ../core/*: everything goes through `app`.
   ============================================================ */

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function init(app) {
  initHistory(app);
  initStarAll(app);
}

/* ---------- history.html ---------- */
function initHistory(app) {
  const list = document.querySelector(".hx-filtered [data-filter-list]");
  if (!list) return;
  const all = document.querySelector('[data-hx-count="all"]');
  const sitesCount = document.querySelector('[data-hx-count="sites"]');
  const emptyTl = document.querySelector('[data-hx-empty="tl"]');
  const emptySites = document.querySelector('[data-hx-empty="sites"]');
  const tlTotal = list.querySelectorAll(".tl-item").length;
  const siteTotal = list.querySelectorAll(".hs-item").length;

  const isActive = (state) => Object.values(state || {}).some((v) => v != null && v !== "" && v !== false && !(Array.isArray(v) && !v.length));
  function write(state, visible) {
    const tl = visible.filter((el) => el.classList.contains("tl-item")).length;
    const hs = visible.filter((el) => el.classList.contains("hs-item")).length;
    const on = isActive(state);
    if (all) all.innerHTML = on
      ? `Showing <b>${tl}</b> of ${tlTotal} entries · <b>${hs}</b> of ${plural(siteTotal, "historic site")}`
      : `${plural(tlTotal, "entry", "entries")} · ${plural(siteTotal, "historic site")}`;
    if (sitesCount) sitesCount.textContent = on ? `${hs} of ${plural(siteTotal, "site")}` : plural(siteTotal, "site");
    if (emptyTl) emptyTl.hidden = tl > 0;
    if (emptySites) emptySites.hidden = hs > 0;
  }
  list.addEventListener("tbc:filter", (e) => write(e.detail.state, e.detail.visible));
  const ctl = app.filter.get(list);
  if (ctl) write(ctl.state(), ctl.visible());

  // a hash that points at an entry the filter hides: clear the filter, then go there
  function reveal() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!/^(tl|hs)-/.test(id)) return;
    const el = document.getElementById(id);
    if (!el || !list.contains(el)) return;
    const hiddenByFilter = el.hidden || !!el.closest("[data-filter-group][hidden]");
    if (!hiddenByFilter) return;
    const c = app.filter.get(list);
    if (c) c.reset();
    requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
  }
  reveal();
  window.addEventListener("hashchange", reveal);
}

/* ---------- passages.html ---------- */
function initStarAll(app) {
  const buttons = [...document.querySelectorAll("button[data-star-all]")];
  if (!buttons.length) return;
  const stopsOf = (b) => { try { return JSON.parse(b.dataset.starAll).filter((x) => Array.isArray(x) && x.length === 2); } catch { return []; } };
  const allIn = (stops) => stops.length > 0 && stops.every(([, id]) => app.trip.has(id));

  function label(b) {
    const stops = stopsOf(b), on = allIn(stops);
    const n = stops.length, inTrip = stops.filter(([, id]) => app.trip.has(id)).length;
    b.setAttribute("aria-pressed", String(on));
    const l = b.querySelector("[data-star-all-label]") || b;
    l.textContent = on ? `All ${n} stops are in My Trip` : inTrip ? (n - inTrip === 1 ? "Star the other stop" : `Star the other ${n - inTrip} stops`) : `Star all ${n} stops`;
    b.setAttribute("aria-label", on ? `Remove all ${n} stops of “${b.dataset.title || "this passage"}” from My Trip` : `Add all ${n} stops of “${b.dataset.title || "this passage"}” to My Trip`);
  }

  for (const b of buttons) {
    label(b);
    b.addEventListener("click", () => {
      const stops = stopsOf(b);
      if (!stops.length) return;
      if (allIn(stops)) {
        app.trip.remove(stops.map(([, id]) => id));
        app.toast(`Removed ${plural(stops.length, "stop")} from My Trip`, { link: true });
      } else {
        const missing = stops.filter(([, id]) => !app.trip.has(id));
        const byKind = new Map();
        for (const [k, id] of missing) { if (!byKind.has(k)) byKind.set(k, []); byKind.get(k).push(id); }
        for (const [k, ids] of byKind) app.trip.add(ids, k);
        app.toast(`Added ${plural(missing.length, "stop")} to My Trip`, { link: true });
      }
      app.trip.refresh();
      buttons.forEach(label);
    });
  }
  app.trip.subscribe(() => buttons.forEach(label));
}
