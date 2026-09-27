/* ============================================================
   build/pages/faq.mjs · STUB by E1 · OWNER: the Visit lane (replace wholesale)
   Produces faq.html. Contract: one element per FAQ with id="fq-<id>" (search entries link faq.html#fq-<id>).
   Params: q, topic (h.slugify(faq.topic)).
   ============================================================ */
import { stubPage } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h } = ctx;
  const byTopic = h.groupBy(db.faqs, (f) => f.topic);
  return [stubPage(ctx, {
    slug: "faq", title: "FAQ", kicker: "Visit", num: 5,
    lede: "Practical answers: weather, hurricanes, beaches, taxes, tolls and more, each from its source.",
    description: "Practical questions about visiting Tampa Bay, answered from official sources: weather, hurricanes, beaches, taxes and tolls.",
    what: "Questions by topic, with a search.", owner: "Visit lane",
    body: (root) => [...byTopic].map(([topic, list]) => c.section({ id: `topic-${h.slugify(topic)}`, title: topic, root, body: list.map((f) => `<details class="faq" id="fq-${h.attr(f.id)}"><summary>${h.esc(f.q)}</summary>${h.paras(f.a)}${c.recordSource(f)}</details>`).join("") })).join("\n") || c.emptyState({ title: "No questions listed yet" }),
  })];
}
