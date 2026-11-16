"""Demo de glamping (D-083): Frailejón, cuatro refugios sueltos en un valle de páramo (ficticio).

Genera, desde una sola fuente, los planos de los 4 refugios (cm, CONTENIDO.md §4), el mapa del
terreno (plans/terreno.svg: cada refugio es un rectángulo del mismo tamaño que su plano, en su
lugar) y las unidades de hotel.json. Así el mapa, el exterior 3D (que se levanta desde el plano)
y la maqueta por dentro no se pueden contradecir (regla 9).

Uso: python pipeline/gen_frailejon.py content/hotels/frailejon
"""
import json
import os
import sys

ROOT = sys.argv[1]


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

    def space(self, id, pts, finish='madera'):
        self.spaces.append((id, pts, finish))

    def door(self, x0, y0, x1, y1):
        self.openings.append(('door', min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0)))

    def window(self, x0, y0, x1, y1):
        self.openings.append(('window', min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0)))

    def item(self, item, x0, y0, x1, y1, back=None):
        self.furniture.append((item, min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0), back))

    def svg(self):
        r = round
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}">', f'  <title>{self.title}</title>', '  <g id="walls">']
        out += [f'    <rect x="{r(x)}" y="{r(y)}" width="{r(w)}" height="{r(h)}"/>' for x, y, w, h in self.walls]
        out += ['  </g>', '  <g id="spaces">']
        for id, pts, finish in self.spaces:
            p = ' '.join(f'{r(x)},{r(y)}' for x, y in pts)
            out.append(f'    <polygon id="{id}" data-finish="{finish}" points="{p}"/>')
        out += ['  </g>', '  <g id="openings">']
        out += [f'    <rect data-type="{t}" x="{r(x)}" y="{r(y)}" width="{r(w)}" height="{r(h)}"/>' for t, x, y, w, h in self.openings]
        out += ['  </g>', '  <g id="furniture">']
        for item, x, y, w, h, back in self.furniture:
            b = f' data-back="{back}"' if back else ''
            out.append(f'    <rect data-item="{item}"{b} x="{r(x)}" y="{r(y)}" width="{r(w)}" height="{r(h)}"/>')
        out += ['  </g>', '</svg>', '']
        return '\n'.join(out)


# ------------------------------------------------------------------ refugios
# Todos con la entrada al sur (abajo del plano, y grande), hacia la recepción y el valle.

def encenillo():
    W, D = 600, 760
    p = Plan('Cabaña Encenillo · plano en centímetros', W, D)
    p.perimeter(W, D)
    p.wall(15, 320, 585, 330)          # dormitorio | estar
    p.wall(15, 510, 240, 520)          # baño
    p.wall(230, 520, 240, 745)
    p.space('dormitorio', rect(15, 15, 585, 320))
    p.space('bano', rect(15, 520, 230, 745), 'baldosa')
    p.space('estar', [(15, 330), (585, 330), (585, 745), (240, 745), (240, 510), (15, 510)])
    p.window(170, 0, 430, 15)          # ventanal al norte (el valle alto)
    p.window(585, 90, 600, 250)
    p.door(440, 320, 520, 330)
    p.window(0, 360, 15, 480)
    p.door(230, 560, 240, 640)
    p.window(0, 600, 15, 690)
    p.door(450, 745, 530, 760)         # entrada
    p.window(260, 745, 420, 760)
    p.item('bed', 210, 30, 370, 230, 'n')
    p.item('nightstand', 160, 30, 205, 75)
    p.item('nightstand', 375, 30, 420, 75)
    p.item('wardrobe', 15, 60, 75, 300, 'w')
    p.item('rug', 190, 230, 390, 300)
    p.item('armchair', 470, 230, 560, 310)
    p.item('sofa', 500, 380, 585, 600, 'e')
    p.item('coffee', 400, 440, 470, 560)
    p.item('armchair', 270, 350, 350, 430)
    p.item('rug', 300, 420, 480, 600)
    p.item('counter', 260, 685, 420, 745, 's')
    p.item('table', 300, 580, 400, 650)
    p.item('chair', 255, 590, 295, 630, 'w')
    p.item('chair', 405, 590, 445, 630, 'e')
    p.item('shower', 15, 650, 110, 745)
    p.item('toilet', 150, 690, 190, 745, 's')
    p.item('sink', 15, 530, 70, 620, 'w')
    p.item('plant', 535, 690, 580, 735)
    spaces = [
        ('dormitorio', 'Dormitorio', 'dormitorio', 'Cama queen bajo el ventanal del norte: se amanece mirando el valle.', ['Cama queen', 'Cobijas de lana', 'Clóset']),
        ('estar', 'Estar y cocineta', 'sala', 'Sofá, mesa para dos y cocineta bajo la ventana del sur.', ['Sofá', 'Cocineta con greca', 'Mesa para dos']),
        ('bano', 'Baño', 'bano', 'Ducha con agua caliente y ventana pequeña.', ['Ducha', 'Toallas']),
    ]
    return p, spaces


def laguna():
    W, D = 720, 540
    p = Plan('Refugio Laguna · plano en centímetros', W, D + 200)
    p.perimeter(W, D)
    p.wall(420, 15, 430, 525)          # dormitorio | baño y estar
    p.wall(430, 230, 705, 240)         # baño
    p.space('dormitorio', rect(15, 15, 420, 525))
    p.space('bano', rect(430, 15, 705, 230), 'baldosa')
    p.space('estar', rect(430, 240, 705, 525))
    p.space('deck', rect(0, D, W, D + 200), 'deck')
    p.window(60, 525, 380, 540)        # vidrio al sur (la laguna)
    p.window(0, 150, 15, 380)
    p.door(420, 300, 430, 380)
    p.door(600, 230, 680, 240)
    p.window(500, 0, 640, 15)
    p.door(470, 525, 570, 540)         # salida al deck
    p.window(590, 525, 690, 540)
    p.window(705, 300, 720, 460)
    p.door(705, 120, 720, 200)         # entrada, por el costado
    p.item('bed', 15, 170, 215, 330, 'w')
    p.item('nightstand', 15, 115, 60, 160)
    p.item('nightstand', 15, 335, 60, 380)
    p.item('desk', 250, 15, 400, 70, 'n')
    p.item('chair', 300, 75, 345, 120, 'n')
    p.item('armchair', 300, 400, 400, 500)
    p.item('rug', 230, 170, 400, 380)
    p.item('shower', 430, 15, 530, 115)
    p.item('sink', 540, 20, 600, 110, 'n')
    p.item('toilet', 450, 170, 490, 225, 's')
    p.item('sofa', 450, 250, 670, 335, 'n')
    p.item('coffee', 520, 370, 610, 430)
    p.item('kitchen', 430, 360, 490, 520, 'w')
    p.item('bathtub', 60, 580, 240, 680)
    p.item('lounger', 290, 590, 360, 720)
    p.item('lounger', 380, 590, 450, 720)
    p.item('plant', 650, 690, 700, 735)
    spaces = [
        ('dormitorio', 'Dormitorio', 'dormitorio', 'Cama king frente al muro de vidrio que da a la laguna.', ['Cama king', 'Muro de vidrio', 'Escritorio']),
        ('estar', 'Estar', 'sala', 'Sofá, cocineta y la puerta al deck.', ['Sofá', 'Cocineta', 'Salida al deck']),
        ('bano', 'Baño', 'bano', 'Ducha amplia con agua caliente.', ['Ducha', 'Lavamanos doble']),
        ('deck', 'Deck con tina', 'terraza', 'Tina caliente al aire libre y dos asoleadoras, frente a la laguna.', ['Tina caliente', 'Dos asoleadoras', 'Vista a la laguna']),
    ]
    return p, spaces


def piedra():
    W, D = 640, 620
    p = Plan('Refugio de Piedra · plano en centímetros', W, D)
    p.perimeter(W, D)
    p.wall(230, 15, 240, 250)          # baño
    p.wall(15, 250, 330, 260)          # dormitorio
    p.wall(320, 260, 330, 605)
    p.space('bano', rect(15, 15, 230, 250), 'baldosa')
    p.space('cocina', rect(240, 15, 625, 260), 'piedra')
    p.space('dormitorio', rect(15, 260, 320, 605))
    p.space('sala', rect(330, 260, 625, 605))
    p.door(120, 250, 200, 260)
    p.door(320, 400, 330, 480)
    p.door(420, 605, 510, 620)         # entrada
    p.window(540, 605, 610, 620)
    p.window(80, 605, 260, 620)
    p.window(0, 330, 15, 500)
    p.window(380, 0, 560, 15)
    p.window(625, 330, 640, 480)
    p.window(60, 0, 160, 15)
    p.item('bed', 90, 270, 250, 470, 'n')
    p.item('nightstand', 40, 270, 85, 315)
    p.item('nightstand', 255, 270, 300, 315)
    p.item('wardrobe', 15, 500, 180, 560, 's')
    p.item('kitchen', 300, 15, 600, 75, 'n')
    p.item('table', 380, 140, 520, 220)
    p.item('chair', 395, 100, 440, 140, 's')
    p.item('chair', 460, 100, 505, 140, 's')
    p.item('chair', 395, 220, 440, 260, 'n')
    p.item('chair', 460, 220, 505, 260, 'n')
    p.item('sofa', 360, 300, 580, 385, 'n')
    p.item('coffee', 420, 420, 520, 480)
    p.item('armchair', 350, 510, 430, 590)
    p.item('rug', 380, 400, 560, 560)
    p.item('shower', 15, 15, 115, 115)
    p.item('toilet', 160, 15, 200, 70, 'n')
    p.item('sink', 15, 160, 70, 240, 'w')
    spaces = [
        ('dormitorio', 'Dormitorio', 'dormitorio', 'Muros de piedra que guardan el calor y una cama queen con plumón.', ['Cama queen', 'Plumón de pluma', 'Clóset']),
        ('sala', 'Sala', 'sala', 'Sala con sofá y ventanas al oriente y al sur.', ['Sofá', 'Biblioteca de páramo']),
        ('cocina', 'Cocina y comedor', 'cocina', 'Cocina completa y comedor para cuatro.', ['Cocina completa', 'Comedor para cuatro', 'Greca y prensa francesa']),
        ('bano', 'Baño', 'bano', 'Baño junto al dormitorio, con ducha caliente.', ['Ducha', 'Toallas']),
    ]
    return p, spaces


def casa():
    W, D = 920, 800
    p = Plan('Casa Frailejón · plano en centímetros', W, D + 200)
    p.perimeter(W, D)
    p.wall(380, 15, 390, 370)          # alcoba principal | baño
    p.wall(600, 15, 610, 370)          # baño | alcoba 2
    p.wall(15, 360, 390, 370)
    p.wall(600, 360, 905, 370)
    p.wall(390, 260, 600, 270)         # baño
    p.wall(610, 370, 620, 600)         # cocina, abierta abajo
    p.space('alcoba', rect(15, 15, 380, 360))
    p.space('bano', rect(390, 15, 600, 260), 'baldosa')
    p.space('alcoba-2', rect(610, 15, 905, 360))
    p.space('sala', [(390, 270), (600, 270), (600, 370), (610, 370), (610, 785), (15, 785), (15, 370), (390, 370)])
    p.space('cocina', rect(620, 370, 905, 785), 'piedra')
    p.space('porche', rect(200, D, 720, D + 200), 'deck')
    p.door(290, 360, 370, 370)
    p.door(620, 360, 700, 370)
    p.door(450, 260, 530, 270)
    p.door(420, 785, 510, 800)         # entrada, desde el porche
    p.window(80, 0, 300, 15)
    p.window(700, 0, 860, 15)
    p.window(905, 100, 920, 300)
    p.window(440, 0, 560, 15)
    p.window(60, 785, 380, 800)
    p.window(0, 450, 15, 700)
    p.window(905, 450, 920, 650)
    p.window(680, 785, 860, 800)
    p.item('bed', 15, 100, 215, 280, 'w')
    p.item('nightstand', 15, 50, 60, 95)
    p.item('nightstand', 15, 285, 60, 330)
    p.item('wardrobe', 320, 30, 380, 250, 'e')
    p.item('bed', 610, 40, 800, 130, 'w')
    p.item('bed', 610, 170, 800, 260, 'w')
    p.item('nightstand', 610, 135, 655, 165)
    p.item('shower', 390, 15, 490, 115)
    p.item('sink', 520, 20, 600, 110, 'e')
    p.item('toilet', 400, 200, 440, 255, 's')
    p.item('sofa', 60, 420, 300, 505, 'n')
    p.item('coffee', 130, 560, 250, 640)
    p.item('armchair', 330, 560, 410, 640)
    p.item('rug', 90, 530, 300, 680)
    p.item('table', 400, 600, 560, 690)
    p.item('chair', 410, 560, 450, 600, 's')
    p.item('chair', 510, 560, 550, 600, 's')
    p.item('chair', 410, 690, 450, 730, 'n')
    p.item('chair', 510, 690, 550, 730, 'n')
    p.item('kitchen', 845, 400, 905, 780, 'e')
    p.item('island', 700, 500, 780, 700)
    p.item('bench', 230, 930, 430, 985, 's')
    p.item('chair', 500, 900, 560, 960, 's')
    p.item('chair', 590, 900, 650, 960, 's')
    p.item('plant', 210, 820, 260, 870)
    spaces = [
        ('alcoba', 'Alcoba principal', 'dormitorio', 'Cama king y ventana al norte, hacia los frailejones.', ['Cama king', 'Clóset', 'Cobijas de lana']),
        ('alcoba-2', 'Alcoba de los niños', 'dormitorio', 'Dos camas sencillas y ventana al oriente.', ['Dos camas sencillas', 'Mesa de noche']),
        ('sala', 'Sala y comedor', 'sala', 'Sala con ventanal al sur y comedor para seis.', ['Sofá', 'Comedor para seis', 'Juegos de mesa']),
        ('cocina', 'Cocina', 'cocina', 'Cocina completa con isla, abierta a la sala.', ['Cocina completa', 'Isla', 'Nevera']),
        ('bano', 'Baño', 'bano', 'Baño entre las dos alcobas.', ['Ducha', 'Toallas']),
        ('porche', 'Porche', 'terraza', 'Porche con banca y dos sillas, mirando al valle.', ['Banca', 'Dos sillas']),
    ]
    return p, spaces


# ------------------------------------------------------------------ terreno
# Mapa de 160 × 120 m (cm en el SVG). El centro del mapa es el origen de la escena 3D.
MAP_W, MAP_H = 16000, 12000
REFUGIOS = [
    # id, nombre, categoría, generador, centro en el mapa (cm), estilo, techo, capacidad, camas, precio, vista
    ('encenillo', 'Cabaña Encenillo', 'cabana', encenillo, (4300, 6400), 'madera', 'dos-aguas', 2, '1 cama queen', 420000,
     'Al borde del bosque de encenillos, con el valle al frente.'),
    ('laguna', 'Refugio Laguna', 'vidrio', laguna, (11400, 4000), 'vidrio', 'plano', 2, '1 cama king', 520000,
     'Frente a la laguna, con la tina caliente en el deck.'),
    ('piedra', 'Refugio de Piedra', 'piedra', piedra, (6900, 3300), 'piedra', 'dos-aguas', 2, '1 cama queen', 460000,
     'En lo alto del terreno, entre frailejones y rocas.'),
    ('casa', 'Casa Frailejón', 'casa', casa, (10300, 8300), 'clara', 'dos-aguas', 5, '1 cama king + 2 sencillas', 690000,
     'Cerca de la recepción y de la fogata, para ir en familia.'),
]
POIS = [
    # id, nombre, polígono en el mapa (cm), descripción
    ('recepcion', 'Recepción y café', rect(7300, 9900, 8700, 10700), 'Llegada, café de la casa y desayuno de campo cada mañana.'),
    ('fogata', 'Fogata', rect(8300, 6700, 8900, 7300), 'Fogata cada noche, con cobijas y chocolate caliente.'),
    ('laguna-poi', 'La laguna', [(12300, 1200), (14600, 1300), (15000, 2600), (13600, 3200), (12200, 2500)], 'Laguna pequeña de páramo, a cinco minutos a pie.'),
    ('mirador', 'Mirador', rect(2200, 1600, 3000, 2400), 'Mirador sobre el valle, al final del sendero alto.'),
]


def main():
    os.makedirs(f'{ROOT}/plans', exist_ok=True)
    units, cats = [], {}
    terreno_spaces = []
    for uid, name, cat, gen, (cx, cy), style, roof, cap, beds, price, view in REFUGIOS:
        plan, spaces = gen()
        open(f'{ROOT}/plans/{uid}.svg', 'w', encoding='utf-8', newline='\n').write(plan.svg())
        # en el mapa, el refugio ocupa exactamente el tamaño de su plano (con deck o porche)
        terreno_spaces.append((uid, rect(cx - plan.w / 2, cy - plan.h / 2, cx + plan.w / 2, cy + plan.h / 2), None))
        poly = {sid: pts for sid, pts, _ in plan.spaces}
        total = round(sum(area(poly[s[0]]) for s in spaces if s[2] != 'terraza'))
        units.append({
            'id': uid,
            'name': name,
            'categoryId': cat,
            'levelId': 'terreno',
            'capacity': cap,
            'beds': beds,
            'areaM2': total,
            'basePriceCOP': price,
            'view': view,
            'plan': f'plans/{uid}.svg',
            'cabin': {'style': style, 'roof': roof},
            'featured': uid == 'laguna',
            'spaces': [
                {'id': sid, 'name': sname, 'type': stype, 'areaM2': area(poly[sid]), 'description': desc, 'features': feats, 'media': []}
                for sid, sname, stype, desc, feats in spaces
            ],
        })
    # mapa del terreno
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {MAP_W} {MAP_H}">',
           '  <title>Frailejón · mapa del terreno (160 × 120 m)</title>', '  <g id="walls">', '  </g>', '  <g id="spaces">']
    for uid, pts, _ in terreno_spaces:
        out.append(f'    <polygon id="{uid}" data-finish="madera" points="{" ".join(f"{round(x)},{round(y)}" for x, y in pts)}"/>')
    for pid, pname, pts, _ in POIS:
        finish = 'deck' if pid in ('recepcion', 'fogata') else 'piedra'
        out.append(f'    <polygon id="{pid}" data-label="{pname}" data-finish="{finish}" points="{" ".join(f"{round(x)},{round(y)}" for x, y in pts)}"/>')
    out += ['  </g>', '  <g id="openings">', '  </g>', '  <g id="furniture">', '  </g>', '</svg>', '']
    open(f'{ROOT}/plans/terreno.svg', 'w', encoding='utf-8', newline='\n').write('\n'.join(out))

    def center(pts):
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        return ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)

    pois = []
    for pid, pname, pts, desc in POIS:
        cx, cy = center(pts)
        pois.append({'id': pid, 'name': pname, 'levelId': 'terreno', 'description': desc,
                     'position': [round((cx - MAP_W / 2) / 100, 1), 2.0, round((cy - MAP_H / 2) / 100, 1)], 'media': []})

    hotel_path = f'{ROOT}/hotel.json'
    base = json.load(open(hotel_path, encoding='utf-8')) if os.path.exists(hotel_path) else {}
    base.update({
        'units': units,
        'levels': [{'id': 'terreno', 'name': 'El terreno', 'kind': 'zona', 'order': 1, 'plan': 'plans/terreno.svg'}],
    })
    base.setdefault('site', {})['pois'] = pois
    open(hotel_path, 'w', encoding='utf-8', newline='\n').write(json.dumps(base, ensure_ascii=False, indent=2) + '\n')
    for u in units:
        print(u['id'], u['areaM2'], 'm²', [(s['id'], s['areaM2']) for s in u['spaces']])


main()
