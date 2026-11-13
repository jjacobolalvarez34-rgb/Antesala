/* eslint-disable @next/next/no-img-element -- fotos estáticas livianas en public/demo */
import type { Metadata, Route, Viewport } from 'next';
import Link from 'next/link';

import { AntesalaLogo } from '@/components/brand/AntesalaLogo';
import { PlanSvg } from '@/components/plan/PlanSvg';
import { ElevationArt, TerrainArt } from '@/components/producto/DemoArt';
import { Intro, INTRO_PREPAINT } from '@/components/producto/Intro';
import { Nav, QuoteForm, RecorridoConAviso, ReplayIntro } from '@/components/producto/Interactivos';
import s from '@/components/producto/landing.module.css';
import type { RecorridoData } from '@/components/producto/Recorrido';
import { SavingsCalculator } from '@/components/producto/SavingsCalculator';
import { ANTESALA } from '@/lib/antesala';
import { getHotelBundle } from '@/lib/content';
import { findLevel, formatArea, formatCOP, sortedLevels, unitPrice } from '@/lib/hotel';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Antesala · Su hotel, antes de llegar',
  description:
    'Recorrido 3D del edificio, cada piso y cada habitación para hoteles boutique, apartahoteles y glampings en Colombia. El huésped elige su habitación exacta y reserva directo.',
};

export const viewport: Viewport = { themeColor: '#111B33' };

const frameOf = (pts?: [number, number][]) => {
  if (!pts?.length) return { w: 0 };
  const xs = pts.map((p) => p[0]);
  return { w: Math.max(...xs) - Math.min(...xs) };
};

const photo = (key: string, w: 960 | 1600 = 960) => `/demo/${key}-${w}.webp`;

/** Firma de Mamut Herd (una tinta). */
function MamutMark({ className }: { className?: string }) {
  return (
    <svg viewBox="22 18 230 182" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M30 180 L30 104 C30 76 52 58 80 58 C98 58 110 66 118 76 C128 50 142 40 158 38 C160 32 163 28 168 25 C168 31 169 35 172 38 C194 42 206 60 206 88 L206 174 C206 188 194 194 186 186 C182 182 180 178 180 170 L180 104 C180 92 170 84 158 84 C146 84 135 92 135 104 L135 180 L105 180 L105 110 C105 98 96 90 84 90 C70 90 60 98 60 110 L60 180 Z"
      />
    </svg>
  );
}

/**
 * Paquetes (definidos con Jacobo, 2026-11-12, D-069). Cada uno con su ejemplo:
 * Esencial = la lista de Niebla Alta (sin 3D), Inmersivo = Niebla Alta en 3D,
 * Premium = la producción visual de esta misma página. Las cadenas, a la medida.
 */
const PRICES: {
  name: string;
  for: string;
  items: string[];
  impl: string;
  month: string;
  star?: boolean;
  example: { label: string; href: string };
}[] = [
  {
    name: 'Esencial',
    for: 'Que el huésped vea cada espacio antes de reservar.',
    items: ['Fotos de cada espacio', 'Recorrido 360° por espacio', 'Botón de reserva o WhatsApp', 'Sin 3D: liviano en cualquier celular'],
    impl: '$5 – 9 M',
    month: '$250 – 400 mil',
    example: { label: 'Ver ejemplo', href: `/h/${ANTESALA.demoSlug}/lista` },
  },
  {
    name: 'Inmersivo',
    for: 'El hotel en 3D, como la demo de Niebla Alta.',
    items: ['Edificio 3D con su barrio', 'Pisos y habitaciones que se tocan', 'Planos y maqueta amoblada', 'Todo lo de Esencial'],
    impl: '$12 – 22 M',
    month: '$450 – 850 mil',
    star: true,
    example: { label: 'Ver ejemplo', href: `/h/${ANTESALA.demoSlug}/explorar` },
  },
  {
    name: 'Premium',
    for: 'Inmersivo con producción visual de cine.',
    items: ['Fotos profesionales de cada espacio', 'Video de entrada, de la calle a la habitación', 'Portada con puntos tocables', 'Todo lo de Inmersivo'],
    impl: '$25 – 45 M',
    month: '$0,9 – 1,5 M',
    example: { label: 'Ver ejemplo', href: `/h/${ANTESALA.demoSlug}` },
  },
];

const FAQ = [
  {
    q: '¿Tengo que cambiar mi web?',
    a: 'No. El recorrido vive en una dirección propia (por ejemplo, recorrido.suhotel.com) y se enlaza desde su web, su Instagram o su WhatsApp. Solo se agrega un registro en su dominio.',
  },
  {
    q: '¿Y si no tengo página web?',
    a: 'Se la hacemos: portada, habitaciones, servicios, ubicación, políticas y reserva por WhatsApp, con su dominio. Puede empezar solo con la página y sumar el recorrido después.',
  },
  {
    q: '¿Funciona en celular?',
    a: 'Sí, se diseña primero para celular. Si un teléfono no puede con el 3D, el huésped ve la misma información en lista: pisos, unidades, planos y fotos.',
  },
  {
    q: '¿Quién toma las fotos?',
    a: 'Podemos usar su material si tiene la calidad. Si no, la captura de fotos, 360° y dron se cotiza como adicional.',
  },
  {
    q: '¿Qué pasa si cancelo?',
    a: 'Las condiciones de permanencia y salida quedan escritas en cada propuesta. Las fotos y planos que usted entregó siguen siendo suyos.',
  },
  { q: '¿Puedo actualizar las fotos?', a: 'Sí. Los cambios de contenido están dentro del mantenimiento; las áreas o unidades nuevas se cotizan.' },
  { q: '¿Sirve para glampings y constructoras?', a: 'Sí. En un glamping se muestra el mapa del terreno y cada domo o cabaña; en una constructora, la torre con sus apartamentos disponibles y vendidos.' },
  {
    q: '¿Mide las reservas?',
    a: 'La analítica básica mide visitas, unidades más vistas y clics en reservar. Las reservas se cuentan en su motor o en su WhatsApp.',
  },
];

export default async function Home() {
  const niebla = await getHotelBundle(ANTESALA.demoSlug);
  const akuare = await getHotelBundle('akuare');

  // la unidad del recorrido: la suite con balcón del piso 5 de Niebla Alta
  let recorrido: RecorridoData | null = null;
  if (niebla) {
    const { hotel } = niebla;
    const unit = hotel.units.find((u) => u.id === '502') ?? hotel.units.find((u) => u.viewPremiumCOP) ?? hotel.units[0]!;
    const plan = niebla.plans[unit.plan];
    const level = findLevel(hotel, unit.levelId);
    const price = unitPrice(unit) ?? 0;
    if (plan && level) {
      recorrido = {
        hotelName: hotel.name,
        floors: hotel.site.building?.floors ?? hotel.levels.length,
        hlFloor: level.order,
        hlUnit: 1,
        widthM: frameOf(hotel.site.building?.footprint).w,
        heightM: (hotel.site.building?.floors ?? 6) * (hotel.site.building?.floorHeightM ?? 3),
        unitName: unit.name,
        unitHref: routes.unidad(hotel.slug, unit.id),
        levelName: level.name,
        view: 'vista a los cerros',
        area: formatArea(unit.areaM2),
        basePrice: formatCOP(unit.basePriceCOP ?? price),
        premium: formatCOP(unit.viewPremiumCOP ?? 0),
        total: formatCOP(price),
        plan,
        planSpaces: unit.spaces.map((sp) => ({
          id: sp.id,
          name: sp.name,
          areaM2: sp.areaM2,
          href: routes.espacio(hotel.slug, unit.id, sp.id),
          outdoor: sp.type === 'balcon' || sp.type === 'terraza',
        })),
        photos: [
          { key: 'suite-dormitorio', label: 'Dormitorio', src: photo('suite-dormitorio') },
          { key: 'suite-bano', label: 'Baño', src: photo('suite-bano') },
          { key: 'suite-sala', label: 'Sala', src: photo('suite-sala') },
          { key: 'suite-balcon', label: 'Balcón', src: photo('suite-balcon') },
          { key: 'suite-cocina', label: 'Cocina', src: photo('suite-cocina') },
        ],
      };
    }
  }

  const demos = [
    niebla
      ? {
          key: 'niebla',
          img: null,
          imgAlt: '',
          // su propia planta (no la foto de la página de Antesala): piso 5 con libres y ocupadas
          art: (() => {
            const lv = sortedLevels(niebla.hotel).find((l) => l.id === '5') ?? sortedLevels(niebla.hotel).at(-1);
            const geo = lv?.plan ? niebla.plans[lv.plan] : undefined;
            if (!lv || !geo) return null;
            return (
              <div className={s.planArt} style={{ ['--r' as string]: (geo.width / geo.height).toFixed(3) }}>
                <PlanSvg
                  geometry={geo}
                  variant="thumb"
                  title={`Planta del ${lv.name.toLowerCase()} de ${niebla.hotel.name}`}
                  spaces={niebla.hotel.units
                    .filter((u) => u.levelId === lv.id)
                    .map((u) => ({
                      id: u.id,
                      name: u.name,
                      href: routes.unidad(niebla.hotel.slug, u.id),
                      status: u.occupied ? ('ocupada' as const) : ('libre' as const),
                    }))}
                />
                <span>Planta del {lv.name.toLowerCase()} · libres y ocupadas</span>
              </div>
            );
          })(),
          badge: 'Apartahotel · Bogotá',
          name: 'Niebla Alta',
          text: `${niebla.hotel.units.length} habitaciones en ${niebla.hotel.levels.length} pisos: estudios, suites y un penthouse. Elija piso, habitación y espacio.`,
          href: routes.hotel(niebla.hotel.slug),
        }
      : null,
    akuare
      ? {
          key: 'akuare',
          img: null,
          imgAlt: '',
          art: (
            <ElevationArt
              name={akuare.hotel.name}
              heightM={(akuare.hotel.site.building?.floors ?? 5) * (akuare.hotel.site.building?.floorHeightM ?? 2.7)}
              levels={sortedLevels(akuare.hotel).map((l) => ({
                id: l.id,
                units: akuare.hotel.units.filter((u) => u.levelId === l.id).map((u) => ({ id: u.id, sold: !!u.occupied })),
              }))}
            />
          ),
          badge: 'Edificio real · venta · Suba',
          name: 'Akuare',
          text: `La torre real desde el catastro de Bogotá, con ${akuare.hotel.units.length} apartamentos en venta y los vendidos marcados.`,
          href: routes.hotel('akuare'),
        }
      : null,
  ].filter((d) => d !== null);

  return (
    <div className={`${s.root} marca-antesala`}>
      {/* antes de pintar: decide si hay intro y tapa la página desde el primer cuadro */}
      <script dangerouslySetInnerHTML={{ __html: INTRO_PREPAINT }} />
      <Intro />
      <Nav />

      <main id="top">
        {recorrido ? <RecorridoConAviso data={recorrido} /> : null}
        {/* "Así se entra" (Pelicula) se quitó: Jacobo no le vio razón de ser (D-073). El componente sigue en el repo. */}

        {/* 3 · Demos */}
        <section className={`${s.blk} ${s.alt}`} id="demos">
          <div className={s.wrap}>
            <div className={`${s.secHead} ${s.reveal}`}>
              <div className={s.kicker}>Demos</div>
              <h2>Pruébelo usted.</h2>
              <p className={s.lead}>Entre a los hoteles de ejemplo como lo haría su huésped.</p>
            </div>
            <div className={`${s.demoCards} ${s.reveal}`}>
              {demos.map((d) => (
                <article key={d.key} className={s.dcard}>
                  <div className={s.ph}>
                    {d.img ? <img src={d.img} alt={d.imgAlt} width={960} height={600} loading="lazy" /> : d.art}
                    <span className={s.tag}>{d.key === 'akuare' ? 'Datos reales' : 'Demo'}</span>
                  </div>
                  <div className={s.dbody}>
                    <span className={s.badge}>{d.badge}</span>
                    <h3 style={{ marginTop: 10 }}>{d.name}</h3>
                    <p>{d.text}</p>
                    <Link className={`${s.btn} ${s.solid}`} href={d.href}>
                      Entrar <span className={s.arr}>→</span>
                    </Link>
                  </div>
                </article>
              ))}
              <article className={`${s.dcard} ${s.soon}`}>
                <div className={s.ph}>
                  <TerrainArt />
                  <span className={s.tag}>Ilustración</span>
                </div>
                <div className={s.dbody}>
                  <span className={s.badge}>Glamping</span>
                  <h3 style={{ marginTop: 10 }}>Domos en la montaña</h3>
                  <p>En vez de pisos, el mapa del terreno y cada domo o cabaña.</p>
                  <button className={s.btn} type="button" disabled>
                    Próximamente
                  </button>
                </div>
              </article>
              <article className={`${s.dcard} ${s.yours}`}>
                <div className={s.dbody} style={{ justifyContent: 'center' }}>
                  <h3>
                    Su hotel
                    <br />
                    aquí
                  </h3>
                  <p className={s.it} style={{ fontSize: 20, color: 'var(--luz)' }}>
                    ¿Cómo se vería su hotel?
                  </p>
                  <a className={s.btn} href="#cotizar">
                    Cotizar <span className={s.arr}>→</span>
                  </a>
                </div>
              </article>
            </div>
            <p className={s.fict}>Niebla Alta es un hotel ficticio; Akuare, una demostración no oficial con datos públicos. Imágenes ilustrativas.</p>
          </div>
        </section>

        {/* 4 · Para su hotel */}
        <section className={`${s.blk} ${s.ivory}`} id="para-su-hotel">
          <div className={s.wrap}>
            <div className={`${s.secHead} ${s.reveal}`}>
              <div className={s.kicker}>Para su hotel</div>
              <h2>Lo que una galería no alcanza a explicar.</h2>
              <p className={s.lead}>Para hoteles boutique, apartahoteles y glampings que venden espacios distintos entre sí.</p>
            </div>
            <div className={`${s.three} ${s.reveal}`}>
              <div>
                <span className={s.n}>i.</span>
                <h3>Más reserva directa</h3>
                <p>
                  El botón de reservar lleva a su motor o a su WhatsApp. Las plataformas cobran comisión por cada reserva; la que entra por
                  su canal no paga a nadie en el medio.
                </p>
                <span className={s.src}>En Booking, la comisión suele rondar el 15 %.</span>
              </div>
              <div>
                <span className={s.n}>ii.</span>
                <h3>Categorías que se entienden</h3>
                <p>Estudio, suite, penthouse: con plano y metros, el huésped entiende la diferencia y elige la que quiere pagar.</p>
              </div>
              <div>
                <span className={s.n}>iii.</span>
                <h3>La unidad exacta</h3>
                <p>El piso alto, la vista, la esquina. Lo que antes se pedía por chat ahora se elige en el recorrido, y puede tener su propio valor.</p>
              </div>
            </div>

            <div className={`${s.web} ${s.reveal}`} id="pagina-web">
              <div>
                <div className={s.kicker}>¿Su hotel no tiene página web?</div>
                <h3 style={{ marginTop: 18, fontSize: 24 }}>Se la hacemos.</h3>
                <p className={s.lead} style={{ fontSize: 21 }}>
                  Puede empezar solo con la página y sumar el recorrido cuando quiera.
                </p>
              </div>
              <ul>
                <li>Portada con su edificio</li>
                <li>Habitaciones y precios</li>
                <li>Servicios y zonas comunes</li>
                <li>Ubicación y políticas</li>
                <li>Reserva directa por WhatsApp</li>
                <li>Con su dominio</li>
              </ul>
            </div>

            <div className={`${s.calc} ${s.reveal}`}>
              <div className={s.kicker}>Haga la cuenta</div>
              <h3 style={{ margin: '18px 0 28px', fontSize: 24 }}>La comisión que deja de pagar.</h3>
              <SavingsCalculator />
            </div>
          </div>
        </section>

        {/* 5 · Cómo trabajamos */}
        <section className={s.blk} id="como">
          <div className={s.wrap}>
            <div className={`${s.secHead} ${s.reveal}`}>
              <div className={s.kicker}>Cómo trabajamos</div>
              <h2>De su edificio a su recorrido.</h2>
            </div>
            <ol className={`${s.flow} ${s.reveal}`}>
              {[
                ['Diagnóstico', 'Vemos su hotel, sus unidades y su forma de vender.'],
                ['Captura', 'Fotos, 360° y planos. O trabajamos con su material.'],
                ['Producción', 'Edificio 3D, planos interactivos y galerías por espacio.'],
                ['Revisión y publicación', 'Usted revisa una versión de prueba antes de salir.'],
                ['Mantenimiento', 'Alojamiento, cambios de contenido y soporte cada mes.'],
              ].map(([t, d], i) => (
                <li key={t}>
                  <span className={s.flowN}>0{i + 1}</span>
                  <b>{t}</b>
                  <span>{d}</span>
                </li>
              ))}
            </ol>
            <div className={`${s.need} ${s.reveal}`}>
              <div>
                <h3>Qué necesitamos de su hotel</h3>
                <p className={s.lead} style={{ fontSize: 21 }}>
                  No movemos su web ni su correo. El recorrido se suma a lo que ya tiene.
                </p>
              </div>
              <ul>
                <li>Planos o medidas de las unidades.</li>
                <li>Acceso para la captura, o sus fotos si tienen la calidad.</li>
                <li>Su logo y sus colores.</li>
                <li>El enlace de su motor de reservas o su WhatsApp.</li>
                <li>Quien maneje su dominio, para agregar un registro.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 6 · Precios */}
        <section className={`${s.blk} ${s.alt}`} id="precios">
          <div className={s.wrap}>
            <div className={`${s.secHead} ${s.reveal}`}>
              <div className={s.kicker}>Precios</div>
              <h2>Una implementación y una mensualidad.</h2>
              <p className={s.lead}>Valores de referencia en pesos colombianos. Cada propuesta los confirma, con o sin IVA.</p>
            </div>
            <div className={`${s.prices} ${s.reveal}`}>
              {PRICES.map((p) => (
                <div key={p.name} className={`${s.pcard} ${p.star ? s.star : ''}`}>
                  {p.star ? <span className={s.starTag}>Recomendado para empezar</span> : null}
                  <h3>{p.name}</h3>
                  <p className={s.for}>{p.for}</p>
                  <ul>
                    {p.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                  <div className={s.amt}>
                    <div>
                      Implementación<b>{p.impl}</b>
                    </div>
                    <div>
                      Mensualidad<b>{p.month}</b>
                    </div>
                  </div>
                  {p.example.href.startsWith('#') ? (
                    <a className={s.ex} href={p.example.href}>
                      {p.example.label} <span className={s.arr}>→</span>
                    </a>
                  ) : (
                    <Link className={s.ex} href={p.example.href as Route}>
                      {p.example.label} <span className={s.arr}>→</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <p className={`${s.medida} ${s.reveal}`}>
              ¿Varias sedes o una cadena? Lo armamos a la medida.{' '}
              <a href="#cotizar">
                Hablemos <span className={s.arr}>→</span>
              </a>
            </p>
            <div className={`${s.pextra} ${s.reveal}`}>
              <div>
                <h4>La mensualidad incluye</h4>
                <p>Alojamiento, CDN y transferencia dentro del límite del plan, mantenimiento, copias de seguridad, soporte, panel y analítica básica.</p>
              </div>
              <div>
                <h4>Se cotizan aparte</h4>
                <p>
                  La página web sola, fotografía o 360° extra, dron, modelado de áreas nuevas, nuevas unidades o sedes, traducción, integración
                  con motor de reservas o PMS, desplazamientos fuera de Bogotá.
                </p>
              </div>
              <div>
                <h4>Forma de pago</h4>
                <p>40 % al aprobar la propuesta, 40 % con la versión de prueba y 20 % al publicar.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 7 · Clientes: oculta hasta el primer caso real */}

        {/* 8 · Mamut Herd */}
        <section className={`${s.blk} ${s.alt}`} id="mamut" style={{ borderTop: '1px solid var(--line-2)' }}>
          <div className={`${s.wrap} ${s.mamut}`}>
            <div className={s.reveal}>
              <div className={s.mk}>
                <MamutMark className="h-auto w-[62px]" />
                <span>
                  Un producto de
                  <br />
                  {ANTESALA.brandOwner}
                </span>
              </div>
              <h2>Hecho por {ANTESALA.brandOwner}.</h2>
              <p className={s.lead}>Una casa de productos digitales que también ayuda a empresas pequeñas a crecer. Antesala es uno de sus productos.</p>
            </div>
            <div className={s.reveal}>
              <div className={s.who}>
                <div className={s.kicker} style={{ marginBottom: 18 }}>
                  Quién lo hace
                </div>
                <b>JACOBO LÓPEZ</b>
                <span>Bogotá, Colombia. Diseña y desarrolla Antesala y acompaña cada implementación de principio a fin.</span>
              </div>
            </div>
          </div>
        </section>

        {/* 9 · Preguntas */}
        <section className={`${s.blk} ${s.ivory}`} id="preguntas">
          <div className={s.wrap}>
            <div className={`${s.secHead} ${s.reveal}`}>
              <div className={s.kicker}>Preguntas</div>
              <h2>Lo que suelen preguntar.</h2>
            </div>
            <div className={`${s.faq} ${s.reveal}`}>
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 10 · Cotización */}
        <section className={s.blk} id="cotizar">
          <div className={`${s.wrap} ${s.quote}`}>
            <div className={s.reveal}>
              <div className={s.kicker}>Cotización</div>
              <h2 style={{ marginTop: 22 }}>¿Cómo se vería su hotel?</h2>
              <p className={s.lead}>Cuéntenos de su hotel y le respondemos con una propuesta.</p>
              <div className={s.contact}>
                <span>
                  <span className={s.tiny} style={{ display: 'block', marginBottom: 4 }}>
                    WhatsApp
                  </span>
                  <a href={`https://wa.me/${ANTESALA.whatsapp}`} target="_blank" rel="noopener noreferrer">
                    +57 320 487 1882
                  </a>
                </span>
                <span>
                  <span className={s.tiny} style={{ display: 'block', marginBottom: 4 }}>
                    Correo
                  </span>
                  <a href={`mailto:${ANTESALA.email}`}>{ANTESALA.email}</a>
                </span>
              </div>
            </div>
            <div className={s.reveal}>
              <QuoteForm whatsapp={ANTESALA.whatsapp} email={ANTESALA.email} />
            </div>
          </div>
        </section>
      </main>

      {/* 11 · Pie */}
      <footer className={s.footer}>
        <div className={s.wrap}>
          <div className={s.foot}>
            <div>
              <AntesalaLogo tone="oscuro" symbolClassName="h-11 w-auto" wordClassName="text-base" />
              <p className={s.tiny} style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                <MamutMark className="h-auto w-5" />
                Un producto de {ANTESALA.brandOwner}
              </p>
            </div>
            <nav className={s.footNav} aria-label="Pie de página">
              <a href="#recorrido">Recorrido</a>
              <a href="#precios">Precios</a>
              <a href="#demos">Demos</a>
              <a href="#cotizar">Cotizar</a>
              <a href="#mamut">{ANTESALA.brandOwner}</a>
              <ReplayIntro />
            </nav>
          </div>
          <div className={`${s.legal} ${s.tiny}`}>
            <span>
              © 2026 {ANTESALA.company} · {ANTESALA.city}
            </span>
            <span>Niebla Alta es un hotel ficticio. Imágenes ilustrativas.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
