export const meta = {
  name: 'tampa-pages',
  description: 'Build page lanes for the Tampa Bay Chartbook, each followed by a screenshot review-and-fix pass',
  whenToUse: 'Page lanes (args: [{lane, owns, brief, port}])',
  phases: [
    { title: 'Build', detail: 'one agent per lane replaces its stubs' },
    { title: 'Review', detail: 'a skeptic screenshots every page state, audits UX and data honesty, and fixes' },
  ],
}
const REPO = '/home/user/visit-tampa-bay', CW = '/home/user/cincy-week'
const COMMON = (l) => `You are a PAGE LANE agent for **Tampa Bay Chartbook**, an independent, source-linked visitor's guide to Tampa Bay (repo ${REPO}).
Today is Sep 27, 2026. Read first, completely: ${REPO}/CLAUDE.md, ${REPO}/SPEC.md, ${REPO}/build/CONTRACTS.md, ${REPO}/design/DESIGN.md, and look at
${REPO}/design/shots/*.png and ${REPO}/design/specimen.html (the brand: a nautical chartbook printed like an Ybor cigar-box label; the
masthead, label-frame page heads, ribbons, water-lining rules, sheet badges, plates, buoy pins are already styled: USE them, don't reinvent).
The data is real (data/*.json, merged from sourced research; data/README.md explains it). The reference implementation for most page
patterns is Cincy Week (${CW}: build/pages/*.mjs, site/js/features/*.js, site/css/3x-9x partials): port its good ideas, not its identity.

Your lane: **${l.lane}**. You OWN (and may only write): ${l.owns}
Everything else is owned by someone else; if you need a change elsewhere (a core helper, a nav param, a shared component you don't own),
make the smallest additive change only if it is truly blocking, document it in build/CONTRACTS.md's Changelog, and say so in your report.
Never edit research/, data/*.json (except files your lane explicitly owns), tests/build.test.mjs, tests/fixtures/mini/*. Never run git.
Parallel-work rules (CONTRACTS §1): ALWAYS build with TBC_OUT=.cache/out-${l.port} node build.mjs ; serve with
TBC_OUT=.cache/out-${l.port} PORT=${l.port} node scripts/serve.mjs (background it) ; screenshot with
TBC_OUT=.cache/out-${l.port} NODE_PATH=/opt/node22/lib/node_modules node scripts/shots.mjs --pages <yours> [--states] [--now 2026-10-24T19:30]
(never a plain node build.mjs; never write docs/). npm test must stay green.

Product rules you must honor on every page: never invent a fact (only render what data/ holds; unknowns print as unknowns: "Hours not
listed", "Price not listed"); counts are computed from data; no marketing language; plain second person; every record shows its source
("Source: <host> · Checked Sep 27, 2026"); states are words; 44px targets on phones; nothing under 12px; WCAG AA; both editions (Day chart /
Night chart); works without JS (server-rendered lists; JS only enhances); phone layout at 390px is first-class. Distances between points are
straight-line estimates and must say so. External links open in a new tab and say so (the helpers do this).`

const IMPL_SCHEMA = { type: 'object', properties: { summary: { type: 'string' }, pages: { type: 'array', items: { type: 'string' } }, shared_changes: { type: 'array', items: { type: 'string' } }, known_issues: { type: 'array', items: { type: 'string' } } }, required: ['summary', 'pages', 'shared_changes', 'known_issues'] }
const REVIEW_SCHEMA = { type: 'object', properties: { summary: { type: 'string' }, fixed: { type: 'array', items: { type: 'string' } }, remaining: { type: 'array', items: { type: 'string' } } }, required: ['summary', 'fixed', 'remaining'] }

const build = (l) => agent(`${COMMON(l)}

## What to build
${l.brief}

Make it genuinely useful for a visitor deciding what to do, and genuinely beautiful in the Chart & Label brand. Write a
tests/${l.test}.test.mjs covering your pages' contracts (anchors, counts, filters, no unknown rendered as a guess). When done: private build
clean (read every warning your pages cause and fix it), npm test green, screenshots of every page you own at 390 and 1440 in both editions
(plus the --states and --now variants where your pages have live states) — LOOK at them and iterate until they are right.
Return the structured summary.`, { label: `build:${l.lane}`, phase: 'Build', schema: IMPL_SCHEMA })

const review = (r, l) => agent(`${COMMON(l)}

## You are the adversarial REVIEWER for lane "${l.lane}"
Another agent just built it. Its report: ${JSON.stringify(r || {}).slice(0, 4000)}
The brief it was given:
${l.brief}

1. Build privately and screenshot every page the lane owns (390, 820, 1440; Day and Night; --states; a --now inside the season, e.g.
   2026-10-24T19:30 and 2027-01-30T11:00). LOOK at every screenshot. Hunt for: layout breaks, overflow, cramped or empty sections, weak
   hierarchy, ornament overuse, off-brand generic look, unreadable contrast, targets < 44px, text < 12px, broken or dead links, filters that
   don't work (test them in a real browser with Playwright: click chips, type in search, toggle list/map, open dialogs, star items, reload
   with the URL state), console errors, no-JS rendering (disable JS and check the lists are still there), slow pages (HTML > 1.5 MB).
2. Data honesty: pick 15 random records rendered by these pages and check each rendered fact against data/*.json (no invented, rounded,
   reworded-into-a-claim or mislabeled facts; unknowns shown as unknowns; closed/temporarily-closed/cancelled states visible as words).
3. Usefulness: would a first-time visitor find what they need fast? Fix navigation gaps (missing cross-links to the region, area, map focus,
   What's On filters, the source), missing empty states, missing counts.
4. Fix everything you find inside the lane's files (same ownership rules). Re-build, re-shoot, re-check. npm test green.
Return the structured summary: what you fixed, what remains (with why).`, { label: `review:${l.lane}`, phase: 'Review', schema: REVIEW_SCHEMA })

return await pipeline(args, (l) => build(l), (r, l) => review(r, l).then((v) => ({ lane: l.lane, build: r, review: v })))
