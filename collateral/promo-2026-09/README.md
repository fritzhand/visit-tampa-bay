# Sunrise to Lighted Boats: the Tampa Bay Chartbook promo, September 2026

Two cuts of one idea, made by [`../build-promo.mjs`](../build-promo.mjs) from the real site and its data, with an
original score computed note by note. There is no 4:5 cut.

| File | What | Use it for |
|---|---|---|
| `tampa-bay-chartbook-promo-9x16.mp4` | 1080×1920, 30 fps, 30.5 s (915 frames), H.264 High + AAC 256 kb/s 48 kHz stereo, 22.0 MB | Instagram Reels, TikTok, YouTube Shorts, Stories, LinkedIn video |
| `tampa-bay-chartbook-promo-16x9.mp4` | 1920×1080, 30 fps, 41.5 s (1,245 frames), H.264 High + AAC 256 kb/s 48 kHz stereo, 27.0 MB | YouTube, LinkedIn, the site's own pages, presentations |
| `cover-9x16.jpg` | the Reel's frame at 1.233 s (Night: the wordmark, the tagline, the engraved bay) | the Reel cover (upload it; frame 0 is the film's own first frame) |
| `poster-16x9.jpg`, `thumb-1280x720.jpg` | the 16:9 frame at 3.467 s: the wordmark, the tagline, the six sheets named, their badges on the Day chart | the YouTube thumbnail (upload it), a poster |
| `promo-9x16.srt`, `promo-16x9.srt` | captions: every must-read line at its time, and the score | upload with the video |
| `share-copy.txt` | Instagram, LinkedIn and YouTube copy (with chapters) | the posts |
| `plan.md`, `concepts/` | the plan of record and the three concepts it was chosen from | editing it |

## The idea

The site calls itself a chartbook and names its two editions for the time of day: the Day chart and the Night chart.
Its What's On speaks in words that only mean something at a given minute ("Today", "In 23 min", "Started"). So the
film does not describe the site: it runs one real day through it, and the clock is the camera's engine.

One Saturday, December 19, 2026, on a phone lying on the site's own chart of Tampa Bay. The coast
engraves itself in gold and the chart turns onto north as the rose lands; the sun comes up across the bay at the computed sunrise
(7:16 AM at Fort De Soto Park) and the site switches to its Day chart; the six sheet badges stamp onto the chart. A star at
Fort De Soto Park (a county park). At Ybor City Historic District (a National Historic Landmark district) the claim "Every entry links to its source." and then
its proof, the page's own "Source: nps.gov · Checked Sep 27, 2026". At sunset (5:38 PM at the Riverwalk) the device
goes dark and the site follows; the Tampa Riverwalk Holiday Lighted Boat Parade card counts "In 23 min" down to
"Started", and never "Now", because no end time is published. The day leaves as one link. The 16:9 cut adds a laptop:
the camera docks onto the map page's own chart at sunset, a real click on the map, the Ybor timeline, and the shared
link opened in a second browser ("Add 3 to my trip").

No commercial operator is featured: the stops are a county park, an NPS-sourced historic district and a public parade.
Operator and venue names appear only inside the site's own listings.

## Scenes

**9:16 Reel (30.5 s)**

| Time | Scene | On screen |
|---|---|---|
| 0.0–4.6 | Hook | the night bay engraving itself and turning 6° onto north from frame 0, under a slow push; the wordmark and "An independent guide to Tampa Bay, every entry linked to its source", whole from frame 0; sunrise at 1.5 s; the six sheet badges land and a legend names them |
| 4.6–7.5 | Fort De Soto Park, 7:16 AM | "One Saturday on the bay."; a real star tap; the site's toast "Added to My Trip · View" |
| 7.5–9.25 | The crossing | a low flight across the bay; the chronometer rolls to 12:30 PM, the claves strike the hours |
| 9.25–13.5 | Ybor City Historic District, 12:30 PM | "Every entry links to its source.", a star (the camera pushes in on the page head: the name, the lede, "In My Trip"), a whip scroll (motion-blurred) to the page's source line |
| 13.5–15.5 | Golden hour | the flight to the Riverwalk with the phone standing in frame, the chart warming to gold; What's On pushes in, from its day head down; from 15.0 s the dusk sweeps across the chart |
| 15.5–16.3 | Sunset, 5:38 PM | the device goes dark; "Auto dark mode at sunset · The guide follows the device" |
| 16.3–22.9 | The parade | "Tampa Riverwalk Holiday Lighted Boat Parade"; "In 23 min" holds 1.2 s, then the minutes tick down to "Started" at 21.5 s; "“Started”, never “Now”" |
| 22.9–25.5 | One link | a cut to My Trip on the dock tap; "Link copied"; "One day, one link." and the link on two lines |
| 25.5–30.5 | The night bay and the end card | the course through the three stops, every point on the chart, the counts; the address and the independence line on a panel over the chart's empty north |

**16:9 (41.5 s)**

| Time | Scene | On screen |
|---|---|---|
| 0.0–4.6 | Hook | as the Reel, in a left column |
| 4.6–7.5 | Fort De Soto Park | the star; the day rule; Row E "Source: pinellas.gov · Checked Sep 27, 2026" |
| 7.5–9.5 | The crossing | the low flight; the hours on the claves |
| 9.5–15.5 | Ybor City Historic District | "Founded in 1886 as a planned cigar-making town."; the timeline rolls year by year: eight entries land and hold, each on its own tres note, the rest pass in the whip down to the proof |
| 15.5–19.5 | Golden hour | the flight down onto the bay chart, the phone standing in frame; the map's kicker and lede at 17.5 s; the dock match: the map page's own chart crossfades in over the stage chart inside its frame, then an opaque iris opens onto the laptop as the camera pulls back 5% |
| 19.5–24.1 | The bay chart at sunset | the dusk sweeps across the whole frame (21.0–21.5 s), then the devices and the column flip; a real click on the map |
| 24.1–30.85 | The parade | "In 23 min" holds 1.2 s, then the countdown to "Started" at 29.5 s |
| 30.85–37.5 | One link, two browsers | "Link copied"; the link opens on a second browser: "A shared trip", "Add 3 to my trip", "Added 3 items to My Trip" |
| 37.5–41.5 | The end card | the laptop slides away (never fades); the counts, "Every entry links to its source.", "Printed like the region's own graphic art, the Ybor City cigar-box label." and the attribution in the left column; the whole chart above the address and the independence line |

## Where every word comes from

Every count is computed from `data/*.json` at render time (through the build's own loader) and checked against the
built home page's dek and meta description. Every sentence about the site is read from the private build of the current
tree, and the render stops if a read no longer matches:

| On screen | Read from |
|---|---|
| The wordmark, "Tampa Bay Chartbook" (its "TAMPA BAY" eyebrow set apart and 1.8× larger in the hook) | the site's brand sprite (two crops of its wordmark symbol); `site.config.json` `siteName` |
| The sheet legend ("Tampa", "St. Petersburg", "Gulf Beaches", "Clearwater & North Pinellas", "Around the Bay", "Day Trips") | `build/nav.mjs` `REGION_PAGES` (the sidebar's sheet names); the codes on the badges are the site's own badge symbols |
| "An independent guide to Tampa Bay, every entry linked to its source" | `site.config.json` `siteTagline`, split at its comma |
| "NOT FOR NAVIGATION" (the hook's and end cards' ribbon) | the home masthead line (its right side) |
| The day rule's "6:00 AM", "12:00 PM", "6:00 PM" (16:9) | the site's own `fmtTime` |
| Row E (16:9): "Source: pinellas.gov · Checked Sep 27, 2026", "Source: nps.gov · Checked Sep 27, 2026", "Source: thetampariverwalk.com" | each stop page's or card's own source line, live |
| The clock line, the chronometer, "SAT, DEC 19" | the site's own time formatters (`site/js/lib/time.js`) on the installed clock |
| The ribbons ("SHEET 3 · GULF BEACHES · PARK" …) | each page's own kicker, live; the parade's is the card's kind |
| "Founded in 1886 as a planned cigar-making town." (16:9) | Ybor City Historic District's lede |
| "Everything in this guide that has coordinates, on one chart.", "PLAN · 1,407 ON THE CHART" (16:9) | the map page's lede and kicker |
| "Tampa Riverwalk Holiday Lighted Boat Parade", "In 23 min" … "Started", "END TIME NOT LISTED" | the What's On card, live, in the same frame |
| "“Started”, never “Now”" | the About page's "What the sources don't say" table |
| "Every entry links to its source." | the site footer |
| "Source: nps.gov · Checked Sep 27, 2026" | the Ybor page's source line, live in the phone |
| The typed link | the clipboard after the real "Share my trip" tap, with its host rewritten to the published address |
| "Added 3 items to My Trip" (16:9) | the site's toast on the second browser, live |
| 641 · 414 · 589, "places", "places to stay", "events" | `data/*.json`; the nouns and their order from the home page's meta description |
| "Printed like the region's own graphic art, the Ybor City cigar-box label." (16:9) | the About page ("It is printed like …") |
| fritzhand.github.io/visit-tampa-bay | `site.config.json` `siteBase` |
| "Independent guide. Not affiliated with any tourism office, venue or operator." | the site footer |
| The map attribution | the map page's attribution line |

Written by hand, and nothing else:

1. "One Saturday on the bay." (the story's kicker).
2. "AUTO DARK MODE AT SUNSET · THE GUIDE FOLLOWS THE DEVICE" (the honesty footnote on the edition flip: the devices are set to automatic
   appearance, and the site follows the system setting until a reader picks an edition; the render asserts nothing was
   stored).
3. "One day, one link." (the punchline).

Marks only: the middots between counts, capitals for labels, the first-letter capitals of the two excerpts, the
dropped "It is " of the About line, the arrowhead of the course arc, the line break in the typed link, and device chrome.
On the stage's copy of the chart only (the site's own map is untouched): the TP and CW sheet badges are nudged off their
town labels, "ST. PETERSBURG" moves north-west onto the peninsula's open land (off the downtown dots and the course line on
the end cards), "Tampa Bay" and "Clearwater" are moved a few units and "Boca Ciega Bay" is hidden, because the site's label
placement collides at the stage's hero scale.

The captions (`.srt`) repeat the on-screen words; their one addition is the score's description in brackets.

## The clock, the day and the real taps

Plan A: Saturday, December 19, 2026. The browser's clock is installed and paused, and advanced frame by
frame along a curve W(t) (real time, ×3, and time-lapses whose hour crossings land on eighth notes). Sunrise and sunset are
computed with NOAA's solar equations from the records' own coordinates and cross-checked with a second method
(7:16 AM at Fort De Soto Park, 5:38 PM at Tampa Riverwalk). The editions flip by the system appearance
(`emulateMedia`), never by a URL parameter; the site's own listener switches every device in the same frame.
The stars, the share and (16:9) the map click and "Add 3 to my trip" are real clicks on the site's own elements; the toasts
are the site's own, timed by its own 3.2 s timer on the video's clock. The parade card reads "In 23 min" at the anchor
frame, "In 1 min" on the frame before 6:15:00 PM and "Started" from 6:15:00.000 PM, never "Now": the audit checks each frame.
The fallback day (Plan B: Sat, Dec 12, the Clearwater Holiday Lighted Boat Parade) is one flag away: `--day B`.

## Sound

An original score, computed note by note in [`../lib/synth.mjs`](../lib/synth.mjs) and
[`../lib/promo-score.mjs`](../lib/promo-score.mjs): no samples, no licensed audio, and all noise from a seeded
generator, so it renders the same every time. A son montuno at 120 BPM in son clave 3-2: a Karplus-Strong tres guajeo,
a tumbao bass, claves, bongó, maracas and güiro, a brass section, a celesta and a ship's bell, over the sea (the river
at night). The night pickup is in F; sunrise lifts it a major third to A; sunset brings it back to F; the end resolves on
F6/9, so the loop is musical. Written to the picture: six plucks as the six sheets land, the claves strike the hours as
the chronometer rolls, the güiro follows the scroll, a wood stamp lands the proof, the celesta climbs one note per minute
of the countdown, the ship's bell rings at sunrise, sunset, "Started" and the end, and the clave's 3-side and 2-side sign off.

Measured on the decoded AAC of each MP4 (ffmpeg ebur128): Reel -14.1 LUFS integrated, true peak -1.4 dBTP, LRA 3.7 LU; 16:9 -14.1 LUFS integrated, true peak -1.2 dBTP, LRA 5.2 LU. Targets:
−14 LUFS ±0.5, true peak ≤ −1.0 dBTP.

It also reads with the sound off: the chronometer, the sunrise and sunset sweeps and the edition flips carry the day;
every tap shows its result in words; the payoff is a word ("In 23 min" → "Started"); the end is an address.

## Posting notes

- **Covers.** Upload `cover-9x16.jpg` as the Reel cover (its text sits in the middle, so the profile grid's 3:4 crop keeps
  the wordmark, the tagline and the bay) and `thumb-1280x720.jpg` as the YouTube thumbnail. Nothing is baked into frame 0:
  each cut opens on its own first frame (the wordmark and the whole tagline on the night bay), so there is no flash.
- **Safe areas.** Every line meant to be read sits in x 64–1016 (x ≤ 940 below y 1050), y 250–1440 in the Reel and in
  x 96–1824, y 60–960 in 16:9; the render checks this on every frame (`.cache/promo/audit-*.txt`).
- **Link.** Reels captions don't link: put fritzhand.github.io/visit-tampa-bay in the bio.
- **Music.** The soundtrack is original and can stay. If you add a library track, lower the original.
- **Automatic appearance.** The film's devices are set to automatic dark mode; the guide follows the device. Say so if
  anyone asks whether the site switches at sunset: it does not, by itself.
- **Type sizes.** On the Reel's stage every must-read line is at least 44 px (the independence line 40 px) and every
  secondary line at least 28 px (the typed link 30 px on two lines); inside the phone the must-reads (both toasts, the source
  line) are at least 40 px. The audit fails the render below those floors. The sheet legend (26 px in the Reel, 30 px in
  16:9) and the attribution are texture: they are not needed to follow the film.
- **Captions.** Upload the `.srt` with each cut.
- **Tags.** Neutral place tags only (#TampaBay #StPete #YborCity); never an official tourism tag or a team tag.

## The render's audit

- **9:16 Reel:** every check passed (reading times, safe zones, type floors, the name guard, forbidden strings, editions, the live words, the trip cards, fonts, loudness, determinism).
- **16:9:** every check passed (reading times, safe zones, type floors, the name guard, forbidden strings, editions, the live words, the trip cards, fonts, loudness, determinism).

## Revisions

Round 3 (Sep 28, 2026), after two more reviews:

- **16:9 timeline roll.** It rolled at a constant 100 css px a frame and each frame was averaged from 6 samples 45 css px
  apart, so every line showed 4–6 sharp copies. The roll now goes year by year: eight entries land on their tres notes and
  hold 4–5 frames, the page moves between them in the 3 frames before each note, and the remaining entries pass in the whip
  down to the proof.
- **Motion blur.** A fast scroll is exposed like film: the shutter opens with the speed (closed up to 24 output px a frame,
  the whole frame from 120 px), the samples are at most 6 output px apart inside the device viewport (up to 32), and the
  scrolled content between samples is filled with a vertical box of the sample spacing, so the page reads as one smear. The
  page's fixed parts (its top bar, the dock, a toast) and the stage's band are left out of the fill. The audit logs every
  blurred frame and fails one whose unfilled spacing is over 8 px.
- **Captions.** No cue is shorter than 1.5 s, and each runs as long as its words are on screen; the date line and the
  codes-only sheet cue are gone, the counts run with the address, the independence line has its own cue on two lines.
- **Holds.** The still holds drift in 1.5% (Reel: the Fort De Soto toast, the Ybor proof, "Link copied"; 16:9: the Fort De
  Soto toast, the proof, the map click, "Link copied", the second browser), about the point each framing anchors.
- **Hook.** The chart turns 6° onto north from frame 0 as the rose lands, so the first second moves. The ribbon over the
  wordmark reads "NOT FOR NAVIGATION" (the masthead's other side), not "SHEETS 1–6 · TAMPA BAY", which put "TAMPA BAY" twice
  within 80 px; the Reel's sheet legend fades before the box shrinks.
- **Reel framing.** The Ybor star is framed on the page head, not on its toast (it repeated Fort De Soto's framing); at the
  Riverwalk What's On shows from its day head down (its month bar, with today's filtered counts, read as "no events January
  to March"); the parade card is framed at 2.16, so the page's third toast stays below the frame; the running head keeps its
  line through each flight instead of holding only the time over an empty band.
- **16:9 transitions.** The laptop slides out (and the second browser in) instead of fading over the chart; the chart's two
  label levels switch in a cut, never a crossfade that doubled every label; the dock match's crossfade is 6 frames; the
  surround beyond the paper takes the dusk sweep with the paper (it flipped in one frame), and the sweep now crosses the
  whole frame before the devices flip (21.0–21.5 s, as in the Reel); the lying phone sits wholly under the laptop; the zoomed
  second browser's base goes under the page's paper; the dock keeps drifting through the map click.
- **Clock.** The odometer's roll into a minute starts at the crossing, so the clock never shows a minute before the site's
  countdown chip does.
- **Words.** YouTube chapters are three, each over 10 s; the LinkedIn copy says the build fails on a record without its
  source URL; the README's word table lists Row E, the day rule's labels and the ribbon.

Round 2 (Sep 28, 2026), after two more reviews:

- **16:9 dock match.** No empty box and no see-through laptop. The flight lands 5% inside the dock pose; the map page's own
  chart (loaded when the stage opens) crossfades in over the stage chart inside its own frame, with no screen fill behind it;
  then an opaque iris opens from that frame to the whole laptop while the camera and the laptop pull back to 1× together, so
  the chart stays registered. The lid is never faded.
- **Painted check.** The audit samples every device viewport (the laptop every frame, the phone every other frame) and fails
  the frame if it is a flat fill (luma standard deviation under 1) after re-rendering and looking again.
- **Frame 0.** Nothing is baked into frame 0: each cut opens on its own first frame, with the wordmark and the whole
  tagline from frame 0 (the Reel's tagline used to blink off and its clock to step back a minute). The covers are uploads;
  the 16:9 poster and thumbnail now name the product (the wordmark, the tagline, the six sheets, at 3.467 s).
- **Reel proof shot.** At the proof's scale the phone's page is wider than the frame; the cut lines now dissolve into the
  page's paper over the last 150 px instead of being sliced mid-word. A side fades only while a line of the phone's text
  actually crosses that edge (the stage measures it each frame). The audit fails a frame where a must-read's whole block is
  sliced by a frame edge with no fade, or where a must-read runs into a fade.
- **Whip.** A frame where a device page scrolls more than 60 css px is averaged from 4 to 12 sub-frames (a shutter open for
  the whole frame), so the whip reads as a blur, not a strobe.
- **Parade holds.** "In 23 min" holds 1.2 s with the title, then the minutes tick down over 4 s (4.2 s in 16:9) to "Started";
  the celesta follows each minute.
- **Flights.** The phone stays standing, facing the camera, through the golden-hour flights (it used to lie down and leave
  the frame for 0.7 s); in 16:9 the map's lede arrives with its kicker at 17.65 s.
- **End cards.** Reel: the address panel sits over the chart's empty north, so the course through the three stops shows,
  and the rose is inside the neatline. 16:9: the whole chart sits above the address panel and the attribution is in the left
  column. In both, the phone fades off the chart as the camera pulls back (it lay on "TAMPA").
- **Sheets.** A legend names the six sheets as their badges land (Reel: two rows under the clock; 16:9: six rows in the left
  column), and SP, TP and CW are nudged off their town labels.
- **Sharper devices.** The stage renders at device scale 2 and every capture is scaled back to output pixels, so the pages in
  the phone and the laptop stay as crisp at the push-ins as the stage's own type.
- **Page changes.** A cut on the dock tap, a 6-frame horizontal push in flight; never a dissolve of two dense pages.
- **Smaller things.** The Reel's toast push-ins lift the page at least 60 px, to the first place where no line, chip, button
  or drawn rule sits within 12 px of the running head's edge (the page's own label frame no longer meets the band flush), and
  centre the toast at x 553 so both ends of the dock stay in frame; the link scene scrolls 24 css further, so "Clear my trip" is under the band and the "Started" chip
  clears the toast; the typed link is on two lines at 30 px (16:9: 28 px); head lines are balanced (no widows); the 16:9
  second browser's cut top line and the callout at its right edge dissolve; the hook pushes in 3.6% from frame 1 and its
  "TAMPA BAY" eyebrow is 1.8× larger; three stage labels moved or hidden; the 16:9 chronometer sits 16 px lower, clear of
  the date.

Round 1 (Sep 28, 2026), after two reviews:

- **Sync.** The six sheet badges now land (full size, the squash, the rings) on the frames of their plucks (f60–f98); they used
  to land 5 frames (167 ms) after the sound.
- **Payoff guard.** The audit now reads every device's sidebar trip card, in frame or not, and fails the render if it says
  "Now" for the parade (no end time). It passes on this render.
- **Clock.** Each odometer column is clipped to its own digits, so a rolling digit no longer shows over the date line.
- **Sunset (Reel).** The table warms to gold from 13.5 s, the dusk sweeps across it from 15.0 to 15.5 s, then the devices and the
  running head flip in one frame, as in the 16:9.
- **Crossfades.** The last words of the day fade out before the end card fades in (both cuts), and the 16:9 address panel comes
  in after the laptop has left, centred on the chart's neatline.
- **Holds.** A 2.5% push-in on the parade card while the countdown waits, and a 2% (1.5% in 16:9) drift on the end cards.
- **Reel type.** Toasts and the Ybor source line at 41–42 px inside the phone, the independence line at 40 px, the footnotes at
  30 px (the running head grows for them); the audit now enforces these floors. The running head is a solid band to its
  rule, so no page heading peeks out beside it, and the Ybor page sits with "Facts" below it.
- **Reel Ybor star.** The camera pushes in on the toast so it lands in the safe zone, then moves to the source line over the end
  of the whip.
- **16:9 laptop.** The pointer always starts inside the screen (the poster frame included); the second browser zooms to 1.38 so
  the privacy note ends inside the frame; the camera turns top-down over the bay, so the phone no longer peeks under the laptop.
- **Hook.** The tagline is whole from 0.3 s. **16:9 crossing.** The ribbon turns to "PLAN · 1,407 ON THE CHART" at 17.5 s.

## Images and credits

No photographs appear on the stage: the chart table is the site's own SVG basemap rendered with its own tokens, and every
ornament is the site's SVG or CSS. Inside the devices, Fort De Soto Park and Ybor City Historic District show the site's typographic plates
(no rights-cleared photo was processed for them at render time); What's On, My Trip and the map show no photographs.
The render found no `<img>` in any device viewport, so there is no photo to credit.

Map: Basemap: US Census Bureau TIGER/Line (public domain). Place coordinates include data © OpenStreetMap contributors, ODbL (the OpenStreetMap data is licensed under the ODbL,
https://www.openstreetmap.org/copyright). Fonts: Bodoni Moda, Figtree and Archivo (SIL Open Font License), self-hosted by
the site.

## Rebuild

```bash
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs all            # both cuts, captions, copy, README
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs check          # the reads and assertions for Plans A and B
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs stills reel 1.233,6.5,12.8,22.0,30.4
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs sheet wide     # a contact sheet of the rendered MP4
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs audio          # the scores alone
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs docs           # README, share copy, captions from the last renders
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs all --day B    # the scripted fallback day
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs all --dsf 1    # device scale 1 (faster, softer devices)
```

It builds the current tree privately into `.cache/promo/site` (never `docs/`), serves it on two host names (two browser
origins: the phone and the laptop keep separate storage), captures it with Playwright's Chromium at device scale 2 (each capture scaled back to output pixels), renders JPEG frames
(a frame where a device page scrolls fast is exposed over up to the whole frame, from up to 32 sub-frames at most 6 px
apart, the scrolled content filled between them) and encodes them with ffmpeg (libx264 crf 18, yuv420p, +faststart). Every frame is a pure function of time. The per-frame
audit (reading time, safe zones, size floors, sliced blocks at the frame edge, painted device viewports, the name guard,
forbidden strings, editions, the live words, the trip cards) is written to
`.cache/promo/audit-reel.txt` and `audit-wide.txt`; the render manifest (data fingerprint, plan, loudness, timings) to
`.cache/promo/manifest.json`.

Rendered 2026-09-28 from data fingerprint `266fd2dda54bfcfa`, Plan A.
