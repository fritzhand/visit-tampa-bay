/* ============================================================
   site/js/core/store.js · OWNER: E2 (client runtime; ported from Cincy Week)
   Every storage access goes through here, wrapped in try/catch: private
   windows and blocked storage must never break a page. When storage is
   blocked, values live in memory for this page view (store.blocked = true).

   Keys (all prefixed tbc-; new keys start with tbc- too):
     tbc-theme        "light" | "dark"                  theme.js (the boot script reads it first)
     tbc-rail         "1" when the desktop rail is collapsed   drawer.js (the boot script reads it)
     tbc-trip         { v: 1, e: [event ids], x: [experience ids], p: [place ids], s: [stay ids], t: updated epoch }
                      trip-store.js (My Trip; lib/trip.js normalize() cleans it on read)
     tbc-prefs        { "<page>.view": "list" | "map", … } per-reader conveniences (filter.js keeps each
                      page's last list/map view here; features may add keys named "<page>.<name>")
     tbc-seen-shared  the last shared-trip hash the reader answered (views/trip.js), so it does not ask again
     tbc-debug        "1" enables ?now= on the live site (QA only; read by the boot script)
   ============================================================ */
const mem = new Map();
let blocked = false;

export const raw = {
  get(k) { try { const v = localStorage.getItem(k); return v === null && mem.has(k) ? mem.get(k) : v; } catch { blocked = true; return mem.has(k) ? mem.get(k) : null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { blocked = true; mem.set(k, v); return false; } },
  del(k) { mem.delete(k); try { localStorage.removeItem(k); } catch { blocked = true; } },
};

export const store = {
  get(k, fallback = null) { const v = raw.get(k); if (v == null) return fallback; try { const p = JSON.parse(v); return p ?? fallback; } catch { return fallback; } },
  set(k, v) { return raw.set(k, JSON.stringify(v)); },
  del: raw.del,
  get blocked() { return blocked; },
};

/** Per-reader preferences (tbc-prefs): pref("whats-on.view") · pref("whats-on.view", "map") */
export function pref(key, value) {
  const all = store.get("tbc-prefs", {});
  const obj = all && typeof all === "object" && !Array.isArray(all) ? all : {};
  if (value === undefined) return obj[key] ?? null;
  if (value === null) delete obj[key]; else obj[key] = value;
  store.set("tbc-prefs", obj);
  return value;
}
