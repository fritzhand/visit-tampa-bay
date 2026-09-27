/* ============================================================
   build/pages/passages.mjs · OWNER: the History lane (history-and-passages)
   passages.html: curated routes ("Passages", data/routes.json, written by this lane) built only from records in
   the guide. Each route renders as <section class="passage" id="r-<route id>" data-sheet>:
     - a head: the passage number, its sheet, the title, the lede (plain facts from the stops' records), computed
       stats (stops, the straight-line total and the longest leg, what kinds of stops), "Star all n stops"
       (site/js/features/history.js; adds every stop to My Trip) and Google Maps directions when the stops fit;
     - a chart (routeMap below: a crop of the bay chart, or the region chart, from ctx.cards.charts; plain SVG + HTML,
       no JS) fitted to the stops, with numbered course markers (stops closer than a marker share one: "3–5"), a
       dashed magenta course line joining them in straight lines in the chart's own units, and up to three of the
       chart's own names clear of the markers;
     - the course: ol.stops, one li per stop (number, sheet, kind, area, the stop's name linked to its page or
       dialog, our note, the record's own hours and price or its unknowns, its status words and note, the series
       it hosts, its star and its source line), and between stops the straight-line distance, labeled an
       estimate (with an on-foot estimate for legs up to 2 km).
   Unknowns print as unknowns ("Hours not listed", "Not on the map: no coordinates listed"). A passage never
   promises hours or times its stops' records do not hold.
   Contract (build/CONTRACTS.md §3): one element id="r-<route id>" per route.
   ============================================================ */
import { readFileSync, existsSync } from "node:fs";
import { project, haversine, walkMinutes, onMap } from "../../site/js/lib/geo.js";
import { sourceLineHtml } from "./history.mjs";

/** Does a chart file (site/map/<file>) carry the graticule group #bm-grid? (A test basemap may not.) */
const GRID = new Map();
const hasGrid = (file) => {
  if (!GRID.has(file)) { const u = new URL(`../../site/map/${file}`, import.meta.url); GRID.set(file, existsSync(u) && /id="bm-grid"/.test(readFileSync(u, "utf8"))); }
  return GRID.get(file);
};

const STAR = { place: "p", stay: "s", experience: "x", event: "e" };
const KIND_WORD = { place: ["place", "places"], stay: ["place to stay", "places to stay"], experience: ["tour or ride", "tours and rides"], event: ["event", "events"] };
/** Leg distance words: meters under 1 km, else miles (lib/geo.js haversine; straight line). */
export const distWords = (m) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1609.344).toFixed(1)} mi`);
/** An on-foot estimate for a leg (lib/geo.js walkMinutes: straight line × 1.3 at 80 m a minute), only up to 2 km. */
export const walkWords = (a, b, m) => (m <= 2000 ? `about ${walkMinutes(a, b)} min on foot` : "");

/** Stop link: a place or stay page, or the experience or event dialog's deep link. */
export function stopHref(s) {
  return s.kind === "place" ? `places/${s.id}.html` : s.kind === "stay" ? `stays/${s.id}.html` : s.kind === "experience" ? `experiences.html?x=${s.id}#x-${s.id}` : `whats-on.html?e=${s.id}#e-${s.id}`;
}

/** Everything a passage shows that is computed: located stops, legs, totals. */
export function routeFacts(rt) {
  const stops = rt.stopsResolved.map((s, i) => ({ ...s, n: i + 1, ll: s.rec.ll || null }));
  let total = 0, longest = 0;
  stops.forEach((s, i) => {
    const to = stops[i + 1];
    if (!to) return;
    if (!s.ll || !to.ll) { s.next = { to, d: null }; return; }
    const a = { lat: s.ll[0], lng: s.ll[1] }, b = { lat: to.ll[0], lng: to.ll[1] };
    const d = haversine(a, b);
    s.next = { to, d, walk: walkWords(a, b, d) };
    total += d; longest = Math.max(longest, d);
  });
  const kinds = {};
  for (const s of stops) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
  return { stops, total, longest, kinds, located: stops.filter((s) => s.ll) };
}

export function pages(ctx) {
  const { db, c, h, cards, seo, config, vocab } = ctx;
  const { REGIONS, REGION_IDS, PLACE_KIND_LABEL, STAY_KIND_LABEL, EXPERIENCE_KIND_LABEL, EVENT_KIND_LABEL } = vocab;
  const areaName = (a) => db.byId.area.get(a)?.name || "";
  const nameOf = (rec) => rec.name || rec.title;

  const routes = h.sortBy(db.routes.filter((rt) => rt.stopsResolved.length >= 2), (rt) => REGION_IDS.indexOf(rt.region), (rt) => -rt.stopsResolved.length, (rt) => rt.title.toLowerCase());
  const facts = new Map(routes.map((rt) => [rt.id, routeFacts(rt)]));
  const allStops = routes.reduce((n, rt) => n + rt.stopsResolved.length, 0);
  const distinct = new Set(routes.flatMap((rt) => rt.stopsResolved.map((s) => s.id))).size;

  const kindsText = (k) => h.listJoin(Object.keys(STAR).filter((x) => k[x]).map((x) => `${k[x]} ${KIND_WORD[x][k[x] === 1 ? 0 : 1]}`));

  /* ---------- one stop ---------- */
  const unk = c.unk;
  function stopFacts(s) {
    const r = s.rec;
    const price = () => (r.price_text ? h.esc(r.price_text) : r.is_free === true ? "Free" : unk("Price not listed"));
    if (s.kind === "place") return [["Hours", r.hours_text ? h.esc(r.hours_text) : unk("Hours not listed")], ["Price", price()]];
    if (s.kind === "stay") return [["Built", r.heritage?.built ? h.esc(r.heritage.built) : ""], ["Rooms", r.rooms ? String(r.rooms) : ""], ["Opened", r.opened ? h.esc(r.opened) : ""]];
    if (s.kind === "experience") return [["Duration", r.duration_text ? h.esc(r.duration_text) : unk("Duration not listed")], ["Price", price()], ["Schedule", r.schedule_text ? h.esc(r.schedule_text) : unk("Schedule not listed")], ["Season", r.season_text ? h.esc(r.season_text) : ""]];
    // an event: its first listing as the data gives it (cards.whenText never invents an end)
    const i0 = r.instances?.[0];
    return [["When", i0 ? `${h.esc(h.fmtDay(i0.day))} · ${h.esc(cards.whenText(i0))}` : unk("Date not listed")], ["Cost", r.cost ? h.esc(r.cost) : r.is_free === true ? "Free" : unk("Cost not listed")]];
  }
  function kindWord(s) {
    const r = s.rec;
    return s.kind === "place" ? PLACE_KIND_LABEL[r.kind] : s.kind === "stay" ? STAY_KIND_LABEL[r.kind] : s.kind === "experience" ? EXPERIENCE_KIND_LABEL[r.kind] : EVENT_KIND_LABEL[r.kind];
  }
  function stopLink(root, s) {
    const href = root + stopHref(s);
    if (s.kind === "experience") return `<a href="${h.attr(href)}" data-open-experience="${h.attr(s.id)}">${h.esc(nameOf(s.rec))}</a>`;
    if (s.kind === "event") return `<a href="${h.attr(href)}" data-open-event="${h.attr(s.id)}">${h.esc(nameOf(s.rec))}</a>`;
    return `<a href="${h.attr(href)}">${h.esc(nameOf(s.rec))}</a>`;
  }
  function legHtml(s) {
    if (!s.next) return "";
    const to = s.next.to;
    if (s.next.d == null) return `<p class="rt-leg">${h.icon("course")}<span>To stop ${to.n}: ${unk("distance not known, no coordinates listed")}</span></p>`;
    return `<p class="rt-leg">${h.icon("course")}<span>To stop ${to.n}, ${h.esc(nameOf(to.rec))}: <b>${h.esc(distWords(s.next.d))}</b> in a straight line${s.next.walk ? ` · ${h.esc(s.next.walk)}` : ""} <span class="rt-est">(estimate)</span></span></p>`;
  }
  /** Status words: a place's, stay's or experience's ("Temporarily closed"), or an event's ("Cancelled"); "" when open or scheduled. */
  function statusWords(s) {
    const b = s.kind === "event" ? c.eventStatusBadge(s.rec) : s.rec.status && s.rec.status !== "open" ? c.statusBadge(s.rec) : "";
    return b ? ` ${b}` : "";
  }
  function stopItem(root, rt, s) {
    const r = s.rec;
    const noteText = s.note || r.summary || "";
    const rows = stopFacts(s).filter(([, v]) => v);
    const series = s.kind === "place" ? (r.series || []).slice(0, 2) : [];
    const heads = r.status_note ? `<p class="rt-heads">${h.icon("warn")}<span><span class="label">Check before you go</span> ${h.esc(r.status_note)}</span></p>` : "";
    return `<li class="rt-stop" id="r-${h.attr(rt.id)}-${s.n}" data-kind="${s.kind}"${r.region ? ` data-sheet="${r.region}"` : ""}>`
      + `<div class="rt-stop-head"><div class="rt-stop-t"><p class="card-kicker">${c.sheetBadge(r.region)}<span>${h.esc([kindWord(s), areaName(r.area)].filter(Boolean).join(" · "))}</span></p>`
      + `<h3 class="rt-name">${stopLink(root, s)}${statusWords(s)}</h3></div>`
      + c.starButton(r.id, nameOf(r), { kind: STAR[s.kind] }) + `</div>`
      + (noteText ? `<p class="rt-note">${h.esc(noteText)}</p>` : "")
      + (rows.length ? `<dl class="rt-facts">${rows.map(([k, v]) => `<div><dt>${h.esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>` : "")
      + heads
      + (series.length ? `<p class="rt-series">${h.icon("calendar")}<span>${series.map((se) => `<a href="${root}whats-on.html#s-${h.attr(se.id)}">${h.esc(se.name)}</a>: ${h.esc(se.when_text)}`).join("<br>")}</span></p>` : "")
      + (!s.ll ? `<p class="rt-noll">${unk("Not on the map: no coordinates listed")}</p>` : "")
      + sourceLineHtml(h, [r.source_url, r.quote_source, ...(r.also_sources || []), rows.some(([k]) => k === "Built") ? (r.heritage?.sources || [])[0] : null], { icon: h.icon("info"), note: r.checked ? `Checked ${h.fmtDateY(r.checked)}` : "" })
      + legHtml(s)
      + `</li>`;
  }

  /* ---------- the chart: a crop of the bay chart (or the region chart) fitted to the stops, a dashed course line
     through them in the chart's own units, numbered markers (stops closer than a marker share one: "3–5"), and
     up to three of the chart's own names clear of the markers. Plain SVG + HTML, no JS. ---------- */
  const LABEL_PRI = { water: 0, city: 1, town: 2, beach: 3, island: 3, hood: 4, area: 5, park: 6 };
  function routeMap(root, rt, f) {
    const charts = cards.charts || {};
    const L = f.located;
    if (!L.length) return "";
    const pts = L.map((s) => ({ lat: s.ll[0], lng: s.ll[1] }));
    // the crop of one chart fitted to the stops (a margin of PAD on each side), or null when the chart cannot give
    // every stop that margin (a long route near the bay chart's edge): then the region chart takes over
    const PAD = 0.11;
    function frame(id) {
      const ch = id && charts[id];
      if (!ch || !ch.meta) return null;
      const M = ch.meta;
      const xy = pts.map((p) => project(p.lat, p.lng, M));
      const xs = xy.map((q) => q[0]), ys = xy.map((q) => q[1]);
      const ex = Math.max(...xs) - Math.min(...xs), ey = Math.max(...ys) - Math.min(...ys);
      const ratio = Math.min(1.5, Math.max(0.8, (ex + 1) / (ey + 1)));   // tall routes get a tall chart
      const minU = (2 * 380) / M.mPerUnit;
      let w = Math.max(ex / (1 - 2 * PAD), minU), hh = Math.max(ey / (1 - 2 * PAD), minU / ratio);
      if (w / hh > ratio) hh = w / ratio; else w = hh * ratio;
      if (w > M.W) { w = M.W; hh = w / ratio; }
      if (hh > M.H) { hh = M.H; w = hh * ratio; }
      const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      const x0 = Math.min(Math.max(0, cx - w / 2), M.W - w), y0 = Math.min(Math.max(0, cy - hh / 2), M.H - hh);
      const px = (x) => ((x - x0) / w) * 100, py = (y) => ((y - y0) / hh) * 100;
      const inside = xy.every(([x, y]) => px(x) >= 4 && px(x) <= 96 && py(y) >= 4 && py(y) <= 96);
      return { id, ch, M, xy, ratio, w, hh, x0, y0, px, py, inside };
    }
    const first = (cards.chartOf && cards.chartOf(pts)) || null;
    let F = frame(first);
    if (F && !F.inside && first === "bay") { const G = frame(charts.region && L.every((s) => onMap(charts.region.meta, s.ll[0], s.ll[1])) ? "region" : null); if (G && G.inside) F = G; }
    if (!F) return "";
    const { id, ch, M, xy, ratio, w, hh, x0, y0, px, py } = F;
    // markers: stops closer than a marker (about 24px on a 440px-wide chart) share one
    const P = xy.map((q, i) => ({ x: px(q[0]), y: py(q[1]), s: L[i] }));
    const near = (a, b) => Math.abs(a.x - b.x) < 5.4 && Math.abs(a.y - b.y) < 5.4 * ratio;
    const groups = [];
    for (const q of P) { const g = groups.find((gr) => gr.some((m) => near(m, q))); if (g) g.push(q); else groups.push([q]); }
    const runs = (ns) => { const out = []; for (const n of ns) { const r = out[out.length - 1]; if (r && n === r[1] + 1) r[1] = n; else out.push([n, n]); } return out.map(([a, b]) => (a === b ? `${a}` : b === a + 1 ? `${a}, ${b}` : `${a}–${b}`)).join(", "); };
    const marks = groups.map((g) => ({ x: g.reduce((t, m) => t + m.x, 0) / g.length, y: g.reduce((t, m) => t + m.y, 0) / g.length, ns: g.map((m) => m.s.n).sort((a, b) => a - b), names: g.map((m) => `${m.s.n}. ${nameOf(m.s.rec)}`) }));
    const pins = marks.map((m) => `<span class="pin pin-course${m.ns.length > 1 ? " is-group" : ""}" style="left: ${m.x.toFixed(2)}%; top: ${m.y.toFixed(2)}%" title="${h.attr(m.names.join(" · "))}"><span>${h.esc(runs(m.ns))}</span></span>`).join("");
    // the chart's own names inside the crop, clear of the markers and of each other (estimates at 340px)
    const out = [];
    for (const q of (ch.labels || []).filter((l) => LABEL_PRI[l.kind] != null && typeof l.text === "string")
      .map((l) => { const [x, y] = project(l.lat, l.lng, M); return { l, x: px(x), y: py(y) }; })
      .filter((q) => q.x > 0 && q.x < 100 && q.y > 0 && q.y < 100)
      .sort((a, b) => LABEL_PRI[a.l.kind] - LABEL_PRI[b.l.kind] || (a.l.minZoom || 9) - (b.l.minZoom || 9))) {
      if (out.length >= 3) break;
      const REF = 340;   // the chart is about 340px wide beside the list and on a phone: estimate label widths there
      const half = ((q.l.text.length * (q.l.kind === "water" ? 7.4 : 9.6) + 8) / 2 / REF) * 100, halfY = (11 / (REF / ratio)) * 100;
      if (q.x - half < 2 || q.x + half > 98 || q.y - halfY < 3 || q.y + halfY > 97) continue;
      if (marks.some((m) => Math.abs(m.x - q.x) < half + 3 + 1.2 * runs(m.ns).length && Math.abs(m.y - q.y) < halfY + 4 * ratio)) continue;
      if (out.some((o) => Math.abs(o.x - q.x) < o.half + half + 1 && Math.abs(o.y - q.y) < o.halfY + halfY + 1)) continue;
      out.push({ ...q, half, halfY });
    }
    const labels = out.map((q) => `<span class="map-label ${q.l.kind}" style="left: ${q.x.toFixed(2)}%; top: ${q.y.toFixed(2)}%${q.l.angle ? `; --a: ${q.l.angle}deg` : ""}">${h.esc(q.l.text)}</span>`).join("");
    const line = xy.map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
    const course = L.length > 1 ? `<polyline class="rt-course-case" points="${line}" fill="none" vector-effect="non-scaling-stroke"/><polyline class="rt-course" points="${line}" fill="none" vector-effect="non-scaling-stroke"/>` : "";
    const href = `${root}assets/map/${ch.file}`;
    const label = `Chart of this passage: ${L.length} numbered stops${L.length < f.stops.length ? ` (${f.stops.length - L.length} not on the map)` : ""}, joined in list order by a dashed straight line.`;
    return `<div class="mini-map chart-map rt-chart" data-chart="${id}" style="--map-ratio: ${w.toFixed(1)} / ${hh.toFixed(1)}" role="img" aria-label="${h.attr(label)}"><svg viewBox="${[x0, y0, w, hh].map((v) => v.toFixed(1)).join(" ")}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><use href="${href}#bm"/>${hasGrid(ch.file) ? `<use href="${href}#bm-grid"/>` : ""}${course}</svg><span class="mini-labels" aria-hidden="true">${labels}</span>${pins}</div>`;
  }
  function directionsLink(f) {
    const L = f.located;
    if (L.length < 2 || L.length > 11) return "";
    const ll = (s) => `${s.ll[0]},${s.ll[1]}`;
    const u = `https://www.google.com/maps/dir/?api=1&origin=${ll(L[0])}&destination=${ll(L[L.length - 1])}${L.length > 2 ? `&waypoints=${L.slice(1, -1).map(ll).join("%7C")}` : ""}`;
    return h.extLink(u, `${h.icon("route")}Directions in Google Maps`, "btn btn-secondary");
  }

  /** SPEC §7: the attribution line printed with every map. */
  const ATTRIB = `<p class="rt-attrib">Basemap: US Census Bureau TIGER/Line (public domain). Place coordinates include data © OpenStreetMap contributors, ODbL (${h.extLink("https://www.openstreetmap.org/copyright", "openstreetmap.org/copyright")}).</p>`;
  /** The sheet pages and areas a passage runs through, in stop order (links to go on from). */
  function whereLinks(root, rt, f) {
    const sheets = [...new Set([rt.region, ...f.stops.map((s) => s.rec.region).filter(Boolean)])].sort((a, b) => REGIONS[a].n - REGIONS[b].n);
    const areas = [...new Set(f.stops.map((s) => s.rec.area).filter((a) => a && db.byId.area.has(a)))];
    return `<p class="rt-where">${h.icon("compass")}<span><span class="label">On the chart</span> ${sheets.map((r) => `<a href="${root}${h.regionHref(r)}">Sheet ${REGIONS[r].n} · ${h.esc(REGIONS[r].name)}</a>`).join(", ")}${areas.length ? ` <span class="rt-where-sep">·</span> ${h.plural(areas.length, "area")}: ${areas.map((a) => `<a href="${root}areas/${h.attr(a)}.html">${h.esc(areaName(a))}</a>`).join(", ")}` : ""}</span></p>`;
  }

  /* ---------- one passage ---------- */
  function passage(root, rt, i) {
    const f = facts.get(rt.id);
    const star = JSON.stringify(f.stops.map((s) => [STAR[s.kind], s.id]));
    const statRows = [
      ["Stops", `${f.stops.length}`],
      ["Straight-line total", f.located.length > 1 ? `${distWords(f.total)}${f.located.length < f.stops.length ? " (legs between stops with coordinates)" : ""}` : unk("Not known")],
      ["Longest leg", f.located.length > 1 ? `${distWords(f.longest)}` : unk("Not known")],
      ["Made of", h.esc(kindsText(f.kinds))],
    ];
    const map = routeMap(root, rt, f);
    return `<section class="section passage oxford" id="r-${h.attr(rt.id)}" data-sheet="${rt.region}" aria-labelledby="r-${h.attr(rt.id)}-h">
<header class="rt-head">
<p class="rt-kicker label">${h.bullet(rt.region, "lg")}<span>Passage ${i + 1} of ${routes.length} · Sheet ${REGIONS[rt.region].n} · ${h.esc(REGIONS[rt.region].name)}</span></p>
<h2 id="r-${h.attr(rt.id)}-h">${h.esc(rt.title)}</h2>
${rt.lede ? `<p class="rt-lede">${h.esc(rt.lede)}</p>` : ""}
${sourceLineHtml(h, [rt.source_url, ...(rt.also_sources || [])], { label: "Source of this introduction", icon: h.icon("info"), cls: "rt-lede-src", note: rt.checked ? `Checked ${h.fmtDateY(rt.checked)}` : "" })}
<dl class="rt-stats">${statRows.map(([k, v]) => `<div><dt>${h.esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>
<p class="btn-row rt-acts"><button class="btn btn-house js-only" type="button" data-star-all="${h.attr(star)}" data-title="${h.attr(rt.title)}" aria-pressed="false">${h.icon("star")}<span data-star-all-label>Star all ${f.stops.length} stops</span></button>${directionsLink(f)}</p>
</header>
<div class="rt-grid${map ? "" : " no-map"}">
${map ? `<div class="rt-map"><div class="rt-map-in">${map}<p class="rt-map-note">${h.icon("course")}<span>Numbers match the list. The dashed line joins the stops in straight lines, not streets. Not for navigation.</span></p>${ATTRIB}</div></div>` : ""}
<ol class="stops rt-stops">${f.stops.map((s) => stopItem(root, rt, s)).join("")}</ol>
</div>
${whereLinks(root, rt, f)}
<p class="rt-foot">${h.icon("info")}<span>Put together${rt.checked ? ` on ${h.esc(h.fmtDateY(rt.checked))}` : ""} from the ${f.stops.length} entries above. Each stop's facts come from its own source, linked under it.</span></p>
</section>`;
  }

  /* ---------- the index ---------- */
  function index(root) {
    const bySheet = REGION_IDS.map((r) => ({ r, list: routes.filter((rt) => rt.region === r) })).filter((g) => g.list.length);
    return `<nav class="rt-index" aria-label="All passages">${bySheet.map(({ r, list }) => `<div class="rt-index-g" data-sheet="${r}"><h3 class="rt-index-h">${h.bullet(r)}<span>${h.esc(REGIONS[r].name)}</span></h3><ol class="rt-index-list">${list.map((rt) => {
      const f = facts.get(rt.id), n = routes.indexOf(rt) + 1;
      return `<li><a href="#r-${h.attr(rt.id)}"><span class="rt-index-no" aria-hidden="true">${n}</span><span class="rt-index-t"><span class="t">${h.esc(rt.title)}</span><span class="w">${h.esc(`${f.stops.length} stops${f.located.length > 1 ? ` · ${distWords(f.total)} in straight lines · longest leg ${distWords(f.longest)}` : ""}`)}</span></span></a></li>`;
    }).join("")}</ol></div>`).join("")}</nav>`;
  }

  const lede = routes.length
    ? `${h.plural(routes.length, "route")} built only from places, hotels, tours and events in this guide, ${allStops} stops in all (${distinct} different entries). Each stop links to its page and its source; distances between stops are straight-line estimates.`
    : "Routes built only from places, hotels, tours and events in this guide.";
  const stopUrl = (s) => config.siteBase + stopHref(s);
  const jsonld = routes.length ? { "@context": "https://schema.org", "@graph": routes.map((rt) => { const x = seo.routeLd(rt, { url: `${config.siteBase}passages.html#r-${rt.id}`, stopUrl }); delete x["@context"]; return x; }) } : undefined;

  return [{
    path: "passages.html", nav: "passages", title: "Passages",
    description: `Passages: ${routes.length} routes through Tampa Bay built only from sourced places, hotels, tours and events in this guide, each with a chart, its stops in order and straight-line distances.`,
    toc: routes.length ? [["passages-all", "All passages"], ...routes.map((rt) => [`r-${rt.id}`, rt.title])] : undefined,
    features: ["history"], jsonld,
    body: (root) => `${c.pageHead({ kicker: "Explore · Passages", num: 3, title: "Passages", lede })}
${routes.length ? `<section class="section rt-top" id="passages-all" aria-labelledby="passages-all-h">
<h2 class="sr-only" id="passages-all-h">All passages</h2>
${index(root)}
${c.callout("tip", `<p>The numbers on each chart match its list. The dashed magenta line joins the stops in straight lines; it is not a street route, and the distances are straight-line estimates. On-foot times are estimates too (the straight line plus 30 percent, at 80 meters a minute), given only for legs up to 2 km.</p><p>Hours, prices and status notes come from each stop's own source. Check them before you go.</p>`, { flag: "How to read a passage" })}
</section>
${routes.map((rt, i) => passage(root, rt, i)).join("\n")}` : c.emptyState({ title: "No passages yet", body: "Routes appear here once data/routes.json holds them.", glyph: "route", level: 2 })}`,
  }];
}

/** Search: each passage (the core's default entry, enriched with its sheet, stop count and stop names). */
export function search(ctx) {
  const { db, vocab } = ctx;
  return db.routes.filter((rt) => rt.stopsResolved.length >= 2).map((rt) => ({
    k: "pg", id: `route-${rt.id}`, t: rt.title,
    s: `Passage · ${vocab.REGIONS[rt.region].name} · ${rt.stopsResolved.length} stops`,
    u: `passages.html#r-${rt.id}`, r: rt.region,
    g: [...new Set(rt.stopsResolved.map((s) => s.rec.name || s.rec.title))].join(" "),
  }));
}
