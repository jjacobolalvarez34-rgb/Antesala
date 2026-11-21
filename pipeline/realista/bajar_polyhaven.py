"""Baja texturas y modelos CC0 de Poly Haven a D:/Herramientas/assets-polyhaven (fuera del repo).
Uso: python pipeline/realista/bajar_polyhaven.py"""
import json
import os
import urllib.request

DEST = os.environ.get('POLYHAVEN', 'D:/Herramientas/assets-polyhaven')
TEXTURAS = ['laminate_floor_02', 'beige_wall_001', 'floor_tiles_06', 'marble_01', 'oak_veneer_01', 'rough_linen', 'velour_velvet', 'caban']
MODELOS = ['potted_plant_02', 'potted_plant_04', 'ceramic_vase_01', 'decorative_book_set_01', 'modern_arm_chair_01', 'coffee_table_round_01', 'modern_ceiling_lamp_01',
           # muebles con forma (mejora hiperrealista): los modernos de Poly Haven por tipo de mueble
           'modern_wooden_cabinet', 'wooden_display_shelves_01', 'side_table_01', 'throw_pillows_01', 'ceramic_vase_02', 'ceramic_vase_03']
# cielo real que se ve por las ventanas y alumbra la escena (4K: nítido en la ventana, sin pesar)
HDRIS = ['kloofendal_48d_partly_cloudy_puresky']
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
    # material completo a 2K (color, rugosidad, normal y relieve) para las fotos hiperrealistas;
    # amoblar.py usa el de 2K si está y si no el de 1K
    for mapa, clave in [('Diffuse', 'diff'), ('nor_gl', 'nor'), ('Rough', 'rough'), ('Displacement', 'disp')]:
        if mapa in files and '2k' in files[mapa]:
            save(files[mapa]['2k']['jpg']['url'], f'{DEST}/tex/{t}/{clave}_2k.jpg')
    print('textura', t)

for hd in HDRIS:
    files = json.loads(get(f'https://api.polyhaven.com/files/{hd}'))
    save(files['hdri']['4k']['hdr']['url'], f'{DEST}/hdri/{hd}_4k.hdr')
    print('cielo', hd)

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
