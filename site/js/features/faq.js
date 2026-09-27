/* ============================================================
   site/js/features/faq.js · OWNER: the Visit lane
   faq.html. The core list filter (core/filter.js) already filters the questions by the search box (?q=) and the
   topic chips (?topic=), with the count, the empty state and the URL. This module adds what is FAQ-specific:
     - #fq-<id> in the URL (a search hit, a shared link) opens that question and scrolls to it, also on hashchange;
     - a search that finds 8 questions or fewer opens their answers, and closes the ones it opened when the search
       changes (answers the reader opened stay open);
     - opening a question puts its #fq-<id> in the address bar (replaceState), so the URL is a link to it.
   Every question is in the HTML: without JS they are all listed, closed, by topic.
   ============================================================ */

const OPEN_MAX = 8;

export function init(app) {
  const list = document.querySelector("[data-filter-list] details.faq") ? document.querySelector("[data-filter-list]") : null;
  let auto = new Set();   // answers a search opened (closed again when the search changes)

  const openTarget = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!/^fq-/.test(id)) return;
    const d = document.getElementById(id);
    if (!d || !d.matches("details.faq")) return;
    d.hidden = false;
    const g = d.closest("[data-filter-group]");
    if (g) g.hidden = false;
    d.open = true;
    requestAnimationFrame(() => d.scrollIntoView({ block: "start" }));
  };
  openTarget();
  window.addEventListener("hashchange", openTarget);

  if (!list) return;
  const items = [...list.querySelectorAll("details.faq")];

  function sync(state, visible) {
    const q = String((state && state.q) || "").trim();
    const few = q && visible.length && visible.length <= OPEN_MAX;
    const keep = new Set();
    for (const d of auto) { if (few && visible.includes(d)) keep.add(d); else d.open = false; }
    auto = keep;
    if (few) for (const d of visible) if (!d.open) { d.open = true; auto.add(d); }
  }
  list.addEventListener("tbc:filter", (e) => sync(e.detail.state, e.detail.visible || []));
  const ctl = app.filter.get(list);
  if (ctl) sync(ctl.state(), ctl.visible());

  // "toggle" fires after the fact (a queued task), so opened-by-script answers are recognized by membership, not a flag
  for (const d of items) d.addEventListener("toggle", () => {
    if (!d.open || !d.id || auto.has(d) || location.hash === `#${d.id}`) return;
    const u = new URL(location.href);
    u.hash = d.id;
    try { history.replaceState(history.state, "", u); } catch { /* file:// */ }
  });
}
