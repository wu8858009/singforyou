// 為你而唱 service worker：快取 App 外殼，API 請求一律走網路
const CACHE = "sfy-v19";
const SHELL = ["./", "index.html", "css/app.css", "js/app.js", "js/engine.js", "js/store.js", "js/synth.js", "js/brand.js", "js/mv.js", "js/align.js", "manifest.json", "icons/icon.svg", "icons/icon-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
