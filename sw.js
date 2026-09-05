// Filo Kontrol Paneli - basit servis çalışanı
// Amaç: PWA olarak kurulabilirlik + uygulama kabuğunun (index.html ve yerel
// Firebase dosyaları) temel bir çevrimdışı önbelleğe alınması. Veri (araçlar,
// masraflar vb.) zaten bulut/yerel depolamadan geldiği için burada
// önbelleklenmiyor — sadece dosyaların kendisi.
//
// ÖNEMLİ: Önce ağdan (network-first) dener, sadece çevrimdışıysa önbelleğe
// düşer. Böylece her güncelleme (yeni kod, yeni özellik) hemen görünür —
// eski, önbellekteki sürüm asla yeni koda tercih edilmez.
const CACHE_NAME = 'filo-panel-v2';
const APP_SHELL = [
  './',
  './index.html',
  './firebase-app-compat.js',
  './firebase-firestore-compat.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Sadece kendi sitemizden gelen GET isteklerini önbellekle; Firestore/Anthropic
  // gibi dış API isteklerine dokunmuyoruz ki veri her zaman güncel gelsin.
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
