<?php
/**
 * PEKDOĞRU Filo Paneli — Günlük Otomatik Yedek + E-posta
 * Kurulum: www.pekdogru.com hostinginizde public_html altına yükleyin,
 *          cPanel Cron Jobs'tan her gece 23:00'da çalıştırın.
 *
 * Gerekli:
 *  - PHP 7.4+
 *  - PHP "openssl" ve "curl" eklentileri (cPanel hostinglerde genelde açık)
 *  - Firebase service account key JSON dosyası (Firestore okumak için)
 *  - cPanel'den oluşturulmuş bir e-posta hesabı
 */

// ==================== AYARLAR (SİZ DOLDURACAKSINIZ) ====================
$AYARLAR = [
    // Firebase projesi service account key dosyası
    'firebase_service_account_json' => __DIR__ . '/firebase-service-account.json',

    // Firestore koleksiyon adı (paneldeki veriler bu koleksiyonda tutuluyor)
    'firestore_collection' => 'filoPaneliData',

    // E-posta gönderici (cPanel'de oluşturduğunuz e-posta)
    'mail_from'     => 'yedek@pekdogru.com',
    'mail_from_ad'  => 'Pekdogru Filo Yedek',

    // E-posta alıcısı
    'mail_to'       => 'ORNEK@SIRKET.COM',

    // cPanel SMTP bilgileri (E-posta Hesapları > Ayarlar > Mail Client Manual Settings)
    'smtp_host'     => 'mail.pekdogru.com',
    'smtp_port'     => 465,
    'smtp_user'     => 'yedek@pekdogru.com',
    'smtp_pass'     => 'BURAYA_EPOSTA_SIFRENIZI_YAZIN',
    'smtp_secure'   => 'ssl', // 465 için 'ssl', 587 için 'tls'

    // Yedek dosyası adı
    'dosya_adi'     => 'filo-yedek-' . date('Y-m-d') . '.zip',
];

// ==================== YARDIMCI FONKSİYONLAR ====================

function logYaz($mesaj){
    $satir = '[' . date('Y-m-d H:i:s') . '] ' . $mesaj . PHP_EOL;
    file_put_contents(__DIR__ . '/filo-yedek-cron.log', $satir, FILE_APPEND | LOCK_EX);
    echo $satir;
}

function firebaseJWT($serviceAccountPath){
    $json = json_decode(file_get_contents($serviceAccountPath), true);
    if(!$json || empty($json['client_email']) || empty($json['private_key'])){
        throw new Exception('Firebase service account key okunamadı.');
    }

    $now = time();
    $payload = [
        'iss'   => $json['client_email'],
        'sub'   => $json['client_email'],
        'scope' => 'https://www.googleapis.com/auth/datastore',
        'aud'   => 'https://oauth2.googleapis.com/token',
        'iat'   => $now,
        'exp'   => $now + 3600,
    ];

    $header = json_encode(['alg'=>'RS256','typ'=>'JWT']);
    $body   = json_encode($payload);
    $b64Header = rtrim(strtr(base64_encode($header), '+/', '-_'), '=');
    $b64Body   = rtrim(strtr(base64_encode($body),   '+/', '-_'), '=');
    $imzaHam   = $b64Header . '.' . $b64Body;

    openssl_sign($imzaHam, $imza, $json['private_key'], 'SHA256');
    $b64Imza = rtrim(strtr(base64_encode($imza), '+/', '-_'), '=');

    $jwt = $imzaHam . '.' . $b64Imza;

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion'  => $jwt,
    ]));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $resp = curl_exec($ch);
    $err  = curl_error($ch);
    curl_close($ch);
    if($err) throw new Exception('OAuth isteği hatası: ' . $err);

    $data = json_decode($resp, true);
    if(empty($data['access_token'])){
        throw new Exception('Access token alınamadı: ' . $resp);
    }
    return $data['access_token'];
}

function firestoreOku($token, $projectId, $collection, $docId){
    $url = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents/{$collection}/{$docId}";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $token]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $resp = curl_exec($ch);
    $err  = curl_error($ch);
    curl_close($ch);
    if($err) throw new Exception('Firestore okuma hatası: ' . $err);

    $data = json_decode($resp, true);
    if(empty($data['fields'])){
        return null;
    }
    return firestoreDegerCoz($data['fields']);
}

function firestoreDegerCoz($fields){
    $out = [];
    foreach($fields as $k => $v){
        if(isset($v['stringValue'])){
            $out[$k] = $v['stringValue'];
        }elseif(isset($v['integerValue'])){
            $out[$k] = (int)$v['integerValue'];
        }elseif(isset($v['doubleValue'])){
            $out[$k] = (float)$v['doubleValue'];
        }elseif(isset($v['booleanValue'])){
            $out[$k] = (bool)$v['booleanValue'];
        }elseif(isset($v['arrayValue']['values'])){
            $arr = [];
            foreach($v['arrayValue']['values'] as $item){
                $arr[] = firestoreDegerCoz(['x'=>$item])['x'];
            }
            $out[$k] = $arr;
        }elseif(isset($v['mapValue']['fields'])){
            $out[$k] = firestoreDegerCoz($v['mapValue']['fields']);
        }else{
            $out[$k] = null;
        }
    }
    return $out;
}

function diziToCsv($dizi){
    if(!is_array($dizi) || empty($dizi)) return '';
    $tmp = fopen('php://temp', 'r+');
    // İlk elemanın tüm anahtarlarını başlık yap
    $basliklar = [];
    foreach($dizi as $satir){
        if(is_array($satir)){
            foreach($satir as $k => $v){
                if(!in_array($k, $basliklar, true)) $basliklar[] = $k;
            }
        }
    }
    fputcsv($tmp, $basliklar, ';');
    foreach($dizi as $satir){
        $row = [];
        foreach($basliklar as $k){
            $val = is_array($satir) && array_key_exists($k, $satir) ? $satir[$k] : '';
            if(is_array($val) || is_object($val)) $val = json_encode($val, JSON_UNESCAPED_UNICODE);
            $row[] = $val;
        }
        fputcsv($tmp, $row, ';');
    }
    rewind($tmp);
    $csv = stream_get_contents($tmp);
    fclose($tmp);
    return "\xEF\xBB\xBF" . $csv; // UTF-8 BOM
}

function smtpMailGonder($ayarlar, $konu, $mesajHtml, $ekDosyalar){
    $host = $ayarlar['smtp_host'];
    $port = (int)$ayarlar['smtp_port'];
    $user = $ayarlar['smtp_user'];
    $pass = $ayarlar['smtp_pass'];
    $secure = $ayarlar['smtp_secure'];

    $boundary = md5(uniqid(time(), true));
    $altBoundary = md5(uniqid(time() . 'alt', true));

    $from = $ayarlar['mail_from'];
    $fromAd = $ayarlar['mail_from_ad'];
    $to = $ayarlar['mail_to'];

    $headers = "From: \"" . $fromAd . "\" <" . $from . ">\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"" . $boundary . "\"\r\n";

    $body = "--" . $boundary . "\r\n";
    $body .= "Content-Type: multipart/alternative; boundary=\"" . $altBoundary . "\"\r\n\r\n";

    $body .= "--" . $altBoundary . "\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode(strip_tags($mesajHtml))) . "\r\n";

    $body .= "--" . $altBoundary . "\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($mesajHtml)) . "\r\n";
    $body .= "--" . $altBoundary . "--\r\n\r\n";

    foreach($ekDosyalar as $ad => $icerik){
        $body .= "--" . $boundary . "\r\n";
        $body .= "Content-Type: application/octet-stream; name=\"" . $ad . "\"\r\n";
        $body .= "Content-Disposition: attachment; filename=\"" . $ad . "\"\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body .= chunk_split(base64_encode($icerik)) . "\r\n";
    }

    $body .= "--" . $boundary . "--\r\n";

    $socketContext = [];
    if($secure === 'ssl'){
        $socketContext['ssl'] = [
            'verify_peer' => true,
            'verify_peer_name' => true,
            'allow_self_signed' => false,
        ];
        $connStr = 'ssl://' . $host . ':' . $port;
    }else{
        $connStr = 'tcp://' . $host . ':' . $port;
    }

    $fp = stream_socket_client($connStr, $errno, $errstr, 30, STREAM_CLIENT_CONNECT, stream_context_create($socketContext));
    if(!$fp) throw new Exception("SMTP bağlantı hatası: $errstr ($errno)");

    function smtpTalk($fp, $cmd, $expectedCode){
        if($cmd !== null) fwrite($fp, $cmd . "\r\n");
        $response = '';
        while($line = fgets($fp, 515)){
            $response .= $line;
            if(substr($line, 3, 1) === ' ') break;
        }
        $code = (int)substr($response, 0, 3);
        if($expectedCode && $code !== $expectedCode){
            throw new Exception("SMTP beklenen $expectedCode, gelen: $response");
        }
        return $response;
    }

    smtpTalk($fp, null, 220);
    smtpTalk($fp, 'EHLO ' . gethostname(), 250);
    if($secure === 'tls'){
        smtpTalk($fp, 'STARTTLS', 220);
        stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        smtpTalk($fp, 'EHLO ' . gethostname(), 250);
    }
    smtpTalk($fp, 'AUTH LOGIN', 334);
    smtpTalk($fp, base64_encode($user), 334);
    smtpTalk($fp, base64_encode($pass), 235);
    smtpTalk($fp, 'MAIL FROM:<' . $from . '>', 250);
    smtpTalk($fp, 'RCPT TO:<' . $to . '>', 250);
    smtpTalk($fp, 'DATA', 354);

    $data = "Subject: " . $konu . "\r\n" . $headers . "\r\n" . $body;
    $data = str_replace("\r\n.\r\n", "\r\n..\r\n", $data);
    fwrite($fp, $data . "\r\n.\r\n");
    smtpTalk($fp, null, 250);
    smtpTalk($fp, 'QUIT', 221);
    fclose($fp);
}

// ==================== ANA PROGRAM ====================

try{
    logYaz('Otomatik yedek başladı.');

    if(!file_exists($AYARLAR['firebase_service_account_json'])){
        throw new Exception('Firebase service account key dosyası bulunamadı: ' . $AYARLAR['firebase_service_account_json']);
    }

    $serviceAccount = json_decode(file_get_contents($AYARLAR['firebase_service_account_json']), true);
    $projectId = $serviceAccount['project_id'] ?? '';
    if(!$projectId) throw new Exception('Firebase project_id bulunamadı.');

    $token = firebaseJWT($AYARLAR['firebase_service_account_json']);
    logYaz('Firebase access token alındı.');

    // Paneldeki tüm ana veri anahtarları
    $anahtarlar = ['vehicles','arsiv','arsivSilinenler','customers','rentals','expenses',
                   'sozlesmeler','invoices','payments','ledger','documents','suppliers',
                   'supplierLedger','tires','fuelRecords','tolls','trafficFines',
                   'serviceParts','ihaleler','notifications','activityLog','automationRules',
                   'kvkkTalepleri','sozlesmeGruplari'];

    $zipIcerik = [];
    $ozetSatirlar = [];

    foreach($anahtarlar as $key){
        $doc = firestoreOku($token, $projectId, $AYARLAR['firestore_collection'], $key);
        if(!$doc || !isset($doc['value'])) continue;

        $jsonVeri = $doc['value'];
        $veri = json_decode($jsonVeri, true);
        if(!is_array($veri)) $veri = [];

        $csv = diziToCsv($veri);
        $zipIcerik[$key . '.csv'] = $csv;
        $ozetSatirlar[] = $key . ': ' . count($veri) . ' kayıt';

        // Ham JSON da eklensin (acil durumda geri yüklemek için)
        $zipIcerik[$key . '.json'] = $jsonVeri;
    }

    if(empty($zipIcerik)){
        throw new Exception("Firestore'dan hiç veri okunamadı.");
    }

    // ZIP oluştur
    $zipPath = sys_get_temp_dir() . '/' . $AYARLAR['dosya_adi'];
    $zip = new ZipArchive();
    if($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true){
        throw new Exception('ZIP dosyası oluşturulamadı.');
    }
    foreach($zipIcerik as $ad => $icerik){
        $zip->addFromString($ad, $icerik);
    }
    $zip->close();

    $zipBytes = file_get_contents($zipPath);
    unlink($zipPath);

    logYaz('ZIP yedek hazırlandı (' . round(strlen($zipBytes)/1024) . ' KB).');

    $konu = 'Pekdogru Filo Yedek — ' . date('d.m.Y');
    $mesaj = '<html><body>'
        . '<h3>Pekdoğru Filo Paneli — Günlük Otomatik Yedek</h3>'
        . '<p>Tarih: ' . date('d.m.Y H:i') . '</p>'
        . '<p>Ekteki ZIP dosyası içinde her veri bölümü için CSV ve ham JSON dosyaları vardır. '
        . 'Geri yüklemek isterseniz panelde <b>Ayarlar &gt; Yedekle &gt; JSON Yedekten Yükle</b> menüsünü kullanabilirsiniz.</p>'
        . '<ul><li>' . implode('</li><li>', $ozetSatirlar) . '</li></ul>'
        . '</body></html>';

    smtpMailGonder($AYARLAR, $konu, $mesaj, [$AYARLAR['dosya_adi'] => $zipBytes]);
    logYaz('E-posta gönderildi: ' . $AYARLAR['mail_to']);

}catch(Exception $e){
    logYaz('HATA: ' . $e->getMessage());
    exit(1);
}
