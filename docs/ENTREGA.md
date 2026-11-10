# Entrega — dominios, hosting y transferencia

Cómo se publica el sitio de un cliente, quién es dueño de qué y qué pasa si el cliente se va. Antesala es un producto de **MamutHerd S.A.S.**: donde aquí dice "Antesala" como parte de un contrato, se entiende MamutHerd S.A.S. Es la sección del bloque 8 para el documento maestro; allí se copia este texto. Lo usan Jacobo y, resumido, el cliente en la propuesta.

## 1. Dónde vive cada cosa

| Pieza | Dónde | Dueño |
|---|---|---|
| Código del visor (Antesala) | GitHub `jjacobolalvarez34-rgb/Antesala` | MamutHerd S.A.S. |
| Contenido del cliente (textos, precios, planos, fotos, renders, 360°) | `content/hotels/<slug>/` y, si pesa, R2 | **El cliente** |
| Sitio publicado | Vercel (proyecto `antesala`) | Antesala lo opera |
| Dominio del cliente (`hotelx.com`) | Su registrador actual | **El cliente**, siempre |
| Medios pesados (video, 360° en alta) | Cloudflare R2 con `NEXT_PUBLIC_ASSETS_BASE_URL` | Antesala lo opera; los archivos son del cliente |

## 2. Hosting

- **Vercel Pro (unos USD 20 al mes por miembro).** El plan Hobby gratis **no permite uso comercial**: la demo puede estar en Hobby, pero en cuanto un cliente pague hay que pasar a Pro. Verificar el precio vigente antes de cotizar.
- **R2** para lo pesado (videos de transición, 360° en alta, renders). Costo bajo por GB y sin cobro por descarga. Se activa cuando el primer cliente tenga video o 360° reales.
- **Netlify** quedó en el plan gratis y se quedó sin créditos (deploys pausados, 2026-11-08). No se usa para clientes.
- Rama de producción: `main`. Cada push a `main` publica.

## 3. Dominio del cliente

Regla: **el dominio es del cliente y nunca se le pide la contraseña de su registrador.**

1. El cliente elige un subdominio: `experiencia.hotelx.com` o `recorrido.constructora.com`.
2. Le enviamos **un solo registro CNAME** para que lo cree él (o su proveedor) en su DNS, apuntando a Vercel.
3. Vercel emite el certificado SSL solo.
4. No se tocan los registros MX (correo) ni nada más del DNS.

Si el cliente no tiene página web (D-053), la portada del hotel en Antesala hace de sitio completo. En ese caso puede usar el dominio raíz (`hotelx.com`) con los registros que indique Vercel. Si aún no tiene dominio, se le recomienda comprarlo **a su nombre** (por ejemplo `.co` o `.com`), y nosotros solo configuramos.

## 4. Transferencia: si el cliente se va

Lo que se le entrega, sin costo adicional, en un plazo de 15 días hábiles:

- Todo su contenido en una carpeta: `hotel.json`, `tokens.json`, planos SVG, fotos, renders, 360° y videos en sus formatos originales.
- Un export estático del sitio (HTML) para que lo aloje donde quiera, sin el visor 3D en vivo si no renueva la licencia.
- El dominio sigue siendo suyo: solo borra el CNAME.

Lo que no se entrega: el código del visor (es producto de MamutHerd S.A.S., licenciado mientras dure el contrato).

Si el cliente solo contrató la página web (sin recorrido 3D), el export estático es su sitio completo.

## 5. Qué cubre la mensualidad

- Hosting (Vercel y R2) y transferencia de datos dentro de un tope por mes (ver `ARQUITECTURA.md` §8: una visita completa pesa 10–20 MB).
- Cambios menores de contenido: precios, disponibilidad, textos, fotos.
- Actualizaciones del visor.

Fuera de la mensualidad: nueva captura (sesión de fotos 360°, drone), renders nuevos, una torre o etapa adicional.

## 6. Pendiente

- Copiar este texto en el documento maestro (artifact del plan) — lo hace Jacobo o Claude con acceso al artifact.
- Pasar Vercel a Pro antes de la primera factura.
- Definir el tope de transferencia por plan y el precio de la mensualidad.
- Revisar con un abogado la cláusula de licencia del visor y la de transferencia antes del primer contrato.
