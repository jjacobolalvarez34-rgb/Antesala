'use client';

import { useId, useMemo, useState } from 'react';

import { formatCOP } from '@/lib/hotel';
import { cn } from '@/lib/utils';
import { buildWhatsAppUrl, type WhatsAppContext } from '@/lib/whatsapp';

import { addDays, BTN, BTN_INK, iso, longDate, parse } from './ReserveSheet';

/**
 * Consulta de disponibilidad de la portada (D-078): llegada, salida y huéspedes en
 * una franja, como en la web de un hotel. Termina en WhatsApp con el mensaje listo
 * (la reserva directa del hotel); no promete disponibilidad.
 */
export function BookingWidget({
  context,
  maxGuests = 6,
  from,
  suffix,
  className,
}: {
  context: WhatsAppContext;
  maxGuests?: number;
  /** precio desde, para el texto de apoyo */
  from?: number;
  suffix?: string;
  className?: string;
}) {
  const today = useMemo(() => new Date(), []);
  const [checkIn, setCheckIn] = useState(() => iso(addDays(new Date(), 7)));
  const [checkOut, setCheckOut] = useState(() => iso(addDays(new Date(), 10)));
  const [guests, setGuests] = useState(2);
  const ids = { in: useId(), out: useId(), guests: useId() };
  const nights = Math.max(0, Math.round((parse(checkOut).getTime() - parse(checkIn).getTime()) / 86_400_000));
  const valid = nights > 0;
  const url = buildWhatsAppUrl({
    ...context,
    checkIn: valid ? longDate.format(parse(checkIn)) : undefined,
    checkOut: valid ? longDate.format(parse(checkOut)) : undefined,
    nights: valid ? nights : undefined,
    guests,
  });

  const field = 'block w-full bg-transparent pt-1 text-[0.9375rem] text-ink outline-none';
  const cell = 'flex min-h-[4.25rem] flex-col justify-center px-5 py-3 focus-within:bg-secondary/60';

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      aria-label="Consultar disponibilidad"
      className={cn('grid overflow-hidden rounded-[3px] border border-border bg-background shadow-[0_24px_48px_-32px_rgb(28_27_25/0.5)] md:grid-cols-[1fr_1fr_0.8fr_auto]', className)}
    >
      <div className="grid grid-cols-2 divide-x divide-border md:contents">
        <label htmlFor={ids.in} className={cn(cell, 'md:border-r md:border-border')}>
          <span className="text-[0.625rem] tracking-[0.2em] text-muted-foreground uppercase">Llegada</span>
          <input
            id={ids.in}
            type="date"
            min={iso(today)}
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (e.target.value >= checkOut) setCheckOut(iso(addDays(parse(e.target.value), 1)));
            }}
            className={field}
          />
        </label>
        <label htmlFor={ids.out} className={cn(cell, 'md:border-r md:border-border')}>
          <span className="text-[0.625rem] tracking-[0.2em] text-muted-foreground uppercase">Salida</span>
          <input
            id={ids.out}
            type="date"
            min={iso(addDays(parse(checkIn), 1))}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className={field}
          />
        </label>
      </div>
      <label htmlFor={ids.guests} className={cn(cell, 'border-t border-border md:border-t-0 md:border-r')}>
        <span className="text-[0.625rem] tracking-[0.2em] text-muted-foreground uppercase">Huéspedes</span>
        <select id={ids.guests} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className={field}>
          {Array.from({ length: Math.max(1, maxGuests) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'huésped' : 'huéspedes'}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col justify-center gap-1 border-t border-border p-3 md:border-t-0 md:p-2.5">
        <a
          href={valid ? url : undefined}
          aria-disabled={!valid}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(BTN, BTN_INK, 'min-h-12 w-full px-7', !valid && 'pointer-events-none opacity-50')}
        >
          Consultar disponibilidad
        </a>
        <p className="text-center text-[0.6875rem] text-muted-foreground md:hidden">
          {valid ? `${nights} ${nights === 1 ? 'noche' : 'noches'}` : 'La salida debe ser después de la llegada'}
          {valid && from !== undefined ? ` · desde ${formatCOP(from)}${suffix ?? ''}` : ''}
        </p>
      </div>
    </form>
  );
}
