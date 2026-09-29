/* ============================================================
   site/js/core/consent.js · OWNER: the maintainer (analytics consent, 2026-09-29)
   Google Analytics 4 only after a yes. Pages carry <meta name="tbc-analytics">
   and no Google script; lib/consent.js decide() says load | banner | none.
   The region (first in <body>, drawn at the bottom, never takes focus on
   its own) asks; [data-consent-open] reopens it as settings (focus moves in;
   Esc or Close returns it). A choice goes to tbc-consent, closes the region
   and toasts. Revoke: ga-disable, consent update denied, _ga cookies expired.
   ============================================================ */
import { $, $$, ROOT, esc } from "./dom.js";
import { raw } from "./store.js";
import { toast } from "./toast.js";
import { isSimulated } from "./clock.js";
import { CONSENT_KEY, COPY, parseChoice, makeRecord, decide, stateOf, qaForced, guardReason, gtagSrc, gtagCalls, revokeCalls, disableKey, withoutHash, gaCookieNames, expireCookies } from "../lib/consent.js";

const meta = $('meta[name="tbc-analytics"]');
const ID = (meta && meta.getAttribute("content")) || "";
let loaded = false, box = null, returnTo = null, first = null;

const gpc = () => { try { return navigator.globalPrivacyControl === true; } catch { return false; } };
const env = () => ({ id: ID, stored: raw.get(CONSENT_KEY), gpc: gpc(), host: location.hostname, protocol: location.protocol, webdriver: navigator.webdriver === true, simulated: isSimulated(), qa: qaForced(location.search) });

function gtag() { (window.dataLayer = window.dataLayer || []).push(arguments); }

function load() {
  window[disableKey(ID)] = false;
  if (loaded) { gtag("consent", "update", { analytics_storage: "granted" }); return; }
  loaded = true;
  window.gtag = gtag;
  for (const c of gtagCalls(ID, { now: Date.now(), pageLocation: withoutHash(location.href) })) gtag(...c);
  const s = document.createElement("script");
  s.async = true;
  s.src = gtagSrc(ID);
  document.head.appendChild(s);
}

function clearCookies() {
  let jar = "";
  try { jar = document.cookie; } catch { return; }
  for (const c of expireCookies(gaCookieNames(ID, jar), location.hostname, location.pathname)) { try { document.cookie = c; } catch { /* blocked */ } }
}

function revoke() {
  window[disableKey(ID)] = true;
  if (loaded) for (const c of revokeCalls()) gtag(...c);
  clearCookies();
}

/** Apply a choice: load when the table says so, else make sure nothing counts. Returns the decision. */
function apply(choice) {
  if (choice !== "granted") { revoke(); return { action: "none", reason: "denied" }; }
  const d = decide(env());
  if (d.action === "load") load();
  return d;
}

const setExpanded = (on) => $$("[data-consent-open]").forEach((b) => b.setAttribute("aria-expanded", String(on)));
/* body.consent-open pads the page by the region's height */
const pad = () => { if (box) document.documentElement.style.setProperty("--consent-h", `${box.offsetHeight}px`); };

function close(restore = true) {
  if (!box) return;
  const hadFocus = box.contains(document.activeElement);
  box.remove();
  box = null;
  document.body.classList.remove("consent-open");
  window.removeEventListener("resize", pad);
  setExpanded(false);
  // first question: focus falls to where the region was (next Tab: the skip link); settings: back to the button
  if (restore && hadFocus && returnTo && document.contains(returnTo)) returnTo.focus({ preventScroll: true });
  returnTo = null;
}

function choose(choice) {
  raw.set(CONSENT_KEY, JSON.stringify(makeRecord(choice, Date.now())));
  const d = apply(choice);
  close();
  const guard = choice === "granted" && d.action !== "load" ? guardReason(env()) : null;
  toast(choice === "granted" ? (guard ? `${COPY.toastOn} · ${COPY.guarded}` : COPY.toastOn) : COPY.toastOff);
}

/** Show the region: mode "ask" (first visit) or "settings" (the footer button). */
function show(mode, trigger = null) {
  if (box) close(false);
  const st = stateOf({ stored: raw.get(CONSENT_KEY), gpc: gpc() });
  const settings = mode === "settings";
  box = document.createElement("section");
  box.className = "consent";
  box.id = "consent";
  box.setAttribute("role", "region");
  box.setAttribute("aria-labelledby", "consent-title");
  box.dataset.consent = mode;
  box.innerHTML = `<div class="consent-card">
<p class="consent-kicker label">${esc(settings ? COPY.kickerSettings : COPY.kicker)}</p>
<h2 class="consent-title" id="consent-title" tabindex="-1">${esc(COPY.title)}</h2>
${settings ? `<p class="consent-state" data-consent-state="${st.on ? "on" : "off"}"><b>${esc(st.text)}.</b>${st.note ? ` ${esc(st.note)}` : ""}</p>` : ""}
<p class="consent-text">${esc(COPY.body)}</p>
<div class="consent-actions"><button class="btn consent-btn" type="button" data-consent-choice="granted">${esc(COPY.allow)}</button><button class="btn consent-btn" type="button" data-consent-choice="denied">${esc(COPY.deny)}</button></div>
<p class="consent-foot"><a href="${ROOT}about.html#privacy">${esc(COPY.more)}</a>${settings ? `<button class="btn btn-ghost consent-close" type="button" data-consent-close>${esc(COPY.close)}</button>` : ""}</p>
</div>`;
  box.addEventListener("click", (e) => {
    const c = e.target.closest("[data-consent-choice]");
    if (c) choose(c.getAttribute("data-consent-choice"));
    else if (e.target.closest("[data-consent-close]")) close();
  });
  // Esc never chooses: it closes the settings view only
  box.addEventListener("keydown", (e) => { if (e.key === "Escape" && box && box.dataset.consent === "settings") { e.preventDefault(); close(); } });
  document.body.insertBefore(box, document.body.firstChild);
  document.body.classList.add("consent-open");
  pad();
  window.addEventListener("resize", pad);
  returnTo = trigger;
  if (settings) {
    setExpanded(true);
    $("#consent-title", box).focus({ preventScroll: true });
  }
}

/** QA and features: this page view's decision, and whether gtag.js was injected. */
export const consentState = () => ({ id: ID, choice: parseChoice(raw.get(CONSENT_KEY)), first, loaded, open: box ? box.dataset.consent : null });
export const openConsent = (trigger = null) => { if (ID) show("settings", trigger); };

export function initConsent() {
  if (!ID) return;
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-consent-open]");
    if (!b) return;
    e.preventDefault();
    if (box && box.dataset.consent === "settings") close(); else show("settings", b);
  });
  window.addEventListener("storage", (e) => {
    if (e.key !== CONSENT_KEY) return;
    const c = parseChoice(e.newValue);
    if (!c) return;
    close();
    apply(c);
  });
  first = decide(env());
  if (first.action === "load") load();
  else if (first.action === "banner") show("ask");
  else if (first.reason === "denied") clearCookies();   // left by a tab still counting when you said No elsewhere
}
