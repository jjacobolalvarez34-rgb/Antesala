/* eslint-disable @next/next/no-img-element -- capturas estáticas livianas en public/producto */
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Globe,
  Layers,
  MessageCircle,
  Plus,
  Smartphone,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { ANTESALA, antesalaWhatsApp } from '@/lib/antesala';
import { routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Antesala · El hotel, antes de llegar',
  description:
    'Recorrido 3D del edificio, cada piso y cada habitación para hoteles boutique y apartahoteles en Colombia. El huésped elige su habitación exacta y reserva directo.',
};

const demo = routes.hotel(ANTESALA.demoSlug);
const contact = antesalaWhatsApp('Hola, vi Antesala y me interesa para mi hotel. ¿Podemos hablar?');

const steps = [
  { img: '/producto/paso-edificio.webp', title: 'El edificio', text: 'Su fachada real, de día y de noche, con las zonas comunes.' },
  { img: '/producto/paso-piso.webp', title: 'El piso', text: 'Sale del edificio como un cajón y muestra la planta amoblada.' },
  { img: '/producto/paso-habitacion.webp', title: 'La habitación', text: 'Cada espacio se toca, con su área, su vista y su precio.' },
  { img: '/producto/paso-adentro.webp', title: 'Por dentro', text: 'En 360°, y de ahí a reservar por WhatsApp.' },
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
];

function Phone({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[2.25rem] border-[6px] border-ink bg-ink shadow-[0_30px_60px_-20px_rgb(28_27_25/0.45)] ${className}`}>
      <img src={src} alt={alt} width={585} height={1266} className="block aspect-[585/1266] w-full object-cover" />
    </div>
  );
}

export default function Home() {
  return (
    <div className="bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 md:px-10 md:py-7">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Antesala
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1 text-sm md:gap-6">
          <a href="#como-funciona" className="hidden min-h-11 items-center hover:text-accent md:inline-flex">
            Cómo funciona
          </a>
          <a href="#sin-pagina" className="hidden min-h-11 items-center hover:text-accent md:inline-flex">
            Sin página web
          </a>
          <Link
            href={demo}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink/20 px-4 font-medium transition-colors hover:border-ink"
          >
            Ver la demo <ArrowRight aria-hidden className="size-4" />
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-12 px-5 pt-8 pb-16 md:grid-cols-12 md:items-center md:px-10 md:pt-14 md:pb-24">
          <div className="md:col-span-6">
            <p className="eyebrow">Para hoteles boutique y apartahoteles</p>
            <h1 className="mt-5 font-display text-[3.25rem] leading-[0.95] tracking-tight text-balance md:text-[5.25rem]">
              Que el huésped elija su habitación antes de reservar.
            </h1>
            <p className="mt-6 max-w-md text-lg text-pretty text-muted-foreground">
              El edificio en 3D, cada piso y cada habitación por dentro, desde el celular. Y la reserva te llega directo, sin
              comisión.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={demo}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-bone transition-[background-color,transform] duration-200 hover:bg-ink/88 active:scale-[0.98]"
              >
                Recorrer el hotel de demostración <ArrowRight aria-hidden className="size-4" />
              </Link>
              <a
                href={contact}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ink/20 px-6 text-sm font-medium transition-colors hover:border-ink"
              >
                <MessageCircle aria-hidden className="size-4" /> Hablemos
              </a>
            </div>
          </div>
          <div className="relative mx-auto flex w-full max-w-md items-end justify-center md:col-span-6 md:max-w-none">
            <Phone src="/producto/paso-piso.webp" alt="Un piso abierto con la planta amoblada" className="w-[44%] translate-x-[18%] translate-y-6 -rotate-6 opacity-95" />
            <Phone src="/producto/paso-edificio.webp" alt="El edificio del hotel en 3D desde el celular" className="relative z-10 w-[50%]" />
            <Phone src="/producto/paso-adentro.webp" alt="Una habitación vista por dentro" className="w-[44%] -translate-x-[18%] translate-y-6 rotate-6 opacity-95" />
          </div>
        </section>

        {/* El problema */}
        <section className="bg-ink text-bone">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-12 md:items-center md:px-10 md:py-24">
            <p className="font-display text-[5.5rem] leading-none text-accent-on-dark md:col-span-4 md:text-[8rem]">15 %</p>
            <div className="md:col-span-8">
              <h2 className="font-display text-[2rem] leading-[1.1] text-balance md:text-5xl">
                o más se queda la plataforma de cada reserva. Y el huésped reserva a ciegas: ocho fotos y ni idea de en qué piso
                queda.
              </h2>
              <p className="mt-6 max-w-xl text-pretty text-bone/70">
                Antesala le muestra el hotel completo a quien ya te encontró, para que elija mejor y reserve directo contigo.
              </p>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" aria-labelledby="titulo-como" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-20 md:px-10 md:py-28">
          <p className="eyebrow">Cómo funciona</p>
          <h2 id="titulo-como" className="mt-3 max-w-2xl font-display text-[2.5rem] leading-[1.05] text-balance md:text-6xl">
            Del edificio a la reserva, en cuatro toques.
          </h2>
          <ol className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-8">
            {steps.map((s, i) => (
              <li key={s.title}>
                <Phone src={s.img} alt={`${s.title}: ${s.text}`} />
                <p className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-xl text-accent">{i + 1}</span>
                  <span className="font-medium">{s.title}</span>
                </p>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Lo que gana el hotel */}
        <section aria-labelledby="titulo-gana" className="border-y border-border bg-secondary/60">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-10 md:py-28">
            <p className="eyebrow">Lo que gana tu hotel</p>
            <h2 id="titulo-gana" className="mt-3 max-w-2xl font-display text-[2.5rem] leading-[1.05] text-balance md:text-6xl">
              No es solo que se vea bonito.
            </h2>
            <ul className="mt-12 grid gap-px overflow-hidden rounded-[1.5rem] border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {gains.map(({ icon: Icon, title, text }) => (
                <li key={title} className="bg-background p-7">
                  <Icon aria-hidden className="size-6 text-accent" strokeWidth={1.5} />
                  <h3 className="mt-5 font-display text-2xl">{title}</h3>
                  <p className="mt-2 text-sm text-pretty text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Para hoteles sin página web */}
        <section id="sin-pagina" aria-labelledby="titulo-sin" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-20 md:px-10 md:py-28">
          <div className="grid gap-12 md:grid-cols-12 md:items-center">
            <div className="md:col-span-5">
              <p className="eyebrow flex items-center gap-2">
                <Globe aria-hidden className="size-3.5" /> ¿Tu hotel no tiene página?
              </p>
              <h2 id="titulo-sin" className="mt-3 font-display text-[2.5rem] leading-[1.05] text-balance md:text-5xl">
                Antesala también es tu sitio web.
              </h2>
              <p className="mt-5 text-pretty text-muted-foreground">
                Muchos hoteles venden solo por las plataformas. Con Antesala tienes tu propia página, con tu dominio, lista para
                compartir en Instagram, Google y WhatsApp.
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {['Portada con el edificio', 'Habitaciones y precios', 'Recorrido 3D', 'Servicios y zonas comunes', 'Ubicación y políticas', 'Reserva por WhatsApp'].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-2">
                      <span aria-hidden className="size-1.5 rounded-full bg-accent" />
                      {t}
                    </li>
                  ),
                )}
              </ul>
              <Link href={demo} className="mt-8 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
                Ver la página del hotel de demostración <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            <figure className="md:col-span-7">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_60px_-25px_rgb(28_27_25/0.35)]">
                <div aria-hidden className="flex items-center gap-1.5 border-b border-border px-4 py-3">
                  <span className="size-2.5 rounded-full bg-ink/15" />
                  <span className="size-2.5 rounded-full bg-ink/15" />
                  <span className="size-2.5 rounded-full bg-ink/15" />
                  <span className="ml-3 truncate rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">tuhotel.com</span>
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

        {/* Cómo empezamos */}
        <section aria-labelledby="titulo-empezar" className="bg-ink text-bone">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-10 md:py-28">
            <p className="text-xs tracking-[0.2em] text-bone/60 uppercase">Cómo empezamos</p>
            <h2 id="titulo-empezar" className="mt-3 max-w-2xl font-display text-[2.5rem] leading-[1.05] text-balance md:text-6xl">
              Un piloto con tu edificio.
            </h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                { icon: Building2, t: 'Nos cuentas de tu hotel', d: 'Planos o medidas, tipos de habitación y precios. Una llamada de 20 minutos.' },
                { icon: Layers, t: 'Montamos tu edificio', d: 'El 3D desde los planos y fotos 360° de cada tipo de habitación, tomadas en una visita.' },
                { icon: Globe, t: 'Lo publicamos', d: 'Con tu marca y tu dominio, conectado a tu WhatsApp o a tu motor de reservas.' },
              ].map(({ icon: Icon, t, d }, i) => (
                <li key={t} className="border-t border-bone/15 pt-6">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-3xl text-accent-on-dark">{i + 1}</span>
                    <Icon aria-hidden className="size-5 text-bone/60" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 font-display text-2xl">{t}</h3>
                  <p className="mt-2 text-sm text-pretty text-bone/70">{d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <a
                href={contact}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent-on-dark px-6 text-sm font-medium text-ink transition-colors hover:bg-bone"
              >
                <MessageCircle aria-hidden className="size-4" /> Quiero un piloto
              </a>
              <Link
                href={routes.panel(ANTESALA.demoSlug)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-bone/30 px-6 text-sm font-medium transition-colors hover:bg-bone/10"
              >
                Ver el panel del hotel
              </Link>
            </div>
          </div>
        </section>

        {/* Preguntas */}
        <section aria-labelledby="titulo-preguntas" className="mx-auto grid max-w-6xl gap-8 px-5 py-20 md:grid-cols-12 md:px-10 md:py-28">
          <h2 id="titulo-preguntas" className="font-display text-[2.5rem] leading-[1.05] md:col-span-4 md:text-5xl">
            Preguntas
          </h2>
          <div className="divide-y divide-border border-y border-border md:col-span-8">
            {faq.map((f) => (
              <details key={f.q} className="group py-1">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <Plus aria-hidden className="size-5 shrink-0 transition-transform duration-300 group-open:rotate-45" />
                </summary>
                <p className="pb-5 text-pretty text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-10">
          <p>
            <span className="font-display text-xl text-foreground">Antesala</span>
            <span className="ml-3">El hotel, antes de llegar · {ANTESALA.city}</span>
          </p>
          <div className="flex gap-6">
            <Link href={demo} className="hover:text-foreground">
              Demo
            </Link>
            <a href={contact} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
