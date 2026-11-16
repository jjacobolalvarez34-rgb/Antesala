# Render realista e hiperrealista — plan para el PC prestado

Guía paso a paso para la sesión de render en el PC con tarjeta gráfica que le prestan a Jacobo. Está escrita para que **cualquiera (Jacobo o Claude en otra sesión, sin el historial de esta conversación)** la siga de principio a fin. Va con `docs/CARGA.md`: todo lo que se renderiza tiene que caber en sus presupuestos.

## Fecha

- **Miércoles 2026-11-18**, si se puede.
- Si no, **el fin de semana del 21–22 de noviembre**. Ese día Jacobo no va a estar: la sesión la lleva su amigo o Claude Code abierto en ese PC, y por eso esta guía tiene que bastar sola (ver §7).

## 0. La idea en una línea

En el T440p de Jacobo (4 núcleos, sin GPU) todo se **prepara y se prueba en baja**. En el PC prestado solo se corren los lotes finales en alta, con `GPU=1 HIPER=1`, y se trae el resultado. Una sesión en ese PC no es para descubrir errores.

## 1. Qué hay hoy (2026-11-16)

| Pieza | Script | Qué sale | Tiempo en el T440p (CPU) |
|---|---|---|---|
| Habitación horneada (3D realista) | `lote.py hotel:unidad` | `media/realista/<plano>.glb` | ~20 min |
| Planta horneada por piso | `lote_plantas.py hotel:piso` | `media/realista/planta-<piso>.glb` | ~9 min |
| Fachada horneada (atlas) | `lote_fachada.py hotel 32` | `media/realista/fachada.glb` | ~1 h |
| Fotos y 360° por espacio | `lote_fotos.py hotel:unidad` | `media/fotos/<plano>/<espacio>-{360,amplia,detalle}.jpg` | 45–100 min por unidad |
| Fotos de la escena (portada, fachada) | `pnpm renders -g <hotel>` | `media/renders/*.jpg` | ~3 min |

Todos registran su resultado en `content/hotels/<hotel>/hotel.json` y dejan su bitácora en `.tmp/realista/lote.log`.

**Hoy es "realista", no "hiperrealista".** Se ve bien (el amigo de Jacobo lo dijo), pero:

- los muebles son cajas con buenos materiales;
- la luz es correcta pero plana;
- hay pocos objetos;
- las muestras son bajas (32–48, con filtro de ruido).

El §4 dice qué falta para el salto.

## 2. Preparar el PC prestado (una vez, ~1 h)

Nada de esto guarda contraseñas ni llaves en el repo.

1. **Programas** (versiones vigentes; verificar antes de instalar):
   - Git;
   - Node 22 y pnpm (`corepack enable`);
   - Python 3.12;
   - Google Chrome;
   - **Blender 5.2.4**, la misma versión: en zip portátil, sin instalar, por ejemplo en `C:\blender-5.2.4`.
   
   Los controladores de la tarjeta deben estar al día (NVIDIA Studio o Game Ready).
2. **El repo:** copiar la carpeta `D:\Repositorios\Antesala` en una USB o un disco, sin `node_modules`, `.next` ni `.tmp`. También sirve `git clone` con la cuenta de Jacobo, iniciando sesión en el navegador y cerrándola al final. Luego:
   ```
   pnpm install
   npx playwright install chromium
   pnpm build
   ```
3. **Texturas de Poly Haven** (CC0, fuera del repo):
   ```
   set POLYHAVEN=C:\assets-polyhaven
   python pipeline/realista/bajar_polyhaven.py
   ```
   O copiar la carpeta `D:\Herramientas\assets-polyhaven` en la USB.
4. **Variables para todos los lotes** (en la misma terminal):
   ```
   set BLENDER=C:\blender-5.2.4\blender.exe
   set POLYHAVEN=C:\assets-polyhaven
   set PYTHONIOENCODING=utf-8
   set GPU=1
   ```
   Si `PLAYWRIGHT_BROWSERS_PATH` no está definida, Playwright usa su carpeta normal.
5. **Prueba de humo** (5 min):
   ```
   python pipeline/realista/lote_plantas.py niebla-alta:1
   ```
   En `.tmp/realista/lote.log` debe salir `listo`. En la salida de Blender debe aparecer `GPU OPTIX …` o `GPU CUDA …`. Si dice "sigue en CPU", revisar los controladores.

## 3. La sesión de render (en este orden)

Primero lo que más se ve en las demos; si el tiempo no alcanza, lo último se hace otro día. Con `HIPER=1` además de `GPU=1`:

| # | Lote | Comando | Estimado con GPU |
|---|---|---|---|
| 1 | Fachadas en atlas | `python pipeline/realista/lote_fachada.py cenit 256` y `… niebla-alta 256` | 10–20 min c/u |
| 2 | Habitaciones de Cénit | `set MUESTRAS=512` y `set RES=2048`, luego `python pipeline/realista/lote.py cenit:301 cenit:302 cenit:303 cenit:304` | 5–10 min c/u |
| 3 | Habitaciones de Niebla Alta | `python pipeline/realista/lote.py niebla-alta:402 niebla-alta:201 niebla-alta:203 niebla-alta:601` | 5–10 min c/u |
| 4 | Plantas | `set MUESTRAS=256` y `set RES=2048`, luego `python pipeline/realista/lote_plantas.py cenit:1 cenit:2 cenit:3 niebla-alta:1 niebla-alta:2 niebla-alta:6` | 3–6 min c/u |
| 5 | Fotos y 360° | `set MUESTRAS=512`, luego `python pipeline/realista/lote_fotos.py cenit:301 cenit:302 cenit:303 cenit:304 niebla-alta:402 niebla-alta:201 niebla-alta:601` | 15–30 min por unidad |
| 6 | Refugios de Frailejón | `python pipeline/realista/lote.py frailejon:encenillo frailejon:laguna frailejon:piedra frailejon:casa` y luego `lote_fotos.py` con los mismos | 5–10 min + 15 min c/u |
| 7 | Fotos de la escena | `pnpm renders -g cenit` (y los demás hoteles) | 3 min c/u |

Notas:

- **`HIPER=1` cambia esto en Blender:**
  - rebotes de luz de 6 a 12;
  - umbral de ruido de 0,04 a 0,01;
  - 360° de 8192 × 4096 (maestro) más una copia de 4096 × 2048 para la web;
  - fotos de 3200 × 2000.
  
  Los maestros (`*-360-master.jpg`) se guardan en `.tmp/realista/`: sirven para impresos y video, **no se suben a la web**.
- **Los tamaños web no cambian** (2048 px por textura; ver `docs/CARGA.md` §4): el salto de calidad viene de la luz y los materiales, no de más píxeles.
- **Los lotes corren contra el build.** No compilar mientras corren.
- Si un lote falla, la bitácora dice en qué paso. Se puede repetir solo esa unidad.

## 4. Qué falta para "hiperrealista" (preparar ANTES, en el T440p)

Las muestras altas quitan el ruido, pero no vuelven real una caja. El salto viene de estas mejoras en `pipeline/realista/amoblar.py` (y en `hornear_edificio.py` para la fachada). Se prueban en baja (`MUESTRAS=16`, `FOTOS=1 SIN_HORNEAR=1`) mirando las fotos de muestra:

1. **Muebles con forma:** modelos CC0 de Poly Haven (sofá, sillas, lámparas, plantas, libros) en vez de cajas, con bordes redondeados (biselado). `bajar_polyhaven.py` ya baja algunos; falta usarlos en `amoblar.py` por tipo de mueble.
2. **Materiales con relieve:** las texturas de Poly Haven completas (color, rugosidad y relieve) a 2K en piso, muros y textiles. Un poco de imperfección: rugosidad variable, polvo, juntas.
3. **Luz de arquitecto:**
   - cielo HDRI real visto por la ventana (no un color);
   - sol que entra con sombra nítida;
   - lámparas cálidas encendidas;
   - exposición de cámara pareja en todas las fotos.
4. **Densidad de objetos:** cojines, mantas, cuadros, libros, vajilla y toallas, sin llenar demasiado.
5. **Cámara:** lente de 24–28 mm a 1,4 m para las fotos, verticales rectas y un poco de profundidad de campo en las de detalle.
6. **Postproducción ligera en Blender:** brillo suave en lo más claro (*glare*) y una curva de color por hotel (Niebla cálido, Cénit neutro, Frailejón frío).

Cada mejora se hace en su propio commit, con una foto de antes y otra de después en la bitácora.

## 5. Volver con el resultado

1. En el PC prestado: `git status` debe mostrar cambios solo en `content/hotels/*/media/` y en `content/hotels/*/hotel.json`.
2. Traerlos con `git push` (con la cuenta de Jacobo, cerrando sesión al final) o copiando esas carpetas en la USB.
3. En el T440p:
   ```
   pnpm build
   pnpm shots
   pnpm perf "/h/cenit/explorar?nivel=premium"
   ```
   Revisar con calma y anotar en `docs/CARGA.md` §1. Mirar las capturas antes de dar nada por bueno.
4. Commit, bitácora y `docs/ESTADO.md`.

## 6. Texturas KTX2 (instalado el 2026-11-16)

KTX-Software 4.4.2 está instalado en este PC (`D:\Herramientas\KTX-Software`), con permiso de Jacobo. En el PC prestado **no hace falta**: allá se renderiza y la compresión se hace aquí después.

Ver `docs/CARGA.md` §5 para cuándo conviene KTX2 y cuándo WebP.

## 7. Si Jacobo no está ese día

Para su amigo o para Claude Code en ese PC:

1. Abrir una terminal en la carpeta del repo y leer `CLAUDE.md`, este archivo y `docs/CARGA.md`.
2. Seguir §2 (preparar) y §3 (lotes en orden).
   - No cambiar código ni contenido: solo correr los lotes.
   - Si un lote falla dos veces, se salta y se anota.
3. Anotar en `.tmp/realista/SESION.md`:
   - qué corrió;
   - cuánto tardó cada lote;
   - qué falló, con el error.
4. Al final, copiar a la USB:
   - `content/hotels/*/media/`;
   - `content/hotels/*/hotel.json`;
   - `.tmp/realista/lote.log`;
   - `.tmp/realista/SESION.md`;
   - los maestros `*-master.jpg`.
5. No subir nada a GitHub desde ese PC sin Jacobo. No dejar sesiones abiertas.

## 8. Si sobra tiempo en el PC prestado

- Un video de vuelo por hotel (cámara de la escena → fachada → piso → habitación) para redes y para la página de Antesala.
- Los 360° de Akuare solo si ya hay permiso del edificio real; si no, nada de Akuare.
