/* ============================================================
   site/js/core/trip-store.js · OWNER: E2 (client runtime; Cincy Week's plan-store, four kinds)
   My Trip: starred events (e), experiences (x), places (p) and stays (s) in
   localStorage tbc-trip ({ v: 1, e, x, p, s, t }; lib/trip.js normalize()).
     has(id) · kindOf(id) · toggle(id, kind) → on · add(ids, kind) · remove(ids) · replace({ e, x, p, s })
     clear() · list() → { e, x, p, s } · count(kind?) · subscribe(fn) → unsubscribe · refreshStars()
   A delegated click handler drives every button.star[data-star="<id>"][data-star-kind="e|x|p|s"]
   (aria-pressed, the aria-label names the item: "Add “Tampa Theatre” to My Trip" / "Remove … from My
   Trip"). Every [data-trip-count] badge and the sidebar trip card ([data-trip-card]: [data-trip-card-title]
   "4 in My Trip", [data-trip-card-next] "Next: Sat, Oct 24 · 7:00 PM · Guavaween", else "3 places · 1 place
   to stay") update on every change, every minute, and on changes made in another tab (storage event).
   Ids are unique across the four kinds, so a star's id alone says whether it is in the trip.
   ============================================================ */
import { $, $$, esc } from "./dom.js";
import { store } from "./store.js";
import { toast } from "./toast.js";
import { getJSON } from "./data.js";
import { now, onTick } from "./clock.js";
import { normalize, total, countText, kindOf as kindIn, nextUp } from "../lib/trip.js";
import { TRIP_KINDS } from "../lib/share.js";
import { nyParts, fmtTime, fmtDay, fmtThrough, addDays } from "../lib/time.js";

const KEY = "tbc-trip";
let trip = normalize(store.get(KEY, null));
const subs = new Set();
let warned = false;

function save() {
  trip.t = Date.now();
  const ok = store.set(KEY, trip);
  if (!ok && !warned) { warned = true; toast("Your browser is blocking storage, so stars last for this visit only.", { ms: 5000 }); }
  emit();
}
function emit() { const l = list(); subs.forEach((fn) => { try { fn(l); } catch (e) { console.error(e); } }); render(); }
const kindOk = (k) => (TRIP_KINDS.includes(k) ? k : "e");

export const list = () => ({ e: [...trip.e], x: [...trip.x], p: [...trip.p], s: [...trip.s] });
export const has = (id) => TRIP_KINDS.some((k) => trip[k].includes(id));
export const kindOf = (id) => kindIn(trip, id);
export const count = (kind) => (kind ? (trip[kind] || []).length : total(trip));
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
/** Star or unstar; returns true when the item is now in the trip. */
export function toggle(id, kind = "e") {
  const k = kindIn(trip, id);
  if (k) { trip[k] = trip[k].filter((x) => x !== id); save(); return false; }
  trip[kindOk(kind)].push(id);
  save();
  return true;
}
export function add(ids, kind = "e") { for (const id of ids) if (!has(id)) trip[kindOk(kind)].push(id); save(); }
export function remove(ids) { const drop = new Set(ids); for (const k of TRIP_KINDS) trip[k] = trip[k].filter((x) => !drop.has(x)); save(); }
export function replace(obj) { const t = normalize(obj); for (const k of TRIP_KINDS) trip[k] = t[k]; save(); }
export function clear() { for (const k of TRIP_KINDS) trip[k] = []; save(); }

/* ---------- rendering: stars, counts, the sidebar card ---------- */
const bareName = (label) => label.replace(/^(Add |Remove )/, "").replace(/ (to|from) My Trip$/, "");
function renderStars(root = document) {
  for (const b of $$("[data-star]", root)) {
    const on = has(b.dataset.star);
    if (b.getAttribute("aria-pressed") !== String(on)) b.setAttribute("aria-pressed", String(on));
    const name = bareName(b.getAttribute("aria-label") || "");
    if (name) b.setAttribute("aria-label", `${on ? "Remove" : "Add"} ${name} ${on ? "from" : "to"} My Trip`);
  }
}

/** "Next: Sat, Oct 24 · 7:00 PM · Guavaween" (plain parts, escaped here) for the card's second line. */
function nextLine(x, t) {
  const today = nyParts(t).date;
  const day = x.day === today ? "Today" : x.day === addDays(today, 1) ? "Tomorrow" : fmtDay(x.day);
  // a long run is never "Now": before it opens, its first day; while it runs, its last day
  if (x.run) return x.s > t ? `Next: <b class="tnum">${esc(day)}</b> · ${esc(x.t)}` : `<b class="tnum">${esc(fmtThrough(x.ev.ed || x.day, today))}</b> · ${esc(x.t)}`;
  const when = x.f & 4 ? "all day" : x.f & 2 ? "time not listed" : fmtTime(nyParts(x.s).hhmm);
  // the site's rule (lib/status.js): "Now" only when both ends are published; a started event with no end time is "Started"
  const lead = x.s > t || x.f & 6 ? "Next" : x.f & 1 ? "Started" : "Now";
  return `${lead}: <b class="tnum">${esc(day)} · ${esc(when)}</b> · ${esc(x.t)}`;
}
let cardSeq = 0;
function renderCard() {
  const card = $("[data-trip-card]");
  if (!card) return;
  const n = count();
  card.classList.toggle("is-empty", n === 0);
  const title = $("[data-trip-card-title]", card), next = $("[data-trip-card-next]", card);
  if (title) title.textContent = n ? `${n} in My Trip` : "My Trip";
  if (!next) return;
  if (!n) { next.textContent = "Star places, stays, tours and events to build your trip"; return; }
  const summary = countText(trip);
  if (!trip.e.length) { next.textContent = summary; return; }
  const seq = ++cardSeq;
  getJSON("events.json").then((data) => {
    if (seq !== cardSeq) return;
    const t = now(), x = nextUp(data.events || [], trip.e, t);
    if (x) next.innerHTML = nextLine(x, t); else next.textContent = summary;
  }).catch(() => { if (seq === cardSeq) next.textContent = summary; });
}
function render() {
  renderStars();
  const n = count();
  for (const el of $$("[data-trip-count]")) { el.textContent = String(n); el.hidden = n === 0; }
  renderCard();
}

/** Re-label stars a feature just rendered (render() covers the whole page). */
export const refreshStars = (root) => renderStars(root || document);
export function initTrip() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-star]");
    if (!b) return;
    e.preventDefault();
    const on = toggle(b.dataset.star, b.dataset.starKind);
    toast(on ? "Added to My Trip" : "Removed from My Trip", { link: on ? true : null });
  });
  window.addEventListener("storage", (e) => { if (e.key === KEY) { trip = normalize(store.get(KEY, null)); emit(); } });
  render();
  onTick(() => { if (trip.e.length) renderCard(); }, { immediate: false });
}
