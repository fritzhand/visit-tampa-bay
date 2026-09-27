/* ============================================================
   build/pages/stay.mjs · STUB by E1 · OWNER: the Stay lane (replace wholesale)
   Produces stay.html (Where to stay; params r a k f q view) and stays/<id>.html for EVERY stay
   (search entries and cards link there).
   ============================================================ */
import { stubPage, rows } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h, cards, img, seo, config, vocab } = ctx;
  const list = stubPage(ctx, {
    slug: "stay", title: "Where to stay", kicker: "Stay", num: 4,
    lede: "Hotels, resorts, inns, bed-and-breakfasts and campgrounds across Tampa Bay, with the features each one's own site states.",
    description: "Where to stay in Tampa Bay: hotels, resorts, inns and campgrounds by area, with features stated on each property's own site.",
    what: "Every place to stay, filtered by sheet, area, kind and feature, as a list or a map.", owner: "Stay lane",
    body: (root) => db.regions.map((r) => (r.stays.length ? c.section({ id: `r-${r.id}`, title: r.name, root, body: rows(h.sortBy(r.stays, (s) => s.name.toLowerCase()).map((s) => cards.stayRow(root, s))) }) : "")).join("\n").trim() || c.emptyState({ title: "No places to stay listed yet" }),
  });
  const detail = db.stays.map((s) => {
    const area = db.byId.area.get(s.area), region = db.byId.region.get(s.region);
    const dir = cards.directionsTo(s);
    return {
      path: `stays/${s.id}.html`, nav: "stay", title: s.name, pagenav: null,
      description: s.summary || `${s.name}: ${vocab.STAY_KIND_LABEL[s.kind]} in ${area.name}, ${region.name}. Features and the official source.`,
      crumbs: [["Overview", "index.html"], ["Where to stay", "stay.html"], [area.name, `areas/${s.area}.html`], [s.name, null]],
      jsonld: seo.stayLd(s, { url: `${config.siteBase}stays/${s.id}.html` }),
      body: (root) => [
        c.pageHead({ kicker: `Sheet ${region.n} · ${region.name} · ${vocab.STAY_KIND_LABEL[s.kind]}`, sheet: s.region, title: s.name, lede: s.summary || "", after: `<p class="head-actions">${c.starButton(s.id, s.name, { kind: "s" })}${c.statusBadge(s)}</p>` }),
        img.figure(root, "s", s.id),
        s.quote ? c.callout("org", h.esc(s.quote), { cite: h.extLink(s.quote_source || s.source_url, h.esc(h.hostOf(s.quote_source || s.source_url))) }) : "",
        c.facts(root, cards.stayFacts(root, s)),
        c.keylinks(root, [s.url ? { href: s.url, label: "Official site" } : null, dir ? { href: dir.google, label: "Directions (Google Maps)" } : null]),
        s.ll ? cards.miniMap(root, s.ll[0], s.ll[1], { sheet: s.region, label: `Map: ${s.name}` }) : "",
        cards.heritageBlock(root, s),
        s.nearbyPlaces.length ? c.section({ id: "nearby", title: "Nearby", root, body: rows(s.nearbyPlaces.map(({ rec, d }) => cards.placeRow(root, rec, { note: `${cards.distLabel(d)} away (straight line)` }))) }) : "",
        c.recordSource(s),
      ].join("\n"),
    };
  });
  return [list, ...detail];
}
