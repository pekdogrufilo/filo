/* PEKDOĞRU Filo Paneli — Service Worker v.136 */
const CACHE_NAME = 'filo-panel-v135';
const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css?v=284',
  './app.js?v=284',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // v.120: Cache API SADECE GET isteklerini destekler — POST (ör. AI Filo Asistanı ve
  // "otomatik doldur"un kullandığı Gemini proxy istekleri) burada cache.put()'a verilince
  // "Failed to execute 'put' on 'Cache': Request method 'POST' is unsupported" hatasıyla
  // patlıyordu. Bu hata bir "unhandled promise rejection" olarak konsolu kirletmenin yanında,
  // panelin kendi genel hata yakalayıcısını (index.html'deki window.unhandledrejection
  // dinleyicisi) da tetikleyip kullanıcıya alakasız "Beklenmeyen bir hata oluştu" bildirimleri
  // gösteriyordu — asıl AI hatasının (503/429) üstüne bir de kafa karıştırıcı gürültü ekliyordu.
  // GET olmayan istekler artık Service Worker tarafından hiç ele alınmıyor; tarayıcı bunları
  // doğrudan (önbelleksiz) ağa gönderiyor — zaten POST isteklerinin önbelleğe alınması hem
  // teknik olarak imkânsız hem de anlamsız (her istek farklı bir gövde taşıyor).
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Harici CDN kütüphaneleri için network-first
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // index.html için network-first: yeni sürüm hemen görünür, çevrimdışıysa önbellek
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
