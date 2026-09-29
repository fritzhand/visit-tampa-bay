/* ============================================================
   site/js/core/filter.js · OWNER: E2 (client runtime; generalizes Cincy Week's directory filter)
   The generic list filter. A page opts in by marking the list:
     <div data-filter-list> … cards … </div>
   Items are the list's [data-q] descendants (every card the build emits has data-q), or the selector in
   data-filter-items="…", else its children. Controls are looked up in the nearest [data-filter-root]
   ancestor, else the whole page:
     input[data-filter-q]                         free text (every term, in the card's text or data-q)
     select[data-filter="<key>"]                  one value per key (c.toolbar() renders these)
     input[type=checkbox][data-filter="<key>"]    a yes/no key (free, star)
     button[data-filter-chip="<key>=<value>"]     toggles a value (aria-pressed follows the state)
     [data-filter-clear]                          resets every key
     [data-result-count]                          "Showing <b>n</b> of N <data-noun>" (c.resultCount())
     [data-filter-empty]                          shown only when nothing matches
     [data-view="<v>"] + [data-view-pane="<v>"]   the List / Map toggle (c.toolbar views): aria-pressed,
                                                  panes shown or hidden, ?view= kept, remembered in
                                                  tbc-prefs "<page>.view", event "tbc:view"
   Inside the list, [data-filter-group] elements (a month, a sheet) hide when none of their items shows.
   Keys and the attributes they read: lib/facets.js FACETS (r a k t tag f era month series topic day
   when free star q; any other key reads data-<key>). The state round-trips through the URL
   (lib/filters.js; other keys such as e, x and view are kept), so every filtered view is a link.
   After each pass the list gets a "tbc:filter" event: detail { state, shown, total, visible: [elements] }.
   Opt out with data-filter-list="manual" and mount it yourself: app.filter.mount(list, { tests, facets })
   → { state(), set(key, value), reset(), apply(), refresh(), visible() }.
   ============================================================ */
import { $, $$, PAGE, esc } from "./dom.js";
import { parse, serialize } from "../lib/filters.js";
import { FACETS, itemOf, matchItem, schemaFor } from "../lib/facets.js";
import { now, onTick } from "./clock.js";
import { has as inTrip, subscribe } from "./trip-store.js";
import { pref } from "./store.js";

const mounted = new WeakMap();
/** The words a card shows (its details included), without source lines, screen-reader notes, buttons and summaries. */
const SKIP = ".source-line, .sr-only, button, summary, script, style";
function cardText(el) {
  let out = "";
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const skip = n.parentElement && n.parentElement.closest(SKIP); if (!skip || !el.contains(skip)) out += ` ${n.nodeValue}`; }
  return out;
}
const isDefault = (v) => v == null || v === "" || v === false || (Array.isArray(v) && !v.length);

export function mountFilter(list, opts = {}) {
  if (!list) return null;
  if (mounted.has(list)) return mounted.get(list);
  const scope = opts.root || list.closest("[data-filter-root]") || document;
  const within = (s) => $$(s, scope);
  const tests = opts.tests || {};
  const qInput = $("input[data-filter-q]", scope);
  const selects = within("select[data-filter]"), checks = within('input[type="checkbox"][data-filter]'), chips = within("[data-filter-chip]");
  const chipOf = (b) => { const [k, ...v] = (b.dataset.filterChip || "").split("="); return [k, v.join("=")]; };
  const keys = [...new Set(["q", ...selects.map((s) => s.dataset.filter), ...checks.map((c) => c.dataset.filter), ...chips.map((b) => chipOf(b)[0]), ...Object.keys(FACETS), ...Object.keys(tests)].filter(Boolean))];
  const schema = schemaFor(keys, opts.facets);
  let state = parse(location.search, schema);
  let items = [];

  function refresh() {
    let els = $$(opts.items || list.getAttribute("data-filter-items") || "[data-q]", list);
    if (!els.length) els = [...list.children];
    items = els.map((el) => ({ el, it: itemOf(el.dataset, cardText(el), (el.querySelector("[data-star]") || el).dataset.star || null) }));
  }

  function syncControls() {
    if (qInput && document.activeElement !== qInput) qInput.value = state.q || "";
    for (const s of selects) {
      const k = s.dataset.filter, v = state[k];
      const want = Array.isArray(v) ? v.join(",") : v === true ? "1" : v || "";
      $$("option[data-filter-temp]", s).forEach((o) => { if (o.value !== want) o.remove(); });
      if (want && ![...s.options].some((o) => o.value === want)) {
        const o = document.createElement("option");
        o.value = want; o.textContent = want.split(",").join(", "); o.dataset.filterTemp = "";
        s.appendChild(o);
      }
      s.value = want;
    }
    for (const c of checks) c.checked = !!state[c.dataset.filter];
    for (const b of chips) {
      const [k, v] = chipOf(b), cur = state[k];
      const on = Array.isArray(cur) ? cur.includes(v) : cur === true ? v === "1" || v === "" : cur === v;
      b.setAttribute("aria-pressed", String(!!on));
    }
    within("[data-filter-clear]").forEach((b) => { b.hidden = Object.values(state).every(isDefault); });
  }

  function writeUrl() {
    const u = new URL(location.href);
    const kept = [...u.searchParams].filter(([k]) => !(k in schema)).map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%2C/gi, ",")}`);
    const search = [serialize(state, schema).slice(1), ...kept].filter(Boolean).join("&");
    try { history.replaceState(history.state, "", `${u.pathname}${search ? `?${search}` : ""}${u.hash}`); } catch { /* file:// */ }
  }

  function apply({ url = true } = {}) {
    const t = now();
    let shown = 0;
    const visible = [];
    for (const { el, it } of items) {
      const ok = matchItem(it, state, { now: t, inTrip, tests });
      if (el.hidden === ok) el.hidden = !ok;
      if (ok) { shown++; visible.push(el); }
    }
    for (const g of $$("[data-filter-group]", list)) {
      const any = items.some(({ el }) => !el.hidden && g.contains(el));
      g.hidden = !any;
    }
    for (const rc of within("[data-result-count]")) {
      rc.innerHTML = `Showing <b>${shown}</b> of ${items.length}${rc.dataset.noun ? ` ${esc(rc.dataset.noun)}` : ""}`;
    }
    within("[data-filter-empty]").forEach((e) => { e.hidden = shown > 0; });
    syncControls();
    if (url) writeUrl();
    list.dispatchEvent(new CustomEvent("tbc:filter", { bubbles: true, detail: { state: { ...state }, shown, total: items.length, visible } }));
  }

  const set = (k, v) => { if (!(k in schema)) return; state = { ...state, [k]: v }; apply(); };
  const reset = () => { state = parse("", schema); apply(); };

  /* ---------- wiring ---------- */
  let timer = null;
  if (qInput) {
    qInput.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => set("q", qInput.value.trim().slice(0, 100)), 150); });
    qInput.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });
  }
  for (const s of selects) s.addEventListener("change", () => {
    const k = s.dataset.filter, spec = schema[k];
    const v = s.value;
    set(k, spec.type === "list" ? (v ? v.split(",").filter(Boolean) : []) : spec.type === "bool" ? v === "1" : v || null);
  });
  for (const c of checks) c.addEventListener("change", () => set(c.dataset.filter, c.checked));
  for (const b of chips) b.addEventListener("click", (e) => {
    e.preventDefault();
    const [k, v] = chipOf(b), spec = schema[k], cur = state[k];
    if (!spec) return;
    if (spec.type === "list") set(k, (cur || []).includes(v) ? cur.filter((x) => x !== v) : [...(cur || []), v]);
    else if (spec.type === "bool") set(k, !cur);
    else set(k, cur === v ? null : v);
  });
  within("[data-filter-clear]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); reset(); if (qInput) qInput.value = ""; }));
  subscribe(() => { if (state.star) apply({ url: false }); });
  onTick(() => { if (state.when) apply({ url: false }); }, { immediate: false });

  /* ---------- the List / Map toggle ---------- */
  const views = within("[data-view]");
  if (views.length) {
    const allowed = views.map((b) => b.dataset.view);
    const def = (views.find((b) => b.getAttribute("aria-pressed") === "true") || views[0]).dataset.view;
    const setView = (v, { save = true, url = true } = {}) => {
      views.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
      within("[data-view-pane]").forEach((p) => { p.hidden = p.dataset.viewPane !== v; });
      list.dataset.view = v;
      if (save) pref(`${PAGE}.view`, v === def ? null : v);
      if (url) {
        const u = new URL(location.href);
        if (v === def) u.searchParams.delete("view"); else u.searchParams.set("view", v);
        try { history.replaceState(history.state, "", `${u.pathname}${u.search.replace(/%2C/gi, ",")}${u.hash}`); } catch { /* file:// */ }
      }
      list.dispatchEvent(new CustomEvent("tbc:view", { bubbles: true, detail: { view: v } }));
    };
    views.forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); setView(b.dataset.view); }));
    const fromUrl = new URLSearchParams(location.search).get("view"), saved = pref(`${PAGE}.view`);
    setView(allowed.includes(fromUrl) ? fromUrl : allowed.includes(saved) ? saved : def, { save: false, url: false });
  }

  refresh();
  apply({ url: false });
  const ctl = { state: () => ({ ...state }), set, reset, apply, refresh: () => { refresh(); apply({ url: false }); }, visible: () => items.filter(({ el }) => !el.hidden).map(({ el }) => el) };
  mounted.set(list, ctl);
  return ctl;
}

export const getFilter = (list) => mounted.get(list) || null;
export function initFilters() {
  $$("[data-filter-list]").forEach((l) => { if (l.getAttribute("data-filter-list") !== "manual") mountFilter(l); });
}
