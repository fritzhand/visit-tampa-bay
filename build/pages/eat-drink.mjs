/* ============================================================
   build/pages/eat-drink.mjs · OWNER: the Stay lane (experiences-eat-stay)
   Produces eat-drink.html: every place to eat or drink (a place with a restaurant, café or bakery, food hall,
   bar, brewery, distillery or winery, or nightlife kind, primary or secondary), sheet by sheet, then area by
   area, as compact cards (id="p-<id>", star kind p, the place page linked).
   Each card makes the reason it is listed visible, from the data only:
     · distinctions its tags record, as words: Michelin star, Michelin Bib Gourmand, Michelin recommended,
       James Beard Award
     · a heritage block: "Built 1903" when heritage.built names a year (the building's year, never "since"),
       else "Historic place"
     · the signature seal (signature: true), status in words with the source's note
     · our summary, a few of its tags as words (cuisine, craft beer, waterfront…), hours as the source states them
   Filters (the core list filter): q, r (sheet), a (area), k (kind or group: eat, drink), tag (the "Known for"
   lists: each is a set of tags or topics that exist in the data; a quick filter shows only when it matches).
   The quick filters are links (eat-drink.html?tag=…) that stay.js applies in place.
   ============================================================ */
import { kit } from "./stay.mjs";
import { builtYear } from "../components/stay-card.mjs";

/** Distinctions recorded as tags, in rank order (words printed on the card). */
const DISTINCTIONS = [
  ["michelin-star", "Michelin star"], ["michelin-bib-gourmand", "Michelin Bib Gourmand"], ["michelin-recommended", "Michelin recommended"],
  ["james-beard-award", "James Beard Award"],
];
/** "Known for" quick filters: a label and the tags (or topics) they match. Shown only when the data holds them. */
const KNOWN_FOR = [
  { id: "michelin", label: "Michelin Guide", tags: ["michelin-star", "michelin-bib-gourmand", "michelin-recommended"] },
  { id: "cuban", label: "Cuban sandwiches & bakeries", tags: ["cuban-sandwich", "cuban-bread", "bakery"] },
  { id: "history", label: "Historic places", tags: ["history"] },
  { id: "beer", label: "Craft beer", tags: ["craft-beer", "brewpub", "taproom"] },
  { id: "seafood", label: "Seafood", tags: ["seafood", "raw-bar", "oysters", "grouper-sandwich", "stone-crab", "smoked-fish", "seafood-market"] },
  { id: "water", label: "Waterfront", tags: ["waterfront", "beachfront", "dock-and-dine", "boat-docks", "boat-slips"] },
  { id: "music", label: "Live music", tags: ["live-music", "jazz"] },
  { id: "rooftop", label: "Rooftops", tags: ["rooftop", "rooftop-bar"] },
  { id: "brunch", label: "Brunch", tags: ["brunch"] },
];
/** Tags printed as words on the cards (cuisine and what a visitor asks about); the rest stay searchable. */
const TAG_WORDS = {
  seafood: "Seafood", "cuban-sandwich": "Cuban sandwich", cuban: "Cuban", "spanish-cuban": "Spanish-Cuban", spanish: "Spanish", italian: "Italian",
  sicilian: "Sicilian", greek: "Greek", french: "French", japanese: "Japanese", sushi: "Sushi", omakase: "Omakase", vietnamese: "Vietnamese",
  chinese: "Chinese", "dim-sum": "Dim sum", mexican: "Mexican", tacos: "Tacos", mediterranean: "Mediterranean", southern: "Southern",
  barbecue: "Barbecue", steakhouse: "Steakhouse", steaks: "Steaks", pizza: "Pizza", pasta: "Pasta", bakery: "Bakery", "cuban-bread": "Cuban bread",
  coffee: "Coffee", "cuban-coffee": "Cuban coffee", brunch: "Brunch", breakfast: "Breakfast", "craft-beer": "Craft beer", cocktails: "Cocktails",
  wine: "Wine", "wine-bar": "Wine bar", "natural-wine": "Natural wine", "live-music": "Live music", jazz: "Jazz", rooftop: "Rooftop",
  "rooftop-bar": "Rooftop bar", waterfront: "Waterfront", beachfront: "Beachfront", oysters: "Oysters", "raw-bar": "Raw bar",
  "tiki-bar": "Tiki bar", "beach-bar": "Beach bar", "beer-garden": "Beer garden", biergarten: "Biergarten", taproom: "Taproom",
  brewpub: "Brewpub", distillery: "Distillery", winery: "Winery", cidery: "Cidery", mead: "Mead", cider: "Cider", gin: "Gin", rum: "Rum",
  whiskey: "Whiskey", sake: "Sake", "tasting-menu": "Tasting menu", "fine-dining": "Fine dining", "farm-to-table": "Farm to table",
  "vegan-options": "Vegan options", "dog-friendly": "Dog friendly", "outdoor-seating": "Outdoor seating", speakeasy: "Speakeasy",
  "food-hall": "Food hall", deli: "Deli", diner: "Diner", doughnuts: "Doughnuts", burgers: "Burgers", "hot-dogs": "Hot dogs",
  "grouper-sandwich": "Grouper sandwich", "deviled-crab": "Deviled crab", "stone-crab": "Stone crab", "smoked-fish": "Smoked fish",
  nepali: "Nepali", indian: "Indian", caribbean: "Caribbean", latin: "Latin", british: "British", "irish-pub": "Irish pub",
  gastropub: "Gastropub", "sports-bar": "Sports bar", "dive-bar": "Dive bar", "cocktail-bar": "Cocktail bar", "listening-bar": "Listening bar",
  "juice-bar": "Juice bar", "afternoon-tea": "Afternoon tea", "drag-brunch": "Drag brunch", "seafood-market": "Seafood market",
  "new-american": "New American", "italian-american": "Italian-American", "afro-cuban": "Afro-Cuban", tapas: "Tapas", paella: "Paella",
  "brewery-tours": "Brewery tours", tastings: "Tastings", "dance-club": "Dance club", "u-pick": "U-pick", "comfort-food": "Comfort food",
};
const KIND_ICON = { restaurant: "fork-knife", "cafe-bakery": "utensils", "food-hall": "utensils", bar: "glass", brewery: "glass", "distillery-winery": "glass", nightlife: "moon" };
const KIND_PLURAL = { restaurant: "Restaurants", "cafe-bakery": "Cafés and bakeries", "food-hall": "Food halls", bar: "Bars", brewery: "Breweries", "distillery-winery": "Distilleries and wineries", nightlife: "Nightlife" };

export function pages(ctx) {
  const { db, c, h, vocab } = ctx;
  const { esc, attr } = h;
  const K = kit(ctx);
  const { PLACE_KIND_LABEL, TOPIC_LABEL, TOPICS, EAT_DRINK_KINDS, PLACE_GROUP_LABEL } = vocab;
  const EAT = new Set(EAT_DRINK_KINDS);
  const list = db.places.filter((p) => p.kindsAll.some((k) => EAT.has(k)));
  const areaName = (a) => db.byId.area.get(a)?.name || "";
  const tagsOf = (p) => new Set([...(p.tags || []), ...(p.topics || [])]);

  /* quick filters that exist in the data (each value is a tag or topic some place here carries) */
  const known = KNOWN_FOR.map((k) => {
    const vals = k.tags.filter((t) => list.some((p) => tagsOf(p).has(t)));
    const n = list.filter((p) => vals.some((t) => tagsOf(p).has(t))).length;
    return { ...k, vals, n };
  }).filter((k) => k.n > 0);
  const knownHref = (k) => ({ tag: k.vals });

  function why(p) {
    const tags = new Set(p.tags || []);
    const d = DISTINCTIONS.filter(([t]) => tags.has(t)).map(([, w]) => `<span class="eat-dist">${h.icon("star")}${esc(w)}</span>`);
    const by = builtYear(p);
    const her = p.heritage ? `<span class="eat-her">${h.icon("landmark")}${esc(by ? `Built ${by}` : "Historic place")}</span>` : "";
    const sig = p.signature ? `<span class="seal">${h.icon("seal")}Signature</span>` : "";
    const parts = [sig, ...d, her].filter(Boolean);
    return parts.length ? `<p class="eat-why">${parts.join("")}</p>` : "";
  }

  function eatCard(root, p, { here = "" } = {}) {
    const kinds = p.kindsAll.filter((k) => EAT.has(k));
    const lead = EAT.has(p.kind) ? p.kind : kinds[0];
    const words = (p.tags || []).filter((t) => TAG_WORDS[t]).slice(0, 5).map((t) => TAG_WORDS[t]);
    const q = h.aliasKey([p.aliases, p.city, (p.tags || []).map((t) => TAG_WORDS[t] || t.replace(/-/g, " ")), (p.topics || []).map((t) => TOPIC_LABEL[t]), p.kindsAll.map((k) => PLACE_KIND_LABEL[k]), DISTINCTIONS.filter(([t]) => (p.tags || []).includes(t)).map(([, w]) => w)].flat().filter(Boolean).join(" "));
    const kicker = [c.sheetBadge(p.region), `<span class="card-kind">${h.icon(KIND_ICON[lead] || "fork-knife")}${esc(PLACE_KIND_LABEL[p.kind] || p.kind)}</span>`, p.area !== here ? `<span class="card-area">${esc(areaName(p.area))}</span>` : ""].filter(Boolean).join(" · ");
    return `<article class="card place eat" id="p-${attr(p.id)}" data-place="${attr(p.id)}" data-sheet="${p.region}" data-r="${p.region}" data-a="${attr(p.area)}" data-k="${p.kind}" data-ks="${p.kindsAll.join(" ")}" data-g="${p.groups.join(" ")}" data-t="${(p.topics || []).join(" ")}" data-tag="${attr((p.tags || []).join(" "))}" data-st="${p.status}"${p.signature ? ' data-sig="1"' : ""}${p.heritage?.era ? ` data-era="${p.heritage.era}"` : p.heritage ? ' data-h="1"' : ""}${p.ll ? ` data-ll="${p.ll.join(",")}"` : ""} data-compact="1" data-q="${attr(q)}">`
      + `<div class="card-body"><p class="card-kicker">${kicker}</p>`
      + `<h4 class="card-title"><a class="stretched" href="${root}places/${attr(p.id)}.html">${esc(p.name)}</a></h4>`
      + why(p)
      + (p.status !== "open" ? `<p class="card-status">${c.statusBadge(p)}</p>${p.status_note ? `<p class="card-note">${esc(p.status_note)}</p>` : ""}` : "")
      + (p.summary ? `<p class="card-sum">${esc(p.summary)}</p>` : "")
      + (words.length ? `<p class="card-feats eat-tags">${esc(words.join(" · "))}</p>` : "")
      + `<p class="card-meta eat-meta"><span>${h.icon("clock")}${p.hours_text ? esc(p.hours_text) : c.unk("Hours not listed")}</span>${p.address ? `<span>${h.icon("pin")}${esc(p.address)}${p.city ? `, ${esc(p.city)}` : ""}</span>` : `<span>${h.icon("pin")}${c.unk("Address not listed")}</span>`}</p>`
      + `</div>${c.starButton(p.id, p.name, { kind: "p" })}</article>`;
  }

  const regions = db.regions.filter((r) => list.some((p) => p.region === r.id));
  const inRegion = (r) => list.filter((p) => p.region === r.id);
  const areasOf = (r) => r.areas.map((a) => ({ a, ps: h.sortBy(list.filter((p) => p.area === a.id), (p) => K.sortName(p.name), (p) => p.id) })).filter((x) => x.ps.length);
  const kindN = (k) => list.filter((p) => p.kindsAll.includes(k)).length;
  const groupN = (g) => list.filter((p) => p.groups.includes(g)).length;
  const heritageN = list.filter((p) => p.heritage).length;
  const distN = (t) => list.filter((p) => (p.tags || []).includes(t)).length;

  const quick = (root) => (known.length ? `<nav class="eat-quick" aria-label="Known for"><p class="label eat-quick-l">Known for</p><div class="chip-row">${known.map((k) => K.filterLink(root, "eat-drink.html", knownHref(k), `<span>${esc(k.label)}</span><span class="n">${k.n}</span>`, "chip")).join("")}</div></nav>` : "");

  const reasons = () => {
    const bits = [
      ...DISTINCTIONS.map(([t, w]) => [distN(t), w]).filter(([n]) => n).map(([n, w]) => `<li><b>${n}</b> ${esc(w)}</li>`),
      heritageN ? `<li><b>${heritageN}</b> in a historic building or site (with its heritage record)</li>` : "",
    ].filter(Boolean);
    return bits.length ? `<aside class="callout tone-tip eat-reasons"><span class="flag label">${h.icon("compass")}Why a place is here</span><p>A place is listed when a source we read names it: its own page, a tourism office's listing, or a guide. The card says what the records show:</p><ul>${bits.join("")}</ul><p class="faint">Distinctions are the ones our sources record; this guide adds none of its own and ranks nothing.</p></aside>` : "";
  };

  const regionSection = (root, r) => `<section class="section eat-sheet" id="ed-${r.id}" data-sheet="${r.id}" data-filter-group aria-labelledby="ed-${r.id}-h">
<div class="sec-head oxford"><p class="sec-kicker label">Sheet ${r.n} · ${esc(r.code)} · ${h.plural(inRegion(r).length, "place")}</p><h2 id="ed-${r.id}-h" class="eat-sheet-h">${h.bullet(r.id, "lg")}${esc(r.name)}</h2></div>
${areasOf(r).map(({ a, ps }) => `<div class="eat-area" id="ea-${attr(a.id)}" data-filter-group>
<h3 class="eat-area-h"><a href="${root}areas/${attr(a.id)}.html">${esc(a.name)}</a><span class="faint">${h.plural(ps.length, "place")}</span></h3>
<div class="grid eat-grid">${ps.map((p) => eatCard(root, p, { here: a.id })).join("")}</div>
</div>`).join("\n")}
</section>`;

  const regionOpts = regions.map((r) => [r.id, `${r.name} (${inRegion(r).length})`]);
  const areaGroups = regions.map((r) => ({ label: r.name, options: areasOf(r).map(({ a, ps }) => [a.id, `${a.name} (${ps.length})`]) }));
  const kindOpts = [["eat", `${PLACE_GROUP_LABEL.eat} (${groupN("eat")})`], ["drink", `${PLACE_GROUP_LABEL.drink} (${groupN("drink")})`], ...EAT_DRINK_KINDS.filter((k) => kindN(k)).map((k) => [k, `${KIND_PLURAL[k] || PLACE_KIND_LABEL[k]} (${kindN(k)})`])];
  const knownOpts = known.map((k) => [k.vals.join(","), `${k.label} (${k.n})`]);
  const topicN = (t) => list.filter((p) => (p.topics || []).includes(t)).length;
  const topicOpts = TOPICS.filter((t) => topicN(t) > 0 && !known.some((k) => k.vals.length === 1 && k.vals[0] === t)).map((t) => [t, `${TOPIC_LABEL[t]} (${topicN(t)})`]);

  return [{
    path: "eat-drink.html", nav: "eat-drink", title: "Eat & drink", features: known.length ? ["stay"] : [],
    description: `${h.plural(list.length, "place")} to eat and drink around Tampa Bay, sheet by sheet: historic restaurants, Cuban sandwiches and bakeries, MICHELIN Guide restaurants, food halls, breweries and bars, each linked to its source.`,
    toc: regions.map((r) => [`ed-${r.id}`, r.name]),
    body: (root) => `${c.pageHead({ num: 3, kicker: `Explore · ${h.plural(list.length, "place")} to eat and drink`, title: "Eat & drink", lede: "Restaurants, cafés and bakeries, food halls, bars, breweries, distilleries and nightlife on every sheet. Each card shows why the place is here: a distinction, a historic building, or what its own page and the tourism offices say." })}
${quick(root)}
${reasons()}
<div class="eat-list-wrap" id="list" data-filter-root>
${K.toolbar({
  search: { label: "Search places to eat and drink", placeholder: "Search by name, dish, cuisine or town" },
  selects: [
    K.select({ name: "k", label: "Kind", all: "All kinds", options: kindOpts }),
    K.select({ name: "tag", label: "Known for", all: "Anything", options: knownOpts, groups: topicOpts.length ? [{ label: "Topics", options: topicOpts }] : [] }),
    K.select({ name: "r", label: "Sheet", all: "All sheets", options: regionOpts }),
    K.select({ name: "a", label: "Area", all: "All areas", groups: areaGroups }),
  ],
})}
${K.countLine(list.length, "places")}
<div class="eat-list" data-filter-list>
${regions.map((r) => regionSection(root, r)).join("\n")}
</div>
${K.empty("places")}
</div>
<p class="source-line">${h.icon("info")}<span>Every card links the place's own page in this guide, which names its sources. Hours change: check with the place before you go. ${esc(K.checked(list))}.</span></p>`,
  }];
}
