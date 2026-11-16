"""
Optimiza un GLB horneado para la web (D-087, docs/CARGA.md §5).

Con KTX-Software instalado (toktx): texturas en KTX2/ETC1S, que quedan comprimidas
dentro de la tarjeta de video (una textura de luz de 2048 px pasa de ~22 MB a ~2,8 MB
en el celular), y geometría con Draco. El orden importa: primero el tamaño, luego
ETC1S y al final Draco (si Draco va antes, ETC1S lo deshace).

Sin toktx (el PC prestado, por ejemplo): WebP + Draco, como antes. El visor lee los dos.

Uso desde los lotes: optimizar(src, dst, run, size=2048)
"""
import os
import shutil

KTX_BIN = os.environ.get('KTX_BIN', 'D:/Herramientas/KTX-Software/bin')
G = 'npx -y @gltf-transform/cli'


def hay_ktx():
    return bool(shutil.which('toktx') or os.path.exists(os.path.join(KTX_BIN, 'toktx.exe')))


def optimizar(src, dst, run, size=2048):
    os.makedirs(os.path.dirname(dst) or '.', exist_ok=True)
    if not hay_ktx() or os.environ.get('SIN_KTX'):
        return run(f'{G} optimize {src} {dst} --compress draco --texture-compress webp --texture-size {size}')
    env = {**os.environ, 'PATH': KTX_BIN + os.pathsep + os.environ.get('PATH', '')}
    a, b = dst + '.a.glb', dst + '.b.glb'
    ok = (
        run(f'{G} resize {src} {a} --width {size} --height {size}', env=env)
        and run(f'{G} etc1s {a} {b}', env=env)
        and run(f'{G} draco {b} {dst}', env=env)
    )
    for t in (a, b):
        if os.path.exists(t):
            os.remove(t)
    return ok
