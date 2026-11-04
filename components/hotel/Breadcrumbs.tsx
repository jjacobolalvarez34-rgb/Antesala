import Link from 'next/link';
import type { Route } from 'next';
import { ChevronRight } from 'lucide-react';

export function Breadcrumbs({ items }: { items: { label: string; href?: Route }[] }) {
  return (
    <nav aria-label="Ruta" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight aria-hidden className="size-3.5 opacity-60" /> : null}
            {item.href ? (
              <Link href={item.href} className="inline-flex min-h-8 items-center underline-offset-4 hover:text-foreground hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
