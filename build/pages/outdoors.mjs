/* ============================================================
   build/pages/outdoors.mjs · OWNER: the Explore lane (explore-and-places)
   outdoors.html (Beaches & outdoors): every place whose primary kind is a beach, park, state park, nature preserve,
   garden, trail or island (placeHome() in place-card.mjs), plus the piers and waterfront walks (also on Things to
   do), plus the campgrounds (stays of kind campground, linking stays/<id>.html).
     - "Before you swim": the beach-safety FAQs (flags, rip currents, red tide) in their own words, linked to
       faq.html#fq-<id>
     - beaches in three runs: Gulf beaches north to south (by latitude, numbered, with a chart of the coast whose
       buoys carry the same numbers), bay beaches, day-trip beaches; research tags as words ("Dog beach")
     - then springs, state parks and preserves, parks, trails, islands, gardens, piers and waterfronts, campgrounds
   Each place is in one section only (the first that fits, in that order). Filters: r (sheet chips), k (kind), q.
   Which beaches face the Gulf is read from the area (GULF_AREAS below: the barrier islands, Fort De Soto, Dunedin's
   islands, Tarpon Springs and west Pasco); a research tag "bay-beach" always wins.
   ============================================================ */
import { placeHome } from "../components/place-card.mjs";
import { listTools, familySection, sortPlaces } from "./things-to-do.mjs";
import { project, onMap } from "../../site/js/lib/geo.js";

const GULF_AREAS = new Set(["clearwater-beach", "sand-key", "indian-rocks-beach", "madeira-beach", "treasure-island", "st-pete-beach", "pass-a-grille", "fort-de-soto", "dunedin", "tarpon-springs", "west-pasco"]);
/** The beach-safety FAQs shown in full, then the ones linked (ids in faqs.json; missing ones are skipped). */
const SAFETY_FULL = ["beach-warning-flags", "rip-current-escape", "red-tide-swimming"];
const SAFETY_WORD = { "beach-warning-flags": "Flags", "rip-current-escape": "rip currents", "red-tide-swimming": "red tide" };
const SAFETY_TOPIC = "Beaches & water safety";
const SAFETY_EXTRA = ["lightning-at-the-beach", "dog-beaches-pinellas", "dog-beaches-tampa"];

export function pages(ctx) {
  const { db, c, h, cards, vocab } = ctx;
  const { esc, attr } = h;
  const home = db.places.filter((p) => placeHome(p) === "outdoors");
  const piers = db.places.filter((p) => ["pier", "waterfront"].includes(p.kind));
  const camps = h.sortBy(db.stays.filter((s) => s.kind === "campground"), (s) => vocab.REGIONS[s.region]?.n ?? 9, (s) => s.name.toLowerCase());
  const all = [...home, ...piers];
  const lat = (p) => (p.ll ? -p.ll[0] : 99);

  /* ---------- one section per place, first fit wins ---------- */
  const taken = new Set();
  const take = (pred) => { const l = all.filter((p) => !taken.has(p) && pred(p)); l.forEach((p) => taken.add(p)); return l; };
  const isBeach = (p) => p.kindsAll.includes("beach");
  const dayBeach = take((p) => isBeach(p) && p.region === "daytrips");
  const bayBeach = take((p) => isBeach(p) && ((p.tags || []).includes("bay-beach") || !GULF_AREAS.has(p.area)));
  const gulfBeach = take((p) => isBeach(p));
  const springs = take((p) => (p.tags || []).some((t) => t === "springs" || t === "spring"));
  const byKind = (ks) => take((p) => ks.includes(p.kind));
  const sections = [
    { id: "f-gulf", title: "Gulf beaches, north to south", group: "beaches", list: h.sortBy(gulfBeach, lat), numbered: true,
      note: "Numbered from north to south by latitude. The same numbers run down the chart's margin, each joined to its beach." },
    { id: "f-bay", title: "Bay beaches", group: "beaches", list: h.sortBy(bayBeach, lat), note: "Beaches on Tampa Bay and its inlets, north to south." },
    { id: "f-daytrip", title: "Day-trip beaches", group: "beaches", list: h.sortBy(dayBeach, lat), note: "Beyond the bay, on Sheet 6, north to south." },
    { id: "f-springs", title: "Springs", list: sortPlaces(ctx, springs) },
    { id: "f-state", title: "State parks and preserves", list: sortPlaces(ctx, byKind(["state-park", "nature-preserve"])) },
    { id: "f-parks", title: "Parks", list: sortPlaces(ctx, byKind(["park"])) },
    { id: "f-trails", title: "Trails", list: sortPlaces(ctx, byKind(["trail"])) },
    { id: "f-islands", title: "Islands", list: sortPlaces(ctx, byKind(["island"])) },
    { id: "f-gardens", title: "Gardens", list: sortPlaces(ctx, byKind(["garden"])) },
    { id: "f-piers", title: "Piers and waterfront walks", list: sortPlaces(ctx, byKind(["pier", "waterfront"])), note: "Also on Things to do." },
  ].filter((s) => s.list.length);
  const leftover = all.filter((p) => !taken.has(p)); // cannot happen with today's kinds; never drop a place
  if (leftover.length) sections.push({ id: "f-other", title: "Other outdoor places", list: sortPlaces(ctx, leftover) });
  const beachN = sections.filter((s) => s.group === "beaches").reduce((n, s) => n + s.list.length, 0);

  /* ---------- the kind select (k: a kind, or a comma list of kinds) ---------- */
  const inAll = (ks) => all.filter((p) => p.kindsAll.some((k) => ks.includes(k))).length;
  const kindOpts = [["beach", "Beaches"], ["state-park,nature-preserve", "State parks and preserves"], ["state-park", "State parks"], ["nature-preserve", "Nature preserves"], ["park", "Parks"], ["trail", "Trails"], ["island", "Islands"], ["garden", "Gardens"], ["pier,waterfront", "Piers and waterfronts"]]
    .map(([v, l]) => [v, l, inAll(v.split(","))]).filter(([, , n]) => n > 0);

  const tagLine = (p) => { const w = cards.placeTagWords(p, { max: 5 }); return w.length ? `<p class="xp-tags">${w.map((x) => `<span>${esc(x)}</span>`).join("")}</p>` : ""; };
  const card = (root, p, n, beach) => cards.placeCard(root, p, { sym: true, foot: true, seal: true, plate: beach ? "photo" : true, extra: tagLine(p), lead: n ? `<span class="xp-no" data-n="${n}"><span class="sr-only">Number </span>${n}</span>` : "" });

  /* ---------- the chart of the Gulf beaches: a dot on each beach, its number in the Gulf margin ---------- */
  const gulf = sections.find((s) => s.id === "f-gulf");
  const chart = (root) => (gulf ? coastChart(ctx, root, gulf.list) : "");

  /* ---------- before you swim: the FAQ's own answers ---------- */
  const faq = (id) => db.byId.faq.get(id);
  const full = SAFETY_FULL.map(faq).filter(Boolean);
  const more = [...db.faqs.filter((f) => f.topic === SAFETY_TOPIC && !SAFETY_FULL.includes(f.id)), ...SAFETY_EXTRA.map(faq).filter(Boolean)];
  const safety = (root) => (full.length || more.length ? `<aside class="callout tone-warn xp-safety" id="safety" aria-labelledby="safety-h"><span class="flag label">${h.icon("warn")}Before you swim</span>
<h2 id="safety-h" class="xp-safety-h">${esc(full.length ? h.listJoin(full.map((f) => SAFETY_WORD[f.id])).replace(/^./, (m) => m.toUpperCase()) : "The water")}</h2>
${full.length ? `<div class="xp-safety-grid">${full.map((f) => `<div class="xp-safe"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p><p class="xp-safe-src">Source: ${h.extLink(f.source_url, esc(h.hostOf(f.source_url)))}${f.checked ? ` · Checked ${esc(h.fmtDateY(f.checked))}` : ""} · <a href="${root}faq.html#fq-${attr(f.id)}">In the FAQ</a></p></div>`).join("")}</div>` : ""}
${more.length ? `<details class="xp-safety-more"><summary>${h.icon("help")}<span>${esc(`${more.length} more questions about the water, in the FAQ`)}</span>${h.icon("chev-d", "chev")}</summary><ul class="xp-safety-links">${more.map((f) => `<li><a href="${root}faq.html#fq-${attr(f.id)}">${esc(f.q)}</a></li>`).join("")}</ul></details>` : ""}
</aside>` : "");

  const toc = [["safety", "Before you swim"], ...sections.map((s) => [s.id, s.title]), ...(camps.length ? [["f-camp", "Campgrounds"]] : [])].filter(([id]) => id !== "safety" || full.length || more.length);
  const headChips = [
    ...sections.map((s) => c.chip(s.title.replace(", north to south", ""), `#${s.id}`, { count: s.list.length })),
    ...(camps.length ? [c.chip("Campgrounds", "#f-camp", { count: camps.length })] : []),
  ].join("");

  const page = {
    path: "outdoors.html", nav: "outdoors", title: "Beaches & outdoors", features: ["explore"],
    description: `${beachN} beaches and ${all.length - beachN} parks, preserves, springs, trails, gardens and piers around Tampa Bay, plus ${camps.length} campgrounds, each linked to its source.`,
    toc,
    body: (root) => `${c.pageHead({
      num: 3, kicker: `Explore · ${h.plural(all.length + camps.length, "place")}`, title: "Beaches & outdoors", cls: "xp-head",
      lede: "Gulf and bay beaches, springs, state parks, preserves, parks, trails, gardens, piers and campgrounds. Each card links to a page with what its source lists: hours, fees, rules, how to get there.",
      chips: headChips,
    })}
${safety(root)}
<div class="xp-root" data-filter-root>
${listTools(ctx, root, {
  items: [...all, ...camps], noun: "places",
  search: { label: "Search beaches and parks", placeholder: "Search: name, area, dog beach, kayak…" },
  selects: [{ name: "k", label: "Kind", groups: [["", kindOpts]] }], inline: true,
})}
<div class="xp-list" data-filter-list data-filter-items=".card">
${sections.map((s) => {
  const body = s.list.map((p, i) => card(root, p, s.numbered ? i + 1 : 0, s.group === "beaches")).join("");
  return familySection(ctx, root, { id: s.id, title: s.title, n: s.list.length, note: s.note ? esc(s.note) : "", pre: s.numbered ? chart(root) : "", body, limit: s.numbered ? 999 : 6, cls: [s.numbered ? "xp-gulf" : "", s.group === "beaches" ? "xp-beaches" : ""].filter(Boolean).join(" ") });
}).join("\n")}
${camps.length ? familySection(ctx, root, { id: "f-camp", title: "Campgrounds", n: camps.length, noun: ["campground", "campgrounds"], note: `The ${esc(h.plural(camps.length, "campground"))} listed in <a href="${root}stay.html">Where to stay</a>, sheet by sheet. Each page gives what its source lists and names that source.`, body: camps.map((s) => cards.stayCard(root, s, { features: 3 })).join("") }) : ""}
</div>
<div data-filter-empty hidden>${c.emptyState({ title: "Nothing matches these filters", body: "Clear a filter, pick another sheet or search for something else.", glyph: "compass", action: `<button class="btn btn-secondary" type="button" data-filter-clear>${h.icon("x")}Clear filters</button>` })}</div>
</div>
<p class="source-line xp-src">${h.icon("info")}<span>Every place carries its own source on its card and page. Fees, hours and rules are the operators' own words as of the date checked. Beach conditions change daily: check the flags on the day.</span></p>`,
  };
  return [page];
}

/** The Gulf beaches' chart: a crop of the basemap along the coast, a dot on each beach and its number stacked in the
 *  Gulf margin, joined by a leader line (numbers never overlap however close the beaches are). Static markup; the
 *  lines are an SVG overlay in percent space. "" without a basemap or with fewer than two beaches on it. */
function coastChart(ctx, root, list) {
  const { h, db } = ctx;
  const meta = ctx.map.meta;
  if (!meta) return "";
  const pts = list.map((p, i) => (p.ll && onMap(meta, p.ll[0], p.ll[1]) ? { p, n: i + 1, xy: project(p.ll[0], p.ll[1], meta) } : null)).filter(Boolean);
  if (pts.length < 2) return "";
  const off = list.map((p, i) => ({ p, n: i + 1 })).filter((x) => !pts.some((q) => q.p === x.p));
  const ys = pts.map((q) => q.xy[1]), xs = pts.map((q) => q.xy[0]);
  const padY = 3000 / meta.mPerUnit;
  let y0 = Math.max(0, Math.min(...ys) - padY), y1 = Math.min(meta.H, Math.max(...ys) + padY);
  const hU = y1 - y0, ratio = 0.68, wU = Math.min(meta.W, hU * ratio);
  let x0 = Math.min(Math.max(0, Math.min(...xs) - wU * 0.3), meta.W - wU);
  const pct = (v, a, b) => ((v - a) / b) * 100;
  const dots = pts.map((q) => ({ ...q, x: pct(q.xy[0], x0, wU), y: pct(q.xy[1], y0, hU) }));
  // number column in the Gulf margin: aligned with its dot where it can be, never closer than `gap`
  const gap = Math.min(4.6, 92 / dots.length), top = 3, bottom = 97;
  const ly = [];
  dots.forEach((d, i) => { ly[i] = Math.max(d.y, i ? ly[i - 1] + gap : top); });
  if (ly[ly.length - 1] > bottom) { ly[ly.length - 1] = bottom; for (let i = ly.length - 2; i >= 0; i--) ly[i] = Math.min(ly[i], ly[i + 1] - gap); }
  const lx = 7.5; // the right edge of the number column (percent)
  const lines = dots.map((d, i) => { const kx = Math.max(lx + 2, d.x - 5); return `<polyline points="${lx},${ly[i].toFixed(2)} ${kx.toFixed(2)},${ly[i].toFixed(2)} ${d.x.toFixed(2)},${d.y.toFixed(2)}"/>`; }).join("");
  const labels = ((db.map && db.map.labels) || []).filter((l) => l.kind === "water" && (l.minZoom || 1) <= 1)
    .map((l) => { const [x, y] = project(l.lat, l.lng, meta); return { l, x: pct(x, x0, wU), y: pct(y, y0, hU) }; })
    .filter((q) => q.x > 42 && q.x < 86 && q.y > 4 && q.y < 96)
    .map((q) => `<span class="map-label ${q.l.kind === "water" ? "water" : "hood"}" style="left: ${q.x.toFixed(1)}%; top: ${q.y.toFixed(1)}%">${h.esc(q.l.text)}</span>`).join("");
  const label = `Chart of the Gulf beaches: numbers ${dots[0].n} to ${dots[dots.length - 1].n} run north to south down the coast and match the list`;
  return `<figure class="xp-chart">
<div class="mini-map area-map xp-coast" style="--map-ratio: ${wU.toFixed(1)} / ${hU.toFixed(1)}" role="img" aria-label="${h.attr(label)}"><svg viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${wU.toFixed(1)} ${hU.toFixed(1)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><use href="${root}assets/map/basemap.svg#bm"/></svg><span class="mini-labels" aria-hidden="true">${labels}</span><svg class="xp-leaders" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">${lines}</svg>${dots.map((d) => `<span class="xp-dot" data-n="${d.n}" data-sheet="${d.p.region}" style="left: ${d.x.toFixed(2)}%; top: ${d.y.toFixed(2)}%" aria-hidden="true"></span>`).join("")}${dots.map((d, i) => `<span class="xp-no xp-tick" data-n="${d.n}" data-sheet="${d.p.region}" style="top: ${ly[i].toFixed(2)}%" aria-hidden="true">${d.n}</span>`).join("")}</div>
<figcaption><p>${off.length ? `Not on this chart: ${h.esc(h.listJoin(off.map((x) => `No. ${x.n}, ${x.p.name}`)))} (beyond its edge or without coordinates). ` : ""}Basemap: US Census Bureau TIGER/Line (public domain); place coordinates include data © ${h.extLink("https://www.openstreetmap.org/copyright", "OpenStreetMap contributors")}, ODbL.</p></figcaption>
</figure>`;
}
