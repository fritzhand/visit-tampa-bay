/* tests/schema.test.mjs · OWNER: E1 · build/core/schema.mjs + build/core/vocab.mjs against research/tools/schema.mjs
   The build must ACCEPT every shape the research checker accepts: the same collections and fields, enums that
   contain the research values, no field required that research leaves optional. research/ is read, never
   written; the comparison is skipped when research/tools/schema.mjs is absent. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPO, fx } from "./helpers.mjs";

const B = await import(path.join(REPO, "build", "core", "schema.mjs"));
const V = await import(path.join(REPO, "build", "core", "vocab.mjs"));
const RESEARCH = path.join(REPO, "research", "tools", "schema.mjs");
const R = fs.existsSync(RESEARCH) ? await import(RESEARCH) : null;

test("vocab.mjs is a copy of the research enums, area ids, window and box", { skip: !R && "research/tools/schema.mjs is absent" }, () => {
  for (const k of ["PLACE_KINDS", "TOPICS", "STATUS", "STAY_KINDS", "STAY_FEATURES", "EXPERIENCE_KINDS", "EVENT_KINDS", "EVENT_STATUS", "TRANSPORT_MODES", "ERAS", "LICENSES", "GEO_SOURCES"]) assert.deepEqual(V[k], R[k], k);
  assert.deepEqual(V.AREAS, R.AREAS, "AREAS");
  for (const [id, r] of Object.entries(R.REGIONS)) { assert.equal(V.REGIONS[id].n, r.n); assert.equal(V.REGIONS[id].code, r.code); assert.equal(V.REGIONS[id].name, r.name); }
  assert.deepEqual(V.DATE_WINDOW, R.DATE_WINDOW);
  assert.deepEqual(V.BOX, R.BOX);
  const cfg = JSON.parse(fs.readFileSync(path.join(REPO, "site.config.json"), "utf8"));
  assert.deepEqual(cfg.dataWindow, R.DATE_WINDOW, "site.config.json dataWindow");
});

test("build SPECS accept every research field (never stricter)", { skip: !R && "research/tools/schema.mjs is absent" }, () => {
  const same = { text: ["text", "str"], str: ["text", "str"] };
  const cmp = (r, b, where) => {
    assert.ok(b, `${where}: missing in build/core/schema.mjs`);
    assert.ok(b.t === r.t || (same[r.t] || []).includes(b.t), `${where}: type ${b.t} vs research ${r.t}`);
    if (b.req) assert.ok(r.req, `${where}: required in the build but optional in research`);
    if (r.t === "enum") for (const v of r.values) assert.ok(b.values.includes(v), `${where}: enum lacks "${v}"`);
    if (r.t === "list") cmp(r.of, b.of, `${where}[]`);
    if (r.t === "obj") for (const [k, f] of Object.entries(r.fields)) cmp(f, b.fields[k], `${where}.${k}`);
  };
  for (const [coll, fields] of Object.entries(R.SPECS)) {
    assert.ok(B.SPECS[coll], `collection ${coll}`);
    for (const [k, f] of Object.entries(fields)) { if (k === "notes") continue; cmp(f, B.SPECS[coll][k], `${coll}.${k}`); }
  }
});

test("the fixture passes both the research checker and the build schema", () => {
  for (const f of ["regions", "areas", "places", "stays", "experiences", "events", "series", "timeline", "transport", "faqs", "facts", "media"]) {
    const recs = fx(f);
    const probs = B.validateFile(f, recs).filter((p) => p.level === "error");
    assert.deepEqual(probs, [], `build schema: ${f}`);
    if (R) for (const r of recs) assert.deepEqual(R.checkRecord(f, r), [], `research checker: ${f}#${r.id}`);
  }
});

test("record rules: coordinates, departures, quotes, closures, series months, routes", () => {
  const errs = (f, r) => B.validateFile(f, [r]).filter((p) => p.level === "error").map((p) => `${p.where.split("#")[1]}: ${p.msg}`);
  const place = fx("places")[0];
  assert.deepEqual(errs("places", place), []);
  assert.match(errs("places", { ...place, lat: 27.9, lng: null }).join(), /lat and lng must both be set/);
  assert.match(errs("places", { ...place, lat: -82.4, lng: 27.9 }).join(), /outside the Tampa Bay box/);
  assert.match(errs("places", { ...place, quote: Array(50).fill("word").join(" ") }).join(), /keep quotes to 40/);
  assert.match(errs("places", { ...place, summary: "" }).join(), /empty string/);
  const x = fx("experiences")[0];
  assert.match(errs("experiences", { ...x, departs_place: null, departs_text: null }).join(), /say where it starts/);
  const s = fx("series")[0];
  assert.match(errs("series", { ...s, months: [13] }).join(), /not a month/);
  assert.deepEqual(errs("series", { ...s, when_text: 'The 2027 date is listed as "DATE TBD"' }), [], "the source's own words: a warning, not an error");
  assert.ok(B.validateFile("series", [{ ...s, when_text: 'Listed as "DATE TBD"' }]).some((p) => p.level === "warn"), "…but a warning");
  assert.match(errs("series", { ...s, name: "Festival TBA" }).join(), /contains the placeholder "TBA"/, "an identity field fails");
  const rt = fx("routes")[0];
  assert.match(errs("routes", { ...rt, stops: rt.stops.slice(0, 1) }).join(), /at least two stops/);
  assert.match(errs("routes", { ...rt, stops: [{ kind: "person", id: "x" }, rt.stops[0]] }).join(), /kind: must be one of/);
  assert.deepEqual(errs("regions", { id: "tampa", name: "Tampa", lat: 27.95, lng: -82.46, bounds: { s: 27.8, n: 28.2, w: -82.7, e: -82.2 }, source_url: "https://www.tampa.gov/", checked: "2026-09-27" }), [], "a region's build-phase center and bounds");
});

test("every research record the research checker accepts, the build schema accepts (errors only)", { skip: !R && "research/tools/schema.mjs is absent" }, () => {
  const bad = [];
  let n = 0;
  for (const d of fs.readdirSync(path.join(REPO, "research"))) {
    const f = path.join(REPO, "research", d, `${d}.json`);
    if (!fs.existsSync(f)) continue;
    let j; try { j = JSON.parse(fs.readFileSync(f, "utf8")); } catch { continue; }   // a slice being written right now
    for (const [coll, recs] of Object.entries(j.records || {})) {
      if (!Array.isArray(recs) || !B.SPECS[coll]) continue;
      for (const r of recs) {
        if (R.checkRecord(coll, r).length) continue;   // the research checker reports it; not the build's concern
        n++;
        for (const p of B.validateFile(coll, [r])) if (p.level === "error") bad.push(`${d}: ${p.where}: ${p.msg}`);
      }
    }
  }
  assert.deepEqual(bad, [], `${bad.length} research-valid record problem(s) the build would reject (of ${n} checked)`);
});
