# Tareas

Lista viva. Claude Code marca `[x]` al terminar y agrega las tareas nuevas que aparezcan. El orden dentro de cada bloque es el sugerido.

Leyenda: `[ ]` pendiente · `[x]` hecha · `[~]` en curso · `[-]` descartada (con motivo)

## Bloque 0 — Preparación (Jacobo)

- [x] Crear el repo en GitHub (privado) y subir `CLAUDE.md`, `docs/` y `prompts/`
- [ ] Conectar el MCP de 21st.dev en Claude Code (para traer Unlumen UI y SmoothUI)
- [x] Elegir el nombre del servicio: **Antesala**
- [ ] Verificar Antesala en la SIC (clases 42 y 35), los dominios (.co / .com) y el usuario en Instagram
- [ ] Confirmar el nombre y la marca del hotel ficticio (provisional: Niebla Alta)
- [x] Elegir el acento de color de la demo: bronce `#7D5F3B` (D-014)

## Bloque 1 — Base

- [x] Crear el proyecto Next.js + TypeScript estricto + Tailwind v4 + shadcn/ui (pnpm)
- [x] Configurar ESLint, los scripts (`dev`, `build`, `lint`, `typecheck`, `shots`) y Playwright
- [x] `lib/types.ts` con el modelo de `ARQUITECTURA.md` §4
- [x] `lib/content.ts`: loader por slug + validación zod + chequeo de que los ids coincidan con los SVG
- [x] `content/hotels/niebla-alta/hotel.json` completo (6 pisos, 3 categorías, 3 unidades, 3–5 espacios cada una)
- [x] `tokens.json` y su paso a variables CSS
- [x] 3 planos SVG con la convención de `CONTENIDO.md` §4 y medidas realistas
- [x] Layout `h/[hotel]` con DemoBanner, BookingBar y el pie "con tecnología de Antesala"
- [x] Modo lista: entrada → pisos → unidad → espacio
- [x] `PlanSvg`: plano 2D con hover y clic por espacio
- [x] Galería con placeholders y FidelityBadge
- [x] `lib/whatsapp.ts` + botón con mensaje prellenado
- [x] Capturas a 390 y 1440 px de todas las rutas; revisarlas
- [x] Recalibrar el estimado del plan en la bitácora
- [x] `pnpm budget` (JS inicial vs. presupuesto) y chequeo de imágenes rotas en `pnpm shots`
- [x] Generador de placeholders `pipeline/placeholders.mjs`
- [ ] Probar el recorrido en un celular real (iPhone y Android) — pendiente de Jacobo
- [x] ~~Revisar con Jacobo si se suman unidades en los pisos 3 y 5~~ resuelto: las 21 habitaciones son unidades (D-047)

## Bloque 2 — Escena exterior

- [x] Canvas persistente en el layout, con carga diferida y `lib/capabilities.ts`
- [x] Edificio procedural desde `site.building`, con un grupo por piso
- [x] Material de maqueta, luz, cielo y oclusión ambiental (N8AO y sombras solo en calidad alta)
- [x] `CameraRig` con GSAP, sincronizado con la ruta
- [x] Selector de piso: resaltado, separación del piso y panel de unidades
- [x] Hotspots de zonas comunes (lobby, cowork, terraza)
- [x] `PerformanceMonitor` y niveles de calidad
- [x] Unidades 301 y 502 para que cada piso tenga contenido (D-019)
- [x] Capturas 3D en `tests/shots-3d.spec.ts` (D-024)
- [ ] Prueba en un celular real; anotar los FPS en la bitácora — pendiente de Jacobo (probar también `?calidad=alto`)
- [ ] **Decisión:** ¿el edificio se ve premium? Registrarlo en `DECISIONES.md` — pendiente de Jacobo tras verlo en el celular (mi evaluación está en la bitácora)
- [x] Preguntar antes del 3D en equipos justos; la calidad nunca baja a lista sola (D-025)
- [x] Cámara a las fachadas: vuelo de entrada y selector de fachada (D-027)
- [x] Realismo v1: escena de día, fachada de ladrillo con ventanas reales, calles, árboles, vecinos y cerros (D-026)
- [x] Prefetch del chunk 3D desde la entrada (precarga en ocio, D-029)
- [x] Realismo v2: HDRI y texturas PBR CC0 (Poly Haven), balcones en las suites, faroles, entrada de hotel con letrero (D-031, D-032)
- [x] Render en dos capas: fondo congelado con desenfoque en movimiento y edificio en vivo (D-028)
- [x] Carga escalonada: precarga en tiempo ocioso, texturas reales progresivas y noche en poscarga (D-029)
- [x] Ventanas con cuarto en paralaje y cortinas; luces por unidad con hover y chips de fachada (D-030)
- [x] Día y noche, por defecto según la hora del dispositivo (D-031)
- [x] Vista desde la ventana de cada unidad (D-033)
- [x] `netlify.toml` para desplegar la demo en Netlify
- [ ] Árboles con follaje más natural (copas con textura de hojas) y algún carro quieto en la calle
- [x] Vista desde la ventana en el panel de la unidad
- [x] Planta del piso dentro del cajón (D-041) y en 2D en modo lista
- [x] Miradores 360° en vivo en la terraza (D-042)
- [x] Mostrar las unidades sobre la planta del piso seleccionado (D-041, D-047)

## Bloque 3 — Maqueta de unidad

- [x] `planToMesh`: paredes extruidas con huecos de puertas y ventanas
- [x] Pisos por espacio con resaltado al hacer hover o clic
- [x] Muebles low-poly desde `<g id="furniture">`
- [x] Transición de cámara piso → unidad → espacio (la maqueta aparece dentro del edificio, D-034)
- [x] Probar con las 3 unidades (capturas 3D de las 5 unidades y de un espacio)
- [x] Muebles con algo más de forma (D-044)
- [ ] Prueba en celular real de la maqueta

## Bloque 4 — Detalle de espacio

- [x] Visor 360° (propio, en la misma escena; D-036) con hotspots y navegación entre espacios
- [x] Galería con zoom progresivo (doble toque, rueda, arrastre y botones +/−)
- [x] Ficha del espacio y SpaceChips (panel sobre la escena; plegable en móvil)
- [x] Fundido entre la maqueta y el 360° (la cámara entra al espacio y se abre a 75°)
- [x] Panoramas placeholder con geometría real (`pipeline/panos.mjs`, D-037)
- [x] Recorrido completo; capturas
- [ ] Prueba con 2–3 personas ajenas al proyecto (punto de decisión del bloque 4) — pendiente de Jacobo
- [ ] Giroscopio del celular para mirar alrededor en 360°

## Bloque 5 — Contenido (aplazado hasta el primer cliente, D-040)

- [ ] Escena de Blender con los interiores de las 3 unidades
- [ ] Renders 360° por espacio
- [ ] 3–5 fotos por espacio
- [ ] Scripts `optimize-images`, `tile-pano` y `optimize-glb`
- [ ] Reemplazar los placeholders; verificar los presupuestos de peso

## Bloque 6 — Ganchos de venta

- [x] Comparador de categorías (`/comparar`)
- [x] "Elige tu unidad exacta" con alzado, diferencia de precio y vista (ficha y panel de la unidad)
- [x] WhatsApp prellenado con la unidad, las fechas, noches y huéspedes (hoja de reserva)
- [x] Panel de métricas simuladas (`/panel`), incluida la comisión de OTA ahorrada

## Bloque 7 — Pulido y despliegue

- [x] Entrada de marca (solo CSS, D-043)
- [x] `prefers-reduced-motion` y botón Saltar
- [x] ~~i18n con ES y EN básico~~ aparcado (D-045)
- [x] Muebles por piezas, acabados de piso y lobby propio en el piso 1 (D-044)
- [x] Tarjeta de zona común que se abre hacia abajo si el punto está arriba (terraza)
- [x] Lighthouse contra Netlify (accesibilidad 100, buenas prácticas 100; rendimiento 56-73)
- [ ] Pruebas en un Android de gama media y un iPhone
- [x] Retroalimentación de las primeras personas: luz de la planta, maqueta abierta, zoom, fondo de la unidad, guía, todas las habitaciones, recorrido amoblado (D-046 a D-049)
- [x] Rendimiento móvil: precarga por intención en táctil y plantas en tiempo libre (D-051)
- [x] Estabilidad del 3D en celular: piso que se rompe, fondo negro, colores, trabas (D-051)
- [ ] Volver a medir Lighthouse con la precarga por intención
- [x] Fotos de galería generadas desde la escena 3D: primera foto de cada espacio, fachada y piso (D-053)
- [x] Página de Antesala y portada del hotel como sitio web completo (D-053)
- [ ] Más ángulos por espacio con `pnpm renders` para reemplazar las fotos 2 a 4 de muestra
- [ ] Despliegue en Vercel; assets en R2 si hace falta
- [x] Revisar todos los criterios de `PRODUCTO.md` (bitácora 2026-11-07)

## Bloque 8 — Salida a vender

- [x] Guion de demo de 3 minutos (`docs/VENTA.md`)
- [x] Verificar en la web que los prospectos no tengan ya un tour 360° (confirmar en persona)
- [x] Mensajes de primer contacto para Monir y Nico (KingDome aparcado)
- [x] Sección de dominios, hosting y transferencia (`docs/ENTREGA.md`)
- [ ] Copiar `docs/ENTREGA.md` al documento maestro (artifact del plan)
- [x] Guion, gancho y mensaje para constructoras (`docs/VENTA.md`, D-060)
- [ ] Confirmar por teléfono a Monir y Nico (siguen operando igual, sin tour 360°)
- [ ] Lista de 5 constructoras con proyectos sobre planos en Bogotá y primer mensaje
- [ ] Pasar Vercel a Pro antes de la primera factura (Hobby no permite uso comercial)
- [ ] Definir precio de la mensualidad y tope de transferencia; revisión legal del contrato
- [x] Página web como servicio para quien no la tiene; MamutHerd S.A.S. en la página de Antesala y en los docs (D-061)
- [ ] Precio de la página web sola (por debajo del piloto con 3D)

## Bloque 9 — Modo renders (D-060, aprobado 2026-11-12, D-065)

- [x] Portada con imagen (render o foto) y puntos tocables (torres, zonas): `site.cover`; Niebla Alta con terraza, suites y lobby
- [x] Video de transición al tocar un punto (con alternativa sin video y respetando movimiento reducido)
- [x] Planta del piso con las unidades en verde o terracota según disponibilidad, con leyenda (sobre el plano vectorial; una imagen de render puede ir debajo después)
- [x] Unir con lo que existe: los puntos llevan al piso y a la unidad; la planta usa el mismo plano y la oferta (noche, mes o venta)
- [ ] Contenido fotográfico propio para Niebla Alta (las fotos de Higgsfield actuales son de la página de Antesala) y para Akuare (solo interiores ilustrativos, nunca la fachada real); requiere conectar Higgsfield
- [x] Plan del modo Premium: `docs/PLAN-PREMIUM.md` (inventario, prompts, dónde queda cada archivo, orden)
- [x] Higgsfield conectado (cuenta Prodigia, Ultra). Prueba `402-sala` hecha y guardada en `media/premium/` (el MCP cobra créditos; el lote va por la web)
- [x] Kit para la web de Higgsfield: 29 referencias y prompts en `.tmp/kit-premium/` (lista en `docs/identidad/premium-kit.json`)
- [x] Jacobo generó el kit (29 imágenes, tabla en `docs/identidad/premium-finales.md`)
- [x] Fotos traídas, pasadas a WebP y registradas como primera foto de cada espacio (D-071)
- [x] Fotos que se pueden mirar (arrastrar o inclinar el celular), sin ser 360°
- [x] Medios marcados por nivel (`tier: "premium"`, D-072)
- [x] Piso abierto: las habitaciones reciben clics otra vez; luz cálida solo sobre la habitación bajo el mouse; enlace a Antesala sobre la escena
- [x] Fuera "Así se entra" de la página de Antesala (D-073)
- [ ] **3D realista con luz horneada en Blender (D-074, `docs/PLAN-REALISTA.md`)**: instalar Blender en D: y el MCP `/use-blender`; prueba con la Suite 402 y un 360° fotográfico
- [x] Blender 5.2.4 en D:; texturas y modelos CC0 de Poly Haven; `amoblar.py` (muebles modernos, cortinas, cuadros, sin caras coplanares); horneado y GLB con Draco
- [x] Maqueta realista en el visor (`Unit.realista`), con los pisos para el mouse y el velo cálido
- [x] Lote de las unidades tipo de Niebla Alta (402, 201 y 601) con `pipeline/realista/lote.py`
- [x] Selector "Ver como: Esencial · Inmersivo · Premium" (D-075) y "Ver ejemplo" por nivel en los precios
- [x] Fachada realista de Niebla Alta horneada por piso (ventanas encendidas y pisos que se abren intactos)
- [ ] Akuare: unidades y fachada realistas (cancelado esta noche a pedido de Jacobo)
- [ ] Horneado nocturno propio de la fachada (hoy, el de día oscurecido)
- [x] Esquinas negras de los muros en la maqueta realista
- [x] Zonas más oscuras que en el render (curva de tono del visor sobre lo horneado)
- [x] 360° en vivo: la cámara en el punto más despejado del cuarto (el dormitorio en L del 601 la dejaba entre muros)
- [x] Planta del piso abierto horneada en Premium (`Level.realista`, `lote_plantas.py`): piso 1, tipo 2–5 y piso 6
- [x] Del piso a la habitación sin cortes: la planta se desvanece al ritmo del edificio y la horneada entra directo (precargada)
- [ ] Akuare: plantas de piso horneadas (cuando se retome Akuare)
- [x] Coherencia fachada ↔ plano (D-077): 402, penthouse, estudio de esquina y planta tipo corregidos y horneados otra vez; validación en el build
- [ ] Akuare: alcobas 2 y 3 del apartamento de tres alcobas sin ventana
- [x] Sin bordes negros al abrir un piso, color libre/ocupada al pasar el mouse y dos toques en celular
- [x] Portada del hotel como web de hotel real (D-078) y botón de reservar sobrio
- [x] Página de Antesala: tema oscuro, maqueta en el paso 3, calculadora simple, Premium "hiperrealista" (D-079)
- [x] Intro del hotel y suelo de la calle (D-080)
- [x] Entorno apagado en Premium (vecinos sin color para que mande el edificio)
- [ ] Más decoración en la maqueta realista (cojines, objetos, cocina y baño más detallados)
- [ ] Videos de entrada (desde las fotos aprobadas), en la web de Higgsfield
- [ ] Modo Premium con Higgsfield (cuenta Prodigia, MCP en `.mcp.json`): Niebla Alta en los tres niveles con selector "Ver como: Esencial · Inmersivo · Premium"; renders del propio 3D pasados por Higgsfield y videos de entrada desde esas imágenes
- [ ] Modo Premium para Akuare: fachada desde el render del 3D (catastro) con fotos propias de Jacobo desde la calle como referencia (no Google Maps ni Street View: sus términos lo prohíben); interiores ilustrativos
- [ ] Jacobo: tomar fotos de la fachada de Akuare desde la calle (de día, de frente y en diagonal) para usarlas de referencia
- [ ] Assets pesados en R2 (videos y 360° en alta)
- [ ] Demo de constructora con contenido ilustrativo: render propio pasado por IA para acabado fotográfico y video de vuelo generado desde una imagen (etiqueta "ilustrativa"; revisar la licencia comercial de la herramienta)

## Aparcado (no construir sin que Jacobo lo pida)

- [x] **Variante glamping** (D-083): demo *Frailejón*, 4 refugios en el páramo de Guasca, con escena propia (bajada desde el cielo, letreros delgados, valle y vista aérea, día y noche, entrada al refugio)
- [x] Fotos del glamping desde la escena (`pnpm renders -g frailejon`) y tarjeta en la página de Antesala con el mapa real
- [x] Glamping: 3D realista horneado de los 4 refugios (lote.py)
- [x] **Hotel Cénit** (D-085): torre de lujo de 15 pisos y 52 habitaciones, fachada de muro cortina, generada con `gen_cenit.py`
- [ ] Cénit: fotos de la escena, fotos y 360° de Blender, 3D realista de las 4 habitaciones tipo, plantas y fachada (tanda de la noche del 2026-11-15)
- [x] Pisos pegados al costado del edificio (FloorTags), en vez de tocar el piso o de la columna
- [x] Identidad de la web de cada hotel (D-086) y franja de reserva directa
- [x] Demos y Ver ejemplo en otra pestaña
- [x] Fotos y 360° por espacio en Blender (D-084), visor "Mirar en 360°" y más decoración en las maquetas
- [x] Revisar la tanda de la noche: renders de la escena, 3D realista de habitaciones, plantas y fachada de Cénit; fotos y 360° de Niebla 402 y 201 y de Cénit 301 y 302
- [ ] Fotos y 360° que faltan (se cortaron el 2026-11-16 porque Jacobo necesitaba el PC): Cénit 303 y 304, Penthouse 601, los 4 refugios de Frailejón. Comando: `MUESTRAS=32 python pipeline/realista/lote_fotos.py cenit:303 cenit:304 niebla-alta:601 frailejon:encenillo frailejon:laguna frailejon:piedra frailejon:casa`

### Rendimiento y carga (pedido de Jacobo, 2026-11-16: "en el celular va muy lento")

Medido en celular simulado (CPU 4× más lenta, 4G): Cénit Premium tarda 11 s en mostrar la escena, baja 7,3 MB y corre a **2 fps**; Inmersivo, 10 s, 3,8 MB y 51 fps. La causa principal: la fachada realista tiene una textura de luz por piso (15 de 2048 px + 15 de 1024 px ≈ 420 MB de memoria de video).

- [x] Fachada realista en un solo atlas compartido por todos los pisos (`hornear_edificio.py`) y rehornear Cénit y Niebla Alta
- [ ] Texturas comprimidas para la GPU (KTX2/Basis) en vez de WebP: ocupan 4 a 6 veces menos memoria de video
- [x] Cargas por tandas: el cielo de noche solo al pedirlo, cielo de 512 px en celular, las plantas realistas solo al abrir el piso (D-087)
- [x] La calidad no baja durante la carga y se recupera; piso de resolución 1,25 en celular ("se ve pixelado")
- [ ] Medir con `pnpm perf` Cénit y Niebla Premium con las fachadas en atlas y anotarlo en `docs/CARGA.md` §1
- [ ] Pedir permiso a Jacobo para instalar KTX-Software (`toktx`) y pasar las texturas a KTX2
- [ ] Cambiar entre Inmersivo y Premium sin trabarse: precargar lo de Premium en segundo plano y cambiar cuando ya esté listo
- [x] Quitar el botón "Entrar" del telón de carga (dejaba ver la escena a medio cargar)
- [x] Subir la sensibilidad al girar (maqueta y 360°)
- [x] Dos puntos de 360° en los espacios largos (la habitación de Cénit incluye el pasillo: el 360° de hoy muestra la puerta y no la cama)
- [x] Investigar cómo cargan D5 Render, Matterport y otros visores profesionales, y escribir `docs/CARGA.md` (qué se carga y cuándo, presupuestos por nivel y por dispositivo)
- [x] Escribir `docs/RENDER.md`: plan paso a paso para el render hiperrealista en el PC prestado (qué, en qué orden, con qué ajustes y cuánto tarda), sin depender de esta conversación

### Primera vista y entorno (pedido de Jacobo, 2026-11-16)

- [x] **La primera vista es una panorámica del edificio** (hecho el 2026-11-16; revisar en el celular de Jacobo): al llegar, la cámara queda en un ángulo en 3/4 (dos fachadas a la vista, un poco desde arriba), donde el edificio se aprecia completo. Hoy arranca de frente, y en Cénit muy de frente y muy bajo. Revisarlo en los cuatro hoteles y a 390 px
- [ ] **El fondo no parece un lugar real:** hoy se ve como un decorado genérico pegado atrás (bloques iguales, montaña plana). Hay que hacer que el barrio se sienta como un sitio:
  - variedad de alturas, colores y retiros en los vecinos;
  - calles con andenes, cruces y árboles que sigan la trama;
  - cerros orientales con relieve y bruma por distancia;
  - un cielo que case con la hora;
  - transición suave del barrio al horizonte, sin un borde visible.

  Sin Google Maps ni fotos reales. Cuidar el presupuesto de rendimiento de arriba: el fondo debe ser barato (instanciado, sin sombras de los lejanos)

### Notas del papá de Jacobo (2026-11-16): sencillo, intuitivo y que jamás se trabe

- [ ] Volver junto a "Reservar" (no respondía: faltaba `pointer-events-auto`), también en celular. Arreglado en el código, sin subir
- [ ] Números de piso dentro de la pantalla en celular. Arreglado en el código, sin subir
- [ ] **Que jamás se trabe el paso de piso a apartamento** (D-089: compilar los shaders antes del vuelo). Medir con `pnpm transicion`; aplicar lo mismo a abrir un piso y a entrar a un espacio
- [ ] Letreros por apartamento con dos toques (`UnitTags.tsx`). Hecho, falta verlo en el celular
- [ ] Panel del espacio más simple (fila de espacios arriba; "Fotos y detalles"). Hecho, falta verlo en el celular
- [ ] **Rediseño de la página de Antesala:** estética propia (bordes, botones, fuentes), que no se vea genérica ni hecha con IA
- [ ] Menos botones en general: revisar cada pantalla de la demo y quitar lo que no hace falta
- [ ] La sombra de la sala a veces falla (preguntar a Jacobo en qué modo y desde dónde)
### Notas de Jacobo recorriendo Niebla Alta (2026-11-24), en orden: primero el edificio, la página del hotel al final

- [x] **La guía "Así se recorre el hotel" es gigante** — hecho el 2026-11-25: ahora es la misma píldora pequeña de las otras ayudas ("Toca el número de un piso para abrirlo"). Antes: tapaba la escena al entrar
- [ ] **Quitar el aviso "Hotel ficticio" de la franja de arriba dentro del 3D:** ya se sabe que es una demo; sobra
- [ ] **Puntos naranja de las zonas comunes sobre el edificio** (terraza, lobby…) molestan a la vista. Mejor: que esa información aparezca al abrir el piso donde está (el lobby en el piso 1) y que **la terraza sea el último piso** en la lista de pisos
- [ ] **Abrir un piso carga lento.** Idea de Jacobo: al entrar a un piso, dejar en pantalla solo ese piso (sin el resto del edificio), con un botón para volver y cambiar de piso desde ahí. Debería ir mucho más rápido
- [ ] **En el piso 1, los letreros de Lobby y Cowork con esos colores se ven feos.** Rediseñar el estilo de los letreros de lugares comunes
- [ ] Esencial / Inmersivo / Premium: las fotos y los 360° todavía no tienen el tiempo de trabajo que merecen (revisar con calma)
- [ ] **La página de Niebla Alta (portada del hotel) se ve muy mal: rediseñarla.** Va al final, después de lo del edificio

- [x] **Traducción (ES / EN y más)** — hecho el 2026-11-25 en inglés (D-094); otros idiomas cuando haga falta. Antes: (Jacobo, 2026-11-24: un amigo de Nueva Zelanda quiere mostrarlo a amigos de otros idiomas). Hoy ya sirve el traductor del navegador (casi todo es texto HTML). Bien hecho:
  - diccionario por idioma para la interfaz (unos 60 componentes);
  - textos de cada hotel por idioma dentro de su carpeta (regla 1);
  - selector de idioma y rutas `/en/...`, con el del navegador por defecto.

  Empezar por inglés; preguntar qué otros idiomas. Anotado, sin hacer
- [x] **El botón del recorrido 3D está muy escondido** — hecho: botón grande en la portada del hotel y píldora en el menú. Antes:: es la función estrella y debe verse de primeras (Jacobo, 2026-11-24). Confirmar con Jacobo si es el de la portada del hotel o el de la página de Antesala. Anotado, sin hacer
- [ ] **La vista por la ventana no es real** (Jacobo, 2026-11-23, con captura de la cocina de la Suite 402 en Premium): afuera se ve el barrio del 3D (cajas con ventanas pintadas) y, de cerca, la maqueta horneada se ve borrosa. Propuesta:
  1. en Premium, el 360° muestra la **foto 360° renderizada** (ya existe, hiperrealista) en vez de la maqueta en vivo; la maqueta en vivo queda para Inmersivo;
  2. volver a renderizar los 360° y las fotos con una **ciudad creíble por la ventana**: cielo y ciudad lejana fotográficos de Poly Haven (CC0, desenfocados) y, cerca, el barrio del 3D con más detalle, para que cuadre con lo de afuera (regla 9).

  Son horas de render: una noche aquí o el PC del amigo. Anotado, sin hacer
- [ ] **Números de piso al costado del edificio (FloorTags):** no se mueven parejo. Cada piso busca por su cuenta la esquina más a la derecha, así que con perspectiva quedan corridos unos de otros y las líneas finas se ven sueltas. Deberían ir en una sola columna alineada. Además, **mientras la persona gira la cámara deberían desvanecerse y volver al detenerse**, como los letreros de las unidades (Jacobo, 2026-11-23, con captura de Niebla Alta de noche). Anotado, sin hacer
- [x] **Giro entre fachadas más rápido** (Jacobo, 2026-11-25: "fluido pero rápido") — hecho: de 2,6 s fijos a 1,2 s por cuarto de vuelta (1,6 s media vuelta), curva `power2.inOut`
- [x] **Encabezado del hotel oscuro** (Jacobo, 2026-11-25: "se vería mejor oscuro en vez de ese blanco") — hecho: el encabezado sólido de la página del hotel, la lista y la vista guiada va en tinta con textos claros; sobre la foto de la portada sigue transparente
- [ ] **Noche en Premium:** cuando la demo carga de noche (la hora se toma sola), las sombras de las ventanas se ven mal. Revisar las sombras y la luz de las ventanas con la fachada horneada de noche (Jacobo, 2026-11-16)

### Vista guiada (D-095, pedido de Jacobo, 2026-11-25: "con lo que tengamos… cuida las perspectivas")

- [x] Captura desde nuestro 3D (`pipeline/guiada.spec.ts`): video de llegada, torre con contornos de pisos, una planta por piso, en horizontal y vertical
- [x] Página `/h/<slug>/guiada` (y `/en`): llegada → pisos → solo el piso (entra girando) → unidad (plano, fotos, 360°), con el estado en la URL y la barra de reserva siguiendo lo que se ve
- [x] Botón "Vista guiada" en la portada del hotel (solo si hay manifest)
- [ ] Jacobo la prueba en su celular y dice qué ajustar (tiempos, giro de la planta, tamaño de las etiquetas)
- [x] Llevarla a Niebla Alta (2026-11-26)
- [x] Un solo botón "Recorrido 3D" que pregunta guiado o libre, y selector entre modos en el mismo lugar (D-097)
- [x] Idioma al instante en los recorridos (D-098)
- [x] Ciudad más real y en segundo plano; vecino sobre la base de Cénit
- [x] Números de piso que se esconden al girar
- [x] Documento del agente productor (`docs/PRODUCCION.md`, `.claude/agents/productor.md`)
- [ ] Gimnasio u otro tipo de espacio: decidir con Jacobo la oferta (membresía, clase de prueba) y los muebles nuevos antes de producirlo (`docs/PRODUCCION.md` §0.1)
- [ ] Con renders de Cycles (decisión abierta 16): cambiar las imágenes por las fotorrealistas, el visor queda igual
- [ ] Botón también dentro del 3D (para pasar de uno a otro) si Jacobo lo quiere
- [x] Pantalla completa (sin franja ni encabezado), marca abajo a la izquierda, controles arriba (idioma, día/noche, cerrar), torre ancha (2800 px), brillo por estado en vez de recuadro, planta arrastrable que vuelve sola, reserva solo con habitación abierta (D-096)
- [x] Día y noche: torre y plantas de noche capturadas (2026-11-25)
- [x] **Plantas de la vista guiada con la planta horneada (Premium)** — hecho el 2026-11-26. Había dos fallas: (1) la planta del piso abierto no se volvía a pedir si su carga se reiniciaba (`useLevelPlans`); (2) el GLB se pedía antes de que la escena registrara su renderer y, sin KTX2, no se leía (`gltf.ts`). Las dos afectaban también a los visitantes: a veces veían la planta de código en Premium
- [ ] **Tarjeta de Frailejón en la página de Antesala:** sigue con el mapa. Hacerle una foto del valle y un refugio con Higgsfield desde su propio 3D (como Niebla Alta, D-070), para que dé ganas de entrar. Pedir el visto bueno de Jacobo antes de generar

### Cénit en el 3D (Jacobo, 2026-11-25, en Vercel)

- [ ] **En el modo libre no deja tocar el piso 15 de Cénit** (Jacobo, 2026-11-26): sin importar cómo se ponga la cámara, el clic sobre el piso 15 no responde, como si algo lo tapara. Revisar qué intercepta el rayo arriba de la torre (la cubierta, la pérgola, la terraza o el número del piso). Anotado, sin hacer

- [x] **Paredes de la habitación de Cénit en la maqueta** — hecho el 2026-11-26: no se quitaban las de fachada, todo se cortaba a 1,15 m y la fachada de vidrio parecía desaparecer. Ahora es una casa de muñecas: se quitan los muros del lado de la cámara y los demás quedan completos

### Celular (pedido de Jacobo, 2026-11-16)

- [ ] **Revisar todo el sitio en el celular:** la página se ve cortada y mal diseñada en varios puntos. Recorrer la página de Antesala y las demos a 390 px (y en el celular real de Jacobo), anotar cada problema con captura y arreglarlos uno por uno
- [ ] Glamping: revisar en el celular real de Jacobo (fluidez del valle con la vegetación instanciada)
- [ ] Glamping: domos (techo curvo) cuando haga falta para KingDome; hoy los planos solo admiten muros rectos
- [ ] **Splat "wow" del Penthouse.** Opciones: Marble Pro (~$35 USD/mes, con uso comercial) o Apple SHARP (gratis; la licencia de los pesos no está clara). Desde una sola imagen, el splat solo aguanta movimientos cortos de cámara.
- [ ] Supabase, panel administrativo y dominios por hotel (Fase 1)
- [ ] Analytics reales
- [ ] Paredes con `<path>` en `lib/plan.ts` (hoy solo `<rect>`); hace falta para plantas no ortogonales

## Segundo demo — Edificio Akuare (Suba)

- [x] Edificio y barrio reales desde el catastro y OpenStreetMap (`pnpm catastro`, D-056)
- [x] Oferta por hotel: noche, mes o venta (D-057)
- [x] 37 apartamentos sobre la huella real, modo venta (D-058)
- [x] Primer piso real de Akuare (D-081): sin apartamentos (entrada angosta, local, salón comunal, pasillo y parqueaderos); unidades tipo 201 y 202, 32 apartamentos
- [x] Akuare: 3D realista de las unidades 201 y 202, las plantas del piso 1 y del tipo, y la fachada
- [x] Cambio de nivel de noche (Inmersivo → Premium): el fondo se vuelve a dibujar
- [x] Fachada con primer piso residencial y planta del piso 1 alineada
- [x] Sección "Elige una demo" en la página de Antesala (sección Demos)
- [x] `pnpm renders -g akuare`: 16 fotos ilustrativas (fachada de día y de noche, piso 5, espacios de los tipos 101 y 102), revisadas
- [x] Cubierta plana en Akuare (`style.roof: "plana"`): el edificio real no tiene pérgola
- [x] Registrar D-056 a D-059 en DECISIONES.md
- [x] Llevar el generador de planos de Akuare al repo (`pipeline/gen_akuare.py`)
- [ ] **Prueba de captura real en un apartamento de Akuare** (`docs/PRUEBA-CAPTURA-AKUARE.md`): Jacobo graba fotos, 360° y video para Gaussian Splatting; primero el permiso del dueño o la constructora
- [ ] Procesar el splat de la prueba (Postshot o KIRI → SuperSplat → SOG/SPZ) y medir peso y FPS en el celular
- [ ] **Ultra realista (`docs/RECURSOS-REALISTA.md`):** splat sintético desde Blender (necesita GPU: PC nuevo o alquilada)
- [ ] Script de Blender para el splat sintético (cámaras + exportación COLMAP), probado en baja calidad en el PC actual
- [ ] Megascans (gratis en Fab desde 2026-11-05) en las maquetas: Jacobo crea cuenta de Epic y los agrega a su biblioteca
- [ ] Jacobo: decidir la compra (mejora del T440p, 200 a 300 mil, o ahorrar para un PC con NVIDIA)
- [x] Visor de splat por espacio (Spark, D-082); probado con un splat sintético de prueba
- [ ] Visor de splat: probar con un splat real (la captura de Akuare) en el celular de Jacobo; medir peso y FPS
- [ ] Fotos y 360° reales de la prueba en Akuare con `fidelity: "exacta"`, revisados contra el plano (regla 9)
- [ ] **El piso abierto sigue fallando (reporte de Jacobo, 2026-11-08, en Vercel).** Reproducir en su equipo antes de tocar código. Revisar: profundidad de las fachadas retiradas, pisos atenuados encima de la planta y orden de dibujo de la planta frente a los vidrios.
- [x] Sombras congeladas mientras un piso está abierto (D-064). ~~Propuesta de Jacobo: sin sombras mientras un piso está abierto (no aportan y cuestan). Opción: apagar el mapa de sombras del sol en la etapa de piso, o congelarlo, y volver a encenderlo en la vista del edificio.~~

## Web de Antesala (D-062, D-063)

- [x] Identidad aplicada: logo, colores, tipografías, favicon
- [x] Web desde el boceto: intro, recorrido, así se entra (video), demos, precios, Mamut Herd, preguntas, cotización
- [x] Revisión de Jacobo (2026-11-12): scroll fluido (sin vidrio esmerilado sobre el 3D, el 3D dibuja solo cuando se mueve, el video avanza sin pasar por React); el modelo ya no se reinicia al final del recorrido; barra sólida al bajar; entrada que explica la sección de video; tarjetas de Akuare (alzado con vendidos) y glamping (mapa de terreno)
- [x] Telón de carga del 3D fluido (sin filtros de desenfoque animados) y con la foto de portada detrás
- [x] Maqueta: al elegir un espacio, los demás se hunden y desaparecen (D-066)
- [x] Barra de reserva en la esquina derecha en escritorio; selector de fachada en la izquierda (D-066)
- [x] Animaciones visibles con movimiento reducido del sistema (D-067); video con inercia, mosaico de espacios, plano que cabe, bloom al desplazarse rápido (D-068)
- [x] Demos con el símbolo de Antesala y "volver" en la banda superior; Niebla Alta sin las fotos de Higgsfield (son de la página de Antesala)
- [x] Precios: "Recomendado para empezar" en vez de "Más elegido" (nadie ha comprado todavía)
- [x] Paquetes definidos con Jacobo (D-069): Esencial, Inmersivo y Premium con "Ver ejemplo"; varias sedes a la medida
- [ ] Medir en el celular de Jacobo el scroll de la web y la carga del 3D después de estos cambios
- [x] Modo cine (3D y video) y modo ligero (plano y fotos), con botón para cambiar
- [ ] Revisar la web en celular real (sobre todo el video con el scroll en iPhone)
- [ ] Videos en R2 cuando haya cliente (hoy en `public/`, unos 15 MB en total)
- [ ] Ajustes del boceto que Jacobo vaya mandando (precios, textos, ejemplos)
- [x] Rutas `/demo` y `/cotizar` (redirigen a sus secciones)

