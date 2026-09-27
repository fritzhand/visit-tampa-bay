/* ============================================================
   build/pages/home.mjs · OWNER: the Home & Sheets lane
   index.html, the front page of the chartbook (build/CONTRACTS.md §3; DESIGN.md §7 masthead):
     the masthead (the neatline box: date line, rose · outlined wordmark · rose, a dek of counts, the six sheets),
     "On the water today" (today and this weekend from events.json and the reader's clock, site/js/features/home.js;
       without JS, the first seven days of the listings),
     the chart index (the heart: an index chart of the region with each sheet's areas, and one plate per sheet:
       number, code, badge, name, first sentence of its lede, counts, three signature places, the next signature
       event, a link to the sheet),
     signature places (cards, two per sheet, and the complete list), this season (the signature events and the
     annual calendar in season order, October first), where to stay (by sheet, area, kind and listed feature),
     Tampa Bay in seven eras, getting here (the airports, straight-line distances, other ways in) and a few
     numbers from facts.json with their source and quote.
   Every sentence states something data/ holds; counts are computed. The page never reads the build date (docs/
   must rebuild byte for byte on any day): whatever depends on today is drawn by features/home.js, over a
   server-rendered fallback that names its dates.
   ============================================================ */
import { rose, wordmarkArt } from "../core/icons.mjs";
import { ERAS, ERA_NAME, ERA_LABEL, STAY_KIND_LABEL, FEATURE_LABEL, PLACE_KIND_LABEL, EVENT_KIND_LABEL, MODE_LABEL } from "../core/vocab.mjs";
import { metaOf, project, onMap, haversine } from "../../site/js/lib/geo.js";
import { addDays, dateRange, fmtDay, fmtDate, fmtDateY, dowShort, monthKey } from "../core/time.mjs";
import { sheetPicks, rankPlaces, firstSentence, timeRow, evSpan, dateText, hoursText, whereHtml, liveAttrs, nextFeatured, principalArea, miles, shortArea } from "./region.mjs";

/** The stat tiles (data/facts.json ids, in order; a missing id is skipped, and with none left the first six facts show). */
export const HOME_FACTS = ["population-tampa-bay-metro-2025", "fact-tpa-passengers-2025", "fact-port-tampa-bay-cruise", "climate-tampa-annual-mean", "climate-tampa-days-90", "hurricane-season"];
/** Months in season order: the listings run October to April, then the rest of the year. */
export const SEASON = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const FEATURED_SHOWN = 9;

/** The first season month a series covers (its place in the annual calendar); 0 for a year-round series. */
export const seasonMonth = (s) => ((s.months || []).length >= 11 ? 0 : SEASON.find((m) => (s.months || []).includes(m)) || 0);
/** "Oct–Apr", "Nov", "All year" from a series' months. */
export function monthSpan(ms) {
  if (!ms || !ms.length) return "";
  if (ms.length >= 12) return "All year";
  const o = SEASON.filter((m) => ms.includes(m));
  const s = (m) => MONTH[m - 1].slice(0, 3);
  return o.length === 1 ? s(o[0]) : `${s(o[0])}–${s(o[o.length - 1])}`;
}

export function pages(ctx) {
  const { db, c, h, cards, config, img } = ctx;
  const { esc, attr, icon, bullet } = h;
  const W0 = db.window.start, W1 = db.window.end;
  const R = db.regions;
  const n = db.counts;
  const sheetHref = (r) => h.regionHref(r.id);

  /* ---------- the masthead ---------- */
  const dek = `${h.plural(db.places.length, "place")}, ${h.plural(db.stays.length, "place to stay", "places to stay")}, ${h.plural(db.experiences.length, "tour or trip", "tours and trips")} and ${h.plural(n.events, "event")} on six sheets of Tampa Bay, each linked to the page that states it.`;
  const mast = (root) => `<section class="mast grat" aria-labelledby="mast-h">
<div class="grat-in mast-in">
<div class="mast-line label"><span class="side">Sheets 1–6 · Tampa Bay</span><span class="mid tnum" data-mast-date>Listings ${esc(fmtDateY(W0))} – ${esc(fmtDateY(W1))}</span><span class="side">Not for navigation</span></div>
<div class="mast-title">${rose(root, "rose mast-rose")}<h1 class="mast-h" id="mast-h">${wordmarkArt(root, { variant: "wm", cls: "wm-art" })}</h1>${rose(root, "rose mast-rose r")}</div>
<p class="mast-dek">${esc(dek)}</p>
<div class="ripple" aria-hidden="true"></div>
<nav class="mast-index" aria-label="The six sheets">${R.map((r) => `<a data-sheet="${r.id}" href="${root}${sheetHref(r)}">${bullet(r.id)}<span>${esc(r.name)}</span></a>`).join("")}</nav>
</div>
</section>`;

  /* ---------- on the water today (fallback: the first seven days of the listings) ---------- */
  const first7 = dateRange(W0, addDays(W0, 6));
  const fallback = (root) => first7.map((d) => {
    const list = (db.eventsByDay.get(d) || []).filter((x) => !x.run);
    if (!list.length) return "";
    const shown = h.sortBy(list, (x) => (x.timeUnknown || x.allDay ? 1 : 0), (x) => x.s).slice(0, 5);
    return `<div class="tb-day"><h3 class="sub-h">${esc(fmtDay(d))} · ${esc(h.plural(list.length, "event"))}</h3><ol class="tonight evrows">${shown.map((x) => timeRow(ctx, root, x)).join("")}</ol>${list.length > shown.length ? `<p class="tb-more"><a href="${root}whats-on.html?day=${d}">All ${list.length} on ${esc(fmtDay(d))}${icon("arrow-r")}</a></p>` : ""}</div>`;
  }).join("");
  const today = (root) => `<section class="section today-band" id="today" aria-labelledby="today-h" data-window-start="${W0}" data-window-end="${W1}">
<div class="sec-head oxford"><p class="sec-kicker label"><span class="sec-num" aria-hidden="true">1</span>What's on · ${esc(h.plural(n.events, "event"))} listed, ${esc(fmtDate(W0))} to ${esc(fmtDateY(W1))}</p><h2 id="today-h"><span class="js-only">On the water today</span><span class="nojs-only">On the water: the first week of the listings</span></h2><a class="more" href="${root}whats-on.html?when=today">Everything on today${icon("arrow-r")}</a></div>
<p class="tb-clock label tnum js-only"><span data-tb-clock></span><span class="badge badge-unconfirmed" data-tb-sim hidden>Test clock</span></p>
<div class="tb-body" data-tb-body>
<p class="tb-loading js-only" data-tb-loading>Loading today's listings. <a href="${root}whats-on.html?when=today">What's On, today</a>.</p>
<div class="tb-fallback" data-tb-fallback>
<p class="tb-note">Today's list needs JavaScript. These are the first seven days of the listings, ${esc(fmtDay(first7[0]))} to ${esc(fmtDay(first7[6]))}, ${first7[6].slice(0, 4)}.</p>
<div class="tb-days">${fallback(root)}</div>
</div>
</div>
<p class="tb-links"><a class="btn btn-primary" href="${root}whats-on.html?when=today">${icon("calendar")}Today on What's On</a><a class="btn btn-secondary" href="${root}whats-on.html?when=weekend">This weekend</a><a class="btn btn-secondary" href="${root}whats-on.html">Every event</a></p>
</section>`;

  /* ---------- the chart index ---------- */
  const picks = new Map(R.map((r) => [r.id, sheetPicks(h, r.places, 3)]));
  const indexChart = (root) => {
    const meta = db.basemap && db.map?.region ? metaOf(db.map.region) : null;
    if (!meta) return "";
    const areas = db.areas.filter((a) => a.lat != null && onMap(meta, a.lat, a.lng));
    if (!areas.length) return "";
    const xy = areas.map((a) => project(a.lat, a.lng, meta));
    const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
    const pad = 26, ratio = 3 / 4;
    let x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad * 1.4, y1 = Math.max(...ys) + pad;
    let w = x1 - x0, hh = y1 - y0;
    if (w / hh > ratio) hh = w / ratio; else w = hh * ratio;
    w = Math.min(w, meta.W); hh = Math.min(hh, meta.H);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    x0 = Math.min(Math.max(0, cx - w / 2), meta.W - w); y0 = Math.min(Math.max(0, cy - hh / 2), meta.H - hh);
    const at = (lat, lng) => { const [x, y] = project(lat, lng, meta); return [((x - x0) / w) * 100, ((y - y0) / hh) * 100]; };
    // each sheet's badge sits on its medoid area (the one nearest the others); an area 40 km or more from it gets one too
    const badges = [];
    for (const r of R) {
      const as = r.areas.filter((a) => a.lat != null && onMap(meta, a.lat, a.lng));
      if (!as.length) continue;
      const d = (a, b) => haversine({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
      const med = h.sortBy(as, (a) => as.reduce((s, b) => s + d(a, b), 0), (a) => a.id)[0];
      for (const a of as) if (a === med || d(a, med) >= 40000) badges.push({ r, a });
    }
    const dots = areas.map((a) => { const [px, py] = at(a.lat, a.lng); return `<span class="ix-dot sheet-dot" data-sheet="${a.region}" style="left: ${px.toFixed(2)}%; top: ${py.toFixed(2)}%"></span>`; }).join("");
    // badges that would overlap at phone width are eased apart sideways (the dots keep the exact area centers)
    const PW = 340, PH = PW / ratio, bw = (46 / PW) * 100, bh = (30 / PH) * 100;
    const pos = badges.map(({ r, a }) => ({ r, xy: at(a.lat, a.lng) }));
    for (let k = 0; k < 30; k++) {
      let moved = false;
      for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
        const A = pos[i].xy, B = pos[j].xy, dx = B[0] - A[0], dy = B[1] - A[1];
        if (Math.abs(dx) < bw && Math.abs(dy) < bh) { const push = (bw - Math.abs(dx)) / 2 + 0.2, sgn = dx >= 0 ? 1 : -1; A[0] -= sgn * push; B[0] += sgn * push; moved = true; }
      }
      for (const q of pos) q.xy[0] = Math.min(100 - bw / 2 - 1, Math.max(bw / 2 + 1, q.xy[0]));
      if (!moved) break;
    }
    const marks = pos.map(({ r, xy: [px, py] }) => `<span class="ix-badge" data-sheet="${r.id}" style="left: ${px.toFixed(2)}%; top: ${py.toFixed(2)}%">${bullet(r.id)}</span>`).join("");
    const water = (db.map.region.labels || []).filter((l) => l.kind === "water" && (l.minZoom || 1) <= 1).map((l) => { const [px, py] = at(l.lat, l.lng); return px > 4 && px < 96 && py > 3 && py < 97 ? `<span class="map-label water" style="left: ${px.toFixed(1)}%; top: ${py.toFixed(1)}%">${esc(l.text)}</span>` : ""; }).join("");
    const lim = (v, p, q) => `${Math.abs(v).toFixed(1)}° ${v >= 0 ? p : q}`;
    const latN = db.map.region.bbox.core.n - y0 / meta.sx, latS = db.map.region.bbox.core.n - (y0 + hh) / meta.sx;
    const lngW = db.map.region.bbox.core.w + x0 / (meta.k * meta.sx), lngE = db.map.region.bbox.core.w + (x0 + w) / (meta.k * meta.sx);
    return `<figure class="ix-chart grat"><div class="grat-in">
<div class="mini-map area-map ix-map" style="--map-ratio: ${w.toFixed(1)} / ${hh.toFixed(1)}" role="img" aria-label="${attr(`Index chart: the six sheets on a map of the region, ${R.map((r) => `sheet ${r.n}, ${r.name}`).join("; ")}`)}"><svg viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${hh.toFixed(1)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><use href="${root}assets/map/${esc(db.map.region.file || "region.svg")}#bm"/></svg><span class="mini-labels" aria-hidden="true">${water}</span>${dots}${marks}<span class="ix-corner tl label tnum" aria-hidden="true">${esc(lim(latN, "N", "S"))}</span><span class="ix-corner br label tnum" aria-hidden="true">${esc(lim(lngE, "E", "W"))}</span></div>
</div><figcaption class="ix-cap"><span class="label">Index of sheets</span><span>Each sheet's areas are dotted in its shape; its badge marks the middle of the sheet${badges.length > R.length ? ", and its outlying areas" : ""}. Limits ${esc(`${lim(latS, "N", "S")} to ${lim(latN, "N", "S")}, ${lim(lngW, "E", "W")} to ${lim(lngE, "E", "W")}`)}. Not for navigation.</span></figcaption></figure>`;
  };
  const plate = (root, r) => {
    const pk = picks.get(r.id);
    const nf = nextFeatured(db, r.events, W0);
    const counts = [[r.places.length, "places"], [r.stays.length, "to stay"], [r.events.length, "events"]];
    const nfHtml = nf ? `<a href="${root}whats-on.html?e=${attr(nf.id)}#e-${attr(nf.id)}" data-open-event="${attr(nf.id)}"><span class="t">${esc(nf.title)}</span><span class="w">${esc(dateText(h, db, nf))}${nf.venue ? ` · ${esc(nf.venue.name)}` : ""}</span></a>` : `<span class="unk">No signature event listed</span>`;
    return `<article class="si-plate" id="sheet-${r.id}" data-sheet="${r.id}" aria-labelledby="si-${r.id}">
<header class="si-head"><span class="si-no" aria-hidden="true">${r.n}</span><div class="si-title"><p class="si-code label">Sheet ${r.n} · ${esc(r.code)}</p><h3 id="si-${r.id}"><a href="${root}${sheetHref(r)}">${esc(r.name)}</a></h3></div>${bullet(r.id, "lg")}</header>
${r.lede ? `<p class="si-lede">${esc(firstSentence(r.lede))}</p>` : ""}
<dl class="si-counts tnum">${counts.map(([v, l]) => `<div><dd>${v}</dd><dt>${esc(l)}</dt></div>`).join("")}</dl>
${pk.list.length ? `<p class="si-sub label">${pk.signature === pk.list.length ? "Signature places" : pk.signature ? "Signature places, then by kind" : "Places to start, by kind"}</p><ul class="si-sig">${pk.list.map((p) => `<li><a href="${root}places/${attr(p.id)}.html"><span class="t">${esc(p.name)}</span><span class="w">${esc(PLACE_KIND_LABEL[p.kind] || p.kind)}</span></a></li>`).join("")}</ul>` : ""}
<div class="si-next" data-next-featured="${r.id}"><p class="si-sub label">Next signature event</p>${nfHtml}</div>
<p class="si-go"><a class="btn btn-secondary" href="${root}${sheetHref(r)}">Open sheet ${r.n}${icon("arrow-r")}</a></p>
</article>`;
  };
  const sheetsSec = (root) => c.section({ id: "sheets", num: 2, kicker: `Sheets · ${WORDS[R.length] ? WORDS[R.length].toLowerCase() : R.length} sheets, ${db.areas.length} areas`, title: "The chart index", root,
    body: `<p class="sec-lead">The guide is cut into six numbered sheets, one per stretch of coast and country. Each has its own chart, areas, places, stays and events.</p>
<div class="ix${db.basemap ? "" : " no-chart"}">${indexChart(root)}<div class="si-plates">${R.map((r) => plate(root, r)).join("")}</div></div>` });

  /* ---------- signature places ---------- */
  const sigAll = db.places.filter((p) => p.signature && p.status !== "closed");
  const sigCards = R.flatMap((r) => { const s = r.places.filter((p) => p.signature && p.status !== "closed"); return s.length ? sheetPicks(h, s, 2).list : []; });
  const sigSec = (root) => sigAll.length ? c.section({ id: "signature", num: 3, kicker: `Explore · ${h.plural(sigAll.length, "signature place")}`, title: "Signature places", root, more: { href: "things-to-do.html", label: "Things to do" },
    body: `<p class="sec-lead">The places the region's official visitor guides lead with, two from each sheet that has them.</p>
<div class="grid grid-3 home-sig">${sigCards.map((p) => cards.placeCard(root, p, { headingLevel: 3, meta: false })).join("")}</div>
<details class="sig-all"><summary><span>All ${sigAll.length} signature places, by sheet</span>${icon("chev-d", "chev")}</summary><div class="sig-all-in">${R.map((r) => { const s = rankPlaces(h, r.places.filter((p) => p.signature && p.status !== "closed")); return s.length ? `<div><h3 class="sub-h">${bullet(r.id)} ${esc(r.name)} · ${s.length}</h3><ul class="rows">${s.map((p) => cards.placeRow(root, p)).join("")}</ul></div>` : ""; }).join("")}</div></details>` }) : "";

  /* ---------- this season: the signature events and the annual calendar ---------- */
  const featured = h.sortBy(db.events.filter((e) => e.live && e.featured && e.instances.length), (e) => e.first, (e) => e.id);
  const feTile = (root, ev, i) => {
    const sp = evSpan(db, ev);
    const x = ev.instances[0];
    const d = x.run ? x.through : sp.first;
    const hours = hoursText(h, ev, x);
    return `<li class="fe-item evrow" data-ev="${attr(ev.id)}"${ev.region ? ` data-sheet="${ev.region}"` : ""} data-first="${sp.first}" data-last="${sp.last}"${liveAttrs(ev)}${i >= FEATURED_SHOWN ? " hidden" : ""}>
<span class="dbox" aria-hidden="true"><span class="dw">${esc(x.run ? "Thru" : dowShort(d))}</span><span class="d">${Number(d.slice(8))}</span><span class="mo">${esc(fmtDate(d).split(" ")[0])}</span></span>
<div class="fe-body"><p class="fe-meta">${ev.region ? c.sheetBadge(ev.region) : ""}<span class="fe-k">${esc(EVENT_KIND_LABEL[ev.kind] || ev.kind)}</span>${c.eventStatusBadge(ev)}</p><h3 class="fe-t"><a href="${root}whats-on.html?e=${attr(ev.id)}#e-${attr(ev.id)}" data-open-event="${attr(ev.id)}">${esc(ev.title)}</a></h3><p class="fe-w">${esc(dateText(h, db, ev))}${hours ? ` · ${esc(hours)}` : ""} · ${whereHtml(h, c, ev)} <span class="evr-st" data-status></span></p></div></li>`;
  };
  const yearRound = h.sortBy(db.series.filter((s) => seasonMonth(s) === 0), (s) => s.name);
  const byMonth = new Map(SEASON.map((m) => [m, h.sortBy(db.series.filter((s) => seasonMonth(s) === m), (s) => (s.featured ? 0 : 1), (s) => s.name)]));
  const monthKeyOf = (m) => { const y = m >= 10 ? Number(W0.slice(0, 4)) : Number(W0.slice(0, 4)) + 1; return `${y}-${String(m).padStart(2, "0")}`; };
  const seriesLi = (root, s) => `<li${s.region ? ` data-sheet="${s.region}"` : ""}><a href="${root}whats-on.html#s-${attr(s.id)}">${s.region ? `<span class="sheet-dot" data-sheet="${s.region}" aria-hidden="true"></span>` : '<span class="nodot" aria-hidden="true"></span>'}<span class="t">${esc(s.name)}</span><span class="w">${esc([monthSpan(s.months), s.region ? db.byId.region.get(s.region).short || db.byId.region.get(s.region).name : ""].filter(Boolean).join(" · "))}</span></a></li>`;
  const calendar = (root) => `<div class="almanac">${SEASON.map((m) => {
    const list = byMonth.get(m);
    const key = monthKeyOf(m);
    const inWindow = db.months.some((x) => x.key === key && x.count);
    const sig = list.filter((s) => s.featured), rest = list.filter((s) => !s.featured);
    return `<details class="al-month" data-month="${key}" open><summary><span class="al-m">${esc(MONTH[m - 1])}</span><span class="al-n tnum">${esc(list.length ? h.plural(list.length, "yearly event") : "None listed")}</span>${icon("chev-d", "chev")}</summary>
${sig.length ? `<p class="al-sub label">Signature</p><ul class="al-list">${sig.map((s) => seriesLi(root, s)).join("")}</ul>` : ""}${rest.length ? `<p class="al-sub label">Also every year</p><ul class="al-list">${rest.map((s) => seriesLi(root, s)).join("")}</ul>` : ""}${!list.length ? '<p class="unk al-none">No yearly event starts this month in the guide</p>' : ""}
${inWindow ? `<p class="al-more"><a href="${root}whats-on.html?month=${key}">Every event in ${esc(MONTH[m - 1])} ${key.slice(0, 4)}${icon("arrow-r")}</a></p>` : ""}</details>`;
  }).join("")}</div>
${yearRound.length ? `<div class="al-year"><h3 class="sub-h">Every week or month, all year</h3><ul class="al-list cols">${yearRound.map((s) => seriesLi(root, s)).join("")}</ul></div>` : ""}`;
  const seasonSec = (root) => c.section({ id: "season", num: 1, kicker: `What's on · ${h.plural(featured.length, "signature event")}, ${h.plural(db.series.length, "yearly event")}`, title: "This season", root, more: { href: "whats-on.html", label: "What's On" },
    body: `${featured.length ? `<h3 class="sub-h">Signature events, soonest first</h3><ol class="fe-list" data-featured data-shown="${FEATURED_SHOWN}">${featured.map((e, i) => feTile(root, e, i)).join("")}</ol><p class="fe-note"><span class="nojs-only">From the start of the listings, ${esc(fmtDateY(W0))}.</span><span class="js-only" data-fe-note></span></p>` : ""}
<h3 class="sub-h al-h">Every year, month by month</h3>
<p class="sec-lead">The yearly events in the guide, each under the first month it covers, from October (the start of the listings) through September.</p>
${calendar(root)}` });

  /* ---------- where to stay ---------- */
  const FEAT = ["beachfront", "waterfront", "airport-shuttle", "cruise-shuttle", "historic"];
  const stayRow = (root, r) => {
    const byArea = h.sortBy([...h.groupBy(r.stays, (s) => s.area)].map(([a, l]) => ({ a: db.byId.area.get(a), n: l.length })), (x) => -x.n, (x) => x.a.name).slice(0, 3);
    const byKind = h.sortBy([...h.groupBy(r.stays, (s) => s.kind)].map(([k, l]) => ({ k, n: l.length })), (x) => -x.n, (x) => x.k).slice(0, 3);
    const feats = FEAT.map((f) => ({ f, n: r.stays.filter((s) => (s.features || []).includes(f)).length })).filter((x) => x.n);
    return `<article class="st-sheet" data-sheet="${r.id}"><header>${bullet(r.id)}<h3><a href="${root}stay.html?r=${r.id}">${esc(r.name)}</a></h3><span class="st-n tnum">${r.stays.length}</span></header>
${r.stays.length ? `<ul class="count-list">${byArea.map(({ a, n: k }) => `<li><a href="${root}stay.html?a=${a.id}"><span>${esc(a.name)}</span><span class="n tnum">${k}</span></a></li>`).join("")}</ul>
<p class="st-kinds">${byKind.map(({ k, n: v }) => `<a href="${root}stay.html?r=${r.id}&amp;k=${k}">${esc(`${v} ${(STAY_KIND_LABEL[k] || k).toLowerCase()}${v === 1 ? "" : k === "bed-and-breakfast" ? "s" : /s$/.test(STAY_KIND_LABEL[k] || k) ? "" : "s"}`)}</a>`).join("")}${feats.map(({ f, n: v }) => `<a class="ft" href="${root}stay.html?r=${r.id}&amp;f=${f}">${esc(`${v} ${FEATURE_LABEL[f].toLowerCase()}`)}</a>`).join("")}</p>` : c.unk("No places to stay listed on this sheet yet")}
</article>`;
  };
  const staySec = (root) => c.section({ id: "stay", num: 4, kicker: `Stay · ${h.plural(db.stays.length, "place to stay", "places to stay")}`, title: "Where to stay", root, more: { href: "stay.html", label: "Every place to stay" },
    body: `<p class="sec-lead">${esc(`By sheet: ${h.listJoin(h.sortBy(R.filter((r) => r.stays.length), (r) => -r.stays.length).map((r) => `${r.stays.length} ${r.id === "beaches" ? "on the" : r.id === "around" || r.id === "daytrips" ? "on" : "in"} ${r.name}`))}. Features are counted only where the hotel's own page lists them.`)}</p>
<div class="st-sheets">${R.map((r) => stayRow(root, r)).join("")}</div>` });

  /* ---------- seven eras ---------- */
  const eraCell = (root, e, i) => {
    const list = db.timelineByEra.get(e) || [];
    const sites = db.heritage.filter((x) => x.rec.heritage.era === e).length;
    const t = list[0];
    const span = e === "indigenous" ? ERA_LABEL[e] : ERA_LABEL[e].split(", ").slice(1).join(", ");
    return `<li data-era="${e}"><a href="${root}history.html#era-${e}"><span class="er-i label tnum">${i + 1}</span><span class="er-n">${esc(ERA_NAME[e])}</span><span class="er-s label tnum">${esc(span)}</span><span class="er-c tnum">${esc([list.length ? h.plural(list.length, "milestone") : "", sites ? h.plural(sites, "historic place") : ""].filter(Boolean).join(" · ") || "No milestones listed yet")}</span>${t ? `<span class="er-t"><span class="er-y tnum">${esc(t.year < 0 ? `${-t.year} BCE` : String(t.year))}</span> ${esc(t.title)}</span>` : ""}</a></li>`;
  };
  const erasSec = (root) => c.section({ id: "eras", num: 3, kicker: `History · ${h.plural(db.timeline.length, "milestone")}, ${h.plural(db.heritage.length, "historic place")}`, title: "Tampa Bay in seven eras", root, more: { href: "history.html", label: "History and heritage" },
    body: `<p class="sec-lead">Each era with its first milestone in the guide's timeline.</p><ol class="eras">${ERAS.map((e, i) => eraCell(root, e, i)).join("")}</ol>` });

  /* ---------- getting here ---------- */
  const downtown = db.byId.area.get("downtown-tampa");
  const airports = h.sortBy(db.transport.filter((t) => t.mode === "airport"), (t) => (downtown?.lat != null && t.lat != null ? haversine({ lat: t.lat, lng: t.lng }, { lat: downtown.lat, lng: downtown.lng }) : 1e9), (t) => t.name);
  const others = db.transport.filter((t) => ["cruise-port", "rail", "intercity-bus"].includes(t.mode));
  const arriveSec = (root) => {
    if (!airports.length && !others.length) return "";
    const rows = R.map((r) => ({ r, a: principalArea(h, r) })).filter((x) => x.a);
    const withLL = airports.filter((t) => t.lat != null);
    const table = withLL.length && rows.length ? `<div class="table-wrap"><table class="data dist"><caption class="sr-only">Straight-line miles from each airport to the area with the most places on each sheet</caption>
<thead><tr><th scope="col">Sheet and its main area</th>${withLL.map((t) => `<th scope="col" class="tnum">${esc(t.code || t.name)}</th>`).join("")}</tr></thead>
<tbody>${rows.map(({ r, a }) => { const ds = withLL.map((t) => haversine({ lat: t.lat, lng: t.lng }, { lat: a.lat, lng: a.lng })); const min = Math.min(...ds); return `<tr data-sheet="${r.id}"><th scope="row">${bullet(r.id)}<span><span class="t">${esc(r.name)}</span><span class="w">${esc(a.name)}</span></span></th>${ds.map((d, i) => `<td class="tnum" data-label="${attr(withLL[i].code || withLL[i].name)}">${esc(miles(d))}${d === min ? ' <span class="near">nearest</span>' : ""}</td>`).join("")}</tr>`; }).join("")}</tbody></table></div>
<p class="sec-foot">Straight-line distances from the airport to the center of the area, not road miles. A sheet's main area is the one with the most places in this guide.</p>` : "";
    return c.section({ id: "arrive", num: 5, kicker: `Visit · ${h.plural(airports.length, "airport")}`, title: "Getting here", root, more: { href: "getting-around.html", label: "Getting around" },
      body: `${airports.length ? `<div class="ap-grid">${airports.map((t) => `<article class="ap" id="ap-${attr(t.id)}"><p class="ap-code tnum" aria-hidden="true">${esc(t.code || "")}</p><h3 class="ap-name"><a href="${root}getting-around.html#t-${attr(t.id)}">${esc(t.name)}</a>${t.code ? `<span class="sr-only"> (${esc(t.code)})</span>` : ""}</h3>${t.summary ? `<p class="ap-sum">${esc(t.summary)}</p>` : ""}<p class="ap-meta">${esc(h.listJoin((t.regions || []).map((x) => db.byId.region.get(x)?.name).filter(Boolean)))}${t.url ? ` · ${h.extLink(t.url, `${esc(h.hostOf(t.url))}${icon("ext")}`)}` : ""}</p></article>`).join("")}</div>` : ""}
${table}
${others.length ? `<h3 class="sub-h">Other ways in</h3><div class="chip-row">${others.map((t) => c.chip(t.name, `getting-around.html#t-${t.id}`, { root, ic: t.mode === "cruise-port" ? "ferry" : t.mode === "rail" ? "tram" : "bus" })).join("")}</div>` : ""}` });
  };

  /* ---------- by the numbers ---------- */
  let facts = HOME_FACTS.map((id) => db.byId.fact.get(id)).filter(Boolean);
  if (!facts.length) facts = db.facts.slice(0, 6);
  const numbersSec = (root) => facts.length ? c.section({ id: "numbers", num: 5, kicker: `Visit · ${h.plural(facts.length, "number")} from ${h.plural(new Set(facts.map((f) => h.hostOf(f.source_url))).size, "source")}`, title: "Tampa Bay by the numbers", root, more: { href: "when-to-visit.html", label: "When to visit" },
    body: `<div class="stats">${facts.map((f) => `<details class="stat${/\s/.test(f.value) && String(f.value).length > 8 ? " long" : String(f.value).length > 6 ? " mid" : ""}"><summary><span class="st-v">${esc(f.value)}</span><span class="st-l">${esc(f.label)}</span><span class="st-src label">${icon("info")}Source${f.quote ? " and quote" : ""}</span></summary><div class="st-pop">${f.quote ? `<blockquote class="st-q"><p>${esc(f.quote)}</p></blockquote>` : ""}<p class="st-by">${h.extLink(f.source_url, esc(f.source || h.hostOf(f.source_url)))}${f.as_of ? ` · ${esc(f.as_of)}` : ""}${f.checked ? ` · Checked ${esc(fmtDateY(f.checked))}` : ""}</p></div></details>`).join("")}</div>` }) : "";

  const body = (root) => [mast(root), today(root), sheetsSec(root), sigSec(root), seasonSec(root), staySec(root), erasSec(root), arriveSec(root), numbersSec(root)].join("\n");
  return [{
    path: "index.html", nav: "index", title: "Overview", features: ["home"], pageClass: "home-page", crumbs: [],
    description: `An independent, source-linked guide to Tampa Bay on six sheets: ${h.listJoin(R.map((r) => r.name))}. ${h.plural(db.places.length, "place")}, ${h.plural(db.stays.length, "place to stay", "places to stay")} and ${h.plural(n.events, "event")}, each linked to its source.`,
    body,
  }];
}
