/* ============================================================
   site/js/main.js · OWNER: E2 (client runtime; ported from Cincy Week)
   The client entry (an ES module, deferred by nature; the shell includes it
   on every page as assets/js/main.js). Boots the core, then imports each
   feature named in <body data-features="…"> from ./features/<name>.js and
   calls its init(app). Every core module is wired by attribute
   (build/CONTRACTS.md §8), so a page works with no feature at all.

   app — what features get (code against this, not against core internals):
     root, page         "" | "../" (prefix for internal URLs); <html data-page> ("whats-on", "places/florida-aquarium")
     now(), today()     epoch ms (honors ?now=) · the New York date "2026-10-24"
     onTick(fn)         fn(now) now and every 60 s (and when the tab comes back) → unsubscribe
     when(name)         [firstDate, lastDate] for today | weekend | week | month (lib/time.js whenRange)
     isSimulated()      true when ?now= set the clock (QA)
     data(name)         Promise of assets/data/<name> (events.json, event-text.json, experiences.json,
                        places-lite.json, stays-lite.json, search.json, or a lane's <lane>-<name>.json)
     store, pref        { get, set, del, blocked } for tbc-* keys · pref("<page>.<name>"[, value]) (tbc-prefs)
     trip               { has, kindOf, toggle(id, kind), add(ids, kind), remove(ids), replace({e,x,p,s}), clear(),
                          list() → { e, x, p, s }, count(kind?), subscribe(fn), refresh(root?) }
     modal              { show(el, { trigger, focus, onClose }), hide(restoreFocus = true), current() }
     toast(text, { link: href|true (= trip.html), linkText, ms })
     status             { update(now, rootEl), stateOf(elOrDataset, now) → { st, label }, statusOf(s, e, now, endUnknown) }
     filter             { mount(listEl, { tests, facets, items, root }) → controller, get(listEl) }
     share({ title, text, url }) → "shared" | "copied" | "failed", copyText(text) → bool
     openEvent(id, { trigger, push }), openExperience(id, { trigger, push }), openSearch(trigger, q)
     download(text, filename, type)
     consent            { state() → { id, choice, first: { action, reason }, loaded, open }, open(trigger) } (core/consent.js:
                        Google Analytics only after a yes; the footer's [data-consent-open] button reopens the settings)
   Pages must be served over http(s) (npm run dev): ES modules do not load from file://.
   ============================================================ */
import { ROOT, PAGE, $$ } from "./core/dom.js";
import { store, pref } from "./core/store.js";
import { initTheme } from "./core/theme.js";
import { initDrawer } from "./core/drawer.js";
import { initDock } from "./core/dock.js";
import { initModal, showModal, hideModal, current } from "./core/modal.js";
import { toast } from "./core/toast.js";
import { initSearch, openSearch } from "./core/search.js";
import { initAnchors } from "./core/anchors.js";
import { initToc } from "./core/toc.js";
import { now, today, when, onTick, isSimulated } from "./core/clock.js";
import { updateStatus, stateOf, statusOf } from "./core/status.js";
import * as trip from "./core/trip-store.js";
import { share, copyText } from "./core/share.js";
import { getJSON } from "./core/data.js";
import { initLive } from "./core/live.js";
import { initEventDialog, open as openEvent, download } from "./core/event-dialog.js";
import { initExperienceDialog, open as openExperience } from "./core/experience-dialog.js";
import { initFilters, mountFilter, getFilter } from "./core/filter.js";
import { initConsent, consentState, openConsent } from "./core/consent.js";

const app = {
  root: ROOT, page: PAGE, now, today, when, onTick, isSimulated, data: getJSON, store, pref,
  trip: { has: trip.has, kindOf: trip.kindOf, toggle: trip.toggle, add: trip.add, remove: trip.remove, replace: trip.replace, clear: trip.clear, list: trip.list, count: trip.count, subscribe: trip.subscribe, refresh: trip.refreshStars },
  modal: { show: showModal, hide: hideModal, current }, toast,
  status: { update: updateStatus, stateOf, statusOf },
  filter: { mount: mountFilter, get: getFilter },
  share, copyText, openEvent, openExperience, openSearch, download,
  consent: { state: consentState, open: openConsent },
};
window.tbc = app; // handy in the console and for Playwright checks

const safe = (name, fn) => { try { fn(); } catch (e) { console.error(`[tbc] ${name} failed`, e); } };
safe("theme", initTheme);
safe("drawer", initDrawer);
safe("dock", initDock);
safe("modal", initModal);
safe("search", initSearch);
safe("anchors", initAnchors);
safe("toc", initToc);
safe("trip", trip.initTrip);
safe("status", () => onTick((t) => updateStatus(t)));
safe("live", initLive);
safe("event dialog", initEventDialog);
safe("experience dialog", initExperienceDialog);
safe("filters", initFilters);
safe("consent", initConsent);

// views: core-provided, page-specific, loaded on demand (views/trip.js renders My Trip into [data-trip-root])
const views = document.querySelector('[data-trip-root]:not([data-trip-root="manual"])') ? [import("./views/trip.js").then((m) => m.initTripView()).catch((e) => console.error("[tbc] trip view failed", e))] : [];

const features = (document.body.dataset.features || "").split(/\s+/).filter(Boolean);
Promise.all([...views, ...features.map((f) => import(`./features/${f}.js`)
  .then((m) => m.init && m.init(app))
  .catch((e) => console.error(`[tbc] feature ${f} failed`, e)))])
  .then(() => {
    document.documentElement.classList.add("tbc-ready");
    $$("[data-js-hide]").forEach((el) => { el.hidden = true; });
    // features listening for "tbc:filter" (a map view, a count elsewhere) hear the state the page opened with
    $$("[data-filter-list]").forEach((l) => { const f = getFilter(l); if (f) f.apply({ url: false }); });
  });
