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
