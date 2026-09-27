/* ============================================================
   scripts/merge-lib.mjs · OWNER: Merge (research → data/) · pure helpers, no I/O
   Shared by scripts/merge-research.mjs and tests/merge.test.mjs. Nothing here reads or writes a file or the
   network: the script owns the tables, the logs and the geocoder. Every judgment these helpers make is returned
   (conflicts, flags) so the script can print it into data/README.md.

     nameKey addrKey streetKey normFor            comparison keys (names, street addresses, per-field values)
     isVerified                                   a verifier pass is recorded in the record's notes
     GEO_RANK geoRank pickCoords haversine        SPEC §7: official > OpenStreetMap by name > Census > Wikipedia > manual
     union mergeDesignations mergeHeritage        list unions and the heritage block
     mergeGroup                                   same-id records from several slices → one record + its conflicts
     resolveIdCollisions foldPlaceIntoStay        one id space across places stays experiences events series areas regions
     dupCandidates                                fuzzy duplicates (name or street address, within ~150 m)
     firstSegmentPlace                            an event's location_text → a place id when it clearly names one
     weekdayMismatches guessWords                 QA flags (a day name that does not match the date; guess-like prices)
     acceptGeocode                                is a geocoder match clearly this record?
   ============================================================ */

/* ---------------------------------------------------------------- keys ---------------------------------------------------------------- */
const deaccent = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
/** A name for comparison: lowercase, accents and apostrophes dropped, & → and, punctuation → space, no leading "the". */
export const nameKey = (s) => deaccent(s).toLowerCase().replace(/&/g, " and ").replace(/['’`]/g, "")
  .replace(/[^a-z0-9]+/g, " ").trim().replace(/^the\s+/, "").trim();

const ADDR_ABBR = [
  [/\bnortheast\b/g, "ne"], [/\bnorthwest\b/g, "nw"], [/\bsoutheast\b/g, "se"], [/\bsouthwest\b/g, "sw"],
  [/\bnorth\b/g, "n"], [/\bsouth\b/g, "s"], [/\beast\b/g, "e"], [/\bwest\b/g, "w"],
  [/\bstreet\b/g, "st"], [/\bavenue\b/g, "ave"], [/\bav\b/g, "ave"], [/\bboulevard\b/g, "blvd"], [/\bdrive\b/g, "dr"],
  [/\broad\b/g, "rd"], [/\blane\b/g, "ln"], [/\bcourt\b/g, "ct"], [/\bplace\b/g, "pl"], [/\bparkway\b/g, "pkwy"],
  [/\bhighway\b/g, "hwy"], [/\bcircle\b/g, "cir"], [/\bterrace\b/g, "ter"], [/\bcauseway\b/g, "cswy"], [/\bplaza\b/g, "plz"],
  [/\bu s\b/g, "us"], [/\bstate road\b/g, "sr"], [/\bstate rd\b/g, "sr"], [/\bcounty road\b/g, "cr"], [/\bcounty rd\b/g, "cr"],
  [/\bfirst\b/g, "1st"], [/\bsecond\b/g, "2nd"], [/\bthird\b/g, "3rd"], [/\bfourth\b/g, "4th"], [/\bfifth\b/g, "5th"],
];
/** A street address for comparison ("1710 N. Highland Avenue" = "1710 N Highland Ave"); suite/unit parts dropped. */
export function addrKey(s) {
  if (s == null) return "";
  let a = deaccent(s).toLowerCase().replace(/#.*$/, "").replace(/\b(suite|ste|unit|apt)\b.*$/, "").replace(/[^a-z0-9]+/g, " ").trim();
  for (const [re, to] of ADDR_ABBR) a = a.replace(re, to);
  return a.replace(/\s+/g, " ").trim();
}
/** The street line of an address, split into house number and street ({ no: "310", street: "w 7th ave" }), or null
 *  when the line does not start with a house number ("Beach Drive NE", "St. Pete Pier approach"). */
export function streetKey(s) {
  const line = String(s ?? "").split(",")[0];
  const k = addrKey(line);
  const m = /^(\d+[a-z]?)\s+(.+)$/.exec(k);
  return m ? { no: m[1], street: m[2] } : null;
}
const digits = (s) => String(s ?? "").replace(/\D/g, "").slice(-10);
/** The comparison form of a field's value: two values with the same form are the same fact written differently. */
export function normFor(field, v) {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v) || typeof v === "object") return JSON.stringify(v);
  if (typeof v !== "string") return String(v);
  if (field === "phone") return digits(v);
  if (field === "address") return addrKey(v);
  if (field === "url" || field === "booking_url" || field === "tickets_url" || field === "official_url" || field === "source_url" || field === "quote_source")
    return v.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "").replace(/[?#].*$/, "");
  return nameKey(v).replace(/\s+/g, " ");
}

/** A verifier pass left its mark in the record's notes ("Verified 2026-09-27: …", "Verifier (2026-09-27): …",
 *  "Added by the verifier (Sep 27, 2026)"). A researcher's request to the verifier ("Verifier: check …") is not one. */
export const isVerified = (rec) => /\b(?:Verified|Verifier)\s*\(?\s*\d{4}-\d{2}-\d{2}|\bAdded by the verifier\b/.test(String(rec?.notes || ""));

/* ---------------------------------------------------------------- geo ---------------------------------------------------------------- */
export function haversine(a, b) {
  const R = 6371008.8, t = Math.PI / 180;
  const dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}
/** SPEC §7 (owner's decision, Sep 27): (1) coordinates the operator publishes; (2) an OpenStreetMap feature matched by
 *  name (Photon, or read from OSM directly), which marks the actual building, beach, park or pier; (3) a US Census address
 *  match (street centerline, can be a block off); (4) Wikipedia; manual placements last. */
export const GEO_RANK = { official: 0, photon: 1, osm: 1, census: 2, wikipedia: 3, manual: 4 };
export const geoRank = (src) => (src in GEO_RANK ? GEO_RANK[src] : 9);
const hasLL = (r) => typeof r?.lat === "number" && typeof r?.lng === "number";
/** parts: [{ slice, rec, verified, order }] → { lat, lng, geo_source, from, disagreements: [{ slice, geo_source, d }] } or null.
 *  The best-ranked point wins (then the verified record, then the owner); every other point more than `flagM` meters
 *  away is returned as a disagreement for QA. Points are never averaged. */
export function pickCoords(parts, { flagM = 250 } = {}) {
  const c = parts.filter((p) => hasLL(p.rec));
  if (!c.length) return null;
  const sorted = [...c].sort((a, b) => geoRank(a.rec.geo_source) - geoRank(b.rec.geo_source) || (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || a.order - b.order);
  const w = sorted[0];
  const disagreements = sorted.slice(1).map((p) => ({ slice: p.slice, geo_source: p.rec.geo_source || null, d: Math.round(haversine(w.rec, p.rec)) })).filter((x) => x.d > flagM);
  return { lat: w.rec.lat, lng: w.rec.lng, geo_source: w.rec.geo_source ?? null, from: w.slice, disagreements };
}

/* ---------------------------------------------------------------- lists and heritage ---------------------------------------------------------------- */
/** Union of lists in order; strings compared through `key` (default: exact), first spelling kept. */
export function union(lists, key = (x) => (typeof x === "string" ? x : JSON.stringify(x))) {
  const out = [], seen = new Set();
  for (const l of lists) for (const x of l || []) {
    if (x === null || x === undefined) continue;
    const k = key(x);
    if (seen.has(k)) continue;
    seen.add(k); out.push(x);
  }
  return out;
}
const desigKey = (d) => `${nameKey(d?.name)}|${String(d?.ref ?? "").trim().toLowerCase()}`;
/** Designations: union by name + ref; entries with the same key fill each other's missing year and url. */
export function mergeDesignations(lists) {
  const out = new Map();
  for (const l of lists) for (const d of l || []) {
    if (!d || !d.name) continue;
    const k = desigKey(d);
    if (!out.has(k)) { out.set(k, { ...d }); continue; }
    const cur = out.get(k);
    for (const f of ["ref", "year", "url"]) if ((cur[f] === null || cur[f] === undefined) && d[f] != null) cur[f] = d[f];
  }
  return [...out.values()];
}
const HERITAGE_SCALARS = ["built", "architect", "style", "era", "story", "visiting"];
/** blocks: [{ slice, h }] best first (history-* first). Scalars from the first block that has them (history-* owns
 *  story and visiting); designations and sources are unions. Returns { heritage, conflicts: [{ field, a, b }] }. */
export function mergeHeritage(blocks) {
  const bs = blocks.filter((b) => b.h && typeof b.h === "object");
  if (!bs.length) return { heritage: null, conflicts: [] };
  const h = {}, conflicts = [];
  for (const f of HERITAGE_SCALARS) {
    const have = bs.filter((b) => b.h[f] !== null && b.h[f] !== undefined);
    if (!have.length) { if (bs.some((b) => f in b.h)) h[f] = null; continue; }
    h[f] = have[0].h[f];
    for (const o of have.slice(1)) if (normFor(f, o.h[f]) !== normFor(f, h[f])) conflicts.push({ field: `heritage.${f}`, a: { slice: have[0].slice, v: h[f] }, b: { slice: o.slice, v: o.h[f] } });
  }
  h.designations = mergeDesignations(bs.map((b) => b.h.designations));
  h.sources = union(bs.map((b) => b.h.sources));
  // canonical order (research/SCHEMA.md): built architect style designations era story visiting sources
  const order = ["built", "architect", "style", "designations", "era", "story", "visiting", "sources"];
  const out = {};
  for (const k of order) if (k in h) out[k] = h[k];
  return { heritage: out, conflicts };
}

/* ---------------------------------------------------------------- mergeGroup ---------------------------------------------------------------- */
/** Fields merged as unions (never conflicts). `months` is sorted after the union. */
export const LIST_FIELDS = new Set(["aliases", "kinds", "topics", "tags", "features", "months", "known_for"]);
/** Editorial flags: true when any slice sets it (a slice that researched the record calls it signature). */
export const OR_FIELDS = new Set(["featured", "signature"]);
/** Text in our words or quoted: a difference is a variant, not a contradiction (logged separately from fact conflicts). */
export const TEXT_FIELDS = new Set(["summary", "quote", "lede", "accessibility", "parking_text", "status_note", "text", "a", "description", "schedule_text", "heritage.story", "heritage.visiting"]);
const HANDLED = new Set(["id", "notes", "lat", "lng", "geo_source", "heritage", "quote", "quote_source", "status", "status_note", "source_url", "also_sources", "checked"]);

/**
 * Merge records that share an id. parts: [{ slice, rec }] in owner order (first = owner for this record).
 * fieldOrder: the collection's field list (build/core/schema.mjs SPECS order) for a canonical key order.
 * isHistory(slice): the slices that own heritage blocks.
 * Returns { rec, conflicts: [{ id, field, winner: { slice, v }, loser: { slice, v }, kind: "fact"|"text"|"flag", why }],
 *           coords: pickCoords result, status: { chosen, others } | null }.
 * Rules: the verifier-edited record wins over an unverified one, then the owner; heritage from history-*; coordinates by
 * GEO_RANK; lists are unions; the other names become aliases; the other kinds become kinds; status by the most recent
 * `checked` evidence; source_url from the winner, every other slice's source_url in also_sources; checked = the latest.
 */
export function mergeGroup(parts0, { fieldOrder, isHistory = () => false, nameField = "name" } = {}) {
  const parts = parts0.map((p, i) => ({ ...p, order: i, verified: p.verified ?? isVerified(p.rec) }));
  const id = parts[0].rec.id;
  const conflicts = [];
  const general = [...parts].sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || a.order - b.order);
  const why = (w) => (w.verified && !general.every((p) => p.verified) ? "verified" : "owner");
  const out = {};
  const keys = new Set(parts.flatMap((p) => Object.keys(p.rec)));
  const present = (f) => keys.has(f);
  const allowed = (f) => !fieldOrder || fieldOrder.includes(f);   // a field the collection's schema has

  for (const f of keys) {
    if (HANDLED.has(f) || LIST_FIELDS.has(f) || OR_FIELDS.has(f)) continue;
    const have = general.filter((p) => p.rec[f] !== null && p.rec[f] !== undefined);
    if (!have.length) { out[f] = null; continue; }
    const w = have[0];
    out[f] = w.rec[f];
    for (const o of have.slice(1)) {
      if (normFor(f, o.rec[f]) === normFor(f, w.rec[f])) continue;
      const kind = TEXT_FIELDS.has(f) ? "text" : "fact";
      conflicts.push({ id, field: f, winner: { slice: w.slice, v: w.rec[f] }, loser: { slice: o.slice, v: o.rec[f] }, kind, why: why(w) });
    }
  }
  // lists: unions, owner-ranked order
  for (const f of LIST_FIELDS) if (present(f)) {
    let v = union(general.map((p) => p.rec[f]), f === "aliases" ? nameKey : undefined);
    if (f === "months") v = [...new Set(v)].sort((a, b) => a - b);
    out[f] = v;
  }
  // the other names are aliases; the other kinds are secondary kinds
  if (present(nameField) && allowed("aliases")) {
    const others = parts.map((p) => p.rec[nameField]).filter((n) => n && nameKey(n) !== nameKey(out[nameField]));
    if (others.length) out.aliases = union([out.aliases || [], others], nameKey).filter((a) => nameKey(a) !== nameKey(out[nameField]));
  }
  if (allowed("kinds") && (present("kinds") || parts.length > 1) && out.kind) out.kinds = union([parts.map((p) => p.rec.kind), out.kinds || []]).filter((k) => k && k !== out.kind);
  // editorial flags
  for (const f of OR_FIELDS) if (present(f)) {
    const vals = parts.filter((p) => typeof p.rec[f] === "boolean");
    out[f] = vals.length ? vals.some((p) => p.rec[f]) : null;
    if (new Set(vals.map((p) => p.rec[f])).size > 1) {
      const t = vals.find((p) => p.rec[f]), n = vals.find((p) => !p.rec[f]);
      conflicts.push({ id, field: f, winner: { slice: t.slice, v: true }, loser: { slice: n.slice, v: false }, kind: "flag", why: "any slice's flag" });
    }
  }
  // heritage: history-* first
  if (present("heritage")) {
    const hs = [...parts].sort((a, b) => (isHistory(b.slice) ? 1 : 0) - (isHistory(a.slice) ? 1 : 0) || (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || a.order - b.order);
    const { heritage, conflicts: hc } = mergeHeritage(hs.map((p) => ({ slice: p.slice, h: p.rec.heritage })));
    out.heritage = heritage;
    for (const c of hc) conflicts.push({ id, field: c.field, winner: c.a, loser: c.b, kind: TEXT_FIELDS.has(c.field) ? "text" : "fact", why: isHistory(c.a.slice) ? "history slice owns heritage" : "owner" });
  }
  // coordinates
  let coords = null;
  if (present("lat") || present("lng")) {
    coords = pickCoords(parts);
    out.lat = coords ? coords.lat : null; out.lng = coords ? coords.lng : null;
    if (present("geo_source")) out.geo_source = coords ? coords.geo_source : null;
  }
  // status: the most recent `checked` evidence, then verified, then owner
  let status = null;
  if (present("status")) {
    const have = parts.filter((p) => p.rec.status);
    const sorted = [...have].sort((a, b) => String(b.rec.checked || "").localeCompare(String(a.rec.checked || "")) || (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || a.order - b.order);
    const w = sorted[0];
    out.status = w ? w.rec.status : null;
    const noteFrom = w && w.rec.status_note ? w : general.find((p) => p.rec.status === out.status && p.rec.status_note);
    if (present("status_note")) out.status_note = noteFrom ? noteFrom.rec.status_note : null;
    if (new Set(have.map((p) => p.rec.status)).size > 1) {
      status = { chosen: { slice: w.slice, status: w.rec.status, checked: w.rec.checked, note: w.rec.status_note || null }, others: sorted.slice(1).filter((p) => p.rec.status !== w.rec.status).map((p) => ({ slice: p.slice, status: p.rec.status, checked: p.rec.checked, note: p.rec.status_note || null })) };
      for (const o of status.others) conflicts.push({ id, field: "status", winner: { slice: w.slice, v: w.rec.status }, loser: { slice: o.slice, v: o.status }, kind: "fact", why: "most recent checked evidence (then verified, then owner)" });
    } else if (present("status_note")) {
      for (const o of general.filter((p) => p.rec.status_note && p !== noteFrom)) if (normFor("status_note", o.rec.status_note) !== normFor("status_note", out.status_note))
        conflicts.push({ id, field: "status_note", winner: { slice: noteFrom.slice, v: out.status_note }, loser: { slice: o.slice, v: o.rec.status_note }, kind: "text", why: why(noteFrom) });
    }
  }
  // source: the winner's page; every other page read is an also_source
  const src = general.find((p) => p.rec.source_url) || general[0];
  if (present("source_url")) out.source_url = src.rec.source_url ?? null;
  // quote + its page, as one unit
  if (present("quote")) {
    const have = general.filter((p) => p.rec.quote);
    const q = have[0];
    out.quote = q ? q.rec.quote : null;
    const qs = q ? q.rec.quote_source || q.rec.source_url : null;
    if (allowed("quote_source") && (present("quote_source") || (qs && normFor("source_url", qs) !== normFor("source_url", out.source_url)))) out.quote_source = qs && normFor("source_url", qs) !== normFor("source_url", out.source_url) ? qs : null;
    for (const o of have.slice(1)) if (normFor("quote", o.rec.quote) !== normFor("quote", out.quote))
      conflicts.push({ id, field: "quote", winner: { slice: q.slice, v: out.quote }, loser: { slice: o.slice, v: o.rec.quote }, kind: "text", why: why(q) });
  }
  if (allowed("also_sources") && (present("also_sources") || parts.length > 1)) {
    const all = union([...general.map((p) => p.rec.also_sources), general.map((p) => p.rec.source_url)], (u) => normFor("source_url", u));
    out.also_sources = all.filter((u) => normFor("source_url", u) !== normFor("source_url", out.source_url) && normFor("source_url", u) !== normFor("source_url", out.quote_source));
  }
  if (present("checked")) out.checked = parts.map((p) => p.rec.checked).filter(Boolean).sort().pop() ?? null;
  // notes: every slice's, labeled (never rendered)
  const notes = parts.filter((p) => p.rec.notes).map((p) => (parts.length > 1 ? `[${p.slice}] ${p.rec.notes}` : p.rec.notes));
  if (parts.length > 1) notes.unshift(`Merged from ${parts.map((p) => p.slice + (p.verified ? " (verified)" : "")).join(" + ")}; owner ${parts[0].slice}.`);
  if (notes.length) out.notes = notes.join(" | ");
  out.id = id;
  return { rec: canonical(out, fieldOrder), conflicts, coords, status };
}

/** Key order: id, then the schema's field order, then anything else, then notes. */
export function canonical(rec, fieldOrder = []) {
  const out = { id: rec.id };
  for (const k of fieldOrder) if (k !== "id" && k in rec) out[k] = rec[k];
  for (const k of Object.keys(rec)) if (!(k in out) && k !== "notes") out[k] = rec[k];
  if ("notes" in rec && rec.notes != null) out.notes = rec.notes;
  return out;
}

/* ---------------------------------------------------------------- one id space ---------------------------------------------------------------- */
/**
 * collections: { places: [rec], stays: [rec], … } (after same-id merges). rules: an array of
 *   { a: "series", b: "*", action: "suffix", suffix: "-series" }  → rename the `a` record
 *   { a: "places", b: "stays", action: "fold" }                    → fold the place into the stay (ONE stay)
 * explicit: { "series:gulfport-tuesday-fresh-market": "gulfport-tuesday-fresh-market-series" } wins over the rules.
 * Returns { renames: [{ collection, from, to, other, why }], folds: [{ from, to }], unresolved: [{ id, collections }] }.
 * The records are not changed: the caller applies the result (so it can log and rewrite references).
 */
export function resolveIdCollisions(collections, rules, explicit = {}, space = ["places", "stays", "experiences", "events", "series", "areas", "regions"]) {
  const owners = new Map();
  for (const c of space) for (const r of collections[c] || []) {
    if (!owners.has(r.id)) owners.set(r.id, []);
    owners.get(r.id).push(c);
  }
  const taken = new Set(owners.keys());
  const renames = [], folds = [], unresolved = [];
  for (const [id, cs] of [...owners].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (cs.length < 2) continue;
    const left = new Set(cs);
    for (const c of cs) {
      const ex = explicit[`${c}:${id}`];
      if (ex && left.size > 1) { renames.push({ collection: c, from: id, to: ex, other: cs.filter((x) => x !== c), why: "explicit table" }); left.delete(c); taken.add(ex); }
    }
    for (const rule of rules) {
      if (left.size < 2 || !left.has(rule.a)) continue;
      const others = [...left].filter((x) => x !== rule.a);
      if (!(rule.b === "*" || others.includes(rule.b))) continue;
      if (rule.action === "fold") { folds.push({ from: id, to: id, other: rule.b }); left.delete(rule.a); }
      else if (rule.action === "suffix") {
        let to = `${id}${rule.suffix}`;
        for (let n = 2; taken.has(to); n++) to = `${id}${rule.suffix}-${n}`;
        taken.add(to);
        renames.push({ collection: rule.a, from: id, to, other: others, why: `rule: a ${rule.a} id that is also a ${others.join("/")} id gets "${rule.suffix}"` });
        left.delete(rule.a);
      }
    }
    if (left.size > 1) unresolved.push({ id, collections: [...left] });
  }
  return { renames, folds, unresolved };
}

/** A historic hotel held as both a place and a stay is ONE stay: the place's heritage, tags, aliases, topics-as-tags
 *  and sources fold into the stay. Returns the new stay record (the inputs are not changed). */
export function foldPlaceIntoStay(place, stay, { fieldOrder } = {}) {
  const out = { ...stay };
  const { heritage } = mergeHeritage([{ slice: "place", h: place.heritage }, { slice: "stay", h: stay.heritage }]);
  if (heritage) out.heritage = heritage;
  out.aliases = union([stay.aliases || [], [place.name], place.aliases || []], nameKey).filter((a) => nameKey(a) !== nameKey(stay.name));
  out.tags = union([stay.tags || [], place.tags || []]);
  out.also_sources = union([stay.also_sources || [], [place.source_url], place.also_sources || []], (u) => normFor("source_url", u))
    .filter((u) => normFor("source_url", u) !== normFor("source_url", stay.source_url));
  out.checked = [stay.checked, place.checked].filter(Boolean).sort().pop();
  out.notes = [stay.notes, `Folded in the place record "${place.id}" (a hotel that is also a landmark is one stay with a heritage block).`, place.notes ? `[place] ${place.notes}` : null].filter(Boolean).join(" | ");
  return canonical(out, fieldOrder);
}

/* ---------------------------------------------------------------- fuzzy duplicates ---------------------------------------------------------------- */
/** A title without its edition words ("32nd Annual Tampa Am 2026" → "tampa am"). */
export const titleKey = (s) => nameKey(s).replace(/\b(20\d\d|annual|\d+(st|nd|rd|th))\b/g, " ").replace(/\s+/g, " ").trim();
const titleTokens = (s) => new Set(titleKey(s).split(/\s+/).filter((w) => w.length > 2 && !["and", "the", "for", "with", "vs"].includes(w)));
export function tokenOverlap(a, b) {
  const A = titleTokens(a), B = titleTokens(b);
  let i = 0; for (const x of A) if (B.has(x)) i++;
  return { shared: i, ratio: i / Math.max(1, Math.min(A.size, B.size)) };
}
/**
 * Fuzzy duplicate candidates (never merged here: the script's DUP_MERGES / DUP_DISTINCT tables decide).
 * items: [{ c: collection, rec }]. Located records: the same name (or an alias) or the same street address, and within
 * `radiusM` when both have coordinates (two locations of one chain far apart are not candidates); across collections
 * (place ↔ stay) only the name counts. Experiences: the same name and operator. Events: overlapping dates at the same
 * place with most title words shared.
 */
export function dupCandidates(items, { radiusM = 150 } = {}) {
  const out = [];
  const names = (r) => [r.name || r.title, ...(r.aliases || [])].filter(Boolean).map(nameKey).filter(Boolean);
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    if (a.c === b.c && a.rec.id === b.rec.id) continue;
    const reasons = [];
    let d = hasLL(a.rec) && hasLL(b.rec) ? Math.round(haversine(a.rec, b.rec)) : null;
    if (a.c === "events" || b.c === "events") {
      if (a.c !== b.c) continue;
      const ae = a.rec.end_date || a.rec.date, be = b.rec.end_date || b.rec.date;
      if (ae < b.rec.date || be < a.rec.date) continue;
      const where = (r) => r.place || nameKey(r.location_text || "");
      const t = tokenOverlap(a.rec.title, b.rec.title);
      if (titleKey(a.rec.title) && titleKey(a.rec.title) === titleKey(b.rec.title)) reasons.push("same title, overlapping dates");
      else if (where(a.rec) && where(a.rec) === where(b.rec) && t.shared >= 2 && t.ratio >= 0.6) reasons.push(`same place, ${t.shared} title words shared`);
      if (reasons.length) out.push({ a: `${a.c}:${a.rec.id}`, b: `${b.c}:${b.rec.id}`, reasons, d });
      continue;
    }
    if (a.c === "experiences" || b.c === "experiences") {
      if (a.c !== b.c) continue;
      const sameName = names(a.rec).some((n) => names(b.rec).includes(n));
      if (sameName && nameKey(a.rec.operator) === nameKey(b.rec.operator)) reasons.push("same name and operator");
      else if (sameName && d !== null && d <= radiusM) reasons.push(`same name within ${d} m`);
      if (reasons.length) out.push({ a: `${a.c}:${a.rec.id}`, b: `${b.c}:${b.rec.id}`, reasons, d });
      continue;
    }
    const near = d === null || d <= radiusM;
    if (!near) continue;
    if (names(a.rec).some((n) => names(b.rec).includes(n))) reasons.push("same name");
    if (a.c === b.c) {
      const ka = streetKey(a.rec.address), kb = streetKey(b.rec.address);
      if (ka && kb && ka.no === kb.no && ka.street === kb.street) reasons.push("same street address");
    }
    if (reasons.length) out.push({ a: `${a.c}:${a.rec.id}`, b: `${b.c}:${b.rec.id}`, reasons, d });
  }
  return out;
}

/* ---------------------------------------------------------------- references ---------------------------------------------------------------- */
/** location_text → place id when its first part (before a comma, semicolon, parenthesis or colon) is exactly a place's
 *  name or alias, and names one place ("Largo Central Park, 101 Central Park Dr." → largo-central-park). Texts that
 *  join several places anywhere ("St. Nicholas Cathedral (…) and Spring Bayou", "a; b") are left alone.
 *  placeKeys: Map(nameKey → place id). */
export function firstSegmentPlace(text, placeKeys) {
  if (!text) return null;
  const whole = placeKeys.get(nameKey(text));
  if (whole) return { id: whole, how: "whole text" };
  if (/\band\b|&|;|\bor\b/i.test(String(text))) return null;          // several places ("… Cathedral and Spring Bayou")
  const seg = String(text).split(/[,(:]/)[0].trim();
  if (!seg || /\bfrom\b|\bstarts\b/i.test(seg)) return null;
  const id = placeKeys.get(nameKey(seg));
  return id ? { id, how: `first part "${seg}"` } : null;
}

/* ---------------------------------------------------------------- QA flags ---------------------------------------------------------------- */
const DOW = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const dowOf = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
/** "Saturday, October 17" / "Sat., Oct. 17" / "Friday (Oct 16)" / "Sunday, March 1 in 2026" in a text, checked against the
 *  calendar. `years(month)` gives the candidate years when the text names none (an event: its own dates' years; a series:
 *  the editions it may describe); the day name must fit one of them. The end of a day range ("Fri.-Sun., March 5-7") is
 *  skipped: its date is the range's first day. Returns [{ text, named, actual, date }]. */
export function weekdayMismatches(text, { years = (m) => [m >= 9 ? 2026 : 2027] } = {}) {
  const out = [];
  const re = /(?<![-–]\s?)\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|nesday|urday|sday|rsday)?\.?,?\s*\(?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?!\s*[-–]\s*\d)(?:,?\s*(?:in\s+)?(20\d\d))?/gi;
  for (const m of String(text || "").matchAll(re)) {
    const named = DOW.findIndex((d) => d.startsWith(m[1].toLowerCase().slice(0, 3)));
    const mo = MONTHS[m[2].toLowerCase()], day = Number(m[3]);
    if (!mo || day < 1 || day > 31) continue;
    const ys = m[4] ? [Number(m[4])] : years(mo);
    if (ys.some((y) => dowOf(y, mo, day) === named)) continue;
    const y = ys[ys.length - 1];
    out.push({ text: m[0], named: DOW[named], actual: DOW[dowOf(y, mo, day)], date: `${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}` });
  }
  return out;
}
/** Words that make a price, hour or duration read like an estimate rather than the source's statement. */
export const GUESS_WORDS = /\b(?:about|approx(?:\.|imately)?|around|roughly|estimated?|probably|likely|call for|or so|guess(?:ed)?)\b|~/i;
export const guessWords = (s) => (typeof s === "string" && GUESS_WORDS.test(s) ? s.match(GUESS_WORDS)[0] : null);
export const wordCount = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

/* ---------------------------------------------------------------- geocoding acceptance ---------------------------------------------------------------- */
/**
 * Is a geocoder match clearly this record? rec: { name, aliases, address }, hit: { geo_source, matched, lat, lng },
 * opts: { center: { lat, lng }, maxKm }. Census and address-based Photon hits must match the house number and the street
 * (direction included: "W 7th Ave" is not "E 7th Ave"); a Photon hit by name must carry the record's name (or an
 * alias), and its house number, when it has one, must agree with the record's. Returns { ok, why }.
 */
export function acceptGeocode(rec, hit, { center = null, maxKm = 30, byName = false } = {}) {
  if (!hit || hit.error || typeof hit.lat !== "number") return { ok: false, why: "no match" };
  if (center && haversine(center, hit) > maxKm * 1000) return { ok: false, why: `match is ${Math.round(haversine(center, hit) / 1000)} km from the area center` };
  const want = streetKey(rec.address);
  const matched = String(hit.matched || "");
  if (!byName) {
    const parts = matched.split(",").map((s) => s.trim());
    // Census: "310 W 7TH AVE, TAMPA, FL, 33602"; Photon: "name, housenumber, street, city, postcode"
    let got = streetKey(parts[0]);
    if (!got && hit.geo_source === "photon") {
      const i = parts.findIndex((p) => /^\d+[a-z]?$/i.test(p));
      if (i >= 0 && parts[i + 1]) got = streetKey(`${parts[i]} ${parts[i + 1]}`);
    }
    if (!want) return { ok: false, why: "the record's address has no house number" };
    if (!got) return { ok: false, why: `matched "${matched}" has no house number` };
    if (got.no !== want.no) return { ok: false, why: `house number ${got.no} ≠ ${want.no}` };
    if (got.street !== want.street) return { ok: false, why: `street "${got.street}" ≠ "${want.street}"` };
    return { ok: true, why: `matched "${matched}"` };
  }
  const first = nameKey(matched.split(",")[0]);
  const names = [rec.name, ...(rec.aliases || [])].map(nameKey).filter(Boolean);
  if (!names.some((n) => n === first || (n.length >= 6 && first.includes(n)) || (first.length >= 6 && n.includes(first)))) return { ok: false, why: `matched name "${matched.split(",")[0]}" is not the record's` };
  if (want) {
    const parts = matched.split(",").map((s) => s.trim());
    const i = parts.findIndex((p, k) => k > 0 && /^\d+[a-z]?$/i.test(p));
    if (i > 0 && parts[i].toLowerCase() !== want.no) return { ok: false, why: `house number ${parts[i]} ≠ ${want.no}` };
  }
  return { ok: true, why: `matched "${matched}"` };
}
