/* ============================================================
   build/pages/things-to-do.mjs · STUB by E1 · OWNER: the Explore lane (replace wholesale)
   Produces things-to-do.html. Params: r a k t q free view (build/nav.mjs).
   ============================================================ */
import { stubPage, rows } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h, cards, vocab } = ctx;
  const groups = Object.keys(vocab.PLACE_GROUP_LABEL).filter((g) => !["eat", "drink"].includes(g));
  const primary = (p) => vocab.PLACE_GROUP[p.kind];
  return [stubPage(ctx, {
    slug: "things-to-do", title: "Things to do", kicker: "Explore", num: 3,
    lede: "Attractions, museums, parks, landmarks, districts and venues across Tampa Bay, each linked to its official page.",
    description: "Things to do in Tampa Bay: attractions, museums, parks, historic sites, districts and venues, each linked to its source.",
    what: "Places by kind, topic and area, with filters, a list and a map.", owner: "Explore lane",
    body: (root) => groups.map((g) => { const list = h.sortBy(db.places.filter((p) => primary(p) === g), (p) => p.name.toLowerCase()); return list.length ? c.section({ id: `g-${g}`, title: vocab.PLACE_GROUP_LABEL[g], root, body: rows(list.map((p) => cards.placeRow(root, p))) }) : ""; }).join("\n"),
  })];
}
