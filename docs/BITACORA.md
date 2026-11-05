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

## 2026-11-04 · Bloques 4 y 6 · 360°, ganchos de venta y revisión en Netlify

**Hecho**
- Bloque 4: 360° dentro de la misma escena (D-036), panoramas placeholder con geometría real (D-037), zoom progresivo en la galería e interruptor 360°/maqueta.
- Demo publicada en Netlify (https://nieblaalta.netlify.app o https://sunny-smakager-11bfe7.netlify.app). Hubo que declarar `@netlify/plugin-nextjs`: sin él, Netlify subía `.next` tal cual y todo daba 404.
- Revisión de Jacobo en la demo publicada (D-038): interfaz despejada, clic en la habitación entra a la unidad, cajón al elegir piso, giro de fachada de 2,6 s, vista con diafragma, fundido con movimiento reducido, señales de hover más visibles. Se corrigió el desenfoque que no se iba y el clic en ventanas desde un piso.
- Bloque 6 (D-039): reservar con fechas, "elige tu unidad exacta", `/comparar` y `/panel`.

**Mediciones**
- JS inicial máximo: 159 KB gzip (límite 180). Capturas de lista: 80/80.

**Siguiente sesión**
- Empezar por: que Jacobo revise la demo en Netlify (celular y escritorio) y la pruebe con 2–3 personas. Pendientes: bloque 5 (renders de Blender), bloque 7 (entrada de marca, i18n, Lighthouse) y bloque 8 (guion y mensajes).
- La rama de producción en Netlify es `bloque-2-exterior`; cada cambio se sube a `main` y a esa rama. Conviene cambiarla a `main` en Netlify.

---

## 2026-11-04 · Bloques 2 (v2) y 3 · Realismo, día/noche y maqueta de unidad

**Hecho**
- Nueva estrategia de Jacobo: el edificio es el protagonista. Se renderiza en dos capas: el fondo queda congelado y se desenfoca en el giro, y el edificio va en vivo (D-028).
- Realismo: HDRI reales de día y de noche y ladrillo PBR (CC0, Poly Haven), ventanas con cuarto en paralaje y cortinas de lino, balcones con matas, entrada de hotel con letrero, faroles y bañadores (D-030 a D-032).
- Día y noche: por defecto según la hora del dispositivo, con botón sol/luna para cambiarlo y `?hora=` para forzarlo (D-031, D-035).
- Habitaciones en la fachada: cada unidad ocupa ventanas concretas (`Unit.exterior`). El hover o los chips prenden sus luces y la tarjeta trae "Ver la vista" (renderizada desde la ventana) y "Ver unidad" (D-030, D-033).
- Carga escalonada: precarga en tiempo ocioso, texturas reales progresivas y la noche en poscarga (D-029).
- Bloque 3: `planToMesh` y la maqueta dentro del edificio, con fondo de estudio, espacios tocables, etiquetas y panel de espacio con galería (D-034).
- `netlify.toml` para desplegar en Netlify.

**Problemas / bloqueos**
- `SceneLayer` importaba un módulo con three.js y el JS inicial subió a 257 KB. Se separó `prefetch.ts` (sin three) y volvió a 156 KB.
- Los chips y la tarjeta quedaban bajo un `aria-hidden` (bug de accesibilidad). Ahora el `aria-hidden` va solo en el canvas.
- Las cortinas hacían moiré a distancia. Los pliegues se atenúan con `fwidth`.
- Congelar el reloj en las pruebas dejaba las animaciones de GSAP a medias. Se cambió por `?hora=`.

**Mediciones**
- JS inicial máximo: 156 KB gzip (límite 180).
- Assets del visor: unos 3 MB (HDRI de día 1,2 MB, de noche 1,6 MB solo al pedirla, texturas 231 KB).

**Siguiente sesión**
- Empezar por: que Jacobo pruebe en el celular el día/noche, el hover de habitaciones, la vista desde la ventana y la maqueta; después el bloque 4 (360° y fundido desde la maqueta).

---

## 2026-11-04 · Bloque 2 · Escena exterior (en curso)

**Hecho**
- Canvas persistente en el layout (`SceneLayer`), cargado de forma diferida. El JS inicial sigue en 155,5 KB, porque three.js solo se descarga al abrir `/explorar`. Modo escena por capas con `data-scene` y la variante `scene:` (D-020).
- Edificio procedural con fachada realista: ladrillo (o estuco o concreto, según `site.building.style`), ventanas con marco, vidrio retranqueado e interiores, primer piso vidriado, retranqueo con terraza y pérgola (D-026).
- Escena de día: sol de tarde con sombras, reflejos, calles demarcadas, andenes, árboles, vecinos con fachadas y cerros verdes.
- Cámara: vuelo de entrada que baja hasta la fachada principal y selector de fachada (principal, costados y posterior) que viaja alrededor del edificio (D-027). Piso elegido: se separa hacia la fachada y los demás quedan en rayos X. Panel de unidades como *bottom sheet* en móvil y lateral en escritorio.
- Selector de pisos sincronizado con el 3D y hotspots de lobby, cowork y terraza como HTML proyectado (D-021).
- Calidad alto, medio o bajo. En equipos justos se pregunta "¿Quieres ver el edificio en 3D?". Nunca se saca a nadie del 3D por rendimiento (D-025).
- Unidades 301 y 502 para que cada piso tenga contenido (D-019).
- `tests/shots-3d.spec.ts`: explorar, los 6 pisos y el cambio de fachada, en móvil y escritorio (16 capturas, D-024).

**Decisiones**
- D-019 a D-027. Las más importantes las pidió Jacobo: preguntar antes del 3D (D-025), realismo (D-026) y cámara a las fachadas (D-027).

**Problemas / bloqueos**
- En el equipo de Jacobo el monitor de rendimiento lo mandaba a la lista sin preguntar. Corregido con D-025.
- Un hotspot de `<Html>` de drei no llegaba al DOM. Se reemplazó por una capa HTML proyectada.
- Headless renderiza por software: las capturas 3D tardan alrededor de 1 minuto cada una y corren en serie.
- Las comillas invertidas dentro de comandos del shell se ejecutaron dos veces como comandos. A partir de ahí el código se edita solo con Edit y Write.
- No hay Blender instalado, así que el realismo es procedural.

**Mediciones**
- JS inicial máximo: 155,5 KB gzip (límite 180). El 3D se carga de forma diferida.
- Capturas: 76 de lista y 16 de 3D en verde.
- FPS en celular real: pendiente.

**Evaluación del edificio (punto de decisión del bloque 2)**
- Mi lectura: con la fachada de ladrillo ya se ve como un edificio bogotano creíble, no como una maqueta. Todavía se nota que es tiempo real (árboles simples, calles vacías por los corredores de vista, interiores planos). Para vender alcanza como "ilustrativo de alta calidad"; para fotorrealismo hace falta el realismo v2 o, con clientes reales, el splat de dron.
- La decisión final es de Jacobo después de verlo en el celular.

**Siguiente sesión**
- Empezar por: que Jacobo pruebe `/h/niebla-alta/explorar` en su celular (y con `?calidad=alto`), anote los FPS y decida si el edificio convence. Después, el realismo v2 o el bloque 3 (maqueta de unidad).

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
