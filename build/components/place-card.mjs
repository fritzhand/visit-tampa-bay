/* ============================================================
   build/components/place-card.mjs · OWNER: E1 (engine). Page lanes may extend it additively.
   Extended additively by the Explore lane (2026-09-27): placeCard options sym, lead, extra, foot, seal, plate,
   meta: "rows" (defaults keep existing callers' markup exactly as before), and the helpers placeHome, placeSym,
   placeTagWords, OUTDOOR_HOME_KINDS.

   makePlaceCards(ctx) → {
     placeCard(root, place, { headingLevel = 3, anchor = false, summary = true, meta = true, here = "",
                              sym = false, lead = "", extra = "", foot = false, seal = false, plate = true }),
         sym   the kind's chart symbol before the kicker words (DESIGN.md §8, §10: beach umbrella, landmark …)
         lead  trusted HTML at the start of the kicker (a list number, say)
         extra trusted HTML after the summary (tag words, a note)
         foot  the record's source line at the card's foot: "Source: host · Checked Sep 27, 2026"
         seal  the gold "Signature" seal in the meta line for signature places
         plate true: the photo or the typographic plate · "photo": the photo only when one exists (compact lists)
               · false: no picture (the card gets .no-plate)
         meta  true: "hours · price" on one line · "rows": hours and price on lines of their own, each after its
               symbol (clock, ticket) and a screen-reader label ("Hours: ", "Price: ") · false: none
     placeRow(root, place, { note })   a compact <li> for lists (name, kind · area, status), inside <ul class="rows">
     placeFacts(root, place)           the detail page's "At a glance" rows: [[label, valueHtml]] for c.facts()
     placeWhere(place)                 "3001 N Florida Ave · Tampa Heights" | "" (plain text)
     placeHome(place)                  the Explore page a place is listed on and its detail page sits under:
                                       "eat-drink" (primary kind eats or drinks), "outdoors" (primary kind a beach,
                                       park, state park, preserve, garden, trail or island), else "things-to-do"
     placeSym(place)                   the chart symbol (icon name) for the place's primary kind
     placeTagWords(place, { max })     the place's notable research tags as plain words ("Dog beach", "No alcohol"),
                                       most useful first; tags without a word are left out
   }
   Card contract (things-to-do, outdoors, history, eat-drink, region, area and nearby lists, My Trip):
   <article class="card place" [id="p-{id}"] data-place="{id}" data-sheet="{region}" data-r data-a data-k
            data-ks="{kind + kinds}" data-g="{groups}" data-t="{topics}" data-free data-st="{status}"
            [data-sig="1"] [data-era] [data-ll="lat,lng"] data-q>
     {plate: .photo with the image, or .plate-type with the chart code}
     .card-body (.card-kicker: sheet badge · kind · area, h3 a.stretched → places/{id}.html, status badge,
     .card-sum (our summary), [.card-extra], .card-meta (hours · price, unknowns as unknowns), [.card-src])
     button.star[data-star][data-star-kind="p"]
   ============================================================ */
import { esc, attr, extLink, hostOf } from "../core/util.mjs";
import { icon } from "../core/icons.mjs";
import { PLACE_KIND_LABEL, TOPIC_LABEL, PLACE_GROUP } from "../core/vocab.mjs";
import { fmtDateY } from "../core/time.mjs";
import { norm } from "../../site/js/lib/search.js";

/** Primary kinds whose places live on Beaches & outdoors (piers and waterfronts stay on Things to do). */
export const OUTDOOR_HOME_KINDS = ["beach", "park", "state-park", "nature-preserve", "garden", "trail", "island"];
const OUTDOOR_HOME = new Set(OUTDOOR_HOME_KINDS);
export function placeHome(p) {
  const g = PLACE_GROUP[p.kind];
  if (g === "eat" || g === "drink") return "eat-drink";
  if (OUTDOOR_HOME.has(p.kind)) return "outdoors";
  return "things-to-do";
}

/** The chart symbol of a place's primary kind (a symbol always sits beside a word). */
const SYM = {
  beach: "beach", park: "palm", "state-park": "palm", "nature-preserve": "palm", garden: "palm", island: "palm", trail: "trail",
  pier: "buoy", waterfront: "wave", "historic-site": "landmark", "historic-district": "landmark", landmark: "landmark",
  cemetery: "landmark", "house-of-worship": "landmark", aquarium: "fish", zoo: "binoculars", "performing-arts": "ticket",
  "music-venue": "ticket", "arena-stadium": "ticket", sports: "ticket", shopping: "bag", market: "bag", district: "hood",
  "visitor-center": "info", casino: "spark", "theme-park": "spark", "water-park": "drop",
  restaurant: "fork-knife", "cafe-bakery": "fork-knife", "food-hall": "fork-knife",
  bar: "glass", brewery: "glass", "distillery-winery": "glass", nightlife: "glass",
};
export const placeSym = (p) => ((p.tags || []).includes("lighthouse") && p.kind === "landmark" ? "lighthouse" : SYM[p.kind] || "buoy");

/** Research tags that state a useful fact, as plain words, in the order a visitor needs them. */
const TAG_WORDS = [
  ["dog-beach", "Dog beach"], ["dog-park", "Dog park"], ["no-dogs", "No dogs"], ["no-pets", "No pets"], ["no-pets-in-spring", "No pets in the spring"],
  ["pet-friendly", "Pets allowed"], ["dog-friendly", "Dogs allowed"],
  ["lifeguards", "Lifeguards"], ["lifeguards-seasonal", "Seasonal lifeguards"], ["no-lifeguards", "No lifeguards"],
  ["no-swimming", "No swimming"], ["swimming", "Swimming"], ["no-alcohol", "No alcohol"], ["boat-access-only", "Boat access only"],
  ["ferry-from-sponge-docks", "Ferry from the Sponge Docks"], ["ferry-from-honeymoon-island", "Ferry from Honeymoon Island"],
  ["ferry-from-fort-de-soto", "Ferry from Fort De Soto"], ["ferry-to-caladesi", "Ferry to Caladesi Island"],
  ["ferry-to-egmont-key", "Ferry to Egmont Key"], ["ferry-to-shell-key", "Ferry to Shell Key"],
  ["no-restrooms", "No restrooms"], ["no-facilities", "No facilities"], ["no-services", "No services"], ["facilities-closed", "Facilities closed"],
  ["camping", "Camping"], ["primitive-camping", "Primitive camping"], ["camping-permit", "Camping by permit"], ["cabins", "Cabins"],
  ["concession", "Concession stand"], ["fishing-pier", "Fishing pier"], ["fishing-jetties", "Fishing jetties"], ["fishing", "Fishing"],
  ["kayak-launch", "Kayak launch"], ["canoe-launch", "Canoe launch"], ["kayak-rental", "Kayak rental"], ["canoe-rental", "Canoe rental"],
  ["paddleboard-rental", "Paddleboard rental"], ["bike-rental", "Bike rental"], ["boat-ramp", "Boat ramp"], ["cabana-rental", "Cabana rental"],
  ["sea-turtle-nesting", "Sea turtle nesting"], ["manatees", "Manatees"], ["birding", "Birding"], ["shelling", "Shelling"], ["snorkeling", "Snorkeling"],
  ["springs", "Springs"], ["spring", "Spring"], ["river-beach", "River beach"], ["paved-trail", "Paved trail"], ["hiking", "Hiking"],
  ["mountain-biking", "Mountain biking"], ["equestrian", "Horse trails"], ["boardwalk", "Boardwalk"], ["observation-tower", "Observation tower"],
  ["observation-deck", "Observation deck"], ["nature-center", "Nature center"], ["lighthouse", "Lighthouse"], ["splash-pad", "Splash pad"],
  ["playground", "Playground"], ["picnic", "Picnic area"], ["pavilions", "Pavilions"], ["volleyball", "Volleyball"], ["disc-golf", "Disc golf"],
  ["windsurfing", "Windsurfing"], ["free-parking", "Free parking"], ["metered-parking", "Metered parking"], ["no-parking", "No parking lot"],
  ["water-quality-tested", "Water quality tested"], ["rip-currents", "Rip currents"], ["free-trolley", "Free trolley"],
  ["touch-tank", "Touch tank"], ["planetarium", "Planetarium"], ["guided-tours", "Guided tours"], ["docent-tours", "Docent tours"],
  ["self-guided-audio-tour", "Self-guided audio tour"], ["factory-tour", "Factory tour"], ["free-samples", "Free samples"],
  ["free-second-sunday", "Free second Sunday"], ["sensory-friendly", "Sensory friendly"], ["clear-bag-policy", "Clear bag policy"],
  ["reservations-required", "Reservations required"], ["21-plus", "21 and over"], ["18-plus-nights", "18-and-over nights"], ["cashless", "Cashless"],
  ["u-pick", "U-pick"], ["weekly", "Weekly"], ["seasonal-winter", "Winter season"],
];
const TAG_WORD = new Map(TAG_WORDS);
const TAG_RANK = new Map(TAG_WORDS.map(([t], i) => [t, i]));
export function placeTagWords(p, { max = Infinity } = {}) {
  const tags = (p.tags || []).filter((t) => TAG_WORD.has(t)).sort((a, b) => TAG_RANK.get(a) - TAG_RANK.get(b));
  const words = [...new Set(tags.map((t) => TAG_WORD.get(t)))];
  // a place that says "no swimming" never also shows "Swimming"; "no dogs" wins over a generic "Dogs allowed"
  const out = words.filter((w) => !(w === "Swimming" && words.includes("No swimming")) && !(w === "Dogs allowed" && (words.includes("No dogs") || words.includes("Dog beach"))));
  return out.slice(0, max);
}

export function makePlaceCards(ctx) {
  const { db, c, img } = ctx;
  const areaName = (a) => db.byId.area.get(a)?.name || "";
  const placeWhere = (p) => [p.address, areaName(p.area)].filter(Boolean).join(" · ");
  const priceHtml = (p) => (p.price_text ? esc(p.price_text) : p.is_free === true ? "Free" : c.unk("Price not listed"));
  /** a sprite icon, a few bytes lighter than h.icon (cards repeat it hundreds of times) */
  const sy = (name) => { icon(name); return `<svg class="i sym" aria-hidden="true"><use href="#i-${name}"/></svg>`; };

  function placeCard(root, p, { headingLevel = 3, anchor = false, summary = true, meta = true, here = "", sym = false, lead = "", extra = "", foot = false, seal = false, plate = true } = {}) {
    const H = `h${headingLevel}`;
    const q = norm([p.aliases, p.tags, p.city, (p.topics || []).map((t) => TOPIC_LABEL[t]), (p.kinds || []).map((k) => PLACE_KIND_LABEL[k])].flat().filter(Boolean).join(" "));
    const kicker = [c.sheetBadge(p.region), `<span class="card-kind">${sym ? sy(placeSym(p)) : ""}${esc(PLACE_KIND_LABEL[p.kind] || p.kind)}</span>`, p.area && p.area !== here ? `<span class="card-area">${esc(areaName(p.area))}</span>` : ""].filter(Boolean).join(" · ");
    const sealHtml = seal && p.signature ? ` <span class="seal">${sy("seal")}Signature</span>` : "";
    const pic = plate === true || (plate === "photo" && img.has("p", p.id)) ? img.plate(root, "p", p) : "";
    return `<article class="card place${pic ? "" : " no-plate"}"${anchor ? ` id="p-${attr(p.id)}"` : ""} data-place="${attr(p.id)}"${p.region ? ` data-sheet="${p.region}" data-r="${p.region}"` : ""} data-a="${attr(p.area)}" data-k="${p.kind}" data-ks="${p.kindsAll.join(" ")}" data-g="${p.groups.join(" ")}" data-t="${(p.topics || []).join(" ")}" data-free="${p.is_free === true ? 1 : 0}" data-st="${p.status}"${p.signature ? ' data-sig="1"' : ""}${p.heritage?.era ? ` data-era="${p.heritage.era}"` : ""}${p.ll ? ` data-ll="${p.ll.join(",")}"` : ""} data-q="${attr(q)}">`
      + pic
      + `<div class="card-body"><p class="card-kicker">${lead}${kicker}</p>`
      + `<${H} class="card-title"><a class="stretched" href="${root}places/${attr(p.id)}.html">${esc(p.name)}</a></${H}>`
      + (p.status !== "open" ? `<p class="card-status">${c.statusBadge(p)}</p>` : "")
      + (summary && p.summary ? `<p class="card-sum">${esc(p.summary)}</p>` : "")
      + (extra ? `<div class="card-extra">${extra}</div>` : "")
      + (meta === "rows" ? `<p class="card-meta card-meta-rows"><span class="cm">${sy("clock")}<span><span class="sr-only">Hours: </span>${p.hours_text ? esc(p.hours_text) : c.unk("Hours not listed")}</span></span><span class="cm">${sy("ticket")}<span><span class="sr-only">Price: </span>${priceHtml(p)}</span></span>${sealHtml ? `<span class="cm cm-seal">${sealHtml.trim()}</span>` : ""}</p>`
        : meta ? `<p class="card-meta">${p.hours_text ? esc(p.hours_text) : c.unk("Hours not listed")} · ${priceHtml(p)}${sealHtml}</p>` : sealHtml ? `<p class="card-meta">${sealHtml}</p>` : "")
      + (foot && p.source_url ? `<p class="card-src">Source: ${extLink(p.source_url, esc(hostOf(p.source_url)))}${p.checked ? ` · Checked ${esc(fmtDateY(p.checked))}` : ""}</p>` : "")
      + `</div>${c.starButton(p.id, p.name, { kind: "p" })}</article>`;
  }

  function placeRow(root, p, { note = "" } = {}) {
    return `<li class="row place-row"${p.region ? ` data-sheet="${p.region}"` : ""}><a href="${root}places/${attr(p.id)}.html">${p.region ? ctx.h.bullet(p.region) : ""}<span><span class="t">${esc(p.name)}</span><span class="w">${esc([PLACE_KIND_LABEL[p.kind], areaName(p.area), note].filter(Boolean).join(" · "))}</span></span></a>${p.status !== "open" ? c.statusBadge(p) : ""}</li>`;
  }

  function placeFacts(root, p) {
    return [
      ["Kind", esc([p.kind, ...(p.kinds || [])].map((k) => PLACE_KIND_LABEL[k]).join(", "))],
      ["Area", `<a href="${root}areas/${attr(p.area)}.html">${esc(areaName(p.area))}</a>`],
      ["Address", p.address ? esc([p.address, p.city, [p.state, p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")) : c.unk("Address not listed")],
      ["Hours", p.hours_text ? esc(p.hours_text) : c.unk("Hours not listed")],
      ["Price", priceHtml(p)],
      ["Phone", p.phone ? `<a href="tel:${attr(p.phone.replace(/[^\d+]/g, ""))}">${esc(p.phone)}</a>` : c.unk("Phone not listed")],
      ["Status", p.status === "open" ? "Open" : `${c.statusBadge(p)}${p.status_note ? ` ${esc(p.status_note)}` : ""}`],
      ["Parking", p.parking_text ? esc(p.parking_text) : ""],
      ["Accessibility", p.accessibility ? esc(p.accessibility) : ""],
      ["Topics", (p.topics || []).length ? esc(p.topics.map((t) => TOPIC_LABEL[t]).join(", ")) : ""],
    ];
  }

  return { placeCard, placeRow, placeFacts, placeWhere, placeHome, placeSym, placeTagWords };
}
