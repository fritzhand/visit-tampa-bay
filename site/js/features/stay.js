/* ============================================================
   site/js/features/stay.js · OWNER: the Stay lane (experiences-eat-stay)
   The lane's one client module, loaded by stay.html, stays/<id>.html and eat-drink.html. Everything it
   touches is also in the server-rendered HTML, so the pages work without it.

   · a[data-set-filter="k=v&k2=v2"] (quick filters, "Choosing an area" counts): with the list filter mounted,
     a click resets it, applies those keys in place and moves to the list (#list); a modified click, or a page
     without a filter, follows the link (the same URL reloads with the filter set).
   · stay.html [data-stay-list]: mounts the list filter (data-filter-list="manual") with an AND test for f
     (features: "has all of" the selected ones; every other key keeps the core's rules), and the Map view:
     the basemap (assets/map/basemap.svg#bm) with a square buoy per stay shown by the filters, 44px clusters
     that zoom in, pan (drag, arrow keys), zoom (buttons, Ctrl/⌘ + wheel, pinch, + −, 0 fits), and a card for
     the selected stay linking its page. Stays outside the chart or without coordinates are counted in words.
   · stays/<id>.html [data-near-events]: the rows (every event within 2 km, data-days / data-run) are narrowed
     to the next 30 days at the reader's clock (app.today(), ?now= on localhost): 8 shown, the rest of those
     30 days folded, later ones under "Later this season", past ones removed; date boxes show the next day.
   Imports only ../lib/* (features never import ../core/*).
   ============================================================ */
import { project, metaOf, onMap, cluster, clampView, fitScale } from "../lib/geo.js";
import { esc } from "../lib/text.js";
import { addDays, dowShort, fmtDate } from "../lib/time.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const I = (n) => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const still = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function init(app) {
  const stayList = $("[data-stay-list]");
  if (stayList) initStayList(app, stayList);
  initFilterLinks(app);
  const near = $("[data-near-events]");
  if (near) initNearEvents(app, near);
}

/* ============================== quick filter links ============================== */
function initFilterLinks(app) {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-set-filter]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
    const list = $("[data-filter-list]");
    const ctl = list && app.filter.get(list);
    if (!ctl) return;
    e.preventDefault();
    ctl.reset();
    for (const pair of (a.dataset.setFilter || "").split("&")) {
      const i = pair.indexOf("=");
      if (i < 1) continue;
      const k = pair.slice(0, i), v = decodeURIComponent(pair.slice(i + 1));
      ctl.set(k, v.split(",").filter(Boolean));
    }
    const target = $("#list") || list;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.scrollIntoView({ behavior: still() ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
  });
}

/* ============================== stay.html: the list and the map ============================== */
function initStayList(app, list) {
  const every = (item, v) => { const have = String(item.ds.f || "").split(/\s+/); return v.every((x) => have.includes(String(x))); };
  const ctl = app.filter.mount(list, { tests: { f: every } });
  const box = $("[data-stay-map]");
  if (!ctl || !box) return;
  let map = null;
  const pinsOf = (els) => els.filter((el) => el.dataset.stay).map((el) => {
    const ll = (el.dataset.ll || "").split(",").map(Number);
    const a = $(".card-title a", el);
    return { id: el.dataset.stay, lat: ll.length === 2 ? ll[0] : null, lng: ll.length === 2 ? ll[1] : null, sheet: el.dataset.sheet || "", name: a ? a.textContent : el.dataset.stay, href: a ? a.getAttribute("href") : "#", kind: ($(".card-kind", el) || {}).textContent || "", area: ($(".card-area", el) || {}).textContent || "", st: el.dataset.st || "open", status: ($(".card-status .badge", el) || {}).textContent || "" };
  });
  const sync = (els) => {
    if (!map) return;
    const pins = pinsOf(els);
    map.update(pins);
  };
  const open = () => {
    if (!map) map = mountStayMap(app, box, { onCount: (on, total) => {
      const c = $("[data-map-count]", box), off = $("[data-map-off]");
      if (c) c.textContent = `${plural(on, "place to stay", "places to stay")} on this chart`;
      if (off) { const n = total - on; off.hidden = n === 0; off.textContent = n ? `${plural(n, "of the places shown is", "of the places shown are")} not on this chart (outside its area, or no coordinates listed). Switch to the list to see ${n === 1 ? "it" : "them"}.` : ""; }
    } });
    sync(ctl.visible());
  };
  list.addEventListener("tbc:view", (e) => { if (e.detail.view === "map") open(); });
  list.addEventListener("tbc:filter", (e) => sync(e.detail.visible));
  if (list.dataset.view === "map") open();
}

/** A compact, dependency-free chart: HTML buoys over the token-themed basemap (50-map.css styles every piece). */
function mountStayMap(app, box, { onCount }) {
  const view = $("[data-map-view]", box);
  const ROOT = app.root || "";
  const S = { meta: null, labels: [], all: [], pins: [], v: null, vw: 0, vh: 0, sel: null, ready: false, init: true };
  let pending = [];
  view.classList.add("is-loading");
  view.tabIndex = 0;
  view.setAttribute("role", "group");
  view.setAttribute("aria-roledescription", "map");
  view.setAttribute("aria-label", "Map of the places to stay shown by the filters. Arrow keys pan, plus and minus zoom, 0 shows them all. Every place is also in the list.");

  let svg, labelsEl, pinsEl, card, hint;
  const api = { update(pins) { pending = pins; if (S.ready) setPins(pins); } };

  app.data(box.dataset.src || "stay-map.json").then((d) => {
    S.meta = metaOf(d.map);
    if (!S.meta) throw new Error("no projection");
    S.labels = (d.map.labels || []).map((l) => ({ ...l, xy: project(l.lat, l.lng, S.meta) }));
    build();
    S.ready = true;
    view.classList.remove("is-loading");
    const ro = new ResizeObserver(() => {
      const r = view.getBoundingClientRect();
      if (Math.abs(r.width - S.vw) < 0.5 && Math.abs(r.height - S.vh) < 0.5) return;
      S.vw = r.width; S.vh = r.height;
      if (S.init) setPins(pending); else { S.v = clamp(S.v); render(); }
    });
    ro.observe(view);
  }).catch((e) => {
    console.error("[tbc] stay map", e);
    view.classList.remove("is-loading");
    view.insertAdjacentHTML("beforeend", `<p class="map-fail unk">The map could not load. Every place to stay is in the list.</p>`);
  });

  function build() {
    const { W, H } = S.meta;
    view.insertAdjacentHTML("beforeend", `<svg class="map-base" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><use href="${esc(ROOT)}assets/map/basemap.svg#bm"/></svg><div class="map-labels" aria-hidden="true"></div><div class="map-pins"></div>
<div class="map-zoom"><button type="button" data-zoom="in" aria-label="Zoom in">${I("plus")}</button><button type="button" data-zoom="out" aria-label="Zoom out">${I("minus")}</button><button type="button" data-zoom="fit" aria-label="Show every place to stay shown">${I("fit")}</button></div>
<p class="map-hint" hidden></p><div class="map-card" role="region" aria-label="Selected place to stay" hidden></div>`);
    svg = $(".map-base", view); labelsEl = $(".map-labels", view); pinsEl = $(".map-pins", view); card = $(".map-card", view); hint = $(".map-hint", view);
    wire();
  }

  /* ---------- the view: center in basemap units, s = px per unit ---------- */
  const MAX_S = 14;
  const clamp = (v) => clampView(v, Math.max(1, S.vw), Math.max(1, S.vh), S.meta, MAX_S);
  const boxOf = (pts) => [Math.min(...pts.map((p) => p.x)), Math.min(...pts.map((p) => p.y)), Math.max(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.y))];
  function fit(pts) {
    const b = pts && pts.length ? boxOf(pts) : (() => { const h = S.meta.home; const [x0, y0] = project(h.n, h.w, S.meta), [x1, y1] = project(h.s, h.e, S.meta); return [x0, y0, x1, y1]; })();
    const s = Math.min(pts && pts.length === 1 ? 5 : 7, fitScale(b, S.vw, S.vh, 60));
    S.v = clamp({ cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2 - 18 / s, s });   // buoys stand above their points
  }
  function zoomAt(f, px = S.vw / 2, py = S.vh / 2) {
    const v = S.v, ux = v.cx + (px - S.vw / 2) / v.s, uy = v.cy + (py - S.vh / 2) / v.s, s = Math.min(MAX_S, v.s * f);
    S.v = clamp({ s, cx: ux - (px - S.vw / 2) / s, cy: uy - (py - S.vh / 2) / s });
    render();
  }

  function setPins(pins) {
    S.all = pins;
    S.pins = pins.filter((p) => onMap(S.meta, p.lat, p.lng)).map((p) => { const [x, y] = project(p.lat, p.lng, S.meta); return { ...p, x, y }; });
    if (onCount) onCount(S.pins.length, pins.length);
    if (S.sel && !S.pins.some((p) => p.id === S.sel)) closeCard();
    if (S.vw < 10 || S.vh < 10) return;              // hidden: the ResizeObserver calls back
    S.init = false;
    fit(S.pins);
    render();
  }

  /* ---------- render: viewBox, labels, buoys and clusters ---------- */
  function render() {
    if (!S.v) return;
    const { cx, cy, s } = S.v, w = S.vw / s, h = S.vh / s, x0 = cx - w / 2, y0 = cy - h / 2;
    svg.setAttribute("viewBox", `${x0.toFixed(2)} ${y0.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
    // buoys in view (with a margin), clustered so medallions never overlap
    const m = 30;
    const inView = S.pins.map((p) => ({ p, x: (p.x - x0) * s, y: (p.y - y0) * s })).filter((q) => q.x > -m && q.x < S.vw + m && q.y > -m && q.y < S.vh + m);
    const groups = cluster(inView, S.vw < 560 ? 54 : 50);
    // labels: water names (Bodoni italic) and land names by the basemap's minZoom, clear of each other and of the buoys
    const z = s / Math.max(S.vw / S.meta.W, S.vh / S.meta.H);
    const placed = groups.map((g) => ({ x: g.x, y: g.members.length > 1 ? g.y : g.y - 22, half: 24, hh: 26 }));
    let lh = "";
    for (const l of S.labels) {
      if ((l.minZoom || 1) > z * 1.4) continue;
      const px = (l.xy[0] - x0) * s, py = (l.xy[1] - y0) * s;
      const half = (l.text.length * (l.kind === "water" ? 5 : 4.6)) + 8;
      if (px < half || px > S.vw - half || py < 14 || py > S.vh - 14) continue;
      if (placed.some((q) => Math.abs(q.x - px) < q.half + half && Math.abs(q.y - py) < (q.hh || 22))) continue;
      placed.push({ x: px, y: py, half });
      lh += `<span class="map-label ${esc(l.kind)}" style="left: ${px.toFixed(1)}px; top: ${py.toFixed(1)}px${l.angle ? `; --a: ${Number(l.angle)}deg` : ""}">${esc(l.text)}</span>`;
    }
    labelsEl.innerHTML = lh;
    const focusedId = document.activeElement && pinsEl.contains(document.activeElement) ? document.activeElement.dataset.pin || document.activeElement.dataset.cl : null;
    pinsEl.innerHTML = groups.map((g, i) => {
      if (g.members.length === 1) {
        const p = g.members[0].p;
        return `<button type="button" class="pin pin-stay" data-pin="${esc(p.id)}" data-sheet="${esc(p.sheet)}" aria-pressed="${S.sel === p.id}" aria-label="${esc(`${p.name}, ${p.kind}${p.area ? `, ${p.area}` : ""}${p.status ? `, ${p.status}` : ""}`)}" style="left: ${g.x.toFixed(1)}px; top: ${g.y.toFixed(1)}px"><span>${I("anchor")}</span></button>`;
      }
      const ids = g.members.map((q) => q.p.id).join(" ");
      return `<button type="button" class="cluster" data-cl="${i}" data-ids="${esc(ids)}" aria-label="${g.members.length} places to stay here: zoom in" style="left: ${g.x.toFixed(1)}px; top: ${g.y.toFixed(1)}px"><span>${g.members.length}</span></button>`;
    }).join("");
    if (focusedId) { const f = $(`[data-pin="${CSS.escape(focusedId)}"]`, pinsEl); if (f) f.focus({ preventScroll: true }); }
  }

  /* ---------- selection card ---------- */
  function showCard(p) {
    S.sel = p.id;
    card.hidden = false;
    card.dataset.sheet = p.sheet;
    card.innerHTML = `<button class="map-card-x" type="button" aria-label="Close">${I("x")}</button><p class="label muted">${esc([p.kind, p.area].filter(Boolean).join(" · "))}</p><h3><a href="${esc(p.href)}">${esc(p.name)}</a></h3>${p.st !== "open" && p.status ? `<p><span class="badge ${p.st === "temporarily-closed" ? "badge-warn" : "badge-unconfirmed"}">${esc(p.status)}</span></p>` : ""}<p class="btn-row"><a class="btn btn-secondary btn-sm" href="${esc(p.href)}">Details${I("arrow-r")}</a><a class="btn btn-ghost btn-sm" href="#s-${esc(p.id)}" data-to-card="${esc(p.id)}">In the list</a></p>`;
    $$(".pin", pinsEl).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pin === p.id)));
  }
  /** Several stays at one spot (zooming cannot split them): the card lists them. */
  function showList(pts) {
    S.sel = null;
    card.hidden = false;
    card.dataset.sheet = pts[0].sheet;
    card.innerHTML = `<button class="map-card-x" type="button" aria-label="Close">${I("x")}</button><p class="label muted">${plural(pts.length, "place to stay", "places to stay")} here</p><ul class="map-card-list">${pts.map((p) => `<li><button type="button" data-pick="${esc(p.id)}">${esc(p.name)}</button></li>`).join("")}</ul>`;
    const f = $("[data-pick]", card); if (f) f.focus();
  }
  function closeCard() { S.sel = null; if (card) { card.hidden = true; card.innerHTML = ""; } $$(".pin", pinsEl || document.createElement("div")).forEach((b) => b.setAttribute("aria-pressed", "false")); }

  /* ---------- input ---------- */
  function wire() {
    view.addEventListener("click", (e) => {
      const z = e.target.closest("[data-zoom]");
      if (z) { if (z.dataset.zoom === "fit") { fit(S.pins); render(); } else zoomAt(z.dataset.zoom === "in" ? 1.8 : 1 / 1.8); return; }
      if (e.target.closest(".map-card-x")) { const id = S.sel; closeCard(); const b = id && $(`[data-pin="${CSS.escape(id)}"]`, pinsEl); if (b) b.focus(); return; }
      const toCard = e.target.closest("[data-to-card]");
      if (toCard) {
        e.preventDefault();
        const listBtn = $('[data-view="list"]');
        if (listBtn) listBtn.click();
        const el = document.getElementById(`s-${toCard.dataset.toCard}`);
        if (el) { el.scrollIntoView({ block: "center" }); const a = $(".card-title a", el); if (a) a.focus({ preventScroll: true }); }
        return;
      }
      const cl = e.target.closest(".cluster");
      if (cl) {
        const ids = new Set(cl.dataset.ids.split(" "));
        const pts = S.pins.filter((p) => ids.has(p.id));
        const b = boxOf(pts);
        if (S.v.s >= MAX_S * 0.98 || (b[2] - b[0]) * MAX_S < 30 && (b[3] - b[1]) * MAX_S < 30) { showList(pts); return; }
        const s = Math.min(MAX_S, fitScale(b, S.vw, S.vh, 56));
        S.v = clamp({ cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, s: Math.max(s, S.v.s * 1.6) });
        render();
        return;
      }
      const pick = e.target.closest("[data-pick]");
      if (pick) { const p = S.pins.find((q) => q.id === pick.dataset.pick); if (p) { showCard(p); const a = $("h3 a", card); if (a) a.focus(); } return; }
      const pin = e.target.closest(".pin[data-pin]");
      if (pin) { const p = S.pins.find((q) => q.id === pin.dataset.pin); if (p) showCard(p); }
    });
    view.addEventListener("keydown", (e) => {
      if (e.target !== view) { if (e.key === "Escape" && S.sel) { closeCard(); view.focus(); } return; }
      const step = 80 / S.v.s;
      const k = e.key;
      if (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown") {
        e.preventDefault();
        S.v = clamp({ ...S.v, cx: S.v.cx + (k === "ArrowLeft" ? -step : k === "ArrowRight" ? step : 0), cy: S.v.cy + (k === "ArrowUp" ? -step : k === "ArrowDown" ? step : 0) });
        render();
      } else if (k === "+" || k === "=") { e.preventDefault(); zoomAt(1.6); }
      else if (k === "-" || k === "_") { e.preventDefault(); zoomAt(1 / 1.6); }
      else if (k === "0") { e.preventDefault(); fit(S.pins); render(); }
      else if (k === "Escape" && S.sel) closeCard();
    });
    let hintT = 0;
    view.addEventListener("wheel", (e) => {
      if (!(e.ctrlKey || e.metaKey)) {
        hint.textContent = `Use ${/mac|iphone|ipad/i.test(navigator.platform || "") ? "⌘" : "Ctrl"} + scroll to zoom the map`;
        hint.hidden = false; clearTimeout(hintT); hintT = setTimeout(() => { hint.hidden = true; }, 1200);
        return;
      }
      e.preventDefault();
      const r = view.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    view.addEventListener("dblclick", (e) => { if (e.target.closest("button, a, .map-card")) return; const r = view.getBoundingClientRect(); zoomAt(2, e.clientX - r.left, e.clientY - r.top); });
    // drag to pan, pinch to zoom
    const ptrs = new Map();
    let last = null, pinch = null, moved = 0;
    view.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button, a, .map-card")) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      view.setPointerCapture(e.pointerId);
      moved = 0;
      if (ptrs.size === 1) last = { x: e.clientX, y: e.clientY };
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: S.v.s }; }
    });
    view.addEventListener("pointermove", (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()], r = view.getBoundingClientRect();
        const f = (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d) * pinch.s / S.v.s;
        zoomAt(f, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        return;
      }
      if (ptrs.size === 1 && last) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        moved += Math.abs(dx) + Math.abs(dy);
        last = { x: e.clientX, y: e.clientY };
        if (moved > 3) view.classList.add("is-dragging");
        S.v = clamp({ ...S.v, cx: S.v.cx - dx / S.v.s, cy: S.v.cy - dy / S.v.s });
        render();
      }
    });
    const end = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { last = null; view.classList.remove("is-dragging"); } };
    view.addEventListener("pointerup", end);
    view.addEventListener("pointercancel", end);
  }
  return api;
}

/* ============================== stays/<id>.html: what's on nearby, next 30 days ============================== */
function initNearEvents(app, sec) {
  const rows = $$(".nx-row", sec);
  if (!rows.length) return;
  const main = $("[data-near-list]", sec);
  const more = $("[data-near-more]", sec);
  const FIRST = 8;
  const today = app.today(), end = addDays(today, 29);
  const next = [], later = [];
  for (const r of rows) {
    const days = (r.dataset.days || "").split(/\s+/).filter(Boolean);
    const run = r.dataset.run || null;
    const lastDay = run || days[days.length - 1];
    if (!lastDay || lastDay < today) { r.remove(); continue; }
    const day = run ? (days[0] > today ? days[0] : today) : days.find((d) => d >= today);
    if (day !== days[0]) {                               // show the next day this event is on
      const box = $(".nx-date", r);
      if (box) { $(".dw", box).textContent = dowShort(day); $(".d", box).textContent = String(Number(day.slice(8))); $(".mo", box).textContent = fmtDate(day).split(" ")[0]; }
    }
    (day <= end ? next : later).push(r);
  }
  // main list: the first 8 of the next 30 days; the rest of those days folded; later ones under their own fold
  main.replaceChildren(...next.slice(0, FIRST));
  let moreList = more && $("ol", more);
  if (more) {
    moreList.replaceChildren(...next.slice(FIRST));
    more.hidden = next.length <= FIRST;
    const l = $("[data-near-more-l]", more);
    if (l) l.textContent = `${plural(next.length - FIRST, "more event")} in the next 30 days`;
  } else if (next.length > FIRST) {
    sec.querySelector(".nx-list").insertAdjacentHTML("afterend", `<details class="nx-more" data-near-more><summary>${I("chev-d")}<span>${plural(next.length - FIRST, "more event")} in the next 30 days</span></summary><ol class="nx-list"></ol></details>`);
    moreList = $("[data-near-more] ol", sec);
    moreList.replaceChildren(...next.slice(FIRST));
  }
  if (later.length) {
    const anchor = $("[data-near-more]", sec) || main;
    anchor.insertAdjacentHTML("afterend", `<details class="nx-more nx-later"><summary>${I("chev-d")}<span>Later this season: ${plural(later.length, "event")}</span></summary><ol class="nx-list"></ol></details>`);
    $(".nx-later ol", sec).replaceChildren(...later);
  }
  const when = $("[data-near-when]", sec), n = $("[data-near-n]", sec), empty = $("[data-near-empty]", sec);
  if (when) when.textContent = `in the next 30 days`;
  if (n) n.textContent = `${plural(next.length, "event")} listed from ${fmtDate(today)} to ${fmtDate(end)}`;
  if (empty) empty.hidden = next.length > 0;
  main.hidden = next.length === 0;
}
