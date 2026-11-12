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

## 2026-11-12 · Akuare · fotos desde la escena 3D y cubierta plana

**Hecho**
- `pnpm renders -g akuare`: 16 fotos ilustrativas en `content/hotels/akuare/media/renders/` (fachada de día y de noche, piso 5 y los espacios de las plantillas 101 y 102), registradas en `hotel.json` con `fidelity: "ilustrativa"`.
- Cubierta plana: nuevo `building.style.roof` (`"terraza"` con pérgola por defecto, `"plana"` solo antepecho y baranda). Akuare usa `"plana"`, como el edificio real. Fachadas regeneradas y revisadas.
- TAREAS al día con lo de Akuare que ya estaba hecho (fachada residencial, sección de demos, D-056 a D-059, generador en `pipeline/`).

**Mediciones**
- `pnpm typecheck`, `pnpm lint` y `pnpm build` sin errores; pruebas de Akuare (entrada, unidad 101, sala) en verde.

**Siguiente sesión**
- Empezar por: la revisión de Jacobo de la web en su celular (video con scroll en iPhone) y los cambios del boceto que mande.

## 2026-11-11 · Identidad visual y web de Antesala con dos modos

**Hecho**
- Identidad (D-062): logo ranura de luz, paleta noche/marfil/champán, Cinzel/Cormorant/Jost, favicon, firma Mamut Herd.
- Web desde el boceto (D-063) con los datos reales de Niebla Alta y las dos demos; fotos de Higgsfield en `public/demo/` (WebP) y cuatro clips re-codificados para el scroll en `public/demo/video/`.
- Modo cine y modo ligero (plano sobre papel, menos azul, trazos que se dibujan).
- Todo lo de trabajo pasa a D: (`.tmp/` en el proyecto). Playwright usa el Chromium de `D:\Repositorios\Prodigia\compilacion\ms-playwright` (se borró la copia en C:).
- Generador de planos de Akuare llevado al repo (`pipeline/gen_akuare.py`); fachada residencial de Akuare (D-059) incluida.

- Sombras congeladas con un piso abierto (D-064). Revisado el piso abierto en el tiempo: a los 5 s (WebGL por software) se ve la transición a medias; a los 25 s el cajón está afuera, los pisos de arriba velados y la planta completa. No se reprodujo un estado final dañado: si Jacobo lo sigue viendo, pedir video o captura en su equipo.
- Rutas `/demo` y `/cotizar` (redirigen a sus secciones).
- Lighthouse en Vercel (móvil): página de Niebla Alta 78, Akuare 70, explorar 60 (accesibilidad 100 en las tres). Web de Antesala: 35. Arreglos: la luz de la intro anima solo transform (CLS de 0,157 a 0,002), los videos se piden al acercarse a la sección, three.js espera a que la página cargue y el equipo esté libre, los botones champán llevan texto azul noche (contraste) y el botón de modo anuncia lo que muestra. Medido en local: 46. Lo que queda es la intro de 3 s (diseño) y armar el 3D.

**Siguiente sesión**
- Empezar por: la revisión de Jacobo de la web en su celular y los cambios del boceto que mande.

## 2026-11-10 · Bloque 8 · Entrega, constructoras y todo lo pendiente

**Hecho**
- `docs/ENTREGA.md`: dónde vive cada cosa, hosting (Vercel Pro para clientes; Hobby no permite uso comercial), dominio del cliente por CNAME sin pedir contraseñas, qué se entrega si el cliente se va y qué cubre la mensualidad.
- `docs/VENTA.md`: segundo mercado, constructoras sobre planos (gancho, guion, qué pedir, cómo encontrar prospectos y mensaje).
- DECISIONES D-056 a D-060. D-060 (modo renders y constructoras) queda como propuesta.
- Análisis del referente que mostró Jacobo (Urbania): sus imágenes son renders y video pre-renderizados con botones encima, no 3D en tiempo real. La brecha visual es de contenido, no de código.

**Problemas / bloqueos**
- Se alcanzó el límite semanal durante la sesión; no se pudo abrir la página del referente.

**Pendiente (todo en TAREAS)**
- Sin subir en el árbol de trabajo: fachada residencial y piso 1 de Akuare (D-059); correr `pnpm build` y revisar antes de subir.
- El piso abierto sigue fallando (reproducir primero) y quitar sombras con un piso abierto.
- "Elige una demo" en la página de Antesala; `pnpm renders akuare`.
- Bloque 9 (modo renders), si Jacobo lo aprueba.
- Copiar ENTREGA al documento maestro; Vercel Pro; precio de la mensualidad; prospectos.

**Siguiente sesión**
- Empezar por: decidir si se aprueba el bloque 9. Si sí, empezar por la portada con imagen y puntos y la planta cenital con disponibilidad; si no, cerrar Akuare (build, fachada, piso abierto).

## 2026-11-08 · Segundo demo: Edificio Akuare (en curso)

**Siguiente sesión**
- Empezar por: `pnpm build` y revisar la fachada nueva de Akuare; si está bien, subir. Luego la sección "Elige una demo" en la página de Antesala.

**Hecho (sin pruebas completas todavía)**
- `pnpm catastro` (D-056): de la dirección a la placa, al lote y a la torre del catastro de Bogotá (huella y pisos reales); vecinos con sus pisos y calles de OpenStreetMap en `media/context.json`. La escena dibuja ese contexto real en vez del inventado.
- Oferta por hotel (D-057): noche, mes o venta (precio, "Agendar visita" por WhatsApp, "Vendido" o "Arrendado").
- Akuare (Calle 158 # 93A-37, Suba Salitre): torre de 35 × 20 m y 5 pisos, 37 apartamentos (esquineros de 3 alcobas y medianeros de 2), planos de piso generados sobre la huella, 13 vendidos simulados, precios de referencia de avisos públicos. El banner dice "Demostración no oficial".

- Despliegue: Netlify se quedó sin créditos (deploys pausados). El sitio se pasó a Vercel: https://antesala-mauve.vercel.app (rama de producción `main`; cada push a main publica).
- Peso de las páginas: cada plano de unidad viaja una vez y las plantas de piso se piden aparte desde la escena (página de Akuare de 359 a 88 KB; build de Akuare de 357 a 98 MB).
- Pisos: se puede tocar otro piso con uno abierto (el toque sobre la planta abierta va a la habitación) y los pisos atenuados ya no proyectan sombra sobre la planta.

**Sin subir (en el árbol de trabajo, falta `pnpm build` y revisar)**
- Fachada real de Akuare según Street View (Jacobo): primer piso "residencial" (`style.ground`, D-059) con garajes de persiana, un local con vitrina y una puerta pequeña con placa con el nombre; sin marquesina. Archivos: `components/scene/Building.tsx`, `lib/types.ts`, `lib/content.ts`.
- Planta del piso 1 de Akuare alineada con esa fachada: parqueaderos, local y portería al frente; salón social atrás a la derecha (piso 1 queda con 101 a 103). Ya regenerados `hotel.json`, `plans/piso-1.svg`, placeholders y panoramas. El generador está en el scratchpad de la sesión (`gen_akuare.py`), no en el repo.

**Pendiente**
- El piso abierto sigue fallando según Jacobo (en Vercel, después del arreglo de sombras y clics). Reproducirlo primero. Además, Jacobo propone no calcular sombras al abrir piso por piso: no se notan y cuestan rendimiento.
- Página de Antesala: sección "Elige una demo" con Niebla Alta y Akuare (hoy solo enlaza a Niebla Alta).
- `pnpm renders akuare` (fotos de fachada e interiores) para la portada de Akuare y la tarjeta de la demo.
- Lint y capturas 2D y 3D de Akuare, mirar las capturas; `pnpm renders akuare`; registrar D-056 a D-058 en DECISIONES.

## 2026-11-08 · Bloque 8 · Página de Antesala y sitio completo del hotel

**Hecho**
- Página de Antesala en `/` (D-053): problema de la comisión, cómo funciona con capturas reales del recorrido, lo que gana el hotel, la sección para hoteles sin página web, cómo empezamos el piloto, preguntas y WhatsApp.
- Portada del hotel como sitio web completo (D-053): portada con el edificio, datos clave, invitación al recorrido, habitaciones por categoría, edificio y servicios, ubicación, estadía y políticas, preguntas y reserva directa. Nuevo `hotel.info` opcional.
- `pnpm renders`: 26 fotos ilustrativas tomadas de la escena 3D (fachada de día y de noche, piso abierto y cada espacio por dentro), 1,9 MB en total. Son la portada, las tarjetas y la primera foto de cada galería.
- `pnpm producto`: capturas del recorrido en celular y del sitio del hotel para la página de Antesala (224 KB en WebP). `sharp` pasa a ser dependencia de desarrollo.
- La galería del espacio se salía de la pantalla en móvil (faltaba `min-w-0` en la grilla).

- Habitaciones ocupadas simuladas (D-054): de noche solo se encienden las ventanas de las ocupadas; se recorren, pero proponen la alternativa libre más parecida. 8 de 21 ocupadas.
- Revisé la sala de la Suite 202 por dentro, de noche, desde cuatro ángulos: muros, balcón y puertas completos. No pude reproducir la vista "sin muro" de la captura de Jacobo; hay que preguntarle cómo llegó.

- Rediseño de la página de Antesala (D-055): hero cinematográfico de noche, secciones numeradas, galería bento, comparador día/noche y calculadora de ahorro. La foto de la fachada de noche se regeneró con las luces de las ocupadas.

**Mediciones**
- JS inicial máximo: 160 KB gzip. 112 capturas de lista en verde; las dos páginas revisadas completas en 390 px y 1440 px.

**Siguiente sesión**
- Empezar por: la revisión de Jacobo de las dos páginas en Netlify. Pendiente: las fotos 2 a 4 de cada galería siguen siendo de muestra (se pueden sacar más ángulos con `pnpm renders`) y volver a medir Lighthouse.

## 2026-11-07 · Bloque 7 y 8 · Estabilidad en celular, precarga por intención, criterios y venta

**Hecho**
- Estabilidad del 3D en celular (D-051). Causas encontradas de lo que vio Jacobo:
  - **Piso que "se rompe":** las ventanas de la fachada retirada seguían escribiendo profundidad con opacidad 0 y tapaban a ratos la planta. Ahora la fachada se oculta del todo al retirarse.
  - **Tirones, colores dañados y fondo negro:** el monitor de rendimiento prendía y apagaba sombras y resolución en plena animación. Ahora sombras y detalle se deciden al montar y en marcha solo baja la resolución, con la cámara quieta.
  - **Desenfoque negro:** píxeles NaN/Inf se regaban con el blur. Ahora se limpian, se comprueba que el GPU dibuje en half float (si no, 8 bits) y el fondo se repinta si se reinicia el contexto.
  - **Trabas al abrir piso o unidad:** los shaders se compilaban en plena animación. Ahora se compilan con la escena quieta.
- Velocidad en celular (D-051): en táctil, three.js y el HDRI se precargan con el primer toque o desplazamiento, no en ocio. Las 6 plantas amobladas se arman en tiempo libre, no en la carga.
- Bloque 8: `docs/VENTA.md` con el guion de 3 minutos, las preguntas típicas, la verificación web de Monir y Nico (ninguno tiene tour 360°; Monir no tiene sitio propio; Nico usa el motor Mirai) y los mensajes de primer contacto.

- Ronda con la demo publicada (D-052): la presentación es ahora el telón de carga del 3D (ya no se ve la lista a medio cargar); cualquier habitación de la planta abre su unidad (antes los pisos de encima se quedaban con el clic) y brilla al tocarla; el fondo de estudio entra al empezar el vuelo y el fundido de movimiento reducido se sostiene en negro; el panel del espacio se pliega en escritorio y empieza recogido; barandas en balcones y terrazas. Pruebas nuevas: telón, entrar a la 301 y a la 303 (copia) y terraza.

**Revisión de los criterios de éxito (`PRODUCTO.md`)**
- Recorrido completo sin errores en iPhone y Android de gama media: **pendiente** de la prueba de Jacobo. En las pruebas automáticas (escritorio y 390 px) el recorrido pasa sin errores de consola.
- Contenido útil en < 2,5 s con 4G: **casi**. Lighthouse móvil (antes de la precarga por intención): primer contenido en 1,2-1,3 s en todas las páginas y LCP de 1,2 a 2,8 s (la entrada en 2,5 s y el piso 1 en 2,8 s se pasan). Hay que volver a medir con lo de hoy.
- Un tercero entiende el producto sin explicación: **en curso**. Varias personas lo vieron y les gustó, pero la mamá de Jacobo no supo usarlo: se agregó la guía (D-048). Falta repetir la prueba con 2-3 personas.
- Se ve premium, sin pantallas que parezcan placeholder: **no del todo**. Las galerías de fotos de cada espacio siguen con imágenes de muestra (el bloque 5 está aplazado, D-040). Propuesta: generar esas fotos desde la maqueta amoblada en vivo (como la vista desde la ventana), hasta que haya renders o fotos reales.

**Problemas / bloqueos**
- El equipo estaba compartiendo CPU con un build de Android de otro proyecto (calibra-proyecto): las pruebas 3D tardaron el doble y alguna se cayó por tiempo.

**Siguiente sesión**
- Empezar por: la prueba de Jacobo en el celular (piso, fondo negro, colores). Luego la propuesta de fotos de galería desde la maqueta y volver a medir Lighthouse.

## 2026-11-05 · Bloque 7 · Retroalimentación de las primeras personas: luz, cámara, guía y todas las habitaciones

**Hecho**
- Luz de la planta (D-049): por qué era blanca o negra. Dependía del sol y la hora; ahora tiene muros oscuros en corte y luz interior cálida de noche.
- Espacios en modo maqueta (D-049): muros y muebles bajan a 1,15 m (corte en el GPU, con sombras) y la cámara mira más desde arriba. La cocina ya no queda tapada.
- Límites de zoom e inclinación alrededor del encuadre de cada vista.
- Fondo de la unidad en carbón cálido (los muros blancos se leen).
- Recorrido 360° amoblado en la demo (D-046): por dentro de la maqueta, con cielo raso y la ciudad por la ventana. La cámara arranca contra el muro opuesto y un poco inclinada.
- Unidades tipo `sameAs` (D-047): 21 habitaciones, todas tocables en la planta, con luz en su ventana, precio por piso y página propia. "Elige tu unidad exacta" muestra la misma columna del edificio.
- Guía (D-048): tarjeta de tres pasos la primera vez y una pista por pantalla. Va en un portal al body, encima de todo.
- Menos saturación (D-048): el panel del piso es un resumen sin lista; las etiquetas de las habitaciones salen solo con el puntero o el foco; en móvil, el panel de la unidad y el del espacio empiezan recogidos y la maqueta queda centrada.
- Lighthouse móvil contra Netlify (antes de estos cambios): accesibilidad 100, buenas prácticas 100, SEO 60-63 (solo falla "indexable": la demo es `noindex` a propósito), rendimiento 56-73.

- Segunda ronda (D-050): luz encendida un momento antes de entrar a la habitación (también en celular); fondo que se quedaba negro al quitarse el desenfoque (MSAA sin soporte en el GPU y copia vacía al cambiar de tamaño); HDRI que cambia a mitad del crepúsculo; pañete, zócalo, piso de tablas y baldosa en la unidad; puerta de entrada cerrada en el recorrido por dentro; luz interior con sombra del cielo raso.

**Problemas / bloqueos**
- El fondo negro no se pudo reproducir en el navegador de pruebas (tiene `EXT_color_buffer_float`): hay que confirmarlo en el celular de Jacobo.
- Rendimiento (Lighthouse, CPU ×4): el TBT es alto. En la entrada (1,8 s) es por la precarga en ocio, que evalúa three.js (851 ms) y baja el HDRI de 619 KB incluso en móvil. En explorar (14 s) es por construir la escena con el CPU lento. Propuesta para la próxima sesión: en táctil, precargar por intención (al tocar "Explorar") y no en ocio; medir dónde se va el armado de la escena en un teléfono real.
- En el WebGL por software de las pruebas, GSAP avanza ~33 ms por cuadro lento: algunas transiciones tardan 40-60 s. Se ampliaron las esperas de esas pruebas; en un equipo con GPU no pasa.
- El giro de fachada se volvió algo más lento en esas pruebas (balcones de las suites nuevas). Hay que medirlo en un teléfono real.

**Mediciones**
- JS inicial máximo: 159,6 KB gzip. Capturas de lista (114) en verde; 3D revisadas en escritorio y móvil.

**Siguiente sesión**
- Empezar por: que Jacobo y su mamá prueben de nuevo en el celular. Luego, rendimiento en móvil (precarga por intención, armado de la escena) y bloque 8.

## 2026-11-05 · Bloque 7 · Entrada de marca, amoblado y lobby

**Hecho**
- Entrada de marca (D-043): el nombre letra por letra sobre niebla, una vez por sesión, con "Saltar", sin parpadeo al volver. Solo CSS.
- Amoblado (D-044): muebles armados por piezas y agrupados por material, con `data-back` y `data-finish` en la convención de planos. Están amoblados todos los pisos (unidades tipo con baño, cocineta, cama, sala y mesa; pasillo con alfombra; escalera y ascensores), el penthouse con su terraza y las maquetas de las unidades 201, 402 y 601.
- El piso 1 ya no repite la retícula: es un lobby con entrada y vitrinas, recepción, sala, café con barra, cowork con cabinas, baños y equipaje.
- La planta 2D dibuja tapetes punteados, escaleras con huellas y piezas redondas.
- La tarjeta de la terraza se abre hacia abajo cuando el punto está en la mitad superior (antes se cortaba).
- Inglés aparcado (D-045).

**Problemas / bloqueos**
- `PLAYWRIGHT_BROWSERS_PATH` del equipo apunta a `D:\Repositorios\Prodigia\compilacion\ms-playwright`, que no tiene el Chromium 1248. Se instaló en la ruta por defecto (`%LOCALAPPDATA%\ms-playwright`) y las pruebas se corren con esa variable apuntando allí.

**Mediciones**
- JS inicial máximo: 159,7 KB gzip. Capturas de lista (82) en verde; 3D de los pisos 1, 2 y 6 y de las unidades 201, 402 y 601 revisadas.

**Siguiente sesión**
- Empezar por: Lighthouse contra Netlify y prueba en un Android de gama media y un iPhone. Luego revisar los criterios de `PRODUCTO.md` y pasar al bloque 8.

## 2026-11-04 · Planta del piso y miradores de la terraza

**Hecho**
- Planta de cada piso (D-041): 6 planos SVG (pasillo, núcleo, unidades; el piso 1 con lobby, cowork y local; el 6 con el penthouse y su terraza). Al sacar el cajón, la fachada del piso se retira y aparece la planta en corte; las unidades de la demo se tocan y muestran su precio. En modo lista, la planta 2D en la página del piso.
- Miradores de la terraza (D-042): tres puntos (cerros, ciudad, occidente) con 360° en vivo.
- Bloque 5 aplazado hasta el primer cliente (D-040).

**Mediciones**
- JS inicial máximo: 159 KB gzip. Capturas 3D del piso 4 y del mirador en verde.

**Siguiente sesión**
- Empezar por: revisión de Jacobo en Netlify. Luego bloque 7 (entrada de marca, inglés, Lighthouse) y bloque 8 (guion y mensajes).

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
