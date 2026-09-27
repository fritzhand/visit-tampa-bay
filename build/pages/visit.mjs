/* ============================================================
   build/pages/visit.mjs · STUB by E1 · OWNER: the Visit lane (replace wholesale)
   Produces getting-around.html (contract: one element per transport record with id="t-<id>"; search
   entries link getting-around.html#t-<id>) and when-to-visit.html.
   ============================================================ */
import { stubPage } from "./_stub.mjs";

export function pages(ctx) {
  const { db, c, h, vocab } = ctx;
  const around = stubPage(ctx, {
    slug: "getting-around", title: "Getting around", kicker: "Visit", num: 5,
    lede: "Airports, the streetcar, water taxis, ferries, buses, trolleys, bike share, parking and tolls, each linked to its operator.",
    description: "Getting around Tampa Bay: airports, streetcar, water taxis, ferries, buses, trolleys, bike share, parking and tolls, each linked to its operator.",
    what: "Every way to get around, by mode, with fares and hours as the operators state them.", owner: "Visit lane",
    body: (root) => db.transport.length ? `<ul class="rows">${db.transport.map((t) => `<li class="row" id="t-${h.attr(t.id)}"><span><span class="t">${h.esc(t.name)}</span><span class="w">${h.esc([vocab.MODE_LABEL[t.mode], t.operator, t.fare_text || (t.is_free ? "Free" : "")].filter(Boolean).join(" · "))}</span></span>${t.summary ? `<p>${h.esc(t.summary)}</p>` : ""}${c.recordSource(t)}</li>`).join("")}</ul>` : c.emptyState({ title: "No transport listed yet" }),
  });
  const when = stubPage(ctx, {
    slug: "when-to-visit", title: "When to visit", kicker: "Visit", num: 5,
    lede: "Weather by month, hurricane season and the year's big events, from the National Weather Service and the organizers.",
    description: "When to visit Tampa Bay: weather by month, hurricane season and the calendar of annual events, each linked to its source.",
    what: "Climate by month, hurricane season and the events calendar by month.", owner: "Visit lane",
    body: (root) => [
      db.facts.length ? c.section({ id: "facts", title: "Facts", root, body: c.facts(root, db.facts.map((f) => [f.label, `${h.esc(f.value)}${f.as_of ? ` <span class="faint">(${h.esc(f.as_of)})</span>` : ""} <span class="faint">${h.extLink(f.source_url, h.esc(f.source))}</span>`]), { label: "Facts" }) }) : "",
      db.months.length ? c.section({ id: "months", title: "Events by month", root, body: `<ul class="rows">${db.months.map((m) => `<li class="row"><a href="${root}whats-on.html?month=${m.key}"><span><span class="t">${h.esc(m.label)}</span><span class="w">${h.esc(h.plural(m.count, "event"))}</span></span></a></li>`).join("")}</ul>` }) : "",
    ].join("\n"),
  });
  return [around, when];
}
