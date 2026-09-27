/* ============================================================
   build/pages/about.mjs · OWNER: the Visit lane (getting-around, when-to-visit, faq, about)
   about.html: what the chartbook is, the independence line verbatim (INDEPENDENCE and SOURCED from build/core/shell.mjs),
   how it is made (research → verification → merge → build), the rules with the unknowns and closures COUNTED from the data,
   every site the records cite with the number of records citing it (grouped: official sites, government and public
   agencies, tourism offices and chambers, news and guides, Wikipedia and Wikimedia Commons), the image credits (counts by
   license from data/images.json, a table of every image shown, and the rights-cleared images in data/media.json), the
   map and font credits, the engine and the history this guide is built on, #corrections (the footer links it) and the
   author, with "Last built" (ctx.buildDate: the only volatile line in the site; test.yml ignores about.html's date).
   Every number on this page is computed from data/ at build time; nothing is typed in.
   ============================================================ */
import { INDEPENDENCE, SOURCED } from "../core/shell.mjs";
import { srcLine } from "./faq.mjs";

/** The collections whose records cite sources (region and area records only when they exist). */
const COLLECTIONS = ["places", "stays", "experiences", "events", "series", "timeline", "transport", "faqs", "facts", "media", "areas", "regions", "routes"];
/** Source groups. The guide's own grouping of the sites its records cite (a judgment, shown as such). */
const GROUPS = [
  { id: "official", title: "Official sites", note: "The places, hotels, operators, venues, teams and organizers themselves." },
  { id: "gov", title: "Government and public agencies", note: "Cities, counties, the state, federal agencies, the transit, port, airport and expressway authorities, public universities and libraries." },
  { id: "tourism", title: "Tourism offices and chambers", note: "Visitor bureaus and chambers of commerce: used for facts they publish, never for their opinions." },
  { id: "news", title: "News, guides and listings", note: "Newspapers, broadcasters, magazines, guides and event or hotel listings." },
  { id: "wiki", title: "Wikipedia and Wikimedia Commons", note: "Encyclopedia articles for background facts, and Commons file pages for the images' creators and licenses." },
];
const WIKI = /(^|\.)(wikipedia\.org|wikimedia\.org|wikidata\.org)$/;
const GOV_TLD = /\.(gov|mil|us|edu)$|\.fl\.us$/;
/** Public bodies on .com/.org/.net domains (cities, counties, authorities, state agencies, public universities). */
const GOV_HOSTS = new Set([
  "stpete.org", "myclearwater.com", "myclearwaterparks.com", "stpeteparksrec.org", "cityofsafetyharbor.com", "mytreasureisland.org", "stpetebeach.org",
  "mymanatee.org", "manateeclerk.com", "scgov.net", "plantcitygov.com", "cityofbradenton.com", "cityofbradentonbeach.com", "hcplc.org", "playlargo.com",
  "largoarts.com", "floridastateparks.org", "floridasturnpike.com", "floridarevenue.com", "myfwc.com", "sunpass.com", "www2.myfloridalicense.com",
  "myfloridalicense.com", "psta.net", "gohart.org", "tecolinestreetcar.org", "porttb.com", "tampaairport.com", "fly2pie.com", "flysrq.com",
  "tampa-xway.com",
]);
const TOURISM_HOSTS = new Set([
  "visitstpeteclearwater.com", "visittampabay.com", "shop.visittampabay.com", "visitcentralflorida.org", "bradentongulfislands.com", "visitsarasota.com",
  "visitgulfportflorida.com", "visitflorida.com", "flsportscoast.com", "floridasadventurecoast.com", "discovercrystalriverfl.com", "visit.stpete.com",
  "business.tampabaybeaches.com", "tampabaybeaches.com", "ybor.org", "members.ybor.org", "tampasdowntown.com", "tarponspringschamber.org", "eastpascochamber.org",
  "business.plantcity.org", "beachwelcomecenter.com", "tampabaysports.org", "dadecityfl.com", "plantcitymainstreet.org", "johnspass.com",
]);
const NEWS_HOSTS = new Set([
  "tampabay.com", "fox13news.com", "baynews9.com", "wusf.org", "community.cltampa.com", "cltampa.com", "stpetecatalyst.com", "mysuncoast.com", "wfla.com",
  "wtsp.com", "abcactionnews.com", "patch.com", "amisun.com", "lakerlutznews.com", "thatssotampa.com", "ilovetheburg.com", "broadwayworld.com",
  "michelinmedia.com", "guide.michelin.com", "jambase.com", "cvent.com", "hotelguides.com", "hvs.com", "yellowpages.com", "3bestchefs.com", "therenlist.com",
  "floridahikes.com", "stpeterising.com", "bizjournals.com", "creativeloafing.com", "tampabay.org",
]);
function groupOf(host) {
  if (WIKI.test(host)) return "wiki";
  if (GOV_TLD.test(host) || GOV_HOSTS.has(host) || /(^|\.)noaa\.gov$/.test(host)) return "gov";
  if (TOURISM_HOSTS.has(host) || /chamber/.test(host)) return "tourism";
  if (NEWS_HOSTS.has(host)) return "news";
  return "official";
}
const SHOW = 14;

export function pages(ctx) {
  const { db, c, h, config, buildDate, vocab } = ctx;
  const { esc, attr, icon } = h;
  const author = config.author || {};
  const issues = `${config.repo}/issues`;

  /* ---------- every URL a record cites (source, quote page, also_sources, the heritage sources and designations) ---------- */
  const urlsOf = (r, coll) => {
    const u = [r.source_url, r.quote_source, ...(r.also_sources || [])];
    if (coll === "media") u.push(r.page_url);
    if (r.heritage) { u.push(...(r.heritage.sources || [])); for (const d of r.heritage.designations || []) u.push(d.url); }
    return u.filter((x) => typeof x === "string" && /^https:\/\//.test(x));
  };
  const hosts = new Map();   // host → { n: records, url: the first page cited }
  let citing = 0;
  for (const coll of COLLECTIONS) for (const r of db[coll] || []) {
    if (r.record === false) continue;
    const urls = urlsOf(r, coll);
    if (urls.length) citing++;
    const seen = new Set();
    for (const u of urls) {
      const k = h.hostOf(u);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      if (!hosts.has(k)) hosts.set(k, { n: 0, url: u });
      hosts.get(k).n++;
    }
  }
  const byGroup = new Map(GROUPS.map((g) => [g.id, []]));
  for (const [k, x] of hosts) byGroup.get(groupOf(k)).push([k, x]);
  for (const [g, list] of byGroup) byGroup.set(g, h.sortBy(list, ([, x]) => -x.n, ([k]) => k));

  /* ---------- counts ---------- */
  const live = db.events.filter((e) => e.live);
  const counts = [
    [db.regions.length, "sheets", "index.html"], [db.areas.length, "areas and towns", "areas.html"], [db.places.length, "places", "things-to-do.html"],
    [db.stays.length, "places to stay", "stay.html"], [db.experiences.length, "experiences and tours", "experiences.html"], [live.length, "dated events", "whats-on.html"],
    [db.series.length, "annual events", "when-to-visit.html#year"], [db.timeline.length, "history entries", "history.html"], [db.heritage.length, (() => { const st = db.heritage.filter((x) => x.kind === "stay").length; return st ? "historic sites and hotels with a heritage record" : "historic sites with a heritage record"; })(), "history.html"],
    [db.transport.length, "ways to get around", "getting-around.html"], [db.faqs.length, "questions and answers", "faq.html"], [db.facts.length, "facts", "when-to-visit.html"],
  ].filter(([n]) => n > 0);

  /* ---------- unknowns and closures, counted ---------- */
  const open = (r) => r.status !== "closed";
  const unknowns = [
    ["Places whose opening hours are not listed", db.places.filter((p) => open(p) && !p.hours_text).length, "“Hours not listed”"],
    ["Places whose price is not listed", db.places.filter((p) => open(p) && !p.price_text && p.is_free !== true).length, "“Price not listed”"],
    ["Places, stays and experiences without coordinates", [...db.places, ...db.stays, ...db.experiences].filter((r) => !r.ll).length, "“Not on the map: no coordinates listed”"],
    ["Experiences whose price is not listed", db.experiences.filter((x) => !x.price_text && x.is_free !== true).length, "“Price not listed”"],
    ["Events whose start time is not listed", live.filter((e) => e.instances.some((x) => x.timeUnknown)).length, "“Time not listed” (or the source's own words, such as “Gates open at 11 a.m.”), and never “Now”"],
    ["Events whose end time is not listed", live.filter((e) => e.instances.some((x) => x.endUnknown && !x.timeUnknown)).length, "“end time not listed”; “Started”, never “Now”"],
    ["Events whose price is not listed", live.filter((e) => !e.cost && e.is_free !== true).length, "“Price not listed”"],
    ["Transport without a published fare", db.transport.filter((t) => !t.fare_text && t.is_free !== true).length, "“Fare not listed” (or “Fees”, “Prices”)"],
  ].filter(([, n]) => n > 0);
  const stN = (arr, st) => arr.filter((r) => r.status === st).length;
  /* [singular, plural, count]: "1 place opening soon", "6 places temporarily closed" */
  const closures = [
    ["place temporarily closed", "places temporarily closed", stN(db.places, "temporarily-closed")], ["place open by season", "places open by season", stN(db.places, "seasonal")],
    ["place opening soon", "places opening soon", stN(db.places, "opening-soon")], ["place closed for good, kept for its history", "places closed for good, kept for their history", stN(db.places, "closed")],
    ["place to stay temporarily closed", "places to stay temporarily closed", stN(db.stays, "temporarily-closed")], ["place to stay open by season", "places to stay open by season", stN(db.stays, "seasonal")],
    ["place to stay opening soon", "places to stay opening soon", stN(db.stays, "opening-soon")], ["experience temporarily closed", "experiences temporarily closed", stN(db.experiences, "temporarily-closed")],
    ["experience run by season", "experiences run by season", stN(db.experiences, "seasonal")], ["experience opening soon", "experiences opening soon", stN(db.experiences, "opening-soon")],
    ["event cancelled", "events cancelled", stN(db.events, "cancelled")], ["event postponed", "events postponed", stN(db.events, "postponed")],
    ["event whose date the organizer calls tentative", "events whose date the organizer calls tentative", stN(db.events, "tentative")], ["event changed at short notice", "events changed at short notice", stN(db.events, "changed")],
  ].filter(([, , n]) => n > 0);
  const quotes = [...db.places, ...db.stays, ...db.experiences, ...db.series].filter((r) => r.quote).length;
  const descriptions = db.events.filter((e) => e.description).length;

  /* ---------- where the map points come from ---------- */
  const GEO_LABEL = { official: "Published by the place or operator", photon: "An OpenStreetMap feature matched by name (Photon)", osm: "OpenStreetMap", census: "A US Census address match", wikipedia: "Wikipedia", manual: "Placed by hand from the source's map or description" };
  const GEO_ORDER = ["official", "photon", "osm", "census", "wikipedia", "manual"];
  const geo = new Map();
  for (const r of [...db.places, ...db.stays, ...db.experiences]) if (r.lat != null && r.geo_source) geo.set(r.geo_source, (geo.get(r.geo_source) || 0) + 1);
  const geoRows = GEO_ORDER.filter((k) => geo.get(k)).map((k) => [k, geo.get(k)]);
  const osmN = (geo.get("photon") || 0) + (geo.get("osm") || 0);

  /* ---------- images ---------- */
  const manifest = Object.entries(db.images || {});
  const byLicense = new Map();
  for (const [, e] of manifest) byLicense.set(e.license, (byLicense.get(e.license) || 0) + 1);
  const mediaById = db.byId.media;
  const KIND_NAME = { p: "place", s: "stay", a: "area", t: "timeline", x: "experience" };
  const COLL_OF = { p: "place", s: "stay", a: "area", t: "timeline", x: "experience" };
  const subjectName = (kind, id) => { const r = db.byId[COLL_OF[kind]]?.get(id); return r ? r.name || r.title || id : id; };
  const shown = h.sortBy(manifest.map(([key, e]) => {
    const [kind, id] = key.split("/");
    const m = e.media ? mediaById.get(e.media) : null;
    return { key, kind, id, e, m, title: m ? m.title : subjectName(kind, id), creator: e.creator || m?.creator || null, license: e.license, license_url: e.license_url || m?.license_url || null, page: e.page_url || m?.page_url || null };
  }), (x) => x.title.toLowerCase());
  const usedMedia = new Set(shown.map((x) => x.m?.id).filter(Boolean));
  const licenseLink = (lic, url) => (url ? h.extLink(url, esc(vocab.LICENSE_LABEL[lic] || lic)) : esc(vocab.LICENSE_LABEL[lic] || lic));
  const subjectHref = (kind, id) => (kind === "p" ? `places/${id}.html` : kind === "s" ? `stays/${id}.html` : kind === "a" ? `areas/${id}.html` : kind === "t" ? `history.html#tl-${id}` : kind === "x" ? `experiences.html?x=${id}#x-${id}` : null);
  const mediaSubjectHref = (m) => { const k = { place: "p", stay: "s", area: "a", timeline: "t", experience: "x" }[m.subject_kind]; const coll = COLL_OF[k]; return k && db.byId[coll]?.has(m.subject) ? subjectHref(k, m.subject) : null; };
  const creditRow = (root, x) => {
    const href = subjectHref(x.kind, x.id);
    return `<tr><th scope="row" data-label="Image">${esc(x.title)}${href ? `<span class="ab-sub"><a href="${root}${attr(href)}">${esc(subjectName(x.kind, x.id))}</a></span>` : ""}</th><td data-label="Creator">${x.creator ? esc(x.creator) : c.unk("Creator not named")}</td><td data-label="License">${licenseLink(x.license, x.license_url)}</td><td data-label="Source">${x.page ? h.extLink(x.page, esc(h.hostOf(x.page))) : c.unk("Page not listed")}</td></tr>`;
  };
  const mediaRow = (root, m) => {
    const href = mediaSubjectHref(m);
    return `<tr><th scope="row" data-label="Image">${esc(m.title)}${m.year ? ` <span class="faint">(${esc(m.year)})</span>` : ""}${href ? `<span class="ab-sub"><a href="${root}${attr(href)}">${esc(subjectName({ place: "p", stay: "s", area: "a", timeline: "t", experience: "x" }[m.subject_kind], m.subject))}</a></span>` : ""}</th><td data-label="Creator">${m.creator ? esc(m.creator) : c.unk("Creator not named")}</td><td data-label="License">${licenseLink(m.license, m.license_url)}</td><td data-label="Source">${h.extLink(m.page_url, esc(h.hostOf(m.page_url)))}</td></tr>`;
  };
  const notShown = db.media.filter((m) => !usedMedia.has(m.id));
  /* where the images come from, computed (the Images paragraph and the credits say only this) */
  const imgHosts = new Set([...db.media.map((m) => h.hostOf(m.page_url)), ...manifest.map(([, e]) => (e.page_url ? h.hostOf(e.page_url) : null))].filter(Boolean));
  const allCommons = imgHosts.size > 0 && [...imgHosts].every((x) => x === "commons.wikimedia.org");
  const mediaLic = new Map();
  for (const m of notShown) mediaLic.set(m.license, (mediaLic.get(m.license) || 0) + 1);

  /* the most-cited sites of a group link to a page the records cite; the long tail is listed as plain names (each is linked
     from its own records), which keeps about.html inside the page budget */
  const hostList = (list, link = true) => `<ul class="ab-hosts">${list.map(([k, x]) => `<li>${link ? h.extLink(x.url, esc(k)) : `<span class="ab-h">${esc(k)}</span>`}<span class="ab-n tnum">${esc(h.plural(x.n, "record"))}</span></li>`).join("")}</ul>`;
  const sourcesBody = () => GROUPS.filter((g) => byGroup.get(g.id).length).map((g) => {
    const list = byGroup.get(g.id), total = list.reduce((a, [, x]) => a + x.n, 0);
    return `<div class="ab-group" id="src-${g.id}"><h3 class="ab-gh"><span>${esc(g.title)}</span><span class="label faint">${esc(`${h.plural(list.length, "site")} · ${total} citations`)}</span></h3><p class="ab-gn">${esc(g.note)}</p>
${hostList(list.slice(0, SHOW))}${list.length > SHOW ? `<details class="ab-more"><summary>${esc(`${list.length - SHOW} more ${g.title.toLowerCase().startsWith("official") ? "official sites" : "sites"}`)}</summary>${hostList(list.slice(SHOW), false)}</details>` : ""}</div>`;
  }).join("\n");

  const steps = [
    ["Research", "Research passes read the official pages (the business, the operator, the organizer, the agency) and wrote each record in one fixed shape, with the page it came from and the date it was read. When a page did not say something, the field was left empty."],
    ["Verification", "A second, adversarial pass re-read the sources and corrected or removed whatever the pages did not say."],
    ["Merge", "The research was merged into one set of data files. Records that are the same thing were joined field by field, coordinates were chosen in a fixed order of preference, and every decision was logged."],
    ["Build", "The site is built from those files by a script that stops, listing every problem, when a record has no source, a placeholder such as “TBA”, a non-secure link, an impossible time or a link that leads nowhere. Every count on every page is computed from the data at build time."],
  ];

  const toc = [["what", "What this is"], ["method", "How it is made"], ["rules", "The rules"], ["sources", "Sources"], ["images", "Images and credits"], ["credits", "Map, type and code"], ["corrections", "Corrections"], ["author", "Who makes it"]];
  const osmLink = (t) => h.extLink("https://www.openstreetmap.org/copyright", t);
  const mapSrc = db.map && db.map.source_url ? db.map.source_url : "https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html";
  const mapAttr = db.map && typeof db.map.attribution === "string" ? db.map.attribution : "U.S. Census Bureau, TIGER/Line Shapefiles (public domain)";

  return [{
    path: "about.html", nav: "about", title: "About & sources", toc,
    description: "About Tampa Bay Chartbook, an independent guide: how it is made, the rules it keeps, every site its records cite, image and map credits, and how to send a correction.",
    body: (root) => `${c.pageHead({ num: 5, kicker: "Visit · the chart room", title: "About & sources",
      lede: "An independent visitor's guide to Tampa Bay, made from the official pages of the places themselves. Here is how it is made, where every fact comes from, and how to tell us when something is wrong." })}
${c.section({ id: "what", title: "What this is", anchor: true, root, body: `<div class="ab-intro">
<div class="prose">
<p>${esc(config.siteName)} is a visitor's guide to Tampa Bay: where to stay, what to see and do, what is on from ${esc(h.fmtDateY(db.window.start))} to ${esc(h.fmtDateY(db.window.end))}, where to eat, how to get around, and where the region's history happened.</p>
<p>It is laid out like a chartbook, the bound set of charts a skipper keeps for one body of water: ${esc(h.plural(db.regions.length, "numbered sheet"))}, one for each stretch of coast, each with its own code and mark. It is printed like the region's own graphic art, the Ybor City cigar-box label. The chart linework is decoration: nothing on this site is for navigation.</p>
</div>
<figure class="ab-seal"><blockquote><p class="ab-indep">${esc(INDEPENDENCE)}</p><p class="ab-sourced">${esc(SOURCED)}</p></blockquote><figcaption>The guide is not Visit Tampa Bay, Visit St. Pete/Clearwater or any other tourism office. It does not sell tickets or rooms.</figcaption></figure>
</div>
<ul class="ab-counts">${counts.map(([n, l, href]) => `<li><a href="${root}${href}"><b class="ab-num">${esc(n.toLocaleString("en-US"))}</b><span>${esc(l)}</span></a></li>`).join("")}</ul>
<p class="ab-note">Counted from the data files when this page was built.</p>` })}
${c.section({ id: "method", title: "How it is made", anchor: true, root, body: `<ol class="ab-course">${steps.map(([t, d], i) => `<li><span class="ab-step" aria-hidden="true">${i + 1}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></li>`).join("")}</ol>
<div class="prose ab-after"><p><b>${esc(h.plural(citing, "record"))}</b> cite at least one source page, and each shows its source where you read it: “Source: host · Checked Sep 27, 2026”. The research itself is kept, unchanged, in the ${h.extLink(`${config.repo}/tree/main/research`, "research folder")} of the repository, so every record's provenance can be traced.</p>
<p><b>Map points</b> come, in order of preference, from coordinates the place or operator publishes, then an OpenStreetMap feature matched by name, then a US Census address match, then Wikipedia. When two sources disagreed by more than about 250 meters, the record was settled from its source, never by averaging.</p></div>
${geoRows.length ? `<div class="table-wrap"><table class="data ab-geo"><caption>Where the ${esc(h.plural(geoRows.reduce((a, [, n]) => a + n, 0), "map point"))} of places, stays and experiences come from</caption><thead><tr><th scope="col">From</th><th scope="col" class="num">Points</th></tr></thead><tbody>${geoRows.map(([k, n]) => `<tr><th scope="row" data-label="From">${esc(GEO_LABEL[k] || k)}</th><td class="num" data-label="Points">${n}</td></tr>`).join("")}</tbody></table></div>` : ""}` })}
${c.section({ id: "rules", title: "The rules", anchor: true, root, body: `<div class="ab-rules">
<div class="ab-rule"><h3>${icon("warn")}Never invent a fact</h3><p>No name, address, hour, price, date, count or claim that its source does not state. When a source says nothing, the guide says so: “Hours not listed”, “Time not listed”, “Price not listed”. The build rejects placeholders such as “TBA”, “TBD” or “See website”.</p></div>
<div class="ab-rule"><h3>${icon("clock")}Closed is a fact too</h3><p>Hurricanes Helene and Milton (September and October 2024) closed or damaged many Pinellas beach properties, and businesses open and close. A record's status says what its source said on the day it was checked, with a note: “Temporarily closed”, “Seasonal”, “Opening soon”.</p></div>
<div class="ab-rule"><h3>${icon("news")}Our words are plain; their words are quoted</h3><p>Summaries are the guide's own one or two factual sentences, without marketing language. A quote is word for word from the official page, 40 words at most, and names its source. ${esc(h.plural(quotes, "record"))} carry such a quote; ${esc(h.plural(descriptions, "event"))} carry the organizer's own description.</p></div>
<div class="ab-rule"><h3>${icon("walk")}Distances are estimates</h3><p>Distances between two points are straight lines, and the guide says so. Walking and driving routes are longer.</p></div>
</div>
${unknowns.length ? `<h3 class="sub-h">What the sources don't say</h3><div class="table-wrap"><table class="data ab-unk"><caption>Counted from the data. These gaps close as the sources publish more.</caption><thead><tr><th scope="col">Not published</th><th scope="col" class="num">Records</th><th scope="col">What the guide prints</th></tr></thead><tbody>${unknowns.map(([l, n, w]) => `<tr><th scope="row" data-label="Not published">${esc(l)}</th><td class="num" data-label="Records">${n}</td><td data-label="Printed as">${esc(w)}</td></tr>`).join("")}</tbody></table></div>` : ""}
${closures.length ? `<h3 class="sub-h">Closures, seasons and changes</h3><ul class="ab-closed">${closures.map(([one, many, n]) => `<li><b class="tnum">${n}</b> ${esc(n === 1 ? one : many)}</li>`).join("")}</ul>` : ""}` })}
${c.section({ id: "sources", title: "Sources", anchor: true, root, body: `<p class="ab-lede">${esc(`${h.plural(hosts.size, "site")} are cited by the guide's records. The number beside each is how many records cite it (a record that cites one site twice counts once). The groups are the guide's own.`)}</p>
<nav class="ab-gnav" aria-label="Source groups">${GROUPS.filter((g) => byGroup.get(g.id).length).map((g) => `<a href="#src-${g.id}"><span>${esc(g.title)}</span><b class="tnum">${byGroup.get(g.id).length}</b></a>`).join("")}</nav>
${sourcesBody()}` })}
${c.section({ id: "images", title: "Images and credits", anchor: true, root, body: `<div class="prose"><p>Every photograph in the guide is rights-cleared and stored with the guide, never loaded from another site. The guide takes images only from Wikimedia Commons (public domain, CC0, CC BY, CC BY-SA or a U.S. government work) or the history-of-tampa archive, each with its creator, license and credit line${imgHosts.size ? `; ${allCommons ? `every one gathered so far (${esc(h.plural(db.media.length, "image"))}) is a Commons file` : `the ${esc(h.plural(db.media.length, "image"))} gathered so far come from ${esc(h.listJoin([...imgHosts]))}`}` : ""}. None is taken from a hotel, venue or operator site. A record without a cleared image gets a typographic plate, its chart code and name, never a stock photo.</p></div>
${manifest.length ? `<p class="ab-lic">${[...byLicense].map(([lic, n]) => `<span><b class="tnum">${n}</b> ${esc(vocab.LICENSE_LABEL[lic] || lic)}</span>`).join("")}</p>
<details class="ab-credits" id="credits-list" open><summary>${esc(`All ${h.plural(manifest.length, "image")} shown, with credits`)}</summary><div class="table-wrap"><table class="data ab-img"><thead><tr><th scope="col">Image</th><th scope="col">Creator</th><th scope="col">License</th><th scope="col">Source</th></tr></thead><tbody>${shown.map((x) => creditRow(root, x)).join("")}</tbody></table></div></details>`
      : `<p class="ab-lic"><span>No photographs are shown yet: every record carries its typographic plate.</span></p>`}
${notShown.length ? `<details class="ab-credits" id="media-list"><summary>${esc(manifest.length ? `${h.plural(notShown.length, "more rights-cleared image")} gathered for the guide, not shown yet` : `The ${h.plural(notShown.length, "rights-cleared image")} gathered for the guide`)}</summary><p class="ab-lic">${[...mediaLic].map(([lic, n]) => `<span><b class="tnum">${n}</b> ${esc(vocab.LICENSE_LABEL[lic] || lic)}</span>`).join("")}</p><div class="table-wrap"><table class="data ab-img"><thead><tr><th scope="col">Image</th><th scope="col">Creator</th><th scope="col">License</th><th scope="col">Source</th></tr></thead><tbody>${h.sortBy(notShown, (m) => m.title.toLowerCase()).map((m) => mediaRow(root, m)).join("")}</tbody></table></div></details>` : ""}
<p class="ab-note">An image of yours? Ask for a change or a takedown under <a href="#corrections">Corrections</a>.</p>` })}
${c.section({ id: "credits", title: "Map, type and code", anchor: true, root, body: `<dl class="ab-dl">
<div><dt>Basemap</dt><dd>${h.extLink(mapSrc, esc(mapAttr))}. The water lining, roads and coastline of every map are drawn from it for this guide.</dd></div>
<div><dt>Coordinates</dt><dd>Place coordinates include data ${osmLink("© OpenStreetMap contributors")}, available under the Open Database License (ODbL)${osmN ? `: ${esc(h.plural(osmN, "point"))} in the guide come from it` : ""}. ${geoRows.filter(([k]) => k !== "photon" && k !== "osm").length ? ` Other points come from ${esc(h.listJoin(geoRows.filter(([k]) => k !== "photon" && k !== "osm").map(([k]) => ({ census: "the U.S. Census geocoder (public domain)", official: "the places' and operators' own pages", wikipedia: "Wikipedia", manual: "the sources' own maps and descriptions" })[k] || k)))}.` : ""}</dd></div>
<div><dt>Images</dt><dd>${allCommons || !imgHosts.size ? "Wikimedia Commons contributors" : "Wikimedia Commons contributors and the history-of-tampa archive"}, each credited by name and license in the <a href="#images">list above</a> and beside the image.</dd></div>
<div><dt>Type</dt><dd>Bodoni Moda, Figtree and Archivo, all under the SIL Open Font License 1.1, served with the site: <a href="${root}assets/fonts/OFL-BodoniModa.txt">Bodoni Moda license</a> · <a href="${root}assets/fonts/OFL-Figtree.txt">Figtree license</a> · <a href="${root}assets/fonts/OFL-Archivo.txt">Archivo license</a>.</dd></div>
<div><dt>Engine</dt><dd>The build engine, the checks and the tone rules come from ${h.extLink("https://github.com/fritzhand/cincy-week", "Cincy Week")} (fritzhand/cincy-week), a source-linked guide to a week in Cincinnati.</dd></div>
<div><dt>History</dt><dd>The history and the citation standard come from ${h.extLink("https://github.com/fritzhand/history-of-tampa", "History of Tampa")} (fritzhand/history-of-tampa).</dd></div>
<div><dt>Code</dt><dd>The guide is a static site built from JSON data files${config.analyticsId ? "" : ", with no analytics"}. Its source is on ${h.extLink(config.repo, esc(config.repo.replace(/^https:\/\//, "")))}.</dd></div>
</dl>` })}
${c.section({ id: "corrections", title: "Corrections and takedowns", anchor: true, root, body: `<div class="ab-fix">
<div class="prose"><p>Found a wrong hour, a closed business, a moved event, a broken link? Is a photo or a listing yours, and you want it changed or removed? ${h.extLink(issues, "Open an issue on GitHub")} with:</p>
<ol><li>the link to the page in this guide,</li><li>what is wrong, or what you want removed,</li><li>for a correction, the official page that states the right information.</li></ol>
<p>A correction is made in the data files, checked against its source, and appears when the site is next built. The guide does not change a fact without a source that states it.</p></div>
<p class="btn-row">${h.extLink(`${issues}/new`, `${icon("github")}Report an error`, "btn btn-primary")}${h.extLink(issues, `${icon("list")}Open reports`, "btn btn-secondary")}</p>
</div>` })}
${c.section({ id: "author", title: "Who makes it", anchor: true, root, body: `<div class="ab-author">
<p>Built and maintained by <b>${esc(author.name || "")}</b>.${author.github || author.linkedin ? ` ${[author.github ? h.extLink(author.github, "GitHub") : "", author.linkedin ? h.extLink(author.linkedin, "LinkedIn") : ""].filter(Boolean).join(" · ")}.` : ""}</p>
<p class="ab-built label tnum">Last built ${esc(buildDate)}</p>
</div>` })}`,
  }];
}

/* For tests/visit.test.mjs: the source grouping (the build only calls pages()). */
export { groupOf, GROUPS };
