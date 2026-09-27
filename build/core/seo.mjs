/* ============================================================
   build/core/seo.mjs · OWNER: E1 (build engine; ported from Cincy Week)
   JSON-LD builders (schema.org), sitemap, robots and the 404 page.
   JSON-LD only states facts from data; unknown fields are left out.
   Types: places → TouristAttraction plus the specific type (Museum, Park,
   Beach, Zoo, Aquarium, AmusementPark, Restaurant, …); stays → LodgingBusiness
   (Hotel, Resort, BedAndBreakfast, Hostel, Motel, Campground); events → Event;
   experiences → TouristTrip with a provider; areas and regions → Place
   (TouristDestination); routes → TouristTrip with an itinerary.
   ============================================================ */
import { esc } from "./util.mjs";
import { icon } from "./icons.mjs";
import { isoLocal } from "./time.mjs";

const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length) ? undefined : v)));
const CTX = "https://schema.org";

/** place kind → schema.org type (TouristAttraction is always added for visitor places). */
export const PLACE_TYPE = {
  museum: "Museum", gallery: "ArtGallery", "science-center": "Museum", zoo: "Zoo", aquarium: "Aquarium", "theme-park": "AmusementPark",
  "water-park": "AmusementPark", park: "Park", "state-park": "Park", "nature-preserve": "Park", garden: "Park", trail: "Park", beach: "Beach",
  island: "LandmarksOrHistoricalBuildings", pier: "TouristAttraction", waterfront: "TouristAttraction", "historic-site": "LandmarksOrHistoricalBuildings",
  "historic-district": "LandmarksOrHistoricalBuildings", landmark: "LandmarksOrHistoricalBuildings", cemetery: "Cemetery",
  "house-of-worship": "PlaceOfWorship", "performing-arts": "PerformingArtsTheater", "music-venue": "MusicVenue", "arena-stadium": "StadiumOrArena",
  sports: "SportsActivityLocation", casino: "Casino", restaurant: "Restaurant", "cafe-bakery": "CafeOrCoffeeShop", "food-hall": "FoodEstablishment",
  bar: "BarOrPub", brewery: "Brewery", "distillery-winery": "Distillery", nightlife: "NightClub", market: "Store", shopping: "ShoppingCenter",
  district: "Place", "visitor-center": "TouristInformationCenter", attraction: "TouristAttraction",
};
const EAT = new Set(["restaurant", "cafe-bakery", "food-hall", "bar", "brewery", "distillery-winery", "nightlife"]);
export const STAY_TYPE = { hotel: "Hotel", resort: "Resort", "boutique-hotel": "Hotel", "historic-hotel": "Hotel", "extended-stay": "Hotel", motel: "Motel", inn: "Hotel", "bed-and-breakfast": "BedAndBreakfast", hostel: "Hostel", "condo-hotel": "Hotel", "casino-resort": "Resort", campground: "Campground" };

const address = (r) => (r.address ? clean({ "@type": "PostalAddress", streetAddress: r.address, addressLocality: r.city, addressRegion: r.state, postalCode: r.zip, addressCountry: "US" }) : null);
const geo = (r) => (r.lat != null && r.lng != null ? { "@type": "GeoCoordinates", latitude: r.lat, longitude: r.lng } : null);
const same = (r) => [r.url, r.source_url].filter(Boolean).filter((u, i, a) => a.indexOf(u) === i);

/** A place (attraction, museum, park, beach, restaurant …). */
export function placeLd(p, { url, image } = {}) {
  const t = PLACE_TYPE[p.kind] || "TouristAttraction";
  const type = EAT.has(p.kind) || t === "TouristAttraction" || t === "Place" ? t : ["TouristAttraction", t];
  return clean({ "@context": CTX, "@type": type, name: p.name, description: p.summary, url, image, address: address(p), geo: geo(p), telephone: p.phone, isAccessibleForFree: p.is_free === true ? true : null, sameAs: same(p) });
}
/** A place to stay. */
export function stayLd(s, { url, image } = {}) {
  return clean({ "@context": CTX, "@type": STAY_TYPE[s.kind] || "LodgingBusiness", name: s.name, description: s.summary, url, image, address: address(s), geo: geo(s), telephone: s.phone, numberOfRooms: s.rooms, sameAs: same(s) });
}
/** A plain Place (a venue inside an Event, an area). */
export function simplePlace(r) {
  return clean({ "@type": "Place", name: r.name, address: address(r), geo: geo(r) });
}
/** One event instance. */
export function eventLd(ev, inst, { url } = {}) {
  const status = { cancelled: "EventCancelled", postponed: "EventPostponed", changed: "EventRescheduled" }[ev.status] || "EventScheduled";
  const dated = !inst || inst.timeUnknown || inst.allDay || inst.run;
  return clean({
    "@context": CTX, "@type": "Event", name: ev.title, url, description: ev.summary,
    startDate: !inst ? ev.date : dated ? inst.date : isoLocal(inst.s), endDate: inst?.run ? inst.through : !inst || inst.endUnknown || dated ? (ev.end_date || null) : isoLocal(inst.e),
    location: ev.venue ? simplePlace(ev.venue) : ev.location_text ? { "@type": "Place", name: ev.location_text } : null,
    eventStatus: `https://schema.org/${status}`, eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    isAccessibleForFree: ev.is_free === true ? true : null, sameAs: ev.url ? [ev.url] : null,
  });
}
/** An experience (a tour, a cruise, a water taxi). */
export function experienceLd(x, { url } = {}) {
  return clean({ "@context": CTX, "@type": "TouristTrip", name: x.name, description: x.summary, url, provider: x.operator ? clean({ "@type": "Organization", name: x.operator, url: x.url }) : null, sameAs: same(x) });
}
/** An area or a region (a sheet). */
export function destinationLd(r, { url } = {}) {
  return clean({ "@context": CTX, "@type": ["Place", "TouristDestination"], name: r.name, description: r.summary || r.lede, url, geo: geo(r) });
}
/** A Passage (route): a TouristTrip with its stops as an ItemList. */
export function routeLd(rt, { url, stopUrl = () => null } = {}) {
  return clean({
    "@context": CTX, "@type": "TouristTrip", name: rt.title, description: rt.lede, url,
    itinerary: { "@type": "ItemList", itemListElement: (rt.stopsResolved || []).map((s, i) => clean({ "@type": "ListItem", position: i + 1, name: s.rec.name || s.rec.title, url: stopUrl(s) })) },
  });
}

export function sitemap(siteBase, pages) {
  const urls = pages.filter((p) => !p.noindex).map((p) => `<url><loc>${esc(siteBase + (p.path === "index.html" ? "" : p.path))}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
export const robots = (siteBase) => `User-agent: *\nAllow: /\nSitemap: ${siteBase}sitemap.xml\n`;

/** 404: "This spot isn't on the chart." root = pathPrefix, so every link is absolute. */
export function notFoundPage() {
  return {
    path: "404.html", slug: "404", nav: "", title: "Page not found", noindex: true, crumbs: [], pagenav: null,
    description: "That page isn’t in the guide. Search it, or go to What's On.",
    body: (root) => `<div class="nf">
<p class="kicker label"><span>404 · Page not found</span></p>
<h1>This spot isn’t on the chart.</h1>
<p class="lede">The page may have moved, or the link has a typo. Search the guide, or start from the overview.</p>
<div class="btn-row spaced"><button class="btn btn-primary" type="button" data-search-open>${icon("search")}Search the guide</button><a class="btn btn-secondary" href="${root}whats-on.html">${icon("calendar")}What's On</a><a class="btn btn-secondary" href="${root}index.html">${icon("home")}Overview</a></div>
</div>`,
  };
}
