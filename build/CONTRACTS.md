# Tampa Bay Chartbook: contracts for the parallel lanes

The exact API the page lanes (Home & Sheets, What's On, Map, Trip, Explore, Experiences, History, Passages, Stay,
Areas, Detail pages, Visit, About), the client (E2), the design agent, the basemap agent and the merge code
against. Landed by E1 (build engine) on 2026-09-27, forked from Cincy Week's engine (`/home/user/cincy-week`,
`build/CONTRACTS.md` there). `SPEC.md` is the product spec; `research/SCHEMA.md` the record shapes. **When the
code and this file disagree, the code wins: report the mismatch.** Contracts are only extended, never renamed
(ids and URLs are in readers' saved trips).

---

## 1. Working in parallel without collisions

| Do | Don't |
|---|---|
| Build into your own folder: `TBC_OUT=.cache/out-<lane> node build.mjs` | Run a plain `node build.mjs` while others work: it rewrites the shared `docs/` |
| Serve it: `TBC_OUT=.cache/out-<lane> PORT=8124 node scripts/serve.mjs` → `http://localhost:8124/visit-tampa-bay/` | Share a port or an output folder |
| Shoot it: `TBC_OUT=.cache/out-<lane> NODE_PATH=/opt/node22/lib/node_modules node scripts/shots.mjs --pages whats-on,index --states` (PNGs + `audit.json` in `.cache/shots-out-<lane>/`) | Write into `.cache/shots/` (the integrator's) |
| Run `npm test` any time: every build test runs in its own temp copy with `tests/fixtures/mini` as `data/` | Edit `tests/build.test.mjs` or `tests/fixtures/mini/*` (E1's). Add `tests/<lane>.test.mjs` with `tests/helpers.mjs` |
| Replace your stub module wholesale; keep producing every page and every anchor id it produces (§3, §9) | Edit a module or component you don't own. Say what you need in your report |
| Touch `research/` never (read-only provenance) | |

- `TBC_OUT` resolves against the repo root; the build refuses one inside `site/ build/ data/ tests/ scripts/ research/` or
  the root. It writes `<TBC_OUT>.tmp/`, crawls it, then swaps it into `<TBC_OUT>/`: a failed build never touches the last good output.
- Time travel on localhost: `?now=2026-10-24T19:30` (New York wall time; anywhere after `localStorage.setItem("tbc-debug","1")`)
  sets `<html data-now="<epoch ms>">`. `?theme=light|dark` forces an edition ("Day chart" / "Night chart").
- `data/` today is a copy of the fixture (so the build runs); the merge (`scripts/merge-research.mjs`) replaces it.

## 2. Files and owners

| Owner | Files |
|---|---|
| **E1** engine | `build.mjs`, `build/core/*`, `build/nav.mjs`, `build/components/*` (lanes may extend their card additively), `build/pages/_stub.mjs`, `build/CONTRACTS.md`, `site.config.json`, `package.json`, `tests/{build,time,filters,search,share,schema,minimap}.test.mjs`, `tests/helpers.mjs`, `tests/fixtures/mini/*`, `scripts/{serve,shots}.mjs`, `.github/workflows/*`, the pure libs `site/js/lib/{time,text,share,search,filters,geo}.js` (the build imports them; E2 may extend them additively, with tests) |
| **E2** client | `site/js/main.js`, `site/js/core/*`, `site/js/features/*`, other `site/js/lib/*` |
| **Design** | `site/css/tokens.css`, every `site/css/NN-*.css` re-skin (today a mechanical port of Cincy Week's CSS), `site/fonts/*`, `site/favicon.svg`, `site/img/brand/*`, `site/og*.png`; `wordmark()` and `MARK` in `build/core/icons.mjs` (markup only; keep the names) |
| **Basemap** | `site/map/basemap.svg` (a `<g id="bm">`), `data/map.json` (§5) |
| **Merge / images** | `data/*.json`, `scripts/merge-research.mjs`, `data/images.json` + `site/img/{p,s,a,t,x}/` |
| **Page lanes** | one stub each in `build/pages/` (§3), their CSS partial(s) (§7), their `tests/<lane>.test.mjs` |

## 3. Page modules: `build/pages/<name>.mjs`

The build imports every `build/pages/*.mjs` whose name doesn't start with `_`, in name order.

```js
export function pages(ctx) {                  // required; returns an array (may be many detail pages)
  return [{
    path: "whats-on.html",                    // a nav slug + ".html", or places/<id>.html · stays/<id>.html · areas/<id>.html
    nav: "whats-on",                          // sidebar + dock item marked aria-current (default: the slug; detail pages: DETAIL_FOLDERS)
    title: "What's On",                       // plain text; <title> = "What's On · Tampa Bay Chartbook" (index: "Tampa Bay Chartbook · <tagline>")
    description: "…",                         // plain text, required; meta description + og:description
    body: (root) => html,                     // root = "" (top level), "../" (detail) or "/visit-tampa-bay/" (404 only)
    toc: [["id", "Label"], …],                // optional: TOC rail ≥ 1280px (≥ 2 items), collapsed list (≥ 5)
    crumbs: [["Overview", "index.html"], ["Label", null]],   // optional; default Overview / <nav label>; [] = none
    pagenav: { prev: { href, label }, next } | null,  // optional; default = neighbors in NAV order (detail pages: set null)
    features: ["whats-on"],                   // client modules: site/js/features/<name>.js must exist (E2)
    head: "<link …>", modals: (root) => html, // optional extra <head> HTML; dialogs rendered after the dock
    jsonld: {…}, og: "og-tampa.png",          // optional; og must be a file site/og*.png (else og.png when it exists)
    noindex: false, pageClass: "",
  }];
}
export function search(ctx) { return [ /* §9 entries: they win over the core's default entry of the same k + id */ ]; }
export function data(ctx) { return { "assets/data/<name>.json": anyJson }; }   // fetched lazily by app.data("<name>.json")
```

**Stubs and who replaces them** (each produces exactly these pages; keep producing them):

| Module | Pages | Must keep |
|---|---|---|
| `home.mjs` | `index.html` | |
| `whats-on.mjs` | `whats-on.html` | one card `id="e-<id>"` per event (cancelled/postponed included); one element `id="s-<series id>"` per series |
| `map.mjs` | `map.html` | |
| `trip.mjs` | `trip.html` | |
| `region.mjs` | the six sheet pages (`REGION_PAGES`) | |
| `things-to-do.mjs`, `outdoors.mjs`, `eat-drink.mjs` | those pages | |
| `experiences.mjs` | `experiences.html` | one card `id="x-<id>"` per experience |
| `history.mjs` | `history.html` | one element `id="tl-<id>"` per timeline entry |
| `passages.mjs` | `passages.html` | one element `id="r-<route id>"` per route |
| `stay.mjs` | `stay.html` + `stays/<id>.html` for **every** stay | |
| `areas.mjs` | `areas.html` + `areas/<id>.html` for **every** area in `db.areas` (all 45) | |
| `places.mjs` | `places/<id>.html` for **every** place | |
| `visit.mjs` | `getting-around.html` (one element `id="t-<id>"` per transport record), `when-to-visit.html` | |
| `faq.mjs` | `faq.html` | one element `id="fq-<id>"` per FAQ |
| `about.mjs` | `about.html` | a section `id="corrections"`; the independence line verbatim (`INDEPENDENCE`, `SOURCED` from `build/core/shell.mjs`) |

The build fails when a nav page has no producer, two modules produce one path, a module produces a path that is
neither a nav page nor a detail page (an orphan), or a place, stay or area has no detail page. `ctx.fail(where, msg)`
fails the build; `ctx.warn(where, msg, group?)` warns (warnings sharing a `group` collapse into one line). Name
records as `data/<file>.json#<id>.<field>`. `build/pages/_stub.mjs` exports `stubPage(ctx, {...})` and `rows(items)`.

Every page renders its own head with `ctx.c.pageHead({…})` (its only `<h1>`). Every internal URL is `root + path`
(no leading `/` except on the 404 page). The shell adds everything else (§8).

## 4. `ctx`: the same object for every module

```js
ctx.config   // site.config.json: siteName "Tampa Bay Chartbook", siteTagline, siteBase, pathPrefix "/visit-tampa-bay/", repo,
             //   author { name, github, linkedin }, timezone "America/New_York", dataWindow { start: "2026-09-28", end: "2027-04-30" }, analyticsId
ctx.db       // §5
ctx.vocab    // build/core/vocab.mjs (enums, labels, groups; list below)
ctx.buildDate  // "Monday, September 21, 2026" (from SOURCE_DATE_EPOCH in tests; about.html only)   ctx.buildDay // "2026-09-21"
ctx.nav      // { NAV, NAV_SLUGS, NAV_LABEL (slug → label), REGION_PAGES, DETAIL_FOLDERS, regionHref(regionId) → "tampa.html" }
ctx.h = {    // strings in, strings out
  esc(s), attr(s), paras(text) → "<p>…</p>…", slugify, hostOf(url), truncate(s, n), initials(name), aliasKey(s),
  extLink(href, innerHtml, cls?)   // target=_blank rel=noopener + sr-only "(opens in a new tab)" (the crawler requires both)
  plural(n, "place", "places"?), listJoin([...]), sortBy(arr, ...keyFns) (stable), groupBy(arr, keyFn) → Map, hash8, clone,
  HTML_IN_TEXT, PLACEHOLDER, PLACEHOLDER_WORD,
  icon(name, cls?)                 // <svg class="i"><use href="#i-name"/></svg>; unknown name → build error (§7 list)
  bullet(regionId, ""|"lg"|"xl")   // the sheet mark (24/32/44px), decorative: always next to the region's name or code
  wordmark(cls, label = true), mark(cls),
  fmtDay("2026-10-24") → "Sat, Oct 24", fmtDayLong → "Saturday, October 24", fmtDate → "Oct 24", fmtDateY → "Oct 24, 2026",
  fmtTime("19:30") → "7:30 PM", fmtRange("16:00","21:00") → "4:00–9:00 PM", fmtDateRange(a, b) → "Feb 5–16",
  fmtDowRange(a, b) → "Fri–Tue", fmtMonth("2026-10") → "October 2026", fmtThrough("2027-01-10", from) → "Through Jan 10, 2027",
  isoLocal(epoch) → "2026-10-24T16:00-04:00", url(root, path), regionHref(regionId),
}
ctx.c = {    // build/core/components.mjs (data-agnostic)
  crumbs(root, [[label, href|null]…]),
  pageHead({ kicker, num (1–5 section numeral), sheet (region id: its mark instead, and data-sheet), title, titleHtml, lede, dek, chips, cls, after }),
  facts(root, [[label, valueHtml]…], { label })     // empty values are dropped; > 110 characters → .fact-wide
  section({ id, title, kicker, num, icon, more: { href, label }, body, anchor, cls, root })   // <section id> + h2#<id>-h
  callout(tone "" | "tip" | "warn" | "org", html, { flag, sheet, cite })   // "org" = an official page's own words (blockquote + cite)
  chip(label, href|null, { count, pressed, sheet, root, attrs, check, ic }),
  sheetBadge(regionId, { short = true }), sheetDot(regionId), sheetName(regionId, short), SHEET_LABELS { id: { name, short, code, n } }, regionIds,
  starButton(id, title, { kind: "e"|"x"|"p"|"s", cls })   // the only star markup (§8)
  badge(kind, text)         // kind: live soon started past free trip warn out unconfirmed | "" (.badge-<kind> in 20-content.css)
  statusBadge(rec)          // place/stay/experience status words ("" when open): Temporarily closed, Seasonal, Opening soon, Closed
  eventStatusBadge(ev)      // "" when scheduled; Tentative, Changed, Postponed, Cancelled
  unk(text)                 // <span class="unk">Hours not listed</span>: unknowns print as unknowns
  emptyState({ title, body, action, glyph, sheet, attrs, level = 3 }),
  toolbar({ search: { label, placeholder }, selects: [{ name, label, options: [[v, l]] }], views: [{ v, label, icon, pressed }] }),
  resultCount(n, total, noun), pagenav(root, prev, next), toc(items), tocMobile(items), keylinks(root, [{ href, label }]),
  sourceLine([urls], { label, note }),   // "Sources: host · host", deduped
  recordSource(rec, { label })           // source_url + quote_source + also_sources, note "Checked Sep 27, 2026"
  placeholder(what, owner), secNum(n), STAR_KINDS,
}
ctx.img = {  // build/core/images.mjs — manifest data/images.json (§5); kinds p place · s stay · a area · t timeline · x experience
  img(root, kind, id, { alt, cls, sizes, lazy = true, big = false }) → <img …> | "",
  has(kind, id), entry(kind, id), path(kind, id) → "assets/img/p/<id>.webp" | null, srcset(root, kind, id),
  plate(root, kind, rec, { size: ""|"lg", cls, alt, sizes }) → .photo (the image) | .plate-type[data-sheet] (chart code + name)
  figure(root, kind, id, { cls, sizes, big = true, caption }) → <figure class="photo-fig"> with the credit line | "",
  credit(kind, id) → text, creditHtml(kind, id) → credit · license link · "Image page" link, SIZES, KINDS,
}
ctx.cards = { …§6 }     ctx.map = { miniMap, areaMap, meta }     ctx.time = site/js/lib/time.js (§8)
ctx.seo = { placeLd(place, { url, image }), stayLd(stay, …), eventLd(ev, instance?, { url }), experienceLd(x, { url }),
            destinationLd(areaOrRegion, { url }), routeLd(route, { url, stopUrl(stop) }), simplePlace(rec), PLACE_TYPE, STAY_TYPE }
            // schema.org: TouristAttraction (+ Museum, Park, Beach, Zoo, Aquarium, AmusementPark, …), LodgingBusiness types,
            // Event, TouristTrip, Place/TouristDestination. Unknown fields are left out.
```

**`ctx.vocab`** (`build/core/vocab.mjs`, a copy of `research/tools/schema.mjs`'s enums; `tests/schema.test.mjs` keeps them equal):
`REGIONS { id: { n, code, name, short } }` · `REGION_IDS` (tampa stpete beaches clearwater around daytrips) · `AREAS { area: region }` ·
`AREA_IDS` (45) · `AREA_NAMES` · `AREA_KINDS` · `PLACE_KINDS` · `TOPICS` · `STATUS` · `STAY_KINDS` · `STAY_FEATURES` ·
`EXPERIENCE_KINDS` · `EVENT_KINDS` · `EVENT_STATUS` · `TRANSPORT_MODES` · `ERAS` · `LICENSES` · `GEO_SOURCES` · `MEDIA_SUBJECTS` ·
`ROUTE_STOP_KINDS` · `DATE_WINDOW` · `BOX { s: 26.9, n: 29, w: -83, e: -81.4 }` · labels `PLACE_KIND_LABEL TOPIC_LABEL STATUS_LABEL
STAY_KIND_LABEL FEATURE_LABEL EXPERIENCE_KIND_LABEL EVENT_KIND_LABEL EVENT_STATUS_LABEL MODE_LABEL AREA_KIND_LABEL ERA_LABEL
("Boomtown, 1884–1919") ERA_NAME ERA_SPAN LICENSE_LABEL` · groups `EVENT_GROUP` (kind → festivals shows sports arts food family other) +
`EVENT_GROUP_LABEL` · `PLACE_GROUP` (kind → attractions arts history outdoors sports shopping eat drink info) + `PLACE_GROUP_LABEL` ·
`EXPERIENCE_GROUP` (kind → water tours taste adventure) + `EXPERIENCE_GROUP_LABEL` · `EAT_DRINK_KINDS OUTDOOR_KINDS HISTORY_KINDS`.

## 5. `db`: the validated, indexed data (`build/core/load.mjs`)

Page modules only ever see valid data: the build stops, listing every data, token and CSS error, before any module runs.

**Files** (`data/*.json`, shapes in `research/SCHEMA.md`, enforced field by field in `build/core/schema.mjs`; unknown keys fail;
`notes` is allowed everywhere and never rendered): `regions areas places stays experiences events series timeline transport faqs
facts media routes` (arrays; only `places` must exist and be non-empty), `aliases` (`{ places: { "<aliasKey>": placeId } }`),
`images` (§ below), `map` (§ below). `routes` (Passages, build phase): `{ id, title, region, lede, stops: [{ kind: place|stay|experience|event,
id, note }] (≥ 2), source_url?, also_sources?, checked?, notes }`. Regions also accept build-phase `lat`, `lng` (center) and `bounds { s, n, w, e }`.

**Arrays:** `db.regions` (always all six, sheet order, each merged with its record; `record: false` when regions.json lacks it),
`db.areas` (always all 45, sheet order, merged; `record: false` when areas.json lacks it), `places stays experiences events series
timeline transport faqs facts media routes` (data order). **Objects:** `aliases images map`; `db.basemap` (bool: `site/map/basemap.svg` exists);
`db.window` (= config.dataWindow).

**`db.byId`:** `.region .area .place .stay .experience .event .series .timeline .transport .faq .fact .media .route` (Maps).

**Fields the loader adds to records** (the stored fields are untouched unless noted):

| Record | Added |
|---|---|
| region | `n`, `code`, `short`, `record`; `areas` (area records), `places stays experiences events series routes timeline media` (in that region), `ll` |
| area | `record`, `name` (record's, else `AREA_NAMES`), `region` (always, from `AREAS`); `places stays experiences events series media`, `ll` |
| place | `region` (from area), `kindsAll` ([kind, ...kinds]), `groups` (PLACE_GROUP of each), `ll` ([lat, lng] or null), `open` (status ≠ closed), `events` (live, by start), `series`, `experiences` (departing here), `timeline`, `media`, `nearbyStays` ([{ rec, d }] open stays within 1,600 m, nearest first, ≤ 6) |
| stay | `region`, `ll`, `open`, `timeline`, `media`, `nearbyPlaces` ([{ rec, d }] open places within 1,200 m, ≤ 8) |
| experience | `region`, `kg` (EXPERIENCE_GROUP), `departs` (place record or null), `ll` (own, else the departure place's), `open`, `media` |
| event | `kg` (EVENT_GROUP), `venue` (place record or null), `area` (**filled from the place when null**), `region`, `ll` (own, else the place's), `seriesRec`, `live` (status not cancelled/postponed), `instances`, `run` (one long-run instance), `day` (first listing day), `first` (first instance's `s`) |
| series | `venue`, `area` (filled from the place when null), `region` |
| timeline | `links` ([{ kind: "place"\|"stay", rec }] from `places`, which may name places **or stays**), `area` (filled from the first link), `region`, `ll` |
| route | `stopsResolved` ([{ kind, id, note, rec }]) |

**Instances** (`site/js/lib/time.js expand()`): `{ id, ev, date, day, s, e, start, end, lateNight, endUnknown, timeUnknown, allDay, ongoing, run, through }`.
- `s`/`e` are epoch ms from New York wall time (DST-safe). A start 00:00–04:59 is listed under the day before (`lateNight`).
- No `end` → `e = s + 60 min`, `endUnknown` (say "end time not listed", never "Now"). No `start` → `timeUnknown`, spans the day
  ("Time not listed", or the event's `time_text`, no state word). `all_day` → `allDay`.
- `date` + `end_date` **≤ 14 days** (inclusive) and every `occurrences[]` list → one instance per day inside the window (`ongoing` when > 1).
- A run **longer than 14 days** (no occurrences) → **ONE** instance: `run: true`, `ongoing`, `date`/`day` = its first day inside the
  window, `s` = that day's start (or 00:00), `e` = the last day in the window's end (or 24:00), `through` = the real `end_date`.
  Pages print "Through Jan 10" (`h.fmtThrough`); nothing claims "Now" for a run.
- Statuses: `scheduled tentative changed postponed cancelled`. Cancelled and postponed events keep their cards and URLs but are not `live`.

**Indexes and helpers:**
- `db.instances` (every instance, by `s`) · `db.runs` (live run instances) · `db.eventsByDay` (listing day → live instances, runs excluded) ·
  `db.onDay(date)` → that day's live instances **plus** the runs covering it · `db.days` `[{ date, count, weekend, month }]` (days with a
  live, non-run instance) · `db.months` `[{ key: "2026-10", label: "October 2026", count }]` (months any live event touches).
- `db.eventsByPlace`, `eventsByArea`, `eventsByRegion`, `eventsBySeries` (Maps of live events by first start) · `db.placesByKind` (kind **or
  secondary kind** → places) · `placesByGroup` · `placesByTopic` · `staysByKind` · `experiencesByKind` · `timelineByEra` (era → entries by year).
- `db.heritage` `[{ kind: "place"|"stay", rec }]`: every place and stay with a `heritage` block, by era, first year in `built`, name.
- `db.code(id)` (5-character share code) · `db.codeToId` (Map over the one id space) · `db.nearby(lat, lng, meters = 800, { kinds })` →
  `[{ kind: "place"|"stay"|"experience", rec, d }]` · `db.counts { places stays experiences events (live) series areas (with records)
  regions timeline transport faqs heritage routes media }`.

**What fails** (every error names `data/<file>.json#<id>.<field>`): unknown keys; missing required fields; wrong types or enums
(reported, never a crash); placeholders (a whole value `TBA TBD N/A none unknown varies see website - — ?` …; a placeholder word inside an identity
field: a name, title, operator, label, value, question or alt text, "Headliner TBA"; inside any other text, the source's own words, it warns); HTML or entities in text; `http:` or malformed URLs; empty strings; ids not unique per file **or across places, stays,
experiences, events, series, areas and regions**; share-code collisions; an area record in the wrong region; dangling `event.place`,
`event.series`, `series.place`, `experience.departs_place`, `timeline.places` (place or stay), `timeline.media`, `media.subject`,
`transport.stops[].place`, `routes[].stops[]`, `aliases.places`; event dates outside the window; `end_date < date`; occurrences outside
the window or the event's dates; suspicious times (end before start unless ≤ 06:00); `all_day` with times; an end without a start; an
event with neither `place` nor `location_text`; an experience with no departure (`departs_place`, `departs_text` or lat/lng); lat without
lng; coordinates outside `BOX`; coordinates without `geo_source`; `status: "closed"` without `status_note`; a quote over 45 words or without
a page; series months outside 1–12; a route with < 2 stops; a malformed `images.json` entry or a missing image file; a `map.json` without
`bbox.core`. **Warns:** regions/areas without a record, records without coordinates or off the basemap, places without a summary,
closed places without heritage, events without an area, images for records that do not exist, leading/trailing whitespace.

**Aliases:** an event or series with `place: null` and a `location_text` gets `place` when the text matches a place's name, one of
its `aliases[]`, or `aliases.json` `places` (keys compared through `aliasKey()`: lowercase, `&` → and, punctuation stripped). Stored values win.

**`data/images.json`** (written by the images pass from `media.json`; never hotlinked): keys `"<kind>/<id>"` (kind `p s a t x`) →
`{ file: "img/p/<id>.webp", w, h, credit (required), license (required: public-domain cc0 cc-by cc-by-sa us-gov), license_url?, page_url?,
creator?, alt?, media? (a media id), sm?: { file, w, h }, lg?: { file, w, h } }`. Files live in `site/img/<kind>/`.

**`data/map.json`** (basemap agent; same shape as Cincy Week's): `{ bbox: { core: { s, n, w, e }, home?: {…} }, projection: { lat0, k (= cos lat0),
sx (units per degree), viewBox: [W, H], mPerUnit? }, labels?: [{ text, lat, lng, kind: hood|water|park|street|bridge|state, angle?, minZoom? }],
attribution?: "…" (printed in the footer) }`, with `site/map/basemap.svg` holding `<g id="bm">`. Until both exist `db.basemap`/`ctx.map.meta`
are false/null and every mini map is a coordinate line.

## 6. Components (`ctx.cards`, `build/components/*`)

| Function | Markup contract |
|---|---|
| `eventCard(root, evOrInstance, { anchor = true, headingLevel = 3, span = false, compact = false, showDate = true, here = "" })` | `<article class="ev" id="e-{id}" data-ev="{id}" data-sheet data-r data-a data-k data-kg data-day data-month="2026-10 2026-11" data-s data-e [data-inst="s:e,…"] [data-days] [data-run="{end_date}"] [data-end-unknown="1"] [data-time-unknown="1"] data-t (morning afternoon evening late allday) [data-pl] [data-se] data-free data-q [data-cancelled="1"]>` with `.ev-when` (date · `<time datetime>` range, `.ev-status[data-status]`), `.ev-body` (`.ev-meta`: sheet badge, `.ev-kind`, status badge; `h3.ev-title a[href="{root}whats-on.html?e={id}#e-{id}"][data-open-event="{id}"]`; `.ev-where` (place link + area, or location_text, or "Place not listed"); `.ev-sum`; `.ev-tags`; `details.ev-more` = the no-JS body: verbatim description, cost, tickets, official page, series link, source line) and `button.star[data-star][data-star-kind="e"]`. Only one card per page carries `id="e-{id}"`. An event record with several instances spans them in one card. `here` = a place id: on that place's page the card omits the place link. |
| `eventRow(root, instance)` | `<li [data-sheet]><a href="…whats-on.html?e={id}#e-{id}" data-open-event><time>7:00<small>PM</small></time>{mark}<span><span class="t">Title</span><span class="w">Sat, Oct 24 · Place</span></span></a></li>`, inside `<ol class="tonight">` (runs print "Through …") |
| `eventList(root, instances, { groupBy: "day"\|"month"\|"none", headingLevel = 3, showDate })` | `h{n}.sub-h` per day or month + `.grid` of cards (anchors on the first card of each event) |
| `whenText(instance)`, `monthsOf(event)` | plain text; month keys |
| `placeCard(root, place, { headingLevel = 3, anchor = false, summary = true, meta = true, here = "" })` | `<article class="card place" [id="p-{id}"] data-place data-sheet data-r data-a data-k data-ks data-g data-t data-free data-st [data-sig] [data-era] [data-ll="lat,lng"] data-q>` plate · `.card-body` (`.card-kicker`, `h3.card-title a.stretched → places/{id}.html`, `.card-status`, `.card-sum`, `.card-meta` hours · price) · star kind `p` |
| `placeRow(root, place, { note })`, `placeFacts(root, place)`, `placeWhere(place)` | `li.row.place-row` (inside `ul.rows`); facts rows for `c.facts`; "address · area" |
| `stayCard(root, stay, { headingLevel, anchor, summary, features = 4, here })` | `<article class="card stay" [id="s-{id}"] data-stay data-sheet data-r data-a data-k data-f="{features}" data-st [data-h="1"] [data-ll] data-q>` plate · kicker · `h3 a.stretched → stays/{id}.html` · `.card-brand` · status · `.card-sum` · `.card-feats` (words) · star kind `s` |
| `stayRow(root, stay, { note })`, `stayFacts(root, stay)` | `li.row.stay-row`; facts rows |
| `experienceCard(root, x, { headingLevel = 3, anchor = true, summary = true })` | `<article class="card exp" id="x-{id}" data-x data-sheet data-r data-a data-k data-kg data-t data-free data-st [data-dp] [data-ll] data-q>` plate · kicker · `h3.card-title a[href="{root}experiences.html?x={id}#x-{id}"][data-open-experience="{id}"]` · `.card-op` · `.card-departs` · status · `.card-sum` · `.card-meta` (duration · price) · `details.card-more` (quote with cite, details facts, booking link, source line) · star kind `x` |
| `experienceRow(root, x, { note })`, `experienceFacts(root, x)`, `departsHtml(root, x)` | `li.row.exp-row` with `data-open-experience`; facts rows; "Departs from <a>Place</a>" |
| `areaCard(root, area, { headingLevel, anchor, summary })`, `areaCounts(area)` | `<article class="card area" [id="a-{id}"] data-area data-sheet data-r [data-k] data-q>` plate · kicker · `h3 a.stretched → areas/{id}.html` · `.card-sum` · `.card-known` · `.card-meta` counts |
| `miniMap(root, lat, lng, { sheet, n, label, halfWidthM = 900 })` | `.mini-map[role=img]` > `<svg viewBox><use href="{root}assets/map/basemap.svg#bm"/></svg>` + `.mini-labels` + `span.pin.pin-place[data-sheet]` (plain SVG, no JS); no basemap or off it → `p.coord-line` ("27.9497° N, 82.4588° W"); no coordinates → `p.unk.mini-map-none` |
| `areaMap(root, [{ lat, lng, kind, sheet, n }], { label, minHalfM, center, ratio, cls })` | a crop fitting every point, `span.pin.pin-{kind}` each; `""` without a basemap |
| `coordLine(lat, lng)`, `directions(lat, lng, { mode })`, `directionsTo(rec, { mode })`, `where(rec)`, `mapStatus(rec)`, `nearbyOf(lat, lng, m, opts)`, `distLabel(m)`, `meta` | coordinate line; `{ apple, google }` (mode walking/driving/transit or null = the reader picks); by coordinates, else the address (Google only), else null; `"on"\|"off"\|"none"`; the honest badge; nearby + `label`; "350 m" / "1.2 mi" (straight line: say so) |
| `heritageBlock(root, rec, { headingLevel = 2, id = "heritage", title })` | `<section class="heritage" id="heritage">`: facts (built, architect, style, era), `ul.designations` (linked when a url), story (our words), "Visiting today", heritage source line; `""` without a block |
| `timelineItem(root, t, { headingLevel = 3 })`, `designationLine(d)`, `eraLabel(era)` | `<li class="tl-item" id="tl-{id}" data-era [data-r data-sheet]>` year, title, text, "At <places>", source line |

To add a component, export it from a factory in `build/components/*.mjs`; `build.mjs` merges every factory into `ctx.cards`
(a new factory file needs one import line in `build.mjs`: ask E1).

## 7. Markup and CSS

- **Partials:** `site/css/NN-name.css`, concatenated in name order into `assets/site.css`; `tokens.css` is served separately (its no-JS
  dark block is generated when missing). The lint fails on a color literal outside `tokens.css`, a `font-size` under 12px / 0.75rem, a badly
  named partial; it warns on an undefined `var(--x)`. **Today's partials are a mechanical port of Cincy Week's** (00-base 10-shell 20-content
  40-events 50-map 80-dialogs 81-event-dialog 86-faq 90-pages 99-print) plus `21-records.css` (cards, plates, rows, heritage, timeline).
  The design agent re-skins them. Suggested ranges for lane partials: 30 home, 31 region, 41 trip, 45 whats-on, 51 map page,
  55 things-to-do/outdoors/eat-drink, 60 experiences, 62 history, 64 passages, 70 stay, 72 areas, 74 detail pages, 76 visit, 85 about.
- **Tokens:** `tokens.css` must define, in the light (`:root[data-theme="light"]`) and dark (`:root[data-theme="dark"]`) blocks,
  `--sheet-<region>`, `-ink`, `-on`, `-tint`, `-edge` for all six regions (the build fails otherwise), `--theme-color`, and in `:root`
  `--fonts-href` and `--fonts-preload`. Today's sheet inks are placeholders.
- **Sheet scope:** `[data-sheet="tampa|stpete|beaches|clearwater|around|daytrips"]` sets `--ink-fill --ink-text --ink-on --ink-tint --ink-edge`;
  components read only those. A sheet's ink marks its identity only. Classes `.sheet-badge .sheet-dot .sheet-u .sheet-head`.
- **Shared vocabulary (unchanged from Cincy Week):** `.page-head .kicker .lede .dek .crumbs .oxford .sec-num .section .sec-head .sub-h .prose
  .facts .fact .source-line .callout .tone-{tip,warn,org} .btn .btn-{primary,secondary,ghost,river,sm} .btn-row .star .badge
  .badge-{live,soon,started,past,free,warn,out,unconfirmed} .chip .chip-row .card .grid .grid-2 .grid-3 .stretched .toolbar .field .select
  .view-toggle .result-count .empty-state .table-wrap table.data .toc .toc-mobile .pagenav .count .count-pill .sr-only .label .tnum .muted
  .faint .unk .i .bullet .halftone .h-anchor .spaced .js-only .tonight .ev .ev-* .mini-map .pin .map-label .modal .faq`. New: `.card-*
  .plate-type .pt-code .pt-name .photo .photo-fig ul.rows li.row .coord-line .head-actions .heritage .designations ol.timeline .tl-* ol.stops
  .trip-card .tc-* .tripbtn .wordmark .wm-top .wm-main`.
- **Sprite** (inline once per page): icons `#i-<name>`, sheet marks `#b-<region>` (a chart-label cartouche with the chart code), the mark
  `#mark`. Icons: search star sun moon home calendar map pin clock users bed tram hood utensils help news info chev-r chev-d arrow-r arrow-up
  ext check x sliders share download plus minus locate warn walk fit grid list github wc spark drop bag eye link light **anchor landmark
  compass flag daymark wave boat ferry fish palm umbrella ticket fork-knife glass trail binoculars bus plane parking car bike phone route**.
  Chart symbols: anchor = stay, landmark = historic site, flag = event, daymark = experience departure, pin = a place.
- **No-JS:** `<html>` starts `.no-js`; the boot script swaps it to `.js`. Every list is server-rendered; `.js-only` controls hide without JS.
- **Targets and text:** 44px targets on touch, nothing under 12px, every state a word ("Temporarily closed", "Through Jan 10", "Cancelled").

## 8. The shell and what the client (E2) wires

The shell (`build/core/shell.mjs`) renders, around every page body: the boot script, the sprite, the topbar (`.brand` with `#mark` +
`wordmark()`, `[data-live-pill]` → `whats-on.html?when=today` with `[data-live-text]` "On today" (hidden until the client shows it),
`.searchbtn[data-search-open]` with `[data-k-hint]`, `.tripbtn` → `trip.html` with `.count[data-trip-count]`, `.theme-toggle[data-theme-toggle]`,
`.nav-toggle[data-nav-toggle][aria-controls=sidebar]`), `.scrim[data-scrim]`, the sidebar `nav.sidebar#sidebar` (`a.trip-card[data-trip-card]`
with `[data-trip-card-title]` and `[data-trip-card-next]`, five numbered groups, the six sheet items `a.nav-link.sheet[data-sheet]` with mark,
name and "Sheet 1 · 9 places · 5 events", `span.nav-meta[data-trip-count]` on My Trip), crumbs, the TOC, prev/next, the footer (the lines
"Independent guide. Not affiliated with any tourism office, venue or operator." and "Every entry links to its source.", the map attribution
when `map.json` has one), the dock (`What's On · Map · Trip [data-trip-count] · Search`), `button.to-top[data-to-top]`, the toast
(`[data-toast] [data-toast-text] a[data-toast-link]` → trip.html), and three modals:
`#search` (`[data-search-input] [data-search-results] [data-search-status]`), `#event-dialog` (`aria-labelledby="evd-title"`,
`[data-evd-kicker]`, `.modal-body.evd[data-evd-body]`) and `#experience-dialog` (`aria-labelledby="xd-title"`, `[data-xd-kicker]`,
`.modal-body.evd.xd[data-xd-body]`). Modal markup: `<div class="modal" id role="dialog" aria-modal="true" data-modal><div class="modal-backdrop" data-close></div><div class="modal-panel">…</div></div>`.

`<html class="no-js" data-root="" | "../" data-page="whats-on" | "places/florida-aquarium" data-v="<data hash>" [data-now] data-theme>`,
`<body data-features="a b">` (each → `site/js/features/<name>.js`, which must exist). `assets/js/main.js` is included only when
`site/js/main.js` exists; `assets/favicon.svg` only when `site/favicon.svg` exists.

**The client wires (E2), by attribute:**
- Stars: every `button.star[data-star="<id>"][data-star-kind="e|x|p|s"]` (aria-pressed, label "Add “…” to My Trip" / "Remove …"),
  `[data-trip-count]` badges, the trip card, the toast. Storage keys: `tbc-theme tbc-rail tbc-trip tbc-prefs tbc-seen-shared tbc-debug`
  (`tbc-trip` holds `{ v, e: [], x: [], p: [], s: [] }`). Share: `trip.html#e=<codes>;x=…;p=…;s=…` (`site/js/lib/share.js tripHash / decode`).
- Dialogs: `[data-open-event="<id>"]` → `#event-dialog` (push `?e=`; `?e=` on load of whats-on.html opens it); `[data-open-experience="<id>"]`
  → `#experience-dialog` (`?x=` on experiences.html). Links keep their deep-link hrefs, so without JS they land on the card.
- Live states: any element with `data-s`/`data-e` gets `data-status` (`upcoming soon live started past`) and a word in its child
  `[data-status]`; `data-inst` = several days; `data-end-unknown="1"` never "Now" ("Started"); `data-time-unknown="1"` gets no state;
  **`data-run` (a long run) never "Now"** (say "On through <date>" or nothing); `data-cancelled="1"` gets no state.
- Search palette on `[data-search-open]`, ⌘K, Ctrl K, `/`; filters on `input[data-filter-q]`, `select[data-filter]`, `[data-result-count]`,
  `[data-view]` (from `c.toolbar`). The clock honors `<html data-now>`.

**Pure libraries** (`site/js/lib/`, no DOM, shared by the build, the client and node:test):
- `time.js`: `nyToEpoch nyParts offsetAt expand (RUN_MAX_DAYS = 14) festivalDay bucket status relTime STATUS_LABEL BUCKETS SOON
  fmtTime fmtRange fmtRangeCompact fmtDay fmtDayLong fmtDate fmtDateY fmtDateRange fmtDowRange fmtMonth fmtMonthShort fmtThrough isoLocal
  monthKey isWeekend WHEN whenRange(when, now) → [firstDate, lastDate] (today · weekend = Fri–Sun, from today when it is Fri–Sun · week =
  today + 6 · month = to the month's end) addDays dateRange daysBetween weekday toMinutes`.
- `share.js`: `code encode tripHash({ e, x, p, s }) decode(hash, codeToId) → { e, x, p, s, unknown } codeTable TRIP_KINDS TRIP_KIND_LABEL CODE_RE fnv1a`.
- `search.js`: `norm terms prepare score search group mark KINDS GROUP_ORDER SEE_ALL`.
- `filters.js`: `parse serialize matches activeCount defaults` (unchanged from Cincy Week).
- `text.js`: `esc paras parasHtml initials truncate hostOf slugify aliasKey roomText`. `geo.js`: `haversine walkMinutes METERS_PER_DEG_LAT
  project unproject metaOf bboxContains onMap crop compass cluster fitScale clampView` (verbatim from Cincy Week).

## 9. JSON outputs, deep links and search entries

**Core JSON** (`build/core/client-data.mjs`; exact shapes in its header; all `v: 1`, fetched lazily with `app.data(name)`):
- `assets/data/events.json` `{ v, tz, window, regions: { id: { n, s, c, no } }, areas: { id: { n, r } }, places: { id: { n, a, ll } },
  series: { id: { n, w } }, events: [{ id, x, t, k, kg, r, a, pl, lt, ll, se, c, f, u, tk, src, st, fe, tg, tp, tt, sm, ck, ed, i: [[day, s, e, flags]] }] }`,
  flags `1 endUnknown · 2 timeUnknown · 4 allDay · 8 ongoing · 16 lateNight · 32 run`.
- `assets/data/event-text.json` `{ v, d: { eventId: description } }` (verbatim; load on first dialog or .ics).
- `assets/data/experiences.json` `{ v, experiences: [{ id, x, n, op, k, kg, r, a, tp, dp, dt, ad, ll, u, bu, ph, du, pr, f, sc, ss, ag, sm, q, qs, st, sn, src, as, ck, i }], places: { id: { n, u } } }`.
- `assets/data/places-lite.json` `{ v, regions, areas, places: [{ id, x, n, k, ks, g, tp, r, a, ll, st, sg, h, f, u, i }] }`.
- `assets/data/stays-lite.json` `{ v, stays: [{ id, x, n, k, b, co, r, a, ll, ft, st, h, u, i }] }`.
- `assets/data/search.json` `{ v: 1, items: [{ k, id, t, s, u, r?, g?, i?, st?, en? }] }`.
A page module's `data(ctx)` keys must be unique (`assets/data/<lane>-<name>.json`); the five above and `search.json` are reserved.

**Query parameters** (`PARAMS` + `paramValues(db)` in `build/nav.mjs`). The crawler fails an internal link or search `u` with an unknown key or a
value that names nothing. List params take comma-separated values; `k` takes a group id or a single kind (a group id wins when a word is both).

| Page | Keys (values) |
|---|---|
| whats-on.html | `month` (`db.months` keys "2026-10") · `day` (a `db.days` date) · `series` (series ids) · `r` (region ids) · `a` (area ids) · `k` (EVENT_GROUP ids or EVENT_KINDS) · `free=1` · `q` · `when` (`today weekend week month`) · `star=1` · `view` (`list map`) · `e` (event id) |
| things-to-do.html | `r` · `a` · `k` (PLACE_GROUP ids or PLACE_KINDS) · `t` (TOPICS) · `q` · `free=1` · `view` (`list map`) |
| experiences.html | `r` · `k` (EXPERIENCE_GROUP ids or EXPERIENCE_KINDS) · `t` · `q` · `x` (experience id) |
| stay.html | `r` · `a` · `k` (STAY_KINDS) · `f` (STAY_FEATURES) · `q` · `view` (`list map`) |
| outdoors.html | `r` · `k` (place groups or kinds) · `q` |
| history.html | `era` (ERAS) · `r` · `q` |
| eat-drink.html | `r` · `a` · `k` (place groups or kinds) · `tag` (tags on places, or TOPICS) · `q` |
| map.html | `layers` (`places stays experiences events heritage transport`) · `r` · `focus` (`place: stay: experience: event: area: transport:` + an id) |
| areas.html | `r` |
| faq.html | `q` · `topic` (`h.slugify(faq.topic)`) |
| trip.html | hash only: `#e=<codes>;x=…;p=…;s=…` |

Every other page takes no query string. Detail URLs: `places/<id>.html`, `stays/<id>.html`, `areas/<id>.html`; dialogs:
`whats-on.html?e=<id>#e-<id>`, `experiences.html?x=<id>#x-<id>`.

**Search entries.** The core adds a default entry for **every record** (`build/core/search.mjs coreEntries`); a page module's `search(ctx)`
entry with the same `k` + `id` wins (enrich, don't drop). Kinds and default URLs (the anchors must exist, §3):
`pl` places/<id>.html · `st` stays/<id>.html · `ex` experiences.html?x=<id> · `ev` whats-on.html?e=<id> (`st`/`en` only for timed, non-run
events) · `se` whats-on.html#s-<id> · `ar` areas/<id>.html · `rg` <region page> · `fq` faq.html#fq-<id> · `tr` getting-around.html#t-<id> ·
`tl` history.html#tl-<id> · `pg` nav pages (added by the build) and passages.html#r-<route id> (id `route-<id>`). `r` is a region id, `g` extra
keywords, `i` an image path.

## 10. Tests

- `npm test` = `node --test tests/*.test.mjs` (about 20 s). Build tests copy the repo into a temp folder with `tests/fixtures/mini` as `data/`.
- `tests/helpers.mjs`: `copyRepo({ data })`, `build(dir, env)` (deterministic `SOURCE_DATE_EPOCH`), `read`, `write`, `json`, `cleanup`,
  `editData(file, fn)(dir)`, `edit(file, fn)(dir)`, `extraPage(body, extra)` (a `places/zz-extra.html` page for crawler tests), `hashTree`, `fx(file)`, `REPO`, `CONFIG`.
- The fixture: 2 region records (the other four are synthesized), 7 area records (all 45 areas exist in `db`), 13 places (2 with heritage,
  1 temporarily closed), 4 stays (1 historic), 3 experiences (1 seasonal), 8 events (a 12-day fair, a 3-occurrence market, a long run,
  a cancelled one, one resolved through an alias), 2 series, 4 timeline entries (one linked to a stay), 2 transport, 2 FAQs, 2 facts,
  0 media, 1 route, `aliases.json`, empty `images.json`, no `map.json`. Every record's `notes` says FIXTURE; summaries say "Fixture".
- `tests/build.test.mjs` (E1): every page and asset, the search index, the sitemap, the 404, the footer lines, the event and experience
  card contracts, the client JSON, a byte-identical double build, a failed build leaving `docs/` untouched, `TBC_OUT`, missing optional
  assets, and the BROKEN table (47 mutations that must each fail with a named message and write nothing). `tests/schema.test.mjs` checks
  the build accepts every research shape; `tests/minimap.test.mjs` builds with a synthetic basemap.

## Changelog

- **2026-09-27 · E1** first version (fork of Cincy Week's engine, destination domain).
