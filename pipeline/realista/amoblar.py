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
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_gpu import hiper, usar_gpu  # noqa: E402
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, SVG, OUT = argv[0], argv[1], argv[2]
SAMPLES = int(argv[3]) if len(argv) > 3 else 64
RES = int(argv[4]) if len(argv) > 4 else 2048
A = os.environ.get('POLYHAVEN', 'D:/Herramientas/assets-polyhaven')
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
def texmat(name, folder, size_m, tint=None, rough_mult=1.0, normal=0.6, relieve=0.25, imperfeccion=0.15):
    """Material PBR completo de Poly Haven (color, rugosidad, normal y relieve; a 2K si está) en
    proyección de caja (sin depender de UVs), con algo de imperfección: la rugosidad y el tono
    varían un poco con un ruido grande (desgaste, polvo), como en un material real."""
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
        path = next((p for p in (f'{A}/tex/{folder}/{file}_2k.jpg', f'{A}/tex/{folder}/{file}.jpg') if os.path.exists(p)), None)
        if not path:
            return None
        t = n.new('ShaderNodeTexImage')
        t.image = bpy.data.images.load(path, check_existing=True)
        t.image.colorspace_settings.name = 'sRGB' if color else 'Non-Color'
        t.projection = 'BOX'
        t.projection_blend = 0.25
        nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
        return t

    # imperfección: un ruido de ~1,5 tamaños de textura, sin repetirse
    ruido = None
    if imperfeccion:
        ruido = n.new('ShaderNodeTexNoise')
        ruido.inputs['Scale'].default_value = 0.7
        ruido.inputs['Detail'].default_value = 6.0
        ruido.inputs['Roughness'].default_value = 0.6
        nt.links.new(mp.outputs['Vector'], ruido.inputs['Vector'])

    def variacion(lo, hi):
        mr = n.new('ShaderNodeMapRange')
        mr.inputs['From Min'].default_value = 0.3
        mr.inputs['From Max'].default_value = 0.7
        mr.inputs['To Min'].default_value = lo
        mr.inputs['To Max'].default_value = hi
        nt.links.new(ruido.outputs['Fac'], mr.inputs['Value'])
        return mr.outputs['Result']

    color = None
    d = img('diff', True)
    if d:
        color = d.outputs['Color']
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
            color = mix.outputs['Result']
        if ruido:
            tono = n.new('ShaderNodeMix')
            tono.data_type = 'RGBA'
            tono.blend_type = 'MULTIPLY'
            tono.inputs['Factor'].default_value = 1.0
            nt.links.new(color, tono.inputs['A'])
            nt.links.new(variacion(1 - imperfeccion * 0.35, 1 + imperfeccion * 0.15), tono.inputs['B'])
            color = tono.outputs['Result']
        nt.links.new(color, b.inputs['Base Color'])
    r = img('rough', False)
    if r:
        mm = n.new('ShaderNodeMath')
        mm.operation = 'MULTIPLY'
        mm.inputs[1].default_value = rough_mult
        nt.links.new(r.outputs['Color'], mm.inputs[0])
        rough = mm.outputs['Value']
        if ruido:
            mv = n.new('ShaderNodeMath')
            mv.operation = 'MULTIPLY'
            mv.use_clamp = True
            nt.links.new(rough, mv.inputs[0])
            nt.links.new(variacion(1 - imperfeccion, 1 + imperfeccion), mv.inputs[1])
            rough = mv.outputs['Value']
        nt.links.new(rough, b.inputs['Roughness'])
    normal_out = None
    nm = img('nor', False)
    if nm:
        nmap = n.new('ShaderNodeNormalMap')
        nmap.inputs['Strength'].default_value = normal
        nt.links.new(nm.outputs['Color'], nmap.inputs['Color'])
        normal_out = nmap.outputs['Normal']
    # relieve: el mapa de desplazamiento como bump encima de la normal (juntas, poros, trama)
    dm = img('disp', False) if relieve else None
    if dm:
        bump = n.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = relieve
        bump.inputs['Distance'].default_value = 0.003 * size_m
        nt.links.new(dm.outputs['Color'], bump.inputs['Height'])
        if normal_out:
            nt.links.new(normal_out, bump.inputs['Normal'])
        normal_out = bump.outputs['Normal']
    if normal_out:
        nt.links.new(normal_out, b.inputs['Normal'])
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
    'muro': texmat('muro', 'beige_wall_001', 2.0, tint='#fbf8f2', rough_mult=1.0, normal=0.25, relieve=0.12, imperfeccion=0.1),
    'madera_piso': texmat('madera_piso', 'laminate_floor_02', 2.4, normal=0.4, relieve=0.3, imperfeccion=0.2),
    'baldosa': texmat('baldosa', 'marble_01', 0.9, tint='#f4f1ec', rough_mult=0.7, normal=0.15, relieve=0.08),
    'roble': texmat('roble', 'oak_veneer_01', 1.2, rough_mult=0.9, normal=0.3),
    'marmol': texmat('marmol', 'marble_01', 1.4, rough_mult=0.6, normal=0.2, relieve=0.05, imperfeccion=0.1),
    'lino_claro': texmat('lino_claro', 'rough_linen', 0.5, tint='#f6f3ee', normal=0.5),
    'lino_sofa': texmat('lino_sofa', 'rough_linen', 0.5, tint='#c9bca9', normal=0.6),
    'terciopelo': texmat('terciopelo', 'velour_velvet', 0.4, tint='#7d8c78', normal=0.5),
    'lana': texmat('lana', 'caban', 0.8, tint='#e2d8c8', normal=0.7, relieve=0.4),
    'ceramica': plain('ceramica', '#f6f5f2', 0.12),
    'metal': plain('metal', '#2b2926', 0.35, metal=1.0),
    'aluminio': plain('aluminio', '#9a9a95', 0.3, metal=1.0),
    'laton': plain('laton', '#b08d57', 0.3, metal=1.0),
    'vidrio': plain('vidrio', '#e6f0f0', 0.02, trans=1.0),
    'espejo': plain('espejo', '#d8dcdc', 0.02, metal=1.0),
    'blanco_mate': plain('blanco_mate', '#efece6', 0.45),
    'lienzo': plain('lienzo', '#e9e1d3', 0.9),
    'cortina': texmat('cortina', 'rough_linen', 0.35, tint='#efe9df', normal=0.8),
    'pantalla': plain('pantalla', '#f4e7cf', 0.8, emit='#ffd9a0', emit_strength=3.5),
    'alfombra': texmat('alfombra', 'caban', 0.6, tint='#8f867b', normal=0.5, relieve=0.4),
    'concreto': plain('concreto', '#bdb6ab', 0.85),
    'fruta': plain('fruta', '#e08a2c', 0.45),
    'tapa': plain('tapa', '#3f4a3c', 0.7),  # tapas de libros
}
# PLANTA=1: planta de un piso entero en corte (muros a 1,1 m): sin cortinas ni cuadros y
# los muebles altos recortados a la altura del corte
PLANTA = bool(os.environ.get('PLANTA'))
CORTE = 1.12


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
        elif n.startswith('piso-alfombra'):
            s.material = M['alfombra']
        elif n.startswith('piso-concreto'):
            s.material = M['concreto']
        elif n.startswith('piso-'):
            s.material = M['madera_piso']
        elif n.startswith('puertas'):
            s.material = M['roble']
        elif n.startswith('vidrio'):
            s.material = M['vidrio']
        elif n.startswith('baranda'):
            s.material = M['aluminio']
# muros: los segmentos del plano se superponen en las esquinas (caras dobles que el horneado deja
# negras). Se unen en una sola malla y se funden los vértices que coinciden.
muros = [o for o in bpy.context.scene.objects if o.type == 'MESH' and any(sl.material == M['muro'] for sl in o.material_slots)]
if muros:
    bpy.ops.object.select_all(action='DESELECT')
    for o in muros:
        o.select_set(True)
    bpy.context.view_layer.objects.active = muros[0]
    if len(muros) > 1:
        bpy.ops.object.join()
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.002)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    rem = bpy.context.view_layer.objects.active.modifiers.new('unir', 'REMESH')
    rem.mode = 'SHARP'
    rem.octree_depth = 8
    rem.use_remove_disconnected = False
    # el remesh llena de triángulos las caras planas: se simplifican (los muros son planos)
    dec = bpy.context.view_layer.objects.active.modifiers.new('plano', 'DECIMATE')
    dec.decimate_type = 'DISSOLVE'
    dec.angle_limit = math.radians(2)
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
SOFT = {'lino_claro', 'lino_sofa', 'terciopelo', 'lana'}


def _finish(o, mat, bevel):
    o.data.materials.append(mat)
    dims = sorted(o.dimensions)
    blando = mat.name in SOFT and dims[0] >= 0.03 and dims[1] >= 0.08
    if bevel > 0:
        mod = o.modifiers.new('bisel', 'BEVEL')
        mod.width = bevel
        mod.segments = 2 if blando else 3
        mod.limit_method = 'ANGLE'
    if blando:
        # tapicería con forma: el bisel más una subdivisión redondea colchón, edredón, cojines y
        # sofá como relleno y no como caja (al horneado va un nivel; a las fotos, dos)
        sub = o.modifiers.new('relleno', 'SUBSURF')
        sub.levels = 1
        sub.render_levels = 2
    PARTS.append(o)
    return o


def box(x, y, z, sx, sy, sz, mat, bevel=0.008):
    # cada pieza 1-5 mm distinta: sin caras exactamente encima de otras (titilaban entre negro y blanco)
    e = 0.001 * (len(PARTS) % 5 + 1)
    sx, sy, sz = max(sx - e, 0.004), max(sy - e, 0.004), max(sz - e * 0.5, 0.004)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + sz / 2 + e * 0.25))
    o = bpy.context.active_object
    o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    return _finish(o, mat, min(bevel, sx / 3, sy / 3, sz / 3))


def cyl(x, y, z, r, h, mat, verts=28, bevel=0.004, caps=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(x, y, z + h / 2),
                                        end_fill_type='NGON' if caps else 'NOTHING')
    o = bpy.context.active_object
    return _finish(o, mat, min(bevel, r / 3, h / 3))


def bulb(x, y, z, watts):
    """Bombillo cálido (2700 K) dentro de una pantalla abierta: la lámpara alumbra de verdad."""
    if PLANTA:
        return
    ld = bpy.data.lights.new('bombillo', 'POINT')
    ld.energy = watts
    ld.shadow_soft_size = 0.04
    ld.color = srgb('#ffc187')
    o = bpy.data.objects.new('bombillo', ld)
    o.location = (x, y, z)
    bpy.context.scene.collection.objects.link(o)
    PARTS.append(o)


def legs(L, D, h, mat, inset=0.04, r=0.018):
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl(sx * (L / 2 - inset), sy * (D / 2 - inset), 0, r, h, mat, verts=12)


# ---------------------------------------------------------------- muebles
def bed(L, D):
    box(0, 0, 0.05, L, D, 0.25, M['roble'], 0.02)
    box(0, -0.02, 0.30, L - 0.05, D - 0.08, 0.22, M['lino_claro'], 0.05)
    # edredón que cae por los costados del colchón (no una placa encima), con su doblez arriba
    box(0, -D * 0.10, 0.36, L + 0.04, D * 0.76, 0.21, M['lino_claro'], 0.07)
    box(0, -D * 0.10 + D * 0.38 - 0.10, 0.55, L + 0.03, 0.2, 0.05, M['lino_claro'], 0.035)  # doblez
    box(0, -D / 2 + 0.30, 0.565, L + 0.07, 0.44, 0.03, M['terciopelo'], 0.012)  # pie de cama
    n = 2 if L > 1.3 else 1
    for i in range(n):
        x = (i - (n - 1) / 2) * (L / n)
        box(x, D / 2 - 0.30, 0.52, L / n - 0.10, 0.38, 0.19, M['lino_claro'], 0.085)  # almohadas llenas
    if L > 1.3:
        cojines(0, D / 2 - 0.55, 0.56, min(0.9, L * 0.5), M['lana'])
    box(0, D / 2 - 0.04, 0.05, L + 0.08, 0.08, 1.05, M['terciopelo'], 0.025)  # cabecero
    art(0, D / 2 + GAP['v'] - 0.03, 1.45, min(1.0, L * 0.6), 0.55)


GAP = {'v': 0.0}  # distancia del respaldo del mueble al muro (para colgar cuadros contra el muro)


def art(x, y, z, w, h):
    """Cuadro: marco de roble y lienzo con dos manchas de color (abstracto, sin texto)."""
    if PLANTA:
        return
    box(x, y, z, w, 0.03, h, M['roble'], 0.004)
    box(x, y - 0.018, z + 0.03, w - 0.06, 0.006, h - 0.06, M['lienzo'], 0.001)
    box(x - w * 0.12, y - 0.022, z + h * 0.25, w * 0.32, 0.004, h * 0.45, M['terciopelo'], 0.001)
    box(x + w * 0.16, y - 0.022, z + h * 0.18, w * 0.22, 0.004, h * 0.3, M['laton'], 0.001)


def nightstand(L, D):
    box(0, 0, 0.0, L, D, 0.5, M['roble'], 0.01)
    box(0, -D / 2 + 0.005, 0.30, L - 0.05, 0.01, 0.002, M['metal'], 0)
    cyl(0, 0.03, 0.5, 0.06, 0.03, M['laton'])
    cyl(0, 0.03, 0.53, 0.012, 0.22, M['laton'])
    cyl(0, 0.03, 0.70, 0.11, 0.17, M['pantalla'], verts=32, caps=False)
    bulb(0, 0.03, 0.79, 18)


def desk(L, D):
    box(0, 0, 0.72, L, D, 0.035, M['roble'], 0.006)
    legs(L, D, 0.72, M['metal'], r=0.012)
    if L > 0.7:
        libros(-L / 2 + 0.18, D * 0.1, 0.755, 3)
        cyl(L / 2 - 0.12, D * 0.15, 0.755, 0.045, 0.16, M['ceramica'], verts=20)  # portalápices / florero


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
    # florero con ramas y una bandeja
    cyl(L * 0.2, D * 0.1, 0.35, 0.055, 0.22, M['ceramica'], verts=20)
    for k in range(3):
        cyl(L * 0.2 + (k - 1) * 0.025, D * 0.1, 0.55, 0.006, 0.22 + k * 0.05, M['roble'], verts=6)
    box(L * 0.05, -D * 0.18, 0.35, 0.3, 0.2, 0.015, M['laton'], 0.003)


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
    # cojines con forma en una esquina y una manta sobre el brazo del otro lado
    cojines(-L / 2 + arm + 0.32, D / 2 - 0.40, 0.44, 0.62, M['terciopelo'])
    box(L / 2 - arm / 2, -0.04, 0.575, arm + 0.06, D * 0.5, 0.022, M['lana'], 0.008)
    box(L / 2 + 0.02, -0.04, 0.22, 0.022, D * 0.5, 0.37, M['lana'], 0.008)
    art(0, D / 2 + GAP['v'] - 0.03, 1.35, min(1.1, L * 0.55), 0.7)
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
        # objetos sobre el mesón: tabla de picar, hervidor y un bowl
        box(-L * 0.28, 0.0, 0.895, 0.36, 0.24, 0.02, M['roble'], 0.004)
        cyl(L * 0.32, -0.02, 0.895, 0.08, 0.2, M['metal'], verts=20)
        cyl(-L * 0.05, 0.02, 0.895, 0.1, 0.07, M['ceramica'], verts=24)
        # vajilla y fruta: platos apilados y tres naranjas en el bowl
        for i in range(4):
            cyl(L * 0.12, -0.06, 0.895 + i * 0.014, 0.12, 0.011, M['ceramica'], verts=32, bevel=0.003)
        for k in range(3):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.035, location=(-L * 0.05 + (k - 1) * 0.045, 0.02 + (k % 2) * 0.03, 0.95))
            bpy.ops.object.shade_smooth()
            _finish(bpy.context.active_object, M['fruta'], 0)


def kitchen(L, D):
    counter(L, D)


def island(L, D):
    counter(L, D)


def shower(L, D):
    box(0, 0, 0, L, D, 0.04, M['ceramica'], 0.01)
    box(0, -D / 2 + 0.01, 0.04, L * 0.9, 0.012, 1.95, M['vidrio'], 0)
    cyl(0, D / 2 - 0.08, 1.9, 0.11, 0.015, M['laton'], verts=24)
    cyl(0, D / 2 - 0.03, 1.0, 0.012, 0.9, M['laton'], verts=12)
    # toalla colgada del borde del vidrio, del lado de afuera
    box(L * 0.22, -D / 2 - 0.012, 1.32, min(0.45, L * 0.45), 0.022, 0.64, M['lino_claro'], 0.01)


def sink(L, D):
    box(0, 0.02, 0.45, L, D - 0.04, 0.38, M['roble'], 0.006)
    box(0, 0.02, 0.83, L + 0.02, D - 0.02, 0.025, M['marmol'], 0.004)
    box(0, 0.0, 0.855, min(0.42, L * 0.7), min(0.32, D * 0.6), 0.12, M['ceramica'], 0.04)
    cyl(0, D / 2 - 0.05, 0.855, 0.012, 0.2, M['laton'], verts=12)
    box(0, D / 2 - 0.01, 1.15, min(0.7, L), 0.02, 0.75, M['espejo'], 0.003)
    # toallas dobladas junto al lavamanos
    box(L / 2 - 0.12, -0.02, 0.855, 0.2, 0.26, 0.06, M['lino_claro'], 0.02)
    box(L / 2 - 0.12, -0.02, 0.915, 0.18, 0.24, 0.05, M['lino_claro'], 0.02)


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
    cyl(0, 0, 1.30, 0.20, 0.28, M['pantalla'], verts=32, caps=False)
    bulb(0, 0, 1.44, 35)


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


def modelo(name, giro, L, D, alto, pos=(0, 0, 0), mat=None):
    """Modelo CC0 de Poly Haven en el marco local del mueble (frente a -Y, centrado, apoyado en el
    piso), girado `giro` grados para que su frente quede adelante y escalado sin deformarlo para
    caber en L × D × alto. Devuelve su alto, o None si el modelo no está."""
    o = import_model(name)
    if not o:
        return None
    from mathutils import Matrix
    o.data.transform(Matrix.Rotation(math.radians(giro), 4, 'Z'))
    xs = [v.co.x for v in o.data.vertices]
    ys = [v.co.y for v in o.data.vertices]
    zs = [v.co.z for v in o.data.vertices]
    w, d, h = max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)
    o.data.transform(Matrix.Translation((-(min(xs) + max(xs)) / 2, -(min(ys) + max(ys)) / 2, -min(zs))))
    k = min(L / max(w, 1e-3), D / max(d, 1e-3), alto / max(h, 1e-3))
    o.data.transform(Matrix.Scale(k, 4))
    o.location = pos
    if mat:
        # se retiñe con las telas del hotel (el modelo trae un estampado que no va)
        o.data.materials.clear()
        o.data.materials.append(mat)
    PARTS.append(o)
    return h * k


def cojines(x, y, z, ancho, mat):
    """Par de cojines con forma (throw_pillows_01), recostados; si falta el modelo, dos cajas suaves."""
    if modelo('throw_pillows_01', 0, ancho, 0.4, 0.42, pos=(x, y, z), mat=mat) is None:
        for sx in (-1, 1):
            box(x + sx * ancho * 0.22, y, z, ancho * 0.36, 0.12, 0.34, mat, 0.06)


def libros(x, y, z, n=3):
    """Pila de libros (tapas de colores apagados, sin texto)."""
    for i in range(n):
        box(x + (i % 2) * 0.012, y - (i % 3) * 0.008, z + i * 0.032, 0.22 - i * 0.015, 0.16 - i * 0.01, 0.028,
            M[('tapa', 'lino_sofa', 'terciopelo')[i % 3]], 0.003)


def nightstand_m(L, D):
    h = modelo('side_table_01', 0, L, D, 0.55)
    if h is None:
        return nightstand(L, D)
    cyl(0, 0.03, h, 0.06, 0.03, M['laton'])
    cyl(0, 0.03, h + 0.03, 0.012, 0.22, M['laton'])
    cyl(0, 0.03, h + 0.20, 0.11, 0.17, M['pantalla'], verts=32, caps=False)
    bulb(0, 0.03, h + 0.29, 18)


def coffee_m(L, D):
    # mesa de centro redonda de Poly Haven si el hueco es más o menos cuadrado
    if abs(L - D) < 0.2 and modelo('coffee_table_round_01', 0, L, D, 0.42) is not None:
        return
    coffee(L, D)


def armchair_m(L, D):
    if modelo('modern_arm_chair_01', 0, L, D, 0.85) is None:
        chair(L, D)


def console_m(L, D):
    if modelo('modern_wooden_cabinet', 0, L, D, 0.75) is None:
        generic(L, D, 0.8)


def shelf_m(L, D):
    if modelo('wooden_display_shelves_01', -90, L, D, 1.9) is None:
        shelf(L, D)


BUILD = {
    'bed': (bed, short_sides), 'nightstand': (nightstand_m, long_sides), 'desk': (desk, long_sides),
    'table': (table, long_sides), 'coffee': (coffee_m, long_sides), 'chair': (chair, long_sides),
    'armchair': (armchair_m, long_sides),
    'sofa': (sofa, long_sides), 'wardrobe': (wardrobe, long_sides), 'counter': (counter, long_sides),
    'kitchen': (kitchen, long_sides), 'island': (island, long_sides), 'shower': (shower, long_sides),
    'sink': (sink, long_sides), 'toilet': (toilet, short_sides), 'bathtub': (bathtub, long_sides),
    'rug': (rug, long_sides), 'stool': (stool, long_sides), 'lamp': (lamp, long_sides),
    'shelf': (shelf_m, long_sides), 'console': (console_m, long_sides),
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
    if it not in BUILD:
        continue
    fn, sides_of = BUILD[it]
    side = back_side(f, sides_of(f))
    L, D = (f['sx'], f['sy']) if side in ('n', 's') else (f['sy'], f['sx'])
    mids = {'n': (f['cx'], f['cy'] + f['sy'] / 2), 's': (f['cx'], f['cy'] - f['sy'] / 2),
            'e': (f['cx'] + f['sx'] / 2, f['cy']), 'w': (f['cx'] - f['sx'] / 2, f['cy'])}
    GAP['v'] = min(wall_dist(*mids[side]), 0.4)
    PARTS.clear()
    fn(L, D)
    rot = ROT[side]
    for o in PARTS:
        o.rotation_euler.z = rot
        x, y = o.location.x, o.location.y
        o.location.x = f['cx'] + x * math.cos(rot) - y * math.sin(rot)
        o.location.y = f['cy'] + x * math.sin(rot) + y * math.cos(rot)
        if o.type == 'LIGHT':
            o['tipo'] = 'luz'
            continue
        o['tipo'] = 'vidrio' if o.data.materials and o.data.materials[0] == M['vidrio'] else 'mueble'
# cortinas: dos paños a los lados de cada ventana, del lado de adentro
SPACES = []
for g in root.iter():
    if g.tag.endswith('g') and g.get('id') == 'spaces':
        for pg in g.iter():
            if pg.tag.endswith('polygon'):
                pts = [tuple(float(v) for v in p.split(',')) for p in pg.get('points').split()]
                SPACES.append((pg.get('id') or '', [(x * 0.01 - PW / 2, -(y * 0.01 - PH / 2)) for x, y in pts]))


def inside(px, py):
    for sid, poly in SPACES:
        if any(k in sid for k in ('balcon', 'terraza')):
            continue
        c = False
        for i in range(len(poly)):
            (x1, y1), (x2, y2) = poly[i], poly[i - 1]
            if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1 + 1e-12) + x1:
                c = not c
        if c:
            return True
    return False


for g in root.iter():
    if g.tag.endswith('g') and g.get('id') == 'openings':
        for r in g.iter():
            if PLANTA or not r.tag.endswith('rect') or r.get('data-type') != 'window':
                continue
            x, y = float(r.get('x')) * 0.01, float(r.get('y')) * 0.01
            w, h = float(r.get('width')) * 0.01, float(r.get('height')) * 0.01
            cx, cy = x + w / 2 - PW / 2, -(y + h / 2 - PH / 2)
            horiz = w >= h
            for sgn in (1, -1):
                nx, ny = (cx, cy + sgn * 0.3) if horiz else (cx + sgn * 0.3, cy)
                if not inside(nx, ny):
                    continue
                off = (h if horiz else w) / 2 + 0.06
                span = w if horiz else h
                for end in (-1, 1):
                    px = cx + end * (span / 2 + 0.05) if horiz else cx + sgn * off
                    py = cy + sgn * off if horiz else cy + end * (span / 2 + 0.05)
                    PARTS.clear()
                    box(0, 0, 0.02, 0.32 if horiz else 0.07, 0.07 if horiz else 0.32, 2.45, M['cortina'], 0.02)
                    for o in PARTS:
                        o.location.x, o.location.y = px, py
                        o['tipo'] = 'mueble'
                break
if PLANTA:
    # corte a la altura de los muros: lo que queda encima se quita y lo que lo cruza se acorta
    for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.get('tipo') in ('mueble', 'modelo', 'planta', 'vidrio')]:
        zs = [(o.matrix_world @ Vector(v)).z for v in o.bound_box]
        z0, z1 = min(zs), max(zs)
        if z0 >= CORTE - 0.02:
            bpy.data.objects.remove(o, do_unlink=True)
        elif z1 > CORTE and o.get('tipo') in ('mueble', 'vidrio'):
            k = (CORTE - z0) / (z1 - z0)
            o.location.z = z0 + (o.location.z - z0) * k
            o.scale.z *= k
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

# ---- luz de arquitecto: cielo real (HDRI de Poly Haven) que se ve por las ventanas, un sol de
# borde nítido que entra por la ventana principal y lámparas cálidas encendidas (ver bulb()).
CIELO = f'{A}/hdri/kloofendal_48d_partly_cloudy_puresky_4k.hdr'
if not os.path.exists(CIELO):
    log('sin el cielo de Poly Haven (bajar_polyhaven.py): se usa el del visor')
    CIELO = HDRI


def ventana_principal():
    """Dirección hacia adentro (x, y) de la ventana más ancha que da a un espacio interior."""
    best = None
    for g in root.iter():
        if not (g.tag.endswith('g') and g.get('id') == 'openings'):
            continue
        for r in g.iter():
            if not r.tag.endswith('rect') or r.get('data-type') != 'window':
                continue
            x, y = float(r.get('x')) * 0.01, float(r.get('y')) * 0.01
            w, h = float(r.get('width')) * 0.01, float(r.get('height')) * 0.01
            cx, cy = x + w / 2 - PW / 2, -(y + h / 2 - PH / 2)
            horiz = w >= h
            for sgn in (1, -1):
                if inside(*((cx, cy + sgn * 0.3) if horiz else (cx + sgn * 0.3, cy))):
                    if best is None or max(w, h) > best[0]:
                        best = (max(w, h), (0.0, float(sgn)) if horiz else (float(sgn), 0.0))
                    break
    return best[1] if best else None


world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
wn, wl = world.node_tree.nodes, world.node_tree.links
env = wn.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(CIELO)
mp_w = wn.new('ShaderNodeMapping')
wl.new(wn.new('ShaderNodeTexCoord').outputs['Generated'], mp_w.inputs['Vector'])
wl.new(mp_w.outputs['Vector'], env.inputs['Vector'])
# el sol del HDRI se recorta (lo pone la lámpara de sol, con su sombra nítida y su dirección)
recorte = wn.new('ShaderNodeMix')
recorte.data_type = 'RGBA'
recorte.blend_type = 'DARKEN'
recorte.inputs['Factor'].default_value = 1.0
recorte.inputs['B'].default_value = (8.0, 8.0, 8.0, 1.0)
wl.new(env.outputs['Color'], recorte.inputs['A'])
bg = wn['Background']
bg.inputs['Strength'].default_value = 1.0
wl.new(recorte.outputs['Result'], bg.inputs['Color'])

sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 6.0
sun.data.angle = math.radians(0.6)  # disco del sol real: sombra de borde nítido
sun.data.color = srgb('#fff1dc')
adentro = None if PLANTA else ventana_principal()
if adentro:
    # entra por la ventana principal, 35° de lado (sombras en diagonal) y bajo (32° de altura),
    # para que deje su mancha en el piso
    a = math.radians(35)
    dx = adentro[0] * math.cos(a) - adentro[1] * math.sin(a)
    dy = adentro[0] * math.sin(a) + adentro[1] * math.cos(a)
    phi = math.atan2(-dx, dy)
    sun.rotation_euler = (math.radians(58), 0, phi)
    log('sol por la ventana principal: adentro', adentro, 'rumbo', round(math.degrees(phi)))
else:
    sun.rotation_euler = (math.radians(48), 0, math.radians(30))
sc.collection.objects.link(sun)
# el cielo se gira para que su zona clara quede del lado del sol
try:
    import numpy as np
    w_, h_ = env.image.size
    px = np.empty(w_ * h_ * 4, dtype=np.float32)
    env.image.pixels.foreach_get(px)
    lum = px.reshape(h_, w_, 4)[:, :, :3] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    u = np.unravel_index(np.argmax(lum), lum.shape)[1] / w_
    az_tex = (0.5 - u) * 2 * math.pi
    sd = sun.rotation_euler.to_matrix() @ Vector((0, 0, 1))  # hacia el sol
    mp_w.inputs['Rotation'].default_value[2] = az_tex - math.atan2(sd.y, sd.x)
except Exception as e:  # sin numpy el cielo queda como viene
    log('cielo sin girar:', e)

# vidrio para el render: deja pasar el sol (el de transmisión lo bloqueaba: sin cáusticas, la luz
# directa no cruza un vidrio que refracta) y refleja un poco. Antes de exportar vuelve el original.
vidrio_luz = bpy.data.materials.new('vidrio-luz')
vidrio_luz.use_nodes = True
vn, vlk = vidrio_luz.node_tree.nodes, vidrio_luz.node_tree.links
vn.remove(vn['Principled BSDF'])
tr = vn.new('ShaderNodeBsdfTransparent')
tr.inputs['Color'].default_value = (0.93, 0.96, 0.96, 1)
gl = vn.new('ShaderNodeBsdfGlossy')
gl.inputs['Roughness'].default_value = 0.02
fr = vn.new('ShaderNodeFresnel')
fr.inputs['IOR'].default_value = 1.52
# reflejo solo en la cara de entrada: de salida, el Fresnel de 1/1,52 da reflexión total por encima
# de ~41° y el vidrio frenaba casi toda la luz oblicua del sol y del cielo
geo = vn.new('ShaderNodeNewGeometry')
frente = vn.new('ShaderNodeMath')
frente.operation = 'SUBTRACT'
frente.inputs[0].default_value = 1.0
vlk.new(geo.outputs['Backfacing'], frente.inputs[1])
refl = vn.new('ShaderNodeMath')
refl.operation = 'MULTIPLY'
vlk.new(fr.outputs['Fac'], refl.inputs[0])
vlk.new(frente.outputs['Value'], refl.inputs[1])
mx = vn.new('ShaderNodeMixShader')
vlk.new(refl.outputs['Value'], mx.inputs['Fac'])
vlk.new(tr.outputs['BSDF'], mx.inputs[1])
vlk.new(gl.outputs['BSDF'], mx.inputs[2])
# la sombra lo cruza entera (solo el tinte del vidrio)
lp_v = vn.new('ShaderNodeLightPath')
mx2 = vn.new('ShaderNodeMixShader')
vlk.new(lp_v.outputs['Is Shadow Ray'], mx2.inputs['Fac'])
vlk.new(mx.outputs['Shader'], mx2.inputs[1])
vlk.new(tr.outputs['BSDF'], mx2.inputs[2])
vlk.new(mx2.outputs['Shader'], vn['Material Output'].inputs['Surface'])
for o in sc.objects:
    if o.type == 'MESH':
        for s in o.material_slots:
            if s.material == M['vidrio']:
                s.material = vidrio_luz
                if o.get('tipo') != 'vidrio':
                    # ventanas: la cámara no ve la caja de vidrio (de lado se veía negra contra el
                    # muro); el sol y el cielo sí la cruzan. El vidrio de la ducha sí se ve.
                    o.visible_camera = False

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
cam.data.lens = 32
sc.collection.objects.link(cam)
sc.camera = cam
sc.render.engine = 'CYCLES'
usar_gpu(sc)
# entre una foto y la siguiente solo cambia la cámara: no se rearma la escena en la tarjeta
sc.render.use_persistent_data = True
sc.cycles.use_denoising = True
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Base Contrast'
sc.view_settings.exposure = -0.2
sc.render.image_settings.file_format = 'JPEG'
sc.render.image_settings.quality = 90
# rápido en CPU: pocos rebotes y muestreo adaptativo (el filtro de ruido limpia el resto).
# En modo hiperrealista (HIPER=1, PC con GPU) se quitan los atajos: ver docs/RENDER.md
sc.cycles.max_bounces = 12 if hiper() else 6
sc.cycles.diffuse_bounces = 6 if hiper() else 3
sc.cycles.glossy_bounces = 4 if hiper() else 2
sc.cycles.transmission_bounces = 4
sc.cycles.transparent_max_bounces = 6
sc.cycles.caustics_reflective = False
sc.cycles.caustics_refractive = False
sc.cycles.use_adaptive_sampling = True
sc.cycles.adaptive_threshold = 0.01 if hiper() else 0.04
# ---- postproducción ligera por hotel (pipeline/realista/looks.json): brillo suave en lo más claro
# y una curva de color (Niebla cálido, Cénit neutro, Frailejón frío). Solo fotos y 360°, no el horneado.
def postproduccion():
    import json
    partes = os.path.abspath(SVG).replace('\\', '/').split('/')
    hotel = partes[partes.index('hotels') + 1] if 'hotels' in partes[:-1] else 'neutro'
    looks = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'looks.json'), encoding='utf-8'))
    lk = looks.get(hotel, looks['neutro'])
    t = bpy.data.node_groups.new('post', 'CompositorNodeTree')
    t.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl = t.nodes.new('CompositorNodeRLayers')
    gl_ = t.nodes.new('CompositorNodeGlare')
    gl_.inputs['Type'].default_value = 'Bloom'
    gl_.inputs['Quality'].default_value = 'High'
    gl_.inputs['Threshold'].default_value = 1.0
    gl_.inputs['Strength'].default_value = lk['brillo']
    cb = t.nodes.new('CompositorNodeColorBalance')
    cb.inputs['Type'].default_value = 'Offset/Power/Slope (ASC-CDL)'
    k = lk['calidez']
    cb.inputs[14].default_value = (1 + k, 1 + k * 0.25, 1 - k, 1)  # pendiente (Slope) RGB
    cv = t.nodes.new('CompositorNodeCurveRGB')
    c = cv.mapping.curves[3]
    q = lk['contraste']
    c.points.new(0.25, 0.25 - q)
    c.points.new(0.75, 0.75 + q)
    cv.mapping.update()
    out = t.nodes.new('NodeGroupOutput')
    t.links.new(rl.outputs['Image'], gl_.inputs['Image'])
    t.links.new(gl_.outputs['Image'], cb.inputs['Image'])
    t.links.new(cb.outputs['Image'], cv.inputs['Image'])
    t.links.new(cv.outputs['Image'], out.inputs[0])
    sc.compositing_node_group = t
    sc.render.use_compositing = True
    log('postproducción', hotel, lk)


try:
    postproduccion()
except Exception as e:  # sin postproducción la foto sale igual, solo sin el retoque
    log('sin postproducción:', e)
PANO_W = int(os.environ.get('PANO_RES', '8192' if hiper() else '2048'))
PANO_WEB = int(os.environ.get('PANO_WEB', '2048'))
FOTO = (3200, 2000) if hiper() else (1600, 1000)


def shot(path, loc, look_at, res=(1600, 900), samples=SAMPLES):
    cam.location = loc
    cam.rotation_euler = (Vector(look_at) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.cycles.samples = samples
    sc.render.filepath = os.path.abspath(path)
    bpy.ops.render.render(write_still=True)
    log('render', path)


d = size * 1.15
if not os.environ.get('SIN_HORNEAR'):
    shot(OUT + '-muestra.jpg', center + Vector((d * 0.7, -d * 0.75, d * 0.95)), center)
# segunda toma: más cerca, sobre la sala (el sofá), en diagonal desde arriba
sofa_f = next((f for f in FURN if f['item'] == 'sofa'), None)
tgt = Vector((sofa_f['cx'], sofa_f['cy'], 0.4)) if sofa_f else center
if os.environ.get('DOS_TOMAS'):
    shot(OUT + '-muestra-2.jpg', tgt + Vector((1.9, -2.6, 3.0)), tgt + Vector((0.6, 0.2, 0)))

# ---------------------------------------------------------------- fotos y 360° por espacio
FOTOS = bool(os.environ.get('FOTOS'))
if FOTOS:
    import json

    WALL_TOP = 2.6
    win_rects = []
    for g in root.iter():
        if g.tag.endswith('g') and g.get('id') == 'openings':
            for r in g.iter():
                if r.tag.endswith('rect') and r.get('data-type') == 'window':
                    x, y = float(r.get('x')) * 0.01, float(r.get('y')) * 0.01
                    w, h = float(r.get('width')) * 0.01, float(r.get('height')) * 0.01
                    win_rects.append((x + w / 2 - PW / 2, -(y + h / 2 - PH / 2), max(w, h)))
    wall_rects = WALLS
    xs_w = [w['cx'] - w['sx'] / 2 for w in wall_rects] + [w['cx'] + w['sx'] / 2 for w in wall_rects]
    ys_w = [w['cy'] - w['sy'] / 2 for w in wall_rects] + [w['cy'] + w['sy'] / 2 for w in wall_rects]
    # techo (solo para las fotos): un plano blanco sobre los muros
    bpy.ops.mesh.primitive_plane_add(size=1, location=((min(xs_w) + max(xs_w)) / 2, (min(ys_w) + max(ys_w)) / 2, WALL_TOP))
    techo = bpy.context.active_object
    techo.scale = (max(xs_w) - min(xs_w), max(ys_w) - min(ys_w), 1)
    techo.data.materials.append(plain('techo-fotos', '#f2efe9', 0.9))
    # luz de techo suave por espacio, solo de relleno: ahora el sol y el cielo entran por las
    # ventanas (con 30 W/m² todo quedaba parejo y plano)
    luces = []
    for sid, poly in SPACES:
        if any(k in sid for k in ('balcon', 'terraza', 'deck', 'porche')):
            continue
        xs_ = [p_[0] for p_ in poly]
        ys_ = [p_[1] for p_ in poly]
        ld = bpy.data.lights.new(f'techo-{sid}', 'AREA')
        ld.shape = 'RECTANGLE'
        ld.size = max(0.5, (max(xs_) - min(xs_)) * 0.6)
        ld.size_y = max(0.5, (max(ys_) - min(ys_)) * 0.6)
        ld.energy = 7 * (max(xs_) - min(xs_)) * (max(ys_) - min(ys_))
        ld.color = srgb('#ffe6c4')
        lo = bpy.data.objects.new(f'techo-{sid}', ld)
        lo.location = ((max(xs_) + min(xs_)) / 2, (max(ys_) + min(ys_)) / 2, WALL_TOP - 0.05)
        sc.collection.objects.link(lo)
        luces.append(lo)

    def in_poly(px, py, poly):
        c = False
        for i in range(len(poly)):
            (x1, y1), (x2, y2) = poly[i], poly[i - 1]
            if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1 + 1e-12) + x1:
                c = not c
        return c

    def clearance(px, py, poly):
        d = 1e9
        for i in range(len(poly)):
            (ax, ay), (bx, by) = poly[i - 1], poly[i]
            vx, vy = bx - ax, by - ay
            t = max(0, min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy or 1)))
            d = min(d, math.hypot(px - ax - vx * t, py - ay - vy * t))
        for f in FURN:
            if f['item'] in ('rug',):
                continue
            dx = max(abs(px - f['cx']) - f['sx'] / 2, 0)
            dy = max(abs(py - f['cy']) - f['sy'] / 2, 0)
            d = min(d, math.hypot(dx, dy) + 0.15)
        return d

    def look(loc, target, lens, path, res, desenfoque=None):
        """Foto de arquitecto: cámara nivelada (verticales rectas); lo que sube o baja el encuadre lo
        hace el desplazamiento del lente, no inclinar la cámara. Con `desenfoque` (f), foco en el
        objetivo y poca profundidad de campo."""
        cam.data.type = 'PERSP'
        cam.data.lens = lens
        cam.data.sensor_fit = 'HORIZONTAL'
        dx, dy, dz = target[0] - loc[0], target[1] - loc[1], target[2] - loc[2]
        dist = max(math.hypot(dx, dy), 0.3)
        cam.data.shift_y = max(-0.3, min(0.3, dz / dist * lens / cam.data.sensor_width))
        cam.data.dof.use_dof = bool(desenfoque)
        if desenfoque:
            cam.data.dof.focus_distance = math.hypot(dist, dz)
            cam.data.dof.aperture_fstop = desenfoque
        shot(path, loc, (target[0], target[1], loc[2]), res=res, samples=max(24, SAMPLES // 2))
        cam.data.shift_y = 0
        cam.data.dof.use_dof = False

    # pieza principal de cada espacio para la foto de detalle (en este orden)
    PIEZAS = ['bed', 'sofa', 'sink', 'counter', 'kitchen', 'island', 'table', 'desk', 'coffee', 'armchair',
              'bathtub', 'shower', 'nightstand', 'lounger', 'bench', 'plant']
    ALTO_PIEZA = {'bed': 0.55, 'sofa': 0.5, 'sink': 0.9, 'counter': 0.9, 'kitchen': 0.9, 'island': 0.9,
                  'table': 0.75, 'desk': 0.75, 'coffee': 0.4, 'armchair': 0.5, 'bathtub': 0.55, 'shower': 1.0}

    sc.cycles.use_denoising = True
    info = {}
    # SOLO_ESPACIOS=sala,dormitorio: solo esos espacios (para probar mejoras rápido)
    solo = [s for s in os.environ.get('SOLO_ESPACIOS', '').split(',') if s]
    for sid, poly in SPACES:
        if solo and sid not in solo:
            continue
        outdoor = any(k in sid for k in ('balcon', 'terraza', 'deck', 'porche'))
        xs = [p[0] for p in poly]
        ys = [p[1] for p in poly]
        cand = []
        y0 = min(ys)
        while y0 <= max(ys):
            x0 = min(xs)
            while x0 <= max(xs):
                if in_poly(x0, y0, poly):
                    cand.append((x0, y0, clearance(x0, y0, poly)))
                x0 += 0.12
            y0 += 0.12
        if not cand:
            continue
        cxs, cys = sum(xs) / len(xs), sum(ys) / len(ys)
        # ventana del espacio: la más cercana a su polígono
        wins = sorted(win_rects, key=lambda w: min(math.hypot(w[0] - p[0], w[1] - p[1]) for p in poly))
        win = wins[0] if wins and min(math.hypot(wins[0][0] - p[0], wins[0][1] - p[1]) for p in poly) < 3 else None
        best = max(c[2] for c in cand)
        ok = [c for c in cand if c[2] >= min(0.55, best * 0.8)]
        # 360°: el punto más despejado, cerca del centro
        eye = max(ok, key=lambda c: c[2] - 0.15 * math.hypot(c[0] - cxs, c[1] - cys))
        target = (win[0], win[1], 1.3) if win else (cxs, cys, 1.0)
        # dirección hacia la ventana, en la convención del visor (escena: x = x, z = -y de Blender)
        yaw = math.atan2(-(target[1] - eye[1]), target[0] - eye[0])
        h = 1.15 if outdoor else 1.45  # el 360° (las fotos van a 1,4 m)
        cam.data.type = 'PANO'
        try:
            cam.data.panorama_type = 'EQUIRECTANGULAR'
        except AttributeError:
            cam.data.cycles.panorama_type = 'EQUIRECTANGULAR'
        cam.location = (eye[0], eye[1], h)
        # el centro de la imagen mira al norte del plano (+Y de Blender, -z de la escena)
        cam.rotation_euler = (math.radians(90), 0, 0)
        sc.render.resolution_x, sc.render.resolution_y = PANO_W, PANO_W // 2
        sc.cycles.samples = max(24, SAMPLES // 2)
        pano_path = os.path.abspath(f'{OUT}-{sid}-360.jpg')
        sc.render.filepath = pano_path.replace('-360.jpg', '-360-master.jpg') if PANO_W > PANO_WEB else pano_path
        bpy.ops.render.render(write_still=True)
        if PANO_W > PANO_WEB:
            # la web usa 2048 × 1024: el visor carga una sola imagen para todos los equipos y en el
            # celular el 360° no puede pasar de ahí (docs/CARGA.md §4). El maestro (8K) se guarda aparte.
            im = bpy.data.images.load(sc.render.filepath)
            im.scale(PANO_WEB, PANO_WEB // 2)
            im.filepath_raw = pano_path
            im.file_format = 'JPEG'
            im.save()
            bpy.data.images.remove(im)
        log('360', sid)
        # amplia: desde el punto despejado más lejano a la ventana, mirándola
        def tapado(c, t):
            """Cuántos de tres rayos (centro y ±28°, el ancho del lente de 24 mm) chocan con un muro
            en el primer metro y medio: una cámara metida en un pasillo ve medio cuadro de muro."""
            base = math.atan2(t[1] - c[1], t[0] - c[0])
            n = 0
            for da in (-0.49, 0.0, 0.49):
                a = base + da
                for k in range(3, 16):
                    px, py = c[0] + math.cos(a) * k * 0.1, c[1] + math.sin(a) * k * 0.1
                    if any(abs(px - w['cx']) < w['sx'] / 2 + 0.02 and abs(py - w['cy']) < w['sy'] / 2 + 0.02 for w in WALLS):
                        n += 1
                        break
            return n

        far = max(ok, key=lambda c: math.hypot(c[0] - target[0], c[1] - target[1]) + c[2] * 0.5 - 2.5 * tapado(c, target))
        h_foto = 1.15 if outdoor else 1.4
        look(Vector((far[0], far[1], h_foto)), (target[0], target[1], 1.05), 24, f'{OUT}-{sid}-amplia.jpg', FOTO)
        # detalle: desde cerca de la ventana, mirando hacia adentro, un poco más bajo
        # detalle: la pieza principal del espacio, desde unos 2 m, a 28 mm y con poco foco
        piezas = [f for f in FURN if f['item'] in PIEZAS and in_poly(f['cx'], f['cy'], poly)]
        if piezas:
            pz = min(piezas, key=lambda f: PIEZAS.index(f['item']))
            obj = (pz['cx'], pz['cy'], ALTO_PIEZA.get(pz['item'], 0.6))
            near = min(ok, key=lambda c: abs(math.hypot(c[0] - obj[0], c[1] - obj[1]) - 2.0) - c[2] * 0.2)
        else:
            obj = (cxs, cys, 0.7)
            near = min(ok, key=lambda c: math.hypot(c[0] - target[0], c[1] - target[1]) - c[2] * 0.3)
        look(Vector((near[0], near[1], 1.2 if not outdoor else 1.1)), obj, 28, f'{OUT}-{sid}-detalle.jpg', FOTO, desenfoque=2.2)
        info[sid] = {'yaw': round(yaw, 4), 'eye': [round(eye[0], 3), round(-eye[1], 3)]}
    json.dump(info, open(f'{OUT}-fotos.json', 'w'))
    bpy.data.objects.remove(techo, do_unlink=True)
    for lo in luces:
        bpy.data.objects.remove(lo, do_unlink=True)
    if os.environ.get('SIN_HORNEAR'):
        log('fotos listas (sin horneado)')
        sys.exit(0)

# ---------------------------------------------------------------- horneado
for o in [o for o in sc.objects if o.type == 'MESH' and o.modifiers]:
    bpy.context.view_layer.objects.active = o
    for mod in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
opaque = [o for o in sc.objects if o.type == 'MESH' and o.get('tipo') not in ('planta', 'vidrio', 'suelo')
          and not any(s.material in (M['vidrio'], vidrio_luz) for s in o.material_slots)]
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
# el visor recibe el vidrio de siempre (transmisión en glTF)
for o in sc.objects:
    if o.type == 'MESH':
        for s in o.material_slots:
            if s.material == vidrio_luz:
                s.material = M['vidrio']
bpy.ops.object.select_all(action='DESELECT')
for o in sc.objects:
    if o.type == 'MESH':
        o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.abspath(OUT + '.glb'), export_format='GLB', use_selection=True,
                          export_image_format='JPEG', export_jpeg_quality=86, export_apply=True)
log('GLB', OUT + '.glb', round(os.path.getsize(OUT + '.glb') / 1024), 'KB')
