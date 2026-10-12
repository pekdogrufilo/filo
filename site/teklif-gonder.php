<?php
// PEKDOĞRU GRUP — Kira teklifi formu işleyici (v.1)
// Form verilerini temizler, basit korumalar uygular ve e-posta olarak iletir.

header('Content-Type: text/html; charset=UTF-8');

$KIME   = 'hasan@pekdogru.com';
$KONU_ON = 'WEB TEKLIF';
$GERI   = 'teklif.html';

function temizle($s){
    $s = (string)$s;
    $s = str_replace(array("\r","\n"), ' ', $s);        // header injection engeli
    $s = strip_tags($s);
    $s = mb_substr(trim($s), 0, 300);
    return $s;
}

// Sadece POST kabul
if(($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST'){ header('Location: '.$GERI); exit; }

// Honeypot: gizli alan doluysa bot — sessizce teşekkür edip çık
if(!empty($_POST['gizli_alan'])){ header('Location: '.$GERI.'?ok=1'); exit; }

// Zorunlu alanlar
$ad = temizle($_POST['ad'] ?? '');
$tel = temizle($_POST['telefon'] ?? '');
$tur = temizle($_POST['tur'] ?? '');
if($ad === '' || $tel === '' || $tur === ''){ header('Location: '.$GERI); exit; }

$firma  = temizle($_POST['firma'] ?? '');
$eposta = temizle($_POST['eposta'] ?? '');
$adet   = temizle($_POST['adet'] ?? '');
$sure   = temizle($_POST['sure'] ?? '');
$sehir  = temizle($_POST['sehir'] ?? '');
$mesaj  = strip_tags(trim((string)($_POST['mesaj'] ?? '')));
$mesaj  = mb_substr($mesaj, 0, 1500);

$ip     = $_SERVER['REMOTE_ADDR'] ?? '-';
$tarih  = date('d.m.Y H:i');

$govde = "PEKDOĞRU GRUP — WEB SİTESİNDEN TEKLİF TALEBİ\n"
       . "=================================================\n"
       . "Tarih   : {$tarih}\n"
       . "IP      : {$ip}\n\n"
       . "Ad Soyad: {$ad}\n"
       . "Firma   : {$firma}\n"
       . "Telefon : {$tel}\n"
       . "E-posta : {$eposta}\n"
       . "İhtiyaç : {$tur}\n"
       . "Adet    : {$adet}\n"
       . "Süre    : {$sure}\n"
       . "Şehir   : {$sehir}\n\n"
       . "Mesaj:\n{$mesaj}\n";

$basliklar = "From: PEKDOGRU Web <yedek@pekdogru.com>\r\n"
           . "Reply-To: ".($eposta !== '' ? $eposta : $KIME)."\r\n"
           . "Content-Type: text/plain; charset=UTF-8\r\n";

$gonderildi = @mail($KIME, '=?UTF-8?B?'.base64_encode($KONU_ON.': '.$tur.' - '.$ad).'?=', $govde, $basliklar);

// Ayrıca sunucuya log düş (e-posta başarısız olsa da kayıp olmasın)
@file_put_contents(__DIR__.'/teklif-log.txt',
    "----\n".$tarih." | ".$ad." | ".$tel." | ".$tur."\n".($mesaj !== '' ? $mesaj."\n" : ''),
    FILE_APPEND);

header('Location: '.$GERI.'?ok=1'.($gonderildi ? '' : '&mailfail=1'));
exit;
