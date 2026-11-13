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

**D-019 · 2026-11-04 · Unidades 301 y 502 que reúsan planos y medios**
- Decisión: el Estudio 301 (piso 3) y la Suite 502 (piso 5, con `viewPremiumCOP` de $60.000) reúsan el plano y las imágenes de la 201 y la 402. Solo es JSON.
- Por qué: los pisos 3 y 5 quedaban vacíos y el extra por vista del piso 5 no tenía unidad. En un apartahotel real las unidades apiladas comparten planta. También deja listo el "elige tu unidad exacta" del bloque 6.

**D-020 · 2026-11-04 · La escena se activa por capas con `data-scene`**
- Decisión: `SceneLayer` (en el layout) monta el Canvas la primera vez que una etapa lo necesita y no lo desmonta. Cuando la escena está lista marca `<html data-scene="on">`, y las páginas usan la variante `scene:` de Tailwind para ocultar la lista y mostrar los paneles sobre el 3D.
- Por qué: el HTML del modo lista sigue siendo lo primero que llega (ARQUITECTURA §6). Las mismas rutas sirven para 3D y para lista, sin duplicar páginas.

**D-021 · 2026-11-04 · Hotspots como capa HTML proyectada, no `<Html>` de drei**
- Decisión: las etiquetas de las zonas comunes son botones normales en una capa encima del canvas. `PoiProjector` (dentro del Canvas) proyecta su posición en cada frame y escribe el `transform` directo en el DOM.
- Por qué: con `<Html>` de drei uno de los tres hotspots no llegaba al DOM (cada `<Html>` crea su propia raíz de React). Así quedan en el mismo árbol, son accesibles por teclado y no hay textos dentro del canvas.

**D-022 · 2026-11-04 · Render por software = modo lista; `?calidad=` para forzar**
- Decisión: `lib/capabilities.ts` manda a lista los equipos sin WebGL2, con render por software (SwiftShader, llvmpipe) o con muy poca memoria. Los táctiles arrancan en "medio" y `PerformanceMonitor` sube o baja la calidad. `?calidad=alto|medio|lista` la fuerza y desactiva el ajuste automático.
- Por qué: con render por software el 3D corre a pocos FPS. Forzar la calidad sirve para las capturas y para presentar la demo en un equipo concreto.

**D-023 · 2026-11-04 · Regla `react-hooks/immutability` apagada solo en `components/scene/`**
- Decisión: se desactiva esa regla del React Compiler para los componentes 3D.
- Por qué: en R3F mutar materiales, cámara y controles es la forma recomendada de animar sin re-render. El proyecto no usa el React Compiler. El resto del código conserva la regla.

**D-024 · 2026-11-04 · Capturas 3D en serie y sin animación**
- Decisión: `tests/shots-3d.spec.ts` corre en serie, con `reducedMotion: 'reduce'` y `?calidad=medio`.
- Por qué: headless renderiza WebGL por software. En paralelo satura la CPU, y GSAP frena las animaciones cuando cada frame tarda mucho. Sin animación, la captura muestra la pose final, que es lo que se revisa.

**D-025 · 2026-11-04 · Preguntar antes del 3D; nunca sacar a nadie del 3D** (reemplaza parte de D-022)
- Decisión: si el equipo parece justo (render por software o muy poca memoria), la vista exterior pregunta "¿Quieres ver el edificio en 3D?" con las opciones Ver en 3D y Ver la lista. Si el rendimiento cae durante el recorrido, la calidad baja de alto a medio a bajo, pero nunca a lista. Solo un navegador sin WebGL2 va directo a la lista. Desde la lista hay un botón para volver al 3D.
- Por qué: pedido de Jacobo. En su equipo el monitor de rendimiento lo mandaba a la lista sin preguntar. Aunque no vaya 100 % fluido, la persona debe poder verlo.

**D-026 · 2026-11-04 · Escena de día y fachada realista** (reemplaza "la escena 3D va en oscuro" de DISENO.md y la estética de maqueta blanca)
- Decisión: luz de tarde con sombras, cielo y reflejos. Fachada con revestimiento (`site.building.style.cladding`: ladrillo, estuco o concreto), ventanas con marco de aluminio, vidrio retranqueado e interiores tenues detrás, primer piso vidriado, retranqueo con terraza y pérgola. Entorno con andenes, calles demarcadas, árboles, vecinos con fachadas y cerros. Todo procedural, con texturas generadas en canvas y sin descargas.
- Por qué: Jacobo pidió que la demo demuestre realismo ("que la fachada se vea como se ve en la realidad"). La maqueta blanca sobre fondo oscuro se leía como software de arquitectura.
- Pendiente: es una primera iteración. El siguiente salto de realismo necesita HDRI y texturas PBR (CC0 de Poly Haven) o un modelo de Blender con luz horneada (no hay Blender instalado). Con clientes reales, el realismo total lo da el splat de dron (D-008).

**D-027 · 2026-11-04 · La cámara llega a las fachadas**
- Decisión: la vista exterior abre con un vuelo desde arriba que baja en arco hasta la fachada principal, casi de frente y a altura de calle elevada (perspectiva de foto de arquitectura). Un selector (Fachada principal, Costado derecho, Fachada posterior, Costado izquierdo) lleva la cámara alrededor del edificio hasta cada una. Las fachadas salen de los bordes del `footprint`, así que sirven para cualquier forma.
- Por qué: pedido de Jacobo. La vista aérea en 3/4 no mostraba la fachada como la ve el huésped.

**D-028 · 2026-11-04 · Render en dos capas: fondo congelado y edificio en vivo**
- Decisión: el entorno (calles, vecinos, árboles, cerros, cielo) vive en una escena aparte (`Backdrop`) y no se renderiza cada frame. Mientras la cámara se mueve, o durante el cambio día/noche, se renderiza a 20 % de resolución y se muestra desenfocado. Al detenerse se renderiza una vez en alta y se funde en 0,45 s. Cada frame solo se dibuja ese fondo y el edificio encima. La sombra del edificio cae sobre el fondo con un "shadow catcher". Se quitó el postproceso: el resplandor lo hacen halos aditivos.
- Por qué: propuesta de Jacobo. El edificio es el plano principal y el fondo no tiene por qué costar cada frame. El desenfoque del giro esconde el cambio de perspectiva y da sensación de cámara real.
- Detalle técnico: three no aplica tone mapping al renderizar a textura, así que el fondo aplica el mismo ACES a mano.

**D-029 · 2026-11-04 · Carga escalonada: precarga, carga progresiva y poscarga**
- Decisión: (1) desde cualquier etapa, en tiempo ocioso, se descarga el JS del 3D y se calienta la caché con lo del día (HDRI y texturas), salvo con "ahorro de datos" o si hay que preguntar antes del 3D; (2) la escena arranca con texturas procedurales y cambia a las reales cuando llegan; (3) lo de noche se pide 5 s después de que el día está listo, o al pasar a noche; (4) la vista desde una ventana se renderiza solo cuando se pide.
- Por qué: "optimizado no significa sacrificar calidad", sino que lo pesado no bloquee lo primero que se ve.

**D-030 · 2026-11-04 · Ventanas con cuarto en paralaje y cortinas; luces por unidad**
- Decisión: cada ventana es un quad con "interior mapping" (pared del fondo, laterales, piso de madera y techo con lámpara), con cortinas de lino con pliegues y visillos. Cada unidad ocupa ventanas concretas (`Unit.exterior`); al pasar el mouse (o el foco del teclado por los chips de la fachada) sus luces se encienden y la cortina se ilumina. De noche se encienden cuartos al azar y el lobby queda siempre encendido.
- Por qué: pedido de Jacobo (hover que prende las luces, realismo en cortinas y luz). El paralaje hace que la ventana no se vea como un sticker al mover la cámara.

**D-031 · 2026-11-04 · Día y noche reales, por defecto según la hora del dispositivo**
- Decisión: iluminación HDRI CC0 de Poly Haven (`kloofendal_43d_clear_puresky` de día, `moonless_golf` de noche) y texturas CC0 (`red_brick_03`, `rough_linen`) a 512 px en `public/visor/`. De noche hay cielo con estrellas, faroles con charcos de luz, ventanas de vecinos encendidas, letrero y apliques del hotel encendidos y bañadores en la fachada. La escena arranca de noche entre 6 p. m. y 6 a. m. según la hora del dispositivo, y se puede cambiar con el botón sol/luna.
- Licencia: CC0 (dominio público), sin atribución obligatoria.
- Por qué: pedido de Jacobo ("que lea la hora del dispositivo, pero que permita cambiarlo").

**D-032 · 2026-11-04 · Que el edificio se lea como hotel**
- Decisión: marquesina con el nombre del hotel (sale de `tokens.json`), puerta de vidrio, apliques, materas, balcones con matas en las unidades con balcón y lobby siempre iluminado.
- Por qué: Jacobo: "no parece un hotel, parece un edificio X".

**D-033 · 2026-11-04 · Vista desde la ventana**
- Decisión: al elegir una unidad en la fachada, "Ver la vista" renderiza el entorno desde su ventana (a 1,65 m de altura y 0,6 m afuera del vidrio) y lo muestra como imagen ilustrativa.
- Por qué: es el gancho del extra por vista. El penthouse ve por encima de los vecinos y el estudio no.
- Detalle: los vecinos y árboles del corredor de vista de cada fachada viven en una capa (`VIEW_ONLY_LAYER`) que la cámara de la fachada no ve pero la de la ventana sí. Así la fachada se ve limpia y la vista desde adentro no muestra un lote vacío.

**D-034 · 2026-11-04 · La maqueta de la unidad aparece dentro del edificio**
- Decisión: la maqueta (`planToMesh`: paredes de 2,6 m con vanos reales, pisos por espacio, vidrio y muebles) se ubica a escala real sobre la losa de su piso. Al entrar a la unidad la cámara baja hacia ella, el edificio se desvanece (tras el fundido se oculta el grupo entero para que no proyecte sombra) y el fondo pasa a un estudio neutro, donde el entorno deja de renderizarse. Los espacios se tocan en la maqueta o en sus etiquetas. El detalle del espacio acerca la cámara y muestra un panel con la galería.
- Por qué: "piso → unidad → espacio" se lee como un acercamiento continuo y no como un cambio de pantalla. Solo se monta la maqueta de la unidad actual.

**D-035 · 2026-11-04 · `?hora=` para fijar la hora del día**
- Decisión: `?hora=0..23` fuerza la hora de la escena (si no, la del dispositivo). Las capturas usan `?hora=15` y `?hora=21`.
- Por qué: congelar el reloj del navegador en las pruebas deja las animaciones de GSAP a medias (mide el tiempo con `Date.now`). También sirve para mostrar la demo de noche a cualquier hora.

**D-036 · 2026-11-04 · 360° propio en la misma escena, no Photo Sphere Viewer** (reemplaza la fila 360° de ARQUITECTURA §2)
- Decisión: el panorama es una esfera con la imagen equirectangular alrededor del punto de vista del espacio, dentro del mismo Canvas. Al entrar a un espacio la cámara se para a 1,5 m, mira hacia la abertura vidriada más ancha (`Media.yaw`), se abre a 75° de campo y la esfera se funde sobre la maqueta. Los controles pasan a "mirar alrededor" y los hotspots a espacios vecinos son enlaces HTML proyectados. Hay un interruptor 360°/Maqueta.
- Por qué: Photo Sphere Viewer 5.15 exige three `^0.185.1` (solo 0.185.x) y usamos 0.187, lo que significaría dos copias de three o un peer roto. Además, en la misma escena el fundido "maqueta → 360°" de DISENO.md es literal y no hay un segundo contexto WebGL.
- Pendiente: teselas para zoom en 360° de alta resolución cuando haya capturas reales (bloque 5 / Fase 1).

**D-037 · 2026-11-04 · Panoramas placeholder con geometría real**
- Decisión: `pipeline/panos.mjs` genera un equirectangular SVG por espacio a partir de su polígono y de los vanos del plano. Desde el punto de vista, piso, techo, paredes, ventanas, puertas y puertas corredizas vidriadas caen donde caerían en una foto 360°. También genera los hotspots (yaw hacia el centro de cada espacio vecino) y la mirada inicial. Las unidades con el mismo plano comparten panorama.
- Por qué: sin renders de Blender todavía (bloque 5) el visor 360° queda probado con geometría creíble; en el bloque 5 solo se cambian las imágenes.

**D-038 · 2026-11-04 · Interfaz despejada, clic directo en la habitación y animaciones de cajón y diafragma**
- Decisión: sobre la escena solo quedan el nombre del hotel, el selector de pisos (solo números), el selector de fachada compacto con día/noche y Reservar. Se quitaron la tarjeta "Elige un piso" y el listado de unidades: la unidad se elige tocando su ventana, que entra directo a la maqueta con la transición de cámara. Los hotspots son puntos (el nombre aparece al pasar). El piso elegido sale como un cajón (5 m, desaceleración) y vuelve a entrar antes de que salga el siguiente. El giro entre fachadas dura 2,6 s con curva seno. "Ver la vista desde la ventana" está en el panel de la unidad y se abre y cierra con un diafragma de cámara. Con movimiento reducido, los vuelos de cámara se reemplazan por un fundido de 0,5 s en vez de un salto seco.
- Por qué: revisión de Jacobo en la demo publicada ("pantalla excesivamente saturada", "no veo el hotel en su esplendor", "debería poder entrar tocando la habitación").
- También se corrigió: el fondo se quedaba desenfocado porque la amortiguación de los controles movía la cámara fracciones mínimas (ahora se compara con tolerancia), y en un piso elegido tocar una ventana no hacía nada.

**D-039 · 2026-11-04 · Ganchos de venta del bloque 6**
- Decisión: (1) Reservar abre una hoja con llegada, salida y huéspedes; calcula noches × tarifa (marcada como simulada) y arma el WhatsApp con todo. (2) "Elige tu unidad exacta": las unidades de la misma categoría con un alzado esquemático, la diferencia de precio y la vista. (3) `/comparar`: una columna por categoría con plano, datos comparables y la mejor en cada fila destacada. (4) `/panel`: métricas simuladas y deterministas para el gerente, con la comisión de OTA ahorrada como cifra principal; sin barra de reserva.
- Por qué: PRODUCTO.md, el argumento principal es la reserva directa y el ahorro de comisión, y el extra por vista como ingreso.

**D-040 · 2026-11-04 · Renders del bloque 5 aplazados hasta el primer cliente**
- Decisión: no se hacen renders de Blender para la demo. Las fotos siguen como ilustraciones de línea y los 360° como placeholders con geometría real (D-037). Con el primer cliente se capturan fotos y 360° reales (cámara alquilada, CONTENIDO.md §8) y solo se reemplazan los archivos de `media/`; el visor no cambia.
- Por qué: Blender no corre en el equipo de Jacobo. El edificio, la fachada y la maqueta ya muestran el valor; las fotos reales del cliente son las que más convencen.
- Pendiente: el pipeline de compresión (`optimize-images`, `tile-pano`) se hace cuando lleguen las primeras capturas reales.

**D-041 · 2026-11-04 · Planta del piso dentro del cajón**
- Decisión: cada piso tiene su plano SVG (`Level.plan`: pasillo, núcleo, unidades; `data-label` para lo que no es unidad ni zona común). Al elegir el piso, el cajón sale y luego la fachada de ese piso se retira (queda la losa) y aparece la planta en corte (muros de 1,1 m). Las unidades de la demo van en madera, con su nombre y precio, y se pueden tocar para entrar; las demás van en gris. En modo lista, la página del piso muestra la misma planta en 2D. La validación exige que cada unidad del piso tenga su polígono.
- Por qué: pedido de Jacobo ("las paredes de los pasillos... una visión del piso"). Es el "elige tu unidad exacta" sobre el mapa del piso (PRODUCTO.md, paso 7).

**D-042 · 2026-11-04 · Miradores en 360° en vivo (terraza)**
- Decisión: las zonas comunes pueden tener `viewpoints` (posición y mirada inicial). Desde la ficha de la terraza, "Mirar desde aquí (360°)" lleva la cámara al punto, a la altura de los ojos, con gran angular y controles de mirar alrededor. Se ve en vivo, de día o de noche, y los vecinos del corredor de vista aparecen. Las flechas pasan entre los miradores (cerros, ciudad, occidente). Los demás controles se ocultan (variante `viewpoint:`).
- Por qué: pedido de Jacobo ("la terraza con vista 360° desde puntos estratégicos"). No requiere renders: usa la misma escena. Con el cliente real se suman sus 360° capturados.

**D-043 · 2026-11-05 · Entrada de marca solo con CSS, una vez por sesión**
- Decisión: al llegar a la portada del hotel, el nombre sube letra por letra sobre una niebla en movimiento, aparece el lema y la cortina se abre (2,9 s). Solo CSS, sin Rive ni GSAP en el JS inicial. Se ve una vez por sesión (`sessionStorage`); un script en línea la oculta antes de pintar si ya se vio, así que no parpadea. Botón "Saltar" siempre visible y, con movimiento reducido, un fundido corto. Vive en el layout, encima de la barra de reserva y debajo del banner de hotel ficticio, y solo aparece si se entra por la portada.
- Por qué: el JS inicial está en 159 KB de 180 y Rive sumaría su runtime. El efecto es tipográfico y CSS alcanza.

**D-044 · 2026-11-05 · Muebles armados por piezas, acabados de piso y lobby propio**
- Decisión: cada `data-item` del plano se arma con varias piezas low-poly agrupadas por material (`components/plan/furniture.ts`): la cama con base, colchón, cabecero, almohadas y pie de cama; el sofá con espaldar, brazos y cojines; las mesas y sillas con patas; además materas, lámparas, tapetes, escalera y ascensores. `data-back="n|s|e|w"` indica el lado del respaldo; si falta, se deduce de la pared más cercana. Los polígonos de espacios aceptan `data-finish` (madera, piedra, baldosa, alfombra, concreto, deck). El piso 1 deja de repetir la retícula de los pisos tipo: es un lobby abierto con recepción, sala, café con barra, cowork con cabinas, baños y equipaje. Todos los pisos y las tres unidades de la demo quedan amoblados.
- Por qué: pedido de Jacobo ("más diseño y un pequeño amoblado"; "la portería se ve igual a los demás pisos"). Los muebles son contenido (SVG por hotel), no código. Se dibujan en unas 11 llamadas por planta y la planta cerrada no se dibuja.

**D-045 · 2026-11-05 · Inglés aparcado**
- Decisión: no se hace i18n en la Fase 0. La interfaz sigue solo en español.
- Por qué: todos los prospectos son colombianos, y traducir solo la interfaz dejaría el contenido del hotel en español. Se retoma cuando un cliente tenga huéspedes extranjeros y entregue su contenido en inglés.

**D-046 · 2026-11-05 · En la demo, el 360° se recorre por dentro de la maqueta amoblada**
- Decisión: si `hotel.isDemo`, el 360° de cada espacio no muestra la imagen de muestra: la cámara se para a 1,5 m dentro de la maqueta amoblada, con cielo raso (solo visible desde abajo) y la ciudad por las ventanas. Un hotel real muestra sus fotos 360° capturadas.
- Por qué: pedido de Jacobo ("que en el tour 3D también se vea el amueblado, para la demo"). Los 360° de muestra eran planos y no vendían el espacio. Es ilustrativo, como todo el contenido de la demo.

**D-047 · 2026-11-05 · Unidades tipo (`sameAs`) y todas las habitaciones tocables**
- Decisión: una unidad puede declararse `{"sameAs": "201", "id": "202", ...}`. Hereda plano, espacios y fotos, y solo cambia número, piso, ventanas, vista, precio y destacado (`lib/content.ts` la expande y valida). Niebla Alta pasa de 5 a 21 unidades: todas las de la planta se tocan, tienen página, luz en su ventana y precio por piso. "Elige tu unidad exacta" muestra la misma columna del edificio (mismas ventanas en otros pisos) y cuenta aparte las del mismo tipo en otras fachadas.
- Por qué: pedido de Jacobo ("debería tener TODAS LAS HABITACIONES del hotel, y uno debe darle clic"). Un hotel real tiene muchas habitaciones iguales: se describe una y se listan las demás.

**D-048 · 2026-11-05 · Guía del recorrido y menos texto sobre la escena**
- Decisión: la primera vez en el edificio aparece una tarjeta con tres pasos y "Empezar". Después hay una pista corta por pantalla ("Toca una habitación para entrar", "Arrastra para mirar alrededor"), una vez por sesión, que se va al interactuar. Para limpiar la escena: el panel del piso ya no lista unidades (solo el resumen, "5 habitaciones · desde…"); las etiquetas de las habitaciones en la planta aparecen solo bajo el puntero o con el foco del teclado; en móvil, el panel de la unidad empieza recogido (nombre y precio) y se quitaron los botones de espacios que repetían las etiquetas de la maqueta.
- Por qué: retroalimentación de las primeras personas que lo probaron: "la gente no sabe usarlo" y "en celular se ve saturado".

**D-049 · 2026-11-05 · Luz de la planta, maqueta abierta, límites de cámara y fondo oscuro de la unidad**
- Decisión:
  - La planta del piso abierto tiene muros oscuros en corte (como el relleno de un plano) y, de noche, luz interior cálida. Antes dependía del sol y la hora: blanca sobre blanco de día, casi negra de noche.
  - Al ver un espacio en modo maqueta, muros y muebles bajan a 1,15 m. El corte se hace en el GPU y también recorta las sombras. La cámara mira más desde arriba (38°), así que los muros ya no tapan espacios pequeños como la cocina.
  - El acercamiento y la inclinación quedan limitados alrededor del encuadre de cada vista (65 % a 130 % de la distancia).
  - El fondo de estudio de la unidad pasa de hueso a carbón cálido, para que los muros claros se lean.
- Por qué: los primeros usuarios vieron la planta "a veces blanca, a veces negra", la cocina tapada por los muros, un zoom que dejaba ver el vacío del fondo y muros blancos sobre fondo blanco.

**D-050 · 2026-11-05 · Entrar a una habitación, fondo sin negro, crepúsculo y acabados de la unidad**
- Decisión:
  - Al tocar una habitación (ventana o planta), su luz se enciende y se queda 0,75 s con el nombre antes de la transición de cámara. La página se precarga en ese momento y tocar el vacío cancela.
  - El fondo nítido usa MSAA solo si el GPU tiene `EXT_color_buffer_float`, y se vuelve a pintar al cambiar de tamaño. En varios celulares salía negro al quitarse el desenfoque.
  - El HDRI cambia de día a noche a mitad del crepúsculo, con una caída suave de su intensidad (antes saltaba al tocar el botón).
  - Unidad con pañete procedural, zócalo, corte oscuro, piso de tablas (baldosa en baño y cocina) y la puerta de entrada cerrada (por la puerta ya no se ve la calle).
  - En el recorrido por dentro, el cielo raso hace sombra y bajan el relleno y el entorno: la luz entra por las ventanas.
- Por qué: retroalimentación de Jacobo después de probarlo en el celular.

**D-051 · 2026-11-07 · Estabilidad del 3D en celular y precarga por intención**
- Decisión:
  - Sombras y detalle se deciden una vez al montar la escena. En marcha solo baja la resolución (DPR), nunca vuelve a subir y nunca durante una transición. Antes el monitor de rendimiento prendía y apagaba sombras y resolución en plena animación: tirones, colores dañados y el fondo vaciado (negro).
  - La fachada del piso abierto se oculta del todo cuando termina de retirarse. Las ventanas, con opacidad 0, seguían escribiendo profundidad y tapaban a ratos la planta ("el piso se rompe").
  - Fondo: se comprueba que el GPU pueda dibujar en half float (si no, 8 bits), los píxeles NaN/Inf se limpian antes del desenfoque (salían manchas negras) y el fondo se vuelve a pintar si el contexto WebGL se reinicia.
  - Los shaders de la planta y de la maqueta se compilan con la escena quieta, no en plena animación. Las plantas amobladas se arman en tiempo libre después del arranque.
  - En táctil, el JS del 3D y el HDRI se precargan con el primer toque o desplazamiento, no en tiempo ocioso (evaluar three.js bloqueaba ~1 s el hilo de un celular lento). En escritorio sigue en ocio.
- Por qué: Jacobo vio en su celular el piso trabado, partes de la planta que desaparecían, colores dañados y el desenfoque que se volvía negro.

**D-052 · 2026-11-07 · Telón de carga, cualquier habitación, transiciones sin corte, panel plegable y barandas**
- Decisión:
  - La entrada de marca deja la portada y pasa a ser el telón de carga del 3D (edificio, piso y unidad). El nombre sube sobre la niebla mientras carga y la cortina se abre cuando la escena está lista: ya no se ve la lista de respaldo "a medio cargar". Se anima la primera vez de la sesión; después muestra el nombre quieto. Como máximo dura 20 s. No tapa si no hay 3D o mientras se pregunta si se quiere.
  - Con un piso abierto, solo su planta recibe toques. La fachada oculta y los pisos de encima, casi transparentes, se quedaban con el clic y la habitación no abría. Al tocarla, su piso pulsa con un brillo cálido mientras se sostiene antes de entrar.
  - Transiciones: el fondo de estudio entra al empezar el vuelo, no al final (antes se veía la ciudad pixelada y luego otro fundido). El desenfoque usa más resolución. Con movimiento reducido, el lente y todo lo demás cambian en el negro del fundido, que se sostiene 0,35 s.
  - El panel del espacio se pliega también en escritorio y empieza recogido, como un panel desplegable.
  - Balcones y terrazas de la maqueta llevan baranda (sardinel, vidrio y pasamanos) en los bordes que no dan contra un muro.
- Por qué: retroalimentación de Jacobo probando la demo publicada (incluido un PC con las animaciones del sistema apagadas).

**D-053 · 2026-11-08 · Página de Antesala, sitio completo del hotel y fotos desde la escena 3D**
- Decisión:
  - La raíz (`/`) es la página comercial de Antesala para gerentes: el problema de la comisión, cómo funciona con capturas reales del recorrido en celular, lo que gana el hotel, "¿tu hotel no tiene página?", cómo empezamos el piloto, preguntas y WhatsApp. No publica precios del piloto. Los datos de contacto de Antesala viven en `lib/antesala.ts`.
  - La portada del hotel (`/h/<slug>`) es un sitio web completo para quien no tiene página propia: portada con el edificio, datos clave, invitación al recorrido, habitaciones por categoría (precio desde, área, capacidad), edificio y servicios, ubicación, estadía y políticas, preguntas y cierre de reserva. Todo sale del contenido; el nuevo `hotel.info` (opcional) trae dirección, alrededores, horarios, servicios, políticas y preguntas. Cada sección aparece solo si hay con qué llenarla.
  - Fotos ilustrativas tomadas de la propia escena 3D (`pnpm renders`): fachada de día y de noche, un piso abierto y cada espacio de las unidades completas visto por dentro. Se registran en `hotel.json` como `fidelity: "ilustrativa"` y pasan a ser la primera foto de cada galería. `pnpm producto` saca las capturas del recorrido para la página de Antesala.
- Por qué: pedido de Jacobo ("que se vea profesional, también para los que no tienen página web"). Las galerías con imágenes de muestra eran lo único que seguía pareciendo placeholder (criterio "se ve premium"). Usar la escena evita depender de Blender (D-040) y es honesto: es el mismo hotel ilustrativo.

**D-054 · 2026-11-08 · Habitaciones ocupadas (simulado en la demo)**
- Decisión: una unidad puede marcarse `"occupied": true` en `hotel.json` (también las copias de una unidad tipo). De noche, las ventanas de las habitaciones del hotel están encendidas solo si están ocupadas; las ventanas que no son habitaciones siguen encendidas al azar. Una ocupada se puede recorrer completa, pero:
  - en la planta tiene un color apagado y su etiqueta dice "Ocupada";
  - en el panel y en su página aparece "Ocupada en estas fechas" con la alternativa libre más parecida (mismo tipo, misma columna de ventanas, piso más cercano);
  - la barra cambia "Reservar" por "Ver la … libre".
  "Elige tu unidad exacta" la marca como ocupada. En la demo hay 8 de 21 ocupadas.
- Por qué: pedido de Jacobo ("¿por qué están prendidas algunas? deberían ser las vendidas o alquiladas"). Así la luz de noche dice algo y la demo muestra cómo se maneja la disponibilidad, sin quitarle al huésped la posibilidad de mirar.

**D-055 · 2026-11-08 · Rediseño de la página de Antesala**
- Decisión:
  - Hero oscuro a pantalla completa con el edificio de noche y un celular que pasa solo por los cuatro pasos (CSS; quieto con movimiento reducido). Navegación flotante en cápsula de vidrio, que se lee sobre fondo claro y oscuro.
  - Secciones numeradas (01 a 07) que alternan claro y oscuro: el problema con "hoy en la plataforma / con Antesala", cómo funciona, una galería tipo bento con las fotos del hotel, comparador día/noche, lo que gana el hotel, calculadora de ahorro de comisión, sin página web, cómo empezamos, preguntas y cierre.
  - Aparición suave al hacer scroll con `animation-timeline: view()` (solo CSS; sin efecto donde no se soporta o con movimiento reducido).
  - La calculadora es una estimación con los datos del gerente y se dice así en pantalla.
- Por qué: Jacobo quería que la página se viera mejor en general. Lo que más pesa es mostrar el producto real (fotos y capturas) con más presencia, y el argumento económico (la calculadora).

**D-056 · 2026-11-08 · Edificio real desde el catastro de Bogotá**
- Decisión: `pnpm catastro <slug> --via "CL 158" --placa "93A 37"` encuentra la placa, el lote y la construcción en los servicios REST del catastro (UAECD, datos abiertos) y escribe la huella exacta (en metros, simplificada y ortogonalizada) y el número de pisos en `hotel.json`. Las construcciones vecinas, con sus pisos, y las calles de OpenStreetMap van a `media/context.json`, que la escena pide aparte y usa en lugar de los vecinos inventados.
- Por qué: Google 3D Tiles prohíbe extraer o medir la geometría; el catastro es oficial, exacto, gratis y abierto.

**D-057 · 2026-11-08 · Oferta por hotel: noche, mes o venta**
- Decisión: `hotel.offer` cambia el precio ("/ noche", "/ mes" o nada), el botón ("Reservar" o "Agendar visita" por WhatsApp con la unidad escrita) y cómo se llama una unidad no disponible (ocupada, arrendado, vendido).
- Por qué: el segundo demo (Akuare) es un edificio de apartamentos en venta, y abre el mercado de constructoras.

**D-058 · 2026-11-08 · Demo Akuare y peso de la escena**
- Decisión: segundo demo con el edificio real de la Calle 158 # 93A-37 (Suba Salitre): torre de 35 × 20 m y 5 pisos del catastro, 37 apartamentos ilustrativos (esquineros de 3 alcobas y medianeros de 2) sobre esa huella, modo venta, banner "Demostración no oficial". Para que una página no cargue todos los planos, cada plano de unidad viaja una vez y las plantas de piso se piden aparte desde la escena (página de 359 a 88 KB).
- Por qué: pedido de Jacobo; un edificio que conoce, con datos públicos. Los interiores son inventados porque no hay planos públicos.

**D-059 · 2026-11-08 · Primer piso residencial y cubierta plana**
- Decisión: `style.ground: "residencial"` dibuja hacia la calle garajes con persiana, un local con vitrina y una puerta pequeña con placa, sin marquesina de hotel; la planta del piso 1 de Akuare se alinea con eso (parqueaderos, local, portería; salón social atrás).
- Por qué: la fachada real de Akuare (Street View, mostrada por Jacobo) no tiene lobby de hotel.
- Ampliación (2026-11-12): `style.roof: "plana"` quita la pérgola de madera de la cubierta (por defecto `"terraza"`, con pérgola). Akuare la usa porque el edificio real no tiene pérgola.

**D-060 · 2026-11-10 · Modo renders y mercado de constructoras (propuesta)**
- Decisión propuesta: agregar al visor un modo basado en imágenes (portada con render y puntos, video de transición, planta cenital como imagen con unidades disponibles y vendidas, 360°) que conviva con el 3D en vivo. Ofrecerlo primero a constructoras con proyectos sobre planos, que ya tienen renders.
- Por qué: el referente que vio Jacobo (Urbania, cliente PROACO) se ve fotográfico porque usa renders de estudio, no 3D en tiempo real. El 3D por código no va a alcanzar esa calidad; el contenido sí. Las constructoras ya pagan por ese contenido. Pendiente de que Jacobo lo apruebe.

**D-061 · 2026-11-10 · Página web como servicio y empresa MamutHerd S.A.S.**
- Decisión: además del recorrido, se ofrece hacer la página web a quien no la tiene (tercer mercado). La página de Antesala lo dice como servicio ("Te hacemos tu página web"; se puede empezar solo con la página). Antesala es un producto de MamutHerd S.A.S.: aparece en el pie de la página de Antesala y en la documentación de contratos. En las páginas de los hoteles sigue solo el discreto "con tecnología de Antesala".
- Por qué: pedido de Jacobo. Muchos prospectos venden solo por plataformas; la página es una venta más pequeña y más fácil que abre la puerta al recorrido.

**D-062 · 2026-11-11 · Identidad visual de Antesala**
- Decisión: logo "ranura de luz" (dos pilares y una línea de luz) en `components/brand/AntesalaLogo.tsx` y `public/brand/`; favicon con el símbolo pequeño. Azul noche #111B33 (≈60 %), marfil #F1EEE7 (≈30 %), champán #D2B88C (≈10 %); Cinzel para el logo y los titulares en mayúsculas, Cormorant Garamond itálica para las frases y Jost para el texto; esquinas de 2 px; colores planos. Firma "Un producto de Mamut Herd" (razón social MamutHerd S.A.S.). Solo en las páginas de Antesala; las de los hoteles mantienen la marca de cada hotel. Manual y tokens en `docs/WEB-ANTESALA.md` y `docs/identidad/`.
- Por qué: identidad definida por Jacobo en otra conversación (su D-012).

**D-063 · 2026-11-11 · Web de Antesala desde el boceto, con dos modos**
- Decisión: la raíz porta el boceto (`antesala-preview`): intro de los pilares, recorrido con escenario fijo (edificio, piso, unidad, plano, espacio, reserva) con datos reales de Niebla Alta (Suite 502), "Así se entra" (cuatro clips encadenados de la calle al balcón que avanzan con el scroll), demos (Niebla Alta y Akuare), para su hotel (con "se la hacemos" y la calculadora), cómo trabajamos, precios de referencia, Mamut Herd, preguntas y cotización por WhatsApp o correo (sin backend).
  - **Modo cine:** edificio 3D (three.js cargado aparte) y video. Clips re-codificados con un cuadro clave por cuadro (720 y 1280 px) en `public/demo/video/`.
  - **Modo ligero:** sin three.js ni video. El recorrido es un alzado sobre papel con cotas y trazos que se dibujan en cada paso, y la película pasa con fotos, acercamiento lento y trazos de plano. Se elige solo (ahorro de datos, 2G/3G, poca memoria) y se cambia con el botón del menú.
  - El 3D del modo cine baja el azul: caras veladas, el edificio se lee por sus trazos champán.
- Por qué: pedido de Jacobo; el boceto es la referencia y está sujeto a cambios. Los dos modos dejan que la página funcione con poca conexión.

**D-064 · 2026-11-11 · Sombras congeladas con un piso abierto**
- Decisión: con un piso abierto, el mapa de sombras se calcula una vez cuando termina de salir el cajón y se congela; al volver al edificio se calcula en cada cuadro. Se congela en lugar de apagar la luz para no recompilar materiales en plena transición.
- Por qué: propuesta de Jacobo; las sombras no aportan con el piso abierto y cuestan en celular.

**D-065 · 2026-11-12 · Bloque 9 aprobado: portada con puntos, video de transición y planta con disponibilidad**
- Decisión: Jacobo aprueba D-060. Primera entrega:
  - La portada del hotel puede llevar puntos tocables sobre la foto (`site.cover`). Al tocar uno con video, pasa el clip a pantalla completa y entra al piso o a la unidad. Sin video con movimiento reducido, ahorro de datos o modo ligero.
  - La planta del piso pinta cada unidad según su disponibilidad (verde libre, terracota ocupada o vendida) y muestra la leyenda.
  - ~~En Niebla Alta, las fotos de Higgsfield pasan a ser la portada…~~ Corregido el mismo día: las fotos y los videos de Higgsfield son de la página de Antesala, no de Niebla Alta (Jacobo). Niebla Alta vuelve a sus renders y al ladrillo; sus puntos de portada van sobre su propio render y sin video. La tarjeta de Niebla Alta en la página de Antesala muestra su planta del piso 5 con libres y ocupadas.
  - Quedan pendientes los assets pesados en R2 y la demo de constructora con contenido generado.
- Por qué: la demo mostraba la foto bonita en la página de Antesala pero, al entrar, la captura del 3D. El contenido fotográfico es lo que hace que se vea vendible (D-060).

**D-066 · 2026-11-12 · Espacio enfocado en la maqueta y controles en las esquinas**
- Decisión:
  - Al elegir un espacio en la maqueta, lo que queda fuera de su rectángulo se corta cada vez más bajo hasta hundirse en el piso, y solo queda ese espacio con su etiqueta. La cámara lo encuadra según su tamaño. Se hace en el shader (recorte por posición), porque muros y muebles son mallas unidas.
  - En escritorio, la barra de reserva va en la esquina inferior derecha y el selector de fachada en la izquierda. En celular siguen abajo y centrados. La barra sigue siempre visible.
- Por qué: pedidos de Jacobo. Los demás espacios distraían, y la barra centrada tapaba el edificio y los clics.

**D-067 · 2026-11-12 · Las animaciones no se apagan con el movimiento reducido del sistema**
- Decisión: el sitio deja de seguir `prefers-reduced-motion`.
  - Se quitó la regla global que llevaba todas las animaciones y transiciones a 0 ms.
  - `useReducedMotion` devuelve siempre falso, y la intro, el recorrido y la cámara 3D usan su movimiento normal.
  - Quien quiera menos movimiento tiene el modo ligero (sin 3D ni video; `lessMotion()` en `lib/motion.ts`).
  - Reemplaza la última frase de la regla 8 de CLAUDE.md.
- Por qué: el equipo de Jacobo tiene apagados los "efectos de animación" de Windows, algo muy común, y veía todo a saltos: cortes sin fundido y cámara sin transición. Sus clientes probablemente también. Riesgo aceptado: quien activa esa opción por mareo ve movimiento; por eso se mantienen los movimientos suaves y está el modo ligero.

**D-068 · 2026-11-12 · Video con inercia, mosaico de espacios y bloom al desplazarse rápido**
- Decisión:
  - En "Así se entra", el scroll da la meta y el video la persigue con inercia (~0,35 s), con un cuadro a la vez; la sección pasa a 620svh.
  - El paso 5 del recorrido muestra un mosaico con todos los espacios, que entran uno tras otro.
  - ~~Al desplazarse rápido se abre una ranura de luz cálida (bloom).~~ Quitado el mismo día: a Jacobo no le gustó.
  - El plano del paso 4 se dimensiona por el alto disponible.
- Por qué: con la rueda del mouse el scroll avanza a saltos de ~100 px y el video saltaba de la calle al lobby en un cuadro. Una sola foto no explicaba "cada espacio". Lo demás, pedidos de Jacobo.

**D-069 · 2026-11-12 · Tres paquetes con ejemplo y "a la medida"**
- Decisión (Jacobo eligió la propuesta):
  - **Esencial:** fotos y 360° por espacio con botón de reserva, sin 3D.
  - **Inmersivo:** lo de Niebla Alta (edificio 3D, pisos, planos, maqueta amoblada).
  - **Premium:** Inmersivo más producción visual (fotos profesionales, video de entrada, portada con puntos).
  - Cada uno con "Ver ejemplo".
  - Corporativo sale de la grilla y queda "¿Varias sedes o una cadena? Hablemos", sin precio.
  - "Más elegido para empezar" pasa a "Recomendado para empezar": todavía no hay clientes.
- Por qué: Premium ("3D avanzado") y Corporativo no correspondían a nada construido ni planeado; cada paquete tiene que poder mostrarse.

**D-070 · 2026-11-12 · Higgsfield: el lote se genera en la web; el MCP para probar y traer resultados**
- Decisión:
  - Las imágenes y los videos del modo Premium se generan en la web de Higgsfield con el kit (referencias numeradas y prompts).
  - El MCP se usa para la prueba de calibración y para traer los resultados al repo; leer generaciones no gasta créditos.
  - Todo lo aprobado se guarda en el repo (WebP en `media/premium/`) con su registro, para no depender de Higgsfield.
- Por qué: por el MCP cada imagen cuesta unos 2 créditos y cada video unos 12,5; el ilimitado del plan Ultra no aplica por ahí. El plan completo serían unos 150 créditos.

**D-071 · 2026-11-12 · Fotos Premium en las demos y fotos que se pueden mirar**
- Decisión:
  - Las 30 fotos generadas con Higgsfield (desde los renders del propio 3D) quedan como **primera foto** de cada espacio, de las zonas comunes y, en Niebla Alta, de la portada. Los puntos de la portada se recalibraron sobre la foto nueva.
  - La foto de cada espacio se puede **mirar**: es un poco más grande que el marco y se mueve arrastrando o inclinando el celular, con perspectiva e inercia. Al abrir se mueve sola un momento. No es un 360° (`components/gallery/LookImage.tsx`).
  - Akuare: solo interiores. La fachada espera las fotos de Jacobo. Su balcón del 102 usa la sala vista desde el balcón.
  - El selector "Ver como: Esencial · Inmersivo · Premium" queda pendiente: por ahora las fotos premium se ven en todos los niveles.
- Por qué: pedido de Jacobo. Las fotos coinciden con la maqueta y cambian por completo cómo se ve la demo; "mover la cámara" sin dar la vuelta completa basta para la sensación de estar ahí.

**D-072 · 2026-11-12 · Medios por nivel (`tier: "premium"`)**
- Decisión: `Media.tier?: "premium"` marca los medios que solo se ven en el nivel Premium. Las fotos de Higgsfield ya están marcadas. El selector de nivel queda para cuando exista el 3D realista (D-074); mientras tanto las fotos se ven en todos los niveles.
- Por qué: un selector con dos niveles casi iguales no explica la diferencia de precio.

**D-073 · 2026-11-12 · Fuera "Así se entra" de la página de Antesala**
- Decisión: se quita la sección de video con scroll. El componente queda en el repo (`components/producto/Pelicula.tsx`) por si se reutiliza. "Ver ejemplo" de Premium apunta a la portada de Niebla Alta.
- Por qué: Jacobo no le vio razón de ser; era la sección más pesada y la que más fallaba.

**D-074 · 2026-11-12 · El nivel Premium es un 3D realista con luz horneada en Blender**
- Decisión: el realismo se logra en el mismo 3D interactivo, sin cambiar entre 3D y foto: materiales reales y luz de Cycles horneada en texturas (GLB), con Blender local manejado por el MCP `/use-blender` de Higgsfield. También da los 360° fotográficos. Plan: `docs/PLAN-REALISTA.md`.
- Por qué: Jacobo: "si el realista no sirve, no hay producto: no podemos vender un plan que no existe". Las fotos encima del 3D se descartaron porque el cambio entre uno y otro se ve feo. Los splats y el 3D desde una imagen no dejan abrir pisos.

**D-075 · 2026-11-12 · Selector de nivel y 3D realista por unidad**
- Decisión:
  - Las demos con contenido Premium muestran en la banda superior **"Ver como: Esencial · Inmersivo · Premium"** (`components/hotel/Nivel.tsx`). El nivel se guarda en la sesión y `?nivel=` lo fija desde un enlace; por defecto, Premium.
  - **Esencial:** sin 3D (lista con fotos y 360°) y sin medios premium.
  - **Inmersivo:** el 3D por código y los renders, sin medios premium.
  - **Premium:** la maqueta horneada en Blender (`Unit.realista`), las fotos profesionales y la portada con puntos.
  - Los "Ver ejemplo" de los precios abren cada nivel.
  - Las unidades tipo se hornean en lote (`pipeline/realista/lote.py`): exportar, amoblar y hornear, optimizar y registrar.
  - La fachada realista del edificio queda para otra sesión: sus ventanas encendidas y sus pisos que se abren están hechos por código y hay que rehacerlos con cuidado.
- Por qué: Jacobo va a vender a hoteles de todas las gamas y necesita los tres niveles visibles y distintos, con Premium que se vea premium.


**D-076 · 2026-11-13 · Premium completo: planta del piso horneada, entorno apagado y 360° en el punto despejado**
- Decisión:
  - **Planta del piso abierto:** en Premium también se hornea (`Level.realista`, `pipeline/realista/lote_plantas.py` con `PLANTA=1`). Corte a 1,1 m: sin cortinas ni cuadros, y los muebles y vidrios altos se recortan a esa altura. Los pisos con la misma planta (salvo los números) comparten el GLB: en Niebla Alta, piso 1, tipo 2–5 y piso 6. La disponibilidad sigue en el visor: las ocupadas llevan un velo gris y el brillo al pasar el mouse no cambia.
  - **Entorno:** en Premium los vecinos pierden el color (`NEIGHBOR_MUTE`) para que mande el edificio horneado.
  - **360° en vivo:** la cámara se ubica en el punto del cuarto más despejado de los muros (grilla dentro del polígono) y, entre esos, el más lejos de la ventana. Antes salía de la caja del espacio y en cuartos en L quedaba entre muros.
- Por qué: en la revisión de Premium, el piso abierto era el paso más usado y el único que no se veía realista. El 360° del dormitorio del Penthouse se rompía (Jacobo, 2026-11-13).

**D-077 · 2026-11-13 · Coherencia fachada ↔ plano como regla y como validación**
- Decisión:
  - Regla 9 de `CLAUDE.md` y lista de revisión en `docs/CONTENIDO.md` §9.
  - El build falla si las ventanas que la fachada le marca a una unidad no son las aberturas del plano hacia afuera.
  - Las copias de una unidad tipo pueden usar una variante del plano (`plan` y `realista`), p. ej. el estudio entre medianeras.
  - Niebla Alta corregida:
    - Suite 402: 3 aberturas al frente con el balcón en el medio, y 2 al costado.
    - Penthouse: 5 al frente.
    - Estudio de esquina: 2 al costado.
    - Planta tipo: una ventana por módulo.
  - Akuare (tres alcobas): de 4 a 6 aberturas.
- Por qué: Jacobo vio que la 402 tenía 3 ventanas afuera y 2 en el plano. Con clientes, una diferencia así pone en duda todo lo demás.

**D-078 · 2026-11-13 · La portada del hotel como la web de un hotel real**
- Decisión:
  - Encabezado fijo con secciones, "Recorrido 3D" y "Reservar".
  - Portada a pantalla completa con una franja "Llegada · Salida · Huéspedes · Consultar disponibilidad" que termina en WhatsApp.
  - Habitaciones en filas editoriales, zonas comunes con foto, servicios con íconos por palabra clave, ubicación, preguntas, cierre de reserva directa y pie con contacto. Todo sale de `hotel.json`.
  - El botón de reservar es un rectángulo oscuro en mayúsculas espaciadas, sin globo de chat ni vidrio.
  - La barra de reserva va sólida de borde a borde en celular. En escritorio va en una esquina sobre el 3D, y en las demás páginas la reemplaza el encabezado.
- Por qué: Jacobo: "que aparezca un hotel de verdad profesional, diseñada para vender"; el botón anterior "se veía muy IA".

**D-079 · 2026-11-13 · Página de Antesala: tema oscuro, maqueta en el paso 3 y calculadora simple**
- Decisión:
  - **Tema oscuro:** botón Claro/Oscuro junto a Cine/Ligero. Sin elección guardada sigue al sistema; se aplica antes de pintar.
  - **Paso 3 del recorrido:** una maqueta sencilla del piso, con la unidad resaltada.
  - **Paso 4:** el plano abre la demo en otra pestaña.
  - **Calculadora:** tres datos (habitaciones, tarifa, ocupación baja/media/alta) y los dos supuestos en una frase con "Ajustar".
  - **Premium:** "producción hiperrealista", y "3D hiperrealista" en lugar del video de entrada que no existe.
- Por qué: pedidos de Jacobo. El paso 3 "no se entendía" y la calculadora tenía "muchos filtros".

**D-080 · 2026-11-13 · Intro del hotel y suelo de la calle**
- Decisión:
  - **Telón de entrada:** marco fino, lugar en mayúsculas, nombre que sube desde una ranura, filete bronce y lema. Al salir, el telón se levanta; el botón es "Entrar".
  - **Suelo de la calle:** andenes de concreto gris en baldosas y suelo de fondo gris tierra, hechos en el shader (`paved`, sin texturas). Antes era un color plano casi blanco.
- Por qué: Jacobo: la intro "también vende"; "el piso en la vida real no es blanco".
