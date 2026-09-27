/* ============================================================
   build/pages/map.mjs · STUB by E1 · OWNER: the Map lane (replace wholesale)
   Produces map.html. Params: layers (build/nav.mjs MAP_LAYERS), r, focus=<kind>:<id>.
   The basemap (site/map/basemap.svg + data/map.json) comes from the basemap agent; ctx.map.meta is null
   until both exist.
   ============================================================ */
import { stubPage } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h } = ctx;
  const on = (arr) => arr.filter((r) => r.ll).length;
  return [stubPage(ctx, {
    slug: "map", title: "Map", kicker: "Plan", num: 1,
    lede: "Every place, stay, departure point and event in the guide that has coordinates, on one chart.",
    description: "A map of Tampa Bay: places, places to stay, tour departures and events from this guide, each linked to its source.",
    what: "The interactive chart: layers for places, stays, experiences, events, heritage and transport.", owner: "Map lane",
    body: (root) => c.facts(root, [["Places with coordinates", String(on(db.places))], ["Places to stay", String(on(db.stays))], ["Experiences", String(on(db.experiences))], ["Basemap", db.basemap && ctx.map.meta ? "Ready" : "Not built yet"]], { label: "On the map" }),
  })];
}
