/* ============================================================
   build/pages/visit.mjs · OWNER: the Visit lane (getting-around, when-to-visit, faq, about)
   Two pages, from data/transport.json, facts.json, faqs.json and series.json. Nothing here states a fact the data does
   not hold: fares, hours and seasons are printed in the operators' own words, unknowns as unknowns ("Fare not listed",
   "Hours not listed"), and every record closes with its source line ("Source: host · Checked Sep 27, 2026").

   getting-around.html
     One <article class="tx" id="t-<id>"> per transport record (search entries link getting-around.html#t-<id>), each
     in exactly one section (sectionOf below, computed from the record's mode, regions and position):
       arriving           airports (their codes, and the connections whose stops lie within AIRPORT_NEAR_M of the
                          airport: computed from coordinates), the cruise port, rail, intercity buses, and the rental
                          cars, rideshare and shuttles that start at an airport
       in-tampa           Tampa-only (or Tampa and Around the Bay) transit: streetcar, water taxi, HART, app rides
       across-the-bay     transit serving Tampa and a Pinellas sheet: the bay ferry, the express buses
       st-pete-beaches    transit in St. Petersburg, the Gulf beaches and Clearwater
       south              Day Trips-only transit (Bradenton, Anna Maria Island)
       driving            tolls and toll accounts, public parking
       bikes-scooters     bike share and scooters
       other              anything a new mode would land in (never lost)
     A route (streetcar, water taxi, ferry, trolley, bus…) with stops shows them as a numbered line (the operator's
     own stop numbers when the stop name carries one: "Stop 7: …", "(#11)") and a small stop map (ctx.cards.areaMap;
     pins carry the same numbers); other records list their stops, lots or terminals. Then the Getting-around FAQs.
   when-to-visit.html
     #climate     monthly normals for Tampa and St. Petersburg (NOAA NCEI, facts climate-<city>-<mon>) and the average
                  Gulf water temperature (facts gulf-water-temp-<mon>) as three small multiples on one °F scale (HTML/CSS,
                  no JS; hover shows a month's values) + the full table + the annual facts + the "When to visit" FAQs
     #year        the year at a glance: a card per month with its normals, the annual events (series.json months,
                  linked to whats-on.html#s-<id>) and the guide's dated events that month (whats-on.html?month=)
     #hurricanes  the season strip (parsed from facts hurricane-season and hurricane-season-peak), the season facts,
                  the Know-your-zone questions, and the 2024 storms (Helene and Milton) in the NWS's numbers
     #sun-heat    heat and lightning facts and the Sun & heat and lightning questions
   Values are parsed from the facts' own strings ("Average high 81.0°F, average low 67.3°F, 1.93 in of rain",
   "73°F (22.8°C)"); a string that does not parse is printed as it stands, never guessed at.
   ============================================================ */
import { faqItem, srcLine } from "./faq.mjs";
import { haversine, onMap, project } from "../../site/js/lib/geo.js";

/* ---------------------------------------------------------------- shared ---------------------------------------------------------------- */
const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** A fact tile: the value large (its leading figure in Bodoni numerals), the label, the as-of line, the source. */
function statTile(ctx, f, { cls = "" } = {}) {
  const { h } = ctx;
  const m = /^([$]?\d(?:[\d,.]*\d)?(?:\s?(?:°F|%|in|ft|mph|miles?))?)(?=$|[\s,;(])(.*)$/.exec(f.value);
  const v = m && m[2].trim() ? `<span class="vs-n">${h.esc(m[1])}</span> <span class="vs-u">${h.esc(m[2].replace(/^[,;:]\s*/, "").trim())}</span>`
    : `<span class="vs-n${f.value.length > 16 ? " vs-long" : ""}">${h.esc(f.value)}</span>`;
  return `<div class="vs-stat${cls ? " " + cls : ""}" id="fact-${h.attr(f.id)}"><p class="vs-v">${v}</p><p class="vs-l">${h.esc(f.label)}</p>${f.as_of ? `<p class="vs-a">${h.esc(f.as_of)}</p>` : ""}${srcLine(ctx, f)}</div>`;
}
const tiles = (ctx, facts, cls = "") => (facts.length ? `<div class="vs-stats${cls ? " " + cls : ""}">${facts.map((f) => statTile(ctx, f)).join("")}</div>` : "");
/** A plain section (c.section's markup) that can carry extra attributes. */
function sect(ctx, { id, title, kicker = "", icon = "", more = null, body, root = "", cls = "" }) {
  const { h } = ctx;
  return `<section class="section${cls ? " " + cls : ""}" id="${h.attr(id)}" aria-labelledby="${h.attr(id)}-h">
<div class="sec-head oxford">${kicker ? `<p class="sec-kicker label">${icon ? h.icon(icon, "vz-ic") : ""}${h.esc(kicker)}</p>` : ""}<h2 id="${h.attr(id)}-h">${h.esc(title)} <a class="h-anchor" href="#${h.attr(id)}" aria-label="Link to this section">#</a></h2>${more ? `<a class="more" href="${h.attr(root + more.href)}">${h.esc(more.label)}${h.icon("arrow-r")}</a>` : ""}</div>
${body}
</section>`;
}
/** Questions rendered on these pages keep their faq.html home: no fq- id here, a link to it instead. */
const questions = (ctx, root, list, { more = null } = {}) => (list.length ? `<div class="faq-list vz-q">${list.map((f) => faqItem(ctx, f, { id: false })).join("\n")}</div>${more ? `<p class="vz-qmore"><a href="${root}${more.href}">${ctx.h.esc(more.label)}${ctx.h.icon("arrow-r")}</a></p>` : ""}` : "");

/** A static stop map: a crop of the basemap that fits every point with a little air, one numbered buoy each (the numbers
 *  match the stop list). Like ctx.cards.areaMap (same markup and CSS), but cropped tighter: areaMap pads every crop by
 *  28 map units (~2.4 km), which piles a streetcar's eleven stations into one corner. "" without the basemap or < 2 points. */
function stopMap(ctx, root, pts, { label = "", sheet = null, minHalfM = 320, ratio = 4 / 3 } = {}) {
  const { h, cards } = ctx;
  const meta = cards.meta;
  if (!meta) return "";
  const P = pts.filter((p) => onMap(meta, p.lat, p.lng)).map((p) => ({ ...p, xy: project(p.lat, p.lng, meta) }));
  if (P.length < 2) return "";
  const xs = P.map((p) => p.xy[0]), ys = P.map((p) => p.xy[1]);
  const spanX = Math.max(...xs) - Math.min(...xs), spanY = Math.max(...ys) - Math.min(...ys);
  const padX = Math.max(3, spanX * 0.1), padTop = Math.max(6, spanY * 0.16), padBot = Math.max(3, spanY * 0.08); // buoys stand above their points
  let x0 = Math.min(...xs) - padX, x1 = Math.max(...xs) + padX, y0 = Math.min(...ys) - padTop, y1 = Math.max(...ys) + padBot;
  const minU = (2 * minHalfM) / meta.mPerUnit;
  let w = Math.max(x1 - x0, minU), hh = Math.max(y1 - y0, minU / ratio);
  if (w / hh > ratio) hh = w / ratio; else w = hh * ratio;
  w = Math.min(w, meta.W); hh = Math.min(hh, meta.H);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  x0 = Math.min(Math.max(0, cx - w / 2), meta.W - w); y0 = Math.min(Math.max(0, cy - hh / 2), meta.H - hh);
  const pct = (v, a, b) => (((v - a) / b) * 100).toFixed(2);
  const pin = (p) => `<span class="pin pin-place"${sheet ? ` data-sheet="${h.attr(sheet)}"` : ""} style="left: ${pct(p.xy[0], x0, w)}%; top: ${pct(p.xy[1], y0, hh)}%"><span>${h.esc(p.n)}</span></span>`;
  return `<div class="mini-map area-map tx-map" style="--map-ratio: ${w.toFixed(1)} / ${hh.toFixed(1)}"${label ? ` role="img" aria-label="${h.attr(label)}"` : ""}><svg viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${hh.toFixed(1)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><use href="${root}assets/map/basemap.svg#bm"/></svg>${h.sortBy(P, (p) => p.xy[1]).map(pin).join("")}</div>`;
}

/* ------------------------------------------------------------ getting around ------------------------------------------------------------ */
const MODE_ICON = {
  airport: "plane", streetcar: "tram", "water-taxi": "boat", ferry: "ferry", bus: "bus", brt: "bus", trolley: "trolley",
  microtransit: "phone", "bike-share": "bike", scooter: "bike", rail: "tram", "intercity-bus": "bus", "cruise-port": "boat",
  parking: "parking", toll: "car", rideshare: "car", "car-rental": "car", trail: "trail",
};
/** What the fare line is called, by mode (its unknown reads "<label> not listed"). */
const FARE_LABEL = { airport: "Fees", "cruise-port": "Fees", toll: "Tolls and fees", parking: "Rates", "car-rental": "Prices", rideshare: "Fares", "bike-share": "Prices", scooter: "Prices" };
/** Modes where opening hours are a question a rider asks (the others never print "Hours not listed"). */
const HOURS_MODES = new Set(["streetcar", "water-taxi", "ferry", "bus", "brt", "trolley", "microtransit", "bike-share", "scooter", "rail", "intercity-bus", "car-rental"]);
/** What a record's stops are called (a plain list; a line only when the operator numbers every stop, see stopsBlock). */
const STOPS_LABEL = { parking: "Lots and garages", "cruise-port": "Terminals and parking", airport: "Stations", "car-rental": "Where", rail: "Station", streetcar: "Stations" };
/** Single places (a terminal, a station): a mini map and directions. */
const POINT_MODES = new Set(["airport", "rail", "intercity-bus", "car-rental", "rideshare"]);
const AIRPORT_NEAR_M = 600;
const PINELLAS = ["stpete", "beaches", "clearwater"];

const SECTIONS = [
  { id: "arriving", title: "Arriving", icon: "plane", lede: "The airports, the cruise terminals, the train station and the intercity bus stops, with what each says about the ride onward." },
  { id: "in-tampa", title: "In Tampa", icon: "tram", lede: "Downtown Tampa, the Channel District, Harbour Island and Ybor City by streetcar, water taxi, bus and app-booked ride." },
  { id: "across-the-bay", title: "Across the bay", icon: "ferry", lede: "Public transport between Tampa and Pinellas County." },
  { id: "st-pete-beaches", title: "In St. Pete & the beaches", icon: "trolley", lede: "Downtown St. Petersburg, the Gulf beaches, Clearwater and Dunedin by rapid bus, trolley, bus and ferry." },
  { id: "south", title: "Day trips", icon: "ferry", lede: "Ferries and trolleys on the Day Trips sheet." },
  { id: "driving", title: "Driving: tolls and parking", icon: "car", lede: "Toll roads, toll accounts and public parking. Rates are the operators' own words, with the dates they give." },
  { id: "bikes-scooters", title: "Bikes & scooters", icon: "bike", lede: "Shared bikes and scooters, rented in the operators' apps, with the cities' rules." },
  { id: "other", title: "More ways to get around", icon: "route", lede: "" },
];
/** Which section a Getting-around question is printed under (first match on its id; the rest go to #questions). */
const FAQ_ROUTES = [
  [/(pie|tpa)-parking/, "arriving"], [/toll|sunpass|ezpass|parking/, "driving"], [/streetcar|pirate|dash/, "in-tampa"], [/bike|scooter/, "bikes-scooters"],
  [/cross-bay|tampa-to-stpete|both-counties/, "across-the-bay"], [/tpa|pie|cruise|train|brightline|intercity|amtrak/, "arriving"],
  [/stpete|beach|clearwater|looper|sunrunner|jolley|trolley/, "st-pete-beaches"],
];
/** Fact tiles printed at the top of getting-around (the facts' own values; missing ids are skipped). */
const GA_FACTS = ["fact-streetcar-fare", "fact-hart-fare", "fact-psta-fare", "fact-pirate-water-taxi-pass", "fact-skyway-toll", "fact-toll-by-plate-fee"];
const ARRIVE_FACTS = ["fact-tpa-passengers-2025", "fact-pie-nonstops", "fact-port-tampa-bay-cruise"];

/** Every point of a transport record: its own coordinates and its stops' ([{ lat, lng, stop }]). */
/** The word for a season_text (the text itself is printed as the source states it): "Not running", "Not running yet"
 *  (a launch the operator announced), else "Seasonal". */
const seasonWord = (txt) => (!txt ? "" : /\bnot running\b/i.test(txt) && !/\bnot yet running\b/i.test(txt) ? "Not running" : /\bnot yet running\b|\blaunch/i.test(txt) ? "Not running yet" : "Seasonal");
const pointsOf = (t) => [...(t.lat != null && t.lng != null ? [{ lat: t.lat, lng: t.lng, stop: null }] : []), ...(t.stops || []).filter((s) => s.lat != null && s.lng != null).map((s) => ({ lat: s.lat, lng: s.lng, stop: s }))];
/** The number a stop carries in its operator's naming ("Stop 7: …", "Hattricks Station (#11), …"), else null. */
const stopNo = (name) => { const m = /^Stop (\d+):/.exec(name) || /\(#(\d+)\)/.exec(name); return m ? Number(m[1]) : null; };
const stopName = (name) => name.replace(/^Stop \d+:\s*/, "").replace(/\s*\(#\d+\)/, "");

export function pages(ctx) {
  return [gettingAround(ctx), whenToVisit(ctx)];
}

function gettingAround(ctx) {
  const { db, c, h, vocab, cards } = ctx;
  const { esc, attr, icon } = h;
  const meta = cards.meta;
  const T = db.transport;
  const airports = T.filter((t) => t.mode === "airport");
  const near = (a, t) => pointsOf(t).find((q) => pointsOf(a).some((p) => haversine(p, q) <= AIRPORT_NEAR_M)) || null;
  const nearAirport = (t) => airports.find((a) => a !== t && near(a, t)) || null;
  /** The records with a point within AIRPORT_NEAR_M of an airport's own points: [{ rec, stop }] (computed, not listed) */
  const connections = (a) => T.filter((t) => t !== a && t.mode !== "airport").map((t) => { const hit = near(a, t); return hit ? { rec: t, stop: hit.stop } : null; }).filter(Boolean);
  const sheetNo = (t) => Math.min(99, ...(t.regions || []).map((r) => vocab.REGIONS[r]?.n ?? 99));

  function sectionOf(t) {
    const m = t.mode, R = new Set(t.regions || []);
    if (m === "toll" || m === "parking") return "driving";
    if (m === "bike-share" || m === "scooter" || m === "trail") return "bikes-scooters";
    if (["airport", "cruise-port", "rail", "intercity-bus"].includes(m)) return "arriving";
    if (["car-rental", "rideshare", "microtransit"].includes(m) && nearAirport(t)) return "arriving";
    if (R.size && [...R].every((r) => r === "daytrips")) return "south";
    const pin = PINELLAS.some((r) => R.has(r));
    if (R.has("tampa") && pin) return "across-the-bay";
    if (R.has("tampa") || R.has("around")) return "in-tampa";
    if (pin) return "st-pete-beaches";
    return "other";
  }
  /** order inside a section: the modes' order below, then by sheet (Tampa first), then name */
  const MODE_ORDER = ["airport", "car-rental", "rideshare", "microtransit", "cruise-port", "rail", "intercity-bus", "streetcar", "water-taxi", "ferry", "brt", "trolley", "bus", "toll", "parking", "bike-share", "scooter", "trail"];
  const bySec = new Map(SECTIONS.map((s) => [s.id, []]));
  for (const t of T) bySec.get(sectionOf(t)).push(t);
  for (const [k, v] of bySec) {
    const sorted = k === "driving"
      ? h.sortBy(v, (t) => (t.mode === "toll" ? 0 : 1), (t) => (["sunpass", "toll-by-plate", "rental-car-tolls"].includes(t.id) ? 0 : 1), sheetNo, (t) => t.name)
      : h.sortBy(v, (t) => { const i = MODE_ORDER.indexOf(t.mode); return i < 0 ? 99 : i; }, sheetNo, (t) => t.name);
    bySec.set(k, sorted);
  }
  const secs = SECTIONS.filter((s) => bySec.get(s.id).length);
  const gaFaqs = db.faqs.filter((f) => f.topic === "Getting around");
  const faqSec = (f) => { const r = FAQ_ROUTES.find(([re]) => re.test(f.id)); return r && bySec.get(r[1]).length ? r[1] : "questions"; };
  const faqsIn = (id) => gaFaqs.filter((f) => faqSec(f) === id);

  const areaName = (id) => (id ? db.byId.area.get(id)?.name || vocab.AREA_NAMES[id] || "" : "");
  const onBase = (p) => !!meta && onMap(meta, p.lat, p.lng);
  const free = T.filter((t) => t.is_free === true && t.mode !== "toll" && t.mode !== "parking");
  const notRunning = T.filter((t) => /^Not running/.test(seasonWord(t.season_text)));
  const sheetsLine = (t) => {
    const R = (t.regions || []).filter((r) => c.SHEET_LABELS[r]);
    if (!R.length) return "";
    if (R.length === vocab.REGION_IDS.length) return `<p class="tx-sheets"><span class="label faint">Serves</span> <span>All six sheets</span></p>`;
    return `<p class="tx-sheets"><span class="label faint">Serves</span> ${R.map((r) => c.sheetBadge(r)).join("")}</p>`;
  };

  /* ---------- the stops. A line (in the operator's numbering) only when the operator numbers every stop: the streetcar's
     "(#11)", the water taxi's "Stop 7:". Otherwise a plain list in data order (a route's order is not claimed), numbered
     for the map. Pins carry the same numbers. ---------- */
  function stopsBlock(root, t) {
    const S = (t.stops || []).filter((s, i, all) => !(all.length === 1 && t.name.includes(s.name)));   // "Amtrak at Tampa Union Station" needs no one-stop list
    if (!S.length) return { html: "", map: "" };
    const opNums = S.map((s) => stopNo(s.name));
    const line = S.length >= 2 && opNums.every((n) => n != null) && new Set(opNums).size === S.length;
    const items = S.map((s, i) => ({ s, n: line ? opNums[i] : i + 1 }));
    if (line) items.sort((a, b) => a.n - b.n);
    const sheet = (t.regions || []).length === 1 ? t.regions[0] : null;
    const place = (s) => (s.place && db.byId.place.get(s.place) ? db.byId.place.get(s.place) : null);
    const li = ({ s, n }) => {
      const p = place(s), a = areaName(s.area), label = stopName(s.name);
      const nm = p ? `<a href="${root}places/${attr(p.id)}.html">${esc(label)}</a>` : `<span>${esc(label)}</span>`;
      const where = [a && !label.includes(a) ? a : "", s.lat == null ? "no coordinates listed" : ""].filter(Boolean).join(" · ");
      return `<li${s.lat != null && onBase(s) ? ' class="on"' : ""}><span class="tx-n" aria-hidden="true">${esc(n)}</span><span class="tx-s">${nm}${where ? `<span class="tx-sa">${esc(where)}</span>` : ""}</span></li>`;
    };
    const noun = STOPS_LABEL[t.mode] || "Stops";
    const one = { Stops: "Stop", Stations: "Station" }[noun] || noun;
    const heading = line ? `${S.length} ${noun.toLowerCase()}, in the operator's numbering` : S.length > 1 ? `${noun} · ${S.length}` : one;
    const mapped = items.filter(({ s }) => s.lat != null && s.lng != null && onBase(s));
    const html = `<div class="tx-stops-b"><h4 class="tx-h label">${esc(heading)}</h4><ol class="${line ? "tx-line" : "tx-list"}" aria-label="${attr(`${t.name}: ${heading}`)}">${items.map(li).join("")}</ol>${mapped.length && mapped.length < S.length ? `<p class="tx-note">${esc(`${mapped.length} of ${S.length} on the map; the others have no coordinates listed, or lie outside the basemap.`)}</p>` : ""}</div>`;
    const map = mapped.length >= 2 ? stopMap(ctx, root, mapped.map(({ s, n }) => ({ lat: s.lat, lng: s.lng, n })), { label: `Map of ${t.name}: ${h.plural(mapped.length, "point")}, numbered as in the list`, sheet }) : "";
    return { html, map };
  }

  /* ---------- one transport record ---------- */
  function trCard(root, t) {
    const fareLabel = FARE_LABEL[t.mode] || "Fare";
    const rows = [];
    rows.push([fareLabel, t.fare_text ? esc(t.fare_text) : t.is_free === true ? "Free" : c.unk(`${fareLabel} not listed`)]);
    if (HOURS_MODES.has(t.mode) || t.hours_text) rows.push(["Hours", t.hours_text ? esc(t.hours_text) : c.unk("Hours not listed")]);
    if (t.season_text) rows.push(["Season", esc(t.season_text)]);
    if (t.address) rows.push(["Address", esc(t.address)]);
    const status = [
      t.is_free === true && t.mode !== "toll" && t.mode !== "parking" ? c.badge("free", "Free") : "",
      t.season_text ? c.badge(seasonWord(t.season_text) === "Seasonal" ? "" : "warn", seasonWord(t.season_text)) : "",
    ].join("");
    const stops = stopsBlock(root, t);
    const pts = pointsOf(t);
    let map = stops.map;
    if (!map && (t.mode === "airport" || t.mode === "rail" || t.mode === "intercity-bus") && t.lat != null && t.lng != null && onBase(t)) {
      map = cards.miniMap(root, t.lat, t.lng, { sheet: (t.regions || []).length === 1 ? t.regions[0] : null, label: `Map: where ${t.name} is`, halfWidthM: 1400 });
    }
    const dirs = POINT_MODES.has(t.mode) || t.mode === "cruise-port" ? cards.directionsTo(t) : null;
    const acts = [
      t.url ? h.extLink(t.url, `${icon("ext")}${esc(h.hostOf(t.url))}`, "btn btn-secondary btn-sm") : "",
      dirs && dirs.google ? h.extLink(dirs.google, `${icon("route")}Directions`, "btn btn-ghost btn-sm") : "",
      pts.some(onBase) ? `<a class="btn btn-ghost btn-sm" href="${root}map.html?focus=transport:${attr(t.id)}">${icon("map")}On the map</a>` : "",
    ].filter(Boolean).join("");
    const conn = t.mode === "airport" ? connections(t) : [];
    const side = stops.html || map ? `<div class="tx-side">${stops.html}${map}</div>` : "";
    const wide = !!side && (!!map || (t.stops || []).length >= 4);
    const code = t.code ? `<p class="tx-code"><span class="tx-code-v">${esc(t.code)}</span><span class="tx-code-l label">${esc(t.mode === "airport" ? "Airport code" : t.mode === "rail" ? "Station code" : "Code")}</span></p>` : "";
    return `<article class="tx${wide ? " is-wide" : ""}" id="t-${attr(t.id)}" data-mode="${attr(t.mode)}"${(t.regions || []).length === 1 ? ` data-sheet="${attr(t.regions[0])}"` : ""}>
<div class="tx-main">
<div class="tx-top">${code}<div class="tx-hd"><p class="tx-kicker label">${icon(MODE_ICON[t.mode] || "route")}<span>${esc(vocab.MODE_LABEL[t.mode] || t.mode)}</span></p>
<h3 class="tx-title">${esc(t.name)}</h3>${t.operator ? `<p class="tx-op">${esc(t.operator)}</p>` : ""}</div></div>
${status ? `<p class="tx-status">${status}</p>` : ""}${t.summary ? `<p class="tx-sum">${esc(t.summary)}</p>` : ""}
${c.facts(root, rows, { label: `${t.name}: fares and hours` })}
${conn.length ? `<div class="tx-conn"><h4 class="tx-h label">At the airport · stops within ${AIRPORT_NEAR_M} m, straight line</h4><ul>${conn.map(({ rec, stop }) => `<li><a href="#t-${attr(rec.id)}">${icon(MODE_ICON[rec.mode] || "route")}<span><b>${esc(rec.name)}</b>${stop ? `<span class="tx-sa">${esc(stopName(stop.name))}</span>` : ""}</span></a></li>`).join("")}</ul></div>` : ""}
</div>
${side}
<div class="tx-foot">${sheetsLine(t)}${acts ? `<p class="tx-acts">${acts}</p>` : ""}${srcLine(ctx, t)}</div>
</article>`;
  }

  const factsById = (ids) => ids.map((id) => db.byId.fact.get(id)).filter(Boolean);
  const leftover = faqsIn("questions");
  const toc = [...secs.map((s) => [s.id, s.title]), ...(leftover.length ? [["questions", "More questions"]] : [])];

  const index = (root) => `<nav class="ga-index" aria-label="Sections of this page">${secs.map((s) => {
    const list = bySec.get(s.id);
    return `<a class="ga-tile" href="#${attr(s.id)}">${icon(s.icon)}<span class="ga-t">${esc(s.title)}</span><span class="ga-n label">${esc(h.plural(list.length, "entry", "entries"))}</span><span class="ga-names">${esc(h.listJoin(list.slice(0, 3).map((t) => t.name.replace(/\s*\(.*\)$/, "")).concat(list.length > 3 ? [`${list.length - 3} more`] : [])))}</span></a>`;
  }).join("")}</nav>`;

  const notices = () => [
    free.length ? c.callout("tip", `<p>${esc(h.plural(free.length, "ride", "rides"))} in the guide ${free.length === 1 ? "is" : "are"} free, as ${free.length === 1 ? "its operator says" : "their operators say"}:</p><ul class="ga-free">${free.map((t) => `<li><a href="#t-${attr(t.id)}">${esc(t.name)}</a> <span class="faint">${esc(vocab.MODE_LABEL[t.mode] || t.mode)}${(t.regions || [])[0] ? ` · ${esc(c.sheetName(t.regions[0]))}` : ""}</span></li>`).join("")}</ul>`, { flag: "Free to ride" }) : "",
    ...notRunning.map((t) => c.callout("warn", `<p><a href="#t-${attr(t.id)}"><b>${esc(t.name)}</b></a>: ${esc(t.season_text)}</p>`, { flag: seasonWord(t.season_text) })),
  ].join("");
  const secQs = (root, id) => { const l = faqsIn(id); return l.length ? `<h3 class="sub-h ga-qh">${icon("help")}<span>${esc(`Questions · ${l.length}`)}</span></h3>${questions(ctx, root, l)}` : ""; };

  return {
    path: "getting-around.html", nav: "getting-around", title: "Getting around",
    description: `Getting around Tampa Bay: ${h.plural(airports.length, "airport")}, the streetcar, water taxis, ferries, buses, trolleys, tolls, parking, bikes and scooters, with fares and hours as the operators state them.`,
    toc,
    body: (root) => `${c.pageHead({ num: 5, kicker: `Visit · ${h.plural(T.length, "way", "ways")} to get around`, title: "Getting around",
      lede: "Airports, the streetcar, water taxis, ferries, buses, trolleys, tolls, parking, bikes and scooters. Fares and hours are the operators' own words; where an operator gives none, this page says so." })}
${T.length ? `${index(root)}
<div class="ga-notes">${notices()}</div>
${factsById(GA_FACTS).length ? `<div class="ga-fares"><h2 class="sub-h ga-fares-h">Fares at a glance</h2>${tiles(ctx, factsById(GA_FACTS), "vs-fares")}</div>` : ""}
${secs.map((s) => sect(ctx, { id: s.id, title: s.title, kicker: h.plural(bySec.get(s.id).length, "entry", "entries"), icon: s.icon, root, cls: "ga-sec",
      body: `${s.lede ? `<p class="vz-lede">${esc(s.lede)}</p>` : ""}${s.id === "arriving" ? tiles(ctx, factsById(ARRIVE_FACTS), "vs-arrive") : ""}<div class="tx-grid">${bySec.get(s.id).map((t) => trCard(root, t)).join("\n")}</div>${secQs(root, s.id)}` })).join("\n")}` : c.emptyState({ title: "No transport listed yet", body: "Airports, transit, ferries and tolls appear here once they are checked against their operators' pages.", glyph: "bus" })}
${leftover.length ? sect(ctx, { id: "questions", title: "More questions about getting around", kicker: h.plural(leftover.length, "question"), icon: "help", root, body: questions(ctx, root, leftover) }) : ""}
${gaFaqs.length ? `<p class="vz-qmore ga-allq"><a href="${root}faq.html?topic=${attr(h.slugify("Getting around"))}">${esc(`All ${h.plural(gaFaqs.length, "getting-around question")} in the FAQ`)}${icon("arrow-r")}</a></p>` : ""}`,
  };
}

/* ------------------------------------------------------------ when to visit ------------------------------------------------------------ */
/** "Average high 81.0°F, average low 67.3°F, 1.93 in of rain" → { hi, lo, rain, hiS, loS, rainS } (strings as printed) */
function parseNormals(v) {
  const m = /average high\s+(-?\d+(?:\.\d+)?)\s*°F,\s*average low\s+(-?\d+(?:\.\d+)?)\s*°F,\s*(\d+(?:\.\d+)?)\s*in of rain/i.exec(v || "");
  return m ? { hi: +m[1], lo: +m[2], rain: +m[3], hiS: m[1], loS: m[2], rainS: m[3] } : null;
}
/** "73°F (22.8°C)" → { f: 73, s: "73" } */
const parseF = (v) => { const m = /^(-?\d+(?:\.\d+)?)\s*°F/.exec(v || ""); return m ? { f: +m[1], s: m[1] } : null; };
/** "June 1" / "September 10" → day of the (non-leap) year, 0-based; null when it does not parse */
function dayOfYear(s) {
  const m = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})$/.exec((s || "").trim());
  if (!m) return null;
  const mi = MONTH.indexOf(m[1]);
  return MONTH_DAYS.slice(0, mi).reduce((a, b) => a + b, 0) + Number(m[2]) - 1;
}

function whenToVisit(ctx) {
  const { db, c, h, config } = ctx;
  const { esc, attr, icon } = h;
  const F = (id) => db.byId.fact.get(id) || null;
  const CITIES = [
    { key: "tampa", name: "Tampa", sheet: "tampa" },
    { key: "stpete", name: "St. Petersburg", sheet: "stpete" },
  ];
  /* ---------- the monthly normals ---------- */
  const rows = MON.map((mon, i) => {
    const r = { i, mon, name: MONTH[i] };
    for (const cty of CITIES) { const f = F(`climate-${cty.key}-${mon}`); r[cty.key] = f ? { f, n: parseNormals(f.value) } : null; }
    const g = F(`gulf-water-temp-${mon}`);
    r.gulf = g ? { f: g, n: parseF(g.value) } : null;
    return r;
  });
  const cityHas = (k) => rows.some((r) => r[k] && r[k].n);
  const gulfHas = rows.some((r) => r.gulf && r.gulf.n);
  const temps = rows.flatMap((r) => [...CITIES.flatMap((cty) => (r[cty.key]?.n ? [r[cty.key].n.hi, r[cty.key].n.lo] : [])), ...(r.gulf?.n ? [r.gulf.n.f] : [])]);
  const lo = temps.length ? Math.floor(Math.min(...temps) / 10) * 10 : 50, hi = temps.length ? Math.ceil(Math.max(...temps) / 10) * 10 : 100;
  const pct = (v) => (((v - lo) / (hi - lo)) * 100).toFixed(2);
  const ticks = []; for (let v = lo; v <= hi; v += 10) ticks.push(v);
  const rains = rows.flatMap((r) => CITIES.map((cty) => r[cty.key]?.n?.rain).filter((x) => x != null));
  const rainMax = rains.length ? Math.ceil(Math.max(...rains) / 2) * 2 : 10;
  const stationOf = (k) => { const f = rows.map((r) => r[k]?.f).find(Boolean); const m = f && /\(([^()]*(?:\([^()]*\))?[^()]*)\)\s*$/.exec(f.source); return m ? m[1] : ""; };
  const monthLabel = (i) => `<span class="wv-m3">${MONTH[i].slice(0, 3)}</span><span class="wv-m1">${MONTH[i][0]}</span>`;

  function cityPanel(cty) {
    const k = cty.key;
    const vals = rows.filter((r) => r[k]?.n);
    const hiMax = Math.max(...vals.map((r) => r[k].n.hi)), loMin = Math.min(...vals.map((r) => r[k].n.lo)), rMax = Math.max(...vals.map((r) => r[k].n.rain));
    const hiI = vals.find((r) => r[k].n.hi === hiMax)?.i, loI = vals.find((r) => r[k].n.lo === loMin)?.i, rI = vals.find((r) => r[k].n.rain === rMax)?.i;
    const cols = rows.map((r) => {
      const n = r[k]?.n;
      if (!n) return `<li class="wv-c"><span class="wv-ct"><span class="wv-na">Not listed</span></span><span class="wv-cr"></span><span class="wv-cm">${monthLabel(r.i)}</span></li>`;
      return `<li class="wv-c"><span class="wv-ct"><span class="wv-bar" style="--b: ${pct(n.lo)}%; --t: ${pct(n.hi)}%"></span>${r.i === hiI ? `<span class="wv-cv wv-cv-hi" style="--at: ${pct(n.hi)}%">${esc(n.hiS)}°</span>` : ""}${r.i === loI ? `<span class="wv-cv wv-cv-lo" style="--at: ${pct(n.lo)}%">${esc(n.loS)}°</span>` : ""}</span><span class="wv-cr"><span class="wv-rain" style="--h: ${((n.rain / rainMax) * 100).toFixed(2)}%"></span>${r.i === rI ? `<span class="wv-cv wv-cv-r" style="--at: ${((n.rain / rainMax) * 100).toFixed(2)}%">${esc(n.rainS)}″</span>` : ""}</span><span class="wv-cm">${monthLabel(r.i)}</span><span class="wv-tip"><b>${esc(r.name)}</b> High ${esc(n.hiS)}°F · low ${esc(n.loS)}°F · rain ${esc(n.rainS)} in</span></li>`;
    }).join("");
    const st = stationOf(k);
    return `<figure class="wv-clim" data-sheet="${cty.sheet}">
<figcaption class="wv-cap"><span class="wv-t">${h.bullet(cty.sheet)}<b>${esc(cty.name)}</b></span><span class="wv-s">Average high and low, °F, and rain, inches${st ? ` · ${esc(st)}` : ""}</span></figcaption>
<div class="wv-body" aria-hidden="true">
<div class="wv-ax"><span class="wv-axt">${ticks.map((v) => `<span style="--at: ${pct(v)}%">${v}°</span>`).join("")}</span><span class="wv-axr"><span style="--at: 100%">${rainMax}″</span><span style="--at: 0%">0</span></span></div>
<div class="wv-plot"><span class="wv-grid">${ticks.map((v) => `<i style="--at: ${pct(v)}%"></i>`).join("")}</span><ol class="wv-cols">${cols}</ol></div>
</div>
</figure>`;
  }

  function gulfPanel() {
    const vals = rows.filter((r) => r.gulf?.n);
    const max = Math.max(...vals.map((r) => r.gulf.n.f)), min = Math.min(...vals.map((r) => r.gulf.n.f));
    const maxI = vals.find((r) => r.gulf.n.f === max)?.i, minI = vals.find((r) => r.gulf.n.f === min)?.i;
    const swim = F("comfortable-swim-temperature");
    const sm = swim && /^(\d+(?:\.\d+)?)°F to (\d+(?:\.\d+)?)°F$/.exec(swim.value);
    const band = sm && +sm[1] >= lo && +sm[2] <= hi ? `<span class="wv-band" style="--b: ${pct(+sm[1])}%; --t: ${pct(+sm[2])}%"></span>` : "";
    const legend = band ? `<p class="wv-leg"><span class="wv-kband" aria-hidden="true"></span><span>${esc(swim.value)}: ${esc(swim.label.charAt(0).toLowerCase() + swim.label.slice(1))}. ${h.extLink(swim.source_url, esc(h.hostOf(swim.source_url)))}</span></p>` : "";
    const pts = rows.map((r) => (r.gulf?.n ? `${(r.i * 10 + 5)},${(100 - Number(pct(r.gulf.n.f))).toFixed(2)}` : null)).filter(Boolean).join(" ");
    const cols = rows.map((r) => {
      const n = r.gulf?.n;
      if (!n) return `<li class="wv-c"><span class="wv-ct"><span class="wv-na">Not listed</span></span><span class="wv-cm">${monthLabel(r.i)}</span></li>`;
      return `<li class="wv-c"><span class="wv-ct"><span class="wv-dot" style="--at: ${pct(n.f)}%"></span>${r.i === maxI || r.i === minI ? `<span class="wv-cv wv-cv-g" style="--at: ${pct(n.f)}%">${esc(n.s)}°</span>` : ""}</span><span class="wv-cm">${monthLabel(r.i)}</span><span class="wv-tip"><b>${esc(r.name)}</b> Gulf water ${esc(r.gulf.f.value)}</span></li>`;
    }).join("");
    const src = rows.map((r) => r.gulf?.f).find(Boolean);
    return `<figure class="wv-clim wv-gulf" data-sheet="beaches">
<figcaption class="wv-cap"><span class="wv-t">${h.bullet("beaches")}<b>Gulf water</b></span><span class="wv-s">Average water temperature at the Gulf beaches, °F${src ? ` · ${esc(src.source.replace(/\s*\(.*\)$/, ""))}` : ""}</span></figcaption>
<div class="wv-body" aria-hidden="true">
<div class="wv-ax"><span class="wv-axt">${ticks.map((v) => `<span style="--at: ${pct(v)}%">${v}°</span>`).join("")}</span></div>
<div class="wv-plot"><span class="wv-grid">${ticks.map((v) => `<i style="--at: ${pct(v)}%"></i>`).join("")}${band}</span><svg class="wv-line" viewBox="0 0 120 100" preserveAspectRatio="none" focusable="false"><polyline points="${pts}"/></svg><ol class="wv-cols">${cols}</ol></div>
</div>
${legend}
</figure>`;
  }

  const cell = (r, k, part, label) => { const x = r[k]; if (!x) return `<td data-label="${attr(label)}">${c.unk("Not listed")}</td>`; if (!x.n) return `<td data-label="${attr(label)}">${esc(x.f.value)}</td>`; return `<td class="num" data-label="${attr(label)}">${esc(part === "rain" ? `${x.n.rainS} in` : `${x.n[part + "S"]}°F`)}</td>`; };
  const table = () => `<p class="wv-tnote">On a phone, each month's values are in <a href="#year">the year at a glance</a> below; the table shows them all at a wider width.</p><div class="table-wrap wv-tablewrap"><table class="data wv-table">
<caption>Monthly normals, 1991–2020, and the average Gulf water temperature. Each value is printed as its source states it.</caption>
<thead><tr><th scope="col">Month</th>${CITIES.map((cty) => `<th scope="col" class="num">${esc(cty.name)} high</th><th scope="col" class="num">Low</th><th scope="col" class="num">Rain</th>`).join("")}<th scope="col" class="num">Gulf water</th></tr></thead>
<tbody>${rows.map((r) => `<tr><th scope="row">${esc(r.name)}</th>${CITIES.map((cty) => `${cell(r, cty.key, "hi", `${cty.name} high`)}${cell(r, cty.key, "lo", `${cty.name} low`)}${cell(r, cty.key, "rain", `${cty.name} rain`)}`).join("")}<td class="num" data-label="Gulf water">${r.gulf ? esc(r.gulf.f.value) : c.unk("Not listed")}</td></tr>`).join("")}</tbody>
</table></div>`;
  const climateFacts = rows.flatMap((r) => [...CITIES.map((cty) => r[cty.key]?.f), r.gulf?.f]).filter(Boolean);
  const climateSources = [...new Map(climateFacts.map((f) => [f.source, f])).values()];

  /* ---------- the annual facts and the questions ---------- */
  const facts = (ids) => ids.map(F).filter(Boolean);
  const annual = facts(["climate-tampa-annual-mean", "climate-tampa-annual-rain", "climate-stpete-annual-rain", "climate-tampa-rain-days"]);
  const coolOff = facts(["first-cool-night-tampa", "first-cool-night-stpete", "first-cold-night-tampa"]);
  const heatFacts = facts(["climate-tampa-days-90", "climate-stpete-days-90", "lightning-wait-30", "lightning-us-per-year", "lightning-deaths-florida-2026"]);
  const seasonFacts = facts(["hurricane-season", "hurricane-season-peak", "hurricane-season-average"]);
  const stormFacts = facts(["helene-surge-tampa", "helene-surge-clearwater-beach", "helene-deaths-pinellas", "milton-landfall-category", "milton-gust-st-pete", "milton-rain-st-pete"]);
  const Q = (pred) => db.faqs.filter(pred);
  const seasonQs = Q((f) => f.topic === "When to visit");
  const heatQs = Q((f) => f.topic === "Sun & heat" || /lightning|thunder/.test(f.id));
  const HZ_GROUPS = [
    ["Before you go: know your zone", ["know-your-zone", "know-your-zone-hillsborough", "know-your-zone-pinellas", "emergency-alerts-hillsborough", "emergency-alerts-pinellas"]],
    ["If a storm threatens", ["hurricane-during-trip", "hurricane-watch-vs-warning"]],
    ["The season, and the 2024 storms", ["hurricane-season-dates", "when-is-hurricane-peak", "hurricanes-2024", "beaches-open-after-storms"]],
  ];
  const hzQs = HZ_GROUPS.map(([t, ids]) => [t, ids.map((id) => db.byId.faq.get(id)).filter(Boolean)]).filter(([, l]) => l.length);

  /* ---------- the hurricane season strip ---------- */
  const season = F("hurricane-season"), peak = F("hurricane-season-peak");
  const sm = season && /^(.+?)\s+to\s+(.+)$/.exec(season.value);
  const sA = sm ? dayOfYear(sm[1]) : null, sB = sm ? dayOfYear(sm[2]) : null, pk = peak ? dayOfYear(peak.value) : null;
  const inSeason = (mi) => { if (sA == null || sB == null) return false; const a = MONTH_DAYS.slice(0, mi).reduce((x, y) => x + y, 0), b = a + MONTH_DAYS[mi] - 1; return b >= sA && a <= sB; };
  let peakMonth = -1;
  if (pk != null) { let d = pk; for (let i = 0; i < 12; i++) { if (d < MONTH_DAYS[i]) { peakMonth = i; break; } d -= MONTH_DAYS[i]; } }
  const strip = () => (sA == null || sB == null ? "" : `<figure class="wv-hz">
<div class="wv-hz-chart" role="img" aria-label="${attr(`Atlantic hurricane season, ${season.value}${peak && pk != null ? `; its peak is ${peak.value}` : ""}.`)}">
<ol class="wv-hz-m" aria-hidden="true">${MONTH.map((m, i) => `<li style="--d: ${MONTH_DAYS[i]}"${inSeason(i) ? ' class="in"' : ""}><span class="wv-m3">${m.slice(0, 3)}</span><span class="wv-m1">${m[0]}</span></li>`).join("")}</ol>
<span class="wv-hz-band" aria-hidden="true" style="--a: ${((sA / 365) * 100).toFixed(2)}%; --b: ${(((sB + 1) / 365) * 100).toFixed(2)}%"></span>
${pk != null ? `<span class="wv-hz-pk" aria-hidden="true" style="--at: ${(((pk + 0.5) / 365) * 100).toFixed(2)}%"></span>` : ""}
</div>
<figcaption><p class="wv-hz-leg"><span><i class="wv-kseason" aria-hidden="true"></i>${esc(`Hurricane season · ${season.value}`)}</span>${pk != null ? `<span><i class="wv-kpeak" aria-hidden="true"></i>${esc(`Peak · ${peak.value}`)}</span>` : ""}<span class="faint">${h.extLink(season.source_url, esc(h.hostOf(season.source_url)))}</span></p></figcaption>
</figure>`);

  /* ---------- the year at a glance ---------- */
  const win = config.dataWindow || db.window || {};
  const seriesIn = (mi) => h.sortBy(db.series.filter((s) => (s.months || []).includes(mi + 1)), (s) => (s.featured ? 0 : 1), (s) => s.name);
  const monthKeys = (mi) => db.months.filter((m) => Number(m.key.slice(5, 7)) === mi + 1);
  const SHOW = 6;
  function monthCard(root, r) {
    const mi = r.i;
    const list = seriesIn(mi);
    const li = (s) => `<li><a href="${root}whats-on.html#s-${attr(s.id)}">${esc(s.name)}</a>${s.area ? `<span class="wv-yr-a">${esc(db.byId.area.get(s.area)?.name || "")}</span>` : ""}</li>`;
    const wx = [
      ...CITIES.map((cty) => [cty.name === "St. Petersburg" ? "St. Pete" : cty.name, r[cty.key]?.n ? `${esc(r[cty.key].n.hiS)}° / ${esc(r[cty.key].n.loS)}°F` : r[cty.key] ? esc(r[cty.key].f.value) : c.unk("Not listed")]),
      ["Gulf", r.gulf ? esc(r.gulf.n ? `${r.gulf.n.s}°F` : r.gulf.f.value) : c.unk("Not listed")],
      ["Rain", CITIES.every((cty) => r[cty.key]?.n) ? `${esc(r.tampa.n.rainS)} · ${esc(r.stpete.n.rainS)} in` : c.unk("Not listed")],
    ];
    const keys = monthKeys(mi);
    const ev = keys.length ? keys.map((m) => `<a href="${root}whats-on.html?month=${attr(m.key)}">${esc(h.plural(m.count, "dated event"))} in ${esc(m.label)}${icon("arrow-r")}</a>`).join("")
      : `<span class="unk">${esc(`No dated events listed: the guide's calendar runs ${h.fmtDateY(win.start)} to ${h.fmtDateY(win.end)}`)}</span>`;
    const flags = [inSeason(mi) ? c.badge("warn", mi === peakMonth ? `Hurricane season · peak ${peak.value.replace(/^(\w{3})\w*/, "$1")}` : "Hurricane season") : ""].join("");
    return `<article class="wv-yr" id="m-${r.mon}"${inSeason(mi) ? ' data-storm="1"' : ""}>
<header class="wv-yr-h"><h3>${esc(r.name)}</h3>${flags}</header>
<dl class="wv-yr-wx">${wx.map(([k, v]) => `<div><dt class="label">${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>
<h4 class="wv-yr-sub label">${esc(list.length ? `Every year · ${list.length}` : "Every year")}</h4>
${list.length ? `<ul class="wv-yr-list">${list.slice(0, SHOW).map(li).join("")}</ul>${list.length > SHOW ? `<details class="wv-yr-more"><summary>${esc(`${list.length - SHOW} more in ${r.name}`)}</summary><ul class="wv-yr-list">${list.slice(SHOW).map(li).join("")}</ul></details>` : ""}` : `<p class="unk">No annual events listed for ${esc(r.name)}</p>`}
<p class="wv-yr-ev">${ev}</p>
</article>`;
  }

  const hasClimate = CITIES.some((cty) => cityHas(cty.key)) || gulfHas;
  const toc = [
    ...(hasClimate || annual.length || seasonQs.length ? [["climate", "Weather by month"]] : []),
    ["year", "The year at a glance"],
    ...(seasonFacts.length || hzQs.length || stormFacts.length ? [["hurricanes", "Hurricane season"]] : []),
    ...(heatFacts.length || heatQs.length ? [["sun-heat", "Sun, heat and lightning"]] : []),
  ];
  const warmest = (() => { const v = rows.filter((r) => r.gulf?.n); if (!v.length) return ""; const m = Math.max(...v.map((r) => r.gulf.n.f)); return v.filter((r) => r.gulf.n.f === m).map((r) => r.name).join(" and "); })();

  return {
    path: "when-to-visit.html", nav: "when-to-visit", title: "When to visit",
    description: "When to visit Tampa Bay: highs, lows, rain and Gulf water temperature by month, hurricane season and what to do, and the year's annual events month by month, each with its source.",
    toc,
    body: (root) => `${c.pageHead({ num: 5, kicker: "Visit · weather, storms and the year", title: "When to visit",
      lede: "Highs, lows, rain and Gulf water temperature by month, from the National Weather Service's normals and the beaches' own table; hurricane season and what to do; and what happens every year, month by month." })}
${toc.find(([id]) => id === "climate") ? sect(ctx, { id: "climate", title: "Weather by month", kicker: "Normals, 1991–2020", icon: "sun", root, body: `${hasClimate ? `<p class="vz-lede">Three charts on one scale: the bars run from the average low to the average high${gulfHas ? `, and the Gulf line is the average water temperature (warmest in ${esc(warmest)})` : ""}. Hover a month for its values; the table below lists all of them.</p>
<div class="wv-clims">${CITIES.filter((cty) => cityHas(cty.key)).map(cityPanel).join("")}${gulfHas ? gulfPanel() : ""}</div>
${table()}
${c.sourceLine(climateFacts.map((f) => f.source_url), { note: climateSources.length ? `${climateSources.map((f) => f.source).join(" · ")}. Checked ${h.fmtDateY(climateFacts[0].checked)}` : "" })}` : ""}
${annual.length || coolOff.length ? `<h3 class="sub-h">The year in numbers</h3>${tiles(ctx, annual)}${coolOff.length ? `<h3 class="sub-h">When it cools off</h3>${tiles(ctx, coolOff)}` : ""}` : ""}
${seasonQs.length ? `<h3 class="sub-h">Questions about the seasons</h3>${questions(ctx, root, seasonQs, { more: { href: "faq.html?topic=when-to-visit", label: "These questions in the FAQ" } })}` : ""}` }) : ""}
${sect(ctx, { id: "year", title: "The year at a glance", kicker: `${h.plural(db.series.length, "annual event")} · 12 months`, icon: "calendar", root, more: db.series.length ? { href: "whats-on.html", label: "What's On" } : null,
  body: `<p class="vz-lede">Each month's normals, the events that come back every year (as their organizers describe them), and the dated events in the guide's calendar.</p>
<div class="wv-yrs">${rows.map((r) => monthCard(root, r)).join("\n")}</div>` })}
${toc.find(([id]) => id === "hurricanes") ? sect(ctx, { id: "hurricanes", title: "Hurricane season", kicker: season ? season.value : "Storms", icon: "wave", root, body: `${strip()}
${tiles(ctx, seasonFacts)}
${hzQs.map(([t, l]) => `<h3 class="sub-h">${esc(t)}</h3>${questions(ctx, root, l)}`).join("")}
${stormFacts.length ? `<h3 class="sub-h">Helene and Milton, 2024</h3><p class="vz-lede">The National Weather Service's numbers for the two storms that closed or damaged many Pinellas beach properties.</p>${tiles(ctx, stormFacts, "vs-storm")}` : ""}` }) : ""}
${toc.find(([id]) => id === "sun-heat") ? sect(ctx, { id: "sun-heat", title: "Sun, heat and lightning", kicker: "Safety", icon: "sun", root, body: `${tiles(ctx, heatFacts)}${questions(ctx, root, heatQs, { more: db.faqs.some((f) => f.topic === "Sun & heat") ? { href: `faq.html?topic=${h.slugify("Sun & heat")}`, label: "Sun and heat in the FAQ" } : null })}` }) : ""}`,
  };
}

/* The parsers, for tests/visit.test.mjs (the build only calls pages()). */
export { parseNormals, parseF, dayOfYear, stopNo, stopName, statTile, seasonWord };
