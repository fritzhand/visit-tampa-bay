/* ============================================================
   build/pages/places.mjs · OWNER: the Explore lane (explore-and-places)
   places/<id>.html for EVERY place (search entries, cards and maps link there). A place's page sits under the
   Explore page that lists it (placeHome(): Things to do, Beaches & outdoors or Eat & drink): its crumbs and the
   sidebar's current item.
   The page, top to bottom:
     head        the label frame: ribbon "Sheet 1 · Tampa · Aquarium", the name, our summary; the sheet badge, kind,
                 area link, status words, the Signature seal; Add to My Trip; the official site
     top         the rights-cleared photo with its credit, or the plate; "At a glance": address, hours, price, phone,
                 website, accessibility, parking (each "… not listed" when the source gives none), status, good to know
     notes       the status note ("Check before you go") and the official page's own words (quote, attributed)
     heritage    ctx.cards.heritageBlock (built, architect, style, era, designations, story, visiting, sources)
     where       mini map (the basemap crop) or the coordinate line or "Not on the map"; Open in Google / Apple Maps by
                 coordinates; On the map (map.html?focus=place:<id>); where the position comes from
     what's on   the events listed here, next first (live words from the client clock; site/js/features/explore.js hides
                 the ones that have ended), and the yearly events held here
     departures  experiences that leave from here (they open the experience dialog)
     timeline    history entries that name this place (history.html#tl-<id>)
     nearby      places and places to stay within a mile, by straight-line distance (labeled as such)
     more        "Keep exploring": the same kind on its Explore page, things to do / food and drink / events in the
                 same area, each a filtered link whose count is what that page shows for it
     source      source_url, quote_source, also_sources, "Checked Sep 27, 2026", the corrections link
   Detail pages stay light: no inline data, no big lists (events are compact rows, nearby is capped).
   ============================================================ */
import { placeHome } from "../components/place-card.mjs";

const GEO_WORDS = {
  official: "the operator's own map or listing", photon: "an OpenStreetMap feature matched by name", osm: "OpenStreetMap",
  census: "a US Census address match (it can sit a block off)", wikipedia: "Wikipedia", manual: "placed by hand from the source",
};
const VENUE_KINDS = new Set(["performing-arts", "music-venue", "arena-stadium", "sports"]);
/** A source named by its address, "americanvictory.org/hours-and-admission" (several pages of one site stay apart). */
const srcLabel = (u) => { try { const x = new URL(u); const s = x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/$/, ""); return s.length > 56 ? `${s.slice(0, 55)}…` : s; } catch { return u; } };
const NEAR_M = 1609;
/** Kind labels in the plural, for "12 museums on Things to do" (a kind without one reads "… places"). */
const KIND_PLURAL = {
  "theme-park": "theme parks", "water-park": "water parks", zoo: "zoos", aquarium: "aquariums", museum: "museums", gallery: "galleries",
  "science-center": "science centers", "historic-site": "historic sites", "historic-district": "historic districts", landmark: "landmarks",
  "performing-arts": "performing arts venues", "music-venue": "music venues", "arena-stadium": "arenas and stadiums", park: "parks",
  beach: "beaches", "state-park": "state parks", "nature-preserve": "nature preserves", garden: "gardens", trail: "trails", island: "islands",
  pier: "piers", waterfront: "waterfronts", district: "districts", shopping: "shopping places", market: "markets", "food-hall": "food halls",
  restaurant: "restaurants", "cafe-bakery": "cafés and bakeries", bar: "bars", brewery: "breweries", "distillery-winery": "distilleries and wineries",
  nightlife: "nightlife places", casino: "casinos", cemetery: "cemeteries", "house-of-worship": "houses of worship", "visitor-center": "visitor centers",
  attraction: "attractions",
};

export function pages(ctx) {
  return ctx.db.places.map((p) => placePage(ctx, p));
}

function placePage(ctx, p) {
  const { db, c, h, cards, img, seo, config, vocab, nav } = ctx;
  const { esc, attr } = h;
  const region = db.byId.region.get(p.region);
  const area = db.byId.area.get(p.area);
  const parent = placeHome(p);
  const kindLabel = vocab.PLACE_KIND_LABEL[p.kind] || p.kind;
  const events = p.events || [];
  const where = cards.where(p);
  const near = p.ll ? db.nearby(p.ll[0], p.ll[1], NEAR_M, { kinds: ["place"] }).filter((x) => x.rec.open).slice(0, 8) : [];
  const nearStays = p.nearbyStays || [];
  const url = `${config.siteBase}places/${p.id}.html`;
  const more = moreLinks(ctx, p);
  const image = img.has("p", p.id) ? `${config.siteBase}${img.path("p", p.id)}` : undefined;

  const toc = [
    ["glance", "At a glance"],
    p.heritage ? ["heritage", "History and heritage"] : null,
    ["where", "Where it is"],
    events.length || p.series.length || VENUE_KINDS.has(p.kind) ? ["whats-on-here", "What's on here"] : null,
    p.experiences.length ? ["departures", "Tours from here"] : null,
    p.timeline.length ? ["timeline", "In the timeline"] : null,
    near.length || nearStays.length ? ["nearby", "Nearby"] : null,
    more.length ? ["more", "Keep exploring"] : null,
    ["source", "Source"],
  ].filter(Boolean);

  return {
    path: `places/${p.id}.html`, nav: parent, title: p.name,
    description: p.summary ? h.truncate(p.summary, 158) : `${p.name}: ${kindLabel.toLowerCase()} in ${area.name}, ${region.name}. Hours, prices, how to get there and the source.`,
    crumbs: [["Overview", "index.html"], [nav.NAV_LABEL[parent], `${parent}.html`], [p.name, null]],
    pagenav: null, toc: toc.length >= 5 ? toc : undefined,
    features: events.length ? ["explore"] : [],
    jsonld: seo.placeLd(p, { url, image }),
    pageClass: "pl-page",
    body: (root) => [
      head(ctx, root, p, { region, area, kindLabel }),
      top(ctx, root, p),
      notes(ctx, root, p),
      cards.heritageBlock(root, p, { sourceLabel: srcLabel }),
      whereSection(ctx, root, p, where),
      whatsOn(ctx, root, p, events),
      departures(ctx, root, p),
      timeline(ctx, root, p),
      nearby(ctx, root, p, near, nearStays),
      keepExploring(ctx, root, p, more),
      sources(ctx, root, p),
    ].join("\n"),
  };
}

/** A plain section with a caps kicker (sections here are short: no filters, no groups). */
function section(ctx, { id, title, kicker = "", note = "", body }) {
  const { h } = ctx;
  return `<section class="section pl-sec" id="${h.attr(id)}" aria-labelledby="${h.attr(id)}-h">
<div class="sec-head oxford">${kicker ? `<p class="sec-kicker label">${h.esc(kicker)}</p>` : ""}<h2 id="${h.attr(id)}-h">${h.esc(title)}</h2></div>
${note ? `<p class="pl-note">${note}</p>` : ""}${body}
</section>`;
}

function head(ctx, root, p, { region, area, kindLabel }) {
  const { c, h, cards } = ctx;
  const { esc, attr } = h;
  const sym = cards.placeSym(p);
  const star = c.starButton(p.id, p.name, { kind: "p", cls: "pl-star" }).replace("</button>", '<span class="pl-star-l" aria-hidden="true"></span></button>');
  const meta = [
    c.sheetBadge(p.region, { short: false }),
    `<span class="pl-kind">${h.icon(sym, "sym")}${esc(kindLabel)}</span>`,
    `<a class="pl-area" href="${root}areas/${attr(p.area)}.html">${esc(area.name)}</a>`,
  ].map((x) => `<span class="pl-mi">${x}</span>`).join("");
  const state = [p.status !== "open" ? c.statusBadge(p) : "", p.signature ? `<span class="seal">${h.icon("seal")}Signature</span>` : ""].filter(Boolean).join(" ");
  return c.pageHead({
    // "\u00a0·" keeps each separator on the line before it, so the wrapped ribbon never starts a line with a dot
    sheet: p.region, kicker: `Sheet ${region.n}\u00a0· ${region.name}\u00a0· ${kindLabel}`, title: p.name, lede: p.summary || "", cls: "pl-head",
    after: `<p class="pl-meta">${meta}</p>${state ? `<p class="pl-meta pl-state">${state}</p>` : ""}<p class="head-actions">${star}${p.url ? h.extLink(p.url, `${h.icon("ext")}Official site`, "btn btn-secondary") : ""}</p>`,
  });
}

function top(ctx, root, p) {
  const { c, h, img, cards, vocab } = ctx;
  const { esc } = h;
  const unk = (w) => c.unk(`${w} not listed`);
  const addr = p.address ? [p.address, p.city, [p.state, p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";
  const price = p.price_text ? esc(p.price_text) : p.is_free === true ? "Free" : unk("Price");
  const tags = cards.placeTagWords(p);
  const also = (p.kinds || []).filter((k) => k !== p.kind).map((k) => vocab.PLACE_KIND_LABEL[k]);
  // a topic links to its filtered list where the parent page takes one (Things to do ?t=, Eat & drink ?tag=)
  const topicHref = { "things-to-do": (t) => `things-to-do.html?t=${t}`, "eat-drink": (t) => `eat-drink.html?tag=${t}` }[placeHome(p)];
  const topics = (p.topics || []).map((t) => (topicHref ? `<a href="${root}${topicHref(t)}">${esc(vocab.TOPIC_LABEL[t])}</a>` : esc(vocab.TOPIC_LABEL[t])));
  const rows = [
    ["Address", addr ? esc(addr) : unk("Address")],
    ["Hours", p.hours_text ? esc(p.hours_text) : unk("Hours")],
    ["Price", price],
    ["Phone", p.phone ? `<a href="tel:${h.attr(p.phone.replace(/[^\d+]/g, ""))}">${esc(p.phone)}</a>` : unk("Phone")],
    ["Website", p.url ? h.extLink(p.url, esc(h.hostOf(p.url))) : unk("Website")],
    ["Accessibility", p.accessibility ? esc(p.accessibility) : unk("Accessibility")],
    ["Parking", p.parking_text ? esc(p.parking_text) : unk("Parking")],
    ["Status", p.status === "open" ? `Open${p.checked ? ` <span class="faint">(as checked ${esc(h.fmtDateY(p.checked))})</span>` : ""}` : c.statusBadge(p)],
    ["Also listed as", also.length ? esc(also.join(", ")) : ""],
    ["Good to know", tags.length ? esc(tags.join(" · ")) : ""],
    ["Topics", topics.length ? topics.join(", ") : ""],
  ];
  // the photo with its credit (in a <p>, so its links read as text links), or the plate that stands in for one
  const media = img.has("p", p.id) ? `<figure class="photo-fig pl-photo">${img.img(root, "p", p.id, { big: true, lazy: false, sizes: "(min-width: 1000px) 460px, 100vw" })}<figcaption><p class="credit">${img.creditHtml("p", p.id)}</p></figcaption></figure>` : `<div class="pl-plate">${img.plate(root, "p", p, { size: "lg" })}<p class="pl-plate-note">No rights-cleared photo yet: this plate stands in for one.</p></div>`;
  return `<div class="pl-top" id="glance">
<div class="pl-media">${media}</div>
<div class="pl-glance"><h2 class="sub-h" id="glance-h">At a glance</h2>${c.facts(root, rows, { label: `At a glance: ${p.name}` })}</div>
</div>`;
}

function notes(ctx, root, p) {
  const { c, h } = ctx;
  const { esc } = h;
  const out = [];
  if (p.status !== "open" && p.status_note) out.push(c.callout("warn", `<p><b>${esc(ctx.vocab.STATUS_LABEL[p.status] || p.status)}.</b> ${esc(p.status_note)}</p>`, { flag: "Check before you go" }));
  if (p.quote) {
    const src = p.quote_source || p.source_url;
    // the speaker is named only when the quote comes from the place's own site; otherwise the page it was read on
    const own = p.url && h.hostOf(p.url) === h.hostOf(src);
    out.push(c.callout("org", `“${esc(p.quote)}”`, { sheet: p.region, cite: `${own ? `${esc(p.name)}, ` : "From "}${h.extLink(src, esc(h.hostOf(src)))}` }));
  }
  return out.length ? `<div class="pl-notes">${out.join("")}</div>` : "";
}

function whereSection(ctx, root, p, where) {
  const { c, h, cards, db } = ctx;
  const { esc, attr } = h;
  const addr = p.address ? [p.address, p.city, [p.state, p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";
  const area = db.byId.area.get(p.area);
  const region = db.byId.region.get(p.region);
  let map, links = [], note = "", hasMap = false;
  if (p.ll) {
    const [lat, lng] = p.ll;
    // the bay chart's crop; beyond it, the region chart's (the whole guide box), else the coordinate line
    const regionMap = where === "off" && cards.chartMap ? cards.chartMap(root, [{ lat, lng, kind: "place", sheet: p.region, ic: cards.placeSym(p) }], { chart: "region", label: `Map: ${p.name}`, minHalfM: 7000, labels: 4 }) : "";
    // on the bay chart: the chart crop with its own names (streets, water, neighborhoods) around the buoy, so the
    // reader can place it; the plain mini map when the Map lane's chart is not there
    const bayMap = where === "on" && cards.chartMap && cards.charts?.bay ? cards.chartMap(root, [{ lat, lng, kind: "place", sheet: p.region, ic: cards.placeSym(p) }], { chart: "bay", label: `Map: ${p.name}`, minHalfM: 1100, labels: 4 }) : "";
    map = where === "on" ? bayMap || cards.miniMap(root, lat, lng, { sheet: p.region, label: `Map: ${p.name}`, halfWidthM: 1300 }) : regionMap || cards.coordLine(lat, lng);
    hasMap = where === "on" || !!regionMap;
    links.push(h.extLink(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, `${h.icon("pin")}Open in Google Maps`, "btn btn-secondary btn-sm"));
    links.push(h.extLink(`https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(p.name)}`, `${h.icon("pin")}Open in Apple Maps`, "btn btn-secondary btn-sm"));
    if (hasMap) links.push(`<a class="btn btn-ghost btn-sm" href="${root}map.html?focus=place:${attr(p.id)}">${h.icon("map")}On the chart</a>`);
    note = `${where === "off" ? `${regionMap ? "Beyond the bay chart: shown on the region chart. " : `${c.badge("out", "Outside the chart area")} This place is beyond the edge of this guide's basemap. `}` : ""}Position from ${esc(GEO_WORDS[p.geo_source] || "the source")}.`;
  } else {
    map = `<p class="unk mini-map-none">Not on the map: no coordinates listed</p>`;
    if (addr) links.push(h.extLink(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, `${h.icon("pin")}Find the address in Google Maps`, "btn btn-secondary btn-sm"));
    if (ctx.cards.charts?.bay) links.push(`<a class="btn btn-ghost btn-sm" href="${root}map.html?focus=area:${attr(p.area)}">${h.icon("map")}${esc(area.name)} on the chart</a>`);
    note = addr ? "The source gives an address but no position, so this place has no buoy on the chart." : "The source gives no address and no position, so this place has no buoy on the chart; its area is shown instead.";
  }
  return section(ctx, {
    id: "where", title: "Where it is",
    body: `<div class="pl-where${hasMap ? "" : " is-off"}">
<div class="pl-map">${map}</div>
<div class="pl-where-t">
<p class="pl-addr">${addr ? esc(addr) : c.unk("Address not listed")}</p>
<p class="pl-in">In <a href="${root}areas/${attr(p.area)}.html">${esc(area.name)}</a> on <a href="${root}${ctx.nav.regionHref(p.region)}">Sheet ${region.n}, ${esc(region.name)}</a></p>
${links.length ? `<p class="btn-row pl-links">${links.join("")}</p>` : ""}
<p class="pl-geo faint">${note}</p>
</div>
</div>`,
  });
}

/** Events at this place: compact rows, next first. Each row carries the live-state attributes (the core's status
 *  words: Today, Tonight, Now, Started, Ended); features/explore.js hides the rows that have ended. */
function whatsOn(ctx, root, p, events) {
  const { c, h, cards, db, vocab, time } = ctx;
  const { esc, attr } = h;
  if (!events.length && !p.series.length && !VENUE_KINDS.has(p.kind)) return "";
  const row = (e) => {
    const all = e.instances;
    const inst = all[0];
    if (!inst) return "";
    const multi = all.length > 1;
    const instAttr = multi && !inst.timeUnknown ? ` data-inst="${all.map((y) => `${y.s}:${y.e}`).join(",")}"` : "";
    const daysAttr = multi ? ` data-days="${[...new Set(all.map((y) => y.day))].join(" ")}"` : "";
    const d = inst.run ? inst.through : inst.day;
    const dateText = inst.run ? `${h.fmtThrough(inst.through, inst.date)} · from ${h.fmtDay(inst.date)}`
      : e.end_date && e.end_date !== e.date && !e.occurrences ? h.fmtDateRange(e.date, e.end_date)
      : multi ? `${h.fmtDay(inst.day)} and ${h.plural(all.length - 1, "more date")}` : h.fmtDay(inst.day);
    const whenT = inst.run ? "" : cards.whenText(inst);
    const dateBox = `<span class="datebox" aria-hidden="true"><span class="dw">${esc(inst.run ? "Thru" : time.dowShort(d))}</span><span class="d">${esc(String(Number(d.slice(8))))}</span><span class="mo">${esc(time.fmtMonthShort(d.slice(0, 7)))}</span></span>`;
    return `<li class="pl-ev" data-sheet="${e.region || p.region}" data-s="${inst.s}" data-e="${inst.e}"${instAttr}${daysAttr}${inst.run ? ` data-run="${inst.through}"` : ""}${inst.endUnknown ? ' data-end-unknown="1"' : ""}${inst.timeUnknown ? ' data-time-unknown="1"' : ""}${inst.allDay ? ' data-all-day="1"' : ""}>`
      + dateBox
      + `<span class="pl-ev-b"><span class="pl-ev-k label">${esc(vocab.EVENT_KIND_LABEL[e.kind] || e.kind)}${c.eventStatusBadge(e)}<span class="pl-ev-st" data-status></span></span>`
      + `<a class="pl-ev-t stretched" href="${root}whats-on.html?e=${attr(e.id)}#e-${attr(e.id)}" data-open-event="${attr(e.id)}">${esc(e.title)}</a>`
      + `<span class="pl-ev-w">${esc([dateText, whenT].filter(Boolean).join(" · "))}${e.is_free === true ? " · Free" : ""}</span></span>`
      + c.starButton(e.id, e.title, { kind: "e" })
      + `</li>`;
  };
  const series = p.series.length ? `<h3 class="sub-h">Every year here</h3><ul class="rows pl-series">${p.series.map((s) => `<li class="row"><a href="${root}whats-on.html#s-${attr(s.id)}">${h.icon("calendar")}<span><span class="t">${esc(s.name)}</span><span class="w">${esc(s.when_text || "Dates not listed")}</span></span></a></li>`).join("")}</ul>` : "";
  const list = events.length
    ? `<ol class="pl-evs" data-pl-evs data-limit="8">${events.map(row).join("")}</ol><p class="pl-evs-more js-only" hidden><button class="btn btn-secondary btn-sm" type="button" data-pl-evs-all aria-expanded="false">${h.icon("chev-d")}<span>Show all</span></button></p><p class="pl-evs-past" data-pl-evs-past hidden></p><p class="pl-evs-none" data-pl-evs-none hidden>${c.unk("Every event listed here has ended.")}</p>`
    : `<p class="pl-empty">${c.unk(`No events listed here between ${h.fmtDate(db.window.start)} and ${h.fmtDateY(db.window.end)}`)}</p>`;
  return section(ctx, {
    id: "whats-on-here", title: "What's on here",
    kicker: events.length ? `${h.plural(events.length, "event")} listed · next first` : "",
    note: events.length ? `Times are Eastern. Select an event for its details and source, or see <a href="${root}whats-on.html">everything on What's On</a>.` : "",
    body: list + series,
  });
}

function timeline(ctx, root, p) {
  const { h, vocab } = ctx;
  const { esc, attr } = h;
  if (!p.timeline.length) return "";
  const items = h.sortBy(p.timeline, (t) => t.year ?? 0, (t) => t.date || "");
  // dates come as YYYY, YYYY-MM or YYYY-MM-DD
  const when = (t) => (!t.date ? String(t.year) : t.date.length === 10 ? h.fmtDateY(t.date) : t.date.length === 7 ? h.fmtMonth(t.date) : t.date);
  return section(ctx, {
    id: "timeline", title: "In the timeline", kicker: h.plural(items.length, "entry", "entries"),
    body: `<ol class="timeline pl-tl">${items.map((t) => `<li data-sheet="${t.region || p.region}"><p class="tl-year tnum">${esc(when(t))}</p><h3 class="tl-title"><a class="stretched" href="${root}history.html#tl-${attr(t.id)}">${esc(t.title)}</a></h3><p class="tl-text">${esc(t.text)}</p><p class="tl-places">${esc(vocab.ERA_LABEL[t.era] || "")}</p></li>`).join("")}</ol>`,
  });
}

function nearby(ctx, root, p, near, stays) {
  const { h, db, vocab, cards } = ctx;
  const { esc, attr } = h;
  if (!near.length && !stays.length) return "";
  const areaName = (a) => db.byId.area.get(a)?.name || "";
  const row = (href, sym, name, meta, d, badge = "") => `<li class="row pl-near-row"><a href="${href}">${h.icon(sym, "sym")}<span><span class="t">${esc(name)}</span><span class="w">${esc(meta)}</span></span><span class="pl-d"><span class="sr-only">Straight-line distance: </span>${esc(cards.distLabel(d))}</span></a>${badge}</li>`;
  const placeRows = near.map(({ rec: r, d }) => row(`${root}places/${attr(r.id)}.html`, cards.placeSym(r), r.name, [vocab.PLACE_KIND_LABEL[r.kind], r.area !== p.area ? areaName(r.area) : ""].filter(Boolean).join(" · "), d, r.status !== "open" ? ctx.c.statusBadge(r) : "")).join("");
  const stayRows = stays.map(({ rec: s, d }) => row(`${root}stays/${attr(s.id)}.html`, "anchor", s.name, [vocab.STAY_KIND_LABEL[s.kind], s.area !== p.area ? areaName(s.area) : ""].filter(Boolean).join(" · "), d, s.status !== "open" ? ctx.c.statusBadge(s) : "")).join("");
  const col = (title, rowsHtml) => `<div class="pl-near-col"><h3 class="sub-h">${esc(title)}</h3><ul class="rows">${rowsHtml}</ul></div>`;
  return section(ctx, {
    id: "nearby", title: "Nearby",
    note: "Within a mile, nearest first. Distances are straight lines between two points, not walking or driving routes.",
    body: `<div class="pl-near">${placeRows ? col("Places", placeRows) : ""}${stayRows ? col("Places to stay", stayRows) : ""}</div>`,
  });
}

/** "Keep exploring": filtered links to the lists this place belongs to, each with the count that list shows.
 *  Counts follow the pages' own rules (a k= value matches a card's kind, secondary kinds or group, as lib/facets.js
 *  does; Things to do lists placeHome "things-to-do", Beaches & outdoors adds piers and waterfronts, Eat & drink lists
 *  every place with an eat or drink kind). Only links that lead somewhere new are kept. */
function moreLinks(ctx, p) {
  const { db, vocab, h, nav } = ctx;
  const home = placeHome(p);
  const EAT = new Set(vocab.EAT_DRINK_KINDS || []);
  const lists = {
    "things-to-do": db.places.filter((x) => placeHome(x) === "things-to-do"),
    outdoors: db.places.filter((x) => placeHome(x) === "outdoors" || ["pier", "waterfront"].includes(x.kind)),
    "eat-drink": db.places.filter((x) => x.kindsAll.some((k) => EAT.has(k))),
  };
  const area = db.byId.area.get(p.area), region = db.byId.region.get(p.region);
  const out = [];
  // the same kind on its Explore page (a kind that is also a group id, "sports", filters as the group: say so)
  const k = p.kind, isGroup = Object.values(vocab.PLACE_GROUP).includes(k);
  const kn = lists[home].filter((x) => [...x.kindsAll, ...x.groups].includes(k)).length;
  const kWord = isGroup ? (vocab.PLACE_GROUP_LABEL[k] || k).toLowerCase() : KIND_PLURAL[k] || `${(vocab.PLACE_KIND_LABEL[k] || k).toLowerCase()} places`;
  if (kn > 1) out.push({ href: `${home}.html?k=${k}`, n: kn, text: `${kWord} on ${nav.NAV_LABEL[home]}`, ic: "compass" });
  // the area's things to do and food and drink (outdoors.html takes no area filter: its sheet instead)
  const inArea = (l) => l.filter((x) => x.area === p.area && x.id !== p.id).length;
  const tn = inArea(lists["things-to-do"]);
  const tAll = lists["things-to-do"].filter((x) => x.area === p.area).length, eAll = lists["eat-drink"].filter((x) => x.area === p.area).length;
  if (tn) out.push({ href: `things-to-do.html?a=${p.area}`, n: tAll, text: `${tAll === 1 ? "thing" : "things"} to do in ${area.name}`, ic: "compass" });
  const en = inArea(lists["eat-drink"]);
  if (en) out.push({ href: `eat-drink.html?a=${p.area}`, n: eAll, text: `${eAll === 1 ? "place" : "places"} to eat and drink in ${area.name}`, ic: "fork-knife" });
  if (home === "outdoors") {
    const on = lists.outdoors.filter((x) => x.region === p.region).length + db.stays.filter((s) => s.kind === "campground" && s.region === p.region).length;
    if (on > 1) out.push({ href: `outdoors.html?r=${p.region}`, n: on, text: `beaches and outdoor places on Sheet ${region.n}, ${region.name}`, ic: "umbrella" });
  }
  const evn = (db.eventsByArea.get(p.area) || []).length;
  // What's On leaves out events that have ended, so this is the season's listing, not what it shows today
  if (evn) out.push({ href: `whats-on.html?a=${p.area}`, n: evn, text: `${evn === 1 ? "event" : "events"} listed in ${area.name} this season (${h.fmtDate(db.window.start)} to ${h.fmtDateY(db.window.end)})`, ic: "calendar" });
  return out;
}
function keepExploring(ctx, root, p, links) {
  const { h, db } = ctx;
  const { esc, attr } = h;
  if (!links.length) return "";
  const area = db.byId.area.get(p.area);
  return section(ctx, {
    id: "more", title: "Keep exploring",
    note: `Each link opens a filtered list with that count (What's On leaves out events that have already ended). <a href="${root}areas/${attr(p.area)}.html">${esc(area.name)}</a> has its own page with its places, stays, tours and events.`,
    body: `<ul class="rows pl-more">${links.map((l) => `<li class="row"><a href="${root}${attr(l.href)}">${h.icon(l.ic, "sym")}<span class="t"><b class="tnum">${esc(String(l.n))}</b> ${esc(l.text)}</span>${h.icon("arrow-r", "go")}</a></li>`).join("")}</ul>`,
  });
}

/** Experiences that depart here: rows that open the experience dialog (the link lands on its card without JS). */
function departures(ctx, root, p) {
  const { h, vocab, c } = ctx;
  const { esc, attr } = h;
  if (!p.experiences.length) return "";
  const rows = h.sortBy(p.experiences, (x) => x.name.toLowerCase()).map((x) => `<li class="row pl-near-row"><a href="${root}experiences.html?x=${attr(x.id)}#x-${attr(x.id)}" data-open-experience="${attr(x.id)}">${h.icon("daymark", "sym")}<span><span class="t">${esc(x.name)}</span><span class="w">${esc([vocab.EXPERIENCE_KIND_LABEL[x.kind], x.operator].filter(Boolean).join(" · "))}</span></span></a>${x.status !== "open" ? c.statusBadge(x) : ""}</li>`).join("");
  return section(ctx, { id: "departures", title: "Tours that leave from here", kicker: h.plural(p.experiences.length, "departure"), body: `<ul class="rows">${rows}</ul>` });
}

/** The record's sources, each named by its address (several pages on one site stay distinguishable), the date checked. */
function sources(ctx, root, p) {
  const { h } = ctx;
  const { esc } = h;
  const link = (u) => h.extLink(u, esc(srcLabel(u)));
  const also = [...new Set((p.also_sources || []).filter((u) => u !== p.source_url && u !== p.quote_source))];
  const rows = [
    ["Facts", link(p.source_url)],
    p.quote && p.quote_source && p.quote_source !== p.source_url ? ["Quote", link(p.quote_source)] : null,
    also.length ? ["Also read", also.map(link).join('<span class="pl-sep" aria-hidden="true"> · </span>')] : null,
  ].filter(Boolean);
  return `<section class="pl-source" id="source" aria-labelledby="source-h"><h2 class="sub-h" id="source-h">Sources</h2>
<dl class="pl-src">${rows.map(([k, v]) => `<div><dt class="label">${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
<p class="source-line">${h.icon("info")}<span>Source: ${h.extLink(p.source_url, esc(h.hostOf(p.source_url)))}${p.checked ? ` · Checked ${esc(h.fmtDateY(p.checked))}` : ""}</span><span>Hours, prices and rules change: check the official page before you go.</span></p>
<p class="pl-fix">Something wrong or out of date? <a href="${root}about.html#corrections">Tell us how to correct it</a>.</p></section>`;
}
