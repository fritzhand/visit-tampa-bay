/* tests/minimap.test.mjs · OWNER: E1 · build/components/mini-map.mjs, site/js/lib/geo.js
   With a basemap (a synthetic data/map.json + site/map/basemap.svg in a throwaway copy) detail pages carry a
   plain-SVG mini map; without one they carry the coordinate line (the fixture build, tests/build.test.mjs). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { haversine, metaOf, crop, onMap } from "../site/js/lib/geo.js";
import { copyRepo, build, read, write, cleanup } from "./helpers.mjs";

const lat0 = 27.85, k = Math.cos((lat0 * Math.PI) / 180), sx = 1000 / 0.7;
const MAP = { bbox: { core: { s: 27.5, n: 28.2, w: -82.9, e: -82.2 } }, projection: { lat0, k, sx, viewBox: [Math.round(0.7 * k * sx), 1000] }, labels: [{ text: "Hillsborough River", lat: 27.955, lng: -82.46, kind: "water" }], attribution: "Basemap: fixture attribution line" };

test("geo: distances and crops on a Tampa Bay frame", () => {
  const d = haversine({ lat: 27.9497, lng: -82.4588 }, { lat: 27.944, lng: -82.4453 });
  assert.ok(d > 1400 && d < 1500, `Tampa Theatre → the aquarium ≈ 1.45 km, got ${d}`);
  const meta = metaOf(MAP);
  assert.ok(onMap(meta, 27.95, -82.46));
  assert.ok(!onMap(meta, 27.1, -82.46), "Sarasota is off this frame");
  const c = crop(27.95, -82.46, meta, { halfWidthM: 900 });
  assert.ok(c && c.vb.length === 4 && c.px > 0 && c.px < 100 && c.py > 0 && c.py < 100);
});

test("with data/map.json and site/map/basemap.svg, detail pages carry a mini map and the footer names the basemap", () => {
  const dir = copyRepo();
  try {
    write(dir, "data/map.json", JSON.stringify(MAP));
    write(dir, "site/map/basemap.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP.projection.viewBox.join(" ")}"><g id="bm"></g></svg>`);
    const r = build(dir);
    assert.equal(r.status, 0, r.stderr);
    const html = read(dir, "docs/places/tampa-theatre.html");
    assert.match(html, /<div class="mini-map" role="img" aria-label="Map: Tampa Theatre"><svg viewBox="[\d. ]+"[^>]*><use href="\.\.\/assets\/map\/basemap\.svg#bm"\/><\/svg>/);
    assert.match(html, /class="pin pin-place" data-sheet="tampa" style="left: [\d.]+%; top: [\d.]+%"/);
    assert.match(html, /Basemap: fixture attribution line/);
  } finally { cleanup(dir); }
});

test("a malformed data/map.json fails with a named message", () => {
  const dir = copyRepo();
  try {
    write(dir, "data/map.json", JSON.stringify({ projection: {} }));
    const r = build(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /data\/map\.json: needs bbox\.core/);
  } finally { cleanup(dir); }
});
