const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
function functionSource(startText, endText) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start);
  assert.ok(start >= 0 && end > start, 'Document generator must exist');
  return source.slice(start, end);
}
const context = {document: {querySelector: () => null}, esc: value => String(value == null ? '' : value), imzaBoxHtml: () => '', sozMaddeListesi: () => [], SIRKET_LOGOS: {}};
vm.createContext(context);
vm.runInContext(functionSource('function teslimTutanakHtml(', '\nfunction teslimTutanakAc('), context);
vm.runInContext(functionSource('function sozlesmeHtml(d)', '\nasync function sozlesmeDocx('), context);
const image = 'data:image/png;base64,AA==';
const data = {
  plaka: '42ABC123', tarih: '12.11.2026', sozNo: 'TEST-1', firmaAdi: 'Test', firmaAdres: '', kiraci: 'Test müşteri',
  araclar: [{plaka: '42ABC123', marka: 'Test', model: 'Model', teslimKm: '100.000'}],
  bas: '01.11.2026', bitis: '01.12.2026', sure: '1 ay', yakit: 'Boş', teslimFotolar: [{data: image}],
  kmLimit: '3000', kmAsimFiyat: '1', depozito: '0', kira: '1000',
};
const delivery = context.teslimTutanakHtml(data);
assert.ok(delivery.includes('42ABC123'));
assert.ok(delivery.includes('Boş'), 'Empty fuel level must appear on the report');
assert.ok(delivery.includes(image), 'Delivery image must appear on the report');
const contract = context.sozlesmeHtml(data);
assert.ok(contract.includes('42ABC123'));
assert.ok(contract.includes('TEST-1'));
console.log('Contract and delivery document checks passed.');
