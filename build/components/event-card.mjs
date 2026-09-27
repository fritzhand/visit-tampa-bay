/* ============================================================
   build/components/event-card.mjs · OWNER: E1 (engine; ported from Cincy Week's schedule card)
   Extended (additively) by the What's On lane: the lean list card, the date box, the continuing-day row.

   makeEventCards(ctx) → {
     eventCard(root, evOrInstance, { anchor = true, headingLevel = 3, span = false, compact = false, showDate = true, here = "",
                                     lean = false, datebox = false }),
     eventRow(root, instance)          compact time-first row (inside <ol class="tonight">),
     eventList(root, instances, { groupBy: "day" | "month" | "none", headingLevel, showDate }),
     alsoRow(root, instance)           What's On: one later day of a multi-day event, under that day (li.ev-also),
     dateBox(date, { until })          the date box (<div class="datebox" aria-hidden="true">…); until: a long run's last day,
     costText(ev) → { free, text }     the price as the source gives it ("Free", the source's cost words, or null),
     whenText(instance) → plain text ("4:00–9:00 PM", "7:00 PM · end time not listed", "Time not listed",
                          "Through Jan 10")
   }
   Card contract (whats-on, region, area and place pages, My Trip):
   <article class="ev" id="e-{id}" data-ev="{id}" data-sheet="{region}" data-r data-a data-k data-kg data-day
            data-month data-s data-e [data-inst] [data-days] [data-run="{end_date}"] [data-end-unknown]
            [data-time-unknown] data-t [data-pl] [data-se] data-free data-q [data-cancelled]>
     .ev-when (<time datetime>…, .ev-status[data-status]) · .ev-body (.ev-meta: sheet badge, kind, status words,
     .ev-title a[href="{root}whats-on.html?e={id}#e-{id}"][data-open-event], .ev-where, .ev-sum, .ev-tags,
     details.ev-more) · button.star[data-star][data-star-kind="e"]
   - Only one card per page may carry id="e-{id}" (anchor: false elsewhere).
   - data-k is the raw kind and data-kg its group, so ?k= may name either (build/nav.mjs paramValues).
   - data-month lists the month keys ("2026-10 2026-11") the event touches, for ?month=.
   - A multi-day item (span, or an event record with several instances) is one card: data-inst lists each
     day's "s:e" (only when hours are listed), data-days its listing days.
   - A long run (more than 14 days) is one instance: data-run holds its last day; the client never says "Now"
     for it (its s..e span the whole run) and prints "Through <date>". Its hours are the source's own words
     (time_text) or the listed hours, never "daily" (a weekly market is a run too).
   - data-cancelled="1" when the event is cancelled or postponed (never "Now", left out of counts).
   - data-q is normalized text of what the card does NOT print (place aliases, series name, tags beyond the
     three shown, topics); a filter adds the card's visible text.
   The lean card ({ lean: true }, What's On's list: ~590 of them on one page) keeps every attribute above (but data-pl;
   data-inst and data-days whenever the event has several instances, so its live word follows the event, not its first day)
   and the same classes, and drops the weight: no inline SVG at all (the sheet badge i.ev-sb[aria-hidden] and the star are drawn
   by CSS, 45-whats-on.css; the kicker reads KIND · AREA as in the design's card grammar), no summary and no description (the dialog, one click away, shows both: event-text.json),
   no details, no <time> elements; every start of its day ("12:00, 4:00 and 8:00 PM"), and "hours differ by day" when a
   multi-day event's hours do; it adds .ev-cost (the source's price words, "Free", or "Price not listed"), a source
   line (.ev-src: "Source: host", plus "Checked <date>" when it differs from { checked }, the date the page
   states once, and Tickets when listed and the event is not cancelled or postponed), the signature seal for featured events (data-fe="1"), and with
   { datebox: true } a date box first (a long run's box reads "Until" + its last day).
   Unknowns print as unknowns: "Time not listed", "end time not listed", "Place not listed", "Price not listed".
   ============================================================ */
import { esc, attr, paras, extLink, hostOf } from "../core/util.mjs";
import { icon } from "../core/icons.mjs";
import { EVENT_KIND_LABEL, TOPIC_LABEL, EVENT_STATUS_LABEL } from "../core/vocab.mjs";
import { norm } from "../../site/js/lib/search.js";
import { fmtTime, fmtDay, fmtDate, fmtDateY, fmtDateRange, fmtThrough, isoLocal, bucket, monthKey, dateRange, fmtMonth, dowShort } from "../core/time.mjs";

/** A sprite icon for card internals (the same symbol as h.icon, a few bytes lighter: cards repeat it hundreds of times). */
const ic = (name) => { icon(name); return `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`; };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Free" said in so many words (the free badge already says it). */
const JUST_FREE = /^(free|free admission|free to attend|free event|free entry)\.?$/i;

export function makeEventCards(ctx) {
  const { db, c } = ctx;
  const areaName = (a) => db.byId.area.get(a)?.name || "";

  /** The months an event touches (for data-month and month grouping). */
  function monthsOf(ev) {
    const set = new Set();
    for (const x of ev.instances || []) {
      if (x.run) for (const d of dateRange(x.date, x.through < db.window.end ? x.through : db.window.end)) set.add(monthKey(d));
      else set.add(monthKey(x.day));
    }
    return [...set].sort();
  }

  /** A long run's hours: the source's own words, else the listed hours (never "daily": a weekly market is a run too). */
  function runHours(inst) {
    const ev = inst.ev;
    if (ev.time_text) return `<span class="ev-tt">${esc(ev.time_text)}</span>`;
    if (inst.allDay) return "<span>All day</span>";
    if (inst.start) return `<span class="nw">${esc(`${fmtTime(inst.start)}${inst.end ? `–${fmtTime(inst.end)}` : ""}`)}</span>`;
    return '<span class="unk">Hours not listed</span>';
  }

  /** "Sat, Oct 24 · 4:00–9:00 PM" as <time> elements; one AM/PM when both share it. */
  function when(inst, { showDate = true, lean = false } = {}) {
    // lean: plain text, AM/PM kept on the number's line (no-break space)
    const tm = (epoch, text) => (lean ? esc(text.replace(" ", "\u00a0")) : `<time datetime="${isoLocal(epoch)}">${esc(text)}</time>`);
    const ev = inst.ev;
    if (inst.run) {
      const from = ev.date && ev.date !== inst.through ? ` <span class="ev-dates">· from ${esc(ev.date.slice(0, 4) !== inst.through.slice(0, 4) ? fmtDateY(ev.date) : fmtDate(ev.date))}</span>` : "";
      return `<span class="ev-run">${esc(fmtThrough(inst.through, inst.date))}</span>${lean ? from : ""} <span class="ev-dates">· </span>${runHours(inst)}`;
    }
    const multi = ev.end_date && ev.end_date !== ev.date;
    const days = lean ? [...new Set((ev.instances || []).map((y) => y.day))] : [];
    const spread = lean && days.length > 1;
    const consecutive = spread && days.every((d, i) => i === 0 || dateRange(days[i - 1], d).length === 2);
    const range = spread ? (consecutive ? fmtDateRange(days[0], days[days.length - 1]) : `${days.length} dates, ${fmtDateRange(days[0], days[days.length - 1])}`) : multi ? fmtDateRange(ev.date, ev.end_date) : "";
    const date = showDate ? `<span class="ev-date">${esc(range || fmtDay(inst.day))}</span> · ` : range ? `<span class="ev-date">${esc(range)}</span> · ` : "";
    if (inst.allDay) return `${date}<span>All day</span>`;
    if (inst.timeUnknown) return `${date}${ev.time_text ? `<span class="ev-tt">${esc(ev.time_text)}</span>` : '<span class="unk">Time not listed</span>'}`;
    // several days with different hours: this day's hours, said as such, then "hours differ by day" (each later day's own
    // hours are on its row under that day, and the dialog lists every day)
    const same = lean ? (ev.instances || []).filter((y) => y.day === inst.day && y.start && !y.timeUnknown && !y.allDay) : [];
    const sig = new Map();
    if (spread) for (const y of ev.instances || []) sig.set(y.day, `${sig.get(y.day) || ""}${y.start}-${y.end};`);
    const differs = spread && new Set(sig.values()).size > 1;
    const late = inst.lateNight ? ' <span class="ev-dates">· after midnight</span>' : "";
    const first = differs ? `<span class="ev-dates">${esc(fmtDate(inst.day))}: </span>` : "";
    const vary = differs ? ' <span class="ev-dates">· hours differ by day</span>' : "";
    // several shows on one day (lean: the card lists every start that day, never only the first)
    if (same.length > 1) {
      const parts = same.map((y) => (y.end ? ctx.h.fmtRange(y.start, y.end) : fmtTime(y.start)).replace(/ (AM|PM)/g, " $1"));
      return `${date}${first}<span>${esc(ctx.h.listJoin(parts))}</span>${same.some((y) => !y.end) ? ' <span class="unk">end time not listed</span>' : ""}${late}${vary}`;
    }
    const a = fmtTime(inst.start), b = inst.end ? fmtTime(inst.end) : "";
    const sameHalf = b && a.slice(-2) === b.slice(-2) && inst.end > inst.start;
    const t1 = tm(inst.s, sameHalf ? a.slice(0, -3) : a);
    if (!b) return `${date}${first}${t1} <span class="unk">end time not listed</span>${late}${vary}`;
    if (lean) return `${date}${first}<span class="nw">${t1}–${tm(inst.e, b)}</span>${late}${vary}`;
    return `${date}${first}${t1}–${tm(inst.e, b)}${late}`;
  }
  /** Plain-text version for labels and search. */
  function whenText(inst) {
    const ev = inst.ev;
    if (inst.run) return fmtThrough(inst.through, inst.date);
    if (inst.allDay) return "All day";
    if (inst.timeUnknown) return ev.time_text || "Time not listed";
    return inst.end ? ctx.h.fmtRange(inst.start, inst.end) : `${fmtTime(inst.start)} · end time not listed`;
  }

  /** Where: the place (linked to its page) and its area, or the source's location text, or "Place not listed". */
  function where(root, ev, here, lean = false) {
    const v = ev.venue, pin = lean ? "" : ic("pin");
    const wrap = (s) => (lean ? s : `<span>${s}</span>`);
    if (v && v.id === here) return ev.area && ev.area !== v.area ? `<p class="ev-where">${pin}${wrap(esc(areaName(ev.area)))}</p>` : "";
    const areaSuffix = (a) => (a && !lean ? `<span class="ev-area"> · ${esc(areaName(a))}</span>` : "");   // lean: the area is in the kicker
    if (v) return `<p class="ev-where">${pin}${wrap(`<a href="${root}places/${attr(v.id)}.html">${esc(v.name)}</a>${areaSuffix(v.area)}`)}</p>`;
    if (ev.location_text) return `<p class="ev-where">${pin}${wrap(`${esc(ev.location_text)}${areaSuffix(ev.area)}`)}</p>`;
    return `<p class="ev-where">${pin}<span class="unk">Place not listed</span></p>`;
  }

  /** The price as the source gives it: { free: true|false|null, text: the source's words | null }. */
  const costText = (ev) => ({ free: ev.is_free === true ? true : ev.is_free === false ? false : null, text: ev.cost || null });
  /** The lean card's price line: the free badge and/or the source's words, else "Price not listed". */
  function costLine(ev) {
    const { free, text } = costText(ev);
    const words = text && !(free && JUST_FREE.test(text.trim())) ? `<span class="ev-cw">${esc(text)}</span>` : "";
    if (free) return `<p class="ev-cost"><span class="badge badge-free">Free</span>${words}</p>`;
    return words ? `<p class="ev-cost">${words}</p>` : '<p class="ev-cost unk">Price not listed</p>';
  }

  /** The no-JS body: the verbatim description, cost, tickets, the official page and the source. */
  function more(root, ev) {
    return [
      ev.description ? `<blockquote class="ev-desc">${paras(ev.description)}</blockquote>` : "",
      ev.time_text && ev.start ? `<p><b>Time:</b> ${esc(ev.time_text)}</p>` : "",
      `<p><b>Cost:</b> ${ev.cost ? esc(ev.cost) : ev.is_free === true ? "Free" : '<span class="unk">Not listed</span>'}</p>`,
      ev.tickets_url ? `<p>${extLink(ev.tickets_url, "Tickets")}</p>` : "",
      ev.url && ev.url !== ev.source_url ? `<p>${extLink(ev.url, "Official page")}</p>` : "",
      ev.seriesRec ? `<p>Part of <a href="${root}whats-on.html#s-${attr(ev.seriesRec.id)}">${esc(ev.seriesRec.name)}</a></p>` : "",
      c.recordSource(ev),
    ].join("");
  }
  /** The lean card's source line: "Source: host · Checked Sep 27, 2026" (+ Tickets). The host is searchable here.
   *  The host is named on every card and linked in the event dialog; it is also a link here when the event has no
   *  place page (a place page's full card links it too), so a reader without JavaScript can always reach it. */
  const leanSource = (ev, checked) => {
    const host = esc(hostOf(ev.source_url) || "the source");
    // no ticket link on a cancelled or postponed card (the dialog still lists it, with the status beside it)
    return `<p class="ev-src">Source: ${ev.venue ? host : extLink(ev.source_url, host)}${ev.checked && ev.checked !== checked ? ` · Checked ${esc(fmtDateY(ev.checked))}` : ""}${ev.tickets_url && ev.live ? ` · ${extLink(ev.tickets_url, "Tickets")}` : ""}</p>`;
  };

  /** The date box: weekday and month in caps over the day numeral; a long run's box says "Until" and its last day.
   *  { compact: true } (the lean card) writes <i>Thu</i><b>15</b><i>Oct</i> for .dw .d .mo (45-whats-on.css styles it). */
  function dateBox(date, { until = null, compact = false } = {}) {
    const d = until || date;
    const [dw, dn, mo] = [until ? "Until" : esc(dowShort(d)), Number(d.slice(8)), MON[Number(d.slice(5, 7)) - 1]];
    if (compact) return `<div class="datebox${until ? " is-until" : ""}" aria-hidden="true"><i>${dw}</i><b>${dn}</b><i>${mo}</i></div>`;
    return `<div class="datebox${until ? " is-until" : ""}" aria-hidden="true"><span class="dw">${dw}</span><span class="d">${dn}</span><span class="mo">${mo}</span></div>`;
  }

  /** The lean star: the same button and label; the star itself is drawn by CSS (no SVG per card), and the core sets
   *  aria-pressed when it wires the stars (stars are hidden without JS). */
  const leanStar = (ev) => `<button class="star" type="button" data-star="${attr(ev.id)}" data-star-kind="e" aria-label="Add “${attr(ev.title)}” to My Trip"></button>`;

  function eventCard(root, x, { anchor = true, headingLevel = 3, span = false, compact = false, showDate = true, here = "", lean = false, datebox = false, checked = "" } = {}) {
    const inst = x.ev ? x : { ...(x.instances?.[0] || { day: x.date, date: x.date, s: 0, e: 0, timeUnknown: true }), ev: x };
    const ev = inst.ev;
    const all = ev.instances || [];
    // lean (What's On): a card filed under its first day still carries every day, so its live word follows the event
    // (a four-day festival is not "Ended" after its first evening; the page's own date tests read data-day)
    const multi = all.length > 1 && (span || !x.ev || lean);
    const instAttr = multi && !inst.timeUnknown ? ` data-inst="${all.map((y) => `${y.s}:${y.e}`).join(",")}"` : "";
    // (a lean timed card needs only data-inst for its live word: What's On's own date tests read data-day)
    const daysAttr = multi && !(lean && instAttr) ? ` data-days="${[...new Set(all.map((y) => y.day))].join(" ")}"` : "";
    const tagList = [...new Set((ev.tags || []).map((t) => t.replace(/-/g, " ")))];
    const tags = [ev.is_free === true ? '<span class="free">Free</span>' : "", ...tagList.slice(0, 3).map(esc)].filter(Boolean);
    const q = [...new Set(norm((lean ? [ev.seriesRec?.name, tagList] : [ev.venue?.aliases, ev.seriesRec?.name, tagList.slice(3), (ev.topics || []).map((t) => TOPIC_LABEL[t]), ev.venue?.city]).flat().filter(Boolean).join(" ")).split(/\s+/).filter(Boolean))].join(" ");
    const H = `h${headingLevel}`;
    const t = inst.start && !inst.timeUnknown && !inst.allDay && !inst.run ? bucket(inst.start) : "allday";
    const dead = !ev.live;
    const open = `<article class="ev"${anchor ? ` id="e-${attr(ev.id)}"` : ""} data-ev="${attr(ev.id)}"${ev.region ? ` data-sheet="${ev.region}" data-r="${ev.region}"` : ""}${ev.area ? ` data-a="${attr(ev.area)}"` : ""} data-k="${ev.kind}" data-kg="${ev.kg}" data-day="${inst.day}" data-month="${monthsOf(ev).join(" ")}" data-s="${inst.s}" data-e="${inst.e}"${instAttr}${daysAttr}${inst.run ? ` data-run="${inst.through}"` : ""}${inst.endUnknown ? ' data-end-unknown="1"' : ""}${inst.timeUnknown ? ' data-time-unknown="1"' : ""} data-t="${t}"${ev.place && !lean ? ` data-pl="${attr(ev.place)}"` : ""}${ev.series ? ` data-se="${attr(ev.series)}"` : ""} data-free="${ev.is_free === true ? 1 : 0}" data-q="${attr(q)}"${dead ? ' data-cancelled="1"' : ""}${lean && ev.featured ? ' data-fe="1"' : ""}>`;
    const title = `<${H} class="ev-title"><a href="${root}whats-on.html?e=${attr(ev.id)}#e-${attr(ev.id)}" data-open-event="${attr(ev.id)}">${esc(ev.title)}</a></${H}>`;
    if (lean) {
      // the design's card kicker: KIND · AREA in words, the sheet badge (code, shape, ink: decorative, the area names the
      // place) at its end
      const sb = ev.region ? '<i class="ev-sb" aria-hidden="true"></i>' : "";
      const kicker = [EVENT_KIND_LABEL[ev.kind] || ev.kind, ev.area ? areaName(ev.area) : ""].filter(Boolean).join(" · ");
      const seal = ev.featured ? '<span class="seal">Signature</span>' : "";
      return open
        + (datebox ? dateBox(inst.day, { until: inst.run ? inst.through : null, compact: true }) : "")
        + `<div class="ev-when">${when(inst, { showDate, lean: true })} <span class="ev-status" data-status></span></div>`
        + `<div class="ev-body"><p class="ev-meta"><span class="ev-kind">${esc(kicker)}</span>${c.eventStatusBadge(ev)}${seal}${sb}</p>`
        + title + where(root, ev, here, true)
        + costLine(ev) + leanSource(ev, checked) + "</div>"
        + `${leanStar(ev)}</article>`;
    }
    return open
      + `<div class="ev-when">${when(inst, { showDate })} <span class="ev-status" data-status></span></div>`
      + `<div class="ev-body"><p class="ev-meta">${c.sheetBadge(ev.region)}<span class="ev-kind">${esc(EVENT_KIND_LABEL[ev.kind] || ev.kind)}</span>${c.eventStatusBadge(ev)}</p>`
      + title
      + where(root, ev, here)
      + (compact ? "" : (ev.summary ? `<p class="ev-sum">${esc(ev.summary)}</p>` : "") + (tags.length ? `<p class="ev-tags">${tags.join(" · ")}</p>` : ""))
      + `<details class="ev-more"><summary>Details</summary>${more(root, ev)}</details></div>`
      + `${c.starButton(ev.id, ev.title, { kind: "e" })}</article>`;
  }

  /** What's On: a later listing day of a multi-day event, filed under that day (the card sits under its first day).
   *  <li class="ev-also" data-ev data-sheet data-a data-k data-kg data-day data-free [data-se] [data-cancelled]>
   *  with the title (deep link + dialog; { local: true } links #e-<id> on the page that holds the card), the day's hours
   *  (every start that day: pass the day's instances as { times }), the place and the event's dates. It carries the card's
   *  filter attributes (r reads data-sheet; the page's own date tests read data-day), so the filter treats it like a card:
   *  a day filter shows the day's row, not the far-away card. { slim: true } (needs { local: true }, and a parent that names
   *  the day) writes no filter attribute but data-cancelled, no dialog hook and not the event's dates: the page's script
   *  reads the event from the link's #e-<id> and the day from its day section, copies the card's attributes and adds
   *  data-ev, data-day and data-open-event (What's On keeps its weight down that way; without JS the link jumps to the card). */
  function alsoRow(root, inst, { local = false, slim = false, times = null } = {}) {
    const ev = inst.ev;
    const days = [...new Set((ev.instances || []).map((y) => y.day))];
    const one = (y) => (y.allDay ? "All day" : y.timeUnknown ? (ev.time_text || "") : y.end ? ctx.h.fmtRange(y.start, y.end) : fmtTime(y.start));
    const list = (times && times.length ? times : [inst]).map(one);
    const hours = list.length > 1 ? ctx.h.listJoin(list) : inst.allDay || inst.timeUnknown || inst.end ? list[0] : `${list[0]}, end time not listed`;
    const hoursHtml = hours ? esc(hours) : '<span class="unk">Time not listed</span>';
    const place = ev.venue?.name || ev.location_text || "";
    const range = days.length > 1 ? fmtDateRange(days[0], days[days.length - 1]) : "";
    const status = ev.status && ev.status !== "scheduled" ? ` · ${esc(EVENT_STATUS_LABEL[ev.status] || ev.status)}` : "";
    const href = local ? `#e-${attr(ev.id)}` : `${root}whats-on.html?e=${attr(ev.id)}#e-${attr(ev.id)}`;
    const facets = slim ? "" : `${ev.area ? ` data-a="${attr(ev.area)}"` : ""} data-k="${ev.kind}" data-kg="${ev.kg}"${ev.series ? ` data-se="${attr(ev.series)}"` : ""} data-free="${ev.is_free === true ? 1 : 0}"`;
    return `<li class="ev-also"${slim ? "" : ` data-ev="${attr(ev.id)}"`}${ev.region && !slim ? ` data-sheet="${ev.region}"` : ""}${slim ? "" : ` data-day="${inst.day}"`}${facets}${ev.live ? "" : ' data-cancelled="1"'}><a href="${href}"${slim ? "" : ` data-open-event="${attr(ev.id)}"`}>${esc(ev.title)}</a> <span class="w">${hoursHtml}${place ? ` · ${esc(place)}` : ""}${range && !slim ? ` · ${esc(range)}` : ""}${status}</span></li>`;
  }

  /** A time-first row for short lists ("Today", "This weekend"), styled by .tonight in 20-content.css. */
  function eventRow(root, inst) {
    const ev = inst.ev;
    const timed = inst.start && !inst.timeUnknown && !inst.allDay && !inst.run;
    const t = timed ? fmtTime(inst.start) : "";
    const [hm, ap] = t ? t.split(" ") : ["", ""];
    const label = inst.run ? fmtThrough(inst.through, inst.date) : inst.allDay ? "All day" : "Time not listed";
    const whereText = ev.venue?.name || ev.location_text || "";
    return `<li${ev.region ? ` data-sheet="${ev.region}"` : ""}><a href="${root}whats-on.html?e=${attr(ev.id)}#e-${attr(ev.id)}" data-open-event="${attr(ev.id)}"><time${timed ? ` datetime="${isoLocal(inst.s)}"` : ""}>${t ? `${esc(hm)}<small>${esc(ap)}</small>` : `<small>${esc(label)}</small>`}</time>${ev.region ? ctx.h.bullet(ev.region) : ""}<span><span class="t">${esc(ev.title)}</span><span class="w">${esc([inst.run ? fmtDate(inst.date) : fmtDay(inst.day), whereText].filter(Boolean).join(" · "))}</span></span></a></li>`;
  }

  /** Cards grouped by listing day or month (anchors only on the first card of each event). */
  function eventList(root, instances, { groupBy = "day", headingLevel = 3, showDate } = {}) {
    const seen = new Set();
    const card = (x, sd) => { const a = !seen.has(x.id); seen.add(x.id); return eventCard(root, x, { anchor: a, headingLevel: groupBy === "none" ? headingLevel : headingLevel + 1, showDate: showDate ?? sd }); };
    if (groupBy === "none") return `<div class="grid">${instances.map((x) => card(x, true)).join("")}</div>`;
    const groups = new Map();
    for (const x of instances) { const k = groupBy === "month" ? monthKey(x.day) : x.day; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); }
    return [...groups].map(([k, xs]) => `<h${headingLevel} class="sub-h">${esc(groupBy === "month" ? fmtMonth(k) : fmtDay(k))}</h${headingLevel}><div class="grid">${xs.map((x) => card(x, groupBy === "month")).join("")}</div>`).join("\n");
  }

  return { eventCard, eventRow, eventList, alsoRow, dateBox, costText, whenText, monthsOf };
}
