/* ============================================================
   site/js/core/history.js · OWNER: E2 (client runtime)
   The dialogs push ?e= / ?x= so Back closes them. Closing one by its own
   button calls back(): the popstate that follows is ours, so the dialogs'
   popstate handlers skip it (settling()), and a dialog opened in the
   meantime waits for it (await settled()) before pushing its own entry.
   Without this, closing one dialog and opening another quickly could let
   the late popstate close the new one.
   ============================================================ */
let pending = null;
/** history.back(), remembering that the next popstate is ours (or 600 ms, whichever comes first). */
export function back() {
  if (pending) return pending;
  pending = new Promise((resolve) => {
    const done = () => { window.removeEventListener("popstate", done); clearTimeout(timer); pending = null; resolve(); };
    const timer = setTimeout(done, 600);
    window.addEventListener("popstate", done);
  });
  const p = pending;
  history.back();
  return p;
}
export const settling = () => !!pending;
export const settled = () => pending || Promise.resolve();
