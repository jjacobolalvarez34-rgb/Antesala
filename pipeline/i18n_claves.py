"""
Lista los textos de la interfaz que pasan por la traducción (D-094) y los que faltan en el
diccionario inglés. Busca los argumentos de tr(...) y t(lang, ...), y además las tablas de
textos conocidas (oferta, insignias, niveles, secciones, fachadas).

Uso: python pipeline/i18n_claves.py            -> lo que falta en lib/i18n-en.ts
     python pipeline/i18n_claves.py --todas    -> todas las claves
"""
import glob
import re
import sys


def calls(src):
    """Textos entre comillas simples dentro de llamadas tr( ... ) o t(lang, ... )."""
    out = set()
    for m in re.finditer(r"\b(?:tr|t)\(", src):
        i = m.end()
        depth = 1
        j = i
        while j < len(src) and depth:
            c = src[j]
            if c == '(':
                depth += 1
            elif c == ')':
                depth -= 1
            elif c == "'":
                k = j + 1
                while k < len(src) and src[k] != "'":
                    k += 2 if src[k] == '\\' else 1
                out.add(src[j + 1:k].replace("\\'", "'"))
                j = k
            j += 1
    return out


keys = set()
for p in glob.glob('components/**/*.tsx', recursive=True) + glob.glob('app/**/*.tsx', recursive=True) + ['lib/hotel.ts']:
    if 'producto' in p or p.replace('\\', '/') == 'app/page.tsx':
        continue
    keys |= calls(open(p, encoding='utf-8').read())

# tablas que se traducen por valor (t(lang, v))
hotel = open('lib/hotel.ts', encoding='utf-8').read()
block = hotel[hotel.index('export const OFFER'):hotel.index('export function offerTexts')]
keys |= set(re.findall(r":\s*'([^']+)'", block))
for p, pat in [
    ('components/hotel/FidelityBadge.tsx', r":\s*'([^']+)'"),
    ('components/hotel/Nivel.tsx', r"(?:esencial|inmersivo|premium): '([^']+)'"),
    ('components/hotel/HotelHeader.tsx', r"\['\w+', '([^']+)'\]"),
    ('lib/building.ts', r"name: '([^']+)'"),
]:
    keys |= set(re.findall(pat, open(p, encoding='utf-8').read()))

keys = {k for k in keys if re.search(r'[A-Za-záéíóúñÁÉÍÓÚ]{2,}', k) and not re.fullmatch(r'[a-z0-9\-/:.\[\] ]+', k) or ' ' in k}
keys = {k for k in keys if not k.startswith(('http', '/', '#')) and 'className' not in k}

en = open('lib/i18n-en.ts', encoding='utf-8').read()
have = set(re.findall(r"^\s*'((?:[^'\\]|\\.)*)':", en, flags=re.M)) | set(re.findall(r'^\s*"((?:[^"\\]|\\.)*)":', en, flags=re.M))
have = {h.replace("\\'", "'") for h in have}
have |= set(re.findall(r"^\s*([A-Za-zÁÉÍÓÚáéíóúñÑ]+):", en, flags=re.M))
keys = {k for k in keys if k.strip(', ') and k != 'texto en español'}
todo = sorted(keys if '--todas' in sys.argv else keys - have)
for k in todo:
    print(k)
print(f'-- {len(todo)} de {len(keys)}', file=sys.stderr)
