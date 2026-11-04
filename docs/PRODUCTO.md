# Producto — Antesala

## La idea en una frase

Que una persona pueda conocer y explorar un hotel digitalmente antes de hospedarse, en vez de imaginárselo a partir de unas cuantas fotos.

## Marca

- **Nombre:** Antesala. Es la sala donde se espera antes de entrar; el producto es la antesala de la estadía.
- **Línea:** "Explora el hotel antes de llegar."
- **Quién la ve:** gerentes y dueños de hotel (B2B). El huésped ve la marca del hotel; Antesala aparece solo como un discreto "con tecnología de Antesala" en el pie de página.
- **Pendiente:** verificar la marca en la SIC (clases 42 y 35), los dominios y el usuario en Instagram.

## Modelo de negocio (resumen)

- B2B para hoteles boutique, apartahoteles, glampings y resorts en Colombia.
- Implementación inicial + mensualidad. El piloto sugerido cuesta $12–15M COP con alcance limitado.
- **Argumento principal de venta:** impulsa la reserva directa y ahorra la comisión de las OTAs (Booking ~15 % o más), no solo "se ve bonito".
- **Ángulo de ingresos para el hotel:** el huésped elige su unidad exacta (piso alto, mejor vista) y paga un extra por eso.
- Plan B de mercado: constructoras de vivienda sobre planos (ya pagan por selectores 3D).

## Fase actual: demo de venta (Fase 0)

**Objetivo:** que un gerente de hotel entienda la propuesta en menos de 3 minutos desde su celular y quiera un piloto.

**Hotel ficticio:** *Niebla Alta* (nombre provisional), apartahotel boutique en Bogotá.
- 6 pisos, con zonas comunes: lobby, cowork y terraza.
- 3 categorías: **Estudio**, **Suite con balcón** y **Penthouse**.
- 3 unidades en la demo (una por categoría), cada una con 3–5 espacios.
- El perfil se parece a los primeros prospectos (Apartasuite Monir y Nico Aparta-Suites).

**Contenido:** sin captura real. Edificio hecho por código, maquetas generadas desde planos SVG, e interiores, 360° y fotos renderizados en Blender. Ver `CONTENIDO.md`.

## Recorrido del huésped

1. **Entrada de marca.** Logo animado y una frase. Botón "Explorar", más el enlace "Ver lista de habitaciones" para quien no quiera 3D.
2. **Revelado del edificio.** La cámara baja y orbita la maqueta. Hotspots en las zonas comunes.
3. **Selector de piso.** El piso se ilumina y se separa del edificio. Un panel muestra las unidades del piso.
4. **Unidad en maqueta.** Plano extruido en 3D, sin techo. Cada espacio es clicable.
5. **Detalle del espacio.** Panorama 360°, galería con zoom y ficha (área, camas, amenities). Etiqueta "Imagen ilustrativa".
6. **Comparador de categorías.** Las 3 categorías lado a lado, con plano y diferencias marcadas.
7. **Elige tu unidad exacta.** Mapa del piso con el precio de cada unidad y el extra por vista (simulado).
8. **Reserva.** WhatsApp con mensaje prellenado ("Quiero la Suite 502 del … al …") o enlace a un motor externo simulado.
9. **Panel del hotel (vista de venta).** Métricas simuladas: visitas, unidades más vistas, clics a reservar y comisión de OTA ahorrada estimada.

Cada paso tiene una URL propia y compartible.

## Fuera de alcance en esta fase

- Panel administrativo real, login y base de datos (todo es JSON local).
- Integración con motores de reserva o PMS.
- Analytics reales.
- Multi-idioma completo (solo ES por defecto y EN básico).
- Splats con contenido (el visor queda preparado). Ver `TAREAS.md` → Aparcado.
- Variante glamping (aparcada; el modelo de datos ya la soporta).

## Criterios de éxito de la demo

- Recorrido completo, de la entrada a WhatsApp, sin errores en un iPhone reciente y en un Android de gama media.
- Contenido útil en pantalla en menos de 2,5 s con 4G.
- Un tercero entiende qué es el producto sin explicación previa (probar con 2–3 personas).
- Se ve premium: si alguna pantalla parece un placeholder, el bloque no está terminado.

## Prospectos (para el bloque 8)

| Hotel | Tipo | Gancho |
|---|---|---|
| Apartasuite Edificio Monir (Bogotá) | Apartahotel, ~23 suites distintas | Ver la suite exacta que se reserva |
| Nico Aparta-Suites (Zona G) | Apartahotel, 16 aptos en 3 tipos | El comparador vende la categoría más cara |
| KingDome Glamping (Guatavita) | Glamping de domos | Requiere la variante glamping (aparcada) |

Antes de contactarlos hay que verificar que no tengan ya un tour 360° y que sigan operando igual.
