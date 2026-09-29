/* ============================================================
   site/js/core/status.js · OWNER: E2 (client runtime; ported from Cincy Week)
   Live state for anything rendered with data-s / data-e (epoch ms), every
   minute: sets data-status (upcoming | soon | live | started | running |
   today | past; removed when there is no state) and a visible word in its
   child [data-status] label, never color alone. The rules live in
   lib/status.js liveState(): "Now" only when both ends are published,
   data-end-unknown="1" → "Started", data-time-unknown="1" → day words only
   ("Today"), all day → "Today", data-run (a long run) → no word while it
   runs, data-cancelled="1" → no state. data-inst="s:e,…" follows the
   current (or next) day's hours; data-days gives the days of an item whose
   hours are not listed. Live .ev cards get a progress bar with an
   aria-label ("40 of 180 minutes elapsed").
   ============================================================ */
import { $$ } from "./dom.js";
import { liveState, stateInput } from "../lib/status.js";
import { status as statusOf, MIN } from "../lib/time.js";

export { statusOf };
/** The state of one element (or dataset-like object) at `now`: { st, label, s, e } */
export const stateOf = (el, now) => liveState(stateInput(el.dataset || el), now);

/** Update every [data-s][data-e] element under root. */
export function updateStatus(now, root = document) {
  for (const el of $$("[data-s][data-e]", root)) {
    const { st, label, s, e } = stateOf(el, now);
    if (!st) { if (el.dataset.status) delete el.dataset.status; }
    else if (el.dataset.status !== st) el.dataset.status = st;
    const lab = el.querySelector("[data-status]:not([data-s])");
    if (lab && lab.textContent !== label) lab.textContent = label;
    let bar = el.querySelector(":scope > .ev-progress");
    if (st === "live" && el.classList.contains("ev") && e > s) {
      const total = Math.round((e - s) / MIN), done = Math.min(total, Math.round((now - s) / MIN));
      if (!bar) { bar = document.createElement("span"); bar.className = "ev-progress"; bar.setAttribute("role", "img"); bar.appendChild(document.createElement("i")); el.appendChild(bar); }
      bar.setAttribute("aria-label", `${done} of ${total} minutes elapsed`);
      bar.firstChild.style.setProperty("--p", `${Math.round((done / total) * 100)}%`);
    } else if (bar) bar.remove();
  }
}
