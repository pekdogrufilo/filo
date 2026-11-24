const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.doesNotMatch(worker, /self\.skipWaiting\s*\(/);
assert.doesNotMatch(worker, /self\.clients\.claim\s*\(/);
const handler = source.slice(source.indexOf("if('serviceWorker' in navigator)"), source.indexOf('initInstallPrompt();', source.indexOf("if('serviceWorker' in navigator)")));
assert.doesNotMatch(handler, /location\.reload\s*\(/);

const vehicles = [{id:'a', plaka:'TEST-A', kira:100, mevcutKm:1000}, {id:'b', plaka:'TEST-B', kira:200, mevcutKm:2000}];
let selected = ['a'];
let inputs = [];
const box = {
  querySelectorAll: () => inputs,
  set innerHTML(html) {
    inputs = Array.from(html.matchAll(/<input type="number" id="([^"]+)" data-vid="([^"]+)"[^>]*?value="([^"]*)"/g), match => ({id:match[1], dataset:{vid:match[2]}, value:match[3]}));
  }
};
const context = {
  window:{}, vehicles,
  esc: value => String(value),
  document:{
    querySelectorAll: () => selected.map(value => ({value, dataset:{durum:'Müsait'}})),
    getElementById: id => id==='krSecilenAraclar' ? box : null
  }
};
vm.createContext(context);
const start = source.indexOf('function krSecimGuncelle(){');
const end = source.indexOf('\n// ===== Teslim Tutanağı', start);
assert.ok(start>=0 && end>start);
vm.runInContext(source.slice(start, end), context);
context.krSecimGuncelle();
inputs[0].value = '12000';
inputs[1].value = '12345';
selected = ['a','b'];
context.krSecimGuncelle();
assert.equal(inputs[0].value, '12000');
assert.equal(inputs[1].value, '12345');
inputs[2].value = '25000';
selected = ['b'];
context.krSecimGuncelle();
assert.equal(inputs[0].value, '25000');
selected = ['a','b'];
context.krSecimGuncelle();
assert.equal(inputs[0].value, '12000');
assert.equal(inputs[1].value, '12345');
assert.equal(inputs[2].value, '25000');

let callback;
let cleared = false;
const select = {value:'customer-existing', innerHTML:''};
const wizard = {
  document:{getElementById: () => null, querySelector: () => select},
  musteriFormAc: () => {},
  musterileriSirali: () => [{id:'customer-existing'}, {id:'customer-new'}],
  musteriGoruntuAdi: customer => customer.id,
  esc: value => String(value),
  setInterval: fn => { callback=fn; return 1; },
  clearInterval: () => { cleared=true; }
};
vm.createContext(wizard);
const customerStart = source.indexOf('function ykYeniMusteriAc(yukleme){');
const customerEnd = source.indexOf('\nasync function ykTeklifOlustur()', customerStart);
assert.ok(customerStart>=0 && customerEnd>customerStart);
vm.runInContext(source.slice(customerStart, customerEnd), wizard);
wizard.ykYeniMusteriAc();
callback();
assert.equal(select.value, 'customer-existing');
assert.match(select.innerHTML, /customer-new/);
assert.equal(cleared, true);
console.log('Service-worker update and rental-form preservation checks passed.');
