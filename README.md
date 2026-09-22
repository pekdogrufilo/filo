# PEKDOĞRU Filo Kontrol Paneli

PEKDOĞRU Filo Kontrol Paneli; araç filosunun, muayene, sigorta, kasko, bakım, sözleşme, ceza, kaza ve masraf takiplerinin kolayca yapılmasını sağlayan, Progressive Web App (PWA) mimarisinde geliştirilmiş modern bir filo yönetim panelidir.

---

## 🚀 Özellikler

- **Araç ve Filo Yönetimi:** Araç kayıtları, detaylı ruhsat bilgileri, aktif/pasif araç durumları.
- **Tarih & Belge Takibi:** Sigorta, kasko, muayene ve sözleşme bitiş tarihlerinin takibi ve otomatik uyarılar.
- **Bulut Senkronizasyon (Firebase):** Firestore veritabanı entegrasyonu ile tüm cihazlarda anlık veri senkronizasyonu.
- **Otomatik E-posta Hatırlatmaları:** Netlify Functions ve Resend API / GitHub Actions kullanılarak günlük otomatik belge bitiş bildirimleri.
- **PWA / Çevrimdışı Çalışma:** Offline kullanım desteği, uygulama olarak yüklenebilme (Service Worker & Manifest).
- **Veri Dışa/İçe Aktarma:** JSON ve Excel biçimlerinde veri yedekleme ve yükleme.

---

## 🛠 Proje Yapısı

```text
.
├── index.html                  # Ana uygulama (Single Page Application - SPA)
├── build.py                    # HTML minification ve derleme betiği
├── sw.js                       # PWA Service Worker (önbellekleme ve çevrimdışı çalışma)
├── manifest.json               # PWA uygulama bildirimi
├── firestore.rules             # Firebase Firestore güvenlik kuralları
├── KURULUM-BULUT.md            # Firebase ve E-posta entegrasyonu kurulum rehberi
├── netlify.toml                # Netlify yayın ve scheduled function yapılandırması
├── package.json                # Proje bağımlılıkları ve yapılandırma
├── scripts/
│   ├── check-syntax.js         # index.html içi JS söz dizimi kontrol betiği
│   └── hatirlatma.js           # E-posta hatırlatma betiği (GitHub Actions uyumlu)
└── netlify/
    └── functions/
        ├── hatirlatma.js       # Netlify Scheduled Function (otomatik e-posta)
        └── gemini-proxy.js     # AI entegrasyon proxy servisi
```

---

## 💻 Yerel Geliştirme ve Çalıştırma

Proje statik bir HTML/JS uygulamasıdır. Yerel sunucu başlatmak için:

```bash
# Python ile yerel sunucu başlatma
python3 serve.py
```

Tarayıcıda `http://localhost:8000` adresini açabilirsiniz.

---

## 🧪 Test ve Derleme (Build)

### Söz Dizimi Kontrolü
`index.html` içerisindeki JavaScript bloklarının söz dizimi geçerliliğini denetlemek için:

```bash
node scripts/check-syntax.js
```

### Production Derlemesi (Build)
Uygulamayı optimize edilmiş/sıkıştırılmış `dist/index.html` çıktısına dönüştürmek için:

```bash
python3 build.py
```

---

## ☁️ Bulut Senkronizasyonu ve E-posta Kurulumu

Firebase Firestore bağlantısı ve Resend otomatik e-posta hatırlatma sistemi kurulumu için detaylı adımlar [KURULUM-BULUT.md](KURULUM-BULUT.md) dosyasında anlatılmıştır.
