# Decisiones

Registro corto de las decisiones que importan, para no volver a discutirlas sin motivo. Para cambiar una se agrega una entrada nueva que la reemplace; la anterior no se borra.

Formato: **D-NNN · fecha · título** — decisión · por qué · alternativas descartadas.

---

**D-001 · 2026-11-04 · La demo no usa captura real**
- Decisión: todo el contenido de la demo sale de código, Blender y renders propios.
- Por qué: no hay equipo y se alquilará con el primer cliente. Validar barato antes de invertir.
- Descartado: fotos de stock de hoteles reales (resta credibilidad y genera problemas de derechos).

**D-002 · 2026-11-04 · Solo la variante urbana en la demo**
- Decisión: la demo es un apartahotel urbano (Niebla Alta). La glamping queda aparcada.
- Por qué: cubre a 2 de los 3 prospectos. El modelo de datos ya soporta terrenos, así que se puede sumar después en 2–3 sesiones.

**D-003 · 2026-11-04 · Visor genérico + contenido por hotel**
- Decisión: un hotel nuevo es una carpeta en `content/`, nunca código nuevo. Los medios son opcionales por espacio.
- Por qué: es la condición para que el negocio escale. El paquete comercial decide qué medios se capturan.

**D-004 · 2026-11-04 · Three.js (R3F) y no Babylon.js**
- Decisión: React Three Fiber + drei.
- Por qué: Spark, el renderizador de splats elegido, funciona sobre three.js. R3F permite construir con componentes.

**D-005 · 2026-11-04 · GSAP + Motion como únicas librerías de animación**
- Decisión: GSAP para cámara y líneas de tiempo, Motion para la UI.
- Por qué: roles separados y sin solapamiento. Unlumen UI y SmoothUI ya dependen de Motion.
- Descartado: anime.js y react-spring (redundantes). Animmaster Lib y The Prompts Factory quedan como referencia de ideas, no como dependencia.

**D-006 · 2026-11-04 · Maqueta generada desde planos SVG**
- Decisión: la vista *dollhouse* se genera extruyendo el plano SVG, sin modelar cada interior a mano.
- Por qué: es liviana, se genera sola por unidad y escala a cualquier hotel.
- Descartado: reconstrucción tipo Matterport (cara y dependiente de captura).

**D-007 · 2026-11-04 · Edificio procedural en la v1**
- Decisión: el edificio se genera por código desde footprint, pisos y altura.
- Por qué: no depende de Blender ni de captura. Se reemplaza por GLB o splat cuando exista.
- Riesgo: puede verse genérico. Se evalúa al cerrar el bloque 2 (alternativa: vista aérea ilustrada).

**D-008 · 2026-11-04 · Splats aparcados**
- Decisión: el visor de splats (Spark) queda preparado, pero sin contenido en la demo.
- Por qué: Marble cuesta ~$35 USD/mes para uso comercial. Apple SHARP es gratis pero la licencia de los pesos no está clara, y desde una sola imagen el efecto es limitado.

**D-009 · 2026-11-04 · JSON local en la demo, Supabase después**
- Decisión: sin base de datos en la Fase 0. El esquema de `lib/types.ts` será el de Supabase.
- Por qué: validar la demo antes de construir el panel.

**D-010 · 2026-11-04 · Assets pesados en R2, app en Vercel**
- Decisión: la app en Vercel y los GLB, panoramas, fotos y splats en Cloudflare R2 + CDN.
- Por qué: en Vercel se cobra el ancho de banda y R2 no cobra la salida.

**D-011 · 2026-11-04 · La marca del servicio es Antesala**
- Decisión: el servicio se llama Antesala ("explora el hotel antes de llegar").
- Por qué: la metáfora se explica sola (la sala antes de entrar), es en español y no apareció ninguna empresa grande con ese nombre en software o turismo.
- Descartados: Postigo, Zaguán, Asomo, Atisbo, Corográfica, Proemio y Dédalo. Se evitaron Piranesi (ya es software de arquitectura), Codazzi (se confunde con el IGAC) y otros nombres muy usados.
- Pendiente: verificar la marca en la SIC, los dominios y el usuario en Instagram antes de invertir en identidad.

**D-012 · 2026-11-04 · Campos opcionales en el modelo para el modo lista**
- Decisión: se suman `Hotel.neighborhood`, `Hotel.intro`, `Unit.view`, `Space.description`, `Poi.levelId` y `Poi.description`, todos opcionales.
- Por qué: el modo lista necesita textos propios del hotel (presentación, qué se ve, descripción del espacio, en qué piso está cada zona común), y la regla 1 prohíbe ponerlos en componentes. Al ser opcionales no rompen el esquema de Supabase.

**D-013 · 2026-11-04 · TypeScript 6.0 y ESLint 9, no las últimas**
- Decisión: TypeScript 6.0.3 y ESLint 9.39.5 (las últimas son TS 7.0.2 y ESLint 10.14).
- Por qué: typescript-eslint 8.72 exige TS < 6.1, y eslint-plugin-react, jsx-a11y e import (dentro de eslint-config-next 16.4.5) solo declaran hasta ESLint 9. Se reevalúa cuando lo soporten.
- También: shadcn 4.23 instala `cn` (paquete oficial de shadcn) en lugar de clsx + tailwind-merge; se quitaron esos dos.

**D-014 · 2026-11-04 · Acento de Niebla Alta: bronce envejecido**
- Decisión: `accent` = `#7D5F3B` (5,2:1 sobre hueso; 5,9:1 con texto blanco encima) y `accentOnDark` = `#B89A6A` (6,5:1 sobre carbón) para la escena 3D.
- Por qué: Jacobo pidió algo más elegante que el verde eucalipto propuesto. El bronce sobre hueso y carbón se lee como hotel boutique clásico y pasa AA.

**D-015 · 2026-11-04 · Medios de la demo servidos desde content/ por una ruta estática**
- Decisión: `app/demo-assets/[hotel]/[...path]` sirve `media/` y `plans/` de cada hotel y se prerenderiza en el build. Con `NEXT_PUBLIC_ASSETS_BASE_URL` (R2) deja de usarse.
- Por qué: `content/` sigue siendo la única fuente de verdad, sin copiar archivos a `public/`.

**D-016 · 2026-11-04 · Motion fuera del JS inicial en el bloque 1**
- Decisión: la UI del bloque 1 (cambio de etiqueta de la barra, galería) usa transiciones CSS (tw-animate-css). Motion entra con `LazyMotion` cuando haya *bottom sheets*, gestos o *layout animations*.
- Por qué: con Motion en el layout el JS inicial era de 193 KB gzip (límite 180). Sin él baja a 152 KB. No es otra librería de animación: son transiciones CSS, apagadas con `prefers-reduced-motion`.

**D-017 · 2026-11-04 · Textos sin artículo delante del nombre de la unidad**
- Decisión: "Reservar esta unidad", "me interesa reservar la unidad Penthouse 601", "Ver Suite 402".
- Por qué: "la Penthouse" o "la Estudio" suenan mal y adivinar el género desde el nombre es frágil. Así el texto sirve para cualquier hotel.

**D-018 · 2026-11-04 · WhatsApp de la demo: el número de Jacobo**
- Decisión: `contact.whatsapp` = `573204871882`.
- Por qué: un número inventado podría ser de una persona real. Los mensajes de prueba de la demo le llegan a Jacobo.
