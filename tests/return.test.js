const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = source.indexOf('async function saveIade(');
const end = source.indexOf('\n// FAZ4 Part B.5: İade sonrası', start);
assert.ok(start >= 0 && end > start, 'Return workflow must exist');

async function runScenario(returnKm) {
  const elements = {
    iadeKmBas: {value: '100000'}, iadeKmBitis: {value: String(returnKm)},
    iadeKiraBas: {value: '2026-01-01'}, iadeIadeTarih: {value: '2026-02-01'},
    iadeKmLimiti: {value: ''}, iadeYakit: {value: 'Boş'}, iadeHasar: {value: 'Hasarsız'},
    iadeNot: {value: ''}, iadeTutanak: {checked: false},
  };
  const vehicle = {id: 'vehicle-1', plaka: '34ABC123', durum: 'Kirada', sonKm: 100000, teslimKm: 100000, kiraciAdi: 'Test', kira: 1000};
  const rental = {id: 'rental-1', vehicleId: vehicle.id, durum: 'teslimEdildi', teslimKontrol: {km: 100000, yakitSeviyesi: 'Boş'}};
  const context = {
    vehicles: [vehicle], rentals: [rental], sozlesmeler: [], document: {getElementById: id => elements[id] || null},
    showToast: () => {}, confirm: () => true, todayISO: () => '2026-02-01', monthsBetweenDates: () => 1,
    buildIadeFotoFields: async () => ({}), kontrolListesiOku: () => ({}), rentalAcikBul: () => rental,
    persist: async () => {}, persistRentals: async () => {}, persistSozlesmeler: async () => {},
    render: () => {}, renderStatMasraf: () => {}, logActivity: () => {}, esc: value => value,
    YAKIT_SEVIYE_INDEKS: {'Boş': 0}, TAHMINI_DEPO_LITRE: 50, TAHMINI_YAKIT_FIYATI_TL: 40,
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  await context.saveIade(vehicle.id);
  return context;
}

(async () => {
  const invalid = await runScenario(99999);
  assert.equal(invalid.vehicles[0].durum, 'Kirada');
  assert.equal(invalid.rentals[0].durum, 'teslimEdildi');
  const valid = await runScenario(101000);
  assert.equal(valid.vehicles[0].durum, 'Müsait');
  assert.equal(valid.vehicles[0].sonKm, 101000);
  assert.equal(valid.vehicles[0].kiraciAdi, undefined);
  assert.equal(valid.rentals[0].durum, 'kapandi');
  assert.equal(valid.rentals[0].iadeKontrol.km, 101000);
  console.log('Return workflow checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
