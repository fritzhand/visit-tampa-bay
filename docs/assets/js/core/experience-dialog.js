/* ============================================================
   site/js/core/experience-dialog.js · OWNER: E2 (client runtime; replaces Cincy Week's work dialog)
   (under core/ because every page hosts #experience-dialog: build/core/shell.mjs)
     open(id, { trigger, push })  fetch assets/data/experiences.json once, render into #experience-dialog,
                                  set ?x=<id> with pushState (Back closes it), focus #xd-title
     initExperienceDialog()       a click on [data-open-experience] opens it (modifier clicks keep the link);
                                  ?x= on load opens it (experiences.html?x=<id> is the deep link); popstate
                                  syncs; idle prefetch on pages that can open it
   The dialog: the rights-cleared image with its credit, or the typographic plate (chart code + name, never
   a stock photo); sheet badge, kind and status (with the source's note); name; operator; where it departs
   (the place's page, the source's words, or the start address); our summary; the operator's own words in
   quotation (≤ 40 words, attributed); duration, price, schedule, season, ages, phone; booking and official
   links; a mini map and directions; every source with its checked date; actions: Add to My Trip, Share.
   Unknowns are printed as unknowns ("Duration not listed", "Price not listed").
   ============================================================ */
import { $, ROOT, esc, modified, I, ext, sheetBadge, absUrl } from "./dom.js";
import { getJSON, idle } from "./data.js";
import { showModal, hideModal, current } from "./modal.js";
import { has, toggle, subscribe } from "./trip-store.js";
import { share } from "./share.js";
import { toast } from "./toast.js";
import { searchOpener } from "./search.js";
import { mapBlock } from "./places.js";
import { back, settling, settled } from "./history.js";
import { fmtDateY } from "../lib/time.js";
import { hostOf } from "../lib/text.js";

let modal, bodyEl, kickerEl, openId = null, pushed = false;

function media(data, x) {
  const im = x.im;
  if (im && im.f) {
    const credit = [im.cr ? esc(im.cr) : "", im.pg ? ext(im.pg, "Image page") : ""].filter(Boolean).join(" · ");
    return `<figure class="photo-fig xd-media"><img src="${esc(ROOT + im.f)}" width="${Number(im.w) || 640}" height="${Number(im.h) || 427}" alt="${esc(im.a || "")}" decoding="async">${credit ? `<figcaption><span class="credit">${credit}</span></figcaption>` : ""}</figure>`;
  }
  const code = data.regions && data.regions[x.r] ? data.regions[x.r].c : "";
  return `<span class="plate-type lg xd-media"${x.r ? ` data-sheet="${esc(x.r)}"` : ""} aria-hidden="true">${code ? `<span class="pt-code">${esc(code)}</span>` : ""}<span class="pt-name">${esc(x.n)}</span></span>`;
}

function departs(data, x) {
  const p = x.dp && data.places ? data.places[x.dp] : null;
  if (p) return `Departs from <a href="${ROOT}${esc(p.u || `places/${x.dp}.html`)}">${esc(p.n)}</a>`;
  if (x.dt) return `Departs from ${esc(x.dt)}`;
  if (x.ad) return `Starts at ${esc(x.ad)}`;
  return '<span class="unk">Departure point not listed</span>';
}

function render(data, x) {
  const lb = data.lb || {};
  const region = data.regions && data.regions[x.r];
  kickerEl.innerHTML = sheetBadge(x.r, region ? region.s : "");
  const status = x.st && x.st !== "open" ? ` <span class="badge ${x.st === "closed" || x.st === "temporarily-closed" ? "badge-warn" : x.st === "seasonal" ? "" : "badge-unconfirmed"}">${esc((lb.st && lb.st[x.st]) || x.st)}</span>` : "";
  const area = x.a && data.areas && data.areas[x.a] ? `<a href="${ROOT}areas/${esc(x.a)}.html">${esc(data.areas[x.a].n)}</a>` : "";
  const price = x.pr ? esc(x.pr) : x.f === 1 ? '<span class="badge badge-free">Free</span>' : '<span class="unk">Price not listed</span>';
  const facts = [
    ["Duration", x.du ? esc(x.du) : '<span class="unk">Duration not listed</span>'],
    ["Price", price],
    ["Schedule", x.sc ? esc(x.sc) : '<span class="unk">Schedule not listed</span>'],
    x.ss ? ["Season", esc(x.ss)] : null,
    x.ag ? ["Ages", esc(x.ag)] : null,
    x.ph ? ["Phone", `<a href="tel:${esc(x.ph.replace(/[^\d+]/g, ""))}">${esc(x.ph)}</a>`] : null,
    area ? ["Area", area] : null,
    (x.tp || []).length ? ["Topics", esc(x.tp.map((t) => (lb.tp && lb.tp[t]) || t).join(", "))] : null,
  ].filter(Boolean);
  const quote = x.q ? `<blockquote class="evd-desc xd-quote"><p>${esc(x.q)}</p></blockquote><p class="faint evd-cite">${esc(x.op)}, ${ext(x.qs || x.src, esc(hostOf(x.qs || x.src) || "its site"))}</p>` : "";
  const links = [x.bu ? ext(x.bu, `${I("ticket")}Book with the operator`, "btn btn-secondary btn-sm") : "", x.u && x.u !== x.bu ? ext(x.u, `${I("ext")}Official site`, "btn btn-secondary btn-sm") : ""].filter(Boolean).join("");
  const sources = [...new Set([x.src, x.qs, ...(x.as || [])].filter(Boolean))];
  const onTrip = has(x.id);
  bodyEl.dataset.xd = x.id;
  bodyEl.innerHTML = `${media(data, x)}
<p class="evd-kind label">${I("daymark")}${esc((lb.k && lb.k[x.k]) || x.k)}${status}</p>
<h2 id="xd-title" tabindex="-1">${esc(x.n)}</h2>
<p class="xd-op">${esc(x.op)}</p>
${x.st !== "open" && x.sn ? `<p class="ev-where xd-status">${I("warn")}<span>${esc(x.sn)}</span></p>` : ""}
<div class="evd-grid"><div class="evd-main">
<p class="ev-where evd-where">${I("daymark")}<span>${departs(data, x)}${x.ad && (x.dp || x.dt) ? `<span class="evd-addr">${esc(x.ad)}</span>` : ""}</span></p>
${x.sm ? `<p class="evd-sum">${esc(x.sm)}</p>` : ""}
${quote}
<dl class="facts evd-facts">${facts.map(([k, v]) => `<div class="fact"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
${links ? `<p class="evd-dir xd-links">${links}</p>` : ""}
</div><div class="evd-side">${mapBlock(data.map, x.ll, { sheet: x.r, label: x.dp && data.places && data.places[x.dp] ? data.places[x.dp].n : x.n, focus: `experience:${x.id}`, address: x.ad })}</div></div>
<p class="source-line">${I("info")}<span>Source${sources.length > 1 ? "s" : ""}: ${sources.map((u) => ext(u, esc(hostOf(u) || u))).join(" · ")}</span>${x.ck ? `<span>Checked ${esc(fmtDateY(x.ck))}</span>` : ""}</p>
<div class="evd-actions"><button class="btn btn-river" type="button" data-xd-star aria-pressed="${onTrip}">${I("star", onTrip ? "i-fill" : "")}<span>${onTrip ? "In My Trip" : "Add to My Trip"}</span></button><button class="btn btn-secondary" type="button" data-xd-share>${I("share")}Share</button></div>`;
}

function syncStar() {
  const b = bodyEl && $("[data-xd-star]", bodyEl);
  if (!b || !openId) return;
  const on = has(openId);
  b.setAttribute("aria-pressed", String(on));
  b.innerHTML = `${I("star", on ? "i-fill" : "")}<span>${on ? "In My Trip" : "Add to My Trip"}</span>`;
}

const urlFor = (id) => { const u = new URL(location.href); if (id) u.searchParams.set("x", id); else u.searchParams.delete("x"); u.hash = ""; return u.pathname + u.search; };
export const deepLink = (id) => absUrl(`experiences.html?x=${encodeURIComponent(id)}#x-${encodeURIComponent(id)}`);

export async function open(id, { trigger = null, push = true } = {}) {
  if (!modal) return;
  let data;
  try { data = await getJSON("experiences.json"); }
  catch { location.href = `${ROOT}experiences.html?x=${encodeURIComponent(id)}#x-${encodeURIComponent(id)}`; return; }
  const x = (data.experiences || []).find((r) => r.id === id);
  if (!x) return;
  render(data, x);
  openId = id;
  if (push) { await settled(); history.pushState({ xd: id }, "", urlFor(id)); pushed = true; } else pushed = false;
  showModal(modal, { trigger, focus: "#xd-title", onClose: () => {
    const was = pushed; openId = null; pushed = false;
    if (trigger && document.contains(trigger)) requestAnimationFrame(() => { const r = trigger.getBoundingClientRect(); if (r.top < 140 || r.bottom > innerHeight - 70) trigger.scrollIntoView({ block: "center" }); });
    if (was && history.state && history.state.xd === id) back();
    else if (new URL(location.href).searchParams.has("x")) history.replaceState(history.state, "", urlFor(null) + location.hash);
  } });
}

export function initExperienceDialog() {
  modal = $("#experience-dialog"); if (!modal) return;
  bodyEl = $("[data-xd-body]", modal); kickerEl = $("[data-xd-kicker]", modal);
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-open-experience]");
    if (!a || modified(e)) return;
    e.preventDefault();
    open(a.dataset.openExperience, { trigger: a.closest("#search") ? searchOpener() || $("#main") : a });
  });
  modal.addEventListener("click", (e) => {
    if (!openId) return;
    if (e.target.closest("[data-xd-star]")) { const on = toggle(openId, "x"); syncStar(); toast(on ? "Added to My Trip" : "Removed from My Trip", { link: on ? true : null }); }
    if (e.target.closest("[data-xd-share]")) share({ title: $("#xd-title", modal).textContent, url: deepLink(openId) });
  });
  subscribe(syncStar);
  window.addEventListener("popstate", () => {
    if (settling()) return; // our own back() after a close
    const id = new URL(location.href).searchParams.get("x");
    if (!id && openId && current() === modal) { pushed = false; hideModal(); }
    else if (id && id !== openId) open(id, { push: false });
  });
  const id = new URL(location.href).searchParams.get("x");
  if (id && /^[a-z0-9][a-z0-9-]*$/.test(id)) {
    const card = document.getElementById(`x-${id}`);
    open(id, { push: false, trigger: card && card.querySelector("[data-open-experience]") });
  }
  if (document.querySelector("[data-open-experience]")) idle(() => getJSON("experiences.json").catch(() => {}));
}
