#!/usr/bin/env node
// index.html içindeki satır-içi <script> bloklarının JavaScript söz dizimini kontrol eder.
// Amaç: küçük bir yazım hatasının (ör. yanlış id, eksik parantez) canlıya çıkıp tüm paneli
// sessizce çökertmesini, push aşamasında yakalamak. (Bkz. bu depodaki "ruhsat okuma"
// donma hatası — id uyuşmazlığı yüzünden oluşmuştu ve fark edilmeden yayına çıkmıştı.)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const scriptRe = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
const scripts = [];
let match;
while ((match = scriptRe.exec(html))) {
    if (match[1].trim()) scripts.push(match[1]);
}

if (!scripts.length) {
    console.error('index.html içinde satır-içi <script> bulunamadı — kontrol edilecek bir şey yok.');
    process.exit(1);
}

let hataVar = false;
scripts.forEach((code, i) => {
    const tmpFile = path.join(os.tmpdir(), `filo-panel-inline-check-${i}.js`);
    fs.writeFileSync(tmpFile, code);
    try {
          execFileSync(process.execPath, ['--check', tmpFile], { stdio: 'inherit' });
          console.log(`✓ <script> #${i + 1} söz dizimi geçerli (${code.length.toLocaleString('tr-TR')} karakter).`);
    } catch (e) {
          console.error(`✗ <script> #${i + 1} içinde JavaScript söz dizimi hatası var!`);
          hataVar = true;
    } finally {
          fs.unlinkSync(tmpFile);
    }
});

if (hataVar) {
    console.error('\nSonuç: index.html yayınlanmaya hazır DEĞİL — yukarıdaki hatayı düzeltin.');
    process.exit(1);
}
console.log('\nSonuç: tüm satır-içi scriptler geçerli.');
