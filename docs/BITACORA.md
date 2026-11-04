# Bitácora

Registro de cada sesión de trabajo, con **la más reciente arriba**. Claude Code agrega una entrada al terminar cada sesión.

## Plantilla

```
## AAAA-MM-DD · Bloque N · título corto

**Hecho**
- …

**Decisiones** (si hubo; detalle en DECISIONES.md)
- …

**Problemas / bloqueos**
- …

**Mediciones** (peso, FPS, tiempos de carga, si aplica)
- …

**Siguiente sesión**
- Empezar por: …
```

---

## 2026-11-04 · Bloque 1 · Base

**Hecho**
- Proyecto Next.js 16.4 + React 19.3 + TS 6.0 estricto + Tailwind 4.3 + shadcn 4.23, con pnpm. ESLint 9, Playwright 1.64.
- `lib/types.ts` (§4 + campos opcionales, D-012), `lib/plan.ts` (parser de planos y áreas) y `lib/content.ts` (zod + integridad: niveles, categorías, ids ↔ polígonos, áreas ±15 %, archivos de medios). Se probó rompiendo un id a propósito y el build falla con un mensaje claro.
- Niebla Alta: `hotel.json` (6 pisos, 3 categorías, Estudio 201 de 32 m², Suite 402 de 54 m² con balcón y Penthouse 601 de 95 m² con terraza, 14 espacios y 3 zonas comunes), `tokens.json` y 3 planos SVG en cm con muebles.
- 46 placeholders SVG generados por `pipeline/placeholders.mjs` (genérico, lee el `hotel.json`).
- Layout `h/[hotel]` con DemoBanner, encabezado, BookingBar fija (etapa, atrás y Reservar por WhatsApp según la ruta) y PoweredBy.
- Modo lista completo: entrada, pisos y unidades, piso, unidad (plano interactivo, ficha, precio con extra por vista) y espacio (galería con lightbox, dotación, ubicación en el plano, chips y anterior/siguiente). Son 77 páginas estáticas.
- `pnpm shots` recorre todas las rutas a 390 y 1440 px. Verifica HTTP 200, Reservar visible, banner, cero errores de consola y cero imágenes rotas. Además saca una captura de la primera pantalla (`*.pantalla.png`).
- `pnpm budget` mide el JS inicial de cada página.

**Decisiones**
- D-012 a D-018: campos opcionales, TS 6/ESLint 9, acento bronce, ruta de medios de demo, Motion fuera del JS inicial, textos sin artículo y WhatsApp de Jacobo.

**Problemas / bloqueos**
- La red estaba lenta: la instalación inicial de dependencias tardó unos 13 minutos.
- Las capturas encontraron placeholders con XML inválido (atributo duplicado) que se veían rotos. Se corrigió el generador y ahora `pnpm shots` falla si hay imágenes rotas.
- Con Motion en el layout, el JS inicial era de 193 KB (límite 180). Se pasó a CSS (D-016).
- `generateStaticParams` de `[espacio]` no recibe `unidad` porque `[unidad]` no tiene layout. Lo resolví generando ambos segmentos ahí.
- Falta probar en un celular real.

**Mediciones**
- JS inicial máximo: 152,3 KB gzip (límite 180).
- Placeholders: unos 1,5 KB cada uno, 46 en total.
- Build: 77 páginas estáticas. `pnpm shots`: 52/52 en verde.

**Recalibración del plan**
- El bloque 1 cupo en 1 sesión (estimado: 2). Los bloques con más riesgo siguen siendo el 2 (edificio premium), el 3 (extrusión) y el 5 (Blender), así que el total pasa a 13–17 sesiones en vez de 14–18.

**Propuestas antes del bloque 2**
- Los pisos 3 y 5 quedan vacíos, y el extra por vista del piso 5 no tiene unidad donde aplicarse. Propuesta: sumar el Estudio 301 y la Suite 502, que reúsan los planos y medios de 201 y 402 (solo JSON, con `viewPremiumCOP` en la 502). Eso además deja listo el "elige tu unidad exacta" del bloque 6, que necesita varias unidades de la misma categoría.
- Las etiquetas del plano mini (página de espacio) pueden salirse un poco del borde en espacios junto al muro. Es un detalle a pulir en el bloque 4.

**Siguiente sesión**
- Empezar por: revisar las capturas y las propuestas con Jacobo, probar en un celular real y luego `prompts/bloque-2.md` (Canvas persistente + edificio procedural).

---

## 2026-11-04 · Bloque 0 · Planeación

**Hecho**
- Leímos el documento maestro y el traspaso de contexto.
- Definimos el alcance de la demo: un apartahotel urbano ficticio con contenido sin captura.
- Elegimos el stack y evaluamos la lista de librerías de Jacobo.
- Escribimos el plan maestro (doc vivo) y este set de documentos del repo.

**Decisiones**
- D-001 a D-011 (ver `DECISIONES.md`). El servicio se llama **Antesala**.

**Problemas / bloqueos**
- No hay equipo de captura; se alquila con el primer cliente. Por eso la demo usa contenido hecho por código y renders.

**Siguiente sesión**
- Empezar por: Bloque 0 (crear el repo) y después `prompts/bloque-1.md`.
