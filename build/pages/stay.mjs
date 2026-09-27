/* ============================================================
   build/pages/stay.mjs · OWNER: the Stay lane (experiences-eat-stay)
   Produces stay.html (Where to stay) and stays/<id>.html for EVERY stay (search entries and cards link there).

   stay.html
     · a "Closed for now" callout: every stay that is not open (temporarily closed after the 2024 hurricanes,
       opening soon), with the source's own note, and the open ones whose source adds a note (a closed pool)
     · "Choosing an area": one table per sheet, a row per area with stays: how many, their kinds, how many say
       they are beachfront (the property's own page), and the straight-line distance from the area's center to
       the nearest airport (an estimate, labeled). Each count filters the list in place (stay.js) or by link.
     · "Every place to stay": filters r a k f q (f = features as words, "has all of" them: stay.js mounts the
       list filter with an AND test), List / Map (?view=map; the map is stay.js, pins follow the filters),
       sheet → area groups of compact stay cards (id="s-<id>": anchor, kind, brand · collection, status + note,
       summary, features as words, rooms · opened · built).
   stays/<id>.html
     head (sheet ribbon, name, our summary, Add to My Trip, status), a status callout when the source says it is
     not open (or adds a note), the photo (with its credit) or the plate, the operator's words, "At a glance"
     (address, phone, website, brand, collection, rooms, opened, features, nearest airport), the heritage block,
     the mini map with directions and "On the map", what's on within 2 km (every listed event; stay.js narrows it
     to the next 30 days with the reader's clock), things to do, food and drink and departures within 1.2 km
     (straight-line distances and walking estimates, labeled), other stays in the area, the timeline entries
     that name it, and the source line.
   Also exports kit(ctx): the lane's shared list helpers (selects with optgroups, the filter toolbar, the empty
   state, the "Checked …" line), used by experiences.mjs and eat-drink.mjs.
   data(ctx) → assets/data/stay-map.json (the basemap's projection and labels, fetched when the map opens).
   ============================================================ */
import { haversine, walkMinutes } from "../../site/js/lib/geo.js";
import { builtYear } from "../components/stay-card.mjs";

/** Plural words for stay kinds (tables and headings). */
export const STAY_KIND_PLURAL = {
  hotel: "Hotels", resort: "Resorts", "boutique-hotel": "Boutique hotels", "historic-hotel": "Historic hotels", "extended-stay": "Extended-stay hotels",
  motel: "Motels", inn: "Inns", "bed-and-breakfast": "Bed and breakfasts", hostel: "Hostels", "condo-hotel": "Condo hotels",
  "casino-resort": "Casino resorts", campground: "Campgrounds",
};
/** Feature chips shown at once (the rest fold under "More features"): what visitors filter by most. */
const TOP_FEATURES = ["beachfront", "waterfront", "pool", "pet-friendly", "free-breakfast", "free-parking", "kitchens", "airport-shuttle", "spa", "adults-only"];
/** How each record's coordinates were found (research SCHEMA geo_source), in words. */
const GEO_WORDS = { census: "a US Census address match", photon: "OpenStreetMap (Photon search)", official: "the property's own map or listing", wikipedia: "Wikipedia", osm: "OpenStreetMap", manual: "placed by hand from the address" };

/** The lane's shared list helpers (stay.html, experiences.html, eat-drink.html). */
export function kit(ctx) {
  const { h, c } = ctx;
  const { esc, attr } = h;
  const sortName = (s) => String(s || "").replace(/^the\s+/i, "").toLowerCase();
  /** <select data-filter> with an "all" option, plain options [[v, label]] and/or optgroups [{ label, options }]. */
  function select({ name, label, all, options = [], groups = [] }) {
    // list values in the order lib/filters.js parses them (sorted), so a filtered URL selects its option again
    const opt = ([v, l]) => `<option value="${attr(String(v).split(",").sort().join(","))}">${esc(l)}</option>`;
    return `<label class="lane-select"><span class="lane-select-l label">${esc(label)}</span><select class="select" name="${attr(name)}" data-filter="${attr(name)}"><option value="">${esc(all || `All`)}</option>${options.map(opt).join("")}${groups.filter((g) => g.options.length).map((g) => `<optgroup label="${attr(g.label)}">${g.options.map(opt).join("")}</optgroup>`).join("")}</select></label>`;
  }
  /** The filter toolbar (JS-only: without JS every list is complete and nothing is hidden). */
  function toolbar({ search, selects = [], views = "", after = "" }) {
    return `<div class="toolbar js-only lane-tools">
<label class="field">${h.icon("search")}<span class="sr-only">${esc(search.label)}</span><input type="search" name="q" placeholder="${attr(search.placeholder)}" autocomplete="off" data-filter-q></label>
<div class="lane-selects">${selects.join("")}</div>${views}${after}
</div>`;
  }
  const clearBtn = () => `<button class="btn btn-ghost btn-sm lane-clear" type="button" data-filter-clear hidden>${h.icon("x")}Clear filters</button>`;
  const countLine = (n, noun) => `<div class="lane-count">${c.resultCount(n, n, noun)}${clearBtn()}</div>`;
  const empty = (what) => c.emptyState({ title: `No ${what} match these filters`, body: "Clear a filter or try another word. Every record is still on this page without filters.", action: `<button class="btn btn-secondary btn-sm" type="button" data-filter-clear>${h.icon("x")}Clear filters</button>`, attrs: "data-filter-empty hidden" });
  /** "Checked Sep 27, 2026" or "Checked Sep 20–27, 2026" over a set of records. */
  function checked(recs) {
    const ds = [...new Set(recs.map((r) => r.checked).filter(Boolean))].sort();
    if (!ds.length) return "";
    return ds.length === 1 ? `Checked ${h.fmtDateY(ds[0])}` : `Checked ${h.fmtDateRange(ds[0], ds[ds.length - 1])}, ${ds[ds.length - 1].slice(0, 4)}`;
  }
  /** A link that also sets the list filter in place (site/js/features/stay.js): key=value pairs on this page.
      `hash` is where the link lands without JS (the list is then complete): an area's own group when given. */
  const filterLink = (root, page, params, html, cls = "", hash = "list") => {
    const qs = Object.entries(params).map(([k, v]) => `${k}=${[].concat(v).sort().join(",")}`).join("&");
    return `<a${cls ? ` class="${cls}"` : ""} href="${root}${page}?${attr(qs)}#${attr(hash)}" data-set-filter="${attr(qs)}">${html}</a>`;
  };
  return { sortName, select, toolbar, clearBtn, countLine, empty, checked, filterLink };
}

export function pages(ctx) {
  const { db, c, h, cards, img, seo, config, vocab } = ctx;
  const { esc, attr } = h;
  const K = kit(ctx);
  const { STAY_KIND_LABEL, FEATURE_LABEL, STAY_KINDS, STAY_FEATURES, STATUS_LABEL, REGIONS } = vocab;
  const P = (ll) => ({ lat: ll[0], lng: ll[1] });
  const miles = (m) => `${(m / 1609.344).toFixed(1)} mi`;

  /* ---------- airports (transport mode "airport"), for straight-line distances ---------- */
  const airports = db.transport.filter((t) => t.mode === "airport" && t.lat != null && t.lng != null);
  const nearestAirport = (lat, lng) => {
    if (lat == null || lng == null || !airports.length) return null;
    return airports.map((t) => ({ t, d: haversine({ lat, lng }, { lat: t.lat, lng: t.lng }) })).sort((a, b) => a.d - b.d)[0];
  };
  const airportText = (a) => `${a.t.code || a.t.name} · ${miles(a.d)}`;

  const stays = db.stays;
  const byKind = (arr) => { const m = new Map(); for (const s of arr) m.set(s.kind, (m.get(s.kind) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1] || STAY_KINDS.indexOf(a[0]) - STAY_KINDS.indexOf(b[0])); };
  const kindsText = (arr) => byKind(arr).map(([k, n]) => `${STAY_KIND_PLURAL[k] || STAY_KIND_LABEL[k]} ${n}`).join(" · ");
  const has = (s, f) => (s.features || []).includes(f);
  const notOpen = stays.filter((s) => s.status !== "open");
  const openNoted = stays.filter((s) => s.status === "open" && s.status_note);

  /* ================= stay.html ================= */
  const regionsWith = db.regions.filter((r) => r.stays.length);
  const areasOf = (r) => r.areas.filter((a) => a.stays.length);
  const sortStays = (arr) => h.sortBy(arr, (s) => K.sortName(s.name), (s) => s.id);
  const featCount = (f) => stays.filter((s) => has(s, f)).length;
  const featsPresent = STAY_FEATURES.filter((f) => featCount(f) > 0);
  const featTop = TOP_FEATURES.filter((f) => featsPresent.includes(f));
  const featRest = featsPresent.filter((f) => !featTop.includes(f));
  const featChip = (f) => `<button class="chip" type="button" data-filter-chip="f=${attr(f)}" aria-pressed="false"><span>${esc(FEATURE_LABEL[f])}</span><span class="n">${featCount(f)}</span>${h.icon("check", "ck")}</button>`;

  /** A link to an FAQ entry, only when it exists (its question is the link text). */
  const faqLink = (root, id, pre = "", post = "") => { const f = db.byId.faq.get(id); return f ? `${pre}<a href="${root}faq.html#fq-${attr(id)}">${esc(f.q)}</a>${post}` : ""; };
  function closures(root) {
    if (!notOpen.length && !openNoted.length) return "";
    const row = (s) => `<li class="row stay-note-row" data-sheet="${s.region}"><a href="${root}stays/${attr(s.id)}.html">${h.bullet(s.region)}<span><span class="t">${esc(s.name)}</span><span class="w">${esc([STAY_KIND_LABEL[s.kind], db.byId.area.get(s.area)?.name].filter(Boolean).join(" · "))}</span></span></a>${s.status !== "open" ? c.statusBadge(s) : c.badge("", "Open")}${s.status_note ? `<p>${esc(s.status_note)}</p>` : ""}</li>`;
    const tc = notOpen.filter((s) => s.status === "temporarily-closed").length, os = notOpen.filter((s) => s.status === "opening-soon").length;
    const lead = [tc ? `${h.plural(tc, "place to stay is", "places to stay are")} temporarily closed` : "", os ? `${h.plural(os, "is", "are")} opening soon` : ""].filter(Boolean);
    return `<section class="section stay-closures" id="closures" aria-labelledby="closures-h">
<div class="sec-head oxford"><p class="sec-kicker label">${h.icon("warn")}Check before you go · ${esc(K.checked(stays))}</p><h2 id="closures-h">Closed for now, opening soon, or open with a note</h2></div>
<div class="callout tone-warn stay-closures-box"><span class="flag label">${h.icon("warn")}Heads up</span>
<p>Hurricanes Helene and Milton hit Tampa Bay in fall 2024${faqLink(root, "hurricanes-2024", " (FAQ: ", ")")}. As each source stated when it was checked, ${esc(h.listJoin(lead))}. Their cards and pages say so in words.</p>
${db.byId.faq.has("hurricane-during-trip") ? `<p>Staying near the water in hurricane season? ${faqLink(root, "hurricane-during-trip")}</p>` : ""}
${[["temporarily-closed", "Temporarily closed"], ["opening-soon", "Opening soon"], ["seasonal", "Seasonal"], ["closed", "Closed"]].map(([st, w]) => { const xs = notOpen.filter((s) => s.status === st); return xs.length ? `<h3 class="stay-note-h">${esc(w)} <span class="n">${xs.length}</span></h3><ul class="rows stay-note-rows">${h.sortBy(xs, (s) => K.sortName(s.name)).map(row).join("")}</ul>` : ""; }).join("")}
${openNoted.length ? `<details class="stay-noted"><summary>${h.icon("chev-d")}<span>Open, with a note from the source (${openNoted.length}), for example a closed pool or closed campsites</span></summary><ul class="rows stay-note-rows">${h.sortBy(openNoted, (s) => K.sortName(s.name)).map(row).join("")}</ul></details>` : ""}
</div>
</section>`;
  }

  function chooseArea(root) {
    const beach = (arr) => arr.filter((s) => has(s, "beachfront")).length;
    const closedN = (arr) => arr.filter((s) => s.status === "temporarily-closed").length;
    const airportCol = airports.length > 0;
    const sheet = (r) => {
      const as = areasOf(r);
      const none = r.areas.filter((a) => !a.stays.length);
      const rows = as.map((a) => {
        const ap = a.ll ? nearestAirport(a.ll[0], a.ll[1]) : null;
        const cl = closedN(a.stays);
        return `<tr data-sheet="${r.id}"><th scope="row"><a href="${root}areas/${attr(a.id)}.html">${esc(a.name)}</a></th>`
          + `<td class="num ch-n" data-label="Stays">${K.filterLink(root, "stay.html", { a: a.id }, `<b>${a.stays.length}</b><span class="ch-w"> ${a.stays.length === 1 ? "stay" : "stays"}</span><span class="sr-only">: show them</span>`, "", `area-${a.id}`)}${cl ? `<span class="ch-closed">${cl} closed</span>` : ""}</td>`
          + `<td class="ch-kinds" data-label="Kinds">${esc(kindsText(a.stays))}</td>`
          + `<td class="num ch-beach" data-label="Beachfront">${beach(a.stays) ? `<b>${beach(a.stays)}</b><span class="ch-w"> beachfront</span>` : `<span class="faint">0<span class="ch-w"> beachfront</span></span>`}</td>`
          + (airportCol ? `<td class="ch-air" data-label="Nearest airport">${ap ? `<span class="ch-code">${esc(ap.t.code || "")}</span> ${esc(miles(ap.d))}` : c.unk("No center listed")}</td>` : "")
          + `</tr>`;
      }).join("");
      const tot = [h.plural(r.stays.length, "place to stay", "places to stay"), h.plural(as.length, "area"), `${beach(r.stays)} beachfront`, closedN(r.stays) ? `${closedN(r.stays)} temporarily closed` : ""].filter(Boolean).join(" · ");
      return `<div class="choose-sheet" data-sheet="${r.id}">
<h3 class="choose-h">${h.bullet(r.id, "lg")}<span><span class="choose-n label">Sheet ${r.n} · ${esc(r.code)}</span>${esc(r.name)}</span></h3>
<p class="choose-tot">${esc(tot)}</p>
<div class="table-wrap"><table class="data choose-table"><caption class="sr-only">Places to stay in ${esc(r.name)}, by area</caption><thead><tr><th scope="col">Area</th><th scope="col" class="num">Stays</th><th scope="col">Kinds</th><th scope="col" class="num">Beachfront</th>${airportCol ? `<th scope="col">Nearest airport</th>` : ""}</tr></thead><tbody>${rows}</tbody></table></div>
${none.length ? `<p class="choose-none faint">No place to stay listed in ${esc(h.listJoin(none.map((a) => a.name)))}.</p>` : ""}
</div>`;
    };
    const legend = airports.length ? `<p class="choose-legend">${airports.map((t) => `<span><b>${esc(t.code || "")}</b> ${esc(t.name)}</span>`).join("")}</p>` : "";
    return `<section class="section" id="choose" aria-labelledby="choose-h">
<div class="sec-head oxford"><p class="sec-kicker label">${c.secNum(4)}Stay · ${h.plural(regionsWith.length, "sheet")} · ${h.plural(regionsWith.reduce((n, r) => n + areasOf(r).length, 0), "area")}</p><h2 id="choose-h">Choosing an area</h2></div>
<p class="choose-intro">Every count comes from the records in this guide. <b>Beachfront</b> counts only properties whose sources say so. <b>Nearest airport</b> is the straight-line distance from the area's center, an estimate: the drive is longer. Select a count to see those places to stay.</p>
${legend}
<div class="choose-grid">${regionsWith.map(sheet).join("\n")}</div>
</section>`;
  }

  function listSection(root) {
    const regionOpts = regionsWith.map((r) => [r.id, `${r.name} (${r.stays.length})`]);
    const areaGroups = regionsWith.map((r) => ({ label: r.name, options: areasOf(r).map((a) => [a.id, `${a.name} (${a.stays.length})`]) }));
    const kindOpts = byKind(stays).map(([k, n]) => [k, `${STAY_KIND_PLURAL[k] || STAY_KIND_LABEL[k]} (${n})`]);
    const views = `<span class="view-toggle" role="group" aria-label="View"><button type="button" data-view="list" aria-pressed="true">${h.icon("list")}List</button><button type="button" data-view="map" aria-pressed="false">${h.icon("map")}Map</button></span>`;
    const feats = `<div class="stay-feats js-only" role="group" aria-label="Features: show places that state all the ones you select"><p class="stay-feats-l label">Has all of</p><div class="chip-row">${featTop.map(featChip).join("")}</div>${featRest.length ? `<details class="stay-feats-more"><summary>${h.icon("plus")}<span>More features (${featRest.length})</span></summary><div class="chip-row">${featRest.map(featChip).join("")}</div></details>` : ""}</div>`;
    const group = (r) => `<section class="stay-sheet" id="st-${r.id}" data-sheet="${r.id}" data-filter-group aria-labelledby="st-${r.id}-h">
<h3 class="stay-sheet-h oxford" id="st-${r.id}-h">${h.bullet(r.id, "lg")}<span><span class="label">Sheet ${r.n} · ${esc(r.code)} · ${h.plural(r.stays.length, "place to stay", "places to stay")}</span>${esc(r.name)}</span></h3>
${areasOf(r).map((a) => `<div class="stay-area" id="area-${attr(a.id)}" data-filter-group>
<h4 class="stay-area-h"><a href="${root}areas/${attr(a.id)}.html">${esc(a.name)}</a><span class="faint">${h.plural(a.stays.length, "place to stay", "places to stay")}</span></h4>
<div class="grid stay-grid">${sortStays(a.stays).map((s) => cards.stayCard(root, s, { anchor: true, headingLevel: 5, plate: false, symbol: true, facts: true, note: true, features: 6, here: a.id })).join("")}</div>
</div>`).join("\n")}
</section>`;
    const meta = cards.meta;
    const offMap = stays.filter((s) => cards.where(s) !== "on").length;
    return `<section class="section stay-list-sec" id="list" aria-labelledby="list-h" data-filter-root>
<div class="sec-head oxford"><p class="sec-kicker label">${h.icon("anchor")}${h.plural(stays.length, "place to stay", "places to stay")} · A to Z by area</p><h2 id="list-h">Every place to stay</h2></div>
${K.toolbar({
  search: { label: "Search places to stay", placeholder: "Search by name, brand, town or feature" },
  selects: [
    K.select({ name: "r", label: "Sheet", all: "All sheets", options: regionOpts }),
    K.select({ name: "a", label: "Area", all: "All areas", groups: areaGroups }),
    K.select({ name: "k", label: "Kind", all: "All kinds", options: kindOpts }),
  ],
  views: meta ? views : "",
})}
${feats}
${K.countLine(stays.length, "places to stay")}
<div class="stay-panes">
<div class="stay-list" data-view-pane="list" data-filter-list="manual" data-stay-list>
${regionsWith.map(group).join("\n")}
</div>
${meta ? `<div class="stay-map-pane js-only" data-view-pane="map" hidden>
<div class="map-box stay-map" data-stay-map data-src="stay-map.json">
<div class="map-bar"><p class="label">${h.icon("anchor")}Places to stay on the chart</p><p class="map-bar-acts faint" data-map-count></p></div>
<div class="map-view" data-map-view></div>
<div class="map-legend"><span><i class="lg-stay"></i>A place to stay</span><span><i class="lg-cluster"></i>Several: select to zoom in</span><span class="map-attrib-t">${esc(db.map.attribution || "")}</span></div>
</div>
<p class="stay-map-off" data-map-off${offMap ? "" : " hidden"}>${offMap ? `${h.plural(offMap, "place to stay is", "places to stay are")} not on this chart (outside its area, or no coordinates listed). The list shows them.` : ""}</p>
<p class="stay-map-more"><a href="${root}map.html?layers=stays">${h.icon("map")}Places to stay on the full map, with what's on and things to do</a></p>
</div>` : ""}
</div>
${K.empty("places to stay")}
</section>`;
  }

  const listPage = {
    path: "stay.html", nav: "stay", title: "Where to stay", features: ["stay"],
    description: `${h.plural(stays.length, "place", "places")} to stay across Tampa Bay: hotels, resorts, motels, inns and campgrounds by area, with the features their sources state and what is closed after the 2024 hurricanes.`,
    toc: [...(notOpen.length || openNoted.length ? [["closures", "Closures and notes"]] : []), ["choose", "Choosing an area"], ["list", "Every place to stay"], ...regionsWith.map((r) => [`st-${r.id}`, r.name])],
    body: (root) => `${c.pageHead({ num: 4, kicker: `Stay · ${h.plural(stays.length, "place to stay", "places to stay")}`, title: "Where to stay", lede: "Hotels, resorts, motels, inns, bed-and-breakfasts and campgrounds on every sheet of the chart, with the features their sources state and what is closed for now." })}
<p class="stay-jump">${[...(notOpen.length ? [`<a href="#closures">${h.icon("warn")}${h.plural(notOpen.length, "is", "are")} closed or not open yet</a>`] : []), `<a href="#choose">${h.icon("compass")}Choosing an area</a>`, `<a href="#list">${h.icon("list")}The list of all ${stays.length}</a>`].join("")}</p>
${closures(root)}
${chooseArea(root)}
${listSection(root)}
<p class="source-line">${h.icon("info")}<span>Every card links its own page, and every page names its sources. Most listings were read on the properties' own sites and the tourism offices' listings. ${esc(K.checked(stays))}.</span></p>`,
  };

  /* ================= stays/<id>.html ================= */
  const EAT = new Set(vocab.EAT_DRINK_KINDS);
  const isEat = (p) => p.kindsAll.some((k) => EAT.has(k));
  // a campground is often placed at its park's own point: "same position", never "0 m, about 0 min walk"
  const SAME = 25;
  const walkNote = (d, a, b) => (d < SAME ? "same position in this guide" : `${cards.distLabel(d)}, about ${walkMinutes(a, b)} min walk`);
  const farNote = (d) => (d < SAME ? "same position in this guide" : `${cards.distLabel(d)} away`);
  /** Places and experiences within m meters of a stay, nearest first. (db.nearby skips points under 0.5 m away, meant
      for a record's own point; a stay is never a place, so here a park at the very same point must count.) */
  function nearOf(ll, m) {
    const here = P(ll), out = [];
    for (const [kind, arr] of [["place", db.places], ["experience", db.experiences]]) for (const r of arr) if (r.ll) { const d = haversine(here, P(r.ll)); if (d <= m) out.push({ kind, rec: r, d }); }
    return h.sortBy(out, (x) => x.d, (x) => K.sortName(x.rec.name));
  }

  /** One row per event within `m` meters of a point (every listed day in data-days; a long run by data-run). */
  function nearEvents(ll, m = 2000) {
    const here = P(ll);
    return h.sortBy(db.events.filter((e) => e.live && e.ll && e.instances.length).map((e) => ({ e, d: haversine(here, P(e.ll)) })).filter((x) => x.d <= m), (x) => x.e.first, (x) => x.e.title.toLowerCase());
  }
  function eventRowNear(root, { e, d }) {
    const ins = e.instances, first = ins[0], last = ins[ins.length - 1];
    const run = first.run ? first : null;
    const days = run ? [first.date] : [...new Set(ins.map((x) => x.day))];
    const timed = !run && ins.length === 1 && first.start && !first.timeUnknown && !first.allDay;
    const when = run ? h.fmtThrough(run.through, run.date)
      : days.length > 1 ? `${h.fmtDateRange(days[0], days[days.length - 1])}${e.occurrences ? " (selected days)" : ""}`
      : `${h.fmtDay(first.day)}${timed ? ` · ${first.end && !first.endUnknown ? h.fmtRange(first.start, first.end) : h.fmtTime(first.start)}` : first.allDay ? " · all day" : e.time_text ? ` · ${e.time_text}` : " · time not listed"}`;
    const where = e.venue ? e.venue.name : e.location_text || "";
    const [y, mo, dd] = (run ? run.date : days[0]).split("-");
    const dt = new Date(Date.UTC(+y, +mo - 1, +dd));
    const dw = dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }), mon = dt.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    return `<li class="nx-row" data-days="${days.join(" ")}"${run ? ` data-run="${run.through}"` : ""}${e.region ? ` data-sheet="${e.region}"` : ""}><a href="${root}whats-on.html?e=${attr(e.id)}#e-${attr(e.id)}" data-open-event="${attr(e.id)}">`
      + `<span class="datebox nx-date" aria-hidden="true"><span class="dw">${esc(dw)}</span><span class="d">${Number(dd)}</span><span class="mo">${esc(mon)}</span></span>`
      + `<span class="nx-body"><span class="t">${esc(e.title)}</span><span class="w">${esc([when, where].filter(Boolean).join(" · "))}</span><span class="w nx-d">${esc(cards.distLabel(d))} away</span>${e.status !== "scheduled" ? c.eventStatusBadge(e) : ""}</span></a></li>`;
  }
  function nearEventsBlock(root, s) {
    if (!s.ll) return "";
    const list = nearEvents(s.ll);
    const w = db.window;
    const head = `<div class="sec-head oxford"><p class="sec-kicker label">${h.icon("flag")}Within 2 km (1.2 mi) in a straight line, an estimate</p><h2 id="near-events-h">What's on nearby <span class="nx-when" data-near-when>this season, ${esc(h.fmtDate(w.start))} to ${esc(h.fmtDateY(w.end))}</span></h2></div>`;
    if (!list.length) return `<section class="section" id="near-events" aria-labelledby="near-events-h">${head}<p class="unk">No event in this guide is listed within 2 km of ${esc(s.name)}.</p><p class="nx-all"><a href="${root}whats-on.html?a=${attr(s.area)}">${h.icon("calendar")}What's on in ${esc(db.byId.area.get(s.area)?.name || "the area")}</a></p></section>`;
    const FIRST = 8;
    const rows = list.map((x) => eventRowNear(root, x));
    return `<section class="section" id="near-events" aria-labelledby="near-events-h" data-near-events data-n="${list.length}" data-window-end="${attr(w.end)}">${head}
<p class="nx-count"><span data-near-n>${h.plural(list.length, "event")} listed this season</span>. Select one for its dates, times and source.</p>
<ol class="nx-list" data-near-list>${rows.slice(0, FIRST).join("")}</ol>
${rows.length > FIRST ? `<details class="nx-more" data-near-more><summary>${h.icon("chev-d")}<span data-near-more-l>${h.plural(rows.length - FIRST, "more event")}</span></summary><ol class="nx-list">${rows.slice(FIRST).join("")}</ol></details>` : ""}
<p class="nx-empty unk" data-near-empty hidden>Nothing in this guide is listed within 2 km in the next 30 days.</p>
<p class="nx-all"><a href="${root}whats-on.html?a=${attr(s.area)}">${h.icon("calendar")}Everything on in ${esc(db.byId.area.get(s.area)?.name || "the area")}</a></p>
</section>`;
  }

  function nearbyBlocks(root, s) {
    if (!s.ll) return "";
    const here = P(s.ll);
    const near = nearOf(s.ll, 1200);
    const places = near.filter((x) => x.kind === "place" && x.rec.status !== "closed");
    const todo = places.filter((x) => !isEat(x.rec)).slice(0, 8), eat = places.filter((x) => isEat(x.rec)).slice(0, 6);
    const exps = near.filter((x) => x.kind === "experience").slice(0, 5);
    const note = (x) => walkNote(x.d, here, P(x.rec.ll));
    const blk = (id, title, icon, rowsHtml, n) => (n ? `<div class="near-col" id="${id}"><h3 class="sub-h">${h.icon(icon)}${esc(title)}</h3><ul class="rows">${rowsHtml}</ul></div>` : "");
    const cols = [
      blk("near-todo", "Things to do", "compass", todo.map((x) => cards.placeRow(root, x.rec, { note: note(x) })).join(""), todo.length),
      blk("near-eat", "Eat and drink", "fork-knife", eat.map((x) => cards.placeRow(root, x.rec, { note: note(x) })).join(""), eat.length),
      blk("near-exp", "Tours and trips that start here", "daymark", exps.map((x) => cards.experienceRow(root, x.rec, { note: note(x) })).join(""), exps.length),
    ].filter(Boolean);
    const head = `<div class="sec-head oxford"><p class="sec-kicker label">${h.icon("walk")}Within 1.2 km in a straight line · walking times are estimates</p><h2 id="nearby-h">Within walking distance</h2></div>`;
    if (!cols.length) {
      // nothing within walking distance (a campground in a park, a motel on a highway): the nearest places instead, by straight line
      const far = nearOf(s.ll, 16000).filter((x) => x.kind === "experience" || x.rec.status !== "closed").slice(0, 5);
      const rows = far.map((x) => (x.kind === "place" ? cards.placeRow(root, x.rec, { note: farNote(x.d) }) : cards.experienceRow(root, x.rec, { note: farNote(x.d) }))).join("");
      return `<section class="section" id="nearby" aria-labelledby="nearby-h">${head}<p class="unk">No place in this guide is listed within 1.2 km.</p>${far.length ? `<h3 class="sub-h near-far-h">${h.icon("compass")}The nearest places in this guide</h3><ul class="rows near-far">${rows}</ul><p class="faint near-note">Straight-line distances, an estimate: too far to walk; the drive is longer.</p>` : ""}</section>`;
    }
    return `<section class="section" id="nearby" aria-labelledby="nearby-h">${head}<div class="near-cols">${cols.join("")}</div><p class="faint near-note">Walking time: the straight-line distance × 1.3, at 80 m a minute. Real routes can be longer (bridges, causeways, busy roads).</p></section>`;
  }

  /** A stay with no coordinates has no "nearby": point to its area instead (only lists that hold something). */
  function aroundArea(root, s) {
    if (s.ll) return "";
    const a = db.byId.area.get(s.area);
    const evN = (db.eventsByArea.get(s.area) || []).length;
    const eatN = db.places.filter((p) => p.area === s.area && isEat(p)).length;
    const links = [
      `<a href="${root}areas/${attr(a.id)}.html">${h.icon("compass")}${esc(a.name)}: the area's page</a>`,
      evN ? `<a href="${root}whats-on.html?a=${attr(a.id)}">${h.icon("calendar")}What's on in ${esc(a.name)} (${evN})</a>` : "",
      eatN ? `<a href="${root}eat-drink.html?a=${attr(a.id)}#ea-${attr(a.id)}">${h.icon("fork-knife")}Eat and drink in ${esc(a.name)} (${eatN})</a>` : "",
    ].filter(Boolean);
    return `<section class="section" id="around" aria-labelledby="around-h"><div class="sec-head oxford"><p class="sec-kicker label">${h.icon("pin")}No position listed, so no distances</p><h2 id="around-h">Around ${esc(a.name)}</h2></div>
<ul class="stay-around">${links.map((l) => `<li>${l}</li>`).join("")}</ul></section>`;
  }

  function moreStays(root, s) {
    const a = db.byId.area.get(s.area);
    const others = a.stays.filter((o) => o !== s);
    if (!others.length) return "";
    const withD = h.sortBy(others.map((o) => ({ o, d: s.ll && o.ll ? haversine(P(s.ll), P(o.ll)) : null })), (x) => (x.d == null ? 1e12 : x.d), (x) => K.sortName(x.o.name)).slice(0, 6);
    const byDist = withD.some((x) => x.d != null);
    const kick = [a.name, h.plural(a.stays.length, "place to stay", "places to stay"), byDist ? "nearest first, in a straight line" : "A to Z"].join(" · ");
    return `<section class="section" id="more-stays" aria-labelledby="more-stays-h"><div class="sec-head oxford"><p class="sec-kicker label">${h.icon("anchor")}${esc(kick)}</p><h2 id="more-stays-h">Other places to stay in ${esc(a.name)}</h2>${K.filterLink(root, "stay.html", { a: a.id }, `All ${a.stays.length} in ${esc(a.name)}${h.icon("arrow-r")}`, "more", `area-${a.id}`)}</div>
<ul class="rows">${withD.map(({ o, d }) => cards.stayRow(root, o, { note: d != null ? farNote(d) : "" })).join("")}</ul></section>`;
  }

  function timelineBlock(root, s) {
    if (!s.timeline.length) return "";
    return `<section class="section" id="on-the-timeline" aria-labelledby="tl-h"><div class="sec-head oxford"><p class="sec-kicker label">${h.icon("landmark")}History & heritage</p><h2 id="tl-h">On the timeline</h2></div>
<ul class="rows stay-tl">${h.sortBy(s.timeline, (t) => t.year, (t) => t.date || "").map((t) => {
      // the year as the big numeral; a full date or a month, when the entry has one, in words on the line below the title
      const d = t.date || "", when = /^\d{4}-\d{2}-\d{2}$/.test(d) ? h.fmtDateY(d) : /^\d{4}-\d{2}$/.test(d) ? h.fmtMonth(d) : "";
      return `<li class="row"><a href="${root}history.html#tl-${attr(t.id)}"><span class="stay-tl-y">${esc(String(t.year ?? d.slice(0, 4)))}</span><span><span class="t">${esc(t.title)}</span>${when ? `<span class="w stay-tl-d">${esc(when)}</span>` : ""}<span class="w">${esc(t.text)}</span></span></a></li>`;
    }).join("")}</ul></section>`;
  }

  function facts(root, s) {
    const area = db.byId.area.get(s.area);
    const ap = s.ll ? nearestAirport(s.ll[0], s.ll[1]) : null;
    const addr = s.address ? esc([s.address, s.city, [s.state, s.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")) : c.unk("Address not listed");
    return c.facts(root, [
      ["Kind", esc(STAY_KIND_LABEL[s.kind] || s.kind)],
      ["Where", `<a href="${root}areas/${attr(s.area)}.html">${esc(area?.name || "")}</a><a class="fact-sheet" href="${root}${ctx.nav.regionHref(s.region)}">${c.sheetBadge(s.region, { short: false })}<span class="sr-only"> (the sheet's page)</span></a>`],
      ["Address", addr],
      ["Phone", s.phone ? `<a href="tel:${attr(s.phone.replace(/[^\d+]/g, ""))}">${esc(s.phone)}</a>` : c.unk("Phone not listed")],
      ["Website", s.url ? h.extLink(s.url, esc(h.hostOf(s.url))) : c.unk("Website not listed")],
      ["Brand", s.brand ? esc(s.brand) : c.unk("Brand not listed")],
      ["Collection", s.collection ? esc(s.collection) : ""],
      ["Rooms", Number.isInteger(s.rooms) ? `<span class="big">${esc(s.rooms.toLocaleString("en-US"))}</span>` : c.unk("Room count not listed")],
      ["Opened", s.opened ? `<span class="big">${esc(s.opened)}</span>` : c.unk("Year opened not listed")],
      ["Features", (s.features || []).length ? `<ul class="feat-list">${s.features.map((f) => `<li>${esc(FEATURE_LABEL[f] || f)}</li>`).join("")}</ul><span class="fact-note">As its sources state</span>` : c.unk("Features not listed")],
      ["Nearest airport", ap ? `${esc(ap.t.name)}${ap.t.code ? ` (${esc(ap.t.code)})` : ""}: ${esc(miles(ap.d))}<span class="fact-note">Straight line, an estimate</span>` : ""],
      ["Status", s.status === "open" ? "Open" : c.statusBadge(s)],
    ], { label: `${s.name} at a glance` });
  }

  function mapAside(root, s) {
    const dir = cards.directionsTo(s);
    const w = cards.where(s);
    const btns = [
      dir && dir.apple ? h.extLink(dir.apple, `${h.icon("route")}Apple Maps`, "btn btn-secondary btn-sm") : "",
      dir ? h.extLink(dir.google, `${h.icon("route")}Google Maps`, "btn btn-secondary btn-sm") : "",
      w === "on" ? `<a class="btn btn-secondary btn-sm" href="${root}map.html?focus=stay:${attr(s.id)}">${h.icon("map")}On the map</a>` : "",
    ].filter(Boolean).join("");
    const geo = s.geo_source && GEO_WORDS[s.geo_source] ? `Position from ${GEO_WORDS[s.geo_source]}.` : "";
    const label = `Map: ${s.name}, ${db.byId.area.get(s.area)?.name || ""}`;
    // the bay chart's crop; beyond it the region chart (the whole guide box, as place pages do), else the coordinate line
    const regionMap = s.ll && w === "off" && cards.chartMap ? cards.chartMap(root, [{ lat: s.ll[0], lng: s.ll[1], kind: "stay", sheet: s.region, ic: "anchor" }], { chart: "region", label, minHalfM: 7000, labels: 4 }) : "";
    const map = !s.ll ? cards.miniMap(root, null, null) : regionMap || cards.miniMap(root, s.ll[0], s.ll[1], { sheet: s.region, label, halfWidthM: 1100 });
    return `<section class="stay-where" id="where" aria-labelledby="where-h"><h2 class="sub-h" id="where-h">${h.icon("pin")}Where it is</h2>
<div class="stay-where-map">${map}</div>
<div class="stay-where-t">
${s.address ? `<p class="stay-addr">${esc([s.address, s.city, [s.state, s.zip].filter(Boolean).join(" ")].filter(Boolean).join(", "))}</p>` : `<p>${c.unk("Address not listed")}</p>`}
${btns ? `<p class="btn-row stay-dir">${btns}</p>` : ""}
${w === "off" && s.ll ? `<p class="faint stay-geo">${regionMap ? "Beyond the bay chart: shown on the region chart." : "Outside this guide's chart; the directions links still work."}</p>` : ""}
${!s.ll ? `<p class="faint stay-geo">${s.address ? "The source gives an address but no position, so this place has no buoy on the chart." : "The source gives no address and no position."}</p>` : ""}
${geo ? `<p class="faint stay-geo">${esc(geo)}</p>` : ""}
</div>
</section>`;
  }

  const statusCallout = (s) => {
    if (s.status !== "open") return c.callout("warn", `<p><b>${esc(STATUS_LABEL[s.status] || s.status)}.</b> ${s.status_note ? esc(s.status_note) : "The source gives no detail."}</p><p class="faint">${esc(K.checked([s]))}. Check with the property before you book.</p>`, { flag: STATUS_LABEL[s.status] || "Check before you go" });
    if (s.status_note) return c.callout("", `<p>${esc(s.status_note)}</p><p class="faint">${esc(K.checked([s]))}.</p>`, { flag: "Open, with a note" });
    return "";
  };

  const tripBtn = (s) => `<button class="btn btn-house trip-btn" type="button" data-star="${attr(s.id)}" data-star-kind="s" aria-pressed="false" aria-label="Add “${attr(s.name)}” to My Trip">${h.icon("star")}<span class="tb-off">Add to My Trip</span><span class="tb-on">In My Trip</span></button>`;

  const detail = stays.map((s) => {
    const area = db.byId.area.get(s.area), region = db.byId.region.get(s.region);
    const by = builtYear(s);
    const toc = [["glance", "At a glance"], ["where", "Where it is"], ...(s.heritage ? [["heritage", "History and heritage"]] : []), ...(s.timeline.length ? [["on-the-timeline", "On the timeline"]] : []), ...(s.ll ? [["near-events", "What's on nearby"], ["nearby", "Within walking distance"]] : [["around", `Around ${area.name}`]]), ...(area.stays.length > 1 ? [["more-stays", "Other places to stay"]] : [])];
    return {
      path: `stays/${s.id}.html`, nav: "stay", title: s.name, pagenav: null, features: ["stay"], toc,
      description: s.summary || `${s.name}: ${STAY_KIND_LABEL[s.kind]} in ${area.name}, ${region.name}. Features and the official source.`,
      crumbs: [["Overview", "index.html"], ["Where to stay", "stay.html"], [area.name, `areas/${s.area}.html`], [s.name, null]],
      jsonld: seo.stayLd(s, { url: `${config.siteBase}stays/${s.id}.html` }),
      body: (root) => {
        const pic = img.has("s", s.id) ? img.figure(root, "s", s.id, { cls: "stay-photo" }) : img.plate(root, "s", s, { size: "lg", cls: "stay-plate" });
        const quote = s.quote ? c.callout("org", `<p>“${esc(s.quote)}”</p>`, { cite: `From ${h.extLink(s.quote_source || s.source_url, esc(h.hostOf(s.quote_source || s.source_url)))}`, sheet: s.region }) : "";
        return [
          c.pageHead({
            kicker: `Sheet ${region.n} · ${region.name} · ${STAY_KIND_LABEL[s.kind]}`, sheet: s.region, title: s.name, lede: s.summary || "",
            after: `<p class="head-actions">${tripBtn(s)}${s.status !== "open" ? c.statusBadge(s) : ""}${s.url ? h.extLink(s.url, `${h.icon("ext")}Official site`, "btn btn-secondary") : ""}</p>${[s.brand, s.collection].filter(Boolean).length || by ? `<p class="stay-head-meta label">${esc([[s.brand, s.collection].filter(Boolean).join(" · "), by ? `Built ${by}` : ""].filter(Boolean).join(" · "))}</p>` : ""}`,
          }),
          statusCallout(s),
          `<div class="stay-top">
<div class="stay-main">${pic}${quote}
<section class="stay-glance" id="glance" aria-labelledby="glance-h"><h2 class="sub-h" id="glance-h">${h.icon("anchor")}At a glance</h2>${facts(root, s)}</section></div>
<aside class="stay-side">${mapAside(root, s)}</aside>
</div>`,
          cards.heritageBlock(root, s),
          timelineBlock(root, s),
          nearEventsBlock(root, s),
          nearbyBlocks(root, s),
          aroundArea(root, s),
          moreStays(root, s),
          `<div class="stay-src">${c.recordSource(s)}</div>`,
        ].filter(Boolean).join("\n");
      },
    };
  });
  return [listPage, ...detail];
}

/** The basemap's projection and labels for the stay map (fetched by stay.js only when the Map view opens). */
export function data(ctx) {
  const m = ctx.db.map;
  if (!ctx.db.basemap || !m || !m.bbox || !m.projection) return {};
  return { "assets/data/stay-map.json": { v: 1, map: { bbox: m.bbox, projection: m.projection, labels: (m.labels || []).filter((l) => l.kind === "water" || l.kind === "hood" || l.kind === "state") } } };
}
