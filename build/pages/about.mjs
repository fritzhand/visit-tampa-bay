/* ============================================================
   build/pages/about.mjs · STUB by E1 · OWNER: the About lane (replace wholesale)
   Produces about.html. Contract: a section with id="corrections" (the footer links about.html#corrections),
   and the independence line verbatim (build/core/shell.mjs INDEPENDENCE).
   ============================================================ */
import { stubPage } from "./_stub.mjs";
import { INDEPENDENCE, SOURCED } from "../core/shell.mjs";

export function pages(ctx) {
  const { db, c, h, config, buildDate } = ctx;
  const hosts = new Map();
  for (const f of ["places", "stays", "experiences", "events", "series", "timeline", "transport", "faqs", "facts"]) for (const r of db[f]) { const k = h.hostOf(r.source_url); if (k) hosts.set(k, (hosts.get(k) || 0) + 1); }
  return [stubPage(ctx, {
    slug: "about", title: "About & sources", kicker: "Visit", num: 5,
    lede: `${INDEPENDENCE} ${SOURCED}`,
    description: "About this independent Tampa Bay guide: how it is made, where every fact comes from, and how to send a correction.",
    what: "How the guide is made, its sources and its image credits.", owner: "About lane",
    body: (root) => [
      c.section({ id: "independent", title: "Independent", root, body: `<div class="prose"><p>${h.esc(INDEPENDENCE)}</p><p>${h.esc(SOURCED)} Unknowns are printed as unknowns. Built ${h.esc(buildDate)}.</p></div>` }),
      c.section({ id: "sources", title: "Sources", root, body: hosts.size ? `<ul class="rows">${h.sortBy([...hosts], ([, n]) => -n, ([k]) => k).map(([k, n]) => `<li class="row"><span><span class="t">${h.esc(k)}</span><span class="w">${h.esc(h.plural(n, "entry", "entries"))}</span></span></li>`).join("")}</ul>` : "" }),
      c.section({ id: "corrections", title: "Corrections and takedowns", root, body: `<div class="prose"><p>Found an error, a closure or an image you want removed? Open an issue on ${h.extLink(config.repo + "/issues", "GitHub")} with the page and the source that states the fact.</p></div>` }),
    ].join("\n"),
  })];
}
