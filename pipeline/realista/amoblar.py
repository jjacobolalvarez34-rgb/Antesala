"""
3D realista (D-074), paso 2: la maqueta de una unidad con muebles y texturas reales.

- Muros y pisos: del GLB que exporta el visor (?export=1, unidad en el origen).
- Muebles: se leen del SVG del plano (data-item, data-back) y cada caja se
  reemplaza por un mueble moderno armado aquí (camas, sofás, sillas, mesas,
  cocina, baño) o por un modelo CC0 de Poly Haven (plantas, poltrona, florero).
- Texturas fotográficas CC0 de Poly Haven (bajar_polyhaven.py).
- Render de muestra, horneado de luz en una textura y GLB para el visor.

Uso:
  blender.exe -b -P pipeline/realista/amoblar.py -- <unidad.glb> <plano.svg> <salida> [muestras] [res]
"""
import math
import os
import sys
import time
import xml.etree.ElementTree as ET

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, SVG, OUT = argv[0], argv[1], argv[2]
SAMPLES = int(argv[3]) if len(argv) > 3 else 64
RES = int(argv[4]) if len(argv) > 4 else 2048
A = 'D:/Herramientas/assets-polyhaven'
HDRI = os.path.abspath('public/visor/env/dia.hdr')
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
T0 = time.time()
# escena limpia antes de crear materiales (si no, el reinicio los borra)
bpy.ops.wm.read_factory_settings(use_empty=True)


def log(*a):
    print(f'[amoblar {time.time() - T0:6.1f}s]', *a, flush=True)


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


# ---------------------------------------------------------------- materiales
def texmat(name, folder, size_m, tint=None, rough_mult=1.0, normal=0.6):
    """Material PBR con texturas de Poly Haven en proyección de caja (sin depender de UVs)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    n = nt.nodes
    b = n['Principled BSDF']
    tc = n.new('ShaderNodeTexCoord')
    mp = n.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / size_m, 1 / size_m, 1 / size_m)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])

    def img(file, color):
        path = f'{A}/tex/{folder}/{file}.jpg'
        if not os.path.exists(path):
            return None
        t = n.new('ShaderNodeTexImage')
        t.image = bpy.data.images.load(path, check_existing=True)
        t.image.colorspace_settings.name = 'sRGB' if color else 'Non-Color'
        t.projection = 'BOX'
        t.projection_blend = 0.25
        nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
        return t

    d = img('diff', True)
    if d:
        if tint:
            # la textura trae su propio color (lino azulado, terciopelo rojo): primero a gris, luego el tono
            hs = n.new('ShaderNodeHueSaturation')
            hs.inputs['Saturation'].default_value = 0.0
            nt.links.new(d.outputs['Color'], hs.inputs['Color'])
            mix = n.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1.0
            nt.links.new(hs.outputs['Color'], mix.inputs['A'])
            mix.inputs['B'].default_value = (*srgb(tint), 1)
            nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
        else:
            nt.links.new(d.outputs['Color'], b.inputs['Base Color'])
    r = img('rough', False)
    if r:
        mm = n.new('ShaderNodeMath')
        mm.operation = 'MULTIPLY'
        mm.inputs[1].default_value = rough_mult
        nt.links.new(r.outputs['Color'], mm.inputs[0])
        nt.links.new(mm.outputs['Value'], b.inputs['Roughness'])
    nm = img('nor', False)
    if nm:
        nmap = n.new('ShaderNodeNormalMap')
        nmap.inputs['Strength'].default_value = normal
        nt.links.new(nm.outputs['Color'], nmap.inputs['Color'])
        nt.links.new(nmap.outputs['Normal'], b.inputs['Normal'])
    return m


def plain(name, color, rough=0.5, metal=0.0, trans=0.0, emit=None, emit_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(color), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if trans:
        b.inputs['Transmission Weight'].default_value = trans
    if emit:
        b.inputs['Emission Color'].default_value = (*srgb(emit), 1)
        b.inputs['Emission Strength'].default_value = emit_strength
    return m


M = {
    'muro': texmat('muro', 'beige_wall_001', 2.0, tint='#fbf8f2', rough_mult=1.0, normal=0.25),
    'madera_piso': texmat('madera_piso', 'laminate_floor_02', 2.4, normal=0.4),
    'baldosa': texmat('baldosa', 'marble_01', 0.9, tint='#f4f1ec', rough_mult=0.7, normal=0.15),
    'roble': texmat('roble', 'oak_veneer_01', 1.2, rough_mult=0.9, normal=0.3),
    'marmol': texmat('marmol', 'marble_01', 1.4, rough_mult=0.6, normal=0.2),
    'lino_claro': texmat('lino_claro', 'rough_linen', 0.5, tint='#f6f3ee', normal=0.5),
    'lino_sofa': texmat('lino_sofa', 'rough_linen', 0.5, tint='#c9bca9', normal=0.6),
    'terciopelo': texmat('terciopelo', 'velour_velvet', 0.4, tint='#7d8c78', normal=0.5),
    'lana': texmat('lana', 'caban', 0.8, tint='#e2d8c8', normal=0.7),
    'ceramica': plain('ceramica', '#f6f5f2', 0.12),
    'metal': plain('metal', '#2b2926', 0.35, metal=1.0),
    'aluminio': plain('aluminio', '#9a9a95', 0.3, metal=1.0),
    'laton': plain('laton', '#b08d57', 0.3, metal=1.0),
    'vidrio': plain('vidrio', '#e6f0f0', 0.02, trans=1.0),
    'espejo': plain('espejo', '#d8dcdc', 0.02, metal=1.0),
    'blanco_mate': plain('blanco_mate', '#efece6', 0.45),
    'pantalla': plain('pantalla', '#f4e7cf', 0.8, emit='#ffd9a0', emit_strength=2.5),
}


# ---------------------------------------------------------------- importación
bpy.ops.import_scene.gltf(filepath=os.path.abspath(SRC))
KEEP = ('muros', 'piso-', 'puertas', 'vidrio', 'baranda')
for o in list(bpy.context.scene.objects):
    if o.type != 'MESH':
        continue
    names = [s.material.name if s.material else '' for s in o.material_slots]
    if not any(n.startswith(KEEP) for n in names):
        bpy.data.objects.remove(o, do_unlink=True)  # muebles de caja, cielo raso, sombra
        continue
    for s in o.material_slots:
        n = s.material.name if s.material else ''
        if n.startswith('muros'):
            s.material = M['muro']
        elif n.startswith('piso-tile'):
            s.material = M['baldosa']
        elif n.startswith('piso-'):
            s.material = M['madera_piso']
        elif n.startswith('puertas'):
            s.material = M['roble']
        elif n.startswith('vidrio'):
            s.material = M['vidrio']
        elif n.startswith('baranda'):
            s.material = M['aluminio']
log('muros y pisos', len([o for o in bpy.context.scene.objects if o.type == 'MESH']))

# ---------------------------------------------------------------- plano
root = ET.parse(SVG).getroot()
vb = [float(x) for x in root.get('viewBox').split()]
PW, PH = vb[2] * 0.01, vb[3] * 0.01


def rects(group):
    out = []
    for g in root.iter():
        if g.tag.endswith('g') and g.get('id') == group:
            for r in g.iter():
                if r.tag.endswith('rect'):
                    x, y = float(r.get('x')) * 0.01, float(r.get('y')) * 0.01
                    w, h = float(r.get('width')) * 0.01, float(r.get('height')) * 0.01
                    out.append({
                        'item': r.get('data-item'), 'back': r.get('data-back'),
                        'cx': x + w / 2 - PW / 2, 'cy': -(y + h / 2 - PH / 2), 'sx': w, 'sy': h,
                    })
    return out


WALLS = rects('walls')
FURN = rects('furniture')


def wall_dist(px, py):
    best = 1e9
    for w in WALLS:
        dx = max(abs(px - w['cx']) - w['sx'] / 2, 0)
        dy = max(abs(py - w['cy']) - w['sy'] / 2, 0)
        best = min(best, math.hypot(dx, dy))
    return best


def back_side(f, sides):
    if f['back'] in ('n', 's', 'e', 'w'):
        return f['back']
    mids = {'n': (f['cx'], f['cy'] + f['sy'] / 2), 's': (f['cx'], f['cy'] - f['sy'] / 2),
            'e': (f['cx'] + f['sx'] / 2, f['cy']), 'w': (f['cx'] - f['sx'] / 2, f['cy'])}
    return min(sides, key=lambda s: wall_dist(*mids[s]))


def long_sides(f):
    return ['n', 's'] if f['sx'] >= f['sy'] else ['e', 'w']


def short_sides(f):
    return ['e', 'w'] if f['sx'] >= f['sy'] else ['n', 's']


ROT = {'n': 0.0, 's': math.pi, 'e': -math.pi / 2, 'w': math.pi / 2}


# ---------------------------------------------------------------- primitivas (marco local: atrás = +Y)
PARTS = []


def _finish(o, mat, bevel):
    o.data.materials.append(mat)
    if bevel > 0:
        mod = o.modifiers.new('bisel', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = 'ANGLE'
    PARTS.append(o)
    return o


def box(x, y, z, sx, sy, sz, mat, bevel=0.008):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + sz / 2))
    o = bpy.context.active_object
    o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    return _finish(o, mat, min(bevel, sx / 3, sy / 3, sz / 3))


def cyl(x, y, z, r, h, mat, verts=28, bevel=0.004):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(x, y, z + h / 2))
    o = bpy.context.active_object
    return _finish(o, mat, min(bevel, r / 3, h / 3))


def legs(L, D, h, mat, inset=0.04, r=0.018):
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl(sx * (L / 2 - inset), sy * (D / 2 - inset), 0, r, h, mat, verts=12)


# ---------------------------------------------------------------- muebles
def bed(L, D):
    box(0, 0, 0.05, L, D, 0.25, M['roble'], 0.02)
    box(0, -0.02, 0.30, L - 0.05, D - 0.08, 0.22, M['lino_claro'], 0.05)
    box(0, -D * 0.12, 0.50, L + 0.02, D * 0.72, 0.07, M['lino_claro'], 0.035)  # edredón
    box(0, -D / 2 + 0.28, 0.565, L + 0.03, 0.42, 0.025, M['terciopelo'], 0.01)  # pie de cama
    n = 2 if L > 1.3 else 1
    for i in range(n):
        x = (i - (n - 1) / 2) * (L / n)
        box(x, D / 2 - 0.30, 0.52, L / n - 0.12, 0.34, 0.15, M['lino_claro'], 0.06)
    box(0, D / 2 - 0.04, 0.05, L + 0.08, 0.08, 1.05, M['terciopelo'], 0.025)  # cabecero


def nightstand(L, D):
    box(0, 0, 0.0, L, D, 0.5, M['roble'], 0.01)
    box(0, -D / 2 + 0.005, 0.30, L - 0.05, 0.01, 0.002, M['metal'], 0)
    cyl(0, 0.03, 0.5, 0.06, 0.03, M['laton'])
    cyl(0, 0.03, 0.53, 0.012, 0.22, M['laton'])
    cyl(0, 0.03, 0.70, 0.11, 0.17, M['pantalla'], verts=32)


def desk(L, D):
    box(0, 0, 0.72, L, D, 0.035, M['roble'], 0.006)
    legs(L, D, 0.72, M['metal'], r=0.012)


def table(L, D):
    if abs(L - D) < 0.15 and L < 0.8:
        cyl(0, 0, 0.72, L / 2, 0.035, M['roble'], verts=40)
        cyl(0, 0, 0.0, 0.03, 0.72, M['metal'], verts=12)
        cyl(0, 0, 0.0, L / 4, 0.02, M['metal'], verts=24)
    else:
        box(0, 0, 0.72, L, D, 0.04, M['roble'], 0.008)
        legs(L, D, 0.72, M['roble'], inset=0.06, r=0.022)
    cyl(0.1, 0.05, 0.76, 0.05, 0.18, M['ceramica'])  # florero


def coffee(L, D):
    box(0, 0, 0.30, L, D, 0.05, M['marmol'], 0.012)
    box(0, 0, 0.0, L - 0.12, D - 0.12, 0.30, M['roble'], 0.01)
    for i in range(3):
        box(-L * 0.18, -D * 0.12 + i * 0.0, 0.35 + i * 0.03, 0.22, 0.16, 0.028, M[('terciopelo', 'lino_claro', 'roble')[i]], 0.003)


def chair(L, D):
    box(0, 0, 0.44, L * 0.9, D * 0.88, 0.07, M['lino_sofa'], 0.025)
    box(0, D / 2 - 0.04, 0.48, L * 0.86, 0.05, 0.40, M['lino_sofa'], 0.02)
    legs(L * 0.85, D * 0.85, 0.44, M['roble'], inset=0.03, r=0.014)


def sofa(L, D):
    box(0, 0, 0.08, L, D, 0.24, M['lino_sofa'], 0.03)
    arm = 0.16
    for s in (-1, 1):
        box(s * (L / 2 - arm / 2), 0, 0.08, arm, D, 0.50, M['lino_sofa'], 0.05)
    box(0, D / 2 - 0.10, 0.32, L - 2 * arm, 0.20, 0.42, M['lino_sofa'], 0.06)
    n = max(1, round((L - 2 * arm) / 0.75))
    w = (L - 2 * arm) / n
    for i in range(n):
        x = -L / 2 + arm + w / 2 + i * w
        box(x, -0.08, 0.32, w - 0.02, D - 0.32, 0.13, M['lino_sofa'], 0.05)
        box(x, D / 2 - 0.26, 0.42, w - 0.08, 0.16, 0.36, M['lino_sofa'], 0.07)
    box(-L / 2 + arm + 0.25, D / 2 - 0.36, 0.46, 0.38, 0.12, 0.34, M['terciopelo'], 0.06)
    for s in (-1, 1):
        cyl(s * (L / 2 - 0.08), D / 2 - 0.08, 0, 0.018, 0.08, M['metal'], verts=10)
        cyl(s * (L / 2 - 0.08), -D / 2 + 0.08, 0, 0.018, 0.08, M['metal'], verts=10)


def wardrobe(L, D):
    box(0, 0, 0, L, D, 2.2, M['roble'], 0.006)
    n = max(1, round(L / 0.5))
    for i in range(1, n):
        x = -L / 2 + i * L / n
        box(x, -D / 2 - 0.001, 0.02, 0.006, 0.004, 2.16, M['metal'], 0)
    for i in range(n):
        x = -L / 2 + (i + 0.5) * L / n
        box(x + (0.15 if i % 2 else -0.15) * min(1, L / n), -D / 2 - 0.01, 1.0, 0.012, 0.02, 0.25, M['laton'], 0)


def counter(L, D):
    box(0, 0.01, 0.1, L, D - 0.02, 0.76, M['blanco_mate'], 0.004)
    box(0, -D / 2 + 0.01, 0.0, L - 0.02, 0.02, 0.1, M['metal'], 0)
    box(0, 0, 0.86, L + 0.02, D + 0.02, 0.035, M['marmol'], 0.004)
    n = max(1, round(L / 0.6))
    for i in range(1, n):
        x = -L / 2 + i * L / n
        box(x, -D / 2 - 0.002, 0.12, 0.004, 0.004, 0.72, M['metal'], 0)
    if L > 1.2:
        cyl(L * 0.15, D / 2 - 0.12, 0.895, 0.015, 0.28, M['laton'], verts=12)


def kitchen(L, D):
    counter(L, D)


def island(L, D):
    counter(L, D)


def shower(L, D):
    box(0, 0, 0, L, D, 0.04, M['ceramica'], 0.01)
    box(0, -D / 2 + 0.01, 0.04, L * 0.9, 0.012, 1.95, M['vidrio'], 0)
    cyl(0, D / 2 - 0.08, 1.9, 0.11, 0.015, M['laton'], verts=24)
    cyl(0, D / 2 - 0.03, 1.0, 0.012, 0.9, M['laton'], verts=12)


def sink(L, D):
    box(0, 0.02, 0.45, L, D - 0.04, 0.38, M['roble'], 0.006)
    box(0, 0.02, 0.83, L + 0.02, D - 0.02, 0.025, M['marmol'], 0.004)
    box(0, 0.0, 0.855, min(0.42, L * 0.7), min(0.32, D * 0.6), 0.12, M['ceramica'], 0.04)
    cyl(0, D / 2 - 0.05, 0.855, 0.012, 0.2, M['laton'], verts=12)
    box(0, D / 2 - 0.01, 1.15, min(0.7, L), 0.02, 0.75, M['espejo'], 0.003)


def toilet(L, D):
    box(0, D / 2 - 0.10, 0.36, L * 0.9, 0.16, 0.38, M['ceramica'], 0.04)
    cyl(0, -0.02, 0.0, min(L, D) * 0.42, 0.40, M['ceramica'], verts=32, bevel=0.03)
    cyl(0, -0.02, 0.40, min(L, D) * 0.44, 0.03, M['ceramica'], verts=32, bevel=0.01)


def bathtub(L, D):
    box(0, 0, 0, L, D, 0.55, M['ceramica'], 0.05)


def rug(L, D):
    box(0, 0, 0.0, L, D, 0.012, M['lana'], 0.004)


def stool(L, D):
    cyl(0, 0, 0.62, min(L, D) * 0.45, 0.05, M['roble'], verts=28)
    for a in range(3):
        ang = a * 2 * math.pi / 3
        cyl(math.cos(ang) * L * 0.3, math.sin(ang) * D * 0.3, 0, 0.012, 0.62, M['metal'], verts=8)


def lamp(L, D):
    cyl(0, 0, 0, 0.14, 0.025, M['metal'])
    cyl(0, 0, 0.025, 0.012, 1.35, M['metal'], verts=10)
    cyl(0, 0, 1.30, 0.20, 0.28, M['pantalla'], verts=32)


def shelf(L, D):
    for z in (0, 0.45, 0.9, 1.35, 1.8):
        box(0, 0, z, L, D, 0.025, M['roble'], 0.003)
    for s in (-1, 1):
        box(s * (L / 2 - 0.01), 0, 0, 0.02, D, 1.82, M['roble'], 0.003)
    for i in range(int(L / 0.06)):
        h = 0.22 + (i * 37 % 7) * 0.012
        box(-L / 2 + 0.06 + i * 0.05, 0, 0.475, 0.035, D * 0.7, h, M[('terciopelo', 'lino_sofa', 'roble')[i % 3]], 0.002)


def generic(L, D, h=0.8, mat='roble'):
    box(0, 0, 0, L, D, h, M[mat], 0.01)


# ---------------------------------------------------------------- modelos de Poly Haven
def import_model(name):
    path = f'{A}/mod/{name}/{name}.gltf'
    if not os.path.exists(path):
        return None
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.context.scene.objects if o not in before and o.type == 'MESH']
    for o in [o for o in bpy.context.scene.objects if o not in before and o.type != 'MESH']:
        bpy.data.objects.remove(o, do_unlink=True)
    if not new:
        return None
    bpy.ops.object.select_all(action='DESELECT')
    for o in new:
        o.select_set(True)
    bpy.context.view_layer.objects.active = new[0]
    if len(new) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def place_model(name, f, height, keep_aspect=True, tag='modelo'):
    o = import_model(name)
    if not o:
        return False
    xs = [v.co.x for v in o.data.vertices]
    ys = [v.co.y for v in o.data.vertices]
    zs = [v.co.z for v in o.data.vertices]
    w, d, h = max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)
    s = min(f['sx'] / max(w, 1e-3), f['sy'] / max(d, 1e-3), height / max(h, 1e-3)) if keep_aspect else height / h
    o.scale = (s, s, s)
    o.location = (f['cx'] - (min(xs) + max(xs)) / 2 * s, f['cy'] - (min(ys) + max(ys)) / 2 * s, -min(zs) * s)
    o['tipo'] = tag
    return True


BUILD = {
    'bed': (bed, short_sides), 'nightstand': (nightstand, long_sides), 'desk': (desk, long_sides),
    'table': (table, long_sides), 'coffee': (coffee, long_sides), 'chair': (chair, long_sides),
    'sofa': (sofa, long_sides), 'wardrobe': (wardrobe, long_sides), 'counter': (counter, long_sides),
    'kitchen': (kitchen, long_sides), 'island': (island, long_sides), 'shower': (shower, long_sides),
    'sink': (sink, long_sides), 'toilet': (toilet, short_sides), 'bathtub': (bathtub, long_sides),
    'rug': (rug, long_sides), 'stool': (stool, long_sides), 'lamp': (lamp, long_sides),
    'shelf': (shelf, long_sides), 'console': (lambda L, D: generic(L, D, 0.8), long_sides),
    'bench': (lambda L, D: generic(L, D, 0.45, 'terciopelo'), long_sides),
    'lounger': (lambda L, D: generic(L, D, 0.35, 'lino_claro'), long_sides),
    'reception': (lambda L, D: generic(L, D, 1.05), long_sides), 'bar': (lambda L, D: generic(L, D, 1.05), long_sides),
    'booth': (lambda L, D: generic(L, D, 1.1, 'terciopelo'), long_sides),
}
count = {}
for f in FURN:
    it = f['item']
    count[it] = count.get(it, 0) + 1
    if it == 'plant':
        place_model('potted_plant_02' if f['sx'] >= 0.45 else 'potted_plant_04', f, 1.1 if f['sx'] >= 0.45 else 0.5, tag='planta')
        continue
    if it == 'armchair' and place_model('modern_arm_chair_01', f, 0.85):
        continue
    if it not in BUILD:
        continue
    fn, sides_of = BUILD[it]
    side = back_side(f, sides_of(f))
    L, D = (f['sx'], f['sy']) if side in ('n', 's') else (f['sy'], f['sx'])
    PARTS.clear()
    fn(L, D)
    rot = ROT[side]
    for o in PARTS:
        o.rotation_euler.z = rot
        x, y = o.location.x, o.location.y
        o.location.x = f['cx'] + x * math.cos(rot) - y * math.sin(rot)
        o.location.y = f['cy'] + x * math.sin(rot) + y * math.cos(rot)
        o['tipo'] = 'vidrio' if o.data.materials and o.data.materials[0] == M['vidrio'] else 'mueble'
log('muebles', count)

# ---------------------------------------------------------------- luz, cámara, render de muestra
sc = bpy.context.scene
meshes = [o for o in sc.objects if o.type == 'MESH']
mins, maxs = Vector((1e9,) * 3), Vector((-1e9,) * 3)
for o in meshes:
    for v in o.bound_box:
        w = o.matrix_world @ Vector(v)
        mins, maxs = Vector(map(min, mins, w)), Vector(map(max, maxs, w))
center = (mins + maxs) / 2
size = max(maxs.x - mins.x, maxs.y - mins.y)

# piso alrededor: concreto claro que recibe la sombra (en vez de la losa negra)
bpy.ops.mesh.primitive_plane_add(size=size * 6, location=(center.x, center.y, -0.02))
suelo = bpy.context.active_object
suelo.data.materials.append(plain('suelo', '#d9d4cb', 0.9))
suelo['tipo'] = 'suelo'

world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
wn, wl = world.node_tree.nodes, world.node_tree.links
env = wn.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(HDRI)
lp = wn.new('ShaderNodeLightPath')
mix = wn.new('ShaderNodeMixShader')
bg_light = wn['Background']
bg_light.inputs['Strength'].default_value = 1.1
wl.new(env.outputs['Color'], bg_light.inputs['Color'])
bg_cam = wn.new('ShaderNodeBackground')
bg_cam.inputs['Color'].default_value = (*srgb('#ece8e1'), 1)
wl.new(lp.outputs['Is Camera Ray'], mix.inputs['Fac'])
wl.new(bg_light.outputs['Background'], mix.inputs[1])
wl.new(bg_cam.outputs['Background'], mix.inputs[2])
wl.new(mix.outputs['Shader'], wn['World Output'].inputs['Surface'])

sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 2.6
sun.data.angle = math.radians(4)
sun.data.color = srgb('#fff0d8')
sun.rotation_euler = (math.radians(48), 0, math.radians(30))
sc.collection.objects.link(sun)

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
cam.data.lens = 32
sc.collection.objects.link(cam)
sc.camera = cam
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.use_denoising = True
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Base Contrast'
sc.view_settings.exposure = -0.2
sc.render.image_settings.file_format = 'JPEG'
sc.render.image_settings.quality = 90


def shot(path, loc, look_at, res=(1600, 900), samples=SAMPLES):
    cam.location = loc
    cam.rotation_euler = (Vector(look_at) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.cycles.samples = samples
    sc.render.filepath = os.path.abspath(path)
    bpy.ops.render.render(write_still=True)
    log('render', path)


d = size * 1.15
shot(OUT + '-muestra.jpg', center + Vector((d * 0.7, -d * 0.75, d * 0.95)), center)
# segunda toma: más cerca, sobre la sala (el sofá), en diagonal desde arriba
sofa_f = next((f for f in FURN if f['item'] == 'sofa'), None)
tgt = Vector((sofa_f['cx'], sofa_f['cy'], 0.4)) if sofa_f else center
shot(OUT + '-muestra-2.jpg', tgt + Vector((1.9, -2.6, 3.0)), tgt + Vector((0.6, 0.2, 0)))

# ---------------------------------------------------------------- horneado
for o in [o for o in sc.objects if o.type == 'MESH' and o.modifiers]:
    bpy.context.view_layer.objects.active = o
    for mod in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
opaque = [o for o in sc.objects if o.type == 'MESH' and o.get('tipo') not in ('planta', 'vidrio', 'suelo')
          and not any(s.material == M['vidrio'] for s in o.material_slots)]
bpy.ops.object.select_all(action='DESELECT')
for o in opaque:
    o.select_set(True)
bpy.context.view_layer.objects.active = opaque[0]
bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
obj.name = 'horneado'
uv = obj.data.uv_layers.new(name='luz')
obj.data.uv_layers.active = uv
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003)
bpy.ops.object.mode_set(mode='OBJECT')
img = bpy.data.images.new('luz', RES, RES)
for s in obj.material_slots:
    nt = s.material.node_tree
    node = nt.nodes.new('ShaderNodeTexImage')
    node.image = img
    nt.nodes.active = node
sc.cycles.samples = max(32, SAMPLES)
sc.render.bake.margin = 4
log('horneando', RES)
bpy.ops.object.bake(type='COMBINED', pass_filter={'DIRECT', 'INDIRECT', 'DIFFUSE', 'GLOSSY', 'TRANSMISSION', 'EMIT'})
img.filepath_raw = os.path.abspath(OUT + '-luz.png')
img.file_format = 'PNG'
img.save()
log('horneado listo')

baked = bpy.data.materials.new('horneado')
baked.use_nodes = True
bn = baked.node_tree.nodes
tex = bn.new('ShaderNodeTexImage')
tex.image = img
uvn = bn.new('ShaderNodeUVMap')
uvn.uv_map = 'luz'
baked.node_tree.links.new(uvn.outputs['UV'], tex.inputs['Vector'])
baked.node_tree.links.new(tex.outputs['Color'], bn['Principled BSDF'].inputs['Base Color'])
obj.data.materials.clear()
obj.data.materials.append(baked)
for layer in [layer for layer in obj.data.uv_layers if layer.name != 'luz']:
    obj.data.uv_layers.remove(layer)

bpy.data.objects.remove(suelo, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in sc.objects:
    if o.type == 'MESH':
        o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.abspath(OUT + '.glb'), export_format='GLB', use_selection=True,
                          export_image_format='JPEG', export_jpeg_quality=86, export_apply=True)
log('GLB', OUT + '.glb', round(os.path.getsize(OUT + '.glb') / 1024), 'KB')
