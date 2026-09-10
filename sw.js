const CACHE_NAME = 'filo-panel-v13';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './firebase-app-compat.js',
  './firebase-firestore-compat.js',
  './firebase-auth-compat.js',
  // CDN kütüphaneleri (ZIP indirme, Excel, QR, sözleşme)
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(c=>
      Promise.all(PRECACHE.map(u=>c.add(u).catch(()=>{})))
    ).then(()=>self.skipWaiting())
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_NAME?null:caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Yalnızca kendi sitemiz ve bilinen CDN'ler
  const kendiSitemiz = url.origin === self.location.origin;
  const bilinenCDN = url.hostname.endsWith('cdnjs.cloudflare.com') || url.hostname.endsWith('jsdelivr.net');
  if(!kendiSitemiz && !bilinenCDN) return;
  // Önce ağ; erişilemezse önbellekten ver (offline çalışma)
  event.respondWith(
    fetch(event.request).then(res=>{
      if(res && res.ok){
        const kopya = res.clone();
        caches.open(CACHE_NAME).then(c=>c.put(event.request, kopya)).catch(()=>{});
      }
      return res;
    }).catch(()=>caches.match(event.request, {ignoreSearch:true}).then(hit=>hit || (kendiSitemiz ? caches.match('./index.html') : undefined)))
  );
});
