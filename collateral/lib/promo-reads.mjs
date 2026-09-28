/* ============================================================
   collateral/lib/promo-reads.mjs — every word and number the promo shows, read at render time
   (plan.md §9, §16.2). Nothing here is typed except the three hand-written lines in HAND.

   read(ROOT, SITE, plan) reads site.config.json, data/*.json (through the build's own loader) and the
   private build's pages, asserts each fact the film depends on, and returns the words, counts, the
   day's records, the computed sun, the badge and dot positions, and the name-guard list. Any mismatch
   throws with the field it could not find: the render never ships stale copy.
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { load } from "../../build/core/load.mjs";
import { fmtTime, fmtDay, fmtDayLong, nyToEpoch, nyParts } from "../../site/js/lib/time.js";
import { project, unproject, metaOf } from "../../site/js/lib/geo.js";
import { tripHash, code } from "../../site/js/lib/share.js";
import { sunEvent } from "./sun.mjs";
import { UNIT } from "./promo-world.mjs";
import { REGION_PAGES } from "../../build/nav.mjs";
import { REGIONS } from "../../build/core/vocab.mjs";

/** Stage-only nudges (basemap units) that lift three sheet badges off their town labels at the whole-bay view: the
 *  site's index chart places them on the towns, and the stage's larger badges covered "ST. PETERSBURG", "TAMPA" and
 *  "CLEARWATER" (review, round 2). */
export const BADGE_NUDGE = { stpete: [0, 4], tampa: [9, 10], clearwater: [0, -10] };   // SP: its label moved instead (promo-world STAGE_LABELS)

/** The only hand-written lines (plan.md §9.3). */
export const HAND = {
  kicker: "One Saturday on the bay.",
  footnote: "Auto dark mode at sunset · The guide follows the device",
  punch: "One day, one link.",
};

/** Plans A and B (plan.md §3). */
export const PLANS = {
  A: { date: "2026-12-19", event: "tampa-riverwalk-lighted-boat-parade-2026", fds: "fort-de-soto-park", ybor: "ybor-city-historic-district", sunsetPlace: "tampa-riverwalk", above: "USF Bulls men's basketball vs. Kennesaw State" },
  B: { date: "2026-12-12", event: "clearwater-holiday-lighted-boat-parade-2026", fds: "fort-de-soto-park", ybor: "ybor-city-historic-district", sunsetPlace: "clearwater-beach-marina", above: "Lightning vs. Pittsburgh Penguins" },
};

const decode = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const WORD_FILTER = /\b(best|#1|ultimate|official|top|must-see|world-class|award|voted)\b/i;

export function read(ROOT, SITE, planId = "A") {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`no plan ${planId}`);
  const fail = (m) => { throw new Error(`read: ${m}`); };
  const html = (f) => { const p = path.join(SITE, f); if (!fs.existsSync(p)) fail(`${f} is missing from the private build`); return fs.readFileSync(p, "utf8"); };
  const must = (f, re, what) => { const m = html(f).match(re); if (!m) fail(`${f}: ${what} not found (the site changed)`); return decode(m[1]); };

  /* config */
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
  if (config.siteName !== "Tampa Bay Chartbook") fail(`siteName is "${config.siteName}"`);
  const tagParts = config.siteTagline.split(", ");
  if (tagParts.length !== 2) fail(`siteTagline must split into two parts at ", ": ${config.siteTagline}`);
  if (!/^https:\/\//.test(config.siteBase)) fail("siteBase is not https");
  if (!(plan.date >= config.dataWindow.start && plan.date <= config.dataWindow.end)) fail(`plan date ${plan.date} is outside the data window`);

  /* data, through the build's loader (read-only) */
  const errs = [];
  const db = load({ dataDir: path.join(ROOT, "data"), siteDir: path.join(ROOT, "site"), config, fail: (w, m) => errs.push(`${w}: ${m}`), warn: () => {} });
  if (errs.length) fail(`data does not load: ${errs.slice(0, 3).join(" | ")}`);
  const dataHash = crypto.createHash("sha1");
  for (const f of fs.readdirSync(path.join(ROOT, "data")).sort()) dataHash.update(f).update(fs.readFileSync(path.join(ROOT, "data", f)));
  const counts = { places: db.counts.places, stays: db.counts.stays, events: db.counts.events, experiences: db.counts.experiences };

  /* the day's records */
  const ev = db.byId.event.get(plan.event);
  if (!ev) fail(`event ${plan.event} is gone`);
  if (ev.date !== plan.date) fail(`event ${plan.event} moved to ${ev.date}`);
  if (!ev.start || ev.end != null) fail(`event ${plan.event}: start ${ev.start}, end ${ev.end} (the film needs a start and no end)`);
  if ((ev.status || "scheduled") !== "scheduled") fail(`event ${plan.event} is ${ev.status}`);
  const evPlace = db.byId.place.get(ev.place);
  if (!evPlace || evPlace.lat == null) fail(`event ${plan.event}: place ${ev.place} has no coordinates`);
  const fds = db.byId.place.get(plan.fds), ybor = db.byId.place.get(plan.ybor);
  if (!fds || fds.status !== "open") fail(`${plan.fds} is not open`);
  if (!/^Daily, 7 a\.m\. to sunset/.test(fds.hours_text || "")) fail(`${plan.fds}.hours_text changed: ${fds.hours_text}`);
  if (/\b(Dec\.?|December)\s*\d/i.test(fds.status_note || "")) fail(`${plan.fds}.status_note names a December date: ${fds.status_note}`);
  if (!fds.heritage) fail(`${plan.fds} lost its heritage block (the landmark symbol)`);
  if (!ybor || ybor.status !== "open") fail(`${plan.ybor} is not open`);
  if (!/founded in 1886 as a planned cigar-making town/i.test(ybor.summary || "")) fail(`${plan.ybor}.summary changed`);
  const sunPlace = db.byId.place.get(plan.sunsetPlace);

  /* the sun, computed (plan.md §3.3) */
  const SR = sunEvent(plan.date, fds.lat, fds.lng, "rise");
  const SS = sunEvent(plan.date, sunPlace.lat, sunPlace.lng, "set");
  const START = nyToEpoch(plan.date, ev.start);
  if (!(SR.t < nyToEpoch(plan.date, "07:30"))) fail(`sunrise ${new Date(SR.t).toISOString()} is not before 7:30`);
  if (!(SS.t < START - 10 * 60000)) fail(`sunset is not 10 minutes before the event`);
  const ssPlus = Math.ceil((SS.t + 1000) / 60000) * 60000;
  const A_EVE = Math.max(START - 23 * 60000, ssPlus);

  /* the built pages */
  const index = html("index.html");
  const meta = decode((index.match(/<meta name="description" content="([^"]+)"/) || [])[1] || "");
  const mastDek = must("index.html", /<p class="mast-dek">([\s\S]*?)<\/p>/, "mast-dek");
  const nums = (s) => (s.match(/\d[\d,]*/g) || []).map((n) => Number(n.replace(/,/g, "")));
  const mm = meta.match(/(\d[\d,]*) places, (\d[\d,]*) places to stay and (\d[\d,]*) events/);
  if (!mm) fail(`meta description changed: ${meta}`);
  const metaN = mm.slice(1, 4).map((n) => Number(n.replace(/,/g, "")));
  if (metaN[0] !== counts.places || metaN[1] !== counts.stays || metaN[2] !== counts.events) fail(`meta description counts ${metaN} ≠ data ${JSON.stringify(counts)}`);
  const dekN = nums(mastDek);
  if (!(dekN.includes(counts.places) && dekN.includes(counts.stays) && dekN.includes(counts.events))) fail(`mast-dek counts ${dekN} ≠ data`);
  const countLabels = ["places", "places to stay", "events"];                      // nouns and order from the meta description
  const mastSide = must("index.html", /<div class="mast-line[^"]*"><span class="side">([^<]+)<\/span>/, "masthead line");
  // the masthead's other side, "Not for navigation", is the hook's and the end card's ribbon (review round 3: "SHEETS 1–6 ·
  // TAMPA BAY" sat right above the wordmark's "TAMPA BAY" eyebrow, so the name was read twice)
  const mastNote = must("index.html", /<div class="mast-line[^"]*">(?:<span[^>]*>[^<]*<\/span>){2}<span class="side">([^<]+)<\/span>/, "masthead line (right side)");
  const footer = index.match(/<p class="footer-indep"><b>([^<]+)<\/b>\s*([^<]+)<\/p>/);
  if (!footer) fail("footer independence line not found");
  const independence = decode(footer[1]), sourced = decode(footer[2]);
  if (independence !== "Independent guide. Not affiliated with any tourism office, venue or operator.") fail(`independence line changed: ${independence}`);
  if (sourced !== "Every entry links to its source.") fail(`footer sourced line changed: ${sourced}`);
  const about = html("about.html");
  const printed = (about.match(/Events whose end time is not listed<\/th>[\s\S]*?data-label="Printed as">([^<]+)</) || [])[1];
  if (!printed) fail("about.html: the 'Printed as' cell for end times not found");
  const startedNever = decode(printed).split("; ")[1];
  if (startedNever !== "“Started”, never “Now”") fail(`about.html printed-as changed: ${decode(printed)}`);
  const aboutPrinted = (decode(about).match(/It is (printed like the region's own graphic art, the Ybor City cigar-box label\.)/) || [])[1];
  if (!aboutPrinted) fail("about.html: 'It is printed like …' not found");
  const aboutLine = aboutPrinted[0].toUpperCase() + aboutPrinted.slice(1);
  const mapHtml = html("map.html");
  const mapKicker = decode((mapHtml.match(/<header class="page-head[^"]*">\s*<p class="kicker label">(?:<span class="sec-num"[^>]*>\d+<\/span>)?<span>([^<]+)<\/span>/) || [])[1] || "");
  const mapRows = (mapHtml.match(/<li class="map-li[^"]*"[^>]*data-ll="/g) || []).length;
  const kn = Number((mapKicker.match(/([\d,]+) on the chart/) || [])[1]?.replace(/,/g, ""));
  if (!kn || kn !== mapRows) fail(`map kicker "${mapKicker}" ≠ ${mapRows} rows`);
  const mapLede = decode((mapHtml.match(/<p class="lede">([^<]+)<\/p>/) || [])[1] || "").split(/(?<=\.)\s/)[0];
  if (mapLede !== "Everything in this guide that has coordinates, on one chart.") fail(`map lede changed: ${mapLede}`);
  const attrib = decode(((mapHtml.match(/<p class="map-attrib-line">([\s\S]*?)<\/p>/) || [])[1] || "").replace(/<span class="sr-only">[^<]*<\/span>/g, "")).replace(/\s*\(https?:[^)\s]*\)/, "");
  if (!/^Basemap: /.test(attrib)) fail("map attribution not found");
  const yborLede = decode(html(`places/${plan.ybor}.html`).match(/<p class="lede">([\s\S]*?)<\/p>/)?.[1] || "");
  const fm = yborLede.match(/(founded in 1886 as a planned cigar-making town\.)/i);
  if (!fm) fail("ybor lede lacks 'founded in 1886 …'");
  const founded = fm[1][0].toUpperCase() + fm[1].slice(1);

  /* the six badges at the index chart's positions (plan.md §7.5) */
  const mapJson = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "map.json"), "utf8"));
  const bm = metaOf(mapJson), rm = metaOf(mapJson.region);
  const ixVB = (index.match(/class="mini-map area-map ix-map"[^>]*><svg viewBox="([^"]+)"/) || [])[1];
  if (!ixVB) fail("index chart viewBox not found");
  const [vx, vy, vw, vh] = ixVB.split(/\s+/).map(Number);
  const badges = [];
  const REG = ["tampa", "stpete", "beaches", "clearwater", "around", "daytrips"];
  for (const id of REG) {
    const m = index.match(new RegExp(`<span class="ix-badge" data-sheet="${id}" style="left: ([\\d.]+)%; top: ([\\d.]+)%">`));
    if (!m) fail(`index badge ${id} not found`);
    const [lat, lng] = unproject(vx + vw * Number(m[1]) / 100, vy + vh * Number(m[2]) / 100, rm);
    const [ux, uy] = project(lat, lng, bm);
    const [nx, ny] = BADGE_NUDGE[id] || [0, 0];
    const page = REGION_PAGES.find((p) => p.region === id);
    if (!page || !page.label) fail(`build/nav.mjs REGION_PAGES has no name for sheet ${id}`);
    badges.push({ id, x: (ux + nx) * UNIT, y: (uy + ny) * UNIT, ux: +ux.toFixed(1), uy: +uy.toFixed(1), name: page.label, code: REGIONS[id]?.code, n: REG.indexOf(id) + 1 });
  }

  /* the dots of the pull-back: every map row whose point is on the chart */
  const dots = [];
  for (const m of mapHtml.matchAll(/<li class="map-li[^"]*"[^>]*data-r="([a-z]+)"[^>]*data-ll="([-\d.]+),([-\d.]+)"/g)) {
    const [ux, uy] = project(Number(m[2]), Number(m[3]), bm);
    if (ux < 0 || ux > bm.W || uy < 0 || uy > bm.H) continue;
    dots.push([+(ux * UNIT).toFixed(1), +(uy * UNIT).toFixed(1), REG.indexOf(m[1])]);
  }

  /* the name guard (plan.md §16.1): tourism offices, every team in sports events, and their hosts */
  const guard = new Set(["Visit Tampa Bay", "visittampabay", "Visit St. Pete", "Visit St. Pete/Clearwater", "visitstpeteclearwater", "Visit Florida", "visitflorida"]);
  const hosts = new Set();
  for (const e of db.events) {
    if (e.kind !== "sports") continue;
    for (const part of e.title.split(/ vs\. | at /)) { const t = part.replace(/[:(].*$/, "").replace(/\b(men's|women's)\b.*$/i, "").trim(); if (t.length >= 4) guard.add(t); }
    for (const u of [e.source_url, e.url, e.tickets_url]) if (u) { try { hosts.add(new URL(u).hostname.replace(/^www\./, "")); } catch {} }
  }
  for (const h of hosts) guard.add(h);

  /* the share link the day should produce */
  const tripIds = { e: [ev.id], p: [fds.id, ybor.id] };
  const hash = tripHash(tripIds);

  const words = {
    siteName: config.siteName,
    host: "fritzhand.github.io",
    tag1: tagParts[0] + ",", tag2: tagParts[1],
    mastSide, mastNote, ribbonHook: mastNote.toUpperCase(),
    date: fmtDay(plan.date).toUpperCase(),
    kicker: HAND.kicker, footnote: HAND.footnote, punch: HAND.punch,
    sourced, independence, startedNever, aboutLine, founded, mapLede, mapKicker, attribution: attrib,
    url: config.siteBase.replace(/^https:\/\//, "").replace(/\/$/, ""),
    eventTitle: ev.title,
  };
  words.independenceHtml = independence.replace(/ tourism office/, "<br>tourism office");
  for (const [k, v] of Object.entries(words)) if (typeof v === "string" && k !== "attribution" && WORD_FILTER.test(v)) fail(`word filter: "${v}" (${k})`);

  const images = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "images.json"), "utf8"));
  return {
    images,
    plan, planId, config, db, counts, countLabels, dataHash: dataHash.digest("hex").slice(0, 16),
    ev, evPlace, fds, ybor, sunPlace, SR: SR.t, SS: SS.t, sun: { SR, SS }, START, A_EVE,
    words, badges, dots, guard: [...guard], tripIds, hash, meta: bm,
    fmt: { fmtTime, fmtDay, fmtDayLong, nyParts },
  };
}
