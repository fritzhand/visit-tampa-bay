/* ============================================================
   build/components/experience-card.mjs · OWNER: E1 (engine). The Experiences lane may extend it additively.

   makeExperienceCards(ctx) → {
     experienceCard(root, x, { headingLevel = 3, anchor = true, summary = true }),
     experienceRow(root, x, { note })  a compact <li> (name, kind · operator)
     experienceFacts(root, x)          "At a glance" rows for c.facts() (the dialog's no-JS twin)
     departsHtml(root, x)              "Departs from <a>Place</a>" | the source's departure text | unknown
   }
   Card contract (experiences, region, area and place pages, My Trip):
   <article class="card exp" [id="x-{id}"] data-x="{id}" data-sheet="{region}" data-r data-a data-k data-kg
            data-t="{topics}" data-free data-st [data-dp="{departs_place}"] [data-ll] data-q>
     {plate} .card-body (.card-kicker: sheet badge · kind · area, h3 a[href="{root}experiences.html?x={id}#x-{id}"]
     [data-open-experience="{id}"], .card-op (operator), .card-departs, status badge, .card-sum, .card-meta
     (duration · price, unknowns as unknowns), details.card-more (the no-JS body: schedule, season, ages, quote,
     booking and official links, source line)) · button.star[data-star][data-star-kind="x"]
   With JS, [data-open-experience] opens #experience-dialog (E2); ?x=<id> on load opens it too.
   ============================================================ */
import { esc, attr, extLink } from "../core/util.mjs";
import { EXPERIENCE_KIND_LABEL, TOPIC_LABEL } from "../core/vocab.mjs";
import { norm } from "../../site/js/lib/search.js";

export function makeExperienceCards(ctx) {
  const { db, c, img } = ctx;
  const areaName = (a) => db.byId.area.get(a)?.name || "";
  const priceHtml = (x) => (x.price_text ? esc(x.price_text) : x.is_free === true ? "Free" : c.unk("Price not listed"));

  function departsHtml(root, x) {
    if (x.departs) return `Departs from <a href="${root}places/${attr(x.departs.id)}.html">${esc(x.departs.name)}</a>`;
    if (x.departs_text) return `Departs from ${esc(x.departs_text)}`;
    if (x.address) return `Starts at ${esc(x.address)}`;
    return c.unk("Departure point not listed");
  }

  function experienceFacts(root, x) {
    return [
      ["Operator", x.url ? extLink(x.url, esc(x.operator)) : esc(x.operator)],
      ["Kind", esc(EXPERIENCE_KIND_LABEL[x.kind] || x.kind)],
      ["Where", departsHtml(root, x)],
      ["Area", `<a href="${root}areas/${attr(x.area)}.html">${esc(areaName(x.area))}</a>`],
      ["Duration", x.duration_text ? esc(x.duration_text) : c.unk("Duration not listed")],
      ["Price", priceHtml(x)],
      ["Schedule", x.schedule_text ? esc(x.schedule_text) : c.unk("Schedule not listed")],
      ["Season", x.season_text ? esc(x.season_text) : ""],
      ["Ages", x.ages_text ? esc(x.ages_text) : ""],
      ["Phone", x.phone ? `<a href="tel:${attr(x.phone.replace(/[^\d+]/g, ""))}">${esc(x.phone)}</a>` : ""],
      ["Status", x.status === "open" ? "" : `${c.statusBadge(x)}${x.status_note ? ` ${esc(x.status_note)}` : ""}`],
    ];
  }

  function experienceCard(root, x, { headingLevel = 3, anchor = true, summary = true } = {}) {
    const H = `h${headingLevel}`;
    const q = norm([x.operator, x.departs_text, x.departs?.name, x.tags, (x.topics || []).map((t) => TOPIC_LABEL[t]), x.city].flat().filter(Boolean).join(" "));
    const kicker = [c.sheetBadge(x.region), `<span class="card-kind">${esc(EXPERIENCE_KIND_LABEL[x.kind] || x.kind)}</span>`, `<span class="card-area">${esc(areaName(x.area))}</span>`].join(" · ");
    const more = [
      x.quote ? `<blockquote class="card-quote"><p>${esc(x.quote)}</p><cite>${extLink(x.quote_source || x.source_url, esc(x.operator))}</cite></blockquote>` : "",
      c.facts(root, experienceFacts(root, x).filter(([k]) => !["Operator", "Kind", "Area"].includes(k)), { label: "Details" }),
      x.booking_url ? `<p>${extLink(x.booking_url, "Book with the operator", "btn btn-secondary btn-sm")}</p>` : "",
      c.recordSource(x),
    ].join("");
    return `<article class="card exp"${anchor ? ` id="x-${attr(x.id)}"` : ""} data-x="${attr(x.id)}"${x.region ? ` data-sheet="${x.region}" data-r="${x.region}"` : ""} data-a="${attr(x.area)}" data-k="${x.kind}" data-kg="${x.kg}" data-t="${(x.topics || []).join(" ")}" data-free="${x.is_free === true ? 1 : 0}" data-st="${x.status}"${x.departs_place ? ` data-dp="${attr(x.departs_place)}"` : ""}${x.ll ? ` data-ll="${x.ll.join(",")}"` : ""} data-q="${attr(q)}">`
      + img.plate(root, "x", x)
      + `<div class="card-body"><p class="card-kicker">${kicker}</p>`
      + `<${H} class="card-title"><a href="${root}experiences.html?x=${attr(x.id)}#x-${attr(x.id)}" data-open-experience="${attr(x.id)}">${esc(x.name)}</a></${H}>`
      + `<p class="card-op">${esc(x.operator)}</p>`
      + `<p class="card-departs">${departsHtml(root, x)}</p>`
      + (x.status !== "open" ? `<p class="card-status">${c.statusBadge(x)}</p>` : "")
      + (summary && x.summary ? `<p class="card-sum">${esc(x.summary)}</p>` : "")
      + `<p class="card-meta">${x.duration_text ? esc(x.duration_text) : c.unk("Duration not listed")} · ${priceHtml(x)}</p>`
      + `<details class="card-more"><summary>Details</summary>${more}</details>`
      + `</div>${c.starButton(x.id, x.name, { kind: "x" })}</article>`;
  }

  function experienceRow(root, x, { note = "" } = {}) {
    return `<li class="row exp-row"${x.region ? ` data-sheet="${x.region}"` : ""}><a href="${root}experiences.html?x=${attr(x.id)}#x-${attr(x.id)}" data-open-experience="${attr(x.id)}">${x.region ? ctx.h.bullet(x.region) : ""}<span><span class="t">${esc(x.name)}</span><span class="w">${esc([EXPERIENCE_KIND_LABEL[x.kind], x.operator, note].filter(Boolean).join(" · "))}</span></span></a></li>`;
  }

  return { experienceCard, experienceRow, experienceFacts, departsHtml };
}
