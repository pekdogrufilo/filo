const CACHE_NAME = 'filo-panel-v5';
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
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting())
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_NAME?null:caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;
  // Önce ağ; erişilemezse önbellekten ver (offline çalışma)
  event.respondWith(
    fetch(event.request).then(res=>{
      if(res && res.ok){
        const kopya = res.clone();
        caches.open(CACHE_NAME).then(c=>c.put(event.request, kopya)).catch(()=>{});
      }
      return res;
    }).catch(()=>caches.match(event.request).then(hit=>hit || caches.match('./index.html')))
  );
});
