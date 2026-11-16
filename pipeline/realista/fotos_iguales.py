"""Pasa las fotos y el 360° de una unidad a las demás unidades completas con el mismo plano.

Uso: python pipeline/realista/fotos_iguales.py niebla-alta [cenit ...]
Las copias (sameAs) ya heredan; esto cubre las unidades que repiten plano pero describen sus espacios.
"""
import copy
import json
import sys

for slug in sys.argv[1:]:
    hp = f'content/hotels/{slug}/hotel.json'
    h = json.load(open(hp, encoding='utf-8'))
    full = [u for u in h['units'] if 'spaces' in u]

    def has_photos(u):
        return any(m['src'].endswith('.jpg') and '/fotos/' in m['src'] for s in u['spaces'] for m in s['media'])

    n = 0
    for u in full:
        if has_photos(u):
            continue
        src = next((x for x in full if x is not u and x.get('plan') == u.get('plan') and has_photos(x)), None)
        if not src:
            continue
        by_id = {s['id']: s for s in src['spaces']}
        for s in u['spaces']:
            o = by_id.get(s['id'])
            if not o:
                continue
            media = copy.deepcopy(o['media'])
            for m in media:
                m['id'] = m['id'].replace(f"-{src['id']}-", f"-{u['id']}-")
            s['media'] = media
        n += 1
        print(slug, u['id'], '<-', src['id'])
    open(hp, 'w', encoding='utf-8', newline='\n').write(json.dumps(h, ensure_ascii=False, indent=2) + '\n')
    print(slug, n, 'unidades')
