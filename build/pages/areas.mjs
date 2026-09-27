/* ============================================================
   build/pages/areas.mjs · STUB by E1 · OWNER: the Areas lane (replace wholesale)
   Produces areas.html (params: r) and areas/<id>.html for EVERY area in build/core/vocab.mjs AREAS
   (db.areas always holds all of them; `record: false` when data/areas.json has no record yet).
   ============================================================ */
import { stubPage, rows } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h, cards, seo, config, vocab } = ctx;
  const list = stubPage(ctx, {
    slug: "areas", title: "Areas & towns", kicker: "Stay", num: 4,
    lede: "The neighborhoods, towns and beach towns on each sheet, with what is there.",
    description: "Tampa Bay's neighborhoods, towns and beach towns by sheet, with their places, places to stay and events.",
    what: "Every area by sheet, with what it is known for.", owner: "Areas lane",
    body: (root) => db.regions.map((r) => c.section({ id: `r-${r.id}`, title: r.name, root, body: `<div class="grid">${r.areas.map((a) => cards.areaCard(root, a)).join("")}</div>` })).join("\n"),
  });
  const detail = db.areas.map((a) => {
    const region = db.byId.region.get(a.region);
    return {
      path: `areas/${a.id}.html`, nav: "areas", title: a.name, pagenav: null,
      description: a.summary || `${a.name}, on the ${region.name} sheet of this Tampa Bay guide: places, places to stay, tours and events.`,
      crumbs: [["Overview", "index.html"], [region.name, ctx.h.regionHref(region.id)], [a.name, null]],
      jsonld: seo.destinationLd(a, { url: `${config.siteBase}areas/${a.id}.html` }),
      body: (root) => [
        c.pageHead({ kicker: `Sheet ${region.n} · ${region.name}${a.kind ? ` · ${vocab.AREA_KIND_LABEL[a.kind]}` : ""}`, sheet: a.region, title: a.name, lede: a.summary || "" }),
        (a.known_for || []).length ? `<p class="chip-row">${a.known_for.map((k) => `<span class="chip">${h.esc(k)}</span>`).join("")}</p>` : "",
        a.ll ? cards.miniMap(root, a.ll[0], a.ll[1], { sheet: a.region, label: `Map: ${a.name}`, halfWidthM: 2000 }) : "",
        a.places.length ? c.section({ id: "places", title: "Places", root, body: rows(h.sortBy(a.places, (p) => p.name.toLowerCase()).map((p) => cards.placeRow(root, p))) }) : "",
        a.stays.length ? c.section({ id: "stay", title: "Places to stay", root, body: rows(a.stays.map((s) => cards.stayRow(root, s))) }) : "",
        a.experiences.length ? c.section({ id: "experiences", title: "Experiences", root, body: rows(a.experiences.map((x) => cards.experienceRow(root, x))) }) : "",
        a.events.length ? c.section({ id: "events", title: "Events", root, body: `<ol class="tonight">${a.events.filter((e) => e.instances[0]).map((e) => cards.eventRow(root, e.instances[0])).join("")}</ol>` }) : "",
        a.record ? c.recordSource(a) : c.emptyState({ title: "No area profile yet", body: "This area's summary has not been written from a source yet.", glyph: "hood", level: 2 }),
      ].join("\n"),
    };
  });
  return [list, ...detail];
}
