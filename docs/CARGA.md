# Carga y rendimiento — qué se carga, cuándo y cuánto puede pesar

Este documento manda sobre el orden de carga de las demos y sobre el tamaño de todo lo que sale del pipeline de render. Si algo nuevo no cabe aquí, se ajusta aquí antes de construirlo. Complementa `ARQUITECTURA.md` §6 y §8. La decisión que lo origina es la D-087.

## 1. Lo que aprendimos (2026-11-16)

Jacobo abrió Cénit en su celular y "va muy lento". Medido con `pnpm perf` (§6), simulando un celular de gama media:

| Página | Escena visible | Bajado | Fluidez | Tareas largas |
|---|---|---|---|---|
| Cénit Premium | 11,1 s | 7,3 MB | **2 fps** | 34 (16,9 s) |
| Cénit Inmersivo | 9,8 s | 3,8 MB | 51 fps | 33 (11,7 s) |
| Niebla Alta Inmersivo | 9,3 s | 4,0 MB | 56 fps | 26 (11,2 s) |
| **Cénit Premium, 2026-11-16 noche** (atlas + KTX2 + tandas) | 9,9 s | 3,1 MB | **34 fps** | 37 (12,5 s) |
| **Cénit Premium, 2026-11-21** (render hiperrealista, fachada en atlas de 2048) | 5,6 s | 2,7 MB | **60 fps** | 12 (4,7 s) |
| **Niebla Alta Premium, 2026-11-21** (ídem) | 5,3 s | 2,7 MB | **60 fps** | 13 (4,7 s) |
| Niebla Alta 402 Premium (habitación), 2026-11-21 | 5,8 s | 4,7 MB | 60 fps | 18 (5,8 s) |
| Cénit 301 Premium (habitación), 2026-11-21 | 5,9 s | 3,9 MB | 60 fps | 16 (5,8 s) |

Las del 2026-11-21 se tomaron en otro PC (el del amigo de Jacobo), así que no se comparan uno a uno con las del 16.

**Memoria de video estimada el 2026-11-21.** Es una cota por arriba: envuelve las llamadas de WebGL, con el script de la sesión `.tmp/realista/vram.mjs`, que no está en el repo.

| Página | Memoria de video estimada |
|---|---|
| Cénit Premium | ~124 MB |
| Niebla Premium | ~130 MB |
| Cénit 301 (habitación) | ~148 MB |
| Niebla 402 (habitación) | ~156 MB |

En las páginas de habitación:
- unos 48 MB son buffers del posproceso del visor;
- la geometría nueva de los muebles suma ~2 MB frente a antes;
- queda pendiente bajarla: subdivisión solo en las fotos y modelos simplificados en el horneado.

La medición de la noche se hizo con el PC ocupado (otra pestaña pesada de Jacobo): los tiempos de las tareas largas están inflados. La fluidez es la que importa: de 2 a 34 fps.

Las causas no eran los MB bajados, sino la **memoria de video**:

1. **Fachada realista con una textura por piso.** Cénit tenía 15 de 2048 px y 15 de 1024 px. Pesaban 2 MB al bajar, pero ocupaban **~420 MB** en la tarjeta de video. Una textura WebP o JPG se descomprime al subir a la GPU: una de 2048 × 2048 ocupa ~22 MB con sus mipmaps, aunque el archivo pese 100 KB.
2. **La planta realista de cada piso se cargaba al llegar, aunque nadie la abriera.** En Cénit, los pisos 3 a 15 usan la misma planta: se decodificaba 13 veces, ~290 MB más.
3. **El cielo de noche (1,6 MB) se bajaba siempre**, compitiendo con lo que sí se veía.
4. **La calidad bajaba para siempre durante la carga.** El visor reducía la resolución si caían los cuadros, y durante la carga siempre caen. Así, un celular potente terminaba con la resolución mínima (el "se ve pixelado" de un amigo de Jacobo).

## 2. Cómo lo hacen los profesionales

- **D5 Render** (escritorio):
  - carga las texturas solo cuando entran en cámara y deja las demás en disco (*texture streaming*: hasta 40 % menos memoria de video);
  - baja el detalle de lo lejano (LOD);
  - une modelos pequeños en uno grande para hacer menos llamadas de dibujo.
  
  Para la web usa *pixel streaming* (un PC renderiza y manda video), que no sirve para nosotros.
- **Matterport** baja los 360° por teselas: primero una versión baja que se ve de una vez y luego cuadros de 512 px nítidos encima, solo los que se miran. Cuando lo lanzaron, reventaba en iOS por memoria; lo corrigieron.
- **Three.js en celular** (guías de 2026):
  - la memoria de video es lo que tumba la pestaña, no la descarga;
  - **KTX2/Basis** mantiene las texturas comprimidas dentro de la GPU, con 4 a 8 veces menos memoria;
  - presupuesto: ≤ 150 MB de video y ≤ 50–100 llamadas de dibujo en celular;
  - siempre `dispose()` de lo que sale de escena.

Fuentes:
- [D5 Smoothness](https://www.d5render.com/posts/d5-render-smoothness)
- [D5: memoria en escenas grandes](https://radarrender.com/d5-render-out-of-memory-on-big-arch-viz-scenes-how-to-solve-it/)
- [Matterport: teselas](https://www.wegetaroundnetwork.com/topic/3240/page/1/matterport-adds-zoom--loads-tiles-vs-cubes/)
- [GLB para la web: Draco, Meshopt y KTX2](https://app.cinevva.com/guides/optimize-glb-for-web)
- [KTX2 y Basis en Three.js](https://aetumi.app/news/ktx2-basis-texture-compression-threejs/)
- [100 consejos de Three.js](https://www.utsubo.com/blog/threejs-best-practices-100-tips)

## 3. Las tandas de carga

Cada tanda empieza cuando la anterior terminó y la pantalla ya muestra algo. Nada de una tanda posterior se pide antes.

| Tanda | Cuándo | Qué | Cómo se ve mientras |
|---|---|---|---|
| **T0** | Al pedir la página | HTML, marca, portada, JS inicial (≤ 180 KB gzip) | Página del hotel completa, sin 3D |
| **T1** | Al entrar a una etapa 3D | JS del visor, edificio por código, cielo de día (512 px en celular) | Telón con el nombre (sin botón "Entrar": se levanta cuando hay escena) |
| **T2** | Escena visible y quieta | Ladrillo y lino. **Premium:** la fachada horneada en atlas | Escena por código; la horneada entra con fundido |
| **T3** | Por intención | Planta realista al **abrir** su piso; habitaciones realistas del piso abierto (2,2 s después de que sale el cajón); fotos y 360° al entrar a un espacio | La versión por código, sin saltos |
| **T4** | Solo si se pide | Cielo de noche (en escritorio se adelanta a los 12 s; en celular nunca), splat, visor 360° en pantalla completa | Indicador de carga en el botón |

Reglas:

- **Lo que no se ve, no se baja.** Si un recurso no se va a ver en los próximos segundos, espera su tanda.
- **Una copia por recurso.** Lo que comparten varias piezas (la planta de los pisos tipo, la fachada en atlas) se baja y se decodifica una vez.
- **Lo que sale de escena se libera** (`texture.dispose()`, `material.dispose()`).
- **No se mide la fluidez mientras se carga** (`markLoading` en `lib/capabilities.ts`): la calidad solo baja por lentitud sostenida con la escena quieta, y vuelve a subir si el equipo se recupera.
- **Cambiar de nivel (Inmersivo ↔ Premium) no recarga la página.** Lo de Premium entra con fundido cuando ya está listo. Pendiente: adelantar su descarga en segundo plano cuando la persona pasa por el selector.

## 4. Presupuestos

Además de los de `ARQUITECTURA.md` §8. Son criterios de aceptación: se miden con `pnpm perf` antes de dar por bueno un hotel.

| Recurso | Celular | Escritorio |
|---|---|---|
| Memoria de video total de la escena | **≤ 150 MB** | ≤ 400 MB |
| Llamadas de dibujo por cuadro | ≤ 100 | ≤ 300 |
| Fluidez con la escena quieta (gama media simulada) | ≥ 30 fps | 60 fps |
| Escena visible (4G simulada) | ≤ 8 s | ≤ 4 s |
| Fachada horneada | 1 atlas de 2048 px (+ 1 de 1024 para losas) | igual |
| Planta horneada por piso tipo | 1 de 2048 px | igual |
| Habitación horneada | 1 de 2048 px | igual |
| 360° en el visor | 2048 × 1024 | 4096 × 2048 |
| Cielo (HDRI) | 512 × 256 (~300 KB) | 1024 × 512 |
| Resolución de render (DPR) | 1,25 a 1,75 según el equipo | hasta 2 |

## 5. Reglas para lo que sale del pipeline de render

1. **Atlas, no una textura por pieza.** Las piezas que se ven juntas comparten imagen. Ejemplo: la fachada, que `hornear_edificio.py` hornea en un atlas desde la D-087.
2. **Lo repetido se hornea una vez.** Los pisos tipo comparten planta; las copias (`sameAs`) heredan fotos y 3D.
3. **Tamaños máximos en la web:** 2048 px por textura y 4096 × 2048 para el 360° de escritorio. Los maestros de mayor resolución (8K) se guardan aparte para fotos y video, no para el visor.
4. **Formato de textura: KTX2/ETC1S** (desde el 2026-11-16, con KTX-Software instalado). Lo hace `pipeline/realista/optimizar.py` en este orden:
   1. texturas a su tamaño máximo;
   2. la decoración de Poly Haven (`*_1k*`) a 256 px, porque el visor solo usa su color y se ve pequeña;
   3. ETC1S;
   4. `optimize` con Draco (instancias, simplificar, soldar).

   Resultado: pesa igual o menos que WebP al bajar, y la textura de luz de 2048 px ocupa ~2,8 MB de video en vez de ~22 MB. Sin `toktx` (el PC prestado) sale WebP como antes. Para pasar lo ya horneado: `python pipeline/realista/reoptimizar.py`.
5. **Geometría:** Draco y sin caras ocultas (muros pegados, caras contenidas).

## 6. Cómo medir

```
pnpm build
pnpm exec next start -p 3100            # en otra terminal
pnpm perf "/h/cenit/explorar?nivel=premium" "cenit premium"
```

Da los segundos hasta que la escena se ve, los MB bajados, los fps y las tareas largas, más los 8 archivos más pesados. Para ver la memoria de video, abrir la demo en Chrome con `?debug` (pendiente) o mirar `renderer.info.memory` en la consola.

Toda medición nueva se anota en la tabla de §1 con la fecha, para ver si mejoramos.
