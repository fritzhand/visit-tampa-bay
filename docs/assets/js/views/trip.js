/* ============================================================
   site/js/views/trip.js · OWNER: E2 (client runtime; ported from Cincy Week's My Plan view)
   A view: core-provided, loaded on demand by main.js only on pages that have [data-trip-root] (trip.html), so it
   stays out of the boot payload every page loads.
   trip.html: the reader's starred events, experiences, places and stays, rendered from tbc-trip and
   assets/data/{events,experiences,places-lite,stays-lite}.json into [data-trip-root] (the build ships it
   empty, with a <noscript> note). Mounted by main.js on the page's [data-trip-root] unless it is
   data-trip-root="manual" (a Trip lane that renders its own view opts out that way).
   - Events first, by their next date (live state words from core/status.js: data-s / data-e / …), then
     experiences, places and places to stay, each with its star (unstarring keeps the row, dimmed, until
     the page is left, so a slip can be undone).
   - Share (trip.html#e=<codes>;x=…;p=…;s=…, lib/share.js tripHash), Add to calendar (.ics of every starred
     event, lib/ics.js), Clear (asks twice).
   - A shared link (#e=…;x=…;p=…;s=…) opens a read-only view of that trip with "Add n to my trip",
     "Replace my trip" (asks twice when yours is not empty) and "Just look"; never silent. The answered
     hash is remembered in tbc-seen-shared so reopening it does not ask again.
   - Saved ids that are no longer in the guide are counted and can be removed.
   ============================================================ */
import { $, $$, ROOT, esc, I, B, absUrl } from "../core/dom.js";
import { getJSON } from "../core/data.js";
import { raw } from "../core/store.js";
import { now, onTick } from "../core/clock.js";
import * as trip from "../core/trip-store.js";
import { share } from "../core/share.js";
import { toast } from "../core/toast.js";
import { updateStatus } from "../core/status.js";
import { download } from "../core/event-dialog.js";
import { tripHash, decode, TRIP_KINDS } from "../lib/share.js";
import { normalize, total, countText, missing, sameTrip, codeMap, TRIP_HEADINGS, TRIP_WORDS, plural } from "../lib/trip.js";
import { nyParts, fmtDay, fmtTime, fmtRange, fmtDateRange, fmtThrough } from "../lib/time.js";

const SEEN = "tbc-seen-shared";
const hm = (t) => nyParts(t).hhmm;
const DEAD = new Set(["cancelled", "postponed"]);

export function initTripView() {
  const root = $("[data-trip-root]");
  if (!root || root.getAttribute("data-trip-root") === "manual") return;
  let D = null, mode = "mine", shared = null, sharedHash = "", armed = null, clearing = false;
  const keep = new Set();                         // unstarred this visit: still listed (dimmed) so it can be re-starred

  const load = () => D ? Promise.resolve(D) : Promise.all([
    getJSON("events.json"), getJSON("experiences.json"), getJSON("places-lite.json"), getJSON("stays-lite.json"),
  ]).then(([ev, xp, pl, st]) => {
    D = {
      ev, xp, pl, st,
      byId: { e: new Map((ev.events || []).map((r) => [r.id, r])), x: new Map((xp.experiences || []).map((r) => [r.id, r])), p: new Map((pl.places || []).map((r) => [r.id, r])), s: new Map((st.stays || []).map((r) => [r.id, r])) },
      codes: codeMap({ events: ev.events, experiences: xp.experiences, places: pl.places, stays: st.stays }),
    };
    return D;
  });

  /* ---------- one row per kind ---------- */
  const star = (id, title, kind) => `<button class="star" type="button" data-star="${esc(id)}" data-star-kind="${kind}" aria-pressed="${trip.has(id)}" aria-label="${trip.has(id) ? "Remove" : "Add"} “${esc(title)}” ${trip.has(id) ? "from" : "to"} My Trip">${I("star")}</button>`;
  const areaName = (a) => (a && D.pl.areas && D.pl.areas[a] ? D.pl.areas[a].n : "");
  const regionShort = (r) => (r && D.pl.regions && D.pl.regions[r] ? D.pl.regions[r].s : "");
  const statusWord = (st, lb) => (st && st !== "open" ? ` <span class="badge ${st === "closed" || st === "temporarily-closed" ? "badge-warn" : st === "seasonal" ? "" : "badge-unconfirmed"}">${esc((lb && lb[st]) || st)}</span>` : "");
  const row = (id, kind, r, href, attrs, icon, title, meta, extra = "") => `<li class="row trip-item${mode === "mine" && !trip.has(id) ? " is-removed" : ""}"${r ? ` data-sheet="${esc(r)}"` : ""} data-trip-id="${esc(id)}"${attrs}><a href="${ROOT}${href}"${kind === "e" ? ` data-open-event="${esc(id)}"` : kind === "x" ? ` data-open-experience="${esc(id)}"` : ""}>${r ? B(r) : I(icon)}<span><span class="t">${esc(title)}</span><span class="w">${meta}${extra}</span></span></a>${star(id, title, kind)}</li>`;

  /** The instance an event row follows: the current or next one, else its last. */
  const pick = (ev, t) => (ev.i || []).find(([, , e]) => e > t) || (ev.i || [])[ev.i.length - 1];
  function eventRow(ev, t) {
    const inst = ev.i || [], x = pick(ev, t);
    if (!x) return "";
    const [day, s, e, f] = x;
    const multi = inst.length > 1, run = !!(f & 32);
    const days = [...new Set(inst.map(([d]) => d))];
    const when = run ? `${fmtThrough(ev.ed || nyParts(e - 1).date, day)}`
      : `${multi ? `${fmtDateRange(days[0], days[days.length - 1])} · ` : `${fmtDay(day)} · `}${f & 4 ? "All day" : f & 2 ? ev.tt || "Time not listed" : f & 1 ? `${fmtTime(hm(s))}, end time not listed` : fmtRange(hm(s), hm(e))}`;
    const place = ev.pl && D.ev.places && D.ev.places[ev.pl] ? D.ev.places[ev.pl].n : ev.lt || "";
    const untimed = inst.every(([, , , g]) => g & 2);
    const attrs = `${multi && !untimed && !run ? ` data-inst="${inst.map(([, a, b]) => `${a}:${b}`).join(",")}"` : ""}${multi ? ` data-days="${days.join(" ")}"` : ""} data-s="${s}" data-e="${e}"${run ? ` data-run="${esc(ev.ed || "")}"` : ""}${f & 1 ? ' data-end-unknown="1"' : ""}${untimed ? ' data-time-unknown="1"' : ""}${f & 4 ? ' data-all-day="1"' : ""}${DEAD.has(ev.st) ? ' data-cancelled="1"' : ""}`;
    const dead = ev.st && ev.st !== "scheduled" ? ` <span class="badge ${ev.st === "tentative" ? "badge-unconfirmed" : "badge-warn"}">${esc((D.ev.lb && D.ev.lb.st && D.ev.lb.st[ev.st]) || ev.st)}</span>` : "";
    return row(ev.id, "e", ev.r, `whats-on.html?e=${esc(ev.id)}#e-${esc(ev.id)}`, attrs, "flag", ev.t, esc([when, place].filter(Boolean).join(" · ")), `${dead} <span class="ev-status" data-status></span>`);
  }
  const lbOf = (d) => (d && d.lb) || {};
  function xRow(x) {
    const lb = lbOf(D.xp);
    return row(x.id, "x", x.r, `experiences.html?x=${esc(x.id)}#x-${esc(x.id)}`, "", "daymark", x.n, esc([(lb.k && lb.k[x.k]) || x.k, x.op, areaName(x.a)].filter(Boolean).join(" · ")), statusWord(x.st, lb.st));
  }
  function pRow(p) {
    const lb = lbOf(D.pl);
    return row(p.id, "p", p.r, p.u || `places/${esc(p.id)}.html`, "", p.h != null ? "landmark" : "pin", p.n, esc([(lb.k && lb.k[p.k]) || p.k, areaName(p.a) || regionShort(p.r)].filter(Boolean).join(" · ")), statusWord(p.st, lb.st));
  }
  function sRow(s) {
    const lb = lbOf(D.st);
    return row(s.id, "s", s.r, s.u || `stays/${esc(s.id)}.html`, "", "anchor", s.n, esc([(lb.k && lb.k[s.k]) || s.k, s.co || s.b, areaName(s.a)].filter(Boolean).join(" · ")), statusWord(s.st, lb.st));
  }

  /** Rows for a trip object: { html, found: { e, x, p, s }, gone: n } */
  function listHtml(ids) {
    const t = now();
    const found = { e: [], x: [], p: [], s: [] };
    let gone = 0;
    for (const k of TRIP_KINDS) for (const id of ids[k] || []) { const r = D.byId[k].get(id); if (r) found[k].push(r); else gone++; }
    // events: upcoming by their next start, then the ones that are over (most recent first)
    const next = (ev) => { const x = pick(ev, t); return x ? x[1] : Infinity; };
    const over = (ev) => !(ev.i || []).some(([, , e]) => e > t);
    found.e.sort((a, b) => (over(a) - over(b)) || (over(a) ? next(b) - next(a) : next(a) - next(b)));
    const byName = (a, b) => (a.n || "").localeCompare(b.n || "");
    found.x.sort(byName); found.p.sort(byName); found.s.sort(byName);
    const render = { e: (r) => eventRow(r, t), x: xRow, p: pRow, s: sRow };
    const sec = (k) => (found[k].length ? `<section class="trip-group" aria-labelledby="tg-${k}"><h2 class="sub-h" id="tg-${k}">${esc(TRIP_HEADINGS[k])} <span class="count tnum">${mode === "shared" ? found[k].length : found[k].filter((r) => trip.has(r.id)).length}</span></h2><ul class="rows trip-list">${found[k].map(render[k]).join("")}</ul></section>` : "");
    return { html: TRIP_KINDS.map(sec).join(""), found, gone };
  }

  const emptyHtml = `<div class="empty-state"><span class="halftone" aria-hidden="true">${I("star")}</span><h2>Your trip is empty</h2><p>Tap the star on any place, place to stay, tour or event. Stars are saved in this browser, on this device.</p><p class="btn-row"><a class="btn btn-secondary" href="${ROOT}things-to-do.html">Things to do</a><a class="btn btn-secondary" href="${ROOT}stay.html">Where to stay</a><a class="btn btn-secondary" href="${ROOT}experiences.html">Experiences</a><a class="btn btn-secondary" href="${ROOT}whats-on.html">What's On</a></p></div>`;

  /** A selector for the focused control, so a re-render (a star, an armed button) keeps keyboard focus where it was. */
  function focusKey() {
    const a = document.activeElement;
    if (!a || !root.contains(a)) return null;
    if (a.dataset.star) return `[data-star="${CSS.escape(a.dataset.star)}"]`;
    const hook = [...a.attributes].map((x) => x.name).find((n) => n.startsWith("data-trip-"));
    if (hook) return `[${hook}]`;
    const li = a.closest("[data-trip-id]");
    return li ? `[data-trip-id="${CSS.escape(li.dataset.tripId)}"] a` : null;
  }
  function render() {
    if (!D) return;
    const fk = focusKey();
    paint();
    const el = fk && $(fk, root);
    if (el) el.focus({ preventScroll: true });
  }
  function paint() {
    const mine = normalize(trip.list());
    if (mode === "shared") {
      const add = missing(mine, shared), nAdd = total(add);
      const { html, gone } = listHtml(shared);
      const answered = raw.get(SEEN) === sharedHash;
      root.innerHTML = `<section class="callout tone-tip trip-shared" aria-labelledby="ts-h"><h2 id="ts-h">A shared trip</h2>
<p>${esc(countText(shared) || "Nothing in it is in the guide anymore")}.${nAdd && total(mine) ? ` ${esc(plural(nAdd, ["of them is", "of them are"]))} not in your trip yet.` : ""}${gone ? ` ${esc(plural(gone, ["item", "items"]))} in the link ${gone === 1 ? "is" : "are"} no longer in the guide.` : ""}</p>
<p class="btn-row">${!answered && nAdd ? `<button class="btn btn-river" type="button" data-trip-add-all>${I("plus")}Add ${nAdd} to my trip</button>` : ""}${!answered && total(mine) && !sameTrip(mine, shared) ? `<button class="btn btn-secondary" type="button" data-trip-replace>${armed === "replace" ? `Replace my ${total(mine)}? Tap again` : "Replace my trip"}</button>` : ""}${!answered ? `<button class="btn btn-ghost" type="button" data-trip-look>Just look</button>` : ""}<button class="btn btn-secondary" type="button" data-trip-mine>${I("arrow-r")}My trip</button></p></section>
${html}`;
    } else {
      const ids = { ...mine };
      for (const id of keep) { if (trip.has(id)) { keep.delete(id); continue; } const k = TRIP_KINDS.find((kk) => D.byId[kk].has(id)); if (k) ids[k] = [...ids[k], id]; }
      const n = total(mine);
      if (!n && !keep.size) { root.innerHTML = emptyHtml; return; }
      const { html, gone } = listHtml(ids);
      const events = mine.e.length;
      root.innerHTML = `<p class="trip-summary">${esc(countText(mine) || "Nothing starred")}. Saved in this browser, on this device.</p>
<p class="btn-row trip-actions"><button class="btn btn-river" type="button" data-trip-share${n ? "" : " disabled"}>${I("share")}Share my trip</button>${events ? `<button class="btn btn-secondary" type="button" data-trip-ics>${I("download")}Add ${plural(events, TRIP_WORDS.e)} to a calendar (.ics)</button>` : ""}${n ? `<button class="btn btn-ghost" type="button" data-trip-clear>${armed === "clear" ? `Clear all ${n}? Tap again` : "Clear my trip"}</button>` : ""}</p>
${gone ? `<p class="callout tone-warn trip-gone"><span>${esc(plural(gone, ["saved item is", "saved items are"]))} no longer in this guide.</span> <button class="btn btn-sm btn-secondary" type="button" data-trip-prune>Remove ${gone === 1 ? "it" : "them"}</button></p>` : ""}
${html}`;
    }
    updateStatus(now(), root);
    trip.refreshStars(root);
  }

  /* ---------- the hash: a shared trip ---------- */
  function readHash() {
    const h = location.hash.replace(/^#/, "");
    if (!/(^|;)(e|x|p|s)=/.test(h)) { mode = "mine"; shared = null; sharedHash = ""; return; }
    const d = decode(h, new Map([...D.codes].map(([c, v]) => [c, v.id])));
    // re-kind every id by the record it names (a link can only put an id where it belongs)
    const out = normalize({});
    for (const k of TRIP_KINDS) for (const id of d[k]) { const kk = TRIP_KINDS.find((x) => D.byId[x].has(id)); if (kk && !out[kk].includes(id)) out[kk].push(id); }
    shared = out; sharedHash = h;
    const mine = normalize(trip.list());
    mode = total(out) && !sameTrip(mine, out) ? "shared" : "mine";
    if (!total(out) && d.unknown) toast("That shared trip link is out of date: nothing in it is in the guide anymore.", { ms: 5000 });
  }
  const leaveShared = () => { mode = "mine"; shared = null; try { history.replaceState(history.state, "", location.pathname + location.search); } catch { /* file:// */ } render(); };

  /* ---------- actions ---------- */
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b || b.hasAttribute("data-star")) return;
    const disarm = () => { armed = null; };
    if (b.hasAttribute("data-trip-share")) {
      const h = tripHash(trip.list());
      if (h) share({ title: "My Tampa Bay trip", text: countText(normalize(trip.list())), url: absUrl(`trip.html#${h}`) });
    } else if (b.hasAttribute("data-trip-ics")) {
      let ics, text;
      try { [ics, text] = await Promise.all([import("../lib/ics.js"), getJSON("event-text.json").catch(() => null)]); }
      catch { toast("Couldn't make the calendar file. Try again."); return; }
      const base = absUrl("");
      const items = trip.list().e.map((id) => D.byId.e.get(id)).filter(Boolean).flatMap((ev) => ics.eventItems({ ...ev, d: text && text.d ? text.d[ev.id] : null }, D.ev, { base }));
      if (!items.length) { toast("None of your events has a date in the guide."); return; }
      download(ics.vcalendar(items, { name: "My Trip · Tampa Bay Chartbook" }), "my-tampa-bay-trip.ics");
      toast(`Calendar file with ${plural(items.length, ["date", "dates"])} downloaded`);
    } else if (b.hasAttribute("data-trip-clear")) {
      if (armed !== "clear") { armed = "clear"; render(); setTimeout(() => { if (armed === "clear") { disarm(); render(); } }, 5000); return; }
      disarm(); keep.clear(); clearing = true; trip.clear(); clearing = false; toast("My Trip cleared");
    } else if (b.hasAttribute("data-trip-prune")) {
      const ids = trip.list(); const drop = TRIP_KINDS.flatMap((k) => ids[k].filter((id) => !D.byId[k].has(id)));
      trip.remove(drop); toast(`Removed ${plural(drop.length, ["item", "items"])}`);
    } else if (b.hasAttribute("data-trip-add-all")) {
      const add = missing(normalize(trip.list()), shared);
      for (const k of TRIP_KINDS) if (add[k].length) trip.add(add[k], k);
      raw.set(SEEN, sharedHash); toast(`Added ${plural(total(add), ["item", "items"])} to My Trip`); leaveShared();
    } else if (b.hasAttribute("data-trip-replace")) {
      if (armed !== "replace") { armed = "replace"; render(); setTimeout(() => { if (armed === "replace") { disarm(); render(); } }, 5000); return; }
      disarm(); trip.replace(shared); raw.set(SEEN, sharedHash); toast("My Trip replaced with the shared trip"); leaveShared();
    } else if (b.hasAttribute("data-trip-look")) {
      raw.set(SEEN, sharedHash); render();
    } else if (b.hasAttribute("data-trip-mine")) {
      leaveShared();
    }
  });

  root.innerHTML = '<p class="muted" role="status">Loading your trip…</p>';
  load().then(() => {
    readHash(); render();
    trip.subscribe(() => {
      // unstarred rows stay listed (dimmed) for this visit, so a slip can be undone
      if (mode === "mine" && !clearing) for (const r of $$("[data-trip-id]", root)) if (!trip.has(r.dataset.tripId)) keep.add(r.dataset.tripId);
      render();
    });
    window.addEventListener("hashchange", () => { readHash(); render(); });
    onTick((t) => updateStatus(t, root), { immediate: false });
  }).catch(() => {
    root.innerHTML = `<p class="unk">My Trip could not load the guide's data. It needs the site to be served over http(s); try reloading.</p>`;
  });
}
