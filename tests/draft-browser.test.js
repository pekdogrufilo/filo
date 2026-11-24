const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const child = require('node:child_process');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = source.indexOf('const sozTaslaklari = {');
const end = source.indexOf('\n// ===== Araç Kirala', start);
const fotoStart = source.indexOf('async function sozFotoYerelDurumGoster(');
const fotoEnd = source.indexOf('\nfunction sozFotoKapat()', fotoStart);
assert.ok(start >= 0 && end > start && fotoStart>=0 && fotoEnd>fotoStart);
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(edge)) throw new Error('Microsoft Edge is required for the isolated IndexedDB test');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'filo-draft-test-'));
const html = `<!doctype html><meta charset="utf-8"><body><pre id="result">RUNNING</pre><script>
window.currentUser = {uid:'test-user'};
window.currentCompanyId = 'test-company';
window.__krStep = 1;
window.__krImza = {kiraci:null,kirayaVeren:null};
window.__krAracAlanlari = {};
const vehicles = [{id:'v1'}];
const rentals = [];
const sozlesmeler = [{id:'contract-1',data:{teslimFotolar:[]}}];
let persistResult=false;
window.__cloudSyncActive=true;
window.confirm=()=>true;
async function persistSozlesmeler(){ return persistResult; }
function sozFotoGaleriCiz(){}
let ykSihirbazState = null;
function isAdmin(){ return true; }
function rentalAcikBul(){ return null; }
function showToast(){}
function makeModal(){
  const modal=document.createElement('div');
  modal.id='kiralaModal';
  modal.innerHTML='<div class="iade-head"></div><input id="krKiraci"><input type="checkbox" class="krCheck" value="v1"><div id="krSecilenAraclar"></div><span id="krImzaKiraciDurum"></span><span id="krImzaKvDurum"></span>';
  document.body.appendChild(modal);
  return modal;
}
function openAracKirala(){
  window.__krImza={kiraci:null,kirayaVeren:null};
  window.__krAracAlanlari={};
  const modal=makeModal();
  sozTaslaklari.yeni('kr',modal);
}
function krSecimGuncelle(){
  const box=document.getElementById('krSecilenAraclar');
  const checked=document.querySelector('.krCheck:checked');
  box.innerHTML=checked?'<input id="krKira_0" data-vid="v1"><input id="krTkm_0" data-vid="v1">':'';
  if(checked){
    document.getElementById('krKira_0').value=window.__krAracAlanlari.v1?.kira||'';
    document.getElementById('krTkm_0').value=window.__krAracAlanlari.v1?.km||'';
  }
}
function krGoStep(step){ window.__krStep=step; }
function openYeniKiralamaSihirbazi(){
  ykSihirbazState={rentalId:null};
  const modal=document.createElement('div'); modal.id='ykModal';
  modal.innerHTML='<div class="iade-head"></div><input id="ykKira"><input id="ykBas"><input id="ykkont-motor" type="checkbox">';
  document.body.appendChild(modal); sozTaslaklari.yeni('yk',modal);
}
function ykDevamEt(){ throw new Error('Unexpected existing rental'); }
function ykFiyatOneriGuncelle(){}
function musteriFormTipDegisti(){}
function ykYeniMusteriAc(){
  const modal=document.getElementById('ykModal');
  const form=document.createElement('div'); form.id='musteriFormOverlay'; form.dataset.sozTaslak=modal.__sozTaslak.id;
  form.innerHTML='<input id="mfFirmaAdi"><input id="mfTelefon">'; document.body.appendChild(form);
}
${source.slice(start,end)}
${source.slice(fotoStart,fotoEnd)}
function check(value,message){ if(!value) throw new Error(message); }
async function read(id){
  const db=await sozTaslaklari.depo();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['taslaklar','imzalar'],'readonly');
    const record=tx.objectStore('taslaklar').get(id);
    const signature=tx.objectStore('imzalar').get(id+':kiraci');
    tx.oncomplete=()=>resolve({record:record.result, signature:signature.result});
    tx.onerror=()=>reject(tx.error);
  });
}
(async()=>{
  let id=sessionStorage.getItem('draft-test-id');
  let stored;
  if(!id){
  await new Promise((resolve,reject)=>{
    const req=indexedDB.open('filo-sozlesme-taslaklari',1);
    req.onupgradeneeded=()=>{ req.result.createObjectStore('taslaklar',{keyPath:'id'}); req.result.createObjectStore('imzalar'); };
    req.onsuccess=()=>{ req.result.close(); resolve(); }; req.onerror=()=>reject(req.error);
  });
  const fotoId=await sozTaslaklari.fotoKaydet('contract-1','data:image/png;base64,VEVTVA==','örnek zaman');
  sessionStorage.setItem('foto-test-id',fotoId);
  openAracKirala();
  const modal=document.getElementById('kiralaModal');
  const state=modal.__sozTaslak;
  document.getElementById('krKiraci').value='Örnek müşteri';
  document.querySelector('.krCheck').checked=true;
  krSecimGuncelle();
  document.getElementById('krKira_0').value='12000';
  document.getElementById('krTkm_0').value='34567';
  window.__krStep=4;
  window.__krImza.kiraci='data:image/png;base64,VEVTVA==';
  check(await sozTaslaklari.kaydet(state,true),'initial save failed');
  stored=await read(state.id);
  check(stored.record.veri.alanlar.krKiraci.value==='Örnek müşteri','customer missing');
  check(stored.record.veri.aracAlanlari.v1.kira==='12000','rental value missing');
  check(stored.record.veri.adim===4,'step missing');
  check(stored.signature===window.__krImza.kiraci,'signature missing');
  const other=Object.assign({},state,{rev:state.rev,son:'',kuyruk:Promise.resolve(true)});
  document.getElementById('krKiraci').value='Yeni örnek';
  check(await sozTaslaklari.kaydet(state,true),'second save failed');
  check(!await sozTaslaklari.kaydet(other,true),'stale tab overwrote draft');
  check(await sozTaslaklari.baslat(modal),'checkpoint failed');
  stored=await read(state.id);
  check(stored.record.veri.islem===true,'checkpoint not persisted');
  check(!await sozTaslaklari.baslat(modal),'duplicate submission allowed');
  id=state.id;
  sessionStorage.setItem('draft-test-id',id);
  location.reload();
  return;
  }
  stored=await read(id);
  const fotoId=sessionStorage.getItem('foto-test-id');
  check((await sozTaslaklari.fotoKimlikleri('contract-1')).includes(fotoId),'photo backup missing after reload');
  const foto=await sozTaslaklari.fotoOku('contract-1',fotoId);
  check(await foto.blob.text()==='TEST','photo contents missing');
  check((await sozTaslaklari.fotoKimlikleri('other-contract')).length===0,'photo contract isolation failed');
  const overlay=document.createElement('div'); document.body.appendChild(overlay);
  await sozTaslaklari.ac(stored.record,overlay);
  const restored=document.getElementById('kiralaModal');
  check(!!restored,'restore failed');
  check(document.getElementById('krKiraci').value==='Yeni örnek','restored customer missing');
  check(document.getElementById('krKira_0').value==='12000','restored rental value missing');
  check(document.getElementById('krTkm_0').value==='34567','restored km missing');
  check(window.__krImza.kiraci==='data:image/png;base64,VEVTVA==','restored signature missing');
  check(window.__krStep===4,'restored step missing');
  check(!await sozTaslaklari.baslat(restored),'restored interrupted operation allowed');
  window.currentUser={uid:'another-user'};
  document.getElementById('krKiraci').value='Yanlış hesap';
  check(!await sozTaslaklari.kaydet(restored.__sozTaslak,true),'different account saved');
  check((await sozTaslaklari.fotoKimlikleri('contract-1')).length===0,'photo account isolation failed');
  let denied=false;
  try{ await sozTaslaklari.fotoOku('contract-1',fotoId); }catch(error){ denied=true; }
  check(denied,'different account read photo');
  window.currentUser={uid:'test-user'};
  const button=document.createElement('button');
  await sozFotoKurtar('contract-1',button);
  check((await sozTaslaklari.fotoKimlikleri('contract-1')).length===1,'failed cloud save deleted photo');
  check(sozlesmeler[0].data.teslimFotolar.length===1,'photo was not restored');
  persistResult=true;
  await sozFotoKurtar('contract-1',button);
  check(sozlesmeler[0].data.teslimFotolar.length===1,'photo recovery duplicated photo');
  check((await sozTaslaklari.fotoKimlikleri('contract-1')).length===0,'photo deletion failed');
  stored=await read(id);
  check(stored.record.veri.alanlar.krKiraci.value==='Yeni örnek','account isolation failed');
  restored.remove();
  openYeniKiralamaSihirbazi();
  const wizard=document.getElementById('ykModal');
  document.getElementById('ykKira').value='25000';
  document.getElementById('ykBas').value='2026-11-01';
  document.getElementById('ykkont-motor').checked=true;
  ykYeniMusteriAc();
  document.getElementById('mfFirmaAdi').value='Örnek Ltd';
  document.getElementById('mfTelefon').value='03320000000';
  check(await sozTaslaklari.kaydet(wizard.__sozTaslak,true),'wizard save failed');
  const wizardRecord=(await read(wizard.__sozTaslak.id)).record;
  document.getElementById('musteriFormOverlay').remove(); wizard.remove();
  const wizardOverlay=document.createElement('div'); document.body.appendChild(wizardOverlay);
  await sozTaslaklari.ac(wizardRecord,wizardOverlay);
  check(document.getElementById('ykKira').value==='25000','wizard price missing');
  check(document.getElementById('ykBas').value==='2026-11-01','wizard date missing');
  check(document.getElementById('ykkont-motor').checked,'wizard checklist missing');
  check(document.getElementById('mfFirmaAdi').value==='Örnek Ltd','customer form missing');
  check(document.getElementById('mfTelefon').value==='03320000000','customer telephone missing');
  const resumedWizard=document.getElementById('ykModal');
  check(await sozTaslaklari.baslat(resumedWizard),'wizard checkpoint failed');
  await sozTaslaklari.tamamla(resumedWizard,{sozlesmeId:'contract-1',rentalIds:['rental-1']});
  const completed=(await read(resumedWizard.__sozTaslak.id)).record;
  check(completed.veri.tamamlandi && completed.veri.kayitlar.rentalIds[0]==='rental-1','completion marker missing');
  document.getElementById('musteriFormOverlay').remove(); resumedWizard.remove();
  const completedOverlay=document.createElement('div'); document.body.appendChild(completedOverlay);
  await sozTaslaklari.ac(completed,completedOverlay);
  check(!document.getElementById('ykModal'),'completed draft reopened');
  document.getElementById('result').textContent='PASS: IndexedDB restore, signature, conflict, interrupted operation and account isolation';
})().catch(error=>{document.getElementById('result').textContent='FAIL: '+error.stack;});
</script></body>`;
const testFile = path.join(directory, 'index.html');
fs.writeFileSync(testFile, html);
try {
  const output = child.execFileSync(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions', '--user-data-dir=' + path.join(directory, 'profile'), '--virtual-time-budget=12000', '--dump-dom', 'file:///' + testFile.replace(/\\/g, '/')], {encoding:'utf8', timeout:45000, windowsHide:true, stdio:['ignore','pipe','ignore']});
  assert.match(output, /PASS: IndexedDB restore, signature, conflict, interrupted operation and account isolation/);
  console.log('IndexedDB draft browser checks passed.');
} finally {
  fs.rmSync(directory, {recursive:true, force:true, maxRetries:5, retryDelay:200});
}
