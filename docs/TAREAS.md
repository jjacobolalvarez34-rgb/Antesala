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
- [ ] Revisar con Jacobo si se suman unidades en los pisos 3 y 5 (ver propuesta en la bitácora)

## Bloque 2 — Escena exterior

- [ ] Canvas persistente en el layout, con carga diferida y `lib/capabilities.ts`
- [ ] Edificio procedural desde `site.building`, con un grupo por piso
- [ ] Material de maqueta, luz, cielo y oclusión ambiental
- [ ] `CameraRig` con GSAP, sincronizado con la ruta
- [ ] Selector de piso: resaltado, separación del piso y panel de unidades
- [ ] Hotspots de zonas comunes (lobby, cowork, terraza)
- [ ] `PerformanceMonitor` y niveles de calidad
- [ ] Prueba en un celular real; anotar los FPS en la bitácora
- [ ] **Decisión:** ¿el edificio se ve premium? Registrarlo en `DECISIONES.md`

## Bloque 3 — Maqueta de unidad

- [ ] `planToMesh`: paredes extruidas con huecos de puertas y ventanas
- [ ] Pisos por espacio con resaltado al hacer hover o clic
- [ ] Muebles low-poly desde `<g id="furniture">`
- [ ] Transición de cámara piso → unidad → espacio
- [ ] Probar con las 3 unidades

## Bloque 4 — Detalle de espacio

- [ ] `PanoViewer` con Photo Sphere Viewer, hotspots y navegación entre espacios
- [ ] Galería con zoom progresivo
- [ ] Ficha del espacio y SpaceChips
- [ ] Fundido entre la maqueta y el 360°
- [ ] Recorrido completo; capturas; prueba con 2–3 personas

## Bloque 5 — Contenido

- [ ] Escena de Blender con los interiores de las 3 unidades
- [ ] Renders 360° por espacio
- [ ] 3–5 fotos por espacio
- [ ] Scripts `optimize-images`, `tile-pano` y `optimize-glb`
- [ ] Reemplazar los placeholders; verificar los presupuestos de peso

## Bloque 6 — Ganchos de venta

- [ ] Comparador de categorías
- [ ] "Elige tu unidad exacta" con precios y extra por vista (requiere más de una unidad por categoría; ver propuesta del bloque 1)
- [ ] WhatsApp prellenado con la unidad y las fechas
- [ ] Panel de métricas simuladas, incluida la comisión de OTA ahorrada

## Bloque 7 — Pulido y despliegue

- [ ] Entrada de marca (Rive opcional)
- [ ] `prefers-reduced-motion` y botón Saltar
- [ ] i18n con ES y EN básico
- [ ] Lighthouse y pruebas en un Android de gama media y un iPhone
- [ ] Despliegue en Vercel; assets en R2 si hace falta
- [ ] Revisar todos los criterios de `PRODUCTO.md`

## Bloque 8 — Salida a vender

- [ ] Guion de demo de 3 minutos
- [ ] Verificar que los prospectos no tengan ya un tour 360°
- [ ] Mensajes de primer contacto para Monir, Nico y KingDome
- [ ] Sección de dominios, hosting y transferencia en el documento maestro

## Aparcado (no construir sin que Jacobo lo pida)

- [ ] **Variante glamping** (terreno + domos) para KingDome. Se activa si KingDome responde. El modelo ya la soporta.
- [ ] **Splat "wow" del Penthouse.** Opciones: Marble Pro (~$35 USD/mes, con uso comercial) o Apple SHARP (gratis; la licencia de los pesos no está clara). Desde una sola imagen, el splat solo aguanta movimientos cortos de cámara.
- [ ] Supabase, panel administrativo y dominios por hotel (Fase 1)
- [ ] Analytics reales
- [ ] Paredes con `<path>` en `lib/plan.ts` (hoy solo `<rect>`); hace falta para plantas no ortogonales
