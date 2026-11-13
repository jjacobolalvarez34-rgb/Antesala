# Plan — 3D realista (nivel Premium)

Hacer que el edificio 3D se vea realista **sin cambiar entre 3D y foto**: el mismo modelo interactivo (abrir pisos, tocar habitaciones, entrar) con luz y materiales de fotografía. Es la condición para vender Premium (D-074).

## Por qué este camino

| Opción | Interactivo | Realista | Problema |
|---|---|---|---|
| 3D de hoy (three.js, materiales por código) | Sí | No | Se ve maqueta o caricatura |
| Fotos encima del 3D cuando la cámara se detiene | Sí | Solo quieto | Cambia entre 3D y foto: Jacobo lo descartó |
| Gaussian splat (3D desde muchas fotos) | Solo mirar | Sí | No se pueden abrir pisos ni tocar unidades |
| 3D desde una imagen (Higgsfield `generate_3d`) | No | Medio | Un bloque sin pisos ni unidades |
| **Iluminación horneada en Blender** | **Sí** | **Sí** | Trabajo de varias sesiones; Blender en D: |

**Iluminación horneada:** en Blender se le ponen al modelo materiales reales (texturas CC0 de ladrillo, concreto, madera y vidrio de ambientCG o Poly Haven) y luz de cielo real (HDRI). Con el motor Cycles se calcula la luz como en una foto: rebotes, sombras suaves y oclusión. Esa luz se **graba en texturas** y el resultado se exporta como GLB. El navegador solo dibuja texturas, así que es liviano en celular y se ve como un render. Es como se hacen los recorridos de arquitectura web que parecen foto.

Higgsfield "use Blender" (`/use-blender`) es un MCP local para manejar Blender desde Claude Code. El render lo hace Blender en el PC: es gratis y no gasta créditos.

## Pasos

1. **Instalar Blender en D:** (versión portable, la estable vigente) y el MCP `higgsfield-use-blender`. Verificar versiones antes de instalar.
2. **Exportar el 3D actual a GLB:** el edificio por pisos (cada piso, un objeto) y las maquetas de unidad con `GLTFExporter` desde el visor. Los ids de pisos y unidades se conservan para los clics.
3. **En Blender (script `bpy` en el repo, `pipeline/blender/`):**
   - Materiales PBR por tipo: ladrillo, estuco, concreto, vidrio, madera, baldosa, tela.
   - HDRI de cielo nublado bogotano para el día y uno de noche con luces interiores.
   - Horneado de luz (lightmaps) por piso y por unidad, a 2K en celular y 4K en escritorio.
   - **360° fotográficos** de cada espacio: cámara panorámica en Cycles, desde el mismo modelo. Resuelve el 360° realista.
   - Export a GLB (Draco y texturas KTX2) a `content/hotels/<slug>/media/realista/`.
4. **En el visor:** con el nivel Premium se cargan los GLB horneados en lugar del edificio por código. Los pisos se abren igual y los clics usan las mismas mallas invisibles. Inmersivo sigue con el 3D de hoy.
5. **Presupuesto:** medir peso y FPS con `ARQUITECTURA.md` §8 en el celular de Jacobo.

## Orden sugerido

1. Prueba con **una unidad** (Suite 402): horneado más un 360° de la sala. Se mira con Jacobo.
2. Si convence: el edificio de Niebla Alta (fachada y pisos, de día).
3. La noche, Akuare y el pipeline automático para hoteles nuevos.

## Prueba 1 (2026-11-12): Suite 402

- Blender 5.2.4 LTS portable en `D:\Herramientas/blender-5.2.4-windows-x64` (es decir, `D:/Herramientas/blender-5.2.4-windows-x64`).
- El visor exporta la maqueta con `?export=1` (`pipeline/realista/exportar.spec.ts`). Luego `pipeline/realista/hornear.py` le pone materiales, luz (el HDRI del visor y un sol), saca un render de muestra, hornea un mapa de luz de 2K y exporta GLB (485 KB).
- **Tiempo en el PC de Jacobo** (i5-4300M, 2 núcleos, gráficos integrados): 1,5 min de render de muestra y 4 min de horneado, con 48 muestras.
- **Resultado:** `docs/estado/realista-prueba-1.jpg`. El proceso funciona, pero **todavía no se ve realista**, por tres cosas:
  1. **Muebles:** son cajas sacadas del plano (sofá, cama y mesa como bloques). Ningún render hace realista una caja.
  2. **Materiales:** la veta de madera procedural salió como rayas de cebra (escala errada) y los muros blancos se queman.
  3. **Contexto:** losa negra y fondo azul liso.
- **Lo que sigue:**
  - Cambiar cada mueble del plano por un **modelo 3D real CC0** (Poly Haven: sofás, camas, sillas, mesas, lámparas, plantas), escalado a su caja.
  - **Texturas fotográficas CC0** (piso de madera, pañete, baldosa) en lugar de procedurales.
  - Corregir la exposición.
  - Después, hornear otra vez y comparar.

## Prueba 3 (2026-11-12): Suite 402 amoblada, en el visor

- `pipeline/realista/amoblar.py` reemplaza cada mueble del plano por un mueble moderno armado en Blender o un modelo CC0 de Poly Haven (plantas y poltrona). Usa texturas fotográficas CC0 (`bajar_polyhaven.py`, en `D:/Herramientas/assets-polyhaven`).
- Las texturas de tela se pasan a gris antes de teñirlas: venían con su propio color y salían azules o rojas.
- Tiempo en el PC de Jacobo: 2 renders de muestra en ~10 min y horneado de 2K en ~11 min. El GLB pesa 8,8 MB y queda en **1,3 MB** con `gltf-transform optimize` (Draco y texturas WebP).
- Renders: `docs/estado/realista-prueba-3.jpg` y `realista-prueba-3-sala.jpg`.
- **En el visor:** `Unit.realista` (en `hotel.json`; 402 y 502) carga el GLB en la maqueta de la unidad. La maqueta por código se apaga del todo; sus pisos quedan invisibles para recibir el mouse, con un velo cálido en la habitación.
- **Lo que falta pulir:**
  - Hay zonas que se ven más oscuras que en el render.
  - El velo al pasar el mouse es suave.
  - Las esquinas negras de los muros.
  - Más decoración: cortinas, cuadros, cojines.

## Lo que queda listo de antes

- Las fotos de Higgsfield (`media/premium/`, marcadas `tier: "premium"`) sirven como galería y portada del nivel Premium mientras tanto.
- El selector "Ver como: Esencial · Inmersivo · Premium" se construye cuando exista el 3D realista. Antes de eso, dos de los tres niveles se verían casi iguales.
