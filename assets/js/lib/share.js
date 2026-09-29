/* ============================================================
   site/js/lib/share.js · OWNER: E1 (build engine; ported from Cincy Week) · PURE (no DOM)
   Short, stable codes for shared trips: trip.html#e=<code>,…;x=…;p=…;s=…
     e = events · x = experiences · p = places · s = stays (TRIP_KINDS, in this order)
   code(id) = FNV-1a 32-bit of the id, base36, 5 characters. Ids are unique across places, stays,
   experiences, events, series, areas and regions (one URL and code space); the build computes every
   code and fails on a collision (build/core/load.mjs).
   ============================================================ */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (const ch of new TextEncoder().encode(String(str))) {
    h ^= ch;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
const SPACE = 36 ** 5;
/** "florida-aquarium" → a 5-character base36 code */
export const code = (id) => (fnv1a(id) % SPACE).toString(36).padStart(5, "0");
export const CODE_RE = /^[0-9a-z]{5}$/;
/** The four kinds a trip holds, in hash order: event, experience, place, stay. */
export const TRIP_KINDS = ["e", "x", "p", "s"];
export const TRIP_KIND_LABEL = { e: "Events", x: "Experiences", p: "Places", s: "Places to stay" };

/** ids → "code,code" (sorted for stable links) */
export const encode = (ids) => [...new Set(ids.map(code))].sort().join(",");

/** { e: [eventIds], x: [experienceIds], p: [placeIds], s: [stayIds] } → "e=…;x=…;p=…;s=…" (the part after "#") */
export function tripHash(trip = {}) {
  return TRIP_KINDS.filter((k) => (trip[k] || []).length).map((k) => `${k}=${encode(trip[k])}`).join(";");
}

/** "#e=abcde,fghij;s=klmno" → { e: [...ids], x: [...], p: [...], s: [...], unknown: n }.
 *  codeToId: Map or object from code to id. Unknown codes are counted and ignored. */
export function decode(hash, codeToId) {
  const get = (c) => (codeToId instanceof Map ? codeToId.get(c) : codeToId[c]);
  const out = { e: [], x: [], p: [], s: [], unknown: 0 };
  const h = String(hash || "").replace(/^#/, "");
  for (const part of h.split(";")) {
    const m = /^(e|x|p|s)=(.*)$/.exec(part.trim());
    if (!m) continue;
    for (const c of m[2].split(",")) {
      const cc = c.trim().toLowerCase();
      if (!CODE_RE.test(cc)) { if (cc) out.unknown++; continue; }
      const id = get(cc);
      if (!id) { out.unknown++; continue; }
      if (!out[m[1]].includes(id)) out[m[1]].push(id);
    }
  }
  return out;
}

/** Build { code → id } and report collisions: [[code, idA, idB]] */
export function codeTable(ids) {
  const map = new Map(), collisions = [];
  for (const id of ids) {
    const c = code(id);
    if (map.has(c) && map.get(c) !== id) collisions.push([c, map.get(c), id]);
    else map.set(c, id);
  }
  return { map, collisions };
}
