#!/usr/bin/env node
/* research/tools/geocode.mjs — coordinates for a research record, from a street address or a name.
   Usage:
     node research/tools/geocode.mjs "711 N Franklin St, Tampa, FL 33602"          # address → US Census geocoder, then Photon
     node research/tools/geocode.mjs --name "Tampa Theatre" [--near 27.95,-82.46]  # name → Photon (OpenStreetMap)
     node research/tools/geocode.mjs --batch file.json                              # [{ "q": "...", "name": "..." }] → JSON lines
   Prints JSON: { lat, lng, geo_source: "census"|"photon", matched, osm? } or { error }.
   Results are cached in research/tools/.geocache.jsonl (append-only; safe for parallel agents).
   Census rounds to the address range on the street centerline (good to ~30 m); Photon returns the OSM feature.
   ALWAYS sanity-check: the matched address/name must be the record's, and the point must sit in the record's area. */
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Node's fetch only uses HTTPS_PROXY when NODE_USE_ENV_PROXY=1 is set at startup: re-run under it.
if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, ["--no-warnings", ...process.argv.slice(1)], { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
  process.exit(r.status ?? 1);
}

const CACHE = join(dirname(fileURLToPath(import.meta.url)), ".geocache.jsonl");
const cache = new Map();
if (existsSync(CACHE)) for (const line of readFileSync(CACHE, "utf8").split("\n")) { try { const o = JSON.parse(line); cache.set(o.k, o.v); } catch {} }
const put = (k, v) => { cache.set(k, v); appendFileSync(CACHE, JSON.stringify({ k, v }) + "\n"); };
const BOX = { s: 26.9, n: 29.0, w: -83.0, e: -81.4 };
const inBox = (lat, lng) => lat >= BOX.s && lat <= BOX.n && lng >= BOX.w && lng <= BOX.e;
const round = (x) => Math.round(x * 1e6) / 1e6;

async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "tampa-bay-chartbook-research (github.com/fritzhand/visit-tampa-bay)" }, signal: AbortSignal.timeout(25000) });
      if (r.ok) return await r.json();
    } catch {}
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  return null;
}

async function census(q) {
  const k = `census:${q.toLowerCase()}`;
  if (cache.has(k)) return cache.get(k);
  const j = await get(`https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(q)}&benchmark=Public_AR_Current&format=json`);
  const m = j?.result?.addressMatches?.[0];
  const v = m && inBox(m.coordinates.y, m.coordinates.x) ? { lat: round(m.coordinates.y), lng: round(m.coordinates.x), geo_source: "census", matched: m.matchedAddress } : null;
  if (j) put(k, v);
  return v;
}

async function photon(q, near) {
  const k = `photon:${q.toLowerCase()}:${near || ""}`;
  if (cache.has(k)) return cache.get(k);
  const [la, lo] = (near || "27.95,-82.55").split(",");
  const j = await get(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${la}&lon=${lo}&limit=5`);
  const f = (j?.features || []).find((f) => inBox(f.geometry.coordinates[1], f.geometry.coordinates[0]));
  const v = f ? {
    lat: round(f.geometry.coordinates[1]), lng: round(f.geometry.coordinates[0]), geo_source: "photon",
    matched: [f.properties.name, f.properties.housenumber, f.properties.street, f.properties.city, f.properties.postcode].filter(Boolean).join(", "),
    osm: `${f.properties.osm_type}${f.properties.osm_id} ${f.properties.osm_key}=${f.properties.osm_value}`,
  } : null;
  if (j) put(k, v);
  return v;
}

async function one({ q, name, near }) {
  if (name) return (await photon(name, near)) || (q ? (await census(q)) || (await photon(q, near)) : null) || { error: `no match for ${name}` };
  return (await census(q)) || (await photon(q, near)) || { error: `no match for ${q}` };
}

const a = process.argv.slice(2);
if (a[0] === "--batch") {
  const items = JSON.parse(readFileSync(a[1], "utf8"));
  for (const it of items) { console.log(JSON.stringify({ ...it, ...(await one(it)) })); await new Promise((r) => setTimeout(r, 250)); }
} else {
  const opt = { near: a.includes("--near") ? a[a.indexOf("--near") + 1] : null };
  if (a[0] === "--name") opt.name = a[1]; else opt.q = a[0];
  if (!opt.name && !opt.q) { console.error("usage: geocode.mjs \"<address>\" | --name \"<name>\" [--near lat,lng] | --batch file.json"); process.exit(2); }
  console.log(JSON.stringify(await one(opt)));
}
