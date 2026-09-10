# PEKDOĞRU Filo — Bulut Senkron + Otomatik E-posta Kurulumu

Bu rehberi izleyince: (1) verileriniz ve belgeleriniz Google bulutuna yedeklenir, tüm cihazlarda aynı olur; (2) belge bitişlerinde panel otomatik e-posta atar. İkisi de **ücretsiz** katmanlarla çalışır.

---

## BÖLÜM 1 — Bulut Senkron (Firebase) — ~10 dakika

### 1. Firebase projesi aç
1. https://console.firebase.google.com adresine girin (Google hesabıyla).
2. **"Add project / Proje ekle"** → Ad: `pekdogru-filo` → Analytics'i kapatabilirsiniz → **Create**.

### 2. Firestore veritabanı oluştur
1. Sol menüden **Build → Firestore Database** → **Create database**.
2. Konum: **eur3 (Europe)** önerilir → **Start in production mode** → **Enable**.
3. **Rules** sekmesine girin, içeriği şununla değiştirin ve **Publish** deyin:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /filoPaneliData/{doc} {
      allow read, write: if request.auth != null;
    }
  }
}
```

> Not: Bu kural yalnızca oturum açmış istemcilerin veriye erişmesine izin verir. Panel, bağlanırken kendiliğinden **anonim Firebase girişi** yapar (sizin işiniz yok); panelin kendi şifre ekranı erişim kontrolünü yapar. Böylece veri, yapılandırmayı bilen ama oturum açmayan tarayıcılardan korunur.

### 3. Web uygulaması anahtarını al
1. Proje ana sayfasında ⚙️ **Project settings → General → Your apps → Web (</>) simgesi**.
2. Takma ad: `panel` → **Register app** (Hosting adımı gerekmez).
3. Karşınıza çıkan `firebaseConfig` bloğundaki değerler gerekli: **apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId**.

### 4. Panele bağla
1. Firebase Console → **Build → Authentication → Get started → Anonymous → Enable** (panel, buluta bağlanırken anonim oturum açar; bu adım bir kez yapılır).
2. Paneli açın → **Ayarlar → Bulut Senkronizasyonu → Bağlan**.
3. firebaseConfig değerlerini forma girin → **Bağlan**.
4. Üst çubukta **"☁ Bulutta senkronize"** rozeti görünmeli. Artık araç verileri + belgeler buluta yazılıyor; telefonunuzdan da aynı adımlarla bağlanınca her şey orada da görünür.

---

## BÖLÜM 2 — Otomatik E-posta Hatırlatması — ~15 dakika

> Bu bölüm Bölüm 1'in bitmiş olmasını gerektirir (fonksiyon araçları Firestore'dan okur).

### 1. Firebase servis hesabı anahtarı al
1. Firebase Console → ⚙️ **Project settings → Service accounts → Generate new private key**.
2. İndirilen JSON dosyasını açın; içindeki **client_email** ve **private_key** değerlerini bir kenara not edin (project_id de gerekli).

### 2. Resend e-posta hesabı aç
1. https://resend.com → ücretsiz kayıt.
2. **API Keys → Create API Key** → çıkan `re_...` anahtarını not edin.
3. Ücretsiz planda **onboarding@resend.dev** gönderen adresiyle yalnızca **kendi e-posta adresinize** gönderebilirsiniz — kendi alan adınızı eklerseniz her adrese gönderebilirsiniz (opsiyonel).

### 3. Netlify ortam değişkenlerini gir
Site Netlify'da yayında olduktan sonra:
1. Netlify → siteniz → **Site configuration → Environment variables → Add a variable** ile şunları ekleyin:

| Anahtar | Değer |
|---|---|
| `FIREBASE_PROJECT_ID` | firebaseConfig'teki projectId (ör. `pekdogru-filo`) |
| `FIREBASE_CLIENT_EMAIL` | Servis hesabı JSON'undaki client_email |
| `FIREBASE_PRIVATE_KEY` | Servis hesabı JSON'undaki private_key (BEGIN/END satırlarıyla birlikte, olduğu gibi) |
| `RESEND_API_KEY` | `re_...` anahtarı |
| `HATIRLATMA_EMAIL` | Hatırlatmaların geleceği e-posta adresiniz *(opsiyonel — girmezseniz Ayarlar > Hatırlatma E-postası'na panelde girdiğiniz adres kullanılır)* |
| `HATIRLATMA_GONDEREN` | (opsiyonel) ör. `PEKDOĞRU Filo <onboarding@resend.dev>` |

2. **Deploys → Trigger deploy → Clear cache and deploy site** ile yeniden yayınlayın.

### 4. Test et
Tarayıcıdan şu adresi açın (site adınızı yazın):
`https://SITENIZ.netlify.app/.netlify/functions/hatirlatma`

Yanıtta şunları görürsünüz:
- `"bulutOku":true` → Firebase bağlantısı çalışıyor.
- `"acil":N` → kaç acil belge bulundu.
- `"gonderildi":true` → e-posta gönderildi (gelen kutunuza bakın).
- Fonksiyon **her gün sabah 07:00'de (Türkiye saati)** otomatik çalışır; aynı hatırlatmayı 40 gün içinde tekrar göndermez.

---

---

## BÖLÜM 3 — Netlify yerine yalnızca GitHub kullanmak

Netlify kullanım limitinize takıldıysanız site GitHub Pages üzerinden de yayında kalabilir (`https://pekdogrufilo.github.io/filo/`), ama GitHub Pages statik dosya sunar — Netlify'daki "Otomatik E-posta Hatırlatması" fonksiyonunu (Bölüm 2) çalıştıramaz. Bunun yerine repoya eklenen `.github/workflows/hatirlatma.yml` + `scripts/hatirlatma.js` ile **GitHub Actions** aynı işi ücretsiz olarak günlük yapar. Kurulum:

1. GitHub'da reponuzu açın → **Settings → Secrets and variables → Actions → New repository secret**.
2. Bölüm 2'de topladığınız değerlerin AYNISINI, Netlify yerine buraya tek tek ekleyin (isimler birebir aynı):

| Secret adı | Değer |
|---|---|
| `FIREBASE_PROJECT_ID` | firebaseConfig'teki projectId |
| `FIREBASE_CLIENT_EMAIL` | Servis hesabı JSON'undaki client_email |
| `FIREBASE_PRIVATE_KEY` | Servis hesabı JSON'undaki private_key (BEGIN/END satırlarıyla birlikte) |
| `RESEND_API_KEY` | `re_...` anahtarı |
| `HATIRLATMA_EMAIL` | (opsiyonel) hatırlatmaların geleceği adres |
| `HATIRLATMA_GONDEREN` | (opsiyonel) ör. `PEKDOĞRU Filo <onboarding@resend.dev>` |

3. Kaydettikten sonra reponun **Actions** sekmesine girin → soldan **"Hatırlatma E-postası"** workflow'unu seçin → **"Run workflow"** ile bir kez elle çalıştırıp test edin. Çıktıda `"gonderildi":true` veya `"mesaj"` alanına bakarak sonucu görebilirsiniz.
4. Her şey doğruysa artık ayrıca bir şey yapmanıza gerek yok — her gün otomatik (Türkiye saatiyle 07:00) çalışır.
5. Netlify'ı tamamen bırakırsanız `netlify/functions/hatirlatma.js` ve `netlify.toml` dosyalarını silmenize gerek yok, zararı olmaz; sadece kullanılmamış olur.

---

## Sık sorulanlar

**Buluta bağlayınca verilerim güvende mi?** Veri Google'ın altyapısında saklanır, HTML dosyanız artık araç verisi taşımaz. Kural dosyası pratik koruma sağlar; çok hassas görüyorsanız kimlik doğrulama ekleyelim.

**Ücret olur mu?** Firebase Spark (ücretsiz) planı bu kullanım için yeterlidir; Resend'in ücretsiz planı ayda 100 e-posta verir (günlük hatırlatma için fazlasıyla yeterli, çünkü sistem tekrar gönderimi atlar).

**Telefonumda da çalışacak mı?** Evet — telefonda panele girip Ayarlar → Bulut Senkronizasyonu'na aynı anahtarları girdiğinizde tüm veri + belgeler orada da görünür.
