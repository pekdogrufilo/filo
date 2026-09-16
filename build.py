#!/usr/bin/env python3
"""
PEKDOĞRU Filo Paneli — Build Script v.115
Geliştirme dosyalarından optimize edilmiş dağıtım dosyası üretir.
Kullanım: python3 build.py
Çıktı:  dist/index.html
"""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC  = ROOT / 'index.html'
OUT  = ROOT / 'dist' / 'index.html'

def minify_html(html: str) -> str:
    # HTML yorumlarını kaldır (IE koşullu yorumlar hariç)
    html = re.sub(r'<!--(?!\[if).*?-->', '', html, flags=re.S)
    # Ardışık boş satırları tek satıra indir
    html = re.sub(r'\n\s*\n+', '\n', html)
    # Satır sonu ve tab karakterlerini koruyarak fazla boşlukları tek boşluğa indir
    # (inline JS/CSS'te boşluk gereksiz değilse zarar vermemek için yalnızca HTML seviyesinde)
    html = re.sub(r'>\s+<', '><', html)
    return html.strip()

if __name__ == '__main__':
    html = SRC.read_text(encoding='utf-8')
    minified = minify_html(html)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(minified, encoding='utf-8')
    original = len(html)
    compressed = len(minified)
    print(f'Build tamamlandı: {SRC} ({original:,} B) → {OUT} ({compressed:,} B)')
    print(f'Tasarruf: {original - compressed:,} B (%{round((1 - compressed/original)*100, 1)})')
