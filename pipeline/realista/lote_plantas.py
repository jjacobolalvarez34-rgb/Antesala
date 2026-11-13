"""
Lote de plantas de piso del 3D realista (D-074): exporta la planta del visor, la amuebla
y hornea en Blender (PLANTA=1: corte a 1,1 m), optimiza y registra `realista` en los
pisos que comparten la misma planta (mismo SVG salvo los números de las unidades).

Uso (con el build hecho):  python pipeline/realista/lote_plantas.py [hotel:piso ...]
Bitácora: .tmp/realista/lote.log
"""
import json
import os
import re
import subprocess
import sys
import time

BLENDER = 'D:/Herramientas/blender-5.2.4-windows-x64/blender.exe'
LOG = '.tmp/realista/lote.log'
os.makedirs('.tmp/realista', exist_ok=True)
ENV = {**os.environ, 'PLAYWRIGHT_BROWSERS_PATH': r'D:\Repositorios\Prodigia\compilacion\ms-playwright',
       'TMP': r'D:\Repositorios\Antesala\.tmp', 'TEMP': r'D:\Repositorios\Antesala\.tmp'}
SAMPLES = os.environ.get('MUESTRAS', '40')
RES = os.environ.get('RES', '3072')


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


def forma(svg_path):
    """La planta sin los números de unidad ni el título: dos pisos iguales dan lo mismo."""
    s = open(svg_path, encoding='utf-8').read()
    s = re.sub(r'<title>.*?</title>', '', s)
    return re.sub(r'"\d0(\d)"', r'"X0\1"', s)


trabajos = sys.argv[1:]
log('=== lote de plantas', trabajos)
for t in trabajos:
    hotel, piso = t.split(':')
    hjson = f'content/hotels/{hotel}/hotel.json'
    h = json.load(open(hjson, encoding='utf-8'))
    level = next(x for x in h['levels'] if x['id'] == piso)
    plan = level['plan']
    glb = f'.tmp/realista/{hotel}-planta-{piso}.glb'
    salida = f'.tmp/realista/{hotel}-planta-{piso}-horneada'
    nombre = f'planta-{piso}'
    final = f'content/hotels/{hotel}/media/realista/{nombre}.glb'
    log('---', hotel, 'piso', piso, plan)

    log('  exportando del visor')
    if not run('npx playwright test -c pipeline/renders.config.ts exportar-planta', env={**ENV, 'HOTEL': hotel, 'PISO': piso}):
        continue
    log(f'  Blender: muebles, render y horneado ({RES} px, {SAMPLES} muestras)')
    if not run(f'"{BLENDER}" -b -P pipeline/realista/amoblar.py -- {glb} content/hotels/{hotel}/{plan} {salida} {SAMPLES} {RES}',
               env={**ENV, 'PLANTA': '1'}):
        continue
    if not os.path.exists(salida + '.glb'):
        log('  sin GLB de salida')
        continue
    log('  optimizando')
    os.makedirs(os.path.dirname(final), exist_ok=True)
    if not run(f'npx -y @gltf-transform/cli optimize {salida}.glb {final} --compress draco --texture-compress webp --texture-size {RES}'):
        continue
    h = json.load(open(hjson, encoding='utf-8'))
    base = forma(f'content/hotels/{hotel}/{plan}')
    n = 0
    for x in h['levels']:
        if x.get('plan') and forma(f'content/hotels/{hotel}/{x["plan"]}') == base:
            x['realista'] = f'media/realista/{nombre}.glb'
            n += 1
    open(hjson, 'w', encoding='utf-8', newline='\n').write(json.dumps(h, ensure_ascii=False, indent=2) + '\n')
    log(f'  listo: {final} ({os.path.getsize(final) // 1024} KB), {n} pisos')
log('=== fin del lote de plantas')
