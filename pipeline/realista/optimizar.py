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
    a, a2, b = dst + '.a.glb', dst + '.a2.glb', dst + '.b.glb'
    # la decoración de Poly Haven (texturas "_1k": plantas, jarrones) mide pocos píxeles en
    # pantalla y el visor solo usa su color: 256 px. Sin esto, KTX2 duplicaba el peso de bajada.
    ok = (
        run(f'{G} resize {src} {a} --width {size} --height {size}', env=env)
        and run(f'{G} resize {a} {a2} --width 256 --height 256 --pattern "*_1k*"', env=env)
        and run(f'{G} etc1s {a2} {b}', env=env)
        # al final, el resto de `optimize` (copias como instancias, simplificar, soldar) con Draco,
        # sin tocar las texturas que ya son KTX2
        and run(f'{G} optimize {b} {dst} --compress draco --texture-compress false', env=env)
    )
    for t in (a, a2, b):
        if os.path.exists(t):
            os.remove(t)
    return ok
