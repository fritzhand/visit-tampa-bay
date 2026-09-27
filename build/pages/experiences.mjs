/* ============================================================
   build/pages/experiences.mjs · STUB by E1 · OWNER: the Experiences lane (replace wholesale)
   Produces experiences.html. Contract: one experience card per experience with id="x-<id>" (card links
   are experiences.html?x=<id>#x-<id>; search entries experiences.html?x=<id>; ?x= opens #experience-dialog
   with JS). Params: r k t q x (build/nav.mjs).
   ============================================================ */
import { stubPage } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h, cards, vocab } = ctx;
  const groups = Object.keys(vocab.EXPERIENCE_GROUP_LABEL);
  return [stubPage(ctx, {
    slug: "experiences", title: "Experiences & tours", kicker: "Explore", num: 3,
    lede: "Water taxis, cruises, dolphin tours, kayak trips, walking and food tours, cigar rolling and more, each linked to its operator.",
    description: "Tours and activities in Tampa Bay: water taxis, cruises, dolphin tours, kayaking, walking, food and ghost tours, each linked to its operator.",
    what: "Experiences by kind, topic and sheet, with details in a dialog.", owner: "Experiences lane",
    body: (root) => groups.map((g) => { const list = h.sortBy(db.experiences.filter((x) => x.kg === g), (x) => x.name.toLowerCase()); return list.length ? c.section({ id: `g-${g}`, title: vocab.EXPERIENCE_GROUP_LABEL[g], root, body: `<div class="grid">${list.map((x) => cards.experienceCard(root, x)).join("")}</div>` }) : ""; }).join("\n").trim() || c.emptyState({ title: "No experiences listed yet" }),
  })];
}
