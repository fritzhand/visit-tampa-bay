/* ============================================================
   site/js/core/dom.js · OWNER: E2 (client runtime; ported from Cincy Week)
   Tiny DOM helpers shared by the core modules (features get `app` instead).
   ============================================================ */
import { esc } from "../lib/text.js";

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
export const html = document.documentElement;
export const ROOT = html.getAttribute("data-root") || "";
export const PAGE = html.getAttribute("data-page") || "";
export const DATA_V = html.getAttribute("data-v") || "";
export const motionOK = () => !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
export const IS_MAC = /mac|iphone|ipad|ipod/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || "");
export { esc };
/** Focusable elements that are actually visible. */
export const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
export const focusables = (el) => $$(FOCUSABLE, el).filter((x) => x.offsetParent !== null || x.getClientRects().length);
/** A click that should open in a new tab/window is left to the browser. */
export const modified = (e) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0;
/** A sprite icon (the build inlines the sprite once per page): I("star", "i-fill") */
export const I = (name, cls = "") => `<svg class="i${cls ? " " + cls : ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
/** A sheet mark (#b-<region>): decorative, always next to the region's name. */
export const B = (region) => `<svg class="bullet" aria-hidden="true"><use href="#b-${esc(region)}"/></svg>`;
/** An external link: new tab, and it says so (the crawler's rule for built pages; the client keeps it). */
export const ext = (href, inner, cls = "") => `<a${cls ? ` class="${cls}"` : ""} href="${esc(href)}" target="_blank" rel="noopener">${inner}<span class="sr-only"> (opens in a new tab)</span></a>`;
/** The sheet badge (same markup as the build's c.sheetBadge). */
export const sheetBadge = (region, name) => (region ? `<span class="sheet-badge" data-sheet="${esc(region)}">${B(region)}${esc(name || region)}</span>` : "");
/** A root-relative URL made absolute (for share links and calendar files). */
export const absUrl = (path) => new URL(`${ROOT}${path}`, location.href).href;
