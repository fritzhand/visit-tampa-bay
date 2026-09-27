/* ============================================================
   build/pages/passages.mjs · STUB by E1 · OWNER: the Passages lane (replace wholesale)
   Produces passages.html. Contract: one element per route with id="r-<route id>" (search entries link
   passages.html#r-<id>). Routes (data/routes.json) are built only from sourced records.
   ============================================================ */
import { stubPage } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h, seo, config } = ctx;
  const href = (s) => (s.kind === "place" ? `places/${s.id}.html` : s.kind === "stay" ? `stays/${s.id}.html` : s.kind === "experience" ? `experiences.html?x=${s.id}#x-${s.id}` : `whats-on.html?e=${s.id}#e-${s.id}`);
  return [stubPage(ctx, {
    slug: "passages", title: "Passages", kicker: "Explore", num: 3,
    lede: "Routes through Tampa Bay built only from places, stays, tours and events in this guide, each stop linked to its entry.",
    description: "Passages: multi-stop routes through Tampa Bay, built only from sourced places, stays, tours and events in this guide.",
    what: "Curated routes with a map, the stops in order and the time between them.", owner: "Passages lane",
    jsonld: db.routes.length ? { "@context": "https://schema.org", "@graph": db.routes.map((rt) => { const x = seo.routeLd(rt, { url: `${config.siteBase}passages.html#r-${rt.id}`, stopUrl: (s) => config.siteBase + href(s) }); delete x["@context"]; return x; }) } : undefined,
    body: (root) => db.routes.length ? db.routes.map((rt) => `<section class="section passage" id="r-${h.attr(rt.id)}" data-sheet="${rt.region}" aria-labelledby="r-${h.attr(rt.id)}-h"><h2 id="r-${h.attr(rt.id)}-h">${h.bullet(rt.region)}${h.esc(rt.title)}</h2>${rt.lede ? `<p class="lede">${h.esc(rt.lede)}</p>` : ""}<ol class="stops">${rt.stopsResolved.map((s) => `<li><a href="${root}${href(s)}">${h.esc(s.rec.name || s.rec.title)}</a>${s.note ? ` <span class="muted">${h.esc(s.note)}</span>` : ""}</li>`).join("")}</ol>${c.recordSource(rt)}</section>`).join("\n") : c.emptyState({ title: "No passages yet" }),
  })];
}
