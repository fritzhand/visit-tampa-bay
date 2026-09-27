export const meta = {
  name: 'tampa-merge',
  description: 'Write scripts/merge-research.mjs and merge the research slices into data/',
  phases: [{ title: 'Merge', detail: 'research/* -> data/*.json with logged decisions' }],
}
const REPO = '/home/user/visit-tampa-bay', CW = '/home/user/cincy-week'
const prompt = `You are the MERGE agent for **Tampa Bay Chartbook** (repo ${REPO}). Read, in order: ${REPO}/SPEC.md (all, especially §2 and
§7, the owner's coordinates policy), ${REPO}/CLAUDE.md, ${REPO}/build/CONTRACTS.md, ${REPO}/research/README.md, ${REPO}/research/SCHEMA.md,
${REPO}/build/core/schema.mjs. For the pattern, read ${CW}/scripts/merge-research.mjs, ${CW}/scripts/merge-lib.mjs and ${CW}/data/README.md.
Research verifier agents are STILL editing some research/<slice>/ files: never write research/. Never run git commit. Other agents may be
building pages later: you own ONLY scripts/merge-research.mjs (+ scripts/merge-lib.mjs if you split it), data/*.json (except data/map.json and
data/images.json), data/README.md, data/aliases.json, and tests/merge.test.mjs.

Write scripts/merge-research.mjs (zero dependencies, Node >= 18) that deterministically turns research/*/<slice>.json into data/*.json:
regions areas places stays experiences events series timeline transport faqs facts media (+ an empty routes.json if absent, and aliases.json).
Requirements:
1. Union by id within each collection. Same id in several slices = the same thing: merge field by field with an explicit OWNER table
   (which slice's value wins per collection/field: venues-bay owns venue facts; see-* own attraction facts; history-* own heritage blocks;
   eat-* own food facts; stays-* own hotel facts; outdoors owns parks/beaches; events-* own their events; the verifier-edited value wins
   over an unverified one). Lists (kinds, topics, tags, also_sources, aliases, features) are unions; heritage blocks merge (designations
   union by name+ref; story/visiting from the history slice). Log every field conflict (both values + slices) in data/README.md's
   conflicts table so QA can settle them from the sources; never average or invent.
2. Ids must be unique ACROSS places stays experiences events series areas regions (one URL/share-code space). Resolve collisions with a named
   table (e.g. a series whose id equals a place id gets a "-series" suffix; a historic hotel that is both a place and a stay is ONE stay: fold
   the place's heritage/tags into the stay and drop the place, rewriting references). Log each.
3. Fuzzy duplicates within a collection (normalized name match, or same street address, and within ~150 m): merge with a logged
   decision table (DUP_MERGES) you review by hand; do not auto-merge distinct things (two locations of one chain are distinct).
4. References: event.place (resolve location_text to a place id through names/aliases when it clearly names one), event.series,
   experience.departs_place, timeline.places (ids that exist as places or stays; map obvious slug variants; drop unknowns with a log),
   timeline.media, media.subject (drop media whose subject is gone, log), transport.stops[].place. The build must find zero dangling refs.
5. Coordinates (SPEC §7): per record keep the most accurate point: official > an OpenStreetMap feature matched by name (geo_source photon or
   osm) > census > wikipedia > manual. When duplicates disagree by > 250 m, keep the higher-ranked one and list the case in data/README.md for
   QA. Records with lat/lng but no geo_source: re-geocode (node research/tools/geocode.mjs) or mark per what the research notes say; never
   guess. Records without coordinates that have a street address: try the geocoder (Census, then Photon by name with --near the area center)
   and accept only a match whose matched text is clearly the record (log accepted/rejected). Cache everything (the tool caches).
6. Status: a record another slice marks closed/temporarily-closed while its owner says open -> keep the more recent 'checked' evidence and log
   it for QA. Drop places closed for good unless they carry heritage (then keep with status closed).
7. regions.json + areas.json from the areas slice (all 6 regions, all 45 areas). events: sort by date/start/title; others by id.
8. Validate with the build's own schema (import build/core/schema.mjs / load.mjs, or run the build) BEFORE writing; --check validates and
   writes nothing; --offline uses only the geocode cache. Write data/README.md: how to regenerate, counts per file and per region
   (a table), provenance per file, the policies (owner table, collision table, dup table, coordinates, closures), and the conflicts list.
9. tests/merge.test.mjs: small unit tests of the merge helpers (field merge, collision rename, coordinate ranking).
10. Run it for real now (the research is ~90% verified; you will be re-run later), then: node build.mjs must pass (read every warning group;
    fix what is the merge's fault), npm test must pass, and re-run node scripts/build-basemap.mjs so the basemap picks up the final area labels
    (it reads data/areas.json; if its label check fails on an area name, report it rather than editing the basemap script).
Also report data-quality findings a QA pass should look at: counts per collection and region, records without coordinates, without summary,
without url, conflicts count, suspicious values (prices/hours that look like guesses, quotes over 40 words, dates on weekdays that do not
match the source's day name if the description names one).
Return a concise report.`
phase('Merge')
return await agent(prompt, { label: 'merge', phase: 'Merge' })
