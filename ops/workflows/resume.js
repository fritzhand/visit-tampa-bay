export const meta = {
  name: 'tampa-resume',
  description: 'Resume the interrupted work: page-lane reviews, completeness-slice verification and research',
  whenToUse: 'After a pause (see CHECKPOINT.md). args: [{ type: "review"|"verify"|"research", ... }]',
  phases: [
    { title: 'Work', detail: 'reviews of built lanes, research of interrupted slices' },
    { title: 'Verify', detail: 'adversarial verification of completeness slices' },
  ],
}
const REPO = '/home/user/visit-tampa-bay', CW = '/home/user/cincy-week'

/* ---------- page-lane review (same prompt as ops/workflows/page-lanes.js) ---------- */
const LANE_COMMON = (l) => `You are a PAGE LANE agent for **Tampa Bay Chartbook**, an independent, source-linked visitor's guide to Tampa Bay (repo ${REPO}).
Read first, completely: ${REPO}/CHECKPOINT.md, ${REPO}/CLAUDE.md, ${REPO}/SPEC.md, ${REPO}/build/CONTRACTS.md, ${REPO}/design/DESIGN.md, and look at
${REPO}/design/shots/*.png (the brand: a nautical chartbook printed like an Ybor cigar-box label; masthead, label-frame page heads, ribbons,
water-lining rules, sheet badges, plates, buoy pins are already styled: USE them). The data is real (data/*.json; data/README.md explains it).
Your lane: **${l.lane}**. You OWN (and may only write): ${l.owns}
If you need a change elsewhere, make the smallest additive change only if truly blocking, document it in build/CONTRACTS.md's Changelog and say so.
Never edit research/, data/*.json (except files your lane owns), tests/build.test.mjs, tests/fixtures/mini/*. Never run git.
ALWAYS build with TBC_OUT=.cache/out-${l.port} node build.mjs ; serve with TBC_OUT=.cache/out-${l.port} PORT=${l.port} node scripts/serve.mjs
(background it) ; screenshot with TBC_OUT=.cache/out-${l.port} NODE_PATH=/opt/node22/lib/node_modules node scripts/shots.mjs --pages <yours>
[--states] [--now 2026-10-24T19:30] (never a plain node build.mjs; never write docs/). npm test must stay green.
Rules on every page: never invent a fact (only render data/; unknowns print as unknowns); counts computed from data; no marketing
language; every record shows its source; states are words; 44px targets on phones; nothing under 12px; WCAG AA; both editions (Day chart /
Night chart); works without JS; 390px phone layout first-class; straight-line distances labeled as estimates; external links say they open a new tab.`

const REVIEW_SCHEMA = { type: 'object', properties: { summary: { type: 'string' }, fixed: { type: 'array', items: { type: 'string' } }, remaining: { type: 'array', items: { type: 'string' } } }, required: ['summary', 'fixed', 'remaining'] }
const review = (l) => agent(`${LANE_COMMON(l)}

## You are the adversarial REVIEWER for lane "${l.lane}"
The lane was built before a pause; its reviewer was interrupted. The builder's report is in ${REPO}/ops/workflows/results-at-pause.json
(the entry whose label is "build:${l.lane}"): read it first. The brief the builder was given:
${l.brief}

1. Build privately and screenshot every page the lane owns (390, 820, 1440; Day and Night; --states; --now 2026-10-24T19:30 and
   2027-01-30T11:00). LOOK at every screenshot. Hunt for layout breaks, overflow, cramped or empty sections, weak hierarchy, ornament overuse,
   an off-brand generic look, contrast, targets < 44px, text < 12px, broken or dead links, filters that don't work (test in a real browser with
   Playwright: chips, search, list/map toggles, dialogs, stars, reload with URL state), console errors, no-JS rendering, pages over 1.5 MB,
   any "Loading…" state that never resolves (e.g. the home page's today band: check it really fills from assets/data/events.json).
2. Data honesty: pick 15 random records rendered by these pages and check each rendered fact against data/*.json.
3. Usefulness: can a first-time visitor find what they need fast? Fix navigation gaps, missing cross-links, empty states, counts.
4. Also fix class names in your partials that leak globally (other lanes reported collisions, e.g. .tr-* in 31-region.css): prefix or scope them.
5. Fix everything inside the lane's files. Re-build, re-shoot, re-check. npm test green.
Return what you fixed and what remains (with why).`, { label: `review:${l.lane}`, phase: 'Work', schema: REVIEW_SCHEMA })

/* ---------- research slices (same prompts as ops/workflows/research-slices.js) ---------- */
const RS_COMMON = `You are a research agent for **Tampa Bay Chartbook**, an independent, source-linked visitor's guide to Tampa Bay
(repo ${REPO}). Today is Sep 27, 2026. Read first: ${REPO}/SPEC.md (sections 1, 2, 4 and 7), ${REPO}/research/SCHEMA.md,
${REPO}/research/README.md (the SHARED IDS), ${REPO}/CHECKPOINT.md.
Non-negotiable rules:
- Never invent a fact. Every record's facts come from a page you actually opened during this task; that page is its source_url (prefer the
  business's / organizer's / government's own page). Unknown = null. No "TBA", "Varies", guesses.
- summary: plain and factual, our own words, no marketing adjectives; superlatives only attributed. quote: verbatim, <= 40 words, or null.
- Check each thing is OPEN now (Sep 2026) and record status + status_note with the source when it is not.
- Coordinates: node ${REPO}/research/tools/geocode.mjs "<street address>" (or --name "<name>" --near lat,lng); prefer an OpenStreetMap
  feature matched by name over a Census street match (SPEC §7); check the matched text.
- Tools: WebSearch is EXHAUSTED for this session (do not rely on it); use WebFetch (gets through many sites that block curl), curl with a
  browser User-Agent, official listing APIs and sitemaps, OpenStreetMap (Photon), government data files.
- Write ONLY inside ${REPO}/research/<your slice>/ and your own scratch folder ./<slice>-agent/ inside the scratchpad. Never run git.
  Never edit other slices, data/, SPEC.md, SCHEMA.md or the tools. Save your JSON early and often.
- Finish with node ${REPO}/research/tools/check-slice.mjs <slice> and fix every error.
- The "report" field (markdown) says what you covered, how, counts, what you left out and why.`
const RESEARCH_SCHEMA = { type: 'object', properties: { slice: { type: 'string' }, counts: { type: 'object', additionalProperties: { type: 'number' } }, validator_clean: { type: 'boolean' }, gaps: { type: 'array', items: { type: 'string' } } }, required: ['slice', 'counts', 'validator_clean', 'gaps'] }
const VERIFY_SCHEMA = { type: 'object', properties: { slice: { type: 'string' }, records_checked: { type: 'number' }, fixed: { type: 'number' }, removed: { type: 'number' }, added: { type: 'number' }, validator_clean: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } } }, required: ['slice', 'records_checked', 'fixed', 'removed', 'added', 'validator_clean', 'issues'] }

const research = (s) => agent(`${RS_COMMON}

## Your slice: \`${s.slice}\` (RESUMING interrupted work)
Output file: ${REPO}/research/${s.slice}/${s.slice}.json ("slice": "${s.slice}"). It already holds partial, UNVERIFIED work from an agent that was
stopped mid-task: read it, keep what checks out against its source, and continue until the scope is covered.
Scope:
${s.scope}
Target: ${s.target}
Return the structured summary.`, { label: `research:${s.slice}`, phase: 'Work', schema: RESEARCH_SCHEMA })

const verify = (r, s) => agent(`${RS_COMMON}

## You are the adversarial VERIFIER for slice \`${s.slice}\`
File: ${REPO}/research/${s.slice}/${s.slice}.json (written by another agent; treat every record as suspect).
Scope of the slice:
${s.scope}
${r ? `The researcher reported: ${JSON.stringify(r).slice(0, 1500)}` : `The researcher's report is in ${REPO}/ops/workflows/results-at-pause.json (label "research:${s.slice}") and in the file's report field.`}
1. ACCURACY — for every record (or, if there are more than 150, every record whose facts are not all from one bulk government file, plus a
   random 60 of the rest), open its source and confirm existence, name, address, dates, prices, hours, kind, each summary claim, quote verbatim.
   Fix from the source; null what no page supports; delete what is closed for good, unsupported, duplicate (including duplicates of records
   already in ${REPO}/data/*.json: match by name, address and coordinates) or out of scope.
2. PLACE — spot-check coordinates; the area id must match where it is.
3. CLOSURES — look for closure, rebrand or license problems (for hotels: a delinquent or inactive state license).
4. COMPLETENESS — add notable omissions in scope with the same rigor.
5. Append "## Verification (2026-09-27)" to the report: checked, fixed, removed (with reasons), added.
6. Run node ${REPO}/research/tools/check-slice.mjs ${s.slice} until it has no errors.
Return the structured verification summary.`, { label: `verify:${s.slice}`, phase: 'Verify', schema: VERIFY_SCHEMA })

const run = (item) => {
  if (item.type === 'review') return review(item).then((v) => ({ item: item.lane, review: v }))
  if (item.type === 'verify') return verify(null, item).then((v) => ({ item: item.slice, verify: v }))
  return research(item).then((r) => verify(r, item).then((v) => ({ item: item.slice, research: r, verify: v })))
}
return await parallel(args.map((it) => () => run(it)))
