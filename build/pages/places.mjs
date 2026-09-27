/* ============================================================
   build/pages/places.mjs · STUB by E1 · OWNER: the Detail-pages lane (replace wholesale)
   Produces places/<id>.html for EVERY place (search entries and cards link there). nav: the Explore
   page its primary kind belongs to (eat-drink, outdoors, history, else things-to-do).
   ============================================================ */
import { rows } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h, cards, img, seo, config, vocab } = ctx;
  const navOf = (p) => ({ eat: "eat-drink", drink: "eat-drink", outdoors: "outdoors", history: "history" }[vocab.PLACE_GROUP[p.kind]] || "things-to-do");
  return db.places.map((p) => {
    const area = db.byId.area.get(p.area), region = db.byId.region.get(p.region);
    const parent = navOf(p);
    const dir = cards.directionsTo(p);
    return {
      path: `places/${p.id}.html`, nav: parent, title: p.name,
      description: p.summary || `${p.name}: ${vocab.PLACE_KIND_LABEL[p.kind]} in ${area.name}, ${region.name}. Hours, prices and the official source.`,
      crumbs: [["Overview", "index.html"], [ctx.nav.NAV_LABEL[parent], `${parent}.html`], [area.name, `areas/${p.area}.html`], [p.name, null]],
      pagenav: null,
      jsonld: seo.placeLd(p, { url: `${config.siteBase}places/${p.id}.html` }),
      body: (root) => [
        c.pageHead({ kicker: `Sheet ${region.n} · ${region.name} · ${vocab.PLACE_KIND_LABEL[p.kind]}`, sheet: p.region, title: p.name, lede: p.summary || "", after: `<p class="head-actions">${c.starButton(p.id, p.name, { kind: "p" })}${c.statusBadge(p)}</p>` }),
        img.figure(root, "p", p.id),
        p.quote ? c.callout("org", h.esc(p.quote), { cite: h.extLink(p.quote_source || p.source_url, h.esc(h.hostOf(p.quote_source || p.source_url))) }) : "",
        c.facts(root, cards.placeFacts(root, p)),
        c.keylinks(root, [p.url ? { href: p.url, label: "Official site" } : null, dir ? { href: dir.google, label: "Directions (Google Maps)" } : null, dir && dir.apple ? { href: dir.apple, label: "Directions (Apple Maps)" } : null]),
        p.ll ? cards.miniMap(root, p.ll[0], p.ll[1], { sheet: p.region, label: `Map: ${p.name}` }) : "",
        cards.heritageBlock(root, p),
        p.events.length ? c.section({ id: "events", title: "Events here", root, body: `<div class="grid">${p.events.map((e) => cards.eventCard(root, e, { anchor: false, here: p.id })).join("")}</div>` }) : "",
        p.experiences.length ? c.section({ id: "departures", title: "Tours that leave from here", root, body: rows(p.experiences.map((x) => cards.experienceRow(root, x))) }) : "",
        p.timeline.length ? c.section({ id: "history", title: "In the timeline", root, body: `<ol class="timeline">${p.timeline.map((t) => `<li><a href="${root}history.html#tl-${h.attr(t.id)}">${h.esc(t.date || String(t.year))}: ${h.esc(t.title)}</a></li>`).join("")}</ol>` }) : "",
        p.nearbyStays.length ? c.section({ id: "stay-nearby", title: "Places to stay nearby", root, body: rows(p.nearbyStays.map(({ rec, d }) => cards.stayRow(root, rec, { note: `${cards.distLabel(d)} away (straight line)` }))) }) : "",
        c.recordSource(p),
      ].join("\n"),
    };
  });
}
