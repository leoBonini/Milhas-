// Service worker do PWA.
// - Arquivos estáticos do Next (/_next/static): cache primeiro (têm hash no nome).
// - Páginas e /api: rede primeiro, cache como reserva para abrir offline.
// Na Fase 4, este arquivo também recebe os eventos de Web Push.

const CACHE = "pontos-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    evento.respondWith(
      caches.match(request).then(
        (salvo) =>
          salvo ||
          fetch(request).then((resp) => {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(request, copia));
            return resp;
          }),
      ),
    );
    return;
  }

  evento.respondWith(
    fetch(request)
      .then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(request).then((salvo) => salvo || Response.error())),
  );
});
