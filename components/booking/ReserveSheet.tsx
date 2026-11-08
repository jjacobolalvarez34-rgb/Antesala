'use client';

import { CalendarDays, MessageCircle, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { buildWhatsAppUrl, type WhatsAppContext } from '@/lib/whatsapp';
import { formatCOP, OFFER } from '@/lib/hotel';
import type { Offer } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Reserva (bloque 6): fechas y huéspedes antes de abrir WhatsApp con el
 * mensaje prellenado ("la unidad Suite 402 del 12 al 15 de noviembre…").
 * El total es una estimación con la tarifa simulada.
 */

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const longDate = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long' });
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
};

export function ReserveButton({
  context,
  price,
  capacity,
  className,
  offer = 'noche',
}: {
  context: WhatsAppContext;
  price?: number;
  capacity?: number;
  className?: string;
  /** venta o arriendo: en vez de fechas, WhatsApp para agendar una visita (D-057) */
  offer?: Offer;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [checkIn, setCheckIn] = useState(() => iso(addDays(new Date(), 7)));
  const [checkOut, setCheckOut] = useState(() => iso(addDays(new Date(), 10)));
  const [guests, setGuests] = useState(2);
  const ids = { in: useId(), out: useId(), guests: useId() };

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const nights = Math.max(0, Math.round((parse(checkOut).getTime() - parse(checkIn).getTime()) / 86_400_000));
  const valid = nights > 0;
  const maxGuests = Math.max(1, capacity ?? 6);
  const url = buildWhatsAppUrl({
    ...context,
    checkIn: valid ? longDate.format(parse(checkIn)) : undefined,
    checkOut: valid ? longDate.format(parse(checkOut)) : undefined,
    nights: valid ? nights : undefined,
    guests,
  });

  if (offer !== 'noche') {
    return (
      <a
        href={buildWhatsAppUrl({ ...context, visit: true })}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground',
          'transition-[background-color,transform] duration-200 hover:bg-[color-mix(in_oklab,var(--accent),black_14%)] active:scale-[0.98]',
          className,
        )}
      >
        <MessageCircle aria-hidden className="size-4" />
        {OFFER[offer].cta}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground',
          'transition-[background-color,transform] duration-200 hover:bg-[color-mix(in_oklab,var(--accent),black_14%)] active:scale-[0.98]',
          className,
        )}
      >
        <MessageCircle aria-hidden className="size-4" />
        Reservar
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={`${ids.in}-t`}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        className="m-auto mb-0 w-full max-w-md rounded-t-3xl bg-card p-0 text-foreground backdrop:bg-ink/50 backdrop:backdrop-blur-sm sm:mb-auto sm:rounded-3xl"
      >
        <form method="dialog" className="p-5 pb-[calc(1.25rem+var(--safe-bottom))]" onSubmit={(e) => e.preventDefault()}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{context.hotelName}</p>
              <h2 id={`${ids.in}-t`} className="mt-1 font-display text-title leading-none">
                {context.unitName ?? 'Reservar'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="-mt-1 -mr-1 grid size-11 place-items-center rounded-full hover:bg-secondary"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <label htmlFor={ids.in} className="block">
              <span className="eyebrow">Llegada</span>
              <input
                id={ids.in}
                type="date"
                min={iso(today)}
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (e.target.value >= checkOut) setCheckOut(iso(addDays(parse(e.target.value), 1)));
                }}
                className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-[0.9375rem]"
              />
            </label>
            <label htmlFor={ids.out} className="block">
              <span className="eyebrow">Salida</span>
              <input
                id={ids.out}
                type="date"
                min={iso(addDays(parse(checkIn), 1))}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-[0.9375rem]"
              />
            </label>
          </div>
          <label htmlFor={ids.guests} className="mt-3 block">
            <span className="eyebrow">Huéspedes</span>
            <select
              id={ids.guests}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-[0.9375rem]"
            >
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'huésped' : 'huéspedes'}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm">
            <CalendarDays aria-hidden className="size-4 shrink-0 text-accent" />
            {valid ? (
              <p className="flex-1">
                {nights} {nights === 1 ? 'noche' : 'noches'}
                {price !== undefined ? (
                  <>
                    {' · '}
                    <span className="font-semibold">{formatCOP(price * nights)}</span>
                    <span className="text-muted-foreground"> estimado (tarifa simulada)</span>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="flex-1 text-muted-foreground">La salida debe ser después de la llegada.</p>
            )}
          </div>

          <a
            href={valid ? url : undefined}
            aria-disabled={!valid}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => valid && setOpen(false)}
            className={cn(
              'mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--accent),black_14%)]',
              !valid && 'pointer-events-none opacity-50',
            )}
          >
            <MessageCircle aria-hidden className="size-4" />
            Enviar por WhatsApp
          </a>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Se abre WhatsApp con el mensaje listo; el hotel confirma disponibilidad.
          </p>
        </form>
      </dialog>
    </>
  );
}
