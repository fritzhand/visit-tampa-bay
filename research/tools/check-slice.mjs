#!/usr/bin/env node
/* research/tools/check-slice.mjs — validate research slices (research/<slice>/<slice>.json).
   Usage: node research/tools/check-slice.mjs <slice> [<slice> …]      (or --all)
   Exits 1 listing every problem as <slice>/<collection>#<id>.<field>: <message>.
   Also warns (never fails) on thin records: no summary, no coordinates, no url. */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SPECS, checkRecord, ID_RE } from "./schema.mjs";

const RESEARCH = join(dirname(fileURLToPath(import.meta.url)), "..");
let names = process.argv.slice(2);
if (!names.length || names.includes("--all")) names = readdirSync(RESEARCH).filter((d) => d !== "tools" && statSync(join(RESEARCH, d)).isDirectory() && existsSync(join(RESEARCH, d, `${d}.json`)));

let errors = 0, warnings = 0;
const seen = new Map();
for (const name of names) {
  const file = join(RESEARCH, name, `${name}.json`);
  if (!existsSync(file)) { console.error(`✗ ${name}: ${file} does not exist`); errors++; continue; }
  let doc;
  try { doc = JSON.parse(readFileSync(file, "utf8")); } catch (e) { console.error(`✗ ${name}: invalid JSON: ${e.message}`); errors++; continue; }
  const E = (m) => { console.error(`  ✗ ${name}/${m}`); errors++; }, W = (m) => { if (process.argv.includes("-q")) { warnings++; return; } console.warn(`  ⚠ ${name}/${m}`); warnings++; };
  if (doc.slice !== name) E(`slice: must be "${name}"`);
  if (!doc.records || typeof doc.records !== "object") { E("records: missing"); continue; }
  const counts = [];
  for (const [coll, recs] of Object.entries(doc.records)) {
    if (!SPECS[coll]) { E(`records.${coll}: unknown collection (allowed: ${Object.keys(SPECS).join(" ")})`); continue; }
    if (!Array.isArray(recs)) { E(`records.${coll}: must be a list`); continue; }
    counts.push(`${recs.length} ${coll}`);
    const ids = new Set();
    for (const r of recs) {
      const rid = r?.id ?? "?";
      if (ids.has(rid)) E(`${coll}#${rid}: duplicate id in this slice`);
      ids.add(rid);
      for (const e of checkRecord(coll, r)) E(`${coll}#${rid}.${e}`);
      if (coll !== "media" && coll !== "faqs" && coll !== "facts" && coll !== "timeline") {
        const key = `${rid}`;
        if (seen.has(key) && seen.get(key) !== `${name}/${coll}`) W(`${coll}#${rid}: id also used in ${seen.get(key)} (the merge unites same-id records; make sure it is the same thing)`);
        seen.set(key, `${name}/${coll}`);
      }
      if (["places", "stays", "experiences"].includes(coll)) {
        if (!r.summary) W(`${coll}#${rid}: no summary`);
        if (r.lat == null && coll !== "experiences") W(`${coll}#${rid}: no coordinates`);
        if (!r.url) W(`${coll}#${rid}: no official url`);
      }
    }
  }
  if (typeof doc.report !== "string" || doc.report.length < 200) W("report: write what was covered, how, what was skipped and why (≥ 200 chars)");
  console.log(`${errors ? "…" : "✓"} ${name}: ${counts.join(", ") || "no records"}`);
}
console.log(errors ? `\n✗ ${errors} error(s), ${warnings} warning(s)` : `\n✓ no errors, ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
