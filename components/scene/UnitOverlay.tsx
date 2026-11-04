'use client';

/* eslint-disable @next/next/no-img-element -- imagen generada en el cliente (data URL) */

import Link from 'next/link';
import { ArrowRight, Eye, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { formatCOP } from '@/lib/hotel';
import { useTour } from '@/lib/store';

import type { SceneData, SceneUnit } from './Scene';

/**
 * Capa HTML de las unidades en la fachada: etiqueta junto al puntero, tarjeta
 * de la unidad elegida y la vista desde su ventana (renderizada al pedirla).
 */
export function UnitOverlay({
  data,
  visible,
  onView,
}: {
  data: SceneData;
  visible: boolean;
  onView: (unit: SceneUnit) => string | null;
}) {
  const hovered = useTour((s) => s.hoveredUnit);
  const selectedId = useTour((s) => s.selectedUnit);
  const setSelected = useTour((s) => s.setSelectedUnit);
  const setHovered = useTour((s) => s.setHoveredUnit);
  const facadeIndex = useTour((s) => s.facade);
  const view = useTour((s) => s.view);
  const setView = useTour((s) => s.setView);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const hoverUnit = hovered && hovered.id !== selectedId ? data.units.find((u) => u.id === hovered.id) : undefined;
  const selected = selectedId ? data.units.find((u) => u.id === selectedId) : undefined;
  const price = (u: SceneUnit) =>
    u.price !== undefined ? `${formatCOP(u.price)} / noche` : undefined;

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (view && !d.open) d.showModal();
    if (!view && d.open) d.close();
  }, [view]);

  if (!visible) return null;

  const onFacade = data.units.filter((u) => u.exterior.some((e) => e.facade === facadeIndex));

  return (
    <>
      {!selected && onFacade.length ? (
        <nav
          aria-label="Unidades en esta fachada"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--booking-bar-h)+var(--safe-bottom)+5.5rem)] z-20 flex justify-center px-3"
        >
          <ul className="scrollbar-none pointer-events-auto flex max-w-full gap-1.5 overflow-x-auto rounded-2xl p-1">
            {onFacade.map((u) => (
              <li key={u.id} className="shrink-0">
                <button
                  type="button"
                  onPointerEnter={() => setHovered({ id: u.id, x: -1, y: -1 })}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered({ id: u.id, x: -1, y: -1 })}
                  onBlur={() => setHovered(null)}
                  onClick={() => setSelected(u.id)}
                  className="glass-dark inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium shadow-lg transition-colors hover:bg-ink"
                >
                  <span aria-hidden className="size-1.5 rounded-full bg-accent-on-dark" />
                  {u.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {hoverUnit && hovered!.x >= 0 ? (
        <div
          className="glass-dark pointer-events-none fixed z-30 hidden rounded-xl px-3 py-2 text-sm shadow-xl md:block"
          style={{ left: hovered!.x, top: hovered!.y - 18, transform: 'translate(-50%, -100%)' }}
        >
          <p className="font-medium whitespace-nowrap">{hoverUnit.name}</p>
          <p className="text-xs whitespace-nowrap text-bone/70">
            {[hoverUnit.category, price(hoverUnit)].filter(Boolean).join(' · ')} · toca para ver
          </p>
        </div>
      ) : null}

      {selected ? (
        <section
          aria-label={selected.name}
          className="glass-dark pointer-events-auto fixed inset-x-3 bottom-[calc(var(--booking-bar-h)+var(--safe-bottom)+5.5rem)] z-30 animate-in rounded-3xl p-4 shadow-2xl duration-300 fade-in slide-in-from-bottom-3 md:inset-x-auto md:left-10 md:bottom-[calc(var(--booking-bar-h)+6.5rem)] md:w-[360px]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.12em] text-bone/60 uppercase">
                {[selected.category, selected.levelName].filter(Boolean).join(' · ')}
              </p>
              <h2 className="mt-0.5 font-display text-title leading-none">{selected.name}</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Cerrar"
              className="-mt-1 -mr-1 grid size-10 place-items-center rounded-full hover:bg-bone/10"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
          {selected.view ? <p className="mt-2 text-sm text-pretty text-bone/80">{selected.view}</p> : null}
          {selected.price !== undefined ? (
            <p className="mt-2 text-sm">
              <span className="font-semibold">{formatCOP(selected.price)}</span>
              <span className="text-bone/65"> / noche</span>
              {selected.viewPremium ? (
                <span className="block text-xs font-medium text-accent-on-dark">
                  Incluye {formatCOP(selected.viewPremium)} por vista
                </span>
              ) : null}
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                // un frame para que se vea el estado antes de renderizar
                requestAnimationFrame(() => {
                  const src = onView(selected);
                  setBusy(false);
                  if (src) setView({ unitId: selected.id, src });
                });
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-bone/12 px-3 text-sm font-medium transition-colors hover:bg-bone/20 disabled:opacity-60"
            >
              <Eye aria-hidden className="size-4" />
              {busy ? 'Preparando…' : 'Ver la vista'}
            </button>
            <Link
              href={selected.href}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-on-dark px-3 text-sm font-medium text-ink transition-colors hover:bg-bone"
            >
              Ver unidad <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </section>
      ) : null}

      <dialog
        ref={dialogRef}
        onClose={() => setView(null)}
        onClick={(e) => e.target === e.currentTarget && setView(null)}
        aria-label="Vista desde la unidad"
        className="m-auto w-[min(92vw,960px)] max-w-none overflow-hidden rounded-3xl bg-ink p-0 text-bone backdrop:bg-ink/80 backdrop:backdrop-blur-sm"
      >
        {view ? (
          <figure>
            <div className="relative">
              <img src={view.src} alt="Vista aproximada desde la ventana de la unidad" className="block aspect-[16/10] w-full object-cover" />
              <span className="glass absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium text-ink">
                Vista ilustrativa
              </span>
              <button
                type="button"
                onClick={() => setView(null)}
                aria-label="Cerrar"
                autoFocus
                className="glass-dark absolute top-3 right-3 grid size-11 place-items-center rounded-full"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <figcaption className="px-5 py-4 text-sm">
              <span className="font-medium">
                Vista desde la {data.units.find((u) => u.id === view.unitId)?.name ? 'unidad ' : ''}
                {data.units.find((u) => u.id === view.unitId)?.name}
              </span>
              <span className="text-bone/70"> · simulada a partir del entorno del edificio</span>
            </figcaption>
          </figure>
        ) : null}
      </dialog>
    </>
  );
}
