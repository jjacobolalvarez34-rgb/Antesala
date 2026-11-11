# Antesala · Identidad visual y plan de la web principal

> Documento de traspaso para Claude Code. Fecha: 11 de noviembre de 2026.
> Decisión de identidad: D-012 (`docs/DECISIONES.md`). Lienzo de referencia: "Antesala — Identidad visual", página "Identidad final".

---

## 1. Qué le pasamos a Claude Code

| Entregable | Dónde | Para qué |
|---|---|---|
| Este documento | `identidad/WEB-ANTESALA.md` | Identidad, estructura de la web, animaciones, reglas |
| Logos en SVG | `identidad/logo/` | Símbolo (4 versiones + favicon) y logo horizontal y vertical |
| Tokens | `identidad/tokens/tokens.css` y `tokens.json` | Colores, tipografías y espaciado, listos para Tailwind |
| Fotos del hotel de ejemplo | `identidad/fotos-higgsfield.json` | 11 fotos ya generadas con su `job_id` y URL |
| Preview de la experiencia | `preview/index.html` (se entrega aparte) | Maqueta funcional de referencia: intro, recorrido y secciones |
| Textos y precios | Secciones 5 y 6 de este documento | El copy de la web, aprobado |
| Docs del proyecto | `CLAUDE.md`, `docs/` | Arquitectura del visor y del modelo de datos, que se reutilizan |

**Lo que Claude Code tiene que hacer con esto:**
1. Mejorar lo que ya existe en el repo (Bloque 1 en adelante).
2. Construir la web comercial de Antesala como **la primera demo del propio producto**: el mismo visor de `app/h/[hotel]` con el hotel ficticio, envuelto en la página de venta.
3. Descargar las fotos con el MCP de Higgsfield y generar las que falten con la misma línea (sección 7).

---

## 2. Identidad visual (resumen)

### Logo: "ranura de luz"
Dos pilares altos forman el vano de una puerta. Los remates se inclinan hacia adentro y sugieren una A; al centro, una línea de luz como una puerta entreabierta.
- **Principal:** símbolo champán sobre azul noche, nombre ANTESALA en Cinzel.
- **Fondo claro:** pilares azul noche y ranura champán.
- **Una tinta:** sin ranura, en azul o en champán.
- **Pequeño (< 40 px):** sin los pilares exteriores (`simbolo-pequeno-favicon.svg`).
- **Nunca:** brillos, degradados metálicos, sombras, estrellas, estirar, rotar ni cambiar la tipografía.
- El texto del logo en los SVG va como `<text>` con Cinzel. Cuando la fuente esté instalada en el proyecto, conviene **pasar ese texto a trazos** para que no dependa de la fuente.

### Color
| Token | Hex | Uso |
|---|---|---|
| `--noche` | #111B33 | Fondo principal (≈60 %) |
| `--noche-2` | #1C2B4C | Segundo fondo, bloques |
| `--noche-hondo` | #0B1224 | Pie, sombras |
| `--champan` | #D2B88C | Logo, ranura, cifras, botón principal (≈10 %) |
| `--luz` | #F2E8D6 | La ranura y textos de acento sobre azul |
| `--marfil` | #F1EEE7 | Secciones claras (≈30 %) |
| Texto sobre azul | #ECE5D6 · #A7AFC2 | Principal · secundario |
| Texto sobre marfil | #111B33 · #4E566A | Principal · secundario |

Colores planos. El "brillo" de la marca es la luz de la ranura, no un efecto.

### Tipografía
- **Cinzel 500:** logo y titulares cortos, siempre en MAYÚSCULAS (tracking 0.04–0.08 em; el logo 0.42 em).
- **Cormorant Garamond itálica:** frases de acompañamiento ("Explora el hotel antes de llegar.").
- **Jost 400/500:** textos, interfaz, datos y etiquetas (etiquetas en mayúsculas con tracking 0.3 em).

### Recurso gráfico
La **ranura de luz**: una línea vertical champán de 2–4 px. Se usa como separador, como guía de scroll y como hilo del recorrido.

### Mamut Herd
Solo como firma: "Un producto de Mamut Herd" con la "m" de Mamut en una tinta. Nunca los colores de Mamut (azul marino + ámbar) dentro de Antesala.

---

## 3. Mapa de la web (una sola página larga + rutas de demo)

```
/                    Página principal (la experiencia)
/demo/niebla-alta    La demo a pantalla completa (el visor real con el hotel ficticio)
/demo                Galería de demos (hoy una; luego glamping, constructoras…)
/cotizar             Ancla o página del formulario
```

Orden de la página principal:

```
0  INTRO ············ logo → los pilares se abren → caemos en el edificio
1  HERO ············· "Su hotel, antes de llegar." sobre el edificio 3D
2  EL RECORRIDO ····· scroll guiado: edificio → piso → unidad → plano → espacio → reserva
3  DEMOS ············ "Pruébelo usted": tarjetas de demos que abren el visor real
4  PARA SU HOTEL ···· qué resuelve: reserva directa, categorías, unidad exacta
5  CÓMO TRABAJAMOS ·· 5 pasos de implementación + qué necesitamos del hotel
6  PRECIOS ·········· 4 paquetes + adicionales + qué incluye la mensualidad + pagos
7  CLIENTES ········· (oculta hasta tener el primer caso real)
8  MAMUT HERD ······· un producto de Mamut Herd + quién lo hace
9  PREGUNTAS ········ FAQ
10 COTIZACIÓN ······· formulario → WhatsApp / correo
11 PIE
```

---

## 4. Boceto por sección

### 0 · Intro (2,5–3 s, se puede saltar)
```
┌──────────────────────────────────────┐
│                                      │   1. Fondo azul noche. Los pilares suben
│                ▌▐ ▌▐                 │      desde abajo (0–0,8 s).
│               ▐▌ │ ▐▌                │   2. La ranura se dibuja de abajo arriba
│               ▐▌ │ ▐▌                │      (0,6–1,2 s).
│               ▐▌ │ ▐▌                │   3. La ranura se ensancha hasta llenar
│                                      │      la pantalla de luz mientras los
│              A N T E S A L A         │      pilares se separan como dos puertas
│                                [Saltar]     (1,4–2,2 s).
└──────────────────────────────────────┘   4. Fundido: la cámara cae desde arriba
                                               sobre el edificio 3D (2,2–3 s).
```
- Se muestra una vez por sesión. Botón "Saltar" y clic o tecla para saltar.
- El contenido de la página ya está detrás. Si el JS falla, no hay intro y no se bloquea nada.

### 1 · Hero
```
┌──────────────────────────────────────┐
│ [logo] ANTESALA     Recorrido Demos Precios Mamut  [Cotizar] │
│                                      │
│  SU HOTEL,                 ▄▄▄▄      │  edificio 3D girando lento,
│  ANTES DE LLEGAR.         ▐████▌     │  ventanas encendidas,
│  Su huésped recorre cada  ▐████▌     │  un piso resaltado en champán
│  espacio antes de reservar▐████▌     │
│  [Ver cómo funciona] [Probar demo]   │
│  Un producto de Mamut Herd           │
└──────────────────────────────────────┘
```

### 2 · El recorrido (scroll guiado, escenario fijo)
Escenario 3D fijo (sticky) a la derecha (arriba en el celular); los pasos pasan a la izquierda. Cada paso mueve la cámara y muestra un panel.

| Paso | El escenario muestra | Lo que ve el huésped | Lo que resuelve para el hotel |
|---|---|---|---|
| 01 Edificio | Edificio completo, cámara en 3/4 | El hotel entero, las zonas comunes | Que se entienda el lugar antes de la primera foto |
| 02 Piso | El piso 6 se separa y brilla; los demás se apagan | En qué piso queda y qué hay en él | Vende los pisos altos y la vista |
| 03 Unidad | Cámara cenital, la suite 602 resaltada | Cuál es su unidad exacta | La unidad exacta se puede cobrar con un extra |
| 04 Plano | Plano interactivo de la suite | Cómo se conectan los espacios | Responde "¿el baño está dentro?" antes de que pregunten |
| 05 Espacio | Foto (y 360°) del baño, la sala, el balcón | Cada espacio como es | Menos sorpresas, menos reclamos |
| 06 Reserva | Tarjeta: Suite 602 · piso 6 · +$40.000 por vista | Reserva directo | La reserva entra por su web o su WhatsApp, sin comisión |

### 3 · Demos ("Pruébelo usted") ← **sección obligatoria**
```
┌──────────────────────────────────────┐
│ DEMOS                                │
│ Pruébelo usted.                      │
│ ┌────────────┐ ┌────────────┐ ┌──────┐│
│ │ foto       │ │ foto       │ │      ││
│ │ NIEBLA ALTA│ │ GLAMPING   │ │ SU   ││
│ │ Apartahotel│ │ Próximamente│ │ HOTEL││
│ │ Bogotá     │ │            │ │ AQUÍ ││
│ │ [Entrar →] │ │            │ │[Cotizar]│
│ └────────────┘ └────────────┘ └──────┘│
│ Hotel ficticio · imágenes ilustrativas│
└──────────────────────────────────────┘
```
- **Entrar** abre `/demo/niebla-alta` a pantalla completa: el visor real del producto (edificio → piso → unidad → plano → espacio → reserva).
- En el preview también hay una versión compacta dentro de la página (pisos, unidades, plano y fotos) para probar sin salir.
- El botón "Reservar" de la demo no reserva nada: abre un aviso ("En su hotel, este botón lleva a su motor de reservas o a su WhatsApp") y ofrece "Quiero esto para mi hotel".
- Las demos se leen de `content/hotels/<slug>/`. Agregar una demo = agregar un hotel de ejemplo.

### 4 · Para su hotel
Tres bloques: **Más reserva directa** (dato: la mayoría de los hoteles paga alrededor del 15 % por reserva en Booking; fuente en `marketing/BASES.md`), **Categorías que se entienden** y **La unidad exacta**. Sin prometer aumentos de reservas.

### 5 · Cómo trabajamos
1. Diagnóstico → 2. Captura (fotos, 360°, planos; o su material) → 3. Producción → 4. Revisión y publicación → 5. Mantenimiento.
**Qué necesitamos de su hotel:** planos o medidas de las unidades; acceso para la captura o sus fotos; logo y colores; el enlace de su motor de reservas o su WhatsApp; quien maneje su dominio, para agregar un registro (no movemos su web ni su correo).

### 6 · Precios
Cuatro tarjetas (Esencial, Inmersivo destacado, Premium, Corporativo) con implementación y mensualidad; lista de adicionales "se cotizan aparte"; qué incluye la mensualidad; forma de pago 40/40/20. Ver la sección 6 abajo.

### 7 · Clientes
**Oculta.** Se activa con el primer caso real y su permiso (logo, cita textual, enlace). No usar ejemplos inventados.

### 8 · Mamut Herd
Fondo azul hondo. "Un producto de Mamut Herd": casa de productos digitales que también ayuda a empresas pequeñas a crecer. **Quién lo hace:** Jacobo López, Bogotá. `[ASÍ: una o dos líneas de bio, si se quiere]`.

### 9 · Preguntas
¿Tengo que cambiar mi web? · ¿Funciona en celular? · ¿Quién toma las fotos? · ¿Qué pasa si cancelo? · ¿Puedo actualizar fotos? · ¿Sirve para glampings? · ¿Mide las reservas?

### 10 · Cotización
Campos: nombre, hotel, ciudad, tipo (hotel, apartahotel, glamping, otro), número de unidades, paquete de interés, mensaje. Al enviar arma un mensaje y abre WhatsApp (+57 320 487 1882), con botón para copiar y el correo visible como texto (mamutherdoficial@gmail.com). Sin backend en la primera versión.

---

## 5. Textos clave (aprobados para la primera versión)

- **Hero:** SU HOTEL, ANTES DE LLEGAR. · *Su huésped recorre cada espacio antes de reservar.*
- **Recorrido, títulos:** EL EDIFICIO · SU PISO · LA UNIDAD EXACTA · EL PLANO · CADA ESPACIO · LA RESERVA
- **Demos:** PRUÉBELO USTED. · *Entre al hotel de ejemplo como lo haría su huésped.*
- **Para su hotel:** *Lo que una galería de fotos no alcanza a explicar.*
- **Mamut:** UN PRODUCTO DE MAMUT HERD
- **Cierre:** *¿Cómo se vería su hotel?* · COTIZAR
- Trato de usted al hotelero. Sin superlativos y sin prometer resultados en %.

## 6. Precios (COP, valores de referencia)

| Paquete | Incluye | Implementación | Mensualidad |
|---|---|---|---|
| Esencial | Recorrido 360°, galería por espacio, enlace de reserva | $5–9 M | $250–400 mil |
| Inmersivo | Edificio 3D, selección de unidades, planos interactivos, galerías | $12–22 M | $450–850 mil |
| Premium | 3D avanzado, más unidades, más producción visual | $25–45 M | $0,9–1,5 M |
| Corporativo | Varias sedes, permisos, integraciones | Desde $45 M | Desde $1,5 M |

- **La mensualidad incluye:** alojamiento, CDN y transferencia dentro del límite del plan, mantenimiento, copias de seguridad, soporte, panel y analítica básica.
- **Adicionales (se cotizan):** fotografía o 360° extra, dron, modelado de áreas nuevas, nuevas unidades o sedes, traducción, integración con motor de reservas o PMS, desplazamientos fuera de Bogotá.
- **Pago:** 40 % al aprobar, 40 % con la versión de prueba, 20 % al publicar. Los valores se aclaran con o sin IVA en cada propuesta.

---

## 7. Imágenes

- 11 fotos ya generadas (`fotos-higgsfield.json`). Son **ilustrativas** del hotel ficticio y deben llevar la etiqueta "Hotel ficticio · imágenes ilustrativas".
- Para nuevas fotos, la misma línea: "editorial interior photograph, boutique aparthotel in Bogotá, deep midnight-navy walls, walnut, brushed champagne-brass, ivory linen, travertine, soft natural light, 35mm, fine film grain, realistic, no people, no text, no logos". Modelo: `gpt_image_2_6`.
- Nunca texto, logos ni precios dentro de una imagen generada.
- Entrega optimizada: AVIF/WebP en 480, 960 y 1600 px, con `loading="lazy"` salvo la del hero.

---

## 8. Animaciones y rendimiento

- **GSAP + ScrollTrigger** para la intro y los pasos del recorrido; **Motion** para paneles y tarjetas.
- **Escena 3D** (React Three Fiber): edificio de 8 pisos procedural; la cámara se interpola entre poses por paso. Solo se renderiza mientras el escenario está visible. Respaldo en SVG si no hay WebGL.
- **Efectos reducidos (decisión de Jacobo):** la web no debe quedarse quieta si el computador tiene las animaciones del sistema desactivadas. Con `prefers-reduced-motion` se **mantienen** la intro (en versión corta), los fundidos y la ranura, y solo se quitan la rotación continua, el parallax y los vuelos largos de cámara (pasan a cortes con fundido).
- **Presupuesto:** contenido útil en menos de 2,5 s con 4G; JS inicial sin 3D menor a 180 KB; el 3D se carga después de la intro; fotos bajo demanda.
- Todo el contenido es legible sin JavaScript (las animaciones parten de un estado visible).
- Lighthouse: 90 o más en rendimiento y accesibilidad en móvil.

---

## 9. Pendientes de Jacobo
- [ ] Bio corta para "Quién lo hace" (opcional).
- [ ] Dominio de la web.
- [ ] Confirmar si se ofrecen condiciones de piloto a los primeros hoteles.
- [ ] Revisar las 11 fotos y descartar las que no convenzan.
