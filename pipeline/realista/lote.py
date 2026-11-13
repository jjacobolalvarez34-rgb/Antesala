"""
Lote del 3D realista (D-074): todas las unidades tipo, de punta a punta.
Exporta del visor, amuebla y hornea en Blender, optimiza (Draco + WebP) y registra
`realista` en hotel.json para todas las unidades que comparten el plano.

Uso (con el build hecho):  python pipeline/realista/lote.py [hotel:unidad ...]
Bitácora: .tmp/realista/lote.log
"""
import json
import os
import subprocess
import sys
import time

BLENDER = 'D:/Herramientas/blender-5.2.4-windows-x64/blender.exe'
TODAS = ['niebla-alta:402', 'niebla-alta:201', 'niebla-alta:601', 'akuare:101', 'akuare:102']
LOG = '.tmp/realista/lote.log'
os.makedirs('.tmp/realista', exist_ok=True)
ENV = {**os.environ, 'PLAYWRIGHT_BROWSERS_PATH': r'D:\Repositorios\Prodigia\compilacion\ms-playwright',
       'TMP': r'D:\Repositorios\Antesala\.tmp', 'TEMP': r'D:\Repositorios\Antesala\.tmp'}


def log(*a):
    line = time.strftime('%H:%M:%S ') + ' '.join(str(x) for x in a)
    print(line, flush=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def run(cmd, env=None):
    r = subprocess.run(cmd, shell=True, env=env or ENV, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        log('  FALLÓ:', cmd[:120], (r.stdout + r.stderr)[-600:])
    return r.returncode == 0


trabajos = sys.argv[1:] or TODAS
log('=== lote', trabajos)
for t in trabajos:
    hotel, unidad = t.split(':')
    hjson = f'content/hotels/{hotel}/hotel.json'
    h = json.load(open(hjson, encoding='utf-8'))
    u = next(x for x in h['units'] if x['id'] == unidad)
    plan = u['plan']
    nombre = os.path.basename(plan).replace('.svg', '')
    glb = f'.tmp/realista/{hotel}-{unidad}.glb'
    salida = f'.tmp/realista/{hotel}-{nombre}'
    final = f'content/hotels/{hotel}/media/realista/{nombre}.glb'
    log('---', hotel, unidad, plan)

    log('  exportando del visor')
    if not run(f'npx playwright test -c pipeline/renders.config.ts exportar', env={**ENV, 'HOTEL': hotel, 'UNIDAD': unidad}):
        continue
    log('  Blender: muebles, render y horneado (unos 20 min)')
    if not run(f'"{BLENDER}" -b -P pipeline/realista/amoblar.py -- {glb} content/hotels/{hotel}/{plan} {salida} 48 2048'):
        continue
    if not os.path.exists(salida + '.glb'):
        log('  sin GLB de salida')
        continue
    log('  optimizando')
    os.makedirs(os.path.dirname(final), exist_ok=True)
    if not run(f'npx -y @gltf-transform/cli optimize {salida}.glb {final} --compress draco --texture-compress webp --texture-size 2048'):
        continue
    h = json.load(open(hjson, encoding='utf-8'))
    n = 0
    for x in h['units']:
        if x.get('plan') == plan and 'sameAs' not in x:
            x['realista'] = f'media/realista/{nombre}.glb'
            n += 1
    open(hjson, 'w', encoding='utf-8', newline='\n').write(json.dumps(h, ensure_ascii=False, indent=2) + '\n')
    log(f'  listo: {final} ({os.path.getsize(final) // 1024} KB), {n} unidades')
log('=== fin del lote')
