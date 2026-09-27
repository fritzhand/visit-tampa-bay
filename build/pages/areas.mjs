/* ============================================================
   build/pages/areas.mjs · OWNER: the Areas lane (with the Map lane)
   areas.html: all 45 areas by sheet. Each sheet opens with an index chart of its areas (numbered buoys at each area's
   center, the same numbers on the cards), then area cards (name, kind, known for, counts, link). ?r= filters the sheets
   (the core filter: [data-filter-list], sheet chips, [data-filter-group] per sheet).
   areas/<id>.html for every area in db.areas (all 45, record or not):
     head (sheet ribbon, kind, summary, known for, sheet · chart · official site links), at a glance (counts), the area
     chart (its places as numbered buoys, numbers as in the lists), then sections in this order:
       #do       Things to do here, by kind group        #stay     Where to stay here (nearest listed when none)
       #tours    Tours that depart here                  #on       What's on here: the next 60 days (JS follows the
                                                                   clock: site/js/features/map.js, [data-area-events])
       #history  Historic sites here (+ other records here with a history entry)
       #eat      Eat and drink here                      #nearby   Nearby areas (straight line between centers)
     and the area's source line. Every empty section says so plainly; nothing is guessed.
   ============================================================ */
import { sortBy } from "../core/util.mjs";
import { haversine } from "../../site/js/lib/geo.js";
import { PLACE_GROUP, PLACE_GROUP_LABEL, PLACE_KIND_LABEL, STAY_KIND_LABEL, EXPERIENCE_KIND_LABEL, AREA_KIND_LABEL, FEATURE_LABEL, EVENT_KIND_LABEL, REGIONS } from "../core/vocab.mjs";
import { fmtTime, fmtDay, fmtDate, fmtDateRange, fmtThrough, addDays, isoLocal } from "../core/time.mjs";
import { oneLine } from "./map.mjs";

/** "Things to do" groups in the order an area page lists them (history, eat and drink have sections of their own). */
const DO_GROUPS = ["attractions", "arts", "outdoors", "sports", "shopping", "info"];
const EAT = new Set(["eat", "drink"]);
const WINDOW_DAYS = 60;
const STAY_SHOWN = 12;

export function pages(ctx) {
  const { db, c, h, cards, seo, config } = ctx;
  const { esc, attr, icon, bullet, extLink, plural } = h;
  const regionOf = (id) => db.byId.region.get(id);
  const ref = ctx.buildDay > db.window.start ? ctx.buildDay : db.window.start;   // the no-JS "today"
  const refEnd = addDays(ref, WINDOW_DAYS - 1);
  const distLabel = (m) => (m < 1609.344 * 0.2 ? `${Math.round(m / 10) * 10} m` : `${(m / 1609.344).toFixed(1)} mi`);

  /** SPEC §7: every map's attribution line. */
  const attribution = `<p class="fig-attrib">Basemap: US Census Bureau TIGER/Line (public domain). Place coordinates include data © OpenStreetMap contributors, ODbL (${extLink("https://www.openstreetmap.org/copyright", "https://www.openstreetmap.org/copyright")}).</p>`;

  /* ---------- rows ---------- */
  const mk = (a, n, sym) => (n != null ? `<span class="map-mk mk-buoy" data-sheet="${a.region}" aria-hidden="true">${n}</span>` : `<span class="map-mk mk-sym" data-sheet="${a.region}" aria-hidden="true">${icon(sym)}</span>`);
  const built = (r) => (r.heritage && r.heritage.built ? `built ${r.heritage.built}` : "");
  function placeRow(root, a, p, n) {
    const w = [PLACE_KIND_LABEL[p.kind], built(p)].filter(Boolean).join(" · ");
    const sum = oneLine(p.summary);
    return `<li class="row ar-row"${p.region ? ` data-sheet="${p.region}"` : ""}${p.ll && n != null ? ` data-ll="${p.ll[0]},${p.ll[1]}" data-n="${n}"${p.heritage || PLACE_GROUP[p.kind] === "history" ? ' data-h="1"' : ""}` : ""}>${mk(a, p.ll ? n : null, "pin")}<a href="${root}places/${attr(p.id)}.html"><span><span class="t">${esc(p.name)}</span>${p.signature ? `<span class="seal">${icon("seal")}Signature</span>` : ""}<span class="w">${esc(w)}${p.status !== "open" ? ` ${c.statusBadge(p)}` : ""}${p.ll ? "" : ' · <span class="unk">not on the map</span>'}</span></span></a>${c.starButton(p.id, p.name, { kind: "p" })}${sum ? `<p class="ar-sum">${esc(sum)}</p>` : ""}</li>`;
  }
  function stayRow(root, a, s, note = "") {
    const feats = (s.features || []).slice(0, 3).map((f) => FEATURE_LABEL[f] || f);
    const w = [STAY_KIND_LABEL[s.kind], s.brand && s.brand !== "Independent" ? s.brand : s.brand === "Independent" ? "Independent" : "", ...feats, note].filter(Boolean).join(" · ");
    return `<li class="row ar-row"${s.region ? ` data-sheet="${s.region}"` : ""}>${mk(a, null, "anchor")}<a href="${root}stays/${attr(s.id)}.html"><span><span class="t">${esc(s.name)}</span><span class="w">${esc(w)}${s.status !== "open" ? ` ${c.statusBadge(s)}` : ""}</span></span></a>${c.starButton(s.id, s.name, { kind: "s" })}</li>`;
  }
  function tourRow(root, a, x) {
    const from0 = x.departs ? x.departs.name : x.departs_text || "", from = from0.length > 64 ? `${from0.slice(0, 62).replace(/\s+\S*$/, "")}…` : from0;
    const w = [EXPERIENCE_KIND_LABEL[x.kind], x.operator && x.operator !== x.name ? x.operator : "", from ? `from ${from}` : ""].filter(Boolean).join(" · ");
    return `<li class="row ar-row"${x.region ? ` data-sheet="${x.region}"` : ""}>${mk(a, null, "daymark")}<a href="${root}experiences.html?x=${attr(x.id)}#x-${attr(x.id)}" data-open-experience="${attr(x.id)}"><span><span class="t">${esc(x.name)}</span><span class="w">${esc(w)}${x.status !== "open" ? ` ${c.statusBadge(x)}` : ""}</span></span></a>${c.starButton(x.id, x.name, { kind: "x" })}</li>`;
  }
  /** One row per event: its next listing from `ref` (the time column), every listing day for the client's window. */
  function eventRow(root, ev) {
    const next = ev.instances.find((x) => (x.run ? x.through >= ref : x.day >= ref)) || ev.instances[ev.instances.length - 1];
    const days = [...new Set(ev.instances.filter((x) => !x.run).map((x) => x.day))];
    const timed = next.start && !next.timeUnknown && !next.allDay && !next.run;
    const [hm, ap] = timed ? fmtTime(next.start).split(" ") : ["", ""];
    const multi = days.length > 1;
    const consecutive = multi && days.every((d, i) => i === 0 || addDays(days[i - 1], 1) === d);
    const when = next.run ? fmtThrough(next.through, next.date) : multi ? (consecutive ? fmtDateRange(days[0], days[days.length - 1]) : `${days.length} dates from ${fmtDate(days[0])}`) : fmtDay(next.day);
    const where = ev.venue?.name || ev.location_text || "";
    const inWin = next.run ? next.date <= refEnd && next.through >= ref : days.some((d) => d >= ref && d <= refEnd);
    const inst = multi && !next.timeUnknown ? ` data-inst="${ev.instances.map((y) => `${y.s}:${y.e}`).join(",")}"` : "";
    const live = `data-s="${next.s}" data-e="${next.e}"${inst}${days.length ? ` data-days="${days.join(" ")}"` : ""}${next.run ? ` data-run="${next.through}" data-run-from="${next.date}" data-run-to="${next.through < db.window.end ? next.through : db.window.end}"` : ""}${next.endUnknown ? ' data-end-unknown="1"' : ""}${next.timeUnknown ? ' data-time-unknown="1"' : ""}${next.allDay ? ' data-all-day="1"' : ""}`;
    return `<li data-ev="${attr(ev.id)}"${ev.region ? ` data-sheet="${ev.region}"` : ""} ${live}${inWin ? "" : " hidden"}><a href="${root}whats-on.html?e=${attr(ev.id)}#e-${attr(ev.id)}" data-open-event="${attr(ev.id)}"><time${timed ? ` datetime="${isoLocal(next.s)}"` : ""}>${timed ? `${esc(hm)}<small>${esc(ap)}</small>` : `<small>${esc(next.run ? `From ${fmtDate(ev.date)}` : next.allDay ? "All day" : "Time not listed")}</small>`}</time>${ev.region ? bullet(ev.region) : ""}<span><span class="t">${esc(ev.title)}</span><span class="w">${esc([when, EVENT_KIND_LABEL[ev.kind], where].filter(Boolean).join(" · "))}${ev.status !== "scheduled" ? ` ${c.eventStatusBadge(ev)}` : ""} <span data-status></span></span></span></a></li>`;
  }
  const rows = (items, cls = "") => `<ul class="rows ar-rows${cls ? " " + cls : ""}">${items.join("")}</ul>`;
  const note = (html) => `<p class="ar-none">${html}</p>`;

  /* ---------- what sits where on an area page (the numbers run through the page in reading order) ---------- */
  function layout(a) {
    const byName = (arr) => sortBy(arr, (r) => r.name.toLowerCase(), (r) => r.id);
    const group = (p) => PLACE_GROUP[p.kind] || "attractions";
    const doPlaces = a.places.filter((p) => !EAT.has(group(p)) && group(p) !== "history");
    const doGroups = DO_GROUPS.map((g) => [g, byName(doPlaces.filter((p) => group(p) === g))]).filter(([, xs]) => xs.length);
    const hist = byName(a.places.filter((p) => group(p) === "history"));
    const eat = [["eat", byName(a.places.filter((p) => group(p) === "eat"))], ["drink", byName(a.places.filter((p) => group(p) === "drink"))]].filter(([, xs]) => xs.length);
    const num = new Map();
    let n = 0;
    for (const p of [...doGroups.flatMap(([, xs]) => xs), ...hist, ...eat.flatMap(([, xs]) => xs)]) if (p.ll) num.set(p.id, ++n);
    return { doGroups, hist, eat, num };
  }

  /* ---------- areas.html ---------- */
  const withCounts = (a) => a.places.length + a.stays.length + a.experiences.length + a.events.length;
  const indexChart = (root, r) => {
    const pts = r.areas.map((a, i) => (a.ll ? { lat: a.ll[0], lng: a.ll[1], kind: "place", sheet: r.id, n: i + 1, title: a.name } : null)).filter(Boolean);
    const m = pts.length ? cards.chartMap(root, pts, { chart: "auto", minHalfM: 2500, ratio: "auto", labels: 3, label: `Chart of the ${plural(pts.length, "area")} on Sheet ${r.n}, ${r.name}, numbered as in the cards below`, cls: "ar-index-map", refW: 720 }) : "";
    return m ? `<figure class="ar-index${/--map-ar: 0\./.test(m) ? " is-tall" : ""}" data-sheet="${r.id}">${m}<figcaption class="faint">Each buoy marks an area's center; the numbers match the cards. Not for navigation. ${attribution}</figcaption></figure>` : "";
  };
  const list = {
    path: "areas.html", nav: "areas", title: "Areas & towns",
    description: `Tampa Bay's ${db.areas.length} neighborhoods, towns and beach towns on six sheets, with what each is known for and how many places, places to stay and events this guide lists there.`,
    toc: db.regions.map((r) => [`r-${r.id}`, r.name]),
    body: (root) => `${c.pageHead({ num: 4, kicker: `Stay · ${db.areas.length} areas on ${db.regions.length} sheets`, title: "Areas & towns", lede: "The neighborhoods, towns and beach towns on each sheet of the chart: what each is known for, and how many places, places to stay and events this guide lists there. Each area's page has its own chart." })}
<div class="ar-filter js-only" data-filter-root><div class="chip-row" role="group" aria-label="Sheets">${db.regions.map((r) => c.chip(r.short || r.name, null, { count: r.areas.length, pressed: false, sheet: r.id, attrs: `data-filter-chip="r=${r.id}"` })).join("")}<button class="btn btn-ghost btn-sm" type="button" data-filter-clear hidden>${icon("x")}All sheets</button></div>${c.resultCount(db.areas.length, db.areas.length, "areas")}</div>
<div class="ar-sheets" data-filter-list>
${db.regions.map((r) => {
    const counts = [plural(r.areas.length, "area"), plural(r.places.length, "place"), plural(r.stays.length, "place to stay", "places to stay"), plural(r.events.length, "event")].join(" · ");
    const chart = indexChart(root, r);
    return `<section class="section ar-sheet${chart.includes("ar-index is-tall") ? " has-tall" : ""}" id="r-${r.id}" aria-labelledby="r-${r.id}-h" data-filter-group data-sheet="${r.id}">
<div class="sec-head oxford ar-sheet-head"><p class="sec-kicker label">${bullet(r.id)}Sheet ${r.n} · ${esc(r.code)}</p><h2 id="r-${r.id}-h">${esc(r.name)}</h2><a class="more" href="${root}${ctx.nav.regionHref(r.id)}">The ${esc(r.name)} sheet${icon("arrow-r")}</a><p class="ar-sheet-counts faint">${esc(counts)}</p></div>
${chart}
<div class="grid ar-grid">${r.areas.map((a, i) => cards.areaCard(root, a, { anchor: true, n: a.ll ? i + 1 : null, plate: false, summary: true })).join("")}</div>
</section>`;
  }).join("\n")}
</div>
<p class="source-line">${icon("info")}<span>Summaries and "known for" lines are drawn from each area's sources (its official site, a city or county page, a visitors bureau); every area page names them. Counts are what this guide lists, not everything there is.</span></p>`,
  };

  /* ---------- areas/<id>.html ---------- */
  const detail = db.areas.map((a) => {
    const r = regionOf(a.region);
    const { doGroups, hist, eat, num } = layout(a);
    const sib = r.areas, si = sib.indexOf(a);
    const upcoming = a.events.filter((e) => e.instances.some((x) => (x.run ? x.through >= ref : x.day >= ref)));
    const sortNext = (e) => { const x = e.instances.find((y) => (y.run ? y.through >= ref : y.day >= ref)); return x.run ? `${x.date < ref ? ref : x.date}` : x.day; };
    const evs = sortBy(upcoming, sortNext, (e) => e.first, (e) => e.id);
    const inWin = evs.filter((e) => e.instances.some((x) => (x.run ? x.date <= refEnd && x.through >= ref : x.day >= ref && x.day <= refEnd)));
    const heritageOthers = [...a.places.filter((p) => p.heritage && PLACE_GROUP[p.kind] !== "history"), ...a.stays.filter((s) => s.heritage)];
    const nearby = a.ll ? sortBy(db.areas.filter((o) => o !== a && o.ll).map((o) => ({ o, d: haversine({ lat: a.ll[0], lng: a.ll[1] }, { lat: o.ll[0], lng: o.ll[1] }) })), (x) => x.d).slice(0, 6) : [];
    const stays = sortBy(a.stays, (s) => (s.status === "open" ? 0 : 1), (s) => s.name.toLowerCase());
    const nearestStays = !stays.length && a.ll ? sortBy(db.stays.filter((s) => s.ll && s.open).map((s) => ({ s, d: haversine({ lat: a.ll[0], lng: a.ll[1] }, { lat: s.ll[0], lng: s.ll[1] }) })), (x) => x.d).slice(0, 3) : [];
    const tours = sortBy(a.experiences, (x) => x.name.toLowerCase());
    const nDo = doGroups.reduce((n, [, xs]) => n + xs.length, 0), nEat = eat.reduce((n, [, xs]) => n + xs.length, 0);
    const toc = [["do", "Things to do"], ["stay", "Where to stay"], ["tours", "Tours"], ["on", "What's on"], ["history", "Historic sites"], ["eat", "Eat and drink"], ["nearby", "Nearby areas"]];
    const places = a.places.filter((p) => p.ll && num.has(p.id));
    const url = `${config.siteBase}areas/${a.id}.html`;
    return {
      path: `areas/${a.id}.html`, nav: "areas", title: a.name,
      description: a.summary ? oneLine(a.summary) : `${a.name}, on Sheet ${r.n} (${r.name}) of this independent Tampa Bay guide: places, places to stay, tours and events there.`,
      crumbs: [["Overview", "index.html"], ["Areas & towns", "areas.html"], [a.name, null]],
      pagenav: { prev: sib[si - 1] ? { href: `areas/${sib[si - 1].id}.html`, label: sib[si - 1].name } : null, next: sib[si + 1] ? { href: `areas/${sib[si + 1].id}.html`, label: sib[si + 1].name } : null },
      toc, features: ["map"], og: `og-${a.region}.png`,
      jsonld: seo.destinationLd(a, { url }),
      body: (root) => {
        const links = [
          `<a class="btn btn-secondary btn-sm" href="${root}${ctx.nav.regionHref(a.region)}">${bullet(a.region)}Sheet ${r.n}: ${esc(r.name)}</a>`,
          a.ll || places.length ? `<a class="btn btn-secondary btn-sm" href="${root}map.html?focus=area:${attr(a.id)}">${icon("map")}On the chart</a>` : "",
          a.official_url ? extLink(a.official_url, `${icon("ext")}Official site`, "btn btn-secondary btn-sm") : "",
        ].filter(Boolean).join("");
        const known = (a.known_for || []).length ? `<p class="ar-known"><span class="label">Known for</span> ${a.known_for.map((k) => `<span>${esc(k)}</span>`).join('<span class="sep" aria-hidden="true"> · </span>')}</p>` : "";
        const head = c.pageHead({ sheet: a.region, kicker: `Sheet ${r.n} · ${r.name}${a.kind ? ` · ${AREA_KIND_LABEL[a.kind]}` : ""}`, title: a.name, lede: a.summary || "", after: `${known}<p class="head-actions">${links}</p>` });
        const chart = places.length
          ? cards.chartMap(root, places.map((p) => ({ lat: p.ll[0], lng: p.ll[1], kind: p.heritage || PLACE_GROUP[p.kind] === "history" ? "heritage" : "place", sheet: a.region, n: num.get(p.id), title: p.name })), { chart: "auto", minHalfM: 700, ratio: 4 / 3, labels: 3, label: `Chart of ${a.name}: ${plural(places.length, "place")}, numbered as in the lists below`, cls: "ar-map" })
          : a.ll ? cards.miniMap(root, a.ll[0], a.ll[1], { sheet: a.region, label: `Map: ${a.name}`, halfWidthM: 2500 }) : "";
        const glance = c.facts(root, [
          ["Sheet", `<a href="${root}${ctx.nav.regionHref(a.region)}">${esc(`${r.n} · ${r.name}`)}</a>`],
          ["Kind", a.kind ? esc(AREA_KIND_LABEL[a.kind]) : ""],
          ["Things to do", `<a class="ar-n" href="#do">${esc(String(nDo))}</a>`],
          ["Places to stay", `<a class="ar-n" href="#stay">${esc(String(stays.length))}</a>`],
          ["Tours from here", `<a class="ar-n" href="#tours">${esc(String(tours.length))}</a>`],
          ["Events this season", `<a class="ar-n" href="#on">${esc(String(a.events.length))}</a>`],
          ["Historic sites", `<a class="ar-n" href="#history">${esc(String(hist.length))}</a>`],
          ["Eat and drink", `<a class="ar-n" href="#eat">${esc(String(nEat))}</a>`],
        ], { label: `${a.name} at a glance` });
        const chartBlock = `<div class="ar-top">${chart ? `<figure class="ar-chart"${places.length ? ` data-area-chart="${attr(a.name)}"` : ""}>${chart}<figcaption class="faint">${places.length ? "Numbers match the lists below; a medallion holds places too close to tell apart. Positions are each place's listed coordinates. Not for navigation." : "The area's center. No place in this area has coordinates in this guide yet."} ${attribution}</figcaption></figure>` : `<p class="unk ar-nochart">Not on the map: no coordinates listed for this area.</p>`}${glance}</div>`;

        const sDo = c.section({ id: "do", title: "Things to do here", root, body: doGroups.length
          ? doGroups.map(([g, xs]) => `<h3 class="sub-h">${esc(PLACE_GROUP_LABEL[g])}</h3>${rows(xs.map((p) => placeRow(root, a, p, num.get(p.id))))}`).join("")
          : note(`No museums, parks, beaches or other things to do in ${esc(a.name)} are in this guide yet. <a href="${root}things-to-do.html?r=${a.region}">Things to do on the ${esc(r.name)} sheet</a>.`) });
        const sStay = c.section({ id: "stay", title: "Where to stay here", root, body: stays.length
          ? `${rows(stays.slice(0, STAY_SHOWN).map((s) => stayRow(root, a, s)))}${stays.length > STAY_SHOWN ? `<details class="ar-more"><summary>Show ${plural(stays.length - STAY_SHOWN, "more place to stay", "more places to stay")}</summary>${rows(stays.slice(STAY_SHOWN).map((s) => stayRow(root, a, s)))}</details>` : ""}<p class="ar-link"><a href="${root}stay.html?a=${attr(a.id)}">${stays.length > 1 ? "Compare them" : "See it"} on Where to stay${icon("arrow-r")}</a></p>`
          : note(`No hotels, inns or other places to stay in ${esc(a.name)} are listed in this guide.${nearestStays.length ? ` The nearest listed, by straight-line distance from the area's center:` : ""}`) + (nearestStays.length ? rows(nearestStays.map(({ s, d }) => stayRow(root, a, s, `${distLabel(d)} away, straight line`))) : "") });
        const sTours = c.section({ id: "tours", title: "Tours that depart here", root, body: tours.length
          ? rows(tours.map((x) => tourRow(root, a, x)))
          : note(`No tours or boat trips in this guide depart from ${esc(a.name)}. <a href="${root}experiences.html?r=${a.region}">Experiences on the ${esc(r.name)} sheet</a>.`) });
        const series = sortBy(a.series || [], (s) => s.name.toLowerCase());
        const sOn = c.section({ id: "on", title: "What's on here", root, body: `<div class="ar-events" data-area-events>
<p class="ar-evcount faint" data-ev-count>${inWin.length ? `${plural(inWin.length, "event")} from ${esc(fmtDate(ref))} to ${esc(fmtDate(refEnd))}` : ""}</p>
${evs.length ? `<ol class="tonight ar-tonight">${evs.map((e) => eventRow(root, e)).join("")}</ol>` : ""}
<p class="ar-none" data-ev-empty${inWin.length ? " hidden" : ""}>Nothing is listed in ${esc(a.name)} for the next ${WINDOW_DAYS} days. <a href="${root}whats-on.html?r=${a.region}">What's on across the ${esc(r.name)} sheet</a>.</p>
${a.events.length ? `<p class="ar-link"><a href="${root}whats-on.html?a=${attr(a.id)}">All ${plural(a.events.length, "event")} here this season on What's On${icon("arrow-r")}</a></p>` : ""}
${series.length ? `<p class="ar-series"><span class="label">Every year here</span> ${series.map((s) => `<a href="${root}whats-on.html#s-${attr(s.id)}">${esc(s.name)}</a>`).join('<span aria-hidden="true"> · </span>')}</p>` : ""}
</div>` });
        const sHist = c.section({ id: "history", title: "Historic sites here", root, body: (hist.length ? rows(hist.map((p) => placeRow(root, a, p, num.get(p.id)))) : note(`No historic sites or districts in ${esc(a.name)} are in this guide.`))
          + (heritageOthers.length ? `<p class="ar-also"><span class="label">Also with a history entry</span> ${heritageOthers.map((x) => `<a href="${root}${db.byId.stay.has(x.id) ? "stays" : "places"}/${attr(x.id)}.html">${esc(x.name)}</a>${x.heritage.built ? ` <span class="faint">(${esc(x.heritage.built)})</span>` : ""}`).join('<span aria-hidden="true"> · </span>')}</p>` : "") });
        const sEat = c.section({ id: "eat", title: "Eat and drink here", root, body: eat.length
          ? eat.map(([g, xs]) => `<h3 class="sub-h">${esc(PLACE_GROUP_LABEL[g])}</h3>${rows(xs.map((p) => placeRow(root, a, p, num.get(p.id))))}`).join("")
          : note(`No restaurants, cafés or bars in ${esc(a.name)} are in this guide yet. <a href="${root}eat-drink.html?r=${a.region}">Eat and drink on the ${esc(r.name)} sheet</a>.`) });
        const sNear = c.section({ id: "nearby", title: "Nearby areas", root, body: nearby.length
          ? `<ul class="rows ar-rows ar-near">${nearby.map(({ o, d }) => `<li class="row ar-row" data-sheet="${o.region}"><a href="${root}areas/${attr(o.id)}.html">${bullet(o.region)}<span><span class="t">${esc(o.name)}</span><span class="w">${esc([o.kind ? AREA_KIND_LABEL[o.kind] : "", o.region !== a.region ? `Sheet ${regionOf(o.region).n} · ${regionOf(o.region).name}` : ""].filter(Boolean).join(" · "))}</span></span></a><span class="ar-dist tnum">${esc(distLabel(d))}</span></li>`).join("")}</ul><p class="faint ar-note">Straight-line distance between area centers; by road it is farther.</p>`
          : note("This area has no center coordinates, so nearby areas cannot be measured.") });
        return [head, chartBlock, sDo, sStay, sTours, sOn, sHist, sEat, sNear, a.record ? c.recordSource(a) : c.callout("", `<p>This area has no profile in the guide's data yet, so it has no summary or sources of its own. The lists above come from the places, stays and events filed under it.</p>`, { flag: "No profile yet" })].join("\n");
      },
    };
  });
  return [list, ...detail];
}
