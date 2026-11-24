import type { ReactNode } from 'react';

/** Props de las páginas de la demo, comunes a /h/... y /en/h/... (D-094). */
export type DemoProps<T extends Record<string, string>> = {
  params: Promise<T>;
};
export type DemoLayoutProps = {
  children: ReactNode;
  params: Promise<{ hotel: string }>;
};
