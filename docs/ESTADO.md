# Antesala — estado del proyecto

Resumen para tomar decisiones: qué está hecho, cómo funciona cada página, qué se decidió en lo comercial y qué falta decidir. Es un documento vivo: se actualiza al final de cada sesión de trabajo. El detalle técnico vive en los demás documentos de `docs/`.

**Actualizado:** 2026-11-25
**Sitio publicado:** https://antesala-mauve.vercel.app (cada cambio que se sube a `main` se publica solo)

---

## 1. Qué es

Antesala es una plataforma B2B que deja al cliente final recorrer un edificio antes de reservar o comprar: el edificio en 3D, el piso, la unidad exacta, cada espacio en 360° o en foto, y el botón de reservar o agendar visita. Es un producto de **MamutHerd S.A.S.** (firma pública: "Un producto de Mamut Herd").

**Tres mercados:**
1. **Hoteles boutique y apartahoteles:** reserva directa sin comisión de Booking (~15 %) y cobro extra por la unidad exacta (piso alto, vista).
2. **Constructoras con proyectos sobre planos:** sala de ventas en el celular del comprador, con los apartamentos vendidos marcados. Es el mercado que hoy paga por esto: el referente es Urbania, con la constructora PROACO.
3. **Página web para quien no la tiene:** se vende sola, más barata, y es la puerta de entrada para luego sumar el recorrido.

**Fase actual:** demo de venta (Fase 0). Todavía no hay clientes ni ventas.

---

## 2. La página de Antesala (la del producto)

Es la página principal (`/`). Le habla de "usted" al dueño del hotel. Tiene la identidad de Antesala: azul noche, marfil y champán; tipografías Cinzel, Cormorant y Jost; logo de la "ranura de luz".

**Orden de las secciones, de arriba hacia abajo:**

1. **Intro** (unos 3 s, una vez por sesión, con botón "Saltar"). Los pilares del logo suben, la ranura de luz se abre y la cámara cae sobre el edificio.
2. **Barra superior.** Logo y menú (Recorrido, Demos, Precios, Mamut Herd), con el botón de modo "Cine / Ligero" y "Cotizar". Es transparente arriba del todo y sólida al bajar.
3. **Recorrido** (el corazón de la página). Fondo fijo y seis pasos que pasan con el scroll:
   - Hero: "Su hotel, antes de llegar."
   - 01 El edificio: el 3D completo.
   - 02 Su piso: el piso se separa.
   - 03 La unidad exacta.
   - 04 El plano: el plano de la Suite 502 sobre papel, con los espacios tocables.
   - 05 Cada espacio: mosaico con dormitorio, baño, sala, balcón y cocina.
   - 06 La reserva: tarjeta con tarifa base, extra por piso alto y botón (en la demo abre un aviso de "esto es una demo").
   - Cada paso dice "El huésped ve" y "Su hotel resuelve".
4. **Demos: "Pruébelo usted".** Cuatro tarjetas:
   - **Niebla Alta** (hotel ficticio): su planta del piso 5 con habitaciones libres y ocupadas.
   - **Akuare** (edificio real de Suba, en venta): su fachada dibujada con los apartamentos vendidos rayados.
   - **Frailejón (glamping):** 4 refugios en un valle de páramo, con el mapa real del terreno en la tarjeta.
   - **"Su hotel aquí"**, que lleva a cotizar.
5. **Para su hotel: "Lo que una galería no alcanza a explicar".** Tres beneficios (más reserva directa, categorías que se entienden, la unidad exacta), el bloque "¿Su hotel no tiene página web? Se la hacemos" y una calculadora de comisión ahorrada.
6. **Cómo trabajamos: "De su edificio a su recorrido".** Cinco pasos: diagnóstico, captura, producción, revisión y publicación, mantenimiento. También la lista de lo que necesitamos del hotel.
7. **Precios.** Ver la sección 5.
8. **Mamut Herd: "Hecho por Mamut Herd".** Quién lo hace (Jacobo López, Bogotá).
9. **Preguntas frecuentes.**
10. **Cotización.** Formulario sin servidor que arma el mensaje y lo abre en WhatsApp o en el correo, o lo copia.
11. **Pie.**

**Efectos:** las secciones aparecen con un fundido al entrar a la pantalla. En el recorrido, el mosaico de espacios entra foto por foto y la tarjeta de reserva aparece renglón por renglón.

**Dos modos:**
- **Cine** (por defecto): 3D y video.
- **Ligero**: sin 3D ni video. Plano sobre papel, fotos y trazos que se dibujan, menos movimiento.

El modo ligero se activa solo con datos ahorrados, conexión 2G o 3G o celulares con poca memoria, y se puede cambiar con el botón.

**Las fotos de Higgsfield de esta página** (las de la Suite 502 en el recorrido) son ejemplos de producción visual. La sección de video "Así se entra" se quitó (D-073).

---

## 3. Las demos (la página del hotel)

Cada hotel es una carpeta de contenido. Un hotel nuevo no requiere código nuevo. Las páginas del hotel usan la marca del hotel y le hablan de "tú" al huésped. Arriba llevan una banda de demo con el símbolo de Antesala y la flecha para volver a la página principal.

**Recorrido del huésped (cada paso tiene su propia dirección y se puede compartir):**

| Página | Dirección | Qué contiene |
|---|---|---|
| Portada | `/h/<hotel>` | Hace de **sitio web completo**: foto de portada (en Niebla Alta, la fachada fotográfica hecha con Higgsfield desde su 3D) con **puntos tocables** (terraza, suites, lobby) que llevan al piso o a la unidad; presentación y datos clave; "Elige tu habitación viéndola"; habitaciones por categoría con precio; zonas comunes y servicios; ubicación y políticas; preguntas; reserva directa por WhatsApp. |
| Edificio | `/h/<hotel>/explorar` | El edificio en 3D con su barrio, día y noche, cuatro fachadas, selector de pisos y una guía de 3 pasos para quien entra por primera vez. Mientras carga, un telón con el nombre del hotel. |
| Piso | `/h/<hotel>/piso/<n>` | El piso sale del edificio como un cajón y se ve la planta amoblada. Al pasar el mouse, **una luz cálida se enciende solo sobre esa habitación**, con su nombre y precio; al tocarla brilla un momento y entra. Sin 3D, la planta en 2D con cada unidad **en verde (libre) o terracota (ocupada o vendida)**, con leyenda. |
| Unidad | `/h/<hotel>/unidad/<id>` | La maqueta de la unidad amoblada y sin techo, su ficha (área, capacidad, precio), "Elige tu unidad exacta" (la misma unidad en otros pisos, con el extra por vista) y "Ver la vista desde la ventana". |
| Espacio | `/h/<hotel>/unidad/<id>/<espacio>` | La **foto del espacio se puede mirar**: arrastrar o inclinar el celular mueve la cámara (no es 360°). Además, el 360° o la maqueta. En maqueta, **los demás espacios se hunden en el piso** y solo queda el elegido. |
| Vista guiada | `/h/<hotel>/guiada` | **Nueva (D-095, D-096), por ahora solo en Cénit. A pantalla completa, de día y de noche; Reservar aparece al abrir una habitación.** El recorrido "como un video" de las inmobiliarias, sin 3D en vivo: la cámara sube desde la calle hasta la torre (video); los pisos se iluminan de arriba hacia abajo; al tocar uno, el edificio se acerca y desaparece, y **la planta de ese piso sola** entra girando con sus unidades en verde o terracota; al tocar una unidad, la planta se acerca y se abre su ficha con plano, fotos y 360°. Atrás devuelve al edificio con la animación al revés. Son imágenes de nuestro propio 3D: no se traba en ningún celular. Botón "Vista guiada" en la portada. |
| Lista | `/h/<hotel>/lista` | Todo sin 3D: pisos, unidades, planos y fotos. Es el respaldo para celulares sin 3D. |
| Comparar | `/h/<hotel>/comparar` | Las categorías lado a lado. |
| Panel | `/h/<hotel>/panel` | Métricas **simuladas** para el gerente: visitas, unidades más vistas, clics a reservar y comisión ahorrada. |

**La barra de reserva** siempre está visible. En celular va abajo y centrada; en computador, en la esquina inferior derecha. Dice "Reservar" o "Agendar visita" según el tipo de oferta (noche, mes o venta). En una unidad ocupada ofrece la alternativa libre más parecida.

**Las dos demos:**
- **Niebla Alta.** Apartahotel ficticio en Chapinero Alto: 6 pisos, 21 unidades (estudios, suites con balcón y un penthouse), lobby, cowork y terraza. Edificio de ladrillo hecho por código. **Fotos de nivel profesional** de cada espacio, el lobby, el cowork, la terraza y la fachada, hechas con Higgsfield desde los renders de su propio 3D (coinciden con la maqueta). Algunas unidades salen ocupadas a propósito.
- **Akuare.** Edificio real en Suba Salitre, armado con datos públicos del catastro de Bogotá y OpenStreetMap: dos torres de 5 pisos y 35 apartamentos en venta (12 vendidos). El primer piso es residencial (garajes, local y puerta pequeña), como en la fachada real, con cubierta plana. Interiores con fotos de Higgsfield desde su 3D; la fachada sigue siendo el render, a la espera de fotos de Jacobo desde la calle. Lleva la nota "Demostración no oficial".

---

## 4. Cómo está hecho (lo justo para decidir)

- **Tecnología:** Next.js (React), 3D con three.js, animación con GSAP. Contenido en archivos JSON y planos SVG por hotel.
- **Publicación:** Vercel (plan gratis Hobby; **no permite uso comercial**: hay que pasar a Pro, unos USD 20 al mes, antes del primer cliente). Los archivos pesados (videos, 360° en alta) deben ir a Cloudflare R2 cuando haya un cliente.
- **Rendimiento** (Lighthouse en celular, 2026-11-11): portada de Niebla Alta 78, de Akuare 70, edificio 3D 60, accesibilidad 100. Después se hicieron más mejoras de fluidez; falta medir en el celular de Jacobo.
- **Movimiento:** las animaciones se ven aunque Windows tenga los "efectos de animación" apagados. Antes el sitio se veía a saltos en esos equipos. Quien quiera menos movimiento usa el modo ligero.
- **Transparencia:** todo medio de las demos dice "ilustrativa" y la banda de hotel ficticio o demostración no oficial siempre se ve. Nunca se usan fotos de hoteles reales.

---

## 5. Decisiones comerciales

**Paquetes** (valores de referencia en COP; cada propuesta los confirma, con o sin IVA):

| Paquete | Incluye | Ejemplo en la página | Implementación | Mensualidad |
|---|---|---|---|---|
| **Esencial** | Fotos y 360° de cada espacio, botón de reserva o WhatsApp. Sin 3D. | Lista de Niebla Alta | $5 – 9 M | $250 – 400 mil |
| **Inmersivo** (recomendado para empezar) | Edificio 3D con su barrio, pisos y habitaciones que se tocan, planos y maqueta amoblada. Todo Esencial. | Niebla Alta en 3D | $12 – 22 M | $450 – 850 mil |
| **Premium** | 3D hiperrealista (edificio, pisos y habitaciones), fotos profesionales de cada espacio, portada con puntos tocables. Todo Inmersivo. | Niebla Alta en Premium: 3D realista horneado (edificio, pisos abiertos, habitaciones y 360°) | $25 – 45 M | $0,9 – 1,5 M |
| **A la medida** | Varias sedes o cadenas | — | Se cotiza | Se cotiza |

- **Piloto sugerido:** $12 – 15 M con alcance limitado.
- **Forma de pago:** 40 % al aprobar, 40 % con la versión de prueba y 20 % al publicar.
- **La mensualidad incluye:** alojamiento, CDN y transferencia dentro del tope del plan, mantenimiento, copias de seguridad, soporte, panel y analítica básica.
- **Se cotiza aparte:**
  - la página web sola;
  - fotografía o 360° extra y dron;
  - modelado de áreas nuevas y nuevas unidades o sedes;
  - traducción;
  - integración con motor de reservas o PMS;
  - desplazamientos fuera de Bogotá.
- **Dominio:** siempre del cliente. Nunca se le pide la contraseña: se le manda un solo registro CNAME.
- **Si el cliente se va:** se le entrega todo su contenido y un sitio estático en 15 días hábiles. El código del visor es de MamutHerd y se licencia mientras dure el contrato.
- **Argumento de venta:** la reserva directa ahorra la comisión de las plataformas y la unidad exacta se puede cobrar más cara. No es solo "se ve bonito".
- **Prospectos verificados por internet:**
  - **Apartasuite Edificio Monir:** 23 suites, vende solo por plataformas y no tiene página propia.
  - **Nico Aparta-Suites:** sitio propio con motor Mirai. Antesala se le suma y no lo reemplaza.
  - **KingDome Glamping:** la variante glamping ya existe (demo Frailejón). Se le puede escribir con el demo.
- **Guion de venta:** 3 minutos con la demo en el celular, y mensajes de primer contacto para los tres mercados (`docs/VENTA.md`).

---

## 6. Qué está en curso

- **Hecho el 2026-11-26:**
  - "Recorrido 3D" pregunta modo guiado o libre, y se cambia entre los dos sin perder el lugar (D-097);
  - Niebla Alta ya tiene vista guiada;
  - la ciudad del 3D va en segundo plano y más organizada;
  - cambiar de idioma ya no recarga el 3D (D-098);
  - hay un agente documentado para producir lugares nuevos (`docs/PRODUCCION.md`), incluidos otros tipos de espacio como gimnasios: para esos falta decidir la oferta y los muebles.

- **Hecho el 2026-11-25: vista guiada para Cénit (D-095).** Es lo que Jacobo pidió, con lo que hay y sin fotos nuevas. Es el primer paso de la decisión abierta 16: el visor ya está, y cuando haya renders fotorrealistas solo se cambian las imágenes. Además:
  - la vista guiada va a pantalla completa, de día y de noche, con un brillo verde o terracota sobre cada habitación, la planta arrastrable y Reservar solo con una habitación abierta (D-096);
  - en la página de Antesala, las tarjetas de Niebla Alta y Cénit muestran foto del hotel y, al pasar, una de adentro (Frailejón sigue con su mapa; propuesta: hacerle foto con Higgsfield);
  - el giro entre fachadas del 3D es más rápido (1,2 s por cuarto de vuelta);
  - el encabezado del hotel pasó a oscuro;
  - la guía grande del 3D quedó como una píldora pequeña.

- **Hecho el 2026-11-16 en la noche: Cénit Premium pasó de 2 a 34 cuadros por segundo** en el celular simulado (de 7,3 a 3,1 MB). Hubo tres arreglos:
  - la fachada en un solo atlas (de 30 texturas a 2);
  - las texturas en KTX2, que ocupan unas 8 veces menos memoria de video y pesan igual o menos;
  - la carga por tandas.

  Además, con las notas del papá de Jacobo:
  - **Volver:** la flecha junto a "Reservar" funciona (antes no respondía).
  - **Letreros por apartamento:** al abrir un piso, cada apartamento tiene su número con un punto verde o terracota. El primer toque muestra el precio; el segundo entra.
  - **Habitación sin congelarse:** se prepara escondida desde el primer toque, para que el vuelo no se congele.
  - **Panel del espacio:** más simple, con los espacios en una fila y "Fotos y detalles".
  - **Página de Antesala en celular:** el menú cabe y el recorrido va ordenado.
  - **Pendiente:** el rediseño de la página de Antesala con estética propia, que no se vea "hecha con IA".
- **Hecho el 2026-11-16: rendimiento en celular (D-087) y plan de render (D-088).**
  - **El problema:** en el celular de Jacobo, Cénit Premium iba "muy lento" (2 cuadros por segundo medidos). La fachada realista ocupaba ~420 MB de memoria de video y las plantas de los 13 pisos iguales se cargaban al llegar.
  - **El arreglo:** una fachada en un solo atlas; cada planta se carga al abrir su piso; cielo liviano en celular; la resolución ya no se queda baja para siempre (el "se ve pixelado"); sin botón "Entrar" en el telón. El orden de carga está en `docs/CARGA.md`.
  - **En las demos:** la primera vista es una panorámica en 3/4, las zonas comunes van en un solo punto con su lista, los espacios largos tienen dos puntos de 360° y se gira con más sensibilidad.
  - **Página de Antesala:** Cénit tiene su tarjeta, y el plano pregunta antes de llevar a las demos.
  - **Render hiperrealista:** el plan para el día en el PC prestado está en `docs/RENDER.md` (qué renderizar, en qué orden, con qué ajustes y qué falta para el salto a hiperrealista). Los scripts ya usan la tarjeta gráfica.
  - **Pendiente:** revisar todo el sitio en el celular (se ve cortado en varias partes) y un entorno que parezca un lugar real.

- **Hecho hoy:**
  - 30 fotos de nivel profesional generadas en la web de Higgsfield, sin costo con el plan Ultra, desde los renders del 3D.
  - Están en la portada de Niebla Alta y en cada espacio, y se pueden "mirar" moviendo la cámara.
  - Por la conexión directa desde Claude (MCP), Higgsfield cobra créditos (unos 2 por imagen y 12,5 por video); por eso las imágenes se generan en la web (D-070).
- **Lo que Jacobo pide para Premium y aún no existe:** que **el edificio 3D se vea realista**, sin cambiar entre 3D y foto (D-074). El camino elegido:
  - **Blender** en el PC (gratis), manejado desde Claude Code con el conector "use Blender" de Higgsfield.
  - Materiales reales y luz de cielo **horneada** en el modelo: el mismo 3D interactivo se ve como render. Además da **360° fotográficos** de cada espacio.
  - Prueba primero con la Suite 402. Plan en `docs/PLAN-REALISTA.md`.
- **Hecho esta noche (D-074, D-075):** el **3D realista ya existe** en Niebla Alta. El estudio, la suite y el penthouse están amoblados, y la fachada horneada en Blender por piso. Todo se ve en Premium y sigue siendo interactivo.
- **Selector "Ver como: Esencial · Inmersivo · Premium"** en la banda de las demos. Los "Ver ejemplo" de los precios abren cada nivel.
- **Hecho esta mañana (D-076): Premium completo en Niebla Alta.**
  - **Pisos abiertos realistas:** las plantas de los pisos también se hornearon (lobby, piso tipo y penthouse). La disponibilidad se sigue leyendo (velo gris en las ocupadas) y la luz cálida al pasar el mouse sigue igual.
  - **El 360° ya no se rompe:** la cámara se para en el punto más despejado del cuarto. En el dormitorio en L del penthouse quedaba entre muros.
  - **Del piso a la habitación sin cortes:** la planta se desvanece al ritmo del edificio y la habitación realista entra directo, precargada.
  - **Entorno apagado:** en Premium los edificios vecinos pierden el color para que el hotel sea el protagonista.
  - **Costo de producción medido:** unos 15 min de Blender por planta de piso y unos 20 por unidad tipo, en el PC de Jacobo. Niebla Alta completa (3 unidades tipo, 3 plantas y la fachada) es unas 3 horas de máquina, casi sin trabajo manual.
- **Hecho al mediodía (D-077 a D-080):**
  - **Ventanas coherentes:** la fachada y los planos cuentan las mismas ventanas, y el build lo valida. Es la regla 9 del proyecto, para no tener sorpresas con clientes.
  - **La portada del hotel parece la web de un hotel real:** consulta de fechas, habitaciones, zonas comunes, ubicación, preguntas y pie, con un botón de reservar sobrio.
  - **Intro del hotel más elegante** y suelo de la calle en concreto gris.
  - **Página de Antesala:** tema oscuro, maqueta en el paso 3 y calculadora más simple.
- **Hecho el 2026-11-14/15 (D-081, D-082):**
  - **Akuare tiene su Premium realista:** fachada horneada, plantas del piso 1 y del piso tipo, y los apartamentos de dos y tres alcobas.
  - **El primer piso de Akuare es como el real:** sin apartamentos, con la entrada angosta, el local, el salón comunal, el pasillo y los parqueaderos. Quedan 32 apartamentos.
  - **Arreglado el cambio de Inmersivo a Premium de noche.**
  - **Visor de splats listo** para la prueba de captura real.
- **Hecho el 2026-11-15 (D-083): tercer demo, el glamping *Frailejón*.**
  - Cuatro refugios sueltos en un valle de páramo: madera, vidrio con tina, piedra y una casa familiar.
  - La cámara baja desde el cielo a través de la niebla.
  - Cada refugio tiene un letrero delgado colgado de una línea fina; al pasar el mouse se abre con el precio.
  - Panel con los refugios, "El valle" y "Vista aérea", día y noche.
  - Al entrar a un refugio, el techo se levanta y queda la maqueta por dentro.
  - El exterior de cada refugio sale de su plano, así que afuera y adentro coinciden.
- **Hecho el 2026-11-15 en la noche (D-084 a D-086):**
  - **Cuarto demo: Hotel Cénit.** Torre de lujo de 15 pisos y 52 habitaciones junto al Parque de la 93, con fachada moderna de vidrio de piso a techo, spa y bar. Muestra cómo se ve un hotel grande.
  - **Los pisos se eligen en el mismo modelo:** cada número va pegado al costado del edificio con una línea fina. Al pasar el mouse dice cuántas habitaciones quedan libres.
  - **Cada hotel tiene su propia identidad en la web:** esquinas de los botones, portada y nombre. Hay además una franja de "reserva directa" con los beneficios de reservar con el hotel.
  - **Fotos y 360° de cada espacio**, renderizados desde la maqueta amoblada. En un hotel real se toman con una cámara 360.
  - **Las demos abren en otra pestaña.**
- **Akuare:** la fachada fotográfica espera fotos de Jacobo desde la calle (no Google Maps ni Street View: sus términos lo prohíben).

---

## 7. Decisiones abiertas (para decidir)

1. **Precio de la página web sola.** Debe quedar claramente por debajo del piloto con 3D.
2. **Mensualidad y tope de transferencia** por paquete.
3. **Qué es Premium exactamente y cuánto cuesta producirlo.** Hoy: el 3D realista horneado en Blender (D-074, D-076), las fotos profesionales y la portada con puntos. Producirlo cuesta unas 3 horas de máquina por hotel como Niebla Alta. Para un hotel real, ¿fotografía real, renders con IA desde su 3D o ambos? En un hotel que ya existe, las imágenes con IA pueden no coincidir con lo real. Para constructoras sobre planos sí encajan, porque no hay edificio que fotografiar. Cuántas horas de Blender por hotel define el precio.
4. **Akuare como demo:** es un edificio real, mostrado sin permiso de la constructora y marcado "no oficial". ¿Se mantiene así, se le ofrece a la constructora o se reemplaza por un proyecto ficticio de constructora?
5. **Primeros contactos:** confirmar Monir y Nico por teléfono; armar la lista de 5 constructoras con proyectos sobre planos en Bogotá.
6. **Formalidades:**
   - pasar Vercel a Pro antes de la primera factura;
   - revisión legal del contrato (licencia del visor y transferencia);
   - verificar la marca en la SIC (clases 42 y 35), los dominios e Instagram.
7. **Glamping (KingDome):** la variante ya está hecha (D-083). ¿Se le escribe ya con el demo? Sus unidades son domos: haría falta el techo curvo.
8. **Trato en la web de Antesala:** hoy es de "usted" (dueños de hotel) y las páginas de los hoteles son de "tú" (huésped). ¿Se mantiene así?
9. **¿Premium ya se puede vender?** En Niebla Alta ya se ve completo. Falta Akuare (constructoras) y un horneado nocturno propio. ¿Se sale a vender ya con los tres niveles?
10. **Render realista "con engine" (investigado 2026-11-13).** Unreal con Pixel Streaming se ve como película, pero cobra por minuto de cada visitante (unos USD 800 al mes con 2.000 visitas de 4 minutos en Eagle 3D), depende de la señal y no cuadra con la mensualidad. Unreal directo en el navegador (5.9, WebGPU) todavía es experimental. Propuesta: no cambiar el visor; usar Unreal o Twinmotion para videos y renders de Premium; volver a mirarlo cuando salga estable.
11. **Gaussian Splatting para hoteles reales.** Es un 3D fotográfico grabado con el celular, que ya usan Zillow y Matterport. **Prueba acordada:** Jacobo graba un apartamento de Akuare (fotos, 360° y video), y se mide cómo sale, cuánto pesa y cuánto tiempo toma (`docs/PRUEBA-CAPTURA-AKUARE.md`). Es el primer intento de captura real del producto. Hay que pedir permiso antes de entrar.
12. **Equipo para el ultra realista (2026-11-14).** El PC de Jacobo (ThinkPad T440p, 2014) no tiene tarjeta gráfica y no se le puede poner. El ultra realista (splat sintético, Twinmotion, renders pesados) necesita una NVIDIA: un PC usado con RTX 3060, de 2,5 a 4 millones, o alquilarla por horas (USD 0,34 a 0,90 la hora). Por ahora no se compra ni se alquila: se ahorra. Detalle y recursos en `docs/RECURSOS-REALISTA.md`.
13. **Idea nueva de mercado: finca raíz (Jacobo, 2026-11-15).** Además de hoteles y constructoras, vender Antesala a quien vende o arrienda inmuebles: inmobiliarias, agentes de finca raíz y dueños que publican en Finca Raíz, Metrocuadrado o Ciencuadras. Para planear:
    - **Qué se les vende:** la unidad exacta en 3D, con su plano, fotos, 360° y la vista desde la ventana, para publicar con un enlace o un código QR en el aviso. Y para proyectos sobre planos, el edificio entero con lo disponible y lo vendido (la demo de constructora).
    - **Por qué les sirve:** el aviso se diferencia de los demás, filtra visitas que no van a comprar (el cliente ya vio el plano y la vista) y sirve para vender sobre planos, cuando todavía no hay nada que mostrar.
    - **Preguntas para la estrategia:**
      - ¿Precio por inmueble publicado (pago único) o mensualidad por cartera?
      - ¿Paquete "un apartamento" barato (plano, fotos y 360°, sin edificio 3D) para agentes sueltos?
      - ¿Alianza con una inmobiliaria mediana como primer cliente?
      - ¿Captura con cámara 360 hecha por nosotros o por el agente?
    - **Legal:** con un edificio real hace falta el permiso del dueño o de la constructora. Por eso la demo de constructora nueva es ficticia, y Akuare (real, "no oficial") queda solo como prueba interna.

- **14. ~~Instalar KTX-Software~~:** aprobado e instalado el 2026-11-16 (4.4.2, en `D:\Herramientas\KTX-Software`).
- **15. Día de render en el PC prestado:** miércoles 2026-11-18 si se puede; si no, el fin de semana del 21–22 (sin Jacobo: la guía `docs/RENDER.md` §7 lo cubre). Antes conviene hacer las mejoras de `docs/RENDER.md` §4 (muebles con forma, materiales con relieve, luz de arquitecto), para que esa sesión no se gaste descubriendo errores.

- **16. ¿Un modo "fotorrealista guiado" para Premium, como el de las inmobiliarias?** (idea de Jacobo, 2026-11-25)
  - **Lo que hacen ellas:** no es 3D en vivo. Son imágenes o video **prerenderizados** (V-Ray, Corona, Unreal, D5) desde cámaras fijas, con un recorrido guiado: el edificio de frente, subir al último piso, bajar piso por piso. Encima dibujan las zonas que se pueden tocar (pisos y apartamentos con su disponibilidad). Se ve perfecto en cualquier celular y no permite cámara libre.
  - **Pisos iguales:** existe la "planta tipo" (los pisos del medio repiten la distribución) y eso es lo que permite renderizar una vez. Aun así cambian el primero, los de servicios y los últimos, y en todos cambian la vista, los muebles y la disponibilidad. Antesala ya lo aprovecha (una planta para los pisos 3 a 15 de Cénit; unidades `sameAs`).
  - **Propuesta de Claude:** un modo híbrido para Premium.
    - Vistas y transiciones prerenderizadas (video o secuencia de cuadros), con el 3D actual invisible por debajo para saber qué se toca y pintar la disponibilidad.
    - Al elegir la unidad, lo mismo de hoy: fotos, 360° y plano.
    - Inmersivo sigue siendo el 3D libre, más barato.
  - **IA (Higgsfield, Kling, Veo) para hacer el video desde fotos:** se ve espectacular pero **inventa detalles**, así que con un lugar real choca con la regla 9 (lo que se ve tiene que ser lo que hay). El realismo **fiel** sale de:
    - la captura en sitio (cámara 360° o video convertido en Gaussian Splatting, que el visor ya lee);
    - el render desde planos cuando el edificio aún no existe.

    La IA queda para marketing: video de portada, clips y pulir renders, siempre marcados como ilustrativos.
  - **Comercial:** es el acabado que más se cobra. Encaja sobre todo en la **preventa inmobiliaria** (no hay nada que fotografiar), además de hoteles, coworkings y sitios de eventos.
  - **Avance (2026-11-25):** ya existe la vista guiada con imágenes de nuestro 3D (D-095, `/h/cenit/guiada`). Falta decidir si se pasa a renders fotorrealistas y cómo se cobra.
  - **A decidir:**
    - si se construye el modo guiado prerenderizado (con renders fotorrealistas);
    - con qué motor de render (Blender, que ya está, o D5/Unreal);
    - cuánto cobrarlo frente al Premium actual.

- **17. ¿Antesala para gimnasios (y otros tipos de lugar)?** (idea de Jacobo, 2026-11-26)
  - **Lo que ya sirve:** el modelo de niveles, unidades y espacios cabe en un gimnasio. Las sedes o pisos son niveles; las salas (pesas, cardio, clases, piscina) son unidades; la recepción, los vestieres y la cafetería son lugares comunes. El proceso para producirlo está en `docs/PRODUCCION.md`.
  - **Lo que falta decidir:**
    - qué se "reserva" en un gimnasio: una membresía, una clase de prueba o una visita guiada;
    - cómo se muestra la disponibilidad: horario y aforo por sala, en vez de libre u ocupada;
    - qué muebles nuevos hacen falta en la planta y la maqueta (caminadoras, bicicletas, racks, bancos, colchonetas).
  - **A decidir:** si se abre este segmento; con cuál oferta empezar; si se hace una demo ficticia de gimnasio para venderlo.

---

## 8. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Este resumen | `docs/ESTADO.md` y en PDF con capturas: `docs/estado/Antesala-estado.pdf` |
| Plan del 3D realista | `docs/PLAN-REALISTA.md` |
| Producto, mercados y alcance | `docs/PRODUCTO.md` |
| Guion de venta y mensajes | `docs/VENTA.md` |
| Hosting, dominios y transferencia | `docs/ENTREGA.md` |
| Por qué se decidió cada cosa (D-001 a D-074) | `docs/DECISIONES.md` |
| Tareas hechas y pendientes | `docs/TAREAS.md` |
| Diario de cada sesión | `docs/BITACORA.md` |
| Brief de la página de Antesala | `docs/WEB-ANTESALA.md` |
