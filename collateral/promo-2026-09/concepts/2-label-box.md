# Concept 2 · "Under the Lid": the cigar-box label

A promo concept for **Tampa Bay Chartbook** (fritzhand.github.io/visit-tampa-bay), written Sep 27, 2026, in the spirit
of Cincy Week's `collateral/reel-2026-09/brag-plan.md`. Two cuts only: a **9:16 Reel (1080×1920, 30.4 s)** and a
**16:9 video (1920×1080, 40.0 s)**. There is no 4:5 cut: the owner does not want one, so none is planned, built or rendered.

Every number below marked "as of writing" was read from `data/` and a private build (`.cache/out-promo`) on Sep 27. The
renderer recomputes all of them at render time and never prints a number from this file.

---

## 1. Logline

A lithographed Ybor cigar-box label, drawn only from the Chartbook's own ornament, tears its seal on the clave and throws
open its lid. Where the cigars would lie, the real site rises in four live devices hanging at depth: What's On, the bay
chart, Ybor City's heritage page, Where to stay, then My Trip. The devices sink back, and the lid shuts on the address
and the independence line.

## 2. The idea

The site says it outright. About & sources, "What this is": *"It is printed like the region's own graphic art, the Ybor
City cigar-box label."* The promo takes that sentence literally.

A navy cigar box with gold edging sits on a chart of Tampa Bay, the site's own Census TIGER basemap laid flat as a
tabletop. Its lid carries a label built only from the Chartbook's parts: the medallion, the stacked wordmark, the two
compass roses of the home masthead, a graticule border with corner stars, and the six sheet badges set where a cigar
label sets its prize medals. The clave strikes three times: the seal tears, the medallion clasp flips, the lid flies
open. The camera cranes down to face the inner label, which prints the guide's four counts in fat Bodoni numerals, the
way a cigar box prints its count.

Where the cigars would lie, four devices lie face up. On the downbeat they rise out of the box and hang in the air in
front of the inner label, each running the real site live, and the camera flies between them with true parallax:

- a phone on What's On, which jumps to February and stars Ybor City's 80th Fiesta Day ("Added to My Trip");
- a tablet on the bay chart, where a real tap turns on the Where to stay layer;
- a laptop on the Ybor City Historic District page, where a real tap on "History and heritage" lands on the page's
  heritage block (founded 1886, National Historic Landmark);
- a second phone on Where to stay;
- then back to the first phone, now on My Trip, holding the one festival it starred.

The devices sink back into the box in reverse order. The lid slams on the last stroke of the clave, the camera rises to
look straight down on it again, and the label's cartouche now prints the address. The independence line sits under the
box.

The score is an original son montuno computed note by note: tres (Karplus-Strong), baby-bass tumbao, claves, bongó and
bell, maracas, güiro, a brass section and the wash of the Gulf. Its 3-2 son clave is also the video's structure. The
**3 side** of the first bar opens the box (E-G-A on the tres). The **2 side** of the last full bar shuts it (D-C). The
whole promo is one clave phrase stretched over thirty seconds.

## 3. Why this beats Cincy Week's Reel

| Cincy Week, "The Interchange" (22 s) | "Under the Lid" |
|---|---|
| Flat 2D stage; one phone, pushed in 2D | A true 3D scene (CSS 3D, one perspective camera): a box with thickness, a hinged lid, a tabletop chart receding in perspective, four devices at different depths with real parallax, depth of field and motion blur |
| One live page (The Week), one tap | Four live pages in four devices plus My Trip: four real clicks and one shown tap in the Reel, eight real clicks and one shown tap in the 16:9 |
| Two hand-written hook lines | **No hand-written sentences at all.** Every word is the site's or the data's; the only hand-made marks are separators, case, one ellipsis, the word "Photo:" and the device clock (§9) |
| Motif: the site's week line and logo | Motif: the site's own stated origin (the About sentence), its masthead, sheet badges and medallion, as a physical object |
| A pre-week clock to dodge live states | The same trick, plus **one browser per device**. Each device runs on its own origin, so its stars stay in its own storage and nothing implies cross-device sync the site does not have ("Your list stays in this browser, on this device") |
| Reading-time and safe-zone audit on flat text | The same audit made **3D-aware**: projected size, plane angle to the camera, on-screen speed, safe zone, reading time and in-order scene load, plus a sharpness check, a name guard and a determinism check (§17) |
| Score in D major, pitched sound effects | An idiomatic son montuno with the clave as sonic logo, a scroll-driven güiro and foley synthesized from models (paper, cedar box, brass clasp) |

## 4. The non-negotiables, and how this concept meets each

| Rule | How |
|---|---|
| Every count computed from `data/*.json` at render time | The renderer counts the records itself (§16) and asserts each number equals the sentence the built site prints. The map's "1,407 on the chart" is the site's own computation from data in the private build made at render time; it is cross-checked against the page's server-rendered map count |
| Every sentence about the site read from the built site or data | Each caption is the page head of the page in the device (its kicker and h1), set at poster scale, or a verbatim clause of the tagline, the home dek, a record's summary, the About page or the footer. The full table is §9 |
| Hand-written lines listed | None are sentences. §9 lists the marks |
| No "best", "#1", "ultimate", "official" | None appear. A render-time word filter fails on them (and on "Visit Tampa", "Visit St", "voted", "award", "EST."). It is case-sensitive, so the address `visit-tampa-bay` passes |
| Never Visit Tampa Bay's, any team's or any venue's logo or name as ours | Our layers never name them. A **name guard** fails the render if a tourism-office or pro-team name is legible and still in any device (§17). Venue names appear only inside real listings, as listings |
| Images: only the site's rights-cleared ones, with credits | The vignette comes from `data/images.json` (public domain, CC0 or U.S. government only, because it is duotoned) with an on-screen credit. Every image and font credit is written into the README |
| End card: address and independence line | `fritzhand.github.io/visit-tampa-bay` in the label's cartouche; "Independent guide. Not affiliated with any tourism office, venue or operator." under the box |
| An original score computed note by note | `collateral/lib/son-score.mjs` plus synth voices (§13): no samples, no licensed audio, no quoted melodies |
| Reads with the sound off | The story is carried by captions, visible taps and the site's own toast (§14) |
| Capture a private build of the current tree at render time; never write `docs/`; never touch files outside `collateral/` and `.cache/`; never run git | `TBC_OUT=.cache/out-promo node build.mjs`; all work files in `.cache/promo/`; outputs in `collateral/promo-2026-09/` |

## 5. What it never shows, and why

- **No cigars, smoke or tobacco.** The box is the region's graphic art, per the site's About sentence; it holds devices.
  The cigar-rolling experiences in `data/experiences.json` are not featured.
- **No "EST. 18xx", no exposition medals, no "Hecho a mano", no "Clear Havana".** A real label's medals and founding year
  would be invented claims here. The medals are the six sheets. The label prints no year.
- **No wood grain or paper texture.** DESIGN §1: "Ornament is drawn, never pictured." The box is flat navy card with gold
  edging tape, both drawn with tokens.
- **No cross-device sync.** Each device is its own origin (§7). The laptop never shows the phone's star.
- **No `?now=`.** It prints "Test clock" on the home page. The browser clock is installed instead (§7).
- **No navigation data on the tabletop chart.** It is the site's basemap. The neatline has ticks but no numbers
  (DESIGN §9).
- **No hotel, venue or operator photos,** and no event or team marks. Device chrome is generic, with no manufacturer marks.

---

## 6. The object (build spec)

### 6.1 World, units and camera model

- Units are CSS px. The **floor** (tabletop) is the plane y = 0. "Up" is −y (CSS). +z points toward the camera's
  starting side (the box front).
- Viewport: `#viewport { perspective: F; perspective-origin: 50% 50% }` with **F = 2000 px** in both cuts. Vertical
  FOV is 51.3° in 9:16 and 30.4° in 16:9. An object of world width w at distance d from the eye appears **w·F/d** px wide.
- Camera: an orbit camera around a target **T** with distance **d**, pitch **φ** (0° = eye level, 90° = straight down)
  and yaw **ψ** (0° = looking at the box front from +z). Implement it as one transform on `#camera`
  (`translateZ(F − d) rotateX(…) rotateY(…) translate3d(−T)`), with every object a child in world coordinates and
  `transform-style: preserve-3d` on every ancestor.
- `lib/stage3d.mjs` exports **`project(point, cam)`**. It is used by the audit, by tap placement, by shadows and by the
  focus-blur. `tests/stage3d.test.mjs` (collateral-local) renders six probe elements under six poses and asserts that
  `project()` matches their `getBoundingClientRect()` within 1 px. That test fixes every sign convention; do not trust
  the prose here over it.
- **Flattening traps.** `overflow: hidden`, `opacity < 1`, `filter` or `clip-path` on any ancestor of a 3D child
  flattens it. Apply fades and blur only to leaf planes (a device, a label face), never to `#camera` or a group.
  Coplanar layers are offset 0.5 px in z. The lid's two faces are back-to-back planes with
  `backface-visibility: hidden`.
- **Normative vs starting values.** The **output-pixel compositions in §8.4 are normative.** World positions and camera
  values below are starting values. Tune them with `project()` until the compositions match within 12 px.

### 6.2 The box (starting values)

| Part | 9:16 | 16:9 |
|---|---|---|
| Box, outer (x × z × height) | 900 × 1040 × 240 | 1500 × 860 × 240 |
| Walls | 20 thick; inside lined with `--gold-tint` card (drawn) | same |
| Lid | 900 × 1040, hinged on the back top edge (z = −520, y = −240); rotation θ from 0° (shut) to 100° (open) | 1500 × 860, hinge z = −430 |
| Body color | `--frame-outer` (Day navy) | same |
| Edging tape | 28 px strips along every edge in `--gold`, two 1.5 px `--gold-ink` rules, the label's corner star (`--mask-corner`) repeated every 48 px in `--gold-ink` at 30 % | same |
| Front face | the one-line lockup (`brand.svg#wm-line`) in `--gold` on navy, 60 px tall, centered | same, 72 px |
| Seal band | a vertical strip 120 wide over the front edge, centered: 70 on the lid top and 180 down the front. Drawn from `mark.svg`'s band (gold, two navy rules, diamond ends) | same |
| Medallion clasp | `mark.svg`'s ellipse and rose (no band), 150 × 200, a two-faced disc hinged at its top edge, on the seal band at the lid's front edge | same |
| Shadow | a blurred navy (`--scrim`) quad on the floor under the box footprint, 18 % | same |

### 6.3 The outer label (lid top), portrait 9:16

Cream `--surface` card inset 30 px from the lid edges. Everything in it is a site part painted with tokens. Top to
bottom, in world px on a 840 × 980 label:

1. **Border:** the masthead's graticule neatline (`.grat`: outer rule, a 5 px band of `--grat-ink`/`--grat-paper` ticks
   on a 24 px step, inner rule; scaled ×2), then the label frame (2 px `--frame-outer` plus a 1 px `--frame-inner`
   hairline 5 px inside), with corner stars (`--corner-ink`) at the four corners.
2. **Folio** at y 40: "SHEETS 1–6 · TAMPA BAY" left and "NOT FOR NAVIGATION" right. Archivo 26 px, 125 % width,
   `--text-muted`. Texture.
3. **Medallion** at y 90–330: `mark.svg` without its band, 240 tall, flanked by two compass roses (`brand.svg#compass`,
   150 px) as on the home masthead.
4. **Wordmark** at y 350–560: `brand.svg#wm` (the stacked "TAMPA BAY" / "Chartbook" outlines), 640 wide, "TAMPA BAY"
   in `--accent-strong`, "Chartbook" in `--text`.
5. **Water-lining rule** (`hr.wl` recipe) at y 580.
6. **Medals** at y 610–850, two rows of three. Each medal is a 96 px gold ring (`--gold`, 6 px, with a `--gold-ink`
   hairline) holding the sheet badge (`brand.svg#sheet-<id>`, 72 × 43). Under it: "SHEET n" in Archivo 20 px
   `--text-muted` and the sheet name in Figtree 600 24 px `--text`. Order and names come from `data/regions.json`.
   Texture: never must-read.
7. **Cartouche** at y 870–950: a concave-corner plate (`.cartouche`, `--gold-tint` ground, `--gold` double rule).
   - Hook and cover: **"AN INDEPENDENT GUIDE TO TAMPA BAY"**, Archivo 700 at 125 % width, 34 px, 0.12 em tracking, `--text`.
   - End card: **"fritzhand.github.io/visit-tampa-bay"**, Figtree 650 40 px, `--link` with a 3 px `--accent` underline.

For 16:9 (label 1440 × 800) the same parts sit side by side. The medallion and roses are centered at the top. The
wordmark runs across the middle. The six medals form one row of six below it. The cartouche is centered at the bottom,
with the folio in the top corners.

### 6.4 The inner label (lid underside)

It is seen when the lid stands open at 100°, leaning 10° back, facing the S2 camera.

| Part | 9:16 (840 × 980) | 16:9 (1440 × 800) |
|---|---|---|
| Top ribbon | "SHEETS 1–6 · TAMPA BAY" on the site's ribbon (§12), 56 tall; texture | same, top center |
| Vignette | an oval window 420 × 290 at y 110–400 with a `--gold` double rule. Inside is the duotoned vignette image (§15.1), or the compass rose if no image qualifies | left half: oval 560 × 400 |
| Vignette caption | the subject's name in Bodoni italic 30 px (`--text`), then "PHOTO: <credit>" in Archivo 24 px caps (`--text-muted`). Both are must-legible, not must-read | under the oval |
| Counts | four rows at y 450–900. Each row has a numeral (Bodoni Moda 880, lining, 104 px, `--text`, right-aligned at x 360) and a label (Archivo 700, 125 % width, 36 px caps, `--text`, left-aligned at x 390): **641 / PLACES**, **414 / PLACES TO STAY**, **176 / TOURS AND TRIPS**, **589 / EVENTS** | right half: a 2 × 2 grid |
| Bottom ribbon | "NOT FOR NAVIGATION"; texture | same |

### 6.5 The tabletop

The site's `assets/map/basemap.svg` (the bay chart, Census TIGER/Line) is rasterized once at start to a 6000 px-wide
PNG in `.cache/promo/`, under the Day chart tokens. It is laid on the floor, 7000 × 7826 world px, so the box sits on the
Gulf just west of the mouth of Tampa Bay, and "Tampa Bay" and "Old Tampa Bay" show beside it. The water names from
`data/map.json` `labels` are drawn in Bodoni italic, `--map-label-water`, as on the site. The graticule neatline has
ticks only. The tabletop fades into `--bg` with distance (a fog term in the floor's own gradient, not a blur).

### 6.6 The devices

The device drawings are generic graphite with no manufacturer marks. Their hardware colors are the only color literals
in the stage, all in one `DEVICE` constant. Each screen is a live iframe.

| Device | Screen (css) | Iframe (css) | Chrome | World scale | Origin |
|---|---|---|---|---|---|
| **Phone A** | 390 × 844 | 390 × 710 | status bar "9:41", address pill "fritzhand.github.io" (Cincy's `PHONE`) | 1.00 | port P1 |
| **Phone B** | same | same | same | 1.00 | P4 |
| **Tablet** | 9:16: 820 × 1180 portrait; 16:9: 1180 × 820 landscape | screen minus 70 px chrome | status bar and address pill | 0.85 | P2 |
| **Laptop** | 1440 × 900 | 1440 × 830 | a minimal window bar with the address "fritzhand.github.io" | 0.80 | P3 |

Phone A also has a **second iframe** on P1 for `trip.html`, preloaded (§7.2).

---

## 7. Live pages, clock, states and taps

### 7.1 The browser setup

- One Playwright context: `deviceScaleFactor: 2` (frames are captured at 2160 × 3840 and 3840 × 2160, then Lanczos
  downsampled to 1×), `reducedMotion: "reduce"`, `colorScheme: "light"`.
- **Clock:** installed at **Mon, Sep 28, 2026, 09:41:00 EDT (13:41:00Z)**, the first day of the listings window, and
  paused. It advances exactly one frame (33.33 ms) per video frame, so the site's toast timer and the map's animations
  run on video time. Never `?now=`.
- **Origins:** the stage is served on P0. The private build `.cache/out-promo` is served on four more ports, P1–P4, one
  per device. Each origin has its own `localStorage`, so a star on phone A cannot appear on the laptop.
  - The prototype on Sep 27 proved why: two same-origin iframes shared `tbc-trip`, and the laptop showed "In My Trip" for
    a star made on the phone.
  - The renderer asserts that the storage of P2, P3 and P4 has no `tbc-trip` after phone A stars, and that P1's list is
    exactly the one event.
- **Storage** starts empty on every origin. Nothing is pre-seeded, so every star shown is made on camera.
- **Theme:** Day chart everywhere. The renderer asserts the computed `--bg` in each device equals the Day value from
  `tokens.css`. The one exception is the 16:9 laptop, which switches to the Night chart by a real tap (§10).
- **Taps:** the ripple is drawn **inside the device's document**, as an injected `position: fixed`, `pointer-events:
  none` element, so the 3D transform carries it exactly. It is removed after 0.55 s. Clicks are real
  `element.click()` calls on the real elements, fired on the frame named in the cue list.
- **Scrolls:** the site runs with reduced motion, so its own scroll-to-anchor jumps. Where a tap would jump, the tap is
  real, and the stage then drives `scrollTo` along the cue's easing curve to the position the jump reaches (measured in
  a pre-pass). The README says so, as Cincy's walkthrough did.

### 7.2 Pages and interactions

| Device | URL (all under `/visit-tampa-bay/`) | What happens | Real? |
|---|---|---|---|
| Phone A | `whats-on.html` | (1) swipe the sticky month bar (`nav.wo-bar`) left, driving its `scrollLeft`; (2) **tap "Feb"** (`a[data-m="2027-02"]`); the stage scrolls to Sat, Feb 20, 2027 (the card `#e-fiesta-day-ybor-city-2027` sits at about y 129,000 css as of writing, so measure it); (3) **tap the star** `button.star[data-star="fiesta-day-ybor-city-2027"]`; the site's toast "Added to My Trip · View" appears; (4) **tap "View"** (`[data-toast-link]`) | (1) stage-driven scroll of a real element; (2) real click, stage-driven scroll; (3) real click, real toast; (4) the tap is shown, then the preloaded `trip.html` iframe on P1 slides in, as Cincy did for links that change page |
| Phone A, second iframe | `trip.html` | loaded at start. It receives the star through the site's own storage-event listener and re-renders "1 event. Saved in this browser, on this device." and the Fiesta Day row. Scrolled to its list in S8 | real |
| Tablet | `map.html` | **tap the chip** `button.chip[data-layer="stays"]` ("Where to stay 409" as of writing, `aria-pressed` false → true). The chart re-clusters. 16:9 only: **tap a cluster** (`.pin-cluster`) over St. Petersburg; the map zooms on the video clock | real, real |
| Laptop | `places/ybor-city-historic-district.html` | **tap the TOC rail link** "History and heritage" (`href="#heritage"`); the stage scrolls to `#heritage`, then drifts down the designations to the "Heritage sources:" line. 16:9 only: **tap the theme toggle** `[data-theme-toggle]` ("Switch to the Night chart") | real click, stage-driven scroll; real |
| Phone B | `stay.html` | 9:16: a stage-driven scroll from the page head through "Closed for now, opening soon, or open with a note" (its "TEMPORARILY CLOSED" badges are texture) to the sheet sections. 16:9: also **tap** the `summary` "More features (13)", then **tap** `[data-filter-chip="f=historic"]`; the live count reads "Showing 14 of 414 places to stay" | scroll: stage; taps real |

**Real clicks:** 4 in the Reel ("Feb", the star, the Where to stay chip, the TOC link) and 8 in the 16:9 (adding the
cluster, the Night chart toggle, "More features" and "Historic"). **Shown, not clicked:** "View" in both cuts (the
preloaded trip page on the same origin slides in). **Stage-driven:** every scroll, including the month bar's swipe.
The README lists each of these.

---

## 8. The Reel, 9:16: 1080 × 1920, 30 fps, 30.4 s (912 frames)

### 8.1 The grid

The tempo is **112.5 BPM**. At 30 fps a 16th note is exactly 4 frames, a beat 16 frames and a bar 64 frames
(2.1333 s). A one-beat pickup runs frames 0–15. The downbeat of bar *n* is at frame 16 + 64(n − 1), time
0.5333 + 2.1333(n − 1) s. The clave is 3-2 son clave: odd bars are the 3 side (16ths 0, 6, 12, so +0, +0.8 and +1.6 s),
even bars the 2 side (16ths 4 and 8, so +0.533 and +1.067 s).

| Bar | Downbeat | Clave strokes (s) | Scene |
|---|---|---|---|
| 0 (pickup) | 0.000 | — | S1 cover still |
| 1 | 0.533 | 0.533, 1.333, 2.133 | **S1 hook:** tear, clasp, lid |
| 2 | 2.667 | 3.200, 3.733 | **S2** inner label, counts |
| 3 | 4.800 | 4.800, 5.600, 6.400 | S2 hold |
| 4 | 6.933 | 7.467, 8.000 | **S3** launch and tableau |
| 5 | 9.067 | 9.067, 9.867, 10.667 | **S4** phone A, What's On |
| 6 | 11.200 | 11.733, 12.267 | S4 toast, View |
| 7 | 13.333 | 13.333, 14.133, 14.933 | **S5** tablet, Map |
| 8 | 15.467 | 16.000, 16.533 | **S6** laptop, Ybor |
| 9 | 17.600 | 17.600, 18.400, 19.200 | S6 heritage |
| 10 | 19.733 | 20.267, 20.800 | **S7** phone B, Where to stay |
| 11 | 21.867 | 21.867, 22.667, 23.467 | **S8** phone A, My Trip |
| 12 | 24.000 | 24.533, 25.067 | **S9** descend; the lid shuts on 25.067 |
| 13 | 26.133 | 26.133, 26.933, 27.733 | **S10** end card |
| 14 | 28.267 | 28.800, 29.333 | end card; silence from 30.2 |

### 8.2 The hook: the first 1.5 s

Frame 0 is already a finished poster. The box is seen from almost straight above (pose P0, φ 78°, ψ 6°), so its navy
sides and gold edging show as slim 3D slivers. The label fills the frame, x 110–970, with "TAMPA BAY / Chartbook", the
medallion between two compass roses, the six sheet medals, and the cartouche "AN INDEPENDENT GUIDE TO TAMPA BAY". The
ocean wash is already under it, and the tres plays a three-note pickup.

- **0.03–0.40:** a gold-leaf glint (a `--gold-leaf` band masked to the gold shapes) sweeps once across the wordmark rules
  and the medal rings. It has passed by the cover frame (0.47). The camera starts a slow push (d 2093 → 2030 by 2.13 s,
  under 1 px per frame).
- **0.533, the clave's first stroke:** the gold seal band over the front edge **tears**. A jagged split opens at the lid
  seam, and the two halves spring apart 30° on outBack over 0.2 s. The tres plays E4, with a paper tear.
- **1.333, the second stroke:** the **medallion clasp flips** up on its hinge (0 → 110°, 0.15 s). The lid kicks up 5°
  (outBack, 0.12 s), and a line of gold light shows along the seam: the `--gold-tint` lining lit, flat, with no bloom.
  The tres plays G4, with a brass clasp tick and a cedar-box knock.
- By 1.5 s the viewer has read the name and the place, seen a seal broken and a clasp spring, and is waiting for the lid.
- **2.133, the third stroke:** the lid **flies open**. The tres plays A4 and the brass stabs C6/9.

Why it stops the thumb: nothing else in the feed looks like a gold, lithographed cigar-box label, and it plainly wants to
be opened. Three sharp percussive events on a Cuban clave land inside 1.6 s, and the words are the product's name and
what it is.

### 8.3 Second by second

Captions ("HUD") are screen-space layers, not in 3D. They follow the camera's yaw by at most ±12 px of parallax, so they
feel placed in the scene yet are never foreshortened. Text on 3D planes (the labels) is used only when its plane faces
the camera within 20°.

| Second | Picture | Camera | Words (source in §9) | Sound |
|---|---|---|---|---|
| 0–1 | Cover-still box from above. Glint sweep 0.03–0.40. **0.533 the seal tears** | P0, slow push starts | Wordmark; cartouche "AN INDEPENDENT GUIDE TO TAMPA BAY"; medals and folio (texture) | Gulf wash; tres pickup G3 A3 B3 (0.133, 0.267, 0.400); 0.533 clave + tres E4 + paper tear |
| 1–2 | **1.333 the clasp flips**; the lid lifts 5°; gold seam light | push continues | same | 1.333 clave + tres G4 + clasp tick + box knock |
| 2–3 | **2.133 the lid flies open** (5° → 106° at 2.45, settling at 100° by 2.75). The inner label rises into view. 2.667 is bar 2 | **crane P0 → P1**, 2.133–3.10 (ease in-out): down and back until the inner label faces the camera | the outer label rotates away | 2.133 clave + tres A4 + brass stab C6/9 + lid whoosh; bass C2 held. 2.667: tumbao starts (F \| G7) |
| 3–4 | Camera settled at 3.10. **3.20 counts, pair 1 stamps in** (letterpress: scale 1.08 → 1, opacity 0 → 1 in 0.1 s); **3.733 pair 2** | P1, still | "641 PLACES", "414 PLACES TO STAY", then "176 TOURS AND TRIPS", "589 EVENTS"; the vignette and its credit | 3.2 clave + brass chip G4/C5; 3.733 clave + brass chip A4/D5; tres guajeo enters, soft |
| 4–5 | Hold on the inner label. The device edges peek over the box rim (texture) | P1, drift φ 12° → 11° | same; ribbons "SHEETS 1–6 · TAMPA BAY" / "NOT FOR NAVIGATION" (texture) | 4.8 bar 3: maracas in; C \| C |
| 5–6 | Hold | drift | same | guajeo; 5.867 bongó repique builds |
| 6–7 | **6.933 LAUNCH:** the laptop rises out of the box, turning from flat to upright and growing from 0.4× to 1.0× (0.5 s, outBack) | **P1 → P2**, 6.933–7.90: back and up | counts leave with the inner label (it stays as the backdrop) | 6.933 brass C6/9 + whoosh + tres C5; full montuno from here: bell, bongó, tumbao, guajeo |
| 7–8 | Tablet rises 7.20, phone B 7.467, phone A 7.733 (8th-note stagger). **7.10 caption sets** | P2 | HUD: **"Every entry linked to its source"** | whooshes + tres E5 (7.2), G5 (7.467), C6 (7.733) |
| 8–9 | **Tableau:** four live screens in the air, the inner label behind, the chart below | P2 orbit ψ −4° → +2° (7.9–8.53), then **→ P3**, 8.533–9.067 | same caption until 9.10 | montuno C \| F, G7 \| F |
| 9–10 | Phone A fills the frame. **9.20** swipe of the month bar; **9.60 tap "Feb"**; **9.667–10.30** fast eased scroll with motion blur, months flicking past | P3 | HUD: ribbon **"SEP 2026 – APR 2027"** + title **"What's On"** (9.10) | 9.6 tap (C6); güiro scrape following the scroll speed |
| 10–11 | Lands on Sat, Feb 20: the "80th Fiesta Day" card in view. **10.667 the star tap** fills the star; **10.73 the toast rises** | **P3 → P3b** push, 10.45–10.95 (1 css px = 2.9 output px) | the live toast **"Added to My Trip · View"**, 40 px after the push | 10.667 clave + tap + tres C6; 10.80 brass E5, 10.933 brass G5 (the toast motif) |
| 11–12 | Toast hold | P3b, still | same | 11.2 bar 6: brass riff |
| 12–13 | **12.80 tap "View"**; the trip iframe slides in from the right (12.83–13.10) | 12.90 leave for P4 | — | tap; paper slide |
| 13–14 | Tablet: the bay chart, buoys and clusters | P4 arrives 13.40 | HUD: ribbon **"1,407 ON THE CHART"** + title **"Map"** (13.45) | 13.333 bar 7; the wash swells (+4 dB) |
| 14–15 | **14.133 tap the "Where to stay" chip**; anchors join; clusters update | P4, drift | same | 14.133 clave + bongó slap; tres harmonics sprinkle 14.2–14.5 |
| 15–16 | Laptop: the Ybor City Historic District page head (Signature seal, the page's own cigar-label plate) | **→ P5**, 15.20–15.60 | HUD: ribbon "SHEET 1 · TAMPA · HISTORIC DISTRICT" (texture) + title **"Ybor City Historic District"** + dek **"…founded in 1886 as a planned cigar-making town."** (15.60) | 15.467 bar 8: **the break**, band thins to clave, bass and tres melody over a brass pad |
| 16–17 | **16.00 tap the TOC link "History and heritage"**; scroll 16.067–16.60 to `#heritage` | **P5 → P5b** push, 16.40–17.10 | same | 16.0 clave + tap; short güiro |
| 17–18 | The heritage block: BUILT 1886–1940, ERA Boomtown; the gold designation boxes (National Register; National Historic Landmark District; City of Tampa local historic district) | P5b, drift down | same | 17.6 bar 9: Dm7 \| G7 |
| 18–19 | Drift to the "Heritage sources:" line | drift | same | 18.4, 19.2: clave + soft bell as each designation passes |
| 19–20 | Phone B: Where to stay page head | **→ P6**, 19.467–19.90 | HUD: title **"Where to stay"** (19.95) + ribbon "STAY · 414 PLACES TO STAY" (texture) | 19.733 bar 10: **montuno returns** |
| 20–21 | Phone B scrolls (20.0–21.6) through "Closed for now…" and its "TEMPORARILY CLOSED" badges to the sheet sections | P6 | same | güiro follows the scroll; brass D5, C5 on the clave (the motif's answer, heard first) |
| 21–22 | Phone A, now on My Trip | **→ P7**, 21.667–22.10 | HUD: ribbon **"YOUR LIST"** + title **"My Trip"** (22.00) | 21.867 bar 11 |
| 22–23 | The trip scrolls to its list (22.267–22.867): "1 event. Saved in this browser, on this device." and the 80th Fiesta Day row | P7 | same; the live list (secondary) | tres E5–G5–C6 |
| 23–24 | Hold | P7 | same | 23.467 clave |
| 24–25 | **24.0** pull back. The devices descend: laptop 24.00, tablet 24.133, phone B 24.267, phone A 24.40, each 0.45 s, turning flat and shrinking into the box. **The lid swings shut 24.60 → 25.067** (ease-in, like gravity) | **P7 → P2** (24.0–24.6), then **→ P0** crane up (24.4–25.5) | captions clear at 24.0 | 24.533 unison hit (brass, bass, bongó) + tres **D5** |
| 25–26 | **25.067 THE LID SHUTS** (a 1.5° bounce 25.10–25.20); 25.20 the clasp flips shut; **25.60 the cartouche reprints the address** (letterpress stamp) | P0 by 25.5 | cartouche: **"fritzhand.github.io/visit-tampa-bay"** | 25.067 clave + tres **C5** + final hit C6/9 + box thunk + clasp click |
| 26–27 | **26.133** the independence line fades up under the box | P0, still | HUD: **"Independent guide. Not affiliated with any tourism office, venue or operator."** | 26.133 bar 13: soft clave, C6/9 ringing, the wash returns |
| 27–28 | Hold; 27.733 one glint sweep across the wordmark | still | same | 27.733 clave, soft |
| 28–29 | Hold | still | same | 28.8 clave, soft |
| 29–30 | Hold | still | same | 29.333 the last clave; ring-out |
| 30–30.4 | Hold (the final frame is the end card) | still | same | silent from 30.20 for a clean loop |

### 8.4 Key compositions (output px, normative)

| Key | Time | Composition |
|---|---|---|
| K0 hook / cover / end | 0.0–2.1, 25.5–30.4 | Label x 110–970, y 280–1260. The box's navy side slivers show at left and bottom (to y 1300), with the seal band and clasp centered at x 480–600, y 1180–1300. End card: the independence line at y 1300–1404, centered, 38 px, two lines |
| K1 inner label | 3.1–6.9 | Inner label x 120–960, y 250–1250 (top edge ≤ 5 % narrower), counts block y 760–1200, vignette y 360–650. Box rim and front y 1250–1560, with the gold lockup |
| K2 tableau | 7.9–8.5 | Laptop screen x 190–890, y 420–860; tablet x 40–400, y 700–1200; phone B x 690–1010, y 820–1500; phone A x 330–690, y 1000–1780. The inner label shows around them. HUD caption y 262–420 |
| K3 phone A | 9.1–10.4 | Phone A screen x 150–930, top at y 470, bottom off the frame (texture). The other devices blurred behind |
| K3b toast | 10.95–12.8 | 2.9 px per css px. The toast's text at about 40 px, box inside x 200–880, y 1150–1330. The starred card above it at y 700–1100 |
| K4 tablet | 13.4–15.2 | Tablet screen x 80–1000, y 470–1800. The chip row visible at y ~560 |
| K5 laptop head | 15.6–16.4 | Laptop screen x 40–1040 (the whole page head readable) |
| K5b heritage | 17.1–19.4 | 1.6 px per css px on the heritage column (css x 290–890 → output x 60–1020) |
| K6 / K7 phones | 19.9–21.6, 22.1–23.95 | As K3 |

HUD captions always sit at x 64–940, y 262–540. The phone and tablet tops are placed at y ≥ 470 so the caption never
covers the page head.

### 8.5 Frame-accurate cue list (the single source of timing)

`collateral/promo-2026-09/cues.mjs` exports `CUES["9x16"]` and `CUES["16x9"]` as `{ f, t, id, what }` in frames, plus
`bar(n)`, `clave(n, k)` and `ease(name)`. **The picture and the score both import it**, so they cannot drift. The Reel
entries are the times in §8.3 at `f = round(t × 30)`. Every tap, stamp and landing sits on a 16th (a multiple of
4 frames from frame 0) unless listed as "free" (the glints). The data-dependent values (scroll targets, toast position,
the heritage offset) are measured in a pre-pass and written to `.cache/promo/measure.json`. The score reads the scroll
curve from the same module, so the güiro follows the real scroll speed.

---

## 9. Every word on screen, with its source

All strings are read at render time by `must(file, selector)` (the Cincy `read()` pattern) or from `data/` and
`site.config.json`, and compared with the expected shape (§16). A mismatch stops the render.

| # | On screen (as of writing) | Where | Source | Kind |
|---|---|---|---|---|
| 1 | "TAMPA BAY" / "Chartbook" | outer label, hook and end | `assets/img/brand/brand.svg#wm` (outlines); `site.config.json` `siteName` "Tampa Bay Chartbook" | logo |
| 2 | "AN INDEPENDENT GUIDE TO TAMPA BAY" | outer label cartouche, hook and cover | `siteTagline`, the clause before the comma ("An independent guide to Tampa Bay, every entry linked to its source") | must-read |
| 3 | "SHEETS 1–6 · TAMPA BAY", "NOT FOR NAVIGATION" | label folio, inner ribbons | `index.html` `.mast-line .side` (both) | texture |
| 4 | TP SP GB CW AB DT, "SHEET 1"…"SHEET 6", Tampa · St. Petersburg · Gulf Beaches · Clearwater & North Pinellas · Around the Bay · Day Trips | medals | `data/regions.json` (order, code, number, name); badge art `brand.svg#sheet-<id>` | texture |
| 5 | "641 PLACES", "414 PLACES TO STAY", "176 TOURS AND TRIPS", "589 EVENTS" | inner label, S2 | numbers counted from `data/places.json`, `stays.json`, `experiences.json`, `events.json` (status not `cancelled` or `postponed`); labels and numbers asserted against `index.html` `.mast-dek` ("641 places, 414 places to stay, 176 tours and trips and 589 events on six sheets of Tampa Bay, each linked to the page that states it.") | must-read |
| 6 | the vignette subject's name + "PHOTO: <credit>" | inner label | `data/images.json` entry (`credit`, `license`) and the subject's `name`/`title` in `places.json`/`timeline.json` | credit |
| 7 | "Every entry linked to its source" | HUD, tableau | `siteTagline`, the clause after the comma, first letter capitalized | must-read |
| 8 | "SEP 2026 – APR 2027" + "What's On" | HUD, S4 | `whats-on.html` `.page-head .kicker` (the part after "Plan · ") and `h1` | must-read |
| 9 | "Added to My Trip" · "View" | phone A, live | the live `[data-toast]` (`site/js/core/trip-store.js` and `toast.js`) after the real click | must-read |
| 10 | "80th Fiesta Day", "SAT 20 FEB", "11:00 AM–5:00 PM", "Ybor City Historic District", "FREE", "Source: members.ybor.org" | phone A, live | `data/events.json#fiesta-day-ybor-city-2027` as rendered by `whats-on.html` | secondary |
| 11 | "1,407 ON THE CHART" + "Map" | HUD, S5 | `map.html` kicker after "Plan · " and `h1`; asserted equal to the leading number of the server-rendered `[data-map-count]` in the built `map.html` ("1,407 on the chart, 38 more without coordinates" as of writing). The live count in the tablet follows the default layers, so it is not used | must-read |
| 12 | "SHEET 1 · TAMPA · HISTORIC DISTRICT" | HUD ribbon, S6 | `places/ybor-city-historic-district.html` `.kicker` | texture |
| 13 | "Ybor City Historic District" | HUD title, S6 | the page `h1` = `places.json` `name` | must-read |
| 14 | "…founded in 1886 as a planned cigar-making town." | HUD dek, S6 | `places.json#ybor-city-historic-district.summary`, a verbatim substring, also asserted in the built page's lede | must-read |
| 15 | "Where to stay" (+ "STAY · 414 PLACES TO STAY") | HUD, S7 | `stay.html` `h1` (+ `.kicker`; 414 asserted = the `stays.json` length) | must-read (+ texture) |
| 16 | "YOUR LIST" + "My Trip" | HUD, S8 | `trip.html` kicker after "Plan · " and `h1` | must-read |
| 17 | "1 event. Saved in this browser, on this device." and the Fiesta Day row | phone A, live | the live `[data-trip-root]` | secondary |
| 18 | "fritzhand.github.io/visit-tampa-bay" | label cartouche, end | `siteBase` without "https://" and the trailing slash | must-read |
| 19 | "Independent guide. Not affiliated with any tourism office, venue or operator." | HUD, end | the site footer (`index.html` footer; `INDEPENDENCE` in `build/core/shell.mjs`), asserted exactly | must-read |
| 20 | 16:9 only: "An independent guide to Tampa Bay" | HUD, tableau | `siteTagline`, clause 1 | must-read |
| 21 | 16:9 only: "Printed like the region's own graphic art, the Ybor City cigar-box label." | HUD, laptop | `about.html` "What this is": "It is printed like the region's own graphic art, the Ybor City cigar-box label." with "It is " dropped and P capitalized | must-read |
| 22 | 16:9 only: "Showing 14 of 414 places to stay" | phone B, live | the live `[data-result-count]` after the Historic chip; 14 asserted = the count of stays whose `features` include `historic` | must-read |
| 23 | Device chrome: "9:41", "fritzhand.github.io" | devices | the stage's device drawing (the real domain) | chrome |
| — | Everything else inside the devices while they scroll | devices | the live site | texture (name guard applies) |

**Hand-made marks (the complete list):** the "·" separators; upper-casing ribbons; the leading "…" in #14 and the
capitalized first letters in #7 and #21; the word "PHOTO:" in #6; the device clock "9:41". **No sentence is written by
hand.**

---

## 10. The 16:9 cut: 1920 × 1080, 30 fps, 40.0 s (1200 frames)

The same world, story and score, on the same grid (pickup plus 18 bars, then a 1.067 s tail). What changes:

| | 9:16 Reel | 16:9 |
|---|---|---|
| Box and labels | Portrait: box 900 × 1040; label medals in 2 × 3 | Landscape: box 1500 × 860; medals in a row of six; inner label with the vignette on the left and the counts in a 2 × 2 grid on the right |
| Tableau | Stacked in depth, phones in front | Spread wide: tablet (landscape) left, laptop center-back, phone B left-front, phone A right-front |
| Camera | Mostly dolly and crane | Adds a **two-bar orbit** of the tableau (ψ −14° → +14°, 9.067–11.2) and lateral trucks between devices, so the parallax sweeps across the frame |
| Captions | HUD top band, x 64–940, y 262–540 | HUD upper left, x 120–900, y 96–330 (clear of the player bar and burned-in subtitles) |
| Extra words | — | #20 "An independent guide to Tampa Bay" (bar 4), #21 the About sentence (laptop), #22 "Showing 14 of 414 places to stay" |
| Extra taps | — | a map cluster (bar 9), the laptop's Night chart toggle (bar 12), phone B's "More features" and "Historic" (bar 13) |
| Laptop | Day chart | **Flips to the Night chart by a real tap at 24.0 s**: the gold-on-navy page is the label's palette reversed. The stage stays Day |

Bar map for 16:9 (downbeats as in §8.1):

| Bars | Time | Scene | Captions and cues |
|---|---|---|---|
| 0–1 | 0.0–2.667 | Hook, identical timing | cartouche "AN INDEPENDENT GUIDE TO TAMPA BAY" |
| 2–3 | 2.667–6.933 | Inner label, counts at 3.2 / 3.733 | counts |
| 4 | 6.933–9.067 | Launch (8th stagger) | **"An independent guide to Tampa Bay"** 7.10–9.00 |
| 5 | 9.067–11.2 | Orbit of the tableau | **"Every entry linked to its source"** 9.20–11.10 |
| 6–7 | 11.2–15.467 | Phone A: swipe 11.50, tap "Feb" 11.733, scroll 11.80–12.60, **star 13.333**, toast 13.40, push, **View 14.933**, trip slides 15.0–15.3 | "SEP 2026 – APR 2027 / What's On" 11.30–14.90; toast 13.60–14.93 |
| 8–9 | 15.467–19.733 | Tablet, landscape: **chip 16.0**, **cluster 17.6** (the map zooms on the video clock, 17.6–18.3) | "1,407 ON THE CHART / Map" 15.60–19.50 |
| 10–12 | 19.733–26.133 | Laptop: **TOC 20.267**, scroll to `#heritage`, drift; **Night chart toggle 24.0** | dek **"…founded in 1886 as a planned cigar-making town."** 19.95–22.35 (8 words, 2.4 s), with the page's own h1 legible in the laptop as secondary; then **"Printed like the region's own graphic art, the Ybor City cigar-box label."** 22.40–26.00 (12 words, 3.6 s) |
| 13–14 | 26.133–30.4 | Phone B: scroll, **"More features" 27.20**, **"Historic" 28.00**, the live count | title **"Where to stay"** 26.25–28.00 (ribbon "414 PLACES TO STAY" as texture); then the live **"Showing 14 of 414 places to stay"** 28.10–30.30 (7 words, 2.1 s) |
| 15 | 30.4–32.533 | Phone A, My Trip | "YOUR LIST / My Trip" |
| 16 | 32.533–34.667 | Descend; **the lid shuts at 33.600** (bar 16, 2 side, second stroke) | tres D5 at 33.067, C5 at 33.600 |
| 17–18, tail | 33.6–40.0 | End card, landscape label from above | address in the cartouche 34.10; independence line 34.667 (y 850–900, one line); silence from 39.8 |

---

## 11. Camera, depth and motion

**Poses (starting values, 9:16).** d comes from d = F·w/w_screen.

| Pose | Target T | d | φ | ψ | Frames it for |
|---|---|---|---|---|---|
| P0 | lid-top center (0, −240, 0) | 2093 → 2030 (push) | 78° | 6° | hook, cover, end card |
| P1 | inner-label center at θ = 100° (≈ (0, −760, −610)) | 2143 | 12° → 11° | 0° | counts |
| P2 | tableau center (0, −800, −60) | 3400 | 8° | −4° → +2° | tableau, pull-backs |
| P3 / P6 / P7 | phone screen center | 1000 (390 css → 780 px) | 2° | device yaw + 6° (the phone faces the camera within 8°) | phones |
| P3b | toast center (measured in the iframe, mapped to world) | 690 (2.9 px per css px) | 2° | as P3 | toast |
| P4 | tablet screen center | 1549 (697 world → 900 px) | 3° | device yaw + 5° | map |
| P5 / P5b | laptop screen / heritage column | 2304 / 1000 | 4° | device yaw | Ybor page |

**Tableau world positions (screen centers, 9:16).** Laptop (0, −1250, −520), screen tilted back 8°, yaw 0°, with its
keyboard deck toward +z. Tablet (−430, −860, −200), yaw +16°. Phone B (420, −760, 60), yaw −14°. Phone A (−60, −600,
360), yaw +5°. The laptop hides the top of the inner label, which peeks out around it: that layering is the depth cue.

**Moves.** Every move is an ease-in-out cubic (Cincy's `inout`) between poses, interpolating T, d, φ and ψ separately
(ψ along the short arc). Launches use outBack (overshoot 1.3); the lid shut uses ease-in cubic and a 1.5° bounce. Holds
are never dead still: the camera drifts ≤ 0.8 px per frame at the frame edges, so the scene breathes and text stays
"settled" (§17). The only hard cuts are the loop (end → cover) and the trip slide inside phone A. Every other transition
is a continuous camera move through one world, with no crossfades.

**Parallax** comes from true perspective. Every move between devices passes the others at different depths. A
near-field layer is added in the Reel: the box's front rim (with the gold lockup) stays low in frame through S3–S8 and
slides faster than the devices.

**Depth of field.** Each device plane gets `filter: blur(r)` with r = min(6, 0.004 × |z_cam(device) − z_focus|) px at 1×,
where z_focus is the device being framed. Captions and must-read text are never blurred.

**Motion blur.** When any must-read-free frame has a camera speed above 40 px per frame, or phone A's scroll exceeds
600 css px per frame, the renderer accumulates **6 sub-frames** across a 180° shutter (t + k/12 of a frame). Only the
stage and the scroll move within those sub-frames, never the site clock. They are averaged in linear light (numpy) before
downsampling. Frames with must-read text are never smeared: the text is HUD and is composited after the average.

**Gold-leaf glints.** Three only, all `--gold-leaf` masks moving across gold shapes, never across text: 0.03–0.40,
2.133 (the inner label's edge as it rises) and 27.733.

## 12. Typography and ornament (all from the design system)

- **Fonts:** Bodoni Moda (display, numerals, deks, water names), Figtree (URL, independence line, body in devices) and
  Archivo (ribbons, labels, codes), loaded from the private build's `assets/fonts`. `document.fonts.check()` for all
  three must pass before frame 0. The wordmark, sheet codes and medallion are outlined paths from `brand.svg`/`mark.svg`,
  so they need no font.
- **Caption unit** is the site's page-head recipe at poster scale:
  - the **ribbon** (DESIGN §7): `--ribbon-bg` band 72 px tall (9:16) or 60 px (16:9), Archivo 700 at 125 % width,
    40 px (9:16) or 34 px, tracking 0.2 em, `--ribbon-ink`, two `--ribbon-rule` hairlines, swallowtail tails and
    `--ribbon-fold` folds scaled ×2.4. It unfurls from its center outward in 0.18 s (clip-path), then the tails fold in;
  - the **title** in Bodoni Moda 700, 84 px (9:16) or 72 px, `--text`, on a `--surface` plate with the label frame
    (2 px `--frame-outer`, a `--frame-inner` hairline, corner stars);
  - the **dek** in Bodoni Moda italic 540, 52 px (9:16) or 44 px, `--text-muted`, balanced across at most 3 lines.
- **Counts:** Bodoni Moda 880 lining numerals, the cigar-label numeral (DESIGN §5).
- **End card:** the address in Figtree 650, 40 px, `--link`, with a 3 px `--accent` underline; the independence line in
  Figtree 450, 38 px, `--text-muted`, line-height 1.36.
- **Ornament used:** the label frame, the corner stars, the graticule neatline, water lining, ripples, the compass rose,
  the medallion, sheet badges, the seal (`--seal`), `--gold-leaf`, the cartouche. Rules kept: gold is never text on
  cream; magenta only for the address and the focus-like tap ring (`--focus`); a sheet ink only on its own badge.
- **Colors** come only from `tokens.css` custom properties, read from the built stylesheet. The one exception is the
  `DEVICE` hardware constant (graphite greys for bodies and bezels).

---

## 13. The score

### 13.1 Spec

| | |
|---|---|
| Style | Son montuno (Cuban son, for Ybor City's Cuban cigar workers), original |
| Key and meter | **C major**, 4/4, **112.5 BPM** (16th = 4 frames, bar = 2.1333 s) |
| Clave | **3-2 son clave** throughout, the hook's three strokes on bar 1 |
| Form (Reel) | pickup; b1 hook (hits); b2–3 intro (tumbao, guajeo); b4–7 **montuno** (full band); b8–9 **break** (sparse, brass pad); b10–11 montuno and brass on the clave motif; b12 **cierre** (the ending hits); b13–14 ring-out |
| Harmony (Reel) | b0 G · b1 C · b2 F \| G7 · b3 C · b4 C \| F · b5 G7 \| F · b6 C \| F · b7 G7 \| F · b8 Am \| F · b9 Dm7 \| G7 · b10 C \| F · b11 G7 \| F · b12 G7, then **C6/9 on 25.067** · b13–14 C6/9 |
| **Sonic logo** | the **clave motif**: the clave rhythm voiced E G A \| D C (C6/9 tones). Bar 1's 3 side plays E4 G4 A4 on the tres as the box opens; bar 12's 2 side plays D5 C5 as it shuts; the brass states it across bars 10–12. It loops musically into the pickup G3 A3 B3 → the E4 of 0.533 |
| Loudness | **−14 LUFS integrated, ≤ −1.0 dBTP** true peak (§13.5) |

### 13.2 Instruments (all synthesized in `collateral/lib/`, deterministic, seeded)

Port Cincy Week's `lib/synth.mjs` (the same owner's original code: biquads, envelopes, Freeverb, mix, WAV) into
`collateral/lib/synth.mjs`, and add these voices:

| Voice | Model |
|---|---|
| `clave` | Modal: partials 2350 / 5170 / 7900 Hz, amplitudes 1 / 0.35 / 0.12, decays 22 / 12 / 6 ms, a 0.5 ms attack, plus a 1 ms noise click high-passed at 3 kHz at −18 dB. Pan +0.15 |
| `tres` | **Karplus-Strong.** Each note is two strings (the tres's doubled courses): unison ±3.5 cents, or an octave pair for notes G3–C4 (the 3rd course). Delay SR/f with a first-order allpass for the fraction. Loop filter 0.5(x[n] + x[n−1]) × ρ, ρ = 0.9965 (0.95 when damped for staccato guajeo). Excitation: one period of seeded noise × a pick-position comb (β 0.13), low-passed at 2.5–7 kHz by velocity, plus a 3 ms pick transient. Body: peaking filters 200 Hz (Q 2, +4 dB) and 520 Hz (Q 3, +3 dB). Pan −0.3 |
| `bass` | Baby bass: sine + 0.3 × second harmonic + 0.1 × triangle, a pitch scoop −40 → 0 cents in 30 ms, a finger thump (a 60 Hz sine burst of 12 ms), decay 0.6 s, low-passed at 900 Hz. Center |
| `bongo` | Membrane modes f × [1, 1.59, 2.14, 2.30], decays 90 / 50 / 35 / 30 ms, pitch drops 3 % in 20 ms. Macho f ≈ 520 Hz, hembra ≈ 340 Hz. A slap adds 8 ms of noise band-passed at 2.5 kHz. Pan +0.35 |
| `bell` (cencerro) | FM: carrier 820 Hz, ratio 1.47, index 3 → 0.5 over 60 ms, a second partial at 1210 Hz, decay 150 ms. Open (mouth) and muted (neck) variants. Pan +0.5, 6 dB under the bongó |
| `maracas` | Cincy's `shaker`, 8ths, accented on the off-beats. Pan −0.45 |
| `guiro` | A ratchet: clicks at rate r(t) of 1.5 ms noise band-passed at 3.8 kHz (Q 2). Normal strokes: r 45 → 70 Hz over 0.4 s. **The scroll stroke:** r(t) = clamp(40 + 0.02·v(t), 40, 120) Hz, where v is the phone's scroll speed in css px/s from the cue module's easing. Pan −0.2 |
| `brass` | Three voices (two trumpets, one trombone): a band-limited saw (Cincy's `sawOsc`) + 0.35 × square, a low-pass sweeping 500 → 2800 Hz in 45 ms then settling at 1600 Hz, a pitch scoop −35 → 0 cents in 50 ms, 5.5 Hz vibrato of ±12 cents after 300 ms, 2 % breath noise high-passed at 3 kHz. Stabs last 150 ms. The **pad** variant has a 250 ms attack and a low-pass at 900 Hz |
| `wash` | The Gulf: two decorrelated pink-noise generators (Kellet filter, seeds L and R), low-passed at 650 Hz and high-passed at 80 Hz. Amplitude 0.35 + 0.65·wave(t), where wave rises over 60 % of a 4.267 s (two-bar) period and falls over 40 %, plus a 2.2 kHz band-passed fizz on each falling edge at −14 dB. Wide |
| Foley | `tear`: noise band-passed 1.2 → 4 kHz over 0.28 s × a crackle of 30–90 random impulses per second. `knock` (the cedar box): modes 180 / 410 / 760 Hz, decay 0.12 s. `clasp`: modes 2.9 / 4.4 / 6.7 kHz, 25 ms. `thunk`: the lid shut = C2 sine drop + `knock` + `clasp`. `whoosh` / `riser` / `tap` from Cincy, the tap tuned to C6 |

### 13.3 Arrangement, bar by bar (Reel)

**Tumbao rule.** The bass plays on 2& (16th 6) and on beat 4 (16th 12) of every bar. The 2& note is the root of the chord
at beat 3; the beat-4 note is the root of the next bar's first chord, tied over the barline (anticipated bass).

**Guajeo (original), two bars, in dyads on 8ths.**
- Bar A (C \| F): 16th 0 C4/E4, 2 G3/C4, 6 E4/G4, 8 F4/A4, 10 C4/F4, 12 A3/C4, 14 C4/F4.
- Bar B (G7 \| F): 0 B3/D4, 2 D4/G4, 4 F4/B4, 6 D4/F4, 8 C4/F4, 10 A3/C4, 12 C4/F4, 14 A3/C4.
- Damped (ρ 0.95) except the notes that fall on clave strokes. It follows the harmony when that changes.

**Martillo (bongó), per bar, 8ths.** Tip, finger, tip, finger, tip, finger, **open macho on 4**, **open hembra on 4&**;
velocities .5 .35 .5 .35 .5 .35 .9 .8. In montuno bars the bongó switches to the **bell** on quarters (mouth on 1 and 3,
neck on 2 and 4), with a slap on 4&.

| Bar(s) | Picture | Sound |
|---|---|---|
| 0 | cover | Wash fades in over 0.4 s; tres pickup G3, A3, B3 on 16ths (0.133, 0.267, 0.400) |
| 1 | tear / clasp / lid | Clave 3 side with **tres E4, G4, A4** doubled by tear, knock + clasp, and whoosh; 2.133 brass stab **C6/9** (C4 E4 A4 D5, spread), bass C2 held to bar 2 |
| 2 | counts | Tumbao begins (F \| G7). Clave 2 side, each stroke with a brass chip (G4/C5 at 3.2, A4/D5 at 3.733). Guajeo bar B, soft |
| 3 | counts hold | C \| C: guajeo bar A; maracas in; 5.867–6.933 a bongó repique on 16ths, crescendo |
| 4 | launch | **Montuno:** bell, bongó slaps, tumbao, full guajeo; brass stab C6/9 at 6.933. The four device landings are tres C5, E5, G5, C6 on the 8ths, each with a soft whoosh |
| 5 | What's On | G7 \| F. The swipe is a short güiro; the Feb tap is `tap`; **the scroll is the long güiro, following the speed**; 10.667 star is tap + tres C6; 10.80 / 10.933 brass E5 → G5 (the toast motif) |
| 6 | toast, View | C \| F. Brass riff (original): 8ths G5 E5 G5 A5 \| G5 E5 D5 C5 in two-part thirds; 12.8 tap; paper slide |
| 7 | Map | G7 \| F. The wash swells +4 dB for the bar; 14.133 chip tap is a bongó slap; 14.2–14.5 six tres harmonics (C major pentatonic, octave 6) as the clusters re-form |
| 8–9 | Ybor (**the break**) | Bell and maracas drop; clave, bass (half notes) and bongó tips only; the tres plays a slow descending line (A4 G4 E4 \| F4 E4 C4 \| D4 E4 F4 \| G4 … B3); the brass **pad** voices Am \| F \| Dm7 \| G7. 16.0 TOC tap; 18.4 and 19.2 soft bells as the designations pass |
| 10–11 | Where to stay, My Trip | **Montuno returns** with the bell. The brass states the **clave motif** across three bars: b10 (2 side) D5, C5 on its two strokes, heard first as an answer; b11 (3 side) E5, G5, A5 on its three strokes; its final D5 C5 is left for the lid in b12. Güiro follows phone B's scroll; b11 tres E5–G5–C6 as the trip list shows |
| 12 | **cierre**, the lid shuts | 24.0 the band stops except the clave; descending tres plucks C6, G5, E5, C5 as the devices sink (24.00/.133/.267/.40); **24.533 unison hit** on G7 (brass, bass G1+G2, bongó slap) with tres and brass **D5**; **25.067 final hit C6/9** with tres and brass **C5** + `thunk`: the motif ends as the lid shuts |
| 13–14 | end card | The tres arpeggiates C6/9 (C3 G3 E4 A4 D5) at 25.20 and lets it ring; the brass pad C6/9 ppp to 28.8 with a 1.2 s release; the clave keeps the pattern pp to 29.333; the wash returns and falls. Silent 30.20–30.40 |

**16:9 arrangement.** The same material on the same grid. The tableau adds a second montuno bar (b5) with the brass on
the clave motif. The laptop break runs three bars (b10–12: Am \| F \| Dm7 \| G7 \| Em7 \| G7), and **the Night chart
toggle at 24.0 lands on the pad's turn to Em7**; b12's G7 leads back to C for phone B's montuno. Phone B (b13–14) is montuno with the "More features" and "Historic" taps as
bongó slaps. The cierre falls on b16 (D5 at 33.067, C5 + the final hit at 33.600). The ring-out runs to 39.8.

### 13.4 Written to picture

Every event in §8.3 and §10 comes from `cues.mjs`. The score renderer places notes at `cue.t` exactly, so each stamp,
tap, landing and the lid are hit on a 16th. The only continuous coupling is the güiro, driven by the real scroll speed
curve measured in the pre-pass. Sound effects are pitched in C and share the music's room, sitting 6–10 dB under the
bed. There are no risers longer than 0.5 s and no cymbals, and nothing harsh above 8 kHz.

### 13.5 Mix and loudness

- Buses: `perc` (clave, bongó, bell, maracas, güiro), `tres`, `bass`, `brass`, `wash`, `foley`.
- One shared room: Freeverb, size 0.55, damp 0.45, 12 ms predelay, "a salon, not a hall". Sends: brass 0.25, tres 0.18,
  perc 0.12, foley 0.10, wash dry.
- The wash ducks 3 dB under brass stabs.
- Master: 30 Hz high-pass, Cincy's 2:1 bus compressor over −16 dBFS, soft ceiling.
- **Two-pass loudnorm:** pass 1 measures, pass 2 applies `loudnorm=I=-14:TP=-1.5:LRA=9:measured_I=…:linear=true`.
  Encode AAC 192 kb/s at 48 kHz.
- **Post-encode QC** on the final MP4: `ebur128=peak=true`. Fail unless integrated loudness is −14.0 ± 0.5 LUFS and true
  peak is ≤ −1.0 dBTP.

## 14. It reads with the sound off

Every beat of the story has a visible carrier:

- the tear, the clasp and the lid are big motions;
- the counts are printed;
- each device's purpose is its caption (the page's own kicker and h1);
- each tap shows a ripple, and its result shows on the page: the star fills, the site's toast appears, the chip presses
  and anchors appear, the page jumps to the heritage block, the list shows the starred festival;
- the end card prints the address and the independence line.

The score adds swing and punctuation but carries no information.

## 15. Images and credits

### 15.1 The vignette (the one prominent image)

The renderer reads `data/images.json` once at start. It picks the **first** candidate in this chain that has a manifest
entry, a file in the private build, a license of **public-domain, cc0 or us-gov** (the image is duotoned, an adaptation,
so share-alike and attribution-required licenses are excluded here), and enough pixels: the `-lg` file if present,
upscaled no more than 2.0× at DPR 2.

1. `t/ybor-city-first-cigars-1886`
2. `p/ybor-factory-building`
3. `t/ybor-city-annexed-1887`
4. `p/ybor-city-historic-district`
5. `t/cigar-strike-1931`
6. `p/centro-asturiano-de-tampa`

Businesses (restaurants, bars, shops) are left out on purpose. As of writing only #6 is processed (Florida Memory /
Wikimedia Commons, public domain, 480 px). If none qualifies, the oval holds the compass rose and no credit shows.

- **Duotone:** luminance mapped from `--text` (navy) to `--surface` (cream). The values are read from `tokens.css` at
  runtime and written into an SVG `feComponentTransfer`, never typed as literals.
- **On-screen credit:** "PHOTO: <credit>" (24 px Archivo caps) under the subject's name, for as long as the vignette is
  visible.

### 15.2 Images inside the devices

Any record photo a page shows carries the page's own credit line (for example "Florida Memory / Wikimedia Commons (public
domain) · Image page"). If a device ever frames a record photo over 25 % of the output area, the page's credit line must
be in view on those frames, or the render fails.

### 15.3 README credits

The README credit block is generated from the data:

- every `images.json` entry that appears in any frame (vignette or device), with creator, license and page URL;
- the basemap: "Basemap: US Census Bureau TIGER/Line (public domain). Place coordinates include data © OpenStreetMap
  contributors, ODbL (https://www.openstreetmap.org/copyright)", verbatim from SPEC §7;
- the fonts: Bodoni Moda, Figtree and Archivo, SIL OFL 1.1;
- the score: original, computed by `collateral/lib/`.

## 16. Render architecture

### 16.1 Files, all under `collateral/`

```
collateral/build-promo.mjs            entry: node collateral/build-promo.mjs [9x16|16x9|both] [stills 9x16 0.4,3.5,…] [audio]
collateral/lib/stage3d.mjs            camera, project(), device drawings, HUD captions, ripple, audits (§17)
collateral/lib/synth.mjs              ported from Cincy Week + the voices in §13.2
collateral/lib/son-score.mjs          the arrangement in §13.3 (both cuts), from cues.mjs
collateral/lib/review-tools.mjs       contact sheets (ported)
collateral/promo-2026-09/cues.mjs     the cue sheets (the single source of timing)
collateral/promo-2026-09/README.md    credits, sources, the words table, posting notes, rebuild
collateral/promo-2026-09/share-copy.txt
collateral/promo-2026-09/chartbook-promo-9x16.mp4   cover-9x16.jpg
collateral/promo-2026-09/chartbook-promo-16x9.mp4   cover-16x9.jpg   thumb-16x9.jpg (1280 × 720)
collateral/tests/stage3d.test.mjs     project() vs getBoundingClientRect under six poses
```

Work files go only in `.cache/promo/`: frames, measure.json, the basemap raster, WAVs and audit.txt.

### 16.2 Pipeline

1. Hash `data/*.json`, then build: `TBC_OUT=.cache/out-promo node build.mjs`. Stop on failure. Re-hash `data/`; if it
   changed during the build (the lanes are working in parallel), rebuild once, and stop if it changes again.
2. **Reads and assertions** (§16.3). Any failure stops the render with a message naming the file and selector.
3. Serve `.cache/out-promo` on P0 (stage) and P1–P4 (devices), under `/visit-tampa-bay/` as `scripts/serve.mjs` does.
4. Launch Chromium (`NODE_PATH=/opt/node22/lib/node_modules`, `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`). Install and
   pause the clock (§7.1). Load the stage, then the five iframes. Wait for `load`, `document.fonts.ready` and 20 clock
   ticks of 100 ms.
5. **Pre-pass** (never rendered): measure scroll targets (the Feb 20 card's top, `#heritage`, the heritage-sources line,
   the trip list, the stay sections), the toast box, the chip and link centers, and the live counts. Write
   `measure.json`. Reload the iframes to reset state.
6. **Frames:** for i in 0…N−1, set t = i/30. Apply the cue actions due at frame i (clicks, scrolls, iframe swaps), call
   `render(t)`, run the audit, screenshot at DPR 2 (sub-frames when motion blur applies), and advance the clock one
   frame.
7. Downsample to 1× (Lanczos), bake the cover into frame 0, and encode H.264 High, CRF 17, yuv420p, `+faststart`.
8. Render the score WAV from `cues.mjs` + `son-score.mjs`, run two-pass loudnorm, mux, and QC loudness (§13.5).
9. Write the covers, `audit.txt`, and the README's generated blocks (credits and the words table with the values read).

### 16.3 Render-time reads and assertions (fail on any mismatch)

- `site.config.json`: `siteName` = "Tampa Bay Chartbook"; `siteTagline` matches
  `^(An independent guide to Tampa Bay), (every entry linked to its source)$`; `siteBase` is https.
- **Counts:**
  - places, stays and experiences are the three files' record counts;
  - live events are those whose `status` is not `cancelled` or `postponed` (the site's `e.live`);
  - all four must equal the numbers in `index.html` `.mast-dek`, matched by
    `^(\d+) places, (\d+) places to stay, (\d+) tours and trips and (\d+) events on six sheets`;
  - `stay.html` kicker `(\d+) places to stay` = the stays count;
  - `whats-on.html` lede `^(\d+) events on (\d+) days` = the live-events count (the days number is not shown in the Reel);
  - `map.html` kicker `([\d,]+) on the chart` = the leading number of the built page's server-rendered
    `[data-map-count]`. Both are the site's computations from `data/` in the render-time build.
- `data/regions.json`: six regions with ids `tampa stpete beaches clearwater around daytrips` and codes
  `TP SP GB CW AB DT`, in that order.
- `data/events.json#fiesta-day-ybor-city-2027`: `date` 2027-02-20, `start` 11:00, `end` 17:00,
  `place` ybor-city-historic-district, `is_free` true, `status` scheduled. The card must render with a star button. If
  the event moves, is cancelled, changed or tentative, **stop**, and print the live, free, timed events in
  `ybor-city` between Oct 2026 and Apr 2027 as candidates. Never keep stale copy.
- `data/places.json#ybor-city-historic-district`: `status` open; `heritage` present; `summary` contains
  "founded in 1886 as a planned cigar-making town"; the built page has `#heritage`, a TOC link to it and an `h1` equal to
  `name`.
- Kickers and h1s of `whats-on.html`, `map.html`, `stay.html` and `trip.html` read, and their shapes asserted
  (`^Plan · (.+)$` and so on).
- `about.html` contains "It is printed like the region's own graphic art, the Ybor City cigar-box label." (16:9).
- The footer independence line equals "Independent guide. Not affiliated with any tourism office, venue or operator."
- Live checks:
  - the toast reads "Added to My Trip" + "View";
  - the trip iframe on P1 reads "1 event." and lists exactly `fiesta-day-ybor-city-2027`;
  - P2–P4 have no `tbc-trip`;
  - the map chip `stays` is `aria-pressed="true"` after its tap;
  - 16:9: `[data-result-count]` reads "Showing 14 of 414 places to stay", 14 = the count of stays with the `historic`
    feature;
  - 16:9: the laptop's `html[data-theme]` = dark after the toggle.
- Image manifest: the chosen vignette entry has `credit` and `license`, and its file exists.
- Word filter over every HUD and label string: fail on `best|#1|ultimate|official|award|voted|world-class|EST\.|Visit Tampa|Visit St`.

## 17. The per-frame audit (3D-aware), and the risks it covers

Every must-read element carries `data-read="<words>"` and `data-plane="<id>"` (hud, label-top, label-inner). Each frame
the stage reports, per element:

- its projected box (`getBoundingClientRect` on the leaf, cross-checked with `project()`);
- the **projected cap height** (the font's cap-height ratio × the projected line height);
- the **plane angle** between the element's normal and the view ray, from the analytic poses;
- its **speed** (the change in box center and size from the previous frame);
- its effective opacity (the product of the ancestors' opacity).

An element is **settled** when all of these hold: opacity 1; speed ≤ 2 px per frame and ≤ 0.4 % scale change per frame;
plane angle ≤ 20°; cap height ≥ 26 px (9:16) or ≥ 22 px (16:9); and it is not `data-busy`. The report requires, for each
line, settled time ≥ max(floor, 0.3 s × words), with a floor of 0.8 s for 1–3 words and 1.2 s otherwise. A clock time
counts as 2 words, "–" and "·" as none, the address as 3. The report also checks the **in-order scene load** (every
scene's must-read lines, read one after another, finish before the scene ends) and the **safe zone** (the box inside
the §18 rectangle on every settled frame).

### 17.1 Reading-time table (Reel; the audit must reproduce it)

| Line | Words | Settled | For | Needs |
|---|---|---|---|---|
| Wordmark (logo) | 2 | 0.03–2.13 | 2.10 | 0.8 |
| "AN INDEPENDENT GUIDE TO TAMPA BAY" | 6 | 0.03–1.33, 1.45–2.13 | 1.98 | 1.8 |
| Counts pair 1 | 6 | 3.30–6.93 | 3.63 | 1.8 |
| Counts pair 2 | 6 | 3.83–6.93 | 3.10 | 1.8 |
| (S2 in order: 3.30 → 5.10 → 6.90 ≤ 6.93) | | | | |
| "Every entry linked to its source" | 6 | 7.25–9.10 | 1.85 | 1.8 |
| "SEP 2026 – APR 2027 / What's On" | 6 | 9.25–13.20 | 3.95 | 1.8 |
| Toast "Added to My Trip · View" | 5 | 10.95–12.80 | 1.85 | 1.5 |
| (S4 in order: 9.25 → 11.05 → 12.55 ≤ 12.80) | | | | |
| "1,407 ON THE CHART / Map" | 5 | 13.45–15.30 | 1.85 | 1.5 |
| "Ybor City Historic District" + "…founded in 1886 as a planned cigar-making town." | 12 | 15.75–19.45 | 3.70 | 3.6 |
| "Where to stay" | 3 | 19.95–21.65 | 1.70 | 0.9 |
| "YOUR LIST / My Trip" | 4 | 22.05–23.95 | 1.90 | 1.2 |
| "fritzhand.github.io/visit-tampa-bay" | 3 | 25.75–30.40 | 4.65 | 0.9 |
| Independence line | 11 | 26.35–30.40 | 4.05 | 3.3 |
| (End in order: 25.75 → 26.65 → 29.95 ≤ 30.40) | | | | |

The tightest lines are the Ybor pair (0.10 s spare) and the tableau caption (0.05 s spare). If either fails after tuning,
**do not speed up the camera**. Move the P5 arrival 0.1 s earlier, or make the Ybor h1 secondary (the laptop page shows
it anyway).

### 17.2 Risks and checks

| Risk | Consequence | Check (fails the render unless noted) |
|---|---|---|
| Data changes while the lanes work (counts, Fiesta Day, Ybor summary, kickers) | stale or false copy | §16.3 reads and assertions; `data/` hashed before and after the build |
| A page's markup changes (selectors) | taps miss, reads fail silently | every selector asserted to exist and be visible before the frames; each click verified by its effect (star `aria-pressed`, toast text, chip pressed, the `#heritage` hash, theme) |
| Implied cross-device sync | a false feature claim | one origin per device; the storage assertions in §7.1 |
| Tourism-office or team names legible, as if ours | a brand rule broken | **Name guard.** Walk the text nodes in each iframe's viewport, map them through the device's projection, and fail if `Visit Tampa Bay`, `Visit St. Pete`, `visittampabay`, `visitstpeteclearwater`, `Visit Florida` or a pro-team name (Buccaneers, Lightning, Rays, Rowdies, Yankees, Phillies, Blue Jays, Pirates, Maple Leafs, Capitals, Orioles and the other names in the events data's sports titles) has cap height ≥ 14 px, is settled and is visible for ≥ 0.3 s. Scrolls may pass them as blur. Pick scroll resting points that avoid them (Feb 20's resting frame shows Localtopia above and Dinosaur Jr. below as of writing) |
| 3D text too small, too slanted or moving | unreadable | the §17 audit (cap height, plane angle, speed, reading time, in-order load) |
| Blurry iframes under 3D (Chromium rasterizes, then transforms) | soft text | DPR 2 capture plus downsample. A **sharpness check** compares the Laplacian variance of each must-read box that sits on a device (the toast) with a flat 2D render of the same element at the same size, and fails below 0.6×. Never `will-change: transform` on devices (it freezes the raster scale) |
| Chromium flattens 3D (overflow, opacity, filter on an ancestor) | devices pop flat | the `stage3d.test.mjs` probes; a runtime check that every device's `getBoundingClientRect` matches `project()` of its four corners within 2 px |
| Fast scroll strobing | noise instead of motion | 6-sub-frame motion blur (§11); the scroll's peak speed capped at 5,000 css px per frame after blur |
| The site's own reduced-motion 10 µs transitions never finishing on a frozen clock (Cincy's lesson) | stuck states | `#stage * { transition: none !important; animation: none !important }` on the stage only; the stage drives the toast rise (opacity 0 → 1, translateY 12 → 0 css px over 0.2 s) and removes its inline style afterward |
| Toast auto-dismiss (3.2 s) before it is read | the proof is lost | the timing (star 10.667, View tap 12.8, dismissal would fall at 13.87); assert the toast is present at 12.79 |
| Non-deterministic frames | flicker between renders | render frames 0, 300, 450, 700 and 900 twice and compare SHA-256; fail on any difference |
| Image rights | a takedown | the license filter in §15.1; credits generated; the photo-area rule in §15.2 |
| Gold hairlines or graticule ticks shimmering after platform re-encoding | moiré | hairlines ≥ 2 px and ticks ≥ 3 px at output; a preview re-encode at CRF 28 checked by eye (not automated) |
| Loudness drift after AAC | a platform turns it down, or it clips | post-encode QC in §13.5 |
| Reading "Cigar" as tobacco promotion if boosted as an ad | an ad review flags it | no cigars or smoking on screen; organic posting is fine; note in the README that paid boosting may need review (not automated) |
| Right-edge and bottom UI covering text | lost words | the safe-zone audit (§18) |
| The label's resemblance to a real cigar brand | trade dress | the label is only site parts (name, medallion, sheet badges); no brand, no year, no medals; a manual check listed in the README |

## 18. Safe areas

- **Reel (1080 × 1920).** Must-read text sits inside **x 64–940, y 250–1440** on every settled frame.
  - Instagram covers the top ~220 px, the bottom ~420 px and a button column at the right from about y 1000.
  - TikTok covers the top ~160 px, the bottom ~480 px and a column right of x ~940.
  - Texture may cross the edges: device bodies, the tabletop, the box's front rim.
  - Nothing to read ever sits right of x 940 below y 1000.
- **16:9 (1920 × 1080).** Must-read text sits inside **x 120–1800, y 72–940**. That is the title-safe 90 %, clear of the
  YouTube and LinkedIn player bar and burned-in captions at the bottom.

## 19. Cover frames

- **Reel: the frame at t = 0.47 s** (frame 14), saved as `cover-9x16.jpg` and baked in as frame 0 (brag's rule, as
  Cincy did). The glint has passed and the seal is still whole.
  - It shows the whole closed box from above: TAMPA BAY / Chartbook with the medallion and roses, the six sheet medals
    with their names, the cartouche "AN INDEPENDENT GUIDE TO TAMPA BAY", the gold seal and clasp.
  - All of it lies in y 280–1300, so it survives the profile grid's center 3:4 crop (y 240–1680).
  - At grid size the wordmark is still about 70 px wide per letter group.
- **16:9: the frame at 0.47 s**, saved as `cover-16x9.jpg` (1920 × 1080) and `thumb-16x9.jpg` (1280 × 720, YouTube).
- **The loop.** The final frame is the same box, from the same pose (P0), with the address in the cartouche and the
  independence line under it. The cut back to frame 0 swaps only the cartouche text and removes the line: a one-frame
  reset.

## 20. Share copy (draft; numbers filled at render)

> Tampa Bay Chartbook is an independent guide to Tampa Bay: {641} places, {414} places to stay, {176} tours and trips and
> {589} events from Sep 28, 2026 to Apr 30, 2027, on six sheets from Tampa to the Gulf beaches, each linked to the page
> that states it. It is printed like the region's own graphic art, the Ybor City cigar-box label.
> fritzhand.github.io/visit-tampa-bay

- Put the address in the bio; Reels captions don't link.
- Avoid tags that imply affiliation (#VisitTampaBay, team tags). Neutral place tags (#TampaBay #StPete #YborCity) are
  fine.
- The soundtrack is original, so it can stay. To use a platform library track instead, lower the original audio in the
  app.

## 21. Facts as of writing (Sep 27, 2026; all recomputed at render)

- **Counts:** places 641; stays 414 (open 405, temporarily closed 6, opening soon 3); experiences 176; events 590 records,
  589 live (1 cancelled); 188 event days; What's On says "60 are free; 44 are signature events"; series 106; timeline 135.
  "1,407 on the chart". "Showing 14 of 414 places to stay" with the Historic feature.
- **Fiesta Day:** `fiesta-day-ybor-city-2027`, "80th Fiesta Day", Sat, Feb 20, 2027, 11:00 AM–5:00 PM, Ybor City Historic
  District, free, source members.ybor.org. It is the second card of Sat, Feb 20 on What's On, after Localtopia, at about
  y 129,000 css on a 390 px phone.
- **Ybor page:** `places/ybor-city-historic-district.html`.
  - Kicker "Sheet 1 · Tampa · Historic district", h1 "Ybor City Historic District", the Signature seal.
  - Its image slot shows the site's typographic plate: no photo is processed yet, though `media.json` holds three.
  - Heritage block: built 1886–1940, era Boomtown; National Register #74000641 (1974), National Historic Landmark District
    #74000641 (1990), City of Tampa local historic district (1975).
  - Page source line: "Source: nps.gov · Checked Sep 27, 2026".
- **Trip after the star:** "1 event. Saved in this browser, on this device." The toast is "Added to My Trip" + "View".
- **Images:** 21 manifest entries processed of 338 media records (processing was interrupted). The vignette resolves to
  `p/centro-asturiano-de-tampa` today.
- **Prototype (Sep 27, `.cache` only):**
  - two live iframes (What's On and the Ybor page) inside a CSS 3D scene rendered correctly and sharply at DPR 2 in
    headless Chromium, at about 0.43 s per frame;
  - the star → toast → trip flow worked on the installed clock;
  - same-origin iframes shared `tbc-trip` (hence §7.1).
- **Render estimate:** about 0.7 s per frame with four live iframes at DPR 2, so about 11 min for the Reel's 912 frames
  and 15 min for the 16:9's 1,200, plus sub-frames on about 60 fast frames per cut.
