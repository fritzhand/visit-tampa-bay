# Research slice format

Each slice is one folder, `research/<slice>/`, holding `research/<slice>/<slice>.json`:

```json
{
  "slice": "<slice>",
  "checked": "2026-09-27",
  "records": { "places": [ … ], "stays": [ … ], "experiences": [ … ], "events": [ … ], "series": [ … ],
               "areas": [ … ], "transport": [ … ], "faqs": [ … ], "facts": [ … ], "timeline": [ … ], "media": [ … ] },
  "report": "Markdown: what you covered, the sources you used, what you left out and why, open questions."
}
```

Only the collections a slice produces need to be present. Validate with
`node research/tools/check-slice.mjs <slice>` until it prints no errors (warnings are worth reading). The machine
definition is `research/tools/schema.mjs` (enums, area ids, the date window, the coordinate box).

## Rules for every record

- **`source_url` is the page you actually read** (with WebFetch) that states the record's facts, preferably the
  official site of the place/operator/organizer, else an authoritative public page (a city, county or state page,
  NPS/NRHP, a museum, the organizer's ticketing page). Visit Tampa Bay / Visit St. Pete-Clearwater listings are fine
  as `also_sources` and as a discovery tool, but prefer the business's own page as `source_url`.
- **`checked`** = the date you read it (today: `2026-09-27`).
- **Unknown = `null`** (or leave the key out). Never "TBA", "Varies", "Call for pricing", a guess or an estimate.
- **`summary`**: 1–2 sentences in plain, factual American English, our own words, every claim on the source page. No
  "stunning", "world-class", "hidden gem", "must-see". Superlatives and "oldest/first/largest" only attributed: "The
  restaurant says it is Florida's oldest (founded 1905)." Write for a visitor: what it is, what you do there.
- **`quote`** (optional): verbatim from the official page, ≤ 40 words, with `quote_source` if it is not `source_url`.
- **Plain text** everywhere: no HTML, no `&amp;`, no markdown. Straight or curly quotes are both fine.
- **ids**: lowercase kebab-case slug of the official name, dropping a leading "the" (`tampa-theatre`, `columbia-restaurant-ybor-city`
  when a chain or a name has several locations, `florida-aquarium`). Unique across places, stays, experiences,
  events, series (one URL space). If two slices may hold the same place, use the obvious slug: the merge unites
  same-id records.
- **`area`**: one of the fixed ids in SPEC.md §4.1 (the region follows from it). Pick by where the place is.
- **Coordinates**: `lat`, `lng` (decimal degrees, 6 places) and `geo_source` (`census` for an address match,
  `photon` for an OpenStreetMap name match, `official` when the organization publishes them, `wikipedia`).
  Use `node research/tools/geocode.mjs "<address>"` or `--name "<name>" --near <lat,lng>` and check the
  `matched` text is really this place. For a park or beach, the main entrance or the named feature is fine.
- **`status`**: `open` | `seasonal` | `temporarily-closed` | `opening-soon` | `closed`, with `status_note` for
  anything but `open` ("Closed after Hurricane Milton (Oct 2024); reopening planned for early 2027, per …").
  Look for closures: Pinellas beach hotels, John's Pass, Tropicana Field and others were damaged in 2024.
- **Prices and hours** are volatile: `price_text` / `hours_text` as the source states them (short), never computed.

## places

`id name aliases kind kinds topics area address city state zip lat lng geo_source url phone hours_text price_text is_free
summary quote quote_source heritage signature status status_note accessibility parking_text tags source_url also_sources checked notes`

- `kind` (primary) and optional `kinds` (secondary): theme-park water-park zoo aquarium museum gallery science-center
  historic-site historic-district landmark performing-arts music-venue arena-stadium sports park beach state-park
  nature-preserve garden trail island pier waterfront district shopping market food-hall restaurant cafe-bakery bar
  brewery distillery-winery nightlife casino cemetery house-of-worship visitor-center attraction
- `topics`: history arts family outdoors beaches water wildlife food drink nightlife sports shopping thrills music
  latin-heritage black-history lgbtq
- `signature: true` only for the region's defining places (the ones every official guide leads with), sparingly.
- `heritage` (historic places): `{ built, architect, style, designations: [{ name, ref, year, url }], era, story, visiting, sources }`.
  `designations` e.g. `{ "name": "National Register of Historic Places", "ref": "72000322", "year": 1972, "url": "https://…" }`,
  National Historic Landmark, a local landmark. `era`: indigenous spanish frontier boomtown land-boom postwar modern
  (before 1528 · 1528–1820 · 1821–1883 · 1884–1919 · 1920–1945 · 1946–1979 · 1980–). `story`: 2–5 factual sentences,
  our words, every claim backed by a URL in `sources`.

## stays

`id name aliases kind brand collection area address city state zip lat lng geo_source url phone rooms opened features
summary quote quote_source heritage status status_note tags source_url also_sources checked notes`

- `kind`: hotel resort boutique-hotel historic-hotel extended-stay motel inn bed-and-breakfast hostel condo-hotel
  casino-resort campground
- `brand`: the chain ("Marriott", "Hilton", "IHG", "Hyatt", "Independent" when the hotel says it is independent,
  else null); `collection`: the flag ("Autograph Collection", "Curio Collection", "Hampton by Hilton").
- `features` (only what the hotel's own page states): beachfront waterfront bay-view pool spa fitness restaurant
  rooftop-bar pet-friendly airport-shuttle cruise-shuttle golf marina casino all-suites kitchens free-breakfast
  free-parking ev-charging historic adults-only accessible-rooms meeting-space
- `rooms` (int) and `opened` (year string) only when stated.

## experiences

`id name operator kind topics area address city state zip lat lng geo_source departs_place departs_text url booking_url
phone duration_text price_text is_free schedule_text season_text ages_text summary quote quote_source status status_note
tags source_url also_sources checked notes`

- `kind`: water-taxi ferry cruise dinner-cruise dolphin-tour sailing boat-rental kayak-paddle fishing parasail-jetski
  airboat eco-tour snorkel-dive walking-tour ghost-tour food-tour drink-tour cigar bike-segway trolley-bus-tour
  helicopter-air class-workshop animal-encounter adventure behind-the-scenes show other
- Where it starts: `departs_place` (a place id, e.g. `clearwater-marina`), or `departs_text` + the departure point's
  `address`/`lat`/`lng`.

## events (dated, 2026-09-28 … 2027-04-30)

`id title kind topics series date end_date start end all_day occurrences time_text place location_text area lat lng
cost is_free url tickets_url description summary status featured tags source_url also_sources checked notes`

- `id`: slug + year or date: `guavaween-2026`, `lightning-vs-bruins-2026-10-10`.
- `kind`: festival parade fair concert sports theater comedy dance classical film exhibition holiday market food-drink
  run-walk cultural family tour fireworks boat-show convention talk other
- `date` + optional `end_date` (a run: a fair, a show's run); `occurrences: [{ date, start, end }]` when hours differ
  by day. `start`/`end` `HH:MM` 24-hour local; `null` when not published (`time_text` holds vague wording:
  "Gates open at 11 a.m."). `all_day: true` only when the source says so.
- `place`: a place id (the venue, e.g. `benchmark-international-arena`) when the venue is also a place record in any
  slice; else `location_text` (+ `area`, `lat`/`lng` if known).
- `description`: verbatim from the source, short (≤ 80 words), or null; `summary`: our one line.
- `series`: a series id for recurring signature events (`gasparilla-pirate-fest`).
- `status`: scheduled tentative changed postponed cancelled. `featured: true` for signature events.
- `is_free`: true only when the source says free; false when it names a price; else null. `cost`: the source's words.

## series (the annual calendar)

`id name kind topics months when_text place location_text area since url summary quote quote_source featured source_url
also_sources checked notes` — `months` `[1]` for January; `when_text` as the source states it ("The last Saturday in
January"); `since` the first year, when stated.

## areas

`id name region lat lng kind summary known_for official_url source_url also_sources checked notes` — `id` from SPEC §4.1;
`kind`: neighborhood district city beach-town island county-area; `known_for`: 3–6 short noun phrases a source
supports ("the Sponge Docks", "Greek restaurants").

## transport

`id name mode operator regions url fare_text is_free hours_text season_text summary stops lat lng address code
source_url also_sources checked notes` — `mode`: airport streetcar water-taxi ferry bus brt trolley microtransit
bike-share scooter rail intercity-bus cruise-port parking toll rideshare car-rental trail; `stops: [{ name, lat, lng,
place, area }]`; `code` e.g. "TPA".

## faqs, facts

- faqs: `id topic q a source_url also_sources checked` — `a` in our plain words, only what the source says; or quoted.
- facts: `id label value as_of source quote source_url checked` — e.g. `{ "label": "Average high in July", "value": "90°F",
  "as_of": "1991–2020 normals", "source": "National Weather Service", "quote": "…" }`.

## timeline

`id era year date title text places area lat lng media source_url also_sources checked` — `text` 1–3 factual
sentences; `places`: place ids it happened at (the merge links them).

## media (rights-cleared images only)

`id title creator year license license_url credit file_url page_url subject_kind subject alt width height notes`
— `license`: public-domain cc0 cc-by cc-by-sa us-gov (read it on the Commons file page; skip anything else,
including "fair use" and non-commercial licenses). `file_url`: the upload.wikimedia.org original (or a large
thumbnail); `page_url`: the Commons `File:` page; `credit`: "Creator / Wikimedia Commons (CC BY-SA 4.0)";
`subject_kind` + `subject`: the record it illustrates; `alt`: what the image shows, plainly.
