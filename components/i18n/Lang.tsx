'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import { routesFor, t, type Lang } from '@/lib/i18n';

const LangContext = createContext<Lang>('es');

/** Idioma de la demo para los componentes de cliente (D-094). Pone también <html lang>. */
export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** `tr('texto en español')` en el idioma de la demo. */
export function useT() {
  const lang = useLang();
  return useMemo(() => (es: string, vars?: Record<string, string | number>) => t(lang, es, vars), [lang]);
}

/** Rutas del recorrido en el idioma de la demo. */
export function useRoutes() {
  const lang = useLang();
  return useMemo(() => routesFor(lang), [lang]);
}
