$urls = @(
  @{n='mevcut'; u='https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/Fiat_Fiorino_III_20090808_front.JPG/330px-Fiat_Fiorino_III_20090808_front.JPG'}
)
$out = 'C:\Users\HHP\Desktop\tasarim-onizleme\fiorino-mevcut.jpg'
Invoke-WebRequest -Uri $urls[0].u -OutFile $out -UseBasicParsing -TimeoutSec 15
Write-Host "indirildi: $out"
# Alternatif Fiorino görselleri ara
$api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=Fiat%20Fiorino&gsrlimit=12&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=330'
$r = Invoke-WebRequest -Uri $api -UseBasicParsing -TimeoutSec 20
$j = $r.Content | ConvertFrom-Json
foreach($p in $j.query.pages.PSObject.Properties.Value){
  Write-Host "$($p.title) => $($p.imageinfo[0].thumburl)"
}
