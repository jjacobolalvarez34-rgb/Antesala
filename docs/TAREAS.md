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
- [ ] Assets pesados en R2 (videos y 360° en alta)
- [ ] Demo de constructora con contenido ilustrativo: render propio pasado por IA para acabado fotográfico y video de vuelo generado desde una imagen (etiqueta "ilustrativa"; revisar la licencia comercial de la herramienta)

## Aparcado (no construir sin que Jacobo lo pida)

- [ ] **Variante glamping** (terreno + domos) para KingDome. Se activa si KingDome responde. El modelo ya la soporta.
- [ ] **Splat "wow" del Penthouse.** Opciones: Marble Pro (~$35 USD/mes, con uso comercial) o Apple SHARP (gratis; la licencia de los pesos no está clara). Desde una sola imagen, el splat solo aguanta movimientos cortos de cámara.
- [ ] Supabase, panel administrativo y dominios por hotel (Fase 1)
- [ ] Analytics reales
- [ ] Paredes con `<path>` en `lib/plan.ts` (hoy solo `<rect>`); hace falta para plantas no ortogonales

## Segundo demo — Edificio Akuare (Suba)

- [x] Edificio y barrio reales desde el catastro y OpenStreetMap (`pnpm catastro`, D-056)
- [x] Oferta por hotel: noche, mes o venta (D-057)
- [x] 37 apartamentos sobre la huella real, modo venta (D-058)
- [x] Fachada con primer piso residencial y planta del piso 1 alineada
- [x] Sección "Elige una demo" en la página de Antesala (sección Demos)
- [x] `pnpm renders -g akuare`: 16 fotos ilustrativas (fachada de día y de noche, piso 5, espacios de los tipos 101 y 102), revisadas
- [x] Cubierta plana en Akuare (`style.roof: "plana"`): el edificio real no tiene pérgola
- [x] Registrar D-056 a D-059 en DECISIONES.md
- [x] Llevar el generador de planos de Akuare al repo (`pipeline/gen_akuare.py`)
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
- [ ] **Definir los paquetes con Jacobo**: qué incluye cada uno con un ejemplo real de cada nivel (hoy Premium y Corporativo no están definidos)
- [ ] Medir en el celular de Jacobo el scroll de la web y la carga del 3D después de estos cambios
- [x] Modo cine (3D y video) y modo ligero (plano y fotos), con botón para cambiar
- [ ] Revisar la web en celular real (sobre todo el video con el scroll en iPhone)
- [ ] Videos en R2 cuando haya cliente (hoy en `public/`, unos 15 MB en total)
- [ ] Ajustes del boceto que Jacobo vaya mandando (precios, textos, ejemplos)
- [x] Rutas `/demo` y `/cotizar` (redirigen a sus secciones)

