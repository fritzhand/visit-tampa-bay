/* ============================================================
   site/js/features/explore.js · OWNER: the Explore lane (explore-and-places)
   Enhances things-to-do.html, outdoors.html and places/<id>.html. Everything it touches is server-rendered first
   (the lists, the counts, the event rows), so the pages work without it. The generic list filter
   (core/filter.js) does the filtering; this module only listens to it:
     - long sections show their first `data-limit` cards with a "Show all n" button while no filter is set
       (a filter, a search or a sheet chip shows every match)
     - each section's count ([data-group-count]) follows the filter
     - "More filters" opens on wide screens, or when one of its filters is already set by the URL
     - the Map view (.xp-map-view, things-to-do.html): the basemap (assets/map/basemap.svg#bm) and a buoy for every
       card left by the filter that has coordinates on it; clusters zoom in; a buoy opens a small card with the
       place's link; drag to pan, the zoom buttons, ctrl/⌘ + wheel or a pinch to zoom
     - place pages: event rows that have ended leave the list (by the client clock, so ?now= works), the first
       eight still to come show, "Show all" opens the rest
   Imports only ../lib/* (features never import core: use app).
   ============================================================ */
import { project, cluster, fitScale, clampView, onMap } from "../lib/geo.js";
import { esc } from "../lib/text.js";

const isSet = (v) => !(v == null || v === "" || v === false || (Array.isArray(v) && !v.length));
const SVGNS = "http://www.w3.org/2000/svg";

export function init(app) {
  document.querySelectorAll(".xp-list[data-filter-list]").forEach((list) => initList(app, list));
  const evs = document.querySelector("[data-pl-evs]");
  if (evs) initEvents(app, evs);
}

/* ---------------- lists: collapse, counts, more filters ---------------- */
function initList(app, list) {
  const root = list.closest("[data-filter-root]") || document;
  const sections = [...list.querySelectorAll(".xp-sec")];
  const open = new Set();
  let filtered = false;
  const phone = matchMedia("(max-width: 699px)");
  // phones show three cards a section; a section that asks for more (the numbered Gulf beaches, whose chart shows every
  // number) keeps its own limit
  const limitOf = (sec) => { const n = Number(sec.dataset.limit) || 6; return phone.matches && n <= 6 ? Math.min(n, 3) : n; };

  function paint() {
    for (const sec of sections) {
      const cards = [...sec.querySelectorAll(".xp-grid > .card")];
      const shown = cards.filter((c) => !c.hidden);
      const limit = limitOf(sec);
      const collapse = !filtered && !open.has(sec) && shown.length > limit;
      shown.forEach((c, i) => c.classList.toggle("xp-over", collapse && i >= limit));
      cards.filter((c) => c.hidden).forEach((c) => c.classList.remove("xp-over"));
      const n = sec.querySelector("[data-group-count]");
      if (n) {
        n.textContent = String(shown.length);
        const w = n.nextElementSibling;
        if (w && w.dataset.one) w.textContent = shown.length === 1 ? w.dataset.one : w.dataset.many;
      }
      const row = sec.querySelector(".xp-more-row"), btn = row && row.querySelector("[data-xp-all]");
      if (row && btn) {
        const can = !filtered && shown.length > limit;
        row.hidden = !can;
        const expanded = open.has(sec);
        btn.setAttribute("aria-expanded", String(expanded));
        const title = sec.querySelector("h2")?.textContent.trim() || "";
        btn.querySelector("span").textContent = expanded ? `Show fewer ${title.charAt(0).toLowerCase()}${title.slice(1)}` : `Show all ${shown.length}: ${title.charAt(0).toLowerCase()}${title.slice(1)}`;
        btn.classList.toggle("is-open", expanded);
      }
    }
  }
  sections.forEach((sec) => {
    const btn = sec.querySelector("[data-xp-all]");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const was = open.has(sec);
      if (was) open.delete(sec); else open.add(sec);
      const limit = limitOf(sec);
      paint();
      if (!was) { // move focus to the first card that just appeared, so keyboard users land in the new cards
        const next = [...sec.querySelectorAll(".xp-grid > .card")].filter((c) => !c.hidden)[limit];
        next?.querySelector(".card-title a")?.focus({ preventScroll: false });
      } else sec.scrollIntoView({ block: "start" });
    });
  });
  list.addEventListener("tbc:filter", (e) => {
    const st = e.detail?.state || {};
    filtered = Object.values(st).some(isSet);
    paint();
  });
  const ctl = app.filter.get(list);
  filtered = ctl ? Object.values(ctl.state()).some(isSet) : false;
  paint();
  phone.addEventListener?.("change", paint);

  // the Gulf beaches' chart: pointing at a numbered card lights its number and its dot on the chart
  const coast = list.querySelector(".xp-coast");
  if (coast) {
    const light = (n) => coast.querySelectorAll("[data-n]").forEach((m) => m.classList.toggle("is-hi", m.dataset.n === n));
    const nOf = (e) => e.target.closest?.(".card")?.querySelector(".xp-no[data-n]")?.dataset.n || null;
    list.addEventListener("pointerover", (e) => light(nOf(e)));
    list.addEventListener("focusin", (e) => light(nOf(e)));
    list.addEventListener("pointerleave", () => light(null));
  }

  // "More filters": open on wide screens, or when one of its keys is set
  const more = root.querySelector("[data-xp-more]");
  if (more) {
    const keys = [...more.querySelectorAll("[data-filter]")].map((x) => x.dataset.filter);
    const st = ctl ? ctl.state() : {};
    if (keys.some((k) => isSet(st[k])) || matchMedia("(min-width: 900px)").matches) more.open = true;
  }

  const view = root.querySelector("[data-xp-map-view]");
  if (view) initMap(app, list, root, view);
}

/* ---------------- the map view ---------------- */
function initMap(app, list, root, view) {
  // two charts (build/components/mini-map.mjs charts): the bay chart, and the region chart for day trips; the view
  // uses the bay chart while every place left by the filter fits on it, else the region chart
  let charts;
  try { charts = JSON.parse(view.dataset.charts); } catch { return; }
  if (!charts || !charts.bay) return;
  let chartId = "bay", meta = charts.bay;
  const pane = view.closest("[data-view-pane]");
  const countEl = root.querySelector("[data-xp-map-count]"), offEl = root.querySelector("[data-xp-map-off]");
  let built = false, svg, labelsEl, pinsEl, cardEl, v = null, pts = [], sel = null, userMoved = false;
  const homeBox = () => { const b = meta.home || meta.bbox; const [x0, y0] = project(b.n, b.w, meta), [x1, y1] = project(b.s, b.e, meta); return [x0, y0, x1, y1]; };
  const homeScale = () => { const r = view.getBoundingClientRect(); return fitScale(homeBox(), r.width, r.height, 10); };

  function build() {
    built = true;
    view.innerHTML = "";
    svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "map-base");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const use = document.createElementNS(SVGNS, "use");
    use.setAttribute("href", meta.base);
    svg.appendChild(use);
    labelsEl = el("div", "map-labels");
    pinsEl = el("div", "map-pins");
    const zoom = el("div", "map-zoom");
    zoom.innerHTML = `<button type="button" data-z="in" aria-label="Zoom in"><svg class="i" aria-hidden="true"><use href="#i-plus"/></svg></button><button type="button" data-z="out" aria-label="Zoom out"><svg class="i" aria-hidden="true"><use href="#i-minus"/></svg></button>`;
    cardEl = el("div", "map-card");
    cardEl.hidden = true;
    cardEl.setAttribute("role", "group");
    cardEl.setAttribute("aria-live", "polite");
    view.append(svg, labelsEl, pinsEl, zoom, cardEl);
    zoom.addEventListener("click", (e) => { const b = e.target.closest("[data-z]"); if (b) zoomBy(b.dataset.z === "in" ? 1.8 : 1 / 1.8); });
    root.querySelector("[data-xp-fit]")?.addEventListener("click", () => { userMoved = false; fit(); });
    pinsEl.addEventListener("click", onPin);
    cardEl.addEventListener("click", (e) => {
      if (e.target.closest("[data-x]")) { select(null); return; }
      const b = e.target.closest("[data-pick]");
      if (b) { const p = pts.find((q) => q.id === b.dataset.pick); if (p) { centerOn(p); select(p); } }
    });
    view.addEventListener("keydown", (e) => { if (e.key === "Escape" && sel) { select(null); } });
    drag();
    new ResizeObserver(() => { if (!pane.hidden) render(); }).observe(view);
  }
  const el = (tag, cls) => { const x = document.createElement(tag); x.className = cls; return x; };

  function collect() {
    const cards = [...list.querySelectorAll(".card[data-q]")].filter((c) => !c.hidden);
    const lls = cards.map((c) => (c.dataset.ll || "").split(",").map(Number)).filter((ll) => ll.length === 2 && !ll.some(isNaN));
    const want = !charts.region || lls.every((ll) => onMap(charts.bay, ll[0], ll[1])) ? "bay" : "region";
    if (want !== chartId) {
      chartId = want; meta = charts[want]; v = null; userMoved = false;
      svg?.querySelector("use")?.setAttribute("href", meta.base);
    }
    const out = [];
    let off = 0;
    for (const c of cards) {
      const ll = (c.dataset.ll || "").split(",").map(Number);
      if (ll.length !== 2 || !onMap(meta, ll[0], ll[1])) { off++; continue; }
      const a = c.querySelector(".card-title a");
      const [x, y] = project(ll[0], ll[1], meta);
      const symUse = c.querySelector(".card-kind use");
      out.push({
        id: c.dataset.place || c.dataset.stay || a?.getAttribute("href"), x, y, sheet: c.dataset.sheet || "",
        name: a?.textContent.trim() || "", href: a?.getAttribute("href") || "#", sig: c.dataset.sig === "1",
        sym: symUse ? symUse.getAttribute("href") : "#i-buoy",
        kicker: [...c.querySelectorAll(".card-kind, .card-area")].map((k) => k.textContent.trim()).join(" · "),
        status: c.querySelector(".card-status")?.textContent.trim() || "",
        meta: metaText(c.querySelector(".card-meta")),
      });
    }
    pts = out.sort((a, b) => Number(b.sig) - Number(a.sig));
    if (countEl) countEl.textContent = `${chartId === "bay" ? "The bay chart" : "The region chart"} · ${pts.length} of ${cards.length} on it`;
    if (offEl) {
      offEl.textContent = off ? `${off} of the ${cards.length} ${cards.length === 1 ? "place" : "places"} shown ${off === 1 ? "has" : "have"} no coordinates listed, so ${off === 1 ? "it is" : "they are"} not on the chart: switch to the list to see ${off === 1 ? "it" : "them"}.` : "";
      offEl.hidden = !off;
    }
    if (sel && !pts.some((p) => p.id === sel.id)) select(null);
  }

  function fit() {
    const r = view.getBoundingClientRect();
    if (!r.width || !r.height) return;
    let box;
    if (pts.length) {
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      const minU = 1600 / meta.mPerUnit; // never closer than ~1.6 km across
      if (box[2] - box[0] < minU) { const c = (box[0] + box[2]) / 2; box[0] = c - minU / 2; box[2] = c + minU / 2; }
      if (box[3] - box[1] < minU) { const c = (box[1] + box[3]) / 2; box[1] = c - minU / 2; box[3] = c + minU / 2; }
    } else box = homeBox();
    const s = fitScale(box, r.width, r.height, 60);   // room for a buoy (52px tall) above its point
    v = clampView({ cx: (box[0] + box[2]) / 2, cy: (box[1] + box[3]) / 2, s }, r.width, r.height, meta, maxScale());
    render();
  }
  const maxScale = () => homeScale() * 40;   // about a kilometer across at the closest

  function zoomBy(f, at) {
    const r = view.getBoundingClientRect();
    if (!v) fit();
    const ax = at ? at[0] : r.width / 2, ay = at ? at[1] : r.height / 2;
    const ux = v.cx + (ax - r.width / 2) / v.s, uy = v.cy + (ay - r.height / 2) / v.s;   // the unit under the cursor stays put
    const s = v.s * f;
    v = clampView({ cx: ux - (ax - r.width / 2) / s, cy: uy - (ay - r.height / 2) / s, s }, r.width, r.height, meta, maxScale());
    userMoved = true;
    render();
  }
  function centerOn(p, s) {
    const r = view.getBoundingClientRect();
    v = clampView({ cx: p.x, cy: p.y, s: s || v.s }, r.width, r.height, meta, maxScale());
    render();
  }

  function render() {
    if (!built || pane.hidden) return;
    const r = view.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (!v) { fit(); return; }
    const w = r.width / v.s, hgt = r.height / v.s, x0 = v.cx - w / 2, y0 = v.cy - hgt / 2;
    svg.setAttribute("viewBox", `${x0.toFixed(2)} ${y0.toFixed(2)} ${w.toFixed(2)} ${hgt.toFixed(2)}`);
    const px = (x) => (x - x0) * v.s, py = (y) => (y - y0) * v.s;
    // labels: water names and towns by zoom (minZoom relative to the home view), inside the frame only
    const z = v.s / homeScale();
    const LPRI = { water: 0, city: 1, town: 2, beach: 3, island: 3, park: 4, bridge: 5 }, placed = [];
    labelsEl.innerHTML = (meta.labels || []).filter((l) => l.z <= z * 1.15).sort((a, b) => (LPRI[a.k] ?? 9) - (LPRI[b.k] ?? 9) || a.z - b.z).map((l) => {
      const [x, y] = project(l.la, l.ln, meta), X = px(x), Y = py(y);
      const hw = (l.t.length * (l.k === "water" ? 8.2 : 8.8) + 12) / 2, hh = 10;   // a rough box, so names never print over each other
      if (X - hw < 4 || Y < 14 || X + hw > r.width - 54 || Y > r.height - 14) return "";
      if (placed.some((q) => Math.abs(q.X - X) < q.hw + hw && Math.abs(q.Y - Y) < q.hh + hh)) return "";
      placed.push({ X, Y, hw, hh });
      const k = l.k === "water" ? `water${l.z <= 1 ? " big" : ""}` : l.k === "bridge" || l.k === "park" ? l.k : l.k === "city" ? "hood" : "street";
      return `<span class="map-label ${k}" style="left: ${X.toFixed(1)}px; top: ${Y.toFixed(1)}px">${esc(l.t)}</span>`;
    }).join("");
    // buoys and clusters (screen-space, 40 px)
    const onScreen = pts.map((p) => ({ ...p, sx: px(p.x), sy: py(p.y) })).filter((p) => p.sx > -30 && p.sy > -30 && p.sx < r.width + 30 && p.sy < r.height + 30);
    const groups = settle(cluster(onScreen.map((p) => ({ ...p, x: p.sx, y: p.sy })), 44), 46);
    pinsEl.innerHTML = groups.map((g) => {
      if (g.members.length === 1) {
        const p = g.members[0];
        return `<button type="button" class="pin pin-place${p.sig ? " is-sig" : ""}" data-sheet="${esc(p.sheet)}" data-id="${esc(p.id)}" aria-pressed="${sel && sel.id === p.id ? "true" : "false"}" aria-label="${esc(p.name)}" style="left: ${p.x.toFixed(1)}px; top: ${p.y.toFixed(1)}px"><span><svg class="i" aria-hidden="true"><use href="${esc(p.sym)}"/></svg></span></button>`;
      }
      return `<button type="button" class="cluster" data-ids="${esc(g.members.map((m) => m.id).join("|"))}" aria-label="${g.members.length} places here: zoom in" style="left: ${g.x.toFixed(1)}px; top: ${g.y.toFixed(1)}px"><span>${g.members.length}</span></button>`;
    }).join("");
  }

  function onPin(e) {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.classList.contains("cluster")) {
      const ids = b.dataset.ids.split("|"), members = pts.filter((p) => ids.includes(p.id));
      const xs = members.map((p) => p.x), ys = members.map((p) => p.y);
      const r = view.getBoundingClientRect();
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      if (span * v.s < 8 || v.s >= maxScale() * 0.98) { selectMany(members); return; }   // on top of each other: list them
      const s = Math.min(fitScale([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], r.width, r.height, 60), v.s * 4);
      v = clampView({ cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, s: Math.max(s, v.s * 1.6) }, r.width, r.height, meta, maxScale());
      userMoved = true;
      render();
      return;
    }
    const p = pts.find((q) => q.id === b.dataset.id);
    select(sel && p && sel.id === p.id ? null : p);
  }
  function select(p) {
    sel = p || null;
    pinsEl.querySelectorAll(".pin[data-id]").forEach((b) => b.setAttribute("aria-pressed", String(!!sel && b.dataset.id === sel.id)));
    if (!sel) { cardEl.hidden = true; cardEl.innerHTML = ""; return; }
    cardEl.dataset.sheet = sel.sheet;
    cardEl.setAttribute("aria-label", sel.name);
    cardEl.innerHTML = `<button class="map-card-x" type="button" data-x aria-label="Close"><svg class="i" aria-hidden="true"><use href="#i-x"/></svg></button>`
      + `<p class="muted label">${esc(sel.kicker)}</p><h3><a href="${esc(sel.href)}">${esc(sel.name)}</a></h3>`
      + (sel.status ? `<p><span class="badge badge-warn">${esc(sel.status)}</span></p>` : "")
      + (sel.meta ? `<p class="muted">${esc(sel.meta)}</p>` : "")
      + `<p class="btn-row"><a class="btn btn-primary btn-sm" href="${esc(sel.href)}">Open its page<svg class="i" aria-hidden="true"><use href="#i-arrow-r"/></svg></a></p>`;
    cardEl.hidden = false;
  }
  function selectMany(members) {
    sel = null;
    cardEl.dataset.sheet = "";
    cardEl.setAttribute("aria-label", `${members.length} places at this spot`);
    cardEl.innerHTML = `<button class="map-card-x" type="button" data-x aria-label="Close"><svg class="i" aria-hidden="true"><use href="#i-x"/></svg></button><p class="muted label">${members.length} places at this spot</p><ul class="map-card-list">${members.map((m) => `<li><button type="button" data-pick="${esc(m.id)}">${esc(m.name)}</button></li>`).join("")}</ul>`;
    cardEl.hidden = false;
  }

  function drag() {
    const ptrs = new Map();
    let start = null, pinch = null, moved = false;
    view.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button, a, .map-card")) return;
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      view.setPointerCapture(e.pointerId);
      if (ptrs.size === 1) { start = { x: e.clientX, y: e.clientY, cx: v?.cx, cy: v?.cy }; moved = false; }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: v.s }; }
    });
    view.addEventListener("pointermove", (e) => {
      if (!ptrs.has(e.pointerId) || !v) return;
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      const r = view.getBoundingClientRect();
      if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const f = (pinch.s * (d / pinch.d)) / v.s;
        zoomBy(f, [(a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top]);
        return;
      }
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      view.classList.add("is-dragging");
      v = clampView({ cx: start.cx - dx / v.s, cy: start.cy - dy / v.s, s: v.s }, r.width, r.height, meta, maxScale());
      userMoved = true;
      render();
    });
    const end = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { start = null; view.classList.remove("is-dragging"); } };
    view.addEventListener("pointerup", end);
    view.addEventListener("pointercancel", end);
    view.addEventListener("wheel", (e) => {
      if (!(e.ctrlKey || e.metaKey) || !v) return;   // plain wheel scrolls the page; pinch and ctrl/⌘ + wheel zoom
      e.preventDefault();
      const r = view.getBoundingClientRect();
      zoomBy(Math.exp(-e.deltaY * 0.004), [e.clientX - r.left, e.clientY - r.top]);
    }, { passive: false });
  }

  const show = () => { if (!built) build(); collect(); if (!userMoved || !v) fit(); else render(); };
  list.addEventListener("tbc:filter", () => { if (!pane.hidden) { userMoved = false; show(); } });
  // the reader's own switch to the Map (a click on the toggle, not a remembered view on load) brings the chart into
  // view when it opens below the fold: under a long filter panel, especially on phones
  let asked = false;
  root.querySelectorAll('[data-view="map"]').forEach((b) => b.addEventListener("click", () => { asked = true; }));
  root.addEventListener("tbc:view", (e) => {
    if (e.detail?.view !== "map") return;
    requestAnimationFrame(() => {
      show();
      if (!asked) return;
      asked = false;
      const box = pane.getBoundingClientRect();
      if (box.top > innerHeight * 0.55) pane.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
  });
  if (!pane.hidden) requestAnimationFrame(show);
}

/** A card's meta line as plain text for the map card: "hours · price" (the two-row meta joined), no seal. */
function metaText(el) {
  if (!el) return "";
  const rows = [...el.querySelectorAll(":scope > .cm:not(.cm-seal)")];
  const text = (x) => { const y = x.cloneNode(true); y.querySelectorAll(".sr-only, .seal").forEach((z) => z.remove()); return y.textContent.replace(/\s+/g, " ").trim(); };
  return rows.length ? rows.map(text).filter(Boolean).join(" · ") : text(el);
}

/** Greedy clustering seeds groups on their first member, so two groups' centroids can end up closer than a medallion:
 *  merge any two whose centroids sit within `r` px until none do (a few dozen groups at most). */
function settle(groups, r) {
  let gs = groups.slice(), merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) {
      if (Math.hypot(gs[i].x - gs[j].x, gs[i].y - gs[j].y) < r) {
        const members = [...gs[i].members, ...gs[j].members];
        gs[i] = { members, x: members.reduce((a, m) => a + m.x, 0) / members.length, y: members.reduce((a, m) => a + m.y, 0) / members.length };
        gs.splice(j, 1);
        merged = true;
        break outer;
      }
    }
  }
  return gs;
}

/* ---------------- place pages: events next first ---------------- */
function initEvents(app, ol) {
  const rows = [...ol.children];
  const limit = Number(ol.dataset.limit) || 8;
  const moreRow = ol.parentElement.querySelector(".pl-evs-more"), btn = moreRow?.querySelector("[data-pl-evs-all]");
  const none = ol.parentElement.querySelector("[data-pl-evs-none]"), pastEl = ol.parentElement.querySelector("[data-pl-evs-past]");
  let all = false;
  function apply(now) {
    const live = rows.filter((r) => app.status.stateOf(r, now).st !== "past");
    rows.forEach((r) => { r.hidden = !live.includes(r) || (!all && live.indexOf(r) >= limit); });
    if (moreRow && btn) {
      moreRow.hidden = live.length <= limit;
      btn.setAttribute("aria-expanded", String(all));
      btn.querySelector("span").textContent = all ? "Show fewer" : `Show all ${live.length} still to come`;
    }
    if (none) none.hidden = live.length > 0;
    const gone = rows.length - live.length;
    if (pastEl) { pastEl.hidden = !gone || !live.length; pastEl.textContent = gone ? `${gone} earlier ${gone === 1 ? "event has" : "events have"} ended and ${gone === 1 ? "is" : "are"} not shown.` : ""; }
    ol.hidden = !live.length;
  }
  btn?.addEventListener("click", () => {
    all = !all;
    apply(app.now());
    if (all) rows.filter((r) => !r.hidden)[limit]?.querySelector("a")?.focus();
  });
  app.onTick(apply);
}
