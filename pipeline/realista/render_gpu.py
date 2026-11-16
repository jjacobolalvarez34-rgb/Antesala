"""
Tarjeta gráfica para Cycles (D-088), compartido por los scripts de Blender.

Con la variable GPU=1, Cycles usa la tarjeta (OptiX en NVIDIA RTX, CUDA en NVIDIA
viejas, HIP en AMD, oneAPI en Intel Arc, Metal en Mac); sin ella, o si no hay
tarjeta compatible, sigue en CPU como siempre. En el T440p no hay GPU útil: no
poner GPU=1 ahí. En el PC prestado, sí (ver docs/RENDER.md).
"""
import os

import bpy


def usar_gpu(sc, log=print):
    if not os.environ.get('GPU'):
        sc.cycles.device = 'CPU'
        return 'CPU'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for tipo in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI', 'METAL'):
        try:
            prefs.compute_device_type = tipo
        except TypeError:
            continue
        prefs.get_devices()
        tarjetas = [d for d in prefs.devices if d.type == tipo]
        if not tarjetas:
            continue
        for d in prefs.devices:
            d.use = d.type == tipo
        sc.cycles.device = 'GPU'
        log('GPU', tipo, ', '.join(d.name for d in tarjetas))
        return tipo
    log('GPU pedida pero no hay tarjeta compatible: sigue en CPU')
    sc.cycles.device = 'CPU'
    return 'CPU'


def hiper():
    """Modo hiperrealista (HIPER=1): más rebotes, sin atajos; para el PC con GPU."""
    return bool(os.environ.get('HIPER'))
