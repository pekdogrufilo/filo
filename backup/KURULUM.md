# PEKDOĞRU Filo Paneli — Günlük Otomatik Yedek + E-posta Kurulumu

Bu dosya, `www.pekdogru.com` hostinginizde her gece 23:00'da çalışacak, Firebase'deki Filo Paneli verilerinizi çekip size e-posta ile ZIP yedek gönderecek PHP scriptinin kurulum rehberidir.

## Gereksinimler

- Güzel Hosting (cPanel) hesabı
- PHP 7.4+ (`openssl`, `curl`, `zip` eklentileri — cPanel'de genelde açık)
- Firebase projesine ait **service account key** JSON dosyası
- cPanel'de oluşturulmuş bir e-posta hesabı (örn. `yedek@pekdogru.com`)

---

## Adım 1: Firebase Service Account Key Alma

1. [Firebase Console](https://console.firebase.google.com/) adresine gidin.
2. Sol üstteki dişli (proje ayarları) → **Proje ayarları**.
3. **Hizmet hesapları** (Service accounts) sekmesine tıklayın.
4. **Yeni özel anahtar oluştur** (Generate new private key) butonuna basın.
5. İnen `.json` dosyasını bilgisayarınızda güvenli bir yere kaydedin.
6. Bu dosyanın adını `firebase-service-account.json` yapın.

---

## Adım 2: Dosyaları Hostinge Yükleme

1. cPanel'e giriş yapın.
2. **File Manager** (Dosya Yöneticisi) açın.
3. `public_html` klasörünün içine yeni bir klasör oluşturun: `filo-yedek`
4. Bu klasöre şu iki dosyayı yükleyin:
   - `filo-yedek-cron.php`
   - `firebase-service-account.json`
5. `filo-yedek-cron.php` dosyasına sağ tıklayıp **Edit** (Düzenle) deyin.
6. Başındaki `$AYARLAR` dizisini doldurun:

```php
'mail_to'     => 'YEDEKLERIN_GIDECEGI_ADRES@ornek.com',
'smtp_host'   => 'mail.pekdogru.com',
'smtp_port'   => 465,
'smtp_user'   => 'yedek@pekdogru.com',
'smtp_pass'   => 'BURAYA_CPANEL_EPOSTA_SIFRENIZ',
'smtp_secure' => 'ssl',
```

> Not: `smtp_pass` yerine cPanel'den oluşturduğunuz e-posta hesabının şifresini yazın. Bu şifre sadece bu PHP dosyasında kalır.

---

## Adım 3: Cron Job Ayarlama (Her Gece 23:00)

1. cPanel'de **Cron Jobs** menüsüne gidin.
2. **Add New Cron Job** (Yeni Cron Görevi Ekle) bölümüne şunu yazın:

```
0 23 * * *
```

3. Komut alanına şunu yazın (kullanıcı adınızı kendi cPanel kullanıcı adınızla değiştirin):

```bash
/usr/bin/php /home/KULLANICI_ADINIZ/public_html/filo-yedek/filo-yedek-cron.php >/dev/null 2>&1
```

> Not: PHP yolu bazen `/usr/local/bin/php` olabilir. Emin değilseniz hosting firmanıza sorun veya cron e-postasına hata çıktısı almak için `>/dev/null 2>&1` kısmını kaldırın.

4. **Add New Cron Job** butonuna basın.

---

## Adım 4: Test Etme

1. Tarayıcınızda şu adresi açın:

```
https://www.pekdogru.com/filo-yedek/filo-yedek-cron.php
```

2. Sayfa boş görünebilir; gerçek çıktı `filo-yedek-cron.log` dosyasına yazılır.
3. File Manager'da aynı klasörde `filo-yedek-cron.log` dosyası oluşmuşsa açın.
4. İçinde `E-posta gönderildi:` yazısını görürseniz başarılıdır.
5. Belirttiğiniz alıcı e-posta adresinin gelen kutusunu (ve spam klasörünü) kontrol edin.

---

## Alınan Yedeği Kullanma

E-postadaki ZIP dosyasını indirin. İçinde her veri bölümü için iki dosya vardır:

- `.csv` dosyaları: Excel ile açıp inceleyebilirsiniz.
- `.json` dosyaları: Panelde **Ayarlar > Veri Aktarımı > JSON Yedekten Yükle** ile tek tek geri yükleyebilirsiniz.

Acil durumda tüm veriyi geri yüklemek için ZIP içindeki `.json` dosyalarını panelin yedek yükleme ekranına sırayla yükleyin.

---

## Güvenlik Notları

- `firebase-service-account.json` dosyası ve `filo-yedek-cron.php` dosyası hostinginizde saklanır.
- `filo-yedek` klasörüne dışarıdan doğrudan erişim olsa bile, service account key görünmez (PHP tarafından okunur).
- Dilerseniz `.htaccess` ile `filo-yedek` klasörünü IP kısıtlamasıyla koruyabilirsiniz.
- E-posta şifresini kimseyle paylaşmayın.

---

## Sorun Giderme

| Sorun | Olası Neden | Çözüm |
|-------|-------------|-------|
| `Firebase service account key dosyası bulunamadı` | Dosya adı veya yolu yanlış | `firebase-service-account.json` adıyla aynı klasöre yükleyin |
| `Access token alınamadı` | Service account key yanlış veya Firebase projesi kapalı | Firebase Console'dan yeni key oluşturun |
| `SMTP bağlantı hatası` | SMTP bilgileri yanlış | cPanel > E-posta Hesapları > Ayarlar > Mail Client Manual Settings bilgilerini girin |
| Mail spam klasörüne düşüyor | Gönderici alan adı farklı | `mail_from` adresini cPanel'de oluşturduğunuz bir adrese ayarlayın |
| ZIP boş geliyor | Firestore kuralları okumaya izin vermiyor | Service account key'in `Cloud Datastore User` rolüne sahip olduğundan emin olun |

---

Kurulum tamamlandığında her gece 23:00'da otomatik yedek e-postanıza gelecektir.
