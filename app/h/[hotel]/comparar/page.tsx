import { CompararPage as Impl, metadata as baseMeta } from '@/app/_demo/comparar';
import { t } from '@/lib/i18n';

// español (D-094): la página vive en app/_demo/comparar.tsx
export const metadata = { ...baseMeta, title: t('es', String(baseMeta.title)) };
export default function Page(props: PageProps<'/h/[hotel]/comparar'>) {
  return Impl(props, 'es');
}
