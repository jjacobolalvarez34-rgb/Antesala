import Link from 'next/link';

import { AntesalaSymbol } from '@/components/brand/AntesalaLogo';

/** Pie discreto de Antesala; no compite con la marca del hotel. */
export function PoweredBy() {
  return (
    <footer className="pb-booking mx-auto w-full max-w-6xl px-5 pt-10 scene:hidden md:px-10">
      <p className="border-t border-border pt-5 text-center text-xs text-muted-foreground">
        con tecnología de{' '}
        <Link href="/" className="inline-flex items-center gap-1.5 align-middle font-medium underline-offset-4 hover:text-foreground hover:underline">
          <AntesalaSymbol tone="tinta" small className="h-3.5 w-auto" />
          Antesala
        </Link>
      </p>
    </footer>
  );
}
