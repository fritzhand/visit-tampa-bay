/* ============================================================
   build/pages/outdoors.mjs · STUB by E1 · OWNER: the Explore lane (replace wholesale)
   Produces outdoors.html (Beaches & outdoors). Params: r k q (build/nav.mjs).
   ============================================================ */
import { stubPage, rows } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h, cards, vocab } = ctx;
  const list = h.sortBy(db.places.filter((p) => p.groups.includes("outdoors")), (p) => p.name.toLowerCase());
  return [stubPage(ctx, {
    slug: "outdoors", title: "Beaches & outdoors", kicker: "Explore", num: 3,
    lede: "Beaches, parks, state parks, preserves, trails, islands, piers and gardens, each linked to its official page.",
    description: "Beaches and the outdoors around Tampa Bay: beaches, parks, preserves, trails, islands and gardens, each linked to its source.",
    what: "Beaches and outdoor places by kind and sheet, with water and wildlife experiences.", owner: "Explore lane",
    body: (root) => c.section({ id: "places", title: "Beaches, parks and trails", root, body: rows(list.map((p) => cards.placeRow(root, p))) || c.emptyState({ title: "No outdoor places listed yet" }) })
      + "\n" + c.section({ id: "kinds", title: "By kind", root, body: `<p class="chip-row">${vocab.OUTDOOR_KINDS.filter((k) => db.placesByKind.has(k)).map((k) => c.chip(vocab.PLACE_KIND_LABEL[k], `outdoors.html?k=${k}`, { root, count: db.placesByKind.get(k).length })).join("")}</p>` }),
  })];
}
