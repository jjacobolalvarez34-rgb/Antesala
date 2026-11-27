"""Catálogo de diseños de la web del hotel (2026-11-26): arma cada plantilla de docs/disenos/ como
una página HTML sola, con las fotos y la disponibilidad de un hotel de content/hotels/.

Las plantillas llevan {{nombre}} donde va cada foto (de media/premium/) y, si la usan, {UNITS_JSON}
con las unidades (id, piso, tipo, precio con el extra por vista, ocupada).

Uso:  python pipeline/catalogo_web.py [hotel]     (por defecto niebla-alta)
Sale: .tmp/catalogo/<plantilla>.html  (se abre directo en el navegador; no se sube al repo)
"""
import base64
import io
import json
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOTEL = sys.argv[1] if len(sys.argv) > 1 else 'niebla-alta'
SRC = os.path.join(ROOT, 'content', 'hotels', HOTEL)
OUT = os.path.join(ROOT, '.tmp', 'catalogo')
os.makedirs(OUT, exist_ok=True)


def photo(name):
    im = Image.open(os.path.join(SRC, 'media', 'premium', name + '.webp')).convert('RGB')
    w = 1100 if name.startswith('fachada') else 820
    im.thumbnail((w, w))
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=66)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


hotel = json.load(open(os.path.join(SRC, 'hotel.json'), encoding='utf-8'))
by = {u['id']: u for u in hotel['units']}
units = []
for u in hotel['units']:
    base = by.get(u.get('sameAs')) or {}
    get = lambda k: u.get(k, base.get(k))
    units.append({'id': u['id'], 'f': int(u['levelId']), 'c': get('categoryId'),
                  'p': get('basePriceCOP') + (u.get('viewPremiumCOP') or 0), 'oc': bool(u.get('occupied'))})

for tpl in sorted(f for f in os.listdir(os.path.join(ROOT, 'docs', 'disenos')) if f.endswith('.tpl.html')):
    s = open(os.path.join(ROOT, 'docs', 'disenos', tpl), encoding='utf-8').read()
    for name in sorted(set(re.findall(r'\{\{([\w-]+)\}\}', s))):
        s = s.replace('{{' + name + '}}', photo(name))
    s = s.replace('{UNITS_JSON}', json.dumps(units, ensure_ascii=False))
    # la página completa, para abrirla directo (las plantillas empiezan en <title>)
    page = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + s + '</html>'
    dst = os.path.join(OUT, tpl.replace('.tpl.html', '.html'))
    open(dst, 'w', encoding='utf-8').write(page)
    print(dst, len(page) // 1024, 'KB')
