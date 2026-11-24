"""
Fotos y 360° de cada espacio desde la maqueta amoblada en Blender (D-084): por cada unidad tipo,
amoblar.py con FOTOS=1 y SIN_HORNEAR=1 renderiza, desde un punto despejado de cada espacio, un
panorama 360° (2048 × 1024) y dos fotos (amplia y detalle), con techo y luz interior.

Registra en hotel.json: el 360° del espacio (reemplaza el marcador SVG, con el rumbo hacia la
ventana) y las dos fotos (reemplazan los marcadores SVG grises). Las copias (sameAs) las heredan.

Uso (con el build hecho):  python pipeline/realista/lote_fotos.py hotel:unidad [...]
"""
import json
import os
import shutil
import subprocess
import sys
import time

# en otro PC: BLENDER=<ruta a blender.exe> (ver docs/RENDER.md)
BLENDER = os.environ.get('BLENDER', 'D:/Herramientas/blender-5.2.4-windows-x64/blender.exe')
LOG = '.tmp/realista/lote.log'
ENV = {**os.environ, 'PLAYWRIGHT_BROWSERS_PATH': os.environ.get('PLAYWRIGHT_BROWSERS_PATH', r'D:\Repositorios\Prodigia\compilacion\ms-playwright'),
       'TMP': os.path.abspath('.tmp'), 'TEMP': os.path.abspath('.tmp')}
SAMPLES = os.environ.get('MUESTRAS', '48')


def log(*a):
    line = time.strftime('%H:%M:%S ') + ' '.join(str(x) for x in a)
    print(line.encode('ascii', 'replace').decode(), flush=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def run(cmd, env=None):
    r = subprocess.run(cmd, shell=True, env=env or ENV, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        log('  FALLÓ:', cmd[:120], (r.stdout + r.stderr)[-600:])
    return r.returncode == 0


log('=== fotos', sys.argv[1:])
for t in sys.argv[1:]:
    hotel, unidad = t.split(':')
    hjson = f'content/hotels/{hotel}/hotel.json'
    h = json.load(open(hjson, encoding='utf-8'))
    u = next(x for x in h['units'] if x['id'] == unidad)
    if 'sameAs' in u:
        # las copias heredan los espacios (y sus fotos) de la unidad tipo
        log('---', hotel, unidad, f"copia de {u['sameAs']}: usa sus fotos")
        continue
    plan = u['plan']
    nombre = os.path.basename(plan).replace('.svg', '')
    glb = f'.tmp/realista/{hotel}-{unidad}.glb'
    salida = f'.tmp/realista/fotos-{hotel}-{nombre}'
    log('---', hotel, unidad, plan)
    # si la unidad y el plano se llaman igual (los refugios de Frailejón), la salida horneada de
    # lote.py pisa la exportación del visor: se vuelve a exportar siempre
    ancla = f'.tmp/realista/{hotel}-{unidad}-ancla.json'
    contexto = f'.tmp/realista/{hotel}-contexto.glb'
    # sin el ancla (posición de la unidad en el mundo) tampoco hay barrio por la ventana: se exporta
    if not os.path.exists(glb) or unidad == nombre or not os.path.exists(ancla):
        log('  exportando del visor')
        if not run('npx playwright test -c pipeline/renders.config.ts realista/exportar.spec.ts', env={**ENV, 'HOTEL': hotel, 'UNIDAD': unidad}):
            continue
    log(f'  Blender: fotos y 360° ({SAMPLES} muestras)')
    if not run(f'"{BLENDER}" -b -P pipeline/realista/amoblar.py -- {glb} content/hotels/{hotel}/{plan} {salida} {SAMPLES} 1024',
               env={**ENV, 'FOTOS': '1', 'SIN_HORNEAR': '1', 'CONTEXTO': contexto, 'ANCLA': ancla}):
        continue
    info_path = f'{salida}-fotos.json'
    if not os.path.exists(info_path):
        log('  sin fotos')
        continue
    info = json.load(open(info_path, encoding='utf-8'))
    dest = f'content/hotels/{hotel}/media/fotos/{nombre}'
    os.makedirs(dest, exist_ok=True)
    h = json.load(open(hjson, encoding='utf-8'))
    tpl = next(x for x in h['units'] if x['id'] == unidad)
    n = 0
    for s in tpl['spaces']:
        sid = s['id']
        if sid not in info:
            continue
        files = {}
        for k in ('360', 'amplia', 'detalle'):
            src = f'{salida}-{sid}-{k}.jpg'
            if os.path.exists(src):
                shutil.copy(src, f'{dest}/{sid}-{k}.jpg')
                files[k] = f'media/fotos/{nombre}/{sid}-{k}.jpg'
        media = s['media']
        # 360°: reemplaza el marcador (o se agrega), con el rumbo hacia la ventana
        if '360' in files:
            pano = next((m for m in media if m['kind'] == 'pano360'), None)
            if pano is None:
                pano = {'id': f'pano-{unidad}-{sid}', 'kind': 'pano360', 'alt': f"{s['name']} en 360° (imagen ilustrativa)", 'fidelity': 'ilustrativa'}
                media.insert(0, pano)
            # la copia web es de 2048 × 1024 aunque el maestro sea de 8K (docs/CARGA.md §4)
            pw = int(os.environ.get('PANO_WEB', '2048'))
            pano.update({'src': files['360'], 'width': pw, 'height': pw // 2, 'yaw': info[sid]['yaw']})
        # las fotos grises de marcador (media/units/*.svg) se van; entran la amplia y la de detalle
        media[:] = [m for m in media if not (m['kind'] == 'photo' and m['src'].startswith('media/units/') and m['src'].endswith('.svg'))]
        for k, label in (('amplia', 'vista general'), ('detalle', 'detalle')):
            if k in files:
                mid = f'foto-{unidad}-{sid}-{k}'
                media[:] = [m for m in media if m['id'] != mid]
                media.append({'id': mid, 'kind': 'photo', 'src': files[k], 'alt': f"{s['name']}: {label} (imagen ilustrativa)",
                              'fidelity': 'ilustrativa', 'width': 1600, 'height': 1000})
        n += 1
    open(hjson, 'w', encoding='utf-8', newline='\n').write(json.dumps(h, ensure_ascii=False, indent=2) + '\n')
    log(f'  listo: {n} espacios con fotos y 360°')
log('=== fin de las fotos')
