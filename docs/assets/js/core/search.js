/* ============================================================
   site/js/core/search.js · OWNER: E2 (client runtime; ported from Cincy Week)
   The ⌘K palette (#search). The index (assets/data/search.json, every record:
   build/core/search.mjs) is fetched on the first sign of intent (a pointer or
   focus on a search button), on first open, or when idle on the index and
   list pages. Results are grouped (Places, Events, Experiences, Places to
   stay, Areas and sheets, History, Getting around, FAQ, Pages), up to 5 per
   group, with a "See all n" row into the list page (?q=). The empty query
   shows "On today" (events listed today that have not ended, from
   events.json), the six sheets and the pages.
   Keyboard + ARIA: combobox input, listbox, aria-activedescendant,
   aria-selected, a live "n results" status, ⌘K / Ctrl K toggles, "/" opens.
   ============================================================ */
import { $, $$, ROOT, PAGE, IS_MAC, esc, modified, I, B } from "./dom.js";
import { getJSON, idle } from "./data.js";
import { showModal, hideModal, current } from "./modal.js";
import { now } from "./clock.js";
import { prepare, search, group, mark, SEE_ALL } from "../lib/search.js";
import { nyParts, fmtTime } from "../lib/time.js";

let modal, input, list, statusEl, items = null, failed = false, sel = -1, today = null, opener = null;
/** The element that opened the palette (dialogs opened from a hit return focus there). */
export const searchOpener = () => (opener && document.contains(opener) ? opener : null);

function load() {
  return getJSON("search.json").then((d) => { items = prepare(d.items || []); }).catch(() => { failed = true; });
}
/** Events listed today that have not ended (runs, cancelled and postponed left out), as palette hits. */
function loadToday() {
  return getJSON("events.json").then((data) => {
    const t = now(), day = nyParts(t).date, out = [];
    for (const ev of data.events || []) {
      if (ev.st === "cancelled" || ev.st === "postponed") continue;
      const x = (ev.i || []).find(([d, , e, f]) => d === day && e > t && !(f & 32));
      if (!x) continue;
      const [, s, e, f] = x;
      const when = f & 4 ? "All day" : f & 2 ? ev.tt || "Time not listed" : !(f & 1) && s <= t && t < e ? "Now" : fmtTime(nyParts(s).hhmm);
      const where = ev.pl && data.places && data.places[ev.pl] ? data.places[ev.pl].n : ev.lt || "";
      out.push({ k: "ev", id: ev.id, t: ev.t, s: [when, where].filter(Boolean).join(" · "), u: `whats-on.html?e=${ev.id}`, r: ev.r, _s: f & 6 ? s + 12 * 3600e3 : s });
    }
    today = { day, hits: out.sort((a, b) => a._s - b._s) };
  }).catch(() => { today = { day: null, hits: [] }; });
}

/** The sidebar's page order (build/nav.mjs NAV, sheets aside), for the empty palette. */
const NAV_ORDER = ["index", "whats-on", "map", "trip", "things-to-do", "experiences", "outdoors", "history", "eat-drink", "passages", "stay", "areas", "getting-around", "when-to-visit", "faq", "about"];
const ICON = { pl: "pin", st: "anchor", ex: "daymark", ev: "flag", se: "calendar", ar: "hood", rg: "compass", pg: "info", fq: "help", tr: "bus", tl: "landmark" };
const lead = (h) => (h.k === "rg" && h.r ? B(h.r) : I(h.k === "pg" && String(h.id || "").startsWith("route-") ? "route" : ICON[h.k] || "pin"));

function hitHtml(h, q, n) {
  return `<a class="sr-hit" role="option" id="sr-hit-${n}" aria-selected="false" href="${esc(ROOT + h.u)}"${h.k === "ev" && h.id ? ` data-open-event="${esc(h.id)}"` : h.k === "ex" && h.id ? ` data-open-experience="${esc(h.id)}"` : ""}>${lead(h)}<span><span class="t">${mark(h.t, q, esc)}</span>${h.s ? `<span class="m">${esc(h.s)}</span>` : ""}</span>${I("arrow-r")}</a>`;
}

function render() {
  const q = input.value.trim();
  sel = -1;
  input.removeAttribute("aria-activedescendant");
  if (failed) { list.innerHTML = `<p class="sr-group">Search needs the site to be served over http(s). The sidebar reaches every page.</p>`; statusEl.textContent = ""; return; }
  if (!items) { list.innerHTML = `<p class="sr-group">Loading…</p>`; return; }
  let groups, n = 0, html = "";
  if (!q) {
    groups = [];
    const day = nyParts(now()).date;
    if (today && today.day === day && today.hits.length) groups.push({ label: "On today", items: today.hits.slice(0, 6), total: today.hits.length, all: "whats-on.html?when=today" });
    groups.push({ label: "Sheets", items: items.filter((x) => x.k === "rg"), total: 0 });
    const order = (x) => { const i = NAV_ORDER.indexOf(x.id); return i < 0 ? 99 : i; };
    groups.push({ label: "Pages", items: items.filter((x) => x.k === "pg" && !String(x.id || "").startsWith("route-")).sort((a, b) => order(a) - order(b)).slice(0, 16), total: 0 });
  } else {
    groups = group(search(items, q, { now: now() }), 5);
  }
  for (const g of groups) {
    if (!g.items.length) continue;
    html += `<p class="sr-group label" role="presentation"><span>${esc(g.label)}</span>${g.total > g.items.length ? `<span class="tnum">${g.total}</span>` : ""}</p>`;
    for (const h of g.items) html += hitHtml(h, q, n++);
    const all = g.all || (q && SEE_ALL[g.label] ? `${SEE_ALL[g.label]}?q=${encodeURIComponent(q)}` : "");
    if (all && g.total > g.items.length) html += `<a class="sr-all" href="${esc(ROOT + all)}">See all ${g.total}${I("arrow-r")}</a>`;
  }
  list.innerHTML = n ? html : `<p class="sr-group">No results for “${esc(q)}”. Try a place, a town, a hotel or a kind of tour.</p>`;
  statusEl.textContent = q ? `${groups.reduce((a, g) => a + g.total, 0)} results` : "";
}

function move(d) {
  const hits = $$(".sr-hit", list);
  if (!hits.length) return;
  sel = sel < 0 ? (d > 0 ? 0 : hits.length - 1) : (sel + d + hits.length) % hits.length;
  hits.forEach((h, i) => h.setAttribute("aria-selected", String(i === sel)));
  hits[sel].scrollIntoView({ block: "nearest" });
  input.setAttribute("aria-activedescendant", hits[sel].id);
}

export function openSearch(trigger, q = "") {
  if (!modal) return;
  input.value = q;
  render();
  opener = trigger || (document.activeElement !== document.body ? document.activeElement : null);
  showModal(modal, { trigger, focus: input });
  const pending = [];
  if (!items && !failed) pending.push(load());
  if (!today || today.day !== nyParts(now()).date) pending.push(loadToday());
  if (pending.length) Promise.all(pending).then(() => { if (current() === modal) render(); });
}

export function initSearch() {
  modal = $("#search"); input = $("[data-search-input]"); list = $("[data-search-results]"); statusEl = $("[data-search-status]");
  $$("[data-k-hint]").forEach((k) => { k.textContent = IS_MAC ? "⌘K" : "Ctrl K"; });
  if (!modal || !input) return;
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-search-open]"); if (b) { e.preventDefault(); openSearch(b); } });
  input.addEventListener("input", render);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { const hits = $$(".sr-hit", list); const h = hits[sel >= 0 ? sel : 0]; if (h) { e.preventDefault(); h.click(); } }
  });
  // a hit that navigates closes the palette (so Back never returns to an open one); a hit that opens a dialog
  // (events, experiences) leaves it to the dialog, which takes over the one modal and returns focus to the opener
  list.addEventListener("click", (e) => { const a = e.target.closest("a"); if (a && !modified(e) && !a.matches("[data-open-event], [data-open-experience]")) hideModal(false); }, true);
  const typing = (el) => el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key || "").toLowerCase() === "k") {
      e.preventDefault();
      if (current() === modal) hideModal(); else openSearch(null);
    } else if (e.key === "/" && !current() && !typing(document.activeElement)) {
      e.preventDefault(); openSearch(null);
    }
  });
  // warm the index on the first sign of intent; prefetch it when idle on the pages people search from
  const warm = (e) => {
    if (!(e.target instanceof Element) || !e.target.closest("[data-search-open]")) return;
    if (!items && !failed) load();
    for (const t of ["pointerover", "focusin", "touchstart"]) document.removeEventListener(t, warm, true);
  };
  for (const t of ["pointerover", "focusin", "touchstart"]) document.addEventListener(t, warm, { capture: true, passive: true });
  if (["index", "things-to-do", "experiences", "stay", "whats-on", "eat-drink", "outdoors", "history", "areas"].includes(PAGE)) idle(() => { if (!items && !failed) load(); });
}
