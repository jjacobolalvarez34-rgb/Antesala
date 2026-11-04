'use client';

/* eslint-disable @next/next/no-img-element -- las variantes AVIF/WebP llegan del pipeline (bloque 5) con srcset propio, servidas desde R2; next/image no aplica */

import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { FidelityBadge } from '@/components/hotel/FidelityBadge';
import type { Fidelity } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface GalleryItem {
  id: string;
  url: string;
  alt: string;
  fidelity: Fidelity;
  width?: number;
  height?: number;
}

/**
 * Galería del espacio: imagen principal, miniaturas y vista ampliada.
 * Solo se renderiza lo que haya (regla 2); sin medios muestra un estado vacío digno.
 */
export function Gallery({ items, title, className }: { items: GalleryItem[]; title: string; className?: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const count = items.length;
  const current = items[index];

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!current) {
    return (
      <div
        className={cn(
          'grid aspect-[3/2] place-items-center rounded-2xl border border-dashed border-border bg-muted text-sm text-muted-foreground',
          className,
        )}
      >
        Aún no hay imágenes de este espacio.
      </div>
    );
  }

  const ratio = current.width && current.height ? `${current.width} / ${current.height}` : '3 / 2';

  return (
    <section aria-label={`Imágenes de ${title}`} className={className}>
      <div className="relative overflow-hidden bg-muted sm:rounded-2xl md:rounded-3xl" style={{ aspectRatio: ratio }}>
        <img
            key={current.id}
            src={current.url}
            alt={current.alt}
            width={current.width}
            height={current.height}
            decoding="async"
            fetchPriority={index === 0 ? 'high' : undefined}
            className="absolute inset-0 size-full animate-in object-cover duration-500 ease-out fade-in zoom-in-[1.015]"
          />
        <FidelityBadge fidelity={current.fidelity} className="absolute top-3 left-3" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="glass absolute right-3 bottom-3 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-ink transition-transform active:scale-95"
        >
          <Expand aria-hidden className="size-4" />
          Ampliar
        </button>
        {count > 1 ? (
          <>
            <NavButton side="left" onClick={() => go(-1)} label="Imagen anterior" />
            <NavButton side="right" onClick={() => go(1)} label="Imagen siguiente" />
            <p className="glass absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-medium text-ink tabular-nums">
              {index + 1} / {count}
            </p>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul className="scrollbar-none mt-3 flex gap-2 overflow-x-auto px-5 pb-1 sm:px-0" aria-label="Miniaturas">
          {items.map((item, i) => (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver imagen ${i + 1}: ${item.alt}`}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  'block h-16 w-24 overflow-hidden rounded-lg ring-offset-2 ring-offset-background transition-[opacity,box-shadow] duration-200 md:h-20 md:w-30',
                  i === index ? 'ring-2 ring-accent' : 'opacity-70 hover:opacity-100',
                )}
              >
                <img src={item.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-label={`${title}: imagen ${index + 1} de ${count}`}
        onClose={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1);
          if (e.key === 'ArrowLeft') go(-1);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-ink/92 backdrop:backdrop-blur-sm"
      >
        <div className="flex h-full flex-col p-3 md:p-8" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="flex items-center justify-between gap-3 text-bone">
            <p className="text-sm tabular-nums">
              {title} · {index + 1} / {count}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="grid size-11 place-items-center rounded-full bg-bone/12 transition-colors hover:bg-bone/20"
              autoFocus
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <div className="relative my-3 flex min-h-0 flex-1 items-center justify-center">
            {open ? (
              <img
                  key={current.id}
                  src={current.url}
                  alt={current.alt}
                  className="max-h-full max-w-full animate-in rounded-xl object-contain duration-300 ease-out fade-in slide-in-from-right-4"
                />
            ) : null}
            <FidelityBadge fidelity={current.fidelity} className="absolute top-3 left-3" />
          </div>
          {count > 1 ? (
            <div className="flex justify-center gap-3 pb-[var(--safe-bottom)]">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Imagen anterior"
                className="grid size-12 place-items-center rounded-full bg-bone/12 text-bone transition-colors hover:bg-bone/20"
              >
                <ChevronLeft aria-hidden className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Imagen siguiente"
                className="grid size-12 place-items-center rounded-full bg-bone/12 text-bone transition-colors hover:bg-bone/20"
              >
                <ChevronRight aria-hidden className="size-5" />
              </button>
            </div>
          ) : null}
        </div>
      </dialog>
    </section>
  );
}

function NavButton({ side, onClick, label }: { side: 'left' | 'right'; onClick: () => void; label: string }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'glass absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-ink transition-transform active:scale-95',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
