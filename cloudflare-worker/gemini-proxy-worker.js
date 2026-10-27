// =============================================================================
// PEKDOĞRU Filo — Gemini API Cloudflare Worker proxy'si (SIKILAŞTIRILMIŞ, v.310)
// =============================================================================
// CANLI PROXY BU! Panel (app.js → GEMINI_PROXY_URL) şu adrese istek atar:
//   https://filo-gemini-proxy.hasan-huseyin-pekdogru.workers.dev/
//
// NASIL DAĞITILIR (yaklaşık 2 dakika):
//   1. dash.cloudflare.com → Workers & Pages → "filo-gemini-proxy" worker'ını aç.
//   2. "Edit code" (Kodu düzenle) → bu dosyanın tüm içeriğini yapıştır → Deploy.
//   3. Settings → Variables and Secrets: GEMINI_API_KEY Secret'i tanımlı kalmalı
//      (mevcut worker'da zaten tanımlıdır; kod güncellemesi onu SİlMEZ).
//   4. (Önerilen, ekstra) Cloudflare panosunda worker'a bir Rate Limiting kuralı
//      ekle — aşağıdaki bellek içi sınırı kesin bir engel haline getirir.
//
// NEDEN SIKILAŞTIRILDI (FAZ 2b):
//   Eskiden bu worker herkese tamamen açıktı: adresi bilen herhangi biri,
//   kendi sitesinden/terminalinden SINIRSIZ istek atıp sizin Gemini kotanızı ve
//   faturanızı tüketebiliyordu. Artık:
//     (1) Origin izin listesi — yalnızca panelin yayınlandığı alan adları
//         (GitHub Pages, Netlify, localhost, dosya olarak açılan panel).
//     (2) IP başına hız sınırı (izolasyon başına bellek içi; Cloudflare Rate
//         Limiting kuralıyla birlikte kesinleşir).
//     (3) İstek gövdesi boyut sınırı.
//   İstemci sözleşmesi (istek/yanıt formatı) DEĞİŞMEDİ — panel tarafında hiçbir
//   değişiklik gerekmez; 503/404/429 yedeği (model fallback) aynen çalışır.

const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

// Panelin çağrı yapmasına izinli kaynaklar (host son ekleri).
const ALLOWED_ORIGIN_HOST_SUFFIXES = ['pekdogrufilo.github.io', '.netlify.app', '.pekdogru.com'];

// Hız sınırı: IP başına 5 dakikada en fazla 30 Gemini isteği.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_BODY_BYTES = 20 * 1024 * 1024; // belge okuma istekleri görsel/PDF içerebilir

// --- Bellek içi hız sayacı (izolasyon başına; Cloudflare Rate Limiting kuralıyla
// --- birlikte kullanılması önerilir — bkz. dağıtım adımı 4).
const _rateHits = new Map();
function rateLimitExceeded(ip) {
  const now = Date.now();
  let arr = _rateHits.get(ip);
  if (!arr) { arr = []; _rateHits.set(ip, arr); }
  while (arr.length && now - arr[0] > RATE_LIMIT_WINDOW_MS) arr.shift();
  if (arr.length >= RATE_LIMIT_MAX) return true;
  arr.push(now);
  if (_rateHits.size > 5000) {
    const ilkAnahtar = _rateHits.keys().next().value;
    _rateHits.delete(ilkAnahtar);
  }
  return false;
}

function requestOrigin(request) {
  const origin = request.headers.get('Origin');
  if (origin) return origin;
  const referer = request.headers.get('Referer');
  if (referer) {
    try { return new URL(referer).origin; } catch (e) { return null; }
  }
  return null;
}

function originAllowed(origin) {
  if (origin === 'null') return true; // dosya olarak açılan panel
  if (!origin) return false;
  let host;
  try { host = new URL(origin).hostname; } catch (e) { return false; }
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true;
  return ALLOWED_ORIGIN_HOST_SUFFIXES.some(s => host === s.slice(1) || host.endsWith(s));
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin === 'null' ? '*' : (origin || '*'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(code, obj, origin) {
  return new Response(JSON.stringify(obj), {
    status: code,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const origin = requestOrigin(request);

    if (request.method === 'OPTIONS') {
      if (!originAllowed(origin)) return new Response(null, { status: 204 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return json(405, { error: 'Yalnızca POST desteklenir.' }, origin);
    }
    if (!originAllowed(origin)) {
      return json(403, { error: 'Bu kaynak (origin) bu servise istek atamaz.' }, origin);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'bilinmeyen';
    if (rateLimitExceeded(ip)) {
      return json(429, { error: 'Çok fazla istek — lütfen birkaç dakika sonra tekrar deneyin.' }, origin);
    }

    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return json(413, { error: 'İstek gövdesi çok büyük.' }, origin);
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return json(500, { error: 'Sunucu yapılandırılmamış: GEMINI_API_KEY tanımlı değil. Cloudflare → Worker → Settings → Variables and Secrets bölümüne Secret olarak ekleyin.' }, origin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return json(400, { error: 'Geçersiz istek gövdesi (JSON parse hatası).' }, origin);
    }

    const { model, contents, system_instruction, generationConfig } = payload;
    if (!contents) {
      return json(400, { error: '"contents" alanı gerekli.' }, origin);
    }
    const modelName = GEMINI_MODELS.includes(model) ? model : GEMINI_MODELS[0];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ system_instruction, contents, generationConfig }),
      });
      const data = await res.json().catch(() => ({}));
      // Gemini'nin durum kodunu ve gövdesini olduğu gibi iletiyoruz — client'taki
      // 503/404/429 model-yedeği mantığı değişmeden çalışır.
      return json(res.status, data, origin);
    } catch (e) {
      return json(502, { error: 'Gemini isteği başarısız oldu: ' + (e && e.message ? e.message : e) }, origin);
    }
  },
};
