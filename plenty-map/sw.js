/* Plenty Map service worker: the app works with no signal.
   - App shell, English text and San Diego data are stored on install.
   - The person's own language, the map code and any map area they've looked at are stored as they use them.
   - Everything comes from our own site. */
const V = "pm-1.0.0-1";
const SHELL = `${V}-shell`, DATA = `${V}-data`, MAP = "pm-map-1", TILES = "pm-tiles-1";
const PRECACHE = [
  "./", "index.html", "manifest.webmanifest", "favicon.ico",
  "css/app.css",
  "js/app.js", "js/core.js", "js/config.js", "js/region.js", "js/hours.js", "js/find.js", "js/food.js", "js/cook.js",
  "js/budget.js", "js/help.js", "js/benefits.js", "js/pages.js", "js/map.js",
  "fonts/figtree-latin.woff2", "fonts/caprasimo-latin.woff2",
  "icons/favicon.svg", "icons/icon-192.png", "icons/apple-touch-icon.png",
  "i18n/en.json", "i18n/recipes/en.json",
  "data/food.json", "data/regions/index.json", "data/regions/san-diego.json",
];
const MAX_TILES = 2500;

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await c.addAll(PRECACHE.map(u => new Request(u, { cache: "reload" })));
    // the person's language, if the page told us before install finished, is picked up on first use
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("pm-") && ![SHELL, DATA, MAP, TILES].includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const sameOrigin = u => u.origin === self.location.origin;

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!sameOrigin(url)) return;
  const p = url.pathname;

  if (p.endsWith(".pmtiles")) return e.respondWith(tile(req, url));
  if (req.mode === "navigate") return e.respondWith(networkFirst(req, SHELL, "index.html"));
  if (/\/vendor\/|\/data\/tiles\/fonts\//.test(p)) return e.respondWith(cacheFirst(req, MAP));
  if (/\/i18n\/|\/data\//.test(p)) return e.respondWith(staleWhileRevalidate(req, DATA));
  e.respondWith(cacheFirst(req, SHELL));
});

async function cacheFirst(req, name) {
  const hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.type === "basic") (await caches.open(name)).put(req, res.clone());
  return res;
}
async function networkFirst(req, name, fallback) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(name)).put(fallback, res.clone());
    return res;
  } catch {
    return (await caches.match(fallback)) || (await caches.match("./")) || Response.error();
  }
}
async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name);
  // the shell cache holds the install-time copies; prefer the freshest we have
  const hit = (await cache.match(req, { ignoreSearch: true })) || (await caches.match(req, { ignoreSearch: true }));
  const net = fetch(req, { cache: "no-cache" }).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } });
}

/* Map tiles come as byte ranges of one big file. The Cache API can't store 206 responses, so each
   range is stored as a 200 under its own key and turned back into a 206 when read. */
async function tile(req, url) {
  const range = req.headers.get("range");
  if (!range) return fetch(req);
  const key = new Request(url.origin + url.pathname + "?r=" + encodeURIComponent(range));
  const cache = await caches.open(TILES);
  const hit = await cache.match(key);
  if (hit) return as206(hit, range);
  let res;
  try { res = await fetch(req); } catch { return new Response(null, { status: 504 }); }
  if (res.status === 206) {
    const body = await res.arrayBuffer();
    const headers = new Headers({ "Content-Type": "application/octet-stream", "x-pm-range": res.headers.get("content-range") || "" });
    cache.put(key, new Response(body, { status: 200, headers })).then(() => trim(cache));
    return new Response(body, { status: 206, headers: res.headers });
  }
  return res;
}
function as206(res, range) {
  const h = new Headers(res.headers);
  const cr = h.get("x-pm-range");
  if (cr) h.set("Content-Range", cr);
  return res.arrayBuffer().then(b => { h.set("Content-Length", String(b.byteLength)); return new Response(b, { status: 206, headers: h }); });
}
let trimming = false;
async function trim(cache) {
  if (trimming) return; trimming = true;
  try {
    const keys = await cache.keys();
    if (keys.length > MAX_TILES) for (const k of keys.slice(0, keys.length - MAX_TILES)) await cache.delete(k);
  } finally { trimming = false; }
}

/* The tiles file is renamed each time it is rebuilt. The map tells us the current name, and pieces
   of any older file are dropped so they can never mix with the new one. */
self.addEventListener("message", e => {
  if (e.data?.type !== "tiles-file" || typeof e.data.path !== "string") return;
  const cur = e.data.path;
  e.waitUntil(caches.open(TILES).then(async c => {
    for (const k of await c.keys()) if (new URL(k.url).pathname !== cur) await c.delete(k);
  }));
});
