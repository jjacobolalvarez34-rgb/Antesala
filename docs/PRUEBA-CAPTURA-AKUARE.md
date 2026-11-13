# Prueba de captura real en Akuare

**Para qué:** probar con un apartamento de verdad si la captura real funciona antes de vendérsela a un cliente: fotos, 360° y Gaussian Splatting. Hasta hoy, todo el contenido es ilustrativo. Esta prueba dice qué sale bien, cuánto tiempo toma y qué hace falta en el visor.

**Antes de entrar:**
- [ ] Permiso del dueño o de la constructora para grabar y fotografiar el apartamento y para mostrarlo en la demo. Akuare es un edificio real (decisión abierta 4 de ESTADO); sin permiso, el material solo se usa para la prueba interna.
- [ ] Sin personas, objetos personales, documentos ni placas a la vista.
- [ ] Anotar el número del apartamento y su tipo (dos o tres alcobas), para compararlo con el plano de `content/hotels/akuare/plans/`.

## Qué grabar en cada espacio (sala, cocina, alcobas, baño, balcón)

Orden sugerido: primero las fotos, después el 360° y al final el video para el splat. Todo con las luces encendidas y las cortinas abiertas.

### 1. Fotos (sirven para Esencial e Inmersivo)
- Celular en horizontal, a la altura del pecho, con el modo gran angular (0,5×) solo si no deforma mucho.
- 3 fotos por espacio: una general desde la esquina más lejana, una de detalle (acabados, cocina, grifería) y una hacia la ventana.
- Sin flash. El HDR del celular está bien.

### 2. 360° (otro formato, para el modo "mirar alrededor")
- Ideal: una cámara 360 (Insta360 o Ricoh Theta) en trípode, en el centro del espacio, a 1,5 m. Disparar con temporizador y salir del cuarto.
- Sin cámara 360: la app de cámara de Google o una app de panorama 360 del celular. Sale peor (costuras), pero sirve para la prueba.
- Una toma por espacio. El visor ya los muestra (`kind: "pano360"`).

### 3. Video para Gaussian Splatting (el 3D fotográfico)
- Video en 4K si el celular lo permite, en horizontal, con la exposición bloqueada (mantener presionado en la pantalla, en iPhone o Android).
- Caminar despacio por todo el borde del cuarto, apuntando hacia el centro, a dos alturas: una vuelta a la altura del pecho y otra más baja (a la cintura), inclinando un poco hacia arriba.
- Después, unos pasos hacia el centro mirando hacia afuera, a las paredes.
- Unos 1 a 2 minutos por espacio, sin movimientos bruscos y sin pasar rápido frente a las ventanas (se queman).
- Un video por espacio, y uno extra que pase de un espacio al siguiente (sala → pasillo → alcoba), para probar si se pueden unir.

## Qué hacemos con eso (Claude Code)

1. **Fotos y 360°:** entran al contenido de Akuare con `fidelity: "exacta"` en ese apartamento. Revisión de coherencia con el plano (regla 9): ventanas, puertas, medidas.
2. **Splat:** procesar los videos (Postshot o KIRI en el PC, o un servicio en la nube); limpiar en SuperSplat; comprimir a SOG/SPZ.
3. **Visor:** hoy no muestra splats (el tipo `splat` existe en el contenido, pero no hay visor). Hay que agregar un visor de splat por espacio, cargado solo al entrar a ese espacio, con un presupuesto de peso por espacio.
4. **Medir:** peso por espacio, tiempo de carga y FPS en el celular de Jacobo; tiempo total de grabación y de procesamiento por apartamento (para el precio).

## Qué se decide después
- Si el splat se ve bien en el celular, ¿es parte de Premium para hoteles que ya existen, en vez del 3D horneado o además de él?
- ¿El 360° basta para Esencial o se exige la cámara 360?
- Cuánto cuesta en horas una captura por unidad tipo: eso define el precio de implementación.
