"""Demo de hotel de lujo alto (D-085): Hotel Cénit, torre angosta de 15 pisos (ficticio).

Planta de 16,2 × 13,5 m (6 × 5 módulos de 2,7 m). Piso 1: lobby, restaurante y bar. Piso 2: spa y
gimnasio. Pisos 3 a 15: dos Deluxe King adelante (esquineras, 5 ventanas) y dos Superior atrás
(esquineras, 4 ventanas), con el pasillo al medio y el núcleo atrás.

Genera desde una sola fuente los planos de las cuatro habitaciones (las de la derecha, en espejo),
las plantas de cada piso y las unidades de hotel.json. Cada ventana del plano cae en el centro de un
módulo de la fachada (regla 9).

Uso: python pipeline/gen_cenit.py content/hotels/cenit
"""
import json
import os
import sys

ROOT = sys.argv[1]
M = 270  # módulo de fachada (cm)
FW, FD = 6 * M, 5 * M  # 1620 × 1350
FLOORS = 15


def area(pts):
    a = 0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        a += x1 * y2 - x2 * y1
    return round(abs(a) / 2 / 10000, 1)


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


class Plan:
    def __init__(self, title, w, h):
        self.title, self.w, self.h = title, w, h
        self.walls, self.spaces, self.openings, self.furniture = [], [], [], []

    def wall(self, x0, y0, x1, y1):
        self.walls.append((min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0)))

    def perimeter(self, w, d, t=15):
        self.wall(0, 0, w, t)
        self.wall(0, d - t, w, d)
        self.wall(0, 0, t, d)
        self.wall(w - t, 0, w, d)

    def space(self, id, pts, finish='madera', label=None):
        self.spaces.append((id, pts, finish, label))

    def door(self, x0, y0, x1, y1):
        self.openings.append(('door', min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0)))

    def window(self, x0, y0, x1, y1):
        self.openings.append(('window', min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0)))

    def item(self, item, x0, y0, x1, y1, back=None):
        self.furniture.append((item, min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0), back))

    def mirrored(self, title):
        """Espejo horizontal (la habitación de la derecha)."""
        W = self.w
        m = Plan(title, self.w, self.h)
        m.walls = [(W - x - w, y, w, h) for x, y, w, h in self.walls]
        m.spaces = [(i, [(W - x, y) for x, y in reversed(pts)], f, l) for i, pts, f, l in self.spaces]
        m.openings = [(t, W - x - w, y, w, h) for t, x, y, w, h in self.openings]
        flip = {'e': 'w', 'w': 'e'}
        m.furniture = [(it, W - x - w, y, w, h, flip.get(b, b) if b else b) for it, x, y, w, h, b in self.furniture]
        return m

    def svg(self):
        r = round
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}">', f'  <title>{self.title}</title>', '  <g id="walls">']
        out += [f'    <rect x="{r(x)}" y="{r(y)}" width="{r(w)}" height="{r(h)}"/>' for x, y, w, h in self.walls]
        out += ['  </g>', '  <g id="spaces">']
        for id, pts, finish, label in self.spaces:
            lab = f' data-label="{label}"' if label else ''
            p = ' '.join(f'{r(x)},{r(y)}' for x, y in pts)
            out.append(f'    <polygon id="{id}"{lab} data-finish="{finish}" points="{p}"/>')
        out += ['  </g>', '  <g id="openings">']
        out += [f'    <rect data-type="{t}" x="{r(x)}" y="{r(y)}" width="{r(w)}" height="{r(h)}"/>' for t, x, y, w, h in self.openings]
        out += ['  </g>', '  <g id="furniture">']
        for item, x, y, w, h, back in self.furniture:
            b = f' data-back="{back}"' if back else ''
            out.append(f'    <rect data-item="{item}"{b} x="{r(x)}" y="{r(y)}" width="{r(w)}" height="{r(h)}"/>')
        out += ['  </g>', '</svg>', '']
        return '\n'.join(out)


def win_h(p, cx, y0, y1, w=170):
    p.window(cx - w / 2, y0, cx + w / 2, y1)


def win_v(p, cy, x0, x1, w=170):
    p.window(x0, cy - w / 2, x1, cy + w / 2)


# ------------------------------------------------------------------ habitaciones
def deluxe():
    """Deluxe King, esquinera de adelante (izquierda). Fachada: abajo (3 módulos) y a la izquierda (2)."""
    W, D = 3 * M, 2 * M  # 810 × 540
    p = Plan('Deluxe King · plano en centímetros', W, D)
    p.perimeter(W, D)
    p.wall(290, 15, 300, 290)       # vestier
    p.wall(550, 15, 560, 290)       # baño
    p.wall(300, 280, 795, 290)
    p.space('habitacion', [(15, 15), (290, 15), (290, 290), (795, 290), (795, 525), (15, 525)])
    p.space('vestier', rect(300, 15, 550, 280))
    p.space('bano', rect(560, 15, 795, 280), 'baldosa')
    p.door(60, 0, 150, 15)          # entrada desde el pasillo
    p.door(380, 280, 460, 290)
    p.door(610, 280, 690, 290)
    for cx in (135, 405, 675):
        win_h(p, cx, D - 15, D)
    for cy in (135, 405):
        win_v(p, cy, 0, 15)
    p.item('bed', 420, 300, 620, 500, 'n')
    p.item('nightstand', 365, 300, 410, 345)
    p.item('nightstand', 630, 300, 675, 345)
    p.item('armchair', 40, 330, 130, 420)
    p.item('coffee', 150, 360, 220, 430)
    p.item('desk', 700, 300, 790, 440, 'e')
    p.item('chair', 650, 350, 695, 395, 'e')
    p.item('console', 20, 40, 80, 200, 'w')
    p.item('rug', 380, 300, 660, 520)
    p.item('wardrobe', 310, 20, 540, 80, 'n')
    p.item('bench', 380, 160, 480, 210)
    p.item('bathtub', 600, 20, 790, 100, 'n')
    p.item('sink', 720, 130, 790, 260, 'e')
    p.item('toilet', 570, 215, 610, 270, 's')
    p.item('plant', 220, 470, 265, 515)
    spaces = [
        ('habitacion', 'Habitación', 'dormitorio', 'Cama king frente a cinco ventanas de piso a techo, en la esquina de la torre.', ['Cama king', 'Sala de lectura', 'Escritorio']),
        ('vestier', 'Vestier', 'vestier', 'Vestier con clóset abierto y banca.', ['Clóset abierto', 'Banca']),
        ('bano', 'Baño', 'bano', 'Baño con tina, mármol y lavamanos amplio.', ['Tina', 'Mármol', 'Amenidades de la casa']),
    ]
    return p, spaces


def superior():
    """Superior, esquinera de atrás (izquierda). Fachada: arriba (2 módulos) y a la izquierda (2)."""
    W, D = 2 * M, 2 * M  # 540 × 540
    p = Plan('Superior · plano en centímetros', W, D)
    p.perimeter(W, D)
    p.wall(320, 330, 330, 525)      # baño
    p.wall(330, 320, 525, 330)
    p.space('habitacion', [(15, 15), (525, 15), (525, 320), (320, 320), (320, 525), (15, 525)])
    p.space('bano', rect(330, 330, 525, 525), 'baldosa')
    p.door(160, D - 15, 250, D)     # entrada desde el pasillo
    p.door(320, 400, 330, 480)
    for cx in (135, 405):
        win_h(p, cx, 0, 15)
    for cy in (135, 405):
        win_v(p, cy, 0, 15)
    p.item('bed', 325, 60, 525, 220, 'e')
    p.item('nightstand', 480, 15, 525, 55)
    p.item('nightstand', 480, 225, 525, 270)
    p.item('desk', 15, 330, 70, 480, 'w')
    p.item('chair', 75, 380, 120, 425, 'w')
    p.item('armchair', 60, 60, 140, 140)
    p.item('rug', 170, 60, 330, 280)
    p.item('shower', 430, 330, 525, 425)
    p.item('sink', 340, 440, 400, 525, 'w')
    p.item('toilet', 470, 470, 510, 525, 's')
    spaces = [
        ('habitacion', 'Habitación', 'dormitorio', 'Cama queen en la esquina, con ventanas a dos lados.', ['Cama queen', 'Escritorio', 'Sillón de lectura']),
        ('bano', 'Baño', 'bano', 'Baño con ducha de lluvia.', ['Ducha de lluvia', 'Amenidades de la casa']),
    ]
    return p, spaces


TIPOS = {}
d, dsp = deluxe()
s, ssp = superior()
TIPOS['deluxe-izq'] = (d, dsp)
TIPOS['deluxe-der'] = (d.mirrored('Deluxe King (espejo) · plano en centímetros'), dsp)
TIPOS['superior-izq'] = (s, ssp)
TIPOS['superior-der'] = (s.mirrored('Superior (espejo) · plano en centímetros'), ssp)

# lugar en la planta (x0, y0) y ventanas que ocupa en la fachada (orden del visor: 0 frente,
# 1 oriente, 2 atrás, 3 occidente; cada fachada de izquierda a derecha vista desde afuera)
SLOTS = {
    'deluxe-izq': ((0, 3 * M), [{'facade': 0, 'windows': [0, 1, 2]}, {'facade': 3, 'windows': [3, 4]}]),
    'deluxe-der': ((3 * M, 3 * M), [{'facade': 0, 'windows': [3, 4, 5]}, {'facade': 1, 'windows': [0, 1]}]),
    'superior-der': ((4 * M, 0), [{'facade': 2, 'windows': [0, 1]}, {'facade': 1, 'windows': [3, 4]}]),
    'superior-izq': ((0, 0), [{'facade': 2, 'windows': [4, 5]}, {'facade': 3, 'windows': [0, 1]}]),
}
ORDER = ['deluxe-izq', 'deluxe-der', 'superior-der', 'superior-izq']


def floor_plan(n, units):
    """Planta de un piso de habitaciones: cada habitación en su lugar, pasillo y núcleo."""
    p = Plan(f'Piso {n} · planta', FW, FD)
    for slot, uid in units:
        (x0, y0), _ = SLOTS[slot]
        up, _sp = TIPOS[slot]
        p.walls += [(x0 + x, y0 + y, w, h) for x, y, w, h in up.walls]
        p.openings += [(t, x0 + x, y0 + y, w, h) for t, x, y, w, h in up.openings]
        p.furniture += [(it, x0 + x, y0 + y, w, h, b) for it, x, y, w, h, b in up.furniture]
        p.space(uid, rect(x0 + 15, y0 + 15, x0 + up.w - 15, y0 + up.h - 15))
    # núcleo atrás al centro y pasillo de lado a lado
    p.wall(2 * M, 0, 4 * M, 15)
    p.wall(0, 2 * M, FW, 2 * M + 10)
    p.wall(0, 3 * M - 10, FW, 3 * M)
    p.wall(0, 2 * M, 15, 3 * M)
    p.wall(FW - 15, 2 * M, FW, 3 * M)
    p.space('nucleo', rect(2 * M, 15, 4 * M, 2 * M), 'concreto', 'Ascensores y escalera')
    p.space('pasillo', rect(15, 2 * M + 10, FW - 15, 3 * M - 10), 'alfombra', 'Pasillo')
    p.door(2 * M + 90, 2 * M, 2 * M + 200, 2 * M + 10)
    p.door(4 * M - 200, 2 * M, 4 * M - 90, 2 * M + 10)
    # ventanas del pasillo (en sus dos extremos) y del núcleo (atrás)
    win_v(p, 2.5 * M, 0, 15)
    win_v(p, 2.5 * M, FW - 15, FW)
    for cx in (2.5 * M, 3.5 * M):
        win_h(p, cx, 0, 15, 120)
    return p


def common_floor(n, title, zones):
    """Piso 1 y 2: zonas comunes con vidrio en todos los módulos."""
    p = Plan(title, FW, FD)
    p.perimeter(FW, FD)
    p.wall(2 * M, 15, 2 * M + 10, 2 * M)
    p.wall(4 * M - 10, 15, 4 * M, 2 * M)
    p.wall(15, 2 * M, FW - 15, 2 * M + 10)
    for zid, pts, finish, label in zones:
        p.space(zid, pts, finish, label)
    p.space('nucleo', rect(2 * M + 10, 15, 4 * M - 10, 2 * M), 'concreto', 'Ascensores y escalera')
    for i in range(6):
        win_h(p, (i + 0.5) * M, FD - 15, FD, 220)
        win_h(p, (i + 0.5) * M, 0, 15, 220)
    for i in range(5):
        win_v(p, (i + 0.5) * M, 0, 15, 220)
        win_v(p, (i + 0.5) * M, FW - 15, FW, 220)
    p.door(2 * M + 140, 2 * M, 4 * M - 140, 2 * M + 10)
    return p


def main():
    os.makedirs(f'{ROOT}/plans', exist_ok=True)
    for name, (pl, _) in TIPOS.items():
        open(f'{ROOT}/plans/{name}.svg', 'w', encoding='utf-8', newline='\n').write(pl.svg())

    lobby = common_floor(1, 'Piso 1 · lobby, restaurante y bar', [
        ('lobby', rect(2 * M, 2 * M + 10, 4 * M, FD - 15), 'piedra', 'Lobby'),
        ('restaurante', [(15, 15), (2 * M, 15), (2 * M, FD - 15), (15, FD - 15)], 'madera', 'Restaurante'),
        ('bar', [(4 * M, 15), (FW - 15, 15), (FW - 15, FD - 15), (4 * M, FD - 15)], 'madera', 'Bar'),
    ])
    lobby.door(2.5 * M, FD - 15, 3.5 * M, FD)
    lobby.item('reception', 2 * M + 60, 3 * M + 40, 2 * M + 300, 3 * M + 100, 'n')
    lobby.item('sofa', 3 * M + 20, 4 * M, 3 * M + 240, 4 * M + 85, 's')
    lobby.item('coffee', 3 * M + 70, 4 * M - 110, 3 * M + 190, 4 * M - 30)
    for (cx, cy) in ((120, 700), (330, 700), (120, 1000), (330, 1000), (120, 1250)):
        lobby.item('table', cx - 45, cy - 45, cx + 45, cy + 45)
        lobby.item('chair', cx - 45, cy - 95, cx, cy - 50, 's')
        lobby.item('chair', cx, cy + 50, cx + 45, cy + 95, 'n')
    lobby.item('bar', FW - 80, 3 * M, FW - 15, FD - 120, 'e')
    for k in range(5):
        lobby.item('stool', FW - 140, 3 * M + 20 + k * 80, FW - 100, 3 * M + 60 + k * 80)
    lobby.item('booth', 4 * M + 20, 30, FW - 30, 120, 'n')
    spa = common_floor(2, 'Piso 2 · spa y gimnasio', [
        ('gimnasio', rect(15, 2 * M + 10, 3 * M, FD - 15), 'concreto', 'Gimnasio'),
        ('spa', rect(3 * M, 2 * M + 10, FW - 15, FD - 15), 'piedra', 'Spa'),
        ('vestidores', rect(15, 15, 2 * M, 2 * M), 'baldosa', 'Vestidores'),
        ('sauna', rect(4 * M, 15, FW - 15, 2 * M), 'madera', 'Sauna y turco'),
    ])
    for k in range(4):
        spa.item('bench', 60 + k * 170, 3 * M + 60, 160 + k * 170, 3 * M + 120)
    spa.item('lounger', 3 * M + 60, 3 * M + 120, 3 * M + 130, 3 * M + 330)
    spa.item('lounger', 3 * M + 180, 3 * M + 120, 3 * M + 250, 3 * M + 330)
    spa.item('bathtub', 5 * M - 40, 4 * M - 20, FW - 60, FD - 60)
    spa.item('shower', 60, 60, 160, 160)
    spa.item('shower', 200, 60, 300, 160)
    open(f'{ROOT}/plans/piso-1.svg', 'w', encoding='utf-8', newline='\n').write(lobby.svg())
    open(f'{ROOT}/plans/piso-2.svg', 'w', encoding='utf-8', newline='\n').write(spa.svg())

    units, levels = [], []
    levels.append({'id': '1', 'name': 'Lobby', 'kind': 'piso', 'order': 1, 'plan': 'plans/piso-1.svg'})
    levels.append({'id': '2', 'name': 'Spa', 'kind': 'piso', 'order': 2, 'plan': 'plans/piso-2.svg'})
    templates = {}
    for n in range(3, FLOORS + 1):
        levels.append({'id': str(n), 'name': f'Piso {n}', 'kind': 'piso', 'order': n, 'plan': f'plans/piso-{n}.svg'})
        placed = []
        for k, slot in enumerate(ORDER, start=1):
            uid = f'{n}{k:02d}'
            placed.append((slot, uid))
            pl, sp = TIPOS[slot]
            deluxe_slot = slot.startswith('deluxe')
            base = 980000 if deluxe_slot else 720000
            alto = n >= 10
            view = (
                ('Vista panorámica a los cerros y a la ciudad, por encima de las torres vecinas.' if alto else 'Hacia el parque, entre las copas de los árboles.')
                if deluxe_slot
                else ('Hacia los cerros orientales, sobre los techos del barrio.' if alto else 'Hacia el interior de la manzana, la más silenciosa.')
            )
            premium = (n - 3) * 12000 + (90000 if alto else 0)
            # ocupadas en las fechas de la demo: un patrón fijo, no al azar
            occupied = (n * 7 + k * 3) % 5 == 0
            name = ('Deluxe King' if deluxe_slot else 'Superior') + f' {uid}'
            if slot not in templates:
                templates[slot] = uid
                u = {
                    'id': uid, 'name': name, 'categoryId': 'deluxe' if deluxe_slot else 'superior', 'levelId': str(n),
                    'capacity': 2, 'beds': '1 cama king' if deluxe_slot else '1 cama queen',
                    'areaM2': round(pl.w * pl.h / 10000), 'basePriceCOP': base, 'viewPremiumCOP': premium, 'view': view,
                    'plan': f'plans/{slot}.svg', 'exterior': SLOTS[slot][1],
                    'spaces': [
                        {'id': sid, 'name': sname, 'type': stype, 'areaM2': area(next(p for i, p, *_ in pl.spaces if i == sid)),
                         'description': desc, 'features': feats, 'media': []}
                        for sid, sname, stype, desc, feats in sp
                    ],
                }
                if slot == 'deluxe-izq':
                    u['featured'] = True
            else:
                u = {'sameAs': templates[slot], 'id': uid, 'name': name, 'levelId': str(n), 'viewPremiumCOP': premium, 'view': view,
                     'exterior': SLOTS[slot][1]}
            if occupied:
                u['occupied'] = True
            units.append(u)
        open(f'{ROOT}/plans/piso-{n}.svg', 'w', encoding='utf-8', newline='\n').write(floor_plan(n, placed).svg())

    hotel_path = f'{ROOT}/hotel.json'
    base = json.load(open(hotel_path, encoding='utf-8'))
    base['units'] = units
    base['levels'] = levels
    open(hotel_path, 'w', encoding='utf-8', newline='\n').write(json.dumps(base, ensure_ascii=False, indent=2) + '\n')
    print(len(units), 'habitaciones,', len(levels), 'pisos')


main()
