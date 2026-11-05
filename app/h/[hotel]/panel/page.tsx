import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Info } from 'lucide-react';

import { DailyChart } from '@/components/panel/DailyChart';
import { getHotelBundle } from '@/lib/content';
import { formatCOP, unitPrice } from '@/lib/hotel';

export const metadata: Metadata = { title: 'Panel del hotel', robots: { index: false } };

/**
 * Panel de métricas SIMULADAS (bloque 6): lo que vería el gerente con
 * Antesala. Muestra el argumento de venta: reservas directas = comisión de
 * OTA ahorrada. Datos deterministas generados desde el contenido del hotel.
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OTA_COMMISSION = 0.15;

export default async function PanelPage({ params }: PageProps<'/h/[hotel]/panel'>) {
  const bundle = await getHotelBundle((await params).hotel);
  if (!bundle) notFound();
  const { hotel } = bundle;
  const rand = mulberry32(hotel.slug.length * 977);

  // 30 días de visitas con estacionalidad semanal (fines de semana más altos)
  const end = new Date('2026-11-03T12:00:00Z');
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(end.getTime() - (29 - i) * 86_400_000);
    const weekend = [5, 6].includes(d.getUTCDay()) ? 1.35 : 1;
    const trend = 1 + i * 0.012;
    return { date: d.toISOString().slice(0, 10), value: Math.round((52 + rand() * 30) * weekend * trend) };
  });
  const visits = days.reduce((s, d) => s + d.value, 0);
  const tours = Math.round(visits * 0.71);
  const clicks = Math.round(visits * 0.046);
  const direct = Math.round(clicks * 0.31);
  const prices = hotel.units.map(unitPrice).filter((p): p is number => p !== undefined);
  const adr = prices.reduce((s, p) => s + p, 0) / Math.max(1, prices.length);
  const nights = 3.2;
  const saved = direct * adr * nights * OTA_COMMISSION;

  const units = hotel.units
    .map((u) => ({ name: u.name, views: Math.round(visits * (0.12 + rand() * 0.22) * (u.featured ? 1.4 : 1)) }))
    .sort((a, b) => b.views - a.views);
  const maxViews = units[0]?.views ?? 1;

  const kpis = [
    { label: 'Visitas (30 días)', value: visits.toLocaleString('es-CO') },
    { label: 'Recorridos 3D', value: tours.toLocaleString('es-CO'), note: `${Math.round((tours / visits) * 100)} % de las visitas` },
    { label: 'Clics a reservar', value: clicks.toLocaleString('es-CO'), note: `${((clicks / visits) * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} % de conversión` },
    { label: 'Reservas directas', value: direct.toLocaleString('es-CO'), note: 'por WhatsApp' },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 pb-16 md:px-10">
      <header className="pt-8 md:pt-14">
        <p className="eyebrow">{hotel.name} · panel del hotel</p>
        <h1 className="mt-3 font-display text-display md:text-6xl">Últimos 30 días</h1>
        <p role="note" className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-sm">
          <Info aria-hidden className="size-4 text-accent" />
          Datos simulados para la demo
        </p>
      </header>

      <section aria-label="Comisión ahorrada" className="mt-8 rounded-3xl bg-ink p-6 text-bone md:p-8">
        <p className="text-xs tracking-[0.12em] text-bone/60 uppercase">Comisión de OTA ahorrada (estimado)</p>
        <p className="mt-2 font-display text-[3.25rem] leading-none md:text-7xl">{formatCOP(saved)}</p>
        <p className="mt-3 max-w-xl text-sm text-pretty text-bone/75">
          {direct} reservas directas × tarifa promedio {formatCOP(adr)} × {nights.toString().replace('.', ',')} noches ×{' '}
          {OTA_COMMISSION * 100} % que habría cobrado una OTA.
        </p>
      </section>

      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
            <dt className="eyebrow">{k.label}</dt>
            <dd className="mt-1 font-display text-title">{k.value}</dd>
            {k.note ? <dd className="text-xs text-muted-foreground">{k.note}</dd> : null}
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 md:grid-cols-5">
        <section aria-labelledby="serie" className="rounded-3xl border border-border bg-card p-5 md:col-span-3">
          <h2 id="serie" className="font-medium">
            Visitas por día
          </h2>
          <div className="mt-3">
            <DailyChart points={days} label="Visitas por día en los últimos 30 días" />
          </div>
        </section>

        <section aria-labelledby="ranking" className="rounded-3xl border border-border bg-card p-5 md:col-span-2">
          <h2 id="ranking" className="font-medium">
            Unidades más vistas
          </h2>
          <ol className="mt-4 space-y-3">
            {units.map((u) => (
              <li key={u.name} title={`${u.name}: ${u.views.toLocaleString('es-CO')} vistas`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{u.name}</span>
                  <span className="font-medium tabular-nums">{u.views.toLocaleString('es-CO')}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${(u.views / maxViews) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
