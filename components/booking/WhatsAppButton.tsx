import { MessageCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { buildWhatsAppUrl, type WhatsAppContext } from '@/lib/whatsapp';

export function WhatsAppButton({
  context,
  label = 'Reservar',
  className,
}: {
  context: WhatsAppContext;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={buildWhatsAppUrl(context)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} por WhatsApp${context.unitName ? `: ${context.unitName}` : ''}`}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground',
        'transition-[background-color,transform] duration-200 hover:bg-[color-mix(in_oklab,var(--accent),black_14%)] active:scale-[0.98]',
        className,
      )}
    >
      <MessageCircle aria-hidden className="size-4" />
      {label}
    </a>
  );
}
