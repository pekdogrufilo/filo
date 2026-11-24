const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const child = require('node:child_process');

const root = path.join(__dirname, '..');
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const git = 'C:\\Program Files\\Git\\cmd\\git.exe';
const oldWorker = child.execFileSync(git, ['show','HEAD:sw.js'], {cwd:root, encoding:'utf8'});
const newWorker = fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert.match(oldWorker, /skipWaiting/);
assert.doesNotMatch(newWorker, /self\.skipWaiting\s*\(/);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'filo-worker-test-'));
let updated = false;
const html = `<!doctype html><meta charset="utf-8"><pre id="result">RUNNING</pre><script>
let refreshing=false;
navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(refreshing) return;
  refreshing=true;
  sessionStorage.setItem('reloads',String(Number(sessionStorage.getItem('reloads')||0)+1));
  location.reload();
});
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
(async()=>{
  const registration=await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  if(!navigator.serviceWorker.controller){ await wait(4000); if(!navigator.serviceWorker.controller) throw new Error('old worker did not control page'); }
  const oldController=navigator.serviceWorker.controller;
  const reloads=Number(sessionStorage.getItem('reloads')||0);
  await fetch('/switch',{cache:'no-store'});
  await registration.update();
  for(let attempt=0;attempt<100 && !registration.waiting;attempt++) await wait(100);
  if(!registration.waiting) throw new Error('new worker did not wait');
  await wait(1500);
  if(navigator.serviceWorker.controller!==oldController) throw new Error('controller changed on open page');
  if(Number(sessionStorage.getItem('reloads')||0)!==reloads) throw new Error('open page reloaded');
  document.getElementById('result').textContent='PASS: old open page remains controlled and new worker waits';
})().catch(error=>{document.getElementById('result').textContent='FAIL: '+error.stack;});
</script>`;
const server = http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/switch'){ updated=true; res.end('ok'); return; }
  if(req.url==='/sw.js'){ res.setHeader('Content-Type','application/javascript'); res.end(updated?newWorker:oldWorker); return; }
  if(req.url==='/' || req.url==='/index.html'){ res.setHeader('Content-Type','text/html; charset=utf-8'); res.end(html); return; }
  res.setHeader('Content-Type','text/plain'); res.end('isolated test asset');
});
server.listen(0,'127.0.0.1',()=>{
  const port=server.address().port;
  const proc=child.spawn(edge,['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--user-data-dir='+path.join(directory,'profile'),'--virtual-time-budget=20000','--dump-dom','http://127.0.0.1:'+port+'/'],{windowsHide:true});
  let output='';
  proc.stdout.on('data',chunk=>{output+=chunk;});
  proc.stderr.resume();
  const timeout=setTimeout(()=>proc.kill(),45000);
  proc.on('error',error=>{clearTimeout(timeout); server.close(); console.error(error); process.exitCode=1;});
  proc.on('close',code=>{
    clearTimeout(timeout);
    server.close();
    try{
      assert.equal(code,0);
      assert.match(output,/PASS: old open page remains controlled and new worker waits/);
      console.log('Service-worker upgrade browser checks passed.');
    }catch(error){ console.error(error); process.exitCode=1; }
    try{fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch(error){console.error(error);process.exitCode=1;}
  });
});
