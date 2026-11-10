/* Service worker de Bricolo : volontairement minimal.
   Il ne met rien en cache hormis une page « hors connexion » : aucune donnée de compte, de paiement ou d'artisan n'est jamais stockée. */
const VERSION = "bricolo-v1";
const OFFLINE = "/hors-ligne";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll([OFFLINE, "/pwa-icon/192"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return; // tout le reste passe directement par le réseau
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE).then((r) => r || Response.error())));
});
