/* ============================================================
   tests/merge.test.mjs · OWNER: Merge (research → data/)
   Unit tests of the pure merge helpers in scripts/merge-lib.mjs: field merge (owner, verifier, lists, heritage,
   status, sources), id collisions (rename, fold), coordinate ranking (SPEC §7), fuzzy duplicates, location texts,
   the QA day-name check and the geocoder acceptance rule. They never read research/ or data/.
   ============================================================ */
import test from "node:test";
import assert from "node:assert/strict";
import {
  nameKey, addrKey, streetKey, normFor, isVerified, GEO_RANK, pickCoords, union, mergeDesignations, mergeHeritage, mergeGroup,
  canonical, resolveIdCollisions, foldPlaceIntoStay, dupCandidates, firstSegmentPlace, weekdayMismatches, guessWords, acceptGeocode,
} from "../scripts/merge-lib.mjs";

const FIELDS = ["id", "name", "aliases", "kind", "kinds", "topics", "area", "address", "lat", "lng", "geo_source", "url", "phone", "hours_text",
  "summary", "quote", "quote_source", "heritage", "signature", "status", "status_note", "tags", "source_url", "also_sources", "checked"];
const place = (o) => ({ id: "x", name: "X", kind: "museum", area: "downtown-tampa", status: "open", source_url: "https://a.example/x", checked: "2026-09-27", ...o });

test("keys: names, street addresses and per-field comparison forms", () => {
  assert.equal(nameKey("The Florida Aquarium"), "florida aquarium");
  assert.equal(nameKey("Café Quiquiriquí & Bar"), "cafe quiquiriqui and bar");
  assert.equal(addrKey("1710 N. Highland Avenue"), addrKey("1710 N Highland Ave"));
  assert.equal(addrKey("615 Channelside Dr, Suite 112"), addrKey("615 Channelside Drive"));
  assert.notEqual(addrKey("310 W 7th Ave"), addrKey("310 E 7th Ave"));
  assert.deepEqual(streetKey("310 W 7th Ave, Tampa, FL 33602"), { no: "310", street: "w 7th ave" });
  assert.equal(streetKey("Beach Drive NE"), null);
  assert.equal(normFor("phone", "(813) 248-4961"), normFor("phone", "813.248.4961"));
  assert.equal(normFor("url", "https://www.x.com/a/"), normFor("url", "https://x.com/a"));
});

test("isVerified reads a verifier pass in notes, not a request to the verifier", () => {
  assert.equal(isVerified({ notes: "Verified 2026-09-27: hours re-read." }), true);
  assert.equal(isVerified({ notes: "Verifier (2026-09-27): phone removed." }), true);
  assert.equal(isVerified({ notes: "Added by the verifier (Sep 27, 2026)." }), true);
  assert.equal(isVerified({ notes: "Verifier: check for a reopening in Oct-Nov 2026." }), false);
  assert.equal(isVerified({}), false);
});

test("coordinates: official > OpenStreetMap by name > Census > Wikipedia > manual, never averaged; > 250 m flagged", () => {
  assert.ok(GEO_RANK.official < GEO_RANK.photon && GEO_RANK.photon === GEO_RANK.osm && GEO_RANK.osm < GEO_RANK.census && GEO_RANK.census < GEO_RANK.wikipedia && GEO_RANK.wikipedia < GEO_RANK.manual);
  const parts = [
    { slice: "census-slice", order: 0, rec: { lat: 27.9500, lng: -82.4589, geo_source: "census" } },
    { slice: "wiki-slice", order: 1, rec: { lat: 27.9600, lng: -82.4589, geo_source: "wikipedia" } },
    { slice: "osm-slice", order: 2, rec: { lat: 27.9504, lng: -82.4588, geo_source: "photon" } },
  ];
  const c = pickCoords(parts);
  assert.equal(c.from, "osm-slice");
  assert.deepEqual([c.lat, c.lng, c.geo_source], [27.9504, -82.4588, "photon"]);   // the point as published, not a mean
  assert.deepEqual(c.disagreements.map((d) => d.slice), ["wiki-slice"]);            // the census point is ~45 m off: fine
  assert.ok(c.disagreements[0].d > 1000);
  assert.equal(pickCoords([{ slice: "a", order: 0, rec: {} }]), null);
  // same rank: the verified record, then the owner
  const tie = pickCoords([{ slice: "owner", order: 0, rec: { lat: 27.9, lng: -82.4, geo_source: "census" } }, { slice: "v", order: 1, verified: true, rec: { lat: 27.91, lng: -82.4, geo_source: "census" } }]);
  assert.equal(tie.from, "v");
});

test("unions and designations", () => {
  assert.deepEqual(union([["a", "b"], ["b", "c"], null]), ["a", "b", "c"]);
  assert.deepEqual(union([["The Pier"], ["the pier", "Pier"]], nameKey), ["The Pier"]);
  const d = mergeDesignations([
    [{ name: "National Register of Historic Places", ref: "78000945", year: 1978 }],
    [{ name: "National Register of Historic Places", ref: "78000945", url: "https://npgallery.nps.gov/AssetDetail/NRIS/78000945" }, { name: "City of Tampa Landmark", ref: null }],
  ]);
  assert.equal(d.length, 2);
  assert.deepEqual(d[0], { name: "National Register of Historic Places", ref: "78000945", year: 1978, url: "https://npgallery.nps.gov/AssetDetail/NRIS/78000945" });
});

test("heritage: the history slice's story wins, designations and sources are unions, differences are conflicts", () => {
  const { heritage, conflicts } = mergeHeritage([
    { slice: "history-tampa", h: { built: "1926", architect: "John Eberson", story: "History story.", designations: [{ name: "NRHP", ref: "1" }], sources: ["https://h.example"] } },
    { slice: "venues-bay", h: { built: "1926", style: "Atmospheric", story: "Venue story.", visiting: "See a film.", designations: [{ name: "NRHP", ref: "1", year: 1978 }], sources: ["https://v.example"] } },
  ]);
  assert.equal(heritage.story, "History story.");
  assert.equal(heritage.visiting, "See a film.");     // filled from the other block
  assert.equal(heritage.style, "Atmospheric");
  assert.deepEqual(heritage.designations, [{ name: "NRHP", ref: "1", year: 1978 }]);
  assert.deepEqual(heritage.sources, ["https://h.example", "https://v.example"]);
  assert.deepEqual(conflicts.map((c) => c.field), ["heritage.story"]);
  assert.deepEqual(Object.keys(heritage), ["built", "architect", "style", "designations", "story", "visiting", "sources"]);
});

test("mergeGroup: owner wins, a verified record wins over the owner, lists unite, other names become aliases", () => {
  const owner = { slice: "eat-tampa", rec: place({ name: "Columbia Restaurant", kind: "restaurant", topics: ["food"], phone: "(813) 248-4961", hours_text: "Daily 11–9", summary: "Owner summary.", source_url: "https://columbia.example/", tags: ["cuban"] }) };
  const hist = { slice: "history-tampa", rec: place({ name: "Columbia Restaurant (Ybor City)", kind: "restaurant", kinds: ["historic-site"], topics: ["history", "food"], phone: "813-248-4961", hours_text: "Daily 11 AM–9 PM", summary: "History summary.", source_url: "https://columbia.example/ybor", heritage: { built: "1905", story: "Story." }, checked: "2026-09-26" }) };
  const { rec, conflicts } = mergeGroup([owner, hist], { fieldOrder: FIELDS, isHistory: (s) => s.startsWith("history-") });
  assert.equal(rec.name, "Columbia Restaurant");
  assert.deepEqual(rec.aliases, ["Columbia Restaurant (Ybor City)"]);
  assert.deepEqual(rec.kinds, ["historic-site"]);
  assert.deepEqual(rec.topics, ["food", "history"]);
  assert.equal(rec.summary, "Owner summary.");
  assert.equal(rec.heritage.story, "Story.");
  assert.equal(rec.source_url, "https://columbia.example/");
  assert.deepEqual(rec.also_sources, ["https://columbia.example/ybor"]);
  assert.equal(rec.checked, "2026-09-27");
  assert.match(rec.notes, /^Merged from eat-tampa \+ history-tampa; owner eat-tampa\./);
  // the phone is the same number written differently: no conflict; hours differ: a fact conflict with both values
  assert.equal(conflicts.find((c) => c.field === "phone"), undefined);
  const h = conflicts.find((c) => c.field === "hours_text");
  assert.deepEqual([h.kind, h.winner.slice, h.winner.v, h.loser.slice, h.loser.v, h.why], ["fact", "eat-tampa", "Daily 11–9", "history-tampa", "Daily 11 AM–9 PM", "owner"]);
  assert.equal(conflicts.find((c) => c.field === "summary").kind, "text");
  // key order follows the schema
  assert.deepEqual(Object.keys(rec).slice(0, 4), ["id", "name", "aliases", "kind"]);

  const verified = { ...hist, rec: { ...hist.rec, notes: "Verified 2026-09-27: hours re-read." } };
  const v = mergeGroup([owner, verified], { fieldOrder: FIELDS, isHistory: (s) => s.startsWith("history-") });
  assert.equal(v.rec.hours_text, "Daily 11 AM–9 PM");
  assert.equal(v.rec.source_url, "https://columbia.example/ybor");
  assert.equal(v.conflicts.find((c) => c.field === "hours_text").why, "verified");
});

test("mergeGroup: a quote travels with its page; editorial flags are true when any slice sets them; status follows the latest evidence", () => {
  const a = { slice: "see-pinellas", rec: place({ signature: false, status: "open", checked: "2026-09-20", source_url: "https://a.example/" }) };
  const b = { slice: "outdoors", rec: place({ signature: true, status: "temporarily-closed", status_note: "Closed after Milton, per the county.", checked: "2026-09-27", quote: "Quoted words.", source_url: "https://b.example/" }) };
  const { rec, conflicts, status } = mergeGroup([a, b], { fieldOrder: FIELDS });
  assert.equal(rec.signature, true);
  assert.equal(rec.quote, "Quoted words.");
  assert.equal(rec.quote_source, "https://b.example/");     // the quote's page, not the record's source_url
  assert.equal(rec.status, "temporarily-closed");
  assert.equal(rec.status_note, "Closed after Milton, per the county.");
  assert.equal(status.chosen.slice, "outdoors");
  assert.ok(conflicts.some((c) => c.field === "status" && c.kind === "fact"));
  assert.ok(conflicts.some((c) => c.field === "signature" && c.kind === "flag"));
});

test("mergeGroup never adds fields a collection does not have", () => {
  const series = ["id", "name", "kind", "months", "when_text", "place", "location_text", "featured", "source_url", "also_sources", "checked"];
  const s1 = { slice: "events-fall", rec: { id: "fair", name: "County Fair", kind: "fair", months: [11, 12], when_text: "November", featured: true, source_url: "https://f.example/", checked: "2026-09-27" } };
  const s2 = { slice: "events-spring", rec: { id: "fair", name: "The County Fair", kind: "fair", months: [1, 11], when_text: "Nov–Jan", featured: false, source_url: "https://s.example/", checked: "2026-09-27" } };
  const { rec } = mergeGroup([s1, s2], { fieldOrder: series });
  assert.equal("aliases" in rec, false);
  assert.equal("kinds" in rec, false);
  assert.deepEqual(rec.months, [1, 11, 12]);
  assert.equal(rec.featured, true);
  assert.deepEqual(canonical({ notes: "n", b: 1, id: "z", a: 2 }, ["id", "a", "b"]), { id: "z", a: 2, b: 1, notes: "n" });
});

test("one id space: a series that shares a place's id is renamed; a place that is also a stay folds; the rest is reported", () => {
  const colls = {
    places: [{ id: "market" }, { id: "grand-hotel" }, { id: "dup" }], stays: [{ id: "grand-hotel" }], series: [{ id: "market" }],
    experiences: [{ id: "dup" }], events: [], areas: [], regions: [],
  };
  const rules = [{ a: "series", b: "*", action: "suffix", suffix: "-series" }, { a: "places", b: "stays", action: "fold" }];
  const r = resolveIdCollisions(colls, rules);
  assert.deepEqual(r.renames.map((x) => [x.collection, x.from, x.to]), [["series", "market", "market-series"]]);
  assert.deepEqual(r.folds.map((x) => x.from), ["grand-hotel"]);
  assert.deepEqual(r.unresolved, [{ id: "dup", collections: ["places", "experiences"] }]);
  const ex = resolveIdCollisions(colls, rules, { "experiences:dup": "dup-tour" });
  assert.deepEqual(ex.renames.find((x) => x.from === "dup"), { collection: "experiences", from: "dup", to: "dup-tour", other: ["places"], why: "explicit table" });
  assert.deepEqual(ex.unresolved, []);
  // the suffix never lands on another taken id
  const taken = resolveIdCollisions({ places: [{ id: "m" }, { id: "m-series" }], series: [{ id: "m" }] }, rules);
  assert.equal(taken.renames[0].to, "m-series-2");
});

test("foldPlaceIntoStay: the heritage, name, tags and source move to the stay", () => {
  const p = { id: "vinoy", name: "Vinoy Park Hotel", tags: ["landmark"], heritage: { built: "1925", designations: [{ name: "NRHP", ref: "78000953" }] }, source_url: "https://p.example/", checked: "2026-09-27" };
  const s = { id: "vinoy", name: "The Vinoy Resort", aliases: ["The Vinoy"], tags: ["golf"], source_url: "https://s.example/", checked: "2026-09-26" };
  const out = foldPlaceIntoStay(p, s, { fieldOrder: ["id", "name", "aliases", "heritage", "tags", "source_url", "also_sources", "checked"] });
  assert.equal(out.name, "The Vinoy Resort");
  assert.deepEqual(out.aliases, ["The Vinoy", "Vinoy Park Hotel"]);
  assert.equal(out.heritage.built, "1925");
  assert.deepEqual(out.tags, ["golf", "landmark"]);
  assert.deepEqual(out.also_sources, ["https://p.example/"]);
  assert.equal(out.checked, "2026-09-27");
});

test("fuzzy duplicates: a name or street address within 150 m; two locations of a chain are not candidates", () => {
  const at = (lat, lng) => ({ lat, lng });
  const items = [
    { c: "places", rec: { id: "a", name: "The Pier Grill", address: "800 2nd Ave NE", ...at(27.7735, -82.6240) } },
    { c: "places", rec: { id: "b", name: "Pier Grill", address: "802 2nd Ave NE", ...at(27.7736, -82.6241) } },
    { c: "places", rec: { id: "c", name: "Smugglers Cove", address: "15395 Gulf Blvd", ...at(27.80, -82.80) } },
    { c: "places", rec: { id: "d", name: "Smugglers Cove", address: "19463 Gulf Blvd", ...at(27.86, -82.84) } },
    { c: "places", rec: { id: "e", name: "Café A", address: "1412 E 7th Ave, Suite 1", ...at(27.9600, -82.4400) } },
    { c: "stays", rec: { id: "f", name: "Hotel F", address: "1412 E. Seventh Avenue", ...at(27.9601, -82.4400) } },
    { c: "places", rec: { id: "g", name: "Café G", address: "1412 East 7th Avenue", ...at(27.9600, -82.4401) } },
  ];
  const got = dupCandidates(items).map((x) => `${x.a}~${x.b}:${x.reasons.join("+")}`);
  assert.deepEqual(got, ["places:a~places:b:same name", "places:e~places:g:same street address"]);
  const ex = dupCandidates([
    { c: "experiences", rec: { id: "x1", name: "Ybor City Walking Tour", operator: "History Center" } },
    { c: "experiences", rec: { id: "x2", name: "Ybor City Walking Tour", operator: "Tampa Bay Tours" } },
    { c: "experiences", rec: { id: "x3", name: "Ybor City Walking Tour", operator: "History Center" } },
  ]);
  assert.deepEqual(ex.map((x) => `${x.a}~${x.b}`), ["experiences:x1~experiences:x3"]);
  const ev = dupCandidates([
    { c: "events", rec: { id: "e1", title: "Guavaween 2026", date: "2026-10-24", place: "ybor" } },
    { c: "events", rec: { id: "e2", title: "Guavaween", date: "2026-10-24" } },
    { c: "events", rec: { id: "e3", title: "Guavaween", date: "2027-10-23" } },
  ]);
  assert.deepEqual(ev.map((x) => `${x.a}~${x.b}`), ["events:e1~events:e2"]);
});

test("location_text → place only when it clearly names one place", () => {
  const keys = new Map([["largo central park", "largo-central-park"], ["st nicholas greek orthodox cathedral", "st-nicholas"], ["historic downtown dade city", "dade"]]);
  assert.deepEqual(firstSegmentPlace("Largo Central Park, 101 Central Park Dr., Largo", keys), { id: "largo-central-park", how: 'first part "Largo Central Park"' });
  assert.deepEqual(firstSegmentPlace("Historic Downtown Dade City", keys), { id: "dade", how: "whole text" });
  assert.equal(firstSegmentPlace("St. Nicholas Greek Orthodox Cathedral (36 N. Pinellas Ave.) and Spring Bayou, Tarpon Springs", keys), null);
  assert.equal(firstSegmentPlace("Al Lang Stadium lot (October-May); Williams Park (June-August)", keys), null);
  assert.equal(firstSegmentPlace("Downtown Largo", keys), null);
  assert.equal(firstSegmentPlace(null, keys), null);
});

test("QA: day names that do not fit the date, and guess-like prices", () => {
  assert.deepEqual(weekdayMismatches("Saturday, October 17, 2026 at Julian B. Lane Park"), []);
  const bad = weekdayMismatches("Doors open Friday, October 17 at 6 PM", { years: () => [2026] });
  assert.deepEqual(bad, [{ text: "Friday, October 17", named: "friday", actual: "saturday", date: "2026-10-17" }]);
  assert.deepEqual(weekdayMismatches("Fri.-Sun., March 5-7, 2027: practice Friday"), []);            // a day range
  assert.deepEqual(weekdayMismatches("Saturday, May 2 in 2026", { years: () => [2027] }), []);       // the year it names
  assert.equal(weekdayMismatches("Sat., Oct. 3", { years: () => [2026] }).length, 0);
  assert.equal(guessWords("About $20 per person"), "About");
  assert.equal(guessWords("$19.95 (prices may vary by date)"), null);
  assert.equal(guessWords("Adults $25"), null);
});

test("geocoder acceptance: the house number and street (direction included), or the record's name", () => {
  const rec = { name: "Urban Kai", address: "310 W 7th Ave, Tampa, FL 33602" };
  assert.equal(acceptGeocode(rec, { lat: 27.96, lng: -82.46, geo_source: "census", matched: "310 E 7TH AVE, TAMPA, FL, 33602" }).ok, false);
  assert.equal(acceptGeocode(rec, { lat: 27.96, lng: -82.46, geo_source: "census", matched: "310 W 7TH AVE, TAMPA, FL, 33602" }).ok, true);
  assert.equal(acceptGeocode(rec, { lat: 27.96, lng: -82.46, geo_source: "photon", matched: "Urban Kai, 310, West 7th Avenue, Tampa, 33602" }).ok, true);
  assert.equal(acceptGeocode(rec, { lat: 27.96, lng: -82.46, geo_source: "photon", matched: "West 7th Avenue, Tampa, 33602" }).ok, false);
  assert.equal(acceptGeocode(rec, { error: "no match" }).ok, false);
  const center = { lat: 27.96, lng: -82.46 };
  assert.equal(acceptGeocode(rec, { lat: 27.961, lng: -82.459, geo_source: "photon", matched: "Urban Kai, 310, West 7th Avenue, Tampa" }, { center, byName: true }).ok, true);
  assert.equal(acceptGeocode(rec, { lat: 27.961, lng: -82.459, geo_source: "photon", matched: "Urban Kai, 999, West 7th Avenue, Tampa" }, { center, byName: true }).ok, false);
  assert.equal(acceptGeocode(rec, { lat: 27.961, lng: -82.459, geo_source: "photon", matched: "PSTA Ferry Stop, Tampa" }, { center, byName: true }).ok, false);
  assert.equal(acceptGeocode(rec, { lat: 28.3, lng: -82.46, geo_source: "photon", matched: "Urban Kai, Tampa" }, { center, maxKm: 15, byName: true }).ok, false);
});
