"""
3D realista (D-074): maqueta de una unidad (GLB exportado del visor) → materiales
reales, luz de cielo real, render de muestra y luz horneada en una textura.

Uso (Blender en D:):
  D:/Herramientas/blender-5.2.4-windows-x64/blender.exe -b -P pipeline/realista/hornear.py -- \
      .tmp/realista/niebla-alta-402.glb content/hotels/niebla-alta/media/realista/402 [muestras]

Salidas: <salida>.glb (horneado), <salida>-muestra.jpg (render de muestra).
"""
import math
import os
import sys
import time

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = argv[0], argv[1]
SAMPLES = int(argv[2]) if len(argv) > 2 else 96
HDRI = os.path.abspath('public/visor/env/dia.hdr')
os.makedirs(os.path.dirname(OUT), exist_ok=True)
t0 = time.time()


def log(*a):
    print(f'[hornear {time.time() - t0:6.1f}s]', *a, flush=True)


# --- escena limpia e importación
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(SRC))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
log('mallas', len(meshes))

# fuera el cielo raso: la maqueta se ve desde arriba y la luz del cielo entra
for o in list(meshes):
    if any(s.material and s.material.name.startswith('techo') for s in o.material_slots):
        bpy.data.objects.remove(o, do_unlink=True)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']


# --- materiales reales por nombre (los nombres vienen del visor)
def principled(name, color=None, rough=0.8, metal=0.0, trans=0.0, keep=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    if color is None and keep is not None:
        color = tuple(keep.diffuse_color)
    if color is not None:
        b.inputs['Base Color'].default_value = (*color[:3], 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if trans:
        b.inputs['Transmission Weight'].default_value = trans
    return m


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def wood(name):
    """Madera de piso: tablas con veta (procedural, sin texturas que descargar)."""
    m = principled(name, srgb('#a5794f'), 0.45)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexWave')
    tex.wave_type = 'BANDS'
    tex.inputs['Scale'].default_value = 6
    tex.inputs['Distortion'].default_value = 6
    tex.inputs['Detail'].default_value = 3
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*srgb('#8a6038'), 1)
    ramp.color_ramp.elements[1].color = (*srgb('#c49a6c'), 1)
    nt.links.new(tex.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    return m


plaster = principled('muro', srgb('#ece7de'), 0.92)
tile = principled('baldosa', srgb('#dcd8d1'), 0.25)
glass = principled('vidrio', srgb('#dfeeee'), 0.03, trans=1.0)
metal = principled('metal', srgb('#2e2b28'), 0.35, metal=1.0)
door = principled('puerta', srgb('#6b4a2f'), 0.5)
floor_wood = wood('madera')
cache = {}
for o in meshes:
    for s in o.material_slots:
        n = s.material.name if s.material else ''
        if n.startswith('muros'):
            s.material = plaster
        elif n.startswith('piso-tile'):
            s.material = tile
        elif n.startswith('piso-'):
            s.material = floor_wood
        elif n in ('vidrio', 'mueble-glass') or 'glass' in n:
            s.material = glass
        elif n.startswith('baranda') or n == 'mueble-metal':
            s.material = metal
        elif n.startswith('puertas'):
            s.material = door
        elif n.startswith('mueble-') and s.material:
            key = n
            if key not in cache:
                fabric = any(k in n for k in ('fabric', 'linen', 'sofa', 'bed', 'textile'))
                cache[key] = principled('m-' + n, keep=s.material, rough=0.9 if fabric else 0.55)
            s.material = cache[key]
    for p in o.data.polygons:
        p.use_smooth = False

# --- encuadre (como la maqueta del visor: desde arriba, en diagonal)
mins = Vector((1e9, 1e9, 1e9))
maxs = Vector((-1e9, -1e9, -1e9))
for o in meshes if all(o.name in bpy.data.objects for o in meshes) else []:
    for v in o.bound_box:
        w = o.matrix_world @ Vector(v)
        mins = Vector(map(min, mins, w))
        maxs = Vector(map(max, maxs, w))
center = (mins + maxs) / 2
size = max(maxs.x - mins.x, maxs.y - mins.y)
cam_data = bpy.data.cameras.new('cam')
cam_data.lens = 35
cam = bpy.data.objects.new('cam', cam_data)
bpy.context.scene.collection.objects.link(cam)
dist = size * 1.25
cam.location = center + Vector((dist * 0.75, -dist * 0.75, dist * 0.95))
cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
bpy.context.scene.camera = cam

# --- luz: cielo real (el mismo HDRI del visor) y sol de tarde
world = bpy.data.worlds.new('cielo')
world.use_nodes = True
wn = world.node_tree.nodes
env = wn.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(HDRI)
world.node_tree.links.new(env.outputs['Color'], wn['Background'].inputs['Color'])
wn['Background'].inputs['Strength'].default_value = 1.0
bpy.context.scene.world = world
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 3.2
sun.data.angle = math.radians(3)
sun.data.color = srgb('#fff1dc')
sun.rotation_euler = (math.radians(50), 0, math.radians(35))
bpy.context.scene.collection.objects.link(sun)

sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Medium High Contrast'

# --- 1) render de muestra (lo que debería verse en Premium)
sc.render.resolution_x, sc.render.resolution_y = 1280, 720
sc.render.image_settings.file_format = 'JPEG'
sc.render.image_settings.quality = 88
sc.render.filepath = os.path.abspath(OUT + '-muestra.jpg')
log('render de muestra', SAMPLES, 'muestras')
bpy.ops.render.render(write_still=True)
log('muestra lista', sc.render.filepath)

# --- 2) horneado: todo lo opaco en un objeto, un mapa de luz, una textura
opaque = [o for o in sc.objects if o.type == 'MESH' and not any(s.material == glass for s in o.material_slots)]
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
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
bpy.ops.object.mode_set(mode='OBJECT')

RES = 2048
img = bpy.data.images.new('luz', RES, RES)
for s in obj.material_slots:
    nt = s.material.node_tree
    node = nt.nodes.new('ShaderNodeTexImage')
    node.image = img
    nt.nodes.active = node
sc.cycles.samples = max(32, SAMPLES // 2)
sc.render.bake.margin = 6
log('horneando', RES, 'px')
bpy.ops.object.bake(type='COMBINED', pass_filter={'DIRECT', 'INDIRECT', 'DIFFUSE', 'GLOSSY', 'TRANSMISSION', 'EMIT'})
img.filepath_raw = os.path.abspath(OUT + '-luz.png')
img.file_format = 'PNG'
img.save()
log('horneado listo')

# un solo material con la textura horneada (el visor lo muestra sin iluminar)
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
# solo queda el mapa de luz como UV 0
for layer in [layer for layer in obj.data.uv_layers if layer.name != 'luz']:
    obj.data.uv_layers.remove(layer)

bpy.ops.object.select_all(action='DESELECT')
for o in sc.objects:
    if o.type == 'MESH':
        o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=os.path.abspath(OUT + '.glb'),
    export_format='GLB',
    use_selection=True,
    export_image_format='JPEG',
    export_jpeg_quality=86,
    export_apply=True,
)
log('GLB', OUT + '.glb', round(os.path.getsize(OUT + '.glb') / 1024), 'KB')
