/* ============================================================
   build/components/heritage.mjs · OWNER: E1 (engine). The History lane may extend it additively.

   makeHeritage(ctx) → {
     heritageBlock(root, rec, { headingLevel = 2, id = "heritage", title = "History and heritage" })
         <section class="heritage" id="{id}"> for a place or stay with a heritage block: an "At a glance" facts
         box (built, architect, style, era), the designations (NRHP, National Historic Landmark, local; linked
         when they carry a url), the story (our words), "Visiting today", and the source line of heritage.sources.
         "" when the record has no heritage block.
     designationLine(d) → "National Register of Historic Places, #72000322 (1972)" (HTML, linked when d.url)
     eraLabel(era) → "Boomtown, 1884–1919"
     timelineItem(root, t, { headingLevel = 3 }) → <li class="tl-item" id="tl-{id}" data-era data-r> year, title,
         text, the places it happened at (linked), its source line
   }
   ============================================================ */
import { esc, attr, paras, extLink } from "../core/util.mjs";
import { ERA_LABEL } from "../core/vocab.mjs";

export function makeHeritage(ctx) {
  const { c } = ctx;
  const eraLabel = (era) => ERA_LABEL[era] || "";
  function designationLine(d) {
    const text = `${d.name}${d.ref ? `, #${d.ref}` : ""}${d.year ? ` (${d.year})` : ""}`;
    return d.url ? extLink(d.url, esc(text)) : esc(text);
  }
  function heritageBlock(root, rec, { headingLevel = 2, id = "heritage", title = "History and heritage" } = {}) {
    const h = rec && rec.heritage;
    if (!h) return "";
    const H = `h${headingLevel}`;
    const rows = [["Built", h.built ? esc(h.built) : c.unk("Year not listed")], ["Architect", h.architect ? esc(h.architect) : ""], ["Style", h.style ? esc(h.style) : ""], ["Era", h.era ? esc(eraLabel(h.era)) : ""]];
    return `<section class="heritage" id="${attr(id)}" aria-labelledby="${attr(id)}-h"${rec.region ? ` data-sheet="${rec.region}"` : ""}>
<${H} id="${attr(id)}-h">${esc(title)}</${H}>
${c.facts(root, rows, { label: "Heritage at a glance" })}
${(h.designations || []).length ? `<ul class="designations">${h.designations.map((d) => `<li>${designationLine(d)}</li>`).join("")}</ul>` : ""}
${h.story ? `<div class="prose">${paras(h.story)}</div>` : ""}
${h.visiting ? `<p class="heritage-visit"><b>Visiting today:</b> ${esc(h.visiting)}</p>` : ""}
${c.sourceLine(h.sources || [], { label: "Heritage source" })}
</section>`;
  }
  function timelineItem(root, t, { headingLevel = 3 } = {}) {
    const H = `h${headingLevel}`;
    const links = (t.links || []).map((l) => `<a href="${root}${l.kind === "stay" ? "stays" : "places"}/${attr(l.rec.id)}.html">${esc(l.rec.name)}</a>`);
    return `<li class="tl-item" id="tl-${attr(t.id)}" data-era="${t.era}"${t.region ? ` data-r="${t.region}" data-sheet="${t.region}"` : ""}><p class="tl-year tnum">${esc(t.date || String(t.year))}</p><${H} class="tl-title">${esc(t.title)}</${H}><p class="tl-text">${esc(t.text)}</p>${links.length ? `<p class="tl-places">At ${links.join(", ")}</p>` : ""}${c.recordSource(t)}</li>`;
  }
  return { heritageBlock, designationLine, eraLabel, timelineItem };
}
