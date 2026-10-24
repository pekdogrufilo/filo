// PEKDOĞRU Filo — Gemini API sunucu proxy'si (Netlify Functions)
// Amaç: gerçek Gemini API anahtarı tarayıcıda / localStorage'da / Firestore'da
// TUTULMAZ. Yalnızca bu fonksiyonun çalıştığı Netlify sunucusunda, GEMINI_API_KEY
// ortam değişkeni olarak durur. Panel (index.html), Google'a doğrudan istek atmak yerine
// bu adrese istek atar, bu fonksiyon da anahtarı ekleyip Gemini'ye iletti.
//
// Kurulum: Netlify > Site configuration > Environment variables > Add a variable
//   Key:   GEMINI_API_KEY
//   Value: aistudio.google.com'dan alınan Gemini anahtarınız
// (Not: eski anahtar bir süre tarayıcıda/Firestore'da açık şekilde durduğu için sızmış
// sayılır — yeni bir anahtar oluşturup buraya girmeniz, eskisini iptal etmeniz önerilir.)
//
// v.310 GÜVENLİK SIKILAŞTIRMASI (FAZ 2b):
//   - Eskiden CORS tamamen açıktı ve istek başına hiçbir sınır yoktu: bu uç noktayı
//     bilen HERHANGİ birisi, kendi sitesinden/terminalinden sınırsız istek atıp
//     SİZİN Gemini kotanızı/kullanımınızı tüketebiliyordu.
//   - Artık (1) Origin izin listesi (yalnızca panelin yayınlandığı alan adları),
//     (2) IP başına hız sınırı, (3) istek gövdesi boyut sınırı uygulanır.
//   - Dürüst not: hız sınırı bellekte (function instance başına) tutulur — sunucusuz
//     ortamda instance'lar çoklandığında sınır örnek başına sayılır, yani tam bir
//     engel değil, kötüye kullanım frenidir. Daha sert bir sınır istenirse Netlify
//     önüne Cloudflare/WAF kuralı konabilir.
//   - CANLI SİSTEMDE panel bu fonksiyonu DEĞİL, Cloudflare Worker proxy'sini
//     çağırır (bkz. app.js → GEMINI_PROXY_URL). Worker'ın sıkılaştırılmış sürümü:
//     cloudflare-worker/gemini-proxy-worker.js. Bu Netlify kopyası yedektir.

// İstemcideki (app.js → GEMINI_MODELS) listeyle birebir aynıdır — sırası önemli
// değildir; model adı listede yoksa istek en güçlü modelle sınırlandırılır.
const GEMINI_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
  ];

// Panelin çağrı yapmasına izinli kaynaklar:
//   - GitHub Pages (canlı panel)
//   - Netlify önizleme/yayın alan adları
//   - localhost / 127.0.0.1 (geliştirme)
//   - Origin: null (panel bilgisayarda dosya olarak açıldığında tarayıcı böyle gönderir)
const ALLOWED_ORIGIN_HOST_SUFFIXES = ['pekdogrufilo.github.io', '.netlify.app'];

// Hız sınırı: IP başına 5 dakikada en fazla 30 Gemini isteği.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_BODY_BYTES = 6 * 1024 * 1024; // Netlify senkron fonksiyon sınırına yakın üst sınır

// Basit bellek içi sayaç: ip -> zaman damgası dizisi
const _rateHits = new Map();
function rateLimitExceeded(ip) {
    const now = Date.now();
    let arr = _rateHits.get(ip);
    if (!arr) { arr = []; _rateHits.set(ip, arr); }
    while (arr.length && now - arr[0] > RATE_LIMIT_WINDOW_MS) arr.shift();
    if (arr.length >= RATE_LIMIT_MAX) return true;
    arr.push(now);
    // Haritanın büyümesini engelle (en fazla 5000 IP tut)
    if (_rateHits.size > 5000) {
        const ilkAnahtar = _rateHits.keys().next().value;
        _rateHits.delete(ilkAnahtar);
    }
    return false;
}

function requestOrigin(event) {
    const origin = event.headers && (event.headers.origin || event.headers.Origin);
    if (origin) return origin;
    const referer = event.headers && (event.headers.referer || event.headers.Referer);
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

exports.handler = async (event) => {
    const origin = requestOrigin(event);

    if (event.httpMethod === 'OPTIONS') {
        // Preflight: yalnızca izinli kaynağa CORS başlıkları döndür.
        if (!originAllowed(origin)) return { statusCode: 204, body: '' };
        return { statusCode: 204, headers: corsHeaders(origin), body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Yalnızca POST desteklenir.' }, origin);
    }
    if (!originAllowed(origin)) {
        return json(403, { error: 'Bu kaynak (origin) bu servise istek atamaz.' }, origin);
    }

    const ip = (event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || event.headers['x-forwarded-for'] || '')) || 'bilinmeyen';
    if (rateLimitExceeded(String(ip).split(',')[0].trim())) {
        return json(429, { error: 'Çok fazla istek — lütfen birkaç dakika sonra tekrar deneyin.' }, origin);
    }

    const bodyLen = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').length : Buffer.byteLength(event.body)) : 0;
    if (bodyLen > MAX_BODY_BYTES) {
        return json(413, { error: 'İstek gövdesi çok büyük.' }, origin);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return json(500, { error: 'Sunucu yapılandırılmamış: GEMINI_API_KEY tanımlı değil. Netlify > Site configuration > Environment variables kısmına ekleyin.' }, origin);
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
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
        // Gemini'nin döndürdüğü durum kodunu ve gövdeyi olduğu gibi iletiyoruz —
        // client tarafındaki 503/404/429 model-yedeği mantığı değişmeden çalışır.
        return json(res.status, data, origin);
    } catch (e) {
        return json(502, { error: 'Gemini isteği başarısız oldu: ' + (e && e.message ? e.message : e) }, origin);
    }
};

function json(code, obj, origin) {
    return {
        statusCode: code,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify(obj),
    };
}
