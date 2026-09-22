/**
 * PEKDOĞRU Filo Kontrol Paneli - Birim Testleri
 *
 * Kritik iş mantığı işlevlerinin (tarih/kalan gün hesaplamaları, plaka formatlama vb.)
 * doğruluğunu test eder.
 */

const assert = require('assert');

// 1. Kalan Gün Hesaplama Mantığı
function kalanGunHesapla(hedefTarihIso, bugunDateObj) {
  if (!hedefTarihIso) return null;
  const bugun = bugunDateObj ? new Date(bugunDateObj) : new Date();
  bugun.setHours(0, 0, 0, 0);
  const hedef = new Date(hedefTarihIso + 'T00:00:00');
  return Math.round((hedef - bugun) / 86400000);
}

// 2. Plaka Format Temizleme & Doğrulama Mantığı
function plakaTemizle(plaka) {
  if (!plaka) return '';
  return String(plaka).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function plakaGecerliMi(plaka) {
  const temiz = plakaTemizle(plaka);
  // TR Plaka deseni: 2 rakam + 1-3 harf + 2-4 rakam
  const re = /^(0[1-9]|[1-7][0-9]|8[01])[A-Z]{1,3}[0-9]{2,4}$/;
  return re.test(temiz);
}

// -----------------------------------------------------------------------------
// TEST SENARYOLARI
// -----------------------------------------------------------------------------

function testKalanGunHesapla() {
  const referansBugun = '2025-05-10';

  // Gelecek tarih (10 gün sonra)
  assert.strictEqual(kalanGunHesapla('2025-05-20', referansBugun), 10, '10 gün kalmış olmalı');

  // Bugün biten tarih
  assert.strictEqual(kalanGunHesapla('2025-05-10', referansBugun), 0, 'Bugün bitiyor olmalı (0)');

  // Geçmiş tarih (5 gün önce)
  assert.strictEqual(kalanGunHesapla('2025-05-05', referansBugun), -5, '5 gün geçmiş olmalı (-5)');

  // Tanımsız tarih
  assert.strictEqual(kalanGunHesapla('', referansBugun), null, 'Boş tarih null dönmeli');

  console.log('✓ kalanGunHesapla testleri geçti.');
}

function testPlakaDogrulama() {
  assert.strictEqual(plakaTemizle('34 ABC 123'), '34ABC123', 'Boşluklar temizlenmeli');
  assert.strictEqual(plakaTemizle('06-xyz-99'), '06XYZ99', 'Tire silinmeli ve harfler büyütülmeli');

  assert.strictEqual(plakaGecerliMi('34 ABC 123'), true, '34 ABC 123 geçerli plaka');
  assert.strictEqual(plakaGecerliMi('06 XYZ 99'), true, '06 XYZ 99 geçerli plaka');
  assert.strictEqual(plakaGecerliMi('34123ABC'), false, '34123ABC geçersiz format');
  assert.strictEqual(plakaGecerliMi('99 ABC 123'), false, '99 İl kodu geçersiz');

  console.log('✓ plakaDogrulama testleri geçti.');
}

function runAll() {
  console.log('--- Birim Testler Başlatılıyor ---');
  try {
    testKalanGunHesapla();
    testPlakaDogrulama();
    console.log('\nSonuç: Tüm birim testler başarıyla geçti!');
  } catch (err) {
    console.error('\n✗ Test Başarısız:', err.message);
    process.exit(1);
  }
}

runAll();
