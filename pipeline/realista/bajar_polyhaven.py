"""Baja texturas y modelos CC0 de Poly Haven a D:/Herramientas/assets-polyhaven (fuera del repo).
Uso: python pipeline/realista/bajar_polyhaven.py"""
import json
import os
import urllib.request

DEST = 'D:/Herramientas/assets-polyhaven'
TEXTURAS = ['laminate_floor_02', 'beige_wall_001', 'floor_tiles_06', 'marble_01', 'oak_veneer_01', 'rough_linen', 'velour_velvet', 'caban']
MODELOS = ['potted_plant_02', 'potted_plant_04', 'ceramic_vase_01', 'decorative_book_set_01', 'modern_arm_chair_01', 'coffee_table_round_01', 'modern_ceiling_lamp_01']
UA = {'User-Agent': 'antesala-pipeline/1.0'}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()


def save(url, path):
    if os.path.exists(path):
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(get(url))


for t in TEXTURAS:
    files = json.loads(get(f'https://api.polyhaven.com/files/{t}'))
    for mapa, clave in [('Diffuse', 'diff'), ('nor_gl', 'nor'), ('Rough', 'rough')]:
        if mapa in files:
            save(files[mapa]['1k']['jpg']['url'], f'{DEST}/tex/{t}/{clave}.jpg')
    print('textura', t)

for m in MODELOS:
    files = json.loads(get(f'https://api.polyhaven.com/files/{m}'))
    if 'gltf' not in files:
        print('sin gltf, se omite:', m)
        continue
    g = files['gltf']['1k']['gltf']
    base = f'{DEST}/mod/{m}'
    save(g['url'], f'{base}/{m}.gltf')
    for rel, inc in g.get('include', {}).items():
        save(inc['url'], f'{base}/{rel}')
    print('modelo', m)
print('listo en', DEST)
