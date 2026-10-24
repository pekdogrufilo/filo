# PEKDOĞRU Filo — Bulut Senkron + Otomatik E-posta Kurulumu

Bu rehberi izleyince: (1) verileriniz ve belgeleriniz Google bulutuna yedeklenir, tüm cihazlarda aynı olur; (2) belge bitişlerinde panel otomatik e-posta atar. İkisi de **ücretsiz** katmanlarla çalışır.

---

## BÖLÜM 1 — Bulut Senkron (Firebase) — ~15 dakika

### 1. Firebase projesi aç
1. https://console.firebase.google.com adresine girin (Google hesabıyla).
2. **"Add project / Proje ekle"** → Ad: `pekdogru-filo` → Analytics'i kapatabilirsiniz → **Create**.

### 2. Firestore veritabanı oluştur
1. Sol menüden **Build → Firestore Database** → **Create database**.
2. Konum: **eur3 (Europe)** önerilir → **Start in production mode** → **Enable**.

### 3. Güvenlik kurallarını yayınla (ÖNEMLİ — eski kuralı KULLANMAYIN)
1. **Rules** sekmesine girin.
2. Depodaki **`firestore.rules`** dosyasının TÜM içeriğini kopyalayıp yapıştırın (bu rehberdeki eski, kısa kural **artık geçerli değildir** — o kural, hesabı olan herkesin tüm panel verisini okumasına izin veriyordu).
3. **Publish** deyin. Yeni kurallar şunları sağlar:
   - Panel verisi (`filoPaneliData`) yalnızca **users dokümanı olan** gerçek panel kullanıcılarına açıktır (anonim/sahte hesaplar okuyamaz).
   - Ekip üyeleri kendi dokümanlarında rol/şirket değiştiremez, kendini admin yapamaz.
   - `invites` (davet) ve `superAdminAuditLog` koleksiyonları kurala kavuşur; süper admin paneli çalışır.

### 4. Kimlik doğrulamayı ayarla
1. **Build → Authentication → Get started**.
2. **Email/Password → Enable** (panel bu yöntemle giriş yapar).
3. **Anonymous sağlayıcisini KAPALI bırakın/tutun.** Panel anonim oturum açmaz; açık olması güvenlik açığıdır.

### 5. İlk yönetici hesabını oluştur (tek seferlik, konsoldan)
Panelde "yeni şirket kaydı" bilinçli olarak kapalıdır (güvenlik); ilk yöneticiyi konsoldan oluşturursunuz:
1. **Authentication → Users → Add user** → e-posta + şifre girin → kaydedin ve çıkan **UID**'yi kopyalayın.
2. **Firestore Database → Start collection** → adı `users` → doküman ID olarak UID'yi yapıştırın, şu alanları ekleyin:

| Alan | Tür | Değer |
|---|---|---|
| `companyId` | string | `pekdogru` (şirketinizin kalıcı kimliği) |
| `adSoyad` | string | Adınız Soyadınız |
| `email` | string | Giriş e-postanız |
| `roleId` | string | `sahip` |
| `aktif` | boolean | `true` |
| `olusturmaTarihi` | string | bugünün tarihi (ör. `2026-10-24T12:00:00.000Z`) |

3. Aynı `companyId` değeriyle bir de şirket dokümanı önerilir: koleksiyon `companies`, doküman ID `pekdogru`, alanlar: `unvan` = `PEKDOĞRU Filo Kiralama Hizmetleri`, `plan` = `Enterprise`.
4. (Opsiyonel — süper admin paneli için) users dokümanına `superAdmin` (boolean) = `true` alanını ekleyin. Bu alan konsol dışından hiçbir şekilde atanamaz.

> Sonraki ekip üyeleri panelden eklenir: **Ekip → Davet gönder** → davetli, giriş ekranındaki "Bir davetim var" ekranından kendi e-postasıyla kayıt olur.

### 6. Web uygulaması anahtarını al
1. Proje ana sayfasında ⚙️ **Project settings → General → Your apps → Web (</>) simgesi**.
2. Takma ad: `panel` → **Register app** (Hosting adımı gerekmez).
3. Karşınıza çıkan `firebaseConfig` bloğundaki değerler gerekli: **apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId**.

### 7. Panele bağla ve giriş yap
1. Paneli açın → **Ayarlar → Bulut Senkronizasyonu → Bağlan** → firebaseConfig değerlerini girin → **Bağlan**.
2. Giriş ekranından 5. adımda oluşturduğunuz e-posta/şifreyle **giriş yapın**.
3. Üst çubukta **"☁ Bulutta senkronize"** rozetini görmelisiniz. Telefonunuzdan da aynı adımlarla bağlanıp aynı hesapla girince her şey orada da görünür.

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

## Sık sorulanlar

**Buluta bağlayınca verilerim güvende mi?** Veri Google'ın altyapısında saklanır, HTML dosyanız artık araç verisi taşımaz. `firestore.rules` dosyasındaki kurallar yayındaysa panele yalnızca gerçek panel kullanıcıları (e-posta/şifreyle giriş yapıp users dokümanı olan hesaplar) erişebilir; anonim ve sahte hesaplar erişemez. Kuralları yayınlamayı ve Anonymous sağlayıcisini kapalı tutmayı atlamayın — güvenliğin asıl adımı budur.

**Ücret olur mu?** Firebase Spark (ücretsiz) planı bu kullanım için yeterlidir; Resend'in ücretsiz planı ayda 100 e-posta verir (günlük hatırlatma için fazlasıyla yeterli, çünkü sistem tekrar gönderimi atlar).

**Telefonumda da çalışacak mı?** Evet — telefonda panele girip Ayarlar → Bulut Senkronizasyonu'na aynı anahtarları girdiğinizde tüm veri + belgeler orada da görünür.
