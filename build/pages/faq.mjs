/* ============================================================
   build/pages/faq.mjs · OWNER: the Visit lane (getting-around, when-to-visit, faq, about)
   faq.html: every question in data/faqs.json, grouped by its topic, each a <details class="faq" id="fq-<id>"> (search
   entries link faq.html#fq-<id>) with the answer (our plain words, only what the source says) and its source line
   ("Source: host · Checked Sep 27, 2026"). Without JS every question is on the page, closed, topic by topic (the TOC
   lists the topics). With JS the core list filter (core/filter.js) reads the search box (?q=) and the topic chips
   (?topic=<h.slugify(topic)>, comma-separated), both kept in the URL; features/faq.js opens the question named in the
   hash and the answers a search finds.
   Exports faqItem() and TOPIC_ICON for visit.mjs, which prints the getting-around and weather questions on its pages
   (there without the fq- ids: those belong to this page).
   ============================================================ */
import { norm } from "../../site/js/lib/search.js";

/** Topic order on the page (a visitor's order: seasons and weather first); topics not listed follow in data order. */
export const TOPIC_ORDER = ["When to visit", "Weather & hurricanes", "Sun & heat", "Beaches & water safety", "Getting around",
  "Money & taxes", "Alcohol & rules", "Safety", "Accessibility", "Visitor information"];
/** A chart symbol per topic (always beside the topic's name). */
export const TOPIC_ICON = {
  "When to visit": "calendar", "Weather & hurricanes": "wave", "Sun & heat": "sun", "Beaches & water safety": "umbrella",
  "Getting around": "bus", "Money & taxes": "ticket", "Alcohol & rules": "glass", Safety: "warn", Accessibility: "users",
  "Visitor information": "info",
};
/** Pages that say more about a topic (the section head's "more" link). */
const TOPIC_MORE = {
  "When to visit": ["when-to-visit.html", "Weather by month"], "Weather & hurricanes": ["when-to-visit.html#hurricanes", "Hurricane season"],
  "Sun & heat": ["when-to-visit.html#sun-heat", "Sun, heat and lightning"], "Getting around": ["getting-around.html", "Every way to get around"],
  "Beaches & water safety": ["outdoors.html", "Beaches & outdoors"],
};

/** A record's source line, one link per site: "Source: fly2pie.com (5 pages) · psta.net · Checked Sep 27, 2026".
 *  (c.recordSource lists every URL by its host, so five pages of one site read "fly2pie.com · fly2pie.com · …".)
 *  The primary source (source_url) comes first; the quote's page and also_sources follow, grouped by site. */
export function srcLine(ctx, rec, { label = "Source" } = {}) {
  const { h } = ctx;
  if (!rec) return "";
  const urls = [...new Set([rec.source_url, rec.quote_source, ...(rec.also_sources || [])].filter((u) => typeof u === "string" && u))];
  if (!urls.length) return "";
  const byHost = new Map();
  for (const u of urls) { const k = h.hostOf(u) || u; if (!byHost.has(k)) byHost.set(k, []); byHost.get(k).push(u); }
  const parts = [...byHost].map(([k, us]) => `${h.extLink(us[0], h.esc(k))}${us.length > 1 ? ` <span class="vz-srcn">(${us.length} pages)</span>` : ""}`);
  return `<p class="source-line">${h.icon("info")}<span>${h.esc(label)}${byHost.size > 1 ? "s" : ""}: ${parts.join(" · ")}</span>${rec.checked ? `<span>Checked ${h.esc(h.fmtDateY(rec.checked))}</span>` : ""}</p>`;
}

/** One question: <details class="faq" [id="fq-<id>"] data-topic data-q><summary>Q</summary><div class="prose">A</div>source</details>.
 *  data-q carries the question and topic (the filter skips <summary> text; the answer is read from the page). */
export function faqItem(ctx, f, { id = true } = {}) {
  const { h } = ctx;
  const topic = h.slugify(f.topic);
  return `<details class="faq"${id ? ` id="fq-${h.attr(f.id)}"` : ""} data-topic="${h.attr(topic)}" data-q="${h.attr(norm(`${f.q} ${f.topic}`))}"><summary>${h.esc(f.q)}</summary><div class="prose">${h.paras(f.a)}</div>${srcLine(ctx, f)}</details>`;
}

/** Topics in page order: [[topic, faqs]] */
export function faqTopics(ctx) {
  const by = ctx.h.groupBy(ctx.db.faqs, (f) => f.topic);
  const known = TOPIC_ORDER.filter((t) => by.has(t));
  return [...known, ...[...by.keys()].filter((t) => !TOPIC_ORDER.includes(t))].map((t) => [t, by.get(t)]);
}

export function pages(ctx) {
  const { db, c, h } = ctx;
  const { esc, attr, icon } = h;
  const topics = faqTopics(ctx);
  const n = db.faqs.length;
  const tid = (t) => `topic-${h.slugify(t)}`;

  const tools = `<div class="faq-tools js-only">
<label class="field faq-search">${icon("search")}<span class="sr-only">Search the questions and answers</span><input type="search" name="q" placeholder="Search ${attr(h.plural(n, "question"))} and answers" autocomplete="off" enterkeyhint="search" data-filter-q></label>
<div class="chip-row faq-chips" role="group" aria-label="Topics">${topics.map(([t, fs]) => c.chip(t, null, { pressed: false, count: fs.length, ic: TOPIC_ICON[t] || "help", attrs: `data-filter-chip="topic=${attr(h.slugify(t))}"` })).join("")}</div>
<div class="faq-count">${c.resultCount(n, n, "questions")}<button class="btn btn-ghost btn-sm" type="button" data-filter-clear hidden>Clear search and topics</button></div>
</div>`;

  const group = (root, [t, fs]) => {
    const more = TOPIC_MORE[t];
    return `<section class="section faq-sec" id="${attr(tid(t))}" aria-labelledby="${attr(tid(t))}-h" data-filter-group>
<div class="sec-head oxford"><p class="sec-kicker label">${icon(TOPIC_ICON[t] || "help", "vz-ic")}${esc(h.plural(fs.length, "question"))}</p><h2 id="${attr(tid(t))}-h">${esc(t)}</h2>${more ? `<a class="more" href="${root}${more[0]}">${esc(more[1])}${icon("arrow-r")}</a>` : ""}</div>
<div class="faq-list">${fs.map((f) => faqItem(ctx, f)).join("\n")}</div>
</section>`;
  };

  /* the sites the answers cite, most-cited first (computed) */
  const hostCount = new Map();
  for (const f of db.faqs) { const k = h.hostOf(f.source_url); if (k) hostCount.set(k, (hostCount.get(k) || 0) + 1); }
  const hosts = h.sortBy([...hostCount], ([, k]) => -k, ([x]) => x);
  return [{
    path: "faq.html", nav: "faq", title: "FAQ", features: ["faq"],
    description: `${h.plural(n, "practical question")} about visiting Tampa Bay, by topic: weather, hurricanes, beaches, getting around, taxes and rules, each answered from its official source.`,
    toc: topics.length >= 2 ? topics.map(([t]) => [tid(t), t]) : undefined,
    body: (root) => `${c.pageHead({ num: 5, kicker: `Visit · ${h.plural(n, "question")}`, title: "FAQ", titleHtml: "Questions &amp; answers",
        lede: "Short answers to practical questions, from red tide to tolls. Each answer says only what its official page says, and links to it: check it before you go." })}
${n ? `<div class="faq-root" data-filter-root>
${tools}
<div class="faq-lists" data-filter-list data-filter-items="details.faq">
${topics.map((g) => group(root, g)).join("\n")}
</div>
${c.emptyState({ title: "No question matches", body: "Try another word, or clear the search and the topics.", glyph: "help", attrs: "data-filter-empty hidden" })}
</div>` : c.emptyState({ title: "No questions listed yet", body: "Questions appear here as they are checked against their sources.", glyph: "help" })}
${hosts.length ? `<p class="faq-note">The answers cite ${esc(h.plural(hosts.length, "site"))}${hosts.length > 1 ? `; the most cited are ${esc(h.listJoin(hosts.slice(0, 4).map(([x, k]) => `${x} (${k})`)))}` : ""}. <a href="${root}about.html#sources">About &amp; sources</a> lists every site the guide cites.</p>` : ""}`,
  }];
}
