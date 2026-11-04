# Arquitectura

## 1. Principio

**Un visor genérico + contenido por hotel.** Escalar significa capturar más, no programar más: cada hotel nuevo es contenido y configuración. El visor renderiza los medios que tenga cada espacio, y el paquete contratado decide cuántos medios se capturan.

```
CAPTURA (con cliente)       PROCESO (pipeline/)            ENTREGA
Dron (exterior)      ─┐     Splat → SPZ/SOG + LoD          Cloudflare R2 + CDN (assets pesados)
Cámara 360°          ─┤     Edificio → GLB Draco + KTX2    Supabase (datos, Fase 1+)
Video de celular     ─┼──►  360° → teselas AVIF       ──►  Next.js en Vercel (visor por hotel)
Fotos                ─┤     Fotos → AVIF en 3 tamaños              │
Plano del hotel      ─┘     Plano SVG → maqueta 3D                 ▼
                                                           Huésped en el celular
```

En la demo, la columna de captura la reemplazan el código, Blender y los renders propios. El proceso y la entrega no cambian.

## 2. Stack

| Capa | Herramienta | Notas |
|---|---|---|
| App | Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript 6.0 estricto, Tailwind 4.3, shadcn/ui 4.23 (base-nova, Base UI) | pnpm. TS 7 y ESLint 10 esperan a que typescript-eslint y los plugins de eslint-config-next los soporten (D-013) |
| 3D | React Three Fiber, drei, @react-three/postprocessing | `Canvas` persistente en el layout |
| Splats | Spark (`@sparkjsdev/spark`, MIT) | Preparado, sin contenido en la Fase 0. three.js r186 trae un renderizador nativo en WebGPU; reevaluar más adelante |
| 360° | Propio: esfera equirectangular en la misma escena (`PanoSphere`) | Photo Sphere Viewer descartado: exige three 0.185.x (D-036) |
| Motion | GSAP (cámara, líneas de tiempo) · Motion 14 (UI) | Ver `DISENO.md`. Motion entra con `LazyMotion` cuando haya *bottom sheets* y gestos; en el bloque 1 bastan transiciones CSS (D-016) |
| UI animada | Unlumen UI, SmoothUI | Vía registro shadcn o MCP de 21st.dev; solo piezas puntuales |
| Marca | Rive (opcional) | Solo en la entrada |
| Iconos | lucide-react | |
| Estado | Zustand | |
| Validación | zod 4 | El contenido se valida en build |
| i18n | next-intl | ES por defecto, EN básico |
| Assets | glTF-Transform, sharp, splat-transform (PlayCanvas) | `pipeline/` |
| QA | Playwright 1.64, Lighthouse | `pnpm shots` y `pnpm budget` |
| Hosting | Vercel (app) + Cloudflare R2 (assets) | |
| Datos (Fase 1+) | Supabase | El esquema refleja §4 |

Descartadas: anime.js y react-spring (se solapan con GSAP y Motion), Babylon.js (Spark exige three.js). Ver `DECISIONES.md`.

## 3. Estructura del repo

```
app/
  h/[hotel]/
    layout.tsx               Canvas persistente + capa de UI + banner demo
    page.tsx                 entrada de marca
    explorar/page.tsx        vista exterior
    piso/[nivel]/page.tsx    unidades del piso
    unidad/[unidad]/page.tsx maqueta de la unidad
    unidad/[unidad]/[espacio]/page.tsx   detalle del espacio
    comparar/page.tsx        comparador de categorías
    lista/page.tsx           modo sin 3D
  demo-assets/[hotel]/[...path]/route.ts   sirve content/<hotel>/{media,plans} en la demo (estático)
  panel/page.tsx             métricas simuladas
components/
  scene/                     SceneLayer (capa persistente), Scene (Canvas), Backdrop (fondo en dos capas), Building, windows (cuarto en paralaje), Context (entorno), CameraRig, Pois, UnitOverlay, assets (carga escalonada); luego UnitModel, SplatView
public/visor/                assets genéricos del visor: env/ (HDRI día/noche) y materials/ (texturas CC0)
  pano/                      PanoViewer
  gallery/                   Gallery, ZoomImage
  plan/                      PlanSvg (2D interactivo), planToMesh (SVG → geometría)
  booking/                   BookingBar, WhatsAppButton
  ui/                        shadcn + piezas de Unlumen/SmoothUI
  hotel/                     DemoBanner, PoweredBy, HotelHeader, UnitCard, SpaceChips, Facts, FidelityBadge, Breadcrumbs
  motion/                    timelines GSAP, presets Motion, useReducedMotion
content/hotels/<slug>/
  hotel.json
  tokens.json
  plans/*.svg
  media/                     originales livianos de desarrollo
lib/
  types.ts                   §4
  content.ts                 loader + validación zod (solo servidor)
  plan.ts                    parser de planos SVG + áreas
  hotel.ts                   selectores puros (precios, pisos, unidades)
  routes.ts                  constructores de rutas tipadas
  fonts.ts                   registro de fuentes (next/font)
  tokens.ts                  tokens.json → variables CSS
  store.ts                   estado del recorrido
  media.ts                   resolución de URLs por entorno
  whatsapp.ts                armado del mensaje prellenado
  capabilities.ts            detección de WebGL2 y gama del dispositivo; ?calidad= para forzar
  building.ts                geometría del edificio y poses de cámara (puro)
pipeline/                    scripts de assets (ver CONTENIDO.md); placeholders.mjs
tests/shots.spec.ts          capturas + chequeos (Reservar visible, banner, imágenes rotas, consola)
tests/shots-3d.spec.ts       capturas de la escena (en serie, ?calidad=medio, sin animación)
tests/budget.mjs             JS inicial vs. §8
docs/
```

## 4. Modelo de datos (`lib/types.ts`)

```ts
type MediaKind = 'photo' | 'pano360' | 'splat' | 'video' | 'glb';

interface Media {
  id: string;
  kind: MediaKind;
  src: string;               // ruta relativa; lib/media.ts la resuelve
  preview?: string;          // versión liviana o miniatura
  alt: string;
  fidelity: 'exacta' | 'ilustrativa';
  capturedAt?: string;       // ISO
  width?: number; height?: number;
  hotspots?: PanoHotspot[];  // solo pano360
}

interface PanoHotspot { id: string; yaw: number; pitch: number; label: string; target?: string /* id de espacio */ }

interface Space {
  id: string;                // = id del polígono en el SVG del plano
  name: string;
  type: 'dormitorio' | 'bano' | 'sala' | 'cocina' | 'comedor' | 'balcon' | 'terraza' | 'estudio' | 'vestier' | 'otro';
  areaM2?: number;
  description?: string;      // texto corto de la ficha
  features: string[];
  media: Media[];
}

interface Unit {
  id: string;                // "502"
  name: string;              // "Suite 502"
  categoryId: string;
  levelId: string;
  capacity: number;
  beds: string;
  areaM2: number;
  basePriceCOP?: number;     // simulado en la demo
  viewPremiumCOP?: number;   // extra por vista o piso alto
  view?: string;             // qué se ve; justifica el extra
  plan: string;              // "plans/suite-502.svg"
  exterior?: { facade: number; windows: number[] }[]; // ventanas en la fachada (0 = principal; izq→der visto desde afuera)
  spaces: Space[];
  featured?: boolean;
}

interface Category { id: string; name: string; tagline: string; highlights: string[] }

interface Level { id: string; name: string; kind: 'piso' | 'zona'; order: number }

interface Poi { id: string; name: string; levelId?: string; description?: string; position: [number, number, number]; media: Media[] }

interface Site {
  kind: 'edificio' | 'terreno';
  building?: { footprint: [number, number][]; floors: number; floorHeightM: number; style?: { cladding: 'ladrillo' | 'estuco' | 'concreto' } };
  exterior: Media[];         // glb | splat | foto aérea; si está vacío se usa el procedural
  pois: Poi[];
}

interface Hotel {
  slug: string;
  name: string;
  city: string;
  neighborhood?: string;
  intro?: string;            // presentación corta (entrada y lista)
  locale: 'es' | 'en';
  contact: { whatsapp: string; bookingUrl?: string };
  site: Site;
  levels: Level[];
  categories: Category[];
  units: Unit[];
  isDemo: boolean;           // true → banner "Hotel ficticio · imágenes ilustrativas"
}
```

Los campos opcionales `neighborhood`, `intro`, `Unit.view`, `Space.description`, `Poi.levelId` y `Poi.description` se sumaron en el bloque 1 para que el modo lista no tenga textos del hotel en los componentes (D-012). `HotelTokens` y `PlanGeometry` también viven en `lib/types.ts`.

Reglas (las comprueba `lib/content.ts`; cualquier fallo rompe el build):
- `Space.id` debe coincidir con el `id` de su polígono en el SVG, y todo polígono debe tener su espacio.
- Si un espacio declara `areaM2`, no puede alejarse más de 15 % del área de su polígono.
- Todo `src`/`preview` de un medio debe existir en la carpeta del hotel; los hotspots deben apuntar a espacios existentes.
- Un `Unit.levelId` y un `Unit.categoryId` inexistentes hacen fallar el build.
- La variante glamping usa `Site.kind = 'terreno'` y `Level.kind = 'zona'`, sin cambiar los tipos.

## 5. Rutas y estado

- Cada etapa del recorrido es una ruta, así que todo es compartible por link.
- El `Canvas` vive en `app/h/[hotel]/layout.tsx` y no se desmonta. Cuando cambia la ruta, `CameraRig` anima la cámara hacia el objetivo de esa etapa.
- `lib/store.ts` (Zustand) guarda la calidad gráfica, si la escena está montada y lista, y el piso resaltado por hover (sincroniza el 3D y el LevelPicker). La URL es la fuente de verdad de la selección; el store no la duplica.
- Modo escena: `SceneLayer` marca `<html data-scene="on">` cuando la escena está visible y lista. Las páginas usan la variante `scene:` de Tailwind para ocultar la lista y mostrar paneles sobre el 3D (D-020). Sin escena, la misma página es el modo lista.
- En el futuro, multi-hotel por subdominio: `middleware.ts` reescribe `hotelx.dominio.com` → `/h/hotelx`. En la demo se usa la ruta directa.

## 6. Carga y degradación

1. **Primero:** HTML con marca, navegación y modo lista. Sin JS de 3D.
2. **Después:** `dynamic(() => import('…/Scene'), { ssr: false })` una vez pintada la marca.
3. `lib/capabilities.ts` decide entre tres niveles:
   - **alto:** postproceso, sombras, DPR hasta 2.
   - **medio:** sin postproceso, DPR 1,5.
   - **lista:** sin WebGL2 o con FPS bajo sostenido; redirige a `/lista` con un aviso discreto.
4. `PerformanceMonitor` de drei baja la calidad en vivo si cae el FPS.
5. Cada unidad, panorama y galería se descarga **solo al abrirse**. Se precarga el paso siguiente probable cuando el usuario se detiene más de 1 s.
6. Ningún error de carga de un recurso bloquea el recorrido: se muestra una alternativa (imagen, lista).

## 7. Medios y entrega

- `lib/media.ts` resuelve `src` según el entorno:
  - sin `NEXT_PUBLIC_ASSETS_BASE_URL` (dev y demo) → `/demo-assets/<hotel>/<src>`, que `app/demo-assets` sirve desde `content/` y se prerenderiza en el build
  - prod → `https://<cdn-r2>/<hotel>/…`
- Variantes por imagen: `-480`, `-960`, `-1600` en AVIF y WebP, más una miniatura borrosa en línea.
- Los panoramas tienen una versión baja de ~2048 px y teselas para el zoom.

## 8. Presupuestos (criterios de aceptación)

| Recurso | Límite |
|---|---|
| JS inicial sin 3D (gzip) | 180 KB |
| Contenido útil en pantalla, 4G | < 2,5 s |
| Edificio (GLB o procedural + texturas) | 3 MB |
| Maqueta por unidad | 1,5 MB |
| Panorama 360° (versión baja) | 1,5 MB |
| Foto de galería a 1600 px | ~250 KB AVIF |
| Splat (futuro) | 15 MB con LoD |
| FPS | 60 en iPhone reciente · ≥ 30 en Android gama media |
| Visita completa | 10–20 MB |

La transferencia por visita sirve para calcular la "transferencia incluida" de cada plan comercial.

## 9. Despliegue

- **Demo:** Vercel, en `demo.<dominio>` o en la URL de Vercel. Los assets en R2 si se pasan del límite del repo; si no, en `public/` mientras sea la demo.
- **Alternativa para la demo: Netlify.** `netlify.toml` ya está listo (pnpm build, Node 22, caché larga para `/visor/*`). Netlify usa su adaptador oficial de Next.js. Casi todo es estático, así que no hay diferencia práctica para la demo.
- **Assets del visor** (`public/visor/`, unos 3 MB: HDRI de día y de noche y texturas CC0): en `public/` durante la demo; con `NEXT_PUBLIC_ASSETS_BASE_URL` pasan a R2 (`<base>/visor/...`).
- **Con clientes (Fase 1+):** subdominio del hotel (`experiencia.hotelx.com`) apuntado con un CNAME. Vercel for Platforms o Cloudflare for SaaS para el SSL automático. Nunca pedir la contraseña del DNS del hotel ni tocar sus registros MX.
- Variables de entorno: `NEXT_PUBLIC_ASSETS_BASE_URL` y, en el futuro, las de Supabase.

## 10. Fase 1 en adelante (no construir aún)

- Supabase: tablas espejo de §4, con RLS por `hotel_id`, y Storage solo para originales (la entrega sigue por R2).
- Panel administrativo básico: editar textos y fichas, y ordenar medios.
- Analytics de eventos: vista de unidad, apertura de 360°, clic a reservar.
- Integración con motores de reserva: caso por caso, según la API disponible.
