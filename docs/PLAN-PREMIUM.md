# Plan — modo Premium con Higgsfield

Qué se genera, con qué referencia, en qué orden y dónde queda. Se ejecuta con el MCP de Higgsfield (cuenta **Prodigia**, plan Ultra) y **todo lo generado se descarga al repo**: después el sitio no depende de Higgsfield. Bloque 9, D-065.

## 1. Objetivo

El mismo hotel en tres niveles, con un selector en la demo: **"Ver como: Esencial · Inmersivo · Premium"**.

| Nivel | Qué se ve | Medios |
|---|---|---|
| Esencial | Habitaciones en 360° y fotos, sin 3D (modo lista) | Los actuales |
| Inmersivo | Edificio 3D, pisos, maqueta amoblada | Los actuales (renders del 3D) |
| Premium | Lo anterior con **fotos de nivel profesional** y **videos de entrada** | Nuevos, generados en este plan |

**Regla:** lo Premium tiene que **coincidir con el 3D**: mismos pisos, ventanas, materiales y distribución de muebles. Por eso se parte de los renders del propio 3D (`media/renders/`) como referencia y no se inventa otro edificio.

## 2. Inventario a generar

### Niebla Alta (ficticio; ladrillo, 6 pisos, Chapinero Alto)

**Exteriores (2)**

| Archivo | Referencia | Encuadre |
|---|---|---|
| `fachada-dia` | `renders/fachada-dia.jpg` | Fachada principal, tarde nublada bogotana, cerros con niebla al fondo |
| `fachada-noche` | `renders/fachada-noche.jpg` | La misma fachada al anochecer, ventanas encendidas |

**Zonas comunes (3)**

| Archivo | Referencia | Encuadre |
|---|---|---|
| `lobby` | Planta del piso 1 (sin render) | Lobby: recepción, sala de espera |
| `cowork` | Planta del piso 1 (sin render) | Mesas compartidas, luz cálida |
| `terraza` | `renders/601-terraza.jpg` y `piso-6.jpg` | Terraza del piso 6 con pérgola y vista a los cerros |

**Unidades tipo (14):** una foto por espacio.

| Unidad | Espacios | Referencias |
|---|---|---|
| 201 Estudio | descanso, sala, cocina, baño | `renders/201-*.jpg` |
| 402 Suite con balcón | sala, balcón, cocina, dormitorio, baño | `renders/402-*.jpg` |
| 601 Penthouse | terraza, sala, cocina, dormitorio, baño | `renders/601-*.jpg` |

Las copias (301, 502 y demás) heredan los medios de su plantilla.

**Videos de entrada (4).** Se hacen de imagen a video con cuadro inicial y final, usando las fotos ya generadas:

| Clip | Va de | A | Lo usa |
|---|---|---|---|
| `calle-lobby` | `fachada-dia` | `lobby` | El punto "El lobby" de la portada |
| `lobby-puerta` | `lobby` | La puerta de la 402 (generar ese cuadro) | — |
| `puerta-sala` | La puerta de la 402 | `402-sala` | El punto "Las suites" |
| `sala-balcon` | `402-sala` | `402-balcon` | El final del recorrido |

**Total Niebla Alta:** unas 20 imágenes y 4 videos.

### Akuare (edificio real en Suba; ladrillo; dos torres de 5 pisos; primer piso residencial)

- **Exteriores (2):** `fachada-dia` y `fachada-noche`, desde `renders/fachada-*.jpg`, con **fotos tomadas por Jacobo desde la calle** como referencia de color y detalle. **No se usa Google Maps ni Street View** (sus términos lo prohíben).
- **Zonas comunes (2):** `lobby` (portería pequeña) y `salon-social`.
- **Unidades tipo (13):**

| Unidad | Espacios |
|---|---|
| 101 Tres alcobas | cocina, baño, alcoba-3, alcoba-2, sala, alcoba, balcón |
| 102 Dos alcobas | cocina, baño, alcoba-2, sala, alcoba, balcón |

- **Videos (2):** `calle-porteria` y `sala-balcon` (101).

**Total Akuare:** unas 17 imágenes y 2 videos. **Espera las fotos de Jacobo** para la fachada; los interiores pueden ir antes.

## 3. Cómo se genera

1. **Revisar la cuenta:** `balance` y `list_workspaces` (que sea Prodigia, plan Ultra). Con `models_explore` (`unlim: true`) ver qué modelos de imagen y video entran sin gastar créditos en el plan. **Revisar los términos de uso comercial del plan** antes de publicar.
2. **Escoger el modelo** con `models_explore(action: "recommend")`: imagen con referencia que conserve la estructura (edición o imagen a imagen) y video con cuadro inicial y final.
3. **Prueba primero, una sola imagen:** `402-sala`. Se mira junto al render: ¿conserva los muebles, la ventana al balcón y los materiales? Se ajusta el prompt hasta que sí. **Se le muestra a Jacobo antes del lote.**
4. **Lote** con `generate_image_batch`, `jobs_wait` y una sola revisión con `show_generation_by_ids`. Lo que se aleje del 3D (otro número de pisos, otra distribución) se rehace.
5. **Videos** al final, desde las fotos aprobadas.

**Prompt base (se ajusta en la prueba):**
> Professional architectural/interior photograph of the same space as the reference image. Keep the exact layout, furniture positions, window and door placement, materials and camera direction. Photorealistic, natural light of an overcast Bogotá afternoon, warm interior lighting, 24 mm lens, eye level 1.5 m, straight verticals, editorial real-estate photography. No people, no text, no logos, no watermarks.

- Exterior de Niebla Alta: añadir "red brick façade, six floors, ground-floor glass lobby with a small dark canopy reading nothing, eastern hills of Bogotá with low mist".
- Akuare: añadir "residential building, two five-storey towers, ground floor with garage shutters, a small shop and a small pedestrian door".

## 4. Dónde queda (para no depender de Higgsfield)

- **Imágenes:** se descargan a `.tmp/`, se pasan a WebP (1600 y 960 px) con sharp y quedan en `content/hotels/<slug>/media/premium/`.
- **Videos:** se re-codifican cuadro a cuadro (como los de la página de Antesala) en 720 y 1280. Van a `public/demo/<slug>/` mientras sea demo; con un cliente real, a R2 (regla 6).
- **Registro:** `docs/identidad/premium-higgsfield.json` con archivo, `job_id`, modelo, prompt y referencia. Así se puede rehacer cualquiera.
- **Contenido:** todo medio lleva `fidelity: "ilustrativa"`.

## 5. Código (después de tener las imágenes)

- `Media.tier?: "premium"`: los medios premium solo se muestran en el nivel Premium.
- **Selector de nivel** en la banda de demo, solo si el hotel tiene medios premium. Se guarda en la dirección (`?nivel=esencial|inmersivo|premium`) para que los "Ver ejemplo" de los precios abran cada nivel.
  - **Esencial:** fuerza el modo lista (sin 3D) y oculta lo premium.
  - **Inmersivo:** como hoy.
  - **Premium:** portada con la foto premium y los puntos con video; galerías con lo premium primero; telón de carga con la foto premium.
- Los "Ver ejemplo" de Esencial, Inmersivo y Premium apuntan a Niebla Alta en cada nivel.
- Verificación: `pnpm shots` a 390 y 1440, y mirar las capturas.

## 6. Orden

1. Revisar la cuenta y el modelo.
2. Prueba `402-sala` y visto bueno de Jacobo.
3. Lote de Niebla Alta: exteriores, zonas comunes y las unidades 201, 402 y 601.
4. Videos de Niebla Alta.
5. Código del selector de nivel y de los medios premium.
6. Akuare: interiores ya; la fachada cuando lleguen las fotos de Jacobo.
