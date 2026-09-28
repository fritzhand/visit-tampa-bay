# Concept 3 · "Sunrise to Lighted Boats": a day on the bay

A promo concept for **Tampa Bay Chartbook** (fritzhand.github.io/visit-tampa-bay), written Sep 28, 2026, in the spirit of
Cincy Week's `collateral/reel-2026-09/brag-plan.md`. Two cuts only: a **9:16 Reel (1080×1920, 34.5 s, 1035 frames)** and a
**16:9 video (1920×1080, 43.0 s, 1290 frames)**, both 30 fps. There is no 4:5 cut: the owner does not want one, so none is
planned, built or rendered.

The two lengths sit a little over the brief's "about 30 s" and "about 40 s". The reason is one honesty rule. The site's toasts
live 3.2 s on the site's own clock, so the installed clock runs in real time from every tap until its toast has been read.
Only then may the day race forward. Nothing on screen is held longer than the real site would hold it.

Every number marked "as of writing" was read on Sep 28 from `data/` and from a private build of the current tree
(`TBC_OUT=.cache/out-promo3 node build.mjs`, 1,123 pages) served on a private port and driven by Playwright on an installed
clock. The renderer recomputes all of them at render time and never prints a number from this file.

---

## 1. Logline

One Saturday on Tampa Bay, told only by the real site on a phone lying on a chart of the bay: the chart turns from the Night
chart to the Day chart at sunrise over Fort De Soto, the phone crosses the bay to Ybor City and the water taxi while its clock
runs the day forward, the chart and a laptop turn gold at sunset, a real "In 23 min" counts down to the Riverwalk's lighted
boat parade, and the whole day leaves as one share link.

## 2. The idea

Tampa Bay Chartbook is a chartbook: one set of sheets of one body of water. Its two editions are named for the time of day:
the **Day chart** and the **Night chart** (the toggle's own words: "Switch to the Night chart"). Its What's On speaks in
clock words that only mean something at a given minute ("Today", "In 23 min", "Started"), and its home page prints the
reader's clock ("Saturday, December 19 · 7:16 AM"). So the promo does not describe the site. It **runs one real day through
it**, and the clock is the camera's engine.

- **The stage is the site's own chart.** The site's Census TIGER basemap (`site/map/basemap.svg`, the same file the map
  page draws) lies flat as a chart table under a 3D camera, painted with the site's own map tokens in both editions, with
  its water lining, its Bodoni-italic water names and its chart symbols. The phone lies on it like a game piece at the real
  coordinates of each stop (projected with the site's own `site/js/lib/geo.js`).
- **The day is real data.** Saturday, **December 19, 2026**:
  - **Morning**, Fort De Soto Park. The site lists its hours as "Daily, 7 a.m. to sunset; open all year."
  - **Afternoon**, the Ybor City Historic District, then its timeline.
  - **Afternoon**, the Pirate Water Taxi, whose Fri-Sun hours run to 9:30 p.m.
  - **Evening**, the **Tampa Riverwalk Holiday Lighted Boat Parade**, a signature event listed for that date at 6:15 PM.

  Morning, Afternoon and Evening are the site's own time-of-day words (`BUCKETS` in `site/js/lib/time.js`).
- **The sun does the edition flips, for real.** The browser's color scheme is emulated as a phone set to *Auto* appearance:
  it goes light at sunrise and dark at sunset. The site's own code follows the system edition until a reader picks one
  (`site/js/core/theme.js`), so the pages flip by themselves at the computed sunrise over Fort De Soto (7:16 AM EST) and
  sunset over the Riverwalk (5:38 PM EST). The chart table flips with them in a terminator sweep, east to west, as light and
  dark really cross the bay.
- **Every tap is real.**
  - Four stars: a place, a historic district, a tour and an event, each with the site's own "Added to My Trip · View" toast.
  - A share, with the site's own "Link copied".
  - In 16:9, two trackpad clicks on a laptop: the map's event flag, and "Add 4 to my trip" on the shared link.
- **The clock is the rhythm section.** An original son score (Karplus-Strong tres, tumbao bass, claves, bongó, a brass
  section, celesta, a ship's bell, the Gulf's wash). The claves strike the hours as the clock runs forward. At midday the
  clock jumps back to 1885 and runs through Ybor's timeline to 2002. The countdown to the boats is a rising celesta scale,
  one note per minute. Day is A major; night is F major; the sunset is the chromatic-mediant turn between them.
- **It loops.** It opens on the whole bay at night and ends on the whole bay at night, with the day's course drawn in
  magenta through four chart symbols. The last frame flows into the first.

## 3. Why this is clearly better than Cincy Week's Reel

| Cincy Week, "The Interchange" (22 s) | "Sunrise to Lighted Boats" |
|---|---|
| Flat 2D stage; one phone pushed in 2D | A true 3D scene (one CSS 3D camera, perspective, pitch, yaw, dolly). A 10,000 px chart table recedes under the camera. Devices lie on it and stand up from it, the camera flies between stops, a laptop lid opens on the chart, and a foreground compass rose gives parallax during flights |
| One live page, one tap | Five live pages on the phone and one or two on a laptop. Four real stars, one real share and, in 16:9, two laptop clicks. Every toast is the site's own |
| A pre-week clock, chosen to avoid live states | The live states are the story: "Today", "In 23 min", then "Started". It never says "Now", because the parade's end time is not published, and the promo shows that honesty on purpose |
| One hard cut to the Night edition, drawn by the stage | Two edition flips performed by the site's own code (system Auto appearance at computed sunrise and sunset), mirrored by a terminator sweep across the real bay |
| Motif: the site's week line and logo | Motif: the site's own name for itself (a chart), its own clock line, its own editions and its own chart symbols, as one physical day on one physical chart |
| Score in D major, pitched effects | A son montuno whose claves are the clock. The timeline's years ring out on the tres, the countdown is a scale, a ship's bell marks sunrise, sunset and "Started", and the score loops like the picture |
| Reading-time and safe-zone audit | The same audit plus: minimum type size, chart-texture sharpness, device-text sharpness, live-state assertions per frame (no "Now", no "Test clock", no "Loading"), a clipboard and share-link check, a determinism check and a 3D-aware safe zone |

## 4. The non-negotiables, and how this concept meets each

| Rule | How |
|---|---|
| Every count from `data/` at render time | Counts come from the build's own loader (`load()` in `build/core/load.mjs`, read-only) and are asserted against the built home page's `p.mast-dek` (as of writing: 641 places, 414 places to stay, 176 tours and trips, 589 events). Every other number on screen is either a clock reading or a live-DOM reading (§9) |
| Every sentence about the site read from the built site or data | §9 lists every line with its selector or data field. Only three phrases are hand-written ("Sunrise to lighted boats.", "Sunset", "One day, one link."), plus separators, case changes, three ellipses and one arrow (§9.3) |
| No "best", "#1", "ultimate", "official" | None used. The only superlative on any captured page is the organizer's quote on the parade dialog ("Tampa's largest…"), which is attributed on the page itself and is never pushed in on or read out |
| No Visit Tampa Bay, team or venue logo or name as ours | The only mark shown as ours is the site's own lockup (`site/img/brand/logo.svg`, `design/brand/wordmark.svg`). Operator and event names appear only inside the site's listings, as the site shows them |
| Images: only the site's rights-cleared ones, credited | The stage uses no photographs at all. The four records in the day have no processed image as of writing, so their pages show the site's typographic plates. A render-time check credits on screen any `images.json` image that becomes prominent (§15) |
| End card: address and independence line | `fritzhand.github.io/visit-tampa-bay` (from `site.config.json` `siteBase`) and "Independent guide. Not affiliated with any tourism office, venue or operator." (the built footer's `.footer-indep b`) |
| Original score, computed note by note | §12. Deterministic synthesis in `collateral/lib/`: no samples, no licensed audio, a seeded PRNG for all noise |
| Reads with the sound off | §13 |
| Never write `docs/`, never touch files outside `collateral/` and `.cache/`, never run git | Capture from a private build (`TBC_OUT=.cache/out-promo node build.mjs`) served by the renderer itself. Outputs go to `collateral/promo-2026-09/`, working files to `.cache/promo/` |

---

## 5. The day (the plan of record)

Every stop is a real record and a real page. The **clock** is the video's own: the visitor's day, installed in the browser.
Nothing on screen presents a clock time as a fact about a stop, with two exceptions. The parade's 6:15 PM is the event's own
start (`events.json`). Sunrise and sunset are computed (§5.2).

| Clock (EST) | Site word (`BUCKETS`) | Record (id) | Sheet | Page in the phone | Real tap | Why this time is honest |
|---|---|---|---|---|---|---|
| 7:14 → 7:16 AM | Morning | `fort-de-soto-park` (place, heritage) | 3 · GB | `places/fort-de-soto-park.html` | star `.page-head [data-star="fort-de-soto-park"]` | Hours "Daily, 7 a.m. to sunset; open all year." `status_note` lists no closure on Dec 19 (asserted) |
| 12:30 PM | Afternoon | `ybor-city-historic-district` (place, heritage) | 1 · TP | `places/ybor-city-historic-district.html`, then `#timeline` | star `.page-head [data-star="ybor-city-historic-district"]` | A district: no hours apply. The page's timeline is history, not a schedule |
| 3:30 PM | Afternoon | `pirate-water-taxi` (experience) | 1 · TP | `experiences.html?x=pirate-water-taxi` (dialog) | star `[data-xd-star]` | `schedule_text` "…Fri-Sun 11:30 a.m.-9:30 p.m." (Dec 19 is a Saturday). Departs from Tampa Convention Center (`departs_place`) |
| 5:38 PM | Evening | (sunset) | — | the laptop: `map.html?layers=events&when=today` | none (the system goes dark) | Computed sunset at the Riverwalk (§5.2) |
| 5:52 → 6:15 PM | Evening | `tampa-riverwalk-lighted-boat-parade-2026` (event, signature) | 1 · TP | `whats-on.html?when=today`, scrolled to `#e-tampa-riverwalk-lighted-boat-parade-2026` | star `#e-… [data-star="tampa-riverwalk-lighted-boat-parade-2026"]` | `date` 2026-12-19, `start` 18:15, `end` null (so "Started", never "Now") |
| 6:15 PM | Evening | My Trip | — | `trip.html` | `nav.dock a[href="trip.html"]`, then `[data-trip-share]` | The trip holds exactly the four starred ids |

Geography (basemap viewBox units, from `project()` and `data/map.json`, as of writing):

| Point | lat, lng | units (x, y) |
|---|---|---|
| Fort De Soto Park | 27.630054, −82.735749 | 246.3, 818.8 |
| Ybor City Historic District | 27.9625, −82.441111 | 584.9, 386.7 |
| Tampa Convention Center (the taxi's departure) | 27.941967, −82.456618 | 567.1, 413.4 |
| Tampa Riverwalk | 27.954353, −82.465467 | 556.9, 397.3 |

The day's course is the straight dashed magenta line through these four points in order (the site's `course` convention for
passages). It carries no distance, heading or time label. It is drawn only on the stage's chart, never inside a device.

### 5.1 Why December 19

It is a Saturday in the window where the data has all of the following, each verified:
- a signature event on the water after dark (the lighted boat parade, 6:15 PM, "Tampa's largest lighted boat parade" by its
  organizer's words);
- a public beach park whose listed hours literally run "7 a.m. to sunset";
- a historic district with an 11-entry timeline on its page;
- a water taxi whose listed Saturday hours cover the afternoon and evening;
- a sunset early enough (5:38 PM) that the Night chart arrives before the parade.

**If the parade record changes** (cancelled, postponed, changed, tentative, a different start or date), the render fails. It
never swaps the day silently. A re-plan is needed; the nearest alternative in the data is Sat, Oct 24, 2026 (Tampa Riverwalk
Trick or Treat, 4:00–9:00 PM, a published end, so its states would include "Now"; sunset 6:52 PM EDT).

### 5.2 Sunrise and sunset (computed, never typed)

`collateral/lib/sun.mjs` implements NOAA's solar-position equations (the ones behind the NOAA Solar Calculator; zenith
90.833°). Inputs are the records' own coordinates and the date. As of writing:
- sunrise at Fort De Soto Park: **7:16:15 AM EST**;
- sunset at the Tampa Riverwalk: **5:38:13 PM EST**.

The renderer cross-checks both with an independent implementation (the simple sunrise equation with refraction). It fails
if they differ by more than 3 minutes. The clock mapping (§7.3) puts the flip frames exactly on these instants. The minute
shown on screen is the site's own formatting of that instant. The only words that claim anything about the sun are the
hand-written "Sunrise" (in the hook line) and "Sunset" (a label), both sitting next to a time computed this way.

---

## 6. The world: chart table, devices, camera

### 6.1 Units

- **Basemap units**: the viewBox of `site/map/basemap.svg` (1000 × 1118; 85.55 m per unit as of writing,
  `data/map.json projection.mPerUnit`). Every place is projected with `project(lat, lng, metaOf(map.json))` from
  `site/js/lib/geo.js` (imported read-only).
- **Table px**: 1 unit = 10 table px. The table element is 10000 × 11180 px (a DOM plane; textures are positioned inside it).
- **Screen px**: output pixels (the stage page runs at device scale factor 1 at the cut's size, 1080×1920 or 1920×1080).

### 6.2 The chart table

**Textures.** Pre-rendered once per render into `.cache/promo/tex/`: the site's `basemap.svg` inlined into a page with the
built `assets/site.css` tokens. `data-theme="light"` gives the Day chart and `"dark"` the Night chart. Each is screenshot at
three levels of detail (LOD), 6 PNGs in all:

| LOD | Region (units) | Size | px per unit | Used when |
|---|---|---|---|---|
| L0 | whole chart 0–1000 × 0–1118 | 4096 × 4580 | 4.1 | screen px per unit ≤ 4 (flights, pull-back, hook) |
| L1 | Tampa: 480–680 × 280–480 | 4096 × 4096 | 20.5 | near Ybor, the Riverwalk and the laptop |
| L2 | Fort De Soto: 170–330 × 740–900 | 4096 × 4096 | 25.6 | near Fort De Soto |

- L1 and L2 sit on top of L0 at their exact table positions. They crossfade in over 0.1 s when the camera's screen px per
  unit at the target passes 4.0.
- The detail LODs set the map's line-width multiplier `--mw` to 2.5, so water lining and coastlines stay about 1.5 screen
  px wide at reading zoom.
- The audit fails any frame where a visible table region is magnified beyond 1.15 screen px per texture px (§16).
- No texture image is ever a photo. These are renders of the site's own SVG with the site's own tokens.

**Vector overlays on the table** (DOM/SVG in table px, so sharp at any zoom):
- **Water names** from `data/map.json` `labels` with `kind: "water"` and `minZoom ≤ 1.6`: "Gulf of Mexico", "Tampa Bay",
  "Old Tampa Bay", "Hillsborough Bay", "Boca Ciega Bay". They are set in Bodoni Moda italic 540 with
  `--map-label-water`, at 180 table px.
- **Land labels** for kind `city`/`town` with `minZoom ≤ 1`, in Archivo caps with `--map-label`.
- **The compass rose** (`design/brand/compass.svg`) at the table's NW corner, as on the site's map.
- **Graticule ticks** on the table's edge, with coordinates computed from the projection. They are visible only in the
  pull-back, and never used as data.
- **The course**: a dashed path through the four stops, stroke `--magenta`, 18 table px wide, dash 60/40. It draws on as
  the phone travels (`stroke-dashoffset` follows the phone's position along the path).
- **Stop symbols**: the site's chart symbols from the icon sprite (`sprite()` in `build/core/icons.mjs`), 120 table px, in
  the sheet's `--sheet-<id>-edge` ring on a `--map-pin-bg` disc. Each appears when its star is tapped:
  - `landmark` for Fort De Soto and Ybor (both `k: "heritage"` in the map's own model);
  - `daymark` for the water taxi (experience);
  - `flag` for the parade (event).
- **The dots**, pull-back only: every row of the built `map.html` list (`li.map-li[data-ll]`) whose point is inside the bay
  chart, drawn as 14 table px discs in `--sheet-<data-r>` at 55% opacity (1,277 of the map's 1,407 rows, as of writing).
  No number is printed on them.
- **The terminator** (edition sweep): the Night textures and overlays sit over the Day ones inside a mask. The mask is a
  soft vertical edge (feather 3% of the visible width) that moves across the table from east to west. Sunrise uncovers Day;
  sunset covers it with Night.
  - Its x in units: `x(t) = x_stop − 2800·(t − t_flip)`, so it crosses the flip point (Fort De Soto at sunrise, the laptop's
    base at sunset) on the flip frame and crosses the whole chart in 0.36 s.
- **Depth of field**: while a device is in reading pose, the table layer gets `filter: blur(1.5px)`, easing in over 0.2 s.
  Text on the table is never read at those moments.
- **Contact shadows** under standing devices: a radial gradient of `--scrim` at 22%.

### 6.3 Devices

**Phone.** Port Cincy's phone drawing (`collateral/lib/reel-stage.mjs` `PHONE`): a 390 × 710 css viewport, a 50 px status
bar, an 84 px toolbar and 15.5 px of bezel and band.
- Outer size: 421 × 875 css px.
- The status bar time is `h:mm` of the installed clock, updated every frame.
- The address pill reads `fritzhand.github.io` (the live host; the capture is served locally).
- The chrome takes the stage's edition tokens.
- The phone is a plane in the table's space, scaled by `k_phone = 1.333` table px per css px, with its pivot at the bottom
  center:
  - **Lying (pose 0)**: flat on the table, screen up, its long axis along the course heading.
  - **Standing (pose 1)**: `rotateZ(−yaw) rotateX(−pitch)` about its base, so its plane is exactly parallel to the screen
    and its base sits at the camera target (no keystone).
  - Poses between use `pose(p) = rotateX(−pitch · spring(p))`, a critically damped spring with a 2° overshoot.
- **Slots**: five iframes, all on **origin A** (`http://localhost:<port>`), so they share storage exactly as one browser
  does.
  - `fds` `places/fort-de-soto-park.html`
  - `ybor` `places/ybor-city-historic-district.html`
  - `pwt` `experiences.html?x=pirate-water-taxi`
  - `wo` `whats-on.html?when=today`
  - `trip` `trip.html`
  - A sixth 390 px slot, `home` (`index.html`), is never shown; the chronometer reads it (§7.4). It is parked off-canvas
    (`left: -5000px`), not `display: none`, so it lays out and ticks like a visible page.
  - Only one slot is visible at a time. Swaps happen only while the phone is lying flat and smaller than 200 px, with a
    4-frame crossfade.

**Laptop.** A new CSS drawing in the same material language as the phone: a dark-anodized lid, a black 18 px bezel, a hinge
bar, a base deck with a keyboard grid and a trackpad (texture only).
- The screen is a 1440 × 900 css iframe on **origin B** (`http://127.0.0.1:<port>`), a separate browser storage, like a
  separate device.
- `k_laptop = 0.579` table px per css px.
- The base lies on the table with its back edge centered at units **(575, 350)**, north of downtown.
- The lid hinges on the base's back edge: `rotateX` from 0° (closed, flat) to −(90° + pitch) (open, facing the camera).
- Slots:
  - `map` `map.html?layers=events&when=today`
  - (16:9 only) `shared`, which navigates to the phone's share link rewritten to origin B at the moment it is opened (§7.5)
- A pointer cursor (a plain arrow drawn in SVG, `--text` fill with a `--bg` outline) lives on the screen plane above the
  iframe. It glides to targets and dips 10% in scale on each click.

**Foreground rose.** During flights only (T1, T2, the pull-back): `compass.svg` at 1400 screen px diameter, placed 900 px in
front of the target plane (translateZ), 12% opacity, blurred 6 px, rotating 20°/s. Its motion against the table gives the
parallax.

### 6.4 The camera

One scene transform on `#world` under `perspective: P` (9:16: P = 2600 px, origin (540, 960); 16:9: P = 2400 px, origin
(1320, 540)):

```
transform: translate(Cx px, Cy px) rotateX(pitch) rotateZ(yaw) scale(s) translate(−X px, −Y px)
```

- `(X, Y)` is the target in table px.
- `s` is screen px per table px at the target's depth (so 10·s is screen px per basemap unit).
- `(Cx, Cy)` is where the target lands on screen.
- Standing devices pivot at the target, so they sit at depth 0 and scale by exactly `s · k_device`.
- **Reading pose, phone (9:16)**: `s = 1.2` (12 screen px per unit), `pitch = 55°`, `yaw = 0`, `Cx = 540`, and `Cy` such
  that the phone's top edge is at y 712. The phone is then 674 px wide, 1.6 screen px per css px, and its viewport's css
  y 0 lands at screen y 817.
- **Toast push, phone (9:16)**: `s → 1.5` (2.0 px per css px), and `Cy` such that the toast's top (css 574 in the phone's
  viewport) lands at y 1250. The phone slides up under the opaque title block (§8.1).
- **Whole bay (9:16)**: `s = 0.108`, `pitch = 0`, `yaw = 0`, target = the chart's center (500, 559) units, `Cy = 1310`. The
  whole chart then fills x 0–1080 and y 700–1920 under the title block. This is frame 1 and the last frame.
- **Easing**: position, `s` and pitch use `easeInOut` (cubic) for moves and `easeOut` for arrivals.
  - `s` is interpolated in log space (a zoom feels linear).
  - Yaw uses the same easing plus a slow ±2° drift over 3 s during holds. Only device content moves; the title block is 2D
    and never drifts.
- **Motion blur**: 4 sub-frames averaged, only in frames where the target moves faster than 40 screen px per frame (T1, T2,
  the pull-back). It can be turned off with `--no-blur`.

---

## 7. Live pages, clock, states and taps

### 7.1 Browser setup (one context per cut)

- Chromium from `/opt/pw-browsers`, launched through Playwright from `NODE_PATH=/opt/node22/lib/node_modules`.
- One desktop context:
  - viewport = the cut's size, `deviceScaleFactor: 1`, `reducedMotion: "reduce"`;
  - `colorScheme: "dark"` at the start (before sunrise);
  - clipboard permissions granted to origin A.
- The renderer serves the private build (`.cache/out-promo/`) and the stage (`/__stage`) itself, on origin A and origin B
  (the same server, two host names). It never reads or writes `docs/`.
- An init script injected into every device frame adds one stylesheet:
  `*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent}`.
  This is Cincy's lesson: the site's 0.01 ms reduced-motion transitions never finish on a paused clock. The stage adds all
  motion itself.
- `navigator.share` is absent on desktop Chromium, so "Share my trip" takes the site's own copy-and-toast path ("Link
  copied"). The renderer asserts that `navigator.share` is undefined in the phone's frames.

### 7.2 The clock

`ctx.clock.install({ time: W(0) })` and `ctx.clock.pauseAt(W(0))`. All slots are loaded **at W(0) = 7:14:00 AM exactly** and warmed
up (fonts ready, client data fetched, lists rendered). The site's `onTick` intervals then fire on whole minutes all day, so
"In 23 min" and "Started" change at exact minute boundaries.

For each frame i: `await ctx.clock.runFor(W(tᵢ) − W(tᵢ₋₁))`, then the stage's `render(tᵢ)`, then device scrolls and inline
motion, then the screenshot. Every frame is a pure function of `tᵢ`. `?now=` is never used: it would print "Test clock" on
the home page, and the audit fails any frame that contains "Test clock".

### 7.3 The clock mapping W(t) (piecewise; Reel)

`SR` = computed sunrise (Fort De Soto), `SS` = computed sunset (Riverwalk).

**The toast rule** decides the mapping:
- **Real time**: from every tap until its toast has been read, the clock runs at exactly 1 s per video second, so the site's
  own 3.2 s toast timer, its 60 s ticks and its transitions behave as they do for a reader.
- **Time-lapse**: the clock runs fast (`easeInOut`) only in transits, the golden hour and the countdown. A toast still up
  when a time-lapse begins is dismissed by the site's own timer. That happens only while the phone is lying down or leaving
  the frame.
- **×3 run**: before content a toast would cover (Ybor's timeline), the clock runs at ×3 for 0.9 s, so the site's timer ends
  first.

| t (s) | W | Segment |
|---|---|---|
| 0.00 | 7:14:00.0 | slots loaded here; a linear ramp to SR (the chronometer rolls 7:14 → 7:16) |
| 0.50 | SR (7:16:15) | **sunrise flip frame**; real time follows |
| 5.50 | SR + 5.0 s | real time (the star at 3.5; its toast is read 4.0–5.5) |
| 6.50 | 12:30:00.0 | **T1 time-lapse** (claves strike 8, 9, 10, 11 and 12 o'clock on the hour crossings) |
| 9.50 | 12:30:03.0 | real time (the star at 7.5; toast read 8.0–9.5) |
| 10.40 | 12:30:05.7 | ×3: the site's toast timer (3.2 s of clock after 7.5) ends at 9.9, before the roll |
| 12.50 | 12:30:07.8 | real time; the chronometer shows years 10.5–11.75, then "12:30 PM" again |
| 13.00 | 15:30:00.0 | **T2 time-lapse** (1, 2 and 3 o'clock) |
| 16.50 | 15:30:03.5 | real time (the star at 14.5; toast read 15.0–16.5) |
| 18.50 | SS (17:38:13) | **golden-hour time-lapse** (4 and 5 o'clock); **sunset flip frame** |
| 19.50 | SS + 1.0 s | real time |
| 19.90 | 17:52:00.0 | ramp while the camera swings to the phone; the card reads "In 23 min" |
| 22.50 | 17:52:02.6 | real time (the star at 20.5; toast read 21.0–22.5) |
| 24.50 | 18:15:00.0 | **countdown time-lapse**: 22 minute ticks between 22.5 and 24.5; **"Started" frame** |
| 34.50 | 18:15:10.0 | real time to the end (the share at 26.5; "Link copied" read 26.8–28.4) |

**Tick alignment.** The ramp ends at 18:15:00.000 exactly. Playwright's `runFor` fires timers due at the end of the interval,
so the site's tick at 18:15:00 runs in that frame. If a test shows the end is exclusive, end the ramp at 18:15:00.001. The
audit checks "Started" on the 24.5 s frame and "In 1 min" on the frame before.

The 16:9 mapping follows the same rule with its own cue times (§10.3).

### 7.4 The chronometer and the date (read, never typed)

The hidden `home` slot runs the home page on the same clock. Every frame the stage reads:
- `[data-tb-clock]`, e.g. "Saturday, December 19 · 7:16 AM". Its time part gives the chronometer digits ("7:16") and the
  meridiem ("AM").
- `[data-mast-date]`, e.g. "Saturday, December 19, 2026", set in caps as the title block's date.

The time-of-day word is `BUCKETS[bucket(hh:mm)]` from `site/js/lib/time.js`: "Morning", "Afternoon", "Evening".

During the Ybor timeline roll only, the chronometer shows the four-digit year parsed from the `.tl-year` of the timeline entry
at the phone's reading line (§8.3, S3), then returns to `[data-tb-clock]`.

### 7.5 Taps, dialogs, scrolls and toasts

- **Taps** are real DOM clicks dispatched in the device frame (`frame.locator(sel).dispatchEvent("click")` or `el.click()`),
  so the site's own listeners run. Coordinate clicks are not reliable through 3D transforms.
- **Visual cue**: a touch ripple (Cincy's `TAP_JS`) for the phone and the cursor for the laptop. The cue is drawn at the
  target's projected screen point: the element's center in iframe css px, mapped through the device's own transform matrix
  (the stage builds it, so it knows it), then perspective-divided.
- **Links that change page** (the dock's Trip tab) show the tap, then the next slot during a 3-frame crossfade. The trip slot
  was loaded at W(0) and has been following the stars through the storage event. This is Cincy's rule.
- **Scrolling** is `scrollTo` per frame, eased, on the element's own scroll container. Targets are computed at render time
  from element rects, never hard-coded:
  - Fort De Soto and Ybor: scroll so that the `.page-head [data-star]` center sits at viewport css y 330.
  - Water taxi: scroll the dialog's scrollable ancestor of `[data-xd-star]` to its end. The button then sits at about css
    y 612. The toast will cover it, which is true to the site, and the sources line "Sources: piratewatertaxi.com …
    Checked Sep 27, 2026" stays visible above.
  - What's On: scroll so that `#e-tampa-riverwalk-lighted-boat-parade-2026`'s top sits at css y 120, under the sticky tabs.
  - Trip: scroll so that `.trip-summary` sits at css y 190.
- **Dialogs**: the experience dialog is open from its deep link. The stage drives its rise (translateY 100% → 0, 0.3 s,
  `easeOut`) with an inline style, then removes it.
- **Toasts**: the stage drives the site's toast rise (opacity 0 → 1, translateY 12 → 0 css px over 0.2 s) inline, then
  removes the style. The site's own 3.2 s timer runs on the installed clock and ends each toast. The clock runs in real time
  from the tap until the toast has been read (§7.3). The stage never keeps a toast up and never hides one early.
- **The edition flips**: at the sunrise frame, `page.emulateMedia({ colorScheme: "light" })`; at the sunset frame,
  `"dark"`. The site's `matchMedia` listener sets `data-theme` in every device frame in that same frame. Nothing is stored,
  because no reader ever touched the toggle.
  - The renderer asserts that every device frame's `<html data-theme>` matches the expected edition from the flip frame on.
  - It also asserts that the toggle's `aria-label` switches from "Switch to the Night chart" to "Switch to the Day chart"
    (the words the title block uses, §9).

### 7.6 Captured pages and states, at a glance

| Slot | URL (private build) | Origin | Shown at (installed clock, Sat, Dec 19, EST) | Edition | State on screen | Real taps |
|---|---|---|---|---|---|---|
| `fds` | `places/fort-de-soto-park.html` | A | 7:14–7:16 AM | Night, then Day at SR | ribbon, h1, "Add to My Trip" → "In My Trip", toast, dock badge 1 | star |
| `ybor` | `places/ybor-city-historic-district.html` | A | 12:30 PM | Day | page head, heritage block (passing), `#timeline` (11 entries) | star |
| `pwt` | `experiences.html?x=pirate-water-taxi` | A | 3:30 PM | Day | dialog open: plate, "Departs from Tampa Convention Center", sources line, toast | star |
| `map` (laptop) | `map.html?layers=events&when=today` | B | 3:30 → 5:38 PM | Day, then Night at SS | the bay chart with today's event flags; 16:9: the Riverwalk panel | 16:9: the flag |
| `wo` | `whats-on.html?when=today` | A | 5:52 → 6:15 PM | Night | the parade card: "In 23 min" … "In 1 min" → "Started", toast, dock badge 4 | star |
| `trip` | `trip.html` | A | 6:15 PM | Night | "1 event · 1 experience · 2 places…", "Share my trip", "Link copied" | the dock's Trip tab; share |
| `shared` (16:9 laptop) | `trip.html#e=…;x=…;p=…` (the copied link) | B | 6:15 PM | Night | "A shared trip", then "Added 4 items to My Trip" and "4 in My Trip" | "Add 4 to my trip" |
| `home` (never shown) | `index.html` | A | the whole day | follows the system | `[data-tb-clock]`, `[data-mast-date]` feed the chronometer and the date | none |

**Not used, on purpose**:
- `?now=`: it prints "Test clock" on the home page and marks the clock as simulated. The installed Playwright clock gives the
  same instants with no label.
- `?theme=`: the flips must come from the system setting, which the site follows (§7.5).

---

## 8. The Reel, 9:16: 1080 × 1920, 30 fps, 34.5 s (1035 frames)

### 8.1 Layout grid

**The title block** (a chart's title block, and the Reel's running head) is an opaque panel, y 0–700, filled with `--bg`.
Devices slide under it. It follows the edition and flips in the same frame as the pages.

- **Bottom edge**: the label frame's double rule (2 px `--rule-ink` at y 688, a 3 px gap, 1 px at y 693), with 20 px
  corner stars (`--mask-corner`, `--corner-ink`) at x 24 and x 1056, y 690.
- **Row A** (y 256–300):
  - `site/img/brand/logo.svg` (the mark plus "Chartbook"; `role` removed), 44 px tall (about 235 px wide) at x 64.
  - At right, the date in Archivo caps 26 px, tracking 0.12em, `--text-muted`, right-aligned to x 940: "SATURDAY,
    DECEMBER 19, 2026".
- A 1 px `--border` hairline at y 314, from x 64 to x 1016.
- **Row B** (y 330–490):
  - The chronometer: Bodoni Moda 800, 170 px, tabular lining figures, `--text`, at x 64. Its digit columns roll vertically
    (an odometer) during time-lapses and carry `data-busy="1"` while rolling.
  - The meridiem: Archivo caps 44 px, baseline-aligned 16 px after the digits.
  - Right column, x 640–940:
    - line 1 (y 346–386): the time-of-day word, Archivo caps 34 px, `--gold-ink`;
    - line 2 (y 400–446): the sheet badge (the site's `.sheet-badge.lg` art, 66 × 39 px) and the sheet name in Archivo
      caps 28 px, `--sheet-<id>-ink`;
    - line 3 (y 456–496), S6 only: the live badge mirror (§8.3).
- **Row B2** (y 500–536): the record name in Archivo caps 30 px, `--text`, x 64–940.
- **Row C** (y 548–568), the **day rule**, a 16-hour strip from 5 AM to 9 PM across x 64–940:
  - night spans in `--surface-sunken`, the day span (SR to SS) in `--gold-tint`, hour ticks as 1 px `--border`;
  - a 16 px `--magenta` triangle marks "now", W(t);
  - each tapped stop adds its 28 px chart symbol above the rule at its clock time.
  - It is secondary texture with no labels.
- **Row D** (y 584–686), the **log line**: Bodoni Moda italic 540, 46 px, line-height 1.1, up to 2 lines, x 64–940, `--text`.
  The hook is the one exception: Bodoni Moda 700 roman, 60 px, one line.

**Device zone**: y 700–1920. Must-read content inside a device must land in y 700–1440. Toast pushes guarantee that.

### 8.2 The hook: the first 1.5 s, frame by frame

| t | Frame | What a muted viewer sees |
|---|---|---|
| 0.000 (f0) | cover still (§14), baked in as frame 0 | the composed cover |
| 0.033 (f1) | whole bay top-down, **Night chart** (gold coastline on bay navy, water lining, water names). Title block (Night): the logo, "SATURDAY, DECEMBER 19, 2026", **"7:14 AM"**, "MORNING", [GB] GULF BEACHES, "FORT DE SOTO PARK". A phone lies flat at Fort De Soto, its screen glowing with the page in the Night chart | a real map of Tampa Bay at night, a clock, the product's name |
| 0.03–0.50 | the camera dives (easeIn) toward Fort De Soto: `s` 0.108 → 0.5, pitch 0° → 30°. The chronometer rolls 7:14 → 7:15 → 7:16 (the minute flips land at 0.222 s and 0.444 s from W). The foreground rose passes | motion, the bay tilting into 3D |
| 0.231–0.588 | the **sunrise terminator** sweeps east to west across the table and uncovers the Day chart (cream land, blue water, navy coast) | light crossing the bay |
| **0.500 (f15)** | **the sweep crosses Fort De Soto. `emulateMedia(light)` flips the page in the phone to the Day chart. The title block flips to Day in the same frame. The chronometer "7:16" slams (scale 1.08 → 1 over 0.15 s)** | the whole picture turns to day on a single beat |
| 0.55–0.70 | the hook line slams into Row D: **"Sunrise to lighted boats."** (Bodoni 700, 60 px) | the promise |
| 0.50–1.20 | the camera settles (easeOut) to the reading pose over Fort De Soto: `s` 1.2, pitch 55° | depth: the chart receding behind the phone |
| 1.20–2.20 | the phone stands up (spring pose 0 → 1). Its page reads "SHEET 3 · GULF BEACHES · PARK" / **Fort De Soto Park** | the real site |
| 1.50 | everything above is settled except the standing phone | name, place, time, promise, product |

It reads muted inside half a second: a map everyone around the bay recognizes, a clock, and a flip from night to day. It
poses a question ("sunrise to lighted boats": how, where?) that the next 30 seconds answer.

### 8.3 Second by second

Bars at 120 BPM with a 0.5 s pickup: the downbeat of bar n is at 0.5 + 2(n − 1) s. Taps land on beats; cuts and flips land on
downbeats. **Bold** marks an accent.

| t (s) | Bar | Picture | Words on screen (§9 for sources) | Tap | Sound |
|---|---|---|---|---|---|
| 0.0–0.5 | pickup | S1 dive over the night bay | logo, date, "7:14 AM", MORNING, GB GULF BEACHES, FORT DE SOTO PARK | | ocean wash (dark, LPF 350 Hz), F-major night pad, three celesta glints |
| **0.5** | **1** | **sunrise flip** (§8.2) | "7:16 AM"; **"Sunrise to lighted boats."** at 0.55 | | **tres strum A major, brass swell, ship's bell pair E5 (0.5, 0.75), sub A1, ocean opens** |
| 1.2–2.5 | | the phone stands at Fort De Soto; hold from 2.2 | (as above) | | soft rising air |
| **2.5** | **2** | S2: the page scrolls (2.55–3.25) until "Add to My Trip" sits at css 330 | log line: **"Daily, 7 a.m. to sunset…"** | | guajeo (tres) in A, claves 3-2, maracas |
| 3.5 | beat 3 | ripple on the star | | **star `fort-de-soto-park`** | tap and "added" motif (E5 → A5 on 16ths) |
| 3.55–4.0 | | toast rises; push to 2.0 px per css px | phone: **"Added to My Trip · View"**; "In My Trip"; dock Trip badge "1"; the day rule's first landmark symbol at 7:16 | | |
| 4.0–5.5 | 3 | hold (the clock in real time; the toast is read) | | | tumbao bass and bongó enter at 4.5 |
| **5.5–6.5** | beat 3 | **T1 crossing** (§6.4): the phone lies down (5.6–5.8), glides along the course from Fort De Soto to Ybor while the camera rises (`s` 1.2 → 0.25 → 1.2, pitch 55° → 30° → 55°, yaw 0 → −10° → 0) and descends. The course draws behind the phone; the chronometer rolls 7:16 AM → 12:30 PM; the slot swaps fds → ybor at the apex; the phone stands at Ybor (6.25–6.6) | Row B2 → "YBOR CITY HISTORIC DISTRICT"; word → "AFTERNOON"; badge → TP TAMPA | | whoosh; **claves strike 8, 9, 10, 11 and 12 o'clock** at the hour crossings (A5 → E6 rising); E pedal |
| **6.5** | **4** | S3: the Ybor page head; scroll to the star (6.7–7.3) | log line: **"…founded in 1886 as a planned cigar-making town."** | | tres hit A; groove |
| 7.5 | beat 3 | ripple, toast, push (7.55–8.0) | "Added to My Trip · View"; badge "2" | **star `ybor-city-historic-district`** | added motif |
| 8.0–9.5 | **5** (8.5) | hold (real time; the toast is read) | | | full groove plus güiro |
| 9.5–10.4 | | pull back to the reading pose; a long eased scroll past the heritage block (NHL designation boxes blur past) to `#timeline`. The clock runs ×3, so the site's own toast timer ends at 9.9 | log line → **"In the timeline"**; Row B2 keeps the district's name | | güiro scrape under the scroll |
| **10.5–11.75** | **6** | **the timeline roll**: a piecewise-linear scroll puts entry k's top on the reading line (css y 120) at 10.5 + 0.125·k. The **chronometer shows the years**: 1885, 1886, 1887, 1891, 1891, 1905, 1908, 1931, 1965, 1974, 2002 (meridiem slot empty) | the years (live `.tl-year`) | | harmony to F#m; **one tres note per year on 16ths**, rising through F#m; clave cinquillo |
| 11.75–12.5 | | hold on the 2002 entry; at 12.0 the chronometer rolls forward to the present, "12:30 PM" | "12:30 PM" | | reverse swell into A at 12.5 |
| **12.5–13.0** | **7** | **T2 hop**: the phone lies down, slides to the Convention Center (a short hop inside L1); the clock runs to 3:30 PM; the slot swaps ybor → pwt | Row B2 → "PIRATE WATER TAXI"; badge TP TAMPA | | claves strike 1, 2 and 3 o'clock |
| 13.0–13.4 | | S4: the phone stands; the experience dialog rises (stage-driven) with its plate, "Pirate Water Taxi" and "Departs from Tampa Convention Center" | log line: **"Hop-on, hop-off water taxi on the Hillsborough River…"** | | guajira strum over A, E/G#, F#m, D (a descending river bass); river lap |
| 13.6–14.3 | | the dialog body scrolls to its end | phone: "Sources: piratewatertaxi.com … Checked Sep 27, 2026" | | |
| **14.5** | **8** | ripple; the toast rises over the button (as on the real site); push | "Added to My Trip · View" | **star `[data-xd-star]`** | added motif |
| 15.0–16.5 | | hold (real time; the toast is read) | | | |
| **16.5–18.4** | **9** | **golden hour**: the camera lifts and orbits (yaw 0 → +18°); the phone lies down at the Convention Center (the site's timer then ends its toast); the laptop's lid opens north of downtown (16.8–17.4); the camera faces the laptop and pushes into its screen (17.2–18.3). The map is on the Day chart with today's event flags; the chronometer rolls 3:30 → 5:38 PM | word → "EVENING" at the 5:00 PM crossing; Row B2 → "TAMPA BAY" | | band thins to tres tremolo, E pedal, brass crescendo; claves strike 4 and 5 o'clock; lid thump at 17.4 |
| **18.5** | **10** | **sunset flip**: `emulateMedia(dark)`. The laptop's map turns to the Night chart (gold coastline, bay navy); the table's terminator sweeps east to west across the laptop's base; the title block flips; the phone off-frame flips too | tag line 1 → **"SUNSET"**; chronometer **"5:38 PM"**; log line **"Day chart → Night chart"** (held to 19.9) | | **brass chord F major, ship's bell pair C6, sub F1, celesta enters, ocean becomes river** (A → F) |
| 18.6–19.9 | | hold on the gold map (real time to 19.5), then the camera swings down (yaw +18° → 0, 19.4–19.9) to the phone standing at the Riverwalk while the clock ramps to 5:52 | | | night guajeo in F from 19.5 |
| 19.9–20.4 | | S6: the phone (Night) shows What's On today at the parade card | log line: **"Tampa Riverwalk Holiday Lighted Boat Parade"** (Bodoni 700 roman 46 px, 2 lines); Row B2: **"6:15 PM · END TIME NOT LISTED"**; live badge mirror **"IN 23 MIN"** | | |
| **20.5** | **11** | ripple, toast, push | "Added to My Trip · View"; badge "4" | **star `tampa-riverwalk-lighted-boat-parade-2026`** | added motif C6 → F6 |
| 21.0–22.5 | | hold (real time; the toast is read) | | | night groove |
| **22.5–24.5** | **12** | **countdown**: 5:52 → 6:15 in 2.0 s. The site's timer ends the toast; the site's badge and the mirror count down every clock minute ("IN 22 MIN" … "IN 1 MIN") | mirror (live) | | **celesta rises one scale step per minute tick** (22 notes, F4 → F7: three octaves of the F major scale), crescendo |
| **24.5** | **13** | **"STARTED"**: the site's badge turns to its gold "Started" style; the mirror matches it; the day rule's flag lands at 6:15 | **"STARTED"** | | **tutti: tres, bass, bongó slap, brass F add9, a falling celesta cascade, ship's bell pair C6** |
| 25.4–25.5 | | ripple on the dock's Trip tab; slot → trip | | tap `nav.dock a[href="trip.html"]` (navigation) | |
| 25.5–26.4 | | S7: My Trip (Night), scrolled to the summary | phone: "1 event · 1 experience · 2 places. Saved in this browser, on this device." | | lighter groove |
| **26.5** | **14** | ripple on "Share my trip"; toast; push | toast **"Link copied"**; log line **"One day, one link."**; the link typesets under it (Archivo 24 px, 2 lines, texture) | **`[data-trip-share]`** | added motif as an arpeggio; faint typing ticks |
| **28.5–29.7** | **15** | **pull-back**: the phone lies down at the Riverwalk; the laptop's lid closes and it slides off the table's north edge; the camera rises to the whole bay top-down (`s` → 0.108, pitch → 0); the course glows; the 1,277 dots fade in (28.9–29.6) | Row D → counts (secondary): **"641 places · 414 places to stay"** / **"176 tours and trips · 589 events"** | | drums and bass drop; long whoosh; celesta glints scattered like boat lights, panned by dot x |
| **30.5** | **16** | S9 **end card** (§8.4) builds in | "Every entry links to its source."; URL; independence line; attribution | | **resolve F6/9 (tres, brass, bell pair C6); the clave's closing 2-side at 31.5 and 32.0** |
| 32.5–34.5 | 17 | still hold: the final poster (the loop's last frame) | | | sustain fades by 34.1; the ocean wash continues at loop level |

### 8.4 Key compositions (output px; normative)

**Cover / S1 settled (t 2.3)**:
- The title block as in §8.1: "7:16 AM", MORNING, GB GULF BEACHES, FORT DE SOTO PARK, the hook line.
- The phone standing at x 203–877, top at y 712. Visible in the safe window: the ribbon "SHEET 3 · GULF BEACHES · PARK"
  (about y 900), **"Fort De Soto Park"** (40 css px × 1.6 = 64 px, y 955–1085) and the lede start.
- The Day chart table recedes behind it: Mullet Key, Tierra Verde and Boca Ciega Bay in soft focus.

**S2 toast push (t 4.2)**:
- Phone at 2.0 px per css px.
- The pressed button "In My Trip" (magenta fill) at y about 860–960.
- "GB GULF BEACHES · Park" and the "SIGNATURE" seal above it.
- The toast "Added to My Trip · View" at y 1250–1370 (text at 16 css × 2.0 = 32 px, secondary to the log line).
- The dock's Trip badge "1" at y about 1420–1450 (texture).

**S3 timeline roll (t 11.0)**:
- The chronometer "1905" (a year).
- The phone mid-scroll through the vertical `ol.timeline`: red landmark dots, the Bodoni year heads, titles.
- The log line "In the timeline".

**S5 sunset (t 18.8)**:
- The laptop's screen fills x 40–1040, y 720–1370: the Night map, gold coast, "THE BAY CHART", today's flags.
- Behind it, the chart table has just turned to Night.
- Title block: "5:38 PM", SUNSET, "Day chart → Night chart".

**S6 started (t 24.8)**:
- The phone at 2.0 px per css px: the parade card with its date box "SAT 19 DEC", the SIGNATURE seal, the title, "6:15 PM ·
  end time not listed", the gold **STARTED** badge and "Tampa Riverwalk".
- Mirror: "STARTED".

**S9 final frame (t 34.5)**:
- The **whole bay, Night chart**, top-down under the title block:
  - the magenta course from Fort De Soto to the Riverwalk, with its four symbols;
  - the tiny phone lying at the Riverwalk;
  - the dots.
- **The title block**:
  - Row A is empty.
  - Row B: `design/brand/wordmark.svg` (stacked "TAMPA BAY" over "Chartbook", `--wordmark-accent` gold), 150 px tall,
    centered, y 320–470.
  - Row D: the counts, as in S8.
- **A paper cartouche plate** over the chart: `--surface`, concave corners (`.cartouche`, `--n` 16 px), a double-rule
  inset, x 64–940, y 1130–1436. It holds lines centered on the safe zone's axis (x 502):
  - "Every entry links to its source." in Bodoni Moda italic 46 px, `--text`, y 1150–1206;
  - **"fritzhand.github.io/visit-tampa-bay"** in Figtree 650, 44 px (about 800 px wide, x 102–902), `--link` (Night gold),
    with a 3 px `--accent` underline, y 1230–1284;
  - "Independent guide. Not affiliated with any" / "tourism office, venue or operator." in Figtree 400, 34 px,
    `--text-muted`, y 1306–1390;
  - the map attribution (the site's `ATTRIBUTION`, first sentence plus "© OpenStreetMap contributors, ODbL") in Figtree
    22 px, `--text-faint`, y 1400–1426. It is fine print, `data-zone="free"`.
- The Row B lockup is centered on x 502 as well, so the whole card shares one axis inside the safe zone.

---

## 9. Every word on screen, with its source

The renderer reads each item at render time and fails if it cannot find it, or if what it finds differs from what the cue
expects. "Live" means read from the device's DOM in the frame being drawn.

### 9.1 Stage type (the title block, the end card)

| Line | Source | How it is read |
|---|---|---|
| The lockup "Chartbook" (Row A) and the stacked "TAMPA BAY / Chartbook" (end card) | `site/img/brand/logo.svg`, `design/brand/wordmark.svg`; the name is `site.config.json` `siteName` "Tampa Bay Chartbook" | file contents |
| "SATURDAY, DECEMBER 19, 2026" | live: hidden `home` slot, `[data-mast-date]` ("Saturday, December 19, 2026"), set in caps | per frame |
| Chronometer "7:16" and "AM" | live: `home` slot, `[data-tb-clock]`, the text after " · " (the site's `fmtTime`) | per frame |
| Chronometer years "1885" … "2002" | live: `ybor` slot, `#timeline li .tl-year` of the entry at the reading line, first `\d{4}` | per frame, S3 roll only |
| "MORNING", "AFTERNOON", "EVENING" | `BUCKETS[bucket(hh:mm)]`, `site/js/lib/time.js` (the What's On time-of-day words), in caps | computed from W(t) |
| Sheet badge and name: "GULF BEACHES", "TAMPA" | the badge art from the site sprite (`#b-<region>`); the name is the page's `.page-head .sheet-badge` text ("Gulf Beaches", "Tampa"), in caps | live, from the scene's slot |
| "FORT DE SOTO PARK", "YBOR CITY HISTORIC DISTRICT" | live: the slot's `h1`, in caps | per scene |
| "PIRATE WATER TAXI" | live: `pwt` slot, the experience dialog's title, in caps | |
| "TAMPA BAY" (S5 Row B2) | `design/brand/wordmark.svg`'s "TAMPA BAY" label, the site's own region name on its masthead ("Sheets 1–6 · Tampa Bay", home `.mast-line .side`) | built home page |
| "Sunrise to lighted boats." | **hand-written** (the hook). "Lighted boats" condenses the event title "Tampa Riverwalk Holiday Lighted Boat Parade". Sunrise is the computed instant shown on the clock | — |
| "Daily, 7 a.m. to sunset…" | live: `fds` slot, the "At a glance" `dd` after `dt` "Hours" (= `places.json#fort-de-soto-park.hours_text`, "Daily, 7 a.m. to sunset; open all year."), its first clause (up to the semicolon) with a trailing ellipsis | assert the `dd` equals the data and starts with the clause |
| "…founded in 1886 as a planned cigar-making town." | live: `ybor` slot, `.page-head .lede`, the substring from "founded" to the end of the first sentence, with a leading ellipsis | assert the substring exists |
| "In the timeline" | live: `ybor` slot, `#timeline-h` | |
| "Hop-on, hop-off water taxi on the Hillsborough River…" | live: `pwt` dialog summary (= `experiences.json#pirate-water-taxi.summary`), its first 8 words, with a trailing ellipsis | assert the prefix |
| "SUNSET" | **hand-written** label, shown only on the computed sunset frame onward in S5 | — |
| "Day chart → Night chart" | live: the laptop's `[data-theme-toggle]` `aria-label` before the flip ("Switch to the Night chart") and after it ("Switch to the Day chart"): the words after "the". The arrow is ours | read both, per frame |
| "Tampa Riverwalk Holiday Lighted Boat Parade" | live: `wo` slot, `#e-tampa-riverwalk-lighted-boat-parade-2026 .ev-title` (= `events.json` `title`) | |
| "6:15 PM · END TIME NOT LISTED" | live: the same card's `.ev-when` text before `.ev-status`: "6:15 PM" and `.unk` "end time not listed", in caps | |
| "IN 23 MIN" … "STARTED" | live: the same card's `.ev-status` text, in caps, every frame (the site's `liveState()` words) | must equal the card in the same frame |
| "One day, one link." | **hand-written** | — |
| The link (texture) "fritzhand.github.io/visit-tampa-bay/trip.html#e=…;x=…;p=…" | the phone's clipboard after the real share (`navigator.clipboard.readText()` in origin A), with origin A's host and path prefix replaced by `siteBase` without `https://`. It must equal `siteBase + "trip.html#" + tripHash({ e: [parade], x: [taxi], p: [fds, ybor] })` from `site/js/lib/share.js` | assert |
| "641 places · 414 places to stay" / "176 tours and trips · 589 events" | the numbers from `load()` `db.counts`; the nouns and their order from the built home `p.mast-dek` ("641 places, 414 places to stay, 176 tours and trips and 589 events on six sheets…"). Middots replace the commas and "and" | assert the dek's numbers equal the loader's |
| "Every entry links to its source." | the built footer, `.footer-indep` text after the bold independence line (`SOURCED` in `build/core/shell.mjs`) | |
| "fritzhand.github.io/visit-tampa-bay" | `site.config.json` `siteBase`, minus `https://` and the trailing slash | |
| "Independent guide. Not affiliated with any tourism office, venue or operator." | the built footer, `.footer-indep b` (`INDEPENDENCE` in `build/core/shell.mjs`) | |
| Map attribution (fine print) | the built `map.html`'s attribution line (`ATTRIBUTION` in `build/pages/map.mjs`) | |

### 9.2 Inside the devices (all live, all the site's own)

Everything visible inside a device is the real page at that clock. The lines the camera pushes in on, and which the story
leans on, are:
- Fort De Soto's h1 and ribbon;
- "Add to My Trip" and "In My Trip";
- the toasts "Added to My Trip · View" and "Link copied";
- the dock badge;
- Ybor's timeline years and titles;
- the dialog's "Departs from Tampa Convention Center" and its sources line;
- the parade card (the title, "6:15 PM", "end time not listed", the state badge, "Tampa Riverwalk", "Price not listed");
- the trip summary "1 event · 1 experience · 2 places. Saved in this browser, on this device.";
- the laptop's map ("THE BAY CHART", the flags) and, in 16:9, its panel "What's on here · Today · 6:15 PM Tampa Riverwalk
  Holiday Lighted Boat Parade" and the shared-trip callout "A shared trip / 1 event · 1 experience · 2 places." with the toast
  "Added 4 items to My Trip".

The phone chrome's status-bar time is the installed clock. Its address pill, "fritzhand.github.io", is device chrome.

### 9.3 Everything hand-made, the complete list

1. "Sunrise to lighted boats." (the hook)
2. "Sunset" (a label)
3. "One day, one link."
4. The arrow in "Day chart → Night chart", the middots in the counts, the three ellipses marking excerpts, and case changes to
   caps for labels.
5. Device chrome: the status-bar clock and the address pill.

---

## 10. The 16:9 cut: 1920 × 1080, 30 fps, 43.0 s (1290 frames)

Same day, same taps, same clock anchors and the same score material, re-timed. Four things change.

### 10.1 Layout

- **The title block becomes a left column**: x 0–720, opaque `--bg`, the double rule on its right edge (x 712–720) with
  corner stars.
- Content sits at x 96–664:
  - Row A (y 64–112): the logo, 48 px;
  - the date (y 128–156): Archivo caps 24 px;
  - Row B (y 176–396): the chronometer, Bodoni 800, 200 px, with the meridiem in Archivo caps 52 px;
  - Row B2 (y 410–456): the time-of-day word (Archivo caps 30 px, `--gold-ink`), then the sheet badge and name;
  - Row B3 (y 468–548): the record name, Archivo caps 30 px, up to 2 lines. In S6 it holds "6:15 PM · END TIME NOT LISTED"
    and, under it, the live badge mirror ("IN 23 MIN" → "STARTED", Archivo caps 34 px); the event title goes in Row D;
  - Row C (y 560–600): the day rule, **with** hour labels "6 AM", "12 PM", "6 PM" (Archivo 24 px);
  - Row D (y 620–860): the log line, Bodoni italic 52 px, up to 4 lines;
  - Row E (y 880–950): the page's source line in Figtree 24 px, `--text-muted`, read live from the slot's `.source-line`
    (e.g. "Source: pinellas.gov · Checked Sep 27, 2026"). The 9:16 has no room for it.
- **Device zone**: x 720–1920.
  - Phone reading pose: 1.1 px per css px, x 1060–1521, the top at y 60 (the whole 710 css viewport visible, y 132–913).
    Toast pushes go to 1.6 px per css px, panned so the pushed region sits in y 120–960.
  - Laptop reading pose: 0.72 px per css px (the screen 1037 × 648 px), centered at x 1320, y 150–798. Push to 1.0 for its
    clicks.
  - Perspective origin: (1320, 540).
- **Safe area**: must-read inside x 96–1824, y 60–960 (YouTube's bottom bar and captions, LinkedIn's controls).

### 10.2 Added beats

1. **Six sheets** (2.5–3.75): the whole bay stays in view after sunrise.
   - The six sheet badges (TP, SP, GB, CW, AB, DT) drop onto the chart on 8ths, at the positions the built home page's chart
     index uses (read from `docs/index.html`'s index-of-sheets markup; Day Trips at its outlying-edge marker).
   - Log line: "Sheets 1–6 · Tampa Bay" (home `.mast-line .side`).
   - A tres pluck plays for each badge.
2. **The laptop gets a scene** (19.5–25.9): the lid opens and the sunset flips the map. Then the cursor glides to the
   Riverwalk's flag and **clicks it** (a real click on the map's marker button for the event group at `tampa-riverwalk`).
   - The map's own panel opens: "What's on here · Today", "6:15 PM", "Tampa Riverwalk Holiday Lighted Boat Parade".
   - The map's own zoom plays on the video clock.
3. **The link lands on the laptop** (34.3–37.5): after "Link copied" has been read, a magenta course-line arc draws from the
   phone to the laptop (0.5 s). The laptop's `shared` slot navigates to the share link on origin B.
   - The site shows **"A shared trip"** and "1 event · 1 experience · 2 places.".
   - The cursor clicks **"Add 4 to my trip"** (`[data-trip-add-all]`, real). Toast: **"Added 4 items to My Trip"**. The
     sidebar card reads "4 in My Trip".
   - This is the site's only cross-device path, shown honestly: a separate browser, reached by the link.
4. **Row E** carries each page's own source line all the way through (the 9:16 has no room for it).

**Optional, +2.0 s (only if the owner wants a 45 s cut)**: after the Fort De Soto toast has been read, the camera pulls back
over Mullet Key. The site's passage "A day at Fort De Soto" (`routes.json#fort-de-soto-day`) draws its course through its
five stops' symbols. The log line gives its title and the passages page's row meta ("5 stops · 4.5 mi in straight lines", live
from `passages.html`).

### 10.3 Timeline

Bar n's downbeat is at 0.5 + 2(n − 1); bar 20 is at 38.5 and the cut ends at 43.0. The toast rule (§7.3) applies: the clock
runs in real time from each tap until its toast has been read.

| t (s) | Bar | Scene | Key events |
|---|---|---|---|
| 0.0–4.5 | pickup–2 | S1 sunrise and six sheets | **flip 0.5**; hook 0.55; badges 2.5–3.75 on 8ths; dive to Fort De Soto 3.75–4.5; phone stands 4.1–4.6 |
| 4.5–7.5 | 3–4 | S2 Fort De Soto | scroll 4.6–5.2; **star 5.5**; push 5.55–6.0; toast read 6.0–7.5 |
| 7.5–8.5 | 4 (half) | T1 crossing | → 12:30 PM; claves strike 8–12 o'clock |
| 8.5–15.5 | 5–8 | S3 Ybor | scroll 8.7–9.3; **star 9.5**; toast read 10.0–11.5; scroll to the timeline 11.5–12.4 (×3 clock); **roll 12.5–15.0 on 8ths** (11 years); present 15.25–15.5 |
| 15.5–16.0 | 8 (half) | T2 hop | → 3:30 PM |
| 16.0–19.5 | 8–9 | S4 water taxi | dialog 16.0–16.4; scroll 16.6–17.3; **star 17.5**; toast read 18.0–19.5 |
| 19.5–25.9 | 10–13 | S5 golden hour, sunset, the laptop | lid 19.7–20.4; push 20.2–21.8; clock → SS; **flip 22.5**; cursor 23.2–24.3; **click 24.5**; the panel holds |
| 25.9–31.5 | 13–16 | S6 the parade | swing and ramp to 5:52 PM (25.9–26.3), "In 23 min"; **star 27.0**; toast read 27.5–29.0; countdown 29.0–30.5; **"Started" 30.5** |
| 31.5–37.5 | 16–19 | S7 share and the laptop | dock tap 31.4; **share 32.5**; "Link copied" read 32.8–34.3; arc 34.3–34.8; shared view 34.8; **"Add 4" click 35.5**; toast read 35.8–37.3 |
| 37.5–38.5 | 19 (half) | S8 pull-back | the laptop closes and slides out; whole bay; dots; counts as four stat tiles (Bodoni 800 64 px numerals over Archivo caps labels) in the column from 37.8 |
| 38.5–43.0 | 20–21 | S9 end card | resolve 38.5; lockup (column, 180 px); "Every entry links to its source."; URL; independence line; attribution; final hold |

**16:9 clock anchors** (W between anchors: time-lapses `easeInOut`, otherwise linear):

| t (s) | W | Segment |
|---|---|---|
| 0.0 | 7:14:00.0 | load |
| 0.5 | SR | flip |
| 7.5 | SR + 7.0 s | real time |
| 8.5 | 12:30:00.0 | T1 |
| 11.5 | 12:30:03.0 | real time |
| 12.4 | 12:30:05.7 | ×3 |
| 15.5 | 12:30:08.8 | real time |
| 16.0 | 15:30:00.0 | T2 |
| 19.5 | 15:30:03.5 | real time |
| 22.5 | SS | golden hour |
| 25.9 | SS + 3.4 s | real time |
| 26.3 | 17:52:00.0 | ramp |
| 29.0 | 17:52:02.7 | real time |
| 30.5 | 18:15:00.0 | countdown; "Started" |
| 43.0 | 18:15:12.5 | real time |

**16:9 cover**: the frame at 23.1 s: the laptop's Night map in gold, the phone lying lit at the Convention Center, and the
column reading "5:38 PM", SUNSET, "Day chart → Night chart". It is also baked in as frame 0.

---

## 11. Typography and ornament (all from the design system)

**Faces.** The site's self-hosted fonts, loaded from the private build's `assets/fonts` through `assets/site.css`:
- Bodoni Moda (the chronometer and titles: 800 and 700; log lines: italic 540);
- Figtree (URL and body);
- Archivo (all caps labels: 680, `font-stretch` 108%, tracking 0.12em; the date at 125% with `--track-label-wide`).

The chronometer uses `font-variant-numeric: tabular-nums lining-nums`, "the cigar-label numeral" (DESIGN §5).

**Sizes.**

| | 9:16 | 16:9 |
|---|---|---|
| Must-read stage type | ≥ 44 px (the log line 46, the hook 60, the chronometer 170) | ≥ 40 px |
| The end card's independence line | ≥ 34 px (read as fine print, as in Cincy's end card) | ≥ 30 px |
| Secondary | ≥ 24 px | ≥ 22 px |
| Fine print | only the attribution (22 px), marked `data-zone="free"` | same |

**Color.** Only token values, read from the built `assets/site.css` (the stage links it and sets `data-theme` on its own
`<html>`):
- gold for ornament only (`--gold` rules, corner stars), plus `--gold-ink` for the time-of-day word;
- magenta for the course and the "now" marker;
- each sheet's ink only on its own badge, name and symbol ring.

The device materials (the phone's band, the laptop's aluminum) are the only literal colors, as in Cincy's phone drawing.

**Ornament.**
- The title block is a label frame: the double rule and four-point corner stars (DESIGN §7), one frame on screen.
- The water-lining rule sits under the end-card lockup: `hr.wl`, drawn with `--water-line` echoes at 5, 9, 14 and 21 px.
- The compass rose sits on the table's corner, and in the foreground during flights.
- There is no ribbon on stage (the pages carry their own), and never a texture image.

**Motion language.**
- Type slams (scale 1.08 → 1 and opacity 0 → 1 over 0.15 s, `easeOut`), then holds dead still.
- The chronometer rolls like an odometer; it never fades.
- Edition flips are single-frame, except the table's terminator sweep.
- Devices move physically (springs, hinges, glides); the camera moves in 3D.
- No crossfades between scenes. Slot swaps happen only on a lying, small phone.

---

## 12. The score

### 12.1 Spec

- **120 BPM, 4/4, son clave 3-2.** A 0.5 s pickup; the downbeat of bar n is at 0.5 + 2(n − 1) s. A beat is 15 frames; every
  accent lands on a frame boundary.
- **Keys**: the night pickup is in **F major**. Sunrise modulates up a major third to **A major** (day). Sunset turns down a
  major third back to **F major** (night). The end card resolves on **F6/9**, so the last bar flows back into the night
  pickup: a musical loop.
- **Written to picture**: every cue comes from the cut's cue list (`collateral/lib/promo-cues.mjs`), the same file that
  drives the picture. Hour strikes, year notes and countdown notes are placed at the instants the clock mapping W(t) crosses
  an hour, a timeline entry or a minute, so each sound lands on its frame.
- **Loudness**: −14 LUFS integrated (±0.5), ≤ −1.0 dBTP, LRA ≤ 8 LU; 48 kHz stereo; AAC 256 kb/s.

### 12.2 Instruments (all synthesized; extend Cincy's `collateral/lib/synth.mjs`; the noise is seeded)

| Name | Model | Use |
|---|---|---|
| `tres` | Karplus-Strong, two strings per course (unison ±3 cents); the middle course also doubled an octave lower. A pluck-position comb (β = 0.13), a damping low-pass, a body with two resonant peaks (240 Hz Q 2, 1.1 kHz Q 3). `tresStrum` staggers strings 14 ms | guajeo, strums, the year notes, "added" motifs |
| `bass` | a sine plus a low-passed triangle, a short pitch scoop (−30 cents over 25 ms) on attack, round decay | tumbao |
| `clave` | modal: two damped sines (2.45 kHz, 3.9 kHz; τ 28 and 12 ms) plus a 1 ms click | 3-2 clave, hour strikes |
| `bongo` | membrane modes with pitch drop: macho 420 → 395 Hz, hembra 300 → 282 Hz, plus inharmonic modes (×1.59, ×2.14); `slap` adds band-passed noise | martillo, accents |
| `maracas` | high-passed noise bursts (a 3 ms attack, 40 ms decay), alternating seeds | 8ths |
| `guiro` | a scrape: a train of 1 ms noise clicks at 70–110 Hz rate through a 2.8 kHz band-pass, with long-short-short phrasing | scroll moments |
| `brass` | a section of three voices, each 3 detuned saws, a low-pass with a fast "blat" envelope (cutoff 600 → 3200 Hz in 40 ms, then 1400 Hz), 5 Hz vibrato after 0.3 s | sunrise swell, golden hour, sunset chord, end chord |
| `celesta` | FM 1:1 with a ×4 partial, decay 0.8 s, soft hammer | night glints, the countdown scale, the cascade, the dots |
| `shipsBell` | eight inharmonic partials (ratios 0.5, 1, 1.183, 1.506, 2, 2.514, 2.662, 3.011; decays 3.2 → 0.4 s), a strike transient | pairs at sunrise (E5), sunset, "Started" and the end card (C6) |
| `ocean` | two decorrelated pink noises (70% correlated), a low-pass swelling 250 → 1800 Hz on a 6.4 s wave (±15% seeded jitter) | the Gulf, day |
| `river` | band-passed noise (400–2500 Hz) with short 1.1 s laps, −6 dB under `ocean` | the Hillsborough, night |
| `woodTick` | a modal block (1.2 kHz, 1.9 kHz) | faint typing ticks |
| `tap`, `whoosh`, `thump`, `riser` | Cincy's, retuned to the key | taps, flights, the lid, the "back to the present" swell |
| trackpad `click` (16:9) | a 4 ms mid-frequency thump plus a 1 ms high click | laptop clicks |

### 12.3 Arrangement, bar by bar (Reel)

The guajeo in A (one chord per half bar, 8ths, accents on the "and"s):

| Half bar | Chord | 8ths |
|---|---|---|
| 1 | A | A4 E5 C#5 E5 |
| 2 | D | D5 A4 F#5 A4 |
| 3 | E | E5 B4 G#5 B4 |
| 4 | D | F#5 D5 A4 D5 |

The night guajeo is the same shape in F (F, B♭, C, B♭). The tumbao anticipates each chord: its root on "2&", then the root or
fifth on "4". The clave is 3-2: the 3-side on beats 1, 2&, 4; the 2-side on beats 2, 3.

| Bar (t) | Section | Parts | Picture hits |
|---|---|---|---|
| pickup (0.0) | Night | ocean (LPF 350 Hz), F pad (F2 C3 A3, `brass` at pp with the filter closed), celesta C6 A5 F5 on 8ths | the night bay |
| **1 (0.5)** | **Sunrise** | tres strum A (A2 E3 A3 C#4 E4 A4), brass swell A (A3 C#4 E4, a 0.3 s attack), **ship's bell pair E5 (0.5, 0.75)**, thump A1, ocean LPF 350 → 2400 Hz over 0.8 s | the sweep crosses Fort De Soto; the chronometer slams |
| 2 (2.5) | Morning | guajeo (A–D / E–D), clave (mp), maracas; the "added" motif at **3.5** (tres E5, A5 on 16ths) plus a tap | star 1 |
| 3 (4.5) | Morning | plus tumbao and bongó martillo; from **5.5** the crossing: whoosh (1.0 s, 400 → 3000 Hz), E pedal (bass E2, tres tremolo on E), **claves at the 8, 9, 10, 11 and 12 o'clock crossings** (A5, B5, C#6, D6, E6) | T1 |
| 4 (6.5) | Midday | tres hit A at 6.5; full groove plus güiro; the added motif at **7.5** | Ybor; star 2 |
| 5 (8.5) | Midday | groove; güiro scrape under the timeline scroll (9.5–10.4) | the toast read, the scroll |
| **6 (10.5)** | **Timeline** | harmony F#m (10.5–11.5), D (11.5–12.0), E (12.0–12.5); **tres year notes at 10.5 + 0.125k** (F#4 A4 C#5 F#5 A5 A5 C#6 F#6 A6 C#7 F#7; the two 1891s repeat a note); clave cinquillo; a riser 12.2–12.5 | the roll, then back to the present |
| 7 (12.5) | Hop, then Water | whoosh (0.4 s); claves at 1, 2 and 3 o'clock; from 13.0 a guajira strum over A, E/G#, F#m, D (bass A2 G#2 F#2 D2), river lap in, ocean down | T2; the dialog |
| 8 (14.5) | Water | as bar 7; the added motif at **14.5** | star 3 |
| 9 (16.5) | **Golden hour** | tres tremolo, bass pedal E2, brass crescendo E7sus4 → E7 (a filter opening over 1.9 s), claves at 4 and 5 o'clock, a lid thump (E2) at 17.4 | the laptop opens |
| **10 (18.5)** | **Sunset** | **brass F major (F3 A3 C4 F4) fp then swell, ship's bell pair C6 (18.5, 18.75), thump F1, celesta glints (F pentatonic), ocean → river**; from 19.5 the night guajeo in F | the Night chart |
| 11 (20.5) | Evening | the night groove (clave, soft bongó, tumbao in F); the added motif at **20.5** (C6, F6) | star 4; the toast read |
| 12 (22.5) | **Countdown** | the groove thins to clave and tres; **celesta F major scale, one note per clock-minute tick, 22.5–24.5** (22 notes, F4 → F7: three octaves of the F major scale), crescendo | "IN 22 MIN" … "IN 1 MIN" |
| **13 (24.5)** | **Started** | tutti: tres strum F, bass F2, bongó slap, brass F add9, a falling celesta cascade C7 → F5 on 16ths over 0.5 s, **ship's bell pair C6** | "STARTED" |
| 14 (26.5) | Share | the groove softer; added arpeggio C6 F6 A6 on 16ths at **26.5**; typing ticks (one per two characters, 26.75–27.5, −30 dB) | "Link copied" |
| 15 (28.5) | **Pull-back** | drums and bass out; whoosh up (1.2 s); celesta glints, 40 seeded notes of F pentatonic, panned by each dot's x, 28.9–29.6; ocean returns | the whole bay |
| **16 (30.5)** | **End card** | **F6/9 (F2 C3 A3 D4 G4): tres strum, brass pad, ship's bell pair C6**; the clave's closing 2-side at 31.5 and 32.0 | the end card |
| 17 (32.5–34.5) | Tail | the chord decays to −40 dB by 34.1; the ocean wash continues at the pickup's level to 34.5 | the loop joins at the night pickup |

**16:9**: the same sections at the 16:9 cue times (§10.3). The countdown there is 1.5 s (22 notes on the minute ticks). The
additions:
- six tres plucks for the six badges, one per sheet number on A-major degrees 1–6;
- trackpad clicks at 24.5 and 35.5;
- a soft paper swish as the map panel opens;
- a second "added" motif on "Add 4";
- the end-card resolve on bar 20 (38.5).

The sections stretch by whole bars; nothing is time-stretched.

### 12.4 Mix and loudness

- **Buses**:

  | Bus | Gain | Send | Filter | Duck |
  |---|---|---|---|---|
  | tres | 0.7 | 0.22 | hp 120 | |
  | bass | 0.8 | | lp 900 | 0.35 under the kick-like bongó slaps |
  | perc | 0.6 | 0.08 | hp 200 | |
  | brass | 0.45 | 0.3 | hp 180 | |
  | celesta | 0.4 | 0.38 | hp 400 | |
  | bell | 0.4 | 0.45 | | |
  | ocean/river | 0.35 | 0.1 | | |
  | sfx | 0.5 | 0.2 | lp 8 kHz | |

- One shared room: Freeverb, size 0.78, damp 0.4, predelay 20 ms.
- Effects sit 6–10 dB under the music and are pitched to the key.
- **Master**: hp 30 Hz, a glue compressor (2:1 over −16 dBFS).
  - Then pass 1 measures loudness with ffmpeg `ebur128=peak=true`, and a linear gain moves the mix to −14.0 LUFS.
  - Then a 4× oversampled look-ahead limiter (5 ms) with a −1.2 dBFS ceiling.
  - Pass 2 verifies: −14 ±0.5 LUFS, true peak ≤ −1.0 dBTP, no sample over −0.5 dBFS, DC offset under 0.001, and no clicks at
    section joins (the largest sample-to-sample step is under 0.25).
  - The render fails otherwise, and `collateral/lib/review-tools.mjs audio` prints the numbers.
- **Restraint**: no cymbal crashes, no riser longer than 0.5 s except the pull-back whoosh, and no sound on a text slam unless
  it is listed. Every idea must also read muted.

---

## 13. It reads with the sound off

- The clock tells the story: a 170 px chronometer, the site's own time-of-day words, and a day rule with a moving marker and
  the day's symbols.
- The editions carry day and night: two full-frame flips, each with a visible terminator sweep.
- Every tap shows its result in words: "In My Trip", "Added to My Trip · View", the dock badge, "Link copied" and, in 16:9,
  "Added 4 items to My Trip".
- The payoff is a word: "STARTED", after "IN 23 MIN" counts down in big type.
- The ending is a picture: the whole bay at night with the day's course, then the address.
- Captions: each cut ships an `.srt` holding the log lines, the key toasts and the live words at their on-screen times,
  plus "[original score: son with claves, tres and a ship's bell]" at 0.0.

---

## 14. Covers

**9:16 cover (t 2.30, S1 settled at scale 1.0, nothing in flight)**:
- The title block: the logo, "SATURDAY, DECEMBER 19, 2026", **"7:16 AM"**, MORNING, GB GULF BEACHES, FORT DE SOTO PARK, the
  day rule with dawn just begun, and **"Sunrise to lighted boats."**
- Below: the phone standing on the Day chart at Fort De Soto, showing the real page head.
- It survives the profile grid's center 3:4 crop (y 240–1680): the title block's content lies in y 256–686.
- At grid size (about 1/3) the chronometer is still about 57 px and the hook about 20 px.
- It is exported as `cover-9x16.jpg` and **baked in as frame 0**, per Cincy (platforms that take a thumbnail from frame 0 get
  it). The one-frame jump from the cover to the night bay at frame 1 is invisible at 30 fps.
- **Alternate** (informational): t 18.8, the sunset over the gold map.

**16:9 poster (t 23.1)**: §10.3. It is exported as `poster-16x9.jpg` and also baked in as frame 0.

---

## 15. Images and credits

- **No photographs on the stage.** The table is the site's basemap rendered with its tokens, and the ornament is SVG.
- **Inside the devices**, as of writing, Fort De Soto Park, the Ybor City Historic District and the Pirate Water Taxi all show
  the site's typographic plates ("No rights-cleared photo yet: this plate stands in for one."). The event card, My Trip and
  the map show no photos. `data/images.json` holds 21 entries, and image processing is still running.
- **At render time**, the renderer lists every `<img>` visible in any device frame.
  - It fails if a `src` is not under the build's `assets/img/`, or has no `images.json` entry with a credit and license.
  - If an image covers ≥ 15% of a device viewport for ≥ 0.5 s, it adds an on-screen credit on the title block's bottom edge
    (Figtree 24 px, `--text-muted`, e.g. "Photo: Florida Memory / Wikimedia Commons (public domain)") for as long as the
    image shows.
  - Every image that appeared goes into the README's credits table: subject, creator, license, and the Commons page.
- **Map credit**: the basemap and OSM-derived coordinates are credited on screen in the end card's fine print, and in the
  README with the site's full `ATTRIBUTION` line and the ODbL link.

---

## 16. The per-frame audit, and the risks it covers

Every frame runs `AUDIT_JS` (Cincy's, extended). Elements that carry `data-read` are measured by their text's own line boxes.
Failures stop the render and write `.cache/promo/audit-<cut>.txt` plus the failing frame's PNG.

| Check | Rule |
|---|---|
| Reading time | each `data-read` line settled (opacity 1, unmoved, not `data-busy`) for max(floor, 0.3 s × words); the floor is 0.8 s for 1–3 words and 1.2 s otherwise; a clock time counts as 2 words and a URL as 3 |
| Safe zone | 9:16: x 64–940, y 250–1440 (the intersection of Instagram's and TikTok's overlays). 16:9: x 96–1824, y 60–960. `data-zone="free"` is exempt |
| Size | 9:16 must-read ≥ 44 px, the independence line ≥ 34 px, secondary ≥ 24 px; 16:9 ≥ 40, ≥ 30 and ≥ 22 |
| Fonts | `document.fonts.check` passes for Bodoni Moda 800, Bodoni Moda italic 540, Figtree 650 and Archivo 680 in the stage **and** in every device frame |
| Table sharpness | the camera's screen px per unit is ≤ 1.15 × the active LOD's texture px per unit over the visible table (computed from the camera, not the image) |
| Device text sharpness | at each reading pose, a 400 × 200 crop around the pushed element has a Laplacian variance ≥ 70% of the same region captured flat at the same scale |
| Live words | the S6 mirror equals the card's `.ev-status` text in the same frame; **"Now" never appears** on the parade card or in the dialog; "Started" appears on the frame where W = 18:15:00 and not before |
| Forbidden strings | no text visible in a device viewport, in any frame, contains "Test clock", "Loading today's listings", "TBA", "TBD" or "Something went wrong" (hidden list rows do not count); device consoles log no errors |
| Editions | every device `<html data-theme>` is dark before SR, light from the SR frame to the SS frame, and dark after |
| Taps | after each star, `aria-pressed="true"`, the toast text equals "Added to My Trip" plus "View", and `[data-trip-count]` equals 1, 2, 3, 4. After the share, the toast is "Link copied" and the clipboard equals the expected link. After "Add 4" (16:9), the toast is "Added 4 items to My Trip" |
| Determinism | frames 5, 250, 500 and 750 are re-rendered from a fresh context after the main pass; PSNR ≥ 50 dB against the first render |
| Images | §15 |

### 16.1 Reading-time table (Reel; the audit must reproduce it)

Settled means fully shown and still (a slam settles 0.15 s after it starts). Toasts after the first are marked secondary:
the pressed star and the dock badge already say the same thing, and each toast still passes its own time.

| Scene | Line | Words | Settled (s) | For | Needs | Pass |
|---|---|---|---|---|---|---|
| S1–S8 | logo "Chartbook" (secondary) | 1 | 0.03–30.4 | 30.4 | 0.8 | yes |
| S1–S8 | "SATURDAY, DECEMBER 19, 2026" (secondary) | 4 | 0.03–30.4 | 30.4 | 1.2 | yes |
| S1–S2 | "7:16 AM" | 2 | 0.65–5.5 | 4.85 | 0.8 | yes |
| S1 | "Sunrise to lighted boats." | 4 | 0.70–2.5 | 1.80 | 1.2 | yes |
| S1–S2 | "FORT DE SOTO PARK" (secondary) | 4 | 0.03–5.6 | 5.57 | 1.2 | yes |
| S2 | "Daily, 7 a.m. to sunset…" | 5 | 2.65–6.4 | 3.75 | 1.5 | yes |
| S2 | toast "Added to My Trip · View" (the first) | 5 | 4.00–5.6 | 1.60 | 1.5 | yes |
| S3 | "12:30 PM" | 2 | 6.65–10.5 | 3.85 | 0.8 | yes |
| S3 | "…founded in 1886 as a planned cigar-making town." | 8 | 6.65–10.4 | 3.75 | 2.4 | yes |
| S3 | "YBOR CITY HISTORIC DISTRICT" (secondary) | 4 | 6.10–12.5 | 6.40 | 1.2 | yes |
| S3 | toast (secondary) | 5 | 8.00–9.5 | 1.50 | 1.5 | yes |
| S3 | "In the timeline" | 3 | 10.55–12.5 | 1.95 | 0.8 | yes |
| S4 | "Hop-on, hop-off water taxi on the Hillsborough River…" | 8 | 13.30–16.5 | 3.20 | 2.4 | yes |
| S4 | toast (secondary) | 5 | 15.00–16.5 | 1.50 | 1.5 | yes |
| S5 | "5:38 PM" with "SUNSET" (one glance) | 3 | 18.65–19.5 | 0.85 | 0.8 | yes |
| S5 | "Day chart → Night chart" (secondary) | 4 | 18.70–19.9 | 1.20 | 1.2 | yes |
| S6 | "Tampa Riverwalk Holiday Lighted Boat Parade" | 6 | 20.05–25.4 | 5.35 | 1.8 | yes |
| S6 | "6:15 PM · END TIME NOT LISTED" | 6 | 20.05–25.4 | 5.35 | 1.8 | yes |
| S6 | "IN 23 MIN" (busy from 22.5, during the countdown) | 3 | 20.05–22.5 | 2.45 | 0.8 | yes |
| S6 | toast (secondary) | 5 | 21.00–22.5 | 1.50 | 1.5 | yes |
| S6 | "STARTED" (the mirror holds until 25.5) | 1 | 24.65–25.5 | 0.85 | 0.8 | yes |
| S7 | toast "Link copied" | 2 | 26.80–28.4 | 1.60 | 0.8 | yes |
| S7 | "One day, one link." (held to 28.9) | 4 | 26.65–28.9 | 2.25 | 1.2 | yes |
| S8–S9 | counts (secondary) | 12 | 29.00–34.5 | 5.50 | 3.6 | yes |
| S9 | "Every entry links to its source." | 6 | 30.70–34.5 | 3.80 | 1.8 | yes |
| S9 | "fritzhand.github.io/visit-tampa-bay" | 3 | 30.75–34.5 | 3.75 | 0.9 | yes |
| S9 | independence line | 12 | 30.80–34.5 | 3.70 | 3.6 | yes (fine print in the in-order read, as in Cincy) |

The end card's four lines slam in on 16ths from 30.5 (lockup, source line, URL, independence line), so all are settled by
30.8.

**In-order load** (the must-reads of each scene, read one after another):
- S1: clock 0.8 + hook 1.2 = 2.0 s from 0.65, done at 2.65. The clock stays to 5.5 and the hook to 2.5.
- S2: hours 1.5 + toast 1.5 = 3.0 s from 2.65, done at 5.65. The push holds until the phone lies down at 5.6.
- S3: clock 0.8 + Ybor line 2.4 + "In the timeline" 0.8. The first two are done by 9.85; the third is read 10.55–11.35.
- S4: 2.4 s in 3.2 s.
- S5: 0.8 s in 1.25 s (the Night-chart line is secondary).
- S6: 1.8 + 1.8 + 0.8 = 4.4 s from 20.05, done at 24.45, then "STARTED" 24.65–25.45.
- S7: 0.8 + 1.2 = 2.0 s from 26.65, done at 28.65 (the line holds to 28.9).
- S9: the source line and URL take 2.7 s from 30.7, done at 33.4. The independence line is fine print, as in Cincy's end card:
  it passes its own time, and the share copy repeats it.

### 16.2 Risks and checks

| Risk | Check or mitigation |
|---|---|
| The data changes before render (the parade moves or is cancelled; the hours, summary or schedule text change; a status changes) | §17 assertions. The render fails and names the field. It never keeps stale copy and never swaps the day by itself |
| Page-lane agents change markup (selectors, the What's On card, the dialog) | All selectors are read at render time. A missing selector fails with its name. Scroll targets come from rects, never fixed px |
| The live words differ at the planned minutes (the tick alignment) | Slots load at W(0) = 7:14:00.000, so ticks land on :00. The audit checks "IN 23 MIN" at W = 17:52 and "STARTED" at 18:15:00 |
| A toast dismissed early by a time-lapse, or kept up longer than the site keeps it | The toast rule (§7.3): real time from each tap until its toast has been read, and ×3 before content a toast would cover. The stage never touches a toast's lifetime. The audit fails if a toast leaves before the end of its reading window, or if any toast is visible over the timeline roll |
| CSS 3D and iframes: blur, z-fighting, no text rasterized at scale | Devices sit at depth 0 when read (parallel to the screen), so Chromium rasterizes them at scale. The sharpness audit catches misses. Fallback: `--dpr 2` renders at 2× and ffmpeg downsamples with lanczos (slower) |
| Memory and time with 6 large textures and 7 iframes on 4 shared CPUs | Textures are PNG at ≤ 4096 px, and only two LODs are ever visible. JPEG q 92 frames are piped straight to ffmpeg (libx264 crf 18, yuv420p, `+faststart`). Motion blur is limited to about 100 frames. The budget is about 5 min for the Reel and 7 min for the 16:9 |
| Clicks through 3D transforms land on the wrong element | Clicks are DOM-dispatched on the exact selector. The ripple and cursor are drawn from the projected rect. The audit checks `aria-pressed` and the toast after each tap |
| The clipboard is blocked in the iframe | origin A is same-origin with the stage (permissions inherit), and clipboard permissions are granted. The site's own `execCommand` fallback is also real. The link check reads the clipboard; if the read fails, it compares against `tripHash()` and the toast text |
| Implying cross-device sync | The phone and laptop use different origins (separate storage). The laptop shows the stars only after the share link (16:9); in the Reel it never shows the trip |
| Implying the site times the edition to the sun | It does not. The site follows the system setting. On screen the flip carries only the site's own words ("Day chart → Night chart") and the hand-written "Sunset" beside a computed time. The README says: "the phone is set to automatic appearance; the site follows it" |
| "Link copied" on an iPhone-looking phone (real iOS would open a share sheet) | The phone drawing is generic (no logo) and the behavior shown is the site's real fallback on browsers without the Web Share API. The README states it. No share sheet is ever drawn |
| Featuring one commercial operator (the water taxi) reads as an endorsement | It is shown only as the site shows it (with its sources line), and it is also a transit route on the site (`transport.json#pirate-water-taxi-route`). The end card's independence line covers it. No price appears on the stage |
| Sunrise and sunset accuracy | Two implementations agree within 3 min, or the render fails. The hand-written words sit only next to the computed time |
| Overuse of ornament | One label frame (the title block), no ribbons on stage, gold only as rules and stars. A reviewer checks this against DESIGN §13 |
| Reading overload in S5 and S7 | Handled in §16.1: the Night-chart line is secondary, and the S7 line is four words held to 28.9. The audit enforces every row |
| The loop joint | Frame 1 and the last frame share the camera (the whole bay, Night) and the ocean bed. Only the text differs |
| Frame 0 cover flash | Accepted, per Cincy. `--no-bake-cover` renders without it |

---

## 17. Render-time reads and assertions (fail on any mismatch)

- **`site.config.json`**: `siteName`, `siteBase` and `dataWindow` (Dec 19 lies inside it).
- **The build's own loader** (`load()` from `build/core/load.mjs`, read-only): `db.counts`, which must equal the numbers in
  the built home `p.mast-dek`.
- **`events.json#tampa-riverwalk-lighted-boat-parade-2026`**:
  - `date` = 2026-12-19, `start` = "18:15", `end` null, `place` = `tampa-riverwalk`, `featured` true;
  - `status` = "scheduled" (not cancelled, postponed, changed or tentative);
  - the title matches the card's.
- **`places.json#fort-de-soto-park`**:
  - `status` open;
  - `hours_text` starts with "Daily, 7 a.m. to sunset";
  - `status_note` does not mention Dec 19 or December 19;
  - the page's Hours `dd` equals `hours_text`.
- **`places.json#ybor-city-historic-district`**: `status` open; the lede contains "founded in 1886 as a planned cigar-making
  town"; `#timeline li` count ≥ 5, with years readable.
- **`experiences.json#pirate-water-taxi`**:
  - `status` open;
  - `departs_place` = `tampa-convention-center`;
  - `schedule_text` contains "Fri-Sun 11:30 a.m.-9:30 p.m.";
  - W at S4 (3:30 PM on Sat, Dec 19) lies inside those hours;
  - the summary starts with "Hop-on, hop-off water taxi on the Hillsborough River".
- **Sun**: `sun.mjs` sunrise at Fort De Soto and sunset at the Riverwalk agree with the second method within 3 min;
  SR < 7:30 and SS < 18:00 (Night before the parade).
- **Live DOM**, per cue (§16 "Taps", "Live words", "Editions"). When the `trip` slot is shown, it lists exactly the four
  records (it was loaded empty at W(0) and followed the stars through the storage event).
- **`map.html`**: the kicker "Plan · N on the chart" parses; `li.map-li[data-ll]` count = N; the in-bay subset is computed
  for the dots.
- **The share link** equals the expected `tripHash()`, and decodes (with `decode()` and the client codes) to exactly the four
  ids.
- **Every stage string** in §9.1 is found.

---

## 18. Render architecture (for the engineer)

**Files**, all under `collateral/`:
- `build-promo.mjs`: subcommands `all` · `reel` · `wide` · `stills <cut> <t1,t2,…>` · `audio [cut]` · `sheet <cut>` ·
  `check` (reads and assertions only, no frames).
- `lib/promo-cues.mjs`: the single source of timing, one cue list per cut. Scenes, W(t) anchors, camera keyframes, device
  poses, slot visibility, scroll targets, taps, text states and score cues.
- `lib/promo-world.mjs`: projection (imports `site/js/lib/geo.js`), texture LOD rendering and selection, course geometry,
  dot extraction from `map.html`, camera matrices and point projection.
- `lib/promo-stage.mjs`: the stage HTML and CSS (the title block, the table, devices, the cursor, the ripple), `render(t)`.
- `lib/promo-capture.mjs`: the server (origins A and B), the context, clock install, slot loading and warm-up, emulateMedia
  flips, taps, scrolls, inline motion for toasts and dialogs, clipboard reads.
- `lib/promo-audit.mjs`: `AUDIT_JS` (Cincy's plus size, fonts, forbidden strings, editions), sharpness, determinism, images.
- `lib/sun.mjs`: NOAA and the cross-check.
- `lib/promo-score.mjs` with `lib/synth.mjs`: Cincy's synth ported and extended with the §12.2 instruments.
- `lib/review-tools.mjs`: Cincy's contact sheet and audio report.

**Pipeline**:
1. Build privately: `TBC_OUT=.cache/out-promo node build.mjs`.
2. `check`.
3. Render the textures.
4. Per cut: a fresh context, load the slots at W(0), then the frame loop (write JPEGs to ffmpeg's stdin).
5. The audit report.
6. The score WAV, loudness passes, mux (AAC 256k, `-shortest`, 48 kHz).
7. Bake the cover.
8. Contact sheets (1 per second) and stills at every scene boundary.
9. Outputs to `collateral/promo-2026-09/`:
   - `tampa-bay-chartbook-promo-9x16.mp4` and `-16x9.mp4`;
   - `cover-9x16.jpg` and `poster-16x9.jpg`;
   - `promo-9x16.srt` and `promo-16x9.srt`;
   - `share-copy.txt`;
   - `README.md`: the idea, the scene tables, where every word comes from, sound, posting notes, image and map credits,
     rebuild commands.

---

## 19. Share copy (draft; the renderer fills the numbers)

> One Saturday on Tampa Bay, run through a guide that shows its sources: sunrise at Fort De Soto, Ybor City's timeline, the
> water taxi, and the Riverwalk's lighted boat parade at 6:15 PM on Dec 19. Tampa Bay Chartbook lists {641} places, {414}
> places to stay, {176} tours and trips and {589} events on six sheets, each linked to the page that states it. Star what
> you want; share the whole day as one link. fritzhand.github.io/visit-tampa-bay. Independent guide. Not affiliated with any
> tourism office, venue or operator.

Variants: Instagram (the link goes in the bio), LinkedIn (plus one line on how it is built: data files, a build that fails on
unsourced facts), YouTube (plus chapters at the scene boundaries).

---

## 20. Facts as of writing (Sep 28, 2026; all recomputed at render)

- **Build**: 1,123 pages. The data holds 641 places, 414 stays, 176 experiences, 590 event records (589 counted by the site;
  1 is cancelled), 106 series and 135 timeline entries.
- **Map**: "1,407 on the chart" (both charts); 1,277 rows lie inside the bay chart.
- **What's On, Sat, Dec 19**:
  - "Saturday, December 19 · 5 events"; the topbar pill reads "On today · 5".
  - The parade card reads "Today" before 5:45 PM, "In 23 min" at 5:52 PM and "Started" at 6:15 PM, with "end time not
    listed" and "Price not listed". Its source line is thetampariverwalk.com.
- **Fort De Soto**:
  - Hours: "Daily, 7 a.m. to sunset; open all year."
  - Page: "SHEET 3 · GULF BEACHES · PARK", with the Signature seal.
  - The toast is "Added to My Trip · View", and the button reads "In My Trip".
- **Ybor**: the "In the timeline" kicker reads "11 entries". The years are 1885, 1886, 1887, 1891, 1891, 1905, 1908, 1931,
  1965, 1974 and 2002.
- **Pirate Water Taxi dialog**: "Departs from Tampa Convention Center", "Sources: piratewatertaxi.com … Checked Sep 27,
  2026". The star is "Add to My Trip".
- **My Trip** (Night): "1 event · 1 experience · 2 places. Saved in this browser, on this device." · "Share my trip" · the
  toast "Link copied".
- **The share link**: `trip.html#e=uawd2;x=11o8d;p=bsnor,do9nm`. On a second origin it shows "A shared trip" and "Add 4 to
  my trip", then "Added 4 items to My Trip".
- **Laptop map** (1440 × 900): "PLAN · 1,407 ON THE CHART", "THE BAY CHART", the "What's on 115" layer, and the panel "What's
  on here · Today · 6:15 PM Tampa Riverwalk Holiday Lighted Boat Parade".
- **Sun**: sunrise at Fort De Soto 7:16:15 AM EST; sunset at the Riverwalk 5:38:13 PM EST (NOAA equations).
- **Images**: `images.json` holds 21 entries. None is for the four records in the day, so their pages show plates.

## 21. The hand-written lines, one list

"Sunrise to lighted boats." · "Sunset" · "One day, one link." That is all. Everything else on screen is read from the
built site, from `data/`, or from the installed clock through the site's own formatter.
