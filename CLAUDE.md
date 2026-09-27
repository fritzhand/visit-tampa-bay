# CLAUDE.md — operating manual for Tampa Bay Chartbook

## What this is

**Tampa Bay Chartbook** (https://fritzhand.github.io/visit-tampa-bay/) is an independent, source-linked visitor's guide to
Tampa Bay: where to stay, what to see and do, what is on (Sep 28, 2026 – Apr 30, 2027), where to eat, how to get around, and
where the region's history happened. Every record links to the page that states its facts. Owner: Jeremy Fritzhand.

It is **not** Visit Tampa Bay, Visit St. Pete/Clearwater or any official tourism body, and never looks or reads like one:
its own name and mark, and the footer line "Independent guide. Not affiliated with any tourism office, venue or operator."
(`INDEPENDENCE` in `build/core/shell.mjs`, also on About). The repository is called `visit-tampa-bay`; the product is not.

It is a zero-dependency static site: `data/*.json` → `node build.mjs` → `docs/` (GitHub Pages). The engine is a fork of
`fritzhand/cincy-week` (`/home/user/cincy-week`: fail-before-write validation, the crawler, the shell, ⌘K search, stars, the
SVG basemap, the tests, the tone rules); the history and the citation standard come from `fritzhand/history-of-tampa`.
`SPEC.md` is the product spec. The brand is **"Chart & Label"**: a skipper's chartbook (one numbered **sheet** per stretch of
coast, chart linework, chart symbols as icons) printed with the gold and ornament of an Ybor City cigar-box label. Editions:
the **Day chart** (light, default) and the **Night chart** (dark).

The six sheets (regions; `research/tools/schema.mjs REGIONS`, pages in `build/nav.mjs REGION_PAGES`):

| id | n | code | name | page |
|---|---|---|---|---|
| `tampa` | 1 | TP | Tampa | tampa.html |
| `stpete` | 2 | SP | St. Petersburg | st-petersburg.html |
| `beaches` | 3 | GB | Gulf Beaches | gulf-beaches.html |
| `clearwater` | 4 | CW | Clearwater & North Pinellas | clearwater.html |
| `around` | 5 | AB | Around the Bay | around-the-bay.html |
| `daytrips` | 6 | DT | Day Trips | day-trips.html |

Every located record has an `area` (45 fixed ids, SPEC §4.1, `research/tools/schema.mjs AREAS`); its sheet follows from the area.

**Status (Sep 27, 2026): the engine is built; the data and the pages are being built.** Landed: the build engine (E1:
`build.mjs`, `build/`, the fixture, the build tests), the client runtime (E2: `site/js/`, its tests, this manual), and in
parallel the design system (`design/`, `site/css/tokens.css`, fonts) and the basemap (`scripts/build-basemap.mjs`,
`site/map/`, `data/map.json`). Research agents are writing `research/<slice>/` (23 slices, `research/README.md`). Next: the
merge (`scripts/merge-research.mjs`, not written yet) replaces `data/` (today a copy of the test fixture: every record's
`notes` says FIXTURE), then the page lanes replace the stubs in `build/pages/`, then images, QA and integration. Update this
paragraph when a phase lands.

## The rules that never bend

1. **Never invent a fact.** No invented name, address, hour, price, date, time, phone, count, year, architect, quote or
   claim. Every record carries `source_url` (a page that was actually read and states the facts) and `checked` (the date it
   was read). Unknown is `null` (or the key left out), never "TBA", "TBD", "N/A", "Varies", "See website" or a guess: the
   build fails on those. Pages print unknowns as unknowns ("Hours not listed", "Time not listed", "end time not listed",
   "Place not listed", "Price not listed", "Not on the map: no coordinates listed"). Estimates say so ("straight-line distance").
2. **Closed is a fact too.** Hurricanes Helene and Milton (Sep–Oct 2024) closed or damaged many Pinellas beach properties;
   businesses open and close. `status` (`open seasonal temporarily-closed opening-soon closed`) reflects what the source says as
   of `checked`, with `status_note` for anything but open. A place closed for good is kept out, or kept as `closed` only when a
   history page needs it.
3. **Our words are plain; their words are quoted.** `summary` is our own one or two factual sentences: no marketing language,
   no superlatives unless attributed ("The Columbia says it is Florida's oldest restaurant"). `quote` is verbatim from the
   official page, 40 words at most, always attributed (`quote_source` when it is not `source_url`); an event `description` is
   verbatim from its source (80 words at most). Plain text only: HTML tags and entities (`&amp;`, `&#8217;`) fail the build.
4. **https only.** `http://` fails the build. External links open in a new tab and say so (the crawler checks).
5. **Color literals live only in `site/css/tokens.css`.** No `#hex`, `rgb()`, named colors in partials or in generated
   `style=""`. A sheet's ink marks its identity only. Nothing under 12px; touch targets ≥ 44px on phones; every state is a
   word, never color alone ("Temporarily closed", "Through Jan 10", "Cancelled", "Now"); WCAG AA in both editions.
6. **`docs/` is generated.** Never hand-edit it. Run `node build.mjs` and commit `docs/` with your change.
7. **Never rename an id.** Ids are in URLs (`places/<id>.html`, `?e=`, `?x=`), in shared trip links (5-character codes derived
   from the id) and in readers' saved trips. Ids are unique **across** places, stays, experiences, events, series, areas and
   regions (one URL and code space). Close or cancel instead of deleting; add instead of renaming. `build/core/*` contracts are
   only extended (the Changelog at the end of `build/CONTRACTS.md` records every change).
8. **Images are never hotlinked and are rights-cleared**: Wikimedia Commons (public domain, CC0, CC BY, CC BY-SA, U.S.
   government works) or the history-of-tampa archive, each with creator, license and a credit line. No photos lifted from a
   hotel, venue or operator site. A record without a cleared image gets a typographic plate (its chart code and name), never a
   stock photo.

## Maintaining the site

### The loop (every change, however small)

1. **Find the record.** The id is in the page URL: `places/<id>.html`, `stays/<id>.html`, `areas/<id>.html`,
   `whats-on.html?e=<event id>`, `experiences.html?x=<experience id>`, `whats-on.html#s-<series id>`, `history.html#tl-<id>`,
   `getting-around.html#t-<id>`, `faq.html#fq-<id>`, `passages.html#r-<route id>`. Then `grep -n '"id": "<id>"' data/*.json`.
2. **Check the fact at its source** (the business's or organizer's own page, not a listing or a repost). No source, no change.
3. **Edit `data/<file>.json`.** Point `source_url` at the page that now states the fact, set `checked` to today, and record why in
   the record's `notes` (never rendered), e.g. `"notes": "2026-10-20: start 18:00 → 18:30 per the organizer's page"`.
4. **Build and read every line:** `node build.mjs`. Errors name `data/<file>.json#<id>.<field>`; fix them and rebuild. `docs/` is
   only replaced when there are no errors. Warnings are grouped; a new one is worth reading.
5. **Test:** `npm test` (about 25 s).
6. **Look:** `npm run dev`, open the page at http://localhost:8000/visit-tampa-bay/ (add `?now=2026-10-24T19:30` for the "Today"
   and "Now" states, `?theme=dark` for the Night chart), or run the audit:
   `NODE_PATH=/opt/node22/lib/node_modules node scripts/shots.mjs --pages whats-on,index --states` (overflow, text under 12px,
   targets under 44px, console errors; PNGs and `audit.json` in `.cache/shots/`).
7. **Commit `data/` and `docs/` together** on `main` (`test.yml` fails when `docs/` was not rebuilt). Publishing follows the push.

`data/*.json` is the source of truth once the merge has run. `research/` is then a frozen snapshot kept for provenance: correct
a record in `data/`, never by re-running the merge.

### Correct an event (time, date, place, price, status)

Fields (`research/SCHEMA.md` → events; enforced by `build/core/schema.mjs`): `date` `YYYY-MM-DD` inside the window
(`dataWindow` in `site.config.json`: 2026-09-28 → 2027-04-30); `start`/`end` `HH:MM`, 24-hour New York time (`end: null` when the
source gives none: pages say "end time not listed" and never "Now"; an end before the start means after midnight and must be
≤ 06:00; a start 00:00–04:59 is listed under the night before); `time_text` for the source's own vague wording ("Gates open at
11 a.m."); `all_day: true` only when the source says so (then no times); `place` (a place id) or `location_text` (+ `area`,
`lat`/`lng`); `cost` (the source's words) and `is_free` (`true` only when the source says free, `false` when it names a price,
else `null`; never inferred from `cost`); `url`, `tickets_url`.
- **Several days:** `date` + `end_date`. A run of **14 days or fewer** (a fair, a festival weekend) is one listing per day with the
  same hours; a run **longer than 14 days** (an exhibition, a season) is **one** listing that prints "Through Jan 10" and never "Now".
  When hours differ by day, or the days are not consecutive, list them in `occurrences: [{ date, start, end }]`.
- **Cancelled or postponed:** `"status": "cancelled"` / `"postponed"`. Do not delete the record: its card and dialog say so, it
  leaves the counts and the "On today" pill, and saved trips and links keep working.
- **Changed at short notice:** update the fields and set `"status": "changed"` (a "Changed" badge). `tentative` when the source
  itself says the date is not final.
- An event with no `area` takes its place's; a `location_text` that matches a place's name or `aliases` (or `data/aliases.json`)
  gets that `place`.

### Add an event

Append to `data/events.json` (order does not matter; the build sorts):
```json
{
  "id": "guavaween-2026",
  "title": "Exact title from the source", "kind": "festival", "topics": ["nightlife"],
  "series": "guavaween", "date": "2026-10-24", "start": "16:00", "end": null,
  "place": null, "location_text": "Seventh Avenue, Ybor City", "area": "ybor-city",
  "cost": null, "is_free": null, "url": "https://…", "tickets_url": null,
  "description": "Verbatim from the source, 80 words at most, or null.",
  "summary": "Our one factual line.", "status": "scheduled", "featured": false, "tags": [],
  "source_url": "https://…", "also_sources": [], "checked": "2026-09-27"
}
```
- `id`: the title's slug plus the year or date (`lightning-vs-bruins-2026-10-10`), unique across every collection.
- `kind`: `festival parade fair concert sports theater comedy dance classical film exhibition holiday market food-drink run-walk
  cultural family tour fireworks boat-show convention talk other`. `featured: true` only for signature events.
- A recurring signature event (Gasparilla, Guavaween, the State Fair) also has a record in `data/series.json` (`months`, `when_text`
  as the source states it, `since`): the annual calendar on What's On.

### Add or correct a place (attractions, museums, parks, beaches, historic sites, venues, restaurants, bars…)

`data/places.json`: `id` (slug of the official name, dropping a leading "the"), `name`, `aliases`, `kind` and `kinds`
(`theme-park water-park zoo aquarium museum gallery science-center historic-site historic-district landmark performing-arts
music-venue arena-stadium sports park beach state-park nature-preserve garden trail island pier waterfront district shopping market
food-hall restaurant cafe-bakery bar brewery distillery-winery nightlife casino cemetery house-of-worship visitor-center
attraction`), `topics`, `area`, `address city state zip`, `lat lng geo_source`, `url phone`, `hours_text price_text` (the source's
words, short: they change), `is_free`, `summary`, `quote quote_source`, `signature` (only the region's defining places, sparingly),
`status status_note`, `accessibility parking_text`, `tags`, `source_url also_sources checked notes`.
- **Historic places** get `heritage: { built, architect, style, designations: [{ name, ref, year, url }], era, story, visiting,
  sources }`; `era` is `indigenous spanish frontier boomtown land-boom postwar modern`; `story` is 2–5 factual sentences in our
  words, every claim backed by a URL in `sources`.
- **Coordinates:** both or neither, inside the Tampa Bay box (26.9–29.0 N, 83.0–81.4 W) or the build fails;
  `node research/tools/geocode.mjs "<street address>"` (Census) or `--name "<name>" --near 27.77,-82.64` (OpenStreetMap), and check the
  matched text is this place. A place without coordinates prints "Not on the map" and gets a warning.

### Add or correct a stay

`data/stays.json`: `kind` (`hotel resort boutique-hotel historic-hotel extended-stay motel inn bed-and-breakfast hostel condo-hotel
casino-resort campground`), `brand` (the chain, "Independent" when the hotel says so, else null), `collection` (the flag),
`features` (only what the hotel's own page states: `beachfront waterfront bay-view pool spa fitness restaurant rooftop-bar
pet-friendly airport-shuttle cruise-shuttle golf marina casino all-suites kitchens free-breakfast free-parking ev-charging historic
adults-only accessible-rooms meeting-space`), `rooms` (int) and `opened` (year string) only when stated, `heritage` for historic
hotels. A hotel that is also a landmark (the Don CeSar, the Vinoy) is a **stay** with a `heritage` block, never also a place.

### Add or correct an experience (tours, cruises, water taxis, rentals, classes…)

`data/experiences.json`: `name`, `operator`, `kind` (`water-taxi ferry cruise dinner-cruise dolphin-tour sailing boat-rental
kayak-paddle fishing parasail-jetski airboat eco-tour snorkel-dive walking-tour ghost-tour food-tour drink-tour cigar bike-segway
trolley-bus-tour helicopter-air class-workshop animal-encounter adventure behind-the-scenes show other`), where it starts
(`departs_place`, a place id, or `departs_text` + `address`/`lat`/`lng`: the build fails without one), `url booking_url phone`,
`duration_text price_text schedule_text season_text ages_text` (the operator's words), `is_free`, `summary`, `quote`, `status`.
It opens in the experience dialog (`experiences.html?x=<id>`), with the departure place's page linked.

### Closures, hurricanes and seasons

- Temporarily closed (a storm, a renovation): `"status": "temporarily-closed"`, `status_note` says since when, why and what the
  source says about reopening ("Closed after Hurricane Milton (Oct 2024); reopening planned for early 2027, per …").
- Seasonal: `"status": "seasonal"` with the season in `status_note` (or `season_text` on an experience).
- Closed for good, already published: `"status": "closed"` with `status_note` (the build fails without one); its page stays and says
  Closed. The build warns on a closed place without a `heritage` block: keep it only when a history page needs it, and say so in `notes`.
- Reopened: `"status": "open"`, drop `status_note`, update `checked`.

### Other records

- **Areas and regions** (`areas.json`, `regions.json`): the fixed ids only; `name`, `lat`/`lng` (center), `kind`, `summary`, `known_for`
  (3–6 short noun phrases a source supports), `official_url`. The build always has all six sheets and all 45 areas (`record: false`
  when a file lacks one, with a warning).
- **Timeline** (`timeline.json`): `era`, `year`, `date`, `title`, `text` (1–3 factual sentences), `places` (place or stay ids),
  `media`. Rendered on history.html (`#tl-<id>`) and on the linked places' pages.
- **Transport** (`transport.json`): `mode`, `operator`, `regions`, `fare_text hours_text season_text`, `stops: [{ name, lat, lng, place,
  area }]`, `code` ("TPA"). **FAQ** (`faqs.json`): `topic`, `q`, `a` (our plain words, only what the source says). **Facts**
  (`facts.json`): `label`, `value`, `as_of`, `source`, `quote`.
- **Passages** (`routes.json`, build phase): `{ id, title, region, lede, stops: [{ kind: place|stay|experience|event, id, note }] }`,
  at least two stops, every stop a sourced record.

### Images

`data/media.json` holds the rights-cleared images (`license`: `public-domain cc0 cc-by cc-by-sa us-gov`; `credit`, `file_url` on
upload.wikimedia.org, `page_url` the Commons `File:` page, `subject_kind` + `subject`, `alt`). `python3 scripts/fetch-images.py` (Pillow;
incremental) downloads each subject's first media record once (a timeline entry's own `media` order first) into `.cache/img-src/`
(gitignored), writes `site/img/<kind>/<id>.webp` (480 px wide) and `<id>-lg.webp` (≤ 1200 px, when the source is larger), EXIF-rotated,
sRGB, metadata stripped (kinds `p` place, `s` stay, `a` area, `t` timeline, `x` experience, `r` region), and the manifest
`data/images.json` (`"<kind>/<id>": { file, w, h, lg?, credit, license, license_url?, page_url?, creator?, alt?, media }`), then build.
Flags: `--offline` (cache only), `--only p/<id>,a/<id>` (re-process those), `--retry-failed`, `--force` (re-render everything from the
cache), `--max-minutes N`. Wikimedia throttles this network hard: the script fetches standard-size thumbnails (1280px; an original
only when its thumbnail errors), one request at a time, honors Retry-After and backs off; an interrupted or throttled run keeps what it finished, reports the
rest as "deferred", and the next run resumes (`.cache/img-src/report.json` has the last run's details). A hand-picked primary image
goes in `PRIMARY` at the top of the script. The build fails on a manifest entry whose file is missing or that lacks a credit or
license, and never hotlinks.
**Takedown request:** delete the `media.json` record, run `python3 scripts/fetch-images.py --offline` (it drops the entry and the files),
build, commit.

### The clock and the live states

Nothing needs rebuilding for "Today" or "Now": the client reads the clock. Test any moment with `?now=2026-10-24T19:30` (New York
time) on localhost, or anywhere after `localStorage.setItem("tbc-debug","1")`. The words (`site/js/lib/status.js`): "Now" only when
both ends are published; no end time → "Started" until the end of its day; no start time → day words only ("Today", "Tomorrow",
"This weekend"); all day → "Today"; a long run → nothing while it runs ("Through Jan 10" is on the card); cancelled and postponed →
nothing. The topbar pill says "On today · n" and links to `whats-on.html?when=today`.

### Research and the merge

Each `research/<slice>/<slice>.json` holds final-shape records (`research/SCHEMA.md`, machine definition
`research/tools/schema.mjs`); `node research/tools/check-slice.mjs <slice>` (or `--all`) validates them. Shared ids for big venues
and attractions are listed in `research/README.md`. The merge (`scripts/merge-research.mjs`, to be written) unites the slices into
`data/` (same-id records merge; ids must be unique across collections), geocodes gaps and logs every decision. After it runs, never
touch `research/`.

### What lives in .cache/ (gitignored, never committed)

`out-*/` (private builds: `TBC_OUT=.cache/out-<you>`), `shots*/` (audit screenshots), `tiger/` (Census TIGER/Line downloads for
`scripts/build-basemap.mjs`), basemap review PNGs. None of it is needed to build the site.

## Commands

```sh
node build.mjs                      # build → docs/ (exits 1, listing every problem, and leaves docs/ untouched on failure)
npm test                            # node --test tests/*.test.mjs (unit tests, fixture builds, the BROKEN mutations, the client contract)
npm run dev                         # build, then serve docs/ at http://localhost:8000/ and /visit-tampa-bay/
NODE_PATH=/opt/node22/lib/node_modules node scripts/shots.mjs [--pages a,b] [--now 2026-10-24T19:30] [--states] [--full]

# a private build next to docs/ (for trying something without touching docs/, or several people at once)
TBC_OUT=.cache/out-me node build.mjs
TBC_OUT=.cache/out-me PORT=8124 node scripts/serve.mjs         # http://localhost:8124/visit-tampa-bay/
TBC_OUT=.cache/out-me NODE_PATH=/opt/node22/lib/node_modules node scripts/shots.mjs --pages whats-on --states

node research/tools/check-slice.mjs <slice> | --all            # validate research
node research/tools/geocode.mjs "<address>"                    # or --name "<name>" --near <lat,lng>
node scripts/build-basemap.mjs [--fetch] [--check]             # Census TIGER → site/map/basemap.svg, region.svg, data/map.json
node design/tools/build-tokens.mjs && node design/tools/contrast.mjs   # the design system's tokens and their contrast check
```
**`build/CONTRACTS.md` is the exact API reference** (page modules, `ctx`, `db`, components, markup, the client `app`, JSON
outputs, deep-link values, tests). Read it before coding a page lane. Pages use ES modules: open them over http
(`npm run dev`), not `file://`.

## How the site is built

```
site.config.json        siteName, siteTagline, siteBase, pathPrefix (/visit-tampa-bay/), repo, author, timezone,
                        dataWindow {start,end}, analyticsId (empty = no analytics)
data/*.json             the single source of truth: regions areas places stays experiences events series timeline transport
                        faqs facts media routes (arrays) + aliases images map (objects)
build.mjs               orchestrator: config → load+validate → tokens/CSS lint → page modules → render into docs.tmp/ → crawl
                        → atomic swap to docs/
build/nav.mjs           the navigation: NAV (5 numbered sections), REGION_PAGES, DETAIL_FOLDERS, DOCK, PARAMS + paramValues
build/core/*.mjs        engine: util icons vocab load schema time components shell images seo search crawl write client-data
build/components/*.mjs  record renderers: event-card place-card stay-card experience-card area-card mini-map heritage
build/pages/*.mjs       one module per page family (stubs until the lanes land); files starting with "_" are helpers
site/css/tokens.css     the only file with color/font literals (fonts: site/fonts, self-hosted, OFL)
site/css/NN-*.css       partials, concatenated in lexical order → docs/assets/site.css
site/js/main.js         client entry (module): core init + dynamic import of site/js/features/<name>.js
site/js/core/*.js       client runtime, wired by attribute on every page (the boot payload: 30 KB gzipped budget)
site/js/views/*.js      core-provided page views loaded on demand (views/trip.js: My Trip)
site/js/lib/*.js        pure libraries shared with the build and node:test (no DOM)
site/map/               basemap.svg (<g id="bm">) and region.svg, token-themed, from Census TIGER/Line (public domain)
site/img/<kind>/        downloaded, rights-cleared images (data/images.json is the manifest)
research/               the research slices (final-shape JSON, read-only provenance) and their tools
design/                 the design system's sources: palette, tokens, brand SVGs, specimen, tools
tests/                  node:test suites + tests/fixtures/mini (the fixture every build test uses)
docs/                   GENERATED — what Pages serves (docs/assets holds css, js, fonts, img, map, data/*.json)
```

Pages (`build/nav.mjs`): **1 Plan** Overview (index), What's On (whats-on, events with `?e=` dialogs), Map, My Trip (trip) ·
**2 Sheets** the six region pages · **3 Explore** Things to do, Experiences & tours (`?x=` dialogs), Beaches & outdoors, History &
heritage, Eat & drink, Passages · **4 Stay** Where to stay, Areas & towns · **5 Visit** Getting around, When to visit, FAQ, About &
sources. Detail pages: `places/<id>.html`, `stays/<id>.html`, `areas/<id>.html` (every record has one). Phone dock: What's On ·
Map · Trip · Search.

## Who built what (and who maintains it now)

Every file's header names its owner. During the build phase the lanes own disjoint files (`build/CONTRACTS.md` §2); after the
integration pass the maintainer owns every file.

| Built by | Files |
|---|---|
| **E1 · Build engine** | `build.mjs`, `build/nav.mjs`, `build/core/*`, `build/components/*`, `build/pages/_stub.mjs` and the stubs, `build/CONTRACTS.md`, `site.config.json`, `package.json`, `site/js/lib/{time,text,share,search,filters,geo}.js`, `scripts/{serve,shots}.mjs`, `tests/{build,time,filters,search,share,schema,minimap}.test.mjs`, `tests/helpers.mjs`, `tests/fixtures/mini/*`, `.github/workflows/*`, the mechanical CSS port in `site/css/` |
| **E2 · Client runtime** | `site/js/main.js`, `site/js/core/*`, `site/js/views/*`, `site/js/lib/{status,facets,trip,ics}.js`, `tests/{client,status,facets,trip,ics}.test.mjs`, the client-data additions in `build/core/client-data.mjs`, this `CLAUDE.md` |
| **Design system** | `design/*`, `site/css/tokens.css` and the re-skinned partials, `site/fonts/*`, `site/favicon.svg`, `site/img/brand/*`, `site/og*.png`, `wordmark()`/`MARK` markup in `build/core/icons.mjs` |
| **Basemap** | `scripts/build-basemap.mjs`, `site/map/*`, `data/map.json` |
| **Research** | `research/<slice>/*` (one agent and one verifier per slice), `research/tools/*`, `research/SCHEMA.md`, `research/README.md` |
| **Merge and images** | `scripts/merge-research.mjs`, `scripts/fetch-images.py`, `data/*.json`, `data/images.json`, `site/img/{p,s,a,t,x,r}/` |
| **Page lanes** (next) | one stub each in `build/pages/`, their CSS partial, their `site/js/features/<name>.js`, their `tests/<lane>.test.mjs` |

## Contracts (code against these)

The summary below is short; `build/CONTRACTS.md` has every signature and markup contract.

### Page modules — `build/pages/<name>.mjs`
```js
export function pages(ctx) {            // required; may return many pages (detail pages)
  return [{ path: "whats-on.html",      // a nav slug + ".html", or places/<id>.html · stays/<id>.html · areas/<id>.html
            nav: "whats-on",            // sidebar/dock item marked aria-current (detail pages: their folder's page)
            title, description,         // plain text; <title> = "What's On · Tampa Bay Chartbook"
            body: (root) => html,       // root = "" or "../" (404: pathPrefix); prefix every internal URL
            toc: [[id, label]],         // optional: TOC rail (≥ 1280px) + collapsed list (≥ 5 items)
            crumbs: [[label, href|null]], pagenav: { prev, next } | null,   // optional
            features: ["whats-on"],     // client modules: site/js/features/<name>.js (must exist)
            head, modals: (root) => html, jsonld: {…}, og: "og-tampa.png", noindex: false, pageClass: "" }];
}
export function search(ctx) { return [/* { k, id, t, s, u, r, g, i, st, en } */]; }   // optional; wins over the core's entry
export function data(ctx) { return { "assets/data/<lane>-<name>.json": obj }; }        // optional JSON outputs
```
Every page renders its own head (`ctx.c.pageHead`, the page's only `<h1>`); the shell adds the topbar, sidebar, crumbs, TOC,
prev/next, footer, dock, toast, the search palette, `#event-dialog` and `#experience-dialog`.

### `ctx` and `db`
`ctx = { config, db, vocab, nav: { NAV, NAV_SLUGS, NAV_LABEL, REGION_PAGES, DETAIL_FOLDERS, regionHref }, buildDate, buildDay,
h (esc attr paras extLink plural sortBy groupBy icon bullet(regionId) fmtDay fmtDate fmtDateY fmtTime fmtRange fmtDateRange fmtMonth
fmtThrough isoLocal …), c (pageHead({ sheet }) facts section callout chip sheetBadge starButton(id, title, { kind: e|x|p|s })
statusBadge eventStatusBadge unk emptyState toolbar resultCount sourceLine recordSource …), img (img plate figure credit …),
cards (eventCard eventRow eventList placeCard stayCard experienceCard areaCard miniMap areaMap heritageBlock timelineItem …),
map, seo, time, fail(where, msg), warn(where, msg, group) }`.
`db` holds every collection (all six regions and all 45 areas always), `byId` maps, derived fields (`region` from the area,
`place.events`, `place.nearbyStays`, `experience.departs`, `event.venue`, `event.live`, `event.run`, `timeline.links`…), event
`instances` (`{ id, ev, date, day, s, e, start, end, lateNight, endUnknown, timeUnknown, allDay, ongoing, run, through }`),
`runs`, `eventsByDay`, `onDay(date)`, `days`, `months`, `heritage`, `nearby(lat, lng, m)`, `code(id)`, `codeToId`, `counts`.

### Client (`site/js/main.js` → `init(app)` in every feature)
`app = { root, page, now(), today(), onTick(fn), when(name), isSimulated(), data(name), store, pref, trip: { has, kindOf, toggle,
add, remove, replace, clear, list, count, subscribe, refresh }, modal: { show, hide, current }, toast, status: { update, stateOf,
statusOf }, filter: { mount, get }, share, copyText, download, openEvent(id), openExperience(id), openSearch(trigger, q) }`.
- Wired everywhere by attribute (don't re-implement): stars `button.star[data-star][data-star-kind="e|x|p|s"]`, `[data-trip-count]`,
  the sidebar trip card; `[data-open-event]` / `[data-open-experience]` dialogs with `?e=` / `?x=`; live states on `[data-s][data-e]`
  (`data-inst data-days data-end-unknown data-time-unknown data-run data-cancelled`); the "On today" pill; ⌘K / Ctrl K / `/` search;
  the generic list filter on `[data-filter-list]` (controls `input[data-filter-q]`, `select[data-filter]`, `[data-filter-chip]`,
  `[data-result-count]`, `[data-view]`; state in the URL); the My Trip view on `[data-trip-root]` (share link
  `trip.html#e=<codes>;x=…;p=…;s=…`, calendar export, shared-trip import).
- Client JSON (`build/core/client-data.mjs`): `events.json` (instances `[day, s, e, flags]`, flags 1 end unknown · 2 time unknown ·
  4 all day · 8 ongoing · 16 late night · 32 long run), `event-text.json`, `experiences.json`, `places-lite.json`, `stays-lite.json`,
  `search.json` (kinds `pl st ex ev se ar rg pg fq tr tl`); every record carries its share code in `x`.
- Storage keys (all `tbc-*`, documented in `site/js/core/store.js`): `tbc-theme tbc-rail tbc-trip tbc-prefs tbc-seen-shared tbc-debug`.
- Pure libs (`site/js/lib/`, each with `tests/<lib>.test.mjs`): `time` (nyToEpoch, expand, whenRange, fmt*), `status` (liveState),
  `filters` (URL state), `facets` (card matching), `search`, `share` (codes, tripHash, decode), `trip`, `ics`, `text`, `geo`.

### Markup and CSS vocabulary
Cincy Week's shared classes stay (`.page-head .kicker .lede .card .chip .btn .facts .callout .toolbar .section .source-line .star
.badge-* .empty-state .tonight .ev .ev-* .modal …`); new: `.card-* .plate-type .pt-code .pt-name .photo .photo-fig ul.rows li.row
.coord-line .heritage .designations ol.timeline .tl-* ol.stops .trip-card .tc-* .tripbtn .wordmark` and the client's
`.evd-* .xd-* .trip-*` (CONTRACTS §8). Sheet scope: `[data-sheet="tampa|stpete|beaches|clearwater|around|daytrips"]` sets
`--ink-fill --ink-text --ink-on --ink-tint --ink-edge`; components read only those; tokens are `--sheet-<id>{,-tint,-ink,-on,-edge}`.
Classes `.sheet-badge .sheet-dot .sheet-u .sheet-head`. Sheet marks: `<svg class="bullet"><use href="#b-tampa"/></svg>` (via
`h.bullet`); icons `h.icon(name)` (chart symbols: anchor = stay, landmark = historic site, flag = event, daymark = experience
departure, pin = a place; an unknown icon name fails the build).

### Where things go
- CSS: the partial that styles that part (`build/CONTRACTS.md` §7 lists the lane ranges); tokens only. A new color or size is a new
  token in `tokens.css` (Day and Night blocks both).
- Client JS: `site/js/features/<name>.js` exporting `init(app)`, listed in the page's `features`; pure logic in `site/js/lib/<name>.js`
  with a `tests/<name>.test.mjs`. Features never import `../core/*`.
- Build: your `build/pages/*.mjs`; deep links use the params in `PARAMS` (`build/nav.mjs`) with values that exist; a new param is a
  one-line addition there plus its validator in `paramValues`.
- Tests: `tests/<area>.test.mjs` with `tests/helpers.mjs` (build tests run on a copy with `tests/fixtures/mini` as data).

## Data rules (for anyone adding or correcting a record)

Shapes: `research/SCHEMA.md`, enforced field by field in `build/core/schema.mjs` (unknown keys fail, listing the allowed ones;
`notes` is allowed everywhere and never rendered).
- ids `^[a-z0-9][a-z0-9-]*$`, unique per file **and across** places, stays, experiences, events, series, areas and regions; no two ids
  may share a 5-character share code (the build checks).
- `area` is one of the 45 area ids; the sheet follows from it (an area record in the wrong region fails).
- Dates `YYYY-MM-DD`; event dates inside the window (a run must overlap it); times `HH:MM` New York wall clock; `end < start` only
  for after-midnight ends ≤ 06:00; `all_day` has no times; an end needs a start.
- `place` / `location_text` on every event; `departs_place` / `departs_text` / coordinates on every experience.
- Coordinates: both or neither, with `geo_source` (`census photon official wikipedia osm manual`); outside the box fails, outside
  the basemap warns ("not on the map").
- `status: "closed"` needs `status_note`; a quote needs its page and stays ≤ 40 words (45 fails).
- Placeholders: a whole value like `TBA TBD N/A none unknown varies see website - — ?` fails anywhere; a placeholder word ("Headliner
  TBA") fails inside an identity field (a name, title, operator, label, value, question or alt text) and only warns inside other
  text, where it is usually the source's own words (a `when_text` quoting "DATE TBD").

## What the build rejects (fails, lists everything, never writes docs/)

Config errors; missing or invalid JSON; unknown keys; missing required fields; wrong types or enums; empty strings; duplicate ids
(per file and across collections); share-code collisions; dangling references (`event.place`, `event.series`, `series.place`,
`experience.departs_place`, `timeline.places`, `timeline.media`, `media.subject`, `transport.stops[].place`, route stops,
`aliases.places`); an area in the wrong region; dates outside the window; `end_date` before `date`; occurrences outside the event's
dates; suspicious times; `all_day` with times; an event with neither place nor location text; an experience with no departure;
lat without lng; coordinates outside the box or without `geo_source`; `closed` without a note; long or unattributed quotes;
placeholders; HTML or entities in text; `http:` or malformed URLs; a malformed `images.json` entry or a missing image file; a
`map.json` without `bbox.core`; missing sheet tokens, theme-color or dark block in `tokens.css`; color literals or text under 12px in
CSS partials; a nav page with no producer, two producers, or an orphan page; a place, stay or area without its detail page; a feature
without its JS file; and, crawling the output: broken links, anchors and srcsets, query keys a page does not accept and values that
name nothing (`?r=nope`, an unknown `?e=`), `url(…)` in the CSS that does not resolve, `href="#"`, external links without the
new-tab note, ≠ 1 `<h1>`, duplicate ids, a missing title, description, canonical or aria-current, `<img>` without alt, width or
height, inline color, search entries that do not resolve, an incomplete sitemap, relative links on the 404 page. It **warns**
(grouped) on regions and areas without a record, records without coordinates or off the basemap, places without a summary, closed
places without heritage, events without an area, images for records that do not exist, and size budgets.

## Tone and voice

Plain American English, second person, short sentences, no marketing language, no emoji. Headlines state facts; kickers are
"Sheet 1 · Tampa" or a section plus a fact. Times: `9:00 AM`, `4:00–9:00 PM` (one AM/PM when shared); dates `Oct 24`, `Sat, Oct 24`,
`Feb 5–16`, `Through Jan 10, 2027`; relative `In 20 min`, `Today`, `This weekend`. Quote official taglines in quotation marks with
their source; never use one as our headline. Name the official source on every page and every record ("Source: host · Checked Sep 27, 2026").

## Deploy

`docs/` is committed on `main`. Either Settings → Pages → Deploy from a branch → `main` → `/docs`, or
`.github/workflows/deploy-pages.yml` publishes `docs/` to `gh-pages` on every push touching `docs/**` (then serve `gh-pages` / root).
`test.yml` runs the build and `npm test` on every push (except to gh-pages) and pull request, and fails when `docs/` has new,
changed or deleted files that were not committed (about.html's date excepted).
