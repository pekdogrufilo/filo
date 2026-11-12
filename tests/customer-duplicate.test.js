const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = source.indexOf('function musteriTekrarBul(');
const end = source.indexOf('\nasync function musteriKaydet(', start);
assert.ok(start >= 0 && end > start, 'Customer duplicate checker must exist');
const checkDuplicate = vm.runInNewContext(source.slice(start, end) + '\nmusteriTekrarBul');
const customers = [
  {id: 'first', telefon: '0532 123 45 67', tc: '12345678901'},
  {id: 'second', telefon: '0332 111 22 33', vkn: '1234567890'},
];
assert.equal(checkDuplicate({telefon: '+90 532 123 45 67'}, customers, null).musteri.id, 'first');
assert.equal(checkDuplicate({telefon: '0090 332 111 22 33'}, customers, null).musteri.id, 'second');
assert.equal(checkDuplicate({tc: '12345678901'}, customers, null).alan, 'T.C. kimlik numarası');
assert.equal(checkDuplicate({vkn: '1234567890'}, customers, null).musteri.id, 'second');
assert.equal(checkDuplicate({telefon: '05321234567', tc: '12345678901'}, customers, 'first'), null);
assert.equal(checkDuplicate({telefon: '05321234568'}, customers, null), null);
assert.equal(checkDuplicate({}, customers, null), null);
console.log('Customer duplicate checks passed.');
