/* ============================================================
   build/components/area-card.mjs · OWNER: E1 (engine). The Areas lane may extend it additively.

   makeAreaCards(ctx) → {
     areaCard(root, area, { headingLevel = 3, anchor = false, summary = true }),
     areaCounts(area) → "12 places · 4 places to stay · 3 events" (plain text; "" when empty)
   }
   Card contract (areas page, region pages):
   <article class="card area" [id="a-{id}"] data-area="{id}" data-sheet="{region}" data-r [data-k="{area kind}"] data-q>
     {plate} .card-body (.card-kicker: sheet badge · kind, h3 a.stretched → areas/{id}.html, .card-sum,
     .card-known (known_for as words), .card-meta (counts))
   ============================================================ */
import { esc, attr, plural } from "../core/util.mjs";
import { AREA_KIND_LABEL } from "../core/vocab.mjs";
import { norm } from "../../site/js/lib/search.js";

export function makeAreaCards(ctx) {
  const { c, img } = ctx;
  const areaCounts = (a) => [
    a.places.length ? plural(a.places.length, "place") : "",
    a.stays.length ? plural(a.stays.length, "place to stay", "places to stay") : "",
    a.experiences.length ? plural(a.experiences.length, "experience") : "",
    a.events.length ? plural(a.events.length, "event") : "",
  ].filter(Boolean).join(" · ");

  function areaCard(root, a, { headingLevel = 3, anchor = false, summary = true } = {}) {
    const H = `h${headingLevel}`;
    const counts = areaCounts(a);
    return `<article class="card area"${anchor ? ` id="a-${attr(a.id)}"` : ""} data-area="${attr(a.id)}" data-sheet="${a.region}" data-r="${a.region}"${a.kind ? ` data-k="${a.kind}"` : ""} data-q="${attr(norm((a.known_for || []).join(" ")))}">`
      + img.plate(root, "a", a)
      + `<div class="card-body"><p class="card-kicker">${[c.sheetBadge(a.region), a.kind ? `<span class="card-kind">${esc(AREA_KIND_LABEL[a.kind])}</span>` : ""].filter(Boolean).join(" · ")}</p>`
      + `<${H} class="card-title"><a class="stretched" href="${root}areas/${attr(a.id)}.html">${esc(a.name)}</a></${H}>`
      + (summary && a.summary ? `<p class="card-sum">${esc(a.summary)}</p>` : "")
      + ((a.known_for || []).length ? `<p class="card-known">${a.known_for.map(esc).join(" · ")}</p>` : "")
      + `<p class="card-meta">${counts ? esc(counts) : c.unk("Nothing listed here yet")}</p>`
      + `</div></article>`;
  }

  return { areaCard, areaCounts };
}
