// PEKDOĞRU Filo — Otomatik hatırlatma betiği (GitHub Actions sürümü)
// Netlify Scheduled Function yerine GitHub Actions ile günlük çalışır; mantık birebir aynıdır.
// Gereken GitHub Secrets (Repo > Settings > Secrets and variables > Actions > New repository secret):
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY,
//   RESEND_API_KEY, HATIRLATMA_EMAIL (opsiyonel), HATIRLATMA_GONDEREN (opsiyonel),
//   FIREBASE_COLLECTION (opsiyonel)
// Ayrıntılı kurulum: KURULUM-BULUT.md (Bölüm 3)

async function main(){
  const gonderen = process.env.HATIRLATMA_GONDEREN || 'PEKDOĞRU Filo <onboarding@resend.dev>';
  let alici = process.env.HATIRLATMA_EMAIL;
  const ozet = {ok: true, bulutOku: false, acil: 0, gonderildi: false, mesaj: ''};

  try{
    const admin = require('firebase-admin');
    if(!admin.apps.length){
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // GitHub Secrets'ta \n kaybolur; geri düzelt
          privateKey: (process.env.FIREBASE_PRIVATE_KEY||'').replace(/\\n/g, '\n'),
        }),
      });
    }
    const db = admin.firestore();
    const col = db.collection(process.env.FIREBASE_COLLECTION || 'filoPaneliData');

    if(!alici){
      try{
        const rem = await col.doc('reminderEmail').get();
        const deger = rem.exists ? String(rem.data().value || '').trim() : '';
        if(deger){ alici = deger; ozet.aliciKaynak = 'panel'; }
      }catch(e){}
    }
    if(!alici){ ozet.mesaj = 'HATIRLATMA_EMAIL ve panelden girilen hatırlatma e-postası tanımlı değil; e-posta gönderilmedi.'; return bitir(ozet); }

    const vehicles = await chunkluOku(col, 'vehicles');
    if(!vehicles || !vehicles.length){ ozet.mesaj = 'Firestore\'da araç verisi bulunamadı (bulut senkron bağlı mı?).'; return bitir(ozet); }
    ozet.bulutOku = true;

    const bugun = new Date(); bugun.setHours(0,0,0,0);
    const ESIKLER = [30, 7, 1, 0];
    const satirlar = [];
    for(const v of vehicles){
      const kontroller = [
        ['Sigorta', v.sigortaTarihi],
        ['Muayene', v.muayeneTarihi],
        ['Kasko', v.kaskoBitis],
        ['Sözleşme', v.sozlesmeBitis],
      ];
      for(const [tip, tarih] of kontroller){
        if(!tarih) continue;
        const dl = Math.round((new Date(tarih+'T00:00:00') - bugun) / 86400000);
        const esik = dl < 0 ? -1 : (ESIKLER.includes(dl) ? dl : null);
        if(esik === null) continue;
        satirlar.push({plaka: v.plaka||'—', tip, tarih, dl, key: `${v.plaka}|${tip}|${tarih}|${esik}`});
      }
    }
    ozet.acil = satirlar.length;
    if(!satirlar.length){ ozet.mesaj = 'Yaklaşan/geçmiş belge yok; e-posta gerekmedi.'; return bitir(ozet); }

    const logRef = col.doc('_hatirlatmaLog');
    const logDoc = await logRef.get();
    const log = (logDoc.exists && logDoc.data() && logDoc.data().gonderilen) || {};
    const yeni = satirlar.filter(s=>{
      const onceki = log[s.key];
      if(onceki && (Date.now() - new Date(onceki).getTime()) < 40*86400000) return false;
      return true;
    });
    if(!yeni.length){ ozet.mesaj = 'Acil belge var ama tümüne yakın zamanda bildirim gönderilmiş.'; return bitir(ozet); }

    const satirHtml = yeni.map(s=>{
      const renk = s.dl < 0 ? '#DC2626' : (s.dl <= 7 ? '#D97706' : '#2563EB');
      const durum = s.dl < 0 ? `${Math.abs(s.dl)} gün GECTI` : (s.dl === 0 ? 'BUGÜN bitiyor' : `${s.dl} gün kaldı`);
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:700;">${s.plaka}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${s.tip}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${tarihTr(s.tarih)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;color:${renk};font-weight:700;">${durum}</td>
      </tr>`;
    }).join('');
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1D1D1F;">📋 Filo Belge Hatırlatması</h2>
        <p>${yeni.length} adet belge süresi yaklaşıyor veya geçmiş:</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr style="background:#f5f5f7;"><th style="padding:8px 10px;text-align:left;">Plaka</th><th style="padding:8px 10px;text-align:left;">Belge</th><th style="padding:8px 10px;text-align:left;">Bitiş</th><th style="padding:8px 10px;text-align:left;">Durum</th></tr>
          ${satirHtml}
        </table>
        <p style="color:#888;font-size:12px;margin-top:16px;">Bu otomatik bir bildirimdir — PEKDOĞRU Filo Kontrol Paneli.</p>
      </div>`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({ from: gonderen, to: [alici], subject: `📋 Filo hatırlatma: ${yeni.length} belge için işlem gerekli`, html }),
    });
    if(!res.ok){
      const hata = await res.text();
      ozet.ok = false; ozet.mesaj = 'E-posta gönderilemedi: '+hata.slice(0,200);
      return bitir(ozet);
    }

    for(const s of yeni) log[s.key] = new Date().toISOString();
    await logRef.set({gonderilen: log}, {merge:true});

    ozet.gonderildi = true;
    ozet.mesaj = `${yeni.length} hatırlatma içeren e-posta ${alici} adresine gönderildi.`;
    return bitir(ozet);
  }catch(e){
    ozet.ok = false; ozet.mesaj = 'Hata: '+(e.message||e);
    return bitir(ozet);
  }
}

async function chunkluOku(col, key){
  const doc = await col.doc(key).get();
  if(!doc.exists) return null;
  const d = doc.data();
  let raw = '';
  if(d.chunked){
    for(let i=0;i<(d.count||0);i++){
      const c = await col.doc(`${key}__chunk_${i}`).get();
      raw += c.exists ? (c.data().value||'') : '';
    }
  }else raw = d.value || '';
  try{ return JSON.parse(raw); }catch(e){ return null; }
}
function tarihTr(iso){ const p=String(iso||'').split('-'); return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:iso; }
function bitir(ozet){
  console.log(JSON.stringify(ozet, null, 2));
  process.exitCode = ozet.ok === false ? 1 : 0;
}

main();
