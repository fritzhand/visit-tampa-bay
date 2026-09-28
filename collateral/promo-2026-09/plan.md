# Final production plan: "Sunrise to Lighted Boats", rebuilt

**Tampa Bay Chartbook promo, September 2026.** This is the plan of record for the engineer. It supersedes the three
concepts in `concepts/`. Two cuts only: a **9:16 Reel, 1080×1920, 30.5 s (915 frames)** and a **16:9 video,
1920×1080, 41.5 s (1,245 frames)**, both 30 fps. There is no 4:5 cut: the owner does not want one, so none is planned,
built or rendered.

Written Sep 28, 2026. Every number marked "as of writing" was read from `data/`, from a private build of the current
tree (`TBC_OUT=.cache/out-promo node build.mjs`, 1,123 pages) and from Playwright probes on an installed clock
(scripts kept in `.cache/promo-plan/`: `probe*.mjs`, `spike*.mjs`). The renderer recomputes all of them at render
time and never prints a number from this file.

---

## 0. Summary for the engineer (read this first)

- **Winner by total score:** Concept 3, "Sunrise to Lighted Boats" (judge 1: 66, judge 2: 64; **130**), ahead of
  Concept 1, "The Chart Flight" (61 + 62.5 = 123.5) and Concept 2, "Under the Lid" (59 + 61 = 120). Both judges named
  it the winner: it is the only concept in which the real site does its job over time.
- **The film:** one real Saturday (Dec 19, 2026) runs through the real site on a phone lying on the site's own chart
  of Tampa Bay. It opens on the night chart, with the coast engraving itself in gold. The sun comes up across the bay
  and the site's Day chart appears. The day runs in three stops: sunrise at Fort De Soto Park, where you star it;
  Ybor City, where the page's own source line proves "Every entry links to its source"; and the Riverwalk's lighted
  boat parade. At sunset the device goes dark and the site follows. The parade card counts "IN 23 MIN" down to
  "STARTED" and never says "Now", because no end time is published. The day leaves as one share link. The 16:9 cut
  adds a laptop: a dock match onto the map page at sunset, a real map click, and the share link opened on a second
  browser ("Add 3 to my trip").
- **The world** is a WebGL2 chart table (the site's `basemap.svg` rendered with its tokens, mipmapped, both editions
  mixed by a terminator uniform), measured at 117–195 ms/frame. Live CSS-3D device iframes sit over it and share one
  camera matrix. A CSS-3D `<img>` table measured 0.7–1.1 s/frame in flights and is rejected (§4.7).
- **Every word** is read from the built site or `data/` at render time, except three hand-written lines (§9.3).
- **Every clock state is real.** The browser clock is installed at 7:14:00.000 AM and advanced frame by frame; the
  editions flip by `page.emulateMedia` (the site follows the system setting), never `?theme=` or `?now=`.
- **The score** is an original son montuno computed note by note: 120 BPM with a 3-beat pickup. It moves from F
  major (night) to A major at sunrise and back to F at sunset, and resolves on F6/9. The claves strike the hours, a
  celesta climbs one note per countdown minute, and the clave rhythm is the sign-off (§12). Target −14 LUFS, ≤ −1.0
  dBTP.
- **Fallback:** a scripted Plan B day (Sat, Dec 12: the Clearwater Holiday Lighted Boat Parade) lives in the same cue
  module. `check` validates both plans. `--day B` switches days; the renderer never switches on its own (§3.4).
- **Deliverables** go in `collateral/promo-2026-09/`: `tampa-bay-chartbook-promo-9x16.mp4` and `-16x9.mp4`,
  `cover-9x16.jpg`, `poster-16x9.jpg`, `thumb-1280x720.jpg`, `promo-9x16.srt`, `promo-16x9.srt`, `share-copy.txt` and
  `README.md`. Scripts: `collateral/build-promo.mjs` and `collateral/lib/*` (§17).

---

## 1. The idea

Tampa Bay Chartbook calls itself a chartbook, and its two editions are named for the time of day: the Day chart and
the Night chart. Its What's On speaks in clock words that only mean something at a given minute ("Today", "In 23
min", "Started"). So the promo does not describe the site. **It runs one real day through it, and the clock is the
camera's engine.**

What a stranger learns, in order (Reel):

| By (s) | They know | From |
|---|---|---|
| 0.9 | It is Tampa Bay Chartbook, an independent guide to Tampa Bay that links every entry to its source | the wordmark and the site's tagline over a chart of the bay |
| 1.5 | This is a day starting: the sun comes up across the real bay | the sunrise terminator and the clock line |
| 3.5 | The guide is cut into six numbered sheets | the six sheet badges stamping onto the chart |
| 7.5 | It is a real site on a phone; you star a place and it goes to My Trip | Fort De Soto Park, the tap, the site's toast |
| 13.5 | Every entry links to its source, and the page shows it | Ybor City's page scrolls to "Source: nps.gov · Checked Sep 27, 2026" |
| 22.9 | It knows what time it is and it is honest about it | "IN 23 MIN" → "STARTED" with "“Started”, never “Now”" |
| 26.1 | The whole day is one link | "Link copied" and "One day, one link." |
| 29.5 | How big it is, where it is, and that it is not official | 641 places, 414 places to stay, 589 events; the address; the independence line |

### 1.1 Why this beats Cincy Week's Reel

| Cincy Week, "The Interchange" (22 s) | This promo |
|---|---|
| A flat 2D stage and one phone pushed in 2D | A true 3D chart table (WebGL2, perspective, pitch, yaw, dolly). A phone lies on it like a game piece at each stop's real coordinates, stands up, and travels on a low flight across the bay |
| One live page, one tap | Four live pages on the phone and one live laptop (16:9); three stars, a share and, in 16:9, two laptop clicks. Every toast is the site's own |
| A pre-week clock chosen to avoid live states | The live states are the payoff: "IN 23 MIN" counts down to "STARTED" on the site's own card, and never "Now" |
| One Night flip drawn by the stage | Two edition flips done by the site's own code, following the device's appearance, mirrored by a terminator sweeping across the real bay |
| Two hand-written hook lines | Three short hand-written lines; every other word is the site's |
| Reading-time and safe-zone audit | The same audit made 3D-aware, plus a name guard, forbidden-string scans, tap and storage assertions, determinism, sharpness and a measured performance budget |

## 2. The non-negotiables, and how each is met

| Rule | How |
|---|---|
| Every count computed from `data/` at render time | `load()` from `build/core/load.mjs` (read-only) gives the counts. They are asserted equal to the built home page's `p.mast-dek` and `<meta name="description">` (§16.2) |
| Every sentence about the site read from the built site or data; hand-written lines few and listed | §9 lists every line with its selector or field. There are three hand-written lines (§9.3) |
| No "best", "#1", "ultimate", "official" | A word filter runs on every stage string: `best`, `#1`, `ultimate`, `official`, `top`, `must-see`, `world-class`, `award`, `voted`. It is case-insensitive and matches whole words (the URL's `visit-tampa-bay` passes) |
| Never Visit Tampa Bay's or any team's or venue's logo or name as ours | The only mark shown as ours is the site's own lockup (`design/brand/wordmark.svg`). A per-frame name guard (§16.1) fails the render if a tourism-office or team name is legible and settled anywhere on screen |
| Images: only the site's rights-cleared ones, credited | The stage uses no photographs (the table is the site's SVG basemap rendered with its tokens). Device frames are scanned for `<img>`. Prominent images get an on-screen credit; all get README credits (§15) |
| End card: the address and the independence line | `fritzhand.github.io/visit-tampa-bay` (`site.config.json` `siteBase`) and "Independent guide. Not affiliated with any tourism office, venue or operator." (the built footer's `.footer-indep b`) |
| An original score computed note by note | `collateral/lib/synth.mjs` and `promo-score.mjs`: deterministic synthesis, a seeded PRNG for all noise, no samples, no licensed audio (§12) |
| It must read with the sound off | §13 |
| Capture a private build of the current tree at render time; never write `docs/`; touch only `collateral/` and `.cache/`; never run git | `TBC_OUT=.cache/promo/site node build.mjs`, served by the renderer itself. Work files go in `.cache/promo/`, outputs in `collateral/promo-2026-09/` |

---

## 3. The day (plan of record)

### 3.1 Plan A: Saturday, December 19, 2026

| Clock (EST) | Stop (record id) | Sheet | Page in the phone | Real tap | Why the time is honest |
|---|---|---|---|---|---|
| 7:14 → 7:16 AM (sunrise) | `fort-de-soto-park` (place, signature, heritage) | 3 · GB | `places/fort-de-soto-park.html` | its star | Hours "Daily, 7 a.m. to sunset; open all year." The `status_note` names closures on Oct 18, Oct 31 and Nov 14 only. Asserted: no December date in it |
| 12:30 PM | `ybor-city-historic-district` (place, signature, heritage; source nps.gov) | 1 · TP | `places/ybor-city-historic-district.html` | its star | A district: no hours apply |
| 5:38 PM (sunset) | (the sun) | — | the phone (Reel) or the laptop's `map.html?layers=events&when=today` (16:9) | 16:9: a map click | Computed sunset at the Riverwalk (§3.3) |
| 5:52 → 6:15 PM | `tampa-riverwalk-lighted-boat-parade-2026` (event, featured) | 1 · TP | `whats-on.html?when=today` at `#e-tampa-riverwalk-lighted-boat-parade-2026` | its star | `date` 2026-12-19, `start` 18:15, `end` null, `status` scheduled |
| 6:15 PM | My Trip | — | `trip.html` | the dock's Trip tab, then Share my trip | The trip holds exactly the three starred ids |

**No commercial operator is featured.** The water-taxi stop is gone (a county park, an NPS-sourced National Historic
Landmark district and a public parade remain). The day's geometry, in basemap units from `project()` in
`site/js/lib/geo.js` with `metaOf(data/map.json)` (1 unit = 85.55 m as of writing):

| Point | lat, lng | units (x, y) | table px (×10) |
|---|---|---|---|
| Fort De Soto Park | 27.630054, −82.735749 | 246.3, 818.8 | 2463, 8188 |
| Ybor City Historic District | 27.9625, −82.441111 | 584.9, 386.7 | 5849, 3867 |
| Tampa Riverwalk (the parade's `place`) | 27.954353, −82.465467 | 556.9, 397.3 | 5569, 3973 |

The day's **course** is the straight dashed magenta line FDS → Ybor → Riverwalk (the site's course convention for
passages). It carries no distance, heading or time label and is drawn only on the table, never inside a device.

### 3.2 The toast rule (kept from the concept)

The site's toasts live `ms = 3200` on the site's own clock (`site/js/core/toast.js`, read at render time). The
installed clock runs at exactly 1 s per video second from each tap until its toast has been read (or, for texture
toasts, has been visible ≥ 0.8 s). Only then may a time-lapse start, and the site's own timer ends the toast. The
stage never holds a toast up and never hides one early.

### 3.3 Sunrise and sunset (computed, never typed)

`collateral/lib/sun.mjs` implements NOAA's solar-position equations (zenith 90.833°) from the records' own coordinates
and the date. It cross-checks each with a second method (the simple sunrise equation with refraction) and fails if
the two differ by more than 3 minutes. As of writing:

- Plan A: sunrise at Fort De Soto Park **7:16:15 AM EST**; sunset at the Tampa Riverwalk **5:38:13 PM EST**.
- Plan B: sunrise at Fort De Soto Park **7:12:04 AM EST**; sunset at the Clearwater Beach Marina **5:36:59 PM EST**.

It asserts `SR < 07:30` and `SS < start − 10 min` (the parade's countdown happens after dark).

**The evening anchor** is `A_eve = max(start − 23 min, the first whole minute ≥ SS + 1 s)`. This is the instant the
countdown scene opens on. For Plan A it is 17:52:00 (the card reads "In 23 min"). For Plan B it is 17:37:00, one
second after its computed sunset: the card also reads "In 23 min". If a future sunset calculation lands later, the
card simply reads fewer minutes, and the celesta plays one note per remaining minute crossing. The mirror always
copies the card, so no number on screen is planned by hand.

### 3.4 Plan B, the scripted fallback (never automatic)

The same cue templates, with these substitutions:

| | Plan A | Plan B |
|---|---|---|
| Date | Sat, Dec 19, 2026 | Sat, Dec 12, 2026 |
| Event | `tampa-riverwalk-lighted-boat-parade-2026`, 18:15, end null, place `tampa-riverwalk` (556.9, 397.3) | `clearwater-holiday-lighted-boat-parade-2026`, 18:00, end null, place `clearwater-beach-marina` (142.1, 368.1), sheet GB |
| Sunset point | the Riverwalk | the Clearwater Beach Marina |
| Evening anchor `A_eve` (§3.3) | 17:52:00 | 17:37:00 |
| Resting-scroll name guard | the "USF Bulls men's basketball vs. Kennesaw State" card is directly above | the "Lightning vs. Pittsburgh Penguins" card is directly above |

Fort De Soto and Ybor are unchanged. The golden-hour flight goes west across Old Tampa Bay instead of a short hop
(same duration, faster ground speed, still under the speed cap).

`build-promo.mjs check` validates both plans and prints a table. A render uses `--day A` by default. If Plan A fails
any assertion, the render stops, names the field, and prints "Plan B passes: re-run with `--day B`" (or why it does
not). It never swaps the day by itself and never keeps stale copy.

---

## 4. The world: table, devices, camera

### 4.1 Units

- **Basemap units:** the viewBox of `site/map/basemap.svg` (1000 × 1118).
- **Table px:** 1 unit = 10 table px. The table is 10000 × 11180 table px.
- **Screen px:** output pixels. The stage page runs at device scale factor 1 at the cut's size.

### 4.2 The chart table (WebGL2)

- **Canvas and pipeline.** A full-frame `<canvas>` (WebGL2) is the lowest layer of the stage. It draws one textured
  quad per level of detail (LOD) in table space, under the camera matrix of §4.5.
  - Textures use `LINEAR_MIPMAP_LINEAR` with `generateMipmap`. WebGL2 is required, because the textures are not powers
    of two; the spike confirmed that WebGL1 renders them black.
  - Headless Chromium provides WebGL2 through SwiftShader (verified: "ANGLE … SwiftShader Device").
- **Textures.** They are pre-rendered once per render into `.cache/promo/tex/` and cached by a hash of `basemap.svg`,
  the built `tokens.css` and `site.css`, and the label set.
  - Each is a page on origin A that links `assets/tokens.css` and `assets/site.css`, sets
    `<html data-theme="light|dark">`, and draws `<svg viewBox=…><use href="assets/map/basemap.svg#bm"/></svg>` with
    the same wrapper classes as `map.html`'s chart. It is screenshotted at the listed size.
  - The spike rendered a 4096 × 4580 texture in 1.4–5.4 s.

| Texture | Region (units) | Size (px) | px/unit | Editions |
|---|---|---|---|---|
| L0 | −30…1030 × −30…1148 (the chart plus a 30-unit paper margin carrying the site's graticule neatline, `.grat` recipe) | 4096 × 4550 | 3.86 | Day, Night, and Night "fill" (the Night texture with `.m-coast, .m-coast-minor, .m-lake-shore, .m-water-line` hidden; used only for the engraving) |
| L1 Tampa | 480…680 × 280…480 | 2048 × 2048 | 10.24 | Day, Night |
| L2 Fort De Soto | 170…330 × 740…900 | 2048 × 2048 | 12.8 | Day, Night |

- **Labels baked into the textures** (from `data/map.json` `labels`):
  - Water names with `minZoom ≤ 1.6` (Gulf of Mexico, Tampa Bay, Old Tampa Bay, Hillsborough Bay, Boca Ciega Bay) in
    Bodoni Moda italic 540, `--map-label-water`, 16 units tall in L0 and 6 units in L1/L2.
  - Towns (`city`, `town`, `minZoom ≤ 1`) in Archivo caps, `--map-label`, 8 units in L0 and 3 units in L1/L2.
- **LOD blend.** L1 and L2 fade in with alpha `smoothstep(3.0, 4.0, z)`, where `z` is the screen px per unit at the
  camera target. L0 never fades out.
- **Underlay.** The clear color is `--bg` (the chart paper), so the chart reads as a sheet lying on a table. At the
  top of the 9:16 frame, a flat `--bg` → transparent mist band covers y 0–300 behind the running head.
- **Shader uniforms:**
  - `termX` and `termFeather`: the terminator. Night is shown where the table x is east of `termX` at sunset (west of
    it at sunrise for Day). The feather is 30 units.
  - `grade`: a golden-hour mix toward `--gold-tint` of at most 0.16, on the table only.
  - `dof`: a mip-level bias from 0 to 2.0 for depth of field while a device is in a reading pose, easing in over 0.2 s.
    Table text is never must-read while `dof > 0`.
- **The overlay canvas** (2D, screen space, above the WebGL canvas and below the devices). Every frame it projects
  table-space geometry through the same matrix and draws:
  - **The course:** a dashed polyline in `--magenta`, width `clamp(2, 18 table px × local scale, 8)` px and dash
    `[12, 8] × width/3`. It draws on as the phone travels: the dash offset follows the phone's arc length.
  - **Stop symbols:** the site's sprite symbols (`landmark` for Fort De Soto and Ybor, both heritage; `flag` for the
    parade), drawn on a `--map-pin-bg` disc with a 3 px `--sheet-<id>-edge` ring. The size is
    `clamp(28, 120 table px × local scale, 72)` px. Each appears on its star tap.
  - **Dots**, in the pull-back only: every `li.map-li[data-ll]` of the built `map.html` whose point is on the chart,
    drawn as discs of radius `clamp(2, 7 table px × local scale, 5)` px in `--sheet-<data-r>` at 55% opacity. No number
    is printed on them. As of writing, 1,277 of the map's 1,407 rows qualify.
  - **The phone's contact shadow:** a radial `--scrim` at 22% under a standing phone.
- **The compass rose** (`design/brand/compass.svg`, the site's rose) is an SVG in screen space.
  - In the whole-bay view it sits on the chart's lower-left corner. The placement search runs on a 20 px grid over
    9:16 x 0–420, y 1300–1850 and 16:9 x 720–1000, y 640–1000, and picks the lowest land coverage by `isPointInFill` on
    `.m-land`. It must be ≤ 3%; if not, it shrinks from 220 to 180 px and retries, and if that also fails the render
    fails.
  - During the dive and the low flight it lifts into the foreground: 1,400 px across, 12% opacity, blur 6 px,
    rotating 20°/s, and it slides out of frame. This gives the flights parallax.

### 4.3 Devices

- **Phone.** It uses Cincy Week's generic phone drawing (`reel-stage.mjs` `PHONE`, `PHONE_CSS`): a 390 × 710 css
  viewport, a 50 css status bar and an 84 css toolbar, 421 × 875 css outer. It carries no maker's logo.
  - The status bar time is `h:mm` of the installed clock, every frame.
  - The address pill reads "fritzhand.github.io" (device chrome).
  - It is a plane in table space scaled by `k = 1.333` table px per css px, with its pivot at the bottom center.
  - **Lying:** flat, screen up, long axis along the course heading.
  - **Standing:** `rotateZ(−yaw) rotateX(−pitch)` about the pivot, so the plane is parallel to the screen and scales
    by exactly `s·k`. Poses between use a critically damped spring on pitch with a 2° overshoot, over 0.5–0.6 s.
  - **Slots:** iframes on **origin A** (`http://localhost:<port>`), all loaded at W0, only one visible at a time:
    - `fds` `places/fort-de-soto-park.html`
    - `ybor` `places/ybor-city-historic-district.html`
    - `wo` `whats-on.html?when=today`
    - `trip` `trip.html`
  - Hidden slots are parked at `left: −5000px` (never `display: none`), so they lay out and tick.
  - Swaps happen only while the phone lies flat and is under 200 px wide, as a 4-frame crossfade.
- **Laptop (16:9 only).** A new drawing in the same material language, in `lib/promo-stage.mjs`:
  - a 1440 × 900 css screen at 0.72 screen px per css px, with an 18 css near-black bezel;
  - a slim neutral browser bar with a lock and "fritzhand.github.io/visit-tampa-bay/…" (device chrome, texture);
  - a flat keyboard deck below (texture); no OS menus and no logos. Device grays are the only color literals (the
    `DEVICE` const), as in Cincy's phone.
  - It is a **screen-space device** (not a table object): screen top-left at (801.6, 186), lid x 788–1851,
    y 147–847.
  - It enters by the dock match (§8.2), leaves by sliding out to the upper right (translate +700, −200 px,
    rotateY −25°, easeIn 0.4 s), and returns the same way reversed.
  - **Slots, on origin B** (`http://127.0.0.1:<port>`, a separate browser storage):
    - `map`: `map.html?layers=events&when=today`, loaded at W0 and pre-scrolled 280 css so the chart is fully in
      view;
    - `shared`: navigated at the share moment to the phone's clipboard link rewritten to origin B.
  - It never carries `will-change`.
- **Cursor (16:9).** A plain arrow in SVG, `--text` fill with a `--surface` outline, 34 × 48 px. It glides on an
  eased cubic Bézier and dips to 0.88 scale for 3 frames on a click, with a ring spreading from the tip.
- **Ripple (phone taps).** Cincy's `TAP_JS`, drawn at the tapped element's projected screen center.

### 4.4 The running head: the site's page-head label frame, at poster scale

The chart's title block is the site's own page-head frame (DESIGN §7), drawn at 2× in output px:

- a 4 px `--frame-outer` border with a 2 px `--frame-inner` hairline inset;
- four corner stars (`--mask-corner`, 40 px, `--corner-ink`) and an opaque `--surface` fill;
- **one ribbon** straddling the top rule (the site's `.ribbon`: a band with tails and folds). It is navy on cream
  (Day) or gold on navy (Night) by default, and takes the sheet's fill with `-on` text when it names a sheet.

The frame's content is always **the ribbon (the sheet line), the chronometer, and one log line**. Two extras appear
only where the story needs them: the live-state mirror (the parade) and a one-line footnote (the sunset and the
parade). The layouts are in §7.1 and §8.1. The ornament appears three times as one frame that changes its content
(the hook card, the running head, the end masthead). It is never stacked or duplicated.

### 4.5 The camera

One transform string drives both the CSS scene and the WebGL matrix:

```
#world { transform: translate(Cx px, Cy px) rotateX(pitch) rotateZ(yaw) scale(s) translate(−X px, −Y px) }
#scene { perspective: P; perspective-origin: ox oy }    9:16: P 2600, origin (540, 960) · 16:9: P 2400, origin (1320, 540)
```

- **WebGL.** The shader's matrix is built in the page from `new DOMMatrix(sameString)`, pre-multiplied by the
  perspective matrix about (ox, oy) and then the screen-to-clip matrix. The two can never disagree.
- **Check.** At startup the renderer projects the four corners of a test element both ways; they must agree within
  1 px.
- **Pose parameters:** `(X, Y)` is the target in table px, `s` is screen px per table px at the target, and
  `(Cx, Cy)` is where the target lands.
- **Moves.** Position, pitch and yaw use `easeInOut` (cubic). `s` is interpolated in log space.
- **Flights** (the dive, the low flight, the golden hour, the pull-backs) use an explicit zoom-out-and-in path. For
  `u = easeInOut((t−t0)/(t1−t0))`:
  - `target = lerp(A, B, u)`;
  - `ln s = lerp(ln sA, ln sB, u) − Z·sin(πu)`, with `Z` chosen so that `s(0.5) = s_apex`;
  - `pitch = lerp(pA, pB, u) + (p_apex − lerp(pA, pB, .5))·sin(πu)`, and yaw the same way.
- **Holds:** a ±2° yaw drift over 3 s on the camera only. The running head is 2D and never drifts.
- **Speed caps** (audited):
  - the table's screen speed at the target ≤ 60 px/frame (a warning above 50);
  - `s` changes ≤ 8% per frame;
  - device scrolls ≤ 700 css px/frame.
  - There is no motion blur by default (its cost measured too high). `--blur N` adds N sub-frames on flight frames
    only.
- **"No horizon hole."** Whenever `pitch > 0`, 16 points along y = 300 (9:16) or y = 120 (16:9) are unprojected onto
  the table plane. Each must land inside the L0 region (the paper margin counts), or the render fails.

**Poses** (as of writing; every pose that frames a device element is recomputed from live rects):

| Name | Cut | X, Y (table px) | s | pitch | yaw | Cx, Cy | Notes |
|---|---|---|---|---|---|---|---|
| WB9 | 9:16 | 5000, 5590 | 0.0957 | 0° | 0° | 540, 1330 | the whole chart at x 61–1019, y 795–1865 (frame 1, the cover, the end) |
| FDS-R | 9:16 | 2463, 8188 | 1.2 | 55° | 0° | 540, 2052 | phone 1.6 px/css; phone top y 652; viewport css (0,0) → (228, 757) |
| FDS-P | 9:16 | the phone pivot | 2.1 | 55° | 0° | from rects | 2.8 px/css; the toast box top → y 1250, centered |
| FLY1 apex | 9:16 | the course midpoint | 0.30 | 62° | −38° (heading, travel up-screen) | 540, 1500 | |
| YB-R | 9:16 | 5849, 3867 | 1.2 | 55° | 0° | 540, 2052 | |
| YB-P | 9:16 | the phone pivot | 2.1 | 55° | 0° | from rects | the source line top → y 1180, left → x 72 |
| GH apex | 9:16 | 5709, 3920 | 0.32 | 38° | +20° | 540, 1500 | |
| RW-R | 9:16 | 5569, 3973 | 1.2 | 55° | 0° | 540, 2052 | |
| RW-P | 9:16 | the phone pivot | 1.65 | 55° | 0° | from rects | 2.2 px/css; the card top → y 690 |
| TRIP-R / TRIP-P | 9:16 | the phone pivot | 1.2 / 2.1 | 55° | 0° | from rects | "Link copied" top → y 1250 |
| WB16 | 16:9 | 5000, 5590 | 0.0894 | 0° | 0° | 1320, 540 | the chart at x 873–1767, y 40–1040 |
| *-R16 | 16:9 | the stop | 0.825 | 55° | 0° | 1320, 1022 | phone 1.1 px/css; viewport y 132–913 |
| *-P16 | 16:9 | the phone pivot | 1.65 (toasts, the card) / 1.8 (the source line) | 55° | 0° | from rects | toast top → y 760; the source line top → y 620, left → x 780; the card top → y 120 |
| DOCK16 | 16:9 | the crop center (3727.7, 5523.6) | 0.076848 | 0° | 0° | the center of R (1279.7, 500.1) | solved (§8.2) |

### 4.6 Motion language

- **Type** slams: scale 1.08 → 1 with opacity 0 → 1 over 0.15 s, easeOut. It then holds dead still.
- **The chronometer** rolls like an odometer: each digit column translates, and the element is `data-busy="1"` while
  rolling. It never fades.
- **Edition flips** are single-frame (the terminator sweep is the only gradual part).
- **Devices** move physically (springs, glides, slides); the camera moves in 3D.
- **No crossfades between scenes.** Slot swaps happen only on a lying, small phone. The one navigation crossfade (the
  dock's Trip tab) is 3 frames, Cincy's rule for links that change page.

### 4.7 Measured performance (spike on this box, Sep 28, 1080×1920, DPR 1, JPEG q92)

| Setup | ms/frame |
|---|---|
| CSS 3D `<img>` table (4096 texture in a 10000 × 11180 layer), reading pose | 390–445 |
| CSS 3D `<img>` table, flight (s and pitch changing) | 970–1,093 (rejected) |
| the same, with `will-change`, or a 2048/3072 texture | 670–1,064 (no fix) |
| **WebGL2 table, flight** | **117–165** |
| **WebGL2 table + a live phone iframe standing in CSS 3D + 3 parked iframes, flight** | **195** |
| **the same, reading pose** | **159** |
| Five flat iframes, no table | 98 |

**Budget:** Reel ≈ 915 × 0.2 s ≈ 3.5 min of frames. 16:9 ≈ 5 min: the laptop push frames re-raster the map iframe
(allow 0.8 s each for about 20 frames). Add textures (≈ 30 s), audio (≈ 1 min per cut) and the mux. Both cuts should
take well under 15 minutes on 4 shared CPUs. The renderer logs ms/frame per scene and warns above 600 ms.

---

## 5. Capture: pages, clock, states, taps

### 5.1 Browser and server

- **Browser.** Chromium from `/opt/pw-browsers`, Playwright from `NODE_PATH=/opt/node22/lib/node_modules`. There is
  one context per cut:
  - viewport = the cut's size, `deviceScaleFactor: 1`, `reducedMotion: "reduce"`;
  - `colorScheme: "dark"` at the start (before sunrise);
  - clipboard read and write granted to origin A.
- **Server.** The renderer serves the private build (`.cache/promo/site/`) under `/visit-tampa-bay/`, plus the stage
  at `/__stage` and the textures at `/__promo/tex/…`. It serves both on origin A (`localhost`) and origin B
  (`127.0.0.1`), the same port and two host names. It never reads or writes `docs/`.
- **All devices are iframes in the one stage page.** Verified: `page.emulateMedia` then flips every iframe's
  `data-theme` within the call. Separate pages (tabs) do **not** flip until they render, so never use them for
  devices.
- **Motion off.** An init script injected into every device frame adds
  `*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent}`. The stage adds
  all motion.
- **Toasts.** Toast rises (opacity 0 → 1, translateY 12 → 0 css over 0.2 s) are stage-driven with an inline style
  that is then removed.
- **Share path.** `navigator.share` is undefined on desktop Chromium (asserted), so "Share my trip" takes the site's
  real copy-and-toast path.

### 5.2 The clock

- `context.clock.install({ time: W0 })` and `pauseAt(W0)`, with **W0 = 7:14:00.000 AM EST** on the cut's date. All
  slots are loaded and warmed up at W0 (fonts ready, client data fetched, lists rendered), so the site's 60 s
  `onTick` intervals (`site/js/core/clock.js`, a `setInterval` started on first subscribe) fire on whole minutes all
  day.
- **Per frame:** `clock.runFor(W(tᵢ) − W(tᵢ₋₁))`, then the stage's `render(tᵢ)`, device scrolls and inline motion,
  then the screenshot. Every frame is a pure function of `tᵢ`.
- **`runFor` fires timers due at the end of the interval (verified).** At W = 18:15:00.000 exactly, the parade card
  reads "Started". The audit also asserts "In 1 min" on the frame before.
- **Never `?now=`** (it prints "Test clock" and marks the clock simulated) **and never `?theme=`.**
- **W(t)** is piecewise:
  - *real* segments are slope 1;
  - *×3* segments are slope 3;
  - *time-lapse* segments are a monotone cubic Hermite through their anchors, with the derivative fixed at 1 at both
    ends, so the clock enters and leaves each time-lapse at real speed.
  - In time-lapses, **every hour crossing is an anchor placed on an 8th note**, so the claves that strike the hours
    and the chronometer's roll land together.
  - Anchor tables: §7.3 (Reel) and §8.3 (16:9).

### 5.3 Clock, date and edition words (read, never typed)

- **Clock line and chronometer.** The site's own formatter: `fmtDayLong`, `fmtDay`, `fmtTime` and `nyParts` from
  `site/js/lib/time.js`, the exact functions `site/js/features/home.js` uses for `[data-tb-clock]`
  (`${fmtDayLong(date)} · ${fmtTime(hhmm)}`).
  - At startup the renderer loads a throwaway `index.html` on origin A at W0, SR, SS and 18:15 and asserts
    `[data-tb-clock]` equals the formatter's output, then closes it. There is no hidden home slot.
- **The date** in the running head is `fmtDay(date)` ("Sat, Dec 19"), in caps.
- **The edition flips** are `page.emulateMedia({ colorScheme: "light" })` on the sunrise frame and `"dark"` on the
  sunset frame. The site's `matchMedia` listener (`site/js/core/theme.js`, `initTheme` → `onSys`) sets `data-theme`
  in every device frame, and nothing is stored.
  - Asserted per frame: every device `<html data-theme>` matches the expected edition.
  - Asserted per frame: `localStorage['tbc-theme']` is absent on both origins.

### 5.4 Taps, scrolls, dialogs

- **Taps are real DOM clicks** on the exact selector (`locator.click({ force: true })` inside the frame, or
  `element.click()`), so the site's own listeners run. Coordinate clicks through 3D transforms are never used.
- **The visual cue** (ripple or cursor) is drawn at the element's center projected through the device's own matrix.
- **Links that change page** (the dock's Trip tab) show the tap, then the preloaded slot after a 3-frame crossfade.
  The `trip` slot has followed the stars through the storage event since W0.
- **Scrolls** are `scrollTo` per frame on the element's own scroll container, eased. Targets come from live rects,
  never hard-coded:

| Where | Scroll target |
|---|---|
| `fds`, while lying | the `h1` top at css 70 |
| `fds`, 5.0–5.4 s | the star's center at css 440 |
| `ybor`, while lying | the `h1` top at css 70 |
| `ybor`, the whip | the last `.source-line`'s top at css 380 |
| `ybor`, 16:9 roll | timeline entry k's top at css 200 at the cue times |
| `wo`, while lying | `#e-<event>` top just below the sticky day header (css 152 as of writing; computed as the header's bottom + 2) |
| `trip` | `.trip-summary` at css 190 |
| laptop `map` | 280 css, so `svg.map-base` is fully in view |

- **Assertions after each tap:**
  - star: `aria-pressed="true"`; `[data-trip-count]` = 1, 2, 3; the toast is "Added to My Trip" plus "View"; origin A's
    `tbc-trip` holds exactly the ids starred so far; origin B holds no `tbc-trip`;
  - share: the toast is "Link copied". The clipboard equals `siteBase`-rewritten
    `…/trip.html#` + `tripHash({ e: [event], p: [fds, ybor] })` (`site/js/lib/share.js`) and decodes to the three ids.
    If the clipboard read fails, the renderer compares against `tripHash` and the toast and logs it;
  - "Add 3 to my trip" (16:9): the toast is "Added 3 items to My Trip"; origin B holds exactly the three ids and
    origin A is unchanged;
  - map click (16:9): the map's state changes (its `svg.map-base` viewBox changes), and the Riverwalk's flag is
    visible.

### 5.5 Captured pages and states, at a glance

| Slot | Origin | URL | Shown (installed clock, EST) | Edition | On screen | Real actions |
|---|---|---|---|---|---|---|
| `fds` | A | `places/fort-de-soto-park.html` | 7:14–7:16 AM (lying), 7:16 AM | Night → Day at SR | kicker, h1, lede, star "Add to My Trip" → "In My Trip", toast, dock badge 1 | star |
| `ybor` | A | `places/ybor-city-historic-district.html` | 12:30 PM | Day | page head; heritage, designations, 11-entry timeline, nearby (passing); Sources block and "Source: nps.gov · Checked Sep 27, 2026" | star |
| `wo` | A | `whats-on.html?when=today` | 5:37 → 6:15 PM | Day → Night at SS | sticky "Saturday, December 19 · 5 events · Today"; the parade card "TODAY" → "IN 23 MIN" … "STARTED" | star |
| `trip` | A | `trip.html` | 6:15 PM | Night | "1 event · 2 places. Saved in this browser, on this device.", "Share my trip", toast "Link copied" | dock Trip tab (shown), share |
| `map` (16:9) | B | `map.html?layers=events&when=today` | 5:36 → 5:39 PM | Day → Night at SS | "PLAN · 1,407 ON THE CHART", "The bay chart", today's flags and clusters | cluster click |
| `shared` (16:9) | B | `trip.html#e=…;p=…` (the copied link) | 6:15 PM | Night | "A shared trip", "1 event · 2 places.", "Add 3 to my trip" → toast "Added 3 items to My Trip", sidebar "3 in My Trip" | "Add 3 to my trip" |

---

## 6. Layout grids and safe areas

- **9:16 safe zone** (Instagram, TikTok, YouTube Shorts): must-read text only inside **y 250–1440**, with x 64–1016
  for y < 1050 and x 64–940 for y ≥ 1050. The column right of x 940 below y 1000 holds nothing to read. Texture may
  cross: device bodies, the table, the site's dock, the badges, the rose.
- **16:9 safe zone** (YouTube, LinkedIn): must-read text only inside **x 96–1824, y 60–960**, clear of the player bar.
- `data-zone="free"` marks fine print and texture (the map attribution, the typed link, device chrome). It is exempt
  from the zone but not from the name guard.

---

## 7. The Reel, 9:16: 1080 × 1920, 30 fps, 30.500 s (915 frames, f0–f914)

### 7.1 The running head, 9:16 (normative)

The frame spans x 32–1048. The top rule is at y 280. The bottom rule is at **y 780 (hook), y 640 (stops), y 690
(end)**, and it animates between them in 0.2 s (easeOut).

| Row | y | Content | Type |
|---|---|---|---|
| Ribbon | band 250–310 on the top rule | the sheet line | Archivo 680, 125% width, caps, 28 px, tracking 0.18em |
| Hook: wordmark | 330–450 | `design/brand/wordmark.svg` (stacked "TAMPA BAY" / "Chartbook"), 560 px wide, centered | outlined lettering |
| Hook: tagline | 470–580 | two lines, centered | Bodoni Moda italic 540, 44 px, lh 1.2 |
| Hook: clock line | 610–646 | "SATURDAY, DECEMBER 19 · 7:14 AM" | Archivo caps 28 px, `--text-muted`, tabular |
| Stops: chronometer | 330–470 (baseline 452) | "7:16" + "AM" at x 72 | Bodoni Moda 800, 128 px, lining tabular; meridiem Archivo caps 40 px |
| Stops: date | 346–376, right-aligned to x 1000 | "SAT, DEC 19" | Archivo caps 28 px, `--text-muted` |
| Stops: mirror (S5 only) | 392–450, right-aligned to x 1000 | "IN 23 MIN" … "STARTED" | Archivo caps 44 px in the site's badge box. Its color, background and border are copied per frame from the card's `.ev-status` computed style |
| Stops: log line | 484–590 | one log line, ≤ 2 lines, x 72–1008 | Bodoni Moda italic 540, 46 px, lh 1.15; titles and the punchline in Bodoni 700 roman 46 / 52 px |
| Stops: footnote (S4–S5 only) | 598–626 | one line | Archivo caps 24 px, `--text-muted` |
| End: wordmark | 320–430 | the stacked wordmark, 440 px wide, centered | |
| End: count block | 450–670 | three columns: numeral over label, hairline `--border` separators | numerals Bodoni 800 lining 88 px; labels Archivo caps 24 px |

The device window is y 650–1440 (must-read) and y 1440–1920 (texture). The phone's reading pose puts its top at
y 652.

### 7.2 Second by second, to the frame

The grid is 120 BPM with a 3-beat pickup. The downbeat of bar n is at t = 1.5 + 2(n−1) s, which is frame
f = 45 + 60(n−1): bar 1 f45, 2 f105, 3 f165, 4 f225, 5 f285, 6 f345, 7 f405, 8 f465, 9 f525, 10 f585, 11 f645,
12 f705, 13 f765, 14 f825, 15 f885. A beat is 15 frames, and 8ths round to the nearest frame. **Bold** marks an
accent on picture.

**S1 · Hook: the night bay, sunrise, six sheets (f0–f137, 0.000–4.600)**

| t (s) | f | Picture and camera | On screen | Real action | Sound |
|---|---|---|---|---|---|
| 0.000 | 0 | the cover (the render of f37), baked in | | | |
| 0.033–1.150 | 1–34 | WB9, Night "fill" texture. The gold coast engraves: a `stroke-dashoffset` reveal of `.m-coast`, `.m-coast-minor` and `.m-lake-shore` (dash = the longest subpath), linear for 70% then easeOut, in a 2D SVG overlay with the WB9 transform, `--mw` 1.8. Echoes `.m-wl1`/`.m-wl2` follow at +0.12 and +0.24 s. The phone lies lit at FDS. | hook card (Night): ribbon "SHEETS 1–6 · TAMPA BAY"; the wordmark; the clock line "SATURDAY, DECEMBER 19 · 7:14 AM" (it rolls to 7:15 at f20 and 7:16 at f40) | | ocean (LPF 350 Hz), F pad pp, burin scratch ∝ draw speed and panned with the leading point |
| 0.100–1.000 | 3–30 | the rose turns −300° → 0° (easeOutBack, overshoot +6° at 0.9) and **lands on north at f30** | | | ratchet tick at each 11.25° crossing; bell C6 at 1.000 |
| 0.400–0.900 | 12–27 | the tagline wipes in L→R (line 1 f12–f20, line 2 f20–f27) | "An independent guide to Tampa Bay," / "every entry linked to its source" | | celesta glints C6, A5, F5 at 0.25, 0.5, 0.75 |
| 1.150–1.250 | 35–37 | the engraving overlay crossfades into the full Night texture | | | riser 1.0–1.5 (0.5 s) |
| 1.233 | 37 | **the cover frame** (everything settled, Night) | | | |
| 1.274–1.574 | 38–47 | the sunrise terminator sweeps east → west at 3,333 units/s (the whole chart in 0.3 s) and crosses FDS at f45 | | | |
| **1.500** | **45** | **SUNRISE FLIP: W = SR. `emulateMedia(light)`. The stage and every device flip in this frame.** | clock line "… · 7:16 AM" | | **tres strum A, brass swell A, ship's bell E5 at 1.5 and 1.75, thump A1, ocean LPF 350 → 2400 Hz over 0.8 s** |
| 2.000–3.483 | 60–104 | **the six sheet badges drop on 8ths**: TP f60, SP f68, GB f75, CW f83, AB f90, DT f98. Each falls from 2.4× in 5 frames (easeIn), squashes (scaleY 0.92, scaleX 1.05) for 2 frames, and settles, while two engraved rings spread (radius 18 → 60 px, 0.4 s, `--map-water-line`). They are the site's `.lg` badges at 1.5× (84 × 50 px) at the index positions (§7.5) | badges TP SP GB CW AB DT (texture: code, shape and ink) | | tres plucks A4 B4 C#5 D5 E5 F#5, each doubled by a paper stamp pitched to it |
| 3.500–4.600 | 105–138 | **the dive**: WB9 → FDS-R (flight path; `s` 0.0957 → 1.2, pitch 0 → 55°). The badges fade f105–f111. The rose lifts into the foreground and leaves by 4.3 | | | whoosh 3.9–4.5, pitched to E |
| 3.900–4.050 | 117–122 | the hook card collapses: the wordmark and tagline lift 24 px and fade; the bottom rule rises 780 → 640 | | | |
| 4.000–4.600 | 120–138 | the phone stands at FDS (spring). The `fds` slot was pre-scrolled while lying (the h1 at css 70) | | | soft air |
| 4.050–4.200 | 122–126 | the running head sets: the ribbon re-prints in the GB fill; the chronometer slams; the date fades in | ribbon "SHEET 3 · GULF BEACHES · PARK"; "7:16 AM"; "SAT, DEC 19" | | |
| 4.200 | 126 | the log line slams | **"One Saturday on the bay."** | | the guajeo enters at 4.5 (bar 2, beat 3) with claves (son 3-2) and maracas |

**S2 · Fort De Soto Park, 7:16 AM (f138–f224, 4.600–7.500)**

| t | f | Picture and camera | On screen | Real action | Sound |
|---|---|---|---|---|---|
| 4.600–5.300 | 138–159 | hold, FDS-R; `dof` on; the page head: "Fort De Soto Park" (38.8 css → 62 px), the lede, the GB badge, "Park", the Signature seal | | | |
| 5.000–5.400 | 150–162 | the page scrolls about +150 css (the star's center to css 440) | | | |
| **5.500** | **165** | ripple on the star | | **click `.page-head button.star.pl-star[data-star="fort-de-soto-park"]`** → `aria-pressed`, "In My Trip", dock badge "1"; the FDS landmark symbol appears on the table | tap, then the "added" motif E5 → A5 on 16ths |
| 5.550–5.750 | 167–173 | the toast rises (stage-driven) | | | |
| 5.550–6.050 | 167–182 | push FDS-R → FDS-P (`s` 1.2 → 2.1: 2.8 px/css; the toast top → y 1250; the pressed "In My Trip" at y ≈ 820–945) | **toast "Added to My Trip · View"** (14 css → 39 px) | | |
| 6.050–7.550 | 182–227 | hold (real time) | | | tumbao bass and bongó martillo enter at 6.5 |
| 7.500–7.800 | 225–234 | the phone lies down | | | |

**T1 · The low flight across the bay, 7:16 AM → 12:30 PM (f225–f277, 7.500–9.250)**

| t | f | Picture and camera | On screen | Real action | Sound |
|---|---|---|---|---|---|
| 7.550–9.250 | 227–278 | the low flight FDS → Ybor (flight path: `s` 2.1 → 0.30 at f252 → 1.2; pitch 55 → 62 → 55°; yaw 0 → −38° by 8.0, held, → 0 by 9.25, so the direction of travel points up-screen and the arrival is north-up). The phone glides lying along the course, which draws behind it. The foreground rose passes 8.0–8.9. `dof` off | the chronometer rolls "7:16 AM" → "12:30 PM", with hours on the 8ths: 8 at f240, 9 at f248, 10 at f255, 11 at f263, 12 at f270 | the FDS toast is ended by the site's timer at about f228 (phone lying) | E pedal (bass E2, tres tremolo), whoosh 7.55–8.3 up and 8.3–9.2 down; **claves strike 8, 9, 10, 11 and 12 o'clock** (A5 B5 C#6 D6 E6 at 8.0, 8.25, 8.5, 8.75, 9.0) |
| 8.400 | 252 | apex: slot `fds` → `ybor` (4-frame crossfade; the phone is 168 px wide) | ribbon re-prints "SHEET 1 · TAMPA · HISTORIC DISTRICT" (TP fill) | | |
| 9.000–9.500 | 270–285 | the phone stands at Ybor (the h1 at css 70) | | | |

**S3 · Ybor City: the claim, then the proof (f278–f404, 9.250–13.500)**

| t | f | Picture and camera | On screen | Real action | Sound |
|---|---|---|---|---|---|
| 9.500 | 285 | the chronometer settles (slam); YB-R, `dof` on | "12:30 PM"; "Ybor City Historic District" (in device, 62 px) | | **tres hit A**; full groove plus güiro |
| 9.550 | 287 | the log line slams | **"Every entry links to its source."** | | |
| **10.000** | **300** | ripple | | **click `.page-head button.star[data-star="ybor-city-historic-district"]`** → dock badge "2"; landmark symbol at Ybor; toast (texture) | "added" motif |
| 10.900–11.700 | 327–351 | **the whip**: an eased scroll to the Sources (≈ 10,300 css; peak ≤ 700 css/frame). Clock ×3; the site's timer ends the toast at about f350. The heritage block, designation boxes, 11 timeline years and nearby lists blur past | (texture) | | the güiro follows the scroll speed (ridge rate = css/s ÷ 60; level = min(1, speed/2000)) |
| 11.700–12.000 | 351–360 | push YB-R → YB-P (2.8 px/css; the source line top → y 1180, left → x 72); the "SOURCES · FACTS · ALSO READ" block above it (texture: nps.gov, npgallery.nps.gov, tampa.gov, ybor.org, en.wikipedia.org) | | | |
| **12.000–13.500** | **360–405** | hold on the proof | **"Source: nps.gov · Checked Sep 27, 2026"** (in device, live, 13 css → 36.4 px) | | **the proof accent at 12.0: a wood stamp and a tres harmonic A6**; harmony F#m (11.5), D (12.5), E (13.0); bongó out |

**T2 · The golden hour, 12:30 → 5:38 PM (f405–f464, 13.500–15.500)**

| t | f | Picture and camera | On screen | Real action | Sound |
|---|---|---|---|---|---|
| 13.500–13.800 | 405–414 | the phone lies down; the log line fades (13.5–13.65) | | | |
| 13.550–15.500 | 407–465 | lift and orbit from Ybor to the Riverwalk (`s` 2.1 → 0.32 at f432 → 1.2 at f456; pitch 55 → 38 → 55°; yaw 0 → +20 → 0°); `grade` 0 → 0.16 over 14.0–15.3; the course draws on | the chronometer rolls to "5:38 PM", with hours on 8ths: 1 PM f420, 2 f428, 3 f435, 4 f443, 5 f450 | | the band thins: tres tremolo, E2 pedal, brass E7sus4 → E7 crescendo (the filter opens over 1.9 s); claves at 14.0–15.0 |
| 14.400 | 432 | apex: slot `ybor` → `wo` (the phone is 180 px wide) | ribbon re-prints "PARADE · DOWNTOWN TAMPA" (TP fill: the card's `.ev-kind`) | | |
| 14.900–15.400 | 447–462 | the phone stands at the Riverwalk: What's On (Day), the parade card just below the sticky day header | in device: "Saturday, December 19 · 5 events · Today"; the card's badge "TODAY" | | |
| 15.367–15.667 | 461–470 | the sunset terminator sweeps east → west and crosses the Riverwalk at f465 | | | |

**S4 · Sunset (f465–f488, 15.500–16.300)**

| t | f | Picture and camera | On screen | Real action | Sound |
|---|---|---|---|---|---|
| **15.500** | **465** | **SUNSET FLIP: W = SS. `emulateMedia(dark)`. The phone, the table (terminator) and the running head flip in this frame; `grade` → 0** | "5:38 PM" | | **brass F major fp then swell; ship's bell C6 at 15.5 and 15.75; thump F1; celesta glints (F pentatonic); ocean → river** |
| 15.550 | 467 | the footnote appears | **"AUTO DARK MODE AT SUNSET · THE GUIDE FOLLOWS THE DEVICE"** (hand-written, §9.3) | | |
| 15.900–16.300 | 477–489 | the clock ramps to 17:52:00.000 | the card's badge "TODAY" → "IN 30 MIN" … → **"IN 23 MIN" at f489** (the site's tick) | | |

**S5 · The lighted boats (f489–f686, 16.300–22.900)**

| t | f | Picture and camera | On screen | Real action | Sound |
|---|---|---|---|---|---|
| 16.300 | 489 | the log line and the mirror set | **"Tampa Riverwalk Holiday Lighted Boat Parade"** (Bodoni 700); mirror **"IN 23 MIN"**; "5:52 PM" | | |
| **16.500** | **495** | ripple on the card's star; push RW-R → RW-P (2.2 px/css; the card at y 690–1337) over 16.5–16.9 | in device: "6:15 PM · end time not listed · IN 23 MIN", "Signature", "Tampa Riverwalk", "Price not listed", "Source: thetampariverwalk.com" | **click `#e-tampa-riverwalk-lighted-boat-parade-2026 button.star`** → dock badge "3"; flag symbol at the Riverwalk; toast (texture, it sits at y ≈ 1612+) | "added" motif C6 → F6; the night guajeo in F from 16.5 |
| 16.500–19.500 | 495–585 | hold (real time) | | | the night groove |
| **19.500–21.500** | **585–645** | **the countdown**: W 17:52:03.2 → 18:15:00.000. Minute k (17:52 + k) crosses at t = 19.5 + 2k/23 (k = 1…23) | the mirror and the card: "IN 22 MIN" … "IN 1 MIN" (busy) | the parade toast is ended by the site's timer at about f586 | **the celesta climbs the F major scale, one note per minute crossing, 22 notes F4 → F7**; the groove thins to clave and tres; bass pedal C2 |
| **21.500** | **645** | **STARTED** (W = 18:15:00.000; the site's tick) | the card's badge **"STARTED"** (gold); the mirror copies it | | **tutti F add9; a falling celesta cascade C7 → F5 on 16ths; ship's bell C6 at 21.5 and 21.75; bongó slap** |
| 21.550 | 647 | the log line and footnote change | **"“Started”, never “Now”"**; footnote "END TIME NOT LISTED" | | |
| 22.850 | 686 | ripple on the dock's Trip tab | | tap on `nav.dock a[href="trip.html"]` (navigation shown, not performed) | tap |

**S6 · One link (f687–f764, 22.900–25.500)**

| t | f | Picture and camera | On screen | Real action | Sound |
|---|---|---|---|---|---|
| 22.950–23.050 | 689–692 | 3-frame crossfade to the `trip` slot (Night, the summary at css 190). Pull RW-P → TRIP-R over 22.9–23.3. The mirror hides; the log line and footnote fade at 23.05 | ribbon "PLAN · YOUR LIST" (default ribbon colors); in device: "1 event · 2 places. Saved in this browser, on this device." | | lighter groove |
| **23.500** | **705** | ripple on "Share my trip" | | **click `[data-trip-share]`** → the toast "Link copied"; the clipboard is read | the added motif as an arpeggio C6 F6 A6 |
| 23.550–24.050 | 707–722 | push TRIP-R → TRIP-P (2.8 px/css; the toast top → y 1250) | **"Link copied"** (39 px); log line **"One day, one link."** (Bodoni 700, 52 px); under it the link types on over 23.8–24.6 (Archivo 24 px, texture) | | typing ticks (−30 dB, one per two characters) |
| 24.050–25.500 | 722–765 | hold | | | |

**S7 · Pull-back to the night bay (f765–f809, 25.500–27.000)**

| t | f | Picture and camera | On screen | Real action | Sound |
|---|---|---|---|---|---|
| 25.500–26.700 | 765–801 | the phone lies down at the Riverwalk; the pull-back TRIP-P → WB9 (flight path). The course glows (+30% width, 0.4 s), with its three symbols; the dots fade in over 25.9–26.6 | | the share toast is ended by the site's timer at about 26.7 | **drums and bass out; whoosh up (1.2 s, the only long one); 40 seeded celesta glints (F pentatonic) panned by each dot's x as it appears; the clave's 3-side A4 C5 D5 at 25.5, 26.25, 27.0** |
| 26.100–26.250 | 783–788 | the running head becomes the masthead (the bottom rule 640 → 690); the log line and link lift and fade | ribbon "SHEETS 1–6 · TAMPA BAY"; the wordmark; **"641 PLACES · 414 PLACES TO STAY · 589 EVENTS"** | | brass pad F pp |

**S8 · End card (f810–f914, 27.000–30.500)**

| t | f | Picture | On screen | Sound |
|---|---|---|---|---|
| 27.000–27.150 | 810–815 | the cartouche plate rises over the chart: `--surface`, `.cartouche` concave corners (`--n` 16 px), a double-rule inset, x 64–1016, y 1100–1430; lines centered on x 502 | **"fritzhand.github.io/visit-tampa-bay"** (Figtree 650, 44 px, `--link`, 3 px `--accent` underline, y 1140–1194); **"Independent guide. Not affiliated with any / tourism office, venue or operator."** (Figtree 400, 34 px, `--text-muted`, y 1222–1310); "Every entry links to its source." (Bodoni italic 30 px, y 1330–1366, secondary); the map attribution (Figtree 20 px, `--text-faint`, y 1386–1410, `data-zone="free"`) | |
| **27.500** | **825** | | | **the end chord F6/9 (F2 C3 A3 D4 G4): tres strum, brass pad, ship's bell C6 at 27.5 and 27.75** |
| 28.000, 28.500 | 840, 855 | | | **the clave's 2-side closes the sonic logo: tres and claves G4 at 28.0, F4 at 28.5** |
| 29.500–30.500 | 885–914 | still hold; f914 is the loop's last frame | | decay to −40 dB by 30.2; the ocean continues at the pickup's level to the end |

### 7.3 Reel clock anchors W(t)

SR and SS are the computed instants (§3.3). "Real" means slope 1. Anchors may fall between frames (for example
t = 7.55, frame 226.5), because W is a continuous function sampled at each frame's time t = f/30. Accents and flips
are all on whole frames. For Plan B, substitute its SR, SS and `A_eve` (17:37:00), and the countdown anchors become
`A_eve + k min`.

| t (s) | f | W (EST) | Segment ending here |
|---|---|---|---|
| 0.000 | 0 | 07:14:00.000 | slots loaded |
| 1.500 | 45 | SR (07:16:15) | linear ramp |
| 7.550 | 226.5 | SR + 6.050 s | real (the star at 5.5; its toast read by 7.55) |
| 8.000 · 8.250 · 8.500 · 8.750 · 9.000 | 240 · 248 · 255 · 263 · 270 | 08:00 · 09:00 · 10:00 · 11:00 · 12:00 | time-lapse T1 (hour anchors) |
| 9.250 | 277.5 | 12:30:00.000 | time-lapse T1 |
| 10.900 | 327 | 12:30:01.650 | real (the star at 10.0) |
| 11.700 | 351 | 12:30:04.050 | ×3 (the whip) |
| 13.550 | 406.5 | 12:30:05.900 | real |
| 14.000 · 14.250 · 14.500 · 14.750 · 15.000 | 420 · 428 · 435 · 443 · 450 | 13:00 · 14:00 · 15:00 · 16:00 · 17:00 | the golden hour (hour anchors) |
| 15.500 | 465 | SS (17:38:13) | the golden hour: **the sunset flip frame** |
| 15.900 | 477 | SS + 0.400 s | real |
| 16.300 | 489 | 17:52:00.000 | ramp: **"IN 23 MIN"** |
| 19.500 | 585 | 17:52:03.200 | real |
| 19.5 + 2k/23 (k = 1…22) | | 17:52 + k min | countdown (minute anchors) |
| 21.500 | 645 | 18:15:00.000 | countdown: **the "STARTED" frame** |
| 30.500 | 915 | 18:15:09.000 | real to the end |

### 7.4 Key compositions (output px, normative)

- **Cover, f37 (1.233 s), Night:**
  - the hook card (y 250–780) with the ribbon "SHEETS 1–6 · TAMPA BAY", the wordmark, the tagline and the clock line
    "SATURDAY, DECEMBER 19 · 7:15 AM";
  - below it, the whole bay at night: the gold coast on bay navy, water lining, water names;
  - the rose on north at the lower left, and the phone lying lit at Fort De Soto.
  - It survives the profile grid's center 3:4 crop (y 240–1680).
- **S2 toast push (6.5 s):**
  - the running head: "SHEET 3 · GULF BEACHES · PARK", "7:16 AM", "One Saturday on the bay.";
  - the phone at 2.8 px/css: "In My Trip" pressed (magenta) at y ≈ 820–945, the plate below, the toast
    "Added to My Trip · View" at y 1250–1426, and the dock badge "1" (texture).
- **S3 proof (12.8 s):**
  - the running head: "SHEET 1 · TAMPA · HISTORIC DISTRICT", "12:30 PM", "Every entry links to its source.";
  - the phone at 2.8 px/css: the "SOURCES · FACTS · ALSO READ" links in y 650–1170 and the line "Source: nps.gov ·
    Checked Sep 27, 2026" at y 1180–1216.
- **S5 started (22.0 s), Night:**
  - the running head: "PARADE · DOWNTOWN TAMPA", "6:15 PM", the mirror "STARTED", "“Started”, never “Now”", and the
    footnote "END TIME NOT LISTED";
  - the phone at 2.2 px/css: the card (the date box "SAT 19 DEC", the Signature seal, the title at 42 px, "6:15 PM ·
    end time not listed", the gold STARTED badge, "Tampa Riverwalk").
- **Final frame, f914, Night:**
  - the masthead (ribbon, wordmark, the three counts);
  - the whole bay at night, with the magenta course through the three symbols, the tiny phone lying at the Riverwalk,
    and the dots;
  - the cartouche plate.

### 7.5 The six badges' positions (computed at render time)

- **Source:** the built `index.html` `.ix-map` (its `svg viewBox`, region units) and each sheet's **first**
  `.ix-badge[data-sheet]` `left/top %`.
- **Conversion:** unproject with `data/map.json` `.region` (`bbox.core`, `projection`), then project with the
  basemap's `metaOf`. Day Trips' two outlying badges are off this chart, so only its first (middle) badge drops.
- **As of writing** (basemap units): TP 564.9, 405.6 · SP 353.4, 635.6 · GB 181.1, 637.9 · CW 184.7, 322.3 ·
  AB 644.6, 292.0 · DT 431.2, 989.2.
- **On screen:** WB9 gives TP (602, 1183), SP (400, 1403), GB (235, 1405), CW (238, 1103), AB (678, 1074),
  DT (474, 1742). WB16 gives TP (1378, 302), SP (1189, 508), GB (1035, 510), CW (1038, 232), AB (1450, 201),
  DT (1248, 885).

---

## 8. The 16:9 cut: 1920 × 1080, 30 fps, 41.500 s (1,245 frames, f0–f1244)

The same day, stops, taps and score material, with three additions:

- a **laptop scene** (the dock match onto the map page at sunset, the sunset on a big chart, a real map click);
- the **share link opened on a second browser** ("A shared trip" → "Add 3 to my trip" → "Added 3 items to My Trip");
- **richer history at Ybor** (the lede line, and the timeline rolling with one tres note per year).

### 8.1 Layout, 16:9 (normative)

- **The label frame is a left column:** x 32–712, top rule y 72, bottom rule y 1008. The ribbon band y 44–100 is
  centered on x 372. Content sits at x 96–664.
  - Ribbon text: Archivo caps 26 px, tracking 0.2em.
  - Chronometer: Bodoni 800, 180 px, baseline y 290, at x 96. Meridiem: Archivo caps 48 px.
  - Date: "SAT, DEC 19", Archivo caps 26 px, `--text-muted`, right-aligned to x 664, y 120–150.
  - Mirror (S5): y 310–370, Archivo caps 44 px.
  - Log line: y 400–650, Bodoni italic 52 px, lh 60, ≤ 4 lines (titles in Bodoni 700 roman).
  - Footnote: y 670–740, Archivo caps 24 px, ≤ 2 lines.
  - **Day rule (texture):** y 770–840. A 16-hour strip from 5 AM to 9 PM: night spans in `--surface-sunken`, the day
    span (SR to SS) in `--gold-tint`, hour ticks, and the labels "6 AM", "12 PM", "6 PM" (`fmtTime`; Archivo 22 px
    muted). A 16 px `--magenta` triangle marks W(t), and each starred stop's symbol sits at its clock time.
  - **Row E (secondary):** y 870–930, the visible slot's live source line (Figtree 24 px muted). It is the page's
    last `.source-line`, or the card's `.ev-src` on What's On, and it is empty for the laptop.
  - **Hook:** the ribbon; the wordmark 540 px wide at y 140–270; the tagline (Bodoni italic 40 px, 2 lines) at
    y 300–400; the clock line (Archivo caps 26 px) at y 430–460.
  - **End:** the ribbon; the wordmark (440 px) at y 120–230; the three counts as three rows (numeral Bodoni 800,
    80 px + label Archivo caps 26 px) at y 270–600; "Every entry links to its source." (Bodoni italic 32 px) at
    y 640–680; the About line (Bodoni italic 30 px, 3 lines) at y 700–830.
- **The device zone is x 720–1920.**
  - Phone reading pose: 1.1 px/css, x 1089–1552, top y 60, viewport y 132–913.
  - Pushes: 2.2 px/css for the toasts and the card, 2.4 px/css for the source line.
  - Laptop: §4.3.
- **The end plate** (cartouche, over the chart): x 780–1780, y 700–960. The URL (Figtree 650, 44 px) at y 730–784;
  the independence line (Figtree 400, 30 px, 2 lines) at y 800–880; the attribution (20 px, `data-zone="free"`) at
  y 900–924.

### 8.2 The dock match (the laptop at sunset)

1. **Measure R.** Read `svg.map-base.getScreenCTM()` in the laptop's `map` frame (after the 280 css pre-scroll) and
   compose it with the laptop's screen transform. This gives R, the on-stage rectangle where basemap units land. As
   of writing R = (1032.0, 261.0, 495.4 × 478.1), for the page's viewBox 50.47 241.27 644.60 622.18.
2. **Solve the camera.** DOCK16 is pitch 0, yaw 0, with `s` = (the CTM's mean x/y scale per unit) ÷ 10, target = the
   crop's center in table px, and (Cx, Cy) = R's center. The CTM's x and y scales may differ by up to 0.3%
   (`preserveAspectRatio="none"`); use their mean.
3. **Assert.** The four projected crop corners must match R's corners within **2.0 px**.
4. **Iris.**
   - 8 frames before the dock hit: the camera sits exactly at DOCK16 and `dof` is 0.
   - Over 8 frames before the hit: the laptop iframe fades in, clipped to R (`clip-path: inset()`), so the site's
     pins, labels and rose appear over an identical chart.
   - On the hit: the clip opens from R to the full screen over 8 frames (easeOut), while the laptop body fades in and
     scales 1.04 → 1.00 about R's center.
   - After the iris: a subtle drift (laptop rotateY 0 → −4°, rotateX 0 → 2°; the table's `s` × 1.00 → 1.02) until
     the sunset.

### 8.3 16:9 timeline, to the frame

Same grid as the Reel: bar n at 1.5 + 2(n−1) s = f 45 + 60(n−1); bar 16 f945, 17 f1005, 18 f1065, 19 f1125,
20 f1185.

| t (s) | f | Scene | Picture, camera and actions | On screen (§9) | Sound |
|---|---|---|---|---|---|
| 0.000 | 0 | | the poster (the render of f657), baked in | | |
| 0.033–1.150 | 1–34 | S1 | WB16, Night fill; the gold coast engraves; the phone lies lit at FDS | column (hook card, Night): ribbon "SHEETS 1–6 · TAMPA BAY", wordmark, clock line | as Reel |
| 0.100–1.000 | 3–30 | | the rose (200 px, on the paper margin at the chart's lower left) turns and lands on north at f30 | | ratchet, bell C6 |
| 0.400–0.900 | 12–27 | | the tagline wipes in | "An independent guide to Tampa Bay," / "every entry linked to its source" | glints |
| **1.500** | **45** | | **sunrise flip** (sweep f38–f47) | clock line "… · 7:16 AM" | **as Reel** |
| 2.000–3.483 | 60–104 | | the six badges drop on 8ths (WB16 positions) | | the six plucks A4 … F#5 |
| 3.500–4.600 | 105–138 | | the dive WB16 → FDS-R16; the column collapses 3.9–4.05 | | whoosh |
| 4.050–4.200 | 122–126 | S2 | the running head sets; the day rule and Row E appear | "SHEET 3 · GULF BEACHES · PARK", "7:16 AM", "SAT, DEC 19", **"One Saturday on the bay."**; Row E "Source: pinellas.gov · Checked Sep 27, 2026" | guajeo at 4.5 |
| **5.500** | **165** | | FDS star (real click); toast; push to FDS-P16 over 5.55–6.05 (the toast at 30.8 px, top y 760) | **"Added to My Trip · View"** | added motif |
| 7.500 | 225 | T1 | the phone lies down; the low flight 7.55–9.5 (`s` 1.65 → 0.26 at 8.5 → 0.825; pitch 55 → 62 → 55°; yaw 0 → −38 → 0°); the slot swap and ribbon change at 8.5 | "12:30 PM" (hours 8–12 on the 8ths 8.0–9.0) | claves strike the hours |
| **9.500** | **285** | S3 | the phone stands at Ybor; the chronometer settles | "SHEET 1 · TAMPA · HISTORIC DISTRICT", "12:30 PM", log **"Founded in 1886 as a planned cigar-making town."** (9.55); Row E "Source: nps.gov · Checked Sep 27, 2026" | tres hit A |
| **10.000** | **300** | | Ybor star (real click); toast (texture) | | added motif |
| 10.900–11.700 | 327–351 | | scroll to `#timeline` (clock ×3; the toast ends at about f350) | | güiro |
| 11.700–13.000 | 351–390 | | **the timeline roll**: entry k's top reaches the reading line (css 200) at 11.75 + 0.125k (k = 0…10); the years pass in the phone (25 px, texture); the chronometer stays at the clock | (texture) | **one tres note per year on 16ths**, rising through F#m (F#4 A4 C#5 F#5 A5 A5 C#6 F#6 A6 C#7 F#7; the two 1891 entries repeat a note); clave cinquillo |
| 13.000–13.500 | 390–405 | | the whip to the Sources | | güiro |
| 13.500–13.800 | 405–414 | | push to YB-P16 (2.4 px/css; the source line top y 620, left x 780) | log "Every entry links to its source." (13.55, secondary) | |
| **13.800–15.500** | **414–465** | | hold on the proof | **"Source: nps.gov · Checked Sep 27, 2026"** (31 px) | **proof accent at 13.8** |
| 15.500–19.000 | 465–570 | T2 | the phone lies down; the golden hour and the flight to the dock (`s` 1.8 → 0.20 at f525 → 0.0768; pitch 55 → 30 → 0°; yaw 0 → +15 → 0°; `grade` 0 → 0.16); the log line fades | "5:35 PM" (hours 1–5 PM at 16.25, 16.75, 17.25, 17.75, 18.25) | band thins; brass crescendo; claves |
| 18.800–19.500 | 564–585 | | the camera at DOCK16 exactly; the laptop iframe fades in clipped to R (19.1–19.37); the body fades in (19.2–19.5) | | |
| **19.500** | **585** | S4 | **DOCK HIT**; the iris opens (19.5–19.77) | ribbon "PLAN · 1,407 ON THE CHART" (the map page's kicker); log **"Everything in this guide that has coordinates, on one chart."** (19.55) | **tres C#5 and a brass stab** |
| **21.500** | **645** | | **SUNSET FLIP** (W = SS). The terminator crosses R's center at f645. The laptop's map turns to the Night chart (gold coast) by the system setting; the column flips | "5:38 PM"; footnote **"AUTO DARK MODE AT SUNSET · THE GUIDE FOLLOWS THE DEVICE"** (21.55) | **brass F, ship's bell C6 ×2, thump F1, ocean → river** |
| 21.600–22.400 | 648–672 | | the cursor glides to the events cluster that contains the parade's place (found by projecting the place's lat/lng through the chart CTM and hit-testing `.pin-cluster, .pin`) | | |
| **22.500** | **675** | | **CLICK** (real) → the map's own zoom (under reduced motion it jumps as the site does); the Riverwalk flag is visible | | trackpad click, paper swish |
| 23.300–24.100 | 699–723 | | the laptop slides out (23.3–23.7); the swing DOCK16 → RW-R16 (pitch 0 → 55°); the phone stands at the Riverwalk (23.7–24.1), What's On (Night); the clock ramps SS + 1.8 s → 17:52:00.000 | | whoosh |
| 24.100 | 723 | S5 | | "PARADE · DOWNTOWN TAMPA", log **"Tampa Riverwalk Holiday Lighted Boat Parade"**, mirror **"IN 23 MIN"**, "5:52 PM"; Row E "Source: thetampariverwalk.com" | night groove in F |
| **24.500** | **735** | | parade star (real click); push to RW-P16 (card top y 120) 24.5–24.9; toast (texture) | | added motif |
| **27.500–29.500** | **825–885** | | **countdown**: minute k at 27.5 + 2k/23 | "IN 22 MIN" … "IN 1 MIN" | **celesta scale, 22 notes** |
| **29.500** | **885** | | **STARTED** | mirror "STARTED"; log **"“Started”, never “Now”"**; footnote "END TIME NOT LISTED" (29.55) | **tutti, cascade, bell** |
| 30.850 | 926 | S6 | dock Trip tap; crossfade to `trip` 30.95–31.05; pull back to *-R16 | "PLAN · YOUR LIST" | tap |
| **31.500** | **945** | | **SHARE** (real click); push (the toast top y 760); the link types on 31.8–32.6 | **"Link copied"** (30.8 px); log **"One day, one link."** (31.55, held to 34.1) | arpeggio, typing ticks |
| **33.500** | **1005** | | the phone lies down (33.5–33.8). **The magenta course arc** draws from the phone to the upper right, a quadratic Bézier with the site's course arrowhead (33.5–33.9). The laptop's `shared` slot navigates to the clipboard link on origin B (loaded before f1006). The laptop slides back in (33.6–34.1); push the laptop 0.72 → 1.6 px/css about `.trip-shared` (34.1–34.5) | in device: **"A shared trip"** (32 px), "1 event · 2 places.", "Add 3 to my trip" | a pluck glissando along the arc |
| **35.500** | **1065** | | **CLICK "Add 3 to my trip"** (`[data-trip-add-all]`, real) | toast "Added 3 items to My Trip"; log mirror **"Added 3 items to My Trip"** (35.55); sidebar "3 in My Trip" (texture) | trackpad click; added motif as 3 notes |
| **37.500** | **1125** | S7 | the laptop slides out; the pull-back → WB16 (37.5–38.7); the course glows with its symbols; dots 37.9–38.6 | | **drums out; whoosh; glints; the clave's 3-side A4 C5 D5 at 37.5, 38.25, 39.0** |
| 37.600 | 1128 | S8 | the column becomes the masthead; the plate rises over the chart | ribbon "SHEETS 1–6 · TAMPA BAY"; wordmark; **"641 PLACES · 414 PLACES TO STAY · 589 EVENTS"**; "Every entry links to its source."; **the About line** "Printed like the region's own graphic art, the Ybor City cigar-box label."; plate: **URL**, **independence line**, attribution | brass pad pp |
| **39.500** | **1185** | | | | **F6/9 end chord; bell C6 ×2** |
| 40.000, 40.500 | 1200, 1215 | | | | **the 2-side: G4, F4** |
| 40.500–41.500 | 1215–1244 | | hold; f1244 is the last frame | | decay; ocean |

**16:9 clock anchors W(t):**

| t (s) | W | Segment ending here |
|---|---|---|
| 0.000 | 07:14:00.000 | load |
| 1.500 | SR | ramp |
| 7.550 | SR + 6.050 s | real |
| 8.0 · 8.25 · 8.5 · 8.75 · 9.0 | 08:00 · 09:00 · 10:00 · 11:00 · 12:00 | T1 |
| 9.500 | 12:30:00.000 | T1 |
| 10.900 | 12:30:01.400 | real |
| 11.700 | 12:30:03.800 | ×3 (the Ybor toast, tapped at 12:30:00.5, ends at 12:30:03.7, about f350) |
| 15.550 | 12:30:07.650 | real (the roll and the proof) |
| 16.25 · 16.75 · 17.25 · 17.75 · 18.25 | 13:00 · 14:00 · 15:00 · 16:00 · 17:00 | the golden hour |
| 19.000 | SS − 2.500 s | the golden hour |
| 21.500 | SS | real (dock at 19.5; **the sunset flip frame**) |
| 23.300 | SS + 1.800 s | real |
| 24.100 | 17:52:00.000 | ramp ("IN 23 MIN") |
| 27.500 | 17:52:03.400 | real |
| 27.5 + 2k/23 (k = 1…22) | 17:52 + k min | countdown |
| 29.500 | 18:15:00.000 | **"STARTED"** |
| 41.500 | 18:15:12.000 | real |

**16:9 poster, f657 (21.900 s):** the laptop's map just turned to the Night chart (gold coast on bay navy, today's
flags), with the table dark around it and the cursor on its way. The column reads "PLAN · 1,407 ON THE CHART",
"5:38 PM", "Everything in this guide that has coordinates, on one chart." and the footnote. It is baked in as frame 0
and exported as `poster-16x9.jpg` and `thumb-1280x720.jpg`.

---

## 9. Every word on screen, with its source

The renderer reads each item at render time. It fails if it cannot find the item, or if what it finds differs from
what the cue expects. "Live" means read from the device's DOM in the frame being drawn.

### 9.1 Stage type

| Line (as shown) | Cut | Source | How read and checked |
|---|---|---|---|
| Wordmark "TAMPA BAY / Chartbook" | both | `design/brand/wordmark.svg` (outlined); the name is `site.config.json` `siteName` | file; `siteName` = "Tampa Bay Chartbook" |
| "SHEETS 1–6 · TAMPA BAY" (ribbon) | both | built `index.html` `.mast-line .side` (first), in caps | present |
| "An independent guide to Tampa Bay," / "every entry linked to its source" | both | `site.config.json` `siteTagline`, split at the first ", " | must split into exactly 2 parts |
| "SATURDAY, DECEMBER 19 · 7:14 AM" (clock line) | both | `fmtDayLong` · `fmtTime` (§5.3), in caps | equal to `[data-tb-clock]` on the check page |
| "7:16" "AM" (chronometer) | both | `fmtTime(nyParts(W).hhmm)`, split at the space | per frame |
| "SAT, DEC 19" (date) | both | `fmtDay(date)`, in caps | |
| "SHEET 3 · GULF BEACHES · PARK" / "SHEET 1 · TAMPA · HISTORIC DISTRICT" (ribbons) | both | the slot's `.page-head .kicker span`, in caps | live |
| "PARADE · DOWNTOWN TAMPA" (ribbon) | both | the card's `.ev-kind`, in caps; the fill is the card's `data-sheet` | live |
| "PLAN · YOUR LIST" / "PLAN · 1,407 ON THE CHART" (ribbons) | both / 16:9 | the slot's `.page-head .kicker` text without its `.sec-num`, in caps | live; the map kicker's number = `li.map-li[data-ll]` count |
| "One Saturday on the bay." | both | **hand-written** (§9.3) | |
| "Every entry links to its source." | both | built footer `.footer-indep`: the text after the `<b>` (`build/core/shell.mjs`) | |
| "Founded in 1886 as a planned cigar-making town." | 16:9 | the `ybor` slot's `.page-head .lede`: the substring from "founded" to the end of its first sentence, with the first letter capitalized | the substring exists; = `places.json#ybor-city-historic-district.summary` |
| "Everything in this guide that has coordinates, on one chart." | 16:9 | the `map` slot's `.page-head .lede`, first sentence | |
| "AUTO DARK MODE AT SUNSET · THE GUIDE FOLLOWS THE DEVICE" | both | **hand-written** (§9.3) | behavior asserted (§5.3) |
| "Tampa Riverwalk Holiday Lighted Boat Parade" | both | the card's `.ev-title` (= `events.json` `title`) | live |
| "IN 23 MIN" … "STARTED" (mirror) | both | the card's `.ev-status`, in caps, with its computed style | must equal the card in the same frame; never "NOW" |
| "“Started”, never “Now”" | both | built `about.html`, the "What the sources don't say" table: the row whose `th` is "Events whose end time is not listed", its `td[data-label="Printed as"]`, the part after "; " (curly quotes kept) | present |
| "END TIME NOT LISTED" (footnote) | both | the card's `.ev-when .unk`, in caps | live |
| "One day, one link." | both | **hand-written** (§9.3) | |
| the typed link "fritzhand.github.io/visit-tampa-bay/trip.html#e=…;p=…" (texture) | both | the clipboard after the real share, with its origin and path prefix replaced by `siteBase` minus "https://" | equals `siteBase + "trip.html#" + tripHash(…)` |
| "Added 3 items to My Trip" (mirror) | 16:9 | the live toast text on origin B | live |
| "641 / PLACES · 414 / PLACES TO STAY · 589 / EVENTS" | both | numbers: `load()` → places, stays and live events (not cancelled or postponed); nouns and order from the built `<meta name="description">` ("641 places, 414 places to stay and 589 events") | the three numbers equal `.mast-dek`'s and the meta description's |
| "Printed like the region's own graphic art, the Ybor City cigar-box label." | 16:9 | built `about.html` "What this is", the sentence beginning "It is printed like …", with "It is " dropped and the first letter capitalized | present |
| "fritzhand.github.io/visit-tampa-bay" | both | `site.config.json` `siteBase` minus "https://" and the trailing slash | |
| "Independent guide. Not affiliated with any tourism office, venue or operator." | both | built footer `.footer-indep b` | equals the brief's line exactly |
| Map attribution (fine print) | both | the built `map.html`'s attribution (`ATTRIBUTION` in `build/pages/map.mjs`), without the URL in parentheses | |
| "6 AM", "12 PM", "6 PM" (the day rule, texture) | 16:9 | `fmtTime("06:00")` etc. | |
| Row E source lines (secondary) | 16:9 | the slot's last `.source-line` (places) or the card's `.ev-src` | live |

### 9.2 Inside the devices (all live, all the site's own)

Everything visible in a device is the real page at that clock. The lines the story leans on:

- **Must-read in device:**
  - the first toast "Added to My Trip · View" (Reel 39 px, 16:9 30.8 px);
  - "Source: nps.gov · Checked Sep 27, 2026" (36.4 / 31.2 px);
  - "Link copied" (39 / 30.8 px);
  - "A shared trip" (16:9, 32 px).
- **Secondary:**
  - the h1s;
  - "In My Trip";
  - the dock badges 1, 2, 3;
  - the What's On sticky "Saturday, December 19 · 5 events · Today";
  - the parade card;
  - "1 event · 2 places. Saved in this browser, on this device.";
  - the map's kicker and flags.
- **Device chrome** (texture): the status-bar clock, the address pill, the laptop's browser bar.

### 9.3 Everything hand-made, the complete list

1. **"One Saturday on the bay."** (the story's kicker, first log line).
2. **"AUTO DARK MODE AT SUNSET · THE GUIDE FOLLOWS THE DEVICE"** (the honesty footnote on the edition flip). It is
   true for a device set to automatic appearance, which the video's devices are. The site follows the system setting
   until a reader picks an edition (`site/js/core/theme.js`, `initTheme` → `onSys`), and the render asserts that no
   edition was stored.
3. **"One day, one link."** (the punchline).
4. Marks only: the middots between counts, case changes to caps for labels, the first-letter capitals on the two
   excerpts, the dropped "It is " on the About line, the arrowhead on the course arc, and device chrome.

---

## 10. Reading time

The rule (Cincy's, made 3D-aware in §16.1): a line counts only while settled, meaning:

- opacity 1;
- speed ≤ 2 px/frame and ≤ 0.4% scale change per frame;
- not `data-busy`;
- for device text, a plane angle ≤ 20° to the view ray and a projected cap height ≥ 26 px (9:16) or ≥ 22 px (16:9).

It must hold for max(floor, 0.3 s × words), where the floor is 0.8 s for 1–3 words and 1.2 s otherwise. A clock time
counts as 2 words, a URL as 3, and "·" and "–" as none. "Secondary" lines must pass their own time but are left out of
the in-order scene load.

### 10.1 Reel

| Scene | Line | Words | Settled (s) | For | Needs | Role |
|---|---|---|---|---|---|---|
| S1 | wordmark | logo | 0.03–3.90 | 3.87 | 0.8 | must |
| S1 | tagline line 1 | 6 | 0.65–3.90 | 3.25 | 1.8 | must |
| S1 | tagline line 2 | 6 | 0.90–3.90 | 3.00 | 1.8 | secondary |
| S1 | ribbon "SHEETS 1–6 · TAMPA BAY" | 4 | 0.03–3.90 | 3.87 | 1.2 | secondary |
| S1 | clock line | 5 | 1.50–3.90 | 2.40 | 1.5 | secondary |
| S2 | "One Saturday on the bay." | 5 | 4.35–7.50 | 3.15 | 1.5 | must |
| S2 | toast "Added to My Trip · View" (in device) | 5 | 6.05–7.55 | 1.50 | 1.5 | must |
| S2 | ribbon, chronometer, date | ≤ 6 | 4.20–7.50 | 3.30 | ≤ 1.8 | secondary |
| S3 | "Every entry links to its source." | 6 | 9.70–13.50 | 3.80 | 1.8 | must |
| S3 | "Source: nps.gov · Checked Sep 27, 2026" (in device) | 5 | 12.00–13.50 | 1.50 | 1.5 | must |
| S3 | Ybor toast (texture) | | 10.05–10.90 visible | 0.85 | ≥ 0.8 visible | texture |
| S4–S5 | footnote (dark mode) | 9 | 15.70–21.50 | 5.80 | 2.7 | secondary |
| S5 | "Tampa Riverwalk Holiday Lighted Boat Parade" | 6 | 16.45–21.50 | 5.05 | 1.8 | must |
| S5 | mirror "IN 23 MIN" | 3 | 16.45–19.50 | 3.05 | 0.8 | must |
| S5 | "“Started”, never “Now”" | 4 | 21.70–23.05 | 1.35 | 1.2 | must |
| S5 | mirror "STARTED"; footnote "END TIME NOT LISTED" | 1; 4 | 21.65–23.05; 21.70–23.05 | 1.40; 1.35 | 0.8; 1.2 | secondary |
| S6 | "Link copied" (in device) | 2 | 24.05–25.50 | 1.45 | 0.8 | must |
| S6 | "One day, one link." | 4 | 23.70–26.10 | 2.40 | 1.2 | must |
| S7–S8 | count block | 8 | 26.25–30.50 | 4.25 | 2.4 | must |
| S8 | URL | 3 | 27.15–30.50 | 3.35 | 0.9 | must |
| S8 | independence line | 11 | 27.15–30.50 | 3.35 | 3.3 | must (fine print in the in-order read) |
| S8 | "Every entry links to its source." | 6 | 27.15–30.50 | 3.35 | 1.8 | secondary |

**In-order loads (Reel):**

- S1: wordmark, then tagline 1, done by 2.63 (the card collapses at 3.9).
- S2: kicker 4.35–5.85, then the toast 6.05–7.55.
- S3: claim 9.70–11.50, then the proof 12.00–13.50.
- S5: title 16.45–18.25, then the mirror 18.25–19.05 (before the countdown at 19.5). At STARTED, the log line
  21.70–22.90.
- S6: "Link copied" 24.05–24.85, then the punchline 24.85–26.05.
- End: counts 26.25–28.65, then the URL 28.65–29.55. The independence line is fine print, as in Cincy's end card: it
  passes its own time and the share copy repeats it.

### 10.2 16:9

| Line | Settled (s) | Needs | Role |
|---|---|---|---|
| wordmark; tagline 1 | 0.03–3.90; 0.65–3.90 | 0.8; 1.8 | must |
| "One Saturday on the bay." | 4.35–7.50 | 1.5 | must |
| FDS toast (30.8 px) | 6.05–7.55 | 1.5 | must |
| "Founded in 1886 as a planned cigar-making town." | 9.70–13.55 | 2.4 | must |
| source line (31.2 px) | 13.80–15.50 | 1.5 | must |
| "Every entry links to its source." | 13.70–15.50 | 1.8 | secondary |
| "Everything in this guide that has coordinates, on one chart." | 19.70–23.30 | 3.0 | must |
| footnote (dark mode) | 21.70–29.50 | 2.7 | secondary |
| the parade title; mirror "IN 23 MIN" | 24.25–29.50; 24.25–27.50 | 1.8; 0.8 | must |
| "“Started”, never “Now”" | 29.70–31.05 | 1.2 | must |
| "Link copied" | 32.05–33.50 | 0.8 | must |
| "One day, one link." | 31.70–34.10 | 1.2 | must |
| "A shared trip" (in device) | 34.50–35.50 | 0.8 | must |
| "Added 3 items to My Trip" | 35.70–37.50 | 1.5 | must |
| count block; URL; independence line | 37.75–41.50 | 2.4; 0.9; 3.3 | must |
| the About line | 37.75–41.50 | 3.6 | secondary |

**In-order loads (16:9):**

- 2.63 (S1).
- 7.55 (S2).
- 12.10 and 15.30 (S3).
- 22.70 (S4).
- 26.85 and 30.90 (S5).
- 34.05, 35.30 and 37.20 (S6).
- Counts 37.75–40.15, then the URL 40.15–41.05 (S8).

---

## 11. Typography, color and ornament

- **Fonts:** the site's self-hosted fonts, loaded from the private build's `assets/fonts` through `assets/tokens.css`
  and `assets/site.css`.
  - Bodoni Moda: 800 for the chronometer, counts and numerals; 700 for titles and the punchline; italic 540 for log
    lines and the tagline.
  - Figtree 650 / 400: the URL and the independence line.
  - Archivo 680 at `font-stretch` 108% (labels) or 125% (ribbons), in caps with `--track-label` or
    `--track-label-wide`.
  - Numerals are `tabular-nums lining-nums`.
- **Font check:** `document.fonts.check` passes for each face in the stage and in every device frame before frame 1.
- **Sizes (9:16):** must-read stage type ≥ 44 px. The independence line is 34 px (fine print). Secondary type is
  ≥ 24 px, and fine print (`data-zone="free"`) ≥ 20 px. The 16:9 floors are 40 / 30 / 22 / 20 px.
- **Color:**
  - Only token values from the built `assets/tokens.css`. The stage links it and sets `data-theme` on its own `<html>`.
  - Gold is for ornament (the frame, corner stars, rules). `--gold-ink` is used only where gold is text.
  - Magenta is for the course, the arc, the day rule's "now" marker and the cursor ring.
  - A sheet's ink appears only on its own badge, ribbon and symbol ring.
  - Device materials are the only literals (`DEVICE` in `lib/promo-stage.mjs`).
- **Ornament (DESIGN §7, §13):**
  - one label frame with one ribbon at a time;
  - water lining only as the basemap's own;
  - the rose;
  - the graticule neatline on the chart's margin;
  - the cartouche plate at the end.
  - No texture images, glows, drop-shadowed ribbons, cigars or smoke.
  - The golden-hour grade is lighting on the table (≤ 16%), never on type or devices.

---

## 12. The score

### 12.1 Spec

- **Tempo and meter:** 120 BPM, 4/4, son clave 3-2. A 3-beat pickup (0–1.5 s); the downbeat of bar n is at
  1.5 + 2(n−1) s. A beat is 15 frames. Picture hits round 8ths to the nearest frame (±17 ms), and audio sits on the
  exact sample.
- **Keys:** the night pickup is in **F major**. Sunrise modulates a major third up to **A major** (day). Sunset turns
  a major third down to **F major** (night). The end resolves on **F6/9**, so the last bar flows into the night
  pickup and the loop is musical.
- **Motifs:**
  - **The sheets:** six plucks on A-major degrees 1–6 (A4 B4 C#5 D5 E5 F#5), one per badge.
  - **The hours:** claves on the hour anchors (A5 B5 C#6 D6 E6 in the morning run; C#6 D6 E6 F#6 G#6 in the golden
    hour).
  - **The countdown:** 22 celesta notes up the F major scale, F4 → F7.
  - **The sonic logo:** the clave rhythm voiced 3 up and 2 down, in F. The 3-side (A4 C5 D5) plays during the
    pull-back, and the 2-side (G4 → F4) closes on the end card.
  - **The ship's bell:** pairs at sunrise (E5), sunset, "STARTED" and the end (C6).
- **Written to picture:** every cue comes from `lib/promo-cues.mjs`, the same module that drives the picture. Hour,
  minute and year notes sit on the instants where W(t) crosses them, and those instants are anchored to the grid by
  construction (§5.2).
- **Loudness:** −14.0 LUFS integrated (±0.5), ≤ −1.0 dBTP measured on the decoded AAC, LRA ≤ 9 LU. 48 kHz stereo,
  AAC 256 kb/s.

### 12.2 Instruments

All are synthesized: port Cincy Week's `collateral/lib/synth.mjs` (its biquads, envelopes, Freeverb, mixer and WAV
writer) and extend it. All noise is seeded.

| Voice | Model | Use |
|---|---|---|
| `tres` | Karplus-Strong. Two strings per course (unison ±3 cents; the middle course an octave pair). Pick-position comb β 0.13, a velocity low-pass (2.5–7 kHz), loop ρ 0.9965 (0.95 when damped), an allpass for fractional tuning, body peaks at 220 Hz (Q 2) and 1.1 kHz (Q 3). `tresStrum` staggers strings by 14 ms | guajeo, strums, badge plucks, year notes, "added" motifs, the logo |
| `bass` | a sine plus a low-passed triangle, a −30 cent scoop over 25 ms, a round decay | tumbao (2& and 4, anticipated) |
| `clave` | modal: 2.45 and 3.9 kHz, τ 28 and 12 ms, plus a 1 ms click | 3-2 pattern, hour strikes, the logo |
| `bongo` | membrane modes with pitch drop (macho 420 → 395 Hz, hembra 300 → 282 Hz; ×1.59 and ×2.14 partials); `slap` adds band-passed noise | martillo, accents |
| `maracas` | high-passed noise bursts (3 ms attack, 40 ms decay), alternating seeds | 8ths |
| `guiro` | 1 ms noise clicks through a 2.8–3.2 kHz band-pass. The rate follows the device scroll speed during scrolls | scrolls |
| `brass` | three voices of 3 detuned saws; the filter blats 600 → 3200 Hz in 40 ms, then 1400 Hz; 5 Hz vibrato after 0.3 s; a pad variant with a 250 ms attack | sunrise, golden hour, sunset, end |
| `celesta` | FM 1:1 plus a ×4 partial, decay 0.8 s | glints, the countdown, the cascade, the dots |
| `shipsBell` | eight inharmonic partials (0.5, 1, 1.183, 1.506, 2, 2.514, 2.662, 3.011; decays 3.2 → 0.4 s) with a strike transient | sunrise, sunset, STARTED, end |
| `ocean`, `river` | two decorrelated pink noises with a swelling low-pass (250 → 1800 Hz on a 6.4 s wave, ±15% jitter); the river is band-passed 400–2500 Hz with 1.1 s laps | day and night beds |
| `burin` | noise band-passed 2–4 kHz with 30–60 Hz chatter; amplitude = the engraving's draw speed, panned with the leading point | the hook's engraving |
| `ratchet` | a 3 kHz, 8 ms tick at every 11.25° of the rose's rotation, from the same easing | the rose |
| `stamp` | a sine thump dropping to the badge's note, plus a paper slap | the badges |
| `proof` | a wood-block stamp (1.2 / 1.9 kHz modes) plus a tres harmonic A6 (Reel 12.0, 16:9 13.8) | the source line lands |
| `tap`, `whoosh`, `thump`, `riser`, trackpad `click`, `paperSwish`, `woodTick` | Cincy's, retuned to the key | taps, flights, clicks, typing |

### 12.3 Arrangement, bar by bar (Reel)

The guajeo in A takes one chord per half bar, on 8ths: A4 E5 C#5 E5 | D5 A4 F#5 A4 | E5 B4 G#5 B4 | F#5 D5 A4 D5 (A–D
/ E–D). The night guajeo is the same shape in F (F–B♭ / C–B♭). The tumbao plays the root on 2& and the root or fifth
on 4, anticipating the next chord.

| Bar (t) | Section | Parts | Picture hits |
|---|---|---|---|
| pickup (0) | Night | ocean (LPF 350 Hz), F pad (brass pp, F2 C3 A3), celesta C6 A5 F5 at 0.25, 0.5, 0.75, burin 0.03–1.15, ratchet 0.1–1.0, bell C6 at 1.0, riser 1.0–1.5 | engraving, rose on north |
| **1 (1.5)** | **Sunrise** | tres strum A, brass swell A, **bell E5 ×2**, thump A1, ocean opens; the six badge plucks and stamps at 2.0 … 3.25 | the flip; the badges |
| 2 (3.5) | Dive | whoosh 3.9–4.5; the guajeo, claves and maracas enter at 4.5 | the dive; the running head |
| 3 (5.5) | Morning | groove; the added motif at 5.5; tumbao and bongó at 6.5 | FDS star |
| 4 (7.5) | Crossing | E pedal, whooshes, **claves 8.0–9.0** | T1 |
| 5 (9.5) | Midday | tres hit A, full groove plus güiro; the added motif at 10.0; the güiro follows the whip 10.9–11.7 | Ybor, star, whip |
| 6 (11.5) | Proof | F#m, then D at 12.5 and E at 13.0; bongó out; **proof accent at 12.0** | the source line |
| 7 (13.5) | Golden hour | tres tremolo, E2 pedal, brass E7sus4 → E7 crescendo, claves 14.0–15.0 | the orbit |
| **8 (15.5)** | **Sunset** | **brass F fp and swell, bell C6 ×2, thump F1, glints, ocean → river**; the added motif at 16.5; the night guajeo from 16.5 | the flip; parade star |
| 9 (17.5) | Evening | night groove (clave, soft bongó, tumbao in F) | reading |
| **10 (19.5)** | **Countdown** | clave and tres only; **celesta F4 → F7 on the 22 minute crossings**; bass pedal C2; crescendo | "IN 22 MIN" … "IN 1 MIN" |
| **11 (21.5)** | **Started** | **tutti F add9, cascade C7 → F5, bell C6 ×2, bongó slap**; soft groove from 22.0; tap at 22.85 | STARTED |
| 12 (23.5) | Share | arpeggio C6 F6 A6; typing ticks 23.8–24.6; softer groove | "Link copied" |
| 13 (25.5) | Pull-back | drums and bass out; whoosh up; 40 glints panned by dot x; **the clave's 3-side A4 C5 D5 at 25.5, 26.25, 27.0**; brass pad F pp | the night bay; counts |
| **14 (27.5)** | **End** | **F6/9: tres strum, brass pad, bell C6 ×2; the 2-side G4 (28.0), F4 (28.5)** | the end card |
| 15 (29.5) | Tail | decay to −40 dB by 30.2; the ocean at the pickup's level | the loop joint |

**16:9** uses the same material on the same grid:

- the hour claves at the 16:9 anchors;
- the Ybor roll (11.75–13.0): one tres note per year on 16ths over F#m;
- the dock hit at 19.5 (tres C#5 and a brass stab);
- the sunset at 21.5;
- the map click at 22.5 (trackpad click and paper swish);
- the countdown 27.5–29.5 and STARTED at 29.5;
- the share at 31.5 and the arc at 33.5 (a pluck glissando);
- "Add 3" at 35.5 (a trackpad click and the added motif as three notes);
- the pull-back and the 3-side at 37.5, 38.25 and 39.0;
- the end chord at 39.5, the 2-side at 40.0 and 40.5, and the tail to 41.5.

Sections stretch by whole bars. Nothing is time-stretched.

### 12.4 Mix and loudness

- **Buses** (gain / room send / filter):
  - tres 0.7 / 0.22 / hp 120;
  - bass 0.8 / — / lp 900, ducked 0.35 under the bongó slaps;
  - perc 0.6 / 0.08 / hp 200;
  - brass 0.45 / 0.30 / hp 180;
  - celesta 0.4 / 0.38 / hp 400;
  - bell 0.4 / 0.45;
  - ocean/river 0.35 / 0.10;
  - sfx 0.5 / 0.20 / lp 8 kHz.
- **Room:** one Freeverb (size 0.78, damp 0.4, predelay 20 ms). Effects sit 6–10 dB under the music and are pitched to
  the key.
- **Master:** hp 30 Hz, a 2:1 glue compressor over −16 dBFS, and a soft ceiling.
- **Loudness passes:**
  - Pass 1 measures with ffmpeg `ebur128=peak=true` and applies a linear gain to −14.0 LUFS. A 4× oversampled
    look-ahead limiter (5 ms) with a −1.2 dBFS ceiling follows.
  - Mux: AAC 256k.
  - Pass 2 decodes the AAC from the MP4 and verifies: −14 ± 0.5 LUFS, true peak ≤ −1.0 dBTP, no sample over
    −0.5 dBFS, DC offset < 0.001, and the largest sample-to-sample step < 0.25 at section joins. Otherwise the render
    fails. `lib/review-tools.mjs audio` prints the numbers.
- **Restraint:**
  - no cymbals;
  - no riser or whoosh longer than 0.6 s except the 1.2 s pull-back whoosh;
  - no sound on a text slam unless listed;
  - every idea must also read muted.

---

## 13. It reads with the sound off

- The chronometer, the sunrise and sunset sweeps and the edition flips carry the day.
- Every tap shows its result in words: "In My Trip", "Added to My Trip · View", the dock badge, "Link copied" and, in
  16:9, "Added 3 items to My Trip".
- The proof is a sentence and its evidence: "Every entry links to its source." next to "Source: nps.gov · Checked Sep
  27, 2026".
- The payoff is a word: "IN 23 MIN" counts down to "STARTED", with "“Started”, never “Now”".
- The ending is a picture and an address: the night bay with the day's course, then the URL.
- **Captions:** each cut ships an `.srt` holding every must-read line at its on-screen time, the key live words, and
  "[Original score: son montuno with tres, claves, brass and a ship's bell]" at 0.0–1.5.

---

## 14. Covers

- **9:16 cover:** f37 (1.233 s), Night (§7.4). It is exported as `cover-9x16.jpg` and **baked in as frame 0**.
  - Because it is Night, the loop has no Day/Night flash: the last frame (Night bay, masthead), then frame 0 (Night
    bay, hook card), then frame 1 (Night bay, the engraving starting). Only the card's content changes, and the
    engraving restarting reads as intentional.
  - It survives the 3:4 grid crop (y 240–1680). At grid size the wordmark is about 190 px wide.
  - Alternate (informational): the S5 "STARTED" frame at 22.0 s.
- **16:9 poster:** f657 (21.9 s), Night (§8.3). It is exported as `poster-16x9.jpg` and `thumb-1280x720.jpg`, and
  baked in as frame 0. The poster, the hook and the end are all Night, so the loop never flashes.
- `--no-bake-cover` renders without the baked frame 0.

---

## 15. Images and credits

- **No photographs on the stage.** The table is the site's SVG basemap with its tokens, and every ornament is SVG or
  CSS.
- **Inside the devices** as of writing (`images.json`: 21 entries), Fort De Soto Park and the Ybor City Historic
  District show the site's typographic plates. What's On, My Trip and the map show no photographs. Image processing is
  still running, so this can change.
- **At render time** every `<img>` visible in a device viewport is listed:
  - It fails unless its `src` is under the build's `assets/img/` with an `images.json` entry carrying `credit` and
    `license`.
  - An image covering ≥ 15% of a device viewport for ≥ 15 frames gets an on-screen credit for as long as it shows
    (Figtree 22 px, `--text-muted`, just above the device's toolbar and inside the safe zone), e.g. "Photo:
    <credit> (<license>)".
  - Every image that appears goes into the README's credits table: subject, creator, license and page URL.
- **Map credit:** the fine print on the end plate, and the README with the full `ATTRIBUTION` and the ODbL link.

---

## 16. Audit, assertions, risks

### 16.1 The per-frame audit (`lib/promo-audit.mjs`)

Failures stop the render and write `.cache/promo/audit-<cut>.txt` plus the failing frame's PNG.

| Check | Rule |
|---|---|
| Reading time and in-order load | §10. Stage lines carry `data-read="<words>"` (with `data-role="must|secondary"`) and are measured by their own text line boxes (Cincy's `AUDIT_JS`). Device must-reads are selectors in the cue module: their boxes come from the frame's rects, mapped through the device's 4×4 matrix and perspective-divided. The projected cap height is the font's cap-height ratio × the projected font size; the plane angle comes from the analytic pose |
| Safe zone | §6, for every settled must-read box |
| Size | §11 floors; in-device must-reads ≥ 36 px (9:16) and ≥ 30 px (16:9) |
| Fonts | `document.fonts.check` in the stage and in every device frame |
| **Name guard** | Built at render time from: tourism offices ("Visit Tampa Bay", "visittampabay", "Visit St. Pete", "Visit St. Pete/Clearwater", "visitstpeteclearwater", "Visit Florida", "visitflorida"); every team name parsed from `events.json` titles of `kind: "sports"` (split on " vs. " and " at "); and those events' source hosts (e.g. gousfbulls.com, nhl.com). It fails if any is visible with a cap height ≥ 14 px, settled, for ≥ 9 consecutive frames, in a device viewport or on the stage. Scrolls may pass them as blur. The What's On resting scroll keeps the card above (USF Bulls; Plan B's Lightning) off screen |
| Word filter | §2, on every stage string |
| Forbidden strings | visible in no device viewport in any frame: "Test clock", "Loading today's listings", "Loading your trip", "Something went wrong", "TBA", "TBD"; "Now" never on the parade card or the mirror; console errors in no device frame |
| Live words | the mirror equals the card's `.ev-status` in the same frame; "IN 23 MIN" at the anchor frame; "In 1 min" on the frame before STARTED; "STARTED" at W = 18:15:00.000 and not before |
| Editions | every device's `data-theme`: dark before the SR frame, light from SR to the frame before SS, dark from SS; `tbc-theme` absent on both origins |
| Taps and storage | §5.4 after each action |
| Table sharpness | screen px per texture px ≤ 1.6 over the visible table unless `dof ≥ 1.0` (computed from the camera and the LOD) |
| Device sharpness | at each push hold, the Laplacian variance of the pushed must-read box ≥ 0.7× that of the same element captured flat at the same scale |
| Motion caps | §4.5 |
| Dock match | ≤ 2.0 px at the 16:9 dock frames |
| No horizon hole | §4.5 |
| Toast lifetimes | no toast removed before its reading window ends; no toast visible over the 16:9 timeline roll |
| Images | §15 |
| Determinism | frames {37, 300, 600, 900} (Reel) and {37, 400, 800, 1200} (16:9) are re-rendered from a fresh context after the main pass; PSNR ≥ 50 dB |

### 16.2 Render-time reads and assertions (fail on any mismatch)

- **`site.config.json`:** `siteName`, `siteTagline` (two parts at ", "), `siteBase` (https), and `dataWindow` (the
  plan's date inside it).
- **Counts:** `load()` counts = the built home's `.mast-dek` numbers = the `<meta name="description">` numbers. The
  map kicker's number = `li.map-li[data-ll]` count.
- **The event:** `date`, `start`, `end` null, `place`, `status` "scheduled" (not cancelled, postponed, changed or
  tentative), and its card renders with a star.
- **`fort-de-soto-park`:** `status` open; `hours_text` starts "Daily, 7 a.m. to sunset"; `status_note` names no date
  in December; `heritage` present (landmark symbol).
- **`ybor-city-historic-district`:** `status` open; the lede contains "founded in 1886 as a planned cigar-making town";
  `#timeline li` count ≥ 5; the last `.source-line` text starts "Source: nps.gov" and contains "Checked".
- **Sun:** the two methods agree within 3 min; `SR < 07:30`; `SS < start − 10 min`; `A_eve` computed as in §3.3.
- **Pages:** `about.html`'s "Printed as" cell contains "“Started”, never “Now”"; its "What this is" paragraph contains
  "It is printed like the region's own graphic art, the Ybor City cigar-box label."; the footer lines match.
- **The share link:** it decodes to exactly the three ids. On origin B, "Add 3 to my trip" is present (`N` = the
  number of starred items).
- **Stage strings:** every §9.1 string is found; `data/` is hashed before and after the build and recorded in the
  render manifest (`.cache/promo/manifest.json`) with the plan letter.

### 16.3 Risks and mitigations

| Risk | Mitigation or check |
|---|---|
| The data or markup changes while page lanes work | All reads and assertions above; all scroll targets come from rects; a missing selector fails with its name. Plan B is one flag away |
| An edition flip lands a frame late | Devices are iframes in one page (verified to flip within `emulateMedia`); a per-frame edition assertion |
| A tick misses its minute | Slots load at W0 on a whole minute (ticks land on :00); asserted at the anchor frames; `runFor` is inclusive (verified) |
| 3D text is soft | Devices are parallel to the screen when read, so Chromium rasters them at scale (the spike's 1.6× text was crisp). The sharpness audit catches misses. Fallback: `--dpr 1.5` with a lanczos downscale for push frames |
| The CSS-3D texture is slow | Rejected by measurement; WebGL2 table (§4.7) |
| Clipboard blocked | Origin A is the stage's origin with permissions granted; the fallback compares to `tripHash` and logs it |
| Implying cross-device sync | Separate origins; storage asserted; the laptop sees the stars only through the link |
| Implying the site times the edition to the sun | The on-screen footnote (§9.3 #2) and the README |
| An endorsement read | No commercial operator in any hero beat: a county park, an NPS-sourced district, a public parade. Operator and venue names appear only inside listings |
| Team names legible | Name guard; resting scrolls chosen so the neighbors are off screen |
| Ornament overuse | One frame, one ribbon, gold as rules and stars only; a reviewer checks DESIGN §13 |
| Cover flash | Night cover and Night frame 1 (§14) |
| Performance on 4 shared CPUs | Measured budget; JPEG q92 piped to ffmpeg; no motion blur; textures cached |

---

## 17. Render architecture and deliverables

**Files** (all under `collateral/`):

- `build-promo.mjs`, with subcommands:
  - `all` (both cuts);
  - `reel`;
  - `wide`;
  - `check` (reads and assertions for Plans A and B, no frames);
  - `textures`;
  - `stills <reel|wide> <t1,t2,…>`;
  - `audio [reel|wide]`;
  - `sheet <reel|wide>` (a contact sheet at 1 fps plus stills at every scene boundary).
  - Flags: `--day A|B`, `--no-bake-cover`, `--dpr 1|1.5`, `--blur N`, `--port N`, `--keep-frames`.
- `lib/promo-cues.mjs`: the single source of timing. One cue list per cut per plan: scenes, W anchors, camera poses
  and flights, device poses, slot visibility, scroll targets, taps, text states, score cues.
- `lib/promo-world.mjs`: projection (imports `site/js/lib/geo.js`), texture pages and cache, the WebGL2 table
  (shader, LOD, terminator, grade, DoF), overlay geometry, camera matrices and point projection.
- `lib/promo-stage.mjs`: the stage HTML, CSS and JS (the label frame, ribbon, chronometer, log line, mirror, footnote,
  plate, devices, cursor, ripple, rose) and `render(t)`.
- `lib/promo-capture.mjs`: the two-origin server, the context, the clock, slot loading and warm-up, `emulateMedia`,
  taps, scrolls, inline motion for toasts, clipboard reads, the laptop slot navigation.
- `lib/promo-audit.mjs`: §16.1.
- `lib/sun.mjs`: NOAA and the cross-check.
- `lib/synth.mjs` and `lib/promo-score.mjs`: §12.
- `lib/review-tools.mjs`: Cincy's contact sheet and audio report.

**Pipeline:**

1. `TBC_OUT=.cache/promo/site node build.mjs`. The render fails if the build fails, and it never touches `docs/`.
2. `check`.
3. `textures`.
4. Per cut: a fresh context, slots loaded at W0 and warmed, then the frame loop: `runFor`, `render(t)`, the audit,
   then the JPEG q92 frame piped to ffmpeg's stdin (libx264, High, yuv420p, crf 18, 30 fps, `+faststart`).
5. The audit report.
6. The score WAV (48 kHz, 32-bit float), loudness pass 1, mux (AAC 256k, `-shortest`), then decode-and-verify
   pass 2.
7. Bake the cover frame; export the cover, poster and thumb.
8. Contact sheets and stills; the SRTs; `share-copy.txt`; `README.md`.

**Deliverables in `collateral/promo-2026-09/`:**

- `tampa-bay-chartbook-promo-9x16.mp4` (1080×1920, 30.5 s) and `tampa-bay-chartbook-promo-16x9.mp4` (1920×1080,
  41.5 s);
- `cover-9x16.jpg`, `poster-16x9.jpg`, `thumb-1280x720.jpg`;
- `promo-9x16.srt`, `promo-16x9.srt`;
- `share-copy.txt` (Instagram, LinkedIn, YouTube variants);
- `README.md`: the idea; both scene tables; where every word comes from (§9) and the hand-written list; the clock and
  the plan used; sound and loudness numbers; posting notes (the cover, the safe zones, the link in the bio, the
  original soundtrack); the automatic-appearance note; image and map credits; the data fingerprint; rebuild commands.

**Rebuild:**

```
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs all            # ≈ 10–15 min
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs check          # plans A and B
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs stills reel 1.233,6.5,12.8,22.0,30.4
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs all --day B    # the scripted fallback day
```

---

## 18. Share copy (draft; the renderer fills the numbers)

> One Saturday on Tampa Bay, run through a guide that shows its sources: sunrise at Fort De Soto, Ybor City, and the
> Riverwalk's holiday lighted boat parade at 6:15 PM on Dec 19. Tampa Bay Chartbook lists {641} places, {414} places
> to stay and {589} events on six sheets, each linked to the page that states it. Star what you want; share the day as
> one link. fritzhand.github.io/visit-tampa-bay · Independent guide. Not affiliated with any tourism office, venue or
> operator.

Variants:

- **Instagram:** put the link in the bio. Use neutral place tags only (#TampaBay #StPete #YborCity); never
  #VisitTampaBay or team tags.
- **LinkedIn:** add one line on how it is made (data files, a build that fails on unsourced facts).
- **YouTube:** add chapters at the scene boundaries.

All variants say the video's device was set to automatic dark mode.

---

## 19. Facts as of writing (Sep 28, 2026; all recomputed at render)

- **Build:** 1,123 pages. 641 places, 414 stays, 176 experiences, 590 events (589 live; 1 cancelled), 106 series and
  135 timeline entries. The map shows "1,407 on the chart".
  - `.mast-dek`: "641 places, 414 places to stay, 176 tours and trips and 589 events on six sheets of Tampa Bay, each
    linked to the page that states it."
- **The clock line** at W0: "Saturday, December 19 · 7:14 AM"; `[data-mast-date]` "Saturday, December 19, 2026".
- **Fort De Soto:**
  - kicker "Sheet 3 · Gulf Beaches · Park"; the star's page y 757 (css);
  - the toast "Added to My Trip View" at 14 css, box 195 × 63 at css (98, 571);
  - dock badge 1;
  - the last source line "Source: pinellas.gov · Checked Sep 27, 2026". Its "Also read" row lists
    visitstpeteclearwater.com and is never framed (name guard).
- **Ybor:**
  - the page is 12,064 css tall; 11 timeline entries (Oct 5, 1885 … Oct 19, 2002);
  - the last `.source-line` "Source: nps.gov · Checked Sep 27, 2026" at page y ≈ 10,735;
  - the Sources block: FACTS nps.gov/places/…; ALSO READ npgallery.nps.gov, tampa.gov, npgallery.nps.gov,
    ybor.org, en.wikipedia.org.
- **What's On at 5:52 PM** (`when=today`):
  - the sticky header "Saturday, December 19 · 5 events · Today"; the parade card at page y 1,834 (height 294);
  - "6:15 PM end time not listed IN 23 MIN"; "Parade · Downtown Tampa"; Signature; "Tampa Riverwalk"; "Price not
    listed"; "Source: thetampariverwalk.com";
  - above it: "USF Bulls men's basketball vs. Kennesaw State"; below it: "The Florida Orchestra: Classical Christmas";
  - "Started" at 18:15:00.000.
- **My Trip** (three stars): "1 event · 2 places. Saved in this browser, on this device." → "Link copied" → the
  clipboard `…/trip.html#e=uawd2;p=bsnor,do9nm`. On origin B: "A shared trip", "1 event · 2 places.", "Add 3 to my
  trip", then "Added 3 items to My Trip" and "3 in My Trip".
- **Map at 1440 × 900:**
  - "Plan · 1,407 on the chart"; "Everything in this guide that has coordinates, on one chart. …";
  - `svg.map-base` viewBox 50.47 241.27 644.60 622.18 at css (320, 383), 688 × 666;
  - downtown events clustered ("5 here: 5 places with events. Zoom in to see them"); chips "What's on 115" and others.
- **About:** "“end time not listed”; “Started”, never “Now”" (the row "Events whose end time is not listed", 281); "It
  is printed like the region's own graphic art, the Ybor City cigar-box label."
- **Sun:** §3.3.
- **Performance:** §4.7.

---

## 20. Grafts taken

| From | Graft | Where |
|---|---|---|
| Concept 1 | The coastline engraving and the compass rose landing on north, as the night pickup | S1, 0.03–1.25 s |
| Concept 1 | The six sheet badges dropping like stamps on 8ths, each a note | S1 in both cuts |
| Concept 1 | The dock match: the camera lands on the page's own chart crop and the device irises open around it | 16:9 laptop at sunset (§8.2) |
| Concept 1 | The low flight across the bay | T1 (FDS → Ybor), pitch 62° at the apex |
| Concept 1 | The push into the page's own "Source: … · Checked …" line | Ybor, nps.gov (both cuts) |
| Concept 1 | Counts checked against the loader, `.mast-dek` and the meta description; two origins; per-frame scans | §16 |
| Concept 1 | Hook discipline: the name and the tagline by 1.0 s | S1 |
| Concept 2 | The clave as sonic logo (the 3-side rises, the 2-side closes) | the pull-back and the end card |
| Concept 2 | The 3D-aware reading audit; the name guard; one origin per device with storage assertions | §16.1, §5.4 |
| Concept 2 | One clean count block in Bodoni numerals | the end masthead |
| Concept 2 | The About sentence that explains the label ornament | the 16:9 end |
| Concept 2 | Captions from each page's own kicker | the ribbon is always the page's kicker |
| Concept 3 (its own, kept) | The installed clock; "IN 23 MIN" → "STARTED", never "Now"; `emulateMedia` flips with a terminator sweep; the toast rule; the share link on a second origin; "One day, one link."; the night bay with the day's course; NOAA sun; the phone as a game piece; claves strike the hours; the celesta countdown; timeline years rung on the tres (16:9) | throughout |

---

## Defects fixed (judge → fix)

**Judge 1 (social-video editor) on Concept 3:**

- **The 9:16 title block (an opaque panel y 0–700, 36% of the frame) with up to nine changing items.** It is now the
  site's page-head label frame, y 250–644. It holds three things: the ribbon (the page's own kicker), the chronometer
  (with a small static date) and one log line. The live mirror appears only at the parade, the footnote only at sunset
  and the parade. The time-of-day word, the record-name row, the separate badge row and the day rule are gone from the
  Reel.
- **The log lines were data fragments; "Day chart → Night chart" was jargon.** The log lines are now plain claims and
  payoffs in the site's own words:
  - "Every entry links to its source." (the claim before its proof);
  - the event's title;
  - "“Started”, never “Now”" (the About page's own rule);
  - "One day, one link.";
  - in 16:9, "Founded in 1886 as a planned cigar-making town." and "Everything in this guide that has coordinates, on
    one chart."
  - "Daily, 7 a.m. to sunset…", "In the timeline", the water-taxi summary and "Day chart → Night chart" are cut. The
    flip is explained in plain words.
- **34.5 s was too long, with a sag at 13–18 s.** The Reel is 30.5 s: the water-taxi stop is cut, the sunset is merged
  into the parade scene, and the timeline roll moves to 16:9. The 16:9 is 41.5 s (from 43).
- **The first toast was about 32 px.** The push is now 2.8 px/css, so the toast is 39 px. Every in-device must-read is
  ≥ 36 px (9:16) or ≥ 30 px (16:9), and audited.
- **The crossings were very fast (T1 about 1 s, T2 0.5 s) next to long holds.**
  - T1 is a 1.75 s low flight (2.0 s in 16:9); the golden hour is 2.0 s (3.5 s in 16:9); both use one explicit smooth
    path.
  - Speed caps are audited, and clock rates are continuous at every join (the time-lapse splines start and end at real
    speed).
- **The whole video depended on one future day and one record, with no scripted fallback.** Plan B (Sat, Dec 12, the
  Clearwater Holiday Lighted Boat Parade at 6:00 PM, end not listed) is scripted in the same cue module. `check`
  validates both plans; `--day B` switches. It is never automatic, and stale copy is never kept.
- **The six sheets barely appeared in the Reel, and the label ornament was thin.**
  - The six badges now stamp onto the chart in the Reel (2.0–3.25 s), each with its own note.
  - The label frame with its ribbon and corner stars carries the whole film: the hook card, the running head and the
    end masthead, one frame at a time. The cartouche plate carries the address.
- **Years shown in the clock's slot.** Removed. The chronometer only ever shows the clock. The years roll inside the
  phone (16:9), rung on the tres.
- **The Pirate Water Taxi, a commercial operator, starred in a hero beat.** Cut. The stops are a county park, an
  NPS-sourced National Historic Landmark district and a public parade. Its dialog's "Sources" line would also have
  carried a tourism-office host.
- **The sunset flip read as "the site turns to Night at sunset".** An on-screen footnote now says the device's auto
  dark mode does it and the guide follows ("AUTO DARK MODE AT SUNSET · THE GUIDE FOLLOWS THE DEVICE"). The README and
  share copy repeat it, and the render asserts that nothing was stored.
- **No team-name guard, with the USF Bulls card directly above the parade.** A name guard (tourism offices, every
  team in the events data and their hosts) runs on every frame. The What's On resting scroll puts the parade card just
  under the sticky day header, so the neighbor above is never on screen. Plan B's Lightning card is handled the same
  way.
- **No measured ms/frame; 6 textures and 7 iframes; the 18:15:00.000 tick risk.**
  - Measured (§4.7): the CSS-3D texture is rejected, and the WebGL2 table runs at 159–195 ms/frame with a live phone.
  - The Reel runs 4 live iframes and the 16:9 runs 6; the hidden home slot is replaced by the site's own formatter,
    cross-checked once.
  - The inclusive `runFor` tick at 18:15:00.000 is verified by probe and asserted per frame.

**Judge 2 (brand and product lead) on Concept 3:**

- **The hook showed place and time but not the product; "Sunrise to lighted boats." was cryptic; the logo was 44 px;
  the tagline and "independent guide" were absent until the end.** The hook card shows the stacked wordmark about
  560 px wide from frame 1, and the tagline by 0.9 s. "Sunrise to lighted boats." is dropped. The story's frame
  ("One Saturday on the bay.") arrives with the first stop.
- **The Reel never explained the chartbook's scale or structure; counts were secondary.** The six sheets drop in the
  Reel under "SHEETS 1–6 · TAMPA BAY". The end count block is a must-read in Bodoni numerals.
- **The title block took 36% of the frame.** See judge 1's first item.
- **"SATURDAY, DECEMBER 19, 2026" might read as "an event on Dec 19".**
  - The date is now the site's own clock line in small caps, and a watch-style "SAT, DEC 19" beside the chronometer.
  - It is followed immediately by "One Saturday on the bay."
  - The site's own What's On header ("Saturday, December 19 · 5 events · Today") frames it as a day in the listings,
    and the share copy says it is one example Saturday.
- **Fragment log lines; "Day chart → Night chart" at the edge of "read from the site".** See judge 1's second item.
  The arrow and the aria-label assembly are gone.
- **It was fragile by design (four records, above all the parade).** Three records now. All are asserted, and Plan B
  is scripted.
- **It had the most runtime moving parts; the 5–7 min render budget was optimistic.**
  - Fewer iframes; the clipboard has a fallback; the sun math is cross-checked.
  - The budget is measured (about 3.5 min of Reel frames and about 5 min of 16:9 frames), and the renderer logs
    ms/frame per scene.
- **The longest cuts of the three; one commercial operator starred.** 30.5 s and 41.5 s now, and no operator is
  featured.

**Defects of the grafted pieces (from Concepts 1 and 2), fixed where they touch this plan:**

- **Concept 1's cover (a full chart) jumped to a blank sheet at frame 1.** The cover and frame 1 are both Night, and
  the loop never flashes Day.
- **Concept 1's phones read 9:41 at night.** The status bar shows the installed clock.
- **Concept 1's unreadable laptop stops in 9:16.** There is no laptop in the Reel. In 16:9 its text is must-read only
  when pushed to ≥ 30 px or mirrored in the column.
- **Concept 1's engineering risk** (van Wijk paths, a dock solver, a component server, a box finale). Here there is one
  explicit flight formula and one dock match solved from the page's own `getScreenCTM`, with no box finale and no
  component server.
- **Concept 1's "each sheet is a note" could not be heard.** It is kept as texture and never claimed on screen.
- **Concept 2's whip scroll** (about 129,000 css in 0.6 s, breaking its own cap). The Ybor whip is about 10,300 css in
  0.8 s, capped at 700 css/frame and audited.
- **Concept 2's floating-device tableau.** One phone in the Reel. In 16:9, one phone and one laptop, on screen
  together only for the share arc.
- **Concept 2's cigar-box hero object** (tobacco and award connotations). The label is ornament on the site's own
  frame. No box, cigars or medals.
