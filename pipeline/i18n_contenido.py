"""
Textos del contenido de un hotel que falta traducir (D-094): recorre hotel.json, tokens.json y
las etiquetas de los planos (data-label) con las mismas reglas que lib/i18n.ts (claves que no se
traducen, reglas con números, diccionario de la interfaz) y lista lo que no está en
content/hotels/<slug>/i18n/<lang>.json.

Uso: python pipeline/i18n_contenido.py <hotel> [en]   -> un JSON {"texto": ""} para completar
"""
import glob
import json
import os
import re
import sys

slug = sys.argv[1]
lang = sys.argv[2] if len(sys.argv) > 2 else 'en'
base = f'content/hotels/{slug}'
SKIP = {'id', 'slug', 'src', 'href', 'plan', 'type', 'kind', 'tier', 'fidelity', 'sameAs', 'realista', 'categoryId', 'levelId',
        'unitId', 'spaceId', 'poiId', 'finish', 'offer', 'corners', 'hero', 'title', 'cladding', 'ground', 'windows', 'whatsapp',
        'email', 'phone', 'url', 'target', 'currency', 'locale', 'logo', 'font', 'icon', 'facade', 'style', 'roof', 'voice'}
RULES = [r'^Piso \d+$', r'^Piso \d+ de \d+$', r'^Estudio \d+$', r'^Suite \d+$', r'^Penthouse \d+$', r'^Habitación \d+$',
         r'^Apartamento \d+$', r'^\d+ camas? (sencilla|doble|queen|king)s?$', r'^1 cama \w+$', r'^\d+ camas \w+$']
en_ts = open('lib/i18n-en.ts', encoding='utf-8').read()
DICT = set(re.findall(r"^\s*'((?:[^'\\]|\\.)*)':", en_ts, flags=re.M)) | set(re.findall(r"^\s*([A-Za-zÁÉÍÓÚáéíóúñÑ]+):", en_ts, flags=re.M))

UNIT = r'(?:Estudio|Suite|Penthouse|Deluxe King|Superior|Habitación|Apartamento|Refugio|Cabaña|Casa|Domo) [\wÁÉÍÓÚáéíóúñ ]+'
COMPOSED = [r'^(.+) \(imagen ilustrativa\)$', r'^(.+): vista general$', r'^(.+): detalle$', r'^(.+) en 360°$',
            rf'^(.+) de ({UNIT}), vista desde adentro$', rf'^(.+) de ({UNIT})$']

found = []


def walk(v, key=''):
    if isinstance(v, str):
        if key in SKIP:
            return
        if not re.search(r'[a-záéíóúñ]{2,}', v) or v.startswith(('#', 'http', 'media/', 'plans/', 'rgb', 'oklch')):
            return
        if any(re.match(r, v) for r in RULES) or v in DICT:
            return
        # textos compuestos (como en lib/i18n.ts): se piden las partes, no el texto entero
        for pat in COMPOSED:
            m = re.match(pat, v)
            if m:
                for part in m.groups():
                    walk(part, 'parte')
                return
        found.append(v)
    elif isinstance(v, list):
        for x in v:
            walk(x, key)
    elif isinstance(v, dict):
        for k, x in v.items():
            if k not in SKIP:
                walk(x, k)


walk(json.load(open(f'{base}/hotel.json', encoding='utf-8')))
walk(json.load(open(f'{base}/tokens.json', encoding='utf-8')))
for svg in glob.glob(f'{base}/plans/*.svg'):
    for lab in re.findall(r'data-label="([^"]+)"', open(svg, encoding='utf-8').read()):
        walk(lab, 'label')

have = {}
path = f'{base}/i18n/{lang}.json'
if os.path.exists(path):
    have = json.load(open(path, encoding='utf-8'))
todo = []
for f in found:
    if f not in have and f not in todo:
        todo.append(f)
print(json.dumps({t: '' for t in todo}, ensure_ascii=False, indent=2))
print(f'-- {len(todo)} por traducir ({len(set(found))} textos)', file=sys.stderr)
