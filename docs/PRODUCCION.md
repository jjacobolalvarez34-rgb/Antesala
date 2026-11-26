# Producción de un espacio nuevo

Cómo se arma, de punta a punta, la experiencia de un lugar nuevo en Antesala. Sirve para un hotel, un apartahotel o un glamping, y para otros tipos de espacio (un gimnasio, un coworking, un edificio en venta). Lo sigue el agente `productor` (`.claude/agents/productor.md`), y también cualquier persona que lo haga a mano.

Todo lo de aquí ya se hizo al menos una vez con Niebla Alta, Cénit, Frailejón o Akuare. Cuando un paso no está probado, se dice.

---

## 0. Antes de empezar: qué tipo de espacio es y qué hay

### 0.1 El tipo de espacio cabe en el modelo?

El modelo de datos (`lib/types.ts`, validado en `lib/content.ts`) piensa en **niveles → unidades → espacios**:

| Concepto | Hotel | Glamping | Gimnasio (ejemplo) | Coworking (ejemplo) |
|---|---|---|---|---|
| `site.kind` | `edificio` | `terreno` | `edificio` | `edificio` |
| Nivel (`levels`) | piso | zona del terreno | piso o sede | piso |
| Unidad (`units`) | habitación o apartamento | refugio | sala (pesas, cardio, clases, piscina) | oficina, sala de juntas, puesto |
| Espacio (`unit.spaces`) | habitación, baño, balcón | estar, alcoba, deck | zona de la sala (área libre, máquinas, vestier) | sala, cocina |
| Lugar común (`site.pois`) | lobby, bar, spa | fogata, mirador | recepción, vestieres, cafetería | recepción, cocina común |
| Oferta (`offer`) | `noche` | `noche` | **no existe todavía** | **no existe todavía** |

Si el tipo de espacio usa los mismos conceptos (niveles, unidades con espacios, una oferta que ya existe), es **solo contenido**: una carpeta nueva en `content/hotels/<slug>/` y nada de código (regla 1 de `CLAUDE.md`).

Si necesita algo que no existe, **primero es código** y se pide visto bueno a Jacobo antes de hacerlo. En un gimnasio, por ejemplo:

- **Oferta nueva**, p. ej. `membresia` (mensualidad o plan) o `visita` (clase de prueba). Se agrega en:
  - `Offer` (`lib/types.ts`) y el `z.enum` de `lib/content.ts`;
  - `OFFER` (`lib/hotel.ts`), con sufijo, etiqueta del precio, CTA ("Agendar clase de prueba"), y los textos de libre y ocupado ("cupos", "lleno");
  - las traducciones en `lib/i18n-en.ts`.
- **Muebles nuevos** para la planta y la maqueta. Hoy los `data-item` son de vivienda y hotel (`bed`, `sofa`, `desk`…, ver `docs/CONTENIDO.md` §4). Un gimnasio necesita, por ejemplo, `treadmill`, `bike`, `rack`, `bench-press`, `mat`. Se agregan en el armador de muebles low-poly del visor y en `pipeline/realista/amoblar.py` para el horneado.
- **Disponibilidad distinta:** en un hotel una unidad está libre u ocupada; en un gimnasio, una sala tiene horario y aforo. Mientras no haya un modelo para eso, `occupied` se usa como "sin cupo hoy" y se anota en `DECISIONES.md`.

Ninguna de estas extensiones debe meter textos, precios ni colores del lugar dentro de los componentes: todo eso va en el contenido.

### 0.2 Qué información hay: tres caminos

| Camino | Qué llega | De dónde sale cada cosa |
|---|---|---|
| **A. Sin información** (demo ficticia) | Nada, o solo una idea ("un gym boutique en Chapinero") | Todo se inventa con coherencia: planos generados por un script, edificio procedural, interiores amoblados y horneados en Blender, fotos y 360° renderizados. Todo con `fidelity: "ilustrativa"` y el aviso de lugar ficticio. |
| **B. Con planos o datos del edificio** | Planos (PDF, DWG, foto de un plano) o la dirección | Planos redibujados en SVG a escala. El edificio, desde el catastro de Bogotá si aplica (`pnpm catastro`). Interiores y fotos renderizados sobre los planos reales. |
| **C. Con fotos o captura en sitio** | Fotos, 360°, video del lugar | Las fotos y los 360° reales reemplazan a los renders en cada espacio (`fidelity: "exacta"`). El 3D sigue saliendo de los planos. Un video lento de un espacio puede volverse Gaussian Splatting (`kind: "splat"`, D-082). Guía de qué grabar: `docs/PRUEBA-CAPTURA-AKUARE.md`. |

Se pueden mezclar: planos reales con algunas fotos reales y el resto renderizado. La regla que no cambia: **con un cliente real, la foto de la unidad exacta nunca se reemplaza con IA ni con un render** (`docs/CONTENIDO.md` §2). Si una imagen representa la categoría y no la unidad, se marca así.

---

## 1. La carpeta del lugar

`content/hotels/<slug>/` (el nombre de la carpeta sigue siendo `hotels` para cualquier tipo de espacio):

| Archivo | Qué es | Cómo se hace |
|---|---|---|
| `hotel.json` | Todo el lugar: niveles, unidades, espacios, medios, contacto, oferta, sitio | A mano o con un script generador (abajo). El build lo valida y falla si algo no cuadra. |
| `tokens.json` | Marca: nombre, lema, colores, tipografía, estilo de portada | A mano. Sin colores del lugar en los componentes. |
| `plans/*.svg` | Un plano por unidad tipo y uno por planta de nivel | Script generador o redibujo a escala. Convención estricta en `docs/CONTENIDO.md` §4. |
| `i18n/en.json` | Textos del lugar en inglés | `python pipeline/i18n_contenido.py <slug>` lista lo que falta; se traduce y se guarda. |
| `media/` | Fotos, 360°, renders, GLB horneados, tomas de la vista guiada | Los lotes de abajo. |

### 1.1 Script generador (camino A, y B cuando hay muchos niveles iguales)

Para un lugar con varias unidades y niveles, se escribe `pipeline/gen_<slug>.py` con el patrón de `gen_cenit.py`, `gen_frailejon.py` y `gen_akuare.py`:

- una sola fuente de medidas: el módulo de fachada, la huella y las unidades tipo;
- genera los SVG de las unidades (las simétricas, en espejo), las plantas de cada nivel y las unidades de `hotel.json`;
- cada ventana del plano cae en el centro de un módulo de fachada (regla 9: lo que se ve afuera es lo que hay adentro).

Uso: `python pipeline/gen_<slug>.py content/hotels/<slug>`.

### 1.2 Unidades tipo y copias

Las unidades iguales comparten plano (`plan`) y horneado (`realista`). Las copias se declaran con `sameAs`, y heredan medios y fotos. Una copia de esquina y una entre medianeras **no** son iguales: la de esquina tiene ventanas al costado y necesita su propia variante de plano (`docs/CONTENIDO.md` §9).

### 1.3 Placeholders

Mientras no hay fotos, `pnpm placeholders` crea marcadores SVG livianos con el nombre del espacio, y `node pipeline/panos.mjs` crea 360° de marcador con la geometría real. Los lotes de render los reemplazan después.

---

## 2. El exterior

| Caso | Cómo |
|---|---|
| Edificio inventado | `site.building` procedural: `footprint`, `floors`, `floorHeightM`, `style` (revestimiento, primer piso, cubierta). `docs/CONTENIDO.md` §5. |
| Edificio real en Bogotá | `pnpm catastro <slug> --via "CL 158" --placa "93A 37"`: huella y pisos desde el catastro, vecinos y calles reales (`context.json`). |
| Terreno (glamping, club campestre) | `site.kind: "terreno"` con el mapa en `plans/terreno.svg` (D-083). |

Alrededor de un edificio inventado va el barrio procedural (`components/scene/Barrio.tsx`), que es genérico y no se toca por lugar. La manzana del lugar queda despejada al frente para que nada tape su base.

---

## 3. El 3D realista (horneado en Blender)

Todo corre **contra el build**: primero `pnpm build`, y no se compila mientras corren los lotes. Cada lote registra su resultado en `hotel.json` y deja su bitácora en `.tmp/realista/lote.log`.

| Pieza | Comando | Sale |
|---|---|---|
| Unidades amobladas y horneadas | `python pipeline/realista/lote.py <slug>:<unidad> …` | `media/realista/<plano>.glb` |
| Plantas de nivel | `python pipeline/realista/lote_plantas.py <slug>:<nivel> …` | `media/realista/planta-<nivel>.glb` |
| Fachada en atlas | `python pipeline/realista/lote_fachada.py <slug> <muestras>` | `media/realista/fachada.glb` |
| Fotos y 360° por espacio | `python pipeline/realista/lote_fotos.py <slug>:<unidad> …` | `media/fotos/<plano>/<espacio>-{360,amplia,detalle}.jpg` |
| Fotos de la escena (fachada, portada) | `pnpm renders -g <slug>` | `media/renders/*.jpg` |

Detalles que importan:

- **Texturas y modelos CC0** de Poly Haven: `python pipeline/realista/bajar_polyhaven.py` (fuera del repo, en `D:/Herramientas/assets-polyhaven`). Cualquier otra fuente se anota en `DECISIONES.md` con su licencia.
- **Calidad:** en el T440p (sin GPU) se prueba en baja. Los lotes finales se corren en un PC con tarjeta de video, con `GPU=1 HIPER=1` y las muestras de `docs/RENDER.md` §3. No se alquila GPU sin permiso de Jacobo.
- **El estilo de cada lugar** (brillo, curva de color) vive en `pipeline/realista/looks.json`, no en el código.
- **Peso:** `optimizar.py` deja las texturas en KTX2/ETC1S (si está `toktx`) y la geometría en Draco. Los presupuestos son criterios de aceptación: `docs/CARGA.md` y `docs/ARQUITECTURA.md` §8.
- **Si cambia un plano,** se vuelve a hornear esa unidad. Si cambia una planta, esa planta. La fachada solo si cambia el edificio.

### 3.1 Fotos "de nivel profesional" con IA (Higgsfield, D-070)

Se pueden pasar los renders propios por Higgsfield para que parezcan fotos. Así se hicieron las de Niebla Alta. Reglas:

- **Siempre desde los renders del propio 3D**, para que coincidan con el edificio y los planos (regla 9). Nunca una foto inventada desde cero.
- Cuenta de Prodigia (plan Ultra). Se genera en la web con el kit de referencias. El MCP sirve para probar y traer resultados.
- Lo aprobado se guarda en el repo (WebP en `media/premium/`) con su registro, y se marca `fidelity: "ilustrativa"`.
- **Pedir visto bueno a Jacobo antes de generar.** Con un cliente real, nunca para la unidad exacta.

---

## 4. La vista guiada (D-095)

El recorrido "como un video": la llegada, la torre con sus pisos y cada planta sola, de día y de noche. Sale de la misma escena 3D:

```
pnpm build
HOTEL=<slug> CUADROS=84 npx playwright test -c pipeline/renders.config.ts guiada.spec
```

- Antes, revisar que no quede un `next start` viejo en el puerto 3100: las capturas lo reutilizan, y uno de otra compilación sirve una página rota.
- `MOMENTO=dia` o `MOMENTO=noche` filtra. `-g "llegada y pisos"` solo hace las llegadas; `-g "· piso [0-9]"`, solo las plantas.
- Salen `content/hotels/<slug>/media/guiada/` (imágenes y `manifest.json`) y `public/demo/guiada/<slug>/` (los videos: Safari en iPhone los pide por rangos).
- Después, medir el color del cielo en la parte de arriba de `pisos-v.jpg` y guardarlo como `sky` en el manifest.
- Las plantas salen con la planta horneada (Premium). Si una no llega en un minuto, la toma recarga una vez y, si tampoco, falla: nunca deja un piso distinto a los demás.
- Con el manifest, el lugar ya muestra el botón "Recorrido 3D → Modo guiado" (D-097).

Revisar las tomas antes de subirlas:

- la torre entera, con la cubierta;
- ningún vecino tapando la base;
- todas las plantas en el mismo estilo (una hoja de contacto con las 2 × n imágenes);
- la noche coherente con el día.

---

## 5. La página de Antesala

Si el lugar es una demo, va su tarjeta en `app/page.tsx` (sección Demos):

- **Foto principal:** del propio lugar (fachada o vista general). Nunca una foto de otro edificio. Si no hay una foto que venda, se usa la toma de la vista guiada (la de noche suele funcionar), recortada a 16:10 en `public/demo/<slug>-<nombre>-960.webp`.
- **Al pasar el mouse:** una foto de adentro.
- **La nota de lugares ficticios** (`DEMOS_NOTE`) incluye al lugar nuevo.

---

## 6. Revisión antes de mostrarlo

1. `pnpm lint`, `pnpm typecheck` y `pnpm build`, sin errores. El build valida la coherencia medible: ventanas, áreas, espacios y polígonos.
2. `python pipeline/i18n_claves.py` y `python pipeline/i18n_contenido.py <slug>`: nada sin traducir.
3. `pnpm shots` (después de `pnpm build`) y **mirar las capturas** a 390 × 844 y 1440 × 900:
   - portada;
   - recorrido libre;
   - vista guiada de día y de noche;
   - un nivel;
   - una unidad;
   - un espacio.
4. `pnpm budget` y `pnpm perf`: dentro del presupuesto. `pnpm transicion` si cambió algo del 3D.
5. La lista de coherencia de `docs/CONTENIDO.md` §9, a ojo:
   - aberturas;
   - copias;
   - textos contra planos;
   - precios iguales en todas las vistas.
6. Transparencia: aviso de lugar ficticio visible, todo medio con su `fidelity`, nada de fotos de lugares reales identificables ni con personas.

---

## 7. Cerrar

- Commits pequeños en español, uno por cambio lógico, como `JacoboLopez <jjacobolalvarez34@gmail.com>`. Push con la cuenta `jjacobolalvarez34-rgb`. Vercel despliega solo lo que firma Jacobo.
- No subir maestros pesados: los 360° en 8K y los `.blend` quedan fuera del repo. Lo pesado de producción va a R2 (regla 6).
- Actualizar:
  - `docs/TAREAS.md`;
  - `docs/BITACORA.md` (entrada al inicio);
  - `docs/DECISIONES.md` (si se decidió algo);
  - `docs/ESTADO.md`.

---

## 8. Tiempos de referencia

| Paso | T440p (CPU) | PC con GPU |
|---|---|---|
| Unidad horneada | ~20 min | 5–10 min |
| Planta horneada | ~9 min | 3–6 min |
| Fachada en atlas | ~1 h | 10–20 min |
| Fotos y 360° de una unidad | 45–100 min | 15–30 min |
| Vista guiada completa (15 niveles, día y noche) | ~20 min | — |
| Vista guiada (6 niveles) | ~15 min | — |
