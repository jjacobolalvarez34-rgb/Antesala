# Antesala — estado del proyecto

Resumen para tomar decisiones: qué está hecho, cómo funciona cada página, qué se decidió en lo comercial y qué falta decidir. Es un documento vivo: se actualiza al final de cada sesión de trabajo. El detalle técnico vive en los demás documentos de `docs/`.

**Actualizado:** 2026-11-12
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
4. **"Así se entra: de la calle a su suite".** Video que avanza con el scroll en cuatro capítulos (la calle, el lobby, la puerta, la suite) y persigue el scroll con inercia. En modo ligero son fotos con acercamiento lento y trazos de plano.
5. **Demos: "Pruébelo usted".** Cuatro tarjetas:
   - **Niebla Alta** (hotel ficticio): su planta del piso 5 con habitaciones libres y ocupadas.
   - **Akuare** (edificio real de Suba, en venta): su fachada dibujada con los apartamentos vendidos rayados.
   - **Glamping** "Próximamente": mapa de terreno con domos.
   - **"Su hotel aquí"**, que lleva a cotizar.
6. **Para su hotel: "Lo que una galería no alcanza a explicar".** Tres beneficios (más reserva directa, categorías que se entienden, la unidad exacta), el bloque "¿Su hotel no tiene página web? Se la hacemos" y una calculadora de comisión ahorrada.
7. **Cómo trabajamos: "De su edificio a su recorrido".** Cinco pasos: diagnóstico, captura, producción, revisión y publicación, mantenimiento. También la lista de lo que necesitamos del hotel.
8. **Precios.** Ver la sección 5.
9. **Mamut Herd: "Hecho por Mamut Herd".** Quién lo hace (Jacobo López, Bogotá).
10. **Preguntas frecuentes.**
11. **Cotización.** Formulario sin servidor que arma el mensaje y lo abre en WhatsApp o en el correo, o lo copia.
12. **Pie.**

**Efectos:**
- Al bajar rápido, o al saltar desde el menú, se abre una "ranura de luz" cálida (bloom).
- Las secciones aparecen con un fundido al entrar a la pantalla.

**Dos modos:**
- **Cine** (por defecto): 3D y video.
- **Ligero**: sin 3D ni video. Plano sobre papel, fotos y trazos que se dibujan, menos movimiento.

El modo ligero se activa solo con datos ahorrados, conexión 2G o 3G o celulares con poca memoria, y se puede cambiar con el botón.

**Las fotos y videos de Higgsfield son solo de esta página**, como ejemplo de producción visual. No son de Niebla Alta.

---

## 3. Las demos (la página del hotel)

Cada hotel es una carpeta de contenido. Un hotel nuevo no requiere código nuevo. Las páginas del hotel usan la marca del hotel y le hablan de "tú" al huésped. Arriba llevan una banda de demo con el símbolo de Antesala y la flecha para volver a la página principal.

**Recorrido del huésped (cada paso tiene su propia dirección y se puede compartir):**

| Página | Dirección | Qué contiene |
|---|---|---|
| Portada | `/h/<hotel>` | Hace de **sitio web completo**: foto o render de portada con **puntos tocables** (terraza, suites, lobby) que llevan al piso o a la unidad; presentación y datos clave; "Elige tu habitación viéndola"; habitaciones por categoría con precio; zonas comunes y servicios; ubicación y políticas; preguntas; reserva directa por WhatsApp. |
| Edificio | `/h/<hotel>/explorar` | El edificio en 3D con su barrio, día y noche, cuatro fachadas, selector de pisos y una guía de 3 pasos para quien entra por primera vez. Mientras carga, un telón con el nombre del hotel. |
| Piso | `/h/<hotel>/piso/<n>` | El piso sale del edificio como un cajón y se ve la planta amoblada. Se toca cualquier habitación: brilla un momento y entra. Sin 3D, la planta en 2D con cada unidad **en verde (libre) o terracota (ocupada o vendida)**, con leyenda. |
| Unidad | `/h/<hotel>/unidad/<id>` | La maqueta de la unidad amoblada y sin techo, su ficha (área, capacidad, precio), "Elige tu unidad exacta" (la misma unidad en otros pisos, con el extra por vista) y "Ver la vista desde la ventana". |
| Espacio | `/h/<hotel>/unidad/<id>/<espacio>` | El espacio en 360° o en maqueta. En maqueta, **los demás espacios se hunden en el piso** y solo queda el elegido. |
| Lista | `/h/<hotel>/lista` | Todo sin 3D: pisos, unidades, planos y fotos. Es el respaldo para celulares sin 3D. |
| Comparar | `/h/<hotel>/comparar` | Las categorías lado a lado. |
| Panel | `/h/<hotel>/panel` | Métricas **simuladas** para el gerente: visitas, unidades más vistas, clics a reservar y comisión ahorrada. |

**La barra de reserva** siempre está visible. En celular va abajo y centrada; en computador, en la esquina inferior derecha. Dice "Reservar" o "Agendar visita" según el tipo de oferta (noche, mes o venta). En una unidad ocupada ofrece la alternativa libre más parecida.

**Las dos demos:**
- **Niebla Alta.** Apartahotel ficticio en Chapinero Alto: 6 pisos, 21 unidades (estudios, suites con balcón y un penthouse), lobby, cowork y terraza. Edificio de ladrillo hecho por código. Fotos ilustrativas sacadas del propio 3D. Algunas unidades salen ocupadas a propósito.
- **Akuare.** Edificio real en Suba Salitre, armado con datos públicos del catastro de Bogotá y OpenStreetMap: dos torres de 5 pisos y 35 apartamentos en venta (12 vendidos). El primer piso es residencial (garajes, local y puerta pequeña), como en la fachada real, con cubierta plana. Interiores ilustrativos. Lleva la nota "Demostración no oficial".

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
| **Premium** | Fotos profesionales de cada espacio, video de entrada (de la calle a la habitación), portada con puntos tocables. Todo Inmersivo. | "Así se entra", en la página de Antesala | $25 – 45 M | $0,9 – 1,5 M |
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
  - **KingDome Glamping:** espera la variante glamping.
- **Guion de venta:** 3 minutos con la demo en el celular, y mensajes de primer contacto para los tres mercados (`docs/VENTA.md`).

---

## 6. Qué está en curso

- **Modo Premium con Higgsfield.** Se conecta por MCP con la cuenta de **Prodigia** (plan Ultra). La propuesta es que **el mismo hotel se vea en los tres niveles**, con un selector "Ver como: Esencial · Inmersivo · Premium":
  - Esencial: las habitaciones en 360°.
  - Inmersivo: el 3D.
  - Premium: los renders del propio 3D pasados por Higgsfield para que parezcan fotografía profesional, más videos de entrada hechos desde esas imágenes. Así lo que se ve en Premium coincide con el 3D.
- **Plan detallado:** `docs/PLAN-PREMIUM.md`. Niebla Alta: unas 20 imágenes y 4 videos. Akuare: unas 17 imágenes y 2 videos. Primero se prueba una sola imagen (la sala de la 402) para calibrar, y todo lo generado se guarda en el repo para no depender de Higgsfield.
- **Lo mismo para Akuare.** La fachada sale del render del 3D (datos del catastro), con fotos tomadas por Jacobo en la calle como referencia. Las imágenes de Google Maps o Street View no se usan, porque sus términos lo prohíben. Los interiores son ilustrativos.

---

## 7. Decisiones abiertas (para decidir)

1. **Precio de la página web sola.** Debe quedar claramente por debajo del piloto con 3D.
2. **Mensualidad y tope de transferencia** por paquete.
3. **Premium para clientes reales:** ¿fotografía profesional real del hotel, renders con IA o ambos? En un hotel que ya existe, las imágenes con IA pueden no coincidir con lo real. Para constructoras sobre planos sí encajan, porque no hay edificio que fotografiar.
4. **Akuare como demo:** es un edificio real, mostrado sin permiso de la constructora y marcado "no oficial". ¿Se mantiene así, se le ofrece a la constructora o se reemplaza por un proyecto ficticio de constructora?
5. **Primeros contactos:** confirmar Monir y Nico por teléfono; armar la lista de 5 constructoras con proyectos sobre planos en Bogotá.
6. **Formalidades:**
   - pasar Vercel a Pro antes de la primera factura;
   - revisión legal del contrato (licencia del visor y transferencia);
   - verificar la marca en la SIC (clases 42 y 35), los dominios e Instagram.
7. **Glamping (KingDome):** construir la variante solo si responden.
8. **Trato en la web de Antesala:** hoy es de "usted" (dueños de hotel) y las páginas de los hoteles son de "tú" (huésped). ¿Se mantiene así?

---

## 8. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Este resumen | `docs/ESTADO.md` |
| Producto, mercados y alcance | `docs/PRODUCTO.md` |
| Guion de venta y mensajes | `docs/VENTA.md` |
| Hosting, dominios y transferencia | `docs/ENTREGA.md` |
| Por qué se decidió cada cosa (D-001 a D-069) | `docs/DECISIONES.md` |
| Tareas hechas y pendientes | `docs/TAREAS.md` |
| Diario de cada sesión | `docs/BITACORA.md` |
| Brief de la página de Antesala | `docs/WEB-ANTESALA.md` |
