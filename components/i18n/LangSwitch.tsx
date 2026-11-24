'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';

import { switchLangPath, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { useLang } from './Lang';

/** ES · EN en la franja de la demo: la misma página en el otro idioma (D-094). */
export function LangSwitch({ className }: { className?: string }) {
  const lang = useLang();
  const path = usePathname();
  const options: [Lang, string, string][] = [
    ['es', 'ES', 'Español'],
    ['en', 'EN', 'English'],
  ];
  return (
    <div role="group" aria-label={lang === 'en' ? 'Language' : 'Idioma'} className={cn('flex items-center gap-1 text-xs', className)}>
      <Languages aria-hidden className="size-3.5 text-bone/60" />
      <div className="flex rounded-full bg-bone/10 p-0.5">
        {options.map(([l, short, long]) => (
          <Link
            key={l}
            href={switchLangPath(path, l) as Route}
            hrefLang={l}
            lang={l}
            aria-label={long}
            aria-current={l === lang ? 'true' : undefined}
            className={cn(
              'inline-flex min-h-7 items-center rounded-full px-2.5 font-medium transition-colors',
              l === lang ? 'bg-bone text-ink' : 'text-bone/75 hover:text-bone',
            )}
          >
            {short}
          </Link>
        ))}
      </div>
    </div>
  );
}
