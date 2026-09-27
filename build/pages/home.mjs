/* ============================================================
   build/pages/home.mjs · STUB by E1 · OWNER: the Home & Sheets lane (replace wholesale)
   Produces index.html (Overview). Contract: exactly one <h1> (c.pageHead), links only to pages
   and params in build/nav.mjs. Keep producing index.html.
   ============================================================ */
import { stubPage, rows } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h, cards, config } = ctx;
  const n = db.counts;
  return [stubPage(ctx, {
    slug: "index", title: "Overview", kicker: "Tampa Bay Chartbook", num: 1,
    lede: `${config.siteTagline}: where to stay, what to see and do, what is on and where the region's history happened.`,
    description: "An independent, source-linked visitor's guide to Tampa Bay: places, stays, tours, events and history, every entry linked to its source.",
    what: "The overview: the six sheets, what is on, and where to start.", owner: "Home lane",
    body: (root) => [
      c.section({ id: "sheets", title: "The six sheets", num: 2, root, body: rows(db.regions.map((r) => `<li class="row" data-sheet="${r.id}"><a href="${root}${h.regionHref(r.id)}">${h.bullet(r.id)}<span><span class="t">${h.esc(r.name)}</span><span class="w">${h.esc(`Sheet ${r.n} · ${r.code} · ${h.plural(r.places.length, "place")}`)}</span></span></a></li>`)) }),
      c.section({ id: "on", title: "What's on", num: 1, root, more: { href: "whats-on.html", label: "All events" }, body: db.instances.filter((x) => x.ev.live).length ? `<ol class="tonight">${db.instances.filter((x) => x.ev.live).slice(0, 8).map((x) => cards.eventRow(root, x)).join("")}</ol>` : c.emptyState({ title: "No events listed yet", level: 3 }) }),
      c.facts(root, [["Places", String(n.places)], ["Places to stay", String(n.stays)], ["Experiences", String(n.experiences)], ["Events", String(n.events)]], { label: "In this guide" }),
    ].join("\n"),
  })];
}
