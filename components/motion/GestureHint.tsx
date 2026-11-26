'use client';

import { motion } from 'motion/react';
import { Pointer } from 'lucide-react';

/**
 * Una mano que muestra qué hacer, para quien entra por primera vez (Jacobo, 2026-11-26: "que salga
 * un dedito que diga toca aquí o mueve, porque quien lo usa por primera vez no entiende").
 * - tap: el dedo toca y deja un anillo;
 * - drag: el dedo arrastra de lado a lado.
 * Va en una posición de la pantalla (px); quien la monta decide cuándo se ve y cuándo se va.
 */
export function GestureHint({ x, y, kind, label }: { x: number; y: number; kind: 'tap' | 'drag'; label: string }) {
  return (
    <motion.div
      role="status"
      className="pointer-events-none fixed z-[45]"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="relative flex -translate-x-1/2 flex-col items-center">
        <div className="relative grid size-16 place-items-center">
          {kind === 'tap' ? (
            <motion.span
              aria-hidden
              className="absolute size-10 rounded-full border-2 border-bone"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.5], opacity: [0.9, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.5, ease: 'easeOut', delay: 0.25 }}
            />
          ) : (
            <motion.span
              aria-hidden
              className="absolute h-0.5 w-24 rounded-full bg-bone/60"
              animate={{ opacity: [0, 0.8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <motion.span
            aria-hidden
            className="relative drop-shadow-[0_4px_10px_rgb(0_0_0/0.45)]"
            animate={kind === 'tap' ? { y: [0, 7, 0], scale: [1, 0.92, 1] } : { x: [-36, 36, -36] }}
            transition={
              kind === 'tap'
                ? { duration: 1.1, repeat: Infinity, repeatDelay: 0.5, ease: 'easeInOut' }
                : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            <Pointer className="size-9 fill-bone text-ink" strokeWidth={1.4} />
          </motion.span>
        </div>
        <span className="mt-1 rounded-full bg-ink/80 px-3.5 py-1.5 text-sm whitespace-nowrap text-bone shadow-lg backdrop-blur-sm">{label}</span>
      </div>
    </motion.div>
  );
}

const KEY = (k: string) => `antesala:gesto:${k}`;

/** La mano se ve una vez por sesión y por lugar: true si toca mostrarla ahora (y la marca vista). */
export function claimGesture(key: string): boolean {
  try {
    if (sessionStorage.getItem(KEY(key))) return false;
    sessionStorage.setItem(KEY(key), '1');
    return true;
  } catch {
    return false;
  }
}
