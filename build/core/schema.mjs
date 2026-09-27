/* ============================================================
   build/core/schema.mjs · OWNER: E1 (build engine; ported from Cincy Week)
   Per-file field specs for data/*.json and a tiny validator. Every problem
   is reported as
       data/<file>.json#<record id>.<field>: <message>
   so a typo points straight at the record.

   The shapes are research/SCHEMA.md's (machine copy: research/tools/schema.mjs):
   the build ACCEPTS every shape research/tools/check-slice.mjs accepts (the
   same fields, enums, area ids, date window and coordinate box, all copied
   into vocab.mjs), and adds `routes` (Passages, written in the build phase).
   It is stricter only on content rules that never bend: placeholders (its
   list is the union of both), "TBA" inside short text, HTML, http:, dates
   that do not exist (2026-13-40), and a few cross-file checks in load.mjs.

   Spec vocabulary (one object per field):
     t:   "id" | "text" (plain text) | "str" (short code/string) | "url" (https) |
          "date" (YYYY-MM-DD) | "time" (HH:MM) | "bool" | "num" | "int" |
          "enum" | "list" | "obj" | "map"
     req: the value must be present and non-null
     values: allowed values (enum)       of: item spec (list, map values)
     fields: nested spec (obj)           long: prose (length warning at 5,000)
     strict: an identity field (name, title, label): a placeholder word inside it ("Headliner TBA") fails;
             in any other text it warns (the source's own words)
   Unknown keys fail, listing the allowed ones. `notes` is allowed on every
   record and never rendered. To add a field: add it here, to research/SCHEMA.md
   (through its owner) and to build/CONTRACTS.md.
   ============================================================ */
import { HTML_IN_TEXT, PLACEHOLDER, PLACEHOLDER_WORD } from "./util.mjs";
import { ISO_DATE, HHMM } from "../../site/js/lib/time.js";
import {
  ID_RE, REGIONS, AREAS, AREA_KINDS, PLACE_KINDS, TOPICS, STATUS, STAY_KINDS, STAY_FEATURES, EXPERIENCE_KINDS, EVENT_KINDS,
  EVENT_STATUS, TRANSPORT_MODES, ERAS, LICENSES, GEO_SOURCES, MEDIA_SUBJECTS, ROUTE_STOP_KINDS, BOX,
} from "./vocab.mjs";

export { ID_RE, BOX };

const R = { req: true };
const id = (o = {}) => ({ t: "id", ...o }), text = (o = {}) => ({ t: "text", ...o }), str = (o = {}) => ({ t: "str", ...o });
const prose = (o = {}) => ({ t: "text", long: true, ...o });
/** An identity field (a name, a title, a label): a placeholder word inside it ("Headliner TBA") fails the build. In every
 *  other text field the words are the source's own ("the 2027 date is listed as \"DATE TBD\""): a warning. */
const ident = (o = {}) => ({ t: "text", strict: true, ...o });
const url = (o = {}) => ({ t: "url", ...o }), en = (values, o = {}) => ({ t: "enum", values, ...o });
const list = (of, o = {}) => ({ t: "list", of, ...o }), obj = (fields, o = {}) => ({ t: "obj", fields, ...o });
const num = (o = {}) => ({ t: "num", ...o }), int = (o = {}) => ({ t: "int", ...o }), bool = (o = {}) => ({ t: "bool", ...o });
const date = (o = {}) => ({ t: "date", ...o }), time = (o = {}) => ({ t: "time", ...o });
const AREA = Object.keys(AREAS), REGION = Object.keys(REGIONS);

/** Fields shared by every located record. */
const LOCATED = {
  area: en(AREA, R),
  address: text(), city: text(), state: str(), zip: str(),
  lat: num(), lng: num(), geo_source: en(GEO_SOURCES),
};
const SOURCED = { source_url: url(R), also_sources: list(url()), checked: date(R) };

/** The heritage block on a historic place or stay (research/SCHEMA.md). */
export const HERITAGE = obj({
  built: str(),                 // "1891" or "1888–1891": the year(s) as a source states them
  architect: text(), style: text(),
  designations: list(obj({ name: text(R), ref: str(), year: int(), url: url() })),
  era: en(ERAS),
  story: prose(),               // 2–5 factual sentences in our words, every claim in `sources`
  visiting: prose(),            // what a visitor can do there today, per the source
  sources: list(url()),
});

export const SPECS = {
  regions: {
    id: en(REGION, R), name: ident(R), lede: prose(), known_for: list(text()), official_url: url(),
    lat: num(), lng: num(), bounds: obj({ s: num(R), n: num(R), w: num(R), e: num(R) }),   // build-phase extras (center, frame)
    ...SOURCED,
  },
  areas: {
    id: en(AREA, R), name: ident(R), region: en(REGION, R), lat: num(R), lng: num(R),
    kind: en(AREA_KINDS, R), summary: prose(), known_for: list(text()), official_url: url(), ...SOURCED,
  },
  places: {
    id: id(R), name: ident(R), aliases: list(text()), kind: en(PLACE_KINDS, R), kinds: list(en(PLACE_KINDS)),
    topics: list(en(TOPICS)), ...LOCATED,
    url: url(), phone: str(), hours_text: text(), price_text: text(), is_free: bool(),
    summary: prose(), quote: prose(), quote_source: url(),
    heritage: HERITAGE, signature: bool(), status: en(STATUS, R), status_note: prose(),
    accessibility: prose(), parking_text: prose(), tags: list(str()), ...SOURCED,
  },
  stays: {
    id: id(R), name: ident(R), aliases: list(text()), kind: en(STAY_KINDS, R), brand: text(), collection: text(),
    ...LOCATED, url: url(), phone: str(), rooms: int(), opened: str(), features: list(en(STAY_FEATURES)),
    summary: prose(), quote: prose(), quote_source: url(), heritage: HERITAGE,
    status: en(STATUS, R), status_note: prose(), tags: list(str()), ...SOURCED,
  },
  experiences: {
    id: id(R), name: ident(R), operator: ident(R), kind: en(EXPERIENCE_KINDS, R), topics: list(en(TOPICS)),
    ...LOCATED, departs_place: id(), departs_text: text(),
    url: url(), booking_url: url(), phone: str(), duration_text: text(), price_text: text(), is_free: bool(),
    schedule_text: prose(), season_text: text(), ages_text: text(),
    summary: prose(), quote: prose(), quote_source: url(), status: en(STATUS, R), status_note: prose(),
    tags: list(str()), ...SOURCED,
  },
  events: {
    id: id(R), title: ident(R), kind: en(EVENT_KINDS, R), topics: list(en(TOPICS)), series: id(),
    date: date(R), end_date: date(), start: time(), end: time(), all_day: bool(),
    occurrences: list(obj({ date: date(R), start: time(), end: time() })), time_text: text(),
    place: id(), location_text: text(), area: en(AREA), lat: num(), lng: num(),
    cost: text(), is_free: bool(), url: url(), tickets_url: url(),
    description: prose(), summary: prose(), status: en(EVENT_STATUS, R), featured: bool(), tags: list(str()), ...SOURCED,
  },
  series: {
    id: id(R), name: ident(R), kind: en(EVENT_KINDS, R), topics: list(en(TOPICS)), months: list(int()),
    when_text: text(R), place: id(), location_text: text(), area: en(AREA),
    since: str(), url: url(), summary: prose(), quote: prose(), quote_source: url(), featured: bool(), ...SOURCED,
  },
  timeline: {
    id: id(R), era: en(ERAS, R), year: int(R), date: str(), title: ident(R), text: prose(R),
    places: list(id()), area: en(AREA), lat: num(), lng: num(), media: list(id()), ...SOURCED,
  },
  transport: {
    id: id(R), name: ident(R), mode: en(TRANSPORT_MODES, R), operator: ident(), regions: list(en(REGION)),
    url: url(), fare_text: text(), is_free: bool(), hours_text: text(), season_text: text(), summary: prose(),
    stops: list(obj({ name: text(R), lat: num(), lng: num(), place: id(), area: en(AREA) })),
    lat: num(), lng: num(), address: text(), code: str(), ...SOURCED,
  },
  faqs: { id: id(R), topic: ident(R), q: ident(R), a: prose(R), ...SOURCED },
  facts: { id: id(R), label: ident(R), value: ident(R), as_of: str(), source: ident(R), quote: prose(), ...SOURCED },
  media: {
    id: id(R), title: ident(R), creator: text(), year: str(), license: en(LICENSES, R), license_url: url(),
    credit: ident(R), file_url: url(R), page_url: url(R), subject_kind: en(MEDIA_SUBJECTS, R),
    subject: id(R), alt: ident(R), width: int(), height: int(),
  },
  /** Passages (build phase): curated multi-stop routes built only from sourced records. */
  routes: {
    id: id(R), title: ident(R), region: en(REGION, R), lede: prose(),
    stops: list(obj({ kind: en(ROUTE_STOP_KINDS, R), id: id(R), note: prose() }), R),
    source_url: url(), also_sources: list(url()), checked: date(),
  },
};
/** Files that must exist and be non-empty arrays; the rest may be missing or []. */
export const REQUIRED_NONEMPTY = ["places"];
export const ARRAY_FILES = Object.keys(SPECS);
/** Which collections share the one id space (URLs, trip codes, search). */
export const ID_SPACE = ["places", "stays", "experiences", "events", "series", "areas", "regions"];

function typeOk(spec, v) {
  switch (spec.t) {
    case "id": return typeof v === "string" && ID_RE.test(v);
    case "text": case "str": return typeof v === "string";
    case "url": return typeof v === "string";
    case "date": return typeof v === "string" && ISO_DATE.test(v);
    case "time": return typeof v === "string" && HHMM.test(v);
    case "bool": return typeof v === "boolean";
    case "num": return typeof v === "number" && Number.isFinite(v);
    case "int": return Number.isInteger(v);
    case "enum": return spec.values.includes(v);
    case "list": return Array.isArray(v);
    case "obj": case "map": return v && typeof v === "object" && !Array.isArray(v);
    default: return true;
  }
}
const expected = (spec) => ({
  id: "an id (lowercase letters, digits and hyphens)", text: "plain text", str: "a string", url: "an https:// URL",
  date: "a YYYY-MM-DD date", time: "an HH:MM time (24-hour)", bool: "true, false or null", num: "a number", int: "an integer",
  enum: `one of: ${spec.values?.join(", ")}`, list: "an array", obj: "an object", map: "an object",
}[spec.t] || spec.t);

/** Validate one value against a spec; push problems into `out` as [path, message, level]. */
function check(spec, v, path, out) {
  if (v === undefined || v === null) {
    if (spec.req) out.push([path, "is required (use a real value; unknown optional fields are null)", "error"]);
    return;
  }
  if (!typeOk(spec, v)) { out.push([path, `must be ${expected(spec)}, got ${JSON.stringify(v).slice(0, 60)}`, "error"]); return; }
  if (spec.t === "text" || spec.t === "str") {
    if (!v.trim()) { out.push([path, "is an empty string (use null for unknowns)", "error"]); return; }
    if (v !== v.trim()) out.push([path, "has leading or trailing whitespace", "warn"]);
    if (PLACEHOLDER.test(v.trim())) out.push([path, `is a placeholder ("${v.trim()}"): use null for unknowns`, "error"]);
    else if (PLACEHOLDER_WORD.test(v)) {
      // "Headliner TBA" in a name or title is a guess dressed as data: fail. Other text holds the source's own words
      // (a when_text that says the source lists "DATE TBD"), so there it is a warning: print the unknown as an unknown.
      const w = v.match(PLACEHOLDER_WORD)[0];
      out.push([path, `contains the placeholder "${w}": use null (or leave it out) for unknowns`, spec.strict || /^lorem/i.test(w) ? "error" : "warn"]);
    }
    if (HTML_IN_TEXT.test(v)) out.push([path, `is plain text: no HTML tags or entities (found "${v.match(HTML_IN_TEXT)[0]}")`, "error"]);
    if (spec.long && v.length > 5000) out.push([path, `is ${v.length} characters (over 5,000)`, "warn"]);
  }
  if (spec.t === "url") {
    if (/^http:/i.test(v)) { out.push([path, `insecure link: use https:// (${v})`, "error"]); return; }
    let u = null; try { u = new URL(v); } catch { /* below */ }
    if (!u || u.protocol !== "https:" || !/\./.test(u.hostname) || /\s/.test(v)) out.push([path, `must be an https:// URL, got ${JSON.stringify(v).slice(0, 80)}`, "error"]);
  }
  if (spec.t === "list") v.forEach((x, i) => check(spec.of, x, `${path}[${i}]`, out));
  if (spec.t === "map") for (const [k, x] of Object.entries(v)) check(spec.of, x, `${path}.${k}`, out);
  if (spec.t === "obj") checkFields(spec.fields, v, path, out);
}
function checkFields(fields, rec, path, out) {
  for (const k of Object.keys(rec)) {
    if (k === "notes") continue;
    if (!fields[k]) out.push([`${path}${path ? "." : ""}${k}`, `unknown key "${k}" (allowed: ${Object.keys(fields).join(", ")}, notes)`, "error"]);
  }
  for (const [k, spec] of Object.entries(fields)) check(spec, rec[k], `${path}${path ? "." : ""}${k}`, out);
}

/** Record-level rules research/tools/schema.mjs also applies (and a few the build adds). → [[path, msg, level]] */
function recordRules(file, r) {
  const out = [];
  const spec = SPECS[file];
  if ("lat" in spec) {
    const hasLat = r.lat !== undefined && r.lat !== null, hasLng = r.lng !== undefined && r.lng !== null;
    if (hasLat !== hasLng) out.push(["lat", "lat and lng must both be set or both be null", "error"]);
    else if (hasLat && typeof r.lat === "number" && typeof r.lng === "number") {
      if (r.lat < BOX.s || r.lat > BOX.n || r.lng < BOX.w || r.lng > BOX.e) out.push(["lat", `coordinates ${r.lat}, ${r.lng} are outside the Tampa Bay box (${BOX.s}–${BOX.n} N, ${BOX.w}–${BOX.e}): swapped or mistyped?`, "error"]);
      if ("geo_source" in spec && !r.geo_source) out.push(["geo_source", "is required when lat/lng are set (census, photon, official, wikipedia, osm, manual)", "error"]);
    }
  }
  if (file === "transport") (r.stops || []).forEach((s, i) => {
    if (!s || typeof s !== "object") return;
    if ((s.lat == null) !== (s.lng == null)) out.push([`stops[${i}].lat`, "lat and lng must both be set or both be null", "error"]);
    else if (typeof s.lat === "number" && typeof s.lng === "number" && (s.lat < BOX.s || s.lat > BOX.n || s.lng < BOX.w || s.lng > BOX.e)) out.push([`stops[${i}].lat`, `coordinates ${s.lat}, ${s.lng} are outside the Tampa Bay box`, "error"]);
  });
  if (file === "events") {
    if (!r.place && !r.location_text) out.push(["place", "is null: give a place (a places.json id) or a location_text", "error"]);
    if (r.end_date && r.date && r.end_date < r.date) out.push(["end_date", `is before date (${r.end_date} < ${r.date})`, "error"]);
    if (r.all_day && (r.start || r.end)) out.push(["all_day", "an all-day event has no start or end time", "error"]);
    if (!r.start && r.end) out.push(["end", "has an end time but no start time", "error"]);
    if (r.start && r.end && HHMM.test(r.start) && HHMM.test(r.end) && r.end < r.start && r.end > "06:00") out.push(["end", `${r.end} is before start ${r.start}: an event may end after midnight only by 06:00 (suspicious times)`, "error"]);
    (r.occurrences || []).forEach((o, i) => {
      if (o && o.start && o.end && HHMM.test(o.start) && HHMM.test(o.end) && o.end < o.start && o.end > "06:00") out.push([`occurrences[${i}].end`, `${o.end} is before start ${o.start} (suspicious times)`, "error"]);
      if (o && !o.start && o.end) out.push([`occurrences[${i}].end`, "has an end time but no start time", "error"]);
    });
  }
  if (file === "experiences" && !r.departs_place && !r.departs_text && r.lat == null) out.push(["departs_place", "say where it starts: departs_place, departs_text or the departure point's lat/lng", "error"]);
  if ((file === "places" || file === "stays" || file === "experiences") && r.status === "closed" && !r.status_note) out.push(["status_note", "is required when status is closed (say when and why it closed)", "error"]);
  if (r.quote && typeof r.quote === "string") {
    if (!r.quote_source && !r.source_url && file !== "facts") out.push(["quote_source", "a quote needs its page", "error"]);
    if (file !== "facts" && r.quote.trim().split(/\s+/).length > 45) out.push(["quote", `is ${r.quote.trim().split(/\s+/).length} words: keep quotes to 40`, "error"]);
  }
  if (file === "series") (r.months || []).forEach((m, i) => { if (Number.isInteger(m) && (m < 1 || m > 12)) out.push([`months[${i}]`, `${m} is not a month (1–12)`, "error"]); });
  if (file === "areas" && r.id && r.region && AREAS[r.id] && AREAS[r.id] !== r.region) out.push(["region", `"${r.region}" is not the region of area "${r.id}" (it is "${AREAS[r.id]}", SPEC.md §4.1)`, "error"]);
  if (file === "stays" && Number.isInteger(r.rooms) && r.rooms < 1) out.push(["rooms", `must be 1 or more, got ${r.rooms}`, "error"]);
  if (file === "routes" && Array.isArray(r.stops) && r.stops.length < 2) out.push(["stops", "a passage needs at least two stops", "error"]);
  return out;
}

/** After validation, blank out values of the wrong type (in memory only) so the loader can keep going and
 *  report every other problem instead of crashing on the first bad shape: wrong-typed lists become [],
 *  wrong-typed objects and scalars become null, and list items of the wrong type are dropped. The errors
 *  were already recorded by validateFile, so the build still fails. */
export function coerce(file, records) {
  const spec = SPECS[file];
  if (!spec || !Array.isArray(records)) return;
  for (const rec of records) {
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) continue;
    for (const [k, f] of Object.entries(spec)) {
      const v = rec[k];
      if (v === undefined || v === null) continue;
      if (!typeOk(f, v)) rec[k] = f.t === "list" ? [] : null;
      else if (f.t === "list") rec[k] = v.filter((x) => x !== null && x !== undefined && typeOk(f.of, x));
    }
  }
}

/** Validate a whole file. Returns [{ where, msg, level }]. */
export function validateFile(file, records) {
  const spec = SPECS[file];
  const out = [];
  if (!Array.isArray(records)) return [{ where: `data/${file}.json`, msg: "must be a JSON array", level: "error" }];
  records.forEach((rec, i) => {
    const rid = rec && typeof rec.id === "string" && rec.id ? rec.id : `[${i}]`;
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) { out.push([`#${rid}`, "must be an object", "error"]); return; }
    const probs = [];
    checkFields(spec, rec, "", probs);
    probs.push(...recordRules(file, rec));
    for (const [p, m, l] of probs) out.push([`#${rid}.${p}`, m, l]);
  });
  return out.map(([p, msg, level]) => ({ where: `data/${file}.json${p}`, msg, level }));
}
