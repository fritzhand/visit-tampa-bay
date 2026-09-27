/* ============================================================
   build/nav.mjs · OWNER: E1 (build engine; ported from Cincy Week)
   The single source of navigation. Every top-level page is listed here
   exactly once; page modules produce them. The build fails if a nav page
   has no producer, if two modules produce the same page, or if a module
   produces a page that is neither here nor a detail page
   (places/<id>.html, stays/<id>.html, areas/<id>.html).

   Sidebar: 5 numbered sections (numbers mean sections, chart codes mean
   sheets). The Sheets section is filled from REGION_PAGES (one page per
   region, rendered by build/pages/region.mjs).
   ============================================================ */
import { REGIONS, REGION_IDS, AREA_IDS, PLACE_KINDS, TOPICS, STAY_KINDS, STAY_FEATURES, EXPERIENCE_KINDS, EVENT_KINDS, ERAS, EVENT_GROUP, PLACE_GROUP, EXPERIENCE_GROUP } from "./core/vocab.mjs";
import { WHEN } from "./core/time.mjs";
import { slugify } from "./core/util.mjs";

/** Region (sheet) pages, in sheet order: slug → region id. */
export const REGION_PAGES = [
  { slug: "tampa", region: "tampa", label: REGIONS.tampa.name },
  { slug: "st-petersburg", region: "stpete", label: REGIONS.stpete.name },
  { slug: "gulf-beaches", region: "beaches", label: REGIONS.beaches.name },
  { slug: "clearwater", region: "clearwater", label: REGIONS.clearwater.name },
  { slug: "around-the-bay", region: "around", label: REGIONS.around.name },
  { slug: "day-trips", region: "daytrips", label: REGIONS.daytrips.name },
];
/** region id → its page file ("tampa" → "tampa.html") */
export const regionHref = (rid) => `${REGION_PAGES.find((p) => p.region === rid)?.slug}.html`;

/** Sidebar groups. `slug` is the page file name without .html; `meta` asks the shell for a count. */
export const NAV = [
  { num: 1, label: "Plan", items: [
    { slug: "index", label: "Overview", icon: "home" },
    { slug: "whats-on", label: "What's On", icon: "calendar", meta: "events" },
    { slug: "map", label: "Map", icon: "map" },
    { slug: "trip", label: "My Trip", icon: "star", meta: "trip" },
  ] },
  { num: 2, label: "Sheets", regions: true },
  { num: 3, label: "Explore", items: [
    { slug: "things-to-do", label: "Things to do", icon: "compass", meta: "places" },
    { slug: "experiences", label: "Experiences & tours", icon: "boat", meta: "experiences" },
    { slug: "outdoors", label: "Beaches & outdoors", icon: "umbrella" },
    { slug: "history", label: "History & heritage", icon: "landmark" },
    { slug: "eat-drink", label: "Eat & drink", icon: "fork-knife" },
    { slug: "passages", label: "Passages", icon: "route" },
  ] },
  { num: 4, label: "Stay", items: [
    { slug: "stay", label: "Where to stay", icon: "anchor", meta: "stays" },
    { slug: "areas", label: "Areas & towns", icon: "hood" },
  ] },
  { num: 5, label: "Visit", items: [
    { slug: "getting-around", label: "Getting around", icon: "bus" },
    { slug: "when-to-visit", label: "When to visit", icon: "sun" },
    { slug: "faq", label: "FAQ", icon: "help" },
    { slug: "about", label: "About & sources", icon: "info" },
  ] },
];

/** Every nav page slug, in order (region pages included). */
export const NAV_SLUGS = NAV.flatMap((g) => (g.regions ? REGION_PAGES.map((p) => p.slug) : g.items.map((i) => i.slug)));
/** slug → sidebar label */
export const NAV_LABEL = Object.fromEntries(NAV.flatMap((g) => (g.regions ? REGION_PAGES.map((p) => [p.slug, p.label]) : g.items.map((i) => [i.slug, i.label]))));

/** Detail-page folders: <folder>/<id>.html → the nav page marked aria-current by default (a page may set its own
 *  `nav`, e.g. a restaurant's page under eat-drink, a beach under outdoors). */
export const DETAIL_FOLDERS = { places: "things-to-do", stays: "stay", areas: "areas" };

/** The phone dock: What's On · Map · Trip · Search. */
export const DOCK = [
  { slug: "whats-on", label: "What's On", icon: "calendar" },
  { slug: "map", label: "Map", icon: "map" },
  { slug: "trip", label: "Trip", icon: "star", trip: true },
  { search: true, label: "Search", icon: "search" },
];

/** Query parameters each page accepts. The crawler fails on a link to a page with a query string it does not
 *  list, or with an unknown key, so deep links stay honest. Values are checked too (paramValues below). */
export const PARAMS = {
  "whats-on": ["month", "day", "series", "r", "a", "k", "free", "q", "when", "star", "view", "e"],
  "things-to-do": ["r", "a", "k", "t", "q", "free", "view"],
  experiences: ["r", "k", "t", "q", "x"],
  stay: ["r", "a", "k", "f", "q", "view"],
  outdoors: ["r", "k", "q"],
  history: ["era", "r", "q"],
  "eat-drink": ["r", "a", "k", "tag", "q"],
  map: ["layers", "r", "focus"],
  areas: ["r"],
  faq: ["q", "topic"],
};
/** The map's layers (map.html ?layers=) and focus kinds (?focus=<kind>:<id>). */
export const MAP_LAYERS = ["places", "stays", "experiences", "events", "heritage", "transport"];
export const FOCUS_KINDS = { place: "place", stay: "stay", experience: "experience", event: "event", area: "area", transport: "transport" };

/** Allowed VALUES per page and key, built from the data (the crawler checks every internal link's query string with
 *  these; the client re-validates at runtime). List params take comma-separated values. `k` takes a group id or a
 *  single kind (a group id wins when a word is both: ?k=sports is the sports group). Keys without a validator
 *  accept any value (q). */
export function paramValues(db) {
  const inSet = (arr) => { const s = new Set(arr); return (v) => s.has(v); };
  const list = (ok) => (v) => v.split(",").every((x) => x !== "" && ok(x));
  const any = () => true;
  const one = (...vals) => inSet(vals);
  const regions = list(inSet(REGION_IDS)), areas = list(inSet(AREA_IDS));
  const eventK = list(inSet([...new Set(Object.values(EVENT_GROUP)), ...EVENT_KINDS]));
  const placeK = list(inSet([...new Set(Object.values(PLACE_GROUP)), ...PLACE_KINDS]));
  const expK = list(inSet([...new Set(Object.values(EXPERIENCE_GROUP)), ...EXPERIENCE_KINDS]));
  const topics = list(inSet(TOPICS));
  const B = db.byId;
  const focus = (v) => { const i = v.indexOf(":"); if (i < 1) return false; const k = v.slice(0, i), id = v.slice(i + 1); return !!FOCUS_KINDS[k] && !!B[FOCUS_KINDS[k]]?.has(id); };
  const placeTags = [...new Set(db.places.flatMap((p) => p.tags || []))];
  return {
    "whats-on": {
      month: list(inSet(db.months.map((m) => m.key))), day: (v) => db.days.some((d) => d.date === v), series: list(inSet(db.series.map((s) => s.id))),
      r: regions, a: areas, k: eventK, free: one("1"), q: any, when: one(...Object.keys(WHEN)), star: one("1"),
      view: one("list", "map"), e: inSet(db.events.map((e) => e.id)),
    },
    "things-to-do": { r: regions, a: areas, k: placeK, t: topics, q: any, free: one("1"), view: one("list", "map") },
    experiences: { r: regions, k: expK, t: topics, q: any, x: inSet(db.experiences.map((x) => x.id)) },
    stay: { r: regions, a: areas, k: list(inSet(STAY_KINDS)), f: list(inSet(STAY_FEATURES)), q: any, view: one("list", "map") },
    outdoors: { r: regions, k: placeK, q: any },
    history: { era: list(inSet(ERAS)), r: regions, q: any },
    "eat-drink": { r: regions, a: areas, k: placeK, tag: list(inSet([...placeTags, ...TOPICS])), q: any },
    map: { layers: list(inSet(MAP_LAYERS)), r: regions, focus },
    areas: { r: regions },
    faq: { q: any, topic: inSet([...new Set(db.faqs.map((f) => slugify(f.topic)))]) },
  };
}
