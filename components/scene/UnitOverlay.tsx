'use client';

/* eslint-disable @next/next/no-img-element -- imagen generada en el cliente (data URL) */

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { formatPrice, OFFER } from '@/lib/hotel';
import { useTour } from '@/lib/store';

import type { SceneData, SceneUnit } from './Scene';

/**
 * Capa HTML de las unidades: etiqueta junto al puntero al pasar por sus
 * ventanas ("toca para entrar") y la vista desde la ventana, que se abre y se
 * cierra con un diafragma de cámara (D-038).
 */
export function UnitOverlay({ data, visible }: { data: SceneData; visible: boolean }) {
  const hovered = useTour((s) => s.hoveredUnit);
  const view = useTour((s) => s.view);
  const setView = useTour((s) => s.setView);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const hoverUnit = hovered ? data.units.find((u) => u.id === hovered.id) : undefined;
  const price = (u: SceneUnit) =>
    u.occupied ? OFFER[data.offer ?? 'noche'].taken : u.price !== undefined ? formatPrice(u.price, data.offer) : undefined;

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (view && !d.open) d.showModal();
    if (!view && d.open) d.close();
  }, [view]);

  const close = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      setView(null);
    }, 520);
  };

  const viewUnit = view ? data.units.find((u) => u.id === view.unitId) : undefined;

  return (
    <>
      {visible && hoverUnit && hovered!.x >= 0 ? (
        <div
          className="glass-dark pointer-events-none fixed z-30 hidden rounded-xl px-3 py-2 text-sm shadow-xl md:block"
          style={{ left: hovered!.x, top: hovered!.y - 18, transform: 'translate(-50%, -100%)' }}
        >
          <p className="font-medium whitespace-nowrap">{hoverUnit.name}</p>
          <p className="text-xs whitespace-nowrap text-bone/70">
            {[hoverUnit.category, price(hoverUnit)].filter(Boolean).join(' · ')} · toca para entrar
          </p>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => e.target === e.currentTarget && close()}
        aria-label="Vista desde la unidad"
        className="m-auto w-[min(92vw,960px)] max-w-none overflow-hidden rounded-3xl bg-transparent p-0 text-bone backdrop:bg-ink/80 backdrop:backdrop-blur-sm"
      >
        {view ? (
          <figure className={closing ? 'iris-close' : 'iris-open'}>
            <div className="relative bg-ink">
              <img
                src={view.src}
                alt={`Vista aproximada desde la ventana de ${viewUnit?.name ?? 'la unidad'}`}
                className="block aspect-[16/10] w-full object-cover"
              />
              <span className="glass absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium text-ink">
                Vista ilustrativa
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar"
                autoFocus
                className="glass-dark absolute top-3 right-3 grid size-11 place-items-center rounded-full"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <figcaption className="bg-ink px-5 py-4 text-sm">
              <span className="font-medium">Vista desde {viewUnit?.name}</span>
              <span className="text-bone/70"> · simulada a partir del entorno del edificio</span>
            </figcaption>
          </figure>
        ) : null}
      </dialog>
    </>
  );
}
