/* ============================================================
   build/pages/trip.mjs · STUB by E1 · OWNER: the Trip lane (replace wholesale)
   Produces trip.html (My Trip). No query params; a shared trip is the hash
   #e=<codes>;x=<codes>;p=<codes>;s=<codes> (site/js/lib/share.js). The list is client-rendered from the
   stars (localStorage tbc-trip) and assets/data/{events,experiences,places-lite,stays-lite}.json.
   ============================================================ */
import { stubPage } from "./_stub.mjs";

export function pages(ctx) {
  const { c } = ctx;
  return [stubPage(ctx, {
    slug: "trip", title: "My Trip", kicker: "Plan", num: 1,
    lede: "Star places, places to stay, tours and events anywhere in the guide. They collect here, on this device, and you can share the list as a link.",
    description: "Your starred places, stays, experiences and events in one list, saved on this device, with a share link and calendar files for events.",
    what: "My Trip: starred items by day and kind, a share link and calendar files.", owner: "Trip lane",
    body: () => `<div class="js-only" data-trip-root></div><noscript>${c.emptyState({ title: "My Trip needs JavaScript", body: "Stars are saved in your browser. Every page of the guide works without them.", glyph: "star", level: 2 })}</noscript>`,
  })];
}
