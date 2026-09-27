/* ============================================================
   build/pages/eat-drink.mjs · STUB by E1 · OWNER: the Explore lane (replace wholesale)
   Produces eat-drink.html. Params: r a k tag q (build/nav.mjs).
   ============================================================ */
import { stubPage, rows } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h, cards } = ctx;
  const sect = (root, g, title) => { const list = h.sortBy(db.places.filter((p) => p.groups.includes(g)), (p) => p.name.toLowerCase()); return list.length ? c.section({ id: g, title, root, body: rows(list.map((p) => cards.placeRow(root, p))) }) : ""; };
  return [stubPage(ctx, {
    slug: "eat-drink", title: "Eat & drink", kicker: "Explore", num: 3,
    lede: "Historic restaurants, Cuban sandwiches and bakeries, food halls, breweries and bars, each linked to its own site.",
    description: "Where to eat and drink around Tampa Bay: historic and signature restaurants, food halls, breweries and bars, each linked to its source.",
    what: "Restaurants, food halls, breweries and bars by kind, area and tag.", owner: "Explore lane",
    body: (root) => [sect(root, "eat", "Places to eat"), sect(root, "drink", "Places to drink")].join("\n").trim() || c.emptyState({ title: "No places to eat or drink listed yet" }),
  })];
}
