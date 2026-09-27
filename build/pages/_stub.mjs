/* ============================================================
   build/pages/_stub.mjs · OWNER: E1 (build engine)
   Helpers for stub pages. Files starting with "_" are not page modules.
   A stub renders the page head and an honest placeholder, plus whatever
   the data already holds, so links, search and the crawler work from day
   one. Page lanes replace their stub module wholesale (keep producing
   every page and every anchor id listed in build/CONTRACTS.md §3 and §9).
   ============================================================ */

/** A top-level stub page. body: (root) => extra HTML after the placeholder. */
export function stubPage(ctx, { slug, title, kicker, num, sheet = null, lede, description, what, owner, body = () => "", features = [], toc, head, modals, jsonld }) {
  const { c } = ctx;
  return {
    path: `${slug}.html`, nav: slug, title, description: description || lede, features, toc, head, modals, jsonld,
    body: (root) => `${c.pageHead({ kicker, num, sheet, title, lede })}
${what ? c.placeholder(what, owner) : ""}
${body(root)}`,
  };
}

/** A plain list of rows (the cards' compact form): items are <li> strings from ctx.cards.*Row. */
export const rows = (items, cls = "") => (items.length ? `<ul class="rows${cls ? " " + cls : ""}">${items.join("")}</ul>` : "");
