/* ============================================================
   collateral/lib/promo-docs.mjs — the words around the films: captions (.srt), share copy and the README
   (plan.md §13, §17, §18). Everything is written from the render's own results: the words read from the
   site and data (promo-reads.mjs), the live words measured in the render (M), the audit, the loudness.
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { HAND } from "./promo-reads.mjs";

const ts = (s) => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
const n = (x) => x.toLocaleString("en-US");

/** caption cues per cut: [t0, t1, text] */
export function captions(cut, R, M) {
  const W = R.words, c = R.counts, time = (hm) => R.fmt.fmtTime(hm);
  const counts = `${n(c.places)} places · ${n(c.stays)} places to stay · ${n(c.events)} events`;
  const score = "[Original score: son montuno with tres, claves, brass and a ship's bell]";
  const sr = time(R.fmt.nyParts(R.SR).hhmm), ss = time(R.fmt.nyParts(R.SS).hhmm);
  const eveMin = Math.round((R.START - R.A_EVE) / 60000);
  const hook = `${W.siteName}\n${W.tag1} ${W.tag2}`;
  if (cut === "reel") return [
    [0, 1.5, score],
    [1.5, 3.9, `${hook}\n${R.fmt.fmtDayLong(R.plan.date)} · ${sr}`],
    [4.2, 7.5, `${W.kicker}\n${R.fds.name}, ${sr}: "Added to My Trip"`],
    [9.55, 12.0, `${R.ybor.name}, 12:30 PM\n${W.sourced}`],
    [12.0, 13.5, `"${M.rowE?.ybor || "Source: nps.gov"}"`],
    [15.5, 16.3, `${ss}\n${W.footnote}`],
    [16.3, 21.5, `${W.eventTitle}, ${time(R.ev.start)}\nIn ${eveMin} min`],
    [21.5, 23.05, `Started\n${W.startedNever} · end time not listed`],
    [23.5, 26.1, `Link copied\n${W.punch}`],
    [26.2, 27.0, counts],
    [27.0, 30.5, `${W.url}\n${W.independence}`],
  ];
  return [
    [0, 1.5, score],
    [1.5, 3.9, `${hook}\n${R.fmt.fmtDayLong(R.plan.date)} · ${sr}`],
    [4.2, 7.5, `${W.kicker}\n${R.fds.name}, ${sr}: "Added to My Trip"`],
    [9.55, 13.55, `${R.ybor.name}, 12:30 PM\n${W.founded}`],
    [13.55, 15.5, `${W.sourced}\n"${M.rowE?.ybor || "Source: nps.gov"}"`],
    [19.5, 21.5, `${W.mapKicker}\n${W.mapLede}`],
    [21.5, 24.1, `${ss}\n${W.footnote}`],
    [24.1, 29.5, `${W.eventTitle}, ${time(R.ev.start)}\nIn ${eveMin} min`],
    [29.5, 31.05, `Started\n${W.startedNever} · end time not listed`],
    [31.5, 34.1, `Link copied\n${W.punch}`],
    [34.1, 35.5, "A shared trip\nAdd 3 to my trip"],
    [35.5, 37.5, M.addToast?.text || "Added 3 items to My Trip"],
    [37.6, 39.5, `${counts}\n${W.sourced}`],
    [39.5, 41.5, `${W.url}\n${W.independence}`],
  ];
}

export function writeSrt(file, cues) {
  fs.writeFileSync(file, cues.map(([a, b, t], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${t}\n`).join("\n"));
}

/** share copy (plan.md §18): plain, no hype; the numbers are the data's */
export function shareCopy(R) {
  const c = R.counts, W = R.words, day = R.fmt.fmtDay(R.plan.date), t = R.fmt.fmtTime(R.ev.start);
  const body = `One Saturday on Tampa Bay, run through a guide that shows its sources: sunrise at ${R.fds.name}, ${R.ybor.name}, and the ${W.eventTitle.replace(/^Tampa Riverwalk /, "Riverwalk's ").replace(/^the /i, "")} at ${t} on ${day.replace(/^\w+, /, "")}. ${W.siteName} lists ${n(c.places)} places, ${n(c.stays)} places to stay and ${n(c.events)} events on six sheets, each linked to the page that states it. Star what you want; share the day as one link.`;
  const note = "The phone and laptop in the video were set to automatic dark mode: the guide follows the device's setting, it does not switch at sunset by itself.";
  const end = `${W.url} · ${W.independence}`;
  return `TAMPA BAY CHARTBOOK PROMO: SHARE COPY
(the numbers were read from the data at render time; re-render before posting if the data changed)

== Instagram (Reel, 9:16) ==
${body}

${note}

Link in bio: ${W.url}
${W.independence}
#TampaBay #StPete #YborCity

(Upload cover-9x16.jpg as the cover. The soundtrack is original: keep it, or lower it in the editor if you add a library track. Use neutral place tags only; never an official tourism tag or a team tag.)

== LinkedIn (16:9 or 9:16) ==
${body}

How it is made: every record lives in data files with a source URL and the date it was checked, and the build fails on a fact without a source. The video is the real site on an installed clock: a real day, real taps, the site's own words.

${note}

${end}

== YouTube (16:9) ==
Title: One Saturday on Tampa Bay, in a guide that shows its sources

${body}

${note}

Chapters:
0:00 The chart of the bay
0:04 Sunrise at ${R.fds.name}
0:09 ${R.ybor.name}
0:19 The bay chart at sunset
0:24 ${W.eventTitle}
0:31 One day, one link
0:37 ${W.siteName}

${end}
`;
}

/** the README (plan.md §17) */
export function readme({ R, runs, files, hand = HAND }) {
  const W = R.words, c = R.counts;
  const fmtI = (a) => (a ? `${a.I.toFixed(1)} LUFS integrated, true peak ${a.TP.toFixed(1)} dBTP, LRA ${a.LRA.toFixed(1)} LU` : "not measured");
  const size = (f) => (fs.existsSync(f) ? `${(fs.statSync(f).size / 1e6).toFixed(1)} MB` : "missing");
  const sr = R.fmt.fmtTime(R.fmt.nyParts(R.SR).hhmm), ss = R.fmt.fmtTime(R.fmt.nyParts(R.SS).hhmm);
  const rl = runs.reel, wd = runs.wide;
  return `# Sunrise to Lighted Boats: the Tampa Bay Chartbook promo, September 2026

Two cuts of one idea, made by [\`../build-promo.mjs\`](../build-promo.mjs) from the real site and its data, with an
original score computed note by note. There is no 4:5 cut.

| File | What | Use it for |
|---|---|---|
| \`tampa-bay-chartbook-promo-9x16.mp4\` | 1080×1920, 30 fps, 30.5 s (915 frames), H.264 High + AAC 256 kb/s 48 kHz stereo, ${size(files.reel)} | Instagram Reels, TikTok, YouTube Shorts, Stories, LinkedIn video |
| \`tampa-bay-chartbook-promo-16x9.mp4\` | 1920×1080, 30 fps, 41.5 s (1,245 frames), H.264 High + AAC 256 kb/s 48 kHz stereo, ${size(files.wide)} | YouTube, LinkedIn, the site's own pages, presentations |
| \`cover-9x16.jpg\` | the Reel's frame at 1.233 s (Night), also baked in as frame 0 | the Reel cover |
| \`poster-16x9.jpg\`, \`thumb-1280x720.jpg\` | the 16:9 frame at 21.9 s (the laptop's chart just turned Night), also baked in as frame 0 | the YouTube thumbnail, a poster |
| \`promo-9x16.srt\`, \`promo-16x9.srt\` | captions: every must-read line at its time, and the score | upload with the video |
| \`share-copy.txt\` | Instagram, LinkedIn and YouTube copy (with chapters) | the posts |
| \`plan.md\`, \`concepts/\` | the plan of record and the three concepts it was chosen from | editing it |

## The idea

The site calls itself a chartbook and names its two editions for the time of day: the Day chart and the Night chart.
Its What's On speaks in words that only mean something at a given minute ("Today", "In 23 min", "Started"). So the
film does not describe the site: it runs one real day through it, and the clock is the camera's engine.

One Saturday, ${R.fmt.fmtDayLong(R.plan.date)}, 2026, on a phone lying on the site's own chart of Tampa Bay. The coast
engraves itself in gold and the rose lands on north; the sun comes up across the bay at the computed sunrise
(${sr} at ${R.fds.name}) and the site switches to its Day chart; the six sheet badges stamp onto the chart. A star at
${R.fds.name} (a county park). At ${R.ybor.name} (a National Historic Landmark district) the claim "${W.sourced}" and then
its proof, the page's own "${M_(rl, "rowE")?.ybor || "Source: nps.gov"}". At sunset (${ss} at the Riverwalk) the device
goes dark and the site follows; the ${W.eventTitle} card counts "In ${Math.round((R.START - R.A_EVE) / 60000)} min" down to
"Started", and never "Now", because no end time is published. The day leaves as one link. The 16:9 cut adds a laptop:
the camera docks onto the map page's own chart at sunset, a real click on the map, the Ybor timeline, and the shared
link opened in a second browser ("Add 3 to my trip").

No commercial operator is featured: the stops are a county park, an NPS-sourced historic district and a public parade.
Operator and venue names appear only inside the site's own listings.

## Scenes

**9:16 Reel (30.5 s)**

| Time | Scene | On screen |
|---|---|---|
| 0.0–4.6 | Hook | the night bay engraving itself; the wordmark, "${W.tag1} ${W.tag2}"; sunrise at 1.5 s; the six sheet badges |
| 4.6–7.5 | ${R.fds.name}, ${sr} | "${hand.kicker}"; a real star tap; the site's toast "Added to My Trip · View" |
| 7.5–9.25 | The crossing | a low flight across the bay; the chronometer rolls to 12:30 PM, the claves strike the hours |
| 9.25–13.5 | ${R.ybor.name}, 12:30 PM | "${W.sourced}", a star, a whip scroll to the page's source line |
| 13.5–15.5 | Golden hour | the flight to the Riverwalk; What's On |
| 15.5–16.3 | Sunset, ${ss} | the device goes dark; "${hand.footnote}" |
| 16.3–22.9 | The parade | "${W.eventTitle}"; "In 23 min" … "Started"; "${W.startedNever}" |
| 22.9–25.5 | One link | My Trip; "Link copied"; "${hand.punch}" |
| 25.5–30.5 | The night bay and the end card | the course through the three stops, every point on the chart, the counts, the address, the independence line |

**16:9 (41.5 s)**

| Time | Scene | On screen |
|---|---|---|
| 0.0–4.6 | Hook | as the Reel, in a left column |
| 4.6–7.5 | ${R.fds.name} | the star; the day rule; Row E "${M_(rl, "rowE")?.fds || ""}" |
| 7.5–9.5 | The crossing | the low flight; the hours on the claves |
| 9.5–15.5 | ${R.ybor.name} | "${W.founded}"; the timeline rolls, one tres note per year; the proof |
| 15.5–19.5 | Golden hour | the flight down onto the laptop's map (the dock match) |
| 19.5–24.1 | The bay chart at sunset | "${W.mapLede}"; sunset; a real click on the map |
| 24.1–30.85 | The parade | the countdown to "Started" |
| 30.85–37.5 | One link, two browsers | "Link copied"; the link opens on a second browser: "A shared trip", "Add 3 to my trip", "${M_(wd, "addToast")?.text || "Added 3 items to My Trip"}" |
| 37.5–41.5 | The end card | the counts, "${W.sourced}", "${W.aboutLine}", the address, the independence line |

## Where every word comes from

Every count is computed from \`data/*.json\` at render time (through the build's own loader) and checked against the
built home page's dek and meta description. Every sentence about the site is read from the private build of the current
tree, and the render stops if a read no longer matches:

| On screen | Read from |
|---|---|
| The wordmark, "${W.siteName}" | the site's brand sprite; \`site.config.json\` \`siteName\` |
| "${W.tag1} ${W.tag2}" | \`site.config.json\` \`siteTagline\`, split at its comma |
| "${W.ribbonHook}" | the home masthead line |
| The clock line, the chronometer, "${W.date}" | the site's own time formatters (\`site/js/lib/time.js\`) on the installed clock |
| The ribbons ("SHEET 3 · GULF BEACHES · PARK" …) | each page's own kicker, live; the parade's is the card's kind |
| "${W.founded}" (16:9) | ${R.ybor.name}'s lede |
| "${W.mapLede}", "${W.mapKicker.toUpperCase()}" (16:9) | the map page's lede and kicker |
| "${W.eventTitle}", "In 23 min" … "Started", "END TIME NOT LISTED" | the What's On card, live, in the same frame |
| "${W.startedNever}" | the About page's "What the sources don't say" table |
| "${W.sourced}" | the site footer |
| "${M_(rl, "rowE")?.ybor || "Source: nps.gov · Checked …"}" | the Ybor page's source line, live in the phone |
| The typed link | the clipboard after the real "Share my trip" tap, with its host rewritten to the published address |
| "${M_(wd, "addToast")?.text || "Added 3 items to My Trip"}" (16:9) | the site's toast on the second browser, live |
| ${n(c.places)} · ${n(c.stays)} · ${n(c.events)}, "places", "places to stay", "events" | \`data/*.json\`; the nouns and their order from the home page's meta description |
| "${W.aboutLine}" (16:9) | the About page ("It is printed like …") |
| ${W.url} | \`site.config.json\` \`siteBase\` |
| "${W.independence}" | the site footer |
| The map attribution | the map page's attribution line |

Written by hand, and nothing else:

1. "${hand.kicker}" (the story's kicker).
2. "${hand.footnote.toUpperCase()}" (the honesty footnote on the edition flip: the devices are set to automatic
   appearance, and the site follows the system setting until a reader picks an edition; the render asserts nothing was
   stored).
3. "${hand.punch}" (the punchline).

Marks only: the middots between counts, capitals for labels, the first-letter capitals of the two excerpts, the
dropped "It is " of the About line, the arrowhead of the course arc, and device chrome.

## The clock, the day and the real taps

Plan ${R.planId}: ${R.fmt.fmtDayLong(R.plan.date)}, 2026. The browser's clock is installed and paused, and advanced frame by
frame along a curve W(t) (real time, ×3, and time-lapses whose hour crossings land on eighth notes). Sunrise and sunset are
computed with NOAA's solar equations from the records' own coordinates and cross-checked with a second method
(${sr} at ${R.fds.name}, ${ss} at ${R.evPlace.name}). The editions flip by the system appearance
(\`emulateMedia\`), never by a URL parameter; the site's own listener switches every device in the same frame.
The stars, the share and (16:9) the map click and "Add 3 to my trip" are real clicks on the site's own elements; the toasts
are the site's own, timed by its own 3.2 s timer on the video's clock. The parade card reads "In 23 min" at the anchor
frame, "In 1 min" on the frame before 6:15:00 PM and "Started" from 6:15:00.000 PM, never "Now": the audit checks each frame.
The fallback day (Plan B: Sat, Dec 12, the Clearwater Holiday Lighted Boat Parade) is one flag away: \`--day B\`.

## Sound

An original score, computed note by note in [\`../lib/synth.mjs\`](../lib/synth.mjs) and
[\`../lib/promo-score.mjs\`](../lib/promo-score.mjs): no samples, no licensed audio, and all noise from a seeded
generator, so it renders the same every time. A son montuno at 120 BPM in son clave 3-2: a Karplus-Strong tres guajeo,
a tumbao bass, claves, bongó, maracas and güiro, a brass section, a celesta and a ship's bell, over the sea (the river
at night). The night pickup is in F; sunrise lifts it a major third to A; sunset brings it back to F; the end resolves on
F6/9, so the loop is musical. Written to the picture: six plucks as the six sheets land, the claves strike the hours as
the chronometer rolls, the güiro follows the scroll, a wood stamp lands the proof, the celesta climbs one note per minute
of the countdown, the ship's bell rings at sunrise, sunset, "Started" and the end, and the clave's 3-side and 2-side sign off.

Measured on the decoded AAC of each MP4 (ffmpeg ebur128): Reel ${fmtI(rl?.audio)}; 16:9 ${fmtI(wd?.audio)}. Targets:
−14 LUFS ±0.5, true peak ≤ −1.0 dBTP.

It also reads with the sound off: the chronometer, the sunrise and sunset sweeps and the edition flips carry the day;
every tap shows its result in words; the payoff is a word ("In 23 min" → "Started"); the end is an address.

## Posting notes

- **Reel cover.** Upload \`cover-9x16.jpg\`. Its text sits in the middle, so the profile grid's 3:4 crop keeps the
  wordmark, the tagline and the bay.
- **Safe areas.** Every line meant to be read sits in x 64–1016 (x ≤ 940 below y 1050), y 250–1440 in the Reel and in
  x 96–1824, y 60–960 in 16:9; the render checks this on every frame (\`.cache/promo/audit-*.txt\`).
- **Link.** Reels captions don't link: put ${W.url} in the bio.
- **Music.** The soundtrack is original and can stay. If you add a library track, lower the original.
- **Automatic appearance.** The film's devices are set to automatic dark mode; the guide follows the device. Say so if
  anyone asks whether the site switches at sunset: it does not, by itself.
- **Captions.** Upload the \`.srt\` with each cut.
- **Tags.** Neutral place tags only (#TampaBay #StPete #YborCity); never an official tourism tag or a team tag.

## Images and credits

No photographs appear on the stage: the chart table is the site's own SVG basemap rendered with its own tokens, and every
ornament is the site's SVG or CSS. Inside the devices, ${R.fds.name} and ${R.ybor.name} show the site's typographic plates
(no rights-cleared photo was processed for them at render time); What's On, My Trip and the map show no photographs.
${imageCredits(runs)}
Map: ${W.attribution.replace(/\.$/, "")} (the OpenStreetMap data is licensed under the ODbL,
https://www.openstreetmap.org/copyright). Fonts: Bodoni Moda, Figtree and Archivo (SIL Open Font License), self-hosted by
the site.

## Rebuild

\`\`\`bash
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs all            # both cuts, captions, copy, README
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs check          # the reads and assertions for Plans A and B
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs stills reel 1.233,6.5,12.8,22.0,30.4
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs sheet wide     # a contact sheet of the rendered MP4
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs audio          # the scores alone
NODE_PATH=/opt/node22/lib/node_modules node collateral/build-promo.mjs all --day B    # the scripted fallback day
\`\`\`

It builds the current tree privately into \`.cache/promo/site\` (never \`docs/\`), serves it on two host names (two browser
origins: the phone and the laptop keep separate storage), captures it with Playwright's Chromium, renders JPEG frames and
encodes them with ffmpeg (libx264 crf 18, yuv420p, +faststart). Every frame is a pure function of time. The per-frame
audit (reading time, safe zones, size floors, the name guard, forbidden strings, editions, the live words) is written to
\`.cache/promo/audit-reel.txt\` and \`audit-wide.txt\`; the render manifest (data fingerprint, plan, loudness, timings) to
\`.cache/promo/manifest.json\`.

Rendered ${new Date().toISOString().slice(0, 10)} from data fingerprint \`${R.dataHash}\`, Plan ${R.planId}.
`;
}

function M_(run, key) { return run?.M?.[key]; }
function imageCredits(runs) {
  const imgs = new Map();
  for (const r of Object.values(runs)) for (const [k, v] of Object.entries(r?.audit?.images || {})) imgs.set(k, v);
  if (!imgs.size) return "The render found no `<img>` in any device viewport, so there is no photo to credit.\n";
  return "Images that appeared in a device:\n\n| Subject | Creator | License | Page |\n|---|---|---|---|\n" + [...imgs.values()].map((e) => `| ${e.alt || e.key} | ${e.creator || e.credit || ""} | ${e.license} | ${e.page_url || ""} |`).join("\n") + "\n";
}
