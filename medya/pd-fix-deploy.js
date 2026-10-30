/* Pekdogru Filo - icerik/gorsel duzeltmeleri v1 */
(function () {
  'use strict';
  var n = 0;
  function cardOf(img) {
    var el = img;
    for (var k = 0; k < 8 && el; k++) {
      el = el.parentElement;
      if (el && String(el.className).indexOf('rounded-sm') !== -1) return el;
    }
    return null;
  }
  function setTextIn(root, oldTxt, newTxt) {
    var els = root.querySelectorAll('h3, p, div, span');
    for (var i = 0; i < els.length; i++) {
      if (els[i].children.length === 0 && els[i].textContent.trim() === oldTxt) {
        els[i].textContent = newTxt;
        return true;
      }
    }
    return false;
  }
  function replaceTextEverywhere(oldTxt, newTxt) {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var hits = [];
    while (w.nextNode()) {
      if (w.currentNode.textContent.indexOf(oldTxt) !== -1) hits.push(w.currentNode);
    }
    for (var i = 0; i < hits.length; i++) {
      hits[i].textContent = hits[i].textContent.split(oldTxt).join(newTxt);
    }
    return hits.length;
  }

  var t = setInterval(function () {
    n++;
    try {
      /* --- HERO: gercek filo fotosu, logo karti kaldirildi, marka metni --- */
      var heroImg = document.querySelector('section[class*="min-h"] img[src="/assets/images/filo.webp"]');
      if (heroImg) {
        heroImg.src = '/assets/login-filo.jpg';
        heroImg.style.opacity = '.5';
        heroImg.alt = 'Pekdo\u011fru filo ara\u00e7lar\u0131 g\u00fcn bat\u0131m\u0131nda \u2014 Konya ara\u00e7 kiralama filosu';
      }
      var heroSection = document.querySelector('section[class*="min-h"]');
      if (heroSection) {
        var logoCard = heroSection.querySelector(':scope > .container-x > div');
        if (logoCard && logoCard.querySelector('img[src*="logo.png"]') && String(logoCard.className).indexOf('inline-flex') !== -1) {
          logoCard.remove();
        }
        var eb = heroSection.querySelectorAll('p');
        for (var i = 0; i < eb.length; i++) {
          if (eb[i].children.length === 0 && eb[i].textContent.indexOf('\u015eirketler Grubu \u00b7 Konya') !== -1) {
            eb[i].textContent = 'Pekdo\u011fru Filo \u00b7 Konya';
          }
        }
      }

      /* --- FLO VITRINI: is makinesi + yedek binek karti kaldirilir, gorseller gercek filo fotolari --- */
      var ism = document.querySelector('img[src*="ismakine"]');
      if (ism) { var c = cardOf(ism); if (c) c.remove(); }
      var altbinek = document.querySelector('img[src*="binek2.webp"]');
      if (altbinek) { var c2 = cardOf(altbinek); if (c2) c2.remove(); }
      var kamyon = document.querySelector('img[src*="/images/filo.webp"]');
      if (kamyon) { var c3 = cardOf(kamyon); if (c3) c3.remove(); }

      var megane = document.querySelector('img[src*="MEGANE.webp"]');
      if (megane) {
        megane.src = '/assets/konya-egea-filo.jpg';
        megane.alt = 'Pekdo\u011fru filo kiralama \u2014 Fiat Egea binek ara\u00e7 filosu, Konya';
        var mc = cardOf(megane);
        if (mc) setTextIn(mc, 'Renault Megane Sedan', 'Fiat Egea Sedan');
      }
      var binek = document.querySelector('img[src*="/binek.webp"]');
      if (binek) {
        binek.src = '/assets/konya-kurumsal-filo-2.jpg';
        binek.alt = 'Pekdo\u011fru kurumsal binek ara\u00e7 filosu \u2014 Konya';
        var bc = cardOf(binek);
        if (bc) setTextIn(bc, 'C segmenti alternatif binek ara\u00e7lar', 'Renault Megane, Ford Puma ve VW Passat se\u00e7enekleriyle');
      }
      var ticari = document.querySelector('img[src*="/ticari.webp"]');
      if (ticari) {
        ticari.src = '/assets/konya-doblo-filo-2.jpg';
        ticari.alt = 'Pekdo\u011fru ticari ara\u00e7 kiralama \u2014 Ford Courier ve Fiat Doblo filosu, Konya';
        var tc = cardOf(ticari);
        if (tc) setTextIn(tc, 'Kamyonet ve hafif ticari ara\u00e7lar', 'Ford Transit, Ford Courier ve \u00e7\u0131t kabinli ara\u00e7lar');
      }

      /* --- KURUMSAL: el-kalkan stok gorseli yerine gercek filo drone fotosu; kalan quality.webp = deger karti --- */
      var qs = document.querySelectorAll('img[src*="/images/quality.webp"]');
      for (var q = 0; q < qs.length; q++) {
        if (String(qs[q].className).indexOf('max-h-[380px]') !== -1) {
          qs[q].src = '/assets/konya-filo-dron-ust.jpg';
          qs[q].alt = 'Pekdo\u011fru filo park\u0131 drone g\u00f6r\u00fcnt\u00fcs\u00fc \u2014 Konya';
        } else {
          var vcard = qs[q];
          for (var k3 = 0; k3 < 5 && vcard; k3++) {
            vcard = vcard.parentElement;
            if (vcard && String(vcard.className).indexOf('border') !== -1) break;
          }
          if (vcard) vcard.classList.add('pd-val');
          qs[q].remove();
        }
      }

      /* --- TEMEL ILKELERI: stok fotolar kaldirilir, temiz tipografik kart --- */
      var valImgs = document.querySelectorAll('img[src*="/images/quality2.webp"], img[src*="/images/focus.webp"], img[src*="/images/operation.webp"], img[src*="/images/ethics.webp"]');
      for (var v = 0; v < valImgs.length; v++) {
        var vc = valImgs[v].closest('div');
        var card = valImgs[v];
        for (var k2 = 0; k2 < 5 && card; k2++) {
          card = card.parentElement;
          if (card && String(card.className).indexOf('border') !== -1) break;
        }
        if (card) card.classList.add('pd-val');
        valImgs[v].remove();
      }

      /* --- FAALIYET: is makinesi ifadesi kaldirilir; ilk kart gorseli gercek filo fotosu --- */
      replaceTextEverywhere('Binek, ticari ara\u00e7 ve i\u015f makinesi kiralamas\u0131nda', 'Binek ve ticari ara\u00e7 kiralamada');
      var fs = document.querySelector('img[src*="/images/filoservices.webp"]');
      if (fs) {
        fs.src = '/assets/konya-filo-kiralama-filosu.jpg';
        fs.alt = 'Pekdo\u011fru filo kiralama \u2014 Konya filo park\u0131';
      }

      /* --- NAVBAR markasi: PEKDOGRU FLO --- */
      var navSpans = document.querySelectorAll('header span, header div, header a');
      for (var s = 0; s < navSpans.length; s++) {
        if (navSpans[s].children.length === 0 && navSpans[s].textContent.trim() === '\u015eirketler Grubu') {
          navSpans[s].textContent = 'Filo';
        }
      }
    } catch (e) { /* sessiz */ }
    if (n > 150) clearInterval(t);
  }, 200);
})();
