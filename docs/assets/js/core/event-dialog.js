/* ============================================================
   site/js/core/event-dialog.js · OWNER: E2 (client runtime; ported from Cincy Week's event dialog)
   (under core/ because every page hosts #event-dialog: build/core/shell.mjs)
     open(id, { trigger, push })  fetch assets/data/events.json once, render into #event-dialog,
                                  set ?e=<id> with pushState (Back closes it), focus #evd-title
     initEventDialog()            a click on [data-open-event] opens the dialog (modifier clicks keep the
                                  link); ?e= on load opens it (whats-on.html?e=<id> is the deep link, and any
                                  page that pushed ?e= reopens it on reload); popstate syncs; idle prefetch
   The dialog: sheet badge, kind and status, title, when (ET, with the live state word; every day of a
   multi-day item when hours differ or the days are not consecutive; "Through Jan 10" for a long run),
   where (the place's page, address, area; or the source's location text), our summary, the verbatim
   description in quotation (event-text.json, loaded on first intent), cost, tickets, official page,
   series, a mini map and directions, the source with its checked date, and actions: Add to My Trip,
   Add to calendar (.ics; lib/ics.js loaded on click), Google Calendar (a single timed day), Share.
   Unknowns are printed as unknowns: "Time not listed", "end time not listed", "Place not listed".
   ============================================================ */
import { $, ROOT, esc, modified, I, ext, sheetBadge, absUrl } from "./dom.js";
import { getJSON, idle } from "./data.js";
import { showModal, hideModal, current } from "./modal.js";
import { now, onTick } from "./clock.js";
import { has, toggle, subscribe } from "./trip-store.js";
import { share } from "./share.js";
import { toast } from "./toast.js";
import { updateStatus } from "./status.js";
import { searchOpener } from "./search.js";
import { mapBlock } from "./places.js";
import { back, settling, settled } from "./history.js";
import { nyParts, fmtDay, fmtTime, fmtRange, fmtDate, fmtDateRange, fmtThrough, fmtDateY, addDays } from "../lib/time.js";
import { paras, hostOf } from "../lib/text.js";

let modal, bodyEl, kickerEl, openId = null, pushed = false, cur = null, ICS = null;
const hm = (t) => nyParts(t).hhmm;
const DEAD = new Set(["cancelled", "postponed"]);

/** Hours of one instance [day, s, e, flags]: "4:00–9:00 PM" · "7:00 PM end time not listed" · "All day" · the source's words. */
function hours([, s, e, f], ev, tz = "") {
  if (f & 4) return "All day";
  if (f & 2) return ev.tt ? esc(ev.tt) : '<span class="unk">Time not listed</span>';
  const z = tz ? ` <span class="faint">${tz}</span>` : "";
  return f & 1 ? `<span class="nw">${esc(fmtTime(hm(s)))}${z}</span> <span class="unk">end time not listed</span>` : `<span class="nw">${esc(fmtRange(hm(s), hm(e)))}${z}</span>`;
}
/** The calendar day of an instance: an after-midnight start prints its own date and its night. */
const dayOf = ([day, s, , f]) => (f & 16 ? `${fmtDay(nyParts(s).date)} (${fmtDay(day).split(",")[0]} night)` : fmtDay(day));
const consecutive = (days) => days.every((d, i) => i === 0 || addDays(days[i - 1], 1) === d);

/** The "when" block, with the data-* attributes core/status.js reads (lib/status.js liveState). */
function whenHtml(ev, t) {
  const inst = ev.i || [];
  if (!inst.length) return '<p class="evd-when"><span class="unk">Date not listed</span></p>';
  const dead = DEAD.has(ev.st) ? ' data-cancelled="1"' : "";
  const st = '<span class="ev-status" data-status></span>';
  // a long run: one instance spanning it; never "Now"
  if (inst.length === 1 && inst[0][3] & 32) {
    const [day, s, e, f] = inst[0];
    const daily = f & 4 ? "all day" : f & 2 ? (ev.tt ? esc(ev.tt) : '<span class="unk">hours not listed</span>') : `<span class="nw">${esc(f & 1 ? fmtTime(hm(s)) : fmtRange(hm(s), hm(e)))} <span class="faint">ET</span></span> daily`;
    const through = ev.ed ? fmtThrough(ev.ed, day) : `Through ${fmtDate(nyParts(e - 1).date)}`;
    return `<p class="evd-when" data-s="${s}" data-e="${e}" data-run="${esc(ev.ed || "")}"${f & 2 ? ' data-time-unknown="1"' : ""}${f & 4 ? ' data-all-day="1"' : ""}${dead}>${esc(through)} · from ${esc(fmtDay(day))} · ${daily} ${st}</p>`;
  }
  const pick = inst.find(([, , e]) => e > t) || inst[inst.length - 1];
  const multi = inst.length > 1;
  const days = [...new Set(inst.map(([d]) => d))];
  const untimed = inst.every(([, , , f]) => f & 2);
  const attrs = `${multi && !untimed ? ` data-inst="${inst.map(([, a, b]) => `${a}:${b}`).join(",")}"` : ""}${multi ? ` data-days="${days.join(" ")}"` : ""} data-s="${pick[1]}" data-e="${pick[2]}"${pick[3] & 1 ? ' data-end-unknown="1"' : ""}${untimed ? ' data-time-unknown="1"' : ""}${pick[3] & 4 ? ' data-all-day="1"' : ""}${dead}`;
  if (!multi) return `<p class="evd-when"${attrs}>${esc(dayOf(pick))} · ${hours(pick, ev, "ET")} ${st}</p>`;
  const same = inst.every((x) => hours(x, ev) === hours(inst[0], ev));
  const span = consecutive(days) ? fmtDateRange(days[0], days[days.length - 1]) : `${days.length} dates, ${fmtDateRange(days[0], days[days.length - 1])}`;
  let html = `<p class="evd-when"${attrs}>${esc(span)} · ${same ? `${hours(inst[0], ev, "ET")}${consecutive(days) ? " each day" : ""}` : `${esc(dayOf(pick))}: ${hours(pick, ev, "ET")}`} ${st}</p>`;
  if (!same || !consecutive(days)) html += `<ul class="evd-days">${inst.map((x) => `<li><span class="tnum">${esc(dayOf(x))}</span> ${hours(x, ev)}</li>`).join("")}</ul>`;
  return html;
}

function whereHtml(data, ev) {
  const pl = ev.pl && data.places ? data.places[ev.pl] : null;
  const area = ev.a && data.areas && data.areas[ev.a] ? `<a href="${ROOT}areas/${esc(ev.a)}.html">${esc(data.areas[ev.a].n)}</a>` : "";
  // the area line, unless the place or the source's words already name it ("Downtown St. Petersburg · Downtown St. Petersburg")
  const named = (txt) => ev.a && data.areas && data.areas[ev.a] && String(txt || "").toLowerCase().includes(data.areas[ev.a].n.toLowerCase());
  const a = area && !named(pl ? `${pl.n} ${pl.ad || ""}` : ev.lt) ? `<span class="evd-addr">${area}</span>` : "";
  if (pl) return `<a href="${ROOT}places/${esc(ev.pl)}.html">${esc(pl.n)}</a>${pl.ad ? `<span class="evd-addr">${esc(pl.ad)}</span>` : ""}${a}`;
  if (ev.lt) return `${esc(ev.lt)}${a}`;
  return `<span class="unk">Place not listed</span>${a}`;
}

function render(data, ev) {
  const t = now();
  const lb = data.lb || {};
  const region = data.regions && data.regions[ev.r];
  kickerEl.innerHTML = sheetBadge(ev.r, region ? region.s : "");
  const pl = ev.pl && data.places ? data.places[ev.pl] : null;
  const ll = ev.ll || (pl && pl.ll) || null;
  const statusBadge = ev.st && ev.st !== "scheduled" ? ` <span class="badge ${ev.st === "tentative" ? "badge-unconfirmed" : "badge-warn"}">${esc((lb.st && lb.st[ev.st]) || ev.st)}</span>` : "";
  const cost = ev.f === 1 ? `<span class="badge badge-free">Free</span>${ev.c && !/^free\.?$/i.test(ev.c) ? ` ${esc(ev.c)}` : ""}` : ev.c ? esc(ev.c) : '<span class="unk">Not listed</span>';
  const series = ev.se && data.series && data.series[ev.se] ? data.series[ev.se] : null;
  const topics = (ev.tp || []).map((x) => (lb.tp && lb.tp[x]) || x);
  const inst = ev.i || [];
  const facts = [
    ["Cost", cost],
    ev.tk ? ["Tickets", ext(ev.tk, esc(hostOf(ev.tk) || "Tickets"))] : null,
    ev.u ? ["Official page", ext(ev.u, esc(hostOf(ev.u) || "Official page"))] : null,
    series ? ["Every year", `<a href="${ROOT}whats-on.html#s-${esc(ev.se)}">${esc(series.n)}</a>${series.w ? `<span class="evd-addr">${esc(series.w)}</span>` : ""}`] : null,
    ev.tt && inst.some(([, , , f]) => !(f & 2)) ? ["As listed", `“${esc(ev.tt)}”`] : null,
    topics.length ? ["Topics", esc(topics.join(", "))] : null,
  ].filter(Boolean);
  const desc = ev.d
    ? `<blockquote class="evd-desc">${paras(ev.d).map((p) => `<p>${esc(p)}</p>`).join("")}</blockquote><p class="faint evd-cite">From ${ext(ev.src, esc(hostOf(ev.src) || "the source"))}</p>`
    : ev.d === undefined ? '<p class="unk evd-desc">The description did not load. The official page has it.</p>' : "";
  const onTrip = has(ev.id);
  const single = inst.length === 1 && !(inst[0][3] & (2 | 4 | 32));
  const items = ICS ? ICS.eventItems(ev, data, { base: absUrl("") }) : [];
  bodyEl.dataset.evd = ev.id;
  bodyEl.innerHTML = `<p class="evd-kind label">${I("flag")}${esc((lb.k && lb.k[ev.k]) || ev.k)}${statusBadge}</p>
<h2 id="evd-title" tabindex="-1">${esc(ev.t)}</h2>
${whenHtml(ev, t)}
<div class="evd-grid"><div class="evd-main">
<p class="ev-where evd-where">${I("pin")}<span>${whereHtml(data, ev)}</span></p>
${ev.sm ? `<p class="evd-sum">${esc(ev.sm)}</p>` : ""}
${desc}
<dl class="facts evd-facts">${facts.map(([k, v]) => `<div class="fact"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
</div><div class="evd-side">${mapBlock(data.map, ll, { sheet: ev.r, label: pl ? pl.n : ev.lt || ev.t, focus: `event:${ev.id}`, address: pl && pl.ad })}</div></div>
<p class="source-line">${I("info")}<span>Source: ${ext(ev.src, esc(hostOf(ev.src) || ev.src))}</span>${ev.ck ? `<span>Checked ${esc(fmtDateY(ev.ck))}</span>` : ""}</p>
<div class="evd-actions"><button class="btn btn-river" type="button" data-evd-star aria-pressed="${onTrip}">${I("star", onTrip ? "i-fill" : "")}<span>${onTrip ? "In My Trip" : "Add to My Trip"}</span></button>${inst.length ? `<button class="btn btn-secondary" type="button" data-evd-ics>${I("download")}Add to calendar (.ics)</button>` : ""}${single && items.length ? ext(ICS.gcalUrl(items[0]), "Google Calendar", "btn btn-ghost") : ""}<button class="btn btn-secondary" type="button" data-evd-share>${I("share")}Share</button></div>`;
  tick(t);
}

function tick(t) {
  updateStatus(t, bodyEl);
  const st = $(".evd-when", bodyEl)?.dataset.status;
  if (st) bodyEl.dataset.status = st; else delete bodyEl.dataset.status;
}
function syncStar() {
  const b = bodyEl && $("[data-evd-star]", bodyEl);
  if (!b || !openId) return;
  const on = has(openId);
  b.setAttribute("aria-pressed", String(on));
  b.innerHTML = `${I("star", on ? "i-fill" : "")}<span>${on ? "In My Trip" : "Add to My Trip"}</span>`;
}

const urlFor = (id) => { const u = new URL(location.href); if (id) u.searchParams.set("e", id); else u.searchParams.delete("e"); u.hash = ""; return u.pathname + u.search; };
export const deepLink = (id) => absUrl(`whats-on.html?e=${encodeURIComponent(id)}#e-${encodeURIComponent(id)}`);

export async function open(id, { trigger = null, push = true } = {}) {
  if (!modal) return;
  let data, text = null;
  try { [data, ICS, text] = await Promise.all([getJSON("events.json"), import("../lib/ics.js").catch(() => null), getJSON("event-text.json").catch(() => null)]); }
  catch { location.href = `${ROOT}whats-on.html?e=${encodeURIComponent(id)}#e-${encodeURIComponent(id)}`; return; }
  const found = (data.events || []).find((x) => x.id === id);
  if (!found) return;
  // descriptions live in event-text.json: undefined = it did not load, null = the source gives none
  const ev = { ...found, d: text && text.d ? text.d[found.id] || null : undefined };
  cur = { data, ev };
  render(data, ev);
  openId = id;
  if (push) { await settled(); history.pushState({ evd: id }, "", urlFor(id)); pushed = true; } else pushed = false;
  showModal(modal, { trigger, focus: "#evd-title", onClose: () => {
    const wasPushed = pushed; openId = null; pushed = false; cur = null;
    // focus goes back to the trigger: make sure it is on screen (not under the sticky bars)
    if (trigger && document.contains(trigger)) requestAnimationFrame(() => { const r = trigger.getBoundingClientRect(); if (r.top < 140 || r.bottom > innerHeight - 70) trigger.scrollIntoView({ block: "center" }); });
    if (wasPushed && history.state && history.state.evd === id) back();
    else if (new URL(location.href).searchParams.has("e")) history.replaceState(history.state, "", urlFor(null) + location.hash);
  } });
}

function calendar() {
  const ics = ICS;
  if (!cur || !ics) { toast("Couldn't make the calendar file. Try again."); return; }
  const items = ics.eventItems(cur.ev, cur.data, { base: absUrl("") });
  if (!items.length) return;
  download(ics.vcalendar(items, { name: cur.ev.t }), ics.icsFilename(cur.ev.t));
  toast(items.length > 1 ? `Calendar file with ${items.length} dates downloaded` : "Calendar file downloaded");
}
/** Hand the reader a text file (the .ics). */
export function download(text, filename, type = "text/calendar;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const dl = document.createElement("a");
  dl.href = url; dl.download = filename; dl.hidden = true;
  document.body.appendChild(dl); dl.click();
  setTimeout(() => { URL.revokeObjectURL(url); dl.remove(); }, 1500);
}

export function initEventDialog() {
  modal = $("#event-dialog"); if (!modal) return;
  bodyEl = $("[data-evd-body]", modal); kickerEl = $("[data-evd-kicker]", modal);
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-open-event]");
    if (!a || modified(e)) return;
    e.preventDefault();
    open(a.dataset.openEvent, { trigger: a.closest("#search") ? searchOpener() || $("#main") : a });
  });
  modal.addEventListener("click", (e) => {
    if (!openId) return;
    if (e.target.closest("[data-evd-star]")) { const on = toggle(openId, "e"); syncStar(); toast(on ? "Added to My Trip" : "Removed from My Trip", { link: on ? true : null }); }
    if (e.target.closest("[data-evd-ics]")) calendar();
    if (e.target.closest("[data-evd-share]")) share({ title: $("#evd-title", modal).textContent, url: deepLink(openId) });
  });
  subscribe(syncStar);
  window.addEventListener("popstate", () => {
    if (settling()) return; // our own back() after a close
    const id = new URL(location.href).searchParams.get("e");
    if (!id && openId && current() === modal) { pushed = false; hideModal(); }
    else if (id && id !== openId) open(id, { push: false });
  });
  const id = new URL(location.href).searchParams.get("e");
  if (id && /^[a-z0-9][a-z0-9-]*$/.test(id)) {
    const card = document.getElementById(`e-${id}`);
    open(id, { push: false, trigger: card && card.querySelector("[data-open-event]") });
  }
  onTick((t) => { if (openId) tick(t); }, { immediate: false });
  // prefetch events.json when idle on pages that can open the dialog, so it opens at once
  if (document.querySelector("[data-open-event]")) idle(() => getJSON("events.json").catch(() => {}));
  // the descriptions (event-text.json) load on the first sign of intent: a pointer or focus on anything that opens the dialog
  const warm = (e) => {
    if (!(e.target instanceof Element) || !e.target.closest("[data-open-event]")) return;
    getJSON("event-text.json").catch(() => {});
    for (const t of ["pointerover", "focusin"]) document.removeEventListener(t, warm, true);
  };
  for (const t of ["pointerover", "focusin"]) document.addEventListener(t, warm, { capture: true, passive: true });
}
