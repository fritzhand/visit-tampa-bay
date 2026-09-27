/* research/tools/schema.mjs — the record shapes every research slice writes (and data/ keeps).
   Documented in research/SCHEMA.md. The build's build/core/schema.mjs must accept these shapes.
   Vocabulary per field: t = id|text|str|url|date|time|bool|num|int|enum|list|obj; req; values; of; fields. */

export const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

export const REGIONS = {
  tampa: { n: 1, code: "TP", name: "Tampa" },
  stpete: { n: 2, code: "SP", name: "St. Petersburg" },
  beaches: { n: 3, code: "GB", name: "Gulf Beaches" },
  clearwater: { n: 4, code: "CW", name: "Clearwater & North Pinellas" },
  around: { n: 5, code: "AB", name: "Around the Bay" },
  daytrips: { n: 6, code: "DT", name: "Day Trips" },
};

/** area id → region id (SPEC §4.1). */
export const AREAS = {
  "downtown-tampa": "tampa", "channel-district": "tampa", "harbour-island": "tampa", "davis-islands": "tampa",
  "ybor-city": "tampa", "tampa-heights": "tampa", "hyde-park": "tampa", "west-tampa": "tampa", "seminole-heights": "tampa",
  "north-tampa": "tampa", westshore: "tampa", "south-tampa": "tampa", "east-tampa": "tampa",
  "downtown-stpete": "stpete", "grand-central": "stpete", "old-northeast": "stpete", "south-stpete": "stpete",
  "northeast-stpete": "stpete", "west-stpete": "stpete", gulfport: "stpete",
  "clearwater-beach": "beaches", "sand-key": "beaches", "indian-rocks-beach": "beaches", "madeira-beach": "beaches",
  "treasure-island": "beaches", "st-pete-beach": "beaches", "pass-a-grille": "beaches", "fort-de-soto": "beaches",
  "downtown-clearwater": "clearwater", dunedin: "clearwater", "safety-harbor": "clearwater", "tarpon-springs": "clearwater",
  "palm-harbor": "clearwater", oldsmar: "clearwater", largo: "clearwater",
  "temple-terrace": "around", brandon: "around", "apollo-beach": "around", "plant-city": "around",
  "lutz-wesley-chapel": "around", "west-pasco": "around",
  "bradenton-anna-maria": "daytrips", sarasota: "daytrips", "nature-coast": "daytrips", polk: "daytrips",
};

export const PLACE_KINDS = [
  "theme-park", "water-park", "zoo", "aquarium", "museum", "gallery", "science-center", "historic-site", "historic-district",
  "landmark", "performing-arts", "music-venue", "arena-stadium", "sports", "park", "beach", "state-park", "nature-preserve",
  "garden", "trail", "island", "pier", "waterfront", "district", "shopping", "market", "food-hall", "restaurant",
  "cafe-bakery", "bar", "brewery", "distillery-winery", "nightlife", "casino", "cemetery", "house-of-worship",
  "visitor-center", "attraction",
];
export const TOPICS = ["history", "arts", "family", "outdoors", "beaches", "water", "wildlife", "food", "drink", "nightlife",
  "sports", "shopping", "thrills", "music", "latin-heritage", "black-history", "lgbtq"];
export const STATUS = ["open", "seasonal", "temporarily-closed", "opening-soon", "closed"];
export const STAY_KINDS = ["hotel", "resort", "boutique-hotel", "historic-hotel", "extended-stay", "motel", "inn",
  "bed-and-breakfast", "hostel", "condo-hotel", "casino-resort", "campground"];
export const STAY_FEATURES = ["beachfront", "waterfront", "bay-view", "pool", "spa", "fitness", "restaurant", "rooftop-bar",
  "pet-friendly", "airport-shuttle", "cruise-shuttle", "golf", "marina", "casino", "all-suites", "kitchens",
  "free-breakfast", "free-parking", "ev-charging", "historic", "adults-only", "accessible-rooms", "meeting-space"];
export const EXPERIENCE_KINDS = ["water-taxi", "ferry", "cruise", "dinner-cruise", "dolphin-tour", "sailing", "boat-rental",
  "kayak-paddle", "fishing", "parasail-jetski", "airboat", "eco-tour", "snorkel-dive", "walking-tour", "ghost-tour",
  "food-tour", "drink-tour", "cigar", "bike-segway", "trolley-bus-tour", "helicopter-air", "class-workshop",
  "animal-encounter", "adventure", "behind-the-scenes", "show", "other"];
export const EVENT_KINDS = ["festival", "parade", "fair", "concert", "sports", "theater", "comedy", "dance", "classical",
  "film", "exhibition", "holiday", "market", "food-drink", "run-walk", "cultural", "family", "tour", "fireworks",
  "boat-show", "convention", "talk", "other"];
export const EVENT_STATUS = ["scheduled", "tentative", "changed", "postponed", "cancelled"];
export const TRANSPORT_MODES = ["airport", "streetcar", "water-taxi", "ferry", "bus", "brt", "trolley", "microtransit",
  "bike-share", "scooter", "rail", "intercity-bus", "cruise-port", "parking", "toll", "rideshare", "car-rental", "trail"];
export const ERAS = ["indigenous", "spanish", "frontier", "boomtown", "land-boom", "postwar", "modern"];
export const LICENSES = ["public-domain", "cc0", "cc-by", "cc-by-sa", "us-gov"];
export const GEO_SOURCES = ["census", "photon", "official", "wikipedia", "osm", "manual"];
export const DATE_WINDOW = { start: "2026-09-28", end: "2027-04-30" };
/** Coordinates must fall inside this box (Hernando to Sarasota, Gulf to Polk). */
export const BOX = { s: 26.9, n: 29.0, w: -83.0, e: -81.4 };

const R = { req: true };
const id = (o = {}) => ({ t: "id", ...o }), text = (o = {}) => ({ t: "text", ...o }), str = (o = {}) => ({ t: "str", ...o });
const url = (o = {}) => ({ t: "url", ...o }), en = (values, o = {}) => ({ t: "enum", values, ...o });
const list = (of, o = {}) => ({ t: "list", of, ...o }), obj = (fields, o = {}) => ({ t: "obj", fields, ...o });
const num = (o = {}) => ({ t: "num", ...o }), int = (o = {}) => ({ t: "int", ...o }), bool = (o = {}) => ({ t: "bool", ...o });
const date = (o = {}) => ({ t: "date", ...o }), time = (o = {}) => ({ t: "time", ...o });

/** Fields shared by every located record. */
const LOCATED = {
  area: en(Object.keys(AREAS), R),
  address: text(), city: text(), state: str(), zip: str(),
  lat: num(), lng: num(), geo_source: en(GEO_SOURCES),
};
const SOURCED = {
  source_url: url(R), also_sources: list(url()), checked: date(R), notes: text(),
};

export const HERITAGE = obj({
  built: str(),                 // "1891" or "1888–1891": the year(s) as a source states them
  architect: text(), style: text(),
  designations: list(obj({ name: text(R), ref: str(), year: int(), url: url() })), // e.g. National Historic Landmark, NRHP #72000322
  era: en(ERAS),
  story: text(),                // 2–5 factual sentences in our words, every claim in `sources`
  visiting: text(),             // what a visitor can do there today (hours/tours/exterior only), per the source
  sources: list(url()),
});

export const SPECS = {
  places: {
    id: id(R), name: text(R), aliases: list(text()), kind: en(PLACE_KINDS, R), kinds: list(en(PLACE_KINDS)),
    topics: list(en(TOPICS)), ...LOCATED,
    url: url(), phone: str(), hours_text: text(), price_text: text(), is_free: bool(),
    summary: text(), quote: text(), quote_source: url(),
    heritage: HERITAGE, signature: bool(), status: en(STATUS, R), status_note: text(),
    accessibility: text(), parking_text: text(), tags: list(str()), ...SOURCED,
  },
  stays: {
    id: id(R), name: text(R), aliases: list(text()), kind: en(STAY_KINDS, R), brand: text(), collection: text(),
    ...LOCATED, url: url(), phone: str(), rooms: int(), opened: str(), features: list(en(STAY_FEATURES)),
    summary: text(), quote: text(), quote_source: url(), heritage: HERITAGE,
    status: en(STATUS, R), status_note: text(), tags: list(str()), ...SOURCED,
  },
  experiences: {
    id: id(R), name: text(R), operator: text(R), kind: en(EXPERIENCE_KINDS, R), topics: list(en(TOPICS)),
    ...LOCATED, departs_place: id(), departs_text: text(),
    url: url(), booking_url: url(), phone: str(), duration_text: text(), price_text: text(), is_free: bool(),
    schedule_text: text(), season_text: text(), ages_text: text(),
    summary: text(), quote: text(), quote_source: url(), status: en(STATUS, R), status_note: text(),
    tags: list(str()), ...SOURCED,
  },
  events: {
    id: id(R), title: text(R), kind: en(EVENT_KINDS, R), topics: list(en(TOPICS)), series: id(),
    date: date(R), end_date: date(), start: time(), end: time(), all_day: bool(),
    occurrences: list(obj({ date: date(R), start: time(), end: time() })), time_text: text(),
    place: id(), location_text: text(), area: en(Object.keys(AREAS)), lat: num(), lng: num(),
    cost: text(), is_free: bool(), url: url(), tickets_url: url(),
    description: text(), summary: text(), status: en(EVENT_STATUS, R), featured: bool(), tags: list(str()), ...SOURCED,
  },
  series: {
    id: id(R), name: text(R), kind: en(EVENT_KINDS, R), topics: list(en(TOPICS)), months: list(int()),
    when_text: text(R), place: id(), location_text: text(), area: en(Object.keys(AREAS)),
    since: str(), url: url(), summary: text(), quote: text(), quote_source: url(), featured: bool(), ...SOURCED,
  },
  regions: {
    id: en(Object.keys(REGIONS), R), name: text(R), lede: text(), known_for: list(text()), official_url: url(), ...SOURCED,
  },
  areas: {
    id: en(Object.keys(AREAS), R), name: text(R), region: en(Object.keys(REGIONS), R), lat: num(R), lng: num(R),
    kind: en(["neighborhood", "district", "city", "beach-town", "island", "county-area"], R),
    summary: text(), known_for: list(text()), official_url: url(), ...SOURCED,
  },
  transport: {
    id: id(R), name: text(R), mode: en(TRANSPORT_MODES, R), operator: text(), regions: list(en(Object.keys(REGIONS))),
    url: url(), fare_text: text(), is_free: bool(), hours_text: text(), season_text: text(), summary: text(),
    stops: list(obj({ name: text(R), lat: num(), lng: num(), place: id(), area: en(Object.keys(AREAS)) })),
    lat: num(), lng: num(), address: text(), code: str(), ...SOURCED,
  },
  faqs: { id: id(R), topic: text(R), q: text(R), a: text(R), ...SOURCED },
  facts: { id: id(R), label: text(R), value: text(R), as_of: str(), source: text(R), quote: text(), ...SOURCED },
  timeline: {
    id: id(R), era: en(ERAS, R), year: int(R), date: str(), title: text(R), text: text(R),
    places: list(id()), area: en(Object.keys(AREAS)), lat: num(), lng: num(), media: list(id()), ...SOURCED,
  },
  media: {
    id: id(R), title: text(R), creator: text(), year: str(), license: en(LICENSES, R), license_url: url(),
    credit: text(R), file_url: url(R), page_url: url(R), subject_kind: en(["place", "stay", "area", "region", "timeline", "event", "series", "experience"], R),
    subject: id(R), alt: text(R), width: int(), height: int(), notes: text(),
  },
};

const PLACEHOLDER = /^(tba|tbd|n\/?a|none|unknown|varies|coming soon|see website|-|—|\?)$/i;
const HTML = /<[a-z!/][^>]*>|&[a-z]+;|&#\d+;/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Validate one record against SPECS[kind]. Returns a list of "field: message". */
export function checkRecord(kind, r) {
  const spec = SPECS[kind], errs = [];
  if (!spec) return [`unknown collection ${kind}`];
  for (const k of Object.keys(r)) if (!(k in spec)) errs.push(`${k}: unknown key (allowed: ${Object.keys(spec).join(" ")})`);
  const walk = (s, v, where) => {
    if (v === null || v === undefined) { if (s.req) errs.push(`${where}: required`); return; }
    switch (s.t) {
      case "id": if (typeof v !== "string" || !ID_RE.test(v)) errs.push(`${where}: bad id ${JSON.stringify(v)}`); break;
      case "text": case "str":
        if (typeof v !== "string") { errs.push(`${where}: must be a string`); break; }
        if (!v.trim()) errs.push(`${where}: empty string (use null)`);
        if (PLACEHOLDER.test(v.trim())) errs.push(`${where}: placeholder "${v}" (use null)`);
        if (HTML.test(v)) errs.push(`${where}: HTML or entity in text`);
        break;
      case "url": if (typeof v !== "string" || !/^https:\/\/[^\s]+\.[^\s]+$/.test(v)) errs.push(`${where}: must be an https URL (${JSON.stringify(v)})`); break;
      case "date": if (typeof v !== "string" || !DATE.test(v)) errs.push(`${where}: must be YYYY-MM-DD`); break;
      case "time": if (typeof v !== "string" || !TIME.test(v)) errs.push(`${where}: must be HH:MM (24h)`); break;
      case "bool": if (typeof v !== "boolean") errs.push(`${where}: must be true/false/null`); break;
      case "num": if (typeof v !== "number" || !Number.isFinite(v)) errs.push(`${where}: must be a number`); break;
      case "int": if (!Number.isInteger(v)) errs.push(`${where}: must be an integer`); break;
      case "enum": if (!s.values.includes(v)) errs.push(`${where}: "${v}" is not one of ${s.values.join(", ")}`); break;
      case "list": if (!Array.isArray(v)) errs.push(`${where}: must be a list`); else v.forEach((x, i) => walk(s.of, x, `${where}[${i}]`)); break;
      case "obj":
        if (typeof v !== "object" || Array.isArray(v)) { errs.push(`${where}: must be an object`); break; }
        for (const k of Object.keys(v)) if (!(k in s.fields)) errs.push(`${where}.${k}: unknown key (allowed: ${Object.keys(s.fields).join(" ")})`);
        for (const [k, fs] of Object.entries(s.fields)) walk(fs, v[k], `${where}.${k}`);
        break;
    }
  };
  for (const [k, s] of Object.entries(spec)) walk(s, r[k], k);
  // cross-field rules
  if ((r.lat == null) !== (r.lng == null)) errs.push("lat/lng: both or neither");
  if (r.lat != null && r.lng != null && (r.lat < BOX.s || r.lat > BOX.n || r.lng < BOX.w || r.lng > BOX.e)) errs.push(`lat/lng: ${r.lat},${r.lng} is outside the Tampa Bay box (swapped or mistyped?)`);
  if (r.lat != null && !r.geo_source && "geo_source" in spec) errs.push("geo_source: required when lat/lng are set");
  if (kind === "events") {
    if (!r.place && !r.location_text) errs.push("place/location_text: one is required");
    const inWin = (d) => d >= DATE_WINDOW.start && d <= DATE_WINDOW.end;
    if (r.date && !inWin(r.date) && !(r.end_date && r.end_date >= DATE_WINDOW.start)) errs.push(`date: ${r.date} is outside ${DATE_WINDOW.start}…${DATE_WINDOW.end}`);
    if (r.end_date && r.date && r.end_date < r.date) errs.push("end_date: before date");
    if (r.all_day && (r.start || r.end)) errs.push("all_day: no start/end with all_day");
  }
  if (kind === "experiences" && !r.departs_place && !r.departs_text && r.lat == null) errs.push("departs_place/departs_text/lat: say where it starts");
  if ((kind === "places" || kind === "stays") && r.status === "closed" && !r.status_note) errs.push("status_note: say when and why it closed");
  if (r.quote && !r.quote_source && !r.source_url) errs.push("quote_source: a quote needs its page");
  if (r.quote && r.quote.split(/\s+/).length > 45) errs.push("quote: keep quotes to 40 words");
  return errs;
}
