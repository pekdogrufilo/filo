// PEKDOĞRU Filo — Gemini API sunucu proxy'si
// Amaç: gerçek Gemini API anahtarı artık tarayıcıda / localStorage'da / Firestore'da
// TUTULMUYOR. Yalnızca bu fonksiyonun çalıştığı Netlify sunucusunda, GEMINI_API_KEY
// ortam değişkeni olarak durur. Panel (index.html), Google'a doğrudan istek atmak yerine
// bu adrese istek atar, bu fonksiyon da anahtarı ekleyip Gemini'ye iletir.
//
// Kurulum: Netlify > Site configuration > Environment variables > Add a variable
//   Key:   GEMINI_API_KEY
//   Value: aistudio.google.com'dan alınan Gemini anahtarınız
// (Not: eski anahtar bir süre tarayıcıda/Firestore'da açık şekilde durduğu için sızmış
// sayılır — yeni bir anahtar oluşturup onu buraya girmeniz önerilir, eskisini iptal edin.)
//
// GitHub Pages üzerinden açılan kopya da bu fonksiyonu çağırabilsin diye CORS tamamen açık
// bırakıldı (fonksiyon zaten kendi anahtarını gizliyor, hangi siteden çağrıldığının önemi yok).

const GEMINI_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
  ];

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
          return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }
    if (event.httpMethod !== 'POST') {
          return json(405, { error: 'Yalnızca POST desteklenir.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
          return json(500, { error: 'Sunucu yapılandırılmamış: GEMINI_API_KEY tanımlı değil. Netlify > Site configuration > Environment variables kısmına ekleyin.' });
    }

    let payload;
    try {
          payload = JSON.parse(event.body || '{}');
    } catch (e) {
          return json(400, { error: 'Geçersiz istek gövdesi (JSON parse hatası).' });
    }

    const { model, contents, system_instruction, generationConfig } = payload;
    if (!contents) {
          return json(400, { error: '"contents" alanı gerekli.' });
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
          // Gemini'nin döndürdüğü durum kodunu ve gövdeyi olduğu gibi ilet — client tarafındaki
      // 503/404 model-yedeği mantığı bu sayede değişmeden çalışmaya devam ediyor.
      return json(res.status, data);
    } catch (e) {
          return json(502, { error: 'Gemini isteği başarısız oldu: ' + (e && e.message ? e.message : e) });
    }
};

function json(code, obj) {
    return {
          statusCode: code,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify(obj),
    };
}
