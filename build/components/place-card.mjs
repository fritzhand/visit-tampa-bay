/* ============================================================
   build/components/place-card.mjs · OWNER: E1 (engine). Page lanes may extend it additively.

   makePlaceCards(ctx) → {
     placeCard(root, place, { headingLevel = 3, anchor = false, summary = true, meta = true, here = "" }),
     placeRow(root, place, { note })   a compact <li> for lists (name, kind · area, status), inside <ul class="rows">
     placeFacts(root, place)           the detail page's "At a glance" rows: [[label, valueHtml]] for c.facts()
     placeWhere(place)                 "3001 N Florida Ave · Tampa Heights" | "" (plain text)
   }
   Card contract (things-to-do, outdoors, history, eat-drink, region, area and nearby lists, My Trip):
   <article class="card place" [id="p-{id}"] data-place="{id}" data-sheet="{region}" data-r data-a data-k
            data-ks="{kind + kinds}" data-g="{groups}" data-t="{topics}" data-free data-st="{status}"
            [data-sig="1"] [data-era] [data-ll="lat,lng"] data-q>
     {plate: .photo with the image, or .plate-type with the chart code}
     .card-body (.card-kicker: sheet badge · kind · area, h3 a.stretched → places/{id}.html, status badge,
     .card-sum (our summary), .card-meta (hours · price, unknowns as unknowns))
     button.star[data-star][data-star-kind="p"]
   ============================================================ */
import { esc, attr } from "../core/util.mjs";
import { PLACE_KIND_LABEL, TOPIC_LABEL } from "../core/vocab.mjs";
import { norm } from "../../site/js/lib/search.js";

export function makePlaceCards(ctx) {
  const { db, c, img } = ctx;
  const areaName = (a) => db.byId.area.get(a)?.name || "";
  const placeWhere = (p) => [p.address, areaName(p.area)].filter(Boolean).join(" · ");
  const priceHtml = (p) => (p.price_text ? esc(p.price_text) : p.is_free === true ? "Free" : c.unk("Price not listed"));

  function placeCard(root, p, { headingLevel = 3, anchor = false, summary = true, meta = true, here = "" } = {}) {
    const H = `h${headingLevel}`;
    const q = norm([p.aliases, p.tags, p.city, (p.topics || []).map((t) => TOPIC_LABEL[t]), (p.kinds || []).map((k) => PLACE_KIND_LABEL[k])].flat().filter(Boolean).join(" "));
    const kicker = [c.sheetBadge(p.region), `<span class="card-kind">${esc(PLACE_KIND_LABEL[p.kind] || p.kind)}</span>`, p.area && p.area !== here ? `<span class="card-area">${esc(areaName(p.area))}</span>` : ""].filter(Boolean).join(" · ");
    return `<article class="card place"${anchor ? ` id="p-${attr(p.id)}"` : ""} data-place="${attr(p.id)}"${p.region ? ` data-sheet="${p.region}" data-r="${p.region}"` : ""} data-a="${attr(p.area)}" data-k="${p.kind}" data-ks="${p.kindsAll.join(" ")}" data-g="${p.groups.join(" ")}" data-t="${(p.topics || []).join(" ")}" data-free="${p.is_free === true ? 1 : 0}" data-st="${p.status}"${p.signature ? ' data-sig="1"' : ""}${p.heritage?.era ? ` data-era="${p.heritage.era}"` : ""}${p.ll ? ` data-ll="${p.ll.join(",")}"` : ""} data-q="${attr(q)}">`
      + img.plate(root, "p", p)
      + `<div class="card-body"><p class="card-kicker">${kicker}</p>`
      + `<${H} class="card-title"><a class="stretched" href="${root}places/${attr(p.id)}.html">${esc(p.name)}</a></${H}>`
      + (p.status !== "open" ? `<p class="card-status">${c.statusBadge(p)}</p>` : "")
      + (summary && p.summary ? `<p class="card-sum">${esc(p.summary)}</p>` : "")
      + (meta ? `<p class="card-meta">${p.hours_text ? esc(p.hours_text) : c.unk("Hours not listed")} · ${priceHtml(p)}</p>` : "")
      + `</div>${c.starButton(p.id, p.name, { kind: "p" })}</article>`;
  }

  function placeRow(root, p, { note = "" } = {}) {
    return `<li class="row place-row"${p.region ? ` data-sheet="${p.region}"` : ""}><a href="${root}places/${attr(p.id)}.html">${p.region ? ctx.h.bullet(p.region) : ""}<span><span class="t">${esc(p.name)}</span><span class="w">${esc([PLACE_KIND_LABEL[p.kind], areaName(p.area), note].filter(Boolean).join(" · "))}</span></span></a>${p.status !== "open" ? c.statusBadge(p) : ""}</li>`;
  }

  function placeFacts(root, p) {
    return [
      ["Kind", esc([p.kind, ...(p.kinds || [])].map((k) => PLACE_KIND_LABEL[k]).join(", "))],
      ["Area", `<a href="${root}areas/${attr(p.area)}.html">${esc(areaName(p.area))}</a>`],
      ["Address", p.address ? esc([p.address, p.city, [p.state, p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")) : c.unk("Address not listed")],
      ["Hours", p.hours_text ? esc(p.hours_text) : c.unk("Hours not listed")],
      ["Price", priceHtml(p)],
      ["Phone", p.phone ? `<a href="tel:${attr(p.phone.replace(/[^\d+]/g, ""))}">${esc(p.phone)}</a>` : c.unk("Phone not listed")],
      ["Status", p.status === "open" ? "Open" : `${c.statusBadge(p)}${p.status_note ? ` ${esc(p.status_note)}` : ""}`],
      ["Parking", p.parking_text ? esc(p.parking_text) : ""],
      ["Accessibility", p.accessibility ? esc(p.accessibility) : ""],
      ["Topics", (p.topics || []).length ? esc(p.topics.map((t) => TOPIC_LABEL[t]).join(", ")) : ""],
    ];
  }

  return { placeCard, placeRow, placeFacts, placeWhere };
}
