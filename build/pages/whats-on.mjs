/* ============================================================
   build/pages/whats-on.mjs · STUB by E1 · OWNER: the What's On lane (replace wholesale)
   Produces whats-on.html. Contract the rest of the site relies on (build/CONTRACTS.md §9):
   - one event card per event with id="e-<id>" (every card's deep link is whats-on.html?e=<id>#e-<id>;
     the search entry is whats-on.html?e=<id>), cancelled and postponed ones included;
   - one element per series with id="s-<series id>" (search entries link whats-on.html#s-<id>).
   Params: build/nav.mjs PARAMS["whats-on"].
   ============================================================ */
import { stubPage } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h, cards } = ctx;
  const evs = h.sortBy(db.events, (e) => e.first, (e) => e.id);
  const byMonth = h.groupBy(evs, (e) => e.instances[0] ? e.instances[0].date.slice(0, 7) : e.date.slice(0, 7));
  return [stubPage(ctx, {
    slug: "whats-on", title: "What's On", kicker: "Plan", num: 1,
    lede: `Festivals, parades, fairs, concerts, games and shows from ${h.fmtDateY(db.window.start)} to ${h.fmtDateY(db.window.end)}, each linked to its source.`,
    description: "Every dated event in this Tampa Bay guide, by month: festivals, parades, fairs, concerts, home games and shows, each linked to its source.",
    what: "The calendar: filters by month, day, sheet, kind and price, a list or a map.", owner: "What's On lane",
    body: (root) => [
      c.section({ id: "calendar", title: "By month", root, body: evs.length ? [...byMonth].map(([m, list]) => `<h3 class="sub-h">${h.esc(h.fmtMonth(m))}</h3><div class="grid">${list.map((e) => cards.eventCard(root, e, { headingLevel: 4 })).join("")}</div>`).join("\n") : c.emptyState({ title: "No events listed yet" }) }),
      c.section({ id: "annual", title: "Every year", root, body: db.series.length ? `<ul class="rows">${db.series.map((s) => `<li class="row" id="s-${h.attr(s.id)}"${s.region ? ` data-sheet="${s.region}"` : ""}><span><span class="t">${h.esc(s.name)}</span><span class="w">${h.esc(s.when_text)}${s.venue ? ` · ${h.esc(s.venue.name)}` : s.location_text ? ` · ${h.esc(s.location_text)}` : ""}</span></span>${c.recordSource(s)}</li>`).join("")}</ul>` : c.emptyState({ title: "No annual events listed yet" }) }),
    ].join("\n"),
  })];
}
