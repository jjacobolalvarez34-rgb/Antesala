/* eslint-disable @next/next/no-img-element -- capturas y fotos estáticas livianas */
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  Globe,
  Layers,
  MessageCircle,
  Plus,
  Smartphone,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';

import { DayNight } from '@/components/producto/DayNight';
import { SavingsCalculator } from '@/components/producto/SavingsCalculator';
import { ANTESALA, antesalaWhatsApp } from '@/lib/antesala';
import { mediaUrl } from '@/lib/media';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Antesala · El hotel, antes de llegar',
  description:
    'Recorrido 3D del edificio, cada piso y cada habitación para hoteles boutique y apartahoteles en Colombia. El huésped elige su habitación exacta y reserva directo.',
};

const demo = routes.hotel(ANTESALA.demoSlug);
const contact = antesalaWhatsApp('Hola, vi Antesala y me interesa para mi hotel. ¿Podemos hablar?');
const render = (file: string) => mediaUrl(ANTESALA.demoSlug, `media/renders/${file}`);

const steps = [
  { img: '/producto/paso-edificio.webp', title: 'El edificio', text: 'Su fachada real, de día y de noche, con las zonas comunes.' },
  { img: '/producto/paso-piso.webp', title: 'El piso', text: 'Sale del edificio como un cajón y muestra la planta amoblada.' },
  { img: '/producto/paso-habitacion.webp', title: 'La habitación', text: 'Cada espacio se toca, con su área, su vista y su precio.' },
  { img: '/producto/paso-adentro.webp', title: 'Por dentro', text: 'En 360°, y de ahí a reservar por WhatsApp.' },
];

const before = [
  '8 a 12 fotos sueltas',
  '"Habitación doble estándar"',
  'No se sabe en qué piso queda',
  'Ni qué se ve por la ventana',
  'La plataforma cobra 15 % o más',
];
const after = [
  'El edificio real, de día y de noche',
  'La habitación exacta, con su número',
  'El piso y la planta amoblada',
  'La vista desde su ventana',
  'La reserva llega directo a ti',
];

const gains = [
  {
    icon: TrendingUp,
    title: 'Cobra el piso alto',
    text: 'El huésped elige la 502 con vista a los cerros, no "una suite". Ese extra por vista hoy no se está cobrando.',
  },
  {
    icon: MessageCircle,
    title: 'Reserva directa',
    text: 'El mensaje llega a tu WhatsApp con la habitación y las fechas. Sin la comisión de la plataforma.',
  },
  {
    icon: Layers,
    title: 'Vende la categoría más cara',
    text: 'El comparador muestra las categorías lado a lado. Ver la diferencia hace que se elija la mejor.',
  },
  {
    icon: Smartphone,
    title: 'En cualquier celular',
    text: 'Se adapta al equipo. Si no hay 3D, el mismo recorrido funciona como lista con planos y fotos.',
  },
  { icon: BarChart3, title: 'Sabes qué se mira', text: 'Un panel con visitas, habitaciones más vistas y clics a reservar.' },
  { icon: Sparkles, title: 'Con tu marca', text: 'Tu nombre, tus colores y tu dominio. Antesala solo aparece en el pie de página.' },
];

const gallery = [
  { file: 'fachada-dia.jpg', label: 'La fachada', className: 'md:col-span-4 md:row-span-2' },
  { file: 'piso-6.jpg', label: 'El piso abierto', className: 'md:col-span-2' },
  { file: '402-sala.jpg', label: 'La sala', className: 'md:col-span-2' },
  { file: '601-terraza.jpg', label: 'La terraza', className: 'md:col-span-3' },
  { file: '402-dormitorio.jpg', label: 'El dormitorio', className: 'md:col-span-3' },
];

const faq = [
  {
    q: '¿Qué necesitan de mi hotel?',
    a: 'Los planos del edificio (o medidas, si no hay planos), una visita para tomar fotos 360° de cada tipo de habitación y tus precios. Del resto nos encargamos.',
  },
  {
    q: '¿Reemplaza a Booking?',
    a: 'No. Booking te sigue trayendo huéspedes nuevos. Antesala hace que quien ya te encontró reserve directo contigo, y que elija una habitación mejor.',
  },
  {
    q: '¿Funciona con mi motor de reservas?',
    a: 'Sí. El botón de reservar puede ir a WhatsApp o a tu motor actual, con la habitación ya elegida.',
  },
  {
    q: '¿Y si no tengo página web?',
    a: 'Antesala es también tu página: portada, habitaciones, servicios, ubicación, políticas y reserva, con tu dominio.',
  },
  {
    q: '¿Cómo se ve la disponibilidad?',
    a: 'Las habitaciones ocupadas se pueden recorrer igual, pero en vez de reservar proponen la más parecida que esté libre. De noche, sus ventanas están encendidas.',
  },
];

function Phone({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[2.25rem] border-[6px] border-ink bg-ink shadow-[0_30px_60px_-20px_rgb(28_27_25/0.45)] ${className}`}>
      <img src={src} alt={alt} width={585} height={1266} loading="lazy" className="block aspect-[585/1266] w-full object-cover" />
    </div>
  );
}

/** Celular del hero: pasa solo por los cuatro pasos (CSS; quieto con movimiento reducido). */
function PhoneSlides({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[2.5rem] border-[7px] border-[#0f0e0d] bg-ink shadow-[0_40px_80px_-24px_rgb(0_0_0/0.7)] ${className}`}>
      <div className="phone-slides relative aspect-[585/1266]">
        {steps.map((s, i) => (
          <img
            key={s.img}
            src={s.img}
            alt={i === 0 ? 'El recorrido de un hotel en el celular: edificio, piso, habitación y por dentro' : ''}
            aria-hidden={i === 0 ? undefined : true}
            width={585}
            height={1266}
            fetchPriority={i === 0 ? 'high' : undefined}
            className="absolute inset-0 size-full object-cover"
          />
        ))}
      </div>
    </div>
  );
}

/** Encabezado de sección numerado. */
function Kicker({ n, children, dark = false }: { n: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-xs tracking-[0.2em] uppercase ${dark ? 'text-bone/60' : 'text-muted-foreground'}`}>
      <span className={`font-display text-base tracking-normal ${dark ? 'text-accent-on-dark' : 'text-accent'}`}>{n}</span>
      <span aria-hidden className={`h-px w-8 ${dark ? 'bg-bone/25' : 'bg-ink/20'}`} />
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <div className="bg-background text-foreground">
      {/* Navegación flotante: se lee sobre el hero oscuro y sobre las secciones claras */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-3 md:px-6 md:pt-5">
        <div className="glass-dark pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full py-2 pr-2 pl-5 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.5)]">
          <Link href="/" className="font-display text-2xl tracking-tight text-bone">
            Antesala
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-1 text-sm text-bone/80 md:gap-2">
            <a href="#como-funciona" className="hidden min-h-11 items-center rounded-full px-3 transition-colors hover:text-bone lg:inline-flex">
              Cómo funciona
            </a>
            <a href="#ahorro" className="hidden min-h-11 items-center rounded-full px-3 transition-colors hover:text-bone lg:inline-flex">
              Cuánto ahorras
            </a>
            <a href="#sin-pagina" className="hidden min-h-11 items-center rounded-full px-3 transition-colors hover:text-bone lg:inline-flex">
              Sin página web
            </a>
            <Link
              href={demo}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-bone px-4 font-medium text-ink transition-colors hover:bg-bone/85"
            >
              Ver la demo <ArrowRight aria-hidden className="size-4" />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero: el edificio de noche, a pantalla completa */}
        <section className="relative isolate overflow-hidden bg-ink text-bone">
          <img
            src={render('fachada-noche.jpg')}
            alt=""
            width={1600}
            height={1000}
            fetchPriority="high"
            className="absolute inset-0 -z-20 size-full object-cover object-[60%_center] opacity-70"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/60 via-ink/55 to-ink md:bg-gradient-to-r md:from-ink md:via-ink/80 md:to-ink/20" />
          <div className="mx-auto grid min-h-[100svh] max-w-6xl items-center gap-12 px-5 pt-32 pb-20 md:grid-cols-12 md:px-10 md:pt-36">
            <div className="md:col-span-7">
              <p className="text-xs tracking-[0.22em] text-bone/65 uppercase">Para hoteles boutique y apartahoteles</p>
              <h1 className="mt-6 font-display text-[3.5rem] leading-[0.92] tracking-tight text-balance md:text-[6.25rem]">
                Que el huésped elija su habitación <em className="text-accent-on-dark">antes</em> de reservar.
              </h1>
              <p className="mt-7 max-w-lg text-lg text-pretty text-bone/75">
                El edificio en 3D, cada piso y cada habitación por dentro, desde el celular. Y la reserva te llega directo, sin comisión.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={demo}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-accent-on-dark px-7 text-sm font-medium text-ink transition-[background-color,transform] duration-200 hover:bg-bone active:scale-[0.98]"
                >
                  Recorrer el hotel de demostración <ArrowRight aria-hidden className="size-4" />
                </Link>
                <a
                  href={contact}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-bone/30 px-7 text-sm font-medium transition-colors hover:bg-bone/10"
                >
                  <MessageCircle aria-hidden className="size-4" /> Hablemos
                </a>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-bone/65">
                {['Sin descargar nada', 'En cualquier celular', 'Con tu marca y tu dominio'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check aria-hidden className="size-4 text-accent-on-dark" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative mx-auto w-[62%] max-w-[300px] md:col-span-5 md:w-full md:max-w-[320px]">
              <div aria-hidden className="absolute -inset-10 -z-10 rounded-full bg-accent-on-dark/20 blur-3xl" />
              <PhoneSlides className="rotate-[3deg]" />
            </div>
          </div>
          <a
            href="#problema"
            aria-label="Seguir bajando"
            className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-bone/50 transition-colors hover:text-bone md:block"
          >
            <span className="block h-10 w-px animate-pulse bg-current motion-reduce:animate-none" />
          </a>
        </section>

        {/* 01 · El problema */}
        <section id="problema" aria-labelledby="titulo-problema" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24 md:px-10 md:py-36">
          <div className="reveal">
            <Kicker n="01">El problema</Kicker>
            <h2 id="titulo-problema" className="mt-8 max-w-4xl font-display text-[2.25rem] leading-[1.08] text-balance md:text-[3.75rem]">
              La plataforma se queda con <span className="text-accent">15 % o más</span> de cada reserva. Y el huésped reserva a ciegas.
            </h2>
          </div>
          <div className="reveal mt-14 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] border border-border p-8 md:p-10">
              <p className="eyebrow">Hoy, en la plataforma</p>
              <ul className="mt-7 flex flex-col gap-4">
                {before.map((t) => (
                  <li key={t} className="flex items-start gap-3 text-muted-foreground">
                    <X aria-hidden className="mt-0.5 size-4 shrink-0 opacity-60" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[1.75rem] bg-ink p-8 text-bone md:p-10">
              <p className="text-xs tracking-[0.2em] text-accent-on-dark uppercase">Con Antesala</p>
              <ul className="mt-7 flex flex-col gap-4">
                {after.map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-on-dark" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 02 · Cómo funciona */}
        <section id="como-funciona" aria-labelledby="titulo-como" className="scroll-mt-24 bg-ink text-bone">
          <div className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-36">
            <div className="reveal flex flex-wrap items-end justify-between gap-6">
              <div>
                <Kicker n="02" dark>
                  Cómo funciona
                </Kicker>
                <h2 id="titulo-como" className="mt-8 max-w-2xl font-display text-[2.5rem] leading-[1.02] text-balance md:text-[4.25rem]">
                  Del edificio a la reserva, en cuatro toques.
                </h2>
              </div>
              <Link href={demo} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent-on-dark hover:text-bone">
                Probarlo ahora <ArrowUpRight aria-hidden className="size-4" />
              </Link>
            </div>
            <ol className="mt-16 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4 md:gap-8">
              {steps.map((s, i) => (
                <li key={s.title} className="reveal" style={{ animationDelay: `${i * 80}ms` }}>
                  <Phone src={s.img} alt={`${s.title}: ${s.text}`} className="border-[#0f0e0d]" />
                  <p className="mt-6 flex items-baseline gap-2.5">
                    <span className="font-display text-2xl text-accent-on-dark">{i + 1}</span>
                    <span className="font-medium">{s.title}</span>
                  </p>
                  <p className="mt-1.5 text-sm text-pretty text-bone/65">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 03 · Así se ve */}
        <section aria-labelledby="titulo-galeria" className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-36">
          <div className="reveal">
            <Kicker n="03">Así se ve</Kicker>
            <h2 id="titulo-galeria" className="mt-8 max-w-3xl font-display text-[2.5rem] leading-[1.02] text-balance md:text-[4.25rem]">
              Tu hotel completo, por fuera y por dentro.
            </h2>
          </div>
          <ul className="mt-14 grid auto-rows-[13rem] grid-cols-2 gap-3 md:auto-rows-[15rem] md:grid-cols-6 md:gap-4">
            {gallery.map((g, i) => (
              <li
                key={g.file}
                className={`reveal group relative overflow-hidden rounded-[1.5rem] bg-ink ${i === 0 ? 'col-span-2 row-span-2' : ''} ${g.className}`}
              >
                <img
                  src={render(g.file)}
                  alt={`${g.label} del hotel de demostración (imagen ilustrativa)`}
                  width={1600}
                  height={1000}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                />
                <span className="absolute bottom-3 left-3 rounded-full bg-bone/90 px-3 py-1 text-xs font-medium text-ink">{g.label}</span>
              </li>
            ))}
          </ul>
          <div className="reveal mt-20 md:mt-28">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h3 className="font-display text-[2rem] leading-[1.05] md:text-5xl">De día y de noche.</h3>
              <p className="max-w-xs text-sm text-pretty text-muted-foreground">
                Arrastra la línea. De noche se encienden las habitaciones ocupadas: la disponibilidad se ve.
              </p>
            </div>
            <DayNight day={render('fachada-dia.jpg')} night={render('fachada-noche.jpg')} alt="El edificio del hotel de demostración" />
          </div>
        </section>

        {/* 04 · Lo que gana el hotel */}
        <section aria-labelledby="titulo-gana" className="border-y border-border bg-secondary/60">
          <div className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-36">
            <div className="reveal">
              <Kicker n="04">Lo que gana tu hotel</Kicker>
              <h2 id="titulo-gana" className="mt-8 max-w-2xl font-display text-[2.5rem] leading-[1.02] text-balance md:text-[4.25rem]">
                No es solo que se vea bonito.
              </h2>
            </div>
            <ul className="reveal mt-14 grid gap-px overflow-hidden rounded-[1.75rem] border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {gains.map(({ icon: Icon, title, text }) => (
                <li key={title} className="bg-background p-8 transition-colors duration-300 hover:bg-card">
                  <span className="grid size-11 place-items-center rounded-full bg-accent/10">
                    <Icon aria-hidden className="size-5 text-accent" strokeWidth={1.6} />
                  </span>
                  <h3 className="mt-6 font-display text-[1.75rem] leading-tight">{title}</h3>
                  <p className="mt-2 text-sm text-pretty text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 05 · Cuánto ahorras */}
        <section id="ahorro" aria-labelledby="titulo-ahorro" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24 md:px-10 md:py-36">
          <div className="reveal">
            <Kicker n="05">Cuánto ahorras</Kicker>
            <h2 id="titulo-ahorro" className="mt-8 max-w-2xl font-display text-[2.5rem] leading-[1.02] text-balance md:text-[4.25rem]">
              Haz la cuenta con tu hotel.
            </h2>
          </div>
          <div className="reveal mt-14">
            <SavingsCalculator />
          </div>
        </section>

        {/* 06 · Sin página web */}
        <section id="sin-pagina" aria-labelledby="titulo-sin" className="scroll-mt-24 bg-ink text-bone">
          <div className="mx-auto grid max-w-6xl gap-14 px-5 py-24 md:grid-cols-12 md:items-center md:px-10 md:py-36">
            <div className="reveal md:col-span-5">
              <Kicker n="06" dark>
                ¿Tu hotel no tiene página?
              </Kicker>
              <h2 id="titulo-sin" className="mt-8 font-display text-[2.5rem] leading-[1.02] text-balance md:text-[3.75rem]">
                Antesala también es tu sitio web.
              </h2>
              <p className="mt-6 text-pretty text-bone/70">
                Muchos hoteles venden solo por las plataformas. Con Antesala tienes tu propia página, con tu dominio, lista para compartir en
                Instagram, Google y WhatsApp.
              </p>
              <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {['Portada con el edificio', 'Habitaciones y precios', 'Recorrido 3D', 'Servicios y zonas comunes', 'Ubicación y políticas', 'Reserva por WhatsApp'].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Check aria-hidden className="size-4 text-accent-on-dark" /> {t}
                    </li>
                  ),
                )}
              </ul>
              <Link href={demo} className="mt-10 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent-on-dark hover:text-bone">
                Ver la página del hotel de demostración <ArrowUpRight aria-hidden className="size-4" />
              </Link>
            </div>
            <figure className="reveal md:col-span-7">
              <div className="overflow-hidden rounded-2xl border border-bone/10 bg-[#24221f] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)]">
                <div aria-hidden className="flex items-center gap-1.5 border-b border-bone/10 px-4 py-3">
                  <span className="size-2.5 rounded-full bg-bone/20" />
                  <span className="size-2.5 rounded-full bg-bone/20" />
                  <span className="size-2.5 rounded-full bg-bone/20" />
                  <span className="ml-3 truncate rounded-full bg-bone/10 px-3 py-1 text-xs text-bone/60">tuhotel.com</span>
                </div>
                <img
                  src="/producto/sitio-hotel.webp"
                  alt="Página web del hotel de demostración, hecha con Antesala"
                  width={1400}
                  height={1050}
                  loading="lazy"
                  className="block w-full"
                />
              </div>
            </figure>
          </div>
        </section>

        {/* 07 · Cómo empezamos */}
        <section aria-labelledby="titulo-empezar" className="mx-auto max-w-6xl px-5 py-24 md:px-10 md:py-36">
          <div className="reveal">
            <Kicker n="07">Cómo empezamos</Kicker>
            <h2 id="titulo-empezar" className="mt-8 max-w-2xl font-display text-[2.5rem] leading-[1.02] text-balance md:text-[4.25rem]">
              Un piloto con tu edificio.
            </h2>
          </div>
          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              { icon: Building2, t: 'Nos cuentas de tu hotel', d: 'Planos o medidas, tipos de habitación y precios. Una llamada de 20 minutos.' },
              { icon: Layers, t: 'Montamos tu edificio', d: 'El 3D desde los planos y fotos 360° de cada tipo de habitación, tomadas en una visita.' },
              { icon: Globe, t: 'Lo publicamos', d: 'Con tu marca y tu dominio, conectado a tu WhatsApp o a tu motor de reservas.' },
            ].map(({ icon: Icon, t, d }, i) => (
              <li key={t} className="reveal border-t border-ink/15 pt-7">
                <div className="flex items-center justify-between">
                  <span className="font-display text-5xl text-accent">{i + 1}</span>
                  <Icon aria-hidden className="size-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 font-display text-[1.75rem] leading-tight">{t}</h3>
                <p className="mt-2 text-sm text-pretty text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Preguntas */}
        <section aria-labelledby="titulo-preguntas" className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-24 md:grid-cols-12 md:px-10 md:py-32">
            <h2 id="titulo-preguntas" className="reveal font-display text-[2.5rem] leading-[1.02] md:col-span-4 md:text-6xl">
              Preguntas
            </h2>
            <div className="reveal divide-y divide-border border-y border-border md:col-span-8">
              {faq.map((f) => (
                <details key={f.q} className="group py-1">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border transition-colors group-open:bg-ink group-open:text-bone">
                      <Plus aria-hidden className="size-4 transition-transform duration-300 group-open:rotate-45" />
                    </span>
                  </summary>
                  <p className="max-w-xl pb-6 text-pretty text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Cierre */}
        <section className="px-3 pb-3 md:px-6 md:pb-6">
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-ink px-6 py-24 text-center text-bone md:rounded-[2.5rem] md:py-36">
            <img
              src={render('402-balcon.jpg')}
              alt=""
              width={1600}
              height={1000}
              loading="lazy"
              className="absolute inset-0 -z-20 size-full object-cover opacity-30"
            />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/40" />
            <h2 className="reveal mx-auto max-w-3xl font-display text-[2.75rem] leading-[1] text-balance md:text-[5.5rem]">
              Muestra tu hotel como es.
            </h2>
            <p className="reveal mx-auto mt-6 max-w-md text-pretty text-bone/70">
              Recorre el hotel de demostración y, si te sirve, armamos el piloto con tu edificio.
            </p>
            <div className="reveal mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={demo}
                className="inline-flex min-h-13 items-center gap-2 rounded-full bg-accent-on-dark px-7 text-sm font-medium text-ink transition-colors hover:bg-bone"
              >
                Ver la demo <ArrowRight aria-hidden className="size-4" />
              </Link>
              <a
                href={contact}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-13 items-center gap-2 rounded-full border border-bone/30 px-7 text-sm font-medium transition-colors hover:bg-bone/10"
              >
                <MessageCircle aria-hidden className="size-4" /> Quiero un piloto
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 text-sm text-muted-foreground md:flex-row md:items-end md:justify-between md:px-10">
          <div>
            <p className="font-display text-4xl text-foreground">Antesala</p>
            <p className="mt-2">El hotel, antes de llegar. Hecho en {ANTESALA.city}.</p>
          </div>
          <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href={demo} className="hover:text-foreground">
              Hotel de demostración
            </Link>
            <Link href={routes.panel(ANTESALA.demoSlug)} className="hover:text-foreground">
              Panel del hotel
            </Link>
            <a href={contact} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              WhatsApp
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
