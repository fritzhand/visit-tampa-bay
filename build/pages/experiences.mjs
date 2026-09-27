/* ============================================================
   build/pages/experiences.mjs · OWNER: the Stay lane (experiences-eat-stay)
   Produces experiences.html: every experience (tour, cruise, water taxi, rental, class…) in five families
   and, inside each, one group per kind, as compact cards (build/components/experience-card.mjs, plate: false):
   id="x-<id>", operator, kind, where it departs (the place's page linked), duration and price in the operator's
   words (unknowns as unknowns), season, status in words with the source's note, star kind x, and
   [data-open-experience] (the ?x= dialog, core/experience-dialog.js; without JS the card's own details).
     On the water                 water taxis, ferries, cruises, dinner cruises, dolphin and eco tours, airboats,
                                  sailing, rentals, kayaks and paddleboards, fishing, snorkel and dive, parasail
     Tours and tastings           walking, ghost, food, drink, cigar, bike and Segway, trolley and bus tours
     Wildlife and behind the scenes   animal encounters, behind-the-scenes tours
     Adventure, air and shows     adventure parks, skydiving, helicopter, balloon and biplane flights, shows
     Classes                      classes and workshops
   Every EXPERIENCE_KINDS value belongs to exactly one family (the build fails otherwise), so nothing is dropped.
   Filters (the core list filter, CONTRACTS §8): q, r (sheet), k (a family = a group id or a list of kinds; a
   single kind), t (topic). A "Check before you go" box lists every experience that is not running as usual.
   ============================================================ */
import { kit } from "./stay.mjs";

/** The families, in page order: kinds in display order. `k` is the filter value (a group id when it is exact). */
export const FAMILIES = [
  { id: "water", title: "On the water", icon: "boat", kinds: ["water-taxi", "ferry", "cruise", "dinner-cruise", "dolphin-tour", "eco-tour", "airboat", "sailing", "boat-rental", "kayak-paddle", "fishing", "snorkel-dive", "parasail-jetski"] },
  { id: "tours", title: "Tours and tastings", icon: "walk", kinds: ["walking-tour", "ghost-tour", "food-tour", "drink-tour", "cigar", "bike-segway", "trolley-bus-tour"] },
  { id: "wildlife", title: "Wildlife and behind the scenes", icon: "binoculars", kinds: ["animal-encounter", "behind-the-scenes"] },
  { id: "adventure", title: "Adventure, air and shows", icon: "plane", kinds: ["adventure", "helicopter-air", "show", "other"] },
  { id: "classes", title: "Classes", icon: "spark", kinds: ["class-workshop"] },
];
/** Group headings (plural, plain words). */
const KIND_HEAD = {
  "water-taxi": "Water taxis", ferry: "Ferries", cruise: "Sightseeing and party cruises", "dinner-cruise": "Dinner cruises", "dolphin-tour": "Dolphin tours",
  "eco-tour": "Eco tours", airboat: "Airboat rides", sailing: "Sailing", "boat-rental": "Boat rentals", "kayak-paddle": "Kayaks and paddleboards",
  fishing: "Fishing", "snorkel-dive": "Snorkeling and diving", "parasail-jetski": "Parasailing and jet skis",
  "walking-tour": "Walking tours", "ghost-tour": "Ghost tours", "food-tour": "Food tours", "drink-tour": "Drink tours and tastings",
  cigar: "Cigar rolling and factory tours", "bike-segway": "Bike and Segway tours", "trolley-bus-tour": "Trolley and bus tours",
  "animal-encounter": "Animal encounters", "behind-the-scenes": "Behind the scenes", adventure: "Adventure parks and thrills",
  "helicopter-air": "Helicopter, balloon and plane rides", show: "Shows", other: "Other experiences", "class-workshop": "Classes and workshops",
};

export function pages(ctx) {
  const { db, c, h, cards, vocab, fail } = ctx;
  const { esc, attr } = h;
  const K = kit(ctx);
  const { EXPERIENCE_KINDS, EXPERIENCE_GROUP, EXPERIENCE_GROUP_LABEL, TOPIC_LABEL, TOPICS } = vocab;
  const xs = db.experiences;

  // every kind in exactly one family: a new kind in the vocabulary must be placed before it can be listed
  const famOf = new Map();
  for (const f of FAMILIES) for (const k of f.kinds) { if (famOf.has(k)) fail("build/pages/experiences.mjs", `kind "${k}" is in two families`); famOf.set(k, f.id); }
  for (const k of EXPERIENCE_KINDS) if (!famOf.has(k)) fail("build/pages/experiences.mjs", `experience kind "${k}" belongs to no family (add it to FAMILIES)`);
  for (const k of Object.keys(KIND_HEAD)) if (!EXPERIENCE_KINDS.includes(k)) fail("build/pages/experiences.mjs", `KIND_HEAD names an unknown kind "${k}"`);

  const inKind = (k) => h.sortBy(xs.filter((x) => x.kind === k), (x) => db.byId.region.get(x.region)?.n ?? 9, (x) => K.sortName(x.name), (x) => x.id);
  const fams = FAMILIES.map((f) => {
    const kinds = f.kinds.map((k) => ({ k, list: inKind(k) })).filter((g) => g.list.length);
    const n = kinds.reduce((a, g) => a + g.list.length, 0);
    const present = kinds.map((g) => g.k);
    // the filter value: a group id when its kinds (with records) are exactly this family's, else the kinds themselves
    const groupIds = [...new Set(present.map((k) => EXPERIENCE_GROUP[k]))];
    const exact = groupIds.length === 1 && Object.keys(EXPERIENCE_GROUP).filter((k) => EXPERIENCE_GROUP[k] === groupIds[0] && xs.some((x) => x.kind === k)).every((k) => present.includes(k));
    return { ...f, kinds, n, k: exact && present.length > 1 ? groupIds[0] : present.join(",") };
  }).filter((f) => f.n);

  const notRunning = h.sortBy(xs.filter((x) => x.status !== "open"), (x) => x.status, (x) => K.sortName(x.name));
  const regionOpts = db.regions.filter((r) => r.experiences.length).map((r) => [r.id, `${r.name} (${r.experiences.length})`]);
  const kindGroups = fams.map((f) => ({ label: f.title, options: [[f.k, `All ${f.title.toLowerCase()} (${f.n})`], ...(f.kinds.length > 1 ? f.kinds.map((g) => [g.k, `${KIND_HEAD[g.k]} (${g.list.length})`]) : [])] }));
  // the vocabulary's own groups (?k=tours, the value other pages and the contract use) when no family above equals one:
  // listed under their own heading so a link with one of them shows its name, not a slug
  const famKs = new Set(fams.map((f) => f.k));
  const vocabGroups = [...new Set(Object.values(EXPERIENCE_GROUP))].filter((g) => !famKs.has(g)).map((g) => [g, xs.filter((x) => EXPERIENCE_GROUP[x.kind] === g).length]).filter(([, n]) => n > 0)
    .map(([g, n]) => [g, `${EXPERIENCE_GROUP_LABEL[g] || g} (${n})`]);
  if (vocabGroups.length) kindGroups.push({ label: "Other groupings", options: vocabGroups });
  const topicN = (t) => xs.filter((x) => (x.topics || []).includes(t)).length;
  const topicOpts = TOPICS.filter((t) => topicN(t) > 0).map((t) => [t, `${TOPIC_LABEL[t]} (${topicN(t)})`]);

  const index = (root) => `<nav class="tour-index" aria-label="Families of experiences">${fams.map((f) => `<a class="tour-fam-link" href="#fam-${f.id}">${h.icon(f.icon)}<span class="tour-fam-t">${esc(f.title)}</span><span class="tour-fam-n"><b>${f.n}</b> · ${h.plural(f.kinds.length, "kind")}</span></a>`).join("")}</nav>
<p class="tour-more"><a href="${root}map.html?layers=experiences">${h.icon("map")}Where they start, on the map</a><a href="#list">${h.icon("sliders")}Filter by kind, sheet or topic</a></p>`;

  const checkBox = (root) => (notRunning.length ? `<aside class="callout tone-warn tour-check" aria-labelledby="tour-check-h"><span class="flag label">${h.icon("warn")}Check before you go</span>
<h2 class="tour-check-h" id="tour-check-h">${h.plural(notRunning.length, "experience is", "experiences are")} not running as usual</h2>
<ul class="rows">${notRunning.map((x) => `<li class="row" data-sheet="${x.region}"><a href="${root}experiences.html?x=${attr(x.id)}#x-${attr(x.id)}" data-open-experience="${attr(x.id)}">${h.bullet(x.region)}<span><span class="t">${esc(x.name)}</span><span class="w">${esc(x.operator)}</span></span></a>${c.statusBadge(x)}${x.status_note ? `<p>${esc(x.status_note)}</p>` : ""}</li>`).join("")}</ul>
<p class="faint">As each operator's page said when it was checked (${esc(K.checked(notRunning).replace(/^Checked /, ""))}).</p></aside>` : "");

  const famSection = (root, f, i) => `<section class="section tour-fam" id="fam-${f.id}" data-filter-group aria-labelledby="fam-${f.id}-h">
<div class="sec-head oxford"><p class="sec-kicker label">${h.icon(f.icon)}Family ${i + 1} of ${fams.length} · ${h.plural(f.n, "experience")}</p><h2 id="fam-${f.id}-h">${esc(f.title)}</h2></div>
${f.kinds.length > 1 ? `<p class="tour-kinds">${f.kinds.map((g) => `<a href="#kind-${g.k}">${esc(KIND_HEAD[g.k])} <span class="n">${g.list.length}</span></a>`).join("")}</p>` : ""}
${f.kinds.map((g) => `<div class="tour-kind" id="kind-${g.k}" data-filter-group>
<h3 class="sub-h tour-kind-h">${h.icon(cards.KIND_ICON[g.k] || "daymark")}<span>${esc(KIND_HEAD[g.k])}</span><span class="n">${g.list.length}</span></h3>
<div class="grid tour-grid">${g.list.map((x) => cards.experienceCard(root, x, { headingLevel: 4, plate: false, symbol: true })).join("")}</div>
</div>`).join("\n")}
</section>`;

  return [{
    path: "experiences.html", nav: "experiences", title: "Experiences & tours",
    description: `${h.plural(xs.length, "tour and activity", "tours and activities")} around Tampa Bay: water taxis, ferries, dolphin and dinner cruises, kayaking, fishing, walking, ghost, food and cigar tours, animal encounters and classes, each linked to its operator.`,
    toc: [...(notRunning.length ? [["tour-check-h", "Check before you go"]] : []), ...fams.map((f) => [`fam-${f.id}`, f.title])],
    body: (root) => `${c.pageHead({ num: 3, kicker: `Explore · ${h.plural(xs.length, "experience")} · ${h.plural(new Set(xs.map((x) => x.operator)).size, "operator")}`, title: "Experiences & tours", lede: "Water taxis, ferries, dolphin and sunset cruises, kayak and fishing trips; walking, ghost, food and cigar tours; animal encounters, flights and classes. Each card names its operator and where it starts. Prices, times and seasons are the operator's own words." })}
${index(root)}
${checkBox(root)}
<div class="tour-list-wrap" id="list" data-filter-root>
${K.toolbar({
  search: { label: "Search experiences", placeholder: "Search by name, operator, place or topic" },
  selects: [
    K.select({ name: "k", label: "Kind", all: "All kinds", groups: kindGroups }),
    K.select({ name: "r", label: "Sheet", all: "All sheets", options: regionOpts }),
    K.select({ name: "t", label: "Topic", all: "All topics", options: topicOpts }),
  ],
})}
${K.countLine(xs.length, "experiences")}
<div class="tour-list" data-filter-list>
${fams.map((f, i) => famSection(root, f, i)).join("\n")}
</div>
${K.empty("experiences")}
</div>
<p class="source-line">${h.icon("info")}<span>Every card links its operator's page and names its sources. Operators change prices, times and seasons: book with them directly. ${esc(K.checked(xs))}.</span></p>`,
  }];
}
