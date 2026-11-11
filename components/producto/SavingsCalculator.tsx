'use client';

import { useId, useState } from 'react';

import { formatCOP } from '@/lib/hotel';

/**
 * Calculadora de ahorro (página de Antesala): cuánta comisión deja de pagarse al
 * mes si una parte de las reservas pasa de la plataforma a la reserva directa.
 * Es una estimación con los datos que pone el gerente; se dice así en pantalla.
 */
const FIELDS = [
  { key: 'rooms', label: 'Habitaciones', min: 4, max: 80, step: 1, format: (v: number) => String(v) },
  { key: 'rate', label: 'Tarifa promedio por noche', min: 120_000, max: 900_000, step: 10_000, format: formatCOP },
  { key: 'occupancy', label: 'Ocupación', min: 30, max: 95, step: 5, format: (v: number) => `${v} %` },
  { key: 'shift', label: 'Reservas que pasan a directo', min: 5, max: 50, step: 5, format: (v: number) => `${v} %` },
  { key: 'commission', label: 'Comisión de la plataforma', min: 10, max: 25, step: 1, format: (v: number) => `${v} %` },
] as const;

type Key = (typeof FIELDS)[number]['key'];

export function SavingsCalculator() {
  const id = useId();
  const [v, setV] = useState<Record<Key, number>>({ rooms: 20, rate: 300_000, occupancy: 65, shift: 20, commission: 15 });
  const nights = v.rooms * 30 * (v.occupancy / 100);
  const monthly = nights * v.rate * (v.shift / 100) * (v.commission / 100);
  const yearly = monthly * 12;
  const round = (n: number) => Math.round(n / 10_000) * 10_000;

  return (
    <div className="grid overflow-hidden rounded-[2px] border border-border bg-card md:grid-cols-12">
      <form className="flex flex-col gap-6 p-7 md:col-span-7 md:p-10" onSubmit={(e) => e.preventDefault()}>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <div className="flex items-baseline justify-between gap-4">
              <label htmlFor={`${id}-${f.key}`} className="text-sm">
                {f.label}
              </label>
              <output htmlFor={`${id}-${f.key}`} className="font-display text-xl tabular-nums">
                {f.format(v[f.key])}
              </output>
            </div>
            <input
              id={`${id}-${f.key}`}
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={v[f.key]}
              onChange={(e) => setV((s) => ({ ...s, [f.key]: Number(e.target.value) }))}
              className="mt-2 h-11 w-full cursor-pointer accent-[var(--accent)]"
            />
          </div>
        ))}
      </form>
      <div className="flex flex-col justify-between gap-8 bg-ink p-7 text-bone md:col-span-5 md:p-10">
        <div aria-live="polite">
          <p className="text-xs tracking-[0.2em] text-bone/60 uppercase">Comisión que dejas de pagar</p>
          <p className="mt-3 font-display text-[3.25rem] leading-none tabular-nums md:text-6xl">{formatCOP(round(monthly))}</p>
          <p className="mt-1 text-sm text-bone/70">al mes</p>
          <p className="mt-6 font-display text-3xl tabular-nums text-accent-on-dark">{formatCOP(round(yearly))}</p>
          <p className="mt-1 text-sm text-bone/70">al año</p>
        </div>
        <p className="text-xs text-pretty text-bone/55">
          Estimación con tus datos: {Math.round(nights)} noches vendidas al mes, de las que el {v.shift} % pasa a reserva directa. No incluye
          el extra por vista ni las categorías más caras que se venden al verlas.
        </p>
      </div>
    </div>
  );
}
