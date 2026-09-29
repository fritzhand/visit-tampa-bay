/* ============================================================
   build/core/shell.mjs · OWNER: E1 (build engine; ported from Cincy Week)
   The page shell: topbar (masthead, search, My Trip, theme), grouped icon
   sidebar with the six sheets (chart code + name + a count line), collapsible
   rail, drawer, theme toggle with a FOUC-free boot script, ⌘K palette,
   breadcrumbs, TOC rail, prev/next, footer (the independence lines; with an
   analyticsId, "Analytics settings" [data-consent-open]), phone dock, toast,
   the event and experience dialogs, one modal component. With an analyticsId
   the head carries <meta name="tbc-analytics"> and no Google script.

   makeShell(site) → shell(page) where `page` is a page-module output
   (build/CONTRACTS.md §3) plus the orchestrator's `root` and `slug`.
   Modules never write <html>, <head>, the topbar, sidebar, footer, dock
   or modals: they return a body and optional head/modals/features.
   Files the shell references only when they exist (other lanes land them):
   site/favicon.svg, site/js/main.js, site/og*.png.
   ============================================================ */
import { esc, attr, extLink, plural } from "./util.mjs";
import { icon, bullet, wordmark, wordmarkArt, mark, sprite } from "./icons.mjs";
import { crumbs as crumbsHtml, pagenav, toc as tocAside, tocMobile } from "./components.mjs";
import { NAV, REGION_PAGES, NAV_SLUGS, NAV_LABEL, DOCK } from "../nav.mjs";

/** The footer's fixed lines (SPEC.md §1, §3): keep them verbatim. */
export const INDEPENDENCE = "Independent guide. Not affiliated with any tourism office, venue or operator.";
export const SOURCED = "Every entry links to its source.";

/** Inline boot script (runs before CSS paints): js class, theme, rail.
 *  ?now=YYYY-MM-DDTHH:MM (New York wall time) overrides the clock on localhost or with localStorage tbc-debug=1:
 *  it sets <html data-now="<epoch ms>">, which the client clock reads. ?theme=light|dark forces an edition. */
function bootScript() {
  return `<script>(function(){var d=document.documentElement,t=null,r=null,dbg=null,q;d.className=d.className.replace(/\\bno-js\\b/,"js");
try{t=localStorage.getItem("tbc-theme");r=localStorage.getItem("tbc-rail");dbg=localStorage.getItem("tbc-debug")}catch(e){}
try{q=new URLSearchParams(location.search)}catch(e){q={get:function(){return null}}}
var qt=q.get("theme");if(qt==="light"||qt==="dark")t=qt;
if(t!=="light"&&t!=="dark")t=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
d.setAttribute("data-theme",t);if(r==="1")d.classList.add("rail-collapsed");
var s=q.get("now"),m=s&&/^(\\d{4})-(\\d\\d)-(\\d\\d)T(\\d\\d):(\\d\\d)$/.exec(s);
if(m&&(dbg==="1"||/^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(location.hostname))){var off=function(x){var p={};try{new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).formatToParts(new Date(x)).forEach(function(o){p[o.type]=o.value})}catch(e){return -144e5}return Date.UTC(+p.year,p.month-1,+p.day,p.hour%24,+p.minute)-Math.floor(x/6e4)*6e4};
var g=Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5]);d.setAttribute("data-now",String(g-off(g-off(g))))}})();</script>`;
}

/** Google Analytics is consent-gated: the page carries only the measurement id, never a Google script. The client
 *  (site/js/core/consent.js, rules in site/js/lib/consent.js) asks first and injects gtag.js only after a yes; the
 *  crawler fails any page with an external <script src>. */
const ANALYTICS_META = (id) => (id ? `<meta name="tbc-analytics" content="${attr(id)}">\n` : "");
/** The footer's way back to the choice (only when analytics is configured; hidden without JS, which never loads it). */
export const CONSENT_BUTTON = `<button class="footer-btn js-only" type="button" data-consent-open aria-expanded="false">Analytics settings</button>`;

export function makeShell(site) {
  const { config, db, tokens, hashes, assets } = site;
  const NAME = config.siteName;

  /* ---------- sheet items for the sidebar: mark + name + "Sheet 1 · 13 areas" ---------- */
  const sheetInfo = REGION_PAGES.map((rp) => {
    const r = db.byId.region.get(rp.region);
    const sub = [`Sheet ${r.n}`, r.places.length ? plural(r.places.length, "place") : "", r.events.length ? plural(r.events.length, "event") : ""].filter(Boolean).join(" · ");
    return { slug: rp.slug, region: rp.region, name: rp.label, sub };
  });

  const metaCount = (k) => ({ events: db.counts.events, places: db.counts.places, stays: db.counts.stays, experiences: db.counts.experiences }[k] ?? null);

  /* ---------- sidebar ---------- */
  function sidebar(root, active) {
    const cur = (slug) => (slug === active ? ' aria-current="page"' : "");
    const link = (it) => {
      const n = it.meta === "trip" ? `<span class="nav-meta" data-trip-count hidden>0</span>` : it.meta ? `<span class="nav-meta">${metaCount(it.meta) ?? ""}</span>` : "";
      return `<a class="nav-link" href="${root}${it.slug}.html"${cur(it.slug)}>${icon(it.icon)}<span>${esc(it.label)}</span>${n}</a>`;
    };
    const sheetItem = (si) => `<a class="nav-link sheet" href="${root}${si.slug}.html"${cur(si.slug)} data-sheet="${si.region}">${bullet(si.region)}<span class="nav-2">${esc(si.name)}<span class="nav-sub">${si.sub.split(" · ").map((x) => `<span>${esc(x)}</span>`).join(" · ")}</span></span></a>`;
    const groups = NAV.map((g) => `<div class="sidebar-group"><div class="sidebar-title label"><span class="sec-num" aria-hidden="true">${g.num}</span>${esc(g.label)}</div>
${g.regions ? sheetInfo.map(sheetItem).join("\n") : g.items.map(link).join("\n")}
</div>`).join("\n");
    return `<nav class="sidebar" id="sidebar" aria-label="Guide">
<a class="trip-card is-empty" href="${root}trip.html" data-trip-card><span class="tc-top">${icon("star", "i-fill")}<span data-trip-card-title>My Trip</span></span><span class="tc-next" data-trip-card-next>Star places, stays, tours and events to build your trip</span></a>
${groups}
<p class="sidebar-src">${esc(INDEPENDENCE)} ${esc(SOURCED)}</p>
</nav>`;
  }

  /* ---------- topbar ---------- */
  const topbar = (root) => `<header class="topbar">
<button class="nav-toggle" type="button" aria-controls="sidebar" aria-expanded="false" aria-label="Open navigation" data-nav-toggle><span class="hb" aria-hidden="true"><span class="hb-t"></span><span class="hb-m"></span><span class="hb-b"></span></span></button>
<a class="brand" href="${root}index.html" aria-label="${attr(NAME)}, home">${mark("brand-mark")}${wordmark("brand-name", false)}</a>
<span class="topbar-spacer"></span>
<a class="live-pill label" href="${root}whats-on.html?when=today" hidden data-live-pill><span class="dot-live" aria-hidden="true"></span><span data-live-text>On today</span></a>
<button class="searchbtn" type="button" data-search-open aria-keyshortcuts="Meta+K Control+K /">${icon("search")}<span class="searchbtn-label">Search places, stays, tours, events</span><kbd data-k-hint>⌘K</kbd></button>
<a class="tripbtn" href="${root}trip.html">${icon("star")}My Trip <span class="count" data-trip-count hidden>0</span></a>
<button class="icon-btn search-icon-btn" type="button" aria-label="Search" data-search-open>${icon("search")}</button>
<button class="icon-btn theme-toggle" type="button" aria-label="Switch to the Night chart" data-theme-toggle>${icon("moon", "moon")}${icon("sun", "sun")}</button>
</header>`;

  /* ---------- footer ---------- */
  const author = config.author || {};
  const mapCredit = db.map && typeof db.map.attribution === "string" ? db.map.attribution : "";
  const footer = (root) => `<footer class="footer">
<div class="footer-inner">
<div class="footer-grid">
<div class="footer-brand">
${wordmarkArt(root, { cls: "wm-art footer-wm" })}
<p class="motto">${esc(config.siteTagline)}.</p>
<p class="footer-indep"><b>${esc(INDEPENDENCE)}</b> ${esc(SOURCED)}</p>
<div class="footer-author"><span>Built and maintained by <b>${esc(author.name || "")}</b><br>${author.github ? extLink(author.github, "GitHub") : ""}${author.github && author.linkedin ? " · " : ""}${author.linkedin ? extLink(author.linkedin, "LinkedIn") : ""}</span></div>
</div>
<div>
<h2>Sheets</h2>
<ul>${REGION_PAGES.map((rp) => `<li><a href="${root}${rp.slug}.html">${bullet(rp.region)}${esc(rp.label)}</a></li>`).join("")}</ul>
</div>
<div>
<h2>This guide</h2>
<ul><li><a href="${root}about.html">About and sources</a></li><li><a href="${root}about.html#corrections">Corrections and takedowns</a></li>${config.analyticsId ? `<li><a href="${root}about.html#privacy">Privacy and analytics</a></li><li>${CONSENT_BUTTON}</li>` : `<li><a href="${root}about.html#privacy">Privacy</a></li>`}<li>${extLink(config.repo, "Source on GitHub")}</li></ul>
</div>
</div>
<div class="footer-base"><span>${esc(INDEPENDENCE)} ${esc(SOURCED)} Always check the official sites before you go.</span>${mapCredit ? `<span>${esc(mapCredit)}</span>` : ""}</div>
</div>
</footer>`;

  /* ---------- dock, to-top, toast, modals ---------- */
  const dock = (root, active) => `<nav class="dock" aria-label="Quick">
${DOCK.map((d) => (d.search
    ? `<button type="button" data-search-open>${icon(d.icon)}${esc(d.label)}</button>`
    : `<a href="${root}${d.slug}.html"${d.slug === active ? ' aria-current="page"' : ""}>${icon(d.icon)}${esc(d.label)}${d.trip ? '<span class="count" data-trip-count hidden>0</span>' : ""}</a>`)).join("\n")}
</nav>`;
  const extras = (root) => `<button class="to-top" type="button" aria-label="Back to top" data-to-top>${icon("arrow-up")}</button>
<div class="toast" role="status" aria-live="polite" data-toast><span data-toast-text></span><a href="${root}trip.html" data-toast-link hidden>View</a></div>
<div class="modal search-modal" id="search" role="dialog" aria-modal="true" aria-label="Search the guide" data-modal>
<div class="modal-backdrop" data-close></div>
<div class="modal-panel">
<div class="search-field">${icon("search")}<input type="text" role="combobox" aria-expanded="true" aria-controls="sr-list" aria-autocomplete="list" aria-label="Search places, stays, tours, events and history" placeholder="Search places, stays, tours, events and history" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" data-search-input><button class="icon-btn" type="button" aria-label="Close search" data-close>${icon("x")}</button></div>
<p class="sr-only" role="status" aria-live="polite" data-search-status></p>
<div class="search-results" id="sr-list" role="listbox" aria-label="Results" data-search-results></div>
<p class="search-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></p>
</div>
</div>
<div class="modal" id="event-dialog" role="dialog" aria-modal="true" aria-labelledby="evd-title" data-modal>
<div class="modal-backdrop" data-close></div>
<div class="modal-panel"><div class="modal-head"><span data-evd-kicker></span><button class="icon-btn" type="button" aria-label="Close" data-close>${icon("x")}</button></div><div class="modal-body evd" data-evd-body></div></div>
</div>
<div class="modal" id="experience-dialog" role="dialog" aria-modal="true" aria-labelledby="xd-title" data-modal>
<div class="modal-backdrop" data-close></div>
<div class="modal-panel"><div class="modal-head"><span data-xd-kicker></span><button class="icon-btn" type="button" aria-label="Close" data-close>${icon("x")}</button></div><div class="modal-body evd xd" data-xd-body></div></div>
</div>`;

  /* ---------- head ---------- */
  const preload = (root) => tokens.preload.map((f) => `<link rel="preload" href="${root}assets/${f}" as="font" type="font/woff2" crossorigin>`).join("\n");
  const BOOT = bootScript();
  const hasOg = assets.og.has("og.png");

  return function shell(page) {
    const { root, slug } = page;
    const active = page.nav ?? slug;
    const isHome = slug === "index";
    const fullTitle = isHome ? `${NAME} · ${config.siteTagline}` : `${page.title} · ${NAME}`;
    const canonical = page.noindex ? "" : `${config.siteBase}${page.path === "index.html" ? "" : page.path}`;
    const ogImg = page.og && assets.og.has(page.og) ? page.og : hasOg ? "og.png" : null;
    const jsonld = page.jsonld ? `<script type="application/ld+json">${JSON.stringify(page.jsonld).replace(/</g, "\\u003c")}</script>\n` : "";
    const features = [...new Set(page.features || [])];
    const tocItems = page.toc || [];
    const crumbItems = page.crumbs !== undefined ? page.crumbs : isHome ? [] : [["Overview", "index.html"], [NAV_LABEL[slug] || page.title, null]];
    const navIdx = NAV_SLUGS.indexOf(slug);
    const pn = page.pagenav !== undefined ? page.pagenav
      : navIdx > -1 ? { prev: navIdx > 0 ? { href: `${NAV_SLUGS[navIdx - 1]}.html`, label: NAV_LABEL[NAV_SLUGS[navIdx - 1]] } : null, next: navIdx < NAV_SLUGS.length - 1 ? { href: `${NAV_SLUGS[navIdx + 1]}.html`, label: NAV_LABEL[NAV_SLUGS[navIdx + 1]] } : null }
      : null;
    const body = typeof page.body === "function" ? page.body(root) : page.body || "";
    const main = `${crumbsHtml(root, crumbItems)}
${tocItems.length ? `<div class="content-with-toc"><div class="content-main">${tocMobile(tocItems)}${body}${pn ? pagenav(root, pn.prev, pn.next) : ""}</div>${tocAside(tocItems)}</div>` : `${body}${pn ? pagenav(root, pn.prev, pn.next) : ""}`}`;
    return `<!doctype html>
<html lang="en" class="no-js" data-root="${attr(root)}" data-page="${attr(slug)}" data-v="${hashes.data}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${attr(page.description)}">
${ANALYTICS_META(config.analyticsId)}${canonical ? `<link rel="canonical" href="${attr(canonical)}">\n` : ""}${page.noindex ? '<meta name="robots" content="noindex">\n' : ""}<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="${attr(tokens.light)}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="${attr(tokens.dark)}" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${attr(NAME)}">
<meta property="og:title" content="${attr(fullTitle)}">
<meta property="og:description" content="${attr(page.description)}">
${canonical ? `<meta property="og:url" content="${attr(canonical)}">\n` : ""}${ogImg ? `<meta property="og:image" content="${attr(config.siteBase)}assets/${ogImg}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${attr(`${NAME}: ${config.siteTagline}`)}">
` : ""}<meta name="twitter:card" content="${ogImg ? "summary_large_image" : "summary"}">
${assets.favicon ? `<link rel="icon" type="image/svg+xml" href="${root}assets/favicon.svg">\n` : ""}${preload(root)}
${BOOT}
<link rel="stylesheet" href="${root}assets/tokens.css?v=${hashes.tokens}">
<link rel="stylesheet" href="${root}assets/site.css?v=${hashes.css}">
${assets.main ? `<script type="module" src="${root}assets/js/main.js?v=${hashes.js}"></script>\n` : ""}${jsonld}${page.head || ""}</head>
<body${features.length ? ` data-features="${attr(features.join(" "))}"` : ""}>
<a class="skip-link" href="#main">Skip to content</a>
${sprite()}
${topbar(root)}
<div class="scrim" data-scrim></div>
<div class="layout">
${sidebar(root, active)}
<main id="main" class="content${page.pageClass ? " " + page.pageClass : ""}" tabindex="-1">
${main}
</main>
</div>
${footer(root)}
${dock(root, active)}
${extras(root)}
${typeof page.modals === "function" ? page.modals(root) : page.modals || ""}
</body>
</html>
`;
  };
}
