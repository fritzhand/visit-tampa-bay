/* ============================================================
   build/pages/region.mjs · STUB by E1 · OWNER: the Home & Sheets lane (replace wholesale)
   Produces the six sheet pages (build/nav.mjs REGION_PAGES): tampa.html, st-petersburg.html,
   gulf-beaches.html, clearwater.html, around-the-bay.html, day-trips.html.
   ============================================================ */
import { stubPage, rows } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h, cards, nav, seo, config } = ctx;
  return nav.REGION_PAGES.map((rp) => {
    const r = db.byId.region.get(rp.region);
    const top = h.sortBy(r.places, (p) => (p.signature ? 0 : 1), (p) => p.name.toLowerCase()).slice(0, 12);
    return stubPage(ctx, {
      slug: rp.slug, title: r.name, kicker: `Sheet ${r.n} · ${r.code}`, sheet: r.id,
      lede: r.lede || `${r.name}: ${h.plural(r.areas.length, "area")}, ${h.plural(r.places.length, "place")} and ${h.plural(r.stays.length, "place to stay", "places to stay")} in this guide.`,
      description: `${r.name} in this Tampa Bay guide: its areas, places to see, places to stay, events and history, each linked to its source.`,
      what: "The sheet: its areas, top places, stays, what is on and its history.", owner: "Home & Sheets lane",
      jsonld: seo.destinationLd(r, { url: `${config.siteBase}${rp.slug}.html` }),
      body: (root) => [
        c.section({ id: "areas", title: "Areas and towns", root, body: `<div class="grid">${r.areas.map((a) => cards.areaCard(root, a, { headingLevel: 3, summary: false })).join("")}</div>` }),
        top.length ? c.section({ id: "places", title: "Places", root, more: { href: `things-to-do.html?r=${r.id}`, label: "All places" }, body: `<div class="grid">${top.map((p) => cards.placeCard(root, p, { summary: false })).join("")}</div>` }) : "",
        r.stays.length ? c.section({ id: "stay", title: "Where to stay", root, more: { href: `stay.html?r=${r.id}`, label: "All places to stay" }, body: rows(r.stays.slice(0, 12).map((s) => cards.stayRow(root, s))) }) : "",
        r.events.length ? c.section({ id: "on", title: "What's on", root, more: { href: `whats-on.html?r=${r.id}`, label: "All events" }, body: `<ol class="tonight">${r.events.filter((e) => e.instances[0]).slice(0, 10).map((e) => cards.eventRow(root, e.instances[0])).join("")}</ol>` }) : "",
        r.record ? c.recordSource(r) : "",
      ].join("\n"),
    });
  });
}
