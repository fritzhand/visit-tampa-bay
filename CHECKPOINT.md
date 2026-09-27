# Checkpoint — paused Sep 27, 2026, ~20:40 UTC

Work was paused at the owner's request (to save usage for another project). Every running workflow was stopped;
nothing is running. This file says exactly where each workstream stands and how to resume it. Delete it when the
work is done.

## State at the pause (verified)

- **Build:** `TBC_OUT=.cache/out-checkpoint node build.mjs` is clean: 1,123 pages, data warnings only.
- **Tests:** `npm test`: 217 of 217 pass.
- **data/**: the final verified merge of the 23 research slices + `media-commons` (641 places, 414 stays,
  176 experiences, 590 events, 106 series, 135 timeline entries, 49 transport, 118 FAQs, 99 facts, 338 media,
  14 routes). The two completeness slices below are **not** merged yet.
- **Live site:** `main` (GitHub Pages, `main` → `/docs`) was fast-forwarded to this checkpoint's build.
- **Branch:** all work is on `claude/tampa-bay-visitor-guide-yd03u2`; `main` equals it at the checkpoint commit.

## Workstreams

| Workstream | Status | To resume |
|---|---|---|
| Research (23 slices) | **Done**, each verified | — |
| Engine, design system, basemap | **Done** | — |
| Final merge | **Done** (`node scripts/merge-research.mjs`) | Re-run only after the completeness slices are verified (below) |
| Page lane: Experiences, Eat & drink, Stay (+ `stays/*`) | **Done**, built + reviewed | — |
| Page lane: History & Passages (`data/routes.json`) | **Done**, built + reviewed | — |
| Page lane: Getting around, When to visit, FAQ, About | **Done**, built + reviewed | — |
| Page lane: What's On & My Trip | **Done**, built + reviewed | — |
| Page lane: Home & the six Sheets | **Built**; review **interrupted** | Re-run its review agent (see "Page-lane reviews") |
| Page lane: Map & Areas (+ `areas/*`) | **Built**; review **interrupted** | Re-run its review agent |
| Page lane: Things to do, Outdoors, `places/*` | **Built**; review **interrupted** | Re-run its review agent |
| Images | Finder **done** (137 Commons images, `research/media-commons/`, merged into `data/media.json`); processing **interrupted** at 21 of 338 subjects (37 WebP files in `site/img/`) | `python3 scripts/fetch-images.py` (incremental, resumes; Wikimedia throttles hard, so let it run; `--max-minutes N` to bound it), then build |
| Completeness: `stays-dbpr` (every licensed hotel/motel in the 4 core counties not yet in data, from the Florida DBPR lodging extract) | Research **done**: 314 stays; verification **not run** | Run the slice verifier (`ops/workflows/research-slices.js` with the `stays-dbpr` arg), then merge |
| Completeness: `gaps-listings` (omissions vs the official tourism listings) | Research **interrupted**: 14 places, 7 experiences, 40 events, 8 series written so far, unverified | Re-run the slice (research + verify), then merge |
| Promo video (9:16 Reel + 16:9; **no 4:5**, owner's decision) | **Not started in earnest**: the concept agents were stopped before writing any file | Re-run `ops/workflows/promo.js` from the start |
| Integration QA, README, final push | **Not started** | See "After the lanes" |

**Do not run `node scripts/merge-research.mjs` before the two completeness slices are verified**: their files exist in
`research/` (unverified) and the merge's `SLICES` list includes them, so a merge now would publish unverified records.

## How to resume (Claude Code, ultracode)

The orchestration scripts used so far are saved in `ops/workflows/` (plain Workflow-tool scripts; pass `args` as JSON):

| Script | What it runs | Args |
|---|---|---|
| `research-slices.js` | research agent → adversarial verifier per slice | `[{ slice, scope, target }]` (the `stays-dbpr` and `gaps-listings` briefs are in `results-at-pause.json`'s context and in `research/README.md` / `scripts/merge-research.mjs`'s header) |
| `page-lanes.js` | build agent → review agent per lane | `[{ lane, port, test, owns, brief }]` (the seven lane briefs are in the script's first run's args; the owners table is in `build/CONTRACTS.md` §2–3) |
| `images.js` | find → process | none |
| `promo.js` | 3 concepts → 2 judges → plan → build → review/fix rounds | none |
| `merge.js`, `foundation.js` | kept for provenance (done) | — |

`results-at-pause.json` holds every finished agent's report (the lanes' build/review reports, the `stays-dbpr` research
report, the image finder's report): read it before re-running a review so the reviewer knows what was built.

Workflow concurrency on this machine is 2 agents per workflow (4 CPUs): launch several workflows in parallel, one or two
items each.

### Page-lane reviews (three interrupted)
Re-run only the review stage for `home-and-sheets` (port 8131), `map-and-areas` (8133) and `explore-and-places` (8134):
the review prompt in `page-lanes.js`, with the lane's build report from `results-at-pause.json`.

### After the lanes (integration QA)
1. `assets/site.css` is ~60 KB gzipped against a 45 KB budget: trim duplicate rules across partials.
2. Scope global class names that leak between lanes (e.g. `.tr-*` in `31-region.css`).
3. Data QA from `data/README.md`: 158 field conflicts (71 factual) to settle at the source; records whose `status_note`
   reads like a research note (e.g. Gram's Place); time texts quoting "TBD"; hotels to re-check (Beach Drive Inn for sale,
   Hyde Park Hotel and Tahitian Inn state licenses delinquent, Hilton St. Petersburg Bayfront sold to a condo developer).
4. A whole-site UX audit (`scripts/shots.mjs` on every page family, 390/820/1440, both editions, `--states`), the "Loading
   today's listings…" band checked in a real browser, a completeness critic, then README with screenshots.
5. `node build.mjs`, commit `docs/` with the sources, push the branch, fast-forward `main`.
