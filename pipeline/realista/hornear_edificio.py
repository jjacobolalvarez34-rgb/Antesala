"""
3D realista (D-074): la fachada del edificio horneada por piso.

Del GLB del visor (grupo "edificio") se toman solo las partes opacas marcadas
h-losa, h-fachada y h-cubierta. Se juntan por piso (piso-<id>-losa,
piso-<id>-fachada) y la cubierta, se hornea la luz de cielo y sol con los
materiales que trae el visor (ladrillo, concreto) y se exporta un GLB con un
nodo por pieza. Las ventanas no se hornean: siguen por código (se encienden de noche).

Uso: blender.exe -b -P pipeline/realista/hornear_edificio.py -- <edificio.glb> <salida> [muestras]
"""
import math
import os
import sys
import time

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = argv[0], argv[1]
SAMPLES = int(argv[2]) if len(argv) > 2 else 40
HDRI = os.path.abspath('public/visor/env/dia.hdr')
T0 = time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)


def log(*a):
    print(f'[edificio {time.time() - T0:6.1f}s]', *a, flush=True)


bpy.ops.import_scene.gltf(filepath=os.path.abspath(SRC))
sc = bpy.context.scene


def key_of(o):
    if not o.name.startswith('h-'):
        return None
    kind = o.name.split('.')[0][2:]  # losa | fachada | cubierta
    p = o.parent
    while p is not None:
        if p.name.startswith('piso-'):
            return f"{p.name.split('.')[0]}-{kind}"
        p = p.parent
    return 'cubierta' if kind == 'cubierta' else None


groups = {}
for o in list(sc.objects):
    if o.type != 'MESH':
        continue
    k = key_of(o)
    if k:
        groups.setdefault(k, []).append(o)
keep = {o for objs in groups.values() for o in objs}
for o in list(sc.objects):
    if o.type == 'MESH' and o not in keep:
        bpy.data.objects.remove(o, do_unlink=True)
# fuera la jerarquía: transformaciones aplicadas, todo en coordenadas del edificio
for o in keep:
    mw = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = mw
for o in [o for o in sc.objects if o.type != 'MESH']:
    bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in keep:
    o.select_set(True)
bpy.context.view_layer.objects.active = next(iter(keep))
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

joined = {}
for k, objs in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = k
    joined[k] = ob
log('piezas', sorted(joined))

# --- luz
mins, maxs = Vector((1e9,) * 3), Vector((-1e9,) * 3)
for ob in joined.values():
    for v in ob.bound_box:
        w = ob.matrix_world @ Vector(v)
        mins, maxs = Vector(map(min, mins, w)), Vector(map(max, maxs, w))
center = (mins + maxs) / 2
size = max(maxs.x - mins.x, maxs.y - mins.y, maxs.z - mins.z)
bpy.ops.mesh.primitive_plane_add(size=size * 8, location=(center.x, center.y, mins.z - 0.05))
suelo = bpy.context.active_object
gm = bpy.data.materials.new('suelo')
gm.use_nodes = True
gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.42, 0.41, 0.39, 1)
suelo.data.materials.append(gm)

world = bpy.data.worlds.new('cielo')
sc.world = world
world.use_nodes = True
env = world.node_tree.nodes.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(HDRI)
world.node_tree.links.new(env.outputs['Color'], world.node_tree.nodes['Background'].inputs['Color'])
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
sun.data.energy = 3.0
sun.data.angle = math.radians(3)
sun.data.color = (1.0, 0.95, 0.88)
sun.rotation_euler = (math.radians(52), 0, math.radians(-35))
sc.collection.objects.link(sun)
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.use_denoising = True
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Base Contrast'

# --- render de muestra (la fachada principal, en diagonal)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
cam.data.lens = 35
sc.collection.objects.link(cam)
sc.camera = cam
cam.location = center + Vector((size * 0.9, -size * 1.4, size * 0.45))
cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.resolution_x, sc.render.resolution_y = 1600, 900
sc.cycles.samples = SAMPLES
sc.render.image_settings.file_format = 'JPEG'
sc.render.filepath = os.path.abspath(OUT + '-muestra.jpg')
bpy.ops.render.render(write_still=True)
log('muestra')

# --- horneado por pieza
sc.cycles.samples = SAMPLES
sc.render.bake.margin = 4
for k, ob in joined.items():
    res = 2048 if k.endswith('fachada') else 1024
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    uv = ob.data.uv_layers.new(name='luz')
    ob.data.uv_layers.active = uv
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003)
    bpy.ops.object.mode_set(mode='OBJECT')
    img = bpy.data.images.new(f'luz-{k}', res, res)
    for s in ob.material_slots:
        nt = s.material.node_tree
        node = nt.nodes.new('ShaderNodeTexImage')
        node.image = img
        nt.nodes.active = node
    bpy.ops.object.bake(type='COMBINED', pass_filter={'DIRECT', 'INDIRECT', 'DIFFUSE', 'GLOSSY', 'EMIT'})
    baked = bpy.data.materials.new(f'horneado-{k}')
    baked.use_nodes = True
    bn = baked.node_tree.nodes
    tex = bn.new('ShaderNodeTexImage')
    tex.image = img
    uvn = bn.new('ShaderNodeUVMap')
    uvn.uv_map = 'luz'
    baked.node_tree.links.new(uvn.outputs['UV'], tex.inputs['Vector'])
    baked.node_tree.links.new(tex.outputs['Color'], bn['Principled BSDF'].inputs['Base Color'])
    ob.data.materials.clear()
    ob.data.materials.append(baked)
    for layer in [layer for layer in ob.data.uv_layers if layer.name != 'luz']:
        ob.data.uv_layers.remove(layer)
    img.pack()
    log('horneado', k, res)

bpy.data.objects.remove(suelo, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for ob in joined.values():
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.abspath(OUT + '.glb'), export_format='GLB', use_selection=True,
                          export_image_format='JPEG', export_jpeg_quality=86)
log('GLB', OUT + '.glb', round(os.path.getsize(OUT + '.glb') / 1024), 'KB')
