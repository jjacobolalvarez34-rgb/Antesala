'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, type RefObject } from 'react';

import { cn } from '@/lib/utils';

export interface UnitTag {
  id: string;
  /** "502" (lo corto que va siempre a la vista) */
  short: string;
  /** "Suite 502" */
  name: string;
  /** "$ 430.000 / noche" o "Ocupada en estas fechas" */
  detail: string;
  occupied: boolean;
  position: [number, number, number];
  href: Route;
}

/**
 * Letreros de las unidades al abrir un piso (pedido de Jacobo y su papá, 2026-11-16: "no se
 * entendía que se podía tocar el apartamento"). Cada unidad tiene siempre a la vista una
 * píldora con su número y un punto de color (verde libre, terracota ocupada), unida al
 * apartamento por una línea fina, como los números de piso.
 *
 * - Con mouse: al pasar se abre (nombre y precio o "Ocupada") y el clic entra.
 * - En pantalla táctil: el primer toque la abre ("Toca otra vez para entrar"); el segundo entra.
 *
 * Las posiciones las escribe PoiProjector (ancla abajo: la línea termina en el apartamento).
 */
export function UnitTagLayer({
  tags,
  anchors,
  visible,
  hovered,
  onHover,
}: {
  tags: UnitTag[];
  anchors: RefObject<Map<string, HTMLElement>>;
  visible: boolean;
  hovered: string | null;
  onHover: (id: string | null) => void;
}) {
  const router = useRouter();
  // la abierta por un primer toque (táctil)
  const [armedRaw, setArmed] = useState<string | null>(null);
  // al cerrarse el piso se olvida (derivado, sin efecto)
  const armed = visible ? armedRaw : null;

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500', visible ? 'opacity-100' : 'opacity-0')}>
      <ul aria-label="Unidades del piso">
        {tags.map((t) => {
          const open = armed === t.id || hovered === t.id;
          return (
            <li
              key={t.id}
              ref={(el) => {
                if (el) anchors.current.set(t.id, el);
                else anchors.current.delete(t.id);
              }}
              className={cn('absolute top-0 left-0', visible && 'pointer-events-auto')}
              style={{ visibility: 'hidden', zIndex: open ? 2 : 1 }}
            >
              <a
                href={t.href}
                tabIndex={visible ? 0 : -1}
                aria-label={`${t.name}: ${t.detail}`}
                onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(t.id)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
                onFocus={() => onHover(t.id)}
                onBlur={() => onHover(null)}
                onClick={(e) => {
                  e.preventDefault();
                  const touch = (e.nativeEvent as PointerEvent).pointerType === 'touch' || window.matchMedia('(pointer: coarse)').matches;
                  if (touch && armed !== t.id) {
                    setArmed(t.id);
                    onHover(t.id);
                    return;
                  }
                  router.push(t.href);
                }}
                className="group flex flex-col items-center outline-none"
              >
                <span
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.75rem] font-medium whitespace-nowrap shadow-lg transition-[background-color,border-color,color] duration-300',
                    open ? 'border-bone bg-bone text-ink' : 'border-bone/30 bg-ink/60 text-bone backdrop-blur-[2px]',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn('size-2 rounded-full', t.occupied ? 'bg-[#c0705a]' : 'bg-[#6fae7b]')}
                  />
                  <span className="tabular-nums">{open ? t.name : t.short}</span>
                </span>
                {open ? (
                  <span className="mt-1 rounded-lg bg-ink/85 px-2.5 py-1.5 text-center text-[0.6875rem] leading-snug text-bone shadow-lg">
                    <span className={cn('block', t.occupied && 'text-[#e7a48f]')}>{t.detail}</span>
                    {armed === t.id ? <span className="mt-0.5 block text-bone/70">Toca otra vez para entrar</span> : null}
                  </span>
                ) : null}
                {/* la línea fina hasta el apartamento */}
                <span aria-hidden className={cn('block w-px transition-[height] duration-300', open ? 'h-6 bg-bone' : 'h-4 bg-bone/60')} />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
