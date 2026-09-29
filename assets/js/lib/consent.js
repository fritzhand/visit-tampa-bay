/* ============================================================
   site/js/lib/consent.js · OWNER: the maintainer (analytics consent, added 2026-09-29)
   The analytics consent decision, pure (no DOM, no storage, no globals): the build, the client
   (core/consent.js) and node:test (tests/consent.test.mjs) all import it. The caller passes in
   what it read from the browser; nothing here reads it itself.

   decide({ id, stored, gpc, host, protocol, webdriver, simulated, qa }) → { action, reason }
     action "load"    load Google Analytics now (the visitor said yes earlier)
            "banner"  ask (no choice yet)
            "none"    do nothing: no banner, no request to any Google host
   The rules, in order:
     1. no measurement id (site.config.json analyticsId "")        → none  "no-id"
     2. localhost, 127.x, [::1], *.localhost, file:, navigator.webdriver (Playwright, the audits, the promo
        renderer) or a simulated clock (?now=)                      → none  "local" | "file" | "automation" | "simulated"
        … unless the URL has ?consent=show (qa: the QA hook lifts this guard and nothing else)
     3. stored "granted"                                            → load  "granted"
     4. stored "denied"                                             → none  "denied"
     5. no choice + navigator.globalPrivacyControl === true         → none  "gpc" (treated as No; no banner)
     6. no choice                                                   → banner "ask"

   Stored choice (localStorage "tbc-consent", read and written by core/consent.js through core/store.js):
     { v: 1, analytics: "granted" | "denied", t: <epoch ms of the choice> }
   ============================================================ */

export const CONSENT_KEY = "tbc-consent";
export const CONSENT_V = 1;
export const CHOICES = ["granted", "denied"];
export const ID_RE = /^G-[A-Z0-9]+$/;
export const QA_PARAM = "consent";
export const QA_VALUE = "show";

/** The banner's words (core/consent.js renders them; tests/consent.test.mjs checks them). */
export const COPY = {
  kicker: "Analytics · your choice",
  kickerSettings: "Analytics settings",
  title: "Count this visit?",
  body: "With your OK, this guide uses Google Analytics to count visits and see which pages people use. Google Analytics sets cookies. Nothing from Google loads unless you choose Allow. Your starred trip is never sent.",
  allow: "Allow analytics",
  deny: "No thanks",
  more: "Privacy details",
  close: "Close",
  on: "Analytics is on",
  off: "Analytics is off",
  gpc: "Your browser sends Global Privacy Control, so this guide treats it as No.",
  toastOn: "Analytics on",
  toastOff: "Analytics off",
  guarded: "not loaded here: a local or test view",
};

/** The stored value (a string from localStorage, or null) → "granted" | "denied" | null. Anything else is no choice. */
export function parseChoice(raw) {
  if (raw == null || raw === "") return null;
  let v = raw;
  if (typeof raw === "string") { try { v = JSON.parse(raw); } catch { return null; } }
  if (!v || typeof v !== "object" || Array.isArray(v) || v.v !== CONSENT_V) return null;
  return CHOICES.includes(v.analytics) ? v.analytics : null;
}

/** The record to store for a choice: { v: 1, analytics, t }. */
export function makeRecord(choice, t) {
  if (!CHOICES.includes(choice)) throw new Error(`consent: unknown choice ${choice}`);
  return { v: CONSENT_V, analytics: choice, t: Math.round(Number(t) || 0) };
}

/** true for hosts that are this machine (a dev server, a Playwright run). */
export function isLocalHost(host) {
  const h = String(host || "").toLowerCase();
  return h === "" || h === "localhost" || h.endsWith(".localhost") || /^127(\.\d{1,3}){3}$/.test(h) || h === "[::1]" || h === "::1" || h === "0.0.0.0";
}

/** The QA hook: ?consent=show in a query string ("?a=1&consent=show"). */
export function qaForced(search) {
  const q = String(search || "").replace(/^\?/, "");
  const dec = (s) => { try { return decodeURIComponent(s.replace(/\+/g, " ")); } catch { return s; } };
  return q.split("&").some((kv) => { const [k, v = ""] = kv.split("="); return dec(k) === QA_PARAM && dec(v) === QA_VALUE; });
}

/** Why this environment never asks or loads (rule 2), or null. */
export function guardReason({ host, protocol, webdriver, simulated } = {}) {
  if (String(protocol || "").toLowerCase() === "file:") return "file";
  if (isLocalHost(host)) return "local";
  if (webdriver === true) return "automation";
  if (simulated) return "simulated";
  return null;
}

/** What to do on this page view (the table at the top of this file). */
export function decide({ id, stored = null, gpc = false, host, protocol, webdriver = false, simulated = false, qa = false } = {}) {
  if (!id || !ID_RE.test(id)) return { action: "none", reason: "no-id" };
  const guard = qa ? null : guardReason({ host, protocol, webdriver, simulated });
  if (guard) return { action: "none", reason: guard };
  const choice = parseChoice(stored);
  if (choice === "granted") return { action: "load", reason: "granted" };
  if (choice === "denied") return { action: "none", reason: "denied" };
  if (gpc === true) return { action: "none", reason: "gpc" };
  return { action: "banner", reason: "ask" };
}

/** The state the settings panel prints: { on, text, note } (note: the GPC sentence when GPC decided it). */
export function stateOf({ stored = null, gpc = false } = {}) {
  const choice = parseChoice(stored);
  if (choice === "granted") return { on: true, text: COPY.on, note: null };
  return { on: false, text: COPY.off, note: choice === null && gpc === true ? COPY.gpc : null };
}

/** gtag.js, loaded only after a yes. */
export const gtagSrc = (id) => `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;

/** The gtag() calls made after a yes, in order: consent defaults first, then js, then config (Google signals and
 *  ad personalization off). pageLocation, when given, is the page's URL without its #fragment (a shared trip lives there). */
export function gtagCalls(id, { now = 0, pageLocation = null } = {}) {
  const config = { allow_google_signals: false, allow_ad_personalization_signals: false };
  if (pageLocation) config.page_location = pageLocation;
  return [
    ["consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }],
    ["js", new Date(now)],
    ["config", id, config],
  ];
}

/** The calls made when the visitor revokes a yes. */
export const revokeCalls = () => [["consent", "update", { analytics_storage: "denied" }]];

/** The window property Google Analytics checks before sending anything: window["ga-disable-G-XXXX"] = true. */
export const disableKey = (id) => `ga-disable-${id}`;

/** A URL without its #fragment. */
export const withoutHash = (href) => String(href || "").split("#")[0];

/** Google Analytics cookie names to delete: _ga, _ga_<container> (the id without "G-"), and any other _ga*, _gid or
 *  _gat* cookie present in document.cookie. */
export function gaCookieNames(id, cookieString = "") {
  const names = new Set(["_ga"]);
  if (id && ID_RE.test(id)) names.add(`_ga_${id.slice(2)}`);
  for (const part of String(cookieString || "").split(";")) {
    const name = part.split("=")[0].trim();
    if (/^_ga(_[A-Za-z0-9]+)?$|^_gid$|^_gat(_[A-Za-z0-9-]+)?$/.test(name)) names.add(name);
  }
  return [...names];
}

/** Every domain a cookie for this host could have been set on: "" (host-only), the host, then each parent domain with and
 *  without the leading dot, down to two labels ("fritzhand.github.io" → "", "fritzhand.github.io", ".fritzhand.github.io",
 *  "github.io", ".github.io"). A browser ignores the ones it would never have accepted (a public suffix). */
export function cookieDomains(host) {
  const h = String(host || "").toLowerCase().replace(/^\.+/, "");
  const out = [""];
  if (!h || isLocalHost(h) || /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(":")) { if (h) out.push(h); return out; }
  const labels = h.split(".");
  for (let i = 0; i <= labels.length - 2; i++) { const d = labels.slice(i).join("."); out.push(d, `.${d}`); }
  return out;
}

/** Every path a cookie for this page could have been set on: "/" and each ancestor of the page's path, with and without
 *  the trailing slash ("/visit-tampa-bay/places/x.html" → "/", "/visit-tampa-bay", "/visit-tampa-bay/", "/visit-tampa-bay/places", …). */
export function cookiePaths(pathname) {
  const parts = String(pathname || "/").split("/").filter(Boolean);
  const out = ["/"];
  for (let i = 1; i < parts.length; i++) { const p = `/${parts.slice(0, i).join("/")}`; out.push(p, `${p}/`); }
  if (parts.length) out.push(`/${parts.join("/")}`);
  return [...new Set(out)];
}

/** The document.cookie assignments that expire every named cookie on every domain and path it could be on. */
export function expireCookies(names, host, pathname) {
  const out = [];
  for (const n of names) for (const d of cookieDomains(host)) for (const p of cookiePaths(pathname)) {
    out.push(`${n}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${p}${d ? `; domain=${d}` : ""}; SameSite=Lax`);
  }
  return out;
}
