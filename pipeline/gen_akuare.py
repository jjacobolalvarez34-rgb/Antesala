"""Planos y unidades del demo Akuare (D-058), sobre la huella real del catastro (35 × 20 m).

Unidades en cm, convención de CONTENIDO.md §4. Planta tipo: pasillo central a lo largo,
núcleo al centro del lado de atrás, 4 esquineras de 3 alcobas y 4 medianeras de 2 alcobas.
"""
import json
import sys

ROOT = sys.argv[1]  # content/hotels/akuare

def area(pts):
    a = 0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2 / 10000

def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


class Plan:
    def __init__(self, title, w, h):
        self.title, self.w, self.h = title, w, h
        self.walls, self.spaces, self.openings, self.furniture = [], [], [], []

    def wall(self, x0, y0, x1, y1):
        self.walls.append((min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0)))

    def space(self, id, pts, label=None, finish=None):
        self.spaces.append((id, pts, label, finish))

    def door(self, x0, y0, x1, y1):
        self.openings.append(('door', min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0)))

    def window(self, x0, y0, x1, y1):
        self.openings.append(('window', min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0)))

    def item(self, item, x0, y0, x1, y1, back=None):
        self.furniture.append((item, min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0), back))

    def svg(self):
        r = lambda v: round(v)
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}">', f'  <title>{self.title}</title>', '  <g id="walls">']
        out += [f'    <rect x="{r(x)}" y="{r(y)}" width="{r(w)}" height="{r(h)}"/>' for x, y, w, h in self.walls]
        out += ['  </g>', '  <g id="spaces">']
        for id, pts, label, finish in self.spaces:
            a = f' data-label="{label}"' if label else ''
            f = f' data-finish="{finish}"' if finish else ''
            p = ' '.join(f'{r(x)},{r(y)}' for x, y in pts)
            out.append(f'    <polygon id="{id}"{a}{f} points="{p}"/>')
        out += ['  </g>', '  <g id="openings">']
        out += [f'    <rect data-type="{t}" x="{r(x)}" y="{r(y)}" width="{r(w)}" height="{r(h)}"/>' for t, x, y, w, h in self.openings]
        out += ['  </g>', '  <g id="furniture">']
        for item, x, y, w, h, back in self.furniture:
            b = f' data-back="{back}"' if back else ''
            out.append(f'    <rect data-item="{item}"{b} x="{r(x)}" y="{r(y)}" width="{r(w)}" height="{r(h)}"/>')
        out += ['  </g>', '</svg>', '']
        return '\n'.join(out)


# ---------------------------------------------------------------- unidades tipo
# coordenadas locales: pasillo arriba (y = 0), fachada abajo (y = 920); en la
# esquinera, la segunda fachada a la izquierda (x = 0). Balcón afuera, abajo.

def dos_alcobas():
    W, D = 540, 920
    p = Plan('Apartamento de 2 alcobas · plano en centímetros', W, 1040)
    p.wall(0, 0, W, 15); p.wall(0, D - 15, W, D); p.wall(0, 0, 15, D); p.wall(W - 15, 0, W, D)
    p.wall(235, 15, 245, 245); p.wall(15, 235, 245, 245)          # baño
    p.wall(235, 245, 245, 560); p.wall(15, 550, 245, 560)         # alcoba 2
    p.wall(300, 560, 310, D - 15); p.wall(300, 560, W - 15, 570)  # alcoba principal
    sp = {
        'cocina': rect(245, 15, 525, 300),
        'bano': rect(15, 15, 235, 235),
        'alcoba-2': rect(15, 245, 235, 550),
        'sala': [(245, 300), (525, 300), (525, 560), (300, 560), (300, 905), (15, 905), (15, 560), (245, 560)],
        'alcoba': rect(310, 570, 525, 905),
        'balcon': rect(110, 920, 430, 1040),
    }
    for k, v in sp.items():
        p.space(k, v)
    p.door(395, 0, 485, 15)        # entrada
    p.door(235, 120, 245, 195)     # baño
    p.door(235, 400, 245, 480)     # alcoba 2
    p.door(400, 560, 480, 570)     # alcoba principal
    p.door(80, D - 15, 270, D)     # balcón
    p.window(345, D - 15, 500, D)
    # muebles
    p.item('kitchen', 260, 18, 520, 80, 'n')
    p.item('stool', 300, 150, 345, 195); p.item('stool', 360, 150, 405, 195)
    p.item('counter', 280, 120, 440, 150)
    p.item('shower', 18, 18, 108, 108, 'n'); p.item('toilet', 160, 18, 215, 85, 'n'); p.item('sink', 18, 150, 75, 230, 'w')
    p.item('bed', 18, 300, 118, 500, 'w'); p.item('nightstand', 18, 255, 60, 295); p.item('wardrobe', 170, 255, 230, 420, 'e')
    p.item('rug', 60, 640, 240, 860)
    p.item('sofa', 18, 640, 108, 860, 'w'); p.item('coffee', 140, 700, 220, 800)
    p.item('table', 340, 380, 450, 460)
    p.item('chair', 345, 335, 390, 375, 'n'); p.item('chair', 400, 335, 445, 375, 'n'); p.item('chair', 345, 465, 390, 505, 's'); p.item('chair', 400, 465, 445, 505, 's')
    p.item('bed', 330, 650, 520, 810, 'e'); p.item('nightstand', 470, 600, 518, 645); p.item('nightstand', 470, 815, 518, 860)
    p.item('wardrobe', 315, 575, 455, 630, 'n')
    p.item('plant', 120, 930, 170, 980); p.item('chair', 300, 960, 345, 1005, 'e'); p.item('chair', 360, 960, 405, 1005, 'w')
    return p, sp


def tres_alcobas():
    W, D = 800, 920
    p = Plan('Apartamento esquinero de 3 alcobas · plano en centímetros', W, 1040)
    p.wall(0, 0, W, 15); p.wall(0, D - 15, W, D); p.wall(0, 0, 15, D); p.wall(W - 15, 0, W, D)
    p.wall(290, 15, 300, 300); p.wall(15, 290, 290, 300)          # cocina
    p.wall(385, 15, 395, 245); p.wall(385, 235, 520, 245)          # baño
    p.wall(520, 15, 530, 560); p.wall(530, 300, W - 15, 310)       # alcobas 3 y 2
    p.wall(440, 560, W - 15, 570); p.wall(440, 570, 450, D - 15)   # alcoba principal
    sp = {
        'cocina': rect(15, 15, 290, 290),
        'bano': rect(395, 15, 520, 235),
        'alcoba-3': rect(530, 15, 785, 300),
        'alcoba-2': rect(530, 310, 785, 560),
        'sala': [(300, 15), (385, 15), (385, 245), (520, 245), (520, 560), (440, 560), (440, 905), (15, 905), (15, 300), (300, 300)],
        'alcoba': rect(450, 570, 785, 905),
        'balcon': rect(60, 920, 400, 1040),
    }
    for k, v in sp.items():
        p.space(k, v)
    p.door(302, 0, 382, 15)        # entrada
    p.door(290, 200, 300, 280)     # cocina
    p.door(420, 235, 500, 245)     # baño
    p.door(520, 200, 530, 280)     # alcoba 3
    p.door(520, 420, 530, 500)     # alcoba 2
    p.door(440, 600, 450, 680)     # alcoba principal
    p.door(110, D - 15, 340, D)    # balcón
    p.window(0, 60, 15, 240)       # cocina (fachada lateral)
    p.window(0, 380, 15, 860)      # sala (fachada lateral)
    p.window(490, D - 15, 750, D)  # alcoba principal
    p.item('kitchen', 18, 18, 285, 80, 'n'); p.item('counter', 18, 80, 80, 285, 'w')
    p.item('table', 120, 160, 220, 240)
    p.item('shower', 398, 18, 488, 108, 'n'); p.item('toilet', 455, 120, 515, 175, 'e'); p.item('sink', 398, 170, 450, 232, 'w')
    p.item('bed', 680, 30, 782, 230, 'e'); p.item('desk', 540, 30, 640, 85, 'n'); p.item('chair', 565, 90, 610, 135, 's')
    p.item('bed', 680, 330, 782, 530, 'e'); p.item('wardrobe', 540, 320, 600, 480, 'w')
    p.item('rug', 90, 560, 380, 840)
    p.item('sofa', 18, 560, 108, 840, 'w'); p.item('coffee', 150, 650, 250, 760); p.item('armchair', 300, 640, 385, 725, 'e')
    p.item('table', 200, 360, 360, 460)
    for cx in (210, 290):
        p.item('chair', cx, 315, cx + 45, 355, 'n'); p.item('chair', cx, 465, cx + 45, 505, 's')
    p.item('lamp', 30, 860, 70, 900)
    p.item('bed', 560, 650, 782, 830, 'e'); p.item('nightstand', 735, 600, 782, 645); p.item('nightstand', 735, 835, 782, 880)
    p.item('wardrobe', 455, 575, 520, 760, 'w')
    p.item('plant', 70, 930, 120, 980); p.item('lounger', 150, 950, 330, 1020, 's'); p.item('plant', 345, 930, 395, 980)
    return p, sp


SPACE = {
    'cocina': ('Cocina', 'cocina', 'Cocina abierta con barra, estufa y horno.', ['Barra para dos', 'Estufa y horno', 'Espacio para nevera']),
    'bano': ('Baño', 'bano', 'Baño con ducha y mueble de lavamanos.', ['Ducha', 'Mueble de lavamanos']),
    'alcoba-2': ('Alcoba 2', 'dormitorio', 'Alcoba sencilla con clóset.', ['Cama sencilla', 'Clóset']),
    'alcoba-3': ('Alcoba 3', 'dormitorio', 'Alcoba sencilla, sirve de estudio.', ['Cama sencilla', 'Escritorio']),
    'sala': ('Sala y comedor', 'sala', 'Sala comedor con salida al balcón.', ['Comedor para cuatro', 'Salida al balcón']),
    'alcoba': ('Alcoba principal', 'dormitorio', 'Alcoba principal con clóset y ventana a la fachada.', ['Cama doble', 'Clóset']),
    'balcon': ('Balcón', 'balcon', 'Balcón con baranda de vidrio.', ['Baranda de vidrio', 'Espacio para dos']),
}


def unit_spaces(uid, sp):
    out = []
    for k, pts in sp.items():
        name, typ, desc, feats = SPACE[k]
        out.append({
            'id': k, 'name': name, 'type': typ, 'areaM2': round(area(pts), 1), 'description': desc, 'features': feats,
            'media': [{
                'id': f'units-{uid}-{k}-1', 'kind': 'photo', 'src': f'media/units/{uid}/{k}-amplia.svg',
                'alt': f'{name}: vista general (imagen ilustrativa)', 'fidelity': 'ilustrativa', 'width': 1600, 'height': 1067,
            }],
        })
    return out


p2, sp2 = dos_alcobas()
p3, sp3 = tres_alcobas()
open(f'{ROOT}/plans/dos-alcobas.svg', 'w', encoding='utf8').write(p2.svg())
open(f'{ROOT}/plans/tres-alcobas.svg', 'w', encoding='utf8').write(p3.svg())

# ---------------------------------------------------------------- plantas de piso
FW, FD = 3500, 2000
BACK_Y, FRONT_Y = 920, 1080  # bordes del pasillo
SLOTS = {
    # posición: (x0 en el piso, ancho, lado, espejo horizontal)
    'esq-atras-izq': (0, 800, 'atras', False),
    'med-atras-izq': (800, 540, 'atras', False),
    'med-atras-der': (2160, 540, 'atras', True),
    'esq-atras-der': (2700, 800, 'atras', True),
    'esq-frente-izq': (0, 800, 'frente', False),
    'med-frente-izq': (800, 540, 'frente', False),
    'med-frente-der': (2160, 540, 'frente', True),
    'esq-frente-der': (2700, 800, 'frente', True),
}


def place(slot, plan, unit_id, fp):
    x0, w, side, mirror = SLOTS[slot]
    def tx(x, y):
        X = x0 + (w - x if mirror else x)
        Y = BACK_Y - y if side == 'atras' else FRONT_Y + y
        return X, Y
    def trect(x, y, rw, rh):
        a = tx(x, y); b = tx(x + rw, y + rh)
        return min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])
    for (x, y, rw, rh) in plan.walls:
        # solo muros interiores: los de borde los pone la planta del piso
        if x <= 0 or y <= 0 or x + rw >= w or y + rh >= 920:
            continue
        fp.wall(*trect(x, y, rw, rh))
    for (t, x, y, rw, rh) in plan.openings:
        if y >= 920:
            continue
        a = trect(x, y, rw, rh)
        # el hueco del balcón queda como ventana (el balcón se ve en la fachada)
        fp.openings.append(('window' if (t == 'door' and y + rh >= 920 and y > 0) else t, a[0], a[1], a[2] - a[0], a[3] - a[1]))
    for (item, x, y, rw, rh, back) in plan.furniture:
        if y >= 920:
            continue
        b = back
        if b:
            if side == 'atras' and b in ('n', 's'):
                b = 's' if b == 'n' else 'n'
            if mirror and b in ('e', 'w'):
                b = 'w' if b == 'e' else 'e'
        a = trect(x, y, rw, rh)
        fp.item(item, a[0], a[1], a[2], a[3], b)
    X0, Y0, X1, Y1 = trect(15, 15, w - 30, 890)
    fp.space(unit_id, rect(X0, Y0, X1, Y1), None, 'madera')


def floor(n, units):
    fp = Plan(f'Piso {n} · planta', FW, FD)
    fp.wall(0, 0, FW, 20); fp.wall(0, FD - 20, FW, FD); fp.wall(0, 0, 20, FD); fp.wall(FW - 20, 0, FW, FD)
    fp.wall(20, BACK_Y - 15, FW - 20, BACK_Y); fp.wall(20, FRONT_Y, FW - 20, FRONT_Y + 15)
    for x in (800, 1340, 2160, 2700):
        fp.wall(x - 5, 20, x + 5, BACK_Y - 15)
    for x in ((800, 1340, 1620) if n == 1 else (800, 2700)):
        fp.wall(x - 5, FRONT_Y + 15, x + 5, FD - 20)
    fp.space('pasillo', rect(20, BACK_Y, FW - 20, FRONT_Y), 'Pasillo', 'baldosa')
    fp.space('nucleo', rect(1345, 20, 2155, BACK_Y - 15), 'Escalera y ascensores', 'concreto')
    fp.item('stairs', 1360, 40, 1700, 880, 'n')
    fp.item('elevator', 1760, 60, 1960, 260, 'e'); fp.item('elevator', 1760, 300, 1960, 500, 'e')
    fp.door(1800, BACK_Y - 15, 1950, BACK_Y); fp.door(1450, BACK_Y - 15, 1600, BACK_Y)
    fp.window(0, BACK_Y + 30, 20, FRONT_Y - 30); fp.window(FW - 20, BACK_Y + 30, FW, FRONT_Y - 30)
    fp.item('plant', 40, BACK_Y + 30, 100, BACK_Y + 90); fp.item('plant', FW - 100, BACK_Y + 30, FW - 40, BACK_Y + 90)
    for slot, uid in units.items():
        plan = p3 if slot.startswith('esq') else p2
        place(slot, plan, uid, fp)
    if n == 1:
        # frente del primer piso, como la fachada real (D-059): parqueadero tras las persianas,
        # un local con vitrina y una portería pequeña tras la puerta; el salón social va atrás
        fp.space('parqueadero-1', rect(20, FRONT_Y + 15, 795, FD - 20), 'Parqueadero', 'concreto')
        fp.space('local', rect(805, FRONT_Y + 15, 1335, FD - 20), 'Local comercial', 'baldosa')
        fp.space('lobby', rect(1345, FRONT_Y + 15, 1615, FD - 20), 'Portería', 'piedra')
        fp.space('parqueadero-2', rect(1625, FRONT_Y + 15, FW - 20, FD - 20), 'Parqueadero', 'concreto')
        fp.door(1395, FD - 20, 1510, FD); fp.door(1420, FRONT_Y, 1540, FRONT_Y + 15)
        fp.door(100, FD - 20, 760, FD); fp.door(1700, FD - 20, 3400, FD)
        fp.window(840, FD - 20, 1300, FD)
        fp.item('reception', 1360, 1700, 1600, 1780, 's'); fp.item('plant', 1550, 1150, 1600, 1200)
        fp.item('shelf', 830, 1150, 1310, 1200, 'n'); fp.item('table', 950, 1500, 1200, 1600)
        for cx in range(80, 700, 260):
            fp.item('rug', cx, 1200, cx + 200, 1850)
        for cx in range(1700, 3400, 270):
            fp.item('rug', cx, 1200, cx + 210, 1850)
        # salón social y BBQ en la esquina de atrás a la derecha
        fp.space('salon-social', rect(2705, 20, FW - 20, BACK_Y - 15), 'Salón social y BBQ', 'baldosa')
        fp.door(2900, BACK_Y - 15, 3020, BACK_Y)
        fp.item('bar', 2730, 40, 3460, 110, 'n')
        for tx_, ty in ((2760, 300), (3100, 300), (2760, 600), (3100, 600)):
            fp.item('table', tx_, ty, tx_ + 160, ty + 90)
            fp.item('chair', tx_ + 20, ty - 50, tx_ + 65, ty - 8, 'n'); fp.item('chair', tx_ + 95, ty - 50, tx_ + 140, ty - 8, 'n')
            fp.item('chair', tx_ + 20, ty + 98, tx_ + 65, ty + 140, 's'); fp.item('chair', tx_ + 95, ty + 98, tx_ + 140, ty + 140, 's')
    else:
        fp.wall(1335, FRONT_Y + 15, 1345, FD - 20); fp.wall(2155, FRONT_Y + 15, 2165, FD - 20)
        fp.space('ductos', rect(1345, FRONT_Y + 15, 2155, FD - 20), 'Shut de basuras y depósitos', 'concreto')
        fp.door(1700, FRONT_Y, 1800, FRONT_Y + 15)
        fp.item('shelf', 1360, 1700, 1600, 1760, 's'); fp.item('shelf', 1900, 1700, 2140, 1760, 's')
    return fp


# ---------------------------------------------------------------- unidades
EXT = {
    'esq-atras-izq': [{'facade': 2, 'windows': [10, 11, 12]}, {'facade': 3, 'windows': [0, 1, 2]}],
    'med-atras-izq': [{'facade': 2, 'windows': [8, 9]}],
    'med-atras-der': [{'facade': 2, 'windows': [3, 4]}],
    'esq-atras-der': [{'facade': 2, 'windows': [0, 1, 2]}, {'facade': 1, 'windows': [4, 5, 6]}],
    'esq-frente-izq': [{'facade': 0, 'windows': [0, 1, 2]}, {'facade': 3, 'windows': [4, 5, 6]}],
    'med-frente-izq': [{'facade': 0, 'windows': [3, 4]}],
    'med-frente-der': [{'facade': 0, 'windows': [8, 9]}],
    'esq-frente-der': [{'facade': 0, 'windows': [10, 11, 12]}, {'facade': 1, 'windows': [0, 1, 2]}],
}
VIEW = {
    'atras': 'Hacia el interior de la manzana: la más silenciosa.',
    'frente': 'Hacia la Calle 158.',
}
ORDER = list(SLOTS.keys())
SOLD = {'102', '104', '203', '205', '207', '301', '304', '306', '402', '405', '408', '503', '506'}

hotel = json.load(open(f'{ROOT}/hotel.json', encoding='utf8'))
units = []
templates = {}
floor_units = {}
for n in range(1, 6):
    slots = ORDER[:3] if n == 1 else ORDER
    floor_units[n] = {}
    for i, slot in enumerate(slots, start=1):
        uid = f'{n}{i:02d}'
        floor_units[n][slot] = uid
        corner = slot.startswith('esq')
        cat = 'tres-alcobas' if corner else 'dos-alcobas'
        side = SLOTS[slot][2]
        price = (255_000_000 + (n - 2) * 3_000_000) if corner else (160_000_000 + (n - 2) * 2_000_000)
        view = ('Esquinero, con dos fachadas. ' if corner else '') + VIEW[side]
        name = f'Apartamento {uid}'
        if cat not in templates:
            sp = sp3 if corner else sp2
            templates[cat] = uid
            u = {
                'id': uid, 'name': name, 'categoryId': cat, 'levelId': str(n),
                'capacity': 6 if corner else 4, 'beds': '3 alcobas · 2 baños' if corner else '2 alcobas · 1 baño',
                'areaM2': 73 if corner else 50, 'basePriceCOP': price, 'view': view,
                'plan': 'plans/tres-alcobas.svg' if corner else 'plans/dos-alcobas.svg',
                'exterior': EXT[slot], 'spaces': unit_spaces(uid, sp),
            }
        else:
            u = {'sameAs': templates[cat], 'id': uid, 'name': name, 'levelId': str(n), 'basePriceCOP': price, 'view': view, 'exterior': EXT[slot]}
        if uid in SOLD:
            u['occupied'] = True
        units.append(u)

for n in range(1, 6):
    open(f'{ROOT}/plans/piso-{n}.svg', 'w', encoding='utf8').write(floor(n, floor_units[n]).svg())

hotel['units'] = units
hotel['offer'] = 'venta'
hotel['site']['building']['style'] = {'cladding': 'ladrillo', 'ground': 'residencial'}
hotel['levels'] = [{'id': str(n), 'name': f'Piso {n}', 'kind': 'piso', 'order': n, 'plan': f'plans/piso-{n}.svg'} for n in range(1, 6)]
hotel['categories'] = [
    {'id': 'tres-alcobas', 'name': 'Tres alcobas', 'tagline': 'Esquinero, con dos fachadas y balcón.', 'highlights': ['3 alcobas y 2 baños', 'Dos fachadas', 'Balcón']},
    {'id': 'dos-alcobas', 'name': 'Dos alcobas', 'tagline': 'Compacto y bien distribuido, con balcón.', 'highlights': ['2 alcobas', 'Cocina abierta con barra', 'Balcón']},
]
hotel['site']['pois'] = [
    {'id': 'lobby', 'name': 'Portería', 'levelId': '1', 'description': 'Entrada pequeña con portería las 24 horas; el ascensor queda al fondo del pasillo.', 'position': [14.8, 1.5, 17.5], 'media': []},
    {'id': 'salon-social', 'name': 'Salón social y BBQ', 'levelId': '1', 'description': 'Salón para reuniones con zona de BBQ, en el primer piso.', 'position': [31, 1.5, 4.6], 'media': []},
]
hotel['info'] = {
    'address': 'Calle 158 # 93A-37, Suba Salitre, Bogotá.',
    'nearby': [
        {'name': 'Supermercados Olímpica, D1 y Ara', 'time': 'sobre la Carrera 92'},
        {'name': 'Rutas del SITP y TransMilenio', 'time': 'a pocas cuadras'},
    ],
    'amenities': ['Portería las 24 horas', 'Ascensor', 'Salón social con BBQ', 'Parqueadero', 'Depósito', 'Balcón en todos los apartamentos'],
    'policies': [
        'Precios de referencia simulados para la demostración.',
        'Los interiores son ilustrativos: la distribución real puede cambiar.',
        'El edificio (forma y pisos) viene del catastro de Bogotá.',
    ],
    'faq': [
        {'q': '¿Este es el sitio oficial del edificio?', 'a': 'No. Es una demostración de Antesala hecha con datos públicos: la forma y los pisos del catastro de Bogotá y las calles de OpenStreetMap.'},
        {'q': '¿Puedo ver el apartamento exacto?', 'a': 'Sí. En el recorrido eliges el piso y el apartamento, con su fachada, su vista y su precio de referencia.'},
        {'q': '¿Cómo agendo una visita?', 'a': 'Con el botón "Agendar visita": el mensaje de WhatsApp ya dice qué apartamento te interesa.'},
    ],
}
json.dump(hotel, open(f'{ROOT}/hotel.json', 'w', encoding='utf8'), ensure_ascii=False, indent=2)
open(f'{ROOT}/hotel.json', 'a', encoding='utf8').write('\n')
print('unidades', len(units), 'vendidas', sum(1 for u in units if u.get('occupied')))
print('areas 2 alcobas', {k: round(area(v), 1) for k, v in sp2.items()}, 'total', round(sum(area(v) for v in sp2.values()), 1))
print('areas 3 alcobas', {k: round(area(v), 1) for k, v in sp3.items()}, 'total', round(sum(area(v) for v in sp3.values()), 1))
