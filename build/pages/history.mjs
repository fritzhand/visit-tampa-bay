/* ============================================================
   build/pages/history.mjs · STUB by E1 · OWNER: the History lane (replace wholesale)
   Produces history.html. Contract: one element per timeline entry with id="tl-<id>" (search entries
   link history.html#tl-<id>). Params: era r q (build/nav.mjs).
   ============================================================ */
import { stubPage } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h, cards, vocab } = ctx;
  return [stubPage(ctx, {
    slug: "history", title: "History & heritage", kicker: "Explore", num: 3,
    lede: "Tampa Bay's history by era, and the historic sites and districts where it happened, every claim linked to its source.",
    description: "The history of Tampa Bay by era, with its historic sites, districts and landmarks, every claim linked to its source.",
    what: "The timeline by era, the historic places, and their designations.", owner: "History lane",
    body: (root) => [
      ...vocab.ERAS.map((era) => { const list = db.timelineByEra.get(era) || []; return list.length ? c.section({ id: `era-${era}`, title: vocab.ERA_LABEL[era], root, body: `<ol class="timeline">${list.map((t) => cards.timelineItem(root, t)).join("")}</ol>` }) : ""; }),
      db.heritage.length ? c.section({ id: "sites", title: "Historic places", root, body: `<ul class="rows">${db.heritage.map(({ kind, rec }) => (kind === "stay" ? cards.stayRow(root, rec, { note: rec.heritage.built ? `Built ${rec.heritage.built}` : "" }) : cards.placeRow(root, rec, { note: rec.heritage.built ? `Built ${rec.heritage.built}` : "" }))).join("")}</ul>` }) : "",
    ].join("\n"),
  })];
}
