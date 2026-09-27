export const meta = {
  name: 'tampa-foundation',
  description: 'Fork the Cincy Week engine for the Tampa Bay Chartbook and build its design system',
  phases: [
    { title: 'Engine', detail: 'E1 build core, then E2 client core + docs' },
    { title: 'Design', detail: 'DA design system in design/, then DB integrates it into site/' },
  ],
}
const REPO = '/home/user/visit-tampa-bay', CW = '/home/user/cincy-week'
const BASE = `You are building **Tampa Bay Chartbook**, an independent, source-linked visitor's guide to Tampa Bay, in ${REPO}
(git repo, branch claude/tampa-bay-visitor-guide-yd03u2). Today is Sep 27, 2026. Read ${REPO}/SPEC.md completely first,
then ${REPO}/research/SCHEMA.md and ${REPO}/research/tools/schema.mjs (the record shapes the data will have).
The reference engine is ${CW} (Cincy Week): read its CLAUDE.md and build/CONTRACTS.md, then the files you port.
Research agents are writing ${REPO}/research/<slice>/ right now: never touch research/. Never run git commit/checkout/reset
(the orchestrator commits). Other agents work in parallel on other directories: stay inside the files your task owns.
Keep Cincy Week's quality bar: zero dependencies, Node >= 18, fail-before-write, the crawler, accessibility (>= 44px targets,
nothing under 12px, words not color), no invented facts, plain voice.`

const RENAMES = `Fixed renames (every agent uses these exact names):
- program -> region ("sheet" in the brand). Region ids: tampa stpete beaches clearwater around daytrips (research/tools/schema.mjs REGIONS:
  number n, chart code, name). Region pages (REGION_PAGES in build/nav.mjs, slug -> region): tampa -> tampa.html, stpete -> st-petersburg.html,
  beaches -> gulf-beaches.html, clearwater -> clearwater.html, around -> around-the-bay.html, daytrips -> day-trips.html.
- CSS scope [data-prog=...] -> [data-sheet="<region id>"], still setting --ink-fill --ink-text --ink-on --ink-tint --ink-edge.
  Tokens --prog-<id>{,-tint,-ink,-on,-edge} -> --sheet-<id>{,-tint,-ink,-on,-edge}. Classes .prog-badge .prog-dot .prog-u -> .sheet-badge .sheet-dot .sheet-u.
  Every other class name in Cincy Week's vocabulary (.page-head .kicker .lede .card .chip .btn .facts .callout .toolbar ...) stays the same.
- h.bullet(regionId) draws the sheet mark (<svg class="bullet"><use href="#b-<region>"/></svg>).
- Storage keys cw-* -> tbc-* (tbc-theme tbc-rail tbc-trip tbc-prefs tbc-seen-shared tbc-debug). Env var CW_OUT -> TBC_OUT.
- Plan -> Trip: "My Trip" (trip.html) stars four kinds: e (event), x (experience), p (place), s (stay); button[data-star="<id>"] + data-star-kind.
- Pages (build/nav.mjs NAV): 1 Plan: index (Overview), whats-on (What's On, meta events), map (Map), trip (My Trip, meta trip);
  2 Sheets: the six region pages; 3 Explore: things-to-do (meta places), experiences (meta experiences), outdoors (Beaches & outdoors),
  history (History & heritage), eat-drink (Eat & drink), passages (Passages); 4 Stay: stay (Where to stay, meta stays), areas (Areas & towns);
  5 Visit: getting-around, when-to-visit, faq, about. DETAIL_FOLDERS: places/<id>.html, stays/<id>.html, areas/<id>.html.
  Dialogs: event ?e=<id> (on whats-on.html), experience ?x=<id> (on experiences.html). DOCK: What's On, Map, Trip, Search.
- site.config.json: siteName "Tampa Bay Chartbook", siteTagline "An independent guide to Tampa Bay, every entry linked to its source",
  siteBase "https://fritzhand.github.io/visit-tampa-bay/", pathPrefix "/visit-tampa-bay/", repo "https://github.com/fritzhand/visit-tampa-bay",
  author as in Cincy Week (Jeremy Fritzhand), timezone America/New_York, dataWindow { start: "2026-09-28", end: "2027-04-30" }, analyticsId "".`

const E1 = `${BASE}

${RENAMES}

## Your task: E1, the build-side engine (fork + domain rewrite)
Port Cincy Week's build side into ${REPO} and replace the festival-week domain with the destination domain of SPEC.md §4-5.
You own: build.mjs, build/core/*, build/nav.mjs, build/components/* (new domain renderers), build/pages/* (STUBS only),
site.config.json, package.json, tests/ (build-side tests + tests/fixtures/mini), scripts/serve.mjs, scripts/shots.mjs,
.github/workflows/* (test.yml, deploy-pages.yml adapted), data/ (seed = copy of the fixture so the build runs; the merge replaces it later),
and — for this phase only — site/css/* and site/fonts/* (a MECHANICAL port of Cincy Week's CSS and fonts with the renames above and
placeholder sheet tokens, just so the build passes; a design agent re-skins them later, so do not invest in styling).
Do not write site/js (E2 does that right after you) except what the build strictly needs to find (features dir may be empty).

Build-side requirements:
1. build/core/schema.mjs: field specs for regions areas places stays experiences events series timeline transport faqs facts media
   routes (routes: id, title, region, lede, stops: [{ kind: place|stay|experience|event, id, note }], source_url optional, notes) plus
   images.json and map.json. It must ACCEPT every shape research/tools/schema.mjs accepts (same enums, same area ids, same window,
   same coordinate box; import the enums from a copy inside build/core, not from research/). Unknown keys fail; notes allowed everywhere.
   Cross-file checks: ids unique across places stays experiences events series areas (one URL + trip-code space); area -> region;
   event.place / experience.departs_place / timeline.places / media.subject / routes stops resolve; dates inside dataWindow; share-code collisions.
2. build/core/load.mjs: byId maps for every collection; derived fields (region from area; place.events, place.nearbyStays;
   area.places/stays/experiences/events; region.areas; heritage list; eventsByDay; instances (expand an event per day inside the window
   when its run is <= 14 days; a longer run is ONE instance flagged ongoing with its end date, shown as "Through <date>");
   statuses scheduled/tentative/changed/postponed/cancelled; nearby(lat, lng, meters); counts; days/months present).
3. build/nav.mjs: NAV, REGION_PAGES, NAV_SLUGS, DETAIL_FOLDERS, DOCK, PARAMS and paramValues for the new pages:
   whats-on [month day r a k free q when star view e series], things-to-do [r a k t q free view], experiences [r k t q x],
   stay [r a k f q view], outdoors [r k q], history [era r q], eat-drink [r a k tag q], map [layers r focus], areas [r], faq [q topic].
   Values validated from the data (r = region ids, a = area ids, k = kinds, t = topics, f = stay features, era = eras, when = today|weekend|week|month).
4. build/core/icons.mjs: region ids, sheet marks #b-<region> (a small nautical daymark/label shape with the chart code, e.g. "TP"),
   and the icon sprite: keep Cincy's useful icons and ADD anchor (stay), landmark (historic site: circle with center dot), compass,
   wave, boat, fish, palm, sun, umbrella (beach), ticket, fork-knife, glass, trail, binoculars, bus, ferry, plane, parking, car, bike, info.
5. build/core/components.mjs, shell.mjs, seo.mjs (JSON-LD: TouristAttraction/Museum/Park/LodgingBusiness/Event/Place/TouristTrip),
   search.mjs (kinds: pl st ex ev se ar rg pg fq tr tl), crawl.mjs, write.mjs (readTokens requires --sheet-<id> tokens), client-data.mjs
   (assets/data/events.json + event-text.json, experiences.json, places-lite.json for maps/trip, stays-lite.json: document shapes in its header),
   images.mjs (manifest data/images.json: kinds p place, s stay, a area, t timeline, x experience; files site/img/<kind>/<id>.webp; images
   come from media.json later; with no images every card gets a typographic plate).
   Shell: masthead text "Tampa Bay Chartbook" (the design agent will replace the markup of the wordmark), sidebar with sheet codes,
   footer MUST include the line "Independent guide. Not affiliated with any tourism office, venue or operator." and "Every entry links to its source."
6. build/components/: place-card, stay-card, experience-card, event-card (+ eventRow/eventList like Cincy's), area-card, mini-map
   (ctx.cards.miniMap as Cincy's venue-card mini map, reading data/map.json: if map.json/basemap is absent, render a coordinate line
   instead and never fail), heritage block renderer, source line. Cards print unknowns as unknowns ("Hours not listed").
7. build/pages/: a STUB module for every nav page and detail folder (index, whats-on, map, trip, the six region pages via one
   module like Cincy's program.mjs, things-to-do, experiences, outdoors, history, eat-drink, passages, stay, areas, getting-around,
   when-to-visit, faq, about, places/<id>, stays/<id>, areas/<id>): each renders a pageHead and a minimal honest list of its records
   (e.g. things-to-do lists places by name with links) so the crawler passes and page lanes have a starting point. Name them so the
   later lanes own disjoint files: home.mjs, whats-on.mjs, map.mjs, trip.mjs, region.mjs, things-to-do.mjs, experiences.mjs,
   outdoors.mjs, history.mjs, eat-drink.mjs, passages.mjs, stay.mjs, areas.mjs, places.mjs (detail pages), visit.mjs (getting-around,
   when-to-visit), faq.mjs, about.mjs.
8. tests/: helpers + fixture (tests/fixtures/mini: a small, REAL-looking but clearly fixture dataset in the new shapes: 2 regions'
   worth of areas, ~12 places incl. 2 historic, 4 stays, 3 experiences, 8 events incl. a multi-day run and a long run, 2 series, 4 timeline,
   2 transport, 2 faqs, 2 facts, 0 media); build.test.mjs (fixture build passes; BROKEN mutations fail with the right message: unknown key,
   bad area, http URL, placeholder text, dangling place ref, date outside window, duplicate id across files), time/filters/search/share
   tests ported. npm test must pass. node build.mjs must pass on the seeded data/.
9. Write ${REPO}/build/CONTRACTS.md (the exact API for page lanes: ctx, db fields and derived fields, components and their options,
   markup/CSS vocabulary, page module shape, PARAMS, JSON outputs) — the page lanes will code against it, so be precise.

Finish: node build.mjs clean (warnings OK), npm test green. Return a concise report: files created, the ctx/db API summary, and anything
E2 (client) must know (JSON output shapes, data attributes the client wires).`

const E2 = (e1) => `${BASE}

${RENAMES}

## Your task: E2, the client-side engine + the operating manual
E1 just finished the build side. Its report: ${String(e1).slice(0, 6000)}
Read ${REPO}/build/CONTRACTS.md and the new build/ code first.
Port Cincy Week's client runtime into ${REPO}/site/js: main.js, core/* (theme, drawer, dock, modal, toast, store (tbc-* keys),
search palette (⌘K / Ctrl K / "/", lazy index), toc, anchors, clock (?now= on localhost or with tbc-debug), live/status (event instances:
upcoming | soon | live | started | past, "Today", "This weekend"), trip store (was plan-store: kinds e x p s, share codes, subscribe),
share, event dialog (#event-dialog: ?e=<id>), experience dialog (#experience-dialog: ?x=<id>, replacing Cincy's work dialog)),
lib/* (time, filters, search, share, text, ics, geo — adapted to the new data), and tests for the libs (tests/*.test.mjs).
Any data-* hook the build emits (data-star, data-star-kind, data-open-event, data-open-experience, data-s/data-e) must be wired.
You own: site/js/**, tests for site/js libs, and the docs below; you may make small fixes in build/core/* where the client contract
needs it (document them in CONTRACTS.md). Do not touch site/css (a design agent owns it next) or build/pages (lanes own them next).
Then write ${REPO}/CLAUDE.md: the operating manual for this repo in the style of ${CW}/CLAUDE.md (what this is; the rules that never
bend (SPEC §2); maintaining the site (the loop; correct/add an event, place, stay, experience; closures; images); commands; how the site
is built; contracts summary; data rules; what the build rejects; tone; deploy) — accurate to THIS code. Update ${REPO}/build/CONTRACTS.md
with the client API (app object, data outputs, storage keys, dialogs, stars, live state).
Finish: node build.mjs clean, npm test green. Return a concise report.`

const DA = `${BASE}

## Your task: DA, the design system "Chart & Label" (SPEC.md §3), built in ${REPO}/design/ only
An engine agent is porting Cincy Week's CSS into site/css right now; you must NOT write site/. Work only in ${REPO}/design/.
Study ${CW}/site/css/tokens.css (structure, token names, the three color blocks, fonts, metric-matched fallbacks), ${CW}/site/css/*.css
(what the partials style), ${CW}/site/img/brand/*.svg, and ${CW}/.github/screenshots/*.png (look at them) for the quality bar.
Also look at /home/user/history-of-tampa (css/styles.css, assets/og-image.png) for its editorial palette (do not copy it).
Deliver:
1. design/DESIGN.md — the system: concept (a nautical chartbook printed like an Ybor cigar-box label), the two editions ("Day chart":
   cream chart paper, deep navy ink, chart magenta and cigar gold accents; "Night chart": deep bay navy, cream ink, gold), the six sheet inks
   (Tampa, St. Petersburg, Gulf Beaches, Clearwater & North Pinellas, Around the Bay, Day Trips: distinct hues, each with fill/tint/ink/on/edge,
   AA contrast verified in both editions — include a table of the computed contrast ratios), type (display + text + a label/numeral face,
   all SIL OFL, self-hosted woff2 latin + latin-ext subsets), type scale (floor 12px), spacing, radii, rules, the ornaments (label frame
   with double rule and corner ornaments, ribbon banner for kickers, "water lining" rule (engraved ripple echo) as the section divider,
   compass rose, graticule tick border, sheet badge shape with the chart code), card styles (place, stay with an anchor, experience, event,
   historic site with the landmark symbol, the typographic "plate" used when a record has no image), map styling (land, water, water-lining,
   roads, labels, pins as numbered buoys, clusters) for BOTH editions, iconography rules, motion, focus rings, do/don't list.
2. design/tokens.css — a complete drop-in tokens file in Cincy Week's structure and token names (so the partials port), with
   --sheet-<region>{,-tint,-ink,-on,-edge} for tampa stpete beaches clearwater around daytrips, --theme-color (light+dark), --fonts-preload,
   the @font-face rules pointing at fonts/<file>.woff2, metric-matched fallbacks, and new tokens for the ornaments and the map
   (--map-land --map-water --map-water-line --map-road --map-road-major --map-label --map-coast ...). Color literals only here.
3. design/fonts/ — download the chosen OFL fonts as woff2 (Google Fonts CSS API via curl with a modern browser User-Agent returns
   woff2 URLs; fonts.googleapis.com and fonts.gstatic.com are reachable) and their OFL.txt license files.
4. design/brand/ — wordmark.svg ("Chartbook" with "TAMPA BAY" in spaced caps above), mark.svg (compass rose medallion inside a
   cigar-band ellipse), logo.svg (mark + wordmark), favicon.svg, compass.svg, label-frame.svg / corner ornament, water-lining pattern,
   sheet badge shapes for the six codes (TP SP GB CW AB DT). All use currentColor or CSS variables, no raster textures.
5. design/specimen.html — a self-contained specimen page (links design/tokens.css) showing both editions: masthead, page head with
   label frame and ribbon kicker, sheet badges, buttons, chips, the five card kinds, the plate, a callout, a facts table, a section
   divider, a mini chart-map sample. Render it with Playwright (NODE_PATH=/opt/node22/lib/node_modules; chromium at /opt/pw-browsers,
   do not run playwright install) to design/shots/*.png at 1440 and 390 wide in both editions, LOOK at the screenshots, and iterate
   until it is genuinely distinctive and polished (not a generic template, not a copy of Cincy Week's newspaper look).
Return a concise report: fonts chosen and why, the palette with contrast numbers, file list.`

const DB = (e, da) => `${BASE}

${RENAMES}

## Your task: DB, integrate the design system into the site
The engine is done (E1+E2 reports: ${String(e).slice(0, 3000)}). The design system is in ${REPO}/design/ (DA report: ${String(da).slice(0, 3000)}).
Read ${REPO}/design/DESIGN.md, ${REPO}/CLAUDE.md and ${REPO}/build/CONTRACTS.md first; look at design/shots/*.png.
Now you own site/css/**, site/fonts/**, site/img/brand/**, site/favicon.svg, scripts/og.mjs and site/og*.png, plus the brand markup in
build/core/shell.mjs and build/core/icons.mjs (wordmark, mark, sheet marks, ornaments) — nothing else in build/.
1. Replace site/css/tokens.css with the design tokens; replace site/fonts with the design fonts (delete Cincy's); add the brand SVGs.
2. Re-skin every partial the engine ported (00-base, 10-shell, 20-content, 80-dialogs, 81-event-dialog or its successor, 99-print, and any
   other ported partial) to the Chart & Label look: masthead, sidebar with sheet codes, page heads with label frame + ribbon kicker,
   water-lining dividers, cards, chips, buttons, facts, callouts, dialogs, dock, search palette, footer. Delete partials that styled
   Cincy-only features the new site does not have (keep numbering; page lanes will add 30-39 home/region, 40-49 whats-on/trip,
   50-59 map/areas, 60-69 explore pages, 70-79 visit/stay pages).
3. scripts/og.mjs: social cards (site/og.png + site/og-<region>.png) in the new brand; render them.
4. node build.mjs clean; npm test green; run scripts/shots.mjs (NODE_PATH=/opt/node22/lib/node_modules) on the stub pages in both
   editions and at 390px; LOOK at the screenshots; fix overflow, contrast, targets < 44px, text < 12px.
Return a concise report of what you changed and anything page lanes must know (new classes, ornaments, tokens).`

phase('Engine')
const [eng, da] = await parallel([
  async () => {
    const e1 = await agent(E1, { label: 'E1:build-engine', phase: 'Engine' })
    const e2 = await agent(E2(e1), { label: 'E2:client-engine', phase: 'Engine' })
    return `E1: ${e1}\n\nE2: ${e2}`
  },
  () => agent(DA, { label: 'DA:design-system', phase: 'Design' }),
])
phase('Design')
const db = await agent(DB(eng, da), { label: 'DB:integrate-design', phase: 'Design' })
return { engine: eng, design: da, integrate: db }
