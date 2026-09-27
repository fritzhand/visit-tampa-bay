/* ============================================================
   build/pages/map.mjs · OWNER: the Map lane
   map.html: the interactive chart (SPEC §5, DESIGN §9). Everything on the chart is also in the server-rendered
   list, grouped by layer and sheet, so the page reads without JS and the chart is never the only path to anything:
     li.map-li[data-id="<k>:<id>"][data-k][data-l][data-r][data-a][data-ll][data-n][data-g][data-t]
              (+ data-st for a status that is not open; event locations: data-days, data-runs, data-evs;
               transit stops: data-f="transport:<id>")
     k (row kind) place | heritage | stay | experience | event | stop · l (layers it belongs to, MAP_LAYERS)
     ids p:<place> s:<stay> x:<experience> e:<place id, or the first event id> t:<transport id>~<n>
   site/js/features/map.js reads that list to make the buoys, and adds pan and zoom (drag, wheel, pinch, buttons,
   keys), screen-space clusters, a stack buoy for records at the very same point, the graticule margin with the
   chart's real coordinates, a scale bar, the bay and region charts, the selection panel, the in-view list and the
   URL state (?layers ?r ?k ?t ?when ?chart ?focus, build/nav.mjs PARAMS.map).
   Places are numbered 1…n by sheet, area and name (the numbers on the buoys and in the list); historic sites,
   stays, departures and events carry their chart symbol instead (DESIGN §9).
   Without JS the map box is a static bay chart with its neatline and minute ticks (#bm-grid) and the signature
   places, over the full list.
   Data outputs: assets/data/map-charts.json (both charts' projections and labels, the areas, the attribution) and
   assets/data/map-lines.json (one line per record for the selection panel, loaded on the first selection).
   ============================================================ */
import { sortBy } from "../core/util.mjs";
import { rose } from "../core/icons.mjs";
import { onMap, metaOf } from "../../site/js/lib/geo.js";
import {
  REGION_IDS, REGIONS, PLACE_GROUP, PLACE_GROUP_LABEL, PLACE_KIND_LABEL, STAY_KIND_LABEL, EXPERIENCE_KIND_LABEL, MODE_LABEL,
  TOPICS, TOPIC_LABEL, AREA_KIND_LABEL, AREAS,
} from "../core/vocab.mjs";
import { fmtDate, fmtDay, fmtDateY } from "../core/time.mjs";

/** The layers (MAP_LAYERS in build/nav.mjs), in chip order; `on` = the default. */
export const LAYERS = [
  { id: "places", label: "Things to do", icon: "buoy", on: true, title: "Things to do" },
  { id: "outdoors", label: "Beaches & outdoors", icon: "umbrella", on: true, title: "Beaches and outdoors" },
  { id: "heritage", label: "Historic sites", icon: "landmark", on: true, title: "Historic sites" },
  { id: "events", label: "What's on", icon: "flag", on: true, title: "What's on" },
  { id: "stays", label: "Where to stay", icon: "anchor", on: false, title: "Where to stay" },
  { id: "experiences", label: "Experiences & tours", icon: "daymark", on: false, title: "Where tours depart" },
  { id: "transport", label: "Getting around", icon: "tram", on: false, title: "Transit, ferries, airports and parking" },
];
export const DEFAULT_LAYERS = LAYERS.filter((l) => l.on).map((l) => l.id);
/** Kinds of "things to do" (place groups that are not a layer of their own). */
export const THING_GROUPS = ["attractions", "arts", "sports", "shopping", "eat", "drink", "info"];
/** The exact attribution line of SPEC §7 (owner's decision, Sep 27). */
export const ATTRIBUTION = "Basemap: US Census Bureau TIGER/Line (public domain). Place coordinates include data © OpenStreetMap contributors, ODbL (https://www.openstreetmap.org/copyright).";
const OSM_URL = "https://www.openstreetmap.org/copyright";

/** A historic site: a heritage block, or a kind in the history group. */
export const isHistoric = (p) => !!p.heritage || (p.groups || []).includes("history");
/** The list section (and buoy symbol) of a place: heritage (landmark), outdoors or places (numbered buoys). */
export const sectionOf = (p) => (isHistoric(p) ? "heritage" : PLACE_GROUP[p.kind] === "outdoors" ? "outdoors" : "places");

/** First sentence of our own summary, at most ~170 characters (cut at a word, with an ellipsis). */
const ABBR = /(?:^|[\s.(])(?:St|Ste|Ave|Blvd|Rd|Dr|Mt|Ft|Pt|Hwy|Pkwy|Ln|Ct|No|Nos|Jr|Sr|Inc|Co|Corp|Ltd|Bros|Mr|Mrs|Ms|Prof|Gen|Gov|Capt|Lt|Col|Sgt|Rev|U\.S|a\.m|p\.m|vs|etc|approx|Jan|Feb|Mar|Apr|Aug|Sept|Sep|Oct|Nov|Dec|[A-Z])$/;
export function oneLine(s) {
  if (!s) return "";
  const t = String(s).replace(/\s+/g, " ").trim();
  // the first sentence end that is not an abbreviation ("St.", "U.S.", "E.G. Simmons")
  const re = /[.!?](?=\s+[A-Z0-9"“(])/g;
  let m, cut = -1;
  while ((m = re.exec(t))) { if (m[0] === "." && ABBR.test(t.slice(Math.max(0, m.index - 14), m.index))) continue; cut = m.index + 1; break; }
  let o = cut > 0 ? t.slice(0, cut) : t;
  if (o.length > 170) o = `${o.slice(0, 168).replace(/\s+\S*$/, "")}…`;
  return o;
}

/** Everything the chart can show, as plain records (map.html, tests). */
export function mapModel(ctx) {
  const { db } = ctx;
  const areaIdx = new Map(db.areas.map((a, i) => [a.id, i]));
  const regIdx = new Map(REGION_IDS.map((r, i) => [r, i]));
  const areaName = (id) => db.byId.area.get(id)?.name || "";
  const order = (arr, name = (r) => r.name) => sortBy(arr, (r) => regIdx.get(r.region) ?? 9, (r) => areaIdx.get(r.area) ?? 99, (r) => String(name(r)).toLowerCase(), (r) => r.id);
  const items = [], off = [];

  /* places: numbered buoys (things to do, beaches and outdoors) and landmarks (historic sites) */
  let n = 0;
  for (const p of order(db.places)) {
    if (!p.ll) { off.push({ kind: "place", rec: p, name: p.name, meta: [PLACE_KIND_LABEL[p.kind], areaName(p.area)].filter(Boolean).join(" · "), href: `places/${p.id}.html` }); continue; }
    const sec = sectionOf(p), l = new Set([sec]);
    if (p.groups.some((g) => THING_GROUPS.includes(g))) l.add("places");
    if (p.groups.includes("outdoors")) l.add("outdoors");
    if (isHistoric(p)) l.add("heritage");
    items.push({
      id: `p:${p.id}`, k: sec === "heritage" ? "heritage" : "place", sec, l: [...l], r: p.region, a: p.area, ll: p.ll,
      n: sec === "heritage" ? null : ++n, g: p.groups, t: p.topics || [], st: p.status, sig: !!p.signature,
      name: p.name, meta: [PLACE_KIND_LABEL[p.kind], areaName(p.area)].filter(Boolean).join(" · "), href: `places/${p.id}.html`, rec: p,
    });
  }
  /* places to stay: anchors */
  for (const s of order(db.stays)) {
    const meta = [STAY_KIND_LABEL[s.kind], s.brand && s.brand !== "Independent" ? s.brand : "", areaName(s.area)].filter(Boolean).join(" · ");
    if (!s.ll) { off.push({ kind: "stay", rec: s, name: s.name, meta, href: `stays/${s.id}.html` }); continue; }
    items.push({ id: `s:${s.id}`, k: "stay", sec: "stays", l: s.heritage ? ["stays", "heritage"] : ["stays"], r: s.region, a: s.area, ll: s.ll, st: s.status, name: s.name, meta, href: `stays/${s.id}.html`, rec: s });
  }
  /* experiences: daymarks at the departure point */
  for (const x of order(db.experiences)) {
    const from = x.departs ? x.departs.name : x.departs_text || "";
    const meta = [EXPERIENCE_KIND_LABEL[x.kind], x.operator && x.operator !== x.name ? x.operator : "", from ? `from ${from.length > 48 ? `${from.slice(0, 46).replace(/\s+\S*$/, "")}…` : from}` : ""].filter(Boolean).join(" · ");
    const href = `experiences.html?x=${x.id}#x-${x.id}`;
    if (!x.ll) { off.push({ kind: "experience", rec: x, name: x.name, meta, href, dlg: { x: x.id } }); continue; }
    items.push({ id: `x:${x.id}`, k: "experience", sec: "experiences", l: ["experiences"], r: x.region, a: x.area, ll: x.ll, t: x.topics || [], st: x.status, name: x.name, meta, href, dlg: { x: x.id }, rec: x });
  }
  /* events: one row per location (a place, or the source's own point), with every listing day */
  const groups = new Map();
  for (const e of sortBy(db.events.filter((x) => x.live), (x) => x.first, (x) => x.id)) {
    const title = e.title;
    if (!e.ll) { off.push({ kind: "event", rec: e, name: title, meta: [e.location_text, e.day ? fmtDay(e.day) : ""].filter(Boolean).join(" · "), href: `whats-on.html?e=${e.id}#e-${e.id}`, dlg: { e: e.id } }); continue; }
    const atPlace = e.venue && e.venue.ll && e.venue.ll[0] === e.ll[0] && e.venue.ll[1] === e.ll[1];
    const key = atPlace ? e.venue.id : `${e.ll[0].toFixed(5)},${e.ll[1].toFixed(5)}`;
    if (!groups.has(key)) groups.set(key, { key, place: atPlace ? e.venue : null, events: [], ll: e.ll, region: atPlace ? e.venue.region : e.region, area: atPlace ? e.venue.area : e.area });
    groups.get(key).events.push(e);
  }
  const evGroups = sortBy([...groups.values()], (g) => regIdx.get(g.region) ?? 9, (g) => areaIdx.get(g.area) ?? 99, (g) => (g.place ? g.place.name : g.events[0].location_text || g.events[0].title).toLowerCase());
  for (const g of evGroups) {
    const days = new Set(), runs = [];
    for (const e of g.events) for (const x of e.instances) {
      if (x.run) runs.push(`${x.date}:${x.through < db.window.end ? x.through : db.window.end}`);
      else if (x.day >= db.window.start && x.day <= db.window.end) days.add(x.day);
    }
    const first = g.events[0];
    const all = [...days, ...runs.map((r) => r.split(":")[0])].sort(), last = [...days, ...runs.map((r) => r.split(":")[1])].sort().pop();
    const name = g.place ? g.place.name : first.location_text || first.title;
    const span = all.length ? (all[0] === last ? fmtDay(all[0]) : `${fmtDate(all[0])} – ${all[0].slice(0, 4) === last.slice(0, 4) ? fmtDate(last) : fmtDateY(last)}`) : "";
    const meta = g.events.length === 1 ? [g.place || first.location_text ? first.title : "", span].filter(Boolean).join(" · ") : `${g.events.length} events · ${span}`;
    items.push({
      id: `e:${g.place ? g.place.id : first.id}`, k: "event", sec: "events", l: ["events"], r: g.region, a: g.area, ll: g.ll,
      t: [...new Set(g.events.flatMap((e) => e.topics || []))], name, meta, days: [...days].sort(), runs, evs: g.events.map((e) => e.id),
      sub: g.events.length === 1 && name !== first.title ? first.title : "",
      href: g.place ? `places/${g.place.id}.html` : `whats-on.html?e=${first.id}#e-${first.id}`, dlg: g.place ? null : { e: first.id }, rec: g,
    });
  }
  /* transit stops, ferry terminals, airports and parking (transport.json: the record's own point and its stops) */
  for (const t of sortBy(db.transport, (x) => x.name.toLowerCase())) {
    const pts = [];
    if (t.lat != null && t.lng != null) pts.push({ name: t.name, ll: [t.lat, t.lng], area: null });
    for (const s of t.stops || []) if (s && s.lat != null && s.lng != null) pts.push({ name: s.name, ll: [s.lat, s.lng], area: s.area || (s.place && db.byId.place.get(s.place)?.area) || null });
    const kept = [];
    for (const p of pts) if (!kept.some((q) => Math.abs(q.ll[0] - p.ll[0]) < 0.0004 && Math.abs(q.ll[1] - p.ll[1]) < 0.0004)) kept.push(p);
    kept.forEach((p, i) => {
      const r = p.area ? AREAS[p.area] : (t.regions || [])[0] || null;
      items.push({
        id: `t:${t.id}~${i}`, k: "stop", sec: "transport", l: ["transport"], r, a: p.area, ll: p.ll, name: p.name,
        meta: [MODE_LABEL[t.mode], p.name !== t.name ? t.name : ""].filter(Boolean).join(" · "), href: `getting-around.html#t-${t.id}`, f: `transport:${t.id}`, rec: t,
      });
    });
  }
  return { items, off, numbered: n };
}

/** The sheet (region) a row counts under, for the list's sub-heads. */
const sheetOf = (x) => x.r || "none";

export function pages(ctx) {
  const { db, c, h, cards } = ctx;
  const { esc, attr, icon, bullet } = h;
  const model = mapModel(ctx);
  const { items, off } = model;
  const bay = cards.charts?.bay || null, region = cards.charts?.region || null;
  const onBay = (x) => bay && onMap(bay.meta, x.ll[0], x.ll[1]);
  const onAny = (x) => onBay(x) || (region && onMap(region.meta, x.ll[0], x.ll[1]));
  const bySec = new Map(LAYERS.map((l) => [l.id, items.filter((x) => x.sec === l.id)]));
  const inLayer = (id) => items.filter((x) => x.l.includes(id)).length;
  const fmtN = (v) => v.toLocaleString("en-US");
  const onChart = items.filter((x) => !bay || onAny(x)).length;

  const marker = (x) => {
    const sh = x.r ? ` data-sheet="${x.r}"` : "";
    if (x.k === "place") return `<span class="map-mk mk-buoy"${sh} aria-hidden="true">${x.n}</span>`;
    if (x.k === "heritage") return `<span class="map-mk mk-sym mk-heritage"${sh} aria-hidden="true">${icon("landmark")}</span>`;
    if (x.k === "stay") return `<span class="map-mk mk-sym mk-stay"${sh} aria-hidden="true">${icon("anchor")}</span>`;
    if (x.k === "experience") return `<span class="map-mk mk-sym mk-exp"${sh} aria-hidden="true">${icon("daymark")}</span>`;
    if (x.k === "event") return `<span class="map-mk mk-sym mk-event"${sh} aria-hidden="true">${icon("flag")}</span>`;
    return `<span class="map-mk mk-stop" aria-hidden="true"><i></i></span>`;
  };
  const statusWord = (x) => (x.st && x.st !== "open" ? ` ${c.statusBadge(x.rec)}` : "");
  const link = (root, x) => `<a class="t stretched" href="${root}${attr(x.href)}"${x.dlg?.e ? ` data-open-event="${attr(x.dlg.e)}"` : x.dlg?.x ? ` data-open-experience="${attr(x.dlg.x)}"` : ""}>${x.n ? `<span class="sr-only">${x.n}. </span>` : ""}${esc(x.name)}</a>`;
  const row = (root, x) => `<li class="map-li" data-id="${attr(x.id)}" data-k="${x.k}" data-l="${x.l.join(" ")}"${x.r ? ` data-r="${x.r}"` : ""}${x.a ? ` data-a="${attr(x.a)}"` : ""} data-ll="${x.ll[0]},${x.ll[1]}"${x.n ? ` data-n="${x.n}"` : ""}${x.g ? ` data-g="${x.g.join(" ")}"` : ""}${x.t && x.t.length ? ` data-t="${x.t.join(" ")}"` : ""}${x.st && x.st !== "open" ? ` data-st="${x.st}"` : ""}${x.days ? ` data-days="${x.days.join(" ")}"` : ""}${x.runs && x.runs.length ? ` data-runs="${x.runs.join(" ")}"` : ""}${x.evs ? ` data-evs="${x.evs.join(" ")}"` : ""}${x.sub ? ` data-sub="${attr(x.sub)}"` : ""}${x.f ? ` data-f="${attr(x.f)}"` : ""}>${marker(x)}<span class="map-li-b">${link(root, x)}<span class="m">${esc(x.meta)}</span>${statusWord(x)}</span></li>`;

  const section = (root, l) => {
    const xs = bySec.get(l.id) || [];
    if (!xs.length) return "";
    const bySheet = new Map();
    for (const x of xs) { const k = sheetOf(x); if (!bySheet.has(k)) bySheet.set(k, []); bySheet.get(k).push(x); }
    const grp = [...bySheet].sort((a, b) => (REGION_IDS.indexOf(a[0]) + 99) % 99 - (REGION_IDS.indexOf(b[0]) + 99) % 99).map(([rid, rs]) => `<div class="map-grp" data-grp="${rid}"${REGIONS[rid] ? ` data-sheet="${rid}"` : ""}><h3 class="map-sub">${REGIONS[rid] ? `${bullet(rid)}<span>${esc(REGIONS[rid].name)}</span>` : "<span>Across the bay</span>"}<span class="n" data-grp-count>${rs.length}</span></h3><ul class="map-items">${rs.map((x) => row(root, x)).join("")}</ul></div>`).join("");
    return `<section class="map-sec" data-sec="${l.id}" aria-labelledby="ml-${l.id}"><h2 class="map-sec-h" id="ml-${l.id}">${icon(l.icon)}<span>${esc(l.title)}</span><span class="n" data-sec-count>${xs.length}</span></h2>${grp}<p class="map-more js-only" hidden><button class="btn btn-secondary btn-sm" type="button" data-more="${l.id}"></button></p></section>`;
  };

  /* the no-JS chart: the whole bay chart with its neatline and minute ticks, the signature places */
  const sig = items.filter((x) => x.sig && (x.k === "place" || x.k === "heritage"));
  const staticChart = (root) => (bay ? cards.chartMap(root, sig.map((x) => ({ lat: x.ll[0], lng: x.ll[1], kind: x.k === "heritage" ? "heritage" : "place", sheet: x.r, n: x.n, ic: x.k === "heritage" ? "landmark" : null, title: x.name })), { chart: "bay", whole: true, labels: 9, refW: 760, bare: true, label: "" }) : "");
  const ratio = bay ? `${bay.meta.W + 48} / ${bay.meta.H + 48}` : "4 / 3";

  const chip = (l) => `<button class="chip" type="button" data-layer="${l.id}" aria-pressed="${l.on}">${icon(l.icon)}<span>${esc(l.label)}</span><span class="n">${fmtN(inLayer(l.id))}</span>${icon("check", "ck")}</button>`;
  const regionCount = (rid) => items.filter((x) => x.r === rid).length;
  const groupCount = (g) => items.filter((x) => x.l.includes("places") && x.g && x.g.includes(g)).length;
  const topicsUsed = TOPICS.filter((t) => items.some((x) => (x.t || []).includes(t)));
  const legend = `<div class="map-legend" data-map-legend>
<span data-lg="places outdoors"><i class="lg-buoy" aria-hidden="true"></i>Numbered buoy: a place, numbered as in the list</span>
<span data-lg="heritage"><i class="lg-sym" aria-hidden="true">${icon("landmark")}</i>Landmark: a historic site</span>
<span data-lg="events" class="js-only"><i class="lg-sym" aria-hidden="true">${icon("flag")}</i>Flag: events here</span>
<span data-lg="stays" class="js-only" hidden><i class="lg-sym" aria-hidden="true">${icon("anchor")}</i>Anchor: a place to stay</span>
<span data-lg="experiences" class="js-only" hidden><i class="lg-sym" aria-hidden="true">${icon("daymark")}</i>Daymark: where a tour departs</span>
<span data-lg="transport" class="js-only" hidden><i class="lg-stop" aria-hidden="true"></i>Ring: a stop, terminal, airport or parking lot</span>
<span class="js-only"><i class="lg-cluster" aria-hidden="true"></i>Medallion: several places close together; select to zoom in</span>
<span class="js-only"><i class="lg-live" aria-hidden="true"></i>Ring: an event on now</span>
<p class="map-attrib-line">Basemap: US Census Bureau TIGER/Line (public domain). Place coordinates include data © OpenStreetMap contributors, ODbL (${h.extLink(OSM_URL, OSM_URL)}).</p>
</div>`;

  const offRows = (root) => sortBy(off, (o) => ["place", "stay", "experience", "event"].indexOf(o.kind), (o) => o.name.toLowerCase()).map((o) => `<li class="map-li is-off"><span class="map-mk mk-off" aria-hidden="true">–</span><span class="map-li-b"><a class="t" href="${root}${attr(o.href)}"${o.dlg?.e ? ` data-open-event="${attr(o.dlg.e)}"` : o.dlg?.x ? ` data-open-experience="${attr(o.dlg.x)}"` : ""}>${esc(o.name)}</a><span class="m">${esc([o.meta, "no coordinates listed"].filter(Boolean).join(" · "))}</span></span></li>`).join("");

  return [{
    path: "map.html", nav: "map", title: "Map", features: ["map"], pageClass: "page-map",
    description: `A chart of Tampa Bay with the guide's ${fmtN(model.numbered)} numbered places, its historic sites, places to stay, tour departures, events and transit stops, each linked to its page and source.`,
    body: (root) => `${c.pageHead({ num: 1, kicker: `Plan · ${fmtN(onChart)} on the chart`, title: "Map", cls: "ph-compact", lede: "Everything in this guide that has coordinates, on one chart of the bay. Choose what to show and zoom in: the list follows what is in view." })}
<div class="map-page" data-map-page data-default-layers="${DEFAULT_LAYERS.join(" ")}">
<a class="skip-list" href="#map-list">Skip the chart and go to the list</a>
<div class="map-main">
<div class="map-col">
<div class="map-box" data-map-box>
<div class="map-bar"><p class="label" data-map-title>The bay chart</p><span class="map-bar-acts js-only"><span class="view-toggle map-charts" role="group" aria-label="Chart"><button type="button" data-chart="bay" aria-pressed="true">${icon("map")}Bay</button><button type="button" data-chart="region" aria-pressed="false"${region ? "" : " disabled"}>${icon("compass")}Region</button></span><button class="btn btn-secondary btn-sm" type="button" data-near-me>${icon("locate")}Near me</button></span></div>
<div class="map-layers js-only" role="group" aria-label="Show on the chart">${LAYERS.map(chip).join("")}</div>
<div class="map-view is-static" data-map-view style="--map-ratio: ${ratio}">${staticChart(root)}${bay ? `<span class="map-rose" aria-hidden="true">${rose(root, "rose")}</span><span class="map-note label">Not for navigation</span>` : `<p class="map-fail unk">The chart appears once the basemap is in the guide. Every place is in the list.</p>`}</div>
${legend}
</div>
</div>
<div class="map-side" data-map-side>
<div class="map-panel" id="map-panel" data-map-panel role="region" aria-label="Selected on the chart" tabindex="-1" hidden></div>
<div class="map-ctrl js-only" data-map-ctrl>
<div class="mc-group mc-layers" role="group" aria-labelledby="mc-l"><p class="label mc-label" id="mc-l">Show on the chart</p><div class="chip-row">${LAYERS.map(chip).join("")}</div></div>
<div class="mc-group" role="group" aria-labelledby="mc-r"><p class="label mc-label" id="mc-r">Sheets</p><div class="chip-row">${REGION_IDS.map((rid) => c.chip(REGIONS[rid].short, null, { count: regionCount(rid), pressed: false, sheet: rid, attrs: `data-mr="${rid}"` })).join("")}</div></div>
<div class="mc-group" data-for="places" role="group" aria-labelledby="mc-k"><p class="label mc-label" id="mc-k">Things to do</p><div class="chip-row">${THING_GROUPS.filter(groupCount).map((g) => c.chip(PLACE_GROUP_LABEL[g], null, { count: groupCount(g), pressed: false, attrs: `data-mk="${g}"` })).join("")}</div></div>
<div class="mc-row">
<div class="mc-group mc-topic"><label class="label mc-label" for="mc-t">Topic</label><select class="select" id="mc-t" data-mt><option value="">Any topic</option>${topicsUsed.map((t) => `<option value="${t}">${esc(TOPIC_LABEL[t])}</option>`).join("")}</select></div>
<div class="mc-group" data-for="events" role="group" aria-labelledby="mc-w"><p class="label mc-label" id="mc-w">What's on</p><span class="view-toggle mc-when"><button type="button" data-mw="" aria-pressed="true">Next 30 days</button><button type="button" data-mw="week" aria-pressed="false">7 days</button><button type="button" data-mw="weekend" aria-pressed="false">Weekend</button><button type="button" data-mw="today" aria-pressed="false">Today</button></span></div>
</div>
<p class="mc-note faint" data-mc-note hidden>The topic applies to places, tours and events.</p>
<button class="btn btn-ghost btn-sm" type="button" data-map-reset hidden>${icon("x")}Clear the filters</button>
</div>
<div class="map-count"><p class="result-count" role="status" aria-live="polite" data-map-count>${fmtN(items.length)} on the chart, ${fmtN(off.length)} more without coordinates</p><button class="btn btn-ghost btn-sm js-only" type="button" data-map-scope aria-pressed="false" hidden>List everything shown</button></div>
<div class="map-list" id="map-list" tabindex="-1" data-map-list>
${LAYERS.map((l) => section(root, l)).join("\n")}
${off.length ? `<details class="map-sec map-off"><summary class="map-sec-h">${icon("warn")}<span>Not on the chart</span><span class="n">${off.length}</span></summary><p class="faint map-off-note">These listings have no coordinates in their sources, so they are not on the chart. Each links to its page.</p><ul class="map-items">${offRows(root)}</ul></details>` : ""}
</div>
</div>
</div>
</div>
<p class="source-line">${icon("info")}<span>Positions are the coordinates each record carries (the operator's own, an OpenStreetMap match, or a U.S. Census address match); each entry links to its page and source. Distances on this chart are straight-line estimates. Checked ${esc(fmtDateY(latestChecked(db)))}.</span></p>`,
  }];
}

/** The latest `checked` date across the located records (the map's "as of"). */
function latestChecked(db) {
  const d = [...db.places, ...db.stays, ...db.experiences, ...db.events, ...db.transport].map((r) => r.checked).filter(Boolean).sort().pop();
  return d || db.window.start;
}

export function data(ctx) {
  const { db } = ctx;
  const m = db.map || {};
  const chart = (x) => (x && x.bbox && x.projection && metaOf(x) ? { bbox: x.bbox, projection: x.projection, labels: x.labels || [], graticule: x.graticule || null } : null);
  const regionCharts = ctx.cards.charts || {};
  const areas = Object.fromEntries(db.areas.map((a) => [a.id, { n: a.name, r: a.region, k: a.kind ? AREA_KIND_LABEL[a.kind] : null, ll: a.ll || null }]));
  const lines = {};
  const add = (k, s) => { const l = oneLine(s); if (l) lines[k] = l; };
  for (const p of db.places) add(`p:${p.id}`, p.summary);
  for (const s of db.stays) add(`s:${s.id}`, s.summary);
  for (const x of db.experiences) add(`x:${x.id}`, x.summary);
  for (const t of db.transport) add(`t:${t.id}`, t.summary);
  for (const a of db.areas) add(`a:${a.id}`, a.summary);
  return {
    "assets/data/map-charts.json": {
      v: 1, bay: regionCharts.bay ? chart(m) : null, region: regionCharts.region ? chart(m.region) : null,
      areas, attribution: ATTRIBUTION, osm: OSM_URL,
    },
    "assets/data/map-lines.json": { v: 1, l: lines },
  };
}
