"""
Fachada realista de un edificio (D-074): exporta el edificio del visor, hornea la
fachada por piso en Blender (hornear_edificio.py), optimiza y registra
`site.building.realista` en hotel.json.

Uso (con el build hecho):  python pipeline/realista/lote_fachada.py <hotel> [muestras]
Bitácora: .tmp/realista/lote.log
"""
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from optimizar import optimizar  # noqa: E402

# en otro PC: BLENDER=<ruta a blender.exe> (ver docs/RENDER.md)
BLENDER = os.environ.get('BLENDER', 'D:/Herramientas/blender-5.2.4-windows-x64/blender.exe')
LOG = '.tmp/realista/lote.log'
os.makedirs('.tmp/realista', exist_ok=True)
ENV = {**os.environ, 'PLAYWRIGHT_BROWSERS_PATH': os.environ.get('PLAYWRIGHT_BROWSERS_PATH', r'D:\Repositorios\Prodigia\compilacion\ms-playwright'),
       'TMP': os.path.abspath('.tmp'), 'TEMP': os.path.abspath('.tmp')}


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


hotel = sys.argv[1]
samples = sys.argv[2] if len(sys.argv) > 2 else '40'
src = f'.tmp/realista/{hotel}-edificio.glb'
out = f'.tmp/realista/{hotel}-fachada'
final = f'content/hotels/{hotel}/media/realista/fachada.glb'
log('=== fachada', hotel)
log('  exportando del visor')
if not run('npx playwright test -c pipeline/renders.config.ts realista/exportar-edificio.spec.ts', env={**ENV, 'HOTEL': hotel}):
    sys.exit(1)
# sin restos de una corrida anterior: si Blender falla, que se note (pasó con Cénit el 2026-11-16)
if os.path.exists(out + '.glb'):
    os.remove(out + '.glb')
log(f'  Blender: horneado de la fachada en atlas ({samples} muestras, más o menos una hora)')
if not run(f'"{BLENDER}" -b -P pipeline/realista/hornear_edificio.py -- {src} {out} {samples}') or not os.path.exists(out + '.glb'):
    sys.exit(1)
log('  optimizando')
os.makedirs(os.path.dirname(final), exist_ok=True)
# a la web, como dice docs/CARGA.md §4: atlas de 2048 px (el horneado es de 4096 y se reduce:
# sale más limpio que hornear directo a 2048)
if not optimizar(f'{out}.glb', final, run, 2048):
    sys.exit(1)
p = f'content/hotels/{hotel}/hotel.json'
h = json.load(open(p, encoding='utf-8'))
h['site']['building']['realista'] = 'media/realista/fachada.glb'
open(p, 'w', encoding='utf-8', newline='\n').write(json.dumps(h, ensure_ascii=False, indent=2) + '\n')
log(f'  listo: {final} ({os.path.getsize(final) // 1024} KB)')
log('=== fin de la fachada', hotel)
