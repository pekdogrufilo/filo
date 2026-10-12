/* PEKDOĞRU GRUP — site eki (v.1)
   Angular derlemesine dokunmadan: yüzen iletişim butonları, faaliyet linkleri,
   teklif navigasyonu ve footer panel bağlantısı ekler. */
(function(){
  'use strict';
  var TEL = '+908508123242';
  var WA  = '908508123242'; // WhatsApp: resmi hat (kendi cep numaranız istenirse değiştirilecek)
  var WA_MSG = encodeURIComponent('Merhaba, filo kiralama hakkında teklif almak istiyorum.');

  /* --- 1) Yüzen iletişim butonları --- */
  function yuzenButonlar(){
    if(document.getElementById('pd-yuzen')) return;
    var w = document.createElement('div');
    w.id = 'pd-yuzen';
    w.innerHTML =
      '<a class="pd-ybtn pd-wa" href="https://wa.me/'+WA+'?text='+WA_MSG+'" target="_blank" rel="noopener" aria-label="WhatsApp">'+
        '<svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.9 1.8.3.2.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2.2 1c.3.2.5.3.6.4.1.2.1.8-.1 1.4z"/></svg>'+
      '</a>'+
      '<a class="pd-ybtn pd-tel" href="tel:'+TEL+'" aria-label="Telefonla ara">'+
        '<svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>'+
      '</a>';
    document.body.appendChild(w);
    var s = document.createElement('style');
    s.textContent =
      '#pd-yuzen{position:fixed;right:16px;bottom:18px;z-index:9999;display:flex;flex-direction:column;gap:10px}'+
      '.pd-ybtn{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.25);transition:transform .2s}'+
      '.pd-ybtn:hover{transform:scale(1.08)}'+
      '.pd-wa{background:#25D366}.pd-tel{background:#0d3d5e}'+
      '@media (max-width:640px){.pd-ybtn{width:50px;height:50px}}';
    document.head.appendChild(s);
  }

  /* --- 2) Faaliyet alanı linklerini gerçek sayfalara bağla --- */
  function faaliyetLinkleri(){
    var map = [
      ['filo hizmetleri',   '/filo-hizmetleri.html'],
      ['2. el',             '/ikinci-el-arac.html'],
      ['lojistik',          '/lojistik.html'],
      ['hayvan',            '/hayvancilik.html'],
      ['toptan',            '/et-satisi.html'],
      ['et sat',            '/et-satisi.html']
    ];
    document.querySelectorAll('a[href="#"]').forEach(function(a){
      var lbl = (a.getAttribute('aria-label')||'').toLocaleLowerCase('tr');
      if(!lbl) return;
      for(var i=0;i<map.length;i++){
        if(lbl.indexOf(map[i][0])!==-1){ a.setAttribute('href', map[i][1]); break; }
      }
    });
  }

  /* --- 3) Menüye "Teklif Al" ekle (masaüstü + mobil) --- */
  function teklifMenu(){
    var nav = document.querySelector('.main-nav ul');
    if(nav && !nav.querySelector('.pd-teklif')){
      var li = document.createElement('li');
      li.innerHTML = '<a class="pd-teklif" href="/teklif.html" style="color:#fff;background:#25D366;border-radius:20px;padding:8px 18px;">Teklif Al</a>';
      nav.appendChild(li);
    }
    var mob = document.querySelector('.mobile-nav ul');
    if(mob && !mob.querySelector('.pd-teklif-m')){
      var li2 = document.createElement('li');
      li2.innerHTML = '<a class="pd-teklif-m" href="/teklif.html" style="display:block;background:#25D366;color:#fff;padding:12px;border-radius:8px;font-weight:600;">Teklif Al</a>';
      mob.appendChild(li2);
    }
  }

  /* --- 4) Footer'a panel giriş linki --- */
  function footerPanel(){
    var fb = document.querySelector('.footer-bottom');
    if(fb && !fb.querySelector('.pd-panel-link')){
      var p = document.createElement('p');
      p.style.marginTop = '8px';
      p.innerHTML = '<a class="pd-panel-link" href="/panel/" style="color:#8fc1e3;text-decoration:none;">Çalışan Paneli Girişi</a>';
      fb.appendChild(p);
    }
  }

  function tumunuCalistir(){
    yuzenButonlar(); faaliyetLinkleri(); teklifMenu(); footerPanel();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tumunuCalistir);
  else tumunuCalistir();
})();
