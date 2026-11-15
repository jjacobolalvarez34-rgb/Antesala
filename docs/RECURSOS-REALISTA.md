# Recursos para el ultra realista (investigación del 2026-11-13 y 14)

Qué existe para llevar Premium de "se ve chévere" a **ultra realista**, primero sin fotos de ejemplo (la demo) y después con captura real (los clientes). También qué equipo hace falta. Precios y fechas de cuando se investigó: revisarlos antes de comprar.

## 1. Por qué hoy no se ve ultra realista

1. **Lo horneado guarda la luz, pero no los reflejos.** El piso brillante, el vidrio, el metal y los brillos que cambian al moverse se pierden, y son lo que hace que una imagen "parezca foto".
2. **Los muebles los arma el código** (`amoblar.py`), con texturas genéricas en vez de objetos escaneados.
3. **El PC no tiene tarjeta gráfica** (ver §5): Cycles va solo por procesador, y entrenar splats o renderizar en alta calidad no es viable.

## 2. El camino recomendado: splat sintético

La misma técnica que Gaussian Splatting con captura real, pero la "cámara" recorre nuestro modelo de Blender.

- Se renderiza cada habitación desde cientos de puntos con Cycles (con reflejos, vidrio y luz real) y con esas imágenes se entrena un splat. Resultado: se ve como el render y se navega en el navegador, también en celular.
- Es coherente con todo (regla 9): sale del mismo modelo, plano y ventanas.
- **Herramientas:**
  - SplatGen o Splatman, complementos de Blender que ponen las cámaras y exportan el set;
  - Brush para entrenar (gratis, Windows, sin NVIDIA, pero lento sin buena gráfica), o Postshot / LichtFeld en GPU NVIDIA;
  - SuperSplat para limpiar, y SOG/SPZ para comprimir;
  - Spark (World Labs, sobre three.js, lo mismo que usa el visor) para mostrarlo.
- **Necesita GPU:** alquilada (§6) o un PC nuevo (§5).
- **Fuentes:** [AR-GO, splats reales vs sintéticos](https://ar-go.co/blog/real-vs-synthetic-gaussian-splatting/), [Atlux, Unreal → splat para archviz](https://atlux.one/3dgs-archviz), [SplatGen](https://splatgen-landing.shehabmekkyb010.workers.dev/), [Brush](https://radiancefields.com/platforms/brush), [herramientas recomendadas por PlayCanvas](https://developer.playcanvas.com/user-manual/gaussian-splatting/creating/recommended-tools/).

## 3. Recursos encontrados

| Recurso | Qué da | Costo | Uso en Antesala |
|---|---|---|---|
| **Quixel Megascans** (en Fab) | Más de 23.000 objetos y materiales escaneados, usables en Blender y en trabajos comerciales | **Gratis desde el 5 de noviembre de 2026.** Cuenta de Epic; agregar cada recurso a la biblioteca de Fab para que aplique la licencia nueva ([CG Channel](https://www.cgchannel.com/2026/11/epic-has-made-megascans-free-again-for-good-this-time/), [Digital Production](https://digitalproduction.com/2026/11/13/quixel-megascans-free-again/)) | **Sí.** Muebles y materiales de las maquetas. Funciona en el PC actual |
| **Twinmotion** (Epic) | Videos y renders de arquitectura fáciles: cielo, vegetación, clima | Gratis, también comercial, si la empresa factura menos de USD 1 M al año ([Vizbase](https://vizbase.ai/blog/best-twinmotion-alternatives-2026)) | Video cinematográfico del edificio para Premium. Necesita GPU |
| **D5 Render** | Renders muy realistas | Gratis solo personal; Pro USD 360 al año; pide RTX ([ArchiVinci](https://www.archivinci.com/blogs/d5-render-pricing-2026)) | Más adelante |
| **Lumion** | Igual, fuerte en exteriores | USD 1.149 al año ([Maverickframe](https://maverickframe.com/blog/d5-render-vs-lumion/)) | No por ahora |
| **ComfyUI + Flux con ControlNet** | Vuelve "foto" un render sin cambiar la geometría (la bloquea con un mapa de profundidad; ruido bajo, ~0,3) | Gratis, con GPU ([ArchiGenAI](https://archigenai.com/ai-render-enhance-without-hallucination-denoise-controlnet-architects-2026.html), [flujo PH en Civitai](https://civitai.com/models/920108/phs-archviz-x-ai-comfyui-workflow-sdxl-flux), [Flux Depth para interiores](https://ai.archviz.one/interior-design-workflow-with-depth-controlnet-for-flux-1-dev/)) | Fotos de Premium fieles al modelo (mejor que Higgsfield suelto) |
| **World Labs Marble** | Crea un splat a partir de 8 a 16 vistas de un espacio | Unos USD 5 por espacio ([Maverickframe](https://maverickframe.com/blog/world-labs-marble-splats/)) | Plan B del splat sintético |
| **Higgsfield** (web, cuenta Prodigia, plan Ultra) | Fotos y videos con IA desde renders | Sin costo en la web; por la conexión desde Claude (MCP) cobra créditos | Ya en uso para las fotos de Premium |
| **OpenHiggsfield** (varios repos en GitHub) | Solo una interfaz que llama a modelos de IA ajenos con tus propias claves; cada generación se paga ([GitHub](https://github.com/thehiggsfieldai/OpenHiggsfield), [Kensa](https://www.kensa.cc/blog/open-higgsfield-ai)) | — | **No sirve:** no renderiza |
| **Unreal + Pixel Streaming** | 3D de película en el navegador, servido desde la nube | Por minuto de cada visitante: unos USD 800 al mes con 2.000 visitas de 4 min en Eagle 3D ([Eagle 3D](https://www.eagle3dstreaming.com/pricing), [Vagon](https://vagon.io/blog/best-pixel-streaming-platforms)) | **No** para el visor: no cuadra con la mensualidad |
| **Unreal en el navegador** (5.9, WebGPU) | El 3D corre en el equipo del visitante | Experimental (preview del 9 de noviembre de 2026); estable "el próximo año" ([Indie Tooling](https://indietooling.com/posts/unreal-5-9-preview-web-export)) | Volver a mirarlo cuando salga estable |
| **Gaussian Splatting con captura real** | 3D fotográfico grabado con el celular; ya lo usan Zillow y Matterport | Gratis con Brush/SuperSplat; tours de 50 a 200 MB ([Splat Labs](https://www.splatlabs.ai/blog/virtual-tours-real-estate-gaussian-splatting), [SplatMart](https://www.splatmart.com/blog/gaussian-splatting-real-estate)) | Hoteles que ya existen. Prueba en Akuare (`docs/PRUEBA-CAPTURA-AKUARE.md`) |

Pendiente de identificar: un programa que Jacobo vio y recuerda como "rist" (¿Twinmotion, D5, Lumion, Enscape, Corona, Rhino?).

## 4. Qué se puede hacer con el PC actual (sin gastar)

- Visor de splats en el recorrido (Spark), que hace falta también para la prueba de Akuare.
- Script de Blender del splat sintético (cámaras + exportación), probado en baja calidad.
- Megascans en las maquetas (cuando Jacobo tenga cuenta de Epic y los agregue a Fab).
- El horneado actual sigue funcionando (unos 20 min por unidad y 15 por planta).

## 5. El PC de Jacobo (revisado el 2026-11-14)

- **Lenovo ThinkPad T440p** (modelo 20AW0049LM), portátil de 2014.
- **Procesador** Intel i5-4300M, 2 núcleos y 4 hilos. **No viene soldado**: se puede cambiar.
- **Gráfica:** solo la integrada (Intel HD 4600). **No se le puede agregar tarjeta**: no tiene Thunderbolt, y los montajes caseros por la ranura del WiFi son inestables y lentos.
- **RAM:** 12 GB DDR3L a 1600 (8 + 4); máximo 16 GB, 2 ranuras.
- **Discos:** SSD Micron 1100 de 256 GB (SATA) y disco duro Toshiba de 1 TB.

**Mejora barata posible (aproximado, usado; revisar precios en MercadoLibre):**
- **Procesador i7-4710MQ o i7-4800MQ** (4 núcleos): los horneados tardarían más o menos la mitad.
  - Con un procesador de 4 núcleos se recomienda también el disipador de los T440p de 4 núcleos (el de doble núcleo es más chico).
  - Que lo instale un técnico.
- **RAM:** cambiar la de 4 GB por una de 8 GB DDR3L a 1600, para llegar a 16 GB.
- **Total estimado:** 200 a 300 mil pesos. **Ojo:** no da para el splat ni para Twinmotion; para eso hace falta tarjeta gráfica.

**PC nuevo con gráfica:** uno de escritorio usado con NVIDIA (p. ej. una RTX 3060 de 12 GB) anda por encima de 2,5 a 4 millones. Los discos actuales se pueden pasar al nuevo.

## 6. Alquilar una GPU (por si hace falta antes del PC nuevo)

- Una RTX 4090 cuesta entre USD 0,34 y 0,90 la hora en RunPod o Vast.ai, cobrada por minuto, sin mensualidad ([Spheron](https://www.spheron.network/blog/gpu-cloud-pricing-comparison-runpod-vs-vastai-2026/), [SynpixCloud](https://www.synpixcloud.com/blog/vast-ai-vs-runpod-rtx-4090-pricing)).
- La prueba de la Suite 402 (render de cientos de vistas + entrenamiento) costaría unos USD 5 a 10. Claude Code hace todo el proceso.

## 7. Decisión (2026-11-14)

- Jacobo tiene unos 700 mil pesos, de los que también sale la suscripción de Claude.
- No alquila por ahora y va a ahorrar para un PC con gráfica.
- **Mientras tanto se sigue con el PC actual** (§4).
- La mejora del T440p (§5) queda como opción si sobra plata.
