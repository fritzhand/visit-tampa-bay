/* ============================================================
   build/components/stay-card.mjs · OWNER: E1 (engine). The Stay lane may extend it additively.
   Stay lane additions (2026-09-27): the options plate, symbol, facts and note (defaults keep E1's markup,
   plus the source's status note under the status badge of a place that is not open), and builtYear().

   makeStayCards(ctx) → {
     stayCard(root, stay, { headingLevel = 3, anchor = false, summary = true, features = 4, here = "",
                            plate = true, symbol = false, facts = false, note = "auto" }),
       plate  false → no typographic plate (a rights-cleared photo still shows when there is one): the compact
              "ledger" card of long lists (stay.html); the article then carries data-compact="1"
       symbol true → the chart symbol for a stay (the anchor) leads the kicker
       facts  true → a .card-facts line: "312 rooms · Opened 1928 · Built 1925" (only what the record states)
       note   "auto" → the source's status_note when the stay is not open; true → whenever there is one
              (an open hotel's closed pool or renovation); false → never
     stayRow(root, stay, { note })     a compact <li> (name, kind · area)
     stayFacts(root, stay)             the detail page's "At a glance" rows for c.facts()
     builtYear(rec)                    "1925" | "c. 1912" | "" : the first year heritage.built states
   }
   Card contract (stay, region, area pages, "Places to stay nearby", My Trip):
   <article class="card stay" [id="s-{id}"] data-stay="{id}" data-sheet="{region}" data-r data-a data-k
            data-f="{features}" data-st="{status}" [data-h="1" (heritage)] [data-ll] [data-compact="1"] data-q>
     {plate} .card-body (.card-kicker: sheet badge · [anchor] kind · area, h3 a.stretched → stays/{id}.html,
     .card-brand (brand · collection), status badge, [.card-note], .card-sum, .card-feats (feature words),
     [.card-facts]) button.star[data-star][data-star-kind="s"]
   Features print as words, only those the hotel's own page states (research rule).
   ============================================================ */
import { esc, attr } from "../core/util.mjs";
import { icon } from "../core/icons.mjs";
import { STAY_KIND_LABEL, FEATURE_LABEL } from "../core/vocab.mjs";
import { norm } from "../../site/js/lib/search.js";

/** The first year heritage.built states ("1925", "c. 1912"), else "". Never a guess: "" when it names no year. */
export function builtYear(rec) {
  const b = rec && rec.heritage && rec.heritage.built;
  if (!b) return "";
  const m = /^\s*((?:c\.|ca\.|circa)\s*)?(\d{4})\b/i.exec(String(b));
  return m ? `${m[1] ? "c. " : ""}${m[2]}` : "";
}

export function makeStayCards(ctx) {
  const { db, c, img } = ctx;
  const areaName = (a) => db.byId.area.get(a)?.name || "";

  /** "312 rooms · Opened 1928 · Built 1925": only the facts the record states. */
  const factsLine = (s) => [
    Number.isInteger(s.rooms) ? `${s.rooms.toLocaleString("en-US")} ${s.rooms === 1 ? "room" : "rooms"}` : "",
    s.opened ? `Opened ${s.opened}` : "",
    builtYear(s) && builtYear(s) !== s.opened ? `Built ${builtYear(s)}` : "",
  ].filter(Boolean);

  function stayCard(root, s, { headingLevel = 3, anchor = false, summary = true, features = 4, here = "", plate = true, symbol = false, facts = false, note = "auto" } = {}) {
    const H = `h${headingLevel}`;
    const q = norm([s.aliases, s.brand, s.collection, s.city, s.tags, (s.features || []).slice(features).map((f) => FEATURE_LABEL[f])].flat().filter(Boolean).join(" "));
    const kicker = [c.sheetBadge(s.region), `<span class="card-kind">${symbol ? icon("anchor") : ""}${esc(STAY_KIND_LABEL[s.kind] || s.kind)}</span>`, s.area && s.area !== here ? `<span class="card-area">${esc(areaName(s.area))}</span>` : ""].filter(Boolean).join(" · ");
    const brand = [s.brand, s.collection].filter(Boolean).join(" · ");
    const feats = (s.features || []).slice(0, features).map((f) => esc(FEATURE_LABEL[f] || f));
    const showNote = s.status_note && (note === true || (note === "auto" && s.status !== "open"));
    const pic = plate ? img.plate(root, "s", s) : img.has("s", s.id) ? img.plate(root, "s", s) : "";
    const fl = facts ? factsLine(s) : [];
    return `<article class="card stay"${anchor ? ` id="s-${attr(s.id)}"` : ""} data-stay="${attr(s.id)}"${s.region ? ` data-sheet="${s.region}" data-r="${s.region}"` : ""} data-a="${attr(s.area)}" data-k="${s.kind}" data-f="${(s.features || []).join(" ")}" data-st="${s.status}"${s.heritage ? ' data-h="1"' : ""}${s.ll ? ` data-ll="${s.ll.join(",")}"` : ""}${plate ? "" : ' data-compact="1"'} data-q="${attr(q)}">`
      + pic
      + `<div class="card-body"><p class="card-kicker">${kicker}</p>`
      + `<${H} class="card-title"><a class="stretched" href="${root}stays/${attr(s.id)}.html">${esc(s.name)}</a></${H}>`
      + (brand ? `<p class="card-brand">${esc(brand)}</p>` : "")
      + (s.status !== "open" ? `<p class="card-status">${c.statusBadge(s)}</p>` : "")
      + (showNote ? `<p class="card-note${s.status === "open" ? " is-open" : ""}">${s.status === "open" ? '<b class="label">Note</b> ' : ""}${esc(s.status_note)}</p>` : "")
      + (summary && s.summary ? `<p class="card-sum">${esc(s.summary)}</p>` : "")
      + (feats.length ? `<p class="card-feats">${feats.join(" · ")}${(s.features || []).length > features ? ` <span class="faint">and ${s.features.length - features} more</span>` : ""}</p>` : "")
      + (fl.length ? `<p class="card-facts">${esc(fl.join(" · "))}</p>` : "")
      + `</div>${c.starButton(s.id, s.name, { kind: "s" })}</article>`;
  }

  function stayRow(root, s, { note = "" } = {}) {
    return `<li class="row stay-row"${s.region ? ` data-sheet="${s.region}"` : ""}><a href="${root}stays/${attr(s.id)}.html">${s.region ? ctx.h.bullet(s.region) : ""}<span><span class="t">${esc(s.name)}</span><span class="w">${esc([STAY_KIND_LABEL[s.kind], areaName(s.area), note].filter(Boolean).join(" · "))}</span></span></a>${s.status !== "open" ? c.statusBadge(s) : ""}</li>`;
  }

  function stayFacts(root, s) {
    return [
      ["Kind", esc(STAY_KIND_LABEL[s.kind] || s.kind)],
      ["Brand", [s.brand, s.collection].filter(Boolean).length ? esc([s.brand, s.collection].filter(Boolean).join(" · ")) : ""],
      ["Area", `<a href="${root}areas/${attr(s.area)}.html">${esc(areaName(s.area))}</a>`],
      ["Address", s.address ? esc([s.address, s.city, [s.state, s.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")) : c.unk("Address not listed")],
      ["Phone", s.phone ? `<a href="tel:${attr(s.phone.replace(/[^\d+]/g, ""))}">${esc(s.phone)}</a>` : c.unk("Phone not listed")],
      ["Rooms", s.rooms ? esc(String(s.rooms)) : ""],
      ["Opened", s.opened ? esc(s.opened) : ""],
      ["Features", (s.features || []).length ? esc(s.features.map((f) => FEATURE_LABEL[f] || f).join(", ")) : c.unk("Features not listed")],
      ["Status", s.status === "open" ? "Open" : `${c.statusBadge(s)}${s.status_note ? ` ${esc(s.status_note)}` : ""}`],
    ];
  }

  return { stayCard, stayRow, stayFacts, builtYear };
}
