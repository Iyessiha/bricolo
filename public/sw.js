/* Service worker de Bricolo : volontairement minimal.
   Il ne met rien en cache hormis une page « hors connexion » : aucune donnée de compte, de paiement ou d'artisan n'est jamais stockée. */
const VERSION = "bricolo-v2";
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

/* Notifications : le serveur envoie un message chiffré, on l'affiche et on met à jour le nombre sur l'icône de l'application. */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  const n = Number(d.badge) || 0;
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || "Bricolo", { body: d.body || "", icon: "/pwa-icon/192", tag: d.tag, renotify: Boolean(d.tag), data: { url: d.url || "/tableau-de-bord" } }),
    "setAppBadge" in self.navigator ? (n > 0 ? self.navigator.setAppBadge(n) : self.navigator.clearAppBadge()).catch(() => {}) : null,
  ]));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/tableau-de-bord", self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
