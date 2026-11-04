# Contenido

## 1. Regla de coherencia

Todo el contenido de la demo sale de un **mismo mundo visual**: los mismos muebles, la misma paleta y la misma luz en el edificio, las maquetas, los 360° y las fotos. Mezclar fotos de stock con una maqueta inventada se nota y le resta credibilidad.

## 2. Transparencia

- Cada `Media` declara `fidelity`. En la demo, todo es `"ilustrativa"`.
- El banner "Hotel ficticio · imágenes ilustrativas" se muestra si `hotel.isDemo`.
- Con clientes reales, la foto de la **unidad exacta** nunca se reemplaza con IA ni con renders. Si una imagen representa la categoría y no la unidad, se marca así.
- Nunca se modifican dimensiones, vistas ni elementos de forma que induzca a error.
- No se usan fotos de hoteles reales identificables ni fotos con personas.

## 3. Fuentes de la demo (sin captura)

| Pieza | Fuente en la demo | Con cliente real |
|---|---|---|
| Edificio exterior | Procedural desde `site.building` (código) | Splat desde órbitas de dron, o GLB |
| Maqueta de unidad | Generada desde el plano SVG + muebles low-poly | La misma, con el plano real |
| Panoramas 360° | Render equirectangular en Blender de los mismos interiores | Cámara 360° alquilada |
| Fotos por espacio | Renders de Blender | Fotógrafo o captura propia |
| Video de entrada | Animación de cámara sobre la maqueta | Toma de dron |
| Splat interior | **Aparcado** | Video de celular → splat |

Recursos libres: muebles y texturas CC0 de Poly Haven. Cualquier otra fuente se anota en `DECISIONES.md` con su licencia.

## 4. Planos SVG

Ruta: `content/hotels/<slug>/plans/<unit-id>.svg`

- Unidades del `viewBox` = **centímetros** (una unidad de 6 × 8 m → `viewBox="0 0 600 800"`).
- Grupos obligatorios:
  - `<g id="walls">`: paredes como `rect`, con grosor real (15 cm interiores, 25 cm exteriores). El parser aún no acepta `path` (ver Aparcado en `TAREAS.md`).
  - `<g id="spaces">`: un `<polygon id="<space.id>">` por espacio. El `id` debe coincidir con `Space.id`.
  - `<g id="openings">`: puertas (`data-type="door"`) y ventanas (`data-type="window"`) como `rect` que marcan los huecos.
- Opcional: `<g id="furniture">` con `rect` y `data-item="bed|sofa|table|…"` para colocar muebles low-poly.
- Sin transformaciones, estilos en línea ni grupos anidados. La geometría va limpia. `lib/plan.ts` rechaza lo que se salga de la convención.
- El `viewBox` empieza en `0 0`. Balcones y terrazas van fuera de los muros exteriores, como polígonos sin pared (por eso el `viewBox` incluye su franja).
- `Unit.areaM2` es el área total (interior bruto + balcón o terraza); `Space.areaM2` es el área útil del polígono.

**Extrusión a 3D** (`components/plan/planToMesh`):
- Paredes a 2,6 m de alto, con huecos de puertas a 2,1 m y ventanas de 0,9 a 2,2 m.
- Piso por espacio con su propio material (permite resaltarlo al hacer hover o clic).
- Sin techo. Maqueta con material mate cálido y oclusión ambiental.

## 5. Edificio procedural (v1)

Desde `site.building`:
- `footprint`: polígono en metros.
- `floors` y `floorHeightM`.
- `style.cladding` (opcional): `ladrillo`, `estuco` o `concreto`. Por defecto, estuco.
- Fachada realista (D-026): machones, antepechos y dinteles del revestimiento; ventanas con marco de aluminio, vidrio retranqueado e interior tenue; losas de concreto; primer piso vidriado con marquesina en la fachada principal; retranqueo con terraza, baranda y materas en el último piso; cubierta con parapeto y pérgola. Las texturas se generan en canvas, a escala real (UV en metros).
- La fachada principal es el borde que mira a +z (la calle). Las demás salen de los otros bordes del `footprint` (selector de fachada, D-027).
- Cada piso es un grupo separado (para resaltarlo y separarlo).
- Debe verse **intencional y premium**. Si al cerrar el bloque 2 no se logra, se evalúa una vista aérea ilustrada (ver `PLAN.md`).

## 6. Renders en Blender (bloque 5)

- Escena única con los interiores de las 3 unidades, construidos sobre los mismos planos SVG (importados o redibujados a escala).
- **360°:** cámara panorámica equirectangular a 1,5 m de altura, en el centro útil del espacio. Salida en 6144×3072 y versión baja en 2048×1024.
- **Fotos:** 3–5 por espacio, a 3200 px por el lado largo, con encuadres consistentes (ángulo amplio, detalle, vista).
- Luz natural de tarde bogotana (cálida, suave) y una paleta coherente con `tokens.json`.
- Los originales van fuera del repo; al repo solo entran las salidas del pipeline o los placeholders livianos.

## 7. Pipeline de assets (`pipeline/`)

| Script | Entrada | Salida |
|---|---|---|
| `optimize-glb` | `.glb` / `.gltf` | GLB con Draco o Meshopt + texturas KTX2 |
| `optimize-images` | jpg / png / tif | AVIF + WebP en 480, 960 y 1600 px + miniatura borrosa |
| `tile-pano` | equirectangular | versión baja (2048 px) + teselas |
| `optimize-splat` | `.ply` | SPZ / SOG (preparado, sin uso aún) |
| `upload-r2` | `dist-assets/` | bucket R2 por hotel (fase de despliegue) |
| `placeholders.mjs` | `hotel.json` | SVG livianos (~1,5 KB) con el nombre del espacio para cada medio `media/**/*.svg` que falte. Solo demo; `pnpm placeholders` (con `--force` los regenera) |

`pnpm assets` corre todo sobre `content/` y deja el resultado en `dist-assets/`. Cada script es idempotente y omite lo que ya está procesado.

## 8. Captura con el primer cliente (referencia)

- **360°:** alquilar una cámara tipo Insta360 o Ricoh Theta por día, con trípode, sin personas y con las luces encendidas. Unos 5 minutos por espacio.
- **Exterior:** contratar a un piloto de dron por horas (él pone el equipo y los permisos). En Bogotá hay que revisar la regulación de Aerocivil y las zonas restringidas cerca de El Dorado.
- **Splat interior:** video lento recorriendo el cuarto, procesado en Postshot, Polycam o KIRI.
- **Plano:** lo entrega el hotel o se levanta con medidas; luego se dibuja en SVG siguiendo §4.
- **Derechos:** el contrato define quién es dueño de las fotos, los panoramas y los modelos, y qué pasa al terminar.
