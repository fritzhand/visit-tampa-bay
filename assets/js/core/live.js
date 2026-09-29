/* ============================================================
   site/js/core/live.js · OWNER: E2 (client runtime; ported from Cincy Week's Live pill)
   The topbar pill ([data-live-pill] → whats-on.html?when=today, text in
   [data-live-text]): "On today · 5", shown only when at least one event is
   listed today and has not ended (cancelled, postponed and long runs left
   out; an event whose hours are not listed counts for its whole day).
   events.json is fetched when the browser is idle; the count follows the
   clock every minute. Hidden otherwise (the build ships it hidden).
   ============================================================ */
import { $ } from "./dom.js";
import { getJSON, idle } from "./data.js";
import { onTick } from "./clock.js";
import { nyParts } from "../lib/time.js";

/** How many live events have an instance listed today that has not ended at `now`. */
export function onToday(events, now) {
  const today = nyParts(now).date;
  let n = 0;
  for (const ev of events) {
    if (ev.st === "cancelled" || ev.st === "postponed") continue;
    if ((ev.i || []).some(([day, , e, f]) => !(f & 32) && day === today && e > now)) n++;
  }
  return n;
}

export function initLive() {
  const pill = $("[data-live-pill]");
  if (!pill) return;
  idle(() => getJSON("events.json").then((data) => {
    onTick((t) => {
      const n = onToday(data.events || [], t);
      pill.hidden = n === 0;
      const txt = $("[data-live-text]", pill);
      if (txt) txt.textContent = `On today · ${n}`;
      pill.setAttribute("aria-label", `${n} ${n === 1 ? "event" : "events"} on today, in What's On`);
    });
  }).catch(() => {}));
}
