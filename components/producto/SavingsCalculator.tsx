'use client';

import { Minus, Plus } from 'lucide-react';
import { useId, useState } from 'react';

import { formatCOP } from '@/lib/hotel';
import { cn } from '@/lib/utils';

/**
 * Calculadora de ahorro (página de Antesala): cuánta comisión deja de pagarse al
 * mes si una parte de las reservas pasa de la plataforma a la reserva directa.
 * Es una estimación con los datos que pone el gerente; se dice así en pantalla.
 * A la vista, solo tres datos fáciles (habitaciones, tarifa y ocupación); los dos
 * supuestos van en una frase y se ajustan aparte (Jacobo: "muchos filtros", 2026-11-13).
 */
const OCCUPANCY = [
  { v: 50, label: 'Baja', hint: '50 %' },
  { v: 65, label: 'Media', hint: '65 %' },
  { v: 80, label: 'Alta', hint: '80 %' },
] as const;

/** tamaño de letra que deja caber la cifra en el ancho de su tarjeta (container query) */
const fit = (text: string, max: string) => `min(${max}, calc(100cqw / ${(text.length * 0.6).toFixed(2)}))`;

export function SavingsCalculator() {
  const id = useId();
  const [rooms, setRooms] = useState(20);
  const [rate, setRate] = useState(300_000);
  const [occupancy, setOccupancy] = useState(65);
  const [shift, setShift] = useState(20);
  const [commission, setCommission] = useState(15);
  const nights = rooms * 30 * (occupancy / 100);
  const monthly = nights * rate * (shift / 100) * (commission / 100);
  const yearly = monthly * 12;
  const round = (n: number) => Math.round(n / 10_000) * 10_000;
  const label = 'text-[0.6875rem] font-medium tracking-[0.2em] text-muted-foreground uppercase';
  const stepBtn =
    'grid size-11 place-items-center rounded-[2px] border border-border transition-colors hover:border-ink/40 hover:bg-secondary disabled:opacity-40';

  return (
    <div className="grid overflow-hidden rounded-[2px] border border-border bg-card md:grid-cols-12">
      <form className="flex min-w-0 flex-col gap-8 p-7 md:col-span-7 md:p-10" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p id={`${id}-rooms`} className={label}>
              Habitaciones
            </p>
            <div role="group" aria-labelledby={`${id}-rooms`} className="mt-3 flex items-center gap-3">
              <button type="button" aria-label="Menos habitaciones" className={stepBtn} disabled={rooms <= 2} onClick={() => setRooms((r) => Math.max(2, r - (r > 20 ? 5 : 1)))}>
                <Minus aria-hidden className="size-4" />
              </button>
              <output aria-live="polite" className="min-w-[3ch] text-center font-display text-[2.25rem] leading-none tabular-nums">
                {rooms}
              </output>
              <button type="button" aria-label="Más habitaciones" className={stepBtn} disabled={rooms >= 200} onClick={() => setRooms((r) => Math.min(200, r + (r >= 20 ? 5 : 1)))}>
                <Plus aria-hidden className="size-4" />
              </button>
            </div>
          </div>
          <div>
            <p id={`${id}-occ`} className={label}>
              Ocupación
            </p>
            <div role="radiogroup" aria-labelledby={`${id}-occ`} className="mt-3 grid grid-cols-3 border border-border">
              {OCCUPANCY.map((o, i) => (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={occupancy === o.v}
                  onClick={() => setOccupancy(o.v)}
                  className={cn(
                    'flex min-h-11 flex-col items-center justify-center py-1.5 text-sm transition-colors',
                    i > 0 && 'border-l border-border',
                    occupancy === o.v ? 'bg-foreground text-background' : 'hover:bg-secondary',
                  )}
                >
                  {o.label}
                  <span className={cn('text-[0.6875rem]', occupancy === o.v ? 'text-background/70' : 'text-muted-foreground')}>{o.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={`${id}-rate`} className={label}>
              Tarifa promedio por noche
            </label>
            <output htmlFor={`${id}-rate`} className="font-display text-[1.75rem] leading-none tabular-nums">
              {formatCOP(rate)}
            </output>
          </div>
          <input
            id={`${id}-rate`}
            type="range"
            min={120_000}
            max={900_000}
            step={10_000}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="mt-3 h-11 w-full cursor-pointer accent-[var(--accent)]"
          />
        </div>
        <details className="group border-t border-border pt-5 text-sm">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-pretty text-ink/75 [&::-webkit-details-marker]:hidden">
            <span>
              Suponemos que el <strong className="font-medium text-ink">{shift} %</strong> de las reservas pasa a directo y que la plataforma cobra el{' '}
              <strong className="font-medium text-ink">{commission} %</strong>.
            </span>
            <span className="shrink-0 text-xs text-accent underline-offset-4 group-open:hidden hover:underline">Ajustar</span>
          </summary>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {(
              [
                ['shift', 'Pasa a directo', shift, setShift, 5, 50, 5],
                ['commission', 'Comisión de la plataforma', commission, setCommission, 10, 25, 1],
              ] as const
            ).map(([k, l, val, set, min, max, step]) => (
              <div key={k}>
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor={`${id}-${k}`} className="text-xs text-muted-foreground">
                    {l}
                  </label>
                  <output htmlFor={`${id}-${k}`} className="font-display text-lg tabular-nums">
                    {val} %
                  </output>
                </div>
                <input
                  id={`${id}-${k}`}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={val}
                  onChange={(e) => set(Number(e.target.value))}
                  className="mt-1 h-11 w-full cursor-pointer accent-[var(--accent)]"
                />
              </div>
            ))}
          </div>
        </details>
      </form>
      <div className="flex min-w-0 flex-col justify-between gap-8 bg-[var(--calc-panel,var(--color-ink))] p-7 text-bone md:col-span-5 md:p-10">
        {/* las cifras se achican según su largo para caber siempre en la tarjeta (en celular se salían) */}
        <div aria-live="polite" className="min-w-0 [container-type:inline-size]">
          <p className="text-xs tracking-[0.2em] text-bone/60 uppercase">Comisión que deja de pagar</p>
          <p className="mt-3 font-display leading-none whitespace-nowrap tabular-nums" style={{ fontSize: fit(formatCOP(round(monthly)), '3.75rem') }}>
            {formatCOP(round(monthly))}
          </p>
          <p className="mt-1 text-sm text-bone/70">al mes</p>
          <p className="mt-6 font-display whitespace-nowrap tabular-nums text-accent-on-dark" style={{ fontSize: fit(formatCOP(round(yearly)), '1.875rem') }}>
            {formatCOP(round(yearly))}
          </p>
          <p className="mt-1 text-sm text-bone/70">al año</p>
        </div>
        <p className="text-xs text-pretty text-bone/55">
          Estimación con sus datos: {Math.round(nights)} noches vendidas al mes, de las que el {shift} % pasa a reserva directa. No incluye el extra
          por vista ni las categorías más caras que se venden al verlas.
        </p>
      </div>
    </div>
  );
}
