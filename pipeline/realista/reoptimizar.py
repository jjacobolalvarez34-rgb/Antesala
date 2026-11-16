"""
Vuelve a optimizar los GLB realistas ya registrados desde su salida cruda de Blender
(.tmp/realista), sin volver a hornear. Sirve para pasar a KTX2 lo que se horneó con WebP.

Uso: python pipeline/realista/reoptimizar.py [hotel ...]
Busca, para cada content/hotels/<hotel>/media/realista/<nombre>.glb, la salida cruda:
  habitación  .tmp/realista/<hotel>-<nombre>.glb
  planta      .tmp/realista/<hotel>-planta-<n>-horneada.glb
  fachada     .tmp/realista/<hotel>-fachada.glb
Si no hay cruda, la deja como está y lo dice.
"""
import glob
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from optimizar import hay_ktx, optimizar  # noqa: E402


def run(cmd, env=None):
    r = subprocess.run(cmd, shell=True, env=env or os.environ, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        print('  FALLÓ:', cmd[:120], (r.stdout + r.stderr)[-400:])
    return r.returncode == 0


if not hay_ktx():
    sys.exit('Sin toktx (KTX-Software): no hay nada que ganar. Ver docs/CARGA.md §5.')

hoteles = sys.argv[1:] or [os.path.basename(p) for p in glob.glob('content/hotels/*')]
for hotel in hoteles:
    for final in sorted(glob.glob(f'content/hotels/{hotel}/media/realista/*.glb')):
        nombre = os.path.basename(final)[:-4]
        cruda = (
            f'.tmp/realista/{hotel}-{nombre}-horneada.glb' if nombre.startswith('planta-') else f'.tmp/realista/{hotel}-{nombre}.glb'
        )
        if not os.path.exists(cruda):
            print(f'{hotel}/{nombre}: sin salida cruda, queda igual')
            continue
        antes = os.path.getsize(final) // 1024
        # la fachada en atlas comparte una imagen entre todos los pisos: 4096 px (con KTX2, ~11 MB de video)
        if optimizar(cruda, final, run, 4096 if nombre == 'fachada' else 2048):
            print(f'{hotel}/{nombre}: {antes} KB -> {os.path.getsize(final) // 1024} KB (KTX2)')
