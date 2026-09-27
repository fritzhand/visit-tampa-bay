/* ============================================================
   build/pages/history.mjs · OWNER: the History lane (history-and-passages)
   history.html: "Tampa Bay in seven eras".
     1. The seven eras (a rail: each era's span, its entries and its historic sites, computed from data).
     2. The timeline by era: every data/timeline.json entry as <li class="tl-item" id="tl-<id>"> in an
        ol.timeline (the coastline, a landmark where it happened at a place you can visit): its date as the
        source gives it (a year without a month or day prints the year only; an entry with no date says
        "approximate"), title, text, the places and hotels it links, its image with the full credit line when
        data/images.json has one (t/<id>), and its source line. Era intros are computed (span, count, first and
        last entries), never written.
     3. Historic sites you can visit: every place and stay with a heritage block, the seven National Historic
        Landmarks first (cards), then a register grouped by sheet and area, designations as words
        ("National Register of Historic Places, #78000945 (1978)"), with a link to map.html?layers=heritage.
     4. Passages through this history (routes whose stops are mostly historic sites).
   Filter (the core list filter, core/filter.js): one [data-filter-list] holds the timeline and the register;
   the controls set era, r and q (build/nav.mjs PARAMS.history), so ?era=boomtown&r=tampa is a link.
   site/js/features/history.js writes the two per-section counts and empty states (the core writes one).
   Contract (build/CONTRACTS.md §3): one element id="tl-<id>" per timeline entry.
   ============================================================ */
import { norm } from "../../site/js/lib/search.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MON = MONTHS.map((m) => m.slice(0, 3));
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

/** A year as printed: -500 → "500 BCE"; a first-peoples year → "900 CE"; else "1886". */
export function yearText(year, era = "") {
  if (year < 0) return `${-year} BCE`;
  if (era === "indigenous" || year < 1000) return `${year} CE`;
  return String(year);
}
/** The date of a timeline entry as the source gives it: { year, day, iso, approx, about }.
 *  "1914-01-01" → day "Jan 1"; "1539-05" → day "May"; "1821" → the year only. An entry with no `date` is read
 *  from its own text (our summary of its sources), never guessed: "from about 900 CE" → about (printed "About");
 *  "in the 1960s" → the decade ("1960s"); "went up … in 1887" → the year only, like a year-only date; a year the
 *  text never states → approx (the year is only its place in the timeline: "No exact date"). */
export function tlDate(t) {
  const d = t.date || "";
  let m;
  if ((m = /^(-?\d{1,4})-(\d{2})-(\d{2})$/.exec(d))) return { year: yearText(Number(m[1]), t.era), day: `${MON[Number(m[2]) - 1]} ${Number(m[3])}`, iso: d, approx: false, about: false };
  if ((m = /^(-?\d{1,4})-(\d{2})$/.exec(d))) return { year: yearText(Number(m[1]), t.era), day: MONTHS[Number(m[2]) - 1], iso: d, approx: false, about: false };
  if ((m = /^(-?\d{1,4})$/.exec(d))) return { year: yearText(Number(m[1]), t.era), day: "", iso: Number(m[1]) > 999 ? m[1] : "", approx: false, about: false };
  if (d) return { year: yearText(t.year, t.era), day: d, iso: "", approx: false, about: false };        // free text: print it as given
  const y = Math.abs(Number(t.year)), text = String(t.text || "");
  const yearIn = y ? new RegExp(`(?<![\\d.,])${y}(?![\\d])`) : null;
  if (yearIn && new RegExp(`\\b(?:about|around|approximately|circa|c\\.)\\s*\\(?\\s*${y}(?![\\d])`, "i").test(text)) return { year: yearText(t.year, t.era), day: "", iso: "", approx: false, about: true };
  if (y > 999 && y % 10 === 0 && new RegExp(`(?<![\\d.,])${y}s\\b`).test(text) && !new RegExp(`(?<![\\d.,])${y}(?![\\ds])`).test(text)) return { year: `${y}s`, day: "", iso: "", approx: false, about: false };
  if (yearIn && yearIn.test(text)) return { year: yearText(t.year, t.era), day: "", iso: y > 999 ? String(y) : "", approx: false, about: false };
  return { year: yearText(t.year, t.era), day: "", iso: "", approx: true, about: false };
}
/** A date as words in a sentence: "about 900 CE", "the 1960s", "1886". */
export const dateWords = (x) => (x.approx || x.about ? `about ${x.year}` : /\ds$/.test(x.year) ? `the ${x.year}` : x.year);
/** Designation words: which kinds a record holds (for counts and the register's tags). */
/** Link words for a list of source URLs: the host, and when one host appears more than once, the page too
 *  ("armatureworks.com (about)", "en.wikipedia.org (History of Tampa, Florida)"), so two links never read the same. */
export function sourceWords(urls) {
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  const words = (u, whole) => {
    try {
      const x = new URL(u), segs = x.pathname.split("/").filter(Boolean);
      let w = decodeURIComponent(whole ? segs.join("/") : segs.pop() || "").replace(/\.(html?|php|aspx?|pdf)$/i, "").replace(/[_-]+/g, " ").trim();
      if (x.search) w = `${w} ${decodeURIComponent(x.search.slice(1)).replace(/[=&_-]+/g, " ")}`.trim();
      return w.length > 40 ? `${w.slice(0, 38).trim()}…` : w;
    } catch { return ""; }
  };
  const n = {};
  for (const u of urls) n[host(u)] = (n[host(u)] || 0) + 1;
  let out = urls.map((u) => (n[host(u)] > 1 && words(u) ? `${host(u)} (${words(u)})` : host(u)));
  // two pages that still read the same: name the whole path, then number what is left
  out = out.map((w, i) => (out.indexOf(w) !== out.lastIndexOf(w) && words(urls[i], true) ? `${host(urls[i])} (${words(urls[i], true)})` : w));
  return out.map((w, i) => (out.indexOf(w) !== i ? `${w} (${out.slice(0, i).filter((x) => x === w).length + 1})` : w));
}
/** The same page, however it is written (www., a trailing slash, the scheme's case). */
export const pageKey = (u) => { try { const x = new URL(u); return `${x.hostname.replace(/^www\./, "").toLowerCase()}${x.pathname.replace(/\/+$/, "")}${x.search}`; } catch { return u; } };
/** A source line from URLs (deduped, labeled by sourceWords), with an optional note ("Checked Sep 27, 2026"). */
export function sourceLineHtml(h, urls, { label = "Source", note = "", icon = "", cls = "" } = {}) {
  const seen = new Set(), u = urls.filter((x) => x && !seen.has(pageKey(x)) && seen.add(pageKey(x)));
  if (!u.length) return "";
  const words = sourceWords(u);
  return `<p class="source-line${cls ? ` ${cls}` : ""}">${icon}<span>${h.esc(label)}${u.length > 1 ? "s" : ""}: ${u.map((x, i) => h.extLink(x, h.esc(words[i]))).join(" · ")}</span>${note ? `<span>${h.esc(note)}</span>` : ""}</p>`;
}
export const isNHL = (d) => /^National Historic Landmark/.test(d.name);
export const isNR = (d) => /National Register/.test(d.name) && !/delisted/i.test(d.name);
const firstYear = (s) => { const m = /(\d{4})/.exec(String(s || "")); return m ? Number(m[1]) : null; };
/** The register's big numeral: only when `built` is a plain year or range ("1912", "1898–1905", "c. 1855", "about 1928");
 *  anything qualified ("1539 (event commemorated)", "1900–1949 (period of significance)") keeps its words only. */
export function yearNumeral(built) {
  const m = /^\s*(c\.|ca\.|circa|about)?\s*(\d{4})(?:\s*[–-]\s*\d{2,4})?\s*$/i.exec(String(built || ""));
  return m ? `${m[1] ? "c. " : ""}${m[2]}` : "";
}

export function pages(ctx) {
  const { db, c, h, cards, img, vocab } = ctx;
  const { ERAS, ERA_NAME, ERA_SPAN, PLACE_KIND_LABEL, STAY_KIND_LABEL, AREA_IDS, REGION_IDS, REGIONS } = vocab;
  const areaName = (a) => db.byId.area.get(a)?.name || "";
  const hrefOf = (kind, rec) => `${kind === "stay" ? "stays" : "places"}/${rec.id}.html`;
  const kindLabel = (kind, rec) => (kind === "stay" ? STAY_KIND_LABEL[rec.kind] || "Hotel" : PLACE_KIND_LABEL[rec.kind] || rec.kind);
  const count = (n, one, many) => h.plural(n, one, many);
  const spanText = (era) => { const [a, b] = ERA_SPAN[era]; return a == null ? `Before ${b + 1}` : b == null ? `${a} to today` : `${a}–${b}`; };

  /* ---------- the data, computed once ---------- */
  const eras = ERAS.map((era, i) => {
    const entries = db.timelineByEra.get(era) || [];
    const sites = db.heritage.filter((x) => x.rec.heritage.era === era);
    return { era, i, entries, sites, at: entries.filter((t) => t.links.length).length };
  });
  const timeline = eras.flatMap((e) => e.entries);
  const sites = db.heritage;
  const nhl = sites.filter((x) => (x.rec.heritage.designations || []).some(isNHL));
  const nr = sites.filter((x) => (x.rec.heritage.designations || []).some(isNR));
  const placesN = sites.filter((x) => x.kind === "place").length, staysN = sites.length - placesN;
  const first = timeline[0], last = timeline[timeline.length - 1];
  const imagesShown = timeline.filter((t) => img.has("t", t.id)).length;
  // passages whose stops are mostly historic sites (the routes lane's data; computed, never listed by hand)
  const heritageOf = (s) => (s.kind === "place" || s.kind === "stay") && s.rec.heritage ? s.rec.heritage : null;
  const routeEras = db.routes.map((rt) => {
    const hs = rt.stopsResolved.map(heritageOf).filter(Boolean);
    return { rt, hs, eras: new Set(hs.map((x) => x.era).filter(Boolean)) };
  }).filter((x) => x.hs.length >= 2 && x.hs.length * 2 >= x.rt.stopsResolved.length);

  /* ---------- pieces ---------- */
  function dateBlock(t) {
    const d = tlDate(t);
    const m = /^(\d+) (BCE|CE)$/.exec(d.year);
    const yy = m ? `${m[1]}<span class="era-sfx">${m[2]}</span>` : h.esc(d.year);
    const y = d.iso ? `<time datetime="${h.attr(d.iso)}">${yy}</time>` : yy;
    return `<div class="hx-when">${d.about ? `<p class="hx-day hx-approx">About</p>` : ""}<p class="tl-year">${y}</p>${d.day ? `<p class="hx-day">${h.esc(d.day)}</p>` : ""}${d.approx ? `<p class="hx-day hx-approx">No exact date</p>` : ""}</div>`;
  }
  function figureOf(root, t) {
    if (!img.has("t", t.id)) return "";
    const e = img.entry("t", t.id);
    const m = (t.media || []).map((id) => db.byId.media.get(id)).find(Boolean);
    const cap = m && m.title ? (/[.!?]$/.test(m.title) ? m.title : `${m.title}.`) : "";
    return img.figure(root, "t", t.id, { cls: `hx-fig${e.h > e.w ? " is-tall" : ""}`, big: false, sizes: "(min-width: 760px) 280px, 92vw", caption: cap });
  }
  /** A record's source line (source_url + also_sources, "Checked …"), without the icon: 115 of them on this page. */
  function srcLine(rec) {
    return sourceLineHtml(h, [rec.source_url, rec.quote_source, ...(rec.also_sources || [])], { note: rec.checked ? `Checked ${h.fmtDateY(rec.checked)}` : "" });
  }
  function tlItem(root, t) {
    const links = t.links.map((l) => `<a href="${root}${hrefOf(l.kind, l.rec)}">${h.esc(l.rec.name)}</a>${l.rec.status && l.rec.status !== "open" ? ` ${c.statusBadge(l.rec)}` : ""}`);
    const q = norm([ERA_NAME[t.era], t.links.map((l) => l.rec.aliases || []), t.year].flat(3).filter(Boolean).join(" "));
    const fig = figureOf(root, t);
    return `<li class="tl-item hx-item${t.links.length ? " is-at" : ""}${fig ? " has-fig" : ""}" id="tl-${h.attr(t.id)}" data-era="${t.era}"${t.region ? ` data-sheet="${t.region}"` : ""} data-q="${h.attr(q)}">`
      + dateBlock(t)
      + `<div class="hx-body"><h3 class="tl-title">${h.esc(t.title)}</h3>`
      + (t.area ? `<p class="hx-meta"><a href="${root}areas/${h.attr(t.area)}.html">${h.esc(areaName(t.area))}</a></p>` : "")
      + `<p class="tl-text">${h.esc(t.text)}</p>`
      + fig
      + (links.length ? `<p class="tl-places"><span><span class="label">You can visit</span> ${links.join(", ")}</span></p>` : "")
      + srcLine(t)
      + `</div></li>`;
  }
  function eraIntro(root, e) {
    if (!e.entries.length) return `<p class="hx-intro">No timeline entries for this era yet.</p>`;
    const a = e.entries[0], b = e.entries[e.entries.length - 1];
    const d = (t) => dateWords(tlDate(t));
    const parts = [
      `${count(e.entries.length, "entry", "entries")}${e.entries.length > 1 ? `, from ${h.esc(d(a))} (<a href="#tl-${h.attr(a.id)}">${h.esc(a.title)}</a>) to ${h.esc(d(b))} (<a href="#tl-${h.attr(b.id)}">${h.esc(b.title)}</a>)` : ` (<a href="#tl-${h.attr(a.id)}">${h.esc(a.title)}</a>)`}.`,
      e.at ? `${e.at} of them happened at places in this guide you can visit.` : "",
    ].filter(Boolean).join(" ");
    const siteLink = e.sites.length ? `<a class="hx-sitelink" href="${root}history.html?era=${e.era}#sites">${h.icon("landmark")}${h.esc(`${count(e.sites.length, "historic site", "historic sites")} from this era`)}${h.icon("arrow-r")}</a>` : "";
    const walks = routeEras.filter((x) => x.eras.has(e.era));
    const walk = walks.length ? `<span class="hx-walk">${h.icon("route")}<span>Passage${walks.length > 1 ? "s" : ""}: ${walks.map((x) => `<a href="${root}passages.html#r-${h.attr(x.rt.id)}">${h.esc(x.rt.title)}</a>`).join(", ")}</span></span>` : "";
    return `<p class="hx-intro">${parts}</p>${siteLink || walk ? `<p class="hx-links">${siteLink}${walk}</p>` : ""}`;
  }
  function eraSection(root, e) {
    return `<section class="section hx-era oxford" id="era-${e.era}" aria-labelledby="era-${e.era}-h" data-filter-group data-era-sec="${e.era}">
<div class="hx-era-head"><p class="hx-era-no" aria-hidden="true">${ROMAN[e.i]}</p><div><p class="sec-kicker label">Era ${e.i + 1} of ${ERAS.length} · ${h.esc(spanText(e.era))}</p><h2 id="era-${e.era}-h">${h.esc(ERA_NAME[e.era])}</h2></div></div>
${eraIntro(root, e)}
${e.entries.length ? `<ol class="timeline hx-tl">${e.entries.map((t) => tlItem(root, t)).join("")}</ol>` : ""}
</section>`;
  }

  /* the rail of seven eras (links to the sections; counts computed) */
  function eraRail(root) {
    return `<nav class="hx-rail" aria-label="The seven eras"><ol>${eras.map((e) => `<li><a href="#era-${e.era}"><span class="hx-rail-no" aria-hidden="true">${ROMAN[e.i]}</span><span class="hx-rail-name">${h.esc(ERA_NAME[e.era])}</span><span class="hx-rail-span">${h.esc(spanText(e.era))}</span><span class="hx-rail-n">${h.esc(count(e.entries.length, "entry", "entries"))} · ${h.esc(count(e.sites.length, "site", "sites"))}</span></a></li>`).join("")}</ol></nav>`;
  }

  function stats() {
    const tile = (n, label) => `<div class="hx-stat"><dt>${h.esc(label)}</dt><dd>${h.esc(String(n))}</dd></div>`;
    return `<dl class="hx-stats" aria-label="The history at a glance">${[
      tile(timeline.length, "Timeline entries"),
      tile(sites.length, `Historic places (${placesN}) and places to stay (${staysN})`),
      tile(nhl.length, "Tied to a National Historic Landmark"),
      tile(nr.length, "Tied to a National Register listing"),
    ].join("")}</dl>`;
  }

  /* ---------- historic sites ---------- */
  function designationTags(rec) {
    const ds = rec.heritage.designations || [];
    if (!ds.length) return `<p class="hs-des-none">${c.unk("No designation listed")}</p>`;
    // the words only: each designation's own page is linked from the site's page (keeps this long list light)
    return `<ul class="designations hs-des">${ds.map((d) => `<li${isNHL(d) ? ' class="is-nhl"' : ""}>${h.esc(`${d.name}${d.ref ? `, #${d.ref}` : ""}${d.year ? ` (${d.year})` : ""}`)}</li>`).join("")}</ul>`;
  }
  function builtHtml(rec) {
    const b = rec.heritage.built;
    return b ? `Built ${h.esc(b)}` : c.unk("Year built not listed");
  }
  // every site row's record was checked the same day? then the register says it once (else each row does)
  const checkedDays = new Set(sites.map((x) => x.rec.checked || ""));
  const oneDay = checkedDays.size === 1 ? [...checkedDays][0] : "";
  function siteRow(root, { kind, rec }) {
    const her = rec.heritage;
    const y = yearNumeral(her.built);
    const q = norm([rec.aliases, areaName(rec.area), kind === "stay" ? "hotel" : ""].flat().filter(Boolean).join(" "));
    const src = (her.sources || [])[0] || rec.source_url;
    return `<li class="hs-item${kind === "stay" ? " is-stay" : ""}" id="hs-${h.attr(rec.id)}"${rec.region ? ` data-sheet="${rec.region}"` : ""}${her.era ? ` data-era="${her.era}"` : ""}${q ? ` data-q="${h.attr(q)}"` : ""}>`
      + (kind === "stay" ? `<span class="hs-sym" aria-hidden="true">${h.icon("anchor")}</span>` : "")
      + `<div class="hs-body"><p class="hs-kicker label">${h.esc(kindLabel(kind, rec))}${her.era ? ` · ${h.esc(ERA_NAME[her.era])}` : ""}</p>`
      + `<p class="hs-name"><a href="${root}${hrefOf(kind, rec)}">${h.esc(rec.name)}</a>${rec.status !== "open" ? ` ${c.statusBadge(rec)}` : ""}</p>`
      + `<p class="hs-meta">${builtHtml(rec)}${her.architect ? ` · ${h.esc(her.architect)}` : ""}</p>`
      + designationTags(rec)
      + (src ? `<p class="hs-src">Source: ${h.extLink(src, h.esc(h.hostOf(src)))}${!oneDay && rec.checked ? ` · Checked ${h.esc(h.fmtDateY(rec.checked))}` : ""}</p>` : "")
      + `</div>`
      + (y ? `<p class="hs-year" aria-hidden="true">${y}</p>` : `<span></span>`)
      + c.starButton(rec.id, rec.name, { kind: kind === "stay" ? "s" : "p" })
      + `</li>`;
  }
  function landmarkCard(root, { kind, rec }) {
    const d = (rec.heritage.designations || []).filter(isNHL)[0];
    const photo = img.has(kind === "stay" ? "s" : "p", rec.id);
    const src = (rec.heritage.sources || [])[0] || rec.source_url;
    const q = norm([rec.aliases, areaName(rec.area), kind === "stay" ? "hotel" : ""].flat().filter(Boolean).join(" "));
    return `<article class="card hx-lm" id="lm-${h.attr(rec.id)}" data-sheet="${rec.region}"${rec.heritage.era ? ` data-era="${rec.heritage.era}"` : ""}${q ? ` data-q="${h.attr(q)}"` : ""}>`
      + img.plate(root, kind === "stay" ? "s" : "p", rec)
      + `<div class="card-body"><p class="card-kicker">${c.sheetBadge(rec.region)} · <span>${h.esc(kindLabel(kind, rec))}</span> · <span>${h.esc(areaName(rec.area))}</span></p>`
      + `<h4 class="card-title"><a class="stretched" href="${root}${hrefOf(kind, rec)}">${h.esc(rec.name)}</a></h4>`
      + `<p class="hx-lm-des">${h.esc(`${d ? d.name : "National Historic Landmark"}${d && d.year ? `, ${d.year}` : ""}`)}</p>`
      + (rec.summary ? `<p class="card-sum">${h.esc(rec.summary)}</p>` : "")
      + `<p class="card-meta">${builtHtml(rec)}</p>`
      + (photo ? `<p class="hx-credit">${img.creditHtml(kind === "stay" ? "s" : "p", rec.id)}</p>` : "")
      + (src ? `<p class="hs-src hx-lm-src">Source: ${h.extLink(src, h.esc(h.hostOf(src)))}${rec.checked ? ` · Checked ${h.esc(h.fmtDateY(rec.checked))}` : ""}</p>` : "")
      + `</div>${c.starButton(rec.id, rec.name, { kind: kind === "stay" ? "s" : "p" })}</article>`;
  }
  function register(root) {
    const bySheet = REGION_IDS.map((r) => ({ r, list: sites.filter((x) => x.rec.region === r) })).filter((g) => g.list.length);
    return bySheet.map(({ r, list }) => {
      const areas = AREA_IDS.map((a) => ({ a, list: h.sortBy(list.filter((x) => x.rec.area === a), (x) => firstYear(x.rec.heritage.built) ?? 9999, (x) => x.rec.name.toLowerCase()) })).filter((g) => g.list.length);
      return `<div class="hs-sheet" data-sheet="${r}" data-filter-group>
<h3 class="hs-sheet-h">${h.bullet(r, "lg")}<a href="${root}${h.regionHref(r)}">${h.esc(REGIONS[r].name)}</a><span class="hs-n">${h.esc(count(list.length, "site", "sites"))}</span></h3>
${areas.map(({ a, list: al }) => `<div class="hs-area" data-filter-group><h4 class="hs-area-h"><a href="${root}areas/${a}.html">${h.esc(areaName(a))}</a><span class="hs-n">${al.length}</span></h4><ul class="hs-list">${al.map((x) => siteRow(root, x)).join("")}</ul></div>`).join("\n")}
</div>`;
    }).join("\n");
  }

  /* ---------- the filter bar (JS only; without JS every list shows) ---------- */
  function filterBar() {
    const eraChips = eras.map((e) => c.chip(ERA_NAME[e.era], null, { pressed: false, attrs: `data-filter-chip="era=${e.era}"` })).join("");
    const sheetChips = REGION_IDS.filter((r) => timeline.some((t) => t.region === r) || sites.some((x) => x.rec.region === r)).map((r) => c.chip(REGIONS[r].short, null, { sheet: r, pressed: false, attrs: `data-filter-chip="r=${r}"` })).join("");
    return `<div class="hx-filter js-only" role="search" aria-label="Filter the timeline and the historic sites">
${c.toolbar({ search: { label: "Search the timeline and the historic sites", placeholder: "Search: Ybor, Plant, fort, cigar…" } })}
<div class="hx-chips"><p class="label hx-chips-l" id="hx-era-l">Era</p><div class="chip-row" role="group" aria-labelledby="hx-era-l">${eraChips}</div></div>
<div class="hx-chips"><p class="label hx-chips-l" id="hx-sheet-l">Sheet</p><div class="chip-row" role="group" aria-labelledby="hx-sheet-l">${sheetChips}</div></div>
<p class="hx-filter-foot"><span class="result-count" data-hx-count="all" role="status" aria-live="polite">${h.esc(`${timeline.length} entries · ${sites.length} historic sites`)}</span><button class="btn btn-ghost btn-sm" type="button" data-filter-clear hidden>Clear the filters</button></p>
</div>`;
  }

  const toc = [["eras", "The seven eras"], ...eras.filter((e) => e.entries.length).map((e) => [`era-${e.era}`, ERA_NAME[e.era]]), ["sites", "Historic sites"], ...(routeEras.length ? [["walk", "Walk the history"]] : []), ["how", "How this page is made"]];
  const lede = timeline.length
    ? `${count(timeline.length, "dated moment", "dated moments")} in the region's history, from ${dateWords(tlDate(first))} to ${dateWords(tlDate(last))}, and ${count(sites.length, "historic place", "historic places")} you can visit${staysN ? `, ${staysN} of them ${staysN === 1 ? "a place" : "places"} to stay` : ""}. Every entry links to its source.`
    : `The historic places you can visit, ${sites.length} in all. Every entry links to its source.`;

  return [{
    path: "history.html", nav: "history", title: "History & heritage",
    description: `Tampa Bay in seven eras: ${timeline.length} dated moments from the first peoples to today, and ${sites.length} historic places and places to stay you can visit, each linked to its source.`,
    toc, features: ["history"],
    body: (root) => `${c.pageHead({ kicker: "History & heritage", num: 3, title: "Tampa Bay in seven eras", lede })}
<section class="section hx-top" id="eras" aria-labelledby="eras-h">
<h2 class="sr-only" id="eras-h">The seven eras</h2>
${eraRail(root)}
${stats()}
<p class="btn-row hx-acts"><a class="btn btn-secondary" href="${root}map.html?layers=heritage">${h.icon("map")}See the historic sites on the map</a><a class="btn btn-ghost" href="#sites">Jump to the historic sites</a></p>
</section>
<div class="hx-filtered" data-filter-root>
${filterBar()}
<div data-filter-list data-filter-items=".tl-item, .hs-item, .hx-lm">
<div class="hx-timeline">
<p class="hx-empty" data-hx-empty="tl" hidden>No timeline entries match. <button class="btn btn-ghost btn-sm" type="button" data-filter-clear>Clear the filters</button></p>
${eras.map((e) => eraSection(root, e)).join("\n")}
</div>
<section class="section hx-sites" id="sites" aria-labelledby="sites-h">
<div class="sec-head oxford"><p class="sec-kicker label">${h.icon("landmark")}Heritage · ${h.esc(count(sites.length, "site", "sites"))}</p><h2 id="sites-h">Historic sites you can visit</h2><a class="more" href="${root}map.html?layers=heritage">On the map${h.icon("arrow-r")}</a></div>
<p class="hx-intro">Every place in this guide with a heritage entry, ${h.esc(`${count(placesN, "place", "places")} to see and ${count(staysN, "place", "places")} to stay`)}, grouped by sheet and area. Each shows the year it was built as its sources give it, its designations in words and the source of its history (the full list is on its page)${oneDay ? `, all checked ${h.esc(h.fmtDateY(oneDay))}` : ""}. ${h.esc(count(sites.filter((x) => !(x.rec.heritage.designations || []).length).length, "site has", "sites have"))} no designation listed.</p>
${nhl.length ? `<div class="hx-lms" data-filter-group><h3 class="sub-h">${h.esc(`${count(nhl.length, "place", "places")} tied to a National Historic Landmark`)}</h3><div class="grid hx-lm-grid">${h.sortBy(nhl, (x) => firstYear(x.rec.heritage.built) ?? 9999).map((x) => landmarkCard(root, x)).join("")}</div></div>` : ""}
<h3 class="sub-h hx-reg-h">The register, by sheet and area <span class="result-count" data-hx-count="sites">${h.esc(count(sites.length, "site", "sites"))}</span></h3>
<p class="hx-empty" data-hx-empty="sites" hidden>No historic sites match. <button class="btn btn-ghost btn-sm" type="button" data-filter-clear>Clear the filters</button></p>
${register(root)}
</section>
</div>
</div>
${routeEras.length ? c.section({ id: "walk", title: "Walk the history", kicker: "Passages", root, more: { href: "passages.html", label: "All passages" },
  body: `<ul class="hx-walks">${routeEras.map(({ rt, hs }) => `<li data-sheet="${rt.region}"><a href="${root}passages.html#r-${h.attr(rt.id)}">${h.bullet(rt.region)}<span><span class="t">${h.esc(rt.title)}</span><span class="w">${h.esc(`${count(rt.stopsResolved.length, "stop", "stops")}, ${hs.length} of them historic sites`)}</span></span></a></li>`).join("")}</ul>` }) : ""}
${c.section({ id: "how", title: "How this page is made", kicker: "Sources", root, body: `<div class="prose hx-how">
<p>Each timeline entry is our own short summary of the pages linked under it. Dates are printed as precisely as those pages give them: a day or a month when they name one, a year alone when they name only the year, "About" when the year is approximate, a decade when they give only the decade, and "No exact date" when the entry's text states no year (the year then only places it on the timeline).</p>
<p>The historic sites come from the heritage entries of places and places to stay in this guide. A designation is listed only when a source names it, with its own name (a landmark or listing named in parentheses is part of the place, not the whole of it); the year built is the sources' own wording.</p>
<p>${imagesShown ? `${h.esc(count(imagesShown, "entry shows", "entries show"))} a rights-cleared image, each with its creator, license and a link to its page.` : "No timeline images are shown yet: this guide shows only rights-cleared images it has downloaded, each with its credit."}</p>
</div>` })}`,
  }];
}

/** Search: the core's timeline entries, enriched with the date as printed, the era and the places. */
export function search(ctx) {
  const { db, vocab } = ctx;
  return db.timeline.map((t) => {
    const d = tlDate(t);
    return {
      k: "tl", id: t.id, t: t.title,
      s: `${d.approx || d.about ? "About " : ""}${d.day ? `${d.day}, ` : ""}${d.year} · ${vocab.ERA_NAME[t.era]}`,
      u: `history.html#tl-${t.id}`, r: t.region,
      g: [...new Set([vocab.ERA_NAME[t.era], db.byId.area.get(t.area)?.name, ...t.links.map((l) => l.rec.name)].filter(Boolean))].join(" "),
      i: ctx.img.path("t", t.id),
    };
  });
}
