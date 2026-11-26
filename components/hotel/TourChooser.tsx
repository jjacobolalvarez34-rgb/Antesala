'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Clapperboard, Move3d, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { useRoutes, useT } from '@/components/i18n/Lang';
import { cn } from '@/lib/utils';

/*
 * Recorrido 3D con dos modos (pedido de Jacobo, 2026-11-26: "recorrido 3D, y que te diga si
 * quieres el modo guiado o el modo libre"):
 *  - guiado (D-095): imágenes prerenderizadas, como un video; liviano;
 *  - libre: el 3D en vivo.
 * Un solo botón abre la elección, y dentro de cada modo un selector lleva al mismo lugar en el
 * otro (el mismo piso, la misma habitación).
 */

type Place = { level?: string | null; unit?: string | null };

/** El mismo lugar en cada modo. */
export function useModeHrefs(slug: string, place: Place) {
  const routes = useRoutes();
  const guided = (place.unit ? `${routes.guiada(slug)}?u=${place.unit}` : place.level ? `${routes.guiada(slug)}?piso=${place.level}` : routes.guiada(slug)) as Route;
  const free = place.unit ? routes.unidad(slug, place.unit) : place.level ? routes.piso(slug, place.level) : routes.explorar(slug);
  return { guided, free };
}

/** "Recorrido 3D": si el hotel tiene vista guiada, pregunta el modo; si no, entra al libre. */
export function TourButton({ slug, guided, className, children }: { slug: string; guided: boolean; className?: string; children: ReactNode }) {
  const routes = useRoutes();
  const [open, setOpen] = useState(false);
  if (!guided) {
    return (
      <Link href={routes.explorar(slug)} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className}>
        {children}
      </button>
      <TourChooser slug={slug} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function TourChooser({ slug, open, onClose }: { slug: string; open: boolean; onClose: () => void }) {
  const tr = useT();
  const titleId = useId();
  const { guided, free } = useModeHrefs(slug, {});
  const first = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const options = [
    {
      href: guided,
      icon: Clapperboard,
      title: tr('Modo guiado'),
      text: tr('Como un video: llegas al edificio, eliges el piso y la habitación. Más liviano, ideal en el celular.'),
    },
    {
      href: free,
      icon: Move3d,
      title: tr('Modo libre'),
      text: tr('El edificio en 3D a tu ritmo: lo giras, abres los pisos y entras a las habitaciones.'),
    },
  ];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="elegir"
          className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-[2px] md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-2xl rounded-t-2xl bg-background p-5 text-left pb-[calc(1.25rem+var(--safe-bottom,0px))] text-ink shadow-2xl md:rounded-[var(--hotel-r-card,6px)] md:p-8"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.6875rem] font-medium tracking-[0.24em] text-muted-foreground uppercase">{tr('Recorrido 3D')}</p>
                <h2 id={titleId} className="mt-2 font-display text-3xl leading-none md:text-4xl">
                  {tr('¿Cómo quieres recorrerlo?')}
                </h2>
              </div>
              <button type="button" onClick={onClose} aria-label={tr('Cerrar')} className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center text-ink/70 hover:text-ink">
                <X aria-hidden className="size-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {options.map(({ href, icon: Icon, title, text }, i) => (
                <Link
                  key={title}
                  ref={i === 0 ? first : undefined}
                  href={href}
                  onClick={onClose}
                  className="group flex flex-col rounded-[var(--hotel-r-card,6px)] border border-border p-5 transition-colors hover:border-ink/40 hover:bg-card focus-visible:border-ink/60"
                >
                  <Icon aria-hidden className="size-6 text-accent" strokeWidth={1.5} />
                  <span className="mt-4 font-display text-2xl leading-none">{title}</span>
                  <span className="mt-2 text-sm text-pretty text-muted-foreground">{text}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
                    {tr('Entrar')}
                    <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** "Guiado | Libre" dentro de cada modo: el mismo lugar en el otro modo. */
export function ModeSwitch({ slug, current, place, className }: { slug: string; current: 'guiado' | 'libre'; place: Place; className?: string }) {
  const tr = useT();
  const { guided, free } = useModeHrefs(slug, place);
  const items = [
    { key: 'guiado', href: guided, label: tr('Guiado') },
    { key: 'libre', href: free, label: tr('Libre') },
  ] as const;
  return (
    <div role="group" aria-label={tr('Modo del recorrido')} className={cn('flex rounded-full bg-bone/10 p-0.5 text-xs', className)}>
      {items.map((it) =>
        it.key === current ? (
          <span key={it.key} aria-current="true" className="inline-flex min-h-8 items-center rounded-full bg-bone px-3 font-medium text-ink">
            {it.label}
          </span>
        ) : (
          <Link key={it.key} href={it.href} className="inline-flex min-h-8 items-center rounded-full px-3 font-medium text-bone/80 transition-colors hover:text-bone">
            {it.label}
          </Link>
        ),
      )}
    </div>
  );
}
