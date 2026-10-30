/* PEKDOĞRU Filo Paneli — Service Worker v.332 */
const CACHE_NAME = 'filo-panel-v357';
const SHELL_ASSETS = [
  './',
  './index.html',
  './app.js?v=357',
  './style.css?v=357',
  './firebase-app-compat.js',
  './firebase-firestore-compat.js',
  './firebase-auth-compat.js',
  './teklif.html',
  './sozlesme.html',
  './logo.png',
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

  // v.356: TABLET PERFORMANSI — sürümlü/az değişen varlıklar için cache-first
  // (stale-while-revalidate): önbellekte varsa ANINDA sunulur, güncelleme arka planda yapılır.
  // Eski network-first stratejisinde tablet (yavaş Wi-Fi/hücresel) HER açılışta 1.75MB app.js +
  // 500KB Firebase SDK + fontlar için ağ round-trip'i bekliyordu; panel yavaş hissediyordu.
  // Güvenlik: sürümlü URL'ler (?v=NNN) her sürümde değiştiği için eski sürüm asla sunulmaz;
  // yeni sürümün yeni URL'i ilk istekte ağdan çekilip önbelleğe yazılır.
  const yol = url.pathname;
  const surumlu = url.search.includes('v=');
  const sabitSdk = /firebase-(app|firestore|auth)-compat\.js$/.test(yol);
  const statikVarlik = /\.(js|css|woff2?|png|svg|ico|json)(\?|$)/.test(yol);
  const htmlMi = yol.endsWith('.html') || yol.endsWith('/');
  if (surumlu || sabitSdk || (statikVarlik && !htmlMi)) {
    event.respondWith(
      caches.match(request).then((hit) => {
        const agTazele = fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return res;
          })
          .catch(() => hit);
        return hit || agTazele;
      })
    );
    return;
  }

  // Harici CDN kütüphaneleri + Google Fonts için de cache-first (v.356): fontlar ve jsPDF/
  // html2canvas gibi kütüphaneler tablette her açılışta ağ beklemesin; arka planda tazelenir.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(request).then((hit) => {
        const agTazele = fetch(request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return res;
          })
          .catch(() => hit);
        return hit || agTazele;
      })
    );
    return;
  }

  // index.html için network-first: yeni sürüm hemen görünür, çevrimdışıysa önbellek.
  // v.344: cache:'reload' — tarayıcının 10 dk'lık GitHub Pages HTTP cache'ini BYPASS eder;
  // aksi halde yeni sürüm yayınlansa bile kullanıcı 10 dk'ya kadar eski paneli görebiliyordu.
  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/filo/' || url.pathname === '/') {
    event.respondWith(
      fetch(request, { cache: 'reload' })
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
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
