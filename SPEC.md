# Tampa Bay Chartbook — product and build spec

Status: **the anchor document for every agent building this site.** Written Sep 27, 2026 before the build. When the
code and this file disagree after the build, `CLAUDE.md` and `build/CONTRACTS.md` win; update this file's changelog.

## 1. What it is

**Tampa Bay Chartbook** (https://fritzhand.github.io/visit-tampa-bay/) is an independent, source-linked visitor's guide
to Tampa Bay: where to stay, what to see and do, what is on, where to eat, how to get around, and where the region's
history happened. Every record links to the page that states its facts. Owner: Jeremy Fritzhand.

It is **not** Visit Tampa Bay, Visit St. Pete/Clearwater or any official tourism body, and never looks or reads like
one: its own name, its own mark, a plain "Independent guide. Not affiliated with any tourism office, venue or
operator." line in the footer and on About. The repository is called `visit-tampa-bay`; the product is not.

Reference projects (read them, do not copy their identity):
- `fritzhand/cincy-week` (`/home/user/cincy-week`): **the engine and the rigor.** Zero-dependency static site,
  `data/*.json → node build.mjs → docs/`, fail-before-write validation, a crawler that fails on broken links, the
  shell (sidebar, drawer, ⌘K search, dock, TOC), the star/plan store, the SVG basemap, the tests, the tone rules.
  This project forks that engine and replaces its festival-week domain with a destination domain.
- `fritzhand/history-of-tampa` (`/home/user/history-of-tampa`): **the history and the citation standard.**
  `js/data.js` and `js/ybor-data.js` hold cited Tampa history (26 dated map events with coordinates, eras, 42
  rights-cleared archival images with credit lines, Census series). Reuse its facts and images with their sources.

## 2. The rules that never bend (same spirit as Cincy Week)

1. **Never invent a fact.** No invented name, address, hour, price, date, time, phone, count, year, architect,
   quote or claim. Every record carries `source_url` (a page that was actually read and states the facts).
   Unknown is `null`, never "TBA", "TBD", "N/A", "Varies" or a guess. Pages print unknowns as unknowns.
2. **Closed is a fact too.** Hurricanes Helene and Milton (Sep–Oct 2024) closed or damaged many Pinellas beach
   properties and some attractions; businesses open and close. A record's `status` reflects what its source says
   as of `checked`; a place that has closed for good is kept out (or kept with `status: "closed"` only when a
   history page needs it).
3. **Our words are plain; their words are quoted.** `summary` is our own one or two factual sentences, no marketing
   language, no superlatives unless attributed ("The Columbia says it is Florida's oldest restaurant"). `quote` is
   verbatim from the official page, ≤ 40 words, always attributed. Plain text only (no HTML, no entities).
4. **https only.** External links open in a new tab and say so.
5. **Color literals live only in `site/css/tokens.css`.** Nothing under 12px; touch targets ≥ 44px on phones; every
   state is a word, never color alone. WCAG AA contrast in both editions.
6. **`docs/` is generated.** Never hand-edit it.
7. **Never rename an id** once published (ids are in URLs and saved trips). Close instead of deleting.
8. **Images are never hotlinked** and are rights-cleared: Wikimedia Commons (public domain, CC0, CC BY, CC BY-SA) or
   the history-of-tampa archive, each with creator, license and a credit line. No photos lifted from hotel, venue or
   operator websites. A record without a cleared image gets a typographic plate, not a stock photo.

## 3. Brand: "Chart & Label"

The site is a **chartbook**: the bound set of nautical charts a skipper keeps for one body of water, one numbered
sheet per stretch of coast. It is printed with the gold, ornament and cream stock of an **Ybor City cigar-box label**
(Tampa made cigar labels by the million; the lithographed label is the region's own graphic art).

- **Sheets.** The region is divided into six numbered sheets (regions, §4.1). Each sheet has an ink (its identity
  color, like a program in Cincy Week), a sheet number and a two-letter chart code: `TP` Tampa, `SP` St. Petersburg,
  `GB` Gulf Beaches, `CW` Clearwater & North Pinellas, `AB` Around the Bay, `DT` Day Trips.
- **Chart linework.** Coastlines drawn with "water lining" (the engraved ripple echo along a shore on old charts),
  a compass rose, a graticule tick border, latitude/longitude in the margins. Decoration only: never fake depth
  soundings, buoys or numbers that read as data.
- **Chart symbols as the icon language.** Anchor = where to stay, landmark (circle with a center dot) = historic
  site, star/flag = event, a small daymark = experience departure, a buoy-like numbered pin = a place on the map.
- **Label ornament.** Page heads and region pages use a cigar-label frame (double rule, corner ornaments, a banner
  ribbon for the kicker); a gold-leaf accent used sparingly for "signature" items and the masthead. Never
  skeuomorphic texture images: ornament is drawn in SVG/CSS with tokens.
- **Editions.** "Day chart" (cream paper, navy ink, chart magenta and gold accents) and "Night chart" (deep bay navy,
  cream ink, gold). Light is default; dark follows the system and the toggle.
- **Voice.** Same as Cincy Week: plain American English, second person, short sentences, no emoji, no marketing.
  Headlines state facts. Kickers are "Sheet 1 · Tampa" style.
- **Name and mark.** Wordmark "Chartbook" with "TAMPA BAY" set above it in spaced caps; the mark is a compass-rose
  medallion inside a cigar-band ellipse. Title tag: "<page> · Tampa Bay Chartbook".

The design system agent owns the exact palette, fonts (self-hosted, SIL OFL), tokens and the SVG brand files; the
concept above is fixed.

## 4. Domain model (data/*.json)

The exact field lists are in `research/SCHEMA.md` (research slices use the final shapes, so the merge is a union,
not a translation). Summary:

| file | what | detail page |
|---|---|---|
| `regions.json` | the six sheets: id, name, code, number, lede, bounds, center, source_url | `tampa.html`, `st-petersburg.html`, `gulf-beaches.html`, `clearwater.html`, `around-the-bay.html`, `day-trips.html` |
| `areas.json` | ~40 neighborhoods, towns and beach towns inside a region | `areas/<id>.html` |
| `places.json` | every fixed point of interest: attractions, museums, parks, beaches, historic sites and districts, landmarks, venues, arenas, markets, restaurants, bars, breweries, shopping | `places/<id>.html` |
| `stays.json` | hotels, resorts, inns, B&Bs, campgrounds | `stays/<id>.html` |
| `experiences.json` | tours and activities run by an operator (water taxis, dolphin cruises, kayak tours, food tours, ghost tours, cigar rolling, fishing charters…) | dialog `?x=<id>` on experiences.html |
| `events.json` | dated events Sep 28, 2026 – Apr 30, 2027 (festivals, parades, fairs, concerts, home games, shows) | dialog `?e=<id>` on whats-on.html |
| `series.json` | recurring signature events (Gasparilla, Guavaween, the State Fair, the Strawberry Festival…): the annual calendar | section of whats-on.html |
| `timeline.json` | eras and dated milestones of Tampa Bay history, linked to places | history.html |
| `transport.json` | airports, streetcar, water taxis, ferries, buses, trolleys, bike share, rail | getting-around.html |
| `faqs.json` / `facts.json` | practical questions (weather, hurricanes, beaches, taxes, tolls) / stat tiles with a quote and source | faq.html, when-to-visit.html |
| `media.json` | rights-cleared images with credit, license and subject | (images on every page) |
| `routes.json` | curated "Passages": multi-stop routes built only from sourced records (added in the build phase) | passages.html |

Ids are unique **across** places, stays, experiences, events, series, areas and regions (one URL and trip-code space).

### 4.1 Regions (sheets) and areas — fixed ids

Every located record has `area` (an area id below). Region is derived from the area.

| region (sheet) | areas |
|---|---|
| `tampa` · 1 · TP · Tampa | `downtown-tampa` (incl. Riverwalk, UT & Plant Hall, Curtis Hixon), `channel-district` (incl. Water Street, Sparkman Wharf, the aquarium, the arena, cruise terminals), `harbour-island`, `davis-islands`, `ybor-city`, `tampa-heights` (incl. Armature Works), `hyde-park` (incl. SoHo, Bayshore Blvd), `west-tampa` (incl. Raymond James Stadium, Steinbrenner Field), `seminole-heights`, `north-tampa` (incl. ZooTampa/Lowry Park, Sulphur Springs, Busch Gardens, Adventure Island, USF, MOSI, New Tampa, Carrollwood), `westshore` (incl. the airport, Rocky Point, International Plaza, Town 'n' Country), `south-tampa` (incl. Ballast Point, Palma Ceia, Gandy, Port Tampa, Picnic Island), `east-tampa` (incl. Seminole Hard Rock, the State Fairgrounds, MidFlorida amphitheatre) |
| `stpete` · 2 · SP · St. Petersburg | `downtown-stpete` (incl. the Pier, Beach Drive, Central Ave downtown, EDGE District), `grand-central` (incl. Grand Central District, Warehouse Arts District, Tropicana Field), `old-northeast` (incl. Snell Isle, Crescent Lake), `south-stpete` (incl. Midtown, Lake Maggiore, Boyd Hill), `northeast-stpete` (incl. Gateway, Carillon, Weedon Island, Gandy Beach), `west-stpete` (incl. Tyrone, Azalea, Jungle Prada), `gulfport` |
| `beaches` · 3 · GB · Gulf Beaches | `clearwater-beach` (incl. Pier 60, the marine aquarium's beach attractions), `sand-key` (incl. Belleair Beach), `indian-rocks-beach` (incl. Indian Shores, Redington Shores, North Redington), `madeira-beach` (incl. John's Pass, Redington Beach), `treasure-island`, `st-pete-beach`, `pass-a-grille`, `fort-de-soto` (incl. Tierra Verde, Shell Key, Egmont Key) |
| `clearwater` · 4 · CW · Clearwater & North Pinellas | `downtown-clearwater` (Clearwater mainland incl. Countryside and the aquarium), `dunedin` (incl. Honeymoon and Caladesi islands), `safety-harbor`, `tarpon-springs`, `palm-harbor` (incl. Innisbrook, East Lake), `oldsmar`, `largo` (incl. Seminole, Pinellas Park, Belleair, Kenneth City) |
| `around` · 5 · AB · Around the Bay | `temple-terrace`, `brandon` (incl. Riverview, Valrico, Seffner), `apollo-beach` (incl. Ruskin, Gibsonton, Sun City Center), `plant-city` (incl. Dover, Thonotosassa), `lutz-wesley-chapel` (incl. Lutz, Land O' Lakes, Odessa, Wesley Chapel, Zephyrhills, Dade City), `west-pasco` (New Port Richey, Port Richey, Holiday, Hudson) |
| `daytrips` · 6 · DT · Day Trips | `bradenton-anna-maria` (incl. Bradenton, Palmetto, Ellenton, Anna Maria Island, Longboat Key north), `sarasota`, `nature-coast` (incl. Weeki Wachee, Brooksville, Crystal River, Homosassa), `polk` (incl. Lakeland, Winter Haven, Lake Wales) |

### 4.2 Time and windows

Time zone `America/New_York`. `dataWindow` for events: **2026-09-28 → 2027-04-30**. The home page and What's On read
the client clock ("Today", "This weekend", "Now"), like Cincy Week's live states; `?now=2026-10-15T19:00` works on
localhost.

## 5. Pages

Sidebar groups (numbers mean sections, sheet codes mean regions):

1. **Plan** — Overview (`index.html`), What's On (`whats-on.html`, all events: month/day list, filters by kind,
   region, free, weekend, stars; list or map), Map (`map.html`), My Trip (`trip.html`, starred places, stays,
   experiences and events; share link; .ics for events).
2. **Sheets** — the six region pages (a chart sheet each: lede, areas, top places, stays, what's on, history).
3. **Explore** — Things to do (`things-to-do.html`: places by kind/topic/area), Experiences & tours
   (`experiences.html`), Beaches & outdoors (`outdoors.html`), History & heritage (`history.html`: timeline by era +
   historic sites + districts), Eat & drink (`eat-drink.html`), Arts, sports & shows (`venues.html` or folded into
   things-to-do by the page lane), Passages (`passages.html`).
4. **Stay** — Where to stay (`stay.html`: every hotel, filter by area, kind, feature; list or map), Areas
   (`areas.html`: every neighborhood and town).
5. **Visit** — Getting around (`getting-around.html`), When to visit (`when-to-visit.html`: climate by month,
   hurricane season, events calendar by month, sourced), FAQ (`faq.html`), About & sources (`about.html`).

Detail pages: `places/<id>.html`, `stays/<id>.html`, `areas/<id>.html`. Dialogs: event (`?e=`), experience (`?x=`).
Search (⌘K) covers every record. Phone dock: What's On · Map · Trip · Search.

## 6. Build plan (who does what)

- **Research** (`research/<slice>/`): one agent per slice (§ research/README.md), each followed by an adversarial
  verifier that re-reads every source. Output is final-shape JSON, validated by `node research/tools/check-slice.mjs`.
- **Engine** (fork of cincy-week): build.mjs, build/core/*, build/nav.mjs, site/js/core/*, tests, the new schema.
- **Design** (`site/css/tokens.css`, fonts, brand SVGs, og cards) and **Basemap** (`site/map/basemap.svg` from Census
  TIGER water and roads for Hillsborough, Pinellas, Pasco, Manatee: Overpass is unreachable from the build box).
- **Merge** (`scripts/merge-research.mjs`): research → data/, dedup across slices, geocode gaps, log every decision.
- **Pages** (parallel lanes on disjoint files), then **Images** (Commons), then **QA** (data accuracy, UX audit), then
  integration.

## 7. Coordinates and map credits (owner's decision, Sep 27)

OpenStreetMap is welcome: use whatever is most accurate and easiest, and credit it. Per record, keep the most
accurate point: (1) coordinates the operator publishes; (2) an OpenStreetMap feature matched by name (Photon), which
marks the actual building, beach, park or pier; (3) a US Census address match (street centerline, can be a block off);
(4) Wikipedia. When two sources disagree by more than ~250 m, flag the record and settle it from the source, never by
averaging. Credits, on the About page and in every map's attribution line: "Basemap: US Census Bureau TIGER/Line
(public domain). Place coordinates include data © OpenStreetMap contributors, ODbL
(https://www.openstreetmap.org/copyright)."

## Changelog
- 2026-09-27: first version.
- 2026-09-27: §7 coordinates policy and credits (OpenStreetMap allowed, credited).
