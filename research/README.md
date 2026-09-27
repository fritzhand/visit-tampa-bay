# research/ — the sourced research behind data/

Each folder is one **slice**: one agent's research on one part of Tampa Bay, in the final record shapes
(`SCHEMA.md`, machine definition `tools/schema.mjs`). `scripts/merge-research.mjs` unites the slices into `data/`.
After the merge, `data/*.json` is the source of truth and this folder is a frozen snapshot kept for provenance.

## Tools

```sh
node research/tools/check-slice.mjs <slice>          # validate a slice (exit 1 on errors); --all for every slice
node research/tools/geocode.mjs "<street address>"    # → { lat, lng, geo_source: "census", matched }
node research/tools/geocode.mjs --name "<name>" --near 27.77,-82.64    # → OpenStreetMap (Photon) match
```

Web research uses the WebSearch and WebFetch tools (WebFetch reads sites that block curl). `curl` works for many
official sites and APIs if you add a browser User-Agent.

## Slices

| slice | scope | collections |
|---|---|---|
| `stays-tampa-core` | hotels in downtown Tampa, Channel District/Water Street, Harbour Island, Davis Islands, Ybor City, Tampa Heights, Hyde Park/SoHo, West Tampa, Seminole Heights, South Tampa | stays |
| `stays-tampa-outer` | hotels in Westshore/airport/Rocky Point, North Tampa (Busch Gardens, USF, New Tampa, Carrollwood), East Tampa, and Around the Bay (Temple Terrace, Brandon, Riverview, Apollo Beach, Ruskin, Plant City, Lutz, Wesley Chapel, West Pasco) | stays |
| `stays-stpete-pinellas` | hotels in St. Petersburg (every area), Gulfport, Clearwater mainland, Dunedin, Safety Harbor, Tarpon Springs, Palm Harbor/Innisbrook, Oldsmar, Largo/Seminole/Pinellas Park | stays |
| `stays-beaches` | hotels, resorts, motels and inns on the Gulf beaches, Clearwater Beach to Tierra Verde (hurricane status!) | stays |
| `see-tampa` | Tampa attractions: theme parks, zoo, aquarium, museums, galleries, science center, districts, waterfront, markets, shopping, casinos, landmarks (not performing-arts/event venues, parks or restaurants) | places |
| `see-pinellas` | the same for St. Petersburg, the Gulf beaches, Clearwater and North Pinellas | places |
| `venues-bay` | every event venue bay-wide: arenas, stadiums, ballparks, amphitheaters, theaters, concert halls, music clubs, comedy clubs, convention centers, fairgrounds, event parks, racetracks | places |
| `outdoors` | beaches, parks, state parks, preserves, trails, islands, springs, gardens bay-wide and on day trips; campgrounds and park cabins | places, stays (campgrounds) |
| `around-daytrips` | attractions (not nature) Around the Bay and on Day Trips: Plant City, Dade City, Apollo Beach, Bradenton, Anna Maria, Sarasota, Polk (Legoland, Bok Tower) | places |
| `exp-water` | on-the-water experiences: water taxis, ferries, cruises, dinner cruises, dolphin tours, sailing, rentals, kayak/paddle, fishing charters, parasail/jet ski, airboats, eco-tours, manatee swims, snorkel/dive | experiences |
| `exp-land` | land experiences: walking, history and ghost tours, food and drink tours, cigar factory tours and rolling, bike/Segway, trolley tours, helicopter, classes, animal encounters, behind-the-scenes, adventure parks, shows | experiences |
| `eat-tampa` | where to eat and drink in Tampa and Around the Bay: historic and signature restaurants, Cuban sandwiches and bakeries, Michelin Guide picks, food halls, breweries, bars, rooftop bars, markets | places |
| `eat-pinellas` | the same for St. Petersburg, the beaches, Clearwater, North Pinellas (Tarpon Springs Greek food, Dunedin breweries) and day trips | places |
| `events-fall` | dated festivals, fairs, parades, holiday events, markets, cultural and community events Sep 28 – Dec 31, 2026 | events, series |
| `events-spring` | the same Jan 1 – Apr 30, 2027, plus the annual signature calendar (Gasparilla, the State Fair, the Strawberry Festival, Epiphany…) | events, series |
| `events-sports` | home games and races in the window: Lightning, Buccaneers, USF, Rowdies, Tampa Bay Sun, spring training, bowl games, the Grand Prix, the Valspar, Tampa Bay Downs, marathons | events, series |
| `events-shows` | concerts, Broadway and theater seasons, orchestra, comedy, big touring shows at the major venues | events |
| `history-tampa` | historic sites and districts in Tampa (heritage blocks), with Commons images | places, media |
| `history-region` | historic sites and districts in Pinellas, Around the Bay and Day Trips (heritage blocks), with Commons images | places, stays (historic hotels), media |
| `timeline` | eras and 60–100 dated milestones of Tampa Bay history (reuses fritzhand/history-of-tampa's cited data) | timeline, media, facts |
| `getting-around` | airports, streetcar, water taxis, ferries, buses, BRT, trolleys, microtransit, bike share, rail, cruise port, parking, tolls | transport, faqs, facts |
| `practical` | when to visit (climate normals by month), hurricane season, beach safety, red tide, lightning, taxes, beach rules, visitor centers, accessibility | faqs, facts, places |
| `areas` | the six regions and every area in SPEC §4.1: a factual lede, center point, known-for list | regions, areas |

## Shared ids (use these exact ids for these places, in any slice)

Event venues and big attractions many slices refer to. `venues-bay` and the `see-*` slices create the records;
event slices point `place` at them.

- Tampa: `benchmark-international-arena` (formerly Amalie Arena), `raymond-james-stadium`, `george-m-steinbrenner-field`,
  `yuengling-center`, `straz-center`, `tampa-theatre`, `tampa-convention-center`, `curtis-hixon-waterfront-park`,
  `julian-b-lane-riverfront-park`, `tampa-riverwalk`, `armature-works`, `sparkman-wharf`, `water-street-tampa`,
  `florida-aquarium`, `zootampa-at-lowry-park`, `busch-gardens-tampa-bay`, `adventure-island`, `mosi`,
  `glazer-childrens-museum`, `tampa-museum-of-art`, `henry-b-plant-museum`, `tampa-bay-history-center`,
  `ybor-city-museum-state-park`, `ybor-city-historic-district`, `centennial-park-ybor`, `ritz-ybor`,
  `hard-rock-event-center`, `florida-state-fairgrounds`, `midflorida-credit-union-amphitheatre`, `tampa-bay-downs`,
  `bayshore-boulevard`, `hyde-park-village`, `international-plaza`
- St. Petersburg: `tropicana-field`, `al-lang-stadium`, `mahaffey-theater`, `jannus-live`, `palladium-theater`,
  `st-petersburg-coliseum`, `dali-museum`, `museum-of-fine-arts-st-petersburg`, `st-pete-pier`, `vinoy-park`,
  `straub-park`, `williams-park`, `james-museum`, `chihuly-collection`, `imagine-museum`, `sunken-gardens`
- Pinellas: `ruth-eckerd-hall`, `sound-at-coachman-park`, `capitol-theatre-clearwater`, `clearwater-marine-aquarium`,
  `pier-60`, `baycare-ballpark`, `td-ballpark`, `johns-pass-village`, `fort-de-soto-park`, `sponge-docks-tarpon-springs`
- Beyond: `florida-strawberry-festival-grounds`, `legoland-florida`, `ringling-museum`, `weeki-wachee-springs-state-park`

Ids for everything else follow `SCHEMA.md` (slug of the official name; the short name visitors use when the official
name is long: `straz-center`, `mosi`). A hotel that is also a landmark (the Don CeSar, the Vinoy) is a **stay** with a
`heritage` block, never also a place.
