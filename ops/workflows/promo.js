export const meta = {
  name: 'tampa-promo',
  description: 'Concept, build and review an immersive promo video (9:16 + 16:9) for Tampa Bay Chartbook with an original score',
  phases: [
    { title: 'Concepts', detail: 'three competing storyboards' },
    { title: 'Judge', detail: 'two judges score; a synthesizer writes the final plan' },
    { title: 'Build', detail: 'renderer, 3D stage, live-site capture, original score, three cuts' },
    { title: 'Review', detail: 'visual/motion and honesty/audio reviewers, then fixes, up to 3 rounds' },
  ],
}
const REPO = '/home/user/visit-tampa-bay', CW = '/home/user/cincy-week'
const OUT = `${REPO}/collateral/promo-2026-09`
const CTX = `**Tampa Bay Chartbook** (${REPO}; live at https://fritzhand.github.io/visit-tampa-bay/) is an independent, source-linked visitor's guide
to Tampa Bay (the data holds 641 places, 414 stays, 176 experiences, 590 dated events Sep 28, 2026 - Apr 30, 2027, 106 annual event series and a 135-entry history timeline; recount at render time, these numbers will change). Brand "Chart & Label": a skipper's nautical chartbook (six numbered sheets: TP Tampa, SP St. Petersburg,
GB Gulf Beaches, CW Clearwater & North Pinellas, AB Around the Bay, DT Day Trips) printed with the gold and ornament of an Ybor City
cigar-box label. Read ${REPO}/SPEC.md, ${REPO}/CLAUDE.md, ${REPO}/design/DESIGN.md, look at ${REPO}/design/shots/*.png and the site's
real pages (build privately: cd ${REPO} && TBC_OUT=.cache/out-promo node build.mjs ; serve: TBC_OUT=.cache/out-promo PORT=8150 node scripts/serve.mjs).
The owner asked: "an immersive promo video with scroll-through mockups like the one for Cincy Week, but better." The Cincy Week
reference is ${CW}/collateral/ (read README.md, reel-2026-09/README.md, reel-2026-09/brag-plan.md, video-2026-09/README.md, build-reel.mjs,
build-video.mjs, lib/*.mjs; watch its videos by extracting frames: ffmpeg is at $(python3 -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())")).
Formats: TWO cuts only, a 9:16 vertical Reel (1080x1920) and a 16:9 landscape video (1920x1080). The owner does NOT want a 4:5 cut: do not plan, build or render one.
Non-negotiables (same as Cincy Week's collateral): every count is computed from data/*.json at render time; every sentence about the
site is read from the built site or data (a few short hand-written hook/kicker lines are allowed and must be listed); no claims like
"best", "#1", "ultimate", "official"; never use Visit Tampa Bay's or any team's/venue's logo or name as ours; images only the site's
rights-cleared ones (with credits in the README and, when an image is prominent, a small on-screen credit); the end card carries the
address fritzhand.github.io/visit-tampa-bay and the independence line "Independent guide. Not affiliated with any tourism office,
venue or operator."; an original score computed note by note (no samples, no licensed audio); it must read with the sound off.
Page-lane agents are still refining the site in parallel: capture from a private build of the current tree at render time, never
write docs/, never touch files outside ${REPO}/collateral/ (and .cache/), never run git.`

const CONCEPT_SCHEMA = { type: 'object', properties: { title: { type: 'string' }, file: { type: 'string' }, logline: { type: 'string' } }, required: ['title', 'file', 'logline'] }
const JUDGE_SCHEMA = { type: 'object', properties: { scores: { type: 'array', items: { type: 'object', properties: { concept: { type: 'string' }, hook: { type: 'number' }, clarity: { type: 'number' }, product: { type: 'number' }, brand: { type: 'number' }, immersion: { type: 'number' }, better_than_cincy: { type: 'number' }, honesty: { type: 'number' }, feasibility: { type: 'number' }, total: { type: 'number' }, defects: { type: 'array', items: { type: 'string' } }, grafts: { type: 'array', items: { type: 'string' } } }, required: ['concept', 'total', 'defects', 'grafts'] } }, winner: { type: 'string' }, verdict: { type: 'string' } }, required: ['scores', 'winner', 'verdict'] }
const REVIEW_SCHEMA = { type: 'object', properties: { blocking: { type: 'array', items: { type: 'string' } }, polish: { type: 'array', items: { type: 'string' } }, verdict: { type: 'string' }, ship: { type: 'boolean' } }, required: ['blocking', 'polish', 'verdict', 'ship'] }

const ANGLES = [
  { key: 'chart-flight', brief: 'THE CHART FLIGHT: open on a blank cream sheet; the real Tampa Bay coastline (site/map/basemap.svg) engraves itself with water lining, the compass rose turns, and a 3D camera flies low over the chart from Tampa to St. Pete to the Gulf beaches to Clearwater, each sheet badge dropping in like a label; at each stop the camera dives into a device (phone and a laptop) scrolling that sheet page of the real site; it ends by pulling back to the whole chartbook, closed like a cigar box with the label on the lid.' },
  { key: 'label-box', brief: 'THE CIGAR-BOX LABEL: the promo is a lithographed Ybor cigar-box label come to life: gold-leaf frame, ribbon banners, the Chartbook medallion; the lid opens and the site spills out in layered 3D device mockups (phone, tablet, laptop) floating at depth with parallax, each scrolling a different real page (What\'s On, the map, a historic place with its heritage block, Where to stay, My Trip); a score with a Cuban son clave groove (Ybor) carries it; the lid closes on the end card.' },
  { key: 'a-day-on-the-bay', brief: 'A DAY ON THE BAY: one visitor\'s day, clock-driven, sunrise to night, shown only through the real site running live on a phone (and a laptop for the map): morning beach and outdoors, midday history (Ybor, the timeline), afternoon an experience on the water, evening What\'s On (a real dated event on the chosen day), the edition flipping from Day chart to Night chart at sunset, every tap real (stars adding to My Trip, the toast), ending with the shared trip link and the end card; the camera moves in 3D around the devices between scenes.' },
]

phase('Concepts')
const concepts = (await parallel(ANGLES.map((a, i) => () => agent(`You are a creative director. Context: ${CTX}

Write ONE complete promo concept, in the spirit of Cincy Week's brag-plan.md (read it) but aiming to be clearly better: more immersive
(3D camera, depth, parallax, device mockups scrolling the REAL site), more distinctive to Tampa Bay and to this brand, and just as honest.
Your assigned angle (you may improve it, not abandon it): ${a.brief}
Specify: the hook in the first 1.5 s; a second-by-second table for a ~30 s 9:16 Reel (1080x1920) AND how the 16:9 (1920x1080, ~40 s) cut differs; every on-screen word with its source (data file/field or built page/selector) or marked hand-written; which
real pages/states are captured (URLs, ?now= clock, ?theme=), which taps are real; the camera moves (3D transforms, easing), transitions,
typography and ornament from the design system; the original score (key, tempo, instruments you will synthesize (e.g. Karplus-Strong
plucked strings like a tres, bass tumbao, claves/bongó, a brass-like pad, ocean-wash noise), how it is written to picture, loudness
target -14 LUFS / -1 dBTP); safe areas for Instagram/TikTok overlays; the cover frame; the sourcing table; risks and how the renderer
checks them. Be concrete enough that an engineer can build it without guessing. Write it to ${OUT}/concepts/${i + 1}-${a.key}.md
(create the folder). Return title, file, one-line logline.`, { label: `concept:${a.key}`, phase: 'Concepts', schema: CONCEPT_SCHEMA })))).filter(Boolean)

phase('Judge')
const judges = (await parallel(['a hard-nosed social-video editor who has cut hundreds of Reels (hook, pacing, legibility, retention)', 'a brand and product lead who cares about honesty, the design system, showing the real product doing its job, and feasibility with Playwright + ffmpeg on a 4-core box'].map((lens, j) => () => agent(`You are a judge: ${lens}. Context: ${CTX}
Read the three concepts: ${concepts.map((c) => c.file).join(', ')}. Also look at Cincy Week's reel and walkthrough (frames via ffmpeg) to judge
"better than Cincy's". Score each 1-10 on hook, clarity, product (the real site doing its job), brand, immersion, better_than_cincy, honesty,
feasibility; total = sum. List each concept's defects and the ideas worth grafting from it. Pick a winner and write a short verdict.`, { label: `judge:${j + 1}`, phase: 'Judge', schema: JUDGE_SCHEMA })))).filter(Boolean)

const plan = await agent(`You are the synthesizer. Context: ${CTX}
Concepts: ${concepts.map((c) => `${c.title} (${c.file})`).join('; ')}. Judges' scores and verdicts: ${JSON.stringify(judges).slice(0, 12000)}
Pick the winner by total score (break ties by the verdicts), then write the FINAL production plan to ${OUT}/plan.md: the winner rebuilt with
the judges' grafts and every listed defect fixed ("Defects fixed" section at the end, like Cincy's brag-plan). It must be a complete,
unambiguous spec for the engineer: timings to the frame for the 9:16 Reel (~30 s) and the 16:9 cut (~40 s) (no 4:5 cut); every on-screen line
with its source; captured pages/states/clock/taps; camera and transition math; the score (tempo, key, parts, hits on picture); safe areas;
cover frames; deliverables. Return a short summary of the plan and why it wins.`, { label: 'synthesize-plan', phase: 'Judge' })

phase('Build')
let build = await agent(`You are the video engineer. Context: ${CTX}
Build exactly what ${OUT}/plan.md specifies (read it fully; summary: ${String(plan).slice(0, 2500)}).
Write zero-dependency Node scripts in ${REPO}/collateral/ (Playwright from NODE_PATH=/opt/node22/lib/node_modules; chromium preinstalled at
/opt/pw-browsers, never run playwright install; ffmpeg from python3 -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())", or $FFMPEG):
collateral/build-promo.mjs (subcommands: all, stills <cut> <t1,t2,...>, audio, sheet) and collateral/lib/ (stage, capture, score, synth, checks,
review tools; port and improve Cincy Week's lib/synth.mjs, reel-score.mjs, reel-stage.mjs, review-tools.mjs). Principles from Cincy Week's
reel: every frame is a pure function of time (install and pause the site's clock via ?now= / Playwright clock; advance per frame); the site
runs with reduced motion and the video adds the motion; real taps are real clicks; the render fails if a sourced line or count no longer
matches the site/data; safe-area and minimum-text-size checks on every frame; frame 0 is the cover. Performance: 4 CPUs shared with other
agents: render JPEG frames and pipe them to ffmpeg (libx264, yuv420p, crf ~18, +faststart), reuse captures, keep one full render of both cuts
under ~25 minutes. Audio: render the score to 48 kHz stereo WAV, measure with ffmpeg ebur128/loudnorm, hit -14 LUFS integrated and <= -1 dBTP,
mux AAC 256k. Deliverables in ${OUT}/: tampa-bay-chartbook-promo-9x16.mp4 and -16x9.mp4 (no 4:5), cover/poster JPGs per cut, captions
(.srt per cut), share-copy.txt (Instagram, LinkedIn, YouTube variants; plain, no hype), README.md (like Cincy's reel README: the idea, the
scene table, where every word comes from, sound, posting notes, image credits, rebuild commands). Render everything, then LOOK: extract a
contact sheet (1 frame per second) per cut and a few full-size stills, view them, and fix what looks wrong before you return.
Return: what you built, durations, file sizes, loudness numbers, and known weaknesses.`, { label: 'build-promo', phase: 'Build' })

phase('Review')
for (let round = 1; round <= 3; round++) {
  const reviews = (await parallel([
    `VISUAL & MOTION reviewer: extract contact sheets (every 0.5 s) and full-size frames at every scene boundary for both cuts; watch for: a weak first 1.5 s, anything unreadable at phone size (text under ~40 px in 9:16 for key lines), text in unsafe areas (Instagram: top ~220 px, bottom ~420 px, right column), jitter/judder/tearing, blank or loading frames, layout breaks in the captured site, awkward cuts, pacing that drags, device mockups that look cheap or distorted, ornament overuse, the end card. Compare against Cincy Week's reel frames: is this clearly better?`,
    `HONESTY & AUDIO reviewer: check every on-screen word and number against its declared source (data/*.json, the built site) and the README's sourcing table; flag any claim not supported, any logo or name used as ours, uncredited images, the independence line and address on the end card; listen analytically: measure loudness (ffmpeg ebur128: integrated, true peak, LRA), check for clipping, DC offset, clicks at cuts, silence gaps, A/V sync of hits to picture (compare the plan's hit times with the scene boundaries), that the audio is original synthesis (read the code), and that captions (.srt) match the picture.`,
  ].map((lens, k) => () => agent(`You are a ${lens} Context: ${CTX}
Files: ${OUT}/ (the plan is plan.md; the builder's report: ${String(build).slice(0, 3000)}). Be concrete: timestamps, frames, exact fixes.
Mark ship=true only if nothing blocking remains.`, { label: `review${round}:${k ? 'honesty-audio' : 'visual-motion'}`, phase: 'Review', schema: REVIEW_SCHEMA })))).filter(Boolean)
  const blocking = reviews.flatMap((r) => r.blocking)
  log(`round ${round}: ${blocking.length} blocking, ${reviews.flatMap((r) => r.polish).length} polish`)
  if (!blocking.length && reviews.every((r) => r.ship)) break
  build = await agent(`You are the video engineer, fixing round ${round}. Context: ${CTX}
The plan: ${OUT}/plan.md. The scripts: ${REPO}/collateral/build-promo.mjs and collateral/lib/. Reviews (fix every blocking item; do the
polish items that are cheap and clearly right): ${JSON.stringify(reviews).slice(0, 14000)}
Re-render all cuts, re-check loudness, re-extract contact sheets and LOOK at them. Update README.md. Return what you changed and what remains.`, { label: `fix-round-${round}`, phase: 'Review' })
}
return { concepts, judges, plan, build }
