/* ============================================================
   build/pages/things-to-do.mjs · OWNER: the Explore lane (explore-and-places)
   things-to-do.html: every place whose primary kind is not food or drink and not a beach, park, state park,
   preserve, garden, trail or island (those live on outdoors.html; placeHome() in place-card.mjs decides):
   attractions, museums, galleries, stages, historic sites and districts, landmarks, stadiums, waterfronts,
   piers, districts, shopping, markets, the casino and visitor centers.
     - "Start here": the signature places, sheet by sheet (data: signature: true)
     - one section per kind family (id="f-<family>"), counts computed from data, cards via ctx.cards.placeCard
     - filters (site/js/core/filter.js, wired by attribute): r (sheet chips), k (kind select: families, kinds,
       broad groups), a (area), t (topic), free, q; the List / Map toggle (view) — features/explore.js draws the
       map from the cards' data-ll, collapses long sections and keeps each section's count live
   Without JS: every card is in the page, grouped, and the toolbar is hidden.
   Also exports the list kit outdoors.mjs uses: listTools, mapPane, familySection, sortPlaces.
   ============================================================ */
import { placeHome } from "../components/place-card.mjs";

/** Kind families, in page order. Each place sits in the family of its primary kind. */
export const FAMILIES = [
  { id: "attractions", title: "Theme parks, zoos and aquariums", short: "Attractions", kinds: ["theme-park", "water-park", "zoo", "aquarium", "science-center", "attraction", "casino"] },
  { id: "museums", title: "Museums and galleries", short: "Museums", kinds: ["museum", "gallery"] },
  { id: "stages", title: "Stages and music venues", short: "Stages", kinds: ["performing-arts", "music-venue"] },
  { id: "history", title: "Historic sites and landmarks", short: "History", kinds: ["historic-site", "historic-district", "landmark", "cemetery", "house-of-worship"] },
  { id: "sports", title: "Stadiums and arenas", short: "Sports", kinds: ["arena-stadium", "sports"] },
  { id: "waterfront", title: "Waterfronts and piers", short: "Waterfronts", kinds: ["waterfront", "pier"] },
  { id: "districts", title: "Districts, markets and shopping", short: "Districts", kinds: ["district", "shopping", "market"] },
  { id: "info", title: "Visitor centers", short: "Visitor centers", kinds: ["visitor-center"] },
];

const SECTION_LIMIT = 6;

/** Sheet order, then signature places first, then name (a leading "The" ignored). */
export function sortPlaces(ctx, list) {
  const n = (p) => ctx.vocab.REGIONS[p.region]?.n ?? 9;
  const key = (p) => p.name.toLowerCase().replace(/^the\s+/, "");
  return ctx.h.sortBy(list, n, (p) => (p.signature ? 0 : 1), key);
}

/** The filter toolbar: search + view toggle, sheet chips, selects, free, clear, the live count.
 *  opts = { items, noun, search, selects: [{ name, label, groups: [[label, [[value, label, count]]]] }], free, views } */
export function listTools(ctx, root, { items, noun, search, selects = [], free = false, views = false, moreLabel = "More filters", inline = false }) {
  const { c, h, vocab } = ctx;
  const { esc, attr } = h;
  const sheetN = (r) => items.filter((x) => x.region === r).length;
  const chips = vocab.REGION_IDS.filter((r) => sheetN(r) > 0).map((r) => c.chip(vocab.REGIONS[r].short, null, { sheet: r, pressed: false, count: sheetN(r), attrs: `data-filter-chip="r=${r}"` })).join("");
  const sel = selects.map((s) => `<label class="xp-sel"><span class="xp-sel-l label">${esc(s.label)}</span><select class="select" name="${attr(s.name)}" data-filter="${attr(s.name)}"><option value="">All</option>${s.groups.map(([gl, opts]) => (gl ? `<optgroup label="${attr(gl)}">` : "") + opts.map(([v, l, n]) => `<option value="${attr(v)}">${esc(l)}${n != null ? ` (${n})` : ""}</option>`).join("") + (gl ? "</optgroup>" : "")).join("")}</select></label>`).join("");
  const freeHtml = free ? `<label class="xp-check"><input type="checkbox" data-filter="free"><span class="xp-box" aria-hidden="true">${h.icon("check")}</span><span>Free admission only</span></label>` : "";
  const viewHtml = views ? `<span class="view-toggle" role="group" aria-label="View"><button type="button" data-view="list" aria-pressed="true">${h.icon("list")}List</button><button type="button" data-view="map" aria-pressed="false">${h.icon("map")}Map</button></span>` : "";
  return `<div class="xp-tools js-only">
<div class="xp-row1"><label class="field">${h.icon("search")}<span class="sr-only">${esc(search.label)}</span><input type="search" name="q" placeholder="${attr(search.placeholder)}" autocomplete="off" data-filter-q></label>${viewHtml}</div>
<div class="xp-sheets" role="group" aria-label="Sheet"><span class="xp-sel-l label" aria-hidden="true">Sheet</span><div class="chip-row">${chips}</div></div>
${!(sel || freeHtml) ? "" : inline ? `<div class="xp-more-in xp-inline">${sel}${freeHtml}</div>` : `<details class="xp-more" data-xp-more><summary>${h.icon("sliders")}<span>${esc(moreLabel)}</span>${h.icon("chev-d", "chev")}</summary><div class="xp-more-in">${sel}${freeHtml}</div></details>`}
<div class="xp-status">${c.resultCount(items.length, items.length, noun)}<button class="btn btn-ghost btn-sm" type="button" data-filter-clear hidden>${h.icon("x")}Clear filters</button></div>
</div>`;
}

/** The map pane (List / Map toggle): features/explore.js draws the basemap and a buoy for every visible card with
 *  coordinates. "" without a basemap (the toggle is then left out too). */
export function mapPane(ctx, root, { noun }) {
  const { h, cards } = ctx;
  const charts = cards.charts || {};
  if (!charts.bay) return "";
  const KINDS = ["water", "city", "town", "beach", "island", "bridge", "park"];
  const pack = (ch) => (ch ? {
    bbox: ch.meta.bbox, home: ch.meta.home, k: ch.meta.k, sx: ch.meta.sx, W: ch.meta.W, H: ch.meta.H, mPerUnit: ch.meta.mPerUnit,
    base: `${root}assets/map/${ch.file}#bm`,
    labels: (ch.labels || []).filter((l) => KINDS.includes(l.kind) && typeof l.text === "string" && (l.minZoom || 1) <= 4).map((l) => ({ t: l.text, la: l.lat, ln: l.lng, k: l.kind, z: l.minZoom || 1 })),
  } : null);
  const data = { bay: pack(charts.bay), region: pack(charts.region) };
  return `<div class="xp-map" data-view-pane="map" hidden>
<div class="map-box">
<div class="map-bar"><p class="label" data-xp-map-count>The chart</p><span class="map-bar-acts"><button class="btn btn-ghost btn-sm" type="button" data-xp-fit>${h.icon("fit")}Fit all</button></span></div>
<div class="map-view xp-map-view" data-xp-map-view data-charts="${h.attr(JSON.stringify(data))}" role="region" aria-label="Chart of the ${h.attr(noun)} in the list" tabindex="-1"></div>
<p class="map-legend"><span><i class="lg-buoy" aria-hidden="true"></i>A place (its chart symbol inside)</span><span><i class="lg-station" aria-hidden="true"></i>A cluster: select it to zoom in</span><span class="xp-attr">Basemap: US Census Bureau TIGER/Line (public domain). Place coordinates include data © ${h.extLink("https://www.openstreetmap.org/copyright", "OpenStreetMap contributors")}, ODbL.</span></p>
</div>
<p class="xp-map-note" data-xp-map-off></p>
</div>`;
}

/** One filterable section of cards: <section class="section xp-sec" id data-filter-group> with a live count. */
export function familySection(ctx, root, { id, title, kicker = "", note = "", pre = "", body, n, limit = SECTION_LIMIT, noun = ["place", "places"], cls = "" }) {
  const { h } = ctx;
  const { esc, attr } = h;
  return `<section class="section xp-sec${cls ? " " + cls : ""}" id="${attr(id)}" aria-labelledby="${attr(id)}-h" data-filter-group data-limit="${limit}">
<div class="sec-head oxford">${kicker ? `<p class="sec-kicker label">${kicker}</p>` : ""}<h2 id="${attr(id)}-h">${esc(title)}</h2><p class="xp-count label"><span data-group-count>${n}</span> <span data-one="${attr(noun[0])}" data-many="${attr(noun[1])}">${esc(n === 1 ? noun[0] : noun[1])}</span></p></div>
${note ? `<p class="xp-note">${note}</p>` : ""}${pre}
<div class="grid xp-grid">${body}</div>
<p class="xp-more-row js-only" hidden><button class="btn btn-secondary" type="button" data-xp-all aria-expanded="false">${h.icon("chev-d")}<span>Show all ${n} in ${esc(title.charAt(0).toLowerCase() + title.slice(1))}</span></button></p>
</section>`;
}

/** Select options: [[value, label, count]] for the areas of `items`, one optgroup per sheet. */
export function areaGroups(ctx, items) {
  const { db, vocab } = ctx;
  return vocab.REGION_IDS.map((r) => {
    const opts = db.areas.filter((a) => a.region === r).map((a) => [a.id, a.name, items.filter((p) => p.area === a.id).length]).filter(([, , n]) => n > 0);
    return [`Sheet ${vocab.REGIONS[r].n} · ${vocab.REGIONS[r].name}`, opts];
  }).filter(([, o]) => o.length);
}
/** Select options for the topics of `items` (most used first). */
export function topicGroups(ctx, items) {
  const { vocab, h } = ctx;
  const opts = vocab.TOPICS.map((t) => [t, vocab.TOPIC_LABEL[t], items.filter((p) => (p.topics || []).includes(t)).length]).filter(([, , n]) => n > 0);
  return [["", h.sortBy(opts, ([, , n]) => -n, ([, l]) => l)]];
}

export function pages(ctx) {
  const { db, c, h, cards, vocab } = ctx;
  const { esc, attr } = h;
  const items = db.places.filter((p) => placeHome(p) === "things-to-do");
  const fams = FAMILIES.map((f) => ({ ...f, list: sortPlaces(ctx, items.filter((p) => f.kinds.includes(p.kind))) })).filter((f) => f.list.length);
  const placed = new Set(fams.flatMap((f) => f.list));
  const rest = items.filter((p) => !placed.has(p)); // a kind no family names (never, today): shown, never dropped
  if (rest.length) fams.push({ id: "other", title: "Other places", short: "Other", kinds: [...new Set(rest.map((p) => p.kind))], list: sortPlaces(ctx, rest) });
  const sig = sortPlaces(ctx, items.filter((p) => p.signature));
  const free = items.filter((p) => p.is_free === true).length;
  const withHours = items.filter((p) => p.hours_text).length;
  const hasKind = (p, ks) => p.kindsAll.some((k) => ks.includes(k));
  const sheetsN = new Set(items.map((p) => p.region)).size;

  // kind select: one optgroup per family (the family, then its kinds), then the broad groups other pages link to
  const kindGroups = fams.map((f) => {
    const opts = [[f.kinds.join(","), `All ${f.title.charAt(0).toLowerCase() + f.title.slice(1)}`, items.filter((p) => hasKind(p, f.kinds)).length]];
    if (f.kinds.length > 1) for (const k of f.kinds) { const n = items.filter((p) => p.kindsAll.includes(k)).length; if (n) opts.push([k, vocab.PLACE_KIND_LABEL[k], n]); }
    return [f.title, opts];
  });
  const groupIds = [...new Set(items.flatMap((p) => p.groups))].filter((g) => !["eat", "drink"].includes(g));
  kindGroups.push(["Broad groups", groupIds.map((g) => [g, vocab.PLACE_GROUP_LABEL[g], items.filter((p) => p.groups.includes(g)).length])]);

  const cardOpts = { sym: true, foot: true, seal: true };
  const startHtml = (root) => {
    if (!sig.length) return "";
    const bySheet = vocab.REGION_IDS.map((r) => [r, sig.filter((p) => p.region === r)]).filter(([, l]) => l.length);
    return `<section class="section xp-start" id="start" aria-labelledby="start-h">
<div class="sec-head oxford"><p class="sec-kicker label">${h.icon("seal")}${esc(`${sig.length} signature places`)}</p><h2 id="start-h">Start here</h2></div>
<p class="xp-note">The region's defining places, as this guide marks them, sheet by sheet. Each links to its page with hours, prices and the source.</p>
<div class="xp-start-grid">${bySheet.map(([r, l]) => `<div class="xp-start-row" data-sheet="${r}"><a class="xp-start-sheet" href="${root}${ctx.nav.regionHref(r)}">${h.bullet(r, "lg")}<span><span class="label">Sheet ${vocab.REGIONS[r].n}</span><b>${esc(vocab.REGIONS[r].name)}</b></span></a><ul class="xp-start-list">${l.map((p) => `<li><a href="${root}places/${attr(p.id)}.html"><span class="t">${esc(p.name)}</span><span class="w">${esc(vocab.PLACE_KIND_LABEL[p.kind])} · ${esc(db.byId.area.get(p.area)?.name || "")}</span></a></li>`).join("")}</ul></div>`).join("")}</div>
</section>`;
  };

  const toc = [["start", "Start here"], ...fams.map((f) => [`f-${f.id}`, f.title])].filter(([id]) => id !== "start" || sig.length);
  const page = {
    path: "things-to-do.html", nav: "things-to-do", title: "Things to do", features: ["explore"],
    description: `${items.length} things to do around Tampa Bay: attractions, museums, stages, historic sites, stadiums, waterfronts, districts and markets, each linked to its source.`,
    toc,
    body: (root) => `${c.pageHead({
      num: 3, kicker: `Explore · ${h.plural(items.length, "place")}`, title: "Things to do", cls: "xp-head",
      lede: `Attractions, museums, stages, historic sites, stadiums, waterfronts, districts and markets across ${sheetsN === 6 ? "the six sheets" : h.plural(sheetsN, "sheet")}. Every card links to a page with what its source lists: hours, prices, how to get there.`,
      chips: fams.map((f) => c.chip(f.short, `#f-${f.id}`, { count: f.list.length })).join(""),
    })}
<p class="xp-facts">${h.plural(items.length, "place")} · ${esc(String(withHours))} with hours listed · ${esc(String(free))} listed as free · beaches and parks are on <a href="${root}outdoors.html">Beaches &amp; outdoors</a>, restaurants and bars on <a href="${root}eat-drink.html">Eat &amp; drink</a></p>
${startHtml(root)}
<div class="xp-root" data-filter-root>
${listTools(ctx, root, {
  items, noun: "places", views: !!(cards.charts && cards.charts.bay), free: true,
  search: { label: "Search things to do", placeholder: "Search: name, kind, area, topic…" },
  selects: [
    { name: "k", label: "Kind", groups: kindGroups },
    { name: "a", label: "Area", groups: areaGroups(ctx, items) },
    { name: "t", label: "Topic", groups: topicGroups(ctx, items) },
  ],
})}
<div class="xp-list" data-filter-list data-filter-items=".card" data-view-pane="list">
${fams.map((f) => familySection(ctx, root, {
  id: `f-${f.id}`, title: f.title, n: f.list.length,
  kicker: esc(h.listJoin(f.kinds.filter((k) => f.list.some((p) => p.kind === k)).map((k) => vocab.PLACE_KIND_LABEL[k].toLowerCase())).replace(/^./, (m) => m.toUpperCase())),
  body: f.list.map((p) => cards.placeCard(root, p, cardOpts)).join(""),
})).join("\n")}
</div>
${mapPane(ctx, root, { noun: "places" })}
<div data-filter-empty hidden>${c.emptyState({ title: "No places match these filters", body: "Clear a filter, pick another sheet or search for something else.", glyph: "compass", action: `<button class="btn btn-secondary" type="button" data-filter-clear>${h.icon("x")}Clear filters</button>` })}</div>
</div>
<p class="source-line xp-src">${h.icon("info")}<span>Every place carries its own source on its card and page. Hours and prices are the places' own words as of the date checked: they change, so check before you go.</span></p>`,
  };
  return [page];
}
