const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const child = require('node:child_process');

const root=path.join(__dirname,'..');
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'filo-full-app-'));
const inject=`<script>
window.addEventListener('load',()=>setTimeout(async()=>{
  const result=document.createElement('pre'); result.id='isolated-test-result'; result.textContent='RUNNING'; document.body.appendChild(result);
  try{
    function check(condition,message){if(!condition) throw new Error(message);}
    window.currentRole='admin'; window.currentUser={uid:'isolated-user'}; window.currentCompanyId='isolated-company';
    vehicles.length=0;
    vehicles.push({id:'test-v1',plaka:'TEST 001',marka:'Test',model:'Bir',durum:'Müsait',kira:12000,mevcutKm:1000});
    vehicles.push({id:'test-v2',plaka:'TEST 002',marka:'Test',model:'İki',durum:'Müsait',kira:20000,mevcutKm:2000});
    rentals.length=0;
    openAracKirala();
    let modal=document.getElementById('kiralaModal');
    check(modal && modal.__sozTaslak,'quick rental did not open');
    document.getElementById('krKiraci').value='Ekranda kalan örnek';
    await new Promise(resolve=>setTimeout(resolve,6000));
    check(!location.search.includes('sw-reset=372') && !window.__testUnregistered,'delayed worker reset redirected the panel');
    check(document.getElementById('kiralaModal')===modal && document.getElementById('krKiraci').value==='Ekranda kalan örnek','open form was interrupted');
    const checks=modal.querySelectorAll('.krCheck');
    check(checks.length===2,'vehicles missing'); checks[0].checked=true; krSecimGuncelle();
    document.getElementById('krKira_0').value='14500'; document.getElementById('krTkm_0').value='13579';
    checks[1].checked=true; krSecimGuncelle();
    check(document.getElementById('krKira_0').value==='14500','vehicle value reset on selection');
    document.getElementById('krKiraci').value='Örnek test';
    window.__krImza.kiraci='data:image/png;base64,VEVTVA==';
    window.__krStep=2; krGoStep(2);
    check(await sozTaslaklari.kaydet(modal.__sozTaslak,true),'quick draft save failed');
    const db=await sozTaslaklari.depo();
    const read=id=>new Promise((resolve,reject)=>{const tx=db.transaction('taslaklar','readonly');const r=tx.objectStore('taslaklar').get(id);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});
    const quick=await read(modal.__sozTaslak.id); modal.remove();
    const overlay=document.createElement('div'); document.body.appendChild(overlay); await sozTaslaklari.ac(quick,overlay);
    modal=document.getElementById('kiralaModal');
    check(modal && document.getElementById('krKiraci').value==='Örnek test','quick customer not restored');
    check(document.getElementById('krKira_0').value==='14500','quick vehicle price not restored');
    check(document.getElementById('krTkm_0').value==='13579','quick vehicle km not restored');
    check(window.__krImza.kiraci==='data:image/png;base64,VEVTVA==','quick signature not restored');
    check(window.__krStep===2,'quick step not restored'); modal.remove();
    openYeniKiralamaSihirbazi(); modal=document.getElementById('ykModal'); check(modal,'wizard did not open');
    document.getElementById('ykArac').value='test-v1'; document.getElementById('ykKira').value='18000';
    ykYeniMusteriAc();
    document.getElementById('mfFirmaAdi').value='Örnek Firma'; document.getElementById('mfTelefon').value='03320000000';
    check(await sozTaslaklari.kaydet(modal.__sozTaslak,true),'wizard draft save failed');
    const wizard=await read(modal.__sozTaslak.id); document.getElementById('musteriFormOverlay').remove(); modal.remove();
    const wizardOverlay=document.createElement('div'); document.body.appendChild(wizardOverlay); await sozTaslaklari.ac(wizard,wizardOverlay);
    check(document.getElementById('ykKira').value==='18000','wizard price not restored');
    check(document.getElementById('mfFirmaAdi').value==='Örnek Firma','customer form not restored');
    check(document.getElementById('mfTelefon').value==='03320000000','customer phone not restored');
    document.getElementById('musteriFormOverlay').remove(); document.getElementById('ykModal').remove();
    const saved={}; let failKey='';
    storageAPI={set:async(key,value)=>{if(key===failKey) throw new Error('sample failure'); saved[key]=value;},get:async(key)=>({value:saved[key]})};
    render=()=>{}; renderCurrentPage=()=>{}; renderKiralamaPage=()=>{}; logActivity=()=>{}; showToast=()=>{}; sozlesmeHazirGoster=()=>{}; teslimTutanakAc=()=>{};
    getAracGorsel=()=> 'https://example.invalid/stock-image.jpg';
    customers.length=0; customers.push({id:'test-c1',tip:'kurum',firmaAdi:'Örnek Firma',telefon:'03320000000'});
    sozlesmeler.length=0; rentals.length=0;
    openAracKirala(); modal=document.getElementById('kiralaModal'); const quickId=modal.__sozTaslak.id;
    modal.querySelector('.krCheck').checked=true; krSecimGuncelle();
    document.getElementById('krKiraci').value='Örnek Firma'; document.getElementById('krBas').value='2026-01-01'; document.getElementById('krBitis').value='2027-01-01';
    await kirayaVerVeSozlesme('pdf');
    const quickDone=await read(quickId);
    check(quickDone.veri.tamamlandi && quickDone.veri.kayitlar.rentalIds.length===1,'quick completion not saved');
    check(rentals[0].sozlesmeId===quickDone.veri.kayitlar.sozlesmeId,'quick completion links missing');
    const quickContract=sozlesmeler.find(item=>item.id===quickDone.veri.kayitlar.sozlesmeId);
    check(!(quickContract.data.teslimFotolar||[]).length,'stock image automatically added to quick contract');
    const realPhoto='data:image/png;base64,VEVTVA==';
    const nativeClick=HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click=function(){
      if(this.type!=='file') return nativeClick.call(this);
      const transfer=new DataTransfer(); transfer.items.add(new File(['sample'],'teslim.png',{type:'image/png'}));
      this.files=transfer.files; window.__sampleUpload=this.onchange();
    };
    fotoSikistir=async file=>{check(file.name==='teslim.png','wrong upload selected');return realPhoto;};
    sozFotoSec(quickContract.id); await window.__sampleUpload; HTMLInputElement.prototype.click=nativeClick;
    check(quickContract.data.teslimFotolar.length===1 && quickContract.data.teslimFotolar[0].data===realPhoto,'selected delivery photo not saved');
    const updated=await sozKaydet({...quickContract.data,teslimFotolar:undefined},quickContract.basISO,quickContract.bitisISO);
    check(updated.data.teslimFotolar.length===1 && updated.data.teslimFotolar[0].data===realPhoto,'existing delivery photo not preserved');
    sozFotoGaleriAc(updated.id);
    check(document.querySelector('#sozFotoOverlay img')?.getAttribute('src')===realPhoto,'delivery gallery photo missing');
    document.getElementById('sozFotoOverlay').click();
    check(document.getElementById('sozFotoOverlay'),'gallery closed after background tap');
    check(teslimTutanakHtml(updated.data).includes(realPhoto) && !teslimTutanakHtml(updated.data).includes('stock-image.jpg'),'delivery document contains wrong photo');
    sozFotoKapat();
    check(!document.getElementById('kiralaModal'),'quick modal still open');
    openYeniKiralamaSihirbazi(); modal=document.getElementById('ykModal'); const wizardId=modal.__sozTaslak.id;
    document.getElementById('ykArac').value='test-v2'; document.getElementById('ykMusteri').value='test-c1';
    document.getElementById('ykBas').value='2026-01-01'; document.getElementById('ykBitis').value='2027-01-01';
    await ykTeklifOlustur(); check(ykSihirbazState.rentalId,'wizard offer missing');
    await ykSozlesmeyeIlerle(); check(rentals.find(item=>item.id===ykSihirbazState.rentalId).durum==='sozlesmeHazir','wizard contract missing');
    const wizardContract=sozlesmeler.find(item=>item.id===rentals.find(entry=>entry.id===ykSihirbazState.rentalId).sozlesmeId);
    check(!(wizardContract.data.teslimFotolar||[]).length,'stock image automatically added to wizard contract');
    document.getElementById('ykTeslimKm').value='2500'; document.getElementById('ykTeslimYakit').value='Boş';
    await ykTeslimEt(); const wizardDone=await read(wizardId);
    check(wizardDone.veri.tamamlandi && wizardDone.veri.kayitlar.rentalIds[0]===ykSihirbazState.rentalId,'wizard completion not saved');
    check(!document.getElementById('ykModal'),'wizard modal still open');
    vehicles.push({id:'test-v3',plaka:'TEST 003',durum:'Müsait',kira:12000});
    openAracKirala(); modal=document.getElementById('kiralaModal'); const failedId=modal.__sozTaslak.id;
    modal.querySelector('.krCheck[value="test-v3"]').checked=true; krSecimGuncelle();
    document.getElementById('krKiraci').value='Örnek Firma'; document.getElementById('krBas').value='2026-01-01'; document.getElementById('krBitis').value='2027-01-01';
    failKey='rentals'; await kirayaVerVeSozlesme('pdf');
    const failed=await read(failedId); check(failed.veri.islem && !failed.veri.tamamlandi,'failed save marked completed');
    check(document.getElementById('kiralaModal'),'failed save closed form');
    result.textContent='PASS: full quick and wizard rental draft flows';
  }catch(error){result.textContent='FAIL: '+error.stack;}
},2500));
</script>`;
const earlyInject=`<script>
if(navigator.serviceWorker){
  Object.defineProperty(navigator.serviceWorker,'getRegistrations',{value:()=>new Promise(resolve=>setTimeout(()=>resolve([{unregister:()=>{window.__testUnregistered=true;}}]),5000))});
}
</script>`;
const index=fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<head>','<head>'+earlyInject).replace('</body>',inject+'</body>');
const types={'.js':'application/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch(error){res.writeHead(400);res.end();return;}
  if(pathname==='/' || pathname==='/index.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(index);return;}
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream'); fs.createReadStream(file).pipe(res);
});
function run(port,size,index){
  return new Promise((resolve,reject)=>{
    const proc=child.spawn(edge,['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--disable-background-networking','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1','--window-size='+size,'--user-data-dir='+path.join(directory,'profile'+index),'--virtual-time-budget=15000','--dump-dom','http://127.0.0.1:'+port+'/'],{windowsHide:true});
    let output=''; proc.stdout.on('data',chunk=>{output+=chunk;}); proc.stderr.resume();
    const timeout=setTimeout(()=>proc.kill(),45000);
    proc.on('error',error=>{clearTimeout(timeout);reject(error);});
    proc.on('close',code=>{clearTimeout(timeout);try{assert.equal(code,0);assert.match(output,/PASS: full quick and wizard rental draft flows/);resolve();}catch(error){const match=output.match(/<pre id="isolated-test-result">([\s\S]*?)<\/pre>/);reject(new Error(size+': '+(match?match[1]:error.message)));}});
  });
}
server.listen(0,'127.0.0.1',async()=>{
  try{const port=server.address().port;await run(port,'1440,900',1);await run(port,'1024,768',2);console.log('Full rental draft browser checks passed at desktop and tablet sizes.');}
  catch(error){console.error(error);process.exitCode=1;}
  finally{server.close();try{fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch(error){console.error(error);process.exitCode=1;}}
});
