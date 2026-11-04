# Diseño

## 1. Dirección

**Editorial y cinematográfico.** El espacio del hotel es el protagonista y la interfaz se aparta: contenido primero, materiales translúcidos encima y profundidad que orienta (principio de deferencia, estilo Apple HIG). Debe sentirse como una pieza de motion design, no como un software de arquitectura ni como un videojuego.

Referencias: Apple (jerarquía, ritmo, transiciones de profundidad) y Godly (landings con motion). La skill **frontend-design** se usa al crear o rediseñar pantallas.

## 2. Lenguaje visual

### Tipografía
- **Titulares:** serif editorial, Instrument Serif o Fraunces.
- **Interfaz y texto:** sans neutra, Inter o Geist.
- Carga con `next/font` y `display: swap`.
- Escala sugerida en móvil: 40 / 28 / 20 / 16 / 14 / 12. Interlineado de 1,1 en titulares y 1,5 en texto.

### Color
- Base de neutros cálidos: hueso `#F4F1EA`, piedra `#D9D3C7`, carbón `#1C1B19` (ajustables por hotel).
- **Un solo acento por hotel**, definido en `tokens.json`.
- La escena 3D va en oscuro; las fichas, el comparador y la lista en claro.
- Contraste AA mínimo en todo el texto, incluido el que va sobre la escena (usar paneles, no texto suelto sobre el 3D).

### Superficies
- Paneles de vidrio esmerilado (`backdrop-blur` + fondo al 60–75 %) sobre la escena.
- Radios de 16–24 px en paneles y de 12 px en botones.
- Sombras mínimas; la profundidad la dan el blur y la escala.

### Tokens por hotel (`tokens.json`)
```json
{
  "brand": { "name": "Niebla Alta", "logo": "media/logo.svg", "tagline": "…" },
  "color": { "accent": "#…", "base": "#…", "ink": "#…" },
  "font": { "display": "Instrument Serif", "text": "Inter" },
  "voice": "cálida, sobria, sin superlativos"
}
```
Los tokens se exponen como variables CSS (`--accent`, etc.) que usa Tailwind. Cambiar de hotel es cambiar este archivo.

## 3. Layout móvil

- Diseño base a **390 px**; se adapta a 1440 px.
- **Barra inferior fija:** etapa actual, botón atrás y botón de **Reservar** siempre visible.
- Paneles de información como *bottom sheets* en móvil y laterales en escritorio.
- Objetivos táctiles de 44 px como mínimo. Gestos solo como atajo; siempre hay un botón equivalente.
- El banner "Hotel ficticio · imágenes ilustrativas" va discreto pero legible, arriba.

## 4. Motion

### Herramientas
| Uso | Herramienta |
|---|---|
| Vuelos de cámara, coreografía de etapas, texto de la entrada | GSAP (timelines) |
| Paneles, listas, *layout animations*, gestos | Motion |
| Logo o loader con *state machine* (opcional) | Rive |
| Piezas puntuales (menú con indicador, revelados, botones magnéticos) | Unlumen UI, SmoothUI |

Animmaster Lib y The Prompts Factory son **referencia**: se toma la idea y se reimplementa con GSAP o Motion. Antes de copiar código de cualquier librería externa hay que revisar su licencia.

### Reglas
1. **Cada animación orienta.** La cámara viaja hacia lo que el usuario eligió.
2. **Cámara:** 1,2–1,8 s con curva `power2.inOut` o similar, saltable con un toque.
3. **UI:** 200–400 ms con *springs* suaves (`stiffness` alto, sin rebote exagerado).
4. **Una línea de tiempo por transición de etapa:** la cámara y los paneles se mueven coordinados, nunca por separado.
5. **Un efecto protagonista por pantalla.** Los shaders de fondo (aurora, líquido, partículas) van solo en la entrada de marca, nunca encima de la escena 3D.
6. **Sin scroll-jacking** en el recorrido. Se avanza con toques y botones; el scroll queda para listas y fichas.
7. **`prefers-reduced-motion`:** los vuelos de cámara pasan a fundidos de 200 ms y los efectos de fondo se apagan. Se usa un hook único, `useReducedMotion`.
8. **Saltar animaciones:** un toque durante una transición la completa de inmediato. La entrada de marca tiene botón "Saltar".

### Coreografía por etapa
| Transición | Cámara | UI |
|---|---|---|
| Entrada → exterior | Desde arriba, baja en arco hasta 3/4 del edificio | El logo se encoge hacia la barra superior |
| Exterior → piso | Acercamiento lateral; los demás pisos se atenúan y el elegido se separa | Entra el panel de unidades |
| Piso → unidad | Cenital hacia la unidad; aparece la maqueta sin techo | Ficha de la unidad en *bottom sheet* |
| Unidad → espacio | Acercamiento al espacio y fundido al 360° | Galería y ficha del espacio |
| Atrás | Recorrido inverso, más rápido (0,8× la duración) | Inversa |

## 5. Componentes clave

- **BookingBar:** precio desde, unidad seleccionada y botón Reservar (WhatsApp).
- **LevelPicker:** lista vertical de pisos sincronizada con el 3D.
- **UnitCard:** categoría, área, capacidad, precio y el extra por vista resaltado.
- **SpaceChips:** acceso rápido a los espacios de la unidad.
- **CompareTable:** 3 columnas con planos en miniatura y las diferencias destacadas.
- **FidelityBadge:** "Ilustrativa" / "Foto real de esta unidad".
- **DemoBanner:** visible si `hotel.isDemo`.
- **PoweredBy:** pie discreto "con tecnología de Antesala", que enlaza a la landing comercial (cuando exista). No compite con la marca del hotel.

## 6. Accesibilidad

- Contraste AA, foco visible y navegación por teclado en toda la UI.
- El canvas 3D tiene equivalente en lista (`/lista`) con el mismo contenido.
- `alt` en todas las imágenes; los panoramas tienen una descripción textual.
- Los textos de la interfaz no van dentro del canvas.
