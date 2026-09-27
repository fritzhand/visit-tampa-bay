/* ============================================================
   build/core/vocab.mjs · OWNER: E1 (build engine)
   The closed vocabularies of Tampa Bay Chartbook: a COPY of the enums in
   research/tools/schema.mjs (the build never imports from research/), plus
   the display labels and filter groups the pages use. When research/tools/
   schema.mjs gains a value, add it here too (tests/schema.test.mjs checks
   that the two lists agree whenever research/ is present).

   Regions are the six chart "sheets" (SPEC.md §3, §4.1): number n, chart
   code, name. Areas are fixed ids inside a region; a record's region is
   always derived from its area.
   ============================================================ */

export const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

/** The six sheets, in sheet order. `short` goes in badges and chips. */
export const REGIONS = {
  tampa: { n: 1, code: "TP", name: "Tampa", short: "Tampa" },
  stpete: { n: 2, code: "SP", name: "St. Petersburg", short: "St. Pete" },
  beaches: { n: 3, code: "GB", name: "Gulf Beaches", short: "Gulf Beaches" },
  clearwater: { n: 4, code: "CW", name: "Clearwater & North Pinellas", short: "Clearwater" },
  around: { n: 5, code: "AB", name: "Around the Bay", short: "Around the Bay" },
  daytrips: { n: 6, code: "DT", name: "Day Trips", short: "Day Trips" },
};
export const REGION_IDS = Object.keys(REGIONS);

/** area id → region id (SPEC §4.1), in sheet order. */
export const AREAS = {
  "downtown-tampa": "tampa", "channel-district": "tampa", "harbour-island": "tampa", "davis-islands": "tampa",
  "ybor-city": "tampa", "tampa-heights": "tampa", "hyde-park": "tampa", "west-tampa": "tampa", "seminole-heights": "tampa",
  "north-tampa": "tampa", westshore: "tampa", "south-tampa": "tampa", "east-tampa": "tampa",
  "downtown-stpete": "stpete", "grand-central": "stpete", "old-northeast": "stpete", "south-stpete": "stpete",
  "northeast-stpete": "stpete", "west-stpete": "stpete", gulfport: "stpete",
  "clearwater-beach": "beaches", "sand-key": "beaches", "indian-rocks-beach": "beaches", "madeira-beach": "beaches",
  "treasure-island": "beaches", "st-pete-beach": "beaches", "pass-a-grille": "beaches", "fort-de-soto": "beaches",
  "downtown-clearwater": "clearwater", dunedin: "clearwater", "safety-harbor": "clearwater", "tarpon-springs": "clearwater",
  "palm-harbor": "clearwater", oldsmar: "clearwater", largo: "clearwater",
  "temple-terrace": "around", brandon: "around", "apollo-beach": "around", "plant-city": "around",
  "lutz-wesley-chapel": "around", "west-pasco": "around",
  "bradenton-anna-maria": "daytrips", sarasota: "daytrips", "nature-coast": "daytrips", polk: "daytrips",
};
export const AREA_IDS = Object.keys(AREAS);
/** Our taxonomy's names for the fixed areas (SPEC §4.1). An areas.json record's `name` wins when present. */
export const AREA_NAMES = {
  "downtown-tampa": "Downtown Tampa", "channel-district": "Channel District", "harbour-island": "Harbour Island",
  "davis-islands": "Davis Islands", "ybor-city": "Ybor City", "tampa-heights": "Tampa Heights", "hyde-park": "Hyde Park",
  "west-tampa": "West Tampa", "seminole-heights": "Seminole Heights", "north-tampa": "North Tampa", westshore: "Westshore",
  "south-tampa": "South Tampa", "east-tampa": "East Tampa",
  "downtown-stpete": "Downtown St. Petersburg", "grand-central": "Grand Central", "old-northeast": "Old Northeast",
  "south-stpete": "South St. Petersburg", "northeast-stpete": "Northeast St. Petersburg", "west-stpete": "West St. Petersburg",
  gulfport: "Gulfport",
  "clearwater-beach": "Clearwater Beach", "sand-key": "Sand Key", "indian-rocks-beach": "Indian Rocks Beach",
  "madeira-beach": "Madeira Beach", "treasure-island": "Treasure Island", "st-pete-beach": "St. Pete Beach",
  "pass-a-grille": "Pass-a-Grille", "fort-de-soto": "Fort De Soto",
  "downtown-clearwater": "Downtown Clearwater", dunedin: "Dunedin", "safety-harbor": "Safety Harbor",
  "tarpon-springs": "Tarpon Springs", "palm-harbor": "Palm Harbor", oldsmar: "Oldsmar", largo: "Largo",
  "temple-terrace": "Temple Terrace", brandon: "Brandon", "apollo-beach": "Apollo Beach", "plant-city": "Plant City",
  "lutz-wesley-chapel": "Lutz & Wesley Chapel", "west-pasco": "West Pasco",
  "bradenton-anna-maria": "Bradenton & Anna Maria", sarasota: "Sarasota", "nature-coast": "Nature Coast", polk: "Polk County",
};
export const AREA_KINDS = ["neighborhood", "district", "city", "beach-town", "island", "county-area"];

export const PLACE_KINDS = [
  "theme-park", "water-park", "zoo", "aquarium", "museum", "gallery", "science-center", "historic-site", "historic-district",
  "landmark", "performing-arts", "music-venue", "arena-stadium", "sports", "park", "beach", "state-park", "nature-preserve",
  "garden", "trail", "island", "pier", "waterfront", "district", "shopping", "market", "food-hall", "restaurant",
  "cafe-bakery", "bar", "brewery", "distillery-winery", "nightlife", "casino", "cemetery", "house-of-worship",
  "visitor-center", "attraction",
];
export const TOPICS = ["history", "arts", "family", "outdoors", "beaches", "water", "wildlife", "food", "drink", "nightlife",
  "sports", "shopping", "thrills", "music", "latin-heritage", "black-history", "lgbtq"];
export const STATUS = ["open", "seasonal", "temporarily-closed", "opening-soon", "closed"];
export const STAY_KINDS = ["hotel", "resort", "boutique-hotel", "historic-hotel", "extended-stay", "motel", "inn",
  "bed-and-breakfast", "hostel", "condo-hotel", "casino-resort", "campground"];
export const STAY_FEATURES = ["beachfront", "waterfront", "bay-view", "pool", "spa", "fitness", "restaurant", "rooftop-bar",
  "pet-friendly", "airport-shuttle", "cruise-shuttle", "golf", "marina", "casino", "all-suites", "kitchens",
  "free-breakfast", "free-parking", "ev-charging", "historic", "adults-only", "accessible-rooms", "meeting-space"];
export const EXPERIENCE_KINDS = ["water-taxi", "ferry", "cruise", "dinner-cruise", "dolphin-tour", "sailing", "boat-rental",
  "kayak-paddle", "fishing", "parasail-jetski", "airboat", "eco-tour", "snorkel-dive", "walking-tour", "ghost-tour",
  "food-tour", "drink-tour", "cigar", "bike-segway", "trolley-bus-tour", "helicopter-air", "class-workshop",
  "animal-encounter", "adventure", "behind-the-scenes", "show", "other"];
export const EVENT_KINDS = ["festival", "parade", "fair", "concert", "sports", "theater", "comedy", "dance", "classical",
  "film", "exhibition", "holiday", "market", "food-drink", "run-walk", "cultural", "family", "tour", "fireworks",
  "boat-show", "convention", "talk", "other"];
export const EVENT_STATUS = ["scheduled", "tentative", "changed", "postponed", "cancelled"];
export const TRANSPORT_MODES = ["airport", "streetcar", "water-taxi", "ferry", "bus", "brt", "trolley", "microtransit",
  "bike-share", "scooter", "rail", "intercity-bus", "cruise-port", "parking", "toll", "rideshare", "car-rental", "trail"];
export const ERAS = ["indigenous", "spanish", "frontier", "boomtown", "land-boom", "postwar", "modern"];
export const LICENSES = ["public-domain", "cc0", "cc-by", "cc-by-sa", "us-gov"];
export const GEO_SOURCES = ["census", "photon", "official", "wikipedia", "osm", "manual"];
export const MEDIA_SUBJECTS = ["place", "stay", "area", "region", "timeline", "event", "series", "experience"];
export const ROUTE_STOP_KINDS = ["place", "stay", "experience", "event"];
/** The default data window (site.config.json dataWindow must equal it; research uses the same). */
export const DATE_WINDOW = { start: "2026-09-28", end: "2027-04-30" };
/** Coordinates must fall inside this box (Hernando to Sarasota, Gulf to Polk). */
export const BOX = { s: 26.9, n: 29.0, w: -83.0, e: -81.4 };

/* ---------------- labels (plain words; pages print these, never raw ids) ---------------- */
const words = (arr, special = {}) => Object.fromEntries(arr.map((k) => [k, special[k] || k.charAt(0).toUpperCase() + k.slice(1).replace(/-/g, " ")]));

export const PLACE_KIND_LABEL = words(PLACE_KINDS, {
  "theme-park": "Theme park", "water-park": "Water park", "science-center": "Science center", "historic-site": "Historic site",
  "historic-district": "Historic district", "performing-arts": "Performing arts", "music-venue": "Music venue",
  "arena-stadium": "Arena or stadium", "state-park": "State park", "nature-preserve": "Nature preserve",
  "food-hall": "Food hall", "cafe-bakery": "Café or bakery", "distillery-winery": "Distillery or winery",
  "house-of-worship": "House of worship", "visitor-center": "Visitor center",
});
export const TOPIC_LABEL = words(TOPICS, { "latin-heritage": "Latin heritage", "black-history": "Black history", lgbtq: "LGBTQ+" });
export const STATUS_LABEL = { open: "Open", seasonal: "Seasonal", "temporarily-closed": "Temporarily closed", "opening-soon": "Opening soon", closed: "Closed" };
export const STAY_KIND_LABEL = words(STAY_KINDS, {
  "boutique-hotel": "Boutique hotel", "historic-hotel": "Historic hotel", "extended-stay": "Extended stay",
  "bed-and-breakfast": "Bed and breakfast", "condo-hotel": "Condo hotel", "casino-resort": "Casino resort",
});
export const FEATURE_LABEL = words(STAY_FEATURES, {
  "bay-view": "Bay view", "rooftop-bar": "Rooftop bar", "pet-friendly": "Pet friendly", "airport-shuttle": "Airport shuttle",
  "cruise-shuttle": "Cruise shuttle", "all-suites": "All suites", "free-breakfast": "Free breakfast", "free-parking": "Free parking",
  "ev-charging": "EV charging", "adults-only": "Adults only", "accessible-rooms": "Accessible rooms", "meeting-space": "Meeting space",
});
export const EXPERIENCE_KIND_LABEL = words(EXPERIENCE_KINDS, {
  "water-taxi": "Water taxi", "dinner-cruise": "Dinner cruise", "dolphin-tour": "Dolphin tour", "boat-rental": "Boat rental",
  "kayak-paddle": "Kayak and paddleboard", "parasail-jetski": "Parasail and jet ski", "eco-tour": "Eco tour",
  "snorkel-dive": "Snorkel and dive", "walking-tour": "Walking tour", "ghost-tour": "Ghost tour", "food-tour": "Food tour",
  "drink-tour": "Drink tour", cigar: "Cigar rolling and factory tour", "bike-segway": "Bike and Segway tour",
  "trolley-bus-tour": "Trolley and bus tour", "helicopter-air": "Helicopter and air tour", "class-workshop": "Class or workshop",
  "animal-encounter": "Animal encounter", "behind-the-scenes": "Behind the scenes", other: "Experience",
});
export const EVENT_KIND_LABEL = words(EVENT_KINDS, { "food-drink": "Food and drink", "run-walk": "Run or walk", "boat-show": "Boat show", other: "Event" });
export const EVENT_STATUS_LABEL = { scheduled: "", tentative: "Tentative", changed: "Changed", postponed: "Postponed", cancelled: "Cancelled" };
export const MODE_LABEL = words(TRANSPORT_MODES, {
  brt: "Bus rapid transit", "water-taxi": "Water taxi", "bike-share": "Bike share", "intercity-bus": "Intercity bus",
  "cruise-port": "Cruise port", "car-rental": "Car rental",
});
export const AREA_KIND_LABEL = words(AREA_KINDS, { "beach-town": "Beach town", "county-area": "County area" });
/** Eras with their year spans (SCHEMA.md): the history page's chapters. */
export const ERA_LABEL = {
  indigenous: "Before 1528", spanish: "Spanish Florida, 1528–1820", frontier: "Frontier, 1821–1883", boomtown: "Boomtown, 1884–1919",
  "land-boom": "Land boom, 1920–1945", postwar: "Postwar, 1946–1979", modern: "Modern, 1980 to today",
};
export const ERA_NAME = { indigenous: "First peoples", spanish: "Spanish Florida", frontier: "Frontier", boomtown: "Boomtown", "land-boom": "Land boom", postwar: "Postwar", modern: "Modern" };
export const ERA_SPAN = { indigenous: [null, 1527], spanish: [1528, 1820], frontier: [1821, 1883], boomtown: [1884, 1919], "land-boom": [1920, 1945], postwar: [1946, 1979], modern: [1980, null] };
export const LICENSE_LABEL = { "public-domain": "Public domain", cc0: "CC0", "cc-by": "CC BY", "cc-by-sa": "CC BY-SA", "us-gov": "U.S. government work" };

/* ---------------- filter groups (pages filter by group or by a single kind) ---------------- */
/** Event kind → group (whats-on.html ?k= takes a group or a single kind, like Cincy Week's kind groups). */
export const EVENT_GROUP = {
  festival: "festivals", parade: "festivals", fair: "festivals", holiday: "festivals", fireworks: "festivals", cultural: "festivals",
  concert: "shows", theater: "shows", comedy: "shows", dance: "shows", classical: "shows", film: "shows",
  sports: "sports", "run-walk": "sports",
  exhibition: "arts", talk: "arts", tour: "arts",
  market: "food", "food-drink": "food",
  family: "family",
  "boat-show": "other", convention: "other", other: "other",
};
export const EVENT_GROUP_LABEL = { festivals: "Festivals and parades", shows: "Music and shows", sports: "Sports", arts: "Arts and talks", food: "Food and markets", family: "Family", other: "Other" };

/** Place kind → group. The Explore pages draw from these: things-to-do (see, do, shop, sports), outdoors,
 *  history, eat-drink. A place shows on every page one of its kinds (kind + kinds[]) belongs to. */
export const PLACE_GROUP = {
  "theme-park": "attractions", "water-park": "attractions", zoo: "attractions", aquarium: "attractions", "science-center": "attractions",
  attraction: "attractions", casino: "attractions",
  museum: "arts", gallery: "arts", "performing-arts": "arts", "music-venue": "arts",
  "historic-site": "history", "historic-district": "history", landmark: "history", cemetery: "history", "house-of-worship": "history",
  park: "outdoors", beach: "outdoors", "state-park": "outdoors", "nature-preserve": "outdoors", garden: "outdoors", trail: "outdoors",
  island: "outdoors", pier: "outdoors", waterfront: "outdoors",
  "arena-stadium": "sports", sports: "sports",
  district: "shopping", shopping: "shopping", market: "shopping",
  "food-hall": "eat", restaurant: "eat", "cafe-bakery": "eat", bar: "drink", brewery: "drink", "distillery-winery": "drink", nightlife: "drink",
  "visitor-center": "info",
};
export const PLACE_GROUP_LABEL = { attractions: "Attractions", arts: "Museums and the arts", history: "Historic places", outdoors: "Beaches and outdoors", sports: "Sports venues", shopping: "Districts, markets and shopping", eat: "Places to eat", drink: "Places to drink", info: "Visitor information" };
/** Which page a place kind lives on (detail pages' nav parent and the Explore pages' filters). */
export const EAT_DRINK_KINDS = PLACE_KINDS.filter((k) => ["eat", "drink"].includes(PLACE_GROUP[k]));
export const OUTDOOR_KINDS = PLACE_KINDS.filter((k) => PLACE_GROUP[k] === "outdoors");
export const HISTORY_KINDS = PLACE_KINDS.filter((k) => PLACE_GROUP[k] === "history");

/** Experience kind → group (experiences.html ?k= takes a group or a single kind). */
export const EXPERIENCE_GROUP = {
  "water-taxi": "water", ferry: "water", cruise: "water", "dinner-cruise": "water", "dolphin-tour": "water", sailing: "water",
  "boat-rental": "water", "kayak-paddle": "water", fishing: "water", "parasail-jetski": "water", airboat: "water", "eco-tour": "water",
  "snorkel-dive": "water",
  "walking-tour": "tours", "ghost-tour": "tours", "trolley-bus-tour": "tours", "bike-segway": "tours", "helicopter-air": "tours", "behind-the-scenes": "tours",
  "food-tour": "taste", "drink-tour": "taste", cigar: "taste", "class-workshop": "taste",
  "animal-encounter": "adventure", adventure: "adventure", show: "adventure", other: "adventure",
};
export const EXPERIENCE_GROUP_LABEL = { water: "On the water", tours: "Tours", taste: "Food, drink and cigars", adventure: "Animals, adventure and shows" };
