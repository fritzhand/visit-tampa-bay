/* ============================================================
   build/components/event-card.mjs · OWNER: E1 (engine; ported from Cincy Week's schedule card)
   The What's On lane may extend it (additive options; keep the markup contract).

   makeEventCards(ctx) → {
     eventCard(root, evOrInstance, { anchor = true, headingLevel = 3, span = false, compact = false, showDate = true, here = "" }),
     eventRow(root, instance)          compact time-first row (inside <ol class="tonight">),
     eventList(root, instances, { groupBy: "day" | "month" | "none", headingLevel, showDate }),
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
     for it (its s..e span the whole run) and prints "Through <date>".
   - data-cancelled="1" when the event is cancelled or postponed (never "Now", left out of counts).
   - data-q is normalized text of what the card does NOT print (place aliases, series name, tags beyond the
     three shown, topics); a filter adds the card's visible text.
   Unknowns print as unknowns: "Time not listed", "end time not listed", "Place not listed".
   ============================================================ */
import { esc, attr, paras, extLink } from "../core/util.mjs";
import { icon } from "../core/icons.mjs";
import { EVENT_KIND_LABEL, TOPIC_LABEL } from "../core/vocab.mjs";
import { norm } from "../../site/js/lib/search.js";
import { fmtTime, fmtDay, fmtDate, fmtDateRange, fmtThrough, isoLocal, bucket, monthKey, dateRange, fmtMonth } from "../core/time.mjs";

/** A sprite icon for card internals (the same symbol as h.icon, a few bytes lighter: cards repeat it hundreds of times). */
const ic = (name) => { icon(name); return `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`; };

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

  /** "Sat, Oct 24 · 4:00–9:00 PM" as <time> elements; one AM/PM when both share it. */
  function when(inst, { showDate = true } = {}) {
    const ev = inst.ev;
    if (inst.run) {
      const hours = inst.allDay ? "All day" : inst.start ? `${fmtTime(inst.start)}${inst.end ? `–${fmtTime(inst.end)}` : ""} daily` : "";
      return `<span class="ev-run">${esc(fmtThrough(inst.through, inst.date))}</span>${hours ? ` <span class="ev-dates">· ${esc(hours)}</span>` : ev.time_text ? ` <span class="ev-dates">· ${esc(ev.time_text)}</span>` : ""}`;
    }
    const multi = ev.end_date && ev.end_date !== ev.date;
    const date = showDate ? `<span class="ev-date">${esc(multi ? fmtDateRange(ev.date, ev.end_date) : fmtDay(inst.day))}</span> · ` : multi ? `<span class="ev-date">${esc(fmtDateRange(ev.date, ev.end_date))}</span> · ` : "";
    if (inst.allDay) return `${date}<span>All day</span>`;
    if (inst.timeUnknown) return `${date}${ev.time_text ? `<span class="ev-tt">${esc(ev.time_text)}</span>` : '<span class="unk">Time not listed</span>'}`;
    const a = fmtTime(inst.start), b = inst.end ? fmtTime(inst.end) : "";
    const sameHalf = b && a.slice(-2) === b.slice(-2) && inst.end > inst.start;
    const t1 = `<time datetime="${isoLocal(inst.s)}">${esc(sameHalf ? a.slice(0, -3) : a)}</time>`;
    const late = inst.lateNight ? ' <span class="ev-dates">· after midnight</span>' : "";
    if (!b) return `${date}${t1} <span class="unk">end time not listed</span>${late}`;
    return `${date}${t1}–<time datetime="${isoLocal(inst.e)}">${esc(b)}</time>${late}`;
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
  function where(root, ev, here) {
    const v = ev.venue;
    if (v && v.id === here) return ev.area && ev.area !== v.area ? `<p class="ev-where">${ic("pin")}<span>${esc(areaName(ev.area))}</span></p>` : "";
    if (v) return `<p class="ev-where">${ic("pin")}<span><a href="${root}places/${attr(v.id)}.html">${esc(v.name)}</a>${v.area ? `<span class="ev-area"> · ${esc(areaName(v.area))}</span>` : ""}</span></p>`;
    if (ev.location_text) return `<p class="ev-where">${ic("pin")}<span>${esc(ev.location_text)}${ev.area ? `<span class="ev-area"> · ${esc(areaName(ev.area))}</span>` : ""}</span></p>`;
    return `<p class="ev-where">${ic("pin")}<span class="unk">Place not listed</span></p>`;
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

  function eventCard(root, x, { anchor = true, headingLevel = 3, span = false, compact = false, showDate = true, here = "" } = {}) {
    const inst = x.ev ? x : { ...(x.instances?.[0] || { day: x.date, date: x.date, s: 0, e: 0, timeUnknown: true }), ev: x };
    const ev = inst.ev;
    const all = ev.instances || [];
    const multi = all.length > 1 && (span || !x.ev);
    const instAttr = multi && !inst.timeUnknown ? ` data-inst="${all.map((y) => `${y.s}:${y.e}`).join(",")}"` : "";
    const daysAttr = multi ? ` data-days="${[...new Set(all.map((y) => y.day))].join(" ")}"` : "";
    const tagList = [...new Set((ev.tags || []).map((t) => t.replace(/-/g, " ")))];
    const tags = [ev.is_free === true ? '<span class="free">Free</span>' : "", ...tagList.slice(0, 3).map(esc)].filter(Boolean);
    const q = [...new Set(norm([ev.venue?.aliases, ev.seriesRec?.name, tagList.slice(3), (ev.topics || []).map((t) => TOPIC_LABEL[t]), ev.venue?.city].flat().filter(Boolean).join(" ")).split(/\s+/).filter(Boolean))].join(" ");
    const H = `h${headingLevel}`;
    const t = inst.start && !inst.timeUnknown && !inst.allDay && !inst.run ? bucket(inst.start) : "allday";
    const dead = !ev.live;
    return `<article class="ev"${anchor ? ` id="e-${attr(ev.id)}"` : ""} data-ev="${attr(ev.id)}"${ev.region ? ` data-sheet="${ev.region}" data-r="${ev.region}"` : ""}${ev.area ? ` data-a="${attr(ev.area)}"` : ""} data-k="${ev.kind}" data-kg="${ev.kg}" data-day="${inst.day}" data-month="${monthsOf(ev).join(" ")}" data-s="${inst.s}" data-e="${inst.e}"${instAttr}${daysAttr}${inst.run ? ` data-run="${inst.through}"` : ""}${inst.endUnknown ? ' data-end-unknown="1"' : ""}${inst.timeUnknown ? ' data-time-unknown="1"' : ""} data-t="${t}"${ev.place ? ` data-pl="${attr(ev.place)}"` : ""}${ev.series ? ` data-se="${attr(ev.series)}"` : ""} data-free="${ev.is_free === true ? 1 : 0}" data-q="${attr(q)}"${dead ? ' data-cancelled="1"' : ""}>`
      + `<div class="ev-when">${when(inst, { showDate })} <span class="ev-status" data-status></span></div>`
      + `<div class="ev-body"><p class="ev-meta">${c.sheetBadge(ev.region)}<span class="ev-kind">${esc(EVENT_KIND_LABEL[ev.kind] || ev.kind)}</span>${c.eventStatusBadge(ev)}</p>`
      + `<${H} class="ev-title"><a href="${root}whats-on.html?e=${attr(ev.id)}#e-${attr(ev.id)}" data-open-event="${attr(ev.id)}">${esc(ev.title)}</a></${H}>`
      + where(root, ev, here)
      + (compact ? "" : (ev.summary ? `<p class="ev-sum">${esc(ev.summary)}</p>` : "") + (tags.length ? `<p class="ev-tags">${tags.join(" · ")}</p>` : ""))
      + `<details class="ev-more"><summary>Details</summary>${more(root, ev)}</details></div>`
      + `${c.starButton(ev.id, ev.title, { kind: "e" })}</article>`;
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

  return { eventCard, eventRow, eventList, whenText, monthsOf };
}

