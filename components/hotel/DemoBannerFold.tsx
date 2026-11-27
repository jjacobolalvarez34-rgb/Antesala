'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useSyncExternalStore, type ReactNode } from 'react';

import { LangSwitch } from '@/components/i18n/LangSwitch';

const KEY = 'antesala:franja';
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const read = () => {
  try {
    return sessionStorage.getItem(KEY) === 'abierta';
  } catch {
    return false;
  }
};

/**
 * La franja de la demo, plegable (Jacobo, 2026-11-26: "en el celular satura muchísimo la vista, y
 * necesito que se oculte para cuando lo vaya a vender"). Va plegada por defecto: arriba queda solo
 * una cinta pequeña que dice que es una demo (regla 7) y que la baja al tocarla. El idioma va
 * aparte, siempre a la mano. Recuerda lo elegido durante la visita.
 */
export function DemoBannerFold({ label, hideLabel = 'Ocultar', children }: { label: string; hideLabel?: string; children: ReactNode }) {
  // lo elegido en la visita (sessionStorage); en el servidor, plegada
  const open = useSyncExternalStore(subscribe, read, () => false);
  const toggle = (v: boolean) => {
    try {
      sessionStorage.setItem(KEY, v ? 'abierta' : 'plegada');
    } catch {
      /* sin almacenamiento */
    }
    listeners.forEach((l) => l());
  };

  return (
    <div data-demo-banner className="pointer-events-none relative z-[60]">
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="franja"
            role="note"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto overflow-hidden bg-ink text-bone"
          >
            {children}
            <button
              type="button"
              onClick={() => toggle(false)}
              className="mx-auto flex min-h-7 items-center gap-1 px-3 pb-1 text-[0.6875rem] tracking-wide text-bone/60 hover:text-bone"
            >
              <ChevronUp aria-hidden className="size-3.5" />
              {hideLabel}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {!open ? (
        // plegada: la cinta y el idioma al centro, colgando sobre la página
        <div className="absolute inset-x-0 top-0 flex items-start justify-center">
          <button
            type="button"
            onClick={() => toggle(true)}
            aria-expanded={false}
            className="pointer-events-auto inline-flex min-h-7 items-center gap-1.5 rounded-b-xl bg-ink/85 px-3 pt-0.5 pb-1 text-[0.6875rem] tracking-wide text-bone/85 shadow-lg backdrop-blur-sm transition-colors hover:bg-ink hover:text-bone"
          >
            {label}
            <ChevronDown aria-hidden className="size-3.5" />
          </button>
          {/* el idioma, pegado a la cinta (a la derecha tapaba los botones del encabezado) */}
          <div className="pointer-events-auto ml-1.5 rounded-b-xl bg-ink/85 px-1 pt-0.5 pb-1 shadow-lg backdrop-blur-sm">
            <LangSwitch />
          </div>
        </div>
      ) : null}
    </div>
  );
}
