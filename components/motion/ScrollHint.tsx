'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState, type RefObject } from 'react';

import { useT } from '@/components/i18n/Lang';

/**
 * "Hay más abajo" (Jacobo, 2026-11-26: "en el celular, que me indique que puedo bajar"): una
 * flechita a la derecha de una ficha que se desplaza, mientras tenga más contenido abajo y no se
 * haya empezado a bajar. Solo en pantallas táctiles angostas (en escritorio se ve la barra).
 */
export function ScrollHint({ target }: { target: RefObject<HTMLElement | null> }) {
  const tr = useT();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = target.current;
    if (!el || window.innerWidth >= 768) return;
    const check = () => setShow(el.scrollHeight - el.clientHeight > 24 && el.scrollTop < 16);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener('scroll', check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', check);
    };
  }, [target]);

  return (
    <AnimatePresence>
      {show ? (
        <motion.button
          type="button"
          key="desliza"
          onClick={() => target.current?.scrollBy({ top: target.current.clientHeight * 0.7, behavior: 'smooth' })}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="sticky bottom-3 z-10 ml-auto mr-3 -mt-12 flex size-11 flex-col items-center justify-center rounded-full bg-ink/85 text-bone shadow-lg backdrop-blur-sm"
          aria-label={tr('Hay más abajo')}
        >
          <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}>
            <ChevronDown aria-hidden className="size-5" />
          </motion.span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
