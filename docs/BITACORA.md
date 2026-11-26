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

## 2026-11-25 (noche) · Vista guiada de Cénit, giro más rápido y encabezado oscuro

**Hecho**
- **Vista guiada (D-095)**, en `/h/cenit/guiada` y `/en/h/cenit/guiada`, con un botón en la portada:
  1. la llegada en video: la cámara sube desde la calle hasta la torre;
  2. la torre con los pisos, que se iluminan de arriba hacia abajo, con su número y cuántas unidades quedan libres;
  3. al tocar un piso, el edificio se acerca a ese piso y se desvanece, y la planta sola entra girando sobre fondo liso, con las unidades en verde o terracota y una lista;
  4. al tocar una unidad, la planta se acerca y se abre su ficha: plano, fotos, 360° y "Ver en 3D".
  
  Atrás devuelve todo al revés. El piso y la unidad van en la URL, y la barra de reserva sigue lo que se ve.
- **Captura** (`pipeline/guiada.spec.ts` + `components/scene/CaptureHook.tsx`): sale de nuestra escena Premium de día, en horizontal y vertical. Los contornos son los polígonos del 3D proyectados con la misma cámara.
- **Vista guiada, segunda ronda con Jacobo:**
  - a pantalla completa, sin franja ni encabezado: la marca del hotel abajo a la izquierda (arriba en el celular) con el aviso de hotel ficticio, y los controles arriba (idioma, día/noche, cerrar);
  - **día y noche**, con la misma cámara y fundido entre las dos;
  - torre en horizontal más ancha (2800 px) para que cubra ventanas anchas y bajas;
  - en el piso, un **brillo** verde o terracota sobre la habitación (como la luz del 3D) en vez del recuadro, que se ve solo al pasar o al tocar;
  - la planta se arrastra, se inclina y vuelve sola;
  - Reservar aparece solo con una habitación abierta (D-096);
  - imágenes con versión en la URL: al recapturar, el navegador mostraba la vieja de su caché (salía estirada).
- **Tarjetas de las demos en la página de Antesala:** Niebla Alta con su fachada de ladrillo y, al pasar, la sala de la suite 402 (fotos de Niebla Alta, no las de la página, que son de otro edificio); Cénit con la torre de noche de la vista guiada y, al pasar, una habitación. Frailejón sigue con su mapa.
- **Giro entre fachadas** más rápido (1,2 s por cuarto de vuelta, antes 2,6 s fijos).
- **Encabezado del hotel** sólido oscuro (tinta) en vez de hueso.
- **Guía del 3D:** la tarjeta grande "Así se recorre" pasó a la píldora pequeña.

**Decisiones**
- D-095: vista guiada prerenderizada desde nuestro 3D. Es el primer paso de la decisión abierta 16.

**Problemas / bloqueos**
- **Las plantas salían corridas y cortadas:** el visor desplaza la cámara para el panel lateral en cada cuadro (`CameraRig`). Con `?captura`, `CaptureHook` lo anula.
- **La recaptura se colgó:** había un `next start` viejo en el puerto 3100 (las capturas lo reutilizan) sirviendo una compilación borrada. Antes de capturar, revisar que no quede ninguno.
- **Plantas realistas a medias:** la planta horneada a veces tardaba más que la espera y la toma salía con la de código; quedaban pisos distintos entre sí (regla 9). Ni con reintento llegaba siempre, así que todas las plantas (día y noche) se capturan con la de código, la de Inmersivo: iguales entre sí. La horneada queda pendiente en TAREAS con lo que se vio.
- **Videos en `public/demo/guiada/`** y no en `content/`: Safari en iPhone pide el video por rangos, y la ruta de medios de la demo no los sirve.

**Mediciones**
- Llegada: 1,2 MB por orientación (84 cuadros, H.264 crf 26). Torre: unos 200 KB. Cada planta: de 40 a 70 KB.
- La vista guiada no carga three.js.

**Siguiente sesión**
- Empezar por: lo que diga Jacobo al probar la vista guiada en su celular (Vercel). Pendientes nuevos en TAREAS: plantas con la horneada, paredes de la habitación de Cénit en el 3D, foto para la tarjeta de Frailejón. Después, las notas de Niebla Alta en TAREAS (aviso "Hotel ficticio" en el 3D, puntos naranja, letreros del lobby).

---

## 2026-11-16 (noche) · Cénit Premium de 2 a 34 fps

**Hecho**
- **Fachada de Cénit en atlas:**
  - salió a las 7:47 p. m. (4 h 26 min, con el PC compartido);
  - de 30 texturas a 2: un atlas de 4096 px para fachadas y cubierta, y uno de 2048 px para losas;
  - de 2,1 a 1,2 MB, y de ~420 a ~14 MB de memoria de video.
- **Todo lo horneado en KTX2** (Niebla Alta, Cénit, Frailejón) con la receta corregida de `optimizar.py`:
  - la decoración de Poly Haven pasa a 256 px;
  - al final va `optimize` con Draco, porque sin instancias ni simplificación las plantas decorativas duplicaban el peso.
  
  Casi todo pesa menos que en WebP.
- Se subieron:
  - volver junto a Reservar;
  - números de piso dentro de la pantalla;
  - letreros por apartamento con dos toques;
  - el panel del espacio nuevo;
  - la transición que prepara la habitación escondida (D-089);
  - la vista inicial un poco más lejos.

**Mediciones** (celular simulado, con el PC ocupado)
- Cénit Premium: 2 → **34 fps**; 7,3 → **3,1 MB**; escena visible en 9,9 s.

**Siguiente**
- Que Jacobo pruebe en su celular la transición de piso a habitación (primer toque, leer, segundo toque).
- Sombras de las ventanas en Premium de noche.
- Rediseño de la página de Antesala.

---

## 2026-11-16 (tarde) · Notas del papá de Jacobo: sencillo, intuitivo y que jamás se trabe

**Contexto**
El papá de Jacobo probó las demos. Su crítica: tiene que ser muy sencillo e intuitivo. Sus notas:

1. La flecha de volver junto a "Reservar" no funciona.
2. Hay muchos botones. No se entiende que se toca el piso y luego el apartamento. En Niebla Alta los números de piso están corridos. El paso de piso a apartamento se traba: **que jamás se trabe**, sobre todo al presentar y en el hiperrealista.
3. La página de Antesala tiene que mejorar: estética propia (bordes, botones, fuentes), que no se vea genérica ni "hecha con IA".
4. Al abrir un piso, una rayita por apartamento como la de los pisos: primer toque muestra si está libre u ocupado; segundo toque entra.
5. En celular no hay cómo devolverse.
6. El panel del espacio (360°, maqueta, fotos, otros espacios) se ve saturado y no se entiende que se puede bajar.

**Hecho y subido**
- **KTX2:** instalado KTX-Software 4.4.2 en `D:\Herramientas\KTX-Software` (con permiso de Jacobo). El visor lee KTX2 (`components/scene/gltf.ts`); el pipeline lo usa con `optimizar.py`; `reoptimizar.py` pasa lo ya horneado sin volver a hornear.
- **Fachada de Niebla Alta en atlas:** de 7 texturas a 2; 328 KB.
- **El horneado de Cénit no se había hecho:** el módulo `gpu.py` chocaba con uno interno de Blender. Se renombró a `render_gpu.py` y los lotes borran la salida vieja antes de llamar a Blender.
- **Celular, página de Antesala:**
  - el menú cabe (tema y modo solo con ícono);
  - en el recorrido, la tarjeta del paso activo va fija abajo y cambia con un fundido (ya no tapa el plano ni las fotos, ni se desfasa);
  - el edificio 3D ya no sale cortado.
- **Aviso de unidad ocupada en una línea** sobre el 3D (tapaba media pantalla en el 501).

**Hecho en el código, sin subir todavía (falta verificarlo)**
- **1 y 5, volver:** la barra de reserva no tenía `pointer-events-auto`, así que con la escena activa el toque se iba al canvas. Verificado con Playwright: ya lleva al edificio.
- **2, números de piso:** nunca se salen de la pantalla (en celular quedaban medio cortados).
- **2, fluidez piso → apartamento (D-089):**
  - la habitación compila sus shaders en segundo plano (`compileAsync`) y la cámara espera en el piso hasta que está lista (máximo 5 s);
  - en producción se apaga `checkShaderErrors`, que obligaba a esperar la compilación.
  - Medido antes: Premium tenía una congelada de 3 s; Inmersivo, tirones de 167 ms. Con la primera parte, Inmersivo quedó en 41 fps (peor tirón 133 ms); Premium sigue congelándose. Falta medir con lo de `checkShaderErrors`.
- **4, letreros por apartamento** (`components/scene/UnitTags.tsx`): número con punto verde o terracota y línea fina. Primer toque: nombre, precio u "Ocupada" y "Toca otra vez para entrar". Segundo toque: entra. Con mouse se abre al pasar.
- **6, panel del espacio:** arriba, los espacios del apartamento en una fila; debajo, 360° / Maqueta y el botón "Fotos y detalles", que despliega fotos, descripción y dotación.
- **`pnpm transicion`:** mide la fluidez de una transición cuadro por cuadro en celular simulado.

**En curso**
- Horneado de la fachada de Cénit en atlas (desde las 3:21 p. m.; lento porque el PC está ocupado). Después, `reoptimizar.py` pasa todo a KTX2.
- Compilación del sitio para medir la fluidez con `checkShaderErrors` apagado.

**Mediciones** (celular simulado, CPU 4×)
- Piso 5 → Suite 502:
  - Premium antes: 11 fps, congelada de 3 s;
  - Inmersivo antes: 36 fps, tirón de 167 ms;
  - Inmersivo con la compilación previa: 41 fps, tirón de 133 ms.
- Ojo: el celular simulado compila los shaders por software, mucho más lento que la GPU de un celular real. Sirve para encontrar los tirones; los números reales serán mejores.

**Siguiente**
1. Medir la fluidez con `checkShaderErrors` apagado; si sigue el tirón, precompilar al abrir el piso.
2. Capturas en celular de los letreros de apartamento, el panel nuevo, volver y los números de piso. Luego subir.
3. KTX2 de todo, comparación de cerca y medición de Cénit Premium contra los 2 fps de la mañana.
4. **Rediseño de la página de Antesala (nota 3)** con estética propia.
5. Pendientes: revisar en el celular las páginas de los hoteles; el entorno más creíble; las fotos que faltan; la sombra de la sala que a veces falla (preguntar a Jacobo en qué modo y desde dónde).

---

## 2026-11-16 · Rendimiento en celular, arreglos de Cénit y plan de render

**Hecho**
- **Tanda de la noche revisada:**
  - Cénit: fotos de la escena, sus 4 habitaciones realistas, plantas 1–3 y fachada;
  - fotos y 360° de Niebla 402 y 201 y de Cénit 301 y 302.
  
  El resto de las fotos se cortó porque Jacobo necesitaba el PC; está en TAREAS con su comando.
- **Mañana (pedidos de Jacobo desde el celular):**
  - Cénit en la página de Antesala (alzado de torre).
  - Zonas comunes cercanas en un solo punto con la lista.
  - Sombra de torres altas sin cortarse.
  - Vestier sin la franja negra (margen del espacio enfocado).
  - El panel del espacio se abre tocando toda la franja.
  - Esquinas negras de la fachada de Niebla Alta: eran caras pegadas; se hunden 3 mm antes de hornear.
  - El plano de la página de Antesala pregunta antes de llevar a las demos.
  - La puerta anima aunque la sección esté al lado.
  - Al llegar desde la lista, la cámara entra volando.
- **Rendimiento (D-087, `docs/CARGA.md`):**
  - fachada horneada en un atlas compartido;
  - cada planta realista se carga al abrir su piso;
  - cielo de 512 px en celular y noche solo al pedirla;
  - la calidad no se mide durante la carga y se recupera (el "se ve pixelado");
  - piso de resolución 1,25;
  - sin botón "Entrar" en el telón;
  - más sensibilidad al girar;
  - primera vista panorámica en 3/4;
  - dos puntos de 360° en espacios largos (botón "Punto 1/2");
  - `pnpm perf` para medir.
- **Plan de render (D-088, `docs/RENDER.md`):**
  - GPU y modo hiperrealista en los scripts de Blender;
  - rutas por variable de entorno;
  - la sesión en el PC prestado, paso a paso;
  - qué falta para "hiperrealista".

**Decisiones**
- D-087 (carga por tandas y memoria de video) y D-088 (render con GPU en el PC prestado).

**Problemas / bloqueos**
- KTX2/Basis (texturas comprimidas en la GPU) necesita instalar KTX-Software: **pide permiso**.
- Las fotos con Blender en CPU tardan 45–100 min por unidad: el render de calidad va al PC prestado.

**Mediciones** (celular simulado: Pixel 7, CPU 4×, 4G)
- Antes: Cénit Premium 11,1 s, 7,3 MB, **2 fps**; Cénit Inmersivo 9,8 s, 3,8 MB, 51 fps; Niebla Inmersivo 9,3 s, 4,0 MB, 56 fps.
- Después: ver la tabla de `docs/CARGA.md` §1, cuando terminen de hornearse las fachadas en atlas.

**Siguiente sesión**
- Empezar por: medir con `pnpm perf` Cénit y Niebla Premium con las fachadas en atlas y anotar el resultado; luego:
  1. revisión completa del sitio en el celular (TAREAS);
  2. el entorno más creíble;
  3. las fotos pendientes.

---

## 2026-11-15 (tarde y noche) · Glamping Frailejón, Hotel Cénit, identidad por hotel y 360° renderizados

**Hecho**
- **Glamping Frailejón (D-083):**
  - 4 refugios en el páramo;
  - escena propia: bajada desde el cielo, letreros delgados, el valle y la vista aérea, día y noche, entrada al refugio;
  - fotos desde la escena;
  - los 4 refugios horneados para Premium.
- **Hotel Cénit (D-085):** torre de lujo de 15 pisos y 52 habitaciones, fachada nueva de muro cortina, vista inicial más baja en torres.
- **Pisos pegados al edificio (FloorTags):** cada número al costado de su piso, con una línea fina. Reemplaza tocar el piso en el 3D y la columna aparte (pedido de Jacobo).
- **Identidad de la web de cada hotel (D-086)** y franja de reserva directa. Demos y Ver ejemplo en otra pestaña.
- **Telón de marca:** sin capturas del 3D de fondo (se veían como una maqueta mal hecha); solo fotos profesionales.
- **Fotos y 360° de cada espacio desde Blender (D-084)**, con el visor "Mirar en 360°". Más decoración en las maquetas.
- **Idea de finca raíz** anotada en ESTADO (decisión abierta 13).

**Problemas / bloqueos**
- Las fotos de los refugios por dentro salían con la apertura a medias en el Chromium de Playwright: ahora se capturan con Chrome.
- Los lotes del 3D realista corrían todas las pruebas de exportación (el filtro `exportar` coincidía con las tres): ahora apuntan al archivo exacto.

**Siguiente sesión**
- Empezar por: revisar lo que dejó la tanda de la noche (`.tmp/noche.sh` y `.tmp/realista/lote.log`): fotos de Cénit, fotos y 360° de Niebla Alta, Frailejón y Cénit, y el realista de Cénit (habitaciones, plantas y fachada). Registrar en `hotel.json` lo que haya quedado, compilar, revisar en capturas y subir.

## 2026-11-14/15 (noche y madrugada) · Akuare realista, su primer piso real y el visor de splats

**Hecho**
- **Primer piso de Akuare según Jacobo (D-081):**
  - sin apartamentos;
  - entrada angosta, local a la izquierda y salón comunal a la derecha;
  - pasillo hasta la escalera y los ascensores, con puertas a los parqueaderos;
  - garajes en los costados.
  - Unidades tipo 201 y 202 (32 apartamentos). `style.groundBays` en `hotel.json`.
- **Akuare en Premium:** las unidades 201 y 202, las plantas del piso 1 y del tipo, y la fachada horneadas (unos 75 min en total). Nuevo `pipeline/realista/lote_fachada.py`. Los lotes ya no se caen al escribir tildes en la consola de Windows.
- **Cambio de nivel de noche:** el fondo (barrio y cielo) se vuelve a dibujar al cambiar de nivel. No se pudo reproducir en la prueba automática (la cámara seguía moviéndose y el fondo se redibujaba solo); Jacobo debe confirmarlo en su pantalla.
- **Suelo de fondo** con manchas suaves (se veía como un tablero).
- **Visor de splats (D-082):** Spark 2.4, botón "Recorrer en 3D" en la ficha del espacio, a pantalla completa y cargado solo al tocar. Probado con un splat sintético temporal (no quedó en el contenido). JS inicial: 165 KB de 180.

**Problemas / bloqueos**
- La primera corrida del lote de Akuare se cayó en la 202 por una tilde en la consola; se arregló y se reanudó.

**Siguiente sesión**
- Empezar por: que Jacobo confirme el arreglo de la noche y revise Akuare en Premium. Pendientes: la distribución real del apartamento de tres alcobas (dos alcobas sin ventana), la prueba de captura y Megascans.

## 2026-11-14 · Investigación del ultra realista y del PC

**Hecho**
- Investigación completa en `docs/RECURSOS-REALISTA.md`:
  - por qué hoy no se ve ultra realista;
  - el camino recomendado (splat sintético desde Blender);
  - tabla de recursos: Megascans gratis, Twinmotion, D5, Lumion, ComfyUI/Flux, Marble, Higgsfield; OpenHiggsfield no sirve; Unreal con Pixel Streaming no cuadra.
- Prueba de captura real en Akuare: `docs/PRUEBA-CAPTURA-AKUARE.md`.
- Revisión del PC: ThinkPad T440p sin tarjeta gráfica, que no se puede agregar. Procesador cambiable (i7-4710MQ/4800MQ) y RAM hasta 16 GB.

**Decisiones**
- No se alquila GPU por ahora. Jacobo ahorra para un PC con NVIDIA; mientras tanto se sigue con el PC actual (§4 del documento de recursos).

**Siguiente sesión**
- Empezar por: el visor de splats (Spark), que sirve para la prueba de Akuare y para el splat sintético después, o el script de cámaras del splat sintético.

## 2026-11-13 (mediodía) · Ventanas coherentes, web de hotel real, intro y tema oscuro

**Hecho**
- **Coherencia fachada ↔ plano (D-077):** la 402 tenía 3 ventanas afuera y 2 en el plano. Se corrigieron la 402 (balcón en el módulo del medio), el penthouse, el estudio de esquina (variante `estudio-medio` para los del medio) y la planta tipo, y se hornearon otra vez. Akuare (tres alcobas) también. Regla 9 en `CLAUDE.md`, lista en `CONTENIDO.md` §9 y validación en el build.
- **Visor:**
  - sin bordes negros al abrir un piso (caras de adentro de la fachada horneada fuera);
  - verde/terracota al pasar el mouse;
  - dos toques en celular;
  - sin piezas flotando al elegir un espacio.
- **Portada del hotel como web real (D-078)** y botón de reservar sobrio.
- **Página de Antesala (D-079):**
  - tema oscuro;
  - maqueta en el paso 3;
  - el plano abre la demo en otra pestaña;
  - calculadora de 3 datos;
  - Premium "hiperrealista".
- **Intro del hotel y suelo gris en baldosas (D-080).**
- Verificado en capturas (escritorio y celular), sin errores.

**Siguiente sesión**
- Empezar por: que Jacobo revise la portada nueva en el celular real. Pendientes: Akuare (alcobas sin ventana, horneado), horneado nocturno.

## 2026-11-13 (mañana) · Revisión de Premium: pisos abiertos horneados, 360° y transición sin cortes

**Hecho**
- **Revisión de Premium** completa (portada, edificio de día y de noche, piso abierto, unidad, 360° y celular), sin errores. Lo que no se veía Premium: el piso abierto (planta por código), el 360° del dormitorio del 601 y el entorno de colores.
- **360° en vivo:** la cámara iba al rincón de afuera del dormitorio en L del penthouse, entre muros. Ahora `panoEye` busca en una grilla dentro del polígono el punto más despejado de los muros y, entre esos, el más lejos de la ventana. El cielo raso junto a lo horneado queda claro y cálido.
- **Plantas de piso horneadas:**
  - `exportar-planta.spec.ts` y `lote_plantas.py`; `amoblar.py` con `PLANTA=1`: corte a 1,1 m, sin cortinas ni cuadros, muebles y vidrios recortados.
  - Los pisos 2–5 son la misma planta, así que comparten un solo GLB. Piso 1, tipo y piso 6, unos 15 min cada uno, ~1 MB.
  - En el visor, las ocupadas llevan velo gris y el brillo al pasar el mouse sigue.
- **Entorno apagado en Premium** (`NEIGHBOR_MUTE`).
- **Del piso a la habitación** (lo reportó Jacobo):
  - La planta se iba de golpe en 0,25 s. Ahora se desvanece al ritmo del edificio y el cajón no vuelve a meterse.
  - Al llegar, la maqueta gris aparecía y luego saltaba a la horneada, con cuadros vacíos de por medio. Ahora la horneada entra directo: las del piso abierto se precargan y decodifican por adelantado (`bakedCache.ts`) y el retardo de entrada cuenta desde que se pidió la unidad.
  - Verificado cuadro por cuadro.
- ESTADO y el PDF al día, con 2 capturas nuevas.

**Decisiones**
- D-076: Premium completo (plantas horneadas, entorno apagado, punto de vista del 360°).

**Problemas / bloqueos**
- La primera prueba de la planta no se veía: solo se animaba la opacidad del primer material del GLB (un vidrio). Corregido.

**Mediciones**
- Planta horneada: ~1,0–1,2 MB (Draco + WebP, 2048 px). Unos 15 min de Blender por planta (40 muestras).

**Siguiente sesión**
- Empezar por: que Jacobo vea Premium en el celular real. Pendientes: Akuare (unidades, plantas y fachada), horneado nocturno propio y más decoración.

## 2026-11-13 (madrugada) · Despertador de las 3:30: la luz horneada sin la curva del visor

**Hecho**
- La fachada ya estaba integrada y las esquinas negras resueltas (entrada anterior).
- **Zonas oscuras:** el visor aplicaba su curva de tono (ACES) encima de la luz ya horneada, que oscurecía y ensuciaba los tonos. Los materiales horneados (unidades y fachada) pasan a `toneMapped: false`. La maqueta queda más cerca del render de Blender: muros claros y madera cálida. Verificado en el estudio 201 y en la fachada de noche, sin errores.

**Siguiente sesión**
- Empezar por: que Jacobo revise Premium en Niebla Alta. Pendientes: Akuare, horneado nocturno propio y más decoración.

## 2026-11-12 (7, noche) · 3D realista en Premium: unidades y fachada de Niebla Alta, selector de nivel

**Hecho**
- Blender 5.2.4 portable en `D:/Herramientas`, con modelos y texturas CC0 de Poly Haven.
- **Unidades horneadas** (estudio 201, suite 402, penthouse 601) con muebles modernos, cortinas, cuadros y luz de cielo y sol. Cubren las unidades 201, 301, 402, 502 y 601. Se ven en Premium.
- **Fachada horneada** por piso, con la cubierta. Las ventanas siguen por código y los pisos se abren igual; de noche se oscurece.
- **Selector "Ver como: Esencial · Inmersivo · Premium"** en la banda de demo (D-075). Los "Ver ejemplo" de los precios abren cada nivel.
- Web de Antesala:
  - Puerta al saltar entre secciones.
  - Edificio del inicio sin el rectángulo raro: era una caja invisible que escribía profundidad.
  - Intro sin "Saltar", más lenta y sin destello; botones del paso 6 a las demos.
  - Calculadora que cabe en celular; "El huésped observa".
- Piso abierto: las habitaciones vuelven a recibir clics y se ilumina con luz cálida la habitación bajo el mouse.

- Esquinas negras de los muros resueltas: los segmentos del plano se superponían. En `amoblar.py` se unen los muros (remesh y simplificación de caras planas) y se volvieron a hornear las tres unidades (sin cambio de peso).

**Problemas / bloqueos**
- La tarjeta gráfica del PC de Jacobo no soporta el motor rápido de Blender 5.2 (Workbench o EEVEE): todo se calcula con Cycles en el procesador. Una unidad tarda unos 20 min y la fachada 1 h.
- Akuare cancelado a pedido de Jacobo.

**Siguiente sesión**
- Empezar por: que Jacobo revise Premium en Niebla Alta (portada, edificio de noche y de día, un piso, una unidad). Después: Akuare, el horneado nocturno, pulir las zonas oscuras y actualizar el PDF de estado (`pnpm estado`).

## 2026-11-12 (6) · Clics en el piso abierto, luz al pasar el mouse, rumbo del 3D realista y documento con capturas

**Hecho**
- **Clics en las habitaciones del piso abierto:** el raycast de la planta pasaba de `() => null` a `undefined` y no volvía al predeterminado; ahora se pone explícito. Verificado: pasar el mouse muestra "Estudio 203" y el clic entra a la unidad 203.
- Se borra la etiqueta vieja de la fachada al cambiar de etapa (salía "Suite 404" sobre el piso 2).
- Luz cálida solo sobre la habitación bajo el mouse (malla con la forma exacta de su piso, con fundido).
- El enlace "Antesala" de la banda de demo funciona sobre la escena 3D.
- Medios marcados por nivel (`tier: "premium"`, D-072).
- Fuera "Así se entra" (D-073); "Ver ejemplo" de Premium lleva a la portada de Niebla Alta.
- Rumbo del 3D realista (D-074): luz horneada en Blender, manejado con el MCP `/use-blender` de Higgsfield (local y gratis). Plan en `docs/PLAN-REALISTA.md`.
- `docs/ESTADO.md` al día y en PDF con 15 capturas: `docs/estado/Antesala-estado.pdf` (`pnpm estado`). Las capturas se rehacen con `.tmp/check/capturas.spec.ts`; pasarlo a `pipeline/` si se usa seguido.

**Siguiente sesión**
- Empezar por: lo que Jacobo decida con la conversación de estrategia. Si sigue el 3D realista: instalar Blender en D: y el MCP `/use-blender`, y hacer la prueba con la Suite 402.

## 2026-11-12 (5) · Fotos Premium en las demos y fotos que se pueden mirar

**Hecho**
- 30 fotos de Higgsfield en WebP (18 de Niebla Alta y 12 de Akuare), registradas como primera foto de cada espacio, de las zonas comunes y de la portada de Niebla Alta. Puntos de la portada recalibrados.
- Galería: la foto de cada espacio se mira arrastrando o inclinando el celular (`LookImage`), con un paneo de presentación al abrir (D-071).

**Siguiente sesión**
- Empezar por: el selector de nivel; los videos de entrada desde las fotos; la fachada de Akuare con las fotos de Jacobo.

## 2026-11-12 (4) · Caída en "Así se entra", sin bloom y animación de la reserva

**Hecho**
- **Caída de la página** ("This page couldn't load") al llegar al video: la inercia recibía un tiempo negativo entre cuadros, se pasaba del inicio y pedía el capítulo -1. Ahora los valores están acotados, solo hay dos videos montados (el actual y el siguiente), se usa 720 salvo en pantallas grandes con memoria y las búsquedas se limitan a unas 25 por segundo. Se reprodujo y verificó con el Chrome instalado (con H.264), subiendo y bajando con la rueda: sin errores, 2 videos.
- Bloom quitado (a Jacobo no le gustó).
- Paso 5 → 6: el mosaico sale recogiéndose en orden inverso; la tarjeta de reserva sube, la recorre una línea de luz, los renglones entran en orden, el total se enciende y el botón brilla una vez.

**Mediciones**
- Prueba de estrés de la película (`.tmp/check/check9.spec.ts`, canal chrome): 0 errores; heap de unos 8 MB.

**Siguiente sesión**
- Empezar por: traer lo que Jacobo genere con el kit de Higgsfield.

## 2026-11-12 (3) · Modo Premium: plan, prueba con Higgsfield y kit

**Hecho**
- `docs/ESTADO.md` (resumen vivo para la conversación de estrategia) y `docs/PLAN-PREMIUM.md` (inventario, prompts y orden).
- Higgsfield conectado por MCP (`.mcp.json`; cuenta Prodigia, plan Ultra).
- Prueba de calibración: la sala de la Suite 402 desde su render, con Nano Banana Pro. Conserva la distribución y queda en `content/hotels/niebla-alta/media/premium/402-sala.webp`; registro en `docs/identidad/premium-higgsfield.json`.
- Kit para la web de Higgsfield: 29 referencias numeradas y sus prompts en `.tmp/kit-premium/`.

**Decisiones**
- D-070: por el MCP todo cuesta créditos (el ilimitado del Ultra no aplica). El lote se genera en la web y el MCP solo prueba y trae resultados.

**Problemas / bloqueos**
- Algunas referencias son flojas (dormitorio del penthouse en blanco, baños vacíos). Para esas el kit usa otra referencia o solo el prompt.
- La fachada de Akuare espera las fotos de Jacobo desde la calle (no se usa Google Maps).

**Siguiente sesión**
- Empezar por: traer por el MCP lo que Jacobo genere con el kit, pasarlo a WebP, registrarlo y armar el selector de nivel (Esencial, Inmersivo, Premium).

## 2026-11-12 (2) · Revisión de Jacobo: movimiento, video, mosaico, demos y precios

**Hecho**
- Causa de "todo se ve a saltos": su Windows tiene apagados los efectos de animación y el sitio cortaba todas las animaciones (D-067). Ahora se ven siempre; el modo ligero queda para quien quiera menos movimiento.
- "Así se entra": el video persigue el scroll con inercia; antes un paso de rueda saltaba de la calle al lobby (D-068).
- Recorrido: el plano del paso 4 cabe entero; el paso 5 es un mosaico con todos los espacios; el 3D de fondo más tenue en los pasos 4 a 6.
- Bloom: ranura de luz cálida al desplazarse rápido o al saltar desde el menú (los enlaces del menú ahora se deslizan).
- Demos: banda superior con el símbolo de Antesala y "volver". Niebla Alta vuelve a sus renders y al ladrillo (las fotos de Higgsfield son de la página de Antesala); sus puntos de portada van sobre su render. Su tarjeta muestra la planta del piso 5.
- Precios: "Recomendado para empezar".

**Problemas / bloqueos**
- Los paquetes (sobre todo Premium y Corporativo) no están definidos: se le propone a Jacobo una definición atada a lo que existe.
- Sin acceso a Higgsfield desde Claude Code: las fotos propias de Niebla Alta y Akuare esperan a que se conecte.

**Siguiente sesión**
- Empezar por: la definición de paquetes que elija Jacobo y su prueba del scroll y del video en su laptop.

## 2026-11-12 · Bloque 9 (aprobado) y revisión de Jacobo de la web y el 3D

**Hecho**
- Página de Antesala:
  - Scroll fluido. Se quitó el vidrio esmerilado (backdrop-filter) de las tarjetas y la barra sobre el 3D. El 3D de la portada dibuja solo cuando algo se mueve (DPR máx. 1,5). "Así se entra" mueve fotos, barra y video directo en el DOM, sin re-render de React por cuadro, y no pide un cuadro de video que ya está.
  - El edificio ya no se reinicia al final del recorrido (en los huecos entre pasos y en el espacio final el paso volvía a 0).
  - Barra superior sólida al bajar: los textos ya no se montan sobre el logo.
  - Entrada "De la calle a su suite" antes del video, para que la foto no aparezca sin contexto.
  - Tarjetas de demos: Akuare con su alzado dibujado (unidades por piso, vendidas rayadas, datos reales) y glamping con mapa de terreno y domos.
- Bloque 9 (D-065):
  - Portada del hotel con puntos tocables (`site.cover`) y video de transición; sin video con movimiento reducido, ahorro de datos o modo ligero.
  - Planta del piso con disponibilidad (verde y terracota) y leyenda.
  - Niebla Alta: las fotos de Higgsfield son la portada, el lobby, la terraza y los espacios de la Suite 402; fachada 3D en estuco color arena (renders de fachada y piso 6 regenerados).
- 3D (D-066):
  - Al elegir un espacio en la maqueta, los demás se hunden en el piso y solo queda ese, encuadrado a su tamaño.
  - Barra de reserva a la derecha y selector de fachada a la izquierda en escritorio.
  - Telón de carga sin filtros animados (fluido aunque el 3D se esté armando) y con la foto de portada detrás.

**Problemas / bloqueos**
- La carga del 3D en sí no se midió en un equipo real (aquí el WebGL es por software). Lo que se arregló es el telón trabado; si sigue lenta, medir en el equipo de Jacobo.
- La vista 360° en vivo de la Suite 402 se ve tosca en WebGL por software; revisar en un equipo real.

**Mediciones**
- `pnpm typecheck`, `pnpm lint` y `pnpm build` (562 páginas) sin errores. 24 capturas de rutas tocadas en verde; revisadas a 1366×640 y 390×844.

**Siguiente sesión**
- Empezar por: que Jacobo pruebe en su laptop y su celular el scroll, la carga del 3D, los puntos de la portada y la maqueta enfocada. Después, más fotos de Higgsfield para estudio y penthouse.

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
