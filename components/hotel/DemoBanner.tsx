import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';

import { AntesalaSymbol } from '@/components/brand/AntesalaLogo';
import { LangSwitch } from '@/components/i18n/LangSwitch';
import { t, type Lang } from '@/lib/i18n';

import { DemoBannerFold } from './DemoBannerFold';
import { NivelSelector } from './Nivel';

/**
 * Visible si hotel.isDemo (CONTENIDO.md §2). Discreto pero legible.
 * En las demos lleva el símbolo de Antesala y la vuelta a su página: quien entra
 * desde la web de Antesala tiene por dónde volver (pedido de Jacobo, 2026-11-12).
 */
export function DemoBanner({
  note = 'Hotel ficticio · imágenes ilustrativas',
  base,
  niveles = false,
  lang = 'es',
}: {
  lang?: Lang;
  note?: string;
  /** /h/<hotel> */
  base?: string;
  /** el hotel tiene contenido Premium: se muestra "Ver como: Esencial · Inmersivo · Premium" */
  niveles?: boolean;
}) {
  return (
    <DemoBannerFold label={t(lang, 'Demo · hotel ficticio')} hideLabel={t(lang, 'Ocultar')}>
      <div className="mx-auto grid min-h-9 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-1.5 md:px-6">
        <Link
          href="/#demos"
          className="group inline-flex min-h-8 items-center gap-1.5 rounded-full pr-2.5 pl-1.5 text-xs text-bone/85 transition-colors hover:bg-bone/10 hover:text-bone"
        >
          <ArrowLeft aria-hidden className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          <AntesalaSymbol tone="oscuro" small className="h-4 w-auto" />
          <span className="font-[family-name:var(--font-cinzel)] tracking-[0.3em]">ANTESALA</span>
          <span className="sr-only">{t(lang, ': volver a la página de Antesala')}</span>
        </Link>
        <p className="flex min-w-0 items-center justify-center gap-2 text-center text-xs tracking-wide">
          <Info aria-hidden className="hidden size-3.5 shrink-0 opacity-80 sm:block" />
          <span className="min-w-0">{t(lang, note)}</span>
        </p>
        <div className="col-span-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pb-1 sm:col-span-1 sm:justify-end sm:pb-0">
          {niveles && base ? <NivelSelector base={base} /> : null}
          <LangSwitch />
        </div>
      </div>
    </DemoBannerFold>
  );
}
