/* ============================================================
   build/pages/trip.mjs · OWNER: the What's On lane (the trip page around the core's view)
   trip.html (My Trip). No query params; a shared trip is the hash #e=<codes>;x=<codes>;p=<codes>;s=<codes>
   (site/js/lib/share.js). The list itself is the core's view (site/js/views/trip.js on [data-trip-root]): starred
   events by their next date with live words, then experiences, places and places to stay; the share link, the
   calendar file (.ics) of starred events, Clear, a shared trip's import. This module adds the page around it:
   - the page head and one line on what My Trip is (it stays in this browser; nothing is sent anywhere);
   - "Times that overlap" ([data-trip-clash], filled by site/js/features/whats-on.js from events.json): starred events
     whose listed times overlap, with the straight-line distance between the two places, said to be an estimate;
   - how it works (stars, the share link, the calendar file, print), where to find things to star (counts from the
     data), a Print button, and the no-JS note; 41-trip.css styles the view and its print sheet.
   ============================================================ */

export function pages(ctx) {
  const { c, h, db } = ctx;
  const { esc, plural, icon } = h;
  const live = db.events.filter((e) => e.live).length;
  // each Explore page's own count, selected as that page selects (tests/whats-on.test.mjs compares them with the pages'
  // result counts): Things to do lists the places whose home it is (ctx.cards.placeHome), Beaches & outdoors adds piers
  // and waterfronts, Eat & drink lists every place with an eat or drink kind
  const homeOf = (p) => (ctx.cards.placeHome ? ctx.cards.placeHome(p) : "things-to-do");
  const EAT = new Set(ctx.vocab.EAT_DRINK_KINDS || []);
  const counts = {
    "things-to-do": db.places.filter((p) => homeOf(p) === "things-to-do").length,
    outdoors: db.places.filter((p) => homeOf(p) === "outdoors" || ["pier", "waterfront"].includes(p.kind)).length,
    "eat-drink": db.places.filter((p) => (p.kindsAll || [p.kind]).some((k) => EAT.has(k))).length,
  };
  const home = (slug) => counts[slug];
  const camps = db.stays.filter((st) => st.kind === "campground").length;     // Beaches & outdoors lists its campgrounds too
  const find = [
    ["whats-on.html", "calendar", "What's On", `${plural(live, "event")}, by day`],
    ["things-to-do.html", "compass", "Things to do", `${plural(home("things-to-do"), "place")}: attractions, museums, stages, historic sites`],
    ["outdoors.html", "umbrella", "Beaches and outdoors", `${plural(home("outdoors"), "place")}${camps ? ` and ${plural(camps, "campground")}` : ""}: beaches, parks, preserves, trails`],
    ["eat-drink.html", "fork-knife", "Eat and drink", `${plural(home("eat-drink"), "place")}: restaurants, cafés, bars, breweries`],
    ["experiences.html", "boat", "Experiences and tours", plural(db.experiences.length, "tour or trip", "tours and trips")],
    ["stay.html", "anchor", "Where to stay", plural(db.stays.length, "place to stay", "places to stay")],
    ["map.html", "map", "The map", "Everything with coordinates, on one chart"],
  ].filter(([href, , , n]) => href === "map.html" || !/^0 /.test(n));
  const how = [
    ["star", "Stars", "Tap the star on any event, place, place to stay or tour. It lands here, grouped by kind, events by date."],
    ["share", "Share link", "Share my trip makes a link that carries your list in the link itself. Whoever opens it sees your list and chooses whether to add it to theirs."],
    ["download", "Calendar file", "Add to a calendar saves one .ics file with every starred event that has a date, for Apple, Google or Outlook calendars. Times are New York time."],
    ["warn", "Overlaps", "When two starred events list times that overlap on the same day, this page says so, with the straight-line distance between the two places."],
  ];
  return [{
    path: "trip.html", nav: "trip", title: "My Trip",
    description: "Your starred places, stays, experiences and events in one list, saved in this browser, with a share link, a calendar file for events and a note when two events overlap.",
    features: ["whats-on"], pageClass: "trip-page",
    body: (root) => `${c.pageHead({
      kicker: "Plan · Your list", num: 1, title: "My Trip",
      lede: "Everything you star in this guide collects here: events by date, then tours, places and places to stay.",
      after: `<p class="trip-privacy">${icon("info")}<span>Your list stays in this browser, on this device. Nothing is sent anywhere; a share link carries the list in the link itself.</span></p>`,
    })}
<section class="trip-clash" data-trip-clash hidden aria-labelledby="trip-clash-h"></section>
<div class="trip-root" data-trip-root></div>
<noscript>${c.emptyState({ title: "My Trip needs JavaScript", body: "Stars are saved by your browser. Every page of the guide works without them: each event, place and stay links to its source.", glyph: "star", level: 2 })}</noscript>
<p class="btn-row trip-print js-only"><button class="btn btn-secondary btn-sm" type="button" data-trip-print>${icon("list")}Print this list</button></p>
${c.section({ id: "how", title: "How My Trip works", kicker: "Stars, links and calendars", root, cls: "trip-how", body: `<ul class="trip-how-list">${how.map(([ic, t, d]) => `<li><span class="trip-how-i" aria-hidden="true">${icon(ic)}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join("")}</ul>` })}
${c.section({ id: "find", title: "Find things to star", root, cls: "trip-find", body: `<ul class="trip-find-list">${find.map(([href, ic, t, n]) => `<li><a href="${root}${href}">${icon(ic)}<span><span class="t">${esc(t)}</span><span class="w">${esc(n)}</span></span>${icon("arrow-r", "go")}</a></li>`).join("")}</ul>` })}`,
  }];
}
