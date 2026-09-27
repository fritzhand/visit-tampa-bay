export const meta = {
  name: 'tampa-research',
  description: 'Deep-research Tampa Bay slices into sourced JSON, then adversarially verify each slice',
  whenToUse: 'Research slices for the Tampa Bay Chartbook (args: [{slice, scope, target}])',
  phases: [
    { title: 'Research', detail: 'one agent per slice writes research/<slice>/<slice>.json' },
    { title: 'Verify', detail: 'a skeptic re-reads every source, fixes or drops records, fills gaps' },
  ],
}

const REPO = '/home/user/visit-tampa-bay'
const COMMON = `You are a research agent for **Tampa Bay Chartbook**, an independent, source-linked visitor's guide to Tampa Bay
(repo ${REPO}). Today is Sunday, Sep 27, 2026. Before anything else read these three files completely:
${REPO}/SPEC.md (sections 1, 2 and 4), ${REPO}/research/SCHEMA.md, ${REPO}/research/README.md (the slice table and the SHARED IDS).

Non-negotiable rules:
- Never invent a fact. Every record's facts come from a page you actually opened (WebFetch) during this task; that page is
  its source_url (prefer the business's / organizer's / government's own page; Visit Tampa Bay or Visit St. Pete-Clearwater
  or Wikipedia are acceptable as also_sources or when nothing better exists). Unknown = null. No "TBA", "Varies", guesses.
- Your own words in summary are plain and factual, no marketing adjectives; superlatives only attributed to the source.
- quote = verbatim text copied from the page, <= 40 words, or null.
- Check that each place is OPEN now (Sep 2026): Hurricanes Helene and Milton (2024) damaged many Pinellas beach properties;
  search "<name> closed" / "<name> reopening" when in doubt, and record status + status_note with the source.
- Coordinates via: node ${REPO}/research/tools/geocode.mjs "<street address>"  (or --name "<name>" --near lat,lng).
  Check the "matched" text is really the place and that the point is in the record's area.
- Tools: WebSearch for discovery; WebFetch to read pages (it gets through sites that block curl); Bash for the geocoder
  and validator. Official tourism listings (https://www.visittampabay.com/ , https://www.visitstpeteclearwater.com/ ) are
  excellent discovery lists: page through their category listings to find candidates you would otherwise miss.
- Write ONLY inside ${REPO}/research/<your slice>/ (the geocoder appends to its shared cache; that is fine). Never run git.
  Never edit other slices, SPEC.md, SCHEMA.md or the tools.
- Save your JSON file early and often (rewrite it after every 10-15 records) so work survives an interruption.
- Finish by running: node ${REPO}/research/tools/check-slice.mjs <slice>  and fix every error (read the warnings).
- The "report" field (markdown string) must say: what you covered, how you found candidates (which lists/searches),
  counts by kind/area, what you deliberately left out and why, and open questions for the verifier.`

const RESEARCH_SCHEMA = {
  type: 'object',
  properties: {
    slice: { type: 'string' },
    counts: { type: 'object', additionalProperties: { type: 'number' } },
    validator_clean: { type: 'boolean' },
    gaps: { type: 'array', items: { type: 'string' } },
  },
  required: ['slice', 'counts', 'validator_clean', 'gaps'],
}
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    slice: { type: 'string' },
    records_checked: { type: 'number' },
    fixed: { type: 'number' },
    removed: { type: 'number' },
    added: { type: 'number' },
    validator_clean: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['slice', 'records_checked', 'fixed', 'removed', 'added', 'validator_clean', 'issues'],
}

const research = (s) => agent(`${COMMON}

## Your slice: \`${s.slice}\`
Output file: ${REPO}/research/${s.slice}/${s.slice}.json  (the "slice" field must be "${s.slice}").

Scope:
${s.scope}

Target: ${s.target}

Work method: (1) build a candidate list from several independent discovery routes (official tourism category listings,
WebSearch queries by area and by kind, Wikipedia lists, chain/brand locators, government pages); (2) for each candidate,
open its own page and fill the record from it; geocode; (3) save often; (4) run the validator until clean.
Breadth AND accuracy both matter: a missing major item is a defect, and so is a single invented fact.

Return the structured summary (counts per collection, whether the validator is clean, known gaps).`, { label: `research:${s.slice}`, phase: 'Research', schema: RESEARCH_SCHEMA })

const verify = (r, s) => agent(`${COMMON}

## You are the adversarial VERIFIER for slice \`${s.slice}\`
File: ${REPO}/research/${s.slice}/${s.slice}.json  (written by another agent; treat every record as suspect).
Scope of the slice:
${s.scope}
The researcher reported: ${JSON.stringify(r || {}).slice(0, 1500)}

Do all of this:
1. ACCURACY — for EVERY record, open its source_url with WebFetch (you may ask one WebFetch prompt to extract all the
   fields you need from a page) and confirm: the thing exists and is current (open / scheduled for the stated dates),
   name, address, dates/times, prices, hours, kind, each claim in summary, and that quote is verbatim. Fix wrong fields
   from the source; set unsupported fields to null; delete records that are closed for good (unless heritage makes a
   closed site worth keeping with status "closed"), cannot be supported by any page, are duplicates, or are out of scope.
   For events: the date/time must be on the organizer's or venue's own page for THIS year's edition, not last year's.
2. PLACE — spot-check coordinates: re-geocode addresses where the point looks off; the area id must match where it is.
3. CLOSURES — for hotels, beach businesses and attractions, search for 2025–2026 closure, rebuild or rename news.
4. COMPLETENESS — look for notable omissions in the scope (search the official tourism listings and the web the way a
   visitor would) and ADD them with the same rigor (source opened, geocoded). Spend real effort here.
5. Append a "## Verification (2026-09-27)" section to the report field: how many records checked, what you fixed,
   removed (with reasons) and added.
6. Run node ${REPO}/research/tools/check-slice.mjs ${s.slice} until it has no errors.

Return the structured verification summary.`, { label: `verify:${s.slice}`, phase: 'Verify', schema: VERIFY_SCHEMA })

const results = await pipeline(args, (s) => research(s), (r, s) => verify(r, s).then((v) => ({ research: r, verify: v })))
return results
