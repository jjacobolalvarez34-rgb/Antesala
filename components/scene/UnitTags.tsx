'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react';

import { cn } from '@/lib/utils';
import { useT } from '@/components/i18n/Lang';

export interface UnitTag {
  id: string;
  /** unidad del hotel, o lo que hay en un piso común: bar, restaurante, café, spa (D-090) */
  kind: 'unit' | 'poi';
  /** "502" o "Bar" (lo corto que va siempre a la vista) */
  short: string;
  /** "Suite 502" o "Bar" */
  name: string;
  /** "$ 430.000 / noche", "Ocupada" o, en un lugar común, su descripción */
  detail: string;
  occupied: boolean;
  position: [number, number, number];
  /** solo las unidades entran; los lugares comunes solo se describen */
  href?: Route;
}

/** La cámara está quieta (CameraRig marca <html data-camera="moving|idle">). */
function subscribeCamera(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-camera'] });
  return () => mo.disconnect();
}
const cameraIdle = () => document.documentElement.dataset.camera !== 'moving';

/**
 * Letreros del piso abierto (pedido de Jacobo y su papá, 2026-11-16: "no se entendía que se
 * podía tocar el apartamento").
 *
 * - Cada unidad tiene siempre a la vista una píldora con su número y un punto de color (verde
 *   libre, terracota ocupada), unida al apartamento por una línea fina, como los números de piso.
 *   Con mouse se abre al pasar y el clic entra; en táctil, el primer toque la abre ("Toca otra
 *   vez para entrar") y el segundo entra.
 * - En los pisos comunes, lo que hay adentro (bar, restaurante, café, spa) va en su lugar con
 *   un punto bronce; tocarlo muestra qué es (D-090).
 * - Aparecen cuando la cámara termina de llegar, uno tras otro (antes salían antes que el piso).
 *
 * Las posiciones las escribe PoiProjector (ancla abajo: la línea termina en el lugar).
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
  const tr = useT();
  const idle = useSyncExternalStore(subscribeCamera, cameraIdle, () => true);
  // al cambiar de piso, la cámara empieza a moverse un instante después: los letreros nuevos
  // esperan un momento para no asomarse antes del vuelo (reporte de Jacobo, 2026-11-16)
  const key = tags.map((t) => t.id).join('|');
  const [settled, setSettled] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(key), 250);
    return () => window.clearTimeout(t);
  }, [key]);
  const shown = visible && idle && settled === key;
  // el abierto por un primer toque (táctil); al cerrarse el piso se olvida
  const [armedRaw, setArmed] = useState<string | null>(null);
  const armed = shown ? armedRaw : null;

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', !shown && 'invisible')}>
      <ul aria-label={tr('Unidades y lugares del piso')}>
        {tags.map((t, i) => {
          const open = armed === t.id || hovered === t.id;
          const poi = t.kind === 'poi';
          return (
            <li
              key={t.id}
              ref={(el) => {
                if (el) anchors.current.set(t.id, el);
                else anchors.current.delete(t.id);
              }}
              className={cn('absolute top-0 left-0', shown && 'pointer-events-auto')}
              style={{ visibility: 'hidden', zIndex: open ? 2 : 1 }}
            >
              <a
                href={t.href ?? '#'}
                tabIndex={shown ? 0 : -1}
                aria-label={`${t.name}: ${t.detail}`}
                onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(t.id)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
                onFocus={() => onHover(t.id)}
                onBlur={() => onHover(null)}
                onClick={(e) => {
                  e.preventDefault();
                  if (poi || !t.href) {
                    // un lugar común solo se describe: el toque abre y cierra
                    setArmed(armed === t.id ? null : t.id);
                    return;
                  }
                  const touch = (e.nativeEvent as PointerEvent).pointerType === 'touch' || window.matchMedia('(pointer: coarse)').matches;
                  if (touch && armed !== t.id) {
                    setArmed(t.id);
                    onHover(t.id);
                    return;
                  }
                  router.push(t.href);
                }}
                // llegan uno tras otro cuando la cámara se detiene
                style={{ transitionDelay: shown ? `${i * 60}ms` : '0ms' }}
                className={cn(
                  'group flex flex-col items-center outline-none transition-[opacity,transform] duration-500 ease-out',
                  shown ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
                )}
              >
                <span
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.75rem] font-medium whitespace-nowrap shadow-lg transition-[background-color,border-color,color] duration-300',
                    open ? 'border-bone bg-bone text-ink' : 'border-bone/30 bg-ink/60 text-bone backdrop-blur-[2px]',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn('size-2 rounded-full', poi ? 'bg-accent-on-dark' : t.occupied ? 'bg-[#c0705a]' : 'bg-[#6fae7b]')}
                  />
                  <span className="tabular-nums">{open && !poi ? t.name : t.short}</span>
                </span>
                {open ? (
                  <span className="mt-1 max-w-56 rounded-lg bg-ink/85 px-2.5 py-1.5 text-center text-[0.6875rem] leading-snug text-pretty text-bone shadow-lg">
                    <span className={cn('block', t.occupied && 'text-[#e7a48f]')}>{t.detail}</span>
                    {armed === t.id && !poi ? <span className="mt-0.5 block text-bone/70">{tr('Toca otra vez para entrar')}</span> : null}
                  </span>
                ) : null}
                {/* la línea fina hasta el lugar */}
                <span aria-hidden className={cn('block w-px transition-[height] duration-300', open ? 'h-6 bg-bone' : 'h-4 bg-bone/60')} />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
