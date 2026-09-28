# Concept 1: The Chart Flight

**Logline.** A blank cream sheet engraves the real Tampa Bay coastline and a compass rose swings to north. A 3D camera then flies
low over that one chart from Tampa to St. Petersburg, into the sunset over the Gulf beaches and north to Clearwater. At each
stop it lands exactly on the sheet's own chart and dives into a phone or a laptop running that sheet page of the real site.
It ends by pulling back to all six sheets, stacking them into the chartbook and closing it like a cigar box, with the site's
masthead as the label on the lid.

Two cuts only: a **9:16 Reel, 1080×1920, 32.53 s** and a **16:9 video, 1920×1080, 41.07 s**. There is no 4:5 cut.

---

## 0. Why this beats the Cincy Week reel

The Cincy Week reel is flat 2D scenes joined by hard cuts, with one phone and one real tap. This concept improves on it in six ways:

1. **One continuous world, no scene cuts.** The whole video is a single chart (the site's own Census TIGER basemap) and one
   camera. Every transition is a camera move. The dive into a device is a **match**, not a cut: the camera lands on the exact
   crop the site draws for that sheet (the `viewBox` of the page's own `.sc-map svg`). The site's buoys then appear on top, and
   the device's UI unfolds around the chart.
2. **Real depth.** The chart lies on a tilted 3D plane with perspective. Sheet badges drop onto it like labels. Devices rise
   off it, and the laptop is revealed with a 3D orbit. The cigar box closes in 3D.
3. **Both editions, for a reason.** Night falls from the east as the camera heads out over the Gulf beaches (sunset is west),
   and dawn returns for the finale. The Day chart and the Night chart are the site's two editions, not a filter.
4. **Two device classes and the real product.** The Reel has two phone stops, each ending in a real star tap, and two laptop
   stops. The 16:9 cut has four laptop taps, the event dialog's own **"Source: … · Checked …"** line, and My Trip listing
   what was starred.
5. **More honest than Cincy's.** Cincy's reel had two hand-written lines; this has **no hand-written words on screen**. Every
   count comes from the engine's own loader and is checked against the page that prints it. The renderer also scans every
   device frame for relative-time words, "Test clock", tourism-bureau names and missing photo credits.
6. **An original score with a local accent.** It is a son montuno in the Ybor City tradition: a Karplus-Strong tres, a
   tumbao bass, clave, bongó and a güiro that scrapes when a page scrolls. Each sheet is a note (C D E G A C), so the lid's
   closing chord is all six sheets at once.

---

## 1. What a stranger learns, in order

| By | They know | From |
|---|---|---|
| 1.0 s | It is called Tampa Bay Chartbook, and it is about Tampa Bay (the coastline is drawing itself) | the wordmark and the chart |
| 1.6 s | It is an independent guide, and every entry is linked to its source | the site's tagline |
| 4.1 s | The region is cut into six numbered sheets | the six sheet badges drop onto their places on the chart |
| 6–10 s | Each sheet has a chart with numbered places; a place has its own page, and you can star it | the Tampa phone stop |
| 11–24 s | It works on a laptop and a phone, at night too, with real counts per sheet | the St. Pete, Gulf Beaches and Clearwater stops |
| 25–28 s | 641 places, 414 places to stay, 589 events in all (recounted at render time) | the tally |
| 28–32 s | Where to find it, and that it is not official | the lid: URL and independence line |

---

## 2. The world, the camera and the rendering model

### 2.1 One world

- **World units = `site/map/region.svg` units** (viewBox 1000 × 1486). This is the whole region, 26.9–29.0° N and
  83.0–81.4° W, projected by `data/map.json` `.region.projection`.
- **The detailed basemap** (`site/map/basemap.svg`, 1000 × 1118, `.projection`) is placed inside the world by an exact affine
  map, because both are equirectangular with a `cos(lat0)` factor:
  - `xr = (k_r·sx_r)/(k_b·sx_b) · xb + (w_b − w_r)·k_r·sx_r`
  - `yr = (sx_r/sx_b) · yb + (n_r − n_b)·sx_r`
  - Today these evaluate to `xr = 0.543750·xb + 31.250` and `yr = 0.544353·yb + 523.571`.
  - Compute them from `data/map.json` at render time, and never hard-code them.
- **The sheets** in world units come from each sheet page's own chart: `section#chart .sc-map svg` `viewBox`, together with
  `use href` (`basemap.svg#bm` or `region.svg#bm`). A basemap crop goes through the affine; a region crop is used as is. At
  the Sep 27 private build:

| Sheet | Page | Crop (page viewBox) | World box (x y w h) | Printed limits (asserted) |
|---|---|---|---|---|
| 1 TP Tampa | tampa.html | basemap 460.4 236.9 232.0 232.0 | 281.6 652.5 126.2 126.3 | 27.90°–28.08° N, 82.35°–82.55° W |
| 2 SP St. Petersburg | st-petersburg.html | basemap 184.5 507.1 261.3 348.4 | 131.6 799.6 142.1 189.7 | 27.60°–27.87° N, 82.56°–82.79° W |
| 3 GB Gulf Beaches | gulf-beaches.html | basemap 0.0 289.4 420.4 560.6 | 31.2 681.1 228.6 305.2 | 27.61°–28.04° N, 82.58°–82.95° W |
| 4 CW Clearwater & North Pinellas | clearwater.html | basemap 75.6 77.4 299.3 399.1 | 72.4 565.7 162.7 217.3 | 27.89°–28.20° N, 82.62°–82.88° W |
| 5 AB Around the Bay | around-the-bay.html | region 110.1 382.5 502.8 502.8 | same | 27.75°–28.46° N, 82.02°–82.82° W |
| 6 DT Day Trips | day-trips.html | region 158.8 247.4 765.6 1020.9 | same | 27.21°–28.65° N, 81.52°–82.75° W |

  The renderer parses the page's "Chart limits …" caption. It unprojects the viewBox corners with `site/js/lib/geo.js`
  `unproject` and fails if the two disagree by more than 0.01°. So the camera's framing is provably the page's own chart.
- **The index view** is the home page's chart index: `index.html .ix-map svg` viewBox (40.3 306.3 672.5 896.6 today). The
  badge positions come from `.ix-badge[data-sheet]` `left/top %` inside it. There are eight badges today (Day Trips has three:
  its middle and two outlying areas), and the renderer drops every one of them.

### 2.2 Layers on the chart plane (drawn back to front)

1. **Underlay.** `--map-water` west of world x 0 (the open Gulf), `--map-bg` everywhere else, so a tilted camera never sees
   the page ground.
2. **Region raster**, one per edition: `region.svg` rendered once at 3 px per unit (3000 × 4458) with the site's tokens.
3. **Basemap raster**, one per edition: `basemap.svg` rendered once at 8 px per basemap unit, as 2 × 2 tiles of about
   4000 × 4472. Its opacity is `smoothstep(z, 1.8, 2.6)`, where `z` is screen px per world unit. It sits on top of the
   region raster, and the region raster never fades out, so there is no washed-out crossfade.
4. **Vector overlays on the plane.** Water names in Bodoni Moda italic (`--map-label-water`); towns and beaches in Archivo
   caps (`--map-label`), taken from `data/map.json` `.labels` and `.region.labels` in two level-of-detail sets:
   - Set A (region scale, `z < 2.6`): water names 22 units tall.
   - Set B (`z ≥ 2.6`): kinds `city`, `town`, `beach`, `hood` and `island`, 4.5 units tall.
   - The two sets crossfade over 0.2 in `z`.
   - The same layer holds the **sheet boxes** (the site's graticule neatline, drawn in §2.5) and the **compass rose**
     (`brand.svg#compass` with `class="rose"`, which supplies `--compass-*`).
5. **Billboards** (screen space, projected through zero-size marker elements on the plane and read with
   `getBoundingClientRect` each frame): the **sheet badges** (`brand.svg#sheet-<id>`). They are always at least 34 px tall
   in 9:16 and 30 px in 16:9 (DESIGN §3 floor: 24 px), sized `clamp(34, 34·(z/z_index)^0.35, 64)` px.

**Night edition on the plane.** The renderer derives a `.ed-night` scope at render time by copying the declarations of
`:root[data-theme="dark"] { … }` from `site/css/tokens.css`. It fails if that block is missing. Night rasters are rendered
with `data-theme="dark"`. The Night group (its rasters and overlays) sits above the Day group and is clipped by the
**terminator** (§2.6).

### 2.3 The camera

The camera state is `C = { cx, cy, z, tilt, bearing }`, with the focal point `(fx, fy)` fixed per cut: (540, 1150) in 9:16
and (1100, 560) in 16:9. The plane is transformed exactly as in the feasibility spike:

```
#scene { perspective: P; perspective-origin: fx fy }          /* P = 1500px (9:16), 1700px (16:9) */
#plane { transform-origin: 0 0;
  transform: translate(fx, fy) rotateX(tilt) rotateZ(bearing) scale(z / S) translate(−cx·S, −cy·S) }  /* S = plane px per world unit */
```

- **Flights between two states A and B** use the van Wijk–Nuij smooth zoom-and-pan path (d3's `interpolateZoom`, ρ = 1.3)
  for `(cx, cy, z)`. Progress along the path follows `easeInOutCubic` over the flight's beats.
  - `tilt(u) = tiltMax · sin(π·u)^1.3`, where `u` is the eased progress.
  - `bearing(u) = h · sin(π·u)`, where `h` is the heading from A to B measured from north and wrapped to ±40°. Mid-flight
    the direction of travel therefore points up the screen, and every dock is north-up.
  - `tiltMax` is 38° for ordinary hops and 56° for the low flights (§3.5, §4.3).
- **Docks** (arriving at a sheet) end with `tilt 0` and `bearing 0`. The camera `(cx, cy, z)` is **solved**, not animated to
  a guess:
  - `R` is the device's chart rectangle in stage px, measured live (the iframe's `.sc-map .mini-map svg` rect mapped through
    the device's dock transform).
  - Then `z = R.w / crop.w`, `(cx, cy)` is the crop's center and `(fx, fy)` is `R`'s center for the last 12 frames.
  - The renderer asserts `|R.h / crop.h − z| / z < 0.5 %`.
- **The low-flight rule.** Whenever `tilt > 0`, the renderer projects 16 points along the frame's top edge. Each must hit
  the plane inside the world extent or fall under the paper mist band (§5.3); otherwise the render fails. This is the
  "no horizon hole" check.
- **Vector at the dock.** For the 8 frames before and the 8 frames after each dock, the Day or Night raster group is replaced
  by the vector `basemap.svg#bm` (or `region.svg#bm`) at tilt 0. The stage chart is then the same drawing the site shows,
  in the same tokens, at the same crop. This is what makes the match invisible.

### 2.4 The dock and undock grammar (every stop)

| Frames (relative to the dock frame D) | What happens |
|---|---|
| D−16 … D−8 | The camera descends, and tilt and bearing ease to 0. The sheet box's neatline grows toward `R`. The sheet's badge billboard slides from its index position to the box's top-left corner. |
| D−8 … D | Vector chart on. The device's iframe fades in (opacity 0 → 1 over D−4 … D) while clipped to exactly `R` with `clip-path: inset()`. The site's buoys and area labels appear over an identical chart. |
| **D** (on the beat) | The dock hit. |
| D … D+8 | **Iris:** the iframe clip opens from `R` to the full viewport (ease-out), so the site's own UI unfolds around its chart. The device body (bezel, status bar, address bar) fades in and scales 1.04 → 1.00 about `R`'s center. The stage chart fades out. |
| D+8 … | The device segment: real scrolls, real taps, pushes. |
| undock (16 frames) | The device eases back to the projected quad of its sheet box on the re-tilting plane (a 2D scale and translate to the box's projected bounding rect), and its screen crossfades to the stage chart over the last 8 frames. The camera lifts into the next flight. |

**Laptop docks** land close, at **1.2 css px → stage px** (the chart then fills most of the frame). After the iris, the camera
pulls back to show the whole laptop (0.62 in 9:16, 0.76 in 16:9) with a 3D orbit (`rotateY 0 → −14°`, `rotateX 0 → 7°` on the
device group, ease-in-out over 0.8 s). **Phone docks** land at the phone's final scale (1.62 in 9:16), so no pull-back is
needed.

### 2.5 Sheet boxes (the chart index made physical)

Each sheet box is the site's graticule neatline (`.grat`: outer rule, a band of alternating ink and paper ticks, inner rule)
drawn on the plane around the sheet's world box.

- **Band thickness in world units** = `5 css px × device scale at dock ÷ z_dock`. At the dock, the stage band therefore
  coincides with the site's own `.sc-map.grat` band and crossfades into it.
- **When boxes draw:**
  - TP, SP, GB and CW draw during their own flights: the band grows around the perimeter clockwise from the top-left over
    0.4 s, with a quiet tick-roll.
  - AB and DT draw in the finale.
- **After drawing,** the boxes stay on the chart, so the finale shows all six: the site's chart index, made physical.

### 2.6 The terminator (sunset and sunrise)

The terminator is a vertical line in world space at `X(t)`:

- **Sunset:** the Night group is clipped to `x ≥ X(t)` (east of the line is night), and `X` moves west.
- **Sunrise:** the Day group is clipped to `x ≥ X′(t)` over the Night group, and `X′` also moves west. Day comes from the
  east.
- **The band:** a 90-unit-wide band of engraved hatching (hairlines at 45°, `--map-water-line`, 40 % opacity) rides the line
  on its night side, as shading on an old chart.
- **Screen space:** the running-head band, device frames and badges flip edition by setting `html[data-theme]` on the stage
  in the single frame where `X(t)` crosses the focal point. That frame is always on a beat.

### 2.7 Measured feasibility (spike on this box, Sep 27, private build `.cache/out-promo-c1`)

| Test (1080×1920 stage) | DPR 1 | DPR 1.5 |
|---|---|---|
| Vector `region.svg`, flat | 118 ms/frame | 312 ms/frame |
| Vector `region.svg`, tilted 42° | 160 | 261 |
| Vector `basemap.svg`, tilted 45° | **795** | **922** (too slow: this is why the flights use rasters) |
| 5000 px basemap raster, tilted 44°, per-frame camera | 170 | 239 |
| Rasterizing `basemap.svg` to 5000 × 5590 PNG | 5.8 s once, 3.9 MB | |

- **Dash behavior (verified).** Chromium restarts `stroke-dasharray` at every subpath, so a dash reveal on `.m-coast`
  engraves every island at once while the mainland coast traces north from the south into Tampa Bay. Region `.m-coast` has
  64 subpaths; the longest is 9,642 units of 12,779.
- **Budget.** At DPR 1.5, both cuts render in about 12 minutes of frames: 2,208 frames at about 0.3 s. Frames are JPEG q92
  piped to ffmpeg and downscaled with lanczos, so there are no PNG files on disk.

---

## 3. The 9:16 Reel: 32.533 s, 976 frames, 30 fps

### 3.1 The grid

The tempo is **112.5 BPM**, chosen so that **one beat = 16 frames exactly** (0.5333 s). An eighth note is 8 frames and a
sixteenth is 4, so every hit lands on a frame. There is a one-beat pickup, so beat `b` starts at `t = b × 0.53333 s` = frame
`16b`, and bar `n`'s downbeat is beat `4n − 3`.

| Bar | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Downbeat (s) | 0.533 | 2.667 | 4.800 | 6.933 | 9.067 | 11.200 | 13.333 | 15.467 | 17.600 | 19.733 | 21.867 | 24.000 | 26.133 | 28.267 | 30.400 |
| Frame | 16 | 80 | 144 | 208 | 272 | 336 | 400 | 464 | 528 | 592 | 656 | 720 | 784 | 848 | 912 |
| Chord | C | C | C | F | C | G | F | Am | F | Em | G | C | F | C6/9 | C6/9 |

The Reel ends at frame 976 (beat 61), after half of bar 15 held as a fermata.

### 3.2 The hook: the first 1.5 seconds, frame by frame

| Frames | Time | Picture | Sound |
|---|---|---|---|
| 0 | 0.000 | the cover (the 4.40 s frame, baked in; §8) | — |
| 1–8 | 0.033–0.267 | **A blank cream sheet** (`--bg` #f6ecd5). The chart index's neatline draws from its four corners (screen x 112–967, y 700–1840). The title band's double rule (2 px ink, 3 px gap, 1 px ink) draws left to right at y 326–331. The rose fades in at 90 % scale, turned −300°. | ocean wash swells in; a soft tick-roll with the neatline |
| 3–34 | 0.10–1.15 | **Pass 1, engraving.** `region.svg` `.m-coast`, `.m-coast-minor` and `.m-lake-shore` are revealed by `stroke-dashoffset` (dash length = the longest subpath), linear for 70 % and then ease-out, at `--mw: 1.8` (bolder than on the site). Islands pop in; the mainland coast races north from the south into the bay. | burin scratch: band-passed noise at 2–4 kHz with 30–60 Hz chatter, amplitude ∝ draw speed, panned with the leading point |
| 7–38 | 0.22–1.27 | Water-lining echoes `.m-wl1` and `.m-wl2` follow, delayed 0.12 s and 0.24 s: ripples leaving the coast | wash |
| **16** | **0.533** | **The wordmark slams** (`brand.svg#wm`: TAMPA BAY over Chartbook, 800 px wide, x 140–940, y 356–550; scale 1.06 → 1, opacity 0 → 1, 0.15 s ease-out). | **ACCENT 1:** low C, a rolled tres C chord, a short brass C6/9 stab |
| 24–30 | 0.80–1.00 | The tagline wipes in left to right, one line after the other: *An independent guide to Tampa Bay,* / *every entry linked to its source* | — |
| 24–33 | 0.80–1.10 | **Pass 2:** the water fill (`.m-water`, and the Gulf underlay) goes from 0 to 1 | wash |
| 28–37 | 0.95–1.25 | **Pass 3:** the land tint (`.m-land`) | — |
| 33–45 | 1.10–1.50 | **Pass 4, gold:** `.m-road-major` and `.m-bridge-major` dash-reveal fast; the casings fade in | a quiet shimmer |
| 4–48 | 0.13–1.60 | **The compass rose turns** from −300° to 0° with an ease-out-back overshoot (+6° at 1.45 s) and **lands on north at 1.600 (frame 48, beat 3)**. North is the magenta point. | a ratchet tick at every 11.25° crossing, computed from the same easing, slowing down; a **bell G5 on the landing** |

The name is on screen at 0.53 s and the whole promise by 1.0 s. The motion of the hook (a coastline drawing itself, the rose
spinning) is the scroll-stopper, and the shape of Tampa Bay is recognizable to anyone who knows it.

### 3.3 Second by second

Positions are in output px, and every word's source is in §6. "Settled" means fully opaque and not moving.

| Time (s) | Frame | Beat | Picture and camera | On screen (must-read in bold) | Sound |
|---|---|---|---|---|---|
| 0.00–1.60 | 0–48 | 0–3 | The hook (§3.2) | **wordmark**, **tagline** | the hook cues |
| 1.60–2.00 | 48–60 | 3–3.75 | Water names set (fade, 0.2 s). Margin notes fade in. | *Gulf of Mexico*, *Tampa Bay*; SHEETS 1–6 · TAMPA BAY (left, x 64) / NOT FOR NAVIGATION (right-aligned to x 940), y 284–312 | the wash settles |
| 2.667–4.00 | 80–120 | 5–7.5 | **The six sheets drop like labels** on eighth notes: TP (f80), SP (f88), GB (f96), CW (f104), AB (f112), DT with all three of its badges (f120). Each falls from 2.4× scale and −8° to 1× in 5 frames (ease-in, "gravity"), squashes (scaleY 0.92, scaleX 1.05) for 2 frames and settles, while two engraved rings (`--map-water-line`, radius 18 → 60 px) spread and fade over 0.4 s. | badges TP SP GB CW AB DT (texture: they are the brand's identity marks) | **clave enters**; a stamp per badge pitched to its sheet (C4 D4 E4 G4 A4 C5), each doubled by a tres pluck |
| 4.00–4.80 | 120–144 | 7.5–9 | Hold. **Cover frame at 4.40 (f132).** | | a riser from 4.267 (0.53 s) |
| **4.80** | **144** | **9** | **Flight 1 → Tampa.** van Wijk path from the index view to the TP dock state, tiltMax 38°, `h` = heading to Tampa (NE), about +40°. The TP box draws (4.9–5.3), and its badge slides to the box corner. | | **GROOVE DROP:** tumbao, bongó martillo, güiro, tres guajeo; a pitched whoosh |
| 4.80–5.20 | 144–156 | | The title band's words stay until 5.20 (its reading time), then lift 24 px and fade (5.20–5.33). The paper band becomes the gradient **mist band** (§5.3). | | |
| 5.333 | 160 | 10 | The **TP running head** slaps in from above (0.15 s): the site's sheet head at phone width, magnified 2.6× (§5.2) | **SHEET 1 · TP / Tampa** | a paper slap |
| 5.60–5.867 | 168–176 | | Vector chart on; the phone iframe (chart-clipped) fades in over it, and the **buoys 1 … 14–15 and area names appear** | | |
| **5.867** | **176** | **11** | **DOCK: phone** (tampa.html, Day). The iris opens (5.867–6.133). The phone body is at x 199–881, top y 660, viewport y 766–1916. | | **dock hit:** a snap, a tres high C (TP's note) and a brass stab |
| 6.133–6.40 | 184–192 | | Hold on the live sheet chart | | |
| 6.40–6.90 | 192–207 | 12–13 | A real eased scroll down to the chart's key (`.sheet-keyblock`), with the row "4 · Ybor City Museum State Park" at viewport y 380 css | the key's rows (texture) | a güiro scrape, rate ∝ scroll speed |
| **6.933** | **208** | **13** | **Tap** on that key row (ripple). The link's page (`places/ybor-city-museum-state-park.html`, **preloaded** in a second phone iframe and asserted equal to the link's `href`) slides in from the right (6.95–7.20). The running head lifts out (6.95–7.10). The phone group slides up (top 660 → 300, 6.95–7.30). | the place page's own head, in its label frame: SHEET 1 · TAMPA · MUSEUM / Ybor City Museum State Park / SIGNATURE seal / "Add to My Trip" (texture) | a glass tap, then a paper swish |
| **7.467** | **224** | **14** | **Real tap:** `button.star.pl-star[data-star="ybor-city-museum-state-park"]` is clicked, so the star fills (`aria-pressed=true`). The site's toast rises (7.50–7.67, driven by the stage because the site runs with reduced motion). | | a glass tap and an "added" motif: tres C5 → G5 (the sheet's note and its fifth) |
| 7.60–8.00 | 228–240 | | A 2D push-in of the phone group, 1.0 → 1.7, about the button and toast, so the toast text reaches about 38 px and sits at y ≤ 1420 | **Added to My Trip · View** (live) | |
| 8.00–9.60 | 240–288 | | Hold (the live state only) | | the groove (F), then C at bar 5 |
| 9.60–10.133 | 288–304 | 18 | **Undock** into the TP box; the camera lifts | | an air whoosh up |
| **10.133** | **304** | **19** | **Flight 2 → St. Pete,** southwest across Old Tampa Bay, tiltMax 38°, `h` ≈ −35° | | whoosh |
| 10.40 | 312 | 19.5 | The **SP running head** slaps in | **SHEET 2 · SP / St. Petersburg** | slap |
| **11.20** | **336** | **21** | **DOCK: laptop, close** (st-petersburg.html at 1440 × 900, Day, 1.2 px/css). The iris opens: the sidebar with all six sheets, the chart, the stat card and the TOC unfold. | | **dock hit (bar 6, G):** tres D (SP's note) and a brass stab |
| 11.467 | 344 | 21.5 | The **counts row** sets under the running head: three Bodoni numerals and labels | **105 PLACES · 48 PLACES TO STAY · 129 EVENTS** | three quick tres plucks |
| 11.467–12.267 | 344–368 | | **Pull-back reveal:** 1.2 → 0.62 px/css with the 3D orbit, showing the whole laptop (screen x ≈ 94–986, y ≈ 700–1260) | the laptop's stat card shows the same numbers (texture that visibly agrees) | a low air swell |
| 12.267–13.867 | 368–416 | | Orbit drift, rotateY −14° → −8° | | groove; bar 7 (F) |
| 13.867–14.40 | 416–432 | 26 | Undock into the SP box | | whoosh |
| **14.40** | **432** | **27** | **Flight 3 → Gulf Beaches, west. SUNSET:** the terminator sweeps from the east edge of the view westward (14.40–15.20) | | **tres descending run**; the brass pad swells with its low-pass opening; the wash rises |
| 14.667 | 440 | 27.5 | The **GB running head** slaps in (still Day) | **SHEET 3 · GB / Gulf Beaches** | slap |
| **14.933** | **448** | **28** | **Night falls on screen:** the terminator crosses the focal point, and the stage flips to `data-theme="dark"` in one frame (paper band, running head, badges). The text does not move. | | a low A pedal enters |
| **15.467** | **464** | **29** | **DOCK: phone, Night** (gulf-beaches.html?theme=dark). The iris opens (15.467–15.733). | | **bar 8, Am:** tres E (GB's note) and a bell |
| 15.90–16.53 | 477–496 | | A real whip-scroll to the Fort De Soto Park card (its star at viewport y 260 css) | the cards pass (texture) | güiro |
| **16.80** | **504** | **31.5** | **Real tap:** `button.star[data-star="fort-de-soto-park"]`, then the toast. The phone's dock badge now reads **2** (the same phone starred Ybor earlier; texture). | | tap, then tres E5 → B5 |
| 16.85–17.30 | 506–519 | | The phone slides up and pushes in to 1.7× (toast at y ≤ 1420, about 38 px) | **Added to My Trip · View** | |
| 17.30–19.20 | 519–576 | | Hold | | bolero-son groove (bar 9, F) |
| 19.20–19.733 | 576–592 | 36 | Undock into the GB box | | |
| **19.733** | **592** | **37** | **Flight 4, the low flight:** from the south end of the beaches north up the chain at night (tilt 56°, bearing 0, so north is ahead). Gold coastline, beach names passing on the plane (St. Pete Beach, Treasure Island, Madeira Beach, Indian Rocks Beach, Sand Key, Clearwater Beach). It rises into the CW box. | beach names (texture) | **bar 10, Em:** wind over water (foam noise), the brass pad, bongó open tones |
| 20.00 | 600 | 37.5 | The **CW running head** slaps in | **SHEET 4 · CW / Clearwater & North Pinellas** | slap |
| **20.80** | **624** | **39** | **DOCK: laptop, close, Night** (clearwater.html?theme=dark). The iris opens (20.80–21.067). | | tres G (CW's note) and a stab |
| 21.067 | 632 | 39.5 | The counts row sets | **82 PLACES · 38 PLACES TO STAY · 134 EVENTS** | plucks |
| 21.067–21.867 | 632–656 | | Pull-back reveal with the orbit | | |
| 21.867–23.467 | 656–704 | | Orbit drift (texture: the Night chart and the stat card) | | **bar 11, G:** the dominant builds toward dawn |
| 23.467–24.00 | 704–720 | 44 | Undock | | riser |
| **24.00** | **720** | **45** | **SUNRISE and the pull-back.** The Day group wipes in from the east (24.00–24.80). The camera rises to the index view on a van Wijk path (24.00–25.60), tilt and bearing to 0. | | **bar 12, C:** brass C–E–G, the guajeo returns bright, a bell |
| 24.533 | 736 | 46 | The screen flips to Day. The **AB and DT boxes** draw (24.30–25.00), and their badges drop (A4 at 24.533, C5 at 24.80). | | stamps |
| 24.80 | 744 | 46.5 | The **tally** sets in the top band (paper panel, y 280–450) | **641 PLACES · 414 PLACES TO STAY · 589 EVENTS** | three low tres notes |
| 25.60–26.933 | 768–808 | 48–50.5 | **The chartbook assembles.** On eighth notes (TP, SP, GB, CW, AB, DT), each sheet box lifts off the plane (+Z 300 px), turns to face the camera and becomes a uniform 3:4 page (600 × 800 px). The page is `--surface` paper, the site's `.grat` neatline, its chart crop inside and a strip with its badge and "Sheet n · CODE". Each lands on the stack at (540, 950) 0.40 s later. | the pages' names (texture) | **bar 13, F:** the six sheet notes C D E G A C, one per landing, with paper slaps; the drums drop out |
| 27.20–27.733 | 816–832 | 51–52 | The **box** rises around the stack: four walls in flat `--text` navy with a `--gold` top rule, no texture images. The camera tilts to 22° to show the walls. | | a soft riser |
| 27.733–28.267 | 832–848 | 52–53 | **The lid swings shut:** hinged at the top edge, `rotateX −112° → 0°`, ease-in (gravity). The camera eases back to 0° tilt. | | |
| **28.267** | **848** | **53** | **THE LID LANDS: the end card.** The lid face (x 64–1016, y 470–1430) is the site's own masthead (`index.html section.mast`, minus `.mast-dek`), with the URL and the independence line printed below it inside the lid's label frame (§3.4). | **fritzhand.github.io/visit-tampa-bay**; **Independent guide. Not affiliated with any tourism office, venue or operator.** | **bar 14: lid thump and a tutti C6/9 (C D E G A: all six sheets)** |
| 28.267–32.533 | 848–976 | 53–61 | Still hold. No exit, so the last frame is a clean poster. The loop cuts back to the blank sheet. | tally stays; lid | the chord rings; tres tremolo; the wash returns; **silent by 32.33** |

### 3.4 Reel layout, by region of the frame

- **Hook title band** (paper, y 0–690):
  - margin notes at y 284–312, Archivo 680, 26 px caps, `--track-label`, `--text`;
  - double rule at y 326–331;
  - wordmark at x 140–940, y 356–550;
  - tagline in Bodoni Moda italic 540, 46/56 px, centered, `--text`, at y 580–692.
- **Chart window:** the index view (z = 1.2715 px per world unit), with the index neatline at x 112–967, y 700–1840. The
  chart continues beyond it on every side.
- **Rose:** 300 px across, placed on water by a deterministic search. The renderer searches centers on a 20 px grid in
  x 60–400, y 1300–1700 for the lowest one whose disc covers at most 3 % land, using `isPointInFill` on `.m-land`. That
  region of the index view is the Gulf west of Egmont Key and Anna Maria Island (screen (150, 1600) is about 27.57° N,
  82.89° W). If no center qualifies, the render fails rather than covering land.
- **Running head** (flights and stops): the site's sheet head magnified 2.6×, spanning x 64–1016 and y 250–470. Below it,
  the **counts row** at y 490–640: three columns with Bodoni Moda 800 lining numerals at 84 px and Archivo labels at 30 px in
  the sheet's `-ink`, separated by `--border` hairlines.
- **Mist band:** `--bg`, opaque from y 0 to 660 and fading to transparent at y 900, behind the running head during flights.
  It is a flat-to-transparent paper fade, not a glow, and it hides the horizon at tilt.
- **Phone:** Cincy Week's generic phone drawing (`reel-stage.mjs` PHONE; no logos) at 1.62 px/css, x 199–881.
- **Laptop:** §5.4.
- **End card:**
  - tally in a paper panel at y 280–450;
  - lid at x 64–1016, y 470–1430, containing the masthead (`zoom` so its width is 900 px);
  - URL in Figtree 650 at 52 px, `--link`, with a 4 px `--accent` underline, at y ≈ 1230;
  - independence line in Figtree 400 at 34/42 px, `--text-muted`, two lines, at y ≈ 1296–1380;
  - map credit fine print (texture) at 22 px, `--text-faint`, at y ≈ 1394–1420.

---

## 4. The 16:9 cut: 41.067 s, 1,232 frames

### 4.1 What differs

- **Longer and lower flights.** Flights 1 and 4 get four beats each (2.13 s). Flight 4 is the set piece: a 56° low flight up
  the whole beach chain at night.
- **Laptop at every stop, with the phone as a companion.**
  - The laptop is the main device, where all four taps happen.
  - A phone rises in front of the laptop's right edge two beats after each dock, at a different depth (translateZ +160, so
    it moves with parallax when the camera orbits), and leaves one beat before each undock. At 0.84 px/css it sits at
    x 1490–1818 with its top at y 330. It covers only the laptop's TOC column (texture), never the toast, the dialog or the
    counts column (x 96–560). Its body below y 960 is texture.
  - The phone shows another section of the same sheet page with a slow real scroll: TP `#areas`, SP `#experiences`,
    GB `#stay`, CW `#history`. It is never tapped.
  - The phone runs on a **different origin** (`127.0.0.1`) from the laptop (`localhost`), so the two have separate
    localStorage. The video can never imply that stars sync across devices; the site says the list stays "in this browser,
    on this device".
- **Four real laptop taps, all in one browser:** a place (TP), an event through its dialog (SP), a place (GB) and a place
  (CW). Then a real click on the topbar's My Trip button shows **trip.html** with those four, at sunrise.
- **The proof shot (SP):** the event dialog's own source line, pushed in and read live.
- **Landscape composition:**
  - In the hook, the title block is a **cartouche on the Gulf of Mexico**, where real charts put their titles, and the index
    sits to the right.
  - The running head is a label panel at the top left, with the counts stacked under it.
  - The lid is landscape.
- **Cursor, not finger.** Laptop taps use a drawn pointer arrow (`--text` fill, `--surface` outline, 34 × 48 px). It travels
  on an eased Bézier in 0.35 s, then clicks: the pointer scales to 0.88 for 3 frames and a ring spreads.

### 4.2 16:9 grid and chords (same tempo; bar n at 0.5333 + 2.1333·(n − 1) s)

| Bar | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Downbeat (s) | 0.533 | 2.667 | 4.800 | 6.933 | 9.067 | 11.200 | 13.333 | 15.467 | 17.600 | 19.733 | 21.867 | 24.000 | 26.133 | 28.267 | 30.400 | 32.533 | 34.667 | 36.800 | 38.933 |
| Chord | C | C | C | F | C | G | G | C | F | Am | F | Em | G | G7 | C | F | G | C6/9 | C6/9 |

### 4.3 16:9 timeline

| Time (s) | Beat | Picture | Must-read (live or sourced) |
|---|---|---|---|
| 0–4.80 | 0–8 | **The hook,** with the same timings as §3.2. Layout: index neatline at x 1090–1840, y 40–1040 (z = 1.1153). Cartouche (paper, `.frame` double rule with corner stars) at x 96–900, y 120–600 over the Gulf, holding the ribbon, the wordmark (620 px) and the tagline (Bodoni italic 40/50 px). The rose (300 px) sits on the Gulf below it, by the same placement search. Margin notes are inside the cartouche's foot. The cartouche is screen space: it stays still when the camera leaves at 4.80, then lifts off and fades over 5.20–5.33, as the Reel's title band does, so the in-order read (wordmark, then tagline) finishes at 5.18. **Cover at 4.40.** | wordmark, tagline |
| 4.80–6.933 | 9–12 | **Flight 1:** a low approach from the west across Old Tampa Bay, over the gold causeways (tiltMax 44°). The running head (top-left panel, x 96–700, y 64–330) sets at 5.333. | **SHEET 1 · TP / Tampa** |
| **6.933** | **13** | **DOCK: laptop,** tampa.html, Day, landing close at 1.2 px/css. Iris, then pull back to 0.76 px/css (laptop at x 600–1780, y 150–930). The counts stack (x 96–560, y 360–600) sets at 7.2. The phone companion rises at 8.0. | **228 PLACES · 107 PLACES TO STAY · 243 EVENTS** |
| 7.47–8.40 | 14–15.75 | A real scroll to `#signature` in the laptop; the cursor goes to the Ybor City Museum State Park card's star | |
| **8.80** | 16.5 | **Real click** on `button.star[data-star="ybor-city-museum-state-park"]`, then the toast. The camera pushes in (2D, to 2.4 px/css about the toast) over 8.85–9.30. | **Added to My Trip · View** |
| 9.30–10.667 | | Hold, then pull back | |
| 10.667–11.20 | 20 | Undock | |
| 11.20–13.333 | 21–24 | **Flight 2:** across the bay to St. Pete (tiltMax 40°). The running head changes at 11.733. | **SHEET 2 · SP / St. Petersburg** |
| **13.333** | **25** | **DOCK: laptop,** st-petersburg.html, Day. Pull back; counts set at 13.6. | **105 PLACES · 48 PLACES TO STAY · 129 EVENTS** |
| 13.87–14.30 | 26–26.8 | A real scroll to `#on` ("What's on in the next 60 days"); the cursor goes to the St. Pete Pier Costumed Dog Parade row | |
| **14.40** | **27** | **Real click** on `[data-open-event="st-pete-pier-costumed-dog-parade-2026"]`, so the event dialog opens (the stage drives its rise over 0.2 s because of reduced motion). The camera pushes into the dialog. The dialog's scroll container is set so `[data-evd-star]` sits 140 css px above its bottom edge, with the source line just above it. | |
| **15.467** | **29** | **Real click** on `[data-evd-star]` ("Add to My Trip"), then the toast (secondary). The push brings the laptop from 0.76 to about 2.4 px/css, so the 13 css px source line reads at about 31 px. | **Source: stpetepier.org · Checked Sep 27, 2026** (live dialog, pushed to ≥ 30 px) |
| 15.6–17.6 | | Hold on the source line and the button | |
| 17.60 | 33 | A **real Escape key** press closes the dialog | |
| 18.133–18.667 | 34 | Undock | |
| 18.667–19.733 | 35–36 | **Flight 3, west. SUNSET.** The terminator crosses the focal point at **19.20 (beat 36)**, and the stage flips to Night. The running head changes at 18.933. | **SHEET 3 · GB / Gulf Beaches** |
| **19.733** | **37** | **DOCK: laptop, Night,** gulf-beaches.html?theme=dark. Counts set at 20.0. Phone companion (Night). | **62 PLACES · 138 PLACES TO STAY · 13 EVENTS** |
| **20.80** | 39 | **Real click** on the Fort De Soto Park card's star, then the toast; push-in | **Added to My Trip · View** |
| 23.467–24.00 | 44 | Undock | |
| **24.00–26.133** | 45–48 | **Flight 4, the low flight:** from Pass-a-Grille north along the barrier islands to Clearwater Beach at night (tilt 56°, bearing 0, z rising to about 7 px per world unit). The beach names pass on the plane; the gold coast is under the camera. The running head changes at 24.533. | **SHEET 4 · CW / Clearwater & North Pinellas** |
| **26.133** | **49** | **DOCK: laptop, Night,** clearwater.html?theme=dark. Counts set at 26.4. | **82 PLACES · 38 PLACES TO STAY · 134 EVENTS** |
| **27.20** | 51 | **Real click** on `button.star[data-star="honeymoon-island-state-park"]`, then the toast; push-in | **Added to My Trip · View** |
| **29.333** | 55 | The cursor goes to the topbar's **My Trip 4** button (`a.tripbtn[href="trip.html"]`; its `[data-trip-count]` reads 4); **real click**. The stage shows the click, then the preloaded `trip.html?theme=light` iframe (same origin, same storage; its URL asserted equal to the link's `href`) replaces the page with a slide from the right. | |
| **30.40–34.133** | 57–63 | **MY TRIP at SUNRISE:** the Day wipe runs across the chart around the laptop, and the stage flips to Day at 30.40. The laptop shows My Trip: EVENTS 1 (Costumed Dog Parade), PLACES 3, each row with its sheet badge (SP, GB, CW, TP). The camera pushes in on the count line. | **1 event · 3 places. Saved in this browser, on this device.** (live, trip.html) |
| 34.133–34.667 | 64 | Undock; the phone does not appear here | |
| 34.667–36.80 | 65–68 | Pull back to the index view; the AB and DT boxes draw; **the tally** sets at 34.80 in the top band (y 64–170). The sheets lift and stack on sixteenths (35.47–36.13), the box rises and the lid swings. | **641 PLACES · 414 PLACES TO STAY · 589 EVENTS** |
| **36.80** | **69** | **The lid lands** (landscape masthead at x 210–1710, y 200–990; URL at y ≈ 820; independence line at y ≈ 880–930) | **URL**, **independence line** |
| 36.80–41.067 | 69–77 | Hold; silent by 40.87 | |

---

## 5. Captures, devices and the design system

### 5.1 The site under the camera

- **Build.** At render time, the renderer runs `TBC_OUT=.cache/promo/site node build.mjs` and fails if the build fails. It
  serves that folder twice: at `http://localhost:<port>/visit-tampa-bay/` for laptops and the stage, and at
  `http://127.0.0.1:<port>/visit-tampa-bay/` for phones. It never reads or writes `docs/`.
- **Fingerprint.** It writes a SHA-256 of `data/*.json` plus the built `sitemap.xml` to the render manifest, so every video
  is traceable to the data it showed.
- **Clock.** `context.clock.install({ time: 2026-10-01T13:41:00Z })`, i.e. **Thu, Oct 1, 2026, 9:41 AM Eastern**, then
  `pauseAt`, advanced 1/30 s per frame. Never `?now=`, which prints "Test clock". Phone status bars read 9:41.
  - The date is after the listings start (Sep 28) and more than two weeks before every dated item the video lands on, so
    **no relative words** ("Today", "Tonight", "Tomorrow", "This weekend", "Now", "In 20 min") appear on a must-read frame.
  - The renderer enforces this (§10).
  - `PROMO_CLOCK` can override it, and must be inside `dataWindow`.
- **Motion.** `reducedMotion: "reduce"` in every context; the video adds the motion. Toast and dialog entrances are driven by
  the stage per frame and their inline styles removed afterward, as in Cincy's reel.
- **Theme.** Every iframe URL carries an explicit `?theme=light|dark`, and the renderer asserts `html[data-theme]` in each
  iframe before its first captured frame. This matters because the site persists `tbc-theme`.
- **Next pages.** Links that change page are shown as a tap followed by a **preloaded** next page, because a live navigation
  would make frames depend on load time. The preloaded URL is asserted equal to the link's `href`.
- **Stars.** Every star, dialog button and Escape press is a real event on the real element.

| Cut | Device | URL | Size | What is real |
|---|---|---|---|---|
| 9:16 | phone A | tampa.html?theme=light, then places/ybor-city-museum-state-park.html?theme=light (preloaded) | 390 × 710 | scroll; star on the place page |
| 9:16 | laptop A | st-petersburg.html?theme=light | 1440 × 900 | scroll (no tap) |
| 9:16 | phone A | gulf-beaches.html?theme=dark | 390 × 710 | scroll; star on the Fort De Soto card; the dock badge reads 2 |
| 9:16 | laptop A | clearwater.html?theme=dark | 1440 × 900 | scroll (no tap) |
| 16:9 | laptop B | tampa.html → st-petersburg.html → gulf-beaches.html?theme=dark → clearwater.html?theme=dark → trip.html?theme=light | 1440 × 900 | four stars (one via the event dialog), Escape, the My Trip click |
| 16:9 | phone C (other origin) | the same sheets: `#areas`, `#experiences`, `#stay`, `#history` | 390 × 710 | scroll only |

**Tapped records and their render-time assertions.** Each must exist, be `status: "open"` (places) or `"scheduled"` (the
event), be listed on its sheet page, and keep its star or row selector. On failure, the renderer uses the listed fallback and
logs it; it never keeps stale copy.

| Record | Why | Fallback |
|---|---|---|
| `ybor-city-museum-state-park` (place, signature, a state museum) | the Ybor cigar-label thread; a public institution | `henry-b-plant-museum` |
| `st-pete-pier-costumed-dog-parade-2026` (event, Oct 24, 4–8 PM, `is_free: true`, source stpetepier.org, the organizer's own page) | three weeks after the clock, so no relative word; the organizer is the source, not a tourism bureau | `halloween-on-central-2026` |
| `fort-de-soto-park` (place, signature, a county park) | public; on the beaches sheet | `pier-60` |
| `honeymoon-island-state-park` (place, signature, a state park) | public | `caladesi-island-state-park` |

### 5.2 "Component" captures (the site's own markup, magnified)

The running head and the lid are **the site's own markup and CSS**, not redraws. The stage server serves
`/__component?page=<page>&keep=<selectors>&hide=<selectors>&width=<css>`:

- It extracts the element from the built page and renders it in a document that links `assets/tokens.css` and
  `assets/site.css`, at a viewport of `width` css px, so the site's clamps resolve as on a phone.
- It sets the element's own `data-sheet` and `data-theme` on `html`.
- It hides only the listed parts, and never changes their text.
- The stage shows it in an iframe with a 2D `scale()`: 2.6× for the running head and about 2.14× for the lid in 9:16.

| Component | Source | Kept | Hidden |
|---|---|---|---|
| running head | `header.page-head.sheet-head` of each sheet page | `.kicker` (the ribbon "Sheet 1 · TP"), `h1` | `.lede`, `.dek`, `.sh-counts` (the counts row replaces it with 3 of its 5 items), `.sh-official`, `.head-chips` |
| lid | `index.html section.mast` | `.mast-line`, `.mast-title` (roses and wordmark), `.ripple`, `.mast-index` (six badges and names) | `.mast-dek` (the tally carries its counts) |

Hiding the lede also keeps "per Visit Tampa Bay" and the visitor-bureau line off screen (§10). The lid's date line shows the
site's no-JS text "Listings Sep 28, 2026 – Apr 30, 2027", because the component has no site JS.

### 5.3 Type, color and ornament (DESIGN.md, exact)

- **Fonts** (self-hosted from the build): Bodoni Moda (display, italic for water names and the tagline, 800 lining numerals),
  Figtree (URL, independence line), Archivo 680 at `font-stretch: 108 %` (labels) or 125 % (ribbons), caps with
  `--track-label` 0.12em or 0.26em. Times and counts use `tabular-nums`.
- **Load check.** The stage awaits `document.fonts.load` for Bodoni Moda 700/800/italic 540, Figtree 400/650 and Archivo 680,
  and every iframe awaits `document.fonts.ready` before the first frame.
- **Day chart:** `--bg` #f6ecd5, `--surface` #fcf8eb, `--text` #12264c, `--link` #8d0e5d, `--accent` #a7186f, `--gold`
  #c5953b (ornament only), map water #b9ddea, land #f5e6c4, coast #2f506f.
- **Night chart:** `--bg` #0c1d34, `--surface` #13263e, `--text` #f5ecd7, `--link` #f0d186, map water #04182b, land #1c2c41,
  coast #bd9851 (gold).
- **All stage colors are `var(--…)`** from the build's tokens.css; the only literals are the device grays (§5.4). Sheet inks
  appear only on sheet identity: badges, running-head ribbons, count labels and neatline keylines.
- **Ornament is drawn, never pictured:** neatlines (`.grat`), water lining (the basemap's own echoes), the rose
  (`brand.svg#compass`), the label frame with corner stars (`.frame`), ribbons (`.ribbon`), the ripple (`.ripple`), the seal
  (on the live place page). There are no paper, wood or foil images, glows or drop-shadowed ribbons.
- **The box** is flat faces in `--text` with a `--gold` top rule, and its lid face is the masthead.
- **The mist band** is a flat `--bg` to transparent fade.
- **Motion:** entrances `cubic-bezier(.16,1,.3,1)`; camera moves `easeInOutCubic`; drops ease-in (gravity); the lid ease-in;
  the rose ease-out-back. Nothing moves once it is must-read and settled.
- **Chart linework is decoration, never data.** There are no soundings, buoys or courses the site does not draw. The only
  coordinates printed are the index corners ("28.6° N", "81.9° W"), computed from the view's real georeference as the site
  does. "Not for navigation" is in the margin.

### 5.4 Devices (drawn, generic, no logos)

- **Phone:** Cincy Week's generic drawing from `reel-stage.mjs` (PHONE, PHONE_CSS; a 390 × 710 viewport, status bar,
  address bar reading "fritzhand.github.io"), with no maker's logo. It sits at 1.62 px/css in 9:16 and 0.84 px/css in 16:9.
- **Laptop** (new, in `lib/devices.mjs`): a 1440 × 900 css screen inside an 18 css px near-black bezel with a camera dot.
  Above the screen, a slim neutral browser bar holds a lock icon and "fritzhand.github.io/visit-tampa-bay/…"; there are no
  OS menus or traffic lights. A thin hinge joins a 3D base (a face at `rotateX(90deg)`) with a flat keyboard well and
  trackpad outline.
  - Device grays are literals kept in `DEVICE` in `lib/devices.mjs`, as Cincy's phone did. They are not brand colors.
  - The laptop never carries `will-change`, so Chromium re-rasterizes its iframe at each push's scale and pushes stay sharp.

---

## 6. Every word on screen, and where it comes from

**Hand-written words on screen: none.** Every line below is read at render time. If a read or a check fails, the render
stops and names the source.

| Line (as shown) | Where | Source | Check |
|---|---|---|---|
| TAMPA BAY / Chartbook (wordmark) | hook, lid | `site/img/brand/brand.svg#wm` (outlined lettering) | `site.config.json` `siteName` is "Tampa Bay Chartbook" |
| *An independent guide to Tampa Bay,* / *every entry linked to its source* | hook | `site.config.json` `siteTagline`, split at the first ", " | it must split into exactly two lines at ", ", each at most 36 characters; a changed tagline is shown as it now reads, and one that no longer fits two lines fails the render |
| SHEETS 1–6 · TAMPA BAY / NOT FOR NAVIGATION | hook margin | `index.html .mast-line .side` (first and last), in caps | present |
| *Gulf of Mexico*, *Tampa Bay*, *Old Tampa Bay*, *Boca Ciega Bay* … and towns and beaches | chart | `data/map.json` `.region.labels` and `.labels` (`text`, `kind`, `minZoom`) | texture |
| TP SP GB CW AB DT (badges) | chart | `brand.svg#sheet-<id>`; positions from `index.html .ix-badge` | six sheets present; codes equal `research/tools/schema.mjs` REGIONS |
| 28.6° N / 81.9° W | index corners | computed with `geo.js unproject` from the view | equal to `index.html .ix-corner` text |
| SHEET n · CODE / sheet name | running heads | each sheet page's `.page-head .kicker span` and `h1` (component capture) | kicker matches `^Sheet \d · [A-Z]{2}$`; code and n equal the region's |
| 105 PLACES · 48 PLACES TO STAY · 129 EVENTS (and the others) | counts rows | the sheet page's `.sh-counts span`: the items ending "places", "places to stay" and "events" | numbers equal the engine's `load()` (`r.places.length`, `r.stays.length`, `r.events.length` of **live** events) **and** `index.html #sheet-<id> .si-counts` |
| everything inside a device | devices | the live pages | §10 scans |
| Added to My Trip · View | taps | live `[data-toast]` (`site/js/core/trip-store.js`) | text is "Added to My Trip" plus "View" |
| Source: stpetepier.org · Checked Sep 27, 2026 (16:9) | SP dialog | live `#event-dialog` source line | equals `hostOf(source_url)` and `fmtDateY(checked)` of the event |
| 1 event · 3 places. Saved in this browser, on this device. (16:9) | My Trip | live trip.html count line | equals the taps made (1 event, 3 places) |
| 641 PLACES · 414 PLACES TO STAY · 589 EVENTS | tally | numbers: `load().counts` places, stays, events (live events only); labels: the words of `index.html .mast-dek` | the three numbers equal those in `.mast-dek` and in `<meta name="description">` |
| the lid's masthead | end | `index.html section.mast` (component) | present |
| fritzhand.github.io/visit-tampa-bay | end | `site.config.json` `siteBase` without "https://" and the trailing slash | equals the brief's address |
| Independent guide. Not affiliated with any tourism office, venue or operator. | end | `index.html .footer-indep b` (`INDEPENDENCE` in `build/core/shell.mjs`) | equals the brief's line exactly |
| U.S. Census Bureau, TIGER/Line Shapefiles 2024 (public domain). Positions include data © OpenStreetMap contributors, ODbL. | end fine print (22 px, texture) | footer map credit (`.footer-base` second span) and the sheet chart caption's OSM sentence | present |
| a photo credit, when a photo is prominent (§10.8) | bottom-left of the device, 22 px | `data/images.json` `credit` for the visible image's key | automatic |

Counts at the Sep 27 private build (the renderer recounts): 641 places, 414 stays, 176 experiences, **589 live events** (590
records; one, `hokus-pokus-live-tampa-theatre-2026-11-03`, is cancelled and so not counted, matching the site). Per sheet:

| Sheet | Places | Places to stay | Events |
|---|---|---|---|
| TP | 228 | 107 | 243 |
| SP | 105 | 48 | 129 |
| GB | 62 | 138 | 13 |
| CW | 82 | 38 | 134 |
| AB | 46 | 79 | 14 |
| DT | 118 | 4 | 54 |

---

## 7. The original score

Every note is computed. There are no samples and no licensed audio. The score extends Cincy's `lib/synth.mjs` (its biquads,
Freeverb, seeded noise and mixer) with the voices below. It is **written to the picture from the same timeline module** the
stage uses (`lib/promo-timeline.mjs` exports every cue in beats), so a picture change moves its sound with it.

- **Tempo and key:** 112.5 BPM (16 frames per beat), 4/4, 2-3 son clave.
- **Day:** C major. Night: A minor (Am–F–Em–G). Dawn resolves G → C.
- **Each sheet is a note:** TP = C4, SP = D4, GB = E4, CW = G4, AB = A4, DT = C5. Every dock hit sounds its sheet's note as a
  chord tone (§3.1 chords are chosen for that). The six badge stamps in the hook and the six stacking pages play the six
  notes in order. **The lid chord is C6/9 (C D E G A): every sheet at once.**

### 7.1 Voices

| Voice | Synthesis (48 kHz) |
|---|---|
| **tres** (lead harmony, guajeo) | **Karplus-Strong**, two courses per note detuned ±3 cents and panned ±0.2 (the G course an octave pair). The excitation is a 2 ms noise burst, low-passed at 3–6 kHz by velocity, then pick-position combed (β = 0.13). Loop: `y[n] = x[n] + ρ·½(y[n−N] + y[n−N−1])` with ρ = 0.996, plus an allpass for fractional tuning. Body: +3 dB peaks at 220 Hz and 2.6 kHz. |
| **bass** (tumbao) | Karplus-Strong at low pitch (ρ = 0.998, a dark loop low-pass at 900 Hz), plus a sine sub at the fundamental at −8 dB. Pattern: the **"and of 2" (the fifth) and beat 4 (anticipating the next bar's root)**, with no beat 1 except on the groove drops. |
| **clave** | sine partials at 2.5 and 3.75 kHz, 30 ms exponential decay, a 2 ms click. 2-3 son: the 2-side on beats 2 and 3 of even bars; the 3-side on beat 1, the "and of 2" and beat 4 of odd bars. |
| **bongó** (martillo, eighths) | membrane: a sine with a 12 % pitch drop over 30 ms plus a 1.59× mode. Macho 420 Hz, hembra 290 Hz. Tips 35 ms; opens 80 ms on the 7th and 8th eighths; thumb strokes add a band-passed slap (1.8 kHz, 15 ms). |
| **güiro** | noise band-passed at 3.2 kHz (Q 2), amplitude-modulated by a ridge sawtooth. The groove plays long (28 Hz ridges, 0.28 s), short, short. **Scroll-coupled:** during every device scroll, ridge rate = scroll speed (css px/s) ÷ 60 and level = min(1, speed/2000). |
| **brass pad** (soft trumpets and trombones) | four detuned saws per note (±7 cents) with a low-pass envelope that "blats" (500 → 2400 Hz in 60 ms, settling at 1400 Hz); ADSR 40 / 200 / 0.7 / 400 ms; 5 Hz vibrato at 6 cents after 300 ms. Voiced G3–E5. Only on accents, sunset, sunrise and the lid. |
| **ocean wash** | a brown-noise surf (leaky-integrated white, low-passed at 700 Hz) with wave envelopes rising in 1.4 s and falling in 2.6 s (one wave per 4 bars in Day, per 2 bars at Night), plus a foam layer (band-pass 4 kHz, 0.35 s behind). Left and right use different seeds. |
| **bell** | Cincy's FM bell (3.5:1), for the rose landing and the dock accents |
| **sfx** | **burin scratch** (amplitude = engraving draw speed, panned with the leading point); **rose ratchet** (a tick at every 11.25° crossing of the rose, 3 kHz, 8 ms); **stamps** (a sine thump dropping to the sheet's note, plus a paper slap); **dock snap** (two wood ticks 20 ms apart); **glass tap** (phones) and **trackpad click** (laptops); a **paper swish** (page slide, dialog); **whooshes** (band-passed sweeps ending on C or G, panned with the camera's lateral motion); the **lid thump** (a C2 sine drop plus a wood knock at 400 Hz) |

### 7.2 Arrangement, written to picture (Reel; the 16:9 follows its own bars in §4.2 with the same cues)

| Bar (s) | Picture | Music |
|---|---|---|
| pickup (0) | blank sheet, engraving | wash swell, burin, ratchet |
| 1 (0.533) | wordmark slam; the rose lands at beat 3 (1.600) | **low C, a rolled tres C, a brass C6/9 stab**; a bell G5 at 1.600 |
| 2 (2.667) | six badges drop | **clave in**; six stamps with tres C D E G A C on eighths; bass C pedal |
| 3 (4.800) | flight 1, then the TP dock at beat 3 (5.867) | **groove drop:** tumbao, martillo, güiro, guajeo on C; the dock hit = tres C5 and a brass stab |
| 4 (6.933) | key tap, place page, star (7.467) | F; the star's "added" motif C5 → G5 |
| 5 (9.067) | hold, undock | C |
| 6 (11.200) | SP laptop dock | G; the dock hit = D5 |
| 7 (13.333) | orbit, then sunset (flight 3 at 14.40; night at 14.933) | F; a tres run down at 14.40; the brass pad swells; the wash rises |
| 8 (15.467) | GB phone dock, Night; the star at 16.80 | **Am**, the bolero-son feel: softer bongó, tres in thirds, bass half notes; dock = E5 and a bell; the "added" motif E5 → B5 at 16.80 |
| 9 (17.600) | hold on the toast; undock at 19.20 | F |
| 10 (19.733) | the low flight, the CW dock at beat 3 (20.80) | **Em;** the foam wind swells; bongó opens; dock = G5 |
| 11 (21.867) | orbit | G, the dominant, building |
| 12 (24.000) | **sunrise** and pull-back; AB and DT drop; the tally | **C:** a brass C–E–G figure, the guajeo bright again; stamps A4 (24.533) and C5 (24.80) |
| 13 (26.133) | pages stack on eighths (from 25.60) | F; **the drums drop out**; six plucks C D E G A C with paper slaps |
| 14 (28.267) | **the lid lands** | **the lid thump, then a tutti C6/9** (tres strum, brass, bass C2, bell C6) |
| 15 (30.400) | hold | the C6/9 rings; tres tremolo at −12 dB fading; wash; **silence by 32.33** |

**Audio-reactive treatment:** none, except that the güiro follows the scroll speed and the burin follows the draw speed,
both computed from the same functions the picture uses.

**Restraint:** no cymbal crashes, no risers longer than 0.55 s, no sound on text entrances except the running-head slaps,
and sound effects 6–10 dB under the bed.

### 7.3 Mix and loudness

- **Buses** (send is the room send):
  - tres: send 0.22, HP 120 Hz;
  - bass: dry, LP 1.2 kHz;
  - perc (clave, bongó, güiro): send 0.12, HP 150;
  - brass: send 0.35, HP 180;
  - wash: send 0.15, HP 60;
  - sfx: send 0.20, LP 8 kHz;
  - bell: send 0.35.
- **Room:** Cincy's Freeverb (size 0.72, damp 0.4, predelay 20 ms).
- **Ducking:** the wash ducks 3 dB under each accent.
- **Master:** HP 30 Hz; a 2:1 bus compressor over −16 dBFS; a soft clip; nothing harsh above 8 kHz.
- **Loudness: −14 LUFS integrated, ≤ −1 dBTP.** Render 32-bit float WAV and measure with ffmpeg `ebur128`. Apply **two-pass
  `loudnorm` in linear mode** (I = −14, TP = −1.5, which leaves headroom for AAC). After muxing, **decode the AAC and
  re-measure**. The render fails unless I is within −14 ± 0.5 LUFS and true peak ≤ −1.0 dBTP.
- **Encoding:** 48 kHz stereo AAC at 192 kbps; H.264 High, yuv420p, crf 17, 30 fps, `+faststart`.
- **It reads with the sound off.** Every idea is carried by the words and the picture; the sound adds place, rhythm and the
  "every sheet is a note" joke.

---

## 8. Cover frames

- **9:16: the frame at 4.40 s (f132)**, baked in as frame 0 by replacing frame 0 (not adding one) and exported as
  `cover-9x16.jpg`. It shows:
  - the wordmark;
  - the tagline;
  - the engraved chart index with the rose on north;
  - all eight badges (six sheets).
- **It survives the profile grid's 3:4 crop** (y 240–1680): its content lies in y 284–1661. The south Day Trips badge at
  y ≈ 1661 is the lowest element and is inside the crop. At grid size the wordmark is still about 270 px wide.
- **The one-frame jump** from frame 0 to frame 1 (the chart clears to a blank sheet) is accepted under brag's poster rule.
- **16:9: the frame at 4.40 s,** exported as `cover-16x9.jpg` plus `thumb-1280x720.jpg`: the cartouche and wordmark on the
  Gulf, the index with its badges, and the rose.

---

## 9. Safe areas

- **9:16** (Instagram Reels, TikTok, YouTube Shorts): every must-read line sits inside **y 250–1440**:
  - x 64–1016 for y < 1050;
  - **x 64–940 for y ≥ 1050**, clear of the button column;
  - clear of the top header zone (y < 250) and the caption zone (y > 1440; TikTok's is the deepest at about 480 px).
  - **Texture that may cross:** the chart, badges, the rose, the phone's lower body and the site's dock, and the lower lid
    fine print.
- **16:9** (YouTube, LinkedIn, X, the website): must-read lines sit inside **x 96–1824, y 64–960**, clear of the player bar
  and controls (y > 980).
- **The check:** Cincy's per-frame `AUDIT_JS` runs on the stage, and a device probe (§10.6) runs inside the iframes. Any
  settled must-read box outside the zone fails the render.

### Reading time (rule: max(floor, 0.3 s × words); floor 0.8 s for 1–3 words, 1.2 s for longer; counted while settled)

| Reel line | Words | Settled | For | Need | Pass |
|---|---|---|---|---|---|
| wordmark | 3 | 0.68–5.20 | 4.52 | 0.9 | yes |
| tagline (both lines) | 12 | 1.00–5.20 | 4.20 | 3.6 | yes |
| SHEET 1 · TP / Tampa | 4 | 5.48–6.95 | 1.47 | 1.2 | yes |
| Added to My Trip · View (TP) | 5 | 8.00–9.60 | 1.60 | 1.5 | yes |
| SHEET 2 · SP / St. Petersburg | 5 | 10.55–14.67 | 4.12 | 1.5 | yes |
| 105 PLACES · 48 PLACES TO STAY · 129 EVENTS | 8 | 11.62–14.67 | 3.05 | 2.4 | yes |
| SHEET 3 · GB / Gulf Beaches | 5 | 14.82–19.73 | 4.91 | 1.5 | yes |
| Added to My Trip · View (GB) | 5 | 17.30–19.20 | 1.90 | 1.5 | yes |
| SHEET 4 · CW / Clearwater & North Pinellas | 6 | 20.15–24.80 | 4.65 | 1.8 | yes |
| 82 PLACES · 38 PLACES TO STAY · 134 EVENTS | 8 | 21.22–24.80 | 3.58 | 2.4 | yes |
| 641 PLACES · 414 PLACES TO STAY · 589 EVENTS | 8 | 24.95–32.53 | 7.58 | 2.4 | yes |
| fritzhand.github.io/visit-tampa-bay | 3 | 28.27–32.53 | 4.27 | 0.9 | yes |
| Independent guide. Not affiliated with any tourism office, venue or operator. | 11 | 28.27–32.53 | 4.27 | 3.3 | yes |

**In-order load.** The running head and counts rows stay until the next head replaces them. The in-order reads fit:

- hook: wordmark 0.68–1.58, tagline 1.58–5.18, before the title lifts at 5.20;
- SP: head 10.55–12.05, counts 12.05–14.45;
- CW: head 20.15–21.95, counts 21.95–24.35;
- end: tally 24.95–27.35, URL 28.27–29.17, independence line 29.17–32.47, before the end at 32.53.

The lid's wordmark counts as a logo already read in the hook.

**16:9** follows the same rule with its §4.3 times. Its tightest lines are:

| 16:9 line | Words | Settled | For | Need | Pass |
|---|---|---|---|---|---|
| wordmark, then tagline (cartouche) | 3 + 12 | 0.68–5.20 | 4.52 | 0.9 + 3.6 in order | yes |
| the SP source line | 6 | 15.60–17.60 | 2.00 | 1.8 | yes |
| the My Trip count line | 11 | 30.67–34.13 | 3.46 | 3.3 | yes |

---

## 10. Risks, and how the renderer catches each one

The renderer fails with a message naming the cause unless the item says "warn".

1. **The site changes while page lanes work in parallel.** The renderer captures a private build of the current tree (§5.1)
   and asserts every read in §6. Any mismatch fails the render; it never falls back to cached copy.
2. **Counts drift, or the site counts differently from the data.** Counts come from the engine's own `build/core/load.mjs`:
   live events exclude cancelled and postponed ones, which is why there are 589 and not 590. Each count must equal the
   number printed on the page.
3. **The dock does not match.** At every dock frame the renderer measures the iframe's `.sc-map .mini-map svg` rect against
   the stage chart's projected crop. The maximum corner error must be ≤ 1.5 output px. It also checks that the page's
   viewBox still matches its printed limits (§2.1).
4. **Relative-time words, "Test clock" or stale live states.** A per-frame visible-text probe maps each iframe's text nodes
   into stage coordinates. It fails if "Today", "Tonight", "Tomorrow", "This weekend", "Now", "Started", "In N min" or
   "Test clock" is visible at ≥ 18 output px for 6 or more consecutive frames.
5. **Third-party names read as ours.** The same probe fails if "Visit Tampa Bay", "visittampabay", "Visit St. Pete",
   "visitstpeteclearwater" or "Official visitor bureau" is visible at ≥ 18 px for 6 or more frames. This is why the Tampa
   stop docks on the chart below the lede, and the phone companion shows sections, not heads.
   - Stage captions contain only sheet names, counts and site lines. A banned-claims list ("best", "#1", "ultimate",
     "official", "top", "must-see") is also checked against every stage string.
6. **Must-read text inside devices is too small or unsafe.** The toast, the dialog source line and the My Trip count line
   get `data-read` probes: their text boxes are mapped out of the iframe through the device transform. They must be ≥ 36 px
   (9:16) or ≥ 30 px (16:9), inside the safe zone, and settled for their reading time.
7. **Implying stars sync across devices.** Phones and laptops run on different origins. The renderer asserts that each
   device's `tbc-trip` holds exactly its own taps: phone A 2 places; laptop B 1 event and 3 places.
8. **Uncredited images.** A per-frame probe lists every `<img>` visible in a device viewport:
   - Any image covering ≥ 8 % of the frame for 12 or more frames gets an automatic on-screen credit, bottom-left of that
     device, from `data/images.json` `credit`. The Tampa and St. Pete sheet photos may qualify.
   - The README's credit list is exactly the set of images seen in any frame.
   - Image processing is still running, so the set is computed at render time.
9. **Horizon holes or raster blur at tilt.**
   - Holes: the frustum check (§2.3) fails any exposed edge.
   - Blur: the raster-scale check computes, per frame, the maximum device px per raster px. At > 1.6 it fails and suggests a
     tile resolution.
10. **Theme mix-ups** (the site persists `tbc-theme`). The renderer asserts `html[data-theme]` in every iframe per segment,
    and on the stage at every edition flip.
11. **Fonts not loaded.** `document.fonts.check` runs for all three families in the stage and every iframe before frame 1.
12. **Toast or dialog timing on a frozen clock.** Toasts dismiss after the site's 3.2 s, counted on the installed clock:
    - TP star at 7.47, dismissed at 10.67, after its undock at 9.60;
    - GB star at 16.80, dismissed at 20.00, after its undock at 19.20;
    - in 16:9, every toast is gone or off-screen before its undock.

    Stage-driven entrances remove their inline styles when done.
13. **Tapped records change.** The renderer asserts status, sheet and selector (§5.1) and falls back to the listed record,
    logged in the manifest.
14. **Console errors in any iframe** fail the render.
15. **Loudness out of range** fails the render (§7.3).
16. **Performance** (a 4-CPU box shared with other agents). Rasters are cached by a hash of the SVG and tokens.css. JPEG
    frames are piped to ffmpeg. The renderer logs milliseconds per frame and warns above 0.6 s. Stills mode renders only the
    requested frames.
17. **Determinism.** Every frame is a pure function of `t`: the camera, overlays, scroll positions and taps are all indexed
    by frame, and the site's clock advances exactly one frame per frame. A `--check-determinism` run renders frames 132, 464
    and 848 twice and compares hashes.
18. **Device drawings that look like a brand.** No logos, no notch branding and no OS UI beyond a status bar and a neutral
    address bar.
19. **Tobacco imagery.** None: the "cigar box" is a flat, token-colored box whose label is the site's own masthead.

---

## 11. Build notes for the engineer

- **Files** (all in `collateral/`):
  - `build-promo.mjs`, with subcommands:
    - `all`
    - `stills <9x16|16x9> <t1,t2,…>`
    - `audio`
    - `sheet`
  - `lib/`:
    - `promo-timeline.mjs` (every cue in beats)
    - `chart-world.mjs` (projection, affine, rasters, camera, van Wijk path, terminator)
    - `devices.mjs` (phone, laptop, cursor)
    - `capture.mjs` (build, the two-origin server, `/__component`, clock, probes)
    - `checks.mjs`
    - `synth.mjs` (Cincy's, plus `ks`, `membrane`, `guiro`, `brass`, `wash`)
    - `promo-score.mjs`
    - `review-tools.mjs` (Cincy's)
- **Outputs** (all in `collateral/promo-2026-09/`):
  - `tampa-bay-chartbook-reel-9x16.mp4`
  - `tampa-bay-chartbook-16x9.mp4`
  - `cover-9x16.jpg`, `cover-16x9.jpg`, `thumb-1280x720.jpg`
  - `share-copy.txt`
  - `README.md`: the idea, the timelines, every word's source, image and map credits (TIGER/Line, OpenStreetMap ODbL), the
    clock, the fingerprint and how to rebuild.
- **Working files:** audit reports and rasters go in `.cache/promo/`.
- **Frames:** DPR 1.5 for both cuts (1620 × 2880 and 2880 × 1620 captures), downscaled by ffmpeg with
  `scale=…:flags=lanczos`.
- **Scope rules:** never write `docs/`, never run git, never touch files outside `collateral/` and `.cache/`.
